# Memory Service

FastAPI сервіс для управління пам'яттю в MicroDAO:
- **user_facts** - довгострокова пам'ять користувачів
- **dialog_summaries** - підсумки діалогів для масштабування
- **agent_memory_events** - події пам'яті агентів
- **token-gate інтеграція** - перевірка доступу через RBAC

## Встановлення

```bash
# Створити віртуальне середовище
python -m venv venv
source venv/bin/activate  # Linux/Mac
# або
venv\Scripts\activate  # Windows

# Встановити залежності
pip install -r requirements.txt

# Налаштувати .env файл
cp .env.example .env
# Відредагуйте .env з вашими налаштуваннями
```

## Запуск

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### User Facts

- `POST /facts/upsert` - Створити або оновити факт (основний ендпоінт)
- `GET /facts` - Список фактів користувача
- `GET /facts/{fact_key}` - Отримати факт за ключем
- `POST /facts` - Створити новий факт
- `PATCH /facts/{fact_id}` - Оновити факт
- `DELETE /facts/{fact_id}` - Видалити факт
- `GET /facts/token-gated` - Токен-гейт факти

### Dialog Summaries

- `POST /summaries` - Створити підсумок діалогу
- `GET /summaries` - Список підсумків (з cursor pagination)
- `GET /summaries/{summary_id}` - Отримати підсумок
- `DELETE /summaries/{summary_id}` - Видалити підсумок

### Agent Memory Events

- `POST /agents/{agent_id}/memory` - Створити подію пам'яті
- `GET /agents/{agent_id}/memory` - Список подій (з cursor pagination)
- `DELETE /agents/{agent_id}/memory/{event_id}` - Видалити подію

### Token Gate

- `POST /token-gate/check` - Перевірка токен-гейту

## Приклади використання

### Створити/оновити факт користувача

```bash
curl -X POST "http://localhost:8000/facts/upsert" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "u_123",
    "fact_key": "language",
    "fact_value": "uk-UA",
    "metadata": {"source": "onboarding"}
  }'
```

### Створити токен-гейт факт

```bash
curl -X POST "http://localhost:8000/facts/upsert" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "u_123",
    "fact_key": "is_donor",
    "fact_value": "true",
    "token_gated": true,
    "token_requirements": {
      "token": "DAAR",
      "min_balance": 1
    }
  }'
```

### Створити підсумок діалогу

```bash
curl -X POST "http://localhost:8000/summaries" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "t_123",
    "channel_id": "c_456",
    "period_start": "2025-01-01T00:00:00Z",
    "period_end": "2025-01-01T23:59:59Z",
    "summary_text": "Обговорювали новий проєкт, вирішили використати React",
    "message_count": 42,
    "participant_count": 5,
    "topics": ["project-planning", "tech-stack"]
  }'
```

## Структура бази даних

Сервіс використовує такі таблиці:
- `user_facts` - факти користувачів
- `dialog_summaries` - підсумки діалогів
- `agent_memory_events` - події пам'яті агентів
- `agent_memory_facts_vector` - векторні представлення фактів (для RAG)

## Інтеграція з іншими сервісами

### PDP Service
Для перевірки токен-гейту використовується PDP Service (Policy Decision Point).

### Wallet Service
Для перевірки балансів токенів використовується Wallet Service.

### Auth Service
Для авторизації використовується JWT токени з Auth Service.

## TODO

- [ ] Реалізувати реальну перевірку JWT токенів
- [ ] Інтегрувати з PDP Service для token-gate
- [ ] Інтегрувати з Wallet Service для перевірки балансів
- [ ] Додати кешування для часто використовуваних фактів
- [ ] Додати метрики та моніторинг
- [ ] Додати тести

