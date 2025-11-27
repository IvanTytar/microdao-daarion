# 🚀 Інструкції: Увімкнення GPU для Ollama на НОДА1

**Дата:** 2025-01-27  
**GPU:** NVIDIA RTX 4000 SFF Ada Generation (20GB VRAM)  
**Проблема:** Ollama використовує CPU (1583% CPU) замість GPU  
**Рішення:** Увімкнути GPU acceleration для Ollama

---

## 📋 Крок 1: Перевірка поточного стану

```bash
# На НОДА1 (144.76.224.179)
ssh root@144.76.224.179

# Перевірити GPU
nvidia-smi

# Перевірити Ollama контейнер
docker ps | grep ollama
docker inspect ollama --format '{{.HostConfig.DeviceRequests}}'
```

**Очікуваний результат:** `[]` (GPU не налаштовано)

---

## 🔧 Крок 2: Оновити docker-compose.yml

Знайти файл `docker-compose.yml` на НОДА1:
```bash
cd /opt/microdao-daarion
ls -la docker-compose.yml
```

Знайти секцію `ollama:` та додати GPU конфігурацію:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    # ДОДАТИ GPU КОНФІГУРАЦІЮ:
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
    restart: unless-stopped
```

**Альтернатива (якщо використовується docker run):**
```bash
docker stop ollama
docker rm ollama
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama-data:/root/.ollama \
  -e NVIDIA_VISIBLE_DEVICES=all \
  ollama/ollama:latest
```

---

## 🔄 Крок 3: Перезапустити Ollama

```bash
cd /opt/microdao-daarion

# Зупинити Ollama
docker compose stop ollama

# Перезапустити з новою конфігурацією
docker compose up -d ollama

# Перевірити статус
docker ps | grep ollama
```

---

## ✅ Крок 4: Перевірити використання GPU

```bash
# Перевірити GPU utilization
nvidia-smi

# Перевірити Ollama через API
curl http://localhost:11434/api/ps

# Протестувати Ollama з GPU
docker exec ollama ollama run qwen3:8b "Привіт, тест GPU"
```

**Очікуваний результат:**
- `nvidia-smi` показує процес Ollama на GPU
- GPU utilization: 30-50%
- CPU навантаження Ollama: знизиться з 1583% до 50-100%

---

## 📊 Крок 5: Моніторинг результатів

```bash
# CPU навантаження (має знизитися)
top -bn1 | grep "Cpu(s)"

# GPU використання (має збільшитися)
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv

# Ollama процеси
docker exec ollama ollama ps
```

**Очікувані результати:**
- ✅ CPU: 85.3% → 40-50% (-35-45%)
- ✅ GPU: 0% → 30-50% utilization
- ✅ Ollama CPU: 1583% → 50-100%
- ✅ Швидкість інференсу: +200-300%

---

## 🔍 Крок 6: Перевірка помилок

Якщо GPU не працює:

```bash
# Перевірити логи Ollama
docker logs ollama | tail -50

# Перевірити nvidia-container-toolkit
nvidia-container-cli --version

# Перевірити Docker GPU підтримку
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

**Можливі проблеми:**
1. ❌ `nvidia-container-toolkit` не встановлено
   ```bash
   # Встановити nvidia-container-toolkit
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
   sudo systemctl restart docker
   ```

2. ❌ Docker не підтримує `--gpus`
   ```bash
   # Оновити Docker до версії з підтримкою GPU
   docker --version
   # Потрібна версія 19.03+
   ```

---

## 📝 Приклад оновленого docker-compose.yml

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
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
      - OLLAMA_GPU_LAYERS=35  # Для qwen3:8b
    restart: unless-stopped
    networks:
      - dagi-network

volumes:
  ollama-data:
    driver: local
```

---

## 🎯 Швидкий старт (одна команда)

```bash
# На НОДА1
cd /opt/microdao-daarion && \
docker compose stop ollama && \
# Оновити docker-compose.yml вручну, потім:
docker compose up -d ollama && \
sleep 5 && \
nvidia-smi && \
docker exec ollama ollama ps
```

---

**Last Updated:** 2025-01-27  
**Status:** 📋 Готово до виконання




