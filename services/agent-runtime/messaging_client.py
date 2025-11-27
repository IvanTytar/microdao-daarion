import httpx
import os
from models import ChannelMessage
from datetime import datetime

MESSAGING_SERVICE_URL = os.getenv("MESSAGING_SERVICE_URL", "http://messaging-service:7004")

async def get_channel_messages(channel_id: str, limit: int = 50) -> list[ChannelMessage]:
    """
    Fetch recent messages from channel
    
    Returns list of ChannelMessage objects for context
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{MESSAGING_SERVICE_URL}/api/messaging/channels/{channel_id}/messages",
                params={"limit": limit}
            )
            response.raise_for_status()
            data = response.json()
            
            messages = []
            for msg in data:
                try:
                    messages.append(ChannelMessage(
                        sender_id=msg.get("sender_id", "unknown"),
                        sender_type=msg.get("sender_type", "human"),
                        content=msg.get("body", msg.get("content_preview", "")),
                        created_at=datetime.fromisoformat(msg.get("created_at", datetime.now().isoformat()).replace('Z', '+00:00'))
                    ))
                except Exception as e:
                    print(f"⚠️ Error parsing message: {e}")
                    continue
            
            print(f"✅ Fetched {len(messages)} messages from channel {channel_id}")
            return messages
    except httpx.HTTPStatusError as e:
        print(f"⚠️ HTTP error fetching messages: {e.response.status_code}")
        return []
    except Exception as e:
        print(f"⚠️ Error fetching messages: {e}")
        return []

async def post_message(agent_id: str, channel_id: str, text: str) -> bool:
    """
    Post agent reply to channel
    
    Returns True if successful, False otherwise
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{MESSAGING_SERVICE_URL}/internal/agents/{agent_id}/post-to-channel",
                json={
                    "channel_id": channel_id,
                    "text": text
                }
            )
            response.raise_for_status()
            print(f"✅ Posted message to channel {channel_id}")
            return True
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP error posting message: {e.response.status_code}")
        if e.response.status_code == 404:
            print(f"   Endpoint not found. You may need to add it to messaging-service.")
        return False
    except Exception as e:
        print(f"❌ Error posting message: {e}")
        return False




