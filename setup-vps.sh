#!/bin/bash

# Enqoy VPS Quick Setup Script
# Run this on your Ubuntu VPS as root or with sudo

set -e  # Exit on error

echo "🚀 Enqoy VPS Setup Script"
echo "=========================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Get configuration from user
read -p "Enter your domain (e.g., enqoy.app): " DOMAIN
read -p "Enter your API subdomain (e.g., api.enqoy.app): " API_DOMAIN
read -p "Enter PostgreSQL password: " -s DB_PASSWORD
echo ""
read -p "Enter JWT Secret (press Enter for random): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 48)
fi
read -p "Enter SMTP host (e.g., smtp.gmail.com): " SMTP_HOST
read -p "Enter SMTP port (default: 587): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}
read -p "Enter SMTP user: " SMTP_USER
read -p "Enter SMTP password: " -s SMTP_PASS
echo ""
read -p "Enter your email for SSL certificate: " SSL_EMAIL

echo ""
echo "📋 Configuration Summary:"
echo "Domain: $DOMAIN"
echo "API Domain: $API_DOMAIN"
echo "SMTP Host: $SMTP_HOST"
echo "SMTP Port: $SMTP_PORT"
echo "SMTP User: $SMTP_USER"
echo ""
read -p "Continue with installation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Setup PostgreSQL
echo "🗄️  Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE enqoy;
CREATE USER enqoy_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE enqoy TO enqoy_user;
ALTER DATABASE enqoy OWNER TO enqoy_user;
\q
EOF

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/enqoy
APP_DIR="/var/www/enqoy"

# Clone repository
echo "📥 Cloning repository..."
cd /var/www
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already exists, pulling latest..."
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/enqoy-1/meet-enqoy-app.git enqoy
    cd $APP_DIR
fi

# Setup Backend
echo "🔧 Setting up backend..."
cd $APP_DIR/backend

# Create backend .env
cat > .env <<EOF
DATABASE_URL="postgresql://enqoy_user:$DB_PASSWORD@localhost:5432/enqoy"
JWT_SECRET="$JWT_SECRET"
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
FRONTEND_URL=https://$DOMAIN
PORT=3000
NODE_ENV=production
EOF

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# Build backend
echo "🏗️  Building backend..."
npm run build

# Setup Frontend
echo "🎨 Setting up frontend..."
cd $APP_DIR

# Create frontend .env
cat > .env.production <<EOF
VITE_API_URL=https://$API_DOMAIN/api
EOF

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Create PM2 ecosystem
echo "⚙️  Configuring PM2..."
cat > $APP_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: 'enqoy-backend',
      cwd: '$APP_DIR/backend',
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

# Create log directory
mkdir -p /var/log/enqoy

# Start with PM2
echo "🚀 Starting application with PM2..."
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
echo "🌐 Configuring Nginx..."

# Backend API config
cat > /etc/nginx/sites-available/enqoy-api <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 10M;
    }
}
EOF

# Frontend config
cat > /etc/nginx/sites-available/enqoy-frontend <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
}
EOF

# Enable sites
ln -sf /etc/nginx/sites-available/enqoy-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/enqoy-frontend /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

# Install Certbot
echo "🔒 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Get SSL certificates
echo "🔒 Obtaining SSL certificates..."
certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL \
    -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN --redirect

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Create deployment script
echo "📝 Creating deployment script..."
cat > $APP_DIR/deploy.sh <<'EOF'
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /var/www/enqoy

echo "📥 Pulling latest code..."
git pull origin main

echo "🔧 Building backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

echo "🎨 Building frontend..."
cd /var/www/enqoy
npm install
npm run build

echo "♻️ Restarting backend..."
pm2 restart enqoy-backend

echo "✅ Deployment complete!"
pm2 status
EOF

chmod +x $APP_DIR/deploy.sh

# Create backup script
echo "📝 Creating backup script..."
cat > $APP_DIR/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/enqoy"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

sudo -u postgres pg_dump enqoy | gzip > "$BACKUP_DIR/enqoy_$DATE.sql.gz"
echo "Backup created: $BACKUP_DIR/enqoy_$DATE.sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "enqoy_*.sql.gz" -mtime +7 -delete
EOF

chmod +x $APP_DIR/backup-db.sh

# Add daily backup cron job
(crontab -l 2>/dev/null | grep -v backup-db.sh; echo "0 2 * * * $APP_DIR/backup-db.sh") | crontab -

echo ""
echo "✅ Installation Complete!"
echo "=========================="
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   Frontend: https://$DOMAIN"
echo "   API: https://$API_DOMAIN"
echo ""
echo "📋 Next steps:"
echo "   1. Visit https://$DOMAIN to test the application"
echo "   2. Check backend status: pm2 status"
echo "   3. View logs: pm2 logs enqoy-backend"
echo "   4. Deploy updates: cd /var/www/enqoy && ./deploy.sh"
echo ""
echo "📊 Useful commands:"
echo "   - View PM2 status: pm2 status"
echo "   - View logs: pm2 logs enqoy-backend"
echo "   - Restart app: pm2 restart enqoy-backend"
echo "   - Backup database: $APP_DIR/backup-db.sh"
echo "   - Deploy updates: $APP_DIR/deploy.sh"
echo ""
echo "🔒 Your credentials have been saved in:"
echo "   Backend: $APP_DIR/backend/.env"
echo "   Frontend: $APP_DIR/.env.production"
echo ""
echo "⚠️  IMPORTANT: Keep these credentials secure!"
echo ""
