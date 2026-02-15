from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from backend.database import get_db
from backend.models import schedule as schedule_model
from backend.models import user as user_model
from backend.routers.auth import get_current_user

router = APIRouter()

class ScheduleCreate(BaseModel):
    case_name: str
    court_date: datetime
    reminder_date: datetime
    status: str = "Scheduled"
    notification_enabled: bool = True

class ScheduleResponse(BaseModel):
    id: int
    case_name: str
    court_date: datetime
    status: str
    notification_enabled: bool
    progress: str | None

    class Config:
        from_attributes = True

@router.post("/", response_model=ScheduleResponse)
def create_schedule(
    schedule: ScheduleCreate,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_schedule = schedule_model.Schedule(
        user_id=current_user.id,
        case_name=schedule.case_name,
        court_date=schedule.court_date,
        reminder_date=schedule.reminder_date,
        status=schedule.status,
        notification_enabled=schedule.notification_enabled
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

@router.get("/", response_model=List[ScheduleResponse])
def get_schedules(
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(schedule_model.Schedule).filter(schedule_model.Schedule.user_id == current_user.id).all()

@router.get("/upcoming", response_model=List[ScheduleResponse])
def get_upcoming_schedules(
    days: int = 7,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import timedelta
    now = datetime.utcnow()
    future = now + timedelta(days=days)
    
    return db.query(schedule_model.Schedule).filter(
        schedule_model.Schedule.user_id == current_user.id,
        schedule_model.Schedule.court_date >= now,
        schedule_model.Schedule.court_date <= future
    ).all()

@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    schedule = db.query(schedule_model.Schedule).filter(
        schedule_model.Schedule.id == schedule_id,
        schedule_model.Schedule.user_id == current_user.id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted successfully"}
