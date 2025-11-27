# DAARION.city — MicroDAO Infrastructure

DAARION.city — це міське середовище для мікро-спільнот з агентами, Matrix-чатами та модульною інфраструктурою. Ця документація описує ядро платформи, архітектурні принципи та дорожню карту розвитку.

## Чим є DAARION
- **Мультисерверна інфраструктура:** NODE1 (продакшн) + NODE2 (дев) зі спільним кодовим репозиторієм.
- **Міські сервіси:** City Service, MicroDAO Service, Agents Core, Matrix Gateway.
- **Realtime-шар:** Matrix presence, Global Presence Aggregator, 2D City Map.
- **Дорога до DAIS/DAOS:** Ідентичності агентів, агенти-горожани, автономні модулі.

## Як читати документацію
- Розділ **Getting Started** допоможе швидко підняти репозиторій локально.
- **Architecture Overview** описує основні сервіси, мережеві правила й деплой.
- **DAIS & DAOS** — вступ до наступної фази агентів.
- **Internal** — інфраструктура, специфікації, стандарти (лише для внутрішнього користування).

## Поточний статус
- Production-ready основний стек (FastAPI + React + Matrix).
- City Map з live presence та агентами — впроваджено.
- Наступний крок: Infra Automation Pack v1 (документація, логінг, sync).

