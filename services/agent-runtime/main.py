from fastapi import FastAPI, HTTPException
from models import AgentInvocation, AgentBlueprint, ChannelMessage
from llm_client import generate_response
from messaging_client import get_channel_messages, post_message
from memory_client import query_memory, store_memory
from pep_client import pep_client
import asyncio
import json
import os

app = FastAPI(title="DAARION Agent Runtime", version="1.0.0")

# Configuration
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

# NATS client
nc = None
nats_available = False

@app.on_event("startup")
async def startup_event():
    """Initialize NATS connection and subscriptions"""
    global nc, nats_available
    print("🚀 Agent Runtime starting up...")
    
    # Try to connect to NATS
    try:
        import nats
        nc = await nats.connect(NATS_URL)
        nats_available = True
        print(f"✅ Connected to NATS at {NATS_URL}")
        
        # Subscribe to router invocations
        asyncio.create_task(subscribe_to_invocations())
    except Exception as e:
        print(f"⚠️ NATS not available: {e}")
        print("⚠️ Running in test mode (HTTP only)")
        nats_available = False

async def subscribe_to_invocations():
    """Subscribe to router.invoke.agent events"""
    if not nc:
        return
    
    try:
        sub = await nc.subscribe("router.invoke.agent")
        print("✅ Subscribed to router.invoke.agent")
        
        async for msg in sub.messages:
            try:
                invocation_data = json.loads(msg.data.decode())
                await handle_invocation(invocation_data)
            except Exception as e:
                print(f"❌ Error processing invocation: {e}")
                import traceback
                traceback.print_exc()
    except Exception as e:
        print(f"❌ Subscription error: {e}")

async def handle_invocation(invocation_data: dict):
    """
    Process agent invocation
    
    Flow:
    1. Load agent blueprint
    2. Load channel history
    3. Query memory
    4. Build LLM prompt
    5. Generate response
    6. Post to channel
    7. Store in memory (optional)
    """
    try:
        print(f"\n🤖 Processing agent invocation")
        invocation = AgentInvocation(**invocation_data)
        
        if invocation.entrypoint != "channel_message":
            print(f"⚠️ Ignoring non-channel_message invocation: {invocation.entrypoint}")
            return
        
        # Extract payload
        channel_id = invocation.payload.get("channel_id")
        microdao_id = invocation.payload.get("microdao_id")
        rewrite_prompt = invocation.payload.get("rewrite_prompt")
        
        if not channel_id:
            print(f"❌ No channel_id in payload")
            return
        
        print(f"📝 Agent: {invocation.agent_id}")
        print(f"📝 Channel: {channel_id}")
        print(f"📝 MicroDAO: {microdao_id}")
        
        # 1. Load agent blueprint
        blueprint = await load_agent_blueprint(invocation.agent_id)
        print(f"✅ Loaded blueprint: {blueprint.name} (model: {blueprint.model})")
        
        # 2. Load channel history
        messages = await get_channel_messages(channel_id, limit=50)
        if not messages:
            print(f"⚠️ No messages found in channel")
            return
        
        # 3. Get last human message
        last_human_msg = None
        for msg in reversed(messages):
            if msg.sender_type == "human":
                last_human_msg = msg
                break
        
        if not last_human_msg:
            print("⚠️ No human message found, skipping")
            return
        
        print(f"💬 User message: {last_human_msg.content[:100]}...")
        
        # 4. Query memory
        memory_results = await query_memory(
            invocation.agent_id,
            microdao_id or "microdao:daarion",
            last_human_msg.content
        )
        
        # 5. Build prompt
        system_prompt = blueprint.instructions
        if rewrite_prompt:
            system_prompt += f"\n\n{rewrite_prompt}"
            print(f"📝 Applied rewrite prompt (quiet hours)")
        
        llm_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add memory context if available
        if memory_results:
            memory_context = "\n\n".join([
                r.get("text", r.get("content", ""))
                for r in memory_results[:3]
            ])
            if memory_context:
                llm_messages.append({
                    "role": "system",
                    "content": f"Relevant knowledge:\n{memory_context}"
                })
                print(f"✅ Added {len(memory_results)} memory fragments to context")
        
        # Add recent conversation (last 10 messages)
        for msg in messages[-10:]:
            role = "assistant" if msg.sender_type == "agent" else "user"
            llm_messages.append({
                "role": role,
                "content": msg.content
            })
        
        print(f"📝 Built prompt with {len(llm_messages)} messages")
        
        # TODO Phase 4+: Parse tool calls from LLM response
        # If LLM wants to call a tool:
        # 1. Check permission via PEP:
        #    permitted = await pep_client.check_tool_permission(
        #        agent_id=invocation.agent_id,
        #        tool_id="projects.list",
        #        microdao_id=microdao_id
        #    )
        # 2. If denied, inform LLM in next turn
        # 3. If permitted, call toolcore
        
        # 6. Generate response
        print(f"🤔 Generating response...")
        response_text = await generate_response(
            blueprint.model,
            llm_messages,
            agent_id=invocation.agent_id,
            microdao_id=microdao_id or "microdao:daarion"
        )
        print(f"✅ Generated response: {response_text[:100]}...")
        
        # 7. Post to channel
        print(f"📤 Posting to channel...")
        success = await post_message(invocation.agent_id, channel_id, response_text)
        
        if success:
            print(f"✅ Agent {invocation.agent_id} replied successfully")
            
            # 8. Store in memory (optional)
            await store_memory(
                invocation.agent_id,
                microdao_id or "microdao:daarion",
                channel_id,
                {
                    "user_message": last_human_msg.content,
                    "agent_reply": response_text,
                    "timestamp": last_human_msg.created_at.isoformat()
                }
            )
        else:
            print(f"❌ Failed to post agent reply")
        
    except Exception as e:
        print(f"❌ Error handling invocation: {e}")
        import traceback
        traceback.print_exc()

async def load_agent_blueprint(agent_id: str) -> AgentBlueprint:
    """
    Load agent blueprint
    
    In Phase 2: Returns mock blueprint
    In Phase 3: Will call agents-service
    """
    # Mock blueprint for Phase 2
    return AgentBlueprint(
        id=agent_id,
        name="Sofia-Prime",
        model="gpt-4",
        instructions="""Ти Sofia, асистент команди DAARION. Твоя роль:

- Допомагати з плануванням та організацією роботи
- Підсумовувати обговорення та зустрічі
- Відповідати на питання про систему DAARION
- Створювати задачі та follow-up нагадування
- Бути friendly та supportive

Важливо:
- Відповідай українською мовою
- Будь конкретна та корисна
- Якщо не знаєш точної відповіді, так і скажи
- Пропонуй наступні кроки або питання для уточнення""",
        capabilities={
            "can_create_tasks": True,
            "can_summarize": True,
            "can_search_docs": True
        },
        tools=["create_task", "create_followup", "summarize_channel"]
    )

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "agent-runtime",
        "version": "1.0.0",
        "nats_connected": nats_available
    }

@app.post("/internal/agent-runtime/test-channel")
async def test_channel(invocation: AgentInvocation):
    """Test endpoint for manual invocation"""
    print(f"\n🧪 Test invocation received")
    await handle_invocation(invocation.dict())
    return {"status": "processed", "agent_id": invocation.agent_id}

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    global nc
    if nc:
        await nc.close()
        print("✅ NATS connection closed")

