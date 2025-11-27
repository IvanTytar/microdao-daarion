#!/bin/bash
# Install microDAO Core Components for Node-2
# This script installs: Swoper, Milvus, Neo4j, and sets up local infrastructure

set -e

echo "🚀 Installing microDAO Core Components for Node-2"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Create directory structure
echo -e "\n${GREEN}📁 Creating directory structure...${NC}"
mkdir -p ~/node2/{swoper,milvus,qdrant,neo4j,events,legacy}
mkdir -p ~/node2/swoper/models
mkdir -p ~/node2/milvus/data
mkdir -p ~/node2/neo4j/{data,logs,import,plugins}

# 1. Fix Qdrant (if unhealthy)
echo -e "\n${GREEN}🔧 Checking Qdrant status...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q "^qdrant-vector-db$"; then
    QDRANT_STATUS=$(docker ps --filter name=qdrant-vector-db --format "{{.Status}}")
    if echo "$QDRANT_STATUS" | grep -q "unhealthy"; then
        echo -e "${YELLOW}⚠️  Qdrant is unhealthy. Restarting...${NC}"
        docker restart qdrant-vector-db
        sleep 5
        echo -e "${GREEN}✅ Qdrant restarted${NC}"
    else
        echo -e "${GREEN}✅ Qdrant is healthy${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Qdrant container not found. Creating new one...${NC}"
    docker run -d \
        --name qdrant-vector-db \
        -p 6333:6333 \
        -p 6334:6334 \
        -v ~/node2/qdrant:/qdrant/storage \
        qdrant/qdrant:latest
    echo -e "${GREEN}✅ Qdrant container created${NC}"
fi

# 2. Install Milvus
echo -e "\n${GREEN}📦 Installing Milvus...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q "^milvus-standalone$"; then
    echo -e "${YELLOW}ℹ️  Milvus container already exists${NC}"
    if ! docker ps --format "{{.Names}}" | grep -q "^milvus-standalone$"; then
        echo -e "${YELLOW}   Starting Milvus...${NC}"
        docker start milvus-standalone
    fi
else
    echo -e "${GREEN}   Creating Milvus container...${NC}"
    # Milvus standalone with etcd and minio
    docker run -d \
        --name milvus-etcd \
        -p 2379:2379 \
        -p 2380:2380 \
        -e ALLOW_NONE_AUTHENTICATION=yes \
        -v ~/node2/milvus/etcd:/etcd \
        quay.io/coreos/etcd:v3.5.5 \
        etcd \
        -advertise-client-urls=http://127.0.0.1:2379 \
        -listen-client-urls http://0.0.0.0:2379 \
        --data-dir /etcd

    docker run -d \
        --name milvus-minio \
        -p 9001:9001 \
        -p 9000:9000 \
        -e MINIO_ACCESS_KEY=minioadmin \
        -e MINIO_SECRET_KEY=minioadmin \
        -v ~/node2/milvus/minio:/minio_data \
        minio/minio:latest \
        server /minio_data \
        --console-address ":9001"

    sleep 3

    docker run -d \
        --name milvus-standalone \
        -p 19530:19530 \
        -p 9091:9091 \
        -e ETCD_ENDPOINTS=localhost:2379 \
        -e MINIO_ADDRESS=localhost:9000 \
        -v ~/node2/milvus/data:/var/lib/milvus \
        milvusdb/milvus:v2.3.3 \
        milvus run standalone

    echo -e "${GREEN}✅ Milvus installed${NC}"
fi

# 3. Install Neo4j
echo -e "\n${GREEN}📦 Installing Neo4j...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q "^neo4j-node2$"; then
    echo -e "${YELLOW}ℹ️  Neo4j container already exists${NC}"
    if ! docker ps --format "{{.Names}}" | grep -q "^neo4j-node2$"; then
        echo -e "${YELLOW}   Starting Neo4j...${NC}"
        docker start neo4j-node2
    fi
else
    echo -e "${GREEN}   Creating Neo4j container...${NC}"
    docker run -d \
        --name neo4j-node2 \
        -p 7474:7474 \
        -p 7687:7687 \
        -e NEO4J_AUTH=neo4j/microdao-node2 \
        -e NEO4J_PLUGINS='["apoc"]' \
        -v ~/node2/neo4j/data:/data \
        -v ~/node2/neo4j/logs:/logs \
        -v ~/node2/neo4j/import:/var/lib/neo4j/import \
        -v ~/node2/neo4j/plugins:/plugins \
        neo4j:5.15-community

    echo -e "${GREEN}✅ Neo4j installed${NC}"
    echo -e "${YELLOW}   Default credentials: neo4j/microdao-node2${NC}"
    echo -e "${YELLOW}   Web UI: http://localhost:7474${NC}"
fi

# 4. Install NATS JetStream (Local Event Store)
echo -e "\n${GREEN}📦 Installing NATS JetStream (Local Event Store)...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q "^nats-jetstream-node2$"; then
    echo -e "${YELLOW}ℹ️  NATS JetStream container already exists${NC}"
    if ! docker ps --format "{{.Names}}" | grep -q "^nats-jetstream-node2$"; then
        echo -e "${YELLOW}   Starting NATS JetStream...${NC}"
        docker start nats-jetstream-node2
    fi
else
    echo -e "${GREEN}   Creating NATS JetStream container...${NC}"
    docker run -d \
        --name nats-jetstream-node2 \
        -p 4222:4222 \
        -p 6222:6222 \
        -p 8222:8222 \
        -v ~/node2/events:/data/jetstream \
        nats:latest \
        -js \
        -sd /data/jetstream

    echo -e "${GREEN}✅ NATS JetStream installed${NC}"
fi

# 5. Check Swoper (if exists)
echo -e "\n${GREEN}🔍 Checking Swoper installation...${NC}"
if [ -d "/opt/microdao-daarion/services/swapper" ] || [ -d "~/github-projects/microdao-daarion/services/swapper" ]; then
    echo -e "${GREEN}✅ Swoper found${NC}"
    echo -e "${YELLOW}   Note: Swoper configuration will be done separately${NC}"
else
    echo -e "${YELLOW}⚠️  Swoper not found. Will need to install separately.${NC}"
fi

# Summary
echo -e "\n${GREEN}=================================================="
echo "✅ microDAO Core Components Installation Complete"
echo "==================================================${NC}"
echo ""
echo "📊 Installed Components:"
echo "   ✅ Qdrant (port 6333)"
echo "   ✅ Milvus (port 19530)"
echo "   ✅ Neo4j (port 7474, 7687)"
echo "   ✅ NATS JetStream (port 4222)"
echo ""
echo "📁 Data directories:"
echo "   ~/node2/qdrant/"
echo "   ~/node2/milvus/"
echo "   ~/node2/neo4j/"
echo "   ~/node2/events/"
echo ""
echo "🔗 Access URLs:"
echo "   Qdrant: http://localhost:6333"
echo "   Milvus: http://localhost:9091"
echo "   Neo4j: http://localhost:7474 (neo4j/microdao-node2)"
echo "   NATS: http://localhost:8222"
echo ""
echo "⏭️  Next steps:"
echo "   1. Configure Swoper"
echo "   2. Create Local RAG Router"
echo "   3. Create microDAO registry entry"
echo ""



