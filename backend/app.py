from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import sqlite3
import os
import time
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class VideoGenerationRequest(BaseModel):
    prompt: str
    confidence_threshold: float = 85.0  # Optional, for future analysis

class VideoResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# FastAPI app
app = FastAPI(
    title="Recurser Validator API",
    description="Simple AI Video Generation",
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

# Database setup
DB_PATH = "recurser_validator.db"

def init_db():
    """Initialize SQLite database with simple tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Simple videos table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            video_path TEXT,
            confidence_threshold REAL DEFAULT 85.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized successfully")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {
        "message": "Recurser Validator API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "sqlite",
        "endpoints": ["/api/videos/generate", "/api/videos/upload", "/api/videos/{id}/status"]
    }

@app.post("/api/videos/generate")
async def generate_video(request: VideoGenerationRequest):
    """Generate a new video - simple pipeline"""
    try:
        logger.info(f"🎬 Video generation request: {request.prompt}")
        
        # Store video request in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO videos (prompt, status, confidence_threshold)
            VALUES (?, ?, ?)
        """, (request.prompt, "generating", request.confidence_threshold))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # SIMPLE PIPELINE: Just generate the video
        logger.info(f"🚀 Starting video generation for ID {video_id}")
        
        # TODO: Replace this with actual AI video generation
        # For now, just simulate success
        simulated_video_path = f"generated_video_{video_id}.mp4"
        
        # Update status to completed
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET status = ?, video_path = ? WHERE id = ?
        """, ("completed", simulated_video_path, video_id))
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Video generation completed for ID {video_id}")
        
        return VideoResponse(
            success=True,
            message="Video generated successfully!",
            data={
                "video_id": video_id,
                "status": "completed",
                "prompt": request.prompt,
                "video_path": simulated_video_path,
                "confidence_threshold": request.confidence_threshold
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    original_prompt: str = Form(...)
):
    """Upload an existing video for analysis"""
    try:
        logger.info(f"📁 Video upload: {file.filename}")
        
        # Validate file type
        if not file.content_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="File must be a video")
        
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        timestamp = int(time.time())
        filename = f"uploaded_video_{timestamp}_{file.filename}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Store in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO videos (prompt, status, video_path)
            VALUES (?, ?, ?)
        """, (original_prompt, "uploaded", filepath))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Video uploaded successfully: {filename}")
        
        return VideoResponse(
            success=True,
            message="Video uploaded successfully",
            data={
                "video_id": video_id,
                "filename": filename,
                "status": "uploaded",
                "original_prompt": original_prompt
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/status")
async def get_video_status(video_id: int):
    """Get the current status of a video"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "video_id": video[0],
                "prompt": video[1],
                "status": video[2],
                "video_path": video[3],
                "created_at": video[4]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos")
async def list_videos():
    """List all videos"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM videos ORDER BY created_at DESC")
        videos = cursor.fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "data": [
                {
                    "video_id": video[0],
                    "prompt": video[1],
                    "status": video[2],
                    "video_path": video[3],
                    "created_at": video[4]
                }
                for video in videos
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ List videos error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Remove the uvicorn.run() from here since we're using run_simple.py
