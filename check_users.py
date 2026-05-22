import sqlite3
import os

# Database path
DB_PATH = os.path.join("database", "database.db")

def show_all_users():
    if not os.path.exists(DB_PATH):
        print("❌ Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\n📌 REGISTERED USERS LIST:\n")
    print("ID | USERNAME | EMAIL | PASSWORD")
    print("-" * 40)

    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()

    if not users:
        print("⚠️ No users found")
    else:
        for user in users:
            print(f"{user[0]} | {user[1]} | {user[2]} | {user[3]}")

    conn.close()
    print("\n✅ Done\n")

# Run function
show_all_users()