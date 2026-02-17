from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class BrowsingHistory(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    page_url = Column(String(500))
    page_title = Column(String(255), nullable=True)
    visited_at = Column(DateTime(timezone=True), server_default=func.now())
