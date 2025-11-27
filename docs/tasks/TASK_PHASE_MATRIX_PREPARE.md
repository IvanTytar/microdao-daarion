# TASK_PHASE_MATRIX_PREPARE.md  

DAARION — PHASE 4: MATRIX PREPARE (Без деплою)

Цей таск **підготовчий**:  
ми створюємо **повну структуру й конфіги для Matrix + Element Web + TURN**,  
але **нічого не деплоїмо і не запускаємо**.

---

## 0. Жорсткі обмеження (дуже важливо)

Cursor **НЕ МАЄ ПРАВА** в цій фазі:

- запускати Synapse, Element, TURN  
- змінювати існуючі docker-compose файли  
- додавати Matrix у прод-інфру  
- змінювати gateway, порти, SSL

Це **тільки підготовка файлів** для майбутньої **PHASE MATRIX FULL**.

---

## 1. Структура каталогів

Створити:

```text
infra/
  matrix/
    synapse/
      homeserver.yaml
      workers.yaml
      log.config
    postgres/
      init.sql
    turn/
      turnserver.conf
    element-web/
      config.json
    gateway/
      matrix.conf
    schemas/
      events/
        matrix_event.schema.json
    README_MATRIX.md
```

---

## 2. Synapse — шаблони конфігів

### 2.1 `synapse/homeserver.yaml`

Шаблон (без реальних ключів і паролів):

* `server_name: "matrix.daarion.space"` (placeholder)
* `public_baseurl: "https://matrix.daarion.space/"` (placeholder)
* `database:` → Postgres (без реальних паролів)
* `listeners:`:

  * порт 8008 (http)

* `registration:`:

  * `enable_registration: false`
  * `registration_shared_secret: "<TO_BE_FILLED>"` (placeholder comment)

* `media_store_path: "/data/media"` (placeholder)
* `federation_domain_whitelist` (коментар, не обов'язково)
* `modules:`:

  * залишити секцію порожньою або з коментарями для майбутніх MSC

* `log_config: /config/log.config`

**Важливо:** у файлі мають бути **коментарі**, що це шаблон і реальні значення будуть заповнені в PHASE MATRIX FULL.

### 2.2 `synapse/workers.yaml`

Шаблон worker-конфіга:

```yaml
worker_app: generic_worker

worker_name: worker1

worker_listeners:
  - type: http
    port: 9101
    resources:
      - names: [client, federation]
        compress: false

worker_daemonize: false

worker_log_config: /config/log.config

worker_replication_host: synapse
worker_replication_port: 9093
worker_replication_http_port: 9093
```

* коментарі, як це буде використовуватись у майбутньому.

### 2.3 `synapse/log.config`

Мінімальний logging конфіг (YAML), з рівнем `INFO` та коментарями.

---

## 3. Postgres schema init

`postgres/init.sql` — SQL-шаблон:

* створити БД `synapse`
* створити роль `synapse` з паролем `'CHANGE_ME'` (коментар, що змінити)
* дати права на БД

```sql
create database synapse;
create user synapse with encrypted password 'CHANGE_ME';
grant all privileges on database synapse to synapse;
```

Коментар: у PHASE MATRIX FULL буде або використовуватись офіційний мигратор Synapse, або helm/compose, а це — лише стартова заготівка.

---

## 4. TURN/STUN конфіг

`turn/turnserver.conf` — шаблон для coturn:

* `listening-port=3478`
* `fingerprint`
* `lt-cred-mech`
* `realm=daarion.space`
* `user=matrix:CHANGE_ME`
* `total-quota=100`
* `bps-capacity=0`

З великими коментарями:

* про використання real secrets
* про те, що TLS/DTLS налаштовуватиметься в PHASE MATRIX FULL

---

## 5. Element Web конфіг

`element-web/config.json` — базовий шаблон:

```json
{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "https://matrix.daarion.space",
      "server_name": "daarion.space"
    }
  },
  "brand": "DAARION Matrix",
  "integrations_ui_url": "https://scalar.vector.im/",
  "integrations_rest_url": "https://scalar.vector.im/api",
  "bug_report_endpoint_url": null,
  "features": {},
  "show_labs_settings": true,
  "defaultCountryCode": "UA",
  "disable_custom_urls": true,
  "disable_3pid_login": true
}
```

З коментарями (у README):

* як і де це буде використовуватись
* що сторінка `/element/` буде віддавати цей SPA

---

## 6. Gateway конфіг (Nginx) — шаблон

`gateway/matrix.conf`:

```nginx
# Шаблон. Не підключати до прод nginx поки що.

server {
    listen 80;
    server_name matrix.daarion.space;

    location /_matrix/ {
        proxy_pass http://matrix-homeserver:8008;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /element/ {
        root /var/www/element;
        try_files $uri /index.html;
    }
}
```

Коментар великими літерами:
**"ЦЕ ШАБЛОН. НЕ АКТИВУВАТИ, ПОКИ НЕ БУДЕ PHASE MATRIX FULL."**

---

## 7. Schemas — майбутній Bridge

`schemas/events/matrix_event.schema.json`:

JSON Schema для подій, які:

* Matrix → DAARION (через майбутній bridge)
* DAARION → Matrix

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Matrix Event (Bridge)",
  "type": "object",
  "properties": {
    "event_id": { "type": "string" },
    "room_id": { "type": "string" },
    "sender": { "type": "string" },
    "type": { "type": "string" },
    "origin_server_ts": { "type": "integer" },
    "content": { "type": "object" }
  },
  "required": ["event_id", "room_id", "sender", "type", "content"]
}
```

---

## 8. README_MATRIX.md

Документ повинен описати:

### 8.1. Ролі

* Synapse — Matrix homeserver
* Element Web — клієнт
* TURN — медіа (voice/video, на майбутнє)
* Gateway — HTTP reverse proxy
* Bridge (майбутній) — DAARION City / Agents ↔ Matrix

### 8.2. Фази

Описати **5 фаз**:

1. **Phase 4 — Prepare (цей таск)**

   * файли, структури, без деплою.

2. **Phase 5 — Base Synapse Deploy**

   * розгортання Synapse + Postgres + TLS.

3. **Phase 6 — Element Web + Gateway**

   * деплой статичного SPA, `/element/` route, `/_matrix/`.

4. **Phase 7 — Federation + Multi-node**

   * кілька нод DAARION Matrix, federation keys, SRV-записи.

5. **Phase 8 — DAARION Bridge**

   * агентний міст: public rooms ↔ Matrix rooms, presence, events.

### 8.3. Безпека

* зберігання ключів
* обмеження доступу
* E2EE keys (відповідальність клієнта)
* логування та privacy

---

## 9. Acceptance Criteria

1. Директорія `infra/matrix/` існує з усіма піддиректоріями й файлами.
2. Усі конфіги (`homeserver.yaml`, `workers.yaml`, `log.config`, `config.json`, `turnserver.conf`, `matrix.conf`) — є, містять валідний YAML/JSON/NGINX-синтаксис.
3. `postgres/init.sql` — є, описує базову схему БД (без реальних паролів).
4. `schemas/events/matrix_event.schema.json` — валідний JSON Schema.
5. `README_MATRIX.md` — повністю описує архітектуру, фази, безпеку та майбутні кроки.
6. **ЖОДНОГО** нового сервісу не додано в docker-compose.
7. **ЖОДЕН** Matrix-сервіс не запускається в цій фазі.

---

## 10. Команда для Cursor

**"Підготувати структуру та конфіги для Matrix згідно TASK_PHASE_MATRIX_PREPARE.md.
НЕ змінювати існуючі docker-compose, НЕ запускати Synapse/Element/Turn,
тільки створити файли та README."**

