import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Mark the route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Initialize Supabase client with server-side auth
export async function GET(request: NextRequest) {
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Debug logging
    console.log('API route environment check:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Available' : 'Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Available' : 'Missing')
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Available' : 'Missing')

    // Choose the appropriate key (prefer service role, fall back to anon key)
    const apiKey = supabaseServiceKey || supabaseAnonKey

    // Validate environment variables
    if (!supabaseUrl || !apiKey) {
      console.error('Missing required Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create authenticated Supabase client
    const supabase = createClient(supabaseUrl, apiKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the user's session from cookies or authorization header
    const cookieStore = cookies()
    
    // Try different possible cookie names (Supabase can use different formats)
    let supabaseAuthCookie = cookieStore.get('sb-auth-token')?.value
    
    if (!supabaseAuthCookie) {
      // Try alternative cookie formats
      const allCookies = cookieStore.getAll()
      console.log('Available cookies:', allCookies.map(c => c.name).join(', '))
      
      // Look for any Supabase auth cookie
      const sbCookie = allCookies.find(c => 
        c.name.startsWith('sb-') && c.name.includes('auth')
      )
      
      if (sbCookie) {
        supabaseAuthCookie = sbCookie.value
        console.log('Found alternative Supabase auth cookie:', sbCookie.name)
      }
    }

    if (!supabaseAuthCookie) {
      // Read auth info from request headers as last resort
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log('Using Authorization header token instead of cookie')
        
        // We can't parse the token directly, but we can try to validate it
        const { data: userData, error: tokenError } = await supabase.auth.getUser(token)
        
        if (tokenError || !userData.user) {
          return NextResponse.json(
            { error: 'Invalid authorization token' },
            { status: 401 }
          )
        }
        
        // If we get here, there's a valid user - proceed with that user ID
        const userId = userData.user.id
        console.log('Found user ID from token:', userId)
        
        // Query the members table
        const { data: member, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
          
        if (error) {
          console.error('Error fetching member:', error)
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        }
        
        if (member) {
          return NextResponse.json(member)
        }
        
        // If no member found, create one based on auth data
        const { data: newMember, error: insertError } = await supabase
          .from('members')
          .insert({
            id: userId,
            email: userData.user.email,
            first_name: userData.user.user_metadata?.first_name || 'New',
            last_name: userData.user.user_metadata?.last_name || 'User',
            role: userData.user.user_metadata?.role || 'financial',
            status: 'active'
          })
          .select()
          .single()
          
        if (insertError) {
          console.error('Error creating member:', insertError)
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          )
        }
        
        return NextResponse.json(newMember)
      }
      
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse the JSON cookie value
    let session
    try {
      session = JSON.parse(supabaseAuthCookie)
    } catch (e) {
      console.error('Failed to parse auth cookie:', e)
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Extract user ID
    const userId = session.user?.id
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      )
    }

    // Check if admin or superadmin and if query param 'all' is set
    const isUserAdminOrSuper = await isAdminOrSuperAdmin(supabase, userId);
    const url = new URL(request.url);
    const listAll = url.searchParams.get('all') === 'true';

    if (isUserAdminOrSuper && listAll) {
      // Admin or superadmin can list all members
      const { data, error } = await supabase.from('members').select('*');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    // Otherwise, only return members in the same community
    const { data: self, error: selfError } = await supabase
      .from('members')
      .select('community_id')
      .eq('id', userId)
      .single();
    if (selfError || !self?.community_id) {
      return NextResponse.json({ error: 'Community not found for user' }, { status: 403 });
    }
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('community_id', self.community_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error('Unexpected error in /api/member route:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper to check if user is admin or superadmin
async function isAdminOrSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin' || data?.role === 'superadmin';
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = supabaseServiceKey || supabaseAnonKey;
    
    console.log('API environment check:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Available' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Available' : 'Missing');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Available' : 'Missing');
    
    if (!supabaseUrl || !apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, apiKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Get all cookies for debugging
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log('Available cookies:', allCookies.map(c => c.name).join(', '));
    
    // Try to get the auth cookie
    let supabaseAuthCookie = cookieStore.get('sb-auth-token')?.value;
    if (!supabaseAuthCookie) {
      // Try alternative cookie formats
      const sbCookie = allCookies.find(c => 
        c.name.startsWith('sb-') && c.name.includes('auth')
      );
      
      if (sbCookie) {
        supabaseAuthCookie = sbCookie.value;
        console.log('Found alternative Supabase auth cookie:', sbCookie.name);
      } else {
        console.log('No Supabase auth cookie found in request');
      }
    }
    
    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header present:', !!authHeader);
    
    let userId: string | undefined;
    let userRole: string | undefined;
    let userCommunityId: string | undefined;
    
    // Try to authenticate with Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Using Authorization header token');
      
      try {
        const { data: userData, error: tokenError } = await supabase.auth.getUser(token);
        
        if (tokenError) {
          console.error('Token validation error:', tokenError.message);
          return NextResponse.json({ error: `Invalid token: ${tokenError.message}` }, { status: 401 });
        }
        
        if (!userData.user) {
          return NextResponse.json({ error: 'No user found for token' }, { status: 401 });
        }
        
        userId = userData.user.id;
        console.log('Authenticated via token, user ID:', userId);
      } catch (e) {
        console.error('Token validation exception:', e);
        return NextResponse.json({ error: `Token validation failed: ${e}` }, { status: 401 });
      }
    }
    // Try to authenticate with cookie
    else if (supabaseAuthCookie) {
      try {
        let session = JSON.parse(supabaseAuthCookie);
        userId = session.user?.id;
        
        if (!userId) {
          console.error('No user ID in parsed session cookie');
          return NextResponse.json({ error: 'Invalid session: No user ID found' }, { status: 401 });
        }
        
        console.log('Authenticated via cookie, user ID:', userId);
      } catch (e) {
        console.error('Failed to parse auth cookie:', e);
        return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
      }
    } 
    // No authentication found
    else {
      console.error('No authentication method found in request');
      return NextResponse.json({ 
        error: 'Not authenticated: No valid authentication method found in request',
        checkAuth: true
      }, { status: 401 });
    }
    
    // Make sure we have a user ID at this point
    if (!userId) {
      return NextResponse.json({ error: 'Authentication failed: No user ID' }, { status: 401 });
    }
    
    // Fetch user role and community_id
    const { data: userData, error: userError } = await supabase
      .from('members')
      .select('role, community_id')
      .eq('id', userId)
      .single();
    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }
    userRole = userData.role;
    userCommunityId = userData.community_id;
    // Parse request body
    const body = await request.json();
    const { first_name, last_name, email, password, role, status, community_id } = body;
    if (!first_name || !last_name || !email || !password || !role || !status || !community_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Permission check
    if (userRole === 'superadmin') {
      // Can add to any community
    } else if (userRole === 'admin') {
      if (community_id !== userCommunityId) {
        return NextResponse.json({ error: 'Admins can only add members to their own community' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // 1. Create user in Supabase Auth
      console.log('Creating new auth user with email:', email);
    
    // Try the admin.createUser method first (newer Supabase versions)
    let authUser;
    let authError;
    
    try {
      // Try the newer Supabase admin API first
      const result = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          role,
          community_id
        }
      });
      
      authUser = result.data;
      authError = result.error;
      
      console.log('Auth user creation result:', { 
        success: !!authUser?.user, 
        userId: authUser?.user?.id,
        error: authError?.message 
      });
    } catch (err) {
      console.error('Error creating auth user with admin.createUser:', err);
      
      // Fallback for older Supabase versions
      try {
        console.log('Trying alternative user creation method');
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name,
              last_name,
              role,
              community_id
            }
          }
        });
        
        authUser = result.data;
        authError = result.error;
        
        console.log('Alternative auth user creation result:', { 
          success: !!authUser?.user, 
          userId: authUser?.user?.id,
          error: authError?.message 
        });
      } catch (altErr) {
        console.error('Alternative user creation also failed:', altErr);
        authError = { message: 'Failed to create user: ' + (altErr as Error).message };
      }
    }
    
    if (authError || !authUser?.user) {
      return NextResponse.json({ 
        error: authError?.message || 'Failed to create user in auth',
        details: 'Error creating user in authentication system'
      }, { status: 500 });
    }
    // 2. Insert into members table
    const { data: newMember, error: insertError } = await supabase
      .from('members')
      .insert({
        id: authUser.user.id,
        first_name,
        last_name,
        email,
        role,
        status,
        community_id
      })
      .select()
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    // Remove password from response
    const { password: _, ...memberWithoutPassword } = newMember;
    return NextResponse.json(memberWithoutPassword, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 