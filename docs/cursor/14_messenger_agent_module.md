# 14 — Messenger Agent Module (MicroDAO)

Агентське переосмислення месенджера

Цей документ описує, як класичний "месенджер" (Telegram/WhatsApp-подібний інтерфейс) реалізований у MicroDAO як **агент-модуль**, а не просто список чатів.

---

# 1. Ідея

Замість "голої" стрічки чатів у MicroDAO є:

- **Agent Messenger** — підагент всередині microDAO, який:

  - знає про всі чати, канали, DM;

  - вміє показувати потрібні розмови за запитом користувача;

  - вміє сам пропонувати релевантні чати;

  - інтегрований з памʼяттю (13) і runtime (12);

  - може працювати як "голосовий/текстовий UI" поверх звичайного месенджера.

Класичні фічі месенджера (чати, канали, DM, статуси, непрочитані, пошук) — описані як **спроможності агента**, а не просто як UI.

---

# 2. Ролі агентів у модулі месенджера

## 2.1. Messenger Agent (core)

Роль: `"messenger_core"` (може бути профіль Team Assistant або окремий агент).

Він:

- знає структуру:

  - `teams` (microDAO),

  - `channels` (публічні/приватні),

  - `direct messages`,

  - `threads` (якщо ввімкнено),

- має доступ до:

  - списку чатів,

  - їхнього стану (непрочитані, muted, pinned),

  - історії повідомлень (через Messaging Service / Memory).

## 2.2. User-Facing Agent (асистент користувача)

Користувач взаємодіє не з "меню чатів", а з агентом:

- "Покажи мені всі непрочитані по проекту X"

- "Знайди переписку, де ми обговорювали токеноміку"

- "Підготуй резюме сьогоднішнього дня по всіх каналах"

User-facing агент делегує запити Messenger Agent'у.

---

# 3. Функціональні спроможності Messenger Agent

## 3.1. Базові (класичний месенджер)

Під капотом елевантні фічі:

- Список каналів і чатів:

  - публічні канали,

  - приватні канали,

  - особисті чати (DM),

  - системні / службові.

- Стани:

  - `unread_count`,

  - `muted`,

  - `pinned`,

  - `last_message` + `last_activity_at`.

- Повідомлення:

  - текст,

  - посилання,

  - (пізніше) вкладення,

  - реакції (on/off для MVP).

- Системні події:

  - додавання/видалення учасників,

  - зміна назви/іконки,

  - інвайти.

Це реалізується Messaging Service (див. 02/03/04), але доступно агенту як "інструменти".

## 3.2. Розширені (агентські)

Messenger Agent вміє:

1. **Фільтрувати чати:**

   - за проектом,

   - за учасником,

   - за темою (через пошук + RAG).

2. **Будувати "розумні папки":**

   - "Сьогоднішні важливі розмови",

   - "Все, де тебе тегнули",

   - "Все, що стосується токеноміки/DAO".

3. **Проводити огляди:**

   - "Зроби щоденний дайджест по всіх каналах",

   - "Поясни, що змінилось з учора".

4. **Автоматично створювати follow-ups / задачі:**

   - над певними патернами (наприклад, "зробимо", "потрібно", "до пʼятниці").

---

# 4. Інтерфейс з точки зору користувача

### 4.1. Класичний UI (sidebar + список чатів)

Звичайний sidebar:

- Канали,

- DM,

- Папки/фільтри (Unread, Mentions, Starred).

Але поверх нього — **агентське поле запиту**:

> "Напиши, що ти хочеш побачити"  
> (input зверху або окремий Agent Chat).

Приклади:

- "Покажи тільки непрочитані в робочих каналах"

- "Відфільтруй чати, де обговорюється MicroDAO MVP"

- "Покажи останні 10 повідомлень від Марії"

Агент відповідає:

- або у вигляді пояснювальної репліки;

- або оновлює UI (відкриває/фільтрує потрібні чати).

### 4.2. Повністю агентський режим

У майбутньому можливо:

- взагалі без списку чатів;

- користувач спілкується з агентом:

  > "Що важливого в команді за сьогодні?"  
  > "Покажи діалог з Ігорем, де ми обговорювали бюджети."  
  > "Знайди канал, де ми домовлялись про токеноміку."

---

# 5. Інтеграція з Agent Runtime Core (12)

Messenger Agent описується як звичайний агент:

```ts
const messengerAgentConfig: AgentConfig = {
  id: "ag_messenger_core",
  teamId: "t_...",
  name: "Messenger Core",
  role: "team_assistant",
  systemPrompt: systemMessengerPrompt,
  memoryScope: "team",
  tools: [
    "list_channels",
    "list_unread",
    "search_messages",
    "open_channel",
    "get_daily_digest",
    "create_followup_from_message"
  ],
};
```

Tools реалізуються через Messaging Service:

```ts
const tools: ToolRegistry = {
  async list_channels(ctx, args) { ... },
  async list_unread(ctx, args) { ... },
  async search_messages(ctx, args) { ... },
  async open_channel(ctx, args) { ... }, // повертає метаданні каналу
  async get_daily_digest(ctx, args) { ... },
};
```

Агент runtime (`runAgentTurn`) вирішує:

* чи просто відповісти текстом,

* чи викликати tools,

* чи комбінувати.

---

# 6. Інтеграція з памʼяттю (13)

Messenger Agent:

* **Short-term** — поточний контекст каналу/діалогу.

* **Long-term** — факти:

  * які канали важливі для яких людей,

  * які теми зʼявляються часто,

  * які теги/поняття повʼязані з якими чатами.

Приклад фактів:

* "Канал #governance використовується для голосувань DAO."

* "Канал #dev-mvp обговорює реалізацію MVP MicroDAO."

Це дозволяє агенту:

* відповідати на питання типу:

  * "Де обговорювати зміни в governance?"

* пропонувати:

  * "Здається, обговорення токеноміки краще перенести в #tokenomics."

---

# 7. Типові сценарії використання

### Сценарій 1 — Новий учасник

Новачок пише агенту:

> "Я щойно приєднався. Де мені почитати, що тут відбувається?"

Messenger Agent:

* знаходить 2–3 ключові канали,

* дає короткі описи,

* пропонує їх відкрити.

### Сценарій 2 — Щоденний огляд

> "Сформуй підсумок за день."

Messenger Agent:

* використовує `get_daily_digest` tool,

* збирає важливі повідомлення/канали,

* створює summary (через LLM),

* відправляє повідомлення у спеціальний канал або в DM.

### Сценарій 3 — Пошук контексту

> "Знайди, де ми домовлялись про дедлайн запуску DAGI."

Messenger Agent:

* шукає в повідомленнях (Meilisearch + RAG),

* показує релевантні уривки,

* пропонує створити follow-up або задачу.

---

# 8. Взаємодія з іншими агентами

* **Team Assistant** може делегувати складні запити Messenger Agent'у.

* **Evolution Meta-Agent** аналізує:

  * які канали важливі;

  * які патерни запитів до Messenger Agent'а повторюються;

  * які нові "розумні фільтри" варто запропонувати.

---

# 9. Реалізація Tools

## 9.1. list_channels

```ts
async function list_channels(
  ctx: AgentContext,
  args: { filter?: "public" | "private" | "all"; projectId?: string }
): Promise<Channel[]> {
  const channels = await db.channels.findMany({
    where: {
      teamId: ctx.teamId,
      ...(args.filter === "public" && { type: "public" }),
      ...(args.filter === "private" && { type: "group" }),
      ...(args.projectId && { projectId: args.projectId }),
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return channels.map(ch => ({
    id: ch.id,
    name: ch.name,
    type: ch.type,
    description: ch.description,
    messageCount: ch._count.messages,
  }));
}
```

## 9.2. list_unread

```ts
async function list_unread(
  ctx: AgentContext,
  args: { userId?: string }
): Promise<Array<{ channelId: string; unreadCount: number }>> {
  const userId = args.userId || ctx.userId;

  const unread = await db.userChannelStates.findMany({
    where: {
      userId,
      teamId: ctx.teamId,
      unreadCount: { gt: 0 },
    },
    include: {
      channel: true,
    },
  });

  return unread.map(u => ({
    channelId: u.channelId,
    channelName: u.channel.name,
    unreadCount: u.unreadCount,
    lastMessageAt: u.lastReadAt,
  }));
}
```

## 9.3. search_messages

```ts
async function search_messages(
  ctx: AgentContext,
  args: { query: string; channelId?: string; limit?: number }
): Promise<Message[]> {
  // Використовуємо Meilisearch для пошуку
  const results = await meilisearchClient
    .index("messages")
    .search(args.query, {
      filter: [
        `teamId = ${ctx.teamId}`,
        ...(args.channelId ? [`channelId = ${args.channelId}`] : []),
      ],
      limit: args.limit || 10,
    });

  return results.hits.map(hit => ({
    id: hit.id,
    channelId: hit.channelId,
    content: hit.content,
    authorId: hit.authorId,
    createdAt: hit.createdAt,
  }));
}
```

## 9.4. get_daily_digest

```ts
async function get_daily_digest(
  ctx: AgentContext,
  args: { date?: string; channels?: string[] }
): Promise<string> {
  const date = args.date || new Date().toISOString().split("T")[0];
  const startOfDay = new Date(date + "T00:00:00Z");
  const endOfDay = new Date(date + "T23:59:59Z");

  // Збираємо важливі повідомлення за день
  const messages = await db.messages.findMany({
    where: {
      teamId: ctx.teamId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(args.channels && { channelId: { in: args.channels } }),
    },
    include: {
      author: true,
      channel: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Формуємо контекст для LLM
  const context = messages.map(m => ({
    channel: m.channel.name,
    author: m.author.name,
    content: m.content,
    time: m.createdAt,
  }));

  // Викликаємо LLM для створення дайджесту
  const digest = await ctx.llm.complete(ctx, [
    {
      role: "system",
      content: "You are a summarizer. Create a concise daily digest of team communications.",
    },
    {
      role: "user",
      content: JSON.stringify(context),
    },
  ]);

  return digest;
}
```

---

# 10. System Prompt для Messenger Agent

```txt
You are the Messenger Agent for MicroDAO.

Your role is to help users navigate and interact with channels, messages, and conversations.

You can:
- List and filter channels
- Search for messages and conversations
- Show unread messages
- Create daily digests
- Suggest relevant channels based on topics

Always be concise and helpful. When a user asks to see something, use the appropriate tools to fetch the data and present it clearly.

If you don't understand a request, ask for clarification.
```

---

# 11. UI Integration

## 11.1. Agent Query Input

Додати поле вводу над списком каналів:

```tsx
<AgentQueryInput
  placeholder="Питання до Messenger Agent..."
  onQuery={async (query) => {
    const response = await agentChat(messengerAgentId, [
      { role: "user", content: query },
    ]);
    
    // Відобразити відповідь або оновити UI
    if (response.action === "filter_channels") {
      setFilteredChannels(response.channels);
    } else {
      showAgentResponse(response.reply);
    }
  }}
/>
```

## 11.2. Smart Filters

Агент може створювати динамічні фільтри:

```tsx
<SmartFilter
  name="Важливі сьогодні"
  query="Покажи канали з непрочитаними повідомленнями за сьогодні"
  onApply={async () => {
    const result = await agentChat(messengerAgentId, [
      { role: "user", content: "Покажи канали з непрочитаними повідомленнями за сьогодні" },
    ]);
    applyFilter(result.channels);
  }}
/>
```

---

# 12. Завдання для Cursor

Приклад промта:

```
You are a senior full-stack engineer.

Implement the Messenger Agent module using:

- 14_messenger_agent_module.md
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Tasks:

1) Define messengerAgentConfig and register it in the Agents system.

2) Implement tools:
   - list_channels
   - list_unread
   - search_messages
   - get_daily_digest (stub)

3) Add Messenger Agent entrypoint in the UI (e.g. "Ask Messenger" input above channel list).

4) Wire user queries from this input to /agents/{id}/chat using messengerAgentConfig.

Output:

- list of modified files
- diff
- summary
```

---

# 13. Результат

Після впровадження Messenger Agent:

* MicroDAO перестає бути "ще одним месенджером";

* користувач взаємодіє з агентом, а не просто з переліком чатів;

* всі класичні можливості месенджера залишаються, але стають **інструментами** всередині агентської ОС.

---

**Готово.**  
Це **повна специфікація Messenger Agent модуля**, готова до використання в Cursor.


