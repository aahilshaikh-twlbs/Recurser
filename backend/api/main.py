from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
from typing import Optional
import json
import time

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.recursion_engine import RecursionEngine
from schemas.pydantic_models import (
    VideoGenerationRequest, VideoUploadRequest, ProjectStatus
)
from config.settings import settings
from database import get_db, create_tables
from sqlalchemy.orm import Session

app = FastAPI(
    title="Circuit Validator API",
    description="AI Video Generation Validator with Recursive Improvement",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded videos
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Initialize services
recursion_engine = RecursionEngine()

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    try:
        create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        raise e


@app.get("/")
async def root():
    return {
        "message": "Circuit Validator API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "video_generator": "available",
            "video_analyzer": "available",
            "recursion_engine": "available",
            "database": "available"
        }
    }


@app.post("/api/videos/generate")
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate a new video with recursive improvement
    """
    try:
        # Start the video generation process
        result = await recursion_engine.process_video_generation(request)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result,
            "message": "Video generation completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    original_prompt: str = Form(...),
    confidence_threshold: float = Form(default=85.0),
    max_attempts: int = Form(default=5),
    db: Session = Depends(get_db)
):
    """
    Upload an existing video for analysis and improvement
    """
    try:
        # Validate file type
        if not file.content_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="File must be a video")
        
        # Save uploaded file
        timestamp = int(time.time())
        filename = f"uploaded_video_{timestamp}_{file.filename}"
        filepath = os.path.join(settings.upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the uploaded video
        result = await recursion_engine.process_video_upload(
            filepath, original_prompt, confidence_threshold, max_attempts
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result,
            "message": "Video upload and analysis completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/{project_id}/status")
async def get_project_status(project_id: int, db: Session = Depends(get_db)):
    """
    Get the current status of a project
    """
    try:
        status = await recursion_engine.get_project_status(project_id)
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/videos/{video_filename}")
async def get_video(video_filename: str):
    """
    Get a specific video file
    """
    video_path = os.path.join(settings.upload_dir, video_filename)
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"video_path": f"/uploads/{video_filename}"}


@app.post("/api/analyze/prompt")
async def analyze_prompt(prompt: str):
    """
    Analyze a prompt for potential improvements before generation
    """
    try:
        # Basic prompt analysis
        analysis = {
            "prompt_length": len(prompt),
            "word_count": len(prompt.split()),
            "has_style_indicators": any(word in prompt.lower() for word in [
                "cinematic", "realistic", "artistic", "photorealistic", "3D", "animation"
            ]),
            "has_composition_indicators": any(word in prompt.lower() for word in [
                "close-up", "wide shot", "aerial", "POV", "tracking"
            ]),
            "suggestions": []
        }
        
        # Generate suggestions based on prompt analysis
        if len(prompt) < 50:
            analysis["suggestions"].append("Consider adding more descriptive details")
        
        if not analysis["has_style_indicators"]:
            analysis["suggestions"].append("Add style indicators (e.g., 'cinematic', 'realistic')")
        
        if not analysis["has_composition_indicators"]:
            analysis["suggestions"].append("Specify camera composition (e.g., 'close-up shot', 'aerial view')")
        
        return {
            "success": True,
            "data": analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
