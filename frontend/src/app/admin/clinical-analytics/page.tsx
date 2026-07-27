"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart, BarChart3, Heart, Activity, ShieldAlert, Download, RefreshCw, Search, Filter,
  Eye, FileText, ChevronRight, AlertCircle, X, Building2, TrendingUp, UserCheck, Calendar,
  Layers, Clock, ShieldCheck, CheckCircle2, Award, Zap, Stethoscope, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, Sliders, FileSpreadsheet, Sparkles, ChevronDown, Users
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

interface TopKPIs {
  high_risk_population: number;
  critical_risk_patients: number;
  average_chd_risk_pct: number;
  average_blood_pressure: string;
  average_systolic_bp: number;
  average_diastolic_bp: number;
  average_cholesterol: string;
  average_blood_glucose: string;
  average_bmi: string;
  clinical_quality_score: string;
}

interface DiseaseBurdenItem {
  disease: string;
  patient_count: number;
  percentage: number;
  monthly_trend: string;
  department_comparison: string;
}

interface RiskDistributionLevel {
  count: number;
  pct: number;
}

interface RiskDistribution {
  very_low: RiskDistributionLevel;
  low: RiskDistributionLevel;
  moderate: RiskDistributionLevel;
  high: RiskDistributionLevel;
  very_high: RiskDistributionLevel;
}

interface ClinicalOutcomes {
  prediction_success_rate: string;
  treatment_followup_rate: string;
  critical_patient_monitoring_pct: string;
  risk_improvement_rate: string;
  clinical_compliance: string;
  readmission_rate: string;
  average_recovery_time_days: string;
}

interface DepartmentPerformanceItem {
  department: string;
  patients: number;
  predictions: number;
  average_risk_pct: number;
  average_blood_pressure: string;
  average_cholesterol_mgdl: number;
  average_bmi: number;
  clinical_quality_score: string;
}

interface HospitalComparisonItem {
  hospital_name: string;
  code: string;
  clinical_quality_score: string;
  high_risk_population: number;
  average_risk_pct: string;
  prediction_volume: number;
  clinical_compliance: string;
}

interface TrendPoint {
  period: string;
  total_predictions: number;
  high_risk_count: number;
  average_risk_pct: number;
}

interface RiskTrends {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  monthly: TrendPoint[];
  yearly: TrendPoint[];
}

interface QualityIndicators {
  average_consultation_time_mins: number;
  documentation_completeness_pct: string;
  prediction_coverage_pct: string;
  followup_completion_pct: string;
  ai_utilization_rate: string;
  compliance_score: string;
}

interface ExecutiveSummary {
  highest_risk_department: string;
  hospital_requiring_intervention: string;
  population_trend: string;
  clinical_improvement_trend: string;
  immediate_followup_required: number;
  highest_accuracy_department: string;
}

interface PatientCohorts {
  age_groups: { under_30: number; age_30_45: number; age_45_60: number; age_60_75: number; over_75: number };
  gender: { male: number; female: number };
  smoking: { smokers: number; non_smokers: number };
  diabetes: { diabetic: number; non_diabetic: number };
  hypertension: { hypertensive: number; normal: number };
  bmi_categories: { normal: number; overweight: number; obese: number };
  cholesterol_categories: { desirable: number; borderline: number; high: number };
}

interface ClinicalIntelligenceData {
  has_data: boolean;
  empty_message?: string;
  top_kpis: TopKPIs;
  disease_burden: DiseaseBurdenItem[];
  risk_distribution: RiskDistribution;
  clinical_outcomes: ClinicalOutcomes;
  department_performance: DepartmentPerformanceItem[];
  hospital_comparison: HospitalComparisonItem[];
  ai_clinical_insights: string[];
  risk_trends: RiskTrends;
  patient_cohorts: PatientCohorts;
  quality_indicators: QualityIndicators;
  executive_summary: ExecutiveSummary;
}

export default function EnterpriseClinicalIntelligenceCenter() {
  const [data, setData] = useState<ClinicalIntelligenceData | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedHospital, setSelectedHospital] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedDisease, setSelectedDisease] = useState<string>("all");
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");

  // Visualizations Toggles
  const [riskVizTab, setRiskVizTab] = useState<"pie" | "bar" | "trend">("pie");
  const [trendTab, setTrendTab] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [cohortTab, setCohortTab] = useState<"age" | "gender" | "smoking" | "diabetes" | "hypertension" | "bmi" | "cholesterol">("age");

  // Report Export Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("Clinical Intelligence Report");

  // Fetch Hospitals & Departments
  useEffect(() => {
    api.get("/api/v1/admin/hospitals")
      .then(res => setHospitals(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    api.get("/api/v1/admin/departments")
      .then(res => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // Fetch Main Clinical Intelligence Data
  const fetchClinicalIntelligence = (isManualRefresh: boolean = false) => {
    setIsLoading(true);
    let params: string[] = [];
    if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    if (selectedHospital !== "all") params.push(`hospital_id=${encodeURIComponent(selectedHospital)}`);
    if (selectedDepartment !== "all") params.push(`department_id=${encodeURIComponent(selectedDepartment)}`);
    if (selectedAgeGroup !== "all") params.push(`age_group=${encodeURIComponent(selectedAgeGroup)}`);
    if (selectedGender !== "all") params.push(`gender=${encodeURIComponent(selectedGender)}`);
    if (selectedDisease !== "all") params.push(`disease=${encodeURIComponent(selectedDisease)}`);
    if (selectedRiskCategory !== "all") params.push(`risk_category=${encodeURIComponent(selectedRiskCategory)}`);
    if (selectedDateRange !== "all") params.push(`date_range=${encodeURIComponent(selectedDateRange)}`);
    if (isManualRefresh) params.push(`_t=${Date.now()}`);

    const queryStr = params.length > 0 ? `?${params.join("&")}` : "";

    api.get(`/api/v1/admin/clinical-intelligence${queryStr}`)
      .then(res => {
        setData(res.data);
        if (isManualRefresh) {
          setToastNotice("Clinical telemetry and population intelligence metrics refreshed!");
        }
      })
      .catch(err => {
        console.error("Failed to load clinical intelligence data:", err);
        setToastNotice("Error querying PostgreSQL backend for clinical intelligence metrics.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchClinicalIntelligence();
  }, [searchQuery, selectedHospital, selectedDepartment, selectedAgeGroup, selectedGender, selectedDisease, selectedRiskCategory, selectedDateRange]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedHospital("all");
    setSelectedDepartment("all");
    setSelectedAgeGroup("all");
    setSelectedGender("all");
    setSelectedDisease("all");
    setSelectedRiskCategory("all");
    setSelectedDateRange("all");
  };

  // Export handlers
  const handleExportCSV = (reportName: string) => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,Report Name,Generated Date\n";
    csvContent += `"${reportName}","${new Date().toISOString()}"\n\n`;

    if (reportName.includes("Disease")) {
      csvContent += "Disease,Patient Count,Percentage,Monthly Trend,Department Comparison\n";
      data.disease_burden.forEach(d => {
        csvContent += `"${d.disease}",${d.patient_count},"${d.percentage}%","${d.monthly_trend}","${d.department_comparison}"\n`;
      });
    } else if (reportName.includes("Department")) {
      csvContent += "Department,Patients,Predictions,Avg Risk %,Avg BP,Avg Cholesterol (mg/dL),Avg BMI,Clinical Quality Score\n";
      data.department_performance.forEach(dp => {
        csvContent += `"${dp.department}",${dp.patients},${dp.predictions},"${dp.average_risk_pct}%","${dp.average_blood_pressure}",${dp.average_cholesterol_mgdl},${dp.average_bmi},"${dp.clinical_quality_score}"\n`;
      });
    } else if (reportName.includes("Hospital")) {
      csvContent += "Hospital Name,Code,Clinical Quality,High Risk Population,Avg Risk %,Prediction Volume,Clinical Compliance\n";
      data.hospital_comparison.forEach(hc => {
        csvContent += `"${hc.hospital_name}","${hc.code}","${hc.clinical_quality_score}",${hc.high_risk_population},"${hc.average_risk_pct}",${hc.prediction_volume},"${hc.clinical_compliance}"\n`;
      });
    } else {
      csvContent += "Metric,Value\n";
      csvContent += `"High Risk Population",${data.top_kpis.high_risk_population}\n`;
      csvContent += `"Critical Risk Patients",${data.top_kpis.critical_risk_patients}\n`;
      csvContent += `"Average CHD Risk",${data.top_kpis.average_chd_risk_pct}%\n`;
      csvContent += `"Average Blood Pressure","${data.top_kpis.average_blood_pressure}"\n`;
      csvContent += `"Average Cholesterol","${data.top_kpis.average_cholesterol}"\n`;
      csvContent += `"Average Blood Glucose","${data.top_kpis.average_blood_glucose}"\n`;
      csvContent += `"Average BMI","${data.top_kpis.average_bmi}"\n`;
      csvContent += `"Clinical Quality Score","${data.top_kpis.clinical_quality_score}"\n`;
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

  const activeTrends = useMemo(() => {
    if (!data || !data.risk_trends) return [];
    return data.risk_trends[trendTab] || [];
  }, [data, trendTab]);

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

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
              Enterprise Command Center
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs font-semibold text-slate-500">Live PostgreSQL Backend</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinical Intelligence & Population Health</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Executive healthcare intelligence, disease burden analysis, population risk dynamics, and clinical decision benchmarks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton
            onClick={() => fetchClinicalIntelligence(true)}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            <span>Refresh Telemetry</span>
          </GlassButton>

          <GlassButton
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Generate Executive Reports</span>
          </GlassButton>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <GlassCard className="p-5 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Executive Search & Clinical Filtering
            </h3>
          </div>

          {(searchQuery || selectedHospital !== "all" || selectedDepartment !== "all" || selectedAgeGroup !== "all" || selectedGender !== "all" || selectedDisease !== "all" || selectedRiskCategory !== "all" || selectedDateRange !== "all") && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"
            >
              <X className="h-3 w-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Search Patient / Keyword
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search UUID or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Hospital Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Hospital
            </label>
            <select
              value={selectedHospital}
              onChange={e => setSelectedHospital(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Hospitals</option>
              {hospitals.map(h => (
                <option key={h.id || h.code} value={h.id || h.code}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Departments</option>
              <option value="Cardiology">Cardiology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Emergency">Emergency</option>
              <option value="ICU">ICU</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
            </select>
          </div>

          {/* Age Group */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Age Group
            </label>
            <select
              value={selectedAgeGroup}
              onChange={e => setSelectedAgeGroup(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Ages</option>
              <option value="under_30">Under 30</option>
              <option value="30_45">30 - 45</option>
              <option value="45_60">45 - 60</option>
              <option value="60_75">60 - 75</option>
              <option value="over_75">Over 75</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Gender
            </label>
            <select
              value={selectedGender}
              onChange={e => setSelectedGender(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Disease Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Disease
            </label>
            <select
              value={selectedDisease}
              onChange={e => setSelectedDisease(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Diseases</option>
              <option value="hypertension">Hypertension</option>
              <option value="diabetes">Diabetes</option>
              <option value="hyperlipidemia">Hyperlipidemia</option>
              <option value="smoking">Smoking</option>
              <option value="obesity">Obesity</option>
              <option value="family_history">Family History</option>
              <option value="heart_disease">Heart Disease</option>
            </select>
          </div>

          {/* Risk Category */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Risk Category
            </label>
            <select
              value={selectedRiskCategory}
              onChange={e => setSelectedRiskCategory(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Risk Levels</option>
              <option value="very_low">Very Low</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="very_high">Very High</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* EMPTY STATE WARNING IF NO DATA */}
      {data && !data.has_data ? (
        <GlassCard className="p-12 text-center bg-white border border-amber-200/60 shadow-xs space-y-4">
          <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-black text-slate-900">Clinical Data Pending Accumulation</h3>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Clinical Intelligence will become available as patient records and AI predictions accumulate.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* TOP KPI SECTION (8 KPI CARDS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Top Executive KPIs & Clinical Metrics
              </span>
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                8 Core Health Indicators
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. High Risk Population */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">High Risk Population</span>
                  <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-600 block">
                    {data?.top_kpis.high_risk_population ?? 0}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Patients</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Estimated 10-yr CHD Risk &ge; 20%</p>
              </GlassCard>

              {/* 2. Critical Risk Patients */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Critical Risk Patients</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600 block">
                    {data?.top_kpis.critical_risk_patients ?? 0}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Patients</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Severe acute risk requiring intervention</p>
              </GlassCard>

              {/* 3. Average CHD Risk */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average CHD Risk</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Heart className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-600 block">
                    {data?.top_kpis.average_chd_risk_pct ?? 0}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">Mean 10-Yr</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Framingham / CatBoost ensemble risk</p>
              </GlassCard>

              {/* 4. Average Blood Pressure */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Blood Pressure</span>
                  <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-900 block">
                    {data?.top_kpis.average_blood_pressure ?? "0/0 mmHg"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Population Systolic / Diastolic baseline</p>
              </GlassCard>

              {/* 5. Average Cholesterol */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Cholesterol</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-purple-600 block">
                    {data?.top_kpis.average_cholesterol ?? "0 mg/dL"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Serum total cholesterol screening target</p>
              </GlassCard>

              {/* 6. Average Blood Glucose */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average Blood Glucose</span>
                  <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-sky-600 block">
                    {data?.top_kpis.average_blood_glucose ?? "0 mg/dL"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Fastine plasma glucose population index</p>
              </GlassCard>

              {/* 7. Average BMI */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Average BMI</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600 block">
                    {data?.top_kpis.average_bmi ?? "0 kg/m²"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Body Mass Index anthropometric mean</p>
              </GlassCard>

              {/* 8. Clinical Quality Score */}
              <GlassCard className="p-5 bg-white border border-slate-200/80 space-y-2 relative overflow-hidden shadow-xs hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clinical Quality Score</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-700 block">
                    {data?.top_kpis.clinical_quality_score ?? "0%"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Combined model AUC & documentation index</p>
              </GlassCard>
            </div>
          </div>

          {/* MAIN TWO-COLUMN SECTION: DISEASE BURDEN & RISK DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* DISEASE BURDEN ANALYSIS (7 Col Layout) */}
            <GlassCard className="lg:col-span-7 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Disease Burden Analysis</h2>
                  <p className="text-[11px] font-medium text-slate-500">Population prevalence, monthly trend vectors, and department distribution</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                  7 Primary Conditions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Disease Condition</th>
                      <th className="py-2.5 px-3">Patient Count</th>
                      <th className="py-2.5 px-3">Prevalence %</th>
                      <th className="py-2.5 px-3">Monthly Trend</th>
                      <th className="py-2.5 px-3">Department Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {data?.disease_burden.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-indigo-600" />
                          <span>{item.disease}</span>
                        </td>
                        <td className="py-3 px-3 font-black text-slate-800">{item.patient_count}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">{item.percentage}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            item.monthly_trend.startsWith("-") ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            {item.monthly_trend.startsWith("-") ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {item.monthly_trend}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium text-[11px]">
                          {item.department_comparison}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* RISK DISTRIBUTION (5 Col Layout) */}
            <GlassCard className="lg:col-span-5 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Risk Distribution</h2>
                  <p className="text-[11px] font-medium text-slate-500">5-Tier Framingham & AI Risk Strata</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setRiskVizTab("pie")}
                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                      riskVizTab === "pie" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Pie Chart
                  </button>
                  <button
                    onClick={() => setRiskVizTab("bar")}
                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                      riskVizTab === "bar" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bar Chart
                  </button>
                  <button
                    onClick={() => setRiskVizTab("trend")}
                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                      riskVizTab === "trend" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Trend Chart
                  </button>
                </div>
              </div>

              {/* Visualization Views */}
              {riskVizTab === "pie" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center p-4">
                    {/* SVG Pie / Donut Chart */}
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {/* Circle background */}
                        <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="14" fill="transparent" />
                        
                        {/* Donut slices using strokeDasharray */}
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="#10b981" strokeWidth="14" fill="transparent"
                          strokeDasharray={`${(data?.risk_distribution.very_low.pct || 0) * 2.51} 251`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="#3b82f6" strokeWidth="14" fill="transparent"
                          strokeDasharray={`${(data?.risk_distribution.low.pct || 0) * 2.51} 251`}
                          strokeDashoffset={`-${(data?.risk_distribution.very_low.pct || 0) * 2.51}`}
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="#f59e0b" strokeWidth="14" fill="transparent"
                          strokeDasharray={`${(data?.risk_distribution.moderate.pct || 0) * 2.51} 251`}
                          strokeDashoffset={`-${((data?.risk_distribution.very_low.pct || 0) + (data?.risk_distribution.low.pct || 0)) * 2.51}`}
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="#f97316" strokeWidth="14" fill="transparent"
                          strokeDasharray={`${(data?.risk_distribution.high.pct || 0) * 2.51} 251`}
                          strokeDashoffset={`-${((data?.risk_distribution.very_low.pct || 0) + (data?.risk_distribution.low.pct || 0) + (data?.risk_distribution.moderate.pct || 0)) * 2.51}`}
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="#ef4444" strokeWidth="14" fill="transparent"
                          strokeDasharray={`${(data?.risk_distribution.very_high.pct || 0) * 2.51} 251`}
                          strokeDashoffset={`-${((data?.risk_distribution.very_low.pct || 0) + (data?.risk_distribution.low.pct || 0) + (data?.risk_distribution.moderate.pct || 0) + (data?.risk_distribution.high.pct || 0)) * 2.51}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black text-slate-900">{data?.top_kpis.high_risk_population || 0}</span>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">High Risk</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block leading-tight">Very Low</span>
                        <span className="text-emerald-700 font-black">{data?.risk_distribution.very_low.pct}% ({data?.risk_distribution.very_low.count})</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block leading-tight">Low</span>
                        <span className="text-blue-700 font-black">{data?.risk_distribution.low.pct}% ({data?.risk_distribution.low.count})</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block leading-tight">Moderate</span>
                        <span className="text-amber-700 font-black">{data?.risk_distribution.moderate.pct}% ({data?.risk_distribution.moderate.count})</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block leading-tight">High</span>
                        <span className="text-orange-700 font-black">{data?.risk_distribution.high.pct}% ({data?.risk_distribution.high.count})</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 col-span-2 sm:col-span-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block leading-tight">Very High</span>
                        <span className="text-rose-700 font-black">{data?.risk_distribution.very_high.pct}% ({data?.risk_distribution.very_high.count})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {riskVizTab === "bar" && (
                <div className="space-y-3 py-2">
                  {[
                    { label: "Very Low (<5%)", key: "very_low", color: "bg-emerald-500", count: data?.risk_distribution.very_low.count, pct: data?.risk_distribution.very_low.pct },
                    { label: "Low (5-10%)", key: "low", color: "bg-blue-500", count: data?.risk_distribution.low.count, pct: data?.risk_distribution.low.pct },
                    { label: "Moderate (10-20%)", key: "moderate", color: "bg-amber-500", count: data?.risk_distribution.moderate.count, pct: data?.risk_distribution.moderate.pct },
                    { label: "High (20-40%)", key: "high", color: "bg-orange-500", count: data?.risk_distribution.high.count, pct: data?.risk_distribution.high.pct },
                    { label: "Very High (>=40%)", key: "very_high", color: "bg-rose-500", count: data?.risk_distribution.very_high.count, pct: data?.risk_distribution.very_high.pct },
                  ].map((tier, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">{tier.label}</span>
                        <span className="text-slate-900 font-black">{tier.count} patients ({tier.pct}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${tier.color} rounded-full`} style={{ width: `${Math.min(100, tier.pct || 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {riskVizTab === "trend" && (
                <div className="space-y-4 py-2">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Longitudinal distribution indicates a stable migration towards moderate and high risk management protocols post-AI deployment.
                  </p>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-indigo-900">
                      <span>High & Very High Cohort Trend</span>
                      <span>{data?.top_kpis.high_risk_population} Patients</span>
                    </div>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Continuous monitoring covers 100% of critical threshold cases across all active hospital departments.
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* CLINICAL OUTCOME METRICS (7 METRICS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Clinical Outcome Metrics & Governance
              </span>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                Target Compliance & Performance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Prediction Success</span>
                <span className="text-lg font-black text-indigo-600 block">{data?.clinical_outcomes.prediction_success_rate}</span>
                <p className="text-[10px] text-slate-500 font-medium">AUC Model Accuracy</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Follow-up Rate</span>
                <span className="text-lg font-black text-emerald-600 block">{data?.clinical_outcomes.treatment_followup_rate}</span>
                <p className="text-[10px] text-slate-500 font-medium">Post-discharge visit</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Critical Monitoring</span>
                <span className="text-lg font-black text-rose-600 block">{data?.clinical_outcomes.critical_patient_monitoring_pct}</span>
                <p className="text-[10px] text-slate-500 font-medium">High risk coverage</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Risk Improvement</span>
                <span className="text-lg font-black text-blue-600 block">{data?.clinical_outcomes.risk_improvement_rate}</span>
                <p className="text-[10px] text-slate-500 font-medium">Cohort risk reduction</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Clinical Compliance</span>
                <span className="text-lg font-black text-purple-600 block">{data?.clinical_outcomes.clinical_compliance}</span>
                <p className="text-[10px] text-slate-500 font-medium">Protocol adherence</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Readmission Rate</span>
                <span className="text-lg font-black text-amber-600 block">{data?.clinical_outcomes.readmission_rate}</span>
                <p className="text-[10px] text-slate-500 font-medium">30-day readmit index</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white border border-slate-200/80 space-y-1 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Avg Recovery Time</span>
                <span className="text-lg font-black text-sky-600 block">{data?.clinical_outcomes.average_recovery_time_days}</span>
                <p className="text-[10px] text-slate-500 font-medium">Inpatient duration</p>
              </GlassCard>
            </div>
          </div>

          {/* DEPARTMENT PERFORMANCE SECTION */}
          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Department Performance Comparison</h2>
                <p className="text-[11px] font-medium text-slate-500">Cross-departmental patient volume, prediction intensity, average vitals & quality rating</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                6 Standard Departments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Active Patients</th>
                    <th className="py-3 px-4">Predictions</th>
                    <th className="py-3 px-4">Average Risk %</th>
                    <th className="py-3 px-4">Average Blood Pressure</th>
                    <th className="py-3 px-4">Average Cholesterol</th>
                    <th className="py-3 px-4">Average BMI</th>
                    <th className="py-3 px-4">Quality Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {data?.department_performance.map((dp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {dp.department[0]}
                        </div>
                        <span>{dp.department}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{dp.patients}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{dp.predictions}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          dp.average_risk_pct >= 20 ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          dp.average_risk_pct >= 10 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {dp.average_risk_pct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{dp.average_blood_pressure}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{dp.average_cholesterol_mgdl} mg/dL</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{dp.average_bmi} kg/m²</td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          {dp.clinical_quality_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* HOSPITAL COMPARISON & AI CLINICAL INSIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* HOSPITAL COMPARISON (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Hospital Benchmark Comparison</h2>
                  <p className="text-[11px] font-medium text-slate-500">Multi-facility clinical performance & risk distribution</p>
                </div>
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>

              <div className="space-y-3">
                {data?.hospital_comparison.map((h, i) => (
                  <div key={i} className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-2 hover:border-indigo-200 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                          {h.code.slice(0, 3)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{h.hospital_name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Code: {h.code}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-full">
                        Quality: {h.clinical_quality_score}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">High Risk Pop</span>
                        <span className="font-black text-rose-600">{h.high_risk_population}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Avg Risk %</span>
                        <span className="font-black text-slate-800">{h.average_risk_pct}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Predictions</span>
                        <span className="font-black text-indigo-600">{h.prediction_volume}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Compliance</span>
                        <span className="font-black text-emerald-600">{h.clinical_compliance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* AI CLINICAL INSIGHTS (6 Col) */}
            <GlassCard className="lg:col-span-6 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">AI Clinical Insights & Directives</h2>
                  <p className="text-[11px] font-medium text-slate-500">Automated executive intelligence derived from PostgreSQL models</p>
                </div>
                <div className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2.5">
                {data?.ai_clinical_insights.map((insight, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl flex items-start gap-3 hover:bg-indigo-50/30 transition-all">
                    <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* RISK TREND ANALYSIS (TIMELINE SVG CHART) */}
          <GlassCard className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Population Risk Trend Analysis</h2>
                <p className="text-[11px] font-medium text-slate-500">Longitudinal prediction volume, high-risk counts, and average risk percentage</p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {(["daily", "weekly", "monthly", "yearly"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTrendTab(t)}
                    className={`px-3 py-1 text-[10px] font-black rounded-lg capitalize transition-all ${
                      trendTab === t ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t} Trend
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Trend Visualizer */}
            <div className="space-y-4">
              <div className="h-52 w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                  <span>Trend Aggregation ({trendTab.toUpperCase()})</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-indigo-600" /> Predictions</span>
                    <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /> High Risk</span>
                    <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> Avg Risk %</span>
                  </div>
                </div>

                {/* Bars & Line chart rendering */}
                <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
                  {activeTrends.map((pt, idx) => {
                    const maxPred = Math.max(1, ...activeTrends.map(t => t.total_predictions));
                    const heightPct = Math.min(100, Math.max(15, (pt.total_predictions / maxPred) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="text-[9px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {pt.average_risk_pct}%
                        </div>
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div
                            className="w-1/2 bg-indigo-600/90 rounded-t-md hover:bg-indigo-700 transition-all"
                            style={{ height: `${heightPct}%` }}
                            title={`Predictions: ${pt.total_predictions}`}
                          />
                          <div
                            className="w-1/2 bg-rose-500/90 rounded-t-md hover:bg-rose-600 transition-all"
                            style={{ height: `${Math.min(100, (pt.high_risk_count / (maxPred || 1)) * 100)}%` }}
                            title={`High Risk: ${pt.high_risk_count}`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                          {pt.period}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* PATIENT COHORT ANALYSIS & QUALITY INDICATORS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PATIENT COHORT ANALYSIS (7 Col) */}
            <GlassCard className="lg:col-span-7 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Patient Cohort Analysis</h2>
                  <p className="text-[11px] font-medium text-slate-500">Demographic, lifestyle and clinical baseline distributions</p>
                </div>

                <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
                  {[
                    { id: "age", label: "Age" },
                    { id: "gender", label: "Gender" },
                    { id: "smoking", label: "Smoking" },
                    { id: "diabetes", label: "Diabetes" },
                    { id: "hypertension", label: "HTN" },
                    { id: "bmi", label: "BMI" },
                    { id: "cholesterol", label: "Cholesterol" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCohortTab(tab.id as any)}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all ${
                        cohortTab === tab.id ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cohort Tab Content */}
              <div className="py-2">
                {cohortTab === "age" && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Under 30", val: data?.patient_cohorts.age_groups.under_30 },
                      { label: "30 - 45", val: data?.patient_cohorts.age_groups.age_30_45 },
                      { label: "45 - 60", val: data?.patient_cohorts.age_groups.age_45_60 },
                      { label: "60 - 75", val: data?.patient_cohorts.age_groups.age_60_75 },
                      { label: "Over 75", val: data?.patient_cohorts.age_groups.over_75 },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{item.label}</span>
                        <span className="text-xl font-black text-indigo-600 block">{item.val ?? 0}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Patients</span>
                      </div>
                    ))}
                  </div>
                )}

                {cohortTab === "gender" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase block">Male Cohort</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.gender.male ?? 0}</span>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-600 uppercase block">Female Cohort</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.gender.female ?? 0}</span>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                )}

                {cohortTab === "smoking" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase block">Active Smokers</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.smoking.smokers ?? 0}</span>
                      </div>
                      <ShieldAlert className="h-8 w-8 text-rose-500" />
                    </div>
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Non-Smokers</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.smoking.non_smokers ?? 0}</span>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                  </div>
                )}

                {cohortTab === "diabetes" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase block">Diabetic Cohort</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.diabetes.diabetic ?? 0}</span>
                      </div>
                      <Zap className="h-8 w-8 text-amber-500" />
                    </div>
                    <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-sky-600 uppercase block">Non-Diabetic</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.diabetes.non_diabetic ?? 0}</span>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-sky-500" />
                    </div>
                  </div>
                )}

                {cohortTab === "hypertension" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase block">Hypertensive (BP &ge; 140)</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.hypertension.hypertensive ?? 0}</span>
                      </div>
                      <Activity className="h-8 w-8 text-rose-500" />
                    </div>
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Normal Blood Pressure</span>
                        <span className="text-2xl font-black text-slate-900">{data?.patient_cohorts.hypertension.normal ?? 0}</span>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                  </div>
                )}

                {cohortTab === "bmi" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Normal (&lt;25)</span>
                      <span className="text-xl font-black text-emerald-600 block">{data?.patient_cohorts.bmi_categories.normal ?? 0}</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Overweight (25-30)</span>
                      <span className="text-xl font-black text-amber-600 block">{data?.patient_cohorts.bmi_categories.overweight ?? 0}</span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Obese (&ge;30)</span>
                      <span className="text-xl font-black text-rose-600 block">{data?.patient_cohorts.bmi_categories.obese ?? 0}</span>
                    </div>
                  </div>
                )}

                {cohortTab === "cholesterol" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Desirable (&lt;200)</span>
                      <span className="text-xl font-black text-emerald-600 block">{data?.patient_cohorts.cholesterol_categories.desirable ?? 0}</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Borderline (200-240)</span>
                      <span className="text-xl font-black text-amber-600 block">{data?.patient_cohorts.cholesterol_categories.borderline ?? 0}</span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">High (&ge;240)</span>
                      <span className="text-xl font-black text-rose-600 block">{data?.patient_cohorts.cholesterol_categories.high ?? 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* QUALITY INDICATORS (5 Col) */}
            <GlassCard className="lg:col-span-5 p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Quality Indicators</h2>
                  <p className="text-[11px] font-medium text-slate-500">Operation efficiency & clinical documentation compliance</p>
                </div>
                <Award className="h-4 w-4 text-indigo-600" />
              </div>

              <div className="space-y-3">
                {[
                  { label: "Average Consultation Time", val: `${data?.quality_indicators.average_consultation_time_mins ?? 0} Mins` },
                  { label: "Documentation Completeness", val: data?.quality_indicators.documentation_completeness_pct ?? "0%" },
                  { label: "Prediction Coverage Ratio", val: data?.quality_indicators.prediction_coverage_pct ?? "0%" },
                  { label: "Follow-up Completion", val: data?.quality_indicators.followup_completion_pct ?? "0%" },
                  { label: "AI Utilization Rate", val: data?.quality_indicators.ai_utilization_rate ?? "0%" },
                  { label: "Clinical Compliance Score", val: data?.quality_indicators.compliance_score ?? "0%" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* EXECUTIVE INSIGHTS PANEL SUMMARY */}
          <GlassCard className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Executive Summary Panel</h2>
                  <p className="text-xs text-slate-400 font-medium">Strategic leadership digest generated from PostgreSQL clinical data</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Leadership Directive
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Highest Risk Department</span>
                <span className="text-sm font-black text-rose-400 block">{data?.executive_summary.highest_risk_department}</span>
                <p className="text-[11px] text-slate-400 font-medium">Requires priority cardiology staffing titration</p>
              </div>

              <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Hospital Intervention Priority</span>
                <span className="text-sm font-black text-amber-400 block">{data?.executive_summary.hospital_requiring_intervention}</span>
                <p className="text-[11px] text-slate-400 font-medium">Outpatient monitoring workflow optimization</p>
              </div>

              <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Clinical Improvement Trend</span>
                <span className="text-sm font-black text-emerald-400 block">{data?.executive_summary.clinical_improvement_trend}</span>
                <p className="text-[11px] text-slate-400 font-medium">Demonstrated post-decision support deployment</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-900/30 border border-indigo-700/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-200 block">{data?.executive_summary.population_trend}</span>
                <span className="text-slate-400 font-medium">Immediate follow-up queue: {data?.executive_summary.immediate_followup_required} critical risk patients</span>
              </div>
              <span className="text-xs font-black text-indigo-300 bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/30 whitespace-nowrap">
                Highest Accuracy: {data?.executive_summary.highest_accuracy_department}
              </span>
            </div>
          </GlassCard>
        </>
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
                  <h3 className="text-sm font-black text-slate-900">Generate Executive Report</h3>
                  <p className="text-[11px] font-medium text-slate-500">Select report package & format for export</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Select Report Package
              </label>
              <div className="space-y-2">
                {[
                  "Clinical Intelligence Report",
                  "Executive Health Report",
                  "Department Performance Report",
                  "Population Risk Report",
                  "Hospital Comparison Report",
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
              <GlassButton
                onClick={() => setIsReportModalOpen(false)}
                variant="secondary"
                className="w-full sm:w-auto text-xs font-bold text-slate-600 bg-white border-slate-200"
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={() => handleExportCSV(selectedReportType)}
                className="w-full sm:w-auto text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Excel / CSV</span>
              </GlassButton>
              <GlassButton
                onClick={() => handleExportPDF(selectedReportType)}
                className="w-full sm:w-auto text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5"
              >
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
