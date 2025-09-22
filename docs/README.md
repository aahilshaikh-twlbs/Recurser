# Recurser - AI Video Enhancement Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start Guide](#quick-start-guide)
4. [Detailed Setup Instructions](#detailed-setup-instructions)
5. [API Documentation](#api-documentation)
6. [Frontend Components](#frontend-components)
7. [Backend Services](#backend-services)
8. [Database Schema](#database-schema)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)
11. [Development Workflow](#development-workflow)

## 🎯 Overview

Recurser is an AI-powered video enhancement platform that uses iterative generation to create photorealistic videos that pass as real (undetectable by AI detection systems). The platform combines:

- **Google Veo 2.0** for video generation
- **TwelveLabs Marengo & Pegasus** for AI detection analysis
- **Google Gemini 2.5 Flash** for intelligent prompt enhancement
- **Iterative refinement** until videos pass as real

### Key Features

- ✅ **Iterative Enhancement**: Automatically refines videos until they pass AI detection
- ✅ **Real-time Monitoring**: Live logs and progress tracking
- ✅ **Smart Stopping**: Stops when video passes as real (0% AI detection score)
- ✅ **Dual Index System**: Separate test and production indexes
- ✅ **Comprehensive Analysis**: Quality scoring and detailed feedback
- ✅ **Modern UI**: React/Next.js frontend with real-time updates

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External APIs │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│                 │
│                 │    │                 │    │ • Google Veo 2.0│
│ • React UI      │    │ • Video Gen     │    │ • TwelveLabs    │
│ • Real-time     │    │ • AI Detection  │    │ • Google Gemini │
│ • Status Updates│    │ • Iteration     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   Database      │
         └──────────────►│   (SQLite)      │
                        │                 │
                        │ • Video Metadata│
                        │ • Analysis Data │
                        │ • Iteration Logs│
                        └─────────────────┘
```

## 🚀 Quick Start Guide

### Prerequisites

- Python 3.12+
- Node.js 18+
- Git
- API Keys:
  - Google Gemini API key
  - TwelveLabs API key
  - Google Veo 2.0 access

### 1. Clone Repository

```bash
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser
```

### 2. Backend Setup

```bash
cd backend
pip3 install -r requirements.txt --break-system-packages
cp .env.example .env
# Edit .env with your API keys
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with backend URL
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📚 Detailed Setup Instructions

### Backend Configuration

#### Environment Variables

Create `/root/Code/Recurser/backend/.env`:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# TwelveLabs API
TWELVELABS_API_KEY=your_twelvelabs_api_key_here

# Database
DB_PATH=./recurser_validator.db

# Index Configuration
DEFAULT_INDEX_ID=68d0f9e55705aa622335acb0  # Test index
PLAYGROUND_INDEX_ID=68d0f9f2e23608ddb86fba7a  # Prod index

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

#### Database Initialization

The database is automatically initialized on first run. Schema includes:

- `videos` table: Video metadata and status
- `analysis_results` table: AI detection results
- `iterations` table: Iteration tracking

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/videos/generate` | POST | Generate new video |
| `/api/videos/upload` | POST | Upload existing video |
| `/api/videos/{id}/status` | GET | Get video status |
| `/api/videos/{id}/logs` | GET | Get processing logs |
| `/api/index/{id}/videos` | GET | List index videos |

### Frontend Configuration

#### Environment Variables

Create `/root/Code/Recurser/frontend/.env.local`:

```env
# Backend URL
BACKEND_URL=http://localhost:8000

# For production deployment
# BACKEND_URL=https://your-backend-domain.com
```

#### Component Structure

```
src/
├── app/
│   ├── enhance/          # Video enhancement page
│   ├── playground/       # Video playground
│   ├── status/          # Project status page
│   └── api/             # API routes
├── components/
│   ├── ProjectStatus.tsx    # Real-time status display
│   ├── VideoGenerationForm.tsx
│   ├── VideoUploadForm.tsx
│   └── PlaygroundView.tsx
└── lib/
    ├── api.ts           # API client
    └── config.ts        # Configuration
```

## 🔧 API Documentation

### Video Generation

#### POST `/api/videos/generate`

Generate a new video with iterative enhancement.

**Request Body:**
```json
{
  "prompt": "A photorealistic video of a cat playing in a garden",
  "index_id": "68d0f9e55705aa622335acb0",
  "max_iterations": 5,
  "target_confidence": 85.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": 1,
    "status": "processing",
    "message": "Video generation started"
  }
}
```

#### GET `/api/videos/{video_id}/status`

Get current status and progress of a video.

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": 1,
    "status": "processing",
    "progress": 60,
    "current_iteration": 3,
    "current_confidence": 75.5,
    "ai_detection_score": 25.0,
    "iterations": [...]
  }
}
```

### AI Detection Analysis

The system uses TwelveLabs Marengo and Pegasus for comprehensive AI detection:

#### Detection Categories

1. **Facial Artifacts**: Unnatural facial features, eye movements
2. **Motion Artifacts**: Robotic or mechanical movements
3. **Lighting Artifacts**: Inconsistent lighting and shadows
4. **Audio Artifacts**: Synthetic voice patterns
5. **Environmental Artifacts**: Physics violations, impossible scenarios
6. **AI Generation Artifacts**: GAN, diffusion model signatures
7. **Behavioral Artifacts**: Unnatural behavior patterns
8. **Quality Artifacts**: Rendering inconsistencies

#### Scoring System

- **AI Detection Score**: 0-100% (0% = passes as real)
- **Quality Score**: 0-100% (overall video quality)
- **Confidence Score**: 0-100% (enhancement confidence)

## 🎨 Frontend Components

### ProjectStatus Component

Real-time status display with:

- **Progress Tracking**: Current iteration and confidence
- **Live Logs**: Real-time processing messages
- **AI Scores**: Detection and quality metrics
- **Iteration Details**: Step-by-step enhancement history

```tsx
<ProjectStatus 
  project={{
    video_id: 1,
    status: "processing",
    current_iteration: 3,
    current_confidence: 75.5
  }} 
/>
```

### Video Generation Form

```tsx
<VideoGenerationForm 
  onGenerate={(data) => {
    // Handle video generation
  }}
/>
```

### Playground View

```tsx
<PlaygroundView 
  videos={videos}
  onEnhance={(video) => {
    // Handle video enhancement
  }}
/>
```

## ⚙️ Backend Services

### VideoGenerationService

Handles the core iterative enhancement logic:

```python
class VideoGenerationService:
    @staticmethod
    async def generate_iterative_video(
        prompt: str,
        video_id: int,
        index_id: str,
        twelvelabs_api_key: str,
        gemini_api_key: str,
        max_iterations: int = 5,
        target_confidence: float = 85.0
    ):
        # Iterative enhancement logic
```

### AIDetectionService

Comprehensive AI detection using TwelveLabs:

```python
class AIDetectionService:
    @staticmethod
    async def detect_ai_generation(
        index_id: str,
        video_id: str,
        twelvelabs_api_key: str
    ) -> Dict[str, Any]:
        # AI detection analysis
```

### PromptEnhancementService

Intelligent prompt refinement using Gemini:

```python
class PromptEnhancementService:
    @staticmethod
    async def enhance_prompt(
        original_prompt: str,
        analysis_results: Dict[str, Any],
        gemini_api_key: str
    ) -> str:
        # Prompt enhancement logic
```

## 🗄️ Database Schema

### Videos Table

```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    video_path TEXT,
    confidence_threshold REAL DEFAULT 85.0,
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
);
```

### Analysis Results Table

```sql
CREATE TABLE analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER,
    search_results TEXT,
    analysis_results TEXT,
    quality_score REAL,
    ai_detection_score REAL,
    confidence_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id)
);
```

## 🚀 Deployment Guide

### Backend Deployment

#### Using Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Manual Deployment

```bash
# Install dependencies
pip3 install -r requirements.txt --break-system-packages

# Set environment variables
export GEMINI_API_KEY="your_key"
export TWELVELABS_API_KEY="your_key"

# Run with gunicorn for production
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend Deployment

#### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```
   BACKEND_URL=https://your-backend-domain.com
   ```
3. Deploy automatically on git push

#### Manual Deployment

```bash
npm run build
npm start
```

### Environment Configuration

#### Production Backend (.env)

```env
GEMINI_API_KEY=your_production_gemini_key
TWELVELABS_API_KEY=your_production_twelvelabs_key
DB_PATH=/var/lib/recurser/recurser_validator.db
DEFAULT_INDEX_ID=your_production_test_index
PLAYGROUND_INDEX_ID=your_production_index
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

#### Production Frontend (.env.local)

```env
BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## 🔍 Troubleshooting

### Common Issues

#### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
pip3 install -r requirements.txt --break-system-packages
```

#### Health Check Fails

**Error**: `GET /health 404 (Not Found)`

**Solution**: Ensure backend is running on correct port and frontend `BACKEND_URL` is correct.

#### Gemini Import Error

**Error**: `cannot import name 'genai' from 'google'`

**Solution**: Use `import google.generativeai as genai` instead of `from google import genai`.

#### TwelveLabs API Errors

**Error**: `403 Forbidden` or `usage_limit_exceeded`

**Solution**: Check API key permissions and usage limits.

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Log Files

- Backend logs: `/root/Code/Recurser/backend/server.log`
- Frontend logs: Browser console
- Database: `/root/Code/Recurser/backend/recurser_validator.db`

## 🛠️ Development Workflow

### Local Development

1. **Start Backend**:
   ```bash
   cd backend
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test API**:
   ```bash
   curl http://localhost:8000/health
   ```

### Code Structure

```
Recurser/
├── backend/
│   ├── app.py              # Main FastAPI application
│   ├── services/           # Business logic services
│   ├── schemas/            # Pydantic models
│   ├── config/             # Configuration
│   └── api/                # API routes
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
└── docs/                   # Documentation
```

### Testing

#### Backend Tests

```bash
cd backend
python3 test_api.py
```

#### Frontend Tests

```bash
cd frontend
npm test
```

### Git Workflow

1. Create feature branch
2. Make changes
3. Test locally
4. Commit with descriptive message
5. Push to GitHub
6. Create pull request

### Code Quality

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: Use TypeScript, follow React best practices
- **Documentation**: Update docs for any API changes

---

## 📞 Support

For issues and questions:

1. Check this documentation
2. Review troubleshooting section
3. Check GitHub issues
4. Create new issue with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
