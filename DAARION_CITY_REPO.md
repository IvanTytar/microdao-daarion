# Робота з репозиторієм DAARION.city

## 🔗 Підключені репозиторії

### 1. MicroDAO (поточний проєкт)
- **Remote:** `origin`
- **URL:** `git@github.com:IvanTytar/microdao-daarion.git`
- **Призначення:** Код та документація MicroDAO

### 2. DAARION.city
- **Remote:** `daarion-city`
- **URL:** `git@github.com:DAARION-DAO/daarion-ai-city.git`
- **Призначення:** Офіційний сайт та код DAARION.city

---

## 📋 Команди для роботи з DAARION.city

### Перевірка статусу
```bash
# Перевірити доступні гілки
git ls-remote --heads daarion-city

# Перевірити поточний remote
git remote -v
```

### Клонування/Оновлення
```bash
# Клонувати репозиторій DAARION.city (якщо потрібно окремо)
git clone git@github.com:DAARION-DAO/daarion-ai-city.git

# Оновити інформацію про remote
git fetch daarion-city
```

### Створення гілки для DAARION.city
```bash
# Створити локальну гілку, що відстежує remote
git checkout -b daarion-city-main --track daarion-city/main

# Або створити нову гілку для змін
git checkout -b feature/console-integration daarion-city/main
```

### Push змін до DAARION.city
```bash
# Push поточної гілки до DAARION.city
git push daarion-city <branch-name>

# Push з встановленням upstream
git push -u daarion-city <branch-name>
```

### Створення Pull Request
```bash
# 1. Створити гілку зі змінами
git checkout -b feature/microdao-integration daarion-city/main

# 2. Внести зміни
# ... редагування файлів ...

# 3. Коміт та push
git add .
git commit -m "feat: integrate MicroDAO console"
git push -u daarion-city feature/microdao-integration

# 4. Створити PR через GitHub UI або CLI
gh pr create --repo DAARION-DAO/daarion-ai-city --base main --head feature/microdao-integration
```

---

## 🔄 Синхронізація між репозиторіями

### Варіант 1: Копіювання файлів
Якщо потрібно скопіювати файли з MicroDAO до DAARION.city:

```bash
# 1. Клонувати DAARION.city (якщо ще не клоновано)
cd /tmp
git clone git@github.com:DAARION-DAO/daarion-ai-city.git
cd daarion-ai-city

# 2. Скопіювати потрібні файли
cp -r /path/to/MicroDAO/src/components/console ./src/components/
cp /path/to/MicroDAO/src/pages/ConsolePage.tsx ./src/pages/

# 3. Коміт та push
git add .
git commit -m "feat: add MicroDAO console components"
git push origin main
```

### Варіант 2: Git Subtree (для спільних компонентів)
Якщо потрібно тримати спільні компоненти синхронізованими:

```bash
# Додати subtree з MicroDAO до DAARION.city
cd /path/to/daarion-ai-city
git subtree add --prefix=src/shared/microdao git@github.com:IvanTytar/microdao-daarion.git main --squash

# Оновити subtree
git subtree pull --prefix=src/shared/microdao git@github.com:IvanTytar/microdao-daarion.git main --squash
```

---

## 🎯 Типові сценарії

### Сценарій 1: Додати Console компонент до DAARION.city
```bash
# 1. У проєкті MicroDAO 3
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"

# 2. Створити гілку для змін
git checkout -b feature/console-component

# 3. Створити компонент
# ... створення компонента ...

# 4. Коміт у MicroDAO
git add .
git commit -m "feat: create Console component"
git push origin feature/console-component

# 5. Клонувати DAARION.city (якщо потрібно)
cd /tmp
git clone git@github.com:DAARION-DAO/daarion-ai-city.git
cd daarion-ai-city

# 6. Скопіювати компонент
cp -r "/Users/apple/Desktop/MicroDAO/MicroDAO 3/src/components/console" ./src/components/

# 7. Коміт та push до DAARION.city
git add .
git commit -m "feat: integrate MicroDAO Console component"
git push origin main
```

### Сценарій 2: Оновити документацію в обох репозиторіях
```bash
# 1. Оновити документацію в MicroDAO
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"
# ... редагування ...

git add docs/
git commit -m "docs: update integration guide"
git push origin main

# 2. Скопіювати оновлену документацію до DAARION.city
cd /tmp/daarion-ai-city
cp -r "/Users/apple/Desktop/MicroDAO/MicroDAO 3/docs/daarion" ./docs/

git add docs/
git commit -m "docs: sync DAARION documentation from MicroDAO"
git push origin main
```

---

## 🔐 Права доступу

Перевірка прав доступу:
```bash
# Перевірити доступ до DAARION.city
git ls-remote --heads daarion-city

# Якщо помилка "Permission denied", потрібно:
# 1. Перевірити SSH ключ на GitHub
# 2. Перевірити права доступу до репозиторію DAARION-DAO/daarion-ai-city
```

---

## 📝 Примітки

- **Не push'ити безпосередньо в main** — краще створювати гілки та PR
- **Синхронізація файлів** — можна використовувати скрипти або вручну копіювати
- **Версіонування** — зберігати версії компонентів для сумісності

---

**Останнє оновлення:** 2024-11-14

