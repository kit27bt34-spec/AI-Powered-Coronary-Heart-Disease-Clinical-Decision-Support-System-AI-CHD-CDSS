"""
Database Sync Tool: Sync Local Database Records to Deployed Render PostgreSQL.

Usage:
  $env:RENDER_DB_URL="postgresql://user:password@host/chd_cdss"
  python -m backend.scripts.sync_local_to_render
"""

import os
import sys
import logging
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database.session import engine as local_engine, SessionLocal as LocalSession
from backend.database.models import (
    Base,
    Role,
    Hospital,
    Department,
    User,
    DoctorProfile,
    Patient,
    Admission,
    Diagnosis,
    LabResult,
    ClinicalPrediction,
    AuditLog,
    Notification,
    ModelRegistry,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DBSync")


def sync_local_to_render():
    render_db_url = os.getenv("RENDER_DB_URL")
    if not render_db_url:
        logger.error("Error: RENDER_DB_URL environment variable is not set.")
        logger.info("Usage:")
        logger.info('  $env:RENDER_DB_URL="postgresql://user:pwd@ep-xxx.onrender.com/chd_cdss"')
        logger.info("  python -m backend.scripts.sync_local_to_render")
        return

    logger.info("Connecting to Render cloud PostgreSQL database...")
    render_engine = create_engine(render_db_url, pool_pre_ping=True)
    RenderSession = sessionmaker(autocommit=False, autoflush=False, bind=render_engine)

    # 1. Ensure all schema tables exist on Render
    logger.info("Ensuring database schema and tables exist on Render...")
    Base.metadata.create_all(bind=render_engine)

    local_db = LocalSession()
    render_db = RenderSession()

    models_in_order = [
        Role,
        Hospital,
        Department,
        User,
        DoctorProfile,
        Patient,
        Admission,
        Diagnosis,
        LabResult,
        ClinicalPrediction,
        AuditLog,
        Notification,
        ModelRegistry,
    ]

    total_migrated = 0

    try:
        for model in models_in_order:
            table_name = model.__tablename__
            local_records = local_db.query(model).all()
            if not local_records:
                continue

            logger.info(f"Syncing {len(local_records)} records for table '{table_name}'...")
            
            mapper = inspect(model)
            synced_count = 0
            for obj in local_records:
                attr_dict = {
                    c.key: getattr(obj, c.key)
                    for c in mapper.column_attrs
                }
                
                try:
                    with render_db.begin_nested():
                        render_db.merge(model(**attr_dict))
                        synced_count += 1
                        total_migrated += 1
                except Exception as row_err:
                    logger.debug(f"Skipping conflicting row in {table_name}: {row_err}")

            render_db.commit()
            logger.info(f"Successfully synced {synced_count} records for '{table_name}'.")

        logger.info(f"SUCCESS: Synced {total_migrated} total local records to your deployed Render PostgreSQL database!")

    except Exception as e:
        logger.error(f"Error during database sync: {e}", exc_info=True)
        render_db.rollback()
    finally:
        local_db.close()
        render_db.close()


if __name__ == "__main__":
    sync_local_to_render()
