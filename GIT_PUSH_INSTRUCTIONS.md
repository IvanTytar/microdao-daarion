# Інструкції для Git Push

Цей документ описує, як завантажити документацію та код у GitHub репозиторій.

## Передумови

1. GitHub репозиторій створено (наприклад: `daarion/dagi-stack` або `daarion/microdao-daarion-docs`)
2. SSH ключ налаштовано для GitHub (або використовуєш HTTPS з токеном)

## Крок 1: Перевірка поточного стану

```bash
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"
git status
```

## Крок 2: Додавання файлів

### Варіант A: Додати все (рекомендовано для першого коміту)

```bash
git add .
```

### Варіант B: Додати тільки документацію

```bash
git add docs/
git add .gitignore
git add README.md
git add PROJECT_CONTEXT.md
```

## Крок 3: Коміт

```bash
git commit -m "chore: organize documentation structure for monorepo

- Create /docs structure (microdao, daarion, agents)
- Organize 61 cursor docs
- Add README files for each category
- Copy key documents to public categories"
```

## Крок 4: Налаштування remote (якщо ще не налаштовано)

### Для SSH:
```bash
git remote add origin git@github.com:daarion/dagi-stack.git
```

### Для HTTPS:
```bash
git remote add origin https://github.com/daarion/dagi-stack.git
```

### Перевірка remote:
```bash
git remote -v
```

## Крок 5: Push у GitHub

```bash
git branch -M main
git push -u origin main
```

Якщо виникають конфлікти або remote вже існує:
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## Структура після push

```
daarion/dagi-stack/
├── docs/
│   ├── microdao/          # MicroDAO документація
│   │   ├── README.md
│   │   ├── architecture.md
│   │   ├── rbac.md
│   │   └── access-keys-capabilities.md
│   ├── daarion/           # DAARION.city документація
│   │   ├── README.md
│   │   ├── integration-microdao.md
│   │   ├── platforms-catalog.md
│   │   └── tokenomics-city.md
│   ├── agents/            # Агентська система
│   │   └── README.md
│   ├── cursor/            # Технічна документація (61 документ)
│   │   └── [61 файлів]
│   ├── tokenomics/        # Токеноміка
│   └── README.md          # Головний README
├── src/                   # Код проєкту
├── package.json
└── README.md
```

## Наступні кроки

### На сервері (після push у GitHub)

```bash
cd /opt
sudo git clone git@github.com:daarion/dagi-stack.git
# або
sudo git clone https://github.com/daarion/dagi-stack.git

cd dagi-stack
```

### Оновлення на сервері (коли є нові зміни)

```bash
cd /opt/dagi-stack
sudo git pull origin main
```

## Troubleshooting

### Помилка: "remote origin already exists"
```bash
git remote remove origin
git remote add origin git@github.com:daarion/dagi-stack.git
```

### Помилка: "failed to push some refs"
```bash
git pull origin main --rebase
git push -u origin main
```

### Помилка: "permission denied"
Перевір SSH ключ:
```bash
ssh -T git@github.com
```

Або використовуй HTTPS з Personal Access Token.

---

**Останнє оновлення:** 2024-11-14

