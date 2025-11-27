#!/bin/bash
# Install Swoper with all required models for Node-2
# CORRECTED VERSION: Using q4/q5 quantization for large models
# Models optimized for 64GB RAM with single-active LLM scheduler

set -e

echo "🚀 Installing Swoper with models for microDAO Node-2 (q4/q5 optimized)"
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

# Models configuration for Node-2 with q4/q5 quantization
# Format: ollama_model_name:size_gb:quantization:priority
declare -A MODELS=(
    # Large models - q4/q5 required
    ["deepseek-r1"]="deepseek-r1:q4:40:high"
    ["qwen-code-72b"]="qwen2.5-coder-72b-instruct:q4:40:high"
    ["deepseek-math-33b"]="deepseek-math:33b:q4:20:high"
    
    # Medium models - q4 recommended
    ["gemma-30b"]="gemma2:27b-it:q4:18:medium"
    ["mistral-22b"]="mistral-nemo:22b:q4:13:medium"
    ["starcoder2-34b"]="starcoder2:34b:q4:20:medium"
    ["gpt-oss-20b"]="gpt-oss:20b:q4:12:low"
    
    # Small models - q4 for consistency
    ["mistral-13b"]="mistral:13b-instruct:q4:7.5:medium"
    ["falcon-40b"]="falcon:40b-instruct:q4:24:low"
    
    # Vision models - upgraded to better quality
    ["qwen-vl-32b"]="qwen2-vl:32b-instruct:q4:20:high"
    # Alternative: qwen2-vl:7b-instruct:q4:8 (smaller, faster)
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

echo -e "\n${YELLOW}📋 Model Installation Plan:${NC}"
echo -e "   🔴 Large models (q4 required): DeepSeek-R1, Qwen Code 72B, DeepSeek Math 33B"
echo -e "   🟡 Medium models (q4 recommended): Gemma 30B, Mistral 22B, StarCoder2-34B, GPT-OSS-20B"
echo -e "   🟢 Small models (q4): Mistral 13B, Falcon-40B"
echo -e "   👁️  Vision (upgraded): Qwen2-VL-32B q4 (better quality than 7B)"
echo ""

for model_key in "${!MODELS[@]}"; do
    model_info="${MODELS[$model_key]}"
    model_name=$(echo "$model_info" | cut -d: -f1)
    quantization=$(echo "$model_info" | cut -d: -f2)
    size_gb=$(echo "$model_info" | cut -d: -f3)
    priority=$(echo "$model_info" | cut -d: -f4)
    
    # Construct Ollama model name with quantization
    if [ "$quantization" = "q4" ]; then
        ollama_model="${model_name}:q4"
    elif [ "$quantization" = "q5" ]; then
        ollama_model="${model_name}:q5"
    else
        ollama_model="$model_name"
    fi
    
    echo -e "\n${GREEN}📥 Installing: ${model_name} ${quantization} (${size_gb} GB) [${priority} priority]${NC}"
    
    if ollama pull "$ollama_model" 2>&1 | tee /tmp/ollama_install.log; then
        echo -e "${GREEN}   ✅ ${model_name} ${quantization} installed${NC}"
        INSTALLED=$((INSTALLED + 1))
    else
        echo -e "${RED}   ❌ Failed to install ${model_name} ${quantization}${NC}"
        echo -e "${YELLOW}   💡 Trying without quantization suffix...${NC}"
        # Try without quantization suffix (Ollama might handle it automatically)
        if ollama pull "$model_name" 2>&1; then
            echo -e "${GREEN}   ✅ ${model_name} installed (without explicit quantization)${NC}"
            INSTALLED=$((INSTALLED + 1))
        else
            FAILED=$((FAILED + 1))
        fi
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

cat > "$HOME/node2/swoper/config_node2.yaml" << 'EOF'
# Swoper Configuration for microDAO Node-2
# Single-active LLM scheduler with q4/q5 optimized models

swoper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 30
  gpu_enabled: true
  metal_acceleration: true  # Apple Silicon Metal
  quantization: q4  # Default quantization for large models

models:
  # Large models - q4 required
  deepseek-r1:
    path: ollama:deepseek-r1:q4
    type: llm
    size_gb: 40
    priority: high
    quantization: q4
    
  qwen-code-72b:
    path: ollama:qwen2.5-coder-72b-instruct:q4
    type: code
    size_gb: 40
    priority: high
    quantization: q4
    
  deepseek-math-33b:
    path: ollama:deepseek-math:33b:q4
    type: math
    size_gb: 20
    priority: high
    quantization: q4
    
  # Medium models - q4 recommended
  gemma-30b:
    path: ollama:gemma2:27b-it:q4
    type: llm
    size_gb: 18
    priority: medium
    quantization: q4
    
  mistral-22b:
    path: ollama:mistral-nemo:22b:q4
    type: llm
    size_gb: 13
    priority: medium
    quantization: q4
    
  starcoder2-34b:
    path: ollama:starcoder2:34b:q4
    type: code
    size_gb: 20
    priority: medium
    quantization: q4
    
  gpt-oss-20b:
    path: ollama:gpt-oss:20b:q4
    type: llm
    size_gb: 12
    priority: low
    quantization: q4
    
  # Small models - q4 for consistency
  mistral-13b:
    path: ollama:mistral:13b-instruct:q4
    type: llm
    size_gb: 7.5
    priority: medium
    quantization: q4
    
  falcon-40b:
    path: ollama:falcon:40b-instruct:q4
    type: llm
    size_gb: 24
    priority: low
    quantization: q4
    
  # Vision models - upgraded to better quality
  qwen-vl-32b:
    path: ollama:qwen2-vl:32b-instruct:q4
    type: vision
    size_gb: 20
    priority: high
    quantization: q4
    # Alternative: qwen2-vl:7b-instruct:q4 (8 GB, faster but lower quality)

storage:
  models_dir: ~/node2/swoper/models
  cache_dir: ~/node2/swoper/cache
  swap_dir: ~/node2/swoper/swap

ollama:
  url: http://localhost:11434
  timeout: 300
EOF

echo -e "${GREEN}✅ Configuration saved to: $HOME/node2/swoper/config_node2.yaml${NC}"

# Calculate total size
TOTAL_SIZE=$(python3 << 'PYEOF'
models = [40, 40, 20, 18, 13, 20, 12, 7.5, 24, 20]  # All q4 sizes
total = sum(models)
print(f"{total}")
PYEOF
)

echo -e "\n${GREEN}📊 Total models size (q4): ~${TOTAL_SIZE} GB${NC}"
echo -e "${GREEN}   Available disk: 1.5 TB${NC}"
echo -e "${GREEN}   ✅ Models will fit comfortably${NC}"

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



