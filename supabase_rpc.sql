-- 1. Warehouse Core
CREATE OR REPLACE FUNCTION log_box(p_code TEXT, p_product_id TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    prod RECORD;
    new_box_id TEXT := 'b-' || gen_random_uuid();
    exp_date DATE;
BEGIN
    SELECT * INTO prod FROM products WHERE id = p_product_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Product not found.');
    END IF;

    IF EXISTS (SELECT 1 FROM boxes WHERE code = p_code) THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box code ' || p_code || ' already exists.');
    END IF;

    IF prod.shelf_life_days IS NOT NULL THEN
        exp_date := CURRENT_DATE + prod.shelf_life_days;
    END IF;

    INSERT INTO boxes (id, code, product_id, status, logged_by_user_id, logged_at, expiry_date)
    VALUES (new_box_id, p_code, p_product_id, 'logged', p_user_id, now(), exp_date);

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'log_box', 'box', new_box_id, '{}');

    RETURN jsonb_build_object('ok', true, 'message', 'Box ' || p_code || ' logged successfully.', 'box', jsonb_build_object('id', new_box_id, 'code', p_code));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION confirm_receipt(p_code TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box ' || p_code || ' not found.');
    END IF;

    IF bx.status != 'logged' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box ' || p_code || ' is ' || bx.status || ', cannot receive.');
    END IF;

    UPDATE boxes SET status = 'in_stock', received_by_user_id = p_user_id, received_at = now(), updated_at = now()
    WHERE id = bx.id;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'confirm_receipt', 'box', bx.id, '{}');

    RETURN jsonb_build_object('ok', true, 'message', 'Box ' || p_code || ' received into stock.');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suggest_boxes_for_withdrawal(p_product_id TEXT, p_quantity INT)
RETURNS JSONB AS $$
DECLARE
    res JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO res
    FROM (
        SELECT * FROM boxes 
        WHERE product_id = p_product_id AND status IN ('in_stock', 'returned_to_stock')
        ORDER BY expiry_date ASC NULLS LAST
        LIMIT p_quantity
    ) b;

    RETURN res;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_box_history(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
    history_arr JSONB := '[]'::jsonb;
    audits JSONB;
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box not found.');
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'action', action_type,
        'at', created_at,
        'by_user', user_id,
        'detail', details
    )), '[]'::jsonb) INTO audits
    FROM audit_logs WHERE entity_id = bx.id;

    RETURN jsonb_build_object(
        'ok', true,
        'box', row_to_json(bx),
        'history', audits
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Quality & Damage
CREATE OR REPLACE FUNCTION report_damage(p_code TEXT, p_source TEXT, p_reason TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
    new_rep_id TEXT := 'dr-' || gen_random_uuid();
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box ' || p_code || ' not found.');
    END IF;

    UPDATE boxes SET status = 'damaged_pending', updated_at = now() WHERE id = bx.id;

    INSERT INTO damage_reports (id, box_id, source, reason, reported_by_user_id, status)
    VALUES (new_rep_id, bx.id, p_source, p_reason, p_user_id, 'pending_approval');

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'report_damage', 'damage_report', new_rep_id, jsonb_build_object('box_id', bx.id, 'source', p_source, 'reason', p_reason));

    RETURN jsonb_build_object('ok', true, 'message', 'Damage reported for box ' || p_code || '. Status is now damaged_pending.');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decide_damage(p_report_id TEXT, p_decision TEXT, p_note TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    rep RECORD;
    new_box_status TEXT;
BEGIN
    SELECT * INTO rep FROM damage_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Damage report not found.');
    END IF;
    
    IF rep.status != 'pending_approval' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Report is already decided.');
    END IF;

    IF p_decision = 'writeoff' THEN
        new_box_status := 'written_off';
        UPDATE damage_reports SET status = 'approved_writeoff', decided_by_user_id = p_user_id, decision_note = p_note, decided_at = now() WHERE id = rep.id;
    ELSIF p_decision = 'return_to_stock' THEN
        new_box_status := 'returned_to_stock';
        UPDATE damage_reports SET status = 'approved_return_to_stock', decided_by_user_id = p_user_id, decision_note = p_note, decided_at = now() WHERE id = rep.id;
    ELSIF p_decision = 'reject' THEN
        new_box_status := 'in_stock';
        UPDATE damage_reports SET status = 'rejected', decided_by_user_id = p_user_id, decision_note = p_note, decided_at = now() WHERE id = rep.id;
    ELSE
        RETURN jsonb_build_object('ok', false, 'message', 'Invalid decision.');
    END IF;

    UPDATE boxes SET status = new_box_status, updated_at = now() WHERE id = rep.box_id;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'decide_damage', 'damage_report', rep.id, jsonb_build_object('decision', p_decision, 'note', p_note));

    RETURN jsonb_build_object('ok', true, 'message', 'Damage report updated.');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION place_quality_hold(p_code TEXT, p_reason TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
    new_hold_id TEXT := 'qh-' || gen_random_uuid();
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box ' || p_code || ' not found.');
    END IF;

    UPDATE boxes SET status = 'on_hold', updated_at = now() WHERE id = bx.id;

    INSERT INTO quality_holds (id, box_id, placed_by_user_id, reason, status)
    VALUES (new_hold_id, bx.id, p_user_id, p_reason, 'active');

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'place_quality_hold', 'quality_hold', new_hold_id, jsonb_build_object('box_code', p_code, 'reason', p_reason));

    RETURN jsonb_build_object('ok', true, 'message', 'Box ' || p_code || ' placed on hold.');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_quality_hold(p_code TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
    qh RECORD;
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Box ' || p_code || ' not found.');
    END IF;

    SELECT * INTO qh FROM quality_holds WHERE box_id = bx.id AND status = 'active' ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
        UPDATE quality_holds SET status = 'released', released_by_user_id = p_user_id, released_at = now() WHERE id = qh.id;
    END IF;

    UPDATE boxes SET status = 'in_stock', updated_at = now() WHERE id = bx.id;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'release_quality_hold', 'box', bx.id, jsonb_build_object('box_code', p_code));

    RETURN jsonb_build_object('ok', true, 'message', 'Box ' || p_code || ' released from hold.');
END;
$$ LANGUAGE plpgsql;

-- 3. Sales & Fulfillment
CREATE OR REPLACE FUNCTION create_order(p_customer_id TEXT, p_lines JSONB, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    new_order_id TEXT := 'o-' || gen_random_uuid();
    ord_number TEXT := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::TEXT;
    total NUMERIC := 0;
    line JSONB;
    prod RECORD;
    ltotal NUMERIC;
    lprice NUMERIC;
    ldisc NUMERIC;
    new_line_id TEXT;
BEGIN
    INSERT INTO orders (id, order_number, customer_id, sales_person_user_id, status)
    VALUES (new_order_id, ord_number, p_customer_id, p_user_id, 'pending');

    FOR line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        SELECT * INTO prod FROM products WHERE id = (line->>'product_id');
        IF FOUND THEN
            lprice := prod.price;
            ldisc := 0;
            IF prod.discount_threshold IS NOT NULL AND (line->>'quantity')::INT >= prod.discount_threshold THEN
                ldisc := lprice * (prod.discount_percentage / 100.0);
            END IF;
            ltotal := ((line->>'quantity')::INT) * (lprice - ldisc);
            total := total + ltotal;
            
            new_line_id := 'ol-' || gen_random_uuid();
            INSERT INTO order_lines (id, order_id, product_id, quantity_requested, unit_price, discount_applied, line_total)
            VALUES (new_line_id, new_order_id, prod.id, (line->>'quantity')::INT, lprice, ldisc, ltotal);
        END IF;
    END LOOP;

    UPDATE orders SET total_amount = total WHERE id = new_order_id;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'create_order', 'order', new_order_id, jsonb_build_object('order_number', ord_number));

    RETURN jsonb_build_object('ok', true, 'message', 'Order ' || ord_number || ' created successfully.', 'order_id', new_order_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fulfill_order_line(p_order_id TEXT, p_line_id TEXT, p_code TEXT, p_override_reason TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
    ol RECORD;
    ord RECORD;
    sugg RECORD;
    all_fulfilled BOOLEAN;
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Box not found.'); END IF;
    
    SELECT * INTO ol FROM order_lines WHERE id = p_line_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Line not found.'); END IF;

    SELECT * INTO ord FROM orders WHERE id = p_order_id;

    IF bx.status NOT IN ('in_stock', 'returned_to_stock') THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cannot fulfill: box ' || p_code || ' is currently ' || bx.status);
    END IF;

    -- FEFO check
    SELECT * INTO sugg FROM boxes 
    WHERE product_id = ol.product_id AND status IN ('in_stock', 'returned_to_stock')
    ORDER BY expiry_date ASC NULLS LAST LIMIT 1;

    IF sugg.id != bx.id AND p_override_reason IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'needs_override', true, 
            'message', 'FEFO suggests box ' || sugg.code || ' instead of ' || p_code || '. Provide override reason to continue.',
            'suggested_code', sugg.code
        );
    END IF;

    UPDATE boxes SET status = 'dispatched_sale', updated_at = now() WHERE id = bx.id;
    UPDATE order_lines SET quantity_fulfilled = quantity_fulfilled + 1 WHERE id = ol.id;

    SELECT NOT EXISTS (
        SELECT 1 FROM order_lines WHERE order_id = ord.id AND quantity_fulfilled < quantity_requested
    ) INTO all_fulfilled;

    IF all_fulfilled THEN
        UPDATE orders SET status = 'dispatched', dispatched_at = now(), updated_at = now() WHERE id = ord.id;
    ELSE
        UPDATE orders SET status = 'partially_fulfilled', updated_at = now() WHERE id = ord.id;
    END IF;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'fulfill_order_line', 'box', bx.id, jsonb_build_object('code', p_code, 'order_id', ord.id, 'line_id', ol.id, 'override_reason', p_override_reason));

    RETURN jsonb_build_object('ok', true, 'message', 'Line fulfilled.');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION dispatch_non_sale(p_code TEXT, p_category TEXT, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    bx RECORD;
BEGIN
    SELECT * INTO bx FROM boxes WHERE code = p_code;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Box not found.'); END IF;

    IF bx.status NOT IN ('in_stock', 'returned_to_stock') THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Cannot dispatch: box is ' || bx.status);
    END IF;

    UPDATE boxes SET status = 'dispatched_non_sale', updated_at = now() WHERE id = bx.id;

    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (p_user_id, 'dispatch_non_sale', 'box', bx.id, jsonb_build_object('category', p_category));

    RETURN jsonb_build_object('ok', true, 'message', 'Box ' || p_code || ' dispatched as ' || p_category);
END;
$$ LANGUAGE plpgsql;
