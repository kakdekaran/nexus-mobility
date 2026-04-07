#!/usr/bin/env python3
"""Initialize and verify the database"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from services.db import get_db, get_user_by_email
from services.auth_handler import verify_password

def main():
    print("Initializing database...")
    db = get_db()
    
    print(f"\n✓ Database initialized successfully")
    print(f"  - Total users: {len(db['users'])}")
    print(f"  - Database location: {Path(__file__).parent.parent / 'data' / 'db.json'}")
    
    # Check admin user
    admin = get_user_by_email("admin@smart.com")
    if admin:
        print(f"\n✓ Default admin account found:")
        print(f"  - Email: {admin['email']}")
        print(f"  - Role: {admin['role']}")
        print(f"  - Name: {admin['name']}")
        
        # Test password
        if verify_password("admin123", admin["password"]):
            print(f"  - Password: ✓ Valid (admin123)")
        else:
            print(f"  - Password: ✗ Invalid")
    else:
        print("\n✗ Admin account not found!")
        return 1
    
    print("\n" + "="*50)
    print("Default Login Credentials:")
    print("  Email:    admin@smart.com")
    print("  Password: admin123")
    print("="*50)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
