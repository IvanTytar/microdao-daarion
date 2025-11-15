# Інструкції для налаштування на сервері

Цей документ описує, як завантажити та налаштувати проєкт на сервері після push у GitHub.

## Передумови

1. GitHub репозиторій вже містить код та документацію
2. На сервері встановлено Git
3. SSH доступ до сервера налаштовано

## Крок 1: Клонування репозиторію

```bash
cd /opt
sudo git clone git@github.com:daarion/dagi-stack.git
# або для HTTPS:
sudo git clone https://github.com/daarion/dagi-stack.git
```

## Крок 2: Перевірка структури

```bash
cd /opt/dagi-stack
ls -la
tree docs/  # якщо встановлено tree
```

Очікувана структура:
```
/opt/dagi-stack/
├── docs/
│   ├── microdao/
│   ├── daarion/
│   ├── agents/
│   └── cursor/
├── src/
└── package.json
```

## Крок 3: Оновлення (коли є нові зміни)

```bash
cd /opt/dagi-stack
sudo git pull origin main
```

## Крок 4: Використання документації

### Для DAGI Router
Документація знаходиться в `/opt/dagi-stack/docs/` — можна використовувати як джерело знань.

### Для microDAO RBAC
Використовуй документи з `/opt/dagi-stack/docs/microdao/`:
- `rbac.md` — система ролей та доступів
- `access-keys-capabilities.md` — ключі доступу

### Для DAARION.city
Використовуй документи з `/opt/dagi-stack/docs/daarion/`:
- `tokenomics-city.md` — токеноміка
- `platforms-catalog.md` — каталог платформ
- `integration-microdao.md` — інтеграція

## Крок 5: Інтеграція з Docusaurus/MkDocs (опціонально)

Якщо хочеш публічну документацію:

```bash
cd /opt/dagi-stack
npm install  # якщо є package.json з Docusaurus
npm run build
```

Або з MkDocs:
```bash
pip install mkdocs mkdocs-material
mkdocs build
```

## Автоматичне оновлення (опціонально)

Створи cron job для автоматичного оновлення:

```bash
sudo crontab -e
```

Додай:
```
0 2 * * * cd /opt/dagi-stack && git pull origin main > /dev/null 2>&1
```

Це оновлюватиме репозиторій щодня о 2:00 ночі.

## Troubleshooting

### Помилка: "Permission denied"
```bash
sudo chown -R $USER:$USER /opt/dagi-stack
```

### Помилка: "git pull requires authentication"
Налаштуй SSH ключ на сервері або використовуй HTTPS з токеном:
```bash
git config --global credential.helper store
```

### Помилка: "detached HEAD"
```bash
git checkout main
```

---

**Останнє оновлення:** 2024-11-14

