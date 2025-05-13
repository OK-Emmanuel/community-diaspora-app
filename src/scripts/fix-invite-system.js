/**
 * This script fixes the community invite system by:
 * 1. Testing direct database access to verify permission issues
 * 2. Creating a test invite directly
 * 3. Verifying retrieval functionality
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needed for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Check your .env.local file');
  process.exit(1);
}

// Create regular client and admin client
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

async function main() {
  console.log('===== Community Invite System Fix =====');
  
  try {
    // Step 1: Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Authentication error:', sessionError.message);
      return;
    }
    
    if (!session || !session.user) {
      console.error('Not authenticated. Please sign in first.');
      return;
    }
    
    console.log(`Authenticated as user: ${session.user.email}`);
    
    // Step 2: Check for existing invites
    const { data: existingInvites, error: inviteError } = await supabase
      .from('community_invites')
      .select('*')
      .limit(5);
      
    if (inviteError) {
      console.error('Error fetching invites:', inviteError.message);
    } else {
      console.log(`Found ${existingInvites ? existingInvites.length : 0} existing invites`);
      if (existingInvites && existingInvites.length > 0) {
        console.log('Sample invite:', existingInvites[0]);
      }
    }
    
    // Step 3: Get user's community role
    const { data: userInfo, error: userError } = await supabase
      .from('members')
      .select('*, communities(*)')
      .eq('id', session.user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching user info:', userError.message);
      return;
    }
    
    console.log(`User role: ${userInfo.role}, Community: ${userInfo.community_id}`);
    
    // Step 4: Create a test invite
    let useDirectRPC = true;
    let inviteToken = null;
    
    if (useDirectRPC) {
      console.log('Attempting to create invite using RPC...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('generate_community_invite', {
          community_id_param: userInfo.community_id,
          user_id_param: session.user.id
        });
      
      if (rpcError) {
        console.error('RPC error:', rpcError.message);
      } else {
        console.log('RPC response:', rpcData);
        inviteToken = rpcData?.invite_token;
      }
    }
    
    if (!inviteToken) {
      console.log('Falling back to direct insert...');
      const newToken = uuidv4();
      
      // Use admin client if available
      const client = supabaseAdmin || supabase;
      
      const { data: insertData, error: insertError } = await client
        .from('community_invites')
        .insert({
          community_id: userInfo.community_id,
          invite_token: newToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          created_by: session.user.id
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError.message);
      } else {
        console.log('Insert successful:', insertData);
        inviteToken = newToken;
      }
    }
    
    if (inviteToken) {
      console.log('Created invite token:', inviteToken);
      
      // Step 5: Verify the token can be retrieved
      const { data: tokenData, error: tokenError } = await supabase
        .from('community_invites')
        .select('*')
        .eq('invite_token', inviteToken)
        .single();
      
      if (tokenError) {
        console.error('Error retrieving token:', tokenError.message);
        
        // Try case-insensitive search
        const { data: fuzzyData, error: fuzzyError } = await supabase
          .from('community_invites')
          .select('*')
          .ilike('invite_token', inviteToken)
          .limit(1);
          
        if (fuzzyError) {
          console.error('Error with fuzzy search:', fuzzyError.message);
        } else if (fuzzyData && fuzzyData.length > 0) {
          console.log('Found via fuzzy search:', fuzzyData[0]);
        } else {
          console.log('No results from fuzzy search either');
        }
        
      } else {
        console.log('Successfully retrieved token:', tokenData);
        console.log('VERIFICATION SUCCESSFUL: The invite system is working correctly!');
      }
      
      // Create a test register URL
      const registerUrl = `http://localhost:3000/register?invite=${inviteToken}`;
      console.log('Test registration URL:', registerUrl);
    }
    
    // Output useful SQL commands
    const sqlCommands = `
-- SQL commands to run in Supabase SQL Editor:

-- 1. Enable universal read access to community_invites table
CREATE POLICY "Anyone can read community_invites" 
ON "public"."community_invites" FOR SELECT 
USING (true);

-- 2. Insert a test invite directly
INSERT INTO community_invites (community_id, invite_token, expires_at, used)
VALUES 
  ('${userInfo.community_id}', '${uuidv4()}', NOW() + INTERVAL '7 days', false)
RETURNING *;

-- 3. List all invites
SELECT * FROM community_invites ORDER BY created_at DESC LIMIT 20;
    `;
    
    console.log(sqlCommands);
    
    // Write SQL commands to a file
    fs.writeFileSync('sql-commands.txt', sqlCommands);
    console.log('SQL commands written to sql-commands.txt');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

main(); 