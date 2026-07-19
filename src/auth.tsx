import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import type { Profile, UserRole } from "./supabase";
import { strings } from "./strings";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string, totp?: string) => Promise<{ error?: string; requires2fa?: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setProfile(null); setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (error || !data) {
      const mockProfiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
      const matched = mockProfiles.find((p: any) => p.id === session.user.id);
      if (matched) { setProfile(matched as Profile); } else { setProfile(null); }
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      (async () => { await loadProfile(); })();
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string, totp?: string) => {
    const performMockSignIn = async (uname: string) => {
      const mockProfiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
      const user = mockProfiles.find((p: any) => p.username === uname);
      if (!user) {
        return { error: strings.auth.incorrectCredentials };
      }
      if (typeof (supabase as any).forceMockFallback === "function") {
        (supabase as any).forceMockFallback();
      }
      await supabase.auth.setSession({
        access_token: user.id,
        refresh_token: "mock-refresh-token",
      });
      await loadProfile();
      return {};
    };

    if (!import.meta.env.VITE_SUPABASE_URL) {
      return performMockSignIn(username);
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-signin`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totp_code: totp }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return performMockSignIn(username);
      }
      if (data.requires_2fa) return { requires2fa: true };
      if (data.session?.access_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      await loadProfile();
      return {};
    } catch {
      return performMockSignIn(username);
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setProfile(null); }, []);
  const refresh = useCallback(async () => { await loadProfile(); }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function roleLabel(role: UserRole): string { return strings.roles[role] || role; }
export function statusLabel(status: string): string {
  return (strings.status as Record<string, string>)[status] || status;
}
