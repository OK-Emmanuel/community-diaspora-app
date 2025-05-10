import { supabase } from './supabase';
import type {
  Member,
  NonFinancialMember,
  Post,
  Comment,
  Announcement,
  Event,
  EventRegistration,
  Contribution,
} from '@/types/database';
import { createNotification } from './notifications';

// Members API
export const membersApi = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getDependents(userId: string) {
    const { data, error } = await supabase
      .from('non_financial_members')
      .select('*')
      .eq('member_id', userId);
    
    if (error) throw error;
    return data;
  },

  async addDependent(dependent: Omit<NonFinancialMember, 'id' | 'created_at' | 'updated_at' | 'community_id'>) {
    // The community_id will be set by a database trigger ('auto_set_dependent_community_id_from_parent')
    const { data, error } = await supabase
      .from('non_financial_members')
      .insert([dependent])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Posts API
export const postsApi = {
  async getPosts(page = 1, limit = 10, userId?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // First get the user's community_id if userId is provided
    let communityId = null;
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('members')
        .select('community_id')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      communityId = userData?.community_id;
    }

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:members(id, first_name, last_name, profile_image_url)
      `)
      .order('created_at', { ascending: false });
    
    // Filter by community if we have a community ID
    if (communityId) {
      query = query.eq('community_id', communityId);
    }
    
    // Apply pagination
    query = query.range(from, to);
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  async createPost(post: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'community_id'>) {
    // The community_id will be set by a database trigger ('auto_set_post_community_id_from_author')
    // if not provided or if provided as null.
    // The RLS policies and another trigger ('enforce_community_match_trigger') will ensure consistency.
    const { data, error } = await supabase
      .from('posts')
      .insert([post]) // Send the post object directly; community_id is handled by DB
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async likePost(postId: string, likesCount: number, actorId: string) {
    const { error } = await supabase
      .from('posts')
      .update({ likes_count: likesCount })
      .eq('id', postId);

    const { data: post } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', postId)
      .single();

    if (post && post.author_id !== actorId) {
      await createNotification({
        member_id: post.author_id,
        title: 'New Like on Your Post',
        content: 'Someone liked your post: ' + post.title,
        type: 'like',
        link: `/feed/post/${postId}`,
      });
    }
    return { error };
  },

  async getComments(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:members(id, first_name, last_name, profile_image_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addComment(comment: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'community_id'>, actorId: string) {
    // The community_id will be set by a database trigger ('auto_set_comment_community_id_from_post')
    const { data, error } = await supabase
      .from('comments')
      .insert([comment])
      .select()
      .single();

    const { data: post } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', comment.post_id)
      .single();

    if (post && post.author_id !== actorId) {
      await createNotification({
        member_id: post.author_id,
        title: 'New Comment on Your Post',
        content: 'Someone commented on your post: ' + post.title,
        type: 'comment',
        link: `/feed/post/${comment.post_id}`,
      });
    }

    if (comment.parent_comment_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', comment.parent_comment_id)
        .single();
      if (
        parentComment &&
        parentComment.author_id !== actorId &&
        (!post || parentComment.author_id !== post.author_id)
      ) {
        await createNotification({
          member_id: parentComment.author_id,
          title: 'Reply to Your Comment',
          content: 'Someone replied to your comment.',
          type: 'reply',
          link: `/feed/post/${comment.post_id}`,
        });
      }
    }
    if (error) throw error;
    return data;
  }
};

// Announcements API
export const announcementsApi = {
  async getAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:members(id, first_name, last_name, profile_image_url)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at' | 'community_id'>) {
    // The community_id will be set by a database trigger ('auto_set_announcement_community_id_from_author')
    // or should be explicitly NULL for global announcements by superadmins.
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Events API
export const eventsApi = {
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async registerForEvent(registration: Omit<EventRegistration, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('event_registrations')
      .insert([registration])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Contributions API
export const contributionsApi = {
  async getContributions(memberId: string) {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('member_id', memberId)
      .order('due_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async recordContribution(contribution: Omit<Contribution, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('contributions')
      .insert([contribution])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Admin API
export const adminApi = {
  async getAllMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*, non_financial_members(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateMemberStatus(memberId: string, status: Member['status']) {
    const { data, error } = await supabase
      .from('members')
      .update({ status })
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMemberRole(memberId: string, role: Member['role']) {
    const { data, error } = await supabase
      .from('members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAllCommunities() {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  async createCommunity(communityData: { name: string; logo_url?: string; favicon_url?: string }) {
    const { data, error } = await supabase
      .from('communities')
      .insert([communityData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateCommunity(communityId: string, communityData: { name: string; logo_url?: string; favicon_url?: string }) {
    const { data, error } = await supabase
      .from('communities')
      .update(communityData)
      .eq('id', communityId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async generateCommunityInvite(communityId: string, userId: string) {
    try {
      // First try using the RPC function
      const { data, error } = await supabase
        .rpc('generate_community_invite', {
          community_id_param: communityId, 
          user_id_param: userId
        });
      
      if (error) {
        console.warn("RPC function generate_community_invite failed:", error.message);
        throw error; // Let the catch block handle it
      }
      
      return data.invite_token;
    } catch (error) {
      console.log("Falling back to direct API call for invite generation");
      
      // If RPC is not available, try direct API call
      const response = await fetch('/api/community/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, community_id: communityId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invite');
      }
      
      const responseData = await response.json();
      return responseData.invite_token;
    }
  },
  
  async getMembersByCommunity(communityId: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*, non_financial_members(*)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addMember(member: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
    status: string;
    community_id: string;
  }) {
    // Get the current session to include auth headers
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Include Authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const res = await fetch('/api/member', {
      method: 'POST',
      headers,
      body: JSON.stringify(member),
      credentials: 'include',
      cache: 'no-cache',
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add member');
    return data;
  }
};

// Notifications API
export const notificationsApi = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('member_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('member_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return data;
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
}; 