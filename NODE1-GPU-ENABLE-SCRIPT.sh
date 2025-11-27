#!/bin/bash
# Скрипт для увімкнення GPU acceleration для Ollama на НОДА1
# GPU: NVIDIA RTX 4000 SFF Ada Generation (20GB VRAM)

set -e

echo "🚀 Увімкнення GPU acceleration для Ollama на НОДА1"
echo "GPU: NVIDIA RTX 4000 SFF Ada Generation (20GB VRAM)"
echo ""

# Перевірка GPU
echo "📊 Перевірка GPU..."
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

# Перевірка Ollama контейнера
echo ""
echo "🔍 Перевірка Ollama контейнера..."
OLLAMA_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i ollama | head -1)

if [ -z "$OLLAMA_CONTAINER" ]; then
    echo "❌ Ollama контейнер не знайдено!"
    echo "   Перевірте чи запущений Ollama: docker ps | grep ollama"
    exit 1
fi

echo "✅ Знайдено Ollama контейнер: $OLLAMA_CONTAINER"

# Перевірка чи вже налаштовано GPU
echo ""
echo "🔍 Перевірка поточної конфігурації GPU..."
GPU_CONFIG=$(docker inspect "$OLLAMA_CONTAINER" --format '{{.HostConfig.DeviceRequests}}' 2>&1)

if echo "$GPU_CONFIG" | grep -q "nvidia"; then
    echo "⚠️  GPU вже налаштовано, але перевіряємо використання..."
else
    echo "❌ GPU не налаштовано для Ollama!"
    echo ""
    echo "📝 Для увімкнення GPU потрібно:"
    echo "   1. Зупинити Ollama: docker stop $OLLAMA_CONTAINER"
    echo "   2. Оновити docker-compose.yml з GPU конфігурацією"
    echo "   3. Перезапустити: docker compose up -d ollama"
    echo ""
    echo "💡 Альтернатива: використати docker run з --gpus all"
fi

# Перевірка використання GPU Ollama
echo ""
echo "📊 Перевірка використання GPU Ollama..."
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv

# Перевірка Ollama через API
echo ""
echo "🔍 Перевірка Ollama через API..."
OLLAMA_PS=$(curl -s http://localhost:11434/api/ps 2>&1 || echo "[]")

if echo "$OLLAMA_PS" | grep -q "qwen"; then
    echo "✅ Ollama має завантажені моделі"
    echo "$OLLAMA_PS" | python3 -m json.tool 2>/dev/null || echo "$OLLAMA_PS"
else
    echo "⚠️  Ollama не має завантажених моделей"
fi

echo ""
echo "✅ Перевірка завершена!"
echo ""
echo "📋 Наступні кроки:"
echo "   1. Оновити docker-compose.yml для Ollama з GPU"
echo "   2. Перезапустити Ollama контейнер"
echo "   3. Перевірити використання GPU: nvidia-smi"
echo "   4. Протестувати Ollama з GPU: ollama run qwen3:8b 'test'"




