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

## Quality Score Calculation

The Recurser system uses a sophisticated scoring algorithm to evaluate video quality and AI detection. Here's the complete formula:

### AI Detection Score (0-100%)
**Purpose**: Measures likelihood that the video is AI-generated

**Formula**:
```
AI Detection Score = (Search Score + Analysis Score) / 2

Where:
- Search Score = min(total_confidence / num_results, 100)
- Analysis Score = min(total_severity / num_results, 100)
```

**Components**:
- **Search Results**: Marengo 2.7 searches for AI indicators using visual/audio analysis
- **Analysis Results**: Pegasus 1.2 provides detailed analysis with severity levels
- **Confidence Levels**: Each search result has a confidence score (0-100)
- **Severity Weights**: High=30, Medium=20, Low=10

**Scoring Logic**:
- `0%` = No AI indicators detected (video appears real)
- `100%` = Strong AI indicators detected (video appears generated)

### Quality Score (0-100%)
**Purpose**: Measures overall video quality and consistency

**Formula**:
```
Quality Score = max(100 - search_penalty - analysis_penalty, 0)

Where:
- search_penalty = min(num_search_results × 3, 50)
- analysis_penalty = min(num_analysis_results × 8, 50)
```

**Penalty System**:
- **Search Penalty**: 3 points per AI indicator found (max 50 points)
- **Analysis Penalty**: 8 points per quality issue found (max 50 points)
- **Perfect Score**: 100% when no issues are detected

### Final Confidence Score (0-100%)
**Purpose**: Overall confidence that the video meets quality standards

**Formula**:
```
Final Confidence = 100 - AI Detection Score
```

**Interpretation**:
- `100%` = Video passes as real (no AI detected)
- `0%` = Video clearly AI-generated
- `50%+` = Generally acceptable quality
- `80%+` = High quality, minimal AI indicators

### Example Calculation

**Scenario**: Video with 2 search results (confidence: 60%, 40%) and 1 analysis result (severity: medium)

```
Search Score = (60 + 40) / 2 = 50
Analysis Score = 20 (medium severity)
AI Detection Score = (50 + 20) / 2 = 35%

Search Penalty = min(2 × 3, 50) = 6
Analysis Penalty = min(1 × 8, 50) = 8
Quality Score = max(100 - 6 - 8, 0) = 86%

Final Confidence = 100 - 35 = 65%
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
