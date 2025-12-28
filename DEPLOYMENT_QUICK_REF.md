# Deployment Quick Reference

## First-Time VPS Setup

### Option 1: Automated Setup (Recommended)
```bash
# Download and run setup script
wget https://raw.githubusercontent.com/your-username/meet-enqoy-app/main/vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh

# Or if you already have the repo cloned:
chmod +x vps-setup.sh
./vps-setup.sh
```

### Option 2: Manual Setup
Follow the detailed guide in `VPS_DEPLOYMENT_GUIDE.md`

---

## Initial Deployment

```bash
# 1. Clone repository
cd ~/apps
git clone https://github.com/your-username/meet-enqoy-app.git
cd meet-enqoy-app

# 2. Create .env file
nano .env
# Add your environment variables (see VPS_DEPLOYMENT_GUIDE.md)

# 3. Create backend .env
cd backend
nano .env
# Add backend environment variables
cd ..

# 4. Start services
docker-compose up -d --build

# 5. Check status
docker-compose ps
docker-compose logs -f
```

---

## Updating Application

### Option 1: Using Deployment Script
```bash
cd ~/apps/meet-enqoy-app
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Update
```bash
cd ~/apps/meet-enqoy-app
git pull origin main
docker-compose down
docker-compose up -d --build
```

---

## Essential Commands

### Docker Compose
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after changes
docker-compose up -d --build

# Check status
docker-compose ps
```

### Database
```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Access database shell
docker-compose exec postgres psql -U enqoy -d enqoy_db

# Prisma Studio (if port exposed)
docker-compose exec backend npx prisma studio
```

### System
```bash
# Check disk space
df -h

# Check memory
free -h

# Check running processes
htop

# Check Docker resources
docker stats
```

---

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000|8080)'

# Restart Docker
sudo systemctl restart docker
```

### Out of disk space
```bash
# Clean Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

### Permission errors
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

---

## File Locations

- Application: `~/apps/meet-enqoy-app`
- Environment: `~/apps/meet-enqoy-app/.env`
- Backend env: `~/apps/meet-enqoy-app/backend/.env`
- Nginx config: `/etc/nginx/sites-available/enqoy`
- Logs: `docker-compose logs` (or `/var/log/nginx/` for Nginx)

---

## Ports

- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx)
- **3000**: Backend API (internal)
- **8080**: Frontend (internal)
- **5432**: PostgreSQL (internal, mapped to 5433 externally)

---

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Strong passwords in .env files
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Regular backups configured
- [ ] Non-root user created
- [ ] Automatic security updates enabled

---

For detailed instructions, see `VPS_DEPLOYMENT_GUIDE.md`


