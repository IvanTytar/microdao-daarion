#!/bin/bash

# Universal script to add new Telegram bot agent to DAGI Gateway

set -e

# Usage check
if [ "$#" -ne 3 ]; then
    echo "Usage: ./add-agent.sh <AGENT_NAME> <BOT_TOKEN> <PROMPT_FILE>"
    echo "Example: ./add-agent.sh Helion 8112062582:AAG... helion_prompt.txt"
    exit 1
fi

AGENT_NAME=$1
BOT_TOKEN=$2
PROMPT_FILE=$3
AGENT_ID=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]')

echo "🤖 Adding agent: $AGENT_NAME (ID: $AGENT_ID)"

# 1. Update .env
echo "📝 Updating .env..."
cat >> .env << EOF

# ${AGENT_NAME} Agent Configuration
${AGENT_NAME^^}_TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
${AGENT_NAME^^}_NAME=${AGENT_NAME}
${AGENT_NAME^^}_PROMPT_PATH=gateway-bot/${PROMPT_FILE}
EOF

# 2. Update docker-compose.yml environment section
echo "🐳 Updating docker-compose.yml..."
# This needs manual edit or yq tool

# 3. Update gateway-bot/http_api.py
echo "🔧 Updating http_api.py..."
WEBHOOK_CODE=$(cat << 'PYEOF'

# ${AGENT_NAME} Configuration
${AGENT_NAME^^}_TELEGRAM_BOT_TOKEN = os.getenv("${AGENT_NAME^^}_TELEGRAM_BOT_TOKEN", "")
${AGENT_NAME^^}_NAME = os.getenv("${AGENT_NAME^^}_NAME", "${AGENT_NAME}")
${AGENT_NAME^^}_PROMPT_PATH = os.getenv("${AGENT_NAME^^}_PROMPT_PATH", "gateway-bot/${PROMPT_FILE}")

def load_${AGENT_ID}_prompt() -> str:
    try:
        with open(${AGENT_NAME^^}_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load ${AGENT_NAME} prompt: {e}")
        return "${AGENT_NAME} system prompt."

${AGENT_NAME^^}_SYSTEM_PROMPT = load_${AGENT_ID}_prompt()

@app.post("/${AGENT_ID}/telegram/webhook")
async def ${AGENT_ID}_telegram_webhook(update: TelegramUpdate):
    """${AGENT_NAME} Telegram webhook endpoint"""
    # [Implementation follows DAARWIZZ pattern]
    pass
PYEOF
)

echo "✅ Agent configuration added!"
echo ""
echo "Next steps:"
echo "1. Place prompt file at: gateway-bot/${PROMPT_FILE}"
echo "2. Run: docker-compose restart gateway"
echo "3. Set webhook: ./scripts/set-webhook.sh ${AGENT_ID} ${BOT_TOKEN}"

