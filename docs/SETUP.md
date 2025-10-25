# ⚙️ Recurser Setup & Configuration Guide

## 📋 Prerequisites

### System Requirements
- **Python**: 3.12+ (required for backend)
- **Node.js**: 18+ (required for frontend)
- **Git**: For cloning repository
- **Storage**: 2GB+ free space for video processing

### Required API Keys
- **Google Gemini API**: For prompt enhancement
- **TwelveLabs API**: For video analysis and indexing
- **Google Veo 2.0**: For video generation (requires GCP access)

## 🛠️ Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser
```

### 2. Backend Setup
```bash
cd backend

# Install Python dependencies
pip3 install -r requirements.txt --break-system-packages

# Create environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

#### Backend Environment Variables (.env)
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# TwelveLabs API  
TWELVELABS_API_KEY=your_twelvelabs_api_key_here

# Database Configuration
DB_PATH=./recurser_validator.db

# TwelveLabs Index Configuration
DEFAULT_INDEX_ID=68d0f9e55705aa622335acb0      # Test index
PLAYGROUND_INDEX_ID=68d0f9f2e23608ddb86fba7a   # Production index

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

#### Start Backend Server
```bash
# Development mode (auto-reload)
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Or run directly
python3 app.py
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install Node.js dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local
nano .env.local
```

#### Frontend Environment Variables (.env.local)
```env
# Backend URL (development)
BACKEND_URL=http://localhost:8000

# For production deployment
# BACKEND_URL=https://your-backend-domain.com
```

#### Start Frontend Server
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### 4. Verify Installation
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🚀 Production Deployment

### Backend Deployment Options

#### Option 1: VPS/Cloud Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.12
sudo apt install python3.12 python3.12-pip python3.12-venv -y

# Install system dependencies
sudo apt install git nginx supervisor -y

# Clone and setup application
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser/backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create production environment file
cp .env.example .env
# Edit with production values

# Install gunicorn for production
pip install gunicorn

# Run with gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Production Environment Variables
```env
# Production API Keys
GEMINI_API_KEY=your_production_gemini_key
TWELVELABS_API_KEY=your_production_twelvelabs_key

# Production Database
DB_PATH=/var/lib/recurser/recurser_validator.db

# Production Indexes
DEFAULT_INDEX_ID=your_production_test_index
PLAYGROUND_INDEX_ID=your_production_main_index

# Production Server Config
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For large video uploads
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

#### Supervisor Configuration
```ini
[program:recurser-backend]
command=/root/Recurser/backend/venv/bin/gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
directory=/root/Recurser/backend
user=root
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/recurser-backend.log
```

### Frontend Deployment (Vercel)

#### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as root directory

#### 2. Configure Environment Variables
In Vercel dashboard, add:
```env
BACKEND_URL=https://your-backend-domain.com
```

#### 3. Deploy
- Automatic deployment on git push
- Custom domain configuration available
- Built-in CDN and SSL

### Alternative Frontend Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Or serve with nginx
sudo cp -r .next/static /var/www/html/recurser/
sudo cp -r public/* /var/www/html/recurser/
```

## 📡 Complete API Reference

### Authentication
No authentication headers required. API keys are configured server-side.

### Core Video Endpoints

#### POST /api/videos/generate
Generate new video from text prompt.

**Request:**
```json
{
  "prompt": "A photorealistic cat playing in a garden",
  "index_id": "68d0f9e55705aa622335acb0",
  "max_iterations": 3,
  "confidence_threshold": 100.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": 1,
    "status": "processing",
    "message": "Video generation started",
    "redirect_url": "/status?id=1"
  }
}
```

#### POST /api/videos/upload
Upload existing video for enhancement.

**Request:** Multipart form data
- `file`: Video file
- `max_iterations`: Number (default: 3)
- `confidence_threshold`: Number (default: 100.0)
- `original_prompt`: String (auto-set to "Auto-analyzed by Pegasus AI")

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": 2,
    "status": "processing",
    "message": "Video uploaded and processing started",
    "redirect_url": "/status?id=2"
  }
}
```

#### GET /api/videos/{video_id}/status
Get real-time project status.

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": 1,
    "status": "processing",
    "progress": 75,
    "current_iteration": 2,
    "max_iterations": 3,
    "final_confidence": 85.5,
    "iteration_count": 2,
    "prompt": "Original prompt",
    "enhanced_prompt": "Enhanced prompt for iteration 2",
    "thumbnail_url": "https://...",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

#### GET /api/videos/{video_id}/play
Stream or download video.

**Response:**
- **Local MP4**: Direct file download
- **HLS Stream**: 302 redirect to TwelveLabs HLS URL

#### GET /api/videos/{video_id}/info
Get video information and URLs.

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "hls",
    "hls_url": "https://d2cp8xx7n5vxnu.cloudfront.net/.../stream.m3u8",
    "thumbnail_url": "https://d2cp8xx7n5vxnu.cloudfront.net/.../thumbnail.jpg",
    "status": "COMPLETE"
  }
}
```

### Utility Endpoints

#### GET /api/playground/videos
List default video collection.

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "video_id_1",
        "title": "Sample Video 1",
        "thumbnail": "https://...",
        "confidence_score": 75.5
      }
    ]
  }
}
```

#### GET /api/recent-logs
Get recent system logs (polling endpoint).

**Query Parameters:**
- `limit`: Number of logs to return (default: 200)
- `since`: Timestamp for logs after specific time

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-01T12:00:00Z",
        "message": "Starting iteration 2/3",
        "source": "video",
        "video_id": 1
      }
    ]
  }
}
```

#### POST /api/clear-logs
Clear all system logs.

**Response:**
```json
{
  "success": true,
  "message": "All logs cleared"
}
```

#### GET /health
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "database": {
    "status": "healthy",
    "video_count": 5
  },
  "services": {
    "video_generation": "google-veo2",
    "ai_detection": "twelvelabs-marengo-pegasus",
    "prompt_enhancement": "google-gemini-2.0-flash"
  },
  "api_keys": {
    "gemini": "configured",
    "twelvelabs": "configured"
  }
}
```

## 🛠️ Troubleshooting

### Common Backend Issues

#### ModuleNotFoundError
```bash
# Error: ModuleNotFoundError: No module named 'fastapi'
# Solution:
pip3 install -r requirements.txt --break-system-packages
```

#### Port Already in Use
```bash
# Error: [Errno 98] Address already in use
# Solution:
lsof -ti:8000 | xargs kill -9
# Or use different port:
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

#### Database Issues
```bash
# Error: database is locked
# Solution:
rm recurser_validator.db  # Will recreate on next start
```

#### API Key Issues
```bash
# Error: 403 Forbidden or API key invalid
# Solution:
1. Verify API keys in .env file
2. Check API key permissions
3. Verify API usage limits
```

### Common Frontend Issues

#### Connection Refused
```bash
# Error: ECONNREFUSED 127.0.0.1:8000
# Solution:
1. Verify backend is running on port 8000
2. Check BACKEND_URL in .env.local
3. Ensure no firewall blocking connection
```

#### Build Errors
```bash
# Error: Module not found or TypeScript errors
# Solution:
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Video Playback Issues
```bash
# Error: Video won't play or shows black screen
# Solution:
1. Check browser HLS.js support
2. Verify video URL accessibility
3. Try different browser (Chrome recommended)
4. Check network connectivity
```

### Log Analysis

#### Enable Debug Logging
```python
# In backend/app.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check Log Files
```bash
# Backend logs
tail -f backend/server.log

# System logs (if using supervisor)
tail -f /var/log/recurser-backend.log

# Nginx logs (if using nginx)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Performance Issues

#### Slow Video Processing
1. **Check API Rate Limits**: TwelveLabs and Google APIs have usage limits
2. **Verify Server Resources**: Ensure adequate CPU/memory
3. **Network Connectivity**: Check internet speed for API calls
4. **Database Performance**: Consider PostgreSQL for production

#### Memory Issues
1. **Log Buffer Size**: Reduce from 200 to 50 if needed
2. **File Cleanup**: Ensure automatic cleanup is working
3. **Process Management**: Monitor with `htop` or `ps aux`

#### Frontend Performance
1. **Clear Browser Cache**: Hard refresh (Ctrl+F5)
2. **Disable Browser Extensions**: May interfere with WebSocket/polling
3. **Check Network Tab**: Monitor for failed requests

### Database Management

#### Backup Database
```bash
# Create backup
cp recurser_validator.db recurser_validator.db.backup

# Restore backup
cp recurser_validator.db.backup recurser_validator.db
```

#### Reset Database
```bash
# Remove database (will recreate with fresh schema)
rm recurser_validator.db

# Restart backend to recreate
python3 app.py
```

#### View Database Contents
```bash
# Install sqlite3
sudo apt install sqlite3

# Open database
sqlite3 recurser_validator.db

# List tables
.tables

# View videos
SELECT * FROM videos;

# Exit
.quit
```

### File Management

#### Clean Uploads Folder
```bash
# Manual cleanup
rm -rf backend/uploads/*

# Setup automatic cleanup (runs daily at 2 AM)
cd backend
chmod +x setup_cleanup.sh
./setup_cleanup.sh
```

#### Check Disk Space
```bash
# Check available space
df -h

# Check folder sizes
du -sh backend/uploads/
du -sh backend/
```

### Network & Security

#### Firewall Configuration
```bash
# Allow backend port
sudo ufw allow 8000

# Allow nginx (if using)
sudo ufw allow 80
sudo ufw allow 443
```

#### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Advanced Configuration

### Custom Index Setup
1. Create new TwelveLabs index
2. Upload your video collection
3. Update `DEFAULT_INDEX_ID` or `PLAYGROUND_INDEX_ID` in .env
4. Restart backend

### Multi-Environment Setup
```bash
# Development
cp .env.example .env.dev

# Staging  
cp .env.example .env.staging

# Production
cp .env.example .env.prod

# Use specific environment
export ENV=production
# Load .env.prod in application
```

### Monitoring & Logging
```bash
# Install monitoring tools
pip install prometheus-client
pip install sentry-sdk

# Add to app.py for production monitoring
```

### Load Balancing
```nginx
# nginx.conf for multiple backend instances
upstream recurser_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}

server {
    location / {
        proxy_pass http://recurser_backend;
    }
}
```

---

**🎯 Need more help?** Check the [README.md](./README.md) for overview or [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details!
