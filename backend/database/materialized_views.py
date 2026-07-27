"""
PostgreSQL Materialized Views & High-Performance Aggregations Helper
Manages materialized aggregations for enterprise executive analytics.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database.models import ClinicalPrediction, Patient, User, Hospital, Department, PendingRegistration

logger = logging.getLogger("MaterializedViews")

class MaterializedViewManager:
    """Provides optimized query execution and views for dashboard analytics."""

    @staticmethod
    def ensure_materialized_views(db: Session):
        """Creates or updates database materialized view aggregations if PostgreSQL is active."""
        try:
            db.execute(text("""
                CREATE MATERIALIZED VIEW IF NOT EXISTS daily_prediction_summary AS
                SELECT 
                    DATE(timestamp) as pred_date,
                    COUNT(*) as total_predictions,
                    COUNT(CASE WHEN predicted_risk >= 0.20 THEN 1 END) as high_risk_count,
                    AVG(predicted_risk) as avg_risk
                FROM clinical_predictions
                GROUP BY DATE(timestamp);
            """))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.info(f"Materialized view creation fallback to live queries: {e}")

    @staticmethod
    def refresh_views(db: Session):
        """Refreshes materialized views asynchronously."""
        try:
            db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY daily_prediction_summary;"))
            db.commit()
        except Exception:
            try:
                db.execute(text("REFRESH MATERIALIZED VIEW daily_prediction_summary;"))
                db.commit()
            except Exception as e:
                db.rollback()
                logger.debug(f"View refresh info: {e}")

    @staticmethod
    def get_aggregated_risk_distribution(db: Session):
        """Executes fast aggregation query for 5-tier CHD risk distribution."""
        try:
            res = db.execute(text("""
                SELECT 
                    COUNT(CASE WHEN predicted_risk < 0.05 THEN 1 END) as v_low,
                    COUNT(CASE WHEN predicted_risk >= 0.05 AND predicted_risk < 0.10 THEN 1 END) as low,
                    COUNT(CASE WHEN predicted_risk >= 0.10 AND predicted_risk < 0.20 THEN 1 END) as mod,
                    COUNT(CASE WHEN predicted_risk >= 0.20 AND predicted_risk < 0.40 THEN 1 END) as high,
                    COUNT(CASE WHEN predicted_risk >= 0.40 THEN 1 END) as v_high,
                    AVG(predicted_risk) as avg_risk
                FROM clinical_predictions;
            """)).fetchone()
            
            if res:
                return {
                    "v_low": res[0] or 0,
                    "low": res[1] or 0,
                    "mod": res[2] or 0,
                    "high": res[3] or 0,
                    "v_high": res[4] or 0,
                    "avg_risk": round(float(res[5] * 100), 1) if res[5] is not None else 0.0
                }
        except Exception as e:
            logger.warning(f"Aggregated query fallback: {e}")

        # Fallback ORM calculation
        very_low = db.query(ClinicalPrediction).filter(ClinicalPrediction.predicted_risk < 0.05).count()
        low = db.query(ClinicalPrediction).filter(ClinicalPrediction.predicted_risk >= 0.05, ClinicalPrediction.predicted_risk < 0.10).count()
        mod = db.query(ClinicalPrediction).filter(ClinicalPrediction.predicted_risk >= 0.10, ClinicalPrediction.predicted_risk < 0.20).count()
        high = db.query(ClinicalPrediction).filter(ClinicalPrediction.predicted_risk >= 0.20, ClinicalPrediction.predicted_risk < 0.40).count()
        very_high = db.query(ClinicalPrediction).filter(ClinicalPrediction.predicted_risk >= 0.40).count()
        avg_row = db.query(ClinicalPrediction.predicted_risk).all()
        avg_val = round(sum(r[0] for r in avg_row) / len(avg_row) * 100, 1) if avg_row else 0.0

        return {
            "v_low": very_low, "low": low, "mod": mod, "high": high, "v_high": very_high, "avg_risk": avg_val
        }
