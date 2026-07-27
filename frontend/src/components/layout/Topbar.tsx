"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, Bell, Plus, X, CheckCheck, Clock, User, UserCheck, UserX, HelpCircle } from "lucide-react";
import GlassButton from "@/components/ui/GlassButton";
import { useToast } from "@/providers/ToastProvider";

import RefreshButton from "@/components/ui/RefreshButton";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_id?: string;
  sender_email?: string;
}

interface PatientResult {
  patient_id: number;
  patient_uuid: string;
  name?: string;
  age?: number;
}

export default function Topbar() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Live Date (updates every minute) ------------------------------------
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });

  // --- Search ---------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await api.get("/api/v1/patients");
      const patients: PatientResult[] = res.data || [];
      const lower = q.toLowerCase();
      const filtered = patients.filter((p) =>
        p.patient_uuid?.toLowerCase().includes(lower) ||
        p.name?.toLowerCase().includes(lower) ||
        String(p.patient_id)?.includes(lower)
      );
      setSearchResults(filtered.slice(0, 8));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSearchOpen(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(q), 300);
  };

  const handleSearchResultClick = (patientId: number) => {
    router.push(`/patients/${patientId}`);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Notifications --------------------------------------------------------
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // --- Rejection reason modal state -----------------------------------------
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [infoTargetId, setInfoTargetId] = useState<string | null>(null);
  const [infoNote, setInfoNote] = useState("");
  const [activeTab, setActiveTab] = useState<"notifications" | "requests">("notifications");
  
  // --- Reply state ----------------------------------------------------------
  const [replyTargetNotifId, setReplyTargetNotifId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/api/v1/notifications");
      return res.data;
    },
    refetchInterval: 30_000, // Poll every 30s
    staleTime: 10_000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/v1/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/v1/notifications/mark-all-read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message: string }) => {
      await api.post("/api/v1/notifications/send", {
        recipient_id: recipientId,
        message,
      });
    },
    onSuccess: () => {
      toast("Reply sent successfully.", "success", "Reply Sent");
      setReplyTargetNotifId(null);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || "Could not send reply.", "error", "Error");
    },
  });

  // --- Pending Registration Requests (Doctors only) -------------------------
  const { data: pendingRequests = [] } = useQuery<any[]>({
    queryKey: ["pendingRequests"],
    queryFn: async () => {
      if (user?.role !== "doctor") return [];
      const res = await api.get("/api/v1/auth/pending-requests");
      return res.data;
    },
    enabled: !!user && user.role === "doctor",
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const staffActionMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }: { requestId: string; action: string; notes?: string }) => {
      await api.post(`/api/v1/auth/pending-requests/${requestId}/action`, { action, notes });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
      const label = variables.action === "approve" ? "Approved" : variables.action === "reject" ? "Rejected" : "Info Requested";
      toast(`Registration request ${label} successfully.`, "success", "Action Applied");
      setRejectTargetId(null);
      setRejectReason("");
      setInfoTargetId(null);
      setInfoNote("");
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || "Could not complete action.", "error", "Action Failed");
    },
  });

  // Total bell badge: unread notifications + pending requests
  const totalBadge = unreadCount + pendingRequests.length;

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        // Also close any open sub-modals
        setRejectTargetId(null);
        setInfoTargetId(null);
        setReplyTargetNotifId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };


  return (
    <header className="glass-panel border-b border-slate-200/40 px-6 py-4 flex items-center justify-between sticky top-0 z-30">

      {/* --- Global Search -------------------------------- */}
      <div className="relative w-80" ref={searchRef}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => { if (searchQuery) setSearchOpen(true); }}
          placeholder="Global clinical search (ID, name)..."
          className="w-full bg-slate-100/50 hover:bg-slate-100 border border-slate-200/50 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Search Dropdown */}
        {searchOpen && searchQuery && (
          <div className="absolute top-full mt-2 left-0 w-full bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden z-50">
            {searchLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-semibold">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                Searching clinical records...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs font-bold text-slate-400">
                No patients found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div>
                <div className="px-4 pt-3 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  {searchResults.length} Patient{searchResults.length !== 1 ? "s" : ""} Found
                </div>
                {searchResults.map((p) => (
                  <button
                    key={p.patient_id}
                    onClick={() => handleSearchResultClick(p.patient_id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/60 transition cursor-pointer text-left"
                  >
                    <div className="h-7 w-7 rounded-full bg-blue-500/10 text-primary flex items-center justify-center font-black text-[10px] shrink-0">
                      {p.name ? p.name.charAt(0).toUpperCase() : "#"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {p.name || "Anonymous Patient"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        ID #{p.patient_id} • {p.patient_uuid?.slice(0, 8)}…
                        {p.age !== undefined && ` • Age ${p.age}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Right Section -------------------------------- */}
      <div className="flex items-center gap-3">

        {/* Global Refresh Button */}
        <RefreshButton />

        {/* Live Date & Ward */}
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-extrabold text-slate-700 tracking-tight">{formattedDate}</p>
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">CCU Ward • Hospital</span>
        </div>

        {/* --- Notification Bell --- */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="p-2 bg-slate-100/50 hover:bg-slate-100 border border-slate-200/50 text-slate-500 hover:text-slate-800 rounded-xl transition relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {/* Red dot only when there are unread notifications or pending requests */}
            {totalBadge > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-white animate-pulse" />
            )}
          </button>

          {/* Notification Floating Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-2xl shadow-slate-200/60 z-50 overflow-hidden">
              
              {/* Tabs Switcher for Doctor Portal */}
              {user?.role === "doctor" ? (
                <div className="flex border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50">
                  <button
                    onClick={() => setActiveTab("notifications")}
                    className={`flex-1 py-2.5 text-center border-r border-slate-100 hover:text-slate-700 transition flex items-center justify-center gap-1.5 ${
                      activeTab === "notifications" ? "text-primary bg-white font-extrabold border-b-2 border-b-primary" : ""
                    }`}
                  >
                    <span>General</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`flex-1 py-2.5 text-center hover:text-slate-700 transition flex items-center justify-center gap-1.5 ${
                      activeTab === "requests" ? "text-primary bg-white font-extrabold border-b-2 border-b-primary" : ""
                    }`}
                  >
                    <span>Sign-ups</span>
                    {pendingRequests.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[8px] font-black">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                /* Static Header for normal users */
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-black text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Header Actions for Notifications tab */}
              {activeTab === "notifications" && unreadCount > 0 && (
                <div className="flex justify-end px-4 py-1.5 bg-slate-50/20 border-b border-slate-50">
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="flex items-center gap-1 text-[9px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                </div>
              )}

              {/* Content Panel */}
              <div className="max-h-80 overflow-y-auto">
                {activeTab === "notifications" ? (
                  /* Notifications list */
                  notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2 text-slate-400">
                      <Bell className="h-8 w-8 opacity-20" />
                      <p className="text-[10px] font-bold">No notifications</p>
                      <p className="text-[9px]">You&apos;re all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50/30 transition flex flex-col gap-2 ${!n.is_read ? "bg-blue-50/20" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!n.is_read) markReadMutation.mutate(n.id); }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                              <p className={`text-[10px] font-bold truncate ${!n.is_read ? "text-slate-800" : "text-slate-600"}`}>
                                {n.title}
                              </p>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium leading-relaxed line-clamp-3">{n.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-0.5 text-[8px] text-slate-400 font-bold">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(n.created_at)}
                            </div>
                            {!n.is_read && (
                              <button
                                onClick={() => markReadMutation.mutate(n.id)}
                                className="text-[9px] text-primary font-bold hover:underline cursor-pointer"
                                title="Mark as read"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reply Action button */}
                        {n.sender_id && replyTargetNotifId !== n.id && (
                          <button
                            onClick={() => {
                              setReplyTargetNotifId(n.id);
                              if (!n.is_read) markReadMutation.mutate(n.id);
                            }}
                            className="self-start px-2 py-0.5 bg-blue-50 text-primary text-[8px] font-extrabold rounded border border-blue-200/50 hover:bg-blue-100/50 transition cursor-pointer"
                          >
                            Reply
                          </button>
                        )}

                        {/* Inline Reply Form */}
                        {n.sender_id && replyTargetNotifId === n.id && (
                          <div className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg mt-1 animate-fade-in text-left">
                            <label className="text-[8px] font-black text-slate-500 uppercase">Reply Message:</label>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type reply message..."
                              className="w-full text-[10px] p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-primary font-bold"
                              rows={2}
                            />
                            <div className="flex gap-1.5 self-end">
                              <button
                                onClick={() => {
                                  setReplyTargetNotifId(null);
                                  setReplyText("");
                                }}
                                className="px-2 py-0.5 text-slate-500 hover:underline text-[9px] font-extrabold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!replyText.trim()) {
                                    toast("Please enter a reply message", "warning", "Validation Error");
                                    return;
                                  }
                                  sendReplyMutation.mutate({
                                    recipientId: n.sender_id!,
                                    message: replyText,
                                  });
                                }}
                                className="px-2.5 py-0.5 bg-primary text-white rounded text-[9px] font-extrabold hover:bg-primary-hover transition cursor-pointer"
                              >
                                {sendReplyMutation.isPending ? "Sending..." : "Send"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  /* Pending requests list */
                  pendingRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2 text-slate-400">
                      <User className="h-8 w-8 opacity-20" />
                      <p className="text-[10px] font-bold">No requests</p>
                      <p className="text-[9px]">No pending access requests.</p>
                    </div>
                  ) : (
                    pendingRequests.map((req) => (
                      <div key={req.id} className="p-3.5 border-b border-slate-100 flex flex-col gap-2 bg-[#F9FBFC] text-left">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate" title={req.email}>
                            {req.email}
                          </p>
                          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            Role: <span className="text-primary uppercase font-extrabold">{req.role}</span>
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            License: {req.license_number || "N/A"}
                          </p>
                          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            {req.specialty} • {req.department}
                          </p>
                        </div>

                        {/* Inline Actions */}
                        {rejectTargetId !== req.id && infoTargetId !== req.id && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => staffActionMutation.mutate({ requestId: req.id, action: "approve" })}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1 text-[9px] font-extrabold cursor-pointer"
                            >
                              <UserCheck className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => setRejectTargetId(req.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1 text-[9px] font-extrabold cursor-pointer"
                            >
                              <UserX className="h-3 w-3" /> Reject
                            </button>
                            <button
                              onClick={() => setInfoTargetId(req.id)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 text-[9px] font-extrabold cursor-pointer"
                            >
                              <HelpCircle className="h-3 w-3" /> Info
                            </button>
                          </div>
                        )}

                        {/* Inline Reject Form */}
                        {rejectTargetId === req.id && (
                          <div className="flex flex-col gap-1.5 p-2 bg-rose-50/50 border border-rose-100 rounded-lg mt-1 animate-fade-in text-left">
                            <label className="text-[9px] font-black text-rose-800">Reason for Rejection:</label>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejecting request..."
                              className="w-full text-[10px] p-2 border border-rose-200 rounded-lg bg-white outline-none focus:border-rose-400 font-bold"
                              rows={2}
                            />
                            <div className="flex gap-1.5 self-end">
                              <button
                                onClick={() => setRejectTargetId(null)}
                                className="px-2 py-1 text-slate-500 hover:underline text-[9px] font-extrabold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!rejectReason.trim()) {
                                    toast("Please specify a rejection reason", "warning", "Validation Error");
                                    return;
                                  }
                                  staffActionMutation.mutate({
                                    requestId: req.id,
                                    action: "reject",
                                    notes: rejectReason,
                                  });
                                }}
                                className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[9px] font-extrabold hover:bg-rose-700 transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Info Request Form */}
                        {infoTargetId === req.id && (
                          <div className="flex flex-col gap-1.5 p-2 bg-blue-50/50 border border-blue-100 rounded-lg mt-1 animate-fade-in text-left">
                            <label className="text-[9px] font-black text-blue-800">Details Required:</label>
                            <textarea
                              value={infoNote}
                              onChange={(e) => setInfoNote(e.target.value)}
                              placeholder="Specify missing details..."
                              className="w-full text-[10px] p-2 border border-blue-200 rounded-lg bg-white outline-none focus:border-blue-400 font-bold"
                              rows={2}
                            />
                            <div className="flex gap-1.5 self-end">
                              <button
                                onClick={() => setInfoTargetId(null)}
                                className="px-2 py-1 text-slate-500 hover:underline text-[9px] font-extrabold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!infoNote.trim()) {
                                    toast("Please specify the info required", "warning", "Validation Error");
                                    return;
                                  }
                                  staffActionMutation.mutate({
                                    requestId: req.id,
                                    action: "request-info",
                                    notes: infoNote,
                                  });
                                }}
                                className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-extrabold hover:bg-blue-700 transition cursor-pointer"
                              >
                                Request Info
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Prediction Button */}
        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => router.push("/predict")}
          className="shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Quick Prediction</span>
        </GlassButton>

        {/* --- Profile Avatar (redirects to /settings) --- */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200/50">
            <button
              onClick={() => router.push("/settings")}
              title="View Profile"
              className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
            >
              {user.email.charAt(0)}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
