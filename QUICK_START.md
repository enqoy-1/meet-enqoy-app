# Quick Start Guide

## 🚀 Running the Application

### Option 1: Development Mode (Recommended for testing)

**Step 1: Start Backend**
```bash
cd backend
npm install
npm run prisma:generate
npm run start:dev
```
Backend will run on: `http://localhost:3000`

**Step 2: Start Frontend** (in a new terminal)
```bash
npm install
npm run dev
```
Frontend will run on: `http://localhost:8080`

### Option 2: Docker (Production-like)

```bash
# Make sure Docker is running
docker-compose up --build
```

Access at: `http://localhost`

---

## 📝 First Time Setup

### 1. Set up Database

```bash
cd backend
npm run prisma:migrate
```

### 2. Create Admin User (via API)

Use Postman or curl:
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enqoy.com","password":"admin123","firstName":"Admin"}'

# Then manually add admin role in database or create seed script
```

### 3. Seed Assessment Questions

Create `backend/prisma/seed.ts` to add the 23 assessment questions.

---

## 🔑 API Endpoints Quick Reference

Base URL: `http://localhost:3000/api`

### Auth
- POST `/auth/register` - Create account
- POST `/auth/login` - Login
- GET `/auth/me` - Get current user

### Events
- GET `/events` - List all events
- GET `/events/upcoming` - Upcoming events
- GET `/events/:id` - Event details
- POST `/events` - Create (admin)
- PATCH `/events/:id` - Update (admin)
- DELETE `/events/:id` - Delete (admin)

### Bookings
- POST `/bookings` - Create booking
- GET `/bookings/my` - My bookings
- PATCH `/bookings/:id/cancel` - Cancel booking

### Assessments
- GET `/assessments/questions` - Get questions
- POST `/assessments/submit` - Submit answers
- GET `/assessments/my` - My assessment

### Admin
- GET `/analytics/overview` - Dashboard stats
- GET `/pairing/events/:id/guests` - Event guests
- GET `/users` - All users (admin)

---

## 🐛 Common Issues & Fixes

### Backend won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <pid> /F
```

### Database connection error
```bash
# Check DATABASE_URL in backend/.env
# Make sure PostgreSQL is running
```

### Frontend can't reach backend
```bash
# Check .env in root has:
VITE_API_URL=http://localhost:3000/api
```

### TypeScript errors
```bash
# Regenerate Prisma types
cd backend
npm run prisma:generate
```

### Gemini AI not working
```bash
# Create backend/.env file from example:
cd backend
cp .env.example .env

# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your-actual-api-key-here
```

---

## 📦 What's Been Done

✅ Complete NestJS backend with 10+ modules
✅ Prisma ORM with 22 models
✅ JWT authentication
✅ 60+ API endpoints
✅ Docker setup
✅ API client layer for frontend
✅ Auth context with JWT
✅ Updated Auth page

---

## 🚧 What's Left

⏳ Migrate ~20 page files from Supabase to REST API
⏳ Create seed data script
⏳ Test all user flows
⏳ Test all admin flows

See `MIGRATION_SUMMARY.md` for detailed migration instructions.

---

## 📞 Need Help?

1. Check `MIGRATION_SUMMARY.md` for detailed info
2. Check `PROGRESS.md` for what's been completed
3. Check browser console for errors
4. Check backend logs for API errors

---

**Happy coding! 🎉**
