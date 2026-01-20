#!/bin/bash

# Backup Script for VPS Data Migration
# This script creates a complete backup of your Enqoy application data

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="${APP_DIR:-$HOME/apps/meet-enqoy-app}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/migration-backup}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Enqoy Data Backup Script${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory not found: $APP_DIR${NC}"
    echo "Please set APP_DIR environment variable or ensure the app is in ~/apps/meet-enqoy-app"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

echo -e "${GREEN}[1/5] Creating backup directory...${NC}"
echo "Backup location: $BACKUP_DIR"

# Check if Docker containers are running
echo -e "${GREEN}[2/5] Checking Docker containers...${NC}"
cd "$APP_DIR"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}Warning: Some containers may not be running${NC}"
    echo "Attempting to start containers..."
    docker-compose up -d
    sleep 10
fi

# Backup database
echo -e "${GREEN}[3/5] Backing up database...${NC}"
cd "$APP_DIR"
if docker-compose ps postgres | grep -q "Up"; then
    docker-compose exec -T postgres pg_dump -U enqoy enqoy_db > "$BACKUP_DIR/database_backup.sql"
    
    # Verify backup
    if [ -f "$BACKUP_DIR/database_backup.sql" ] && [ -s "$BACKUP_DIR/database_backup.sql" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/database_backup.sql" | cut -f1)
        echo -e "${GREEN}✓ Database backup created: $BACKUP_SIZE${NC}"
    else
        echo -e "${RED}Error: Database backup failed or is empty${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: PostgreSQL container is not running${NC}"
    exit 1
fi

# Backup environment files
echo -e "${GREEN}[4/5] Backing up environment files...${NC}"
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/.env"
    echo -e "${GREEN}✓ Root .env backed up${NC}"
else
    echo -e "${YELLOW}Warning: Root .env file not found${NC}"
fi

if [ -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env" "$BACKUP_DIR/backend.env"
    echo -e "${GREEN}✓ Backend .env backed up${NC}"
else
    echo -e "${YELLOW}Warning: Backend .env file not found${NC}"
fi

# Backup uploaded files (if they exist)
echo -e "${GREEN}[5/5] Checking for uploaded files...${NC}"
if docker-compose exec backend test -d /app/uploads 2>/dev/null; then
    echo "Found uploads directory, backing up..."
    docker cp enqoy-backend:/app/uploads "$BACKUP_DIR/uploads" 2>/dev/null || true
    if [ -d "$BACKUP_DIR/uploads" ]; then
        echo -e "${GREEN}✓ Uploads directory backed up${NC}"
    fi
else
    echo "No uploads directory found (this is okay)"
fi

# Create archive
echo ""
echo -e "${GREEN}Creating backup archive...${NC}"
cd "$BACKUP_DIR"
ARCHIVE_NAME="enqoy-migration-backup-$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE_NAME" \
    database_backup.sql \
    .env \
    backend.env \
    uploads/ 2>/dev/null || \
tar -czf "$ARCHIVE_NAME" \
    database_backup.sql \
    .env \
    backend.env 2>/dev/null || true

if [ -f "$ARCHIVE_NAME" ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    echo -e "${GREEN}✓ Backup archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)${NC}"
else
    echo -e "${RED}Error: Failed to create archive${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Backup location: $BACKUP_DIR/$ARCHIVE_NAME"
echo ""
echo "Next steps:"
echo "1. Transfer backup to new VPS:"
echo "   scp $BACKUP_DIR/$ARCHIVE_NAME user@new-vps-ip:~/"
echo ""
echo "2. Or download to local machine:"
echo "   scp user@old-vps-ip:$BACKUP_DIR/$ARCHIVE_NAME ./"
echo ""
echo -e "${YELLOW}Remember to update environment variables on new VPS!${NC}"

