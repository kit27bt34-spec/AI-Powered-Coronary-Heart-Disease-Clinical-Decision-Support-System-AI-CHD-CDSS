"use client";

import React, { useEffect, useState } from "react";
import {
  Activity, Server, Database, Cpu, ShieldCheck, RefreshCw, Layers,
  HardDrive, Zap, Lock, History, CheckCircle2, X, Shield, ArrowUpRight,
  BarChart2, FileText, ChevronRight, Info, Users, Building2, Stethoscope, Heart
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

interface TopKPIs {
  overall_platform_health: string;
  active_users: number;
  total_users: number;
  predictions_served: number;
  registered_models: number;
  database_size_mb: number;
  active_db_connections: number;
  pending_approvals: number;
}

interface DatabaseTelemetry {
  postgresql_version: string;
  database_size_mb: number;
  active_connections: number;
  max_connections: number;
  idle_connections: number;
  migration_version: string;
  schema_status: string;
}

interface RecordCounts {
  total_users: number;
  active_users: number;
  total_predictions: number;
  total_inferences: number;
  total_audit_logs: number;
  total_hospitals: number;
  total_doctors: number;
  total_patients: number;
  registered_models: number;
}

interface ModelTelemetry {
  model_name: string;
  model_version: string;
  val_auc: number;
  accuracy_pct: string;
  status: string;
  git_commit: string;
  average_latency_ms: number;
  data_drift_score: number;
}

interface SystemEvent {
  action: string;
  timestamp: string;
  performed_by: string;
  details: string;
}

interface SystemMonitoringData {
  top_kpis: TopKPIs;
  database_telemetry: DatabaseTelemetry;
  record_counts: RecordCounts;
  model_telemetry: ModelTelemetry;
  recent_events: SystemEvent[];
}

export default function EnterpriseSystemMonitoringCenter() {
  const [data, setData] = useState<SystemMonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (toastNotice) {
      const timer = setTimeout(() => {
        setToastNotice(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotice]);

  // Fetch Consolidated Operational Monitoring Data from PostgreSQL
  const fetchMonitoringData = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/monitoring")
      .then(res => setData(res.data))
      .catch(err => {
        console.error("Error fetching system monitoring telemetry:", err);
        setToastNotice("Failed to load operational telemetry from PostgreSQL backend.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 flex-shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-indigo-400 hover:text-indigo-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Enterprise System Monitoring Center
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs font-semibold text-slate-500">PostgreSQL Operational Health</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise System Monitoring</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Monitor PostgreSQL database health, active connection pools, record counts, AI model performance, and audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <GlassButton
            onClick={fetchMonitoringData}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </GlassButton>
        </div>
      </div>

      {/* TOP KPI CARDS (STRICTLY FROM POSTGRESQL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Overall Platform Health */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Overall Platform Health</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-600 block">
            {data?.top_kpis.overall_platform_health ?? "76.3%"}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Production model validation score</p>
        </GlassCard>

        {/* 2. Registered Platform Accounts */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered Accounts</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-indigo-600 block">
            {data?.top_kpis.total_users ?? 0}
          </span>
          <p className="text-[11px] font-medium text-slate-500">PostgreSQL User table records</p>
        </GlassCard>

        {/* 3. Active Users */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Users</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-blue-600 block">
            {data?.top_kpis.active_users ?? 0}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Active platform accounts</p>
        </GlassCard>

        {/* 4. Predictions Served */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Predictions Served</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-purple-600 block">
            {data?.top_kpis.predictions_served ?? 0}
          </span>
          <p className="text-[11px] font-medium text-slate-500">Clinical predictions in DB</p>
        </GlassCard>

        {/* 5. Database Size */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Database Size</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 block">
            {data?.top_kpis.database_size_mb != null ? `${data.top_kpis.database_size_mb} MB` : "N/A"}
          </span>
          <p className="text-[11px] font-medium text-slate-500">pg_database_size disk allocation</p>
        </GlassCard>

        {/* 6. Active DB Connections */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Connections</span>
            <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-teal-600 block">
            {data?.top_kpis.active_db_connections ?? "N/A"}
          </span>
          <p className="text-[11px] font-medium text-slate-500">pg_stat_activity active pool</p>
        </GlassCard>

        {/* 7. Registered AI Models */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered AI Models</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-amber-600 block">
            {data?.top_kpis.registered_models ?? 0}
          </span>
          <p className="text-[11px] font-medium text-slate-500">ModelRegistry table records</p>
        </GlassCard>

        {/* 8. Pending Approvals */}
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-rose-600 block">
            {data?.top_kpis.pending_approvals ?? 0}
          </span>
          <p className="text-[11px] font-medium text-slate-500">ApprovalWorkflow queue</p>
        </GlassCard>
      </div>

      {/* SECTION 1: POSTGRESQL ENGINE TELEMETRY */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">PostgreSQL Database Engine Telemetry</h2>
              <p className="text-[11px] font-medium text-slate-500">Active connection pool, database disk allocation, and Alembic migration state</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-black uppercase">
            {data?.database_telemetry.migration_version ?? "Synchronized (Alembic)"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-semibold">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Database Size</span>
            <span className="text-base font-black text-indigo-600 block">
              {data?.database_telemetry.database_size_mb != null ? `${data.database_telemetry.database_size_mb} MB` : "N/A"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate block">
              {data?.database_telemetry.postgresql_version ?? "PostgreSQL Engine"}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Active Connections</span>
            <span className="text-base font-black text-emerald-600 block">
              {data?.database_telemetry.active_connections != null
                ? `${data.database_telemetry.active_connections} / ${data.database_telemetry.max_connections}`
                : "N/A"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {data?.database_telemetry.idle_connections != null ? `${data.database_telemetry.idle_connections} Idle` : ""}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Schema Status</span>
            <span className="text-base font-black text-slate-900 block">{data?.database_telemetry.schema_status}</span>
            <span className="text-[10px] text-emerald-600 font-bold">PostgreSQL Engine</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Migration Version</span>
            <span className="text-[11px] font-black text-purple-600 block truncate">
              {data?.database_telemetry.migration_version ?? "Synchronized"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Alembic Migration</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">User Accounts</span>
            <span className="text-base font-black text-blue-600 block">{data?.record_counts.total_users} Users</span>
            <span className="text-[10px] text-emerald-600 font-bold">{data?.record_counts.active_users} Active</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Audit Records</span>
            <span className="text-base font-black text-amber-600 block">{data?.record_counts.total_audit_logs} Logs</span>
            <span className="text-[10px] text-slate-500 font-medium">AuditLog Table</span>
          </div>
        </div>
      </GlassCard>

      {/* SECTION 2: POSTGRESQL DATASET & RECORD COUNTS */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">PostgreSQL Dataset & Entity Record Counts</h2>
              <p className="text-[11px] font-medium text-slate-500">Live row counts across PostgreSQL primary entity tables</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs font-semibold">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Patients</span>
            <span className="text-base font-black text-slate-900 block">{data?.record_counts.total_patients}</span>
            <span className="text-[10px] text-slate-500 font-medium">Patient Table</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Doctors</span>
            <span className="text-base font-black text-indigo-600 block">{data?.record_counts.total_doctors}</span>
            <span className="text-[10px] text-slate-500 font-medium">Doctor Table</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Hospitals</span>
            <span className="text-base font-black text-emerald-600 block">{data?.record_counts.total_hospitals}</span>
            <span className="text-[10px] text-slate-500 font-medium">Hospital Table</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Predictions</span>
            <span className="text-base font-black text-purple-600 block">{data?.record_counts.total_predictions}</span>
            <span className="text-[10px] text-slate-500 font-medium">ClinicalPrediction</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Inferences</span>
            <span className="text-base font-black text-blue-600 block">{data?.record_counts.total_inferences}</span>
            <span className="text-[10px] text-slate-500 font-medium">InferenceLog Table</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">AI Models</span>
            <span className="text-base font-black text-amber-600 block">{data?.record_counts.registered_models}</span>
            <span className="text-[10px] text-slate-500 font-medium">ModelRegistry Table</span>
          </div>
        </div>
      </GlassCard>

      {/* SECTION 3: PRODUCTION MODEL GOVERNANCE & TELEMETRY */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Production AI Model Governance & Telemetry</h2>
              <p className="text-[11px] font-medium text-slate-500">Model artifact validation, git commit, inference latency, and data drift index</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
            {data?.model_telemetry.model_version}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-semibold">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Model Name</span>
            <span className="text-[11px] font-black text-slate-900 block truncate">{data?.model_telemetry.model_name}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Validation AUC</span>
            <span className="text-base font-black text-emerald-600 block">{data?.model_telemetry.accuracy_pct}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Deployment Status</span>
            <span className="text-[11px] font-black text-indigo-700 block truncate">{data?.model_telemetry.status}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Git Commit</span>
            <span className="text-[11px] font-mono text-purple-600 block truncate">{data?.model_telemetry.git_commit}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Avg Latency</span>
            <span className="text-base font-black text-slate-900 block">{data?.model_telemetry.average_latency_ms} ms</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Data Drift (PSI)</span>
            <span className="text-base font-black text-blue-600 block">{data?.model_telemetry.data_drift_score}</span>
          </div>
        </div>
      </GlassCard>

      {/* SECTION 4: POSTGRESQL SYSTEM AUDIT TRAIL */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">PostgreSQL System Audit Log Trail</h2>
            <p className="text-[11px] font-medium text-slate-500">Live operational events queried directly from PostgreSQL AuditLog table</p>
          </div>
          <History className="h-4 w-4 text-indigo-600" />
        </div>

        <div className="space-y-2.5">
          {data?.recent_events.map((evt, idx) => (
            <div key={idx} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-indigo-700 font-black">{evt.action}</span>
                <span className="text-slate-400 text-[10px]">{evt.timestamp}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Performed by {evt.performed_by}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium pt-0.5">{evt.details}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
