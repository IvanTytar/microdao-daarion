#!/bin/bash
# Deploy Swapper Service to Node #1 (Production Server)

set -e

SERVER="root@144.76.224.179"
PROJECT_DIR="/opt/microdao-daarion"

echo "🚀 Deploying Swapper Service to Node #1..."

# Check if we can connect
echo "📡 Connecting to Node #1..."
ssh $SERVER "echo '✅ Connected to Node #1'"

# Pull latest code
echo "📥 Pulling latest code..."
ssh $SERVER "cd $PROJECT_DIR && git pull origin main"

# Build and start Swapper Service
echo "🔨 Building and starting Swapper Service..."
ssh $SERVER "cd $PROJECT_DIR && docker-compose build swapper-service"
ssh $SERVER "cd $PROJECT_DIR && docker-compose up -d swapper-service"

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check health
echo "🏥 Checking service health..."
ssh $SERVER "curl -s http://localhost:8890/health || echo '⚠️  Service not ready yet'"

# Show status
echo "📊 Service status:"
ssh $SERVER "cd $PROJECT_DIR && docker-compose ps swapper-service"

echo ""
echo "✅ Swapper Service deployed to Node #1"
echo "   Health: http://144.76.224.179:8890/health"
echo "   Status: http://144.76.224.179:8890/api/cabinet/swapper/status"
echo ""
echo "📋 Next steps:"
echo "   1. Check logs: ssh $SERVER 'cd $PROJECT_DIR && docker-compose logs -f swapper-service'"
echo "   2. Test API: curl http://144.76.224.179:8890/health"
echo "   3. Integrate in admin console"

