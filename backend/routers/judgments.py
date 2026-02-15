from fastapi import APIRouter, HTTPException
from backend.services.sci_scraper import fetch_live_judgments
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class Judgment(BaseModel):
    title: str
    text: str
    link: str
    date: str
    category: str

@router.get("/live", response_model=List[Judgment])
def get_live_judgments():
    try:
        data = fetch_live_judgments()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
