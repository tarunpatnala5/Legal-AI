from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import settings

# Use SQLite for development if no DB URL is provided
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL or "sqlite:///./legal_ai.db"

# Check if using SQLite to add specific connect args
print(f"DEBUG: SQLALCHEMY_DATABASE_URL = '{SQLALCHEMY_DATABASE_URL}'")
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
