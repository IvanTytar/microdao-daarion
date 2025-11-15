# 12 — Agent Runtime Core (MicroDAO)

Цей документ визначає, **як саме агент реалізований у коді** MicroDAO:

- які інтерфейси має,

- як виглядає життєвий цикл одного кроку,

- як інтегрується пам'ять,

- як інтегрується LLM,

- як у майбутньому додати SML / локальні моделі.

Це "контракт" для всіх агентів: Guide, Team Assistant, Meta-Agent.

---

# 1. Базові принципи

1. Агент — це **чиста функція + конфіг**.

2. Агент **не знає** про HTTP / UI — він працює з:

   - історією повідомлень,

   - пам'яттю,

   - інструментами (tools),

   - LLM-інтерфейсом.

3. Кожен агент має:

   - `config` (роль, системний промт, пам'ять),

   - `runtime` (функції: runStep, useTools, updateMemory).

---

# 2. Інтерфейси агента

```ts
export type AgentRole =
  | "guide"          // онбординг
  | "team_assistant" // основний помічник команди
  | "meta_evolution" // еволюційний агент
  | "custom";

export type MemoryScope = "channel" | "team" | "global";

export interface AgentConfig {
  id: string;
  teamId: string;
  name: string;
  role: AgentRole;
  systemPrompt: string;
  memoryScope: MemoryScope;
  modelHint?: string;   // підказка для modelRouter
  tools?: string[];     // назви інструментів, які дозволені
}
```

Повідомлення:

```ts
export type AgentMsgRole = "user" | "assistant" | "system" | "tool";

export interface AgentMessage {
  role: AgentMsgRole;
  content: string;
  toolName?: string;  // якщо role === "tool"
  ts?: string;
}
```

---

# 3. Runtime-контекст агента

```ts
export interface AgentContext {
  agent: AgentConfig;
  teamId: string;
  channelId?: string;
  userId: string;

  // дані ззовні:
  history: AgentMessage[]; // діалог user ↔ agent (локальний)
  input: string;           // останнє повідомлення user

  // сервіси:
  tools: ToolRegistry;
  memory: AgentMemoryAdapter;
  llm: AgentLLMAdapter;
}
```

---

# 4. Інтерфейси Memory та LLM

## 4.1. AgentMemoryAdapter

```ts
export interface AgentMemoryAdapter {
  loadShortTerm(ctx: AgentContext): Promise<AgentMessage[]>;
  loadLongTerm(ctx: AgentContext): Promise<string[]>; // факти / ноти
  saveTurn(ctx: AgentContext, turn: AgentMessage): Promise<void>;
  appendFact(ctx: AgentContext, fact: string): Promise<void>;
}
```

* `short-term` — останні N ходів діалогу;

* `long-term` — узагальнені знання про команду/проект.

## 4.2. AgentLLMAdapter

```ts
export interface AgentLLMAdapter {
  complete(
    ctx: AgentContext,
    messages: AgentMessage[],
    options?: { modelHint?: string }
  ): Promise<string>;
}
```

Фактична реалізація використовує `openaiClient` + `modelRouter` з `11_llm_integration.md`.

---

# 5. Інструменти (Tools)

```ts
export type ToolFn = (ctx: AgentContext, args: any) => Promise<any>;

export interface ToolRegistry {
  [name: string]: ToolFn;
}
```

Приклади tools:

* `create_followup`

* `create_task`

* `get_project_summary`

* `get_channel_history`

Інструменти не викликаються напряму з UI, тільки через агентський runtime.

---

# 6. Головна функція: runAgentTurn

```ts
export interface AgentTurnResult {
  reply: AgentMessage;
  toolCalls?: { name: string; args: any; result?: any }[];
}

export async function runAgentTurn(ctx: AgentContext): Promise<AgentTurnResult> {
  // 1. Завантажуємо памʼять
  const shortTerm = await ctx.memory.loadShortTerm(ctx);
  const longTerm = await ctx.memory.loadLongTerm(ctx);

  // 2. Готуємо повідомлення для LLM
  const messages = buildLLMMessages(ctx, shortTerm, longTerm);

  // 3. Викликаємо LLM
  const replyText = await ctx.llm.complete(ctx, messages, {
    modelHint: ctx.agent.modelHint,
  });

  const reply: AgentMessage = {
    role: "assistant",
    content: replyText,
    ts: new Date().toISOString(),
  };

  // 4. Зберігаємо хід в памʼяті
  await ctx.memory.saveTurn(ctx, { role: "user", content: ctx.input });
  await ctx.memory.saveTurn(ctx, reply);

  // 5. (опційно) витягуємо структуровані інструкції для tools / еволюції
  const toolCalls = parseToolCalls(replyText);

  // 6. Виконання tools (якщо дозволено)
  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      const tool = ctx.tools[call.name];
      if (!tool) continue;

      const result = await tool(ctx, call.args);
      call.result = result;

      // Можемо зберегти це як tool-message
      await ctx.memory.saveTurn(ctx, {
        role: "tool",
        toolName: call.name,
        content: JSON.stringify(result),
      });
    }
  }

  return { reply, toolCalls };
}
```

---

# 7. buildLLMMessages: як формується промпт

```ts
function buildLLMMessages(
  ctx: AgentContext,
  shortTerm: AgentMessage[],
  longTerm: string[],
): AgentMessage[] {
  const system: AgentMessage = {
    role: "system",
    content: ctx.agent.systemPrompt,
  };

  const memoryMsg: AgentMessage = {
    role: "system",
    content:
      "LONG_TERM_MEMORY:\n" +
      longTerm.map((f, i) => `- ${f}`).join("\n"),
  };

  const userInput: AgentMessage = {
    role: "user",
    content: ctx.input,
  };

  return [system, memoryMsg, ...shortTerm, userInput];
}
```

Надалі:

* можна додати Co-Memory / RAG (витягнути релевантні факти з векторної БД);

* можна додати структуровані інструкції для tools.

---

# 8. Життєвий цикл одного запиту агента (end-to-end)

1. UI (`AgentChatWindow` або `AgentOnboardingChat`) відправляє `/agents/{id}/chat`:

   * `agentId`,

   * `channelId`,

   * `userId`,

   * `input` (текст користувача).

2. Backend:

   * дістає `AgentConfig` з БД;

   * формує `AgentContext`:

     * agent, teamId, channelId, userId,

     * history (опційно),

     * memory adapter,

     * llm adapter,

     * tools.

3. Викликає `runAgentTurn(ctx)`.

4. Отримує `reply` + `toolCalls`.

5. Повертає `reply` у UI.

6. UI показує відповідь агента, додає фідбек (👍/👎).

---

# 9. Інтеграція з SML / локальними моделями

У майбутньому:

* `AgentLLMAdapter.complete` може:

  * для простих задач (класифікація, короткі відповіді) викликати локальний SML,

  * для складних — OpenAI/велику LLM.

Псевдокод:

```ts
export async function complete(ctx, messages, options) {
  if (isSimpleTask(messages)) {
    return callLocalSML(messages);
  } else {
    return callLLM(messages, pickModel(ctx.agent.role));
  }
}
```

---

# 10. Використання для різних типів агентів

### Guide Agent (онбординг)

* той самий runtime,

* інший `systemPrompt`,

* інший набір tools:

  * `create_team`

  * `update_team_mode`

  * `create_channel`

  * `create_agent`

### Team Assistant

* general-purpose агент,

* має tools:

  * `create_followup`

  * `create_task`

  * `get_summary`

  * `search_memory`

### Evolution Meta-Agent

* використовує:

  * `conversation_log` як input,

  * інший systemPrompt,

  * tools:

    * `create_improvement_proposal`

    * `update_agent_rules`

---

# 11. Структура файлів

## 11.1. Core Runtime

```
src/agent-runtime/
  core/
    types.ts              # AgentConfig, AgentContext, AgentMessage
    runAgentTurn.ts       # Головна функція
    buildLLMMessages.ts   # Формування промпту
    parseToolCalls.ts     # Парсинг викликів інструментів
  adapters/
    memoryAdapter.ts      # Реалізація AgentMemoryAdapter
    llmAdapter.ts         # Реалізація AgentLLMAdapter
  tools/
    registry.ts           # Реєстр інструментів
    createFollowup.ts     # Інструмент створення follow-up
    createTask.ts         # Інструмент створення задачі
    getSummary.ts         # Інструмент отримання підсумку
```

## 11.2. Контролери

```
src/controllers/
  agentsController.ts     # HTTP endpoint /agents/{id}/chat
```

---

# 12. Реалізація адаптерів

## 12.1. Memory Adapter

```ts
export class DatabaseMemoryAdapter implements AgentMemoryAdapter {
  async loadShortTerm(ctx: AgentContext): Promise<AgentMessage[]> {
    // Завантажити останні N повідомлень з БД
    const messages = await db.agentMessages.findMany({
      where: {
        agentId: ctx.agent.id,
        channelId: ctx.channelId,
      },
      orderBy: { ts: "desc" },
      take: 20,
    });
    return messages.reverse();
  }

  async loadLongTerm(ctx: AgentContext): Promise<string[]> {
    // Завантажити довгострокові факти з Co-Memory
    const facts = await db.agentMemory.findMany({
      where: {
        agentId: ctx.agent.id,
        teamId: ctx.teamId,
        type: "fact",
      },
    });
    return facts.map(f => f.content);
  }

  async saveTurn(ctx: AgentContext, turn: AgentMessage): Promise<void> {
    await db.agentMessages.create({
      data: {
        agentId: ctx.agent.id,
        channelId: ctx.channelId,
        teamId: ctx.teamId,
        userId: ctx.userId,
        role: turn.role,
        content: turn.content,
        toolName: turn.toolName,
        ts: turn.ts || new Date().toISOString(),
      },
    });
  }

  async appendFact(ctx: AgentContext, fact: string): Promise<void> {
    await db.agentMemory.create({
      data: {
        agentId: ctx.agent.id,
        teamId: ctx.teamId,
        type: "fact",
        content: fact,
      },
    });
  }
}
```

## 12.2. LLM Adapter

```ts
import { callLLM } from "../llm/openaiClient";
import { pickModel } from "../llm/modelRouter";

export class OpenAILLMAdapter implements AgentLLMAdapter {
  async complete(
    ctx: AgentContext,
    messages: AgentMessage[],
    options?: { modelHint?: string }
  ): Promise<string> {
    const model = options?.modelHint || 
                  pickModel(ctx.agent.role) || 
                  "gpt-4.1-mini";

    // Конвертувати AgentMessage[] в формат OpenAI
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    return await callLLM(openaiMessages, model);
  }
}
```

---

# 13. Реєстр інструментів

```ts
import { ToolRegistry, ToolFn } from "./types";
import { createFollowup } from "./tools/createFollowup";
import { createTask } from "./tools/createTask";
import { getSummary } from "./tools/getSummary";

export const defaultToolRegistry: ToolRegistry = {
  create_followup: createFollowup,
  create_task: createTask,
  get_summary: getSummary,
};

// Фільтрація інструментів на основі конфігурації агента
export function getAvailableTools(agent: AgentConfig): ToolRegistry {
  if (!agent.tools || agent.tools.length === 0) {
    return {};
  }

  const registry: ToolRegistry = {};
  for (const toolName of agent.tools) {
    if (defaultToolRegistry[toolName]) {
      registry[toolName] = defaultToolRegistry[toolName];
    }
  }
  return registry;
}
```

---

# 14. Парсинг викликів інструментів

```ts
export function parseToolCalls(replyText: string): Array<{ name: string; args: any }> {
  // Простий парсер для формату: <tool:name>args</tool>
  const toolCallRegex = /<tool:(\w+)>(.*?)<\/tool>/gs;
  const calls: Array<{ name: string; args: any }> = [];

  let match;
  while ((match = toolCallRegex.exec(replyText)) !== null) {
    const name = match[1];
    const argsStr = match[2];
    
    try {
      const args = JSON.parse(argsStr);
      calls.push({ name, args });
    } catch (e) {
      console.warn(`Failed to parse tool args for ${name}:`, e);
    }
  }

  return calls;
}
```

Альтернативно, можна використовувати structured outputs або function calling API OpenAI.

---

# 15. HTTP Endpoint

```ts
import { Request, Response } from "express";
import { runAgentTurn } from "../agent-runtime/core/runAgentTurn";
import { DatabaseMemoryAdapter } from "../agent-runtime/adapters/memoryAdapter";
import { OpenAILLMAdapter } from "../agent-runtime/adapters/llmAdapter";
import { getAvailableTools } from "../agent-runtime/tools/registry";

export async function chatWithAgent(req: Request, res: Response) {
  const { agentId } = req.params;
  const { input, channelId, userId } = req.body;

  // Завантажити конфігурацію агента
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  // Завантажити історію (опціонально)
  const history = await db.agentMessages.findMany({
    where: {
      agentId,
      channelId,
    },
    orderBy: { ts: "asc" },
    take: 50,
  });

  // Створити контекст
  const ctx: AgentContext = {
    agent: {
      id: agent.id,
      teamId: agent.teamId,
      name: agent.name,
      role: agent.role as AgentRole,
      systemPrompt: agent.systemPrompt,
      memoryScope: agent.memoryScope as MemoryScope,
      modelHint: agent.modelHint,
      tools: agent.tools as string[],
    },
    teamId: agent.teamId,
    channelId,
    userId,
    history: history.map(msg => ({
      role: msg.role as AgentMsgRole,
      content: msg.content,
      toolName: msg.toolName,
      ts: msg.ts,
    })),
    input,
    tools: getAvailableTools(agent),
    memory: new DatabaseMemoryAdapter(),
    llm: new OpenAILLMAdapter(),
  };

  // Виконати хід агента
  try {
    const result = await runAgentTurn(ctx);
    res.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    console.error("Agent turn failed:", error);
    res.status(500).json({ error: "Agent failed to respond" });
  }
}
```

---

# 16. Тестування

## 16.1. Unit Tests

```ts
describe("runAgentTurn", () => {
  it("should generate reply from LLM", async () => {
    const mockLLM = {
      complete: jest.fn().mockResolvedValue("Test reply"),
    };
    
    const mockMemory = {
      loadShortTerm: jest.fn().mockResolvedValue([]),
      loadLongTerm: jest.fn().mockResolvedValue([]),
      saveTurn: jest.fn().mockResolvedValue(undefined),
    };

    const ctx: AgentContext = {
      agent: mockAgentConfig,
      teamId: "team-1",
      userId: "user-1",
      history: [],
      input: "Hello",
      tools: {},
      memory: mockMemory,
      llm: mockLLM,
    };

    const result = await runAgentTurn(ctx);

    expect(result.reply.content).toBe("Test reply");
    expect(mockLLM.complete).toHaveBeenCalled();
  });
});
```

---

# 17. Завдання для Cursor

Приклад промта:

```
You are a senior backend engineer.

Implement the Agent Runtime Core for MicroDAO using:

- 12_agent_runtime_core.md
- 11_llm_integration.md
- 09_evolutionary_agent.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Tasks:

1) Define core interfaces: AgentConfig, AgentContext, AgentMemoryAdapter, AgentLLMAdapter.

2) Implement runAgentTurn() with memory + LLM + optional tools.

3) Wire /agents/{id}/chat endpoint to runAgentTurn().

4) Update AgentChatWindow to use the new endpoint.

Output:

- list of modified files
- diff
- summary
```

---

# 18. Результат

Після впровадження цього ядра:

* усі агенти MicroDAO працюють через єдиний runtime;

* легко додавати нові типи агентів;

* пам'ять, LLM і tools чітко відокремлені;

* інтеграція з SML і DAGI стає питанням конфігурації, а не переписування коду.

---

**Готово.**  
Це **повна специфікація Agent Runtime Core**, готова до використання в Cursor.


