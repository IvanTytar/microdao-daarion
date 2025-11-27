# TASK_MATRIX_PREPARE_ONLY.md

Matrix & Element — PREPARATION PHASE (no deploy)

## 0. Ціль

Підготувати Cursor до майбутнього впровадження повного Matrix stack, але **нічого не запускаючи**.  

Результат: структури, конфіги, документація, дизайн-схема — без інсталяції.

---

## 1. Структура майбутнього каталогу

```
infra/matrix/
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
  README_MATRIX.md
```

---

## 2. Фази майбутнього впровадження

### Phase 1 — Base Synapse

- homeserver.yaml
- Postgres schema
- registration tokens
- media repo
- rate limits
- .well-known/matrix/client
- workers mode architecture

### Phase 2 — Element Web

- element-web build
- config.json
- routing через `/element/`
- custom branding

### Phase 3 — Federation

- DNS SRV
- federation listener
- multi-node mesh
- key sharing
- presence federation

### Phase 4 — Agent Bridge

- agent_matrix_bridge.py
- NATS ↔ Matrix events
- mapping rooms → channels
- agent replies → matrix events

### Phase 5 — DAARION City Mesh

- районні сервери
- глобальні канали Marketplace / Governance

---

## 3. Документація, яку треба створити (але не виконувати)

### README_MATRIX.md

- Архітектура
- Фази 1–5
- Валідація
- Security model
- Federation design

### config.json (Element)

- базові поля:

```json
{
  "default_server_config": {},
  "show_labs_settings": true,
  "default_country_code": "UA"
}
```

### homeserver.yaml (шаблон)

- server_name
- signing keys
- registration
- modules (MSC3861, MSC3981)
- federation settings

---

## 4. Acceptance Criteria

Cursor повинен:

- створити всі шаблонні файли  
- створити README_MATRIX.md  
- підготувати структуру директорій  
- НЕ запускати Synapse  
- НЕ змінювати docker-compose  
- НЕ виконувати деплой  
- НЕ генерувати SSL/DNS  

---

## 5. Команда до Cursor

**"Створи структуру та конфіги згідно TASK_MATRIX_PREPARE_ONLY.md, але не виконуй ніякого деплою."**

