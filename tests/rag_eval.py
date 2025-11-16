#!/usr/bin/env python3
"""
RAG Evaluation Script
Tests RAG quality with fixed questions and saves results
"""

import json
import csv
import time
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

import httpx


# Configuration
RAG_URL = "http://localhost:9500"
ROUTER_URL = "http://localhost:9102"
DAO_ID = "daarion"

# Test questions
TEST_QUESTIONS = [
    {
        "id": "q1",
        "question": "Яка роль стейкінгу в microDAO?",
        "expected_doc_ids": ["microdao-tokenomics"],
        "category": "tokenomics"
    },
    {
        "id": "q2",
        "question": "Які основні фази roadmap розгортання?",
        "expected_doc_ids": ["roadmap", "deployment"],
        "category": "roadmap"
    },
    {
        "id": "q3",
        "question": "Поясни архітектуру DAARION.city",
        "expected_doc_ids": ["architecture", "whitepaper"],
        "category": "architecture"
    },
    {
        "id": "q4",
        "question": "Як працює система ролей та RBAC?",
        "expected_doc_ids": ["rbac", "roles"],
        "category": "rbac"
    },
    {
        "id": "q5",
        "question": "Що таке μGOV токен і навіщо він потрібен?",
        "expected_doc_ids": ["microdao-tokenomics", "tokenomics"],
        "category": "tokenomics"
    }
]


async def test_rag_query(question: Dict[str, Any], dao_id: str) -> Dict[str, Any]:
    """Test single RAG query"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        start_time = time.time()
        
        response = await client.post(
            f"{RAG_URL}/query",
            json={
                "dao_id": dao_id,
                "question": question["question"],
                "top_k": 5
            }
        )
        
        elapsed = time.time() - start_time
        response.raise_for_status()
        data = response.json()
        
        # Extract metrics
        metrics = data.get("metrics", {})
        citations = data.get("citations", [])
        answer = data.get("answer", "")
        
        # Check if expected doc_ids are found
        found_doc_ids = [c.get("doc_id", "") for c in citations]
        expected_found = any(
            expected_id in found_doc_id
            for expected_id in question["expected_doc_ids"]
            for found_doc_id in found_doc_ids
        )
        
        return {
            "question_id": question["id"],
            "question": question["question"],
            "category": question["category"],
            "answer": answer,
            "answer_length": len(answer),
            "citations_count": len(citations),
            "citations": citations,
            "doc_ids_found": found_doc_ids,
            "expected_doc_found": expected_found,
            "query_time_seconds": elapsed,
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }


async def test_router_query(question: Dict[str, Any], dao_id: str, user_id: str = "test-user") -> Dict[str, Any]:
    """Test query via Router (Memory + RAG)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        start_time = time.time()
        
        response = await client.post(
            f"{ROUTER_URL}/route",
            json={
                "mode": "rag_query",
                "dao_id": dao_id,
                "user_id": user_id,
                "payload": {
                    "question": question["question"]
                }
            }
        )
        
        elapsed = time.time() - start_time
        response.raise_for_status()
        data = response.json()
        
        # Extract data
        answer = data.get("data", {}).get("text", "")
        citations = data.get("data", {}).get("citations", []) or data.get("metadata", {}).get("citations", [])
        metadata = data.get("metadata", {})
        
        return {
            "question_id": question["id"],
            "question": question["question"],
            "category": question["category"],
            "answer": answer,
            "answer_length": len(answer),
            "citations_count": len(citations),
            "citations": citations,
            "memory_used": metadata.get("memory_used", False),
            "rag_used": metadata.get("rag_used", False),
            "query_time_seconds": elapsed,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat()
        }


async def run_evaluation(output_dir: Path = Path("tests/rag_eval_results")):
    """Run full evaluation"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    # Test RAG Service directly
    print("Testing RAG Service directly...")
    rag_results = []
    for question in TEST_QUESTIONS:
        print(f"  Testing: {question['question'][:50]}...")
        try:
            result = await test_rag_query(question, DAO_ID)
            rag_results.append(result)
            print(f"    ✓ Found {result['citations_count']} citations, expected doc: {result['expected_doc_found']}")
        except Exception as e:
            print(f"    ✗ Error: {e}")
            rag_results.append({
                "question_id": question["id"],
                "error": str(e)
            })
    
    # Test Router (Memory + RAG)
    print("\nTesting Router (Memory + RAG)...")
    router_results = []
    for question in TEST_QUESTIONS:
        print(f"  Testing: {question['question'][:50]}...")
        try:
            result = await test_router_query(question, DAO_ID)
            router_results.append(result)
            print(f"    ✓ Answer length: {result['answer_length']}, citations: {result['citations_count']}")
        except Exception as e:
            print(f"    ✗ Error: {e}")
            router_results.append({
                "question_id": question["id"],
                "error": str(e)
            })
    
    # Save results
    results_file = output_dir / f"rag_eval_{timestamp}.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump({
            "rag_service_results": rag_results,
            "router_results": router_results,
            "timestamp": timestamp,
            "dao_id": DAO_ID
        }, f, indent=2, ensure_ascii=False)
    
    # Save CSV summary
    csv_file = output_dir / f"rag_eval_{timestamp}.csv"
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Question ID", "Question", "Category",
            "RAG Citations", "RAG Expected Found", "RAG Time (s)",
            "Router Citations", "Router Memory Used", "Router Time (s)",
            "Answer Length"
        ])
        
        for rag_res, router_res in zip(rag_results, router_results):
            writer.writerow([
                rag_res.get("question_id", ""),
                rag_res.get("question", ""),
                rag_res.get("category", ""),
                rag_res.get("citations_count", 0),
                rag_res.get("expected_doc_found", False),
                rag_res.get("query_time_seconds", 0),
                router_res.get("citations_count", 0),
                router_res.get("memory_used", False),
                router_res.get("query_time_seconds", 0),
                router_res.get("answer_length", 0)
            ])
    
    print(f"\n✓ Results saved:")
    print(f"  JSON: {results_file}")
    print(f"  CSV: {csv_file}")
    
    # Print summary
    print("\n=== Summary ===")
    rag_avg_time = sum(r.get("query_time_seconds", 0) for r in rag_results) / len(rag_results)
    router_avg_time = sum(r.get("query_time_seconds", 0) for r in router_results) / len(router_results)
    
    print(f"RAG Service: avg time={rag_avg_time:.2f}s")
    print(f"Router: avg time={router_avg_time:.2f}s")
    print(f"Expected docs found: {sum(1 for r in rag_results if r.get('expected_doc_found', False))}/{len(rag_results)}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_evaluation())

