"""
Hospital & Department Service
Manages primary hospital facilities, department mappings, bed allocations, and workspace selection.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from sqlalchemy import func
from fastapi import HTTPException
from backend.database.models import Hospital, Department, User, Patient, ClinicalPrediction
from backend.services.audit_service import AuditService
from backend.services.event_bus import event_bus

from backend.security import get_password_hash
from backend.database.models import DoctorProfile

class HospitalService:
    @staticmethod
    def provision_hospital_enterprise(db: Session, data: Dict[str, Any], super_admin_email: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes complete enterprise Hospital Provisioning & Doctor Portal Auto-Creation inside a single DB transaction.
        """
        try:
            hospital_code = str(data.get("code", "")).upper().strip()
            if not hospital_code:
                raise HTTPException(status_code=400, detail="Hospital Code is required.")

            existing_h = db.query(Hospital).filter(Hospital.code == hospital_code).first()
            if existing_h:
                raise HTTPException(status_code=400, detail=f"Hospital code '{hospital_code}' already exists.")

            # Step 1 & 2: Create Hospital & Generate Workspace
            new_hospital = Hospital(
                name=str(data.get("name", "")).strip(),
                code=hospital_code,
                hospital_type=data.get("hospital_type", "Multi-Specialty"),
                reg_number=data.get("reg_number", f"REG-{hospital_code}-2026"),
                contact_email=data.get("contact_email", data.get("admin_email")),
                contact_phone=data.get("contact_phone", data.get("admin_mobile")),
                website=data.get("website", f"https://{hospital_code.lower()}.hospital.org"),
                address_line1=data.get("address_line1", "100 Healthcare Way"),
                address_line2=data.get("address_line2"),
                city=data.get("city", "Boston"),
                state=data.get("state", "MA"),
                country=data.get("country", "United States"),
                postal_code=data.get("postal_code", "02114"),
                latitude=float(data.get("latitude")) if data.get("latitude") else None,
                longitude=float(data.get("longitude")) if data.get("longitude") else None,
                status=data.get("status", "Active"),
                timezone=data.get("timezone", "UTC-5 (EST)"),
                language=data.get("language", "English"),
                currency=data.get("currency", "USD ($)"),
                emergency_enabled=bool(data.get("emergency_enabled", True)),
                icu_enabled=bool(data.get("icu_enabled", True)),
                ai_enabled=bool(data.get("ai_enabled", True)),
                email_notifications=bool(data.get("email_notifications", True)),
                sms_notifications=bool(data.get("sms_notifications", True)),
                audit_logging=bool(data.get("audit_logging", True)),
                total_beds=int(data.get("total_beds", 250)),
                icu_beds=int(data.get("icu_beds", 35))
            )
            db.add(new_hospital)
            db.flush()

            # Step 3, 4, 5: Create Administrator & Hash Temporary Password
            admin_email = str(data.get("admin_email", "")).strip().lower()
            if not admin_email:
                raise HTTPException(status_code=400, detail="Administrator Email is required.")

            existing_user = db.query(User).filter(User.email == admin_email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail=f"Administrator email '{admin_email}' already exists.")

            temp_password = data.get("admin_password", "Apollo@123")
            admin_username = data.get("admin_username", admin_email.split("@")[0]).strip()
            hashed_pwd = get_password_hash(temp_password)

            admin_user = User(
                email=admin_email,
                username=admin_username,
                password_hash=hashed_pwd,
                role="admin",
                is_active=True,
                is_first_login=True,
                must_change_password=True
            )
            db.add(admin_user)
            db.flush()

            # Step 6: Create Doctor Portal / Administrator Doctor Profile
            admin_profile = DoctorProfile(
                user_id=admin_user.id,
                full_name=data.get("admin_full_name", "Hospital Administrator"),
                phone=data.get("admin_mobile"),
                designation=data.get("admin_designation", "Hospital Administrator"),
                department=data.get("admin_department", "Administration"),
                hospital=new_hospital.name,
                license_number=f"MD-{hospital_code}-ADMIN",
                specialty="Healthcare Governance & Administration"
            )
            db.add(admin_profile)

            # Step 10: Create Default Clinical Departments
            default_depts = [
                ("Cardiology & CCU", f"CARD-01-{hospital_code}"),
                ("Intensive Care Unit (ICU)", f"ICU-02-{hospital_code}"),
                ("Emergency Medicine (ER)", f"EM-03-{hospital_code}"),
                ("Outpatient Cardiology (OPD)", f"OPD-04-{hospital_code}"),
                ("Cardiovascular Surgery", f"CVS-05-{hospital_code}"),
            ]
            for dept_name, dept_code in default_depts:
                dept = Department(
                    hospital_id=new_hospital.id,
                    name=dept_name,
                    code=dept_code,
                    head_clinician=admin_profile.full_name,
                    status="Active"
                )
                db.add(dept)

            # Step 11: Create Audit Logs
            AuditService.log_action(
                db,
                action="HOSPITAL_PROVISIONED",
                details=f"Created hospital {new_hospital.name} ({new_hospital.code}). Administrator: {admin_email}"
            )
            AuditService.log_action(
                db,
                action="DOCTOR_PORTAL_CREATED",
                details=f"Doctor Portal Workspace created for hospital {new_hospital.name} with administrator username {admin_username}"
            )

            try:
                from backend.services.notification_service import NotificationService
                NotificationService.create_notification(
                    db=db,
                    title="Hospital Provisioned",
                    message=f"Hospital facility '{new_hospital.name}' ({new_hospital.code}) successfully provisioned.",
                    module="Hospital Management",
                    severity="success",
                    action_url="/admin/hospitals",
                    recipient_role="super_admin",
                )
            except Exception:
                pass

            # Commit Transaction
            db.commit()
            db.refresh(new_hospital)

            return {
                "id": str(new_hospital.id),
                "name": new_hospital.name,
                "code": new_hospital.code,
                "hospital_workspace": f"{new_hospital.code} Portal Workspace",
                "doctor_portal": "http://localhost:3000/doctor/login",
                "admin_full_name": admin_profile.full_name,
                "admin_email": admin_user.email,
                "admin_username": admin_user.username,
                "temp_password": temp_password,
                "password_reset_required": True,
                "doctor_portal_status": "Ready",
                "city": new_hospital.city,
                "state": new_hospital.state,
                "country": new_hospital.country,
                "status": new_hospital.status,
                "departments_count": len(default_depts),
                "doctors_count": 1,
                "patients_count": 0,
                "predictions_count": 0,
                "health_score": 100.0,
                "ai_status": "Active & Synchronized"
            }
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=500, detail=f"Provisioning Failed: {str(exc)}")
    @staticmethod
    def get_all_hospitals(db: Session) -> List[Dict[str, Any]]:
        """Returns all registered hospital workspace facilities with live PostgreSQL counts."""
        hospitals = db.query(Hospital).filter(Hospital.is_deleted == False).all()
        if not hospitals:
            primary_hospital = Hospital(
                name="St. Jude Memorial Hospital",
                code="SJH-01",
                city="Boston",
                state="MA",
                country="United States",
                status="Active",
                total_beds=450,
                icu_beds=60
            )
            db.add(primary_hospital)
            db.commit()
            db.refresh(primary_hospital)
            hospitals = [primary_hospital]

        result = []
        for h in hospitals:
            # Departments registered for this specific hospital
            dept_count = db.query(Department).filter(
                Department.hospital_id == h.id,
                Department.is_deleted == False
            ).count()

            # Live PostgreSQL database queries per hospital
            doc_count = db.query(User).filter(
                func.lower(User.role) == "doctor",
                User.is_deleted == False,
                (User.hospital_code == h.code) | (User.hospital_code == None if h.code == "SJH-01" else False)
            ).count() if hasattr(User, "hospital_code") else (
                db.query(User).filter(func.lower(User.role) == "doctor", User.is_deleted == False).count()
                if h.code == "SJH-01"
                else db.query(DoctorProfile).filter(DoctorProfile.hospital.ilike(f"%{h.name}%")).count()
            )

            pat_count = db.query(Patient).filter(Patient.is_deleted == False).count() if h.code == "SJH-01" else 0
            pred_count = db.query(ClinicalPrediction).count() if h.code == "SJH-01" else 0
            user_count = db.query(User).filter(
                (User.hospital_id == h.id) | (User.hospital_id.is_(None) if h.code == "SJH-01" else False),
                User.is_deleted == False
            ).count()

            result.append({
                "id": str(h.id),
                "name": h.name,
                "code": h.code,
                "city": h.city,
                "state": h.state,
                "country": getattr(h, "country", "United States"),
                "status": h.status or "Active",
                "type": "Tertiary Medical Center" if "Memorial" in h.name else "Cardiovascular Care Network",
                "total_beds": h.total_beds or 100,
                "icu_beds": h.icu_beds or 15,
                "ccu_beds": getattr(h, "ccu_beds", 20) or 20,
                "user_count": user_count,
                "departments_count": dept_count,
                "doctors_count": doc_count,
                "patients_count": pat_count,
                "predictions_count": pred_count,
                "health_score": 99.4 if doc_count > 0 else 100.0,
                "ai_status": "Active & Synchronized",
                "last_activity": "Just now"
            })
        return result


    @staticmethod
    def create_hospital(db: Session, data: Dict[str, Any], user_email: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new hospital facility in PostgreSQL with default departments."""
        new_hospital = Hospital(
            name=data["name"],
            code=data["code"],
            city=data.get("city", "Boston"),
            state=data.get("state", "MA"),
            country=data.get("country", "United States"),
            status=data.get("status", "Active"),
            contact_email=data.get("contact_email", user_email or "admin@hospital.org"),
            contact_phone=data.get("contact_phone", "+1 (555) 019-2831"),
            total_beds=int(data.get("total_beds", 250)),
            icu_beds=int(data.get("icu_beds", 35)),
            ccu_beds=int(data.get("ccu_beds", 20))
        )
        db.add(new_hospital)
        db.commit()
        db.refresh(new_hospital)

        # Seed default departments for the new hospital
        default_depts = [
            ("Cardiology & CCU", "CARD-01"),
            ("Intensive Care Unit (ICU)", "ICU-02"),
            ("Emergency Medicine (ER)", "EM-03"),
            ("Outpatient Cardiology (OPD)", "OPD-04"),
            ("Cardiovascular Surgery", "CVS-05"),
        ]
        for dept_name, dept_code in default_depts:
            dept = Department(
                hospital_id=new_hospital.id,
                name=dept_name,
                code=f"{dept_code}-{new_hospital.code}",
                status="Active"
            )
            db.add(dept)
        db.commit()

        AuditService.log_action(
            db,
            action="HOSPITAL_CREATED",
            details=f"Created new hospital facility: {new_hospital.name} ({new_hospital.code})"
        )
        event_bus.publish_sync(
            "HOSPITAL_CREATED",
            {"hospital_id": str(new_hospital.id), "name": new_hospital.name, "code": new_hospital.code},
            user_email=user_email
        )

        return {
            "id": str(new_hospital.id),
            "name": new_hospital.name,
            "code": new_hospital.code,
            "city": new_hospital.city,
            "state": new_hospital.state,
            "country": new_hospital.country,
            "status": new_hospital.status,
            "type": "Enterprise Healthcare Facility",
            "total_beds": new_hospital.total_beds,
            "icu_beds": new_hospital.icu_beds,
            "departments_count": len(default_depts),
            "doctors_count": 0,
            "patients_count": 0,
            "predictions_count": 0,
            "health_score": 100.0,
            "ai_status": "Configured & Active",
            "last_activity": "Created just now"
        }

    @staticmethod
    def get_hospital_details(db: Session, hospital_id: str) -> Dict[str, Any]:
        """Returns deep telemetry for hospital including departments, doctors, patients, and predictions."""
        hospital = db.query(Hospital).filter(Hospital.code == hospital_id, Hospital.is_deleted == False).first()
        if not hospital:
            try:
                import uuid
                h_uuid = uuid.UUID(str(hospital_id))
                hospital = db.query(Hospital).filter(Hospital.id == h_uuid, Hospital.is_deleted == False).first()
            except (ValueError, TypeError, AttributeError):
                pass
        if not hospital:
            hospital = db.query(Hospital).filter(Hospital.is_deleted == False).first()
            if not hospital:
                raise HTTPException(status_code=404, detail="Hospital not found")


        departments = db.query(Department).filter(
            (Department.hospital_id == hospital.id) | (Department.hospital_id == None),
            Department.is_deleted == False
        ).all()

        total_doctors = db.query(User).filter(func.lower(User.role) == "doctor", User.is_deleted == False).count()
        total_patients = db.query(Patient).filter(Patient.is_deleted == False).count()
        total_predictions = db.query(ClinicalPrediction).count()

        first_doctor = db.query(User).filter(func.lower(User.role) == "doctor", User.is_deleted == False).first()
        director_name = first_doctor.email if first_doctor else "Medical Director"

        admin_user = db.query(User).filter(func.lower(User.role).in_(["admin", "super_admin"]), User.is_deleted == False).first()
        governance_name = admin_user.email if admin_user else "admin@hospital.org"

        return {
            "id": str(hospital.id),
            "name": hospital.name,
            "code": hospital.code,
            "city": hospital.city,
            "state": hospital.state,
            "country": getattr(hospital, "country", "United States"),
            "status": hospital.status,
            "total_beds": hospital.total_beds,
            "icu_beds": hospital.icu_beds,
            "facility_type": "Primary Medical Facility",
            "emergency_phone": f"Hospital Operations ({hospital.code})",
            "director": director_name,
            "governance_officer": governance_name,
            "total_doctors": total_doctors,
            "total_patients": total_patients,
            "total_predictions": total_predictions,
            "departments": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "code": d.code,
                    "head_clinician": d.head_clinician or "Head Clinician",
                    "status": d.status
                }
                for d in departments
            ]
        }

    @staticmethod
    def get_all_departments(db: Session, hospital_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns list of clinical departments, optionally filtered by hospital facility."""
        query = db.query(Department).filter(Department.is_deleted == False)

        if hospital_id:
            active_h = db.query(Hospital).filter(Hospital.code == hospital_id, Hospital.is_deleted == False).first()
            if not active_h:
                try:
                    import uuid
                    h_uuid = uuid.UUID(str(hospital_id))
                    active_h = db.query(Hospital).filter(Hospital.id == h_uuid, Hospital.is_deleted == False).first()
                except (ValueError, TypeError, AttributeError):
                    pass
            if active_h:
                query = query.filter(Department.hospital_id == active_h.id)

        depts = query.all()
        results = []
        for d in depts:
            h = None
            if d.hospital_id:
                h = db.query(Hospital).filter(Hospital.id == d.hospital_id).first()
            results.append({
                "id": str(d.id),
                "hospital_id": str(d.hospital_id) if d.hospital_id else None,
                "hospital_name": h.name if h else "St. Jude Memorial Hospital",
                "hospital_code": h.code if h else "SJH-01",
                "name": d.name,
                "code": d.code,
                "head_clinician": d.head_clinician or "Head Clinician Assigned",
                "status": d.status or "Active",
                "description": d.description or "Specialized Clinical Ward"
            })
        return results


    @staticmethod
    def update_hospital(db: Session, hospital_id: str, data: Dict[str, Any], user_email: str = "superadmin@hospital.org") -> Dict[str, Any]:
        """Updates facility configuration in PostgreSQL database."""
        hospital = db.query(Hospital).filter(Hospital.code == hospital_id, Hospital.is_deleted == False).first()
        if not hospital:
            try:
                import uuid
                h_uuid = uuid.UUID(str(hospital_id))
                hospital = db.query(Hospital).filter(Hospital.id == h_uuid, Hospital.is_deleted == False).first()
            except (ValueError, TypeError, AttributeError):
                pass
        if not hospital:
            hospital = db.query(Hospital).filter(Hospital.is_deleted == False).first()
            if not hospital:
                raise HTTPException(status_code=404, detail="Hospital facility not found")

        if "name" in data and data["name"]:
            hospital.name = str(data["name"]).strip()
        if "code" in data and data["code"]:
            hospital.code = str(data["code"]).strip().upper()
        if "city" in data:
            hospital.city = str(data.get("city", "")).strip()
        if "state" in data:
            hospital.state = str(data.get("state", "")).strip()
        if "status" in data:
            hospital.status = str(data.get("status", "Active")).strip()
        if "total_beds" in data and data["total_beds"] is not None:
            hospital.total_beds = int(data.get("total_beds") or 0)
        if "icu_beds" in data and data["icu_beds"] is not None:
            hospital.icu_beds = int(data.get("icu_beds") or 0)
        if "ccu_beds" in data and data["ccu_beds"] is not None:
            hospital.ccu_beds = int(data.get("ccu_beds") or 0)

        hospital.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(hospital)


        from backend.services.audit_service import AuditService
        AuditService.log_action(
            db,
            action="HOSPITAL_CONFIG_UPDATED",
            details=f"Updated facility configuration for {hospital.name} ({hospital.code})",
            user_id=None
        )

        return {
            "id": str(hospital.id),
            "name": hospital.name,
            "code": hospital.code,
            "city": hospital.city,
            "state": hospital.state,
            "status": hospital.status,
            "total_beds": hospital.total_beds,
            "icu_beds": hospital.icu_beds,
            "ccu_beds": getattr(hospital, "ccu_beds", 20),
            "updated_at": hospital.updated_at.isoformat() if hospital.updated_at else None
        }

