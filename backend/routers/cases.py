from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
from datetime import datetime

from database import get_db
from models import case as case_model
from models import user as user_model
from routers.auth import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_case(
    file: UploadFile = File(...),
    language: str = Form("English"), # Target language
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{datetime.now().timestamp()}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_case = case_model.CaseDocument(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        target_language=language,
        translated_content="Pending Translation..." # Placeholder for async translation
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    return {"message": "File uploaded successfully", "case_id": new_case.id}

@router.get("/", response_model=List[dict]) 
def list_cases(
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cases = db.query(case_model.CaseDocument).filter(case_model.CaseDocument.user_id == current_user.id).all()
    return [
        {
            "id": c.id, 
            "filename": c.filename, 
            "uploaded_at": c.uploaded_at,
            "target_language": c.target_language
        } for c in cases
    ]

@router.get("/{case_id}/download")
def download_case(
    case_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(case_model.CaseDocument).filter(
        case_model.CaseDocument.id == case_id,
        case_model.CaseDocument.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(case.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(
        path=case.file_path,
        filename=case.filename,
        media_type="application/octet-stream"
    )

@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(case_model.CaseDocument).filter(
        case_model.CaseDocument.id == case_id,
        case_model.CaseDocument.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove file from disk if it exists
    if os.path.exists(case.file_path):
        os.remove(case.file_path)
    db.delete(case)
    db.commit()
    return {"message": "Document deleted successfully"}

