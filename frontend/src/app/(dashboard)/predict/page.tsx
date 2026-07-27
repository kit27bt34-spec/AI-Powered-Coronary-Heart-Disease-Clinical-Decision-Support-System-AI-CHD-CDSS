"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  BrainCircuit,
  Search,
  ShieldAlert,
  Cpu,
  ListCollapse,
  FileText,
  Activity,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  User,
  Info,
  Lock,
  Sliders,
  Edit3,
  BarChart3,
  Award,
  Clock,
  Check,
  Download
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassBadge from "@/components/ui/GlassBadge";
import RefreshButton from "@/components/ui/RefreshButton";
import { downloadChdReport } from "@/lib/pdfGenerator";

export default function ClinicalPrediction() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const routerPatientId = searchParams.get("patient_id");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mode and override state
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [inputType, setInputType] = useState<"lookup" | "manual">("lookup");
  const [overridePatientValues, setOverridePatientValues] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form input fields
  const [age, setAge] = useState<number | string>(60);
  const [gender, setGender] = useState<number>(1);
  const [bmi, setBmi] = useState<number | string>(25.0);
  const [systolicBp, setSystolicBp] = useState<number | string>(120);
  const [diastolicBp, setDiastolicBp] = useState<number | string>(80);
  const [glucose, setGlucose] = useState<number | string>(90);
  const [heartRate, setHeartRate] = useState<number | string>(70);
  const [cholesterol, setCholesterol] = useState<number | string>(180);
  const [admissionFrequency, setAdmissionFrequency] = useState<number>(1);
  const [medicationCount, setMedicationCount] = useState<number>(1);

  // Comorbidities
  const [hypertension, setHypertension] = useState<number>(0);
  const [diabetes, setDiabetes] = useState<number>(0);
  const [smoking, setSmoking] = useState<number>(0);
  const [previousCardiac, setPreviousCardiac] = useState<number>(0);

  // Medication history
  const [statinHistory, setStatinHistory] = useState<number>(0);
  const [betaBlockerHistory, setBetaBlockerHistory] = useState<number>(0);
  const [aceArbHistory, setAceArbHistory] = useState<number>(0);
  const [aspirinHistory, setAspirinHistory] = useState<number>(0);

  // Patient Cohort query
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/api/v1/patients");
      return res.data;
    },
  });

  const autoFillPatient = (pId: string) => {
    const target = patients?.find((p: any) => String(p.patient_id) === pId);
    if (target) {
      setAge(target.age ?? 60);
      setGender(target.gender ?? 1);
      setBmi(target.bmi ?? 25.0);
      setSystolicBp(target.systolic_bp ?? 120);
      setDiastolicBp(target.diastolic_bp ?? 80);
      setGlucose(target.glucose ?? 90);
      setHeartRate(target.heart_rate ?? 70);
      setCholesterol(target.cholesterol ?? 180);
      setAdmissionFrequency(1);
      setMedicationCount(target.medication_count ?? 0);
      setHypertension(target.hypertension ?? 0);
      setDiabetes(target.diabetes ?? 0);
      setSmoking(target.smoking ?? 0);
      setPreviousCardiac(target.previous_cardiac ?? 0);
      setStatinHistory(target.statin_history ?? 0);
      setBetaBlockerHistory(target.beta_blocker_history ?? 0);
      setAceArbHistory(target.ace_arb_history ?? 0);
      setAspirinHistory(target.aspirin_history ?? 0);
      toast("Autofilled patient records for HADM ID: " + String(target.hadm_id) + ".", "info", "Cohort Autofill");
    }
  };

  useEffect(() => {
    if (routerPatientId && patients) {
      setSelectedPatientId(routerPatientId);
      setInputType("lookup");
      autoFillPatient(routerPatientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerPatientId, patients]);

  // Access restriction guard
  const isAllowed = user?.role === "admin" || user?.role === "doctor";
  if (!isAllowed) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Inference Engine Access Restricted
            <ShieldAlert className="h-5 w-5 text-slate-500" />
          </h2>
        </div>
        <GlassCard className="p-8 text-center space-y-4 max-w-xl mx-auto my-12 bg-white/60">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto animate-pulse">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Access Restricted: Doctor Scope Only
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Running ML inference and 10-year calibrated risk estimations is restricted to doctors and administrators.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Input Validation Logic
  const validateFormInputs = (): boolean => {
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      toast("Age must be between 18 and 120 years.", "error", "Validation Error");
      return false;
    }

    if (bmi !== "" && bmi !== null && bmi !== undefined) {
      const bmiNum = Number(bmi);
      if (isNaN(bmiNum) || bmiNum < 10 || bmiNum > 70) {
        toast("BMI must be between 10.0 and 70.0 kg/m².", "error", "Validation Error");
        return false;
      }
    }

    if (systolicBp !== "" && systolicBp !== null && systolicBp !== undefined) {
      const sbpNum = Number(systolicBp);
      if (isNaN(sbpNum) || sbpNum < 70 || sbpNum > 260) {
        toast("Systolic Blood Pressure must be between 70 and 260 mmHg.", "error", "Validation Error");
        return false;
      }
    }

    if (diastolicBp !== "" && diastolicBp !== null && diastolicBp !== undefined) {
      const dbpNum = Number(diastolicBp);
      if (isNaN(dbpNum) || dbpNum < 40 || dbpNum > 180) {
        toast("Diastolic Blood Pressure must be between 40 and 180 mmHg.", "error", "Validation Error");
        return false;
      }
    }

    if (heartRate !== "" && heartRate !== null && heartRate !== undefined) {
      const hrNum = Number(heartRate);
      if (isNaN(hrNum) || hrNum < 30 || hrNum > 220) {
        toast("Heart Rate must be between 30 and 220 bpm.", "error", "Validation Error");
        return false;
      }
    }

    if (glucose !== "" && glucose !== null && glucose !== undefined) {
      const glNum = Number(glucose);
      if (isNaN(glNum) || glNum < 20 || glNum > 800) {
        toast("Glucose must be between 20 and 800 mg/dL.", "error", "Validation Error");
        return false;
      }
    }

    if (cholesterol !== "" && cholesterol !== null && cholesterol !== undefined) {
      const chNum = Number(cholesterol);
      if (isNaN(chNum) || chNum < 50 || chNum > 700) {
        toast("Cholesterol must be between 50 and 700 mg/dL.", "error", "Validation Error");
        return false;
      }
    }

    return true;
  };

  const handlePredictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormInputs()) {
      return;
    }

    setIsSubmitting(true);
    setInferenceResult(null);

    try {
      if (inputType === "lookup" && selectedPatientId && !overridePatientValues) {
        const target = patients?.find((p: any) => String(p.patient_id) === selectedPatientId);
        if (target && target.hadm_id) {
          const res = await api.post("/api/v1/predict/admission/" + String(target.hadm_id));
          setInferenceResult(res.data);
          toast("Calibrated CHD risk evaluation calculated successfully.", "success", "Evaluation Complete");
        } else {
          toast("Selected patient admission details not found.", "error", "Lookup Failed");
        }
      } else {
        const payload = {
          age: Number(age),
          gender: Number(gender),
          bmi: bmi !== "" && bmi !== null ? Number(bmi) : null,
          systolic_bp: systolicBp !== "" && systolicBp !== null ? Number(systolicBp) : null,
          diastolic_bp: diastolicBp !== "" && diastolicBp !== null ? Number(diastolicBp) : null,
          glucose: glucose !== "" && glucose !== null ? Number(glucose) : null,
          heart_rate: heartRate !== "" && heartRate !== null ? Number(heartRate) : null,
          cholesterol: cholesterol !== "" && cholesterol !== null ? Number(cholesterol) : null,
          admission_frequency: Number(admissionFrequency),
          medication_count: Number(medicationCount),
          hypertension: Number(hypertension),
          diabetes: Number(diabetes),
          smoking: Number(smoking),
          previous_cardiac: Number(previousCardiac),
          statin_history: Number(statinHistory),
          beta_blocker_history: Number(betaBlockerHistory),
          ace_arb_history: Number(aceArbHistory),
          aspirin_history: Number(aspirinHistory),
        };
        const res = await api.post("/api/v1/predict", payload);
        setInferenceResult(res.data);
        toast("Real-time ML risk estimation calculated successfully.", "success", "Evaluation Complete");
      }

      // Refresh Prediction History & Activity queries without full page reload
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["prediction_history"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    } catch (err: any) {
      if (err.response?.status === 422) {
        toast("Invalid clinical parameters provided. Please check numerical bounds.", "error", "Validation Failed");
      } else {
        const msg = err.response?.data?.detail || "Prediction service unavailable. Please check backend connections.";
        toast(msg, "error", "Inference Failure");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const CIRC = 2 * Math.PI * 68;
  const riskPct = inferenceResult
    ? Math.min(1, Math.max(0, inferenceResult.calibrated_probability))
    : 0;

  function classifyRisk(prob: number): {
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
    gaugeColor: string;
    borderColor: string;
  } {
    if (prob < 0.10) {
      return { label: "Very Low Risk", variant: "success", gaugeColor: "#10B981", borderColor: "border-emerald-200" };
    } else if (prob < 0.25) {
      return { label: "Low Risk", variant: "success", gaugeColor: "#22C55E", borderColor: "border-emerald-300" };
    } else if (prob < 0.50) {
      return { label: "Moderate Risk", variant: "warning", gaugeColor: "#F59E0B", borderColor: "border-amber-200" };
    } else if (prob < 0.75) {
      return { label: "High Risk", variant: "danger", gaugeColor: "#EF4444", borderColor: "border-rose-200" };
    } else {
      return { label: "Very High Risk", variant: "danger", gaugeColor: "#DC2626", borderColor: "border-rose-400" };
    }
  }

  const riskClass = inferenceResult ? classifyRisk(riskPct) : null;
  const strokeColor = riskClass?.gaugeColor ?? "#22C55E";

  const comorbidityFields = [
    { label: "Essential Hypertension", val: hypertension, set: setHypertension },
    { label: "Type 2 Diabetes Mellitus", val: diabetes, set: setDiabetes },
    { label: "Active Tobacco Smoking", val: smoking, set: setSmoking },
    { label: "Prior Cardiac Event", val: previousCardiac, set: setPreviousCardiac },
    { label: "Statin Therapy", val: statinHistory, set: setStatinHistory },
    { label: "Beta Blocker Therapy", val: betaBlockerHistory, set: setBetaBlockerHistory },
    { label: "ACE Inhibitor / ARB", val: aceArbHistory, set: setAceArbHistory },
    { label: "Aspirin Therapy", val: aspirinHistory, set: setAspirinHistory },
  ];

  const inputsDisabled = inputType === "lookup" && !overridePatientValues;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Clinical CHD Prediction Engine</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Real-time 10-year calibrated Coronary Heart Disease risk inference via trained CatBoost model pipeline.
          </p>
        </div>
        <RefreshButton onRefresh={() => { queryClient.refetchQueries(); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Deck */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6 space-y-6 bg-white/70">
            {/* Mode Switcher Tab */}
            <div className="flex bg-slate-100/50 p-1.5 rounded-xl gap-2 select-none border border-slate-200/20">
              <button
                type="button"
                onClick={() => {
                  setInputType("lookup");
                  setOverridePatientValues(false);
                }}
                className={
                  "flex-1 py-2 rounded-lg text-xs font-extrabold text-center transition cursor-pointer " +
                  (inputType === "lookup"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                ICU Patient Lookup
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputType("manual");
                  setOverridePatientValues(true);
                }}
                className={
                  "flex-1 py-2 rounded-lg text-xs font-extrabold text-center transition cursor-pointer " +
                  (inputType === "manual"
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Manual Parameter Entry
              </button>
            </div>

            <form onSubmit={handlePredictSubmit} className="space-y-4">
              {/* Lookup Selector */}
              {inputType === "lookup" && (
                <div className="space-y-3 p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-primary" /> Select Patient Admission
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={overridePatientValues}
                        onChange={(e) => setOverridePatientValues(e.target.checked)}
                        className="rounded border-slate-300 text-primary h-3.5 w-3.5 focus:ring-primary"
                      />
                      <span className="flex items-center gap-1 text-[11px] text-indigo-700">
                        <Edit3 className="h-3 w-3" /> Override Patient Values
                      </span>
                    </label>
                  </div>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      autoFillPatient(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-primary transition cursor-pointer"
                  >
                    <option value="">Choose patient (ID / HADM ID)...</option>
                    {patients?.map((p: any) => (
                      <option key={p.hadm_id || p.patient_id} value={String(p.patient_id)}>
                        {"Patient #" + String(p.patient_id).slice(0, 8) + "... (HADM: " + String(p.hadm_id) + " - Age: " + String(p.age) + ")"}
                      </option>
                    ))}
                  </select>
                  {inputType === "lookup" && !overridePatientValues && (
                    <p className="text-[10px] text-slate-400 font-medium italic">
                      * Parameters are preloaded from the database. Check "Override Patient Values" to modify fields manually.
                    </p>
                  )}
                </div>
              )}

              {/* Vitals Grid */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-100">
                  Telemetry Vitals &amp; Lab Parameters
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold flex justify-between">
                      <span>Age (18–120)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={age}
                      min={18}
                      max={120}
                      step="1"
                      required
                      onChange={(e) => setAge(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Biological Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(Number(e.target.value))}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value={1}>Male</option>
                      <option value={0}>Female</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">BMI (10–70)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={10}
                      max={70}
                      value={bmi}
                      placeholder="e.g. 25.4"
                      onChange={(e) => setBmi(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Systolic BP (70–260)</label>
                    <input
                      type="number"
                      min={70}
                      max={260}
                      value={systolicBp}
                      placeholder="e.g. 120"
                      onChange={(e) => setSystolicBp(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Diastolic BP (40–180)</label>
                    <input
                      type="number"
                      min={40}
                      max={180}
                      value={diastolicBp}
                      placeholder="e.g. 80"
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Glucose (20–800)</label>
                    <input
                      type="number"
                      min={20}
                      max={800}
                      value={glucose}
                      placeholder="e.g. 95"
                      onChange={(e) => setGlucose(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Heart Rate (30–220)</label>
                    <input
                      type="number"
                      min={30}
                      max={220}
                      value={heartRate}
                      placeholder="e.g. 72"
                      onChange={(e) => setHeartRate(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Cholesterol (50–700)</label>
                    <input
                      type="number"
                      min={50}
                      max={700}
                      value={cholesterol}
                      placeholder="e.g. 180"
                      onChange={(e) => setCholesterol(e.target.value)}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">ICU Admission Count</label>
                    <input
                      type="number"
                      value={admissionFrequency}
                      min={0}
                      step="1"
                      onChange={(e) => setAdmissionFrequency(Number(e.target.value))}
                      disabled={inputsDisabled}
                      className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Comorbidities & Medications */}
              <div className="space-y-3 pt-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-100">
                  Comorbidity &amp; Active Medication History
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {comorbidityFields.map(({ label, val, set }) => (
                    <label
                      key={label}
                      className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={val === 1}
                        onChange={(e) => set(e.target.checked ? 1 : 0)}
                        disabled={inputsDisabled}
                        className="rounded border-slate-300 text-primary h-4 w-4 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs font-extrabold text-slate-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full py-3.5 mt-4 text-xs font-black uppercase tracking-wider"
                disabled={isSubmitting || (inputType === "lookup" && !selectedPatientId && !overridePatientValues)}
                style={{ backgroundColor: "#0F2573", color: "#fff" }}
              >
                <BrainCircuit className="h-4 w-4 animate-pulse" />
                <span>{isSubmitting ? "Executing Inference Pipeline..." : "Estimate CHD Adverse Event Risk"}</span>
              </GlassButton>
            </form>
          </GlassCard>
        </div>

        {/* Right Column: Prediction Results Panel */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 flex flex-col items-center min-h-[550px] relative overflow-hidden bg-white/70">
            {!inferenceResult ? (
              <div className="my-auto space-y-3 flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-blue-50/50 rounded-full border border-blue-100/30 flex items-center justify-center text-primary animate-pulse">
                  <BrainCircuit className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Awaiting Estimation</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[280px]">
                  Fill out clinical demographics, vitals, and comorbidity checklists, then run the risk model.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-6">
                {/* Gauge & Main Risk Badge */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stratified Risk Outcome</span>
                  <div className="relative h-44 w-44 flex items-center justify-center mt-2">
                    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r="68" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                      <circle
                        cx="80"
                        cy="80"
                        r="68"
                        stroke={strokeColor}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC - CIRC * riskPct}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute text-center space-y-0.5">
                      <span className="text-3xl font-black tracking-tight text-slate-800 leading-none">
                        {(riskPct * 100).toFixed(1)}%
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">10-yr CHD risk</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
                    <GlassBadge variant={riskClass?.variant ?? "success"} className="text-xs px-3 py-1 font-black">
                      {riskClass?.label ?? ""}
                    </GlassBadge>
                    <GlassBadge variant="neutral" className="text-xs px-3 py-1 font-bold">
                      Prediction Reliability: {inferenceResult.prediction_reliability ?? inferenceResult.confidence_score}% ({inferenceResult.prediction_reliability_status ?? inferenceResult.confidence_status})
                    </GlassBadge>
                    {inferenceResult.prediction_trend && (
                      <GlassBadge variant={inferenceResult.prediction_trend.trend === "Worsening" ? "danger" : (inferenceResult.prediction_trend.trend === "Improving" ? "success" : "neutral")} className="text-xs px-3 py-1 font-bold">
                        Trend: {inferenceResult.prediction_trend.trend}
                      </GlassBadge>
                    )}
                  </div>
                </div>

                {/* Structured Clinical Interpretation */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2 text-left">
                  <span className="text-[9px] font-extrabold text-blue-700 uppercase tracking-wider block">Structured Clinical Interpretation</span>
                  {inferenceResult.structured_interpretation ? (
                    <div className="space-y-1.5 text-xs text-slate-700 font-medium leading-relaxed">
                      <p className="font-bold text-slate-800">{inferenceResult.structured_interpretation.overall_assessment}</p>
                      <div><span className="font-bold text-rose-700">Major Risk Drivers: </span>{inferenceResult.structured_interpretation.major_risk_factors.join(", ")}</div>
                      <div><span className="font-bold text-emerald-700">Protective Factors: </span>{inferenceResult.structured_interpretation.protective_factors.join(", ")}</div>
                      <div><span className="font-bold text-amber-700">Concern Level: </span>{inferenceResult.structured_interpretation.clinical_concern_level}</div>
                      <p className="text-[10px] text-slate-500 font-semibold bg-white/70 p-2 rounded-xl border border-blue-100/50 mt-1">{inferenceResult.structured_interpretation.suggested_follow_up}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {inferenceResult.clinical_interpretation}
                    </p>
                  )}
                </div>

                {/* Normal Range Comparison Table */}
                {inferenceResult.normal_range_analysis?.length > 0 && (
                  <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Activity className="h-4 w-4 text-primary" /> Parameter Normal Range Analysis
                    </span>
                    <div className="overflow-x-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="text-slate-400 text-[8px] uppercase tracking-wider border-b border-slate-200/50 pb-1">
                            <th className="pb-1 font-bold">Parameter</th>
                            <th className="pb-1 font-bold">Actual Value</th>
                            <th className="pb-1 font-bold">Normal Range</th>
                            <th className="pb-1 font-bold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {inferenceResult.normal_range_analysis.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-100/50">
                              <td className="py-1.5 font-bold text-slate-700">{row.parameter}</td>
                              <td className="py-1.5 font-mono text-slate-800">{row.actual_value}</td>
                              <td className="py-1.5 text-slate-400 font-mono text-[9px]">{row.normal_range}</td>
                              <td className="py-1.5 text-right font-bold">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold ${row.status.includes("Normal") || row.status.includes("Desirable") ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Positive & Negative SHAP Contributors */}
                <div className="space-y-3 text-left pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Cpu className="h-4 w-4 text-primary" /> Dynamic SHAP Feature Explainability
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">TreeExplainer Attributions</span>
                  </div>

                  {/* Risk Increasing Factors */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-rose-600 uppercase flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Risk Increasing Factors (▲)
                    </span>
                    {inferenceResult.top_positive_contributors?.length > 0 ? (
                      <div className="space-y-1.5">
                        {inferenceResult.top_positive_contributors.map((contrib: any, idx: number) => (
                          <div key={idx} className="p-2 bg-rose-50/50 border border-rose-100 rounded-xl text-[10px] space-y-1">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>▲ {contrib.feature} ({contrib.actual_value || contrib.detail})</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] bg-rose-200/60 text-rose-800 px-1.5 py-0.5 rounded font-extrabold">{contrib.importance_level || "High Impact"}</span>
                                <span className="text-rose-600 font-mono font-black">{contrib.impact}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-xl text-[10px] font-semibold text-emerald-800 flex items-center justify-between">
                        <span>No significant clinical risk factors identified.</span>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">Optimal Baseline</span>
                      </div>
                    )}
                  </div>

                  {/* Protective Factors */}
                  {inferenceResult.top_negative_contributors?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Protective Factors (▼)
                      </span>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {inferenceResult.top_negative_contributors.map((contrib: any, idx: number) => (
                          <div key={idx} className="p-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[10px] space-y-1">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>▼ {contrib.feature}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold">Protective</span>
                                <span className="text-emerald-600 font-mono font-black">{contrib.impact}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Patient Summary Card */}
                {inferenceResult.patient_summary && (
                  <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <User className="h-4 w-4 text-slate-500" /> Patient Clinical Profile
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div><span className="text-slate-400 block text-[9px]">Age &amp; Gender</span>{inferenceResult.patient_summary.age} yrs • {inferenceResult.patient_summary.gender_str}</div>
                      <div><span className="text-slate-400 block text-[9px]">Blood Pressure</span>{inferenceResult.patient_summary.bp_str}</div>
                      <div><span className="text-slate-400 block text-[9px]">BMI</span>{inferenceResult.patient_summary.bmi_str}</div>
                      <div><span className="text-slate-400 block text-[9px]">Capillary Glucose</span>{inferenceResult.patient_summary.glucose_str}</div>
                      <div><span className="text-slate-400 block text-[9px]">Heart Rate</span>{inferenceResult.patient_summary.heart_rate_str}</div>
                      <div><span className="text-slate-400 block text-[9px]">Cholesterol</span>{inferenceResult.patient_summary.cholesterol_str}</div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/50">
                        <span className="text-slate-400 block text-[9px]">Comorbidity Risk Factors</span>
                        <p className="text-slate-700">{inferenceResult.patient_summary.risk_factors.join(", ")}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[9px]">Active Medications</span>
                        <p className="text-slate-700">{inferenceResult.patient_summary.medications.join(", ")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ListCollapse className="h-4 w-4" /> Evidence-Based Clinical Guidance ({inferenceResult.recommendations.length})
                  </span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {inferenceResult.recommendations.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-3">No specific recommendations generated.</p>
                    ) : (
                      inferenceResult.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-primary uppercase text-[8px] tracking-wider">{rec.category}</span>
                            {rec.clinical_justification && <span className="text-[8px] text-slate-400">Guideline Justified</span>}
                          </div>
                          <p className="text-slate-600 font-semibold leading-relaxed">{rec.recommendation_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Model Details Specs */}
                {inferenceResult.model_details && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 text-[10px] font-bold text-slate-600 text-left">
                    <span className="text-[9px] text-slate-400 uppercase block tracking-wider">Model Technical Specs</span>
                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                      <div><span className="text-slate-400">Model Name:</span> {inferenceResult.model_details.model_name}</div>
                      <div><span className="text-slate-400">Algorithm:</span> {inferenceResult.model_details.algorithm || "CatBoost / XGBoost"}</div>
                      <div><span className="text-slate-400">Version:</span> {inferenceResult.model_details.model_version}</div>
                      <div><span className="text-slate-400">Dataset:</span> {inferenceResult.model_details.training_dataset || "MIMIC-IV v2.2"}</div>
                      <div><span className="text-slate-400">Calibration:</span> {inferenceResult.model_details.calibration_method}</div>
                      <div><span className="text-slate-400">ROC-AUC:</span> {(inferenceResult.model_details.validation_roc_auc * 100).toFixed(1)}%</div>
                      <div><span className="text-slate-400">CV Score:</span> {(inferenceResult.model_details.cross_validation_score * 100).toFixed(1)}%</div>
                      <div><span className="text-slate-400">Latency:</span> {inferenceResult.execution_latency_ms.toFixed(1)} ms</div>
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                <div className="pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
                  <GlassButton
                    variant="primary"
                    className="flex-1 py-2.5 text-[10px] uppercase font-black"
                    style={{ backgroundColor: "#2F5BEA", color: "#FFFFFF" }}
                    onClick={async () => {
                      toast("Generating hospital-grade clinical PDF report...", "info", "Exporting PDF");
                      await downloadChdReport({
                        patientUuid: selectedPatientId || inferenceResult.patient_uuid || "DIRECT_INPUT",
                        predictedRisk: inferenceResult.calibrated_probability,
                        riskLevel: inferenceResult.risk_level,
                        confidenceScore: inferenceResult.confidence_score,
                        confidenceStatus: inferenceResult.confidence_status,
                        clinicalInterpretation: inferenceResult.clinical_interpretation,
                        age: Number(age),
                        gender: Number(gender),
                        bmi: bmi ? Number(bmi) : 25.0,
                        systolicBp: systolicBp ? Number(systolicBp) : 120,
                        diastolicBp: diastolicBp ? Number(diastolicBp) : 80,
                        heartRate: heartRate ? Number(heartRate) : 72,
                        glucose: glucose ? Number(glucose) : 95,
                        cholesterol: cholesterol ? Number(cholesterol) : 180,
                        hypertension: hypertension,
                        diabetes: diabetes,
                        smoking: smoking,
                        previousCardiac: previousCardiac,
                        statinHistory: statinHistory,
                        topPositiveContributors: inferenceResult.top_positive_contributors,
                        topNegativeContributors: inferenceResult.top_negative_contributors,
                        recommendations: inferenceResult.recommendations,
                        modelVersion: inferenceResult.model_details?.model_version || "v1.0.0",
                        executionLatencyMs: inferenceResult.execution_latency_ms,
                        clinicianName: (user as any)?.full_name || (user as any)?.name || user?.email || "Dr. Sarah Jenkins, MD",
                        hospitalName: "St. Jude Memorial Hospital"
                      });
                      toast("Clinical PDF Report downloaded successfully.", "success", "Download Complete");
                    }}
                  >
                    <Download className="h-4 w-4 text-white" />
                    <span>Download Clinical PDF</span>
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="py-2.5 text-[10px] uppercase font-black"
                    onClick={() => {
                      window.print();
                      toast("Report generated for printing.", "success", "Print Summary");
                    }}
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span>Print</span>
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="py-2.5 text-[10px] uppercase font-black"
                    onClick={() => {
                      setInferenceResult(null);
                      toast("Ready for new prediction.", "info", "Reset Form");
                    }}
                  >
                    <BrainCircuit className="h-4 w-4 text-slate-400" />
                    <span>Reset</span>
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
