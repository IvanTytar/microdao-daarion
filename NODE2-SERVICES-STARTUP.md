# Node-2 Services Startup Guide

## 📍 Розташування сервісів на Node-2

### 1. DAGI Router (порт 9102) ✅

**Розташування:** Node-2 (MacBook Pro M4 Max)  
**URL:** `http://localhost:9102`  
**Конфігурація:** `~/github-projects/microdao-daarion/`

**Статус:** Потрібно запустити

---

## 🚀 Запуск DAGI Router на Node-2

### Варіант 1: Через Docker Compose (рекомендовано)

```bash
cd ~/github-projects/microdao-daarion
docker compose up -d router
```

### Варіант 2: Прямий запуск Python (для розробки)

```bash
cd ~/github-projects/microdao-daarion
python3 main.py
```

**Або з uvicorn:**
```bash
cd ~/github-projects/microdao-daarion
uvicorn main:app --host 0.0.0.0 --port 9102
```

### Перевірка статусу:

```bash
# Перевірити чи працює
curl http://localhost:9102/health

# Перевірити провайдерів
curl http://localhost:9102/v1/router/providers
```

---

## 🧠 Memory Stack Services (Docker)

**Розташування:** `~/node2/memory/`  
**Docker Compose:** `~/node2/memory/docker-compose.yml`

### Сервіси:
- **Qdrant** (Vector DB) - порт 6333
- **Milvus** (Long-range embeddings) - порт 19530
- **Neo4j** (Graph DB) - порти 7474, 7687

---

## 🐳 Запуск Memory Stack

### 1. Перевірити Docker Desktop

```bash
# Перевірити чи Docker працює
docker ps
```

**Якщо Docker не працює:**
- Відкрити Docker Desktop
- Дочекатися повного запуску

### 2. Запустити Memory Stack

```bash
cd ~/node2/memory
docker compose up -d
```

### 3. Перевірити статус

```bash
# Перевірити контейнери
docker compose ps

# Health checks
curl http://localhost:6333/healthz  # Qdrant
curl http://localhost:9091/healthz  # Milvus
curl http://localhost:7474          # Neo4j (web UI)
```

---

## 📋 Швидкий старт (все разом)

```bash
# 1. Запустити DAGI Router
cd ~/github-projects/microdao-daarion
docker compose up -d router

# 2. Запустити Memory Stack
cd ~/node2/memory
docker compose up -d

# 3. Перевірити все
echo "=== DAGI Router ==="
curl -s http://localhost:9102/health | python3 -m json.tool

echo "=== Memory Stack ==="
docker compose -f ~/node2/memory/docker-compose.yml ps
```

---

## ⚠️ Важливо

### DAGI Router:
- **Порт:** 9102
- **Node:** Node-2 (localhost)
- **Монітор очікує:** `http://localhost:9102/health`

### Memory Stack:
- **Потрібен Docker Desktop**
- **Порти:** 6333 (Qdrant), 19530 (Milvus), 7474/7687 (Neo4j)
- **Дані зберігаються в:** `~/node2/memory/data/`

---

## 🔍 Troubleshooting

### DAGI Router не запускається:

```bash
# Перевірити чи порт зайнятий
lsof -i :9102

# Перевірити логи
docker logs dagi-router
# або
tail -f ~/github-projects/microdao-daarion/logs/router.log
```

### Memory Stack не запускається:

```bash
# Перевірити Docker
docker ps

# Перевірити логи
cd ~/node2/memory
docker compose logs

# Перевірити порти
lsof -i :6333  # Qdrant
lsof -i :19530 # Milvus
lsof -i :7474  # Neo4j
```

---

**Status:** ✅ Ready to start  
**Date:** 2025-11-22

