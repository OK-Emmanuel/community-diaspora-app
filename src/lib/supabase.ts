import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// For debugging - log the API key to ensure it's loaded
console.log('Supabase initialized with URL:', supabaseUrl);
console.log('API key available:', supabaseAnonKey ? 'Yes (length:' + supabaseAnonKey.length + ')' : 'No');

// Configure the Supabase client with proper headers and options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
});

// Export a direct fetch function that ensures API key is included
export async function fetchWithApiKey(endpoint: string, options: RequestInit = {}) {
  // Create a strong-typed headers object for TypeScript
  const headers = new Headers(options.headers);
  
  // Set required headers for Supabase
  headers.set('apikey', supabaseAnonKey);
  headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  // Prepend supabaseUrl if endpoint doesn't include it
  const url = endpoint.startsWith('http') ? endpoint : `${supabaseUrl}${endpoint}`;

  // Perform the fetch with proper headers
  return fetch(url, {
    ...options,
    headers,
  });
} 