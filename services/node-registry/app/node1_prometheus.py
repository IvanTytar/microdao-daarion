"""
Helper for reading real Prometheus metrics from NODE1 via SSH tunnel.
Assumes tunnel exposes Prometheus locally (http://localhost:19090 by default).
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, Optional

import requests

PROM_URL = os.getenv("NODE1_PROMETHEUS_URL", "http://localhost:19090")
REQUEST_TIMEOUT = float(os.getenv("NODE1_PROMETHEUS_TIMEOUT", "2.5"))

PROM_HEALTH_QUERY = 'up{job="prometheus"}'
CPU_USAGE_QUERY = "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
MEMORY_USAGE_QUERY = "(1 - (avg(node_memory_MemAvailable_bytes) / avg(node_memory_MemTotal_bytes))) * 100"
DISK_USAGE_QUERY = "(1 - (sum(node_filesystem_free_bytes{mountpoint=\"/\",fstype!~\"tmpfs|overlay\"}) / sum(node_filesystem_size_bytes{mountpoint=\"/\",fstype!~\"tmpfs|overlay\"}))) * 100"
GPU_USAGE_QUERY = "avg(dcgm_gpu_utilization)"


def prom_query(query: str) -> Optional[float]:
    """Execute Prometheus instant query and return float value."""
    try:
        response = requests.get(
            f"{PROM_URL}/api/v1/query",
            params={"query": query},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "success":
            return None
        results = payload.get("data", {}).get("result", [])
        if not results:
            return None
        # value structure: [timestamp, value]
        value = float(results[0]["value"][1])
        return value
    except Exception:
        return None


def _clamp(value: Optional[float]) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(100.0, round(value, 2)))


def get_node1_metrics() -> Dict[str, Any]:
    """
    Collect NODE1 metrics via Prometheus tunnel.
    Returns structure compatible with system_metrics.get_all_metrics().
    """
    health = prom_query(PROM_HEALTH_QUERY)
    if health is None:
        return {
            "success": False,
            "error": "Prometheus reachable but returned no data for health query",
            "source": PROM_URL,
        }

    cpu_percent = _clamp(prom_query(CPU_USAGE_QUERY))
    mem_percent = _clamp(prom_query(MEMORY_USAGE_QUERY))
    disk_percent = _clamp(prom_query(DISK_USAGE_QUERY))
    gpu_percent = _clamp(prom_query(GPU_USAGE_QUERY))

    metrics_available = any(value > 0 for value in [cpu_percent, mem_percent, disk_percent, gpu_percent])
    message = None
    if not metrics_available:
        message = "node_exporter/DCGM метрики не знайдені, повертаємо значення за замовчуванням"

    return {
        "success": True,
        "metrics_available": metrics_available,
        "source": PROM_URL,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": message,
        "metrics": {
            "cpu": {"percent": cpu_percent},
            "memory": {"percent": mem_percent},
            "disk": {"percent": disk_percent},
            "gpu": {"percent": gpu_percent},
        },
    }

