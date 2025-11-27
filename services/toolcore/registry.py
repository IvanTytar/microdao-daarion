import yaml
import os
from models import ToolDefinition
from typing import Dict, Optional

class ToolRegistry:
    """Tool registry for Phase 3 (config-based)"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.tools: Dict[str, ToolDefinition] = {}
        self._load_config(config_path)
    
    def _load_config(self, config_path: str):
        """Load tool definitions from YAML"""
        if not os.path.exists(config_path):
            print(f"⚠️  Config file not found: {config_path}")
            return
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        for tool_config in config.get('tools', []):
            tool_def = ToolDefinition(**tool_config)
            self.tools[tool_def.id] = tool_def
            print(f"✅ Loaded tool: {tool_def.id} ({tool_def.executor})")
        
        print(f"📋 Total tools loaded: {len(self.tools)}")
    
    def get_tool(self, tool_id: str) -> Optional[ToolDefinition]:
        """Get tool definition by ID"""
        return self.tools.get(tool_id)
    
    def list_tools(self, agent_id: Optional[str] = None) -> list[ToolDefinition]:
        """
        List available tools
        
        If agent_id provided, filter by allowed_agents
        """
        tools = list(self.tools.values())
        
        if agent_id:
            tools = [
                tool for tool in tools
                if tool.enabled and (
                    tool.allowed_agents is None or
                    agent_id in tool.allowed_agents
                )
            ]
        else:
            tools = [tool for tool in tools if tool.enabled]
        
        return tools
    
    def check_permission(self, tool_id: str, agent_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if agent has permission to use tool
        
        Returns: (allowed: bool, reason: str | None)
        """
        tool = self.get_tool(tool_id)
        
        if not tool:
            return False, f"Tool not found: {tool_id}"
        
        if not tool.enabled:
            return False, f"Tool is disabled: {tool_id}"
        
        if tool.allowed_agents is None:
            # No restrictions
            return True, None
        
        if agent_id not in tool.allowed_agents:
            return False, f"Agent {agent_id} not in allowlist for {tool_id}"
        
        return True, None





