from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter()

class Verdict(BaseModel):
    id: int
    title: str
    summary: str
    effective_date: str
    details: str

# Mock Data simulating Indian Supreme Court verdicts
MOCK_VERDICTS = [
    {
        "id": 1,
        "title": "Sulochana Amma vs Narayanan Nair",
        "summary": "Section Supreme Court of India - 1994 AIR 152, 1994 SCC (2) 14",
        "effective_date": "Tue Oct 23 2018",
        "details": "Clarification on inheritance rights and property succession."
    },
    {
        "id": 2,
        "title": "Estoppel : Indian Evidence Act, 1872 section 115",
        "summary": "Estoppel regarding land acquisition disputes.",
        "effective_date": "Tue Oct 23 2018",
        "details": "Ruling on the applicability of Estoppel against the government statutes."
    },
    {
        "id": 3,
        "title": "Res Judicata",
        "summary": "Section 11 of the Code of Civil Procedure",
        "effective_date": "Tue Oct 23 2018",
        "details": "Finality of judgment and preventing re-litigation of the same cause of action."
    },
    {
        "id": 4,
        "title": "Fundamental Rights vs Directive Principles",
        "summary": "Minerva Mills Ltd. vs Union of India",
        "effective_date": "Mon Oct 22 2018",
        "details": "Balance between Fundamental Rights and Directive Principles of State Policy."
    }
]

@router.get("/recent", response_model=List[Verdict])
def get_recent_verdicts():
    # In production, this would fetch from Indian Kanoon API or Database
    return MOCK_VERDICTS
