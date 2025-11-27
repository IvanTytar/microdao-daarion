#!/usr/bin/env python3
"""
Node Bootstrap Agent
Automatically registers the node and maintains heartbeat
"""

import os
import sys
import time
import socket
import platform
import psutil
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import requests

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NodeBootstrap:
    """
    Bootstrap agent that registers and maintains node presence in the registry
    """
    
    def __init__(
        self,
        registry_url: str = "http://localhost:9205",
        node_role: str = "worker",
        node_type: str = "worker",
        heartbeat_interval: int = 30,
        auto_detect: bool = True
    ):
        self.registry_url = registry_url.rstrip('/')
        self.node_role = node_role
        self.node_type = node_type
        self.heartbeat_interval = heartbeat_interval
        self.auto_detect = auto_detect
        self.node_id = None
        self.registered = False
        
        logger.info(f"🚀 Initializing Node Bootstrap")
        logger.info(f"📡 Registry URL: {self.registry_url}")
    
    def get_system_info(self) -> Dict[str, Any]:
        """Collect system information"""
        try:
            hostname = socket.gethostname()
            
            # Get local IP
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except:
                local_ip = "127.0.0.1"
            
            # Get public IP (if possible)
            try:
                public_ip = requests.get('https://api.ipify.org', timeout=5).text
            except:
                public_ip = None
            
            # System specs
            cpu_count = psutil.cpu_count()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "hostname": hostname,
                "local_ip": local_ip,
                "public_ip": public_ip,
                "platform": platform.system(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "cpu_count": cpu_count,
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "python_version": platform.python_version(),
            }
        except Exception as e:
            logger.error(f"Failed to collect system info: {e}")
            return {}
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Detect node capabilities"""
        capabilities = {
            "system": self.get_system_info(),
            "services": [],
            "features": [],
        }
        
        # Check for Docker
        try:
            import subprocess
            result = subprocess.run(['docker', '--version'], capture_output=True, timeout=5)
            if result.returncode == 0:
                capabilities["features"].append("docker")
        except:
            pass
        
        # Check for GPU (NVIDIA)
        try:
            import subprocess
            result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'], 
                                  capture_output=True, timeout=5)
            if result.returncode == 0:
                gpu_names = result.stdout.decode().strip().split('\n')
                capabilities["gpu"] = {
                    "available": True,
                    "gpus": gpu_names,
                    "count": len(gpu_names)
                }
                capabilities["features"].append("gpu")
        except:
            capabilities["gpu"] = {"available": False}
        
        # Check for Ollama
        try:
            response = requests.get('http://localhost:11434/api/tags', timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                capabilities["ollama"] = {
                    "available": True,
                    "models": [m['name'] for m in models]
                }
                capabilities["services"].append("ollama")
        except:
            capabilities["ollama"] = {"available": False}
        
        return capabilities
    
    def register(self) -> bool:
        """Register node with registry"""
        logger.info("📝 Registering node with registry...")
        
        system_info = self.get_system_info()
        capabilities = self.get_capabilities()
        
        # Generate node name
        hostname = system_info.get('hostname', 'unknown')
        node_name = f"{hostname} ({self.node_role})"
        
        payload = {
            "node_name": node_name,
            "node_role": self.node_role,
            "node_type": self.node_type,
            "hostname": hostname,
            "ip_address": system_info.get('public_ip'),
            "local_ip": system_info.get('local_ip'),
            "capabilities": capabilities,
        }
        
        try:
            response = requests.post(
                f"{self.registry_url}/api/v1/nodes/register",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.node_id = data.get('node_id')
                self.registered = True
                logger.info(f"✅ Node registered successfully: {self.node_id}")
                logger.info(f"📊 Node details: {json.dumps(data, indent=2)}")
                return True
            else:
                logger.error(f"❌ Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Registration error: {e}")
            return False
    
    def send_heartbeat(self) -> bool:
        """Send heartbeat to registry"""
        if not self.registered or not self.node_id:
            logger.warning("⚠️ Node not registered, skipping heartbeat")
            return False
        
        # Collect current metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        
        payload = {
            "node_id": self.node_id,
            "status": "online",
            "metrics": metrics,
        }
        
        try:
            response = requests.post(
                f"{self.registry_url}/api/v1/nodes/heartbeat",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug(f"💓 Heartbeat sent: CPU={cpu_percent}% MEM={memory.percent}%")
                return True
            else:
                logger.warning(f"⚠️ Heartbeat failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Heartbeat error: {e}")
            return False
    
    def run(self):
        """
        Main loop: register and maintain heartbeat
        """
        logger.info("🏁 Starting Node Bootstrap Agent")
        
        # Initial registration
        if not self.register():
            logger.error("❌ Initial registration failed, exiting")
            sys.exit(1)
        
        # Heartbeat loop
        logger.info(f"💓 Starting heartbeat loop (interval: {self.heartbeat_interval}s)")
        
        consecutive_failures = 0
        max_failures = 5
        
        try:
            while True:
                time.sleep(self.heartbeat_interval)
                
                if self.send_heartbeat():
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    logger.warning(f"⚠️ Consecutive failures: {consecutive_failures}/{max_failures}")
                    
                    if consecutive_failures >= max_failures:
                        logger.error("❌ Too many failures, attempting re-registration")
                        if self.register():
                            consecutive_failures = 0
                        else:
                            logger.error("❌ Re-registration failed, exiting")
                            sys.exit(1)
        
        except KeyboardInterrupt:
            logger.info("👋 Shutting down bootstrap agent")
            sys.exit(0)


def main():
    """Main entry point"""
    # Configuration from environment
    registry_url = os.getenv("NODE_REGISTRY_URL", "http://localhost:9205")
    node_role = os.getenv("NODE_ROLE", "worker")
    node_type = os.getenv("NODE_TYPE", "worker")
    heartbeat_interval = int(os.getenv("HEARTBEAT_INTERVAL", "30"))
    
    # Create and run bootstrap agent
    bootstrap = NodeBootstrap(
        registry_url=registry_url,
        node_role=node_role,
        node_type=node_type,
        heartbeat_interval=heartbeat_interval,
    )
    
    bootstrap.run()


if __name__ == "__main__":
    main()

