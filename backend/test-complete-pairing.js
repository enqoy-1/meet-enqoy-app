const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const EVENT_ID = 'cmj1b8c5h0007fcmvx0ely16v'; // Lunch event ID

// You'll need to get this token by logging in as admin
// For now, we'll show how to structure the request
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE';

async function testCompletePairing() {
  try {
    console.log('='.repeat(60));
    console.log('TESTING COMPLETE EVENT PAIRING WORKFLOW');
    console.log('='.repeat(60));
    console.log();

    // Define restaurants for the event
    const restaurants = [
      {
        name: 'The Italian Place',
        address: '123 Main St, New York, NY',
        capacity: 12, // Can hold 2 groups of 6
        contactInfo: '+1-555-1234',
      },
      {
        name: 'Sushi Garden',
        address: '456 Park Ave, New York, NY',
        capacity: 12, // Can hold 2 groups of 6
        contactInfo: '+1-555-5678',
      },
      {
        name: 'French Bistro',
        address: '789 Broadway, New York, NY',
        capacity: 12, // Can hold 2 groups of 6
        contactInfo: '+1-555-9012',
      },
    ];

    console.log(`📍 Event ID: ${EVENT_ID}`);
    console.log(`🍽️  Restaurants: ${restaurants.length}`);
    console.log(`👥 Total Restaurant Capacity: ${restaurants.reduce((sum, r) => sum + r.capacity, 0)} guests`);
    console.log();

    console.log('Restaurants:');
    restaurants.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (capacity: ${r.capacity})`);
      console.log(`     ${r.address}`);
    });
    console.log();

    // Make API request
    const endpoint = `${BASE_URL}/pairing/events/${EVENT_ID}/complete-pairing`;
    console.log(`🚀 Calling: POST ${endpoint}`);
    console.log();

    const requestBody = {
      restaurants,
      groupSize: 6,
      useAI: false, // Set to false for now to avoid Gemini API dependency
      clearExisting: true, // Clear any existing assignments
    };

    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log();

    console.log('⏳ Sending request...');
    console.log();

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ SUCCESS!');
    console.log();
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log();

    const result = response.data;

    console.log(`📥 Guests Imported: ${result.imported}`);
    console.log(`👥 Total Guests: ${result.totalGuests}`);
    console.log(`🎯 Groups Generated: ${result.groupsGenerated}`);
    console.log();

    console.log('📊 Distribution Summary:');
    console.log(`  Restaurants: ${result.distribution.summary.totalRestaurants}`);
    console.log(`  Tables: ${result.distribution.summary.totalTables}`);
    console.log(`  Guests Assigned: ${result.distribution.summary.totalGuests}`);
    console.log(`  Unassigned: ${result.distribution.summary.unassignedGuests}`);
    console.log();

    console.log('🏢 Restaurant Assignments:');
    result.distribution.restaurants.forEach((r, i) => {
      console.log();
      console.log(`  ${i + 1}. ${r.restaurant.name}`);
      console.log(`     Total Guests: ${r.totalGuests}`);
      console.log(`     Tables: ${r.tables.length}`);
      r.tables.forEach((table) => {
        console.log(`       - Table ${table.tableNumber} (${table.assignments.length} guests)`);
        table.assignments.forEach((assignment) => {
          console.log(`          • ${assignment.guestName} (Seat ${assignment.seatNumber})`);
        });
      });
    });

    console.log();
    console.log('='.repeat(60));
    console.log(result.message);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('1. First, log in as admin to get your auth token:');
console.log(`   POST ${BASE_URL}/auth/login`);
console.log('   Body: { "email": "admin@enqoy.com", "password": "your_password" }');
console.log();
console.log('2. Copy the "access_token" from the response');
console.log('3. Replace ADMIN_TOKEN in this script with your token');
console.log('4. Run: node test-complete-pairing.js');
console.log();
console.log('OR use the API directly:');
console.log(`   POST ${BASE_URL}/pairing/events/${EVENT_ID}/complete-pairing`);
console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }');
console.log('   Body: See requestBody above');
console.log();

// Only run if token is provided
if (ADMIN_TOKEN !== 'YOUR_ADMIN_TOKEN_HERE') {
  testCompletePairing();
} else {
  console.log('⚠️  Please set your ADMIN_TOKEN first!');
}
