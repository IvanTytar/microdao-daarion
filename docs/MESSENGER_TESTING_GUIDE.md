# Messenger Module Testing Guide

## Overview

This guide describes how to test the DAARION Messenger module, including Matrix integration and Element compatibility.

---

## Setup

### 1. Start the full stack

```bash
docker-compose -f docker-compose.messenger.yml up -d
```

This starts:
- Matrix Synapse homeserver (port 8008)
- matrix-gateway (port 7003)
- messaging-service (port 7004)
- PostgreSQL (port 5432)
- NATS JetStream (port 4222)
- Nginx gateway (port 8080)

### 2. Apply database migrations

```bash
docker exec -i daarion-postgres psql -U daarion -d daarion < migrations/001_create_messenger_schema.sql
```

### 3. Start frontend dev server

```bash
cd /Users/apple/github-projects/microdao-daarion
npm run dev
```

---

## Testing Scenarios

### Scenario 1: Basic Messaging (DAARION UI)

**Steps:**
1. Navigate to http://localhost:8899/messenger
2. You should see the Messenger page with channel list
3. Select the "#general" channel
4. Type a message: "Hello DAARION!"
5. Press Enter to send

**Expected:**
- ✅ Message appears in the chat
- ✅ "Live" indicator shows green (WebSocket connected)
- ✅ Message has correct timestamp
- ✅ Sender shows as "user:admin"

---

### Scenario 2: Real-time Messages (WebSocket)

**Steps:**
1. Open Messenger in two browser tabs/windows
2. Send a message in Tab 1
3. Check Tab 2

**Expected:**
- ✅ Message appears instantly in Tab 2 (no refresh needed)
- ✅ Both tabs show "Live" status

---

### Scenario 3: Element Compatibility

**Prerequisite:** Install Element Desktop or use Element Web (https://app.element.io)

**Steps:**
1. Login to Element with Matrix credentials:
   - Homeserver: http://localhost:8008
   - Username: @admin:daarion.city
   - Password: (use Matrix admin password)

2. Join room by alias: `#general:daarion.city`

3. Send message in Element: "Hello from Element!"

4. Check DAARION Messenger UI

**Expected:**
- ✅ Message from Element appears in DAARION UI
- ✅ Sender shows as Matrix user ID
- ✅ Message is correctly indexed in `messages` table

**Reverse test:**
1. Send message in DAARION UI
2. Check Element

**Expected:**
- ✅ Message appears in Element
- ✅ Message content matches

---

### Scenario 4: Create Channel

**Steps:**
1. Click "+ New Channel" in Messenger sidebar
2. (Currently shows "coming soon" alert)
3. Manually create via API:

```bash
curl -X POST http://localhost:8080/api/messaging/channels \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user:admin" \
  -d '{
    "slug": "test-channel",
    "name": "Test Channel",
    "description": "A test channel",
    "microdao_id": "microdao:daarion",
    "visibility": "public"
  }'
```

4. Refresh Messenger page

**Expected:**
- ✅ New channel appears in sidebar
- ✅ Can select and send messages
- ✅ Matrix room created (#test-channel-daarion:daarion.city)

---

### Scenario 5: Agent Posting

**Steps:**
1. Use internal API to post as agent:

```bash
curl -X POST http://localhost:7004/internal/agents/agent:sofia/post-to-channel \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "<channel-uuid>",
    "text": "Hello from Sofia Agent!"
  }'
```

2. Check Messenger UI

**Expected:**
- ✅ Message appears with agent avatar (🤖)
- ✅ Sender shows "agent:sofia"
- ✅ Message type is `m.notice` in Matrix
- ✅ Message appears in Element as bot message

---

### Scenario 6: Invite Member

**Steps:**
1. Get channel ID from `/api/messaging/channels`
2. Invite user:

```bash
curl -X POST http://localhost:8080/api/messaging/channels/<channel-id>/members \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user:admin" \
  -d '{
    "member_id": "user:alice",
    "role": "member",
    "can_read": true,
    "can_write": true
  }'
```

**Expected:**
- ✅ User invited to Matrix room
- ✅ `channel_members` record created
- ✅ User can see channel in Element

---

### Scenario 7: Threading/Replies

**Steps:**
1. Send message A
2. Get message A's UUID from response
3. Reply to message A:

```bash
curl -X POST http://localhost:8080/api/messaging/channels/<channel-id>/messages \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user:admin" \
  -d '{
    "text": "This is a reply!",
    "reply_to": "<message-a-uuid>"
  }'
```

**Expected:**
- ✅ Message B has `thread_id` set to message A
- ✅ Matrix event has `m.in_reply_to` relation
- ✅ Element shows threaded reply

---

### Scenario 8: Message Editing (via Matrix)

**Note:** DAARION currently doesn't have edit UI, but Matrix supports it.

**Steps:**
1. Send message in Element
2. Edit message in Element
3. Check DAARION UI

**Expected:**
- ✅ Message `edited_at` timestamp updated
- ✅ UI shows "(edited)" indicator

---

### Scenario 9: Message Deletion (Redaction)

**Steps:**
1. Delete message in Element (redact event)
2. Check DAARION UI

**Expected:**
- ✅ Message `deleted_at` timestamp set
- ✅ Message hidden or shows "[deleted]"

---

### Scenario 10: Private Channels

**Steps:**
1. Create private channel:

```bash
curl -X POST http://localhost:8080/api/messaging/channels \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user:admin" \
  -d '{
    "slug": "private-test",
    "name": "Private Test",
    "microdao_id": "microdao:daarion",
    "visibility": "private"
  }'
```

**Expected:**
- ✅ Channel created with 🔒 icon
- ✅ Matrix room is invite-only
- ✅ Only invited users can see it in Element

---

### Scenario 11: E2EE Channels (Encrypted)

**Steps:**
1. Create encrypted channel:

```bash
curl -X POST http://localhost:8080/api/messaging/channels \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user:admin" \
  -d '{
    "slug": "secure-channel",
    "name": "Secure Channel",
    "microdao_id": "microdao:daarion",
    "visibility": "private",
    "is_encrypted": true
  }'
```

**Expected:**
- ✅ Matrix room has E2EE enabled
- ✅ Element shows encryption indicator
- ✅ Messages in `content_preview` are truncated/summarized (not full plaintext)

---

### Scenario 12: Stress Test (Multiple Messages)

**Steps:**
1. Send 100 messages rapidly:

```bash
for i in {1..100}; do
  curl -X POST http://localhost:8080/api/messaging/channels/<channel-id>/messages \
    -H "Content-Type: application/json" \
    -H "X-User-Id: user:admin" \
    -d "{\"text\": \"Message $i\"}" &
done
```

2. Check Messenger UI

**Expected:**
- ✅ All messages indexed
- ✅ WebSocket delivers updates
- ✅ No duplicate messages
- ✅ Pagination works (limit 50)

---

### Scenario 13: Multiple Channels (Context Switching)

**Steps:**
1. Open Messenger
2. Click between #general and #announcements
3. Send messages in each

**Expected:**
- ✅ Correct messages shown per channel
- ✅ WebSocket reconnects to new channel
- ✅ No cross-channel message leakage

---

## Troubleshooting

### "Matrix room creation failed"

**Check:**
```bash
curl http://localhost:7003/health
curl http://localhost:8008/_matrix/client/versions
```

**Fix:**
- Restart matrix-gateway
- Check Matrix Synapse logs: `docker logs matrix-synapse`

---

### "WebSocket disconnects immediately"

**Check:**
- Nginx WebSocket config (Upgrade header)
- messaging-service logs: `docker logs messaging-service`

**Fix:**
- Verify `/ws/messaging/{id}` endpoint
- Check CORS settings

---

### "Messages not appearing in Element"

**Check:**
- Matrix room ID matches
- User is member of room
- Matrix sync is working

**Fix:**
- Manually join room in Element
- Check `channel_members` table

---

### "Agent posting fails with 403"

**Check:**
- Agent is member of channel
- `channel_members.can_write = true`

**Fix:**
```sql
INSERT INTO channel_members (id, channel_id, member_id, member_type, matrix_user_id, role)
VALUES (gen_random_uuid(), '<channel-id>', 'agent:sofia', 'agent', '@sofia-agent:daarion.city', 'agent');
```

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Message send latency | < 100ms | TBD |
| WebSocket latency | < 50ms | TBD |
| Channel list load | < 500ms | TBD |
| Message history (50) | < 300ms | TBD |
| Matrix room creation | < 1s | TBD |

---

## Next Steps

### Phase 2 Testing
- [ ] Voice messages
- [ ] File uploads
- [ ] Link previews
- [ ] Typing indicators
- [ ] Read receipts

### Phase 3 Testing
- [ ] Voice/video calls (Matrix VoIP)
- [ ] Spaces (channel groups)
- [ ] Federation (external homeservers)

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-24  
**Maintainer:** DAARION Platform Team




