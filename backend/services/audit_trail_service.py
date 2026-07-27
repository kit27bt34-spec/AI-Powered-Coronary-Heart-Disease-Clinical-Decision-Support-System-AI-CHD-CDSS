"""
Enterprise Audit Trail Service for AI-CHD-CDSS.
Provides paginated, filterable, searchable audit log retrieval
with module classification, statistics, and full record detail.

100% PostgreSQL-backed. Zero mock data. Zero hardcoded values.
"""

import logging
import re
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import func, desc, asc, or_, and_
from sqlalchemy.orm import Session

from backend.database.models import (
    AuditLog, ActivityLog, User, Hospital, Department
)

logger = logging.getLogger("AuditTrailService")


# ─── MODULE CLASSIFICATION ────────────────────────────────────────────────────
# Maps action keywords → module name for human-readable classification.

MODULE_MAP: List[tuple] = [
    (["LOGIN", "LOGOUT", "FAILED_LOGIN", "PASSWORD", "SESSION", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED", "MFA"], "Authentication"),
    (["HOSPITAL_CREATED", "HOSPITAL_UPDATED", "HOSPITAL_DELETED", "HOSPITAL"], "Hospital Management"),
    (["DEPARTMENT_CREATED", "DEPARTMENT_UPDATED", "DEPARTMENT_DELETED", "DEPARTMENT"], "Department Management"),
    (["DOCTOR_CREATED", "DOCTOR_UPDATED", "DOCTOR_DEACTIVATED", "DOCTOR"], "Doctor Management"),
    (["PATIENT_REGISTERED", "PATIENT_UPDATED", "PATIENT_DELETED", "PATIENT"], "Patient Management"),
    (["PREDICTION_GENERATED", "PREDICTION_EXPORTED", "PREDICTION"], "Prediction Engine"),
    (["MODEL_DEPLOYED", "MODEL_PROMOTED", "MODEL_ROLLBACK", "MODEL_ARCHIVED", "MODEL"], "Model Management"),
    (["DRIFT_DETECTED", "GOVERNANCE", "DRIFT"], "AI Drift Governance"),
    (["USER_CREATED", "USER_UPDATED", "USER_DEACTIVATED", "USER_ACTIVATED", "ROLE_UPDATED", "PERMISSION"], "User Management"),
    (["SECURITY", "FORCE_LOGOUT", "SESSION_REVOKED", "PRIVILEGE"], "Security Center"),
    (["SYSTEM", "CONFIGURATION", "BACKUP", "MAINTENANCE", "HEALTH_CHECK", "SETTING"], "System Settings"),
    (["REPORT", "EXPORT", "GENERATED"], "Executive Reports"),
    (["CLINICAL", "INTELLIGENCE", "ANALYTICS"], "Clinical Intelligence"),
]

SEVERITY_MAP: Dict[str, List[str]] = {
    "Critical": ["DELETE", "DEACTIVATE", "REJECT", "CRITICAL", "ACCOUNT_LOCKED", "SESSION_REVOKED", "FORCE_LOGOUT"],
    "High":     ["FAILED_LOGIN", "FAIL", "DRIFT_DETECTED", "ROLLBACK", "MODEL_ROLLBACK"],
    "Medium":   ["CREATE", "UPDATE", "DEPLOY", "PROMOTE", "REGISTER", "APPROVE"],
    "Info":     ["LOGIN", "LOGOUT", "VIEW", "READ", "EXPORT", "HEALTH_CHECK"],
}

STATUS_MAP: Dict[str, List[str]] = {
    "Failed":    ["FAILED", "FAIL", "REJECT", "ERROR"],
    "Warning":   ["LOCKED", "DRIFT_DETECTED", "EXPIRED"],
    "Completed": [],  # default
}


def _classify_module(action: str) -> str:
    action_upper = (action or "").upper()
    for keywords, module in MODULE_MAP:
        if any(kw in action_upper for kw in keywords):
            return module
    return "System"


def _classify_severity(action: str) -> str:
    action_upper = (action or "").upper()
    for severity, keywords in SEVERITY_MAP.items():
        if any(kw in action_upper for kw in keywords):
            return severity
    return "Info"


def _classify_status(action: str) -> str:
    action_upper = (action or "").upper()
    for status, keywords in STATUS_MAP.items():
        if keywords and any(kw in action_upper for kw in keywords):
            return status
    return "Completed"


def _enrich_log(
    log: AuditLog,
    users_map: Dict,
    hospitals_map: Dict,
    depts_map: Dict,
) -> Dict[str, Any]:
    """Converts a raw AuditLog row to an enriched audit record dict."""
    user_info = users_map.get(log.user_id, {})
    hospital_name = hospitals_map.get(user_info.get("hospital_id"), "—")
    dept_name = depts_map.get(user_info.get("department_id"), "—")

    action = log.action or "—"
    module = _classify_module(action)
    severity = _classify_severity(action)
    status = _classify_status(action)

    ts = log.created_at
    if ts and ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    return {
        "id": str(log.id),
        "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S UTC") if ts else "—",
        "timestamp_iso": ts.isoformat() if ts else "",
        "user": user_info.get("full_name") or user_info.get("email") or "System",
        "email": user_info.get("email", "—"),
        "role": user_info.get("role", "—"),
        "hospital": hospital_name,
        "department": dept_name,
        "module": module,
        "action": action,
        "description": log.details or "—",
        "status": status,
        "severity": severity,
        "ip_address": log.ip_address or "—",
        "user_agent": log.user_agent or "—",
        "browser": _extract_browser(log.user_agent),
        "os": _extract_os(log.user_agent),
    }


def _extract_browser(user_agent: Optional[str]) -> str:
    if not user_agent:
        return "—"
    ua = user_agent
    if "Chrome" in ua and "Edg" not in ua:
        return "Chrome"
    if "Firefox" in ua:
        return "Firefox"
    if "Safari" in ua and "Chrome" not in ua:
        return "Safari"
    if "Edg" in ua:
        return "Edge"
    if "CDSS" in ua or "Admin" in ua:
        return "CDSS Admin"
    return ua[:30]


def _extract_os(user_agent: Optional[str]) -> str:
    if not user_agent:
        return "—"
    ua = user_agent
    if "Windows" in ua:
        return "Windows"
    if "Mac" in ua:
        return "macOS"
    if "Linux" in ua:
        return "Linux"
    if "Android" in ua:
        return "Android"
    if "iPhone" in ua or "iPad" in ua:
        return "iOS"
    return "—"


def _build_lookup_maps(db: Session, logs: List[AuditLog]):
    """Builds user, hospital, department lookup maps in 3 efficient queries."""
    user_ids = list({l.user_id for l in logs if l.user_id})
    users_map: Dict = {}

    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        for u in users:
            users_map[u.id] = {
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "hospital_id": u.hospital_id,
                "department_id": u.department_id,
            }

    hospital_ids = list({v.get("hospital_id") for v in users_map.values() if v.get("hospital_id")})
    hospitals_map: Dict = {}
    if hospital_ids:
        hosps = db.query(Hospital).filter(Hospital.id.in_(hospital_ids)).all()
        hospitals_map = {h.id: h.name for h in hosps}

    dept_ids = list({v.get("department_id") for v in users_map.values() if v.get("department_id")})
    depts_map: Dict = {}
    if dept_ids:
        depts = db.query(Department).filter(Department.id.in_(dept_ids)).all()
        depts_map = {d.id: d.name for d in depts}

    return users_map, hospitals_map, depts_map


class AuditTrailService:

    # ─── DASHBOARD KPIs ──────────────────────────────────────────────────────
    @staticmethod
    def get_audit_dashboard(db: Session) -> Dict[str, Any]:
        """Computes audit statistics directly from PostgreSQL."""
        total = db.query(AuditLog).count()

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_count = db.query(AuditLog).filter(AuditLog.created_at >= today_start).count()

        # Count by action keyword groups
        def count_like(keyword: str) -> int:
            return db.query(AuditLog).filter(AuditLog.action.ilike(f"%{keyword}%")).count()

        failed_count = count_like("FAIL") + count_like("REJECT") + count_like("LOCKED")
        security_count = (
            count_like("LOGIN") + count_like("LOGOUT") +
            count_like("PASSWORD") + count_like("SESSION") + count_like("LOCKED")
        )
        admin_count = (
            count_like("CREATE") + count_like("UPDATE") +
            count_like("DELETE") + count_like("DEPLOY") +
            count_like("PROMOTE") + count_like("ROLLBACK")
        )
        clinical_count = count_like("PATIENT") + count_like("PREDICTION") + count_like("CLINICAL")
        model_count = count_like("MODEL") + count_like("DRIFT")

        success_count = max(0, total - failed_count)

        return {
            "total_events": total,
            "today_events": today_count,
            "successful_actions": success_count,
            "failed_actions": failed_count,
            "security_events": security_count,
            "admin_changes": admin_count,
            "clinical_events": clinical_count,
            "model_events": model_count,
        }

    # ─── PAGINATED AUDIT LOGS ─────────────────────────────────────────────────
    @staticmethod
    def get_audit_logs(
        db: Session,
        page: int = 1,
        page_size: int = 25,
        search: Optional[str] = None,
        action_filter: Optional[str] = None,
        module_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sort_by: str = "timestamp_desc",
    ) -> Dict[str, Any]:
        """Returns paginated, filtered, searchable audit logs enriched with user/hospital data."""

        query = db.query(AuditLog)

        # ── Action filter ──
        if action_filter:
            query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))

        # ── Status filter (maps back to action keyword) ──
        if status_filter == "Failed":
            query = query.filter(or_(
                AuditLog.action.ilike("%FAIL%"),
                AuditLog.action.ilike("%REJECT%"),
                AuditLog.action.ilike("%LOCKED%"),
            ))
        elif status_filter == "Warning":
            query = query.filter(or_(
                AuditLog.action.ilike("%DRIFT%"),
                AuditLog.action.ilike("%EXPIRED%"),
            ))

        # ── Date range filter ──
        if date_from:
            try:
                df = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                query = query.filter(AuditLog.created_at >= df)
            except ValueError:
                pass
        if date_to:
            try:
                dt = datetime.strptime(date_to, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59, tzinfo=timezone.utc
                )
                query = query.filter(AuditLog.created_at <= dt)
            except ValueError:
                pass

        # ── Search filter (needs user join for name/email search) ──
        if search:
            s = f"%{search}%"
            # First get matching user IDs for name/email search
            matching_user_ids = [
                u.id for u in db.query(User.id, User.full_name, User.email).filter(
                    or_(User.full_name.ilike(s), User.email.ilike(s))
                ).all()
            ]
            conditions = [
                AuditLog.action.ilike(s),
                AuditLog.details.ilike(s),
                AuditLog.ip_address.ilike(s),
            ]
            if matching_user_ids:
                conditions.append(AuditLog.user_id.in_(matching_user_ids))
            query = query.filter(or_(*conditions))

        # ── Sorting ──
        if sort_by == "timestamp_asc":
            query = query.order_by(asc(AuditLog.created_at))
        else:
            query = query.order_by(desc(AuditLog.created_at))

        # ── Count total matching (before pagination) ──
        total_count = query.count()
        total_pages = max(1, (total_count + page_size - 1) // page_size)
        offset = (page - 1) * page_size

        logs = query.offset(offset).limit(page_size).all()

        # ── Module filter (applied post-fetch for derived module) ──
        # Build lookup maps for the fetched page
        users_map, hospitals_map, depts_map = _build_lookup_maps(db, logs)

        records = [_enrich_log(l, users_map, hospitals_map, depts_map) for l in logs]

        # Apply module filter post-enrichment (module is computed, not stored)
        if module_filter:
            records = [r for r in records if module_filter.lower() in r["module"].lower()]
        if severity_filter:
            records = [r for r in records if r["severity"].lower() == severity_filter.lower()]

        return {
            "records": records,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }

    # ─── SINGLE RECORD DETAIL ─────────────────────────────────────────────────
    @staticmethod
    def get_audit_record(db: Session, audit_id: str) -> Optional[Dict[str, Any]]:
        """Returns full detail for a single audit log record."""
        import uuid
        try:
            uid = uuid.UUID(audit_id)
        except ValueError:
            return None

        log = db.query(AuditLog).filter(AuditLog.id == uid).first()
        if not log:
            return None

        users_map, hospitals_map, depts_map = _build_lookup_maps(db, [log])
        return _enrich_log(log, users_map, hospitals_map, depts_map)

    # ─── AUDIT STATISTICS ─────────────────────────────────────────────────────
    @staticmethod
    def get_audit_statistics(db: Session) -> Dict[str, Any]:
        """Returns module-level and action-level distributions from AuditLog."""
        logs = db.query(AuditLog.action, func.count(AuditLog.id).label("cnt")).group_by(
            AuditLog.action
        ).order_by(desc("cnt")).all()

        by_module: Dict[str, int] = {}
        by_action: List[Dict] = []
        for action, cnt in logs:
            module = _classify_module(action)
            by_module[module] = by_module.get(module, 0) + cnt
            by_action.append({"action": action, "count": cnt, "module": module})

        return {
            "by_module": [{"module": k, "count": v} for k, v in sorted(by_module.items(), key=lambda x: -x[1])],
            "by_action": by_action[:20],
        }

    # ─── EXPORT DATA ─────────────────────────────────────────────────────────
    @staticmethod
    def get_export_data(
        db: Session,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        action_filter: Optional[str] = None,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Returns flat audit records for CSV/Excel/PDF export."""
        result = AuditTrailService.get_audit_logs(
            db,
            page=1,
            page_size=limit,
            action_filter=action_filter,
            date_from=date_from,
            date_to=date_to,
        )
        return result.get("records", [])
