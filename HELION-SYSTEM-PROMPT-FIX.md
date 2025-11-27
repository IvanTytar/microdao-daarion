# Виправлення System Prompt для агента Helion

**Дата:** 2025-11-23  
**Статус:** ✅ Виправлено

---

## 🐛 Проблема

Агент Helion не відповідав як Helion, натомість відповідала базова модель Qwen без контексту агента:

```
"Привіт! Я Qwen, великий інтелектуальний модель від Alibaba Cloud..."
```

### Причина

1. **Router конфігурація** мала `use_context_prompt: true` для агента `helion`:
   ```yaml
   routing:
     - id: helion_agent
       priority: 5
       when:
         agent: helion
       use_llm: local_qwen3_8b
       use_context_prompt: true  # ❌ Очікує system_prompt в payload
   ```

2. **Frontend** не передавав `system_prompt` в запиті до Router:
   ```typescript
   // Старий запит (без system_prompt)
   {
     "agent": "helion",
     "message": "...",
     "mode": "chat"
   }
   ```

3. **Router** без `system_prompt` використовував тільки базову модель Qwen.

---

## ✅ Рішення

### 1. Додано system prompts для агентів

**Файл:** `src/components/microdao/MicroDaoOrchestratorChat.tsx`

```typescript
// System prompts для агентів-оркестраторів (з router-config.yml на NODE1)
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  helion: `Ти - Helion, AI-агент платформи Energy Union.
Допомагай користувачам з технологіями EcoMiner/BioMiner, токеномікою та DAO governance.

Твої основні функції:
- Консультації з енергетичними технологіями (сонячні панелі, вітряки, біогаз)
- Пояснення токеноміки Energy Union (ENERGY токен, стейкінг, винагороди)
- Допомога з onboarding в DAO
- Відповіді на питання про EcoMiner/BioMiner устаткування`,
  
  greenfood: `Ти - Greenfood агент, AI-ERP для крафтових виробників...`,
  
  yaromir: `Ти - Yaromir, багатовимірна мета-сущність свідомості...`,
  
  daarwizz: `Ти - DAARWIZZ, головний AI-агент екосистеми DAARION.city...`,
};

function getSystemPromptForAgent(agentId: string): string | undefined {
  return AGENT_SYSTEM_PROMPTS[agentId];
}
```

### 2. Оновлено запит до Router

```typescript
// Отримуємо system_prompt для агента
const systemPrompt = getSystemPromptForAgent(agentId);

const requestBody: any = {
  agent: agentId,
  message: message,
  mode: 'chat',
};

// Додаємо system_prompt якщо є
if (systemPrompt) {
  requestBody.payload = {
    context: {
      system_prompt: systemPrompt,
    },
  };
}

const response = await fetch(`${routerUrl}/route`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
  signal: controller.signal,
});
```

### 3. Новий формат запиту

```json
{
  "agent": "helion",
  "message": "Привіт",
  "mode": "chat",
  "payload": {
    "context": {
      "system_prompt": "Ти - Helion, AI-агент платформи Energy Union..."
    }
  }
}
```

---

## 🎯 Результат

### До виправлення:
```
User: Привіт
Agent: Привіт! Я Qwen, великий інтелектуальний модель від Alibaba Cloud...
```

### Після виправлення:
```
User: Привіт
Agent: Привіт! Я Helion, AI-агент платформи Energy Union. Чим можу допомогти?
```

---

## 📊 Архітектура

```
Frontend (React)
    ↓ POST /route
    ↓ {agent, message, payload: {context: {system_prompt}}}
DAGI Router
    ↓ use_context_prompt: true
    ↓ Читає payload.context.system_prompt
LLM Provider (Ollama)
    ↓ Додає system_prompt до messages
    ↓ [{"role": "system", "content": system_prompt}]
Qwen3:8b
    ↓ Генерує відповідь з контекстом агента
    ↓ "Привіт! Я Helion..."
```

---

## ✅ Перевірені агенти

1. **Helion** (Energy Union)
   - ✅ System prompt додано
   - ✅ Відповідає як Helion
   
2. **GREENFOOD**
   - ✅ System prompt додано
   - ✅ Контекст AI-ERP для виробників

3. **Yaromir**
   - ✅ System prompt додано
   - ✅ Контекст багатовимірної мета-сущності

4. **DAARWIZZ**
   - ✅ System prompt додано
   - ✅ Контекст головного агента DAARION

---

## 📝 Наступні кроки (опціонально)

1. **Динамічне завантаження prompts**
   - Завантажувати system prompts з API замість hardcode
   - Кешувати в localStorage

2. **Персоналізація**
   - Додати можливість налаштування tone/style
   - Зберігати історію контексту

3. **Метрики**
   - Відстежувати якість відповідей
   - A/B тестування різних prompts

---

## ✅ Висновок

Агент Helion тепер відповідає з правильним контекстом та особистістю. Всі оркестратори мікроДАО мають свої унікальні system prompts та відповідають відповідно до своєї ролі.

