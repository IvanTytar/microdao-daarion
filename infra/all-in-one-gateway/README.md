# DAARION All-in-One Gateway

**Version:** 1.0.0  
**Purpose:** HTTP Gateway з path-based routing для локальної інфраструктури

---

## 🎯 Що це таке

All-in-One HTTP Gateway — це єдина точка входу для всіх мікросервісів DAARION/microDAO.

**Переваги:**
- ✅ **Один порт** замість 10+ різних портів
- ✅ **Path-based routing** — чіткі шляхи `/api/`, `/ws/`, `/grafana/`
- ✅ **WebSocket підтримка** — `/ws/*` для real-time
- ✅ **Production-ready** — готовий до публікації на домені
- ✅ **Docker-based** — один `docker compose up -d`

### Що він дає

**До (без gateway):**
```
http://localhost:8000  → microdao API
http://localhost:8001  → WebSocket
http://localhost:8008  → Matrix
http://localhost:3000  → Grafana
http://localhost:9090  → Prometheus
http://localhost:8081  → RAG
http://localhost:8082  → Notifications
```

**Після (з gateway):**
```
http://localhost:8080/api/          → microdao API
http://localhost:8080/ws/           → WebSocket
http://localhost:8080/matrix/       → Matrix
http://localhost:8080/grafana/      → Grafana
http://localhost:8080/prometheus/   → Prometheus
http://localhost:8080/rag/          → RAG
http://localhost:8080/notify/       → Notifications
```

---

## 🚀 Локальний запуск

### 1. Підготовка

```bash
cd infra/all-in-one-gateway

# Копіювати .env
cp .env.example .env

# За потреби відредагувати .env
nano .env
```

### 2. Запуск

```bash
# Підняти всі сервіси
docker compose up -d

# Перевірити статус
docker compose ps

# Подивитися логи
docker compose logs -f gateway-nginx
```

### 3. Перевірка

**Health check:**
```bash
curl http://localhost:8080/healthz
# Очікується: OK
```

**MicroDAO API:**
```bash
curl http://localhost:8080/api/health
```

**Grafana:**
```
http://localhost:8080/grafana/
```

**Prometheus:**
```
http://localhost:8080/prometheus/
```

**Matrix:**
```bash
curl http://localhost:8080/matrix/_matrix/client/versions
```

### 4. Зупинка

```bash
# Зупинити всі сервіси
docker compose down

# Зупинити і видалити volumes (⚠️ видалить дані!)
docker compose down -v
```

---

## 🗺️ Маршрутизація

| Path | Target Service | Port | Protocol |
|------|---------------|------|----------|
| `/api/` | `microdao-api` | 8000 | HTTP |
| `/ws/` | `microdao-ws` | 8001 | WebSocket |
| `/matrix/` | `matrix-homeserver` | 8008 | HTTP |
| `/_matrix/` | `matrix-homeserver` | 8008 | HTTP (Matrix protocol) |
| `/grafana/` | `grafana` | 3000 | HTTP |
| `/prometheus/` | `prometheus` | 9090 | HTTP |
| `/rag/` | `rag-service` | 8081 | HTTP |
| `/notify/` | `notification-service` | 8082 | HTTP |
| `/healthz` | gateway (internal) | - | HTTP |

---

## 📦 Сервіси

### Infrastructure (4)

1. **postgres** — PostgreSQL 15
   - Database для microdao
   - Volume: `postgres_data`

2. **redis** — Redis 7
   - Cache & sessions
   - Volume: `redis_data`

3. **nats** — NATS JetStream
   - Message bus
   - Volume: `nats_data`

4. **matrix-homeserver** — Matrix Synapse
   - Chat server
   - Volume: `matrix_data`

### Application Services (6)

5. **microdao-api** — REST API мікросервіс
6. **microdao-ws** — WebSocket gateway
7. **grafana** — Monitoring UI
8. **prometheus** — Metrics storage
9. **rag-service** — RAG/AI service
10. **notification-service** — Email/Push notifications

### Gateway (1)

11. **gateway-nginx** — NGINX reverse proxy
    - Port: `8080:80`
    - Config: `nginx/nginx.conf`

---

## 🌍 Публікація на сервері (без k8s)

### Сценарій 1: VPS з одним доменом

**DNS:**
```
app.example.com → IP сервера (A record)
```

**На сервері (зовнішній nginx):**

Створити `/etc/nginx/sites-available/daarion`:

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Активувати:**
```bash
sudo ln -s /etc/nginx/sites-available/daarion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Сценарій 2: SSL/TLS (Let's Encrypt)

**Встановити certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**Отримати сертифікат:**
```bash
sudo certbot --nginx -d app.example.com
```

**Автоматичне оновлення:**
```bash
sudo certbot renew --dry-run
```

Certbot автоматично додасть SSL конфігурацію до nginx.

### Сценарій 3: Host Network Mode

Якщо потрібно слухати 80/443 напряму:

Змінити `docker-compose.yml`:

```yaml
gateway-nginx:
  network_mode: host
  ports: []  # не потрібні в host mode
```

Тоді gateway-nginx буде слухати 80 порт хоста напряму.

---

## ☸️ Ingress для k3s/k8s (ескіз)

Коли перейдете на Kubernetes, можна використати такий Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: daarion-gateway
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: app.daarion.city
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: microdao-api
            port:
              number: 8000
      
      - path: /ws(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: microdao-ws
            port:
              number: 8001
      
      - path: /grafana(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
      
      - path: /prometheus(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: prometheus
            port:
              number: 9090
      
      - path: /rag(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: rag-service
            port:
              number: 8081
      
      - path: /notify(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 8082
```

**Важливо:** У k8s кожен сервіс має бути окремим Deployment + Service.

---

## 🔧 Налаштування

### Environment Variables

Всі змінні в `.env`:

```env
# Database
DATABASE_URL=postgres://microdao:microdao@postgres:5432/microdao

# Cache
REDIS_URL=redis://redis:6379/0

# Message Bus
NATS_URL=nats://nats:4222

# Matrix
SYNAPSE_SERVER_NAME=localhost

# RAG
RAG_MODEL_NAME=BAAI/bge-m3

# Notifications
NOTIFY_FROM_EMAIL=noreply@localhost

# PostgreSQL Password
POSTGRES_PASSWORD=postgres
```

### Змінити порт Gateway

У `docker-compose.yml`:

```yaml
gateway-nginx:
  ports:
    - "8080:80"  # змінити 8080 на інший порт
```

### Додати новий сервіс

1. Додати upstream в `nginx/nginx.conf`:

```nginx
upstream my_service {
    server my-service:8083;
}
```

2. Додати location:

```nginx
location /myservice/ {
    proxy_set_header Host $host;
    # ... (інші заголовки)
    proxy_pass http://my_service/;
}
```

3. Додати сервіс в `docker-compose.yml`:

```yaml
my-service:
  image: my-service:local
  networks:
    - infra_net
```

---

## 🐛 Troubleshooting

### Gateway не стартує

```bash
# Перевірити логи
docker compose logs gateway-nginx

# Перевірити конфігурацію
docker compose exec gateway-nginx nginx -t
```

### 502 Bad Gateway

Це означає, що backend сервіс не працює.

```bash
# Перевірити статус сервісів
docker compose ps

# Подивитися логи backend
docker compose logs microdao-api
```

### WebSocket не працює

Перевірте, що в nginx є:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Grafana/Prometheus не відкриваються

Переконайтеся, що в environment змінних є:

```yaml
grafana:
  environment:
    - GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s/grafana/
    - GF_SERVER_SERVE_FROM_SUB_PATH=true

prometheus:
  command:
    - '--web.external-url=/prometheus/'
```

---

## 📚 Додаткова документація

### В цьому репозиторії:

- `../../docs/DEPLOYMENT_OVERVIEW.md` — Повний огляд deployment
- `../../docs/DEPLOY_ON_SERVER.md` — Production deployment
- `../../INFRASTRUCTURE.md` — Архітектура інфраструктури

### Зовнішні ресурси:

- [NGINX Documentation](https://nginx.org/en/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Matrix Synapse](https://matrix-org.github.io/synapse/)
- [Grafana](https://grafana.com/docs/)
- [Prometheus](https://prometheus.io/docs/)

---

## 🎯 Наступні кроки

1. **Запустити локально:**
   ```bash
   docker compose up -d
   open http://localhost:8080
   ```

2. **Додати свої сервіси** (якщо потрібно)

3. **Деплой на staging/production:**
   - Налаштувати домен
   - Додати SSL/TLS
   - Змінити паролі в `.env`

4. **Моніторинг:**
   - Grafana: http://localhost:8080/grafana/
   - Prometheus: http://localhost:8080/prometheus/

5. **Підготувати Ingress для k8s** (якщо плануєте)

---

## ⚠️ Важливі примітки

### Безпека

- ⚠️ Змініть `POSTGRES_PASSWORD` в production!
- ⚠️ Не використовуйте `localhost` для `SYNAPSE_SERVER_NAME` в production
- ⚠️ Додайте автентифікацію для Grafana/Prometheus
- ⚠️ Використовуйте HTTPS в production

### Production Checklist

- [ ] Змінено всі паролі
- [ ] Налаштовано SSL/TLS
- [ ] Додано моніторинг
- [ ] Налаштовано backup
- [ ] Додано rate limiting
- [ ] Налаштовано firewall
- [ ] Перевірено всі endpoints

---

**🎉 Готово!**

Тепер у вас є єдина точка входу для всіх мікросервісів DAARION!

**Питання?** Створіть issue в репозиторії або зверніться до документації.

