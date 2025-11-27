#!/bin/bash
# Start Swapper Service locally

set -e

echo "🚀 Starting Swapper Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Set environment variables
export OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://localhost:11434}
export SWAPPER_CONFIG_PATH=${SWAPPER_CONFIG_PATH:-./config/swapper_config.yaml}
export SWAPPER_MODE=${SWAPPER_MODE:-single-active}
export MAX_CONCURRENT_MODELS=${MAX_CONCURRENT_MODELS:-1}
export MODEL_SWAP_TIMEOUT=${MODEL_SWAP_TIMEOUT:-30}

# Start service
echo "✅ Starting Swapper Service on port 8890..."
echo "   Health: http://localhost:8890/health"
echo "   Status: http://localhost:8890/status"
echo "   Cabinet API: http://localhost:8890/api/cabinet/swapper/status"
echo ""
echo "Press Ctrl+C to stop"

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8890

