"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck, Users, Lock, Key, AlertTriangle, History,
  RefreshCw, X, CheckCircle2, XCircle, AlertCircle, Info,
  Shield, Eye, LogOut, Search, Filter, ChevronDown,
  Clock, Activity, Server, Layers, Database, Building2, User,
  Check, Copy
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

// ─── TYPE DEFINITIONS ──────────────────────────────────────────────────────────
interface SecurityDashboard {
  security_score: number;
  active_sessions: number;
  active_users: number;
  total_users: number;
  locked_accounts: number;
  must_change_password: number;
  first_login_pending: number;
  mfa_enabled: number;
  mfa_adoption_pct: number;
  failed_logins_today: number;
  users_with_failures: number;
  password_resets_total: number;
  password_changes_total: number;
  settings: Record<string, string>;
}

interface SessionEntry {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  hospital: string;
  department: string;
  login_time: string;
  last_activity: string;
  session_duration: string;
  browser: string;
  ip_address: string;
  status: string;
}

interface LoginEvent {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  email: string;
  role: string;
  hospital: string;
  ip_address: string;
  browser: string;
  user_agent: string;
  details: string;
  result: string;
}

interface SecurityAlert {
  id: string;
  severity: string;
  type: string;
  user: string;
  email: string;
  hospital: string;
  description: string;
  timestamp: string;
  status: string;
}

interface ComplianceCheck {
  check: string;
  status: string;
  detail: string;
  source: string;
}

interface ComplianceSummary {
  compliant: number;
  warnings: number;
  non_compliant: number;
  total: number;
}

interface ComplianceData {
  checks: ComplianceCheck[];
  summary: ComplianceSummary;
}

interface AccessEvent {
  id: string;
  timestamp: string;
  action: string;
  performed_by: string;
  ip_address: string;
  details: string;
}

interface HospitalItem {
  id: string;
  name: string;
  code: string;
  user_count: number;
  departments_count: number;
  city: string;
  state: string;
  status: string;
}

interface ManagedUser {
  id: string;
  full_name: string;
  username: string;
  employee_id: string;
  email: string;
  role: string;
  department_id?: string;
  department_name?: string;
  hospital_id?: string;
  hospital_name?: string;
  hospital_code?: string;
  status: string;
  account_locked: boolean;
  is_active: boolean;
  last_login?: string;
  must_change_password?: boolean;
  mfa_enabled?: boolean;
}

// ─── ACTIVE TAB TYPE ──────────────────────────────────────────────────────────
type Tab = "overview" | "users_mgmt" | "sessions" | "activity" | "alerts" | "compliance" | "access" | "audit";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: "bg-rose-100 text-rose-800 border-rose-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    Info: "bg-blue-100 text-blue-800 border-blue-200",
    Low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${map[severity] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Compliant: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    "Non-Compliant": "bg-rose-50 text-rose-700 border-rose-200",
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 border-slate-200",
    Suspended: "bg-amber-50 text-amber-700 border-amber-200",
    Locked: "bg-rose-50 text-rose-700 border-rose-200",
    "Logged Out": "bg-slate-50 text-slate-600 border-slate-200",
    Success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Failed: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${map[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
      <Shield className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-bold text-slate-400">{message}</p>
      <p className="text-[11px] text-slate-400 font-medium">No records found in PostgreSQL database.</p>
    </div>
  );
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === "Compliant") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "Warning") return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-rose-500" />;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loginActivity, setLoginActivity] = useState<LoginEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<LoginEvent[]>([]);

  // User Account Management State
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("all");
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [mgmtRoleFilter, setMgmtRoleFilter] = useState<string>("all");
  const [mgmtStatusFilter, setMgmtStatusFilter] = useState<string>("all");

  // Reset Password Dialog State
  const [resetPassModal, setResetPassModal] = useState<{
    isOpen: boolean;
    user: ManagedUser | null;
    newPass: string;
    confirmPass: string;
    mustChange: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    newPass: "",
    confirmPass: "",
    mustChange: true,
    error: null,
  });

  // View User Profile Drawer State
  const [viewUserModal, setViewUserModal] = useState<{
    isOpen: boolean;
    user: ManagedUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [forceLogoutTarget, setForceLogoutTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchManagedUsers = (hId: string = selectedHospitalId) => {
    api.get(`/api/v1/admin/hospitals/${hId}/users`)
      .then(res => {
        const uList = res.data?.users ?? res.data ?? [];
        setManagedUsers(Array.isArray(uList) ? uList : []);
      })
      .catch(err => {
        console.warn("Transient issue loading hospital users:", err?.message || err);
      });
  };

  const fetchAll = () => {
    setIsLoading(true);
    Promise.all([
      api.get("/api/v1/admin/security/dashboard").catch(() => ({ data: null })),
      api.get("/api/v1/admin/security/sessions").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/security/login-activity?limit=50").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/security/alerts").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/security/compliance").catch(() => ({ data: null })),
      api.get("/api/v1/admin/security/access-control?limit=30").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/security/login-activity?limit=100").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/hospitals").catch(() => ({ data: [] })),
    ])
      .then(([dash, sess, login, alrt, comp, access, audit, hosp]) => {
        if (dash?.data) setDashboard(dash.data);
        if (sess?.data) setSessions(sess.data);
        if (login?.data) setLoginActivity(login.data);
        if (alrt?.data) setAlerts(alrt.data);
        if (comp?.data) setCompliance(comp.data);
        if (access?.data) setAccessEvents(access.data);
        if (audit?.data) setAuditEvents(audit.data);
        const hospList = hosp?.data ?? [];
        if (Array.isArray(hospList) && hospList.length > 0) {
          setHospitals(hospList);
        }
        fetchManagedUsers(selectedHospitalId);
      })
      .catch(err => {
        console.warn("Security Center fetch error:", err?.message || err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    fetchManagedUsers(selectedHospitalId);
  }, [selectedHospitalId]);

  // User Actions
  const handleLockAccount = (user: ManagedUser) => {
    api.put(`/api/v1/admin/users/${user.id}/lock`)
      .then(res => {
        setToast({ msg: `Account for ${user.email} has been locked in PostgreSQL.`, type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to lock account.", type: "error" }));
  };

  const handleUnlockAccount = (user: ManagedUser) => {
    api.put(`/api/v1/admin/users/${user.id}/unlock`)
      .then(res => {
        setToast({ msg: `Account for ${user.email} has been unlocked in PostgreSQL.`, type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to unlock account.", type: "error" }));
  };

  const handleActivateAccount = (user: ManagedUser) => {
    api.put(`/api/v1/admin/users/${user.id}/activate`)
      .then(res => {
        setToast({ msg: `Account for ${user.email} has been activated.`, type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to activate account.", type: "error" }));
  };

  const handleDeactivateAccount = (user: ManagedUser) => {
    api.put(`/api/v1/admin/users/${user.id}/deactivate`)
      .then(res => {
        setToast({ msg: `Account for ${user.email} has been deactivated.`, type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to deactivate account.", type: "error" }));
  };

  const handleForceLogoutUser = (user: ManagedUser) => {
    api.delete(`/api/v1/admin/users/${user.id}/sessions`)
      .then(res => {
        setToast({ msg: `Active sessions for ${user.email} have been revoked.`, type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to revoke user sessions.", type: "error" }));
  };

  // Submit Reset Password Dialog
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal.user) return;

    if (resetPassModal.newPass.length < 8) {
      setResetPassModal(prev => ({ ...prev, error: "Password must be at least 8 characters long." }));
      return;
    }
    if (resetPassModal.newPass !== resetPassModal.confirmPass) {
      setResetPassModal(prev => ({ ...prev, error: "Passwords do not match." }));
      return;
    }

    api.put(`/api/v1/admin/users/${resetPassModal.user.id}/reset-password`, {
      new_password: resetPassModal.newPass,
      must_change_password: resetPassModal.mustChange,
    })
      .then(res => {
        setToast({ msg: `Password for ${resetPassModal.user?.email} updated and re-hashed in PostgreSQL. Sessions invalidated.`, type: "success" });
        setResetPassModal({ isOpen: false, user: null, newPass: "", confirmPass: "", mustChange: true, error: null });
        fetchAll();
      })
      .catch(err => {
        setResetPassModal(prev => ({ ...prev, error: err?.response?.data?.detail ?? "Failed to reset user password." }));
      });
  };

  // Force logout action
  const handleForceLogout = (userId: string) => {
    api.post(`/api/v1/admin/security/force-logout/${userId}`)
      .then(res => {
        setToast({ msg: res.data?.detail ?? "Session revoked.", type: "success" });
        fetchAll();
      })
      .catch(() => setToast({ msg: "Failed to revoke session.", type: "error" }))
      .finally(() => setForceLogoutTarget(null));
  };

  // Filtered sessions/events by search query
  const filteredSessions = useMemo(() =>
    sessions.filter(s =>
      !searchQuery ||
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ip_address.includes(searchQuery)
    ), [sessions, searchQuery]);

  const filteredActivity = useMemo(() =>
    loginActivity.filter(e =>
      !searchQuery ||
      e.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.ip_address.includes(searchQuery)
    ), [loginActivity, searchQuery]);

  const filteredAlerts = useMemo(() =>
    alerts.filter(a =>
      !searchQuery ||
      a.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [alerts, searchQuery]);

  const filteredManagedUsers = useMemo(() =>
    managedUsers.filter(u => {
      const matchesSearch = !searchQuery ||
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employee_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = mgmtRoleFilter === "all" || u.role.toLowerCase() === mgmtRoleFilter.toLowerCase();
      const matchesStatus = mgmtStatusFilter === "all" || u.status.toLowerCase() === mgmtStatusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    }), [managedUsers, searchQuery, mgmtRoleFilter, mgmtStatusFilter]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "users_mgmt", label: "User Account Management", icon: Users },
    { id: "sessions", label: "Active Sessions", icon: Key },
    { id: "activity", label: "Login Activity", icon: Activity },
    { id: "alerts", label: "Security Alerts", icon: AlertTriangle },
    { id: "compliance", label: "Compliance", icon: CheckCircle2 },
    { id: "access", label: "Access Control", icon: Lock },
    { id: "audit", label: "Audit Trail", icon: History },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      {toast && (
        <div className={`p-4 border text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs transition-all ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2.5">
            {toast.type === "success"
              ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              : <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)}>
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Enterprise Security Operations Center
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Security Center & Access Defense</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            JWT session verification, authentication events, password policies, and access control — powered by PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <GlassButton
            onClick={fetchAll}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </GlassButton>
        </div>
      </div>

      {/* TAB NAVIGATION + SEARCH */}
      <GlassCard className="p-3 bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-xs border border-indigo-100 font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-3 w-3 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  {tab.id === "alerts" && alerts.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                      {alerts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users, sessions, alerts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </GlassCard>

      {/* ─── TAB: OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Cards — 8 total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Security Score */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Security Score</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-emerald-600 block">
                {dashboard?.security_score ?? "—"}<span className="text-lg text-slate-400">/100</span>
              </span>
              <p className="text-[11px] font-medium text-slate-500">Computed from real security conditions</p>
            </GlassCard>

            {/* Active Sessions */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Sessions</span>
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-indigo-600 block">
                {dashboard?.active_sessions ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">Users with recorded login sessions</p>
            </GlassCard>

            {/* Failed Logins Today */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Failed Logins Today</span>
                <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
              </div>
              <span className={`text-3xl font-black block ${(dashboard?.failed_logins_today ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {dashboard?.failed_logins_today ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">FAILED_LOGIN events in AuditLog today</p>
            </GlassCard>

            {/* Locked Accounts */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Locked Accounts</span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <span className={`text-3xl font-black block ${(dashboard?.locked_accounts ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {dashboard?.locked_accounts ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">Users with account_locked = true</p>
            </GlassCard>

            {/* Must Change Password */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password Change Required</span>
                <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <Key className="h-4 w-4 text-sky-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-sky-600 block">
                {dashboard?.must_change_password ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">must_change_password = true</p>
            </GlassCard>

            {/* First Login Pending */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Login Pending</span>
                <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-purple-600 block">
                {dashboard?.first_login_pending ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">is_first_login = true</p>
            </GlassCard>

            {/* MFA Enabled */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MFA Enabled Users</span>
                <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-teal-600 block">
                {dashboard?.mfa_enabled ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">{dashboard?.mfa_adoption_pct ?? 0}% of all users</p>
            </GlassCard>

            {/* Total Users */}
            <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 shadow-xs hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Registered Users</span>
                <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Users className="h-4 w-4 text-slate-600" />
                </div>
              </div>
              <span className="text-3xl font-black text-slate-900 block">
                {dashboard?.total_users ?? "—"}
              </span>
              <p className="text-[11px] font-medium text-slate-500">{dashboard?.active_users ?? 0} active accounts</p>
            </GlassCard>
          </div>

          {/* PASSWORD POLICY SUMMARY */}
          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Password & Account Policy Status</h2>
                <p className="text-[11px] font-medium text-slate-500">Aggregated from PostgreSQL users table</p>
              </div>
              <Key className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: "Password Resets (Total)", value: dashboard?.password_resets_total ?? 0, color: "text-indigo-600" },
                { label: "Password Changes (Total)", value: dashboard?.password_changes_total ?? 0, color: "text-emerald-600" },
                { label: "Users with Login Failures", value: dashboard?.users_with_failures ?? 0, color: "text-rose-600" },
                { label: "MFA Adoption", value: `${dashboard?.mfa_adoption_pct ?? 0}%`, color: "text-teal-600" },
              ].map(item => (
                <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">{item.label}</span>
                  <span className={`text-xl font-black block ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── TAB: USER ACCOUNT MANAGEMENT (CENTRALIZED MULTI-HOSPITAL ADMIN) ──── */}
      {activeTab === "users_mgmt" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Hospital Selector Bar */}
          <GlassCard className="p-5 bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>Centralized Hospital Selector</span>
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Select a hospital facility to load and administer its dedicated PostgreSQL user accounts
                </p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black">
                {hospitals.length} Facilities Connected
              </span>
            </div>

            {/* Hospital Selection Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* All Hospitals Button */}
              <button
                type="button"
                onClick={() => setSelectedHospitalId("all")}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer select-none ${
                  selectedHospitalId === "all"
                    ? "bg-indigo-900 text-white border-indigo-900 shadow-md"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wider">All Hospitals</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    selectedHospitalId === "all" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {hospitals.reduce((acc, h: any) => acc + (h.user_count ?? h.users_count ?? 0), 0)} Users
                  </span>
                </div>
                <p className={`text-[11px] font-medium ${selectedHospitalId === "all" ? "text-indigo-200" : "text-slate-500"}`}>
                  System-Wide Enterprise Directory
                </p>
              </button>

              {/* Individual Hospitals */}
              {hospitals.map((h: any) => {
                const isSelected = selectedHospitalId === h.id || selectedHospitalId === h.code;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHospitalId(h.id)}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-indigo-900 text-white border-indigo-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black truncate max-w-[140px]">{h.name}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? "bg-indigo-700 text-indigo-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}>
                        {h.code || "HOSP"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold mt-2">
                      <span className={isSelected ? "text-indigo-200" : "text-slate-500"}>
                        {h.city}, {h.state}
                      </span>
                      <span className={`font-black px-2 py-0.5 rounded-md ${
                        isSelected ? "bg-indigo-800 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {h.user_count ?? h.users_count ?? 0} Users
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* User Directory Table & Action Controls */}
          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Hospital User Directory</h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Managing accounts for <span className="font-extrabold text-slate-800">
                    {selectedHospitalId === "all" ? "All Hospitals" : hospitals.find(h => h.id === selectedHospitalId)?.name || selectedHospitalId}
                  </span>
                </p>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Role Filter */}
                <select
                  value={mgmtRoleFilter}
                  onChange={(e) => setMgmtRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="all">All Roles</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="auditor">Auditor</option>
                </select>

                {/* Status Filter */}
                <select
                  value={mgmtStatusFilter}
                  onChange={(e) => setMgmtStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="locked">Locked</option>
                </select>

                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black">
                  {filteredManagedUsers.length} Users
                </span>
              </div>
            </div>

            {/* User Table */}
            {filteredManagedUsers.length === 0 ? (
              <EmptyState message="No Users Match Selected Criteria" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-3">Profile & User</th>
                      <th className="py-3 px-3">Read-Only Email</th>
                      <th className="py-3 px-3">Facility & Dept</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Account Status</th>
                      <th className="py-3 px-3">Last Login</th>
                      <th className="py-3 px-3">Password Status</th>
                      <th className="py-3 px-3 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredManagedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition">
                        {/* Profile initials & Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                              {u.full_name ? u.full_name.substring(0, 2).toUpperCase() : "US"}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block">{u.full_name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-500">@{u.username || "user"}</span>
                                <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                  {u.employee_id || "EMP"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Read Only Email */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 block">{u.email}</span>
                            <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" /> Read-Only
                            </span>
                          </div>
                        </td>

                        {/* Hospital & Department */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{u.hospital_name || "St. Jude Hospital"}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{u.department_name || "General Medical"}</span>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-3">
                          <span className="uppercase text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block">
                            {u.role}
                          </span>
                        </td>

                        {/* Account Status */}
                        <td className="py-3 px-3">
                          <StatusBadge status={u.account_locked ? "Locked" : u.status} />
                        </td>

                        {/* Last Login */}
                        <td className="py-3 px-3 text-slate-500 font-medium text-[11px]">
                          {u.last_login ? new Date(u.last_login).toLocaleString() : "Never Logged In"}
                        </td>

                        {/* Password Status (Masked) */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                            ********
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Profile */}
                            <button
                              onClick={() => setViewUserModal({ isOpen: true, user: u })}
                              title="View Full User Profile"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => setResetPassModal({ isOpen: true, user: u, newPass: "", confirmPass: "", mustChange: true, error: null })}
                              title="Reset Password (Super Admin Only)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Key className="h-4 w-4" />
                            </button>

                            {/* Lock / Unlock Toggle */}
                            {u.account_locked || u.status === "Locked" ? (
                              <button
                                onClick={() => handleUnlockAccount(u)}
                                title="Unlock Account"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLockAccount(u)}
                                title="Lock Account"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            )}

                            {/* Activate / Deactivate Toggle */}
                            {u.status.toLowerCase() === "active" ? (
                              <button
                                onClick={() => handleDeactivateAccount(u)}
                                title="Deactivate Account"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateAccount(u)}
                                title="Activate Account"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Force Logout */}
                            <button
                              onClick={() => handleForceLogoutUser(u)}
                              title="Force Logout (Revoke Sessions)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <LogOut className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ─── TAB: ACTIVE SESSIONS ──────────────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Active Login Sessions</h2>
              <p className="text-[11px] font-medium text-slate-500">Users with recorded last_login from PostgreSQL</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black">
              {filteredSessions.length} sessions
            </span>
          </div>

          {filteredSessions.length === 0 ? (
            <EmptyState message="No Active Sessions" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["User", "Role", "Hospital", "Login Time", "Duration", "IP Address", "Browser", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSessions.map(s => (
                    <tr key={s.user_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[120px]">{s.full_name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium truncate max-w-[120px]">{s.hospital}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">{s.login_time}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-bold whitespace-nowrap">{s.session_duration}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[10px]">{s.ip_address}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium truncate max-w-[100px]">{s.browser}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                      <td className="py-2.5 px-3">
                        {s.status === "Active" && (
                          <button
                            onClick={() => setForceLogoutTarget(s.user_id)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-100 transition-colors"
                          >
                            <LogOut className="h-2.5 w-2.5" />
                            Force Logout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── TAB: LOGIN ACTIVITY ───────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Login & Authentication Activity</h2>
              <p className="text-[11px] font-medium text-slate-500">Auth events from PostgreSQL AuditLog table</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black">
              {filteredActivity.length} events
            </span>
          </div>

          {filteredActivity.length === 0 ? (
            <EmptyState message="No Authentication Events" />
          ) : (
            <div className="space-y-2">
              {filteredActivity.map(event => (
                <div key={event.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.result} />
                      <span className="font-black text-slate-800 uppercase text-[10px] tracking-wide">{event.action}</span>
                    </div>
                    <span className="text-slate-400 text-[10px] font-medium">{event.timestamp}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-medium pt-0.5">
                    <span><span className="font-bold text-slate-700">User:</span> {event.user}</span>
                    <span><span className="font-bold text-slate-700">Hospital:</span> {event.hospital}</span>
                    <span><span className="font-bold text-slate-700">IP:</span> {event.ip_address}</span>
                    <span><span className="font-bold text-slate-700">Browser:</span> {event.browser}</span>
                  </div>
                  {event.details && event.details !== "—" && (
                    <p className="text-[10px] text-slate-500 pt-0.5 italic">{event.details}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── TAB: SECURITY ALERTS ──────────────────────────────────────────────── */}
      {activeTab === "alerts" && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Security Alerts</h2>
              <p className="text-[11px] font-medium text-slate-500">Derived from real PostgreSQL user conditions — zero fabricated alerts</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-indigo-600" />
          </div>

          {filteredAlerts.length === 0 ? (
            <EmptyState message="No Active Security Alerts" />
          ) : (
            <div className="space-y-2.5">
              {filteredAlerts.map(alert => (
                <div key={alert.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={alert.severity} />
                      <span className="font-black text-slate-900">{alert.type}</span>
                      <StatusBadge status={alert.status} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{alert.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">{alert.description}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-medium">
                    <span><span className="font-bold text-slate-700">User:</span> {alert.user}</span>
                    <span><span className="font-bold text-slate-700">Email:</span> {alert.email}</span>
                    <span><span className="font-bold text-slate-700">Hospital:</span> {alert.hospital}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── TAB: COMPLIANCE ───────────────────────────────────────────────────── */}
      {activeTab === "compliance" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {compliance && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Compliant", value: compliance.summary.compliant, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                { label: "Warnings", value: compliance.summary.warnings, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
                { label: "Non-Compliant", value: compliance.summary.non_compliant, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
              ].map(s => (
                <GlassCard key={s.label} className={`p-5 border shadow-xs space-y-1 ${s.bg}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">{s.label}</span>
                  <span className={`text-3xl font-black block ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] text-slate-500 font-medium">of {compliance.summary.total} checks</span>
                </GlassCard>
              ))}
            </div>
          )}

          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Compliance Status Checks</h2>
                <p className="text-[11px] font-medium text-slate-500">Computed from system_settings and users table aggregates</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>

            {!compliance ? (
              <EmptyState message="No Compliance Data Available" />
            ) : (
              <div className="space-y-2.5">
                {compliance.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <ComplianceIcon status={check.status} />
                      <div>
                        <p className="text-xs font-black text-slate-900">{check.check}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{check.detail}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">Source: {check.source}</p>
                      </div>
                    </div>
                    <StatusBadge status={check.status} />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ─── TAB: ACCESS CONTROL ───────────────────────────────────────────────── */}
      {activeTab === "access" && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Access Control Events</h2>
              <p className="text-[11px] font-medium text-slate-500">User creation, role changes, account lockouts from AuditLog</p>
            </div>
            <Lock className="h-4 w-4 text-indigo-600" />
          </div>

          {accessEvents.length === 0 ? (
            <EmptyState message="No Access Control Events" />
          ) : (
            <div className="space-y-2">
              {accessEvents.map(event => (
                <div key={event.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-700 uppercase text-[10px] tracking-wide">{event.action}</span>
                    <span className="text-slate-400 text-[10px] font-medium">{event.timestamp}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-medium">
                    <span><span className="font-bold text-slate-700">By:</span> {event.performed_by}</span>
                    <span><span className="font-bold text-slate-700">IP:</span> {event.ip_address}</span>
                  </div>
                  {event.details && event.details !== "—" && (
                    <p className="text-[10px] text-slate-500 pt-0.5">{event.details}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── TAB: AUDIT TRAIL ──────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Security Audit Timeline</h2>
              <p className="text-[11px] font-medium text-slate-500">Full authentication event audit trail from PostgreSQL AuditLog table</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black">
              {auditEvents.length} records
            </span>
          </div>

          {auditEvents.length === 0 ? (
            <EmptyState message="No Security Audit Events Available" />
          ) : (
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-indigo-100" />
              {auditEvents.map((event, idx) => (
                <div key={event.id} className="relative pl-6">
                  <div className="absolute left-[-4px] top-2 h-2 w-2 rounded-full bg-indigo-400 border-2 border-white" />
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.result} />
                        <span className="font-black text-slate-800 uppercase text-[10px]">{event.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{event.timestamp}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-medium">
                      <span><span className="font-bold text-slate-700">User:</span> {event.user}</span>
                      <span><span className="font-bold text-slate-700">Hospital:</span> {event.hospital}</span>
                      <span><span className="font-bold text-slate-700">IP:</span> {event.ip_address}</span>
                    </div>
                    {event.details && event.details !== "—" && (
                      <p className="text-[10px] text-slate-500 italic">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── SECURE RESET PASSWORD DIALOG (SUPER ADMIN ONLY) ─────────────────── */}
      {resetPassModal.isOpen && resetPassModal.user && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-black shadow-lg">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">Reset Account Password</h3>
                  <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                    Super Administrator Security Operation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPassModal({ isOpen: false, user: null, newPass: "", confirmPass: "", mustChange: true, error: null })}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4 text-xs font-semibold">
              {resetPassModal.error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{resetPassModal.error}</span>
                </div>
              )}

              {/* Target User Info Header */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Account</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {resetPassModal.user.employee_id || "EMP"}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 block">{resetPassModal.user.full_name}</span>
                <span className="text-xs text-slate-500 font-mono block">{resetPassModal.user.email}</span>
              </div>

              {/* Email (READ ONLY) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>User Email Address (READ-ONLY)</span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </span>
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={resetPassModal.user.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">New Password *</label>
                <input
                  type="password"
                  required
                  value={resetPassModal.newPass}
                  onChange={(e) => setResetPassModal({ ...resetPassModal, newPass: e.target.value, error: null })}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 transition"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={resetPassModal.confirmPass}
                  onChange={(e) => setResetPassModal({ ...resetPassModal, confirmPass: e.target.value, error: null })}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 transition"
                />
              </div>

              {/* Force Password Change Checkbox */}
              <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-900 block">Force Password Change on Next Login</span>
                  <span className="text-[11px] text-slate-500 font-medium block">User must set a new password upon logging in</span>
                </div>
                <input
                  type="checkbox"
                  checked={resetPassModal.mustChange}
                  onChange={(e) => setResetPassModal({ ...resetPassModal, mustChange: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Warning Notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                <span className="font-extrabold block mb-0.5">Session Invalidation Notice:</span>
                Resetting password will hash the credential in PostgreSQL, update <span className="font-mono text-amber-950 font-bold">password_changed_at</span>, invalidate all active user sessions, and record a permanent AuditLog entry.
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPassModal({ isOpen: false, user: null, newPass: "", confirmPass: "", mustChange: true, error: null })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Reset Password in PostgreSQL →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW USER PROFILE DRAWER ────────────────────────────────────────── */}
      {viewUserModal.isOpen && viewUserModal.user && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-xl w-full h-full p-6 space-y-6 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {viewUserModal.user.full_name ? viewUserModal.user.full_name.substring(0, 2).toUpperCase() : "US"}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{viewUserModal.user.full_name}</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600">@{viewUserModal.user.username || "user"} • {viewUserModal.user.employee_id || "EMP"}</span>
                </div>
              </div>
              <button
                onClick={() => setViewUserModal({ isOpen: false, user: null })}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Information Overview */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 text-xs font-semibold">
              <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                <span>Account Identity & Organizational Mapping</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Email Address (Read-Only)</span>
                  <span className="text-slate-900 font-bold">{viewUserModal.user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Hospital Facility</span>
                  <span className="text-indigo-900 font-bold">{viewUserModal.user.hospital_name || "St. Jude Hospital"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Clinical Department</span>
                  <span className="text-slate-900 font-bold">{viewUserModal.user.department_name || "General Medical"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Assigned System Role</span>
                  <span className="text-indigo-700 uppercase font-black">{viewUserModal.user.role}</span>
                </div>
              </div>
            </div>

            {/* Security Telemetry */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5 text-xs font-semibold">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-600" />
                <span>Account Security Telemetry</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block">Account Status</span>
                  <StatusBadge status={viewUserModal.user.account_locked ? "Locked" : viewUserModal.user.status} />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Password Status</span>
                  <span className="font-mono text-[11px] font-bold text-slate-600">******** (Protected)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Last Login</span>
                  <span className="text-slate-800 font-bold">{viewUserModal.user.last_login ? new Date(viewUserModal.user.last_login).toLocaleString() : "Never Logged In"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Password Reset Required</span>
                  <span className="text-slate-800 font-bold">{viewUserModal.user.must_change_password ? "Yes (First Login / Reset)" : "No"}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <GlassButton
                onClick={() => setViewUserModal({ isOpen: false, user: null })}
                variant="secondary"
                className="text-xs font-bold text-slate-700"
              >
                Close Drawer
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── FORCE LOGOUT CONFIRMATION MODAL ──────────────────────────────────── */}
      {forceLogoutTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Confirm Force Logout</h3>
                <p className="text-[11px] text-slate-500 font-medium">This will revoke the user session and log the action.</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <GlassButton
                onClick={() => setForceLogoutTarget(null)}
                variant="secondary"
                className="text-xs font-bold text-slate-600 bg-white border-slate-200"
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={() => handleForceLogout(forceLogoutTarget)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              >
                Force Logout
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
