"""
Policy Store

Phase 4: Config-based storage
Phase 5: Database-backed with dynamic updates
"""
import yaml
import os
from typing import Optional, Dict, Any

class PolicyStore:
    """Store and retrieve policies"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.microdao_policies: Dict[str, Any] = {}
        self.channel_policies: Dict[str, Any] = {}
        self.tool_policies: Dict[str, Any] = {}
        self.agent_policies: Dict[str, Any] = {}
        
        self._load_config(config_path)
    
    def _load_config(self, config_path: str):
        """Load policies from YAML config"""
        if not os.path.exists(config_path):
            print(f"⚠️  Config file not found: {config_path}, using empty policies")
            return
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f) or {}
        
        # Load microDAO policies
        for policy in config.get('microdao_policies', []):
            microdao_id = policy['microdao_id']
            self.microdao_policies[microdao_id] = policy
            print(f"✅ Loaded microDAO policy: {microdao_id}")
        
        # Load channel policies
        for policy in config.get('channel_policies', []):
            channel_id = policy['channel_id']
            self.channel_policies[channel_id] = policy
            print(f"✅ Loaded channel policy: {channel_id}")
        
        # Load tool policies
        for policy in config.get('tool_policies', []):
            tool_id = policy['tool_id']
            self.tool_policies[tool_id] = policy
            print(f"✅ Loaded tool policy: {tool_id}")
        
        # Load agent policies
        for policy in config.get('agent_policies', []):
            agent_id = policy['agent_id']
            self.agent_policies[agent_id] = policy
            print(f"✅ Loaded agent policy: {agent_id}")
        
        print(f"📋 Total policies: {len(self.microdao_policies)} microDAOs, "
              f"{len(self.channel_policies)} channels, "
              f"{len(self.tool_policies)} tools, "
              f"{len(self.agent_policies)} agents")
    
    def is_microdao_owner(self, actor_id: str, microdao_id: str) -> bool:
        """Check if actor is microDAO owner"""
        policy = self.microdao_policies.get(microdao_id)
        if not policy:
            return False
        
        owners = policy.get('owners', [])
        return actor_id in owners
    
    def is_microdao_admin(self, actor_id: str, microdao_id: str) -> bool:
        """Check if actor is microDAO admin"""
        policy = self.microdao_policies.get(microdao_id)
        if not policy:
            return False
        
        admins = policy.get('admins', [])
        return actor_id in admins or self.is_microdao_owner(actor_id, microdao_id)
    
    def get_channel_policy(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get channel policy"""
        return self.channel_policies.get(channel_id)
    
    def is_blocked_in_channel(self, actor_id: str, channel_id: str) -> bool:
        """Check if actor is blocked in channel"""
        policy = self.channel_policies.get(channel_id)
        if not policy:
            return False
        
        blocked_users = policy.get('blocked_users', [])
        return actor_id in blocked_users
    
    def get_tool_policy(self, tool_id: str) -> Optional[Dict[str, Any]]:
        """Get tool policy"""
        return self.tool_policies.get(tool_id)
    
    def get_agent_policy(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent policy"""
        return self.agent_policies.get(agent_id)




