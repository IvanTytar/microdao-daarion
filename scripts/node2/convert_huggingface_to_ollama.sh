#!/bin/bash

# Скрипт для конвертації моделей з HuggingFace в GGUF та імпорту в Ollama
# Використання: ./convert_huggingface_to_ollama.sh [model_name]

set -e

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Перевірка наявності необхідних інструментів
check_dependencies() {
    echo -e "${YELLOW}=== Перевірка залежностей ===${NC}"
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    VENV_PATH="$PROJECT_ROOT/venv_models"
    
    # Перевірка віртуального середовища
    if [ -d "$VENV_PATH" ]; then
        echo -e "${GREEN}✅ Віртуальне середовище знайдено${NC}"
        source "$VENV_PATH/bin/activate"
    else
        echo -e "${YELLOW}⚠️  Віртуальне середовище не знайдено, використовую системний Python${NC}"
    fi
    
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo -e "${RED}❌ python3 не знайдено${NC}"
        exit 1
    fi
    
    PYTHON_CMD="python3"
    if command -v python &> /dev/null && [ -n "$VIRTUAL_ENV" ]; then
        PYTHON_CMD="python"
    fi
    
    if ! $PYTHON_CMD -c "import huggingface_hub" 2>/dev/null; then
        echo -e "${YELLOW}Встановлюю huggingface_hub...${NC}"
        $PYTHON_CMD -m pip install huggingface_hub
    fi
    
    if ! $PYTHON_CMD -c "import torch" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  torch не встановлено. Встановіть: pip install torch transformers sentencepiece${NC}"
    fi
    
    echo -e "${GREEN}✅ Залежності перевірено${NC}"
}

# Конвертація Qwen2.5-VL-32B
convert_qwen2_5_vl_32b() {
    echo -e "${YELLOW}=== Конвертація Qwen2.5-VL-32B ===${NC}"
    
    MODEL_NAME="Qwen/Qwen3-VL-32B-Instruct"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    OUTPUT_DIR="$PROJECT_ROOT/models/qwen3-vl-32b-instruct"
    GGUF_FILE="qwen3-vl-32b-instruct-q4_k_m.gguf"
    
    mkdir -p "$OUTPUT_DIR"
    cd "$OUTPUT_DIR"
    
    echo "1. Завантаження з HuggingFace..."
    if [ -d "$VENV_PATH" ]; then
        source "$VENV_PATH/bin/activate"
        PYTHON_CMD="python"
    else
        PYTHON_CMD="python3"
    fi
    
    $PYTHON_CMD -c "
from huggingface_hub import snapshot_download
snapshot_download(repo_id='$MODEL_NAME', local_dir='.')
"
    
    echo "2. Конвертація в GGUF..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    cd ~/llama.cpp
    
    # Перевірка наявності скрипта конвертації
    if [ -f "convert_hf_to_gguf.py" ]; then
        CONVERT_SCRIPT="convert_hf_to_gguf.py"
    elif [ -f "convert-hf-to-gguf.py" ]; then
        CONVERT_SCRIPT="convert-hf-to-gguf.py"
    elif [ -f "convert.py" ]; then
        CONVERT_SCRIPT="convert.py"
    else
        echo -e "${RED}❌ Скрипт конвертації не знайдено в llama.cpp${NC}"
        echo "   Встановіть залежності: pip3 install torch transformers sentencepiece"
        exit 1
    fi
    
    if [ -d "$PROJECT_ROOT/venv_models" ]; then
        source "$PROJECT_ROOT/venv_models/bin/activate"
        PYTHON_CMD="python"
    else
        PYTHON_CMD="python3"
    fi
    
    # Спочатку конвертуємо в f16, потім квантуємо
    $PYTHON_CMD "$CONVERT_SCRIPT" "$PROJECT_ROOT/models/qwen3-vl-32b-instruct" --outdir "$PROJECT_ROOT/models/qwen3-vl-32b-instruct" --outtype f16
    
    # Знаходимо створений GGUF файл та квантуємо його
    GGUF_F16=$(find "$PROJECT_ROOT/models/qwen3-vl-32b-instruct" -name "*.gguf" -type f | head -1)
    if [ -n "$GGUF_F16" ]; then
        echo "Квантування в Q4_K_M..."
        if [ -f "$HOME/llama.cpp/build/bin/llama-quantize" ]; then
            "$HOME/llama.cpp/build/bin/llama-quantize" "$GGUF_F16" "$PROJECT_ROOT/models/qwen3-vl-32b-instruct/$GGUF_FILE" Q4_K_M
        else
            echo -e "${YELLOW}⚠️  llama-quantize не знайдено, використовую f16 версію${NC}"
            GGUF_FILE=$(basename "$GGUF_F16")
        fi
    fi
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Конвертація завершена${NC}"
    else
        echo -e "${RED}❌ Помилка конвертації${NC}"
        exit 1
    fi
    
    echo "3. Імпорт в Ollama..."
    if [ -f "$OUTPUT_DIR/$GGUF_FILE" ]; then
        cd "$PROJECT_ROOT"
        ollama create qwen3-vl-32b-instruct -f docs/node2/Modelfile.qwen2.5-vl-32b
        echo -e "${GREEN}✅ Модель імпортовано в Ollama${NC}"
    else
        echo -e "${RED}❌ GGUF файл не знайдено: $OUTPUT_DIR/$GGUF_FILE${NC}"
    fi
}

# Конвертація RWKV-World-32B
convert_rwkv_world_32b() {
    echo -e "${YELLOW}=== Конвертація RWKV-World-32B ===${NC}"
    
    MODEL_NAME="BlinkDL/rwkv-4-pile-14b"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    OUTPUT_DIR="$PROJECT_ROOT/models/rwkv-4-pile-14b"
    GGUF_FILE="rwkv-4-pile-14b-q4_k_m.gguf"
    VENV_PATH="$PROJECT_ROOT/venv_models"
    
    mkdir -p "$OUTPUT_DIR"
    cd "$OUTPUT_DIR"
    
    echo "1. Завантаження з HuggingFace..."
    if [ -d "$VENV_PATH" ]; then
        source "$VENV_PATH/bin/activate"
        PYTHON_CMD="python"
    else
        PYTHON_CMD="python3"
    fi
    
    $PYTHON_CMD -c "
from huggingface_hub import snapshot_download
snapshot_download(repo_id='$MODEL_NAME', local_dir='.')
"
    
    echo "2. Конвертація в GGUF..."
    echo -e "${YELLOW}⚠️  Потрібно виконати вручну:${NC}"
    echo "   cd rwkv.cpp/tools"
    echo "   python3 convert-pytorch-to-gguf.py ../../models/rwkv-world-32b --outtype q4_k_m"
    
    echo "2. Конвертація в GGUF (RWKV потребує спеціального інструменту)..."
    echo -e "${YELLOW}⚠️  RWKV конвертація потребує додаткових інструментів${NC}"
    echo "   Перевірте документацію rwkv.cpp для конвертації"
    
    echo "2. Конвертація в GGUF (RWKV потребує спеціального інструменту)..."
    cd "$HOME/rwkv.cpp"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    VENV_PATH="$PROJECT_ROOT/venv_models"
    
    if [ -d "$VENV_PATH" ]; then
        source "$VENV_PATH/bin/activate"
        PYTHON_CMD="python"
    else
        PYTHON_CMD="python3"
    fi
    
    if [ -f "python/convert_pytorch_to_ggml.py" ]; then
        $PYTHON_CMD python/convert_pytorch_to_ggml.py "$OUTPUT_DIR" --outtype q4_k_m
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Конвертація завершена${NC}"
        else
            echo -e "${YELLOW}⚠️  Помилка конвертації, перевірте залежності${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Скрипт конвертації RWKV не знайдено${NC}"
    fi
    
    echo "3. Імпорт в Ollama (після конвертації)..."
    if [ -f "$OUTPUT_DIR/$GGUF_FILE" ]; then
        cd "$PROJECT_ROOT"
        ollama create rwkv-4-pile-14b -f docs/node2/Modelfile.rwkv-world-32b
        echo -e "${GREEN}✅ Модель імпортовано в Ollama${NC}"
    else
        echo -e "${YELLOW}⚠️  GGUF файл не знайдено, конвертацію потрібно виконати вручну${NC}"
    fi
}

# Конвертація Falcon-11B
convert_falcon_11b() {
    echo -e "${YELLOW}=== Конвертація Falcon-11B (Instruct) ===${NC}"
    
    MODEL_NAME="tiiuae/falcon-11B"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    OUTPUT_DIR="$PROJECT_ROOT/models/falcon-11b"
    GGUF_FILE="falcon-11b-q4_k_m.gguf"
    VENV_PATH="$PROJECT_ROOT/venv_models"
    
    mkdir -p "$OUTPUT_DIR"
    cd "$OUTPUT_DIR"
    
    echo "1. Завантаження з HuggingFace..."
    if [ -d "$VENV_PATH" ]; then
        source "$VENV_PATH/bin/activate"
        PYTHON_CMD="python"
    else
        PYTHON_CMD="python3"
    fi
    
    $PYTHON_CMD -c "
from huggingface_hub import snapshot_download
snapshot_download(repo_id='$MODEL_NAME', local_dir='.')
"
    
    echo "2. Конвертація в GGUF..."
    cd "$HOME/llama.cpp"
    python3 convert-hf-to-gguf.py "$(pwd)/models/falcon-11b-instruct" --outdir "$(pwd)/models/falcon-11b-instruct" --outtype q4_k_m
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Конвертація завершена${NC}"
    else
        echo -e "${RED}❌ Помилка конвертації${NC}"
        exit 1
    fi
    
    echo "3. Імпорт в Ollama..."
    if [ -f "$OUTPUT_DIR/$GGUF_FILE" ]; then
        cd "$PROJECT_ROOT"
        ollama create falcon-11b -f docs/node2/Modelfile.falcon-11b-instruct
        echo -e "${GREEN}✅ Модель імпортовано в Ollama${NC}"
    else
        echo -e "${RED}❌ GGUF файл не знайдено: $OUTPUT_DIR/$GGUF_FILE${NC}"
    fi
}

# Головна функція
main() {
    check_dependencies
    
    case "$1" in
        qwen3-vl-32b-instruct|qwen|qwen2.5-vl-32b)
            convert_qwen2_5_vl_32b
            ;;
        rwkv-4-pile-14b|rwkv-world-32b|rwkv)
            convert_rwkv_world_32b
            ;;
        falcon-11b|falcon-11b-instruct|falcon)
            convert_falcon_11b
            ;;
        all)
            convert_qwen2_5_vl_32b
            convert_rwkv_world_32b
            convert_falcon_11b
            ;;
        *)
            echo -e "${RED}Використання: $0 [qwen2.5-vl-32b|rwkv-world-32b|falcon-11b|all]${NC}"
            echo ""
            echo "Доступні моделі:"
            echo "  - qwen2.5-vl-32b (або qwen)"
            echo "  - rwkv-world-32b (або rwkv)"
            echo "  - falcon-11b (або falcon)"
            echo "  - all (всі моделі)"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Готово!${NC}"
}

main "$@"

