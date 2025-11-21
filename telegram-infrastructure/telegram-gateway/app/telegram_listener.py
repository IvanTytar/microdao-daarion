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
                        agent_id, message.chat.id, message.from_user.id if message.from_user else 0, 
                        len(message.text or ""))

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
            logger.debug("✅ Published to NATS: agent=%s, chat_id=%s", agent_id, message.chat.id)

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

    async def send_message(self, agent_id: str, chat_id: int, text: str, reply_to_message_id: int | None = None):
        # Логування перед відправкою
        logger.info(
            f"Sending message: agent_id={agent_id}, chat_id={chat_id}, "
            f"text_length={len(text)}, reply_to={reply_to_message_id}"
        )

        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            logger.error(f"No bot token for agent_id={agent_id}")
            raise RuntimeError(f"No bot token for agent_id={agent_id}")

        bot = self._bots.get(bot_token)
        if not bot:
            # Якщо бот ще не запущений (наприклад, перший виклик через /send)
            logger.info(f"Bot not started yet, initializing: agent_id={agent_id}")
            await self.add_bot(bot_token)
            bot = self._bots[bot_token]

        await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_to_message_id=reply_to_message_id
        )
        logger.info(f"Message sent successfully: agent_id={agent_id}, chat_id={chat_id}")

    async def shutdown(self):
        # Завершити polling задачі
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)

        # Закрити бот-сесії
        for bot in self._bots.values():
            await bot.session.close()


telegram_listener = TelegramListener()

