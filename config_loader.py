"""
DAGI Router Configuration Loader

Завантажує та валідує router-config.yml
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import BaseModel, Field, ValidationError


# ============================================================================
# Default Configuration Path
# ============================================================================
DEFAULT_CONFIG_PATH = "/opt/dagi-router/router-config.yml"
ENV_CONFIG_VAR = "DAGI_ROUTER_CONFIG"


# ============================================================================
# Configuration Models (Pydantic для validation)
# ============================================================================

class NodeConfig(BaseModel):
    """Node configuration"""
    id: str
    role: str
    env: str
    description: Optional[str] = None


class LLMProfile(BaseModel):
    """LLM Provider profile"""
    provider: str
    base_url: str
    model: str
    max_tokens: int = 1024
    temperature: float = 0.2
    timeout_ms: int = 30000
    description: Optional[str] = None
    api_key_env: Optional[str] = None
    top_p: Optional[float] = None


class AgentTool(BaseModel):
    """Agent tool definition"""
    id: str
    type: str
    description: Optional[str] = None
    endpoint: Optional[str] = None


class AgentConfig(BaseModel):
    """Agent configuration"""
    description: str
    default_llm: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: list[AgentTool] = Field(default_factory=list)


class RoutingRule(BaseModel):
    """Routing rule"""
    id: str
    priority: int = 100
    when: Dict[str, Any]
    use_llm: Optional[str] = None
    use_provider: Optional[str] = None
    use_metadata: Optional[str] = None
    description: Optional[str] = None


class TelemetryConfig(BaseModel):
    """Telemetry configuration"""
    enabled: bool = True
    sink: str = "stdout"
    log_level: str = "info"
    metrics: list[str] = Field(default_factory=list)


class PolicyConfig(BaseModel):
    """Policy configuration"""
    rate_limiting: Dict[str, Any] = Field(default_factory=dict)
    budget: Dict[str, Any] = Field(default_factory=dict)


class RouterConfig(BaseModel):
    """Complete Router Configuration"""
    node: NodeConfig
    llm_profiles: Dict[str, LLMProfile]
    orchestrator_providers: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    agents: Dict[str, AgentConfig] = Field(default_factory=dict)
    routing: list[RoutingRule] = Field(default_factory=list)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
    policies: PolicyConfig = Field(default_factory=PolicyConfig)


# ============================================================================
# Exceptions
# ============================================================================

class ConfigError(Exception):
    """Configuration loading or validation error"""
    pass


# ============================================================================
# Configuration Loader
# ============================================================================

def resolve_config_path(explicit_path: Optional[str] = None) -> Path:
    """
    Повертає шлях до конфігурації з пріоритетом:
    1) explicit_path (якщо передано)
    2) env DAGI_ROUTER_CONFIG
    3) DEFAULT_CONFIG_PATH
    """
    if explicit_path:
        return Path(explicit_path)

    env_path = os.getenv(ENV_CONFIG_VAR)
    if env_path:
        return Path(env_path)

    return Path(DEFAULT_CONFIG_PATH)


def load_config_raw(explicit_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Завантажує router-config.yml як raw dict.
    Кидає ConfigError, якщо файл не знайдено або формат некоректний.
    """
    config_path = resolve_config_path(explicit_path)

    if not config_path.exists():
        raise ConfigError(f"Config file not found: {config_path}")

    try:
        with config_path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except yaml.YAMLError as e:
        raise ConfigError(f"YAML parse error in {config_path}: {e}") from e
    except Exception as e:
        raise ConfigError(f"Failed to read {config_path}: {e}") from e

    if not isinstance(data, dict):
        raise ConfigError(f"Config root must be a mapping, got {type(data)}")

    return data


def load_config(explicit_path: Optional[str] = None) -> RouterConfig:
    """
    Завантажує та валідує router-config.yml.
    Повертає валідовану Pydantic модель RouterConfig.
    """
    raw_config = load_config_raw(explicit_path)

    try:
        config = RouterConfig(**raw_config)
    except ValidationError as e:
        raise ConfigError(f"Config validation failed: {e}") from e

    return config


def get_llm_profile(config: RouterConfig, profile_name: str) -> Optional[LLMProfile]:
    """Helper: отримати LLM profile за назвою"""
    return config.llm_profiles.get(profile_name)


def get_agent_config(config: RouterConfig, agent_id: str) -> Optional[AgentConfig]:
    """Helper: отримати Agent config за id"""
    return config.agents.get(agent_id)


def get_routing_rules(config: RouterConfig) -> list[RoutingRule]:
    """Helper: отримати всі routing rules, відсортовані за пріоритетом"""
    return sorted(config.routing, key=lambda r: r.priority)


# ============================================================================
# Quick Test
# ============================================================================

if __name__ == "__main__":
    """Quick test of config loader"""
    import sys
    
    try:
        print("Loading configuration...")
        config = load_config()
        
        print(f"\n✅ Configuration loaded successfully!")
        print(f"\nNode: {config.node.id} ({config.node.role}, env={config.node.env})")
        print(f"\nLLM Profiles ({len(config.llm_profiles)}):")
        for name, profile in config.llm_profiles.items():
            print(f"  - {name}: {profile.provider} / {profile.model}")
        
        print(f"\nAgents ({len(config.agents)}):")
        for agent_id, agent in config.agents.items():
            print(f"  - {agent_id}: {agent.description}")
            print(f"    default_llm: {agent.default_llm}")
            print(f"    tools: {len(agent.tools)}")
        
        print(f"\nRouting Rules ({len(config.routing)}):")
        for rule in get_routing_rules(config):
            print(f"  - [{rule.priority}] {rule.id} → {rule.use_llm}")
        
        print(f"\nTelemetry: {config.telemetry.enabled} (sink={config.telemetry.sink})")
        
    except ConfigError as e:
        print(f"❌ Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)
