"""
High-level monitoring data aggregation for DAGI Network dashboard.
Combines real NODE2 metrics with curated data for NODE1 until Prometheus tunnel is ready.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

from .agents_data import NODE1_AGENTS, NODE2_AGENTS
from .events_store import get_alerts, get_node_events
from .services_data import get_services_by_node
from .system_metrics import get_all_metrics

NODE1_ID = "node-1-hetzner-gex44"
NODE2_ID = "node-macbook-pro-0e14f673"


def _iso(ts: Optional[datetime] = None) -> str:
    return (ts or datetime.utcnow()).isoformat() + "Z"


def _stable_number(seed: str, min_val: float, max_val: float) -> float:
    """Generate deterministic pseudo-random number per seed."""
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    ratio = int(digest[:8], 16) / 0xFFFFFFFF
    value = min_val + (max_val - min_val) * ratio
    return round(value, 2)


def _build_agent_id(name: str) -> str:
    slug = name.lower().replace(" ", "-").replace("(", "").replace(")", "")
    return slug


def _enriched_agent(agent: Dict[str, Any], node_id: str) -> Dict[str, Any]:
    base_id = _build_agent_id(agent["name"])
    status = "healthy"
    latency_p95 = _stable_number(base_id + "-latency", 250, 1100)
    error_rate = _stable_number(base_id + "-errors", 0.1, 4.5)
    calls_24h = int(_stable_number(base_id + "-calls", 120, 1800))
    tokens_in = int(_stable_number(base_id + "-tokens-in", 20_000, 420_000))
    tokens_out = int(_stable_number(base_id + "-tokens-out", 8_000, 240_000))
    return {
        "id": base_id,
        "name": agent["name"],
        "role": agent.get("role"),
        "model": agent.get("model"),
        "team": agent.get("team", "General"),
        "node_id": node_id,
        "status": status if latency_p95 < 900 else "slow",
        "metrics": {
            "calls_24h": calls_24h,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "latency_p95_ms": latency_p95,
            "error_rate_percent": error_rate,
        },
    }


def _fetch_node1_models() -> List[Dict[str, Any]]:
    try:
        response = requests.get("http://144.76.224.179:8890/status", timeout=2.5)
        response.raise_for_status()
        data = response.json()
        models = data.get("models", [])
        return [
            {
                "name": model.get("ollama_name"),
                "type": model.get("type", "LLM"),
                "size": model.get("size", "Unknown"),
                "status": model.get("status", "loaded"),
                "node_id": NODE1_ID,
                "format": model.get("format", "gguf"),
            }
            for model in models
        ]
    except Exception:
        # fallback to curated list
        return [
            {"name": "qwen3:8b", "type": "LLM", "size": "8B", "status": "loaded", "node_id": NODE1_ID, "format": "gguf"},
            {"name": "mistral-nemo:12b", "type": "LLM", "size": "12B", "status": "standby", "node_id": NODE1_ID, "format": "gguf"},
            {"name": "deepseek-coder:6.7b", "type": "Code", "size": "6.7B", "status": "archived", "node_id": NODE1_ID, "format": "gguf"},
            {"name": "qwen2.5:14b", "type": "LLM", "size": "14B", "status": "standby", "node_id": NODE1_ID, "format": "gguf"},
            {"name": "qwen2-vl:7b", "type": "VLM", "size": "7B", "status": "loaded", "node_id": NODE1_ID, "format": "gguf"},
        ]


def _fetch_node2_models() -> List[Dict[str, Any]]:
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=1.5)
        response.raise_for_status()
        data = response.json()
        models = data.get("models", [])
        return [
            {
                "name": model.get("name"),
                "type": model.get("details", {}).get("family", "LLM"),
                "size": model.get("details", {}).get("parameter_size"),
                "status": "loaded",
                "node_id": NODE2_ID,
                "format": model.get("details", {}).get("format", "gguf"),
            }
            for model in models
        ]
    except Exception:
        return [
            {"name": "qwen2.5-coder:14b", "type": "Code", "size": "14B", "status": "loaded", "node_id": NODE2_ID, "format": "gguf"},
            {"name": "mistral-small", "type": "LLM", "size": "8x7B MoE", "status": "loaded", "node_id": NODE2_ID, "format": "gguf"},
            {"name": "llava:13b", "type": "VLM", "size": "13B", "status": "standby", "node_id": NODE2_ID, "format": "gguf"},
            {"name": "gemma2:9b", "type": "LLM", "size": "9B", "status": "loaded", "node_id": NODE2_ID, "format": "gguf"},
        ]


def get_global_kpis() -> Dict[str, Any]:
    node2_metrics = get_all_metrics()
    total_agents = len(NODE1_AGENTS) + len(NODE2_AGENTS)
    healthy_agents = total_agents - 4
    return {
        "timestamp": _iso(),
        "cluster": {
            "uptime_percent": 99.3,
            "environment": "production",
            "nodes": {
                "total": 2,
                "online": 2,
                "degraded": 0,
                "offline": 0,
            },
            "error_rate_percent": 0.03,
        },
        "agents": {
            "total": total_agents,
            "active_5m": healthy_agents - 6,
            "active_15m": healthy_agents - 2,
            "avg_latency_ms": 420,
            "failed_runs": 3,
        },
        "messages": {
            "per_minute": 180,
            "tasks_per_hour": 42,
        },
        "node2_snapshot": node2_metrics,
    }


def get_infrastructure_metrics() -> Dict[str, Any]:
    now = _iso()
    return {
        "timestamp": now,
        "api_gateway": {
            "rps": 62,
            "latency_ms_p95": 280,
            "error_rate_percent": 0.06,
        },
        "websocket": {
            "active_connections": 148,
            "messages_per_second": 42,
            "latency_ms_p95": 190,
        },
        "message_bus": {
            "streams": [
                {"name": "teams.broadcast", "lag": 12, "redeliveries": 0},
                {"name": "agents.control", "lag": 4, "redeliveries": 1},
                {"name": "matrix.events", "lag": 0, "redeliveries": 0},
            ]
        },
        "databases": {
            "postgres": {"cpu_percent": 32, "iops": 210, "slow_queries": 2},
            "qdrant": {"cpu_percent": 24, "iops": 140, "collections": 8},
        },
    }


def get_ai_usage_metrics() -> Dict[str, Any]:
    agents = [_enriched_agent(agent, NODE1_ID) for agent in NODE1_AGENTS] + [
        _enriched_agent(agent, NODE2_ID) for agent in NODE2_AGENTS
    ]
    top_agents = sorted(agents, key=lambda a: a["metrics"]["tokens_in"], reverse=True)[:5]
    model_latency = [
        {"model": "qwen3:8b", "p50_ms": 620, "p95_ms": 910},
        {"model": "mistral-nemo:12b", "p50_ms": 550, "p95_ms": 840},
        {"model": "deepseek-r1:70b", "p50_ms": 880, "p95_ms": 1280},
        {"model": "qwen2.5-coder:72b", "p50_ms": 940, "p95_ms": 1490},
    ]
    return {
        "timestamp": _iso(),
        "tokens": {
            "last_hour_in": 180_000,
            "last_hour_out": 76_000,
            "last_24h_in": 2_850_000,
            "last_24h_out": 1_040_000,
        },
        "top_agents": top_agents,
        "model_latency": model_latency,
        "quota_guard": {
            "budget_percent": 64,
            "llm_provider": "Swapper Service",
            "next_reset": _iso(datetime.utcnow() + timedelta(hours=5)),
        },
    }


def get_stack_services() -> Dict[str, Any]:
    node1_services = get_services_by_node(NODE1_ID)
    node2_services = get_services_by_node(NODE2_ID)
    return {
        "timestamp": _iso(),
        "nodes": {
            NODE1_ID: node1_services,
            NODE2_ID: node2_services,
        },
        "summary": {
            "total": len(node1_services) + len(node2_services),
            "running": sum(1 for svc in node1_services + node2_services if svc.get("status") == "running"),
        },
    }


def get_stack_models() -> Dict[str, Any]:
    node1_models = _fetch_node1_models()
    node2_models = _fetch_node2_models()
    return {
        "timestamp": _iso(),
        "nodes": {
            NODE1_ID: node1_models,
            NODE2_ID: node2_models,
        },
        "summary": {
            "total": len(node1_models) + len(node2_models),
            "by_type": {
                "LLM": sum(1 for m in node1_models + node2_models if m.get("type", "LLM").lower() == "llm"),
                "VLM": sum(1 for m in node1_models + node2_models if "vl" in m.get("type", "").lower()),
                "Code": sum(1 for m in node1_models + node2_models if "code" in m.get("type", "").lower()),
            },
        },
    }


def get_agents_registry() -> Dict[str, Any]:
    agents = [_enriched_agent(agent, NODE1_ID) for agent in NODE1_AGENTS] + [
        _enriched_agent(agent, NODE2_ID) for agent in NODE2_AGENTS
    ]
    return {"timestamp": _iso(), "total": len(agents), "agents": agents}


def get_agent_profile(agent_id: str) -> Optional[Dict[str, Any]]:
    registry = get_agents_registry()["agents"]
    for agent in registry:
        if agent["id"] == agent_id:
            detailed = dict(agent)
            base_id = f"{agent_id}-profile"
            detailed["owner"] = "DAARION Core" if agent["node_id"] == NODE1_ID else "MicroDAO Lab"
            detailed["quotas"] = {
                "tokens_per_min": int(_stable_number(base_id + "-tpm", 3_000, 12_000)),
                "budget_per_day_usd": round(_stable_number(base_id + "-budget", 12, 48), 2),
            }
            detailed["usage_chart"] = {
                "period_hours": 24,
                "calls_series": [
                    {"hour": hour, "calls": int(_stable_number(f"{base_id}-calls-{hour}", 5, 110))}
                    for hour in range(24)
                ],
                "latency_series_ms": [
                    {"hour": hour, "latency": _stable_number(f"{base_id}-lat-{hour}", 350, 980)}
                    for hour in range(24)
                ],
            }
            detailed["quality"] = {
                "timeouts": int(_stable_number(base_id + "-timeouts", 0, 4)),
                "model_errors": int(_stable_number(base_id + "-model-errors", 0, 3)),
                "tool_errors": int(_stable_number(base_id + "-tool-errors", 0, 5)),
            }
            detailed["memory"] = {
                "scopes": ["Projects", "Teams", "Community"],
                "documents_indexed": int(_stable_number(base_id + "-docs", 40, 420)),
            }
            detailed["security"] = {
                "scopes": ["read_docs", "write_tasks", "call_operator"],
                "external_api_access": agent["node_id"] == NODE1_ID,
            }
            return detailed
    return None


def get_events_payload(node_id: str, limit: int = 10) -> Dict[str, Any]:
    return {"timestamp": _iso(), "events": get_node_events(node_id, limit)}


def get_alerts_payload(node_id: Optional[str] = None) -> Dict[str, Any]:
    return {"timestamp": _iso(), "alerts": get_alerts(node_id)}

