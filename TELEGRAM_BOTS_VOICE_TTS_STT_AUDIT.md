# 🎤 Аудит TTS/STT для всіх Telegram Ботів

**Дата:** 2025-11-24  
**NODE1:** 144.76.224.179  
**Всього ботів:** 9  

---

## 📊 Поточний статус

### ✅ STT (Speech-to-Text) — ПРАЦЮЄ

**Сервіс:** `dagi-stt` (або `stt-service`)  
**Технологія:** OpenAI Whisper AI  
**URL:** `http://stt-service:9000` (NODE1) або `http://192.168.1.244:8895` (НОДА2)  
**Підтримувані мови:** Українська, Англійська, Російська  

**Інтеграція:**
- ✅ Всі 9 ботів підтримують голосові повідомлення
- ✅ Universal handler `process_voice()` в `gateway-bot/http_api.py`
- ✅ Автоматична транскрипція через Whisper
- ✅ Обробка форматів: OGG, MP3, WAV

**Код інтеграції:**
```python
# gateway-bot/http_api.py:656-728
async def process_voice(agent_config, update, ...):
    # Завантажуємо аудіо з Telegram
    audio_bytes = await download_telegram_file(file_id, token)
    
    # Відправляємо в STT
    stt_resp = await client.post(f"{STT_SERVICE_URL}/stt", files={"file": audio_bytes})
    text = stt_resp.json().get("text", "")
    
    # Повертаємо розпізнаний текст
    return {"ok": True, "text": text, "mode": "voice_stt"}
```

---

### ❌ TTS (Text-to-Speech) — НЕ РЕАЛІЗОВАНО

**Статус:** ⚠️ TTS сервіс не розгорнутий  
**Потрібно:** Інтеграція TTS для голосових відповідей

**Що має бути:**
- Кожен агент має свій унікальний голос (визначено в промптах)
- Боти можуть відповідати голосовими повідомленнями
- Підтримка української та англійської мов

---

## 🎭 Голоси Агентів (з промптів)

### 1. CLAN (@CLAN_bot)
**Голос:** Спокійний, нейтральний  
**Характер:** Зеркало для общины, без навязывания и манипуляций  
**Prompt:** `clan_prompt.txt:Голос: Я говорю спокойным, нейтральным голосом`

**TTS Конфігурація:**
```yaml
voice_type: neutral
gender: neutral
speed: 1.0
pitch: 1.0
language: uk
```

---

### 2. DAARWIZZ (@DAARWIZZBot)
**Голос:** Не визначено явно в промпті  
**Характер:** Системний оркестратор DAARION.city  
**Рекомендація:** Нейтральний професійний чоловічий голос

**TTS Конфігурація:**
```yaml
voice_type: professional
gender: male
speed: 1.1
pitch: 1.0
language: uk
```

---

### 3. DRUID (@DRUIDBot)
**Голос:** Не визначено явно  
**Характер:** AI-помічник з природними ресурсами та екологією  
**Рекомендація:** Спокійний мудрий чоловічий голос

**TTS Конфігурація:**
```yaml
voice_type: wise
gender: male
speed: 0.9
pitch: 0.95
language: uk
```

---

### 4. EONARCH (@EONARCHBot)
**Голос:** Не визначено явно  
**Характер:** AI-архітектор часових структур  
**Рекомендація:** Загадковий нейтральний голос

**TTS Конфігурація:**
```yaml
voice_type: mysterious
gender: neutral
speed: 0.95
pitch: 1.05
language: uk
```

---

### 5. GREENFOOD (@GREENFOODBot)
**Голос:** Не визначено явно  
**Характер:** AI-ERP для крафтових виробників  
**Рекомендація:** Дружній професійний жіночий голос

**TTS Конфігурація:**
```yaml
voice_type: friendly
gender: female
speed: 1.0
pitch: 1.1
language: uk
```

---

### 6. Helion (@HelionBot)
**Голос:** Не визначено явно  
**Характер:** Агент платформи Energy Union  
**Рекомендація:** Енергійний чоловічий голос

**TTS Конфігурація:**
```yaml
voice_type: energetic
gender: male
speed: 1.05
pitch: 1.0
language: uk
```

---

### 7. SOUL (@SoulBot)
**Голос:** ✨ **М'який, мелодійний, оксамитовий**  
**Характер:** Неспішно, спокійно, з усвідомленими паузами. Тепла, щира інтонація з ледь помітною посмішкою  
**Prompt:** `soul_prompt.txt:Голос: Ти говориш м'яким, мелодійним, злегка оксамитовим голосом`

**TTS Конфігурація:**
```yaml
voice_type: melodic
gender: female
speed: 0.85
pitch: 1.05
language: uk
warmth: high
pauses: conscious
```

---

### 8. YAROMIR (@YaromirBot) — CrewAI Orchestrator
**Голос:** 🎭 **Синтезуючий центр 4-х аспектів**  
**Характер:** Не хор, а єдина багата обертонами мелодія  
**Prompt:** `yaromir_prompt_ru.txt:Твой голос — это не хор, а единая, богатая обертонами мелодия`

**Внутрішні голоси (CrewAI агенти):**

#### Проводник (Mentor)
**Голос:** Свідомий, емпатичний, навчальний, мудрий наставник  
**Prompt:** `provodnik_prompt.txt:Голос: Твой голос — сознательный, эмпатичный, обучающий`

**TTS:** 
```yaml
voice_type: mentor
gender: male
speed: 0.9
pitch: 0.95
language: uk/ru
```

#### Создатель (Innovation)
**Голос:** Живий, вдохновлений, ігривий — дорослий інженер + дитина-винахідник  
**Prompt:** `sozdatel_prompt.txt:tone: "Живой, вдохновлённый, игривый"`

**TTS:**
```yaml
voice_type: innovative
gender: male
speed: 1.15
pitch: 1.05
language: uk/ru
energy: high
```

#### Домір (Harmony)
**Голос:** Просто, по-доброму, з повагою та всепроникаючим теплом  
**Prompt:** `domir_prompt.txt:Домир говорит просто, по-доброму`

**TTS:**
```yaml
voice_type: warm
gender: male
speed: 0.85
pitch: 1.0
language: uk/ru
warmth: very_high
```

#### Вождь (Strategic)
**Голос:** Авторитетний, компетентний, впевнений, надихаючий. Голос лідера  
**Prompt:** `vozhd_prompt.txt:Голос: Твой голос — авторитетный, компетентный, уверенный`

**TTS:**
```yaml
voice_type: leadership
gender: male
speed: 0.95
pitch: 0.9
language: uk/ru
authority: high
```

**Yaromir (Unified):**
```yaml
voice_type: unified_rich
gender: male
speed: 1.0
pitch: 1.0
language: uk
overtones: true  # багатошаровий голос
synthesis: [provodnik, sozdatel, domir, vozhd]
```

---

### 9. NUTRA (@NUTRABot)
**Голос:** Не визначено явно  
**Характер:** AI-помічник з харчування та здоров'я  
**Рекомендація:** Дружній турботливий жіночий голос

**TTS Конфігурація:**
```yaml
voice_type: caring
gender: female
speed: 0.95
pitch: 1.1
language: uk
```

---

## 🔧 Стандарт TTS для всіх ботів

### Архітектура

```
User → Voice Message → Telegram
                         ↓
                   Gateway (STT)
                         ↓
                   Text → Router → Agent LLM
                         ↓
                   Response Text
                         ↓
                   TTS Service (⚠️ ПОТРІБНО)
                         ↓
                   Voice Response → Telegram
```

### Що потрібно реалізувати:

#### 1. Розгорнути TTS Service

**Варіант A: Coqui TTS (локальний, безкоштовний)**
```dockerfile
# services/tts-service/Dockerfile
FROM python:3.10
RUN pip install TTS torch
COPY tts_server.py /app/
CMD ["python", "/app/tts_server.py"]
```

**Варіант B: ElevenLabs API (хмарний, платний, якісніший)**
```python
import elevenlabs

async def text_to_speech(text: str, voice_id: str):
    audio = elevenlabs.generate(
        text=text,
        voice=voice_id,
        model="eleven_multilingual_v2"
    )
    return audio
```

**Варіант C: Google Cloud TTS (хмарний, платний)**
```python
from google.cloud import texttospeech

client = texttospeech.TextToSpeechClient()
```

**Рекомендація:** Почати з Coqui TTS (безкоштовно, локально)

---

#### 2. Додати TTS handler в Gateway

**Файл:** `/opt/microdao-daarion/gateway-bot/http_api.py`

```python
async def send_voice_response(
    chat_id: str,
    text: str,
    agent_config: AgentConfig,
    telegram_token: str
):
    """Відправити голосову відповідь через TTS"""
    
    # 1. Синтезувати голос
    voice_config = agent_config.get_voice_config()  # NEW
    
    tts_service_url = os.getenv("TTS_SERVICE_URL", "http://tts-service:5002")
    tts_payload = {
        "text": text,
        "language": voice_config.get("language", "uk"),
        "speed": voice_config.get("speed", 1.0),
        "pitch": voice_config.get("pitch", 1.0),
        "voice_type": voice_config.get("voice_type", "neutral"),
        "gender": voice_config.get("gender", "neutral"),
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        tts_resp = await client.post(
            f"{tts_service_url}/synthesize",
            json=tts_payload
        )
        tts_resp.raise_for_status()
        audio_bytes = tts_resp.content
    
    # 2. Відправити в Telegram як voice message
    telegram_api_url = f"https://api.telegram.org/bot{telegram_token}/sendVoice"
    
    files = {
        "voice": ("response.ogg", audio_bytes, "audio/ogg"),
    }
    data = {
        "chat_id": chat_id,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(telegram_api_url, files=files, data=data)
        resp.raise_for_status()
    
    logger.info(f"Voice response sent to chat {chat_id}")
```

---

#### 3. Додати voice_config в AgentConfig

**Файл:** `/opt/microdao-daarion/gateway-bot/http_api.py`

```python
class AgentConfig:
    agent_id: str
    name: str
    prompt_path: str
    telegram_token_env: str
    default_prompt: str
    system_prompt: str = ""
    voice_config: Dict[str, Any] = {}  # NEW
    
    def get_voice_config(self) -> Dict[str, Any]:
        """Отримати конфігурацію голосу агента"""
        return self.voice_config or {
            "language": "uk",
            "speed": 1.0,
            "pitch": 1.0,
            "voice_type": "neutral",
            "gender": "neutral",
        }


# Приклад для SOUL:
SOUL_CONFIG = load_agent_config(
    agent_id="soul",
    name="SOUL",
    prompt_path=str(Path(__file__).parent / "soul_prompt.txt"),
    telegram_token_env="SOUL_TELEGRAM_BOT_TOKEN",
    default_prompt="...",
    voice_config={  # NEW
        "language": "uk",
        "speed": 0.85,
        "pitch": 1.05,
        "voice_type": "melodic",
        "gender": "female",
        "warmth": "high",
    }
)
```

---

#### 4. Режими відповіді (текст/голос)

**Варіант A:** Завжди відповідати голосом на голосові повідомлення
```python
async def handle_telegram_webhook(agent_config, update):
    # Detect if user sent voice
    is_voice_input = bool(update.message.get("voice") or update.message.get("audio"))
    
    # Process...
    response_text = await get_agent_response(...)
    
    # Reply with voice if user sent voice
    if is_voice_input:
        await send_voice_response(chat_id, response_text, agent_config, token)
    else:
        await send_telegram_message(chat_id, response_text, token)
```

**Варіант B:** Користувач вибирає режим через команду
```python
@router.post("/{bot_id}/telegram/webhook")
async def universal_telegram_webhook(bot_id: str, update: TelegramUpdate):
    # Check user preferences from Memory Service
    user_prefs = await memory_client.get_user_preferences(user_id)
    reply_mode = user_prefs.get("reply_mode", "text")  # "text" або "voice"
    
    response_text = await get_agent_response(...)
    
    if reply_mode == "voice":
        await send_voice_response(...)
    else:
        await send_telegram_message(...)
```

**Команди:**
- `/voice` — увімкнути голосові відповіді
- `/text` — увімкнути текстові відповіді

---

## 📋 План впровадження TTS

### Phase 1: Інфраструктура (2-3 години)

1. **Розгорнути TTS Service** (Coqui TTS)
   ```bash
   cd /opt/microdao-daarion/services
   mkdir tts-service
   # Створити Dockerfile, tts_server.py, requirements.txt
   docker-compose up -d tts-service
   ```

2. **Додати конфігурацію в docker-compose.yml**
   ```yaml
   tts-service:
     build: ./services/tts-service
     ports:
       - "5002:5002"
     networks:
       - dagi-network
     environment:
       - TTS_MODEL=tts_models/uk/mai/vits
   ```

3. **Перевірити роботу**
   ```bash
   curl -X POST http://localhost:5002/synthesize \
     -H "Content-Type: application/json" \
     -d '{"text":"Привіт, це тест", "language":"uk"}'
   ```

---

### Phase 2: Інтеграція з Gateway (2-3 години)

1. **Додати `voice_config` для всіх агентів**
   - Оновити кожну конфігурацію в `http_api.py`
   - Додати метод `get_voice_config()` в `AgentConfig`

2. **Створити `send_voice_response()` функцію**
   - Виклик TTS Service
   - Відправка voice message в Telegram

3. **Оновити `handle_telegram_webhook()`**
   - Визначити режим відповіді (текст/голос)
   - Викликати відповідну функцію

---

### Phase 3: Тестування (1-2 години)

1. **Тест базового TTS**
   - Відправити текстове повідомлення боту
   - Отримати голосову відповідь

2. **Тест всіх голосів**
   - Перевірити кожного бота
   - Підтвердити унікальність голосів

3. **Тест мультимовності**
   - Українська
   - Англійська
   - (Опційно) Російська

---

### Phase 4: Оптимізація (опційно)

1. **Кешування частих фраз**
   ```python
   # Кешувати TTS для привітань, FAQ
   tts_cache = {
       "Привіт!": b"cached_audio_bytes...",
   }
   ```

2. **Потокова передача (streaming)**
   - Почати відправку аудіо до завершення синтезу

3. **Різні голоси для різних контекстів**
   - Офіційний/неофіційний тон
   - Короткі/довгі повідомлення

---

## ✅ Чекліст для кожного бота

### STT (Speech-to-Text):
- [x] CLAN — ✅ Працює
- [x] DAARWIZZ — ✅ Працює
- [x] DRUID — ✅ Працює
- [x] EONARCH — ✅ Працює
- [x] GREENFOOD — ✅ Працює
- [x] Helion — ✅ Працює
- [x] SOUL — ✅ Працює
- [x] YAROMIR — ✅ Працює
- [x] NUTRA — ✅ Працює

### TTS (Text-to-Speech):
- [ ] CLAN — ⚠️ Потрібна інтеграція
- [ ] DAARWIZZ — ⚠️ Потрібна інтеграція
- [ ] DRUID — ⚠️ Потрібна інтеграція
- [ ] EONARCH — ⚠️ Потрібна інтеграція
- [ ] GREENFOOD — ⚠️ Потрібна інтеграція
- [ ] Helion — ⚠️ Потрібна інтеграція
- [ ] SOUL — ⚠️ Потрібна інтеграція (унікальний голос!)
- [ ] YAROMIR — ⚠️ Потрібна інтеграція (складний!)
- [ ] NUTRA — ⚠️ Потрібна інтеграція

### Voice Configs:
- [ ] CLAN — визначити voice_config
- [ ] DAARWIZZ — визначити voice_config
- [ ] DRUID — визначити voice_config
- [ ] EONARCH — визначити voice_config
- [ ] GREENFOOD — визначити voice_config
- [ ] Helion — визначити voice_config
- [x] SOUL — ✅ визначено в промпті
- [x] YAROMIR — ✅ визначено в промпті (складний)
- [ ] NUTRA — визначити voice_config

---

## 🎯 Підсумок

### Поточний стан:
| Функція | Статус | Боти |
|---------|--------|------|
| **STT (голос → текст)** | ✅ ПРАЦЮЄ | 9/9 ботів |
| **TTS (текст → голос)** | ❌ НЕ РЕАЛІЗОВАНО | 0/9 ботів |
| **Voice Configs** | ⚠️ ЧАСТКОВО | 2/9 (SOUL, YAROMIR) |

### Наступні кроки:
1. 🔴 **Критично:** Розгорнути TTS Service (Coqui TTS)
2. 🔴 **Критично:** Додати voice_config для всіх агентів
3. 🟡 **Важливо:** Інтегрувати TTS в Gateway
4. 🟡 **Важливо:** Протестувати голоси всіх ботів
5. 🟢 **Опційно:** Оптимізувати (кешування, streaming)

### Час на впровадження:
- **Мінімум:** 5-6 годин (базова інтеграція)
- **Повністю:** 10-12 годин (з тестуванням та оптимізацією)

---

**Статус:** 🟡 STT ПРАЦЮЄ, TTS ПОТРІБНА ІНТЕГРАЦІЯ  
**Last Updated:** 2025-11-24  
**By:** Claude (Cursor AI Assistant)




