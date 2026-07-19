/*
# 2BFC Warehouse Management System — Core Schema

## Summary
Complete data model for a traceability-first WMS tracking stock at the individual
box level. One factory, one warehouse. Roles, products, boxes, orders, dispatches,
damage, QA holds, audit log, backups.

## New Tables
- profiles (extends auth.users), login_failure_events, user_product_access,
  products (13 seeded SKUs), boxes (core), customers, orders, order_lines,
  order_line_boxes, non_sale_dispatches, damage_reports, quality_holds,
  audit_log (append-only), backups.

## Security
- RLS on every table. Helper functions for role/department/product access.
- audit_log is INSERT+SELECT only for every role including super_admin.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'production_admin', 'production',
  'warehouse_admin', 'warehouse_receiving', 'warehouse_withdrawal',
  'sales_admin', 'sales',
  'stock_manager_admin', 'stock_manager',
  'qa_admin', 'qa_officer',
  'report_viewer'
);

DROP TYPE IF EXISTS box_status CASCADE;
CREATE TYPE box_status AS ENUM (
  'logged', 'in_stock', 'on_hold', 'expired',
  'dispatched_sale', 'dispatched_non_sale',
  'damaged_pending', 'written_off', 'returned_to_stock'
);

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM (
  'pending', 'ready_to_pick', 'partially_fulfilled', 'dispatched', 'cancelled', 'short'
);

DROP TYPE IF EXISTS non_sale_category CASCADE;
CREATE TYPE non_sale_category AS ENUM ('gift', 'promotion', 'personal_use');

DROP TYPE IF EXISTS damage_source CASCADE;
CREATE TYPE damage_source AS ENUM ('factory', 'warehouse', 'customer_returned');

DROP TYPE IF EXISTS damage_status CASCADE;
CREATE TYPE damage_status AS ENUM ('pending_approval', 'approved_writeoff', 'approved_return_to_stock', 'rejected');

DROP TYPE IF EXISTS hold_status CASCADE;
CREATE TYPE hold_status AS ENUM ('active', 'released');

DROP TYPE IF EXISTS backup_status CASCADE;
CREATE TYPE backup_status AS ENUM ('success', 'failed');

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_banned boolean NOT NULL DEFAULT false,
  failed_login_count integer NOT NULL DEFAULT 0,
  lockout_until timestamptz,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ---------- login_failure_events ----------
CREATE TABLE IF NOT EXISTS login_failure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE login_failure_events ENABLE ROW LEVEL SECURITY;

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text UNIQUE NOT NULL,
  name text NOT NULL,
  reorder_point integer,
  shelf_life_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ---------- user_product_access ----------
CREATE TABLE IF NOT EXISTS user_product_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (user_id, product_id)
);
ALTER TABLE user_product_access ENABLE ROW LEVEL SECURITY;

-- ---------- boxes ----------
CREATE TABLE IF NOT EXISTS boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status box_status NOT NULL DEFAULT 'logged',
  logged_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  received_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  received_at timestamptz,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_boxes_product_status ON boxes(product_id, status);
CREATE INDEX IF NOT EXISTS idx_boxes_expiry ON boxes(expiry_date);
CREATE INDEX IF NOT EXISTS idx_boxes_code ON boxes(code);

-- ---------- customers ----------
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  created_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ---------- orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sales_person_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  order_date timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ---------- order_lines ----------
CREATE TABLE IF NOT EXISTS order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_requested integer NOT NULL CHECK (quantity_requested > 0),
  quantity_fulfilled integer NOT NULL DEFAULT 0
);
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);

-- ---------- order_line_boxes ----------
CREATE TABLE IF NOT EXISTS order_line_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id uuid NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  box_id uuid NOT NULL REFERENCES boxes(id) ON DELETE RESTRICT,
  fulfilled_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  fulfilled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_line_id, box_id)
);
ALTER TABLE order_line_boxes ENABLE ROW LEVEL SECURITY;

-- ---------- non_sale_dispatches ----------
CREATE TABLE IF NOT EXISTS non_sale_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES boxes(id) ON DELETE RESTRICT,
  category non_sale_category NOT NULL,
  reason text,
  dispatched_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE non_sale_dispatches ENABLE ROW LEVEL SECURITY;

-- ---------- damage_reports ----------
CREATE TABLE IF NOT EXISTS damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES boxes(id) ON DELETE RESTRICT,
  source damage_source NOT NULL,
  reason text,
  photo_url text,
  reported_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status damage_status NOT NULL DEFAULT 'pending_approval',
  decided_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decision_note text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_damage_status ON damage_reports(status);

-- ---------- quality_holds ----------
CREATE TABLE IF NOT EXISTS quality_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES boxes(id) ON DELETE RESTRICT,
  placed_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status hold_status NOT NULL DEFAULT 'active',
  released_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);
ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_holds_box ON quality_holds(box_id);

-- ---------- audit_log ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ---------- backups ----------
CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_reference text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  status backup_status NOT NULL,
  size_bytes bigint,
  verified_restorable boolean NOT NULL DEFAULT false
);
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- ---------- Helper functions ----------
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('super_admin','production_admin','warehouse_admin','sales_admin','stock_manager_admin','qa_admin')
  FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_department()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT CASE
    WHEN role = 'super_admin' THEN 'super'
    WHEN role IN ('production_admin','production') THEN 'production'
    WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
    WHEN role IN ('sales_admin','sales') THEN 'sales'
    WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
    WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
    WHEN role = 'report_viewer' THEN 'reports'
  END FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_has_product_access(p_product_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT NOT EXISTS (SELECT 1 FROM user_product_access WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_product_access WHERE user_id = auth.uid() AND product_id = p_product_id);
$$;

-- ---------- RLS Policies ----------
-- profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = profiles.id
    ))
  );

DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
CREATE POLICY "profiles_insert_super_admin" ON profiles FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = profiles.id
    ))
  )
  WITH CHECK (current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = profiles.id
    ))
  );

-- login_failure_events
DROP POLICY IF EXISTS "login_failures_select" ON login_failure_events;
CREATE POLICY "login_failures_select" ON login_failure_events FOR SELECT TO authenticated
  USING (current_user_role() = 'super_admin');

-- user_product_access
DROP POLICY IF EXISTS "upa_select" ON user_product_access;
CREATE POLICY "upa_select" ON user_product_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = user_product_access.user_id
    ))
  );

DROP POLICY IF EXISTS "upa_insert" ON user_product_access;
CREATE POLICY "upa_insert" ON user_product_access FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = user_product_access.user_id
    ))
  );

DROP POLICY IF EXISTS "upa_delete" ON user_product_access;
CREATE POLICY "upa_delete" ON user_product_access FOR DELETE TO authenticated
  USING (current_user_role() = 'super_admin'
    OR (current_user_is_admin() AND current_user_department() = (
      SELECT CASE
        WHEN role IN ('production_admin','production') THEN 'production'
        WHEN role IN ('warehouse_admin','warehouse_receiving','warehouse_withdrawal') THEN 'warehouse'
        WHEN role IN ('sales_admin','sales') THEN 'sales'
        WHEN role IN ('stock_manager_admin','stock_manager') THEN 'stock'
        WHEN role IN ('qa_admin','qa_officer') THEN 'qa'
      END FROM profiles p2 WHERE p2.id = user_product_access.user_id
    ))
  );

-- products
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','stock_manager_admin'));

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','stock_manager_admin'))
  WITH CHECK (current_user_role() IN ('super_admin','stock_manager_admin'));

-- boxes
DROP POLICY IF EXISTS "boxes_select" ON boxes;
CREATE POLICY "boxes_select" ON boxes FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR logged_by_user_id = auth.uid()
    OR received_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM order_line_boxes olb
      JOIN order_lines ol ON ol.id = olb.order_line_id
      JOIN orders o ON o.id = ol.order_id
      WHERE olb.box_id = boxes.id AND o.sales_person_user_id = auth.uid()
    )
    OR current_user_role() IN ('warehouse_receiving','warehouse_withdrawal','stock_manager','qa_officer','report_viewer','sales')
  );

DROP POLICY IF EXISTS "boxes_insert" ON boxes;
CREATE POLICY "boxes_insert" ON boxes FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','production','production_admin'));

DROP POLICY IF EXISTS "boxes_update" ON boxes;
CREATE POLICY "boxes_update" ON boxes FOR UPDATE TO authenticated
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

-- customers
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated
  USING (current_user_role() IN ('super_admin','sales','sales_admin','stock_manager','stock_manager_admin','report_viewer','qa_admin','qa_officer'));

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','sales','sales_admin'));

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','sales','sales_admin'))
  WITH CHECK (current_user_role() IN ('super_admin','sales','sales_admin'));

-- orders
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR current_user_role() IN ('warehouse_receiving','warehouse_withdrawal','stock_manager','report_viewer')
    OR sales_person_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','sales','sales_admin'));

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','warehouse_admin','sales_admin','sales'))
  WITH CHECK (current_user_role() IN ('super_admin','warehouse_admin','sales_admin','sales'));

-- order_lines
DROP POLICY IF EXISTS "order_lines_select" ON order_lines;
CREATE POLICY "order_lines_select" ON order_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_lines.order_id AND (
      o.sales_person_user_id = auth.uid()
      OR current_user_role() = 'super_admin'
      OR current_user_is_admin()
      OR current_user_role() IN ('warehouse_receiving','warehouse_withdrawal','stock_manager','report_viewer')
    )
  ));

DROP POLICY IF EXISTS "order_lines_insert" ON order_lines;
CREATE POLICY "order_lines_insert" ON order_lines FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','sales','sales_admin'));

DROP POLICY IF EXISTS "order_lines_update" ON order_lines;
CREATE POLICY "order_lines_update" ON order_lines FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','warehouse_admin','sales_admin'))
  WITH CHECK (current_user_role() IN ('super_admin','warehouse_admin','sales_admin'));

-- order_line_boxes
DROP POLICY IF EXISTS "olb_select" ON order_line_boxes;
CREATE POLICY "olb_select" ON order_line_boxes FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR current_user_role() IN ('warehouse_receiving','warehouse_withdrawal','stock_manager','report_viewer','sales')
  );

DROP POLICY IF EXISTS "olb_insert" ON order_line_boxes;
CREATE POLICY "olb_insert" ON order_line_boxes FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','warehouse_withdrawal','warehouse_admin'));

-- non_sale_dispatches
DROP POLICY IF EXISTS "nsd_select" ON non_sale_dispatches;
CREATE POLICY "nsd_select" ON non_sale_dispatches FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR current_user_role() IN ('stock_manager','report_viewer','qa_officer')
    OR dispatched_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "nsd_insert" ON non_sale_dispatches;
CREATE POLICY "nsd_insert" ON non_sale_dispatches FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','warehouse_withdrawal','warehouse_admin','sales','sales_admin'));

-- damage_reports
DROP POLICY IF EXISTS "damage_select" ON damage_reports;
CREATE POLICY "damage_select" ON damage_reports FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR current_user_role() IN ('stock_manager','qa_officer','report_viewer')
    OR reported_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "damage_insert" ON damage_reports;
CREATE POLICY "damage_insert" ON damage_reports FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','production','warehouse_receiving','warehouse_withdrawal','sales','production_admin','warehouse_admin','sales_admin'));

DROP POLICY IF EXISTS "damage_update" ON damage_reports;
CREATE POLICY "damage_update" ON damage_reports FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','stock_manager_admin','stock_manager','qa_admin','qa_officer'))
  WITH CHECK (current_user_role() IN ('super_admin','stock_manager_admin','stock_manager','qa_admin','qa_officer'));

-- quality_holds
DROP POLICY IF EXISTS "holds_select" ON quality_holds;
CREATE POLICY "holds_select" ON quality_holds FOR SELECT TO authenticated
  USING (
    current_user_role() = 'super_admin'
    OR current_user_is_admin()
    OR current_user_role() IN ('stock_manager','qa_officer','report_viewer')
    OR placed_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "holds_insert" ON quality_holds;
CREATE POLICY "holds_insert" ON quality_holds FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin','qa_officer','qa_admin'));

DROP POLICY IF EXISTS "holds_update" ON quality_holds;
CREATE POLICY "holds_update" ON quality_holds FOR UPDATE TO authenticated
  USING (current_user_role() IN ('super_admin','qa_officer','qa_admin'))
  WITH CHECK (current_user_role() IN ('super_admin','qa_officer','qa_admin'));

-- audit_log: append-only
DROP POLICY IF EXISTS "audit_select" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- backups
DROP POLICY IF EXISTS "backups_select" ON backups;
CREATE POLICY "backups_select" ON backups FOR SELECT TO authenticated
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "backups_insert" ON backups;
CREATE POLICY "backups_insert" ON backups FOR INSERT TO authenticated
  WITH CHECK (current_user_role() = 'super_admin');

-- ---------- Seed products ----------
INSERT INTO products (product_code, name) VALUES
  ('BR1','Sliced Bread 400g'),
  ('BR2','Sliced Bread 600g'),
  ('BR3','Burger Buns 6-pack'),
  ('BR4','Hot Dog Buns 6-pack'),
  ('BR5','Dinner Rolls 8-pack'),
  ('BS1','Biscuits — Plain'),
  ('BS2','Biscuits — Sweet'),
  ('CK1','Cake — Vanilla'),
  ('CK2','Cake — Chocolate'),
  ('PS1','Pastry — Savory'),
  ('PS2','Pastry — Sweet'),
  ('SN1','Snack Pack — Small'),
  ('SN2','Snack Pack — Large')
ON CONFLICT (product_code) DO NOTHING;

-- ---------- updated_at triggers ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_boxes_updated ON boxes;
CREATE TRIGGER trg_boxes_updated BEFORE UPDATE ON boxes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
