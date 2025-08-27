import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Keys
    google_api_key: str
    twelvelabs_api_key: str
    
    # Database
    database_url: str = "sqlite:///./circuit_validator.db"
    
    # Security
    secret_key: str = "your_secret_key_here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # File Storage
    upload_dir: str = "./uploads"
    max_file_size: str = "100MB"
    
    # Video Generation Settings
    default_confidence_threshold: int = 85
    max_recursion_attempts: int = 5
    veo_model: str = "veo-3.0-generate-preview"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
