# Circuit Validator Project Structure

## 📁 Directory Overview

```
Circuit-Validator/
├── backend/                    # FastAPI backend application
│   ├── api/                   # API endpoints and routing
│   │   ├── __init__.py
│   │   └── main.py           # Main FastAPI application
│   ├── config/                # Configuration and settings
│   │   ├── __init__.py
│   │   └── settings.py        # Environment configuration
│   ├── models/                # Database models
│   │   ├── __init__.py
│   │   └── database.py        # SQLAlchemy models
│   ├── schemas/               # Pydantic schemas
│   │   ├── __init__.py
│   │   └── pydantic_models.py # API request/response models
│   ├── services/              # Business logic services
│   │   ├── __init__.py
│   │   ├── video_generator.py # Google Veo integration
│   │   ├── video_analyzer.py  # Marengo & Pegasus analysis
│   │   └── recursion_engine.py # Core recursion logic
│   ├── env.example            # Environment variables template
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                 # Backend startup script
│   └── test_demo.py           # Backend testing script
├── frontend/                  # Next.js frontend application
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── globals.css   # Global styles with Tailwind
│   │   │   ├── layout.tsx    # Root layout component
│   │   │   └── page.tsx      # Homepage component
│   │   └── components/       # React components
│   │       ├── VideoGenerationForm.tsx    # Video generation form
│   │       ├── VideoUploadForm.tsx        # Video upload form
│   │       └── ProjectStatus.tsx          # Project monitoring
│   ├── package.json          # Node.js dependencies
│   ├── next.config.ts        # Next.js configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── tsconfig.json         # TypeScript configuration
│   └── postcss.config.js     # PostCSS configuration
├── start.sh                   # Startup script for both services
├── README.md                  # Project documentation
└── PROJECT_STRUCTURE.md       # This file
```

## 🔧 Backend Architecture

### Core Services

1. **VideoGenerator** (`services/video_generator.py`)
   - Handles Google Veo API integration
   - Manages video generation requests
   - Implements prompt validation
   - Handles file storage and management

2. **VideoAnalyzer** (`services/video_analyzer.py`)
   - Integrates with TwelveLabs Marengo 2.7
   - Implements Pegasus 1.2 analysis
   - Provides AI content detection
   - Generates improvement suggestions

3. **RecursionEngine** (`services/recursion_engine.py`)
   - Orchestrates the iterative improvement process
   - Manages confidence scoring
   - Controls recursion flow
   - Handles project lifecycle

### API Endpoints

- `POST /api/videos/generate` - Start video generation
- `POST /api/videos/upload` - Upload existing video
- `GET /api/projects/{id}/status` - Get project status
- `POST /api/analyze/prompt` - Analyze prompt for improvements

### Data Models

- **User**: User accounts and authentication
- **Project**: Video generation projects
- **Iteration**: Individual video generation attempts
- **VideoAnalysis**: Analysis results and feedback

## 🎨 Frontend Architecture

### Component Structure

1. **VideoGenerationForm**
   - Prompt input with validation
   - Confidence threshold configuration
   - Maximum attempts setting
   - Real-time prompt analysis

2. **VideoUploadForm**
   - Drag-and-drop file upload
   - File validation and preview
   - Original prompt input
   - Processing configuration

3. **ProjectStatus**
   - Real-time progress monitoring
   - Iteration details and scores
   - Video preview and download
   - Completion status

### State Management

- Uses React hooks for local state
- Zustand for global state management
- Real-time updates via API polling
- Form validation with React Hook Form

### Styling

- Tailwind CSS for utility-first styling
- Custom component classes
- Responsive design with mobile-first approach
- Smooth animations with Framer Motion

## 🚀 Development Workflow

### Backend Development

1. **Setup Environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp env.example .env
   # Configure API keys in .env
   ```

2. **Run Development Server**
   ```bash
   python run.py
   # or
   uvicorn api.main:app --reload
   ```

3. **Test Backend**
   ```bash
   python test_demo.py
   ```

### Frontend Development

1. **Setup Dependencies**
   ```bash
   cd frontend
   bun install
   ```

2. **Run Development Server**
   ```bash
   bun run dev
   ```

### Full Stack Development

1. **Start Both Services**
   ```bash
   ./start.sh
   ```

2. **Access Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🔒 Security Considerations

- API key management via environment variables
- File upload validation and size limits
- CORS configuration for development
- Input validation and sanitization
- Rate limiting (to be implemented)

## 📊 Performance Optimizations

- Asynchronous video processing
- Background task handling
- Efficient file storage management
- Database query optimization
- Local file storage management

## 🧪 Testing Strategy

- Unit tests for core services
- Integration tests for API endpoints
- Frontend component testing
- End-to-end workflow testing
- Performance and load testing

## 🔄 Deployment

### Backend Deployment
- Docker containerization
- Environment-specific configurations
- Database migration management
- Health check endpoints

### Frontend Deployment
- Next.js static export
- CDN optimization
- Environment variable injection
- Build optimization

## 📈 Monitoring and Logging

- Application health endpoints
- Error tracking and reporting
- Performance metrics collection
- User activity logging
- System resource monitoring
