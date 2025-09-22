# Backend Setup Guide

## 🎯 Overview

This guide provides detailed instructions for setting up the Recurser backend, including all dependencies, configuration, and deployment options.

## 📋 Prerequisites

- **Python 3.12+** (recommended)
- **pip3** package manager
- **Git** for version control
- **API Keys**:
  - Google Gemini API key
  - TwelveLabs API key
  - Google Veo 2.0 access (if available)

## 🚀 Quick Setup

### 1. Clone and Navigate

```bash
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser/backend
```

### 2. Install Dependencies

```bash
# Install system dependencies
sudo apt update
sudo apt install python3-pip python3-dev build-essential

# Install Python packages
pip3 install -r requirements.txt --break-system-packages
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

**Required Environment Variables:**

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# TwelveLabs API
TWELVELABS_API_KEY=your_twelvelabs_api_key_here

# Database Configuration
DB_PATH=./recurser_validator.db

# Index Configuration
DEFAULT_INDEX_ID=68d0f9e55705aa622335acb0  # Test index for iterations
PLAYGROUND_INDEX_ID=68d0f9f2e23608ddb86fba7a  # Production index

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### 4. Start the Server

```bash
# Development mode with auto-reload
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Production mode
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 5. Verify Installation

```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected response:
{
    "status": "healthy",
    "timestamp": "2025-09-22T09:25:01.467614",
    "database": {
        "status": "healthy",
        "video_count": 0
    },
    "services": {
        "video_generation": "google-veo2",
        "ai_detection": "twelvelabs-marengo-pegasus",
        "prompt_enhancement": "google-gemini-2.5-flash"
    },
    "api_keys": {
        "gemini": "configured",
        "twelvelabs": "configured"
    },
    "version": "2.0.0"
}
```

## 📦 Dependencies

### Core Dependencies

```txt
fastapi==0.117.1
uvicorn==0.36.0
httpx==0.28.1
pydantic==2.11.9
python-multipart==0.0.20
twelvelabs==1.0.2
google-generativeai==0.8.5
python-dotenv==1.1.1
```

### System Dependencies

- **Python 3.12+**: Core runtime
- **pip3**: Package manager
- **build-essential**: Compilation tools
- **python3-dev**: Python development headers

## 🗄️ Database Setup

### Automatic Initialization

The database is automatically created and initialized on first run. The schema includes:

#### Videos Table

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

#### Analysis Results Table

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

### Manual Database Operations

```bash
# Initialize database manually
python3 init_db.py

# Reset database (WARNING: Deletes all data)
rm recurser_validator.db
python3 init_db.py
```

## 🔧 Configuration

### API Keys Setup

#### Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` file:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

#### TwelveLabs API

1. Sign up at [TwelveLabs](https://twelvelabs.io)
2. Get your API key from dashboard
3. Add to `.env` file:
   ```env
   TWELVELABS_API_KEY=your_actual_api_key_here
   ```

### Index Configuration

The system uses two TwelveLabs indexes:

- **Test Index** (`DEFAULT_INDEX_ID`): For iterative enhancements
- **Production Index** (`PLAYGROUND_INDEX_ID`): For source videos

Update these in your `.env` file with your actual index IDs.

## 🚀 Deployment Options

### Option 1: Direct Python

```bash
# Production with gunicorn
pip3 install gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
# Build image
docker build -t recurser-backend .

# Run container
docker run -p 8000:8000 --env-file .env recurser-backend
```

### Option 3: Systemd Service

Create `/etc/systemd/system/recurser-backend.service`:

```ini
[Unit]
Description=Recurser Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/root/Code/Recurser/backend
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/local/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable recurser-backend
sudo systemctl start recurser-backend
sudo systemctl status recurser-backend
```

## 🔍 API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2025-09-22T09:25:01.467614",
    "database": {
        "status": "healthy",
        "video_count": 0
    },
    "services": {
        "video_generation": "google-veo2",
        "ai_detection": "twelvelabs-marengo-pegasus",
        "prompt_enhancement": "google-gemini-2.5-flash"
    },
    "api_keys": {
        "gemini": "configured",
        "twelvelabs": "configured"
    },
    "version": "2.0.0"
}
```

### Video Generation

```bash
POST /api/videos/generate
Content-Type: application/json

{
    "prompt": "A photorealistic video of a cat playing in a garden",
    "index_id": "68d0f9e55705aa622335acb0",
    "max_iterations": 5,
    "target_confidence": 85.0
}
```

### Video Status

```bash
GET /api/videos/{video_id}/status
```

### Video Logs

```bash
GET /api/videos/{video_id}/logs
```

### Index Videos

```bash
GET /api/index/{index_id}/videos
```

## 🧪 Testing

### Run Tests

```bash
# Run API tests
python3 test_api.py

# Run demo test
python3 test_demo.py
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test video generation
curl -X POST http://localhost:8000/api/videos/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test video", "index_id": "68d0f9e55705aa622335acb0"}'
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Module Import Errors

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
pip3 install -r requirements.txt --break-system-packages
```

#### 2. Permission Errors

**Error**: `Permission denied` when creating database

**Solution**:
```bash
sudo chown -R $USER:$USER /root/Code/Recurser/backend
chmod 755 /root/Code/Recurser/backend
```

#### 3. Port Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use different port
uvicorn app:app --host 0.0.0.0 --port 8001
```

#### 4. API Key Errors

**Error**: `API key not configured`

**Solution**:
1. Check `.env` file exists
2. Verify API keys are correct
3. Ensure no extra spaces in `.env` file
4. Restart the server after changing `.env`

#### 5. Database Errors

**Error**: `Database is locked`

**Solution**:
```bash
# Check for running processes
ps aux | grep python

# Kill any stuck processes
pkill -f uvicorn

# Restart server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Log Files

- **Server logs**: Check terminal output
- **Database**: `/root/Code/Recurser/backend/recurser_validator.db`
- **Uploads**: `/root/Code/Recurser/backend/uploads/`

## 📊 Monitoring

### Health Monitoring

```bash
# Check if server is running
curl -s http://localhost:8000/health | jq '.status'

# Check database status
curl -s http://localhost:8000/health | jq '.database'
```

### Performance Monitoring

```bash
# Check memory usage
ps aux | grep uvicorn

# Check disk usage
du -sh /root/Code/Recurser/backend/

# Check database size
ls -lh recurser_validator.db
```

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Update requirements
pip3 install -r requirements.txt --upgrade --break-system-packages

# Update specific package
pip3 install fastapi --upgrade --break-system-packages
```

### Database Maintenance

```bash
# Backup database
cp recurser_validator.db recurser_validator_backup_$(date +%Y%m%d).db

# Vacuum database (reclaim space)
sqlite3 recurser_validator.db "VACUUM;"
```

### Log Rotation

```bash
# Rotate logs (if using log files)
mv server.log server_$(date +%Y%m%d).log
touch server.log
```

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review server logs
3. Verify API keys and configuration
4. Test with minimal example
5. Create GitHub issue with detailed error information

---

## 📄 Next Steps

After backend setup:

1. [Frontend Setup Guide](./FRONTEND_SETUP.md)
2. [API Documentation](./API_DOCUMENTATION.md)
3. [Deployment Guide](./DEPLOYMENT_GUIDE.md)
