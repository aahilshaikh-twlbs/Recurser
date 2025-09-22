from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import sqlite3
import os
import time
import json
import asyncio
import uuid
from datetime import datetime
import logging
from dotenv import load_dotenv
# Remove incorrect genai import - using google.generativeai where needed
import httpx
from twelvelabs import TwelveLabs
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    confidence_threshold: float = 50.0
    max_retries: int = 5
    index_id: Optional[str] = None
    twelvelabs_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    video_id: Optional[str] = None  # For playground video enhancement
    is_playground_video: Optional[bool] = False

class VideoUploadRequest(BaseModel):
    original_prompt: Optional[str] = None
    confidence_threshold: float = 50.0
    max_retries: int = 5
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

def log_progress(video_id: int, message: str, progress: int = None):
    """Log progress for a video with timestamp"""
    timestamp = time.strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    
    if video_id not in progress_logs:
        progress_logs[video_id] = []
    
    progress_logs[video_id].append(log_entry)
    
    # Update progress in database if provided
    if progress is not None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE videos SET progress = ? WHERE id = ?", (progress, video_id))
        conn.commit()
        conn.close()
    
    logger.info(f"📊 Video {video_id}: {message}")

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
            confidence_threshold REAL DEFAULT 50.0,
            current_confidence REAL DEFAULT 0.0,
            progress INTEGER DEFAULT 0,
            generation_id TEXT,
            error_message TEXT,
            index_id TEXT,
            twelvelabs_video_id TEXT,
            iteration_count INTEGER DEFAULT 1,
            max_iterations INTEGER DEFAULT 5,
            source_video_id TEXT,
            ai_detection_score REAL DEFAULT 0.0,
            ai_detection_confidence REAL DEFAULT 0.0,
            ai_detection_details TEXT,
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
            max_retries INTEGER DEFAULT 5,
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
        target_confidence: float = 85.0,
        max_iterations: int = 5,
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
                    ai_analysis = await AIDetectionService.detect_ai_generation(
                        index_id, new_video_id, twelvelabs_api_key
                    )
                    
                    ai_detection_score = ai_analysis.get('ai_detection_score', 100.0)
                    quality_score = ai_analysis.get('quality_score', 0.0)
                    
                    logger.info(f"🤖 AI Detection Score: {ai_detection_score:.1f}%")
                    logger.info(f"📊 Quality Score: {quality_score:.1f}%")
                    
                    # Check if video passes as real (no AI indicators found)
                    if ai_detection_score == 0:
                        logger.info(f"🎉 SUCCESS! Video passes as real - No AI indicators detected at iteration {current_iteration}")
                        current_confidence = 100.0  # Maximum confidence since it passes as real
                        
                        # Update database with success
                        conn = sqlite3.connect(DB_PATH)
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE videos SET 
                                current_confidence = 100.0, 
                                iteration_count = ?,
                                ai_detection_score = 0.0,
                                status = 'completed',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (current_iteration, video_id))
                        conn.commit()
                        conn.close()
                        
                        break  # Stop iterations - we've achieved success!
                    
                    # Calculate confidence based on inverse of AI detection score
                    # Lower AI detection score = higher confidence that it looks real
                    current_confidence = max(0, 100 - ai_detection_score)
                    
                    # Update database with current confidence
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE videos SET 
                            current_confidence = ?, 
                            iteration_count = ?,
                            ai_detection_score = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (current_confidence, current_iteration, ai_detection_score, video_id))
                    conn.commit()
                    conn.close()
                    
                    # STEP 6: Generate next iteration prompt if needed
                    if current_confidence < target_confidence and current_iteration < max_iterations:
                        import google.generativeai as genai2
                        genai2.configure(api_key=GEMINI_API_KEY)
                        model = genai2.GenerativeModel('gemini-2.0-flash-exp')
                        
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
                        
                        response = model.generate_content(next_prompt)
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
            log_progress(video_id, f"🎬 Starting Veo2 generation (Iteration {iteration})", 10)
            
            # Update status to generating
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("generating", 10, video_id))
            conn.commit()
            conn.close()
            
            # Generate video with Veo2 (cheaper option)
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            client = genai.Client(api_key=GEMINI_API_KEY)
            operation = client.models.generate_videos(
                model=DEFAULT_VEO_MODEL,
                prompt=f"Generate a high-quality video based on this description: {prompt}. Make it cinematic, realistic, and engaging."
            )
            
            logger.info(f"🎬 Using {DEFAULT_VEO_MODEL} model")
            
            # Poll for completion
            while not operation.done:
                log_progress(video_id, "⏳ Waiting for video generation...", 20)
                await asyncio.sleep(10)
                operation = client.operations.get(operation)
            
            log_progress(video_id, "✅ Video generation completed", 30)
            
            # Download video
            log_progress(video_id, "📥 Downloading generated video", 40)
            generated_video = operation.response.generated_videos[0]
            video_data = client.files.download(file=generated_video.video)
            
            # Save video with iteration tracking
            timestamp = int(time.time())
            iteration = getattr(VideoGenerationService, '_current_iteration', 1)
            video_filename = f"veo_generated_{video_id}_iter{iteration}_{timestamp}.mp4"
            video_path = os.path.join("uploads", video_filename)
            os.makedirs("uploads", exist_ok=True)
            
            with open(video_path, "wb") as f:
                f.write(video_data)
            
            # STEP 3: Upload to TwelveLabs test index with version indicator
            log_progress(video_id, f"📤 Uploading video to TwelveLabs test index (Iteration {iteration})", 50)
            twelvelabs_video_id = await VideoGenerationService.upload_to_twelvelabs(video_path, index_id, twelvelabs_api_key, video_id, iteration)
            
            # Check for usage limit
            if twelvelabs_video_id == "USAGE_LIMIT_EXCEEDED":
                logger.warning("⚠️ TwelveLabs usage limit reached - skipping analysis")
                log_progress(video_id, "⚠️ TwelveLabs usage limit reached - video saved locally", 90)
                
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
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos SET status = ?, progress = ?, video_path = ?, twelvelabs_video_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, ("analyzing", 60, video_path, twelvelabs_video_id, video_id))
            conn.commit()
            conn.close()
            
            log_progress(video_id, "🔍 Starting AI detection analysis", 65)
            
            # Generate enhanced prompts using Gemini
            log_progress(video_id, "🔧 Generating enhanced prompts with Gemini", 70)
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
            
            # Run AI detection analysis
            try:
                log_progress(video_id, "🔍 Searching for AI indicators with Marengo", 75)
                analysis_results = await AIDetectionService.detect_ai_generation(
                    index_id, twelvelabs_video_id, twelvelabs_api_key
                )
                log_progress(video_id, "✅ AI detection analysis completed", 85)
                
                # Store analysis results
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO analysis_results (video_id, search_results, analysis_results, quality_score, ai_detection_score, created_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (
                    video_id,
                    json.dumps(analysis_results.get("search_results", [])),
                    json.dumps(analysis_results.get("analysis_results", [])),
                    analysis_results.get("quality_score", 0.0),
                    analysis_results.get("ai_detection_score", 0.0)
                ))
                conn.commit()
                conn.close()
                
                logger.info(f"✅ AI detection analysis completed for video {video_id}")
                logger.info(f"📊 Quality Score: {analysis_results.get('quality_score', 0.0):.1f}%")
                logger.info(f"🤖 AI Detection Score: {analysis_results.get('ai_detection_score', 0.0):.1f}%")
                
                # Update final status
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE videos SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, ("completed", 100, video_id))
                conn.commit()
                conn.close()
                
            except Exception as analysis_error:
                logger.error(f"❌ AI detection analysis failed: {str(analysis_error)}")
                # Update status to completed even if analysis failed
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE videos SET status = ?, progress = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, ("completed", 100, f"Analysis failed: {str(analysis_error)}", video_id))
                conn.commit()
                conn.close()
            
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
            
            # STEP 4: Wait for complete indexing before next iteration
            log_progress(video_id, f"⏳ Waiting for video indexing (Iteration {iteration})", 55)
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
        """Detect AI generation using Marengo and Pegasus"""
        try:
            logger.info(f"🔍 Starting AI detection for video {video_id}")
            
            client = TwelveLabs(api_key=api_key)
            search_client = client.search
            analyze_client = client  # Direct client for analyze method
            
            # Marengo search
            search_results = await AIDetectionService._search_for_ai_indicators(
                search_client, index_id, video_id
            )
            
            # Pegasus analysis
            analysis_results = await AIDetectionService._analyze_with_pegasus(
                analyze_client, video_id
            )
            
            # Calculate quality scores
            quality_score = AIDetectionService._calculate_quality_score(search_results, analysis_results)
            ai_detection_score = AIDetectionService._calculate_ai_detection_score(search_results, analysis_results)
            
            return {
                "search_results": search_results,
                "analysis_results": analysis_results,
                "quality_score": quality_score,
                "ai_detection_score": ai_detection_score
            }
            
        except Exception as e:
            logger.error(f"❌ AI detection error: {str(e)}")
            raise e
    
    @staticmethod
    async def _search_for_ai_indicators(search_client, index_id: str, video_id: str):
        """Search for AI indicators using Marengo - optimized with batched queries"""
        # Batch queries into categories for more efficient searching
        ai_detection_categories = {
            "facial_artifacts": "unnatural facial symmetry, artificial facial proportions, synthetic facial structure, unnatural eye movements, artificial pupil dilation, mechanical blinking patterns, artificial skin texture, synthetic skin tone, unnatural skin smoothness, robotic facial expressions, artificial cheekbones, synthetic eye reflections",
            
            "motion_artifacts": "jerky movements, unnatural motion blur, artificial motion smoothing, synthetic frame transitions, mechanical object tracking, perfectly timed actions, temporal inconsistencies, artificial time progression, synthetic temporal patterns",
            
            "lighting_artifacts": "inconsistent lighting, artificial shadow patterns, unnatural light sources, synthetic illumination, artificial ambient lighting, inconsistent shadow directions, artificial depth of field",
            
            "audio_artifacts": "robotic speech patterns, artificial voice modulation, synthetic intonation, unnatural speech rhythm, artificial pronunciation, synthetic accent patterns",
            
            "environmental_artifacts": "inconsistent environmental details, artificial background elements, synthetic scene composition, unnatural object placement, impossible physics scenarios, unnatural gravity effects, artificial floating objects",
            
            "ai_generation_artifacts": "GAN artifacts, diffusion model artifacts, deep learning artifacts, machine learning artifacts, AI generation artifacts, artificial compression patterns, AI generated art, synthetic creative content, artificial artistic expression, generated creative works, synthetic artistic style, artificial creative patterns",
            
            "behavioral_artifacts": "cat drinking tea, animals doing human activities, impossible animal behavior, unnatural animal interactions, synthetic animal movements, artificial pet behavior, unnatural social interactions, artificial human behavior, synthetic social patterns",
            
            "quality_artifacts": "inconsistent video quality, artificial quality patterns, synthetic quality variations"
        }
        
        all_results = []
        
        for category, query_text in ai_detection_categories.items():
            try:
                logger.info(f"🔍 Searching for {category} indicators...")
                
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
        return all_results
    
    @staticmethod
    async def _analyze_with_pegasus(analyze_client, video_id: str):
        """Analyze video using Pegasus"""
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
        """Calculate quality score based on results"""
        if not search_results and not analysis_results:
            return 0.0
        
        # Simple scoring based on number of indicators found
        search_score = min(len(search_results) * 2, 100) if search_results else 0
        analysis_score = min(len(analysis_results) * 10, 100) if analysis_results else 0
        
        return (search_score + analysis_score) / 2
    
    @staticmethod
    def _calculate_ai_detection_score(search_results, analysis_results):
        """Calculate AI detection score"""
        if not search_results and not analysis_results:
            return 0.0
        
        # Higher score means more likely to be AI generated
        search_score = min(len(search_results) * 5, 100) if search_results else 0
        analysis_score = min(len(analysis_results) * 15, 100) if analysis_results else 0
        
        return (search_score + analysis_score) / 2

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
            import google.generativeai as genai
            
            # Configure Gemini
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt_text = f"""You are an expert video generation prompt engineer. Analyze the given prompt and AI detection results to create an improved prompt that will generate higher quality, more realistic videos with fewer AI artifacts.

Original prompt: {original_prompt}

AI Detection Results: {json.dumps(analysis_results, indent=2)}

Create an enhanced prompt that addresses the detected issues and improves video quality. Focus on:
1. Making the scenario more natural and realistic
2. Reducing AI-generated artifacts
3. Improving visual consistency
4. Adding specific details that make the video more believable

Return only the enhanced prompt, no additional text."""
            
            response = model.generate_content(prompt_text)
            
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
        "features": ["video_generation", "ai_detection", "quality_grading", "prompt_enhancement"],
        "endpoints": {
            "health": "/health",
            "generate_video": "/api/videos/generate",
            "upload_video": "/api/videos/upload",
            "grade_video": "/api/videos/{video_id}/grade",
            "video_status": "/api/videos/{video_id}/status",
            "video_logs": "/api/videos/{video_id}/logs",
            "list_videos": "/api/videos",
            "play_video": "/api/videos/{video_id}/play"
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
                
                # STEP 1: Search and analyze the video
                logger.info(f"🔍 Step 1: Searching video {request.video_id} for content analysis")
                search_results = client.search.query(
                    index_id=search_index_id,
                    query_text=f"Analyze this video in detail: visual elements, style, composition, lighting, movement, subjects, mood, and quality",
                    search_options=["visual", "audio"],
                    page_limit=5  # Get more comprehensive results
                )
                
                # Collect search results
                search_data = []
                for result in search_results:
                    search_data.append({
                        "score": result.score if hasattr(result, 'score') else 0,
                        "start_time": result.start_time if hasattr(result, 'start_time') else 0,
                        "end_time": result.end_time if hasattr(result, 'end_time') else 0,
                        "metadata": result.metadata if hasattr(result, 'metadata') else {}
                    })
                
                analysis_data["search_results"] = search_data
                logger.info(f"✅ Collected {len(search_data)} search results")
                
                # STEP 2: Feed analysis to Gemini Flash for enhancement
                logger.info(f"🧠 Step 2: Processing with Gemini Flash for prompt enhancement")
                import google.generativeai as genai2
                genai2.configure(api_key=GEMINI_API_KEY)
                model = genai2.GenerativeModel('gemini-2.0-flash-exp')
                
                analysis_prompt = f"""
                You are analyzing iteration #{iteration_number} of a video enhancement process.
                
                Original request: {request.prompt}
                Video ID: {request.video_id}
                
                Search Analysis Results:
                {json.dumps(search_data, indent=2)}
                
                Based on this analysis, create an ENHANCED prompt for the next iteration that:
                1. Identifies specific weaknesses in the current video
                2. Maintains core concept but improves:
                   - Visual quality and coherence
                   - Cinematography and composition
                   - Lighting and color grading
                   - Motion smoothness and realism
                   - Subject details and consistency
                3. Adds specific technical improvements
                4. Includes version indicator: "Iteration {iteration_number + 1}"
                
                Return ONLY the enhanced prompt for video generation, no explanations.
                Be specific and detailed about improvements needed.
                """
                
                response = model.generate_content(analysis_prompt)
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
            request.video_id, request.max_retries or 5
        ))
        
        video_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
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
            request.max_retries or 5,
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
    confidence_threshold: float = Form(50.0),
    max_retries: int = Form(5),
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

@app.get("/api/videos/{video_id}/logs")
async def get_video_logs(video_id: int):
    """Get progress logs for a video"""
    try:
        logs = progress_logs.get(video_id, [])
        return {
            "success": True,
            "data": {
                "video_id": video_id,
                "logs": logs
            }
        }
    except Exception as e:
        logger.error(f"❌ Logs retrieval error: {str(e)}")
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
                "index_id": video[8],
                "twelvelabs_video_id": video[9],
                "created_at": video[10],
                "updated_at": video[11],
                "analysis_results": analysis_data
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
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)