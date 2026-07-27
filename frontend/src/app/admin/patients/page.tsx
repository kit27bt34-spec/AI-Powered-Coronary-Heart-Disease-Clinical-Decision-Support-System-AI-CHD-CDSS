"use client";

import React, { useEffect, useState } from "react";
import {
  Users, Heart, Activity, ShieldAlert, Download, RefreshCw, Search, Filter,
  Eye, BarChart2, FileText, ChevronLeft, ChevronRight, AlertCircle, X,
  Building2, TrendingUp, UserCheck, Calendar, Layers, Clock, ShieldCheck
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

interface PatientRow {
  id: string;
  patient_uuid: string;
  name: string;
  age: number;
  gender: string;
  department: string;
  assigned_doctor: string;
  latest_prediction_risk_pct: number | null;
  risk_level: string;
  status: string;
  admission_date: string;
  last_visit: string;
}

export default function AdminPatientsPage() {
  const [data, setData] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Drawers & Modals State
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Fetch Hospitals, Departments, Doctors
  useEffect(() => {
    api.get("/api/v1/admin/hospitals").then(res => setHospitals(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get("/api/v1/admin/departments").then(res => setDepartments(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get("/api/v1/admin/users?role=doctor").then(res => setDoctors(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  // Fetch Population Analytics
  const fetchAnalytics = () => {
    setIsLoading(true);
    let url = `/api/v1/admin/patient-analytics?page=${currentPage}&limit=${itemsPerPage}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    if (hospitalFilter !== "all") url += `&hospital_id=${encodeURIComponent(hospitalFilter)}`;
    if (departmentFilter !== "all") url += `&department_id=${encodeURIComponent(departmentFilter)}`;
    if (genderFilter !== "all") url += `&gender=${encodeURIComponent(genderFilter)}`;
    if (riskFilter !== "all") url += `&risk_level=${encodeURIComponent(riskFilter)}`;
    if (doctorFilter !== "all") url += `&doctor_id=${encodeURIComponent(doctorFilter)}`;

    api.get(url)
      .then(res => setData(res.data))
      .catch(err => {
        console.error("Error loading patient analytics:", err);
        setToastNotice("Failed to load population analytics from PostgreSQL.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [searchQuery, hospitalFilter, departmentFilter, genderFilter, riskFilter, doctorFilter, currentPage]);

  const handleExportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/patient-analytics/export`, "_blank");
  };

  const hasData = data && data.total_patients > 0;

  return (
    <div className="space-y-6 pb-12">
      {toastNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Patient Population Analytics</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Population demographics, clinical trends, disease burden, and patient health indicators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={fetchAnalytics}
            className="px-3 py-2 font-bold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </GlassButton>

          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="px-3 py-2 font-bold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Export Report</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20"
          >
            <FileText className="h-4 w-4" />
            <span>Generate Executive Report</span>
          </GlassButton>
        </div>
      </div>

      {!hasData && !isLoading ? (
        /* EMPTY STATE */
        <GlassCard className="p-12 bg-white border border-slate-100 text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No Patients Available</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
              Register patients through the Doctor Portal to begin viewing population analytics.
            </p>
          </div>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => window.location.href = "/admin/select-hospital"}
            className="px-5 py-2.5 font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="h-4 w-4" />
            <span>Go to Hospital Workspace</span>
          </GlassButton>
        </GlassCard>
      ) : (
        <>
          {/* TOP KPI SECTION (8 KPI CARDS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Patients</span>
              <span className="text-2xl font-black text-slate-900 block">{data?.total_patients ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">PostgreSQL Live</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Active Patients</span>
              <span className="text-2xl font-black text-slate-900 block">{data?.active_patients ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">Last 90 Days</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">New This Month</span>
              <span className="text-2xl font-black text-indigo-900 block">+{data?.new_patients_month ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">Cohort Growth</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">Average Age</span>
              <span className="text-2xl font-black text-blue-900 block">{data?.average_age ?? 0} <span className="text-xs text-slate-400">Yrs</span></span>
              <span className="text-[10px] font-semibold text-slate-400">Anchor Median</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Male Population</span>
              <span className="text-2xl font-black text-slate-800 block">{data?.male_count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">{data?.total_patients ? roundPct(data.male_count, data.total_patients) : 0}% Ratio</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Female Population</span>
              <span className="text-2xl font-black text-slate-800 block">{data?.female_count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">{data?.total_patients ? roundPct(data.female_count, data.total_patients) : 0}% Ratio</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider block">High Risk Patients</span>
              <span className="text-2xl font-black text-rose-700 block">{data?.high_risk_patients ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-400">&ge; 20% CHD Risk</span>
            </GlassCard>

            <GlassCard className="p-3.5 bg-white border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-purple-600 uppercase tracking-wider block">Average CHD Risk</span>
              <span className="text-2xl font-black text-purple-900 block">{data?.average_chd_risk_pct ?? 0}%</span>
              <span className="text-[10px] font-semibold text-slate-400">Cohort Average</span>
            </GlassCard>
          </div>

          {/* DEMOGRAPHICS & DISEASE ANALYTICS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* DEMOGRAPHICS */}
            <GlassCard className="p-5 bg-white border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Patient Demographics</h3>
                <span className="text-[10px] font-bold text-slate-400">Cohort Distribution</span>
              </div>

              {/* Gender Ratio Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">Male ({data?.male_count ?? 0})</span>
                  <span className="text-slate-700">Female ({data?.female_count ?? 0})</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${roundPct(data?.male_count || 0, data?.total_patients || 0)}%` }} className="bg-indigo-600 h-full" />
                  <div style={{ width: `${roundPct(data?.female_count || 0, data?.total_patients || 0)}%` }} className="bg-blue-400 h-full" />
                </div>
              </div>

              {/* Age Group Breakdown */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Age Group Breakdown</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Children (&lt;18)</span>
                    <span className="text-sm font-black text-slate-800">{data?.children_count ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Adults (18-64)</span>
                    <span className="text-sm font-black text-indigo-900">{data?.adults_count ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Seniors (65+)</span>
                    <span className="text-sm font-black text-blue-900">{data?.seniors_count ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Age Distribution Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Age Distribution Ranges</span>
                <div className="space-y-2 text-xs font-semibold">
                  {Object.entries(data?.age_distribution || {}).map(([key, val]: any) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-600 font-bold capitalize">{key.replace("age_", "").replace("_", " ")} Yrs</span>
                        <span className="text-slate-900 font-extrabold">{val} Patients</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${roundPct(val, data?.total_patients || 0)}%` }} className="bg-indigo-600 h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* DISEASE BURDEN ANALYTICS */}
            <GlassCard className="p-5 bg-white border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Disease Burden & Risk Factors</h3>
                <span className="text-[10px] font-bold text-slate-400">Prevalence Ratios</span>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-bold">Hypertension Prevalence</span>
                    <span className="text-rose-600 font-black">{data?.disease_analytics?.hypertension_pct ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${data?.disease_analytics?.hypertension_pct ?? 0}%` }} className="bg-rose-500 h-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-bold">Diabetes Mellitus Prevalence</span>
                    <span className="text-amber-600 font-black">{data?.disease_analytics?.diabetes_pct ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${data?.disease_analytics?.diabetes_pct ?? 0}%` }} className="bg-amber-500 h-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-bold">Obesity (BMI &ge; 30 kg/m²)</span>
                    <span className="text-purple-600 font-black">{data?.disease_analytics?.obesity_pct ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${data?.disease_analytics?.obesity_pct ?? 0}%` }} className="bg-purple-500 h-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-bold">Tobacco / Smoking Rate</span>
                    <span className="text-slate-800 font-black">{data?.disease_analytics?.smoking_pct ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${data?.disease_analytics?.smoking_pct ?? 0}%` }} className="bg-slate-600 h-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-bold">High Cholesterol (&ge; 200 mg/dL)</span>
                    <span className="text-indigo-600 font-black">{data?.disease_analytics?.cholesterol_pct ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${data?.disease_analytics?.cholesterol_pct ?? 0}%` }} className="bg-indigo-600 h-full" />
                  </div>
                </div>
              </div>

              {/* Clinical Averages Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs font-semibold">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Average BMI</span>
                  <span className="text-sm font-black text-slate-900">{data?.disease_analytics?.average_bmi ?? 0} kg/m²</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Average Blood Pressure</span>
                  <span className="text-sm font-black text-slate-900">{data?.disease_analytics?.average_systolic_bp ?? 0} / {data?.disease_analytics?.average_diastolic_bp ?? 0}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Average Glucose</span>
                  <span className="text-sm font-black text-slate-900">{data?.disease_analytics?.average_glucose ?? 0} mg/dL</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Average Heart Rate</span>
                  <span className="text-sm font-black text-slate-900">{data?.disease_analytics?.average_heart_rate ?? 0} bpm</span>
                </div>
              </div>
            </GlassCard>

            {/* RISK ANALYTICS & EXECUTIVE INSIGHTS */}
            <GlassCard className="p-5 bg-white border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Risk Stratification & AI Insights</h3>
                <span className="text-[10px] font-bold text-slate-400">Population Risk</span>
              </div>

              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-bold">Very Low Risk (&lt;5%)</span>
                  <span className="font-extrabold text-slate-900">{data?.risk_distribution?.very_low_risk ?? 0} Patients</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-bold">Low Risk (5-10%)</span>
                  <span className="font-extrabold text-blue-700">{data?.risk_distribution?.low_risk ?? 0} Patients</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-bold">Moderate Risk (10-20%)</span>
                  <span className="font-extrabold text-amber-700">{data?.risk_distribution?.moderate_risk ?? 0} Patients</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-bold">High Risk (20-40%)</span>
                  <span className="font-extrabold text-rose-700">{data?.risk_distribution?.high_risk ?? 0} Patients</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-bold">Very High Risk (&ge;40%)</span>
                  <span className="font-extrabold text-purple-700">{data?.risk_distribution?.very_high_risk ?? 0} Patients</span>
                </div>
              </div>

              {/* Executive AI Insights */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Executive AI Insights</span>
                <p className="text-xs text-indigo-950 font-bold leading-relaxed">
                  Highest Burden Ward: <span className="font-black underline">{data?.executive_insights?.highest_risk_department}</span> ({data?.executive_insights?.highest_risk_dept_risk_pct}% Avg Risk).
                </p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {data?.executive_insights?.risk_summary}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <GlassCard className="p-4 bg-white border border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by Patient Name or UUID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              <select
                value={hospitalFilter}
                onChange={(e) => { setHospitalFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Hospitals</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id || h.code}>{h.name}</option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id || d.code}>{d.name}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <select
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High & Very High Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>
          </GlassCard>

          {/* PATIENT TABLE DATA GRID */}
          <GlassCard className="p-0 bg-white border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4">Patient Identifier</th>
                    <th className="py-3.5 px-4">Age / Gender</th>
                    <th className="py-3.5 px-4">Department Ward</th>
                    <th className="py-3.5 px-4">Assigned Attending Doctor</th>
                    <th className="py-3.5 px-4">Latest 10-Yr Risk %</th>
                    <th className="py-3.5 px-4">Risk Stratification</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Visit</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {(data?.patient_table || []).map((pat: PatientRow) => (
                    <tr key={pat.id} className="hover:bg-slate-50/60 transition duration-150">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 block">{pat.name}</span>
                        <span className="text-[10px] font-mono text-indigo-600 block">{pat.patient_uuid}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block">{pat.age} Yrs</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{pat.gender}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold">{pat.department}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-indigo-900 font-bold">{pat.assigned_doctor}</span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-indigo-600 text-sm">
                        {pat.latest_prediction_risk_pct !== null ? `${pat.latest_prediction_risk_pct}%` : "Unassessed"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          pat.risk_level === "Very High" ? "bg-purple-50 text-purple-700 border-purple-200" :
                          pat.risk_level === "High" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          pat.risk_level === "Moderate" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {pat.risk_level}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {pat.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {pat.last_visit}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPatient(pat);
                            setIsViewDrawerOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          title="View Patient Medical Summary"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{data?.total_pages || 1}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage >= (data?.total_pages || 1)}
                  onClick={() => setCurrentPage(p => Math.min(data?.total_pages || 1, p + 1))}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      {/* VIEW PATIENT DRAWER */}
      {isViewDrawerOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-lg w-full h-full p-6 space-y-5 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedPatient.name}</h3>
                <span className="text-xs font-mono font-bold text-indigo-600">{selectedPatient.patient_uuid}</span>
              </div>
              <button onClick={() => setIsViewDrawerOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">Age & Gender</span>
                  <span className="text-slate-900 font-bold">{selectedPatient.age} Yrs • {selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">Department</span>
                  <span className="text-slate-900 font-bold">{selectedPatient.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">Attending Doctor</span>
                  <span className="text-indigo-900 font-bold">{selectedPatient.assigned_doctor}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">Admission Date</span>
                  <span className="text-slate-900 font-bold">{selectedPatient.admission_date}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2 text-xs font-semibold">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Latest AI Risk Assessment</span>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black text-indigo-950">
                  {selectedPatient.latest_prediction_risk_pct !== null ? `${selectedPatient.latest_prediction_risk_pct}%` : "Unassessed"}
                </span>
                <span className="px-3 py-1 bg-white text-indigo-700 font-black rounded-full border border-indigo-200">
                  {selectedPatient.risk_level}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE EXECUTIVE REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Generate Executive Report</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="p-1.5 bg-slate-100 rounded-xl text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold">
              Select report type to compile population intelligence metrics directly from PostgreSQL:
            </p>

            <div className="space-y-2 text-xs font-bold text-slate-800">
              <button
                onClick={() => {
                  handleExportCSV();
                  setIsReportModalOpen(false);
                }}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 rounded-2xl text-left transition flex justify-between items-center cursor-pointer"
              >
                <span>Full Population Health Report (CSV)</span>
                <Download className="h-4 w-4 text-indigo-600" />
              </button>

              <button
                onClick={() => {
                  window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/reports/summary`, "_blank");
                  setIsReportModalOpen(false);
                }}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 rounded-2xl text-left transition flex justify-between items-center cursor-pointer"
              >
                <span>Executive Disease & Risk Breakdown (PDF)</span>
                <FileText className="h-4 w-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roundPct(part: number, total: number) {
  if (!total || total === 0 || !part) return 0;
  return Math.round((part / total) * 100);
}
