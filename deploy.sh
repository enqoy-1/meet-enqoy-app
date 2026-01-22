#!/bin/bash

# Deployment Script for Enqoy Application
# This script pulls latest changes and redeploys the application

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="${APP_DIR:-$HOME/apps/meet-enqoy-app}"
BRANCH="${BRANCH:-main}"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Enqoy Deployment Script${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory not found: $APP_DIR${NC}"
    echo "Please set APP_DIR environment variable or ensure the app is in ~/apps/meet-enqoy-app"
    exit 1
fi

cd "$APP_DIR"

# Check if git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Pull latest changes
echo -e "${GREEN}[1/4] Pulling latest changes from $BRANCH...${NC}"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Make sure to create it before deploying.${NC}"
fi

# Stop existing containers
echo -e "${GREEN}[2/4] Stopping existing containers...${NC}"
docker-compose down

# Build and start containers
echo -e "${GREEN}[3/4] Building and starting containers...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${GREEN}[4/4] Waiting for services to start...${NC}"
sleep 10

# Check service status
echo ""
echo -e "${GREEN}Service Status:${NC}"
docker-compose ps

# Run database migrations
echo ""
echo -e "${GREEN}Running database migrations...${NC}"
docker-compose exec -T backend npx prisma migrate deploy || echo -e "${YELLOW}Migration may have already run or failed. Check logs.${NC}"

# Show logs
echo ""
echo -e "${GREEN}Recent logs (last 20 lines):${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To check status: docker-compose ps"
echo ""







