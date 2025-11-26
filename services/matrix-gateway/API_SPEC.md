# Matrix Gateway API Specification

**Version:** 1.0.0  
**Service:** matrix-gateway  
**Port:** 7003 (internal only)  
**Purpose:** Internal service for Matrix protocol integration

---

## Overview

The **matrix-gateway** is an internal service that:
- Wraps Matrix Client-Server API
- Provides simplified endpoints for DAARION services
- Handles Matrix authentication and session management
- Transforms Matrix events ↔ DAARION internal DTOs
- Manages webhook subscriptions for real-time events

**NOT exposed to public internet** — internal service mesh only.

---

## Architecture

```
┌─────────────────┐
│ messaging-service│
│                 │
│  (DAARION API) │
└────────┬────────┘
         │
         │ HTTP (internal)
         ▼
┌─────────────────┐
│ matrix-gateway  │
│                 │
│  (Matrix API)  │
└────────┬────────┘
         │
         │ Matrix C-S API
         ▼
┌─────────────────┐
│ Matrix Homeserver│
│   (Synapse)     │
└─────────────────┘
```

---

## Authentication

All requests must include:
```
X-Internal-Service-Token: <shared-secret>
```

Services authenticate via shared secret (not Matrix access tokens).

---

## Endpoints

### 1. Room Management

#### **POST /internal/matrix/create-room**

Create a new Matrix room.

**Request:**
```json
{
  "name": "General Discussion",
  "topic": "Main DAARION.city channel",
  "visibility": "public",
  "room_alias_name": "general",
  "preset": "public_chat",
  "initial_state": [
    {
      "type": "m.room.guest_access",
      "state_key": "",
      "content": { "guest_access": "can_join" }
    }
  ],
  "power_level_content_override": {
    "users": {
      "@daarion:daarion.city": 100
    },
    "events": {
      "m.room.name": 50,
      "m.room.topic": 50
    }
  },
  "creation_content": {
    "m.federate": true
  }
}
```

**Response:**
```json
{
  "room_id": "!general:daarion.city",
  "room_alias": "#general:daarion.city"
}
```

**Errors:**
- 400: Invalid request
- 500: Matrix API error

---

#### **GET /internal/matrix/rooms/{roomId}**

Get room details.

**Response:**
```json
{
  "room_id": "!general:daarion.city",
  "name": "General Discussion",
  "topic": "Main DAARION.city channel",
  "avatar_url": "mxc://daarion.city/avatar123",
  "canonical_alias": "#general:daarion.city",
  "member_count": 42,
  "joined_members": 38,
  "encryption": null
}
```

---

#### **PUT /internal/matrix/rooms/{roomId}/name**

Update room name.

**Request:**
```json
{
  "name": "Updated Room Name"
}
```

**Response:**
```json
{
  "event_id": "$event123:daarion.city"
}
```

---

### 2. Message Sending

#### **POST /internal/matrix/send**

Send a message to a room.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "sender": "agent:sofia",
  "sender_matrix_id": "@sofia:daarion.city",
  "msgtype": "m.text",
  "body": "Hello from DAARION!",
  "format": "org.matrix.custom.html",
  "formatted_body": "<p>Hello from <strong>DAARION</strong>!</p>",
  "relates_to": {
    "m.in_reply_to": {
      "event_id": "$parent_event:daarion.city"
    }
  }
}
```

**Response:**
```json
{
  "event_id": "$event456:daarion.city",
  "sent_at": "2025-11-24T10:30:00Z"
}
```

**Supported msgtypes:**
- `m.text` — plain text
- `m.image` — image
- `m.file` — file attachment
- `m.audio` — audio
- `m.video` — video
- `m.notice` — bot/agent notice

---

#### **POST /internal/matrix/send-reaction**

React to a message.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "event_id": "$target_event:daarion.city",
  "reactor": "user:alice",
  "reactor_matrix_id": "@alice:daarion.city",
  "emoji": "👍"
}
```

**Response:**
```json
{
  "event_id": "$reaction789:daarion.city"
}
```

---

#### **POST /internal/matrix/redact**

Redact (delete) a message.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "event_id": "$event_to_delete:daarion.city",
  "reason": "Spam"
}
```

**Response:**
```json
{
  "event_id": "$redaction999:daarion.city"
}
```

---

### 3. Membership

#### **POST /internal/matrix/invite**

Invite a user/agent to a room.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "user_id": "@alice:daarion.city",
  "inviter": "user:admin",
  "inviter_matrix_id": "@admin:daarion.city"
}
```

**Response:**
```json
{
  "status": "invited"
}
```

---

#### **POST /internal/matrix/join**

Join a room (on behalf of user/agent).

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "user_id": "@alice:daarion.city"
}
```

**Response:**
```json
{
  "status": "joined",
  "room_id": "!general:daarion.city"
}
```

---

#### **POST /internal/matrix/leave**

Leave a room.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "user_id": "@alice:daarion.city"
}
```

**Response:**
```json
{
  "status": "left"
}
```

---

#### **POST /internal/matrix/kick**

Kick a user from a room.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "user_id": "@spammer:daarion.city",
  "kicker": "@admin:daarion.city",
  "reason": "Violation of rules"
}
```

**Response:**
```json
{
  "status": "kicked"
}
```

---

### 4. Event Sync

#### **GET /internal/matrix/sync**

Get recent events (polling mode).

**Query params:**
- `since` — sync token (optional)
- `timeout` — long-polling timeout in ms (default 30000)
- `filter` — JSON filter (optional)

**Response:**
```json
{
  "next_batch": "s1234_567_8_9_10",
  "rooms": {
    "join": {
      "!general:daarion.city": {
        "timeline": {
          "events": [
            {
              "type": "m.room.message",
              "event_id": "$event123:daarion.city",
              "sender": "@alice:daarion.city",
              "content": {
                "msgtype": "m.text",
                "body": "Hello!"
              },
              "origin_server_ts": 1732445400000
            }
          ],
          "limited": false,
          "prev_batch": "p1234_567"
        }
      }
    }
  }
}
```

---

#### **POST /internal/matrix/webhook/subscribe**

Subscribe to room events via webhook.

**Request:**
```json
{
  "room_id": "!general:daarion.city",
  "webhook_url": "http://messaging-service:7004/webhooks/matrix-events",
  "events": ["m.room.message", "m.room.member"]
}
```

**Response:**
```json
{
  "subscription_id": "sub-abc123"
}
```

When events occur, matrix-gateway will POST to webhook_url:
```json
{
  "subscription_id": "sub-abc123",
  "room_id": "!general:daarion.city",
  "event": {
    "type": "m.room.message",
    "event_id": "$event456:daarion.city",
    "sender": "@bob:daarion.city",
    "content": {
      "msgtype": "m.text",
      "body": "Hi there"
    },
    "origin_server_ts": 1732445500000
  }
}
```

---

#### **DELETE /internal/matrix/webhook/subscribe/{subscriptionId}**

Unsubscribe from webhook.

**Response:**
```json
{
  "status": "unsubscribed"
}
```

---

### 5. User Management

#### **POST /internal/matrix/register-user**

Register a new Matrix user (for agent or human).

**Request:**
```json
{
  "username": "alice",
  "password": "generated-secure-password",
  "display_name": "Alice",
  "avatar_url": "mxc://daarion.city/avatar456",
  "admin": false
}
```

**Response:**
```json
{
  "user_id": "@alice:daarion.city",
  "access_token": "syt_...",
  "device_id": "DEVICE123"
}
```

---

#### **PUT /internal/matrix/users/{userId}/display-name**

Update user display name.

**Request:**
```json
{
  "display_name": "Alice (Updated)"
}
```

**Response:**
```json
{
  "status": "updated"
}
```

---

#### **PUT /internal/matrix/users/{userId}/avatar**

Update user avatar.

**Request:**
```json
{
  "avatar_url": "mxc://daarion.city/new-avatar"
}
```

**Response:**
```json
{
  "status": "updated"
}
```

---

### 6. Media Upload

#### **POST /internal/matrix/upload**

Upload media (for messages with images/files).

**Request:** `multipart/form-data`
- `file` — file to upload

**Response:**
```json
{
  "content_uri": "mxc://daarion.city/file123",
  "content_type": "image/png",
  "size": 102400
}
```

---

### 7. Room History

#### **GET /internal/matrix/rooms/{roomId}/messages**

Get paginated message history.

**Query params:**
- `from` — pagination token (required)
- `dir` — `b` (backwards) or `f` (forwards), default `b`
- `limit` — max events, default 10

**Response:**
```json
{
  "start": "t1234_567",
  "end": "t1234_500",
  "chunk": [
    {
      "type": "m.room.message",
      "event_id": "$event789:daarion.city",
      "sender": "@charlie:daarion.city",
      "content": {
        "msgtype": "m.text",
        "body": "Previous message"
      },
      "origin_server_ts": 1732445300000
    }
  ]
}
```

---

## Event Types (Matrix → DAARION mapping)

| Matrix Event Type | DAARION Internal Event |
|-------------------|------------------------|
| `m.room.message` (msgtype=m.text) | `messaging.message.created` |
| `m.room.message` (msgtype=m.image) | `messaging.media.uploaded` |
| `m.room.member` (join) | `messaging.member.joined` |
| `m.room.member` (leave) | `messaging.member.left` |
| `m.room.member` (invite) | `messaging.member.invited` |
| `m.room.name` | `messaging.channel.updated` |
| `m.room.topic` | `messaging.channel.updated` |
| `m.reaction` | `messaging.reaction.added` |
| `m.room.redaction` | `messaging.message.deleted` |

---

## Error Responses

All errors follow the format:
```json
{
  "error": "M_FORBIDDEN",
  "message": "You are not allowed to send messages in this room"
}
```

Common error codes:
- `M_FORBIDDEN` — Insufficient permissions
- `M_NOT_FOUND` — Room/user not found
- `M_UNKNOWN` — Generic Matrix error
- `M_BAD_JSON` — Invalid request payload
- `INTERNAL_ERROR` — matrix-gateway internal error

---

## Configuration

Environment variables:
- `MATRIX_HOMESERVER_URL` — e.g. `https://matrix.daarion.city`
- `MATRIX_ADMIN_TOKEN` — admin access token for homeserver operations
- `INTERNAL_SERVICE_SECRET` — shared secret for service-to-service auth
- `WEBHOOK_TIMEOUT_MS` — timeout for webhook deliveries (default 5000)
- `SYNC_TIMEOUT_MS` — long-polling timeout (default 30000)

---

## Implementation Notes

1. **User impersonation**: matrix-gateway can send messages on behalf of any user/agent (using admin privileges or shared secret registration).

2. **Event transformation**: All Matrix events are enriched with DAARION entity IDs (user:..., agent:...) before forwarding to services.

3. **Webhook reliability**: Webhooks are retried 3 times with exponential backoff. Failed events are logged but not re-queued.

4. **Rate limiting**: matrix-gateway implements internal rate limiting to avoid overwhelming the homeserver (max 100 req/s per service).

5. **Caching**: Room metadata (name, topic, members) is cached for 5 minutes to reduce load on Matrix homeserver.

---

## Testing

Use the provided `matrix-gateway-test.http` file for manual testing:

```http
### Create room
POST http://localhost:7003/internal/matrix/create-room
X-Internal-Service-Token: dev-secret-token
Content-Type: application/json

{
  "name": "Test Room",
  "topic": "Testing",
  "visibility": "public"
}

### Send message
POST http://localhost:7003/internal/matrix/send
X-Internal-Service-Token: dev-secret-token
Content-Type: application/json

{
  "room_id": "!test:daarion.city",
  "sender": "agent:test",
  "sender_matrix_id": "@test:daarion.city",
  "msgtype": "m.text",
  "body": "Hello from test!"
}
```

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-24  
**Maintainer:** DAARION Platform Team




