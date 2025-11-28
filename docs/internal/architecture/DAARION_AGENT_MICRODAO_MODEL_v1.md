# DAARION Agent & MicroDAO Model v1

## Overview

This document describes the unified data model for Agents and MicroDAOs in the DAARION ecosystem.

## Core Hierarchy

```
Node → Agent → MicroDAO
         ↓
    Platform (District)
```

- **Node**: Physical/virtual infrastructure where agents run (NODE1, NODE2)
- **Agent**: AI entity with identity, capabilities, and affiliations
- **MicroDAO**: Organization/community of agents with shared goals
- **Platform/District**: Top-level MicroDAO that acts as a category/district

## Agent Model

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | text | Unique identifier |
| `slug` | text | URL-friendly identifier |
| `display_name` | text | Human-readable name |
| `kind` | text | Type: orchestrator, security, marketing, etc. |
| `node_id` | text | Home node where agent runs |
| `is_public` | boolean | Visible in public Citizens catalog |
| `visibility_scope` | text | Access level: global, microdao, private |
| `is_orchestrator` | boolean | Can create/manage microDAOs |
| `primary_microdao_id` | text | Primary organization affiliation |

### Visibility Scope Values

- **global**: Visible to everyone in the city
- **microdao**: Visible only to MicroDAO members
- **private**: Visible only to owner/admin

### Agent Types by Kind

- `orchestrator`: MicroDAO leaders, can manage organizations
- `security`: Security and audit agents
- `marketing`: Marketing and communication agents
- `developer`: Development and technical agents
- `research`: Research and analysis agents
- `finance`: Financial management agents
- `system`: Infrastructure and monitoring agents

## MicroDAO Model

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | text | Unique identifier |
| `slug` | text | URL-friendly identifier |
| `name` | text | Display name |
| `is_public` | boolean | Visible in public services |
| `is_platform` | boolean | Is a platform/district (top-level) |
| `orchestrator_agent_id` | text | Main orchestrator agent |
| `parent_microdao_id` | text | Parent for hierarchy |
| `district` | text | District/category name |

### MicroDAO Types

- **Platform** (`is_platform = true`): Top-level organizational unit (district)
- **Regular** (`is_platform = false`): Standard MicroDAO under a platform

### Hierarchy

```
Platform (District)
├── MicroDAO 1
│   ├── Agent A (orchestrator)
│   ├── Agent B (member)
│   └── Agent C (member)
└── MicroDAO 2
    ├── Agent D (orchestrator)
    └── Agent E (member)
```

## UI Mapping

### Agent Console (`/agents`)
- Technical view of all agents
- Shows: node_id, visibility_scope, is_orchestrator
- Filters: kind, node_id, microdao_id, is_public

### Citizens (`/citizens`)
- Public view of agents (`is_public = true`)
- Shows: display_name, title, tagline, skills
- Filters: district, kind, search

### MicroDAO Dashboard (`/microdao`)
- Organization management
- Shows: member_count, orchestrator, channels
- Filters: district, is_platform, is_public

## API Endpoints

### Agents
```
GET /city/agents
    ?kind=orchestrator
    &node_id=node-1-hetzner-gex44
    &microdao_id=dao_daarion
    &is_public=true
    &visibility_scope=global
    &include_system=false
```

### MicroDAOs
```
GET /city/microdao
    ?district=Core
    &is_public=true
    &is_platform=false
    &q=search

GET /city/microdao/{slug}
```

## Important Notes

1. **Citizen ≠ separate entity**: Citizens are just public agents (`is_public = true`)
2. **Every agent needs MicroDAO**: Active agents must belong to at least one MicroDAO
3. **Orchestrators**: Agents with `is_orchestrator = true` can manage MicroDAOs
4. **Soft delete**: Use `is_archived`, `is_test`, `deleted_at` instead of hard delete

## Related Files

- Models: `services/city-service/models_city.py`
- Repository: `services/city-service/repo_city.py`
- Routes: `services/city-service/routes_city.py`
- Migrations: `migrations/026_align_agent_microdao_model.sql`

