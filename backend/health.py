import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database.session import get_db
from backend.config import settings

logger = logging.getLogger("HealthCheck")

router = APIRouter(prefix="/health", tags=["Kubernetes & System Probes"])

@router.get("", status_code=status.HTTP_200_OK)
def health_status():
    """General Service Health Status."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENV,
        "timestamp": time.time()
    }

@router.get("/live", status_code=status.HTTP_200_OK)
def liveness_probe():
    """Kubernetes Liveness Probe: Verifies container process is responsive."""
    return {"status": "alive", "timestamp": time.time()}

@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness_probe(db: Session = Depends(get_db)):
    """
    Kubernetes Readiness Probe: Verifies database connectivity and readiness.
    Returns HTTP 200 if DB is healthy, HTTP 503 if unreachable.
    """
    try:
        start = time.perf_counter()
        db.execute(text("SELECT 1"))
        latency_ms = (time.perf_counter() - start) * 1000.0
        return {
            "status": "ready",
            "database": "connected",
            "db_latency_ms": round(latency_ms, 2),
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Readiness probe failed — Database unreachable: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: Database connection failed ({str(e)})"
        )
