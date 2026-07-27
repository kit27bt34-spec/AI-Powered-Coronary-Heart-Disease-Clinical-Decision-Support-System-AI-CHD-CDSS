"use client";

import React, { useEffect, useState } from "react";
import {
  Stethoscope, ShieldCheck, UserCheck, AlertCircle, Plus, Search, Filter,
  Download, RefreshCw, Eye, Edit3, Trash2, Key, CheckCircle2, X, FileText,
  Building2, Award, Clock, Calendar, Phone, Mail, User, ShieldAlert, Sparkles,
  ChevronLeft, ChevronRight, Lock, Check, Copy, UserX, Briefcase, FileCheck, Activity
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

interface DoctorRecord {
  id: string;
  doctor_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  emergency_contact: string;
  hospital_id?: string;
  hospital_name: string;
  hospital_code: string;
  department_id?: string;
  department_name: string;
  designation: string;
  specialty: string;
  sub_specialization: string;
  license_number: string;
  license_expiry: string;
  license_status: string;
  medical_council: string;
  years_of_experience: number;
  qualification: string;
  employment_type: string;
  availability_status: string;
  status: string;
  is_active: boolean;
  portal_status: string;
  last_login?: string;
  created_at?: string;
  prediction_count: number;
  patients_assigned: number;
  bio: string;
  languages: string;
  certificates: string;
}

const SPECIALTIES_LIST = [
  "Cardiology",
  "Interventional Cardiology",
  "Electrophysiology",
  "Cardiothoracic Surgery",
  "Intensive Care Medicine",
  "Heart Failure & Transplant",
  "Pediatric Cardiology",
  "Vascular Surgery"
];

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Visiting Consultant", "Honorary"];

const AVAILABILITY_STATUSES = ["Available", "Busy", "In Surgery", "Offline", "On Leave"];

const STATUS_OPTIONS = ["Active", "Inactive", "Pending", "Suspended", "On Leave", "Retired"];

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    active_doctors: 0,
    inactive_doctors: 0,
    pending_approval: 0,
    departments_covered: 0,
    today_consultations: 0,
    average_experience: 8.5
  });

  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employmentFilter, setEmploymentFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Modals & Drawers
  const [isAddWizardOpen, setIsAddWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState<boolean>(false);

  const [activeDoctor, setActiveDoctor] = useState<DoctorRecord | null>(null);
  const [detailedDoctorInfo, setDetailedDoctorInfo] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add Doctor Form State (5-step wizard)
  const [addForm, setAddForm] = useState({
    // Step 1: Personal
    full_name: "",
    gender: "Male",
    dob: "",
    email: "",
    phone: "",
    emergency_contact: "",

    // Step 2: Professional
    license_number: "",
    license_expiry: "2028-12-31",
    medical_council: "State Medical Council",
    qualification: "MD, FACC",
    specialty: "Cardiology",
    sub_specialization: "Interventional Cardiology",
    years_of_experience: 8,
    employment_type: "Full Time",

    // Step 3: Hospital Assignment
    hospital_id: "",
    department_id: "",
    department_name: "Cardiology & CCU",
    designation: "Attending Cardiologist",

    // Step 4: Portal Account
    username: "",
    password: "",
    must_change_password: true,
    enable_account: true
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    designation: "",
    specialty: "",
    sub_specialization: "",
    qualification: "",
    years_of_experience: 5,
    employment_type: "Full Time",
    availability_status: "Available",
    status: "Active"
  });

  // Fetch Hospitals & Departments
  useEffect(() => {
    api.get("/api/v1/admin/hospitals").then(res => setHospitals(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get("/api/v1/admin/departments").then(res => setDepartments(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  // Fetch Doctor Directory
  const fetchDoctors = () => {
    setIsLoading(true);
    let url = `/api/v1/admin/doctors?page=${currentPage}&limit=${itemsPerPage}&sort_by=${sortBy}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    if (hospitalFilter !== "all") url += `&hospital_id=${encodeURIComponent(hospitalFilter)}`;
    if (departmentFilter !== "all") url += `&department_id=${encodeURIComponent(departmentFilter)}`;
    if (specialtyFilter !== "all") url += `&specialty=${encodeURIComponent(specialtyFilter)}`;
    if (statusFilter !== "all") url += `&status=${encodeURIComponent(statusFilter)}`;
    if (employmentFilter !== "all") url += `&employment_type=${encodeURIComponent(employmentFilter)}`;
    if (availabilityFilter !== "all") url += `&availability_status=${encodeURIComponent(availabilityFilter)}`;

    api.get(url)
      .then(res => {
        setDoctors(res.data.doctors || []);
        setTotalCount(res.data.total || 0);
        if (res.data.kpi_summary) {
          setKpis(res.data.kpi_summary);
        }
      })
      .catch(err => {
        console.error("Error loading doctor directory:", err);
        setToastNotice("Failed to load doctor directory from database.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchQuery, hospitalFilter, departmentFilter, specialtyFilter, statusFilter, employmentFilter, availabilityFilter, sortBy, currentPage]);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const handleGeneratePassword = () => {
    const pass = `Doctor@${Math.floor(100 + Math.random() * 900)}`;
    setAddForm(prev => ({ ...prev, password: pass }));
  };

  const handleOpenAddWizard = () => {
    const pass = `Doctor@${Math.floor(100 + Math.random() * 900)}`;
    setAddForm(prev => ({
      ...prev,
      password: pass,
      hospital_id: prev.hospital_id || (hospitals[0]?.id || hospitals[0]?.code || ""),
      department_id: prev.department_id || (departments[0]?.id || departments[0]?.code || "")
    }));
    setWizardStep(1);
    setIsAddWizardOpen(true);
  };

  // Submit Add Doctor Form
  const handleAddDoctorSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post("/api/v1/admin/doctors", {
        full_name: addForm.full_name,
        email: addForm.email,
        phone: addForm.phone,
        gender: addForm.gender,
        dob: addForm.dob,
        emergency_contact: addForm.emergency_contact,

        license_number: addForm.license_number,
        license_expiry: addForm.license_expiry,
        medical_council: addForm.medical_council,
        qualification: addForm.qualification,
        specialty: addForm.specialty,
        sub_specialization: addForm.sub_specialization,
        years_of_experience: addForm.years_of_experience,
        employment_type: addForm.employment_type,

        hospital_id: addForm.hospital_id,
        department_id: addForm.department_id,
        department_name: addForm.department_name,
        designation: addForm.designation,

        password: addForm.password,
        must_change_password: addForm.must_change_password
      });

      showToast(`Physician profile '${addForm.full_name}' created and Doctor Portal account provisioned!`);
      setIsAddWizardOpen(false);
      fetchDoctors();
    } catch (err: any) {
      console.error("Add Doctor Error:", err);
      alert(err?.response?.data?.detail || "Failed to create doctor profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Doctor Profile Side Drawer
  const handleViewDoctor = async (doc: DoctorRecord) => {
    setActiveDoctor(doc);
    setIsViewDrawerOpen(true);
    try {
      const res = await api.get(`/api/v1/admin/doctors/${doc.id}`);
      setDetailedDoctorInfo(res.data);
    } catch {
      setDetailedDoctorInfo(doc);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: DoctorRecord) => {
    setActiveDoctor(doc);
    setEditForm({
      full_name: doc.full_name,
      phone: doc.phone === "N/A" ? "" : doc.phone,
      designation: doc.designation,
      specialty: doc.specialty,
      sub_specialization: doc.sub_specialization,
      qualification: doc.qualification,
      years_of_experience: doc.years_of_experience || 5,
      employment_type: doc.employment_type || "Full Time",
      availability_status: doc.availability_status || "Available",
      status: doc.status || "Active"
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctor) return;
    setIsSubmitting(true);
    try {
      await api.put(`/api/v1/admin/doctors/${activeDoctor.id}`, editForm);
      showToast(`Physician profile for '${editForm.full_name}' updated in PostgreSQL!`);
      setIsEditModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update doctor profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password Action
  const handleResetPassword = async (doc: DoctorRecord) => {
    setActiveDoctor(doc);
    try {
      const res = await api.post(`/api/v1/admin/doctors/${doc.id}/reset-password`);
      setResetPasswordResult(res.data);
      setIsResetPasswordModalOpen(true);
      fetchDoctors();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to reset password.");
    }
  };

  // Activate Doctor
  const handleActivateDoctor = async (doc: DoctorRecord) => {
    try {
      await api.post(`/api/v1/admin/doctors/${doc.id}/activate`);
      showToast(`Doctor account '${doc.full_name}' activated!`);
      fetchDoctors();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to activate doctor.");
    }
  };

  // Deactivate Doctor
  const handleDeactivateDoctor = async (doc: DoctorRecord) => {
    try {
      await api.post(`/api/v1/admin/doctors/${doc.id}/deactivate`);
      showToast(`Doctor account '${doc.full_name}' deactivated.`);
      fetchDoctors();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to deactivate doctor.");
    }
  };

  // Soft Delete Doctor
  const handleDeleteDoctor = async (doc: DoctorRecord) => {
    if (!confirm(`Are you sure you want to soft delete physician '${doc.full_name}' (${doc.email})?`)) return;
    try {
      await api.delete(`/api/v1/admin/doctors/${doc.id}`);
      showToast(`Physician profile '${doc.full_name}' soft deleted from workspace.`);
      fetchDoctors();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete physician profile.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/doctors/export`, "_blank");
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="space-y-6 pb-12">
      {toastNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Physician & Specialist Management</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage physician profiles, credentials, specialties, schedules, licenses, and Doctor Portal accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={fetchDoctors}
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
            <span>Export</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleOpenAddWizard}
            className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Doctor</span>
          </GlassButton>
        </div>
      </div>

      {/* TOP 6 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Active Doctors</span>
          <span className="text-2xl font-black text-slate-900 block">{kpis.active_doctors}</span>
          <span className="text-[10px] font-semibold text-slate-400">Portal Enabled</span>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Inactive Doctors</span>
          <span className="text-2xl font-black text-slate-700 block">{kpis.inactive_doctors}</span>
          <span className="text-[10px] font-semibold text-slate-400">Suspended / Deactivated</span>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">Pending Approval</span>
          <span className="text-2xl font-black text-amber-700 block">{kpis.pending_approval}</span>
          <span className="text-[10px] font-semibold text-slate-400">Awaiting Credential Review</span>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Departments Covered</span>
          <span className="text-2xl font-black text-indigo-900 block">{kpis.departments_covered}</span>
          <span className="text-[10px] font-semibold text-slate-400">Wards & ICUs</span>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">Today's Consultations</span>
          <span className="text-2xl font-black text-purple-900 block">{kpis.today_consultations}</span>
          <span className="text-[10px] font-semibold text-slate-400">AI Risk Assessments</span>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 space-y-1">
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Average Experience</span>
          <span className="text-2xl font-black text-blue-900 block">{kpis.average_experience} <span className="text-xs text-slate-500 font-bold">Yrs</span></span>
          <span className="text-[10px] font-semibold text-slate-400">Clinical Practice</span>
        </GlassCard>
      </div>

      {/* SEARCH & FILTER BAR */}
      <GlassCard className="p-4 bg-white border border-slate-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Global Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Name, Email, License #, Department, Specialty, Phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">📂 All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id || d.code}>{d.name}</option>
            ))}
          </select>

          {/* Specialty Filter */}
          <select
            value={specialtyFilter}
            onChange={(e) => { setSpecialtyFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">🩺 All Specialties</option>
            {SPECIALTIES_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">🚦 All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">🟢 Availability Status</option>
            {AVAILABILITY_STATUSES.map((av) => (
              <option key={av} value={av}>{av}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-2 border-t border-slate-100 gap-3">
          <span className="text-[11px] font-bold text-slate-500">
            Showing <span className="text-slate-900 font-extrabold">{doctors.length}</span> of <span className="text-slate-900 font-extrabold">{totalCount}</span> Physician Profiles
          </span>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="created_at_desc">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name_asc">Sort: Doctor Name (A-Z)</option>
              <option value="experience_desc">Sort: Highest Experience</option>
            </select>

            <button
              onClick={fetchDoctors}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* DOCTOR TABLE DATA GRID */}
      <GlassCard className="p-0 bg-white border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Physician Profiles from PostgreSQL...</p>
          </div>
        ) : doctors.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-16 text-center space-y-4">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Stethoscope className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">No Doctors Registered</h3>
              <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                Create your first physician profile to provision Doctor Portal access, assign patients, and run AI CHD predictions.
              </p>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleOpenAddWizard}
              className="px-5 py-2.5 font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Doctor</span>
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-4">Doctor & Credential</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Department & Facility</th>
                  <th className="py-3.5 px-4">Specialty</th>
                  <th className="py-3.5 px-4">Medical License</th>
                  <th className="py-3.5 px-4">Exp & Qualification</th>
                  <th className="py-3.5 px-4">Employment</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {doctors.map((doc) => {
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition duration-150">
                      {/* Doctor Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              {doc.full_name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                              doc.availability_status === "Available" ? "bg-emerald-500" : doc.availability_status === "Busy" ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">{doc.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">{doc.designation}</span>
                            <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/60 inline-block mt-0.5">
                              {doc.doctor_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-bold block">{doc.email}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{doc.phone}</span>
                      </td>

                      {/* Department & Hospital */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block">{doc.department_name}</span>
                        <span className="text-[10px] text-slate-400">{doc.hospital_name}</span>
                      </td>

                      {/* Specialty */}
                      <td className="py-3.5 px-4">
                        <span className="text-indigo-900 font-extrabold block">{doc.specialty}</span>
                        <span className="text-[10px] text-slate-400">{doc.sub_specialization}</span>
                      </td>

                      {/* Medical License */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{doc.license_number}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded inline-block ${
                          doc.license_status === "Expired" ? "bg-rose-50 text-rose-700" : doc.license_status.includes("Due") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {doc.license_status}
                        </span>
                      </td>

                      {/* Experience & Qualification */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-bold block">{doc.years_of_experience} Years Exp</span>
                        <span className="text-[10px] text-slate-400">{doc.qualification}</span>
                      </td>

                      {/* Employment Type */}
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 inline-block">
                          {doc.employment_type}
                        </span>
                      </td>

                      {/* Availability */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit ${
                          doc.availability_status === "Available" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          doc.availability_status === "Busy" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          doc.availability_status === "In Surgery" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            doc.availability_status === "Available" ? "bg-emerald-500" : doc.availability_status === "Busy" ? "bg-amber-500" : "bg-purple-500"
                          }`} />
                          {doc.availability_status}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          (doc.status || "").toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : (doc.status || "").toLowerCase() === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {doc.status || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDoctor(doc)}
                            title="View Full Profile Drawer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            title="Edit Doctor Credentials"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(doc)}
                            title="Reset Portal Password"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          {doc.is_active ? (
                            <button
                              onClick={() => handleDeactivateDoctor(doc)}
                              title="Deactivate Account"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateDoctor(doc)}
                              title="Activate Account"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDoctor(doc)}
                            title="Soft Delete Profile"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold">
            Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
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
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ADD DOCTOR 5-STEP WIZARD MODAL */}
      {isAddWizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-3xl w-full my-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Provision Physician & Doctor Portal Account</h3>
                  <p className="text-xs text-slate-500 font-semibold">Step {wizardStep} of 5: {
                    wizardStep === 1 ? "Personal Information" :
                    wizardStep === 2 ? "Professional Details & Medical License" :
                    wizardStep === 3 ? "Hospital & Department Assignment" :
                    wizardStep === 4 ? "Doctor Portal Account Credentials" :
                    "Review & Create Account"
                  }</p>
                </div>
              </div>
              <button onClick={() => setIsAddWizardOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* STEP PROGRESS INDICATOR */}
            <div className="flex items-center justify-between gap-2 px-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex-1 flex items-center">
                  <div className={`h-2 rounded-full w-full transition-all duration-300 ${
                    wizardStep >= step ? "bg-indigo-600" : "bg-slate-200"
                  }`} />
                </div>
              ))}
            </div>

            {/* STEP 1: PERSONAL INFORMATION */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs font-semibold">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>STEP 1: PERSONAL INFORMATION</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Doctor Full Name *</label>
                    <input
                      type="text"
                      required
                      value={addForm.full_name}
                      onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                      placeholder="e.g. Dr. Alexander Vance, MD"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value.toLowerCase() })}
                      placeholder="doctor@hospital.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="+1 (555) 019-2831"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={addForm.emergency_contact}
                      onChange={(e) => setAddForm({ ...addForm, emergency_contact: e.target.value })}
                      placeholder="+1 (555) 999-1122"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Gender</label>
                    <select
                      value={addForm.gender}
                      onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={addForm.dob}
                      onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PROFESSIONAL DETAILS & LICENSE */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs font-semibold">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-600" />
                  <span>STEP 2: PROFESSIONAL DETAILS & MEDICAL LICENSE</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Medical License Number *</label>
                    <input
                      type="text"
                      required
                      value={addForm.license_number}
                      onChange={(e) => setAddForm({ ...addForm, license_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. MD-98231"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold text-indigo-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Medical Council Board</label>
                    <input
                      type="text"
                      value={addForm.medical_council}
                      onChange={(e) => setAddForm({ ...addForm, medical_council: e.target.value })}
                      placeholder="State Medical Board"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Primary Specialty *</label>
                    <select
                      value={addForm.specialty}
                      onChange={(e) => setAddForm({ ...addForm, specialty: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                    >
                      {SPECIALTIES_LIST.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Sub-Specialization</label>
                    <input
                      type="text"
                      value={addForm.sub_specialization}
                      onChange={(e) => setAddForm({ ...addForm, sub_specialization: e.target.value })}
                      placeholder="e.g. Coronary Angioplasty"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Qualifications</label>
                    <input
                      type="text"
                      value={addForm.qualification}
                      onChange={(e) => setAddForm({ ...addForm, qualification: e.target.value })}
                      placeholder="MD, FACC, FSCAI"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={addForm.years_of_experience}
                      onChange={(e) => setAddForm({ ...addForm, years_of_experience: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: HOSPITAL & DEPARTMENT */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs font-semibold">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>STEP 3: HOSPITAL WORKSPACE & DEPARTMENT</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Hospital Facility *</label>
                    <select
                      value={addForm.hospital_id}
                      onChange={(e) => setAddForm({ ...addForm, hospital_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id || h.code}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Clinical Department *</label>
                    <select
                      value={addForm.department_id}
                      onChange={(e) => setAddForm({ ...addForm, department_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id || d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Designation</label>
                    <input
                      type="text"
                      value={addForm.designation}
                      onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                      placeholder="Attending Cardiologist"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: DOCTOR PORTAL ACCOUNT */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs font-semibold">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <span>STEP 4: DOCTOR PORTAL ACCOUNT CREDENTIALS</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Generated Temporary Password</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={addForm.password}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold text-indigo-900"
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-200 cursor-pointer"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addForm.must_change_password}
                        onChange={(e) => setAddForm({ ...addForm, must_change_password: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span>Force Password Reset on First Login</span>
                    </label>

                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addForm.enable_account}
                        onChange={(e) => setAddForm({ ...addForm, enable_account: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span>Enable Doctor Portal Login Account</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & CREATE */}
            {wizardStep === 5 && (
              <div className="space-y-4 text-xs font-semibold">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-indigo-600" />
                  <span>STEP 5: REVIEW & CREATE PHYSICIAN PROFILE</span>
                </h4>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name</span>
                    <span className="font-bold text-slate-900">{addForm.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Email</span>
                    <span className="font-bold text-slate-900">{addForm.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Medical License</span>
                    <span className="font-mono font-bold text-indigo-600">{addForm.license_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Specialty</span>
                    <span className="font-bold text-slate-900">{addForm.specialty} ({addForm.years_of_experience} Yrs Exp)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Designation</span>
                    <span className="font-bold text-slate-900">{addForm.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Temporary Password</span>
                    <span className="font-mono font-bold text-emerald-600">{addForm.password}</span>
                  </div>
                </div>
              </div>
            )}

            {/* WIZARD NAVIGATION BUTTONS */}
            <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={wizardStep <= 1}
                onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold disabled:opacity-40 cursor-pointer"
              >
                Back
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWizardOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && (!addForm.full_name || !addForm.email)) {
                        alert("Please fill in Doctor Name and Email Address.");
                        return;
                      }
                      setWizardStep(s => Math.min(5, s + 1));
                    }}
                    className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-extrabold cursor-pointer"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleAddDoctorSubmit}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? "Creating Profile..." : "Confirm & Create Physician →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR PROFILE SIDE DRAWER */}
      {isViewDrawerOpen && activeDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-xl w-full h-full p-6 space-y-6 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {activeDoctor.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{activeDoctor.full_name}</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600">{activeDoctor.doctor_id}</span>
                </div>
              </div>
              <button onClick={() => setIsViewDrawerOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Primary Specialty</span>
                  <span className="text-indigo-900 font-black">{activeDoctor.specialty}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Sub-Specialization</span>
                  <span className="text-slate-900 font-bold">{activeDoctor.sub_specialization}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Medical License #</span>
                  <span className="font-mono font-bold text-slate-900">{activeDoctor.license_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Experience</span>
                  <span className="text-slate-900 font-bold">{activeDoctor.years_of_experience} Years</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Department</span>
                  <span className="text-slate-900 font-bold">{activeDoctor.department_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Hospital Facility</span>
                  <span className="text-slate-900 font-bold">{activeDoctor.hospital_name}</span>
                </div>
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block">Patients Assigned</span>
                <span className="text-xl font-black text-slate-900">{activeDoctor.patients_assigned}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-600 block">Predictions Executed</span>
                <span className="text-xl font-black text-indigo-900">{activeDoctor.prediction_count}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-600 block">License Expiry</span>
                <span className="text-xs font-mono font-extrabold text-slate-800 block mt-1">{activeDoctor.license_expiry}</span>
              </div>
            </div>

            {/* Bio & Credentials */}
            <div className="space-y-2 text-xs">
              <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-wider">Clinical Biography & Credentials</h4>
              <p className="text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {activeDoctor.bio}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1 font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px] block">Languages Spoken</span>
                  <span className="text-slate-800 font-bold">{activeDoctor.languages}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Certifications</span>
                  <span className="text-slate-800 font-bold">{activeDoctor.certificates}</span>
                </div>
              </div>
            </div>

            {/* Audit History */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity Trail</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(detailedDoctorInfo?.recent_activities || []).map((act: any) => (
                  <div key={act.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{act.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{act.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {isEditModalOpen && activeDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Edit Doctor Credentials & Status</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 bg-slate-100 rounded-xl text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specialty</label>
                  <select
                    value={editForm.specialty}
                    onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    {SPECIALTIES_LIST.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={editForm.years_of_experience}
                    onChange={(e) => setEditForm({ ...editForm, years_of_experience: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Availability Status</label>
                  <select
                    value={editForm.availability_status}
                    onChange={(e) => setEditForm({ ...editForm, availability_status: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900"
                  >
                    {AVAILABILITY_STATUSES.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    {STATUS_OPTIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-extrabold">
                  {isSubmitting ? "Saving..." : "Update Database →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD RESULT MODAL */}
      {isResetPasswordModalOpen && activeDoctor && resetPasswordResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Doctor Portal Temporary Password</h3>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="p-1 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Password for <span className="font-bold text-slate-900">{activeDoctor.email}</span> has been reset. The physician will be forced to change their password on next login.
            </p>

            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">New Temporary Password</span>
              <span className="text-lg font-mono font-black text-emerald-400 block">{resetPasswordResult.temporary_password}</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordResult.temporary_password);
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2"
              >
                {copiedPass ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPass ? "Copied!" : "Copy Password"}</span>
              </button>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
