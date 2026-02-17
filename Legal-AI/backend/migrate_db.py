
import sqlite3

def migrate_db():
    try:
        conn = sqlite3.connect('legal_ai.db')
        cursor = conn.cursor()
        
        # Check if notification_enabled column exists
        cursor.execute("PRAGMA table_info(schedules)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'notification_enabled' not in columns:
            print("Adding notification_enabled column...")
            cursor.execute("ALTER TABLE schedules ADD COLUMN notification_enabled BOOLEAN DEFAULT 1")
            conn.commit()
            print("Schedule Migration successful.")
        else:
            print("Column notification_enabled already exists in schedules.")

        # Check users table
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [column[1] for column in cursor.fetchall()]

        if 'full_name' not in user_columns:
            print("Adding full_name column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR")
            conn.commit()
            print("User (full_name) Migration successful.")
        
        if 'is_active' not in user_columns:
            print("Adding is_active column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
            conn.commit()
            print("User (is_active) Migration successful.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_db()
