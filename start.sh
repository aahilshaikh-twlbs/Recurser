#!/bin/bash

echo "🚀 Starting Circuit Validator..."

# Check if Python and Node.js are installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    exit 1
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Initialize database
echo "🗄️  Initializing database..."
python init_db.py

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please copy env.example to .env and configure your API keys."
    echo "   cp env.example .env"
    echo "   Then edit .env with your API keys."
    exit 1
fi

# Start backend in background
echo "🚀 Starting backend server on http://localhost:8000"
python run.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend

# Install dependencies
echo "📥 Installing Node.js dependencies..."
bun install

# Start frontend
echo "🚀 Starting frontend on http://localhost:3000"
bun run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Circuit Validator is starting up!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Database: SQLite (local)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
