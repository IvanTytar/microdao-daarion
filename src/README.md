# MicroDAO Frontend - Структура проекту

## Структура каталогів

```
src/
  api/              # API клієнти та типи
    client.ts       # Базовий API клієнт
    auth.ts         # Авторизація
    teams.ts        # Спільноти
    channels.ts     # Канали
    agents.ts       # Агенти
  components/       # React компоненти
    onboarding/    # Компоненти онбордингу
      OnboardingStepper.tsx
      StepWelcome.tsx
      StepCreateTeam.tsx
      StepSelectMode.tsx
      StepCreateChannel.tsx
      StepAgentSettings.tsx
      StepInvite.tsx
  hooks/            # React hooks
    useOnboarding.ts
  pages/            # Сторінки
    OnboardingPage.tsx
  types/            # TypeScript типи
    api.ts
```

## Онбординг

Онбординг реалізовано як багатокроковий процес з 6 кроками:

1. **Ласкаво просимо** - привітальний екран
2. **Створити спільноту** - форма з назвою та описом
3. **Режим приватності** - вибір Public/Confidential
4. **Перший канал** - створення каналу
5. **Агент та пам'ять** - налаштування агента
6. **Запросити команду** - посилання-запрошення

## API Інтеграція

Всі API виклики типізовані та обробляють помилки. Базовий URL налаштовується через змінну середовища `VITE_API_URL` (за замовчуванням `https://api.microdao.xyz`).

## Наступні кроки

- Додати сторінку налаштувань (Settings)
- Реалізувати чат інтерфейс
- Додати публічний канал landing page
- Інтегрувати WebSocket для real-time оновлень

