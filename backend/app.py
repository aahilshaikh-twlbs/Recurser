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
    confidence_threshold: float = 85.0
    max_attempts: int = 5

class VideoUploadRequest(BaseModel):
    original_prompt: str
    confidence_threshold: float = 85.0
    max_attempts: int = 5

class VideoResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# FastAPI app
app = FastAPI(
    title="Recurser Validator API",
    description="Simple AI Video Generation & Validation",
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
    
    # Simple projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            confidence_threshold REAL DEFAULT 85.0,
            max_attempts INTEGER DEFAULT 5,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Simple iterations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS iterations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            iteration_number INTEGER,
            prompt TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
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
        "endpoints": ["/api/videos/generate", "/api/videos/upload", "/api/projects/{id}/status"]
    }

@app.post("/api/videos/generate")
async def generate_video(request: VideoGenerationRequest):
    """Generate a new video with recursive improvement"""
    try:
        logger.info(f"🎬 Video generation request: {request.prompt[:50]}...")
        
        # Store project in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO projects (prompt, confidence_threshold, max_attempts, status)
            VALUES (?, ?, ?, ?)
        """, (request.prompt, request.confidence_threshold, request.max_attempts, "processing"))
        
        project_id = cursor.lastrowid
        
        # Create first iteration
        cursor.execute("""
            INSERT INTO iterations (project_id, iteration_number, prompt, status)
            VALUES (?, ?, ?, ?)
        """, (project_id, 1, request.prompt, "processing"))
        
        conn.commit()
        conn.close()
        
        # Simulate video generation (replace with actual AI calls)
        logger.info(f"🚀 Starting video generation for project {project_id}")
        
        return VideoResponse(
            success=True,
            message="Video generation started successfully",
            data={
                "project_id": project_id,
                "status": "processing",
                "prompt": request.prompt,
                "confidence_threshold": request.confidence_threshold
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    original_prompt: str = Form(...),
    confidence_threshold: float = Form(default=85.0),
    max_attempts: int = Form(default=5)
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
            INSERT INTO projects (prompt, confidence_threshold, max_attempts, status)
            VALUES (?, ?, ?, ?)
        """, (original_prompt, confidence_threshold, max_attempts, "uploaded"))
        
        project_id = cursor.lastrowid
        
        cursor.execute("""
            INSERT INTO iterations (project_id, iteration_number, prompt, status)
            VALUES (?, ?, ?, ?)
        """, (project_id, 0, original_prompt, "uploaded"))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Video uploaded successfully: {filename}")
        
        return VideoResponse(
            success=True,
            message="Video uploaded and analysis started",
            data={
                "project_id": project_id,
                "filename": filename,
                "status": "uploaded",
                "original_prompt": original_prompt
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}/status")
async def get_project_status(project_id: int):
    """Get the current status of a project"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get project info
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = cursor.fetchone()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get iterations
        cursor.execute("SELECT * FROM iterations WHERE project_id = ? ORDER BY iteration_number", (project_id,))
        iterations = cursor.fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "project_id": project_id,
                "prompt": project[1],
                "confidence_threshold": project[2],
                "max_attempts": project[3],
                "status": project[4],
                "created_at": project[5],
                "iterations": [
                    {
                        "iteration_number": iter[2],
                        "prompt": iter[3],
                        "status": iter[4],
                        "created_at": iter[5]
                    }
                    for iter in iterations
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyze/prompt")
async def analyze_prompt(prompt: str):
    """Analyze a prompt for potential improvements"""
    try:
        # Simple prompt analysis
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
        
        # Generate suggestions
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
        logger.error(f"❌ Prompt analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
