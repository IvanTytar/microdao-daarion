"""
NodeConnector Agent helpers.
Перевіряє готовність середовища для підключення нових нод.
"""
from __future__ import annotations

import socket
from typing import Any, Dict, List

import requests

from .database import check_db_connection
from .node1_prometheus import get_node1_metrics
from .system_metrics import get_all_metrics


def _check_port(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def get_node_connector_report() -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []

    # Database / registry
    db_ok = check_db_connection()
    checks.append(
        {
            "name": "Node Registry DB",
            "description": "Перевірка підключення до бази реєстру",
            "status": "ok" if db_ok else "fail",
            "details": "PostgreSQL/SQlite доступний" if db_ok else "База недоступна",
        }
    )

    # Local metrics
    try:
        metrics = get_all_metrics()
        checks.append(
            {
                "name": "Локальні метрики",
                "description": "psutil збирає дані NODE2",
                "status": "ok",
                "details": f"CPU {metrics['cpu']['percent']}%",
            }
        )
    except Exception as exc:
        checks.append(
            {
                "name": "Локальні метрики",
                "description": "psutil збирає дані NODE2",
                "status": "fail",
                "details": str(exc),
            }
        )

    # Prometheus tunnel
    prom_metrics = get_node1_metrics()
    prom_status = "ok" if prom_metrics.get("success") else "warn"
    checks.append(
        {
            "name": "Prometheus Tunnel",
            "description": "SSH-тунель до NODE1:9090",
            "status": prom_status,
            "details": prom_metrics.get("message")
            or ("Підключено" if prom_status == "ok" else "Немає даних"),
        }
    )

    # NATS
    nats_ok = _check_port("127.0.0.1", 4222)
    checks.append(
        {
            "name": "NATS JetStream",
            "description": "Порт 4222 (локально)",
            "status": "ok" if nats_ok else "warn",
            "details": "Порт відкритий" if nats_ok else "Немає відповіді на 4222",
        }
    )

    # Swapper service (NODE1)
    try:
        swapper = requests.get("http://144.76.224.179:8890/health", timeout=2)
        swapper_ok = swapper.status_code == 200
    except Exception:
        swapper_ok = False
    checks.append(
        {
            "name": "Swapper Service",
            "description": "NODE1 LLM router (порт 8890)",
            "status": "ok" if swapper_ok else "warn",
            "details": "Відповідає 200 OK" if swapper_ok else "Немає зв'язку з 144.76.224.179:8890",
        }
    )

    ready = all(check["status"] == "ok" for check in checks)
    degraded = any(check["status"] == "warn" for check in checks)

    return {
        "summary": {
            "ready": ready,
            "status": "ready" if ready else ("degraded" if degraded else "blocked"),
            "checks_total": len(checks),
            "checks_ok": sum(1 for check in checks if check["status"] == "ok"),
        },
        "checks": checks,
    }

