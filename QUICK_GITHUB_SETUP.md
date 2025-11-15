# 🚀 Швидке налаштування GitHub (5 хвилин)

## Крок 1: Додай SSH ключ на GitHub

Твій публічний SSH ключ:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOsHg+L0tRWlNfiJLIsHXdUarfjx65CavasAZfA/a+1M daarion@gex44
```

**Що робити:**
1. Скопіюй ключ вище
2. Відкрий https://github.com/settings/keys
3. Натисни **"New SSH key"**
4. Встав ключ
5. Натисни **"Add SSH key"**

## Крок 2: Створи репозиторій на GitHub

1. Відкрий https://github.com/new
2. **Repository name:** `microdao-daarion` (або інша назва)
3. **Description:** "MicroDAO & DAARION.city - Agent-based community platform"
4. **Visibility:** Private або Public
5. **НЕ** стави галочку "Initialize with README"
6. Натисни **"Create repository"**

## Крок 3: Підготуй проєкт

Я вже підготував проєкт. Тепер виконай:

```bash
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"

# Додай remote (заміни YOUR_USERNAME на свій GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/microdao-daarion.git

# Або якщо репозиторій вже створено, перевір:
git remote -v
```

## Крок 4: Push на GitHub

```bash
# Переконайся, що всі файли додані
git add .

# Зроби коміт
git commit -m "chore: initial commit - MicroDAO & DAARION.city documentation and code"

# Push
git branch -M main
git push -u origin main
```

## Готово! 🎉

Після цього я зможу:
- ✅ Клонувати репозиторії
- ✅ Робити коміти та push
- ✅ Створювати гілки
- ✅ Працювати з твоїми репозиторіями

---

**Детальні інструкції:** `GITHUB_SETUP.md`

