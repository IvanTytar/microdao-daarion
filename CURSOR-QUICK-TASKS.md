# Cursor Quick Tasks - Setup Telegram Bot Agents

Цей файл містить 4 завдання для налаштування системи Telegram бот-агентів у DAGI Gateway.

---

## Завдання 1: Створити скрипт для додавання нового агента

**Файл:** `scripts/add-agent.sh`

**Опис:** Універсальний скрипт для додавання нового Telegram бот-агента до DAGI Gateway.

**Що робить:**
- Оновлює `.env` з конфігурацією агента
- Генерує код для додавання до `gateway-bot/http_api.py`
- Виводить інструкції для наступних кроків

**Використання:**
```bash
./scripts/add-agent.sh <AGENT_NAME> <BOT_TOKEN> <PROMPT_FILE>
```

**Приклад:**
```bash
./scripts/add-agent.sh Helion 8112062582:AAG... helion_prompt.txt
```

---

## Завдання 2: Створити скрипт для встановлення webhook

**Файл:** `scripts/set-webhook.sh`

**Опис:** Скрипт для встановлення Telegram webhook для агента.

**Що робить:**
- Перевіряє обов'язкові параметри (agent_id та bot_token)
- Формує повний URL для webhook
- Відправляє запит до Telegram API для встановлення webhook
- Показує команду для перевірки статусу webhook

**Використання:**
```bash
./scripts/set-webhook.sh <agent_id> <bot_token> [webhook_base_url]
```

**Приклад:**
```bash
./scripts/set-webhook.sh helion 8112062582:AAG... https://api.microdao.xyz
```

---

## Завдання 3: Створити шаблон для агента

**Файл:** `templates/agent_template.py`

**Опис:** Шаблон коду для додавання нового агента до `http_api.py`.

**Що містить:**
- Конфігурацію змінних середовища для агента
- Функцію завантаження промпту з файлу
- Webhook-ендпоінт для Telegram
- Інтеграцію з Memory Service для збереження контексту
- Інтеграцію з Router для обробки повідомлень
- Обробку помилок з відправкою повідомлень користувачу

**Плейсхолдери для заміни:**
- `{AGENT_NAME}` — ім'я агента у верхньому регістрі (для змінних)
- `{agent_id}` — ідентифікатор агента у нижньому регістрі (для URL та функцій)
- `{agent_display_name}` — відображуване ім'я агента
- `{prompt_file}` — назва файлу з промптом

---

## Завдання 4: Створити production-рішення для масштабування

**Файли:**
- `scripts/setup-nginx-gateway.sh` — налаштування nginx reverse proxy з Let's Encrypt
- `scripts/register-agent-webhook.sh` — реєстрація webhook для будь-якого агента

**Опис:** Production-ready рішення для масштабування тисяч агентів.

**Що робить `setup-nginx-gateway.sh`:**
- Встановлює certbot для Let's Encrypt
- Отримує SSL сертифікат для домену
- Налаштовує nginx reverse proxy з HTTPS
- Налаштовує автоматичне оновлення сертифікатів
- Підтримує всіх агентів на підшляхах: `/{agent_id}/telegram/webhook`

**Використання:**
```bash
# На сервері як root
sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city 9300
```

**Що робить `register-agent-webhook.sh`:**
- Реєструє webhook для будь-якого агента через Telegram API
- Автоматично перевіряє статус webhook
- Підтримка jq для красивого виводу

**Використання:**
```bash
./scripts/register-agent-webhook.sh <agent_id> <bot_token> [domain]
```

**Приклад:**
```bash
./scripts/register-agent-webhook.sh helion 8112062582:AAG... gateway.daarion.city
```

---

## Додаткові файли (створені автоматично)

- `scripts/setup-ngrok.sh` — налаштування ngrok тунелю (для тестування)
- `scripts/setup-cloudflare-tunnel.sh` — налаштування CloudFlare Tunnel
- `scripts/README-TUNNELS.md` — документація з налаштування тунелів
- `scripts/QUICK-SETUP.md` — швидкий гайд
- `docs/HELION-QUICKSTART.md` — документація для Helion агента

---

## Перевірка виконання

Після виконання всіх завдань перевірте:

```bash
# Перевірте наявність скриптів
ls -lh scripts/add-agent.sh scripts/set-webhook.sh scripts/setup-nginx-gateway.sh scripts/register-agent-webhook.sh

# Перевірте наявність шаблону
ls -lh templates/agent_template.py

# Перевірте права на виконання
chmod +x scripts/*.sh
```

---

## Наступні кроки

1. Додайте агента: `./scripts/add-agent.sh Helion <TOKEN> helion_prompt.txt`
2. Налаштуйте HTTPS gateway: `sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city 9300`
3. Зареєструйте webhook: `./scripts/register-agent-webhook.sh helion <TOKEN> gateway.daarion.city`
4. Перевірте: `curl https://gateway.daarion.city/health`
