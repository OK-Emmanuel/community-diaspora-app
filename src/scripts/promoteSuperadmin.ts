#!/usr/bin/env ts-node

import { supabase } from '../lib/supabase';

async function promoteToSuperadmin(email: string) {
  if (!email) {
    console.error('Usage: ts-node promoteSuperadmin.ts <email>');
    process.exit(1);
  }
  const { data, error } = await supabase
    .from('members')
    .update({ role: 'superadmin' })
    .eq('email', email)
    .select();
  if (error) {
    console.error('Error promoting user:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error('No user found with that email.');
    process.exit(1);
  }
  console.log(`User with email ${email} promoted to superadmin.`);
}

const email = process.argv[2];
promoteToSuperadmin(email); 