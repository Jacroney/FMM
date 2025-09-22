import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase configuration...\n');

// Check URL
if (!url) {
  console.log('❌ VITE_SUPABASE_URL is not set');
} else {
  console.log('✅ VITE_SUPABASE_URL is set');

  // Validate URL format
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      console.log('✅ URL format is valid:', urlObj.protocol + '//' + urlObj.host);
    } else {
      console.log('❌ URL must use HTTP or HTTPS protocol');
    }
  } catch (e) {
    console.log('❌ URL format is invalid. Make sure it starts with https://');
    console.log('   Example: https://your-project.supabase.co');
  }
}

// Check Anon Key
if (!key) {
  console.log('❌ VITE_SUPABASE_ANON_KEY is not set');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY is set');
  console.log(`   Key length: ${key.length} characters`);
}

console.log('\nTips:');
console.log('- Make sure the URL starts with https://');
console.log('- Remove any quotes around the values in the .env file');
console.log('- Example format:');
console.log('  VITE_SUPABASE_URL=https://abcdefgh.supabase.co');
console.log('  VITE_SUPABASE_ANON_KEY=eyJhbGc...');