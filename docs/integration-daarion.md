# Integration Guide: MicroDAO → DAARION.city

*Консолідований документ для інтеграції MicroDAO у офіційний сайт DAARION.city*

---

## 1. Quick Start

Цей документ об'єднує ключову інформацію для інтеграції MicroDAO у DAARION.city. Він посилається на детальні специфікації в `docs/cursor/` та `docs/tokenomics/`.

### Ключові документи

- `docs/cursor/50_daarion_city_website_integration.md` — детальна інтеграція з сайтом
- `docs/cursor/DAARION_city_integration.md` — архітектура інтеграції
- `docs/tokenomics/city-tokenomics.md` ⭐ — канонічна токеноміка міста (v1.0.0)
  > **Примітка:** Це єдиний актуальний документ з токеноміки. Попередній `tokenomics/README.md` перенесено в `docs/_archive/tokenomics_legacy_v0.md`.

---

## 2. DAARION.city as First MicroDAO (A1-Level)

### 2.1 Setup

DAARION.city має бути створений як перше MicroDAO у системі:

```sql
-- Створення DAARION.city team
INSERT INTO teams (
  id,
  name,
  slug,
  type,
  mode,
  description,
  created_at
) VALUES (
  'daarion-city',
  'DAARION.city',
  'daarion',
  'city',  -- A1-level
  'public',
  'Офіційна спільнота міста DAARION',
  NOW()
);

-- Створення публічного каналу
INSERT INTO channels (
  id,
  team_id,
  title,
  slug,
  type,
  is_public,
  created_at
) VALUES (
  'daarion-city-general',
  'daarion-city',
  'Загальний канал міста',
  'general',
  'public',
  true,
  NOW()
);

-- Створення міського агента DAARWIZZ
INSERT INTO agents (
  id,
  team_id,
  name,
  role,
  system_prompt,
  memory_scope,
  created_at
) VALUES (
  'daarion-city-agent',
  'daarion-city',
  'DAARWIZZ',
  'team_assistant',
  'Ти — міський асистент DAARION.city. Допомагаєш мешканцям та гостям міста.',
  'team',
  NOW()
);
```

### 2.2 Hierarchy

```
A1: DAARION.city (root DAO, DAARWIZZ agent)
  ├── A2: Міські платформи
  │   ├── Helion (енергетика)
  │   ├── GreenFood ERP (агро/харчові продукти)
  │   ├── Soul (соціальна система)
  │   ├── Dario (міські сервіси)
  │   ├── Nutra (здоровʼя і нутриція)
  │   └── WaterAGI (вода та очищення)
  ├── A3: Публічні MicroDAO
  └── A4: Приватні MicroDAO
```

---

## 3. Tokenomics Integration

### 3.1 Access Requirements

| Action | DAAR | DAARION |
|--------|------|---------|
| Доступ до платформ | ≥ 0 | - |
| Робота на платформах (вендори) | - | ≥ 0.01 staked |
| Створення платформи | - | ≥ 1.00 staked |
| Створення MicroDAO | ≥ 1.00 | ≥ 0.01 |

### 3.2 Token Flow

```text
USDT/POL → DAAR → DAARION → DAO → DAGI → Rewards in DAAR
```

### 3.3 Integration Points

- **Wallet Service** — баланси DAAR/DAARION, staking, fees
- **PDP** — token-gating перевірки
- **DAOFactory** — створення MicroDAO (1 DAAR або 0.01 DAARION)
- **TokenBridge** — обмін UTIL ↔ DAAR

---

## 4. Public Channel API

### 4.1 Endpoints

```http
# Отримати інформацію про публічний канал
GET /api/v1/channels/{slug}/public

# Отримати повідомлення
GET /api/v1/channels/{slug}/public/messages?limit=50&before={message_id}

# Надіслати повідомлення (authenticated)
POST /api/v1/channels/{slug}/public/messages
Authorization: Bearer {token}

# Приєднатися до каналу
POST /api/v1/channels/{slug}/public/join
```

### 4.2 Authentication Flow

1. **Guest View** — read-only доступ до повідомлень
2. **Join Modal** — форма: Email, Ім'я, Тип участі (Member/Visitor)
3. **Authenticated View** — повний доступ до каналу

---

## 5. Website Integration

### 5.1 Embedded Widget

```tsx
<MicroDAOChannelEmbed
  channelSlug="general"
  teamSlug="daarion"
  apiUrl="https://api.microdao.xyz/v1"
  theme="light"
  showHeader={true}
  allowJoin={true}
/>
```

### 5.2 Next.js Page Example

```tsx
// pages/channel/[slug].tsx
import { MicroDAOChannelEmbed } from '@/components/MicroDAOChannelEmbed';
import Head from 'next/head';

export default function ChannelPage({ channelSlug }) {
  return (
    <>
      <Head>
        <title>Загальний канал міста DAARION.city</title>
        <meta name="description" content="Публічний канал для обговорення міських питань" />
      </Head>
      
      <div className="container mx-auto py-8">
        <MicroDAOChannelEmbed
          channelSlug={channelSlug}
          teamSlug="daarion"
          apiUrl={process.env.NEXT_PUBLIC_MICRODAO_API_URL}
          theme="light"
          showHeader={true}
          allowJoin={true}
        />
      </div>
    </>
  );
}
```

---

## 6. Security & Privacy

### 6.1 CORS Configuration

```typescript
const corsOptions = {
  origin: [
    'https://daarion.city',
    'https://www.daarion.city',
    'http://localhost:3000' // для розробки
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 6.2 Rate Limiting

- **Guest (read-only):** 100 requests/minute
- **Authenticated (write):** 30 messages/minute
- **Join requests:** 5 requests/hour per IP

### 6.3 Content Moderation

- Автоматична модерація через Agent
- Фільтрація спаму
- Блокування токсичного контенту
- Можливість скарг від користувачів

---

## 7. Implementation Checklist

### Backend

- [ ] Створити DAARION.city team у БД (type='city', slug='daarion')
- [ ] Створити публічний канал (slug='general')
- [ ] Створити міського агента DAARWIZZ
- [ ] Реалізувати Public Channel API endpoints
- [ ] Налаштувати CORS для `daarion.city`
- [ ] Додати rate limiting для публічного каналу
- [ ] Інтегрувати token-gating (PDP перевірки DAAR/DAARION)

### Frontend

- [ ] Створити React компонент `MicroDAOChannelEmbed`
- [ ] Інтегрувати з API
- [ ] Додати authentication flow
- [ ] Додати real-time оновлення (WebSocket/SSE)
- [ ] Додати SEO метадані (Open Graph, Twitter Cards)
- [ ] Додати analytics tracking

### Integration

- [ ] Додати компонент на сторінку `daarion.city/channel/general`
- [ ] Налаштувати SEO метадані
- [ ] Додати analytics tracking
- [ ] Тестування на production

---

## 8. Key Integration Points

### 8.1 Wallet Service

- Баланси DAAR / DAARION
- Fee accounting (0.5%)
- DAOFactory calls
- Staking (DAAR: 20% APR, DAARION: 4% + revenue share)
- Token exchange

### 8.2 PDP (Policy Decision Point)

- Token-gating перевірки
- Access control на основі DAAR/DAARION
- Capability checks
- Team-level ACL

### 8.3 Agents

- DAARWIZZ як системний агент A1-рівня
- Платформенні агенти (A2-рівень)
- Team Assistant агенти (A3-A4 рівні)

### 8.4 DAGI Registry

- DAO registration
- Agent slots
- Knowledge mining rewards
- Off-chain/on-chain settlement

---

## 9. Testing

### 9.1 Backend Tests

- [ ] Публічний канал створено для DAARION.city
- [ ] API endpoints повертають коректні дані
- [ ] CORS налаштовано правильно
- [ ] Rate limiting працює
- [ ] Authentication flow працює
- [ ] Token-gating перевірки працюють

### 9.2 Frontend Tests

- [ ] Widget завантажується на сайті
- [ ] Повідомлення відображаються коректно
- [ ] Join flow працює
- [ ] Real-time оновлення працюють
- [ ] Responsive design на мобільних

### 9.3 Integration Tests

- [ ] SEO метадані відображаються
- [ ] Analytics tracking працює
- [ ] Content moderation працює
- [ ] Error handling коректний

---

## 10. References

### Core Documents

- `docs/cursor/50_daarion_city_website_integration.md` — детальна інтеграція з сайтом
- `docs/cursor/DAARION_city_integration.md` — архітектура інтеграції
- `docs/cursor/32_policy_service_PDP_design.md` — PDP design
- `docs/cursor/24_access_keys_capabilities_system.md` — Access Keys & Capabilities
- `docs/cursor/49_wallet_rwa_payouts_claims.md` — Wallet Service

### Tokenomics

- `docs/tokenomics/city-tokenomics.md` ⭐ — канонічна токеноміка міста (v1.0.0)
  > **Примітка:** Це єдиний актуальний документ з токеноміки. Попередній `tokenomics/README.md` перенесено в `docs/_archive/tokenomics_legacy_v0.md`.

### API

- `docs/cursor/03_api_core_snapshot.md` — API контракти

---

## 11. Support

Для питань та підтримки:

- Документація: `docs/cursor/README.md`
- Контекст проєкту: `PROJECT_CONTEXT.md`
- Швидкий старт: `docs/cursor/50_daarion_city_website_integration.md`

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*

