"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  History,
  FileSpreadsheet,
  Settings,
  Info,
  LogOut,
  Stethoscope,
  UserCheck,
  ShieldCheck
} from "lucide-react";

const getRoleLabel = (role: string) => {
  if (!role) return "";
  const r = role.toLowerCase();
  if (r === "doctor") return "Cardiologist";
  if (r === "admin") return "Administrator";
  if (r === "nurse") return "Registered Nurse";
  if (r === "lab tech") return "Laboratory Technician";
  if (r === "ecg tech") return "ECG Technician";
  if (r === "radiology tech") return "Radiology Technician";
  if (r === "medical researcher") return "Medical Researcher";
  if (r === "pharmacist") return "Pharmacist";
  if (r === "physiotherapist") return "Physiotherapist";
  if (r === "dietitian") return "Dietitian";
  if (r === "auditor") return "Compliance Auditor";
  if (r === "governance") return "Governance Officer";
  return role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const getPortalLabel = (role: string) => {
  if (!role) return "Clinical Portal";
  const r = role.toLowerCase();
  if (r === "doctor") return "Doctor Portal";
  if (r === "admin") return "Admin Portal";
  return `${getRoleLabel(role)} Portal`;
};

const isMenuItemVisible = (href: string, role: string) => {
  if (!role) return false;
  const r = role.toLowerCase();
  if (href === "/predict") {
    return ["admin", "doctor"].includes(r);
  }
  if (href === "/history") {
    return !["lab tech", "ecg tech", "radiology tech", "pharmacist", "physiotherapist", "dietitian"].includes(r);
  }
  if (href === "/accounts") {
    return r === "doctor";
  }
  return true;
};

const getInitials = (name?: string, email?: string) => {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const username = email.split("@")[0];
    return username.slice(0, 2).toUpperCase();
  }
  return "DR";
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "Prediction", href: "/predict", icon: BrainCircuit },
    { name: "Prediction History", href: "/history", icon: History },
    { name: "Reports", href: "/reports", icon: FileSpreadsheet },
    { name: "Accounts", href: "/accounts", icon: UserCheck },
    { name: "Profile", href: "/settings", icon: Settings },
    { name: "About", href: "/about", icon: Info },
  ];

  const visibleMenuItems = menuItems.filter((item) => isMenuItemVisible(item.href, user?.role || ""));

  const handleLogout = () => {
    logout();
    toast("Logged out successfully.", "info", "Session Terminated");
    router.push("/login");
  };

  const getHospitalSlug = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_hospital_name");
      if (saved) return saved.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    return "st-jude-memorial";
  };

  const hospitalSlug = getHospitalSlug();

  return (
    <aside className="w-64 glass-panel border-r border-slate-200/40 h-screen sticky top-0 flex flex-col justify-between p-4 z-40">
      {/* Brand Header */}
      <div className="space-y-6">
        <Link prefetch={false} href={`/dashboard?hospital=${hospitalSlug}`} className="flex items-center gap-3 px-2 py-3 hover:opacity-90 transition">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">AI-CHD-CDSS</h1>
            <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
              {getPortalLabel(user?.role || "")}
            </span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const hrefWithQuery = `${item.href}?hospital=${hospitalSlug}`;
            return (
              <Link
                key={item.name}
                prefetch={false}
                href={hrefWithQuery}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-200 group ${
                  isActive
                    ? "text-primary bg-blue-500/5"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {/* Active highlight pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <item.icon className={`h-4.5 w-4.5 transition-transform group-hover:scale-105 ${
                  isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                }`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>


      </div>

      {/* Footer Profile & Logout */}
      <div className="space-y-4 pt-4 border-t border-slate-200/50">
        {user && (
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 text-primary flex items-center justify-center font-black text-xs uppercase border border-blue-200/40 shrink-0">
              {getInitials(user.full_name, user.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 truncate tracking-tight">
                {user.full_name || getRoleLabel(user.role)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50/60 transition group cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-400 group-hover:text-rose-600" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
