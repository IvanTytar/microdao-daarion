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

        # Handler for text messages
        @dp.message(F.text)
        async def on_message(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info("📨 Received TEXT: agent=%s, chat=%s, user=%s, len=%d",
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

        # Handler for voice messages
        @dp.message(F.voice | F.audio | F.video_note)
        async def on_voice(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info("🎤 Received VOICE: agent=%s, chat=%s, user=%s",
                        agent_id, message.chat.id, message.from_user.id if message.from_user else 0)

            # Send "processing" message
            await message.answer("🎤 Обробляю голосове повідомлення...")

            # Process voice through STT
            transcribed_text = await handle_voice_message(message, bot_token)
            
            if not transcribed_text:
                await message.answer("❌ Не вдалося розпізнати голос. Спробуйте ще раз.")
                return

            logger.info("📝 Transcribed (%d chars): %s...", len(transcribed_text), transcribed_text[:50])

            # Publish transcribed text as regular message to NATS
            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=transcribed_text,
                raw_update=message.model_dump()
            )
            
            logger.info("📤 Publishing transcribed text to NATS: agent=%s", agent_id)
            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump()
            )

        # Handler for documents (PDF)
        @dp.message(F.document)
        async def on_document(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info("📄 Received DOCUMENT: agent=%s, chat=%s, user=%s, file=%s",
                        agent_id, message.chat.id, message.from_user.id if message.from_user else 0,
                        message.document.file_name if message.document else "unknown")

            # Process document
            doc_info = await handle_document_message(message, bot_token)
            
            if not doc_info:
                logger.info("⏭️ Not a PDF or processing skipped")
                return

            # Send "processing" message
            await message.answer(f"📄 Обробляю документ: {doc_info.get('file_name')}...")

            # Publish document info to NATS
            event = TelegramUpdateEvent(
                agent_id=agent_id,
                bot_id=f"bot:{bot_token[:8]}",
                chat_id=message.chat.id,
                user_id=message.from_user.id if message.from_user else 0,
                text=f"[DOCUMENT] {doc_info.get('file_name')}",
                raw_update=message.model_dump(),
                metadata={"document": doc_info}
            )
            
            logger.info("📤 Publishing document to NATS: agent=%s, file=%s", agent_id, doc_info.get('file_name'))
            await nats_client.publish_json(
                subject="agent.telegram.update",
                data=event.model_dump()
            )

        # Handler for photos/images
        @dp.message(F.photo)
        async def on_photo(message: Message) -> None:
            agent_id = bots_registry.get_agent_by_token(bot_token)
            if not agent_id:
                logger.warning("⚠️ No agent_id for bot_token=%s...", bot_token[:16])
                return

            logger.info("🖼️ Received PHOTO: agent=%s, chat=%s, user=%s",
                        agent_id, message.chat.id, message.from_user.id if message.from_user else 0)

            # Get largest photo
            photo = message.photo[-1] if message.photo else None
            if not photo:
                return

            # Send "processing" message
            await message.answer("🖼️ Обробляю зображення...")

            # Get file info
            file_id = photo.file_id
            file_size = photo.file_size
            
            try:
                # Get file from bot
                file = await bot.get_file(file_id)
                file_path = file.file_path
                
                # Download file URL (через офіційний Telegram API для файлів)
                file_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
                
                logger.info("📥 Photo URL: %s", file_url)
                
                # Prepare caption or default text
                caption = message.caption or "[IMAGE]"
                
                # Publish photo info to NATS
                event = TelegramUpdateEvent(
                    agent_id=agent_id,
                    bot_id=f"bot:{bot_token[:8]}",
                    chat_id=message.chat.id,
                    user_id=message.from_user.id if message.from_user else 0,
                    text=caption,
                    raw_update=message.model_dump(),
                    metadata={
                        "photo": {
                            "file_url": file_url,
                            "file_id": file_id,
                            "file_size": file_size,
                            "width": photo.width,
                            "height": photo.height,
                        }
                    }
                )
                
                logger.info("📤 Publishing photo to NATS: agent=%s", agent_id)
                await nats_client.publish_json(
                    subject="agent.telegram.update",
                    data=event.model_dump()
                )
                
            except Exception as e:
                logger.error(f"❌ Error processing photo: {e}", exc_info=True)
                await message.answer("❌ Помилка обробки зображення. Спробуйте ще раз.")

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

    async def send_voice(self, agent_id: str, chat_id: int, audio_bytes: bytes, reply_to_message_id: int | None = None):
        """Відправити голосове повідомлення"""
        logger.info(
            f"Sending voice: agent_id={agent_id}, chat_id={chat_id}, "
            f"audio_size={len(audio_bytes)} bytes, reply_to={reply_to_message_id}"
        )

        bot_token = bots_registry.get_token_by_agent(agent_id)
        if not bot_token:
            logger.error(f"No bot token for agent_id={agent_id}")
            raise RuntimeError(f"No bot token for agent_id={agent_id}")

        bot = self._bots.get(bot_token)
        if not bot:
            logger.info(f"Bot not started yet, initializing: agent_id={agent_id}")
            await self.add_bot(bot_token)
            bot = self._bots[bot_token]

        if not audio_bytes:
            logger.warning(f"Empty audio_bytes for agent_id={agent_id}, skipping")
            return

        # Створити BytesIO об'єкт для aiogram
        from io import BytesIO
        from aiogram.types import BufferedInputFile
        
        audio_file = BufferedInputFile(audio_bytes, filename="voice.mp3")

        await bot.send_voice(
            chat_id=chat_id,
            voice=audio_file,
            reply_to_message_id=reply_to_message_id
        )
        logger.info(f"Voice sent successfully: agent_id={agent_id}, chat_id={chat_id}")

    async def shutdown(self):
        # Завершити polling задачі
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)

        # Закрити бот-сесії
        for bot in self._bots.values():
            await bot.session.close()


telegram_listener = TelegramListener()

