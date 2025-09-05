# Enhanced AI Generation Detection Parameters

## Overview
This document provides a comprehensive and scientifically-based list of search parameters for detecting AI-generated video content using Marengo search and Pegasus analysis.

## Marengo Search Parameters (Enhanced)

### 1. Facial and Human Features (15 parameters)
```python
facial_indicators = [
    # Facial symmetry and structure
    "unnatural facial symmetry",
    "perfectly symmetrical face",
    "artificial facial proportions",
    "synthetic facial structure",
    "unnatural jawline",
    "artificial cheekbones",
    
    # Eye and gaze characteristics
    "unnatural eye movements",
    "synthetic eye reflections",
    "artificial pupil dilation",
    "mechanical blinking patterns",
    "unnatural gaze direction",
    "synthetic eye tracking",
    
    # Skin and texture
    "artificial skin texture",
    "synthetic skin tone",
    "unnatural skin smoothness"
]
```

### 2. Movement and Animation (20 parameters)
```python
movement_indicators = [
    # Unnatural motion patterns
    "mechanical head movements",
    "robotic body language",
    "unnatural walking patterns",
    "synthetic gesture timing",
    "artificial hand movements",
    "mechanical facial expressions",
    
    # Motion fluidity issues
    "jerky movements",
    "unnatural motion blur",
    "artificial motion smoothing",
    "synthetic frame transitions",
    "mechanical object tracking",
    "unnatural camera movements",
    
    # Timing and rhythm
    "perfectly timed actions",
    "unnatural action sequences",
    "synthetic timing patterns",
    "artificial rhythm consistency",
    "mechanical pacing",
    "unnatural tempo changes",
    
    # Physics violations
    "impossible movements",
    "unnatural physics"
]
```

### 3. Visual Artifacts and Rendering (25 parameters)
```python
visual_artifacts = [
    # Lighting and shadows
    "inconsistent lighting",
    "artificial shadow patterns",
    "unnatural light sources",
    "synthetic illumination",
    "artificial ambient lighting",
    "unnatural shadow casting",
    "inconsistent shadow directions",
    "artificial light reflections",
    
    # Texture and material issues
    "artificial texture patterns",
    "synthetic material properties",
    "unnatural surface details",
    "artificial fabric textures",
    "synthetic skin rendering",
    "unnatural hair texture",
    "artificial metal reflections",
    
    # Rendering artifacts
    "compression artifacts",
    "generation artifacts",
    "neural network artifacts",
    "AI rendering artifacts",
    "synthetic pixelation",
    "artificial noise patterns",
    "unnatural color gradients",
    "synthetic color bleeding",
    
    # Edge and boundary issues
    "artificial edge detection",
    "unnatural object boundaries"
]
```

### 4. Audio and Speech Patterns (15 parameters)
```python
audio_indicators = [
    # Speech characteristics
    "robotic speech patterns",
    "artificial voice modulation",
    "synthetic intonation",
    "unnatural speech rhythm",
    "artificial pronunciation",
    "synthetic accent patterns",
    
    # Audio quality issues
    "artificial background noise",
    "synthetic audio compression",
    "unnatural audio artifacts",
    "artificial echo patterns",
    "synthetic reverb",
    "unnatural audio quality",
    
    # Synchronization issues
    "lip sync mismatches",
    "audio visual desynchronization",
    "artificial timing delays"
]
```

### 5. Environmental and Contextual (20 parameters)
```python
environmental_indicators = [
    # Scene consistency
    "inconsistent environmental details",
    "artificial background elements",
    "synthetic scene composition",
    "unnatural object placement",
    "artificial depth of field",
    "synthetic perspective",
    
    # Object and interaction
    "unnatural object interactions",
    "artificial physics simulation",
    "synthetic material behavior",
    "unnatural object properties",
    "artificial collision detection",
    "synthetic gravity effects",
    
    # Temporal consistency
    "inconsistent temporal details",
    "artificial time progression",
    "synthetic event sequencing",
    "unnatural cause and effect",
    "artificial narrative flow",
    "synthetic story progression",
    
    # Contextual anomalies
    "impossible scenarios",
    "unnatural world logic"
]
```

### 6. Technical and Generation Artifacts (15 parameters)
```python
technical_artifacts = [
    # Generation-specific artifacts
    "GAN artifacts",
    "diffusion model artifacts",
    "neural network artifacts",
    "deep learning artifacts",
    "machine learning artifacts",
    "AI generation artifacts",
    
    # Compression and processing
    "artificial compression patterns",
    "synthetic encoding artifacts",
    "unnatural bitrate patterns",
    "artificial noise reduction",
    "synthetic image processing",
    "unnatural filtering",
    
    # Model-specific indicators
    "stable diffusion artifacts",
    "midjourney artifacts",
    "DALL-E artifacts"
]
```

## Pegasus Analysis Prompts (Enhanced)

### Prompt 1: Comprehensive Visual Analysis
```
"Perform a detailed visual analysis of this video to detect AI generation indicators. 
Focus on:

FACIAL FEATURES:
- Analyze facial symmetry for unnatural perfection
- Examine eye movements for mechanical patterns
- Check skin texture for artificial smoothness
- Look for inconsistent facial proportions

MOVEMENT PATTERNS:
- Identify robotic or mechanical movements
- Check for unnatural motion fluidity
- Examine gesture timing for artificial precision
- Look for impossible or physics-defying actions

VISUAL ARTIFACTS:
- Detect inconsistent lighting and shadows
- Identify artificial texture patterns
- Look for rendering artifacts and compression issues
- Check for unnatural color gradients and reflections

ENVIRONMENTAL CONSISTENCY:
- Analyze object placement and interactions
- Check for impossible scenarios or physics violations
- Examine depth of field and perspective accuracy
- Look for temporal inconsistencies

Provide specific timestamps and confidence levels for each detected indicator."
```

### Prompt 2: Technical Artifact Detection
```
"Conduct a technical analysis of this video to identify AI generation artifacts. 
Examine:

GENERATION ARTIFACTS:
- Look for GAN, diffusion model, or neural network artifacts
- Identify compression and encoding anomalies
- Check for artificial noise patterns and filtering
- Detect synthetic pixelation and color bleeding

AUDIO ANALYSIS:
- Analyze speech patterns for robotic characteristics
- Check for artificial voice modulation and intonation
- Examine audio-visual synchronization issues
- Look for synthetic background noise patterns

RENDERING QUALITY:
- Assess overall rendering consistency
- Check for artificial sharpness or blur
- Identify unnatural material properties
- Look for synthetic lighting and shadow patterns

TECHNICAL INDICATORS:
- Detect model-specific artifacts (Stable Diffusion, DALL-E, etc.)
- Identify deep learning generation signatures
- Check for artificial processing patterns
- Look for neural network training artifacts

Rate the likelihood of AI generation from 1-10 with detailed evidence."
```

### Prompt 3: Contextual and Behavioral Analysis
```
"Analyze this video for contextual and behavioral indicators of AI generation. 
Evaluate:

BEHAVIORAL PATTERNS:
- Examine human behavior for unnatural consistency
- Check for mechanical or robotic mannerisms
- Analyze emotional expressions for artificial patterns
- Look for unrealistic social interactions

NARRATIVE CONSISTENCY:
- Check story flow for artificial progression
- Examine cause-and-effect relationships
- Look for impossible or illogical scenarios
- Analyze temporal consistency and pacing

ENVIRONMENTAL LOGIC:
- Verify physical laws and natural phenomena
- Check for impossible object interactions
- Examine weather and environmental consistency
- Look for artificial world-building elements

CONTEXTUAL ANOMALIES:
- Identify elements that don't fit the scene
- Check for anachronistic or impossible details
- Examine cultural and social context accuracy
- Look for artificial narrative elements

Provide specific examples with timestamps and rate overall AI generation likelihood."
```

## Implementation Strategy

### Phase 1: Core Detection (Immediate)
- Implement facial and movement indicators (35 parameters)
- Deploy basic visual artifact detection (25 parameters)
- Add essential audio analysis (15 parameters)

### Phase 2: Advanced Detection (Short-term)
- Add environmental and contextual analysis (20 parameters)
- Implement technical artifact detection (15 parameters)
- Deploy comprehensive Pegasus prompts

### Phase 3: Refinement (Ongoing)
- Continuous testing and validation
- Parameter optimization based on results
- Addition of new detection methods as AI generation evolves

## Testing and Validation

### Test Cases
1. **Known AI Videos**: Test with confirmed AI-generated content
2. **Authentic Videos**: Verify no false positives
3. **Mixed Content**: Videos with both real and AI elements
4. **Edge Cases**: High-quality AI that's harder to detect

### Success Metrics
- **Detection Rate**: Percentage of AI videos correctly identified
- **False Positive Rate**: Percentage of real videos incorrectly flagged
- **Precision**: Accuracy of positive detections
- **Recall**: Completeness of AI video detection

## Conclusion

This enhanced parameter set provides:
- **110+ specific search terms** for Marengo
- **3 comprehensive analysis prompts** for Pegasus
- **Scientific basis** for detection methods
- **Scalable implementation** strategy
- **Continuous improvement** framework

The parameters are designed to catch both obvious and subtle AI generation indicators while minimizing false positives.
