# Node Dashboard API v1.0

**Date:** 2025-11-28  
**Status:** Active  
**Service:** node-registry  
**Base URL:** `/api/v1/nodes`

---

## Overview

Node Dashboard API — агрегуючий API для отримання повної інформації про ноду, включаючи:
- Базовий профіль (roles, modules, GPU)
- Інфраструктурні метрики (CPU, RAM, Disk, GPU)
- Статус AI-сервісів (Swapper, Router, STT, Vision, OCR)
- Агенти на ноді
- Matrix інтеграція
- Моніторинг

---

## Endpoints

### 1. Get Node Dashboard (Admin)

```http
GET /api/v1/nodes/{node_id}/dashboard
Authorization: Bearer <admin_token>
```

Повертає повну інформацію про ноду для адміністратора.

### 2. Get Self Dashboard (Node Owner)

```http
GET /api/v1/nodes/self/dashboard
Authorization: Bearer <node_token>
```

Повертає інформацію про поточну ноду (node_id з JWT claims).

---

## Response Schema

```json
{
  "node": {
    "node_id": "string",
    "name": "string",
    "roles": ["string"],
    "status": "online|offline|degraded|maintenance",
    "public_hostname": "string",
    "environment": "production|development",
    "gpu": {
      "vendor": "string",
      "model": "string",
      "vram_gb": "number",
      "unified_memory_gb": "number (optional, for Apple Silicon)"
    },
    "modules": [
      {
        "id": "string",
        "status": "up|down|degraded|unknown",
        "port": "number (optional)",
        "error": "string (optional)"
      }
    ]
  },

  "infra": {
    "cpu_usage_pct": "number",
    "ram": {
      "total_gb": "number",
      "used_gb": "number"
    },
    "disk": {
      "total_gb": "number",
      "used_gb": "number"
    },
    "gpus": [
      {
        "name": "string",
        "vram_gb": "number",
        "used_gb": "number",
        "sm_util_pct": "number"
      }
    ],
    "network": {
      "rx_mbps": "number",
      "tx_mbps": "number"
    }
  },

  "ai": {
    "swapper": {
      "status": "up|down|degraded",
      "endpoint": "string",
      "latency_ms": "number",
      "storage": {
        "total_gb": "number",
        "used_gb": "number",
        "free_gb": "number"
      },
      "models": [
        {
          "name": "string",
          "size_gb": "number",
          "device": "gpu|disk",
          "state": "loaded|unloaded",
          "last_used": "ISO8601"
        }
      ]
    },

    "router": {
      "status": "up|down|degraded",
      "endpoint": "string",
      "version": "string",
      "backends": [
        {
          "name": "string",
          "status": "up|down|degraded",
          "latency_ms": "number",
          "error": "string (optional)"
        }
      ],
      "metrics": {
        "requests_1m": "number",
        "requests_1h": "number",
        "error_rate_1h": "number",
        "avg_latency_ms_1h": "number"
      }
    },

    "services": {
      "<service_name>": {
        "status": "up|down|degraded",
        "endpoint": "string",
        "latency_ms": "number",
        "error": "string (optional)",
        "models": ["string (optional)"]
      }
    }
  },

  "agents": {
    "total": "number",
    "running": "number",
    "by_kind": {
      "<kind>": "number"
    },
    "top": [
      {
        "agent_id": "string",
        "display_name": "string",
        "kind": "string",
        "status": "online|offline|busy",
        "node_id": "string",
        "tasks_24h": "number",
        "errors_24h": "number"
      }
    ]
  },

  "matrix": {
    "enabled": "boolean",
    "homeserver": "string",
    "presence_bridge": {
      "status": "up|down",
      "latency_ms": "number"
    }
  },

  "monitoring": {
    "prometheus": {
      "url": "string",
      "status": "up|down|unknown"
    },
    "grafana": {
      "url": "string",
      "status": "up|down|unknown"
    },
    "logging": {
      "loki": {
        "status": "up|down|unknown"
      }
    }
  }
}
```

---

## Module Probes

Dashboard API опитує модулі за допомогою HTTP probes:

| Module | Probe URL | Timeout |
|--------|-----------|---------|
| `core.health` | `GET /health` | 500ms |
| `ai.swapper` | `GET :8890/health` + `GET :8890/models` | 1000ms |
| `ai.router` | `GET :9102/health` + `GET :9102/backends/status` | 1000ms |
| `ai.stt` | `GET :8895/health` | 500ms |
| `ai.tts` | `GET :5002/health` | 500ms |
| `ai.vision` | `GET :11434/api/tags` | 500ms |
| `ai.ocr` | `GET :8896/health` | 500ms |
| `ai.memory` | `GET :8001/health` | 500ms |
| `ai.crewai` | `GET :9010/health` | 500ms |
| `matrix.synapse` | `GET :8018/_matrix/client/versions` | 500ms |
| `matrix.presence` | `GET :8085/health` | 500ms |
| `monitoring.prometheus` | `GET :9090/-/ready` | 500ms |

---

## Error Handling

- Якщо модуль недоступний → `"status": "down", "error": "timeout/connection refused"`
- Якщо модуль повертає помилку → `"status": "degraded", "error": "<message>"`
- Dashboard API **ніколи не падає** — завжди повертає JSON з актуальними статусами

---

## Implementation Notes

1. **Паралельні запити**: Всі probes виконуються паралельно (asyncio.gather)
2. **Кешування**: Результати кешуються на 10 секунд
3. **Fallback**: Якщо probe не відповідає, використовується останній відомий статус
4. **Metrics**: Для infra метрик використовується psutil або node_exporter

---

## Changelog

- **v1.0.0** (2025-11-28): Initial version

