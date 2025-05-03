import { supabase } from './supabase';

interface CreateNotificationArgs {
  member_id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
}

export async function createNotification({ member_id, title, content, type, link }: CreateNotificationArgs) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        member_id,
        title,
        content,
        type,
        link,
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
} 