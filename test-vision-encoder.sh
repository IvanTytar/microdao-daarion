#!/bin/bash
# test-vision-encoder.sh - Smoke tests for Vision Encoder service
# Tests: health, model info, text embedding, image embedding, Router integration

set -e

BASE_URL="${VISION_ENCODER_URL:-http://localhost:8001}"
ROUTER_URL="${ROUTER_URL:-http://localhost:9102}"

echo "======================================"
echo "Vision Encoder Smoke Tests"
echo "======================================"
echo "Vision Encoder: $BASE_URL"
echo "DAGI Router: $ROUTER_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "------------------------------------"
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | jq .

STATUS=$(echo "$HEALTH" | jq -r '.status')
DEVICE=$(echo "$HEALTH" | jq -r '.device')

if [ "$STATUS" != "healthy" ]; then
    echo "❌ FAIL: Service not healthy"
    exit 1
fi

echo "✅ PASS: Service is healthy (device: $DEVICE)"
echo ""

# Test 2: Model Info
echo "Test 2: Model Info"
echo "------------------------------------"
INFO=$(curl -s "$BASE_URL/info")
echo "$INFO" | jq .

MODEL_NAME=$(echo "$INFO" | jq -r '.model_name')
EMBEDDING_DIM=$(echo "$INFO" | jq -r '.embedding_dim')

if [ "$EMBEDDING_DIM" -lt 512 ]; then
    echo "❌ FAIL: Invalid embedding dimension: $EMBEDDING_DIM"
    exit 1
fi

echo "✅ PASS: Model info retrieved (model: $MODEL_NAME, dim: $EMBEDDING_DIM)"
echo ""

# Test 3: Text Embedding
echo "Test 3: Text Embedding"
echo "------------------------------------"
TEXT_EMBED=$(curl -s -X POST "$BASE_URL/embed/text" \
    -H "Content-Type: application/json" \
    -d '{"text": "токеноміка DAARION city governance", "normalize": true}')

echo "$TEXT_EMBED" | jq '{dimension, model, normalized}'

TEXT_DIM=$(echo "$TEXT_EMBED" | jq -r '.dimension')
TEXT_NORMALIZED=$(echo "$TEXT_EMBED" | jq -r '.normalized')

if [ "$TEXT_DIM" != "$EMBEDDING_DIM" ]; then
    echo "❌ FAIL: Text embedding dimension mismatch: $TEXT_DIM != $EMBEDDING_DIM"
    exit 1
fi

if [ "$TEXT_NORMALIZED" != "true" ]; then
    echo "❌ FAIL: Text embedding not normalized"
    exit 1
fi

echo "✅ PASS: Text embedding generated (dim: $TEXT_DIM, normalized: $TEXT_NORMALIZED)"
echo ""

# Test 4: Image Embedding (using example image URL)
echo "Test 4: Image Embedding (from URL)"
echo "------------------------------------"
# Using a public test image
IMAGE_URL="https://raw.githubusercontent.com/pytorch/pytorch/main/docs/source/_static/img/pytorch-logo-dark.png"

IMAGE_EMBED=$(curl -s -X POST "$BASE_URL/embed/image" \
    -H "Content-Type: application/json" \
    -d "{\"image_url\": \"$IMAGE_URL\", \"normalize\": true}")

if echo "$IMAGE_EMBED" | jq -e '.error' > /dev/null; then
    echo "⚠️  WARN: Image embedding failed (network issue or invalid URL)"
    echo "$IMAGE_EMBED" | jq .
else
    echo "$IMAGE_EMBED" | jq '{dimension, model, normalized}'
    
    IMAGE_DIM=$(echo "$IMAGE_EMBED" | jq -r '.dimension')
    IMAGE_NORMALIZED=$(echo "$IMAGE_EMBED" | jq -r '.normalized')
    
    if [ "$IMAGE_DIM" != "$EMBEDDING_DIM" ]; then
        echo "❌ FAIL: Image embedding dimension mismatch: $IMAGE_DIM != $EMBEDDING_DIM"
        exit 1
    fi
    
    echo "✅ PASS: Image embedding generated (dim: $IMAGE_DIM, normalized: $IMAGE_NORMALIZED)"
fi
echo ""

# Test 5: Router Integration (Text Embedding)
echo "Test 5: Router Integration (Text Embedding)"
echo "------------------------------------"
ROUTER_RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
    -H "Content-Type: application/json" \
    -d '{
        "mode": "vision_embed",
        "message": "embed text",
        "payload": {
            "operation": "embed_text",
            "text": "DAARION microDAO tokenomics",
            "normalize": true
        }
    }')

echo "$ROUTER_RESPONSE" | jq '{ok, provider_id, data: {dimension: .data.dimension, normalized: .data.normalized}}'

ROUTER_OK=$(echo "$ROUTER_RESPONSE" | jq -r '.ok')
ROUTER_PROVIDER=$(echo "$ROUTER_RESPONSE" | jq -r '.provider_id')

if [ "$ROUTER_OK" != "true" ]; then
    echo "❌ FAIL: Router integration failed"
    echo "$ROUTER_RESPONSE" | jq .
    exit 1
fi

if [ "$ROUTER_PROVIDER" != "vision_encoder" ]; then
    echo "❌ FAIL: Wrong provider used: $ROUTER_PROVIDER"
    exit 1
fi

echo "✅ PASS: Router integration working (provider: $ROUTER_PROVIDER)"
echo ""

# Test 6: Qdrant Health Check
echo "Test 6: Qdrant Health Check"
echo "------------------------------------"
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"

if QDRANT_HEALTH=$(curl -s "$QDRANT_URL/healthz" 2>/dev/null); then
    echo "$QDRANT_HEALTH"
    echo "✅ PASS: Qdrant is healthy"
else
    echo "⚠️  WARN: Qdrant not reachable at $QDRANT_URL"
fi
echo ""

# Summary
echo "======================================"
echo "✅ Vision Encoder Smoke Tests PASSED"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Check GPU usage: nvidia-smi"
echo "2. View logs: docker-compose logs -f vision-encoder"
echo "3. Check API docs: $BASE_URL/docs"
echo "4. Create Qdrant collection: curl -X PUT $QDRANT_URL/collections/images -d '{\"vectors\":{\"size\":$EMBEDDING_DIM,\"distance\":\"Cosine\"}}'"
echo ""
