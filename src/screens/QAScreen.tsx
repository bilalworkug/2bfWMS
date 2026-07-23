import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { QualityHold, Box, Product } from "../supabase";
import { ScanField } from "../ScanField";
import { useToast } from "../Toast";
import { useLanguage } from "../LanguageContext";
import { ShieldAlert, Lock, Unlock, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";
import { playScanSuccess, playScanError } from "../audio";

export function QAScreen() {
  const notify = useToast();
  const { strings } = useLanguage();
  const [tab, setTab] = useState<"place" | "active">("place");
  const [reason, setReason] = useState("");
  const [holds, setHolds] = useState<(QualityHold & { box?: Box; product?: Product })[]>([]);

  const loadHolds = async () => {
    const { data } = await supabase.from("quality_holds").select("*").eq("status", "active").order("created_at");
    const hs = (data as QualityHold[]) || [];
    const boxIds = [...new Set(hs.map(h => h.box_id))];
    let boxMap = new Map<string, Box>();
    if (boxIds.length) { const { data: boxes } = await supabase.from("boxes").select("*").in("id", boxIds); (boxes as Box[])?.forEach(b => boxMap.set(b.id, b)); }
    const prodIds = [...new Set([...boxMap.values()].map(b => b.product_id))];
    let prodMap = new Map<string, Product>();
    if (prodIds.length) { const { data: prods } = await supabase.from("products").select("*").in("id", prodIds); (prods as Product[])?.forEach(p => prodMap.set(p.id, p)); }
    setHolds(hs.map(h => { const hh = h as any; return { ...hh, box: boxMap.get(hh.box_id), product: hh.box ? prodMap.get(hh.box.product_id) : undefined }; }));
  };
  useEffect(() => { loadHolds(); }, []);

  const placeHold = async (code: string) => {
    if (!reason) { notify("error", strings.qa.reason); return; }
    const { data, error } = await supabase.rpc("place_quality_hold", { p_code: code, p_reason: reason });
    if (error) { playScanError(); notify("error", error.message); return; }
    playScanSuccess();
    notify("success", (data as any).message); setReason(""); loadHolds();
  };
  
  const release = async (holdId: string) => {
    const { data, error } = await supabase.rpc("release_quality_hold", { p_hold_id: holdId });
    if (error) { notify("error", error.message); return; }
    notify("success", (data as any).message); loadHolds();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-rose-600 w-7 h-7" />
            {strings.qa.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track quality holds for inventory items.</p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        {([["place", strings.qa.placeHold, AlertTriangle], ["active", strings.qa.activeHolds, Lock]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t 
                ? "bg-white text-rose-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
            }`}>
            <Icon size={16} />
            {label}
            {t === "active" && holds.length > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{holds.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "place" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 animate-slide-down">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-6 flex gap-4 items-start">
            <AlertOctagon size={24} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-900 mb-1">Place a Quality Hold</h3>
              <p className="text-sm text-rose-700">Scanning a box will immediately lock it from being dispatched or returned to stock until a QA officer releases the hold.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{strings.qa.reason}</label>
              <input 
                type="text" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                placeholder="Enter detailed reason for the quality hold..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" 
              />
            </div>
            <div className="pt-2">
              <ScanField onSubmit={placeHold} />
            </div>
          </div>
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-4 animate-slide-down">
          {holds.length === 0 ? (
             <div className="bg-white border border-slate-200 rounded-3xl h-[400px] flex flex-col items-center justify-center text-center p-8 shadow-sm">
               <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 shadow-sm text-emerald-500">
                 <CheckCircle2 size={40} />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">No Active Holds</h3>
               <p className="text-sm text-slate-500 max-w-sm">There are currently no items under quality hold in the warehouse.</p>
             </div>
          ) : (
            holds.map(h => (
              <div key={h.id} className="bg-white rounded-2xl border-l-4 border-l-amber-500 border-y border-y-slate-200 border-r border-r-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <Lock size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold text-slate-900">{h.box?.code}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Locked</span>
                    </div>
                    <div className="text-sm font-medium text-slate-700">{h.product?.product_code} — {h.product?.name}</div>
                    <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-800">Reason:</span> {h.reason}
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0">
                  <button onClick={() => release(h.id)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm">
                    <Unlock size={16} /> {strings.qa.release}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
