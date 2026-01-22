# PM2 Deployment Guide

## Quick Commands

### Full Rebuild and Restart (After Code Changes)

```bash
# Navigate to project directory
cd ~/apps/meet-enqoy-app

# 1. Pull latest code (if using git)
git pull origin main

# 2. Install/Update Frontend Dependencies
npm install

# 3. Build Frontend
npm run build

# 4. Install/Update Backend Dependencies
cd backend
npm install

# 5. Generate Prisma Client
npm run prisma:generate

# 6. Build Backend
npm run build

# 7. Go back to root
cd ..

# 8. Restart PM2 processes
pm2 restart ecosystem.config.js

# 9. Check status
pm2 status
pm2 logs
```

### Individual Service Commands

#### Backend Only

```bash
# Navigate to backend
cd ~/apps/meet-enqoy-app/backend

# Install dependencies
npm install

# Generate Prisma Client (if schema changed)
npm run prisma:generate

# Build
npm run build

# Restart backend in PM2
pm2 restart enqoy-backend

# Or reload (zero-downtime)
pm2 reload enqoy-backend
```

#### Frontend Only

```bash
# Navigate to project root
cd ~/apps/meet-enqoy-app

# Install dependencies
npm install

# Build
npm run build

# If using Nginx, reload it to serve new build
sudo systemctl reload nginx

# If serving frontend with PM2 (not recommended)
pm2 restart enqoy-frontend
```

## Initial PM2 Setup

### 1. Install PM2 Globally (if not installed)

```bash
npm install -g pm2
```

### 2. Create Logs Directory

```bash
cd ~/apps/meet-enqoy-app
mkdir -p logs
```

### 3. Start Applications with PM2

```bash
# Start all apps from ecosystem config
pm2 start ecosystem.config.js

# Or start individually:
pm2 start backend/dist/main.js --name enqoy-backend --cwd ./backend
```

### 4. Save PM2 Configuration

```bash
# Save current PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides
```

## Common PM2 Commands

### Process Management

```bash
# List all processes
pm2 list
pm2 status

# Start a process
pm2 start ecosystem.config.js
pm2 start enqoy-backend

# Stop a process
pm2 stop enqoy-backend
pm2 stop all

# Restart a process
pm2 restart enqoy-backend
pm2 restart all

# Reload (zero-downtime restart)
pm2 reload enqoy-backend

# Delete a process
pm2 delete enqoy-backend
pm2 delete all
```

### Monitoring

```bash
# View logs
pm2 logs
pm2 logs enqoy-backend
pm2 logs --lines 100  # Last 100 lines

# Monitor in real-time
pm2 monit

# View process info
pm2 show enqoy-backend

# View process tree
pm2 list --tree
```

### Logs Management

```bash
# Clear all logs
pm2 flush

# Clear specific app logs
pm2 flush enqoy-backend

# View log file locations
pm2 show enqoy-backend | grep "log path"
```

## Environment Variables

### Option 1: In ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'enqoy-backend',
    // ... other config
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://...',
      JWT_SECRET: 'your-secret',
      // ... other vars
    },
  }],
};
```

### Option 2: Using .env file (Recommended)

Create `.env` files and load them:

```bash
# Backend .env
cd backend
nano .env
# Add your environment variables

# PM2 will automatically load .env from the cwd
```

### Option 3: Using env_file in ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'enqoy-backend',
    cwd: './backend',
    script: 'dist/main.js',
    env_file: './backend/.env',  // Load from .env file
    // ... other config
  }],
};
```

## Complete Deployment Script

Create a `deploy-pm2.sh` script:

```bash
#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project
cd ~/apps/meet-enqoy-app

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Frontend
echo "🎨 Building frontend..."
npm install
npm run build

# Backend
echo "⚙️  Building backend..."
cd backend
npm install
npm run prisma:generate
npm run build
cd ..

# Restart PM2
echo "🔄 Restarting PM2 processes..."
pm2 restart ecosystem.config.js

# Save PM2 state
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs"
```

Make it executable:
```bash
chmod +x deploy-pm2.sh
```

Run it:
```bash
./deploy-pm2.sh
```

## Troubleshooting

### Backend Not Starting

```bash
# Check if build succeeded
ls -la backend/dist/main.js

# Check PM2 logs
pm2 logs enqoy-backend --lines 50

# Check if port is in use
sudo lsof -i :3000
netstat -tulpn | grep 3000

# Try starting manually to see errors
cd backend
node dist/main.js
```

### Frontend Not Updating

```bash
# Check if build was successful
ls -la dist/

# If using Nginx, check nginx config
sudo nginx -t
sudo systemctl reload nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### PM2 Process Crashes

```bash
# Check crash logs
pm2 logs enqoy-backend --err

# Check system resources
pm2 monit
free -h
df -h

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

### Environment Variables Not Loading

```bash
# Check if .env file exists
cat backend/.env

# Verify PM2 is reading env vars
pm2 show enqoy-backend | grep "env"

# Restart PM2 to reload env vars
pm2 restart enqoy-backend
```

## Production Checklist

- [ ] PM2 installed globally
- [ ] ecosystem.config.js created
- [ ] Logs directory created
- [ ] Environment variables set in .env files
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] PM2 processes started
- [ ] PM2 startup script configured
- [ ] Nginx configured (if serving frontend)
- [ ] Firewall rules configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Database migrations run
- [ ] PM2 monitoring set up

## Quick Reference

```bash
# Full rebuild and restart
cd ~/apps/meet-enqoy-app && npm install && npm run build && cd backend && npm install && npm run prisma:generate && npm run build && cd .. && pm2 restart ecosystem.config.js

# Quick restart (no rebuild)
pm2 restart all

# View logs
pm2 logs --lines 50

# Check status
pm2 status
```




