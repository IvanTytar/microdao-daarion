#!/usr/bin/env python3
"""
Execute Cleanup Plan for Node-2
Safely executes cleanup actions from node2_cleanup_plan.json
"""

import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any

class CleanupExecutor:
    def __init__(self, cleanup_plan_path: str = "node2_cleanup_plan.json"):
        self.cleanup_plan_path = Path(cleanup_plan_path)
        self.cleanup_plan = {}
        self.executed_actions = []
        self.errors = []
        
    def load_cleanup_plan(self):
        """Load cleanup plan JSON"""
        if not self.cleanup_plan_path.exists():
            raise FileNotFoundError(f"Cleanup plan not found: {self.cleanup_plan_path}")
        
        with open(self.cleanup_plan_path, 'r', encoding='utf-8') as f:
            self.cleanup_plan = json.load(f)
        print(f"✅ Loaded cleanup plan from: {self.cleanup_plan_path}")
    
    def execute_docker_action(self, action: str, container_name: str) -> bool:
        """Execute Docker action (stop, rm)"""
        try:
            if "stop" in action.lower():
                print(f"   🛑 Stopping container: {container_name}")
                result = subprocess.run(
                    ["docker", "stop", container_name],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode != 0:
                    print(f"   ⚠️  Warning: {result.stderr.strip()}")
            
            if "rm" in action.lower():
                print(f"   🗑️  Removing container: {container_name}")
                result = subprocess.run(
                    ["docker", "rm", container_name],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode != 0:
                    print(f"   ⚠️  Warning: {result.stderr.strip()}")
                    return False
                return True
        except subprocess.TimeoutExpired:
            print(f"   ❌ Timeout removing container: {container_name}")
            return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def execute_delete_actions(self, dry_run: bool = False):
        """Execute delete actions"""
        print("\n🗑️  EXECUTING DELETE ACTIONS")
        print("="*60)
        
        delete_items = self.cleanup_plan.get("delete", [])
        if not delete_items:
            print("   ℹ️  No items to delete")
            return
        
        for item in delete_items:
            item_type = item.get("type", "")
            item_name = item.get("name", "")
            action = item.get("action", "")
            reason = item.get("reason", "")
            
            print(f"\n   📦 {item_type}: {item_name}")
            print(f"      Reason: {reason}")
            
            if dry_run:
                print(f"      [DRY RUN] Would execute: {action}")
                continue
            
            if item_type == "docker_container":
                success = self.execute_docker_action(action, item_name)
                if success:
                    self.executed_actions.append({
                        "type": "delete",
                        "item": item_name,
                        "status": "success"
                    })
                else:
                    self.errors.append({
                        "type": "delete",
                        "item": item_name,
                        "error": "Failed to remove container"
                    })
            else:
                print(f"      ⚠️  Unknown type: {item_type}")
    
    def create_legacy_directory(self, dry_run: bool = False):
        """Create /node2/legacy/ directory for migrations"""
        print("\n📁 CREATING LEGACY DIRECTORY")
        print("="*60)
        
        legacy_paths = [
            Path.home() / "node2" / "legacy",
            Path("/node2/legacy")
        ]
        
        for legacy_path in legacy_paths:
            if dry_run:
                print(f"   [DRY RUN] Would create: {legacy_path}")
            else:
                try:
                    legacy_path.mkdir(parents=True, exist_ok=True)
                    print(f"   ✅ Created: {legacy_path}")
                    self.executed_actions.append({
                        "type": "create_directory",
                        "path": str(legacy_path),
                        "status": "success"
                    })
                except Exception as e:
                    print(f"   ❌ Error creating {legacy_path}: {e}")
                    self.errors.append({
                        "type": "create_directory",
                        "path": str(legacy_path),
                        "error": str(e)
                    })
    
    def fix_qdrant_health(self, dry_run: bool = False):
        """Attempt to fix unhealthy Qdrant container"""
        print("\n🔧 FIXING QDRANT HEALTH")
        print("="*60)
        
        # Find Qdrant container
        qdrant_container = None
        for container in self.cleanup_plan.get("keep", []):
            if "qdrant" in container.get("name", "").lower():
                qdrant_container = container
                break
        
        if not qdrant_container:
            print("   ℹ️  Qdrant container not found in keep list")
            return
        
        container_name = qdrant_container.get("path", "").replace("Docker: ", "")
        
        if dry_run:
            print(f"   [DRY RUN] Would restart: {container_name}")
            print(f"   [DRY RUN] Would check logs: docker logs {container_name}")
            return
        
        try:
            # Check container status
            result = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name={container_name}", "--format", "{{.Status}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if "unhealthy" in result.stdout.lower():
                print(f"   🔄 Restarting container: {container_name}")
                subprocess.run(
                    ["docker", "restart", container_name],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                # Wait a bit and check again
                import time
                time.sleep(5)
                
                result = subprocess.run(
                    ["docker", "ps", "--filter", f"name={container_name}", "--format", "{{.Status}}"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if "healthy" in result.stdout.lower() or "up" in result.stdout.lower():
                    print(f"   ✅ Container is now healthy")
                    self.executed_actions.append({
                        "type": "fix_health",
                        "container": container_name,
                        "status": "success"
                    })
                else:
                    print(f"   ⚠️  Container status: {result.stdout.strip()}")
                    print(f"   💡 Check logs: docker logs {container_name}")
                    self.errors.append({
                        "type": "fix_health",
                        "container": container_name,
                        "error": "Container still unhealthy after restart"
                    })
        except Exception as e:
            print(f"   ❌ Error fixing Qdrant: {e}")
            self.errors.append({
                "type": "fix_health",
                "container": container_name,
                "error": str(e)
            })
    
    def execute_all(self, dry_run: bool = False):
        """Execute all cleanup actions"""
        print("\n" + "="*60)
        if dry_run:
            print("🔍 DRY RUN MODE - No changes will be made")
        else:
            print("🚀 EXECUTING CLEANUP PLAN")
        print("="*60)
        
        self.create_legacy_directory(dry_run)
        self.execute_delete_actions(dry_run)
        self.fix_qdrant_health(dry_run)
        
        print("\n" + "="*60)
        print("📊 EXECUTION SUMMARY")
        print("="*60)
        print(f"   ✅ Actions executed: {len(self.executed_actions)}")
        print(f"   ❌ Errors: {len(self.errors)}")
        
        if self.errors:
            print("\n   ⚠️  ERRORS:")
            for error in self.errors:
                print(f"      - {error.get('type')}: {error.get('error')}")
    
    def save_execution_report(self, output_path: str = "node2_cleanup_execution_report.json"):
        """Save execution report"""
        report = {
            "executed_actions": self.executed_actions,
            "errors": self.errors,
            "timestamp": subprocess.run(
                ["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"],
                capture_output=True,
                text=True
            ).stdout.strip()
        }
        
        output_file = Path(output_path)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Execution report saved to: {output_file.absolute()}")


def main():
    import sys
    
    dry_run = "--dry-run" in sys.argv or "-d" in sys.argv
    
    # Try to find cleanup plan
    cleanup_plan_paths = [
        "node2_cleanup_plan.json",
        "docs/node2/node2_cleanup_plan.json",
        Path.home() / "github-projects" / "microdao-daarion" / "node2_cleanup_plan.json"
    ]
    
    cleanup_plan_path = None
    for path in cleanup_plan_paths:
        if Path(path).exists():
            cleanup_plan_path = path
            break
    
    if not cleanup_plan_path:
        print("❌ Cleanup plan not found. Please run cleanup_plan_generator.py first.")
        return
    
    executor = CleanupExecutor(cleanup_plan_path)
    executor.load_cleanup_plan()
    executor.execute_all(dry_run=dry_run)
    executor.save_execution_report()
    
    if not dry_run:
        print("\n✅ Cleanup execution complete!")
        print("   Next step: Proceed to PHASE 3 - Install microDAO Core")


if __name__ == "__main__":
    main()



