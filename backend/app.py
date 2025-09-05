from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import sqlite3
import os
import time
import json
import asyncio
import uuid
from datetime import datetime
import logging
from dotenv import load_dotenv
from google import genai

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Google Veo API configuration (using official Google GenAI client)
GEMINI_API_KEY = os.getenv("gemini_api_key")

# Validate API key
if not GEMINI_API_KEY:
    logger.error("❌ GEMINI_API_KEY not found in environment variables!")
    logger.error("   Please create a .env file with: gemini_api_key=YOUR_ACTUAL_GEMINI_API_KEY")
    logger.error("   Get your key from: https://makersuite.google.com/app/apikey")
    GEMINI_API_KEY = "MISSING_API_KEY"  # Prevent crashes, but will fail API calls

# Configure Google GenAI client
# The client will use the API key from environment variable automatically

# Pydantic models
class VideoGenerationRequest(BaseModel):
    prompt: str
    confidence_threshold: float = 85.0  # Optional, for future analysis

class VideoResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class VideoStatus(BaseModel):
    video_id: int
    status: str
    progress: int
    message: str
    video_path: Optional[str] = None

# FastAPI app
app = FastAPI(
    title="Recurser Validator API",
    description="Production AI Video Generation with Google Veo",
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
    """Initialize SQLite database with production tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Drop existing table to ensure clean schema
    cursor.execute("DROP TABLE IF EXISTS videos")
    
    # Create fresh production videos table
    cursor.execute("""
        CREATE TABLE videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            video_path TEXT,
            confidence_threshold REAL DEFAULT 85.0,
            progress INTEGER DEFAULT 0,
            generation_id TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info("✅ Production database initialized successfully with clean schema")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {
        "message": "Recurser Validator API",
        "version": "1.0.0",
        "status": "production-ready"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "sqlite",
        "video_generation": "google-veo",
        "endpoints": ["/api/videos/generate", "/api/videos/upload", "/api/videos/{id}/status"]
    }

async def generate_video_with_veo(prompt: str, video_id: int):
    """Real Google Veo video generation with progress tracking"""
    try:
        logger.info(f"🎬 Starting Google Veo generation for video {video_id}")
        
        # Validate API key first
        if not GEMINI_API_KEY or GEMINI_API_KEY == "MISSING_API_KEY":
            error_msg = "Gemini API key not configured. Please check your .env file."
            logger.error(f"❌ {error_msg}")
            
            # Update error status
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("failed", error_msg, video_id))
            conn.commit()
            conn.close()
            return
        
        # Update status to generating
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, ("generating", 10, video_id))
        conn.commit()
        conn.close()
        
        # Update progress
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET progress = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (25, video_id))
        conn.commit()
        conn.close()
        
        # REAL GOOGLE VEO API CALL (using official Google GenAI client)
        logger.info(f"🎥 Calling Google Veo 3 API for video {video_id}")
        logger.info(f"🔑 Using Gemini API key: {GEMINI_API_KEY[:10]}...")
        logger.info(f"🎬 Prompt: {prompt}")
        
        # Update progress
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET progress = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (50, video_id))
        conn.commit()
        conn.close()
        
                # Make the actual API call using official Google GenAI client
        try:
            logger.info(f"🚀 Starting Veo 3 video generation...")
            
            # Create GenAI client and start video generation
            client = genai.Client(api_key=GEMINI_API_KEY)
            operation = client.models.generate_videos(
                model="veo-3.0-generate-preview",
                prompt=f"Generate a high-quality video based on this description: {prompt}. Make it cinematic, realistic, and engaging."
            )
            
            logger.info(f"📥 Video generation operation started: {operation.name}")
            
            # Poll the operation status until the video is ready
            while not operation.done:
                logger.info(f"⏳ Waiting for video generation to complete... Progress: {operation.metadata.progress_percent if hasattr(operation.metadata, 'progress_percent') else 'Unknown'}%")
                await asyncio.sleep(10)  # Wait 10 seconds between checks
                operation = client.operations.get(operation)
            
            logger.info(f"✅ Video generation completed!")
            
            # Get the generated video
            generated_video = operation.response.generated_videos[0]
            logger.info(f"📹 Generated video: {generated_video}")
            
            # Download the video
            video_data = client.files.download(file=generated_video.video)
            logger.info(f"💾 Downloaded video data: {len(video_data)} bytes")
            
            # Save the video to file
            timestamp = int(time.time())
            video_filename = f"veo_generated_{video_id}_{timestamp}.mp4"
            video_path = os.path.join("uploads", video_filename)
            
            # Ensure uploads directory exists
            os.makedirs("uploads", exist_ok=True)
            
            # Save the video file
            with open(video_path, "wb") as f:
                f.write(video_data)
            
            logger.info(f"💾 Video saved to: {video_path}")
            
        except Exception as api_error:
            logger.error(f"❌ Veo API error: {str(api_error)}")
            logger.error(f"   Error type: {type(api_error)}")
            
            # Update error status
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("failed", str(api_error), video_id))
            conn.commit()
            conn.close()
            return
        
        # Update final status to completed
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET status = ?, progress = ?, video_path = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, ("completed", 100, video_path, video_id))
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Google Veo generation completed for video {video_id} at {video_path}")
                
    except Exception as e:
        logger.error(f"❌ Veo generation error for video {video_id}: {str(e)}")
        
        # Update error status
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, ("failed", str(e), video_id))
        conn.commit()
        conn.close()

@app.post("/api/videos/generate")
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """Generate a new video with Google Veo - production ready"""
    try:
        logger.info(f"🎬 Video generation request: {request.prompt}")
        
        # Store video request in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        generation_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO videos (prompt, status, confidence_threshold, progress, generation_id)
            VALUES (?, ?, ?, ?, ?)
        """, (request.prompt, "pending", request.confidence_threshold, 0, generation_id))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Start background video generation
        background_tasks.add_task(generate_video_with_veo, request.prompt, video_id)
        
        logger.info(f"🚀 Started Google Veo generation for video {video_id}")
        
        return VideoResponse(
            success=True,
            message="Video generation started! Check status endpoint for progress.",
            data={
                "video_id": video_id,
                "generation_id": generation_id,
                "status": "pending",
                "prompt": request.prompt,
                "confidence_threshold": request.confidence_threshold
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/status")
async def get_video_status(video_id: int):
    """Get the current status and progress of a video"""
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
                "confidence_threshold": video[4],
                "progress": video[5] or 0,
                "generation_id": video[6],
                "error_message": video[7],
                "created_at": video[8],
                "updated_at": video[9]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}")
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
            INSERT INTO videos (prompt, status, video_path, progress)
            VALUES (?, ?, ?, ?)
        """, (original_prompt, "uploaded", filepath, 100))
        
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

@app.get("/api/videos")
async def list_videos():
    """List all videos with status and progress"""
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
                    "confidence_threshold": video[4],
                    "progress": video[5] or 0,
                    "generation_id": video[6],
                    "error_message": video[7],
                    "created_at": video[8],
                    "updated_at": video[9]
                }
                for video in videos
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ List videos error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/play")
async def play_video(video_id: int):
    """Play a generated video file"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT video_path FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video[0]
        conn.close()
        
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        
        # Return the video file for playback
        return FileResponse(
            path=video_path,
            media_type="video/mp4",
            filename=f"video_{video_id}.mp4"
        )
        
    except Exception as e:
        logger.error(f"❌ Video playback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
