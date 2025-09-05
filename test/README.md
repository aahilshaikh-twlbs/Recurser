# AI Generation Detection Program

A specialized Python program that uses TwelveLabs Marengo search and Pegasus analysis to detect AI-generated content in videos. **Automatically analyzes specific videos for AI generation indicators.**

## Features

- **🎯 Single Video Focus**: Analyzes one specific video (requires both index and video ID)
- **🔍 Marengo Search**: Automatically searches for 15+ AI generation indicators
- **🤖 Pegasus Analysis**: Deep content analysis with specialized AI detection prompts
- **📊 Combined Assessment**: Merges search and analysis results for comprehensive evaluation
- **⏱️ Timestamp Detection**: Shows exact video segments where AI indicators are found
- **🎨 Predefined Queries**: No user input needed - uses optimized AI detection queries

## What It Detects

### Marengo Search Indicators
- **Visual Patterns**: Perfect symmetry, unnatural movements, repetitive patterns
- **Lighting & Textures**: Artificial lighting, computer-generated textures, synthetic materials
- **Geometry & Artifacts**: Perfect geometry, artificial shadows, digital artifacts
- **Movement**: Mechanical movements, robotic motion, unnatural fluidity
- **Rendering**: Hyperrealistic rendering, perfect details, artificial sharpness
- **Environment**: Artificial environments, synthetic objects, computer graphics
- **Technical**: Generation artifacts, neural network artifacts, compression artifacts

### Pegasus Analysis Prompts
1. **General AI Detection**: Overall assessment with confidence levels
2. **Technical Indicators**: Unnatural movements, perfect symmetry, repetitive patterns
3. **Deepfake Analysis**: Synthetic elements, artificial animations, ML generation signs

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Set your TwelveLabs API key as an environment variable:
```bash
export TWELVELABS_API_KEY="your_api_key_here"
```

Or create a `.env` file in the project directory:
```
TWELVELABS_API_KEY=your_api_key_here
```

## Usage

### Interactive Mode

Run the main program for an interactive experience:

```bash
python test.py
```

The program will prompt you for:
- Index ID (required)
- Video ID (required)
- Then automatically runs the complete analysis

### Programmatic Usage

Use the `AIGenerationDetector` class in your own code:

```python
from test import AIGenerationDetector

# Initialize detector
detector = AIGenerationDetector(api_key="your_api_key")

# Run complete AI generation detection
detector.detect_ai_generation(
    index_id="your_index_id",
    video_id="your_video_id"
)

# Or run individual components
search_results = detector._search_for_ai_indicators(index_id, video_id)
analysis_results = detector._analyze_with_pegasus(video_id)
detector._provide_combined_assessment(search_results, analysis_results)
```

### Example Scripts

Run the example usage script to see different detection configurations:

```bash
python example_usage.py
```

## How It Works

### Step 1: Marengo Search Analysis
- Searches the video for 15+ predefined AI generation queries
- Uses visual and audio analysis
- Filters results to specific video only
- Provides timestamps and confidence scores

### Step 2: Pegasus AI Analysis
- Runs 3 specialized analysis prompts
- Deep content examination
- Technical AI generation assessment
- Confidence ratings and evidence

### Step 3: Combined Assessment
- Merges search and analysis results
- Provides overall AI generation likelihood
- Shows detailed findings with timestamps
- Gives actionable insights

## Output Format

### Search Results
- **Score**: Relevance score for each indicator
- **Confidence**: High/medium/low confidence levels
- **Timestamps**: Start/end times of detected segments
- **Transcription**: Audio content in detected segments

### Analysis Results
- **Prompt**: The analysis question asked
- **Response**: Detailed AI generation assessment
- **Tokens**: Analysis complexity and depth

### Overall Assessment
- **Search Count**: Number of AI indicators found
- **Analysis Count**: Number of Pegasus analyses completed
- **Risk Level**: Overall AI generation likelihood
- **Recommendations**: Next steps and insights

## Requirements

- Python 3.7+
- TwelveLabs Python SDK (v0.4.0)
- python-dotenv
- Valid TwelveLabs API key
- Access to a video index with Pegasus engine enabled
- Video must be indexed in the specified index

## API Requirements

### Marengo Engine
- Required for search functionality
- Enables visual and audio content search
- Provides timestamp-based results

### Pegasus Engine
- Required for analysis functionality
- Enables deep content analysis
- Provides AI generation assessment

## Error Handling

The program handles common errors gracefully:
- Missing API key
- Invalid index ID
- Invalid video ID
- Engine compatibility issues
- API rate limits and timeouts
- Network connectivity problems

## Troubleshooting

1. **API Key Issues**: Ensure your API key is set correctly
2. **Index Not Found**: Verify your index ID exists and is accessible
3. **Video Not Found**: Verify your video ID exists in the specified index
4. **Engine Errors**: Ensure both Marengo and Pegasus engines are enabled
5. **No Results**: Check video content and engine compatibility

## Use Cases

- **Content Moderation**: Detect AI-generated videos in user uploads
- **Media Verification**: Verify authenticity of video content
- **Research**: Study AI generation techniques and patterns
- **Compliance**: Ensure content meets platform guidelines
- **Quality Control**: Maintain content authenticity standards

## Performance

- **Search Time**: 15+ queries typically complete in 1-3 minutes
- **Analysis Time**: 3 Pegasus analyses typically complete in 2-5 minutes
- **Total Time**: Complete analysis usually takes 3-8 minutes per video
- **Accuracy**: Combines multiple detection methods for high confidence

## License

This project is provided as-is for educational and development purposes.
