#!/bin/bash

# ============================================================================
# MVP Rollback Script for NODE1
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

NODE1_IP="144.76.224.179"
NODE1_USER="root"

echo -e "${RED}⚠️  MVP ROLLBACK SCRIPT${NC}"
echo ""
echo "This will:"
echo "  1. Stop MVP services"
echo "  2. Remove MVP containers"
echo "  3. Optionally restore database backup"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 1
fi

ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
    set -e
    
    echo "=== NODE1: Stopping MVP services ==="
    
    cd /opt/microdao-daarion
    
    # Stop services
    if [[ -f docker-compose.mvp.yml ]]; then
        docker compose -f docker-compose.mvp.yml down
        echo "✅ MVP services stopped"
    else
        echo "⚠️  docker-compose.mvp.yml not found"
    fi
    
    # Remove containers
    docker rm -f daarion-agents-service daarion-city-service daarion-secondme-service daarion-microdao-service 2>/dev/null || true
    echo "✅ MVP containers removed"
    
    # List backups
    echo ""
    echo "=== Available backups ==="
    ls -lh /root/backups/daarion_*.sql | tail -5
    echo ""
    
    read -p "Restore database backup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter backup filename (e.g., daarion_20251125_120000.sql): " BACKUP_FILE
        
        if [[ -f "/root/backups/$BACKUP_FILE" ]]; then
            echo "Restoring backup: $BACKUP_FILE"
            docker exec -i daarion-postgres psql -U postgres -d daarion < "/root/backups/$BACKUP_FILE"
            echo "✅ Database restored"
        else
            echo "❌ Backup file not found: $BACKUP_FILE"
        fi
    fi
    
    echo ""
    echo "=== Rollback complete ==="
    echo "MVP services have been stopped and removed"
    echo "Existing DAGI services continue running"
ENDSSH

echo ""
echo -e "${GREEN}✅ Rollback completed${NC}"
echo ""
echo "Check existing services:"
echo "  ssh root@$NODE1_IP 'docker ps'"

