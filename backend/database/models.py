from datetime import datetime, date
import uuid
from typing import List, Optional
from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
    JSON,
    Table,
    Column,
    Index,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# Soft Delete & Auditing Mixin
class AuditableMixin:
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class User(Base, AuditableMixin):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hospital_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("hospitals.id"), nullable=True
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("departments.id"), nullable=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    role: Mapped[str] = mapped_column(
        String(50), default="doctor", nullable=False
    )  # admin, doctor, auditor, governance, nurse, etc.
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_first_login: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    temporary_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_logout: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    account_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    permissions_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    notifications = relationship(
        "Notification", back_populates="user", foreign_keys="Notification.user_id"
    )
    notification_preference = relationship(
        "NotificationPreference", back_populates="user", uselist=False
    )



class DoctorProfile(Base, AuditableMixin):
    __tablename__ = "doctor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False
    )
    license_number: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    specialty: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)

    # Doctor-editable fields
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    experience: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    qualification: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    office_extension: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # System-managed field (updated on password change)
    last_password_changed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    # Super Admin managed fields (read-only in Settings)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hospital: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    medical_council: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    license_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sub_specialization: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, default=5, nullable=True)
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), default="Full Time", nullable=True)
    availability_status: Mapped[Optional[str]] = mapped_column(String(50), default="Available", nullable=True)
    languages: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    certificates: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor")


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, default="hash"
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="doctor")
    requested_role: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default="doctor"
    )
    license_number: Mapped[str] = mapped_column(
        String(100), nullable=False, default="MD-Pending"
    )
    specialty: Mapped[str] = mapped_column(
        String(100), nullable=False, default="General Medicine"
    )
    specialization: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default="General Medicine"
    )
    hospital_affiliation: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    department: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Cardiology"
    )
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)
    info_request_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class Patient(Base, AuditableMixin):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    hospital_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("hospitals.id"), nullable=True, index=True
    )
    assigned_doctor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True, index=True
    )
    patient_uuid: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )  # Anonymized key
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gender: Mapped[int] = mapped_column(Integer, nullable=False)  # 0: Female, 1: Male
    anchor_age: Mapped[int] = mapped_column(Integer, nullable=False)

    hospital = relationship("Hospital", foreign_keys=[hospital_id])
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id])
    admissions = relationship("Admission", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")


class Admission(Base, AuditableMixin):
    __tablename__ = "admissions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False
    )
    hadm_id: Mapped[int] = mapped_column(
        Integer, unique=True, index=True, nullable=False
    )
    admittime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    dischtime: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    careunit: Mapped[Optional[str]] = mapped_column(String(100), default="ICU Bed", nullable=True)

    patient = relationship("Patient", back_populates="admissions")
    diagnoses = relationship("Diagnosis", back_populates="admission")
    labs = relationship("LabResult", back_populates="admission")

    bmi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    systolic_bp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    diastolic_bp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    heart_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cholesterol: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    glucose: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    smoking: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    statin_history: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )
    beta_blocker_history: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )
    ace_arb_history: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )
    aspirin_history: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )
    medication_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )

    __table_args__ = (Index("idx_admission_subject", "patient_id", "admittime"),)


class Diagnosis(Base, AuditableMixin):
    __tablename__ = "diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    admission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admissions.id"), nullable=False
    )
    icd_code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    icd_version: Mapped[int] = mapped_column(Integer, nullable=False)
    long_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    admission = relationship("Admission", back_populates="diagnoses")


class LabResult(Base, AuditableMixin):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    admission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admissions.id"), nullable=False
    )
    itemid: Mapped[int] = mapped_column(Integer, nullable=False)
    charttime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valuenum: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valueuom: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    admission = relationship("Admission", back_populates="labs")


class FeatureStore(Base):
    __tablename__ = "feature_store"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    feature_name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    feature_owner: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    validation_status: Mapped[str] = mapped_column(
        String(50), default="Pending", nullable=False
    )
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    transformation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class ETLRun(Base):
    __tablename__ = "etl_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    version_str: Mapped[str] = mapped_column(String(50), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    feature_count: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    input_metadata: Mapped[dict] = mapped_column(JSON, nullable=False)
    validation_report: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)


class DataVersion(Base):
    __tablename__ = "data_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    version_str: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    parquet_path: Mapped[str] = mapped_column(String(512), nullable=False)
    csv_path: Mapped[str] = mapped_column(String(512), nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    mlflow_run_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class ClinicalPrediction(Base):
    __tablename__ = "clinical_predictions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    audit_uuid: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    clinician_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    patient_uuid: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )  # PHI Separation
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    inputs_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    predicted_risk: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_interval_low: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_interval_high: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # Low, Medium, High, Very High
    request_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    request_user_agent: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    recommendations = relationship(
        "Recommendation", back_populates="clinical_prediction"
    )
    inference_log = relationship(
        "InferenceLog", back_populates="clinical_prediction", uselist=False
    )


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    prediction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("clinical_predictions.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    model_uuid: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )
    model_name: Mapped[str] = mapped_column(
        String(100), nullable=False, default="CatBoost-CHD-Classifier"
    )
    model_version: Mapped[str] = mapped_column(
        String(50), nullable=False, default="v1.0.0"
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0.0")
    run_id: Mapped[str] = mapped_column(
        String(100), nullable=False, default="run_cb_prod_9921"
    )
    git_commit: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    docker_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    val_auc: Mapped[float] = mapped_column(Float, nullable=False, default=0.763)
    cv_auc: Mapped[float] = mapped_column(Float, nullable=False, default=0.758)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performance_metrics_json: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    status: Mapped[str] = mapped_column(
        String(50), default="Production", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    approvals = relationship("ApprovalWorkflow", back_populates="model_registry")


class InferenceLog(Base):
    __tablename__ = "inference_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    prediction_audit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("clinical_predictions.id"), unique=True, nullable=False
    )
    execution_latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    memory_usage_mb: Mapped[float] = mapped_column(Float, nullable=False)
    cpu_load_pct: Mapped[float] = mapped_column(Float, nullable=False)
    warning_flags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    data_drift_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    clinical_prediction = relationship(
        "ClinicalPrediction", back_populates="inference_log"
    )


class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    model_artifact_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("model_registry.id"), nullable=False
    )
    step: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Data Scientist, Clinical Reviewer, Governance Board
    approved_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50), default="Pending", nullable=False
    )  # Pending, Approved, Rejected
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    model_registry = relationship("ModelRegistry", back_populates="approvals")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    recipient_role: Mapped[Optional[str]] = mapped_column(String(50), default="super_admin", nullable=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    module: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    action_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])

    @property
    def sender_email(self) -> Optional[str]:
        return self.sender.email if self.sender else None


class Appointment(Base, AuditableMixin):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("doctor_profiles.id"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False
    )
    appointment_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="Scheduled", nullable=False
    )  # Scheduled, Completed, Cancelled
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    doctor = relationship("DoctorProfile", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")


class PatientAssignment(Base):
    __tablename__ = "patient_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user = relationship("User")
    patient = relationship("Patient")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    prediction_audit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("clinical_predictions.id"), nullable=False
    )
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Lifestyle, Medication, Follow-up
    clinical_justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    clinical_prediction = relationship(
        "ClinicalPrediction", back_populates="recommendations"
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Untitled Report"
    )
    patient_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=True
    )
    admission_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("admissions.id"), nullable=True
    )
    prediction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("clinical_predictions.id"), nullable=True
    )
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="clinical"
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Ready")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    report_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    setting_key: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    setting_value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    activity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False
    )

    # Alert trigger events
    pref_prediction: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pref_high_risk: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pref_new_patient: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    pref_critical: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pref_report: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Delivery channels
    pref_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pref_browser: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pref_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pref_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    browser_permission: Mapped[str] = mapped_column(
        String(20), default="default", nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="notification_preference")


class Hospital(Base, AuditableMixin):
    __tablename__ = "hospitals"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(
        String(100), default="United States", nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    total_beds: Mapped[int] = mapped_column(Integer, default=250, nullable=False)
    icu_beds: Mapped[int] = mapped_column(Integer, default=35, nullable=False)
    ccu_beds: Mapped[int] = mapped_column(Integer, default=20, nullable=False)

    # Enterprise Provisioning Attributes
    hospital_type: Mapped[Optional[str]] = mapped_column(String(100), default="Multi-Specialty", nullable=True)
    reg_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line1: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), default="UTC-5 (EST)", nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), default="English", nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), default="USD ($)", nullable=True)
    emergency_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    icu_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sms_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    audit_logging: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Department(Base, AuditableMixin):
    __tablename__ = "departments"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    hospital_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("hospitals.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    head_clinician: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)



