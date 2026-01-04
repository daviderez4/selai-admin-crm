#!/bin/bash
# ============================================
# SELAI Admin Hub - Production Deployment Script
# סלע דשבורדים | Sela Dashboards
# ============================================
# הרצה ידנית בלבד על השרת!
# Usage: ./scripts/deploy.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     SELAI Deployment Script            ║"
echo "║     סלע דשבורדים                         ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/selai}"
BACKUP_DIR="${BACKUP_DIR:-/opt/selai-backups}"
BACKUP_KEEP="${BACKUP_KEEP:-5}"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=5

# Check we're on the server
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    echo -e "${RED}❌ Error: Not on production server or .env.production missing${NC}"
    echo "Expected location: $DEPLOY_DIR/.env.production"
    exit 1
fi

cd "$DEPLOY_DIR"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📍 Current branch: $CURRENT_BRANCH${NC}"

# 1. Create backup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"
echo -e "${BLUE}📦 Creating backup at $BACKUP_PATH...${NC}"
mkdir -p "$BACKUP_PATH"

# Save current commit hash for rollback reference
git rev-parse HEAD > "$BACKUP_PATH/commit_hash.txt"

# Backup docker-compose state
docker-compose config > "$BACKUP_PATH/docker-compose-resolved.yml" 2>/dev/null || true

# Stop containers gracefully
echo -e "${YELLOW}🛑 Stopping current containers...${NC}"
docker-compose down --timeout 30 || true

# Backup data volumes if needed
if docker volume ls | grep -q "selai"; then
    echo -e "${BLUE}💾 Backing up volumes...${NC}"
    docker run --rm -v selai-admin-hub_redis-data:/data -v "$BACKUP_PATH:/backup" alpine tar czf /backup/redis-data.tar.gz -C /data . 2>/dev/null || true
fi

# 2. Pull latest from main
echo -e "${BLUE}📥 Fetching latest from origin...${NC}"
git fetch origin main

echo -e "${BLUE}🔀 Checking out main branch...${NC}"
git checkout main
git pull origin main

# Show what changed
echo -e "${YELLOW}📝 Changes in this deployment:${NC}"
git log --oneline -5

# 3. Build and deploy
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker-compose build --no-cache

echo -e "${BLUE}🚀 Starting containers...${NC}"
docker-compose up -d

# 4. Health check with retries
echo -e "${BLUE}🏥 Running health checks...${NC}"
HEALTHY=false
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    echo -e "  Attempt $i/$HEALTH_CHECK_RETRIES..."
    sleep $HEALTH_CHECK_DELAY

    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")
        echo -e "${GREEN}  ✓ Health check passed${NC}"
        echo "  Response: $HEALTH_RESPONSE"
        HEALTHY=true
        break
    else
        echo -e "${YELLOW}  ⏳ Not ready yet...${NC}"
    fi
done

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}❌ Health check failed after $HEALTH_CHECK_RETRIES attempts!${NC}"
    echo -e "${YELLOW}⏪ Initiating automatic rollback...${NC}"

    # Rollback
    ./scripts/rollback.sh "$BACKUP_PATH"
    exit 1
fi

# 5. Cleanup old backups
echo -e "${BLUE}🧹 Cleaning old backups (keeping last $BACKUP_KEEP)...${NC}"
ls -dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs rm -rf 2>/dev/null || true

# 6. Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deployment Successful!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "🌐 App URL: https://selai.sela-insurance.co.il"
echo -e "📦 Backup:  $BACKUP_PATH"
echo -e "🕐 Time:    $(date)"
echo ""

# Log deployment
echo "$(date '+%Y-%m-%d %H:%M:%S') - Deployed $(git rev-parse --short HEAD) by $(whoami)" >> "$DEPLOY_DIR/deployments.log"
