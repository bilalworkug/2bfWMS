import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Customer, Order, Product } from "../supabase";
import { useToast } from "../Toast";
import { strings } from "../strings";
import { Users, ShoppingCart, Plus, X, FileText, UserPlus, Package, MapPin, Phone } from "lucide-react";

type Tab = "orders" | "newOrder" | "customers";

export function SalesScreen() {
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("orders");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<(Order & { customer?: Customer })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [available, setAvailable] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [lines, setLines] = useState<{ product_id: string; quantity: number }[]>([]);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");

  const loadCustomers = async () => { const { data } = await supabase.from("customers").select("*").order("name"); setCustomers(data as Customer[] || []); };
  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    const ords = (data as Order[]) || [];
    const cIds = [...new Set(ords.map(o => o.customer_id))];
    if (cIds.length) {
      const { data: cs } = await supabase.from("customers").select("*").in("id", cIds);
      const map = new Map((cs as Customer[])?.map(c => [c.id, c]));
      setOrders(ords.map(o => ({ ...o, customer: map.get(o.customer_id) })));
    } else { setOrders([]); }
  };
  const loadProducts = async () => { const { data } = await supabase.from("products").select("*").eq("is_active", true).order("product_code"); setProducts(data as Product[] || []); };
  const refreshAvailable = async () => {
    const map: Record<string, number> = {};
    for (const p of products) {
      const { count } = await supabase.from("boxes").select("*", { count: "exact", head: true }).eq("product_id", p.id).in("status", ["in_stock", "returned_to_stock"]);
      map[p.id] = count || 0;
    }
    setAvailable(map);
  };
  useEffect(() => { loadCustomers(); loadOrders(); loadProducts(); }, []);
  useEffect(() => { if (products.length) refreshAvailable(); }, [products]);

  const addLine = () => setLines(l => [...l, { product_id: products[0]?.id || "", quantity: 1 }]);
  const updateLine = (i: number, patch: Partial<{ product_id: string; quantity: number }>) => setLines(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));

  const createOrder = async () => {
    if (!customerId && !newName) { notify("error", "Select or add a customer."); return; }
    if (lines.length === 0) { notify("error", "Add at least one line."); return; }
    const { data, error } = await supabase.rpc("create_order", {
      p_customer_id: customerId || null, p_new_customer_name: newName || null,
      p_new_customer_phone: newPhone || null, p_new_customer_address: newAddress || null, p_lines: lines,
    });
    if (error) { notify("error", error.message); return; }
    const r = data as any;
    notify("success", r.short ? `Order created: ${r.order.order_number} — ${strings.sales.short}` : `Order created: ${r.order.order_number}`);
    setTab("orders"); setCustomerId(""); setNewName(""); setNewPhone(""); setNewAddress(""); setLines([]);
    loadOrders(); refreshAvailable();
  };
  
  const addCustomer = async () => {
    if (!cName) { notify("error", "Name required."); return; }
    const { error } = await supabase.from("customers").insert({ name: cName, phone: cPhone, address: cAddress });
    if (error) { notify("error", error.message); return; }
    notify("success", "Customer added."); setCName(""); setCPhone(""); setCAddress(""); loadCustomers();
  };

  const getStatusBadge = (status: string) => {
    if (status === "fulfilled") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "partially_fulfilled") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "ready_to_pick") return "bg-blue-100 text-blue-800 border-blue-200";
    if (status === "short") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-blue-600 w-7 h-7" />
            {strings.sales.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage orders, customers, and create new sales drafts.</p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        {([["orders", strings.sales.orderHistory, FileText], ["newOrder", strings.sales.newOrder, Plus], ["customers", strings.sales.customers, Users]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
            }`}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-slide-down">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="text-left px-6 py-4">{strings.sales.orderNumber}</th>
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">{strings.sales.status}</th>
                  <th className="text-left px-6 py-4">{strings.sales.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No orders found in the system.</td></tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{o.order_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{o.customer?.name || "—"}</div>
                        <div className="text-xs text-slate-400">{o.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(o.status)}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{new Date(o.order_date).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "newOrder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-down">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                Customer Details
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Existing Customer</label>
                  <select 
                    value={customerId} 
                    onChange={e => { setCustomerId(e.target.value); setNewName(""); setNewPhone(""); setNewAddress(""); }} 
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">— Create New Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {!customerId && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Customer Name</label>
                      <div className="relative">
                        <UserPlus size={16} className="absolute left-4 top-3.5 text-slate-400" />
                        <input placeholder="Enter full name" value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-3.5 text-slate-400" />
                        <input placeholder="Phone number" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400" />
                        <input placeholder="Delivery address" value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-blue-500" />
                  Order Items
                </h3>
                <button onClick={addLine} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors">
                  <Plus size={16} /> Add Item
                </button>
              </div>

              <div className="flex-1">
                {lines.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 mb-4">
                      <ShoppingCart size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">No items added to this order yet.</p>
                    <button onClick={addLine} className="mt-4 text-blue-600 font-bold hover:underline">Click to add an item</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lines.map((l, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 group relative">
                        <div className="flex-1 w-full">
                          <select value={l.product_id} onChange={e => updateLine(i, { product_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer">
                            {products.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2">
                            <span className="text-xs text-slate-400 font-bold ml-2 mr-1 uppercase">Qty</span>
                            <input type="number" min={1} value={l.quantity} onChange={e => updateLine(i, { quantity: parseInt(e.target.value) || 1 })} className="w-16 bg-transparent py-2.5 text-sm font-bold text-center focus:outline-none" />
                          </div>
                          <div className="text-xs font-bold bg-white border border-slate-200 px-3 py-2.5 rounded-xl whitespace-nowrap text-slate-600">
                            Available: <span className={available[l.product_id] > 0 ? "text-emerald-600" : "text-rose-600"}>{available[l.product_id] ?? 0}</span>
                          </div>
                          <button onClick={() => removeLine(i)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors sm:absolute sm:-right-2 sm:-top-2 sm:opacity-0 sm:group-hover:opacity-100 sm:bg-white sm:border sm:border-slate-200 sm:shadow-sm">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={createOrder} 
                  disabled={lines.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-[#1460A5] to-[#1e76c7] px-6 py-4 text-base font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {strings.sales.createOrder}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-down">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 sticky top-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-500" />
                Add New Customer
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Name</label>
                  <div className="relative">
                    <Users size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input placeholder="Company or Full Name" value={cName} onChange={e => setCName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input placeholder="Contact number" value={cPhone} onChange={e => setCPhone(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input placeholder="Full address" value={cAddress} onChange={e => setCAddress(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>
                
                <div className="pt-4">
                  <button onClick={addCustomer} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all">
                    Save Customer
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Customer Directory</h3>
                <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{customers.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="text-left px-6 py-4">Name</th>
                      <th className="text-left px-6 py-4">Contact Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-medium">No customers added yet.</td></tr>
                    ) : (
                      customers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-100 shrink-0 uppercase">
                                {c.name.substring(0, 2)}
                              </div>
                              <div className="font-bold text-slate-800">{c.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            <div className="flex flex-col gap-1">
                              {c.phone && <div className="flex items-center gap-1.5 text-xs font-medium"><Phone size={12} className="text-slate-400" />{c.phone}</div>}
                              {c.address && <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><MapPin size={12} className="text-slate-400" />{c.address}</div>}
                            </div>
                            {!c.phone && !c.address && <span className="text-slate-300 italic text-xs">No details</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
