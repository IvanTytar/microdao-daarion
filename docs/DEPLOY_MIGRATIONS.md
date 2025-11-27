# Database Migrations для DAARION Production

**База даних:** PostgreSQL 15+  
**Міграції:** 001 → 010

---

## 📋 Список міграцій

| # | Файл | Опис | Залежності |
|---|------|------|------------|
| 001 | `001_initial_schema.sql` | Базова схема (users, sessions) | - |
| 002 | `002_teams_channels.sql` | Teams та Channels | 001 |
| 003 | `003_messages.sql` | Messaging система | 002 |
| 004 | `004_agents_core.sql` | Agents та blueprints | 001 |
| 005 | `005_agent_events.sql` | Agent lifecycle events | 004 |
| 006 | `006_passkeys.sql` | Passkey authentication | 001 |
| 007 | `007_api_keys.sql` | API keys management | 001 |
| 008 | `008_microdao_core.sql` | MicroDAO система | 001 |
| 009 | `009_dao_governance.sql` | DAO governance та voting | 008 |
| 010 | `010_create_city_backend.sql` | City Rooms + Second Me | 001 |

---

## 🚀 Початкове застосування міграцій

### Метод 1: Через psql (Рекомендовано для першого deploy)

```bash
# 1. Підключитися до сервера
ssh user@daarion.space

# 2. Перейти в директорію проєкту
cd /opt/daarion

# 3. Запустити PostgreSQL (якщо ще не запущений)
docker compose -f docker-compose.all.yml up -d postgres

# 4. Почекати поки PostgreSQL готовий
docker compose -f docker-compose.all.yml exec postgres pg_isready -U daarion_user

# 5. Застосувати міграції по порядку
for i in {001..010}; do
  echo "Applying migration ${i}..."
  docker compose -f docker-compose.all.yml exec -T postgres \
    psql -U daarion_user -d daarion -f /migrations/${i}_*.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ Migration ${i} applied successfully"
  else
    echo "❌ Migration ${i} failed!"
    exit 1
  fi
done

echo "🎉 All migrations applied successfully!"
```

### Метод 2: Через migration service (автоматизовано)

```bash
# Якщо є окремий migrations service в docker-compose.all.yml:
docker compose -f docker-compose.all.yml run --rm migrations
```

---

## 📂 Структура міграцій

```text
/opt/daarion/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_teams_channels.sql
    ├── 003_messages.sql
    ├── 004_agents_core.sql
    ├── 005_agent_events.sql
    ├── 006_passkeys.sql
    ├── 007_api_keys.sql
    ├── 008_microdao_core.sql
    ├── 009_dao_governance.sql
    └── 010_create_city_backend.sql
```

---

## 🔍 Перевірка стану міграцій

### Метод 1: Manual check
```bash
# Перевірити які таблиці створені
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "\dt"

# Перевірити конкретну таблицю
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "\d city_rooms"

# Перевірити seed дані
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT * FROM city_rooms;"
```

### Метод 2: Via migration tracking table
```bash
# Створити таблицю для tracking
docker compose -f docker-compose.all.yml exec -T postgres \
  psql -U daarion_user -d daarion << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

# Перевірити застосовані міграції
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
```

---

## 🔄 Re-run міграцій (Idempotent)

Всі міграції мають бути **idempotent** (можна запускати декілька разів):

```sql
-- Приклад з 010_create_city_backend.sql:
CREATE TABLE IF NOT EXISTS city_rooms (...);
CREATE INDEX IF NOT EXISTS idx_city_rooms_slug ON city_rooms(slug);

INSERT INTO city_rooms (id, slug, name, ...) VALUES (...)
ON CONFLICT (id) DO NOTHING;
```

### Re-apply конкретної міграції:
```bash
# Якщо потрібно перезастосувати (тільки якщо idempotent!)
docker compose -f docker-compose.all.yml exec -T postgres \
  psql -U daarion_user -d daarion < migrations/010_create_city_backend.sql
```

---

## 🛠️ Migration Helper Script

Створити `scripts/migrate.sh`:

```bash
#!/bin/bash
set -e

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}DAARION Database Migrations${NC}"
echo "======================================="

# Перевірка що PostgreSQL запущений
echo "Checking PostgreSQL status..."
if ! docker compose -f docker-compose.all.yml exec postgres pg_isready -U daarion_user > /dev/null 2>&1; then
  echo -e "${RED}❌ PostgreSQL is not ready!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Застосування міграцій
MIGRATION_DIR="./migrations"
SUCCESS_COUNT=0
FAIL_COUNT=0

for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
  filename=$(basename "$migration")
  echo -e "\n${YELLOW}Applying $filename...${NC}"
  
  if docker compose -f docker-compose.all.yml exec -T postgres \
    psql -U daarion_user -d daarion < "$migration"; then
    echo -e "${GREEN}✅ $filename applied successfully${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}❌ $filename failed!${NC}"
    ((FAIL_COUNT++))
    exit 1
  fi
done

echo -e "\n======================================="
echo -e "${GREEN}🎉 All migrations completed!${NC}"
echo -e "Success: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
```

Використання:
```bash
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

---

## 🔙 Rollback Strategy

### Створення rollback файлів (для майбутнього):
```text
migrations/
  ├── 010_create_city_backend.sql
  └── 010_create_city_backend_rollback.sql
```

### Приклад rollback:
```sql
-- 010_create_city_backend_rollback.sql
DROP TABLE IF EXISTS secondme_messages CASCADE;
DROP TABLE IF EXISTS secondme_sessions CASCADE;
DROP TABLE IF EXISTS city_feed_events CASCADE;
DROP TABLE IF EXISTS city_room_messages CASCADE;
DROP TABLE IF EXISTS city_rooms CASCADE;
```

**Застосування rollback:**
```bash
docker compose -f docker-compose.all.yml exec -T postgres \
  psql -U daarion_user -d daarion < migrations/010_create_city_backend_rollback.sql
```

---

## 🧪 Testing міграцій

### Pre-deployment testing (на dev environment):
```bash
# 1. Backup поточної БД
docker compose -f docker-compose.all.yml exec postgres \
  pg_dump -U daarion_user daarion > backup_before_migration.sql

# 2. Застосувати міграції
./scripts/migrate.sh

# 3. Перевірити що все працює
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT COUNT(*) FROM city_rooms;"

# 4. Якщо щось не так - rollback:
docker compose -f docker-compose.all.yml exec -T postgres \
  psql -U daarion_user -d daarion < backup_before_migration.sql
```

---

## 📊 Моніторинг розміру БД

```bash
# Розмір БД
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT pg_size_pretty(pg_database_size('daarion'));"

# Розмір таблиць
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "
  SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
  "

# Кількість записів
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "
  SELECT 
    schemaname,
    relname,
    n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC;
  "
```

---

## 🔒 Backup перед міграціями

```bash
# Автоматичний backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

docker compose -f docker-compose.all.yml exec postgres \
  pg_dump -U daarion_user daarion > /opt/daarion/backups/$BACKUP_FILE

echo "Backup created: $BACKUP_FILE"

# Compress backup
gzip /opt/daarion/backups/$BACKUP_FILE
```

---

## 🚨 Troubleshooting

### Проблема: Migration fails з permission error
**Рішення:**
```bash
# Перевірити права користувача
docker compose -f docker-compose.all.yml exec postgres \
  psql -U postgres -c "\du daarion_user"

# Надати потрібні права
docker compose -f docker-compose.all.yml exec postgres \
  psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE daarion TO daarion_user;"
```

### Проблема: Table already exists
**Рішення:**
Переконатися що міграція використовує `CREATE TABLE IF NOT EXISTS`

### Проблема: Foreign key constraint fails
**Рішення:**
Перевірити порядок міграцій — залежні таблиці мають створюватися після основних.

---

## ✅ Post-migration Checklist

- [ ] Всі 10 міграцій застосовані успішно
- [ ] Seed дані створені (5 default city rooms)
- [ ] Індекси створені
- [ ] Foreign keys працюють
- [ ] Таблиця tracking міграцій оновлена
- [ ] Backup БД створено
- [ ] Логи міграцій збережені
- [ ] Performance перевірено (query plans)

---

## 📚 Наступні кроки

1. ➡️ **Services Startup** (`docs/DEPLOY_SERVICES.md`)
2. ➡️ **Smoke Tests** (`docs/DEPLOY_SMOKETEST_CHECKLIST.md`)
3. ➡️ **Monitoring Setup** (`docs/DEPLOY_MONITORING.md`)

---

**Статус:** ✅ Migrations Guide Complete  
**Версія:** 1.0.0  
**Дата:** 24 листопада 2025

