from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from services.ai_service import ai_service
from database import get_db
from models.chat import ChatSession, ChatMessage
from models.user import User
from routers.auth import get_current_user
from models import case as case_model
import shutil
import os

import pdfplumber
import io

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

# --- Pydantic Models ---
class MessageRequest(BaseModel):
    session_id: Optional[int] = None
    message: str

class NewSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"

class MessageResponse(BaseModel):
    response: str
    session_id: int

class SessionSchema(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatHistorySchema(BaseModel):
    role: str
    content: str
    document_name: Optional[str] = None

# --- Endpoints ---

@router.get("/sessions", response_model=List[SessionSchema])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()
    return sessions

@router.post("/sessions", response_model=SessionSchema)
def create_session(request: NewSessionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    new_session = ChatSession(title=request.title, user_id=current_user.id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/sessions/{session_id}", response_model=List[ChatHistorySchema])
def get_session_history(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # helper: messages should cascade delete if set up in models, but to be sure:
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"status": "success", "message": "Session deleted"}

@router.post("/message", response_model=MessageResponse)
def send_message(request: MessageRequest, db: Session = Depends(get_db)):
    session_id = request.session_id
    
    # 1. Create session if not exists
    if not session_id:
        new_session = ChatSession(title=request.message[:30] + "...")
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        session_id = new_session.id
    
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Save User Message
    user_msg = ChatMessage(session_id=session_id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # 3. Build Context for AI
    # Fetch last 10 messages for context
    # Fetch last 20 messages for context to avoid token limits with large files
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history = history[::-1] # Reverse back to chronological order
    
    messages_payload = [{"role": m.role, "content": m.content} for m in history]
    
    # 4. Get AI Response
    ai_response_text = ai_service.get_chat_response(messages_payload)

    # 5. Save AI Response
    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_response_text)
    db.add(ai_msg)
    
    # Update session timestamp
    session.updated_at = func.now()
    
    db.commit()

    return {"response": ai_response_text, "session_id": session_id}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    session_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        
        text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"

        # Save to disk for Library/Cases view
        file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{datetime.now().timestamp()}_{file.filename}")
        file.file.seek(0) # Reset file pointer to read again (if needed) or just write buffer
        # Since we read 'content' already, we can write 'content' to file_path
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Create CaseDocument
        new_case = case_model.CaseDocument(
            user_id=current_user.id,
            filename=file.filename,
            file_path=file_path,
            target_language="English", # Default
            translated_content="Auto-uploaded from Chat"
        )
        db.add(new_case)
        db.commit() # Commit to get ID if needed, but we mostly just need it saved
        
        # Save as a system/user message with context
        context_msg = f"Reading Document: {file.filename}\n\nContent:\n{text[:10000]}" # Limit context to avoid token limits
        if len(text) > 10000:
            context_msg += "\n...(document truncated)..."
            
        msg = ChatMessage(
            session_id=session_id, 
            role="user", 
            content=f"I have uploaded a document named '{file.filename}'. Use this context for our discussion.\n\n{context_msg}",
            document_name=file.filename
        )
        db.add(msg)
        db.commit()
        
        return {"status": "success", "message": "Document processed and added to context"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
