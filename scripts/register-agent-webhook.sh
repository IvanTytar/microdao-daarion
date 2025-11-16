#!/bin/bash
# Register Telegram webhook for any agent
# Usage: ./register-agent-webhook.sh <agent_id> <bot_token> [domain]

set -e

AGENT_ID=$1
BOT_TOKEN=$2
DOMAIN=${3:-"gateway.daarion.city"}

if [ -z "$AGENT_ID" ] || [ -z "$BOT_TOKEN" ]; then
    echo "Usage: $0 <agent_id> <bot_token> [domain]"
    echo "Example: $0 helion 8112062582:AAG... gateway.daarion.city"
    exit 1
fi

WEBHOOK_URL="https://${DOMAIN}/${AGENT_ID}/telegram/webhook"

echo "🔗 Registering webhook for agent: $AGENT_ID"
echo "📍 Webhook URL: $WEBHOOK_URL"

# Set webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -d "url=${WEBHOOK_URL}" \
    -d "drop_pending_updates=true" \
    -d "allowed_updates=[\"message\",\"callback_query\"]")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Verify webhook
echo ""
echo "✅ Verifying webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq '.' 2>/dev/null || echo "Install jq for pretty output"

echo ""
echo "🧪 Test your bot by sending a message in Telegram!"
