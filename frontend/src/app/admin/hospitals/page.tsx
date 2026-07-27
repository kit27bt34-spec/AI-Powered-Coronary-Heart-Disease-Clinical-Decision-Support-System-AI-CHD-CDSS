"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2, Plus, Search, MapPin, BedDouble, CheckCircle2, Shield,
  X, UserCheck, Stethoscope, Activity, Phone, User, Layers, ArrowRight, Sparkles,
  Filter, Globe, RefreshCw
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { api } from "@/lib/api";

export default function AdminHospitalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inspectParam = searchParams.get("inspect");

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [hospitalDetails, setHospitalDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    city: "",
    state: "",
    status: "Active",
    total_beds: 0,
    icu_beds: 0,
    ccu_beds: 0
  });

  const fetchHospitals = () => {
    api.get("/api/v1/admin/hospitals")
      .then(res => setHospitals(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error loading hospitals:", err));
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const closeInspection = () => {
    setSelectedHospital(null);
    setHospitalDetails(null);
    if (inspectParam) {
      router.replace("/admin/hospitals");
    }
  };

  useEffect(() => {
    if (inspectParam && hospitals.length > 0 && !selectedHospital) {
      const matched = hospitals.find(
        (h) =>
          (h.code && h.code.toLowerCase() === inspectParam.toLowerCase()) ||
          (h.id && String(h.id).toLowerCase() === inspectParam.toLowerCase())
      );
      if (matched) {
        handleSelectHospital(matched);
      }
    }
  }, [inspectParam, hospitals]);



  const openEditModal = () => {
    const target = hospitalDetails || selectedHospital;
    if (target) {
      setEditForm({
        name: target.name || "",
        code: target.code || "",
        city: target.city || "",
        state: target.state || "",
        status: target.status || "Active",
        total_beds: target.total_beds || 0,
        icu_beds: target.icu_beds || 0,
        ccu_beds: target.ccu_beds || 20
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveFacilityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const targetId = selectedHospital?.id || selectedHospital?.code;
      const res = await api.put(`/api/v1/admin/hospitals/${targetId}`, editForm);
      fetchHospitals();
      setSelectedHospital(res.data);
      setHospitalDetails((prev: any) => ({ ...prev, ...res.data }));
      setSaveSuccessMessage("Facility configuration saved to database successfully!");
      setTimeout(() => setSaveSuccessMessage(""), 3500);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error("Error saving hospital configuration:", err);
      alert(err?.response?.data?.detail || "Failed to save facility configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectHospital = async (h: any) => {
    setSelectedHospital(h);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/api/v1/admin/hospitals/${h.id}`);
      setHospitalDetails(res.data);
    } catch (err) {
      console.error("Error loading hospital details from backend:", err);
      setHospitalDetails({
        ...h,
        total_doctors: 0,
        total_patients: 0,
        total_predictions: 0,
        departments: []
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      (h.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.city || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (h.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalBeds = hospitals.reduce((acc, h) => acc + (h.total_beds || 0), 0);
  const totalIcuBeds = hospitals.reduce((acc, h) => acc + (h.icu_beds || 0), 0);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get("/api/v1/admin/hospitals");
      setHospitals(Array.isArray(res.data) ? res.data : []);
      if (selectedHospital) {
        const det = await api.get(`/api/v1/admin/hospitals/${selectedHospital.id || selectedHospital.code}`);
        setHospitalDetails(det.data);
      }
      setRefreshSuccessMessage("Database synchronized! Refreshed latest hospital facility records & telemetry.");
      setTimeout(() => setRefreshSuccessMessage(""), 3500);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {refreshSuccessMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" />
            <span>{refreshSuccessMessage}</span>
          </div>
          <button onClick={() => setRefreshSuccessMessage("")} className="text-indigo-400 hover:text-indigo-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Hospital Network Management</h1>
            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 uppercase">
              {hospitals.length} Facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage healthcare facilities, inspect clinical wards, staff allocations, and telemetry details
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer border border-slate-200 hover:bg-slate-100 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => router.push("/admin/hospitals/new")}
            className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Provision Facility</span>
          </GlassButton>
        </div>
      </div>


      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 bg-white border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Facilities</span>
            <span className="text-2xl font-black text-slate-900">{hospitals.length}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Active Hospitals</span>
            <span className="text-2xl font-black text-emerald-600">
              {hospitals.filter(h => (h.status || "").toLowerCase() === "active").length}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Network Beds</span>
            <span className="text-2xl font-black text-slate-900">{totalBeds}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-white border border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">ICU Telemetry Capacity</span>
            <span className="text-2xl font-black text-purple-600">{totalIcuBeds}</span>
          </div>
        </GlassCard>
      </div>

      {/* Toolbar: Search & Filters */}
      <GlassCard className="p-4 bg-white border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals by name, code, city..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold text-slate-600 w-full sm:w-auto">
            {["all", "active", "maintenance"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                  statusFilter === status ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHospitals.map((hospital) => (
          <GlassCard
            key={hospital.id}
            hoverLift
            className="p-5 bg-white border border-slate-100 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{hospital.name}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{hospital.city ? `${hospital.city}, ${hospital.state || "MA"}` : "Primary Facility"}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  (hospital.status || "").toLowerCase() === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {hospital.status || "Active"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Facility Code</span>
                  <span className="font-black text-indigo-900 font-mono">{hospital.code || "SJH-01"}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Allocated Bed Capacities</span>
                  <span className="font-black text-slate-800 text-[11px]">{hospital.total_beds || 0} Normal | {hospital.icu_beds || 0} ICU | {hospital.ccu_beds || 20} CCU</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleSelectHospital(hospital)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                <span>Inspect Clinical Wards</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Inspect Hospital Modal Drawer */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">{selectedHospital.name}</h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Code: <span className="font-mono text-indigo-600">{selectedHospital.code}</span> | {selectedHospital.city}, {selectedHospital.state}
                  </p>
                </div>
              </div>
              <button
                onClick={closeInspection}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Hospital Telemetry & Clinical Wards...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Telemetry Overview Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Active Doctors</span>
                    <span className="text-2xl font-black text-indigo-900">{hospitalDetails?.total_doctors ?? 0}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Registered Patients</span>
                    <span className="text-2xl font-black text-emerald-900">{hospitalDetails?.total_patients ?? 0}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
                    <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">AI Predictions</span>
                    <span className="text-2xl font-black text-purple-900">{hospitalDetails?.total_predictions ?? 0}</span>
                  </div>
                </div>

                {/* Facility Leadership */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <span>Facility Leadership & Operational Contacts</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Medical Director</span>
                      <span className="text-slate-800 font-bold">{hospitalDetails?.director || "Medical Director Assigned"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Governance Officer</span>
                      <span className="text-slate-800 font-bold">{hospitalDetails?.governance_officer || "admin@hospital.org"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Emergency Hotline</span>
                      <span className="text-indigo-600 font-bold">{hospitalDetails?.emergency_phone || "Hospital Operations"}</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Wards & Specializations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span>Active Clinical Wards & Specializations</span>
                  </h4>

                  {hospitalDetails?.departments && hospitalDetails.departments.length > 0 ? (
                    <div className="space-y-2">
                      {hospitalDetails.departments.map((dept: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-200/70 hover:border-indigo-200 transition">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              <Stethoscope className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">{dept.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold">Head: {dept.head_clinician || "Head Clinician Assigned"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              {dept.code}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {dept.status || "Active"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-bold bg-slate-50 border border-slate-200/60 rounded-2xl">
                      No clinical departments registered for this hospital facility.
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={closeInspection}
                    className="px-4 py-2 font-bold text-xs cursor-pointer"
                  >
                    Close Inspection
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={openEditModal}
                    className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Edit Facility Configuration</span>
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Facility Configuration Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Facility Configuration</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Update hospital parameters in PostgreSQL database</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFacilityConfig} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Hospital Facility Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Facility Code</label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-indigo-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Operational Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">City Location</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">State Code</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Normal Beds Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.total_beds}
                    onChange={(e) => setEditForm({ ...editForm, total_beds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ICU Beds Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.icu_beds}
                    onChange={(e) => setEditForm({ ...editForm, icu_beds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">CCU Beds Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.ccu_beds}
                    onChange={(e) => setEditForm({ ...editForm, ccu_beds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving Configuration..." : "Save Configuration →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
