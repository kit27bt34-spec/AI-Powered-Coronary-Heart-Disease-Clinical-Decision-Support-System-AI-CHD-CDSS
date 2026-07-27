"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  Search,
  Filter,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  BrainCircuit,
  Stethoscope,
  X
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassBadge from "@/components/ui/GlassBadge";
import RefreshButton from "@/components/ui/RefreshButton";

export default function PatientsRegistry() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  // State managers for filters and registry list
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState<"age" | "risk" | "hadm_id">("hadm_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Patient Registration Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [careunit, setCareunit] = useState("ICU Bed");
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<number | "">("");
  const [bmi, setBmi] = useState<number | "">("");
  const [systolicBp, setSystolicBp] = useState<number | "">("");
  const [diastolicBp, setDiastolicBp] = useState<number | "">("");
  const [heartRate, setHeartRate] = useState<number | "">("");
  const [glucose, setGlucose] = useState<number | "">("");
  const [cholesterol, setCholesterol] = useState<number | "">("");
  const [medicationCount, setMedicationCount] = useState<number | "">("");
  
  const [hypertension, setHypertension] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [previousCardiac, setPreviousCardiac] = useState(false);
  const [statinHistory, setStatinHistory] = useState(false);
  const [betaBlockerHistory, setBetaBlockerHistory] = useState(false);
  const [aceArbHistory, setAceArbHistory] = useState(false);
  const [aspirinHistory, setAspirinHistory] = useState(false);

  // Fetch Patients Registry
  const { data: patients, isLoading, error, refetch } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const hosp = typeof window !== "undefined" ? localStorage.getItem("selected_hospital_name") || "St. Jude Memorial" : "St. Jude Memorial";
      const slug = hosp.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await api.get(`/api/v1/patients?hospital=${slug}`);
      return res.data;
    },
  });

  // Fetch Bed Capacity Metrics
  const { data: capacityData, refetch: refetchCapacity } = useQuery({
    queryKey: ["bedCapacity"],
    queryFn: async () => {
      const hosp = typeof window !== "undefined" ? localStorage.getItem("selected_hospital_name") || "St. Jude Memorial" : "St. Jude Memorial";
      const slug = hosp.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await api.get(`/api/v1/patients/bed-capacity?hospital=${slug}`);
      return res.data;
    },
    enabled: isModalOpen,
  });

  // Fetch Doctors in current hospital
  const { data: hospitalDoctors = [] } = useQuery({
    queryKey: ["hospitalDoctors"],
    queryFn: async () => {
      const hosp = typeof window !== "undefined" ? localStorage.getItem("selected_hospital_name") || "St. Jude Memorial" : "St. Jude Memorial";
      const slug = hosp.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await api.get(`/api/v1/patients/doctors?hospital=${slug}`);
      return res.data;
    },
    enabled: isModalOpen,
  });

  const selectedUnitKey = careunit.includes("ICU") ? "icu" : careunit.includes("CCU") ? "ccu" : "normal";
  const selectedUnitCapacity = capacityData?.[selectedUnitKey] || { occupied: 0, total: 20 };
  const isCapExceeded = selectedUnitCapacity.occupied >= selectedUnitCapacity.total;

  const handleSort = (field: "age" | "risk" | "hadm_id") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Submit Patient Registration to Database
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || age === "" || gender === "") {
      toast("Please fill in all mandatory patient fields.", "warning", "Validation Required");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/api/v1/patients", {
        name: patientName,
        careunit: careunit || "ICU Bed",
        assigned_doctor_id: assignedDoctorId || null,
        age: Number(age),
        gender: typeof gender === "number" ? gender : 0,
        bmi: typeof bmi === "number" ? bmi : null,
        systolic_bp: typeof systolicBp === "number" ? systolicBp : null,
        diastolic_bp: typeof diastolicBp === "number" ? diastolicBp : null,
        heart_rate: typeof heartRate === "number" ? heartRate : null,
        glucose: typeof glucose === "number" ? glucose : null,
        cholesterol: typeof cholesterol === "number" ? cholesterol : null,
        medication_count: typeof medicationCount === "number" ? medicationCount : 0,
        hypertension: hypertension ? 1 : 0,
        diabetes: diabetes ? 1 : 0,
        smoking: smoking ? 1 : 0,
        previous_cardiac: previousCardiac ? 1 : 0,
        statin_history: statinHistory ? 1 : 0,
        beta_blocker_history: betaBlockerHistory ? 1 : 0,
        ace_arb_history: aceArbHistory ? 1 : 0,
        aspirin_history: aspirinHistory ? 1 : 0,
      });

      toast("Patient medical record created successfully in ICU registry.", "success", "Patient Registered");
      setIsModalOpen(false);
      refetch(); // Reload the datatable
      
      // Reset registration states
      setPatientName("");
      setAge("");
      setGender("");
      setBmi("");
      setSystolicBp("");
      setDiastolicBp("");
      setHeartRate("");
      setGlucose("");
      setCholesterol("");
      setMedicationCount("");
      setHypertension(false);
      setDiabetes(false);
      setSmoking(false);
      setPreviousCardiac(false);
      setStatinHistory(false);
      setBetaBlockerHistory(false);
      setAceArbHistory(false);
      setAspirinHistory(false);
    } catch (err: any) {
      toast(err.response?.data?.detail || "Could not register new patient. Check server logs.", "error", "Registration Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and Sort patients list
  const processedPatients = useMemo(() => {
    if (!patients) return [];

    let filtered = [...patients];

    // Search query matching
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.patient_uuid.toLowerCase().includes(query) ||
          (p.name && p.name.toLowerCase().includes(query)) ||
          p.hadm_id?.toString().includes(query) ||
          p.patient_id.toString().includes(query)
      );
    }

    // Gender filter
    if (genderFilter !== "all") {
      const genderCode = genderFilter === "male" ? 1 : 0;
      filtered = filtered.filter((p) => p.gender === genderCode);
    }

    // Risk level filter
    if (riskFilter !== "all") {
      filtered = filtered.filter((p) => {
        const risk = p.chd_risk_score || 0;
        if (riskFilter === "high") return risk >= 0.20;
        if (riskFilter === "warning") return risk >= 0.10 && risk < 0.20;
        return risk < 0.10;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === "age") {
        valA = a.age;
        valB = b.age;
      } else if (sortField === "risk") {
        valA = a.chd_risk_score || 0;
        valB = b.chd_risk_score || 0;
      } else if (sortField === "hadm_id") {
        valA = a.hadm_id || 0;
        valB = b.hadm_id || 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [patients, searchTerm, genderFilter, riskFilter, sortField, sortOrder]);

  // Pagination calculations
  const totalItems = processedPatients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = processedPatients.slice(startIndex, startIndex + itemsPerPage);

  const getRiskBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return <GlassBadge variant="neutral">N/A</GlassBadge>;
    if (score >= 0.20) return <GlassBadge variant="danger">High Risk ({(score * 100).toFixed(0)}%)</GlassBadge>;
    if (score >= 0.10) return <GlassBadge variant="warning">Moderate ({(score * 100).toFixed(0)}%)</GlassBadge>;
    return <GlassBadge variant="success">Low Risk ({(score * 100).toFixed(0)}%)</GlassBadge>;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ICU Patient Registry</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            List of admitted patients showing telemetry vitals, blood pressure ranges, and CHD risk stratifications.
          </p>
          {user && ["lab tech", "ecg tech", "radiology tech", "pharmacist", "physiotherapist", "dietitian"].includes(user.role.toLowerCase()) && (
            <div className="mt-2 text-[10px] bg-amber-50 text-amber-700 font-extrabold border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
              <Filter className="h-3 w-3" />
              <span>Assigned Patients Scoping (Role: {user.role})</span>
            </div>
          )}
          {user && user.role.toLowerCase() === "medical researcher" && (
            <div className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
              <Eye className="h-3 w-3" />
              <span>De-identified Research Mode (UUIDs anonymized)</span>
            </div>
          )}
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-3">
          <RefreshButton onRefresh={() => { refetch(); refetchCapacity(); }} />
          {user && ["admin", "doctor", "nurse"].includes(user.role.toLowerCase()) && (
            <GlassButton variant="primary" size="sm" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: "#0F2573", color: "#fff" }}>
              <Plus className="h-4 w-4" />
              <span>Register New Patient</span>
            </GlassButton>
          )}
        </div>
      </div>

      {/* Search and Filters deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 border border-slate-200/40 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search Patient UUID / hadm ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white/60 hover:bg-white border border-slate-200/50 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
          />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Gender Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white/60 hover:bg-white border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-primary focus:border-primary transition cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* Risk Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white/60 hover:bg-white border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-primary focus:border-primary transition cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk (&lt;10%)</option>
            <option value="warning">Moderate Risk (10%-20%)</option>
            <option value="high">High Risk (&ge;20%)</option>
          </select>
        </div>

        <div className="text-right text-[10px] font-extrabold text-slate-400 flex items-center justify-end">
          Total: {totalItems} Patients Found
        </div>
      </div>

      {/* Patient Table Grid */}
      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span className="text-xs font-bold text-slate-400 animate-pulse">Loading Cohort registry...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-bold">
            Failed to retrieve clinical patient registry. Check backend service status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200/50 bg-slate-100/30 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold select-none">
                  <th className="py-4 px-6">Patient Name</th>
                  <th className="py-4 px-6">Patient UUID</th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition" onClick={() => handleSort("hadm_id")}>
                    <div className="flex items-center gap-1">
                      <span>Admission hadm ID</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition" onClick={() => handleSort("age")}>
                    <div className="flex items-center gap-1">
                      <span>Age</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-4 px-6">Gender</th>
                  <th className="py-4 px-6">Bed Option</th>
                  <th className="py-4 px-6">Assigned Doctor</th>
                  <th className="py-4 px-6">BP Vitals</th>
                  <th className="py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition" onClick={() => handleSort("risk")}>
                    <div className="flex items-center gap-1">
                      <span>Stratified Risk</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {paginatedPatients.length > 0 ? (
                  paginatedPatients.map((p) => {
                    const risk = p.chd_risk_score;
                    const bedType = p.careunit || "ICU Bed";
                    const docName = p.assigned_doctor_name || "Unassigned";
                    return (
                      <tr
                        key={p.hadm_id || p.patient_id}
                        className="border-b border-slate-100/50 hover:bg-slate-50/40 transition"
                      >
                        <td className="py-3 px-6 font-bold text-slate-800">
                          {p.name || "Unknown Patient"}
                        </td>
                        <td className="py-3 px-6 font-mono text-[10px] text-slate-500 max-w-[120px] truncate">
                          {p.patient_uuid}
                        </td>
                        <td className="py-3 px-6 font-extrabold text-slate-800">{p.hadm_id}</td>
                        <td className="py-3 px-6">{p.age} yrs</td>
                        <td className="py-3 px-6">{p.gender === 1 ? "Male" : "Female"}</td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            bedType.includes("Normal")
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : bedType.includes("CCU")
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {bedType}
                          </span>
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#E8F6FE] text-[#0F2573] border border-[#ADE1FB]">
                            <Stethoscope className="h-3.5 w-3.5 text-[#266CA9]" />
                            <span>{docName}</span>
                          </span>
                        </td>
                        <td className="py-3 px-6 font-mono text-slate-500">
                          {p.systolic_bp ? `${p.systolic_bp}/${p.diastolic_bp} mmHg` : "N/A"}
                        </td>
                        <td className="py-3 px-6">{getRiskBadge(risk)}</td>
                        <td className="py-3 px-6 text-right space-x-1.5 whitespace-nowrap">
                          <GlassButton
                            variant="secondary"
                            size="sm"
                            className="py-1 px-2.5 border-[#ADE1FB] text-[#0F2573] hover:bg-[#E8F6FE]"
                            onClick={() => router.push(`/patients/${p.patient_id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Card</span>
                          </GlassButton>
                          {user && ["admin", "doctor"].includes(user.role.toLowerCase()) && (
                            <GlassButton
                              variant="primary"
                              size="sm"
                              className="py-1 px-2.5"
                              style={{ backgroundColor: "#0F2573", color: "#fff" }}
                              onClick={() => router.push(`/predict?patient_id=${p.patient_id}`)}
                            >
                              <BrainCircuit className="h-3.5 w-3.5" />
                              <span>Inference</span>
                            </GlassButton>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 text-xs font-semibold">
                      No patients matching criteria found in cohort registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/30">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="py-1.5 border-[#ADE1FB] text-[#0F2573] hover:bg-[#E8F6FE]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </GlassButton>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </span>

            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="py-1.5 border-[#ADE1FB] text-[#0F2573] hover:bg-[#E8F6FE]"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* -- Patient Registration Modal Overlay -- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 rounded-2xl border border-[#ADE1FB] shadow-2xl max-w-xl w-full p-6 space-y-4 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#E8F6FE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0F2573] uppercase tracking-wide">
                  Register New Admitted Patient
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Enter ICU telemetry diagnostics and initial vitals to register the patient profile.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Hospital Bed Capacity Gauge */}
            {capacityData && (
              <div className="bg-[#E8F6FE]/50 border border-[#ADE1FB] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-[#0F2573] uppercase tracking-wider">
                    {capacityData.hospital_name || "St. Jude Memorial"} Bed Capacity
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-bold">
                    Capacity Limit Enforced
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`p-2 rounded-lg border text-center transition ${careunit.includes("Normal") ? "bg-white border-[#266CA9] shadow-sm" : "bg-white/50 border-slate-200"}`}>
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">Normal Beds</span>
                    <span className={`text-xs font-black ${capacityData.normal.occupied >= capacityData.normal.total ? "text-rose-600" : "text-[#0F2573]"}`}>
                      {capacityData.normal.occupied}/{capacityData.normal.total} Occupied
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border text-center transition ${careunit.includes("ICU") ? "bg-white border-[#266CA9] shadow-sm" : "bg-white/50 border-slate-200"}`}>
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">ICU Beds</span>
                    <span className={`text-xs font-black ${capacityData.icu.occupied >= capacityData.icu.total ? "text-rose-600" : "text-[#0F2573]"}`}>
                      {capacityData.icu.occupied}/{capacityData.icu.total} Occupied
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border text-center transition ${careunit.includes("CCU") ? "bg-white border-[#266CA9] shadow-sm" : "bg-white/50 border-slate-200"}`}>
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">CCU Beds</span>
                    <span className={`text-xs font-black ${capacityData.ccu.occupied >= capacityData.ccu.total ? "text-rose-600" : "text-[#0F2573]"}`}>
                      {capacityData.ccu.occupied}/{capacityData.ccu.total} Occupied
                    </span>
                  </div>
                </div>

                {isCapExceeded && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2 text-rose-700 text-xs font-bold">
                    <span className="text-sm">⚠️</span>
                    <div>
                      <p className="font-extrabold uppercase text-[10px] tracking-wide text-rose-800">Bed Capacity Exceeded</p>
                      <p className="text-[11px] font-medium text-rose-700 mt-0.5">
                        {capacityData.hospital_name} has reached its maximum limit of {selectedUnitCapacity.total} {careunit}s ({selectedUnitCapacity.occupied}/{selectedUnitCapacity.total} occupied). Registration is disabled.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs font-bold text-[#0F2573]">
              
              {/* Patient Full Name & Assigned Doctor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-3 py-2 outline-none focus:border-[#266CA9] text-[#0F2573] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Assigned Attending Doctor</label>
                  <select
                    value={assignedDoctorId}
                    onChange={(e) => setAssignedDoctorId(e.target.value)}
                    className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-3 py-2 outline-none focus:border-[#266CA9] text-[#0F2573] font-semibold cursor-pointer"
                  >
                    <option value="">Auto-Assign (Logged-in Clinician)</option>
                    {hospitalDoctors.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Core Demographics & Bed Option Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Patient Age</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    placeholder="e.g. 60"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-3 py-2 outline-none focus:border-[#266CA9] text-[#0F2573] font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-3 py-2 outline-none focus:border-[#266CA9] text-[#0F2573] font-semibold cursor-pointer"
                  >
                    <option value="" disabled hidden>Select Gender</option>
                    <option value={1}>Male</option>
                    <option value={0}>Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Bed Option</label>
                  <select
                    value={careunit}
                    onChange={(e) => setCareunit(e.target.value)}
                    required
                    className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-3 py-2 outline-none focus:border-[#266CA9] text-[#0F2573] font-semibold cursor-pointer"
                  >
                    <option value="Normal Bed">Normal Bed (General Ward)</option>
                    <option value="ICU Bed">ICU Bed (Intensive Care)</option>
                    <option value="CCU Bed">CCU Bed (Coronary Care)</option>
                  </select>
                </div>
              </div>

              {/* ICU Vitals telemetry */}
              <div className="border-t border-[#E8F6FE] pt-3">
                <h4 className="text-[10px] uppercase tracking-wider text-[#0F2573]/60 mb-2 font-black">ICU Vitals Telemetry</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Systolic BP</label>
                    <input
                      type="number"
                      placeholder="e.g. 128 mmHg"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Diastolic BP</label>
                    <input
                      type="number"
                      placeholder="e.g. 82 mmHg"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Heart Rate</label>
                    <input
                      type="number"
                      placeholder="e.g. 74 bpm"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">BMI</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 26.5 kg/m²"
                      value={bmi}
                      onChange={(e) => setBmi(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                </div>
              </div>

              {/* Lab Diagnostics */}
              <div className="border-t border-[#E8F6FE] pt-3">
                <h4 className="text-[10px] uppercase tracking-wider text-[#0F2573]/60 mb-2 font-black">Lab Diagnostics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Serum Cholesterol</label>
                    <input
                      type="number"
                      placeholder="e.g. 185 mg/dL"
                      value={cholesterol}
                      onChange={(e) => setCholesterol(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Blood Glucose</label>
                    <input
                      type="number"
                      placeholder="e.g. 95 mg/dL"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 uppercase">Active Medications</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 3"
                      value={medicationCount}
                      onChange={(e) => setMedicationCount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#E8F6FE]/30 border border-[#ADE1FB] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#266CA9] text-[#0F2573]"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Histories & Medications Checkboxes */}
              <div className="border-t border-[#E8F6FE] pt-3">
                <h4 className="text-[10px] uppercase tracking-wider text-[#0F2573]/60 mb-2 font-black">Medical History & Pharmacotherapy</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hypertension}
                      onChange={(e) => setHypertension(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Hypertension</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={diabetes}
                      onChange={(e) => setDiabetes(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Diabetes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smoking}
                      onChange={(e) => setSmoking(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Smoking History</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={previousCardiac}
                      onChange={(e) => setPreviousCardiac(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Cardiac History</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={statinHistory}
                      onChange={(e) => setStatinHistory(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Statin History</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={betaBlockerHistory}
                      onChange={(e) => setBetaBlockerHistory(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Beta Blocker</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aceArbHistory}
                      onChange={(e) => setAceArbHistory(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>ACE/ARB Therapy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aspirinHistory}
                      onChange={(e) => setAspirinHistory(e.target.checked)}
                      className="accent-[#0F2573] h-4.5 w-4.5"
                    />
                    <span>Aspirin Use</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 border-t border-[#E8F6FE] pt-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#ADE1FB] text-[#0F2573] hover:bg-[#E8F6FE]"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || isCapExceeded}
                  style={{ backgroundColor: isCapExceeded ? "#94A3B8" : "#0F2573", color: "#fff", cursor: isCapExceeded ? "not-allowed" : "pointer" }}
                >
                  {isSubmitting ? "Registering..." : isCapExceeded ? "Bed Limit Reached" : "Submit Registration"}
                </GlassButton>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
