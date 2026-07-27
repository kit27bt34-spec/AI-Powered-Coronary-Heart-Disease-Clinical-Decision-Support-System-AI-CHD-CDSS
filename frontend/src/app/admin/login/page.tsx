"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Activity, 
  BarChart3, 
  Users, 
  Shield, 
  AlertCircle 
} from "lucide-react";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@hospital.org");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data } = await api.post("/api/v1/admin/auth/login", { email, password });
      localStorage.setItem("admin_token", data.access_token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      router.push("/admin/select-hospital");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Invalid Super Admin credentials.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full bg-[#f8fafc] flex flex-col justify-between font-sans text-slate-800 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center min-h-0 px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 xl:gap-12 items-center max-h-full">
          
          {/* LEFT SIDE: Brand Branding & Feature Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 lg:space-y-5">
            
            {/* Header Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  AI-CHD-CDSS
                </h1>
                <p className="text-[10px] font-bold tracking-wider text-blue-600 uppercase mt-0.5">
                  SUPER ADMIN PORTAL
                </p>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-[1.15] tracking-tight">
                Intelligent Healthcare.<br />
                Better Decision. <span className="text-blue-600">Stronger Lives.</span>
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                AI-Powered Coronary Heart Disease Clinical Decision Support System for modern healthcare governance
              </p>
            </div>

            {/* Hospital Building Photo Container (Static, No Animations) */}
            <div className="relative w-full h-44 sm:h-52 lg:h-60 xl:h-64 rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-100 flex-shrink-0">
              <Image 
                src="/hospital_building_v2.png" 
                alt="Hospital Building" 
                fill 
                className="object-cover object-center"
                priority
                unoptimized
              />
              {/* Static Banner Badge */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-800">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span>HOSPITAL</span>
              </div>
            </div>

            {/* 4 Feature Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
              
              {/* Card 1 */}
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200/70 shadow-sm text-center space-y-1">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Secure & Reliable</h3>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  Enterprise security for health data
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200/70 shadow-sm text-center space-y-1">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Real-time Analytics</h3>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  Live insights & AI decision support
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200/70 shadow-sm text-center space-y-1">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Multi-Hospital</h3>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  Centralized workspace control
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200/70 shadow-sm text-center space-y-1">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">AI Governance</h3>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  Model monitoring & compliance
                </p>
              </div>

            </div>

          </div>


          {/* RIGHT SIDE: Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 lg:p-8 shadow-2xl border border-slate-100 space-y-4">
              
              {/* Key Lock Icon Header */}
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back!</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Sign in to your Super Admin account
                  </p>
                </div>
              </div>

              {/* Error Notification */}
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@hospital.org"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-1"
                >
                  <span>{isLoading ? "Signing In..." : "Sign In"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Terms & Privacy */}
              <p className="text-[11px] text-slate-400 font-medium text-center pt-2">
                By signing in, you agree to our{" "}
                <a href="#" className="text-blue-600 font-bold hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-600 font-bold hover:underline">
                  Privacy Policy
                </a>
              </p>

            </div>
          </div>

        </div>
      </div>

      {/* Centered Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-2.5 px-6 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 text-center text-xs font-medium text-slate-500 flex-shrink-0 z-20">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>AI-CHD-CDSS Super Admin Portal</span>
        </div>
        <span className="hidden sm:inline text-slate-300">•</span>
        <p className="text-[11px] text-slate-400">© 2026 All rights reserved.</p>
      </footer>
    </div>
  );
}

