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

  async addDependent(dependent: Omit<NonFinancialMember, 'id' | 'created_at' | 'updated_at'>) {
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
  async getPosts(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:members(id, first_name, last_name, profile_image_url)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return data;
  },

  async createPost(post: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count'>) {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
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

  async addComment(comment: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'likes_count'>, actorId: string) {
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

  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) {
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