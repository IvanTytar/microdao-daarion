---
title: Core Services (MVP) — Wallet, DAOFactory, Registry, PDP
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---

# Core Services (MVP) — Wallet, DAOFactory, Registry, PDP

**Мета цього документа — формалізувати мінімальний набір core-сервісів для MVP MicroDAO / DAARION.city.**

Ці сервіси є "хребтом" системи:

* **Wallet Service** — токени DAAR / DAARION, базові перевірки доступу.
* **DAOFactory Service** — створення MicroDAO та платформ.
* **Registry Service** — каталог DAO і платформ.
* **PDP Service** — єдина точка прийняття рішень по доступу.

Документ повʼязує високорівневі документи (`overview.md`, `microdao-architecture.md`, `pdp_access.md`, `api.md`) з конкретними сервісами, які треба реалізувати в коді.

---

# 1. Загальна картина

MVP передбачає роботу чотирьох базових сервісів:

1. **Wallet Service**

   * читає баланси DAAR / DAARION
   * надає util-методи для перевірки доступу (balance/stake)

2. **DAOFactory Service**

   * створює MicroDAO (A3/A4)
   * створює платформи (A2)
   * ініціалізує базові метадані DAO

3. **Registry Service**

   * зберігає всі DAO
   * зберігає всі платформи (позначені як A2)
   * надає публічний каталог DAO/платформ

4. **PDP Service**

   * приймає рішення, чи дозволена дія (`allow/deny/require-elevation`)
   * використовується Wallet, DAOFactory, Registry та іншими модулями

---

# 2. Wallet Service (MVP)

## 2.1 Відповідальність

* зчитування балансів DAAR / DAARION користувача
* зчитування стейкінгу DAARION (для доступу до платформ/ролей)
* надання простих helper-функцій типу:

  * `hasEnoughForDaoCreate(user)`
  * `hasEnoughForVendorRegister(user)`
  * `hasEnoughForPlatformCreate(user)`

Фінансові транзакції, стейкінг, payout-и **не входять у MVP** (можуть бути заглушені або відкладені).

## 2.2 Інтерфейс (логічний)

```ts
type TokenSymbol = 'DAAR' | 'DAARION';

interface WalletService {
  getBalances(userId: string): Promise<Array<{ symbol: TokenSymbol; amount: string }>>;

  hasEnoughForDaoCreate(userId: string): Promise<boolean>;
  hasEnoughForVendorRegister(userId: string): Promise<boolean>;
  hasEnoughForPlatformCreate(userId: string): Promise<boolean>;
}
```

## 2.3 Інтеграція з API

Мапінг на `api.md`:

* `GET /api/v1/wallet/me` → `getBalances`
* `POST /api/v1/wallet/check-access` → використовує `hasEnough*`-методи

## 2.4 Залежності

* зовнішній або внутрішній модуль для читання ончейн-даних (або stub)
* PDP (на наступних фазах, якщо будуть складніші правила)

---

# 3. DAOFactory Service (MVP)

## 3.1 Відповідальність

* створення нових DAO (A3/A4)
* створення платформ (A2) — з маркуванням рівня та типу
* валідація вхідних параметрів
* виклик PDP для перевірки прав
* запис DAO у Registry

## 3.2 Інтерфейс (логічний)

```ts
interface CreateDaoInput {
  name: string;
  description?: string;
  type: 'public' | 'private';
  level: 'A3' | 'A4';
  settings?: Record<string, unknown>;
}

interface CreatePlatformInput {
  name: string;
  slug: string;
  description?: string;
  domain?: string; // 'energy' | 'food' | 'water' | ...
}

interface DaoFactoryService {
  createDao(userId: string, input: CreateDaoInput): Promise<{ daoId: string }>;
  createPlatform(userId: string, input: CreatePlatformInput): Promise<{ daoId: string }>;
}
```

## 3.3 Інтеграція з API

Мапінг на `api.md`:

* `POST /api/v1/dao` → `createDao`
* `POST /api/v1/platforms` → `createPlatform`

## 3.4 Залежності

* **Wallet Service** — перевірка наявності DAAR/DAARION
* **PDP Service** — `policy.dao.create`, `policy.platform.create`
* **Registry Service** — запис нового DAO / платформи

---

# 4. Registry Service (MVP)

## 4.1 Відповідальність

* зберігання інформації про всі DAO
* маркування DAO як платформи (A2) або MicroDAO (A3/A4)
* надання публічного каталогу DAO/платформ

## 4.2 Мінімальна модель DAO

```ts
interface DaoRecord {
  daoId: string;
  name: string;
  description?: string;
  level: 'A1' | 'A2' | 'A3' | 'A4';
  type: 'platform' | 'public' | 'private';
  parentDaoId?: string | null;
  federationMode: 'none' | 'member' | 'superdao';
  createdAt: string;
}
```

## 4.3 Інтерфейс (логічний)

```ts
interface RegistryService {
  saveDao(record: DaoRecord): Promise<void>;

  getDaoById(daoId: string): Promise<DaoRecord | null>;

  listDaos(filter?: { level?: string; type?: string }): Promise<DaoRecord[]>;

  listPlatforms(): Promise<DaoRecord[]>; // level A2, type = 'platform'
}
```

## 4.4 Інтеграція з API

Мапінг на `api.md`:

* `GET /api/v1/dao/{dao_id}` → `getDaoById`
* `GET /api/v1/dao` → `listDaos`
* `GET /api/v1/platforms` → `listPlatforms`

## 4.5 Залежності

* немає критичних зовнішніх залежностей (простий сервіс над БД)
* може використовувати PDP для фільтрації приватних DAO

---

# 5. PDP Service (MVP)

## 5.1 Відповідальність

* централізоване прийняття рішень про доступ
* інтерпретація політик із `pdp_access.md`
* надання простого API для інших сервісів

## 5.2 Основний інтерфейс

```ts
export type Decision = 'allow' | 'deny' | 'require-elevation';

interface PdpContext {
  userId?: string;
  daoId?: string;
  daoLevel?: 'A1' | 'A2' | 'A3' | 'A4';
  // додатковий контекст: ролі, баланси, стейкінг тощо
}

interface PdpService {
  check(policyId: string, resource: Record<string, unknown>, context: PdpContext): Promise<{
    decision: Decision;
    reason?: string;
  }>;
}
```

## 5.3 Приклади використання

### 5.3.1 DAOFactory → створення DAO

```ts
const res = await pdp.check('policy.dao.create', { type: 'dao' }, { userId, daoLevel: 'A3' });
if (res.decision !== 'allow') throw new Error('ACCESS_DENIED');
```

### 5.3.2 Vendor → реєстрація на платформі

```ts
const res = await pdp.check('policy.vendor.register', { platformId }, { userId, daoId: platformDaoId, daoLevel: 'A2' });
```

## 5.4 Інтеграція з API

Мапінг на `api.md`:

* `POST /api/v1/pdp/check` → обгортка над `PdpService.check` (діагностика/адмінки)

## 5.5 Залежності

* **Wallet Service** — для перевірки балансів
* **Registry Service** — для визначення рівня DAO
* джерело політик (конфіги/БД)

---

# 6. Потоки взаємодії (MVP)

## 6.1 Створення DAO (користувач → MicroDAO)

1. Frontend → `POST /api/v1/dao`
2. API → DAOFactory Service
3. DAOFactory → WalletService (`hasEnoughForDaoCreate`)
4. DAOFactory → PDP Service (`policy.dao.create`)
5. DAOFactory → Registry (`saveDao`)
6. Повернення `dao_id` користувачу

## 6.2 Створення платформи

1. Frontend → `POST /api/v1/platforms`
2. DAOFactory → WalletService (`hasEnoughForPlatformCreate`)
3. DAOFactory → PDP (`policy.platform.create`)
4. DAOFactory → Registry (`saveDao` із level=A2, type=platform)

## 6.3 Реєстрація вендора

1. Frontend → `POST /api/v1/platforms/{id}/vendors`
2. Service → PDP (`policy.vendor.register`)
3. Якщо `allow` → запис у БД

---

# 7. MVP Scope vs. Future Scope

## 7.1 Входить у MVP

* Wallet Service: лише читання балансів + прості перевірки
* DAOFactory: створення DAO/платформ
* Registry: читання/запис DAO, список платформ
* PDP: базові політики (див. `pdp_access.md`)

## 7.2 Поза рамками MVP (може бути додано пізніше)

* повні транзакції DAAR/DAARION
* стейкінг (on-chain інтеграція)
* payout-и й автоматичний розподіл винагород
* розширені політики PDP (rate-limits, time-based rules)
* audit trails на рівні подій (окремий сервіс)

---

# 8. Використання цього документа

Цей документ служить

* **для бекенд-розробників** — як точний опис того, які сервіси реалізувати й які інтерфейси їм дати;
* **для архітекторів** — як карта залежностей між Wallet, DAOFactory, Registry, PDP;
* **для фронтенду** — як звʼязок між API (`api.md`) і внутрішньою логікою.

Наступний крок після цього документа — створення каркасів сервісів у коді (наприклад, у `/services/wallet`, `/services/dao-factory`, `/services/registry`, `/services/pdp`).

---

## 9. Integration with Other Docs

Цей документ інтегрується з:

- `overview.md` — загальний огляд системи
- `microdao-architecture.md` — архітектура A1-A4
- `pdp_access.md` — PDP та система доступів
- `api.md` / `api-mvp.md` — API специфікації
- `superdao-federation.md` — SuperDAO та федерації
- `tokenomics/city-tokenomics.md` — токеноміка

---

## 10. Changelog

### v1.0.0 — 2024-11-14
- Початкова версія специфікації Core Services (MVP)
- Додано Wallet Service (читання балансів, перевірки доступу)
- Додано DAOFactory Service (створення DAO та платформ)
- Додано Registry Service (каталог DAO та платформ)
- Додано PDP Service (централізоване прийняття рішень)
- Додано потоки взаємодії між сервісами
- Додано розмежування MVP vs Future Scope

---

**Версія:** 1.0.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*


