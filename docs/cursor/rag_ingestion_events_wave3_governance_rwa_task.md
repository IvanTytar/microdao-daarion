# Task: RAG ingestion — Wave 3 (Governance, Votes, Rewards, Oracle/RWA)

## Goal

Підключити **третю хвилю** подій до RAG-ingestion воркера:

- governance (proposals, decisions),
- голосування (votes),
- винагороди/пейаути (rewards/payouts),
- oracle/RWA-події (агреговані знання про енергію/їжу/воду).

Wave 3 — це вже **meta-рівень DAO**: історія рішень, токен-економіка, агреговані показники.

---

## Context

- Root: `microdao-daarion/`.
- RAG gateway: `docs/cursor/rag_gateway_task.md`.
- RAG ingestion worker: `docs/cursor/rag_ingestion_worker_task.md`.
- Попередні хвилі: 
  - Wave 1 (chat/docs/files): `docs/cursor/rag_ingestion_events_wave1_mvp_task.md`.
  - Wave 2 (tasks/followups/meetings): `docs/cursor/rag_ingestion_events_wave2_workflows_task.md`.
- Event Catalog: `docs/cursor/42_nats_event_streams_and_event_catalog.md` (STREAM_GOVERNANCE, STREAM_RWA, STREAM_PAYOUT, STREAM_ORACLE, STREAM_USAGE).
- Governance/Tokenomics: 
  - `docs/cursor/31_governance_policies_for_capabilities_and_quotas.md`
  - `docs/cursor/49_wallet_rwa_payouts_claims.md`
  - `docs/cursor/40_rwa_energy_food_water_flow_specs.md`.

Головний принцип: **не індексувати всі сирі події RWA/oracle**, а працювати з узагальненими snapshot’ами / summary.

---

## 1. Governance & proposals

### 1.1. `governance.proposal.created` / `governance.proposal.closed`

STREAM_GOVERNANCE, типи:

- `governance.proposal.created`
- `governance.proposal.closed`

Рекомендований RAG-пейлоад:

- `payload.proposal_id`
- `payload.team_id`
- `payload.title`
- `payload.body` (текст пропозиції)
- `payload.author_user_id`
- `payload.status`: `open|passed|rejected|withdrawn`
- `payload.tags` (optional)
- `payload.mode`: `public|confidential`
- `payload.indexed`: bool (за замовчуванням true для public DAO)
- `payload.created_at`, `payload.closed_at`

**RAG-правила:**

- індексувати текст пропозиції (`title + body`) як `doc_type = "proposal"`;
- `proposal.closed` оновлює статус у metadata (через upsert).

Mapping → `IngestChunk`:

- `source_type = "proposal"`.
- `source_id = proposal_id`.
- `text = title + short(body)` (обрізати або chunk-нути по 512–1024 символів).
- `chunk_id = f"proposal:{team_id}:{proposal_id}:{chunk_index}"`.
- `tags` = `payload.tags` + `status`.
- `visibility = mode`.

---

## 2. Votes / Rewards

### 2.1. `governance.vote.cast`

Ці події важливі більше для **графу/аналітики**, ніж для Milvus.

Рекомендація:

- У Milvus:
  - не створювати окремих текстових чанків для кожного vote;
  - натомість — мати summary-документ (наприклад, у Co-Memory) з підсумками голосування (окремий таск).
- У Neo4j:
  - створювати ребра `(:User)-[:VOTED {choice, weight}]->(:Proposal)`.

Пейлоад:

- `payload.vote_id`
- `payload.team_id`
- `payload.proposal_id`
- `payload.user_id`
- `payload.choice`: `yes|no|abstain|...`
- `payload.weight`: число
- `payload.ts`

### 2.2. Rewards / payouts (`payout.*`, `reward.*`)

STREAM_PAYOUT / STREAM_WALLET / STREAM_USAGE, події:

- `payout.generated`
- `payout.claimed`
- можливо `reward.assigned` (якщо буде виділена).

Ідея для RAG:

- Не індексувати кожен payout як окремий chunk;
- натомість, періодично створювати (іншим сервісом) агреговані summary-документи:
  - "Payout history for user X",
  - "Rewards breakdown for project Y".

У рамках цієї Wave 3 задачі:

- Забезпечити Neo4j-вузли/ребра:
  - `(:Payout)-[:TO_USER]->(:User)`
  - `(:Payout)-[:FOR_TEAM]->(:MicroDAO)`
  - `(:Payout)-[:RELATED_TO]->(:Project|:RWAObject)`.

---

## 3. Oracle / RWA events

STREAM_RWA, STREAM_ORACLE, STREAM_EMBASSY — висока частота подій.

### 3.1. Raw events

Сирі події (`rwa.inventory.updated`, `oracle.reading.published`, `embassy.energy.update`, ...) **не повинні** напряму летіти у Milvus як plain text — вони більше підходять для time-series/аналітики.

### 3.2. Aggregated RAG documents

Підхід:

1. Інший сервіс (або batch job) формує періодичні summary-документи, наприклад:
   - `rwa.daily_summary.created`
   - `rwa.weekly_report.created`
2. Саме ці summary події підключаємо до RAG-ingestion як:
   - `source_type = "rwa_summary"` або `"oracle_summary"`.
   - текст = короткий опис ("Станція EU-KYIV-01 згенерувала 1.2 MWh цього тижня..."),
   - метадані: `site_id`, `domain`, `period_start`, `period_end`.

У цій задачі достатньо:

- додати підтримку абстрактних подій типу `rwa.summary.created` в нормалізаторі;
- **не** впроваджувати саму агрегацію (окрема Cursor-задача).

---

## 4. Зміни в `rag-ingest-worker`

### 4.1. Normalization

У `services/rag-ingest-worker/pipeline/normalization.py` додати:

- `normalize_proposal_event(event: dict) -> list[IngestChunk]`
- `normalize_rwa_summary_event(event: dict) -> list[IngestChunk]`

Для votes/payouts тут достатньо повернути `[]` (оскільки вони йдуть у Neo4j без текстових чанків), але:

- додати в `index_neo4j.update_graph_for_event` розгалуження по `event_type` для створення відповідних вузлів/ребер.

### 4.2. Routing

У `events/consumer.py` додати routing:

- `"governance.proposal.created"`, `"governance.proposal.closed"` → `handle_proposal_event` → `normalize_proposal_event` → Milvus + Neo4j.
- `"governance.vote.cast"` → тільки Neo4j (без Milvus), через `update_graph_for_event`.
- `"payout.generated"`, `"payout.claimed"` → тільки Neo4j.
- `"rwa.summary.created"` (або аналогічні) → `handle_rwa_summary_event` → `normalize_rwa_summary_event`.

### 4.3. Neo4j

Розширити `pipeline/index_neo4j.py`:

- Governance:
  - `(:Proposal)` вузли з атрибутами `status`, `team_id`, `tags`.
  - `(:User)-[:VOTED {choice, weight}]->(:Proposal)`.
- Payouts/Rewards:
  - `(:Payout)` вузли.
  - `(:Payout)-[:TO_USER]->(:User)`.
  - `(:Payout)-[:FOR_TEAM]->(:MicroDAO)`.
- RWA/Oracle summaries:
  - `(:RWAObject {site_id})`.
  - `(:RWAObject)-[:HAS_SUMMARY]->(:RwaSummary {period_start, period_end})`.

Усі операції — через `MERGE`, з `team_id`/`domain`/`visibility` у властивостях.

---

## 5. Тести

Unit-тести:

- `normalize_proposal_event` — створює 1..N чанків із правильними `source_type`, `source_id`, `tags`, `visibility`.
- `normalize_rwa_summary_event` — створює chunk з ключовими метаданими (`site_id`, `period`, `domain`).

Інтеграційно:

- опублікувати `governance.proposal.created` + `governance.proposal.closed` → переконатися, що Milvus і Neo4j оновились;
- опублікувати кілька `governance.vote.cast` → перевірити граф голосувань у Neo4j;
- опублікувати `rwa.summary.created` → перевірити, що зʼявився RWASummary у Milvus + Neo4j.

---

## Acceptance criteria

1. `rag-ingest-worker` обробляє Wave 3 події в dev-конфігурації (governance, vote, payout, rwa/oracle summaries).
2. Governance-пропозиції індексуються в Milvus як `doc_type = "proposal"` з коректними метаданими.
3. Neo4j містить базовий governance-граф (Proposals, Votes, Payouts, RWAObjects).
4. Oracle/RWA summary-події потрапляють у RAG як узагальнені знання, а не як сирі time-series.
5. Ідемпотентність дотримана (replay тих самих подій не створює дублікатів).
6. Цей файл (`docs/cursor/rag_ingestion_events_wave3_governance_rwa_task.md`) можна виконати через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingestion_events_wave3_governance_rwa_task.md
   ```

   і він слугує джерелом правди для Wave 3 RAG-ingestion.
