import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
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
  
  // Try different possible cookie names
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

// POST: Create invite
export async function POST(req: NextRequest) {
  // Extract user ID from the request
  const userId = await extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { community_id } = await req.json();
  if (!community_id) {
    return NextResponse.json({ error: 'Missing community_id' }, { status: 400 });
  }

  if (!await isAdminOrSuperAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const invite_token = uuidv4();
  const { data, error } = await supabase.from('community_invites').insert([
    { community_id, invite_token }
  ]).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// GET: Validate invite
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const invite_token = searchParams.get('invite_token');
  if (!invite_token) return NextResponse.json({ error: 'Missing invite_token' }, { status: 400 });
  const { data, error } = await supabase.from('community_invites').select('*').eq('invite_token', invite_token).single();
  if (error || !data) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  return NextResponse.json(data);
} 