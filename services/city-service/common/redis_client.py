"""
Redis Client для DAARION
Використовується для Presence System та інших real-time features
"""

import os
import redis.asyncio as aioredis
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """
    Отримати Redis клієнт (singleton)
    """
    global _redis_client
    
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        try:
            _redis_client = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10
            )
            logger.info(f"✅ Redis connected: {redis_url}")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise
    
    return _redis_client


async def close_redis():
    """
    Закрити Redis connection
    """
    global _redis_client
    
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("❌ Redis connection closed")


class PresenceRedis:
    """
    Helper для роботи з Presence System в Redis
    """
    
    PREFIX = "presence:user:"
    TTL = 40  # seconds
    
    @staticmethod
    async def set_online(user_id: str) -> None:
        """Встановити користувача онлайн"""
        redis = await get_redis()
        key = f"{PresenceRedis.PREFIX}{user_id}"
        await redis.setex(key, PresenceRedis.TTL, "online")
    
    @staticmethod
    async def is_online(user_id: str) -> bool:
        """Перевірити чи користувач онлайн"""
        redis = await get_redis()
        key = f"{PresenceRedis.PREFIX}{user_id}"
        value = await redis.get(key)
        return value == "online"
    
    @staticmethod
    async def get_all_online() -> list[str]:
        """Отримати всіх онлайн користувачів"""
        redis = await get_redis()
        pattern = f"{PresenceRedis.PREFIX}*"
        keys = []
        
        async for key in redis.scan_iter(match=pattern, count=100):
            user_id = key.replace(PresenceRedis.PREFIX, "")
            keys.append(user_id)
        
        return keys
    
    @staticmethod
    async def get_online_count() -> int:
        """Отримати кількість онлайн користувачів"""
        users = await PresenceRedis.get_all_online()
        return len(users)
    
    @staticmethod
    async def refresh_ttl(user_id: str) -> None:
        """Оновити TTL для користувача (heartbeat)"""
        redis = await get_redis()
        key = f"{PresenceRedis.PREFIX}{user_id}"
        
        # Перевірити чи key існує
        exists = await redis.exists(key)
        if exists:
            await redis.expire(key, PresenceRedis.TTL)
        else:
            # Якщо не існує — створити
            await redis.setex(key, PresenceRedis.TTL, "online")

