"""
One-time migration: adds new columns to the users table for the auth overhaul.
Safe to run multiple times (checks if columns exist before adding).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "legal_ai.db")
DB_PATH = os.path.abspath(DB_PATH)

print(f"Migrating: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(users)")
existing_cols = {row[1] for row in cursor.fetchall()}
print(f"Existing columns: {existing_cols}")

migrations = [
    ("is_admin",            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"),
    ("reset_token",         "ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)"),
    ("reset_token_expiry",  "ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME"),
]

for col, sql in migrations:
    if col not in existing_cols:
        cursor.execute(sql)
        print(f"  ✅ Added column: {col}")
    else:
        print(f"  ⏭  Column already exists: {col}")

conn.commit()
conn.close()
print("Migration complete!")
