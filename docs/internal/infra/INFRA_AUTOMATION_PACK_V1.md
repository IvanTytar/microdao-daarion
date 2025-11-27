# Infra Automation Pack v1

Infra Automation Pack v1 стандартизує документацію, логування та синхронізацію репозиторію на всіх нодах DAARION.

## 1. Docs
- Структура `/docs/public` + `/docs/internal` + `mkdocs.yml`.
- GitHub Actions `.github/workflows/docs.yml` збирає MkDocs і публікує сайт у гілку `gh-pages` (GitHub Pages увімкнути вручну).
- Dev залежності: `requirements-dev.txt` (`mkdocs`, `mkdocs-material`).

### Як запускається локально
```bash
pip install -r requirements-dev.txt
mkdocs serve
```

## 2. Logging Stack
- Конфігурації в `infra/logging/`:
  - `docker-compose.logging.yml`
  - `loki-config.yml`
  - `promtail-config.yml`
  - `grafana-provisioning/...`
- Запуск на NODE1 / NODE2:
```bash
cd /opt/microdao-daarion
sudo docker compose -f infra/logging/docker-compose.logging.yml up -d
```
- Доступ:
  - Loki: `http://<node>:3100`
  - Grafana: `http://<node>:3000` (логін admin / пароль налаштувати після першого запуску).

## 3. Daily Log Summary
- Скрипти `scripts/logs/generate_daily_summary.py` + `scripts/logs/daily_log_summary.sh`.
- Параметри через env (`LOKI_URL`, `LAB_NOTES_DIR`).
- Вихідні файли: `lab-notes/log_summary_YYYY-MM-DD.md`.

### Приклад cron-запису
```
0 6 * * * /opt/microdao-daarion/scripts/logs/daily_log_summary.sh >> /var/log/daarion_daily_log_summary.log 2>&1
```

### GitHub Actions (опціонально)
- `.github/workflows/log-notes.yml` — ручний запуск для пушу `lab-notes/` у `main`.

## 4. Docs Sync on Nodes
- Скрипт `scripts/docs/docs_sync.sh` виконує `git fetch` / `git pull` для `origin/main`.

### systemd unit (шаблон)
```
[Unit]
Description=Sync DAARION repo (docs + code)
After=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/microdao-daarion/scripts/docs/docs_sync.sh
User=daarion
Group=daarion

[Install]
WantedBy=multi-user.target
```

### Cron-варіант
```
*/15 * * * * /opt/microdao-daarion/scripts/docs/docs_sync.sh >> /var/log/daarion_docs_sync.log 2>&1
```

## 5. Подальші кроки
- Додати Jupyter-звіти (`lab-notes/*.ipynb`).
- Розширити Grafana dashboard (`infra/logging/grafana-provisioning/dashboards`).
- Інтегрувати Node Registry + DAIS метадані (agents vs nodes).

