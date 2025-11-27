# 🚀 Deployment Strategy: MVP + Multimodal Integration

**Версія:** 1.0.0  
**Дата:** 25 листопада 2025  
**Мета:** Безпечна інтеграція MVP (Phase 1-3) та Multimodal системи

---

## 🎯 Стратегічний Підхід

### Принцип: **Decoupled Deployment**

MVP та Multimodal — **окремі системи**, які інтегруються поступово.

```
PHASE 1: MVP Deploy (Phase 1-3) ✅ ЗАРАЗ
  ├── Agents Service
  ├── City Service
  ├── Second Me
  └── MicroDAO Service

PHASE 2: Multimodal Preparation ⏳ НАСТУПНИЙ КРОК
  ├── Router v2.0 (multimodal support)
  ├── Telegram Gateway Enhanced
  └── API унификація

PHASE 3: Multimodal Deployment 🔮 ПОТІМ
  ├── STT Service
  ├── OCR Service
  ├── Web Search
  └── Vector DB

PHASE 4: Full Integration 🔮 ФІНАЛ
  └── MVP ↔ Multimodal ↔ DAGI Stack
```

---

## 📊 Поточна Ситуація

### ✅ Готово:
- MVP код (Phase 1-3) готовий на НОДА2
- Міграції БД 007-010 створені
- Docker Compose з MVP сервісами
- Multimodal сервіси працюють на НОДА2 (STT, OCR, Web Search, Vector DB)

### ⚠️ В процесі:
- Router v1.1.0 multimodal API (в доках, поки не deployed)
- Telegram Gateway Enhanced (в доках, поки не deployed)
- Multimodal документація завантажується

### ❓ Невідомо:
- Стан production БД на НОДА1
- Чи є конфлікти в існуючому Router/Gateway
- Повний обсяг змін в multimodal системі

---

## 🎯 Рекомендована Послідовність

### **ЗАРАЗ: Phase 1 — MVP Deploy (WITHOUT Multimodal)**

**Що робимо:**
1. Deploy MVP сервісів (Agents, City, Second Me, MicroDAO) на НОДА1
2. Інтегрувати з **існуючим** Router/Gateway (без multimodal)
3. Перевірити що все працює стабільно
4. Моніторити 48 годин

**Що НЕ робимо:**
- ❌ Не чіпаємо Router (залишаємо поточну версію)
- ❌ Не змінюємо Telegram Gateway
- ❌ Не інтегруємо STT/OCR/Web Search
- ❌ Не переносимо multimodal сервіси на НОДА1

**Переваги:**
- ✅ Мінімальний ризик
- ✅ MVP працює незалежно
- ✅ Легко rollback
- ✅ Існуюча система не постраждає

**Документація:**
- `DEPLOY_MVP_NODE1_COMPREHENSIVE_ANALYSIS.md` (створено вище)

---

### **НАСТУПНИЙ КРОК: Phase 2 — Multimodal Preparation**

**Коли:** Після успішного MVP deployment + 48 годин стабільності

**Що робимо:**
1. **Аналіз multimodal документації** (коли завантажиться)
2. **Створення Router v2.0** з multimodal API
3. **Створення unified API** для STT/OCR/Web Search/Vector DB
4. **Тестування на НОДА2** (dev environment)
5. **Документування змін** та API contracts

**Що створюємо:**
- `services/router-v2/` (новий Router з multimodal)
- `services/multimodal-gateway/` (unified API для всіх multimodal)
- `docs/MULTIMODAL_API_SPEC.md` (API специфікація)
- `docs/ROUTER_V2_MIGRATION.md` (план міграції)

**Критерії готовності:**
- [ ] Router v2.0 працює на НОДА2
- [ ] Multimodal Gateway працює на НОДА2
- [ ] Всі API тести пройдені
- [ ] Документація повна
- [ ] Rollback plan готовий

---

### **ПОТІМ: Phase 3 — Multimodal Deployment на НОДА1**

**Коли:** Після Phase 2 + approval

**Що робимо:**
1. **Deploy Router v2.0** на НОДА1 (side-by-side з v1.0)
2. **Deploy Multimodal Gateway** на НОДА1
3. **Перенести multimodal сервіси** з НОДА2 на НОДА1 (або залишити розподіленими)
4. **Поступове переключення** (canary deployment)
5. **Моніторинг + rollback готовність**

**Етапи переключення:**
1. 10% трафіку → Router v2.0 (1 година)
2. 50% трафіку → Router v2.0 (6 годин)
3. 100% трафіку → Router v2.0 (24 години)
4. Видалити Router v1.0 (якщо стабільно)

**Rollback:**
- Переключити трафік назад на Router v1.0
- Зупинити multimodal сервіси
- Система повертається до Phase 1 стану

---

### **ФІНАЛ: Phase 4 — Full Integration**

**Коли:** Після Phase 3 + 1 тиждень стабільності

**Що робимо:**
1. **Інтегрувати MVP ↔ Multimodal:**
   - City Service → Web Search (для пошуку в кімнатах)
   - Agents Service → STT/OCR (для voice/image commands)
   - Second Me → Vector DB (для semantic memory)

2. **Telegram Gateway Enhanced:**
   - Voice messages → STT → Agents
   - Photos → OCR/Vision → Agents
   - Documents → Parser → Knowledge Base

3. **Frontend Enhancement:**
   - Upload voice → STT
   - Upload image → OCR/Vision
   - Semantic search в City

**Acceptance Criteria:**
- [ ] Telegram bot приймає voice/photo/documents
- [ ] Frontend має multimodal UI
- [ ] City має semantic search
- [ ] Second Me використовує Vector DB
- [ ] All services stable 99.9% uptime

---

## 🔍 Dependency Analysis

### MVP → Multimodal Dependencies

**Agents Service:**
- **Потребує:** LLM Proxy (існуючий), NATS (існуючий)
- **Може використати:** STT (опційно), OCR (опційно), Vector DB (опційно)
- **Блокер:** Немає

**City Service:**
- **Потребує:** PostgreSQL (існуючий), Redis (існуючий), NATS (існуючий)
- **Може використати:** Web Search (опційно для пошуку), Vector DB (опційно)
- **Блокер:** Немає

**Second Me:**
- **Потребує:** Agents Service (буде deployed), PostgreSQL
- **Може використати:** Vector DB (для довгої пам'яті)
- **Блокер:** Agents Service (тому Second Me в Phase 3)

**MicroDAO Service:**
- **Потребує:** PostgreSQL, Auth Service (існуючий)
- **Може використати:** DAO Service (існуючий, опційно)
- **Блокер:** Немає

### Multimodal → Infrastructure Dependencies

**Router v2.0:**
- **Потребує:** Multimodal Gateway, LLM Proxy, існуючий Router v1.0 (для fallback)
- **Блокер:** Multimodal Gateway має бути готовий

**Telegram Gateway Enhanced:**
- **Потребує:** Router v2.0, STT Service, OCR Service
- **Блокер:** Router v2.0

**STT/OCR/Web Search/Vector DB:**
- **Потребує:** Тільки базову інфраструктуру (Docker, Network)
- **Блокер:** Немає (можуть працювати автономно)

---

## 🚨 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **MVP deployment breaks existing DAGI** | Low | High | Staged deployment, health checks, rollback |
| **DB migrations fail** | Medium | High | Backup before, test on staging, rollback SQL |
| **Router v2.0 не сумісний з v1.0** | Medium | Medium | Side-by-side deployment, gradual switch |
| **Multimodal сервіси споживають багато ресурсів** | High | Medium | Start on NODE2, monitor, scale on NODE1 |
| **Nginx config помилка** | Low | High | Test config, backup old, gradual reload |
| **Network issues між NODE1 ↔ NODE2** | Medium | Low | Fallback to local, health checks |

---

## 📈 Monitoring Strategy

### Key Metrics (для кожної Phase)

**Phase 1 (MVP):**
```
- http_requests_total{service="agents"}
- http_requests_total{service="city"}
- active_connections{service="city"}
- db_connections{service="agents"}
- websocket_connections{service="city"}
```

**Phase 3 (Multimodal):**
```
- multimodal_requests_total{type="stt"}
- multimodal_requests_total{type="ocr"}
- multimodal_latency_seconds{type="web_search"}
- router_v2_requests_total
- router_v2_fallback_total (до v1.0)
```

**Alerts:**
```yaml
- name: MVP Services Down
  expr: up{service=~"agents|city|secondme"} == 0
  duration: 2m

- name: High Latency
  expr: http_request_duration_seconds{quantile="0.95"} > 5
  duration: 5m

- name: Router Fallback Rate High
  expr: rate(router_v2_fallback_total[5m]) > 0.1
  duration: 5m
```

---

## 🎯 Decision Points

### Після Phase 1 (MVP Deploy):

**Питання:** Чи готові до Phase 2?

**Критерії:**
- [ ] MVP сервіси healthy 48 годин без перерв
- [ ] Немає критичних помилок в логах
- [ ] Existing DAGI Stack працює стабільно
- [ ] Performance metrics в нормі
- [ ] Multimodal документація повністю завантажена

**Якщо НІ → зупинитися, debugати, стабілізувати**

---

### Після Phase 2 (Multimodal Prep):

**Питання:** Чи готові deploy multimodal на production?

**Критерії:**
- [ ] Router v2.0 протестований на NODE2
- [ ] API contracts задокументовані
- [ ] Performance тести пройдені
- [ ] Rollback plan готовий
- [ ] Team готова до deployment

**Якщо НІ → продовжити тестування на NODE2**

---

### Після Phase 3 (Multimodal Deploy):

**Питання:** Чи готові до Full Integration?

**Критерії:**
- [ ] Multimodal сервіси stable 1 тиждень
- [ ] Router v2.0 обробляє 100% без fallback
- [ ] Resource usage прийнятний
- [ ] No regressions в MVP або DAGI

**Якщо НІ → optimize, tune, monitor**

---

## 📝 Execution Plan Summary

### **ЦЯ НЕДІЛЯ (Week 48):**
- ✅ MVP Deploy на НОДА1 (Phase 1)
- ✅ Smoke tests
- 📊 Monitor 48 годин

### **НАСТУПНИЙ ТИЖДЕНЬ (Week 49):**
- 📖 Аналіз multimodal документації (коли завантажиться)
- 🔧 Створення Router v2.0 (Phase 2)
- 🧪 Тестування на НОДА2

### **ТИЖДЕНЬ 50:**
- 🚀 Multimodal Deploy на НОДА1 (Phase 3)
- 📊 Canary deployment (10% → 50% → 100%)

### **ТИЖДЕНЬ 51-52:**
- 🔗 Full Integration (Phase 4)
- 📈 Performance tuning
- 📝 Documentation updates

---

## ✅ Success Criteria (Загальні)

**MVP+Multimodal вважається успішно deployed якщо:**

1. ✅ Всі MVP сервіси працюють стабільно
2. ✅ Multimodal сервіси інтегровані
3. ✅ Router v2.0 обробляє всі типи запитів
4. ✅ Telegram bot приймає voice/photo/text
5. ✅ Frontend має multimodal UI
6. ✅ Uptime > 99.5% за останні 7 днів
7. ✅ Немає критичних issues
8. ✅ Performance metrics в SLA
9. ✅ Документація актуальна
10. ✅ Team може підтримувати систему

---

## 🔮 Long-term Vision

### Q1 2026: Distributed Architecture
- NODE1 (Production) — MVP + Multimodal
- NODE2 (Dev + AI Lab) — Experimental models
- NODE3 (Federation) — Matrix + City Federation

### Q2 2026: Auto-scaling
- Kubernetes deployment
- Horizontal Pod Autoscaling
- Multi-region (EU + US)

### Q3 2026: Advanced AI
- Multi-agent orchestration
- Chain-of-thought reasoning
- Long-term memory (Vector DB clusters)

---

**Документ створено:** Cursor AI Assistant  
**Для проєкту:** MicroDAO DAARION  
**Останнє оновлення:** 2025-11-25  
**Статус:** Ready for Execution — Phase 1 (MVP Deploy)

