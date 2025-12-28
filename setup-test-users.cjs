const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

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
  try {
    const response = await axios.post(`${BASE_URL}/auth/admin/login`, {
      email: 'admin@enqoy.com',
      password: 'admin123'
    });
    console.log('Admin token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get admin token:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    throw error;
  }
}

async function createEvent(token) {
  console.log('\nCreating test event...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const response = await axios.post(
    `${BASE_URL}/events`,
    {
      title: 'Test Pairing Event',
      description: 'Test event for pairing functionality',
      eventType: 'dinner',
      startTime: tomorrow.toISOString(),
      price: '1',
      capacity: 10,
      isVisible: true
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  console.log(`Event created: ${response.data.id}`);
  return response.data;
}

async function registerUser(email) {
  console.log(`Registering user: ${email}`);
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: email,
      password: 'Test123!@#'
    });
    console.log(`✓ User registered: ${email}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`✓ User already exists: ${email}`);
      // Login to get token
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: email,
        password: 'Test123!@#'
      });
      return loginResponse.data;
    }
    throw error;
  }
}

async function completeProfile(userToken, email) {
  console.log(`Completing profile for: ${email}`);
  const firstName = email.split('@')[0];
  try {
    await axios.post(
      `${BASE_URL}/users/profile`,
      {
        firstName: firstName,
        lastName: 'Test',
        phone: '0911223344',
        age: 25 + Math.floor(Math.random() * 20),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        city: 'Addis Ababa'
      },
      {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    );
    console.log(`✓ Profile completed: ${email}`);
  } catch (error) {
    console.log(`Profile may already exist: ${email}`);
  }
}

async function completeAssessment(userToken, email) {
  console.log(`Completing assessment for: ${email}`);
  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  try {
    await axios.post(
      `${BASE_URL}/assessments`,
      {
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
      },
      {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    );
    console.log(`✓ Assessment completed: ${email}`);
  } catch (error) {
    console.log(`Assessment may already exist: ${email}`);
  }
}

async function createBooking(userToken, eventId, email) {
  console.log(`Creating booking for: ${email}`);
  try {
    const response = await axios.post(
      `${BASE_URL}/bookings`,
      {
        eventId: eventId,
        useCredit: false
      },
      {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    );
    console.log(`✓ Booking created: ${email}`);
    return response.data;
  } catch (error) {
    console.log(`Booking may already exist: ${email}`);
    return null;
  }
}

async function confirmBooking(adminToken, bookingId) {
  if (!bookingId) return;
  console.log(`Confirming booking: ${bookingId}`);
  try {
    await axios.patch(
      `${BASE_URL}/bookings/${bookingId}/confirm`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log(`✓ Booking confirmed: ${bookingId}`);
  } catch (error) {
    console.log(`Error confirming booking: ${error.message}`);
  }
}

async function main() {
  try {
    // Get admin token
    const adminToken = await getAdminToken();

    // Create event
    const event = await createEvent(adminToken);

    console.log('\n=== Setting up users ===\n');

    // Register and setup each user
    for (const email of testEmails) {
      console.log(`\n--- Processing ${email} ---`);

      // Register user
      const userData = await registerUser(email);
      const userToken = userData.access_token;

      // Complete profile
      await completeProfile(userToken, email);

      // Complete assessment
      await completeAssessment(userToken, email);

      // Create booking
      const booking = await createBooking(userToken, event.id, email);

      // Confirm booking as admin
      if (booking) {
        await confirmBooking(adminToken, booking.id);
      }

      console.log(`✓ ${email} setup complete\n`);
    }

    console.log('\n=== SETUP COMPLETE ===');
    console.log(`Event ID: ${event.id}`);
    console.log(`Event Title: ${event.title}`);
    console.log(`Event Price: ${event.price} ETB`);
    console.log(`Total Users: ${testEmails.length}`);
    console.log('\nYou can now test the pairing process!');
    console.log(`View event at: http://localhost:8080/admin/events/${event.id}`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
