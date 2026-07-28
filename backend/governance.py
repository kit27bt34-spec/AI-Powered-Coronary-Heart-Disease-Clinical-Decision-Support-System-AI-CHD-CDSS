import os
import sys
import logging
import uuid
from typing import List
import mlflow
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Add project root to path to ensure proper imports when running via uvicorn
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database.session import get_db
from backend.database.models import ModelRegistry, ApprovalWorkflow, User
from backend.auth import RoleChecker, get_current_user
from backend.schemas import (
    ModelArtifactResponse,
    ModelApprovalRequest,
    ModelApprovalResponse,
)

logger = logging.getLogger("GovernanceAPI")

router = APIRouter(prefix="/api/v1/models", tags=["Model Governance & Compliance"])

# Role check dependencies
require_governance_or_admin = RoleChecker(["governance", "admin"])


@router.get("", response_model=List[ModelArtifactResponse])
def list_model_artifacts(
    current_user: User = Depends(
        RoleChecker(["admin", "doctor", "medical researcher", "governance"])
    ),
    db: Session = Depends(get_db),
):
    """Lists all model versions logged in the registry database."""
    try:
        # Retrieve all model artifacts from DB
        artifacts = db.query(ModelRegistry).order_by(ModelRegistry.created_at.desc()).all()

        # If database has no model artifacts logged, let's sync/seed from MLflow to populate it!
        if not artifacts:
            try:
                mlflow.set_tracking_uri("sqlite:///mlflow.db")
                client = mlflow.tracking.MlflowClient()
                name = "CHD_Coronary_Heart_Disease_Risk_Model"
                latest_versions = client.get_latest_versions(
                    name, stages=["Staging", "Production"]
                )

                for v in latest_versions:
                    # Check if it already exists in DB
                    existing = db.query(ModelRegistry).filter_by(run_id=v.run_id).first()
                    if not existing:
                        # Dynamically retrieve performance metrics from MLflow run
                        try:
                            run = client.get_run(v.run_id)
                            metrics = run.data.metrics
                        except Exception:
                            metrics = {}
                        art = ModelRegistry(
                            model_uuid=v.source.split("/")[-1],
                            version=str(v.version),
                            run_id=v.run_id,
                            status=v.current_stage,
                            performance_metrics_json=metrics,
                        )
                        db.add(art)
                db.commit()
                artifacts = (
                    db.query(ModelRegistry).order_by(ModelRegistry.created_at.desc()).all()
                )
            except Exception as e:
                logger.error(f"Failed to sync with MLflow: {e}")

        return artifacts
    except Exception as e:
        logger.error(f"Error fetching model artifacts: {e}")
        return []


@router.post("/{model_id}/approve", response_model=ModelApprovalResponse)
def approve_model_version(
    model_id: uuid.UUID,
    payload: ModelApprovalRequest,
    current_user: User = Depends(require_governance_or_admin),
    db: Session = Depends(get_db),
):
    """Reviews and transition model to clinically approved or production stage."""
    model = db.query(ModelRegistry).filter(ModelRegistry.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model artifact ID {model_id} not found.",
        )

    # Check current status
    if model.status == "Production" or model.status == "Clinically Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model version {model.version} is already {model.status}.",
        )

    try:
        # 1. Update status in DB
        next_stage = "Clinically Approved"
        if current_user.role == "admin":
            next_stage = "Production"

        model.status = next_stage

        # 2. Log Approval workflow step
        workflow = ApprovalWorkflow(
            model_artifact_id=model.id,
            step=(
                "Governance Board Review"
                if current_user.role == "governance"
                else "Admin Deployment"
            ),
            approved_by_id=current_user.id,
            status="Approved",
            comment=payload.comment,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        # 3. Update MLflow Model Registry Stage
        try:
            mlflow.set_tracking_uri("sqlite:///mlflow.db")
            client = mlflow.tracking.MlflowClient()

            # Transition MLflow stage
            mlflow_stage = "Production" if next_stage == "Production" else "Staging"
            client.transition_model_version_stage(
                name="CHD_Coronary_Heart_Disease_Risk_Model",
                version=int(model.version),
                stage=mlflow_stage,
                archive_existing_versions=True,
            )
            logger.info(
                f"Successfully transitioned model version {model.version} to stage {mlflow_stage} in MLflow."
            )
        except Exception as e:
            logger.warning(
                f"Failed to update MLflow registry stage: {e}. SQLite model record updated in DB."
            )

        return workflow

    except Exception as e:
        logger.error(f"Failed to approve model: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval database write failed: {str(e)}",
        )
