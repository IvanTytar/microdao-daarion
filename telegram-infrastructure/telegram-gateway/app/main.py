import asyncio
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings, load_bots_config
from .models import BotRegistration, TelegramSendCommand
from .bots_registry import bots_registry
from .nats_client import nats_client
from .telegram_listener import telegram_listener
from .router_handler import router_handler

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)

app = FastAPI(title="telegram-gateway", version="0.1.0")

ALLOWED_ORIGINS = [
    "http://localhost:8899",
    "http://127.0.0.1:8899",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # 1. Підключаємося до NATS
    await nats_client.connect()
    logger.info("✅ Connected to NATS at %s", settings.NATS_URL)

    # 2. Завантажити конфігурацію ботів з bots.yaml або env
    try:
        bot_configs = load_bots_config()
        logger.info("📋 Loaded %d bot(s) from config", len(bot_configs))
    except Exception as e:
        logger.warning("⚠️ Failed to load bots config: %s", e)
        bot_configs = []

    # 3. Зареєструвати всі боти в реєстрі
    if bot_configs:
        bots_registry.register_batch(bot_configs)
        logger.info("📝 Registered %d bot(s) in registry", len(bot_configs))

        # 4. Запустити polling для кожного бота
        for bot_config in bot_configs:
            if not bot_config.enabled:
                logger.debug("⏭️ Skipping disabled bot: agent_id=%s", bot_config.agent_id)
                continue
                
            agent_id = bot_config.agent_id
            bot_token = bot_config.bot_token
            
            # Запускаємо polling в фоновій задачі
            asyncio.create_task(telegram_listener.add_bot(bot_token))
            logger.info("🚀 Started polling for agent=%s (token=%s...)", agent_id, bot_token[:16])

            # Публікувати подію реєстрації
            await nats_client.publish_json(
                subject="bot.registered",
                data={"agent_id": agent_id, "bot_token": bot_token[:8] + "..."}
            )

        enabled_count = len([b for b in bot_configs if b.enabled])
        logger.info("✅ Initialized %d bot(s)", enabled_count)
    else:
        logger.warning("⚠️ No bots configured. Use /bots/register to add bots manually.")

    # 5. Запустити NATS subscriber для обробки подій та виклику Router
    try:
        await router_handler.start_subscription()
        logger.info("✅ RouterHandler subscription started")
    except Exception as e:
        logger.warning(f"⚠️ Failed to start RouterHandler subscription: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    await router_handler.close()
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
    logger.info(f"Registering bot via API: agent_id={reg.agent_id}")
    bots_registry.register(reg)

    # Запускаємо polling
    asyncio.create_task(telegram_listener.add_bot(reg.bot_token))

    # Публікуємо подію реєстрації (може ловити Router або інший сервіс)
    await nats_client.publish_json(
        subject="bot.registered",
        data={"agent_id": reg.agent_id, "bot_token": reg.bot_token[:8] + "..."}
    )

    return {"status": "registered", "agent_id": reg.agent_id}


@app.delete("/bots/{agent_id}")
async def unregister_bot(agent_id: str):
    """Відключити бота та зупинити polling"""
    bot_token = bots_registry.unregister(agent_id)
    if not bot_token:
        raise HTTPException(status_code=404, detail="Bot not registered")

    await telegram_listener.remove_bot(bot_token)
    await nats_client.publish_json(
        subject="bot.unregistered",
        data={"agent_id": agent_id, "bot_token": bot_token[:8] + "..."},
    )

    return {"status": "unregistered", "agent_id": agent_id}


@app.get("/bots/list")
async def list_bots():
    """Повернути список зареєстрованих ботів"""
    agents = bots_registry.list_agents()
    return {"bots": agents, "count": len(agents)}


@app.get("/bots/status/{agent_id}")
async def bot_status(agent_id: str):
    """Повернути статус конкретного бота"""
    status = telegram_listener.get_status(agent_id)
    return status


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


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Telegram Gateway",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": [
            "GET /healthz",
            "POST /bots/register",
            "POST /send"
        ]
    }
