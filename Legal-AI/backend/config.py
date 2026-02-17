from pydantic_settings import BaseSettings
from typing import Optional
from urllib.parse import quote_plus

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = "sqlite:///./legal_ai.db"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # External APIs
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    @classmethod
    def clean_db_url(cls, v):
        if v and isinstance(v, str):
            # Remove 'export ' prefix if present
            v = v.replace('export ', '').replace('"', '')
            # Handle password special characters if needed, but primarily fix the prefix
            if v.startswith("DATABASE_URL="):
                v = v.split("=", 1)[1]
            
            # Auto-fix unescaped @ in password
            if "://" in v and "@" in v:
                try:
                    scheme, rest = v.split("://", 1)
                    # Split by the LAST @ which separates auth info from host
                    if "@" in rest:
                        auth_part, host_part = rest.rsplit("@", 1)
                        # If the auth part still contains @, it means the password or user has it unescaped
                        if "@" in auth_part and ":" in auth_part:
                            username, password = auth_part.split(":", 1)
                            password_encoded = quote_plus(password)
                            v = f"{scheme}://{username}:{password_encoded}@{host_part}"
                except Exception:
                    pass
        return v

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.DATABASE_URL:
            self.DATABASE_URL = self.clean_db_url(self.DATABASE_URL)

    class Config:
        env_file = ".env"

settings = Settings()
