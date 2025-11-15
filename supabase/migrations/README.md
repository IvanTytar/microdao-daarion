# Database Migrations (MicroDAO)

SQL-міграції для схеми бази даних microDAO/DAARION.city

---

## Структура

Міграції розташовані в хронологічному порядку:

1. `000001_init.sql` - Users, Sessions, базові extensions
2. `000002_microdao_core.sql` - Teams, Channels, Messages, Follow-ups, Co-Memory
3. `000003_projects_tasks.sql` - Projects, Tasks
4. `000004_agents.sql` - Agents, Agent Runs
5. `000005_wallet_staking_payouts.sql` - Wallets, Staking, Payouts
6. `000006_rwa.sql` - RWA Inventory
7. `000007_embassy.sql` - Embassy Module (identities, webhooks, oracles)
8. `000008_access_keys_capabilities.sql` - Access Keys, Capabilities, Bundles
9. `000009_audit_outbox.sql` - Audit Log, Outbox Events
10. `000010_teams_type_and_city_links.sql` - Teams type field, city_links, DAARION.city seed
11. `seeds.sql` - Seed data для bundles, capabilities та bundle mappings (запускати після всіх міграцій)

---

## Використання

### З Supabase CLI

```bash
# Застосувати всі міграції локально
supabase db reset

# Застосувати seed data після міграцій
psql -d microdao -f supabase/migrations/seeds.sql

# Або застосувати конкретну міграцію
supabase migration up 000001_init
```

### З PostgreSQL напряму

```bash
# Застосувати всі міграції по порядку
psql -d microdao -f 000001_init.sql
psql -d microdao -f 000002_microdao_core.sql
# ... і так далі до 000009_audit_outbox.sql

# Після всіх міграцій застосувати seed data
psql -d microdao -f seeds.sql
```

---

## Порядок застосування

**Важливо:** Міграції повинні застосовуватися строго в порядку нумерації, оскільки вони залежать одна від одної.

---

## Seed Data

Файл `seeds.sql` містить:

- Базові capabilities (chat, wallet, agent, projects, RWA, embassy, governance, comemory)
- Прив'язку capabilities до bundle.role.* (Owner, Guardian, Member, Visitor)
- Прив'язку capabilities до bundle.plan.* (Freemium, Casual, Premium, Platformium)

---

## Rollback

Кожна міграція містить секцію `-- Down` для відкочення змін.

**Увага:** 
- Outbox events не відкочуються
- RWA-поведінка не rollback'иться ніколи
- На prod rollback дозволено тільки для staging, forward-fix для prod

---

## Посилання

- Повна специфікація: `docs/cursor/27_database_schema_migrations.md`
- Access Keys System: `docs/cursor/24_access_keys_capabilities_system.md`

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14

