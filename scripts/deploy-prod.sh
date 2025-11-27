#!/bin/bash
#
# DAARION Production Deployment Script
# Usage: ./scripts/deploy-prod.sh
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.all.yml"
CADDY_COMPOSE_FILE="docker-compose.caddy.yml"
ENV_FILE=".env"
LOG_DIR="/var/log/daarion"
BACKUP_DIR="/opt/daarion/backups"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════╗
║   DAARION Production Deployment      ║
║          daarion.space               ║
╚══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then 
  log_warning "Not running as root. Some commands may require sudo."
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed!"
    exit 1
fi
log_success "Docker found"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed!"
    exit 1
fi
log_success "Docker Compose found"

# Check ENV file
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found! Copy .env.example and configure it."
    exit 1
fi
log_success ".env file found"

# Check compose files
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "$COMPOSE_FILE not found!"
    exit 1
fi
log_success "Compose files found"

# Create log directory
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"
log_success "Directories created"

# Network setup
log_info "Setting up Docker network..."
docker network create daarion-network 2>/dev/null || log_warning "Network already exists"
log_success "Network ready"

# Database backup
log_info "Creating database backup..."
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
if docker ps --filter "name=daarion-postgres" --format "{{.Names}}" | grep -q postgres; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U daarion_user daarion > "$BACKUP_FILE" 2>/dev/null || log_warning "Backup failed (DB may not exist yet)"
    if [ -f "$BACKUP_FILE" ]; then
        gzip "$BACKUP_FILE"
        log_success "Backup created: ${BACKUP_FILE}.gz"
    fi
else
    log_warning "PostgreSQL not running, skipping backup"
fi

# Pull latest images (if using registry)
log_info "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull || log_warning "Pull failed, will build locally"

# Build images
log_info "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build
log_success "Images built"

# Start core services
log_info "Starting core services (postgres, redis, nats)..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis nats
sleep 10
log_success "Core services started"

# Run migrations
log_info "Running database migrations..."
if [ -f "scripts/migrate.sh" ]; then
    bash scripts/migrate.sh
else
    log_warning "migrate.sh not found, skipping migrations"
fi

# Start all services
log_info "Starting all application services..."
docker compose -f "$COMPOSE_FILE" up -d
log_success "Application services started"

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 15

# Start Caddy (SSL/HTTPS)
if [ -f "$CADDY_COMPOSE_FILE" ]; then
    log_info "Starting Caddy (SSL/HTTPS)..."
    docker compose -f "$CADDY_COMPOSE_FILE" up -d
    log_success "Caddy started"
else
    log_warning "Caddy compose file not found"
fi

# Health checks
log_info "Running health checks..."
HEALTH_FAILED=0

# Check PostgreSQL
if docker compose -f "$COMPOSE_FILE" exec postgres pg_isready -U daarion_user > /dev/null 2>&1; then
    log_success "PostgreSQL: healthy"
else
    log_error "PostgreSQL: unhealthy"
    HEALTH_FAILED=1
fi

# Check Redis
if docker compose -f "$COMPOSE_FILE" exec redis redis-cli PING > /dev/null 2>&1; then
    log_success "Redis: healthy"
else
    log_error "Redis: unhealthy"
    HEALTH_FAILED=1
fi

# Check Gateway (wait for Caddy SSL)
sleep 5
if curl -sf https://app.daarion.space/health > /dev/null 2>&1; then
    log_success "Gateway: healthy"
else
    log_warning "Gateway: not yet accessible (SSL may be provisioning)"
fi

# Show running containers
echo ""
log_info "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep daarion || true

# Show logs location
echo ""
log_info "Logs available at:"
echo "  - Docker logs: docker logs <container_name>"
echo "  - Application logs: $LOG_DIR"
echo "  - Caddy logs: docker logs daarion-caddy"

# Success message
echo ""
if [ $HEALTH_FAILED -eq 0 ]; then
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "  🌐 Application: https://app.daarion.space"
    echo "  📊 Monitoring: https://app.daarion.space/grafana/"
    echo ""
    echo "  Next steps:"
    echo "    1. Run smoke tests: docs/DEPLOY_SMOKETEST_CHECKLIST.md"
    echo "    2. Monitor logs: docker logs -f daarion-gateway"
    echo "    3. Check metrics: docker stats"
else
    log_error "Deployment completed with errors. Check logs above."
    exit 1
fi

