# 🎯 Recurser - Complete Feature Documentation

## Overview

Recurser is an AI-powered video enhancement platform that iteratively improves AI-generated videos until they achieve photorealistic quality (100% confidence score). The system combines multiple AI services to analyze, enhance, and regenerate videos automatically.

---

## 🎬 Core Features

### 1. **Iterative Video Enhancement**

**What it does:** Automatically refines videos through multiple iterations until target quality is achieved.

**How it works:**
1. User provides a video (upload, select from playground, or generate from prompt)
2. System analyzes the video for AI artifacts and quality issues
3. AI generates an improved prompt based on detected problems
4. New enhanced video iteration is generated using the improved prompt
5. Process repeats until quality reaches 100% or max iterations reached

**Key Settings:**
- **Max Iterations:** 2, 3, 5, or custom (up to 10)
- **Target Confidence:** Default 100% (video passes as real)
- **Early Exit:** Stops automatically when quality threshold reached

**Implementation:** `VideoGenerationService.generate_iterative_video()`

---

### 2. **AI Artifact Detection (Marengo Search)**

**What it does:** Searches for 250+ specific AI generation indicators across 15+ categories.

**Detection Categories:**
- Facial artifacts (unnatural symmetry, robotic expressions)
- Motion artifacts (jerky movements, temporal inconsistencies)
- Lighting artifacts (inconsistent shadows, synthetic illumination)
- Audio artifacts (robotic speech, artificial voice modulation)
- Environmental artifacts (inconsistent details, impossible physics)
- AI generation artifacts (GAN artifacts, diffusion model patterns)
- Behavioral artifacts (animals doing human activities)
- Quality/texture/color/perspective/temporal/composition/detail/interaction artifacts

**Optimization Features:**
- **Early Exit:** Stops searching after 8+ searches with 0 indicators (likely 100%)
- **Periodic Checks:** Verifies completion status every 5 searches
- **Batched Queries:** Efficient category-based searching

**Implementation:** `AIDetectionService._search_for_ai_indicators()`

---

### 3. **Video Content Analysis (Pegasus)**

**What it does:** Deep video-to-text analysis to understand content, identify issues, and suggest improvements.

**Analysis Types:**
1. **Visual Analysis:** Facial features, movement patterns, visual artifacts, environmental consistency
2. **Technical Analysis:** Generation artifacts, audio patterns, rendering quality, technical indicators
3. **Contextual Analysis:** Behavioral patterns, narrative consistency, environmental logic

**Smart Optimization:**
- **Early Skip:** If Marengo finds 0 indicators, Pegasus analysis is skipped (100% confidence already confirmed)

**Implementation:** `AIDetectionService._analyze_with_pegasus()`

---

### 4. **Quality Scoring System**

**What it does:** Single consolidated quality metric (0-100%) that determines if video passes as photorealistic.

**Scoring Logic:**
- **0 AI Indicators Found:** 100% quality score (perfect - video passes)
- **Each Indicator Found:** Reduces score proportionally
- **Analysis Issues:** Additional penalties for quality problems

**Confidence Tracking:**
- `current_confidence`: Quality score during iterations
- `final_confidence`: Final score when completed
- **Target:** 100% = Video passes as real with no AI artifacts detected

**Implementation:** `AIDetectionService._calculate_quality_score()`

---

### 5. **Prompt Enhancement (Gemini 2.0 Flash)**

**What it does:** Generates improved prompts for next iteration based on detected issues.

**Enhancement Process:**
1. Receives original prompt + analysis results from Marengo/Pegasus
2. Identifies specific problems (facial artifacts, motion issues, etc.)
3. Creates enhanced prompt targeting improvements
4. Returns optimized prompt for Veo2 generation

**Fallback:** Uses original prompt if enhancement fails

**Implementation:** `PromptEnhancementService._generate_enhanced_prompt()`

---

### 6. **Video Generation (Google Veo2)**

**What it does:** Generates high-quality videos from text prompts using Google's Veo2 model.

**Model:** `veo-2.0-generate-001`

**Process:**
1. Receives enhanced prompt
2. Generates video via Veo2 API
3. Downloads generated video
4. Uploads to TwelveLabs for indexing/analysis
5. Saves locally for playback

**Iteration Tracking:** Each iteration is numbered and stored separately

**Implementation:** `VideoGenerationService.generate_video()`

---

### 7. **Real-Time Progress Tracking**

**What it does:** Live updates of enhancement progress with detailed logging.

**Status Updates:**
- **Status:** pending → generating → analyzing → completed/failed
- **Progress:** 0-100% completion percentage
- **Current Confidence:** Real-time quality score
- **Iteration Count:** Current/max iterations

**Real-Time Logs:**
- Backend terminal logs (200-entry rolling buffer)
- Important events sidebar (filtered highlights)
- Video-specific progress logs

**Polling:** Frontend polls status every 1 second, with smart connection management

**Implementation:** 
- Backend: `StreamLogHandler`, `log_progress()`, `log_detailed()`
- Frontend: `ProjectStatus.tsx`, `EnhancedTerminal.tsx`

---

### 8. **Multiple Video Input Methods**

#### A. **Playground Mode** (Default Videos)
- Browse pre-indexed videos from TwelveLabs
- Select video for enhancement
- Quick start with curated collection

#### B. **Upload Mode**
- Upload existing AI-generated video
- Automatic analysis and enhancement starts
- Supports MP4 format

#### C. **Generate Mode**
- Text-to-video generation from prompt
- Uses Veo2 to create initial video
- Enhancement begins automatically

**Implementation:** 
- Playground: `PlaygroundView.tsx`, `PlaygroundEnhanceForm.tsx`
- Upload: `VideoUploadForm.tsx`
- Generate: `VideoGenerationForm.tsx`

---

### 9. **Smart Video Playback**

**What it does:** Intelligent video player supporting both local MP4 files and HLS streams.

**Features:**
- **Auto-Detection:** Automatically detects best video source (local MP4 or HLS)
- **Cache Busting:** Prevents stale video playback with timestamp queries
- **HLS Support:** Full HLS.js integration for streaming
- **Native Fallback:** Safari native HLS support
- **Custom Controls:** Play/pause, mute, fullscreen, download
- **Progress Tracking:** Time display and progress bar

**Optimization:**
- Simplified HLS configuration (removed excessive options)
- Reduced console logging for performance
- Efficient memory management

**Implementation:** `VideoPlayerEnhanced.tsx`

---

### 10. **Database Management**

**Schema:**
- **videos:** Video metadata, prompts, status, confidence scores
- **analysis_results:** Detailed analysis data from Marengo/Pegasus
- **tasks:** Task tracking (optional)

**Operations:**
- Automatic schema initialization
- SQLite with WAL mode for concurrent access
- Transaction safety with proper commits

**Implementation:** Database initialization in `app.py`

---

### 11. **Log Management System**

**Features:**
- **Global Log Buffer:** 200-entry rolling limit
- **Video-Specific Logs:** Detailed logs per video
- **Real-Time Streaming:** SSE for live updates
- **Important Events:** Filtered highlights in sidebar
- **Noise Filtering:** Removes repetitive/debug logs

**Log Types:**
- `INFO`: Normal operation
- `SUCCESS`: Milestones (quality achieved, completion)
- `WARNING`: Recoverable issues
- `ERROR`: Failures requiring attention

**Implementation:** `StreamLogHandler`, `EnhancedTerminal.tsx`

---

### 12. **Performance Optimizations**

**Backend:**
- **Early Exit Logic:** Stops unnecessary searches/analysis when completion detected
- **Database WAL Mode:** Faster concurrent reads
- **Smart Query Batching:** Efficient category-based searches
- **Cache Control Headers:** Prevents stale video playback

**Frontend:**
- **Component Consolidation:** Single video player (removed 3 redundant components)
- **Rolling Log Buffers:** Prevents memory bloat
- **Smart Polling:** Efficient status updates
- **Memoization:** Reduced unnecessary re-renders

---

## 🔄 Complete Workflow

```
1. INPUT (Upload/Select/Generate)
   ↓
2. INITIAL ANALYSIS (Pegasus content analysis)
   ↓
3. ITERATION LOOP:
   ├─> Generate enhanced prompt (Gemini)
   ├─> Generate video (Veo2)
   ├─> Upload to TwelveLabs
   ├─> Search for AI indicators (Marengo) - 250+ queries
   ├─> Analyze content (Pegasus) - if needed
   ├─> Calculate quality score
   └─> IF score < 100% AND iterations < max: REPEAT
   ↓
4. COMPLETION (100% confidence OR max iterations reached)
   ↓
5. DISPLAY (Final video with quality metrics)
```

---

## 🛠️ Technical Stack

**Frontend:**
- Next.js 14+ (React)
- TypeScript
- Tailwind CSS
- HLS.js for streaming
- Framer Motion for animations

**Backend:**
- FastAPI (Python)
- SQLite with WAL mode
- Async/await throughout
- Custom logging system

**AI Services:**
- Google Veo2 (video generation)
- TwelveLabs Marengo (AI detection)
- TwelveLabs Pegasus (content analysis)
- Google Gemini 2.0 Flash (prompt enhancement)

---

## 📊 Key Metrics & Monitoring

**Quality Metrics:**
- `current_confidence`: Real-time quality (0-100%)
- `final_confidence`: Final quality score
- `ai_detection_score`: Raw AI detection percentage
- `iteration_count`: Current iteration number

**Performance Metrics:**
- Log buffer size (200 entries)
- Search queries completed
- Analysis time
- Video generation time

**Status Tracking:**
- `pending`: Initial state
- `generating`: Veo2 generation in progress
- `analyzing`: AI detection running
- `completed`: Finished successfully
- `failed`: Error occurred

---

## 🎯 Unique Selling Points

1. **Fully Automated:** Zero manual intervention needed
2. **Iterative Improvement:** Continuously refines until perfect
3. **Multi-AI Integration:** Combines 4 different AI services
4. **Real-Time Feedback:** Live progress and detailed logs
5. **Smart Optimization:** Early exits, efficient searches, caching
6. **Quality Guaranteed:** Stops only when 100% confidence achieved
7. **Multiple Input Methods:** Upload, select, or generate from text
8. **Production Ready:** Robust error handling, logging, monitoring

---

## 🔧 Configuration

**Environment Variables:**
- `GEMINI_API_KEY`: Google Gemini API key
- `TWELVELABS_API_KEY`: TwelveLabs API key
- `DEFAULT_INDEX_ID`: TwelveLabs index for iterations
- `PLAYGROUND_INDEX_ID`: TwelveLabs index for default videos

**User Settings:**
- Max iterations: 2, 3, 5, or custom (1-10)
- Target confidence: 100% (default)
- Video source: Upload, playground, or generate

---

This documentation covers all unique features of the Recurser platform. Each feature is designed to work seamlessly together to achieve the goal of generating photorealistic AI videos through iterative enhancement.

