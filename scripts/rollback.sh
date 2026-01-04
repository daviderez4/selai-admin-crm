#!/bin/bash
# ============================================
# SELAI Admin Hub - Rollback Script
# סלע דשבורדים | Sela Dashboards
# ============================================
# חזרה לגרסה קודמת
# Usage: ./scripts/rollback.sh [backup_path]
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}"
echo "╔════════════════════════════════════════╗"
echo "║     SELAI Rollback Script              ║"
echo "║     ⏪ חזרה לגרסה קודמת                  ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/selai}"
BACKUP_DIR="${BACKUP_DIR:-/opt/selai-backups}"
HEALTH_CHECK_URL="http://localhost:3000/api/health"

cd "$DEPLOY_DIR"

# Find backup to restore
if [ -n "$1" ]; then
    BACKUP_PATH="$1"
else
    # Find latest backup
    BACKUP_PATH=$(ls -dt "$BACKUP_DIR"/*/ 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_PATH" ] || [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ No backup found!${NC}"
    echo "Searched in: $BACKUP_DIR"
    echo ""
    echo "Available backups:"
    ls -lt "$BACKUP_DIR" 2>/dev/null || echo "  (none)"
    exit 1
fi

echo -e "${BLUE}📦 Rolling back to: $BACKUP_PATH${NC}"

# Get the commit hash from backup
if [ -f "$BACKUP_PATH/commit_hash.txt" ]; then
    ROLLBACK_COMMIT=$(cat "$BACKUP_PATH/commit_hash.txt")
    echo -e "${BLUE}🔀 Target commit: $ROLLBACK_COMMIT${NC}"
fi

# Confirm rollback (unless running from deploy.sh)
if [ -z "$AUTO_ROLLBACK" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Warning: This will rollback to the previous version!${NC}"
    read -p "Continue? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Rollback cancelled."
        exit 0
    fi
fi

# Stop current containers
echo -e "${YELLOW}🛑 Stopping current containers...${NC}"
docker-compose down --timeout 30 || true

# Restore to previous commit
if [ -n "$ROLLBACK_COMMIT" ]; then
    echo -e "${BLUE}🔀 Checking out commit: $ROLLBACK_COMMIT${NC}"
    git checkout "$ROLLBACK_COMMIT"
fi

# Restore volumes if backup exists
if [ -f "$BACKUP_PATH/redis-data.tar.gz" ]; then
    echo -e "${BLUE}💾 Restoring Redis data...${NC}"
    docker run --rm -v selai-admin-hub_redis-data:/data -v "$BACKUP_PATH:/backup" alpine sh -c "rm -rf /data/* && tar xzf /backup/redis-data.tar.gz -C /data" 2>/dev/null || true
fi

# Rebuild and start
echo -e "${BLUE}🔨 Rebuilding Docker image...${NC}"
docker-compose build

echo -e "${BLUE}🚀 Starting containers...${NC}"
docker-compose up -d

# Health check
echo -e "${BLUE}🏥 Verifying rollback...${NC}"
sleep 10

if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✅ Rollback Successful!            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "🌐 App URL: https://selai.sela-insurance.co.il"
    echo -e "📦 Restored from: $BACKUP_PATH"
    echo -e "🕐 Time: $(date)"

    # Log rollback
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Rollback to $ROLLBACK_COMMIT by $(whoami)" >> "$DEPLOY_DIR/deployments.log"
else
    echo -e "${RED}❌ Rollback health check failed!${NC}"
    echo "Manual intervention required."
    echo ""
    echo "Check logs with: docker-compose logs"
    exit 1
fi
