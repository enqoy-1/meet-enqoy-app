# Google OAuth Setup for VPS Deployment

## Problem
After VPS deployment, the "Continue with Google" button redirects to `http://localhost:3000/api/auth/google` instead of your production domain.

## Solution

### 1. Fix Frontend Code ✅
The frontend code has been updated to use the `VITE_API_URL` environment variable instead of hardcoded localhost.

### 2. Set Up Environment Variables

#### Frontend (.env in root directory)
```env
VITE_API_URL=https://your-domain.com/api
```

#### Backend (.env in backend directory)
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# Frontend URL for redirects
FRONTEND_URL=https://your-domain.com

# Other required variables
DATABASE_URL=postgresql://enqoy:password@postgres:5432/enqoy_db?schema=public
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Configure Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project** (or create a new one)
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Configure:
     - **Name**: Enqoy Production (or your app name)
     - **Authorized JavaScript origins**:
       ```
       https://your-domain.com
       ```
     - **Authorized redirect URIs**:
       ```
       https://your-domain.com/api/auth/google/callback
       ```

5. **Copy Credentials**:
   - Copy the **Client ID** → Use as `GOOGLE_CLIENT_ID`
   - Copy the **Client Secret** → Use as `GOOGLE_CLIENT_SECRET`

### 4. Update Docker Compose (if using Docker)

Add Google OAuth variables to `docker-compose.yml`:

```yaml
backend:
  environment:
    # ... existing variables ...
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL:-https://your-domain.com/api/auth/google/callback}
```

### 5. Restart Services

After updating environment variables:

```bash
# If using Docker
docker-compose down
docker-compose up -d --build

# If running directly
# Restart backend server
cd backend
npm run start:prod

# Rebuild frontend with new env vars
npm run build
```

### 6. Verify Setup

1. **Check Backend Logs**: Should show server starting without errors
2. **Test OAuth Flow**:
   - Go to your production site
   - Click "Continue with Google"
   - Should redirect to Google login (not localhost)
   - After login, should redirect back to your production domain

### Common Issues

#### Issue: "redirect_uri_mismatch" Error
**Solution**: Make sure the redirect URI in Google Console exactly matches:
```
https://your-domain.com/api/auth/google/callback
```
- Must include `https://`
- Must match your domain exactly
- Must include `/api/auth/google/callback` path

#### Issue: Still Redirecting to Localhost
**Solution**: 
1. Check that `VITE_API_URL` is set correctly in frontend `.env`
2. Rebuild frontend: `npm run build`
3. Clear browser cache
4. Check browser console for errors

#### Issue: CORS Errors
**Solution**: Make sure `FRONTEND_URL` in backend matches your production domain:
```env
FRONTEND_URL=https://your-domain.com
```

### Testing Checklist

- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] Authorized redirect URI added: `https://your-domain.com/api/auth/google/callback`
- [ ] `GOOGLE_CLIENT_ID` set in backend `.env`
- [ ] `GOOGLE_CLIENT_SECRET` set in backend `.env`
- [ ] `GOOGLE_CALLBACK_URL` set in backend `.env`
- [ ] `FRONTEND_URL` set in backend `.env`
- [ ] `VITE_API_URL` set in frontend `.env`
- [ ] Frontend rebuilt with new environment variables
- [ ] Backend restarted with new environment variables
- [ ] OAuth flow tested in production

### Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use HTTPS in production** - Google OAuth requires HTTPS
3. **Rotate secrets regularly** - Change Google OAuth credentials periodically
4. **Use different credentials** for development and production


