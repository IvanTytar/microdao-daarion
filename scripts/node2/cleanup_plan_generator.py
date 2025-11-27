#!/usr/bin/env python3
"""
Cleanup Plan Generator for Node-2
Analyzes node2_system_inventory.json and generates a detailed cleanup plan
"""

import json
from pathlib import Path
from typing import Dict, List, Any

class CleanupPlanGenerator:
    def __init__(self, inventory_path: str = "node2_system_inventory.json"):
        self.inventory_path = Path(inventory_path)
        self.inventory = {}
        self.cleanup_plan = {
            "delete": [],
            "migrate": [],
            "keep": [],
            "stop": [],
            "warnings": []
        }
        
    def load_inventory(self):
        """Load inventory JSON"""
        if not self.inventory_path.exists():
            raise FileNotFoundError(f"Inventory file not found: {self.inventory_path}")
        
        with open(self.inventory_path, 'r', encoding='utf-8') as f:
            self.inventory = json.load(f)
        print(f"✅ Loaded inventory from: {self.inventory_path}")
    
    def analyze_llm_servers(self):
        """Analyze LLM servers and recommend cleanup"""
        print("\n🔍 Analyzing LLM servers...")
        
        for llm in self.inventory.get("llm_servers", []):
            name = llm.get("name", "").lower()
            
            if name == "lobechat":
                self.cleanup_plan["delete"].append({
                    "type": "llm_server",
                    "name": llm.get("name"),
                    "path": llm.get("path"),
                    "reason": "LobeChat is not part of microDAO architecture. Use Swoper instead.",
                    "safe": True,
                    "action": "Remove LobeChat application"
                })
            
            elif name == "lm-studio":
                self.cleanup_plan["migrate"].append({
                    "type": "llm_server",
                    "name": llm.get("name"),
                    "path": llm.get("path"),
                    "reason": "LM Studio can be kept for local testing but not needed for microDAO",
                    "safe": True,
                    "action": "Optional: Keep for local testing or remove"
                })
            
            elif name == "ollama":
                # Check if there's also Docker Ollama
                docker_ollama = any(
                    "ollama" in c.get("name", "").lower() or "ollama" in c.get("image", "").lower()
                    for c in self.inventory.get("docker_containers", [])
                )
                if docker_ollama:
                    self.cleanup_plan["warnings"].append({
                        "type": "duplicate",
                        "component": "Ollama",
                        "description": "Ollama found both as brew service and Docker container. Recommend using one.",
                        "severity": "medium"
                    })
                else:
                    self.cleanup_plan["keep"].append({
                        "type": "llm_server",
                        "name": llm.get("name"),
                        "path": llm.get("path"),
                        "reason": "Ollama can be used for local LLM inference. Will be replaced by Swoper.",
                        "safe": True,
                        "action": "Keep for now, will migrate to Swoper"
                    })
    
    def analyze_vector_dbs(self):
        """Analyze vector databases"""
        print("🔍 Analyzing vector databases...")
        
        vector_dbs = self.inventory.get("vector_dbs", [])
        docker_vector_dbs = [
            c for c in self.inventory.get("docker_containers", [])
            if any(db in c.get("name", "").lower() for db in ["qdrant", "milvus", "weaviate", "vector"])
        ]
        
        # Check for Qdrant
        qdrant_found = any(db.get("engine") == "qdrant" for db in vector_dbs)
        docker_qdrant = any("qdrant" in c.get("name", "").lower() for c in docker_vector_dbs)
        
        if docker_qdrant:
            qdrant_container = next(
                (c for c in docker_vector_dbs if "qdrant" in c.get("name", "").lower()),
                None
            )
            if qdrant_container:
                if qdrant_container.get("status", "").lower() == "unhealthy":
                    self.cleanup_plan["warnings"].append({
                        "type": "unhealthy",
                        "component": "Qdrant Docker container",
                        "description": f"Qdrant container '{qdrant_container.get('name')}' is unhealthy. Needs investigation.",
                        "severity": "high"
                    })
                else:
                    self.cleanup_plan["keep"].append({
                        "type": "vector_db",
                        "name": "Qdrant (Docker)",
                        "path": f"Docker: {qdrant_container.get('name')}",
                        "reason": "Qdrant is required for microDAO Node-2 fast RAG",
                        "safe": True,
                        "action": "Keep and ensure healthy"
                    })
        
        if not qdrant_found and not docker_qdrant:
            self.cleanup_plan["warnings"].append({
                "type": "missing",
                "component": "Qdrant",
                "description": "Qdrant not found. Required for microDAO Node-2.",
                "severity": "high"
            })
        
        # Check for Milvus
        milvus_found = any(db.get("engine") == "milvus" for db in vector_dbs)
        if not milvus_found:
            self.cleanup_plan["warnings"].append({
                "type": "missing",
                "component": "Milvus",
                "description": "Milvus not found. Required for microDAO Node-2 heavy vector indexing.",
                "severity": "high"
            })
    
    def analyze_graph_dbs(self):
        """Analyze graph databases"""
        print("🔍 Analyzing graph databases...")
        
        graph_dbs = self.inventory.get("graph_dbs", [])
        neo4j_found = any(db.get("engine") == "neo4j" for db in graph_dbs)
        
        if not neo4j_found:
            self.cleanup_plan["warnings"].append({
                "type": "missing",
                "component": "Neo4j",
                "description": "Neo4j not found. Required for microDAO Node-2 graph memory.",
                "severity": "high"
            })
    
    def analyze_docker_containers(self):
        """Analyze Docker containers"""
        print("🔍 Analyzing Docker containers...")
        
        for container in self.inventory.get("docker_containers", []):
            name = container.get("name", "").lower()
            status = container.get("status", "").lower()
            
            # LobeChat - delete
            if "lobe" in name or "lobechat" in name:
                self.cleanup_plan["delete"].append({
                    "type": "docker_container",
                    "name": container.get("name"),
                    "image": container.get("image"),
                    "reason": "LobeChat is not part of microDAO architecture",
                    "safe": True,
                    "action": "docker stop && docker rm"
                })
            
            # Stopped containers - can be removed
            if "exited" in status or "stopped" in status:
                if "ollama" in name or "nats" in name:
                    self.cleanup_plan["delete"].append({
                        "type": "docker_container",
                        "name": container.get("name"),
                        "image": container.get("image"),
                        "reason": f"Container is stopped: {status}",
                        "safe": True,
                        "action": "docker rm"
                    })
            
            # Unhealthy containers - investigate
            if "unhealthy" in status:
                self.cleanup_plan["warnings"].append({
                    "type": "unhealthy",
                    "component": f"Docker: {container.get('name')}",
                    "description": f"Container is unhealthy: {status}",
                    "severity": "medium"
                })
    
    def analyze_repositories(self):
        """Analyze repositories for duplicates"""
        print("🔍 Analyzing repositories...")
        
        repos = self.inventory.get("repositories", [])
        daarion_repos = [r for r in repos if "daarion" in r.get("name", "").lower()]
        
        if len(daarion_repos) > 1:
            self.cleanup_plan["warnings"].append({
                "type": "duplicate",
                "component": "DAARION repositories",
                "description": f"Multiple DAARION repositories found: {[r.get('name') for r in daarion_repos]}",
                "severity": "low"
            })
    
    def generate_legacy_migration_plan(self):
        """Generate plan for migrating old components to /node2/legacy/"""
        print("🔍 Generating legacy migration plan...")
        
        # Check for old DAARION Memory Core
        legacy_paths = [
            Path.home() / "daarion-memory",
            Path.home() / ".daarion" / "memory",
            Path("/opt/daarion-memory")
        ]
        
        for path in legacy_paths:
            if path.exists():
                self.cleanup_plan["migrate"].append({
                    "type": "legacy",
                    "name": "DAARION Memory Core",
                    "path": str(path),
                    "target": "/node2/legacy/daarion-memory",
                    "reason": "Old DAARION Memory Core - migrate to preserve data",
                    "safe": True,
                    "action": "mv to /node2/legacy/"
                })
    
    def generate_cleanup_plan(self):
        """Generate complete cleanup plan"""
        print("\n🚀 Generating cleanup plan from inventory...\n")
        
        self.analyze_llm_servers()
        self.analyze_vector_dbs()
        self.analyze_graph_dbs()
        self.analyze_docker_containers()
        self.analyze_repositories()
        self.generate_legacy_migration_plan()
        
        print("\n✅ Cleanup plan generated!")
    
    def save_cleanup_plan(self, output_path: str = "node2_cleanup_plan.json"):
        """Save cleanup plan to JSON"""
        output_file = Path(output_path)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.cleanup_plan, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Cleanup plan saved to: {output_file.absolute()}")
        return output_file
    
    def print_summary(self):
        """Print cleanup plan summary"""
        print("\n" + "="*60)
        print("📋 CLEANUP PLAN SUMMARY")
        print("="*60)
        
        print(f"\n🗑️  TO DELETE ({len(self.cleanup_plan['delete'])}):")
        for item in self.cleanup_plan["delete"]:
            print(f"   - {item.get('type')}: {item.get('name')} - {item.get('reason')}")
        
        print(f"\n📦 TO MIGRATE ({len(self.cleanup_plan['migrate'])}):")
        for item in self.cleanup_plan["migrate"]:
            print(f"   - {item.get('type')}: {item.get('name')} -> {item.get('target', 'legacy/')}")
        
        print(f"\n✅ TO KEEP ({len(self.cleanup_plan['keep'])}):")
        for item in self.cleanup_plan["keep"]:
            print(f"   - {item.get('type')}: {item.get('name')}")
        
        print(f"\n⚠️  WARNINGS ({len(self.cleanup_plan['warnings'])}):")
        for warning in self.cleanup_plan["warnings"]:
            severity = warning.get("severity", "unknown")
            print(f"   [{severity.upper()}] {warning.get('component')}: {warning.get('description')}")
        
        print("\n" + "="*60)


def main():
    # Try to find inventory file
    inventory_paths = [
        "node2_system_inventory.json",
        "docs/node2/node2_system_inventory.json",
        Path.home() / "github-projects" / "microdao-daarion" / "node2_system_inventory.json"
    ]
    
    inventory_path = None
    for path in inventory_paths:
        if Path(path).exists():
            inventory_path = path
            break
    
    if not inventory_path:
        print("❌ Inventory file not found. Please run inventory_scan.py first.")
        return
    
    generator = CleanupPlanGenerator(inventory_path)
    generator.load_inventory()
    generator.generate_cleanup_plan()
    generator.print_summary()
    
    # Save to current directory and docs/node2/
    output_file = generator.save_cleanup_plan("node2_cleanup_plan.json")
    
    docs_dir = Path(__file__).parent.parent.parent / "docs" / "node2"
    docs_dir.mkdir(parents=True, exist_ok=True)
    generator.save_cleanup_plan(str(docs_dir / "node2_cleanup_plan.json"))


if __name__ == "__main__":
    main()



