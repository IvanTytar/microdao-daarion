#!/bin/bash
# Install Ollama models for Node-2 Swoper
# Using correct Ollama model names

set -e

echo "🚀 Installing Ollama models for microDAO Node-2"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama is not running. Starting Ollama...${NC}"
    brew services start ollama || {
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        exit 1
    }
    sleep 5
fi

# Models with correct Ollama names
# Format: priority:ollama_name:size_gb:reason
declare -a MODELS=(
    # 🔴 OBLIGATORY q4/q5 (>60 GB)
    "high:deepseek-r1:40:OBLIGATORY_67GB_full"
    "high:qwen2.5-coder:72b:40:OBLIGATORY_144GB_full"
    "high:deepseek-math:33b:20:OBLIGATORY_66GB_full"
    "medium:starcoder2:34b:20:OBLIGATORY_68GB_full"
    "high:qwen2-vl:32b:20:OBLIGATORY_64GB_full"
    
    # 🟡 RECOMMENDED q4 (40-60 GB)
    "medium:gemma2:27b:18:RECOMMENDED_60GB_full"
    "medium:mistral:22b:13:RECOMMENDED_44GB_full"
    
    # 🟢 OPTIONAL full/q4 (<40 GB)
    "medium:mistral:13b:26:OPTIONAL_can_use_full"
    "low:gpt-oss:20b:40:OPTIONAL_can_use_full"
    "high:qwen2-vl:7b:8:OPTIONAL_can_use_full"
)

INSTALLED=0
FAILED=0
SKIPPED=0

echo -e "\n${BLUE}📋 Model Installation Plan:${NC}"
echo -e "${RED}   🔴 OBLIGATORY q4/q5 (>60 GB):${NC} DeepSeek-R1, Qwen Code 72B, DeepSeek Math 33B, StarCoder2-34B, Qwen2-VL-32B"
echo -e "${YELLOW}   🟡 RECOMMENDED q4 (40-60 GB):${NC} Gemma 30B, Mistral 22B"
echo -e "${GREEN}   🟢 OPTIONAL full/q4 (<40 GB):${NC} Mistral 13B, GPT-OSS-20B, Qwen-VL-7B"
echo ""

for model_info in "${MODELS[@]}"; do
    IFS=':' read -r priority ollama_name size_gb reason <<< "$model_info"
    
    # Check if already installed
    if ollama list 2>/dev/null | grep -qi "$ollama_name"; then
        echo -e "${GREEN}✅ ${ollama_name} already installed${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # Color based on priority
    if [ "$priority" = "high" ]; then
        color=$RED
        icon="🔴"
    elif [ "$priority" = "medium" ]; then
        color=$YELLOW
        icon="🟡"
    else
        color=$GREEN
        icon="🟢"
    fi
    
    echo -e "\n${color}${icon} Installing: ${ollama_name} (${size_gb} GB) [${priority} priority]${NC}"
    echo -e "${color}   Reason: ${reason}${NC}"
    
    if ollama pull "$ollama_name" 2>&1 | tee /tmp/ollama_install.log; then
        echo -e "${GREEN}   ✅ ${ollama_name} installed${NC}"
        INSTALLED=$((INSTALLED + 1))
    else
        echo -e "${YELLOW}   ⚠️  Model may not be available with this exact name${NC}"
        echo -e "${YELLOW}   💡 Check available models: ollama list${NC}"
        echo -e "${YELLOW}   💡 Or search: https://ollama.com/library${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo -e "\n${GREEN}=================================================="
echo "📊 Installation Summary"
echo "==================================================${NC}"
echo -e "   ✅ Installed: ${INSTALLED} models"
echo -e "   ⏭️  Skipped (already installed): ${SKIPPED} models"
echo -e "   ❌ Failed: ${FAILED} models"
echo ""

# Show installed models
echo -e "${BLUE}📦 Currently installed models:${NC}"
ollama list 2>/dev/null | head -20

echo -e "\n${GREEN}✅ Model installation complete!${NC}"
echo ""
echo "⏭️  Next steps:"
echo "   1. Review installed models: ollama list"
echo "   2. Test a model: ollama run deepseek-r1 'Hello'"
echo "   3. Configure Swoper with model paths"
echo ""



