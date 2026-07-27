"use client";

import React, { useEffect, useState } from "react";
import {
  Users, Shield, UserCheck, Key, Lock, Plus, X, Search, Filter,
  Download, RefreshCw, Eye, Edit3, Trash2, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, ShieldAlert, Sparkles, Building2, Layers,
  Phone, Mail, Calendar, User, Clock, Check, Copy, MoreVertical, Ban, LockKeyhole
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import RefreshButton from "@/components/ui/RefreshButton";
import { api } from "@/lib/api";

interface SystemUser {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  designation: string;
  hospital_id?: string;
  hospital_name: string;
  hospital_code: string;
  department_id?: string;
  department_name: string;
  department_code: string;
  role: string;
  status: string;
  is_active: boolean;
  must_change_password: boolean;
  mfa_enabled: boolean;
  temporary_password?: string;
  last_login?: string;
  last_logout?: string;
  failed_login_attempts: number;
  account_locked: boolean;
  browser?: string;
  ip_address?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  permissions: string[];
}

const SYSTEM_ROLES = [
  "Hospital Admin",
  "Doctor",
  "Nurse",
  "Receptionist",
  "Lab Technician",
  "Pharmacist",
  "Data Entry Operator",
  "Auditor"
];

const PERMISSION_CATEGORIES = [
  {
    category: "Patient Management",
    items: [
      { id: "patient:view", label: "View Patient Records" },
      { id: "patient:create", label: "Register New Patients" },
      { id: "patient:update", label: "Edit Patient Details" },
      { id: "patient:delete", label: "Soft Delete Patient Records" }
    ]
  },
  {
    category: "AI Prediction Engine",
    items: [
      { id: "prediction:generate", label: "Generate 10-Yr CHD Risk Prediction" },
      { id: "prediction:view_explanation", label: "View SHAP & LIME AI Explanations" }
    ]
  },
  {
    category: "Clinical Reports",
    items: [
      { id: "reports:download", label: "Download Clinical PDF Assessment" },
      { id: "reports:export", label: "Export Clinical Datasets (CSV)" }
    ]
  },
  {
    category: "Administration & Governance",
    items: [
      { id: "admin:manage_doctors", label: "Manage Physicians & Specialists" },
      { id: "admin:manage_departments", label: "Manage Clinical Departments" },
      { id: "admin:manage_users", label: "Manage User Access & Roles" },
      { id: "admin:audit_logs", label: "Access Security Audit Logs" },
      { id: "admin:model_management", label: "Manage & Retrain AI Models" },
      { id: "admin:system_monitoring", label: "Monitor Infrastructure Telemetry" }
    ]
  }
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Selected Checkboxes for Bulk Operations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Modals & Drawers State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [provisionTab, setProvisionTab] = useState<"personal" | "org" | "security" | "permissions">("personal");
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState<boolean>(false);

  const [activeUser, setActiveUser] = useState<SystemUser | null>(null);
  const [detailedUserInfo, setDetailedUserInfo] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Provision New User Form
  const [provisionForm, setProvisionForm] = useState({
    full_name: "",
    employee_id: "",
    email: "",
    phone: "",
    gender: "Male",
    dob: "",
    hospital_id: "",
    department_id: "",
    designation: "Attending Cardiologist",
    role: "Doctor",
    password: "",
    must_change_password: true,
    mfa_enabled: false,
    permissions: [
      "patient:view", "patient:create", "patient:update",
      "prediction:generate", "prediction:view_explanation",
      "reports:download"
    ]
  });

  // Edit User Form
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    designation: "",
    hospital_id: "",
    department_id: "",
    role: "Doctor",
    status: "Active",
    mfa_enabled: false,
    permissions: [] as string[]
  });

  // Fetch Hospitals & Departments dropdown options
  useEffect(() => {
    api.get("/api/v1/admin/hospitals").then(res => setHospitals(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get("/api/v1/admin/departments").then(res => setDepartments(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  // Fetch User Directory from Database
  const fetchUsers = () => {
    setIsLoading(true);
    let url = `/api/v1/admin/users?page=${currentPage}&limit=${itemsPerPage}&sort_by=${sortBy}`;
    if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    if (hospitalFilter !== "all") url += `&hospital_id=${encodeURIComponent(hospitalFilter)}`;
    if (departmentFilter !== "all") url += `&department_id=${encodeURIComponent(departmentFilter)}`;
    if (roleFilter !== "all") url += `&role=${encodeURIComponent(roleFilter)}`;
    if (statusFilter !== "all") url += `&status=${encodeURIComponent(statusFilter)}`;

    api.get(url)
      .then(res => {
        setUsers(res.data.users || []);
        setTotalCount(res.data.total || 0);
      })
      .catch(err => {
        console.error("Error loading user directory:", err);
        setToastNotice("Failed to load user directory from database.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, hospitalFilter, departmentFilter, roleFilter, statusFilter, sortBy, currentPage]);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Generate Auto Temporary Password
  const handleAutoGeneratePassword = (roleVal: string) => {
    const cleanRole = roleVal.replace(/\s+/g, "");
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${cleanRole}@${randNum}`;
  };

  const handleRoleChangeInProvision = (roleVal: string) => {
    const defaultPerms = PERMISSION_CATEGORIES.flatMap(c => c.items.map(i => i.id)).filter(p => {
      if (roleVal === "Hospital Admin") return true;
      if (roleVal === "Doctor") return !p.startsWith("admin:manage_users") && !p.startsWith("admin:model_management");
      if (roleVal === "Nurse") return p.startsWith("patient:") || p.startsWith("reports:");
      return p.startsWith("patient:view");
    });

    setProvisionForm(prev => ({
      ...prev,
      role: roleVal,
      password: handleAutoGeneratePassword(roleVal),
      permissions: defaultPerms
    }));
  };

  const togglePermissionInProvision = (permId: string) => {
    setProvisionForm(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter(p => p !== permId)
          : [...prev.permissions, permId]
      };
    });
  };

  // Submit Provision Form
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/api/v1/admin/users", {
        full_name: provisionForm.full_name,
        employee_id: provisionForm.employee_id,
        email: provisionForm.email,
        phone: provisionForm.phone,
        gender: provisionForm.gender,
        dob: provisionForm.dob,
        hospital_id: provisionForm.hospital_id || (hospitals[0]?.id || hospitals[0]?.code),
        department_id: provisionForm.department_id || (departments[0]?.id || departments[0]?.code),
        designation: provisionForm.designation,
        role: provisionForm.role,
        password: provisionForm.password,
        must_change_password: provisionForm.must_change_password,
        mfa_enabled: provisionForm.mfa_enabled,
        permissions: provisionForm.permissions
      });

      showToast(`User account '${provisionForm.full_name}' provisioned and saved in PostgreSQL!`);
      setIsProvisionModalOpen(false);
      fetchUsers();
      setProvisionForm({
        full_name: "",
        employee_id: "",
        email: "",
        phone: "",
        gender: "Male",
        dob: "",
        hospital_id: "",
        department_id: "",
        designation: "Attending Cardiologist",
        role: "Doctor",
        password: "",
        must_change_password: true,
        mfa_enabled: false,
        permissions: ["patient:view", "patient:create", "patient:update", "prediction:generate"]
      });
    } catch (err: any) {
      console.error("Provisioning Error:", err);
      alert(err?.response?.data?.detail || "Failed to provision user account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View User Drawer
  const handleViewUser = async (user: SystemUser) => {
    setActiveUser(user);
    setIsViewDrawerOpen(true);
    try {
      const res = await api.get(`/api/v1/admin/users/${user.id}`);
      setDetailedUserInfo(res.data);
    } catch {
      setDetailedUserInfo(user);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: SystemUser) => {
    setActiveUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone === "N/A" ? "" : user.phone,
      designation: user.designation,
      hospital_id: user.hospital_id || "",
      department_id: user.department_id || "",
      role: user.role,
      status: user.status,
      mfa_enabled: user.mfa_enabled,
      permissions: user.permissions || []
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setIsSubmitting(true);
    try {
      await api.put(`/api/v1/admin/users/${activeUser.id}`, editForm);
      showToast(`User profile for '${editForm.full_name}' updated in PostgreSQL!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update user profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password Action
  const handleResetPassword = async (user: SystemUser) => {
    setActiveUser(user);
    try {
      const res = await api.patch(`/api/v1/admin/users/${user.id}/password`);
      setResetPasswordResult(res.data);
      setIsResetPasswordModalOpen(true);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to reset password.");
    }
  };

  // Change User Status Action
  const handleChangeStatus = async (user: SystemUser, newStatus: string) => {
    try {
      await api.patch(`/api/v1/admin/users/${user.id}/status`, { status: newStatus });
      showToast(`User '${user.full_name}' status updated to ${newStatus}!`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update user status.");
    }
  };

  // Soft Delete User Action
  const handleDeleteUser = async (user: SystemUser) => {
    if (!confirm(`Are you sure you want to soft delete user '${user.full_name}' (${user.email})?`)) return;
    try {
      await api.delete(`/api/v1/admin/users/${user.id}`);
      showToast(`User '${user.full_name}' soft deleted from user directory.`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete user account.");
    }
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (action: string, targetVal?: string) => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Execute bulk ${action.toUpperCase()} on ${selectedUserIds.length} selected accounts?`)) return;

    try {
      await api.post("/api/v1/admin/users/bulk", {
        user_ids: selectedUserIds,
        action: action,
        target_val: targetVal
      });
      showToast(`Bulk ${action} executed successfully on ${selectedUserIds.length} accounts!`);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Bulk action failed.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/users/export`, "_blank");
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="space-y-6 pb-12">
      {toastNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">User Access & Role Control</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage clinical accounts, assigned departments, permissions, and session authentications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RefreshButton onRefresh={fetchUsers} />

          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="px-3.5 py-2 font-bold text-xs flex items-center gap-2 border border-slate-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <span>Export CSV</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => {
              const defaultPass = handleAutoGeneratePassword("Doctor");
              setProvisionForm(prev => ({ ...prev, password: defaultPass }));
              setIsProvisionModalOpen(true);
            }}
            className="px-4 py-2 font-bold text-xs flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Provision New Clinical User</span>
          </GlassButton>
        </div>
      </div>

      {/* Search Bar & Filters Toolbar */}
      <GlassCard className="p-4 bg-white border border-slate-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Name, Email, or Employee ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Hospital Filter */}
          <select
            value={hospitalFilter}
            onChange={(e) => { setHospitalFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">🏥 All Hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id || h.code}>{h.name}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">📂 All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id || d.code}>{d.name}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600 transition"
          >
            <option value="all">👤 All System Roles</option>
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-2 border-t border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500">
              Showing <span className="text-slate-900 font-extrabold">{users.length}</span> of <span className="text-slate-900 font-extrabold">{totalCount}</span> User Accounts
            </span>

            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl gap-1 text-[11px] font-extrabold text-slate-600">
              {["all", "active", "inactive", "suspended"].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                    statusFilter === st ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="created_at_desc">Sort: Recently Created</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
              <option value="last_login">Sort: Last Login</option>
            </select>

            <button
              onClick={fetchUsers}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Bulk Action Toolbar */}
      {selectedUserIds.length > 0 && (
        <div className="p-3.5 bg-indigo-900 text-white rounded-2xl flex items-center justify-between shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-indigo-700 px-3 py-1 rounded-xl">
              {selectedUserIds.length} Selected
            </span>
            <span className="text-xs font-semibold text-indigo-200">Execute Bulk Actions:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExecuteBulkAction("activate")}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Bulk Activate
            </button>
            <button
              onClick={() => handleExecuteBulkAction("suspend")}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Bulk Suspend
            </button>
            <button
              onClick={() => handleExecuteBulkAction("reset_password")}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Bulk Reset Pass
            </button>
            <button
              onClick={() => handleExecuteBulkAction("delete")}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Bulk Delete
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="p-1 text-indigo-300 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Directory Table */}
      <GlassCard className="p-0 bg-white border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Clinical User Accounts from PostgreSQL...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">No User Accounts Found</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
              No matching user records were found in the database. Provision a new user or adjust your filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Employee & User</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Hospital Facility</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {users.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`transition duration-150 ${isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50/60"}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user.id)}
                          className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Avatar & Employee Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            {user.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">{user.full_name}</span>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60 inline-block mt-0.5">
                              {user.employee_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-bold block">{user.email}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{user.phone}</span>
                      </td>

                      {/* Hospital */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block">{user.hospital_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{user.hospital_code}</span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block">{user.department_name}</span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className="uppercase text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block">
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          user.status.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : user.status.toLowerCase() === "suspended"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {user.status}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Never Logged In"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewUser(user)}
                            title="View Full Profile & Permissions"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit User Account"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            title="Reset Temporary Password"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            title="Soft Delete User Account"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold">
            Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* PROVISION NEW USER MODAL (EXECUTIVE TABBED WIZARD) */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-indigo-600/90 border border-indigo-400/30 text-white flex items-center justify-center font-black shadow-lg">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-white">Provision Clinical Account</h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                      Live DB Sync
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                    Configure identity, organizational access, role privileges, and security options
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between overflow-x-auto shrink-0">
              <div className="flex gap-1">
                {[
                  { id: "personal", label: "Identity", icon: User },
                  { id: "org", label: "Facility & Role", icon: Building2 },
                  { id: "security", label: "Security & Auth", icon: Lock },
                  { id: "permissions", label: `Permissions (${provisionForm.permissions.length})`, icon: Key },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = provisionTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProvisionTab(tab.id as any)}
                      className={`py-3 px-3.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "border-indigo-600 text-indigo-600 bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleProvisionSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">

                {/* TAB 1: PERSONAL DETAILS */}
                {provisionTab === "personal" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Personal & Contact Identity</h4>
                        <p className="text-[11px] text-slate-500">Provide official details for user profile & directory search</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Step 1 of 4</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={provisionForm.full_name}
                          onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                          placeholder="e.g. Dr. Sarah Jenkins"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Employee ID *</label>
                        <input
                          type="text"
                          required
                          value={provisionForm.employee_id}
                          onChange={(e) => setProvisionForm({ ...provisionForm, employee_id: e.target.value.toUpperCase() })}
                          placeholder="e.g. EMP-1008"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-indigo-900 transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={provisionForm.email}
                          onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value.toLowerCase() })}
                          placeholder="doctor@hospital.org"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={provisionForm.phone}
                          onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                          placeholder="+1 (555) 019-2831"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender</label>
                        <select
                          value={provisionForm.gender}
                          onChange={(e) => setProvisionForm({ ...provisionForm, gender: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Date of Birth</label>
                        <input
                          type="date"
                          value={provisionForm.dob}
                          onChange={(e) => setProvisionForm({ ...provisionForm, dob: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ORGANIZATION & ROLE */}
                {provisionTab === "org" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Facility Affiliation & Role Assignment</h4>
                        <p className="text-[11px] text-slate-500">Specify hospital branch, clinical department, title, and RBAC role</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Step 2 of 4</span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">Hospital Facility *</label>
                          <select
                            value={provisionForm.hospital_id}
                            onChange={(e) => setProvisionForm({ ...provisionForm, hospital_id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                          >
                            {hospitals.map(h => (
                              <option key={h.id} value={h.id || h.code}>{h.name} ({h.code || "SJH-01"})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">Clinical Department *</label>
                          <select
                            value={provisionForm.department_id}
                            onChange={(e) => setProvisionForm({ ...provisionForm, department_id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id || d.code}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">Designation / Title</label>
                          <input
                            type="text"
                            value={provisionForm.designation}
                            onChange={(e) => setProvisionForm({ ...provisionForm, designation: e.target.value })}
                            placeholder="e.g. Attending Cardiologist"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">System Role *</label>
                          <select
                            value={provisionForm.role}
                            onChange={(e) => handleRoleChangeInProvision(e.target.value)}
                            className="w-full bg-indigo-50/70 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-indigo-900 focus:outline-hidden"
                          >
                            {SYSTEM_ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                        <Shield className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-xs font-semibold text-indigo-950">
                          <span className="font-extrabold block mb-0.5">Role Privileges Auto-configured</span>
                          Selecting <span className="font-black text-indigo-700">{provisionForm.role}</span> automatically assigns recommended clinical permissions. You can customize permissions in Step 4.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY & AUTH */}
                {provisionTab === "security" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Login Credentials & Security Policies</h4>
                        <p className="text-[11px] text-slate-500">Auto-generated password & authentication security requirements</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Step 3 of 4</span>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generated Temporary Password</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            Auto-Generated
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-lg font-mono font-black text-white tracking-wide">{provisionForm.password}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(provisionForm.password);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedPass ? "Copied!" : "Copy"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition select-none">
                          <div className="space-y-0.5">
                            <span className="text-xs font-extrabold text-slate-900 block">Force Password Change on First Login</span>
                            <span className="text-[11px] text-slate-500 font-medium block">User must set a new password upon logging in</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={provisionForm.must_change_password}
                            onChange={(e) => setProvisionForm({ ...provisionForm, must_change_password: e.target.checked })}
                            className="h-4.5 w-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>

                        <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition select-none">
                          <div className="space-y-0.5">
                            <span className="text-xs font-extrabold text-slate-900 block">Enable Multi-Factor Authentication (MFA)</span>
                            <span className="text-[11px] text-slate-500 font-medium block">Enforce TOTP authenticator app verification</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={provisionForm.mfa_enabled}
                            onChange={(e) => setProvisionForm({ ...provisionForm, mfa_enabled: e.target.checked })}
                            className="h-4.5 w-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: GRANULAR PERMISSIONS */}
                {provisionTab === "permissions" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Granular Permission Matrix</h4>
                        <p className="text-[11px] text-slate-500">Fine-tune system capabilities for this account</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRoleChangeInProvision(provisionForm.role)}
                        className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl transition cursor-pointer"
                      >
                        Reset Role Defaults
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PERMISSION_CATEGORIES.map(cat => (
                        <div key={cat.category} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            {cat.category}
                          </span>
                          <div className="space-y-2">
                            {cat.items.map(item => {
                              const isChecked = provisionForm.permissions.includes(item.id);
                              return (
                                <label
                                  key={item.id}
                                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer select-none ${
                                    isChecked
                                      ? "bg-indigo-50 text-indigo-900 border border-indigo-200/80 shadow-2xs"
                                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <span className="pr-2">{item.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermissionInProvision(item.id)}
                                    className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  {provisionTab !== "personal" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (provisionTab === "org") setProvisionTab("personal");
                        else if (provisionTab === "security") setProvisionTab("org");
                        else if (provisionTab === "permissions") setProvisionTab("security");
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  {provisionTab !== "permissions" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (provisionTab === "personal") setProvisionTab("org");
                        else if (provisionTab === "org") setProvisionTab("security");
                        else if (provisionTab === "security") setProvisionTab("permissions");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Provisioning..." : "Provision Clinical Account →"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER RIGHT-SIDE DRAWER */}
      {isViewDrawerOpen && activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-xl w-full h-full p-6 space-y-6 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {activeUser.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{activeUser.full_name}</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600">{activeUser.employee_id}</span>
                </div>
              </div>
              <button
                onClick={() => setIsViewDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Email Address</span>
                  <span className="text-slate-900 font-bold">{activeUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Phone Number</span>
                  <span className="text-slate-900 font-bold">{activeUser.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Hospital Facility</span>
                  <span className="text-indigo-900 font-bold">{activeUser.hospital_name} ({activeUser.hospital_code})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Department</span>
                  <span className="text-slate-900 font-bold">{activeUser.department_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Designation</span>
                  <span className="text-slate-900 font-bold">{activeUser.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">System Role</span>
                  <span className="text-indigo-700 uppercase font-black">{activeUser.role}</span>
                </div>
              </div>
            </div>

            {/* Security Telemetry */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5 text-xs font-semibold">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-600" />
                <span>Security & Login Telemetry</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block">Status</span>
                  <span className="text-emerald-700 font-bold">{activeUser.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">MFA Status</span>
                  <span className="text-slate-800 font-bold">{activeUser.mfa_enabled ? "Enabled (Authenticator)" : "Disabled"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Last Login</span>
                  <span className="text-slate-800 font-bold">{activeUser.last_login ? new Date(activeUser.last_login).toLocaleString() : "Never"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Failed Attempts</span>
                  <span className="text-slate-800 font-bold">{activeUser.failed_login_attempts}</span>
                </div>
              </div>
            </div>

            {/* Assigned Permissions */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-indigo-600" />
                <span>Assigned Permissions ({activeUser.permissions?.length || 0})</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(activeUser.permissions || []).map(p => (
                  <span key={p} className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Audit Log Activities */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Recent Audit Trail History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(detailedUserInfo?.recent_activities || []).map((act: any) => (
                  <div key={act.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{act.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{act.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL (EXECUTIVE UI) */}
      {isEditModalOpen && activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600/90 border border-indigo-400/30 text-white flex items-center justify-center font-black shadow-lg">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">Edit User Profile</h3>
                  <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                    Modifying account for <span className="text-white font-bold">{activeUser.email}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold flex-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-900 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Designation / Title</label>
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-900 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Hospital Facility</label>
                    <select
                      value={editForm.hospital_id}
                      onChange={(e) => setEditForm({ ...editForm, hospital_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-hidden"
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id || h.code}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Clinical Department</label>
                    <select
                      value={editForm.department_id}
                      onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-hidden"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id || d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">System Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2.5 font-bold text-indigo-900 focus:outline-hidden"
                    >
                      {SYSTEM_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Account Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Locked">Locked</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-extrabold transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Updating..." : "Save Changes →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD RESULT MODAL */}
      {isResetPasswordModalOpen && activeUser && resetPasswordResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Temporary Password Generated</h3>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="p-1 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Password for <span className="font-bold text-slate-900">{resetPasswordResult.email}</span> has been reset. The user must change their password on next login.
            </p>

            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">New Temporary Password</span>
              <span className="text-lg font-mono font-black text-emerald-400 block">{resetPasswordResult.temporary_password}</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordResult.temporary_password);
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2"
              >
                {copiedPass ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPass ? "Copied!" : "Copy Password"}</span>
              </button>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
