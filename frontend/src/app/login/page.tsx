"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

/* --- Animated ECG Line --------------------------------------------------- */
function AnimatedECG({
  color = "#266CA9",
  opacity = 0.18,
  top,
  bottom,
  duration = 6,
  delay = 0,
}: {
  color?: string;
  opacity?: number;
  top?: string | number;
  bottom?: string | number;
  duration?: number;
  delay?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        bottom,
        pointerEvents: "none",
        overflow: "hidden",
        height: "60px",
      }}
    >
      <svg
        width="200%"
        height="60"
        viewBox="0 0 1400 60"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          animation: `ecgScroll ${duration}s linear ${delay}s infinite`,
        }}
      >
        {/* repeated ECG pattern */}
        <polyline
          points="0,35 80,35 110,18 130,50 150,8 172,42 195,35 280,35 310,18 330,50 350,8 372,42 395,35 480,35 510,18 530,50 550,8 572,42 595,35 680,35 710,18 730,50 750,8 772,42 795,35 880,35 910,18 930,50 950,8 972,42 995,35 1080,35 1110,18 1130,50 1150,8 1172,42 1195,35 1280,35 1310,18 1330,50 1350,8 1372,42 1395,35"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={opacity}
        />
      </svg>
    </div>
  );
}

/* --- Floating Particle --------------------------------------------------- */
function FloatingParticle({
  x,
  y,
  size,
  duration,
  delay,
  color,
}: {
  x: string;
  y: string;
  size: number;
  duration: number;
  delay: number;
  color: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity: 0.15,
        animation: `floatUp ${duration}s ease-in-out ${delay}s infinite`,
        pointerEvents: "none",
      }}
    />
  );
}

/* --- Animated Heart ------------------------------------------------------ */
function AnimatedHeart({
  style: extraStyle,
  size = 120,
  pulseDelay = 0,
}: {
  style?: React.CSSProperties;
  size?: number;
  pulseDelay?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "none",
        animation: `heartbeat 1.5s ease-in-out ${pulseDelay}s infinite`,
        ...extraStyle,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow shadow */}
        <ellipse cx="60" cy="108" rx="34" ry="7" fill="#f87171" opacity="0.2" />
        {/* Outer heart */}
        <path
          d="M60 95 C30 78, 15 60, 15 42 C15 26, 28 15, 42 18 C50 20, 57 26, 60 33 C63 26, 70 20, 78 18 C92 15, 105 26, 105 42 C105 60, 90 78, 60 95Z"
          fill="#f87171"
          opacity="0.25"
        />
        {/* Inner heart */}
        <path
          d="M60 90 C33 74, 20 57, 20 42 C20 29, 31 20, 43 22 C51 24, 58 30, 60 36 C62 30, 69 24, 77 22 C89 20, 100 29, 100 42 C100 57, 87 74, 60 90Z"
          fill="#ef4444"
          opacity="0.18"
        />
        {/* ECG inside heart */}
        <path
          d="M30 55 L42 55 L47 44 L52 62 L56 48 L60 58 L65 55 L90 55"
          stroke="#ef4444"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        {/* Highlight */}
        <path
          d="M38 35 C36 30, 38 24, 44 23"
          stroke="#fca5a5"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

/* --- Main Login Page ----------------------------------------------------- */
export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access Request modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqEmail, setReqEmail] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqRole, setReqRole] = useState("Nurse");
  const [reqLicense, setReqLicense] = useState("");
  const [reqSpecialty, setReqSpecialty] = useState("");
  const [reqDepartment, setReqDepartment] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmail || !reqPassword || !reqLicense || !reqSpecialty || !reqDepartment) {
      toast("Please complete all registration request fields.", "warning", "Validation Failed");
      return;
    }
    setIsRequesting(true);
    try {
      const { api } = await import("@/lib/api");
      await api.post("/api/v1/auth/request-access", {
        email: reqEmail,
        password: reqPassword,
        role: reqRole,
        license_number: reqLicense,
        specialty: reqSpecialty,
        department: reqDepartment,
      });
      toast("Your access request has been submitted and is pending review.", "success", "Request Submitted");
      setIsModalOpen(false);
      // Reset request fields
      setReqEmail("");
      setReqPassword("");
      setReqLicense("");
      setReqSpecialty("");
      setReqDepartment("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Registration request failed. Please try again.";
      toast(errorMsg, "error", "Submission Failed");
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (user) {
      const mustChange = Boolean(user.must_change_password || user.is_first_login);
      if (mustChange) {
        router.push("/doctor/change-password");
      } else {
        localStorage.removeItem("must_change_password");
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast("Please enter both email and password.", "warning", "Validation Failed");
      return;
    }
    setIsSubmitting(true);
    try {
      const res: any = await login(email, password);
      const mustChange = Boolean(
        res?.must_change_password ||
        res?.user?.must_change_password ||
        res?.user?.is_first_login
      );

      if (mustChange) {
        localStorage.setItem("must_change_password", "true");
        toast("Temporary password detected. Security policy requires an immediate password update.", "warning", "First Login Notice");
        router.push("/doctor/change-password");
      } else {
        localStorage.removeItem("must_change_password");
        localStorage.setItem("selected_hospital_name", "St. Jude Memorial");
        toast("Successfully authenticated to the Doctor Portal.", "success", "Welcome Doctor");
        router.push("/dashboard?hospital=st-jude-memorial");
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail ||
        "Incorrect email or password. Please verify credentials.";
      toast(errorMsg, "error", "Authentication Failed");
    } finally {
      setIsSubmitting(false);
    }
  };


  /* Random particles config */
  const particles = [
    { x: "8%",  y: "20%", size: 6,  duration: 7,  delay: 0,   color: "#266CA9" },
    { x: "15%", y: "70%", size: 4,  duration: 9,  delay: 1.5, color: "#60a5fa" },
    { x: "25%", y: "45%", size: 8,  duration: 6,  delay: 0.5, color: "#0F2573" },
    { x: "38%", y: "80%", size: 5,  duration: 8,  delay: 2,   color: "#266CA9" },
    { x: "60%", y: "15%", size: 7,  duration: 7,  delay: 1,   color: "#ef4444" },
    { x: "72%", y: "60%", size: 4,  duration: 10, delay: 0.8, color: "#f87171" },
    { x: "82%", y: "35%", size: 6,  duration: 8,  delay: 2.5, color: "#266CA9" },
    { x: "90%", y: "75%", size: 5,  duration: 6,  delay: 1.2, color: "#60a5fa" },
    { x: "50%", y: "55%", size: 3,  duration: 11, delay: 3,   color: "#ef4444" },
    { x: "5%",  y: "90%", size: 4,  duration: 9,  delay: 0.3, color: "#0F2573" },
  ];

  return (
    <>
      {/* --- Keyframe Styles ------------------------------------------- */}
      <style>{`
        @keyframes ecgScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes heartbeat {
          0%,100% { transform: scale(1);    }
          14%      { transform: scale(1.14); }
          28%      { transform: scale(1);    }
          42%      { transform: scale(1.10); }
          56%      { transform: scale(1);    }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.15; }
          50%  { transform: translateY(-18px) scale(1.1); opacity: 0.22; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.15; }
        }
        @keyframes pulseBorder {
          0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.25); }
          50%      { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
        @keyframes bgShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .login-input:focus {
          border-color: #266CA9 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .login-input { transition: border-color 0.18s, box-shadow 0.18s; }
        .sign-in-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.45) !important;
        }
        .sign-in-btn { transition: all 0.18s ease; }
        .request-btn:hover {
          border-color: #266CA9 !important;
          color: #266CA9 !important;
          background: #E8F6FE !important;
        }
        .request-btn { transition: all 0.18s ease; }
      `}</style>

      {/* --- Page Root -------------------------------------------------- */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg,#ADE1FB 0%,#E8F6FE 40%,#E8F6FE 70%,#fce7e7 100%)",
          backgroundSize: "300% 300%",
          animation: "bgShift 14s ease infinite",
        }}
      >
        {/* -- Floating Particles --------------------------------------- */}
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}

        {/* -- ECG Lines ------------------------------------------------ */}
        <AnimatedECG top="10%"  opacity={0.13} duration={7}  delay={0}   color="#266CA9" />
        <AnimatedECG top="28%"  opacity={0.09} duration={10} delay={1.5} color="#ef4444" />
        <AnimatedECG top="50%"  opacity={0.08} duration={8}  delay={0.8} color="#266CA9" />
        <AnimatedECG top="72%"  opacity={0.10} duration={9}  delay={2}   color="#ef4444" />
        <AnimatedECG bottom="8%" opacity={0.13} duration={7}  delay={0.4} color="#266CA9" />

        {/* -- Large background hearts ---------------------------------- */}
        <AnimatedHeart
          size={280}
          pulseDelay={0}
          style={{ top: "-60px", left: "-60px", opacity: 0.06 }}
        />
        <AnimatedHeart
          size={200}
          pulseDelay={0.75}
          style={{ bottom: "-40px", right: "420px", opacity: 0.07 }}
        />
        <AnimatedHeart
          size={140}
          pulseDelay={0.4}
          style={{ top: "38%", left: "43%", opacity: 0.06 }}
        />

        {/* -- Decorative crosses --------------------------------------- */}
        {[
          { top: 40,  right: 140, size: 22, opacity: 0.14 },
          { top: 200, left:  80,  size: 18, opacity: 0.10 },
          { bottom: 90, left: 220, size: 16, opacity: 0.09 },
          { bottom: 50, right: 200, size: 20, opacity: 0.12 },
          { top: "45%", left: "35%", size: 14, opacity: 0.08 },
        ].map((c, i) => (
          <svg
            key={i}
            style={{ position: "absolute", pointerEvents: "none", ...c, opacity: c.opacity }}
            width={c.size}
            height={c.size}
            viewBox="0 0 24 24"
          >
            <rect x="10" y="0" width="4" height="24" fill="#266CA9" rx="2" />
            <rect x="0" y="10" width="24" height="4" fill="#266CA9" rx="2" />
          </svg>
        ))}

        {/* -- Spinning ring accent ------------------------------------- */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: "1.5px dashed rgba(59,130,246,0.12)",
            animation: "spinSlow 40s linear infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            border: "1px dashed rgba(239,68,68,0.08)",
            animation: "spinSlow 60s linear infinite reverse",
            pointerEvents: "none",
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════
            LEFT PANEL – Login Form
        ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: "38%",
            minWidth: "360px",
            maxWidth: "480px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            padding: "48px 40px 32px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "4px 0 40px rgba(59,130,246,0.10)",
            animation: "fadeSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) both",
            zIndex: 10,
          }}
        >
          {/* ECG line decoration at the bottom of left panel */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40px",
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <svg
              width="200%"
              height="40"
              viewBox="0 0 800 40"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: 0,
                animation: "ecgScroll 5s linear infinite",
              }}
            >
              <polyline
                points="0,26 80,26 105,10 125,38 145,6 168,30 192,26 280,26 305,10 325,38 345,6 368,30 392,26 480,26 505,10 525,38 545,6 568,30 592,26 680,26 705,10 725,38 745,6 768,30 792,26"
                fill="none"
                stroke="#266CA9"
                strokeWidth="1.4"
                opacity="0.35"
              />
            </svg>
          </div>

          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                background: "linear-gradient(135deg,#266CA9 0%,#0F2573 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: "0 6px 24px rgba(59,130,246,0.40)",
                animation: "pulseBorder 2.5s ease infinite",
              }}
            >
              {/* ECG icon */}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12h3l2-8 4 16 3-10 2 4h4"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#041D56",
                letterSpacing: "-0.4px",
                marginBottom: "5px",
              }}
            >
              AI-CHD-CDSS
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                lineHeight: "1.5",
                maxWidth: "200px",
                margin: "0 auto",
              }}
            >
              AI-Powered Clinical Decision
              <br />
              Support System
            </div>
          </div>

          {/* Welcome */}
          <div style={{ textAlign: "center", marginBottom: "26px" }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#01082D",
                marginBottom: "4px",
              }}
            >
              Welcome Back
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              Sign in to continue to your account
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Clinical Email
              </label>
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.45,
                  }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="#6b7280" strokeWidth="1.8" />
                  <path d="M2 8l10 6 10-6" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  className="login-input"
                  type="email"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px 11px 36px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#374151",
                    outline: "none",
                    background: "#fff",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}
                >
                  Password
                </label>
                <a
                  href="#"
                  style={{
                    fontSize: "12px",
                    color: "#266CA9",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.45,
                  }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#6b7280" strokeWidth="1.8" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px 11px 36px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#374151",
                    outline: "none",
                    background: "#fff",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Remember me */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#266CA9", width: "14px", height: "14px", cursor: "pointer" }}
              />
              <label
                htmlFor="remember"
                style={{ fontSize: "12.5px", color: "#4b5563", cursor: "pointer", userSelect: "none" }}
              >
                Remember me on this device
              </label>
            </div>

            {/* Sign In */}
            <button
              className="sign-in-btn"
              type="submit"
              disabled={isSubmitting || isLoading}
              style={{
                width: "100%",
                padding: "13px",
                background: isSubmitting
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#266CA9 0%,#0F2573 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14.5px",
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(59,130,246,0.40)",
                fontFamily: "inherit",
                letterSpacing: "0.1px",
                marginTop: "2px",
              }}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
              {!isSubmitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {/* OR */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "2px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
            </div>

            {/* Request Access */}
            <button
              className="request-btn"
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#ffffff",
                color: "#374151",
                border: "1.5px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontFamily: "inherit",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M4 21c0-4 3.6-7 8-7s8 3 8 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              New User? Request Access
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "22px",
              paddingTop: "14px",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z"
                  stroke="#6b7280"
                  strokeWidth="1.8"
                  fill="none"
                />
                <path d="M9 12l2 2 4-4" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: "10.5px", color: "#6b7280" }}>HIPAA Compliant</span>
            </div>
            <span style={{ fontSize: "10.5px", color: "#6b7280" }}>Version 1.0.0</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT PANEL – Info Panel
        ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "40px 48px",
            gap: "22px",
            position: "relative",
            overflow: "hidden",
            animation: "fadeSlideInRight 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both",
            zIndex: 10,
          }}
        >
          {/* -- Animated heart (main decoration) ------------------------ */}
          <div
            style={{
              position: "absolute",
              top: "18px",
              right: "32px",
              width: "150px",
              height: "150px",
              opacity: 0.9,
              pointerEvents: "none",
              animation: "heartbeat 1.5s ease-in-out infinite",
            }}
          >
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="60" cy="108" rx="34" ry="7" fill="#93c5fd" opacity="0.4" />
              <path
                d="M60 95 C30 78, 15 60, 15 42 C15 26, 28 15, 42 18 C50 20, 57 26, 60 33 C63 26, 70 20, 78 18 C92 15, 105 26, 105 42 C105 60, 90 78, 60 95Z"
                fill="#f87171"
                opacity="0.9"
              />
              <path
                d="M60 90 C33 74, 20 57, 20 42 C20 29, 31 20, 43 22 C51 24, 58 30, 60 36 C62 30, 69 24, 77 22 C89 20, 100 29, 100 42 C100 57, 87 74, 60 90Z"
                fill="#ef4444"
              />
              <path
                d="M38 35 C36 30, 38 24, 44 23"
                stroke="#fca5a5"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* ECG on heart */}
              <path
                d="M30 55 L42 55 L47 44 L52 62 L56 48 L60 58 L65 55 L90 55"
                stroke="#ADE1FB"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {/* Chart bars */}
              <rect x="68" y="10" width="46" height="34" rx="6" fill="#ADE1FB" opacity="0.5" />
              <rect x="72" y="14" width="38" height="26" rx="4" fill="#bfdbfe" opacity="0.4" />
              <rect x="75" y="28" width="5" height="10" rx="1" fill="#266CA9" opacity="0.6" />
              <rect x="83" y="24" width="5" height="14" rx="1" fill="#266CA9" opacity="0.7" />
              <rect x="91" y="20" width="5" height="18" rx="1" fill="#0F2573" opacity="0.8" />
              <rect x="99" y="25" width="5" height="13" rx="1" fill="#266CA9" opacity="0.6" />
            </svg>
          </div>

          {/* Heading */}
          <div style={{ maxWidth: "540px" }}>
            <h1
              style={{
                fontSize: "clamp(22px, 2.4vw, 30px)",
                fontWeight: 800,
                color: "#041D56",
                lineHeight: "1.25",
                marginBottom: "12px",
                letterSpacing: "-0.3px",
              }}
            >
              AI-Powered Clinical Decision
              <br />
              Support System
            </h1>
            <p style={{ fontSize: "13.5px", color: "#4b5563", lineHeight: "1.7", maxWidth: "460px" }}>
              AI-CHD-CDSS helps clinicians predict Coronary Heart Disease risk
              with explainable AI, advanced analytics and clinical insights.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#266CA9" strokeWidth="1.5" />
                    <path d="M8 12l2 2 4-4" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M12 7v1M12 16v1M7 12H6M18 12h-1" stroke="#266CA9" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                title: "AI Prediction",
                desc: "Accurate risk assessment",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z" stroke="#266CA9" strokeWidth="1.6" fill="#E8F6FE" />
                    <rect x="9" y="9" width="6" height="8" rx="1" stroke="#266CA9" strokeWidth="1.4" />
                    <circle cx="12" cy="8" r="2" stroke="#266CA9" strokeWidth="1.4" />
                  </svg>
                ),
                title: "Role Based Access",
                desc: "Secure access for every clinical role",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#266CA9" strokeWidth="1.6" fill="#E8F6FE" />
                    <path d="M7 9h10M7 12h7M7 15h5" stroke="#266CA9" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ),
                title: "Clinical Reports",
                desc: "Comprehensive report generation",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="#266CA9" strokeWidth="1.6" fill="#E8F6FE" />
                    <path d="M18 18l3 3" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8 11l2 2 4-4" stroke="#266CA9" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                title: "Explainable AI",
                desc: "SHAP explanations for transparency",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z" fill="#E8F6FE" stroke="#266CA9" strokeWidth="1.6" />
                    <path d="M9 12l2 2 4-4" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
                title: "Enterprise Security",
                desc: "HIPAA compliant and audit ready",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.80)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  flex: "1",
                  minWidth: "90px",
                  maxWidth: "140px",
                  boxShadow: "0 2px 12px rgba(59,130,246,0.09)",
                  border: "1px solid rgba(219,234,254,0.7)",
                  textAlign: "center",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 8px 24px rgba(59,130,246,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 2px 12px rgba(59,130,246,0.09)";
                }}
              >
                {f.icon}
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#041D56" }}>{f.title}</div>
                <div style={{ fontSize: "10px", color: "#6b7280", lineHeight: "1.4" }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(12px)",
              borderRadius: "14px",
              padding: "18px 20px",
              boxShadow: "0 2px 12px rgba(59,130,246,0.09)",
              border: "1px solid rgba(219,234,254,0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px",
              }}
            >
              {[
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="3.5" stroke="#266CA9" strokeWidth="1.6" />
                      <path d="M5 21c0-4 3.6-7 7-7s7 3 7 7" stroke="#266CA9" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ),
                  label: "Patient Data",
                  sub: "Collect clinical information",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="8" rx="7" ry="4" stroke="#266CA9" strokeWidth="1.6" fill="#E8F6FE" />
                      <path d="M5 8v5c0 2.2 3.1 4 7 4s7-1.8 7-4V8" stroke="#266CA9" strokeWidth="1.6" />
                      <path d="M5 13v5c0 2.2 3.1 4 7 4s7-1.8 7-4v-5" stroke="#266CA9" strokeWidth="1.6" />
                    </svg>
                  ),
                  label: "AI Analysis",
                  sub: "Advanced ML model processing",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12h3l2-7 4 14 3-9 2 3 4-1" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="10" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="2 2" />
                    </svg>
                  ),
                  label: "Risk Prediction",
                  sub: "CHD risk percentage calculation",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z" fill="#E8F6FE" stroke="#266CA9" strokeWidth="1.6" />
                      <path d="M9 12l2 2 4-4" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ),
                  label: "Clinical Insight",
                  sub: "Explainable results with SHAP",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="2" width="16" height="20" rx="3" stroke="#266CA9" strokeWidth="1.6" fill="#E8F6FE" />
                      <path d="M8 7h8M8 11h8M8 15h5" stroke="#266CA9" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M15 16l2 2 3-3" stroke="#266CA9" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  ),
                  label: "Action & Report",
                  sub: "Recommendations and reports",
                },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "#E8F6FE",
                        border: "1.5px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: "#041D56",
                        textAlign: "center",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: "9.5px",
                        color: "#6b7280",
                        textAlign: "center",
                        lineHeight: "1.4",
                      }}
                    >
                      {step.sub}
                    </div>
                  </div>
                  {i < 4 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        paddingBottom: "22px",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
                        <path d="M2 5h20" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 2" />
                        <path d="M20 2l4 3-4 3" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", gap: "14px", flex: 1, minHeight: 0 }}>
            {/* Trust stats */}
            <div
              style={{
                flex: "1.2",
                background: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(12px)",
                borderRadius: "14px",
                padding: "16px 18px",
                boxShadow: "0 2px 12px rgba(59,130,246,0.09)",
                border: "1px solid rgba(219,234,254,0.7)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#041D56",
                  marginBottom: "14px",
                }}
              >
                Trusted by Healthcare Professionals
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "space-between",
                }}
              >
                {[
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="9" cy="7" r="3" stroke="#266CA9" strokeWidth="1.5" fill="#ADE1FB" />
                        <circle cx="15" cy="7" r="3" stroke="#266CA9" strokeWidth="1.5" fill="#ADE1FB" />
                        <path d="M3 19c0-3 2.7-5 6-5M21 19c0-3-2.7-5-6-5M9 14c0 0 1.5-0.5 3 0" stroke="#266CA9" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ),
                    value: "4",
                    label: "System Roles",
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="7" width="18" height="14" rx="2" stroke="#266CA9" strokeWidth="1.5" fill="#ADE1FB" />
                        <path d="M3 11h18M8 7V4M16 7V4" stroke="#266CA9" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ),
                    value: "50",
                    label: "Seeded Cohort",
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 18l4-6 5 4 4-8 5 10" stroke="#266CA9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ),
                    value: "0.868",
                    label: "Model ROC-AUC",
                  },
                  {
                    icon: (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z" fill="#ADE1FB" stroke="#266CA9" strokeWidth="1.5" />
                        <path d="M9 12l2 2 4-4" stroke="#266CA9" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ),
                    value: "100%",
                    label: "Data Security",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      flex: 1,
                    }}
                  >
                    {stat.icon}
                    <div
                      style={{ fontSize: "14px", fontWeight: 800, color: "#041D56" }}
                    >
                      {stat.value}
                    </div>
                    <div style={{ fontSize: "9px", color: "#6b7280", textAlign: "center" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Insight */}
            <div
              style={{
                flex: "0.9",
                background: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(12px)",
                borderRadius: "14px",
                padding: "16px 18px",
                boxShadow: "0 2px 12px rgba(59,130,246,0.09)",
                border: "1px solid rgba(219,234,254,0.7)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#fef9c3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#ca8a04" strokeWidth="1.8" />
                    <path d="M12 7v5l3 3" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#041D56" }}>
                  Today's Clinical Insight
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.65", marginBottom: "10px" }}>
                Early detection of Coronary Heart Disease significantly improves patient outcomes.
                AI-CHD-CDSS empowers you with accurate predictions and actionable insights.
              </p>
              <a
                href="#"
                style={{
                  fontSize: "11.5px",
                  color: "#266CA9",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Learn More
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="#266CA9"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: "4px" }}>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              © 2025 AI-CHD-CDSS. All rights reserved.
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          REGISTRATION ACCESS MODAL OVERLAY
      ════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(30, 41, 59, 0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "480px",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "20px",
              border: "1.5px solid #266CA9",
              boxShadow: "0 20px 48px rgba(30, 41, 59, 0.25)",
              padding: "32px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#041D56", marginBottom: "4px" }}>
                  Request Staff Access
                </h3>
                <p style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                  Requests are pending approval from an active Doctor.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#041D56",
                  cursor: "pointer",
                  fontWeight: "bold",
                  marginLeft: "auto",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestAccess} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  className="login-input"
                  type="email"
                  required
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#374151",
                    outline: "none",
                    background: "#f9fafb",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  className="login-input"
                  type="password"
                  required
                  minLength={6}
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#374151",
                    outline: "none",
                    background: "#f9fafb",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Requested Role
                  </label>
                  <select
                    value={reqRole}
                    onChange={(e) => setReqRole(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#374151",
                      outline: "none",
                      background: "#f9fafb",
                      fontWeight: 600
                    }}
                  >
                    {[
                      "Nurse",
                      "Lab Tech",
                      "ECG Tech",
                      "Radiology Tech",
                      "Medical Researcher",
                      "Pharmacist",
                      "Physiotherapist",
                      "Dietitian"
                    ].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    License Number
                  </label>
                  <input
                    className="login-input"
                    type="text"
                    required
                    placeholder="e.g. LIC-12345"
                    value={reqLicense}
                    onChange={(e) => setReqLicense(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#374151",
                      outline: "none",
                      background: "#f9fafb",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Clinical Specialty
                  </label>
                  <input
                    className="login-input"
                    type="text"
                    required
                    placeholder="e.g. Critical Care"
                    value={reqSpecialty}
                    onChange={(e) => setReqSpecialty(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#374151",
                      outline: "none",
                      background: "#f9fafb",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Department
                  </label>
                  <input
                    className="login-input"
                    type="text"
                    required
                    placeholder="e.g. ICU"
                    value={reqDepartment}
                    onChange={(e) => setReqDepartment(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#374151",
                      outline: "none",
                      background: "#f9fafb",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRequesting}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: "linear-gradient(135deg, #266CA9 0%, #0F2573 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "12px"
                }}
              >
                {isRequesting ? "Submitting Request..." : "Submit Access Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
