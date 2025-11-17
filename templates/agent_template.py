# Template for adding new agent to http_api.py

# {AGENT_NAME} Configuration
{AGENT_NAME}_TELEGRAM_BOT_TOKEN = os.getenv("{AGENT_NAME}_TELEGRAM_BOT_TOKEN", "")
{AGENT_NAME}_NAME = os.getenv("{AGENT_NAME}_NAME", "{agent_display_name}")
{AGENT_NAME}_PROMPT_PATH = os.getenv("{AGENT_NAME}_PROMPT_PATH", "gateway-bot/{prompt_file}")

def load_{agent_id}_prompt() -> str:
    try:
        with open({AGENT_NAME}_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load {agent_display_name} prompt: {e}")
        return "{agent_display_name} system prompt."

{AGENT_NAME}_SYSTEM_PROMPT = load_{agent_id}_prompt()

@app.post("/{agent_id}/telegram/webhook")
async def {agent_id}_telegram_webhook(update: TelegramUpdate):
    """Webhook for {agent_display_name} Telegram bot"""
    chat_id = None
    try:
        if not update.message:
            raise HTTPException(status_code=400, detail="No message in update")
        
        chat_id = update.message.chat.id
        user_id = f"tg:{update.message.from_user.id}"
        text = update.message.text or ""
        
        # Fetch memory context
        memory_context = ""
        try:
            mem_resp = httpx.get(
                f"{MEMORY_SERVICE_URL}/memory/{user_id}",
                timeout=5.0
            )
            if mem_resp.status_code == 200:
                memory_data = mem_resp.json()
                memory_context = memory_data.get("context", "")
        except Exception as e:
            logger.warning(f"Memory fetch failed: {e}")
        
        # Prepare router request
        router_payload = {
            "mode": "chat",
            "message": text,
            "agent": "{agent_id}",
            "metadata": {
                "platform": "telegram",
                "chat_id": chat_id,
                "user_id": user_id
            },
            "payload": {
                "context": {
                    "memory": memory_context,
                    "system_prompt": {AGENT_NAME}_SYSTEM_PROMPT
                }
            }
        }
        
        # Call router
        router_resp = httpx.post(
            f"{ROUTER_URL}/route",
            json=router_payload,
            timeout=60.0
        )
        router_resp.raise_for_status()
        result = router_resp.json()
        
        answer = result.get("answer", "No response")
        
        # Save to memory
        try:
            httpx.post(
                f"{MEMORY_SERVICE_URL}/memory/{user_id}",
                json={"message": text, "response": answer},
                timeout=5.0
            )
        except Exception as e:
            logger.warning(f"Memory save failed: {e}")
        
        # Send response
        send_telegram_message({AGENT_NAME}_TELEGRAM_BOT_TOKEN, chat_id, answer)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error in {agent_id} webhook: {e}", exc_info=True)
        if chat_id:
            send_telegram_message(
                {AGENT_NAME}_TELEGRAM_BOT_TOKEN,
                chat_id,
                f"Помилка: {str(e)}"
            )
        raise HTTPException(status_code=500, detail=str(e))

