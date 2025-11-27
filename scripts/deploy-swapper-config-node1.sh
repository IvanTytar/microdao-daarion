#!/bin/bash
# Deploy Swapper Service Configuration to Node #1
# This script updates Swapper Service configuration on production server

set -e

NODE1_IP="144.76.224.179"
NODE1_USER="root"
PROJECT_ROOT="/opt/microdao-daarion"
CONFIG_FILE="services/swapper-service/config/swapper_config.yaml"
LOCAL_CONFIG="services/swapper-service/config/swapper_config_node1.yaml"

echo "🚀 Deploying Swapper Service Configuration to Node #1"
echo "======================================================"
echo ""

# Check if config file exists locally
if [ ! -f "$LOCAL_CONFIG" ]; then
    echo "❌ Local config file not found: $LOCAL_CONFIG"
    exit 1
fi

echo "✅ Found local config: $LOCAL_CONFIG"
echo ""

# Test connection to Node #1
echo "🔍 Testing connection to Node #1..."
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$NODE1_USER@$NODE1_IP" "echo 'Connection successful'" 2>/dev/null; then
    echo "❌ Cannot connect to Node #1"
    echo "   Please ensure:"
    echo "   1. SSH key is set up"
    echo "   2. Node #1 is accessible at $NODE1_IP"
    echo "   3. User $NODE1_USER has access"
    echo ""
    echo "📋 Manual deployment instructions:"
    echo "   1. Copy config file:"
    echo "      scp $LOCAL_CONFIG $NODE1_USER@$NODE1_IP:$PROJECT_ROOT/$CONFIG_FILE"
    echo "   2. SSH to Node #1:"
    echo "      ssh $NODE1_USER@$NODE1_IP"
    echo "   3. Restart Swapper Service:"
    echo "      cd $PROJECT_ROOT"
    echo "      docker-compose restart swapper-service"
    echo "   4. Verify:"
    echo "      curl http://localhost:8890/models"
    exit 1
fi

echo "✅ Connection successful"
echo ""

# Create directory if it doesn't exist
echo "📁 Ensuring config directory exists..."
ssh "$NODE1_USER@$NODE1_IP" "mkdir -p $PROJECT_ROOT/services/swapper-service/config" || true

# Backup existing config if it exists
echo "💾 Backing up existing config..."
ssh "$NODE1_USER@$NODE1_IP" "
    if [ -f $PROJECT_ROOT/$CONFIG_FILE ]; then
        cp $PROJECT_ROOT/$CONFIG_FILE $PROJECT_ROOT/$CONFIG_FILE.backup.\$(date +%Y%m%d_%H%M%S)
        echo '✅ Existing config backed up'
    fi
"

# Copy config file
echo "📤 Copying config file to Node #1..."
scp "$LOCAL_CONFIG" "$NODE1_USER@$NODE1_IP:$PROJECT_ROOT/$CONFIG_FILE"

echo "✅ Config file copied"
echo ""

# Check if Swapper Service is running
echo "🔍 Checking Swapper Service status..."
SWAPPER_STATUS=$(ssh "$NODE1_USER@$NODE1_IP" "docker ps --filter 'name=swapper' --format '{{.Names}}' | head -1" 2>/dev/null || echo "")

if [ -z "$SWAPPER_STATUS" ]; then
    echo "⚠️  Swapper Service container not found"
    echo "   Attempting to start it..."
    ssh "$NODE1_USER@$NODE1_IP" "cd $PROJECT_ROOT && docker-compose up -d swapper-service" || {
        echo "❌ Failed to start Swapper Service"
        echo "   Please start it manually:"
        echo "   ssh $NODE1_USER@$NODE1_IP"
        echo "   cd $PROJECT_ROOT"
        echo "   docker-compose up -d swapper-service"
        exit 1
    }
    echo "✅ Swapper Service started"
else
    echo "✅ Swapper Service is running: $SWAPPER_STATUS"
fi

echo ""

# Check if config is mounted or needs to be copied into container
echo "🔍 Checking config mount..."
CONFIG_MOUNTED=$(ssh "$NODE1_USER@$NODE1_IP" "docker inspect $SWAPPER_STATUS 2>/dev/null | grep -q '$CONFIG_FILE' && echo 'yes' || echo 'no'" || echo "no")

if [ "$CONFIG_MOUNTED" = "no" ]; then
    echo "📋 Config not mounted, copying to container..."
    ssh "$NODE1_USER@$NODE1_IP" "docker cp $PROJECT_ROOT/$CONFIG_FILE $SWAPPER_STATUS:/app/config/swapper_config.yaml" || {
        echo "⚠️  Could not copy config to container"
        echo "   Config file is at: $PROJECT_ROOT/$CONFIG_FILE"
        echo "   You may need to restart the container or update docker-compose.yml"
    }
else
    echo "✅ Config is mounted in container"
fi

echo ""

# Restart Swapper Service
echo "🔄 Restarting Swapper Service..."
ssh "$NODE1_USER@$NODE1_IP" "cd $PROJECT_ROOT && docker-compose restart swapper-service" || {
    echo "⚠️  docker-compose restart failed, trying docker restart..."
    ssh "$NODE1_USER@$NODE1_IP" "docker restart $SWAPPER_STATUS" || {
        echo "❌ Failed to restart Swapper Service"
        exit 1
    }
}

echo "⏳ Waiting for service to start..."
sleep 5

# Check logs
echo ""
echo "📋 Recent Swapper Service logs:"
ssh "$NODE1_USER@$NODE1_IP" "docker logs $SWAPPER_STATUS --tail 30" 2>/dev/null || echo "Could not retrieve logs"

echo ""
echo "🔍 Verifying configuration..."

# Wait a bit more for service to fully initialize
sleep 3

# Check models endpoint
MODELS_RESPONSE=$(curl -s "http://$NODE1_IP:8890/models" 2>/dev/null || echo "{}")
MODEL_COUNT=$(echo "$MODELS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); models=data.get('models', []); print(len(models))" 2>/dev/null || echo "0")

if [ "$MODEL_COUNT" -gt "0" ]; then
    echo "✅ Swapper Service is configured with $MODEL_COUNT models"
    echo ""
    echo "📊 Models:"
    echo "$MODELS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for model in data.get('models', []):
    print(f\"  - {model.get('name', 'N/A')}: {model.get('type', 'N/A')} ({model.get('size_gb', 0):.2f} GB)\")
" 2>/dev/null || echo "  (Could not parse models)"
else
    echo "⚠️  Models not found in response"
    echo "   Response: $MODELS_RESPONSE"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Check in monitor:"
echo "   http://localhost:8899/node/node-1"
echo ""
echo "📊 Verify via API:"
echo "   curl http://$NODE1_IP:8890/models"
echo "   curl http://$NODE1_IP:8890/status"

