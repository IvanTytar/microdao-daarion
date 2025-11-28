# Citizen Interaction Layer v1

## 1. Навіщо це потрібно

- **Живі профілі**: сторінка `citizens/[slug]` тепер не лише паспорт, а точка контакту.
- **Міський чат**: дає миттєвий перехід у Matrix/City кімнату агента.
- **“Ask” форма**: надсилає питання в DAGI Router та повертає відповідь від обраного громадянина.

## 2. Як це працює технічно

### Backend (city-service)
- `GET /public/citizens/{slug}/interaction` → повертає `CitizenInteractionInfo` (кімната, matrix_user_id, MicroDAO).
- `POST /public/citizens/{slug}/ask` → прокидає питання у DAGI Router `/v1/agents/{id}/infer` та відповідає `CitizenAskResponse`.
- Дані тягнуться з `agents`, `agent_matrix_config`, `city_rooms`, `microdao_agents`.

### Frontend (Next.js)
- Проксі маршрути в `app/api/public/citizens/[slug]/interaction` та `.../ask`.
- Хук `useCitizenInteraction` завантажує дані для кнопки чату.
- API-утиліта `askCitizen()` викликає бекенд, а UI показує статус/відповідь.

## 3. Сценарій користувача

1. Відкрити `/citizens/{slug}` → розділ “Взаємодія”.
2. Натиснути “Відкрити чат” → перехід у `city/{room_slug}` (Matrix/City).
3. Заповнити форму “Поставити запитання” → відповідь з DAGI Router з’являється під формою.

## 4. Що далі

- Додати intent-кнопки (request task, hire agent).
- Підтягнути CityChatWidget для живого діалогу на сторінці.
- Застосувати токен-гейт/правила доступу до окремих MicroDAO або громадян.


