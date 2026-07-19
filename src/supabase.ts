import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type UserRole =
  | "super_admin"
  | "production_admin" | "production"
  | "warehouse_admin" | "warehouse_receiving" | "warehouse_withdrawal"
  | "sales_admin" | "sales"
  | "stock_manager_admin" | "stock_manager"
  | "qa_admin" | "qa_officer"
  | "report_viewer";

export type BoxStatus =
  | "logged" | "in_stock" | "on_hold" | "expired"
  | "dispatched_sale" | "dispatched_non_sale"
  | "damaged_pending" | "written_off" | "returned_to_stock";

export type OrderStatus =
  | "pending" | "ready_to_pick" | "partially_fulfilled" | "dispatched" | "cancelled" | "short";

export type DamageSource = "factory" | "warehouse" | "customer_returned";
export type DamageStatus = "pending_approval" | "approved_writeoff" | "approved_return_to_stock" | "rejected";
export type NonSaleCategory = "gift" | "promotion" | "personal_use";

export interface Profile {
  id: string; username: string; full_name: string; role: UserRole;
  is_active: boolean; is_banned: boolean; failed_login_count: number;
  lockout_until: string | null; two_factor_enabled: boolean;
  must_change_password: boolean; created_at: string; updated_at: string;
}
export interface Product {
  id: string; product_code: string; name: string;
  reorder_point: number | null; shelf_life_days: number | null;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface Box {
  id: string; code: string; product_id: string; status: BoxStatus;
  logged_by_user_id: string | null; logged_at: string;
  received_by_user_id: string | null; received_at: string | null;
  expiry_date: string | null; created_at: string; updated_at: string;
}
export interface Customer {
  id: string; name: string; phone: string | null; address: string | null;
  created_by_user_id: string | null; created_at: string; updated_at: string;
}
export interface Order {
  id: string; order_number: string; customer_id: string;
  sales_person_user_id: string | null; status: OrderStatus;
  order_date: string; dispatched_at: string | null; created_at: string; updated_at: string;
}
export interface OrderLine {
  id: string; order_id: string; product_id: string;
  quantity_requested: number; quantity_fulfilled: number;
}
export interface DamageReport {
  id: string; box_id: string; source: DamageSource; reason: string | null;
  photo_url: string | null; reported_by_user_id: string | null;
  status: DamageStatus; decided_by_user_id: string | null;
  decision_note: string | null; order_id: string | null;
  created_at: string; decided_at: string | null;
}
export interface QualityHold {
  id: string; box_id: string; placed_by_user_id: string | null;
  reason: string; status: "active" | "released";
  released_by_user_id: string | null; created_at: string; released_at: string | null;
}
export interface UserProductAccess { id: string; user_id: string; product_id: string; }

// --- MOCK DATABASE IMPLEMENTATION ---
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
};

const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const SEEDED_PRODUCTS: Product[] = [
  { id: "p-1", product_code: "BR1", name: "Sliced Bread 400g", reorder_point: 50, shelf_life_days: 7, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-2", product_code: "BR2", name: "Sliced Bread 600g", reorder_point: 50, shelf_life_days: 7, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-3", product_code: "BR3", name: "Burger Buns 6-pack", reorder_point: 30, shelf_life_days: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-4", product_code: "BR4", name: "Hot Dog Buns 6-pack", reorder_point: 30, shelf_life_days: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-5", product_code: "BR5", name: "Dinner Rolls 8-pack", reorder_point: 20, shelf_life_days: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-6", product_code: "BS1", name: "Biscuits — Plain", reorder_point: 100, shelf_life_days: 90, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-7", product_code: "BS2", name: "Biscuits — Sweet", reorder_point: 100, shelf_life_days: 90, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-8", product_code: "CK1", name: "Cake — Vanilla", reorder_point: 15, shelf_life_days: 14, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-9", product_code: "CK2", name: "Cake — Chocolate", reorder_point: 15, shelf_life_days: 14, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-10", product_code: "PS1", name: "Pastry — Savory", reorder_point: 40, shelf_life_days: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-11", product_code: "PS2", name: "Pastry — Sweet", reorder_point: 40, shelf_life_days: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-12", product_code: "SN1", name: "Snack Pack — Small", reorder_point: 60, shelf_life_days: 180, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p-13", product_code: "SN2", name: "Snack Pack — Large", reorder_point: 60, shelf_life_days: 180, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const SEEDED_PROFILES: Profile[] = [
  { id: "u-admin", username: "admin", full_name: "Super Admin", role: "super_admin", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-prod", username: "prod", full_name: "Production Operator", role: "production", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-receiving", username: "receiving", full_name: "Receiving Clerk", role: "warehouse_receiving", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-withdrawal", username: "withdrawal", full_name: "Withdrawal Clerk", role: "warehouse_withdrawal", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-sales", username: "sales", full_name: "Sales Representative", role: "sales", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-stock", username: "stock", full_name: "Stock Manager", role: "stock_manager", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-qa", username: "qa", full_name: "QA Officer", role: "qa_officer", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u-reports", username: "reports", full_name: "Report Viewer", role: "report_viewer", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const SEEDED_CUSTOMERS: Customer[] = [
  { id: "c-1", name: "Metro Supermarket", phone: "555-0199", address: "100 Main St, City Centre", created_by_user_id: "u-sales", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "c-2", name: "Corner Grocery Store", phone: "555-0244", address: "45 Elm St, Westside", created_by_user_id: "u-sales", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Pre-fill some boxes so that it's not empty
const SEEDED_BOXES: Box[] = [
  { id: "b-1", code: "BOX-BR1-0001", product_id: "p-1", status: "in_stock", logged_by_user_id: "u-prod", logged_at: new Date(Date.now() - 86400000).toISOString(), received_by_user_id: "u-receiving", received_at: new Date(Date.now() - 43200000).toISOString(), expiry_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "b-2", code: "BOX-BR1-0002", product_id: "p-1", status: "in_stock", logged_by_user_id: "u-prod", logged_at: new Date(Date.now() - 86400000).toISOString(), received_by_user_id: "u-receiving", received_at: new Date(Date.now() - 42200000).toISOString(), expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "b-3", code: "BOX-BR2-0001", product_id: "p-2", status: "logged", logged_by_user_id: "u-prod", logged_at: new Date().toISOString(), received_by_user_id: null, received_at: null, expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

class MockBuilder {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getTableData(): any[] {
    if (this.tableName === "products") return getStorageItem("mock_products", SEEDED_PRODUCTS);
    if (this.tableName === "profiles") return getStorageItem("mock_profiles", SEEDED_PROFILES);
    if (this.tableName === "customers") return getStorageItem("mock_customers", SEEDED_CUSTOMERS);
    if (this.tableName === "boxes") return getStorageItem("mock_boxes", SEEDED_BOXES);
    if (this.tableName === "quality_holds") return getStorageItem("mock_quality_holds", [] as QualityHold[]);
    if (this.tableName === "damage_reports") return getStorageItem("mock_damage_reports", [] as DamageReport[]);
    if (this.tableName === "orders") return getStorageItem("mock_orders", [] as Order[]);
    if (this.tableName === "order_lines") return getStorageItem("mock_order_lines", [] as OrderLine[]);
    return [];
  }

  private setTableData(data: any[]) {
    if (this.tableName === "products") setStorageItem("mock_products", data);
    if (this.tableName === "profiles") setStorageItem("mock_profiles", data);
    if (this.tableName === "customers") setStorageItem("mock_customers", data);
    if (this.tableName === "boxes") setStorageItem("mock_boxes", data);
    if (this.tableName === "quality_holds") setStorageItem("mock_quality_holds", data);
    if (this.tableName === "damage_reports") setStorageItem("mock_damage_reports", data);
    if (this.tableName === "orders") setStorageItem("mock_orders", data);
    if (this.tableName === "order_lines") setStorageItem("mock_order_lines", data);
  }

  select(fields?: string, options?: any) {
    let data = this.getTableData();
    let count: number | null = null;
    if (options?.count === "exact") {
      count = data.length;
    }

    const chain = {
      data,
      count,
      error: null,
      eq: (col: string, val: any) => {
        chain.data = chain.data.filter(r => r[col] === val);
        if (options?.count === "exact") chain.count = chain.data.length;
        return chain;
      },
      in: (col: string, vals: any[]) => {
        chain.data = chain.data.filter(r => vals.includes(r[col]));
        if (options?.count === "exact") chain.count = chain.data.length;
        return chain;
      },
      order: (col: string, orderOpt?: { ascending?: boolean }) => {
        const asc = orderOpt?.ascending !== false;
        chain.data = [...chain.data].sort((a, b) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        });
        return chain;
      },
      limit: (num: number) => {
        chain.data = chain.data.slice(0, num);
        return chain;
      },
      maybeSingle: () => {
        return { data: chain.data[0] || null, error: null };
      },
      single: () => {
        if (chain.data.length === 0) return { data: null, error: new Error("No row found") };
        return { data: chain.data[0], error: null };
      },
      then: (resolve: any) => resolve({ data: chain.data, count: chain.count, error: null })
    };

    return chain;
  }

  insert(record: any) {
    let data = this.getTableData();
    const records = Array.isArray(record) ? record : [record];
    const newRecords = records.map(r => ({
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...r
    }));
    data = [...data, ...newRecords];
    this.setTableData(data);

    const chain = {
      data: Array.isArray(record) ? newRecords : newRecords[0],
      error: null,
      then: (resolve: any) => resolve({ data: chain.data, error: null })
    };
    return chain;
  }

  update(record: any) {
    const chain = {
      eq: (col: string, val: any) => {
        let data = this.getTableData();
        let updatedCount = 0;
        data = data.map(r => {
          if (r[col] === val) {
            updatedCount++;
            return { ...r, ...record, updated_at: new Date().toISOString() };
          }
          return r;
        });
        this.setTableData(data);
        return { data, error: null, then: (resolve: any) => resolve({ error: null }) };
      }
    };
    return chain;
  }
}

const mockAuth = {
  getSession: async () => {
    const session = getStorageItem<any>("mock_session", null);
    return { data: { session }, error: null };
  },
  onAuthStateChange: (callback: any) => {
    // Notify on load
    const session = getStorageItem<any>("mock_session", null);
    setTimeout(() => callback("SIGNED_IN", session), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  setSession: async (session: any) => {
    const profiles = getStorageItem<Profile[]>("mock_profiles", SEEDED_PROFILES);
    // Find mock profile matching user id, or default to admin
    const profile = profiles.find(p => p.id === session.access_token) || profiles[0];
    const fullSession = {
      user: { id: profile.id, email: `${profile.username}@example.com` },
      access_token: profile.id,
      refresh_token: "mock-refresh-token",
      ...session
    };
    setStorageItem("mock_session", fullSession);
    return { data: { session: fullSession }, error: null };
  },
  signOut: async () => {
    localStorage.removeItem("mock_session");
    return { error: null };
  },
  admin: {
    createUser: async (user: any) => {
      const profiles = getStorageItem<Profile[]>("mock_profiles", SEEDED_PROFILES);
      const newUserId = "u-" + Math.random().toString(36).substr(2, 9);
      return { data: { user: { id: newUserId } }, error: null };
    }
  }
};

const mockRpc = async (fn: string, args: any) => {
  const boxes = getStorageItem<Box[]>("mock_boxes", SEEDED_BOXES);
  const products = getStorageItem<Product[]>("mock_products", SEEDED_PRODUCTS);
  const profiles = getStorageItem<Profile[]>("mock_profiles", SEEDED_PROFILES);
  const qualityHolds = getStorageItem<QualityHold[]>("mock_quality_holds", []);
  const damageReports = getStorageItem<DamageReport[]>("mock_damage_reports", []);
  const orders = getStorageItem<Order[]>("mock_orders", []);
  const orderLines = getStorageItem<OrderLine[]>("mock_order_lines", []);
  const customers = getStorageItem<Customer[]>("mock_customers", SEEDED_CUSTOMERS);
  const auditLogs = getStorageItem<any[]>("mock_audit_logs", []);
  const session = getStorageItem<any>("mock_session", null);
  const currentUserId = session?.user?.id || "u-admin";

  const addAudit = (action: string, type: string, id: string, details: any) => {
    auditLogs.push({ id: Math.random().toString(), user_id: currentUserId, action_type: action, entity_type: type, entity_id: id, details, created_at: new Date().toISOString() });
    setStorageItem("mock_audit_logs", auditLogs);
  };

  if (fn === "unlock_account") {
    const profile = profiles.find(p => p.id === args.p_user_id);
    if (profile) {
      profile.is_banned = false;
      profile.failed_login_count = 0;
      profile.lockout_until = null;
      setStorageItem("mock_profiles", profiles);
      addAudit("unlock_account", "profile", args.p_user_id, { unlocked_by: currentUserId });
    }
    return { data: { ok: true, message: "Account unlocked" }, error: null };
  }

  if (fn === "create_profile_for_new_user") {
    profiles.push({
      id: args.p_user_id,
      username: args.p_username,
      full_name: args.p_full_name,
      role: args.p_role,
      is_active: true,
      is_banned: false,
      failed_login_count: 0,
      lockout_until: null,
      two_factor_enabled: false,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setStorageItem("mock_profiles", profiles);
    return { data: null, error: null };
  }

  if (fn === "get_box_history") {
    const box = boxes.find(b => b.code === args.p_code);
    if (!box) return { data: { found: false, message: `No box exists with code ${args.p_code}` }, error: null };
    const prod = products.find(p => p.id === box.product_id);
    const history = [
      { action: "log_box", at: box.logged_at, by_user: box.logged_by_user_id, detail: null },
    ];
    if (box.received_at) history.push({ action: "confirm_receipt", at: box.received_at, by_user: box.received_by_user_id, detail: null });
    if (box.status === "dispatched_sale") history.push({ action: "dispatch_sale", at: box.updated_at, by_user: currentUserId, detail: null });
    if (box.status === "dispatched_non_sale") history.push({ action: "non_sale_dispatch", at: box.updated_at, by_user: currentUserId, detail: "gift" });
    if (box.status === "damaged_pending") history.push({ action: "damage_report", at: box.updated_at, by_user: currentUserId, detail: "warehouse" });

    return {
      data: {
        found: true,
        box: { ...box, product_code: prod?.product_code, product_name: prod?.name },
        history,
        message: `${prod?.product_code} — ${prod?.name}, currently ${box.status}.`
      },
      error: null
    };
  }

  if (fn === "log_box") {
    const existing = boxes.find(b => b.code === args.p_code);
    if (existing) {
      const prod = products.find(p => p.id === existing.product_id);
      return {
        data: {
          exists: true,
          box: {
            id: existing.id, code: existing.code, status: existing.status,
            product_id: existing.product_id, product_code: prod?.product_code,
            product_name: prod?.name, logged_at: existing.logged_at,
            received_at: existing.received_at, expiry_date: existing.expiry_date
          },
          message: `This code is already logged: ${prod?.product_code} — ${prod?.name}, currently ${existing.status}.`
        },
        error: null
      };
    }

    const prod = products.find(p => p.id === args.p_product_id);
    if (!prod) return { data: null, error: new Error("Product not found or inactive.") };

    const expiryDate = prod.shelf_life_days ? new Date(Date.now() + prod.shelf_life_days * 86400000).toISOString().split('T')[0] : null;
    const newBox: Box = {
      id: "b-" + Math.random().toString(36).substr(2, 9),
      code: args.p_code,
      product_id: args.p_product_id,
      status: "logged",
      logged_by_user_id: currentUserId,
      logged_at: new Date().toISOString(),
      received_by_user_id: null,
      received_at: null,
      expiry_date: expiryDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    boxes.push(newBox);
    setStorageItem("mock_boxes", boxes);
    addAudit("log_box", "box", newBox.id, { code: args.p_code, product: prod.product_code });

    return {
      data: {
        exists: false,
        box: {
          id: newBox.id, code: newBox.code, status: newBox.status,
          product_id: newBox.product_id, product_code: prod.product_code,
          product_name: prod.name, expiry_date: newBox.expiry_date
        },
        message: `New box logged: ${prod.product_code} — ${prod.name}`
      },
      error: null
    };
  }

  if (fn === "confirm_receipt") {
    const boxIndex = boxes.findIndex(b => b.code === args.p_code);
    if (boxIndex === -1) return { data: null, error: new Error(`No box found with code ${args.p_code}`) };
    const box = boxes[boxIndex];
    const prod = products.find(p => p.id === box.product_id);

    if (box.status !== "logged") {
      return {
        data: {
          ok: false,
          message: `Cannot confirm receipt: box ${args.p_code} (${prod?.product_code}) is currently ${box.status}.`,
          box: { id: box.id, code: box.code, status: box.status }
        },
        error: null
      };
    }

    box.status = "in_stock";
    box.received_by_user_id = currentUserId;
    box.received_at = new Date().toISOString();
    box.updated_at = new Date().toISOString();
    setStorageItem("mock_boxes", boxes);
    addAudit("confirm_receipt", "box", box.id, { code: args.p_code });

    return {
      data: {
        ok: true,
        message: `Receipt confirmed: ${prod?.product_code} — ${prod?.name} is now in stock.`,
        box: { id: box.id, code: box.code, status: box.status }
      },
      error: null
    };
  }

  if (fn === "suggest_boxes_for_withdrawal") {
    const avail = boxes.filter(b => b.product_id === args.p_product_id && ["in_stock", "returned_to_stock"].includes(b.status));
    const sorted = [...avail].sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
    const suggestions = sorted.slice(0, args.p_quantity).map(b => ({ id: b.id, code: b.code, expiry_date: b.expiry_date }));
    return {
      data: {
        suggestions,
        available_count: avail.length
      },
      error: null
    };
  }

  if (fn === "create_order") {
    let customerId = args.p_customer_id;
    if (!customerId && args.p_new_customer_name) {
      const newCust = {
        id: "c-" + Math.random().toString(36).substr(2, 9),
        name: args.p_new_customer_name,
        phone: args.p_new_customer_phone,
        address: args.p_new_customer_address,
        created_by_user_id: currentUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      customers.push(newCust);
      setStorageItem("mock_customers", customers);
      customerId = newCust.id;
    }

    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 100000)}`;
    const newOrder: Order = {
      id: "o-" + Math.random().toString(36).substr(2, 9),
      order_number: orderNumber,
      customer_id: customerId,
      sales_person_user_id: currentUserId,
      status: "pending",
      order_date: new Date().toISOString(),
      dispatched_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let anyShort = false;
    args.p_lines.forEach((line: any) => {
      const available = boxes.filter(b => b.product_id === line.product_id && ["in_stock", "returned_to_stock"].includes(b.status)).length;
      const isShort = available < line.quantity_requested;
      if (isShort) anyShort = true;

      orderLines.push({
        id: "ol-" + Math.random().toString(36).substr(2, 9),
        order_id: newOrder.id,
        product_id: line.product_id,
        quantity_requested: line.quantity_requested,
        quantity_fulfilled: 0
      });
    });

    newOrder.status = anyShort ? "short" : "ready_to_pick";
    orders.push(newOrder);

    setStorageItem("mock_orders", orders);
    setStorageItem("mock_order_lines", orderLines);
    addAudit("create_order", "order", newOrder.id, { order_number: orderNumber, short: anyShort });

    return {
      data: {
        ok: true,
        order: { id: newOrder.id, order_number: newOrder.order_number, status: newOrder.status },
        short: anyShort
      },
      error: null
    };
  }

  if (fn === "fulfill_order_line") {
    const order = orders.find(o => o.id === args.p_order_id);
    if (!order) return { data: null, error: new Error("Order not found.") };
    const line = orderLines.find(l => l.id === args.p_order_line_id);
    if (!line) return { data: null, error: new Error("Order line not found.") };

    const box = boxes.find(b => b.code === args.p_code);
    if (!box) return { data: null, error: new Error(`No box found with code ${args.p_code}`) };
    const prod = products.find(p => p.id === box.product_id);

    if (!["in_stock", "returned_to_stock"].includes(box.status)) {
      return {
        data: {
          ok: false,
          message: `Cannot fulfill: box ${args.p_code} is currently ${box.status}.`,
          box: { id: box.id, code: box.code, status: box.status }
        },
        error: null
      };
    }

    // FEFO check
    const avail = boxes.filter(b => b.product_id === line.product_id && ["in_stock", "returned_to_stock"].includes(b.status));
    const suggested = [...avail].sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    })[0];

    if (suggested && suggested.id !== box.id && !args.p_override_reason) {
      return {
        data: {
          ok: false,
          needs_override: true,
          message: `FEFO suggests box ${suggested.code} (expiry ${suggested.expiry_date || "none"}) instead of ${args.p_code}. Provide an override reason to continue.`,
          suggested_code: suggested.code
        },
        error: null
      };
    }

    box.status = "dispatched_sale";
    box.updated_at = new Date().toISOString();
    line.quantity_fulfilled += 1;

    // Check if entire order is fulfilled
    const linesForOrder = orderLines.filter(l => l.order_id === order.id);
    const allFulfilled = linesForOrder.every(l => l.quantity_fulfilled >= l.quantity_requested);

    order.status = allFulfilled ? "dispatched" : "partially_fulfilled";
    if (allFulfilled) {
      order.dispatched_at = new Date().toISOString();
    }
    order.updated_at = new Date().toISOString();

    setStorageItem("mock_boxes", boxes);
    setStorageItem("mock_order_lines", orderLines);
    setStorageItem("mock_orders", orders);
    addAudit("fulfill_order_line", "box", box.id, { code: args.p_code, order_id: order.id, line_id: line.id, override_reason: args.p_override_reason });

    return {
      data: {
        ok: true,
        message: `Box ${args.p_code} fulfilled for ${prod?.product_code}. Line ${line.quantity_fulfilled}/${line.quantity_requested}.`,
        line_fulfilled: line.quantity_fulfilled,
        line_requested: line.quantity_requested,
        order_complete: allFulfilled
      },
      error: null
    };
  }

  if (fn === "dispatch_non_sale") {
    const box = boxes.find(b => b.code === args.p_code);
    if (!box) return { data: null, error: new Error(`No box found with code ${args.p_code}`) };
    if (!["in_stock", "returned_to_stock"].includes(box.status)) {
      return { data: { ok: false, message: `Cannot dispatch: box ${args.p_code} is currently ${box.status}.` }, error: null };
    }

    box.status = "dispatched_non_sale";
    box.updated_at = new Date().toISOString();
    setStorageItem("mock_boxes", boxes);
    addAudit("dispatch_non_sale", "box", box.id, { code: args.p_code, category: args.p_category, reason: args.p_reason });

    const prod = products.find(p => p.id === box.product_id);
    return { data: { ok: true, message: `Box ${args.p_code} (${prod?.product_code}) dispatched as ${args.p_category}.` }, error: null };
  }

  if (fn === "place_quality_hold") {
    const box = boxes.find(b => b.code === args.p_code);
    if (!box) return { data: null, error: new Error(`No box found with code ${args.p_code}`) };
    if (!["in_stock", "returned_to_stock", "logged"].includes(box.status)) {
      return { data: null, error: new Error(`Cannot hold a box that is ${box.status}.`) };
    }

    const newHold: QualityHold = {
      id: "qh-" + Math.random().toString(36).substr(2, 9),
      box_id: box.id,
      placed_by_user_id: currentUserId,
      reason: args.p_reason,
      status: "active",
      released_by_user_id: null,
      created_at: new Date().toISOString(),
      released_at: null
    };
    qualityHolds.push(newHold);
    box.status = "on_hold";
    box.updated_at = new Date().toISOString();

    setStorageItem("mock_quality_holds", qualityHolds);
    setStorageItem("mock_boxes", boxes);
    addAudit("place_hold", "quality_hold", newHold.id, { code: args.p_code, reason: args.p_reason });

    return { data: { ok: true, message: `Quality hold placed on box ${args.p_code}.` }, error: null };
  }

  if (fn === "release_quality_hold") {
    const hold = qualityHolds.find(h => h.id === args.p_hold_id);
    if (!hold) return { data: null, error: new Error("Hold not found.") };
    const box = boxes.find(b => b.id === hold.box_id);
    if (box) {
      box.status = "in_stock";
      box.updated_at = new Date().toISOString();
    }
    hold.status = "released";
    hold.released_by_user_id = currentUserId;
    hold.released_at = new Date().toISOString();

    setStorageItem("mock_quality_holds", qualityHolds);
    setStorageItem("mock_boxes", boxes);
    addAudit("release_hold", "quality_hold", hold.id, { box_id: hold.box_id, code: box?.code });

    return { data: { ok: true, message: `Hold released on box ${box?.code}. Box returned to stock.` }, error: null };
  }

  if (fn === "decide_damage") {
    const report = damageReports.find(r => r.id === args.p_report_id);
    if (!report) return { data: null, error: new Error("Damage report not found.") };
    const box = boxes.find(b => b.id === report.box_id);
    if (!box) return { data: null, error: new Error("Box not found.") };

    let newStatus: BoxStatus = "in_stock";
    let newDamageStatus: DamageStatus = "rejected";
    if (args.p_decision === "writeoff") {
      newStatus = "written_off";
      newDamageStatus = "approved_writeoff";
    } else if (args.p_decision === "return_to_stock") {
      newStatus = "returned_to_stock";
      newDamageStatus = "approved_return_to_stock";
    }

    report.status = newDamageStatus;
    report.decided_by_user_id = currentUserId;
    report.decision_note = args.p_note;
    report.decided_at = new Date().toISOString();

    box.status = newStatus;
    box.updated_at = new Date().toISOString();

    setStorageItem("mock_damage_reports", damageReports);
    setStorageItem("mock_boxes", boxes);
    addAudit("decide_damage", "damage_report", report.id, { box_id: box.id, decision: args.p_decision, note: args.p_note });

    return { data: { ok: true, message: `Damage report decided: ${args.p_decision}. Box ${box.code} is now ${newStatus}.` }, error: null };
  }

  return { data: null, error: new Error(`RPC function ${fn} is not mocked`) };
};

// Create a high-fidelity client if config is missing
const createMockSupabase = () => {
  return {
    auth: mockAuth,
    from: (tableName: string) => new MockBuilder(tableName),
    rpc: mockRpc
  } as any;
};

// Use real client if config is present, else fall back to mock
const isRealConfigPresent = !!(supabaseUrl && supabaseAnonKey);

let useMockFallback = false;

const realClient = isRealConfigPresent
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const mockClient = createMockSupabase();

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (prop === "forceMockFallback") {
      return () => {
        useMockFallback = true;
      };
    }

    if (prop === "auth") {
      if (useMockFallback || !realClient) return mockClient.auth;
      return realClient.auth;
    }
    
    if (prop === "from") {
      return (tableName: string) => {
        if (useMockFallback || !realClient) {
          return mockClient.from(tableName);
        }
        
        const realBuilder = realClient.from(tableName);
        const mockBuilder = mockClient.from(tableName);
        
        return new Proxy(realBuilder, {
          get(bTarget, bProp) {
            const orig = (bTarget as any)[bProp];
            if (typeof orig === "function") {
              return function (this: any, ...args: any[]) {
                if (bProp === "then") {
                  const resolve = args[0];
                  return orig.call(this, (res: any) => {
                    if (res?.error && (res.error.message?.includes("relation") || res.error.message?.includes("does not exist"))) {
                      console.warn(`Table "${tableName}" not found, using offline fallback`);
                      useMockFallback = true;
                      mockBuilder.select().then(resolve);
                    } else {
                      resolve(res);
                    }
                  }, (err: any) => {
                    console.warn(`Query on "${tableName}" failed, using offline fallback`, err);
                    useMockFallback = true;
                    mockBuilder.select().then(resolve);
                  });
                }
                
                const res = orig.apply(this, args);
                if (res && typeof res === "object" && typeof res.then === "function") {
                  return new Proxy(res, {
                    get(resTarget, resProp) {
                      if (resProp === "then") {
                        const origThen = resTarget.then;
                        return function(this: any, rResolve: any) {
                          return origThen.call(this, (rRes: any) => {
                            if (rRes?.error && (rRes.error.message?.includes("relation") || rRes.error.message?.includes("does not exist"))) {
                              useMockFallback = true;
                              mockBuilder.select().then(rResolve);
                            } else {
                              rResolve(rRes);
                            }
                          }, (rErr: any) => {
                            useMockFallback = true;
                            mockBuilder.select().then(rResolve);
                          });
                        };
                      }
                      return (resTarget as any)[resProp];
                    }
                  });
                }
                return res;
              };
            }
            return orig;
          }
        });
      };
    }
    
    if (prop === "rpc") {
      return async (fn: string, args: any) => {
        if (useMockFallback || !realClient) {
          return mockClient.rpc(fn, args);
        }
        try {
          const res = await realClient.rpc(fn, args);
          if (res?.error && (res.error.message?.includes("function") || res.error.message?.includes("does not exist"))) {
            console.warn(`RPC function "${fn}" not found, using offline fallback`);
            useMockFallback = true;
            return mockClient.rpc(fn, args);
          }
          return res;
        } catch (e) {
          console.warn(`RPC function "${fn}" failed, using offline fallback`, e);
          useMockFallback = true;
          return mockClient.rpc(fn, args);
        }
      };
    }
    
    return (realClient as any)[prop] || (mockClient as any)[prop];
  }
});
