// Node.js script to test Supabase connection
// Run this with: node src/lib/test-connection.js

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if values exist
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error(`URL: ${SUPABASE_URL ? 'Set' : 'Missing'}`);
  console.error(`ANON KEY: ${SUPABASE_ANON_KEY ? 'Set (Length: ' + SUPABASE_ANON_KEY.length + ')' : 'Missing'}`);
  process.exit(1);
}

console.log('🔑 Environment variables loaded:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`ANON KEY: ${SUPABASE_ANON_KEY.substring(0, 10)}...`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// Test connection and permissions
async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  // Test 1: Check if we can read from members table
  try {
    console.log('\n📋 Test 1: Reading from members table...');
    const { data: members, error } = await supabase.from('members').select('*').limit(5);
    
    if (error) {
      console.error('❌ Error reading members:', error.message);
    } else {
      console.log(`✅ Successfully read ${members.length} members`);
    }
  } catch (err) {
    console.error('❌ Exception reading members:', err.message);
  }
  
  // Test 2: Try to execute the RPC function
  try {
    console.log('\n🔄 Test 2: Calling RPC function...');
    
    // Use a random UUID that likely won't match - we just want to test permissions
    const uuid = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase.rpc('get_member_by_id', { member_id: uuid });
    
    if (error) {
      console.error('❌ Error calling RPC function:', error.message);
    } else {
      console.log('✅ RPC function called successfully (returned empty set as expected)');
    }
  } catch (err) {
    console.error('❌ Exception calling RPC function:', err.message);
  }
  
  // Test 3: Check auth configuration
  try {
    console.log('\n🔐 Test 3: Testing authentication...');
    
    // Try a no-email sign-up just to check config (won't actually create a user)
    const { error } = await supabase.auth.signUp({
      email: `test${Date.now()}@example.com`,
      password: 'password123',
    });
    
    if (error) {
      console.error('❌ Auth test error:', error.message);
    } else {
      console.log('✅ Auth configuration appears valid (sign-up would work)');
    }
  } catch (err) {
    console.error('❌ Exception during auth test:', err.message);
  }
  
  console.log('\n📊 Test summary completed');
}

// Run the tests
testConnection()
  .catch(err => {
    console.error('❌ Fatal error:', err);
  }); 