# DAARION.city Platforms Catalog (MicroDAO)

Каталог платформ екосистеми DAARION.city

Цей документ містить каталог платформ екосистеми **DAARION.city**, які інтегруються з microdao, DAGI та Gift-економікою міста:

- опис домену кожної платформи;
- основні агентські модулі;
- ключі доступу (access keys + capabilities);
- Embassy-інтеграція;
- мінімальні флоу для MVP.

Це **живий документ** — при додаванні нових платформ/районів додаються нові записи.

---

## 1. Мета документа

Каталог платформ екосистеми **DAARION.city**, які інтегруються з microdao, DAGI та Gift-економікою міста:

- опис домену кожної платформи;
- основні агентські модулі;
- ключі доступу (access keys + capabilities);
- Embassy-інтеграція;
- мінімальні флоу для MVP.

Це **живий документ** — при додаванні нових платформ/районів додаються нові записи.

---

## 2. Структура запису про платформу

Для кожної платформи описуємо:

- `code` — короткий код (латиницею);
- `name` — назва;
- `domain` — предметна область;
- `owner` — хто курує (team/microDAO);
- `status` — idea / design / MVP / pilot / prod;
- основні **агентські ролі**;
- типи **access keys** і capabilities;
- Embassy-флоу (якщо є RWA/енергія/зовнішні мережі).

---

## 3. Перелік платформ

1. **DAARION Core**
2. **DAARWIZZ**
3. **GREENFOOD**
4. **Energy Union**
5. **Water Union**
6. **Essence Stream**

(інші додаються в наступних версіях: Atlas, DAARWIZZ verticals тощо).

---

## 4. DAARION Core

- `code`: `daarion_core`
- `name`: DAARION Core / Місто Дарів
- `domain`: ядро міста, Second Me, резидентство, токеноміка DAAR/DAARION, MJD.
- `owner`: DAARION DAO Core Team
- `status`: pilot → prod

### 4.1 Агентські модулі

- **Second Me Agent** — персональний цифровий двійник резидента.
- **Citizenship Agent** — керує резидентством, рівнями доступу, DAARION-статусом.
- **Gift Fabric Agent** — відстежує акти взаємодії й відгук міста (MJD).
- **Governance Agent** — DAO-процеси, пропозиції, голосування, політики.

### 4.2 Access keys & capabilities

Приклади capability-груп:

- `citizenship.status.view`
- `citizenship.level.upgrade`
- `gift.act.register`
- `governance.proposal.create`
- `governance.vote.cast`
- `governance.policy.manage` (лише для Guardian/Owner/DAO-агентів)

Embassy-ключі DAARION Core обмежені:

- `embassy.intent.read`
- `embassy.aggregate.metrics`

---

## 5. DAARWIZZ

- `code`: `daarwizz`
- `name`: DAARWIZZ — маршрутизатор агентів / планувальник Swarm-OS
- `domain`: оркестрація DAGI, роутинг запитів, multi-agent сценарії.
- `owner`: DAARION R&D Lab
- `status`: MVP / pilot

### 5.1 Агентські модулі

- **Router Agent** — розподіляє запити між моделями та агентами.
- **Planner Agent** — декомпозує задачі, запускає ланцюжки інструментів.
- **Observer/Telemetry Agent** — відстежує якість, латентність, бюджет.

### 5.2 Access keys & capabilities

- `router.invoke`
- `router.plan.run`
- `router.tool.call`
- `telemetry.events.write`
- `telemetry.events.read:aggregate`

Користувацькі microDAO отримують DAARWIZZ-keys:

- або через Wallet Agent (оплата DAAR / 1T);
- або через план Platformium.

---

## 6. GREENFOOD

- `code`: `greenfood`
- `name`: GREENFOOD — AI-ERP для крафтових виробників та кооперативів
- `domain`: склади, партії, логістика, кооперативні ланцюги постачання.
- `owner`: GREENFOOD microDAO
- `status`: design / MVP

### 6.1 Агентські модулі

- **Warehouse Agent** — облік партій/залишків.
- **Logistics Agent** — маршрути та хаби.
- **Accounting Agent** — автоматичні нарахування/розподіл по кооперативу.
- **Sales Agent** — інтеграція з маркетплейсами.
- **Community Coordinator Agent** — координація між учасниками спільноти.

### 6.2 Access keys & capabilities

Ключі типу:

- `platform.greenfood.inventory.view/update`
- `platform.greenfood.shipment.create`
- `platform.greenfood.coop.balance.view`
- `platform.greenfood.member.register`

Для інтеграції з microdao:

- public API-ключі для:
  - синхронізації задач Projects (`projects.task.sync`);
  - Co-Memory (звіти, накладні);
- Embassy Key для RWA:
  - `rwa.claim` (сертифікати продуктів);
  - `rwa.stock.update` (запаси на складах).

---

## 7. Energy Union

- `code`: `energy_union`
- `name`: Energy Union — енергетична платформа з токенізованими активами
- `domain`: енергетичні RWA, KWT/1T виплати, енергетичний бартер.
- `owner`: Energy Union microDAO / партнерські енергокомпанії
- `status`: pilot

### 7.1 Агентські модулі

- **Metering Agent** — читає лічильники генерації/споживання.
- **Oracle Agent** — агрегує дані, формує виплати KWT/1T.
- **Facility Agent** — агент об'єкта (сонячна станція, дата-центр).
- **Energy Market Agent** — узгоджує акти енергетичного дарообміну.

### 7.2 Access keys & capabilities

- `energy.asset.read`
- `energy.meter.read`
- `energy.meter.update` (лише для trusted oracles)
- `energy.payout.compute`
- `wallet.payout.view/claim`

Embassy-ключі:

- `embassy.energy.update`
- `embassy.rwa.claim` (сертифікати енергетичних часток).

---

## 8. Water Union

- `code`: `water_union`
- `name`: Water Union — платформа для управління водними ресурсами
- `domain`: моніторинг води, RWA на основі водних активів/інфраструктури.
- `owner`: Water Union microDAO / місцеві громади
- `status`: idea / early design

### 8.1 Агентські модулі

- **Sensor Agent** — збір даних з сенсорів (якість/об'єм води).
- **Infrastructure Agent** — стан насосів, резервуарів.
- **Community Water Agent** — координація доступу громад, планування ремонтів.
- **Water RWA Agent** — сертифікати дару на водні ініціативи.

### 8.2 Access keys & capabilities

- `water.sensor.read`
- `water.sensor.update`
- `water.infrastructure.view`
- `rwa.water.claim`

Embassy:

- інтеграція з місцевими дата-центрами/IoT-шлюзами;
- прев'язка водних RWA до DAAR/DAARION через Gift Fabric.

---

## 9. Essence Stream

- `code`: `essence_stream`
- `name`: Essence Stream — платформа для культурних/освітніх ініціатив
- `domain`: курси, події, контент-стріми, творчі квести.
- `owner`: Essence Stream microDAO / культурні куратори
- `status`: idea / design

### 9.1 Агентські модулі

- **Curator Agent** — формує програми, добирає контент.
- **Event Agent** — події, квитки (як сертифікати дару).
- **Mentor Agent** — персоналізовані навчальні траєкторії.
- **Quest Agent** — квести/ігрові сценарії в DAARION.city.

### 9.2 Access keys & capabilities

- `essence.event.publish`
- `essence.event.register`
- `essence.course.view`
- `essence.quest.progress.update`

Embassy:

- RWA-сертифікати на участь у подіях (офлайн/онлайн);
- взаємодія з Gift Fabric для Міського Джерела Дарів.

---

## 10. Зв'язок платформ з microdao

### 10.1 Common pattern

Кожна платформа:

1. Має **свій microDAO** (team/ком'юніті) у microdao-месенджері.
2. Має набір **public channel(s)** для публічних оголошень/стрімів.
3. Використовує:
   - Projects (проекти/ланцюги постачання/ініціативи),
   - Co-Memory (документи, договори, технічні описи),
   - приватних агентів (Router, Domain-агенти).

### 10.2 Типи інтеграцій

- **Embedded microdao**: платформа має вкладку «Community/Chat», що відкриває microdao-інтерфейс її microDAO.
- **API integration**: платформа викликає microdao API (`/projects`, `/tasks`, `/wallet`, `/governance`) з власними access keys.
- **Embassy**: для RWA/енергетики/сертифікатів дару використовується Embassy Module.

---

## 10. Подальший розвиток каталогу

Наступні версії документа:

- додаємо нові платформи (Atlas, DAARWIZZ вертикалі, інші city-райони);
- деталізуємо capability-матриці (по аналогії з RBAC-таблицями);
- додаємо mapping до конкретних onchain-контрактів (RWA, EnergyNFT, DAAR/DAARION).

---

## 11. Мапінг платформ на Data Model (таблиці)

1. Усі платформи (DAARION Core, DAARWIZZ, GREENFOOD, Energy Union, Water Union, Essence Stream):

- представлені як `teams`:

```sql
create table teams (
  id text primary key,          -- t_...
  name text not null,
  slug text unique not null,
  mode text not null check (mode in ('public','confidential')),
  created_at timestamptz not null default now()
);
```

- учасники платформ → `team_members`:
  - роль (`Owner`, `Guardian`, `Member`);
  - `viewer_type` (`reader`, `commenter`, `contributor`).

2. DAARION Core:

- працює поверх:
  - `users`, `teams`, `team_members`,
  - `channels`, `messages`, `followups`,
  - `projects`, `tasks`, `docs`, `meetings`,
  - `wallets`, `staking_ringk`, `payouts`,
  - `proposals` (governance).

3. GREENFOOD:

- свій microDAO → одна або кілька сутностей `teams`;
- бізнес-процеси відображаються як:
  - `projects` (кооперативні програми, постачання);
  - `tasks` (відвантаження, контроль партій);
  - RWA-складські залишки → через `rwa_inventory` (із подією `rwa.inventory.updated`).

4. Energy Union:

- об'єкти енергетики — як `projects`/`tasks` + RWA-записи в `rwa_inventory`;
- зв'язок із виплатами — через `staking_ringk` та `payouts`.

5. Water Union / Essence Stream:

- Water Union: сенсори/інфраструктура агрегуються як задачі/проєкти, а водні активи — RWA-записи;
- Essence Stream: події/курси — `projects` + `meetings`/`docs`, участь резидентів потрапляє в Gift Fabric через події.

---

## 12. Мапінг платформ на Event Catalog (topics)

1. DAARION Core:

- використовує базові topics з `topic.enum`:
  - `"chat.message.created"`, `"chat.message.edited"`, `"chat.message.deleted"`
  - `"followup.created"`, `"followup.updated"`
  - `"project.created"`, `"task.created"`, `"task.updated"`
  - `"agent.run.started"`, `"agent.run.completed"`
  - `"staking.locked"`, `"payout.generated"`
  - `"rwa.inventory.updated"`
  - `"governance.proposal.created"`, `"vote.cast"`
  - `"audit.event"`

2. GREENFOOD:

- доменні події інвентарю/замовлень мапляться на:
  - `"rwa.inventory.updated"` (оновлення складів/партій);
  - `"project.created"` / `"task.created"` для логістичних ланцюжків.

3. Energy Union:

- енергетичні вимірювання та оракули:
  - `"oracle.reading.published"` — агреговані дані з лічильників;
  - далі → `"staking.locked"` / `"payout.generated"` для KWT/1T.

4. Water Union:

- якість/об'єм води → `"oracle.reading.published"` з типом `water`;
- видані водні сертифікати → `"rwa.inventory.updated"`;
- надалі можуть генерувати `"payout.generated"`, якщо є пов'язаний токенізований потік.

5. Essence Stream:

- участь у подіях/квестах платформи підписується як:
  - `"reward.issued"` (Gift Fabric),
  - `"audit.event"` для важливих соціальних/освітніх актів.

---

## 13. Завдання для Cursor

```text
You are a senior full-stack engineer. Implement platform integration patterns using:
- DAARION_city_platforms_catalog.md
- 24_access_keys_capabilities_system.md
- DAARION_city_integration.md
- 05_coding_standards.md

Tasks:
1) Create platform registry in database (platforms table).
2) Implement platform-specific capability bundles.
3) Create Embassy Module integration for RWA platforms (Energy Union, GREENFOOD).
4) Add platform switcher UI in microDAO interface.
5) Implement platform-specific agent modules (stub for MVP).

Output:
- list of modified files
- diff
- summary
```

---

## 14. Результат

Після впровадження каталогу:

- чітке розуміння всіх платформ екосистеми DAARION.city;
- стандартизовані патерни інтеграції;
- готовність до додавання нових платформ;
- інтеграція з Access Keys & Capabilities System.

