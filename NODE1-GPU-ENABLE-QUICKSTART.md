# ⚡ Швидкий старт: Увімкнення GPU для Ollama на НОДА1

**Дата:** 2025-01-27  
**GPU:** ✅ NVIDIA RTX 4000 SFF Ada (20GB VRAM) - **ДОСТУПНИЙ!**  
**Проблема:** Ollama використовує CPU (1583% CPU) замість GPU  
**Рішення:** Увімкнути GPU acceleration

---

## ✅ Перевірка

**GPU статус:**
```bash
nvidia-smi
# ✅ NVIDIA RTX 4000 SFF Ada Generation
# ✅ 20GB VRAM
# ✅ CUDA 12.2
# ✅ Driver 535.274.02
```

**Docker GPU підтримка:**
```bash
nvidia-container-cli --version
# ✅ 1.18.0

docker --version
# ✅ 29.0.1 (підтримує --gpus)
```

**Поточне використання GPU:**
- Python процес: 2240 MiB VRAM (11%)
- GPU utilization: 0%
- **Ollama НЕ використовує GPU!**

---

## 🚀 Швидке рішення

### ✅ Варіант 1: Ollama як systemd service (ПОТОЧНА КОНФІГУРАЦІЯ)

**Знайдено:** Ollama працює як systemd service (`/etc/systemd/system/ollama.service`)

**Швидке рішення (автоматичний скрипт):**
```bash
# На НОДА1
cd /opt/microdao-daarion
# Запустити скрипт
bash NODE1-OLLAMA-GPU-ENABLE.sh
```

**Або вручну:**
```bash
# 1. Створити override.conf
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null << 'EOF'
[Service]
Environment="OLLAMA_NUM_GPU=1"
Environment="OLLAMA_GPU_LAYERS=35"
Environment="CUDA_VISIBLE_DEVICES=0"
Environment="OLLAMA_KEEP_ALIVE=24h"
EOF

# 2. Перезавантажити systemd
sudo systemctl daemon-reload

# 3. Перезапустити Ollama
sudo systemctl restart ollama

# 4. Перевірити
nvidia-smi
curl http://localhost:11434/api/ps
```

### Варіант 2: Ollama як Docker контейнер

Якщо Ollama працює в Docker (але контейнер не знайдено, можливо в іншому compose файлі):

```bash
# Знайти Ollama
docker ps -a | grep ollama
docker compose -f /opt/microdao-daarion/docker-compose.yml ps | grep ollama

# Оновити docker-compose.yml
cd /opt/microdao-daarion
nano docker-compose.yml

# Додати GPU конфігурацію для ollama service:
services:
  ollama:
    image: ollama/ollama:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - CUDA_VISIBLE_DEVICES=0
      - OLLAMA_NUM_GPU=1
      - OLLAMA_GPU_LAYERS=35

# Перезапустити
docker compose up -d ollama
```

### Варіант 3: Ollama працює на хості (не в Docker)

Якщо Ollama встановлено на хості:

```bash
# Перевірити Ollama
ollama --version
which ollama

# Ollama автоматично використовує GPU якщо доступний CUDA
# Перевірити:
ollama ps
nvidia-smi

# Якщо не використовує GPU, перевірити CUDA:
nvcc --version
```

---

## 📊 Перевірка результатів

```bash
# 1. GPU utilization (має збільшитися)
nvidia-smi

# 2. CPU навантаження Ollama (має знизитися)
top -bn1 | grep ollama

# 3. Ollama через API
curl http://localhost:11434/api/ps

# 4. Тест швидкості
time curl -X POST http://localhost:11434/api/generate -d '{
  "model": "qwen3:8b",
  "prompt": "Привіт, тест GPU",
  "stream": false
}'
```

**Очікувані результати:**
- ✅ GPU utilization: 0% → 30-50%
- ✅ CPU Ollama: 1583% → 50-100%
- ✅ Загальне CPU: 85.3% → 40-50%
- ✅ Швидкість: +200-300%

---

## 🔍 Діагностика

Якщо GPU не працює:

```bash
# 1. Перевірити CUDA в Ollama
docker exec ollama nvidia-smi  # або на хості
ollama ps  # покаже чи використовує GPU

# 2. Перевірити логи
docker logs ollama | grep -i gpu
journalctl -u ollama | grep -i gpu

# 3. Перевірити CUDA доступність
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

---

**Last Updated:** 2025-01-27  
**Status:** ✅ GPU доступний, потрібно налаштувати Ollama

