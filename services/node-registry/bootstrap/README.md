# Node Bootstrap Agent

Автоматична реєстрація ноди в Node Registry та підтримка heartbeat.

## Використання

### Локальний запуск

```bash
# Встановити залежності
pip install -r requirements.txt

# Запустити агент
python node_bootstrap.py
```

### З конфігурацією

```bash
# Налаштувати через змінні середовища
export NODE_REGISTRY_URL="http://144.76.224.179:9205"
export NODE_ROLE="development"
export NODE_TYPE="router"
export HEARTBEAT_INTERVAL="30"

python node_bootstrap.py
```

### Як systemd service (Linux)

Створити файл `/etc/systemd/system/node-bootstrap.service`:

```ini
[Unit]
Description=Node Bootstrap Agent
After=network.target

[Service]
Type=simple
User=daarion
Environment="NODE_REGISTRY_URL=http://144.76.224.179:9205"
Environment="NODE_ROLE=production"
Environment="NODE_TYPE=router"
WorkingDirectory=/opt/microdao/node-bootstrap
ExecStart=/usr/bin/python3 /opt/microdao/node-bootstrap/node_bootstrap.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запустити:

```bash
sudo systemctl daemon-reload
sudo systemctl enable node-bootstrap
sudo systemctl start node-bootstrap
sudo systemctl status node-bootstrap
```

### Як launchd service (macOS)

Створити файл `~/Library/LaunchAgents/com.daarion.node-bootstrap.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.daarion.node-bootstrap</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/apple/github-projects/microdao-daarion/services/node-registry/bootstrap/node_bootstrap.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_REGISTRY_URL</key>
        <string>http://144.76.224.179:9205</string>
        <key>NODE_ROLE</key>
        <string>development</string>
        <key>NODE_TYPE</key>
        <string>router</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/node-bootstrap.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/node-bootstrap.error.log</string>
</dict>
</plist>
```

Запустити:

```bash
launchctl load ~/Library/LaunchAgents/com.daarion.node-bootstrap.plist
launchctl start com.daarion.node-bootstrap
launchctl list | grep daarion
```

## Що робить агент?

1. **Збирає інформацію про систему**: CPU, RAM, диск, GPU, IP адреси
2. **Виявляє capabilities**: Docker, Ollama, GPU, доступні моделі
3. **Реєструє ноду** в Node Registry
4. **Підтримує heartbeat** кожні 30 секунд
5. **Автоматично перереєструється** якщо зв'язок втрачено

## Змінні середовища

- `NODE_REGISTRY_URL` - URL Node Registry (default: `http://localhost:9205`)
- `NODE_ROLE` - Роль ноди: `production`, `development`, `backup`, `worker` (default: `worker`)
- `NODE_TYPE` - Тип ноди: `router`, `gateway`, `worker`, `orchestrator` (default: `worker`)
- `HEARTBEAT_INTERVAL` - Інтервал heartbeat в секундах (default: `30`)

## Логи

Агент виводить детальні логи:

```
2025-11-23 10:00:00 - __main__ - INFO - 🚀 Initializing Node Bootstrap
2025-11-23 10:00:00 - __main__ - INFO - 📡 Registry URL: http://localhost:9205
2025-11-23 10:00:01 - __main__ - INFO - 📝 Registering node with registry...
2025-11-23 10:00:02 - __main__ - INFO - ✅ Node registered successfully: node-macbook-pro-a1b2c3d4
2025-11-23 10:00:02 - __main__ - INFO - 💓 Starting heartbeat loop (interval: 30s)
2025-11-23 10:00:32 - __main__ - DEBUG - 💓 Heartbeat sent: CPU=15.2% MEM=45.8%
```

