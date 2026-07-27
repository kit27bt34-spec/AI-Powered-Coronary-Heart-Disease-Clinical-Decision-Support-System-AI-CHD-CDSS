"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Check, X, ArrowRight, AlertCircle, KeyRound, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export default function DoctorChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword);
  const isNotSameAsCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    isNotSameAsCurrent &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess("Password updated successfully! Redirecting to your workspace...");
      localStorage.removeItem("must_change_password");

      setTimeout(() => {
        const savedHospital = localStorage.getItem("selected_hospital_id");
        if (savedHospital) {
          router.push("/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1500);

    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update password. Please check your current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-center items-center p-4 font-sans selection:bg-blue-100 selection:text-blue-700">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative">
        {/* Header Badge & Title */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <KeyRound className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">
              MANDATORY FIRST LOGIN SECURITY
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Update Clinical Account Password
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-normal leading-relaxed">
            For security compliance, you must change your initial temporary password before accessing the Doctor Portal.
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2">
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Temporary / Current Password *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter initial temporary password"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">New Password *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. Apollo@2026"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Confirm New Password *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Password Validation Requirements */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
            <span className="font-bold text-slate-700 block text-[11px] mb-1">Password Requirements:</span>
            <div className="grid grid-cols-2 gap-1">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>Uppercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>Lowercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>Number</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>Special Character (!@#$)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                <span>Passwords Match</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{isSubmitting ? "Updating Security Credentials..." : "Update Password & Continue"}</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
