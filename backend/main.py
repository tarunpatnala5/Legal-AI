from fastapi import FastAPI
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, verdicts, chat, cases, schedule, judgments
from config import settings

app = FastAPI(
    title="Legal AI Assistant API",
    description="Backend for Legal AI Assistant with Supreme Court verdicts, Chatbot, and Case Management",
    version="1.0.0"
)

from database import engine, Base, SessionLocal
# Ensure all models are imported so tables are created
from models import user as user_model, schedule as schedule_model, case as case_model
from models import chat as chat_model
Base.metadata.create_all(bind=engine)

# Seed admin account on startup
from routers.auth import seed_admin
with SessionLocal() as db:
    seed_admin(db)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(verdicts.router, prefix="/verdicts", tags=["Verdicts"])
app.include_router(chat.router, prefix="/chat", tags=["AI Chatbot"])
app.include_router(cases.router, prefix="/cases", tags=["Case Management"])
app.include_router(schedule.router, prefix="/schedule", tags=["Court Schedule"])
app.include_router(judgments.router, prefix="/judgments", tags=["Live Judgments"])

@app.get("/")
async def root():
    return {"message": "Welcome to Legal AI Assistant API", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.head("/health")
def health_head(response: Response):
    response.status_code = 200

@app.head("/")
def root_head(response: Response):
    response.status_code = 200
