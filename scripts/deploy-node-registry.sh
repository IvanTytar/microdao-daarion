#!/bin/bash
# Deploy Node Registry Service to Node #1 (Hetzner)
# Version: 1.0.0
# Date: 2025-01-17

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE1_IP="144.76.224.179"
NODE1_USER="root"
PROJECT_DIR="/opt/microdao-daarion"
SERVICE_NAME="node-registry"
DB_NAME="node_registry"
DB_USER="node_registry_user"
DB_PASSWORD_ENV_VAR="NODE_REGISTRY_DB_PASSWORD"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} Deploy Node Registry Service${NC}"
echo -e "${BLUE} Target: Node #1 ($NODE1_IP)${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Step 1: Check connection to Node #1
echo -e "${YELLOW}[1/7]${NC} Checking connection to Node #1..."
if ssh -o ConnectTimeout=5 $NODE1_USER@$NODE1_IP "echo 'Connection OK'" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected to Node #1${NC}"
else
    echo -e "${RED}❌ Cannot connect to Node #1${NC}"
    echo -e "${YELLOW}Try: ssh $NODE1_USER@$NODE1_IP${NC}"
    exit 1
fi

# Step 2: Initialize database
echo -e "${YELLOW}[2/7]${NC} Initializing Node Registry database..."
ssh $NODE1_USER@$NODE1_IP << 'ENDSSH'
cd /opt/microdao-daarion

# Check if database exists
DB_EXISTS=$(docker exec dagi-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -w node_registry | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "Creating node_registry database..."
    docker exec dagi-postgres psql -U postgres -f /tmp/init_node_registry.sql || {
        # If file doesn't exist in container, execute from host
        docker exec -i dagi-postgres psql -U postgres < services/node-registry/migrations/init_node_registry.sql
    }
    echo "✅ Database initialized"
else
    echo "ℹ️  Database node_registry already exists"
fi
ENDSSH

echo -e "${GREEN}✅ Database ready${NC}"

# Step 3: Generate secure password (if not set)
echo -e "${YELLOW}[3/7]${NC} Checking environment variables..."
ssh $NODE1_USER@$NODE1_IP << 'ENDSSH'
if ! grep -q "NODE_REGISTRY_DB_PASSWORD" /opt/microdao-daarion/.env; then
    echo "Generating secure password..."
    PASSWORD=$(openssl rand -base64 32)
    echo "NODE_REGISTRY_DB_PASSWORD=$PASSWORD" >> /opt/microdao-daarion/.env
    echo "✅ Password generated and saved to .env"
else
    echo "ℹ️  NODE_REGISTRY_DB_PASSWORD already configured"
fi
ENDSSH

echo -e "${GREEN}✅ Environment configured${NC}"

# Step 4: Build Docker image
echo -e "${YELLOW}[4/7]${NC} Building Docker image..."
ssh $NODE1_USER@$NODE1_IP << 'ENDSSH'
cd /opt/microdao-daarion
docker-compose build node-registry
ENDSSH

echo -e "${GREEN}✅ Docker image built${NC}"

# Step 5: Start service
echo -e "${YELLOW}[5/7]${NC} Starting Node Registry service..."
ssh $NODE1_USER@$NODE1_IP << 'ENDSSH'
cd /opt/microdao-daarion
docker-compose up -d node-registry
sleep 5  # Wait for service to start
ENDSSH

echo -e "${GREEN}✅ Service started${NC}"

# Step 6: Configure firewall
echo -e "${YELLOW}[6/7]${NC} Configuring firewall rules..."
ssh $NODE1_USER@$NODE1_IP << 'ENDSSH'
# Allow Node Registry port only from internal network
if command -v ufw >/dev/null 2>&1; then
    # Allow from local network (adjust as needed)
    ufw allow from 192.168.1.0/24 to any port 9205 proto tcp comment 'Node Registry - LAN'
    ufw allow from 172.16.0.0/12 to any port 9205 proto tcp comment 'Node Registry - Docker'
    
    # Deny from external
    ufw deny 9205/tcp comment 'Node Registry - Block external'
    
    echo "✅ UFW rules configured"
else
    echo "⚠️  UFW not found - configure firewall manually"
fi
ENDSSH

echo -e "${GREEN}✅ Firewall configured${NC}"

# Step 7: Verify deployment
echo -e "${YELLOW}[7/7]${NC} Verifying deployment..."

echo "  Checking container status..."
CONTAINER_STATUS=$(ssh $NODE1_USER@$NODE1_IP "docker ps | grep dagi-node-registry | wc -l")
if [ "$CONTAINER_STATUS" -eq 1 ]; then
    echo -e "  ${GREEN}✅ Container running${NC}"
else
    echo -e "  ${RED}❌ Container not running${NC}"
    ssh $NODE1_USER@$NODE1_IP "docker logs dagi-node-registry --tail 20"
    exit 1
fi

echo "  Checking health endpoint..."
HEALTH_CHECK=$(ssh $NODE1_USER@$NODE1_IP "curl -s http://localhost:9205/health | grep -o '\"status\":\"healthy\"' | wc -l")
if [ "$HEALTH_CHECK" -eq 1 ]; then
    echo -e "  ${GREEN}✅ Health check passed${NC}"
else
    echo -e "  ${RED}❌ Health check failed${NC}"
    ssh $NODE1_USER@$NODE1_IP "curl -v http://localhost:9205/health"
    exit 1
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} ✅ Node Registry Deployed Successfully${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo "Service Information:"
echo "  URL:      http://$NODE1_IP:9205"
echo "  Health:   http://$NODE1_IP:9205/health"
echo "  Metrics:  http://$NODE1_IP:9205/metrics"
echo "  Docs:     http://$NODE1_IP:9205/docs (dev only)"
echo
echo "Management Commands:"
echo "  Logs:     ssh $NODE1_USER@$NODE1_IP 'docker logs -f dagi-node-registry'"
echo "  Restart:  ssh $NODE1_USER@$NODE1_IP 'cd $PROJECT_DIR && docker-compose restart node-registry'"
echo "  Stop:     ssh $NODE1_USER@$NODE1_IP 'cd $PROJECT_DIR && docker-compose stop node-registry'"
echo
