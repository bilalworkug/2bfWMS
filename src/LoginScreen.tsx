import { useEffect, useState } from "react";
import { LogIn, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { useAuth } from "./auth";
import { useLanguage } from "./LanguageContext";
import type { UserRole } from "./supabase";
import { Logo } from "./Logo";

interface DemoAccount { username: string; full_name: string; role: UserRole; }

export function LoginScreen() {
  const { signIn } = useAuth();
  const { strings, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState<string>("");
  const [demoLoading, setDemoLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const loadDefaultLocalProfiles = () => {
        const defaultProfiles = [
          { id: "u-admin", username: "admin", full_name: "Super Admin", role: "super_admin", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-prod", username: "prod", full_name: "Production Operator", role: "production", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-receiving", username: "receiving", full_name: "Receiving Clerk", role: "warehouse_receiving", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-withdrawal", username: "withdrawal", full_name: "Withdrawal Clerk", role: "warehouse_withdrawal", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-sales", username: "sales", full_name: "Sales Representative", role: "sales", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-stock", username: "stock", full_name: "Stock Manager", role: "stock_manager", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-qa", username: "qa", full_name: "QA Officer", role: "qa_officer", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "u-reports", username: "reports", full_name: "Report Viewer", role: "report_viewer", is_active: true, is_banned: false, failed_login_count: 0, lockout_until: null, two_factor_enabled: false, must_change_password: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        if (!localStorage.getItem("mock_profiles")) {
          localStorage.setItem("mock_profiles", JSON.stringify(defaultProfiles));
        }
        const mockProfiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
        setDemoAccounts(mockProfiles.map((p: any) => ({ username: p.username, full_name: p.full_name, role: p.role })));
        setDemoPassword("password123");
      };

      if (!import.meta.env.VITE_SUPABASE_URL) {
        loadDefaultLocalProfiles();
        setDemoLoading(false);
        return;
      }

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-accounts`;
        const resp = await fetch(url, { method: "GET" });
        const data = await resp.json();
        if (data?.accounts) {
          setDemoAccounts(data.accounts);
          setDemoPassword(data.password || "");
        } else {
          loadDefaultLocalProfiles();
        }
      } catch {
        loadDefaultLocalProfiles();
      } finally {
        setDemoLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent, uname?: string, pwd?: string) => {
    const u = (uname ?? username).trim();
    const p = pwd ?? password;
    if (!u || !p) return;
    setError(null);
    setLoading(true);
    setBusyUser(uname || null);
    const result = await signIn(u, p, totp || undefined);
    setLoading(false);
    setBusyUser(null);
    if (result.requires2fa) { setRequires2fa(true); setError(strings.auth.twoFactorRequired); return; }
    if (result.error) { setError(result.error); return; }
  };

  const quickLogin = (acc: DemoAccount) => {
    setUsername(acc.username);
    setPassword(demoPassword);
    setError(null);
    setRequires2fa(false);
    handleSubmit({ preventDefault() {} } as React.FormEvent, acc.username, demoPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <button 
          onClick={() => setLanguage(language === "en" ? "am" : "en")}
          className="text-sm font-semibold text-slate-500 hover:text-blue-600 bg-white shadow-sm border border-slate-200 px-4 py-2 rounded-full transition-all hover:shadow"
        >
          {language === "en" ? "አማርኛ" : "English"}
        </button>
      </div>
      <div className="w-full max-w-md mx-auto">

        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-4">
            <Logo size={72} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{strings.app.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{strings.app.tagline}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{strings.auth.username}</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{strings.auth.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            {requires2fa && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <ShieldCheck size={14} /> {strings.auth.twoFactorCode}
                </label>
                <input type="text" value={totp} onChange={e => setTotp(e.target.value)} maxLength={6} inputMode="numeric" pattern="\d{6}"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="000000" />
              </div>
            )}
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {loading && !busyUser ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? strings.auth.signingIn : strings.auth.signIn}
            </button>
          </form>

          {/* Quick Login Divider + Grid */}
          {(demoLoading || demoAccounts.length > 0) && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400 flex items-center gap-1">
                    <Zap size={11} className="text-amber-500" /> Quick Login
                  </span>
                </div>
              </div>

              {demoLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 justify-center py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading accounts...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {demoAccounts.map(acc => {
                    const isSuper = acc.role === "super_admin";
                    const busy = busyUser === acc.username;
                    return (
                      <button key={acc.username} type="button" onClick={() => quickLogin(acc)} disabled={loading}
                        className={`text-left rounded-lg px-3 py-2 border transition disabled:opacity-60 ${isSuper ? "bg-amber-50 border-amber-200 hover:bg-amber-100" : "bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200"}`}>
                        <div className="flex items-center gap-1 min-w-0">
                          {isSuper && <ShieldCheck size={11} className="text-amber-500 shrink-0" />}
                          {busy && <Loader2 size={11} className="animate-spin text-blue-500 shrink-0" />}
                          <span className="text-xs font-semibold text-slate-800 truncate">{strings.roles[acc.role]}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{acc.username}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">Two Brothers Food Complex — Box-level traceability</p>
      </div>
    </div>
  );
}
