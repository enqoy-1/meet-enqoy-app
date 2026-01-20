# DNS Subdomain Setup Guide

This guide shows you how to point `vps.lanchi.et` to your VPS IP `75.119.156.107`.

---

## Quick Setup

You need to add an **A Record** in your domain's DNS settings.

### DNS Record Details:
- **Type:** A Record
- **Name/Host:** `vps` (or `vps.lanchi.et` depending on provider)
- **Value/Target:** `75.119.156.107`
- **TTL:** `3600` (or default)

---

## Step-by-Step Instructions by Provider

### General Steps (Most Providers)

1. **Log in to your domain registrar/DNS provider**
   - This is where you bought `lanchi.et` (e.g., Namecheap, GoDaddy, Cloudflare, etc.)

2. **Find DNS Management**
   - Look for "DNS Management", "DNS Settings", "DNS Records", or "Advanced DNS"

3. **Add A Record**
   - Click "Add Record" or "+"
   - Select record type: **A**
   - Enter subdomain: **vps**
   - Enter IP address: **75.119.156.107**
   - TTL: Leave default (usually 3600)
   - Save

4. **Wait for Propagation**
   - DNS changes can take 5 minutes to 48 hours
   - Usually works within 1-2 hours

---

## Provider-Specific Instructions

### Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain `lanchi.et`
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Fill in:
   - **Type:** A
   - **Name:** `vps`
   - **IPv4 address:** `75.119.156.107`
   - **Proxy status:** DNS only (gray cloud) or Proxied (orange cloud)
   - **TTL:** Auto
6. Click **Save**

**Note:** If you use Cloudflare proxy (orange cloud), your VPS IP will be hidden. Use gray cloud for direct connection.

---

### Namecheap

1. Log in to [Namecheap](https://www.namecheap.com)
2. Go to **Domain List**
3. Click **Manage** next to `lanchi.et`
4. Go to **Advanced DNS** tab
5. Under **Host Records**, click **Add New Record**
6. Fill in:
   - **Type:** A Record
   - **Host:** `vps`
   - **Value:** `75.119.156.107`
   - **TTL:** Automatic (or 3600)
7. Click **Save All Changes**

---

### GoDaddy

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products**
3. Click **DNS** next to `lanchi.et`
4. Scroll to **Records** section
5. Click **Add** button
6. Fill in:
   - **Type:** A
   - **Name:** `vps`
   - **Value:** `75.119.156.107`
   - **TTL:** 1 Hour (3600)
7. Click **Save**

---

### Google Domains

1. Log in to [Google Domains](https://domains.google.com)
2. Click on `lanchi.et`
3. Go to **DNS** tab
4. Scroll to **Custom resource records**
5. Click **Manage custom records**
6. Add new record:
   - **Name:** `vps`
   - **Type:** A
   - **Data:** `75.119.156.107`
   - **TTL:** 3600
7. Click **Save**

---

### AWS Route 53

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **Route 53** → **Hosted zones**
3. Click on `lanchi.et`
4. Click **Create record**
5. Fill in:
   - **Record name:** `vps`
   - **Record type:** A
   - **Value:** `75.119.156.107`
   - **TTL:** 300 (or your preference)
6. Click **Create records**

---

### Name.com

1. Log in to [Name.com](https://www.name.com)
2. Go to **My Domains**
3. Click on `lanchi.et`
4. Go to **DNS Records** tab
5. Click **Add Record**
6. Fill in:
   - **Type:** A
   - **Host:** `vps`
   - **Answer:** `75.119.156.107`
   - **TTL:** 3600
7. Click **Add Record**

---

### Other Providers

Most DNS providers follow a similar pattern:
- Find DNS/DNS Management section
- Add new A record
- Subdomain: `vps`
- IP: `75.119.156.107`
- Save

---

## Verify DNS Setup

### Method 1: Using `dig` (Linux/Mac)
```bash
dig vps.lanchi.et +short
# Should return: 75.119.156.107
```

### Method 2: Using `nslookup` (Windows/Linux/Mac)
```bash
nslookup vps.lanchi.et
# Should show: 75.119.156.107
```

### Method 3: Using `ping` (All platforms)
```bash
ping vps.lanchi.et
# Should ping 75.119.156.107
```

### Method 4: Online Tools
- [DNS Checker](https://dnschecker.org/#A/vps.lanchi.et)
- [What's My DNS](https://www.whatsmydns.net/#A/vps.lanchi.et)
- [MXToolbox](https://mxtoolbox.com/DNSLookup.aspx)

Enter `vps.lanchi.et` and check if it resolves to `75.119.156.107`.

---

## Common Issues

### DNS Not Propagating

**Problem:** Changes not showing up after several hours

**Solutions:**
1. **Check TTL value** - Lower TTL (300-600) makes changes propagate faster
2. **Clear DNS cache:**
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   # or
   sudo service network-manager restart
   
   # Mac
   sudo dscacheutil -flushcache
   ```
3. **Wait longer** - Some ISPs cache DNS for up to 48 hours
4. **Check for typos** - Verify the record was saved correctly

### Subdomain Not Working

**Problem:** `vps.lanchi.et` doesn't resolve

**Check:**
1. Is the A record saved correctly?
2. Is the IP address correct? (`75.119.156.107`)
3. Is the subdomain name correct? (`vps` not `vps.lanchi.et` in the host field)
4. Are there conflicting records (CNAME vs A record)?

### Wrong IP Showing

**Problem:** DNS resolves to wrong IP

**Solutions:**
1. Delete old A record and create new one
2. Check if there's a CNAME record conflicting
3. Wait for DNS propagation (can take time)

---

## After DNS is Set Up

Once `vps.lanchi.et` points to your VPS:

### 1. Update Your Application Configuration

**Update `.env` files:**
```env
FRONTEND_URL=https://vps.lanchi.et
VITE_API_URL=https://vps.lanchi.et/api
```

**Update `backend/.env`:**
```env
FRONTEND_URL=https://vps.lanchi.et
GOOGLE_CALLBACK_URL=https://vps.lanchi.et/api/auth/google/callback
```

### 2. Set Up SSL Certificate

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d vps.lanchi.et

# Or if not using Nginx:
sudo certbot certonly --standalone -d vps.lanchi.et
```

### 3. Update Nginx Configuration (if using)

```nginx
server {
    listen 80;
    server_name vps.lanchi.et;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Update Google OAuth (if using)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Update OAuth 2.0 credentials:
   - **Authorized JavaScript origins:** `https://vps.lanchi.et`
   - **Authorized redirect URIs:** `https://vps.lanchi.et/api/auth/google/callback`

---

## Quick Reference

**DNS Record to Add:**
```
Type: A
Name: vps
Value: 75.119.156.107
TTL: 3600
```

**Expected Result:**
```
vps.lanchi.et → 75.119.156.107
```

**Verification Command:**
```bash
nslookup vps.lanchi.et
# Should return: 75.119.156.107
```

---

## Checklist

- [ ] Logged into domain provider
- [ ] Found DNS management section
- [ ] Added A record with:
  - [ ] Type: A
  - [ ] Name: `vps`
  - [ ] Value: `75.119.156.107`
- [ ] Saved changes
- [ ] Waited for propagation (5 min - 2 hours)
- [ ] Verified with `nslookup vps.lanchi.et`
- [ ] Updated application `.env` files
- [ ] Set up SSL certificate
- [ ] Updated OAuth callbacks (if needed)

---

## Need Help?

If you're not sure which provider you're using:
1. Check your email for domain purchase confirmation
2. Try logging into common providers (Namecheap, GoDaddy, Cloudflare)
3. Use [WHOIS lookup](https://whois.net) to see registrar info

If DNS still doesn't work after 24 hours, contact your domain provider's support.

