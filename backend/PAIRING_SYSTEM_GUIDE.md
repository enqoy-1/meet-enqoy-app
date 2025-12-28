# Complete Event Pairing System - Guide

## Overview

The system now supports **fully automatic event pairing** from booking confirmation to final restaurant table assignments. This handles scenarios like:

- **25 people** registered across **3 restaurants**
- Automatic group formation based on personality, age, budget, and gender compatibility
- Smart distribution of groups across multiple venues
- Automatic table creation and seat assignments

## How It Works

### Architecture

```
Bookings (confirmed)
    ↓
Import as PairingGuests
    ↓
Generate Optimal Groups (5-6 people each)
    ↓
Distribute Groups Across Restaurants
    ↓
Create Tables (one per group)
    ↓
Assign Guests to Seats
```

### Database Schema

```
Event
  ├── PairingGuest (all attendees)
  ├── PairingRestaurant (venues)
  │     └── PairingTable
  │           └── PairingAssignment (guest → seat)
```

## New Endpoints

### 1. Complete Event Pairing (ONE-CLICK SOLUTION)

**POST** `/api/pairing/events/:eventId/complete-pairing`

Does everything automatically:
- Imports confirmed bookings as guests
- Generates optimal groups
- Distributes to restaurants
- Creates tables and assignments

**Request Body:**
```json
{
  "restaurants": [
    {
      "name": "The Italian Place",
      "address": "123 Main St",
      "capacity": 12,
      "contactInfo": "+1-555-1234"
    },
    {
      "name": "Sushi Garden",
      "address": "456 Park Ave",
      "capacity": 12,
      "contactInfo": "+1-555-5678"
    }
  ],
  "groupSize": 6,
  "useAI": true,
  "clearExisting": true
}
```

**Response:**
```json
{
  "success": true,
  "imported": 2,
  "totalGuests": 25,
  "groupsGenerated": 4,
  "distribution": {
    "restaurants": [
      {
        "restaurant": {
          "id": "...",
          "name": "The Italian Place",
          "capacity": 12
        },
        "tables": [
          {
            "id": "...",
            "tableNumber": 1,
            "capacity": 6,
            "assignments": [
              {
                "guestId": "...",
                "guestName": "John Doe",
                "seatNumber": 1
              }
            ]
          }
        ],
        "totalGuests": 12
      }
    ],
    "summary": {
      "totalRestaurants": 3,
      "totalTables": 4,
      "totalGuests": 24,
      "unassignedGuests": 1
    }
  },
  "message": "Successfully paired 24 guests into 4 groups across 3 restaurants"
}
```

### 2. Clear Assignments

**DELETE** `/api/pairing/events/:eventId/clear-assignments`

Removes all restaurant assignments for an event (restaurants, tables, assignments).

### 3. Distribute to Restaurants Only

**POST** `/api/pairing/events/:eventId/distribute-to-restaurants`

Generates groups and distributes them, but doesn't import bookings first.

## Example Scenario: 25 People, 3 Restaurants

### Input

- **Event**: Lunch on Saturday
- **Registered**: 25 confirmed bookings
- **Restaurants**:
  - Italian Place (capacity 12)
  - Sushi Garden (capacity 12)
  - French Bistro (capacity 12)

### Process

1. **Import Guests**: All 25 bookings → PairingGuest records
2. **Generate Groups**: Algorithm creates 4 groups of 6, leaving 1 person
   - Group 1: 6 people (compatible personalities, similar age/budget)
   - Group 2: 6 people
   - Group 3: 6 people
   - Group 4: 6 people
   - Leftover: 1 person (could be added to a group of 5)

3. **Distribute**:
   - Italian Place: Group 1 (6 people) + Group 2 (6 people) = 12 guests
   - Sushi Garden: Group 3 (6 people) + Group 4 (6 people) = 12 guests
   - French Bistro: Empty (or Group 5 if there are more)

4. **Create Tables**:
   - Italian Place, Table 1: 6 seats
   - Italian Place, Table 2: 6 seats
   - Sushi Garden, Table 1: 6 seats
   - Sushi Garden, Table 2: 6 seats

5. **Assign Seats**:
   - Each guest gets a specific table and seat number

### Output

```
Italian Place (12 guests)
  Table 1 (6 guests)
    Seat 1: John Doe
    Seat 2: Jane Smith
    Seat 3: Bob Johnson
    Seat 4: Alice Brown
    Seat 5: Charlie Wilson
    Seat 6: Diana Davis

  Table 2 (6 guests)
    Seat 1: Eve Martinez
    ... etc

Sushi Garden (12 guests)
  Table 1 (6 guests)
    ... etc
```

## Grouping Algorithm

The system uses a sophisticated algorithm to create compatible groups based on:

### 1. Personality Categories (5 types)
- **Trailblazers**: Adventurous, outgoing
- **Storytellers**: Expressive, social
- **Philosophers**: Thoughtful, introspective
- **Planners**: Organized, structured
- **Free Spirits**: Flexible, easygoing

### 2. Compatibility Rules
- **Age**: Max 3 years difference within a group
- **Budget**: Same spending range ($500-$1000, $1000-$1500, etc.)
- **Gender**: Balanced distribution (e.g., 3 male / 3 female for groups of 6)
- **Personality**: Best pairing categories together
  - Trailblazers ↔ Free Spirits, Storytellers
  - Storytellers ↔ Philosophers, Trailblazers
  - Philosophers ↔ Planners, Storytellers
  - Planners ↔ Philosophers, Free Spirits
  - Free Spirits ↔ Trailblazers, Planners

### 3. AI Enhancement (Optional)
Set `useAI: true` to use Gemini AI for enhanced grouping with natural language analysis of personality assessments.

## Restaurant Distribution Logic

### Algorithm: Best-Fit Distribution

1. **Sort groups by size** (largest first)
2. **For each group**:
   - Find restaurant with most available capacity
   - Assign group to that restaurant
3. **Create tables**:
   - One table per group
   - Table capacity = group size
4. **Assign seats**:
   - Sequential seat numbering within each table

### Capacity Validation

The system checks:
- Total restaurant capacity ≥ Total guests
- Throws error if insufficient capacity

### Example Distribution

**Scenario**: 25 guests, 4 groups (6, 6, 6, 6, 1 leftover)

**Restaurants**:
- A (cap: 12)
- B (cap: 12)
- C (cap: 12)

**Distribution**:
- A gets Group 1 (6) + Group 2 (6) = 12/12 (full)
- B gets Group 3 (6) + Group 4 (6) = 12/12 (full)
- C gets leftover or nothing = 0/12 (empty)

## Usage Examples

### From Command Line (using curl)

```bash
# Get your admin token first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enqoy.com","password":"your_password"}'

# Complete pairing
curl -X POST http://localhost:3000/api/pairing/events/EVENT_ID/complete-pairing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "restaurants": [
      {"name": "Italian Place", "capacity": 12},
      {"name": "Sushi Garden", "capacity": 12},
      {"name": "French Bistro", "capacity": 12}
    ],
    "groupSize": 6,
    "useAI": false,
    "clearExisting": true
  }'
```

### From Node.js Script

See `test-complete-pairing.js` for a complete example.

### From Frontend

```typescript
const response = await fetch(
  `/api/pairing/events/${eventId}/complete-pairing`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      restaurants: [
        { name: 'Italian Place', capacity: 12 },
        { name: 'Sushi Garden', capacity: 12 },
        { name: 'French Bistro', capacity: 12 },
      ],
      groupSize: 6,
      useAI: true,
      clearExisting: true,
    }),
  }
);

const result = await response.json();
console.log(result.message);
// "Successfully paired 24 guests into 4 groups across 3 restaurants"
```

## Files Created

1. **`restaurant-distribution.service.ts`**: Core distribution logic
2. **`pairing.module.ts`**: Updated to include new service
3. **`pairing.controller.ts`**: New endpoints added
4. **`test-complete-pairing.js`**: Test script
5. **`PAIRING_SYSTEM_GUIDE.md`**: This document

## Testing

1. Ensure backend is running: `npm run start:dev`
2. Get Lunch event ID: `cmj1b8c5h0007fcmvx0ely16v`
3. Update `test-complete-pairing.js` with your admin token
4. Run: `node test-complete-pairing.js`

## Features Summary

✅ **Automatic guest import** from confirmed bookings
✅ **Smart grouping algorithm** (personality, age, budget, gender)
✅ **AI-enhanced pairing** (optional, uses Gemini)
✅ **Automatic restaurant distribution** (best-fit algorithm)
✅ **Table creation** (one per group)
✅ **Seat assignments** (sequential numbering)
✅ **Capacity validation** (prevents overbooking)
✅ **Clear assignments** (reset and redo)
✅ **Comprehensive output** (full details of all assignments)

## Next Steps

To use this in production:

1. **Frontend Integration**: Add UI to specify restaurants
2. **Restaurant Database**: Create a restaurants master table
3. **Venue Selection**: Let admin choose from existing venues
4. **Preview Mode**: Show proposed groupings before finalizing
5. **Manual Adjustments**: Allow admin to swap guests between groups
6. **Notifications**: Email guests their restaurant and table assignments
7. **Print View**: Generate printable seating charts for venues

## Support

For questions or issues, check:
- Backend logs in the terminal
- Database tables: `pairing_guests`, `pairing_restaurants`, `pairing_tables`, `pairing_assignments`
- API response messages for detailed error information
