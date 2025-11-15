# Налаштування GitHub для автоматичної роботи

Цей документ описує, як налаштувати доступ до GitHub, щоб Cursor AI міг працювати з твоїми репозиторіями.

## Варіант 1: SSH ключі (рекомендовано)

### Крок 1: Перевірка наявних SSH ключів

```bash
ls -la ~/.ssh
```

Шукай файли `id_rsa`, `id_ed25519` або подібні.

### Крок 2: Створення нового SSH ключа (якщо немає)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Натисни Enter для використання стандартного шляху (`~/.ssh/id_ed25519`).  
Можеш ввести пароль або залишити порожнім (менш безпечно, але зручніше).

### Крок 3: Додавання SSH ключа до ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Крок 4: Копіювання публічного ключа

```bash
cat ~/.ssh/id_ed25519.pub
```

Скопіюй весь вивід (починається з `ssh-ed25519 ...`).

### Крок 5: Додавання ключа на GitHub

1. Відкрий https://github.com/settings/keys
2. Натисни **"New SSH key"**
3. **Title:** наприклад, "MacBook Pro - Cursor AI"
4. **Key:** встав скопійований публічний ключ
5. Натисни **"Add SSH key"**

### Крок 6: Перевірка підключення

```bash
ssh -T git@github.com
```

Маєш побачити:
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## Варіант 2: Personal Access Token (альтернатива)

Якщо SSH не працює, використовуй HTTPS з токеном.

### Крок 1: Створення Personal Access Token

1. Відкрий https://github.com/settings/tokens
2. Натисни **"Generate new token"** → **"Generate new token (classic)"**
3. **Note:** "Cursor AI - MicroDAO Project"
4. **Expiration:** вибери термін (або "No expiration" для постійного доступу)
5. **Scopes:** обери:
   - ✅ `repo` (повний доступ до репозиторіїв)
   - ✅ `workflow` (якщо потрібні GitHub Actions)
6. Натисни **"Generate token"**
7. **ВАЖЛИВО:** Скопіюй токен одразу (він показується тільки один раз!)

### Крок 2: Збереження токену

```bash
# Додай токен до git config (локально для цього проєкту)
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"
git config credential.helper store
```

При першому `git push` введи:
- **Username:** твій GitHub username
- **Password:** встав токен (не пароль!)

Або створи файл `~/.git-credentials`:
```
https://YOUR_TOKEN@github.com
```

---

## Створення репозиторію на GitHub

### Варіант A: Через веб-інтерфейс (найпростіше)

1. Відкрий https://github.com/new
2. **Repository name:** `microdao-daarion` або `dagi-stack`
3. **Description:** "MicroDAO & DAARION.city - Agent-based community platform"
4. **Visibility:** Private або Public (на твій вибір)
5. **НЕ** стави галочки на "Initialize with README" (у нас вже є файли)
6. Натисни **"Create repository"**

### Варіант B: Через GitHub CLI (якщо встановлено)

```bash
gh repo create microdao-daarion --private --source=. --remote=origin --push
```

---

## Підготовка проєкту до push

### Крок 1: Додавання всіх файлів

```bash
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"
git add .
```

### Крок 2: Коміт

```bash
git commit -m "chore: organize documentation and prepare for GitHub

- Create /docs structure (microdao, daarion, agents)
- Organize 61 cursor docs
- Add README files for each category
- Copy key documents to public categories
- Add setup instructions"
```

### Крок 3: Додавання remote

**Для SSH:**
```bash
git remote add origin git@github.com:YOUR_USERNAME/microdao-daarion.git
```

**Для HTTPS:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/microdao-daarion.git
```

### Крок 4: Push

```bash
git branch -M main
git push -u origin main
```

---

## Автоматизація для Cursor AI

Після налаштування SSH або токену, я зможу:

1. ✅ Клонувати репозиторії
2. ✅ Створювати нові гілки
3. ✅ Робити коміти та push
4. ✅ Створювати pull requests (через GitHub CLI або API)

### Перевірка доступу

Після налаштування, я можу виконати:

```bash
git remote -v  # перевірити remote
git push origin main  # протестувати push
```

---

## Troubleshooting

### Помилка: "Permission denied (publickey)"

1. Перевір, чи додано ключ на GitHub
2. Перевір, чи ключ додано до ssh-agent:
   ```bash
   ssh-add -l
   ```
3. Якщо немає, додай:
   ```bash
   ssh-add ~/.ssh/id_ed25519
   ```

### Помилка: "remote origin already exists"

```bash
git remote remove origin
git remote add origin git@github.com:YOUR_USERNAME/microdao-daarion.git
```

### Помилка: "failed to push some refs"

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

**Останнє оновлення:** 2024-11-14

