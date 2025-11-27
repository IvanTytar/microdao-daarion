import httpx
import os

LLM_PROXY_URL = os.getenv("LLM_PROXY_URL", "http://llm-proxy:7007")

async def generate_response(model: str, messages: list[dict], max_tokens: int = 1000) -> str:
    """
    Call LLM Proxy to generate response
    
    Falls back to mock response if LLM Proxy is not available
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LLM_PROXY_URL}/internal/llm/proxy",
                headers={
                    "X-Internal-Secret": os.getenv("LLM_PROXY_SECRET", "dev-secret-token"),
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "metadata": {
                        "agent_id": "agent:runtime",
                        "microdao_id": "microdao:daarion"
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("content", "")
    except httpx.HTTPStatusError as e:
        print(f"⚠️ LLM Proxy HTTP error: {e.response.status_code}")
        return await generate_mock_response(messages)
    except httpx.ConnectError:
        print(f"⚠️ LLM Proxy not available, using mock response")
        return await generate_mock_response(messages)
    except Exception as e:
        print(f"⚠️ LLM error: {e}")
        return await generate_mock_response(messages)

async def generate_mock_response(messages: list[dict]) -> str:
    """
    Generate mock response based on user message
    
    This is used when LLM Proxy is not available (Phase 2 testing)
    """
    # Extract last user message
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "").lower()
            break
    
    # Simple keyword-based responses
    if "привіт" in user_message or "hello" in user_message or "hi" in user_message:
        return "Привіт! Я Sofia, асистент команди DAARION. Як можу допомогти?"
    
    if "допомож" in user_message or "help" in user_message:
        return "Звичайно! Я можу допомогти з:\n- Плануванням задач\n- Підсумуванням обговорень\n- Організацією проєктів\n- Відповідями на питання про систему\n\nПро що хочете поговорити?"
    
    if "дяку" in user_message or "thank" in user_message:
        return "Завжди радий допомогти! 😊"
    
    if "phase 2" in user_message or "фаза 2" in user_message:
        return "Phase 2 — це інтеграція агентів у Messenger! Я вже працюю через agent-runtime, agent-filter та DAGI Router. Це дозволяє мені автоматично відповідати на повідомлення в каналах. 🚀"
    
    if "?" in user_message:
        return "Це цікаве питання! На даний момент я використовую mock LLM (Phase 2 testing mode). Коли буде підключено справжній LLM Proxy, я зможу давати більш розгорнуті відповіді."
    
    # Default response
    return "Дякую за повідомлення! Я Sofia, і я тут щоб допомогти. Зараз працюю в тестовому режимі (Phase 2), але скоро буду підключена до повноцінного LLM. Що вас цікавить?"

