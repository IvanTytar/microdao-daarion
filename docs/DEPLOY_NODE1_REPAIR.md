# DEPLOY_NODE1_REPAIR.md

Quick deploy guide to bring NODE1 (144.76.224.179) back to a healthy, MVP-ready state.

---

## Prerequisites

- SSH access to NODE1: `ssh root@144.76.224.179`
- All code changes from `TASK_PHASE_NODE1_REPAIR.md` committed and pushed to `main` branch.

---

## Step 1: Update code on NODE1

```bash
ssh root@144.76.224.179
cd /opt/microdao-daarion
git fetch origin
git checkout main
git pull origin main
```

---

## Step 2: Apply database migrations

```bash
# Option A: If there's a migrate script
./scripts/migrate-prod.sh

# Option B: Manual migration via city-service
docker compose exec daarion-city-service python -c "from migrations import run_migrations; import asyncio; asyncio.run(run_migrations())"
```

---

## Step 3: Rebuild affected services

```bash
docker compose build \
  daarion-city-service \
  daarion-web \
  dagi-router \
  dagi-stt-service \
  dagi-ocr-service \
  dagi-web-search-service \
  dagi-swapper-service \
  dagi-vector-db-service \
  dagi-rag-service \
  telegram-gateway
```

---

## Step 4: Restart services

```bash
docker compose up -d \
  daarion-city-service \
  daarion-web \
  dagi-router \
  dagi-stt-service \
  dagi-ocr-service \
  dagi-web-search-service \
  dagi-swapper-service \
  dagi-vector-db-service \
  dagi-rag-service \
  telegram-gateway
```

---

## Step 5: Verify health

```bash
# Check all containers are running and healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# Individual health checks
curl -s http://localhost:7001/health    # city-service
curl -s http://localhost:9102/health    # dagi-router
curl -s http://localhost:9300/health    # gateway
curl -s http://localhost:8890/health    # swapper
```

Expected: all return `{"status":"ok"}` or similar.

---

## Step 6: Verify UI

Open in browser:

- `http://144.76.224.179:3000/microdao/daarion` — MicroDAO page
- `http://144.76.224.179:3000/nodes/node-1` — NODE1 cabinet
- `http://144.76.224.179:3000/agents` — Agents list

All pages should load without SSR errors.

---

## Step 7: Verify Telegram bot

1. Send a message to `@DAARWIZZBot` in Telegram.
2. Check logs:
   ```bash
   docker logs --tail 50 telegram-gateway
   ```
3. Verify no `Temporary failure in name resolution` or `NotJSMessageError`.
4. Bot should respond with LLM-generated reply.

---

## Step 8: Verify external health endpoint

```bash
curl -k https://gateway.daarion.city/health
```

Expected: HTTP 200 with `OK` or `{"status":"ok"}`.

---

## Rollback (if needed)

```bash
# Revert to previous commit
git checkout HEAD~1

# Rebuild and restart
docker compose build <service>
docker compose up -d <service>
```

---

## Troubleshooting

### daarion-web shows `ECONNREFUSED 127.0.0.1:80`

Check `.env` or `docker-compose.yml` for `daarion-web`:
```env
CITY_API_BASE_URL=http://daarion-city-service:7001
```

### Service marked `unhealthy` but actually works

Check healthcheck command in `docker-compose.yml`. Ensure `wget` or `curl` is installed in the image:
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
```

### telegram-gateway can't resolve `router`

Set correct env var:
```yaml
environment:
  ROUTER_URL: http://dagi-router:9102
```

Or add network alias to `dagi-router`:
```yaml
networks:
  default:
    aliases:
      - router
```

---

**Last updated:** 2025-11-29

