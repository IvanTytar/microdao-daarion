# DAARION_city_integration.md

DAARION.city як суперDAO над microDAO та інтеграція існуючих платформ

Цей документ описує, як:

1. DAARION.city розглядається як **міське superDAO**, побудоване на тих самих механізмах, що й microDAO.

2. DAARION.city є **реєстром мешканців** та "над-організацією", яка об'єднує microDAO.

3. Існуючі проєкти (наприклад, **greenfood.live**, **EnergyUnion**) стають **розвиненими microDAO-платформами**, а не окремими всесвітами.

Документ задає архітектурну модель і конкретні задачі для Cursor.

---

## 1. Модель: DAARION.city = microDAO типу "city" + SuperDAO над іншими microDAO

### 1.1. Розширення `teams` / `microdaos`

Базова сутність одна — `team`/`microdao`, але з типами:

```ts
type TeamType = "city" | "platform" | "community" | "guild" | "lab" | "personal";
```

Приклади:

* `DAARION.city` → `type = "city"` (city-level superDAO)
* `GreenFood` → `type = "platform"` (eco/food marketplace)
* `EnergyUnion` → `type = "platform"` (BioMiner + AI + DAO екосистема)
* Приватні microDAO → `type = "community"` або `personal`.

### 1.2. Ієрархія "місто → платформи → мікроDAO"

Додаткова таблиця:

```ts
city_links:
- id
- parent_team_id   // зазвичай DAARION.city team_id
- child_team_id    // microDAO або платформа
- relation_type    // "platform", "community", "guild", "adapter"
- created_at
```

Інтерпретація:

* `DAARION.city` як `parent_team_id` для:

  * платформ (GreenFood, EnergyUnion, інші платформи),
  * приватних microDAO, які бажають "приписатися" до міста.

---

## 2. Реєстр мешканців DAARION.city

DAARION.city — це також **місце реєстрації всіх мешканців**.

### 2.1. Модель користувача

```ts
users:
- id
- city_handle        // унікальний нік у DAARION.city
- display_name
- avatar_url
- created_at
```

### 2.2. Громадянство (citizenship)

```ts
citizenships:
- id
- user_id
- city_id            // team_id DAARION.city
- status: "active" | "pending" | "revoked"
- joined_at
```

### 2.3. Членство в microDAO / платформах

```ts
memberships:
- id
- user_id
- team_id            // будь-який microDAO (включно з платформами)
- role: "admin" | "member" | "guest"
- joined_at
```

DAARION.city у цьому сенсі — просто `team` із `type="city"`, де всі громадяни мають запис `citizenship`, а членство в платформах і microDAO моделюється через `memberships`.

---

## 3. DAARION.city як суперDAO: city-level агенти

DAARION.city має власний набір **city-level agentів**, які працюють поверх міських даних і child-microDAO:

* **City Governance Agent** — міські правила, дух міста.
* **City Registry Agent** — реєстр мешканців, громадянство.
* **City Bridges Agent** — зв'язки між city ↔ платформи ↔ microDAO.
* **City Co-Memory Agent** — загальноміський простір знань.

Ці агенти використовують ті самі механізми, що й агенти microDAO, але їх `team_id` = `DAARION.city`.

---

## 4. Перетворення існуючих платформ на microDAO

Мета: платформи **greenfood.live** та **EnergyUnion** стають microDAO-платформами в структурі DAARION.city.

### 4.1. GreenFood як microDAO-платформа

Факти про платформу:

* GreenFood — еко-система для невеликих виробників та переробників органічної й домашньої продукції та вимогливих покупців.
* Підтримка блокчейн-технологій та внутрішня бартерна криптовалюта DAAR.

#### Кроки перетворення GreenFood → microDAO:

1. **Створити запис `team`**:

   * `name = "GreenFood"`
   * `type = "platform"`
   * `slug = "greenfood"`

2. **Прив'язати до DAARION.city**:

   * `city_links.insert(parent_team_id = daarion_city_id, child_team_id = greenfood_id, relation_type = "platform")`

3. **Задати blueprint GreenFood**:

   * агентська конфігурація:

     * Marketplace/Orders Agent,
     * Producers & Buyers Agent,
     * Eco/Quality Knowledge Agent,
     * інтеграція з існуючим мобільним додатком / API (через Bridges Agent).

4. **Bridges / adapters**:

   * Connector до існуючого GreenFood backend:

     * products → проєкти/категорії/knowledge,
     * orders → tasks / workflows,
     * farmers → окремий тип учасників.

5. **DAAR-валюта як доступ**:

   * трактувати DAAR-токени як внутрішні "ключі доступу/бартерні одиниці" у Governance/Access, а не як фінансові активи.

### 4.2. EnergyUnion як microDAO-платформа

Факти про платформу:

* ENERGY UNION BioMiner = платформа, що поєднує чисту енергію, AI та DAO в одній екосистемі.
* BioMiner конвертує біомасу в електроенергію для дата-центрів та AI-лабів, токени відкривають доступ до енергії (kWt), AI-обчислень (1T) та carbon+.

#### Кроки перетворення EnergyUnion → microDAO:

1. **Створити `team`**:

   * `name = "EnergyUnion"`
   * `type = "platform"`
   * `slug = "energyunion"`

2. **Прив'язати до DAARION.city**:

   * `city_links.insert(parent_team_id = daarion_city_id, child_team_id = energyunion_id, relation_type = "platform")`

3. **Blueprint EnergyUnion**:

   * агенти:

     * Energy Sites & BioMiner Agent (облік енергії, біомодулі),
     * AI Power Agent (1T обчислення),
     * kWt / 1T / carbon+ access-keys інтегровані в Governance & Access (як символьні ключі ресурсу, не як фінансові інструменти).

4. **Bridges / adapters**:

   * Connector до energyunion.io / EnergyUnion.AI API:

     * energy production → knowledge/events,
     * access tokens → capability keys у microDAO,
     * DAO-логіка → DAO Agent (коли знадобиться).

---

## 5. City-level Co-Memory: загальні знання міста

DAARION.city має власний **Co-Memory**, побудований на основі модуля 17.

### 5.1. City Knowledge Spaces

Приклади city-spaces:

* `City.Ecology`
* `City.Energy`
* `City.Food`
* `City.Governance`

Кожна платформа-microDAO може:

* публікувати обрані факти/документи в City Co-Memory:

  * `publish_to_city_memory(team_id, space_id, fact_id/doc_id)`

* читати загальноміський контекст:

  * `get_city_knowledge(space_id, query)`.

### 5.2. Політики відкритості

Локальний Governance Agent платформи:

* визначає, які дані:

  * залишаються тільки в локальному Co-Memory,
  * можуть підніматися на рівень міста.

---

## 6. City Bridges: обмін подіями між DAARION.city і microDAO

### 6.1. Формат `city_event`

Спільний формат подій:

```ts
city_event: {
  id: string;
  source_team_id: string;    // хто ініціював (microDAO або платформа)
  target_team_id?: string;   // куди адресовано (optionally)
  type: string;              // "announcement", "project_update", "energy_event", "market_update", ...
  payload: Json;
  ts: string;
}
```

### 6.2. City Bridges Agent

Агент з `team_id = DAARION.city`:

* приймає `city_event` від microDAO,
* ретранслює (broadcast / специфічним платформам),
* взаємодіє з Attention Agent на міському рівні.

---

## 7. Governance: трирівнева модель правил

1. **City Governance (DAARION.city)**:

   * загальні принципи,
   * базові етичні стандарти,
   * міські ритуали узгодження.

2. **Platform Governance** (GreenFood, EnergyUnion):

   * правила конкретної платформи,
   * локальні символічні ключі доступу.

3. **Local microDAO Governance**:

   * правила конкретної спільноти/групи.

DAO Agent і Wallet Agent можуть зʼявитися пізніше на міському шарі; наразі достатньо моделювати правила як політики доступу й ритуали узгодження без необхідної on-chain реалізації.

---

## 8. UX-рівень: як користувач це відчуває

1. Користувач реєструється в DAARION.city → отримує:

   * міське громадянство,
   * city-profile.

2. У міському інтерфейсі:

   * секція "Платформи":

     * GreenFood, EnergyUnion, інші платформи → всі це microDAO типу `platform`;

   * секція "Мої microDAO":

     * приватні/ком'юніті DAO.

3. Клік по платформі (GreenFood / EnergyUnion):

   * відкривається Agent Hub цієї платформи (як microDAO),
   * зі своїми агентами, каналами, проєктами.

4. Зі свого приватного microDAO користувач може:

   * "Підключитися до платформи GreenFood":

     * створюється запис у `city_links` + налаштовуються Bridges + Governance/Access.

---

## 9. Задачі для Cursor (Implementation Plan)

### 9.1. Базова інтеграція DAARION.city як microDAO

1. Додати поле `type` у `teams`:

   * `"city" | "platform" | "community" | "guild" | "lab" | "personal"`.

2. Створити запис для DAARION.city:

   * `type = "city"`, `slug = "daarion"`.

3. Створити таблицю `city_links`:

   * parent/child team, relation_type.

### 9.2. Реєстр мешканців

1. Створити таблиці:

   * `citizenships` (user ↔ city),
   * `memberships` (user ↔ team).

2. Додати city-profile в UI:

   * список платформ-microDAO,
   * список власних microDAO.

### 9.3. Інтеграція платформ GreenFood та EnergyUnion

1. Створити `team` для GreenFood та EnergyUnion з `type="platform"`.

2. Створити `city_links` із `parent_team_id = daarion_city_id`.

3. Додати базові Agent Hub / Agent Cards для цих платформ.

4. Створити Bridges stubs:

   * `greenfood_connector_agent`,
   * `energyunion_connector_agent`,

     щоб пізніше інтегрувати їхні API (поки достатньо каркасу).

### 9.4. City Co-Memory та City Bridges

1. Створити city-level Knowledge Space (`City.Global`).

2. Додати API:

   * `POST /city/knowledge/publish`,
   * `POST /city/events`.

3. Реалізувати City Bridges Agent:

   * мінімально — логування `city_event`ів.

---

## 10. Інструкція для Cursor

```text
Use DAARION_city_integration.md together with:

- 12_agent_runtime_core.md
- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 17_comemory_knowledge_space.md
- 18_governance_access_agent.md
- 20_integrations_bridges_agent.md
- 22_operator_modes_and_system_agents.md
- 23_domains_wallet_dao_deepdive.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Goal:

Unify DAARION.city and all platforms as microDAO instances, with DAARION.city as a "city" type superDAO and GreenFood / EnergyUnion as "platform" type microDAO.

Implement in stages:

1) Team types + city_links hierarchy.

2) Citizen registry (citizenships, memberships).

3) DAARION.city as city-level microDAO with its own Agent Hub.

4) GreenFood and EnergyUnion as platform-type microDAO.

5) City Co-Memory and City Bridges minimal skeletons.

For each step:

- list changed files,
- show diff,
- provide a short summary.
```

---

**Готово.**  
Це **повна архітектура інтеграції DAARION.city з microDAO**, включаючи конкретні кроки перетворення GreenFood та EnergyUnion.
