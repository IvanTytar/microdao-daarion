# Task: Configure rag-ingest-worker routing & unified event interface

## Goal

Налаштувати **єдиний інтерфейс на вхід** для `rag-ingest-worker` і routing таблицю, яка:

- приймає події з `teams.*`/outbox або відповідних STREAM_*,
- уніфіковано парсить Event Envelope (`event`, `ts`, `meta`, `payload`),
- мапить `event.type` → нормалізатор/пайплайн (Wave 1–3),
- гарантує правильну обробку `mode`/`indexed` для всіх RAG-подій.

Це glue-задача, яка повʼязує Event Catalog із `rag_ingestion_events_*` тасками.

---

## Context

- Root: `microdao-daarion/`.
- Event envelope та NATS: `docs/cursor/42_nats_event_streams_and_event_catalog.md`.
- RAG worker & gateway:
  - `docs/cursor/rag_ingestion_worker_task.md`
  - `docs/cursor/rag_gateway_task.md`
- RAG waves:
  - `docs/cursor/rag_ingestion_events_wave1_mvp_task.md`
  - `docs/cursor/rag_ingestion_events_wave2_workflows_task.md`
  - `docs/cursor/rag_ingestion_events_wave3_governance_rwa_task.md`

---

## 1. Єдиний event envelope у воркері

У `services/rag-ingest-worker/events/consumer.py` або окремому модулі:

1. Ввести Pydantic-модель/DTO для envelope, наприклад `RagEventEnvelope`:
   - `event_id: str`
   - `ts: datetime`
   - `type: str` (повний typo: `chat.message.created`, `task.created`, ...)
   - `domain: str` (optional)
   - `meta: { team_id, trace_id, ... }`
   - `payload: dict`
2. Додати функцію `parse_raw_msg_to_envelope(raw_msg) -> RagEventEnvelope`.
3. Забезпечити, що **весь routing** далі працює з `RagEventEnvelope`, а не з сирим JSON.

---

## 2. Routing таблиця (Wave 1–3)

У тому ж модулі або окремому `router.py` створити mapping:

```python
ROUTES = {
  "chat.message.created": handle_message_created,
  "doc.upserted": handle_doc_upserted,
  "file.uploaded": handle_file_uploaded,
  "task.created": handle_task_event,
  "task.updated": handle_task_event,
  "followup.created": handle_followup_event,
  "followup.status_changed": handle_followup_event,
  "meeting.summary.upserted": handle_meeting_summary,
  "governance.proposal.created": handle_proposal_event,
  "governance.proposal.closed": handle_proposal_event,
  "governance.vote.cast": handle_vote_event,
  "payout.generated": handle_payout_event,
  "payout.claimed": handle_payout_event,
  "rwa.summary.created": handle_rwa_summary_event,
}
```

Handler-и мають бути thin-обгортками над нормалізаторами з `pipeline/normalization.py` та `index_neo4j.py`.

---

## 3. Обробка `mode` та `indexed`

У кожному handler-і або в спільній helper-функції треба:

1. Дістати `mode` та `indexed` з `payload` (або похідним чином).
2. Якщо `indexed == false` — логувати і завершувати без виклику нормалізаторів.
3. Передавати `mode` у нормалізатор, щоб той міг вирішити, чи зберігати plaintext.

Рекомендовано зробити утиліту, наприклад:

```python
def should_index(event: RagEventEnvelope) -> bool:
    # врахувати payload.indexed + можливі global overrides
    ...
```

і використовувати її у всіх handler-ах.

---

## 4. Підписки на NATS (streams vs teams.*)

У `events/consumer.py` узгодити 2 можливі режими:

1. **Прямі підписки на STREAM_*:**
   - STREAM_CHAT → `chat.message.*`
   - STREAM_PROJECT → `doc.upserted`, `meeting.*`
   - STREAM_TASK → `task.*`, `followup.*`
   - STREAM_GOVERNANCE → `governance.*`
   - STREAM_RWA → `rwa.summary.*`
2. **teams.* outbox:**
   - якщо існує outbox-стрім `teams.*` із aggregate-подіями, воркер може підписуватися на нього замість окремих STREAM_*.

У цьому таску достатньо:

- вибрати й реалізувати **один** режим (той, що відповідає поточній архітектурі);
- акуратно задокументувати, які subjects використовуються, щоб не дублювати події.

---

## 5. Error handling & backpressure

У routing-шарі реалізувати базові правила:

- якщо `event.type` відсутній у `ROUTES` → логувати warning і ack-нути подію (щоб не блокувати стрім);
- якщо нормалізація/embedding/indexing кидає виняток →
  - логувати з контекстом (`event_id`, `type`, `team_id`),
  - залежно від політики JetStream: або `nack` з retry, або ручний DLQ.

Можна додати просту метрику: `ingest_events_total{type=..., status=ok|error}`.

---

## 6. Acceptance criteria

1. У `rag-ingest-worker` існує єдина модель envelope (`RagEventEnvelope`) і функція парсингу raw NATS-повідомлень.
2. Routing таблиця покриває всі події Wave 1–3, описані в `rag_ingestion_events_wave*_*.md`.
3. Усі handler-и використовують спільну логіку `should_index(event)` для `mode`/`indexed`.
4. NATS-підписки налаштовані на обраний режим (STREAM_* або `teams.*`), задокументовані й не дублюють події.
5. В наявності базове логування/обробка помилок на рівні routing-шару.
6. Цей файл (`docs/cursor/rag_ingest_worker_routing_task.md`) можна виконати через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingest_worker_routing_task.md
   ```

   і Cursor використає його як основу для налаштування routing-шару ingestion-воркера.
