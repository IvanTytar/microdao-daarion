# Nodes Registry v0 (Draft)

## Мета
Створити єдину базу даних про всі вузли (NODE1, NODE2, майбутні регіони) з метою:
- відстеження конфігурацій і версій ПЗ;
- автоматизації Node Join Protocol;
- розподілу завдань агентів та сервісів.

## Поточний статус
- NODE1 та NODE2 ведуться вручну в INFRASTRUCTURE.md.
- Автоматичного API немає.

## План
1. **Схема таблиці `nodes`:**
   - `node_id`, `hostname`, `role`, `env`, `ip_public`, `ip_private`, `gpu`, `status`.
2. **Service:** FastAPI (Node Registry) з CRUD + auth.
3. **Sync агенти:** кожен node-agent шле heartbeat в регістр через NATS.
4. **UI:** вкладка "Nodes" в admin-панелі.

## Інтеграції
- Node Join Protocol (draft).
- DAIS (CORE) — зберігає прив'язку agent → node.
- Infra Automation Pack — використовує registry для автоматизації sync/логів.

