"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  History, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, AlertCircle, Info,
  X, Eye, Download, Clock, Shield, Database, Layers,
  ChevronDown, ArrowUpDown, FileText
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import RefreshButton from "@/components/ui/RefreshButton";
import { api } from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface AuditRecord {
  id: string;
  timestamp: string;
  timestamp_iso: string;
  user: string;
  email: string;
  role: string;
  hospital: string;
  department: string;
  module: string;
  action: string;
  description: string;
  status: string;
  severity: string;
  ip_address: string;
  user_agent: string;
  browser: string;
  os: string;
}

interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface AuditDashboard {
  total_events: number;
  today_events: number;
  successful_actions: number;
  failed_actions: number;
  security_events: number;
  admin_changes: number;
  clinical_events: number;
  model_events: number;
}

interface AuditStats {
  by_module: { module: string; count: number }[];
  by_action: { action: string; count: number; module: string }[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MODULES = [
  "Authentication", "Hospital Management", "Department Management",
  "Doctor Management", "Patient Management", "Prediction Engine",
  "Model Management", "AI Drift Governance", "User Management",
  "Security Center", "System Settings", "Executive Reports",
  "Clinical Intelligence",
];

const PAGE_SIZES = [25, 50, 100];

const SORT_OPTIONS = [
  { value: "timestamp_desc", label: "Newest First" },
  { value: "timestamp_asc", label: "Oldest First" },
];

// ─── BADGE HELPERS ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: "bg-rose-100 text-rose-800 border-rose-200",
    High:     "bg-orange-100 text-orange-800 border-orange-200",
    Medium:   "bg-amber-100 text-amber-800 border-amber-200",
    Info:     "bg-sky-100 text-sky-700 border-sky-200",
    Low:      "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${map[severity] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Failed:    "bg-rose-50 text-rose-700 border-rose-200",
    Warning:   "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${map[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

function ModuleBadge({ module }: { module: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
      {module}
    </span>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <tr>
      <td colSpan={13} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <History className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-black text-slate-400">No Audit Records Found</p>
          <p className="text-[11px] text-slate-400 font-medium max-w-sm">
            Audit events will automatically appear here as users perform actions across the platform.
          </p>
        </div>
      </td>
    </tr>
  );
}

// ─── DETAIL DRAWER ────────────────────────────────────────────────────────────
function DetailDrawer({ record, onClose }: { record: AuditRecord; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Audit ID", record.id],
    ["Timestamp", record.timestamp],
    ["Performed By", record.user],
    ["Email", record.email],
    ["Role", record.role],
    ["Hospital", record.hospital],
    ["Department", record.department],
    ["Module", record.module],
    ["Action", record.action],
    ["Status", record.status],
    ["Severity", record.severity],
    ["Description", record.description],
    ["IP Address", record.ip_address],
    ["Browser", record.browser],
    ["Operating System", record.os],
    ["User Agent", record.user_agent],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-900">Audit Record Details</h2>
            <p className="text-[11px] text-slate-500 font-medium">Read-only forensic view — PostgreSQL AuditLog</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 px-5 pt-4">
          <SeverityBadge severity={record.severity} />
          <StatusBadge status={record.status} />
          <ModuleBadge module={record.module} />
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase block">{label}</span>
              <span className={`text-xs font-semibold text-slate-800 break-all block ${label === "Audit ID" || label === "User Agent" ? "font-mono text-[10px]" : ""}`}>
                {value || "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100">
          <GlassButton onClick={onClose} variant="secondary" className="w-full text-xs font-bold text-slate-600 bg-white border-slate-200">
            Close
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminAuditLogsPage() {
  // Data state
  const [dashboard, setDashboard] = useState<AuditDashboard | null>(null);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  // Filter/search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("timestamp_desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  // Fetch dashboard KPIs and stats (once)
  useEffect(() => {
    api.get("/api/v1/admin/audit/dashboard").then(r => setDashboard(r.data)).catch(() => {});
    api.get("/api/v1/admin/audit/statistics").then(r => setStats(r.data)).catch(() => {});
  }, []);

  // Fetch paginated logs on filter/page change
  const fetchLogs = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    params.set("sort_by", sortBy);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (actionFilter) params.set("action", actionFilter);
    if (moduleFilter) params.set("module", moduleFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    api.get(`/api/v1/admin/audit/logs?${params.toString()}`)
      .then(r => {
        setRecords(r.data.records ?? []);
        setPagination(r.data.pagination ?? null);
      })
      .catch(() => setToast("Failed to load audit records."))
      .finally(() => setIsLoading(false));
  }, [page, pageSize, sortBy, debouncedSearch, actionFilter, moduleFilter, statusFilter, severityFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Export handler
  const handleExport = (format: "csv" | "json") => {
    const params = new URLSearchParams({ limit: "1000" });
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    api.get(`/api/v1/admin/audit/export?${params.toString()}`).then(r => {
      const data: AuditRecord[] = r.data;
      if (format === "csv") {
        const headers = ["Timestamp", "User", "Role", "Hospital", "Department", "Module", "Action", "Status", "Severity", "IP Address", "Description"];
        const rows = data.map(d => [d.timestamp, d.user, d.role, d.hospital, d.department, d.module, d.action, d.status, d.severity, d.ip_address, `"${(d.description || "").replace(/"/g, "'")}"` ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.json`; a.click();
        URL.revokeObjectURL(url);
      }
      setToast("Export completed successfully.");
    }).catch(() => setToast("Export failed."));
  };

  const clearFilters = () => {
    setSearch(""); setActionFilter(""); setModuleFilter(""); setStatusFilter("");
    setSeverityFilter(""); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const hasActiveFilters = search || actionFilter || moduleFilter || statusFilter || severityFilter || dateFrom || dateTo;

  const KPI_CARDS = dashboard ? [
    { label: "Total Events",       value: dashboard.total_events,       color: "text-slate-900"   },
    { label: "Today's Events",     value: dashboard.today_events,       color: "text-indigo-600"  },
    { label: "Successful Actions", value: dashboard.successful_actions, color: "text-emerald-600" },
    { label: "Failed Actions",     value: dashboard.failed_actions,     color: "text-rose-600"    },
    { label: "Security Events",    value: dashboard.security_events,    color: "text-amber-600"   },
    { label: "Admin Changes",      value: dashboard.admin_changes,      color: "text-purple-600"  },
    { label: "Clinical Events",    value: dashboard.clinical_events,    color: "text-teal-600"    },
    { label: "Model Events",       value: dashboard.model_events,       color: "text-sky-600"     },
  ] : [];

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      {toast && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2"><Info className="h-3.5 w-3.5" /><span>{toast}</span></div>
          <button onClick={() => setToast(null)}><X className="h-3.5 w-3.5 opacity-60" /></button>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Enterprise Audit Trail
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900">System-Wide Audit Logs</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Immutable, traceable audit records for every administrative, clinical, and security action — sourced from PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <GlassButton onClick={() => handleExport("csv")} variant="secondary"
            className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 border-slate-200 shadow-xs">
            <Download className="h-3.5 w-3.5 text-slate-500" />CSV
          </GlassButton>
          <GlassButton onClick={() => handleExport("json")} variant="secondary"
            className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 border-slate-200 shadow-xs">
            <FileText className="h-3.5 w-3.5 text-slate-500" />JSON
          </GlassButton>
          <RefreshButton onRefresh={fetchLogs} />
        </div>
      </div>

      {/* KPI CARDS */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {KPI_CARDS.map(card => (
            <GlassCard key={card.label} className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs hover:border-indigo-300 transition-all">
              <span className="text-[9px] font-black text-slate-400 uppercase block">{card.label}</span>
              <span className={`text-2xl font-black block ${card.color}`}>{card.value.toLocaleString()}</span>
            </GlassCard>
          ))}
        </div>
      )}

      {/* SEARCH + FILTERS */}
      <GlassCard className="p-4 bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, description, IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${showFilters ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
          >
            <Filter className="h-3 w-3" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors">
              Clear All
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Module</label>
              <select
                value={moduleFilter}
                onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Modules</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Warning">Warning</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Severity</label>
              <select
                value={severityFilter}
                onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Info">Info</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Action Filter</label>
              <input
                type="text"
                placeholder="e.g. LOGIN, MODEL..."
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase block">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}
      </GlassCard>

      {/* AUDIT TABLE */}
      <GlassCard className="bg-white border border-slate-200/80 shadow-xs">
        {/* Table header info */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-black text-slate-900">Audit Event Log</span>
            {pagination && (
              <span className="text-[10px] text-slate-400 font-medium">
                — {pagination.total_count.toLocaleString()} total records
              </span>
            )}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {[
                  "Timestamp", "User", "Role", "Hospital",
                  "Module", "Action", "Severity", "Status",
                  "IP Address", "Browser", "Description", ""
                ].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.length === 0 && !isLoading ? (
                <EmptyState />
              ) : isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                records.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {record.timestamp}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[110px]">{record.user}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px]">{record.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase whitespace-nowrap">
                        {record.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium truncate max-w-[100px]">{record.hospital}</td>
                    <td className="py-2.5 px-3"><ModuleBadge module={record.module} /></td>
                    <td className="py-2.5 px-3 font-black text-slate-900 uppercase text-[10px] whitespace-nowrap">{record.action}</td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={record.severity} /></td>
                    <td className="py-2.5 px-3"><StatusBadge status={record.status} /></td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{record.ip_address}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{record.browser}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium truncate max-w-[140px]">{record.description}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-100 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Eye className="h-2.5 w-2.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {pagination && pagination.total_count > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">
              Showing {((pagination.page - 1) * pagination.page_size) + 1}–{Math.min(pagination.page * pagination.page_size, pagination.total_count)} of {pagination.total_count.toLocaleString()} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.has_prev}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>

              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                const startPage = Math.max(1, Math.min(pagination.page - 2, pagination.total_pages - 4));
                const p = startPage + i;
                if (p > pagination.total_pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 flex items-center justify-center rounded-lg text-[11px] font-bold border transition-colors ${
                      p === pagination.page
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={!pagination.has_next}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* MODULE DISTRIBUTION (from stats) */}
      {stats && stats.by_module.length > 0 && (
        <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Events by Module</h2>
            <p className="text-[11px] text-slate-500 font-medium">Distribution from PostgreSQL AuditLog table</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {stats.by_module.map(m => (
              <button
                key={m.module}
                onClick={() => { setModuleFilter(m.module); setPage(1); setShowFilters(true); }}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-indigo-300 rounded-xl text-left transition-all group"
              >
                <span className="text-[9px] font-black text-slate-400 uppercase block group-hover:text-indigo-600 transition-colors">{m.module}</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">{m.count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-medium">events</span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* DETAIL DRAWER */}
      {selectedRecord && (
        <DetailDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}
