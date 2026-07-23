import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { DamageReport, Product, Box } from "../supabase";
import { useToast } from "../Toast";
import { useLanguage } from "../LanguageContext";
import { ClipboardCheck, Check, X, RotateCcw, Trash2, Package, ListChecks, Settings2, AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";

export function StockScreen() {
  const notify = useToast();
  const { strings } = useLanguage();
  const [tab, setTab] = useState<"queue" | "products">("queue");
  const [reports, setReports] = useState<(DamageReport & { box?: Box; product?: Product })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});

  const loadReports = async () => {
    const { data } = await supabase.from("damage_reports").select("*").eq("status", "pending_approval").order("created_at");
    const reps = (data as DamageReport[]) || [];
    const boxIds = [...new Set(reps.map(r => r.box_id))];
    let boxMap = new Map<string, Box>();
    if (boxIds.length) { const { data: boxes } = await supabase.from("boxes").select("*").in("id", boxIds); (boxes as Box[])?.forEach(b => boxMap.set(b.id, b)); }
    const prodIds = [...new Set([...boxMap.values()].map(b => b.product_id))];
    let prodMap = new Map<string, Product>();
    if (prodIds.length) { const { data: prods } = await supabase.from("products").select("*").in("id", prodIds); (prods as Product[])?.forEach(p => prodMap.set(p.id, p)); }
    setReports(reps.map(r => { const rr = r as any; return { ...rr, box: boxMap.get(rr.box_id), product: rr.box ? prodMap.get(rr.box.product_id) : undefined }; }));
  };
  const loadProducts = async () => { const { data } = await supabase.from("products").select("*").order("product_code"); setProducts(data as Product[] || []); };
  useEffect(() => { loadReports(); loadProducts(); }, []);

  const decide = async (reportId: string, decision: "writeoff" | "return_to_stock" | "reject") => {
    const { data, error } = await supabase.rpc("decide_damage", { p_report_id: reportId, p_decision: decision, p_note: note[reportId] || "" });
    if (error) { notify("error", error.message); return; }
    notify("success", (data as any).message);
    setNote(n => ({ ...n, [reportId]: "" }));
    loadReports();
  };
  
  const updateProduct = async (p: Product) => {
    const { error } = await supabase.from("products").update({ reorder_point: p.reorder_point, shelf_life_days: p.shelf_life_days, is_active: p.is_active }).eq("id", p.id);
    if (error) { notify("error", error.message); return; }
    notify("success", `${p.product_code} updated successfully.`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="text-indigo-600 w-7 h-7" />
            {strings.stock.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage warehouse inventory parameters and resolve damaged items.</p>
        </div>
        <button 
          onClick={() => { loadReports(); loadProducts(); }} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        {([["queue", strings.stock.damageQueue, ShieldAlert], ["products", strings.stock.productMaster, Settings2]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
            }`}>
            <Icon size={16} />
            {label}
            {t === "queue" && reports.length > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-down">
          <div className="lg:col-span-2 space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl h-[400px] flex flex-col items-center justify-center text-center p-8 shadow-sm">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 shadow-sm text-emerald-500">
                  <Check size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">All Clear!</h3>
                <p className="text-sm text-slate-500 max-w-sm">There are no pending damage reports requiring your attention right now.</p>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-lg font-bold text-slate-900">{r.box?.code}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">Pending</span>
                        </div>
                        <div className="text-sm font-medium text-slate-700">{r.product?.product_code} — {r.product?.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                          <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-slate-600">Source: <span className="font-bold capitalize">{r.source.replace(/_/g, " ")}</span></span>
                          <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {r.reason && (
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 relative z-10 text-sm text-amber-900 flex gap-3 items-start">
                      <ListChecks size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Report Reason:</span>
                        {r.reason}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 relative z-10 space-y-4">
                    <input 
                      type="text" 
                      value={note[r.id] || ""} 
                      onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))} 
                      placeholder={strings.stock.decisionNote + " (Optional)"} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                    />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => decide(r.id, "writeoff")} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600 transition-colors shadow-sm">
                        <Trash2 size={16} /> Write-off
                      </button>
                      <button onClick={() => decide(r.id, "return_to_stock")} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm">
                        <RotateCcw size={16} /> Return to Stock
                      </button>
                      <button onClick={() => decide(r.id, "reject")} className="sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                        <X size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="lg:col-span-1">
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg sticky top-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mt-10 -mr-10 pointer-events-none"></div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-400" />
                  Decision Guide
                </h3>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex gap-3 items-start">
                    <Trash2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white block">Write-off</strong>Use when product is physically damaged beyond recovery. Removes item from inventory.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <RotateCcw size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white block">Return to Stock</strong>Use when inspection shows item is fine. Restores to active stock.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <X size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white block">Reject Report</strong>Use when report is invalid. Status goes back to previous state.</span>
                  </li>
                </ul>
             </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-slide-down">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Product Master Configuration</h3>
              <p className="text-xs text-slate-500 mt-1">Set reorder points and shelf life limits for automated alerts.</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold">{products.length} Products</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="text-left px-6 py-4">Product Details</th>
                  <th className="text-center px-4 py-4 w-24">{strings.pricing.basePrice}</th>
                  <th className="text-center px-4 py-4 w-24">{strings.pricing.bulkQty}</th>
                  <th className="text-center px-4 py-4 w-24">{strings.pricing.discountPct}</th>
                  <th className="text-center px-6 py-4 w-28">Reorder Point</th>
                  <th className="text-center px-6 py-4 w-32">Shelf Life (Days)</th>
                  <th className="text-center px-6 py-4 w-24">Status</th>
                  <th className="text-right px-6 py-4 w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">{p.product_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        value={p.price ?? ""} 
                        onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} 
                        className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mx-auto block" 
                        placeholder="$0.00"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        value={p.discount_threshold ?? ""} 
                        onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, discount_threshold: e.target.value ? parseInt(e.target.value) : null } : x))} 
                        className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mx-auto block" 
                        placeholder="--"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        value={p.discount_percentage ?? ""} 
                        onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, discount_percentage: e.target.value ? parseInt(e.target.value) : null } : x))} 
                        className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mx-auto block" 
                        placeholder="%"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        value={p.reorder_point ?? ""} 
                        onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, reorder_point: e.target.value ? parseInt(e.target.value) : null } : x))} 
                        className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mx-auto block" 
                        placeholder="--"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        value={p.shelf_life_days ?? ""} 
                        onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, shelf_life_days: e.target.value ? parseInt(e.target.value) : null } : x))} 
                        className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mx-auto block" 
                        placeholder="--"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                       <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={p.is_active} onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_active: e.target.checked } : x))} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => updateProduct(p)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100 hover:border-indigo-600">
                        <Check size={16} /> Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
