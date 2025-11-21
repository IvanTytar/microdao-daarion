"""
GREENFOOD Crew - Оркестрація команд для бізнес-сценаріїв

Визначає crews (команди агентів) для виконання комплексних завдань:
- onboard_vendor_crew: Онбординг нових комітентів
- fulfill_order_crew: Виконання замовлень
- monthly_settlement_crew: Місячні звіряння та розрахунки
"""

from crewai import Crew, Task, Process
from typing import Dict, Any, List

from .greenfood_agents import (
    greenfood_assistant,
    product_catalog_agent,
    batch_quality_agent,
    vendor_success_agent,
    warehouse_agent,
    logistics_delivery_agent,
    seller_agent,
    customer_care_agent,
    finance_pricing_agent,
    smm_campaigns_agent,
    seo_web_agent,
    analytics_bi_agent,
    compliance_audit_agent,
    GREENFOOD_AGENTS,
)


# ========================================
# 1. Onboard Vendor Crew
# ========================================

def create_onboard_vendor_tasks(vendor_data: Dict[str, Any]) -> List[Task]:
    """
    Створює завдання для онбордингу нового комітента (виробника).
    
    Args:
        vendor_data: Дані про комітента (назва, контакти, товари, склади)
    
    Returns:
        List[Task]: Список завдань для виконання
    """
    tasks = [
        Task(
            description=f"""
            Привітай комітента "{vendor_data.get('name', 'Новий комітент')}" та поясни процес онбордингу.
            Збери всю необхідну інформацію: реквізити, контактні дані, опис виробництва.
            Делегуй наступні завдання відповідним агентам.
            """,
            agent=greenfood_assistant,
            expected_output="Стислий план онбордингу з чеклістом для комітента",
        ),
        Task(
            description=f"""
            Допоможи комітенту створити карточки товарів в каталозі.
            Товари для додавання: {vendor_data.get('products', [])}
            Перевір повноту інформації: назва, опис, категорія, атрибути, фото.
            """,
            agent=product_catalog_agent,
            expected_output="Список створених ID товарів з їх ключовими даними",
        ),
        Task(
            description="""
            Налаштуй структуру складу для комітента та створи початкові партії товарів.
            Встанови правила контролю якості та термінів придатності.
            """,
            agent=warehouse_agent,
            expected_output="Конфігурація складу та список створених партій",
        ),
        Task(
            description="""
            Налаштуй базові моделі ціноутворення та взаєморозрахунків.
            Обговори з комітентом комісії, умови оплати, модель співпраці.
            """,
            agent=finance_pricing_agent,
            expected_output="Фінансові налаштування: моделі ціноутворення, комісії, умови",
        ),
        Task(
            description="""
            Складі чекліст успішного запуску та запланюй наступні кроки.
            Визнач метрики успіху та терміни першого revenue.
            """,
            agent=vendor_success_agent,
            expected_output="Чекліст з термінами, метрики успіху, план підтримки",
        ),
    ]
    return tasks


onboard_vendor_crew = Crew(
    agents=[
        greenfood_assistant,
        vendor_success_agent,
        product_catalog_agent,
        warehouse_agent,
        finance_pricing_agent,
    ],
    tasks=[],  # Будуть додані динамічно через create_onboard_vendor_tasks()
    process=Process.sequential,  # Послідовне виконання завдань
    verbose=True,
    memory=True,
)


# ========================================
# 2. Fulfill Order Crew
# ========================================

def create_fulfill_order_tasks(order_data: Dict[str, Any]) -> List[Task]:
    """
    Створює завдання для виконання замовлення.
    
    Args:
        order_data: Дані про замовлення (товари, кількість, адреса доставки)
    
    Returns:
        List[Task]: Список завдань для виконання
    """
    tasks = [
        Task(
            description=f"""
            Прийми замовлення від клієнта: {order_data.get('customer_name', 'Клієнт')}.
            Товари: {order_data.get('items', [])}
            Адреса доставки: {order_data.get('delivery_address', 'Не вказано')}
            Перевір повноту даних та делегуй далі.
            """,
            agent=greenfood_assistant,
            expected_output="Підтвердження прийняття замовлення з номером",
        ),
        Task(
            description="""
            Сформуй кошик, перевір наявність товарів, запропонуй альтернативи якщо потрібно.
            Розрахуй суму замовлення з урахуванням знижок та умов клієнта.
            """,
            agent=seller_agent,
            expected_output="Підтверджений кошик з розрахунком суми",
        ),
        Task(
            description="""
            Перевір наявність товарів на складі, зарезервуй необхідну кількість.
            Підготуй замовлення до відвантаження: picking list, packing list.
            """,
            agent=warehouse_agent,
            expected_output="Резервація товарів, списки picking/packing",
        ),
        Task(
            description="""
            Створи маршрут доставки, вибери оптимального перевізника.
            Сформуй документи доставки, трек-номер для клієнта.
            """,
            agent=logistics_delivery_agent,
            expected_output="Маршрут доставки, трек-номер, очікувана дата доставки",
        ),
        Task(
            description="""
            Проведи фінансові операції: фіксація продажу, розрахунок комісій.
            Запланюй виплату комітенту згідно умов договору.
            """,
            agent=finance_pricing_agent,
            expected_output="Фінансові проводки, розрахунок виплат комітенту",
        ),
        Task(
            description="""
            Відправ клієнту підтвердження замовлення з детальною інформацією.
            Надай контакти для зв'язку та трек-номер для відстеження.
            """,
            agent=customer_care_agent,
            expected_output="Повідомлення клієнту з детальною інформацією про замовлення",
        ),
    ]
    return tasks


fulfill_order_crew = Crew(
    agents=[
        greenfood_assistant,
        seller_agent,
        warehouse_agent,
        logistics_delivery_agent,
        customer_care_agent,
        finance_pricing_agent,
    ],
    tasks=[],  # Будуть додані динамічно через create_fulfill_order_tasks()
    process=Process.sequential,
    verbose=True,
    memory=True,
)


# ========================================
# 3. Monthly Settlement Crew
# ========================================

def create_monthly_settlement_tasks(period_data: Dict[str, Any]) -> List[Task]:
    """
    Створює завдання для місячного звіряння та розрахунків.
    
    Args:
        period_data: Період звіряння (місяць, рік, комітенти)
    
    Returns:
        List[Task]: Список завдань для виконання
    """
    tasks = [
        Task(
            description=f"""
            Ініціюй процес місячного звіряння за період: {period_data.get('period', 'Поточний місяць')}.
            Зібери дані від усіх доменних агентів для формування звітів.
            """,
            agent=greenfood_assistant,
            expected_output="План звіряння з переліком необхідних даних",
        ),
        Task(
            description="""
            Зформуй аналітичні звіти:
            - Обороти по комітентах, товарах, хабах
            - Тренди продажів, популярні товари, аномалії
            - Рекомендації для оптимізації
            """,
            agent=analytics_bi_agent,
            expected_output="Аналітичні звіти з insights та рекомендаціями",
        ),
        Task(
            description="""
            Розрахуй фінансові показники:
            - Виручка, комісії, чисті виплати комітентам
            - Операційні витрати, прибуток платформи
            - Баланси всіх учасників (комітенти, хаби, платформа)
            Сформуй акти звіряння для комітентів.
            """,
            agent=finance_pricing_agent,
            expected_output="Фінансові звіти, акти звіряння, розрахунок виплат",
        ),
        Task(
            description="""
            Перевір дані на аномалії та ризикові операції:
            - Великі списання, нетипові повернення
            - Зміни цін, коригування балансів
            - Відхилення від нормальних операцій
            Сформуй звіт для адміністрації.
            """,
            agent=compliance_audit_agent,
            expected_output="Audit звіт з виявленими ризиками та рекомендаціями",
        ),
        Task(
            description="""
            На основі звітів сформуй персоналізовані рекомендації для кожного комітента:
            - Що покращити в каталозі, запасах, цінах
            - Які товари просунути, які зняти з асортименту
            - Плани на наступний місяць
            """,
            agent=vendor_success_agent,
            expected_output="Персоналізовані рекомендації для комітентів",
        ),
    ]
    return tasks


monthly_settlement_crew = Crew(
    agents=[
        greenfood_assistant,
        finance_pricing_agent,
        analytics_bi_agent,
        compliance_audit_agent,
        vendor_success_agent,
    ],
    tasks=[],  # Будуть додані динамічно через create_monthly_settlement_tasks()
    process=Process.sequential,
    verbose=True,
    memory=True,
)


# ========================================
# 4. Marketing Campaign Crew (додатковий)
# ========================================

def create_marketing_campaign_tasks(campaign_data: Dict[str, Any]) -> List[Task]:
    """
    Створює завдання для запуску маркетингової кампанії.
    
    Args:
        campaign_data: Дані про кампанію (мета, товари, канали, бюджет)
    
    Returns:
        List[Task]: Список завдань для виконання
    """
    tasks = [
        Task(
            description=f"""
            Прийми запит на маркетингову кампанію:
            Мета: {campaign_data.get('goal', 'Підвищення продажів')}
            Товари: {campaign_data.get('products', [])}
            Канали: {campaign_data.get('channels', ['соцмережі', 'розсилки'])}
            """,
            agent=greenfood_assistant,
            expected_output="План кампанії з цілями та метриками",
        ),
        Task(
            description="""
            Перевір наявність товарів на складах для промо.
            Переконайся, що можемо виконати підвищений попит.
            """,
            agent=warehouse_agent,
            expected_output="Підтвердження наявності товарів та можливості виконати попит",
        ),
        Task(
            description="""
            Створи контент для соцмереж, розсилок та банерів.
            Використай реальні дані про товари, переваги, акції.
            """,
            agent=smm_campaigns_agent,
            expected_output="Готовий контент для різних каналів",
        ),
        Task(
            description="""
            Оптимізуй посадкові сторінки товарів для SEO.
            Покращи заголовки, описи, метадані для органічного трафіку.
            """,
            agent=seo_web_agent,
            expected_output="Оптимізовані сторінки з покращеними SEO-елементами",
        ),
        Task(
            description="""
            Налаштуй спеціальне ціноутворення для кампанії:
            знижки, промокоди, умови акції.
            """,
            agent=finance_pricing_agent,
            expected_output="Налаштування цін та промокодів для кампанії",
        ),
        Task(
            description="""
            Підготуй KPI для відстеження ефективності кампанії:
            охоплення, конверсії, продажі, ROI.
            """,
            agent=analytics_bi_agent,
            expected_output="Налаштування відстеження та KPI для кампанії",
        ),
    ]
    return tasks


marketing_campaign_crew = Crew(
    agents=[
        greenfood_assistant,
        warehouse_agent,
        smm_campaigns_agent,
        seo_web_agent,
        finance_pricing_agent,
        analytics_bi_agent,
    ],
    tasks=[],  # Будуть додані динамічно через create_marketing_campaign_tasks()
    process=Process.sequential,
    verbose=True,
    memory=True,
)


# ========================================
# Експорт crews
# ========================================

GREENFOOD_CREWS = {
    "onboard_vendor": onboard_vendor_crew,
    "fulfill_order": fulfill_order_crew,
    "monthly_settlement": monthly_settlement_crew,
    "marketing_campaign": marketing_campaign_crew,
}

GREENFOOD_TASK_CREATORS = {
    "onboard_vendor": create_onboard_vendor_tasks,
    "fulfill_order": create_fulfill_order_tasks,
    "monthly_settlement": create_monthly_settlement_tasks,
    "marketing_campaign": create_marketing_campaign_tasks,
}

