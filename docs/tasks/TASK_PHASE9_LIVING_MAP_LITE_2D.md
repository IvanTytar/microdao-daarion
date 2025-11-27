# TASK PHASE 9 — LIVING MAP (LITE 2D UI)

Version: 1.0  
Status: READY FOR IMPLEMENTATION  
Scope: Frontend-Only 2D Interactive Map (React + Canvas)

## 1. Context

Існує або буде реалізовано `living-map-service` (Phase 9 FULL):

- `GET /living-map/snapshot`
- `WS /living-map/stream`

Цей таск — чисто **UI/Frontend**, який:

- візуалізує стан мережі DAARION у вигляді 2D карти,
- дає змогу перемикатися між шарами (City / Space / Nodes / Agents),
- показує базові стани (online/offline, load, alerts),
- реагує на живі події (WS).

Цей 2D UI має працювати **без 3D/Three.js**, тільки React + Canvas.

---

## 2. Goals

1. Створити 2D "Living Map" сторінку `/living-map`.
2. Зробити Canvas-рендеринг 4 шарів:
   - City layer (microDAO як "райони міста")
   - Space layer (DAO-планети, орбіти нод)
   - Nodes layer (ноди, їх завантаженість)
   - Agents layer (агенти як точки/іконки)
3. Підключити `useLivingMapFull` (з FULL таску) або окремий `useLivingMapLite`.
4. Забезпечити:
   - панель шарів (Layer switcher),
   - клік по сутності → панель деталей справа,
   - zoom/pan базового рівня.

---

## 3. UI Structure

### 3.1. Routes

У `src/App.tsx`:

- Додати route:
  - `/living-map` → `LivingMapPage`.

### 3.2. Files (Frontend)

Створити:

```text
src/features/livingMap/
  ├── LivingMapPage.tsx
  ├── hooks/useLivingMapLite.ts        # або reuse useLivingMapFull
  ├── components/LivingMapCanvas.tsx
  ├── components/LayerSwitcher.tsx
  ├── components/EntityDetailsPanel.tsx
  ├── mini-engine/canvasRenderer.ts
  └── mini-engine/layoutEngine.ts
```

---

## 4. Data Contract (UI Level)

Очікуваний формат snapshot (узгоджений з FULL таском):

```ts
type LivingMapSnapshot = {
  generated_at: string;
  layers: {
    city: {
      items: Array<{
        id: string;
        slug: string;
        name: string;
        status: "active" | "inactive" | "warning";
        agents: number;
        nodes: number;
      }>;
    };
    space: {
      planets: Array<{
        id: string;
        name: string;
        type: "dao" | "platform" | "other";
        status: "active" | "inactive" | "warning";
        orbits: string[];
      }>;
      nodes: Array<{
        id: string;
        name: string;
        status: "online" | "offline" | "warning";
        cpu: number;
        gpu: number;
      }>;
    };
    nodes: {
      items: Array<{
        id: string;
        microdao_id: string | null;
        status: "online" | "offline" | "warning";
        metrics: {
          cpu: number;
          gpu: number;
          ram: number;
        };
      }>;
    };
    agents: {
      items: Array<{
        id: string;
        name: string;
        kind: string;
        microdao_id: string | null;
        status: "online" | "offline" | "idle";
        usage: {
          llm_calls_24h: number;
          tokens_24h: number;
        };
      }>;
    };
  };
};
```

Якщо backend ще не повністю готовий — у hook'у передбачити fallback з mock-даними.

---

## 5. Hook: `useLivingMapLite`

Мета: інкапсулювати логіку:

* HTTP-запит snapshot
* WebSocket-підписка
* merge подій у локальний state

### 5.1. API

```ts
type UseLivingMapLiteResult = {
  snapshot: LivingMapSnapshot | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: "connecting" | "open" | "closed" | "error";
  selectedLayer: "city" | "space" | "nodes" | "agents";
  setSelectedLayer: (layer: "city" | "space" | "nodes" | "agents") => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
};
```

### 5.2. Поведінка

* При mount:

  * `GET /living-map/snapshot`
  * після успіху — зберегти в `snapshot`
  * відкрити WS `/living-map/stream`
* На WS повідомлення:

  * якщо `kind="event"`:

    * оновлювати відповідні `layers.*` immutable-способом
* При помилках:

  * виставити `error`
  * обережний reconnect (наприклад, через 5–10 сек).

---

## 6. Canvas Rendering

### 6.1. `LivingMapCanvas.tsx`

Компонент:

```tsx
interface LivingMapCanvasProps {
  snapshot: LivingMapSnapshot | null;
  selectedLayer: "city" | "space" | "nodes" | "agents";
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}

export function LivingMapCanvas(props: LivingMapCanvasProps) {
  // створює <canvas>, підключає canvasRenderer
}
```

* Використати `useRef<HTMLCanvasElement>` + `useEffect`.
* Передавати в `canvasRenderer`:

  * `snapshot`
  * `selectedLayer`
  * `selectedEntityId`
  * `onSelectEntity`
  * внутрішній state zoom/pan (можна зберігати тут або в hook'у).

### 6.2. `mini-engine/canvasRenderer.ts`

Експортувати функцію:

```ts
export function createLivingMapRenderer(opts: {
  canvas: HTMLCanvasElement;
  getState: () => {
    snapshot: LivingMapSnapshot | null;
    selectedLayer: "city" | "space" | "nodes" | "agents";
    selectedEntityId: string | null;
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  onSelectEntity: (id: string | null) => void;
}) {
  // 1) ініціалізація контексту
  // 2) підписка на mouse events
  // 3) основний render loop (requestAnimationFrame)
}
```

Проста логіка:

* Layer `"city"`:

  * Рендерити прямокутники/кластери для кожного microDAO.
* Layer `"space"`:

  * Кола/"орбіти" для DAO-планет, ноди — точки на орбітах.
* Layer `"nodes"`:

  * Квадрати/іконки нод, колір залежить від `status` + bar для `cpu/gpu`.
* Layer `"agents"`:

  * Маленькі точки/іконки, колір за статусом, розмір за `usage.tokens_24h`.

### 6.3. `mini-engine/layoutEngine.ts`

Нехай вміщає функції:

```ts
export function layoutCityLayer(/* items */) { /* x,y,w,h для кожного microDAO */ }
export function layoutSpaceLayer(/* planets, nodes */) { /* координати */ }
export function layoutNodesLayer(/* nodes */) { /* grid/cluster layout */ }
export function layoutAgentsLayer(/* agents */) { /* grid / spiral / random seeded */ }
```

Координати зберігати в локальному мапінгу (наприклад, `Map<entityId, {x,y,w,h}>`).

---

## 7. UI Components

### 7.1. `LayerSwitcher.tsx`

Простий компонент:

```tsx
interface LayerSwitcherProps {
  value: "city" | "space" | "nodes" | "agents";
  onChange: (v: "city" | "space" | "nodes" | "agents") => void;
}

export function LayerSwitcher(props: LayerSwitcherProps) {
  // 4 кнопки / pills / segmented control
}
```

### 7.2. `EntityDetailsPanel.tsx`

Показує деталі обраної сутності:

```tsx
interface EntityDetailsPanelProps {
  snapshot: LivingMapSnapshot | null;
  selectedLayer: "city" | "space" | "nodes" | "agents";
  selectedEntityId: string | null;
}

export function EntityDetailsPanel(props: EntityDetailsPanelProps) {
  // шукає entity у відповідному layer
  // показує name, type, status, basic metrics
  // опційно: кнопки "Open Agent Hub", "Open microDAO Console", "Open DAO"
}
```

---

## 8. `LivingMapPage.tsx`

Складає все разом:

* Layout:

  * Ліворуч — Canvas (70% ширини)
  * Праворуч — панель з:

    * LayerSwitcher
    * Connection status (WS)
    * EntityDetailsPanel
* Підключає `useLivingMapLite`.

Псевдокод:

```tsx
export function LivingMapPage() {
  const {
    snapshot,
    isLoading,
    error,
    connectionStatus,
    selectedLayer,
    setSelectedLayer,
    selectedEntityId,
    setSelectedEntityId,
  } = useLivingMapLite();

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <LivingMapCanvas
          snapshot={snapshot}
          selectedLayer={selectedLayer}
          selectedEntityId={selectedEntityId}
          onSelectEntity={setSelectedEntityId}
        />
      </div>
      <div className="w-96 border-l flex flex-col">
        <LayerSwitcher value={selectedLayer} onChange={setSelectedLayer} />
        {/* status + errors */}
        <EntityDetailsPanel
          snapshot={snapshot}
          selectedLayer={selectedLayer}
          selectedEntityId={selectedEntityId}
        />
      </div>
    </div>
  );
}
```

---

## 9. TODO Checklist

* [ ] Додати route `/living-map` в `App.tsx`.
* [ ] Створити папку `src/features/livingMap/`.
* [ ] Реалізувати `useLivingMapLite` (або обгорнути `useLivingMapFull`).
* [ ] Створити `LivingMapPage.tsx`.
* [ ] Створити `LivingMapCanvas.tsx`.
* [ ] Реалізувати `canvasRenderer.ts` з базовим рендером:

  * [ ] city layer
  * [ ] space layer
  * [ ] nodes layer
  * [ ] agents layer
* [ ] Реалізувати `layoutEngine.ts`.
* [ ] Додати `LayerSwitcher.tsx` (простий UI).
* [ ] Додати `EntityDetailsPanel.tsx`.
* [ ] Підключити WebSocket stream (якщо backend вже готовий).
* [ ] Додати fallback на mock-дані, якщо API недоступний.
* [ ] Переконатись, що немає TypeScript/lint помилок.

---

## 10. Acceptance Criteria

1. Route `/living-map` доступний у UI.
2. При відкритті сторінки:

   * робиться запит `GET /living-map/snapshot` (або використовується mock),
   * на Canvas зʼявляються базові форми (місто/космос/ноди/агенти).
3. LayerSwitcher перемикає режим рендерингу між `city`, `space`, `nodes`, `agents`.
4. Клік по елементу на Canvas змінює `selectedEntityId` і панель деталей показує правильні дані.
5. WebSocket (якщо активний) змінює стан (наприклад, статус ноди, агента) без перезавантаження сторінки.
6. FPS достатній (без явних лагів на базовому обсязі даних).
7. Код компілюється без TypeScript та ESLint помилок.

---

END OF TASK

