from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import sqlite3
import os
import time
import json
import asyncio
import uuid
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv
# Remove incorrect genai import - using google.generativeai where needed
import httpx
from twelvelabs import TwelveLabs
from contextlib import asynccontextmanager
from collections import defaultdict
import queue

# Load environment variables
load_dotenv()

# Configure logging with reduced verbosity
logging.basicConfig(level=logging.WARNING)  # Only show warnings and errors by default
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Keep our app logs at INFO level

# Reduce HTTP access log verbosity
logging.getLogger('uvicorn.access').setLevel(logging.WARNING)

# Global log buffer for real-time streaming
global_log_buffer = []

class StreamLogHandler(logging.Handler):
    """Custom log handler that streams logs to frontend"""
    def emit(self, record):
        log_entry = self.format(record)
        global_log_buffer.append({
            'log': log_entry,
            'timestamp': datetime.now().isoformat(),
            'source': 'backend_terminal',
            'level': record.levelname
        })
        # Keep only last 2000 logs to prevent memory issues
        if len(global_log_buffer) > 2000:
            global_log_buffer.pop(0)

# Add the custom handler to the logger
stream_handler = StreamLogHandler()
stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(stream_handler)

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TWELVELABS_API_KEY = os.getenv("TWELVELABS_API_KEY", "tlk_3JEVNXJ253JH062DSN3ZX1A6SXKG")

# Hardcoded values for testing
DEFAULT_INDEX_ID = "68d0f9e55705aa622335acb0"  # Recurser Test index (for iterations)

# Default to Veo2 (cheaper option)
DEFAULT_VEO_MODEL = "veo-2.0-generate-001"

# Validate API keys
if not GEMINI_API_KEY:
    logger.error("❌ GEMINI_API_KEY not found in environment variables!")
    GEMINI_API_KEY = "MISSING_API_KEY"

if not TWELVELABS_API_KEY:
    logger.error("❌ TWELVELABS_API_KEY not found in environment variables!")
    TWELVELABS_API_KEY = "MISSING_API_KEY"

# Fix for streaming JSON responses from Pegasus API
def parse_streaming_json(response_text):
    """Parse streaming JSON response and extract the final result"""
    lines = response_text.strip().split('\n')
    result_text = ''
    usage = None
    generation_id = None
    
    for line in lines:
        if line.strip():
            try:
                data = json.loads(line)
                if data.get('event_type') == 'stream_start':
                    generation_id = data.get('metadata', {}).get('generation_id')
                elif data.get('event_type') == 'text_generation':
                    result_text += data.get('text', '')
                elif data.get('event_type') == 'stream_end':
                    usage = data.get('metadata', {}).get('usage')
            except json.JSONDecodeError:
                continue
    
    return {
        'id': generation_id or 'unknown',
        'data': result_text,
        'usage': usage
    }

# Monkey patch httpx to handle streaming JSON
original_json = httpx.Response.json

def patched_json(self, **kwargs):
    try:
        return original_json(self, **kwargs)
    except json.JSONDecodeError as e:
        if 'Extra data' in str(e):
            return parse_streaming_json(self.text)
        else:
            raise e

httpx.Response.json = patched_json

# Pydantic Models
class VideoGenerationRequest(BaseModel):
    prompt: str
    project_name: Optional[str] = None
    confidence_threshold: float = 100.0
    max_retries: int = 3
    index_id: Optional[str] = None
    twelvelabs_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    video_id: Optional[str] = None  # For playground video enhancement
    is_playground_video: Optional[bool] = False

class VideoUploadRequest(BaseModel):
    original_prompt: Optional[str] = None
    confidence_threshold: float = 100.0
    max_retries: int = 3
    index_id: str
    twelvelabs_api_key: str
    gemini_api_key: Optional[str] = None

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
    analysis_results: Optional[Dict[str, Any]] = None

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)
    pass

# FastAPI app
app = FastAPI(
    title="Recurser Validator API",
    description="AI Video Generation with Quality Validation",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow all origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Database setup
DB_PATH = "recurser_validator.db"

# Progress tracking
progress_logs = {}

# SSE log streaming - store queues for each video_id
log_streams = defaultdict(list)  # video_id -> list of asyncio.Queue objects

def log_progress(video_id: int, message: str, progress: int = None, status: str = None):
    """Log progress for a video with timestamp and update database"""
    timestamp = time.strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    
    if video_id not in progress_logs:
        progress_logs[video_id] = []
    
    progress_logs[video_id].append(log_entry)
    
    # Update database with progress, status, and logs
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Update progress if provided
    if progress is not None:
        cursor.execute("UPDATE videos SET progress = ? WHERE id = ?", (progress, video_id))
    
    # Update status if provided
    if status is not None:
        cursor.execute("UPDATE videos SET status = ? WHERE id = ?", (status, video_id))
    
    # Update detailed logs
    try:
        # Get current logs from database
        cursor.execute("SELECT detailed_logs FROM videos WHERE id = ?", (video_id,))
        result = cursor.fetchone()
        current_logs = []
        if result and result[0]:
            try:
                current_logs = json.loads(result[0]) if isinstance(result[0], str) else result[0]
            except:
                current_logs = []
        
        # Add new log entry
        current_logs.append(log_entry)
        
        # Store updated logs
        cursor.execute("UPDATE videos SET detailed_logs = ? WHERE id = ?", 
                      (json.dumps(current_logs), video_id))
    except Exception as e:
        logger.error(f"Error updating logs: {e}")
    
    conn.commit()
    conn.close()
    
    logger.info(f"📊 Video {video_id}: {message}")

def log_detailed(video_id: int, message: str, level: str = "INFO"):
    """Log detailed information that appears in both console and frontend - broadcasts to SSE clients in real-time"""
    timestamp = time.strftime("%H:%M:%S")
    
    # Format based on level
    if level == "ERROR":
        log_entry = f"[{timestamp}] ❌ {message}"
        logger.error(f"📊 Video {video_id}: {message}")
    elif level == "WARNING":
        log_entry = f"[{timestamp}] ⚠️ {message}"
        logger.warning(f"📊 Video {video_id}: {message}")
    elif level == "SUCCESS":
        log_entry = f"[{timestamp}] ✅ {message}"
        logger.info(f"📊 Video {video_id}: {message}")
    else:
        log_entry = f"[{timestamp}] ℹ️ {message}"
        logger.info(f"📊 Video {video_id}: {message}")
    
    # Store in memory for real-time access
    if video_id not in progress_logs:
        progress_logs[video_id] = []
    progress_logs[video_id].append(log_entry)
    
    # Broadcast to SSE clients in real-time
    if video_id in log_streams and log_streams[video_id]:
        # Send to all connected clients for this video
        disconnected_queues = []
        for client_queue in log_streams[video_id]:
            try:
                client_queue.put_nowait(log_entry)
            except:
                # Queue is full or closed, mark for removal
                disconnected_queues.append(client_queue)
        
        # Clean up disconnected clients
        for dead_queue in disconnected_queues:
            log_streams[video_id].remove(dead_queue)
    
    # Store in database for persistence
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get current logs from database
        cursor.execute("SELECT detailed_logs FROM videos WHERE id = ?", (video_id,))
        result = cursor.fetchone()
        current_logs = []
        if result and result[0]:
            try:
                current_logs = json.loads(result[0]) if isinstance(result[0], str) else result[0]
            except:
                current_logs = []
        
        # Add new log entry
        current_logs.append(log_entry)
        
        # Store updated logs
        cursor.execute("UPDATE videos SET detailed_logs = ? WHERE id = ?", 
                      (json.dumps(current_logs), video_id))
    except Exception as e:
        logger.error(f"Error updating detailed logs: {e}")
    
    conn.commit()
    conn.close()

def init_db():
    """Initialize SQLite database with comprehensive schema"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Drop existing tables
    cursor.execute("DROP TABLE IF EXISTS videos")
    cursor.execute("DROP TABLE IF EXISTS generation_tasks")
    cursor.execute("DROP TABLE IF EXISTS analysis_results")
    
    # Create videos table with iteration tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            enhanced_prompt TEXT,
            status TEXT DEFAULT 'pending',
            video_path TEXT,
            confidence_threshold REAL DEFAULT 100.0,
            current_confidence REAL DEFAULT 0.0,
            progress INTEGER DEFAULT 0,
            generation_id TEXT,
            error_message TEXT,
            index_id TEXT,
            twelvelabs_video_id TEXT,
            iteration_count INTEGER DEFAULT 1,
            max_iterations INTEGER DEFAULT 3,
            source_video_id TEXT,
            ai_detection_score REAL DEFAULT 0.0,
            ai_detection_confidence REAL DEFAULT 0.0,
            ai_detection_details TEXT,
            detailed_logs TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create generation_tasks table with iteration tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generation_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER,
            iteration_number INTEGER DEFAULT 1,
            task_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos (id)
        )
    """)
    
    # Create analysis_results table with iteration tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER,
            iteration_number INTEGER DEFAULT 1,
            search_results TEXT,
            analysis_results TEXT,
            quality_score REAL,
            ai_detection_score REAL,
            confidence_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos (id)
        )
    """)
    
    # Add detailed_logs column if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE videos ADD COLUMN detailed_logs TEXT")
        conn.commit()
        logger.info("✅ Added detailed_logs column to videos table")
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized with comprehensive schema")

# Services
class VideoGenerationService:
    @staticmethod
    async def generate_iterative_video(
        prompt: str, 
        video_id: int, 
        index_id: str, 
        twelvelabs_api_key: str, 
        gemini_api_key: Optional[str] = None,
        starting_iteration: int = 1,
        target_confidence: float = 100.0,
        max_iterations: int = 3,
        initial_analysis_data: dict = None
    ):
        """Generate videos iteratively until target confidence is reached"""
        current_iteration = starting_iteration
        current_confidence = 0.0
        current_prompt = prompt
        previous_video_id = None
        ai_detection_score = 100.0  # Start with assumption of AI-generated
        
        while current_iteration <= max_iterations and current_confidence < target_confidence:
            logger.info(f"🔄 Starting iteration {current_iteration}/{max_iterations}")
            log_detailed(video_id, f"Starting iteration {current_iteration}/{max_iterations} (Target: {target_confidence}% confidence)", "INFO")
            
            # Generate video for this iteration
            await VideoGenerationService.generate_video(
                current_prompt, 
                video_id, 
                index_id, 
                twelvelabs_api_key, 
                gemini_api_key, 
                current_iteration
            )
            
            # Wait for indexing to complete
            await asyncio.sleep(30)  # Give time for indexing
            
            # Analyze the generated video
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT twelvelabs_video_id FROM videos WHERE id = ?", (video_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result and result[0]:
                new_video_id = result[0]
                
                # STEP 5: Search and analyze the new video
                try:
                    client = TwelveLabs(api_key=twelvelabs_api_key)
                    
                    # Run AI detection analysis on the new video
                    logger.info(f"🔍 Running AI detection analysis for iteration {current_iteration}")
                    log_detailed(video_id, f"Running AI detection analysis for iteration {current_iteration}", "INFO")
                    ai_analysis = await AIDetectionService.detect_ai_generation(
                        index_id, new_video_id, twelvelabs_api_key
                    )
                    
                    quality_score = ai_analysis.get('quality_score', 0.0)
                    detailed_logs = ai_analysis.get('detailed_logs', [])
                    
                    logger.info(f"📊 Quality Score: {quality_score:.1f}%")
                    log_detailed(video_id, f"Quality Score: {quality_score:.1f}% (Higher = Better)", "INFO")
                    
                    # Store detailed logs in database
                    if detailed_logs:
                        conn = sqlite3.connect(DB_PATH)
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE videos SET 
                                detailed_logs = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (json.dumps(detailed_logs), video_id))
                        conn.commit()
                        conn.close()
                    
                    # Check if video passes as real (no AI indicators found)
                    if quality_score >= target_confidence:
                        logger.info(f"🎉 SUCCESS! Video passes as real - No AI indicators detected at iteration {current_iteration}")
                        log_detailed(video_id, f"SUCCESS! Video passes as real - No AI indicators detected at iteration {current_iteration}", "SUCCESS")
                        current_confidence = 100.0  # Maximum confidence since it passes as real
                        
                        # Update database with success
                        conn = sqlite3.connect(DB_PATH)
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE videos SET 
                                current_confidence = ?, 
                                iteration_count = ?,
                                status = 'completed',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (quality_score, current_iteration, video_id))
                        conn.commit()
                        conn.close()
                        
                        break  # Stop iterations - we've achieved success!
                    
                    # Use quality score as confidence
                    current_confidence = quality_score
                    
                    # Update database with current confidence
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE videos SET 
                            current_confidence = ?, 
                            iteration_count = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (current_confidence, current_iteration, video_id))
                    conn.commit()
                    conn.close()
                    
                    # STEP 6: Generate next iteration prompt if needed
                    if current_confidence < target_confidence and current_iteration < max_iterations:
                        from google.genai import Client
                        client = Client(api_key=GEMINI_API_KEY)
                        
                        next_prompt = f"""
                        Current iteration: {current_iteration}
                        Current confidence: {current_confidence:.1f}%
                        Target confidence: {target_confidence:.1f}%
                        AI Detection Score: {ai_detection_score:.1f}% (lower is better - 0% means undetectable as AI)
                        
                        Previous prompt: {current_prompt}
                        
                        AI Analysis found these indicators: {ai_analysis.get('search_results', [])}
                        
                        Generate an improved prompt for iteration {current_iteration + 1} that:
                        - Reduces AI detection indicators
                        - Makes the video appear more natural and realistic
                        - Addresses specific artifacts that make it detectable as AI
                        - Improves photorealistic quality
                        - Adds natural imperfections and organic movement
                        
                        Focus on making the video UNDETECTABLE as AI-generated.
                        Return ONLY the improved prompt.
                        """
                        
                        response = client.models.generate_content(
                            model='gemini-2.0-flash-exp',
                            contents=next_prompt
                        )
                        current_prompt = response.text.strip()
                        logger.info(f"📝 Generated prompt for iteration {current_iteration + 1}")
                    
                except Exception as e:
                    logger.error(f"❌ Analysis failed: {e}")
                    current_confidence = 0.0
                
                previous_video_id = new_video_id
            
            current_iteration += 1
            
            # Check if we've reached target or video passes as real
            if current_confidence >= target_confidence:
                if ai_detection_score == 0:
                    logger.info(f"🎉 VIDEO PASSES AS REAL! No AI indicators detected at iteration {current_iteration - 1}")
                else:
                    logger.info(f"✅ Target confidence {target_confidence}% reached at iteration {current_iteration - 1}")
                break
        
        # Final status update
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE videos SET 
                status = 'completed',
                progress = 100,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (video_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"🎯 Iterative generation completed: {current_iteration - 1} iterations, {current_confidence:.1f}% confidence")
    
    @staticmethod
    async def generate_video(prompt: str, video_id: int, index_id: str, twelvelabs_api_key: str, gemini_api_key: Optional[str] = None, iteration: int = 1):
        """Generate single video using Veo2 with iterative tracking"""
        try:
            # Update status to generating
            log_progress(video_id, f"🎬 Starting Veo2 generation (Iteration {iteration})", 10, "generating")
            
            # Generate video with Veo2 (cheaper option)
            from google.genai import Client
            client = Client(api_key=GEMINI_API_KEY)
            operation = client.models.generate_videos(
                model=DEFAULT_VEO_MODEL,
                prompt=f"Generate a high-quality video based on this description: {prompt}. Make it cinematic, realistic, and engaging."
            )
            
            logger.info(f"🎬 Using {DEFAULT_VEO_MODEL} model")
            log_progress(video_id, f"🎬 Using {DEFAULT_VEO_MODEL} model for generation", 15)
            log_detailed(video_id, f"Using {DEFAULT_VEO_MODEL} model for video generation", "INFO")
            
            # Poll for completion
            while not operation.done:
                log_progress(video_id, "⏳ Waiting for video generation...", 20)
                log_detailed(video_id, "Polling Google Veo2 API for generation completion", "INFO")
                await asyncio.sleep(10)
                operation = client.operations.get(operation)
            
            log_progress(video_id, "✅ Video generation completed", 30)
            log_detailed(video_id, "Video generation completed successfully", "SUCCESS")
            
            # Download video
            log_progress(video_id, "📥 Downloading generated video", 40)
            log_detailed(video_id, "Downloading generated video from Google Veo2", "INFO")
            generated_video = operation.response.generated_videos[0]
            video_data = client.files.download(file=generated_video.video)
            
            # Save video temporarily for upload (will be deleted after TwelveLabs upload)
            timestamp = int(time.time())
            iteration = getattr(VideoGenerationService, '_current_iteration', 1)
            video_filename = f"veo_generated_{video_id}_iter{iteration}_{timestamp}.mp4"
            video_path = os.path.join("uploads", video_filename)
            os.makedirs("uploads", exist_ok=True)
            
            with open(video_path, "wb") as f:
                f.write(video_data)
            
            log_detailed(video_id, f"Video temporarily saved for upload: {video_filename}", "INFO")
            
            # STEP 3: Upload to TwelveLabs test index with version indicator
            log_progress(video_id, f"📤 Uploading video to TwelveLabs test index (Iteration {iteration})", 50, "uploading")
            twelvelabs_video_id = await VideoGenerationService.upload_to_twelvelabs(video_path, index_id, twelvelabs_api_key, video_id, iteration)
            
            # Check for usage limit
            if twelvelabs_video_id == "USAGE_LIMIT_EXCEEDED":
                logger.warning("⚠️ TwelveLabs usage limit reached - skipping analysis")
                log_progress(video_id, "⚠️ TwelveLabs usage limit reached - video saved locally", 90, "completed")
                
                # Update status to completed without analysis
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE videos SET 
                        status = ?, 
                        progress = ?, 
                        video_path = ?, 
                        ai_detection_score = 0.0, 
                        ai_detection_confidence = 0.0,
                        ai_detection_details = ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, ("completed", 100, video_path, 
                      json.dumps({"error": "TwelveLabs usage limit reached - analysis skipped"}),
                      video_id))
                conn.commit()
                conn.close()
                
                return {
                    "video_id": video_id,
                    "status": "completed",
                    "video_path": video_path,
                    "message": "Video generated successfully but TwelveLabs usage limit reached - analysis skipped",
                    "error": "usage_limit_exceeded"
                }
            
            # Update status to analyzing
            log_progress(video_id, "🔍 Starting AI detection analysis", 60, "analyzing")
            
            # Update database with video path and twelvelabs ID
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            # Store video path for display (will be cleaned up later if not final)
            cursor.execute("""
                UPDATE videos SET video_path = ?, twelvelabs_video_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (video_path, twelvelabs_video_id, video_id))
            conn.commit()
            conn.close()
            
            log_detailed(video_id, f"Video uploaded to TwelveLabs: {twelvelabs_video_id}", "SUCCESS")
            log_detailed(video_id, f"TwelveLabs ID: {twelvelabs_video_id}", "INFO")
            
            # Keep video locally for simple display (cleanup handled by iterative process)
            log_detailed(video_id, f"Video saved locally: {video_filename}", "SUCCESS")
            
            # Run AI detection with detailed logging
            try:
                log_progress(video_id, "🔍 Searching for AI indicators with Marengo", 65)
                ai_analysis = await AIDetectionService.detect_ai_generation(
                    index_id, twelvelabs_video_id, twelvelabs_api_key
                )
                
                ai_detection_score = ai_analysis.get('ai_detection_score', 100.0)
                quality_score = ai_analysis.get('quality_score', 0.0)
                detailed_logs = ai_analysis.get('detailed_logs', [])
                
                log_progress(video_id, f"🤖 AI Detection Score: {ai_detection_score:.1f}%", 70)
                log_progress(video_id, f"📊 Quality Score: {quality_score:.1f}%", 75)
                
                # Store detailed logs in database
                if detailed_logs:
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE videos SET 
                            detailed_logs = ?,
                            ai_detection_score = ?,
                            current_confidence = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (json.dumps(detailed_logs), ai_detection_score, max(0, 100 - ai_detection_score), video_id))
                    conn.commit()
                    conn.close()
                
                # Check if video passes as real (no AI indicators found)
                if ai_detection_score == 0:
                    logger.info(f"🎉 SUCCESS! Video passes as real - No AI indicators detected")
                    current_confidence = 100.0
                    
                    log_progress(video_id, "🎉 SUCCESS! Video passes as real - No AI indicators detected", 100, "completed")
                    
                    return {
                        "video_id": video_id,
                        "status": "completed",
                        "video_path": video_path,
                        "twelvelabs_video_id": twelvelabs_video_id,
                        "ai_detection_score": 0.0,
                        "current_confidence": 100.0,
                        "message": "Video generated and passes as real - no AI indicators detected!"
                    }
                
            except Exception as e:
                logger.error(f"❌ AI detection failed: {e}")
                detailed_logs = [f"❌ AI detection failed: {str(e)}"]
            
            # Generate enhanced prompts using Gemini
            log_progress(video_id, "🔧 Generating enhanced prompts with Gemini", 80)
            try:
                enhanced_prompt = await PromptEnhancementService.enhance_prompt(prompt, {})
                logger.info(f"✅ Enhanced prompt generated: {enhanced_prompt[:100]}...")
                
                # Store enhanced prompt
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE videos SET enhanced_prompt = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (enhanced_prompt, video_id))
                conn.commit()
                conn.close()
                
            except Exception as prompt_error:
                logger.warning(f"⚠️ Prompt enhancement failed: {str(prompt_error)}")
                enhanced_prompt = prompt  # Use original prompt as fallback
            
            # Final completion
            log_progress(video_id, "✅ AI detection analysis completed", 100, "completed")
            
            logger.info(f"✅ Video generation and analysis completed for video {video_id}")
            
        except Exception as e:
            logger.error(f"❌ Video generation error: {str(e)}")
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("failed", str(e), video_id))
            conn.commit()
            conn.close()
    
    @staticmethod
    async def upload_to_twelvelabs(video_path: str, index_id: str, api_key: str, video_id: int, iteration: int = 1):
        """Upload video to TwelveLabs for indexing with version tracking"""
        try:
            logger.info(f"📤 Uploading video iteration {iteration} to TwelveLabs index {index_id}")
            log_detailed(video_id, f"Uploading video iteration {iteration} to TwelveLabs index {index_id}", "INFO")
            
            client = TwelveLabs(api_key=api_key)
            
            # Upload video using the correct SDK method (task.create)
            with open(video_path, "rb") as f:
                task_response = client.tasks.create(
                    index_id=index_id,
                    video_file=f
                )
            
            # Wait for task completion and get video ID
            task_id = task_response.id
            logger.info(f"📋 Task created: {task_id}")
            log_detailed(video_id, f"TwelveLabs task created with ID: {task_id}", "SUCCESS")
            
            # STEP 4: Wait for complete indexing before next iteration
            log_progress(video_id, f"⏳ Waiting for video indexing (Iteration {iteration})", 55)
            log_detailed(video_id, f"Waiting for TwelveLabs indexing to complete (Iteration {iteration})", "INFO")
            completed_task = client.tasks.wait_for_done(
                task_id=task_id,
                sleep_interval=5.0,
                callback=lambda task: logger.info(f"⏳ Indexing status: {task.status}")
            )
            
            if completed_task.status == "ready":
                # Get the video ID from the completed task
                twelvelabs_video_id = getattr(completed_task, 'video_id', None)
                if not twelvelabs_video_id:
                    # Try alternative attribute names
                    twelvelabs_video_id = getattr(completed_task, 'id', None)
                    if not twelvelabs_video_id:
                        # Use task ID as fallback
                        twelvelabs_video_id = task_id
                        logger.warning(f"⚠️ Using task ID as video ID: {twelvelabs_video_id}")
                
                logger.info(f"✅ Task completed successfully: {twelvelabs_video_id}")
            else:
                raise Exception(f"Task failed with status: {completed_task.status}")
            
            # Update video with TwelveLabs video ID
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET twelvelabs_video_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (twelvelabs_video_id, video_id))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Video uploaded to TwelveLabs: {twelvelabs_video_id}")
            
            # Return the video ID for use in analysis
            return twelvelabs_video_id
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"❌ TwelveLabs upload error: {error_message}")
            
            # Check for usage limit error
            if "usage_limit_exceeded" in error_message or "exceeds your plan" in error_message:
                logger.warning("⚠️ TwelveLabs usage limit reached - cannot upload more videos")
                # Return a special marker to indicate usage limit
                return "USAGE_LIMIT_EXCEEDED"
            
            # Re-raise other errors
            raise e

class AIDetectionService:
    @staticmethod
    async def detect_ai_generation(index_id: str, video_id: str, api_key: str):
        """Detect AI generation using Marengo and Pegasus with detailed logging"""
        try:
            logger.info(f"🔍 Starting AI detection for video {video_id}")
            log_detailed(video_id, f"Starting AI detection analysis for video {video_id}", "INFO")
            
            client = TwelveLabs(api_key=api_key)
            search_client = client.search
            analyze_client = client  # Direct client for analyze method
            
            # Marengo search with detailed logging
            search_results = await AIDetectionService._search_for_ai_indicators(
                search_client, index_id, video_id
            )
            
            # Pegasus analysis with detailed logging
            analysis_results = await AIDetectionService._analyze_with_pegasus(
                analyze_client, video_id
            )
            
            # Calculate single quality score (0-100, higher = better)
            quality_score = AIDetectionService._calculate_quality_score(search_results, analysis_results)
            
            # Log detailed calculation breakdown
            search_count = len(search_results) if search_results else 0
            analysis_count = len(analysis_results) if analysis_results else 0
            log_detailed(video_id, f"Quality Analysis: {search_count} AI indicators, {analysis_count} quality issues", "INFO")
            log_detailed(video_id, f"Quality Score: {quality_score:.1f}% (Higher = Better)", "INFO")
            
            # Create detailed log entries
            detailed_logs = AIDetectionService._create_detailed_logs(
                search_results, analysis_results, quality_score
            )
            
            return {
                "search_results": search_results,
                "analysis_results": analysis_results,
                "quality_score": quality_score,
                "detailed_logs": detailed_logs
            }
            
        except Exception as e:
            logger.error(f"❌ AI detection error: {str(e)}")
            raise e
    
    @staticmethod
    async def _search_for_ai_indicators(search_client, index_id: str, video_id: str):
        """Search for AI indicators using Marengo - optimized with batched queries"""
        # Batch queries into categories for more efficient searching
        ai_detection_categories = {
            "facial_artifacts": "unnatural facial symmetry, artificial facial proportions, synthetic facial structure, unnatural eye movements, artificial skin texture, robotic facial expressions",
            
            "motion_artifacts": "jerky movements, unnatural motion blur, artificial motion smoothing, synthetic frame transitions, mechanical object tracking, temporal inconsistencies",
            
            "lighting_artifacts": "inconsistent lighting, artificial shadow patterns, unnatural light sources, synthetic illumination, artificial ambient lighting",
            
            "audio_artifacts": "robotic speech patterns, artificial voice modulation, synthetic intonation, unnatural speech rhythm, artificial pronunciation",
            
            "environmental_artifacts": "inconsistent environmental details, artificial background elements, synthetic scene composition, unnatural object placement, impossible physics scenarios",
            
            "ai_generation_artifacts": "GAN artifacts, diffusion model artifacts, deep learning artifacts, machine learning artifacts, AI generation artifacts, artificial compression patterns",
            
            "behavioral_artifacts": "cat drinking tea, animals doing human activities, impossible animal behavior, unnatural animal interactions, synthetic animal movements",
            
            "quality_artifacts": "inconsistent video quality, artificial quality patterns, synthetic quality variations",
            
            "texture_artifacts": "artificial texture patterns, synthetic material properties, unnatural surface details, artificial fabric textures, synthetic skin textures",
            
            "color_artifacts": "unnatural color saturation, artificial color grading, synthetic color palettes, unnatural color transitions, artificial color consistency",
            
            "perspective_artifacts": "impossible perspective angles, artificial depth perception, synthetic 3D rendering, unnatural camera angles, artificial spatial relationships",
            
            "temporal_artifacts": "unnatural time progression, artificial frame rates, synthetic temporal consistency, unnatural scene transitions, artificial pacing",
            
            "composition_artifacts": "artificial scene composition, synthetic framing, unnatural visual balance, artificial rule of thirds, synthetic visual hierarchy",
            
            "detail_artifacts": "artificial fine details, synthetic micro-movements, unnatural precision, artificial sharpness, synthetic clarity patterns",
            
            "interaction_artifacts": "unnatural object interactions, artificial physics, synthetic collision detection, unnatural gravity effects, artificial material responses"
        }
        
        all_results = []
        
        for category, query_text in ai_detection_categories.items():
            try:
                logger.info(f"🔍 Searching for {category} indicators...")
                log_detailed(video_id, f"Searching for {category} AI indicators in video", "INFO")
                
                # Use the correct SDK method: search.query
                results = search_client.query(
                    index_id=index_id,
                    search_options=["visual", "audio"],
                    query_text=query_text,
                    threshold="medium",
                    sort_option="score",
                    group_by="clip",
                    page_limit=10,  # Increased limit since we're batching
                    filter=json.dumps({"id": [video_id]})  # Filter as JSON string
                )
                
                if results and hasattr(results, 'data') and results.data:
                    # Add category label to results
                    for result in results.data:
                        if hasattr(result, '__dict__'):
                            result.category = category
                    all_results.extend(results.data)
                    logger.info(f"✅ Found {len(results.data)} {category} indicators")
                else:
                    logger.info(f"ℹ️ No {category} indicators found")
                    
            except Exception as e:
                logger.warning(f"Search query failed for {category}: {e}")
        
        logger.info(f"🔍 Total AI indicators found: {len(all_results)}")
        log_detailed(video_id, f"Search completed: {len(all_results)} AI indicators found", "INFO")
        return all_results
    
    @staticmethod
    async def _analyze_with_pegasus_content(analyze_client, video_id: str):
        """Analyze video content using Pegasus (video-to-text)"""
        content_analysis_prompts = [
            "Analyze this AI-generated video and provide a detailed content description. This video was created using AI generation tools and our goal is to enhance it. Include: VISUAL ELEMENTS - Describe all visible objects, people, animals, and environments. Describe colors, lighting, composition, and visual style. Describe camera movements, angles, and cinematography. Describe any text, signs, or written content. MOTION AND ACTION - Describe all movements, actions, and activities happening in the video. Describe the pace and rhythm of the video. Describe any interactions between subjects. Describe any changes in the scene over time. AUDIO ELEMENTS - Describe any sounds, music, speech, or audio content. Describe the mood and atmosphere created by audio. Describe any dialogue or narration. EMOTIONAL AND NARRATIVE CONTENT - Describe the mood, tone, and emotional content. Describe any story or narrative elements. Describe the overall message or purpose of the video. Describe the target audience or context. Focus on identifying areas that could be improved in the next AI generation iteration.",
            
            "Provide a comprehensive technical and artistic analysis of this AI-generated video. This video was created using AI tools and we need to enhance it. Include: TECHNICAL QUALITY - Assess video resolution, clarity, and technical quality. Describe camera work, framing, and cinematography techniques. Assess lighting, color grading, and visual effects. Describe audio quality and sound design. ARTISTIC ELEMENTS - Describe the visual style, aesthetic, and artistic choices. Describe the composition and visual balance. Describe the use of color, contrast, and visual elements. Describe the overall artistic vision and execution. CONTENT ANALYSIS - Describe the main subject matter and themes. Describe the setting, environment, and context. Describe any characters, people, or subjects. Describe the overall content and purpose of the video. Identify specific areas where the AI generation could be improved in the next iteration."
        ]
        
        analysis_results = []
        
        for i, prompt in enumerate(content_analysis_prompts):
            try:
                response = analyze_client.analyze.create(
                    video_id=video_id,
                    prompt=prompt
                )
                
                if response and hasattr(response, 'data'):
                    analysis_results.append({
                        'analysis_type': f'content_analysis_{i+1}',
                        'content_description': response.data,
                        'prompt_used': prompt[:100] + "..."
                    })
                    
            except Exception as e:
                logger.warning(f"Pegasus content analysis failed: {e}")
        
        return analysis_results

    @staticmethod
    async def _analyze_with_pegasus(analyze_client, video_id: str):
        """Analyze video using Pegasus for AI detection"""
        analysis_prompts = [
            "Perform a detailed visual analysis of this video to detect AI generation indicators. Focus on: FACIAL FEATURES - Analyze facial symmetry for unnatural perfection, examine eye movements for mechanical patterns, check skin texture for artificial smoothness, look for inconsistent facial proportions. MOVEMENT PATTERNS - Identify robotic or mechanical movements, check for unnatural motion fluidity, examine gesture timing for artificial precision, look for impossible or physics-defying actions. VISUAL ARTIFACTS - Detect inconsistent lighting and shadows, identify artificial texture patterns, look for rendering artifacts and compression issues, check for unnatural color gradients and reflections. ENVIRONMENTAL CONSISTENCY - Analyze object placement and interactions, check for impossible scenarios or physics violations, examine depth of field and perspective accuracy, look for temporal inconsistencies. IMPOSSIBLE SCENARIOS - Look for animals doing human activities, impossible physics, unnatural object behavior, or scenarios that defy logic. Provide specific timestamps and confidence levels for each detected indicator.",
            
            "Conduct a technical analysis of this video to identify AI generation artifacts. Examine: GENERATION ARTIFACTS - Look for GAN, diffusion model, or neural network artifacts, identify compression and encoding anomalies, check for artificial noise patterns and filtering, detect synthetic pixelation and color bleeding. AUDIO ANALYSIS - Analyze speech patterns for robotic characteristics, check for artificial voice modulation and intonation, examine audio-visual synchronization issues, look for synthetic background noise patterns. RENDERING QUALITY - Assess overall rendering consistency, check for artificial sharpness or blur, identify unnatural material properties, look for synthetic lighting and shadow patterns. TECHNICAL INDICATORS - Detect model-specific artifacts (Stable Diffusion, DALL-E, etc.), identify deep learning generation signatures, check for artificial processing patterns, look for neural network training artifacts. CREATIVE INDICATORS - Look for AI-generated artistic content, synthetic creative expressions, artificial creative patterns, or generated media content. Rate the likelihood of AI generation from 1-10 with detailed evidence.",
            
            "Analyze this video for contextual and behavioral indicators of AI generation. Evaluate: BEHAVIORAL PATTERNS - Examine human behavior for unnatural consistency, check for mechanical or robotic mannerisms, analyze emotional expressions for artificial patterns, look for unrealistic social interactions. NARRATIVE CONSISTENCY - Check story flow for artificial progression, examine cause-and-effect relationships, look for impossible or illogical scenarios, analyze temporal consistency and pacing. ENVIRONMENTAL LOGIC - Verify physical laws and natural phenomena, check for impossible object interactions, examine weather and environmental consistency, look for artificial world-building elements. CONTEXTUAL ANOMALIES - Identify elements that don't fit the scene, check for anachronistic or impossible details, examine cultural and social context accuracy, look for artificial narrative elements. IMPOSSIBLE SCENARIOS - Look for animals doing human activities, impossible physics, unnatural object behavior, or scenarios that defy logic. CREATIVE INDICATORS - Check for AI-generated creative content, synthetic artistic expressions, artificial creative patterns, or generated media content. Provide specific examples with timestamps and rate overall AI generation likelihood."
        ]
        
        analysis_results = []
        
        for prompt in analysis_prompts:
            try:
                # Use the correct SDK method: analyze instead of generate.text
                response = analyze_client.analyze(
                    video_id=video_id,
                    prompt=prompt,
                    temperature=0.1
                )
                
                if response and hasattr(response, 'data'):
                    # Safely serialize usage data
                    usage_data = None
                    if hasattr(response, 'usage') and response.usage:
                        try:
                            usage_data = {
                                'prompt_tokens': getattr(response.usage, 'prompt_tokens', 0),
                                'completion_tokens': getattr(response.usage, 'completion_tokens', 0),
                                'total_tokens': getattr(response.usage, 'total_tokens', 0)
                            }
                        except:
                            usage_data = str(response.usage)
                    
                    analysis_results.append({
                        'prompt': prompt,
                        'response': response.data,
                        'usage': usage_data
                    })
                    
            except Exception as e:
                logger.warning(f"Pegasus analysis failed: {e}")
        
        return analysis_results
    
    @staticmethod
    def _calculate_quality_score(search_results, analysis_results):
        """Calculate quality score based on video quality indicators"""
        if not search_results and not analysis_results:
            return 100.0  # Perfect quality if no issues found
        
        # Only count search results as quality issues (AI indicators)
        search_penalty = min(len(search_results) * 3, 50) if search_results else 0
        
        # Count analysis results that actually indicate quality problems
        analysis_penalty = 0
        if analysis_results:
            quality_issues = 0
            for result in analysis_results:
                # Only count analysis results that indicate quality problems
                if isinstance(result, dict):
                    content = result.get('content', '').lower()
                    # Look for quality issues in the analysis
                    if any(issue in content for issue in [
                        'poor quality', 'low quality', 'artificial', 'synthetic',
                        'rendering artifacts', 'compression issues', 'blurry',
                        'inconsistent', 'unnatural', 'mechanical', 'robotic'
                    ]):
                        quality_issues += 1
                elif hasattr(result, 'content'):
                    content = str(result.content).lower()
                    if any(issue in content for issue in [
                        'poor quality', 'low quality', 'artificial', 'synthetic',
                        'rendering artifacts', 'compression issues', 'blurry',
                        'inconsistent', 'unnatural', 'mechanical', 'robotic'
                    ]):
                        quality_issues += 1
            
            analysis_penalty = min(quality_issues * 8, 50)
        
        # Start with 100 and subtract penalties
        quality_score = max(100 - search_penalty - analysis_penalty, 0)
        
        # Debug logging
        logger.info(f"📊 Quality Score Calculation: Search penalty={search_penalty}, Analysis penalty={analysis_penalty}, Final={quality_score}")
        
        return quality_score
    
    @staticmethod
    def _calculate_ai_detection_score(search_results, analysis_results):
        """Calculate AI detection score based on confidence and severity"""
        # If no results at all, score is 0 (no AI detected)
        if not search_results and not analysis_results:
            return 0.0
        
        # Calculate search score based on confidence levels
        search_score = 0
        if search_results:
            total_confidence = 0
            for result in search_results:
                confidence = getattr(result, 'confidence', 0) or result.get('confidence', 0) or 0
                total_confidence += confidence
            search_score = min(total_confidence / len(search_results), 100)
        
        # Calculate analysis score based on severity
        analysis_score = 0
        if analysis_results:
            # Only count analysis results that actually indicate AI generation
            ai_indicating_results = []
            for result in analysis_results:
                # Check if the analysis result actually indicates AI generation
                if isinstance(result, dict):
                    content = result.get('content', '').lower()
                    # Look for positive AI indicators in the analysis
                    if any(indicator in content for indicator in [
                        'ai generated', 'artificial', 'synthetic', 'generated by', 
                        'neural network', 'machine learning', 'deepfake', 'fake',
                        'unnatural', 'robotic', 'mechanical', 'artificial intelligence'
                    ]):
                        ai_indicating_results.append(result)
                elif hasattr(result, 'content'):
                    content = str(result.content).lower()
                    if any(indicator in content for indicator in [
                        'ai generated', 'artificial', 'synthetic', 'generated by', 
                        'neural network', 'machine learning', 'deepfake', 'fake',
                        'unnatural', 'robotic', 'mechanical', 'artificial intelligence'
                    ]):
                        ai_indicating_results.append(result)
            
            if ai_indicating_results:
                severity_weights = {'high': 30, 'medium': 20, 'low': 10}
                total_severity = 0
                for result in ai_indicating_results:
                    severity = getattr(result, 'severity', 'medium') or result.get('severity', 'medium') or 'medium'
                    total_severity += severity_weights.get(severity.lower(), 20)
                analysis_score = min(total_severity / len(ai_indicating_results), 100)
        
        # Weighted average with search results being more important
        final_score = 0.0
        if search_score > 0 and analysis_score > 0:
            final_score = (search_score * 0.7 + analysis_score * 0.3)
        elif search_score > 0:
            final_score = search_score
        elif analysis_score > 0:
            final_score = analysis_score
        else:
            # If no search results and no analysis results, return 0 (no AI detected)
            final_score = 0.0
        
        # Note: video_id not available in this static method, will be logged by caller
        return final_score
    
    @staticmethod
    def _create_detailed_logs(search_results, analysis_results, quality_score):
        """Create detailed log entries for live display"""
        logs = []
        
        # Marengo search results
        if search_results:
            logs.append(f"🔍 MarenGO Search Results: {len(search_results)} AI indicators detected")
            for i, result in enumerate(search_results[:5]):  # Show top 5
                category = result.get('category', 'Unknown')
                confidence = result.get('confidence', 0)
                query = result.get('query', 'Unknown query')
                logs.append(f"  • {category}: {query} (confidence: {confidence:.1f}%)")
            
            if len(search_results) > 5:
                logs.append(f"  ... and {len(search_results) - 5} more indicators")
        else:
            logs.append("✅ MarenGO Search: No AI indicators detected")
        
        # Pegasus analysis results
        if analysis_results:
            logs.append(f"🧠 Pegasus Analysis: {len(analysis_results)} quality issues found")
            for i, result in enumerate(analysis_results[:3]):  # Show top 3
                issue_type = result.get('issue_type', 'Unknown')
                description = result.get('description', 'No description')
                severity = result.get('severity', 'Unknown')
                logs.append(f"  • {issue_type} ({severity}): {description[:100]}...")
            
            if len(analysis_results) > 3:
                logs.append(f"  ... and {len(analysis_results) - 3} more issues")
        else:
            logs.append("✅ Pegasus Analysis: No quality issues detected")
        
        # Single quality score
        logs.append(f"📊 Quality Score: {quality_score:.1f}% (Higher = Better)")
        
        if quality_score >= 90:
            logs.append("🎉 EXCELLENT: High quality video - minimal AI artifacts detected!")
        elif quality_score >= 70:
            logs.append("🟢 GOOD: Good quality video - some minor improvements possible")
        elif quality_score >= 50:
            logs.append("🟡 MODERATE: Moderate quality - several improvements needed")
        else:
            logs.append("🔴 LOW: Poor quality - significant improvements needed")
        
        return logs

class PromptEnhancementService:
    @staticmethod
    async def enhance_prompt(original_prompt: str, analysis_results: Dict[str, Any], gemini_api_key: Optional[str] = None):
        """Enhance prompt based on analysis results"""
        try:
            logger.info("🔧 Enhancing prompt based on analysis results")
            
            # Create enhanced prompt using GPT
            enhanced_prompt = await PromptEnhancementService._generate_enhanced_prompt(
                original_prompt, analysis_results
            )
            
            return enhanced_prompt
            
        except Exception as e:
            logger.error(f"❌ Prompt enhancement error: {str(e)}")
            return original_prompt
    
    @staticmethod
    async def _generate_enhanced_prompt(original_prompt: str, analysis_results: Dict[str, Any]):
        """Generate enhanced prompt using Gemini"""
        try:
            from google.genai import Client
            
            # Configure Gemini
            client = Client(api_key=GEMINI_API_KEY)
            
            prompt_text = f"""You are an expert video generation prompt engineer. Analyze the given prompt and AI detection results to create an improved prompt that will generate higher quality, more realistic videos with fewer AI artifacts.

Original prompt: {original_prompt}

AI Detection Results: {json.dumps(analysis_results, indent=2)}

Create an enhanced prompt that addresses the detected issues and improves video quality. Focus on:
1. Making the scenario more natural and realistic
2. Reducing AI-generated artifacts
3. Improving visual consistency
4. Adding specific details that make the video more believable

Return only the enhanced prompt, no additional text."""
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_text
            )
            
            if response.text:
                return response.text.strip()
            else:
                logger.warning("⚠️ Gemini returned empty response, using original prompt")
                return original_prompt
            
        except Exception as e:
            logger.error(f"❌ Gemini prompt enhancement error: {str(e)}")
            return original_prompt

# API Endpoints
@app.get("/")
async def root():

    return {
        "message": "Recurser Validator API",
        "version": "2.0.0",
        "status": "production-ready",
        "features": ["video_generation", "ai_detection", "quality_grading", "prompt_enhancement", "real_time_logs"],
        "endpoints": {
            "health": "/health",
            "generate_video": "/api/videos/generate",
            "upload_video": "/api/videos/upload",
            "grade_video": "/api/videos/{video_id}/grade",
            "video_status": "/api/videos/{video_id}/status",
            "video_logs": "/api/videos/{video_id}/logs",
            "stream_logs": "/api/videos/{video_id}/stream-logs (SSE - real-time)",
            "list_videos": "/api/videos",
            "play_video": "/api/videos/{video_id}/play",
            "stream_video": "/api/videos/{video_id}/stream",
            "stream_twelve": "/api/twelve/{twelvelabs_video_id}/stream (direct TwelveLabs)",
            "debug_twelve": "/api/videos/{video_id}/debug-twelve",
            "download_video": "/api/videos/{video_id}/download"
        },
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    # Check database connection
    db_status = "healthy"
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM videos")
        video_count = cursor.fetchone()[0]
        conn.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        video_count = 0
    
    # Check API keys [[memory:5188213]]
    api_keys_status = {
        "gemini": "configured" if GEMINI_API_KEY and GEMINI_API_KEY != "MISSING_API_KEY" else "missing",
        "twelvelabs": "configured" if TWELVELABS_API_KEY and TWELVELABS_API_KEY != "MISSING_API_KEY" else "missing"
    }
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "database": {
            "status": db_status,
            "video_count": video_count
        },
        "services": {
            "video_generation": "google-veo2",
            "ai_detection": "twelvelabs-marengo-pegasus",
            "prompt_enhancement": "google-gemini-2.5-flash"
        },
        "api_keys": api_keys_status,
        "version": "2.0.0"
    }

@app.post("/api/videos/generate")
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """Generate a new video with iterative enhancement"""
    try:
        logger.info(f"🎬 Video generation request: {request.prompt}")
        
        # Use hardcoded values for testing
        index_id = request.index_id or DEFAULT_INDEX_ID
        twelvelabs_api_key = request.twelvelabs_api_key or TWELVELABS_API_KEY
        
        # Initialize iteration tracking
        iteration_number = 1
        analysis_data = {}
        
        # If this is a playground video, analyze it first
        enhanced_prompt = request.prompt
        if request.is_playground_video and request.video_id:
            logger.info(f"📊 Starting iterative enhancement for video {request.video_id}")
            try:
                # Get video details from TwelveLabs
                client = TwelveLabs(api_key=twelvelabs_api_key)
                
                # Determine which index to search based on iteration
                search_index_id = "68d0f9f2e23608ddb86fba7a"  # Start with prod index for source videos
                
                # STEP 1: Use Pegasus to analyze video content (video-to-text)
                logger.info(f"🔍 Step 1: Using Pegasus to analyze video {request.video_id} content")
                try:
                    # Use Pegasus for video-to-text analysis
                    pegasus_analysis = await AIDetectionService._analyze_with_pegasus_content(
                        client, request.video_id
                    )
                    
                    # Extract content description from Pegasus
                    content_description = ""
                    if pegasus_analysis:
                        for result in pegasus_analysis:
                            if 'content_description' in result:
                                content_description += result['content_description'] + "\n"
                    
                    logger.info(f"✅ Pegasus content analysis: {content_description[:100]}...")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Pegasus content analysis failed: {e}")
                    content_description = f"Video {request.video_id} content analysis"
                
                # Store content analysis data
                analysis_data["pegasus_content_analysis"] = content_description
                logger.info(f"✅ Pegasus content analysis completed")
                
                # STEP 2: Feed analysis to Gemini Flash for enhancement
                logger.info(f"🧠 Step 2: Processing with Gemini Flash for prompt enhancement")
                from google.genai import Client
                client = Client(api_key=GEMINI_API_KEY)
                
                analysis_prompt = f"""
                You are analyzing iteration #{iteration_number} of an AI video enhancement process.
                
                Original request: {request.prompt}
                Video ID: {request.video_id}
                
                This is an AI-generated video that needs enhancement. The video was created using AI generation tools and we need to improve it.
                
                Pegasus Content Analysis:
                {content_description}
                
                Based on this detailed content analysis of the AI-generated video, create an ENHANCED prompt for the next iteration that:
                1. Uses the content description to understand what the AI-generated video actually contains
                2. Identifies specific areas for improvement based on the analysis of the AI-generated content
                3. Maintains the core content but enhances AI generation quality:
                   - Visual quality and coherence (fix AI artifacts)
                   - Cinematography and composition (improve AI camera work)
                   - Lighting and color grading (enhance AI lighting)
                   - Motion smoothness and realism (fix AI motion artifacts)
                   - Subject details and consistency (improve AI subject generation)
                4. Adds specific technical improvements for AI video generation based on the content analysis
                5. Includes version indicator: "Iteration {iteration_number + 1}"
                6. Focuses on making the AI generation more natural and less artificial
                
                Return ONLY the enhanced prompt for AI video generation, no explanations.
                Be specific and detailed about improvements needed for the AI-generated video content.
                """
                
                response = client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=analysis_prompt
                )
                enhanced_prompt = response.text.strip()
                analysis_data["enhanced_prompt"] = enhanced_prompt
                logger.info(f"✨ Enhanced prompt generated: {enhanced_prompt[:100]}...")
                
            except Exception as e:
                logger.warning(f"⚠️ Analysis failed: {e}")
                # Fall back to basic enhancement
                enhanced_prompt = f"{request.prompt} - Enhanced Iteration {iteration_number}"
        
        # Store video request in database with iteration tracking
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        generation_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO videos (
                prompt, enhanced_prompt, status, confidence_threshold, 
                progress, generation_id, index_id, iteration_count,
                source_video_id, max_iterations
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.prompt, enhanced_prompt, "pending", request.confidence_threshold, 
            0, generation_id, index_id, iteration_number,
            request.video_id, request.max_retries if request.max_retries and request.max_retries > 0 else 3
        ))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Debug: Log what was stored
        stored_value = request.max_retries if request.max_retries and request.max_retries > 0 else 3
        logger.info(f"📊 Video {video_id}: Stored max_iterations = {stored_value} (request.max_retries = {request.max_retries})")
        log_detailed(video_id, f"🔧 DEBUG: Stored max_iterations = {stored_value} (request.max_retries = {request.max_retries})", "INFO")
        
        # Add initial logs BEFORE starting background task so they're immediately available
        log_detailed(video_id, f"Video generation request received: {request.prompt[:100]}...", "INFO")
        if request.is_playground_video and request.video_id:
            log_detailed(video_id, f"Starting iterative enhancement from source video {request.video_id}", "INFO")
        log_detailed(video_id, f"Target confidence: {request.confidence_threshold}%", "INFO")
        log_detailed(video_id, f"Max iterations: {request.max_retries or 3}", "INFO")
        
        # Debug: Check if logs are being stored
        logger.info(f"📊 Video {video_id}: Stored {len(progress_logs.get(video_id, []))} logs in memory")
        
        # Start background iterative video generation
        background_tasks.add_task(
            VideoGenerationService.generate_iterative_video, 
            enhanced_prompt,  # Use the enhanced prompt
            video_id, 
            index_id, 
            twelvelabs_api_key,
            request.gemini_api_key,
            iteration_number,
            request.confidence_threshold,
            request.max_retries or 3,
            analysis_data
        )
        
        logger.info(f"🚀 Started video generation for video {video_id}")
        
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

@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    original_prompt: str = Form(...),
    confidence_threshold: float = Form(100.0),
    max_retries: int = Form(3),
    index_id: str = Form(None),
    twelvelabs_api_key: str = Form(None),
    gemini_api_key: Optional[str] = Form(None)
):
    """Upload an existing video for analysis"""
    try:
        logger.info(f"📁 Video upload: {file.filename}")
        
        # Use hardcoded values for testing
        index_id = index_id or DEFAULT_INDEX_ID
        twelvelabs_api_key = twelvelabs_api_key or TWELVELABS_API_KEY
        
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
            INSERT INTO videos (prompt, status, video_path, progress, index_id)
            VALUES (?, ?, ?, ?, ?)
        """, (original_prompt, "uploading", filepath, 50, index_id))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Upload to TwelveLabs
        try:
            twelvelabs_video_id = await VideoGenerationService.upload_to_twelvelabs(filepath, index_id, twelvelabs_api_key, video_id)
            
            # CRITICAL: Wait for video to be indexed before analysis
            logger.info(f"⏳ Waiting for video {twelvelabs_video_id} to be indexed...")
            log_progress(video_id, "⏳ Waiting for video indexing to complete...", 60, "indexing")
            
            # Create TwelveLabs client for indexing check
            from twelvelabs import TwelveLabs
            client = TwelveLabs(api_key=twelvelabs_api_key)
            
            # Poll for indexing completion
            max_wait_time = 300  # 5 minutes max
            wait_time = 0
            while wait_time < max_wait_time:
                try:
                    # Check if video is indexed using the correct API
                    video_info = client.indexes.videos.retrieve(
                        index_id=index_id,
                        video_id=twelvelabs_video_id
                    )
                    if hasattr(video_info, 'indexed_at') and video_info.indexed_at:
                        logger.info(f"✅ Video {twelvelabs_video_id} successfully indexed")
                        break
                except Exception as e:
                    logger.warning(f"⚠️ Error checking indexing status: {e}")
                
                await asyncio.sleep(10)  # Wait 10 seconds
                wait_time += 10
                log_progress(video_id, f"⏳ Still waiting for indexing... ({wait_time}s)", 60 + (wait_time/10), "indexing")
            
            if wait_time >= max_wait_time:
                logger.warning(f"⚠️ Video indexing timeout after {max_wait_time}s")
                log_progress(video_id, "⚠️ Indexing timeout - proceeding with analysis", 70, "analyzing")
            
            # Check for usage limit
            if twelvelabs_video_id == "USAGE_LIMIT_EXCEEDED":
                logger.warning("⚠️ TwelveLabs usage limit reached - skipping analysis")
                
                # Update status to completed without analysis
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE videos SET 
                        status = ?, 
                        progress = ?, 
                        ai_detection_score = 0.0,
                        ai_detection_confidence = 0.0,
                        ai_detection_details = ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, ("completed", 100, 
                      json.dumps({"error": "TwelveLabs usage limit reached - analysis skipped"}),
                      video_id))
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "video_id": video_id,
                    "message": "Video uploaded successfully but TwelveLabs usage limit reached - analysis skipped",
                    "error": "usage_limit_exceeded"
                }
            
            # Update status to completed
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("uploaded", 100, video_id))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Video uploaded successfully: {filename}")
            
        except Exception as upload_error:
            # Update status to failed
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("failed", str(upload_error), video_id))
            conn.commit()
            conn.close()
            
            raise HTTPException(status_code=500, detail=f"Failed to upload to TwelveLabs: {str(upload_error)}")
        
        return VideoResponse(
            success=True,
            message="Video uploaded and processing started",
            data={
                "video_id": video_id,
                "filename": filename,
                "status": "processing",
                "original_prompt": original_prompt,
                "redirect_url": f"/enhance?video_id={video_id}"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/{video_id}/grade")
async def grade_video(video_id: int, index_id: str = None, twelvelabs_api_key: str = None):
    """Run AI detection analysis on a video"""
    try:
        logger.info(f"🔍 Starting AI detection for video {video_id}")
        
        # Use hardcoded values for testing
        index_id = index_id or DEFAULT_INDEX_ID
        twelvelabs_api_key = twelvelabs_api_key or TWELVELABS_API_KEY
        
        # Get video info
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        twelvelabs_video_id = video[9]  # twelvelabs_video_id column
        if not twelvelabs_video_id:
            raise HTTPException(status_code=400, detail="Video not indexed in TwelveLabs")
        
        conn.close()
        
        # Run AI detection
        analysis_results = await AIDetectionService.detect_ai_generation(
            index_id, twelvelabs_video_id, twelvelabs_api_key
        )
        
        # Store analysis results
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_results (video_id, analysis_type, marengo_results, pegasus_results, quality_score, ai_detection_score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            video_id, 
            "ai_detection", 
            json.dumps(analysis_results["search_results"]),
            json.dumps(analysis_results["analysis_results"]),
            analysis_results["quality_score"],
            analysis_results["ai_detection_score"]
        ))
        conn.commit()
        conn.close()
        
        return VideoResponse(
            success=True,
            message="AI detection analysis completed",
            data=analysis_results
        )
        
    except Exception as e:
        logger.error(f"❌ AI detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recent-logs")
async def get_recent_logs(limit: int = 50):
    """Get recent logs for polling-based frontend"""
    try:
        # Get recent logs from global buffer
        recent_logs = []
        
        # Get last N logs from global buffer, but limit to prevent overwhelming
        buffer_logs = list(global_log_buffer)[-min(limit, 100):] if global_log_buffer else []
        recent_logs.extend(buffer_logs)
        
        # Get recent video processing logs
        for video_id, logs in progress_logs.items():
            for log in logs[-10:]:  # Last 10 logs per video
                recent_logs.append({
                    'log': log,
                    'timestamp': datetime.now().isoformat(),
                    'video_id': video_id,
                    'source': 'processing',
                    'type': 'video'
                })
        
        # Get recent database logs
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, detailed_logs, updated_at FROM videos 
                WHERE updated_at > datetime('now', '-30 seconds')
                ORDER BY updated_at DESC LIMIT 3
            """)
            recent_videos = cursor.fetchall()
            conn.close()
            
            for video_id, detailed_logs_json, updated_at in recent_videos:
                if detailed_logs_json:
                    try:
                        logs = json.loads(detailed_logs_json) if isinstance(detailed_logs_json, str) else detailed_logs_json
                        for log in logs[-5:]:  # Last 5 logs per video
                            recent_logs.append({
                                'log': log,
                                'timestamp': updated_at,
                                'video_id': video_id,
                                'source': 'database',
                                'type': 'stored'
                            })
                    except:
                        pass
        except:
            pass
        
        # Sort by timestamp and limit
        recent_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        recent_logs = recent_logs[:limit]
        
        # Clean up global log buffer if it gets too large (keep last 2000)
        if len(global_log_buffer) > 2000:
            global_log_buffer[:] = global_log_buffer[-2000:]
        
        return {
            "success": True,
            "logs": recent_logs,
            "count": len(recent_logs),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting recent logs: {e}")
        return {
            "success": False,
            "error": str(e),
            "logs": [],
            "count": 0
        }

@app.get("/api/test-logs")
async def test_logs():
    """Test endpoint to verify logs are working and add to stream"""
    current_time = datetime.now().strftime("%H:%M:%S")
    
    # Add logs to the global buffer for streaming
    test_logs = [
        f"[{current_time}] ℹ️ Test log message 1",
        f"[{(datetime.now() + timedelta(seconds=1)).strftime('%H:%M:%S')}] ✅ Test success message",
        f"[{(datetime.now() + timedelta(seconds=2)).strftime('%H:%M:%S')}] ⚠️ Test warning message"
    ]
    
    # Add to global log buffer for streaming
    for log in test_logs:
        global_log_buffer.append({
            'log': log,
            'timestamp': datetime.now().isoformat(),
            'source': 'test',
            'level': 'INFO'
        })
    
    # Also log normally
    logger.info("🧪 Test logs generated for streaming")
    
    return {
        "success": True,
        "data": {
            "logs": test_logs
        }
    }

@app.get("/api/debug-logs")
async def debug_logs():
    """Debug endpoint to check what's in progress_logs memory"""
    return {
        "success": True,
        "data": {
            "progress_logs": progress_logs,
            "total_videos": len(progress_logs),
            "video_ids": list(progress_logs.keys())
        }
    }

@app.get("/api/logs/stream")
async def stream_logs():
    """Stream real-time logs from the backend server - true terminal casting"""
    async def generate_logs():
        """Async generator for real-time log streaming with proper error handling"""
        last_global_index = 0
        heartbeat_count = 0
        
        try:
            while True:
                try:
                    # Stream global log buffer immediately
                    current_global_count = len(global_log_buffer)
                    if current_global_count > last_global_index:
                        # Send all new logs immediately
                        for i in range(last_global_index, current_global_count):
                            if i < len(global_log_buffer):
                                log_entry = global_log_buffer[i]
                                try:
                                    yield f"data: {json.dumps(log_entry)}\n\n"
                                except Exception:
                                    # Client disconnected, stop streaming
                                    return
                        last_global_index = current_global_count
                    
                    # Stream video processing logs immediately
                    for video_id, logs in list(progress_logs.items()):
                        if logs:
                            # Send and clear logs immediately
                            logs_to_send = list(logs)
                            logs.clear()
                            for log in logs_to_send:
                                log_data = {
                                    'log': log,
                                    'timestamp': datetime.now().isoformat(),
                                    'video_id': video_id,
                                    'source': 'processing',
                                    'type': 'video'
                                }
                                try:
                                    yield f"data: {json.dumps(log_data)}\n\n"
                                except Exception:
                                    # Client disconnected, stop streaming
                                    return
                    
                    # Reduced heartbeat frequency
                    heartbeat_count += 1
                    if heartbeat_count >= 50:  # Every 5 seconds
                        heartbeat_count = 0
                        try:
                            yield f"data: {json.dumps({'log': '💓 Heartbeat', 'timestamp': datetime.now().isoformat(), 'source': 'heartbeat', 'type': 'ping'})}\n\n"
                        except Exception:
                            # Client disconnected, stop streaming
                            return
                    
                    # Generate test logs if no real logs are available
                    if len(global_log_buffer) == 0 and not any(progress_logs.values()):
                        # Add a test log every 10 iterations (1 second)
                        if heartbeat_count % 10 == 0:
                            test_log = {
                                'log': f'🔄 System active - {datetime.now().strftime("%H:%M:%S")}',
                                'timestamp': datetime.now().isoformat(),
                                'source': 'system',
                                'type': 'status'
                            }
                            try:
                                yield f"data: {json.dumps(test_log)}\n\n"
                            except Exception:
                                # Client disconnected, stop streaming
                                return
                    
                    # Very short sleep for real-time updates
                    await asyncio.sleep(0.1)
                    
                except asyncio.CancelledError:
                    # Client disconnected gracefully
                    logger.info("Log stream cancelled by client")
                    return
                except Exception as e:
                    logger.error(f"Error in log streaming: {e}")
                    try:
                        error_log = {
                            'log': f'⚠️ Stream error: {str(e)}',
                            'timestamp': datetime.now().isoformat(),
                            'source': 'error',
                            'type': 'error'
                        }
                        yield f"data: {json.dumps(error_log)}\n\n"
                    except Exception:
                        # Can't send error, client disconnected
                        return
                    await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Fatal error in log streaming: {e}")
            return
    
    return StreamingResponse(
        generate_logs(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*"
        }
    )

@app.get("/api/videos/{video_id}/logs")
async def get_video_logs(video_id: int):
    """Get progress logs for a video (deprecated - use /stream-logs for real-time)"""
    try:
        # Get logs from database first (persistent)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT detailed_logs FROM videos WHERE id = ?", (video_id,))
        result = cursor.fetchone()
        conn.close()
        
        db_logs = []
        if result and result[0]:
            try:
                db_logs = json.loads(result[0]) if isinstance(result[0], str) else result[0]
                logger.info(f"📊 Video {video_id}: Database logs count: {len(db_logs)}")
            except Exception as e:
                logger.error(f"📊 Video {video_id}: Error parsing database logs: {e}")
                db_logs = []
        else:
            logger.info(f"📊 Video {video_id}: No database logs found")
        
        # Also get logs from memory (real-time additions)
        memory_logs = progress_logs.get(video_id, [])
        logger.info(f"📊 Video {video_id}: Memory logs count: {len(memory_logs)}")
        
        # Combine logs, prioritizing database logs (persistent) then memory logs (recent)
        all_logs = db_logs + memory_logs
        # Remove duplicates while preserving order
        seen = set()
        unique_logs = []
        for log in all_logs:
            if log not in seen:
                seen.add(log)
                unique_logs.append(log)
        
        logger.info(f"📊 Video {video_id}: Returning {len(unique_logs)} unique logs")
        
        return {
            "success": True,
            "data": {
                "video_id": video_id,
                "logs": unique_logs
            }
        }
    except Exception as e:
        logger.error(f"❌ Logs retrieval error: {str(e)}")
        # Return empty logs instead of throwing error
        return {
            "success": True,
            "data": {
                "video_id": video_id,
                "logs": []
            }
        }

@app.get("/api/videos/{video_id}/stream-logs")
async def stream_video_logs(video_id: int):
    """Stream logs in real-time using Server-Sent Events (SSE)"""
    
    async def event_generator():
        # Create a queue for this client
        client_queue = queue.Queue(maxsize=100)
        log_streams[video_id].append(client_queue)
        
        try:
            # First, send all existing logs
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT detailed_logs FROM videos WHERE id = ?", (video_id,))
            result = cursor.fetchone()
            conn.close()
            
            existing_logs = []
            if result and result[0]:
                try:
                    existing_logs = json.loads(result[0]) if isinstance(result[0], str) else result[0]
                except:
                    existing_logs = []
            
            # Send existing logs
            for log_entry in existing_logs:
                yield f"data: {json.dumps({'log': log_entry})}\n\n"
            
            # Send a heartbeat every 15 seconds to keep connection alive
            last_heartbeat = time.time()
            
            # Now stream new logs as they come in
            while True:
                try:
                    # Check for new logs with a short timeout
                    log_entry = client_queue.get(timeout=1.0)
                    yield f"data: {json.dumps({'log': log_entry})}\n\n"
                except queue.Empty:
                    # Send heartbeat to keep connection alive
                    if time.time() - last_heartbeat > 15:
                        yield f": heartbeat\n\n"
                        last_heartbeat = time.time()
                    await asyncio.sleep(0.1)
                    continue
                
        except asyncio.CancelledError:
            # Client disconnected
            logger.info(f"📊 Video {video_id}: Client disconnected from log stream")
            if client_queue in log_streams[video_id]:
                log_streams[video_id].remove(client_queue)
            raise
        except Exception as e:
            logger.error(f"❌ Log streaming error: {str(e)}")
            if client_queue in log_streams[video_id]:
                log_streams[video_id].remove(client_queue)
            raise
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/videos/{video_id}/status")
async def get_video_status(video_id: int):
    """Get the current status and progress of a video"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            # Video not found yet, return pending status
            logger.info(f"📊 Video {video_id}: Not found in database yet, returning pending status")
            return {
                "success": True,
                "data": {
                    "id": video_id,
                    "status": "pending",
                    "progress": 0,
                    "iteration_count": 0,
                    "max_iterations": 3,  # Will be updated when video is created
                    "ai_detection_score": 0.0,
                    "final_confidence": 0.0,
                    "video_path": None,
                    "twelvelabs_video_id": None,
                    "enhanced_prompt": None,
                    "analysis_results": None,
                    "detailed_logs": []
                }
            }
        
        # Get analysis results if available
        cursor.execute("SELECT * FROM analysis_results WHERE video_id = ? ORDER BY created_at DESC LIMIT 1", (video_id,))
        analysis = cursor.fetchone()
        
        conn.close()
        
        analysis_data = None
        if analysis:
            analysis_data = {
                "search_results": analysis[2],
                "analysis_results": analysis[3],
                "quality_score": analysis[4],
                "ai_detection_score": analysis[5],
                "created_at": analysis[6]
            }
        
        # Parse detailed logs if available
        detailed_logs = []
        if video[18]:
            try:
                detailed_logs = json.loads(video[18]) if isinstance(video[18], str) else video[18]
            except:
                detailed_logs = []
        
        # Debug: Log the max_iterations value
        logger.info(f"📊 Video {video_id}: Database max_iterations = {video[13]} (type: {type(video[13])})")
        logger.info(f"📊 Video {video_id}: Full video record: {video}")
        log_detailed(video_id, f"🔧 DEBUG: Retrieved max_iterations = {video[13]} from database", "INFO")
        
        # Get the actual confidence score from the database
        # Use current_confidence (video[6]) which is the quality score
        final_confidence = video[6] if video[6] is not None else 0.0
        
        # Determine better status display
        status = video[3]
        if status == "pending":
            status = "starting"
        elif status == "generating":
            status = "generating"
        elif status == "analyzing":
            status = "analyzing"
        elif status == "completed":
            status = "completed"
        elif status == "failed":
            status = "failed"
        
        # Check video playback availability
        video_available_locally = video[4] and os.path.exists(video[4]) if video[4] else False
        video_available_twelvelabs = bool(video[11] and video[10])  # Has both twelvelabs_video_id and index_id
        
        return {
            "success": True,
            "data": {
                "video_id": video[0],
                "prompt": video[1],
                "enhanced_prompt": video[2],
                "status": status,
                "video_path": video[4],
                "video_available_locally": video_available_locally,
                "video_available_twelvelabs": video_available_twelvelabs,
                "confidence_threshold": 100.0,  # Always 100% target (no AI indicators)
                "current_confidence": final_confidence,
                "progress": video[7] or 0,
                "generation_id": video[8],
                "error_message": video[9],
                "index_id": video[10],
                "twelvelabs_video_id": video[11],
                "iteration_count": video[12] or 1,
                "max_iterations": video[13] if video[13] is not None else 3,
                "source_video_id": video[14],
                "ai_detection_score": video[15] or 0.0,
                "ai_detection_confidence": video[16] or 0.0,
                "ai_detection_details": video[17],
                "detailed_logs": detailed_logs,
                "created_at": video[19],
                "updated_at": video[20],
                "current_iteration": video[12] or 1,
                "total_iterations": video[12] or 1,  # Same as current for now
                "target_confidence": 100.0,  # Always 100% (no AI indicators)
                "final_confidence": final_confidence,
                "analysis_results": analysis_data,
                "iterations": []  # Will be populated with iteration results
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/index/{index_id}/videos")
async def list_index_videos(index_id: str, api_key: Optional[str] = None):
    """List all videos in a TwelveLabs index"""
    try:
        # Use provided API key or default
        twelvelabs_api_key = api_key or TWELVELABS_API_KEY
        
        # Initialize TwelveLabs client
        client = TwelveLabs(api_key=twelvelabs_api_key)
        
        # Get videos from the index
        videos = []
        try:
            # First, verify the index exists and get its info
            try:
                index = client.indexes.retrieve(index_id=index_id)
                logger.info(f"Retrieved index: {index_id}, name={getattr(index, 'index_name', 'unknown')}")
                logger.info(f"Index has {getattr(index, 'video_count', 0)} videos")
            except Exception as e:
                logger.warning(f"Could not retrieve index info: {str(e)}")
            
            # Now list videos in the index
            # According to the SDK docs, this should be client.indexes.videos.list()
            # Use page_limit to control pagination
            video_pager = client.indexes.videos.list(
                index_id=index_id,
                page_limit=20  # Get up to 20 videos per page (should be enough for 6 unique videos)
            )
            
            # Track unique video IDs to avoid duplicates
            seen_video_ids = set()
            unique_videos = []
            
            # Iterate through videos (it's a pager like indexes.list())
            # The pager automatically handles pagination
            video_count = 0
            for video in video_pager:
                try:
                    video_count += 1
                    video_id = str(video.id)
                    
                    # Log each video we encounter for debugging
                    logger.info(f"Processing video {video_count}: {video_id}")
                    
                    # Skip if we've already seen this exact video ID
                    if video_id in seen_video_ids:
                        logger.info(f"Skipping duplicate video ID: {video_id}")
                        continue
                    
                    seen_video_ids.add(video_id)
                    
                    # Extract video information based on actual video object structure
                    # Log the video object attributes for debugging
                    logger.debug(f"Video object type: {type(video)}")
                    logger.debug(f"Video attributes: {dir(video)}")
                    
                    # Log all video attributes for debugging
                    logger.info(f"Video object attributes: {[attr for attr in dir(video) if not attr.startswith('_')]}")
                    
                    # Try to get video dict representation
                    try:
                        video_dict = video.dict() if hasattr(video, 'dict') else {}
                        logger.info(f"Video dict keys: {list(video_dict.keys())}")
                        logger.info(f"Video dict: {video_dict}")
                    except Exception as e:
                        logger.warning(f"Could not get video dict: {e}")
                        video_dict = {}
                    
                    # Check system_metadata for filename
                    video_title = None
                    if hasattr(video, 'system_metadata') and video.system_metadata:
                        logger.info(f"System metadata type: {type(video.system_metadata)}")
                        logger.info(f"System metadata: {video.system_metadata}")
                        # Check if it's an object with attributes
                        if hasattr(video.system_metadata, 'filename'):
                            video_title = video.system_metadata.filename
                            logger.info(f"Found title in system_metadata.filename: {video_title}")
                        elif isinstance(video.system_metadata, dict):
                            video_title = (video.system_metadata.get('filename') or
                                         video.system_metadata.get('name') or
                                         video.system_metadata.get('title') or
                                         video.system_metadata.get('original_filename'))
                            if video_title:
                                logger.info(f"Found title in system_metadata dict: {video_title}")
                    
                    # Try video dict
                    if not video_title and video_dict:
                        video_title = (video_dict.get('filename') or
                                     video_dict.get('name') or
                                     video_dict.get('title'))
                        if video_title:
                            logger.info(f"Found title in video dict: {video_title}")
                    
                    # Fallback to video ID
                    if not video_title:
                        video_title = f"Video {video_id[:8]}"
                        logger.info(f"Using fallback title: {video_title}")
                    
                    # Get duration
                    duration = 0
                    if hasattr(video, 'duration'):
                        duration = video.duration
                    elif hasattr(video, 'metadata') and video.metadata:
                        if isinstance(video.metadata, dict):
                            duration = video.metadata.get('duration', 0)
                        elif hasattr(video.metadata, 'duration'):
                            duration = video.metadata.duration
                    
                    # Try to get thumbnail URL
                    thumbnail_url = None
                    
                    # First check video dict for HLS thumbnails
                    if video_dict and 'hls' in video_dict:
                        hls_data = video_dict['hls']
                        if isinstance(hls_data, dict) and 'thumbnail_urls' in hls_data:
                            thumbnail_urls = hls_data['thumbnail_urls']
                            if thumbnail_urls and len(thumbnail_urls) > 0:
                                thumbnail_url = thumbnail_urls[0]
                                logger.info(f"Found thumbnail in video dict HLS: {thumbnail_url}")
                    
                    # Check system_metadata for thumbnail
                    if not thumbnail_url and hasattr(video, 'system_metadata') and video.system_metadata:
                        if isinstance(video.system_metadata, dict):
                            thumbnail_url = (video.system_metadata.get('thumbnail_url') or
                                           video.system_metadata.get('thumbnail'))
                            if thumbnail_url:
                                logger.info(f"Found thumbnail in system_metadata: {thumbnail_url}")
                    
                    # Try HLS thumbnails
                    if not thumbnail_url and hasattr(video, 'hls') and video.hls:
                        if hasattr(video.hls, 'thumbnail_urls') and video.hls.thumbnail_urls:
                            thumbnail_url = video.hls.thumbnail_urls[0] if video.hls.thumbnail_urls else None
                            logger.info(f"Found thumbnail URL in HLS: {thumbnail_url}")
                    
                    # Get HLS video URL
                    hls_url = None
                    if video_dict and 'hls' in video_dict:
                        hls_data = video_dict['hls']
                        if isinstance(hls_data, dict) and 'video_url' in hls_data:
                            hls_url = hls_data['video_url']
                            logger.info(f"Found HLS video URL: {hls_url}")
                    
                    video_data = {
                        "id": video_id,
                        "title": video_title,
                        "description": "Video available for recursive enhancement",
                        "duration": duration,
                        "created_at": str(getattr(video, 'created_at', '')),
                        "updated_at": str(getattr(video, 'updated_at', '')),
                        "thumbnail": thumbnail_url,
                        "hls_url": hls_url,
                        "confidence_score": None
                    }
                    
                    # Try to get description from metadata
                    if hasattr(video, 'metadata') and video.metadata:
                        if isinstance(video.metadata, dict):
                            video_data["description"] = video.metadata.get('description', video_data["description"])
                        elif hasattr(video.metadata, 'description'):
                            video_data["description"] = video.metadata.description
                    
                    videos.append(video_data)
                    unique_videos.append(video_id)
                    logger.info(f"Added unique video #{len(unique_videos)}: {video_data['title']} (ID: {video_id})")
                    
                    # Don't stop early - let the pager complete to get all videos
                    # The index has 6 videos, so we should get all of them
                    if len(unique_videos) >= 50:  # Safety limit only
                        logger.info(f"Reached safety limit with {len(unique_videos)} unique videos")
                        break
                    
                except Exception as ve:
                    logger.warning(f"Error processing video: {str(ve)}")
                    continue
                    
            logger.info(f"Pager iteration complete. Processed {video_count} total videos, found {len(unique_videos)} unique videos")
                    
        except Exception as e:
            logger.warning(f"Could not fetch videos from index: {str(e)}")
            logger.warning(f"Error type: {type(e).__name__}")
            # Return empty list but include error info
            pass
        
        logger.info(f"Returning {len(videos)} unique videos from index {index_id} (expected 6)")
        return {
            "success": True,
            "data": {
                "index_id": index_id,
                "video_count": len(videos),
                "videos": videos
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Index video list error: {str(e)}")
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
                    "index_id": video[8],
                    "twelvelabs_video_id": video[9],
                    "created_at": video[10],
                    "updated_at": video[11]
                }
                for video in videos
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ List videos error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test/video")
async def test_video():
    """Test endpoint to serve video file directly"""
    video_path = "uploads/veo_generated_1_iter1_1761215946.mp4"
    if os.path.exists(video_path):
        # Try streaming the file instead of FileResponse
        def generate():
            with open(video_path, "rb") as f:
                while True:
                    chunk = f.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    yield chunk
        
        return FileResponse(
            path=video_path,
            media_type="video/mp4",
            filename="test_video.mp4"
        )
    else:
        raise HTTPException(status_code=404, detail="Test video not found")

@app.get("/api/videos/{video_id}/play")
async def play_video(video_id: int):
    """Play a generated video file - serves local file or redirects to HLS stream"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT video_path, twelvelabs_video_id, index_id FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            logger.error(f"❌ Video not found in database: {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video[0]
        twelvelabs_video_id = video[1]
        index_id = video[2]
        conn.close()
        
        logger.info(f"🎬 Video play request: {video_id}, path: {video_path}, tl_id: {twelvelabs_video_id}")
        
        # Check if local file exists and is accessible
        local_file_available = video_path and os.path.exists(video_path)
        
        # Check if TwelveLabs video is available
        twelvelabs_available = bool(twelvelabs_video_id and index_id)
        
        # Prioritize local files (final iterations) for simple display
        if local_file_available:
            logger.info(f"✅ Serving final iteration locally: {video_path}")
            return FileResponse(
                path=video_path,
                media_type="video/mp4",
                filename=f"video_{video_id}.mp4",
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600"
                }
            )
        elif twelvelabs_available:
            # Get HLS URL from TwelveLabs and redirect to it
            logger.info(f"📡 Getting HLS stream from TwelveLabs: {twelvelabs_video_id}")
            client = TwelveLabs(api_key=TWELVELABS_API_KEY)
            
            try:
                # Retrieve video details with proper API structure
                video_details = client.indexes.videos.retrieve(
                    index_id=index_id,
                    video_id=twelvelabs_video_id
                )
                
                hls_url = None
                thumbnail_url = None
                hls_status = None
                
                # Extract HLS URL using multiple methods
                # Method 1: Direct attribute access
                if hasattr(video_details, 'hls') and video_details.hls:
                    hls_data = video_details.hls
                    if hasattr(hls_data, 'video_url'):
                        hls_url = hls_data.video_url
                    if hasattr(hls_data, 'thumbnail_urls') and hls_data.thumbnail_urls:
                        thumbnail_url = hls_data.thumbnail_urls[0]
                    if hasattr(hls_data, 'status'):
                        hls_status = hls_data.status
                
                # Method 2: Dictionary conversion if needed
                if not hls_url:
                    try:
                        if hasattr(video_details, 'dict'):
                            video_dict = video_details.dict()
                        elif hasattr(video_details, '__dict__'):
                            video_dict = video_details.__dict__
                        else:
                            video_dict = dict(video_details)
                        
                        if 'hls' in video_dict and video_dict['hls']:
                            hls_data = video_dict['hls']
                            hls_url = hls_data.get('video_url')
                            thumbnail_urls = hls_data.get('thumbnail_urls', [])
                            thumbnail_url = thumbnail_urls[0] if thumbnail_urls else None
                            hls_status = hls_data.get('status')
                    except:
                        pass
                
                # Check if HLS is ready
                if hls_status and hls_status != 'COMPLETE':
                    logger.warning(f"⚠️ HLS encoding status: {hls_status}")
                    raise HTTPException(
                        status_code=503, 
                        detail=f"Video still processing. Status: {hls_status}"
                    )
                
                if hls_url:
                    logger.info(f"✅ Found HLS URL: {hls_url[:100]}...")
                    # Option 1: Redirect directly to the HLS stream
                    from fastapi.responses import RedirectResponse
                    return RedirectResponse(url=hls_url, status_code=302)
                    
                    # Option 2: Return JSON with HLS info (uncomment if frontend needs this)
                    # return {
                    #     "type": "hls",
                    #     "hls_url": hls_url,
                    #     "thumbnail_url": thumbnail_url,
                    #     "status": hls_status
                    # }
                else:
                    logger.error(f"❌ No HLS URL found for video {twelvelabs_video_id}")
                    raise HTTPException(status_code=404, detail="HLS stream not available")
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"❌ TwelveLabs API error: {e}")
                raise HTTPException(status_code=500, detail=f"TwelveLabs API error: {str(e)}")
        else:
            # No video available anywhere
            logger.error(f"❌ Video not available locally or in TwelveLabs: {video_id}")
            raise HTTPException(
                status_code=404, 
                detail="Video not available"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Video playback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/info")
async def get_video_info(video_id: int):
    """Get video information for frontend display"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT video_path, twelvelabs_video_id, index_id FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video[0]
        twelvelabs_video_id = video[1]
        index_id = video[2]
        conn.close()
        
        local_file_available = video_path and os.path.exists(video_path)
        twelvelabs_available = bool(twelvelabs_video_id and index_id)
        
        result = {
            "video_id": video_id,
            "local_available": local_file_available,
            "twelvelabs_available": twelvelabs_available,
            "type": "local" if local_file_available else "hls" if twelvelabs_available else None
        }
        
        if twelvelabs_available and not local_file_available:
            # Get HLS URL for frontend using proper API call structure
            logger.info(f"🎬 Fetching HLS info for TwelveLabs video: {twelvelabs_video_id}")
            client = TwelveLabs(api_key=TWELVELABS_API_KEY)
            
            try:
                # Use the correct API call structure as shown in the documentation
                video_details = client.indexes.videos.retrieve(
                    index_id=index_id,
                    video_id=twelvelabs_video_id
                )
                
                logger.info(f"📡 TwelveLabs response type: {type(video_details)}")
                
                # Handle the response properly based on TwelveLabs SDK structure
                hls_url = None
                thumbnail_url = None
                hls_status = None
                
                # Try direct attribute access first
                if hasattr(video_details, 'hls'):
                    hls_data = video_details.hls
                    if hls_data:
                        if hasattr(hls_data, 'video_url'):
                            hls_url = hls_data.video_url
                        if hasattr(hls_data, 'thumbnail_urls') and hls_data.thumbnail_urls:
                            thumbnail_url = hls_data.thumbnail_urls[0]
                        if hasattr(hls_data, 'status'):
                            hls_status = hls_data.status
                            
                # If no HLS URL yet, try dictionary conversion
                if not hls_url:
                    try:
                        # Convert to dict if possible
                        if hasattr(video_details, 'dict'):
                            video_dict = video_details.dict()
                        elif hasattr(video_details, '__dict__'):
                            video_dict = video_details.__dict__
                        else:
                            video_dict = dict(video_details)
                        
                        if 'hls' in video_dict and video_dict['hls']:
                            hls_data = video_dict['hls']
                            hls_url = hls_data.get('video_url')
                            thumbnail_urls = hls_data.get('thumbnail_urls', [])
                            thumbnail_url = thumbnail_urls[0] if thumbnail_urls else None
                            hls_status = hls_data.get('status')
                    except Exception as e:
                        logger.warning(f"Could not convert to dict: {e}")
                
                # Log what we found
                logger.info(f"✅ HLS URL found: {bool(hls_url)}")
                logger.info(f"✅ HLS Status: {hls_status}")
                
                if hls_url:
                    result["hls_url"] = hls_url
                    result["thumbnail_url"] = thumbnail_url
                    result["hls_status"] = hls_status
                    logger.info(f"🎬 HLS URL: {hls_url[:100]}...")
                else:
                    logger.warning(f"⚠️ No HLS URL found for video {twelvelabs_video_id}")
                    result["error"] = "HLS stream not available"
                    
            except Exception as e:
                logger.error(f"❌ Error getting HLS info: {e}")
                result["error"] = f"Failed to get HLS info: {str(e)}"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Video info error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/hls-debug")
async def debug_hls(video_id: int):
    """Debug endpoint to check HLS availability and status"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT video_path, twelvelabs_video_id, index_id FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        conn.close()
        
        if not video:
            return {"error": "Video not found in database"}
        
        video_path = video[0]
        twelvelabs_video_id = video[1]
        index_id = video[2]
        
        debug_info = {
            "video_id": video_id,
            "local_path": video_path,
            "local_exists": os.path.exists(video_path) if video_path else False,
            "twelvelabs_video_id": twelvelabs_video_id,
            "index_id": index_id
        }
        
        if twelvelabs_video_id and index_id:
            client = TwelveLabs(api_key=TWELVELABS_API_KEY)
            
            try:
                # Get full video details
                video_details = client.indexes.videos.retrieve(
                    index_id=index_id,
                    video_id=twelvelabs_video_id
                )
                
                # Try to extract all possible HLS information
                debug_info["response_type"] = str(type(video_details))
                
                # Method 1: Direct attributes
                if hasattr(video_details, 'hls'):
                    hls_obj = video_details.hls
                    debug_info["has_hls_attr"] = True
                    debug_info["hls_type"] = str(type(hls_obj))
                    
                    if hls_obj:
                        debug_info["hls_data"] = {
                            "video_url": getattr(hls_obj, 'video_url', None),
                            "thumbnail_urls": getattr(hls_obj, 'thumbnail_urls', None),
                            "status": getattr(hls_obj, 'status', None),
                            "updated_at": getattr(hls_obj, 'updated_at', None)
                        }
                else:
                    debug_info["has_hls_attr"] = False
                
                # Method 2: Dictionary conversion
                try:
                    if hasattr(video_details, 'dict'):
                        video_dict = video_details.dict()
                    elif hasattr(video_details, 'to_dict'):
                        video_dict = video_details.to_dict()
                    elif hasattr(video_details, '__dict__'):
                        video_dict = video_details.__dict__
                    else:
                        video_dict = None
                    
                    if video_dict and 'hls' in video_dict:
                        debug_info["dict_hls"] = video_dict['hls']
                except Exception as e:
                    debug_info["dict_error"] = str(e)
                
                # Method 3: Raw response inspection
                debug_info["available_attrs"] = dir(video_details)[:20]  # First 20 attributes
                
            except Exception as e:
                debug_info["api_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/videos/{video_id}/debug-twelve")
async def debug_twelve(video_id: int):
    """Debug endpoint to see raw TwelveLabs response"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT twelvelabs_video_id, index_id FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        conn.close()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        twelvelabs_video_id = video[0]
        index_id = video[1]
        
        if not twelvelabs_video_id or not index_id:
            raise HTTPException(status_code=404, detail="Video not available in TwelveLabs")
        
        logger.info(f"🔍 Debug: Fetching raw TwelveLabs response for video {video_id}")
        client = TwelveLabs(api_key=TWELVELABS_API_KEY)
        
        # Get video details from TwelveLabs
        video_details = client.indexes.videos.retrieve(
            index_id=index_id,
            video_id=twelvelabs_video_id
        )
        
        # Convert to dict for inspection
        try:
            video_dict = video_details.dict() if hasattr(video_details, 'dict') else {}
        except:
            video_dict = str(video_details)
        
        return {
            "success": True,
            "data": {
                "video_id": video_id,
                "twelvelabs_video_id": twelvelabs_video_id,
                "index_id": index_id,
                "raw_response": video_dict,
                "response_type": str(type(video_details)),
                "response_attributes": [attr for attr in dir(video_details) if not attr.startswith('_')]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Debug error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/stream")
async def stream_video(video_id: int):
    """Get HLS stream URL from TwelveLabs for videos uploaded there (by database ID)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT twelvelabs_video_id, index_id FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        conn.close()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        twelvelabs_video_id = video[0]
        index_id = video[1]
        
        if not twelvelabs_video_id or not index_id:
            raise HTTPException(status_code=404, detail="Video not available in TwelveLabs")
        
        logger.info(f"📡 Fetching HLS stream from TwelveLabs: index={index_id}, video={twelvelabs_video_id}")
        client = TwelveLabs(api_key=TWELVELABS_API_KEY)
        
        # Get video details from TwelveLabs using the correct API structure
        video_details = client.indexes.videos.retrieve(
            index_id=index_id,
            video_id=twelvelabs_video_id
        )
        
        # Extract HLS URL from the response - try multiple approaches
        hls_url = None
        thumbnail_urls = []
        hls_status = None
        
        # Method 1: Direct object access
        if hasattr(video_details, 'hls') and video_details.hls:
            if hasattr(video_details.hls, 'video_url'):
                hls_url = video_details.hls.video_url
                logger.info(f"✅ Found HLS URL via object access: {hls_url}")
            
            # Also get thumbnail URLs and status
            if hasattr(video_details.hls, 'thumbnail_urls') and video_details.hls.thumbnail_urls:
                thumbnail_urls = video_details.hls.thumbnail_urls
            if hasattr(video_details.hls, 'status'):
                hls_status = video_details.hls.status
        
        # Method 2: Dict conversion if object access failed
        if not hls_url:
            try:
                video_dict = video_details.dict() if hasattr(video_details, 'dict') else {}
                logger.info(f"📊 Video dict keys: {list(video_dict.keys())}")
                
                if 'hls' in video_dict and isinstance(video_dict['hls'], dict):
                    hls_data = video_dict['hls']
                    logger.info(f"📊 HLS dict keys: {list(hls_data.keys())}")
                    
                    hls_url = hls_data.get('video_url')
                    if hls_url:
                        logger.info(f"✅ Found HLS URL via dict access: {hls_url}")
                    
                    # Get thumbnail URLs and status from dict
                    if 'thumbnail_urls' in hls_data and hls_data['thumbnail_urls']:
                        thumbnail_urls = hls_data['thumbnail_urls']
                    if 'status' in hls_data:
                        hls_status = hls_data['status']
                        
            except Exception as dict_error:
                logger.warning(f"Could not parse video dict: {dict_error}")
        
        # Method 3: Raw response inspection
        if not hls_url:
            try:
                # Log the raw response structure for debugging
                logger.info(f"📊 Video details type: {type(video_details)}")
                logger.info(f"📊 Video details attributes: {[attr for attr in dir(video_details) if not attr.startswith('_')]}")
                
                # Try to access as raw dict
                if hasattr(video_details, '__dict__'):
                    raw_dict = video_details.__dict__
                    logger.info(f"📊 Raw dict keys: {list(raw_dict.keys())}")
                    
                    if 'hls' in raw_dict and raw_dict['hls']:
                        hls_obj = raw_dict['hls']
                        if hasattr(hls_obj, 'video_url'):
                            hls_url = hls_obj.video_url
                        elif isinstance(hls_obj, dict) and 'video_url' in hls_obj:
                            hls_url = hls_obj['video_url']
                            
            except Exception as raw_error:
                logger.warning(f"Could not access raw response: {raw_error}")
        
        if not hls_url:
            logger.error(f"❌ Could not find HLS URL in TwelveLabs response")
            logger.error(f"📊 Full response structure: {video_details}")
            raise HTTPException(status_code=404, detail="HLS stream URL not available in TwelveLabs response")
        
        logger.info(f"✅ Successfully extracted HLS stream URL: {hls_url}")
        logger.info(f"📊 Thumbnail URLs: {thumbnail_urls}")
        logger.info(f"📊 HLS Status: {hls_status}")
        
        return {
            "success": True,
            "data": {
                "video_id": video_id,
                "hls_url": hls_url,
                "thumbnail_urls": thumbnail_urls,
                "hls_status": hls_status,
                "source": "twelvelabs",
                "twelvelabs_video_id": twelvelabs_video_id,
                "index_id": index_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Stream video error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/twelve/{twelvelabs_video_id}/stream")
async def stream_twelve_video(twelvelabs_video_id: str, index_id: str = None):
    """Get HLS stream URL directly from TwelveLabs video ID (for frontend use)"""
    try:
        # Use provided index_id or default test index
        target_index_id = index_id or DEFAULT_INDEX_ID
        
        logger.info(f"📡 Fetching HLS stream directly from TwelveLabs: index={target_index_id}, video={twelvelabs_video_id}")
        client = TwelveLabs(api_key=TWELVELABS_API_KEY)
        
        # Get video details from TwelveLabs using the correct API structure
        video_details = client.indexes.videos.retrieve(
            index_id=target_index_id,
            video_id=twelvelabs_video_id
        )
        
        # Extract HLS URL from the response - try multiple approaches
        hls_url = None
        thumbnail_urls = []
        hls_status = None
        
        # Method 1: Direct object access
        if hasattr(video_details, 'hls') and video_details.hls:
            if hasattr(video_details.hls, 'video_url'):
                hls_url = video_details.hls.video_url
                logger.info(f"✅ Found HLS URL via object access: {hls_url}")
            
            # Also get thumbnail URLs and status
            if hasattr(video_details.hls, 'thumbnail_urls') and video_details.hls.thumbnail_urls:
                thumbnail_urls = video_details.hls.thumbnail_urls
            if hasattr(video_details.hls, 'status'):
                hls_status = video_details.hls.status
        
        # Method 2: Dict conversion if object access failed
        if not hls_url:
            try:
                video_dict = video_details.dict() if hasattr(video_details, 'dict') else {}
                logger.info(f"📊 Video dict keys: {list(video_dict.keys())}")
                
                if 'hls' in video_dict and isinstance(video_dict['hls'], dict):
                    hls_data = video_dict['hls']
                    logger.info(f"📊 HLS dict keys: {list(hls_data.keys())}")
                    
                    hls_url = hls_data.get('video_url')
                    if hls_url:
                        logger.info(f"✅ Found HLS URL via dict access: {hls_url}")
                    
                    # Get thumbnail URLs and status from dict
                    if 'thumbnail_urls' in hls_data and hls_data['thumbnail_urls']:
                        thumbnail_urls = hls_data['thumbnail_urls']
                    if 'status' in hls_data:
                        hls_status = hls_data['status']
                        
            except Exception as dict_error:
                logger.warning(f"Could not parse video dict: {dict_error}")
        
        # Method 3: Raw response inspection
        if not hls_url:
            try:
                # Log the raw response structure for debugging
                logger.info(f"📊 Video details type: {type(video_details)}")
                logger.info(f"📊 Video details attributes: {[attr for attr in dir(video_details) if not attr.startswith('_')]}")
                
                # Try to access as raw dict
                if hasattr(video_details, '__dict__'):
                    raw_dict = video_details.__dict__
                    logger.info(f"📊 Raw dict keys: {list(raw_dict.keys())}")
                    
                    if 'hls' in raw_dict and raw_dict['hls']:
                        hls_obj = raw_dict['hls']
                        if hasattr(hls_obj, 'video_url'):
                            hls_url = hls_obj.video_url
                        elif isinstance(hls_obj, dict) and 'video_url' in hls_obj:
                            hls_url = hls_obj['video_url']
                            
            except Exception as raw_error:
                logger.warning(f"Could not access raw response: {raw_error}")
        
        if not hls_url:
            logger.error(f"❌ Could not find HLS URL in TwelveLabs response")
            logger.error(f"📊 Full response structure: {video_details}")
            raise HTTPException(status_code=404, detail="HLS stream URL not available in TwelveLabs response")
        
        logger.info(f"✅ Successfully extracted HLS stream URL: {hls_url}")
        logger.info(f"📊 Thumbnail URLs: {thumbnail_urls}")
        logger.info(f"📊 HLS Status: {hls_status}")
        
        return {
            "success": True,
            "data": {
                "twelvelabs_video_id": twelvelabs_video_id,
                "hls_url": hls_url,
                "thumbnail_urls": thumbnail_urls,
                "hls_status": hls_status,
                "source": "twelvelabs",
                "index_id": target_index_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Stream twelve video error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/download")
async def download_video(video_id: int):
    """Download a generated video file"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT video_path FROM videos WHERE id = ?", (video_id,))
        video = cursor.fetchone()
        
        if not video:
            logger.error(f"❌ Video not found in database: {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video[0]
        conn.close()
        
        logger.info(f"📥 Video download request: {video_id}, path: {video_path}")
        
        if not video_path:
            logger.error(f"❌ Video path is empty for video {video_id}")
            raise HTTPException(status_code=404, detail="Video path not found")
            
        if not os.path.exists(video_path):
            logger.error(f"❌ Video file does not exist: {video_path}")
            raise HTTPException(status_code=404, detail=f"Video file not found at {video_path}")
        
        filename = os.path.basename(video_path)
        logger.info(f"✅ Serving video download: {filename}")
        return FileResponse(
            path=video_path,
            media_type="video/mp4",
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"❌ Video download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)