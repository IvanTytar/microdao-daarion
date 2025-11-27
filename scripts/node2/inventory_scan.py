#!/usr/bin/env python3
"""
Node-2 System Inventory Scanner
Scans the system for LLM servers, vector DBs, graph DBs, agents, Docker containers, etc.
Generates node2_system_inventory.json
"""

import json
import subprocess
import os
import platform
import socket
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import shutil

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

class Node2InventoryScanner:
    def __init__(self):
        self.inventory = {
            "hardware": {},
            "llm_servers": [],
            "vector_dbs": [],
            "graph_dbs": [],
            "rag_components": {
                "embedding_models": [],
                "pipelines": [],
                "indexes": []
            },
            "agents": [],
            "docker_containers": [],
            "brew_services": [],
            "model_files": [],
            "repositories": [],
            "duplicates": [],
            "conflicts": [],
            "recommended_cleanup": [],
            "scan_timestamp": datetime.now().isoformat(),
            "scan_version": "1.0.0"
        }
        
    def scan_hardware(self):
        """Scan hardware information"""
        print("🔍 Scanning hardware...")
        try:
            if PSUTIL_AVAILABLE:
                cpu_info = {
                    "model": platform.processor(),
                    "cores": psutil.cpu_count(logical=False),
                    "threads": psutil.cpu_count(logical=True)
                }
                memory_gb = psutil.virtual_memory().total / (1024**3)
            else:
                # Fallback without psutil
                cpu_info = {
                    "model": platform.processor(),
                    "cores": os.cpu_count() or 0,
                    "threads": os.cpu_count() or 0
                }
                # Try to get memory from system command
                try:
                    if platform.system() == "Darwin":
                        result = subprocess.run(
                            ["sysctl", "-n", "hw.memsize"],
                            capture_output=True,
                            text=True,
                            timeout=2
                        )
                        if result.returncode == 0:
                            memory_gb = int(result.stdout.strip()) / (1024**3)
                        else:
                            memory_gb = 0
                    else:
                        memory_gb = 0
                except:
                    memory_gb = 0
            
            disk = shutil.disk_usage("/")
            disk_info = {
                "free_gb": disk.free / (1024**3),
                "total_gb": disk.total / (1024**3),
                "used_gb": disk.used / (1024**3)
            }
            
            gpu_info = {"type": "unknown", "vram_gb": 0, "driver_version": "unknown"}
            # Try to detect GPU on macOS
            if platform.system() == "Darwin":
                try:
                    result = subprocess.run(
                        ["system_profiler", "SPDisplaysDataType"],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if "Chipset Model" in result.stdout:
                        gpu_info["type"] = "Apple Silicon" if "Apple" in result.stdout else "Unknown"
                except:
                    pass
            
            self.inventory["hardware"] = {
                "cpu": cpu_info,
                "memory_gb": round(memory_gb, 2),
                "gpu": gpu_info,
                "disk": {k: round(v, 2) for k, v in disk_info.items()}
            }
        except Exception as e:
            print(f"⚠️ Error scanning hardware: {e}")
    
    def scan_llm_servers(self):
        """Scan for LLM servers (Ollama, LM Studio, LobeChat, llama.cpp, etc.)"""
        print("🔍 Scanning LLM servers...")
        
        # Check Ollama
        try:
            result = subprocess.run(
                ["which", "ollama"],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0:
                ollama_path = result.stdout.strip()
                # Check if running
                status = "stopped"
                port = 11434
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('localhost', port))
                    if result == 0:
                        status = "running"
                    sock.close()
                except:
                    pass
                
                self.inventory["llm_servers"].append({
                    "name": "ollama",
                    "version": "unknown",
                    "path": ollama_path,
                    "status": status,
                    "port": port
                })
        except:
            pass
        
        # Check LM Studio
        lm_studio_paths = [
            "/Applications/LM Studio.app",
            os.path.expanduser("~/Applications/LM Studio.app"),
            "/Applications/LMStudio.app"
        ]
        for path in lm_studio_paths:
            if os.path.exists(path):
                self.inventory["llm_servers"].append({
                    "name": "lm-studio",
                    "version": "unknown",
                    "path": path,
                    "status": "unknown",
                    "port": 1234
                })
                break
        
        # Check LobeChat
        lobechat_paths = [
            "/Applications/LobeChat.app",
            os.path.expanduser("~/Applications/LobeChat.app"),
            os.path.expanduser("~/.lobe")
        ]
        for path in lobechat_paths:
            if os.path.exists(path):
                self.inventory["llm_servers"].append({
                    "name": "lobechat",
                    "version": "unknown",
                    "path": path,
                    "status": "unknown",
                    "port": 0
                })
                break
        
        # Check llama.cpp
        llama_paths = [
            "/usr/local/bin/llama-server",
            os.path.expanduser("~/llama.cpp/server"),
            os.path.expanduser("~/.local/bin/llama-server")
        ]
        for path in llama_paths:
            if os.path.exists(path):
                self.inventory["llm_servers"].append({
                    "name": "llama.cpp",
                    "version": "unknown",
                    "path": path,
                    "status": "unknown",
                    "port": 8080
                })
                break
    
    def scan_vector_dbs(self):
        """Scan for vector databases (Qdrant, Milvus, Faiss, Weaviate)"""
        print("🔍 Scanning vector databases...")
        
        # Check Qdrant
        qdrant_paths = [
            "/opt/qdrant",
            os.path.expanduser("~/qdrant"),
            os.path.expanduser("~/.qdrant")
        ]
        for path in qdrant_paths:
            if os.path.exists(path):
                # Check if running
                status = "stopped"
                port = 6333
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('localhost', port))
                    if result == 0:
                        status = "running"
                    sock.close()
                except:
                    pass
                
                self.inventory["vector_dbs"].append({
                    "engine": "qdrant",
                    "version": "unknown",
                    "path": path,
                    "status": status,
                    "collections": [],
                    "port": port
                })
                break
        
        # Check Milvus
        milvus_paths = [
            "/opt/milvus",
            os.path.expanduser("~/milvus"),
            os.path.expanduser("~/.milvus")
        ]
        for path in milvus_paths:
            if os.path.exists(path):
                status = "stopped"
                port = 19530
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('localhost', port))
                    if result == 0:
                        status = "running"
                    sock.close()
                except:
                    pass
                
                self.inventory["vector_dbs"].append({
                    "engine": "milvus",
                    "version": "unknown",
                    "path": path,
                    "status": status,
                    "collections": [],
                    "port": port
                })
                break
        
        # Check Weaviate
        weaviate_paths = [
            "/opt/weaviate",
            os.path.expanduser("~/weaviate")
        ]
        for path in weaviate_paths:
            if os.path.exists(path):
                self.inventory["vector_dbs"].append({
                    "engine": "weaviate",
                    "version": "unknown",
                    "path": path,
                    "status": "unknown",
                    "collections": [],
                    "port": 8080
                })
                break
    
    def scan_graph_dbs(self):
        """Scan for graph databases (Neo4j, DuckDB)"""
        print("🔍 Scanning graph databases...")
        
        # Check Neo4j
        neo4j_paths = [
            "/opt/neo4j",
            os.path.expanduser("~/neo4j"),
            os.path.expanduser("~/.neo4j")
        ]
        for path in neo4j_paths:
            if os.path.exists(path):
                status = "stopped"
                port = 7474
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('localhost', port))
                    if result == 0:
                        status = "running"
                    sock.close()
                except:
                    pass
                
                # Calculate DB size
                db_size_gb = 0
                db_path = os.path.join(path, "data", "databases")
                if os.path.exists(db_path):
                    total_size = sum(
                        os.path.getsize(os.path.join(dirpath, filename))
                        for dirpath, dirnames, filenames in os.walk(db_path)
                        for filename in filenames
                    )
                    db_size_gb = total_size / (1024**3)
                
                self.inventory["graph_dbs"].append({
                    "engine": "neo4j",
                    "version": "unknown",
                    "path": path,
                    "status": status,
                    "db_size_gb": round(db_size_gb, 2),
                    "port": port
                })
                break
        
        # Check DuckDB
        duckdb_paths = [
            os.path.expanduser("~/duckdb"),
            os.path.expanduser("~/.duckdb")
        ]
        for path in duckdb_paths:
            if os.path.exists(path):
                self.inventory["graph_dbs"].append({
                    "engine": "duckdb-graph",
                    "version": "unknown",
                    "path": path,
                    "status": "unknown",
                    "db_size_gb": 0,
                    "port": 0
                })
                break
    
    def scan_docker_containers(self):
        """Scan Docker containers"""
        print("🔍 Scanning Docker containers...")
        try:
            result = subprocess.run(
                ["docker", "ps", "-a", "--format", "json"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        try:
                            container = json.loads(line)
                            ports = []
                            if container.get("Ports"):
                                ports = [p.strip() for p in container["Ports"].split(",") if p.strip()]
                            
                            self.inventory["docker_containers"].append({
                                "name": container.get("Names", ""),
                                "image": container.get("Image", ""),
                                "ports": ports,
                                "status": container.get("Status", ""),
                                "created": container.get("CreatedAt", "")
                            })
                        except:
                            pass
        except Exception as e:
            print(f"⚠️ Error scanning Docker: {e}")
    
    def scan_brew_services(self):
        """Scan Homebrew services"""
        print("🔍 Scanning Homebrew services...")
        try:
            result = subprocess.run(
                ["brew", "services", "list"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n')[1:]:  # Skip header
                    if line:
                        parts = line.split()
                        if len(parts) >= 2:
                            self.inventory["brew_services"].append({
                                "name": parts[0],
                                "status": parts[1],
                                "path": "unknown"
                            })
        except Exception as e:
            print(f"⚠️ Error scanning brew services: {e}")
    
    def scan_model_files(self):
        """Scan for model files"""
        print("🔍 Scanning model files...")
        model_dirs = [
            os.path.expanduser("~/models"),
            os.path.expanduser("~/.ollama/models"),
            os.path.expanduser("~/Downloads"),
            "/opt/models"
        ]
        
        for model_dir in model_dirs:
            if os.path.exists(model_dir):
                for root, dirs, files in os.walk(model_dir):
                    for file in files:
                        if file.endswith(('.gguf', '.bin', '.safetensors', '.pt', '.pth')):
                            file_path = os.path.join(root, file)
                            try:
                                size_gb = os.path.getsize(file_path) / (1024**3)
                                model_type = "llm" if "llm" in file.lower() or "model" in file.lower() else "other"
                                
                                self.inventory["model_files"].append({
                                    "name": file,
                                    "size_gb": round(size_gb, 2),
                                    "path": file_path,
                                    "format": os.path.splitext(file)[1],
                                    "type": model_type
                                })
                            except:
                                pass
    
    def scan_repositories(self):
        """Scan for DAARION-related repositories"""
        print("🔍 Scanning repositories...")
        repo_dirs = [
            os.path.expanduser("~/github-projects"),
            os.path.expanduser("~/projects"),
            os.path.expanduser("~/dev")
        ]
        
        for repo_dir in repo_dirs:
            if os.path.exists(repo_dir):
                for item in os.listdir(repo_dir):
                    item_path = os.path.join(repo_dir, item)
                    if os.path.isdir(item_path) and os.path.exists(os.path.join(item_path, ".git")):
                        try:
                            result = subprocess.run(
                                ["git", "-C", item_path, "remote", "get-url", "origin"],
                                capture_output=True,
                                text=True,
                                timeout=2
                            )
                            remote_url = result.stdout.strip() if result.returncode == 0 else "unknown"
                            
                            result = subprocess.run(
                                ["git", "-C", item_path, "branch", "--show-current"],
                                capture_output=True,
                                text=True,
                                timeout=2
                            )
                            branch = result.stdout.strip() if result.returncode == 0 else "unknown"
                            
                            if "daarion" in item.lower() or "microdao" in item.lower() or "dagi" in item.lower():
                                self.inventory["repositories"].append({
                                    "name": item,
                                    "path": item_path,
                                    "remote_url": remote_url,
                                    "branch": branch
                                })
                        except:
                            pass
    
    def scan_agents(self):
        """Scan for agent files and configurations"""
        print("🔍 Scanning agents...")
        agent_paths = [
            os.path.expanduser("~/github-projects/microdao-daarion"),
            os.path.expanduser("~/projects/microdao-daarion")
        ]
        
        for base_path in agent_paths:
            if os.path.exists(base_path):
                # Look for agent configs
                config_files = [
                    "router-config.yml",
                    "config/agents.yaml",
                    "config/specialists.yaml"
                ]
                
                for config_file in config_files:
                    config_path = os.path.join(base_path, config_file)
                    if os.path.exists(config_path):
                        # Try to parse and extract agents
                        try:
                            with open(config_path, 'r') as f:
                                content = f.read()
                                # Simple extraction - can be improved
                                if "agents:" in content or "agent" in content.lower():
                                    self.inventory["agents"].append({
                                        "name": os.path.basename(config_file),
                                        "path": config_path,
                                        "language": "yaml",
                                        "status": "active",
                                        "config_file": config_path
                                    })
                        except:
                            pass
    
    def detect_duplicates(self):
        """Detect duplicate installations"""
        print("🔍 Detecting duplicates...")
        # Check for multiple Qdrant installations
        qdrant_paths = [db["path"] for db in self.inventory["vector_dbs"] if db["engine"] == "qdrant"]
        if len(qdrant_paths) > 1:
            self.inventory["duplicates"].append({
                "type": "qdrant",
                "paths": qdrant_paths,
                "description": "Multiple Qdrant installations detected"
            })
        
        # Check for multiple Neo4j installations
        neo4j_paths = [db["path"] for db in self.inventory["graph_dbs"] if db["engine"] == "neo4j"]
        if len(neo4j_paths) > 1:
            self.inventory["duplicates"].append({
                "type": "neo4j",
                "paths": neo4j_paths,
                "description": "Multiple Neo4j installations detected"
            })
    
    def detect_conflicts(self):
        """Detect conflicts"""
        print("🔍 Detecting conflicts...")
        # Check for port conflicts
        used_ports = set()
        for llm in self.inventory["llm_servers"]:
            if llm.get("port"):
                if llm["port"] in used_ports:
                    self.inventory["conflicts"].append({
                        "component": f"LLM server port {llm['port']}",
                        "description": f"Port {llm['port']} used by multiple services",
                        "severity": "high"
                    })
                used_ports.add(llm["port"])
        
        for db in self.inventory["vector_dbs"] + self.inventory["graph_dbs"]:
            if db.get("port"):
                if db["port"] in used_ports:
                    self.inventory["conflicts"].append({
                        "component": f"Database port {db['port']}",
                        "description": f"Port {db['port']} used by multiple services",
                        "severity": "high"
                    })
                used_ports.add(db["port"])
    
    def generate_cleanup_recommendations(self):
        """Generate cleanup recommendations"""
        print("🔍 Generating cleanup recommendations...")
        
        # Recommend removing LobeChat if found
        for llm in self.inventory["llm_servers"]:
            if llm["name"] == "lobechat":
                self.inventory["recommended_cleanup"].append({
                    "action": "delete",
                    "target": llm["path"],
                    "reason": "LobeChat is not part of microDAO architecture",
                    "safe": True
                })
        
        # Recommend migrating old DAARION Memory Core
        memory_core_paths = [
            os.path.expanduser("~/daarion-memory"),
            os.path.expanduser("~/.daarion/memory")
        ]
        for path in memory_core_paths:
            if os.path.exists(path):
                self.inventory["recommended_cleanup"].append({
                    "action": "migrate",
                    "target": path,
                    "reason": "Old DAARION Memory Core - migrate to /node2/legacy/",
                    "safe": True
                })
        
        # Recommend keeping Swoper if found
        for llm in self.inventory["llm_servers"]:
            if "swoper" in llm["name"].lower():
                self.inventory["recommended_cleanup"].append({
                    "action": "keep",
                    "target": llm["path"],
                    "reason": "Swoper is required for microDAO Node-2",
                    "safe": True
                })
    
    def scan_all(self):
        """Run all scans"""
        print("🚀 Starting Node-2 system inventory scan...\n")
        self.scan_hardware()
        self.scan_llm_servers()
        self.scan_vector_dbs()
        self.scan_graph_dbs()
        self.scan_docker_containers()
        self.scan_brew_services()
        self.scan_model_files()
        self.scan_repositories()
        self.scan_agents()
        self.detect_duplicates()
        self.detect_conflicts()
        self.generate_cleanup_recommendations()
        print("\n✅ Scan complete!")
    
    def save_inventory(self, output_path: str = "node2_system_inventory.json"):
        """Save inventory to JSON file"""
        output_file = Path(output_path)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.inventory, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Inventory saved to: {output_file.absolute()}")
        return output_file


def main():
    scanner = Node2InventoryScanner()
    scanner.scan_all()
    
    # Save to current directory and also to docs/node2/
    output_file = scanner.save_inventory("node2_system_inventory.json")
    
    docs_dir = Path(__file__).parent.parent.parent / "docs" / "node2"
    docs_dir.mkdir(parents=True, exist_ok=True)
    scanner.save_inventory(str(docs_dir / "node2_system_inventory.json"))
    
    print(f"\n📊 Summary:")
    print(f"   - LLM servers: {len(scanner.inventory['llm_servers'])}")
    print(f"   - Vector DBs: {len(scanner.inventory['vector_dbs'])}")
    print(f"   - Graph DBs: {len(scanner.inventory['graph_dbs'])}")
    print(f"   - Docker containers: {len(scanner.inventory['docker_containers'])}")
    print(f"   - Agents: {len(scanner.inventory['agents'])}")
    print(f"   - Duplicates: {len(scanner.inventory['duplicates'])}")
    print(f"   - Conflicts: {len(scanner.inventory['conflicts'])}")
    print(f"   - Cleanup recommendations: {len(scanner.inventory['recommended_cleanup'])}")


if __name__ == "__main__":
    main()

