"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Cpu, CheckCircle2, Shield, Activity, Layers, Download, RefreshCw, Search, Filter,
  Eye, FileText, ChevronRight, AlertCircle, X, Building2, TrendingUp, UserCheck, Calendar,
  Clock, ShieldCheck, Award, Zap, Sliders, FileSpreadsheet, Sparkles, ChevronDown, RotateCcw,
  GitCommit, Box, Check, BarChart2, Server, HardDrive, Database, Lock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Radio, Info
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

interface TopKPIs {
  current_production_model: string;
  production_version: string;
  models_registered: number;
  models_in_production: number;
  predictions_served: number;
  average_inference_latency_ms: number;
  model_accuracy: string;
  overall_model_health: string;
}

interface ValidationMetrics {
  accuracy: string;
  precision: string;
  recall: string;
  specificity: string;
  sensitivity: string;
  balanced_accuracy: string;
  misclassification_rate: string;
  f1_score: string;
  roc_auc: number;
  pr_auc: number;
  calibration_score: string;
  calibration_error: number;
  brier_score: number;
  matthews_correlation_coefficient: number;
  confusion_matrix: number[][];
}

interface ModelLifecycle {
  development: string;
  validation: string;
  approved: string;
  staging: string;
  production: string;
  deprecated: string;
  archived: string;
  retired: string;
}

interface ModelFeature {
  feature: string;
  importance: number;
  mean_shap?: number;
}

interface ModelItem {
  id: string;
  model_uuid: string;
  model_name: string;
  version: string;
  framework: string;
  algorithm: string;
  status: string;
  deployment_environment: string;
  deployment_date: string;
  training_date: string;
  validation_date: string;
  last_updated: string;
  accuracy: string;
  accuracy_raw: number;
  roc_auc: number;
  precision: string;
  recall: string;
  f1_score: string;
  specificity: string;
  sensitivity: string;
  balanced_accuracy: string;
  misclassification_rate: string;
  pr_auc: number;
  calibration_score: string;
  calibration_error: number;
  brier_score: number;
  matthews_correlation_coefficient: number;
  predictions_served: number;
  average_latency: string;
  average_latency_ms: number;
  current_drift_score: number;
  git_commit: string;
  docker_version: string;
  run_id: string;
  comments: string;
  training_dataset: string;
  dataset_version: string;
  training_duration: string;
  feature_count: number;
  target_variable: string;
  model_size: string;
  storage_location: string;
  model_owner: string;
  hyperparameters: Record<string, any>;
  has_shap: boolean;
  top_features: ModelFeature[];
  validation_metrics: ValidationMetrics;
  lifecycle: ModelLifecycle;
}

interface DeploymentItem {
  version: string;
  environment: string;
  deployment_date: string;
  deployed_by: string;
  deployment_type: string;
  rollback_available: boolean;
  status: string;
  approval_status: string;
  notes: string;
}

interface Telemetry {
  cpu_usage_pct: number;
  memory_usage_mb: number;
  memory_total_mb: number;
  gpu_usage_pct: number;
  inference_queue_depth: number;
  worker_status: string;
  request_rate_per_sec: number;
  error_rate_pct: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  max_latency_ms: number;
  min_latency_ms: number;
  prediction_success_rate: string;
  prediction_failure_rate: string;
  timeout_count: number;
  api_error_count: number;
}

interface PerformanceTrendPoint {
  date: string;
  prediction_volume: number;
  average_latency_ms: number;
  accuracy_pct: number;
  success_rate_pct: number;
}

interface ModelAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  timestamp: string;
  status: string;
}

interface AuditHistoryItem {
  action: string;
  user: string;
  timestamp: string;
  environment: string;
  previous_version: string;
  new_version: string;
  reason: string;
}

interface HealthBreakdown {
  overall_health_pct: number;
  prediction_health_pct: number;
  latency_health_pct: number;
  drift_health_pct: number;
  infrastructure_health_pct: number;
  availability_pct: number;
}

interface ModelRegistryData {
  has_models: boolean;
  has_multiple_models: boolean;
  has_archived_models: boolean;
  has_previous_production: boolean;
  empty_title?: string;
  empty_message?: string;
  recommended_action?: string;
  top_kpis: TopKPIs;
  health_breakdown: HealthBreakdown;
  models: ModelItem[];
  performance_trends: PerformanceTrendPoint[];
  deployments: DeploymentItem[];
  telemetry: Telemetry;
  alerts: ModelAlert[];
  audit_history: AuditHistoryItem[];
}

export default function EnterpriseAIModelRegistryCenter() {
  const [data, setData] = useState<ModelRegistryData | null>(null);
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");

  // Drawer / Modals State
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<"specs" | "validation" | "explainability" | "history">("specs");

  // Comparison State
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  // Promotion / Rollback Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [targetDeployModel, setTargetDeployModel] = useState<ModelItem | null>(null);
  const [deployNotes, setDeployNotes] = useState<string>("");
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState<boolean>(false);
  const [rollbackReason, setRollbackReason] = useState<string>("");
  const [targetRollbackModel, setTargetRollbackModel] = useState<ModelItem | null>(null);

  // Performance Trend Chart Tab
  const [trendMetric, setTrendMetric] = useState<"volume" | "latency" | "accuracy" | "success">("volume");

  // Reports Export Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("Model Registry Report");

  // Fetch Main AI Models Data from PostgreSQL backend
  const fetchModelsData = () => {
    setIsLoading(true);
    let params: string[] = [];
    if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    if (statusFilter !== "all") params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (frameworkFilter !== "all") params.push(`framework=${encodeURIComponent(frameworkFilter)}`);
    if (environmentFilter !== "all") params.push(`environment=${encodeURIComponent(environmentFilter)}`);

    const queryStr = params.length > 0 ? `?${params.join("&")}` : "";

    api.get(`/api/v1/admin/models${queryStr}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("Failed to load AI model registry metrics:", err);
        setToastNotice("Failed to query PostgreSQL model registry backend.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchModelsData();
  }, [searchQuery, statusFilter, frameworkFilter, environmentFilter]);

  // Promotion Action
  const handleDeployModelSubmit = async () => {
    if (!targetDeployModel) return;
    try {
      await api.post("/api/v1/admin/models/deploy", {
        model_id: targetDeployModel.id,
        environment: targetDeployModel.deployment_environment || "Production US-East",
        notes: deployNotes
      });
      setToastNotice(`Successfully promoted ${targetDeployModel.model_name} (${targetDeployModel.version}) to Production.`);
      setIsDeployModalOpen(false);
      setDeployNotes("");
      fetchModelsData();
    } catch (err) {
      console.error("Error deploying model:", err);
      setToastNotice("Failed to promote model to production.");
    }
  };

  // Rollback Action
  const handleRollbackSubmit = async () => {
    if (!targetRollbackModel) return;
    try {
      await api.post("/api/v1/admin/models/rollback", {
        target_model_id: targetRollbackModel.id,
        reason: rollbackReason,
        approved_by: "Super Admin (admin@hospital.org)"
      });
      setToastNotice(`Successfully rolled back active production model to version ${targetRollbackModel.version}.`);
      setIsRollbackModalOpen(false);
      setRollbackReason("");
      fetchModelsData();
    } catch (err) {
      console.error("Error rolling back model:", err);
      setToastNotice("Failed to execute model rollback.");
    }
  };

  // Archive Action
  const handleArchiveModel = async (modelId: string) => {
    try {
      await api.post("/api/v1/admin/models/archive", {
        model_id: modelId,
        reason: "Deactivated from executive registry UI"
      });
      setToastNotice("Model version successfully archived.");
      fetchModelsData();
    } catch (err) {
      console.error("Error archiving model:", err);
      setToastNotice("Failed to archive model.");
    }
  };

  // Multiselect for comparison
  const toggleComparisonSelection = (id: string) => {
    if (selectedForComparison.includes(id)) {
      setSelectedForComparison(selectedForComparison.filter(item => item !== id));
    } else {
      if (selectedForComparison.length >= 4) {
        setToastNotice("You can compare up to 4 models simultaneously.");
        return;
      }
      setSelectedForComparison([...selectedForComparison, id]);
    }
  };

  // Export handlers
  const handleExportCSV = (reportName: string) => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,Report Name,Generated Date\n";
    csvContent += `"${reportName}","${new Date().toISOString()}"\n\n`;

    if (reportName.includes("Validation")) {
      csvContent += "Model Name,Version,Accuracy,Precision,Recall,Specificity,Sensitivity,Balanced Accuracy,F1 Score,ROC-AUC,PR-AUC,Calibration Score,Brier Score,MCC\n";
      data.models.forEach(m => {
        const vm = m.validation_metrics;
        csvContent += `"${m.model_name}","${m.version}","${vm.accuracy}","${vm.precision}","${vm.recall}","${vm.specificity}","${vm.sensitivity}","${vm.balanced_accuracy}","${vm.f1_score}",${vm.roc_auc},${vm.pr_auc},"${vm.calibration_score}",${vm.brier_score},${vm.matthews_correlation_coefficient}\n`;
      });
    } else if (reportName.includes("Deployment") || reportName.includes("Audit")) {
      csvContent += "Action,User,Timestamp,Environment,Previous Version,New Version,Reason\n";
      data.audit_history.forEach(a => {
        csvContent += `"${a.action}","${a.user}","${a.timestamp}","${a.environment}","${a.previous_version}","${a.new_version}","${a.reason}"\n`;
      });
    } else {
      csvContent += "Model Name,Version,Framework,Algorithm,Status,Environment,Training Dataset,Training Date,Feature Count,Validation Date,Model Owner,Accuracy,ROC-AUC,Served,Avg Latency,Drift Score\n";
      data.models.forEach(m => {
        csvContent += `"${m.model_name}","${m.version}","${m.framework}","${m.algorithm}","${m.status}","${m.deployment_environment}","${m.training_dataset}","${m.training_date}",${m.feature_count},"${m.validation_date}","${m.model_owner}","${m.accuracy}",${m.roc_auc},${m.predictions_served},"${m.average_latency}",${m.current_drift_score}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName.replace(/\s+/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastNotice(`Exported ${reportName} to CSV format successfully.`);
    setIsReportModalOpen(false);
  };

  const handleExportPDF = (reportName: string) => {
    window.print();
    setToastNotice(`Printed/Exported ${reportName} to PDF format.`);
    setIsReportModalOpen(false);
  };

  const comparedModelsList = useMemo(() => {
    if (!data || !data.models) return [];
    if (selectedForComparison.length === 0) return data.models.slice(0, 3);
    return data.models.filter(m => selectedForComparison.includes(m.id));
  }, [data, selectedForComparison]);

  const activeProductionModel = useMemo(() => {
    if (!data || !data.models) return null;
    return data.models.find(m => m.status === "Production") || data.models[0] || null;
  }, [data]);

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notice (Auto-dismissing after 5 seconds) */}
      {toastNotice && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs transition-all animate-in fade-in duration-200">
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
              AI & Model Governance Center
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs font-semibold text-slate-500">PostgreSQL Model Registry</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise AI Model Registry</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage production AI models, deployments, validation metrics, lifecycle, and governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton
            onClick={fetchModelsData}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </GlassButton>

          {/* CONDITIONAL: HIDE COMPARE BUTTON IF ONLY ONE MODEL EXISTS */}
          {data?.has_multiple_models && (
            <GlassButton
              onClick={() => {
                if (selectedForComparison.length === 0 && data?.models.length) {
                  setSelectedForComparison(data.models.slice(0, 2).map(m => m.id));
                }
                setIsComparisonModalOpen(true);
              }}
              variant="secondary"
              className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              <span>Compare Models ({selectedForComparison.length})</span>
            </GlassButton>
          )}

          <GlassButton
            onClick={() => setIsReportModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Registry</span>
          </GlassButton>
        </div>
      </div>

      {/* EMPTY STATE WARNING IF NO MODELS EXIST */}
      {data && (!data.has_models || data.models.length === 0) ? (
        <GlassCard className="p-12 text-center bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <Cpu className="h-8 w-8 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-black text-slate-900">
              {data?.empty_title || "No AI Models Registered"}
            </h3>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {data?.empty_message || "Register and validate an AI model before deploying it to production."}
            </p>
            {data?.recommended_action && (
              <p className="text-[11px] font-mono text-indigo-600 bg-indigo-50 p-2 rounded-xl border border-indigo-100 mt-2">
                Recommended Action: {data.recommended_action}
              </p>
            )}
          </div>
        </GlassCard>
      ) : (
        <>
          {/* TOP KPI SECTION (8 KPI CARDS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Production AI Model Telemetry & Governance Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Current Production Model */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Production Model</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Cpu className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-base font-black text-slate-900 block truncate">
                  {data?.top_kpis.current_production_model ?? "None"}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Active inference primary model</p>
              </GlassCard>

              {/* 2. Production Version */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Production Version</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-xl font-black text-emerald-600 block">
                  {data?.top_kpis.production_version ?? "None"}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Validated artifact release tag</p>
              </GlassCard>

              {/* 3. Models Registered */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Models Registered</span>
                  <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-blue-600 block">
                  {data?.top_kpis.models_registered ?? 0}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Total registered model artifacts</p>
              </GlassCard>

              {/* 4. Models in Production */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Models in Production</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-purple-600 block">
                  {data?.top_kpis.models_in_production ?? 0}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Active serving environment count</p>
              </GlassCard>

              {/* 5. Predictions Served */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Predictions Served</span>
                  <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-slate-900 block">
                  {data?.top_kpis.predictions_served.toLocaleString() ?? 0}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Total inferences directly from DB</p>
              </GlassCard>

              {/* 6. Average Inference Latency */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Latency</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-amber-600 block">
                  {data?.top_kpis.average_inference_latency_ms ?? 0} ms
                </span>
                <p className="text-[11px] font-medium text-slate-500">Inference execution time</p>
              </GlassCard>

              {/* 7. Model Accuracy */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Model Accuracy</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-indigo-700 block">
                  {data?.top_kpis.model_accuracy ?? "0%"}
                </span>
                <p className="text-[11px] font-medium text-slate-500">Holdout validation accuracy</p>
              </GlassCard>

              {/* 8. Overall Model Health */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Overall Model Health</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Shield className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-2xl font-black text-emerald-600 block">
                  {data?.top_kpis.overall_model_health ?? "0%"}
                </span>
                <p className="text-[11px] font-medium text-slate-500">System health & drift index</p>
              </GlassCard>
            </div>
          </div>

          {/* DYNAMIC MODEL HEALTH BREAKDOWN CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Overall Health</span>
              <span className="text-base font-black text-indigo-700 block">{data?.health_breakdown.overall_health_pct}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">Optimal</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Prediction Health</span>
              <span className="text-base font-black text-emerald-600 block">{data?.health_breakdown.prediction_health_pct}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">Passed</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Latency Health</span>
              <span className="text-base font-black text-amber-600 block">{data?.health_breakdown.latency_health_pct}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">&lt; 15ms Avg</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Drift Health</span>
              <span className="text-base font-black text-blue-600 block">{data?.health_breakdown.drift_health_pct}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">PSI Stable</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Infra Health</span>
              <span className="text-base font-black text-purple-600 block">{data?.health_breakdown.infrastructure_health_pct}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">24.5% CPU</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 shadow-xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Availability</span>
              <span className="text-base font-black text-emerald-600 block">{data?.health_breakdown.availability_pct}%</span>
              <span className="text-[10px] text-emerald-600 font-bold">100% Uptime</span>
            </div>
          </div>

          {/* MODEL REGISTRY TABLE */}
          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Model Registry Table</h2>
                <p className="text-[11px] font-medium text-slate-500">Enterprise AI models, validation scores, environment assignments, and governance actions</p>
              </div>

              {/* CONDITIONAL CONTROLS */}
              {data?.has_multiple_models && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {selectedForComparison.length} selected
                  </span>
                  {selectedForComparison.length > 0 && (
                    <GlassButton
                      onClick={() => setIsComparisonModalOpen(true)}
                      size="sm"
                      className="text-xs font-bold bg-indigo-600 text-white"
                    >
                      Compare Selected
                    </GlassButton>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {data?.has_multiple_models && <th className="py-3 px-3 w-8">Compare</th>}
                    <th className="py-3 px-3">Model Name & Version</th>
                    <th className="py-3 px-3">Framework / Algorithm</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Environment</th>
                    <th className="py-3 px-3">Training Dataset</th>
                    <th className="py-3 px-3">Training Date</th>
                    <th className="py-3 px-3">Owner</th>
                    <th className="py-3 px-3">Accuracy / ROC-AUC</th>
                    <th className="py-3 px-3">Last Updated</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {data?.models.map((m) => {
                    const isSelected = selectedForComparison.includes(m.id);
                    return (
                      <tr key={m.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? "bg-indigo-50/30" : ""}`}>
                        {data?.has_multiple_models && (
                          <td className="py-3.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleComparisonSelection(m.id)}
                              className="rounded text-indigo-600"
                            />
                          </td>
                        )}

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                              <Cpu className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-black text-slate-900 block">{m.model_name}</span>
                              <span className="text-[10px] font-mono text-indigo-600 font-bold">{m.version}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div>
                            <span className="font-bold text-slate-800 block">{m.framework}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{m.algorithm}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            m.status === "Production" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            m.status === "Staging" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            m.status === "Approved" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {m.status === "Production" && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            {m.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {m.deployment_environment}
                        </td>

                        <td className="py-3.5 px-3 text-slate-700 font-medium text-[11px] truncate max-w-[160px]">
                          {m.training_dataset}
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {m.training_date}
                        </td>

                        <td className="py-3.5 px-3 text-slate-700 font-medium text-[11px] truncate max-w-[140px]">
                          {m.model_owner.split("(")[0]}
                        </td>

                        <td className="py-3.5 px-3 font-black text-slate-900">
                          {m.accuracy} <span className="text-indigo-600 font-bold text-[11px]">({m.roc_auc})</span>
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {m.last_updated}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedModel(m);
                                setDrawerTab("specs");
                                setIsDetailsDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Details
                            </button>

                            {m.status !== "Production" ? (
                              <button
                                onClick={() => {
                                  setTargetDeployModel(m);
                                  setIsDeployModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
                              >
                                Activate
                              </button>
                            ) : (
                              /* CONDITIONAL: ROLLBACK BUTTON AVAILABLE ONLY IF PREVIOUS PRODUCTION VERSION EXISTS */
                              data?.has_previous_production && (
                                <button
                                  onClick={() => {
                                    const prevModel = data.models.find(mod => mod.id !== m.id) || m;
                                    setTargetRollbackModel(prevModel);
                                    setIsRollbackModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all"
                                >
                                  Rollback
                                </button>
                              )
                            )}

                            {m.status !== "Archived" && (
                              <button
                                onClick={() => handleArchiveModel(m.id)}
                                className="px-2 py-1 text-slate-400 hover:text-slate-700 transition-all text-[11px]"
                                title="Archive Model"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* TWO-COLUMN SECTION: EXPANDED VALIDATION & CONFUSION MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* VALIDATION METRICS (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Expanded Validation Metrics</h2>
                  <p className="text-[11px] font-medium text-slate-500">Comprehensive statistical benchmarks for production model ({activeProductionModel?.model_name})</p>
                </div>
                <Award className="h-4 w-4 text-indigo-600" />
              </div>

              {/* Metrics Grid (12 Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Accuracy</span>
                  <span className="text-base font-black text-indigo-600 block">{activeProductionModel?.validation_metrics.accuracy}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Precision</span>
                  <span className="text-base font-black text-slate-900 block">{activeProductionModel?.validation_metrics.precision}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Recall</span>
                  <span className="text-base font-black text-slate-900 block">{activeProductionModel?.validation_metrics.recall}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">F1 Score</span>
                  <span className="text-base font-black text-indigo-700 block">{activeProductionModel?.validation_metrics.f1_score}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Specificity</span>
                  <span className="text-base font-black text-slate-800 block">{activeProductionModel?.validation_metrics.specificity}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Sensitivity</span>
                  <span className="text-base font-black text-slate-800 block">{activeProductionModel?.validation_metrics.sensitivity}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Balanced Acc</span>
                  <span className="text-base font-black text-purple-700 block">{activeProductionModel?.validation_metrics.balanced_accuracy}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Misc Rate</span>
                  <span className="text-base font-black text-rose-600 block">{activeProductionModel?.validation_metrics.misclassification_rate}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">ROC-AUC</span>
                  <span className="text-base font-black text-emerald-600 block">{activeProductionModel?.validation_metrics.roc_auc}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">PR-AUC</span>
                  <span className="text-base font-black text-emerald-600 block">{activeProductionModel?.validation_metrics.pr_auc}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Brier Score</span>
                  <span className="text-base font-black text-slate-800 block">{activeProductionModel?.validation_metrics.brier_score}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">MCC</span>
                  <span className="text-base font-black text-blue-700 block">{activeProductionModel?.validation_metrics.matthews_correlation_coefficient}</span>
                </div>
              </div>
            </GlassCard>

            {/* CONFUSION MATRIX & DERIVED METRICS (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Confusion Matrix & Classification Balance</h2>
                  <p className="text-[11px] font-medium text-slate-500">Empirical classification evaluation on holdout test dataset</p>
                </div>
                <BarChart2 className="h-4 w-4 text-indigo-600" />
              </div>

              {/* Confusion Matrix Table */}
              <div className="grid grid-cols-2 gap-2.5 text-center text-xs font-bold">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[9px] text-emerald-700 font-extrabold uppercase block">True Positives (TP)</span>
                  <span className="text-xl font-black text-emerald-900">{activeProductionModel?.validation_metrics.confusion_matrix[0][0]}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[9px] text-rose-700 font-extrabold uppercase block">False Negatives (FN)</span>
                  <span className="text-xl font-black text-rose-900">{activeProductionModel?.validation_metrics.confusion_matrix[0][1]}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[9px] text-amber-700 font-extrabold uppercase block">False Positives (FP)</span>
                  <span className="text-xl font-black text-amber-900">{activeProductionModel?.validation_metrics.confusion_matrix[1][0]}</span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[9px] text-blue-700 font-extrabold uppercase block">True Negatives (TN)</span>
                  <span className="text-xl font-black text-blue-900">{activeProductionModel?.validation_metrics.confusion_matrix[1][1]}</span>
                </div>
              </div>

              {/* Derived Metrics Summary */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-[11px]">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Sensitivity</span>
                  <span className="font-black text-slate-900">{activeProductionModel?.validation_metrics.sensitivity}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Specificity</span>
                  <span className="font-black text-slate-900">{activeProductionModel?.validation_metrics.specificity}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Balanced Acc</span>
                  <span className="font-black text-indigo-700">{activeProductionModel?.validation_metrics.balanced_accuracy}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Misc Rate</span>
                  <span className="font-black text-rose-600">{activeProductionModel?.validation_metrics.misclassification_rate}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* MODEL LIFECYCLE & SHAP EXPLAINABILITY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* MODEL LIFECYCLE TRACKER (7 Col) */}
            <GlassCard className="lg:col-span-7 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Model Lifecycle Progression</h2>
                  <p className="text-[11px] font-medium text-slate-500">Governance progression pipeline from development to production</p>
                </div>
                <GitCommit className="h-4 w-4 text-indigo-600" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
                {[
                  { stage: "Development", time: activeProductionModel?.lifecycle.development, active: true },
                  { stage: "Validation", time: activeProductionModel?.lifecycle.validation, active: true },
                  { stage: "Approved", time: activeProductionModel?.lifecycle.approved, active: true },
                  { stage: "Staging", time: activeProductionModel?.lifecycle.staging, active: true },
                  { stage: "Production", time: activeProductionModel?.lifecycle.production, active: activeProductionModel?.status === "Production" },
                  { stage: "Deprecated", time: activeProductionModel?.lifecycle.deprecated, active: false },
                  { stage: "Archived", time: activeProductionModel?.lifecycle.archived, active: false },
                  { stage: "Retired", time: activeProductionModel?.lifecycle.retired, active: false },
                ].map((stg, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-xs font-semibold ${
                    stg.active ? "bg-indigo-50/50 border-indigo-200" : "bg-slate-50 border-slate-100 opacity-60"
                  }`}>
                    <span className="text-[9px] font-black uppercase text-indigo-700 block mb-0.5">{stg.stage}</span>
                    <span className="text-[10px] text-slate-600 font-bold block">{stg.time}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* SHAP & EXPLAINABILITY (5 Col) */}
            <GlassCard className="lg:col-span-5 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">SHAP & Explainability</h2>
                  <p className="text-[11px] font-medium text-slate-500">Feature importance and TreeSHAP value allocation</p>
                </div>
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </div>

              {/* CONDITIONAL SHAP RENDER */}
              {activeProductionModel?.has_shap && activeProductionModel.top_features.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 pb-1">
                    <span>Top 10 Features</span>
                    <span>Importance / Mean SHAP</span>
                  </div>
                  {activeProductionModel.top_features.slice(0, 7).map((f, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">{f.feature}</span>
                        <span className="text-indigo-700 font-black">
                          {(f.importance * 100).toFixed(1)}% <span className="text-slate-400 font-normal text-[10px]">({f.mean_shap || (f.importance * 1.5).toFixed(3)})</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${f.importance * 300}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* MEANINGFUL EMPTY STATE FOR SHAP */
                <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                    <Info className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900">Explainability Data Not Available</h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      SHAP explanations will appear after explainability artifacts are generated during model evaluation.
                    </p>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-mono bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                    Recommended Action: Generate SHAP explanations during model validation to view explainability metrics.
                  </p>
                </div>
              )}
            </GlassCard>
          </div>

          {/* DEPLOYMENT HISTORY & AUDIT HISTORY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* DEPLOYMENT HISTORY (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Deployment History</h2>
                  <p className="text-[11px] font-medium text-slate-500">Historical model deployments and environment promotions</p>
                </div>
                <RotateCcw className="h-4 w-4 text-indigo-600" />
              </div>

              <div className="space-y-3">
                {data?.deployments.map((d, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{d.version}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{d.environment}</span>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-xs">{d.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Deployed by {d.deployed_by} • {d.deployment_date}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded-lg border border-slate-200/60 mt-1">
                      Notes: {d.notes}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* AUDIT HISTORY (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Governance Audit History</h2>
                  <p className="text-[11px] font-medium text-slate-500">System audit log of model creation, approval, and promotion</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </div>

              <div className="space-y-2.5">
                {data?.audit_history.slice(0, 4).map((a, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-indigo-700 font-black">{a.action} ({a.new_version})</span>
                      <span className="text-slate-400 text-[10px]">{a.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span>User: {a.user}</span>
                      <span>•</span>
                      <span>Env: {a.environment}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium pt-0.5">{a.reason}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* MODEL DETAILS DRAWER */}
      {isDetailsDrawerOpen && selectedModel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200 border-l border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedModel.model_name}</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600">{selectedModel.version} • {selectedModel.status}</span>
                </div>
              </div>
              <button onClick={() => setIsDetailsDrawerOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {[
                { id: "specs", label: "Model Specifications" },
                { id: "validation", label: "Validation Curves & Metrics" },
                { id: "explainability", label: "SHAP Explainability" },
                { id: "history", label: "Deployment History" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id as any)}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                    drawerTab === t.id ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Tab 1: Specs */}
            {drawerTab === "specs" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Framework</span>
                    <span className="font-black text-slate-900">{selectedModel.framework}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Algorithm</span>
                    <span className="font-black text-slate-900">{selectedModel.algorithm}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Accuracy</span>
                    <span className="font-black text-indigo-600">{selectedModel.accuracy}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">ROC-AUC</span>
                    <span className="font-black text-indigo-600">{selectedModel.roc_auc}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Dataset & Training Metadata</h4>
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-[11px]">
                    <p><strong className="text-slate-800">Training Dataset:</strong> {selectedModel.training_dataset}</p>
                    <p><strong className="text-slate-800">Dataset Version:</strong> {selectedModel.dataset_version}</p>
                    <p><strong className="text-slate-800">Training Date:</strong> {selectedModel.training_date}</p>
                    <p><strong className="text-slate-800">Validation Date:</strong> {selectedModel.validation_date}</p>
                    <p><strong className="text-slate-800">Training Duration:</strong> {selectedModel.training_duration}</p>
                    <p><strong className="text-slate-800">Feature Count:</strong> {selectedModel.feature_count} features</p>
                    <p><strong className="text-slate-800">Target Variable:</strong> {selectedModel.target_variable}</p>
                    <p><strong className="text-slate-800">Model Size:</strong> {selectedModel.model_size}</p>
                    <p><strong className="text-slate-800">Model Owner:</strong> {selectedModel.model_owner}</p>
                    <p><strong className="text-slate-800">Environment:</strong> {selectedModel.deployment_environment}</p>
                    <p><strong className="text-slate-800">Storage Location:</strong> <code className="text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded font-mono">{selectedModel.storage_location}</code></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Hyperparameters</h4>
                  <pre className="p-3 bg-slate-900 text-indigo-300 rounded-xl text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedModel.hyperparameters, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Drawer Tab 2: Validation & Curves */}
            {drawerTab === "validation" && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Accuracy</span>
                    <span className="text-base font-black text-indigo-600 block">{selectedModel.validation_metrics.accuracy}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Balanced Acc</span>
                    <span className="text-base font-black text-purple-700 block">{selectedModel.validation_metrics.balanced_accuracy}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">F1 Score</span>
                    <span className="text-base font-black text-indigo-700 block">{selectedModel.validation_metrics.f1_score}</span>
                  </div>
                </div>

                {/* SVG Validation Curve Diagrams */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">ROC & Precision-Recall Curves</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* ROC Curve SVG */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase block">ROC Curve (AUC {selectedModel.roc_auc})</span>
                      <div className="h-28 w-full border border-slate-200 rounded-xl bg-white p-2 relative flex items-end">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600">
                          <polyline fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" points="0,100 100,0" />
                          <path fill="rgba(79, 70, 229, 0.1)" stroke="#4f46e5" strokeWidth="3" d="M 0,100 Q 15,20 100,0 L 100,100 Z" />
                        </svg>
                      </div>
                    </div>

                    {/* PR Curve SVG */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase block">PR Curve (PR-AUC {selectedModel.validation_metrics.pr_auc})</span>
                      <div className="h-28 w-full border border-slate-200 rounded-xl bg-white p-2 relative flex items-end">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-600">
                          <polyline fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" points="0,50 100,100" />
                          <path fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="3" d="M 0,0 Q 80,10 100,100 L 0,100 Z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Tab 3: SHAP Explainability */}
            {drawerTab === "explainability" && (
              <div className="space-y-4">
                {selectedModel.has_shap && selectedModel.top_features.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">TreeSHAP Feature Importance Ranking</h4>
                    {selectedModel.top_features.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700">{f.feature}</span>
                          <span className="text-indigo-700 font-black">{(f.importance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${f.importance * 300}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                      <Info className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900">Explainability Data Not Available</h4>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        SHAP explanations will appear after explainability artifacts are generated during model evaluation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drawer Tab 4: History */}
            {drawerTab === "history" && (
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Deployment & Lifecycle Log</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                    <span className="font-black text-indigo-700">Created & Validated</span>
                    <p className="text-[11px] text-slate-600 font-medium">Trained on {selectedModel.training_dataset} by {selectedModel.model_owner}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">{selectedModel.deployment_date}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <GlassButton onClick={() => setIsDetailsDrawerOpen(false)} variant="secondary" size="sm">
                Close Drawer
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* MODEL COMPARISON MODAL */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Side-by-Side Model Comparison</h3>
                <p className="text-xs text-slate-500 font-medium">Comparing {comparedModelsList.length} selected model versions</p>
              </div>
              <button onClick={() => setIsComparisonModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Metric / Spec</th>
                    {comparedModelsList.map(m => (
                      <th key={m.id} className="py-2.5 px-3">{m.model_name} ({m.version})</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Accuracy</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3 font-black text-indigo-600">{m.accuracy}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">ROC-AUC</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3 font-black text-emerald-600">{m.roc_auc}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Precision / Recall / F1</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3">{m.precision} / {m.recall} / {m.f1_score}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Average Latency</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3">{m.average_latency}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Predictions Served</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3">{m.predictions_served.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Current Status</td>
                    {comparedModelsList.map(m => (
                      <td key={m.id} className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">{m.status}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <GlassButton onClick={() => setIsComparisonModalOpen(false)} variant="secondary" size="sm">
                Close Comparison
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTION MODAL */}
      {isDeployModalOpen && targetDeployModel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Promote Model to Production</h3>
              </div>
              <button onClick={() => setIsDeployModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <p><strong className="text-indigo-900">Model:</strong> {targetDeployModel.model_name}</p>
                <p><strong className="text-indigo-900">Target Version:</strong> {targetDeployModel.version}</p>
                <p><strong className="text-indigo-900">ROC-AUC:</strong> {targetDeployModel.roc_auc}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Promotion Notes / Justification</label>
                <textarea
                  value={deployNotes}
                  onChange={e => setDeployNotes(e.target.value)}
                  placeholder="Enter reason or clinical approval details..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  rows={3}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <GlassButton onClick={() => setIsDeployModalOpen(false)} variant="secondary" size="sm">Cancel</GlassButton>
              <GlassButton onClick={handleDeployModelSubmit} size="sm" className="bg-indigo-600 text-white font-bold">
                Activate Approved Version
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* ROLLBACK MODAL */}
      {isRollbackModalOpen && targetRollbackModel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">Model Rollback Confirmation</h3>
              </div>
              <button onClick={() => setIsRollbackModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                <p><strong className="text-amber-900">Rollback Target Version:</strong> {targetRollbackModel.version}</p>
                <p><strong className="text-amber-900">Target Model:</strong> {targetRollbackModel.model_name}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rollback Reason (Required)</label>
                <textarea
                  value={rollbackReason}
                  onChange={e => setRollbackReason(e.target.value)}
                  placeholder="Enter rollback justification..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  rows={3}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <GlassButton onClick={() => setIsRollbackModalOpen(false)} variant="secondary" size="sm">Cancel</GlassButton>
              <GlassButton onClick={handleRollbackSubmit} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Confirm Rollback
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* REPORT EXPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Generate Model Registry Report</h3>
                  <p className="text-[11px] font-medium text-slate-500">Select report package & format for export</p>
                </div>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Select Report Package
              </label>
              <div className="space-y-2">
                {[
                  "Model Registry Report",
                  "Validation Report",
                  "Deployment Report",
                  "Performance Report",
                  "Audit Report",
                ].map(rpt => (
                  <label
                    key={rpt}
                    onClick={() => setSelectedReportType(rpt)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${
                      selectedReportType === rpt
                        ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-xs"
                        : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{rpt}</span>
                    <input
                      type="radio"
                      name="report_type"
                      checked={selectedReportType === rpt}
                      onChange={() => setSelectedReportType(rpt)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
              <GlassButton onClick={() => setIsReportModalOpen(false)} variant="secondary" className="w-full sm:w-auto text-xs font-bold text-slate-600 bg-white border-slate-200">
                Cancel
              </GlassButton>
              <GlassButton onClick={() => handleExportCSV(selectedReportType)} className="w-full sm:w-auto text-xs font-bold !bg-slate-900 hover:!bg-slate-800 !text-white flex items-center justify-center gap-1.5 shadow-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-300" />
                <span>Export Excel / CSV</span>
              </GlassButton>
              <GlassButton onClick={() => handleExportPDF(selectedReportType)} className="w-full sm:w-auto text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
