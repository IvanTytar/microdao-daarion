#!/bin/bash
# Install Swoper with optimized models for Node-2
# CORRECTED: Only quantize models that don't fit (>60 GB)
# Smaller models can use full precision or q4 for speed

set -e

echo "🚀 Installing Swoper with optimized models for microDAO Node-2"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Swoper service exists (optional - models can be installed via Ollama)
SWAPPER_DIR=""
if [ -d "services/swapper" ]; then
    SWAPPER_DIR="services/swapper"
    echo -e "${GREEN}✅ Found Swoper at: ${SWAPPER_DIR}${NC}"
elif [ -d "/opt/microdao-daarion/services/swapper" ]; then
    SWAPPER_DIR="/opt/microdao-daarion/services/swapper"
    echo -e "${GREEN}✅ Found Swoper at: ${SWAPPER_DIR}${NC}"
else
    echo -e "${YELLOW}⚠️  Swoper service not found in project.${NC}"
    echo -e "${YELLOW}   Models will be installed via Ollama.${NC}"
    echo -e "${YELLOW}   Swoper configuration will be created for future use.${NC}"
fi

# Models configuration - OPTIMIZED
# Format: model_key:ollama_name:quantization:size_gb:priority:reason
declare -A MODELS=(
    # 🔴 OBLIGATORY q4/q5 (>60 GB, don't fit)
    ["deepseek-r1"]="deepseek-r1:q4:40:high:OBLIGATORY_67GB_full"
    ["qwen-code-72b"]="qwen2.5-coder-72b-instruct:q4:40:high:OBLIGATORY_144GB_full"
    ["deepseek-math-33b"]="deepseek-math:33b:q4:20:high:OBLIGATORY_66GB_full"
    ["starcoder2-34b"]="starcoder2:34b:q4:20:medium:OBLIGATORY_68GB_full"
    ["qwen-vl-32b"]="qwen2-vl:32b-instruct:q4:20:high:OBLIGATORY_64GB_full_better_quality"
    
    # 🟡 RECOMMENDED q4 (40-60 GB, fits but q4 better for performance)
    ["gemma-30b"]="gemma2:27b-it:q4:18:medium:RECOMMENDED_60GB_full"
    ["mistral-22b"]="mistral-nemo:22b:q4:13:medium:RECOMMENDED_44GB_full"
    
    # 🟢 OPTIONAL q4 or full (<40 GB, can use full)
    ["mistral-13b"]="mistral:13b-instruct:full:26:medium:OPTIONAL_can_use_full"
    ["gpt-oss-20b"]="gpt-oss:20b:full:40:low:OPTIONAL_can_use_full"
    ["qwen-vl-7b"]="qwen2-vl:7b-instruct:full:8:high:OPTIONAL_can_use_full"
    
    # Already quantized
    ["falcon-40b"]="falcon:40b-instruct:q4:24:low:ALREADY_Q4"
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

echo -e "\n${BLUE}📋 Model Installation Strategy:${NC}"
echo -e "${RED}   🔴 OBLIGATORY q4/q5 (>60 GB):${NC} DeepSeek-R1, Qwen Code 72B, DeepSeek Math 33B, StarCoder2-34B, Qwen2-VL-32B"
echo -e "${YELLOW}   🟡 RECOMMENDED q4 (40-60 GB):${NC} Gemma 30B, Mistral 22B"
echo -e "${GREEN}   🟢 OPTIONAL full/q4 (<40 GB):${NC} Mistral 13B, GPT-OSS-20B, Qwen-VL-7B"
echo ""

for model_key in "${!MODELS[@]}"; do
    model_info="${MODELS[$model_key]}"
    IFS=':' read -r ollama_name quantization size_gb priority reason <<< "$model_info"
    
    # Construct Ollama model name
    # Note: Ollama quantization is usually automatic or specified differently
    # For now, try the model name as-is first
    if [ "$quantization" = "q4" ]; then
        # Try with :q4 suffix first, then without
        ollama_model_q4="${ollama_name}:q4"
        ollama_model="$ollama_name"
        quant_label="q4"
    elif [ "$quantization" = "q5" ]; then
        ollama_model_q5="${ollama_name}:q5"
        ollama_model="$ollama_name"
        quant_label="q5"
    else
        ollama_model="$ollama_name"
        quant_label="full"
    fi
    
    # Color based on priority
    if [[ "$reason" == OBLIGATORY* ]]; then
        color=$RED
        icon="🔴"
    elif [[ "$reason" == RECOMMENDED* ]]; then
        color=$YELLOW
        icon="🟡"
    else
        color=$GREEN
        icon="🟢"
    fi
    
    echo -e "\n${color}${icon} Installing: ${ollama_name} ${quant_label} (${size_gb} GB) [${priority} priority]${NC}"
    echo -e "${color}   Reason: ${reason}${NC}"
    
    # Try to pull model
    if [ "$quantization" = "q4" ] && [ -n "$ollama_model_q4" ]; then
        # Try q4 version first
        if ollama pull "$ollama_model_q4" 2>&1 | tee /tmp/ollama_install.log; then
            echo -e "${GREEN}   ✅ ${ollama_name} ${quant_label} installed${NC}"
            INSTALLED=$((INSTALLED + 1))
            continue
        fi
    fi
    
    # Try standard model name (Ollama may handle quantization automatically)
    if ollama pull "$ollama_model" 2>&1 | tee /tmp/ollama_install.log; then
        echo -e "${GREEN}   ✅ ${ollama_name} ${quant_label} installed${NC}"
        INSTALLED=$((INSTALLED + 1))
    else
        echo -e "${YELLOW}   ⚠️  Model not found, checking available models...${NC}"
        # Check if model exists in different format
        if ollama list 2>/dev/null | grep -qi "$ollama_name"; then
            echo -e "${GREEN}   ✅ ${ollama_name} already installed${NC}"
            INSTALLED=$((INSTALLED + 1))
        else
            echo -e "${RED}   ❌ Failed to install ${ollama_name}${NC}"
            echo -e "${YELLOW}   💡 Model may not be available in Ollama. Check: ollama list${NC}"
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
# Single-active LLM scheduler with optimized quantization
# Only large models (>60 GB) use q4/q5, smaller can use full precision

swoper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 30
  gpu_enabled: true
  metal_acceleration: true  # Apple Silicon Metal
  quantization_strategy: smart  # Only quantize when needed

models:
  # 🔴 OBLIGATORY q4/q5 (>60 GB, don't fit in 64 GB RAM)
  deepseek-r1:
    path: ollama:deepseek-r1:q4
    type: llm
    size_gb: 40
    priority: high
    quantization: q4
    reason: "67 GB full doesn't fit, q4 (40 GB) fits in 64 GB RAM"
    
  qwen-code-72b:
    path: ollama:qwen2.5-coder-72b-instruct:q4
    type: code
    size_gb: 40
    priority: high
    quantization: q4
    reason: "144 GB full doesn't fit, q4 (40 GB) required"
    
  deepseek-math-33b:
    path: ollama:deepseek-math:33b:q4
    type: math
    size_gb: 20
    priority: high
    quantization: q4
    reason: "66 GB full doesn't fit, q4 (20 GB) required"
    
  starcoder2-34b:
    path: ollama:starcoder2:34b:q4
    type: code
    size_gb: 20
    priority: medium
    quantization: q4
    reason: "68 GB full doesn't fit, q4 (20 GB) required"
    
  qwen-vl-32b:
    path: ollama:qwen2-vl:32b-instruct:q4
    type: vision
    size_gb: 20
    priority: high
    quantization: q4
    reason: "64 GB full doesn't fit, q4 (20 GB) for better quality than 7B"
    
  # 🟡 RECOMMENDED q4 (40-60 GB, fits but q4 better for performance)
  gemma-30b:
    path: ollama:gemma2:27b-it:q4
    type: llm
    size_gb: 18
    priority: medium
    quantization: q4
    reason: "60 GB full fits but q4 (18 GB) better performance"
    
  mistral-22b:
    path: ollama:mistral-nemo:22b:q4
    type: llm
    size_gb: 13
    priority: medium
    quantization: q4
    reason: "44 GB full fits but q4 (13 GB) better performance"
    
  # 🟢 OPTIONAL full/q4 (<40 GB, can use full precision)
  mistral-13b:
    path: ollama:mistral:13b-instruct
    type: llm
    size_gb: 26
    priority: medium
    quantization: full
    reason: "26 GB fits, can use full precision or q4 for speed"
    
  gpt-oss-20b:
    path: ollama:gpt-oss:20b
    type: llm
    size_gb: 40
    priority: low
    quantization: full
    reason: "40 GB fits, can use full precision"
    
  qwen-vl-7b:
    path: ollama:qwen2-vl:7b-instruct
    type: vision
    size_gb: 8
    priority: high
    quantization: full
    reason: "8 GB fits, can use full precision (fast vision model)"
    
  falcon-40b:
    path: ollama:falcon:40b-instruct:q4
    type: llm
    size_gb: 24
    priority: low
    quantization: q4
    reason: "Already quantized"

storage:
  models_dir: ~/node2/swoper/models
  cache_dir: ~/node2/swoper/cache
  swap_dir: ~/node2/swoper/swap

ollama:
  url: http://localhost:11434
  timeout: 300

# GPU/VRAM info
hardware:
  ram_gb: 64
  gpu: "M4 Max 40-core"
  vram: "Shared with RAM (up to 64 GB)"
  metal_acceleration: true
EOF

echo -e "${GREEN}✅ Configuration saved to: $HOME/node2/swoper/config_node2.yaml${NC}"

# Calculate total size
TOTAL_SIZE=$(python3 << 'PYEOF'
# Only count models that will be installed
obligatory = [40, 40, 20, 20, 20]  # q4 models that are required
recommended = [18, 13]  # q4 models recommended
optional_full = [26, 40, 8]  # full models
optional_q4 = [24]  # already q4

total = sum(obligatory) + sum(recommended) + sum(optional_full) + sum(optional_q4)
print(f"{total}")
PYEOF
)

echo -e "\n${GREEN}📊 Total models size: ~${TOTAL_SIZE} GB${NC}"
echo -e "${GREEN}   Available disk: 1.5 TB${NC}"
echo -e "${GREEN}   Available RAM: 64 GB${NC}"
echo -e "${GREEN}   ✅ Models will fit comfortably${NC}"

echo -e "\n${BLUE}💡 DeepSeek-R1 q4 (40 GB) Analysis:${NC}"
echo -e "   - 64 GB RAM достатньо для 40 GB моделі ✅"
echo -e "   - M4 Max Metal acceleration підтримується ✅"
echo -e "   - Може працювати, але займе більшу частину RAM"
echo -e "   - Рекомендація: q4 для DeepSeek-R1 (40 GB < 64 GB) ✅"

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

