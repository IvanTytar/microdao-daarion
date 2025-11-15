# Ollama Performance Optimization

## Проблема
Qwen3:8b генерує відповідь 25-30 секунд, що занадто повільно для чат-бота.

## Швидкі рішення

### 1. Збільшити timeout (✅ зроблено)
```python
# providers/llm_provider.py
timeout_s: int = 60  # було 30
```

### 2. Keep model loaded (рекомендовано)
```bash
# Встановити keep_alive щоб модель не вивантажувалась
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3:8b",
  "prompt": "warmup",
  "keep_alive": "24h"
}'
```

Або в systemd override:
```ini
[Service]
Environment="OLLAMA_KEEP_ALIVE=24h"
```

### 3. Використати легшу модель
```bash
# Завантажити qwen2.5:3b (швидша, але менш "розумна")
ollama pull qwen2.5:3b
```

Оновити `router-config.yml`:
```yaml
llm_profiles:
  - profile_id: "local_qwen_fast"
    provider_id: "llm_local_qwen"
    model: "qwen2.5:3b"  # замість qwen3:8b
```

### 4. GPU acceleration (якщо є GPU)
Ollama автоматично використовує GPU якщо є CUDA/ROCm.

Перевірка:
```bash
ollama ps  # покаже чи використовує GPU
nvidia-smi  # для NVIDIA GPU
```

## Довгострокові рішення

### Option A: Віддалений LLM (швидко, але платно)
```yaml
llm_profiles:
  - profile_id: "production_fast"
    provider_id: "openai_remote"
    model: "gpt-4o-mini"
    base_url: "https://api.openai.com/v1"
    api_key_env: "OPENAI_API_KEY"
```

### Option B: Більш потужний сервер
- CPU: 8+ cores
- RAM: 32GB+ (для 8B моделі)
- GPU: RTX 3060+ (12GB VRAM)

## Моніторинг

```bash
# Час генерації
docker compose logs router | grep "Request timeout"

# Завантаженість Ollama
curl http://localhost:11434/api/ps

# Системні ресурси
htop
```

## Рекомендації для DAARWIZZ

1. ✅ **Зараз**: timeout 60s, працює але повільно
2. 🔄 **Наступний крок**: `OLLAMA_KEEP_ALIVE=24h` щоб модель не вивантажувалась
3. 🚀 **Production**: віддалений LLM (OpenAI/Anthropic) або потужніший сервер з GPU

---

**Статус**: DAARWIZZ працює, але відповідає за ~30-40 секунд. Для комфорту потрібно <5 секунд.
