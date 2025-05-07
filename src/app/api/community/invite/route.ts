import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Helper to check if user is admin or superadmin
async function isAdminOrSuperAdmin(userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin' || data?.role === 'superadmin';
}

// POST: Create invite
export async function POST(req: NextRequest) {
  const { userId, community_id } = await req.json();
  if (!await isAdminOrSuperAdmin(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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