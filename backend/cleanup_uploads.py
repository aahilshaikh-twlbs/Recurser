#!/usr/bin/env python3
"""
Cleanup script to remove old video files from uploads folder.
This script should be run periodically to clean up temporary files.
"""

import os
import time
import glob
from datetime import datetime, timedelta

def cleanup_old_uploads(days_old=7):
    """Remove video files older than specified days from uploads folder"""
    uploads_dir = "uploads"
    
    if not os.path.exists(uploads_dir):
        print("Uploads directory doesn't exist")
        return
    
    # Get all video files
    video_files = glob.glob(os.path.join(uploads_dir, "*.mp4"))
    
    if not video_files:
        print("No video files found in uploads directory")
        return
    
    cutoff_time = time.time() - (days_old * 24 * 60 * 60)
    removed_count = 0
    total_size = 0
    
    for file_path in video_files:
        try:
            file_stat = os.stat(file_path)
            file_age = time.time() - file_stat.st_mtime
            
            if file_age > (days_old * 24 * 60 * 60):
                file_size = file_stat.st_size
                total_size += file_size
                
                os.remove(file_path)
                removed_count += 1
                print(f"Removed: {os.path.basename(file_path)} ({file_size / 1024 / 1024:.1f} MB)")
                
        except Exception as e:
            print(f"Error removing {file_path}: {e}")
    
    print(f"\nCleanup complete:")
    print(f"- Removed {removed_count} files")
    print(f"- Freed up {total_size / 1024 / 1024:.1f} MB")
    print(f"- Files older than {days_old} days were removed")

if __name__ == "__main__":
    cleanup_old_uploads(days_old=3)  # Remove files older than 3 days
