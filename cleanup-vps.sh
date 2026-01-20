#!/bin/bash

# VPS Cleanup Script
# This script cleans up your VPS to prepare for a new project

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}=========================================${NC}"
echo -e "${RED}VPS CLEANUP SCRIPT${NC}"
echo -e "${RED}=========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This script will:${NC}"
echo "  - Stop all Docker containers"
echo "  - Remove all Docker images, volumes, and networks"
echo "  - Remove project directories"
echo "  - Clean up system packages"
echo ""
echo -e "${RED}This action CANNOT be undone!${NC}"
echo ""
read -p "Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}[1/7] Checking current state...${NC}"

# Check Docker
if command -v docker &> /dev/null; then
    CONTAINER_COUNT=$(docker ps -a -q | wc -l)
    IMAGE_COUNT=$(docker images -q | wc -l)
    echo "  Docker containers: $CONTAINER_COUNT"
    echo "  Docker images: $IMAGE_COUNT"
else
    echo "  Docker not installed"
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
echo "  Root disk usage: $DISK_USAGE"

echo ""
echo -e "${GREEN}[2/7] Stopping services...${NC}"

# Stop Docker containers
if command -v docker &> /dev/null; then
    echo "  Stopping Docker containers..."
    docker stop $(docker ps -q) 2>/dev/null || echo "    No containers running"
    
    # Stop docker-compose services
    if [ -f docker-compose.yml ]; then
        docker-compose down 2>/dev/null || true
    fi
fi

# Stop PM2 processes
if command -v pm2 &> /dev/null; then
    echo "  Stopping PM2 processes..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
fi

# Stop Node processes
echo "  Stopping Node processes..."
pkill -f node 2>/dev/null || echo "    No node processes"

echo ""
echo -e "${GREEN}[3/7] Removing Docker resources...${NC}"

if command -v docker &> /dev/null; then
    echo "  Removing containers..."
    docker container prune -f
    
    echo "  Removing images..."
    docker image prune -a -f
    
    echo "  Removing volumes..."
    docker volume prune -f
    
    echo "  Removing networks..."
    docker network prune -f
else
    echo "  Docker not installed, skipping..."
fi

echo ""
echo -e "${GREEN}[4/7] Removing project directories...${NC}"

# Remove common project directories
PROJECT_DIRS=(
    "$HOME/baldridge-ocai-assessmant-platform"
    "$HOME/apps"
    "$HOME/projects"
    "$HOME/www"
)

for dir in "${PROJECT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  Removing: $dir"
        rm -rf "$dir"
    fi
done

# Remove package files
echo "  Removing package files..."
rm -f "$HOME/package*.json" 2>/dev/null || true
rm -f "$HOME/package-lock.json" 2>/dev/null || true

echo ""
echo -e "${GREEN}[5/7] Cleaning system packages...${NC}"

# Remove unused packages
echo "  Running apt autoremove..."
sudo apt autoremove -y

echo "  Running apt autoclean..."
sudo apt autoclean

echo ""
echo -e "${GREEN}[6/7] Cleaning logs...${NC}"

# Clean journal logs (keep last day)
echo "  Cleaning system logs..."
sudo journalctl --vacuum-time=1d 2>/dev/null || echo "    Could not clean logs"

# Clean Docker logs
if [ -d /var/lib/docker/containers ]; then
    echo "  Cleaning Docker logs..."
    sudo find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \; 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}[7/7] Final cleanup...${NC}"

# Clean temporary files
echo "  Cleaning temporary files..."
sudo rm -rf /tmp/* 2>/dev/null || true
sudo rm -rf /var/tmp/* 2>/dev/null || true

# Clean npm cache if exists
if command -v npm &> /dev/null; then
    echo "  Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Cleanup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Show final state
echo "Current state:"
echo "  Disk usage:"
df -h / | awk 'NR==2 {print "    " $5 " used (" $4 " free)"}'

if command -v docker &> /dev/null; then
    REMAINING_CONTAINERS=$(docker ps -a -q | wc -l)
    REMAINING_IMAGES=$(docker images -q | wc -l)
    echo "  Docker containers: $REMAINING_CONTAINERS"
    echo "  Docker images: $REMAINING_IMAGES"
fi

echo ""
echo "Home directory contents:"
ls -la ~/ | head -10

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Install Docker (if needed): See VPS_DEPLOYMENT_GUIDE.md"
echo "2. Clone your new project"
echo "3. Set up environment variables"
echo "4. Deploy your application"

