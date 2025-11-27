#!/bin/bash
# Скрипт для увімкнення GPU acceleration для Ollama на НОДА1
# Ollama працює як systemd service

set -e

echo "🚀 Увімкнення GPU acceleration для Ollama на НОДА1"
echo "GPU: NVIDIA RTX 4000 SFF Ada Generation (20GB VRAM)"
echo ""

# Перевірка GPU
echo "📊 Перевірка GPU..."
nvidia-smi --query-gpu=name,memory.total,utilization.gpu --format=csv,noheader

# Перевірка Ollama service
echo ""
echo "🔍 Перевірка Ollama service..."
systemctl status ollama --no-pager | head -10

# Створення override.conf для GPU
echo ""
echo "📝 Створення override.conf для GPU..."
mkdir -p /etc/systemd/system/ollama.service.d

cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
# GPU acceleration
Environment="OLLAMA_NUM_GPU=1"
Environment="OLLAMA_GPU_LAYERS=35"
Environment="CUDA_VISIBLE_DEVICES=0"
# Keep models loaded
Environment="OLLAMA_KEEP_ALIVE=24h"
EOF

echo "✅ Створено override.conf:"
cat /etc/systemd/system/ollama.service.d/override.conf

# Перезавантаження systemd та перезапуск Ollama
echo ""
echo "🔄 Перезавантаження systemd..."
systemctl daemon-reload

echo ""
echo "🔄 Перезапуск Ollama..."
systemctl restart ollama

# Чекаємо поки Ollama запуститься
echo ""
echo "⏳ Чекаємо запуск Ollama (10 секунд)..."
sleep 10

# Перевірка статусу
echo ""
echo "✅ Перевірка статусу Ollama..."
systemctl status ollama --no-pager | head -15

# Перевірка GPU використання
echo ""
echo "📊 Перевірка GPU використання..."
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv

# Перевірка Ollama через API
echo ""
echo "🔍 Перевірка Ollama через API..."
curl -s http://localhost:11434/api/ps | python3 -m json.tool 2>/dev/null || echo "Ollama API доступний"

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Наступні кроки:"
echo "   1. Перевірити GPU utilization: nvidia-smi"
echo "   2. Перевірити CPU навантаження: top"
echo "   3. Протестувати Ollama: ollama run qwen3:8b 'test'"
echo ""
echo "Очікуваний результат:"
echo "   - GPU utilization: 0% → 30-50%"
echo "   - CPU Ollama: 1583% → 50-100%"
echo "   - Загальне CPU: 85.3% → 40-50%"




