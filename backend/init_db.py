#!/usr/bin/env python3
"""
Initialize SQLite database for Circuit Validator
"""

import os
import sys

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_tables, engine
from models.database import Base
from sqlalchemy import text

def init_database():
    """Initialize the database with all tables"""
    print("🗄️  Initializing Circuit Validator Database...")
    
    try:
        # Create all tables
        create_tables()
        print("✅ Database tables created successfully")
        
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result]
            print(f"📋 Available tables: {', '.join(tables)}")
            
            # Test basic operations
            conn.execute(text("SELECT 1"))
            print("✅ Database connection test passed")
        
        print("\n🎯 Database is ready!")
        print("   Database file: circuit_validator.db")
        print("   You can now start the backend server")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = init_database()
    if success:
        print("\n🚀 Ready to start Circuit Validator!")
    else:
        print("\n💥 Database initialization failed!")
        sys.exit(1)
