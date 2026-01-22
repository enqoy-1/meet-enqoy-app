# VPS Deployment Guide

This guide covers setting up your VPS from scratch and deploying the Enqoy application.

## Prerequisites
- A fresh VPS (Ubuntu 20.04/22.04 or Debian 11/12 recommended)
- Root or sudo access
- Your GitHub repository URL
- Domain name (optional, for production)

---

## Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS
```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 1.2 Update System Packages
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Essential Tools
```bash
sudo apt install -y curl wget git vim ufw software-properties-common
```

### 1.4 Configure Firewall
```bash
# Allow SSH (important - do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If you need direct access to backend (not recommended for production)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 2: Install Required Software

### 2.1 Install Node.js (v20 LTS)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 2.2 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (replace 'your-username' with your actual username)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Note: You may need to log out and back in for docker group changes to take effect
```

### 2.3 Install Git (if not already installed)
```bash
sudo apt install -y git
git --version
```

---

## Step 3: Set Up Application

### 3.1 Clone Your Repository
```bash
# Create a directory for your applications
mkdir -p ~/apps
cd ~/apps

# Clone your repository
git clone https://github.com/your-username/meet-enqoy-app.git
cd meet-enqoy-app

# Or if using SSH:
# git clone git@github.com:your-username/meet-enqoy-app.git
```

### 3.2 Set Up SSH Key for GitHub (if using SSH)
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Copy this key and add it to GitHub: Settings > SSH and GPG keys > New SSH key
```

### 3.3 Create Environment File
```bash
# Create .env file in the root directory
cd ~/apps/meet-enqoy-app
nano .env
```

Add the following (adjust values as needed):
```env
# Database
DB_PASSWORD=your-secure-database-password-here

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Application URLs
FRONTEND_URL=http://your-domain.com
VITE_API_URL=http://your-domain.com/api

# Gemini API (if using)
GEMINI_API_KEY=your-gemini-api-key

# Node Environment
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

### 3.4 Set Up Backend Environment
```bash
# Create backend .env file
cd ~/apps/meet-enqoy-app/backend
nano .env
```

Add backend-specific environment variables:
```env
DATABASE_URL=postgresql://enqoy:your-secure-database-password-here@postgres:5432/enqoy_db?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://your-domain.com
GEMINI_API_KEY=your-gemini-api-key
```

---

## Step 4: Deploy with Docker Compose

### 4.1 Build and Start Services
```bash
cd ~/apps/meet-enqoy-app

# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4.2 Run Database Migrations
```bash
# Migrations should run automatically, but you can also run manually:
docker-compose exec backend npx prisma migrate deploy
```

### 4.3 Verify Services
```bash
# Check if all containers are running
docker ps

# Test backend
curl http://localhost:3000/api/events

# Test frontend
curl http://localhost:8080
```

---

## Step 5: Set Up Nginx (Production)

### 5.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 5.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/enqoy
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/enqoy /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 5.4 Set Up SSL with Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure HTTPS and redirect HTTP to HTTPS
# Certificates auto-renew via cron job
```

---

## Step 6: Useful Commands

### Application Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f
docker-compose logs -f backend  # Backend only
docker-compose logs -f frontend  # Frontend only

# Rebuild after code changes
docker-compose up -d --build

# Access backend container shell
docker-compose exec backend sh

# Access database
docker-compose exec postgres psql -U enqoy -d enqoy_db
```

### Database Management
```bash
# Run Prisma migrations
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma Client
docker-compose exec backend npx prisma generate

# Open Prisma Studio
docker-compose exec backend npx prisma studio
# Then access at http://your-vps-ip:5555 (if port is exposed)
```

### Git Updates
```bash
cd ~/apps/meet-enqoy-app

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

---

## Step 7: Security Best Practices

### 7.1 Create Non-Root User (Recommended)
```bash
# Create new user
sudo adduser deploy

# Add to sudo group
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Switch to new user
su - deploy
```

### 7.2 Set Up SSH Key Authentication
```bash
# On your local machine, copy your SSH key
ssh-copy-id deploy@your-vps-ip

# Disable password authentication (edit /etc/ssh/sshd_config)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### 7.3 Regular Updates
```bash
# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 7.4 Backup Strategy
```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U enqoy enqoy_db > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh
```

---

## Step 8: Monitoring (Optional)

### 8.1 Install Monitoring Tools
```bash
# Install htop for system monitoring
sudo apt install -y htop

# View system resources
htop
```

### 8.2 Set Up Log Rotation
```bash
# Docker logs can grow large, set up log rotation
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000|8080)'

# Check Docker status
sudo systemctl status docker
```

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

### Permission Issues
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
# Log out and back in

# Fix file permissions
sudo chown -R $USER:$USER ~/apps/meet-enqoy-app
```

---

## Quick Reference Checklist

- [ ] VPS provisioned and accessible via SSH
- [ ] System updated (`apt update && apt upgrade`)
- [ ] Firewall configured (UFW)
- [ ] Node.js 20.x installed
- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Environment variables configured (.env files)
- [ ] Docker containers built and running
- [ ] Database migrations completed
- [ ] Nginx configured (if using)
- [ ] SSL certificate installed (if using domain)
- [ ] Backups configured
- [ ] Monitoring set up

---

## Next Steps

1. **Domain Setup**: Point your domain's A record to your VPS IP
2. **SSL Certificate**: Use Let's Encrypt for free HTTPS
3. **Monitoring**: Set up application monitoring (e.g., PM2, Sentry)
4. **CI/CD**: Consider setting up GitHub Actions for automated deployments
5. **Backups**: Implement automated database backups

---

## Support

For issues specific to the application, check:
- `README.md` - General project information
- `QUICK_START.md` - Quick start guide
- `EMAIL_SETUP.md` - Email configuration
- `TESTING_GUIDE.md` - Testing instructions







