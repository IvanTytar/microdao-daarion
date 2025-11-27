"""
Snapshot Builder — Aggregates data from all services
Phase 9: Living Map
"""
from datetime import datetime
from typing import Dict, Any
from adapters.city_client import CityClient
from adapters.space_client import SpaceClient
from adapters.agents_client import AgentsClient
from adapters.microdao_client import MicrodaoClient
from adapters.dao_client import DaoClient
from adapters.usage_client import UsageClient

class SnapshotBuilder:
    """Build complete Living Map snapshot"""
    
    def __init__(self):
        self.city_client = CityClient()
        self.space_client = SpaceClient()
        self.agents_client = AgentsClient()
        self.microdao_client = MicrodaoClient()
        self.dao_client = DaoClient()
        self.usage_client = UsageClient()
    
    async def build_snapshot(self) -> Dict[str, Any]:
        """Build complete snapshot from all services"""
        generated_at = datetime.now()
        
        # Fetch data from all services in parallel
        import asyncio
        city_data, agents_data, microdao_data, dao_data, space_data = await asyncio.gather(
            self.city_client.get_layer_data(),
            self.agents_client.get_layer_data(),
            self.microdao_client.get_layer_data(),
            self.dao_client.get_layer_data(),
            self.space_client.get_layer_data(),
            return_exceptions=True
        )
        
        # Handle errors gracefully
        if isinstance(city_data, Exception):
            print(f"⚠️  City data error: {city_data}")
            city_data = {}
        if isinstance(agents_data, Exception):
            print(f"⚠️  Agents data error: {agents_data}")
            agents_data = {}
        if isinstance(microdao_data, Exception):
            print(f"⚠️  MicroDAO data error: {microdao_data}")
            microdao_data = {}
        if isinstance(dao_data, Exception):
            print(f"⚠️  DAO data error: {dao_data}")
            dao_data = {}
        if isinstance(space_data, Exception):
            print(f"⚠️  Space data error: {space_data}")
            space_data = {}
        
        # Merge city and microdao data (they're the same layer)
        city_layer = {
            **microdao_data,
            **(city_data if city_data else {})
        }
        
        # Merge space and dao data
        space_layer = {
            "planets": dao_data.get("planets", []) + space_data.get("planets", []),
            "nodes": space_data.get("nodes", [])
        }
        
        # Build nodes layer (simplified for now)
        nodes_layer = {
            "items": space_data.get("nodes", []),
            "total_cpu": 0.0,
            "total_gpu": 0.0,
            "total_ram": 0.0
        }
        
        snapshot = {
            "generated_at": generated_at.isoformat(),
            "layers": {
                "city": city_layer,
                "space": space_layer,
                "nodes": nodes_layer,
                "agents": agents_data
            },
            "meta": {
                "source_services": [
                    "city-service",
                    "space-service",
                    "agents-service",
                    "microdao-service",
                    "dao-service",
                    "usage-engine"
                ],
                "generated_at": generated_at.isoformat(),
                "version": "1.0"
            }
        }
        
        return snapshot

