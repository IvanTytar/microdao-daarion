# DAARION Messaging Service

**Matrix-aware messaging service for DAARION**

## Overview

The messaging-service provides a DAARION-specific API layer over Matrix protocol:
- Manages channels (mapped to Matrix rooms)
- Indexes messages (full content stored in Matrix)
- Handles real-time WebSocket connections
- Integrates agents into conversations
- Bridges Matrix ↔ DAARION entity model

## Architecture

```
Frontend (React)
    ↓
messaging-service (FastAPI)
    ↓
matrix-gateway (internal)
    ↓
Matrix Homeserver (Synapse)
```

## Features

✅ Channel management (create, list, update)  
✅ Message sending/receiving  
✅ Real-time WebSocket subscriptions  
✅ Agent posting to channels  
✅ Member invitations (users + agents)  
✅ Threading/replies support  
✅ Reactions (via Matrix)  
✅ Message editing/deletion (via Matrix redaction)

## Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL (with messenger schema migrated)
- matrix-gateway service running
- Matrix homeserver (Synapse/Dendrite)

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment variables

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/daarion"
export MATRIX_GATEWAY_URL="http://matrix-gateway:7003"
export MATRIX_GATEWAY_SECRET="your-shared-secret"
export NATS_URL="nats://localhost:4222"
```

### 4. Run migrations

```bash
psql -d daarion -f ../../migrations/001_create_messenger_schema.sql
```

### 5. Start service

```bash
uvicorn main:app --host 0.0.0.0 --port 7004 --reload
```

Service will be available at `http://localhost:7004`

## API Documentation

Interactive API docs: http://localhost:7004/docs

### Key endpoints

#### Channels
- `GET /api/messaging/channels` — List channels
- `POST /api/messaging/channels` — Create channel (creates Matrix room)
- `GET /api/messaging/channels/{id}` — Get channel details

#### Messages
- `GET /api/messaging/channels/{id}/messages` — List messages (paginated)
- `POST /api/messaging/channels/{id}/messages` — Send message

#### Members
- `GET /api/messaging/channels/{id}/members` — List members
- `POST /api/messaging/channels/{id}/members` — Invite member

#### WebSocket
- `WS /ws/messaging/{channel_id}` — Real-time message stream

#### Internal (agent integration)
- `POST /internal/agents/{agent_id}/post-to-channel` — Agent posting

## Matrix Integration

### Channel → Room mapping

Every DAARION channel is backed by a Matrix room:

| DAARION | Matrix |
|---------|--------|
| `channels.id` | Unique UUID |
| `channels.matrix_room_id` | `!roomid:daarion.city` |
| `channels.slug` | Room alias (`#slug:daarion.city`) |
| `channels.visibility` | Room visibility (`public`/`private`) |

### Message → Event mapping

DAARION messages are indexed references to Matrix events:

| DAARION | Matrix |
|---------|--------|
| `messages.id` | Unique UUID |
| `messages.matrix_event_id` | `$eventid:daarion.city` |
| `messages.content_preview` | Truncated text (full in Matrix) |
| `messages.sender_id` | DAARION entity ID (`user:...`, `agent:...`) |
| `messages.sender_matrix_id` | Matrix user ID (`@user:server`) |

### Why index messages?

We don't duplicate Matrix events in full, only index them for:
- Fast listing and pagination
- MicroDAO context filtering
- Agent memory integration
- Task/project linking
- Analytics and metrics

Full message content is always fetched from Matrix when needed.

## Database Schema

See `../../migrations/001_create_messenger_schema.sql`

Key tables:
- `channels` — Channel metadata + Matrix room mapping
- `messages` — Message index (not full content)
- `channel_members` — Membership + permissions
- `message_reactions` — Reactions index
- `channel_events` — Audit log

## NATS Events

Published by messaging-service:

### `messaging.message.created`
```json
{
  "channel_id": "uuid",
  "matrix_event_id": "$event:server",
  "sender_id": "user:alice",
  "sender_type": "human",
  "preview": "Hello world",
  "created_at": "2025-11-24T10:30:00Z"
}
```

### `messaging.channel.created`
```json
{
  "channel_id": "uuid",
  "microdao_id": "microdao:7",
  "matrix_room_id": "!room:server",
  "created_by": "user:alice"
}
```

### `messaging.member.invited`
```json
{
  "channel_id": "uuid",
  "member_id": "agent:sofia",
  "invited_by": "user:admin",
  "role": "agent"
}
```

## Agent Integration

Agents can post to channels via internal API:

```python
POST /internal/agents/agent:sofia/post-to-channel
{
  "channel_id": "uuid",
  "text": "Hello from Sofia!"
}
```

Requirements:
- Agent must be a member of the channel
- Agent posts are sent as `m.notice` messages in Matrix
- Agent messages are indexed with `sender_type="agent"`

## WebSocket Protocol

Connect to `/ws/messaging/{channel_id}`:

**Client → Server:**
```json
"ping"
```

**Server → Client:**
```json
"pong"
```

**Server → Client (new message):**
```json
{
  "type": "message.created",
  "message": {
    "id": "uuid",
    "channel_id": "uuid",
    "sender_id": "user:alice",
    "content_preview": "Hello!",
    "created_at": "2025-11-24T10:30:00Z"
  }
}
```

## Element Compatibility

All channels created via messaging-service are **visible in Element**:
- Same Matrix homeserver
- Standard Matrix room types
- Federation enabled (optional)
- E2EE support (optional, per channel)

Users can use Element, DAARION UI, or any Matrix client interchangeably.

## Security

- **Authentication:** X-User-Id header (TODO: replace with JWT)
- **Authorization:** Channel membership + permissions checked
- **Matrix gateway:** Internal service, not exposed to public
- **Confidential mode:** E2EE channels, content not indexed

## Testing

### Manual testing with httpx

```python
import httpx

# Create channel
resp = httpx.post(
    "http://localhost:7004/api/messaging/channels",
    headers={"X-User-Id": "user:admin"},
    json={
        "slug": "test",
        "name": "Test Channel",
        "microdao_id": "microdao:daarion",
        "visibility": "public"
    }
)
channel = resp.json()

# Send message
resp = httpx.post(
    f"http://localhost:7004/api/messaging/channels/{channel['id']}/messages",
    headers={"X-User-Id": "user:alice"},
    json={
        "text": "Hello from Alice!"
    }
)
message = resp.json()
```

### Testing with Element

1. Login to Element with Matrix user
2. Join room by alias: `#test-daarion:daarion.city`
3. Send message in Element
4. Check it appears in DAARION UI (via `/api/messaging/channels/.../messages`)

## Deployment

### Docker

```bash
docker build -t daarion/messaging-service .
docker run -p 7004:7004 \
  -e DATABASE_URL="postgresql://..." \
  -e MATRIX_GATEWAY_URL="http://matrix-gateway:7003" \
  daarion/messaging-service
```

### Docker Compose

See `../../docker-compose.yml` for full stack deployment.

### Production checklist

- [ ] Enable JWT authentication (replace X-User-Id header)
- [ ] Add rate limiting (per user, per channel)
- [ ] Enable NATS event publishing
- [ ] Configure Matrix webhook subscriptions
- [ ] Set up monitoring (Prometheus metrics)
- [ ] Configure logging (structured JSON)
- [ ] Enable HTTPS/TLS for WebSocket
- [ ] Set DATABASE_URL from secrets
- [ ] Set MATRIX_GATEWAY_SECRET from secrets

## Roadmap

### v1.1
- [ ] NATS JetStream integration
- [ ] Matrix webhook subscription (push model)
- [ ] Message search (full-text via PostgreSQL)
- [ ] Typing indicators
- [ ] Read receipts

### v1.2
- [ ] Voice messages
- [ ] File uploads (via Matrix media API)
- [ ] Link previews
- [ ] Message pinning

### v2.0
- [ ] End-to-end encryption (E2EE) support
- [ ] Voice/video calls (via Matrix VoIP)
- [ ] Spaces support (channel groups)

## Troubleshooting

### "Failed to create Matrix room"

Check matrix-gateway is running:
```bash
curl http://localhost:7003/health
```

### "Database connection failed"

Check PostgreSQL is running and migrations applied:
```bash
psql -d daarion -c "SELECT COUNT(*) FROM channels;"
```

### WebSocket disconnects immediately

Check CORS settings and WebSocket upgrade headers.

## License

MIT

## Maintainer

DAARION Platform Team





