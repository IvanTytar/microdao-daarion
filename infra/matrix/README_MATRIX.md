# Matrix Integration for DAARION.city

## Overview

Matrix забезпечує децентралізований real-time чат для DAARION.city:
- **Synapse** — Matrix homeserver
- **Element Web** — веб-клієнт
- **DAARION Bridge** (майбутнє) — інтеграція з City Rooms та Agents

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DAARION.city                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Element Web │  │   Synapse   │  │  DAARION Auth   │  │
│  │   (8088)    │→ │   (8008)    │← │     (7020)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│         │               │                   │           │
│         └───────────────┼───────────────────┘           │
│                         ↓                               │
│                   ┌───────────┐                         │
│                   │ PostgreSQL│                         │
│                   │  (synapse)│                         │
│                   └───────────┘                         │
└─────────────────────────────────────────────────────────┘
```

## URLs

| Service | Internal | External |
|---------|----------|----------|
| Synapse API | http://127.0.0.1:8008 | https://matrix.daarion.space/_matrix/ |
| Element Web | http://127.0.0.1:8088 | https://matrix.daarion.space/element/ |
| Well-known | - | https://matrix.daarion.space/.well-known/matrix/* |

## Deployment Phases

### Phase 1: Base Synapse (Current)
- [x] Конфігурація homeserver.yaml
- [x] PostgreSQL schema
- [x] Docker Compose
- [ ] Deploy на NODE1
- [ ] SSL/DNS для matrix.daarion.space

### Phase 2: Element Web
- [x] config.json
- [ ] Deploy Element
- [ ] Nginx routing /element/

### Phase 3: DAARION Auth Integration
- [ ] User provisioning при реєстрації
- [ ] SSO через DAARION JWT
- [ ] Sync user profiles

### Phase 4: City Rooms Bridge
- [ ] Маппінг City Rooms → Matrix Rooms
- [ ] Agent messages → Matrix events
- [ ] Presence sync

### Phase 5: Federation (Optional)
- [ ] DNS SRV records
- [ ] Federation keys
- [ ] Multi-node setup

## Configuration

### Environment Variables

```bash
# Required
SYNAPSE_DB_PASSWORD=your_secure_password
SYNAPSE_REGISTRATION_SECRET=your_registration_secret
TURN_SHARED_SECRET=your_turn_secret

# Optional
SYNAPSE_SERVER_NAME=daarion.space
```

### DNS Records

```
matrix.daarion.space    A       144.76.224.179
_matrix._tcp.daarion.space    SRV    10 5 443 matrix.daarion.space
```

## User Registration

Реєстрація через API (для інтеграції з DAARION Auth):

```bash
# Register user via admin API
curl -X POST "http://localhost:8008/_synapse/admin/v1/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nonce": "...",
    "username": "user123",
    "password": "...",
    "admin": false
  }'
```

## Security

1. **Registration disabled** — користувачі створюються тільки через DAARION Auth
2. **Admin API** — обмежений доступ
3. **Rate limiting** — налаштовано в homeserver.yaml
4. **E2EE** — підтримується Element Web

## Monitoring

Метрики доступні на порту 9000:
- `/_synapse/metrics` — Prometheus метрики

## Troubleshooting

### Synapse не стартує
```bash
docker logs daarion-synapse
# Перевірити signing.key
docker exec daarion-synapse ls -la /data/
```

### Database connection failed
```bash
# Перевірити PostgreSQL
docker exec -it dagi-postgres psql -U postgres -c "\l"
```

### Element не підключається
1. Перевірити CORS headers
2. Перевірити .well-known endpoints
3. Перевірити config.json base_url

## Files

```
infra/matrix/
├── synapse/
│   ├── homeserver.yaml     # Main config
│   └── log.config          # Logging config
├── postgres/
│   └── init.sql            # DB initialization
├── element-web/
│   └── config.json         # Element config
├── gateway/
│   └── matrix.conf         # Nginx config
├── docker-compose.matrix.yml
└── README_MATRIX.md
```

