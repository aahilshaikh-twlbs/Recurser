# Recurser - AI Video Enhancement Platform

## 🎯 Overview

Recurser is an AI-powered video enhancement platform that iteratively improves AI-generated videos until they pass as photorealistic. The system uses advanced AI models to analyze, enhance, and regenerate videos automatically.

### Key Features
- **Iterative Enhancement**: Automatically refines videos through multiple iterations
- **Multi-AI Integration**: Google Veo2, TwelveLabs Pegasus/Marengo, Gemini 2.0 Flash
- **Real-time Monitoring**: Live terminal logs and progress tracking
- **Quality Scoring**: Single consolidated quality metric (0-100%)
- **Smart Stopping**: Automatically stops when video achieves target quality

### How It Works
1. **Input**: Upload video, select from defaults, or generate from text prompt
2. **Analysis**: Pegasus analyzes video content, Marengo detects AI artifacts
3. **Enhancement**: Gemini creates improved prompts based on analysis
4. **Generation**: Veo2 generates enhanced video iteration
5. **Evaluation**: Quality scoring determines if another iteration is needed
6. **Repeat**: Process continues until target quality (100%) or max iterations reached

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- API Keys: Google Gemini, TwelveLabs, Google Veo 2.0

### 1. Clone & Setup Backend
```bash
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser/backend
pip3 install -r requirements.txt --break-system-packages
cp .env.example .env  # Add your API keys
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.local.example .env.local  # Set BACKEND_URL=http://localhost:8000
npm run dev
```

### 3. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📚 Documentation

- **[🏗️ ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, workflow diagrams, technical details
- **[⚙️ SETUP.md](./SETUP.md)** - Complete setup, deployment, API reference, troubleshooting

## 🎮 Usage

### Default Videos
1. Go to "Playground" tab
2. Select from pre-indexed video collection
3. Choose enhancement parameters (iterations, quality target)
4. Start enhancement process

### Upload Video
1. Go to "Upload" tab
2. Upload your AI-generated video
3. System automatically analyzes content with Pegasus
4. Enhancement begins automatically

### Generate from Prompt
1. Go to "Generate" tab
2. Enter text prompt for video creation
3. Veo2 generates initial video
4. Enhancement process begins automatically

### Monitor Progress
- **Live Terminal**: Real-time processing logs
- **Quality Score**: Current video quality (0-100%)
- **Iteration Count**: Current/max iterations
- **Important Events**: Key milestones in sidebar

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │    FastAPI      │    │   AI Services   │
│   Frontend      │◄──►│    Backend      │◄──►│                 │
│                 │    │                 │    │ • Google Veo2   │
│ • Real-time UI  │    │ • Video Logic   │    │ • TwelveLabs    │
│ • HLS Playback  │    │ • AI Integration│    │ • Gemini Flash  │
│ • Log Streaming │    │ • Database      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**📊 Complete workflow and technical details: [ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🔧 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
TWELVELABS_API_KEY=your_twelvelabs_api_key_here
DB_PATH=./recurser_validator.db
DEFAULT_INDEX_ID=68d0f9e55705aa622335acb0  # Test index
PLAYGROUND_INDEX_ID=68d0f9f2e23608ddb86fba7a  # Production index
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### Frontend (.env.local)
```env
BACKEND_URL=http://localhost:8000
```

## 🚀 Production Deployment

### Backend
```bash
# Install dependencies
pip3 install -r requirements.txt --break-system-packages

# Set production environment variables
export GEMINI_API_KEY="your_production_key"
export TWELVELABS_API_KEY="your_production_key"
export DEBUG=False

# Run with gunicorn for production
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variable: `BACKEND_URL=https://your-backend-domain.com`
3. Deploy automatically on git push

## 🛠️ Troubleshooting

### Common Issues
- **Backend won't start**: `pip3 install -r requirements.txt --break-system-packages`
- **Health check fails**: Verify backend port and frontend `BACKEND_URL`
- **Video won't play**: Check HLS.js browser support
- **Logs not updating**: Clear browser cache and reload

### Debug Mode
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📞 Support

1. Check [SETUP.md](./SETUP.md) for detailed configuration
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Check GitHub issues for known problems
4. Create new issue with detailed description

---

**🎯 Ready to enhance some videos?** Start with the Quick Start guide above!