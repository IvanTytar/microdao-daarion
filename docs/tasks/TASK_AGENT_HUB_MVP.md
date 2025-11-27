# TASK: Implement Agent Hub (Team Assistant) using existing Messenger as core

**Goal:**
Створити головний "Agent Hub" інтерфейс (Team Assistant), який:
- показує список microDAO / команд / агентів,
- дозволяє вибрати агента й говорити з ним (на основі Messenger),
- показує контекст (проєкти, задачі, квести, стан агента),
- стане `/home` для користувача.

**Constraints:**
- Використати існуючий Messenger (channels, messages, WS) як ядро для чату.
- Не дублювати логіку відправки/отримання повідомлень.
- Agent Hub = надбудова над Messenger + Agents + Projects (stub).

---

## 1) Frontend structure

**Create feature:**

```
src/features/agent-hub/
  AgentHubPage.tsx
  components/
    AgentSidebar.tsx
    AgentList.tsx
    AgentListItem.tsx
    AgentSummaryCard.tsx
    AgentContextPanel.tsx
    AgentStatusBadge.tsx
  hooks/
    useAgents.ts
    useAgentHubState.ts
  api/
    getAgents.ts
    getAgentSummary.ts
    getAgentContext.ts
```

**Route:**
- Додати `/hub` або `/home`:
  ```tsx
  <Route path="/hub" element={<AgentHubPage />} />
  ```

### Layout (3-колонковий)

```
┌──────────────────┬────────────────────────────┬───────────────────┐
│ Left:            │ Center:                    │ Right:            │
│ Agents sidebar   │ Chat (Messenger embed)     │ Context panel     │
└──────────────────┴────────────────────────────┴───────────────────┘
```

#### Left (AgentSidebar):
- список:
  - "My microDAO"
  - "My agents"
  - "System agents"
- кожен агент: name, kind, microDAO badge, status badge.
- фільтр/пошук.

#### Center:
- Вбудований Messenger:
  - Reuse MessengerPage components:
    - ChannelHeader
    - MessageList
    - MessageComposer
  - Але:
    - працюємо з "direct" або "agent-specific" channel.
- При виборі агента:
  - якщо ще немає direct channel з цим агентом:
    - викликати backend:
      ```http
      POST /api/messaging/channels
      {
        "name": "DM with Sofia-Prime",
        "type": "direct",
        "agent_id": "<agent_id>"
      }
      ```
    - запамʼятати channel_id.
  - якщо є → просто підключити Messenger до цього channel_id.

#### Right (AgentContextPanel):
- картка обраного агента:
  - імʼя, архетип, модель, microDAO.
  - статус: active/idle, останній reply.
- блок "Active projects" (stub):
  - отримати з `/api/agent-hub/agents/{id}/context`
  - список 3–5 проєктів/тасок (можна поки мок).
- блок "Capabilities":
  - список інструментів агента (з blueprint):
    - "Can manage tasks"
    - "Can summarise channels"
    - "Can create follow-ups"

---

## 2) Backend: Agent Hub API

**New service or extend existing agents-service:**

`services/agents-service/` (якщо вже є, розширити)

### Endpoints:

#### GET /api/agent-hub/agents

→ список агентів для поточного користувача:

```json
[
  {
    "id": "agent:sofia",
    "name": "Sofia-Prime",
    "kind": "assistant",
    "microdao_id": "microdao:7",
    "status": "online",
    "model": "gpt-4.1",
    "avatar_url": null
  }
]
```

#### GET /api/agent-hub/agents/{agentId}/summary

→ коротке резюме:

```json
{
  "id": "agent:sofia",
  "name": "Sofia-Prime",
  "kind": "assistant",
  "microdao_id": "microdao:7",
  "specialization": "Team Assistant / PM",
  "description": "Допомагає планувати, підсумовувати, слідкує за задачами.",
  "last_activity_at": "...",
  "stats": {
    "messages_last_24h": 42,
    "channels": 5
  }
}
```

#### GET /api/agent-hub/agents/{agentId}/context

→ контекст:

```json
{
  "projects": [
    { "id": "...", "name": "Messenger v1", "status": "active" },
    { "id": "...", "name": "City Dashboard", "status": "active" }
  ],
  "followups": [
    { "id": "...", "title": "Перевірити NATS інтеграцію", "due_at": "..." }
  ]
}
```

#### POST /api/agent-hub/agents/{agentId}/ensure-direct-channel

Body: `{}`

Behavior:
- знайти чи існує direct channel між user та agent:
  ```sql
  SELECT FROM channels WHERE kind='direct' AND user_id=... AND agent_id=...
  ```
- якщо не існує:
  - створити в messaging-service:
    ```http
    POST /internal/messaging/channels
    {
      "name": "DM with Sofia-Prime",
      "kind": "direct",
      "microdao_id": "<current microdao>",
      "participants": ["user:...", "agent:sofia"]
    }
    ```
  - повернути channel_id.
- якщо існує → повернути channel_id.

---

## 3) Frontend wiring

### useAgents.ts:
- `GET /api/agent-hub/agents`
- зберігати список агентів + loading/error.

### useAgentHubState.ts:
- стан:
  - `selectedAgentId`
  - `selectedChannelId`
- методи:
  - `selectAgent(agentId)`:
    - викликати `/api/agent-hub/agents/{agentId}/ensure-direct-channel`
    - зберегти channelId
  - `selectChannel(channelId)`

### AgentHubPage.tsx:
- Layout на 3 колонки.
- Зліва: AgentSidebar (list, onSelect → selectAgent).
- Центр:
  - якщо selectedChannelId:
    - рендер Messenger core:
      ```tsx
      <MessengerChannelView channelId={selectedChannelId} />
      ```
    (створити обгортку над існуючими компонентами Messenger, яка приймає channelId як проп).
- Праворуч: AgentContextPanel (summary + context для selectedAgent).

---

## 4) Reuse Messenger components

**Створити lightweight обгортку:**

`src/features/messenger/components/MessengerChannelView.tsx`

Яка:
- приймає `channelId` як проп,
- внутрішньо використовує:
  - `useMessages(channelId)`
  - `useMessagingWebSocket(channelId)`
  - `MessageList`
  - `MessageComposer`
  - `ChannelHeader` (можна переоприділити title під імʼя агента).

Це дозволяє:
- зберегти один стек логіки для Messenger,
- використовувати його і в `/messenger`, і в `/hub`.

---

## 5) Навігація

Додати кнопку/посилання:
- з Onboarding (PortalScene) → редірект у `/hub` замість `/city` або як додаткову опцію.
- з `/city-v2` HUD: кнопка "Agent Hub" → `/hub`.
- з `/messenger`: кнопка "Open Agent Hub" → `/hub`.

---

## 6) Документація

Додати:
- `docs/AGENT_HUB_MVP.md`:
  - опис ролі Agent Hub,
  - API endpoints,
  - UX flow (вибір агента → відкриття каналу → контекст справа),
  - як це повʼязано з agent-runtime (Phase 2).

---

## Acceptance Criteria

- ✅ Route `/hub` відкривається без помилок.
- ✅ В AgentSidebar видно список агентів для поточного користувача.
- ✅ При виборі агента створюється (або знаходиться) direct channel, відкривається чат (Messenger components).
- ✅ Праворуч показується хоча б stub-контекст (projects/followups з мокових даних).
- ✅ Агент, підʼєднаний через Phase 2 (agent_filter + router + runtime), може відповідати в direct channel з Agent Hub.

---

**Version:** 1.0.0  
**Date:** 2025-11-24  
**Priority:** High  
**Estimated Time:** 2 weeks  
**Dependencies:** TASK_PHASE2_AGENT_INTEGRATION.md (recommended but not blocking for UI)





