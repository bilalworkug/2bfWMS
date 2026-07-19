import { useState } from "react";
import { supabase } from "../supabase";
import { ScanField } from "../ScanField";
import { strings } from "../strings";
import { Search, Package, Clock, Activity, MapPin, Box, QrCode } from "lucide-react";
import { playScanSuccess, playScanAlreadyExists, playScanError } from "../audio";

interface BoxInfo { id: string; code: string; status: string; product_code: string; product_name: string; logged_at: string | null; received_at: string | null; expiry_date: string | null; }
interface HistoryItem { action: string; at: string; by_user: string | null; detail: string | null; }
interface Result { found: boolean; box?: BoxInfo; history?: HistoryItem[]; message: string; }

export function CheckerScreen() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (code: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_box_history", { p_code: code });
    setLoading(false);
    if (error) { playScanError(); setResult({ found: false, message: error.message }); return; }
    const res = data as Result;
    if (res.found) {
      playScanSuccess();
    } else {
      playScanAlreadyExists();
    }
    setResult(res);
  };

  const fmtDate = (s: string | null) => { if (!s) return strings.common.notApplicable; return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="text-blue-600 w-7 h-7" />
            {strings.checker.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Scan a box code to view its complete audit trail and status.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <QrCode size={20} className="text-slate-400" />
          Scan Barcode
        </h3>
        <ScanField onSubmit={handleScan} />
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 w-fit px-4 py-2 rounded-xl border border-blue-100">
            <Activity size={16} className="animate-spin" />
            Fetching record details...
          </div>
        )}
      </div>

      {result && !result.found && (
        <div className="animate-slide-down bg-rose-50 border border-rose-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-rose-500 ring-1 ring-rose-200">
            <Package size={32} />
          </div>
          <h3 className="text-lg font-bold text-rose-900 mb-1">Box Not Found</h3>
          <p className="text-sm text-rose-600 max-w-sm">{result.message}</p>
        </div>
      )}

      {result && result.found && result.box && (
        <div className="animate-slide-down space-y-6">
          <div className="bg-gradient-to-br from-[#1460A5] to-[#124B82] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-20 -mr-20 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <Box size={24} className="text-blue-50" />
                  </div>
                  <h2 className="font-mono text-3xl font-extrabold tracking-tight">{result.box.code}</h2>
                </div>
                <p className="text-blue-200 font-medium flex items-center gap-2">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono">{result.box.product_code}</span>
                  {result.box.product_name}
                </p>
              </div>
              <div className="bg-white text-[#1460A5] px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-sm">
                {strings.status[result.box.status as keyof typeof strings.status] || result.box.status}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
              <div>
                <div className="text-xs text-blue-200 font-semibold mb-1 uppercase tracking-wider">{strings.checker.loggedAt}</div>
                <div className="font-medium text-sm">{fmtDate(result.box.logged_at)}</div>
              </div>
              <div>
                <div className="text-xs text-blue-200 font-semibold mb-1 uppercase tracking-wider">{strings.checker.receivedAt}</div>
                <div className="font-medium text-sm">{fmtDate(result.box.received_at)}</div>
              </div>
              <div>
                <div className="text-xs text-blue-200 font-semibold mb-1 uppercase tracking-wider">{strings.checker.expiry}</div>
                <div className="font-medium text-sm">{result.box.expiry_date || strings.common.notApplicable}</div>
              </div>
            </div>
          </div>

          {result.history && result.history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl"><Clock size={20} /></div>
                Audit Trail History
              </h3>
              
              <div className="relative before:absolute before:inset-0 before:ml-[17px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent space-y-8 pl-1">
                {result.history.map((h, i) => (
                  <div key={i} className="relative flex items-start gap-5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white border border-slate-200 shadow-sm z-10 text-slate-400">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100 mt-1">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                        <span className="font-bold text-slate-800 text-sm capitalize">{h.action.replace(/_/g, " ")}</span>
                        <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-widest">{fmtDate(h.at)}</span>
                      </div>
                      {h.detail && (
                        <p className="text-sm text-slate-600 mt-2 bg-white p-3 rounded-xl border border-slate-100">{h.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
