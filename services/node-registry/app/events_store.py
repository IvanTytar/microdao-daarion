"""
In-memory events & alerts storage used by monitoring API.
Provide deterministic sample data until real event bus is integrated.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


def _iso(ts: datetime) -> str:
    return ts.isoformat() + "Z"


NOW = datetime.utcnow()

# Pre-populated events per node (most recent first)
NODE_EVENTS: Dict[str, List[Dict[str, Any]]] = {
    "node-1-hetzner-gex44": [
        {
            "id": "evt-node1-001",
            "timestamp": _iso(NOW - timedelta(minutes=4)),
            "type": "model_switch",
            "severity": "info",
            "title": "Swapper активував qwen3:8b",
            "details": "DAGI Router оновив активну модель до qwen3:8b",
        },
        {
            "id": "evt-node1-002",
            "timestamp": _iso(NOW - timedelta(minutes=12)),
            "type": "service_restart",
            "severity": "info",
            "title": "Перезапуск Monitor Agent",
            "details": "Monitor Agent (порт 9500) успішно перезапущено",
        },
        {
            "id": "evt-node1-003",
            "timestamp": _iso(NOW - timedelta(hours=1, minutes=5)),
            "type": "alert_resolved",
            "severity": "low",
            "title": "CPU Load нормалізовано",
            "details": "Середнє навантаження CPU < 65% протягом 15 хв",
        },
    ],
    "node-macbook-pro-0e14f673": [
        {
            "id": "evt-node2-001",
            "timestamp": _iso(NOW - timedelta(minutes=2)),
            "type": "heartbeat",
            "severity": "info",
            "title": "Heartbeat отримано",
            "details": "NODE2 відправив heartbeat з оновленими метриками",
        },
        {
            "id": "evt-node2-002",
            "timestamp": _iso(NOW - timedelta(minutes=18)),
            "type": "service_warning",
            "severity": "warning",
            "title": "NATS JetStream: підвищений lag",
            "details": "Lag stream teams.broadcast досяг 320 повідомлень",
        },
    ],
    "default": [
        {
            "id": "evt-generic-001",
            "timestamp": _iso(NOW - timedelta(minutes=30)),
            "type": "heartbeat",
            "severity": "info",
            "title": "Нода надіслала heartbeat",
            "details": "Будь-яка нода без спеціальних подій",
        }
    ],
}

# Active alerts (cluster-wide)
GLOBAL_ALERTS: List[Dict[str, Any]] = [
    {
        "id": "alert-001",
        "node_id": "node-1-hetzner-gex44",
        "severity": "warning",
        "title": "Grafana недоступна зовні",
        "description": "HTTP 502 при доступі до port 3000. Потрібно перевірити reverse proxy.",
        "started_at": _iso(NOW - timedelta(hours=2, minutes=15)),
        "status": "active",
    },
    {
        "id": "alert-002",
        "node_id": "node-macbook-pro-0e14f673",
        "severity": "info",
        "title": "Prometheus (локально) в режимі developer",
        "description": "Метрики доступні тільки локально. Для production потрібен захищений тунель.",
        "started_at": _iso(NOW - timedelta(minutes=45)),
        "status": "acknowledged",
    },
]


def get_node_events(node_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Return latest events for node. Falls back to default events.
    """
    events = NODE_EVENTS.get(node_id) or NODE_EVENTS.get("default", [])
    return sorted(events, key=lambda e: e["timestamp"], reverse=True)[:limit]


def get_alerts(node_id: str | None = None) -> List[Dict[str, Any]]:
    """
    Return active alerts filtered by node if provided.
    """
    alerts = GLOBAL_ALERTS
    if node_id:
        alerts = [alert for alert in alerts if alert.get("node_id") == node_id]
    return alerts


def add_event(node_id: str, event: Dict[str, Any]) -> None:
    """
    Append new event to node (utility for future integrations).
    """
    event = dict(event)
    event.setdefault("timestamp", _iso(datetime.utcnow()))
    NODE_EVENTS.setdefault(node_id, []).insert(0, event)


def add_alert(alert: Dict[str, Any]) -> None:
    """
    Append new global alert.
    """
    alert = dict(alert)
    alert.setdefault("id", f"alert-{len(GLOBAL_ALERTS) + 1:03d}")
    alert.setdefault("started_at", _iso(datetime.utcnow()))
    alert.setdefault("status", "active")
    GLOBAL_ALERTS.insert(0, alert)

