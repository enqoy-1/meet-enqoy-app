#!/bin/bash

# VPS Initial Setup Script for Enqoy Application
# Run this script on a fresh Ubuntu/Debian VPS

set -e  # Exit on error

echo "========================================="
echo "Enqoy VPS Setup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Note: Some commands require sudo. You may be prompted for your password.${NC}"
fi

# Step 1: Update System
echo -e "${GREEN}[1/8] Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

# Step 2: Install Essential Tools
echo -e "${GREEN}[2/8] Installing essential tools...${NC}"
sudo apt install -y curl wget git vim ufw software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Step 3: Configure Firewall
echo -e "${GREEN}[3/8] Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
echo -e "${GREEN}Firewall configured.${NC}"

# Step 4: Install Node.js 20.x
echo -e "${GREEN}[4/8] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}Node.js installed: $(node --version)${NC}"
else
    echo -e "${YELLOW}Node.js already installed: $(node --version)${NC}"
fi

# Step 5: Install Docker
echo -e "${GREEN}[5/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}Docker installed: $(docker --version)${NC}"
else
    echo -e "${YELLOW}Docker already installed: $(docker --version)${NC}"
fi

# Add current user to docker group
if [ "$EUID" -ne 0 ]; then
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Added $USER to docker group. You may need to log out and back in.${NC}"
fi

# Step 6: Install Docker Compose
echo -e "${GREEN}[6/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed: $(docker-compose --version)${NC}"
else
    echo -e "${YELLOW}Docker Compose already installed: $(docker-compose --version)${NC}"
fi

# Step 7: Install Nginx
echo -e "${GREEN}[7/8] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}Nginx installed${NC}"
else
    echo -e "${YELLOW}Nginx already installed${NC}"
fi

# Step 8: Create Application Directory
echo -e "${GREEN}[8/8] Setting up application directory...${NC}"
APP_DIR="$HOME/apps"
mkdir -p $APP_DIR
echo -e "${GREEN}Application directory created: $APP_DIR${NC}"

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Installed software:"
echo "  - Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "  - npm: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "  - Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
echo "  - Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
echo "  - Git: $(git --version 2>/dev/null || echo 'Not installed')"
echo "  - Nginx: $(nginx -v 2>&1 | head -n1 || echo 'Not installed')"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. If you were added to docker group, log out and back in:"
echo "   exit"
echo "   ssh your-username@your-vps-ip"
echo ""
echo "2. Clone your repository:"
echo "   cd ~/apps"
echo "   git clone https://github.com/your-username/meet-enqoy-app.git"
echo "   cd meet-enqoy-app"
echo ""
echo "3. Create .env file with your configuration"
echo ""
echo "4. Start the application:"
echo "   docker-compose up -d --build"
echo ""
echo "See VPS_DEPLOYMENT_GUIDE.md for detailed instructions."
echo ""


