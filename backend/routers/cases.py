from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import io
import mimetypes
import pdfplumber
from datetime import datetime

from database import get_db
from models import case as case_model
from models import user as user_model
from routers.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter()

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Helpers ─────────────────────────────────────────────────────────────────

def extract_pdf_text(file_path: str) -> str:
    """Extract plain text from a PDF using pdfplumber."""
    text_parts = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        print(f"PDF extraction error: {e}")
    return "\n".join(text_parts).strip()


def translate_text_via_ai(text: str, target_language: str) -> str:
    """Use Together AI to translate the extracted text."""
    # Chunk large texts to stay within token limits
    MAX_CHUNK = 6000
    chunks = [text[i:i+MAX_CHUNK] for i in range(0, len(text), MAX_CHUNK)]
    translated_chunks = []

    for chunk in chunks:
        prompt = (
            f"Translate the following legal document text into {target_language}. "
            f"Preserve all legal terminology, paragraph structure, and formatting. "
            f"Return ONLY the translated text, nothing else.\n\n"
            f"--- TEXT TO TRANSLATE ---\n{chunk}"
        )
        messages = [{"role": "user", "content": prompt}]
        result = ai_service.get_chat_response(messages, max_tokens=3000)
        translated_chunks.append(result)

    return "\n\n".join(translated_chunks)


def do_translation_background(case_id: int, file_path: str, target_language: str):
    """Background task: extract → translate → save to DB."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        case = db.query(case_model.CaseDocument).filter(case_model.CaseDocument.id == case_id).first()
        if not case:
            return

        # Extract raw text
        raw_text = extract_pdf_text(file_path)
        if not raw_text:
            translated = "Could not extract text from this PDF."
        elif target_language.lower() in ("english", "en"):
            # Already English — just store the extracted text
            translated = raw_text
        else:
            translated = translate_text_via_ai(raw_text, target_language)

        case.translated_content = translated
        db.commit()
    except Exception as e:
        print(f"Translation background task error: {e}")
        try:
            case = db.query(case_model.CaseDocument).filter(case_model.CaseDocument.id == case_id).first()
            if case:
                case.translated_content = f"Translation failed: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_case(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form("English"),
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
        translated_content="Translating… please check back in a moment."
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Kick off translation in background so the upload response is instant
    background_tasks.add_task(do_translation_background, new_case.id, file_path, language)

    return {"message": "File uploaded successfully. Translation is in progress.", "case_id": new_case.id}


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
            "target_language": c.target_language,
        } for c in cases
    ]


@router.get("/{case_id}")
def get_case(
    case_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the case metadata + translated_content for the viewer page."""
    case = db.query(case_model.CaseDocument).filter(
        case_model.CaseDocument.id == case_id,
        case_model.CaseDocument.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": case.id,
        "filename": case.filename,
        "uploaded_at": str(case.uploaded_at),
        "target_language": case.target_language,
        "translated_content": case.translated_content or "",
    }


@router.get("/{case_id}/download")
def download_case(
    case_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download the translated content as a .txt file."""
    case = db.query(case_model.CaseDocument).filter(
        case_model.CaseDocument.id == case_id,
        case_model.CaseDocument.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Document not found")

    content = case.translated_content or ""
    txt_filename = os.path.splitext(case.filename)[0] + f"_{case.target_language}.txt"
    encoded = content.encode("utf-8")

    headers = {
        "Content-Disposition": f'attachment; filename="{txt_filename}"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(
        io.BytesIO(encoded),
        media_type="text/plain; charset=utf-8",
        headers=headers
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
    if os.path.exists(case.file_path):
        os.remove(case.file_path)
    db.delete(case)
    db.commit()
    return {"message": "Document deleted successfully"}
