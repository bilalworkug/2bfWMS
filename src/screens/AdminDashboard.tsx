import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Profile, UserRole } from "../supabase";
import { useToast } from "../Toast";
import { strings } from "../strings";
import {
  LayoutDashboard,
  UserPlus,
  Unlock,
  Boxes,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Users,
  Search,
  UserCheck,
  UserX,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  FileText,
  Settings,
  MoreVertical,
  Activity,
} from "lucide-react";

type Tab = "overview" | "users";

export function AdminDashboard({ role }: { role: UserRole }) {
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("production");
  const [newPassword, setNewPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const isSuperAdmin = role === "super_admin";
  const dept = isSuperAdmin ? null : departmentOf(role);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    let all = (data as Profile[]) || [];
    if (dept) all = all.filter(u => departmentOf(u.role) === dept);
    setUsers(all);
  };

  const loadStats = async () => {
    const { count: totalBoxes } = await supabase.from("boxes").select("*", { count: "exact", head: true });
    const { count: inStock } = await supabase.from("boxes").select("*", { count: "exact", head: true }).in("status", ["in_stock", "returned_to_stock"]);
    const { count: dispatched } = await supabase.from("boxes").select("*", { count: "exact", head: true }).in("status", ["dispatched_sale", "dispatched_non_sale"]);
    const { count: damaged } = await supabase.from("boxes").select("*", { count: "exact", head: true }).eq("status", "damaged_pending");
    setStats({ totalBoxes: totalBoxes || 0, inStock: inStock || 0, dispatched: dispatched || 0, damaged: damaged || 0 });
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const toggleActive = async (u: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) { notify("error", error.message); return; }
    notify("success", `${u.username} ${u.is_active ? "deactivated" : "activated"}.`);
    loadUsers();
  };

  const unlockUser = async (u: Profile) => {
    const { data, error } = await supabase.rpc("unlock_account", { p_user_id: u.id });
    if (error) { notify("error", error.message); return; }
    notify("success", (data as any).message);
    loadUsers();
  };

  const getRoleBadgeStyle = (userRole: UserRole) => {
    const d = departmentOf(userRole);
    if (userRole === "super_admin") return "bg-purple-100 text-purple-800 border border-purple-200";
    if (d === "production") return "bg-blue-100 text-blue-800 border border-blue-200";
    if (d === "warehouse") return "bg-amber-100 text-amber-800 border border-amber-200";
    if (d === "sales") return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (d === "stock") return "bg-indigo-100 text-indigo-800 border border-indigo-200";
    if (d === "qa") return "bg-rose-100 text-rose-800 border border-rose-200";
    return "bg-slate-100 text-slate-800 border border-slate-200";
  };

  const getInitials = (fullName: string) => {
    return fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your warehouse operations overview here</p>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab("overview")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === "overview"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === "users"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Manage Users
          </button>
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Hero Stats Card (Inspiration Match) */}
          <div className="bg-[#1460A5] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mt-20 -mr-20 pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 mb-8">
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {strings.roles[role]}</h2>
                <p className="text-blue-100 text-sm mt-1">Here's your platform performance overview</p>
              </div>
              <div className="bg-white/10 rounded-full px-4 py-1.5 text-xs font-medium text-blue-50 border border-white/20 backdrop-blur-sm flex items-center gap-2">
                <Activity size={14} />
                Live Operations
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
              {[
                { label: "Today's Scans", value: "142", trend: "+12%", icon: Box },
                { label: "Active Users", value: users.filter(u => u.is_active).length.toString(), trend: "+8%", icon: Users },
                { label: "Dispatched", value: stats.dispatched || 0, trend: "+18%", icon: Truck },
                { label: "Damaged Items", value: stats.damaged || 0, trend: "-2%", icon: AlertTriangle, invertTrend: true },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white/10">
                      <s.icon size={16} className="text-blue-100" />
                    </div>
                    <span className="text-sm font-medium text-blue-100">{s.label}</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold">{s.value}</span>
                    <span className={`text-xs mb-1 font-medium flex items-center gap-0.5 ${
                      s.trend.startsWith("+") 
                        ? (s.invertTrend ? "text-rose-300" : "text-emerald-300")
                        : (s.invertTrend ? "text-emerald-300" : "text-rose-300")
                    }`}>
                      {s.trend.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {s.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Total Tracked Items", value: stats.totalBoxes || 0, color: "bg-blue-600", progress: "75%", icon: Boxes, trend: "+12.5%" },
              { label: "Items In Stock", value: stats.inStock || 0, color: "bg-emerald-500", progress: "62%", icon: CheckCircle2, trend: "+8.2%" },
              { label: "Total Dispatched", value: stats.dispatched || 0, color: "bg-amber-500", progress: "85%", icon: Truck, trend: "+15.3%" },
              { label: "Damaged Pending", value: stats.damaged || 0, color: "bg-purple-500", progress: "90%", icon: AlertTriangle, trend: "-5.1%" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                    <s.icon size={20} />
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                    s.trend.startsWith("+") ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                  }`}>
                    {s.trend.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {s.trend}
                  </div>
                </div>
                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-slate-900">{s.value.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-semibold w-12">Progress</div>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: s.progress }}></div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 w-6 text-right">{s.progress}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Lower Content Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Actions (Left Column) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
              <p className="text-sm text-slate-500 -mt-3 mb-4">Frequently used admin tasks</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => setTab("users")} className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-[#1A6EB8] to-[#124B82] text-white shadow-sm hover:shadow-md transition-all text-left">
                  <div className="p-3 bg-white/20 rounded-xl"><UserPlus size={24} /></div>
                  <div>
                    <div className="font-bold">Add Profile</div>
                    <div className="text-xs text-blue-100 mt-0.5">Register new staff</div>
                  </div>
                </button>
                <button className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm hover:shadow-md transition-all text-left">
                  <div className="p-3 bg-white/20 rounded-xl"><CheckCircle2 size={24} /></div>
                  <div>
                    <div className="font-bold">Approve Actions</div>
                    <div className="text-xs text-emerald-100 mt-0.5">Review pending</div>
                  </div>
                </button>
                <button className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm hover:shadow-md transition-all text-left">
                  <div className="p-3 bg-white/20 rounded-xl"><FileText size={24} /></div>
                  <div>
                    <div className="font-bold">View Reports</div>
                    <div className="text-xs text-orange-100 mt-0.5">Analytics data</div>
                  </div>
                </button>
                <button className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-sm hover:shadow-md transition-all text-left">
                  <div className="p-3 bg-white/20 rounded-xl"><Settings size={24} /></div>
                  <div>
                    <div className="font-bold">Settings</div>
                    <div className="text-xs text-purple-100 mt-0.5">Configure system</div>
                  </div>
                </button>
              </div>

              {/* Pending Actions Footer */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-amber-200 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">12</div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3"><Users size={20} /></div>
                    <h4 className="font-bold text-slate-800 mb-1">User Verifications</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">New accounts awaiting approval</p>
                    <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">Review Now</button>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">8</div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><Box size={20} /></div>
                    <h4 className="font-bold text-slate-800 mb-1">Hold Approvals</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">Pending quality hold reviews</p>
                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">Review Now</button>
                  </div>
                  <div className="bg-white border border-rose-200 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">5</div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3"><AlertTriangle size={20} /></div>
                    <h4 className="font-bold text-slate-800 mb-1">Reported Issues</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">Urgent disputes and damages</p>
                    <button className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors">View Issues</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity (Right Column) */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Live Activity</h3>
                    <p className="text-xs text-slate-500">Real-time updates</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </div>
                </div>

                <div className="flex-1 space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {[
                    { u: "admin", text: "placed a quality hold on Box B-102", time: "2 minutes ago", color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { u: "prod_worker", text: "logged a new box production", time: "15 minutes ago", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                    { u: "qa_officer", text: "released hold on Box B-099", time: "32 minutes ago", color: "text-purple-600 bg-purple-50 border-purple-200" },
                    { u: "sales_rep", text: "dispatched order #10042", time: "1 hour ago", color: "text-amber-600 bg-amber-50 border-amber-200" },
                  ].map((log, i) => (
                    <div key={i} className="relative flex items-start justify-between gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${log.color} shadow-sm z-10`}>
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-600 leading-snug">
                          <span className="font-bold text-slate-900">@{log.u}</span> {log.text}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-2.5 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors">
                  View All Activities
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {tab === "users" && isSuperAdmin && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setShowAdd(s => !s)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1460A5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D4D87] transition shadow-sm"
            >
              <UserPlus size={16} />
              Add Product / User
            </button>
          </div>

          {/* Add User Form Card */}
          {showAdd && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md space-y-6 animate-slide-down">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserPlus size={20} /></div>
                  Create New Profile
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><MoreVertical size={20}/></button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Username</label>
                  <input
                    placeholder="e.g. john_doe"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    placeholder="e.g. John Doe"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">System Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none"
                  >
                    {(Object.keys(strings.roles) as UserRole[]).map(r => (
                      <option key={r} value={r}>{strings.roles[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Initial Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed border border-blue-100 flex gap-3 items-start">
                <AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-900 block mb-1">Password requirements:</span> 
                  Minimum 10 characters, at least one uppercase letter, one lowercase letter, and one number.
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    if (!newUsername || !newFullName || !newPassword) { notify("error", "All fields are required."); return; }
                    if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { notify("error", "Password does not meet validation requirements."); return; }
                    const email = `${newUsername}@2bfc.internal`.toLowerCase();
                    const { data, error } = await supabase.auth.admin.createUser({ email, password: newPassword, email_confirm: true });
                    if (error || !data.user) { notify("error", error?.message || "Could not create user."); return; }
                    const { error: pErr } = await supabase.rpc("create_profile_for_new_user", { p_user_id: data.user.id, p_username: newUsername, p_full_name: newFullName, p_role: newRole });
                    if (pErr) { notify("error", pErr.message); return; }
                    notify("success", `User ${newUsername} successfully created.`);
                    setShowAdd(false); setNewUsername(""); setNewFullName(""); setNewPassword(""); loadUsers();
                  }}
                  className="rounded-xl bg-[#1460A5] hover:bg-[#0D4D87] px-6 py-3 text-sm font-bold text-white shadow-md transition-all w-full sm:w-auto"
                >
                  Create User Account
                </button>
              </div>
            </div>
          )}

          {/* Users Table Card */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="text-left px-6 py-4">User</th>
                    <th className="text-left px-6 py-4">System Username</th>
                    <th className="text-left px-6 py-4">System Role</th>
                    <th className="text-left px-6 py-4">Account Status</th>
                    <th className="text-right px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                        No user profiles match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1460A5] flex items-center justify-center font-bold text-xs ring-1 ring-blue-100 shrink-0">
                              {getInitials(u.full_name)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{u.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                          @{u.username}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(u.role)}`}>
                            {strings.roles[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.is_banned ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                              Locked
                            </span>
                          ) : !u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.is_banned && (
                              <button onClick={() => unlockUser(u)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors tooltip-trigger" title="Unlock Account">
                                <Unlock size={16} />
                              </button>
                            )}
                            <button onClick={() => toggleActive(u)} className={`p-2 rounded-lg border transition-colors ${u.is_active ? "text-slate-400 border-transparent hover:bg-rose-50 hover:text-rose-600" : "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`} title={u.is_active ? "Deactivate User" : "Activate User"}>
                              {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
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
      )}
    </div>
  );
}

function departmentOf(role: UserRole): string | null {
  if (role.startsWith("production")) return "production";
  if (role.startsWith("warehouse")) return "warehouse";
  if (role.startsWith("sales")) return "sales";
  if (role.startsWith("stock_manager")) return "stock";
  if (role.startsWith("qa")) return "qa";
  return null;
}
