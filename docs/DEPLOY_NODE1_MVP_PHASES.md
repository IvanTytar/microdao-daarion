# 🚀 Deployment Phase 1-3 на НОДА1 (Hetzner GEX44)

**НОДА1 IP:** 144.76.224.179  
**SSH:** `root@144.76.224.179`  
**Project Root:** `/opt/microdao-daarion`  
**Domain:** `gateway.daarion.city`  
**Існує:** DAGI Stack (17+ сервісів)

---

## 🎯 Стратегія Deployment

### Варіант A: **Інтеграція в існуючий stack** (Рекомендовано)

**Підхід:** Додати Phase 1-3 сервіси до існуючого `docker-compose.all.yml`

**Переваги:**
- ✅ Використовує існуючу БД (PostgreSQL)
- ✅ Використовує існуючий Redis
- ✅ Використовує існуючий Nginx/SSL
- ✅ Мінімальні зміни інфраструктури
- ✅ Спільний моніторинг (Grafana/Prometheus)

**Недоліки:**
- ⚠️ Потрібно перевірити конфлікти портів
- ⚠️ Потрібно оновити Nginx config

---

### Варіант B: **Окремий stack**

**Підхід:** Створити окремий `docker-compose.mvp.yml`

**Переваги:**
- ✅ Повна ізоляція
- ✅ Легко rollback
- ✅ Незалежне тестування

**Недоліки:**
- ❌ Дублювання БД/Redis
- ❌ Додаткове навантаження
- ❌ Складніше управління

---

## ✅ Рекомендація: Варіант A (Інтеграція)

Додаємо Phase 1-3 сервіси до існуючого stack.

---

## 📊 Перевірка існуючої інфраструктури

### 1. Перевірка запущених сервісів

```bash
ssh root@144.76.224.179

# Перевірити що працює
docker ps

# Перевірити порти
sudo netstat -tulpn | grep LISTEN

# Перевірити compose файли
ls -la /opt/microdao-daarion/docker-compose*.yml
```

**Очікувані порти (вже зайняті):**
- 9102 — Router
- 9300 — Bot Gateway
- 8008 — DevTools
- 8890 — Swapper
- 8899 — Frontend
- 5432 — PostgreSQL
- 6379 — Redis
- 9090 — Prometheus
- 3000 — Grafana

---

## 🆕 Нові сервіси Phase 1-3

### Phase 2: Agents Core
- **Порт:** 7002 (не конфліктує!)
- **Контейнер:** `daarion-agents-service`

### Phase 3: City Service
- **Порт:** 7001 (не конфліктує!)
- **Контейнер:** `daarion-city-service`

### Phase 3: Second Me Service
- **Порт:** 7003 (не конфліктує!)
- **Контейнер:** `daarion-secondme-service`

### Phase 3: MicroDAO Service (Phase 7)
- **Порт:** 7004 (не конфліктує!)
- **Контейнер:** `daarion-microdao-service`

**✅ Немає конфліктів портів!**

---

## 🔧 Deployment Steps

### Крок 1: Підготовка (локально)

```bash
# На NODE2 (MacBook)
cd /Users/apple/github-projects/microdao-daarion

# Commit останні зміни
git add .
git commit -m "Phase 1-3 ready for NODE1 deployment"
git push origin main
```

---

### Крок 2: Підключення до НОДА1

```bash
# SSH до НОДА1
ssh root@144.76.224.179

# Перейти в проект
cd /opt/microdao-daarion

# Pull останніх змін
git pull origin main
```

---

### Крок 3: Перевірка ENV

```bash
# Перевірити .env файл
cat .env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"

# Якщо потрібно додати нові змінні:
vim .env
```

**Додати до .env:**

```bash
# Phase 1-3 Services
AGENTS_SERVICE_URL=http://agents-service:7002
CITY_SERVICE_URL=http://city-service:7001
SECONDME_SERVICE_URL=http://secondme-service:7003
MICRODAO_SERVICE_URL=http://microdao-service:7004

# City Config
CITY_DEFAULT_ROOMS=general,welcome,builders,science,energy
SECONDME_AGENT_ID=ag_secondme_global

# WebSocket
WS_BASE_URL=wss://gateway.daarion.city/ws
```

---

### Крок 4: Оновити docker-compose.all.yml

**Опція 1: Я створю оновлений файл (рекомендовано)**
- Я можу створити повний `docker-compose.all.yml` з новими сервісами
- Ти просто скопіюєш на НОДА1

**Опція 2: Ти вручну додаси через термінал**
- Я дам тобі exact commands
- Ти виконаєш їх через SSH

---

### Крок 5: Міграції БД

```bash
# На НОДА1
cd /opt/microdao-daarion

# Застосувати Phase 1-3 міграції
for i in {001..010}; do
  echo "Applying migration ${i}..."
  docker compose -f docker-compose.all.yml exec -T dagi-postgres \
    psql -U postgres -d daarion_memory -f /migrations/${i}_*.sql
done
```

**Важливо:** Перевірити що міграції є в `/opt/microdao-daarion/migrations/`

---

### Крок 6: Білд і старт нових сервісів

```bash
# Білд нових сервісів
docker compose -f docker-compose.all.yml build agents-service city-service secondme-service microdao-service

# Старт нових сервісів (без перезапуску існуючих!)
docker compose -f docker-compose.all.yml up -d agents-service city-service secondme-service microdao-service

# Перевірка
docker ps | grep -E "agents-service|city-service|secondme-service"
```

---

### Крок 7: Оновити Nginx Config

**Додати до Nginx config (`/etc/nginx/sites-available/daarion`):**

```nginx
# Phase 1-3 API endpoints
location /api/city/ {
    proxy_pass http://127.0.0.1:7001/city/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/agents/ {
    proxy_pass http://127.0.0.1:7002/agents/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/secondme/ {
    proxy_pass http://127.0.0.1:7003/secondme/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/microdao/ {
    proxy_pass http://127.0.0.1:7004/microdao/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# WebSocket для City Rooms
location /ws/city/ {
    proxy_pass http://127.0.0.1:7001/ws/city/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

**Застосувати:**

```bash
# Перевірити синтаксис
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Крок 8: Перевірка Health

```bash
# Перевірити здоров'я нових сервісів
curl http://localhost:7001/health  # City Service
curl http://localhost:7002/health  # Agents Service
curl http://localhost:7003/health  # Second Me
curl http://localhost:7004/health  # MicroDAO

# Через публічний домен
curl https://gateway.daarion.city/api/city/health
curl https://gateway.daarion.city/api/agents/health
curl https://gateway.daarion.city/api/secondme/health
```

---

### Крок 9: Smoke Tests

```bash
# City Rooms API
curl https://gateway.daarion.city/api/city/rooms | jq

# Очікуємо: 5 default rooms
```

---

## 📋 Checklist Deployment

### Pre-deployment:
- [ ] Git push з NODE2 виконано
- [ ] Backup БД на НОДА1 створено
- [ ] .env файл перевірено
- [ ] Міграції є в `/opt/microdao-daarion/migrations/`

### Deployment:
- [ ] Git pull на НОДА1 виконано
- [ ] docker-compose.all.yml оновлено
- [ ] Нові сервіси зібрані (`docker compose build`)
- [ ] Нові сервіси запущені (`docker compose up -d`)
- [ ] Nginx config оновлено
- [ ] Nginx reload виконано

### Post-deployment:
- [ ] Health checks пройдені (4/4 сервіси)
- [ ] City Rooms API повертає 5 кімнат
- [ ] WebSocket connection працює
- [ ] Логи не містять критичних помилок
- [ ] Frontend інтегровано (якщо потрібно)

---

## 🚨 Rollback Plan

Якщо щось пішло не так:

```bash
# Зупинити нові сервіси
docker compose -f docker-compose.all.yml stop agents-service city-service secondme-service microdao-service

# Видалити контейнери
docker compose -f docker-compose.all.yml rm -f agents-service city-service secondme-service microdao-service

# Відкатити Nginx config
sudo cp /etc/nginx/sites-available/daarion.backup /etc/nginx/sites-available/daarion
sudo systemctl reload nginx

# Відкатити БД (якщо потрібно)
docker compose -f docker-compose.all.yml exec -T dagi-postgres \
  psql -U postgres -d daarion_memory < backup.sql
```

---

## 🤖 Автоматизація vs Manual

### Варіант 1: Я створю deployment script
```bash
# Скрипт який зробить все автоматично
./scripts/deploy-phase1-3-node1.sh
```

**Переваги:**
- ✅ Швидко
- ✅ Менше помилок
- ✅ Repeatable

### Варіант 2: Ти виконаєш вручну
```bash
# Ти виконаєш команди крок за кроком через SSH
ssh root@144.76.224.179
cd /opt/microdao-daarion
# ... etc
```

**Переваги:**
- ✅ Повний контроль
- ✅ Розумієш кожен крок
- ✅ Легше debug

---

## 💡 Рекомендація

**Я рекомендую:**

1. **Я створю:**
   - Оновлений `docker-compose.all.yml` (з Phase 1-3 сервісами)
   - Deployment script `deploy-phase1-3-node1.sh`
   - Nginx config snippet

2. **Ти виконаєш:**
   - Git push з NODE2
   - SSH на НОДА1
   - Git pull
   - Запуск deployment script
   - Перевірка результатів

**Це найбільш безпечний і швидкий підхід.**

---

## ❓ Питання перед стартом

1. **Чи є backup БД на НОДА1?**
   - Якщо ні, створити перед deployment

2. **Чи працює існуючий DAGI Stack стабільно?**
   - Перевірити `docker ps` та логи

3. **Чи потрібно інтегрувати Frontend (port 8899)?**
   - Існуючий Frontend оновити чи залишити як є?

4. **Який domain використовувати для Phase 1-3?**
   - `gateway.daarion.city` (існуючий) ✅
   - `app.daarion.city` (новий субдомен)
   - Інший?

---

## 🚀 Ready to Deploy?

**Обери підхід:**

**A) Я створю deployment package** (рекомендовано)
- Скажи "створи deployment package"
- Я створю всі необхідні файли та скрипти
- Ти просто запустиш на НОДА1

**B) Manual step-by-step**
- Скажи "покрокова інструкція"
- Я дам детальні команди для кожного кроку
- Ти виконаєш через термінал

**C) Гібридний підхід**
- Я створю docker-compose та scripts
- Ти виконаєш деякі кроки вручну (Nginx, перевірки)

---

**Що обираєш? 🎯**


