export const strings = {
  app: { name: "2BFC Warehouse", tagline: "Two Brothers Food Complex — Box Traceability System" },
  auth: {
    signIn: "Sign In", username: "Username", password: "Password",
    twoFactorCode: "Two-Factor Code", signingIn: "Signing in...",
    incorrectCredentials: "Incorrect username or password.",
    accountLocked: "This account has been locked. Contact your Super Admin to unlock it.",
    tooManyAttempts: "Too many failed attempts. Try again in 15 minutes.",
    inactive: "This account is inactive. Contact your administrator.",
    twoFactorRequired: "Two-factor authentication code required.",
    invalidTwoFactor: "Invalid two-factor code.",
    signOut: "Sign Out",
  },
  nav: { home: "Home", checker: "Checker", backToHome: "Back to Home" },
  roles: {
    super_admin: "Super Admin", production_admin: "Production Admin", production: "Production",
    warehouse_admin: "Warehouse Admin", warehouse_receiving: "Warehouse Receiving",
    warehouse_withdrawal: "Warehouse Withdrawal", sales_admin: "Sales Admin", sales: "Sales",
    stock_manager_admin: "Stock Manager Admin", stock_manager: "Stock Manager",
    qa_admin: "QA Admin", qa_officer: "QA Officer", report_viewer: "Report Viewer",
  },
  status: {
    logged: "Logged", in_stock: "In Stock", on_hold: "On Hold", expired: "Expired",
    dispatched_sale: "Dispatched (Sale)", dispatched_non_sale: "Dispatched (Non-Sale)",
    damaged_pending: "Damaged — Pending", written_off: "Written Off", returned_to_stock: "Returned to Stock",
  },
  scan: {
    scanOrType: "Scan or type a code, then press Enter", scanPlaceholder: "Scan barcode here...",
    cameraScan: "Camera Scan", stopCamera: "Stop Camera", selectProduct: "Select a product",
    runningCount: "Boxes logged this session", newBox: "New box logged", alreadyLogged: "Already logged",
    confirmReceipt: "Confirm Receipt", receiptConfirmed: "Receipt confirmed",
    fulfill: "Fulfill", fefoSuggested: "FEFO suggested", overrideNeeded: "Override reason required",
    overrideReason: "Override reason", submitOverride: "Submit with override", cancel: "Cancel",
  },
  production: { title: "Production — Log Boxes", pickProduct: "Pick the product, then scan each box", sessionCount: "Session count", lastScan: "Last scan" },
  receiving: { title: "Warehouse Receiving — Confirm Receipt", scanToConfirm: "Scan a logged box to confirm receipt" },
  withdrawal: {
    title: "Warehouse Withdrawal", orderPicker: "Order Picker — FEFO", nonSaleDispatch: "Non-Sale Dispatch",
    category: "Category", gift: "Gift", promotion: "Promotion", personalUse: "Personal Use",
    reason: "Reason", dispatch: "Dispatch", selectOrder: "Select an order to fulfill",
    line: "Line", of: "of", suggested: "Suggested boxes (FEFO)", scanBox: "Scan a box code to fulfill this line",
  },
  sales: {
    title: "Sales", customers: "Customers", newOrder: "New Order", orderHistory: "Order History",
    addCustomer: "Add Customer", customerName: "Customer name", phone: "Phone", address: "Address",
    save: "Save", available: "Available", addLine: "Add Line", quantity: "Quantity", createOrder: "Create Order",
    orderNumber: "Order #", status: "Status", date: "Date",
    short: "Short — not enough stock for all lines", readyToPick: "Ready to pick",
  },
  stock: {
    title: "Stock Manager", damageQueue: "Damage Decision Queue", productMaster: "Product Master Data",
    approve: "Approve", writeoff: "Write Off", returnToStock: "Return to Stock", reject: "Reject",
    decisionNote: "Decision note", reorderPoint: "Reorder point", shelfLife: "Shelf life (days)",
    save: "Save", noReports: "No pending damage reports.",
  },
  qa: { title: "QA Officer", placeHold: "Place Quality Hold", releaseHold: "Release Hold", activeHolds: "Active Holds", reason: "Reason", place: "Place", release: "Release" },
  reports: {
    title: "Reports", inventoryByProduct: "Inventory by Product", salesActivity: "Sales Activity",
    boxLifecycle: "Box Lifecycle", exportPdf: "Export PDF", exportExcel: "Export Excel",
    totalBoxes: "Total boxes", inStock: "In stock", dispatched: "Dispatched", expired: "Expired", damaged: "Damaged",
  },
  checker: {
    title: "Checker — Scan Any Code", lookup: "Look up", noBox: "No box exists with this code.",
    history: "History", product: "Product", status: "Status",
    loggedAt: "Logged at", receivedAt: "Received at", expiry: "Expiry",
  },
  admin: {
    title: "Dashboard", overview: "Overview", byWorker: "By Worker", byProduct: "By Product",
    filterDate: "Filter by date", filterWorker: "Filter by worker", filterProduct: "Filter by product",
    drillDown: "Drill-down into box history", manageUsers: "Manage Users", addProductAccess: "Product Access",
  },
  common: {
    loading: "Loading...", error: "Error", none: "None", notApplicable: "N/A",
    close: "Close", yes: "Yes", no: "No", search: "Search", actions: "Actions",
    code: "Code", product: "Product", user: "User", date: "Date", back: "Back",
  },
} as const;

export type StringTree = typeof strings;
