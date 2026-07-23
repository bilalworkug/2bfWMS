import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Product } from "../supabase";
import { useLanguage } from "../LanguageContext";
import { BarChart3, Download, Boxes, TrendingUp, Filter, FileSpreadsheet, PieChart, Info, PackageOpen, Truck, AlertTriangle, Layers } from "lucide-react";

interface Row { product_id: string; product_code: string; name: string; status: string; count: number; }

export function ReportsScreen() {
  const [reportType, setReportType] = useState<"inventory" | "sales" | "lifecycle">("inventory");
  const { strings } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: prods } = await supabase.from("products").select("*").order("product_code");
    const products = (prods as Product[]) || [];
    const { data } = await supabase.from("boxes").select("product_id, status");
    const boxes = (data as { product_id: string; status: string }[]) || [];
    const byProduct: Record<string, Record<string, number>> = {};
    const byStatus: Record<string, number> = {};
    boxes.forEach(b => {
      byProduct[b.product_id] ??= {};
      byProduct[b.product_id][b.status] = (byProduct[b.product_id][b.status] || 0) + 1;
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    });
    const flat: Row[] = [];
    products.forEach(p => {
      const counts = byProduct[p.id] || {};
      Object.keys(counts).forEach(status => flat.push({ product_id: p.id, product_code: p.product_code, name: p.name, status, count: counts[status] }));
    });
    setRows(flat); setTotals(byStatus);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const header = "Product Code,Product Name,Status,Count\n";
    const body = rows.map(r => `${r.product_code},${r.name},${r.status},${r.count}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "2bfc_inventory_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    if (status.includes("stock")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status.includes("dispatch")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (status.includes("damage") || status.includes("hold")) return "bg-rose-100 text-rose-800 border-rose-200";
    if (status.includes("expired")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-blue-600 w-7 h-7" />
            {strings.reports.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive inventory overview and analytics data.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-[#1460A5] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0D4D87] transition-colors shadow-sm">
          <FileSpreadsheet size={16} /> {strings.reports.exportExcel}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: strings.reports.totalBoxes, value: Object.values(totals).reduce((a, b) => a + b, 0), color: "bg-gradient-to-br from-slate-700 to-slate-900", text: "text-white", icon: Layers },
          { label: strings.reports.inStock, value: (totals.in_stock || 0) + (totals.returned_to_stock || 0), color: "bg-gradient-to-br from-emerald-500 to-emerald-700", text: "text-white", icon: PackageOpen },
          { label: strings.reports.dispatched, value: (totals.dispatched_sale || 0) + (totals.dispatched_non_sale || 0), color: "bg-gradient-to-br from-blue-500 to-blue-700", text: "text-white", icon: Truck },
          { label: strings.reports.expired, value: totals.expired || 0, color: "bg-gradient-to-br from-amber-500 to-orange-600", text: "text-white", icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className={`rounded-3xl p-6 ${s.color} ${s.text} relative overflow-hidden shadow-sm`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mt-10 -mr-10"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-xs font-bold opacity-80 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-4xl font-extrabold">{s.value.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <s.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Boxes size={20} className="text-blue-500" />
                {strings.reports.inventoryByProduct}
              </h3>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Filter size={18} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-hide">
              <table className="w-full text-sm relative">
                <thead className="bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-6 py-4">Product Info</th>
                    <th className="text-left px-6 py-4">Current Status</th>
                    <th className="text-right px-6 py-4">Total Boxes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">Generating report data...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">No inventory data available.</td></tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{r.name}</div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">{r.product_code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(r.status)}`}>
                            {strings.status[r.status as keyof typeof strings.status] || r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-1.5 font-bold text-slate-700 shadow-sm">
                            {r.count.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
             <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <PieChart size={20} className="text-purple-500" />
               Report Summary
             </h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-sm font-medium text-slate-600">Total Unique SKUs</span>
                 <span className="font-bold text-slate-900 text-lg">{new Set(rows.map(r => r.product_id)).size}</span>
               </div>
               <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-sm font-medium text-slate-600">Total Status Groups</span>
                 <span className="font-bold text-slate-900 text-lg">{Object.keys(totals).length}</span>
               </div>
               
               <div className="pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm text-blue-900">
                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <p>
                      Non-sale dispatches (gift/promotion/personal use) are tracked for traceability but excluded from sales totals. Use the <strong className="font-bold">Checker</strong> module to trace any individual box's full history.
                    </p>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
