# Як підключити нову ноду до DAARION

Вітаємо! Ви вирішили розширити обчислювальну потужність мережі DAARION.
Цей гайд допоможе вам розгорнути власну ноду та підключити її до кластера.

## Вимоги до заліза (Мінімальні)
- **CPU**: 4 cores
- **RAM**: 16 GB (рекомендовано 32+ GB для LLM)
- **Disk**: 100 GB SSD
- **OS**: Ubuntu 22.04 LTS / Debian 11+
- **Network**: Статична IP адреса, відкриті порти

## Крок 1: Підготовка сервера

Встановіть Docker та Docker Compose:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## Крок 2: Отримання токенів

Для підключення вам знадобляться:
1. **NATS Connection URL** (від адміністратора)
2. **NATS Credentials File** (`.creds`) (від адміністратора)

Зверніться до адміністраторів мережі у [Discord/Matrix], щоб отримати доступ.

## Крок 3: Розгортання Node Runtime

Створіть директорію `daarion-node` та файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # 1. NATS Leaf Node (міст до ядра)
  nats-leaf:
    image: nats:2.10-alpine
    volumes:
      - ./nats.conf:/etc/nats/nats.conf
      - ./creds:/etc/nats/creds
    ports:
      - "4222:4222"

  # 2. Node Registry (реєстрація в мережі)
  node-registry:
    image: daarion/node-registry:latest
    environment:
      - NODE_ID=my-node-01  # Змініть на унікальне ім'я
      - NATS_URL=nats://nats-leaf:4222
      - REGION=eu-central
    depends_on:
      - nats-leaf

  # 3. Ollama (AI Runtime)
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

## Крок 4: Запуск

```bash
docker compose up -d
```

## Крок 5: Перевірка

Перейдіть у консоль **Nodes** на https://app.daarion.space/nodes.
Ваша нода має з'явитися у списку зі статусом **Online**.

## Що далі?
- Розгорніть **Guardian Agent** для моніторингу.
- Встановіть **Steward Agent** для управління ресурсами.
- Приєднуйтесь до MicroDAO, щоб надавати ресурси конкретним спільнотам.

