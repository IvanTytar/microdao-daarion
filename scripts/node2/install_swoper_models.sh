#!/bin/bash
# Install Swoper with all required models for Node-2
# Models: DeepSeek-R1, Qwen Code 72B, Gemma 30B, DeepSeek Math 33B, Qwen-VL, Mistral 13B/22B, Falcon-40B-Q4, StarCoder2-34B, GPT-OSS-20B

set -e

echo "🚀 Installing Swoper with models for microDAO Node-2"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Swoper service exists
SWAPPER_DIR=""
if [ -d "services/swapper" ]; then
    SWAPPER_DIR="services/swapper"
elif [ -d "/opt/microdao-daarion/services/swapper" ]; then
    SWAPPER_DIR="/opt/microdao-daarion/services/swapper"
else
    echo -e "${RED}❌ Swoper service not found. Please check the path.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found Swoper at: ${SWAPPER_DIR}${NC}"

# Models configuration for Node-2
# Format: model_name:ollama_model_name:size_gb
declare -A MODELS=(
    ["deepseek-r1"]="deepseek-r1:67"
    ["qwen-code-72b"]="qwen2.5-coder-72b-instruct:40"
    ["gemma-30b"]="gemma2:27b-it:18"
    ["deepseek-math-33b"]="deepseek-math:33b:20"
    ["qwen-vl"]="qwen2-vl:7b-instruct:8"
    ["mistral-13b"]="mistral:13b-instruct:7.5"
    ["mistral-22b"]="mistral-nemo:22b:13"
    ["falcon-40b"]="falcon:40b-instruct:24"
    ["starcoder2-34b"]="starcoder2:34b:20"
    ["gpt-oss-20b"]="gpt-oss:20b:12"
)

# Create models directory
MODELS_DIR="$HOME/node2/swoper/models"
mkdir -p "$MODELS_DIR"

echo -e "\n${GREEN}📦 Installing models via Ollama...${NC}"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama is not running. Starting Ollama...${NC}"
    brew services start ollama || {
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        exit 1
    }
    sleep 5
fi

# Install models
INSTALLED=0
FAILED=0

for model_key in "${!MODELS[@]}"; do
    model_info="${MODELS[$model_key]}"
    model_name=$(echo "$model_info" | cut -d: -f1)
    size_gb=$(echo "$model_info" | cut -d: -f2)
    
    echo -e "\n${GREEN}📥 Installing: ${model_name} (${size_gb} GB)${NC}"
    
    if ollama pull "$model_name" 2>&1 | tee /tmp/ollama_install.log; then
        echo -e "${GREEN}   ✅ ${model_name} installed${NC}"
        INSTALLED=$((INSTALLED + 1))
    else
        echo -e "${RED}   ❌ Failed to install ${model_name}${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo -e "\n${GREEN}=================================================="
echo "📊 Installation Summary"
echo "==================================================${NC}"
echo -e "   ✅ Installed: ${INSTALLED} models"
echo -e "   ❌ Failed: ${FAILED} models"
echo ""

# Create Swoper configuration for Node-2
echo -e "${GREEN}📝 Creating Swoper configuration for Node-2...${NC}"

cat > "$HOME/node2/swoper/config_node2.yaml" << EOF
# Swoper Configuration for microDAO Node-2
# Single-active LLM scheduler

swoper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 30
  gpu_enabled: true
  metal_acceleration: true  # Apple Silicon Metal

models:
  deepseek-r1:
    path: ollama:deepseek-r1
    type: llm
    size_gb: 67
    priority: high
    
  qwen-code-72b:
    path: ollama:qwen2.5-coder-72b-instruct
    type: code
    size_gb: 40
    priority: high
    
  gemma-30b:
    path: ollama:gemma2:27b-it
    type: llm
    size_gb: 18
    priority: medium
    
  deepseek-math-33b:
    path: ollama:deepseek-math:33b
    type: math
    size_gb: 20
    priority: high
    
  qwen-vl:
    path: ollama:qwen2-vl:7b-instruct
    type: vision
    size_gb: 8
    priority: high
    
  mistral-13b:
    path: ollama:mistral:13b-instruct
    type: llm
    size_gb: 7.5
    priority: medium
    
  mistral-22b:
    path: ollama:mistral-nemo:22b
    type: llm
    size_gb: 13
    priority: medium
    
  falcon-40b:
    path: ollama:falcon:40b-instruct
    type: llm
    size_gb: 24
    priority: low
    
  starcoder2-34b:
    path: ollama:starcoder2:34b
    type: code
    size_gb: 20
    priority: medium
    
  gpt-oss-20b:
    path: ollama:gpt-oss:20b
    type: llm
    size_gb: 12
    priority: low

storage:
  models_dir: $HOME/node2/swoper/models
  cache_dir: $HOME/node2/swoper/cache
  swap_dir: $HOME/node2/swoper/swap

ollama:
  url: http://localhost:11434
  timeout: 300
EOF

echo -e "${GREEN}✅ Configuration saved to: $HOME/node2/swoper/config_node2.yaml${NC}"

# Update specialists.yaml if it exists
if [ -f "config/specialists.yaml" ]; then
    echo -e "\n${GREEN}📝 Updating specialists.yaml...${NC}"
    # Backup original
    cp config/specialists.yaml config/specialists.yaml.backup
    
    # Add Node-2 models (this is a simplified version - may need manual editing)
    echo -e "${YELLOW}⚠️  Please manually update config/specialists.yaml with Node-2 models${NC}"
fi

echo -e "\n${GREEN}=================================================="
echo "✅ Swoper Installation Complete"
echo "==================================================${NC}"
echo ""
echo "📁 Configuration: $HOME/node2/swoper/config_node2.yaml"
echo "📦 Models directory: $HOME/node2/swoper/models"
echo ""
echo "⏭️  Next steps:"
echo "   1. Review config_node2.yaml"
echo "   2. Test Swoper with: curl http://localhost:8890/health"
echo "   3. Update router-config.yml with Node-2 Swoper provider"
echo ""



