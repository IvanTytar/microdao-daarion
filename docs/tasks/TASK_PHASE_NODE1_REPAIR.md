# TASK_PHASE_NODE1_REPAIR.md

## Phase name

NODE1_REPAIR — bring NODE1 to a healthy, MVP-ready state.

## Goal

1. All core services on NODE1 are `running` and `healthy` in `docker ps`.
2. `daarion-web` serves working UI for:
   - `/microdao/daarion` (orchestrator room view),
   - `/nodes/node-1` (NODE1 status),
   - `/agents/...` (agents/crew views).
3. Telegram bot(s) can route a message through `telegram-gateway → dagi-router → LLM` and return a response.
4. `https://gateway.daarion.city/health` returns HTTP 200.
5. DB schema and code are aligned with the MVP product brief and room/orchestrator features (TASK 039–044).

---

## Context (facts — do not "redefine" them in code)

NODE1 (144.76.224.179):

- `docker ps` shows multiple services as `unhealthy` or `Restarting`:
  - `daarion-web`,
  - `dagi-router`,
  - `dagi-stt-service`,
  - `dagi-ocr-service`,
  - `dagi-web-search-service`,
  - `dagi-swapper-service`,
  - `dagi-vector-db-service`,
  - `dagi-rag-service`.
- Git HEAD on server = TASK 038 (no TASK 039–044 applied).
- `daarion-web` (Next.js) fails on SSR with:
  - `connect ECONNREFUSED 127.0.0.1:80`
  - It tries to `fetch http://127.0.0.1:80/...`
- `daarion-city-service` is alive:
  - `curl http://localhost:7001/health` → healthy
  - But DB schema is missing new columns (e.g. `room_role`, `is_public`, `sort_order`) for orchestrator rooms.
- `dagi-router` responds:
  - `curl localhost:9102/health` → `ok`
  - Docker healthcheck runs `python -c "import requests"`; `requests` is not installed → container marked `unhealthy`.
- STT/OCR/WebSearch/Swapper:
  - Healthchecks run `curl` inside slim images without `curl` installed → false `unhealthy`.
- `dagi-vector-db-service`:
  - Keeps restarting with:
    - `AttributeError: module 'torch.utils._pytree' has no attribute 'register_pytree_node'`
  - Torch version is incompatible with `sentence-transformers`.
- `dagi-rag-service`:
  - Crashes with:
    - `ModuleNotFoundError: No module named 'haystack'`
- `telegram-gateway`:
  - Logs `Temporary failure in name resolution` for `http://router:9102/route`
    - Real service name in Docker is `dagi-router`, not `router`.
  - Logs `NotJSMessageError` when calling `msg.ack()` – ack is used on a non-JetStream subject.
- `https://gateway.daarion.city/health` returns 404 (SSL OK but no health endpoint).
- Because `daarion-web` is `unhealthy`, MVP UI for NODE1 (microDAO, nodes, agents) is effectively offline.
- Product brief requires at least six core flows live for MVP:
  - MicroDAO onboarding,
  - Public channel for guests,
  - MicroDAO chat,
  - Follow-ups,
  - Kanban tasks,
  - Private agent.

Do NOT change these facts; change code/config to fix the system.

---

## Scope

### In scope

- Code and config changes in the main repo:
  - Dockerfiles and `docker-compose.yml` (and any overrides).
  - `daarion-web` env/SSR config.
  - `daarion-city-service` migrations and DB schema updates.
  - `dagi-router`, STT/OCR/WebSearch/Swapper healthchecks.
  - `dagi-vector-db-service` dependencies (Torch, sentence-transformers).
  - `dagi-rag-service` dependencies (Haystack).
  - `telegram-gateway` configuration and NATS usage.
  - Gateway `/health` endpoint (backend or nginx, depending on actual stack).
- Local verification (via `docker compose`) + instructions for running on NODE1.

### Out of scope

- New product features beyond MVP (no new flows).
- Large refactors of architecture.
- Switching to a different LLM stack or DB vendor.

---

## Prerequisites

Before editing:

1. Inspect repo structure to locate:
   - Docker compose files (e.g. `docker-compose.yml`, `docker-compose.prod.yml`).
   - Services:
     - `daarion-web`,
     - `daarion-city-service`,
     - `dagi-router`,
     - `dagi-stt-service`,
     - `dagi-ocr-service`,
     - `dagi-web-search-service`,
     - `dagi-swapper-service`,
     - `dagi-vector-db-service`,
     - `dagi-rag-service`,
     - `telegram-gateway`,
     - `gateway` (or equivalent).
   - Migration tooling for `daarion-city-service` (Alembic / Prisma / Drizzle / etc.).
   - Existing deploy scripts:
     - `scripts/deploy-prod.sh`,
     - `scripts/migrate-prod.sh` (or equivalents).
2. Read:
   - `01_product_brief_mvp.md` — especially sections about microDAO, rooms, orchestrator, onboarding, follow-ups, Kanban, private agent.
   - `docs/DEPLOY_MIGRATIONS.md` or any deployment doc describing DB migrations.
   - `microdao — Data Model & Event Catalog` (if present in repo/docs) to understand expected DB fields for rooms.

---

## Tasks

### 1. Bring codebase up to TASK 039–044 (rooms / orchestrator) and align DB schema

1.1. Locate tasks 039–044 (look under `docs/cursor/` / `docs/tasks/` / similar).
- Identify what changes they describe:
  - new fields for rooms (e.g. `room_role`, `is_public`, `sort_order`),
  - any additional tables/relations required for orchestrator rooms and microDAO UI.

1.2. Implement DB/schema changes:
- Use existing migration framework for `daarion-city-service`.
- Create a new migration that:
  - adds missing columns (e.g. `room_role`, `is_public`, `sort_order`) to relevant tables (e.g. `rooms`),
  - adds any indices or constraints described in the docs,
  - is **idempotent** and safe to apply on existing prod DB.
- Ensure migration can run in both dev and prod environments.

1.3. Update `daarion-city-service` models/ORM to match the new schema.
- All API endpoints that return rooms/microDAO views must expose these fields (if required by frontend).

1.4. Ensure deploy pipeline uses these migrations:
- Confirm `scripts/migrate-prod.sh` (or equivalent) calls the migration tool.
- If not, update it so that running the script applies the new migration.

1.5. Add/update minimal tests:
- Unit/integration test for room creation / listing that uses the new fields.
- At least one test for the orchestrator room API.

---

### 2. Fix `daarion-web` API base URLs and SSR errors

2.1. Locate `daarion-web` config:
- `.env` / `.env.production` / `next.config.js` / `app/config.ts` etc.

2.2. Define correct base URL for city-service:

For **server-side** calls:

```env
CITY_API_BASE_URL=http://daarion-city-service:7001
```

For **client-side** calls (if needed):

```env
NEXT_PUBLIC_CITY_API_BASE_URL=https://gateway.daarion.city/api
# or, for internal-only, http://daarion-city-service:7001
```

2.3. Update all fetch calls in `daarion-web` to use these env vars instead of hardcoded `http://127.0.0.1:80`.

* Search for `127.0.0.1`, `localhost`, and update to use `CITY_API_BASE_URL` / `NEXT_PUBLIC_CITY_API_BASE_URL`.
* Ensure Next.js server components and API routes read values from `process.env`.

2.4. Local smoke test:

```bash
docker compose up -d daarion-city-service
docker compose up -d --build daarion-web
```

* Open `http://localhost:<WEB_PORT>/microdao/daarion` and check there are no SSR 500 errors.
* Check `/nodes/node-1` and one of `/agents/...` pages.

---

### 3. Fix healthchecks for dagi-router and STT/OCR/WebSearch/Swapper

#### 3.1. dagi-router healthcheck (Python requests)

3.1.1. Locate `dagi-router` Dockerfile and `docker-compose` service.

3.1.2. Replace healthcheck that uses `python -c "import requests"` with an HTTP healthcheck pointing at the service's `/health` endpoint.

Example `docker-compose.yml` snippet:

```yaml
services:
  dagi-router:
    # ...
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:9102/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 5
```

3.1.3. Ensure the image has `wget` (or `curl`):

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*
```

#### 3.2. STT/OCR/WebSearch/Swapper healthchecks (curl)

3.2.1. For each of:

* `dagi-stt-service`,
* `dagi-ocr-service`,
* `dagi-web-search-service`,
* `dagi-swapper-service`,

replace `curl`-based healthcheck with `wget` or an equivalent command that is available in the image, or add `wget`/`curl` to Dockerfile as above.

Example:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:<PORT>/health || exit 1"]
  interval: 10s
  timeout: 3s
  retries: 5
```

3.2.2. Rebuild and run locally:

```bash
docker compose build dagi-router dagi-stt-service dagi-ocr-service dagi-web-search-service dagi-swapper-service
docker compose up -d dagi-router dagi-stt-service dagi-ocr-service dagi-web-search-service dagi-swapper-service
docker ps
```

* Verify `STATUS` shows `healthy` after the healthcheck grace period.

---

### 4. Fix `dagi-vector-db-service` dependencies (Torch / sentence-transformers)

4.1. Locate Dockerfile / requirements for `dagi-vector-db-service`.

4.2. Update Python dependencies to a compatible set, e.g.:

```dockerfile
RUN pip install --no-cache-dir "torch==2.4.0" "sentence-transformers==2.6.1"
```

(or another version pair that is known to work together).

4.3. Rebuild and run:

```bash
docker compose build dagi-vector-db-service
docker compose up -d dagi-vector-db-service
docker logs -f dagi-vector-db-service
```

* Ensure there is no `torch.utils._pytree` error and service reaches "ready" state.
* Add a simple `/health` endpoint test if not present.

---

### 5. Fix `dagi-rag-service` dependencies (Haystack)

5.1. Locate Dockerfile / requirements for `dagi-rag-service`.

5.2. Add Haystack dependency, for example:

```dockerfile
RUN pip install --no-cache-dir "farm-haystack[all]==1.26.2"
```

(or the version used locally).

5.3. Rebuild and run:

```bash
docker compose build dagi-rag-service
docker compose up -d dagi-rag-service
docker logs -f dagi-rag-service
```

* Confirm `ModuleNotFoundError: No module named 'haystack'` is gone.
* Add/verify `/health` endpoint and healthcheck.

---

### 6. Fix Telegram gateway configuration and NATS usage

#### 6.1. Router URL (DNS / service name)

6.1.1. Find `telegram-gateway` service in `docker-compose.yml` and its env/config.

6.1.2. Set correct router URL:

```yaml
services:
  telegram-gateway:
    environment:
      # ...
      ROUTER_URL: http://dagi-router:9102
```

6.1.3. Alternatively, define network alias:

```yaml
services:
  dagi-router:
    networks:
      default:
        aliases:
          - router
```

and keep `ROUTER_URL=http://router:9102`.

#### 6.2. Avoid `NotJSMessageError` (msg.ack on non-JetStream)

6.2.1. Locate the code where `telegram-gateway` subscribes to NATS and calls `msg.ack()`.

6.2.2. If the subject is not part of a JetStream stream, remove `msg.ack()`:

```python
# Before
msg = await sub.__anext__()
# ... process ...
await msg.ack()

# After (simple NATS)
msg = await sub.__anext__()
# ... process ...
# no ack for core NATS
```

6.2.3. If you want JetStream in the future, add TODO comments and separate task; for this phase keep it simple and working.

6.2.4. Local smoke test:

* Start NATS, `dagi-router`, and `telegram-gateway`.
* Simulate a message (if test tooling exists) and ensure no `NotJSMessageError` appears.

---

### 7. Add `/health` endpoint for `gateway.daarion.city`

Depending on implementation:

#### 7.1. If gateway is a backend service (Node/FastAPI/etc.)

7.1.1. Add minimal endpoint:

```ts
// Node/Express example
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

or

```python
# FastAPI example
@app.get("/health")
def health():
    return {"status": "ok"}
```

7.1.2. Ensure this endpoint is mounted at the top level of the gateway service.

#### 7.2. If `gateway.daarion.city` is served via nginx

7.2.1. Update nginx config (e.g. `/etc/nginx/sites-available/gateway.conf`) to include:

```nginx
location /health {
    return 200 'OK';
    add_header Content-Type text/plain;
}
```

7.2.2. Reload nginx:

```bash
nginx -t && nginx -s reload
```

7.2.3. Local/container test:

* `curl -k https://gateway.daarion.city/health` should return HTTP 200.

---

### 8. Deployment flow for NODE1 (instructions)

Agent should prepare / update deployment docs (e.g. `docs/DEPLOY_NODE1_REPAIR.md`) with:

8.1. Git update on NODE1:

```bash
cd /opt/microdao-daarion
git fetch
git checkout main           # or production branch
git pull
```

8.2. Apply migrations:

```bash
./scripts/migrate-prod.sh   # or documented migrations command
```

8.3. Rebuild and restart only relevant services:

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
  telegram-gateway \
  gateway

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
  telegram-gateway \
  gateway
```

8.4. Quick `docker ps` check:

* All listed services must be `Up` and `healthy` after grace period.

---

## Acceptance checklist

Task is done when all of the following are true:

1. **Services/health**

   * [ ] On NODE1, `docker ps` shows:

     * `daarion-web`, `daarion-city-service`,
     * `dagi-router`, `dagi-stt-service`, `dagi-ocr-service`,
     * `dagi-web-search-service`, `dagi-swapper-service`,
     * `dagi-vector-db-service`, `dagi-rag-service`,
     * `telegram-gateway`, `gateway`
       in state `Up` and `healthy`.
   * [ ] `curl http://localhost:7001/health` (city-service) → 200.
   * [ ] `curl http://localhost:9102/health` (dagi-router) → 200.
   * [ ] `curl -k https://gateway.daarion.city/health` → 200.

2. **DB & API**

   * [ ] DB schema contains required fields for rooms (e.g. `room_role`, `is_public`, `sort_order`), matching Data Model & product brief.
   * [ ] Migration for these changes runs successfully on DEV and PROD.
   * [ ] API endpoints that frontend uses for microDAO/rooms/orchestrator return the new fields (where specified in docs).

3. **daarion-web UI**

   * [ ] `/microdao/daarion` loads without SSR error and displays orchestrator/microDAO context.
   * [ ] `/nodes/node-1` loads and shows NODE1 data.
   * [ ] At least one `/agents/...` page loads and shows crew/agents data.
   * [ ] No `ECONNREFUSED 127.0.0.1:80` in `daarion-web` logs.

4. **Telegram routing**

   * [ ] `telegram-gateway` uses the correct router URL (`http://dagi-router:9102` or via alias `router`).
   * [ ] No `Temporary failure in name resolution` or `NotJSMessageError` in `telegram-gateway` logs under normal operation.
   * [ ] Sending a message through the Telegram bot results in a valid LLM-based reply via `dagi-router`.

5. **Docs**

   * [ ] This task file `TASK_PHASE_NODE1_REPAIR.md` is saved under `docs/tasks/` (or the project's task folder).
   * [ ] A short deploy how-to for NODE1 (from "git pull" to "docker compose up") is added/updated (e.g. `docs/DEPLOY_NODE1_REPAIR.md`).

---

## Notes for agents

* Prefer minimal, targeted changes over large refactors.
* Reuse existing patterns from other services (Dockerfiles, healthchecks, migrations).
* When in doubt which version of a library to pin (Torch, Haystack), check:

  * existing working services in this repo,
  * or the versions used in local/dev containers (if recorded in lockfiles).
* Keep logs and errors in comments / commit messages to help future debugging.

