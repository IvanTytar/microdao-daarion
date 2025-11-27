#!/usr/bin/env bash
#
# Створює SSH-тунель до Prometheus на NODE1 (порт 9090).
# Вимоги: налаштований SSH-доступ до root@144.76.224.179 (або іншого користувача з доступом).

set -euo pipefail

SSH_TARGET="${SSH_TARGET:-root@144.76.224.179}"
LOCAL_PORT="${LOCAL_PORT:-19090}"
REMOTE_PORT="${REMOTE_PORT:-9090}"

echo "🔐 Відкриваємо SSH-тунель: localhost:${LOCAL_PORT} → ${SSH_TARGET} (remote ${REMOTE_PORT})"
if lsof -Pi :"${LOCAL_PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  Порт ${LOCAL_PORT} вже зайнятий. Завершіть попередній тунель (pkill -f \"ssh .*${LOCAL_PORT}:localhost:${REMOTE_PORT}\")"
  exit 1
fi

ssh -fN -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" "${SSH_TARGET}"
echo "✅ Тунель активний. Prometheus NODE1 доступний на http://localhost:${LOCAL_PORT}"
echo "ℹ️  Закрити тунель: pkill -f \"ssh -fN -L ${LOCAL_PORT}:localhost:${REMOTE_PORT}\""

