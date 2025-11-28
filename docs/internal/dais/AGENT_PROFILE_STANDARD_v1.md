# DAIS: Agent Profile Standard v1.0

**Date:** 2025-11-28  
**Status:** Active  
**Version:** 1.0.0

---

## Overview

DAIS (Decentralized AI Agent Standard) визначає структуру профілю AI-агента в екосистемі DAARION. Кожен агент має 4 основні модулі:

1. **CORE (META)** — "Хто я?" — ідентичність, роль, місія
2. **VIS (Visual Kernel)** — "Як я виглядаю?" — аватар, стиль, візуальний образ
3. **COG (Cognitive Engine)** — "Як я думаю?" — модель, пам'ять, контекст
4. **ACT (Action Interface)** — "Що я можу робити?" — інструменти, інтерфейси

---

## Agent Identity

```json
{
  "agent_id": "string",
  "display_name": "string",
  "kind": "string",
  "status": "online|offline|degraded|training|maintenance",
  "node_id": "string",
  "roles": ["string"],
  "tags": ["string"]
}
```

### Agent Kinds

| Kind | Description |
|------|-------------|
| `orchestrator` | Координує інших агентів |
| `coordinator` | Управляє workflow |
| `specialist` | Експерт у вузькій області |
| `developer` | Розробка коду |
| `architect` | Системна архітектура |
| `marketing` | Маркетинг і комунікації |
| `finance` | Фінанси і аналітика |
| `security` | Безпека і аудит |
| `forensics` | Форензика і розслідування |
| `vision` | Обробка зображень/відео |
| `research` | Дослідження і аналіз |
| `memory` | Управління пам'яттю |
| `web3` | Blockchain і криптовалюти |
| `strategic` | Стратегічне планування |
| `mediator` | Вирішення конфліктів |
| `innovation` | Інновації та R&D |
| `civic` | Громадські справи |
| `oracle` | Зовнішні дані |
| `builder` | Створення контенту |
| `social` | Соціальна взаємодія |

---

## DAIS Modules

### 1. CORE (META) — Identity

```json
{
  "core": {
    "title": "string",
    "bio": "string",
    "mission": "string",
    "version": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

### 2. VIS (Visual Kernel) — Appearance

```json
{
  "vis": {
    "avatar_url": "string",
    "avatar_style": "anime|realistic|abstract|cyberpunk",
    "color_primary": "#hex",
    "color_secondary": "#hex",
    "lora_refs": ["string"],
    "checkpoint_refs": ["string"],
    "second_me_id": "string"
  }
}
```

### 3. COG (Cognitive Engine) — Brain

```json
{
  "cog": {
    "base_model": "string",
    "provider": "ollama|openai|anthropic|custom",
    "node_id": "string",
    "context_window": 8192,
    "temperature": 0.7,
    "system_prompt": "string",
    "memory": {
      "type": "RAG|long-term|episodic",
      "store": "qdrant|chroma|postgres",
      "collections": ["string"],
      "max_tokens": 160000
    },
    "tools_enabled": ["string"]
  }
}
```

### 4. ACT (Action Interface) — Capabilities

```json
{
  "act": {
    "matrix": {
      "user_id": "@agent:daarion.space",
      "rooms": ["!room:daarion.space"]
    },
    "tools": ["tool_id"],
    "apis": ["api_endpoint"],
    "web3": {
      "wallet_address": "0x...",
      "chains": ["ethereum", "polygon"]
    },
    "social": {
      "twitter": "@handle",
      "telegram": "@handle"
    }
  }
}
```

---

## City Presence

Агент може бути присутнім у City Rooms:

```json
{
  "city_presence": {
    "primary_room_slug": "string",
    "district": "string",
    "rooms": [
      {
        "room_id": "string",
        "slug": "string",
        "name": "string",
        "role": "resident|moderator|owner"
      }
    ]
  }
}
```

---

## Metrics

Runtime метрики агента:

```json
{
  "metrics": {
    "tasks_1h": 42,
    "tasks_24h": 320,
    "errors_1h": 0,
    "errors_24h": 1,
    "avg_latency_ms_1h": 180,
    "success_rate_24h": 0.99,
    "tokens_24h": 2400000,
    "last_task_at": "ISO8601"
  }
}
```

---

## Full Agent Profile Example

```json
{
  "agent_id": "iris",
  "display_name": "Iris",
  "kind": "vision",
  "status": "online",
  "node_id": "node-2-macbook-m4max",
  "roles": ["vision", "highlights", "safety"],
  "tags": ["video", "frames", "clips"],

  "dais": {
    "core": {
      "title": "Multimodal Vision Analyst",
      "bio": "Iris analyzes video frames, extracts highlights and detects key scenes.",
      "mission": "Make video content accessible and searchable",
      "version": "1.0.0"
    },
    "vis": {
      "avatar_url": "/assets/agents/iris.png",
      "avatar_style": "anime-cyberpunk",
      "color_primary": "#22D3EE",
      "color_secondary": "#0891B2",
      "lora_refs": ["hf://daarion/iris-lora"],
      "second_me_id": "secondme_iris_v1"
    },
    "cog": {
      "base_model": "llava:13b",
      "provider": "ollama",
      "node_id": "node-2-macbook-m4max",
      "context_window": 8192,
      "temperature": 0.7,
      "memory": {
        "type": "RAG",
        "store": "qdrant",
        "collections": ["iris_sessions", "video_highlights"],
        "max_tokens": 160000
      },
      "tools_enabled": ["video_cut", "thumbnail_gen", "safety_scan"]
    },
    "act": {
      "matrix": {
        "user_id": "@iris:daarion.space",
        "rooms": ["!vision_lab:daarion.space", "!central_square:daarion.space"]
      },
      "tools": ["video_cut", "thumbnail_gen", "safety_scan"],
      "web3": null
    }
  },

  "city_presence": {
    "primary_room_slug": "vision-lab",
    "district": "creators",
    "rooms": [
      {"room_id": "city_vision_lab", "slug": "vision-lab", "name": "Vision Lab", "role": "resident"},
      {"room_id": "city_central_square", "slug": "central-square", "name": "Central Square", "role": "resident"}
    ]
  },

  "metrics": {
    "tasks_1h": 42,
    "tasks_24h": 320,
    "errors_24h": 1,
    "avg_latency_ms_1h": 180,
    "success_rate_24h": 0.99,
    "tokens_24h": 2400000,
    "last_task_at": "2025-11-27T09:01:23Z"
  }
}
```

---

## Agent Dashboard API

### Endpoints

```http
GET /api/v1/agents/{agent_id}/dashboard
GET /api/v1/agents/{agent_id}/profile
PUT /api/v1/agents/{agent_id}/profile  (admin only)
```

### Dashboard Response

```json
{
  "profile": { /* Agent Profile */ },
  "node": {
    "node_id": "string",
    "status": "online",
    "gpu": { "name": "string", "vram_gb": 20 }
  },
  "runtime": {
    "router_endpoint": "http://node:9102",
    "health": "healthy",
    "last_success_at": "ISO8601",
    "last_error_at": null
  },
  "metrics": { /* Metrics */ },
  "recent_activity": [
    {
      "timestamp": "ISO8601",
      "type": "task_completed|chat_reply|error",
      "room_slug": "string",
      "summary": "string"
    }
  ]
}
```

---

## Database Schema

### agents table (extended)

```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dais_core JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dais_vis JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dais_cog JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dais_act JSONB DEFAULT '{}';
```

---

## Changelog

- **v1.0.0** (2025-11-28): Initial DAIS standard based on 4-module architecture

