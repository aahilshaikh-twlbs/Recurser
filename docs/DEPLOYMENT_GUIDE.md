# Deployment Guide

## 🎯 Overview

This guide covers deploying the Recurser platform to production environments, including backend, frontend, and database setup.

## 📋 Prerequisites

- **Server/VPS** with Ubuntu 20.04+ or similar
- **Domain name** (optional but recommended)
- **SSL certificate** (Let's Encrypt recommended)
- **API Keys**:
  - Google Gemini API key
  - TwelveLabs API key
  - Google Veo 2.0 access

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External APIs │
│   (Vercel)      │◄──►│   (VPS/Cloud)   │◄──►│                 │
│                 │    │                 │    │ • Google Veo 2.0│
│ • Next.js App   │    │ • FastAPI       │    │ • TwelveLabs    │
│ • Static Host   │    │ • Gunicorn      │    │ • Google Gemini │
│ • CDN           │    │ • Nginx         │    │                 │
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

## 🖥️ Backend Deployment

### Option 1: VPS/Cloud Server

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git

# Create application user
sudo useradd -m -s /bin/bash recurser
sudo usermod -aG sudo recurser
```

#### 2. Application Setup

```bash
# Switch to application user
sudo su - recurser

# Clone repository
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
nano .env
```

**Production Environment Variables:**

```env
# Google Gemini API
GEMINI_API_KEY=your_production_gemini_key

# TwelveLabs API
TWELVELABS_API_KEY=your_production_twelvelabs_key

# Database
DB_PATH=/home/recurser/Recurser/backend/recurser_validator.db

# Index Configuration
DEFAULT_INDEX_ID=your_production_test_index
PLAYGROUND_INDEX_ID=your_production_index

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False

# Security
SECRET_KEY=your_secret_key_here
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
```

#### 3. Systemd Service

Create `/etc/systemd/system/recurser-backend.service`:

```ini
[Unit]
Description=Recurser Backend API
After=network.target

[Service]
Type=exec
User=recurser
Group=recurser
WorkingDirectory=/home/recurser/Recurser/backend
Environment=PATH=/home/recurser/Recurser/backend/venv/bin
ExecStart=/home/recurser/Recurser/backend/venv/bin/gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable recurser-backend
sudo systemctl start recurser-backend
sudo systemctl status recurser-backend
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/recurser`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location /static/ {
        alias /home/recurser/Recurser/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/recurser /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL Certificate

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN useradd -m -u 1000 recurser && chown -R recurser:recurser /app
USER recurser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["gunicorn", "app:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

#### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  recurser-backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - TWELVELABS_API_KEY=${TWELVELABS_API_KEY}
      - DB_PATH=/app/recurser_validator.db
      - DEFAULT_INDEX_ID=${DEFAULT_INDEX_ID}
      - PLAYGROUND_INDEX_ID=${PLAYGROUND_INDEX_ID}
      - DEBUG=False
    volumes:
      - ./uploads:/app/uploads
      - ./recurser_validator.db:/app/recurser_validator.db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - recurser-backend
    restart: unless-stopped
```

#### 3. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend
docker-compose up -d --scale recurser-backend=3
```

### Option 3: Cloud Platform Deployment

#### AWS EC2

1. **Launch EC2 Instance**:
   - Ubuntu 20.04 LTS
   - t3.medium or larger
   - Security group with ports 22, 80, 443

2. **Configure Instance**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install dependencies
   sudo apt install -y python3 python3-pip nginx certbot
   
   # Follow VPS deployment steps above
   ```

3. **Configure Security Groups**:
   - Port 22: SSH access
   - Port 80: HTTP
   - Port 443: HTTPS

#### Google Cloud Platform

1. **Create Compute Engine Instance**:
   - Ubuntu 20.04 LTS
   - e2-medium or larger
   - Allow HTTP/HTTPS traffic

2. **Deploy Application**:
   ```bash
   # Follow VPS deployment steps
   # Use Cloud SQL for database (optional)
   ```

#### DigitalOcean Droplet

1. **Create Droplet**:
   - Ubuntu 20.04 LTS
   - 2GB RAM minimum
   - Enable monitoring

2. **Deploy Application**:
   ```bash
   # Follow VPS deployment steps
   # Use DigitalOcean Spaces for file storage (optional)
   ```

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

#### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select `frontend` as root directory

#### 2. Configure Environment Variables

In Vercel dashboard, add:

```
BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

#### 3. Deploy

- Vercel automatically deploys on git push
- Custom domain can be configured
- Automatic HTTPS included

### Option 2: Netlify

#### 1. Build Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend-domain.com/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy

### Option 3: Static Hosting

#### 1. Build Static Export

```bash
cd frontend
npm run build
npm run export
```

#### 2. Deploy to CDN

```bash
# Upload to AWS S3
aws s3 sync out/ s3://your-bucket-name --delete

# Upload to Cloudflare Pages
wrangler pages publish out

# Upload to any static host
rsync -avz out/ user@server:/var/www/html/
```

## 🗄️ Database Deployment

### Option 1: SQLite (Current)

**Pros:**
- Simple setup
- No additional infrastructure
- Good for small to medium scale

**Cons:**
- Single server only
- No horizontal scaling
- Limited concurrent writes

**Setup:**
```bash
# Database is automatically created
# Backup regularly
cp recurser_validator.db recurser_backup_$(date +%Y%m%d).db
```

### Option 2: PostgreSQL

#### 1. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Create Database

```bash
sudo -u postgres psql
CREATE DATABASE recurser;
CREATE USER recurser_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE recurser TO recurser_user;
\q
```

#### 3. Update Application

```python
# Update database connection in app.py
import psycopg2
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://recurser_user:secure_password@localhost/recurser"
engine = create_engine(DATABASE_URL)
```

### Option 3: Cloud Database

#### AWS RDS

1. **Create RDS Instance**:
   - PostgreSQL 13+
   - db.t3.micro for development
   - Multi-AZ for production

2. **Configure Security Group**:
   - Allow inbound from EC2 instance
   - Port 5432

3. **Update Application**:
   ```python
   DATABASE_URL = "postgresql://username:password@rds-endpoint:5432/recurser"
   ```

#### Google Cloud SQL

1. **Create Cloud SQL Instance**:
   - PostgreSQL
   - Choose region and tier

2. **Configure Connection**:
   - Private IP for security
   - Authorize networks

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 3. API Security

```python
# Add to app.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["your-backend-domain.com", "*.your-backend-domain.com"]
)
```

### 4. Environment Security

```bash
# Secure environment file
chmod 600 .env
chown recurser:recurser .env

# Rotate API keys regularly
# Use secrets management service
```

## 📊 Monitoring and Logging

### 1. Application Monitoring

```python
# Add to app.py
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('app.log', maxBytes=10485760, backupCount=5),
        logging.StreamHandler()
    ]
)
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

### 3. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/recurser

# Add:
/home/recurser/Recurser/backend/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 recurser recurser
}
```

### 4. Health Checks

```bash
# Create health check script
cat > /home/recurser/health_check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ $response -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy"
    exit 1
fi
EOF

chmod +x /home/recurser/health_check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/recurser/health_check.sh
```

## 🔄 Backup and Recovery

### 1. Database Backup

```bash
# SQLite backup
cp recurser_validator.db backups/recurser_$(date +%Y%m%d_%H%M%S).db

# PostgreSQL backup
pg_dump -h localhost -U recurser_user recurser > backups/recurser_$(date +%Y%m%d_%H%M%S).sql
```

### 2. File Backup

```bash
# Backup uploads directory
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Backup configuration
tar -czf backups/config_$(date +%Y%m%d_%H%M%S).tar.gz .env nginx.conf
```

### 3. Automated Backup

```bash
# Create backup script
cat > /home/recurser/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/recurser/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp recurser_validator.db $BACKUP_DIR/recurser_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/recurser/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/recurser/backup.sh
```

## 🚀 Scaling

### 1. Horizontal Scaling

#### Load Balancer Configuration

```nginx
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

#### Multiple Backend Instances

```bash
# Start multiple instances
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 &
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001 &
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8002 &
```

### 2. Vertical Scaling

```bash
# Increase worker processes
gunicorn app:app -w 8 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Use more powerful server
# Upgrade to larger instance type
```

### 3. CDN Integration

```bash
# Configure CloudFlare
# Add custom domain
# Enable caching
# Configure SSL
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
sudo journalctl -u recurser-backend -f

# Check port availability
sudo netstat -tlnp | grep :8000

# Check permissions
ls -la /home/recurser/Recurser/backend/
```

#### 2. Database Issues

```bash
# Check database file
ls -la recurser_validator.db

# Check database integrity
sqlite3 recurser_validator.db "PRAGMA integrity_check;"

# Repair database
sqlite3 recurser_validator.db "VACUUM;"
```

#### 3. SSL Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL
openssl s_client -connect your-domain.com:443
```

#### 4. Performance Issues

```bash
# Check system resources
htop
iotop
nethogs

# Check application logs
tail -f app.log

# Check database size
ls -lh recurser_validator.db
```

## 📞 Support

For deployment issues:

1. Check this guide
2. Review server logs
3. Test with health endpoint
4. Check firewall and security groups
5. Create GitHub issue with detailed information

---

## 📄 Next Steps

After deployment:

1. [API Documentation](./API_DOCUMENTATION.md)
2. [Monitoring Setup](./MONITORING_GUIDE.md)
3. [Security Hardening](./SECURITY_GUIDE.md)
