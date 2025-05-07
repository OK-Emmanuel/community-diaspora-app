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