# VPS Data Migration Guide

This guide walks you through copying all data from your existing VPS to a new VPS.

## Overview

The migration process involves:
1. **Backing up data** from the old VPS (database, environment files, uploaded files)
2. **Setting up the new VPS** with the application
3. **Restoring data** to the new VPS
4. **Verifying** everything works

---

## Prerequisites

- Access to both old and new VPS via SSH
- Old VPS is still running and accessible
- New VPS has been provisioned (but not yet set up with the app)

---

## Step 1: Backup Data from Old VPS

### 1.1 Connect to Old VPS
```bash
ssh user@old-vps-ip
cd ~/apps/meet-enqoy-app  # or wherever your app is located
```

### 1.2 Create Backup Directory
```bash
mkdir -p ~/migration-backup
cd ~/migration-backup
```

### 1.3 Backup Database

**Option A: Using Docker (if using docker-compose)**
```bash
# Make sure containers are running
cd ~/apps/meet-enqoy-app
docker-compose ps

# Create database backup
docker-compose exec -T postgres pg_dump -U enqoy enqoy_db > ~/migration-backup/database_backup.sql

# Verify backup was created
ls -lh ~/migration-backup/database_backup.sql
```

**Option B: Direct PostgreSQL connection**
```bash
# If you have direct PostgreSQL access
pg_dump -h localhost -U enqoy -d enqoy_db > ~/migration-backup/database_backup.sql
```

### 1.4 Backup Environment Files
```bash
# Copy environment files (these contain your configuration)
cp ~/apps/meet-enqoy-app/.env ~/migration-backup/.env
cp ~/apps/meet-enqoy-app/backend/.env ~/migration-backup/backend.env

# Note: Review these files and remove any sensitive data before sharing
# You'll need to recreate them on the new VPS with appropriate values
```

### 1.5 Backup Uploaded Files (if any)
```bash
# If you have uploaded files (images, documents, etc.)
# Check where they're stored - could be in volumes or a specific directory
docker-compose exec backend ls -la /app/uploads  # or wherever files are stored

# Copy them if they exist
docker-compose cp backend:/app/uploads ~/migration-backup/uploads 2>/dev/null || echo "No uploads directory found"
```

### 1.6 Create Backup Archive
```bash
cd ~/migration-backup
tar -czf enqoy-migration-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  database_backup.sql \
  .env \
  backend.env \
  uploads/ 2>/dev/null || true

# Verify archive
ls -lh enqoy-migration-backup-*.tar.gz
```

### 1.7 Transfer Backup to Your Local Machine

**Option A: Using SCP (from your local machine)**
```bash
# On your LOCAL machine, run:
scp user@old-vps-ip:~/migration-backup/enqoy-migration-backup-*.tar.gz ./
```

**Option B: Using SCP (from old VPS)**
```bash
# On OLD VPS, if you have access to new VPS:
scp ~/migration-backup/enqoy-migration-backup-*.tar.gz user@new-vps-ip:~/
```

**Option C: Download via HTTP (if you set up a temporary web server)**
```bash
# On old VPS, start a simple HTTP server
cd ~/migration-backup
python3 -m http.server 8080

# Then download from your browser or:
# curl http://old-vps-ip:8080/enqoy-migration-backup-*.tar.gz -o backup.tar.gz
```

---

## Step 2: Set Up New VPS

### 2.1 Initial Setup
Follow the initial setup steps from `VPS_DEPLOYMENT_GUIDE.md`:
- Update system
- Install Docker and Docker Compose
- Configure firewall
- Set up SSH keys

### 2.2 Clone Repository
```bash
cd ~/apps
git clone https://github.com/your-username/meet-enqoy-app.git
cd meet-enqoy-app
```

### 2.3 Transfer Backup to New VPS

**If backup is on your local machine:**
```bash
# From your LOCAL machine:
scp enqoy-migration-backup-*.tar.gz user@new-vps-ip:~/
```

**If backup is on old VPS:**
```bash
# From OLD VPS:
scp ~/migration-backup/enqoy-migration-backup-*.tar.gz user@new-vps-ip:~/
```

### 2.4 Extract Backup on New VPS
```bash
# On NEW VPS:
cd ~
mkdir -p migration-restore
cd migration-restore
tar -xzf ../enqoy-migration-backup-*.tar.gz

# Verify files
ls -la
```

---

## Step 3: Configure New VPS

### 3.1 Set Up Environment Files

**Important:** Update environment variables for the new VPS (especially URLs, IPs, domains).

```bash
cd ~/apps/meet-enqoy-app

# Create root .env file
nano .env
```

Copy from backup but **update these values**:
```env
# Database (will be created fresh)
DB_PASSWORD=your-new-secure-password

# JWT (generate new secret for security)
JWT_SECRET=your-new-super-secret-jwt-key

# Application URLs (update to new VPS domain/IP)
FRONTEND_URL=https://your-new-domain.com
VITE_API_URL=https://your-new-domain.com/api

# Gemini API (copy from old VPS)
GEMINI_API_KEY=your-gemini-api-key

NODE_ENV=production
```

```bash
# Create backend .env file
cd backend
nano .env
```

```env
# Database URL (update password)
DATABASE_URL=postgresql://enqoy:your-new-secure-password@postgres:5432/enqoy_db?schema=public

# JWT (same as root .env)
JWT_SECRET=your-new-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Port
PORT=3000
NODE_ENV=production

# Frontend URL (update to new domain)
FRONTEND_URL=https://your-new-domain.com

# Gemini API (copy from old VPS)
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth (update callback URLs if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-new-domain.com/api/auth/google/callback
```

### 3.2 Start Services (Without Data First)
```bash
cd ~/apps/meet-enqoy-app

# Start services to create empty database
docker-compose up -d --build

# Wait for services to be ready
sleep 15

# Check status
docker-compose ps
docker-compose logs backend
```

---

## Step 4: Restore Data to New VPS

### 4.1 Restore Database

**Option A: Using Docker (Recommended)**
```bash
cd ~/apps/meet-enqoy-app

# Restore database from backup
cat ~/migration-restore/database_backup.sql | \
  docker-compose exec -T postgres psql -U enqoy -d enqoy_db

# Verify restoration
docker-compose exec postgres psql -U enqoy -d enqoy_db -c "\dt"
```

**Option B: Copy file into container first**
```bash
# Copy backup into container
docker cp ~/migration-restore/database_backup.sql enqoy-postgres:/tmp/backup.sql

# Restore
docker-compose exec postgres psql -U enqoy -d enqoy_db -f /tmp/backup.sql

# Clean up
docker-compose exec postgres rm /tmp/backup.sql
```

### 4.2 Run Prisma Migrations (Important!)
```bash
# After restoring data, ensure Prisma schema is in sync
docker-compose exec backend npx prisma generate
docker-compose exec backend npx prisma migrate deploy

# Note: If you get migration errors, you may need to mark migrations as applied:
# docker-compose exec backend npx prisma migrate resolve --applied <migration-name>
```

### 4.3 Restore Uploaded Files (if any)
```bash
# If you had uploaded files
if [ -d ~/migration-restore/uploads ]; then
  docker cp ~/migration-restore/uploads/. enqoy-backend:/app/uploads/
  docker-compose restart backend
fi
```

### 4.4 Restart Services
```bash
cd ~/apps/meet-enqoy-app
docker-compose restart
```

---

## Step 5: Verify Migration

### 5.1 Check Database
```bash
# Connect to database
docker-compose exec postgres psql -U enqoy -d enqoy_db

# Run some queries to verify data
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM bookings;
\q
```

### 5.2 Check Application Logs
```bash
# Check backend logs
docker-compose logs backend | tail -50

# Check for errors
docker-compose logs backend | grep -i error
```

### 5.3 Test API Endpoints
```bash
# Test if API is responding
curl http://localhost:3000/api/events

# Or test from your browser
# http://your-new-vps-ip:3000/api/events
```

### 5.4 Test Frontend
```bash
# Check frontend logs
docker-compose logs frontend | tail -50

# Access frontend
# http://your-new-vps-ip:8080
```

---

## Step 6: Update DNS and Final Steps

### 6.1 Update DNS Records
If you're using a domain name:
- Update A record to point to new VPS IP
- Wait for DNS propagation (can take up to 48 hours, usually much faster)

### 6.2 Update Google OAuth (if using)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update OAuth 2.0 credentials:
   - **Authorized JavaScript origins**: `https://your-new-domain.com`
   - **Authorized redirect URIs**: `https://your-new-domain.com/api/auth/google/callback`

### 6.3 Update SSL Certificate
```bash
# If using Let's Encrypt, get new certificate for new domain/IP
sudo certbot --nginx -d your-new-domain.com
```

### 6.4 Final Verification
- [ ] Database contains all expected records
- [ ] API endpoints respond correctly
- [ ] Frontend loads and displays data
- [ ] Authentication works (login, OAuth)
- [ ] All features work as expected
- [ ] SSL certificate is valid
- [ ] DNS points to new VPS

---

## Troubleshooting

### Database Restoration Errors

**Error: "relation already exists"**
```bash
# Database might have been partially created
# Drop and recreate database
docker-compose exec postgres psql -U enqoy -c "DROP DATABASE enqoy_db;"
docker-compose exec postgres psql -U enqoy -c "CREATE DATABASE enqoy_db;"
# Then restore again
```

**Error: "permission denied"**
```bash
# Check file permissions
chmod 644 ~/migration-restore/database_backup.sql
```

### Migration Conflicts

**Prisma migration errors:**
```bash
# Check migration status
docker-compose exec backend npx prisma migrate status

# If migrations are out of sync, you may need to:
# 1. Mark migrations as applied manually
# 2. Or reset and restore again
```

### Connection Issues

**Can't connect to database:**
```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in backend/.env matches docker-compose.yml
```

---

## Quick Reference Commands

### On Old VPS (Backup)
```bash
cd ~/apps/meet-enqoy-app
docker-compose exec -T postgres pg_dump -U enqoy enqoy_db > ~/backup.sql
tar -czf backup.tar.gz backup.sql .env backend/.env
```

### On New VPS (Restore)
```bash
cd ~/apps/meet-enqoy-app
docker-compose up -d
cat ~/backup.sql | docker-compose exec -T postgres psql -U enqoy -d enqoy_db
docker-compose exec backend npx prisma generate
docker-compose restart
```

---

## Security Notes

1. **Change all passwords** on the new VPS (database, JWT secret, etc.)
2. **Delete backup files** from old VPS after successful migration
3. **Update API keys** if they were domain/IP specific
4. **Review environment files** - don't copy sensitive production keys if not needed
5. **Use secure transfer** (SCP/SSH) for backup files, not unencrypted methods

---

## Post-Migration Checklist

- [ ] All data successfully migrated
- [ ] Application running on new VPS
- [ ] DNS updated and propagated
- [ ] SSL certificate installed
- [ ] OAuth credentials updated
- [ ] All services healthy
- [ ] Backup files securely deleted from old VPS
- [ ] Old VPS can be decommissioned (after verification period)

---

## Need Help?

If you encounter issues:
1. Check application logs: `docker-compose logs`
2. Check database connectivity: `docker-compose exec postgres psql -U enqoy -d enqoy_db`
3. Verify environment variables match between old and new VPS
4. Ensure all required ports are open in firewall

