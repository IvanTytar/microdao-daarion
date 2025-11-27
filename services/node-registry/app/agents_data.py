"""
Agents data for NODE1 and NODE2
Статичні списки агентів (поки що, потім можна підключити до БД)
"""
from typing import List, Dict, Any


NODE1_AGENTS = [
    # Core Agents - 5
    {"name": "Daarwizz", "role": "Main UI Agent", "model": "qwen3:8b", "team": "Core Agents"},
    {"name": "DevTools Agent", "role": "Code & Testing", "model": "qwen3:8b", "team": "Core Agents"},
    {"name": "MicroDAO Orchestrator", "role": "Workflow", "model": "qwen3:8b", "team": "Core Agents"},
    {"name": "Monitor Agent (NODE1)", "role": "Monitoring", "model": "mistral-nemo:12b", "team": "Core Agents"},
    {"name": "Tokenomics Advisor", "role": "Analysis", "model": "qwen3:8b", "team": "Core Agents"},
    
    # Platform Orchestrators - 7
    {"name": "GREENFOOD Assistant", "role": "ERP", "model": "qwen3:8b", "team": "Platform Orchestrators"},
    {"name": "Helion", "role": "Energy Union", "model": "qwen3:8b", "team": "Platform Orchestrators"},
    {"name": "Yaromir", "role": "DAO", "model": "qwen2.5:14b", "team": "Platform Orchestrators"},
    {"name": "DRUID", "role": "Ecology", "model": "qwen3:8b", "team": "Platform Orchestrators"},
    {"name": "EONARCH", "role": "Evolution", "model": "deepseek-chat", "team": "Platform Orchestrators"},
    {"name": "Dario", "role": "City Services", "model": "qwen3:8b", "team": "Platform Orchestrators"},
    {"name": "NUTRA", "role": "Health", "model": "qwen3:8b", "team": "Platform Orchestrators"},
]

NODE2_AGENTS = [
    # System - 10
    {"name": "Monitor (NODE2)", "role": "Monitoring", "model": "mistral-nemo:12b", "team": "System"},
    {"name": "Solarius", "role": "CEO", "model": "deepseek-r1:70b", "team": "System"},
    {"name": "Sofia", "role": "AI Engineer", "model": "grok-4.1", "team": "System"},
    {"name": "PrimeSynth", "role": "Document", "model": "gpt-4.1", "team": "System"},
    {"name": "Nexor", "role": "Coordinator", "model": "deepseek-r1:70b", "team": "System"},
    {"name": "Vindex", "role": "Decision", "model": "deepseek-r1:70b", "team": "System"},
    {"name": "Helix", "role": "Architect", "model": "deepseek-r1:70b", "team": "System"},
    {"name": "Aurora", "role": "Innovation", "model": "gemma2:27b", "team": "System"},
    {"name": "Arbitron", "role": "Resolver", "model": "mistral-22b", "team": "System"},
    {"name": "Sentinels", "role": "Strategy", "model": "mistral-22b", "team": "System"},
    
    # Engineering - 5
    {"name": "ByteForge", "role": "Code Gen", "model": "qwen2.5-coder:72b", "team": "Engineering"},
    {"name": "Vector", "role": "Vector Ops", "model": "starcoder2:34b", "team": "Engineering"},
    {"name": "ChainWeaver", "role": "Blockchain", "model": "qwen2.5-coder:72b", "team": "Engineering"},
    {"name": "Cypher", "role": "Security", "model": "starcoder2:34b", "team": "Engineering"},
    {"name": "Canvas", "role": "UI/UX", "model": "qwen2.5-coder:72b", "team": "Engineering"},
    
    # Marketing - 6
    {"name": "Roxy", "role": "Social Media", "model": "mistral:7b", "team": "Marketing"},
    {"name": "Mira", "role": "Content", "model": "qwen2.5:7b", "team": "Marketing"},
    {"name": "Tempo", "role": "Campaigns", "model": "gpt-oss", "team": "Marketing"},
    {"name": "Harmony", "role": "Brand", "model": "mistral:7b", "team": "Marketing"},
    {"name": "Faye", "role": "Community", "model": "qwen2.5:7b", "team": "Marketing"},
    {"name": "Storytelling", "role": "Stories", "model": "qwen2.5:7b", "team": "Marketing"},
    
    # Finance - 4
    {"name": "Financial Analyst", "role": "Analysis", "model": "mistral:7b", "team": "Finance"},
    {"name": "Budget Manager", "role": "Budget", "model": "qwen2.5:7b", "team": "Finance"},
    {"name": "Tokenomics", "role": "Tokens", "model": "gpt-oss", "team": "Finance"},
    {"name": "Risk Manager", "role": "Risk", "model": "mistral:7b", "team": "Finance"},
    
    # Web3 - 5
    {"name": "Smart Contracts", "role": "Contracts", "model": "qwen2.5-coder:72b", "team": "Web3"},
    {"name": "DeFi Specialist", "role": "DeFi", "model": "qwen2.5:7b", "team": "Web3"},
    {"name": "NFT Manager", "role": "NFT", "model": "qwen2.5:7b", "team": "Web3"},
    {"name": "DAO Governance", "role": "DAO", "model": "mistral:7b", "team": "Web3"},
    {"name": "Blockchain Analytics", "role": "Analytics", "model": "qwen2.5:7b", "team": "Web3"},
    
    # Security - 7
    {"name": "Security Auditor", "role": "Audit", "model": "starcoder2:34b", "team": "Security"},
    {"name": "Penetration Tester", "role": "PenTest", "model": "qwen2.5-coder:72b", "team": "Security"},
    {"name": "Threat Hunter", "role": "Threats", "model": "mistral:7b", "team": "Security"},
    {"name": "Compliance Officer", "role": "Compliance", "model": "qwen2.5:7b", "team": "Security"},
    {"name": "Incident Response", "role": "Incidents", "model": "mistral:7b", "team": "Security"},
    {"name": "Crypto Analyst", "role": "Crypto", "model": "qwen2.5:7b", "team": "Security"},
    {"name": "Privacy Guardian", "role": "Privacy", "model": "qwen2.5:7b", "team": "Security"},
    
    # Vision - 4
    {"name": "Iris", "role": "Vision Proc", "model": "qwen-vl", "team": "Vision"},
    {"name": "Lumen", "role": "Image Analysis", "model": "qwen2-vl-32b", "team": "Vision"},
    {"name": "Spectra", "role": "Multimodal", "model": "qwen-vl", "team": "Vision"},
    {"name": "Visionary", "role": "AI Vision", "model": "qwen2-vl-7b", "team": "Vision"},
    
    # Analytics - 9
    {"name": "Data Scientist", "role": "ML/DS", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "BI Analyst", "role": "Business Intel", "model": "mistral:7b", "team": "Analytics"},
    {"name": "Market Research", "role": "Research", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "KPI Tracker", "role": "KPIs", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "Forecast Agent", "role": "Forecasting", "model": "mistral:7b", "team": "Analytics"},
    {"name": "Dashboard Creator", "role": "Dashboards", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "Report Gen", "role": "Reports", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "Metrics Monitor", "role": "Metrics", "model": "qwen2.5:7b", "team": "Analytics"},
    {"name": "Insights Agent", "role": "Insights", "model": "mistral:7b", "team": "Analytics"},
]


def get_agents_by_node(node_id: str) -> List[Dict[str, Any]]:
    """Отримати список агентів для ноди"""
    if "node-1" in node_id or "hetzner" in node_id:
        return NODE1_AGENTS
    elif "node-2" in node_id or "macbook" in node_id:
        return NODE2_AGENTS
    return []


def get_agents_by_team(node_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Групувати агентів по командах"""
    agents = get_agents_by_node(node_id)
    teams = {}
    for agent in agents:
        team = agent.get("team", "Other")
        if team not in teams:
            teams[team] = []
        teams[team].append(agent)
    return teams

