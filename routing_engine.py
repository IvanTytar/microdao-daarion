"""
Routing Engine - matches requests to providers based on rules
"""

import logging
from typing import Dict, List, Optional

from config_loader import RouterConfig, RoutingRule, get_routing_rules
from router_models import RouterRequest
from providers.base import Provider

logger = logging.getLogger(__name__)


def rule_matches(rule: RoutingRule, req: RouterRequest) -> bool:
    """Check if routing rule matches the request"""
    
    when = rule.when
    
    # Check agent match
    if "agent" in when:
        if when["agent"] != req.agent:
            return False
    
    # Check mode match
    if "mode" in when:
        if when["mode"] != req.mode:
            return False
    
    # Check metadata_has
    if "metadata_has" in when:
        metadata_key = when["metadata_has"]
        if metadata_key not in req.payload:
            return False
    
    # Check task_type (in metadata or payload)
    if "task_type" in when:
        expected_types = when["task_type"]
        if not isinstance(expected_types, list):
            expected_types = [expected_types]
        
        actual_type = req.payload.get("task_type")
        if actual_type not in expected_types:
            return False
    
    # Check AND conditions
    if "and" in when:
        and_conditions = when["and"]
        for condition in and_conditions:
            if isinstance(condition, dict):
                if "task_type" in condition:
                    expected_types = condition["task_type"]
                    if not isinstance(expected_types, list):
                        expected_types = [expected_types]
                    actual_type = req.payload.get("task_type")
                    if actual_type not in expected_types:
                        return False
                        
                if "api_key_available" in condition:
                    import os
                    key_name = condition["api_key_available"]
                    if not os.getenv(key_name):
                        return False
    
    return True


class RoutingTable:
    """Routing table that resolves providers based on rules"""
    
    def __init__(self, config: RouterConfig, providers: Dict[str, Provider]):
        self.config = config
        self.providers = providers
        self.rules = get_routing_rules(config)  # Already sorted by priority
        
        logger.info(f"Routing table initialized with {len(self.rules)} rules")
        for rule in self.rules:
            logger.info(f"  [{rule.priority}] {rule.id} → {rule.use_llm}")
    
    def resolve_provider(self, req: RouterRequest) -> Provider:
        """
        Resolve which provider should handle the request.
        Returns Provider instance.
        Raises ValueError if no matching rule or provider not found.
        """
        
        logger.debug(f"Resolving provider for request: mode={req.mode}, agent={req.agent}")
        
        # Find first matching rule (rules already sorted by priority)
        matched_rule = None
        for rule in self.rules:
            # Skip default rules for now
            if rule.when.get("default"):
                continue
            
            if rule_matches(rule, req):
                matched_rule = rule
                break
        
        # If no specific rule matched, try default rule
        if not matched_rule:
            for rule in self.rules:
                if rule.when.get("default"):
                    matched_rule = rule
                    break
        
        if not matched_rule:
            raise ValueError("No routing rule matched and no default rule defined")
        
        # Determine provider_id from rule
        if matched_rule.use_provider:
            provider_id = matched_rule.use_provider
        elif matched_rule.use_llm:
            provider_id = self._resolve_provider_id(matched_rule.use_llm, req)
        elif matched_rule.use_metadata:
            provider_id = req.payload.get(matched_rule.use_metadata) if req.payload else None
        else:
            raise ValueError(f"Rule '{matched_rule.id}' has no use_llm, use_provider, or use_metadata")
        
        logger.info(f"Matched rule: {matched_rule.id} → {provider_id}")
        # Determine provider_id from rule
        if matched_rule.use_provider:
            provider_id = matched_rule.use_provider
        elif matched_rule.use_llm:
            provider_id = self._resolve_provider_id(matched_rule.use_llm, req)
        elif matched_rule.use_metadata:
            provider_id = req.payload.get(matched_rule.use_metadata) if req.payload else None
        else:
            raise ValueError(f"Rule '{matched_rule.id}' has no use_llm, use_provider, or use_metadata")
        
        logger.info(f"Matched rule: {matched_rule.id} → {provider_id}")
        # Determine provider_id from rule
        if matched_rule.use_provider:
            provider_id = matched_rule.use_provider
        elif matched_rule.use_llm:
            provider_id = self._resolve_provider_id(matched_rule.use_llm, req)
        elif matched_rule.use_metadata:
            provider_id = req.payload.get(matched_rule.use_metadata) if req.payload else None
        else:
            raise ValueError(f"Rule '{matched_rule.id}' has no use_llm, use_provider, or use_metadata")
        
        logger.info(f"Matched rule: {matched_rule.id} → {provider_id}")
        # Determine provider_id from rule
        if matched_rule.use_provider:
            provider_id = matched_rule.use_provider
        elif matched_rule.use_llm:
            provider_id = self._resolve_provider_id(matched_rule.use_llm, req)
        elif matched_rule.use_metadata:
            provider_id = req.payload.get(matched_rule.use_metadata) if req.payload else None
        else:
            raise ValueError(f"Rule '{matched_rule.id}' has no use_llm, use_provider, or use_metadata")
        
        logger.info(f"Matched rule: {matched_rule.id} → {provider_id}")
        
        if provider_id not in self.providers:
            available = ", ".join(self.providers.keys())
            raise ValueError(
                f"Rule '{matched_rule.id}' uses unknown provider '{provider_id}'. "
                f"Available: {available}"
            )
        
        provider = self.providers[provider_id]
        logger.info(f"Selected provider: {provider}")
        
        return provider
    
    def _resolve_provider_id(self, use_llm: str, req: RouterRequest) -> str:
        """
        Resolve provider ID from use_llm field.
        Handles special cases like 'metadata.provider'
        """
        
        # Special case: metadata.provider
        if use_llm == "metadata.provider":
            provider_from_meta = req.payload.get("provider")
            if not provider_from_meta:
                raise ValueError("Rule uses 'metadata.provider' but no provider in metadata")
            # Map provider names to provider IDs
            # e.g., "local_slm" → "llm_local_qwen3_8b"
            if provider_from_meta == "local_slm":
                return "llm_local_qwen3_8b"
            elif provider_from_meta == "cloud_deepseek":
                return "llm_cloud_deepseek"
            else:
                return provider_from_meta
        
        # Map profile names to provider IDs
        # use_llm typically references llm_profile name
        return f"llm_{use_llm}"
