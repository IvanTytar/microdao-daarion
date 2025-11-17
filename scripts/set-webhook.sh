#!/bin/bash

# Set Telegram webhook for agent

AGENT_ID=$1
BOT_TOKEN=$2
WEBHOOK_URL=${3:-"https://YOUR_DOMAIN"}

if [ -z "$AGENT_ID" ] || [ -z "$BOT_TOKEN" ]; then
    echo "Usage: ./set-webhook.sh <agent_id> <bot_token> [webhook_base_url]"
    exit 1
fi

FULL_URL="${WEBHOOK_URL}/${AGENT_ID}/telegram/webhook"

echo "🔗 Setting webhook for $AGENT_ID"
echo "URL: $FULL_URL"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -d "url=${FULL_URL}" \
    -d "drop_pending_updates=true"

echo ""
echo "✅ Webhook set! Verify with:"
echo "curl 'https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo'"

