import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { username, password, totp_code } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Incorrect username or password." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("id, username, role, is_active, is_banned, lockout_until, two_factor_enabled")
      .eq("username", username).maybeSingle();
    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Incorrect username or password." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.is_banned) {
      return new Response(JSON.stringify({ error: "This account has been locked. Contact your Super Admin to unlock it." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!profile.is_active) {
      return new Response(JSON.stringify({ error: "This account is inactive. Contact your administrator." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.lockout_until && new Date(profile.lockout_until) > new Date()) {
      await supabase.rpc("record_login_failure", { p_user_id: profile.id });
      return new Response(JSON.stringify({ error: "Too many failed attempts. Try again in 15 minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: profile.id + "@2bfc.internal", password,
    });
    if (signInError || !signInData.session) {
      await supabase.rpc("record_login_failure", { p_user_id: profile.id });
      return new Response(JSON.stringify({ error: "Incorrect username or password." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.role === "super_admin" && profile.two_factor_enabled) {
      if (!totp_code) {
        return new Response(JSON.stringify({ error: "Two-factor authentication code required.", requires_2fa: true }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^\d{6}$/.test(totp_code)) {
        return new Response(JSON.stringify({ error: "Invalid two-factor code." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    await supabase.rpc("reset_failed_on_success", { p_user_id: profile.id });
    return new Response(JSON.stringify({
      session: signInData.session,
      user: { id: profile.id, username: profile.username, role: profile.role },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
