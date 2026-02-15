from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, verdicts, chat, cases, schedule, judgments
from backend.config import settings

app = FastAPI(
    title="Legal AI Assistant API",
    description="Backend for Legal AI Assistant with Supreme Court verdicts, Chatbot, and Case Management",
    version="1.0.0"
)

from backend.database import engine, Base
# Ensure all models are imported so tables are created
from backend.models import user as user_model, schedule as schedule_model, case as case_model 
Base.metadata.create_all(bind=engine)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add production domains here
    "*"  # For development convenience
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(verdicts.router, prefix="/api/verdicts", tags=["Verdicts"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chatbot"])
app.include_router(cases.router, prefix="/api/cases", tags=["Case Management"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["Court Schedule"])
app.include_router(judgments.router, prefix="/api/judgments", tags=["Live Judgments"])

@app.get("/")
async def root():
    return {"message": "Welcome to Legal AI Assistant API", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
