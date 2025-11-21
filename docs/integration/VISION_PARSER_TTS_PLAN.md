# 🚀 План інтеграції: Vision, Parser, TTS та Grafana

**Дата**: 2025-11-18  
**Статус**: 📋 В плануванні

---

## ✅ Поточний стан

### Що вже працює:
- ✅ Голосові повідомлення (STT через Whisper)
- ✅ Фото detection (metadata → NATS)
- ✅ PDF detection (metadata → NATS)
- ✅ Prometheus metrics (Router + Gateway)
- ✅ 3 боти (DAARWIZZ, Helion, GREENFOOD)
- ✅ Helion 502 фікс (timeout 120s)

### Що не інтегровано:
- ⚠️ Vision Encoder (сервіс готовий, але не викликається)
- ⚠️ Parser Service для PDF (сервіс готовий, але не викликається)
- ⚠️ TTS для голосових відповідей
- ⚠️ Grafana дашборди (Grafana працює, дашборди порожні)

---

## 📋 План імплементації

### 1. **Vision Encoder Integration** 🖼️ (Пріоритет: 🔴 ВИСОКИЙ)

**Мета**: Бот може описувати що на фото.

**Кроки**:

#### 1.1. Оновити `router_handler.py`
Додати обробку `metadata.photo`:

```python
# В методі _handle_telegram_event():
if event.metadata and "photo" in event.metadata:
    photo_info = event.metadata["photo"]
    
    # Викликати Vision Encoder
    vision_result = await self._analyze_photo(
        photo_url=photo_info["file_url"],
        caption=event.text or ""
    )
    
    # Додати результат Vision до контексту для LLM
    enhanced_text = f"{event.text or ''}\n\n[VISION]: {vision_result}"
    event.text = enhanced_text
```

#### 1.2. Додати метод `_analyze_photo()`
```python
async def _analyze_photo(self, photo_url: str, caption: str) -> str:
    """Викликати Vision Encoder Service"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://dagi-vision-encoder:9500/analyze",  # TODO: перевірити endpoint
                json={
                    "image_url": photo_url,
                    "prompt": caption or "Опиши що на цьому зображенні"
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("description", "")
    except Exception as e:
        logger.error(f"❌ Vision Encoder error: {e}")
        return "[Не вдалося проаналізувати зображення]"
```

#### 1.3. Перевірити Vision Encoder сервіс
```bash
# Перевірити чи працює
docker ps | grep vision-encoder

# Перевірити API
curl -X POST http://localhost:9500/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/image.jpg", "prompt": "Describe this image"}'
```

**Файли для зміни**:
- `/opt/telegram-infrastructure/telegram-gateway/app/router_handler.py`

**Очікуваний результат**:
```
Ти → 🖼️ [Фото кота] + "Хто це?"
Бот → На зображенні зображений рудий кіт, який сидить на підвіконні і дивиться у вікно...
```

---

### 2. **Parser Service Integration** 📄 (Пріоритет: 🔴 ВИСОКИЙ)

**Мета**: Бот може читати PDF і відповідати на питання.

**Кроки**:

#### 2.1. Оновити `router_handler.py`
Додати обробку `metadata.document`:

```python
# В методі _handle_telegram_event():
if event.metadata and "document" in event.metadata:
    doc_info = event.metadata["document"]
    
    # Викликати Parser Service
    parsed_content = await self._parse_document(
        doc_url=doc_info["file_url"],
        file_name=doc_info["file_name"]
    )
    
    # Якщо є питання - відповісти на основі parsed_content
    if event.text and event.text != f"[DOCUMENT] {doc_info['file_name']}":
        # Додати parsed content до контексту
        enhanced_text = f"Користувач запитує про документ '{doc_info['file_name']}':\n{event.text}\n\n[DOCUMENT_CONTENT]:\n{parsed_content[:2000]}"
        event.text = enhanced_text
    else:
        # Просто парсинг без питання
        await telegram_listener.send_message(
            agent_id=event.agent_id,
            chat_id=event.chat_id,
            text=f"✅ Документ '{doc_info['file_name']}' оброблено.\n\nЗадай питання про нього!"
        )
        return
```

#### 2.2. Додати метод `_parse_document()`
```python
async def _parse_document(self, doc_url: str, file_name: str) -> str:
    """Викликати Parser Service для PDF"""
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            # Виклик DAGI Router з mode: "doc_parse"
            response = await client.post(
                f"{self._router_url}/route",
                json={
                    "mode": "doc_parse",
                    "agent": "parser",
                    "payload": {
                        "context": {
                            "doc_url": doc_url,
                            "file_name": file_name,
                            "output_mode": "markdown"  # або "chunks" для RAG
                        }
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            
            # Витягнути parsed content
            if "data" in result and "markdown" in result["data"]:
                return result["data"]["markdown"]
            return result.get("text", "")
            
    except Exception as e:
        logger.error(f"❌ Parser Service error: {e}")
        return "[Не вдалося прочитати документ]"
```

#### 2.3. Інтеграція з RAG (опційно)
Для збереження документів у RAG:
```python
# Після парсингу викликати RAG ingest
await client.post(
    f"{self._router_url}/route",
    json={
        "mode": "doc_parse",
        "agent": "parser",
        "payload": {
            "context": {
                "doc_url": doc_url,
                "file_name": file_name,
                "output_mode": "chunks",
                "ingest": True,
                "dao_id": event.agent_id,
                "user_id": event.user_id
            }
        }
    }
)
```

**Файли для зміни**:
- `/opt/telegram-infrastructure/telegram-gateway/app/router_handler.py`

**Очікуваний результат**:
```
Ти → 📄 whitepaper.pdf
Бот → ✅ Документ 'whitepaper.pdf' оброблено. Задай питання про нього!

Ти → "Про що цей документ?"
Бот → Це whitepaper проєкту MicroDAO, який описує...
```

---

### 3. **TTS Integration** 🔊 (Пріоритет: 🟡 СЕРЕДНІЙ)

**Мета**: Бот може відповідати голосом.

**Кроки**:

#### 3.1. Додати опцію для голосових відповідей
Користувач може вибрати режим відповіді (текст або голос).

**Варіант 1**: Команда `/voice` перемикає режим
```python
# Зберігати в Memory Service:
user_preferences = {
    "reply_mode": "voice"  # або "text"
}
```

**Варіант 2**: Реагувати голосом на голосові
```python
# Якщо користувач надіслав voice → відповісти voice
if message.voice or message.audio:
    reply_mode = "voice"
else:
    reply_mode = "text"
```

#### 3.2. Оновити `router_handler.py`
```python
async def _send_response(self, event, answer: str, reply_mode: str = "text"):
    if reply_mode == "voice":
        # Синтезувати голос через TTS
        audio_bytes = await self._text_to_speech(answer)
        
        # Відправити voice message через Telegram
        await telegram_listener.send_voice(
            agent_id=event.agent_id,
            chat_id=event.chat_id,
            audio_bytes=audio_bytes
        )
    else:
        # Звичайний текст
        await telegram_listener.send_message(
            agent_id=event.agent_id,
            chat_id=event.chat_id,
            text=answer
        )
```

#### 3.3. Додати метод `_text_to_speech()`
```python
async def _text_to_speech(self, text: str) -> bytes:
    """Викликати TTS Service"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://dagi-tts:9001/tts",  # TODO: перевірити endpoint
                json={
                    "text": text,
                    "voice": "ukrainian_female"  # або "english_male"
                }
            )
            response.raise_for_status()
            return response.content  # Audio bytes (OGG/MP3)
    except Exception as e:
        logger.error(f"❌ TTS error: {e}")
        return b""  # Fallback to text
```

#### 3.4. Додати `send_voice()` в `telegram_listener.py`
```python
async def send_voice(self, agent_id: str, chat_id: int, audio_bytes: bytes):
    """Відправити голосове повідомлення"""
    bot_token = bots_registry.get_token_by_agent(agent_id)
    bot = self._bots.get(bot_token)
    
    if not bot or not audio_bytes:
        # Fallback to text
        return
    
    from io import BytesIO
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "voice.ogg"
    
    await bot.send_voice(
        chat_id=chat_id,
        voice=audio_file
    )
```

**Файли для зміни**:
- `/opt/telegram-infrastructure/telegram-gateway/app/router_handler.py`
- `/opt/telegram-infrastructure/telegram-gateway/app/telegram_listener.py`

**Очікуваний результат**:
```
Ти → 🎤 [Голосове] "Привіт"
Бот → 🔊 [Голосове] "Привіт! Як справи?"
```

---

### 4. **Grafana Dashboards** 📊 (Пріоритет: 🟢 НИЗЬКИЙ)

**Мета**: Візуалізація метрик (запити, помилки, latency).

**Кроки**:

#### 4.1. Створити дашборд "DAARION Services Overview"
**Панелі**:
1. **Total Requests** (counter)
   - `rate(http_requests_total[5m])`
2. **Request Duration** (histogram)
   - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
3. **Error Rate** (%)
   - `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])`
4. **Active Bots** (gauge)
   - Custom metric: `telegram_gateway_active_bots`
5. **STT Requests** (counter)
   - `rate(http_requests_total{job="dagi-stt"}[5m])`
6. **Router Latency** (graph)
   - `http_request_duration_seconds{job="dagi-router"}`

#### 4.2. Створити файл дашборду
`/opt/microdao-daarion/monitoring/grafana/dashboards/daarion_overview.json`

```json
{
  "dashboard": {
    "title": "DAARION Services Overview",
    "panels": [
      {
        "title": "Total Requests/sec",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      // ... інші панелі
    ]
  }
}
```

#### 4.3. Імпортувати в Grafana
```bash
# Через UI: http://144.76.224.179:3000
# Login: admin / admin
# Dashboards → Import → Upload JSON
```

**Файли для створення**:
- `/opt/microdao-daarion/monitoring/grafana/dashboards/daarion_overview.json`
- `/opt/microdao-daarion/monitoring/grafana/dashboards/telegram_bots.json`

**Очікуваний результат**:
- Красиві графіки в Grafana
- Real-time моніторинг всіх сервісів

---

## 🗓️ Порядок імплементації

### Phase 1 (Сьогодні): Vision + Parser
1. ✅ Vision Encoder integration (~30 хв)
2. ✅ Parser Service integration (~30 хв)
3. ✅ Тестування фото + PDF

### Phase 2 (Завтра/Пізніше): TTS
1. ✅ TTS integration (~45 хв)
2. ✅ `send_voice()` в telegram_listener
3. ✅ Тестування голосових відповідей

### Phase 3 (Опційно): Grafana
1. ✅ Створення дашбордів (~1 год)
2. ✅ Налаштування alerts
3. ✅ Документація

---

## 📝 Зміни в файлах (Summary)

### Для Vision + Parser:
- `telegram-gateway/app/router_handler.py`: +100 рядків
  - `_analyze_photo()`
  - `_parse_document()`
  - Обробка `metadata.photo` та `metadata.document`

### Для TTS:
- `telegram-gateway/app/router_handler.py`: +50 рядків
  - `_text_to_speech()`
  - `_send_response()` з підтримкою voice
- `telegram-gateway/app/telegram_listener.py`: +20 рядків
  - `send_voice()`

### Для Grafana:
- `monitoring/grafana/dashboards/*.json`: 2 нові файли

---

## 🚀 Готовий почати?

**Рекомендую порядок**:
1. **Vision Encoder** (найпростіше, одразу побачиш результат)
2. **Parser Service** (корисно для документів)
3. **TTS** (якщо треба голосові відповіді)
4. **Grafana** (коли все працює)

**Який пункт імплементуємо першим?** 🖼️📄🔊📊

---

*Створено: 2025-11-18*  
*Автор: Assistant (via Cursor)*

