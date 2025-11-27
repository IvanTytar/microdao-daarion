# Monitoring Overview

## Поточні компоненти
- **Prometheus** — збирає метрики сервісів (router, gateway, swapper).
- **Grafana** — dashboards (NODE1:3000).
- **node-exporter** (planned) — системні метрики.

## Що додає Infra Automation Pack
- **Loki + Promtail** — централізовані логи Docker та системи.
- **Daily Log Summary** — markdown-звіти з ключовими подіями.
- **Docs Sync** — гарантує, що інфраструктурні інструкції однакові на всіх нодах.

## Мережеві порти
| Сервіс | Порт |
|--------|------|
| Prometheus | 9090 |
| Grafana | 3000 |
| Loki | 3100 |
| Promtail | 9080 |

## Наступні кроки
1. Додати алерти (Alertmanager).
2. Інтегрувати NATS JetStream події в Loki (через Promtail pipeline).
3. Створити спільний Grafana dashboard для City Map / Agent Presence.

