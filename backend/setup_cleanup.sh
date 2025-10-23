#!/bin/bash
# Setup automatic cleanup of uploads folder

# Create a cron job to run cleanup every day at 2 AM
echo "0 2 * * * cd /root/Code/Recurser/backend && python3 cleanup_uploads.py" | crontab -

echo "✅ Automatic cleanup scheduled to run daily at 2 AM"
echo "This will remove video files older than 3 days from the uploads folder"
