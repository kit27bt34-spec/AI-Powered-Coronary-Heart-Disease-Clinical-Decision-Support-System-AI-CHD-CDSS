"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  User as UserIcon, Shield, ShieldCheck, ShieldAlert, Key, Lock, Phone,
  Mail, Globe, Clock, History, AlertTriangle, CheckCircle2, RefreshCw,
  LogOut, Download, FileSpreadsheet, FileText, Smartphone, Laptop, Check,
  X, Eye, EyeOff, Save, Bell, Ban, Layers, Award
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  employee_id: string;
  email: string;
  phone: string;
  role: string;
  designation: string;
  department: string;
  hospital_network: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string;
  last_logout: string;
  last_password_change: string;
  mfa_enabled: boolean;
  language: string;
  timezone: string;
  notification_preferences: Record<string, boolean>;
  permissions: string[];
}

interface SecurityStatus {
  security_score: number;
  password_strength: string;
  password_expiration: string;
  password_age_days: number;
  failed_login_attempts: number;
  account_locked: boolean;
  mfa_enabled: boolean;
  last_password_change: string;
  last_successful_login: string;
}

interface ActiveSession {
  session_id: string;
  is_current: boolean;
  device: string;
  browser: string;
  operating_system: string;
  ip_address: string;
  location: string;
  login_time: string;
  last_activity: string;
  status: string;
}

interface LoginHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  ip_address: string;
  browser: string;
  operating_system: string;
  device: string;
  status: string;
  details: string;
}

type TabType = "identity" | "security" | "password" | "mfa" | "sessions" | "history" | "preferences" | "permissions";

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("identity");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    designation: "",
    language: "English (US)",
    timezone: "UTC-5 (EST)",
  });

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    logout_all_devices: false,
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // MFA Recovery Modal
  const [mfaModal, setMfaModal] = useState<{ open: boolean; recoveryCodes: string[] }>({
    open: false, recoveryCodes: []
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Profile & Security Data from PostgreSQL
  const fetchAllData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      api.get("/api/v1/admin/profile").catch(() => ({ data: null })),
      api.get("/api/v1/admin/profile/security").catch(() => ({ data: null })),
      api.get("/api/v1/admin/profile/sessions").catch(() => ({ data: [] })),
      api.get("/api/v1/admin/profile/login-history").catch(() => ({ data: [] })),
    ])
      .then(([profRes, secRes, sessRes, histRes]) => {
        if (profRes.data) {
          setProfile(profRes.data);
          setEditForm({
            full_name: profRes.data.full_name || "",
            username: profRes.data.username || "",
            email: profRes.data.email || "",
            phone: profRes.data.phone || "",
            designation: profRes.data.designation || "",
            language: profRes.data.language || "English (US)",
            timezone: profRes.data.timezone || "UTC-5 (EST)",
          });
        }
        if (secRes.data) setSecurityStatus(secRes.data);
        if (sessRes.data) setSessions(sessRes.data);
        if (histRes.data) setHistory(histRes.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // Save Identity Profile Update
  const handleSaveProfile = () => {
    setIsSaving(true);
    api.put("/api/v1/admin/profile", editForm)
      .then((res) => {
        if (res.data?.success) {
          setToast({ message: "Master Administrator profile updated in PostgreSQL!", type: "success" });
          window.dispatchEvent(new CustomEvent("admin_profile_updated"));
          fetchAllData();
        } else {
          setToast({ message: res.data?.detail || "Failed to update profile.", type: "error" });
        }
      })
      .catch((err) => {
        setToast({ message: err.response?.data?.detail || "Failed to save profile changes.", type: "error" });
      })
      .finally(() => setIsSaving(false));
  };

  // Change Password
  const handleChangePassword = () => {
    if (!passwordForm.current_password) {
      setToast({ message: "Please enter your current password.", type: "error" });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setToast({ message: "New password and confirmation do not match.", type: "error" });
      return;
    }

    setIsSaving(true);
    api.put("/api/v1/admin/profile/password", passwordForm)
      .then((res) => {
        if (res.data?.success) {
          setToast({ message: "Password updated successfully in PostgreSQL!", type: "success" });
          setPasswordForm({ current_password: "", new_password: "", confirm_password: "", logout_all_devices: false });
          fetchAllData();
        } else {
          setToast({ message: res.data?.detail || "Password update failed.", type: "error" });
        }
      })
      .catch((err) => {
        setToast({ message: err.response?.data?.detail || "Failed to change password.", type: "error" });
      })
      .finally(() => setIsSaving(false));
  };

  // Toggle MFA
  const handleToggleMFA = (enable: boolean) => {
    api.put("/api/v1/admin/profile/mfa", { enable_mfa: enable })
      .then((res) => {
        setToast({ message: res.data?.message || "MFA updated successfully.", type: "success" });
        if (enable && res.data?.recovery_codes) {
          setMfaModal({ open: true, recoveryCodes: res.data.recovery_codes });
        }
        fetchAllData();
      })
      .catch(() => setToast({ message: "Failed to update MFA status.", type: "error" }));
  };

  // Terminate Sessions
  const handleTerminateAllSessions = () => {
    api.delete("/api/v1/admin/profile/sessions")
      .then((res) => {
        setToast({ message: res.data?.message || "All other active sessions revoked.", type: "info" });
        fetchAllData();
      })
      .catch(() => setToast({ message: "Failed to terminate sessions.", type: "error" }));
  };

  // Password Complexity Evaluator
  const pwMetrics = useMemo(() => {
    const pw = passwordForm.new_password;
    return {
      length: pw.length >= 12,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      digit: /[0-9]/.test(pw),
      symbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw),
    };
  }, [passwordForm.new_password]);

  const pwValidCount = Object.values(pwMetrics).filter(Boolean).length;

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "identity", label: "Master Identity", icon: UserIcon },
    { id: "security", label: "Account Security", icon: ShieldCheck },
    { id: "password", label: "Change Password", icon: Key },
    { id: "mfa", label: "Multi-Factor Auth", icon: Lock },
    { id: "sessions", label: "Active Sessions", icon: Laptop },
    { id: "history", label: "Login History", icon: History },
    { id: "preferences", label: "Preferences", icon: Bell },
    { id: "permissions", label: "Roles & Scope", icon: Award },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between text-xs font-bold transition-all ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          toast.type === "info" ? "bg-indigo-50 border-indigo-200 text-indigo-800" :
          "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)}><X className="h-4 w-4 opacity-60" /></button>
        </div>
      )}

      {/* MASTER IDENTITY BANNER */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
            {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2) : "SA"}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
                Master Identity Record • Single Source of Truth
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900">{profile?.full_name || "Super Administrator"}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {profile?.designation || "Chief Medical Information Officer"} • {profile?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Security Score</span>
            <span className="text-xl font-black text-emerald-600 block">{securityStatus?.security_score ?? 100.0}%</span>
          </div>
          <GlassButton onClick={fetchAllData} variant="secondary" className="text-xs font-bold bg-white border-slate-200">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
          </GlassButton>
        </div>
      </GlassCard>

      {/* TAB NAVIGATION BAR */}
      <GlassCard className="p-2 bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-xs border border-indigo-100 font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* TAB CONTENTS */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-6">

        {/* ─── TAB 1: MASTER IDENTITY ─────────────────────────────────────────── */}
        {activeTab === "identity" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Master Identity & Account Metadata</h3>
                <p className="text-[11px] text-slate-500 font-medium">Single Source of Truth for Super Admin identity across the entire CDSS platform.</p>
              </div>
              <GlassButton onClick={handleSaveProfile} disabled={isSaving} size="sm" className="bg-indigo-600 text-white font-bold text-xs">
                <Save className="h-3.5 w-3.5 mr-1" />
                <span>{isSaving ? "Saving..." : "Save Identity Changes"}</span>
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Designation / Title</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Employee ID (Read Only)</label>
                <input
                  type="text"
                  value={profile?.employee_id || "ADM-2026-001"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Role (Read Only)</label>
                <input
                  type="text"
                  value={profile?.role || "super_admin"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-indigo-600 uppercase cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Hospital Network (Read Only)</label>
                <input
                  type="text"
                  value={profile?.hospital_network || "St. Jude Healthcare System"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* PROTECTED ACCOUNT DELETE NOTICE */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Ban className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-extrabold text-amber-900 block">Protected Master Account</span>
                  <span className="text-[11px] text-amber-700 font-medium">This account is protected and cannot be deleted from the platform.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ACCOUNT SECURITY ────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Account Security Telemetry</h3>
              <p className="text-[11px] text-slate-500 font-medium">Real-time security posture, password age, failed login monitoring, and lock status.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Security Score</span>
                <span className="text-2xl font-black text-emerald-600 block">{securityStatus?.security_score ?? 100}%</span>
                <span className="text-[10px] text-slate-500 font-medium">PostgreSQL Calculated</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Password Age</span>
                <span className="text-2xl font-black text-indigo-600 block">{securityStatus?.password_age_days ?? 22} Days</span>
                <span className="text-[10px] text-slate-500 font-medium">{securityStatus?.password_expiration || "68 Days Remaining"}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Failed Logins</span>
                <span className="text-2xl font-black text-emerald-600 block">{securityStatus?.failed_login_attempts ?? 0}</span>
                <span className="text-[10px] text-slate-500 font-medium">Account Status: Normal</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block">MFA Status</span>
                <span className={`text-2xl font-black block ${securityStatus?.mfa_enabled ? "text-emerald-600" : "text-amber-600"}`}>
                  {securityStatus?.mfa_enabled ? "Active" : "Disabled"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">2FA Protection</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: CHANGE PASSWORD ─────────────────────────────────────────── */}
        {activeTab === "password" && (
          <div className="space-y-5 animate-in fade-in duration-150 max-w-xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Change Password</h3>
              <p className="text-[11px] text-slate-500 font-medium">Re-hash password in PostgreSQL with strict enterprise complexity validation.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                  <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-2.5 text-slate-400">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                  <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-2.5 text-slate-400">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Complexity Rules */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Password Strength: {pwValidCount}/5 Requirements Met</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
                  <span className={pwMetrics.length ? "text-emerald-600" : "text-slate-400"}>✓ 12+ Characters</span>
                  <span className={pwMetrics.upper ? "text-emerald-600" : "text-slate-400"}>✓ Uppercase Letter</span>
                  <span className={pwMetrics.lower ? "text-emerald-600" : "text-slate-400"}>✓ Lowercase Letter</span>
                  <span className={pwMetrics.digit ? "text-emerald-600" : "text-slate-400"}>✓ Numeric Digit</span>
                  <span className={pwMetrics.symbol ? "text-emerald-600" : "text-slate-400"}>✓ Special Symbol</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="logoutAll"
                  checked={passwordForm.logout_all_devices}
                  onChange={(e) => setPasswordForm({ ...passwordForm, logout_all_devices: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="logoutAll" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Logout from all other active sessions after changing password
                </label>
              </div>

              <div className="pt-2">
                <GlassButton onClick={handleChangePassword} disabled={isSaving} size="sm" className="bg-indigo-600 text-white font-bold text-xs">
                  <Key className="h-3.5 w-3.5 mr-1" />
                  <span>Update Password</span>
                </GlassButton>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: MULTI-FACTOR AUTHENTICATION ─────────────────────────────── */}
        {activeTab === "mfa" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Multi-Factor Authentication (MFA / 2FA)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Protect Super Admin access with TOTP authenticator application verification.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-black text-slate-900 block text-xs">MFA Authentication Policy</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Current Status: {profile?.mfa_enabled ? "Enabled (Protected)" : "Disabled (Standard Security)"}
                </span>
              </div>
              {profile?.mfa_enabled ? (
                <GlassButton onClick={() => handleToggleMFA(false)} variant="secondary" size="sm" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold">
                  Disable MFA
                </GlassButton>
              ) : (
                <GlassButton onClick={() => handleToggleMFA(true)} size="sm" className="bg-emerald-600 text-white text-xs font-bold">
                  Enable MFA
                </GlassButton>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: ACTIVE SESSIONS ─────────────────────────────────────────── */}
        {activeTab === "sessions" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Active Login Sessions</h3>
                <p className="text-[11px] text-slate-500 font-medium">Currently active admin sessions tracked in PostgreSQL.</p>
              </div>
              <GlassButton onClick={handleTerminateAllSessions} variant="secondary" size="sm" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold">
                <LogOut className="h-3.5 w-3.5 mr-1" />
                <span>Revoke All Other Sessions</span>
              </GlassButton>
            </div>

            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.session_id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Laptop className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{s.device} ({s.browser})</span>
                        {s.is_current && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">Current Session</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block">{s.operating_system} • IP: {s.ip_address} • {s.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{s.login_time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: LOGIN HISTORY ───────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Authentication History</h3>
              <p className="text-[11px] text-slate-500 font-medium">Historical audit records of logins, logouts, and failed attempts from PostgreSQL AuditLog.</p>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">No Login History Available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Timestamp</th>
                      <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Event Action</th>
                      <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">IP Address</th>
                      <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Browser / OS</th>
                      <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{item.timestamp}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 uppercase text-[10px]">{item.action}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{item.ip_address}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.browser} ({item.operating_system})</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.status === "Success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: PREFERENCES ─────────────────────────────────────────────── */}
        {activeTab === "preferences" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Notification & Alert Preferences</h3>
              <p className="text-[11px] text-slate-500 font-medium">Persist Super Admin notification preferences to PostgreSQL.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {Object.entries(profile?.notification_preferences || {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="font-bold text-slate-800">{key.replace(/_/g, " ").toUpperCase()}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => {
                      const updated = { ...(profile?.notification_preferences || {}), [key]: e.target.checked };
                      api.put("/api/v1/admin/profile/preferences", { notification_preferences: updated })
                        .then(() => fetchAllData());
                    }}
                    className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 8: ROLES & PRIVILEGES ──────────────────────────────────────── */}
        {activeTab === "permissions" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Read-Only Roles & Assigned Privileges</h3>
              <p className="text-[11px] text-slate-500 font-medium">Super Admin scope and module authorization rights in PostgreSQL.</p>
            </div>

            <div className="space-y-3 text-xs">
              {(profile?.permissions || []).map((perm, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-extrabold text-slate-900">{perm}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* ─── MODAL: MFA RECOVERY CODES ───────────────────────────────────────── */}
      {mfaModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">MFA Recovery Backup Codes</h3>
              <button onClick={() => setMfaModal({ open: false, recoveryCodes: [] })}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Save these recovery codes in a secure location. Each code can be used once to access your account.</p>

            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs font-bold text-slate-800 text-center">
              {mfaModal.recoveryCodes.map((code, i) => <div key={i} className="p-1.5 bg-white rounded-lg border">{code}</div>)}
            </div>

            <div className="flex justify-end pt-2">
              <GlassButton onClick={() => setMfaModal({ open: false, recoveryCodes: [] })} size="sm" className="bg-indigo-600 text-white font-bold text-xs">
                I Have Saved These Codes
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
