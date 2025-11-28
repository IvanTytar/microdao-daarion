# DAARION Data Cleanup Plan

> **Date:** 2025-11-28  
> **Status:** In Progress  
> **Goal:** Remove test/mock data, enforce "every agent has a MicroDAO"

---

## 0. Backup

### Production Database Backup (NODE1)

```bash
# SSH to NODE1 and create backup
ssh root@144.76.224.179

# Create backup directory
mkdir -p /opt/backups

# Backup daarion database
docker exec dagi-postgres pg_dump -U postgres -Fc daarion > /opt/backups/daarion_before_cleanup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
ls -la /opt/backups/
```

**Backup created:** `[TO BE FILLED]`

---

## 1. Database Schema Discovery

### Key Tables

#### agents
```sql
-- Columns discovered:
-- id, display_name, kind, status, node_id, is_public, public_slug, 
-- public_title, public_tagline, public_skills, public_district,
-- avatar_url, capabilities, model, created_at, updated_at
```

#### microdaos
```sql
-- id, slug, name, description, district, base_node_id, created_at
```

#### microdao_agents
```sql
-- id, microdao_id, agent_id, role, is_core, created_at
```

#### node_cache
```sql
-- id, node_id, node_name, hostname, roles, environment, status, gpu, last_sync
```

---

## 2. Orphan Agents Analysis

### Agents without MicroDAO membership
```sql
SELECT a.id, a.display_name, a.kind, a.node_id
FROM agents a
LEFT JOIN microdao_agents ma ON ma.agent_id = a.id
WHERE ma.agent_id IS NULL
ORDER BY a.display_name;
```

**Results:** `[TO BE FILLED]`

### Agents without node_id
```sql
SELECT id, display_name FROM agents WHERE node_id IS NULL OR node_id = '';
```

**Results:** `[TO BE FILLED]`

### Agents not in router-config
```sql
-- Compare with router-config.yml agent_ids
```

**Results:** `[TO BE FILLED]`

---

## 3. MicroDAO Analysis

### MicroDAO with 0 agents
```sql
SELECT m.id, m.slug, m.name, COUNT(ma.agent_id) AS agents_count
FROM microdaos m
LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
GROUP BY m.id
HAVING COUNT(ma.agent_id) = 0
ORDER BY m.name;
```

**Results:** `[TO BE FILLED]`

### MicroDAO without orchestrator
```sql
SELECT m.id, m.slug, m.name
FROM microdaos m
WHERE NOT EXISTS (
    SELECT 1 FROM microdao_agents ma 
    WHERE ma.microdao_id = m.id AND ma.role = 'orchestrator'
);
```

**Results:** `[TO BE FILLED]`

---

## 4. Cleanup Actions Log

| Step | Action | SQL/Script | Status |
|------|--------|------------|--------|
| 1 | Add is_archived to agents | migrations/023_agents_add_archived.sql | Pending |
| 2 | Add is_archived to microdaos | migrations/023_agents_add_archived.sql | Pending |
| 3 | Archive orphan agents | scripts/maintenance/archive_test_agents.py | Pending |
| 4 | Archive empty microDAO | scripts/maintenance/archive_test_microdao.py | Pending |
| 5 | Update API filters | repo_city.py | Pending |

---

## 5. Verification Checklist

- [ ] `/agents` shows only non-archived agents with node badges
- [ ] `/citizens` shows only public, non-archived agents
- [ ] `/microdao` shows only non-archived DAOs with agents
- [ ] `/nodes` shows only real nodes (NODE1, NODE2)
- [ ] Creating agent without microDAO returns 400 error

