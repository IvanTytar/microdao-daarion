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
