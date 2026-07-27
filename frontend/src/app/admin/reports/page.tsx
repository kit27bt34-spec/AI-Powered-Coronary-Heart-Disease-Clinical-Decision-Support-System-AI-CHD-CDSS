"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FileSpreadsheet, Download, FileText, CheckCircle2, RefreshCw, Filter,
  Calendar, Search, Eye, Play, Printer, Share2, Clock, Trash2, X, Plus,
  SlidersHorizontal, ChevronDown, ChevronRight, Activity, ShieldCheck,
  History, Users, TrendingUp, Server, FileCheck, AlertCircle, BarChart3,
  PieChart as PieIcon, LineChart as LineIcon
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Cell, PieChart, Pie, LineChart, Line, AreaChart, Area, CartesianGrid
} from "recharts";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface ReportCategory {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
}

interface ReportHistoryItem {
  id: string;
  name: string;
  category: string;
  report_type: string;
  status: string;
  generated_by: string;
  created_at: string;
  filters_used: Record<string, any>;
  export_format: string;
  file_size: string;
  download_count: number;
}

interface PreviewAnalytics {
  title: string;
  generated_at: string;
  kpis: Record<string, any>;
  charts?: Record<string, any>;
  checks?: any[];
  recent_audit_trail?: any[];
  deployments?: any[];
}

const COLOR_PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function EnterpriseReportsPage() {
  // ─── STATE ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [department, setDepartment] = useState("All");
  const [riskLevel, setRiskLevel] = useState("All");
  const [gender, setGender] = useState("All");
  const [ageGroup, setAgeGroup] = useState("All");
  const [modelVersion, setModelVersion] = useState("All");
  const [hospitalBranch, setHospitalBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active State
  const [previewModal, setPreviewModal] = useState<{ open: boolean; categoryId: string; data: PreviewAnalytics | null; loading: boolean }>({
    open: false, categoryId: "", data: null, loading: false
  });

  const [generatingModal, setGeneratingModal] = useState<{ open: boolean; progress: number; categoryName: string; duration: number }>({
    open: false, progress: 0, categoryName: "", duration: 0
  });

  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; categoryName: string; frequency: string; format: string; email: string }>({
    open: false, categoryName: "", frequency: "Weekly", format: "PDF", email: "admin@hospital.org"
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [stats, setStats] = useState<any>(null);

  // ─── INITIAL FETCH ─────────────────────────────────────────────────────────
  const fetchAllData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      api.get("/api/v1/reports/categories").catch(() => ({ data: [] })),
      api.get("/api/v1/reports/history?limit=50").catch(() => ({ data: { reports: [], total: 0 } })),
      api.get("/api/v1/reports/statistics").catch(() => ({ data: null })),
    ]).then(([catRes, histRes, statsRes]) => {
      setCategories(catRes.data || []);
      const histData = histRes.data || {};
      setHistory(histData.reports || (Array.isArray(histData) ? histData : []));
      setHistoryTotal(histData.total || (Array.isArray(histData) ? histData.length : 0));
      setStats(statsRes.data || null);
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ─── PREVIEW REPORT ANALYTICS ──────────────────────────────────────────────
  const handlePreview = (categoryId: string) => {
    setPreviewModal({ open: true, categoryId, data: null, loading: true });
    api.get(`/api/v1/reports/preview/${categoryId}?date_range=${encodeURIComponent(dateRange)}&department=${encodeURIComponent(department)}`)
      .then(res => {
        setPreviewModal(prev => ({ ...prev, data: res.data, loading: false }));
      })
      .catch(err => {
        console.error("Preview fetch error:", err);
        setToast({ message: "Failed to load report preview", type: "error" });
        setPreviewModal(prev => ({ ...prev, loading: false }));
      });
  };

  // ─── GENERATE REPORT (ASYNC SIMULATION + POSTGRES PERSISTENCE) ────────────
  const handleGenerate = (category: ReportCategory, format: string = "pdf") => {
    setGeneratingModal({ open: true, progress: 10, categoryName: category.name, duration: 0 });

    const interval = setInterval(() => {
      setGeneratingModal(prev => {
        if (prev.progress >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, progress: prev.progress + 25, duration: prev.duration + 0.3 };
      });
    }, 200);

    const payload = {
      name: category.name,
      category: category.id,
      export_format: format,
      filters: { dateRange, department, riskLevel, gender, ageGroup, modelVersion, hospitalBranch }
    };

    api.post("/api/v1/reports/generate", payload)
      .then(res => {
        setGeneratingModal(prev => ({ ...prev, progress: 100 }));
        setTimeout(() => {
          setGeneratingModal({ open: false, progress: 0, categoryName: "", duration: 0 });
          setToast({ message: `Report '${category.name}' generated & saved to database!`, type: "success" });
          fetchAllData();
        }, 500);
      })
      .catch(err => {
        clearInterval(interval);
        setGeneratingModal({ open: false, progress: 0, categoryName: "", duration: 0 });
        setToast({ message: "Report generation failed", type: "error" });
      });
  };

  // ─── DIRECT DOWNLOAD NATIVE FILE ───────────────────────────────────────────
  const handleDownloadDirect = (reportId: string, format: string) => {
    setToast({ message: `Preparing native ${format.toUpperCase()} download from PostgreSQL...`, type: "info" });
    const downloadUrl = `/api/v1/reports/download/${reportId}?format=${format.toLowerCase()}`;
    
    // Trigger download via direct window opening / link click
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `report_${reportId}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(fetchAllData, 1500);
  };

  // ─── REGENERATE REPORT ─────────────────────────────────────────────────────
  const handleRegenerate = (reportId: string, reportName: string) => {
    setToast({ message: `Regenerating '${reportName}' with latest data...`, type: "info" });
    api.post(`/api/v1/reports/regenerate/${reportId}`)
      .then(() => {
        setToast({ message: `Report '${reportName}' regenerated successfully`, type: "success" });
        fetchAllData();
      })
      .catch(() => setToast({ message: "Regeneration failed", type: "error" }));
  };

  // ─── DELETE REPORT ─────────────────────────────────────────────────────────
  const handleDeleteReport = (reportId: string) => {
    api.delete(`/api/v1/reports/${reportId}`)
      .then(() => {
        setToast({ message: "Report deleted from database", type: "info" });
        fetchAllData();
      })
      .catch(() => setToast({ message: "Failed to delete report", type: "error" }));
  };

  // ─── SCHEDULE REPORT SUBMIT ────────────────────────────────────────────────
  const handleScheduleSubmit = () => {
    api.post("/api/v1/reports/schedule", {
      name: scheduleModal.categoryName,
      frequency: scheduleModal.frequency,
      export_format: scheduleModal.format,
      recipients: scheduleModal.email
    }).then(() => {
      setToast({ message: `Automated ${scheduleModal.frequency} report scheduled for ${scheduleModal.email}`, type: "success" });
      setScheduleModal({ open: false, categoryName: "", frequency: "Weekly", format: "PDF", email: "" });
    }).catch(() => setToast({ message: "Failed to schedule report", type: "error" }));
  };

  // Filtered History List
  const filteredHistory = useMemo(() => {
    return history.filter(h =>
      !searchQuery ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.generated_by.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* TOAST NOTIFICATION */}
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
          <button onClick={() => setToast(null)}><X className="h-4 w-4 opacity-70" /></button>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Enterprise Business Intelligence
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Executive Reporting & Analytics Center</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Dynamic analytics, ML governance audits, population health telemetry & automated multi-format exports.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <GlassButton onClick={fetchAllData} variant="secondary" className="flex items-center gap-2 text-xs font-bold bg-white border-slate-200">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh All Data</span>
          </GlassButton>
        </div>
      </div>

      {/* TOP ENTERPRISE FILTER BAR */}
      <GlassCard className="p-4 bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
          <Filter className="h-3.5 w-3.5 text-indigo-600" />
          <span>Enterprise Global Filters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5 text-xs">
          {/* Date Range */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Quarter</option>
              <option>Year</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>Cardiology CDSS</option>
              <option>Emergency Medicine</option>
              <option>Internal Medicine</option>
            </select>
          </div>

          {/* Risk Level */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Risk Level</label>
            <select
              value={riskLevel}
              onChange={e => setRiskLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>High Risk (&gt;30%)</option>
              <option>Moderate Risk (15-30%)</option>
              <option>Low Risk (&lt;15%)</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          {/* Age Group */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Age Group</label>
            <select
              value={ageGroup}
              onChange={e => setAgeGroup(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>Under 40</option>
              <option>40 - 55</option>
              <option>Over 55</option>
            </select>
          </div>

          {/* Model Version */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Model Version</label>
            <select
              value={modelVersion}
              onChange={e => setModelVersion(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>CatBoost v1.0.0 (Prod)</option>
              <option>CatBoost v0.9.4</option>
            </select>
          </div>

          {/* Hospital Branch */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Hospital Branch</label>
            <select
              value={hospitalBranch}
              onChange={e => setHospitalBranch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option>All</option>
              <option>St. Jude Memorial Center</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* KPI STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated Reports</span>
          <span className="text-3xl font-black text-indigo-600 block">{historyTotal}</span>
          <span className="text-[11px] font-semibold text-emerald-600">Saved in PostgreSQL Database</span>
        </GlassCard>

        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Governance Status</span>
          <span className="text-3xl font-black text-emerald-600 block">
            {stats?.model_auc != null ? `${stats.model_auc} AUC` : "0.0 AUC"}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">CatBoost Production Classifier</span>
        </GlassCard>

        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Score</span>
          <span className="text-3xl font-black text-teal-600 block">
            {stats?.compliance_score_pct != null ? `${stats.compliance_score_pct}%` : "100.0%"}
          </span>
          <span className="text-[11px] font-semibold text-teal-600">HIPAA & GDPR Ready</span>
        </GlassCard>

        <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Automated Schedules</span>
          <span className="text-3xl font-black text-purple-600 block">
            {stats?.scheduled_jobs_active != null ? `${stats.scheduled_jobs_active} Active` : "0 Active"}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">Weekly PDF & Excel Delivery</span>
        </GlassCard>
      </div>

      {/* 7 ENTERPRISE REPORT CATEGORY CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Analytics Report Suite</h2>
          <span className="text-xs text-slate-400 font-semibold">7 Dynamic Categories Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <GlassCard key={cat.id} className="p-5 bg-white border border-slate-200/80 flex flex-col justify-between space-y-4 shadow-xs hover:border-indigo-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    {cat.category}
                  </span>
                  <button
                    onClick={() => setScheduleModal({ open: true, categoryName: cat.name, frequency: "Weekly", format: "PDF", email: "admin@hospital.org" })}
                    className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" /> Schedule
                  </button>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">{cat.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{cat.description}</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <GlassButton
                  onClick={() => handlePreview(cat.id)}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </GlassButton>

                <div className="flex items-center gap-1.5">
                  <GlassButton
                    onClick={() => handleGenerate(cat, "pdf")}
                    size="sm"
                    className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF
                  </GlassButton>

                  <GlassButton
                    onClick={() => handleGenerate(cat, "xlsx")}
                    variant="secondary"
                    size="sm"
                    className="text-xs font-bold text-slate-700 bg-slate-50 border-slate-200"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> XLSX
                  </GlassButton>

                  <GlassButton
                    onClick={() => handleGenerate(cat, "csv")}
                    variant="secondary"
                    size="sm"
                    className="text-xs font-bold text-slate-700 bg-slate-50 border-slate-200"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" /> CSV
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* REPORT HISTORY & AUDIT TRAIL TABLE */}
      <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Report Generation History & Saved Exports</h2>
            <p className="text-[11px] font-medium text-slate-500">Every generated report is archived in PostgreSQL with file size & download tracking.</p>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-400">No Generated Reports in History</p>
            <p className="text-[11px] text-slate-400">Click any 'PDF', 'XLSX', or 'CSV' button above to generate and save your first executive report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Report Name</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Category</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Generated By</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Generated Date</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Format</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">File Size</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Downloads</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Status</th>
                  <th className="py-2.5 px-3 font-extrabold text-slate-400 uppercase text-[9px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {filteredHistory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.generated_by}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{item.created_at}</td>
                    <td className="py-3 px-3 font-extrabold text-indigo-600 uppercase">{item.export_format}</td>
                    <td className="py-3 px-3 text-slate-500">{item.file_size}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{item.download_count}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDirect(item.id, item.export_format)}
                          title="Download Native File"
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerate(item.id, item.name)}
                          title="Regenerate with Fresh Data"
                          className="p-1 text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(item.id)}
                          title="Delete Report"
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* ─── MODAL 1: PREVIEW REPORT WITH RECHARTS ──────────────────────────── */}
      {previewModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {previewModal.data?.title || "Report Preview & Analytics"}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Live PostgreSQL Analytics • Date Range: {dateRange}
                </p>
              </div>
              <button onClick={() => setPreviewModal({ open: false, categoryId: "", data: null, loading: false })} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {previewModal.loading ? (
                <div className="py-20 text-center space-y-2">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Querying PostgreSQL analytics tables...</p>
                </div>
              ) : previewModal.data ? (
                <>
                  {/* KPIs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(previewModal.data.kpis || {}).map(([key, val]) => (
                      <div key={key} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-lg font-black text-slate-900 block truncate">{String(val)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Visualizations / Charts */}
                  {previewModal.data.charts && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Risk Distribution Chart */}
                      {previewModal.data.charts.risk_distribution && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <h4 className="text-xs font-extrabold text-slate-800">CHD Risk Stratification</h4>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={previewModal.data.charts.risk_distribution}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={60}
                                  label
                                >
                                  {previewModal.data.charts.risk_distribution.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Top Risk Factors / SHAP Importance */}
                      {(previewModal.data.charts.top_risk_factors || previewModal.data.charts.shap_feature_importance) && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <h4 className="text-xs font-extrabold text-slate-800">Clinical Feature Importance</h4>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={previewModal.data.charts.top_risk_factors || previewModal.data.charts.shap_feature_importance} layout="vertical">
                                <XAxis type="number" />
                                <YAxis dataKey={previewModal.data.charts.top_risk_factors ? "factor" : "feature"} type="category" width={100} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey={previewModal.data.charts.top_risk_factors ? "importance" : "shap_value"} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Trail List if present */}
                  {previewModal.data.recent_audit_trail && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-extrabold text-slate-800">Recent PostgreSQL Audit Logs</h4>
                      <div className="space-y-1.5">
                        {previewModal.data.recent_audit_trail.map((log: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between">
                            <span className="font-bold text-slate-800">{log.action}</span>
                            <span className="text-slate-500">{log.user} ({log.timestamp})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <GlassButton onClick={() => setPreviewModal({ open: false, categoryId: "", data: null, loading: false })} variant="secondary" size="sm">
                Close Preview
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ASYNC GENERATING PROGRESS ────────────────────────────── */}
      {generatingModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
            <h3 className="text-base font-black text-slate-900">Generating Enterprise Report</h3>
            <p className="text-xs text-slate-500 font-medium">{generatingModal.categoryName}</p>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${generatingModal.progress}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Status: Executing PostgreSQL Queries</span>
              <span>{generatingModal.progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SCHEDULE REPORT ───────────────────────────────────────── */}
      {scheduleModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Schedule Automated Report Delivery</h3>
              <button onClick={() => setScheduleModal({ open: false, categoryName: "", frequency: "Weekly", format: "PDF", email: "" })}><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Report Target</label>
                <input type="text" value={scheduleModal.categoryName} disabled className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700" />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Frequency</label>
                <select
                  value={scheduleModal.frequency}
                  onChange={e => setScheduleModal({ ...scheduleModal, frequency: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Export Format</label>
                <select
                  value={scheduleModal.format}
                  onChange={e => setScheduleModal({ ...scheduleModal, format: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option>PDF</option>
                  <option>Excel (.xlsx)</option>
                  <option>CSV</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={scheduleModal.email}
                  onChange={e => setScheduleModal({ ...scheduleModal, email: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <GlassButton onClick={() => setScheduleModal({ open: false, categoryName: "", frequency: "Weekly", format: "PDF", email: "" })} variant="secondary" size="sm">
                Cancel
              </GlassButton>
              <GlassButton onClick={handleScheduleSubmit} size="sm" className="bg-indigo-600 text-white">
                Save Schedule
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
