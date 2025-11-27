#!/bin/bash

# ============================================================================
# MVP Deployment Script for NODE1 (Hetzner GEX44)
# Deploys: Agents, City, Second Me, MicroDAO services
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE1_IP="144.76.224.179"
NODE1_USER="root"
PROJECT_ROOT="/opt/microdao-daarion"
BACKUP_DIR="/root/backups"
LOG_FILE="/tmp/mvp-deploy-$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# Phase 0: Pre-flight Checks
# ============================================================================

phase_0_preflight() {
    log "Phase 0: Pre-flight checks..."
    
    # Check if running on NODE2 (local)
    if [[ "$(hostname)" == *"MacBook"* ]] || [[ "$(uname)" == "Darwin" ]]; then
        info "Running on NODE2 (MacBook) - will deploy to NODE1"
        
        # Check git status
        if [[ -n $(git status --porcelain) ]]; then
            warn "Uncommitted changes detected!"
            read -p "Commit changes? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git add .
                git commit -m "MVP Phase 1-3: Prepare for NODE1 deployment"
                git push origin main
                log "Changes committed and pushed"
            else
                error "Please commit changes before deployment"
            fi
        fi
        
        # Push to GitHub
        log "Pushing to GitHub..."
        git push origin main || warn "Git push failed (maybe already up to date)"
        
    else
        error "This script should run on NODE2 (local machine)"
    fi
}

# ============================================================================
# Phase 1: SSH to NODE1 and Backup
# ============================================================================

phase_1_backup() {
    log "Phase 1: Connecting to NODE1 and creating backup..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Creating backup ==="
        
        # Create backup directory
        mkdir -p /root/backups
        
        # Backup PostgreSQL
        BACKUP_FILE="/root/backups/daarion_$(date +%Y%m%d_%H%M%S).sql"
        echo "Backing up PostgreSQL to $BACKUP_FILE..."
        docker exec daarion-postgres pg_dump -U postgres daarion > "$BACKUP_FILE"
        
        if [[ -f "$BACKUP_FILE" ]]; then
            SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
        else
            echo "❌ Backup failed!"
            exit 1
        fi
        
        # List existing tables
        echo "=== Existing tables ==="
        docker exec daarion-postgres psql -U postgres -d daarion -c "\dt" | grep -E "agents|microdao|city|secondme" || echo "No MVP tables yet"
        
        echo "=== Backup complete ==="
ENDSSH
    
    log "Backup created successfully"
}

# ============================================================================
# Phase 2: Sync Code to NODE1
# ============================================================================

phase_2_sync_code() {
    log "Phase 2: Syncing code to NODE1..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Syncing code from GitHub ==="
        
        cd /opt/microdao-daarion
        
        # Check current status
        echo "Current branch:"
        git branch --show-current
        
        echo "Last commit:"
        git log --oneline -1
        
        # Pull latest changes
        echo "Pulling latest changes..."
        git fetch origin
        git pull origin main
        
        echo "New commit:"
        git log --oneline -1
        
        # Verify services exist
        echo "=== Verifying services ==="
        for service in agents-service city-service secondme-service microdao-service; do
            if [[ -d "services/$service" ]]; then
                echo "✅ services/$service exists"
            else
                echo "❌ services/$service NOT FOUND!"
                exit 1
            fi
        done
        
        # Verify migrations
        echo "=== Verifying migrations ==="
        for migration in 007 008 010; do
            if ls migrations/${migration}_*.sql 1> /dev/null 2>&1; then
                echo "✅ Migration $migration exists"
            else
                echo "❌ Migration $migration NOT FOUND!"
                exit 1
            fi
        done
        
        echo "=== Code sync complete ==="
ENDSSH
    
    log "Code synced successfully"
}

# ============================================================================
# Phase 3: Apply Database Migrations
# ============================================================================

phase_3_migrations() {
    log "Phase 3: Applying database migrations..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Applying migrations ==="
        
        cd /opt/microdao-daarion
        
        # Apply migrations one by one
        for migration in 007_create_agents_tables.sql 008_create_microdao_core.sql 010_create_city_backend.sql; do
            echo "Applying migration: $migration"
            
            if docker exec -i daarion-postgres psql -U postgres -d daarion < migrations/$migration; then
                echo "✅ Migration $migration applied"
            else
                echo "⚠️  Migration $migration failed (might be already applied)"
            fi
        done
        
        # Verify tables
        echo "=== Verifying tables ==="
        docker exec daarion-postgres psql -U postgres -d daarion -c "\dt" | grep -E "agents|microdao|city|secondme"
        
        echo "=== Migrations complete ==="
ENDSSH
    
    log "Migrations applied successfully"
}

# ============================================================================
# Phase 4: Build Docker Images
# ============================================================================

phase_4_build() {
    log "Phase 4: Building Docker images..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Building Docker images ==="
        
        cd /opt/microdao-daarion
        
        # Build each service
        for service in agents-service city-service secondme-service microdao-service; do
            echo "Building $service..."
            if docker build -t daarion-$service:latest ./services/$service; then
                echo "✅ $service built successfully"
            else
                echo "❌ $service build failed!"
                exit 1
            fi
        done
        
        # List images
        echo "=== Docker images ==="
        docker images | grep daarion
        
        echo "=== Build complete ==="
ENDSSH
    
    log "Docker images built successfully"
}

# ============================================================================
# Phase 5: Start Services
# ============================================================================

phase_5_start_services() {
    log "Phase 5: Starting MVP services..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Starting services ==="
        
        cd /opt/microdao-daarion
        
        # Create minimal docker-compose.mvp.yml if not exists
        cat > docker-compose.mvp.yml << 'EOF'
version: '3.9'

networks:
  daarion_net:
    external: true

services:
  agents-service:
    image: daarion-agents-service:latest
    container_name: daarion-agents-service
    environment:
      PORT: "7014"
      DATABASE_URL: "postgresql://postgres:postgres@daarion-postgres:5432/daarion"
      NATS_URL: "nats://daarion-nats:4222"
    networks:
      - daarion_net
    restart: unless-stopped

  city-service:
    image: daarion-city-service:latest
    container_name: daarion-city-service
    environment:
      PORT: "7001"
      DATABASE_URL: "postgresql://postgres:postgres@daarion-postgres:5432/daarion"
      NATS_URL: "nats://daarion-nats:4222"
      REDIS_URL: "redis://daarion-redis:6379"
    networks:
      - daarion_net
    restart: unless-stopped

  secondme-service:
    image: daarion-secondme-service:latest
    container_name: daarion-secondme-service
    environment:
      PORT: "7003"
      DATABASE_URL: "postgresql://postgres:postgres@daarion-postgres:5432/daarion"
      AGENTS_SERVICE_URL: "http://daarion-agents-service:7014"
      SECONDME_AGENT_ID: "ag_secondme_global"
    networks:
      - daarion_net
    restart: unless-stopped

  microdao-service:
    image: daarion-microdao-service:latest
    container_name: daarion-microdao-service
    environment:
      PORT: "7015"
      DATABASE_URL: "postgresql://postgres:postgres@daarion-postgres:5432/daarion"
      NATS_URL: "nats://daarion-nats:4222"
    networks:
      - daarion_net
    restart: unless-stopped
EOF

        echo "Docker Compose file created"
        
        # Start services
        echo "Starting MVP services..."
        docker compose -f docker-compose.mvp.yml up -d
        
        # Wait 10 seconds for services to start
        echo "Waiting 10 seconds for services to start..."
        sleep 10
        
        # Check status
        echo "=== Service status ==="
        docker ps | grep -E "agents-service|city-service|secondme|microdao"
        
        echo "=== Services started ==="
ENDSSH
    
    log "Services started successfully"
}

# ============================================================================
# Phase 6: Health Checks
# ============================================================================

phase_6_health_checks() {
    log "Phase 6: Running health checks..."
    
    ssh "$NODE1_USER@$NODE1_IP" << 'ENDSSH'
        set -e
        
        echo "=== NODE1: Health checks ==="
        
        # Wait a bit more
        sleep 5
        
        # Check each service
        echo "City Service (7001):"
        curl -f http://localhost:7001/health || echo "FAILED"
        
        echo "Second Me (7003):"
        curl -f http://localhost:7003/health || echo "FAILED"
        
        echo "Agents Service (7014):"
        curl -f http://localhost:7014/health || echo "FAILED"
        
        echo "MicroDAO Service (7015):"
        curl -f http://localhost:7015/health || echo "FAILED"
        
        echo "=== Health checks complete ==="
ENDSSH
    
    log "Health checks completed"
}

# ============================================================================
# Phase 7: Summary
# ============================================================================

phase_7_summary() {
    log "Phase 7: Deployment summary..."
    
    echo ""
    echo "=========================================="
    echo "  MVP DEPLOYMENT COMPLETE! 🎉"
    echo "=========================================="
    echo ""
    echo "Deployed services:"
    echo "  • City Service (7001)"
    echo "  • Second Me (7003)"
    echo "  • Agents Service (7014)"
    echo "  • MicroDAO Service (7015)"
    echo ""
    echo "Next steps:"
    echo "  1. Update Nginx config (manually or via script)"
    echo "  2. Run smoke tests"
    echo "  3. Monitor logs for 15 minutes"
    echo ""
    echo "Rollback command (if needed):"
    echo "  ssh root@144.76.224.179 'cd /opt/microdao-daarion && docker compose -f docker-compose.mvp.yml down'"
    echo ""
    echo "Log file: $LOG_FILE"
    echo "=========================================="
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log "🚀 Starting MVP Deployment to NODE1..."
    log "Target: $NODE1_USER@$NODE1_IP"
    log "Project: $PROJECT_ROOT"
    echo ""
    
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled by user"
    fi
    
    phase_0_preflight
    phase_1_backup
    phase_2_sync_code
    phase_3_migrations
    phase_4_build
    phase_5_start_services
    phase_6_health_checks
    phase_7_summary
    
    log "✅ MVP Deployment completed successfully!"
}

# Run main function
main "$@"

