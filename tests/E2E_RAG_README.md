# E2E RAG Pipeline Test

End-to-end тест для повного пайплайну: PARSER → RAG → Router (Memory + RAG).

## Підготовка

1. Запустити всі сервіси:
```bash
docker-compose up -d parser-service rag-service router memory-service city-db
```

2. Перевірити, що сервіси працюють:
```bash
curl http://localhost:9400/health  # PARSER
curl http://localhost:9500/health  # RAG
curl http://localhost:9102/health  # Router
curl http://localhost:8000/health  # Memory
```

## Тест 1: Ingest Document

```bash
curl -X POST http://localhost:9400/ocr/ingest \
  -F "file=@tests/fixtures/parsed_json_example.json" \
  -F "dao_id=daarion" \
  -F "doc_id=microdao-tokenomics-2025-11"
```

**Очікуваний результат:**
```json
{
  "dao_id": "daarion",
  "doc_id": "microdao-tokenomics-2025-11",
  "pages_processed": 2,
  "rag_ingested": true,
  "raw_json": { ... }
}
```

## Тест 2: Query RAG Service Directly

```bash
curl -X POST http://localhost:9500/query \
  -H "Content-Type: application/json" \
  -d '{
    "dao_id": "daarion",
    "question": "Поясни токеноміку microDAO і роль стейкінгу"
  }'
```

**Очікуваний результат:**
```json
{
  "answer": "MicroDAO використовує токен μGOV...",
  "citations": [
    {
      "doc_id": "microdao-tokenomics-2025-11",
      "page": 1,
      "section": "Токеноміка MicroDAO",
      "excerpt": "..."
    }
  ],
  "documents": [...]
}
```

## Тест 3: Query via Router (Memory + RAG)

```bash
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "rag_query",
    "dao_id": "daarion",
    "user_id": "test-user",
    "payload": {
      "question": "Поясни токеноміку microDAO і роль стейкінгу"
    }
  }'
```

**Очікуваний результат:**
```json
{
  "ok": true,
  "provider_id": "llm_local_qwen3_8b",
  "data": {
    "text": "Відповідь з урахуванням Memory + RAG...",
    "citations": [...]
  },
  "metadata": {
    "memory_used": true,
    "rag_used": true,
    "documents_retrieved": 5,
    "citations_count": 3
  }
}
```

## Автоматичний E2E тест

Запустити скрипт:
```bash
./tests/e2e_rag_pipeline.sh
```

Скрипт перевіряє всі три кроки автоматично.

## Troubleshooting

### RAG Service не знаходить документи
- Перевірити, що документ був успішно індексований: `rag_ingested: true`
- Перевірити логі RAG Service: `docker-compose logs rag-service`
- Перевірити, що `dao_id` збігається в ingest та query

### Router повертає помилку
- Перевірити, що `mode="rag_query"` правильно обробляється
- Перевірити логі Router: `docker-compose logs router`
- Перевірити, що RAG та Memory сервіси доступні з Router

### Memory context порожній
- Перевірити, що Memory Service працює
- Перевірити, що `user_id` та `dao_id` правильні
- Memory може бути порожнім для нового користувача (це нормально)

