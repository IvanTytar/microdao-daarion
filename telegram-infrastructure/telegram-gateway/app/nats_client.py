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

