#!/usr/bin/env python3
"""
AI Generation Detection Program
Uses TwelveLabs Marengo search and Pegasus analysis to detect AI-generated content in videos
"""

import os
import sys
import json
import httpx
from typing import Optional, List
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
from twelvelabs import TwelveLabs

# Fix for streaming JSON responses from Pegasus API
def parse_streaming_json(response_text):
    """Parse streaming JSON response and extract the final result"""
    lines = response_text.strip().split('\n')
    result_text = ''
    usage = None
    generation_id = None
    
    for line in lines:
        if line.strip():
            try:
                data = json.loads(line)
                if data.get('event_type') == 'stream_start':
                    generation_id = data.get('metadata', {}).get('generation_id')
                elif data.get('event_type') == 'text_generation':
                    result_text += data.get('text', '')
                elif data.get('event_type') == 'stream_end':
                    usage = data.get('metadata', {}).get('usage')
            except json.JSONDecodeError:
                continue
    
    return {
        'id': generation_id or 'unknown',
        'data': result_text,
        'usage': usage
    }

# Monkey patch httpx to handle streaming JSON
original_json = httpx.Response.json

def patched_json(self, **kwargs):
    try:
        # Try normal JSON parsing first
        return original_json(self, **kwargs)
    except json.JSONDecodeError as e:
        if 'Extra data' in str(e):
            # Handle streaming JSON
            return parse_streaming_json(self.text)
        else:
            raise e

# Apply the patch
httpx.Response.json = patched_json

class AIGenerationDetector:
    def __init__(self, api_key: str):
        """Initialize the AI generation detector with API key"""
        self.client = TwelveLabs(api_key=api_key)
        self.search_client = self.client.search
        self.analyze_client = self.client.generate.text
    
    def detect_ai_generation(self, index_id: str, video_id: str):
        """
        Comprehensive AI generation detection using both search and analysis
        
        Args:
            index_id: The index ID containing the video
            video_id: The specific video ID to analyze
        """
        print(f"🔍 Analyzing video {video_id} for AI generation indicators...")
        print("=" * 60)
        
        # Step 1: Marengo Search Analysis
        print("\n📊 STEP 1: Marengo Search Analysis")
        print("-" * 40)
        search_results = self._search_for_ai_indicators(index_id, video_id)
        
        # Step 2: Pegasus Analysis
        print("\n🤖 STEP 2: Pegasus AI Analysis")
        print("-" * 40)
        analysis_results = self._analyze_with_pegasus(video_id)
        
        # Step 3: Combined Assessment
        print("\n🎯 STEP 3: Combined AI Generation Assessment")
        print("-" * 40)
        self._provide_combined_assessment(search_results, analysis_results)
    
    def _search_for_ai_indicators(self, index_id: str, video_id: str):
        """Search for AI generation indicators using Marengo"""
        
        # Enhanced queries based on scientific AI generation detection research
        ai_detection_queries = [
            # Facial and Human Features (20 parameters)
            "unnatural facial symmetry", "artificial facial proportions", "synthetic facial structure",
            "unnatural eye movements", "artificial pupil dilation", "mechanical blinking patterns",
            "artificial skin texture", "synthetic skin tone", "unnatural skin smoothness",
            "robotic facial expressions", "artificial cheekbones", "synthetic eye reflections",
            "unnatural gaze direction", "mechanical head movements", "artificial hand movements",
            "robotic body language", "unnatural walking patterns", "synthetic gesture timing",
            "artificial facial features", "synthetic human appearance",
            
            # Movement and Animation (25 parameters)
            "jerky movements", "unnatural motion blur", "artificial motion smoothing",
            "synthetic frame transitions", "mechanical object tracking", "perfectly timed actions",
            "unnatural action sequences", "synthetic timing patterns", "artificial rhythm consistency",
            "mechanical pacing", "impossible movements", "unnatural physics",
            "artificial camera movements", "synthetic motion patterns", "mechanical animation",
            "unnatural fluidity", "robotic motion", "artificial locomotion",
            "synthetic body mechanics", "unnatural joint movements", "artificial balance",
            "mechanical coordination", "synthetic rhythm", "artificial timing",
            "unnatural motion curves",
            
            # Visual Artifacts and Rendering (30 parameters)
            "inconsistent lighting", "artificial shadow patterns", "unnatural light sources",
            "synthetic illumination", "artificial ambient lighting", "inconsistent shadow directions",
            "artificial light reflections", "artificial texture patterns", "synthetic material properties",
            "unnatural surface details", "artificial fabric textures", "synthetic skin rendering",
            "unnatural hair texture", "artificial metal reflections", "compression artifacts",
            "generation artifacts", "neural network artifacts", "AI rendering artifacts",
            "synthetic pixelation", "artificial noise patterns", "unnatural color gradients",
            "synthetic color bleeding", "artificial edge detection", "unnatural object boundaries",
            "artificial compression patterns", "synthetic image quality", "unnatural sharpness",
            "artificial blur patterns", "synthetic depth of field", "unnatural focus",
            
            # Audio and Speech Patterns (20 parameters)
            "robotic speech patterns", "artificial voice modulation", "synthetic intonation",
            "unnatural speech rhythm", "artificial pronunciation", "synthetic accent patterns",
            "artificial background noise", "synthetic audio compression", "unnatural audio artifacts",
            "artificial echo patterns", "synthetic reverb", "lip sync mismatches",
            "audio visual desynchronization", "artificial timing delays", "unnatural audio quality",
            "synthetic voice generation", "artificial speech synthesis", "mechanical speech patterns",
            "unnatural vocal characteristics", "artificial audio processing",
            
            # Environmental and Contextual (25 parameters)
            "inconsistent environmental details", "artificial background elements",
            "synthetic scene composition", "unnatural object placement", "artificial depth of field",
            "synthetic perspective", "unnatural object interactions", "artificial physics simulation",
            "synthetic material behavior", "unnatural object properties", "artificial collision detection",
            "synthetic gravity effects", "inconsistent temporal details", "artificial time progression",
            "synthetic event sequencing", "unnatural cause and effect", "artificial narrative flow",
            "synthetic story progression", "impossible scenarios", "unnatural world logic",
            "artificial environmental consistency", "synthetic world building", "unnatural spatial relationships",
            "artificial object physics", "synthetic environmental logic",
            
            # Technical and Generation Artifacts (20 parameters)
            "GAN artifacts", "diffusion model artifacts", "deep learning artifacts",
            "machine learning artifacts", "AI generation artifacts", "artificial compression patterns",
            "synthetic encoding artifacts", "unnatural bitrate patterns", "artificial noise reduction",
            "synthetic image processing", "unnatural filtering", "stable diffusion artifacts",
            "midjourney artifacts", "DALL-E artifacts", "neural network training artifacts",
            "artificial model signatures", "synthetic generation patterns", "unnatural processing artifacts",
            "artificial algorithmic patterns", "synthetic neural network output",
            
            # Impossible/Unnatural Scenarios (30 parameters)
            "cat drinking tea", "animals doing human activities", "impossible animal behavior",
            "unnatural animal interactions", "synthetic animal movements", "artificial pet behavior",
            "impossible physics scenarios", "unnatural gravity effects", "artificial floating objects",
            "synthetic impossible situations", "unnatural object behavior", "artificial impossible physics",
            "impossible human abilities", "unnatural superhuman powers", "artificial impossible actions",
            "synthetic impossible scenarios", "unnatural impossible events", "artificial impossible situations",
            "impossible environmental conditions", "unnatural impossible weather", "artificial impossible phenomena",
            "synthetic impossible occurrences", "unnatural impossible interactions", "artificial impossible relationships",
            "impossible temporal events", "unnatural impossible timing", "artificial impossible sequences",
            "synthetic impossible narratives", "unnatural impossible stories", "artificial impossible plots",
            
            # Creative/Artistic AI Indicators (25 parameters)
            "AI generated art", "synthetic creative content", "artificial artistic expression",
            "generated creative works", "synthetic artistic style", "artificial creative patterns",
            "AI generated music", "synthetic musical composition", "artificial musical patterns",
            "generated musical content", "synthetic audio creation", "artificial sound generation",
            "AI generated text", "synthetic written content", "artificial language patterns",
            "generated textual content", "synthetic writing style", "artificial linguistic patterns",
            "AI generated video", "synthetic video content", "artificial video creation",
            "generated video content", "synthetic video production", "artificial video generation",
            "AI generated media",
            
            # Behavioral and Social Indicators (20 parameters)
            "unnatural social interactions", "artificial human behavior", "synthetic social patterns",
            "unnatural emotional expressions", "artificial emotional responses", "synthetic emotional patterns",
            "unnatural communication styles", "artificial communication patterns", "synthetic communication behavior",
            "unnatural decision making", "artificial decision patterns", "synthetic decision behavior",
            "unnatural problem solving", "artificial problem solving patterns", "synthetic problem solving behavior",
            "unnatural learning behavior", "artificial learning patterns", "synthetic learning behavior",
            "unnatural adaptation", "artificial adaptation patterns",
            
            # Temporal and Consistency Issues (15 parameters)
            "temporal inconsistencies", "artificial time progression", "synthetic temporal patterns",
            "unnatural time sequences", "artificial chronological order", "synthetic time relationships",
            "unnatural cause and effect", "artificial causal relationships", "synthetic causal patterns",
            "unnatural event sequences", "artificial event ordering", "synthetic event relationships",
            "unnatural narrative flow", "artificial story progression", "synthetic narrative patterns",
            
            # Quality and Rendering Issues (20 parameters)
            "inconsistent video quality", "artificial quality patterns", "synthetic quality variations",
            "unnatural resolution changes", "artificial resolution patterns", "synthetic resolution variations",
            "inconsistent frame rates", "artificial frame rate patterns", "synthetic frame rate variations",
            "unnatural color consistency", "artificial color patterns", "synthetic color variations",
            "inconsistent lighting quality", "artificial lighting patterns", "synthetic lighting variations",
            "unnatural shadow consistency", "artificial shadow patterns", "synthetic shadow variations",
            "inconsistent texture quality", "artificial texture patterns"
        ]
        
        print("Searching for AI generation indicators using Marengo...")
        print("✅ Video filter enabled - searching only specified video")
        print("=" * 60)
        
        all_results = []
        
        for query in ai_detection_queries:
            try:
                results = self.search_client.query(
                    index_id=index_id,
                    options=["visual", "audio"],
                    query_text=query,
                    threshold="medium",
                    sort_option="score",
                    group_by="clip",
                    page_limit=5,
                    filter={"id": [video_id]}  # Fixed: use 'id' field with array
                )
                
                if results and hasattr(results, 'data') and results.data:
                    print(f"✅ Found matches for: '{query}'")
                    all_results.extend(results.data)
                else:
                    print(f"❌ No matches for: '{query}'")
                    
            except Exception as e:
                print(f"⚠️  Error searching for '{query}': {e}")
        
        return all_results
    
    def _analyze_with_pegasus(self, video_id: str):
        """Analyze video using Pegasus for AI generation detection"""
        
        print("Analyzing video content using Pegasus...")
        
        # Enhanced prompts based on scientific AI generation detection research
        analysis_prompts = [
            "Perform a detailed visual analysis of this video to detect AI generation indicators. Focus on: FACIAL FEATURES - Analyze facial symmetry for unnatural perfection, examine eye movements for mechanical patterns, check skin texture for artificial smoothness, look for inconsistent facial proportions. MOVEMENT PATTERNS - Identify robotic or mechanical movements, check for unnatural motion fluidity, examine gesture timing for artificial precision, look for impossible or physics-defying actions. VISUAL ARTIFACTS - Detect inconsistent lighting and shadows, identify artificial texture patterns, look for rendering artifacts and compression issues, check for unnatural color gradients and reflections. ENVIRONMENTAL CONSISTENCY - Analyze object placement and interactions, check for impossible scenarios or physics violations, examine depth of field and perspective accuracy, look for temporal inconsistencies. IMPOSSIBLE SCENARIOS - Look for animals doing human activities, impossible physics, unnatural object behavior, or scenarios that defy logic. Provide specific timestamps and confidence levels for each detected indicator.",
            
            "Conduct a technical analysis of this video to identify AI generation artifacts. Examine: GENERATION ARTIFACTS - Look for GAN, diffusion model, or neural network artifacts, identify compression and encoding anomalies, check for artificial noise patterns and filtering, detect synthetic pixelation and color bleeding. AUDIO ANALYSIS - Analyze speech patterns for robotic characteristics, check for artificial voice modulation and intonation, examine audio-visual synchronization issues, look for synthetic background noise patterns. RENDERING QUALITY - Assess overall rendering consistency, check for artificial sharpness or blur, identify unnatural material properties, look for synthetic lighting and shadow patterns. TECHNICAL INDICATORS - Detect model-specific artifacts (Stable Diffusion, DALL-E, etc.), identify deep learning generation signatures, check for artificial processing patterns, look for neural network training artifacts. CREATIVE INDICATORS - Look for AI-generated artistic content, synthetic creative expressions, artificial creative patterns, or generated media content. Rate the likelihood of AI generation from 1-10 with detailed evidence.",
            
            "Analyze this video for contextual and behavioral indicators of AI generation. Evaluate: BEHAVIORAL PATTERNS - Examine human behavior for unnatural consistency, check for mechanical or robotic mannerisms, analyze emotional expressions for artificial patterns, look for unrealistic social interactions. NARRATIVE CONSISTENCY - Check story flow for artificial progression, examine cause-and-effect relationships, look for impossible or illogical scenarios, analyze temporal consistency and pacing. ENVIRONMENTAL LOGIC - Verify physical laws and natural phenomena, check for impossible object interactions, examine weather and environmental consistency, look for artificial world-building elements. CONTEXTUAL ANOMALIES - Identify elements that don't fit the scene, check for anachronistic or impossible details, examine cultural and social context accuracy, look for artificial narrative elements. IMPOSSIBLE SCENARIOS - Look for animals doing human activities, impossible physics, unnatural object behavior, or scenarios that defy logic. CREATIVE INDICATORS - Check for AI-generated creative content, synthetic artistic expressions, artificial creative patterns, or generated media content. Provide specific examples with timestamps and rate overall AI generation likelihood."
        ]
        
        analysis_results = []
        
        for i, prompt in enumerate(analysis_prompts, 1):
            try:
                print(f"\n🔍 Analysis {i}/3: Running Pegasus analysis...")
                
                response = self.analyze_client(
                    video_id=video_id,
                    prompt=prompt,
                    temperature=0.1  # Low temperature for more deterministic analysis
                )
                
                if response and hasattr(response, 'data'):
                    analysis_results.append({
                        'prompt': prompt,
                        'response': response.data,
                        'usage': getattr(response, 'usage', None)
                    })
                    print(f"✅ Analysis {i} completed successfully")
                else:
                    print(f"⚠️  Analysis {i} returned no data")
                    
            except Exception as e:
                error_msg = str(e)
                if 'index_not_supported_for_generate' in error_msg:
                    print(f"❌ Analysis {i} failed: This index does not support Pegasus generation")
                elif '404' in error_msg:
                    print(f"❌ Analysis {i} failed: Video not found or endpoint not available")
                else:
                    print(f"❌ Error in analysis {i}: {e}")
        
        return analysis_results
    
    def _provide_combined_assessment(self, search_results, analysis_results):
        """Provide a combined assessment of AI generation likelihood"""
        
        print("Combining Marengo search and Pegasus analysis results...")
        
        # Count search results
        search_count = len(search_results) if search_results else 0
        print(f"\n📊 Marengo Search Results: {search_count} potential AI indicators found")
        
        # Count analysis results
        analysis_count = len(analysis_results) if analysis_results else 0
        print(f"🤖 Pegasus Analysis Results: {analysis_count} analyses completed")
        
        # Overall assessment
        print("\n🎯 OVERALL ASSESSMENT:")
        print("-" * 30)
        
        if search_count == 0 and analysis_count == 0:
            print("❌ No analysis could be completed. Check API access and video availability.")
        elif search_count == 0:
            print("🟡 No specific AI indicators found in search, but Pegasus analysis available.")
        elif search_count > 0:
            print(f"🔴 {search_count} potential AI generation indicators detected!")
            print("   This suggests the video may contain AI-generated content.")
        else:
            print("🟢 No clear AI generation indicators detected.")
        
        # Display detailed results if available
        if search_results:
            print(f"\n📋 DETAILED SEARCH RESULTS ({len(search_results)} items):")
            print("-" * 40)
            for i, result in enumerate(search_results, 1):
                self._display_search_result(result, i)
        
        if analysis_results:
            print(f"\n🤖 DETAILED PEGASUS ANALYSIS ({len(analysis_results)} analyses):")
            print("-" * 40)
            for i, result in enumerate(analysis_results, 1):
                self._display_analysis_result(result, i)
    
    def _display_search_result(self, result, index: int):
        """Display a single search result"""
        print(f"\n--- Search Result {index} ---")
        
        if hasattr(result, 'score'):
            print(f"Score: {result.score}")
        if hasattr(result, 'confidence'):
            print(f"Confidence: {result.confidence}")
        if hasattr(result, 'start') and hasattr(result, 'end'):
            if result.start is not None and result.end is not None:
                print(f"Time: {result.start:.2f}s - {result.end:.2f}s")
        if hasattr(result, 'transcription'):
            print(f"Transcription: {result.transcription[:150] if result.transcription else 'None'}...")
    
    def _display_analysis_result(self, result, index: int):
        """Display a single analysis result"""
        print(f"\n--- Pegasus Analysis {index} ---")
        
        if 'prompt' in result:
            print(f"Prompt: {result['prompt'][:100]}...")
        
        if 'response' in result:
            print(f"Analysis: {result['response']}")
        
        if 'usage' in result and result['usage']:
            usage = result['usage']
            if hasattr(usage, 'output_tokens'):
                print(f"Tokens used: {usage.output_tokens}")


def main():
    """Main function for AI generation detection"""
    
    # Get API key from environment variable
    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        print("Error: TWELVELABS_API_KEY environment variable not set")
        print("Please set your API key: export TWELVELABS_API_KEY='your_api_key_here'")
        print("Or create a .env file with: TWELVELABS_API_KEY=your_key_here")
        sys.exit(1)
    
    # Initialize detector
    detector = AIGenerationDetector(api_key)
    
    # Display program info
    print("🤖 AI Generation Detection Program")
    print("=" * 50)
    print("This program analyzes videos for AI generation indicators using:")
    print("• Marengo Search: Find specific AI-related content")
    print("• Pegasus Analysis: Deep content analysis")
    print("=" * 50)
    
    # Get required parameters
    index_id = input("\nEnter your index ID: ").strip()
    if not index_id:
        print("Error: Index ID is required")
        sys.exit(1)
    
    video_id = input("Enter the video ID to analyze: ").strip()
    if not video_id:
        print("Error: Video ID is required")
        sys.exit(1)
    
    print(f"\n🎯 Analyzing video {video_id} in index {index_id}")
    print("This may take a few minutes...")
    
    # Run the detection
    try:
        detector.detect_ai_generation(index_id, video_id)
        print("\n✅ Analysis complete!")
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()