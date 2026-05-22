import sqlite3
import os

# Ensure database folder exists
if not os.path.exists("database"):
    os.makedirs("database")

# Connect to SQLite database
conn = sqlite3.connect("database/database.db")
cursor = conn.cursor()

# Create users table
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
""")

conn.commit()
conn.close()

print("✅ Database created and users table ready")
