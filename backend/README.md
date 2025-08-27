# Circuit/Recurser Backend

Flask API backend for the Circuit/Recurser Video Generation Validator system.

## Features

- **Marengo 2.7 Integration**: Video analysis and AI detection
- **Pegasus 1.2 Integration**: Prompt improvement and detailed analysis
- **Iterative Validation**: Recursive improvement until confidence threshold is met
- **Filepath Optimization**: Designed to work with filepaths from frontend
- **RESTful API**: Clean endpoints for video validation

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file in the backend directory:
   ```env
   TWELVELABS_API_KEY=your_twelvelabs_api_key_here
   ```

3. **Run the Server**:
   ```bash
   python app.py
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and backend initialization status.

### Validate Video
```
POST /validate
```

**Request Body**:
```json
{
  "filepath": "/path/to/video.mp4",
  "prompt": "Video generation prompt",
  "criteria": {
    "output_duration": 10.0,
    "objects_present": ["mountain", "river", "sunset"],
    "style": "photorealistic",
    "consistency": "natural lighting",
    "additional_requirements": "Smooth camera movement"
  },
  "max_iterations": 5,
  "confidence_threshold": 0.85
}
```

**Response**:
```json
{
  "success": true,
  "final_confidence": 0.87,
  "target_confidence": 0.85,
  "iterations_completed": 3,
  "filepath": "/path/to/video.mp4",
  "final_prompt": "Improved prompt...",
  "final_analysis": {
    "confidence_score": 0.87,
    "ai_detection_score": 0.45,
    "accuracy_score": 0.82,
    "issues_found": ["Low confidence detection"],
    "improvements_suggested": ["Improve lighting"],
    "analysis_summary": "Video analysis summary...",
    "is_ai_generated": false
  },
  "iteration_history": [...],
  "target_achieved": true
}
```

## Architecture

The backend follows the Circuit/Recurser architecture:

1. **INPUT**: Receives filepath and prompt from frontend
2. **PLANNER**: Determines validation workflow
3. **GRADER**: Uses Marengo 2.7 for video analysis
4. **RECURSER**: Iteratively improves using Pegasus 1.2

## Error Handling

- File not found errors
- API key validation
- TwelveLabs API errors
- Video processing timeouts

## Development

- **Logging**: Comprehensive logging for debugging
- **Error Recovery**: Graceful handling of API failures
- **Configuration**: Environment-based configuration
