import { supabase } from './supabase';

interface CreateNotificationArgs {
  member_id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
}

export async function createNotification(notificationData: CreateNotificationArgs) {
  // This function now calls our backend API route
  // The backend API route will use the service_role key for insertion
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header needed here typically, as the API route is internal
        // or secured by other means (e.g. CORS, or if it checks for a specific secret header if exposed publicly).
        // For internal calls from your server-side (e.g., from other API routes or server components), it's often fine.
        // If called from client-side, this fetch itself doesn't bypass RLS for other tables,
        // but the /api/notifications/create route *does* use service_role for inserting notifications.
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create notification via API');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createNotification calling API:', error);
    // Decide how to handle this error. Re-throw, return null, etc.
    // For now, re-throwing to be consistent with the old direct Supabase call error handling.
    throw error;
  }
} 