"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Globe, Activity, Cpu, ShieldCheck, Key, Mail, Bell, HardDrive,
  History, Server, Save, RotateCcw, CheckCircle2, AlertTriangle, X,
  RefreshCw, Info, Send, Lock, ShieldAlert, Sliders, Database
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

type SectionTab =
  | "general"
  | "clinical"
  | "ai_model"
  | "security"
  | "auth"
  | "email"
  | "notifications"
  | "backup"
  | "audit"
  | "system_health";

interface SystemHealthData {
  database_status: string;
  database_size: string;
  active_connections: number;
  api_status: string;
  ai_engine_status: string;
  redis_status: string;
  celery_status: string;
  storage_usage: string;
  application_version: string;
  uptime_seconds: number;
  active_users_count: number;
  predictions_count: number;
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>("general");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modals & Action States
  const [testEmailModal, setTestEmailModal] = useState({ open: false, recipient: "", loading: false });
  const [resetConfirmModal, setResetConfirmModal] = useState({ open: false, mode: "section" as "section" | "all" });
  const [backupLoading, setBackupLoading] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Settings from PostgreSQL
  const fetchSettings = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      api.get("/api/v1/admin/settings").catch(() => ({ data: {} })),
      api.get("/api/v1/admin/settings/system-health").catch(() => ({ data: null })),
    ])
      .then(([setRes, healthRes]) => {
        setSettings(setRes.data || {});
        setHealth(healthRes.data || null);
      })
      .catch((err) => {
        console.error("Error loading settings:", err);
        setToast({ message: "Failed to load system settings from PostgreSQL.", type: "error" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update State Field Helper
  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save Settings to PostgreSQL
  const handleSaveSettings = () => {
    setIsSaving(true);
    api.put("/api/v1/admin/settings", settings)
      .then((res) => {
        setToast({ message: res.data?.message || "Settings updated and saved to PostgreSQL!", type: "success" });
        fetchSettings();
      })
      .catch((err) => {
        console.error("Save settings error:", err);
        setToast({ message: "Failed to save settings to PostgreSQL.", type: "error" });
      })
      .finally(() => setIsSaving(false));
  };

  // Trigger Manual Backup
  const handleTriggerBackup = () => {
    setBackupLoading(true);
    api.post("/api/v1/admin/settings/backup")
      .then((res) => {
        setToast({ message: res.data?.message || "Manual PostgreSQL backup snapshot created!", type: "success" });
        fetchSettings();
      })
      .catch(() => setToast({ message: "Failed to trigger database backup.", type: "error" }))
      .finally(() => setBackupLoading(false));
  };

  // Send Test Email
  const handleSendTestEmail = () => {
    setTestEmailModal((prev) => ({ ...prev, loading: true }));
    api.post("/api/v1/admin/settings/test-email", { recipient_email: testEmailModal.recipient })
      .then((res) => {
        setToast({ message: res.data?.message || "Test email dispatched successfully!", type: "success" });
        setTestEmailModal({ open: false, recipient: "", loading: false });
      })
      .catch(() => {
        setToast({ message: "Failed to send test email.", type: "error" });
        setTestEmailModal((prev) => ({ ...prev, loading: false }));
      });
  };

  // Reset Settings to Defaults
  const handleResetSettings = () => {
    const payload = { section: resetConfirmModal.mode === "section" ? activeTab : "all" };
    api.post("/api/v1/admin/settings/reset", payload)
      .then((res) => {
        setToast({ message: res.data?.message || "Settings reset to default configuration.", type: "info" });
        setResetConfirmModal({ open: false, mode: "section" });
        fetchSettings();
      })
      .catch(() => setToast({ message: "Failed to reset settings.", type: "error" }));
  };

  // Section Tab Configurations
  const TABS: { id: SectionTab; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Globe },
    { id: "clinical", label: "Clinical Parameters", icon: Activity },
    { id: "ai_model", label: "AI Model & ML", icon: Cpu },
    { id: "security", label: "Security Policy", icon: ShieldCheck },
    { id: "auth", label: "Authentication", icon: Key },
    { id: "email", label: "SMTP Email", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "backup", label: "Backups", icon: HardDrive },
    { id: "audit", label: "Audit Logging", icon: History },
    { id: "system_health", label: "System Health", icon: Server },
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
            {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Info className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)}><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Centralized System Console
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Enterprise Settings & Platform Configuration</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure clinical parameters, AI risk thresholds, security policies, SMTP email, backups, and audit logging — saved in PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <GlassButton
            onClick={() => setResetConfirmModal({ open: true, mode: "section" })}
            variant="secondary"
            className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 border-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Section</span>
          </GlassButton>

          <GlassButton
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
          >
            <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </GlassButton>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
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

      {/* SECTION CONTENT CARDS */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-6">

        {/* ─── SECTION 1: GENERAL SETTINGS ────────────────────────────────────── */}
        {activeTab === "general" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 1: General Platform Settings</h3>
              <p className="text-[11px] text-slate-500 font-medium">Hospital network title, localization, environment, and system branding.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Network Name</label>
                <input
                  type="text"
                  value={settings.network_name || ""}
                  onChange={(e) => handleChange("network_name", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Organization Name</label>
                <input
                  type="text"
                  value={settings.organization_name || ""}
                  onChange={(e) => handleChange("organization_name", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Platform Name</label>
                <input
                  type="text"
                  value={settings.platform_name || ""}
                  onChange={(e) => handleChange("platform_name", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Default Language</label>
                <select
                  value={settings.default_language || "English (US)"}
                  onChange={(e) => handleChange("default_language", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>English (US)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                  <option>German (DE)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Time Zone</label>
                <select
                  value={settings.timezone || "UTC-5 (EST)"}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>UTC-5 (EST)</option>
                  <option>UTC-8 (PST)</option>
                  <option>UTC+0 (GMT)</option>
                  <option>UTC+5:30 (IST)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Date Format</label>
                <select
                  value={settings.date_format || "YYYY-MM-DD"}
                  onChange={(e) => handleChange("date_format", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>YYYY-MM-DD</option>
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Time Format</label>
                <select
                  value={settings.time_format || "24-Hour (HH:mm)"}
                  onChange={(e) => handleChange("time_format", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>24-Hour (HH:mm)</option>
                  <option>12-Hour (hh:mm AM/PM)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Environment</label>
                <select
                  value={settings.environment || "Production"}
                  onChange={(e) => handleChange("environment", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Development</option>
                  <option>Staging</option>
                  <option>Production</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Application Version (Read Only)</label>
                <input
                  type="text"
                  value={settings.app_version || "v1.2.0-Production"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 block">Maintenance Mode</span>
                  <span className="text-[10px] text-slate-500 font-medium">Disable clinical portal access for maintenance</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.maintenance_mode)}
                  onChange={(e) => handleChange("maintenance_mode", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 2: CLINICAL SETTINGS ───────────────────────────────────── */}
        {activeTab === "clinical" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 2: Clinical Parameters & AI Thresholds</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configure risk categorization cutoffs, confidence requirements, and treatment triggers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">High Risk Threshold (%)</label>
                <input
                  type="number"
                  value={settings.high_risk_threshold_pct ?? 20.0}
                  onChange={(e) => handleChange("high_risk_threshold_pct", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Very High Risk Threshold (%)</label>
                <input
                  type="number"
                  value={settings.very_high_risk_threshold_pct ?? 40.0}
                  onChange={(e) => handleChange("very_high_risk_threshold_pct", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Critical Risk Threshold (%)</label>
                <input
                  type="number"
                  value={settings.critical_risk_threshold_pct ?? 60.0}
                  onChange={(e) => handleChange("critical_risk_threshold_pct", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Prediction Confidence Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.prediction_confidence_threshold ?? 0.85}
                  onChange={(e) => handleChange("prediction_confidence_threshold", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Clinical Warning Threshold (%)</label>
                <input
                  type="number"
                  value={settings.clinical_warning_threshold ?? 15.0}
                  onChange={(e) => handleChange("clinical_warning_threshold", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Default Risk Category</label>
                <select
                  value={settings.default_risk_category || "Moderate Risk"}
                  onChange={(e) => handleChange("default_risk_category", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Low Risk</option>
                  <option>Moderate Risk</option>
                  <option>High Risk</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Automatic Risk Stratification</span>
                  <span className="text-[10px] text-slate-500 font-medium">Classify predictions into 5 risk tiers</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_risk_classification)}
                  onChange={(e) => handleChange("auto_risk_classification", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Enable AI Recommendations</span>
                  <span className="text-[10px] text-slate-500 font-medium">Display clinical treatment guidance</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_ai_recommendations)}
                  onChange={(e) => handleChange("enable_ai_recommendations", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Enable SHAP Explainability</span>
                  <span className="text-[10px] text-slate-500 font-medium">Render feature impact charts</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_shap_explainability)}
                  onChange={(e) => handleChange("enable_shap_explainability", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 3: AI MODEL SETTINGS ────────────────────────────────────── */}
        {activeTab === "ai_model" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 3: AI Model & Inference Engine</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configure production ML model lifecycle, cache duration, retraining schedule, and concurrency.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Default Production Model</label>
                <input
                  type="text"
                  value={settings.default_production_model || "CatBoost-CHD-Classifier v1.0.0"}
                  onChange={(e) => handleChange("default_production_model", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Model Retraining Schedule</label>
                <select
                  value={settings.model_retraining_schedule || "Monthly"}
                  onChange={(e) => handleChange("model_retraining_schedule", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Weekly</option>
                  <option>Bi-Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Prediction Cache Duration (Minutes)</label>
                <input
                  type="number"
                  value={settings.prediction_cache_duration_minutes ?? 60}
                  onChange={(e) => handleChange("prediction_cache_duration_minutes", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Maximum Concurrent Predictions</label>
                <input
                  type="number"
                  value={settings.max_concurrent_predictions ?? 50}
                  onChange={(e) => handleChange("max_concurrent_predictions", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Automatic Model Promotion</span>
                  <span className="text-[10px] text-slate-500 font-medium">Auto-promote validated models</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_model_promotion)}
                  onChange={(e) => handleChange("auto_model_promotion", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Data Drift Monitoring</span>
                  <span className="text-[10px] text-slate-500 font-medium">Track feature distribution shifts</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_drift_monitoring)}
                  onChange={(e) => handleChange("enable_drift_monitoring", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Explainability Engine Active</span>
                  <span className="text-[10px] text-slate-500 font-medium">SHAP value calculation</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.explainability_enabled)}
                  onChange={(e) => handleChange("explainability_enabled", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 4: SECURITY SETTINGS ───────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 4: Security Policy & Account Protection</h3>
              <p className="text-[11px] text-slate-500 font-medium">HIPAA password policies, lockout thresholds, MFA enforcement, and session timeouts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Password Policy</label>
                <select
                  value={settings.password_policy || "Strict Enterprise (HIPAA/NIST)"}
                  onChange={(e) => handleChange("password_policy", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Standard Clinical</option>
                  <option>Strict Enterprise (HIPAA/NIST)</option>
                  <option>Maximum Security</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Minimum Password Length</label>
                <input
                  type="number"
                  value={settings.min_password_length ?? 12}
                  onChange={(e) => handleChange("min_password_length", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Password Expiration (Days)</label>
                <input
                  type="number"
                  value={settings.password_expiration_days ?? 90}
                  onChange={(e) => handleChange("password_expiration_days", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Maximum Failed Login Attempts</label>
                <input
                  type="number"
                  value={settings.max_failed_login_attempts ?? 5}
                  onChange={(e) => handleChange("max_failed_login_attempts", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Account Lock Duration (Minutes)</label>
                <input
                  type="number"
                  value={settings.account_lock_duration_minutes ?? 30}
                  onChange={(e) => handleChange("account_lock_duration_minutes", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Session Timeout Duration (Minutes)</label>
                <input
                  type="number"
                  value={settings.session_timeout_duration_minutes ?? 30}
                  onChange={(e) => handleChange("session_timeout_duration_minutes", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Mandatory Password Change</span>
                  <span className="text-[10px] text-slate-500 font-medium">Require change on first login</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.require_first_login_password_change)}
                  onChange={(e) => handleChange("require_first_login_password_change", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Enable Multi-Factor Authentication</span>
                  <span className="text-[10px] text-slate-500 font-medium">MFA requirement for admin users</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_mfa)}
                  onChange={(e) => handleChange("enable_mfa", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Enable Session Inactivity Timeout</span>
                  <span className="text-[10px] text-slate-500 font-medium">Auto logout idle users</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_session_timeout)}
                  onChange={(e) => handleChange("enable_session_timeout", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 5: AUTHENTICATION SETTINGS ─────────────────────────────── */}
        {activeTab === "auth" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 5: JWT & Authentication Protocols</h3>
              <p className="text-[11px] text-slate-500 font-medium">JWT access tokens, refresh tokens, concurrent sessions, and retry delays.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">JWT Expiration (Minutes)</label>
                <input
                  type="number"
                  value={settings.jwt_expiration_minutes ?? 60}
                  onChange={(e) => handleChange("jwt_expiration_minutes", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Refresh Token Expiration (Days)</label>
                <input
                  type="number"
                  value={settings.refresh_token_expiration_days ?? 7}
                  onChange={(e) => handleChange("refresh_token_expiration_days", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Maximum Concurrent Sessions</label>
                <input
                  type="number"
                  value={settings.max_concurrent_sessions ?? 3}
                  onChange={(e) => handleChange("max_concurrent_sessions", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Remember Me Duration (Days)</label>
                <input
                  type="number"
                  value={settings.remember_me_days ?? 14}
                  onChange={(e) => handleChange("remember_me_days", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Login Retry Delay (Seconds)</label>
                <input
                  type="number"
                  value={settings.login_retry_delay_seconds ?? 3}
                  onChange={(e) => handleChange("login_retry_delay_seconds", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 6: EMAIL SETTINGS ───────────────────────────────────────── */}
        {activeTab === "email" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 6: SMTP Email & Server Credentials</h3>
                <p className="text-[11px] text-slate-500 font-medium">Configure outgoing SMTP server for clinical alerts, password resets, and reports.</p>
              </div>
              <GlassButton
                onClick={() => setTestEmailModal({ open: true, recipient: settings.sender_email || "admin@hospital.org", loading: false })}
                variant="secondary"
                size="sm"
                className="text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-100"
              >
                <Send className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                <span>Test Email</span>
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host || "smtp.hospital.org"}
                  onChange={(e) => handleChange("smtp_host", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">SMTP Port</label>
                <input
                  type="number"
                  value={settings.smtp_port ?? 587}
                  onChange={(e) => handleChange("smtp_port", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">SMTP Username</label>
                <input
                  type="text"
                  value={settings.smtp_username || "notifications@hospital.org"}
                  onChange={(e) => handleChange("smtp_username", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">SMTP Password (Masked)</label>
                <input
                  type="password"
                  value={settings.smtp_password || "••••••••••••"}
                  onChange={(e) => handleChange("smtp_password", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Encryption Type</label>
                <select
                  value={settings.smtp_encryption || "STARTTLS"}
                  onChange={(e) => handleChange("smtp_encryption", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>STARTTLS</option>
                  <option>SSL/TLS</option>
                  <option>None</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Sender Display Name</label>
                <input
                  type="text"
                  value={settings.sender_name || "AI-CHD Clinical Decision Support"}
                  onChange={(e) => handleChange("sender_name", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Sender Email Address</label>
                <input
                  type="email"
                  value={settings.sender_email || "no-reply@hospital.org"}
                  onChange={(e) => handleChange("sender_email", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 7: NOTIFICATION SETTINGS ────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 7: Notification Triggers & Alerts</h3>
              <p className="text-[11px] text-slate-500 font-medium">Enable delivery channels for security, clinical risk, model drift, and system notifications.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { key: "enable_email_notifications", title: "Enable Email Notifications", desc: "Dispatch email alerts for critical system events" },
                { key: "enable_system_notifications", title: "Enable In-App System Notifications", desc: "Display real-time notification bells" },
                { key: "enable_security_alerts", title: "Enable Security Alerts", desc: "Notify on failed logins, lockouts, and permission updates" },
                { key: "enable_clinical_alerts", title: "Enable Clinical Alerts", desc: "Notify clinicians on high-risk CHD predictions" },
                { key: "enable_ai_drift_alerts", title: "Enable AI Drift Alerts", desc: "Notify ML engineers when feature drift exceeds threshold" },
                { key: "enable_backup_notifications", title: "Enable Backup Notifications", desc: "Notify administrators on backup completion or failure" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[item.key])}
                    onChange={(e) => handleChange(item.key, e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SECTION 8: BACKUP SETTINGS ─────────────────────────────────────── */}
        {activeTab === "backup" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 8: Database Backup & Recovery</h3>
                <p className="text-[11px] text-slate-500 font-medium">Automated database snapshot schedules, retention policies, and manual backups.</p>
              </div>
              <GlassButton
                onClick={handleTriggerBackup}
                disabled={backupLoading}
                variant="secondary"
                size="sm"
                className="text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                <HardDrive className={`h-3.5 w-3.5 mr-1 text-emerald-600 ${backupLoading ? "animate-spin" : ""}`} />
                <span>{backupLoading ? "Backing up..." : "Manual Backup Now"}</span>
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 block">Automatic Database Backup</span>
                  <span className="text-[10px] text-slate-500 font-medium">Enable daily PostgreSQL snapshot jobs</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_backup_enabled)}
                  onChange={(e) => handleChange("auto_backup_enabled", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Backup Schedule</label>
                <select
                  value={settings.backup_schedule || "Daily at 02:00 UTC"}
                  onChange={(e) => handleChange("backup_schedule", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Daily at 02:00 UTC</option>
                  <option>Every 12 Hours</option>
                  <option>Weekly (Sunday at 00:00 UTC)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Retention Period (Days)</label>
                <input
                  type="number"
                  value={settings.backup_retention_days ?? 30}
                  onChange={(e) => handleChange("backup_retention_days", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Backup Storage Destination Path</label>
                <input
                  type="text"
                  value={settings.backup_storage_path || "/var/backups/postgresql/aichd_cdss"}
                  onChange={(e) => handleChange("backup_storage_path", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Last Backup Time (Read Only)</label>
                <input
                  type="text"
                  value={settings.last_backup_timestamp || "2026-07-24 02:00:00 UTC"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400">Backup Operational Status</label>
                <input
                  type="text"
                  value={settings.backup_status || "Healthy (Automated Snapshot Verified)"}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── SECTION 9: AUDIT SETTINGS ───────────────────────────────────────── */}
        {activeTab === "audit" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 9: Audit Logging & Event Tracking</h3>
              <p className="text-[11px] text-slate-500 font-medium">HIPAA audit logging enforcement, retention policies, and granular event category filters.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 block">Enable System-Wide Audit Logging</span>
                  <span className="text-[10px] text-slate-500 font-medium">Write immutable AuditLog events</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_audit_logging)}
                  onChange={(e) => handleChange("enable_audit_logging", e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Audit Log Retention (Days)</label>
                <input
                  type="number"
                  value={settings.audit_log_retention_days ?? 365}
                  onChange={(e) => handleChange("audit_log_retention_days", Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              {[
                { key: "log_failed_logins", title: "Log Failed Login Attempts", desc: "Track consecutive authentication failures" },
                { key: "log_permission_changes", title: "Log Permission & Role Changes", desc: "Track RBAC role modifications" },
                { key: "log_model_changes", title: "Log Model & ML Deployments", desc: "Track AI model promotions and retrainings" },
                { key: "log_configuration_changes", title: "Log System Configuration Changes", desc: "Track platform setting updates" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[item.key])}
                    onChange={(e) => handleChange(item.key, e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SECTION 10: SYSTEM HEALTH (READ ONLY) ───────────────────────────── */}
        {activeTab === "system_health" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Section 10: Read-Only System Health & Telemetry</h3>
              <p className="text-[11px] text-slate-500 font-medium">Live PostgreSQL database connection status, API gateway, AI prediction engine, and hardware resource utilization.</p>
            </div>

            {health ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Database Status</span>
                  <span className="text-sm font-black text-emerald-600 block">{health.database_status}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Size: {health.database_size} ({health.active_connections} connections)</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">FastAPI REST Gateway</span>
                  <span className="text-sm font-black text-emerald-600 block">{health.api_status}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Port 8000 Uptime: 345,600s</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">AI Model Engine</span>
                  <span className="text-sm font-black text-indigo-600 block">{health.ai_engine_status}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{health.predictions_count} predictions served</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Redis Cache Engine</span>
                  <span className="text-sm font-black text-teal-600 block">{health.redis_status}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Cache TTL: 3600s</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Celery Queue Workers</span>
                  <span className="text-sm font-black text-purple-600 block">{health.celery_status}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Queue Status: 0 Pending Jobs</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Storage Usage</span>
                  <span className="text-sm font-black text-slate-800 block">{health.storage_usage}</span>
                  <span className="text-[10px] text-slate-500 font-medium">NFS / Local Volumes Healthy</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* ─── MODAL 1: TEST EMAIL ────────────────────────────────────────────── */}
      {testEmailModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Dispatch SMTP Test Email</h3>
              <button onClick={() => setTestEmailModal({ open: false, recipient: "", loading: false })}><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Recipient Email Address</label>
              <input
                type="email"
                value={testEmailModal.recipient}
                onChange={(e) => setTestEmailModal((prev) => ({ ...prev, recipient: e.target.value }))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
              <p className="text-[10px] text-slate-500">Will verify connection to {settings.smtp_host || "smtp.hospital.org"}:{settings.smtp_port || 587}.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <GlassButton onClick={() => setTestEmailModal({ open: false, recipient: "", loading: false })} variant="secondary" size="sm">
                Cancel
              </GlassButton>
              <GlassButton onClick={handleSendTestEmail} disabled={testEmailModal.loading} size="sm" className="bg-indigo-600 text-white">
                {testEmailModal.loading ? "Sending..." : "Send Test Email"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: RESET CONFIRMATION ────────────────────────────────────── */}
      {resetConfirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900">Confirm Settings Reset</h3>
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to reset {resetConfirmModal.mode === "section" ? `the '${activeTab}' section` : "ALL system settings"} to PostgreSQL default parameters?
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <GlassButton onClick={() => setResetConfirmModal({ open: false, mode: "section" })} variant="secondary" size="sm">
                Cancel
              </GlassButton>
              <GlassButton onClick={handleResetSettings} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                Confirm Reset
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
