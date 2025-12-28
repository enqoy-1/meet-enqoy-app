const BASE_URL = 'http://localhost:3000/api';

const testEmails = [
  'oliyadbekele.0@gmail.com',
  'oliyadbekelehs@gmail.com',
  'oliweird13@gmail.com',
  'enqoy11@gmail.com',
  'mavuno.ai@gmail.com',
  'olidevp13@gmail.com',
  'patricklong1777@gmail.com',
  'steveloop.oli@gmail.com'
];

async function getAdminToken() {
  console.log('Getting admin token...');
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@enqoy.com',
      password: 'admin123'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to login: ${response.status} - ${text}`);
  }

  const data = await response.json();
  console.log('✓ Admin token obtained');
  return data.access_token;
}

async function createEvent(token) {
  console.log('\nCreating test event...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const response = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Test Pairing Event',
      description: 'Test event for pairing functionality',
      eventType: 'dinner',
      startTime: tomorrow.toISOString(),
      price: '1',
      capacity: 10,
      isVisible: true
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create event: ${response.status} - ${text}`);
  }

  const data = await response.json();
  console.log(`✓ Event created: ${data.id}`);
  return data;
}

async function registerUser(email) {
  console.log(`Registering: ${email}`);
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'Test123!@#'
    })
  });

  if (response.status === 409) {
    console.log(`  User exists, logging in...`);
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: 'Test123!@#'
      })
    });
    const data = await loginResponse.json();
    console.log(`  ✓ Logged in`);
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to register ${email}: ${response.status} - ${text}`);
  }

  const data = await response.json();
  console.log(`  ✓ Registered`);
  return data;
}

async function completeProfile(userToken, email) {
  const firstName = email.split('@')[0];
  const response = await fetch(`${BASE_URL}/users/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      firstName: firstName,
      lastName: 'Test',
      phone: '0911223344',
      age: 25 + Math.floor(Math.random() * 20),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      city: 'Addis Ababa'
    })
  });

  if (response.ok) {
    console.log(`  ✓ Profile completed`);
  } else {
    console.log(`  Profile already exists`);
  }
}

async function completeAssessment(userToken) {
  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const response = await fetch(`${BASE_URL}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      talkTopic: randomChoice(['Current events and world issues', 'Arts, entertainment, and pop culture', 'Personal growth and philosophy']),
      groupDynamic: randomChoice(['A mix of people with shared interests and similar personalities', 'A diverse group with different viewpoints and experiences']),
      dinnerVibe: randomChoice(['steering', 'sharing', 'observing', 'adapting']),
      humorType: randomChoice(['sarcastic', 'playful', 'witty', 'not_a_fan']),
      wardrobeStyle: randomChoice(['timeless', 'bold']),
      introvertScale: Math.floor(Math.random() * 5) + 1,
      aloneTimeScale: Math.floor(Math.random() * 5) + 1,
      familyScale: Math.floor(Math.random() * 5) + 1,
      spiritualityScale: Math.floor(Math.random() * 5) + 1,
      humorScale: Math.floor(Math.random() * 5) + 1,
      meetingPriority: randomChoice(['Shared values and interests', 'Fun and engaging conversations']),
      spending: randomChoice(['500-1000', '1000-1500']),
      gender: Math.random() > 0.5 ? 'male' : 'female'
    })
  });

  if (response.ok) {
    console.log(`  ✓ Assessment completed`);
  } else {
    console.log(`  Assessment already exists`);
  }
}

async function createBooking(userToken, eventId) {
  const response = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      eventId: eventId,
      useCredit: false
    })
  });

  if (!response.ok) {
    console.log(`  Booking may already exist`);
    return null;
  }

  const data = await response.json();
  console.log(`  ✓ Booking created: ${data.id}`);
  return data;
}

async function confirmBooking(adminToken, bookingId) {
  if (!bookingId) return;

  const response = await fetch(`${BASE_URL}/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({})
  });

  if (response.ok) {
    console.log(`  ✓ Booking confirmed`);
  }
}

async function main() {
  try {
    console.log('=== SETTING UP TEST USERS ===\n');

    // Get event ID from command line or prompt
    const eventId = process.argv[2];

    if (!eventId) {
      console.error('Please provide an event ID as an argument');
      console.error('Usage: node setup-users-fetch.mjs <eventId>');
      console.error('\nFirst, create an event in the admin panel at:');
      console.error('http://localhost:8080/admin/events');
      process.exit(1);
    }

    console.log(`Event ID: ${eventId}\n`);

    // Get admin token
    const adminToken = await getAdminToken();

    console.log('\n=== CREATING USERS AND BOOKINGS ===\n');

    // Setup each user
    for (const email of testEmails) {
      console.log(`\n${email}:`);

      const userData = await registerUser(email);
      const userToken = userData.access_token;

      await completeProfile(userToken, email);
      await completeAssessment(userToken);

      const booking = await createBooking(userToken, eventId);
      if (booking) {
        await confirmBooking(adminToken, booking.id);
      }
    }

    console.log('\n\n=== ✓ SETUP COMPLETE ===');
    console.log(`\nEvent ID: ${eventId}`);
    console.log(`Users created: ${testEmails.length}`);
    console.log(`\nView in admin: http://localhost:8080/admin/pairings/${eventId}`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

main();
