# CURSOR_INSTRUCTIONS.md

## telegram-gateway для DAARION / microdao

Мета: реалізувати сервіс `telegram-gateway`, який:

- працює через **Local Telegram Bot API** (`telegram-bot-api`), без SSL і без публічних вебхуків;
- отримує апдейти від **декількох Telegram-ботів** через **long polling**;
- публікує вхідні повідомлення в **NATS** як події `agent.telegram.update`;
- приймає HTTP-запити від DAGI/microdao для надсилання повідомлень назад у Telegram (`agent.telegram.send`);
- інтегрується з існуючим **Router** (HTTP API `http://router:9102`), але не залежить від нього жорстко.

Інфраструктура (вже піднята Warp-ом):

- `telegram-bot-api` (Local Bot API, `http://telegram-bot-api:8081`, всередині Docker-мережі).
- `nats` (`nats://nats:4222`).
- `telegram-gateway` (цей сервіс, FastAPI, порт `8000` всередині контейнера).

Все це описано в `docker-compose.yml` у каталозі `telegram-infrastructure/`.

---

## 0. Структура проєкту

Працюємо в каталозі:

`telegram-infrastructure/telegram-gateway/`

Очікувана структура:

```text
telegram-infrastructure/
  docker-compose.yml
  .env

  telegram-gateway/
    Dockerfile
    requirements.txt  (або pyproject.toml — див. нижче)
    app/
      __init__.py
      main.py
      config.py
      nats_client.py
      telegram_listener.py
      models.py
      bots_registry.py
```

**Завдання для Cursor:** створити/оновити ці файли згідно інструкції нижче.

---

## 1. Залежності (requirements.txt)

Онови `telegram-gateway/requirements.txt`, додавши:

```txt
fastapi
uvicorn[standard]
aiogram==3.*
nats-py
pydantic-settings
httpx
```

Якщо вже існують інші залежності — збережи їх.

---

## 2. Конфігурація (app/config.py)

Створи файл `app/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Local Telegram Bot API (Docker service)
    TELEGRAM_API_BASE: str = "http://telegram-bot-api:8081"

    # NATS event bus
    NATS_URL: str = "nats://nats:4222"

    # Опційно: URL Router-а DAGI/microdao
    ROUTER_BASE_URL: str = "http://router:9102"

    # Через це поле можна включити debug-логування
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
```

---

## 3. Моделі подій і DTO (app/models.py)

Створи `app/models.py` з Pydantic-схемами:

```python
from typing import Optional, Any, Dict
from pydantic import BaseModel


class TelegramUpdateEvent(BaseModel):
    """Подія 'agent.telegram.update' для NATS."""
    agent_id: str
    bot_id: str
    chat_id: int
    user_id: int
    text: Optional[str] = None
    raw_update: Dict[str, Any]


class TelegramSendCommand(BaseModel):
    """Команда від DAGI/microdao для надсилання повідомлення в Telegram."""
    agent_id: str
    chat_id: int
    text: str
    reply_to_message_id: Optional[int] = None


class BotRegistration(BaseModel):
    """HTTP payload для реєстрації нового бота/агента."""
    agent_id: str
    bot_token: str
    # опційно: allowed_chat_id, ім'я, тощо
```

---

## 4. Клієнт NATS (app/nats_client.py)

Створи `app/nats_client.py` з асинхронним клієнтом:

```python
import json
from typing import Optional

import nats

from .config import settings


class NatsClient:
    def __init__(self, url: str):
        self._url = url
        self._nc: Optional[nats.NATS] = None

    async def connect(self) -> None:
        if self._nc is None or self._nc.is_closed:
            self._nc = await nats.connect(self._url)

    async def close(self) -> None:
        if self._nc and not self._nc.is_closed:
            await self._nc.drain()
            await self._nc.close()

    async def publish_json(self, subject: str, data: dict) -> None:
        if self._nc is None or self._nc.is_closed:
            await self.connect()
        await self._nc.publish(subject, json.dumps(data).encode("utf-8"))


nats_client = NatsClient(settings.NATS_URL)
```

На цьому етапі **підписки** NATS не потрібні — тільки `publish`. Підписуватися на `agent.telegram.send` можна пізніше, якщо буде потрібно. Зараз відправлення в Telegram робимо через HTTP `/send`.

---

## 5. Реєстр ботів (app/bots_registry.py)

Нам потрібна мапа `agent_id → bot_token` (і навпаки) для маршрутизації.

Створи `app/bots_registry.py`:

```python
from typing import Dict, Optional

from .models import BotRegistration


class BotsRegistry:
    """
    Простий in-memory реєстр.
    TODO: замінити на персистентне сховище (PostgreSQL/microdao DB).
    """
    def __init__(self) -> None:
        self._agent_to_token: Dict[str, str] = {}
        self._token_to_agent: Dict[str, str] = {}

    def register(self, reg: BotRegistration) -> None:
        self._agent_to_token[reg.agent_id] = reg.bot_token
        self._token_to_agent[reg.bot_token] = reg.agent_id

    def get_token_by_agent(self, agent_id: str) -> Optional[str]:
        return self._agent_to_token.get(agent_id)

    def get_agent_by_token(self, bot_token: str) -> Optional[str]:
        return self._token_to_agent.get(bot_token)


bots_registry = BotsRegistry()
```

На MVP-дроті достатньо in-memory. Потім можна буде підключити БД microdao (таблиця `telegram_bots`).

---

## 6. Telegram listener (app/telegram_listener.py)

Задача: запускати **long polling** для кількох ботів через Local Bot API і на кожне вхідне повідомлення публікувати `agent.telegram.update` у NATS.

Створи `app/telegram_listener.py`:

```python
import asyncio
import logging
from typing import Dict

from aiogram import Bot, Dispatcher, F
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.types import Message, Update

from .config import settings
from .models import TelegramUpdateEvent
from .nats_client import nats_client
from .bots_registry import bots_registry

logger = logging.getLogger(__name__)


class TelegramListener:
    def __init__(self) -> None:
        self._bots: Dict[str, Bot] = {}  # bot_token -> Bot
        self._dispatchers: Dict[str, Dispatcher] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._server = TelegramAPIServer.from_base(settings.TELEGRAM_API_BASE)

    async def _create_bot(self, bot_token: str) -> Bot:
        session = AiohttpSession(api=self._server)
        bot = Bot(token=bot_token, session=session)
        return bot

    async def add_bot(self, bot_token: str) -> None:
        if bot_token in self._bots:
            return

        bot = await self._create_bot(bot_token)
        dp = Dispatcher()

        @dp.message(F.text)
        async def on_message(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("No agent_id for bot_token=%s", bot_token)
                return

            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=message.text,
                raw_update=message.model_dump()
            )
            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump()
            )

        # Запускаємо polling у фоні
        async def _polling():
            try:
                logger.info("Start polling for bot %s", bot_token)
                await dp.start_polling(bot)
            except asyncio.CancelledError:
                logger.info("Polling cancelled for bot %s", bot_token)
            except Exception as e:
                logger.exception("Polling error for bot %s: %s", bot_token, e)
                raise

        task = asyncio.create_task(_polling())

        self._bots[bot_token] = bot
        self._dispatchers[bot_token] = dp
        self._tasks[bot_token] = task

    async def send_message(self, agent_id: str, chat_id: int, text: str, reply_to_message_id: int | None = None):
        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            raise RuntimeError(f"No bot token for agent_id={agent_id}")

        bot = self._bots.get(bot_token)
        if not bot:
            # Якщо бот ще не запущений (наприклад, перший виклик через /send)
            await self.add_bot(bot_token)
            bot = self._bots[bot_token]

        await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_to_message_id=reply_to_message_id
        )

    async def shutdown(self):
        # Завершити polling задачі
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)

        # Закрити бот-сесії
        for bot in self._bots.values():
            await bot.session.close()


telegram_listener = TelegramListener()
```

---

## 7. FastAPI: main + HTTP-ендпоінти (app/main.py)

Онови `app/main.py` так, щоб:

* при старті сервісу:
  * підключатися до NATS;
  * за потреби — попередньо запускати polling для вже відомих ботів (MVP можна пропустити);
* надавати HTTP-ендпоінти:
  * `GET /healthz`
  * `POST /bots/register` — реєстрація нового бота для агента
  * `POST /send` — надсилання повідомлення в Telegram від агента

```python
import asyncio
import logging

from fastapi import FastAPI, HTTPException

from .config import settings
from .models import BotRegistration, TelegramSendCommand
from .bots_registry import bots_registry
from .nats_client import nats_client
from .telegram_listener import telegram_listener

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)

app = FastAPI(title="telegram-gateway", version="0.1.0")


@app.on_event("startup")
async def on_startup():
    # Підключаємося до NATS
    await nats_client.connect()
    logger.info("Connected to NATS at %s", settings.NATS_URL)

    # На цьому етапі список ботів пустий; їх додаватимуть через /bots/register.
    # За потреби сюди можна додати завантаження конфігів з БД.


@app.on_event("shutdown")
async def on_shutdown():
    await telegram_listener.shutdown()
    await nats_client.close()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/bots/register")
async def register_bot(reg: BotRegistration):
    """
    Прив'язати Telegram-бота до agent_id.
    1) Зберегти в реєстрі (in-memory);
    2) Запустити polling для цього bot_token.
    3) Опційно: опублікувати подію bot.registered у NATS.
    """
    bots_registry.register(reg)

    # Запускаємо polling
    asyncio.create_task(telegram_listener.add_bot(reg.bot_token))

    # Публікуємо подію реєстрації (може ловити Router або інший сервіс)
    await nats_client.publish_json(
        subject="bot.registered",
        data={"agent_id": reg.agent_id, "bot_token": reg.bot_token}
    )

    return {"status": "registered"}


@app.post("/send")
async def send_message(cmd: TelegramSendCommand):
    """
    Відправити повідомлення в Telegram від імені агента.
    Викликається DAGI Router / microdao.
    """
    try:
        await telegram_listener.send_message(
            agent_id=cmd.agent_id,
            chat_id=cmd.chat_id,
            text=cmd.text,
            reply_to_message_id=cmd.reply_to_message_id,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return {"status": "sent"}
```

---

## 8. Dockerfile (telegram-gateway/Dockerfile)

Переконайся, що `Dockerfile` відповідає цим вимогам:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 9. docker-compose.yml (корінь telegram-infrastructure)

Переконайся, що сервіс `telegram-gateway` описаний приблизно так:

```yaml
services:
  telegram-bot-api:
    image: ghcr.io/tdlib/telegram-bot-api:latest
    container_name: telegram-bot-api
    restart: unless-stopped
    env_file:
      - .env
    command:
      - --local
      - --http-port=8081
      - --dir=/var/lib/telegram-bot-api
    volumes:
      - ./data/telegram-bot-api:/var/lib/telegram-bot-api
    ports:
      - "127.0.0.1:8081:8081"

  nats:
    image: nats:2
    container_name: nats
    restart: unless-stopped
    ports:
      - "127.0.0.1:4222:4222"

  telegram-gateway:
    build: ./telegram-gateway
    container_name: telegram-gateway
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - telegram-bot-api
      - nats
    ports:
      - "127.0.0.1:8000:8000"
```

---

## 10. Послідовність дій (для запуску й тесту)

1. Переконайся, що `.env` у корені `telegram-infrastructure` містить:

   ```env
   TELEGRAM_API_ID=XXXXXXX
   TELEGRAM_API_HASH=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
   NATS_URL=nats://nats:4222
   TELEGRAM_API_BASE=http://telegram-bot-api:8081
   ```

2. Запусти стек:

   ```bash
   docker compose build telegram-gateway
   docker compose up -d telegram-bot-api nats telegram-gateway
   ```

3. Перевір `telegram-gateway`:

   ```bash
   curl http://127.0.0.1:8000/healthz
   # очікується: {"status":"ok"}
   ```

4. Перевір Local Telegram Bot API (з реальним BOT_TOKEN):

   ```bash
   curl http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe
   ```

5. Зареєструй бота для агента:

   ```bash
   curl -X POST http://127.0.0.1:8000/bots/register \
     -H "Content-Type: application/json" \
     -d '{
       "agent_id": "ag_helion",
       "bot_token": "<YOUR_BOT_TOKEN>"
     }'
   ```

6. Надішли тестове повідомлення з агента:

   ```bash
   curl -X POST http://127.0.0.1:8000/send \
     -H "Content-Type: application/json" \
     -d '{
       "agent_id": "ag_helion",
       "chat_id": <YOUR_CHAT_ID>,
       "text": "Привіт від агента Helion!",
       "reply_to_message_id": null
     }'
   ```

7. Перевір у логах `nats` або через окремий subscriber, що події `agent.telegram.update` публікуються при вхідних повідомленнях.

---

## 11. Що далі (опційно)

Після того, як MVP працює:

* підключити реальну БД microdao для таблиці `telegram_bots` замість in-memory `BotsRegistry`;
* додати підписника NATS на `agent.telegram.send`, щоб можна було слати повідомлення не тільки через HTTP `/send`, а й через події;
* розширити payload подій (`mode`, `team_id`, `channel_id`) під існуючий Event Catalog microdao;
* додати обмеження / rate limiting / логування в стилі microdao.

---
