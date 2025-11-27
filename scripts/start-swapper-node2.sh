#!/bin/bash
# Start Swapper Service on Node #2 (MacBook)
# This script handles both Docker and local startup

set -e

echo "🚀 Starting Swapper Service on Node #2..."

# Check if Docker is available
if docker ps > /dev/null 2>&1; then
    echo "✅ Docker is available, using Docker..."
    cd "$(dirname "$0")/.."
    docker-compose up -d swapper-service
    echo "✅ Swapper Service started via Docker"
    echo "   Health: http://localhost:8890/health"
    echo "   Status: http://localhost:8890/api/cabinet/swapper/status"
    echo ""
    echo "📊 Check status:"
    echo "   docker-compose ps swapper-service"
    echo "   docker-compose logs -f swapper-service"
else
    echo "⚠️  Docker not available, starting locally..."
    cd "$(dirname "$0")/../services/swapper-service"
    
    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv
    source venv/bin/activate
    
    # Install dependencies
    echo "📥 Installing dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    # Set environment variables
    export OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://localhost:11434}
    export SWAPPER_CONFIG_PATH=${SWAPPER_CONFIG_PATH:-./config/swapper_config.yaml}
    export SWAPPER_MODE=${SWAPPER_MODE:-single-active}
    
    # Start service
    echo "✅ Starting Swapper Service on port 8890..."
    echo "   Health: http://localhost:8890/health"
    echo "   Status: http://localhost:8890/api/cabinet/swapper/status"
    echo ""
    echo "Press Ctrl+C to stop"
    
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8890
fi

