#!/bin/bash
# Install Ollama models with priorities for microDAO Node-2
# This script installs models in priority order

set -e

echo "🚀 Installing Ollama models for microDAO Node-2 (Priority Order)"
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

# Priority 1: Critical models
echo -e "\n${RED}🔴 PRIORITY 1: Critical Models${NC}"
echo "=================================================="

declare -a PRIORITY1=(
    "deepseek-r1:q4:40:Reasoning_Strategic_Agents"
    "mistral-nemo:22b:q4:13:Reasoning_Strategic_Agents"
    "gemma2:27b-it:q4:18:Reasoning_Strategic_Agents"
    "qwen2.5-coder:72b:q4:40:Code_Engineering_Agents"
    "starcoder2:34b:q4:20:Code_Engineering_Agents"
    "qwen2-vl:32b-instruct:q4:20:Vision_Agents"
    "mistral:7b-instruct:4.1:Fast_Agents"
    "qwen2.5:7b-instruct:4.4:Fast_Agents"
    "gpt-oss:20b:q4:12:Fast_Agents"
)

INSTALLED_P1=0
FAILED_P1=0

for model_info in "${PRIORITY1[@]}"; do
    IFS=':' read -r model_name size_gb purpose <<< "$model_info"
    
    # Check if already installed
    if ollama list 2>/dev/null | grep -qi "$model_name"; then
        echo -e "${GREEN}✅ ${model_name} already installed${NC}"
        INSTALLED_P1=$((INSTALLED_P1 + 1))
        continue
    fi
    
    echo -e "\n${RED}📥 Installing: ${model_name} (${size_gb} GB)${NC}"
    echo -e "${YELLOW}   Purpose: ${purpose}${NC}"
    
    if ollama pull "$model_name" 2>&1; then
        echo -e "${GREEN}   ✅ ${model_name} installed${NC}"
        INSTALLED_P1=$((INSTALLED_P1 + 1))
    else
        echo -e "${YELLOW}   ⚠️  Model may not be available with this exact name${NC}"
        FAILED_P1=$((FAILED_P1 + 1))
    fi
done

# Priority 2: Specialized models
echo -e "\n${YELLOW}🟡 PRIORITY 2: Specialized Models${NC}"
echo "=================================================="

declare -a PRIORITY2=(
    "deepseek-math:33b:q4:20:Math_Agents"
)

INSTALLED_P2=0
FAILED_P2=0

for model_info in "${PRIORITY2[@]}"; do
    IFS=':' read -r model_name size_gb purpose <<< "$model_info"
    
    if ollama list 2>/dev/null | grep -qi "$model_name"; then
        echo -e "${GREEN}✅ ${model_name} already installed${NC}"
        INSTALLED_P2=$((INSTALLED_P2 + 1))
        continue
    fi
    
    echo -e "\n${YELLOW}📥 Installing: ${model_name} (${size_gb} GB)${NC}"
    echo -e "${YELLOW}   Purpose: ${purpose}${NC}"
    
    if ollama pull "$model_name" 2>&1; then
        echo -e "${GREEN}   ✅ ${model_name} installed${NC}"
        INSTALLED_P2=$((INSTALLED_P2 + 1))
    else
        FAILED_P2=$((FAILED_P2 + 1))
    fi
done

# Priority 3: Ultra-light models
echo -e "\n${GREEN}🟢 PRIORITY 3: Ultra-light Models${NC}"
echo "=================================================="

declare -a PRIORITY3=(
    "gemma2:2b-it:1.4:Memory_Agents_Somnia"
    "phi3:mini:2.3:Memory_Agents"
    "qwen2.5:3b-instruct:2.0:Memory_Agents"
)

INSTALLED_P3=0
FAILED_P3=0

for model_info in "${PRIORITY3[@]}"; do
    IFS=':' read -r model_name size_gb purpose <<< "$model_info"
    
    if ollama list 2>/dev/null | grep -qi "$model_name"; then
        echo -e "${GREEN}✅ ${model_name} already installed${NC}"
        INSTALLED_P3=$((INSTALLED_P3 + 1))
        continue
    fi
    
    echo -e "\n${GREEN}📥 Installing: ${model_name} (${size_gb} GB)${NC}"
    echo -e "${GREEN}   Purpose: ${purpose}${NC}"
    
    if ollama pull "$model_name" 2>&1; then
        echo -e "${GREEN}   ✅ ${model_name} installed${NC}"
        INSTALLED_P3=$((INSTALLED_P3 + 1))
    else
        FAILED_P3=$((FAILED_P3 + 1))
    fi
done

# Summary
echo -e "\n${GREEN}=================================================="
echo "📊 Installation Summary"
echo "==================================================${NC}"
echo -e "${RED}   🔴 Priority 1: ${INSTALLED_P1} installed, ${FAILED_P1} failed${NC}"
echo -e "${YELLOW}   🟡 Priority 2: ${INSTALLED_P2} installed, ${FAILED_P2} failed${NC}"
echo -e "${GREEN}   🟢 Priority 3: ${INSTALLED_P3} installed, ${FAILED_P3} failed${NC}"
echo ""

# Show installed models
echo -e "${BLUE}📦 Currently installed models:${NC}"
ollama list 2>/dev/null

echo -e "\n${GREEN}✅ Model installation complete!${NC}"
echo ""
echo "⏭️  Next steps:"
echo "   1. Review installed models: ollama list"
echo "   2. Get detailed info: curl http://localhost:11434/api/tags | jq"
echo "   3. Update Swoper config with model names"
echo "   4. Generate Cursor Prompt for agents"
echo ""



