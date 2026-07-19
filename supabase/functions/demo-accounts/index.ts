import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_PASSWORD = "Demo1234pass";

interface DemoAccount { username: string; full_name: string; role: string; }

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "super1", full_name: "Super Admin One", role: "super_admin" },
  { username: "super2", full_name: "Super Admin Two", role: "super_admin" },
  { username: "prodadmin", full_name: "Production Admin", role: "production_admin" },
  { username: "prodworker", full_name: "Production Worker", role: "production" },
  { username: "whadmin", full_name: "Warehouse Admin", role: "warehouse_admin" },
  { username: "whreceiving", full_name: "Warehouse Receiving", role: "warehouse_receiving" },
  { username: "whwithdrawal", full_name: "Warehouse Withdrawal", role: "warehouse_withdrawal" },
  { username: "salesadmin", full_name: "Sales Admin", role: "sales_admin" },
  { username: "salesrep", full_name: "Sales Rep", role: "sales" },
  { username: "stockadmin", full_name: "Stock Manager Admin", role: "stock_manager_admin" },
  { username: "stockmgr", full_name: "Stock Manager", role: "stock_manager" },
  { username: "qaadmin", full_name: "QA Admin", role: "qa_admin" },
  { username: "qaofficer", full_name: "QA Officer", role: "qa_officer" },
  { username: "reportviewer", full_name: "Report Viewer", role: "report_viewer" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } });
    for (const acc of DEMO_ACCOUNTS) {
      const { data: existing } = await supabase.from("profiles").select("id").eq("username", acc.username).maybeSingle();
      if (existing?.id) continue;
      const email = `${acc.username}@2bfc.internal`;
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email, password: DEMO_PASSWORD, email_confirm: true,
      });
      if (createErr || !created.user) continue;
      await supabase.rpc("create_profile_for_new_user", {
        p_user_id: created.user.id, p_username: acc.username, p_full_name: acc.full_name, p_role: acc.role,
      });
    }
    return new Response(JSON.stringify({ accounts: DEMO_ACCOUNTS, password: DEMO_PASSWORD }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
