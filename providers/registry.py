"""
Provider Registry - builds providers from config
"""

import logging
import os
from typing import Dict

from config_loader import RouterConfig, get_llm_profile
from .base import Provider
from .llm_provider import LLMProvider
from .devtools_provider import DevToolsProvider
from .crewai_provider import CrewAIProvider

logger = logging.getLogger(__name__)


def build_provider_registry(config: RouterConfig) -> Dict[str, Provider]:
    """
    Build provider registry from config.
    Returns dict: {provider_id: Provider instance}
    """
    registry: Dict[str, Provider] = {}
    
    logger.info("Building provider registry...")
    
    # Build LLM providers from llm_profiles
    for profile_name, profile in config.llm_profiles.items():
        provider_id = f"llm_{profile_name}"
        
        # Get API key from environment if specified
        api_key = None
        if profile.api_key_env:
            api_key = os.getenv(profile.api_key_env)
            if not api_key:
                logger.warning(
                    f"API key env var '{profile.api_key_env}' not set for profile '{profile_name}'"
                )
        
        # Convert timeout from ms to seconds
        timeout_s = profile.timeout_ms / 1000 if profile.timeout_ms else 30
        
        # Determine provider type
        provider_type = "openai"  # default
        if profile.provider.lower() == "ollama":
            provider_type = "ollama"
        
        provider = LLMProvider(
            provider_id=provider_id,
            base_url=profile.base_url,
            model=profile.model,
            api_key=api_key,
            timeout_s=int(timeout_s),
            max_tokens=profile.max_tokens,
            temperature=profile.temperature,
            provider_type=provider_type,
        )
        
        registry[provider_id] = provider
        logger.info(f"  + {provider_id}: {profile.provider}/{profile.model}")
    
    # Build DevTools providers
    # DevTools agents are defined in config.agents with tools[]
    for agent_id, agent_config in config.agents.items():
        # Check if this agent has tools (DevTools marker)
        if agent_config.tools:
            provider_id = f"devtools_{agent_id}"
            
            # DevTools backend URL (for now hardcoded, later from config)
            base_url = "http://localhost:8008"
            
            provider = DevToolsProvider(
                provider_id=provider_id,
                base_url=base_url,
                timeout=30
            )
            
            registry[provider_id] = provider
            logger.info(f"  + {provider_id}: DevTools backend @ {base_url}")
    
    # Build Orchestrator providers
    for orch_id, orch_config in config.orchestrator_providers.items():
        provider_id = f"orchestrator_{orch_id}"
        
        if orch_config.get("type") == "orchestrator":
            provider = CrewAIProvider(
                provider_id=provider_id,
                base_url=orch_config["base_url"],
                timeout=orch_config.get("timeout_ms", 120000) // 1000
            )
            
            registry[provider_id] = provider
            logger.info(f"  + {provider_id}: Orchestrator @ {orch_config["base_url"]}")
        else:
            logger.warning(f"Unknown orchestrator type: {orch_config.get("type")}")

    
    logger.info(f"Provider registry built: {len(registry)} providers")
    
    return registry

