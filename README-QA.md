# QA Testing Guide

This document provides instructions for QA testing the Enqoy application.

## Prerequisites

- Access to the application running locally or on a test environment
- Admin credentials for accessing admin features
- Browser developer console access

## Seed Data

### Running the Seed Script

To populate the database with test data:

1. Open the browser console (F12 or Cmd+Option+I)
2. Run: `await window.seedQAData()`

This will create:
- 6 test venues
- 10 test events (within 21 days)
- 40 icebreaker questions

### QA User Accounts

The following test user accounts should be created manually via Supabase Auth:

- qa_user_1@enqoy.test (Alex Johnson, male, 28)
- qa_user_2@enqoy.test (Sarah Williams, female, 32)
- qa_user_3@enqoy.test (Michael Chen, male, 25)
- qa_user_4@enqoy.test (Emily Davis, female, 29)
- qa_user_5@enqoy.test (James Martinez, male, 35)
- qa_user_6@enqoy.test (Jessica Brown, female, 27)
- qa_user_7@enqoy.test (David Wilson, male, 31)
- qa_user_8@enqoy.test (Lisa Anderson, female, 26)
- qa_user_9@enqoy.test (Robert Taylor, male, 33)
- qa_user_10@enqoy.test (Maria Garcia, female, 30)
- qa_user_11@enqoy.test (Christopher Lee, male, 28)
- qa_user_12@enqoy.test (Amanda White, female, 34)

**Password for all QA users:** `QATest123!`

## Time Travel Testing

The application supports time travel for testing time-sensitive features.

### Activating Time Travel

**Via localStorage:**
```javascript
localStorage.setItem('QA_TIME_TRAVEL', 'T-48h');
```

**Via URL parameter:**
```
http://localhost:8080/events/[event-id]?QA_TIME_TRAVEL=T-48h
```

### Time Travel Modes

- `T-48h`: 48 hours before event (venue should be hidden, reschedule/cancel allowed)
- `T-24h`: 24 hours before event (venue visible, snapshot visible, reschedule/cancel blocked)
- `T-0`: Event start time (icebreakers visible)
- `T+2h`: 2 hours after event (event should be in past events)

### Disabling Time Travel

```javascript
localStorage.removeItem('QA_TIME_TRAVEL');
```

## Test Scenarios

### @core - Core User Flow

1. **New User Journey**
   - Navigate to homepage
   - Click "Get Started" or "Take the Assessment"
   - Verify redirect to `/auth`
   - Create account with test email
   - Verify redirect to `/assessment`
   - Complete assessment
   - Verify redirect to `/dashboard`

2. **Booking Flow**
   - Navigate to `/events`
   - Select an event
   - Click "Book This Event"
   - Verify booking appears in "My Upcoming Events" on dashboard

3. **Venue Reveal**
   - Book an event
   - As admin, assign venue via pairing interface
   - Verify venue appears immediately (not waiting for 48h)

### @policy - Policy Compliance

1. **T-48h Reschedule/Cancel Policy**
   - Book an event
   - Set time travel to `T-48h`
   - Verify reschedule/cancel options are available
   - Set time travel to `T-24h`
   - Verify reschedule/cancel options are disabled with error message

2. **Same Price Reschedule**
   - Book an event
   - Attempt to reschedule
   - Verify only events with the same price are shown in the dropdown

### @admin - Admin Features

1. **Admin Pairing**
   - Login as admin
   - Navigate to `/admin/pairings`
   - Select an event
   - Verify guest list shows booked users
   - Assign guests to tables
   - Assign venue to event
   - Verify users can see venue immediately

2. **Event Management**
   - Create new event
   - Edit event details
   - Toggle event visibility

### @mobile - Mobile Experience

1. **Responsive Design**
   - Test on mobile viewport (375px width)
   - Verify buttons are appropriately sized
   - Verify navigation works on mobile

2. **Icebreaker Interface**
   - Set time travel to `T-0`
   - Open event detail page
   - Click "Ice Breakers" button
   - Verify swipeable card interface works on mobile

## Flow Compliance Checklist

### New User Journey
- [ ] Homepage CTAs route to `/auth`
- [ ] Signup redirects to `/assessment`
- [ ] Assessment completion redirects to `/dashboard`
- [ ] Dashboard shows all sections (Upcoming Events, My Upcoming Events, Past Events, Profile)

### Booking & Event Logic
- [ ] Booked events appear immediately in "My Upcoming Events"
- [ ] Venue reveals immediately when admin assigns (not waiting 48h)
- [ ] Icebreakers only visible on event day (T-0)
- [ ] Events automatically move to "Past Events" after event time

### Policies
- [ ] Reschedule/cancel blocked within 48 hours
- [ ] Reschedule only shows same-price events
- [ ] "Give us feedback" button appears for past events

### Profile & Assessment
- [ ] "Retake Assessment" button works from dashboard
- [ ] Assessment retake allows completion without redirect loop

## Known Issues

Document any known issues discovered during testing here.

## Support

For questions or issues, contact the development team.
