"""
Profile Management Router
Handles all /api/v1/profile/* endpoints for the Doctor Portal Settings page.
All endpoints require JWT authentication via get_current_user dependency.
"""

import os
import uuid
import shutil
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.database.models import (
    User,
    DoctorProfile,
    ActivityLog,
    AuditLog,
    NotificationPreference,
)
from backend.auth import get_current_user
from backend.security import verify_password, get_password_hash
from backend.schemas import (
    ProfileResponse,
    ProfileUpdate,
    ProfileCompletion,
    PasswordUpdateRequest,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    ActivityResponse,
    SecurityStatusResponse,
    PhotoUploadResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/profile", tags=["Profile Management"])

# ---------------------------------------------------------------------------
# Storage Abstraction Layer
# Swap implementation by changing StorageService class below.
# Frontend always receives a URL string — no frontend changes needed on swap.
# ---------------------------------------------------------------------------

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

COMPLETION_FIELDS = [
    "photo_url",
    "full_name",
    "phone",
    "qualification",
    "experience",
    "emergency_contact",
    "office_extension",
    "bio",
]


class StorageService:
    """
    Abstract storage interface.
    Currently backed by LocalStorageService.
    To swap to S3/Cloudinary: implement save() and delete() using the new provider
    and update the `storage` module-level instance below.
    """

    def save(self, file: UploadFile, filename: str) -> str:
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return f"/api/v1/profile/photo/{filename}"

    def delete(self, photo_url: str) -> None:
        if photo_url:
            filename = photo_url.split("/")[-1]
            path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(path):
                os.remove(path)


storage = StorageService()


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _compute_completion(profile: DoctorProfile) -> ProfileCompletion:
    completed = sum(1 for field in COMPLETION_FIELDS if getattr(profile, field, None))
    total = len(COMPLETION_FIELDS)
    pct = round(completed / total * 100)
    return ProfileCompletion(completed=completed, total=total, percentage=pct)


def _get_or_create_notifications(user: User, db: Session) -> NotificationPreference:
    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user.id)
        .first()
    )
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def _get_security_status(
    user: User, profile: Optional[DoctorProfile], db: Session
) -> SecurityStatusResponse:
    last_login_log = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id, AuditLog.action == "login")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    total_activity = (
        db.query(ActivityLog).filter(ActivityLog.user_id == user.id).count()
    )
    return SecurityStatusResponse(
        last_login=last_login_log.created_at if last_login_log else None,
        last_password_changed_at=profile.last_password_changed_at if profile else None,
        account_status="Active" if user.is_active else "Inactive",
        total_activity_count=total_activity,
    )


def _build_profile_response(user: User, db: Session) -> ProfileResponse:
    profile = user.doctor_profile
    prefs = _get_or_create_notifications(user, db)
    security = _get_security_status(user, profile, db)
    completion = (
        _compute_completion(profile)
        if profile
        else ProfileCompletion(completed=0, total=8, percentage=0)
    )
    notif_resp = NotificationPreferenceResponse.model_validate(prefs)

    # Dynamic fallback for hospital name from PostgreSQL Hospital model
    hospital_name = profile.hospital if profile and profile.hospital else None
    if not hospital_name and user.hospital_id:
        from backend.database.models import Hospital
        hosp = db.query(Hospital).filter(Hospital.id == user.hospital_id).first()
        if hosp:
            hospital_name = hosp.name

    return ProfileResponse(
        user_id=user.id,
        email=user.email,
        role=user.role,
        doctor_profile_id=profile.id if profile else None,
        full_name=profile.full_name if profile else None,
        phone=profile.phone if profile else None,
        experience=profile.experience if profile else None,
        qualification=profile.qualification if profile else None,
        emergency_contact=profile.emergency_contact if profile else None,
        office_extension=profile.office_extension if profile else None,
        photo_url=profile.photo_url if profile else None,
        bio=profile.bio if profile else None,
        license_number=profile.license_number if profile else None,
        specialty=profile.specialty if profile else None,
        department=profile.department if profile else None,
        designation=profile.designation if profile else None,
        hospital=hospital_name or "St. Jude Memorial",
        medical_council=profile.medical_council if profile else None,
        license_expiry=profile.license_expiry if profile else None,
        last_password_changed_at=profile.last_password_changed_at if profile else None,
        completion=completion,
        notifications=notif_resp,
        security=security,
    )


def _log_activity(
    user_id: uuid.UUID, activity_type: str, details: Optional[str], db: Session
) -> None:
    log = ActivityLog(user_id=user_id, activity_type=activity_type, details=details)
    db.add(log)
    db.commit()


@router.get("/photo/{filename}")
def get_photo(filename: str):
    """Serve uploaded profile photos publicly so HTML img tags can render them."""
    safe_filename = os.path.basename(filename)
    path = os.path.join(UPLOAD_DIR, safe_filename)
    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile photo not found."
        )
    return FileResponse(path)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/me", response_model=ProfileResponse)
def get_profile_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Consolidated profile endpoint.
    Returns User + DoctorProfile + NotificationPreferences + SecurityStatus + ProfileCompletion
    in a single API call. Used by the Settings page on mount.
    """
    return _build_profile_response(current_user, db)


@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update doctor-editable profile fields.
    Admin-managed fields (designation, hospital, medical_council, license_expiry) are NOT writable here.
    """
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Contact administrator.",
        )

    changed_fields = []
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
        changed_fields.append(field)

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    if changed_fields:
        _log_activity(
            current_user.id,
            "Profile Updated",
            f"Fields updated: {', '.join(changed_fields)}",
            db,
        )

    logger.info(f"Profile updated for user {current_user.email}: {changed_fields}")
    return _build_profile_response(current_user, db)


@router.post("/photo", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload or replace profile photo.
    Accepts: jpg, jpeg, png. Max size: 5MB.
    """
    # Validate extension
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Allowed: jpg, jpeg, png.",
        )

    # Validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 5MB limit."
        )
    await file.seek(0)

    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    # Delete old photo if exists
    if profile.photo_url:
        storage.delete(profile.photo_url)

    # Save new photo
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    url = storage.save(file, filename)

    profile.photo_url = url
    profile.updated_at = datetime.utcnow()
    db.commit()

    _log_activity(current_user.id, "Photo Uploaded", filename, db)
    return PhotoUploadResponse(
        photo_url=url, message="Profile photo updated successfully."
    )


@router.delete("/photo")
def remove_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove profile photo and clear photo_url."""
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    if profile.photo_url:
        storage.delete(profile.photo_url)
        profile.photo_url = None
        profile.updated_at = datetime.utcnow()
        db.commit()
        _log_activity(current_user.id, "Photo Removed", None, db)

    return {"message": "Profile photo removed."}


@router.put("/password")
def update_password(
    payload: PasswordUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update user password with bcrypt verification.
    Returns session_revoked: true → frontend must logout and redirect to login.
    """
    # Verify current password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # Validate new passwords match
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )

    # Hash and save new password
    current_user.password_hash = get_password_hash(payload.new_password)

    # Update last_password_changed_at on profile
    profile = current_user.doctor_profile
    if profile:
        profile.last_password_changed_at = datetime.utcnow()
    db.commit()

    _log_activity(current_user.id, "Password Changed", None, db)
    logger.info(f"Password changed for user {current_user.email}")

    return {
        "message": "Password updated successfully. Please log in again.",
        "session_revoked": True,
    }


@router.get("/activity", response_model=List[ActivityResponse])
def get_activity(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the 5 most recent activity logs for the current user."""
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.get("/security", response_model=SecurityStatusResponse)
def get_security_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return security-related status for the current user."""
    return _get_security_status(current_user, current_user.doctor_profile, db)


@router.get("/notifications", response_model=NotificationPreferenceResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return notification preferences. Creates defaults if none exist."""
    prefs = _get_or_create_notifications(current_user, db)
    return prefs


@router.put("/notifications", response_model=NotificationPreferenceResponse)
def update_notifications(
    payload: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save notification preferences."""
    prefs = _get_or_create_notifications(current_user, db)

    changed = []
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(prefs, field, value)
        changed.append(field)

    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)

    if changed:
        _log_activity(
            current_user.id,
            "Notification Preferences Updated",
            f"Updated: {', '.join(changed)}",
            db,
        )

    return prefs
