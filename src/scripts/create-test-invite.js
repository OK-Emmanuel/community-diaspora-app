#!/usr/bin/env node

/**
 * Simple script to create a test invite directly using the API
 * Run with: node create-test-invite.js
 */

// Use fetch to make a direct API call
async function createTestInvite() {
  try {
    // Get community ID from command line or use a default
    const communityId = process.argv[2] || '00000000-0000-0000-0000-000000000000';
    
    // Call the API
    console.log(`Creating test invite for community: ${communityId}`);
    const response = await fetch('http://localhost:3000/api/community/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        community_id: communityId
      })
    });
    
    // Get the response
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.invite_token) {
      const registerUrl = `http://localhost:3000/register?invite=${data.invite_token}`;
      console.log('\nTest registration URL:');
      console.log(registerUrl);
      
      // Try to verify the token
      console.log('\nVerifying token...');
      const verifyResponse = await fetch(`http://localhost:3000/api/community/invite?invite_token=${data.invite_token}`);
      const verifyData = await verifyResponse.json();
      console.log('Verification response:', verifyData);
      
      if (verifyResponse.ok) {
        console.log('\n✅ SUCCESS: Invite system is working correctly!');
      } else {
        console.log('\n❌ ERROR: Invite system is not working correctly.');
        console.log('The token was created but cannot be verified.');
      }
    } else {
      console.log('\n❌ ERROR: Failed to create invite token.');
    }
  } catch (error) {
    console.error('Error creating test invite:', error);
  }
}

createTestInvite(); 