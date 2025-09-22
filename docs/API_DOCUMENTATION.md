# API Documentation

## 🎯 Overview

Complete API documentation for the Recurser backend, including all endpoints, request/response formats, and integration examples.

## 🔗 Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-backend-domain.com`

## 📋 Authentication

Currently, the API uses API key authentication through environment variables. No additional headers are required for requests.

## 🏥 Health Check

### GET /health

Check the health status of the API and its dependencies.

**Request:**
```bash
curl http://localhost:8000/health
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

**Status Codes:**
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

## 🎬 Video Generation

### POST /api/videos/generate

Generate a new video with iterative enhancement.

**Request Body:**
```json
{
    "prompt": "A photorealistic video of a cat playing in a garden",
    "index_id": "68d0f9e55705aa622335acb0",
    "max_iterations": 5,
    "target_confidence": 85.0,
    "gemini_api_key": "optional_gemini_key"
}
```

**Parameters:**
- `prompt` (string, required): Description of the video to generate
- `index_id` (string, required): TwelveLabs index ID for video storage
- `max_iterations` (integer, optional): Maximum number of enhancement iterations (default: 5)
- `target_confidence` (float, optional): Target confidence score (default: 85.0)
- `gemini_api_key` (string, optional): Override Gemini API key

**Response:**
```json
{
    "success": true,
    "data": {
        "video_id": 1,
        "status": "processing",
        "message": "Video generation started",
        "prompt": "A photorealistic video of a cat playing in a garden",
        "index_id": "68d0f9e55705aa622335acb0",
        "max_iterations": 5,
        "target_confidence": 85.0
    }
}
```

**Status Codes:**
- `200 OK`: Generation started successfully
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Generation failed

### POST /api/videos/upload

Upload an existing video for enhancement.

**Request Body:**
```json
{
    "prompt": "Enhance this video to make it more photorealistic",
    "index_id": "68d0f9e55705aa622335acb0",
    "video_file": "base64_encoded_video_data",
    "filename": "input_video.mp4",
    "max_iterations": 3,
    "target_confidence": 90.0
}
```

**Parameters:**
- `prompt` (string, required): Enhancement instructions
- `index_id` (string, required): TwelveLabs index ID
- `video_file` (string, required): Base64 encoded video data
- `filename` (string, required): Original filename
- `max_iterations` (integer, optional): Maximum iterations (default: 3)
- `target_confidence` (float, optional): Target confidence (default: 90.0)

**Response:**
```json
{
    "success": true,
    "data": {
        "video_id": 2,
        "status": "processing",
        "message": "Video upload and enhancement started",
        "filename": "input_video.mp4",
        "index_id": "68d0f9e55705aa622335acb0"
    }
}
```

## 📊 Video Status and Monitoring

### GET /api/videos/{video_id}/status

Get the current status and progress of a video.

**Parameters:**
- `video_id` (integer, path): Video ID

**Response:**
```json
{
    "success": true,
    "data": {
        "video_id": 1,
        "prompt": "A photorealistic video of a cat playing in a garden",
        "status": "processing",
        "video_path": "/uploads/veo_generated_1_iter3_1758530506.mp4",
        "confidence_threshold": 85.0,
        "progress": 60,
        "generation_id": "veo_12345",
        "error_message": null,
        "index_id": "68d0f9e55705aa622335acb0",
        "twelvelabs_video_id": "68d10bca5705aa622335b061",
        "created_at": "2025-09-22T09:20:00.000000",
        "updated_at": "2025-09-22T09:25:00.000000",
        "analysis_results": {
            "search_results": [
                {
                    "category": "facial_artifacts",
                    "indicators": ["unnatural_eye_movement", "smooth_skin_texture"]
                }
            ],
            "analysis_results": [
                {
                    "prompt": "Analyze facial features for AI generation indicators",
                    "response": "Detected subtle facial artifacts...",
                    "usage": {"prompt_tokens": 150, "completion_tokens": 200}
                }
            ],
            "quality_score": 75.5,
            "ai_detection_score": 25.0,
            "created_at": "2025-09-22T09:25:00.000000"
        }
    }
}
```

**Status Values:**
- `pending`: Video generation not started
- `processing`: Currently generating or analyzing
- `completed`: Generation finished successfully
- `failed`: Generation failed with error

### GET /api/videos/{video_id}/logs

Get processing logs for a video.

**Parameters:**
- `video_id` (integer, path): Video ID

**Response:**
```json
{
    "success": true,
    "data": {
        "video_id": 1,
        "logs": [
            "[09:20:15] 🔄 Starting iteration 1/5",
            "[09:20:20] 📊 Video 1: ⏳ Waiting for video generation...",
            "[09:20:45] ✅ Collected 5 search results",
            "[09:21:10] 🧠 Step 2: Processing with Gemini Flash",
            "[09:21:15] 🤖 AI Detection Score: 75.5%",
            "[09:21:20] 🔄 Starting iteration 2/5"
        ]
    }
}
```

## 📁 Index Management

### GET /api/index/{index_id}/videos

List all videos in a TwelveLabs index.

**Parameters:**
- `index_id` (string, path): TwelveLabs index ID

**Response:**
```json
{
    "success": true,
    "data": {
        "index_id": "68d0f9f2e23608ddb86fba7a",
        "videos": [
            {
                "id": "68d0fb02e23608ddb86fbad2",
                "title": "REAL_ants.mp4",
                "description": "Real video of ants",
                "duration": 31.7,
                "fps": 29.97,
                "width": 1920,
                "height": 1080,
                "size": 23427498,
                "thumbnail_url": "https://deuqpmn4rs7j5.cloudfront.net/.../thumbnails/...jpg",
                "video_url": "https://deuqpmn4rs7j5.cloudfront.net/.../stream/...m3u8",
                "created_at": "2025-09-22T07:30:11Z",
                "updated_at": "2025-09-22T07:32:10Z"
            }
        ],
        "total_count": 6
    }
}
```

## 🎥 Video Playback

### GET /api/videos/{video_id}/play

Get video file for playback.

**Parameters:**
- `video_id` (integer, path): Video ID

**Response:**
- **Success**: Video file stream
- **Error**: JSON error response

**Headers:**
- `Content-Type`: `video/mp4`
- `Content-Length`: File size in bytes

## 🔍 AI Detection Analysis

### Internal AI Detection Process

The system automatically performs AI detection analysis using TwelveLabs Marengo and Pegasus models.

#### Detection Categories

1. **Facial Artifacts** (`facial_artifacts`)
   - Unnatural facial symmetry
   - Mechanical eye movements
   - Artificial skin texture
   - Inconsistent facial proportions

2. **Motion Artifacts** (`motion_artifacts`)
   - Robotic or mechanical movements
   - Unnatural motion fluidity
   - Artificial gesture timing
   - Physics-defying actions

3. **Lighting Artifacts** (`lighting_artifacts`)
   - Inconsistent lighting and shadows
   - Artificial texture patterns
   - Unnatural color gradients
   - Synthetic reflections

4. **Audio Artifacts** (`audio_artifacts`)
   - Robotic speech patterns
   - Artificial voice modulation
   - Audio-visual sync issues
   - Synthetic background noise

5. **Environmental Artifacts** (`environmental_artifacts`)
   - Object placement inconsistencies
   - Physics violations
   - Depth of field inaccuracies
   - Temporal inconsistencies

6. **AI Generation Artifacts** (`ai_generation_artifacts`)
   - GAN model signatures
   - Diffusion model artifacts
   - Neural network patterns
   - Deep learning generation markers

7. **Behavioral Artifacts** (`behavioral_artifacts`)
   - Unnatural behavior patterns
   - Artificial decision making
   - Robotic interactions
   - Synthetic responses

8. **Quality Artifacts** (`quality_artifacts`)
   - Rendering inconsistencies
   - Artificial sharpness/blur
   - Synthetic material properties
   - Processing artifacts

#### Scoring System

- **AI Detection Score**: 0-100%
  - `0%`: Video passes as real (no AI indicators detected)
  - `100%`: Clearly AI-generated
- **Quality Score**: 0-100%
  - Overall video quality assessment
- **Confidence Score**: 0-100%
  - Enhancement confidence level

## 🔄 Iterative Enhancement Process

### Enhancement Workflow

1. **Initial Generation**: Generate video with initial prompt
2. **Upload to TwelveLabs**: Index video for analysis
3. **AI Detection Analysis**: Run comprehensive AI detection
4. **Score Evaluation**: Check if video passes as real (0% AI score)
5. **Prompt Enhancement**: Use Gemini to improve prompt based on analysis
6. **Next Iteration**: Generate improved video
7. **Repeat**: Continue until target confidence or max iterations reached

### Success Conditions

- **AI Detection Score = 0%**: Video passes as real
- **Target Confidence Reached**: Meets quality threshold
- **Max Iterations Reached**: Process completes

## 📝 Error Handling

### Standard Error Response

```json
{
    "success": false,
    "error": "Error message",
    "details": "Additional error details",
    "timestamp": "2025-09-22T09:25:01.467614"
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `400` | Bad Request | Check request parameters |
| `404` | Not Found | Verify resource exists |
| `422` | Validation Error | Check request format |
| `500` | Internal Server Error | Check server logs |
| `503` | Service Unavailable | Check API keys and dependencies |

### API Key Errors

```json
{
    "success": false,
    "error": "API key not configured",
    "details": "GEMINI_API_KEY environment variable not set"
}
```

### TwelveLabs Errors

```json
{
    "success": false,
    "error": "TwelveLabs API error",
    "details": "usage_limit_exceeded",
    "twelvelabs_error": {
        "code": "usage_limit_exceeded",
        "message": "API usage limit exceeded"
    }
}
```

## 🔧 Rate Limiting

### Current Limits

- **Video Generation**: 1 concurrent per API key
- **AI Detection**: 10 requests per minute
- **Index Operations**: 100 requests per minute

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1758530643
```

## 📊 Monitoring and Metrics

### Health Check Metrics

```json
{
    "status": "healthy",
    "database": {
        "status": "healthy",
        "video_count": 15,
        "connection_pool": "active"
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
    "performance": {
        "avg_generation_time": "45.2s",
        "success_rate": "94.5%",
        "active_generations": 2
    }
}
```

## 🧪 Testing

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Generate test video
curl -X POST http://localhost:8000/api/videos/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A simple test video",
    "index_id": "68d0f9e55705aa622335acb0"
  }'

# Check video status
curl http://localhost:8000/api/videos/1/status

# Get video logs
curl http://localhost:8000/api/videos/1/logs
```

### Load Testing

```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:8000/health

# Using curl in loop
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/videos/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Test video '$i'", "index_id": "68d0f9e55705aa622335acb0"}'
done
```

## 📚 SDK Examples

### Python SDK

```python
import requests
import time

class RecurserAPI:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def health_check(self):
        response = requests.get(f"{self.base_url}/health")
        return response.json()
    
    def generate_video(self, prompt, index_id, max_iterations=5):
        data = {
            "prompt": prompt,
            "index_id": index_id,
            "max_iterations": max_iterations
        }
        response = requests.post(f"{self.base_url}/api/videos/generate", json=data)
        return response.json()
    
    def get_video_status(self, video_id):
        response = requests.get(f"{self.base_url}/api/videos/{video_id}/status")
        return response.json()
    
    def wait_for_completion(self, video_id, timeout=300):
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_video_status(video_id)
            if status['data']['status'] in ['completed', 'failed']:
                return status
            time.sleep(5)
        raise TimeoutError("Video generation timed out")

# Usage
api = RecurserAPI()
result = api.generate_video("A cat playing", "68d0f9e55705aa622335acb0")
video_id = result['data']['video_id']
final_status = api.wait_for_completion(video_id)
```

### JavaScript SDK

```javascript
class RecurserAPI {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }
    
    async healthCheck() {
        const response = await fetch(`${this.baseUrl}/health`);
        return response.json();
    }
    
    async generateVideo(prompt, indexId, maxIterations = 5) {
        const response = await fetch(`${this.baseUrl}/api/videos/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, index_id: indexId, max_iterations: maxIterations })
        });
        return response.json();
    }
    
    async getVideoStatus(videoId) {
        const response = await fetch(`${this.baseUrl}/api/videos/${videoId}/status`);
        return response.json();
    }
    
    async waitForCompletion(videoId, timeout = 300000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const status = await this.getVideoStatus(videoId);
            if (['completed', 'failed'].includes(status.data.status)) {
                return status;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        throw new Error('Video generation timed out');
    }
}

// Usage
const api = new RecurserAPI();
const result = await api.generateVideo('A cat playing', '68d0f9e55705aa622335acb0');
const videoId = result.data.video_id;
const finalStatus = await api.waitForCompletion(videoId);
```

## 📞 Support

For API issues:

1. Check this documentation
2. Review error responses
3. Test with health endpoint
4. Check server logs
5. Create GitHub issue with detailed information

---

## 📄 Related Documentation

- [Backend Setup Guide](./BACKEND_SETUP.md)
- [Frontend Setup Guide](./FRONTEND_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
