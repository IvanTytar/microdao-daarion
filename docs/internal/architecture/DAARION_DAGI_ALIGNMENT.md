# DAARION MVP ↔ DAGI Runtime Alignment

> **Version:** 1.0  
> **Date:** 2025-11-28  
> **Status:** Active

## Огляд

Цей документ визначає "джерело істини" (Source of Truth) для всіх сутностей DAARION MVP та їх зв'язок з реальною DAGI-мережею.

**Ключовий принцип:** DAARION MVP — це UI-шар над реальною DAGI/DAOS-мережею. Всі дані беруться з відповідних Registry, а не з моків чи статичних конфігів.

---

## 1. Node Registry

### Джерело даних
- **Database:** `node_registry.nodes` (окрема БД node_registry)
- **Cache:** `daarion.node_cache` (кеш в основній БД для швидких JOIN)

### Схема node_cache
```sql
CREATE TABLE node_cache (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL UNIQUE,        -- 'node-1-hetzner-gex44'
    node_name TEXT NOT NULL,             -- 'Hetzner GEX44 Production'
    hostname TEXT,                       -- '144.76.224.179'
    roles TEXT[],                        -- '{core,gateway,matrix,agents,gpu}'
    environment TEXT,                    -- 'production' | 'development'
    status TEXT DEFAULT 'offline',       -- 'online' | 'offline'
    gpu TEXT,                            -- GPU info
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Поточні ноди

| node_id | name | hostname | environment | roles |
|---------|------|----------|-------------|-------|
| `node-1-hetzner-gex44` | Hetzner GEX44 Production | 144.76.224.179 | production | core, gateway, matrix, agents, gpu |
| `node-2-macbook-m4max` | MacBook Pro M4 Max | 192.168.1.33 | development | development, gpu, ai_runtime |

### Source of Truth для
- `/nodes` — Node Directory
- `home_node_id` кожного агента
- Розташування сервісів: Swapper, Router, Ollama, STT, OCR

### API Endpoints
- `GET /public/nodes` — список всіх нод
- `GET /public/nodes/{node_id}` — профіль конкретної ноди
- `GET /api/v1/nodes/{node_id}/dashboard` — детальний дашборд ноди

---

## 2. Agent Registry

### Джерело даних
- **Database:** `daarion.agents`
- **Config:** DAGI Router `router-config.yml` (для runtime routing)

### Схема agents (ключові поля)
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,                 -- 'exor', 'faye', 'sofia'
    display_name TEXT NOT NULL,
    kind TEXT DEFAULT 'assistant',       -- orchestrator, security, marketing, etc.
    status TEXT DEFAULT 'offline',
    
    -- Home Node (ОБОВ'ЯЗКОВО!)
    node_id TEXT NOT NULL,               -- 'node-1-hetzner-gex44'
    
    -- DAIS (публічний профіль)
    is_public BOOLEAN DEFAULT false,
    public_slug TEXT UNIQUE,             -- URL slug для /citizens/
    public_title TEXT,
    public_tagline TEXT,
    public_skills TEXT[],
    public_district TEXT,
    public_primary_room_slug TEXT,
    
    -- System Prompts
    system_prompt_core TEXT,
    system_prompt_safety TEXT,
    system_prompt_governance TEXT,
    system_prompt_tools TEXT,
    
    -- Metadata
    avatar_url TEXT,
    capabilities TEXT[],
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Правила
1. **Кожен агент ОБОВ'ЯЗКОВО має `node_id`** — немає агентів без "прописки"
2. `id` агента відповідає `agent_id` в DAGI Router config
3. `is_public=true` — агент видимий у `/citizens`
4. `public_slug` — унікальний URL для публічного профілю

### Source of Truth для
- `/agents` — Agent Console (всі агенти)
- `/citizens` — Public Citizens (WHERE is_public=true)
- `/agents/{id}` — Agent Cabinet (DAIS + System Prompts)

### API Endpoints
- `GET /public/agents` — список всіх агентів з home_node
- `GET /city/agents/{id}/dashboard` — детальний дашборд агента
- `GET /public/citizens` — публічні громадяни
- `GET /public/citizens/{slug}` — профіль громадянина

---

## 3. MicroDAO Registry

### Джерело даних
- **Database:** `daarion.microdaos`, `daarion.microdao_agents`

### Схема
```sql
CREATE TABLE microdaos (
    id UUID PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,           -- 'greenfood-dao'
    name TEXT NOT NULL,                  -- 'GreenFood DAO'
    description TEXT,
    district TEXT,
    base_node_id TEXT,                   -- нода де живе core DAO
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE microdao_agents (
    id UUID PRIMARY KEY,
    microdao_id UUID REFERENCES microdaos(id),
    agent_id TEXT REFERENCES agents(id),
    role TEXT DEFAULT 'member',          -- 'orchestrator' | 'member'
    is_core BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Правила
1. Кожен MicroDAO має `orchestrator_agent_id` — головний агент
2. `base_node_id` — нода де живе core стек MicroDAO
3. Зв'язок з Matrix/City rooms через `microdao_channels`
4. **Кожен активний агент ОБОВ'ЯЗКОВО належить хоча б до одного MicroDAO** (через `microdao_agents`)

### Source of Truth для
- `/microdao` — список MicroDAO
- `/microdao/{slug}` — деталі MicroDAO з агентами

### API Endpoints
- `GET /city/microdao` — список всіх MicroDAO
- `GET /city/microdao/{slug}` — деталі MicroDAO

---

## 4. MVP UI Mapping

| UI Route | Source of Truth | Notes |
|----------|-----------------|-------|
| `/nodes` | Node Registry (`node_cache`) | Всі ноди мережі |
| `/nodes/{nodeId}` | Node Registry + health probes | Детальний кабінет ноди |
| `/agents` | Agent Registry (`agents`) | Всі агенти з home_node |
| `/agents/{id}` | Agent Registry | DAIS + System Prompts |
| `/citizens` | Agent Registry (`WHERE is_public=true`) | Публічні громадяни |
| `/citizens/{slug}` | Agent Registry | Публічний профіль |
| `/microdao` | MicroDAO Registry | Всі MicroDAO |
| `/microdao/{slug}` | MicroDAO Registry | Деталі з агентами |
| `/city` | City Rooms + Agent Presence | 2D мапа міста |

---

## 5. DAGI Runtime Services

### Per-Node Services

| Service | NODE1 URL | NODE2 URL | Purpose |
|---------|-----------|-----------|---------|
| DAGI Router | http://10.99.0.1:9102 | http://10.99.0.2:9102 | Agent orchestration |
| Swapper | http://10.99.0.1:8890 | http://10.99.0.2:8890 | Model switching |
| Ollama | http://10.99.0.1:11434 | http://10.99.0.2:11434 | LLM inference |
| STT | http://10.99.0.1:8895 | - | Speech-to-text |
| OCR | http://10.99.0.1:8896 | - | Image OCR |

### Health Checks
- Router: `GET /health`
- Swapper: `GET /models`
- Ollama: `GET /api/tags`

---

## 6. Важливі примітки

### ⚠️ Agents ≠ Agents on NODE1
> Агенти в MVP беруться з Agent Registry і мають поле `home_node_id`, яке вказує реальну ноду.
> Агент з NODE2 буде показаний в `/agents` з бейджем "НОДА2".

### ⚠️ Кожен агент має "прописку"
> Не може існувати агента без `node_id`. Якщо такий з'являється — це баг, який треба виправити.

### ⚠️ Public Citizens = Subset of Agents
> `/citizens` показує тільки агентів з `is_public=true`. Це не окрема сутність, а фільтр.

---

## 7. Пов'язані документи

- [NODE_PROFILE_STANDARD_v1.md](../../NODE_PROFILE_STANDARD_v1.md) — стандарт профілю ноди
- [AGENT_PROFILE_STANDARD_v1.md](../dais/AGENT_PROFILE_STANDARD_v1.md) — DAIS стандарт
- [Node_Dashboard_API_v1.md](../infra/Node_Dashboard_API_v1.md) — API дашборду ноди
- `services/router/router-config.yml` — конфіг DAGI Router
- [SWAPPER-DEFAULT-MODEL-NODE1-SETUP.md](../../cursor/SWAPPER-DEFAULT-MODEL-NODE1-SETUP.md) — налаштування Swapper

