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
        author:members(first_name, last_name, profile_image_url)
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

  async getComments(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:members(first_name, last_name, profile_image_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addComment(comment: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'likes_count'>) {
    const { data, error } = await supabase
      .from('comments')
      .insert([comment])
      .select()
      .single();
    
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
        author:members(first_name, last_name)
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
  }
}; 