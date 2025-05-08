import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(req: NextRequest) {
  // List communities: superadmin sees all, admin sees only their own
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
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
  const { userId, name, logo_url, favicon_url } = await req.json();
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
  // Update a community (superadmin or admin for their own)
  const { userId, id, ...fields } = await req.json();
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
  // Delete a community (superadmin or admin for their own)
  const { userId, id } = await req.json();
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