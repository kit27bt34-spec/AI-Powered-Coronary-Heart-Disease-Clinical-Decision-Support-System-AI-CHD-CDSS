"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Layers, Stethoscope, Users, UserCheck,
  Heart, Activity, LineChart, Cpu, ShieldCheck, Server, Database,
  Radio, Lock, History, FileSpreadsheet, Settings, User, LogOut,
  ChevronRight, Sparkles
} from "lucide-react";

const navSections = [
  {
    title: "EXECUTIVE COMMAND",
    items: [
      { href: "/admin/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "HEALTHCARE NETWORK",
    items: [
      { href: "/admin/hospitals", label: "Hospital Management", icon: Building2 },
      { href: "/admin/departments", label: "Department Management", icon: Layers },
      { href: "/admin/doctors", label: "Doctor Management", icon: Stethoscope },
      { href: "/admin/users", label: "User & Role Control", icon: Users },
      { href: "/admin/approvals", label: "Pending Approvals", icon: UserCheck },
    ]
  },
  {
    title: "CLINICAL & PREDICTION",
    items: [
      { href: "/admin/patients", label: "Patient Analytics", icon: Heart },
      { href: "/admin/clinical-analytics", label: "Clinical Intelligence", icon: LineChart },
    ]
  },
  {
    title: "AI & MODEL GOVERNANCE",
    items: [
      { href: "/admin/models", label: "Model Management", icon: Cpu },
      { href: "/admin/ai-governance", label: "AI & Drift Governance", icon: ShieldCheck },
    ]
  },
  {
    title: "INFRASTRUCTURE & MONITORING",
    items: [
      { href: "/admin/monitoring", label: "System Monitoring", icon: Activity },
      { href: "/admin/security", label: "Security Center", icon: Lock },
      { href: "/admin/audit-logs", label: "System Audit Logs", icon: History },
      { href: "/admin/reports", label: "Executive Reports", icon: FileSpreadsheet },
    ]
  },
  {
    title: "SYSTEM PREFERENCES",
    items: [
      { href: "/admin/settings", label: "Enterprise Settings", icon: Settings },
      { href: "/admin/profile", label: "Super Admin Profile", icon: User },
    ]
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none shadow-xs">
      {/* Sidebar Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-slate-900 tracking-tight leading-none">AI-CHD-CDSS</h2>
            <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block mt-0.5">
              Super Admin Portal
            </span>
          </div>
        </div>



        {/* Navigation Items */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-190px)] scrollbar-thin scrollbar-thumb-slate-200">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                {section.title}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-600" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
            SA
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 truncate">Super Admin</p>
            <p className="text-[9px] font-bold text-slate-400 truncate">admin@hospital.org</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
