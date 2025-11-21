import logging
from typing import Dict, Optional, List

from .models import BotRegistration
from .config import BotConfig

logger = logging.getLogger(__name__)


class BotsRegistry:
    """
    Реєстр ботів з підтримкою ініціалізації з конфігурації.
    TODO: замінити на персистентне сховище (PostgreSQL/microdao DB).
    """
    def __init__(self) -> None:
        self._agent_to_token: Dict[str, str] = {}
        self._token_to_agent: Dict[str, str] = {}

    def register(self, reg: BotRegistration) -> None:
        """Реєстрація бота через BotRegistration (HTTP API)"""
        self._agent_to_token[reg.agent_id] = reg.bot_token
        self._token_to_agent[reg.bot_token] = reg.agent_id
        logger.info(f"Registered bot: agent_id={reg.agent_id}, token={reg.bot_token[:8]}...")

    def register_from_config(self, bot_config: BotConfig) -> None:
        """Реєстрація бота з BotConfig (конфігурація)"""
        if not bot_config.enabled:
            logger.debug(f"Skipping disabled bot: agent_id={bot_config.agent_id}")
            return
        self._agent_to_token[bot_config.agent_id] = bot_config.bot_token
        self._token_to_agent[bot_config.bot_token] = bot_config.agent_id
        logger.info(f"Registered bot from config: agent_id={bot_config.agent_id}, token={bot_config.bot_token[:8]}...")

    def register_batch(self, bot_configs: List[BotConfig]) -> None:
        """Масове реєстрування ботів з конфігурації"""
        for bot_config in bot_configs:
            self.register_from_config(bot_config)

    def get_token_by_agent(self, agent_id: str) -> Optional[str]:
        return self._agent_to_token.get(agent_id)

    def get_agent_by_token(self, bot_token: str) -> Optional[str]:
        return self._token_to_agent.get(bot_token)

    def list_agents(self) -> List[str]:
        """Повернути список всіх зареєстрованих agent_id"""
        return list(self._agent_to_token.keys())


bots_registry = BotsRegistry()

