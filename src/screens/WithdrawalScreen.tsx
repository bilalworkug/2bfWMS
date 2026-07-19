import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Order, OrderLine, Product } from "../supabase";
import { ScanField } from "../ScanField";
import { useToast } from "../Toast";
import { strings } from "../strings";
import { CheckCircle2, AlertTriangle, Truck, Gift, Package, ShoppingCart, Info, ListChecks, Scan } from "lucide-react";
import { playScanSuccess, playScanAlreadyExists, playScanError } from "../audio";

type Tab = "fulfill" | "nonsale";

export function WithdrawalScreen() {
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("fulfill");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lines, setLines] = useState<(OrderLine & { product?: Product })[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "info" | "error"; message: string; detail?: string } | null>(null);
  const [nsCategory, setNsCategory] = useState<"gift" | "promotion" | "personal_use">("gift");
  const [nsReason, setNsReason] = useState("");

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").in("status", ["ready_to_pick", "partially_fulfilled", "short"]).order("created_at", { ascending: true });
    setOrders(data as Order[] || []);
  };
  useEffect(() => { loadOrders(); }, []);

  const selectOrder = async (o: Order) => {
    setSelectedOrder(o);
    const { data: lineData } = await supabase.from("order_lines").select("*").eq("order_id", o.id);
    const ls = (lineData as OrderLine[]) || [];
    const { data: prods } = await supabase.from("products").select("*");
    const prodMap = new Map((prods as Product[])?.map(p => [p.id, p]));
    setLines(ls.map(l => ({ ...l, product: prodMap.get(l.product_id) })));
    setSelectedLine(ls[0]?.id || "");
    setBanner(null);
  };

  useEffect(() => {
    if (!selectedLine) { setSuggestions([]); return; }
    const line = lines.find(l => l.id === selectedLine);
    if (!line) return;
    (async () => {
      const { data } = await supabase.rpc("suggest_boxes_for_withdrawal", { p_product_id: line.product_id, p_quantity: line.quantity_requested - line.quantity_fulfilled });
      setSuggestions((data as any)?.suggestions || []);
    })();
  }, [selectedLine, lines]);

  const handleFulfillScan = async (code: string) => {
    if (!selectedOrder || !selectedLine) { notify("error", strings.withdrawal.selectOrder); return; }
    setBanner(null);
    const { data, error } = await supabase.rpc("fulfill_order_line", {
      p_order_id: selectedOrder.id, p_order_line_id: selectedLine, p_code: code,
      p_override_reason: overrideMode ? overrideReason : null,
    });
    if (error) { playScanError(); setBanner({ type: "error", message: error.message }); notify("error", error.message); return; }
    const r = data as any;
    if (r.needs_override) { playScanAlreadyExists(); setBanner({ type: "info", message: strings.scan.overrideNeeded, detail: r.message }); setOverrideMode(true); return; }
    if (!r.ok) { playScanAlreadyExists(); setBanner({ type: "info", message: r.message }); notify("info", r.message); return; }
    playScanSuccess();
    setBanner({ type: "success", message: r.message }); notify("success", r.message);
    setOverrideMode(false); setOverrideReason("");
    await selectOrder(selectedOrder); await loadOrders();
  };

  const handleNonSaleScan = async (code: string) => {
    setBanner(null);
    const { data, error } = await supabase.rpc("dispatch_non_sale", { p_code: code, p_category: nsCategory, p_reason: nsReason });
    if (error) { playScanError(); setBanner({ type: "error", message: error.message }); notify("error", error.message); return; }
    const r = data as any;
    if (r.ok) { playScanSuccess(); setBanner({ type: "success", message: r.message }); notify("success", r.message); setNsReason(""); }
    else { playScanAlreadyExists(); setBanner({ type: "info", message: r.message }); notify("info", r.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="text-blue-600 w-7 h-7" />
            {strings.withdrawal.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pick and dispatch items for sales orders or non-sale reasons.</p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        {([["fulfill", strings.withdrawal.orderPicker, ShoppingCart], ["nonsale", strings.withdrawal.nonSaleDispatch, Gift]] as const).map(([t, label, Icon]) => (
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

      {tab === "fulfill" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
                <ListChecks size={20} className="text-blue-500" />
                Select Order
              </h3>
              <select 
                value={selectedOrder?.id || ""} 
                onChange={e => { const o = orders.find(x => x.id === e.target.value); if (o) selectOrder(o); }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer relative z-10"
              >
                <option value="">— Choose an order to fulfill —</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} ({strings.status[o.status as keyof typeof strings.status] || o.status})</option>)}
              </select>

              {selectedOrder && (
                <div className="mt-6 pt-6 border-t border-slate-100 relative z-10">
                  <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Order Items</h4>
                  <div className="space-y-2">
                    {lines.map(l => (
                      <button key={l.id} onClick={() => setSelectedLine(l.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                          selectedLine === l.id 
                            ? "bg-blue-600 text-white shadow-md" 
                            : "bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700"
                        }`}>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm truncate">{l.product?.product_code}</span>
                          <span className={`text-xs truncate ${selectedLine === l.id ? "text-blue-200" : "text-slate-500"}`}>{l.product?.name}</span>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          selectedLine === l.id ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
                        }`}>
                          {l.quantity_fulfilled} / {l.quantity_requested}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedOrder ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-300">
                  <ListChecks size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Order Selected</h3>
                <p className="text-sm text-slate-500 max-w-sm">Please select an active order from the list on the left to begin the fulfillment process.</p>
              </div>
            ) : selectedLine ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                      <Scan size={24} className="text-blue-500" />
                      Scan Items
                    </h3>
                    <p className="text-sm text-slate-500">Scan barcodes to fulfill the selected item.</p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100 flex items-center gap-2">
                    <Info size={16} />
                    Suggested Picking
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                  <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">{strings.withdrawal.suggested} Boxes</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.length === 0 && <span className="text-sm font-medium text-slate-400">{strings.common.none}</span>}
                    {suggestions.map(s => (
                      <span key={s.id} className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-bold text-emerald-700 font-mono shadow-sm">
                        {s.code} {s.expiry_date && <span className="text-emerald-500 font-medium ml-1">exp: {s.expiry_date}</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {!overrideMode ? (
                  <div className="mt-4">
                    <ScanField onSubmit={handleFulfillScan} placeholder={strings.withdrawal.scanBox} />
                  </div>
                ) : (
                  <div className="animate-slide-down space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-6">
                    <div className="flex items-center gap-2 text-lg font-bold text-amber-900">
                      <AlertTriangle size={20} className="text-amber-500" />
                      {strings.scan.overrideNeeded}
                    </div>
                    <div>
                      <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder={strings.scan.overrideReason} className="w-full rounded-xl border border-amber-300 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all" />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <ScanField onSubmit={handleFulfillScan} placeholder={strings.withdrawal.scanBox} showCamera={false} />
                      </div>
                      <button onClick={() => { setOverrideMode(false); setOverrideReason(""); }} className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        {strings.scan.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === "nonsale" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-3xl">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Gift size={20} className="text-purple-500" />
            Non-Sale Dispatch
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">{strings.withdrawal.category}</label>
              <div className="flex flex-wrap gap-3">
                {(["gift", "promotion", "personal_use"] as const).map(c => (
                  <button key={c} onClick={() => setNsCategory(c)}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all shadow-sm ${nsCategory === c ? "bg-purple-600 text-white border-transparent" : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:bg-purple-50"}`}>
                    {c === "gift" && <Gift size={16} />}
                    {c === "promotion" && <Package size={16} />}
                    {c === "personal_use" && <Package size={16} />}
                    {c === "personal_use" ? strings.withdrawal.personalUse : strings.withdrawal[c as "gift" | "promotion"]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{strings.withdrawal.reason}</label>
              <input type="text" value={nsReason} onChange={e => setNsReason(e.target.value)} placeholder="Provide a brief explanation" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
            </div>
            <div className="pt-2">
              <ScanField onSubmit={handleNonSaleScan} />
            </div>
          </div>
        </div>
      )}

      {banner && (
        <div className={`fixed bottom-6 right-6 max-w-md animate-slide-down rounded-2xl p-5 border shadow-xl z-50 ${
          banner.type === "success" ? "bg-emerald-50 border-emerald-200" : 
          banner.type === "info" ? "bg-amber-50 border-amber-200" : 
          "bg-rose-50 border-rose-200"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-xl shrink-0 ${
              banner.type === "success" ? "bg-emerald-100 text-emerald-600" : 
              banner.type === "info" ? "bg-amber-100 text-amber-600" : 
              "bg-rose-100 text-rose-600"
            }`}>
              {banner.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div className="pt-0.5">
              <p className={`text-base font-bold ${
                banner.type === "success" ? "text-emerald-900" : 
                banner.type === "info" ? "text-amber-900" : 
                "text-rose-900"
              }`}>{banner.message}</p>
              {banner.detail && (
                <p className={`text-sm mt-1 font-medium ${
                  banner.type === "success" ? "text-emerald-700" : 
                  banner.type === "info" ? "text-amber-700" : 
                  "text-rose-700"
                }`}>{banner.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
