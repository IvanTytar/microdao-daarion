"""
NATS subscriber для обробки подій agent.telegram.update
Викликає Router через HTTP API та відправляє відповідь назад в Telegram
"""
import asyncio
import json
import logging
from typing import Dict, Any
import httpx

import nats

from .config import settings
from .models import TelegramUpdateEvent, TelegramSendCommand
from .telegram_listener import telegram_listener

logger = logging.getLogger(__name__)


class RouterHandler:
    """Обробник подій з NATS, який викликає Router та відправляє відповіді"""
    
    def __init__(self):
        self._nc = None
        self._sub = None
        self._router_url = settings.ROUTER_BASE_URL
        self._running = False
    
    async def connect(self):
        """Підключитися до NATS"""
        if self._nc is None or self._nc.is_closed:
            self._nc = await nats.connect(settings.NATS_URL)
            logger.info(f"✅ RouterHandler connected to NATS at {settings.NATS_URL}")
    
    async def start_subscription(self):
        """Підписатися на події agent.telegram.update"""
        await self.connect()
        
        async def message_handler(msg):
            """Обробка повідомлення з NATS"""
            try:
                data = json.loads(msg.data.decode())
                event = TelegramUpdateEvent(**data)
                
                logger.info(
                    f"📥 Received NATS event: agent={event.agent_id}, "
                    f"chat={event.chat_id}, text_len={len(event.text or '')}"
                )
                
                # Обробити подію асинхронно
                asyncio.create_task(self._handle_telegram_event(event))
                
                # Acknowledge message
                await msg.ack()
                
            except Exception as e:
                logger.error(f"❌ Error processing NATS message: {e}", exc_info=True)
                # Don't ack - will retry
        
        # Підписатися на subject
        self._sub = await self._nc.subscribe("agent.telegram.update", cb=message_handler)
        self._running = True
        logger.info("✅ Subscribed to NATS subject: agent.telegram.update")
    
    async def _handle_telegram_event(self, event: TelegramUpdateEvent):
        """Обробити подію Telegram та викликати Router"""
        try:
            metadata = event.metadata or {}

            # Обробка фото (Vision Encoder)
            if "photo" in metadata:
                await self._handle_photo(event, metadata)
                return
            
            # Обробка документів (Parser Service)
            if "document" in metadata:
                await self._handle_document(event, metadata)
                return
            
            # Звичайні текстові повідомлення
            if not event.text:
                logger.debug(f"Skipping event without text: agent={event.agent_id}")
                return
            
            # Отримати системний промпт для агента
            system_prompt = self._get_system_prompt(event.agent_id)
            
            # Викликати Router через HTTP API
            # Структура: payload.context.system_prompt (як очікує Router)
            router_request = {
                "message": event.text,
                "mode": "chat",
                "agent": event.agent_id,
                "source": "telegram",
                "user_id": f"tg:{event.user_id}",
                "session_id": f"telegram:{event.chat_id}",
                "payload": {
                    "context": {
                        "agent_name": event.agent_id.upper(),
                        "system_prompt": system_prompt,  # Системний промпт для агента
                    }
                }
            }
            
            # Детальне логування перед відправкою
            payload_keys = list(router_request.get('payload', {}).keys())
            context_keys = list(router_request.get('payload', {}).get('context', {}).keys())
            sp_len = len(system_prompt) if system_prompt else 0
            
            logger.info(
                f"📞 Calling Router: agent={event.agent_id}, chat={event.chat_id}"
            )
            logger.info(
                f"   payload.keys={payload_keys}, "
                f"context.keys={context_keys}, "
                f"system_prompt_len={sp_len}"
            )
            if system_prompt:
                logger.info(f"   system_prompt preview: {system_prompt[:80]}...")
            
            # Логування JSON перед відправкою (з повним system_prompt для діагностики)
            import json
            full_json = json.dumps(router_request, ensure_ascii=False)
            logger.info(f"📤 Full request JSON length: {len(full_json)} bytes")
            logger.info(f"📤 Payload.context.system_prompt in request: {router_request.get('payload', {}).get('context', {}).get('system_prompt', '')[:100]}...")
            
            async with httpx.AsyncClient(timeout=120.0) as client:  # Збільшено timeout до 120 сек
                logger.info(f"📡 Sending HTTP POST to {self._router_url}/route")
                response = await client.post(
                    f"{self._router_url}/route",
                    json=router_request
                )
                logger.info(f"📡 Router response status: {response.status_code}")
                
                # Перевірка на 502 Bad Gateway
                if response.status_code == 502:
                    logger.error(f"❌ Router returned 502 Bad Gateway for agent={event.agent_id}")
                    await telegram_listener.send_message(
                        agent_id=event.agent_id,
                        chat_id=event.chat_id,
                        text="⚠️ Вибач, зараз велике навантаження. Спробуй через хвилину."
                    )
                    return
                
                response.raise_for_status()
                result = response.json()
            
            # Отримати відповідь
            answer = None
            if isinstance(result, dict):
                answer = (
                    result.get("data", {}).get("text") or 
                    result.get("data", {}).get("answer") or
                    result.get("response") or
                    result.get("text")
                )
            
            if not answer:
                logger.warning(f"⚠️ No answer from Router for agent={event.agent_id}")
                answer = "Вибач, зараз не можу відповісти."
            
            logger.info(f"📤 Sending response: agent={event.agent_id}, chat={event.chat_id}, len={len(answer)}")
            
            # Перевірити чи треба відповідати голосом (якщо користувач надіслав voice)
            raw_update = event.raw_update or {}
            should_reply_voice = raw_update.get("voice") or raw_update.get("audio") or raw_update.get("video_note")
            
            if should_reply_voice:
                # Синтезувати голос
                audio_bytes = await self._text_to_speech(answer)
                if audio_bytes:
                    logger.info(f"🔊 Sending voice response: agent={event.agent_id}, audio_size={len(audio_bytes)}")
                    await telegram_listener.send_voice(
                        agent_id=event.agent_id,
                        chat_id=event.chat_id,
                        audio_bytes=audio_bytes
                    )
                else:
                    # Fallback to text
                    await telegram_listener.send_message(
                        agent_id=event.agent_id,
                        chat_id=event.chat_id,
                        text=answer
                    )
            else:
                # Звичайна текстова відповідь
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text=answer
                )
            
            logger.info(f"✅ Response sent: agent={event.agent_id}, chat={event.chat_id}")
            
        except httpx.HTTPError as e:
            logger.error(f"❌ HTTP error calling Router: {e}")
            # Відправити повідомлення про помилку користувачу
            try:
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text="❌ Помилка зв'язку з сервером. Спробуй ще раз."
                )
            except:
                pass
        except Exception as e:
            logger.error(f"❌ Error handling Telegram event: {e}", exc_info=True)
    
    async def _handle_photo(self, event: TelegramUpdateEvent, metadata: Dict[str, Any]):
        """Обробити фото через Swapper vision-8b модель"""
        try:
            photo_info = metadata.get("photo", {})
            file_url = photo_info.get("file_url", "")
            caption = event.text or ""
            
            logger.info(f"🖼️ Processing photo: agent={event.agent_id}, url={file_url[:50]}...")
            
            # Відправити до Router з specialist_vision_8b через Swapper
            router_request = {
                "message": f"Опиши це зображення детально: {file_url}",
                "mode": "chat",
                "agent": event.agent_id,
                "metadata": {
                    "source": "telegram",
                    "chat_id": event.chat_id,
                    "file_url": file_url,
                    "has_image": True,
                },
            }
            
            # Override LLM to use specialist_vision_8b for image understanding
            router_request["metadata"]["use_llm"] = "specialist_vision_8b"
            
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(f"{self._router_url}/route", json=router_request)
                    response.raise_for_status()
                    result = response.json()
                    
                    if result.get("ok"):
                        answer_text = result.get("data", {}).get("text") or result.get("response", "")
                        if answer_text:
                            await telegram_listener.send_message(
                                agent_id=event.agent_id,
                                chat_id=event.chat_id,
                                text=f"✅ **Фото оброблено**\n\n{answer_text}"
                            )
                            return
                    
                    # Якщо помилка
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"Router error: {error_msg}")
                    await telegram_listener.send_message(
                        agent_id=event.agent_id,
                        chat_id=event.chat_id,
                        text=f"Вибач, не вдалося обробити фото: {error_msg}"
                    )
            except Exception as e:
                logger.error(f"Error calling Router: {e}", exc_info=True)
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text="Вибач, не вдалося обробити фото. Переконайся, що Swapper Service з vision-8b моделлю запущений."
                )
            
            logger.info(f"✅ Photo response sent: agent={event.agent_id}, chat={event.chat_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling photo: {e}", exc_info=True)
            try:
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text="❌ Помилка обробки зображення."
                )
            except:
                pass
    
    async def _handle_document(self, event: TelegramUpdateEvent, metadata: Dict[str, Any]):
        """Обробити PDF через Parser Service"""
        try:
            doc_info = metadata.get("document", {})
            file_url = doc_info.get("file_url", "")
            file_name = doc_info.get("file_name", "document.pdf")
            
            logger.info(f"📄 Processing document: agent={event.agent_id}, file={file_name}")
            
            # Викликати Parser Service через DAGI Router
            parsed_content = await self._parse_document(file_url, file_name)
            
            # Якщо є питання в caption/text - відповісти на основі parsed content
            user_question = event.text
            if user_question and user_question != f"[DOCUMENT] {file_name}":
                # Додати parsed content до контексту
                system_prompt = self._get_system_prompt(event.agent_id)
                
                enhanced_text = f"Користувач запитує про документ '{file_name}':\n{user_question}\n\n[DOCUMENT_CONTENT]:\n{parsed_content[:2000]}"
                
                # Викликати Router для відповіді
                router_request = {
                    "message": enhanced_text,
                    "mode": "chat",
                    "agent": event.agent_id,
                    "source": "telegram",
                    "user_id": f"tg:{event.user_id}",
                    "session_id": f"telegram:{event.chat_id}",
                    "payload": {
                        "context": {
                            "agent_name": event.agent_id.upper(),
                            "system_prompt": system_prompt,
                        }
                    }
                }
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{self._router_url}/route",
                        json=router_request
                    )
                    
                    if response.status_code == 502:
                        await telegram_listener.send_message(
                            agent_id=event.agent_id,
                            chat_id=event.chat_id,
                            text="⚠️ Вибач, зараз велике навантаження. Спробуй через хвилину."
                        )
                        return
                    
                    response.raise_for_status()
                    result = response.json()
                
                # Отримати відповідь
                answer = (
                    result.get("data", {}).get("text") or 
                    result.get("data", {}).get("answer") or
                    result.get("response") or
                    result.get("text") or
                    "Вибач, не зміг проаналізувати документ."
                )
                
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text=answer
                )
            else:
                # Просто парсинг без питання
                summary = parsed_content[:500] if parsed_content else "Документ оброблено"
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text=f"✅ Документ '{file_name}' оброблено.\n\n{summary}...\n\nЗадай питання про нього!"
                )
            
            logger.info(f"✅ Document response sent: agent={event.agent_id}, chat={event.chat_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling document: {e}", exc_info=True)
            try:
                await telegram_listener.send_message(
                    agent_id=event.agent_id,
                    chat_id=event.chat_id,
                    text="❌ Помилка обробки документу. Спробуй ще раз."
                )
            except:
                pass
    
    async def _parse_document(self, doc_url: str, file_name: str) -> str:
        """Викликати Parser Service для PDF"""
        try:
            logger.info(f"📡 Calling Parser Service: url={doc_url[:50]}..., file={file_name}")
            
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
                                "output_mode": "markdown"
                            }
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                # Витягнути parsed content
                if "data" in result:
                    markdown = result["data"].get("markdown", "")
                    if markdown:
                        return markdown
                
                # Fallback
                return result.get("text", "") or result.get("response", "") or "Документ оброблено"
                
        except Exception as e:
            logger.error(f"❌ Parser Service error: {e}")
            return "[Не вдалося прочитати документ]"
    
    async def _text_to_speech(self, text: str) -> bytes:
        """Синтезувати голос через TTS Service"""
        try:
            logger.info(f"🔊 Calling TTS Service: text_len={len(text)}")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "http://dagi-tts:9100/tts",
                    json={
                        "text": text[:500],  # Обмежуємо довжину для TTS
                        "lang": "uk"
                    }
                )
                response.raise_for_status()
                audio_bytes = response.content
                
                logger.info(f"✅ TTS response: {len(audio_bytes)} bytes")
                return audio_bytes
                
        except Exception as e:
            logger.error(f"❌ TTS Service error: {e}")
            return b""  # Fallback to text
    
    def _get_system_prompt(self, agent_id: str) -> str:
        """Отримати системний промпт для агента"""
        # Системні промпти для агентів
        prompts = {
            "helion": """Ти - Helion, AI-агент платформи Energy Union екосистеми DAARION.city.
Допомагай користувачам з технологіями EcoMiner/BioMiner, токеномікою та DAO governance.

Твої основні функції:
- Консультації з енергетичними технологіями (сонячні панелі, вітряки, біогаз)
- Пояснення токеноміки Energy Union (ENERGY токен, стейкінг, винагороди)
- Допомога з onboarding в DAO
- Відповіді на питання про EcoMiner/BioMiner устаткування

Стиль спілкування:
- професійний, технічний, але зрозумілий
- точний у цифрах та даних
- конструктивний у рекомендаціях

Важливо:
- Не вигадуй дані, яких немає в системі
- Якщо дані недоступні — чесно скажи про це
- Не давай фінансових порад без консультації з експертами""",
            
            "daarwizz": """Ти — DAARWIZZ, офіційний AI-агент екосистеми DAARION.city.
Допомагай учасникам з microDAO, ролями та процесами.
Відповідай коротко, практично, враховуй RBAC контекст користувача.""",
            
            "greenfood": """Ти — GREENFOOD Assistant, фронтовий оркестратор ERP-системи для крафтових виробників, хабів та покупців.

Твоя місія: зрозуміти, хто з тобою говорить (комітент, менеджер складу, логіст, бухгалтер, маркетолог, покупець), виявити намір і делегувати завдання спеціалізованим агентам GREENFOOD.

У твоєму розпорядженні 12 спеціалізованих агентів:
- Product & Catalog (каталог товарів)
- Batch & Quality (партії та якість)
- Vendor Success (успіх комітентів)
- Warehouse (склад)
- Logistics & Delivery (доставка)
- Seller (продажі)
- Customer Care (підтримка)
- Finance & Pricing (фінанси)
- SMM & Campaigns (маркетинг)
- SEO & Web (SEO)
- Analytics & BI (аналітика)
- Compliance & Audit (аудит)

Правила роботи:
- Спочатку уточнюй роль і контекст
- Перетворюй запит на чітку дію
- Не вигадуй дані - якщо чогось немає, чесно кажи
- Завжди давай коротке резюме: що зроблено, наступні кроки

Відповідай українською, чітко та по-діловому.""",
        }
        
        prompt = prompts.get(agent_id.lower(), "")
        if prompt:
            logger.debug(f"Using system prompt for agent={agent_id}, len={len(prompt)}")
        else:
            logger.warning(f"No system prompt found for agent={agent_id}")
        
        return prompt
    
    async def close(self):
        """Закрити підписку та з'єднання"""
        self._running = False
        if self._sub:
            await self._sub.unsubscribe()
        if self._nc and not self._nc.is_closed:
            await self._nc.drain()
            await self._nc.close()
        logger.info("RouterHandler closed")


router_handler = RouterHandler()

