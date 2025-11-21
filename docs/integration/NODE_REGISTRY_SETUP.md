# 🚀 Node Registry Setup - Інструкція

**Дата**: 2025-11-18  
**Статус**: ⚠️ В процесі налаштування

---

## ✅ Що зроблено

1. ✅ **Синхронізовано код** на сервер
2. ✅ **Створено базу даних** `node_registry`
3. ✅ **Створено таблиці** з правильним enum типом
4. ✅ **Виправлено Dockerfile** (шляхи)
5. ✅ **Виправлено docker-compose.yml** (DB_HOST, DATABASE_URL)
6. ⏳ **Контейнер запускається** (health: starting)

---

## 📋 Налаштування

### База даних:
```sql
CREATE DATABASE node_registry;
CREATE TYPE nodestatus AS ENUM ('online', 'offline', 'unknown');
CREATE TABLE nodes (...);
```

### Docker Compose:
```yaml
node-registry:
  environment:
    - NODE_REGISTRY_DB_HOST=dagi-postgres
    - DATABASE_URL=postgresql://postgres:postgres@dagi-postgres:5432/node_registry
```

---

## 🎯 Наступні кроки

### 1. Зареєструвати Node 1 (сервер)
```bash
# На сервері
python3 -m tools.dagi_node_agent.bootstrap \
  --role router-node \
  --labels gpu,server,heavy \
  --registry-url http://localhost:9205
```

### 2. Зареєструвати Node 2 (ноутбук)
```bash
# На ноутбуку
python3 -m tools.dagi_node_agent.bootstrap \
  --role heavy-vision-node \
  --labels gpu,home,mac \
  --registry-url http://144.76.224.179:9205
```

---

*Створено: 2025-11-18*

