#!/bin/bash
# Quick Setup Script for Swapper Service on Node #1
# This script helps configure Swapper Service with available Ollama models

set -e

echo "🔧 Swapper Service Configuration for Node #1"
echo "=============================================="
echo ""

# Check if running on Node #1
if [ ! -f "/opt/microdao-daarion/docker-compose.yml" ]; then
    echo "⚠️  Warning: This script is designed for Node #1"
    echo "   Make sure you're running it on the correct server"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Find Swapper Service container
SWAPPER_CONTAINER=$(docker ps --filter "name=swapper" --format "{{.Names}}" | head -1)

if [ -z "$SWAPPER_CONTAINER" ]; then
    echo "❌ Swapper Service container not found"
    echo "   Make sure Swapper Service is running:"
    echo "   docker-compose up -d swapper-service"
    exit 1
fi

echo "✅ Found Swapper Service: $SWAPPER_CONTAINER"
echo ""

# Check Ollama models
echo "📋 Checking available Ollama models..."
OLLAMA_MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null || echo "{}")

if [ "$OLLAMA_MODELS" = "{}" ]; then
    echo "⚠️  Warning: Cannot connect to Ollama at http://localhost:11434"
    echo "   Make sure Ollama is running"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Ollama is accessible"
    MODEL_COUNT=$(echo "$OLLAMA_MODELS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('models', [])))" 2>/dev/null || echo "0")
    echo "   Found $MODEL_COUNT models"
fi

echo ""

# Find config path
CONFIG_PATH="/opt/microdao-daarion/services/swapper-service/config/swapper_config.yaml"
CONFIG_DIR=$(dirname "$CONFIG_PATH")

# Check if config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "📁 Creating config directory: $CONFIG_DIR"
    mkdir -p "$CONFIG_DIR"
fi

# Check if config file exists
if [ -f "$CONFIG_PATH" ]; then
    echo "⚠️  Config file already exists: $CONFIG_PATH"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
    echo "📝 Backing up existing config..."
    cp "$CONFIG_PATH" "${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create config file
echo "📝 Creating Swapper Service configuration..."
cat > "$CONFIG_PATH" << 'EOF'
# Swapper Configuration for Node #1 (Production Server)
# Single-active LLM scheduler
# Hetzner GEX44 - NVIDIA RTX 4000 SFF Ada (20GB VRAM)

swapper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 300
  gpu_enabled: true
  metal_acceleration: false  # NVIDIA GPU, not Apple Silicon

models:
  # Primary LLM - Qwen3 8B (High Priority) - Main model from INFRASTRUCTURE.md
  qwen3-8b:
    path: ollama:qwen3:8b
    type: llm
    size_gb: 4.87
    priority: high
    description: "Primary LLM for general tasks and conversations"
    
  # Vision Model - Qwen3-VL 8B (High Priority) - For image processing
  qwen3-vl-8b:
    path: ollama:qwen3-vl:8b
    type: vision
    size_gb: 5.72
    priority: high
    description: "Vision model for image understanding and processing"
    
  # Qwen2.5 7B Instruct (High Priority)
  qwen2.5-7b-instruct:
    path: ollama:qwen2.5:7b-instruct-q4_K_M
    type: llm
    size_gb: 4.36
    priority: high
    description: "Qwen2.5 7B Instruct model"
    
  # Lightweight LLM - Qwen2.5 3B Instruct (Medium Priority)
  qwen2.5-3b-instruct:
    path: ollama:qwen2.5:3b-instruct-q4_K_M
    type: llm
    size_gb: 1.80
    priority: medium
    description: "Lightweight LLM for faster responses"
    
  # Math Specialist - Qwen2 Math 7B (High Priority)
  qwen2-math-7b:
    path: ollama:qwen2-math:7b
    type: math
    size_gb: 4.13
    priority: high
    description: "Specialized model for mathematical tasks"

storage:
  models_dir: /app/models
  cache_dir: /app/cache
  swap_dir: /app/swap

ollama:
  url: http://ollama:11434  # From Docker container to Ollama service
  timeout: 300
EOF

echo "✅ Configuration file created: $CONFIG_PATH"
echo ""

# Check if config is mounted in container
echo "🔍 Checking if config is mounted in container..."
MOUNTED=$(docker inspect "$SWAPPER_CONTAINER" | grep -q "$CONFIG_PATH" && echo "yes" || echo "no")

if [ "$MOUNTED" = "no" ]; then
    echo "⚠️  Config file is not mounted in container"
    echo "   Copying config to container..."
    docker cp "$CONFIG_PATH" "$SWAPPER_CONTAINER:/app/config/swapper_config.yaml"
    echo "✅ Config copied to container"
else
    echo "✅ Config is mounted in container"
fi

echo ""

# Restart Swapper Service
echo "🔄 Restarting Swapper Service..."
docker restart "$SWAPPER_CONTAINER"

echo "⏳ Waiting for service to start..."
sleep 5

# Check logs
echo ""
echo "📋 Recent logs:"
docker logs "$SWAPPER_CONTAINER" --tail 20

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Verify configuration:"
echo "   curl http://localhost:8890/models"
echo "   curl http://localhost:8890/status"
echo ""
echo "🌐 Check in monitor:"
echo "   http://localhost:8899/node/node-1"

