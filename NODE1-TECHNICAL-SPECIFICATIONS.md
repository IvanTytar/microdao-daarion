# 🖥️ Технічні характеристики НОДА1

**Сервер:** `root@144.76.224.179:22`  
**Provider:** Hetzner Dedicated Server GEX44  
**Server ID:** #2844465  
**Дата:** 2025-11-23  
**Статус:** ✅ Production Ready

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
- **Модель**: **NVIDIA RTX 4000 SFF Ada Generation**
- **VRAM**: **20,475 MB (20 GB GDDR6)**
- **Архітектура**: Ada Lovelace
- **Driver Version**: 535.274.02
- **CUDA Version**: 12.2
- **Статус**: ✅ Працює (використовується Python процесом)
- **Потужність**: Відмінна для локальних Vision моделей (LLaVA, BLIP-2)

**Поточне використання** (з документації):
- GPU Memory: 1922 MB / 20475 MB (9%)
- GPU Utilization: 0% (idle)
- Temperature: 46°C
- Power: 11W / 70W (max)

**Використання VRAM**:
- Ollama (qwen3:8b): ~5.6 GB
- Vision Encoder (ViT-L/14): ~1.9 GB
- **Total**: ~7.5 GB / 20 GB (37.5% usage)

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

### **Всього контейнерів**: 22
- **Працюють (Healthy)**: 13
- **Працюють (без health check)**: 4
- **Проблемні**: 5

### **Основні сервіси**:

#### DAARION Stack:
- ✅ `dagi-router` - DAGI Router (multi-provider)
- ✅ `dagi-gateway` - API Gateway
- ✅ `dagi-rbac` - RBAC сервіс
- ✅ `dagi-devtools` - DevTools
- ✅ `dagi-crewai` - CrewAI orchestrator
- ✅ `dagi-vision-encoder` - Vision embeddings (GPU-accelerated)
- ✅ `dagi-parser` - Parser Service (DotsOCR + Crawl4AI)

---

## 🤖 AI Models & Services

### **Ollama Models** (встановлено):
1. **qwen3:8b** - 5.2 GB (Primary LLM)
2. **qwen3-vl:8b** - 6.1 GB (Vision-language)
3. **qwen2-math:7b** - 4.4 GB (Mathematical)
4. **qwen2.5:3b-instruct-q4_K_M** - 1.9 GB
5. **qwen2.5:7b-instruct-q4_K_M** - 4.7 GB

**Total**: ~22.3 GB моделей

### **Vision Models**:
- **ViT-L/14** (Vision Encoder) - ~4 GB VRAM
- **OpenAI CLIP** - Pretrained weights

---

## 📊 GPU Metrics

### Поточний стан:
- **Використання**: 0% (idle)
- **VRAM використано**: 1922 MB / 20475 MB (9%)
- **Температура**: 46°C
- **Потужність**: 11W / 70W

### Використання VRAM:
- Ollama: ~5.6 GB
- Vision Encoder: ~1.9 GB
- **Загалом**: ~7.5 GB / 20 GB (37.5%)

---

## 🔧 System Information

### **OS**
- **OS**: Ubuntu 24.04.3 LTS (Noble Numbat)
- **Kernel**: Linux
- **Docker**: Installed & Active
- **Python**: 3.12.3
- **Orchestrator**: Docker Compose

---

## 📝 Документація

**Джерела:**
- `docs/infrastructure/SERVER_SPECIFICATIONS.md`
- `SYSTEM-INVENTORY.md`
- `/tmp/NODE1_COMPLETE_INVENTORY.md`

---

**НОДА1 має потужну GPU (NVIDIA RTX 4000 SFF Ada) для AI workloads!** 🎉

