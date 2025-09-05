#!/usr/bin/env python3
"""
Example usage of the AIGenerationDetector class
This script shows how to use the detector programmatically
"""

import os
from test import AIGenerationDetector

def example_basic_ai_detection():
    """Example of basic AI generation detection"""
    
    # Get API key from environment
    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        print("Error: TWELVELABS_API_KEY environment variable not set")
        return
    
    # Initialize detector
    detector = AIGenerationDetector(api_key)
    
    # Example parameters
    index_id = "your_index_id_here"  # Replace with your actual index ID
    video_id = "your_video_id_here"  # Replace with your actual video ID
    
    print(f"Running AI generation detection on video {video_id} in index {index_id}")
    
    # Run the detection
    detector.detect_ai_generation(index_id, video_id)

def example_batch_ai_detection():
    """Example of running AI generation detection on multiple videos"""
    
    # Get API key from environment
    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        print("Error: TWELVELABS_API_KEY environment variable not set")
        return
    
    # Initialize detector
    detector = AIGenerationDetector(api_key)
    
    # Example parameters
    index_id = "your_index_id_here"  # Replace with your actual index ID
    video_ids = [
        "video_id_1_here",
        "video_id_2_here", 
        "video_id_3_here"
    ]
    
    print(f"Running batch AI generation detection on {len(video_ids)} videos")
    
    # Run detection on each video
    for i, video_id in enumerate(video_ids, 1):
        print(f"\n{'='*60}")
        print(f"VIDEO {i}/{len(video_ids)}: {video_id}")
        print(f"{'='*60}")
        
        try:
            detector.detect_ai_generation(index_id, video_id)
        except Exception as e:
            print(f"❌ Failed to analyze video {video_id}: {e}")
        
        print(f"\n✅ Completed video {i}/{len(video_ids)}")

def example_custom_analysis():
    """Example showing how to access individual analysis components"""
    
    # Get API key from environment
    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        print("Error: TWELVELABS_API_KEY environment variable not set")
        return
    
    # Initialize detector
    detector = AIGenerationDetector(api_key)
    
    # Example parameters
    index_id = "your_index_id_here"  # Replace with your actual index ID
    video_id = "your_video_id_here"  # Replace with your actual video ID
    
    print(f"Running custom analysis on video {video_id}")
    
    # Run individual components
    print("\n🔍 Running Marengo search analysis...")
    search_results = detector._search_for_ai_indicators(index_id, video_id)
    print(f"Found {len(search_results)} search results")
    
    print("\n🤖 Running Pegasus analysis...")
    analysis_results = detector._analyze_with_pegasus(video_id)
    print(f"Completed {len(analysis_results)} analyses")
    
    # Custom assessment
    print("\n🎯 Custom assessment...")
    detector._provide_combined_assessment(search_results, analysis_results)

if __name__ == "__main__":
    print("🤖 AI Generation Detection Examples ===\n")
    
    # Uncomment the examples you want to run
    # Make sure to set your actual index ID and video ID first
    
    # Example 1: Basic AI generation detection
    # example_basic_ai_detection()
    
    # Example 2: Batch detection on multiple videos
    # example_batch_ai_detection()
    
    # Example 3: Custom analysis with individual components
    # example_custom_analysis()
    
    print("\nTo run examples:")
    print("1. Set your API key: export TWELVELABS_API_KEY='your_key_here'")
    print("2. Update the index_id and video_id variables in the examples")
    print("3. Uncomment the example function calls above")
    print("4. Run: python example_usage.py")
    
    print("\nKey features:")
    print("- Automatically searches for 15+ AI generation indicators")
    print("- Runs 3 Pegasus analyses with specialized prompts")
    print("- Combines results for comprehensive assessment")
    print("- Shows timestamps and confidence levels")
    print("- Focuses specifically on AI generation detection")
