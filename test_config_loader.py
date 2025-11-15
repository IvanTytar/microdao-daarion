"""
Unit tests for config_loader.py
"""

import sys
from pathlib import Path

from config_loader import (
    load_config,
    load_config_raw,
    resolve_config_path,
    ConfigError,
    get_llm_profile,
    get_agent_config,
    get_routing_rules,
)


def test_resolve_config_path_default():
    """Test default config path"""
    path = resolve_config_path()
    assert str(path) == "/opt/dagi-router/router-config.yml", f"Expected /opt/dagi-router/router-config.yml, got {path}"


def test_resolve_config_path_explicit():
    """Test explicit config path"""
    path = resolve_config_path("/custom/path.yml")
    assert str(path) == "/custom/path.yml", f"Expected /custom/path.yml, got {path}"


def test_load_config_success():
    """Test successful config loading"""
    config = load_config()
    
    # Check node
    assert config.node.id == "dagi-devtools-node-01"
    assert config.node.role == "router"
    assert config.node.env == "dev"
    
    # Check LLM profiles
    assert "local_qwen3_8b" in config.llm_profiles
    assert "cloud_deepseek" in config.llm_profiles
    
    local_profile = config.llm_profiles["local_qwen3_8b"]
    assert local_profile.provider == "ollama"
    assert local_profile.model == "qwen3:8b"
    assert local_profile.base_url == "http://localhost:11434"
    
    # Check agents
    assert "devtools" in config.agents
    devtools = config.agents["devtools"]
    assert devtools.default_llm == "local_qwen3_8b"
    assert len(devtools.tools) == 5
    
    # Check routing
    assert len(config.routing) == 4
    
    # Check telemetry
    assert config.telemetry.enabled is True


def test_get_llm_profile():
    """Test getting LLM profile"""
    config = load_config()
    
    profile = get_llm_profile(config, "local_qwen3_8b")
    assert profile is not None
    assert profile.model == "qwen3:8b"
    
    missing = get_llm_profile(config, "nonexistent")
    assert missing is None


def test_get_agent_config():
    """Test getting agent config"""
    config = load_config()
    
    agent = get_agent_config(config, "devtools")
    assert agent is not None
    assert agent.default_llm == "local_qwen3_8b"
    
    missing = get_agent_config(config, "nonexistent")
    assert missing is None


def test_get_routing_rules():
    """Test getting routing rules sorted by priority"""
    config = load_config()
    
    rules = get_routing_rules(config)
    assert len(rules) == 4
    
    # Check sorted by priority
    priorities = [rule.priority for rule in rules]
    assert priorities == sorted(priorities), f"Rules not sorted by priority: {priorities}"
    
    # Check first rule (lowest priority number = highest priority)
    assert rules[0].id == "explicit_provider_override"
    assert rules[0].priority == 5


def test_load_config_raw():
    """Test loading raw config as dict"""
    raw = load_config_raw()
    
    assert isinstance(raw, dict)
    assert "node" in raw
    assert "llm_profiles" in raw
    assert "agents" in raw
    assert "routing" in raw


if __name__ == "__main__":
    """Run tests manually"""
    
    print("Running config_loader tests...\n")
    
    tests = [
        ("resolve_config_path_default", test_resolve_config_path_default),
        ("resolve_config_path_explicit", test_resolve_config_path_explicit),
        ("load_config_success", test_load_config_success),
        ("get_llm_profile", test_get_llm_profile),
        ("get_agent_config", test_get_agent_config),
        ("get_routing_rules", test_get_routing_rules),
        ("load_config_raw", test_load_config_raw),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            test_func()
            print(f"✅ {name}")
            passed += 1
        except AssertionError as e:
            print(f"❌ {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {name}: Unexpected error: {e}")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed")
    
    if failed > 0:
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
