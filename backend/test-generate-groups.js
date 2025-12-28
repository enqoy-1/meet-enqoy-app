const axios = require('axios');

async function testGenerateGroups() {
  try {
    console.log('Testing generate groups endpoint...');
    const response = await axios.post(
      'http://localhost:3000/api/pairing/events/cmjo0z1o30003jiug3fmc0sj0/generate-groups',
      {
        groupSize: 6,
        useAI: true,
        allowConstraintRelaxation: true
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE'  // You may need to add a valid token
        }
      }
    );

    console.log('Success! Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testGenerateGroups();
