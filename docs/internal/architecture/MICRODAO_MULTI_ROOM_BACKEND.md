# MicroDAO Multi-Room Architecture

**Дата:** 28 листопада 2025  
**Статус:** ✅ Реалізовано (TASK 034-036)

## Огляд

Кожен MicroDAO може мати кілька внутрішніх кімнат (Matrix/City rooms), а не лише одну primary room. Це дозволяє організувати різні простори для команди: лобі, командні кімнати, дослідницькі лабораторії, безпека, управління тощо.

---

## 1. Схема БД

### Розширення `city_rooms`

```sql
ALTER TABLE city_rooms
    ADD COLUMN IF NOT EXISTS microdao_id uuid,
    ADD COLUMN IF NOT EXISTS room_role text,
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_city_rooms_microdao_id ON city_rooms(microdao_id);
CREATE INDEX IF NOT EXISTS idx_city_rooms_room_role ON city_rooms(room_role);
```

### Поля

| Поле | Тип | Опис |
|------|-----|------|
| `microdao_id` | UUID | Посилання на MicroDAO, якому належить кімната |
| `room_role` | TEXT | Роль кімнати: `primary`, `lobby`, `team`, `research`, `security`, `governance` |
| `is_public` | BOOLEAN | Чи видима кімната для не-членів MicroDAO |
| `sort_order` | INTEGER | Порядок відображення (менше = вище) |

### Ролі кімнат

| Роль | Опис |
|------|------|
| `primary` | Основна кімната MicroDAO (показується першою, використовується для чату за замовчуванням) |
| `lobby` | Лобі для зустрічей та привітань |
| `team` | Командна кімната для внутрішньої комунікації |
| `research` | Дослідницька лабораторія |
| `security` | Кімната безпеки |
| `governance` | Кімната управління та голосування |

---

## 2. Backend API

### Моделі

```python
class CityRoomSummary(BaseModel):
    id: str
    slug: str
    name: str
    matrix_room_id: Optional[str] = None
    microdao_id: Optional[str] = None
    microdao_slug: Optional[str] = None
    room_role: Optional[str] = None
    is_public: bool = True
    sort_order: int = 100

class MicrodaoRoomsList(BaseModel):
    microdao_id: str
    microdao_slug: str
    rooms: List[CityRoomSummary]

class MicrodaoRoomUpdate(BaseModel):
    room_role: Optional[str] = None
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None
    set_primary: Optional[bool] = None

class AttachExistingRoomRequest(BaseModel):
    room_id: str
    room_role: Optional[str] = None
    is_public: bool = True
    sort_order: int = 100
```

### Endpoints

| Метод | URL | Опис |
|-------|-----|------|
| GET | `/city/microdao/{slug}/rooms` | Отримати всі кімнати MicroDAO |
| POST | `/city/microdao/{slug}/rooms/attach-existing` | Прив'язати існуючу кімнату |
| PATCH | `/city/microdao/{slug}/rooms/{room_id}` | Оновити налаштування кімнати |

### Приклади

#### GET /city/microdao/daarion-dao/rooms

```json
{
  "microdao_id": "uuid-here",
  "microdao_slug": "daarion-dao",
  "rooms": [
    {
      "id": "room_leadership_hall",
      "slug": "leadership-hall",
      "name": "Leadership Hall",
      "room_role": "primary",
      "is_public": true,
      "sort_order": 0
    },
    {
      "id": "room_system_control",
      "slug": "system-control",
      "name": "System Control",
      "room_role": "governance",
      "is_public": true,
      "sort_order": 10
    }
  ]
}
```

#### PATCH /city/microdao/daarion-dao/rooms/room_system_control

```json
{
  "set_primary": true
}
```

---

## 3. Frontend

### Типи

```typescript
interface CityRoomSummary {
  id: string;
  slug: string;
  name: string;
  matrix_room_id?: string | null;
  microdao_id?: string | null;
  microdao_slug?: string | null;
  room_role?: string | null;
  is_public?: boolean;
  sort_order?: number;
}

interface MicrodaoRoomsList {
  microdao_id: string;
  microdao_slug: string;
  rooms: CityRoomSummary[];
}
```

### Hooks

- `useMicrodaoRooms(slug)` — отримати кімнати MicroDAO

### Компоненти

- `MicrodaoRoomsSection` — відображення кімнат з чатами
- `MicrodaoRoomsAdminPanel` — панель керування кімнатами (для оркестратора)

---

## 4. UI Flow

1. **Сторінка MicroDAO** (`/microdao/[slug]`):
   - Показує всі кімнати через `MicrodaoRoomsSection`
   - Primary room — з вбудованим чатом
   - Інші кімнати — як картки з посиланнями

2. **Панель адміністратора** (`MicrodaoRoomsAdminPanel`):
   - Видима тільки для оркестратора
   - Дозволяє:
     - Змінювати роль кімнати
     - Встановлювати primary
     - Змінювати видимість
     - Прив'язувати існуючі кімнати

---

## 5. Міграції

- `migrations/031_microdao_multi_room.sql` — додає поля та індекси

---

## 6. Пов'язані файли

### Backend
- `services/city-service/models_city.py`
- `services/city-service/repo_city.py`
- `services/city-service/routes_city.py`

### Frontend
- `apps/web/src/lib/types/microdao.ts`
- `apps/web/src/hooks/useMicrodao.ts`
- `apps/web/src/components/microdao/MicrodaoRoomsSection.tsx`
- `apps/web/src/components/microdao/MicrodaoRoomsAdminPanel.tsx`
- `apps/web/src/app/api/microdao/[slug]/rooms/route.ts`

