# 11 — LLM Integration Guide (MicroDAO)

Інтеграція ChatGPT / OpenAI / інших моделей у агентську систему MicroDAO

Цей документ описує:

- де і як підключити LLM,

- як організувати backend-виклики,

- як звʼязати агента з моделлю,

- як працює agent-first онбординг,

- як працює агентський чат,

- як працює еволюційна модель на основі LLM.

Документ орієнтований на Cursor + Node/TS backend.

---

# 1. Принцип інтеграції

Усі виклики до LLM здійснюються **на бекенді**, не з фронтенду.

Причини:

- безпека (ключ не світиться),

- стабільність,

- контроль ціни,

- можливість додавати кэшинг, rate-limits,

- можливість підміняти провайдерів (OpenAI → Anthropic → локальні моделі).

---

# 2. Високорівнева архітектура

```
Frontend (React SPA)
|
| POST /agents/{id}/chat
↓
Backend
├── agentsController.ts
├── llm/
│      ├── openaiClient.ts
│      ├── modelRouter.ts
│      └── prompts/
│             ├── system_agent.txt
│             └── system_onboarding.txt
|
↓
OpenAI API (або інша модель)
```

---

# 3. Структура директорій для LLM

Додайте на бекенд:

```
src/
llm/
openaiClient.ts
modelRouter.ts
prompts/
system_agent.txt
system_onboarding.txt
system_evolution.txt
```

- `openaiClient.ts` — клієнт OpenAI / GPT.

- `modelRouter.ts` — місце, де ти можеш вирішити, яку модель використовувати (gpt-4.1-mini, o3, claude тощо).

- `prompts/*.txt` — системні промпти для:

  - Agent Chat

  - Onboarding Guide Agent

  - Evolution Meta-Agent

---

# 4. Реалізація базового клієнта OpenAI

**Файл: `src/llm/openaiClient.ts`**

```ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function callLLM(messages: any[], model = "gpt-4.1-mini") {
  const res = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  });

  return res.choices[0]?.message?.content ?? "";
}
```

---

# 5. Model Router

**Файл: `src/llm/modelRouter.ts`**

```ts
export function pickModel(agentProfile: string) {
  switch (agentProfile) {
    case "technical":
      return "gpt-4.1";
    case "business":
      return "gpt-4.1-mini";
    case "creative":
      return "gpt-4o-mini";
    default:
      return "gpt-4.1-mini";
  }
}
```

У майбутньому це місце для:

* локальних моделей (Ollama, vLLM),
* кластеру DAGI,
* автоматичного підбору моделі.

---

# 6. Запит до LLM для агентського чату

**Файл: `src/controllers/agentsController.ts`**

```ts
import { callLLM } from "../llm/openaiClient";
import { pickModel } from "../llm/modelRouter";
import systemAgent from "../llm/prompts/system_agent.txt";

export async function chatWithAgent(req, res) {
  const { agentId } = req.params;
  const { messages } = req.body;

  const agent = await db.agent.find(agentId);

  const model = pickModel(agent.role);

  const llmMessages = [
    { role: "system", content: systemAgent },
    ...messages
  ];

  const reply = await callLLM(llmMessages, model);

  // зберегти останнє повідомлення як agent message
  await db.agentMessages.insert({
    agent_id: agentId,
    role: "assistant",
    body: reply
  });

  res.json({ reply });
}
```

---

# 7. Інтеграція з Agent Chat у фронтенді

**Файл: `api/agents.ts`**

```ts
export async function agentChat(agentId: string, messages: ChatMessage[]) {
  return api.post(`/agents/${agentId}/chat`, { messages });
}
```

**У `AgentChatWindow.tsx`:**

```ts
const onSend = async (text: string) => {
  addMessage({ role: "user", content: text });

  const response = await agentChat(agentId, [
    ...history,
    { role: "user", content: text }
  ]);

  addMessage({ role: "assistant", content: response.reply });
};
```

---

# 8. Agent-First Onboarding Integration

Використовує той самий LLM-клієнт, але з іншим системним промптом:

**`prompts/system_onboarding.txt`:**

```
You are MicroDAO Guide Agent.

Your job is to ask the user questions one-by-one to configure their microDAO.

NEVER skip steps. NEVER jump too far.

Be friendly, minimalistic and precise.
```

У онбордингу:

```ts
const reply = await callLLM([
  { role: "system", content: onboardingSystemPrompt },
  ...conversation
]);
```

Але state-machine керує реальними діями (API), LLM — тільки текстом.

---

# 9. Integration with Evolutionary Agent (09_evolutionary_agent.md)

Meta-Agent (self-review) використовує **ще один промпт**:

`prompts/system_evolution.txt`:

```
You are Meta-Agent responsible for analyzing logs of conversations.

Find mistakes, weak answers, missing rules, and propose improvements.

Always output JSON with `["type", "value", "explanation"]`.
```

Self-review:

```ts
const improvements = await callLLM([
  { role: "system", content: evolutionPrompt },
  { role: "user", content: JSON.stringify(conversationLog) }
]);
```

---

# 10. Як передавати пам'ять агента в LLM

У LLM-запит можна додати:

* `short-term memory` (останні X повідомлень)

* `long-term memory` (витяг з Co-Memory)

* `agent profile`

* інструкції агента (структура з DB)

Приклад у messages:

```ts
const llmMessages = [
  { role: "system", content: systemPrompt },
  { role: "assistant", content: "AGENT_PROFILE:" + JSON.stringify(agentProfile) },
  { role: "assistant", content: "MEMORY:" + JSON.stringify(memories) },
  ...history,
  { role: "user", content: question }
];
```

---

# 11. Безпека

* API key зберігати у `.env` на сервері.

* Ніколи не відправляти ключ у фронтенд.

* Додавати rate limit.

* Додавати аудит використання агента.

---

# 12. Кешування та оптимізація

## 12.1. Кешування відповідей

Для однакових запитів можна кешувати відповіді:

```ts
const cacheKey = hash(messages);
const cached = await cache.get(cacheKey);
if (cached) return cached;

const reply = await callLLM(messages);
await cache.set(cacheKey, reply, { ttl: 3600 });
return reply;
```

## 12.2. Streaming відповідей

Для кращого UX можна використовувати streaming:

```ts
const stream = await openai.chat.completions.create({
  model,
  messages,
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    res.write(content);
  }
}
```

## 12.3. Rate Limiting

Обмеження кількості запитів:

```ts
import rateLimit from "express-rate-limit";

const agentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 10, // 10 запитів на хвилину
  keyGenerator: (req) => req.user.id,
});
```

---

# 13. Альтернативні провайдери

## 13.1. Anthropic Claude

```ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function callClaude(messages: any[]) {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages,
  });
  
  return response.content[0].text;
}
```

## 13.2. Локальні моделі (Ollama)

```ts
export async function callOllama(messages: any[], model = "llama2") {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model,
      messages,
    }),
  });
  
  const data = await response.json();
  return data.message.content;
}
```

## 13.3. Уніфікований інтерфейс

```ts
interface LLMProvider {
  call(messages: any[], options?: any): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  async call(messages: any[], options?: any) {
    return callLLM(messages, options?.model);
  }
}

class AnthropicProvider implements LLMProvider {
  async call(messages: any[], options?: any) {
    return callClaude(messages);
  }
}

export function getLLMProvider(provider: string): LLMProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      return new OpenAIProvider();
  }
}
```

---

# 14. Обробка помилок

## 14.1. Retry Logic

```ts
async function callLLMWithRetry(
  messages: any[],
  model: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callLLM(messages, model);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // exponential backoff
    }
  }
  throw new Error("LLM call failed after retries");
}
```

## 14.2. Fallback моделі

```ts
async function callLLMWithFallback(messages: any[], primaryModel: string) {
  try {
    return await callLLM(messages, primaryModel);
  } catch (error) {
    console.warn(`Primary model failed, using fallback`);
    return await callLLM(messages, "gpt-3.5-turbo");
  }
}
```

---

# 15. Моніторинг та логування

## 15.1. Логування викликів

```ts
async function callLLM(messages: any[], model: string) {
  const startTime = Date.now();
  
  try {
    const reply = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
    });
    
    const duration = Date.now() - startTime;
    const tokens = reply.usage?.total_tokens || 0;
    
    logger.info("LLM call", {
      model,
      duration,
      tokens,
      cost: calculateCost(model, tokens),
    });
    
    return reply.choices[0]?.message?.content ?? "";
  } catch (error) {
    logger.error("LLM call failed", { model, error });
    throw error;
  }
}
```

## 15.2. Метрики

Відстежувати:

- кількість викликів на агента
- середній час відповіді
- витрати на токени
- частота помилок
- популярні моделі

---

# 16. Завдання для Cursor

```
You are a senior backend + frontend engineer.

Integrate OpenAI LLM into the MicroDAO Agents system using:

- 11_llm_integration.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Tasks:

1. Create openaiClient.ts
2. Create modelRouter.ts
3. Add AgentChat endpoint
4. Connect AgentChatWindow to backend
5. Add LLM to AgentOnboardingChat
6. Add LLM to EvolutionMetaAgent (stub)

Output:

- list of modified files
- diff
- summary
```

---

# 17. Типи та інтерфейси

## 17.1. ChatMessage

```ts
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: string;
}
```

## 17.2. LLMResponse

```ts
interface LLMResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason?: string;
}
```

## 17.3. AgentChatRequest

```ts
interface AgentChatRequest {
  messages: ChatMessage[];
  context?: {
    channelId?: string;
    threadId?: string;
    userId?: string;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}
```

---

# 18. Тестування

## 18.1. Unit Tests

```ts
describe("openaiClient", () => {
  it("should call LLM with correct messages", async () => {
    const messages = [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" },
    ];
    
    const response = await callLLM(messages);
    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
  });
});
```

## 18.2. Integration Tests

```ts
describe("Agent Chat Integration", () => {
  it("should handle full chat flow", async () => {
    const agentId = "test-agent";
    const messages = [
      { role: "user", content: "Hello" },
    ];
    
    const response = await agentChat(agentId, messages);
    expect(response.reply).toBeDefined();
  });
});
```

---

# 19. Результат

Після інтеграції:

* будь-який агент microDAO працює на GPT/LLM,
* онбординг веде агент-гіда,
* Team Assistant відповідає у чаті,
* Meta-Agent генерує покращення,
* вся система стає справжньою OS на базі ШІ.

---

# 20. Наступні кроки

Після базової інтеграції можна додати:

- Streaming відповідей для кращого UX
- Кешування для оптимізації витрат
- Підтримку альтернативних провайдерів
- Fine-tuning моделей для конкретних спільнот
- Інтеграцію з DAGI для колективного навчання

---

**Готово.**  
Це **повна специфікація інтеграції LLM**, готова до використання в Cursor.


