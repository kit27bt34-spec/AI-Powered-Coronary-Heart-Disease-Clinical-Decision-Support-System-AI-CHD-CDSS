import sys
sys.path.insert(0, ".")
from backend.database.session import engine
from sqlalchemy import text

cols = [
    "employee_id VARCHAR(50)",
    "full_name VARCHAR(100)",
    "phone VARCHAR(30)",
    "gender VARCHAR(20)",
    "dob VARCHAR(30)",
    "designation VARCHAR(100)",
    "hospital_id CHAR(36)",
    "department_id CHAR(36)",
    "status VARCHAR(50) DEFAULT 'Active'",
    "mfa_enabled BOOLEAN DEFAULT 0",
    "temporary_password VARCHAR(255)",
    "last_login DATETIME",
    "last_logout DATETIME",
    "browser VARCHAR(100)",
    "ip_address VARCHAR(50)",
    "failed_login_attempts INTEGER DEFAULT 0",
    "account_locked BOOLEAN DEFAULT 0",
    "created_by VARCHAR(255)",
    "updated_by VARCHAR(255)",
    "permissions_json TEXT"
]

with engine.connect() as conn:
    for c in cols:
        try:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {c};"))
            conn.commit()
            print(f"Added column {c.split()[0]}")
        except Exception as e:
            print(f"Column {c.split()[0]} already exists or notice: {e}")

print("Users table migration finished successfully!")
