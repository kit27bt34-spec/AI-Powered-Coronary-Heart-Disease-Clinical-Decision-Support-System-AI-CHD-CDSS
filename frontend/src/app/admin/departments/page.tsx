"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Layers, Plus, Stethoscope, CheckCircle2, Building2, Search, Filter,
  RefreshCw, X, Shield, ChevronDown, Edit3, Trash2, ArrowRight, UserCheck
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hospitalParam = searchParams.get("hospital");

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitalParam || "all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    head_clinician: "",
    hospital_id: "",
    status: "Active"
  });

  // Fetch Hospitals List
  useEffect(() => {
    api.get("/api/v1/admin/hospitals")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setHospitals(list);
        if (!hospitalParam && typeof window !== "undefined") {
          const savedHosp = localStorage.getItem("selected_hospital_id");
          if (savedHosp && list.some(h => h.id === savedHosp || h.code === savedHosp)) {
            setSelectedHospitalId(savedHosp);
          }
        }
      })
      .catch(err => console.error("Error loading hospitals:", err));
  }, [hospitalParam]);

  // Fetch Departments based on Selected Hospital
  const fetchDepartments = (hospId: string) => {
    setIsLoading(true);
    const url = hospId && hospId !== "all"
      ? `/api/v1/admin/departments?hospital_id=${encodeURIComponent(hospId)}`
      : "/api/v1/admin/departments";

    api.get(url)
      .then(res => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error loading departments:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDepartments(selectedHospitalId);
  }, [selectedHospitalId]);

  const handleHospitalChange = (hId: string) => {
    setSelectedHospitalId(hId);
    if (hId !== "all") {
      router.push(`/admin/departments?hospital=${encodeURIComponent(hId)}`);
    } else {
      router.push("/admin/departments");
    }
  };

  const handleCreateDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...createForm,
        hospital_id: createForm.hospital_id || (selectedHospitalId !== "all" ? selectedHospitalId : hospitals[0]?.code)
      };
      await api.post("/api/v1/admin/departments", payload);
      fetchDepartments(selectedHospitalId);
      setSuccessMessage(`Department "${createForm.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(""), 3500);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: "",
        code: "",
        head_clinician: "",
        hospital_id: "",
        status: "Active"
      });
    } catch (err: any) {
      console.error("Error creating department:", err);
      alert(err?.response?.data?.detail || "Failed to create department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      (d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.head_clinician || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (d.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const selectedHospitalObj = hospitals.find(
    (h) => h.id === selectedHospitalId || h.code === selectedHospitalId
  );

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Hospital Workspace Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Clinical Department Governance</h1>
            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 uppercase">
              {selectedHospitalObj ? selectedHospitalObj.name : "All Hospital Facilities"}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage clinical specialty divisions, lead clinicians, and operational status for hospital facilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Hospital Selector Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedHospitalId}
              onChange={(e) => handleHospitalChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition shadow-2xs cursor-pointer"
            >
              <option value="all">🏥 All Hospital Facilities ({hospitals.length})</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.code || h.id}>
                  {h.name} ({h.code || "SJH-01"})
                </option>
              ))}
            </select>
          </div>

          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Department</span>
          </GlassButton>
        </div>
      </div>

      {/* Toolbar & Search Controls */}
      <GlassCard className="p-4 bg-white border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name, code, or clinician lead..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold text-slate-600">
              {["all", "active", "maintenance"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                    statusFilter === st ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => fetchDepartments(selectedHospitalId)}
            className="px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </GlassButton>
        </div>
      </GlassCard>

      {/* Row-Wise Order List / Table Design */}
      <GlassCard className="p-0 bg-white border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Hospital Clinical Departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">No Clinical Departments Found</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
              No departments found for {selectedHospitalObj ? selectedHospitalObj.name : "the selected filter"}. Click below to provision a new department.
            </p>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 font-bold text-xs mx-auto flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Department</span>
            </GlassButton>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Table Header Row */}
            <div className="hidden md:grid grid-cols-12 px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="col-span-4">Department & Specialty Code</div>
              <div className="col-span-3">Hospital Facility</div>
              <div className="col-span-3">Head Clinician / Lead</div>
              <div className="col-span-2 text-right">Status & Actions</div>
            </div>

            {/* Department Rows */}
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="grid grid-cols-1 md:grid-cols-12 px-6 py-4 items-center gap-4 hover:bg-indigo-50/40 transition duration-150 group"
              >
                {/* Department Info */}
                <div className="md:col-span-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 block group-hover:text-indigo-600 transition">
                      {dept.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-indigo-900 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {dept.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[160px]">
                        {dept.description || "Specialized Ward"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hospital Facility */}
                <div className="md:col-span-3 flex items-center gap-2 text-xs font-semibold">
                  <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-900 font-bold block leading-snug">{dept.hospital_name || "St. Jude Memorial Hospital"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Code: {dept.hospital_code || "SJH-01"}</span>
                  </div>
                </div>

                {/* Head Clinician */}
                <div className="md:col-span-3 flex items-center gap-2 text-xs font-semibold">
                  <Stethoscope className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <span className="text-slate-800 font-bold block">{dept.head_clinician || "Head Clinician Assigned"}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">Lead Physician</span>
                  </div>
                </div>

                {/* Status & Action Buttons */}
                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    (dept.status || "").toLowerCase() === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {dept.status || "Active"}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/admin/hospitals?inspect=${dept.hospital_code || 'SJH-01'}`)}
                      title="Inspect Wards"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Create Department Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Clinical Department</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Provision a new ward division for hospital facility</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartmentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Department Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Intensive Care Unit (ICU)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Department Code *</label>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ICU-02"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-indigo-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Operational Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Target Hospital Facility</label>
                <select
                  value={createForm.hospital_id || (selectedHospitalId !== "all" ? selectedHospitalId : "")}
                  onChange={(e) => setCreateForm({ ...createForm, hospital_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.code || h.id}>
                      {h.name} ({h.code || "SJH-01"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Head Clinician / Lead Doctor</label>
                <input
                  type="text"
                  value={createForm.head_clinician}
                  onChange={(e) => setCreateForm({ ...createForm, head_clinician: e.target.value })}
                  placeholder="e.g. Dr. Alexander Vance, MD"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Provisioning..." : "Create Department →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
