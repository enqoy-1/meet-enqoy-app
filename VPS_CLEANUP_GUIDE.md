# VPS Cleanup and Preparation Guide

This guide helps you clean up your VPS and prepare it for a new project (like Enqoy).

---

## ⚠️ WARNING: This will DELETE data!

**Before proceeding:**
- [ ] Make sure you have backups of any important data
- [ ] Verify you're on the correct VPS
- [ ] Double-check you want to remove everything

---

## Step 1: Check What's Currently Running

### 1.1 Check Running Services
```bash
# Check Docker containers
docker ps -a

# Check Docker Compose services (if any)
docker-compose ps 2>/dev/null || echo "No docker-compose found"

# Check system services
systemctl list-units --type=service --state=running | grep -E '(docker|nginx|postgres|mysql|node)'

# Check running processes
ps aux | grep -E '(node|npm|docker|postgres|mysql|nginx)'
```

### 1.2 Check Disk Usage
```bash
# See what's taking up space
df -h

# Check largest directories
du -sh /* 2>/dev/null | sort -h
du -sh ~/* 2>/dev/null | sort -h
```

### 1.3 List Current Projects
```bash
# Check home directory
ls -la ~/

# Check common project locations
ls -la ~/apps 2>/dev/null || echo "No apps directory"
ls -la /var/www 2>/dev/null || echo "No /var/www"
ls -la /opt 2>/dev/null || echo "No /opt"
```

---

## Step 2: Stop All Services

### 2.1 Stop Docker Containers
```bash
# Stop all running containers
docker stop $(docker ps -q) 2>/dev/null || echo "No containers running"

# Stop docker-compose services (if exists in current directory)
docker-compose down 2>/dev/null || echo "No docker-compose.yml found"

# Check for docker-compose in other locations
find ~ -name "docker-compose.yml" -type f 2>/dev/null
```

### 2.2 Stop Node/PM2 Processes
```bash
# Check if PM2 is installed
pm2 list 2>/dev/null || echo "PM2 not installed"

# Stop all PM2 processes
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

# Kill any Node processes
pkill -f node 2>/dev/null || echo "No node processes"
```

### 2.3 Stop Database Services
```bash
# Stop PostgreSQL (if installed as service)
sudo systemctl stop postgresql 2>/dev/null || echo "PostgreSQL not running as service"

# Stop MySQL (if installed as service)
sudo systemctl stop mysql 2>/dev/null || echo "MySQL not running as service"
```

### 2.4 Stop Web Servers
```bash
# Stop Nginx
sudo systemctl stop nginx 2>/dev/null || echo "Nginx not running"

# Stop Apache (if installed)
sudo systemctl stop apache2 2>/dev/null || echo "Apache not running"
```

---

## Step 3: Remove Old Project Files

### 3.1 Remove Project Directories
```bash
# Remove the existing project (adjust name as needed)
rm -rf ~/baldridge-ocai-assessmant-platform

# Remove any other project directories
rm -rf ~/apps 2>/dev/null
rm -rf ~/projects 2>/dev/null
rm -rf ~/www 2>/dev/null

# Remove package files in home
rm -f ~/package*.json 2>/dev/null
rm -f ~/package-lock.json 2>/dev/null
```

### 3.2 Remove Docker Volumes and Images
```bash
# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes (CAREFUL: This removes data!)
docker volume prune -f

# Remove all unused networks
docker network prune -f

# Nuclear option: Remove everything Docker-related
# docker system prune -a --volumes -f
```

### 3.3 Remove Database Data
```bash
# If PostgreSQL was installed directly (not in Docker)
sudo apt remove --purge postgresql postgresql-* -y 2>/dev/null
sudo rm -rf /var/lib/postgresql 2>/dev/null

# If MySQL was installed directly
sudo apt remove --purge mysql-server mysql-* -y 2>/dev/null
sudo rm -rf /var/lib/mysql 2>/dev/null
```

---

## Step 4: Clean Up System

### 4.1 Remove Unused Packages
```bash
# Remove Node.js and npm (if you want a fresh install)
sudo apt remove --purge nodejs npm -y 2>/dev/null

# Remove Docker (if you want a fresh install)
sudo apt remove --purge docker.io docker-compose -y 2>/dev/null

# Clean up package cache
sudo apt autoremove -y
sudo apt autoclean
```

### 4.2 Clean Up Logs
```bash
# Clean system logs
sudo journalctl --vacuum-time=1d

# Clean Docker logs
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log 2>/dev/null || echo "No Docker logs"
```

### 4.3 Clean Up Temporary Files
```bash
# Remove temporary files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clean npm cache (if npm was installed)
npm cache clean --force 2>/dev/null || echo "npm not installed"
```

---

## Step 5: Verify Cleanup

### 5.1 Check What's Left
```bash
# Check home directory
ls -la ~/

# Check for any remaining Docker containers/images
docker ps -a
docker images
docker volume ls

# Check disk space
df -h

# Check running services
systemctl list-units --type=service --state=running
```

### 5.2 Check Port Usage
```bash
# Check what ports are in use
sudo netstat -tulpn | grep LISTEN
# Or
sudo ss -tulpn | grep LISTEN
```

---

## Step 6: Prepare for New Project

### 6.1 Update System
```bash
# Update package list
sudo apt update

# Upgrade system
sudo apt upgrade -y
```

### 6.2 Install Required Tools (for Enqoy)

**Install Docker:**
```bash
# Remove old Docker versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Install Docker
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group (replace 'root' with your username if not root)
sudo usermod -aG docker $USER
```

**Install Git:**
```bash
sudo apt install -y git
```

**Install Node.js (if needed for non-Docker setup):**
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 6.3 Configure Firewall
```bash
# Install UFW if not installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 6.4 Create Project Directory
```bash
# Create directory for new project
mkdir -p ~/apps
cd ~/apps
```

---

## Quick Cleanup Script

Here's a script that does most of the cleanup automatically:

```bash
#!/bin/bash
# Quick VPS Cleanup Script

set -e

echo "⚠️  WARNING: This will remove all Docker containers, images, and volumes!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Stop all containers
echo "Stopping containers..."
docker stop $(docker ps -q) 2>/dev/null || true

# Remove Docker resources
echo "Cleaning Docker..."
docker container prune -f
docker image prune -a -f
docker volume prune -f
docker network prune -f

# Remove project directories
echo "Removing project directories..."
rm -rf ~/baldridge-ocai-assessmant-platform
rm -rf ~/apps
rm -rf ~/projects
rm -f ~/package*.json

# Clean system
echo "Cleaning system..."
sudo apt autoremove -y
sudo apt autoclean

echo "✅ Cleanup complete!"
echo "Disk space:"
df -h
```

---

## Complete Fresh Start (Nuclear Option)

If you want to completely wipe everything and start fresh:

```bash
# 1. Stop all services
sudo systemctl stop docker 2>/dev/null
sudo systemctl stop nginx 2>/dev/null
sudo systemctl stop postgresql 2>/dev/null
sudo systemctl stop mysql 2>/dev/null

# 2. Remove Docker completely
sudo apt remove --purge docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc -y
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# 3. Remove all project files
rm -rf ~/*

# 4. Remove databases
sudo apt remove --purge postgresql* mysql* -y
sudo rm -rf /var/lib/postgresql
sudo rm -rf /var/lib/mysql

# 5. Clean everything
sudo apt autoremove -y
sudo apt autoclean
sudo apt update

# 6. Reboot
sudo reboot
```

---

## After Cleanup Checklist

- [ ] All old project files removed
- [ ] Docker containers/images/volumes cleaned
- [ ] System updated
- [ ] Docker installed (if needed)
- [ ] Git installed
- [ ] Firewall configured
- [ ] Project directory created
- [ ] Ready to clone new project

---

## Next Steps

After cleanup, you can:
1. Follow `VPS_DEPLOYMENT_GUIDE.md` to set up Enqoy
2. Clone your new project repository
3. Set up environment variables
4. Deploy your application

---

## Safety Tips

1. **Always backup first** if there's any data you might need
2. **Test commands** on a non-production server first if possible
3. **Double-check paths** before running `rm -rf` commands
4. **Keep SSH access** - don't remove SSH service!
5. **Document what you remove** in case you need to restore something

