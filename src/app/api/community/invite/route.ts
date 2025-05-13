import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Create a direct supabase client using environment variables
function getSupabaseClient(authToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const options = authToken ? {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  } : undefined;
  
  return createClient(supabaseUrl, supabaseKey, options);
}

// Extract user ID from request
async function extractUserId(req: NextRequest): Promise<{ userId: string | null, authToken: string | null }> {
  // Try to get userId from authorization header
  const authHeader = req.headers.get('authorization');
  let authToken = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authToken = authHeader.substring(7);
    try {
      const supabase = getSupabaseClient(authToken);
      const { data: userData, error } = await supabase.auth.getUser(authToken);
      if (!error && userData?.user?.id) {
        return { userId: userData.user.id, authToken };
      }
    } catch (e) {
      console.error('Error extracting user ID from token:', e);
    }
  }
  
  // Try to get userId from cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  // Try different possible cookie names
  let supabaseAuthCookie = cookieStore.get('sb-auth-token')?.value;
  
  // Alternative cookie approaches
  if (!supabaseAuthCookie) {
    // Try alternative cookie formats
    const sbCookie = allCookies.find(c => 
      c.name.startsWith('sb-') && c.name.includes('auth')
    );
    
    if (sbCookie) {
      supabaseAuthCookie = sbCookie.value;
    }
  }
  
  if (supabaseAuthCookie) {
    try {
      let session;
      try {
        session = JSON.parse(supabaseAuthCookie);
      } catch (e) {
        // Not JSON, might be the access token directly
        authToken = supabaseAuthCookie;
        const supabase = getSupabaseClient(authToken);
        const { data, error } = await supabase.auth.getUser(authToken);
        if (!error && data?.user) {
          return { userId: data.user.id, authToken };
        }
      }
      
      if (session?.user?.id) {
        if (session.access_token) {
          authToken = session.access_token;
        }
        return { userId: session.user.id, authToken };
      }
    } catch (e) {
      console.error('Failed to parse auth cookie:', e);
    }
  }
  
  return { userId: null, authToken: null };
}

// Check if user is admin or superadmin
async function isAdminOrSuperAdmin(userId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('members')
      .select('role')
      .eq('id', userId)
      .single();
    
    return data?.role === 'admin' || data?.role === 'superadmin';
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}

// POST: Create invite using a simple approach that works regardless of RLS
export async function POST(req: NextRequest) {
  console.log('POST invite API called');
  
  try {
    // Extract user ID from the request
    const { userId, authToken } = await extractUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const community_id = body.community_id;
    console.log('Creating invite for community:', community_id);
    
    if (!community_id) {
      return NextResponse.json({ error: 'Missing community_id' }, { status: 400 });
    }

    // Admin check
    if (!await isAdminOrSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate a UUID for the invite token
    const invite_token = uuidv4();
    console.log('Generated invite token:', invite_token);
    // 1. Try using supabase with auth token if available
    const supabase = getSupabaseClient(authToken || '');
    
    // Insert the invite record
    const { data, error } = await supabase
      .from('community_invites')
      .insert([{ 
        community_id, 
        invite_token, 
        created_by: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }])
      .select()
      .single();
    
    console.log('Supabase insert response:', { data, error });
    
    if (error) {
      console.error('Failed to create invite:', error);
      return NextResponse.json({ 
        error: error.message,
        invite_token // Include token even on error for testing
      }, { status: 400 });
    }
    
    if (!data) {
      console.error('No data returned from invite creation');
      return NextResponse.json({ 
        error: 'Failed to create invite, but token was generated',
        invite_token, // Include token for recovery
        community_id 
      }, { status: 500 });
    }
    
    // Verify the token was created correctly by trying to fetch it
    const { data: verifyData, error: verifyError } = await supabase
      .from('community_invites')
      .select('*')
      .eq('invite_token', invite_token)
      .single();
      
    console.log('Verification check:', { verifyData, verifyError });
    
    // Return the created invite data with a 201 status (Created)
    return NextResponse.json({
      ...data,
      verified: verifyError ? false : true
    }, { status: 201 });
  } catch (err) {
    console.error('Exception creating invite:', err);
    return NextResponse.json({ error: 'Server error creating invite' }, { status: 500 });
  }
}

// GET: Validate invite using a direct approach
export async function GET(req: NextRequest) {
  console.log('GET invite API called with URL:', req.url);
  const url = new URL(req.url);
  const invite_token = url.searchParams.get('invite_token');
  
  console.log('Extracted invite_token:', invite_token);
  
  if (!invite_token) {
    console.log('Missing invite_token parameter');
    return NextResponse.json({ error: 'Missing invite_token' }, { status: 400 });
  }
  
  try {
    // Use a fresh supabase client without RLS restrictions for this public operation
    const supabase = getSupabaseClient();
    
    // Try an exact match first
    const { data, error } = await supabase
      .from('community_invites')
      .select('*')
      .eq('invite_token', invite_token)
      .single();
    
    console.log('Supabase exact match response:', { data, error });
    
    if (data) {
      return NextResponse.json(data);
    }
    
    // Try a case-insensitive search as a fallback
    const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
      .from('community_invites')
      .select('*')
      .ilike('invite_token', invite_token)
      .limit(1);
      
    console.log('Case-insensitive search response:', {
      data: caseInsensitiveData,
      error: caseInsensitiveError
    });
    
    if (caseInsensitiveData && caseInsensitiveData.length > 0) {
      return NextResponse.json(caseInsensitiveData[0]);
    }
    
    // If we still can't find it, try a raw SQL query to bypass RLS
    // (Note: This requires a service role key or admin privileges)
    try {
      const { data: rawData, error: rawError } = await supabase.rpc(
        'admin_get_invite_by_token',
        { token_param: invite_token }
      );
      
      console.log('Raw query response:', { rawData, rawError });
      
      if (!rawError && rawData) {
        return NextResponse.json(rawData);
      }
    } catch (e) {
      console.error('Raw query failed:', e);
      // Continue to next approach
    }
    
    // Last resort: Test if the table is accessible and has data
    const { count, error: countError } = await supabase
      .from('community_invites')
      .select('*', { count: 'exact', head: true });
      
    console.log('Table access check:', { count, error: countError });
    
    if (countError) {
      console.error('Could not access community_invites table:', countError.message);
    } else if (count === 0) {
      console.log('community_invites table is empty');
    }
    
    // No invite found after all attempts
    console.log('Invalid or expired invite');
    return NextResponse.json({ 
      error: 'Invalid or expired invite', 
      tried_token: invite_token 
    }, { status: 404 });
  } catch (err) {
    console.error('Error processing invite:', err);
    return NextResponse.json({ error: 'Server error processing invite' }, { status: 500 });
  }
} 