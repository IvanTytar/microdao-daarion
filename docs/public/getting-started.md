# Getting Started

Цей гайд допоможе розгорнути DAARION локально або на сервері.

## 1. Клонування репозиторію
```bash
git clone https://github.com/IvanTytar/microdao-daarion.git
cd microdao-daarion
```

## 2. Необхідні залежності
- Docker / Docker Compose 1.29+
- Node.js 20+
- Python 3.11+
- pnpm або npm (для фронтенду)

## 3. Основні команди
```bash
# Бекенд сервіси
docker compose up -d

# City frontend (Next.js)
cd apps/web
pnpm install
pnpm dev
```

## 4. Ноди
- **NODE1 (production):** `/opt/microdao-daarion`, IP `144.76.224.179`.
- **NODE2 (dev MacBook):** `/Users/apple/github-projects/microdao-daarion`.

## 5. CI/CD
1. Код → `main`.
2. `git pull` на NODE1.
3. `docker compose up -d --build`.

## 6. Корисні скрипти
- `smoke.sh` — базовий health check.
- `scripts/docs/docs_sync.sh` — автоматичний pull (див. Infra Pack).

