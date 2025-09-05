# AI Generation Detection - API Calls Documentation

## Overview

This document details how the AI Generation Detection program makes API calls to TwelveLabs Marengo and Pegasus engines to detect AI-generated content in videos.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Video Input   │───▶│  AI Detector     │───▶│  Combined       │
│  (Index + ID)   │    │  Program         │    │  Assessment     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  TwelveLabs API     │
                    │  ┌───────────────┐  │
                    │  │   Marengo     │  │
                    │  │   (Search)    │  │
                    │  └───────────────┘  │
                    │  ┌───────────────┐  │
                    │  │   Pegasus     │  │
                    │  │  (Analysis)   │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
```

## Marengo Search API Calls

### Purpose
Marengo performs visual and audio content search to find specific AI generation indicators within a video.

### API Endpoint
```
POST /v1.3/search
```

### Request Structure
```python
results = self.search_client.query(
    index_id=index_id,                    # Required: Index containing the video
    options=["visual", "audio"],          # Search both visual and audio content
    query_text=query,                     # The search term
    threshold="medium",                   # Confidence threshold
    sort_option="score",                  # Sort by relevance score
    group_by="clip",                      # Group results by individual clips
    page_limit=5,                         # Max 5 results per query
    filter={"video_id": video_id}         # Restrict search to specific video
)
```

### Search Terms (110 Total)

#### Facial and Human Features (15 terms)
1. `"unnatural facial symmetry"`
2. `"artificial facial proportions"`
3. `"synthetic facial structure"`
4. `"unnatural eye movements"`
5. `"artificial pupil dilation"`
6. `"mechanical blinking patterns"`
7. `"artificial skin texture"`
8. `"synthetic skin tone"`
9. `"unnatural skin smoothness"`
10. `"robotic facial expressions"`
11. `"artificial cheekbones"`
12. `"synthetic eye reflections"`
13. `"unnatural gaze direction"`
14. `"mechanical head movements"`
15. `"artificial hand movements"`

#### Movement and Animation (20 terms)
16. `"robotic body language"`
17. `"unnatural walking patterns"`
18. `"synthetic gesture timing"`
19. `"jerky movements"`
20. `"unnatural motion blur"`
21. `"artificial motion smoothing"`
22. `"synthetic frame transitions"`
23. `"mechanical object tracking"`
24. `"perfectly timed actions"`
25. `"unnatural action sequences"`
26. `"synthetic timing patterns"`
27. `"artificial rhythm consistency"`
28. `"mechanical pacing"`
29. `"impossible movements"`
30. `"unnatural physics"`
31. `"artificial camera movements"`
32. `"synthetic motion patterns"`
33. `"mechanical animation"`
34. `"unnatural fluidity"`
35. `"robotic motion"`

#### Visual Artifacts and Rendering (25 terms)
36. `"inconsistent lighting"`
37. `"artificial shadow patterns"`
38. `"unnatural light sources"`
39. `"synthetic illumination"`
40. `"artificial ambient lighting"`
41. `"inconsistent shadow directions"`
42. `"artificial light reflections"`
43. `"artificial texture patterns"`
44. `"synthetic material properties"`
45. `"unnatural surface details"`
46. `"artificial fabric textures"`
47. `"synthetic skin rendering"`
48. `"unnatural hair texture"`
49. `"artificial metal reflections"`
50. `"compression artifacts"`
51. `"generation artifacts"`
52. `"neural network artifacts"`
53. `"AI rendering artifacts"`
54. `"synthetic pixelation"`
55. `"artificial noise patterns"`
56. `"unnatural color gradients"`
57. `"synthetic color bleeding"`
58. `"artificial edge detection"`
59. `"unnatural object boundaries"`
60. `"artificial compression patterns"`

#### Audio and Speech Patterns (15 terms)
61. `"robotic speech patterns"`
62. `"artificial voice modulation"`
63. `"synthetic intonation"`
64. `"unnatural speech rhythm"`
65. `"artificial pronunciation"`
66. `"synthetic accent patterns"`
67. `"artificial background noise"`
68. `"synthetic audio compression"`
69. `"unnatural audio artifacts"`
70. `"artificial echo patterns"`
71. `"synthetic reverb"`
72. `"lip sync mismatches"`
73. `"audio visual desynchronization"`
74. `"artificial timing delays"`
75. `"unnatural audio quality"`

#### Environmental and Contextual (20 terms)
76. `"inconsistent environmental details"`
77. `"artificial background elements"`
78. `"synthetic scene composition"`
79. `"unnatural object placement"`
80. `"artificial depth of field"`
81. `"synthetic perspective"`
82. `"unnatural object interactions"`
83. `"artificial physics simulation"`
84. `"synthetic material behavior"`
85. `"unnatural object properties"`
86. `"artificial collision detection"`
87. `"synthetic gravity effects"`
88. `"inconsistent temporal details"`
89. `"artificial time progression"`
90. `"synthetic event sequencing"`
91. `"unnatural cause and effect"`
92. `"artificial narrative flow"`
93. `"synthetic story progression"`
94. `"impossible scenarios"`
95. `"unnatural world logic"`

#### Technical and Generation Artifacts (15 terms)
96. `"GAN artifacts"`
97. `"diffusion model artifacts"`
98. `"deep learning artifacts"`
99. `"machine learning artifacts"`
100. `"AI generation artifacts"`
101. `"artificial compression patterns"`
102. `"synthetic encoding artifacts"`
103. `"unnatural bitrate patterns"`
104. `"artificial noise reduction"`
105. `"synthetic image processing"`
106. `"unnatural filtering"`
107. `"stable diffusion artifacts"`
108. `"midjourney artifacts"`
109. `"DALL-E artifacts"`
110. `"neural network training artifacts"`

### Response Structure
```python
{
    "data": [
        {
            "score": 0.85,                    # Relevance score (0-1)
            "confidence": "high",             # Confidence level
            "start": 12.5,                    # Start time (seconds)
            "end": 18.2,                      # End time (seconds)
            "transcription": "...",           # Audio transcription
            "thumbnail_url": "...",           # Thumbnail image URL
            "video_id": "68afb3f388cce82e5261c560"
        }
    ]
}
```

### Execution Flow
```python
for query in ai_detection_queries:  # 35 queries total
    try:
        results = search_client.query(...)
        if results.data:
            print(f"✅ Found matches for: '{query}'")
            all_results.extend(results.data)
        else:
            print(f"❌ No matches for: '{query}'")
    except Exception as e:
        print(f"⚠️ Error searching for '{query}': {e}")
```

## Pegasus Analysis API Calls

### Purpose
Pegasus performs deep content analysis using natural language prompts to assess AI generation likelihood.

### API Endpoint
```
POST /v1.3/generate/text
```

### Request Structure
```python
response = self.analyze_client(
    video_id=video_id,                    # Required: Video to analyze
    prompt=prompt,                        # Analysis prompt
    temperature=0.1                       # Low temperature for deterministic results
)
```

### Analysis Prompts (3 Total)

#### Prompt 1: Visual Characteristics Analysis
```
"Analyze this video for visual characteristics that indicate AI generation. 
Look for: perfect symmetry, unnatural movements, repetitive patterns, 
artificial lighting, computer-generated textures, synthetic materials, 
perfect geometry, and digital artifacts. Rate the likelihood of AI 
generation from 1-10 with specific evidence."
```

#### Prompt 2: Technical Indicators Analysis
```
"Examine this video for technical indicators of AI generation. Focus on: 
mechanical movements, robotic motion, unnatural fluidity, perfect timing, 
synthetic animation, hyperrealistic rendering, artificial sharpness, and 
generation artifacts. Provide detailed analysis with confidence levels."
```

#### Prompt 3: Algorithmic Pattern Analysis
```
"Assess whether this video shows signs of AI generation. Look for: 
algorithmic patterns, artificial environments, synthetic objects, 
computer graphics, compression artifacts, neural network artifacts, 
and deep learning generation signs. Provide specific timestamps and 
evidence where possible."
```

### Response Structure
```python
{
    "data": "Based on my analysis, this video shows several indicators...",
    "usage": {
        "output_tokens": 150
    }
}
```

### Execution Flow
```python
for i, prompt in enumerate(analysis_prompts, 1):  # 3 prompts total
    try:
        print(f"🔍 Analysis {i}/3: Running Pegasus analysis...")
        response = analyze_client(video_id=video_id, prompt=prompt, temperature=0.1)
        if response.data:
            analysis_results.append({
                'prompt': prompt,
                'response': response.data,
                'usage': response.usage
            })
            print(f"✅ Analysis {i} completed successfully")
    except Exception as e:
        print(f"❌ Error in analysis {i}: {e}")
```

## Combined Assessment Logic

### Scoring Algorithm
```python
def _provide_combined_assessment(search_results, analysis_results):
    search_count = len(search_results) if search_results else 0
    analysis_count = len(analysis_results) if analysis_results else 0
    
    if search_count == 0 and analysis_count == 0:
        return "❌ No analysis could be completed"
    elif search_count == 0:
        return "🟡 No specific AI indicators found in search"
    elif search_count > 0:
        return f"🔴 {search_count} potential AI generation indicators detected!"
    else:
        return "🟢 No clear AI generation indicators detected"
```

## API Requirements

### Marengo Engine
- **Purpose**: Visual and audio content search
- **Capabilities**: Timestamp-based results, confidence scoring
- **Input**: Text queries, video filters
- **Output**: Ranked search results with metadata

### Pegasus Engine
- **Purpose**: Deep content analysis and generation
- **Capabilities**: Natural language analysis, detailed assessments
- **Input**: Video ID, analysis prompts
- **Output**: Textual analysis with confidence ratings

## Performance Metrics

### Marengo Search
- **Queries**: 35 search terms
- **Execution Time**: ~1-3 minutes
- **Success Rate**: High (search API is stable)
- **Results**: Timestamped clips with confidence scores

### Pegasus Analysis
- **Prompts**: 3 analysis prompts
- **Execution Time**: ~2-5 minutes
- **Success Rate**: Variable (SDK compatibility issues)
- **Results**: Detailed textual analysis

### Total Analysis Time
- **Complete Analysis**: 3-8 minutes per video
- **Combined Results**: Merged assessment with actionable insights

## Error Handling

### Marengo Errors
- Invalid index ID
- Invalid video ID
- API rate limits
- Network connectivity issues

### Pegasus Errors
- SDK response parsing issues
- Engine compatibility problems
- Token limit exceeded
- Video processing failures

## Example Output

### Successful Detection
```
📊 Marengo Search Results: 8 potential AI indicators found
🤖 Pegasus Analysis Results: 3 analyses completed

🎯 OVERALL ASSESSMENT:
🔴 8 potential AI generation indicators detected!
   This suggests the video may contain AI-generated content.

📋 DETAILED SEARCH RESULTS (8 items):
--- Search Result 1 ---
Score: 0.92
Confidence: high
Time: 12.50s - 18.20s
Transcription: "The perfect symmetry and artificial lighting suggest..."

🤖 DETAILED PEGASUS ANALYSIS (3 analyses):
--- Pegasus Analysis 1 ---
Analysis: "This video shows clear signs of AI generation with perfect 
symmetry, unnatural movements, and computer-generated textures..."
```

### No Detection
```
📊 Marengo Search Results: 0 potential AI indicators found
🤖 Pegasus Analysis Results: 3 analyses completed

🎯 OVERALL ASSESSMENT:
🟡 No specific AI indicators found in search, but Pegasus analysis available.
```

## Technical Implementation

### SDK Version
- **TwelveLabs SDK**: v0.4.0
- **Python Version**: 3.7+
- **Dependencies**: twelvelabs, python-dotenv

### Authentication
```python
# Environment variable
TWELVELABS_API_KEY="your_api_key_here"

# Or .env file
TWELVELABS_API_KEY=your_key_here
```

### Client Initialization
```python
from twelvelabs import TwelveLabs

client = TwelveLabs(api_key=api_key)
search_client = client.search
analyze_client = client.generate.text
```

## Conclusion

This dual-engine approach combines:
1. **Marengo's strength**: Precise visual/audio search with timestamps
2. **Pegasus's strength**: Deep contextual analysis and reasoning
3. **Comprehensive coverage**: 35 search terms + 3 analysis prompts
4. **Actionable results**: Combined assessment with specific evidence

The system provides a robust framework for detecting AI-generated content through both pattern recognition and contextual analysis.

