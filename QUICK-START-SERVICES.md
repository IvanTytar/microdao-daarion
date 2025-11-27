# 🚀 Швидкий запуск сервісів

## ✅ Поточний статус

- ✅ **Frontend:** Працює на http://localhost:8899
- ⚠️ **Monitor Agent Service:** Потрібно запустити (порт 9500)
- ⚠️ **Memory Service:** Потрібно запустити (порт 8000)

## 🚀 Запуск Monitor Agent Service

```bash
cd services/monitor-agent-service

# Створити venv (якщо ще не створено)
python3 -m venv venv
source venv/bin/activate  # На macOS/Linux

# Встановити залежності
pip install -r requirements.txt

# Налаштувати environment variables
export OLLAMA_BASE_URL=http://192.168.1.244:11434
export MISTRAL_MODEL=mistral:7b
export MEMORY_SERVICE_URL=http://localhost:8000

# Запустити сервіс
python -m uvicorn app.main:app --host 0.0.0.0 --port 9500 --reload
```

## 🚀 Запуск Memory Service

```bash
# Через Docker Compose (рекомендовано)
docker-compose up -d memory-service postgres

# Або напряму
cd services/memory-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## ✅ Перевірка

```bash
# Monitor Agent Service
curl http://localhost:9500/health

# Memory Service
curl http://localhost:8000/health

# Frontend
curl http://localhost:8899
```

## 📊 Після запуску

Коли всі сервіси запущені:
- ✅ MonitorChat працює з реальними відповідями
- ✅ Події зберігаються в пам'ять
- ✅ Monitor Agent може відповідати на питання про метрики та історію

