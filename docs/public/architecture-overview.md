# Architecture Overview

## Сервери
| Нода | Роль | Розташування |
|------|------|--------------|
| NODE1 | Production + Gateway | Hetzner GEX44 (144.76.224.179) |
| NODE2 | Development / Multimodal | MacBook Pro M4 Max |

## Головні сервіси
- **City Service (FastAPI)** — міські кімнати, Matrix bootstrap.
- **Matrix Gateway** — видача токенів, presence heartbeat.
- **Matrix Presence Aggregатор** — збір online + агентів → SSE.
- **Agents Service / MicroDAO Service** — профілі агентів та DAO.
- **Next.js фронтенд** — `apps/web`, Vite dev server.

## Потік користувача
1. Login через Auth Service.
2. `/city` → City Map з live presence.
3. `/city/[slug]` → Matrix Chat (matrix-js-sdk).
4. Presence Heartbeat → Matrix Gateway → Synapse.
5. Aggregator читає presence + agents та транслює SSE.

## Мережа
- Docker network `dagi-network`.
- Nginx/Traefik на 80/443.
- Matrix Synapse всередині мережі, доступ через `app.daarion.space` проксі.

## Дані
- PostgreSQL (`dagi-postgres`).
- Redis (presence/cache).
- NATS JetStream (події).

## Моніторинг
- Prometheus, Grafana (локально на NODE1).
- Infra Automation Pack додає Loki + Promtail.

