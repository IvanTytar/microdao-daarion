"""
Node Dashboard API - Aggregator for node status and metrics
"""
import asyncio
import logging
import httpx
import psutil
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Probe timeout in seconds
PROBE_TIMEOUT = 0.5
PROBE_TIMEOUT_LONG = 1.0


class DashboardAggregator:
    """Aggregates data from multiple services for node dashboard"""
    
    def __init__(self, node_ip: str = "localhost"):
        self.node_ip = node_ip
        self.client = httpx.AsyncClient(timeout=PROBE_TIMEOUT)
    
    async def close(self):
        await self.client.aclose()
    
    async def _probe(self, url: str, timeout: float = PROBE_TIMEOUT) -> Dict[str, Any]:
        """Execute HTTP probe with timeout"""
        try:
            resp = await self.client.get(url, timeout=timeout)
            if resp.status_code == 200:
                return {"status": "up", "data": resp.json(), "latency_ms": int(resp.elapsed.total_seconds() * 1000)}
            else:
                return {"status": "degraded", "error": f"HTTP {resp.status_code}"}
        except httpx.TimeoutException:
            return {"status": "down", "error": "timeout"}
        except httpx.ConnectError:
            return {"status": "down", "error": "connection refused"}
        except Exception as e:
            return {"status": "down", "error": str(e)}
    
    async def get_infra_metrics(self) -> Dict[str, Any]:
        """Get infrastructure metrics using psutil"""
        try:
            cpu_pct = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            result = {
                "cpu_usage_pct": round(cpu_pct, 1),
                "ram": {
                    "total_gb": round(mem.total / (1024**3), 1),
                    "used_gb": round(mem.used / (1024**3), 1)
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 1),
                    "used_gb": round(disk.used / (1024**3), 1)
                },
                "gpus": []
            }
            
            # Try to get GPU info (nvidia-smi or similar)
            try:
                import subprocess
                nvidia_output = subprocess.run(
                    ['nvidia-smi', '--query-gpu=name,memory.total,memory.used,utilization.gpu', '--format=csv,noheader,nounits'],
                    capture_output=True, text=True, timeout=2
                )
                if nvidia_output.returncode == 0:
                    for line in nvidia_output.stdout.strip().split('\n'):
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 4:
                            result["gpus"].append({
                                "name": parts[0],
                                "vram_gb": round(float(parts[1]) / 1024, 1),
                                "used_gb": round(float(parts[2]) / 1024, 1),
                                "sm_util_pct": int(parts[3])
                            })
            except:
                pass
            
            return result
        except Exception as e:
            logger.error(f"Failed to get infra metrics: {e}")
            return {
                "cpu_usage_pct": 0,
                "ram": {"total_gb": 0, "used_gb": 0},
                "disk": {"total_gb": 0, "used_gb": 0},
                "gpus": []
            }
    
    async def probe_swapper(self, port: int = 8890) -> Dict[str, Any]:
        """Probe Swapper service"""
        base_url = f"http://{self.node_ip}:{port}"
        
        health_result = await self._probe(f"{base_url}/health", PROBE_TIMEOUT_LONG)
        models_result = await self._probe(f"{base_url}/models", PROBE_TIMEOUT_LONG)
        
        result = {
            "status": health_result.get("status", "unknown"),
            "endpoint": base_url,
            "latency_ms": health_result.get("latency_ms", 0),
            "storage": {"total_gb": 0, "used_gb": 0, "free_gb": 0},
            "models": []
        }
        
        if health_result.get("status") == "up":
            data = health_result.get("data", {})
            result["active_model"] = data.get("active_model")
            result["mode"] = data.get("mode")
        
        if models_result.get("status") == "up":
            data = models_result.get("data", {})
            for m in data.get("models", []):
                result["models"].append({
                    "name": m.get("name"),
                    "size_gb": m.get("size_gb", 0),
                    "device": m.get("device", "disk"),
                    "state": m.get("status", "unloaded")
                })
        
        return result
    
    async def probe_router(self, port: int = 9102) -> Dict[str, Any]:
        """Probe DAGI Router service"""
        base_url = f"http://{self.node_ip}:{port}"
        
        health_result = await self._probe(f"{base_url}/health", PROBE_TIMEOUT_LONG)
        backends_result = await self._probe(f"{base_url}/backends/status", PROBE_TIMEOUT_LONG)
        
        result = {
            "status": health_result.get("status", "unknown"),
            "endpoint": base_url,
            "version": "unknown",
            "backends": [],
            "metrics": {
                "requests_1m": 0,
                "requests_1h": 0,
                "error_rate_1h": 0,
                "avg_latency_ms_1h": 0
            }
        }
        
        if health_result.get("status") == "up":
            data = health_result.get("data", {})
            result["version"] = data.get("version", "unknown")
            result["nats_connected"] = data.get("nats_connected", False)
        
        if backends_result.get("status") == "up":
            for backend in backends_result.get("data", []):
                result["backends"].append({
                    "name": backend.get("name"),
                    "status": backend.get("status"),
                    "latency_ms": backend.get("latency_ms", 0),
                    "error": backend.get("error")
                })
        
        return result
    
    async def probe_service(self, name: str, port: int, health_path: str = "/health") -> Dict[str, Any]:
        """Probe generic AI service"""
        base_url = f"http://{self.node_ip}:{port}"
        
        result = await self._probe(f"{base_url}{health_path}")
        
        return {
            "status": result.get("status", "unknown"),
            "endpoint": base_url,
            "latency_ms": result.get("latency_ms", 0),
            "error": result.get("error")
        }
    
    async def probe_ollama(self, port: int = 11434) -> Dict[str, Any]:
        """Probe Ollama service"""
        base_url = f"http://{self.node_ip}:{port}"
        
        result = await self._probe(f"{base_url}/api/tags", PROBE_TIMEOUT_LONG)
        
        models = []
        if result.get("status") == "up":
            data = result.get("data", {})
            for m in data.get("models", []):
                models.append(m.get("name"))
        
        return {
            "status": result.get("status", "unknown"),
            "endpoint": base_url,
            "latency_ms": result.get("latency_ms", 0),
            "models": models[:10],  # Limit to 10 models
            "error": result.get("error")
        }
    
    async def probe_matrix(self, synapse_port: int = 8018, presence_port: int = 8085) -> Dict[str, Any]:
        """Probe Matrix services"""
        synapse_result = await self._probe(f"http://{self.node_ip}:{synapse_port}/_matrix/client/versions")
        presence_result = await self._probe(f"http://{self.node_ip}:{presence_port}/health")
        
        return {
            "enabled": synapse_result.get("status") == "up",
            "homeserver": f"http://{self.node_ip}:{synapse_port}",
            "synapse": {
                "status": synapse_result.get("status", "unknown"),
                "latency_ms": synapse_result.get("latency_ms", 0)
            },
            "presence_bridge": {
                "status": presence_result.get("status", "unknown"),
                "latency_ms": presence_result.get("latency_ms", 0)
            }
        }
    
    async def probe_monitoring(self, prometheus_port: int = 9090, grafana_port: int = 3001) -> Dict[str, Any]:
        """Probe monitoring services"""
        prometheus_result = await self._probe(f"http://{self.node_ip}:{prometheus_port}/-/ready")
        grafana_result = await self._probe(f"http://{self.node_ip}:{grafana_port}/api/health")
        
        return {
            "prometheus": {
                "url": f"http://{self.node_ip}:{prometheus_port}",
                "status": prometheus_result.get("status", "unknown")
            },
            "grafana": {
                "url": f"http://{self.node_ip}:{grafana_port}",
                "status": grafana_result.get("status", "unknown")
            },
            "logging": {
                "loki": {"status": "unknown"}
            }
        }
    
    async def get_agents_summary(self, city_service_port: int = 7001) -> Dict[str, Any]:
        """Get agents summary from city service"""
        # City service uses /city/agents endpoint
        result = await self._probe(f"http://{self.node_ip}:{city_service_port}/city/agents", PROBE_TIMEOUT_LONG)
        
        summary = {
            "total": 0,
            "running": 0,
            "by_kind": {},
            "top": []
        }
        
        if result.get("status") == "up":
            agents = result.get("data", [])
            summary["total"] = len(agents)
            
            for agent in agents:
                kind = agent.get("kind", "unknown")
                summary["by_kind"][kind] = summary["by_kind"].get(kind, 0) + 1
                
                if agent.get("status") in ["online", "busy"]:
                    summary["running"] += 1
            
            # Top 5 agents
            online_agents = [a for a in agents if a.get("status") in ["online", "busy"]][:5]
            for agent in online_agents:
                summary["top"].append({
                    "agent_id": agent.get("id"),
                    "display_name": agent.get("display_name"),
                    "kind": agent.get("kind"),
                    "status": agent.get("status"),
                    "node_id": agent.get("node_id")
                })
        
        return summary


async def build_dashboard(node_profile: Dict[str, Any], node_ip: str = "localhost") -> Dict[str, Any]:
    """
    Build complete dashboard from node profile.
    
    Args:
        node_profile: Node profile from registry (with modules, gpu, roles)
        node_ip: IP address to probe services
    
    Returns:
        Complete dashboard JSON
    """
    aggregator = DashboardAggregator(node_ip)
    
    try:
        # Build module port map
        module_ports = {}
        for module in node_profile.get("modules", []):
            if module.get("port"):
                module_ports[module["id"]] = module["port"]
        
        # Parallel probes
        tasks = {
            "infra": aggregator.get_infra_metrics(),
        }
        
        # Add probes based on modules
        if "ai.swapper" in module_ports:
            tasks["swapper"] = aggregator.probe_swapper(module_ports["ai.swapper"])
        
        if "ai.router" in module_ports:
            tasks["router"] = aggregator.probe_router(module_ports["ai.router"])
        
        if "ai.ollama" in module_ports:
            tasks["ollama"] = aggregator.probe_ollama(module_ports["ai.ollama"])
        
        # Generic AI services
        ai_services = ["ai.stt", "ai.tts", "ai.ocr", "ai.memory", "ai.crewai"]
        for svc in ai_services:
            if svc in module_ports:
                svc_name = svc.replace("ai.", "")
                tasks[f"svc_{svc_name}"] = aggregator.probe_service(svc_name, module_ports[svc])
        
        # Matrix
        synapse_port = module_ports.get("matrix.synapse", 8018)
        presence_port = module_ports.get("matrix.presence", 8085)
        if "matrix.synapse" in module_ports or "matrix.presence" in module_ports:
            tasks["matrix"] = aggregator.probe_matrix(synapse_port, presence_port)
        
        # Monitoring
        prometheus_port = module_ports.get("monitoring.prometheus", 9090)
        tasks["monitoring"] = aggregator.probe_monitoring(prometheus_port)
        
        # Agents
        city_port = module_ports.get("daarion.city", 7001)
        if "daarion.city" in module_ports or "daarion.agents" in module_ports:
            tasks["agents"] = aggregator.get_agents_summary(city_port)
        
        # Execute all probes in parallel
        results = {}
        for name, task in tasks.items():
            try:
                results[name] = await task
            except Exception as e:
                logger.error(f"Probe {name} failed: {e}")
                results[name] = {"status": "error", "error": str(e)}
        
        # Build dashboard response
        dashboard = {
            "node": {
                "node_id": node_profile.get("node_id"),
                "name": node_profile.get("name"),
                "roles": node_profile.get("roles", []),
                "status": node_profile.get("status", "unknown"),
                "public_hostname": node_profile.get("ip_address"),
                "environment": node_profile.get("role", "production"),
                "gpu": node_profile.get("gpu"),
                "modules": node_profile.get("modules", []),
                "version": node_profile.get("version", "1.0.0")
            },
            "infra": results.get("infra", {}),
            "ai": {
                "swapper": results.get("swapper", {"status": "not_installed"}),
                "router": results.get("router", {"status": "not_installed"}),
                "ollama": results.get("ollama", {"status": "not_installed"}),
                "services": {}
            },
            "agents": results.get("agents", {"total": 0, "running": 0, "by_kind": {}, "top": []}),
            "matrix": results.get("matrix", {"enabled": False}),
            "monitoring": results.get("monitoring", {})
        }
        
        # Add AI services
        for key, value in results.items():
            if key.startswith("svc_"):
                svc_name = key.replace("svc_", "")
                dashboard["ai"]["services"][svc_name] = value
        
        return dashboard
    
    finally:
        await aggregator.close()

