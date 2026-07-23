export const enStrings = {
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
  pricing: {
    price: "Price", basePrice: "Base Price", bulkQty: "Bulk Qty Threshold", 
    discountPct: "Discount %", discountAmount: "Discount", lineTotal: "Line Total",
    totalAmount: "Total Amount", applyDiscount: "Apply Discount", subtotal: "Subtotal"
  },
  tracker: {
    title: "Order Tracker", searchPlaceholder: "Enter Order Number (e.g. ORD-12345)",
    customerInfo: "Customer Info", sellerInfo: "Salesperson", orderInfo: "Order Details",
    search: "Track Order", notFound: "Order not found."
  },
  stock: {
    title: "Stock Manager", damageQueue: "Damage Decision Queue", productMaster: "Product Master Data",
    approve: "Approve", writeoff: "Write Off", returnToStock: "Return to Stock", reject: "Reject",
    decisionNote: "Decision note", reorderPoint: "Reorder point", shelfLife: "Shelf life (days)",
    save: "Save", noReports: "No pending damage reports.",
  },
  qa: { title: "QA Officer", placeHold: "Place Quality Hold", releaseHold: "Release Hold", activeHolds: "Active Holds", reason: "Reason", place: "Place", release: "Release" },
  damage: {
    title: "Report Damage", source: "Damage Source", warehouse: "Warehouse",
    customer_returned: "Customer Return", reason: "Reason for damage", reportDamage: "Report Damage",
    reported: "Damage reported successfully",
  },
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

export const amStrings = {
  app: { name: "2BFC መጋዘን", tagline: "Two Brothers Food Complex — የካርቶን መከታተያ ስርዓት" },
  auth: {
    signIn: "ግባ", username: "የተጠቃሚ ስም", password: "የይለፍ ቃል",
    twoFactorCode: "ባለሁለት ደረጃ ኮድ", signingIn: "በመግባት ላይ...",
    incorrectCredentials: "የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል.",
    accountLocked: "ይህ መለያ ታግዷል። እባክዎ አስተዳዳሪዎን ያነጋግሩ።",
    tooManyAttempts: "ብዙ ያልተሳኩ ሙከራዎች። ከ15 ደቂቃ በኋላ እንደገና ይሞክሩ።",
    inactive: "ይህ መለያ ገቢር አይደለም። አስተዳዳሪዎን ያነጋግሩ።",
    twoFactorRequired: "ባለሁለት ደረጃ ማረጋገጫ ኮድ ያስፈልጋል።",
    invalidTwoFactor: "የተሳሳተ ባለሁለት ደረጃ ኮድ።",
    signOut: "ውጣ",
  },
  nav: { home: "ዋና ገጽ", checker: "አረጋጋጭ", backToHome: "ወደ ዋና ገጽ ተመለስ" },
  roles: {
    super_admin: "ዋና አስተዳዳሪ", production_admin: "የምርት አስተዳዳሪ", production: "ምርት",
    warehouse_admin: "የመጋዘን አስተዳዳሪ", warehouse_receiving: "መጋዘን ገቢ",
    warehouse_withdrawal: "መጋዘን ወጪ", sales_admin: "የሽያጭ አስተዳዳሪ", sales: "ሽያጭ",
    stock_manager_admin: "የክምችት አስተዳዳሪ (አድሚን)", stock_manager: "የክምችት አስተዳዳሪ",
    qa_admin: "የጥራት አስተዳዳሪ", qa_officer: "የጥራት ተቆጣጣሪ", report_viewer: "ሪፖርት ተመልካች",
  },
  status: {
    logged: "ተመዝግቧል", in_stock: "በክምችት አለ", on_hold: "ታግዷል", expired: "ጊዜው አልፎበታል",
    dispatched_sale: "ተልኳል (ሽያጭ)", dispatched_non_sale: "ተልኳል (ያልሆነ-ሽያጭ)",
    damaged_pending: "የተበላሸ - በመጠባበቅ ላይ", written_off: "ተሰርዟል", returned_to_stock: "ወደ ክምችት ተመልሷል",
  },
  scan: {
    scanOrType: "ኮድ ይቃኙ ወይም ያስገቡ", scanPlaceholder: "ባርኮድ እዚህ ይቃኙ...",
    cameraScan: "በካሜራ ይቃኙ", stopCamera: "ካሜራ አቁም", selectProduct: "ምርት ይምረጡ",
    runningCount: "በዚህ ክፍለ ጊዜ የተመዘገቡ ካርቶኖች", newBox: "አዲስ ካርቶን ተመዝግቧል", alreadyLogged: "ቀድሞውኑ ተመዝግቧል",
    confirmReceipt: "ርክክብ አረጋግጥ", receiptConfirmed: "ርክክብ ተረጋግጧል",
    fulfill: "አሟላ", fefoSuggested: "የቀደመ ጊዜ ይመከራል (FEFO)", overrideNeeded: "የማለፊያ ምክንያት ያስፈልጋል",
    overrideReason: "የማለፊያ ምክንያት", submitOverride: "በማለፊያ አረጋግጥ", cancel: "ሰርዝ",
  },
  production: { title: "ምርት — ካርቶን ይመዝግቡ", pickProduct: "ምርቱን ይምረጡ፣ ከዚያ እያንዳንዱን ካርቶን ይቃኙ", sessionCount: "የክፍለ ጊዜ ድምር", lastScan: "የመጨረሻ ቅኝት" },
  receiving: { title: "መጋዘን ገቢ — ርክክብ አረጋግጥ", scanToConfirm: "ርክክብ ለማረጋገጥ የተመዘገበ ካርቶን ይቃኙ" },
  withdrawal: {
    title: "መጋዘን ወጪ", orderPicker: "ትእዛዝ ሰብሳቢ — FEFO", nonSaleDispatch: "ያልሆነ-ሽያጭ መላኪያ",
    category: "ምድብ", gift: "ስጦታ", promotion: "ማስተዋወቂያ", personalUse: "ለግል ጥቅም",
    reason: "ምክንያት", dispatch: "ላክ", selectOrder: "ትእዛዝ ይምረጡ",
    line: "መስመር", of: "ከ", suggested: "የተጠቆሙ ካርቶኖች (FEFO)", scanBox: "ለማሟላት ካርቶን ይቃኙ",
  },
  sales: {
    title: "ሽያጭ", customers: "ደንበኞች", newOrder: "አዲስ ትእዛዝ", orderHistory: "የትእዛዝ ታሪክ",
    addCustomer: "ደንበኛ አክል", customerName: "የደንበኛ ስም", phone: "ስልክ", address: "አድራሻ",
    save: "አስቀምጥ", available: "የሚገኝ", addLine: "መስመር አክል", quantity: "ብዛት", createOrder: "ትእዛዝ ፍጠር",
    orderNumber: "ትእዛዝ #", status: "ሁኔታ", date: "ቀን",
    short: "አነስተኛ — በቂ ክምችት የለም", readyToPick: "ለመሰብሰብ ዝግጁ",
  },
  pricing: {
    price: "ዋጋ", basePrice: "መነሻ ዋጋ", bulkQty: "የጅምላ ብዛት", 
    discountPct: "ቅናሽ %", discountAmount: "ቅናሽ", lineTotal: "የመስመር ድምር",
    totalAmount: "አጠቃላይ ድምር", applyDiscount: "ቅናሽ ተግብር", subtotal: "ንዑስ ድምር"
  },
  tracker: {
    title: "የምርት ክትትል", searchPlaceholder: "የትዕዛዝ ቁጥር ያስገቡ (ለምሳሌ: ORD-12345)",
    customerInfo: "የደንበኛ መረጃ", sellerInfo: "ሻጭ", orderInfo: "የትዕዛዝ ዝርዝሮች",
    search: "ትዕዛዝ ፈልግ", notFound: "ትዕዛዝ አልተገኘም።"
  },
  stock: {
    title: "የክምችት አስተዳዳሪ", damageQueue: "የብልሽት ውሳኔ ዝርዝር", productMaster: "የምርት መረጃ",
    approve: "አጽድቅ", writeoff: "ሰርዝ", returnToStock: "ወደ ክምችት መልስ", reject: "ውድቅ አድርግ",
    decisionNote: "የውሳኔ ማስታወሻ", reorderPoint: "የእንደገና ትእዛዝ ነጥብ", shelfLife: "የመቆያ ጊዜ (ቀናት)",
    save: "አስቀምጥ", noReports: "ምንም በመጠባበቅ ላይ ያለ የብልሽት ሪፖርት የለም።",
  },
  qa: { title: "የጥራት ተቆጣጣሪ", placeHold: "እግድ አድርግ", releaseHold: "እግድ አንሳ", activeHolds: "ንቁ እግዶች", reason: "ምክንያት", place: "አድርግ", release: "አንሳ" },
  damage: {
    title: "ብልሽት ሪፖርት አድርግ", source: "የብልሽት ምንጭ", warehouse: "መጋዘን",
    customer_returned: "የደንበኛ ተመላሽ", reason: "የብልሽት ምክንያት", reportDamage: "ብልሽት ሪፖርት አድርግ",
    reported: "ብልሽቱ በተሳካ ሁኔታ ሪፖርት ተደርጓል",
  },
  reports: {
    title: "ሪፖርቶች", inventoryByProduct: "ክምችት በምርት", salesActivity: "የሽያጭ እንቅስቃሴ",
    boxLifecycle: "የካርቶን ኡደት", exportPdf: "ፒዲኤፍ ላክ", exportExcel: "ኤክሴል ላክ",
    totalBoxes: "አጠቃላይ ካርቶኖች", inStock: "በክምችት", dispatched: "የተላከ", expired: "ጊዜ ያለፈበት", damaged: "የተበላሸ",
  },
  checker: {
    title: "አረጋጋጭ — ማንኛውንም ኮድ ይቃኙ", lookup: "ፈልግ", noBox: "በዚህ ኮድ ምንም ካርቶን የለም።",
    history: "ታሪክ", product: "ምርት", status: "ሁኔታ",
    loggedAt: "የተመዘገበበት", receivedAt: "የተረከበበት", expiry: "የሚያበቃበት",
  },
  admin: {
    title: "ዳሽቦርድ", overview: "አጠቃላይ እይታ", byWorker: "በሰራተኛ", byProduct: "በምርት",
    filterDate: "በቀን አጣራ", filterWorker: "በሰራተኛ አጣራ", filterProduct: "በምርት አጣራ",
    drillDown: "የካርቶን ታሪክ በዝርዝር እይ", manageUsers: "ተጠቃሚዎችን አስተዳድር", addProductAccess: "የምርት መዳረሻ",
  },
  common: {
    loading: "በመጫን ላይ...", error: "ስህተት", none: "ምንም", notApplicable: "ተግባራዊ አይሆንም",
    close: "ዝጋ", yes: "አዎ", no: "አይ", search: "ፈልግ", actions: "ድርጊቶች",
    code: "ኮድ", product: "ምርት", user: "ተጠቃሚ", date: "ቀን", back: "ተመለስ",
  },
} as const;

export type StringTree = typeof enStrings;
