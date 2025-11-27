# DNS Setup для DAARION Production

**Домен:** `daarion.space`  
**Цільовий сервер:** VPS з Ubuntu 22.04 LTS

---

## 📋 Обов'язкові DNS записи

### 1. Головний домен (Landing / Redirect)
```
Type: A
Name: @
Value: <SERVER_IP_ADDRESS>
TTL: 3600
```

**Призначення:** `https://daarion.space` → redirect на `https://app.daarion.space`

---

### 2. Application субдомен (MVP Product)
```
Type: A
Name: app
Value: <SERVER_IP_ADDRESS>
TTL: 3600
```

**Призначення:** `https://app.daarion.space` → головний MVP-продукт (microDAO + City + Agents)

---

## 📋 Опціональні DNS записи

### 3. Grafana моніторинг
```
Type: A
Name: grafana
Value: <SERVER_IP_ADDRESS>
TTL: 3600
```

**Призначення:** `https://grafana.daarion.space` → прямий доступ до Grafana

**Альтернатива:** Використовувати path-based routing через app: `https://app.daarion.space/grafana/`

---

### 4. API субдомен (майбутнє)
```
Type: A
Name: api
Value: <SERVER_IP_ADDRESS>
TTL: 3600
```

**Призначення:** `https://api.daarion.space` → окремий субдомен для API

**Статус:** Не потрібно для MVP, але можна зарезервувати

---

### 5. Matrix субдомен (Phase 4+)
```
Type: A
Name: matrix
Value: <SERVER_IP_ADDRESS>
TTL: 3600
```

**Призначення:** `https://matrix.daarion.space` → Matrix homeserver (Phase 4+)

**Статус:** Буде потрібно в PHASE MATRIX FULL

---

## 🔍 Перевірка DNS

Після додавання записів перевірити:

```bash
# Перевірка A-запису для головного домену
dig daarion.space +short

# Перевірка A-запису для app субдомену
dig app.daarion.space +short

# Перевірка всіх записів
dig daarion.space ANY

# Через nslookup
nslookup app.daarion.space

# Через host
host app.daarion.space
```

**Очікуваний результат:** IP-адреса вашого VPS

---

## ⏱️ Час propagation

- **Середній час:** 15-60 хвилин
- **Максимальний:** 24-48 годин (рідко)
- **TTL:** 3600 секунд (1 година)

**Рекомендація:** Почекати хоча б 15 хвилин перед налаштуванням SSL.

---

## 🌐 DNS Providers інструкції

### Cloudflare
1. Dashboard → DNS → Add record
2. Type: A, Name: app, IPv4 address: `<SERVER_IP>`
3. Proxy status: DNS only (сіра хмарка) для MVP
4. TTL: Auto
5. Save

### Google Domains
1. DNS → Manage custom records
2. Host name: app, Type: A, TTL: 3600, Data: `<SERVER_IP>`
3. Add

### Namecheap
1. Advanced DNS → Add New Record
2. Type: A Record, Host: app, Value: `<SERVER_IP>`, TTL: Automatic
3. Save

### DigitalOcean
1. Networking → Domains → daarion.space → Create new record
2. Type: A, Hostname: app, Will direct to: `<SERVER_IP>`, TTL: 3600
3. Create Record

---

## 🔒 SSL Certificate Requirements

Після налаштування DNS, для SSL потрібно:

1. ✅ DNS A-записи propagated
2. ✅ Порт 80 відкритий на сервері
3. ✅ Порт 443 відкритий на сервері
4. ✅ Домен вказує на правильний IP

**Команда для перевірки портів:**
```bash
# На сервері
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📊 DNS Health Check

```bash
# Перевірка DNS propagation globally
# Використати онлайн інструменти:
# - https://dnschecker.org/
# - https://www.whatsmydns.net/

# Або через CLI:
for server in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Testing with DNS server: $server"
  dig @$server app.daarion.space +short
done
```

---

## 🚨 Troubleshooting

### Проблема: DNS не резолвиться
**Рішення:**
1. Перевірити синтаксис DNS запису
2. Очистити локальний DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   
   # Windows
   ipconfig /flushdns
   ```
3. Почекати 15-60 хвилин

### Проблема: Propagation занадто повільна
**Рішення:**
1. Зменшити TTL до 300 секунд (5 хвилин)
2. Почекати старий TTL (якщо був 3600 - почекати годину)
3. Використати публічні DNS (8.8.8.8, 1.1.1.1)

### Проблема: Subdomain не працює
**Рішення:**
1. Перевірити що створили запис саме для субдомену (app), а не для @ (root)
2. Для Cloudflare: перевірити Proxy status (має бути DNS only для MVP)

---

## ✅ Pre-deployment Checklist

Перед запуском SSL/HTTPS налаштування:

- [ ] DNS A-запис для `daarion.space` створено
- [ ] DNS A-запис для `app.daarion.space` створено
- [ ] DNS propagated (перевірено через `dig` або онлайн tools)
- [ ] Порти 80 та 443 відкриті на сервері
- [ ] Firewall налаштований (ufw/iptables)
- [ ] Сервер доступний через SSH
- [ ] Docker та Docker Compose встановлені

---

## 📚 Наступні кроки

Після успішного налаштування DNS:

1. ➡️ **SSL/HTTPS Setup** (`docs/DEPLOY_SSL_SETUP.md`)
2. ➡️ **Environment Configuration** (`docs/DEPLOY_ENV_CONFIG.md`)
3. ➡️ **Database Migrations** (`docs/DEPLOY_MIGRATIONS.md`)
4. ➡️ **Services Startup** (`docs/DEPLOY_SERVICES.md`)

---

**Статус:** ✅ DNS Setup Guide Complete  
**Версія:** 1.0.0  
**Дата:** 24 листопада 2025

