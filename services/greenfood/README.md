# GREENFOOD Crew

ERP-система з 13 AI-агентами для крафтових виробників продуктів харчування.

## Швидкий старт

```python
from services.greenfood.crew.greenfood_agents import GREENFOOD_AGENTS
from services.greenfood.crew.greenfood_crews import GREENFOOD_CREWS, GREENFOOD_TASK_CREATORS

# 1. Використання окремого агента
from services.greenfood.crew.greenfood_agents import greenfood_assistant

response = greenfood_assistant.execute_task(
    "Допоможи онбордити нового комітента 'Еко Мед Карпати'"
)

# 2. Використання crew для складного сценарію
vendor_data = {
    "name": "Еко Мед Карпати",
    "products": ["Гірський мед", "Мед з липи"],
    "contact": "eco@example.com",
}

tasks = GREENFOOD_TASK_CREATORS["onboard_vendor"](vendor_data)
crew = GREENFOOD_CREWS["onboard_vendor"]
crew.tasks = tasks
result = crew.kickoff()
```

## Структура

```
services/greenfood/
├── README.md                      # Цей файл
└── crew/
    ├── __init__.py
    ├── greenfood_prompts.py       # 13 системних промтів
    ├── greenfood_agents.py        # 13 агентів crewAI
    └── greenfood_crews.py         # 4 crews для бізнес-сценаріїв
```

## 13 агентів

1. **GREENFOOD Assistant** - Головний оркестратор
2. **Product & Catalog Agent** - Каталог товарів
3. **Batch & Quality Agent** - Партії та якість
4. **Vendor Success Agent** - Успіх комітентів
5. **Warehouse Agent** - Склад
6. **Logistics & Delivery Agent** - Доставка
7. **Seller Agent** - Продажі
8. **Customer Care Agent** - Підтримка
9. **Finance & Pricing Agent** - Фінанси
10. **SMM & Campaigns Agent** - Маркетинг
11. **SEO & Web Agent** - SEO
12. **Analytics & BI Agent** - Аналітика
13. **Compliance & Audit Agent** - Аудит

## 4 готових crews

- **onboard_vendor_crew** - Онбординг виробників
- **fulfill_order_crew** - Виконання замовлень
- **monthly_settlement_crew** - Місячні звіряння
- **marketing_campaign_crew** - Маркетингові кампанії

## Інтеграція з DAGI Router

GREENFOOD Assistant доданий у `router-config.yml`:

```yaml
agents:
  greenfood:
    description: "GREENFOOD Assistant - ERP orchestrator"
    default_llm: local_qwen3_8b
```

Виклик через Router:

```python
from router_client import send_to_router

response = await send_to_router({
    "mode": "chat",
    "agent": "greenfood",
    "message": "Покажи статистику по комітенту 'Еко Мед'",
})
```

## Документація

Детальна документація: [docs/greenfood/greenfood_agents.md](/docs/greenfood/greenfood_agents.md)

## Залежності

```bash
pip install crewai>=0.28.0
```

## Статус

✅ Готово до розробки:
- Системні промти (13 агентів)
- Агенти crewAI (13 агентів)
- Crews (4 сценарії)
- Інтеграція з Router
- Документація

🔜 Наступні кроки:
- Додати інструменти (tools) для агентів
- Реалізувати API для доменів (ProductCatalogAPI, WarehouseAPI, etc.)
- Протестувати crews
- UI/UX для різних ролей

## Автор

DAARION.city Platform Team  
Дата створення: 2025-11-18

