"""
Enterprise System Database Seeder for AI-CHD-CDSS.
Seeds only essential system roles, base hospital workspaces, and admin user accounts.
NO mock patients, NO mock admissions, and NO mock predictions are seeded into the database.
All patient clinical records must originate strictly from user activity in the portal.
"""

import os
import sys
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging

# Ensure root path is configured
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database.session import SessionLocal, engine
from backend.database.models import (
    Base,
    User,
    DoctorProfile,
    Role,
    Hospital,
    Department,
    ModelRegistry,
    AuditLog,
    ActivityLog,
)
from backend.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DBSeeder")


def seed_database(reset_db: bool = False):
    logger.info("Initializing database session...")
    if reset_db:
        logger.info("Recreating database tables to apply latest schema updates...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        from sqlalchemy import text
        # Auto-migrate missing columns for existing PostgreSQL tables on Render
        try:
            # Hospitals columns auto-migration
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS code VARCHAR(50);"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS state VARCHAR(100);"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS country VARCHAR(100);"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 100;"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS icu_beds INTEGER DEFAULT 20;"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS ccu_beds INTEGER DEFAULT 20;"))
            db.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(100);"))
            
            # Patients columns auto-migration
            db.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS assigned_doctor_id VARCHAR(36);"))

            # Users columns auto-migration (Render schema sync)
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(30);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id UUID;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS temporary_password VARCHAR(255);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout TIMESTAMP;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS browser VARCHAR(100);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions_json TEXT;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))

            # Doctor profiles columns auto-migration
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS experience VARCHAR(50);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS qualification VARCHAR(200);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS office_extension VARCHAR(20);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS bio TEXT;"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS designation VARCHAR(100);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS hospital VARCHAR(200);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS medical_council VARCHAR(150);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS license_expiry DATE;"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS sub_specialization VARCHAR(100);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 5;"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Full Time';"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'Available';"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS languages VARCHAR(255);"))
            db.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS certificates TEXT;"))

            db.commit()
        except Exception as e:
            logger.warning(f"Auto-column migration warning: {e}")
            db.rollback()
        # 1. Seed Roles
        roles_to_seed = [
            "admin",
            "super_admin",
            "doctor",
            "nurse",
            "lab tech",
            "ecg tech",
            "radiology tech",
            "medical researcher",
            "pharmacist",
            "physiotherapist",
            "dietitian",
            "auditor",
            "governance",
        ]
        for role_name in roles_to_seed:
            existing_role = db.query(Role).filter_by(name=role_name).first()
            if not existing_role:
                role = Role(name=role_name, description=f"{role_name.capitalize()} role")
                db.add(role)
        db.commit()

        # 2. Seed Base Hospitals
        hospitals_data = [
            {
                "name": "St. Jude Memorial Hospital",
                "code": "SJH-01",
                "city": "Boston",
                "state": "MA",
                "country": "United States",
                "status": "Active",
                "total_beds": 450,
                "icu_beds": 60,
                "hospital_type": "Multi-Specialty",
            },
            {
                "name": "Apollo Hospitals & Heart Center",
                "code": "APOLLO-02",
                "city": "New York",
                "state": "NY",
                "country": "United States",
                "status": "Active",
                "total_beds": 600,
                "icu_beds": 85,
                "hospital_type": "Super-Specialty Cardiac Center",
            },
            {
                "name": "RAM Medical Institute",
                "code": "RAM-03",
                "city": "Chicago",
                "state": "IL",
                "country": "United States",
                "status": "Active",
                "total_beds": 380,
                "icu_beds": 45,
                "hospital_type": "Academic & Research Hospital",
            },
            {
                "name": "ABC Super-Specialty Hospital",
                "code": "ABC-04",
                "city": "San Francisco",
                "state": "CA",
                "country": "United States",
                "status": "Active",
                "total_beds": 500,
                "icu_beds": 70,
                "hospital_type": "Tertiary Care Hospital",
            },
        ]
        seeded_hospitals = []
        for h_info in hospitals_data:
            existing_h = db.query(Hospital).filter(
                (Hospital.name == h_info["name"]) | (Hospital.code == h_info["code"])
            ).first()
            if not existing_h:
                h = Hospital(**h_info)
                db.add(h)
                db.commit()
                db.refresh(h)
                seeded_hospitals.append(h)
            else:
                existing_h.is_deleted = False
                db.commit()
                seeded_hospitals.append(existing_h)

        # 3. Seed Departments
        depts_data = [
            {"name": "Cardiology & CCU", "code": "CARD-01", "head_clinician": "Dr. Alexander Vance, MD", "status": "Active"},
            {"name": "Intensive Care Unit (ICU)", "code": "ICU-02", "head_clinician": "Dr. Sarah Jenkins, MD", "status": "Active"},
            {"name": "Emergency Medicine (ER)", "code": "EM-03", "head_clinician": "Dr. Marcus Thorne, MD", "status": "Active"},
            {"name": "Outpatient Cardiology (OPD)", "code": "OPD-04", "head_clinician": "Dr. Elena Rostova, MD", "status": "Active"},
            {"name": "Cardiovascular Surgery", "code": "CVS-05", "head_clinician": "Dr. David Chang, MD", "status": "Active"},
        ]
        seeded_departments = []
        for idx, d_info in enumerate(depts_data):
            existing_d = db.query(Department).filter_by(code=d_info["code"]).first()
            if not existing_d:
                d_info["hospital_id"] = seeded_hospitals[idx % len(seeded_hospitals)].id
                d = Department(**d_info)
                db.add(d)
                db.commit()
                db.refresh(d)
                seeded_departments.append(d)
            else:
                seeded_departments.append(existing_d)

        # 4. Seed Essential User Accounts
        pwd_hash = get_password_hash("password123")
        user_roles_emails = {
            "admin": "admin@hospital.org",
            "super_admin": "superadmin@hospital.org",
            "doctor": "doctor@hospital.org",
            "nurse": "nurse@hospital.org",
            "lab tech": "labtech@hospital.org",
            "medical researcher": "researcher@hospital.org",
        }

        seeded_users = {}
        for role_name, email in user_roles_emails.items():
            user = db.query(User).filter_by(email=email).first()
            if not user:
                user = User(
                    email=email, password_hash=pwd_hash, role=role_name, is_active=True,
                    hospital_id=seeded_hospitals[0].id if seeded_hospitals else None,
                    department_id=seeded_departments[0].id if seeded_departments else None
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            seeded_users[role_name] = user

            if role_name == "doctor":
                existing_profile = db.query(DoctorProfile).filter_by(user_id=user.id).first()
                if not existing_profile:
                    profile = DoctorProfile(
                        user_id=user.id,
                        full_name="Dr. Alexander Vance",
                        license_number="MD-99887766",
                        specialty="Cardiology",
                        department="Coronary Care Unit (CCU)",
                    )
                    db.add(profile)
                    db.commit()

        # 5. Seed Model Registry
        existing_model = db.query(ModelRegistry).filter_by(model_version="v1.0.0").first()
        if not existing_model:
            model = ModelRegistry(
                model_name="CatBoost-CHD-Classifier",
                model_version="v1.0.0",
                run_id="run_cb_prod_9921",
                val_auc=0.763,
                cv_auc=0.758,
                status="Production",
                comments="Production calibrated CatBoost model with Isotonic scaling.",
            )
            db.add(model)
            db.commit()

        logger.info("Successfully initialized system structure (roles, hospitals, departments, accounts). NO mock patients seeded.")

    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database(reset_db=False)
