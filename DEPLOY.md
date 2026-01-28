# VPS Deployment Guide - Enqoy Application

## Prerequisites
- Ubuntu 20.04+ VPS (2GB+ RAM recommended)
- Domain name pointed to your VPS IP
- Root or sudo access

## 1. Initial Server Setup

### Connect to VPS
```bash
ssh root@your-server-ip
# or
ssh your-user@your-server-ip
```

### Update system
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
npm --version
```

### Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Install Git
```bash
sudo apt install git -y
```

## 2. Database Setup

### Create PostgreSQL Database & User
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE enqoy;
CREATE USER enqoy_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE enqoy TO enqoy_user;
\q
```

## 3. Clone & Configure Application

### Create app directory
```bash
sudo mkdir -p /var/www/enqoy
sudo chown -R $USER:$USER /var/www/enqoy
cd /var/www/enqoy
```

### Clone repository
```bash
git clone https://github.com/enqoy-1/meet-enqoy-app.git .
# Or use SSH: git clone git@github.com:enqoy-1/meet-enqoy-app.git .
```

## 4. Backend Setup

### Navigate to backend
```bash
cd /var/www/enqoy/backend
```

### Install dependencies
```bash
npm install
```

### Create .env file
```bash
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://enqoy_user:your_strong_password_here@localhost:5432/enqoy"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Server Port
PORT=3000

# Node Environment
NODE_ENV=production
EOF
```

**⚠️ Important:** Replace the following in the .env file:
- `your_strong_password_here` - PostgreSQL password
- `your-super-secret-jwt-key-change-this-in-production` - Random secure string
- `your-email@gmail.com` - Your email
- `your-app-password` - Gmail app password
- `yourdomain.com` - Your actual domain

### Run database migrations
```bash
npx prisma generate
npx prisma migrate deploy
```

### Build backend
```bash
npm run build
```

### Test backend manually (optional)
```bash
npm run start:prod
# Press Ctrl+C to stop after testing
```

## 5. Frontend Setup

### Navigate to frontend
```bash
cd /var/www/enqoy
```

### Install dependencies
```bash
npm install
```

### Create frontend .env file
```bash
cat > .env.production << 'EOF'
VITE_API_URL=https://api.yourdomain.com/api
EOF
```

**⚠️ Replace:** `api.yourdomain.com` with your actual API subdomain

### Build frontend
```bash
npm run build
```

## 6. PM2 Process Management

### Create PM2 ecosystem file
```bash
cd /var/www/enqoy
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'enqoy-backend',
      cwd: '/var/www/enqoy/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/enqoy/backend-error.log',
      out_file: '/var/log/enqoy/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
```

### Create log directory
```bash
sudo mkdir -p /var/log/enqoy
sudo chown -R $USER:$USER /var/log/enqoy
```

### Start application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the command output instructions
```

### View PM2 status
```bash
pm2 status
pm2 logs enqoy-backend
```

## 7. Nginx Configuration

### Create backend API config
```bash
sudo nano /etc/nginx/sites-available/enqoy-api
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Create frontend config
```bash
sudo nano /etc/nginx/sites-available/enqoy-frontend
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/enqoy/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Enable sites
```bash
sudo ln -s /etc/nginx/sites-available/enqoy-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/enqoy-frontend /etc/nginx/sites-enabled/
```

### Test Nginx configuration
```bash
sudo nginx -t
```

### Reload Nginx
```bash
sudo systemctl reload nginx
```

## 8. SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL certificates
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

### Auto-renewal test
```bash
sudo certbot renew --dry-run
```

## 9. Firewall Setup (UFW)

### Configure firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 10. Post-Deployment

### Verify backend is running
```bash
curl http://localhost:3000/api
```

### Check PM2 status
```bash
pm2 status
pm2 logs --lines 50
```

### Monitor application
```bash
pm2 monit
```

## 11. Deploy Updates

Create a deployment script:
```bash
cat > /var/www/enqoy/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/enqoy

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Backend deployment
echo "🔧 Building backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Frontend deployment
echo "🎨 Building frontend..."
cd /var/www/enqoy
npm install
npm run build

# Restart backend
echo "♻️ Restarting backend..."
pm2 restart enqoy-backend

echo "✅ Deployment complete!"
pm2 status
EOF

chmod +x /var/www/enqoy/deploy.sh
```

### To deploy updates:
```bash
cd /var/www/enqoy
./deploy.sh
```

## 12. Monitoring & Maintenance

### View logs
```bash
# Backend logs
pm2 logs enqoy-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/log/enqoy/backend-error.log
tail -f /var/log/enqoy/backend-out.log
```

### Restart services
```bash
# Restart backend
pm2 restart enqoy-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Database backup
```bash
# Create backup script
cat > /var/www/enqoy/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/enqoy"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

sudo -u postgres pg_dump enqoy > "$BACKUP_DIR/enqoy_$DATE.sql"
echo "Backup created: $BACKUP_DIR/enqoy_$DATE.sql"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "enqoy_*.sql" -mtime +7 -delete
EOF

chmod +x /var/www/enqoy/backup-db.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/enqoy/backup-db.sh") | crontab -
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs enqoy-backend --lines 100

# Check if port is in use
sudo lsof -i :3000

# Check database connection
cd /var/www/enqoy/backend
npx prisma studio
```

### Frontend not loading
```bash
# Check Nginx config
sudo nginx -t

# Check if files exist
ls -la /var/www/enqoy/dist

# Rebuild frontend
cd /var/www/enqoy
npm run build
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d enqoy -c "\dt"
```

### SSL certificate issues
```bash
# Renew certificates manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Environment Variables Reference

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password (use app password for Gmail)
- `FRONTEND_URL` - Full URL of frontend application
- `PORT` - Backend server port (default: 3000)
- `NODE_ENV` - Environment (production)

### Frontend (.env.production)
- `VITE_API_URL` - Full URL to backend API (with /api suffix)

## Security Checklist

- [ ] Strong PostgreSQL password
- [ ] Secure JWT_SECRET (random 64+ characters)
- [ ] SSL certificates installed
- [ ] Firewall configured (UFW)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Database backups automated
- [ ] Email app password (not main password)
- [ ] CORS properly configured in backend
- [ ] Environment variables secured (not in git)
- [ ] PM2 running as non-root user

## Quick Commands Reference

```bash
# View application status
pm2 status
pm2 monit

# View logs
pm2 logs enqoy-backend

# Restart application
pm2 restart enqoy-backend

# Deploy updates
cd /var/www/enqoy && ./deploy.sh

# Backup database
/var/www/enqoy/backup-db.sh

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# SSL certificate renewal
sudo certbot renew
```

## Support

For issues or questions:
- Check logs: `pm2 logs enqoy-backend`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Database issues: Check PostgreSQL logs
- Contact: support@enqoy.app
