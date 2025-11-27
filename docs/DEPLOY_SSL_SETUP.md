# SSL/HTTPS Setup для DAARION Production

**Рекомендований метод:** Caddy (найпростіший для MVP)

---

## 🎯 Вибір SSL рішення

### ✅ ВАРІАНТ A: Caddy (Рекомендовано)
**Переваги:**
- Автоматичний SSL (Let's Encrypt)
- Автоматичне оновлення сертифікатів
- Мінімальна конфігурація
- HTTP/2 та HTTP/3 out of the box

**Недоліки:**
- Менш поширений ніж Nginx

---

### ⚠️ ВАРІАНТ B: Nginx + Certbot
**Переваги:**
- Класичне рішення
- Велика спільнота
- Дуже гнучкий

**Недоліки:**
- Більше ручної роботи
- Треба налаштовувати cron для renewal

---

### 🤔 ВАРІАНТ C: Traefik
**Переваги:**
- Інтеграція з Docker labels
- Автоматичний SSL
- Service discovery

**Недоліки:**
- Більш складна конфігурація
- Overkill для MVP

---

## 🚀 Реалізація: Caddy (Рекомендовано)

### 1. Структура файлів

```text
/opt/daarion/
├── Caddyfile
├── docker-compose.caddy.yml
└── docker-compose.all.yml (існуючий)
```

### 2. Caddyfile

```caddy
# Головний домен - redirect на app
daarion.space {
    redir https://app.daarion.space{uri} permanent
}

# Application субдомен - головний MVP
app.daarion.space {
    # Логування
    log {
        output file /var/log/caddy/app.daarion.space.log
        level INFO
    }
    
    # Reverse proxy на internal gateway
    reverse_proxy gateway:80 {
        # Headers
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        
        # Timeouts
        transport http {
            dial_timeout 10s
            response_header_timeout 30s
        }
    }
    
    # WebSocket support
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket gateway:80
}

# Grafana (опціонально, можна закоментувати)
# grafana.daarion.space {
#     reverse_proxy grafana:3000
#     
#     # Basic Auth
#     basicauth {
#         admin $2a$14$... # bcrypt hash
#     }
# }
```

### 3. docker-compose.caddy.yml

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2.7-alpine
    container_name: daarion-caddy
    restart: unless-stopped
    
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - caddy_logs:/var/log/caddy
    
    networks:
      - daarion-network
    
    environment:
      - ACME_AGREE=true
    
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:2019/metrics"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  caddy_data:
    driver: local
  caddy_config:
    driver: local
  caddy_logs:
    driver: local

networks:
  daarion-network:
    name: daarion-network
    external: true
```

### 4. Інтеграція з існуючим docker-compose.all.yml

**Оновити** `docker-compose.all.yml`:

```yaml
# В існуючому файлі змінити:

services:
  gateway:
    # ...existing config...
    ports:
      # ВИДАЛИТИ direct port exposure:
      # - "80:80"  
      # ЗАМІСТЬ цього expose тільки для internal network:
    expose:
      - "80"
    networks:
      - daarion-network

# Додати в кінець файлу:
networks:
  daarion-network:
    name: daarion-network
    driver: bridge
```

### 5. Deployment команди

```bash
# 1. Створити network (якщо не існує)
docker network create daarion-network

# 2. Запустити основні сервіси
cd /opt/daarion
docker compose -f docker-compose.all.yml up -d

# 3. Запустити Caddy
docker compose -f docker-compose.caddy.yml up -d

# 4. Перевірити логи Caddy
docker logs -f daarion-caddy

# 5. Перевірити статус
docker ps | grep caddy
curl -I https://app.daarion.space
```

---

## 🔒 SSL Certificate Verification

```bash
# Перевірка SSL certificate
openssl s_client -connect app.daarion.space:443 -servername app.daarion.space < /dev/null

# Перевірка expiration date
echo | openssl s_client -servername app.daarion.space -connect app.daarion.space:443 2>/dev/null | openssl x509 -noout -dates

# Через curl
curl -vI https://app.daarion.space 2>&1 | grep -i "SSL\|cert\|expire"

# SSL Labs test (онлайн)
# https://www.ssllabs.com/ssltest/analyze.html?d=app.daarion.space
```

---

## 🔄 Автоматичне оновлення сертифікатів

Caddy автоматично:
- Отримує SSL сертифікати від Let's Encrypt
- Оновлює їх за 30 днів до закінчення
- Перезавантажує конфігурацію без downtime

**Перевірка renewal process:**
```bash
docker logs daarion-caddy | grep -i "renew\|certificate"
```

---

## 📊 Моніторинг Caddy

### Metrics endpoint
```bash
# Caddy metrics (Prometheus format)
curl http://localhost:2019/metrics

# Health check
curl http://localhost:2019/metrics | grep caddy_http_response_duration_seconds_count
```

### Логи
```bash
# Real-time logs
docker logs -f daarion-caddy

# Логи для конкретного домену
docker exec daarion-caddy cat /var/log/caddy/app.daarion.space.log

# Статистика логів
docker exec daarion-caddy tail -100 /var/log/caddy/app.daarion.space.log | grep -E "error|warn"
```

---

## 🚨 Troubleshooting

### Проблема: SSL certificate не отримується
**Діагностика:**
```bash
# Перевірити Caddy логи
docker logs daarion-caddy | grep -i "acme\|challenge"

# Перевірити що порти відкриті
sudo netstat -tulpn | grep -E ":80|:443"

# Перевірити DNS
dig app.daarion.space +short
```

**Рішення:**
1. Переконатися що DNS propagated
2. Перевірити firewall:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
3. Перевірити що порт 80 не зайнятий іншим процесом
4. Перезапустити Caddy:
   ```bash
   docker compose -f docker-compose.caddy.yml restart
   ```

---

### Проблема: WebSocket connection fails
**Рішення:**
```caddy
# В Caddyfile додати явну підтримку WebSocket:
app.daarion.space {
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    
    reverse_proxy @websocket gateway:80 {
        header_up Connection {>Connection}
        header_up Upgrade {>Upgrade}
    }
    
    reverse_proxy gateway:80
}
```

---

### Проблема: 502 Bad Gateway
**Діагностика:**
```bash
# Перевірити що gateway запущений
docker ps | grep gateway

# Перевірити логи gateway
docker logs daarion-gateway

# Перевірити network
docker network inspect daarion-network
```

**Рішення:**
1. Перевірити що gateway в тій самій мережі
2. Перевірити що gateway слухає на порті 80
3. Перезапустити gateway та Caddy

---

## 🔐 Security Headers (Опціонально)

Додати до `Caddyfile` для посилення безпеки:

```caddy
app.daarion.space {
    # Security headers
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # XSS Protection
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        
        # CSP (налаштувати під свій контент)
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        
        # Permissions Policy
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        
        # Remove server header
        -Server
    }
    
    reverse_proxy gateway:80
}
```

---

## ✅ Post-deployment Checklist

- [ ] HTTPS працює на `https://app.daarion.space`
- [ ] Редірект з HTTP на HTTPS працює автоматично
- [ ] Редірект з `daarion.space` на `app.daarion.space` працює
- [ ] SSL certificate валідний (Let's Encrypt)
- [ ] WebSocket connections працюють
- [ ] Немає mixed content warnings
- [ ] SSL Labs Grade: A або A+
- [ ] Логи Caddy пишуться коректно
- [ ] Auto-renewal налаштовано

---

## 📚 Наступні кроки

1. ➡️ **Environment Configuration** (`docs/DEPLOY_ENV_CONFIG.md`)
2. ➡️ **Database Migrations** (`docs/DEPLOY_MIGRATIONS.md`)
3. ➡️ **Smoke Tests** (`docs/DEPLOY_SMOKETEST_CHECKLIST.md`)

---

**Статус:** ✅ SSL/HTTPS Setup Guide Complete  
**Версія:** 1.0.0  
**Дата:** 24 листопада 2025

