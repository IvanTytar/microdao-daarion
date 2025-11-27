# ⚙️ Налаштування Swapper Service на Node #1

**Дата:** 2025-11-22  
**Мета:** Налаштувати Swapper Service з доступними моделями Ollama на Node #1

---

## 🔍 Виявлені моделі на Node #1

На Node #1 в Ollama доступні такі моделі:

1. **qwen2.5:7b-instruct-q4_K_M** - 4.36 GB
   - Тип: LLM (General Purpose)
   - Пріоритет: High
   - Призначення: Основна модель для загальних завдань

2. **qwen2.5:3b-instruct-q4_K_M** - 1.80 GB
   - Тип: LLM (Lightweight)
   - Пріоритет: Medium
   - Призначення: Швидкі відповіді, менше ресурсів

3. **qwen2-math:7b** - 4.13 GB
   - Тип: Math Specialist
   - Пріоритет: High
   - Призначення: Математичні завдання

---

## 📝 Крок 1: Підключитися до Node #1

```bash
ssh root@144.76.224.179
```

---

## 📝 Крок 2: Знайти директорію Swapper Service

```bash
# Знайти де знаходиться Swapper Service
docker ps | grep swapper

# Знайти конфігураційну директорію
find /opt /var /home -name "swapper*" -type d 2>/dev/null
# або
docker inspect swapper-service | grep -A 10 "Mounts"
```

---

## 📝 Крок 3: Створити конфігураційний файл

### Варіант A: Якщо конфігурація монтується як volume

```bash
# Знайти шлях до конфігурації
docker inspect swapper-service | grep -A 5 "Mounts"

# Створити файл конфігурації
cat > /path/to/swapper-config/swapper_config.yaml << 'EOF'
# Swapper Configuration for Node #1 (Production Server)
# Single-active LLM scheduler
# Hetzner GEX44 - NVIDIA RTX 4000 SFF Ada (20GB VRAM)

swapper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 300
  gpu_enabled: true
  metal_acceleration: false  # NVIDIA GPU, not Apple Silicon

models:
  # Primary LLM - Qwen2.5 7B Instruct (High Priority)
  qwen2.5-7b-instruct:
    path: ollama:qwen2.5:7b-instruct-q4_K_M
    type: llm
    size_gb: 4.36
    priority: high
    description: "Primary LLM for general tasks and conversations"
    
  # Lightweight LLM - Qwen2.5 3B Instruct (Medium Priority)
  qwen2.5-3b-instruct:
    path: ollama:qwen2.5:3b-instruct-q4_K_M
    type: llm
    size_gb: 1.80
    priority: medium
    description: "Lightweight LLM for faster responses"
    
  # Math Specialist - Qwen2 Math 7B (High Priority)
  qwen2-math-7b:
    path: ollama:qwen2-math:7b
    type: math
    size_gb: 4.13
    priority: high
    description: "Specialized model for mathematical tasks"

storage:
  models_dir: /app/models
  cache_dir: /app/cache
  swap_dir: /app/swap

ollama:
  url: http://ollama:11434  # From Docker container to Ollama service
  timeout: 300
EOF
```

### Варіант B: Якщо конфігурація всередині контейнера

```bash
# Скопіювати файл в контейнер
docker cp swapper_config_node1.yaml swapper-service:/app/config/swapper_config.yaml

# Або створити файл всередині контейнера
docker exec -it swapper-service sh
cat > /app/config/swapper_config.yaml << 'EOF'
# ... (вставити вміст з вище)
EOF
exit
```

### Варіант C: Через docker-compose.yml

Якщо використовується docker-compose, додати volume:

```yaml
services:
  swapper-service:
    volumes:
      - ./services/swapper-service/config/swapper_config.yaml:/app/config/swapper_config.yaml:ro
    environment:
      - SWAPPER_CONFIG_PATH=/app/config/swapper_config.yaml
      - OLLAMA_BASE_URL=http://ollama:11434
```

---

## 📝 Крок 4: Перезапустити Swapper Service

```bash
# Перезапустити через docker-compose
docker-compose restart swapper-service

# Або через Docker
docker restart swapper-service

# Перевірити логи
docker logs swapper-service --tail 50 -f
```

**Очікуваний вивід в логах:**
```
✅ Swapper Service initialized with 3 models
✅ Loaded qwen2.5-7b-instruct
✅ Loaded qwen2.5-3b-instruct
✅ Loaded qwen2-math-7b
```

---

## 📝 Крок 5: Перевірити результат

### 5.1 Перевірити через API

```bash
# Перевірити статус
curl http://localhost:8890/status

# Перевірити моделі
curl http://localhost:8890/models

# Перевірити health
curl http://localhost:8890/health
```

### 5.2 Очікуваний результат `/models`:

```json
{
  "models": [
    {
      "name": "qwen2.5-7b-instruct",
      "ollama_name": "qwen2.5:7b-instruct-q4_K_M",
      "type": "llm",
      "size_gb": 4.36,
      "priority": "high",
      "status": "unloaded"
    },
    {
      "name": "qwen2.5-3b-instruct",
      "ollama_name": "qwen2.5:3b-instruct-q4_K_M",
      "type": "llm",
      "size_gb": 1.80,
      "priority": "medium",
      "status": "unloaded"
    },
    {
      "name": "qwen2-math-7b",
      "ollama_name": "qwen2-math:7b",
      "type": "math",
      "size_gb": 4.13,
      "priority": "high",
      "status": "unloaded"
    }
  ]
}
```

### 5.3 Перевірити в моніторі

Відкрити в браузері:
```
http://localhost:8899/node/node-1
```

**Очікуваний результат:**
- ✅ Swapper Service Connections відображається
- ✅ Список з 3 моделей
- ✅ Детальна інформація про кожну модель
- ✅ Активна модель (якщо завантажена) підсвічена зеленим

---

## 🔧 Troubleshooting

### Проблема: Моделі все ще не відображаються

1. **Перевірити чи Ollama доступний з контейнера:**
   ```bash
   docker exec swapper-service curl http://ollama:11434/api/tags
   # або
   docker exec swapper-service curl http://localhost:11434/api/tags
   ```

2. **Перевірити змінні оточення:**
   ```bash
   docker exec swapper-service env | grep -i ollama
   docker exec swapper-service env | grep -i swapper
   ```

3. **Перевірити конфігурацію всередині контейнера:**
   ```bash
   docker exec swapper-service cat /app/config/swapper_config.yaml
   ```

### Проблема: Swapper не може підключитися до Ollama

1. **Перевірити мережеві налаштування:**
   ```bash
   docker network ls
   docker network inspect dagi-network  # або назва вашої мережі
   ```

2. **Перевірити чи Ollama працює:**
   ```bash
   docker ps | grep ollama
   curl http://localhost:11434/api/tags
   ```

3. **Змінити URL Ollama в конфігурації:**
   ```yaml
   ollama:
     url: http://localhost:11434  # Якщо Ollama на хості
     # або
     url: http://ollama:11434     # Якщо Ollama в Docker мережі
   ```

---

## ✅ Чеклист

- [ ] Підключено до Node #1
- [ ] Знайдено директорію Swapper Service
- [ ] Створено конфігураційний файл з 3 моделями
- [ ] Перезапущено Swapper Service
- [ ] Перевірено логи (3 моделі завантажені)
- [ ] Перевірено через API (`/models` повертає 3 моделі)
- [ ] Перевірено в моніторі (моделі відображаються)

---

## 📊 Очікуваний результат

Після налаштування:

- ✅ **3 моделі** доступні в Swapper Service
- ✅ **qwen2.5-7b-instruct** (High Priority) - основна модель
- ✅ **qwen2.5-3b-instruct** (Medium Priority) - легка модель
- ✅ **qwen2-math-7b** (High Priority) - математична модель
- ✅ Монітор показує всі моделі з детальною інформацією
- ✅ Активна модель підсвічена зеленим

---

**Last Updated:** 2025-11-22  
**Status:** ✅ Готово до використання  
**Config File:** `services/swapper-service/config/swapper_config_node1.yaml`

