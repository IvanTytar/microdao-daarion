#!/bin/bash
# Deployment script for telegram-gateway
# Використання: ./scripts/deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-production}
PROJECT_ROOT="/opt/telegram-infrastructure"
REMOTE_HOST="root@144.76.224.179"
LOCAL_ROOT="/Users/apple/github-projects/microdao-daarion/telegram-infrastructure"

echo "🚀 Deploying telegram-gateway to $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "production" ]; then
    echo "📦 Syncing files to production server..."
    rsync -avz \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='data/' \
        --exclude='.env' \
        "$LOCAL_ROOT/" "$REMOTE_HOST:$PROJECT_ROOT/"
    
    echo "🔄 Restarting services on production server..."
    ssh "$REMOTE_HOST" "cd $PROJECT_ROOT && \
        docker compose down telegram-gateway && \
        docker compose up -d --build telegram-gateway"
    
    echo "✅ Deployment complete!"
    echo "📋 Check logs: ssh $REMOTE_HOST 'docker logs -f telegram-gateway'"
elif [ "$ENVIRONMENT" = "development" ]; then
    echo "🔄 Restarting services locally..."
    cd "$LOCAL_ROOT"
    docker compose down telegram-gateway
    docker compose up -d --build telegram-gateway
    
    echo "✅ Local deployment complete!"
    echo "📋 Check logs: docker compose logs -f telegram-gateway"
else
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Usage: ./scripts/deploy.sh [production|development]"
    exit 1
fi

