"""Presence aggregation logic with caching and broadcasting"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
import logging

from .models import PresenceSnapshot, RoomPresence, CityPresence, AgentPresence
from .matrix_client import MatrixClient
from .rooms_source import RoomsSource
from .agents_source import AgentsSource

logger = logging.getLogger(__name__)


class PresenceAggregator:
    """
    Aggregates presence data from Matrix and broadcasts to subscribers.
    
    - Periodically polls Matrix for room members and presence
    - Fetches agent status from database
    - Caches the latest snapshot
    - Broadcasts updates to SSE subscribers
    """
    
    def __init__(
        self,
        matrix_client: MatrixClient,
        rooms_source: RoomsSource,
        agents_source: Optional[AgentsSource] = None,
        poll_interval_seconds: int = 5,
    ):
        self.matrix_client = matrix_client
        self.rooms_source = rooms_source
        self.agents_source = agents_source
        self.poll_interval_seconds = poll_interval_seconds

        self._snapshot: Optional[PresenceSnapshot] = None
        self._subscribers: List[asyncio.Queue] = []
        self._running = False

    def get_snapshot(self) -> Optional[PresenceSnapshot]:
        """Get the latest cached snapshot"""
        return self._snapshot

    def register_subscriber(self) -> asyncio.Queue:
        """Register a new SSE subscriber"""
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(q)
        logger.info(f"Subscriber registered. Total: {len(self._subscribers)}")
        return q

    def unregister_subscriber(self, q: asyncio.Queue):
        """Unregister an SSE subscriber"""
        if q in self._subscribers:
            self._subscribers.remove(q)
            logger.info(f"Subscriber unregistered. Total: {len(self._subscribers)}")

    async def _broadcast(self, snapshot: PresenceSnapshot):
        """Broadcast snapshot to all subscribers"""
        for q in list(self._subscribers):
            try:
                # Don't block if queue is full
                if q.qsize() < 10:
                    await q.put(snapshot)
            except asyncio.CancelledError:
                pass

    async def _compute_snapshot(self) -> PresenceSnapshot:
        """Compute a new presence snapshot from Matrix and agents DB"""
        rooms = self.rooms_source.get_rooms()
        
        if not rooms:
            logger.warning("No rooms with matrix_room_id found")

        # Fetch agents from database
        all_agents: List[AgentPresence] = []
        agents_by_room: dict = {}
        
        if self.agents_source:
            try:
                online_agents = self.agents_source.get_online_agents()
                for agent in online_agents:
                    ap = AgentPresence(
                        agent_id=agent["agent_id"],
                        display_name=agent["display_name"],
                        kind=agent.get("kind", "assistant"),
                        status=agent.get("status", "online"),
                        room_id=agent.get("room_id"),
                        color=agent.get("color", "cyan"),
                        node_id=agent.get("node_id"),
                        district=agent.get("district"),
                        model=agent.get("model"),
                        role=agent.get("role"),
                        avatar_url=agent.get("avatar_url"),
                    )
                    all_agents.append(ap)
                    
                    # Group by room
                    room_id = agent.get("room_id")
                    if room_id:
                        if room_id not in agents_by_room:
                            agents_by_room[room_id] = []
                        agents_by_room[room_id].append(ap)
                        
            except Exception as e:
                logger.error(f"Error fetching agents: {e}")

        room_presences: List[RoomPresence] = []
        city_online_total = 0
        rooms_online = 0

        for r in rooms:
            matrix_room_id = r["matrix_room_id"]
            room_id = r["room_id"]
            
            try:
                # Get room members
                members = await self.matrix_client.get_room_members(matrix_room_id)
                
                # Get presence for each member
                online_count = 0
                for member in members:
                    user_id = member.get("user_id")
                    if not user_id:
                        continue
                    
                    presence = await self.matrix_client.get_presence(user_id)
                    if presence in ("online", "unavailable"):
                        online_count += 1

                # Get typing (currently returns empty, needs sync loop)
                typing_users = await self.matrix_client.get_room_typing(matrix_room_id)
                typing_count = len(typing_users)

                if online_count > 0:
                    rooms_online += 1

                city_online_total += online_count

                # Get agents for this room
                room_agents = agents_by_room.get(room_id, [])

                room_presences.append(
                    RoomPresence(
                        room_id=room_id,
                        matrix_room_id=matrix_room_id,
                        online=online_count,
                        typing=typing_count,
                        agents=room_agents,
                    )
                )
                
            except Exception as e:
                logger.error(f"Error processing room {room_id}: {e}")
                # Add room with 0 online but include agents
                room_agents = agents_by_room.get(room_id, [])
                room_presences.append(
                    RoomPresence(
                        room_id=room_id,
                        matrix_room_id=matrix_room_id,
                        online=0,
                        typing=0,
                        agents=room_agents,
                    )
                )

        snapshot = PresenceSnapshot(
            timestamp=datetime.now(timezone.utc),
            city=CityPresence(
                online_total=city_online_total,
                rooms_online=rooms_online,
                agents_online=len(all_agents),
            ),
            rooms=room_presences,
            agents=all_agents,
        )
        
        logger.info(f"Computed snapshot: {city_online_total} online, {len(all_agents)} agents in {rooms_online} rooms")
        return snapshot

    async def run_forever(self):
        """Main loop - continuously compute and broadcast snapshots"""
        self._running = True
        logger.info(f"Starting presence aggregator (poll interval: {self.poll_interval_seconds}s)")
        
        while self._running:
            try:
                snapshot = await self._compute_snapshot()
                self._snapshot = snapshot
                await self._broadcast(snapshot)
            except Exception as e:
                logger.error(f"Error in aggregator loop: {e}")
            
            await asyncio.sleep(self.poll_interval_seconds)

    def stop(self):
        """Stop the aggregator loop"""
        self._running = False
        logger.info("Stopping presence aggregator")


