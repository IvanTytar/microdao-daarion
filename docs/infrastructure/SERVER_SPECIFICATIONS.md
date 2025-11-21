# 🖥️ Характеристики сервера DAARION

**Дата**: 2025-11-18  
**Сервер**: 144.76.224.179  
**Статус**: ✅ Production Ready

---

## 💻 Hardware Specifications

### **CPU**
- **Модель**: Intel Core i5-13500 (13th Gen)
- **Архітектура**: x86_64
- **Ядра**: 14 cores (20 threads)
- **Базова частота**: 2.4 GHz
- **Максимальна частота**: 4.8 GHz
- **Потужність**: Відмінна для AI workloads

### **GPU** 🎯
- **Модель**: **NVIDIA RTX 4000 SFF Ada**
- **VRAM**: **20,475 MB (20 GB)**
- **Driver Version**: 535.274.02
- **CUDA Version**: 12.2
- **Статус**: ✅ Працює (використовується Python процесом - 1916 MB)
- **Потужність**: Відмінна для локальних Vision моделей (LLaVA, BLIP-2)

**Поточне використання**:
- GPU Memory: 1922 MB / 20475 MB (9%)
- GPU Utilization: 0% (idle)
- Temperature: 46°C
- Power: 11W / 70W

### **RAM**
- **Загальна**: 62 GB
- **Використовується**: 8.3 GB
- **Доступно**: 54 GB
- **Swap**: 31 GB (3 GB використовується)
- **Статус**: ✅ Більш ніж достатньо для всіх сервісів

### **Storage**
- **Диск**: RAID (md2)
- **Розмір**: 1.7 TB
- **Використано**: 118 GB (8%)
- **Доступно**: 1.5 TB
- **Статус**: ✅ Багато місця для моделей

---

## 🐳 Docker Infrastructure

### **Всього контейнерів**: 35
- **Працюють**: 28
- **Зупинені**: 7

### **Основні сервіси**:

#### DAARION Stack:
- ✅ `dagi-router` - DAGI Router (multi-provider)
- ✅ `dagi-gateway` - API Gateway
- ✅ `dagi-rbac` - RBAC сервіс
- ✅ `dagi-devtools` - DevTools
- ✅ `dagi-crewai` - CrewAI orchestrator
- ✅ `dagi-vision-encoder` - Vision embeddings
- ✅ `dagi-parser` - Parser Service (DotsOCR + Crawl4AI)
- ✅ `dagi-stt` - STT (Whisper)
- ✅ `dagi-tts` - TTS (gTTS)
- ✅ `dagi-qdrant` - Qdrant vector DB
- ✅ `dagi-postgres` - PostgreSQL
- ✅ `telegram-gateway` - Telegram Gateway
- ✅ `telegram-bot-api` - Local Telegram Bot API
- ✅ `nats` - NATS message broker

#### Monitoring:
- ✅ `dagi-prometheus` - Prometheus
- ✅ `dagi-grafana` - Grafana

#### Graph & Vector DBs:
- ✅ `neo4j` - Neo4j graph database
- ✅ `docker-weaviate-1` - Weaviate (частина Dify)

#### Dify Platform (не використовується в основному стеку):
- ✅ `docker-api-1` - Dify API
- ✅ `docker-web-1` - Dify Web UI
- ✅ `docker-worker-1` - Dify Workers
- ✅ + інші Dify компоненти

---

## 🤖 AI Models & Providers

### **Локальні моделі (Ollama)**:
- ✅ **qwen3:8b** (5.2 GB)
  - Використання: DAARWIZZ, Helion, GREENFOOD
  - Provider: `llm_local_qwen3_8b`
  - Base URL: `http://172.17.0.1:11434`

### **Cloud API моделі**:
- ✅ **DeepSeek** (через API)
  - Provider: `cloud_deepseek`
  - Base URL: `https://api.deepseek.com`
  - Model: `deepseek-chat`
  - API Key: Потрібен (перевірити в env)
  - Використання: Складні аналітичні задачі

---

## 🔧 Інтегровані інструменти

### **1. Crawl4AI** ✅
- **Статус**: Інтегровано в Parser Service
- **Файл**: `services/parser-service/app/crawler/crawl4ai_service.py`
- **Функції**:
  - Web crawling (HTML, JavaScript rendering)
  - Document download (PDF, images)
  - Content extraction (markdown, text)
- **Playwright**: Опціонально (для JS rendering)
- **Endpoint**: `/ocr/parse` з `doc_url` параметром

### **2. DotsOCR** ✅
- **Статус**: Працює в Parser Service
- **Директорія**: `/opt/dots.ocr/`
- **Модель**: DeepSeek V3 (в transformers)
- **Функції**:
  - OCR для PDF/images
  - Text extraction
  - Q&A pairs generation
  - Markdown conversion

### **3. CrewAI** ✅
- **Статус**: Працює (`dagi-crewai:9102`)
- **Функції**:
  - Multi-agent orchestration
  - Web search tools (Firecrawl)
  - Workflow management
- **Інтеграція**: Через DAGI Router

---

## 🌐 Network & Ports

### **Основні порти**:
- `9102` - DAGI Router
- `8000` - Telegram Gateway
- `8081` - Telegram Bot API (local)
- `9400` - Parser Service
- `9000` - STT Service
- `9100` - TTS Service
- `8001` - Vision Encoder
- `7474` - Neo4j HTTP
- `7687` - Neo4j Bolt
- `3000` - Grafana
- `9090` - Prometheus
- `11434` - Ollama (host)

---

## 📊 Performance Metrics

### **CPU Usage**: ~77% scaling (idle)
### **RAM Usage**: 8.3 GB / 62 GB (13%)
### **GPU Usage**: 1922 MB / 20475 MB (9%)
### **Disk Usage**: 118 GB / 1.7 TB (8%)

**Висновок**: Сервер має відмінні ресурси для масштабування! 🚀

---

## 🎯 Рекомендації

### **Для Vision AI**:
✅ **GPU готовий!** Можна завантажити:
- LLaVA:7b (~7 GB) - швидко на GPU
- LLaVA:13b (~13 GB) - краща якість
- BLIP-2 (~1-2 GB) - легший варіант

### **Для DeepSeek**:
- Перевірити чи є API key
- Якщо є - використовувати для складних задач
- Якщо немає - можна додати

### **Для Crawl4AI**:
- ✅ Вже інтегровано!
- Можна використовувати для web search через Parser Service

---

## 📝 Примітки

1. **Dify Platform** - працює, але НЕ використовується в основному стеку
2. **Milvus** - зупинено (є Qdrant і Weaviate)
3. **RAG Service** - зупинено (Haystack issues, є Dify RAG)
4. **Memory Service** - зупинено (pgvector issue, не критично)

---

## ✅ Готовність до production

| Компонент | Статус | Готовність |
|-----------|--------|-----------|
| **Hardware** | ✅ Відмінний | 🟢 Production Ready |
| **GPU** | ✅ RTX 4000 Ada | 🟢 Ready for Vision |
| **RAM** | ✅ 62 GB | 🟢 Більш ніж достатньо |
| **Storage** | ✅ 1.7 TB | 🟢 Багато місця |
| **DAGI Router** | ✅ Працює | 🟢 Production |
| **Crawl4AI** | ✅ Інтегровано | 🟢 Ready |
| **DeepSeek** | ⚠️ Потрібен API key | 🟡 Check needed |
| **CrewAI** | ✅ Працює | 🟢 Ready |

---

**Висновок**: Сервер має ВІДМІННІ характеристики і готовий до всіх задач! 🎉

*Створено: 2025-11-18*  
*Оновлено: після детального аудиту*

