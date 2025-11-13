import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  GitBranch,
  LineChart,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Vote,
  Wallet,
  Zap,
  Bot,
  Boxes,
  BookOpen,
  FileText,
  Network,
  Video,
  Palette,
  Bell,
  Store,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// ---------- Utility types ----------
type ModuleKey =
  | "home"
  | "messenger"
  | "projects"
  | "memory"
  | "parser"
  | "graph"
  | "meetings"
  | "agents"
  | "training"
  | "dao"
  | "treasury"
  | "integrations"
  | "market"
  | "analytics"
  | "notifications"
  | "admin"
  | "creative"
  | "security"
  | "profile";

const MODULES: Array<{
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
}> = [
  { key: "home", label: "Головна / Оркестратор", icon: Cpu },
  { key: "messenger", label: "Чати та канали", icon: MessageSquare },
  { key: "projects", label: "Проєкти", icon: Boxes },
  { key: "memory", label: "База знань", icon: BookOpen },
  { key: "parser", label: "Парсер документів", icon: FileText },
  { key: "graph", label: "Граф знань", icon: Network },
  { key: "meetings", label: "Зустрічі", icon: Video },
  { key: "agents", label: "Агенти", icon: Bot },
  { key: "training", label: "Навчальний кабінет", icon: GitBranch },
  { key: "dao", label: "Голосування / DAO", icon: Vote },
  { key: "treasury", label: "Фінанси / Казна", icon: Wallet },
  { key: "integrations", label: "Інтеграції", icon: Plug },
  { key: "market", label: "Маркетплейс", icon: Store },
  { key: "analytics", label: "Аналітика", icon: LineChart },
  { key: "notifications", label: "Сповіщення", icon: Bell },
  { key: "admin", label: "Адмін-панель", icon: Settings },
  { key: "creative", label: "Креативна студія", icon: Palette },
  { key: "security", label: "Безпека / Аудит", icon: ShieldCheck },
  { key: "profile", label: "Профіль", icon: User },
];

// ---------- Reusable UI blocks ----------
function Sidebar({ active, onSelect }: { active: ModuleKey; onSelect: (k: ModuleKey) => void }) {
  return (
    <aside className="h-full w-72 border-r bg-white/60 backdrop-blur-sm">
      <div className="p-4 border-b flex items-center gap-2">
        <Cpu className="h-5 w-5" />
        <span className="font-semibold">MicroDAO</span>
        <Badge variant="secondary" className="ml-auto">orchestrator</Badge>
      </div>
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100%-3.5rem)]">
        {MODULES.map((m) => (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-100 transition ${
              active === m.key ? "bg-slate-900 text-white hover:bg-slate-900" : ""
            }`}
            aria-current={active === m.key}
          >
            <m.icon className="h-4 w-4" />
            <span className="text-sm text-left truncate">{m.label}</span>
            {m.key === "notifications" && (
              <Badge className={`ml-auto ${active === m.key ? "bg-white text-slate-900" : ""}`}>3</Badge>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Topbar() {
  return (
    <div className="h-14 border-b flex items-center gap-3 px-4 bg-white/70 backdrop-blur">
      <Input placeholder="Пошук по всіх модулях" className="max-w-md" />
      <Tabs defaultValue="dao" className="ml-2">
        <TabsList>
          <TabsTrigger value="private">Private</TabsTrigger>
          <TabsTrigger value="dao">DAO</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1"><Database className="h-4 w-4"/>DB ok</Badge>
        <Badge variant="outline" className="flex items-center gap-1"><Zap className="h-4 w-4"/>DAGI sync</Badge>
        <Button variant="secondary" size="sm" className="gap-2"><Settings className="h-4 w-4"/>Налаштування</Button>
      </div>
    </div>
  );
}

function HealthGrid() {
  const items = [
    { title: "Messenger", ok: true },
    { title: "Parser", ok: false },
    { title: "KB Core", ok: true },
    { title: "RAG", ok: true },
    { title: "Wallet", ok: true },
    { title: "DAO", ok: true },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((x) => (
        <Card key={x.title} className="rounded-2xl">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {x.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              {x.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xs text-slate-500">{x.ok ? "Працює стабільно" : "Черга задач > p95"}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrchestratorChat() {
  return (
    <Card className="rounded-2xl h-full flex flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Чат з Оркестратором</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex-1 rounded-xl border bg-slate-50 p-3 text-sm overflow-auto">
          <div className="text-slate-500">Вітаю. Чим допомогти? Наприклад: "Розбери PDF та створй короткий бріф у Проєктах".</div>
        </div>
        <div className="flex items-center gap-2">
          <Textarea placeholder="Запитайте або використайте @agent" className="min-h-[44px]" />
          <Button className="whitespace-nowrap">Надіслати</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed() {
  const rows = [
    { t: "ingest.completed", d: "USDO готово", ts: "09:15" },
    { t: "message.created", d: "#general", ts: "09:12" },
    { t: "vote.finalized", d: "Постанова #12", ts: "08:55" },
    { t: "payment.sent", d: "Reward 2.5 μUTIL", ts: "08:40" },
  ];
  return (
    <Card className="rounded-2xl h-full">
      <CardHeader className="py-3"><CardTitle className="text-sm">Стрічка подій</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500"/>
              <span className="font-medium">{r.t}</span>
              <span className="text-slate-500">— {r.d}</span>
              <span className="ml-auto text-xs text-slate-400">{r.ts}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TasksTable() {
  const rows = [
    { agent: "parser-agent", task: "PDF→USDO", status: "running", eta: "2m" },
    { agent: "project-agent", task: "Бріф + Kanban", status: "queued", eta: "—" },
    { agent: "wallet-agent", task: "Нарахувати винагороду", status: "completed", eta: "0" },
  ];
  const color = (s: string) => (s === "completed" ? "text-emerald-600" : s === "running" ? "text-amber-600" : "text-slate-500");
  return (
    <Card className="rounded-2xl h-full">
      <CardHeader className="py-3"><CardTitle className="text-sm">Поточні задачі агентів</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Агент</th>
                <th className="py-2 pr-4">Задача</th>
                <th className="py-2 pr-4">Статус</th>
                <th className="py-2">ETA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4 font-mono text-xs">{r.agent}</td>
                  <td className="py-2 pr-4">{r.task}</td>
                  <td className={`py-2 pr-4 ${color(r.status)}`}>{r.status}</td>
                  <td className="py-2">{r.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentGraph() {
  // Minimal static SVG graph placeholder
  return (
    <Card className="rounded-2xl h-full">
      <CardHeader className="py-3"><CardTitle className="text-sm">Граф агентів</CardTitle></CardHeader>
      <CardContent>
        <svg viewBox="0 0 400 220" className="w-full h-48">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <circle cx="200" cy="110" r="28" className="fill-slate-900" />
            <text x="200" y="115" textAnchor="middle" className="fill-white text-xs">Orch</text>
            {[
              { x: 80, y: 40, t: "Parser" },
              { x: 320, y: 40, t: "KB" },
              { x: 80, y: 180, t: "Wallet" },
              { x: 320, y: 180, t: "DAO" },
            ].map((n, i) => (
              <g key={i}>
                <line x1="200" y1="110" x2={n.x} y2={n.y} stroke="#94a3b8" />
                <circle cx={n.x} cy={n.y} r="22" className="fill-white stroke-slate-300" />
                <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-slate-700 text-xs">{n.t}</text>
              </g>
            ))}
          </g>
        </svg>
      </CardContent>
    </Card>
  );
}

function HomeOrchestrator() {
  return (
    <div className="p-4 space-y-4">
      <HealthGrid />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <OrchestratorChat />
        <div className="grid grid-rows-2 gap-4">
          <ActivityFeed />
          <TasksTable />
        </div>
      </div>
      <AgentGraph />
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6 text-sm text-slate-600">
      <p className="mb-2">Розділ: <span className="font-medium">{title}</span></p>
      <p>Тут буде детальний екран модуля. Структура готова до підключення реальних даних та маршрутів.</p>
    </div>
  );
}

function StartScreen({ onCreateDAO, onJoinDAO, onSolo, agentReady, onInstallAgent }: { onCreateDAO: () => void; onJoinDAO: () => void; onSolo: () => void; agentReady: boolean; onInstallAgent: () => void; }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-3xl w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Ласкаво просимо до MicroDAO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-slate-600">Почніть зі створення спільноти DAO, приєднайтесь за інвайтом або спробуйте Solo-режим з локальним агентом.</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <Button onClick={onCreateDAO} className="rounded-xl">Створити DAO</Button>
              <Button variant="secondary" onClick={onJoinDAO} className="rounded-xl">Приєднатись</Button>
              <Button variant="outline" onClick={onSolo} className="rounded-xl">Solo-режим</Button>
            </div>
            <div className="text-xs text-slate-500">Можна змінити вибір пізніше у Налаштуваннях.</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4"/>Локальний агент</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {agentReady ? (
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>Готовий до роботи</div>
            ) : (
              <>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600"/>Ще не встановлено</div>
                <Button size="sm" onClick={onInstallAgent} className="rounded-xl w-full mt-1">Встановити агента</Button>
                <div className="text-xs text-slate-500">Обсяг моделі підбирається автоматично за можливостями пристрою.</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrchestratorLayout() {
  const [active, setActive] = React.useState<ModuleKey>("home");
  const [orgId, setOrgId] = React.useState<string | null>(null); // null = ще немає DAO/спільноти
  const [agentReady, setAgentReady] = React.useState<boolean>(false);

  const content = () => {
    if (!orgId) {
      return (
        <StartScreen
          onCreateDAO={() => setOrgId("dao-created")}
          onJoinDAO={() => setOrgId("dao-joined")}
          onSolo={() => setOrgId("solo-mode")}
          agentReady={agentReady}
          onInstallAgent={() => setAgentReady(true)}
        />
      );
    }

    switch (active) {
      case "home":
        return <HomeOrchestrator />;
      case "messenger":
        return <Placeholder title="Чати та канали" />;
      case "projects":
        return <Placeholder title="Проєкти" />;
      case "memory":
        return <Placeholder title="База знань" />;
      case "parser":
        return <Placeholder title="Парсер документів" />;
      case "graph":
        return <Placeholder title="Граф знань" />;
      case "meetings":
        return <Placeholder title="Зустрічі" />;
      case "agents":
        return <Placeholder title="Агенти" />;
      case "training":
        return <Placeholder title="Навчальний кабінет" />;
      case "dao":
        return <Placeholder title="Голосування / DAO" />;
      case "treasury":
        return <Placeholder title="Фінанси / Казна" />;
      case "integrations":
        return <Placeholder title="Інтеграції" />;
      case "market":
        return <Placeholder title="Маркетплейс" />;
      case "analytics":
        return <Placeholder title="Аналітика" />;
      case "notifications":
        return <Placeholder title="Сповіщення" />;
      case "admin":
        return <Placeholder title="Адмін-панель" />;
      case "creative":
        return <Placeholder title="Креативна студія" />;
      case "security":
        return <Placeholder title="Безпека / Аудит" />;
      case "profile":
        return <Placeholder title="Профіль" />;
    }
  };

  return (
    <div className="h-[100vh] w-full grid grid-cols-[18rem_1fr] bg-slate-50 text-slate-900">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-auto">{content()}</div>
      </main>
    </div>
  );
}
