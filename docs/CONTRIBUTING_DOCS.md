# Contributing to Documentation

Правила роботи з документацією проєкту MicroDAO / DAARION.city.

---

## Документація: джерела правди

### Токеноміка

- **Актуальна токеноміка міста:** `docs/tokenomics/city-tokenomics.md`
- Усі файли з токеноміки в `docs/_archive/` є застарілими і використовуються лише як історичні чернетки.
- При будь-яких змінах токеноміки редагуємо тільки `city-tokenomics.md` і оновлюємо версію у frontmatter.

### Архітектура

- **Основна архітектура:** `docs/cursor/02_architecture_basics.md`
- **Внутрішні сервіси:** `docs/cursor/34_internal_services_architecture.md`
- **Service Mesh:** `docs/cursor/35_microdao_service_mesh_design.md`

### API

- **API контракти:** `docs/cursor/03_api_core_snapshot.md`

### Агенти

- **Agent Runtime Core:** `docs/cursor/12_agent_runtime_core.md`
- **Agent Memory System:** `docs/cursor/13_agent_memory_system.md`
- **Private Agents Lifecycle:** `docs/cursor/38_private_agents_lifecycle_and_management.md`

### Інтеграція

- **DAARION.city Integration:** `docs/cursor/DAARION_city_integration.md`
- **Website Integration:** `docs/cursor/50_daarion_city_website_integration.md`
- **Integration Guide:** `docs/integration-daarion.md`

---

## Правила версіонування

### Канонічні документи

Канонічні документи мають frontmatter з версією:

```yaml
---
title: Document Title
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---
```

### Оновлення документів

1. Редагуєш **той самий** файл (не створюєш новий).
2. Змінюєш версію й дату у frontmatter:
   ```yaml
   version: 1.1.0
   last_updated: 2024-12-01
   ```
3. Додаєш запис у секцію Changelog внизу документа.

### Legacy документи

- Старі версії документів переносяться в `docs/_archive/`.
- На початку legacy файлу додається помітка:
  ```markdown
  > **LEGACY:** Цей документ застарів. Актуальна версія: `docs/path/to/canonical.md`.
  ```

---

## Структура документації

```
docs/
├── cursor/              # Детальні технічні специфікації
├── tokenomics/          # Токеноміка (канонічний: city-tokenomics.md)
├── _archive/            # Застарілі документи
├── integration-daarion.md  # Консолідований гайд інтеграції
├── CONTRIBUTING_DOCS.md   # Цей файл
└── README.md            # Загальний огляд документації
```

---

## Як працювати з Cursor

### При створенні промптів

Завжди вказуй канонічні документи:

> Використовуй `docs/tokenomics/city-tokenomics.md` як єдине актуальне джерело токеноміки.

> Використовуй `docs/cursor/50_daarion_city_website_integration.md` для інтеграції з сайтом.

### При оновленні документації

1. Знайди канонічний документ (перевір frontmatter на `status: canonical`).
2. Онови версію у frontmatter.
3. Додай запис у Changelog.
4. Якщо є legacy версії — перенеси їх в `_archive/`.

---

## Приклади

### Правильно

```markdown
# Оновлення токеноміки
- Редагуємо `docs/tokenomics/city-tokenomics.md`
- Оновлюємо версію: 1.0.0 → 1.1.0
- Додаємо запис у Changelog
```

### Неправильно

```markdown
# Створення нового файлу
- ❌ НЕ створюємо `city-tokenomics-v2.md`
- ❌ НЕ створюємо `city-tokenomics-updated.md`
- ✅ Редагуємо існуючий `city-tokenomics.md`
```

---

## Питання?

Якщо не впевнений, який документ є канонічним:

1. Перевір frontmatter на `status: canonical`.
2. Перевір `docs/README.md` — там вказані канонічні документи.
3. Перевір `docs/CONTRIBUTING_DOCS.md` (цей файл).

---

**Останнє оновлення:** 2024-11-14


