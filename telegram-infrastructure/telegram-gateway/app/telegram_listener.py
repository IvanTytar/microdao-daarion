import asyncio
import logging
from typing import Any, Dict, Optional

from aiogram import Bot, Dispatcher, F
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.types import Message

from .config import settings
from .models import TelegramUpdateEvent
from .nats_client import nats_client
from .bots_registry import bots_registry
from .voice_handler import handle_voice_message, handle_document_message

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

        # TEXT
        @dp.message(F.text)
        async def on_message(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info(
                "📨 Received TEXT: agent=%s, chat=%s, user=%s, len=%d",
                agent_id,
                message.chat.id,
                message.from_user.id if message.from_user else 0,
                len(message.text or ""),
            )

            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=message.text,
                raw_update=message.model_dump(),
            )

            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump(),
            )
            logger.debug("✅ Published TEXT to NATS: agent=%s, chat_id=%s", agent_id, message.chat.id)

        # VOICE / AUDIO / VIDEO NOTE
        @dp.message(F.voice | F.audio | F.video_note)
        async def on_voice(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info(
                "🎤 Received VOICE: agent=%s, chat=%s, user=%s",
                agent_id,
                message.chat.id,
                message.from_user.id if message.from_user else 0,
            )

            await message.answer("🎤 Обробляю голосове повідомлення...")
            transcribed_text = await handle_voice_message(message, bot)

            if not transcribed_text:
                await message.answer("❌ Не вдалося розпізнати голос. Спробуйте ще раз.")
                return

            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=transcribed_text,
                raw_update=message.model_dump(),
            )

            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump(),
            )
            logger.info("✅ Published STT text to NATS: agent=%s", agent_id)

        # DOCUMENTS (PDF)
        @dp.message(F.document)
        async def on_document(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info(
                "📄 Received DOCUMENT: agent=%s, chat=%s, user=%s, file=%s",
                agent_id,
                message.chat.id,
                message.from_user.id if message.from_user else 0,
                message.document.file_name if message.document else "unknown",
            )

            doc_info = await handle_document_message(message, bot)
            if not doc_info:
                logger.info("⏭️ Not a PDF or processing skipped")
                return

            await message.answer(f"📄 Обробляю документ: {doc_info.get('file_name')}...")

            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=message.caption or f"[DOCUMENT] {doc_info.get('file_name')}",
                raw_update=message.model_dump(),
                metadata={"document": doc_info},
            )

            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump(),
            )
            logger.info("✅ Published DOCUMENT to NATS: agent=%s", agent_id)

        # PHOTOS
        @dp.message(F.photo)
        async def on_photo(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info(
                "🖼️ Received PHOTO: agent=%s, chat=%s, user=%s",
                agent_id,
                message.chat.id,
                message.from_user.id if message.from_user else 0,
            )

            photo = message.photo[-1] if message.photo else None
            if not photo:
                logger.warning("⏭️ Photo payload missing")
                return

            await message.answer("🖼️ Обробляю зображення...")

            try:
                file = await bot.get_file(photo.file_id)
                file_path = file.file_path
                file_url = f"https://api.telegram.org/file/bot{bot.token}/{file_path}"

                event = TelegramUpdateEvent(
                    agent_id=agent_id,
                    bot_id=f"bot:{bot_token[:8]}",
                    chat_id=message.chat.id,
                    user_id=message.from_user.id if message.from_user else 0,
                    text=message.caption or "[IMAGE]",
                    raw_update=message.model_dump(),
                    metadata={
                        "photo": {
                            "file_url": file_url,
                            "file_id": photo.file_id,
                            "file_size": photo.file_size,
                            "width": photo.width,
                            "height": photo.height,
                        }
                    },
                )

                await nats_client.publish_json(
                    subject="agent.telegram.update",
                    data=event.model_dump(),
                )
                logger.info("✅ Published PHOTO to NATS: agent=%s", agent_id)
            except Exception as e:
                logger.error("❌ Error processing photo: %s", e, exc_info=True)
                await message.answer("❌ Помилка обробки зображення. Спробуйте ще раз.")

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

    async def send_message(
        self,
        agent_id: str,
        chat_id: int,
        text: str,
        reply_to_message_id: Optional[int] = None,
    ):
        logger.info(
            "Sending message: agent_id=%s, chat_id=%s, text_length=%d, reply_to=%s",
            agent_id,
            chat_id,
            len(text),
            reply_to_message_id,
        )

        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            logger.error("No bot token for agent_id=%s", agent_id)
            raise RuntimeError(f"No bot token for agent_id={agent_id}")

        bot = await self._ensure_bot(bot_token)

        await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_to_message_id=reply_to_message_id,
        )
        logger.info("✅ Message sent: agent_id=%s, chat_id=%s", agent_id, chat_id)

    async def send_voice(
        self,
        agent_id: str,
        chat_id: int,
        audio_bytes: bytes,
        reply_to_message_id: Optional[int] = None,
    ):
        if not audio_bytes:
            logger.warning("Empty audio_bytes for agent_id=%s, skip", agent_id)
            return

        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            logger.error("No bot token for agent_id=%s", agent_id)
            raise RuntimeError(f"No bot token for agent_id={agent_id}")

        bot = await self._ensure_bot(bot_token)

        from aiogram.types import BufferedInputFile

        audio_file = BufferedInputFile(audio_bytes, filename="voice.mp3")
        await bot.send_voice(
            chat_id=chat_id,
            voice=audio_file,
            reply_to_message_id=reply_to_message_id,
        )
        logger.info("✅ Voice message sent: agent_id=%s, chat_id=%s", agent_id, chat_id)

    async def remove_bot(self, bot_token: str) -> None:
        """Зупинити polling та видалити бота"""
        task = self._tasks.pop(bot_token, None)
        if task:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

        bot = self._bots.pop(bot_token, None)
        if bot:
            await bot.session.close()

        self._dispatchers.pop(bot_token, None)
        logger.info("🗑️ Bot stopped and removed: %s...", bot_token[:16])

    async def _ensure_bot(self, bot_token: str) -> Bot:
        bot = self._bots.get(bot_token)
        if bot:
            return bot
        await self.add_bot(bot_token)
        return self._bots[bot_token]

    def get_status(self, agent_id: str) -> Dict[str, any]:
        """Повернути статус бота (для UI)"""
        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            return {"agent_id": agent_id, "registered": False}

        task = self._tasks.get(bot_token)
        status = {
            "agent_id": agent_id,
            "registered": True,
            "token_prefix": bot_token[:8],
            "polling": bool(task) and not task.done(),
            "task_cancelled": bool(task) and task.cancelled(),
        }
        return status

    async def shutdown(self):
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)

        for bot in self._bots.values():
            await bot.session.close()


telegram_listener = TelegramListener()

