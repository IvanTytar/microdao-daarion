#!/usr/bin/env python3
"""Test Router connectivity"""
import asyncio
import httpx
import sys

async def test():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("http://dagi-router:9102/health")
            print(f"Router health: {r.json()}")
            return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test())
    sys.exit(0 if result else 1)

