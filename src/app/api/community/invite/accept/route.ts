import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { invite_token, userId } = await req.json();
  if (!invite_token || !userId) return NextResponse.json({ error: 'Missing invite_token or userId' }, { status: 400 });

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
    .eq('id', userId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Mark invite as used
  await supabase
    .from('community_invites')
    .update({ used: true })
    .eq('id', invite.id);

  return NextResponse.json({ success: true, community_id: invite.community_id });
} 