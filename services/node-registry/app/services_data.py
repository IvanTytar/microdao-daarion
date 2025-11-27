"""
Services data for NODE1 and NODE2
Збирає інформацію про запущені сервіси
"""
import subprocess
import psutil
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


# Реальна перевірка NODE1 через HTTP endpoints
def get_node1_services_real() -> List[Dict[str, Any]]:
    """Перевірити реальні сервіси NODE1 через HTTP"""
    services_to_check = [
        {"name": "Swapper Service", "url": "http://144.76.224.179:8890/health", "port": 8890, "type": "core"},
        {"name": "Agent Cabinet", "url": "http://144.76.224.179:8898/health", "port": 8898, "type": "core"},
        {"name": "Monitor Agent", "url": "http://144.76.224.179:9500/health", "port": 9500, "type": "core"},
        {"name": "Node Registry", "url": "http://144.76.224.179:9205/health", "port": 9205, "type": "infrastructure"},
        {"name": "Memory Service", "url": "http://144.76.224.179:8000/health", "port": 8000, "type": "core"},
        {"name": "NATS JetStream", "url": "http://144.76.224.179:4222", "port": 4222, "type": "infrastructure"},
        {"name": "PostgreSQL", "port": 5432, "type": "database", "status": "running"},  # Немає HTTP endpoint
        {"name": "Qdrant", "url": "http://144.76.224.179:6333", "port": 6333, "type": "database"},
        {"name": "Prometheus", "url": "http://144.76.224.179:9090/-/healthy", "port": 9090, "type": "monitoring"},
        {"name": "Grafana", "url": "http://144.76.224.179:3000/api/health", "port": 3000, "type": "monitoring"},
    ]
    
    import requests
    
    result = []
    for service in services_to_check:
        if "url" in service:
            try:
                response = requests.get(service["url"], timeout=2)
                status = "running" if response.status_code in [200, 204] else "unhealthy"
            except Exception:
                status = "stopped"
        else:
            # Для сервісів без HTTP endpoint (PostgreSQL) - вважаємо running
            status = service.get("status", "unknown")
        
        result.append({
            "name": service["name"],
            "port": service["port"],
            "type": service["type"],
            "status": status
        })
    
    return result


def get_local_services() -> List[Dict[str, Any]]:
    """Отримати список запущених сервісів на NODE2 (локально)"""
    services = []
    
    # Перевіряємо порти та процеси
    ports_to_check = {
        9205: {"name": "Node Registry", "type": "infrastructure"},
        8890: {"name": "Swapper Service", "type": "core"},
        4222: {"name": "NATS JetStream", "type": "infrastructure"},
        11434: {"name": "Ollama", "type": "ai"},
        8899: {"name": "MicroDAO Backend", "type": "core"},
        3000: {"name": "DAGI Network UI", "type": "frontend"},
    }
    
    for port, info in ports_to_check.items():
        status = "running" if is_port_open(port) else "stopped"
        services.append({
            "name": info["name"],
            "port": port,
            "type": info["type"],
            "status": status
        })
    
    return services


def is_port_open(port: int) -> bool:
    """Перевірити чи порт відкритий"""
    try:
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                return True
        return False
    except Exception as e:
        logger.error(f"Error checking port {port}: {e}")
        return False


def get_services_by_node(node_id: str) -> List[Dict[str, Any]]:
    """Отримати список сервісів для ноди"""
    if "node-1" in node_id or "hetzner" in node_id:
        return get_node1_services_real()
    elif "node-2" in node_id or "macbook" in node_id:
        return get_local_services()
    return []

