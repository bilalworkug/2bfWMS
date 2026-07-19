import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Product } from "../supabase";
import { ScanField } from "../ScanField";
import { useToast } from "../Toast";
import { strings } from "../strings";
import { useAuth } from "../auth";
import { CheckCircle2, AlertTriangle, Package, Activity, Box } from "lucide-react";
import { playScanSuccess, playScanAlreadyExists, playScanError } from "../audio";

interface ResultBanner { type: "success" | "info" | "error"; message: string; detail?: string; }

export function ProductionScreen() {
  const { profile } = useAuth();
  const notify = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [count, setCount] = useState(0);
  const [banner, setBanner] = useState<ResultBanner | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).order("product_code");
      setProducts(data as Product[] || []);
      if (data && data.length > 0) setProductId(data[0].id);
    })();
  }, []);

  const handleScan = async (code: string) => {
    if (!productId) { notify("error", strings.scan.selectProduct); return; }
    setBanner(null);
    const { data, error } = await supabase.rpc("log_box", { p_code: code, p_product_id: productId });
    if (error) { 
      playScanError();
      setBanner({ type: "error", message: error.message }); 
      notify("error", error.message); 
      return; 
    }
    const r = data as any;
    if (r.exists) {
      playScanAlreadyExists();
      const b = r.box;
      setBanner({ type: "info", message: strings.scan.alreadyLogged, detail: `${b.product_code} — ${b.product_name} • ${strings.status[b.status as keyof typeof strings.status] || b.status}` });
      notify("info", r.message);
    } else {
      playScanSuccess();
      setCount(c => c + 1);
      setBanner({ type: "success", message: strings.scan.newBox, detail: `${r.box.product_code} — ${r.box.product_name}` });
      notify("success", r.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600 w-7 h-7" />
            {strings.production.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{strings.production.pickProduct}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Production Entry Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Box size={20} className="text-slate-400" />
              Configure & Scan
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{strings.scan.selectProduct}</label>
                <select 
                  value={productId} 
                  onChange={e => setProductId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.product_code} — {p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2">
                <ScanField onSubmit={handleScan} />
              </div>
            </div>
          </div>

          {banner && (
            <div className={`animate-slide-down rounded-2xl p-5 border shadow-sm ${
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

        {/* Sidebar Status Area */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1460A5] to-[#124B82] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mt-10 -mr-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 text-blue-100 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm text-xs font-semibold">
                <Activity size={14} />
                Live Session
              </div>
              <h3 className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wider">{strings.production.sessionCount}</h3>
              <div className="text-6xl font-extrabold tracking-tight mb-2">
                {count}
              </div>
              <p className="text-sm text-blue-200">Boxes successfully logged during this shift.</p>
            </div>
            
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/50 border border-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-200">Logged in operator</div>
                <div className="font-bold text-sm truncate">{profile?.full_name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
