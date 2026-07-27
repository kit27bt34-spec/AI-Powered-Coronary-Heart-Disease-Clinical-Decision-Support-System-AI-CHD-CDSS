"""
Audit Logging & Live Activity Stream Service
Centralizes audit logging across Doctor and Super Admin portals.
Captures all system events (Auth, Patients, Doctors, Predictions, Hospitals, Settings).
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.database.models import AuditLog, User, DoctorProfile, Hospital

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: Optional[str] = None,
        details: str = "",
        user_id: Optional[uuid.UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        activity_type: Optional[str] = None
    ) -> Optional[AuditLog]:
        """Creates a standardized audit log entry in PostgreSQL."""
        act_name = action or activity_type or "System Action"
        try:
            log_entry = AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=act_name,
                details=details,
                ip_address=ip_address or "127.0.0.1",
                user_agent=user_agent or "CDSS/Admin",
                created_at=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except Exception as e:
            db.rollback()
            return None

    @staticmethod
    def get_recent_logs(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches top 50 live activity stream items formatted with severity and user metadata."""
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
        
        # User lookup map for rich UI rendering
        user_ids = [l.user_id for l in logs if l.user_id]
        users_map = {}
        if user_ids:
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            users_map = {u.id: getattr(u, "email", "System User") for u in users}


        stream = []
        for l in logs:
            user_label = users_map.get(l.user_id, "System / Automated Job")
            
            # Severity calculation based on action type
            action_lower = (l.action or "").lower()
            if any(k in action_lower for k in ["delete", "reject", "deactivate", "critical", "fail"]):
                severity = "HIGH"
            elif any(k in action_lower for k in ["create", "approve", "register", "predict", "update"]):
                severity = "MEDIUM"
            else:
                severity = "INFO"

            stream.append({
                "id": str(l.id),
                "timestamp": l.created_at.isoformat() if l.created_at else datetime.utcnow().isoformat(),
                "user": user_label,
                "action": l.action or "System Action",
                "details": l.details or "",
                "severity": severity,
                "hospital": "St. Jude Memorial Center",
                "department": "Cardiology CDSS",
                "status": "Completed"
            })

        return stream
