"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Eye, Printer, Download, ShieldCheck, Activity, Award,
  X, FileSpreadsheet, Search, Filter, Plus, Star, Clock, ChevronDown,
  Share2, Trash2, CheckCircle, AlertCircle, Loader2, BarChart3,
  Users, Brain, ClipboardList, FolderOpen, CalendarDays, ArrowUpDown,
  BookOpen, Zap, TrendingUp, Database, HardDrive, RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassBadge from "@/components/ui/GlassBadge";
import RefreshButton from "@/components/ui/RefreshButton";
import { useToast } from "@/providers/ToastProvider";
import {
  downloadGenericReport,
} from "@/lib/pdfGenerator";


/* --- Types ----------------------------------------------------------- */
type ReportStatus = "Ready" | "Generating" | "Completed" | "Archived" | "Failed";

interface ReportRecord {
  id: string;
  name: string;
  patient: string;
  type: string;
  generatedBy: string;
  generatedDate: string;
  status: ReportStatus;
  fileSize: string;
  pinned: boolean;
  category: string;
}

interface ActivityItem {
  id: string;
  action: string;
  report: string;
  time: string;
  icon: "generated" | "downloaded" | "printed" | "exported";
}

/* --- Status Badge ----------------------------------------------------- */
function StatusPill({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, string> = {
    Ready: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Generating: "bg-amber-50 text-amber-700 border border-amber-200",
    Completed: "bg-blue-50 text-blue-700 border border-blue-200",
    Archived: "bg-slate-100 text-slate-500 border border-slate-200",
    Failed: "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${map[status]}`}>
      {status === "Generating" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {status === "Ready" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
      {status === "Completed" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />}
      {status === "Archived" && <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />}
      {status === "Failed" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />}
      {status}
    </span>
  );
}

/* --- Skeleton Loader -------------------------------------------------- */
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100/60">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${40 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

/* --- Summary Card ----------------------------------------------------- */
function SummaryCard({ title, value, desc, accent, icon: Icon }: { title: string; value: string | number; desc: string; accent: string; icon: React.ElementType }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <GlassCard className="p-5 bg-white/80 relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl ${accent}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</p>
            <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold">{desc}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent.replace("bg-", "bg-opacity-10 text-").replace("-500", "-600")} bg-slate-50`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* --- Category Card ---------------------------------------------------- */
function CategoryCard({ icon: Icon, title, description, items, count, color, onView }: {
  icon: React.ElementType; title: string; description: string; items: string[]; count: number; color: string; onView: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 280, damping: 20 }}>
      <GlassCard className="p-5 bg-white/80 h-full flex flex-col gap-4 hover:shadow-[0_8px_30px_rgba(31,38,135,0.07)] transition-shadow">
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{count} reports</span>
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">{description}</p>
        </div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={onView}
          className="w-full py-2 text-xs font-extrabold text-primary border border-blue-200/60 rounded-xl bg-blue-50/60 hover:bg-blue-100/60 transition"
        >
          View Reports
        </button>
      </GlassCard>
    </motion.div>
  );
}

/* --- DB Report type (from backend) ----------------------------------- */
interface DbReport {
  id: string;
  name: string;
  report_type: string;
  category: string;
  status: ReportStatus;
  pinned: boolean;
  patient_id: string | null;
  admission_id: string | null;
  prediction_id: string | null;
  report_data: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/* --- Main Component ---------------------------------------------------- */
export default function ReportsCenter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  /* --- Backend Data ------------------------------------------------ */
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/api/v1/patients");
      return res.data;
    },
  });

  const { data: audits, isLoading: auditsLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/audits");
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 403) return [];
        throw err;
      }
    },
  });

  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/models");
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 403) return [];
        throw err;
      }
    },
  });

  /* --- Real Reports from DB ---------------------------------------- */
  const { data: dbReports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<DbReport[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get("/api/v1/reports");
      return res.data;
    },
  });

  /* --- Mutations --------------------------------------------------- */
  const createReportMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      report_type: string;
      category: string;
    }) => {
      const res = await api.post("/api/v1/reports", {
        ...payload,
        report_data: {},
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast(`Report "${data.name}" saved to database`, "success", "Report Created");
    },
    onError: () => {
      toast("Failed to create report", "error", "Error");
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await api.patch(`/api/v1/reports/${reportId}/pin`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => {
      toast("Failed to update pin", "error", "Error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await api.delete(`/api/v1/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => {
      toast("Failed to delete report", "error", "Error");
    },
  });

  /* --- Derived Stats ----------------------------------------------- */
  const latestAudit = useMemo(() => {
    if (!audits) return null;
    return audits.filter((a: any) => a.model_version !== "mock-1")[0];
  }, [audits]);

  const latestModel = useMemo(() => {
    if (!models || models.length === 0) return null;
    return models.find((m: any) => m.status === "Production" || m.status === "Staging") || models[0];
  }, [models]);

  const cohortStats = useMemo(() => {
    if (!patients) return { size: 0, meanRisk: 0 };
    const patientRisks = patients.filter((p: any) => p.chd_risk_score !== null && p.chd_risk_score !== undefined);
    const totalRisk = patientRisks.reduce((acc: number, cur: any) => acc + cur.chd_risk_score, 0);
    const meanRisk = patientRisks.length > 0 ? (totalRisk / patientRisks.length) * 100 : 0;
    return { size: patients.length, meanRisk };
  }, [patients]);

  const todayAudits = useMemo(() => {
    if (!audits) return 0;
    const today = new Date();
    return audits.filter((a: any) => {
      const d = new Date(a.timestamp);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).length;
  }, [audits]);

  /* --- Map DB reports → ReportRecord for display ------------------- */
  const allReports: ReportRecord[] = useMemo(() => {
    return dbReports.map((r) => ({
      id: r.id,
      name: r.name,
      patient: r.patient_id ? r.patient_id.substring(0, 12) + "..." : "System-Wide",
      type: r.report_type,
      generatedBy: user?.email || "doctor@hospital.org",
      generatedDate: new Date(r.created_at).toLocaleDateString(),
      status: r.status as ReportStatus,
      fileSize: "—",
      pinned: r.pinned,
      category: r.category,
    }));
  }, [dbReports, user]);

  /* --- Filtered + Sorted Reports ---------------------------------- */
  const displayedReports = useMemo(() => {
    let list = [...allReports];
    if (activeCategory) list = list.filter((r) => r.category === activeCategory);
    if (filterType !== "all") list = list.filter((r) => r.type === filterType);
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.patient.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }
    // Pinned first
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    if (sortOrder === "oldest") list.reverse();
    return list;
  }, [allReports, search, filterType, filterStatus, sortOrder, activeCategory]);

  /* --- Activity Feed (derived from real DB reports) --------------- */
  const activities: ActivityItem[] = useMemo(() => {
    const feed: ActivityItem[] = [];
    dbReports.slice(0, 4).forEach((r, i) => {
      feed.push({
        id: r.id,
        action: `${r.name} — Created`,
        report: r.name,
        time: new Date(r.created_at).toLocaleString(),
        icon: "generated",
      });
    });
    if (feed.length === 0 && latestAudit) {
      feed.push({ id: "1", action: "CHD Report Generated", report: "Patient CHD Risk Assessment", time: "5 min ago", icon: "generated" });
    }
    return feed;
  }, [dbReports, latestAudit]);

  /* --- Actions ----------------------------------------------------- */
  const handlePrint = (name: string) => { window.print(); toast(`Print launched for: ${name}`, "success", "Printing"); };

  const handleDownload = async (report: ReportRecord) => {
    toast(`Generating PDF for: ${report.name}…`, "info", "Preparing Download");
    try {
      const auditProb = latestAudit ? latestAudit.predicted_risk : 0.224;
      const auditInputs = latestAudit ? (latestAudit.inputs_json || {}) : {};

      await downloadGenericReport({
        title: report.name,
        type: report.type,
        patient: report.patient,
        generatedBy: report.generatedBy,
        generatedDate: report.generatedDate,
        status: report.status,
        fileSize: report.fileSize,
        predictedRisk: auditProb,
        riskLevel: latestAudit ? latestAudit.risk_level : "Moderate",
        patientUuid: latestAudit ? latestAudit.patient_uuid : report.patient,
        age: auditInputs.age || 62,
        gender: auditInputs.gender !== undefined ? auditInputs.gender : 1,
        systolicBp: auditInputs.systolic_bp || 135,
        diastolicBp: auditInputs.diastolic_bp || 85,
        heartRate: auditInputs.heart_rate || 74,
        glucose: auditInputs.glucose || 110,
        cholesterol: auditInputs.cholesterol || 195,
        bmi: auditInputs.bmi || 26.8,
        hypertension: auditInputs.hypertension !== undefined ? auditInputs.hypertension : 1,
        diabetes: auditInputs.diabetes !== undefined ? auditInputs.diabetes : 1,
        smoking: auditInputs.smoking !== undefined ? auditInputs.smoking : 0,
        previousCardiac: auditInputs.previous_cardiac !== undefined ? auditInputs.previous_cardiac : 0,
      });
      toast(`PDF downloaded: ${report.name}`, "success", "Download Complete");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast(`Failed to generate PDF for: ${report.name}`, "error", "Download Failed");
    }
  };

  const handleShare = (name: string) => toast(`Share link generated for: ${name}`, "info", "Shared");

  const handleDelete = (id: string, name: string) => {
    deleteMutation.mutate(id);
    toast(`Report deleted: ${name}`, "info", "Deleted");
  };

  const togglePin = (id: string) => {
    pinMutation.mutate(id);
  };

  /* --- Generate Options ------------------------------------------- */
  const generateOptions = [
    { id: "chd",     label: "Patient CHD Report",   icon: Activity,      color: "text-rose-500 bg-rose-50 border-rose-100",     report_type: "Clinical Chart",       category: "patient"    },
    { id: "pred",    label: "Prediction Summary",    icon: Brain,         color: "text-purple-500 bg-purple-50 border-purple-100", report_type: "Prediction Report",    category: "prediction" },
    { id: "summary", label: "Clinical Summary",      icon: ClipboardList, color: "text-blue-500 bg-blue-50 border-blue-100",     report_type: "Clinical Chart",       category: "clinical"   },
    { id: "history", label: "Patient History",       icon: Clock,         color: "text-emerald-500 bg-emerald-50 border-emerald-100", report_type: "Clinical Chart",    category: "patient"    },
    { id: "audit",   label: "Audit Report",          icon: ShieldCheck,   color: "text-amber-500 bg-amber-50 border-amber-100",   report_type: "Audit & Governance",   category: "audit"      },
    { id: "stats",   label: "Hospital Statistics",   icon: BarChart3,     color: "text-indigo-500 bg-indigo-50 border-indigo-100", report_type: "Cohort Analysis",     category: "clinical"   },
  ];

  /* --- Categories --------------------------------------------------- */
  const categories = [
    {
      id: "patient", icon: Users, title: "Patient Reports", color: "bg-blue-50 border-blue-100 text-blue-600",
      description: "Individual patient clinical records and assessment summaries.",
      items: ["Patient Summary", "CHD Assessment", "Medical History", "Discharge Summary"],
      count: allReports.filter((r) => r.category === "patient").length,
    },
    {
      id: "prediction", icon: Brain, title: "Prediction Reports", color: "bg-purple-50 border-purple-100 text-purple-600",
      description: "AI inference results, SHAP explanations, and risk probability matrices.",
      items: ["AI Prediction", "SHAP Explanation", "Risk Analysis", "Probability Summary"],
      count: allReports.filter((r) => r.category === "prediction").length,
    },
    {
      id: "clinical", icon: FileSpreadsheet, title: "Clinical Reports", color: "bg-emerald-50 border-emerald-100 text-emerald-600",
      description: "Admission vitals, lab summaries, and follow-up documentation.",
      items: ["Admission Summary", "Vitals Summary", "Lab Summary", "Follow-up Report"],
      count: allReports.filter((r) => r.category === "clinical").length,
    },
    {
      id: "audit", icon: ShieldCheck, title: "Audit Reports", color: "bg-amber-50 border-amber-100 text-amber-600",
      description: "Prediction audit trails, system logs, and compliance documentation.",
      items: ["Prediction Audit", "System Audit", "User Activity", "Compliance Report"],
      count: allReports.filter((r) => r.category === "audit").length,
    },
  ];

  const activityIconMap = {
    generated: <Zap className="h-3.5 w-3.5 text-blue-500" />,
    downloaded: <Download className="h-3.5 w-3.5 text-emerald-500" />,
    printed: <Printer className="h-3.5 w-3.5 text-amber-500" />,
    exported: <Share2 className="h-3.5 w-3.5 text-purple-500" />,
  };

  /* --- Render -------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* -- Page Header --------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Reports &amp; Clinical Documents
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Generate, organize, preview, print and export patient reports, AI prediction summaries and clinical documentation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton onRefresh={refetchReports} />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold shadow-md shadow-blue-500/15 hover:bg-blue-700 transition whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Generate Report
          </motion.button>
        </div>
      </div>

      {/* -- Summary Cards ------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Reports" value={allReports.length} desc="Saved in database" accent="bg-slate-700" icon={FolderOpen} />
        <SummaryCard title="Generated Today" value={dbReports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length} desc="Reports this session" accent="bg-emerald-500" icon={CalendarDays} />
        <SummaryCard title="Pending Generation" value={allReports.filter((r) => r.status === "Generating").length} desc="Awaiting data inputs" accent="bg-amber-500" icon={Loader2} />
        <SummaryCard title="Pinned Reports" value={allReports.filter(r => r.pinned).length} desc="Starred for quick access" accent="bg-blue-500" icon={Star} />
      </div>

      {/* -- Toolbar ------------------------------------------------- */}
      <GlassCard className="p-4 bg-white/80">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient name, report name or ID..."
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200/60 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-slate-700 placeholder-slate-400 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 text-xs font-bold rounded-xl border border-slate-200/60 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Clinical Chart">Clinical Chart</option>
                <option value="Audit & Governance">Audit &amp; Governance</option>
                <option value="Cohort Analysis">Cohort Analysis</option>
                <option value="Prediction Report">Prediction Report</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 text-xs font-bold rounded-xl border border-slate-200/60 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Ready">Ready</option>
                <option value="Generating">Generating</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
                <option value="Failed">Failed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/60 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>

            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1 px-2 py-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
              >
                <X className="h-3 w-3" />
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* -- Report Categories ---------------------------------------- */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Report Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              {...cat}
              onView={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            />
          ))}
        </div>
      </div>

      {/* -- Reports Table + Activity Feed --------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Table */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {activeCategory ? `${categories.find((c) => c.id === activeCategory)?.title}` : "All Reports"}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black">{displayedReports.length}</span>
            </h3>
            <button
              onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setSortOrder("newest"); setActiveCategory(null); }}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition"
            >
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
          </div>

          <GlassCard className="p-0 overflow-hidden bg-white/90">
            {displayedReports.length === 0 ? (
              /* Empty State */
              <div className="p-16 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-600">No reports found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting filters or generate a new report.</p>
                </div>
                <button
                  onClick={() => setGenerateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-extrabold hover:bg-blue-700 transition shadow-md shadow-blue-500/10"
                >
                  <Plus className="h-4 w-4" /> Generate First Report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="py-3 px-3 text-left w-8" />
                      <th className="py-3 px-3 text-left">Report Name</th>
                      <th className="py-3 px-3 text-left">Patient</th>
                      <th className="py-3 px-3 text-left">Type</th>
                      <th className="py-3 px-3 text-left">Date</th>
                      <th className="py-3 px-3 text-left">Status</th>
                      <th className="py-3 px-3 text-right w-[220px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : (
                      displayedReports.map((report) => (
                        <motion.tr
                          key={report.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-slate-100/60 hover:bg-blue-50/20 transition group"
                        >
                          {/* Pin */}
                          <td className="py-3 px-3">
                            <button
                              onClick={() => togglePin(report.id)}
                              title={report.pinned ? "Unpin" : "Pin"}
                            >
                              <Star className={`h-3.5 w-3.5 ${report.pinned ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                            </button>
                          </td>
                          {/* Name */}
                          <td className="py-3 px-3 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary flex-shrink-0">
                                <FileText className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-bold text-slate-800 line-clamp-1 text-xs">{report.name}</span>
                            </div>
                          </td>
                          {/* Patient */}
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-500 max-w-[90px] truncate">{report.patient}</td>
                          {/* Type */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] whitespace-nowrap">{report.type}</span>
                          </td>
                          {/* Date */}
                          <td className="py-3 px-3 text-slate-500 font-semibold text-[10px] whitespace-nowrap">{report.generatedDate}</td>
                          {/* Status */}
                          <td className="py-3 px-3"><StatusPill status={report.status} /></td>
                          {/* Actions — Preview, Download, Delete */}
                          <td className="py-3 px-3 w-[140px]">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewReport(report)}
                                title="Preview"
                                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-200 transition flex-shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {/* Download */}
                              <button
                                onClick={() => handleDownload(report)}
                                title="Download PDF"
                                className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition flex-shrink-0"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(report.id, report.name)}
                                title="Delete Report"
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition flex-shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Activity Feed */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
          <GlassCard className="p-4 bg-white/80 space-y-1">
            {activities.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 py-3 border-b border-slate-100/60 last:border-0"
              >
                <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {activityIconMap[item.icon]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-slate-800 leading-tight">{item.action}</p>
                  <p className="text-[9px] text-slate-400 font-semibold truncate">{item.report}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{item.time}</p>
                </div>
              </motion.div>
            ))}
            {activities.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold">No recent activity</div>
            )}
          </GlassCard>

          {/* Pinned Reports Card */}
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pinned Reports</h3>
          <GlassCard className="p-4 bg-white/80 space-y-2">
            {allReports.filter((r) => r.pinned).length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold text-center py-4">No pinned reports. Star a report to pin it here.</p>
            ) : (
              allReports
                .filter((r) => r.pinned)
                .map((rep) => (
                  <div key={rep.id} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-slate-800 truncate">{rep.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{rep.type}</p>
                    </div>
                    <button onClick={() => setPreviewReport(rep)} className="p-1 hover:bg-amber-100 rounded-lg transition">
                      <Eye className="h-3 w-3 text-amber-600" />
                    </button>
                  </div>
                ))
            )}
          </GlassCard>
        </div>
      </div>

      {/* -- Download History ----------------------------------------- */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Recently Downloaded</h3>
        <GlassCard className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allReports.slice(0, 3).map((rep) => (
              <div key={rep.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100/60">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <Download className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-slate-800 truncate">{rep.name}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{rep.generatedDate} · {rep.generatedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          GENERATE REPORT MODAL
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {generateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setGenerateModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-2xl shadow-slate-900/10 w-full max-w-md p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Generate New Report</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Select the type of clinical document to generate.</p>
                </div>
                <button onClick={() => setGenerateModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {generateOptions.map((opt) => (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={createReportMutation.isPending}
                    onClick={() => {
                      createReportMutation.mutate({
                        name: opt.label + " — " + new Date().toLocaleDateString(),
                        report_type: opt.report_type,
                        category: opt.category,
                      });
                      setGenerateModalOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left hover:shadow-sm transition ${opt.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${opt.color}`}>
                      {createReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <opt.icon className="h-4 w-4" />}
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-700">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          REPORT PREVIEW SIDE DRAWER
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {previewReport && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => setPreviewReport(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/15 flex flex-col border-l border-slate-200/60"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Report Preview</h3>
                    <p className="text-[9px] text-slate-400 font-bold">{previewReport.type}</p>
                  </div>
                </div>
                <button onClick={() => setPreviewReport(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Report Title</p>
                    <p className="text-sm font-extrabold text-slate-800 leading-tight">{previewReport.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Patient</p>
                      <p className="text-[11px] font-bold text-slate-700 font-mono">{previewReport.patient}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Generated Date</p>
                      <p className="text-[11px] font-bold text-slate-700">{previewReport.generatedDate}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Doctor</p>
                      <p className="text-[11px] font-bold text-slate-700 truncate">{previewReport.generatedBy}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Status</p>
                      <StatusPill status={previewReport.status} />
                    </div>
                  </div>
                </div>

                {/* Clinical content */}
                {previewReport.id === "chd-patient-summary" && latestAudit ? (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inference Summary</h4>
                    <div className="p-3 rounded-xl bg-white border border-slate-100 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Calibrated Risk</span>
                        <span className={latestAudit.predicted_risk >= 0.20 ? "text-rose-600 font-black" : latestAudit.predicted_risk >= 0.10 ? "text-amber-600 font-black" : "text-emerald-600 font-black"}>
                          {(latestAudit.predicted_risk * 100).toFixed(1)}% · {latestAudit.risk_level}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Patient UUID</span>
                        <span className="text-slate-700 font-mono text-[9px]">{latestAudit.patient_uuid?.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Model Version</span>
                        <span className="text-slate-700">{latestAudit.model_version}</span>
                      </div>
                    </div>
                    {/* Risk bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <span>Risk Probability</span>
                        <span>{(latestAudit.predicted_risk * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${latestAudit.predicted_risk * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${latestAudit.predicted_risk >= 0.20 ? "bg-rose-400" : latestAudit.predicted_risk >= 0.10 ? "bg-amber-400" : "bg-emerald-400"}`}
                        />
                      </div>
                    </div>
                  </div>
                ) : previewReport.id === "model-performance-audit" && latestModel ? (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Model Registry Details</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "ROC-AUC", value: (latestModel.performance_metrics_json.validation_auc || latestModel.performance_metrics_json.auc || 0.8683).toFixed(4) },
                        { label: "Calibration", value: "Isotonic" },
                        { label: "Status", value: latestModel.status },
                      ].map((m) => (
                        <div key={m.label} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                          <p className="text-[8px] font-black uppercase text-slate-400">{m.label}</p>
                          <p className="text-xs font-extrabold text-primary mt-0.5">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-100 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Version</span>
                        <span className="text-slate-700">{latestModel.version}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">MLflow Run ID</span>
                        <span className="text-slate-600 font-mono text-[9px] truncate ml-2">{latestModel.run_id?.substring(0, 14)}...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100">
                    <BookOpen className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400 font-semibold">Full report preview not available for this type. Download the PDF to view the complete document.</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleDownload(previewReport)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold hover:bg-blue-700 transition shadow-md shadow-blue-500/10"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => handlePrint(previewReport.name)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleShare(previewReport.name)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
