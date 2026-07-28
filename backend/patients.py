import os
import sys
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Add project root to path to ensure proper imports when running via uvicorn
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database.session import get_db
from backend.database.models import (
    Patient,
    Admission,
    Diagnosis,
    LabResult,
    ClinicalPrediction,
    User,
    PatientAssignment,
    Report,
)
from backend.auth import get_current_user, get_optional_user, RoleChecker
from backend.schemas import (
    PatientCreate,
    PatientUpdate,
    VitalsUpdate,
    LabUpload,
    EcgUpload,
    RadiologyUpload,
)

logger = logging.getLogger("PatientsRegistryAPI")

router = APIRouter(prefix="/api/v1/patients", tags=["ICU Patients Registry"])


@router.get("", response_model=List[Dict[str, Any]])
def list_patients(
    hospital: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Retrieves all patients formatted for the registry with demographics, vitals, and calibrated risk scores."""
    from backend.database.models import Hospital
    
    # Resolve target hospital_id if hospital query parameter or user hospital_id is present
    target_hospital_id = current_user.hospital_id if current_user else None
    if hospital:
        clean_slug = hospital.lower().replace("-", "%").strip()
        found_hosp = db.query(Hospital).filter(
            (Hospital.name.ilike(f"%{clean_slug}%")) | (Hospital.code.ilike(f"%{hospital}%"))
        ).first()
        if found_hosp:
            target_hospital_id = found_hosp.id

    role = (current_user.role or "doctor").lower() if current_user else "doctor"
    query = db.query(Patient).filter(Patient.is_deleted == False)

    if target_hospital_id:
        from sqlalchemy import or_
        query = query.filter(or_(Patient.hospital_id == target_hospital_id, Patient.hospital_id.is_(None)))

    if role not in ["admin", "super_admin", "super admin", "doctor", "nurse", "medical researcher"]:
        query = query.join(PatientAssignment, Patient.id == PatientAssignment.patient_id).filter(
            PatientAssignment.user_id == current_user.id
        )

    patients = query.all()

    if not patients:
        return []

    patient_ids = [p.id for p in patients]
    patient_uuids = [p.patient_uuid for p in patients]

    # Batch retrieve admissions for all patients ordered by admittime descending
    # (so the first one we find for a patient is their latest one)
    all_admissions = (
        db.query(Admission)
        .filter(Admission.patient_id.in_(patient_ids), Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .all()
    )

    # Build a map of patient_id -> latest admission
    latest_admissions_map = {}
    for adm in all_admissions:
        if adm.patient_id not in latest_admissions_map:
            latest_admissions_map[adm.patient_id] = adm

    # Get active admission IDs
    active_admission_ids = [adm.id for adm in latest_admissions_map.values()]

    # Batch retrieve diagnoses for active admissions
    all_diagnoses = (
        db.query(Diagnosis)
        .filter(Diagnosis.admission_id.in_(active_admission_ids))
        .all()
    )

    # Map admission_id -> list of uppercase diagnosis codes
    diag_codes_map = {}
    for diag in all_diagnoses:
        if diag.icd_code:
            diag_codes_map.setdefault(diag.admission_id, []).append(str(diag.icd_code).upper())

    # Batch retrieve glucose labs (itemid 50931) for active admissions
    all_labs = (
        db.query(LabResult)
        .filter(
            LabResult.admission_id.in_(active_admission_ids), LabResult.itemid == 50931
        )
        .all()
    )

    # Map admission_id -> glucose value
    glucose_map = {}
    for lab in all_labs:
        if lab.admission_id not in glucose_map:
            glucose_map[lab.admission_id] = lab.valuenum

    # Batch retrieve latest clinical predictions for all patient uuids
    all_predictions = (
        db.query(ClinicalPrediction)
        .filter(
            ClinicalPrediction.patient_uuid.in_(patient_uuids),
            ClinicalPrediction.model_version != "mock-1",
        )
        .order_by(ClinicalPrediction.timestamp.desc())
        .all()
    )

    # Map patient_uuid -> latest risk score
    predictions_map = {}
    for pred in all_predictions:
        if pred.patient_uuid not in predictions_map:
            predictions_map[pred.patient_uuid] = pred.predicted_risk

    results = []

    for patient in patients:
        admission = latest_admissions_map.get(patient.id)
        if not admission:
            continue

        diag_codes = diag_codes_map.get(admission.id, [])

        hypertension = (
            1
            if any(c.startswith("I10") or c.startswith("401") for c in diag_codes)
            else 0
        )
        diabetes = (
            1
            if any(c.startswith("E11") or c.startswith("250") for c in diag_codes)
            else 0
        )
        previous_cardiac = (
            1
            if any(c.startswith("I25") or c.startswith("414") for c in diag_codes)
            else 0
        )
        smoking = (
            1
            if any(
                c.startswith("F17") or c.startswith("305.1") or c.startswith("Z72.0")
                for c in diag_codes
            )
            else 0
        )

        chd_risk_score = predictions_map.get(patient.patient_uuid)
        glucose = glucose_map.get(admission.id)

        p_uuid = patient.patient_uuid
        p_name = patient.name or "Unknown Patient"
        if role == "medical researcher":
            p_uuid = "[DE-IDENTIFIED]"
            p_name = "[DE-IDENTIFIED]"

        # Resolve assigned doctor name
        assigned_doc_name = "Unassigned"
        try:
            if patient.assigned_doctor:
                doc_obj = patient.assigned_doctor
                dname = doc_obj.full_name or doc_obj.username or (doc_obj.email.split("@")[0].capitalize() if doc_obj.email else "")
                if dname:
                    assigned_doc_name = f"Dr. {dname}" if not dname.startswith("Dr.") else dname
        except Exception:
            assigned_doc_name = "Unassigned"

        results.append(
            {
                "patient_id": patient.id,
                "patient_uuid": p_uuid,
                "name": p_name,
                "assigned_doctor_id": str(patient.assigned_doctor_id) if patient.assigned_doctor_id else None,
                "assigned_doctor_name": assigned_doc_name,
                "gender": int(patient.gender) if patient.gender is not None else 0,
                "age": int(patient.anchor_age) if patient.anchor_age is not None else 0,
                "admission_id": admission.id,
                "hadm_id": admission.hadm_id,
                "careunit": getattr(admission, "careunit", None) or "ICU Bed",
                "admittime": (
                    admission.admittime.isoformat() if admission.admittime else None
                ),
                "hypertension": int(hypertension),
                "diabetes": int(diabetes),
                "previous_cardiac": int(previous_cardiac),
                "smoking": int(smoking),
                "glucose": float(glucose) if glucose is not None else None,
                "bmi": float(admission.bmi) if admission.bmi is not None else None,
                "systolic_bp": (
                    float(admission.systolic_bp)
                    if admission.systolic_bp is not None
                    else None
                ),
                "diastolic_bp": (
                    float(admission.diastolic_bp)
                    if admission.diastolic_bp is not None
                    else None
                ),
                "heart_rate": (
                    float(admission.heart_rate)
                    if admission.heart_rate is not None
                    else None
                ),
                "cholesterol": (
                    float(admission.cholesterol)
                    if admission.cholesterol is not None
                    else None
                ),
                "statin_history": (
                    int(admission.statin_history)
                    if admission.statin_history is not None
                    else 0
                ),
                "beta_blocker_history": (
                    int(admission.beta_blocker_history)
                    if admission.beta_blocker_history is not None
                    else 0
                ),
                "ace_arb_history": (
                    int(admission.ace_arb_history)
                    if admission.ace_arb_history is not None
                    else 0
                ),
                "aspirin_history": (
                    int(admission.aspirin_history)
                    if admission.aspirin_history is not None
                    else 0
                ),
                "medication_count": (
                    int(admission.medication_count)
                    if admission.medication_count is not None
                    else 0
                ),
                "chd_risk_score": (
                    float(chd_risk_score) if chd_risk_score is not None else None
                ),
            }
        )

    return results


@router.get("/bed-capacity")
def get_bed_capacity(
    hospital: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Returns total bed capacity and live occupied count by bed unit (ICU, CCU, Normal)."""
    from backend.database.models import Hospital
    target_hospital_id = current_user.hospital_id if current_user else None
    if hospital:
        clean_slug = hospital.lower().replace("-", "%").strip()
        hosp = db.query(Hospital).filter(
            (Hospital.name.ilike(f"%{clean_slug}%")) | (Hospital.code.ilike(f"%{hospital}%"))
        ).first()
        if hosp:
            target_hospital_id = hosp.id

    hosp_obj = None
    if target_hospital_id:
        hosp_obj = db.query(Hospital).filter(Hospital.id == target_hospital_id).first()
    if not hosp_obj:
        hosp_obj = db.query(Hospital).filter(Hospital.name.ilike("%St. Jude%")).first()

    if not hosp_obj:
        return {"hospital_name": "Hospital", "icu": {"occupied": 0, "total": 20}, "ccu": {"occupied": 0, "total": 15}, "normal": {"occupied": 0, "total": 10}}

    active_admissions = (
        db.query(Admission)
        .join(Patient, Admission.patient_id == Patient.id)
        .filter(
            Patient.hospital_id == hosp_obj.id,
            Patient.is_deleted == False,
            Admission.is_deleted == False
        )
        .all()
    )

    icu_occ = sum(1 for a in active_admissions if a.careunit and "ICU" in a.careunit)
    ccu_occ = sum(1 for a in active_admissions if a.careunit and "CCU" in a.careunit)
    normal_occ = sum(1 for a in active_admissions if a.careunit and "Normal" in a.careunit)

    return {
        "hospital_name": hosp_obj.name,
        "hospital_code": hosp_obj.code,
        "icu": {"occupied": icu_occ, "total": hosp_obj.icu_beds or 20},
        "ccu": {"occupied": ccu_occ, "total": getattr(hosp_obj, "ccu_beds", 20) or 20},
        "normal": {"occupied": normal_occ, "total": hosp_obj.total_beds or 10}
    }


@router.get("/doctors")
def get_hospital_doctors(
    hospital: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Returns list of doctors belonging to the current hospital."""
    from backend.database.models import Hospital
    target_hosp_id = current_user.hospital_id if current_user else None
    if hospital:
        clean_slug = hospital.lower().replace("-", "%").strip()
        found_hosp = db.query(Hospital).filter(
            (Hospital.name.ilike(f"%{clean_slug}%")) | (Hospital.code.ilike(f"%{hospital}%"))
        ).first()
        if found_hosp:
            target_hosp_id = found_hosp.id

    query = db.query(User).filter(User.role.ilike("%doctor%"))
    if target_hosp_id:
        from sqlalchemy import or_
        query = query.filter(or_(User.hospital_id == target_hosp_id, User.hospital_id.is_(None)))

    docs = query.all()
    result = []
    for d in docs:
        dept = d.doctor_profile.department if (d.doctor_profile and d.doctor_profile.department) else "Cardiology & CCU"
        dname = d.doctor_profile.full_name if (d.doctor_profile and d.doctor_profile.full_name) else (d.full_name or d.username or d.email.split("@")[0].capitalize())
        if not dname.startswith("Dr."):
            dname = f"Dr. {dname}"
        result.append({
            "id": str(d.id),
            "name": dname,
            "email": d.email,
            "department": dept
        })
    return result


@router.get("/{patient_id}", response_model=Dict[str, Any])
def get_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves a single patient record by database ID."""
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    role = current_user.role.lower()
    if role not in ["admin", "doctor", "nurse", "medical researcher"]:
        # Check patient assignment for technicians/pharmacists/etc.
        assigned = (
            db.query(PatientAssignment)
            .filter_by(user_id=current_user.id, patient_id=patient.id)
            .first()
        )
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Patient is not assigned to your account.",
            )

    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .first()
    )

    if not admission:
        raise HTTPException(
            status_code=404, detail="No admissions found for this patient."
        )

    diagnoses = db.query(Diagnosis).filter(Diagnosis.admission_id == admission.id).all()
    diag_codes = [str(d.icd_code).upper() for d in diagnoses if d.icd_code]

    hypertension = (
        1 if any(c.startswith("I10") or c.startswith("401") for c in diag_codes) else 0
    )
    diabetes = (
        1 if any(c.startswith("E11") or c.startswith("250") for c in diag_codes) else 0
    )
    previous_cardiac = (
        1 if any(c.startswith("I25") or c.startswith("414") for c in diag_codes) else 0
    )
    smoking = (
        1
        if any(
            c.startswith("F17") or c.startswith("305.1") or c.startswith("Z72.0")
            for c in diag_codes
        )
        else 0
    )

    audit = (
        db.query(ClinicalPrediction)
        .filter(
            ClinicalPrediction.patient_uuid == patient.patient_uuid,
            ClinicalPrediction.model_version != "mock-1",
        )
        .order_by(ClinicalPrediction.timestamp.desc())
        .first()
    )
    chd_risk_score = audit.predicted_risk if audit else None

    labs = db.query(LabResult).filter(LabResult.admission_id == admission.id).all()
    glucose = None
    for lab in labs:
        if lab.itemid == 50931:
            glucose = lab.valuenum
            break

    p_uuid = patient.patient_uuid
    p_name = patient.name or "Unknown Patient"
    if role == "medical researcher":
        p_uuid = "[DE-IDENTIFIED]"
        p_name = "[DE-IDENTIFIED]"

    return {
        "patient_id": patient.id,
        "patient_uuid": p_uuid,
        "name": p_name,
        "gender": int(patient.gender) if patient.gender is not None else 0,
        "age": int(patient.anchor_age) if patient.anchor_age is not None else 0,
        "admission_id": admission.id,
        "hadm_id": admission.hadm_id,
        "admittime": admission.admittime.isoformat() if admission.admittime else None,
        "hypertension": int(hypertension),
        "diabetes": int(diabetes),
        "previous_cardiac": int(previous_cardiac),
        "smoking": int(smoking),
        "glucose": float(glucose) if glucose is not None else None,
        "bmi": float(admission.bmi) if admission.bmi is not None else None,
        "systolic_bp": (
            float(admission.systolic_bp) if admission.systolic_bp is not None else None
        ),
        "diastolic_bp": (
            float(admission.diastolic_bp)
            if admission.diastolic_bp is not None
            else None
        ),
        "heart_rate": (
            float(admission.heart_rate) if admission.heart_rate is not None else None
        ),
        "cholesterol": (
            float(admission.cholesterol) if admission.cholesterol is not None else None
        ),
        "statin_history": (
            int(admission.statin_history) if admission.statin_history is not None else 0
        ),
        "beta_blocker_history": (
            int(admission.beta_blocker_history)
            if admission.beta_blocker_history is not None
            else 0
        ),
        "ace_arb_history": (
            int(admission.ace_arb_history)
            if admission.ace_arb_history is not None
            else 0
        ),
        "aspirin_history": (
            int(admission.aspirin_history)
            if admission.aspirin_history is not None
            else 0
        ),
        "medication_count": (
            int(admission.medication_count)
            if admission.medication_count is not None
            else 0
        ),
        "chd_risk_score": float(chd_risk_score) if chd_risk_score is not None else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientCreate,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "nurse"])),
    db: Session = Depends(get_db),
):
    """Registers a new patient with their initial admission record, vitals and diagnoses."""
    # 1. Resolve Hospital & Check Capacity Limit
    from backend.database.models import Hospital
    target_hospital_id = current_user.hospital_id
    hospital = None
    if target_hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == target_hospital_id).first()
    if not hospital:
        hospital = db.query(Hospital).filter(Hospital.name.ilike("%St. Jude%")).first()
        if hospital:
            target_hospital_id = hospital.id

    if hospital:
        careunit = (payload.careunit or "ICU Bed").strip()
        query = (
            db.query(Admission)
            .join(Patient, Admission.patient_id == Patient.id)
            .filter(
                Patient.hospital_id == hospital.id,
                Patient.is_deleted == False,
                Admission.is_deleted == False
            )
        )
        
        if "ICU" in careunit:
            max_beds = hospital.icu_beds or 20
            occupied = query.filter(Admission.careunit.ilike("%ICU%")).count()
            unit_label = "ICU Bed"
        elif "CCU" in careunit:
            max_beds = getattr(hospital, "ccu_beds", 20) or 20
            occupied = query.filter(Admission.careunit.ilike("%CCU%")).count()
            unit_label = "CCU Bed"
        else:
            max_beds = hospital.total_beds or 10
            occupied = query.filter(Admission.careunit.ilike("%Normal%")).count()
            unit_label = "Normal Bed"

        if occupied >= max_beds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed Capacity Limit Reached: {hospital.name} has reached its maximum allocated {unit_label} limit ({occupied}/{max_beds} beds occupied). No additional patients can be registered until a bed is vacated."
            )

    try:

        # Resolve assigned doctor UUID
        doc_uuid = None
        if payload.assigned_doctor_id:
            try:
                doc_uuid = uuid.UUID(payload.assigned_doctor_id)
            except Exception:
                doc_uuid = current_user.id
        elif current_user.role.lower() in ["doctor", "nurse"]:
            doc_uuid = current_user.id

        # 2. Create Patient record
        patient = Patient(
            patient_uuid=str(uuid.uuid4()),
            hospital_id=target_hospital_id,
            assigned_doctor_id=doc_uuid,
            name=payload.name,
            gender=payload.gender,
            anchor_age=payload.age,
            is_deleted=False,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        # 2. Get next hadm_id
        max_hadm = (
            db.query(Admission.hadm_id).order_by(Admission.hadm_id.desc()).first()
        )
        next_hadm = (max_hadm[0] + 1) if max_hadm else 200001

        # 3. Create Admission record
        admission = Admission(
            patient_id=patient.id,
            hadm_id=next_hadm,
            admittime=datetime.now(),
            careunit=payload.careunit or "ICU Bed",
            is_deleted=False,
            bmi=payload.bmi,
            systolic_bp=payload.systolic_bp,
            diastolic_bp=payload.diastolic_bp,
            heart_rate=payload.heart_rate,
            cholesterol=payload.cholesterol,
            statin_history=payload.statin_history,
            beta_blocker_history=payload.beta_blocker_history,
            ace_arb_history=payload.ace_arb_history,
            aspirin_history=payload.aspirin_history,
            medication_count=payload.medication_count,
        )
        db.add(admission)
        db.commit()
        db.refresh(admission)

        # 4. Create Diagnosis records
        if payload.hypertension:
            db.add(
                Diagnosis(
                    admission_id=admission.id,
                    icd_code="I10",
                    icd_version=10,
                    long_title="Essential hypertension",
                    is_deleted=False,
                )
            )
        if payload.diabetes:
            db.add(
                Diagnosis(
                    admission_id=admission.id,
                    icd_code="E11.9",
                    icd_version=10,
                    long_title="Type 2 diabetes mellitus",
                    is_deleted=False,
                )
            )
        if payload.previous_cardiac:
            db.add(
                Diagnosis(
                    admission_id=admission.id,
                    icd_code="I25.10",
                    icd_version=10,
                    long_title="Atherosclerotic heart disease",
                    is_deleted=False,
                )
            )
        if payload.smoking:
            db.add(
                Diagnosis(
                    admission_id=admission.id,
                    icd_code="F17.210",
                    icd_version=10,
                    long_title="Nicotine dependence, cigarettes",
                    is_deleted=False,
                )
            )

        # 5. Create LabResult record if glucose provided
        if payload.glucose is not None:
            db.add(
                LabResult(
                    admission_id=admission.id,
                    itemid=50931,
                    charttime=datetime.now(),
                    valuenum=payload.glucose,
                    valueuom="mg/dL",
                    is_deleted=False,
                )
            )

        db.commit()

        return {
            "status": "success",
            "message": "Patient registered successfully",
            "patient_uuid": patient.patient_uuid,
            "patient_id": patient.id,
            "hadm_id": next_hadm,
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to register patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient registration failed: {str(e)}",
        )


@router.put("/{patient_id}")
def update_patient_demographics(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "nurse"])),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    role = current_user.role.lower()
    if role == "nurse":
        if payload.gender is not None and payload.gender != patient.gender:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Nurses are not permitted to edit patient gender.",
            )

    if payload.age is not None:
        patient.anchor_age = payload.age
    if payload.gender is not None:
        patient.gender = payload.gender

    db.commit()
    return {
        "status": "success",
        "message": "Patient demographics updated successfully.",
    }


@router.post("/{patient_id}/vitals")
def update_patient_vitals(
    patient_id: uuid.UUID,
    payload: VitalsUpdate,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "nurse"])),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .first()
    )

    if not admission:
        raise HTTPException(
            status_code=404, detail="No active admissions found for this patient."
        )

    if payload.systolic_bp is not None:
        admission.systolic_bp = payload.systolic_bp
    if payload.diastolic_bp is not None:
        admission.diastolic_bp = payload.diastolic_bp
    if payload.heart_rate is not None:
        admission.heart_rate = payload.heart_rate
    if payload.bmi is not None:
        admission.bmi = payload.bmi

    db.commit()
    return {"status": "success", "message": "Telemetry vitals updated successfully."}


@router.post("/{patient_id}/labs")
def upload_labs(
    patient_id: uuid.UUID,
    payload: LabUpload,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "lab tech"])),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .first()
    )
    if not admission:
        raise HTTPException(status_code=404, detail="No active admissions found.")

    report = Report(
        patient_id=patient.id,
        admission_id=admission.id,
        report_type="Lab",
        report_data=payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(report)

    if "glucose" in payload.lab_name.lower():
        db.add(
            LabResult(
                admission_id=admission.id,
                itemid=50931,
                charttime=datetime.now(),
                valuenum=payload.result_value,
                valueuom=payload.unit,
                is_deleted=False,
            )
        )

    db.commit()
    return {"status": "success", "message": "Lab result uploaded successfully."}


@router.post("/{patient_id}/ecg")
def upload_ecg(
    patient_id: uuid.UUID,
    payload: EcgUpload,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "ecg tech"])),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .first()
    )
    if not admission:
        raise HTTPException(status_code=404, detail="No active admissions found.")

    report = Report(
        patient_id=patient.id,
        admission_id=admission.id,
        report_type="ECG",
        report_data=payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    return {
        "status": "success",
        "message": "ECG telemetry trace uploaded successfully.",
    }


@router.post("/{patient_id}/radiology")
def upload_radiology(
    patient_id: uuid.UUID,
    payload: RadiologyUpload,
    current_user: User = Depends(RoleChecker(["admin", "doctor", "radiology tech"])),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .order_by(Admission.admittime.desc())
        .first()
    )
    if not admission:
        raise HTTPException(status_code=404, detail="No active admissions found.")

    report = Report(
        patient_id=patient.id,
        admission_id=admission.id,
        report_type="Radiology",
        report_data=payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    return {
        "status": "success",
        "message": "Radiology report and modality upload completed.",
    }


@router.get("/{patient_id}/reports")
def list_patient_reports(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    role = current_user.role.lower()
    if role not in ["admin", "doctor", "nurse", "medical researcher"]:
        assigned = (
            db.query(PatientAssignment)
            .filter_by(user_id=current_user.id, patient_id=patient.id)
            .first()
        )
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Patient is not assigned to your account.",
            )

    reports = (
        db.query(Report)
        .filter(Report.patient_id == patient.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "report_type": r.report_type,
            "report_data": r.report_data,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-deletes a patient record and their active admissions. Restricted to doctors."""
    if current_user.role.lower() not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only doctors and administrators can delete patient records.",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.is_deleted == False)
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found."
        )

    # Soft delete the patient
    patient.is_deleted = True
    patient.deleted_at = datetime.utcnow()
    patient.deleted_by = current_user.id

    # Soft delete associated admissions
    admissions = (
        db.query(Admission)
        .filter(Admission.patient_id == patient.id, Admission.is_deleted == False)
        .all()
    )
    for admission in admissions:
        admission.is_deleted = True
        admission.deleted_at = datetime.utcnow()
        admission.deleted_by = current_user.id

    db.commit()
    return
