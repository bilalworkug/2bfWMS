import { useState } from "react";
import { supabase } from "../supabase";
import { ScanField } from "../ScanField";
import { useToast } from "../Toast";
import { useLanguage } from "../LanguageContext";
import { CheckCircle2, AlertTriangle, PackageCheck, QrCode, Activity } from "lucide-react";
import { playScanSuccess, playScanAlreadyExists, playScanError } from "../audio";
interface Banner { type: "success" | "info" | "error"; message: string; detail?: string; }

export function ReceivingScreen() {
  const notify = useToast();
  const { strings } = useLanguage();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [count, setCount] = useState(0);

  const handleScan = async (code: string) => {
    setBanner(null);
    const { data, error } = await supabase.rpc("confirm_receipt", { p_code: code });
    if (error) { playScanError(); setBanner({ type: "error", message: error.message }); notify("error", error.message); return; }
    const r = data as any;
    if (r.ok) {
      playScanSuccess();
      setCount(c => c + 1);
      setBanner({ type: "success", message: strings.scan.receiptConfirmed, detail: r.message });
      notify("success", r.message);
    } else { 
      playScanAlreadyExists();
      setBanner({ type: "info", message: r.message }); 
      notify("info", r.message); 
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="text-emerald-600 w-7 h-7" />
            {strings.receiving.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{strings.receiving.scanToConfirm}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Entry Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <QrCode size={20} className="text-slate-400" />
              Scan Inbound Boxes
            </h3>
            
            <div className="pt-2">
              <ScanField onSubmit={handleScan} />
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

        {/* Sidebar Stats Area */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mt-10 -mr-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 text-emerald-100 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm text-xs font-semibold">
                <Activity size={14} />
                Receiving Shift
              </div>
              <h3 className="text-emerald-100 text-sm font-medium mb-1 uppercase tracking-wider">Confirmed to Stock</h3>
              <div className="text-6xl font-extrabold tracking-tight mb-2">
                {count}
              </div>
              <p className="text-sm text-emerald-200">Boxes successfully received into warehouse inventory.</p>
            </div>
            
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
              <p className="text-xs text-emerald-200 font-medium">
                Ensure physical inspection of items before confirming receipt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
