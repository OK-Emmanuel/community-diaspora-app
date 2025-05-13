import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Helper to check if user is admin or superadmin
async function isAdminOrSuperAdmin(userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin' || data?.role === 'superadmin';
}

// Helper to get user role and community_id
async function getUserRoleAndCommunity(userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('role, community_id')
    .eq('id', userId)
    .single();
  return data;
}

// Extract user ID from request
async function extractUserId(req: NextRequest): Promise<string | null> {
  // Try to get userId from authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (!error && userData?.user?.id) {
        return userData.user.id;
      }
    } catch (e) {
      console.error('Error extracting user ID from token:', e);
    }
  }
  
  // Try to get userId from cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  // Try different possible cookie names (Supabase can use different formats)
  let supabaseAuthCookie = cookieStore.get('sb-auth-token')?.value;
  
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
      const session = JSON.parse(supabaseAuthCookie);
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch (e) {
      console.error('Failed to parse auth cookie:', e);
    }
  }
  
  return null;
}

export async function GET(req: NextRequest) {
  // Check if a specific community ID is requested for public access
  const url = new URL(req.url);
  const communityId = url.searchParams.get('id');
  
  // If a community ID is provided, allow public access to fetch just that community
  if (communityId) {
    console.log(`Public request for community ID: ${communityId}`);
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  
  // Otherwise, require authentication for listing communities
  // Extract user ID from the request
  const userId = await extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // List communities: superadmin sees all, admin sees only their own
  const user = await getUserRoleAndCommunity(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 });
  
  if (user.role === 'superadmin') {
    const { data, error } = await supabase.from('communities').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else if (user.role === 'admin') {
    const { data, error } = await supabase.from('communities').select('*').eq('id', user.community_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  // Extract user ID from the request
  const userId = await extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name, logo_url, favicon_url } = await req.json();
  const access_token = req.cookies.get('sb-access-token')?.value; // or however you store it

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${access_token}` } } }
  );

  // Create a new community (superadmin or admin)
  const user = await getUserRoleAndCommunity(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 });
  if (user.role !== 'superadmin' && user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // Optionally, restrict admin to only one community (skip for now)
  const { data, error } = await supabase.from('communities').insert([{ name, logo_url, favicon_url }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  // Extract user ID from the request
  const userId = await extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Update a community (superadmin or admin for their own)
  const { id, ...fields } = await req.json();
  const user = await getUserRoleAndCommunity(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 });
  if (user.role === 'superadmin') {
    const { data, error } = await supabase.from('communities').update(fields).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } else if (user.role === 'admin' && user.community_id === id) {
    const { data, error } = await supabase.from('communities').update(fields).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  // Extract user ID from the request
  const userId = await extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Delete a community (superadmin or admin for their own)
  const { id } = await req.json();
  const user = await getUserRoleAndCommunity(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 });
  if (user.role === 'superadmin') {
    const { error } = await supabase.from('communities').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } else if (user.role === 'admin' && user.community_id === id) {
    const { error } = await supabase.from('communities').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
} 