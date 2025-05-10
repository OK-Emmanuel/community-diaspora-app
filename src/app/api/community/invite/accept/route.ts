import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

export async function POST(req: NextRequest) {
  // Get user ID from auth 
  const userId = await extractUserId(req);
  // We still allow a userId to be passed for cases that might need it
  const { invite_token, userId: providedUserId } = await req.json();
  
  // Use provided userId or fall back to extracted userId
  const effectiveUserId = providedUserId || userId;
  
  if (!invite_token) {
    return NextResponse.json({ error: 'Missing invite_token' }, { status: 400 });
  }
  
  if (!effectiveUserId) {
    return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 });
  }

  // Validate invite
  const { data: invite, error: inviteError } = await supabase
    .from('community_invites')
    .select('*')
    .eq('invite_token', invite_token)
    .eq('used', false)
    .single();
  if (inviteError || !invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });

  // Update member's community_id
  const { error: updateError } = await supabase
    .from('members')
    .update({ community_id: invite.community_id })
    .eq('id', effectiveUserId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Mark invite as used
  await supabase
    .from('community_invites')
    .update({ used: true })
    .eq('id', invite.id);

  return NextResponse.json({ success: true, community_id: invite.community_id });
} 