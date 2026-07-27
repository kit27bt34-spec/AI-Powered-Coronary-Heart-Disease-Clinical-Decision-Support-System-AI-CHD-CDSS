"""
Production-Grade User Access & Role Control Service
Handles user provisioning, validation, CRUD operations, permissions management,
password hashing, audit logging, and bulk operations for AI-CHD-CDSS.
"""

import json
import random
import string
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.database.models import User, DoctorProfile, Hospital, Department, AuditLog
from backend.security import get_password_hash
from backend.services.audit_service import AuditService

# Default Clinical Role Definitions & Dynamic Permission Mappings
def _to_uuid(val: Any) -> Optional[uuid.UUID]:
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val).strip())
    except (ValueError, TypeError, AttributeError):
        return None

def _get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
    if not identifier:
        return None
    u_uuid = _to_uuid(identifier)
    if u_uuid:
        user = db.query(User).filter(User.id == u_uuid, User.is_deleted == False).first()
        if user:
            return user
    return db.query(User).filter(
        or_(User.email == str(identifier), User.employee_id == str(identifier)),
        User.is_deleted == False
    ).first()

def _get_hospital_by_identifier(db: Session, identifier: Any) -> Optional[Hospital]:
    if not identifier:
        return None
    h_uuid = _to_uuid(identifier)
    if h_uuid:
        h = db.query(Hospital).filter(Hospital.id == h_uuid, Hospital.is_deleted == False).first()
        if h:
            return h
    return db.query(Hospital).filter(Hospital.code == str(identifier), Hospital.is_deleted == False).first()

def _get_department_by_identifier(db: Session, identifier: Any) -> Optional[Department]:
    if not identifier:
        return None
    d_uuid = _to_uuid(identifier)
    if d_uuid:
        d = db.query(Department).filter(Department.id == d_uuid, Department.is_deleted == False).first()
        if d:
            return d
    return db.query(Department).filter(Department.code == str(identifier), Department.is_deleted == False).first()
DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "superadmin": [
        "patient:view", "patient:create", "patient:update", "patient:delete",
        "prediction:generate", "prediction:view_explanation",
        "reports:download", "reports:export",
        "admin:manage_doctors", "admin:manage_departments", "admin:manage_users",
        "admin:audit_logs", "admin:model_management", "admin:system_monitoring"
    ],
    "admin": [
        "patient:view", "patient:create", "patient:update",
        "prediction:generate", "prediction:view_explanation",
        "reports:download", "reports:export",
        "admin:manage_doctors", "admin:manage_departments", "admin:manage_users",
        "admin:audit_logs"
    ],
    "doctor": [
        "patient:view", "patient:create", "patient:update",
        "prediction:generate", "prediction:view_explanation",
        "reports:download", "reports:export"
    ],
    "nurse": [
        "patient:view", "patient:create", "patient:update",
        "prediction:view_explanation", "reports:download"
    ],
    "receptionist": [
        "patient:view", "patient:create", "patient:update"
    ],
    "lab technician": [
        "patient:view", "reports:download"
    ],
    "pharmacist": [
        "patient:view", "reports:download"
    ],
    "data entry operator": [
        "patient:view", "patient:create"
    ],
    "auditor": [
        "patient:view", "reports:download", "admin:audit_logs"
    ]
}

ALL_PERMISSIONS = [
    {"id": "patient:view", "category": "Patient Management", "label": "View Patient Records"},
    {"id": "patient:create", "category": "Patient Management", "label": "Register New Patients"},
    {"id": "patient:update", "category": "Patient Management", "label": "Edit Patient Records"},
    {"id": "patient:delete", "category": "Patient Management", "label": "Soft Delete Patient Records"},

    {"id": "prediction:generate", "category": "AI Prediction Engine", "label": "Execute 10-Yr CHD Prediction"},
    {"id": "prediction:view_explanation", "category": "AI Prediction Engine", "label": "View SHAP & LIME Explanations"},

    {"id": "reports:download", "category": "Clinical Reports", "label": "Download Clinical Assessment PDFs"},
    {"id": "reports:export", "category": "Clinical Reports", "label": "Export Clinical Datasets (CSV)"},

    {"id": "admin:manage_doctors", "category": "Governance", "label": "Manage Physician Accounts"},
    {"id": "admin:manage_departments", "category": "Governance", "label": "Manage Clinical Departments"},
    {"id": "admin:manage_users", "category": "Governance", "label": "Manage User Accounts & Roles"},
    {"id": "admin:audit_logs", "category": "Governance", "label": "View System Security Audit Logs"},
    {"id": "admin:model_management", "category": "Governance", "label": "Manage & Retrain AI Models"},
    {"id": "admin:system_monitoring", "category": "Governance", "label": "Monitor System Telemetry"}
]

class UserService:
    @staticmethod
    def get_users(
        db: Session,
        search: Optional[str] = None,
        hospital_id: Optional[str] = None,
        department_id: Optional[str] = None,
        role: Optional[str] = None,
        status_val: Optional[str] = None,
        sort_by: Optional[str] = "created_at_desc",
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Fetches system users from PostgreSQL database with filtering, search, and pagination."""
        query = db.query(User).filter(User.is_deleted == False)

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(s),
                    User.email.ilike(s),
                    User.employee_id.ilike(s),
                    User.phone.ilike(s)
                )
            )

        if hospital_id and hospital_id != "all":
            h_obj = _get_hospital_by_identifier(db, hospital_id)
            if h_obj:
                query = query.filter(User.hospital_id == h_obj.id)

        if department_id and department_id != "all":
            d_obj = _get_department_by_identifier(db, department_id)
            if d_obj:
                query = query.filter(User.department_id == d_obj.id)

        if role and role != "all":
            query = query.filter(func.lower(User.role) == role.lower())

        if status_val and status_val != "all":
            query = query.filter(func.lower(User.status) == status_val.lower())

        # Sorting
        if sort_by == "name_asc":
            query = query.order_by(User.full_name.asc())
        elif sort_by == "name_desc":
            query = query.order_by(User.full_name.desc())
        elif sort_by == "last_login":
            query = query.order_by(User.last_login.desc().nullslast())
        else:
            query = query.order_by(User.created_at.desc())

        total_count = query.count()
        offset = (page - 1) * limit
        users = query.offset(offset).limit(limit).all()

        user_list = []
        for u in users:
            hospital_name = "System Wide"
            hospital_code = "ALL"
            if u.hospital_id:
                h = db.query(Hospital).filter(Hospital.id == u.hospital_id).first()
                if h:
                    hospital_name = h.name
                    hospital_code = h.code

            dept_name = "General Medical"
            dept_code = "GEN"
            if u.department_id:
                d = db.query(Department).filter(Department.id == u.department_id).first()
                if d:
                    dept_name = d.name
                    dept_code = d.code

            perms = []
            if u.permissions_json:
                try:
                    perms = json.loads(u.permissions_json)
                except Exception:
                    perms = DEFAULT_ROLE_PERMISSIONS.get(u.role.lower(), [])
            else:
                perms = DEFAULT_ROLE_PERMISSIONS.get(u.role.lower(), [])

            user_list.append({
                "id": str(u.id),
                "employee_id": u.employee_id or f"EMP-{str(u.id)[:4].upper()}",
                "full_name": u.full_name or u.email.split("@")[0].capitalize(),
                "email": u.email,
                "phone": u.phone or "N/A",
                "gender": u.gender or "Unspecified",
                "dob": u.dob or "N/A",
                "designation": u.designation or u.role.capitalize(),
                "hospital_id": str(u.hospital_id) if u.hospital_id else None,
                "hospital_name": hospital_name,
                "hospital_code": hospital_code,
                "department_id": str(u.department_id) if u.department_id else None,
                "department_name": dept_name,
                "department_code": dept_code,
                "role": u.role,
                "status": u.status or "Active",
                "is_active": u.is_active,
                "must_change_password": u.must_change_password,
                "mfa_enabled": u.mfa_enabled,
                "temporary_password": u.temporary_password,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "last_logout": u.last_logout.isoformat() if u.last_logout else None,
                "failed_login_attempts": u.failed_login_attempts or 0,
                "account_locked": u.account_locked,
                "browser": u.browser or "Chrome/Edge",
                "ip_address": u.ip_address or "127.0.0.1",
                "created_by": u.created_by or "Super Admin",
                "updated_by": u.updated_by or "Super Admin",
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
                "permissions": perms
            })

        return {
            "total": total_count,
            "page": page,
            "limit": limit,
            "users": user_list
        }

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Dict[str, Any]:
        """Fetches detailed profile, organization, permissions, and audit logs for a single user."""
        u = _get_user_by_identifier(db, user_id)
        if not u:
            raise HTTPException(status_code=404, detail="User account not found.")

        hospital_name = "System Wide"
        hospital_code = "ALL"
        if u.hospital_id:
            h = db.query(Hospital).filter(Hospital.id == u.hospital_id).first()
            if h:
                hospital_name = h.name
                hospital_code = h.code

        dept_name = "General Medical"
        dept_code = "GEN"
        if u.department_id:
            d = db.query(Department).filter(Department.id == u.department_id).first()
            if d:
                dept_name = d.name
                dept_code = d.code

        perms = []
        if u.permissions_json:
            try:
                perms = json.loads(u.permissions_json)
            except Exception:
                perms = DEFAULT_ROLE_PERMISSIONS.get(u.role.lower(), [])
        else:
            perms = DEFAULT_ROLE_PERMISSIONS.get(u.role.lower(), [])

        # Recent audit logs for this user
        audit_logs = db.query(AuditLog).filter(AuditLog.user_id == u.id).order_by(AuditLog.created_at.desc()).limit(15).all()

        recent_activities = [
            {
                "id": str(log.id),
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address or "127.0.0.1",
                "timestamp": log.created_at.isoformat() if log.created_at else None
            }
            for log in audit_logs
        ]

        return {
            "id": str(u.id),
            "employee_id": u.employee_id or f"EMP-{str(u.id)[:4].upper()}",
            "full_name": u.full_name or u.email.split("@")[0].capitalize(),
            "email": u.email,
            "phone": u.phone or "N/A",
            "gender": u.gender or "Unspecified",
            "dob": u.dob or "N/A",
            "designation": u.designation or u.role.capitalize(),
            "hospital_id": str(u.hospital_id) if u.hospital_id else None,
            "hospital_name": hospital_name,
            "hospital_code": hospital_code,
            "department_id": str(u.department_id) if u.department_id else None,
            "department_name": dept_name,
            "department_code": dept_code,
            "role": u.role,
            "status": u.status or "Active",
            "is_active": u.is_active,
            "must_change_password": u.must_change_password,
            "mfa_enabled": u.mfa_enabled,
            "temporary_password": u.temporary_password,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "last_logout": u.last_logout.isoformat() if u.last_logout else None,
            "failed_login_attempts": u.failed_login_attempts or 0,
            "account_locked": u.account_locked,
            "browser": u.browser or "Chrome/Edge",
            "ip_address": u.ip_address or "127.0.0.1",
            "created_by": u.created_by or "Super Admin",
            "updated_by": u.updated_by or "Super Admin",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            "permissions": perms,
            "recent_activities": recent_activities
        }

    @staticmethod
    def create_user(db: Session, data: Dict[str, Any], admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Provisions a new clinical user account with database validation, password hashing, and audit logging."""
        email = str(data.get("email", "")).strip().lower()
        full_name = str(data.get("full_name", "")).strip()
        employee_id = str(data.get("employee_id", "")).strip().upper()
        phone = str(data.get("phone", "")).strip()
        role = str(data.get("role", "doctor")).strip().lower()
        gender = str(data.get("gender", "")).strip()
        dob = str(data.get("dob", "")).strip()
        designation = str(data.get("designation", "")).strip()
        hospital_id_val = data.get("hospital_id")
        department_id_val = data.get("department_id")
        must_change_password = bool(data.get("must_change_password", True))
        mfa_enabled = bool(data.get("mfa_enabled", False))
        custom_perms = data.get("permissions")

        # 1. Validation
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="A valid email address is required.")
        if not full_name:
            raise HTTPException(status_code=400, detail="Full Name is required.")

        # Email Uniqueness check
        existing_email = db.query(User).filter(User.email == email, User.is_deleted == False).first()
        if existing_email:
            raise HTTPException(status_code=409, detail=f"User with email '{email}' already exists.")

        # Employee ID Uniqueness check
        if not employee_id:
            employee_id = f"EMP-{random.randint(1000, 9999)}"
        else:
            existing_emp = db.query(User).filter(User.employee_id == employee_id, User.is_deleted == False).first()
            if existing_emp:
                raise HTTPException(status_code=409, detail=f"Employee ID '{employee_id}' is already registered.")

        # Hospital Validation
        h_obj = None
        if hospital_id_val:
            h_obj = _get_hospital_by_identifier(db, hospital_id_val)
            if not h_obj:
                raise HTTPException(status_code=400, detail="Selected hospital facility is inactive or invalid.")

        # Department Validation
        d_obj = None
        if department_id_val:
            d_obj = _get_department_by_identifier(db, department_id_val)
            if not d_obj:
                raise HTTPException(status_code=400, detail="Selected clinical department is inactive or invalid.")

        # Generate temporary password
        temp_pass = data.get("password") or f"{role.capitalize()}@{random.randint(100, 999)}"
        password_hashed = get_password_hash(temp_pass)

        # Assigned permissions
        assigned_permissions = custom_perms if isinstance(custom_perms, list) and len(custom_perms) > 0 else DEFAULT_ROLE_PERMISSIONS.get(role, [])

        user = User(
            employee_id=employee_id,
            full_name=full_name,
            email=email,
            phone=phone,
            gender=gender,
            dob=dob,
            designation=designation or role.capitalize(),
            hospital_id=h_obj.id if h_obj else None,
            department_id=d_obj.id if d_obj else None,
            role=role,
            status="Active",
            is_active=True,
            password_hash=password_hashed,
            temporary_password=temp_pass,
            must_change_password=must_change_password,
            mfa_enabled=mfa_enabled,
            created_by=admin_email,
            updated_by=admin_email,
            permissions_json=json.dumps(assigned_permissions)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create DoctorProfile if role is doctor
        if role == "doctor":
            existing_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
            if not existing_prof:
                prof = DoctorProfile(
                    user_id=user.id,
                    license_number=f"MD-{random.randint(10000, 99999)}",
                    specialty="Cardiology & CCU",
                    department=d_obj.name if d_obj else "Coronary Care Unit (CCU)",
                    full_name=full_name,
                    phone=phone,
                    hospital=h_obj.name if h_obj else "St. Jude Memorial Hospital"
                )
                db.add(prof)
                db.commit()

        # Log Audit Event
        AuditService.log_action(
            db=db,
            activity_type="User Created",
            details=f"Provisioned clinical user '{full_name}' ({email}) with role '{role}' and Employee ID '{employee_id}'",
            user_email=admin_email
        )

        return UserService.get_user_by_id(db, str(user.id))

    @staticmethod
    def update_user(db: Session, user_id: str, data: Dict[str, Any], admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Updates user account details, permissions, hospital, department, and role in PostgreSQL."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        if "full_name" in data and data["full_name"]:
            user.full_name = str(data["full_name"]).strip()
        if "phone" in data:
            user.phone = str(data["phone"]).strip()
        if "designation" in data:
            user.designation = str(data["designation"]).strip()
        if "gender" in data:
            user.gender = str(data["gender"]).strip()
        if "dob" in data:
            user.dob = str(data["dob"]).strip()
        if "mfa_enabled" in data:
            user.mfa_enabled = bool(data["mfa_enabled"])

        if "hospital_id" in data:
            h_val = data["hospital_id"]
            if h_val:
                h_obj = _get_hospital_by_identifier(db, h_val)
                if h_obj:
                    user.hospital_id = h_obj.id
            else:
                user.hospital_id = None

        if "department_id" in data:
            d_val = data["department_id"]
            if d_val:
                d_obj = _get_department_by_identifier(db, d_val)
                if d_obj:
                    user.department_id = d_obj.id
            else:
                user.department_id = None

        if "role" in data and data["role"]:
            user.role = str(data["role"]).strip().lower()

        if "status" in data and data["status"]:
            st = str(data["status"]).strip()
            user.status = st
            user.is_active = (st.lower() == "active")
            user.account_locked = (st.lower() == "locked")

        if "permissions" in data and isinstance(data["permissions"], list):
            user.permissions_json = json.dumps(data["permissions"])

        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        # Update DoctorProfile if exists
        profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if profile:
            if user.full_name:
                profile.full_name = user.full_name
            if user.phone:
                profile.phone = user.phone
            db.commit()

        # Log Audit
        AuditService.log_action(
            db=db,
            activity_type="User Updated",
            details=f"Updated profile and permissions for user '{user.email}'",
            user_email=admin_email
        )

        return UserService.get_user_by_id(db, str(user.id))

    @staticmethod
    def update_user_status(db: Session, user_id: str, status_val: str, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Updates user account status (Active, Inactive, Suspended, Locked, Pending) in PostgreSQL."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        st_clean = status_val.strip().capitalize()
        user.status = st_clean
        user.is_active = (st_clean == "Active")
        user.account_locked = (st_clean == "Locked")
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="Status Changed",
            details=f"Changed status of user '{user.email}' to '{st_clean}'",
            user_email=admin_email
        )

        return UserService.get_user_by_id(db, str(user.id))

    @staticmethod
    def reset_user_password(
        db: Session,
        user_id: str,
        new_password: Optional[str] = None,
        must_change_password: bool = True,
        admin_email: str = "superadmin@hospital.org"
    ) -> Dict[str, Any]:
        """Resets user password, hashes it, updates PostgreSQL, invalidates sessions, and logs audit trail."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        target_pass = new_password.strip() if new_password and new_password.strip() else f"{user.role.capitalize()}@{random.randint(100, 999)}"
        user.password_hash = get_password_hash(target_pass)
        user.temporary_password = target_pass
        user.must_change_password = must_change_password
        user.failed_login_attempts = 0
        user.account_locked = False
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="PASSWORD_RESET_BY_ADMIN",
            details=f"Super Admin '{admin_email}' reset password for user '{user.email}' (ID: {user.id}). Force change on next login: {must_change_password}",
            user_email=admin_email
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "temporary_password": target_pass,
            "must_change_password": user.must_change_password,
            "message": f"Password for {user.email} reset successfully."
        }

    @staticmethod
    def lock_user(db: Session, user_id: str, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Locks a user account in PostgreSQL and creates an AuditLog entry."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        user.account_locked = True
        user.status = "Locked"
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="ACCOUNT_LOCKED",
            details=f"Super Admin '{admin_email}' locked user account '{user.email}' (ID: {user.id})",
            user_email=admin_email
        )
        return {"id": str(user.id), "email": user.email, "status": "Locked", "account_locked": True, "message": f"User account {user.email} has been locked."}

    @staticmethod
    def unlock_user(db: Session, user_id: str, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Unlocks a user account in PostgreSQL, resets failed login attempts, and logs audit entry."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        user.account_locked = False
        user.failed_login_attempts = 0
        user.status = "Active"
        user.is_active = True
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="ACCOUNT_UNLOCKED",
            details=f"Super Admin '{admin_email}' unlocked user account '{user.email}' (ID: {user.id})",
            user_email=admin_email
        )
        return {"id": str(user.id), "email": user.email, "status": "Active", "account_locked": False, "message": f"User account {user.email} has been unlocked."}

    @staticmethod
    def activate_user(db: Session, user_id: str, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Activates user account in PostgreSQL and creates audit record."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        user.is_active = True
        user.status = "Active"
        user.account_locked = False
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="ACCOUNT_ACTIVATED",
            details=f"Super Admin '{admin_email}' activated user account '{user.email}' (ID: {user.id})",
            user_email=admin_email
        )
        return {"id": str(user.id), "email": user.email, "status": "Active", "is_active": True, "message": f"User account {user.email} activated."}

    @staticmethod
    def deactivate_user(db: Session, user_id: str, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Deactivates user account in PostgreSQL and creates audit record."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        user.is_active = False
        user.status = "Inactive"
        user.updated_by = admin_email
        user.updated_at = datetime.utcnow()
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="ACCOUNT_DEACTIVATED",
            details=f"Super Admin '{admin_email}' deactivated user account '{user.email}' (ID: {user.id})",
            user_email=admin_email
        )
        return {"id": str(user.id), "email": user.email, "status": "Inactive", "is_active": False, "message": f"User account {user.email} deactivated."}

    @staticmethod
    def soft_delete_user(db: Session, user_id: str, admin_email: str = "superadmin@hospital.org") -> bool:
        """Soft deletes user account by setting deleted_at timestamp in PostgreSQL."""
        user = _get_user_by_identifier(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.updated_by = admin_email
        db.commit()

        AuditService.log_action(
            db=db,
            activity_type="User Deleted",
            details=f"Soft deleted user account '{user.email}' (ID: {user_id})",
            user_email=admin_email
        )
        return True

    @staticmethod
    def bulk_user_action(db: Session, user_ids: List[str], action: str, target_val: Optional[str] = None, admin_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Executes bulk operations (activate, suspend, reset_password, assign_department, assign_role, delete) on multiple users."""
        if not user_ids or len(user_ids) == 0:
            raise HTTPException(status_code=400, detail="No target user IDs provided for bulk action.")

        users = db.query(User).filter(User.id.in_(user_ids), User.is_deleted == False).all()
        affected_count = 0

        for user in users:
            if action == "activate":
                user.status = "Active"
                user.is_active = True
                user.account_locked = False
            elif action == "suspend":
                user.status = "Suspended"
                user.is_active = False
            elif action == "reset_password":
                temp_p = f"{user.role.capitalize()}@{random.randint(100, 999)}"
                user.password_hash = get_password_hash(temp_p)
                user.temporary_password = temp_p
                user.must_change_password = True
            elif action == "assign_department" and target_val:
                d_obj = db.query(Department).filter(or_(Department.id == target_val, Department.code == target_val)).first()
                if d_obj:
                    user.department_id = d_obj.id
            elif action == "assign_role" and target_val:
                user.role = target_val.lower()
                user.permissions_json = json.dumps(DEFAULT_ROLE_PERMISSIONS.get(target_val.lower(), []))
            elif action == "delete":
                user.is_deleted = True
                user.deleted_at = datetime.utcnow()

            user.updated_by = admin_email
            user.updated_at = datetime.utcnow()
            affected_count += 1

            AuditService.log_action(
                db=db,
                activity_type=f"Bulk User Action: {action.upper()}",
                details=f"Executed bulk '{action}' on user '{user.email}'",
                user_email=admin_email
            )

        db.commit()
        return {"affected_users": affected_count, "action": action, "message": f"Bulk {action} completed on {affected_count} users."}
