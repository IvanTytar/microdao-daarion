# MicroDAO Backend — Source Code Structure

Цей документ описує структуру коду backend-частини MicroDAO/DAARION.city.

## Структура папок

```
src/
├── domain/          # Чисті доменні типи та логіка (без I/O)
│   ├── dao/        # DAO domain types & logic
│   ├── wallet/     # Wallet domain types
│   ├── pdp/        # PDP policy model
│   └── user/       # User domain types
│
├── services/        # Бізнес-логіка сервісів
│   ├── wallet/     # Wallet Service
│   ├── dao-factory/ # DAOFactory Service
│   ├── registry/   # Registry Service
│   ├── pdp/        # PDP Service
│   └── router/     # Router/Agent runtime (майбутнє)
│
├── api/            # HTTP API layer
│   ├── http/       # Express routes
│   └── middleware/ # Auth, context middleware
│
├── infra/          # Інфраструктура
│   ├── db/         # Database access
│   ├── logger/     # Logging
│   └── config/     # Configuration
│
└── app.ts          # Application entry point
```

## Принципи архітектури

1. **Domain Layer** (`domain/`) — чисті типи та бізнес-логіка без залежностей від інфраструктури
2. **Services Layer** (`services/`) — реалізація бізнес-логіки згідно `core-services-mvp.md`
3. **API Layer** (`api/`) — HTTP-рівень, що викликає сервіси
4. **Infrastructure Layer** (`infra/`) — БД, логування, конфігурація

## Документація

- `docs/core-services-mvp.md` — специфікація core-сервісів
- `docs/api-mvp.md` — API специфікація
- `docs/pdp_access.md` — PDP та система доступів

## Запуск

```bash
npm install
npm run dev
```

## MVP Status

Наразі реалізовано:
- ✅ Структура проекту
- ✅ Domain types
- ✅ Wallet Service (stub)
- ✅ DAOFactory Service
- ✅ Registry Service
- ✅ PDP Service
- ✅ HTTP Routes
- ✅ Middleware

TODO:
- [ ] Інтеграція з реальною БД
- [ ] JWT авторизація
- [ ] On-chain інтеграція для Wallet
- [ ] Agent Runtime
- [ ] Тести
