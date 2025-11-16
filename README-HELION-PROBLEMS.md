# 🔥 Проблеми з запуском Helion і як їх вирішити

## ❌ Що не працює зараз

### 1. Memory Service відсутній в docker-compose.yml
**Симптом**: Gateway не може з'єднатися з memory-service  
**Вирішення**: Додати postgres + memory-service в docker-compose.yml  
**Файл завдань**: `CURSOR-QUICK-TASKS.md` (завдання 1-3)

### 2. Docker сервіси не запущені
**Симптом**: `docker ps` не показує контейнери  
**Вирішення**: `docker-compose up -d` на сервері  
**Примітка**: Спочатку треба вирішити проблему #1

### 3. HTTPS Gateway не налаштований
**Симптом**: Telegram не може відправляти webhook  
**Вирішення**: 
1. Налаштувати DNS: `gateway.daarion.city` → `144.76.224.179`
2. Запустити: `sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city`

### 4. Telegram webhook не зареєстрований
**Симптом**: Бот не відповідає на повідомлення  
**Вирішення**: 
```bash
./scripts/register-agent-webhook.sh helion 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM gateway.daarion.city
```

---

## 🎯 Що треба зробити в Cursor

### Крок 1: Відкрийте проект в Cursor
```bash
cd /Users/apple/github-projects/microdao-daarion
cursor .
```

### Крок 2: Дайте Cursor завдання
Скажіть Cursor:

> "Прочитай файл `CURSOR-QUICK-TASKS.md` і виконай всі 4 завдання:
> 1. Додай postgres + memory-service в docker-compose.yml
> 2. Оновити .env
> 3. Створи init.sql для memory-service
> 4. Перевір health endpoint в memory-service"

АБО дайте детальне завдання:

> "Прочитай файл `CURSOR-TASK-HELION.md` і виконай Завдання 1-6"

---

## 🚀 Після того як Cursor виконає завдання

### Локальне тестування (на Mac)
```bash
# Запустити стек
docker-compose up -d

# Перевірити статус
docker-compose ps

# Перевірити health endpoints
curl http://localhost:9300/health
curl http://localhost:8000/health

# Переглянути логи
docker-compose logs -f gateway memory-service
```

### Якщо все ОК - перенесення на сервер

1. **Закомітити зміни**:
```bash
git add .
git commit -m "feat: add memory-service and postgres to docker-compose"
git push origin main
```

2. **На сервері**:
```bash
ssh root@144.76.224.179
cd /opt/microdao-daarion
git pull origin main
```

3. **Налаштувати DNS** (в Cloudflare/Hetzner):
   - Name: `gateway.daarion.city`
   - Type: `A`
   - Value: `144.76.224.179`

4. **Запустити стек**:
```bash
docker-compose up -d
docker-compose logs -f gateway
```

5. **Налаштувати HTTPS**:
```bash
sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city
```

6. **Зареєструвати webhook**:
```bash
./scripts/register-agent-webhook.sh helion 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM gateway.daarion.city
```

7. **Тестувати бота** в Telegram!

---

## 📋 Checklist

- [ ] Cursor виконав завдання з CURSOR-QUICK-TASKS.md
- [ ] Локально запустилось: `docker-compose up -d`
- [ ] Health endpoints працюють (9300, 8000)
- [ ] Закомітили і запушили зміни
- [ ] DNS налаштовано на 144.76.224.179
- [ ] На сервері: git pull && docker-compose up -d
- [ ] HTTPS Gateway налаштовано (setup-nginx-gateway.sh)
- [ ] Telegram webhook зареєстровано
- [ ] Бот відповідає в Telegram ✅

---

## 🆘 Якщо щось не працює

### Memory Service не запускається
```bash
# Переглянути логи
docker-compose logs memory-service

# Перевірити чи є init.sql
ls -la services/memory-service/init.sql

# Перевірити PostgreSQL
docker-compose logs postgres
docker exec -it dagi-postgres psql -U postgres -c "\l"
```

### Gateway не бачить Memory Service
```bash
# Перевірити network
docker network inspect dagi-network

# Перевірити чи memory-service в .env
grep MEMORY_SERVICE_URL .env

# Restart gateway
docker-compose restart gateway
docker-compose logs -f gateway
```

### Бот не відповідає
```bash
# Перевірити webhook
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"

# Повинно показати:
# "url": "https://gateway.daarion.city/helion/telegram/webhook"
# "has_custom_certificate": false
# "pending_update_count": 0

# Перевірити Gateway доступний
curl https://gateway.daarion.city/health

# Логи
docker-compose logs -f gateway
```

---

## 📞 Контакти

- Детальна документація: `CURSOR-TASK-HELION.md`
- Quick start: `CURSOR-QUICK-TASKS.md`
- Статус проекту: `STATUS-HELION.md`
- Helion документація: `docs/HELION-QUICKSTART.md`
