from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import secrets

from database import get_db
from models import user as user_model
from config import settings
from services.email_service import send_password_reset_email

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# ──────────────────────────── Schemas ────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AdminUserDetail(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_active: bool
    created_at: Optional[datetime] = None
    hashed_password: str
    chat_sessions: int
    cases: int
    schedules: int

    class Config:
        from_attributes = True

# ──────────────────────────── Utils ────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[user_model.User]:
    """Returns the current user from JWT token, or None if not logged in."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    user = db.query(user_model.User).filter(user_model.User.email == email).first()
    return user

def require_user(current_user: Optional[user_model.User] = Depends(get_current_user)) -> user_model.User:
    """Raises 401 if not logged in."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def require_admin(current_user: user_model.User = Depends(require_user)) -> user_model.User:
    """Raises 403 if not admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

def seed_admin(db: Session):
    """Create default admin account if it doesn't exist."""
    existing = db.query(user_model.User).filter(user_model.User.email == "admin").first()
    if not existing:
        admin = user_model.User(
            email="admin",
            hashed_password=get_password_hash("1234567890"),
            full_name="Administrator",
            is_admin=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("[STARTUP] Admin account seeded — email: admin, password: 1234567890")

# ──────────────────────────── Endpoints ────────────────────────────

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(user_model.User).filter(user_model.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = user_model.User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        is_admin=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(user_model.User).filter(user_model.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_me(current_user: user_model.User = Depends(require_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    update: ProfileUpdate,
    current_user: user_model.User = Depends(require_user),
    db: Session = Depends(get_db),
):
    if update.email and update.email != current_user.email:
        if db.query(user_model.User).filter(user_model.User.email == update.email).first():
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current_user.email = update.email

    if update.full_name:
        current_user.full_name = update.full_name

    if update.new_password:
        if not update.current_password:
            raise HTTPException(status_code=400, detail="Current password required to set a new password")
        if not verify_password(update.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = get_password_hash(update.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(user_model.User).filter(user_model.User.email == request.email).first()
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If that email exists, a reset link was sent."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    email_sent = send_password_reset_email(user.email, token)
    return {
        "message": "If that email exists, a reset link was sent.",
        "email_sent": email_sent,
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(user_model.User).filter(
        user_model.User.reset_token == request.token
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expiry and datetime.utcnow() > user.reset_token_expiry:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"message": "Password reset successfully"}

@router.get("/users", response_model=List[AdminUserDetail])
def get_all_users(
    _admin: user_model.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from models.chat import ChatSession
    from models.case import CaseDocument
    from models.schedule import Schedule

    users = db.query(user_model.User).all()
    result = []
    for u in users:
        chat_count = db.query(ChatSession).filter(ChatSession.user_id == u.id).count()
        case_count = db.query(CaseDocument).filter(CaseDocument.user_id == u.id).count()
        sched_count = db.query(Schedule).filter(Schedule.user_id == u.id).count()
        result.append(AdminUserDetail(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_admin=u.is_admin,
            is_active=u.is_active,
            created_at=u.created_at,
            hashed_password=u.hashed_password,
            chat_sessions=chat_count,
            cases=case_count,
            schedules=sched_count,
        ))
    return result

@router.delete("/me")
def delete_own_account(
    current_user: user_model.User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Allow a logged-in user to permanently delete their own account."""
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: user_model.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    target = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(target)
    db.commit()
    return {"message": "User deleted successfully"}

