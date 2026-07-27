"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Shield, ChevronDown, LogOut, CheckCircle2,
  Building2, Sparkles, RefreshCw, Cpu, Activity, User, Stethoscope,
  Heart, FileText, ArrowRight, X, Layers, Trash2, Check, ExternalLink,
  AlertTriangle, AlertCircle, Info, BellOff, Sliders, Clock, History
} from "lucide-react";
import { api } from "@/lib/api";
import RefreshButton from "@/components/ui/RefreshButton";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  module: string;
  severity: "info" | "success" | "warning" | "critical";
  action_url: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

export default function AdminNavbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

  // Admin Identity & Profile State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch Master Administrator Identity from PostgreSQL
  const fetchAdminProfile = async () => {
    try {
      const res = await api.get("/api/v1/admin/me");
      if (res.data) {
        setAdminProfile(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch administrator identity profile:", err);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await api.post("/api/v1/admin/auth/logout").catch(() => { });
      await api.post("/api/v1/auth/logout").catch(() => { });
    } catch (err) {
      console.warn("Sign out request warning:", err);
    } finally {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.clear();
      setIsSigningOut(false);
      setIsSignOutModalOpen(false);
      router.push("/admin/login");
    }
  };

  // Fetch Unread Count from PostgreSQL
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/api/v1/admin/notifications/unread-count");
      if (res.data && typeof res.data.unread_count === "number") {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.warn("Failed to fetch unread notification count:", err);
    }
  };

  // Fetch Notifications List from PostgreSQL
  const fetchNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const params: any = { limit: 50 };
      if (notifFilter === "unread") {
        params.unread_only = true;
      }
      const res = await api.get("/api/v1/admin/notifications", { params });
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to fetch admin notifications:", err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial profile & listen for synchronization events
  useEffect(() => {
    fetchAdminProfile();
    const handleProfileUpdate = () => fetchAdminProfile();
    window.addEventListener("admin_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("admin_profile_updated", handleProfileUpdate);
  }, []);

  // Poll unread notification count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Fetch list when notification dropdown opens or filter changes
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications, notifFilter]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/api/v1/admin/global-search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data?.results || []);
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Notification Action Handlers
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/v1/admin/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/api/v1/admin/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleDeleteNotif = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/api/v1/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleClearRead = async () => {
    try {
      await api.delete("/api/v1/admin/notifications/read");
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
    }
  };

  const handleCardClick = (notif: SystemNotification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setShowNotifications(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return "";
    const dt = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - dt.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return {
          cardBg: "bg-rose-50/90 hover:bg-rose-100/90 border-rose-200",
          titleColor: "text-rose-950",
          descColor: "text-rose-700",
          badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
          icon: <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />,
        };
      case "warning":
        return {
          cardBg: "bg-amber-50/90 hover:bg-amber-100/90 border-amber-200",
          titleColor: "text-amber-950",
          descColor: "text-amber-700",
          badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />,
        };
      case "success":
        return {
          cardBg: "bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-200",
          titleColor: "text-emerald-950",
          descColor: "text-emerald-700",
          badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />,
        };
      default:
        return {
          cardBg: "bg-slate-50 hover:bg-slate-100 border-slate-200",
          titleColor: "text-slate-900",
          descColor: "text-slate-600",
          badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" />,
        };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SA";
    const parts = name.replace(/^Dr\.\s*/i, "").trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between shadow-2xs">
      {/* Left Search Bar */}
      <div className="relative w-80 lg:w-96" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals, doctors, models, settings..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-3 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 text-[10px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-md">
              ⌘K
            </span>
          )}
        </div>

        {/* Global Search Popover */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                Search Results ({searchResults.length})
              </span>
              {isSearching && (
                <RefreshCw className="h-3 w-3 text-indigo-600 animate-spin mr-2" />
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                      if (item.url) router.push(item.url);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/70 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100/60 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 transition">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
                          {item.subtitle || item.category}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transform group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-semibold text-slate-400">
                No matching records found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Active Hospital Facility Switcher */}
        <button
          onClick={() => router.push("/admin/select-hospital")}
          title="Switch Hospital Workspace"
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 transition cursor-pointer"
        >
          <Building2 className="h-4 w-4 text-indigo-600" />
          <span>
            {adminProfile?.hospital_name || (typeof window !== "undefined" && localStorage.getItem("selected_hospital")
              ? JSON.parse(localStorage.getItem("selected_hospital") || "{}")?.name || "St. Jude Memorial Hospital"
              : "St. Jude Memorial Hospital")}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />
        </button>

        {/* Global Refresh Button */}
        <RefreshButton />

        {/* Enterprise Notification Center Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Enterprise Notification Center"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition relative cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-indigo-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Notifications
                  </h4>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                      {unreadCount} Unread
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      All Caught Up
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchNotifications}
                    title="Refresh Notifications"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingNotifs ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-Header Toolbar & Filter Tabs */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg">
                  <button
                    onClick={() => setNotifFilter("all")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${notifFilter === "all"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotifFilter("unread")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${notifFilter === "unread"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Mark All Read
                    </button>
                  )}
                  {notifications.some((n) => n.is_read) && (
                    <button
                      onClick={handleClearRead}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear Read
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto p-3 space-y-2 flex-1">
                {isLoadingNotifs && notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold">Loading system notifications from PostgreSQL...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const style = getSeverityStyle(notif.severity);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleCardClick(notif)}
                        className={`p-3 rounded-xl border transition relative group cursor-pointer ${style.cardBg} ${!notif.is_read ? "ring-1 ring-indigo-500/20 shadow-xs" : "opacity-85"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5">{style.icon}</div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${style.badgeBg}`}>
                                  {notif.module || "System Monitoring"}
                                </span>
                                {!notif.is_read && (
                                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" title="Unread" />
                                )}
                              </div>
                              <h5 className={`text-xs font-extrabold mt-1 ${style.titleColor}`}>
                                {notif.title}
                              </h5>
                              <p className={`text-[11px] font-medium leading-snug mt-0.5 ${style.descColor}`}>
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-slate-400">
                                <span>{formatRelativeTime(notif.created_at)}</span>
                                {notif.action_url && (
                                  <span className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold">
                                    View Details <ExternalLink className="h-2.5 w-2.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                            {!notif.is_read && (
                              <button
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                title="Mark as Read"
                                className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteNotif(notif.id, e)}
                              title="Delete Notification"
                              className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Empty State */
                  <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        No New Notifications
                      </h5>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        You're all caught up.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  AI-CHD-CDSS Enterprise Telemetry & Alerting Engine
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Super Admin Enterprise Identity & Account Menu Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            {adminProfile?.avatar_url ? (
              <img
                src={adminProfile.avatar_url}
                alt="Admin Profile"
                className="h-7 w-7 rounded-lg object-cover border border-indigo-200"
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {getInitials(adminProfile?.full_name || "Super Admin")}
              </div>
            )}
            <span className="text-xs font-bold text-slate-800 hidden md:inline">
              {adminProfile?.full_name?.split(" ")[0] || "Super Admin"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Authenticated Administrator Header */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-3">
                  {adminProfile?.avatar_url ? (
                    <img
                      src={adminProfile.avatar_url}
                      alt="Profile Avatar"
                      className="h-10 w-10 rounded-xl object-cover border border-indigo-200 shadow-xs"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      {getInitials(adminProfile?.full_name || "Super Admin")}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {adminProfile?.full_name || "Tulasiram"}
                      </h4>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                    </div>
                    <p className="text-[10px] font-bold text-indigo-600 truncate">
                      {adminProfile?.designation || "Chief Medical Information Officer & Super Administrator"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-medium mt-0.5">
                      {adminProfile?.email || "admin@hospital.org"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Building2 className="h-3 w-3 text-indigo-600" />
                    <span className="truncate max-w-[120px]">
                      {adminProfile?.hospital_name || "St. Jude Network"}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    {adminProfile?.last_login_display || "Today 09:42 AM"}
                  </span>
                </div>
              </div>

              {/* Navigation Menu Items */}
              <div className="space-y-1">
                <Link
                  href="/admin/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition"
                >
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/admin/profile?tab=preferences"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition"
                >
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <span>Account Preferences</span>
                </Link>

                <Link
                  href="/admin/profile?tab=security"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition"
                >
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>Account Security</span>
                </Link>

                <Link
                  href="/admin/profile?tab=history"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition"
                >
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Login History</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsSignOutModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Executive Sign Out Confirmation Dialog (Portaled directly to document.body for exact screen centering) */}
      {isSignOutModalOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Dark Gradient Header Banner */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center font-black shadow-lg">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">Confirm Sign Out</h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Super Administrator Disconnection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 space-y-4 text-xs font-semibold">
              {/* Account Identity Summary Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {getInitials(adminProfile?.full_name || "Tulasiram")}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {adminProfile?.full_name || "Tulasiram"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {adminProfile?.email || "admin@hospital.org"}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {adminProfile?.role_display || "Super Admin"}
                </span>
              </div>

              {/* Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Session Invalidation & Logout Notice</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-rose-800/90 pl-5">
                  Are you sure you want to terminate this active session?    The selected user will be signed out immediately and must authenticate again to access the AI-CHD-CDSS platform.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => setIsSignOutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleConfirmSignOut}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-extrabold transition shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSigningOut ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Disconnecting Session...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out & Disconnect →
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
