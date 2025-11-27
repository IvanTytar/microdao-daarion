#!/bin/bash
# Fix Swapper Service on Node #1 - Ensure config is loaded correctly

set -e

NODE1_IP="144.76.224.179"
NODE1_USER="root"
PROJECT_ROOT="/opt/microdao-daarion"

echo "🔧 Fixing Swapper Service Configuration on Node #1"
echo "=================================================="
echo ""

# Check config file exists
echo "📋 Checking config file..."
ssh "$NODE1_USER@$NODE1_IP" "
    if [ -f $PROJECT_ROOT/services/swapper-service/config/swapper_config.yaml ]; then
        echo '✅ Config file exists'
        echo '📄 Config file content (first 20 lines):'
        head -20 $PROJECT_ROOT/services/swapper-service/config/swapper_config.yaml
    else
        echo '❌ Config file not found'
        exit 1
    fi
"

echo ""
echo "🔄 Restarting Swapper Service to reload config..."
ssh "$NODE1_USER@$NODE1_IP" "docker restart swapper-service"

echo "⏳ Waiting for service to initialize..."
sleep 10

echo ""
echo "📋 Checking Swapper Service logs for initialization..."
ssh "$NODE1_USER@$NODE1_IP" "docker logs swapper-service --tail 50 | grep -i 'model\|initialized\|error\|config' || echo 'No relevant logs found'"

echo ""
echo "🔍 Testing API endpoints..."
echo ""
echo "Status:"
curl -s "http://$NODE1_IP:8890/status" | python3 -m json.tool 2>/dev/null || curl -s "http://$NODE1_IP:8890/status"
echo ""
echo ""
echo "Models:"
curl -s "http://$NODE1_IP:8890/models" | python3 -m json.tool 2>/dev/null || curl -s "http://$NODE1_IP:8890/models"
echo ""

echo "✅ Fix complete!"
echo ""
echo "If models are still not showing, check:"
echo "  1. Ollama is accessible from container: docker exec swapper-service curl http://ollama:11434/api/tags"
echo "  2. Config format is correct: docker exec swapper-service cat /app/config/swapper_config.yaml"
echo "  3. Service logs: docker logs swapper-service --tail 100"

