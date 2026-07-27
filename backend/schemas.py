from datetime import datetime, date
import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# Auth schemas
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    role: str = Field(
        default="doctor", description="Role: admin, doctor, auditor, governance"
    )
    full_name: Optional[str] = Field(None, description="Full display name")
    phone: Optional[str] = Field(None, description="Contact phone number")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: Optional[str] = None
    role: str
    is_active: bool
    is_first_login: bool = False
    must_change_password: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


# --------------------------------------------------
# Profile Schemas
# --------------------------------------------------


class ProfileCompletion(BaseModel):
    completed: int
    total: int
    percentage: int


class NotificationPreferenceResponse(BaseModel):
    pref_prediction: bool = True
    pref_high_risk: bool = True
    pref_new_patient: bool = True
    pref_critical: bool = True
    pref_report: bool = True
    pref_email: bool = True
    pref_browser: bool = True
    pref_system: bool = False
    pref_sms: bool = False
    browser_permission: str = "default"

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    pref_prediction: Optional[bool] = None
    pref_high_risk: Optional[bool] = None
    pref_new_patient: Optional[bool] = None
    pref_critical: Optional[bool] = None
    pref_report: Optional[bool] = None
    pref_email: Optional[bool] = None
    pref_browser: Optional[bool] = None
    pref_system: Optional[bool] = None
    pref_sms: Optional[bool] = None
    browser_permission: Optional[str] = None


class ActivityResponse(BaseModel):
    id: uuid.UUID
    activity_type: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class SecurityStatusResponse(BaseModel):
    last_login: Optional[datetime] = None
    last_password_changed_at: Optional[datetime] = None
    account_status: str
    total_activity_count: int


class ProfileResponse(BaseModel):
    # User identity
    user_id: uuid.UUID
    email: str
    role: str
    # Doctor profile
    doctor_profile_id: Optional[uuid.UUID] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    experience: Optional[str] = None
    qualification: Optional[str] = None
    emergency_contact: Optional[str] = None
    office_extension: Optional[str] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    # Admin-managed / read-only
    license_number: Optional[str] = None
    specialty: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    hospital: Optional[str] = None
    medical_council: Optional[str] = None
    license_expiry: Optional[date] = None
    last_password_changed_at: Optional[datetime] = None
    # Computed
    completion: ProfileCompletion
    # Nested
    notifications: NotificationPreferenceResponse
    security: SecurityStatusResponse

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    """Fields the doctor themselves can edit."""

    full_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    experience: Optional[str] = Field(None, max_length=50)
    qualification: Optional[str] = Field(None, max_length=200)
    emergency_contact: Optional[str] = Field(None, max_length=100)
    office_extension: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=500)


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class PhotoUploadResponse(BaseModel):
    photo_url: str
    message: str


# Staff registration requests schemas
class PendingRegistrationCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    role: str = Field(
        ...,
        description="Nurse, Lab Tech, ECG Tech, Radiology Tech, Medical Researcher, Pharmacist, Physiotherapist, Dietitian",
    )
    license_number: str
    specialty: str
    department: str


class PendingRegistrationResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    license_number: str
    specialty: str
    department: str
    status: str
    info_request_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PendingRequestAction(BaseModel):
    action: str = Field(..., description="approve, reject, request-info")
    notes: Optional[str] = None


# Prediction schemas
class PredictionRequest(BaseModel):
    age: float = Field(..., ge=18, le=120, description="Age in years (18-120)")
    gender: int = Field(..., ge=0, le=1, description="0: Female, 1: Male")
    bmi: Optional[float] = Field(
        None, ge=10, le=70, description="Body Mass Index (10-70)"
    )
    systolic_bp: Optional[float] = Field(
        None, ge=60, le=260, description="Systolic BP (60-260 mmHg)"
    )
    diastolic_bp: Optional[float] = Field(
        None, ge=30, le=180, description="Diastolic BP (30-180 mmHg)"
    )
    glucose: Optional[float] = Field(
        None, ge=20, le=800, description="Glucose (20-800 mg/dL)"
    )
    heart_rate: Optional[float] = Field(
        None, ge=25, le=220, description="Heart rate (25-220 bpm)"
    )
    cholesterol: Optional[float] = Field(
        None, ge=50, le=800, description="Cholesterol (50-800 mg/dL)"
    )
    admission_frequency: int = Field(default=1, ge=0)
    medication_count: int = Field(default=0, ge=0)
    hypertension: int = Field(default=0, ge=0, le=1)
    diabetes: int = Field(default=0, ge=0, le=1)
    previous_cardiac: int = Field(default=0, ge=0, le=1)
    smoking: int = Field(default=0, ge=0, le=1)
    statin_history: int = Field(default=0, ge=0, le=1)
    beta_blocker_history: int = Field(default=0, ge=0, le=1)
    ace_arb_history: int = Field(default=0, ge=0, le=1)
    aspirin_history: int = Field(default=0, ge=0, le=1)


class RecommendationItem(BaseModel):
    category: str
    recommendation_text: str
    clinical_justification: Optional[str] = None


class TopContributorItem(BaseModel):
    feature: str
    actual_value: str
    direction: str  # "positive" or "negative"
    impact: str
    importance_level: str  # "Very High Impact", "High Impact", "Medium Impact", "Low Impact", "Protective"
    detail: Optional[str] = None
    value: float


class NormalRangeItem(BaseModel):
    parameter: str
    actual_value: str
    normal_range: str
    status: str


class StructuredInterpretation(BaseModel):
    overall_assessment: str
    major_risk_factors: List[str]
    protective_factors: List[str]
    clinical_concern_level: str
    suggested_follow_up: str


class PredictionTrendInfo(BaseModel):
    previous_risk: Optional[float] = None
    current_risk: float
    difference: Optional[float] = None
    trend: str  # "Improving", "Stable", "Worsening", or "Baseline Evaluation"


class PatientSummaryInfo(BaseModel):
    age: float
    gender_str: str
    bmi_str: str
    bp_str: str
    heart_rate_str: str
    glucose_str: str
    cholesterol_str: str
    risk_factors: List[str]
    medications: List[str]


class ModelMetadataDetails(BaseModel):
    model_name: str
    algorithm: str
    model_version: str
    training_dataset: str
    calibration_method: str
    inference_time_ms: float
    validation_roc_auc: float
    cross_validation_score: float
    prediction_id: str
    prediction_timestamp: str


class PredictionResponse(BaseModel):
    prediction_uuid: str
    patient_uuid: Optional[str] = None
    raw_probability: float
    calibrated_probability: float
    risk_level: str
    prediction_reliability: float
    prediction_reliability_status: str
    confidence_score: float
    confidence_status: str
    clinical_interpretation: str
    structured_interpretation: StructuredInterpretation
    normal_range_analysis: List[NormalRangeItem]
    prediction_trend: PredictionTrendInfo
    recommendations: List[RecommendationItem]
    top_positive_contributors: List[TopContributorItem]
    top_negative_contributors: List[TopContributorItem]
    patient_summary: PatientSummaryInfo
    model_details: ModelMetadataDetails
    execution_latency_ms: float


# Governance schemas
class ModelArtifactResponse(BaseModel):
    id: uuid.UUID
    model_uuid: str
    version: str
    run_id: str
    git_commit: Optional[str] = None
    docker_version: Optional[str] = None
    performance_metrics_json: Dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModelApprovalRequest(BaseModel):
    comment: Optional[str] = None


class ModelApprovalResponse(BaseModel):
    id: uuid.UUID
    model_artifact_id: uuid.UUID
    step: str
    approved_by_id: uuid.UUID
    status: str
    comment: Optional[str] = None
    signature_timestamp: datetime

    class Config:
        from_attributes = True


# Auditing schemas
class PredictionAuditResponse(BaseModel):
    id: uuid.UUID
    audit_uuid: str
    clinician_id: uuid.UUID
    patient_uuid: str
    model_version: str
    inputs_json: Dict[str, Any]
    predicted_risk: float
    risk_level: str
    timestamp: datetime

    class Config:
        from_attributes = True


class InferenceLogResponse(BaseModel):
    id: uuid.UUID
    prediction_audit_id: uuid.UUID
    execution_latency_ms: float
    memory_usage_mb: float
    cpu_load_pct: float
    warning_flags: Optional[str] = None
    data_drift_score: Optional[float] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# Patient schemas
class PatientCreate(BaseModel):
    name: Optional[str] = Field(None, description="Patient full name")
    careunit: Optional[str] = Field("ICU Bed", description="Bed/Ward option: Normal Bed, ICU Bed, or CCU Bed")
    assigned_doctor_id: Optional[str] = Field(None, description="UUID of assigned attending doctor")
    age: int = Field(..., ge=0, le=120)
    gender: int = Field(..., ge=0, le=1, description="0: Female, 1: Male")
    bmi: Optional[float] = Field(None, ge=10, le=80)
    systolic_bp: Optional[float] = Field(None, ge=50, le=250)
    diastolic_bp: Optional[float] = Field(None, ge=30, le=150)
    heart_rate: Optional[float] = Field(None, ge=30, le=220)
    glucose: Optional[float] = Field(None, ge=20, le=1000)
    cholesterol: Optional[float] = Field(None, ge=50, le=600)
    medication_count: int = Field(default=0, ge=0)
    statin_history: int = Field(default=0, ge=0, le=1)
    beta_blocker_history: int = Field(default=0, ge=0, le=1)
    ace_arb_history: int = Field(default=0, ge=0, le=1)
    aspirin_history: int = Field(default=0, ge=0, le=1)
    hypertension: int = Field(default=0, ge=0, le=1)
    diabetes: int = Field(default=0, ge=0, le=1)
    smoking: int = Field(default=0, ge=0, le=1)
    previous_cardiac: int = Field(default=0, ge=0, le=1)


class PatientUpdate(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[int] = Field(None, ge=0, le=1)


class VitalsUpdate(BaseModel):
    systolic_bp: Optional[float] = Field(None, ge=50, le=250)
    diastolic_bp: Optional[float] = Field(None, ge=30, le=150)
    heart_rate: Optional[float] = Field(None, ge=30, le=220)
    bmi: Optional[float] = Field(None, ge=10, le=80)


class LabUpload(BaseModel):
    lab_name: str
    result_value: float
    unit: str
    comments: Optional[str] = None


class EcgUpload(BaseModel):
    heart_rate: float
    pr_interval_ms: Optional[float] = None
    qrs_duration_ms: Optional[float] = None
    qt_interval_ms: Optional[float] = None
    interpretation: str


class RadiologyUpload(BaseModel):
    modality: str
    exam_name: str
    findings: str
    impression: str


# Report schemas
class ReportCreate(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=255, description="Human-readable report name"
    )
    report_type: str = Field(
        ...,
        description="e.g. Clinical Chart, Prediction Report, Audit & Governance, Cohort Analysis",
    )
    category: str = Field(..., description="patient | prediction | clinical | audit")
    patient_id: Optional[uuid.UUID] = Field(
        None, description="Optional: linked patient"
    )
    admission_id: Optional[uuid.UUID] = Field(
        None, description="Optional: linked admission"
    )
    prediction_id: Optional[uuid.UUID] = Field(
        None, description="Optional: linked prediction"
    )
    report_data: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Arbitrary report payload JSON"
    )


class ReportResponse(BaseModel):
    id: uuid.UUID
    name: str
    report_type: str
    category: str
    status: str
    pinned: bool
    patient_id: Optional[uuid.UUID] = None
    admission_id: Optional[uuid.UUID] = None
    prediction_id: Optional[uuid.UUID] = None
    report_data: Dict[str, Any]
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
