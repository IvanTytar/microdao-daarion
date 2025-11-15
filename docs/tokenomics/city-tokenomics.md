---
title: City Tokenomics
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---

> **Цей документ є актуальною версією токеноміки міста.**  
> Усі попередні документи з токеноміки вважаються застарілими.

# City Tokenomics — DAARION.city (Integration-Ready)

**Цей документ є обов'язковим для додавання у репозиторій під час інтеграції MicroDAO у DAARION.city.**

DAARION.city — це **перше MicroDAO у мережі** (A1-рівень), що очолюється системним агентом **DAARWIZZ**. Усі інші компоненти міської екосистеми — це наступні рівні MicroDAO-структури.

---

## 1. Загальний огляд токеноміки міста

Місто працює на **двоєдиній моделі токенів**:

- **DAAR** — утиліті-токен (оплата сервісів, платформи, транзакції)
- **DAARION** — civic / identity токен (громадянство, доступ, статус)

Ця пара створює повноцінну економіку доступів та взаємодій.

---

## 2. DAAR — Utility Token

### Використання

- оплата товарів та послуг
- взаємодія з міськими платформами (GreenFood, EnergyUnion, WaterUnion тощо)
- оплата агентів
- оплата створення та роботи microDAO
- внутрішні транзакції між користувачами та DAO

**DAAR — енергія міської економіки.**

### Tokenomics

- динамічний випуск
- джерело: DAARsales (USDT/POL → DAAR)
- комісія на транзакції DAAR: **0.5% → DAO Share Pool**
- APR: **20%** (в стейкінгу)

---

## 3. DAARION — Civic Token / Identity Token

### Використання

- підтвердження статусу громадянина міста
- доступ до глибинних рівнів інфраструктури
- ліцензійний ключ для створення платформ
- доступ до advanced API та інтеграцій

**DAARION — статус, права і розширені можливості.**

### Tokenomics

- стартова емісія: **500 DAARION**
- дефляція: **5% burn** при продажу
- APR: **4% + частка від комісій DAAR**
- джерело: DAARIONsales (100 DAAR → 1 DAARION)

---

## 4. Рівні доступу за DAAR та DAARION

### 4.1 Звичайні користувачі / Покупці

- доступ до платформ: **лише наявність DAAR**
- DAARION не потрібен

### 4.2 Постачальники / Вендори

- доступ до роботи на платформах: **0.01 DAARION у стейкінгу**

### 4.3 Створення платформ

- право створити платформу: **1 DAARION у стейкінгу**

### 4.4 Створення MicroDAO

- доступ: **1 DAAR або 0.01 DAARION**

---

## 4.5 MicroDAO Tokens (Local Layer)

Кожне microDAO має власні три токени, емітовані DAOFactory:

| Token    | Function                                       | Activation       |
| -------- | ---------------------------------------------- | ---------------- |
| **GOV**  | governance / voting key inside DAO             | cost: **1 DAAR** |
| **UTIL** | внутрішня економіка DAO (операції, винагороди) | cost: **1 DAAR** |
| **REP**  | репутаційний токен (невзаємозамінний)          | cost: **1 DAAR** |

**Emission model:**
- DAO може емітувати будь-яку кількість, згідно з власною політикою
- DAOFactory перевіряє баланс користувача (1 DAAR або 0.01 DAARION)
- Емісія gas-free (off-chain), періодична синхронізація on-chain

**Economic Flow Inside MicroDAO:**
```text
DAAR → eMINT GOV/UTIL/REP → DAO Operations → UTIL Rewards → TokenBridge → DAAR
```

---

## 5. Ієрархія MicroDAO у DAARION.city

**ДАЖЕСТВА МІСТА — ЦЕ ДЕРЕВО MICRODAO.**

### **A1 — DAARION.city (перше MicroDAO)**

- кореневе DAO міста
- очолюється агентом **DAARWIZZ**
- керує реєстрами, платформами, правами доступу

### **A2 — Міські платформи (другий рівень)**

Платформи є MicroDAO другого порядку.

Поточний список:

- **Helion** — енергетика
- **GreenFood ERP** — агро/харчові продукти
- **Soul** — соціальна система
- **Dario** — міські сервіси
- **Nutra** — здоровʼя і нутриція
- **WaterAGI** — вода та очищення

Кожна платформа має власних агентів.

### **A3 — Публічні MicroDAO (третій рівень)**

- не підпорядковуються платформам
- доступні для всіх резидентів
- можуть взаємодіяти з A1 та A2 через DAAR

### **A4/F4 — Приватні MicroDAO (четвертий рівень)**

- повна автономія
- не мають підлеглості іншим DAO
- доступні лише за запрошенням

---

## 6. Логіка доступів на основі DAARION (Framework)

**Більше DAARION = більше можливостей**, зокрема:

- доступ до інституційних функцій
- доступ до створення платформ
- доступ до глибоких API
- доступ до керування DAO високого рівня
- більший пріоритет у DAGI

Це ядро формує модель: **Civic Token → Access Tier → City Expansion**.

---

## 7. Патерн розвитку токеноміки

Система спроектована так, що нові рівні доступу та права можуть додаватися з розвитком:

- запуск нових платформ
- нові типи агентів
- DAO-функції наступних фаз
- нові MetaDAO рівні

Токен DAARION — універсальний ключ для майбутньої інфраструктурної експансії.

---

## 8. Використання DAAR і DAARION у інтеграції MicroDAO

При підключенні MicroDAO до DAARION.city ця сторінка повинна бути додана у розділ:

```text
docs/tokenomics/city-tokenomics.md
```

MicroDAO використовує ці правила для:

- валідації доступу користувачів
- роботи DAOFactory
- роботи агентів DAARWIZZ
- контролю доступу до платформ
- ліцензування сервісів

DAARION.city — це **кореневе MicroDAO (A1)**, а вся міська екосистема — це дерево MicroDAO.

---

## 9. Інтеграція з іншими документами

Цей документ доповнює:

- `DAARION_city_integration.md` — архітектура інтеграції
- `50_daarion_city_website_integration.md` — інтеграція з сайтом
- `32_policy_service_PDP_design.md` — PDP token-gating
- `49_wallet_rwa_payouts_claims.md` — Wallet Service

> **Примітка:** Попередній документ `tokenomics/README.md` перенесено в `docs/_archive/tokenomics_legacy_v0.md`. Вся актуальна інформація об'єднана в цьому канонічному документі.

---

## 10. Завдання для Cursor

```text
You are a senior blockchain/full-stack engineer. Implement City Tokenomics using:
- docs/tokenomics/city-tokenomics.md (⭐ CANONICAL)
- 32_policy_service_PDP_design.md
- 49_wallet_rwa_payouts_claims.md

Tasks:
1) Implement access tier validation (DAAR ≥ 1.00 or DAARION ≥ 0.01 for MicroDAO creation).
2) Implement platform creation access (DAARION ≥ 1.00 staked).
3) Implement vendor access (DAARION ≥ 0.01 staked).
4) Implement DAARION.city as A1-level MicroDAO (root DAO).
5) Implement platform hierarchy (A2-level: Helion, GreenFood, Soul, Dario, Nutra, WaterAGI).
6) Implement public MicroDAO (A3-level) and private MicroDAO (A4-level) access rules.
7) Integrate DAARWIZZ agent as system agent for A1-level.
8) Add DAAR/DAARION balance checks in PDP for all access levels.
9) Implement tier-based access logic (more DAARION = more capabilities).
10) Add platform licensing system (1 DAARION staked = platform creation right).

Output:
- list of modified files
- diff
- summary
```

---

## 11. Підсумок

- **DAAR** = універсальна енергія економіки
- **DAARION** = статус, рівні доступу, громадянство
- платформи належать рівню A2
- публічні MicroDAO — A3
- приватні MicroDAO — A4
- DAARION.city — перше, головне DAO (A1), центр усієї мережі

Це формує стійку багаторівневу архітектуру міста та екосистеми MicroDAO.

---

## 12. Fees & Costs (MicroDAO Economics)

### City Fees (denominated in DAAR)

| Action                          | Cost          |
| ------------------------------- | ------------- |
| Створення microDAO              | **1 DAAR**    |
| Емісія GOV                      | **1 DAAR**    |
| Емісія UTIL                     | **1 DAAR**    |
| Емісія REP                      | **1 DAAR**    |
| Підключення агента DAGI         | **0.25 DAAR** |
| Реєстрація DAO у каталозі міста | **0.05 DAAR** |

**90% DAO / 10% City Rule:** Діє для DePIN-DAO та DAO, що працюють з постійною DAGI-активністю.

---

## 13. Staking & Rewards

### DAAR Staking (APR: 20%)
- Rewards → DAAR
- Смартконтракт: `APRStaking`

### DAARION Staking (APR: 4% + revenue share)
- Rewards → DAAR
- Частка від DAAR-комісій (0.5%) розподіляється пропорційно до стейку DAARION
- Смартконтракт: `DAARDistributor`

---

## 14. Token Bridges & Onboarding

### Flow
```text
USDT/POL → DAAR → DAARION → DAO → DAGI → Rewards in DAAR
```

### Components

| Component         | Function                       |
| ----------------- | ------------------------------ |
| **DAARsales**     | Купівля DAAR за USDT/POL       |
| **DAARIONsales**  | 100 DAAR → 1 DAARION           |
| **DAOFactory**    | Створення MicroDAO             |
| **TokenBridge**   | UTIL ↔ DAAR обмін              |
| **DAGI Registry** | Реєстрація DAO, агентів, знань |

### Primary Access Flow (Onboarding)

1. **Balance Check** — Wallet Agent перевіряє: ≥ 1 DAAR **або** ≥ 0.01 DAARION
2. **Eligibility** — `eligible_for_MicroDAO = true`
3. **DAO Creation (DAOFactory)** — списується 1 DAAR, DAO отримує унікальний `dao_id`
4. **Token Activation** — користувач може емітувати GOV / UTIL / REP (1 DAAR за кожен тип)
5. **DAGI Sync** — DAO реєструється у DAGI Registry

---

## 15. Integration Points (Architecture)

### Wallet Service
- баланси DAAR / DAARION
- fee accounting (0.5%)
- DAOFactory calls
- staking
- token exchange

### PDP (Access Control)
- наявність токенів
- права доступу до DAO
- gas-free стани
- DAO governance rules

### Agents
**Можуть:**
- працювати з UTIL
- виконувати дії DAO
- розподіляти REP
- взаємодіяти з DAGI Registry

**Не можуть:**
- змінювати баланси DAAR/DAARION
- створювати DAO без користувача
- змінювати тарифні плани

### DAGI Registry
- DAO metadata
- Agent slots
- Knowledge mining rewards
- Off-chain/on-chain settlement

---

## 16. Security Rules

- тільки Owner може виконувати DAOFactory
- DAAR/DAARION операції виконуються он-чейн
- UTIL/GOV/REP — off-chain з періодичною валідацією
- burn 5% DAARION при продажі — обов'язковий
- reentrancy guard
- мінімальна кількість GOV для голосування встановлюється DAO

---

## 17. MVP Scope (Required for Launch)

### Must-have
- DAAR / DAARION баланс-чек
- DAOFactory (1 DAAR → create)
- eMINT GOV / UTIL / REP
- TokenBridge (UTIL ↔ DAAR)
- DAARsales, DAARIONsales
- Basic staking (DAAR, DAARION)
- PDP token-gating
- Wallet v1

### Optional MVP+
- Knowledge Mining Rewards
- REP reputation logic
- Multi-DAO bridges

---

## 18. Changelog

### v1.0.0 — 2024-11-14
- Початкова версія токеноміки міста
- Додано DAAR та DAARION токени
- Додано ієрархію MicroDAO (A1-A4)
- Додано рівні доступу
- Додано GOV/UTIL/REP токени для microDAO
- Додано DAOFactory та TokenBridge
- Додано staking та rewards
- Додано security rules

---

**Версія:** 1.0.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*

