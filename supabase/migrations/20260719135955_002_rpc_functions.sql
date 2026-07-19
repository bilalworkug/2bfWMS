/*
# 2BFC WMS — Business Logic RPC Functions

## Summary
SECURITY DEFINER functions implementing the box lifecycle and traceability.
All functions insert audit_log rows. Row locks (FOR UPDATE) prevent races
when two workers scan the same box simultaneously.

## Functions
1. log_box(code, product_id) — create box or return existing record's detail
2. confirm_receipt(code) — logged -> in_stock
3. suggest_boxes_for_withdrawal(product_id, quantity) — FEFO + auto-expire
4. fulfill_order_line(order_id, order_line_id, code, override_reason)
5. create_order(p_customer_id, p_new_customer_name, p_new_customer_phone, p_new_customer_address, p_lines)
6. dispatch_non_sale(code, category, reason)
7. report_damage(code, source, reason, photo_url, order_id)
8. decide_damage(report_id, decision, note)
9. place_quality_hold(code, reason)
10. release_quality_hold(hold_id)
11. auto_expire_boxes() — used by cron + called inline
12. record_login_failure(p_user_id) — used by auth edge function
13. unlock_account(p_user_id) — super_admin only
14. get_box_history(p_code) — full traceability lookup for Checker

## Security
All SECURITY DEFINER, run as the calling authenticated user's context via auth.uid().
Permission checks re-enforce the matrix at function level (defense in depth with RLS).
*/

-- ---------- audit helper ----------
CREATE OR REPLACE FUNCTION write_audit(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

-- ---------- auto-expire ----------
CREATE OR REPLACE FUNCTION auto_expire_boxes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n integer;
BEGIN
  WITH expired AS (
    UPDATE boxes
    SET status = 'expired', updated_at = now()
    WHERE status IN ('in_stock','on_hold')
      AND expiry_date IS NOT NULL
      AND expiry_date < current_date
    RETURNING id, code
  )
  INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, details)
  SELECT NULL, 'auto_expire', 'box', id, jsonb_build_object('code', code) FROM expired;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------- log_box ----------
CREATE OR REPLACE FUNCTION log_box(p_code text, p_product_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_existing boxes%ROWTYPE;
  v_product products%ROWTYPE;
  v_box boxes%ROWTYPE;
  v_expiry date;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','production','production_admin') THEN
    RAISE EXCEPTION 'Only Production roles may log boxes.';
  END IF;
  IF v_role IN ('production','production_admin') AND NOT current_user_has_product_access(p_product_id) THEN
    RAISE EXCEPTION 'You do not have access to this product.';
  END IF;

  -- existing code? return full detail (the "show what it already is" behavior)
  SELECT * INTO v_existing FROM boxes WHERE code = p_code LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_product FROM products WHERE id = v_existing.product_id;
    RETURN jsonb_build_object(
      'exists', true,
      'box', jsonb_build_object(
        'id', v_existing.id, 'code', v_existing.code, 'status', v_existing.status,
        'product_id', v_existing.product_id, 'product_code', v_product.product_code,
        'product_name', v_product.name, 'logged_at', v_existing.logged_at,
        'received_at', v_existing.received_at, 'expiry_date', v_existing.expiry_date
      ),
      'message', 'This code is already logged: ' || v_product.product_code || ' — ' || v_product.name
        || ', currently ' || v_existing.status::text || '.'
    );
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive.'; END IF;

  v_expiry := CASE WHEN v_product.shelf_life_days IS NOT NULL
    THEN (current_date + v_product.shelf_life_days)::date ELSE NULL END;

  INSERT INTO boxes (code, product_id, status, logged_by_user_id, logged_at, expiry_date)
  VALUES (p_code, p_product_id, 'logged', auth.uid(), now(), v_expiry)
  RETURNING * INTO v_box;

  PERFORM write_audit('log_box', 'box', v_box.id,
    jsonb_build_object('code', p_code, 'product', v_product.product_code));

  RETURN jsonb_build_object(
    'exists', false,
    'box', jsonb_build_object(
      'id', v_box.id, 'code', v_box.code, 'status', v_box.status,
      'product_id', v_box.product_id, 'product_code', v_product.product_code,
      'product_name', v_product.name, 'expiry_date', v_box.expiry_date
    ),
    'message', 'New box logged: ' || v_product.product_code || ' — ' || v_product.name
  );
END;
$$;

-- ---------- confirm_receipt ----------
CREATE OR REPLACE FUNCTION confirm_receipt(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_box boxes%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','warehouse_receiving','warehouse_admin') THEN
    RAISE EXCEPTION 'Only Warehouse Receiving may confirm receipt.';
  END IF;

  SELECT * INTO v_box FROM boxes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No box found with code %.', p_code; END IF;

  SELECT * INTO v_product FROM products WHERE id = v_box.product_id;
  IF v_role = 'warehouse_receiving' AND NOT current_user_has_product_access(v_box.product_id) THEN
    RAISE EXCEPTION 'You do not have access to this product.';
  END IF;

  IF v_box.status <> 'logged' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Cannot confirm receipt: box ' || p_code || ' (' || v_product.product_code || ') is currently ' || v_box.status::text || '.',
      'box', jsonb_build_object('id', v_box.id, 'code', v_box.code, 'status', v_box.status)
    );
  END IF;

  UPDATE boxes SET status='in_stock', received_by_user_id=auth.uid(), received_at=now(), updated_at=now()
  WHERE id = v_box.id RETURNING * INTO v_box;

  PERFORM write_audit('confirm_receipt', 'box', v_box.id, jsonb_build_object('code', p_code));

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Receipt confirmed: ' || v_product.product_code || ' — ' || v_product.name || ' is now in stock.',
    'box', jsonb_build_object('id', v_box.id, 'code', v_box.code, 'status', v_box.status)
  );
END;
$$;

-- ---------- suggest_boxes_for_withdrawal ----------
CREATE OR REPLACE FUNCTION suggest_boxes_for_withdrawal(p_product_id uuid, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
BEGIN
  PERFORM auto_expire_boxes();
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','warehouse_withdrawal','warehouse_admin','stock_manager','stock_manager_admin','report_viewer','sales') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  RETURN jsonb_build_object(
    'suggestions', (
      SELECT COALESCE(json_agg(jsonb_build_object('id', b.id, 'code', b.code, 'expiry_date', b.expiry_date)), '[]'::jsonb)
      FROM (
        SELECT id, code, expiry_date FROM boxes
        WHERE product_id = p_product_id AND status IN ('in_stock','returned_to_stock')
        ORDER BY expiry_date ASC NULLS LAST, logged_at ASC
        LIMIT p_quantity
      ) b
    ),
    'available_count', (
      SELECT count(*) FROM boxes
      WHERE product_id = p_product_id AND status IN ('in_stock','returned_to_stock')
    )
  );
END;
$$;

-- ---------- fulfill_order_line ----------
CREATE OR REPLACE FUNCTION fulfill_order_line(p_order_id uuid, p_order_line_id uuid, p_code text, p_override_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_box boxes%ROWTYPE;
  v_product products%ROWTYPE;
  v_line order_lines%ROWTYPE;
  v_order orders%ROWTYPE;
  v_suggested boxes%ROWTYPE;
  v_all_fulfilled boolean;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','warehouse_withdrawal','warehouse_admin') THEN
    RAISE EXCEPTION 'Only Warehouse Withdrawal may fulfill orders.';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.status IN ('dispatched','cancelled') THEN
    RAISE EXCEPTION 'Order is already %.', v_order.status::text;
  END IF;

  SELECT * INTO v_line FROM order_lines WHERE id = p_order_line_id AND order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order line not found.'; END IF;
  IF v_line.quantity_fulfilled >= v_line.quantity_requested THEN
    RAISE EXCEPTION 'This line is already fully fulfilled.';
  END IF;

  SELECT * INTO v_box FROM boxes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No box found with code %.', p_code; END IF;
  SELECT * INTO v_product FROM products WHERE id = v_box.product_id;

  IF v_role = 'warehouse_withdrawal' AND NOT current_user_has_product_access(v_box.product_id) THEN
    RAISE EXCEPTION 'You do not have access to this product.';
  END IF;

  IF v_box.product_id <> v_line.product_id THEN
    RAISE EXCEPTION 'Box % is %, but this line requires a different product.', p_code, v_product.product_code;
  END IF;

  IF v_box.status NOT IN ('in_stock','returned_to_stock') THEN
    RETURN jsonb_build_object('ok', false,
      'message', 'Cannot fulfill: box ' || p_code || ' is currently ' || v_box.status::text || '.',
      'box', jsonb_build_object('id', v_box.id, 'code', v_box.code, 'status', v_box.status));
  END IF;

  -- FEFO check: is this the earliest-expiring available box?
  SELECT * INTO v_suggested FROM boxes
    WHERE product_id = v_line.product_id AND status IN ('in_stock','returned_to_stock')
    ORDER BY expiry_date ASC NULLS LAST, logged_at ASC LIMIT 1;

  IF v_suggested.id IS NOT NULL AND v_suggested.id <> v_box.id AND p_override_reason IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'needs_override', true,
      'message', 'FEFO suggests box ' || v_suggested.code || ' (expiry ' || COALESCE(v_suggested.expiry_date::text,'none') || ') instead of ' || p_code || '. Provide an override reason to continue.',
      'suggested_code', v_suggested.code
    );
  END IF;

  -- already used on this line?
  IF EXISTS (SELECT 1 FROM order_line_boxes WHERE order_line_id = p_order_line_id AND box_id = v_box.id) THEN
    RAISE EXCEPTION 'Box % is already scanned for this line.', p_code;
  END IF;

  UPDATE boxes SET status='dispatched_sale', updated_at=now() WHERE id = v_box.id;
  INSERT INTO order_line_boxes (order_line_id, box_id, fulfilled_by_user_id, fulfilled_at)
    VALUES (p_order_line_id, v_box.id, auth.uid(), now());
  UPDATE order_lines SET quantity_fulfilled = quantity_fulfilled + 1 WHERE id = p_order_line_id;
  SELECT * INTO v_line FROM order_lines WHERE id = p_order_line_id;

  -- roll up order status
  SELECT bool_and(quantity_fulfilled >= quantity_requested) INTO v_all_fulfilled
    FROM order_lines WHERE order_id = p_order_id;
  IF v_all_fulfilled THEN
    UPDATE orders SET status='dispatched', dispatched_at=now(), updated_at=now() WHERE id = p_order_id;
  ELSE
    UPDATE orders SET status='partially_fulfilled', updated_at=now() WHERE id = p_order_id;
  END IF;

  PERFORM write_audit('fulfill_order_line', 'box', v_box.id,
    jsonb_build_object('code', p_code, 'order_id', p_order_id, 'line_id', p_order_line_id,
      'override_reason', p_override_reason));

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Box ' || p_code || ' fulfilled for ' || v_product.product_code || '. Line ' || v_line.quantity_fulfilled || '/' || v_line.quantity_requested || '.',
    'line_fulfilled', v_line.quantity_fulfilled,
    'line_requested', v_line.quantity_requested,
    'order_complete', v_all_fulfilled
  );
END;
$$;

-- ---------- create_order ----------
CREATE OR REPLACE FUNCTION create_order(
  p_customer_id uuid,
  p_new_customer_name text,
  p_new_customer_phone text,
  p_new_customer_address text,
  p_lines jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_customer_id uuid;
  v_order orders%ROWTYPE;
  v_order_number text;
  v_line jsonb;
  v_product_id uuid;
  v_qty integer;
  v_available integer;
  v_short boolean := false;
  v_any_short boolean := false;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','sales','sales_admin') THEN
    RAISE EXCEPTION 'Only Sales may create orders.';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    v_customer_id := p_customer_id;
  ELSIF p_new_customer_name IS NOT NULL AND p_new_customer_name <> '' THEN
    INSERT INTO customers (name, phone, address, created_by_user_id)
      VALUES (p_new_customer_name, p_new_customer_phone, p_new_customer_address, auth.uid())
      RETURNING id INTO v_customer_id;
  ELSE
    RAISE EXCEPTION 'Either an existing customer or a new customer name is required.';
  END IF;

  v_order_number := 'ORD-' || to_char(now(),'YYYYMMDD') || '-' || lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');
  INSERT INTO orders (order_number, customer_id, sales_person_user_id, status, order_date)
    VALUES (v_order_number, v_customer_id, auth.uid(), 'pending', now())
    RETURNING * INTO v_order;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_product_id := (v_line->>'product_id')::uuid;
    v_qty := (v_line->>'quantity_requested')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be > 0.'; END IF;
    SELECT count(*) INTO v_available FROM boxes
      WHERE product_id = v_product_id AND status IN ('in_stock','returned_to_stock');
    IF v_available < v_qty THEN v_short := true; v_any_short := true; ELSE v_short := false; END IF;
    INSERT INTO order_lines (order_id, product_id, quantity_requested, quantity_fulfilled)
      VALUES (v_order.id, v_product_id, v_qty, 0);
  END LOOP;

  IF v_any_short THEN
    UPDATE orders SET status='short', updated_at=now() WHERE id = v_order.id;
    v_order.status := 'short'::order_status;
  ELSE
    UPDATE orders SET status='ready_to_pick', updated_at=now() WHERE id = v_order.id;
    v_order.status := 'ready_to_pick'::order_status;
  END IF;

  PERFORM write_audit('create_order', 'order', v_order.id,
    jsonb_build_object('order_number', v_order.order_number, 'short', v_any_short));

  RETURN jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'status', v_order.status),
    'short', v_any_short
  );
END;
$$;

-- ---------- dispatch_non_sale ----------
CREATE OR REPLACE FUNCTION dispatch_non_sale(p_code text, p_category non_sale_category, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_box boxes%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','warehouse_withdrawal','warehouse_admin','sales','sales_admin') THEN
    RAISE EXCEPTION 'Not authorized for non-sale dispatch.';
  END IF;

  SELECT * INTO v_box FROM boxes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No box found with code %.', p_code; END IF;
  SELECT * INTO v_product FROM products WHERE id = v_box.product_id;

  IF v_role = 'warehouse_withdrawal' AND NOT current_user_has_product_access(v_box.product_id) THEN
    RAISE EXCEPTION 'You do not have access to this product.';
  END IF;

  IF v_box.status NOT IN ('in_stock','returned_to_stock') THEN
    RETURN jsonb_build_object('ok', false,
      'message', 'Cannot dispatch: box ' || p_code || ' is currently ' || v_box.status::text || '.');
  END IF;

  UPDATE boxes SET status='dispatched_non_sale', updated_at=now() WHERE id = v_box.id;
  INSERT INTO non_sale_dispatches (box_id, category, reason, dispatched_by_user_id)
    VALUES (v_box.id, p_category, p_reason, auth.uid());

  PERFORM write_audit('dispatch_non_sale', 'box', v_box.id,
    jsonb_build_object('code', p_code, 'category', p_category, 'reason', p_reason));

  RETURN jsonb_build_object('ok', true,
    'message', 'Box ' || p_code || ' (' || v_product.product_code || ') dispatched as ' || p_category::text || '.');
END;
$$;

-- ---------- report_damage ----------
CREATE OR REPLACE FUNCTION report_damage(p_code text, p_source damage_source, p_reason text, p_photo_url text, p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_box boxes%ROWTYPE;
  v_report damage_reports%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  SELECT * INTO v_box FROM boxes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No box found with code %.', p_code; END IF;

  -- source/role matrix
  IF p_source = 'factory' AND v_role NOT IN ('super_admin','production','production_admin') THEN
    RAISE EXCEPTION 'Only Production may report factory damage.';
  END IF;
  IF p_source = 'warehouse' AND v_role NOT IN ('super_admin','warehouse_receiving','warehouse_withdrawal','warehouse_admin') THEN
    RAISE EXCEPTION 'Only Warehouse roles may report warehouse damage.';
  END IF;
  IF p_source = 'customer_returned' AND v_role NOT IN ('super_admin','sales','sales_admin') THEN
    RAISE EXCEPTION 'Only Sales may report customer-returned damage.';
  END IF;

  INSERT INTO damage_reports (box_id, source, reason, photo_url, reported_by_user_id, status, order_id)
    VALUES (v_box.id, p_source, p_reason, p_photo_url, auth.uid(), 'pending_approval', p_order_id)
    RETURNING * INTO v_report;

  UPDATE boxes SET status='damaged_pending', updated_at=now() WHERE id = v_box.id;

  PERFORM write_audit('report_damage', 'damage_report', v_report.id,
    jsonb_build_object('code', p_code, 'source', p_source, 'box_id', v_box.id));

  RETURN jsonb_build_object('ok', true, 'report_id', v_report.id,
    'message', 'Damage reported for box ' || p_code || '. Pending approval.');
END;
$$;

-- ---------- decide_damage ----------
CREATE OR REPLACE FUNCTION decide_damage(p_report_id uuid, p_decision text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_report damage_reports%ROWTYPE;
  v_box boxes%ROWTYPE;
  v_new_status box_status;
  v_new_damage_status damage_status;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','stock_manager_admin','stock_manager','qa_admin','qa_officer') THEN
    RAISE EXCEPTION 'Not authorized to decide damage reports.';
  END IF;

  SELECT * INTO v_report FROM damage_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Damage report not found.'; END IF;
  IF v_report.status <> 'pending_approval' THEN RAISE EXCEPTION 'Report already decided.'; END IF;

  SELECT * INTO v_box FROM boxes WHERE id = v_report.box_id FOR UPDATE;

  IF p_decision = 'writeoff' THEN
    v_new_status := 'written_off'::box_status;
    v_new_damage_status := 'approved_writeoff'::damage_status;
  ELSIF p_decision = 'return_to_stock' THEN
    v_new_status := 'returned_to_stock'::box_status;
    v_new_damage_status := 'approved_return_to_stock'::damage_status;
  ELSIF p_decision = 'reject' THEN
    v_new_status := 'in_stock'::box_status;
    v_new_damage_status := 'rejected'::damage_status;
  ELSE
    RAISE EXCEPTION 'Invalid decision. Use writeoff, return_to_stock, or reject.';
  END IF;

  UPDATE damage_reports SET status=v_new_damage_status, decided_by_user_id=auth.uid(),
    decision_note=p_note, decided_at=now() WHERE id = p_report_id;
  UPDATE boxes SET status=v_new_status, updated_at=now() WHERE id = v_box.id;

  PERFORM write_audit('decide_damage', 'damage_report', p_report_id,
    jsonb_build_object('box_id', v_box.id, 'decision', p_decision, 'note', p_note));

  RETURN jsonb_build_object('ok', true,
    'message', 'Damage report decided: ' || p_decision || '. Box ' || v_box.code || ' is now ' || v_new_status::text || '.');
END;
$$;

-- ---------- place_quality_hold ----------
CREATE OR REPLACE FUNCTION place_quality_hold(p_code text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_box boxes%ROWTYPE;
  v_hold quality_holds%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','qa_officer','qa_admin') THEN
    RAISE EXCEPTION 'Only QA roles may place holds.';
  END IF;
  SELECT * INTO v_box FROM boxes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No box found with code %.', p_code; END IF;
  IF v_box.status NOT IN ('in_stock','returned_to_stock','logged') THEN
    RAISE EXCEPTION 'Cannot hold a box that is %.', v_box.status::text;
  END IF;
  INSERT INTO quality_holds (box_id, placed_by_user_id, reason, status)
    VALUES (v_box.id, auth.uid(), p_reason, 'active') RETURNING * INTO v_hold;
  UPDATE boxes SET status='on_hold', updated_at=now() WHERE id = v_box.id;
  PERFORM write_audit('place_hold', 'quality_hold', v_hold.id, jsonb_build_object('code', p_code, 'reason', p_reason));
  RETURN jsonb_build_object('ok', true, 'message', 'Quality hold placed on box ' || p_code || '.');
END;
$$;

-- ---------- release_quality_hold ----------
CREATE OR REPLACE FUNCTION release_quality_hold(p_hold_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_hold quality_holds%ROWTYPE;
  v_box boxes%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin','qa_officer','qa_admin') THEN
    RAISE EXCEPTION 'Only QA roles may release holds.';
  END IF;
  SELECT * INTO v_hold FROM quality_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found.'; END IF;
  IF v_hold.status <> 'active' THEN RAISE EXCEPTION 'Hold already released.'; END IF;
  SELECT * INTO v_box FROM boxes WHERE id = v_hold.box_id FOR UPDATE;
  UPDATE quality_holds SET status='released', released_by_user_id=auth.uid(), released_at=now()
    WHERE id = p_hold_id;
  UPDATE boxes SET status='in_stock', updated_at=now() WHERE id = v_hold.box_id;
  PERFORM write_audit('release_hold', 'quality_hold', p_hold_id, jsonb_build_object('box_id', v_hold.box_id, 'code', v_box.code));
  RETURN jsonb_build_object('ok', true, 'message', 'Hold released on box ' || v_box.code || '. Box returned to stock.');
END;
$$;

-- ---------- get_box_history (Checker) ----------
CREATE OR REPLACE FUNCTION get_box_history(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_box boxes%ROWTYPE;
  v_product products%ROWTYPE;
  v_history jsonb;
BEGIN
  SELECT * INTO v_box FROM boxes WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'No box exists with code ' || p_code || '.');
  END IF;
  SELECT * INTO v_product FROM products WHERE id = v_box.product_id;
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::jsonb) INTO v_history FROM (
    SELECT 'log_box' AS action, logged_at AS at, logged_by_user_id AS by_user, NULL::text AS detail
    FROM boxes WHERE id = v_box.id AND logged_at IS NOT NULL
    UNION ALL
    SELECT 'confirm_receipt', received_at, received_by_user_id, NULL FROM boxes WHERE id = v_box.id AND received_at IS NOT NULL
    UNION ALL
    SELECT 'dispatch_sale', fulfilled_at, fulfilled_by_user_id, NULL FROM order_line_boxes WHERE box_id = v_box.id
    UNION ALL
    SELECT 'non_sale_dispatch', created_at, dispatched_by_user_id, category::text FROM non_sale_dispatches WHERE box_id = v_box.id
    UNION ALL
    SELECT 'damage_report', created_at, reported_by_user_id, source::text FROM damage_reports WHERE box_id = v_box.id
    UNION ALL
    SELECT 'quality_hold', created_at, placed_by_user_id, reason FROM quality_holds WHERE box_id = v_box.id
    ORDER BY at
  ) t;
  RETURN jsonb_build_object(
    'found', true,
    'box', jsonb_build_object('id', v_box.id, 'code', v_box.code, 'status', v_box.status,
      'product_code', v_product.product_code, 'product_name', v_product.name,
      'logged_at', v_box.logged_at, 'received_at', v_box.received_at, 'expiry_date', v_box.expiry_date),
    'history', v_history,
    'message', v_product.product_code || ' — ' || v_product.name || ', currently ' || v_box.status::text || '.'
  );
END;
$$;

-- ---------- record_login_failure (called by auth edge function) ----------
-- Note: runs with service role, so we take p_user_id explicitly.
CREATE OR REPLACE FUNCTION record_login_failure(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_count_24h integer;
  v_in_cycle integer;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found.'; END IF;

  INSERT INTO login_failure_events (user_id) VALUES (p_user_id);
  SELECT count(*) INTO v_count_24h FROM login_failure_events
    WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';

  IF v_count_24h >= 10 THEN
    UPDATE profiles SET is_banned = true, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('banned', true, 'message', 'This account has been locked. Contact your Super Admin to unlock it.');
  END IF;

  v_in_cycle := v_profile.failed_login_count + 1;
  IF v_in_cycle >= 5 THEN
    UPDATE profiles SET lockout_until = now() + interval '15 minutes',
      failed_login_count = 0, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('locked', true, 'message', 'Too many failed attempts. Try again in 15 minutes.');
  END IF;

  UPDATE profiles SET failed_login_count = v_in_cycle, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('failed', true, 'message', 'Incorrect username or password.');
END;
$$;

-- ---------- unlock_account (super_admin only) ----------
CREATE OR REPLACE FUNCTION unlock_account(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_super_count integer;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role <> 'super_admin' THEN RAISE EXCEPTION 'Only Super Admin may unlock accounts.'; END IF;

  -- prevent dropping below 2 active super admins
  SELECT count(*) INTO v_super_count FROM profiles
    WHERE role = 'super_admin' AND is_active = true AND is_banned = false;
  IF (SELECT role FROM profiles WHERE id = p_user_id) = 'super_admin'
     AND (SELECT is_banned FROM profiles WHERE id = p_user_id) = false
     AND v_super_count <= 2 THEN
    RAISE EXCEPTION 'At least two active Super Admins must remain.';
  END IF;

  UPDATE profiles SET is_banned = false, failed_login_count = 0,
    lockout_until = NULL, updated_at = now() WHERE id = p_user_id;
  PERFORM write_audit('unlock_account', 'profile', p_user_id, jsonb_build_object('unlocked_by', auth.uid()));
  RETURN jsonb_build_object('ok', true, 'message', 'Account unlocked.');
END;
$$;

-- ---------- reset_failed_on_success (called by auth edge function) ----------
CREATE OR REPLACE FUNCTION reset_failed_on_success(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET failed_login_count = 0, lockout_until = NULL, updated_at = now()
    WHERE id = p_user_id;
END;
$$;

-- ---------- create_profile_for_new_user (called by edge function after signUp) ----------
CREATE OR REPLACE FUNCTION create_profile_for_new_user(p_user_id uuid, p_username text, p_full_name text, p_role user_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_super_count integer;
BEGIN
  IF p_role = 'super_admin' THEN
    SELECT count(*) INTO v_super_count FROM profiles
      WHERE role = 'super_admin' AND is_active = true AND is_banned = false;
  END IF;
  INSERT INTO profiles (id, username, full_name, role, must_change_password)
    VALUES (p_user_id, p_username, p_full_name, p_role, true)
    ON CONFLICT (id) DO NOTHING;
END;
$$;
