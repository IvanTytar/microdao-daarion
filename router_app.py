"""
RouterApp - Main router application class
"""

import logging
from rbac_client import fetch_rbac

from config_loader import RouterConfig, load_config, ConfigError
from router_models import RouterRequest, RouterResponse
from providers.registry import build_provider_registry
from routing_engine import RoutingTable

logger = logging.getLogger(__name__)


class RouterApp:
    """
    Main DAGI Router application.
    Coordinates config, providers, and routing.
    """
    
    def __init__(self, config: RouterConfig):
        self.config = config
        
        logger.info(f"Initializing RouterApp for node: {config.node.id}")
        
        # Build provider registry
        self.providers = build_provider_registry(config)
        
        # Build routing table
        self.routing_table = RoutingTable(config, self.providers)
        
        logger.info("RouterApp initialized successfully")
    
    @classmethod
    def from_config_file(cls, config_path: str = None) -> "RouterApp":
        """
        Create RouterApp from config file.
        
        Args:
            config_path: Path to config file (optional, uses default if None)
        
        Returns:
            RouterApp instance
        
        Raises:
            ConfigError: If config loading fails
        """
        try:
            config = load_config(config_path)
            return cls(config)
        except ConfigError as e:
            logger.error(f"Failed to load config: {e}")
            raise
    
    async def handle(self, req: RouterRequest) -> RouterResponse:
        """Handle router request with RBAC context injection for chat mode"""
        
        # Special handling for rag_query mode (RAG + Memory → LLM)
        if req.mode == "rag_query":
            return await self._handle_rag_query(req)
        
        # 1. RBAC injection for microDAO chat
        if req.mode == "chat" and req.dao_id and req.user_id:
            try:
                rbac = await fetch_rbac(dao_id=req.dao_id, user_id=req.user_id)
                
                # Ensure payload.context exists
                if req.payload is None:
                    req.payload = {}
                
                ctx = req.payload.get("context")
                if ctx is None or not isinstance(ctx, dict):
                    ctx = {}
                    req.payload["context"] = ctx
                
                # Inject RBAC info
                ctx["rbac"] = {
                    "dao_id": rbac.dao_id,
                    "user_id": rbac.user_id,
                    "roles": rbac.roles,
                    "entitlements": rbac.entitlements,
                }
                
                logger.info(f"RBAC injected for {req.user_id}: roles={rbac.roles}")
            except Exception as e:
                logger.warning(f"RBAC fetch failed, continuing without RBAC: {e}")
        
        # 2. Standard routing
        """
        Handle incoming request.
        
        Args:
            req: RouterRequest to process
        
        Returns:
            RouterResponse from provider
        
        Raises:
            ValueError: If routing fails
            Exception: If provider call fails
        """
        logger.info(f"Handling request: agent={req.agent}, mode={req.mode}")
        
        try:
            # Resolve provider
            provider = self.routing_table.resolve_provider(req)
            
            # Call provider
            logger.info(f"Calling provider: {provider.id}")
            response = await provider.call(req)
            
            if response.ok:
                logger.info(f"Request successful via {response.provider_id}")
            else:
                logger.error(f"Provider error: {response.error}")
            
            return response
            
        except ValueError as e:
            logger.error(f"Routing error: {e}")
            return RouterResponse(
                ok=False,
                provider_id="router",
                error=f"Routing error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return RouterResponse(
                ok=False,
                provider_id="router",
                error=f"Internal error: {str(e)}"
            )
    
    async def _handle_rag_query(self, req: RouterRequest) -> RouterResponse:
        """
        Handle RAG query mode: combines Memory + RAG → LLM
        
        Flow:
        1. Get Memory context
        2. Query RAG Service for documents
        3. Build prompt with Memory + RAG
        4. Call LLM provider
        5. Return answer with citations
        """
        from rag_client import rag_client
        from memory_client import memory_client
        
        logger.info(f"Handling RAG query: dao_id={req.dao_id}, user_id={req.user_id}")
        
        try:
            # Extract question
            question = req.payload.get("question") or req.message
            if not question:
                return RouterResponse(
                    ok=False,
                    provider_id="router",
                    error="Missing 'question' in payload"
                )
            
            dao_id = req.dao_id or "daarion"
            user_id = req.user_id or "anonymous"
            
            # 1. Get Memory context
            memory_ctx = {}
            try:
                memory_ctx = await memory_client.get_context(
                    user_id=user_id,
                    agent_id=req.agent or "daarwizz",
                    team_id=dao_id,
                    channel_id=req.payload.get("channel_id"),
                    limit=10
                )
                logger.info(f"Memory context retrieved: {len(memory_ctx.get('facts', []))} facts, {len(memory_ctx.get('recent_events', []))} events")
            except Exception as e:
                logger.warning(f"Memory context fetch failed: {e}")
            
            # 2. Query RAG Service
            rag_resp = await rag_client.query(
                dao_id=dao_id,
                question=question,
                top_k=5,
                user_id=user_id
            )
            
            rag_answer = rag_resp.get("answer", "")
            rag_citations = rag_resp.get("citations", [])
            rag_docs = rag_resp.get("documents", [])
            
            logger.info(f"RAG retrieved {len(rag_docs)} documents, {len(rag_citations)} citations")
            
            # 3. Build final prompt with Memory + RAG
            system_prompt = (
                "Ти асистент microDAO. Використовуй і особисту пам'ять, і документи DAO.\n"
                "Формуй чітку, структуровану відповідь українською, посилаючись на документи "
                "через індекси [1], [2] тощо, де це доречно.\n\n"
            )
            
            # Add Memory context
            memory_text = ""
            if memory_ctx.get("facts"):
                facts_summary = ", ".join([
                    f"{f.get('fact_key', '')}={f.get('fact_value', '')}"
                    for f in memory_ctx["facts"][:5]
                ])
                if facts_summary:
                    memory_text += f"Особисті факти: {facts_summary}\n"
            
            if memory_ctx.get("recent_events"):
                recent = memory_ctx["recent_events"][:3]
                events_summary = "\n".join([
                    f"- {e.get('body_text', '')[:100]}"
                    for e in recent
                ])
                if events_summary:
                    memory_text += f"Останні події:\n{events_summary}\n"
            
            # Add RAG documents
            docs_text = ""
            for i, citation in enumerate(rag_citations[:5], start=1):
                doc_id = citation.get("doc_id", "unknown")
                page = citation.get("page", 0)
                excerpt = citation.get("excerpt", "")
                docs_text += f"[{i}] (doc_id={doc_id}, page={page}): {excerpt}\n"
            
            # Build final prompt
            final_prompt = (
                f"{system_prompt}"
                f"{'1) Пам\'ять (короткий summary):\n' + memory_text + '\n' if memory_text else ''}"
                f"2) Релевантні документи (витяги):\n{docs_text}\n\n"
                f"Питання користувача:\n{question}\n\n"
                "Відповідь:"
            )
            
            # 4. Call LLM provider
            provider = self.routing_table.resolve_provider(req)
            logger.info(f"Calling LLM provider: {provider.id}")
            
            # Create modified request with final prompt
            llm_req = RouterRequest(
                mode="chat",  # Use chat mode for LLM
                agent=req.agent,
                dao_id=req.dao_id,
                source=req.source,
                session_id=req.session_id,
                user_id=req.user_id,
                message=final_prompt,
                payload=req.payload
            )
            
            llm_response = await provider.call(llm_req)
            
            if not llm_response.ok:
                return RouterResponse(
                    ok=False,
                    provider_id="router",
                    error=f"LLM call failed: {llm_response.error}"
                )
            
            # 5. Return response with citations
            return RouterResponse(
                ok=True,
                provider_id=llm_response.provider_id,
                data={
                    "text": llm_response.data.get("text", ""),
                    "citations": rag_citations
                },
                metadata={
                    "memory_used": bool(memory_text),
                    "rag_used": True,
                    "documents_retrieved": len(rag_docs),
                    "citations_count": len(rag_citations)
                },
                error=None
            )
            
        except Exception as e:
            logger.error(f"RAG query handler error: {e}", exc_info=True)
            return RouterResponse(
                ok=False,
                provider_id="router",
                error=f"RAG query failed: {str(e)}"
            )
    
    def get_provider_info(self):
        """Get info about registered providers"""
        return {
            "count": len(self.providers),
            "providers": {
                pid: {
                    "id": p.id,
                    "type": p.__class__.__name__,
                }
                for pid, p in self.providers.items()
            }
        }
    
    def get_routing_info(self):
        """Get info about routing rules"""
        return {
            "count": len(self.routing_table.rules),
            "rules": [
                {
                    "id": rule.id,
                    "priority": rule.priority,
                    "use_llm": rule.use_llm,
                    "description": rule.description,
                }
                for rule in self.routing_table.rules
            ]
        }


# Quick test
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("Testing RouterApp...\n")
        
        # Load config and create app
        app = RouterApp.from_config_file()
        
        print(f"✅ RouterApp initialized")
        print(f"   Node: {app.config.node.id}")
        print(f"   Providers: {len(app.providers)}")
        print(f"   Rules: {len(app.routing_table.rules)}\n")
        
        # Test request
        print("Testing simple request...")
        req = RouterRequest(
            agent="devtools",
            message="Hello from RouterApp test!",
            payload={}
        )
        
        response = await app.handle(req)
        
        if response.ok:
            print(f"✅ Response OK")
            print(f"   Provider: {response.provider_id}")
            print(f"   Data: {response.data}")
        else:
            print(f"❌ Response ERROR: {response.error}")
    
    asyncio.run(test())
