# Recurser Validator - AI Video Generation & Quality Validation

A comprehensive system for generating high-quality AI videos with automatic quality validation and recursive improvement using advanced AI detection models.

## 🚀 Features

### Video Generation
- **Veo2 Integration**: Generate high-quality videos using Google's Veo2 model (cost-effective option)
- **Automatic Indexing**: Videos are automatically uploaded to TwelveLabs for analysis
- **Recursive Improvement**: Automatic re-generation with improved prompts based on quality analysis

### AI Detection & Quality Validation
- **Marengo Search**: 250+ AI detection queries to identify generation artifacts
- **Pegasus Analysis**: Deep content analysis using advanced AI models
- **Quality Scoring**: Comprehensive quality assessment with detailed metrics
- **Real-time Feedback**: Live progress tracking and status updates

### User Experience
- **Minimalist UI**: Clean, intuitive interface with real-time status updates
- **Progress Tracking**: Visual progress indicators and detailed status messages
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Responsive Design**: Works seamlessly across all devices

## 🏗️ Architecture

### Backend Services
- **VideoGenerationService**: Handles Veo2 video generation and TwelveLabs upload
- **AIDetectionService**: Manages Marengo search and Pegasus analysis
- **PromptEnhancementService**: Uses GPT-4 to improve prompts based on analysis results

### Database Schema
- **videos**: Stores video metadata, prompts, and status information
- **generation_tasks**: Tracks generation and analysis tasks
- **analysis_results**: Stores detailed analysis results and quality scores

### API Endpoints
- `POST /api/videos/generate` - Generate new video with quality validation
- `POST /api/videos/upload` - Upload existing video for analysis
- `POST /api/videos/{id}/grade` - Run AI detection analysis
- `GET /api/videos/{id}/status` - Get video status and progress
- `GET /api/videos` - List all videos
- `GET /api/videos/{id}/play` - Stream video for playback

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- Bun (or Node.js 18+)
- API Keys for:
  - Google Gemini (Veo2)
  - TwelveLabs (Marengo & Pegasus)
  - OpenAI (GPT-4)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd frontend
bun install
bun run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
gemini_api_key=your_gemini_api_key_here
TWELVELABS_API_KEY=your_twelvelabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### TwelveLabs Setup
1. Create a TwelveLabs account
2. Create an index with both Marengo and Pegasus engines enabled
3. Note your index ID for use in the frontend

## 📱 Usage

### Generate Video
1. Enter your TwelveLabs Index ID and API Key
2. Describe the video you want to generate
3. Set quality threshold (0-100%)
4. Set maximum retries (1-10)
5. Click "Generate Video"

### Upload Video
1. Enter your TwelveLabs Index ID and API Key
2. Select a video file to upload
3. Optionally enter the original prompt
4. Click "Upload Video"

### AI Detection Analysis
1. After generating or uploading a video
2. Click "Run AI Detection Analysis"
3. View detailed quality scores and analysis results

## 🔍 AI Detection Parameters

### Marengo Search Queries (250+)
- **Facial Features**: Unnatural symmetry, artificial proportions, synthetic structure
- **Movement Patterns**: Jerky movements, artificial motion, mechanical timing
- **Visual Artifacts**: Inconsistent lighting, artificial textures, rendering artifacts
- **Audio Patterns**: Robotic speech, artificial voice modulation, sync issues
- **Environmental**: Inconsistent details, artificial physics, impossible scenarios
- **Technical Artifacts**: GAN artifacts, diffusion model signatures, compression issues
- **Impossible Scenarios**: Animals doing human activities, physics violations
- **Creative Indicators**: AI-generated art, synthetic creative content

### Pegasus Analysis Prompts (3)
1. **Visual Analysis**: Detailed facial, movement, and artifact detection
2. **Technical Analysis**: Generation artifacts, audio analysis, rendering quality
3. **Contextual Analysis**: Behavioral patterns, narrative consistency, environmental logic

## 📊 Quality Scoring

### Quality Score (0-100%)
- Based on number of AI indicators found
- Higher score = better quality
- Threshold determines when to regenerate

### AI Detection Score (0-100%)
- Based on likelihood of AI generation
- Higher score = more likely AI generated
- Used for quality assessment

## 🔄 Recursive Improvement Process

1. **Generate Video**: Create video with Veo2
2. **Upload to TwelveLabs**: Index video for analysis
3. **Run AI Detection**: Analyze with Marengo and Pegasus
4. **Quality Assessment**: Calculate quality and AI detection scores
5. **Threshold Check**: Compare quality score to threshold
6. **Enhance Prompt**: Use GPT-4 to improve prompt if needed
7. **Regenerate**: Create new video with enhanced prompt
8. **Repeat**: Continue until quality threshold is met or max retries reached

## 🚨 Error Handling

### User-Friendly Error Messages
- **API Key Issues**: Clear instructions for configuration
- **Video Generation Failures**: Detailed error descriptions
- **Upload Issues**: File type and size validation
- **Analysis Failures**: Specific error messages for different failure types

### Comprehensive Logging
- Detailed logs for debugging
- Progress tracking for long-running operations
- Error categorization and handling

## 🔒 Security

- API keys are handled securely
- No sensitive data stored in frontend
- Proper error handling prevents information leakage
- Input validation and sanitization

## 📈 Performance

- **Parallel Processing**: Video generation and analysis run concurrently
- **Background Tasks**: Long-running operations don't block UI
- **Progress Tracking**: Real-time updates for user feedback
- **Efficient Database**: Optimized queries and indexing

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd frontend
bun test
```

## 📝 API Documentation

### Video Generation Request
```json
{
  "prompt": "A cat drinking tea in a garden",
  "confidence_threshold": 50.0,
  "max_retries": 5,
  "index_id": "your_index_id",
  "twelvelabs_api_key": "your_api_key"
}
```

### Analysis Response
```json
{
  "success": true,
  "message": "AI detection analysis completed",
  "data": {
    "search_results": [...],
    "analysis_results": [...],
    "quality_score": 75.5,
    "ai_detection_score": 60.2
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the error logs

## 🔮 Future Enhancements

- **Veo3 Support**: Integration with Google's Veo3 model
- **Batch Processing**: Multiple video generation and analysis
- **Advanced Analytics**: Detailed quality metrics and trends
- **Custom Models**: Support for custom AI detection models
- **API Rate Limiting**: Intelligent rate limiting and queuing
- **Cloud Deployment**: Easy deployment to cloud platforms

---

**Recurser Validator** - Making AI video generation more reliable and transparent through advanced quality validation.