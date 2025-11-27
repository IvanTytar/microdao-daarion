# DAARION MVP — Smoke Test Checklist

**Мета:** Швидка перевірка що всі критичні компоненти працюють після deployment.  
**Час виконання:** ~15 хвилин

---

## ✅ Pre-flight Check

- [ ] Всі Docker containers запущені: `docker ps | grep daarion`
- [ ] HTTPS працює: `curl -I https://app.daarion.space`
- [ ] DNS resolution OK: `dig app.daarion.space +short`

---

## 🌐 1. API Health Checks

### 1.1 Gateway Health
```bash
curl -I https://app.daarion.space/health
# Очікуємо: HTTP/2 200
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 1.2 City Service Health
```bash
curl https://app.daarion.space/city/health
# Очікуємо: {"status": "healthy", "service": "city-service"}
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 1.3 Agents Service Health
```bash
curl https://app.daarion.space/agents/health
# Очікуємо: {"status": "healthy", "service": "agents-service", ...}
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 1.4 Second Me Service Health
```bash
curl https://app.daarion.space/secondme/health
# Очікуємо: {"status": "healthy", "service": "secondme-service"}
```

**Результат:** [ ] ✅ / [ ] ❌

---

## 🏙️ 2. City Rooms API

### 2.1 Get City Rooms
```bash
curl https://app.daarion.space/city/rooms | jq
# Очікуємо: масив з 5 дефолтних кімнат (general, welcome, builders, science, energy)
```

**Очікуваний output:**
```json
[
  {
    "id": "room_city_general",
    "slug": "general",
    "name": "General",
    "description": "Головна кімната міста...",
    "members_online": <number>
  },
  ...
]
```

**Результат:** [ ] ✅ / [ ] ❌  
**Members online count:** _______

---

### 2.2 Get Room Details
```bash
curl https://app.daarion.space/city/rooms/room_city_general | jq
# Очікуємо: деталі кімнати + messages + online_members
```

**Результат:** [ ] ✅ / [ ] ❌  
**Messages count:** _______

---

### 2.3 City Feed
```bash
curl https://app.daarion.space/city/feed | jq
# Очікуємо: масив подій (мінімум 1 system event)
```

**Результат:** [ ] ✅ / [ ] ❌

---

## 🧬 3. Second Me API

### 3.1 Second Me Profile (потрібна авторизація)
```bash
# Mock user для тестування
curl https://app.daarion.space/secondme/profile
# Очікуємо: профіль з total_interactions, agent_id
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 3.2 Second Me History
```bash
curl https://app.daarion.space/secondme/history
# Очікуємо: [] (порожній масив для нового користувача)
```

**Результат:** [ ] ✅ / [ ] ❌

---

## 🖥️ 4. Frontend Tests

### 4.1 Homepage Load
**Дія:** Відкрити `https://app.daarion.space` в браузері

**Перевірити:**
- [ ] Сторінка завантажується без помилок
- [ ] Немає console errors (F12 → Console)
- [ ] Немає mixed content warnings
- [ ] CSS та JS завантажуються коректно

**Результат:** [ ] ✅ / [ ] ❌

---

### 4.2 Login/Register Page
**Дія:** Перейти на сторінку логіну/реєстрації

**Перевірити:**
- [ ] Форма відображається коректно
- [ ] Inputs працюють
- [ ] Validation працює

**Результат:** [ ] ✅ / [ ] ❌

---

### 4.3 City Rooms Page
**Дія:** Перейти на `/city/rooms`

**Перевірити:**
- [ ] Список кімнат завантажується
- [ ] Видно 5 дефолтних кімнат
- [ ] Online count відображається
- [ ] Можна клікнути на кімнату

**Результат:** [ ] ✅ / [ ] ❌

---

### 4.4 Room View
**Дія:** Відкрити конкретну кімнату `/city/rooms/room_city_general`

**Перевірити:**
- [ ] Повідомлення завантажуються
- [ ] Online members відображаються
- [ ] Input для нових повідомлень працює

**Результат:** [ ] ✅ / [ ] ❌

---

### 4.5 Second Me Page
**Дія:** Перейти на `/secondme`

**Перевірити:**
- [ ] Сторінка завантажується
- [ ] Chat interface відображається
- [ ] Input працює
- [ ] Profile stats показуються

**Результат:** [ ] ✅ / [ ] ❌

---

## 🔌 5. WebSocket Tests

### 5.1 City Room WebSocket
**Дія:** Відкрити DevTools → Network → WS filter, відкрити кімнату

**Перевірити:**
- [ ] WebSocket connection встановлено
- [ ] URL: `wss://app.daarion.space/ws/city/rooms/{room_id}`
- [ ] Connection status: Connected (101 Switching Protocols)
- [ ] Heartbeat працює (якщо реалізовано)

**Результат:** [ ] ✅ / [ ] ❌

---

### 5.2 Presence WebSocket
**Дія:** Відкрити будь-яку сторінку з PresenceBar

**Перевірити:**
- [ ] WebSocket connection до `/ws/city/presence`
- [ ] Heartbeat надсилається кожні 20 секунд
- [ ] Online count оновлюється

**Результат:** [ ] ✅ / [ ] ❌

---

## 🧪 6. Functional Tests

### 6.1 Send Message to Room (Mock)
```bash
# Потрібна авторизація, або використати mock user_id
curl -X POST https://app.daarion.space/city/rooms/room_city_general/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "Test message from smoke test"}'

# Очікуємо: 200 або 401 (якщо потрібна авторизація)
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 6.2 Second Me Invoke (Mock)
```bash
# Викликати Second Me
curl -X POST https://app.daarion.space/secondme/invoke \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, Second Me!"}'

# Очікуємо: response з reply, tokens_used, latency_ms
```

**Результат:** [ ] ✅ / [ ] ❌  
**Response time:** _______ ms

---

## 📊 7. Monitoring & Logs

### 7.1 Docker Logs
```bash
# Перевірити що немає критичних помилок
docker logs daarion-gateway --tail 50
docker logs daarion-city-service --tail 50
docker logs daarion-agents-service --tail 50
```

**Перевірити:**
- [ ] Немає ERROR рівня логів (допустимі тільки WARN)
- [ ] Сервіси стартували успішно
- [ ] З'єднання з БД встановлені

**Результат:** [ ] ✅ / [ ] ❌

---

### 7.2 Database Connection
```bash
# Перевірити що БД доступна
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT COUNT(*) FROM city_rooms;"

# Очікуємо: 5 (дефолтні кімнати)
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 7.3 Redis Connection
```bash
# Перевірити Redis
docker compose -f docker-compose.all.yml exec redis redis-cli PING
# Очікуємо: PONG

# Перевірити presence keys (якщо хтось онлайн)
docker compose -f docker-compose.all.yml exec redis redis-cli KEYS "presence:user:*"
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 7.4 NATS Connection
```bash
# Перевірити NATS
docker compose -f docker-compose.all.yml exec nats nats server info
# Очікуємо: статус server, connections, etc.
```

**Результат:** [ ] ✅ / [ ] ❌

---

## 🔒 8. Security Checks

### 8.1 HTTPS Certificate
```bash
# Перевірити SSL certificate
echo | openssl s_client -servername app.daarion.space -connect app.daarion.space:443 2>/dev/null | openssl x509 -noout -dates

# Перевірити issuer
echo | openssl s_client -servername app.daarion.space -connect app.daarion.space:443 2>/dev/null | openssl x509 -noout -issuer
```

**Перевірити:**
- [ ] Certificate валідний
- [ ] Expiry date > 30 днів
- [ ] Issuer: Let's Encrypt або інший trusted CA

**Результат:** [ ] ✅ / [ ] ❌

---

### 8.2 HTTP to HTTPS Redirect
```bash
# Перевірити редірект
curl -I http://app.daarion.space
# Очікуємо: 301 або 308 redirect на https://
```

**Результат:** [ ] ✅ / [ ] ❌

---

### 8.3 Security Headers
```bash
curl -I https://app.daarion.space | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options"
```

**Перевірити наявність:**
- [ ] `Strict-Transport-Security`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`

**Результат:** [ ] ✅ / [ ] ❌

---

### 8.4 Exposed Services Check
```bash
# Перевірити що БД не доступна ззовні
nmap -p 5432 app.daarion.space
# Очікуємо: closed або filtered

# Перевірити Redis
nmap -p 6379 app.daarion.space
# Очікуємо: closed або filtered
```

**Результат:** [ ] ✅ / [ ] ❌

---

## 🎯 9. Performance Baseline

### 9.1 Response Times
```bash
# Homepage
time curl -o /dev/null -s -w "Total: %{time_total}s\n" https://app.daarion.space/

# API endpoint
time curl -o /dev/null -s -w "Total: %{time_total}s\n" https://app.daarion.space/city/rooms
```

**Записати baseline:**
- Homepage: _______ s
- City Rooms API: _______ s

**Очікувані значення:**
- < 1s для Homepage
- < 0.5s для API

**Результат:** [ ] ✅ / [ ] ❌

---

### 9.2 Resource Usage
```bash
# Docker stats
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Перевірити:**
- [ ] CPU usage < 50% на всіх контейнерах
- [ ] Memory usage в межах allocated limits

**Результат:** [ ] ✅ / [ ] ❌

---

## 🎉 Final Score

**Total checks:** _______ / _______  
**Pass rate:** _______ %

**Status:** [ ] ✅ READY FOR PRODUCTION / [ ] ❌ ISSUES FOUND

---

## 📝 Notes & Issues

Записати всі знайдені проблеми:

1. _____________________________
2. _____________________________
3. _____________________________

---

## 📚 Next Steps

Якщо всі тести пройдені:
1. ➡️ Створити production backup
2. ➡️ Налаштувати моніторинг alerts
3. ➡️ Документувати runbook для operations
4. ➡️ Повідомити команду про готовність

Якщо є проблеми:
1. ➡️ Зафіксувати issues в tracker
2. ➡️ Prioritize critical vs non-critical
3. ➡️ Fix & re-run smoke tests

---

**Виконано:** _______________ (дата/час)  
**Виконавець:** _______________ (ім'я)  
**Версія:** 1.0.0

