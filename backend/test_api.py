#!/usr/bin/env python3
"""
Test script for Recurser Validator API
Tests all major endpoints and functionality
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
BASE_URL = "http://localhost:8000"
API_KEY = os.getenv("TWELVELABS_API_KEY", "test_key")
INDEX_ID = os.getenv("TWELVELABS_INDEX_ID", "test_index")

def test_health_check():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_root_endpoint():
    """Test root endpoint"""
    print("🔍 Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint passed: {data['message']}")
            return True
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
        return False

def test_video_generation():
    """Test video generation endpoint"""
    print("🔍 Testing video generation...")
    try:
        payload = {
            "prompt": "A cat drinking tea in a garden",
            "confidence_threshold": 50.0,
            "max_retries": 3,
            "index_id": INDEX_ID,
            "twelvelabs_api_key": API_KEY
        }
        
        response = requests.post(f"{BASE_URL}/api/videos/generate", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Video generation started: {data['data']['video_id']}")
            return data['data']['video_id']
        else:
            print(f"❌ Video generation failed: {response.status_code}")
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Video generation error: {e}")
        return None

def test_video_status(video_id):
    """Test video status endpoint"""
    print(f"🔍 Testing video status for ID {video_id}...")
    try:
        response = requests.get(f"{BASE_URL}/api/videos/{video_id}/status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Video status retrieved: {data['data']['status']}")
            return data['data']
        else:
            print(f"❌ Video status failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Video status error: {e}")
        return None

def test_list_videos():
    """Test list videos endpoint"""
    print("🔍 Testing list videos...")
    try:
        response = requests.get(f"{BASE_URL}/api/videos")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ List videos passed: {len(data['data'])} videos found")
            return True
        else:
            print(f"❌ List videos failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ List videos error: {e}")
        return False

def test_grade_video(video_id):
    """Test video grading endpoint"""
    print(f"🔍 Testing video grading for ID {video_id}...")
    try:
        payload = {
            "index_id": INDEX_ID,
            "twelvelabs_api_key": API_KEY
        }
        
        response = requests.post(f"{BASE_URL}/api/videos/{video_id}/grade", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Video grading completed")
            return data['data']
        else:
            print(f"❌ Video grading failed: {response.status_code}")
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Video grading error: {e}")
        return None

def main():
    """Run all tests"""
    print("🚀 Starting Recurser Validator API Tests")
    print("=" * 50)
    
    # Test basic endpoints
    if not test_health_check():
        print("❌ Health check failed, stopping tests")
        return
    
    if not test_root_endpoint():
        print("❌ Root endpoint failed, stopping tests")
        return
    
    # Test video generation
    video_id = test_video_generation()
    if not video_id:
        print("❌ Video generation failed, stopping tests")
        return
    
    # Test video status
    video_data = test_video_status(video_id)
    if not video_data:
        print("❌ Video status failed, stopping tests")
        return
    
    # Test list videos
    if not test_list_videos():
        print("❌ List videos failed")
    
    # Test video grading (only if video is completed)
    if video_data.get('status') == 'completed':
        analysis_results = test_grade_video(video_id)
        if analysis_results:
            print(f"✅ Analysis completed - Quality Score: {analysis_results.get('quality_score', 'N/A')}")
        else:
            print("❌ Video grading failed")
    else:
        print("⏳ Video not completed yet, skipping grading test")
    
    print("\n🎉 All tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()
