// Test script for send-dues-invitation Edge Function
// Run with: node test-email-function.js

const SUPABASE_URL = 'https://ffgeptjhhhifuuhjlsow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2VwdGpoaGhpZnV1aGpsc293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNTgxMDMsImV4cCI6MjA3MTgzNDEwM30.o_N4zok307wsX5WSO1nTPZ3fsgvxgcKSahyp0yLI-jc';

// You need to replace this with an actual access token from your session
const ACCESS_TOKEN = 'REPLACE_WITH_YOUR_ACCESS_TOKEN';

const testData = {
  dues_id: 'REPLACE_WITH_ACTUAL_DUES_ID',
  email: 'test@example.com',
  invitation_token: 'REPLACE_WITH_ACTUAL_TOKEN'
};

async function testEmailFunction() {
  try {
    console.log('Testing send-dues-invitation function...');
    console.log('URL:', `${SUPABASE_URL}/functions/v1/send-dues-invitation`);
    console.log('Request body:', testData);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-dues-invitation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      }
    );

    console.log('\n=== Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Success!');
      try {
        const json = JSON.parse(responseText);
        console.log('Parsed response:', json);
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    } else {
      console.log('\n❌ Error!');
      try {
        const json = JSON.parse(responseText);
        console.log('Error details:', json);
      } catch (e) {
        console.log('Could not parse error as JSON');
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

testEmailFunction();
