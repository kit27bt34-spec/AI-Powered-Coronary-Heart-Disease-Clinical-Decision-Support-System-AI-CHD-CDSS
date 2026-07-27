"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      const mustChange = Boolean(
        user.must_change_password ||
        user.is_first_login ||
        (localStorage.getItem("must_change_password") === "true" && user.must_change_password)
      );
      if (mustChange) {
        router.push("/doctor/change-password");
      } else {
        localStorage.removeItem("must_change_password");
        if (typeof window !== "undefined" && !window.location.search.includes("hospital=")) {
          const hospName = localStorage.getItem("selected_hospital_name") || "St. Jude Memorial";
          const slug = hospName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const newUrl = `${window.location.pathname}?hospital=${slug}`;
          window.history.replaceState(null, "", newUrl);
        }
      }
    }
  }, [user, isLoading, router]);


  // Loading skeleton screen during initial auth verification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="relative h-12 w-12 flex items-center justify-center">
          <span className="absolute animate-ping h-8 w-8 rounded-full bg-blue-500 opacity-20" />
          <span className="h-6 w-6 rounded-full bg-blue-600 shadow" />
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Securing Doctor Session...
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <Topbar />

        {/* Scrollable Work View */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 max-w-7xl mx-auto w-full space-y-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
