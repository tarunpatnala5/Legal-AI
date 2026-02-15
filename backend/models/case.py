from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.database import Base

class CaseDocument(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255))
    file_path = Column(String(500))  # Path to stored PDF
    original_language = Column(String(50), default="English")
    
    # Store translated content or path to translated file
    translated_content = Column(Text, nullable=True)
    target_language = Column(String(50), nullable=True)
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # owner = relationship("User", back_populates="cases")
