# 13 — Agent Memory System (MicroDAO)

Цей документ описує архітектуру памʼяті агентів у MicroDAO:

- short-term, mid-term, long-term;

- персональна / командна / глобальна памʼять;

- Co-Memory та RAG;

- як памʼять інтегрується з Agent Runtime Core (12);

- як це використовувати для еволюційного агента (09).

---

# 1. Цілі системи памʼяті

1. Зробити агентів **контекстними**: вони памʼятають діалоги, рішення, факти.

2. Розділити памʼять за часом і рівнем узагальнення:

   - short-term → останні репліки;

   - mid-term → сесії / таски / важливі обговорення;

   - long-term → узагальнені знання про команду/проєкт.

3. Дати можливість:

   - переглядати памʼять,

   - очищати її,

   - контролювати, що саме зберігається.

4. Готувати основу для DAGI та Train-to-Earn (агрегована колективна памʼять).

---

# 2. Рівні памʼяті

## 2.1. Short-Term Memory (STM)

- Останні N повідомлень (user ↔ агент) в поточному контексті (канал / чат).

- Зберігається як `AgentMessage` (див. 12_agent_runtime_core.md).

- Використовується **в кожному запиті до LLM**.

Приклад:

- останні 20–50 повідомлень у каналі;

- спеціальні system-репліки (актуальні інструкції).

## 2.2. Mid-Term Memory (MTM)

- Важливі фрагменти діалогів, завдання, рішення, які стосуються:

  - конкретних тасок,

  - спринтів,

  - обговорень проєктів.

- Може бути збережена як:

  - підсумки сесій,

  - «замітки агента»,

  - структуровані записи (JSON).

Використання:

- контекст для агентських звітів,

- нагадування про те, що команда домовилася зробити.

## 2.3. Long-Term Memory (LTM)

- Узагальнені факти про:

  - команду,

  - проєкти,

  - стилі роботи,

  - правила,

  - терміни та словник.

Формат:

- списки фактів (текстові),

- векторні ембедінги (для RAG).

Приклади фактів:

- «Наш основний продукт — MicroDAO, ми фокусуємося на невеликих спільнотах.»

- «Для терміну "DAGI" ми маємо окремий опис, який завжди треба враховувати.»

---

# 3. Простір памʼяті (Scopes)

Памʼять розділяється за обсягом:

1. **Personal**  

   - пов'язана з конкретним користувачем (Personal Agent).

2. **Channel**  

   - стосується конкретного каналу, де агент працює.

3. **Team (microDAO)**  

   - загальна памʼять всієї спільноти.

4. **Global / DAGI**  

   - узагальнені патерни, які можуть бути анонімізовано експортовані.

---

# 4. Модель даних

### Таблиці (логічно):

- `agent_memory_events`  

  - id  

  - agent_id  

  - team_id  

  - channel_id (optional)  

  - user_id (optional)  

  - scope: `short_term | mid_term | long_term`  

  - kind: `message | fact | summary | note`  

  - body: text/json  

  - created_at

- `agent_memory_facts_vector`  

  - id  

  - team_id  

  - agent_id  

  - fact_text  

  - embedding (vector)  

  - metadata (json)

- `agent_memory_snapshots` (опціонально)  

  - агреговані snapshot-и стану памʼяті.

---

# 5. AgentMemoryAdapter (деталізація)

Посилання на 12_agent_runtime_core.md:

```ts
export interface AgentMemoryAdapter {
  loadShortTerm(ctx: AgentContext): Promise<AgentMessage[]>;
  loadLongTerm(ctx: AgentContext): Promise<string[]>;
  saveTurn(ctx: AgentContext, turn: AgentMessage): Promise<void>;
  appendFact(ctx: AgentContext, fact: string): Promise<void>;
}
```

### 5.1. loadShortTerm

* Витягує останні `N` подій типу `kind = 'message'` зі scope `short_term` для:

  * `agent_id`,

  * `team_id`,

  * `channel_id` (якщо є).

### 5.2. loadLongTerm

* Витягує список текстових фактів зі scope `long_term` (через `agent_memory_events` з `kind = 'fact'`).

### 5.3. saveTurn

* Записує повідомлення user/assistant як `message` (short-term).

* Якщо увімкнено автоматичне ущільнення памʼяті — може переносити деякі фрагменти в mid-term.

### 5.4. appendFact

* Додає факт у long-term (як `kind = 'fact'`).

* Додатково:

  * рахує ембедінг (через окремий LLM/embedding API),

  * зберігає в `agent_memory_facts_vector`.

---

# 6. RAG (Retrieval-Augmented Generation)

### 6.1. Retrieval

Коли агент отримує новий запит, перед викликом LLM:

1. Формує пошуковий запит (query) з тексту user.

2. Шукає релевантні факти у:

   * `agent_memory_facts_vector`,

   * (опційно) Co-Memory документів (файли, wiki).

3. Обмежує контекст, наприклад Top-K = 5–10 фактів.

### 6.2. Включення в промпт

Факти додаються в `LONG_TERM_MEMORY` (див. 12_agent_runtime_core.md):

```ts
const memoryMsg: AgentMessage = {
  role: "system",
  content:
    "LONG_TERM_MEMORY:\n" +
    retrievedFacts.map((f, i) => `- ${f.text}`).join("\n"),
};
```

---

# 7. Перетікання памʼяті (compression / distillation)

Щоб памʼять не перетворювалась на хаос, потрібні періодичні "distillation jobs".

### 7.1. Distillation Job

Раз на N повідомлень або раз на день для команди:

1. Беремо всі short-term повідомлення за певний період.

2. Feed-имо їх у Meta-Agent (див. 09_evolutionary_agent.md).

3. Отримуємо:

   * конспект (summary),

   * витяг корисних фактів,

   * пропозиції правил.

4. Записуємо:

   * summary → mid-term,

   * факти → long-term (appendFact),

   * пропозиції → evolution suggestions.

### 7.2. Видалення шуму

Після успішної дистиляції:

* можна частину короткої памʼяті чистити;

* можна перевести непотрібні `message` у архів.

---

# 8. Контроль з боку користувача

У UI потрібно дати користувачу можливість:

1. Переглядати памʼять (принаймні long-term):

   * список фактів,

   * розділений по каналах / темах.

2. Видаляти факти:

   * для конфіденційних даних,

   * при помилках.

3. Вимикати зберігання:

   * «Не зберігати DM-переписку з агентом у довгострокову памʼять».

4. Експортувати памʼять:

   * для аудиту / переносу.

---

# 9. Memory Scopes vs Agent Roles

### Guide Agent (онбординг)

* short-term: поточна сесія онбордингу;

* long-term: факти про те, як виглядає створена команда (не обовʼязково).

### Team Assistant

* short-term: останні діалоги в конкретному каналі;

* mid-term: summaries мітингів / сесій;

* long-term: знання про команду, процеси, словник.

### Meta-Agent

* працює на mid-/long-term даних:

  * аналізує їх,

  * пропонує зміни в правилах,

  * оновлює памʼять.

---

# 10. Псевдокод реалізації Adapter'а

```ts
export class PgAgentMemoryAdapter implements AgentMemoryAdapter {
  async loadShortTerm(ctx: AgentContext): Promise<AgentMessage[]> {
    const rows = await db.agent_memory_events.findMany({
      where: {
        agent_id: ctx.agent.id,
        team_id: ctx.teamId,
        channel_id: ctx.channelId ?? null,
        scope: "short_term",
        kind: "message",
      },
      orderBy: { created_at: "desc" },
      limit: 50,
    });

    return rows.reverse().map(rowToMessage);
  }

  async loadLongTerm(ctx: AgentContext): Promise<string[]> {
    const rows = await db.agent_memory_events.findMany({
      where: {
        agent_id: ctx.agent.id,
        team_id: ctx.teamId,
        scope: "long_term",
        kind: "fact",
      },
      orderBy: { created_at: "desc" },
      limit: 100,
    });

    return rows.map(r => r.body_text);
  }

  async saveTurn(ctx: AgentContext, turn: AgentMessage): Promise<void> {
    await db.agent_memory_events.insert({
      agent_id: ctx.agent.id,
      team_id: ctx.teamId,
      channel_id: ctx.channelId ?? null,
      scope: "short_term",
      kind: "message",
      body_json: turn,
    });
  }

  async appendFact(ctx: AgentContext, fact: string): Promise<void> {
    await db.agent_memory_events.insert({
      agent_id: ctx.agent.id,
      team_id: ctx.teamId,
      scope: "long_term",
      kind: "fact",
      body_text: fact,
    });

    // TODO: обчислити embedding та зберегти у agent_memory_facts_vector
  }
}
```

---

# 11. RAG Implementation

## 11.1. Embedding Generation

```ts
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddings.embedQuery(text);
  return result;
}
```

## 11.2. Vector Search

```ts
export async function searchRelevantFacts(
  query: string,
  agentId: string,
  teamId: string,
  topK: number = 5
): Promise<Array<{ text: string; score: number }>> {
  // Генеруємо embedding для запиту
  const queryEmbedding = await generateEmbedding(query);

  // Шукаємо найближчі вектори (cosine similarity)
  const results = await db.$queryRaw`
    SELECT 
      fact_text,
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM agent_memory_facts_vector
    WHERE agent_id = ${agentId}
      AND team_id = ${teamId}
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  return results.map(r => ({
    text: r.fact_text,
    score: r.similarity,
  }));
}
```

## 11.3. Integration with runAgentTurn

```ts
export async function runAgentTurn(ctx: AgentContext): Promise<AgentTurnResult> {
  // 1. Завантажуємо short-term пам'ять
  const shortTerm = await ctx.memory.loadShortTerm(ctx);

  // 2. RAG: шукаємо релевантні факти
  const relevantFacts = await searchRelevantFacts(
    ctx.input,
    ctx.agent.id,
    ctx.teamId,
    5
  );

  // 3. Завантажуємо long-term (статичні факти)
  const longTerm = await ctx.memory.loadLongTerm(ctx);

  // 4. Об'єднуємо RAG-результати з long-term
  const allFacts = [
    ...relevantFacts.map(f => f.text),
    ...longTerm,
  ];

  // 5. Готуємо повідомлення для LLM
  const messages = buildLLMMessages(ctx, shortTerm, allFacts);

  // ... решта логіки
}
```

---

# 12. Distillation Job Implementation

```ts
export async function runDistillationJob(
  agentId: string,
  teamId: string,
  period: { from: Date; to: Date }
): Promise<void> {
  // 1. Збираємо всі short-term повідомлення за період
  const messages = await db.agent_memory_events.findMany({
    where: {
      agent_id: agentId,
      team_id: teamId,
      scope: "short_term",
      kind: "message",
      created_at: {
        gte: period.from,
        lte: period.to,
      },
    },
    orderBy: { created_at: "asc" },
  });

  // 2. Формуємо контекст для Meta-Agent
  const conversationLog = messages.map(m => ({
    role: m.body_json.role,
    content: m.body_json.content,
    timestamp: m.created_at,
  }));

  // 3. Викликаємо Meta-Agent для аналізу
  const metaAgent = await getMetaAgent(agentId);
  const analysis = await metaAgent.analyze(conversationLog);

  // 4. Зберігаємо результати
  if (analysis.summary) {
    await db.agent_memory_events.create({
      data: {
        agent_id: agentId,
        team_id: teamId,
        scope: "mid_term",
        kind: "summary",
        body_text: analysis.summary,
      },
    });
  }

  if (analysis.facts && analysis.facts.length > 0) {
    for (const fact of analysis.facts) {
      await db.agent_memory_events.create({
        data: {
          agent_id: agentId,
          team_id: teamId,
          scope: "long_term",
          kind: "fact",
          body_text: fact,
        },
      });

      // Генеруємо embedding та зберігаємо
      const embedding = await generateEmbedding(fact);
      await db.agent_memory_facts_vector.create({
        data: {
          agent_id: agentId,
          team_id: teamId,
          fact_text: fact,
          embedding: embedding,
        },
      });
    }
  }

  // 5. Очищаємо оброблені short-term повідомлення
  await db.agent_memory_events.deleteMany({
    where: {
      agent_id: agentId,
      team_id: teamId,
      scope: "short_term",
      kind: "message",
      created_at: {
        gte: period.from,
        lte: period.to,
      },
    },
  });
}
```

---

# 13. Database Schema

## 13.1. agent_memory_events

```sql
CREATE TABLE agent_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  channel_id UUID REFERENCES channels(id),
  user_id UUID REFERENCES users(id),
  scope TEXT NOT NULL CHECK (scope IN ('short_term', 'mid_term', 'long_term')),
  kind TEXT NOT NULL CHECK (kind IN ('message', 'fact', 'summary', 'note')),
  body_text TEXT,
  body_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_agent_team_scope (agent_id, team_id, scope),
  INDEX idx_agent_channel (agent_id, channel_id),
  INDEX idx_created_at (created_at)
);
```

## 13.2. agent_memory_facts_vector

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE agent_memory_facts_vector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  fact_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_agent_team (agent_id, team_id),
  INDEX idx_embedding USING ivfflat (embedding vector_cosine_ops)
);
```

---

# 14. API Endpoints

## 14.1. GET /agents/{id}/memory

```ts
export async function getAgentMemory(req: Request, res: Response) {
  const { agentId } = req.params;
  const { scope, limit = 50 } = req.query;

  const memory = await db.agent_memory_events.findMany({
    where: {
      agent_id: agentId,
      scope: scope as string,
    },
    orderBy: { created_at: "desc" },
    take: parseInt(limit as string),
  });

  res.json({
    scope,
    items: memory,
  });
}
```

## 14.2. DELETE /agents/{id}/memory/{memoryId}

```ts
export async function deleteMemoryItem(req: Request, res: Response) {
  const { agentId, memoryId } = req.params;

  await db.agent_memory_events.delete({
    where: {
      id: memoryId,
      agent_id: agentId,
    },
  });

  res.json({ success: true });
}
```

## 14.3. POST /agents/{id}/memory/distill

```ts
export async function triggerDistillation(req: Request, res: Response) {
  const { agentId } = req.params;
  const { days = 7 } = req.body;

  const from = new Date();
  from.setDate(from.getDate() - days);

  await runDistillationJob(agentId, req.teamId, {
    from,
    to: new Date(),
  });

  res.json({ success: true });
}
```

---

# 15. Інтеграція з еволюційним агентом (09)

Еволюційний агент:

* читає `agent_memory_events` (особливо з негативним фідбеком),

* агрегує логи,

* робить distillation,

* створює пропозиції покращень.

Memory System → джерело для:

* аналізу діалогів,

* виявлення патернів,

* побудови Train-to-Earn.

---

# 16. Тестування

## 16.1. Unit Tests

```ts
describe("PgAgentMemoryAdapter", () => {
  it("should load short-term memory", async () => {
    const adapter = new PgAgentMemoryAdapter();
    const ctx = createMockContext();

    const messages = await adapter.loadShortTerm(ctx);
    expect(messages).toBeInstanceOf(Array);
    expect(messages.length).toBeLessThanOrEqual(50);
  });

  it("should save turn to memory", async () => {
    const adapter = new PgAgentMemoryAdapter();
    const ctx = createMockContext();
    const turn: AgentMessage = {
      role: "user",
      content: "Test message",
    };

    await adapter.saveTurn(ctx, turn);

    const messages = await adapter.loadShortTerm(ctx);
    expect(messages).toContainEqual(
      expect.objectContaining({ content: "Test message" })
    );
  });
});
```

---

# 17. Завдання для Cursor

Приклад промта:

```
You are a senior backend engineer.

Implement the Agent Memory System for MicroDAO using:

- 13_agent_memory_system.md
- 12_agent_runtime_core.md
- 11_llm_integration.md
- 09_evolutionary_agent.md
- 05_coding_standards.md

Tasks:

1) Create tables: agent_memory_events, agent_memory_facts_vector.

2) Implement PgAgentMemoryAdapter with short-term + long-term.

3) Wire PgAgentMemoryAdapter into Agent Runtime Core.

4) Add a simple RAG retrieval step using facts.

5) Expose a debug endpoint to inspect agent memory (GET /agents/{id}/memory).

Output:

- list of modified files
- diff
- summary
```

---

# 18. Результат

Після впровадження цієї системи:

* агенти MicroDAO мають справжню багаторівневу памʼять;

* можна керувати тим, що саме вони памʼятають;

* можна будувати RAG, еволюційний аналіз, Train-to-Earn;

* перехід до DAGI стає природним — через спільну колективну памʼять агентів.

---

**Готово.**  
Це **повна специфікація системи пам'яті агентів**, готова до використання в Cursor.


