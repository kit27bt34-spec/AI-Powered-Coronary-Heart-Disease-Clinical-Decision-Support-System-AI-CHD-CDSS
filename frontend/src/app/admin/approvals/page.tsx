"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import RefreshButton from "@/components/ui/RefreshButton";
import { api } from "@/lib/api";

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);

  const fetchApprovals = () => {
    api.get("/api/v1/admin/approvals")
      .then(res => setApprovals(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error loading approvals:", err));
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      await api.post(`/api/v1/admin/approvals/${id}/action`, {
        action,
        notes: `Processed by Super Admin (${action})`
      });
      setApprovals(approvals.map(a => a.id === id ? { ...a, status: action === "Approve" ? "Approved" : "Rejected" } : a));
    } catch (err) {
      console.error("Error processing approval:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Pending Registrations & Approvals</h1>
          <p className="text-xs text-slate-500 font-semibold">Review clinician access requests, verify medical license credentials, and approve accounts</p>
        </div>
        <RefreshButton onRefresh={fetchApprovals} />
      </div>

      <div className="space-y-4">
        {approvals.map((item) => (
          <GlassCard key={item.id} className="p-6 bg-white border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-sm text-slate-900">{item.full_name || "Applicant"}</h3>
                <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">
                  {item.requested_role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{item.email} | License: {item.license_number || "MD-Pending"}</p>
              <p className="text-[11px] text-slate-400 font-semibold">Specialty: {item.specialization || "General Medicine"}</p>
            </div>

            <div className="flex items-center gap-3">
              {item.status === "Pending" ? (
                <>
                  <GlassButton onClick={() => handleAction(item.id, "Approve")} variant="success" size="sm" className="px-4 py-2 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve</span>
                  </GlassButton>
                  <GlassButton onClick={() => handleAction(item.id, "Reject")} variant="danger" size="sm" className="px-4 py-2 text-xs font-bold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </GlassButton>
                </>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${item.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700"}`}>
                  {item.status}
                </span>
              )}
            </div>
          </GlassCard>
        ))}

        {approvals.length === 0 && (
          <GlassCard className="p-12 bg-white text-center text-xs text-slate-400 font-bold">
            No pending registration requests requiring review.
          </GlassCard>
        )}
      </div>
    </div>
  );
}
