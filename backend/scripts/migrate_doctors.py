import sys
sys.path.insert(0, ".")
from backend.database.session import engine
from sqlalchemy import text

cols = [
    "sub_specialization VARCHAR(100)",
    "years_of_experience INTEGER DEFAULT 5",
    "employment_type VARCHAR(50) DEFAULT 'Full Time'",
    "availability_status VARCHAR(50) DEFAULT 'Available'",
    "languages VARCHAR(255)",
    "certificates TEXT"
]

with engine.connect() as conn:
    for c in cols:
        try:
            conn.execute(text(f"ALTER TABLE doctor_profiles ADD COLUMN {c};"))
            conn.commit()
            print(f"Added column {c.split()[0]} to doctor_profiles")
        except Exception as e:
            print(f"Column {c.split()[0]} notice: {e}")

print("DoctorProfile table migration complete!")
