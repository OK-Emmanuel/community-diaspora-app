import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Ensure these are set in your environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize Supabase client with service role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface NotificationPayload {
  member_id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NotificationPayload;

    // Basic validation (add more as needed)
    if (!payload.member_id || !payload.title || !payload.content || !payload.type) {
      return NextResponse.json({ error: 'Missing required notification fields' }, { status: 400 });
    }

    // Potentially, add more validation/sanitization here.
    // E.g., check if member_id exists, check length of title/content, validate 'type'.

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([
        {
          member_id: payload.member_id,
          title: payload.title,
          content: payload.content,
          type: payload.type,
          link: payload.link,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification (admin client):', error);
      return NextResponse.json({ error: error.message || 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error('Error in /api/notifications/create:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
} 