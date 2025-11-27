# 📋 Інструкція: Налаштування Swapper Service на Node #1

**Дата:** 2025-11-22  
**Мета:** Налаштувати Swapper Service на Node #1 для відображення моделей в моніторі

---

## 🔍 Поточний стан

- ✅ Swapper Service працює (`/health` повертає `healthy`)
- ✅ Endpoint `/status` доступний
- ✅ Endpoint `/models` доступний
- ❌ Моделі не налаштовані (порожній список: `{"object":"list","data":[]}`)

---

## 📝 Крок 1: Підключитися до Node #1

```bash
# SSH підключення до Node #1
ssh root@144.76.224.179
# або через ваш SSH ключ
```

---

## 📝 Крок 2: Перевірити конфігурацію Swapper Service

### 2.1 Знайти конфігураційний файл

```bash
# Перевірити де знаходиться Swapper Service
docker ps | grep swapper

# Знайти конфігураційний файл
find / -name "swapper_config.yaml" 2>/dev/null
# або
find /opt /var /home -name "swapper_config.yaml" 2>/dev/null
```

### 2.2 Перевірити поточну конфігурацію

```bash
# Якщо знайдено файл, переглянути його
cat /path/to/swapper-service/config/swapper_config.yaml
```

**Очікуваний формат:**
```yaml
mode: single-active
max_concurrent_models: 1
model_swap_timeout: 300
gpu_acceleration: true
metal_acceleration: false

models:
  qwen3:8b:
    path: ollama:qwen3:8b
    type: llm
    size_gb: 4.7
    priority: high
  vision-8b:
    path: ollama:qwen3-vl:8b
    type: vision
    size_gb: 8.2
    priority: high
```

---

## 📝 Крок 3: Перевірити Ollama на Node #1

### 3.1 Перевірити чи працює Ollama

```bash
# Перевірити чи працює Ollama
curl http://localhost:11434/api/tags

# Або через Docker
docker exec ollama ollama list
```

### 3.2 Якщо Ollama працює, перевірити доступні моделі

```bash
# Список моделей в Ollama
curl http://localhost:11434/api/tags | jq '.models[].name'

# Приклад виводу:
# "qwen3:8b"
# "qwen3-vl:8b"
```

---

## 📝 Крок 4: Налаштувати моделі

### Варіант A: Якщо є конфігураційний файл

1. **Відредагувати конфігурацію:**

```bash
# Відкрити файл для редагування
nano /path/to/swapper-service/config/swapper_config.yaml
# або
vi /path/to/swapper-service/config/swapper_config.yaml
```

2. **Додати моделі до конфігурації:**

```yaml
models:
  qwen3:8b:
    path: ollama:qwen3:8b
    type: llm
    size_gb: 4.7
    priority: high
  vision-8b:
    path: ollama:qwen3-vl:8b
    type: vision
    size_gb: 8.2
    priority: high
```

3. **Зберегти файл**

### Варіант B: Якщо конфігураційного файлу немає

1. **Створити конфігураційний файл:**

```bash
# Створити директорію для конфігурації
mkdir -p /opt/swapper-service/config

# Створити файл конфігурації
cat > /opt/swapper-service/config/swapper_config.yaml << 'EOF'
mode: single-active
max_concurrent_models: 1
model_swap_timeout: 300
gpu_acceleration: true
metal_acceleration: false

models:
  qwen3:8b:
    path: ollama:qwen3:8b
    type: llm
    size_gb: 4.7
    priority: high
  vision-8b:
    path: ollama:qwen3-vl:8b
    type: vision
    size_gb: 8.2
    priority: high
EOF
```

2. **Переконатися, що файл доступний для Swapper Service**

### Варіант C: Автоматичне завантаження з Ollama

Якщо Swapper Service налаштований на автоматичне завантаження моделей з Ollama:

1. **Переконатися, що Ollama працює**
2. **Перезапустити Swapper Service** - він автоматично завантажить моделі

---

## 📝 Крок 5: Перезапустити Swapper Service

### 5.1 Перезапустити через Docker Compose

```bash
# Знайти docker-compose.yml
find / -name "docker-compose.yml" -path "*/swapper*" 2>/dev/null

# Перезапустити Swapper Service
docker-compose restart swapper-service
# або
docker restart swapper-service
```

### 5.2 Перевірити логи

```bash
# Перевірити логи Swapper Service
docker logs swapper-service --tail 50

# Перевірити чи моделі завантажені
docker logs swapper-service | grep -i "model\|initialized"
```

---

## 📝 Крок 6: Перевірити результат

### 6.1 Перевірити через API

```bash
# Перевірити статус
curl http://localhost:8890/status

# Перевірити моделі
curl http://localhost:8890/models

# Перевірити health
curl http://localhost:8890/health
```

### 6.2 Очікуваний результат

**`/models` має повертати:**
```json
{
  "models": [
    {
      "name": "qwen3:8b",
      "ollama_name": "qwen3:8b",
      "type": "llm",
      "size_gb": 4.7,
      "priority": "high",
      "status": "unloaded"
    },
    {
      "name": "vision-8b",
      "ollama_name": "qwen3-vl:8b",
      "type": "vision",
      "size_gb": 8.2,
      "priority": "high",
      "status": "unloaded"
    }
  ]
}
```

### 6.3 Перевірити в моніторі

Відкрити в браузері:
```
http://localhost:8899/node/node-1
```

**Очікуваний результат:**
- ✅ Swapper Service Connections відображається
- ✅ Список моделей показується
- ✅ Активна модель (якщо є) підсвічена зеленим
- ✅ Детальна інформація про кожну модель

---

## 🔧 Додаткові налаштування

### Налаштування через змінні оточення

Якщо Swapper Service використовує змінні оточення:

```bash
# Перевірити змінні оточення
docker inspect swapper-service | grep -A 20 "Env"

# Встановити змінні оточення в docker-compose.yml
environment:
  - SWAPPER_CONFIG_PATH=/app/config/swapper_config.yaml
  - OLLAMA_BASE_URL=http://ollama:11434
  - SWAPPER_MODE=single-active
```

### Монтування конфігурації

Якщо конфігурація монтується як volume:

```yaml
volumes:
  - ./config/swapper_config.yaml:/app/config/swapper_config.yaml:ro
```

---

## ❓ Troubleshooting

### Проблема: Моделі все ще не відображаються

1. **Перевірити логи:**
   ```bash
   docker logs swapper-service --tail 100
   ```

2. **Перевірити чи Ollama доступний:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **Перевірити конфігурацію:**
   ```bash
   docker exec swapper-service cat /app/config/swapper_config.yaml
   ```

### Проблема: Swapper Service не може підключитися до Ollama

1. **Перевірити мережеві налаштування:**
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

2. **Перевірити URL Ollama в конфігурації:**
   ```yaml
   OLLAMA_BASE_URL: http://ollama:11434
   # або
   OLLAMA_BASE_URL: http://localhost:11434
   ```

---

## ✅ Чеклист

- [ ] Підключено до Node #1
- [ ] Знайдено конфігураційний файл Swapper Service
- [ ] Перевірено чи працює Ollama
- [ ] Додано моделі до конфігурації
- [ ] Перезапущено Swapper Service
- [ ] Перевірено логи Swapper Service
- [ ] Перевірено через API (`/models` повертає моделі)
- [ ] Перевірено в моніторі (моделі відображаються)

---

## 📞 Контакти

Якщо виникли проблеми:
1. Перевірте логи Swapper Service
2. Перевірте чи працює Ollama
3. Перевірте конфігурацію

---

**Last Updated:** 2025-11-22  
**Status:** ✅ Готово до використання

