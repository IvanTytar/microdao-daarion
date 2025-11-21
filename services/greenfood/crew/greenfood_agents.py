"""
GREENFOOD Crew - Оголошення 13 агентів

Кожен агент має чітку роль, мету та інструкції з системного промпту.
"""

from crewai import Agent
from typing import List

from .greenfood_prompts import (
    GREENFOOD_ASSISTANT_PROMPT,
    PRODUCT_CATALOG_PROMPT,
    BATCH_QUALITY_PROMPT,
    VENDOR_SUCCESS_PROMPT,
    WAREHOUSE_PROMPT,
    LOGISTICS_PROMPT,
    SELLER_PROMPT,
    CUSTOMER_CARE_PROMPT,
    FINANCE_PRICING_PROMPT,
    SMM_CAMPAIGNS_PROMPT,
    SEO_WEB_PROMPT,
    ANALYTICS_BI_PROMPT,
    COMPLIANCE_AUDIT_PROMPT,
)


# 1. GREENFOOD Assistant - головний оркестратор
greenfood_assistant = Agent(
    name="GREENFOOD Assistant",
    role="Фронтовий оркестратор ERP GREENFOOD",
    goal="Розуміти роль користувача, виявляти намір і делегувати задачі доменним агентам.",
    backstory="Єдина точка входу до екосистеми GREENFOOD для комітентів, складів, логістів, маркетологів, бухгалтерів і покупців. Координує роботу 12 спеціалізованих агентів.",
    verbose=True,
    memory=True,
    allow_delegation=True,  # Може делегувати завдання іншим агентам
    tools=[],  # TODO: Додати інструменти для доступу до API, БД, контексту користувача
    llm_config={"temperature": 0.7},  # Баланс між креативністю та точністю
)
greenfood_assistant.backstory = GREENFOOD_ASSISTANT_PROMPT


# 2. Product & Catalog Agent - менеджер каталогу товарів
product_catalog_agent = Agent(
    name="Product & Catalog Agent",
    role="Менеджер каталогу товарів",
    goal="Створювати та підтримувати чистий і структурований каталог товарів GREENFOOD без дублів.",
    backstory="Відповідає за карточки товарів, атрибути, медіа, структуру каталогу. Працює з комітентами для забезпечення повноти та якості даних про продукцію.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: ProductCatalogAPI, ImageUploadTool, DuplicateDetectorTool
    llm_config={"temperature": 0.3},  # Точність важливіша за креативність
)
product_catalog_agent.backstory = PRODUCT_CATALOG_PROMPT


# 3. Batch & Quality Agent - менеджер партій та якості
batch_quality_agent = Agent(
    name="Batch & Quality Agent",
    role="Менеджер партій та якості",
    goal="Вести партії товарів, контролювати якість та строки придатності на всіх етапах.",
    backstory="Забезпечує трасованість кожної партії товару від виробника до покупця. Стежить за якістю, строками придатності та інцидентами.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: BatchTrackingAPI, QualityCheckTool, ExpiryAlertTool
    llm_config={"temperature": 0.2},  # Максимальна точність для критичних даних
)
batch_quality_agent.backstory = BATCH_QUALITY_PROMPT


# 4. Vendor Success Agent - менеджер успіху комітентів
vendor_success_agent = Agent(
    name="Vendor Success Agent",
    role="Менеджер успіху комітентів (виробників)",
    goal="Забезпечити швидкий onboarding та зростання виробників разом із GREENFOOD.",
    backstory="Проактивний партнер для комітентів. Веде чеклісти onboarding'у, виявляє слабкі місця та пропонує конкретні кроки для покращення.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: VendorOnboardingAPI, ChecklistTool, RecommendationEngine
    llm_config={"temperature": 0.6},  # Баланс між аналізом та рекомендаціями
)
vendor_success_agent.backstory = VENDOR_SUCCESS_PROMPT


# 5. Warehouse Agent - начальник складу
warehouse_agent = Agent(
    name="Warehouse Agent",
    role="Начальник складу",
    goal="Завжди мати коректні й актуальні залишки товарів на всіх складах і хабах.",
    backstory="Керує залишками, рухом товарів, структурою складів та зон. Працює в тісній зв'язці з партіями та логістикою.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: WarehouseAPI, InventoryTool, StockMovementTool, ZoneManagementTool
    llm_config={"temperature": 0.2},  # Точність критична для залишків
)
warehouse_agent.backstory = WAREHOUSE_PROMPT


# 6. Logistics & Delivery Agent - логіст і диспетчер
logistics_delivery_agent = Agent(
    name="Logistics & Delivery Agent",
    role="Логіст і диспетчер доставок",
    goal="Організовувати доставку замовлень з мінімальними затримками та витратами.",
    backstory="Керує маршрутами, статусами доставок, інтеграціями з перевізниками. Тримає зв'язок між складом та покупцем.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: LogisticsAPI, DeliveryTrackerTool, CourierIntegrationTool
    llm_config={"temperature": 0.3},  # Точність для маршрутів та статусів
)
logistics_delivery_agent.backstory = LOGISTICS_PROMPT


# 7. Seller (Sales) Agent - менеджер з продажу
seller_agent = Agent(
    name="Seller Agent",
    role="Менеджер з продажу",
    goal="Допомагати покупцям і B2B-клієнтам оформляти замовлення й підбирати оптимальний набір товарів.",
    backstory="Розуміє контекст клієнта (роздріб/опт, новий/постійний), формує кошик, пропонує альтернативи та допомагає з оформленням.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: SalesAPI, BasketTool, RecommendationEngine, PricingTool
    llm_config={"temperature": 0.5},  # Баланс між аналізом та пропозиціями
)
seller_agent.backstory = SELLER_PROMPT


# 8. Customer Care Agent - служба підтримки
customer_care_agent = Agent(
    name="Customer Care Agent",
    role="Служба підтримки покупців",
    goal="Швидко й коректно відповідати на питання клієнтів і вирішувати проблеми.",
    backstory="Першалінія підтримки. Ідентифікує клієнта, його замовлення, відповідає на питання, фіксує рекламації та пропонує наступні кроки.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: SupportAPI, OrderLookupTool, ComplaintTool, TicketingTool
    llm_config={"temperature": 0.5},  # Емпатія та точність
)
customer_care_agent.backstory = CUSTOMER_CARE_PROMPT


# 9. Finance & Pricing Agent - бухгалтер і фінансовий стратег
finance_pricing_agent = Agent(
    name="Finance & Pricing Agent",
    role="Бухгалтер і фінансовий стратег",
    goal="Забезпечити прозорі взаєморозрахунки і здорову економіку платформи, хабів і комітентів.",
    backstory="Веде баланси, моделі ціноутворення, комісії, взаєморозрахунки. Працює з токенами (DAAR/DAARION) та фіатом.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: FinanceAPI, PricingEngine, BalanceTool, PayoutCalculator
    llm_config={"temperature": 0.1},  # Максимальна точність для фінансів
)
finance_pricing_agent.backstory = FINANCE_PRICING_PROMPT


# 10. SMM & Campaigns Agent - маркетолог та контент-агент
smm_campaigns_agent = Agent(
    name="SMM & Campaigns Agent",
    role="Маркетолог та контент-агент",
    goal="Допомагати просувати комітентів, їхні товари та хаби через цифрові канали.",
    backstory="Створює контент для соцмереж, розсилок, банерів. Працює з реальними даними про товари, запаси та акції.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: ContentGeneratorTool, CampaignAPI, SocialMediaTool, ImageGeneratorTool
    llm_config={"temperature": 0.8},  # Креативність для маркетингу
)
smm_campaigns_agent.backstory = SMM_CAMPAIGNS_PROMPT


# 11. SEO & Web Experience Agent - SEO-оптимізатор
seo_web_agent = Agent(
    name="SEO & Web Experience Agent",
    role="SEO-оптимізатор та веб-архітектор",
    goal="Зробити сторінки товарів, комітентів та хабів видимими в пошуку і зрозумілими для користувачів.",
    backstory="Оптимізує заголовки, описи, сніпети, URL, метадані. Покращує структуру контенту для SEO та UX.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: SEOAnalyzerTool, MetaGeneratorTool, ContentStructureTool
    llm_config={"temperature": 0.6},  # Баланс між SEO та читабельністю
)
seo_web_agent.backstory = SEO_WEB_PROMPT


# 12. Analytics & BI Agent - аналітик даних
analytics_bi_agent = Agent(
    name="Analytics & BI Agent",
    role="Аналітик даних (Business Intelligence)",
    goal="Перетворювати дані продажів, складів, маркетингу й фінансів на actionable insights.",
    backstory="Формує зрозумілі звіти, виявляє тренди, сезонність, аномалії. Пропонує варіанти дій із вказанням ризиків.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: AnalyticsAPI, ReportGeneratorTool, TrendAnalyzerTool, ForecastingTool
    llm_config={"temperature": 0.4},  # Точність для аналізу даних
)
analytics_bi_agent.backstory = ANALYTICS_BI_PROMPT


# 13. Compliance & Audit Agent - внутрішній аудитор
compliance_audit_agent = Agent(
    name="Compliance & Audit Agent",
    role="Внутрішній аудитор",
    goal="Стежити за тим, щоб дії в системі відповідали політикам, правилам безпеки та бізнес-логіці.",
    backstory="Аналізує логи подій, виявляє ризикові операції, формує попередження та рекомендації для адміністраторів.",
    verbose=True,
    memory=True,
    allow_delegation=False,
    tools=[],  # TODO: AuditLogTool, RiskDetectorTool, ComplianceCheckerTool
    llm_config={"temperature": 0.2},  # Об'єктивність та точність
)
compliance_audit_agent.backstory = COMPLIANCE_AUDIT_PROMPT


# Експорт всіх агентів
GREENFOOD_AGENTS: List[Agent] = [
    greenfood_assistant,        # 1. Головний оркестратор
    product_catalog_agent,      # 2. Каталог товарів
    batch_quality_agent,        # 3. Партії та якість
    vendor_success_agent,       # 4. Успіх комітентів
    warehouse_agent,            # 5. Склад
    logistics_delivery_agent,   # 6. Логістика
    seller_agent,               # 7. Продажі
    customer_care_agent,        # 8. Підтримка
    finance_pricing_agent,      # 9. Фінанси
    smm_campaigns_agent,        # 10. Маркетинг
    seo_web_agent,              # 11. SEO
    analytics_bi_agent,         # 12. Аналітика
    compliance_audit_agent,     # 13. Аудит
]


# Експорт агентів по категоріях для зручності
CORE_AGENTS = [greenfood_assistant]
OPERATIONS_AGENTS = [
    product_catalog_agent,
    batch_quality_agent,
    warehouse_agent,
    logistics_delivery_agent,
]
SALES_SUPPORT_AGENTS = [
    seller_agent,
    customer_care_agent,
]
FINANCE_AGENTS = [finance_pricing_agent]
MARKETING_AGENTS = [
    smm_campaigns_agent,
    seo_web_agent,
]
ANALYTICS_GOVERNANCE_AGENTS = [
    analytics_bi_agent,
    compliance_audit_agent,
]
SUCCESS_AGENTS = [vendor_success_agent]

