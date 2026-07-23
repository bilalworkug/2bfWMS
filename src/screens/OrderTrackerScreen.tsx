import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useToast } from "../Toast";
import { useLanguage } from "../LanguageContext";
import { Search, MapPin, Phone, User, Package, Calendar, Printer, X } from "lucide-react";
import { Logo } from "../Logo";

export function OrderTrackerScreen({ initialQuery = "" }: { initialQuery?: string }) {
  const notify = useToast();
  const { strings } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, [initialQuery]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setOrderData(null);
    try {
      const { data, error } = await supabase.rpc("get_order_details", { p_order_number: query.trim() });
      if (error) {
        notify("error", strings.tracker.notFound);
      } else {
        setOrderData(data);
      }
    } catch (e: any) {
      notify("error", e.message || "Error fetching order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "fulfilled" || status === "dispatched") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "partially_fulfilled") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "ready_to_pick") return "bg-blue-100 text-blue-800 border-blue-200";
    if (status === "short") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="text-blue-600 w-7 h-7" />
            {strings.tracker.title}
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-4 items-center mb-8">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-4 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder={strings.tracker.searchPlaceholder} 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-3.5 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 font-bold shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "..." : strings.tracker.search}
          </button>
        </form>

        {orderData && (
          <div className="animate-slide-down space-y-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 font-mono tracking-tight">{orderData.order.order_number}</h2>
                <div className="text-slate-500 flex items-center gap-2 mt-2">
                  <Calendar size={16} />
                  {new Date(orderData.order.order_date).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowReceipt(true)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Printer size={16} /> View Receipt
                </button>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border ${getStatusBadge(orderData.order.status)}`}>
                  {orderData.order.status.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{strings.tracker.customerInfo}</h3>
                <div className="space-y-3 text-slate-700 font-medium">
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-blue-500" />
                    <span>{orderData.customer?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-emerald-500" />
                    <span>{orderData.customer?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-rose-500" />
                    <span>{orderData.customer?.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{strings.tracker.sellerInfo}</h3>
                <div className="flex items-center gap-3 font-medium text-slate-700">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {orderData.seller?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{orderData.seller?.full_name || "N/A"}</div>
                    <div className="text-sm text-slate-500">@{orderData.seller?.username || "N/A"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={20} className="text-indigo-500" />
                {strings.tracker.orderInfo}
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="text-left px-6 py-4">Product</th>
                      <th className="text-center px-4 py-4 w-24">Qty</th>
                      <th className="text-right px-4 py-4 w-32">{strings.pricing.basePrice}</th>
                      <th className="text-right px-4 py-4 w-32">{strings.pricing.discountAmount}</th>
                      <th className="text-right px-6 py-4 w-32">{strings.pricing.lineTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderData.lines.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{l.product?.name}</div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">{l.product?.product_code}</div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700">
                          {l.quantity_requested}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-slate-500">
                          {(l.unit_price || 0).toFixed(2)} ETB
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-emerald-600">
                          {(l.discount_applied > 0) ? `-${l.discount_applied.toFixed(2)} ETB` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          {(l.line_total || 0).toFixed(2)} ETB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 p-6 flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-slate-500 font-bold mb-1 uppercase tracking-wider">{strings.pricing.totalAmount}</div>
                    <div className="text-3xl font-black text-blue-600">
                      {(orderData.order.total_amount || 0).toFixed(2)} ETB
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {showReceipt && orderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in print:bg-white print:p-0 print:absolute print:inset-0 print:z-50 print:block">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
            {/* Header / Actions (Hidden in print) */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 print:hidden bg-slate-50">
              <h2 className="font-bold text-slate-800">Order Receipt</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                  <Printer size={20} />
                </button>
                <button onClick={() => setShowReceipt(false)} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Content */}
            <div className="p-8 overflow-y-auto print:overflow-visible print:p-4 bg-white" id="printable-receipt">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <Logo size={64} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">2BF WAREHOUSE</h1>
                <p className="text-sm text-slate-500 mt-1">100 Industrial Way, Warehouse District</p>
                <p className="text-sm text-slate-500">Tel: +251 911 234 567</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Order #</span>
                  <span className="font-bold text-slate-900">{orderData.order.order_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Date</span>
                  <span className="font-medium text-slate-900">{new Date(orderData.order.order_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Customer</span>
                  <span className="font-medium text-slate-900">{orderData.customer?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Cashier</span>
                  <span className="font-medium text-slate-900">{orderData.seller?.full_name}</span>
                </div>
              </div>

              <div className="mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left font-bold text-slate-700 pb-2">Item</th>
                      <th className="text-center font-bold text-slate-700 pb-2">Qty</th>
                      <th className="text-right font-bold text-slate-700 pb-2">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-slate-200">
                    {orderData.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td className="py-3">
                          <div className="font-bold text-slate-900">{l.product?.name}</div>
                          {l.discount_applied > 0 && <div className="text-xs text-emerald-600">Discount: -{l.discount_applied.toFixed(2)} ETB</div>}
                        </td>
                        <td className="text-center font-medium py-3 text-slate-700">{l.quantity_requested}</td>
                        <td className="text-right font-bold py-3 text-slate-900">{(l.line_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-800 pt-4 mb-8">
                <div className="flex justify-between items-center text-xl">
                  <span className="font-black text-slate-900">TOTAL</span>
                  <span className="font-black text-slate-900">{(orderData.order.total_amount || 0).toFixed(2)} ETB</span>
                </div>
              </div>

              <div className="text-center text-sm font-medium text-slate-500">
                <p>Thank you for your business!</p>
                <p className="mt-1">Please retain this receipt for your records.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
