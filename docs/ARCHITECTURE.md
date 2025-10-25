# 🏗️ Recurser System Architecture

## 🔄 Video Enhancement Workflow

Your complete workflow diagram showing the iterative enhancement process:

```
┌─────────────────────┐
│   Video Input Given │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ (optional: indexed by TL if not     │◄─────────┐
│  done so already)                   │          │
└──────────┬──────────────────────────┘          │
           │                                     │
           ▼                                     │
┌─────────────────────────────────────┐          │
│ Analyzed by Pegasus                 │          │
│ (to understand original video       │          │
│  content)                           │          │
└──────────┬──────────────────────────┘          │
           │                                     │
           ▼                                     │
┌─────────────────────────────────────┐          │
│ Gemini uses analysis output to      │          │
│ generate a prompt for Veo2          │          │
└──────────┬──────────────────────────┘          │
           │                                     │
           ▼                                     │
┌─────────────────────────────────────┐          │
│ Generate iteration X and            │          │
│ upload/index with TL                │          │
└──────────┬──────────────────────────┘          │
           │                                     │
           ▼                                     │
┌─────────────────────────────────────┐          │
│ Use Marengo (Search) and Pegasus    │          │
│ (Analyze) to spot flaws and         │          │
│ write up                            │          │
└──────────┬──────────────────────────┘          │
           │                                     │
           ▼                                     │
┌─────────────────────────────────────┐          │
│ Calculate AI-detection score/       │          │
│ quality/confidence in generation    │          │
└──────┬──────────────────────────────┘          │
       │                     │                  │
       ▼                     ▼                  │
┌─────────────────┐  ┌──────────────────────────┐│
│ IF passing      │  │ ELSE re-iterate again    ││
│ threshold of    │  │ with updated analysis    ││
│ attempted 100%  │  │ for prompt regeneration  ││
│ OR max attempts │  │ to make next prompt      ││
│ reached         │  └──────────────────────────┘│
└─────────┬───────┘                             │
          │                                     │
          │            ┌────────────────────────┘
          │            │
          ▼            ▼
┌─────────────────────────────────────┐
│ Display last prompt used and        │
│ final video                         │
└─────────────────────────────────────┘
```

## 🏛️ System Components

### 🎯 Frontend (Next.js)
```
src/
├── app/
│   ├── enhance/          # Video enhancement page
│   ├── playground/       # Default video selection
│   ├── status/          # Real-time project status
│   └── api/             # Proxy routes to backend
├── components/
│   ├── ProjectStatus.tsx        # Main status display
│   ├── EnhancedTerminal.tsx     # Live logs with sidebar
│   ├── VideoPlayerEnhanced.tsx  # HLS + MP4 player
│   ├── PlaygroundView.tsx       # Default video browser
│   ├── VideoUploadForm.tsx      # Upload interface
│   └── VideoGenerationForm.tsx  # Text-to-video form
└── lib/
    ├── api.ts           # Backend communication
    └── config.ts        # App configuration
```

**Key Features:**
- **Real-time Updates**: Polling-based log streaming (Vercel compatible)
- **Video Playback**: Intelligent HLS/MP4 player with fallbacks
- **Progress Tracking**: Live iteration count, quality scores, status
- **Log Management**: Rolling 200-log buffer with noise filtering
- **Responsive UI**: Tailwind CSS with mobile-first design

### ⚙️ Backend (FastAPI)
```
backend/
├── app.py                    # Main FastAPI application (3000+ lines)
├── uploads/                  # Temporary video storage
├── cleanup_uploads.py        # Automated file cleanup
├── setup_cleanup.sh          # Cron job configuration
└── recurser_validator.db     # SQLite database
```

**Core Services:**
- **VideoGenerationService**: Orchestrates entire enhancement workflow
- **AIDetectionService**: Analyzes videos using TwelveLabs models
- **StreamLogHandler**: Custom logging for real-time frontend updates
- **Database Management**: SQLite with automatic schema initialization

### 🤖 AI Services Integration

#### 1. **Google Veo2** - Video Generation
- **Model**: `veo-2.0-generate-001`
- **Purpose**: Generate high-quality videos from enhanced prompts
- **Usage**: Creates each iteration based on Gemini-enhanced prompts

#### 2. **TwelveLabs Pegasus** - Video Analysis
- **Purpose**: Video-to-text content analysis and understanding
- **API**: `client.analyze.create(video_id=video_id, prompt=analysis_prompt)` (POST /v1.3/analyze)
- **Usage**: Initial content analysis + iteration quality assessment

#### 3. **TwelveLabs Marengo** - AI Artifact Detection
- **Purpose**: Search for specific AI generation indicators and flaws
- **API**: `client.search.query(query_text=search_query, options=["visual"])`
- **Usage**: Detects facial artifacts, motion issues, lighting problems

#### 4. **Google Gemini 2.0 Flash** - Prompt Enhancement
- **Model**: `gemini-2.0-flash-exp`
- **Purpose**: Generate enhanced prompts based on video analysis
- **Usage**: Creates improved prompts for next Veo2 iteration

## 🗄️ Database Schema

### Videos Table
```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    status TEXT DEFAULT 'pending',
    video_path TEXT,                    -- Local file path (final iteration)
    current_confidence REAL DEFAULT 0.0, -- Current quality score
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_id TEXT,
    video_url TEXT,
    index_id TEXT,
    twelvelabs_video_id TEXT,           -- TwelveLabs video ID
    iteration_count INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 3,
    source_video_id TEXT,
    final_confidence REAL DEFAULT 0.0,  -- Final quality score
    thumbnail_url TEXT,
    detailed_logs TEXT
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 3,
    current_iteration INTEGER DEFAULT 0,
    confidence_threshold REAL DEFAULT 100.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id)
);
```

## 🔄 Data Flow

### 1. **Video Input Processing**
```
Default Video → Already indexed in TwelveLabs
Upload Video → TwelveLabs indexing → Wait for completion → Analysis
Generate Video → Veo2 generation → TwelveLabs upload → Analysis
```

### 2. **Iterative Enhancement Loop**
```
1. Pegasus Content Analysis → Detailed video understanding
2. Gemini Prompt Enhancement → Improved generation prompt
3. Veo2 Video Generation → New iteration created
4. TwelveLabs Upload → Index new video for analysis
5. Quality Assessment → Marengo + Pegasus scoring
6. Decision Point → Continue (score < 100%) or Complete (score ≥ 100%)
```

### 3. **Real-time Updates**
```
Backend Logs → Global Log Buffer → Rolling 200-entry limit
Video Progress → Database Updates → Frontend Polling (1s interval)
Important Events → Filtered Highlights → Sidebar Display
```

## 📡 API Architecture

### Core Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/videos/generate` | POST | Start text-to-video generation |
| `/api/videos/upload` | POST | Upload existing video for enhancement |
| `/api/videos/{id}/status` | GET | Get real-time project status |
| `/api/videos/{id}/play` | GET | Stream video (HLS redirect or MP4 file) |
| `/api/videos/{id}/info` | GET | Get video metadata and URLs |
| `/api/playground/videos` | GET | List default video collection |
| `/api/recent-logs` | GET | Get recent system logs (polling) |
| `/api/clear-logs` | POST | Clear all logs for fresh start |

### Request/Response Flow
```
Frontend Request → Next.js API Proxy → FastAPI Backend → AI Services
                                    ↓
Frontend Update ← Polling Response ← Database Update ← Processing Result
```

## 🛡️ Error Handling & Resilience

### Graceful Degradation
- **Pegasus Failures**: Continue with fallback generic analysis
- **API Rate Limits**: Clear error messages and retry logic
- **Network Issues**: Exponential backoff reconnection
- **File Cleanup**: Automatic removal of temporary files

### Logging Strategy
```
ERROR   → Critical failures requiring attention
WARNING → Recoverable issues and fallbacks  
INFO    → Normal operation and progress updates
DEBUG   → Detailed technical information (disabled in production)
```

### Log Management
- **Global Buffer**: 200-entry rolling limit
- **Noise Filtering**: Remove repetitive API calls and debug spam
- **Real-time Streaming**: Polling-based for Vercel compatibility
- **Session Clearing**: Fresh logs for each new video generation

## 🚀 Performance Optimizations

### Frontend Optimizations
- **Rolling Logs**: Automatic cleanup prevents memory bloat
- **Smart Polling**: 1-second intervals with connection management
- **Component Memoization**: Prevent unnecessary re-renders
- **Lazy Loading**: Load components on demand

### Backend Optimizations
- **Async Processing**: Non-blocking video generation workflow
- **File Cleanup**: Automatic removal of intermediate iterations
- **Database Indexing**: Optimized queries for status updates
- **Memory Management**: Limited log buffers with periodic cleanup

### AI Service Optimization
- **Parallel Analysis**: Marengo and Pegasus run concurrently where possible
- **Smart Caching**: Reuse analysis results within iterations
- **Efficient Prompting**: Optimized prompts for better AI responses

## 🔐 Security & Configuration

### Environment Variables
```env
# Required API Keys
GEMINI_API_KEY=your_gemini_key
TWELVELABS_API_KEY=your_twelvelabs_key

# Index Configuration
DEFAULT_INDEX_ID=68d0f9e55705aa622335acb0      # Test videos
PLAYGROUND_INDEX_ID=68d0f9f2e23608ddb86fba7a   # Production videos

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True  # Set to False in production
```

### File Security
- **Temporary Storage**: All uploads cleaned up automatically
- **Path Validation**: Secure file path handling
- **Size Limits**: Reasonable file size restrictions
- **Cleanup Jobs**: Daily cron job removes old files

This architecture ensures scalability, maintainability, and robust error handling while providing real-time feedback for the iterative video enhancement process.
