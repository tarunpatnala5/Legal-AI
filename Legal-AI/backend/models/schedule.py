from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    case_name = Column(String(255))
    court_date = Column(DateTime)
    reminder_date = Column(DateTime)
    
    status = Column(String(50), default="Scheduled") # Scheduled, In Progress, Closed
    progress = Column(Text, nullable=True) # Notes on progress
    notification_enabled = Column(Boolean, default=True)
    
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
