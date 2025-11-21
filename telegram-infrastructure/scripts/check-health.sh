#!/bin/bash
# Health check script for telegram-gateway
# Перевіряє статус всіх сервісів

set -e

echo "🏥 Health Check for Telegram Infrastructure"
echo "=========================================="

# Check telegram-gateway
echo -n "📡 telegram-gateway: "
if curl -s http://localhost:8000/healthz > /dev/null; then
    echo "✅ OK"
    curl -s http://localhost:8000/bots/list | jq .
else
    echo "❌ FAILED"
fi

# Check NATS
echo -n "📨 NATS: "
if docker ps | grep -q nats; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check telegram-bot-api
echo -n "🤖 telegram-bot-api: "
if docker ps | grep -q telegram-bot-api; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check registered bots
echo ""
echo "📋 Registered Bots:"
curl -s http://localhost:8000/bots/list | jq -r '.bots[]' | while read bot; do
    echo "  - $bot"
done

echo ""
echo "✅ Health check complete!"

