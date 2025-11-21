# 🔧 Завдання для Cursor: Виправити telegram-gateway (DAARWIZZ і Helion не відповідають)

## 🎯 Мета
Зробити так, щоб обидва боти (DAARWIZZ і Helion) автоматично ініціалізувались при старті та відповідали на повідомлення через polling.

---

## 📋 Проблеми зараз

1. ❌ Боти не ініціалізуються автоматично при старті
2. ❌ `bots.yaml` не монтується в контейнер
3. ❌ Polling не запускається для ботів з конфігурації
4. ❌ Логування недостатнє для діагностики

---

## ✅ Що потрібно зробити

### 1. Виправити `docker-compose.yml`

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/docker-compose.yml`

**Додати volume для bots.yaml:**

```yaml
  telegram-gateway:
    build: ./telegram-gateway
    container_name: telegram-gateway
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - TELEGRAM_API_BASE=http://telegram-bot-api:8081
      - NATS_URL=nats://nats:4222
      - ROUTER_BASE_URL=http://router:9102
      - DEBUG=true
    depends_on:
      - telegram-bot-api
      - nats
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - ./telegram-gateway/bots.yaml:/app/bots.yaml:ro  # ← ДОДАТИ ЦЕЙ РЯДОК
    networks:
      - telegram-net
      - dagi-network
```

**Чому:** Контейнер має читати `bots.yaml` при старті, але файл не копіюється в образ і не монтується як volume.

---

### 2. Виправити `app/main.py` — автоматична ініціалізація ботів

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/telegram-gateway/app/main.py`

**Поточний код `on_startup()`:**
```python
@app.on_event("startup")
async def on_startup():
    # Підключаємося до NATS
    await nats_client.connect()
    logger.info("Connected to NATS at %s", settings.NATS_URL)

    # На цьому етапі список ботів пустий; їх додаватимуть через /bots/register.
    # За потреби сюди можна додати завантаження конфігів з БД.
```

**Новий код `on_startup()` (ЗАМІНИТИ):**
```python
@app.on_event("startup")
async def on_startup():
    # 1. Підключаємося до NATS
    await nats_client.connect()
    logger.info("✅ Connected to NATS at %s", settings.NATS_URL)

    # 2. Завантажити конфігурацію ботів з bots.yaml або env
    from .config import load_bots_config
    
    try:
        bot_configs = load_bots_config()
        logger.info("📋 Loaded %d bot(s) from config", len(bot_configs))
    except Exception as e:
        logger.warning("⚠️ Failed to load bots config: %s", e)
        bot_configs = []

    # 3. Зареєструвати всі боти в реєстрі
    if bot_configs:
        bots_registry.register_from_config(bot_configs)
        logger.info("📝 Registered %d bot(s) in registry", len(bot_configs))

    # 4. Запустити polling для кожного бота
    for bot_config in bot_configs:
        agent_id = bot_config.agent_id
        bot_token = bot_config.bot_token
        
        # Запускаємо polling в фоновій задачі
        asyncio.create_task(telegram_listener.add_bot(bot_token))
        logger.info("🚀 Started polling for agent=%s (token=%s...)", agent_id, bot_token[:16])

    if not bot_configs:
        logger.warning("⚠️ No bots configured. Use /bots/register to add bots manually.")
```

**Чому:** Зараз боти не запускаються автоматично — треба викликати `/bots/register` вручну. Цей код автоматично завантажує конфіг і запускає polling при старті.

---

### 3. Перевірити `app/config.py` — функція `load_bots_config()`

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/telegram-gateway/app/config.py`

**Переконайся, що функція існує і виглядає приблизно так:**

```python
from pathlib import Path
from typing import List
import yaml
import os
from pydantic import BaseModel

class BotConfig(BaseModel):
    agent_id: str
    bot_token: str

def load_bots_config() -> List[BotConfig]:
    """
    Завантажити конфігурацію ботів з bots.yaml або env variables.
    
    Пріоритет:
    1. bots.yaml (якщо існує)
    2. Environment variables: BOT_<AGENT_ID>_TOKEN
    """
    bots = []
    
    # Спробувати завантажити з bots.yaml
    config_path = Path("/app/bots.yaml")  # Шлях в контейнері
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                data = yaml.safe_load(f)
                if data and "bots" in data:
                    for bot_data in data["bots"]:
                        bots.append(BotConfig(**bot_data))
        except Exception as e:
            # Fallback до env variables
            pass
    
    # Fallback: завантажити з env variables
    if not bots:
        for key, value in os.environ.items():
            if key.startswith("BOT_") and key.endswith("_TOKEN"):
                agent_id = key[4:-6].lower()  # BOT_DAARWIZZ_TOKEN -> daarwizz
                bots.append(BotConfig(agent_id=agent_id, bot_token=value))
    
    return bots
```

**Якщо функція відсутня або неповна — додай/виправ її.**

---

### 4. Перевірити `app/bots_registry.py` — метод `register_from_config()`

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/telegram-gateway/app/bots_registry.py`

**Переконайся, що метод існує:**

```python
from typing import List
from .config import BotConfig

class BotsRegistry:
    # ... інші методи ...

    def register_from_config(self, configs: List[BotConfig]) -> None:
        """Масова реєстрація ботів з конфігурації"""
        for config in configs:
            self.register(config)
            # або напряму:
            # self._agent_to_token[config.agent_id] = config.bot_token
            # self._token_to_agent[config.bot_token] = config.agent_id
```

**Якщо метод відсутній — додай його.**

---

### 5. Додати детальне логування в `app/telegram_listener.py`

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/telegram-gateway/app/telegram_listener.py`

**Оновити метод `add_bot()` для кращого логування:**

```python
async def add_bot(self, bot_token: str) -> None:
    if bot_token in self._bots:
        logger.info("🔄 Bot already registered: %s...", bot_token[:16])
        return

    logger.info("🤖 Creating bot: %s...", bot_token[:16])
    bot = await self._create_bot(bot_token)
    dp = Dispatcher()

    @dp.message(F.text)
    async def on_message(message: Message) -> None:
        agent_id = bots_registry.get_agent_by_token(bot_token)
        if not agent_id:
            logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
            return

        logger.info("📨 Received message: agent=%s, chat=%s, user=%s, len=%d",
                    agent_id, message.chat.id, message.from_user.id if message.from_user else 0, len(message.text or ""))

        event = TelegramUpdateEvent(
            agent_id=agent_id,
            bot_id=f"bot:{bot_token[:8]}",
            chat_id=message.chat.id,
            user_id=message.from_user.id if message.from_user else 0,
            text=message.text,
            raw_update=message.model_dump()
        )
        
        logger.info("📤 Publishing to NATS: subject=agent.telegram.update, agent=%s", agent_id)
        await nats_client.publish_json(
            subject="agent.telegram.update",
            data=event.model_dump()
        )

    # Запускаємо polling у фоні
    async def _polling():
        try:
            logger.info("🔁 Start polling for bot %s...", bot_token[:16])
            await dp.start_polling(bot)
        except asyncio.CancelledError:
            logger.info("🛑 Polling cancelled for bot %s...", bot_token[:16])
        except Exception as e:
            logger.exception("💥 Polling error for bot %s...: %s", bot_token[:16], e)
            raise

    task = asyncio.create_task(_polling())

    self._bots[bot_token] = bot
    self._dispatchers[bot_token] = dp
    self._tasks[bot_token] = task
    
    logger.info("✅ Bot registered and polling started: %s...", bot_token[:16])
```

**Чому:** Детальніше логування допоможе побачити, що відбувається при отриманні повідомлень.

---

### 6. Створити `bots.yaml` локально (якщо ще не створений)

**Файл:** `/Users/apple/github-projects/microdao-daarion/telegram-infrastructure/telegram-gateway/bots.yaml`

**Вміст:**
```yaml
bots:
  - agent_id: daarwizz
    bot_token: 8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
  - agent_id: helion
    bot_token: 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
```

---

## 🧪 Як перевірити після змін

### 1. Деплой на сервер (виконати з Mac)

```bash
cd /Users/apple/github-projects/microdao-daarion/telegram-infrastructure

# Синхронізація коду
rsync -avz --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' --exclude='data/' ./ root@144.76.224.179:/opt/telegram-infrastructure/

# Перезапуск на сервері
ssh root@144.76.224.179 "cd /opt/telegram-infrastructure && docker compose down telegram-gateway && docker compose up -d --build telegram-gateway"
```

### 2. Перевірка логів (на сервері)

```bash
ssh root@144.76.224.179
docker logs -f telegram-gateway
```

**Очікувані рядки в логах:**
```
✅ Connected to NATS at nats://nats:4222
📋 Loaded 2 bot(s) from config
📝 Registered 2 bot(s) in registry
🚀 Started polling for agent=daarwizz (token=8323412397:AAFxa...)
🚀 Started polling for agent=helion (token=8112062582:AAGI7...)
🔁 Start polling for bot 8323412397:AAFxa...
🔁 Start polling for bot 8112062582:AAGI7...
```

### 3. Перевірка списку ботів

```bash
curl -s http://127.0.0.1:8000/bots/list | jq .
```

**Очікувана відповідь:**
```json
{
  "bots": ["daarwizz", "helion"],
  "count": 2
}
```

### 4. Перевірка polling tasks

```bash
curl -s http://127.0.0.1:8000/debug/bots | jq .
```

**Очікувана відповідь:**
```json
{
  "registered_bots": 2,
  "bot_tokens": ["8323412397:AAFxa...", "8112062582:AAGI7..."],
  "registry_mappings": 2,
  "active_tasks": 2
}
```

```bash
curl -s http://127.0.0.1:8000/debug/bots/tasks | jq .
```

**Очікувана відповідь:**
```json
{
  "8323412397:AAFxa...": {
    "done": false,
    "cancelled": false
  },
  "8112062582:AAGI7...": {
    "done": false,
    "cancelled": false
  }
}
```

### 5. Надіслати тестове повідомлення

**В Telegram:**
1. Надішліть "Привіт" в DAARWIZZ бот
2. Надішліть "Привіт" в Helion бот

**В логах має з'явитись:**
```
📨 Received message: agent=daarwizz, chat=123456, user=789, len=6
📤 Publishing to NATS: subject=agent.telegram.update, agent=daarwizz
📨 Received message: agent=helion, chat=123456, user=789, len=6
📤 Publishing to NATS: subject=agent.telegram.update, agent=helion
```

---

## ⚠️ Troubleshooting

### Якщо боти не ініціалізуються:
```bash
# Перевірити, чи bots.yaml є в контейнері
docker exec telegram-gateway cat /app/bots.yaml

# Має показати вміст файлу. Якщо "No such file" — volume не працює
```

### Якщо polling не запускається:
```bash
# Перевірити логи aiogram
docker logs telegram-gateway 2>&1 | grep -i "polling\|error\|exception"
```

### Якщо повідомлення не приходять:
```bash
# Перевірити, чи webhooks видалені
curl -s "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getWebhookInfo" | jq .result.url
curl -s "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo" | jq .result.url

# Обидва мають повертати: ""  (порожній рядок = webhook видалений)
```

---

## 📝 Checklist для Cursor

- [ ] Додати `volumes:` в `docker-compose.yml` для `telegram-gateway`
- [ ] Оновити `on_startup()` в `app/main.py` з автоматичною ініціалізацією
- [ ] Перевірити/додати `load_bots_config()` в `app/config.py`
- [ ] Перевірити/додати `register_from_config()` в `app/bots_registry.py`
- [ ] Додати детальне логування в `app/telegram_listener.py`
- [ ] Створити `telegram-gateway/bots.yaml` з реальними токенами

---

## 🎯 Очікуваний результат

Після виконання всіх кроків:
- ✅ Обидва боти (DAARWIZZ і Helion) автоматично стартують при запуску контейнера
- ✅ Polling працює для обох ботів
- ✅ Повідомлення отримуються і публікуються в NATS
- ✅ Детальні логи для діагностики
- ✅ `/bots/list` показує обидва боти

**Після цього агенти мають відповідати на повідомлення!** 🎉
