# TASK_PHASE_MVP_DEPLOY.md  

DAARION MVP — Production Deploy на домен daarion.space

Цей таск готує **повний прод-деплой DAARION MVP** на домен:

- `https://daarion.space` (landing / marketing або redirect)
- `https://app.daarion.space` (MVP-продукт: microDAO + City + Agents)

MVP уже реалізовано (Frontend, Agents Core, City Backend, Second Me).  
Завдання цієї фази — **перенести готовий стек на реальний сервер**.

---

## 0. Передумови

1. **PHASE 1–3** завершені (як у звітах Cursor).
2. Є **готові docker-файли**:
   - `docker-compose.all.yml` (23 services, port 80)
   - `infra/all-in-one-gateway/docker-compose.yml` (порт 8080, dev)
   - скрипти `scripts/start-all.sh`, `scripts/stop-all.sh`
3. Є **PostgreSQL** та **Redis** (або будуть розгорнуті в цьому таску).
4. Є **VPS / dedicated server** з Linux (Ubuntu 22.04 LTS або подібне).
5. Домен **daarion.space** керується тобою (DNS-записи можна змінювати).

---

## 1. Цільова архітектура прод-деплою

### 1.1. Сервер

- 1× VPS:
  - CPU: 4+ cores
  - RAM: 16+ GB
  - Disk: NVMe 256+ GB
  - OS: Ubuntu 22.04 LTS
- Docker + Docker Compose встановлені.

### 1.2. Сервіси

Запускаються через **`docker-compose.all.yml`**:

- gateway / nginx (порт 80 всередині)
- frontend (Next.js build + nginx/static)
- microdao-api
- agents-service
- city-service
- secondme-service
- Postgres
- Redis
- NATS
- Prometheus + Grafana
- інші core-сервіси, вже визначені в цьому compose

**Важливо:** prod-деплой бере за основу саме **docker-compose.all.yml**, а не dev-варіанти.

---

## 2. DNS-конфігурація

Налаштувати наступні DNS-записи:

1. `daarion.space` → A-запис на IP сервера.
2. `app.daarion.space` → A-запис на той самий IP сервера.

Опційно:

- `grafana.daarion.space` → для прямого доступу до Grafana (якщо потрібно).
- `api.daarion.space` → якщо хочеш окремий субдомен під API (на майбутнє).

---

## 3. SSL / HTTPS

Рекомендовано три варіанти (вибери один, реалізуй у таску):

### ВАРІАНТ A — Caddy (найпростіший)

- Запустити Caddy як окремий контейнер / сервіс:
  - слухає 80/443
  - робить HTTPS-термінацію
  - проксить на внутрішній gateway (порт 80 контейнерів Docker)

Приклад `Caddyfile`:

```caddy
app.daarion.space {
    reverse_proxy gateway-nginx:80
}

daarion.space {
    redir https://app.daarion.space{uri}
}
```

### ВАРІАНТ B — Nginx + Certbot (класика)

* Зовнішній nginx на хості:

  * `server_name app.daarion.space`
  * reverse_proxy → `127.0.0.1:8080` (або 80, залежно від композу)
  * SSL-сертифікати через certbot.

### ВАРІАНТ C — Traefik (якщо вже є в інфрі)

* Traefik як edge router, видає HTTPS, роутить по labels.

---

## 4. ENV та секрети

Створити **`env/` директорію** у репозиторії або на сервері (не в git):

```text
env/
  app.env
  db.env
  redis.env
  nats.env
  agents.env
  city.env
  secondme.env
```

### 4.1. `app.env` (основні змінні)

```env
APP_ENV=production
APP_BASE_URL=https://app.daarion.space

DATABASE_URL=postgres://daarion:********@db:5432/daarion
REDIS_URL=redis://redis:6379/0
NATS_URL=nats://nats:4222

JWT_SECRET=***************
ENCRYPTION_KEY=***********   # якщо використовується
```

### 4.2. Специфічні

* `SECONDME_AGENT_ID=ag_secondme_global`
* `CITY_DEFAULT_ROOMS=general,welcome,builders`
* `TELEMETRY_ENDPOINT` (якщо є)
* `GF_SERVER_ROOT_URL` для Grafana (якщо публікуємо через `/grafana/`)

У `docker-compose.all.yml`:

* підключити `.env` файли як `env_file:` до відповідних сервісів.

---

## 5. Міграції бази даних

На сервері:

```bash
cd /opt/daarion   # приклад шляху деплою
docker compose -f docker-compose.all.yml run --rm migrations-service
# або, якщо в тебе чистий psql:
psql -U postgres -d daarion -f migrations/010_create_city_backend.sql
# + попередні міграції 001..009
```

**Вимога в таску:**
Описати в README:

* порядок запуску **всіх** міграцій (001–010)
* команду для re-run (idempotent)

---

## 6. Старт сервісів (docker-compose.all.yml)

На сервері:

```bash
cd /opt/daarion
cp env/app.env .env   # якщо Docker Compose очікує .env
docker compose -f docker-compose.all.yml pull   # якщо є образи в registry
docker compose -f docker-compose.all.yml up -d
```

або, якщо образи збираються локально:

```bash
docker compose -f docker-compose.all.yml build
docker compose -f docker-compose.all.yml up -d
```

**Завдання в таску:**
Оновити `scripts/start-all.sh` і `scripts/stop-all.sh`, щоб вони:

* працювали в prod (з використанням правильного compose-файлу)
* логували в `/var/log/daarion/` (при потребі)

---

## 7. Healthchecks та smoke-тести

Створити документ:

`docs/DEPLOY_SMOKETEST_CHECKLIST.md` з такими перевірками:

1. **API**

   * `GET https://app.daarion.space/api/health` → 200
   * `GET https://app.daarion.space/api/city/rooms` → список дефолтних кімнат
   * `GET https://app.daarion.space/api/secondme/profile` (якщо user авторизований)

2. **Frontend**

   * Відкрити `https://app.daarion.space` у браузері:

     * сторінка логіну
     * dashboard після входу
     * Projects, Follow-ups, Settings
     * City → Rooms, Presence, Second Me

3. **WS**

   * WebSocket підключення:

     * `/ws/channels/...`
     * `/ws/city/rooms/{room_id}`
     * `/ws/city/presence`

4. **Second Me**

   * У UI написати prompt → отримати відповідь.

5. **Monitoring**

   * Якщо Grafana/promo публікуються:

     * `https://app.daarion.space/grafana/`
     * `https://app.daarion.space/prometheus/` (optional)

---

## 8. Логи та моніторинг

Оновити `docs/DEPLOYMENT_OVERVIEW.md`:

* показати, де зберігаються логи:

  * `docker logs` (для кожного сервісу)
  * опційно — volume з `/var/log/...`

* описати:

  * як дивитися Grafana dashboard
  * як перевіряти NATS (jetstream, lag)
  * як перевіряти Redis (presence keys)

---

## 9. Безпека (мінімум для MVP)

1. Вимкнути:

   * прямий доступ до Postgres ззовні
   * прямий доступ до Redis/NATS ззовні

2. Обмежити доступ до:

   * Prometheus
   * Grafana
     (або за Basic Auth, або через окремий VPN)

3. У `.env` не зберігати секрети в git.

4. Оновити `PHASE_INFRA_READY.md` з прод-статусом.

---

## 10. Acceptance Criteria

1. **Сервер**: daarion.space резолвиться на IP VPS.
2. **HTTPS**: `https://app.daarion.space` відкривається без помилок сертифіката.
3. **MVP UX**:

   * користувач може зареєструватися / залогінитись
   * створити Team / Channel / Project / Follow-up
   * зайти в City → Rooms, чат, presence
   * викликати Second Me

4. **Сервіси живі**: усі контейнері в `docker ps` — в статусі `healthy` / `up`.
5. **Документація**:

   * `DEPLOY_ON_SERVER.md` оновлено з урахуванням daarion.space
   * `DEPLOY_SMOKETEST_CHECKLIST.md` існує і відповідає фактичному деплою.

---

## 11. Команда для Cursor

**"Підготувати повний production deploy для DAARION MVP згідно TASK_PHASE_MVP_DEPLOY.md.
Використовувати docker-compose.all.yml, домен daarion.space, субдомен app.daarion.space, HTTPS, міграції, Redis, NATS, City та Second Me."**

