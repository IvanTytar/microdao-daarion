# 🚀 Інструкція для деплою Helion на сервер ЗАРАЗ

**Сервер**: 144.76.224.179  
**Домен**: gateway.daarion.city  
**Telegram токен**: 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM

---

## ✅ Що готово локально

- ✅ docker-compose.yml (додано postgres + memory-service)
- ✅ services/memory-service/init.sql (схема БД)
- ✅ .env (додано змінні для memory service)
- ✅ gateway-bot/helion_prompt.txt (system prompt)
- ✅ scripts/setup-nginx-gateway.sh (HTTPS setup)
- ✅ scripts/register-agent-webhook.sh (webhook registration)

---

## 📝 Крок 1: Закомітити і запушити

```bash
cd /Users/apple/github-projects/microdao-daarion

# Додати нові файли
git add docker-compose.yml
git add .env
git add services/memory-service/init.sql
git add STATUS-HELION.md
git add README-HELION-PROBLEMS.md
git add DEPLOY-NOW.md

# Закомітити
git commit -m "feat: add memory-service and postgres for Helion agent

- Add PostgreSQL database for memory service
- Add memory-service in docker-compose.yml
- Add database schema (init.sql)
- Update .env with memory service configuration
- Add documentation for Helion deployment"

# Запушити
git push origin main
```

---

## 📝 Крок 2: Налаштувати DNS (якщо ще не зроблено)

1. Зайти в панель управління DNS (Cloudflare / Hetzner / інше)
2. Створити A запис:
   - **Name**: `gateway.daarion.city`
   - **Type**: `A`
   - **Value**: `144.76.224.179`
   - **TTL**: 300 секунд

3. Перевірити (може зайняти 1-5 хвилин):
```bash
dig gateway.daarion.city +short
# Має вивести: 144.76.224.179
```

---

## 📝 Крок 3: Підключитися до сервера

```bash
ssh root@144.76.224.179
```

---

## 📝 Крок 4: Перевірити встановлено Docker (на сервері)

```bash
# Перевірити Docker
docker --version

# Якщо НЕ встановлено:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Перевірити Docker Compose
docker-compose --version

# Якщо НЕ встановлено:
apt-get update
apt-get install -y docker-compose
```

---

## 📝 Крок 5: Клонувати/оновити репозиторій (на сервері)

### Варіант А: Якщо репозиторій ще НЕ клонований

```bash
cd /opt
git clone https://github.com/IvanTytar/microdao-daarion.git
cd microdao-daarion
```

### Варіант Б: Якщо репозиторій вже є

```bash
cd /opt/microdao-daarion  # або де знаходиться репозиторій
git pull origin main
```

---

## 📝 Крок 6: Налаштувати .env (на сервері)

```bash
# Перевірити чи є .env
ls -la .env

# Якщо НЕ існує - створити з локального
# (на Mac скопіювати .env на сервер через scp)

# Або створити вручну:
nano .env
```

**Мінімально необхідні змінні:**
```bash
# Helion
HELION_TELEGRAM_BOT_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
HELION_NAME=Helion
HELION_PROMPT_PATH=./gateway-bot/helion_prompt.txt

# Memory
MEMORY_SERVICE_URL=http://memory-service:8000
MEMORY_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/daarion_memory

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=daarion_memory

# Ollama (якщо є локально на сервері)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3:8b
```

---

## 📝 Крок 7: Запустити стек (на сервері)

```bash
# Створити директорії
mkdir -p logs data/rbac

# Запустити всі сервіси
docker-compose up -d

# Переглянути статус
docker-compose ps

# Очікувані контейнери:
# - dagi-router (9102) - UP
# - dagi-gateway (9300) - UP
# - dagi-postgres (5432) - UP
# - dagi-memory-service (8000) - UP
# - dagi-devtools (8008) - UP
# - dagi-crewai (9010) - UP
# - dagi-rbac (9200) - UP
# - dagi-rag-service (9500) - UP або Restarting (OK якщо немає city-db)
```

---

## 📝 Крок 8: Перевірити health endpoints (на сервері)

```bash
# Gateway
curl http://localhost:9300/health
# Має вивести: {"status": "healthy", "agents": {...}}

# Memory Service
curl http://localhost:8000/health
# Має вивести: {"status": "healthy", "service": "memory-service"}

# Router
curl http://localhost:9102/health

# PostgreSQL
docker exec -it dagi-postgres psql -U postgres -c "\l"
# Має показати базу даних "daarion_memory"
```

**Якщо щось не працює:**
```bash
# Переглянути логи
docker-compose logs -f gateway
docker-compose logs -f memory-service
docker-compose logs -f postgres

# Перезапустити
docker-compose restart gateway memory-service
```

---

## 📝 Крок 9: Налаштувати HTTPS Gateway (на сервері)

```bash
# Встановити certbot якщо немає
apt-get update
apt-get install -y certbot

# Запустити скрипт налаштування HTTPS
sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city

# Скрипт автоматично:
# - Отримає SSL сертифікат від Let's Encrypt
# - Налаштує nginx reverse proxy
# - Запустить nginx в Docker контейнері
# - Налаштує auto-renewal сертифікатів

# Перевірити HTTPS
curl https://gateway.daarion.city/health
```

---

## 📝 Крок 10: Зареєструвати Telegram Webhook (на сервері)

```bash
# Зареєструвати webhook
./scripts/register-agent-webhook.sh \
  helion \
  8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM \
  gateway.daarion.city

# Перевірити webhook
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"

# Має показати:
# {
#   "ok": true,
#   "result": {
#     "url": "https://gateway.daarion.city/helion/telegram/webhook",
#     "has_custom_certificate": false,
#     "pending_update_count": 0
#   }
# }
```

---

## 📝 Крок 11: Тестувати бота!

1. Відкрити бота в Telegram (знайти по username або токену)
2. Надіслати повідомлення: **"Привіт! Що таке EcoMiner?"**
3. Чекати відповідь від Helion

**Якщо бот не відповідає:**
```bash
# На сервері переглянути логи
docker-compose logs -f gateway

# Перевірити webhook
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"

# Перевірити nginx
docker logs nginx-gateway

# Restart gateway
docker-compose restart gateway
```

---

## ✅ Checklist

- [ ] Закомітили і запушили зміни
- [ ] DNS налаштовано (gateway.daarion.city → 144.76.224.179)
- [ ] Підключились до сервера через SSH
- [ ] Docker встановлено
- [ ] Репозиторій клоновано/оновлено
- [ ] .env налаштовано з токенами
- [ ] docker-compose up -d виконано
- [ ] Health endpoints працюють (9300, 8000)
- [ ] HTTPS Gateway налаштовано (setup-nginx-gateway.sh)
- [ ] Telegram webhook зареєстровано
- [ ] Бот відповідає в Telegram! 🎉

---

## 🆘 Troubleshooting

### Memory Service не запускається
```bash
docker-compose logs memory-service
docker-compose logs postgres

# Перезапустити
docker-compose restart postgres memory-service
```

### SSL сертифікат не отримується
```bash
# Перевірити DNS
dig gateway.daarion.city +short

# Спробувати вручну
certbot certonly --standalone -d gateway.daarion.city --email admin@daarion.city
```

### Бот не відповідає
```bash
# Перевірити логи Gateway
docker-compose logs --tail=50 gateway

# Перевірити чи webhook активний
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"

# Видалити webhook і встановити знову
curl -X POST "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/deleteWebhook"
./scripts/register-agent-webhook.sh helion 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM gateway.daarion.city
```

---

## 🎉 Успіх!

Після виконання всіх кроків, Helion має запрацювати в Telegram і відповідати на запитання про Energy Union, EcoMiner, токеноміку тощо!
