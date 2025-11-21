import os
import yaml
import logging
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class BotConfig(BaseModel):
    """Конфігурація одного бота"""
    agent_id: str
    bot_token: str
    # Опційно: додаткові параметри
    enabled: bool = True
    description: Optional[str] = None


class Settings(BaseSettings):
    """
    Налаштування telegram-gateway сервісу.
    
    Інтеграція з DAGI Stack:
    - Router: порт 9102 (http://router:9102)
    - NATS: порт 4222 (nats://nats:4222)
    - Local Telegram Bot API: порт 8081 (http://telegram-bot-api:8081)
    
    Див. INFRASTRUCTURE.md для повної інформації про інфраструктуру.
    """
    # Local Telegram Bot API (Docker service)
    # Використовується для long polling без SSL/webhook
    TELEGRAM_API_BASE: str = "http://telegram-bot-api:8081"

    # NATS event bus (DAGI Stack)
    # Публікація подій agent.telegram.update для Router/microDAO
    NATS_URL: str = "nats://nats:4222"

    # DAGI Router (опційно, для майбутньої інтеграції)
    # Використовується для маршрутизації повідомлень до агентів
    ROUTER_BASE_URL: str = "http://router:9102"

    # Debug логування (true для детальних логів)
    DEBUG: bool = False

    # Шлях до файлу конфігурації ботів (опційно)
    # За замовчуванням: /app/bots.yaml (в контейнері) або ./bots.yaml (локально)
    BOTS_CONFIG_FILE: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def load_bots_config() -> List[BotConfig]:
    """
    Завантажити конфігурацію ботів з:
    1. YAML файлу (якщо вказано BOTS_CONFIG_FILE або /app/bots.yaml в контейнері)
    2. Environment variables (BOT_<AGENT_ID>_TOKEN)
    3. Повернути порожній список, якщо нічого не знайдено
    
    Пріоритет:
    1. bots.yaml (якщо існує)
    2. Environment variables: BOT_<AGENT_ID>_TOKEN
    """
    bots: List[BotConfig] = []

    # Спробувати завантажити з YAML
    config_file = settings.BOTS_CONFIG_FILE
    if not config_file:
        # Спочатку спробувати /app/bots.yaml (шлях в контейнері)
        container_path = Path("/app/bots.yaml")
        if container_path.exists():
            config_file = container_path
        else:
            # Fallback: шукати bots.yaml в корені telegram-gateway (для локальної розробки)
            gateway_root = Path(__file__).parent.parent
            config_file = gateway_root / "bots.yaml"

    if config_file and Path(config_file).exists():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data and "bots" in data:
                    for bot_data in data["bots"]:
                        bots.append(BotConfig(**bot_data))
            logger.info(f"✅ Loaded {len(bots)} bot(s) from {config_file}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load bots from {config_file}: {e}")

    # Fallback: завантажити з env variables
    if not bots:
        env_prefix = "BOT_"
        for key, value in os.environ.items():
            if key.startswith(env_prefix) and key.endswith("_TOKEN"):
                # Витягти agent_id з ключа: BOT_DAARWIZZ_TOKEN -> daarwizz
                agent_id = key[len(env_prefix):-len("_TOKEN")].lower()
                # Перевірити, чи вже не додано з YAML
                if not any(b.agent_id == agent_id for b in bots):
                    bots.append(BotConfig(
                        agent_id=agent_id,
                        bot_token=value,
                        enabled=True
                    ))
                    logger.info(f"✅ Loaded bot '{agent_id}' from environment variable {key}")

    return bots

