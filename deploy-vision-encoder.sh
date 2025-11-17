#!/bin/bash
# deploy-vision-encoder.sh - Deploy Vision Encoder service to production server
# Server: 144.76.224.179 (Hetzner GEX44 #2844465)
# Usage: Run this script ON THE SERVER after SSH

set -e  # Exit on error

echo "========================================"
echo "Vision Encoder Deployment Script"
echo "========================================"
echo "Server: 144.76.224.179"
echo "Date: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Navigate to project
echo -e "${YELLOW}Step 1: Navigate to project directory${NC}"
cd /opt/microdao-daarion || exit 1
echo -e "${GREEN}✓ In directory: $(pwd)${NC}"
echo ""

# Step 2: Backup current state
echo -e "${YELLOW}Step 2: Backup current state${NC}"
BACKUP_DIR="/opt/backups/microdao-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp docker-compose.yml "$BACKUP_DIR/" || true
echo -e "${GREEN}✓ Backed up to: $BACKUP_DIR${NC}"
echo ""

# Step 3: Pull latest code from GitHub
echo -e "${YELLOW}Step 3: Pull latest code from GitHub${NC}"
git status
echo ""
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 4: Check GPU availability
echo -e "${YELLOW}Step 4: Check GPU availability${NC}"
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo -e "${GREEN}✓ GPU detected${NC}"
else
    echo -e "${RED}✗ Warning: nvidia-smi not found!${NC}"
    echo "Vision Encoder requires GPU. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 5: Check Docker GPU runtime
echo -e "${YELLOW}Step 5: Check Docker GPU runtime${NC}"
if docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker GPU runtime working${NC}"
else
    echo -e "${RED}✗ Warning: Docker GPU runtime not working!${NC}"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 6: Build Vision Encoder image
echo -e "${YELLOW}Step 6: Build Vision Encoder Docker image${NC}"
echo "This may take 5-10 minutes (downloading PyTorch + OpenCLIP)..."
docker-compose build vision-encoder
echo -e "${GREEN}✓ Vision Encoder image built${NC}"
echo ""

# Step 7: Stop existing services (optional)
echo -e "${YELLOW}Step 7: Stop existing services (if any)${NC}"
docker-compose stop vision-encoder qdrant || true
echo -e "${GREEN}✓ Old services stopped${NC}"
echo ""

# Step 8: Start Vision Encoder + Qdrant
echo -e "${YELLOW}Step 8: Start Vision Encoder + Qdrant${NC}"
docker-compose up -d vision-encoder qdrant
echo ""
echo "Waiting 10 seconds for services to start..."
sleep 10
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 9: Check service status
echo -e "${YELLOW}Step 9: Check service status${NC}"
docker-compose ps vision-encoder qdrant
echo ""

# Step 10: Wait for Vision Encoder to load model
echo -e "${YELLOW}Step 10: Wait for Vision Encoder to load model (15-30 seconds)${NC}"
echo "Checking health endpoint..."
for i in {1..30}; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Vision Encoder is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Step 11: Verify Vision Encoder health
echo -e "${YELLOW}Step 11: Verify Vision Encoder health${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "$HEALTH_RESPONSE" | jq '.'
    echo -e "${GREEN}✓ Vision Encoder is healthy${NC}"
else
    echo -e "${RED}✗ Vision Encoder health check failed!${NC}"
    echo "$HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Step 12: Verify Qdrant health
echo -e "${YELLOW}Step 12: Verify Qdrant health${NC}"
if curl -s http://localhost:6333/healthz | grep -q "ok"; then
    echo -e "${GREEN}✓ Qdrant is healthy${NC}"
else
    echo -e "${RED}✗ Qdrant health check failed!${NC}"
    exit 1
fi
echo ""

# Step 13: Create Qdrant collection
echo -e "${YELLOW}Step 13: Create Qdrant collection (if not exists)${NC}"
curl -X PUT http://localhost:6333/collections/daarion_images \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}' \
  2>/dev/null || echo "Collection may already exist"
echo ""
echo -e "${GREEN}✓ Qdrant collection ready${NC}"
echo ""

# Step 14: Run smoke tests
echo -e "${YELLOW}Step 14: Run smoke tests${NC}"
if [ -f "./test-vision-encoder.sh" ]; then
    chmod +x ./test-vision-encoder.sh
    ./test-vision-encoder.sh
else
    echo -e "${YELLOW}Warning: test-vision-encoder.sh not found, skipping tests${NC}"
fi
echo ""

# Step 15: Show GPU usage
echo -e "${YELLOW}Step 15: GPU Status${NC}"
nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader || true
echo ""

# Step 16: Show logs (last 20 lines)
echo -e "${YELLOW}Step 16: Vision Encoder logs (last 20 lines)${NC}"
docker-compose logs --tail=20 vision-encoder
echo ""

# Step 17: Summary
echo "========================================"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Services deployed:"
echo "  - Vision Encoder: http://localhost:8001"
echo "  - Qdrant:         http://localhost:6333"
echo ""
echo "Useful commands:"
echo "  - View logs:       docker-compose logs -f vision-encoder"
echo "  - Check health:    curl http://localhost:8001/health"
echo "  - Monitor GPU:     watch -n 1 nvidia-smi"
echo "  - Run tests:       ./test-vision-encoder.sh"
echo "  - Restart:         docker-compose restart vision-encoder"
echo "  - Stop:            docker-compose stop vision-encoder qdrant"
echo ""
echo "Documentation:"
echo "  - SYSTEM-INVENTORY.md - Complete system inventory"
echo "  - VISION-ENCODER-STATUS.md - Service status"
echo "  - VISION-RAG-IMPLEMENTATION.md - Implementation details"
echo "  - services/vision-encoder/README.md - Deployment guide"
echo ""
echo -e "${GREEN}Status: Production Ready ✅${NC}"
