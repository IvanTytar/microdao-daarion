---
title: SuperDAO Federation — Об'єднання та Роз'єднання MicroDAO
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---

# SuperDAO Federation — Об'єднання та Роз'єднання MicroDAO

**Цей документ формалізує модель SuperDAO, федерацій та механізмів об'єднання/роз'єднання MicroDAO у мережі DAARION.city.**

Весь DAO-ландшафт DAARION.city є деревом MicroDAO (A1–A4/F4). Механіка SuperDAO дозволяє:

* об'єднувати декілька DAO під спільне управління,
* створювати федеративні структури (SuperDAO ↔ MemberDAO),
* вільно від'єднуватись (дефедералізація),
* делегувати частину повноважень "наверх" або "вниз".

---

# 1. Основні поняття

## 1.1 SuperDAO

DAO, яке має дочірні DAO (`child_dao_ids[]`) і виконує роль центру федерації.

Ознаки:

* `federation_mode = superdao`
* може встановлювати політики для дочірніх DAO
* може надавати інфраструктурну підтримку/агентів/інструменти

Приклад:

* **DAARION.city (A1)** — кореневе SuperDAO
* Платформи A2 — можуть бути SuperDAO для A3 DAO

## 1.2 MemberDAO

DAO, яке підпорядковується SuperDAO, але зберігає автономність.

Ознаки:

* має `parent_dao_id`
* може мати власні політики, агентів, ролі
* може вийти з федерації

## 1.3 Federation Graph

Структура зв'язків між DAO.

Приклад дерева:

```
DAARION.city (A1)

 ├── Helion (A2)

 │     ├── SolarDAO (A3)

 │     └── GridWatch (A3)

 ├── GreenFood ERP (A2)

 │     └── AgroCoop DAO (A3)

 └── Soul (A2)

       └── Neighborhood DAO (A3)
```

## 1.4 FederationMode

```
none        → DAO працює самостійно

member      → DAO входить до складу SuperDAO

superdao    → DAO має дочірні DAO і формує федерацію
```

---

# 2. Модель даних (MetaDAO структура)

Мінімальний набір полів у таблиці DAO:

```json
{
  "dao_id": "string",
  "name": "string",
  "level": "A1 | A2 | A3 | A4",
  "parent_dao_id": "string | null",
  "child_dao_ids": ["string"],
  "federation_mode": "none | member | superdao",
  "policies": {},
  "agents": [],
  "settings": {}
}
```

---

# 3. Операції федерації

## 3.1 Join Federation (вступ DAO до SuperDAO)

**Сценарій:** DAO вирішує приєднатися до SuperDAO.

### Умови:

* обране SuperDAO повинно мати `federation_mode = superdao`
* DAO має бути A3 або A4 (винятки для A2 — за правилами A1)

### Алгоритм:

1. `PDP.check(policy.federation.join)`
2. DAO встановлює `parent_dao_id = superdao_id`
3. SuperDAO додає DAO до `child_dao_ids[]`
4. DAGI Registry синхронізує агентні дозволи

---

## 3.2 Leave Federation (вихід DAO з SuperDAO)

**Сценарій:** DAO хоче стати незалежним.

### Умови:

* дозвіл Owner DAO
* відсутні активні критичні зобовʼязання перед SuperDAO

### Алгоритм:

1. `PDP.check(policy.federation.leave)`
2. DAO встановлює `parent_dao_id = null`
3. SuperDAO видаляє DAO з `child_dao_ids[]`
4. DAGI Registry обмежує delegations

---

## 3.3 Create SuperDAO (DAO стає SuperDAO)

Будь-яке DAO може стати SuperDAO, якщо воно приносить структуру під себе.

### Умови:

* DAO має ≥ 1 дочірнє DAO
* Owner обирає тип: `federation_mode = superdao`

---

## 3.4 Dissolve SuperDAO (розформування федерації)

**Сценарій:** SuperDAO розпускає федерацію.

### Алгоритм:

1. `PDP.check(policy.federation.dissolve)`
2. Всі `child_dao_ids[]` переходять у `parent_dao_id = null`
3. SuperDAO отримує режим `federation_mode = none`

---

# 4. Ролі в федерації

Федерація вводить додаткові ролі:

## 4.1 SuperDAO Admin

* керує federated-політиками
* може делегувати агентів вниз по структурі

## 4.2 Federation Member Admin

* керує власним DAO
* приймає federated-політики, але може перевизначати частину

## 4.3 Federation Observer

* читає структуру, але не управляє

---

# 5. Політики федерації (PDP)

## 5.1 policy.federation.join

```
allow: user.role == owner AND target.federation_mode == superdao
```

## 5.2 policy.federation.leave

```
allow: user.role == owner
```

## 5.3 policy.federation.create-superdao

```
allow: user.role == owner AND dao.child_count >= 1
```

## 5.4 policy.federation.dissolve

```
allow: user.role == owner AND dao.level != A1
```

*A1 не може бути розформовано — це корінь міста.*

---

# 6. Взаємодія з агентами

Федерація дозволяє делегувати агентів із SuperDAO вниз:

### Приклади:

* A1 (DAARWIZZ) може давати обмежені функції платформам A2.
* A2-платформи можуть давати community-агентам A3 частину можливостей (наприклад, аналітику, інтеграції).

### Принцип:

* Дозволи йдуть **зверху вниз**, але ніколи **знизу вверх**.
* A3/A4 не можуть впливати на A1/A2.

---

# 7. Взаємодія з токеномікою

Федерація не змінює фундаментальні правила доступу.

Але SuperDAO може:

* встановлювати локальні комісії
* вимагати DAAR або DAARION для участі в підфедерації
* давати знижки або преференції учасникам федерації

---

# 8. Публічні та приватні федерації

## 8.1 Публічна федерація (A1 → A2 → A3)

* частина дерева видима у каталозі DAARION.city
* DAO можуть добровільно приєднуватися

## 8.2 Приватна федерація (A4 ↔ A4)

* не показується публічно
* власні правила
* може будуватися для бізнесів, клубів, дослідницьких груп

---

# 9. Використання цього документа

Цей документ потрібен для:

* моделювання дерева MicroDAO
* проєктування Admin Console (розділ Federation)
* впровадження PDP-політок
* побудови майбутньої механіки федерацій у DAOFactory

Федерація — це ключова функція децентралізованого міста: вона дозволяє DAO організовуватися в більші структури без втрати автономності.

---

## 10. Integration with Other Docs

Цей документ інтегрується з:

- `microdao-architecture.md` — архітектура A1-A4
- `pdp_access.md` — PDP та система доступів
- `agents.md` — агенти та їх права
- `microdao-admin-console.md` — адмін-панель
- `api.md` — API для федерацій

---

## 11. Changelog

### v1.0.0 — 2024-11-14
- Початкова версія специфікації SuperDAO Federation
- Додано модель SuperDAO/MemberDAO
- Додано операції: join, leave, create, dissolve
- Додано ролі в федерації
- Додано PDP-політики для федерацій
- Додано взаємодію з агентами та токеномікою

---

**Версія:** 1.0.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*


