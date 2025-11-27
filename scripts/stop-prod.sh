#!/bin/bash
#
# DAARION Production Stop Script
# Usage: ./scripts/stop-prod.sh [--force]
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.all.yml"
CADDY_COMPOSE_FILE="docker-compose.caddy.yml"
BACKUP_DIR="/opt/daarion/backups"

log_info() {
    echo -e "ℹ️  $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Banner
echo "╔══════════════════════════════════════╗"
echo "║   DAARION Production Stop            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check for force flag
FORCE=false
if [ "$1" == "--force" ]; then
    FORCE=true
    log_warning "Force stop mode enabled"
fi

# Confirmation
if [ "$FORCE" == false ]; then
    read -p "⚠️  Are you sure you want to stop DAARION production? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Create backup before stopping
log_info "Creating database backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_before_stop_$(date +%Y%m%d_%H%M%S).sql"

if docker ps --filter "name=daarion-postgres" --format "{{.Names}}" | grep -q postgres; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U daarion_user daarion > "$BACKUP_FILE" 2>/dev/null && \
        gzip "$BACKUP_FILE" && \
        log_success "Backup created: ${BACKUP_FILE}.gz"
else
    log_warning "PostgreSQL not running, skipping backup"
fi

# Stop Caddy first
if [ -f "$CADDY_COMPOSE_FILE" ]; then
    log_info "Stopping Caddy..."
    docker compose -f "$CADDY_COMPOSE_FILE" down
    log_success "Caddy stopped"
fi

# Stop all services
log_info "Stopping all services..."
docker compose -f "$COMPOSE_FILE" down

log_success "All services stopped"

# Optional: Clean volumes
if [ "$FORCE" == true ]; then
    read -p "⚠️  Remove all volumes (data will be lost)? (yes/no): " remove_volumes
    if [ "$remove_volumes" == "yes" ]; then
        log_warning "Removing volumes..."
        docker compose -f "$COMPOSE_FILE" down -v
        log_success "Volumes removed"
    fi
fi

echo ""
log_success "🛑 DAARION production stopped"
echo ""
echo "  To start again: ./scripts/deploy-prod.sh"
echo "  Backups location: $BACKUP_DIR"

