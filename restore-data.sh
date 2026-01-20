#!/bin/bash

# Restore Script for VPS Data Migration
# This script restores data from a backup to your new Enqoy installation

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="${APP_DIR:-$HOME/apps/meet-enqoy-app}"
BACKUP_FILE="${1:-$HOME/enqoy-migration-backup-*.tar.gz}"
RESTORE_DIR="${RESTORE_DIR:-$HOME/migration-restore}"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Enqoy Data Restore Script${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ] && [ ! -f $(ls $BACKUP_FILE 2>/dev/null | head -1) ]; then
    echo -e "${RED}Error: Backup file not found${NC}"
    echo "Usage: $0 [path-to-backup.tar.gz]"
    echo "Example: $0 ~/enqoy-migration-backup-20250101-120000.tar.gz"
    exit 1
fi

# Get actual backup file path (handle wildcards)
ACTUAL_BACKUP=$(ls $BACKUP_FILE 2>/dev/null | head -1)
if [ -z "$ACTUAL_BACKUP" ]; then
    echo -e "${RED}Error: Could not find backup file${NC}"
    exit 1
fi

echo "Backup file: $ACTUAL_BACKUP"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory not found: $APP_DIR${NC}"
    echo "Please set APP_DIR environment variable or ensure the app is in ~/apps/meet-enqoy-app"
    exit 1
fi

# Extract backup
echo -e "${GREEN}[1/6] Extracting backup...${NC}"
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"
tar -xzf "$ACTUAL_BACKUP"

if [ ! -f "database_backup.sql" ]; then
    echo -e "${RED}Error: database_backup.sql not found in backup${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backup extracted${NC}"

# Check if Docker containers are running
echo -e "${GREEN}[2/6] Checking Docker containers...${NC}"
cd "$APP_DIR"

if ! docker-compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}Starting containers...${NC}"
    docker-compose up -d
    echo "Waiting for services to be ready..."
    sleep 15
fi

# Verify database is ready
echo -e "${GREEN}[3/6] Verifying database connection...${NC}"
if ! docker-compose exec -T postgres pg_isready -U enqoy > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Check database logs: docker-compose logs postgres"
    exit 1
fi

echo -e "${GREEN}✓ Database is ready${NC}"

# Restore database
echo -e "${GREEN}[4/6] Restoring database...${NC}"
echo -e "${YELLOW}This may take a few minutes depending on database size...${NC}"

# Check if database exists and has data
DB_EXISTS=$(docker-compose exec -T postgres psql -U enqoy -lqt | cut -d \| -f 1 | grep -w enqoy_db | wc -l)

if [ "$DB_EXISTS" -eq 1 ]; then
    TABLE_COUNT=$(docker-compose exec -T postgres psql -U enqoy -d enqoy_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}Warning: Database already contains $TABLE_COUNT tables${NC}"
        read -p "Do you want to drop and recreate the database? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Dropping existing database..."
            docker-compose exec -T postgres psql -U enqoy -c "DROP DATABASE enqoy_db;"
            docker-compose exec -T postgres psql -U enqoy -c "CREATE DATABASE enqoy_db;"
        else
            echo -e "${YELLOW}Proceeding with restore (may cause conflicts)${NC}"
        fi
    fi
fi

# Restore database
cat "$RESTORE_DIR/database_backup.sql" | \
    docker-compose exec -T postgres psql -U enqoy -d enqoy_db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}Error: Database restoration failed${NC}"
    exit 1
fi

# Run Prisma migrations
echo -e "${GREEN}[5/6] Running Prisma migrations...${NC}"
docker-compose exec backend npx prisma generate
docker-compose exec backend npx prisma migrate deploy || echo -e "${YELLOW}Warning: Some migrations may have already been applied${NC}"

echo -e "${GREEN}✓ Prisma migrations completed${NC}"

# Restore uploaded files (if any)
echo -e "${GREEN}[6/6] Restoring uploaded files...${NC}"
if [ -d "$RESTORE_DIR/uploads" ]; then
    echo "Found uploads directory, restoring..."
    docker cp "$RESTORE_DIR/uploads/." enqoy-backend:/app/uploads/ 2>/dev/null || {
        echo -e "${YELLOW}Warning: Could not restore uploads (directory may not exist in container)${NC}"
    }
    echo -e "${GREEN}✓ Uploads restored${NC}"
else
    echo "No uploads directory in backup (this is okay)"
fi

# Restart services
echo ""
echo -e "${GREEN}Restarting services...${NC}"
docker-compose restart

# Wait for services
sleep 10

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Restore Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Verify restoration
echo "Verifying restoration..."
TABLE_COUNT=$(docker-compose exec -T postgres psql -U enqoy -d enqoy_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "Tables in database: $TABLE_COUNT"

echo ""
echo "Next steps:"
echo "1. Verify data: docker-compose exec postgres psql -U enqoy -d enqoy_db"
echo "2. Check application logs: docker-compose logs backend"
echo "3. Test API: curl http://localhost:3000/api/events"
echo "4. Update environment variables if needed (especially URLs and secrets)"
echo ""
echo -e "${YELLOW}Remember to update:${NC}"
echo "  - Domain names in .env files"
echo "  - OAuth callback URLs"
echo "  - SSL certificates"
echo "  - DNS records"

