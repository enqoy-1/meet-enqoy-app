# Testing Guide - Meet Enqoy App

## 🚀 Quick Start

### Prerequisites
1. **Backend running** on `http://localhost:3000`
2. **Frontend running** on `http://localhost:8080`
3. **Database** running (PostgreSQL on port 5433)

---

## 🔑 Test Credentials

### Admin Account
- **Email:** `admin@enqoy.com`
- **Password:** `admin123`
- **Admin Dashboard:** `http://localhost:8080/admin`

### Test User Accounts
- **Email:** `user1@test.com` through `user5@test.com`
- **Password:** `password123` (for all test users)

---

## 📋 User Flow Testing

### 1. Homepage Test
**URL:** `http://localhost:8080/`

**What to check:**
- [ ] Homepage loads without errors
- [ ] You see "Upcoming Events" section
- [ ] 2 events are displayed (Summer Dinner Party, Networking Lunch)
- [ ] Event cards show: title, type, date, venue, price
- [ ] Navigation bar is visible

**Expected Result:** Clean homepage with event listings

---

### 2. Registration Test
**URL:** `http://localhost:8080/auth`

**Steps:**
1. Click on "Sign up" tab
2. Enter email: `newuser@test.com`
3. Enter password: `Test123!`
4. Enter first name: `Test`
5. Enter last name: `User`
6. Click "Sign Up"

**What to check:**
- [ ] Form validates inputs
- [ ] Success message appears
- [ ] Redirected to assessment page
- [ ] User is logged in

**Expected Result:** Account created, redirected to `/assessment`

---

### 3. Login Test
**URL:** `http://localhost:8080/auth`

**Steps:**
1. Click on "Sign in" tab
2. Enter email: `user1@test.com`
3. Enter password: `password123`
4. Click "Sign In"

**What to check:**
- [ ] Login successful
- [ ] Redirected to dashboard (since test users completed assessment)
- [ ] User name displayed in header
- [ ] Logout button visible

**Expected Result:** Logged in, redirected to `/dashboard`

---

### 4. Assessment Test
**URL:** `http://localhost:8080/assessment`

**Steps:**
1. Register a new account (or use account that hasn't completed assessment)
2. You'll be redirected to assessment automatically
3. Fill out the assessment questions (10 steps)
4. Click "Next" for each step
5. Click "Submit" on final step

**What to check:**
- [ ] All 10 assessment questions load
- [ ] Progress indicator shows current step
- [ ] Can navigate between steps
- [ ] Form validation works
- [ ] Submit button appears on last step
- [ ] Redirected to dashboard after submission

**Expected Questions:**
1. What is your age?
2. What is your gender?
3. Are you in a relationship?
4. Do you have children?
5. What city do you live in?
6. How would you describe yourself?
7. What is your humor style?
8. How do you prefer to spend money?
9. What are your dietary preferences?
10. What are your hobbies?

**Expected Result:** Assessment completed, redirected to `/dashboard`

---

### 5. Dashboard Test
**URL:** `http://localhost:8080/dashboard`

**Login first:** `user1@test.com` / `password123`

**What to check:**
- [ ] Dashboard loads
- [ ] User profile information displayed
- [ ] "My Bookings" section visible
- [ ] "Active Announcements" section visible
- [ ] "Browse Events" button works
- [ ] Icebreaker carousel works (if enabled)

**Expected Result:** Personalized dashboard with user data

---

### 6. Browse Events Test
**URL:** `http://localhost:8080/events`

**Login first:** `user1@test.com` / `password123`

**What to check:**
- [ ] Events list loads
- [ ] Filter by event type works
- [ ] Search by venue/title works
- [ ] Can see event details
- [ ] Click on event card navigates to detail page

**Expected Result:** Filterable list of upcoming events

---

### 7. Event Detail & Booking Test
**URL:** `http://localhost:8080/events/{event-id}`

**Steps:**
1. Login as `user1@test.com` / `password123`
2. Go to Events page
3. Click on "Summer Dinner Party"
4. Click "Book Now" button
5. Confirm booking

**What to check:**
- [ ] Event details displayed (title, description, date, venue, price, capacity)
- [ ] Google Maps link works
- [ ] "Book Now" button visible
- [ ] Booking confirmation appears
- [ ] "Cancel Booking" button appears after booking
- [ ] Can cancel the booking

**Expected Result:** Successfully book and cancel event

---

### 8. Icebreaker Game Test
**URL:** `http://localhost:8080/dashboard` (if enabled)

**What to check:**
- [ ] Icebreaker carousel displays
- [ ] Questions rotate through 10 icebreakers
- [ ] Can navigate with arrows
- [ ] Questions are engaging and fun

**Expected Icebreaker Questions:**
- If you could have dinner with anyone, living or dead, who would it be?
- What is your favorite travel destination?
- What is one thing on your bucket list?
- (7 more questions)

**Expected Result:** Interactive carousel with questions

---

## 👨‍💼 Admin Flow Testing

### 1. Admin Login
**URL:** `http://localhost:8080/auth`

**Steps:**
1. Enter email: `admin@enqoy.com`
2. Enter password: `admin123`
3. Click "Sign In"

**What to check:**
- [ ] Login successful
- [ ] Redirected to admin dashboard
- [ ] Admin menu visible

**Expected Result:** Admin logged in, access to admin panel

---

### 2. Admin Dashboard
**URL:** `http://localhost:8080/admin`

**Login as admin first**

**What to check:**
- [ ] Analytics dashboard loads
- [ ] KPI cards display:
  - Events This Week
  - Total Events
  - Total Sign Ups
  - Total Bookings
  - Repeat Customers
  - Repeat Rate
- [ ] Charts display:
  - Weekly Sign Ups (area chart)
  - Weekly Bookings (bar chart)
- [ ] New vs Returning pie chart
- [ ] Recent Activity feed shows latest actions
- [ ] Can export CSV for charts

**Expected Result:** Comprehensive analytics dashboard

---

### 3. Admin - Users Management
**URL:** `http://localhost:8080/admin/users`

**What to check:**
- [ ] List of all users displayed
- [ ] Shows: name, email, assessment status, signup date
- [ ] Search by name/email works
- [ ] Filter by assessment completion works
- [ ] Can view user details
- [ ] Can delete users
- [ ] Export to CSV works

**Expected Result:** Complete user management interface

---

### 4. Admin - Events Management
**URL:** `http://localhost:8080/admin/events`

**Steps to create event:**
1. Click "Add Event" button
2. Fill in:
   - Title: "Test Event"
   - Description: "This is a test event"
   - Type: "Dinner"
   - Date & Time: Tomorrow at 7 PM
   - Price: 50
   - Capacity: 20
   - Venue: Select "The Garden Restaurant"
   - Visible: Yes
3. Click "Create Event"

**What to check:**
- [ ] Events list displays
- [ ] Can create new event
- [ ] Can edit existing event
- [ ] Can delete event
- [ ] Can toggle visibility
- [ ] Shows booking count for each event
- [ ] Export to CSV works

**Expected Result:** Full CRUD operations on events

---

### 5. Admin - Venues Management
**URL:** `http://localhost:8080/admin/venues`

**Steps to create venue:**
1. Click "Add Venue"
2. Fill in:
   - Name: "Test Venue"
   - Address: "789 Test St, San Francisco, CA"
   - City: "San Francisco"
   - Capacity: 40
   - Google Maps URL: https://maps.google.com
3. Click "Create"

**What to check:**
- [ ] Venues list displays
- [ ] Can create new venue
- [ ] Can edit venue details
- [ ] Can delete venue
- [ ] Shows capacity and location
- [ ] Export works

**Expected Result:** Venue management system working

---

### 6. Admin - Icebreakers Management
**URL:** `http://localhost:8080/admin/icebreakers`

**What to check:**
- [ ] List of 10 icebreaker questions
- [ ] Can add new question
- [ ] Can edit existing questions
- [ ] Can delete questions
- [ ] Can toggle active/inactive status
- [ ] Export to CSV works

**Expected Result:** Icebreaker question management

---

### 7. Admin - Announcements
**URL:** `http://localhost:8080/admin/announcements`

**Steps to create announcement:**
1. Click "Add Announcement"
2. Title: "Test Announcement"
3. Message: "This is a test message for all users"
4. Priority: 1
5. Active: Yes
6. Click "Create"

**What to check:**
- [ ] Announcements list displays
- [ ] Can create new announcement
- [ ] Can edit announcements
- [ ] Can delete announcements
- [ ] Can toggle active status
- [ ] Priority ordering works

**Expected Result:** Announcement system functional

---

### 8. Admin - Analytics Dashboard
**URL:** `http://localhost:8080/admin/analytics`

**What to check:**
- [ ] All 6 KPI cards display correct data
- [ ] Weekly sign-ups chart shows trend (8 weeks)
- [ ] Weekly bookings chart shows trend (8 weeks)
- [ ] Most popular event type displays
- [ ] New vs Returning users pie chart
- [ ] Recent activity feed (last 10 activities)
- [ ] Can export charts to CSV
- [ ] Charts are interactive (tooltips work)

**Expected Result:** Comprehensive analytics with charts

---

### 9. Admin - Event Pairings
**URL:** `http://localhost:8080/admin/pairings`

**What to check:**
- [ ] List of all events for pairing
- [ ] Can filter by event type
- [ ] Can filter by date range
- [ ] Can search events
- [ ] Click event to manage pairings

**Expected Result:** Event selection for pairing management

---

### 10. Admin - Pairing Detail
**URL:** `http://localhost:8080/admin/pairings/{event-id}`

**What to check:**
- [ ] Guest management tab works
- [ ] Can add guests manually
- [ ] Can import booked guests
- [ ] Restaurant/table management works
- [ ] Pairing board displays
- [ ] Constraints manager works
- [ ] Export options available

**Expected Result:** Advanced pairing management interface

---

### 11. Admin - Assessment Responses
**URL:** `http://localhost:8080/admin/assessment-responses`

**What to check:**
- [ ] List of all user assessments
- [ ] Shows user info and completion date
- [ ] Can view detailed responses
- [ ] Can filter by completion date
- [ ] Can search by user
- [ ] Export to CSV works

**Expected Result:** View all assessment submissions

---

### 12. Admin - Assessment Questions
**URL:** `http://localhost:8080/admin/assessment-questions`

**What to check:**
- [ ] List of 10 assessment questions
- [ ] Can add new question
- [ ] Can edit question text, type, options
- [ ] Can delete questions
- [ ] Can toggle required/optional
- [ ] Can toggle active/inactive
- [ ] Can set display order
- [ ] Export to CSV works

**Expected Result:** Full question management system

---

### 13. Admin - Outside City Interests
**URL:** `http://localhost:8080/admin/outside-city-interests`

**What to check:**
- [ ] List of users interested from outside city
- [ ] Shows phone and city
- [ ] Can search by phone/city
- [ ] Export to CSV works

**Expected Result:** Track outside city interest submissions

---

## ✅ Testing Checklist Summary

### User Flows (8 tests)
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Assessment completion works
- [ ] Dashboard displays user data
- [ ] Event browsing works
- [ ] Event booking & cancellation works
- [ ] Icebreaker carousel works

### Admin Flows (13 tests)
- [ ] Admin login works
- [ ] Admin dashboard shows analytics
- [ ] User management (view, delete, export)
- [ ] Event management (CRUD operations)
- [ ] Venue management (CRUD operations)
- [ ] Icebreaker management
- [ ] Announcement management
- [ ] Analytics charts work
- [ ] Event pairing list works
- [ ] Pairing detail management
- [ ] Assessment responses viewable
- [ ] Assessment questions manageable
- [ ] Outside city interests tracked

---

## 🐛 Common Issues & Solutions

### Frontend shows blank page
**Solution:**
1. Check browser console for errors
2. Make sure backend is running (`curl http://localhost:3000/api/events`)
3. Clear browser cache and refresh

### "Network Error" on login
**Solution:**
1. Verify backend is running on port 3000
2. Check `.env` file has `VITE_API_URL=http://localhost:3000/api`
3. Restart frontend dev server

### "Unauthorized" errors
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Login again
3. Check JWT token is being stored

### Database connection errors (backend)
**Solution:**
1. Make sure Docker PostgreSQL is running: `docker ps`
2. Check DATABASE_URL in `backend/.env`
3. Restart backend

---

## 📊 Expected Data

### Users in Database
- 1 admin user (`admin@enqoy.com`)
- 5 test users (`user1@test.com` through `user5@test.com`)

### Events in Database
- Summer Dinner Party (Tomorrow, $45, Dinner)
- Networking Lunch (Next week, $35, Lunch)

### Venues
- The Garden Restaurant (San Francisco, 50 capacity)
- Rooftop Lounge (San Francisco, 30 capacity)

### Assessment Questions
- 10 questions covering demographics, personality, preferences

### Icebreaker Questions
- 10 fun conversation starter questions

### Announcements
- 1 welcome announcement

---

## 🎯 Success Criteria

✅ **All user flows complete without errors**
✅ **All admin CRUD operations work**
✅ **Authentication & authorization working**
✅ **Data displays correctly (no null/undefined)**
✅ **Charts and analytics functional**
✅ **Search and filter features work**
✅ **Export to CSV works**
✅ **No console errors**
✅ **Backend API responds correctly**

---

## 📝 Notes

- Test with different browsers (Chrome, Firefox, Edge)
- Test responsive design (mobile, tablet, desktop)
- Check network tab for API calls
- Monitor backend logs for errors
- Test edge cases (empty data, invalid inputs)

---

**Happy Testing! 🚀**

If you find any issues, check:
1. Browser console (F12)
2. Backend logs
3. Network tab (API responses)
4. Database content
