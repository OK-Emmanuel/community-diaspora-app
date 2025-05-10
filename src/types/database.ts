export type UserRole = 'superadmin' | 'admin' | 'financial' | 'non_financial';
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type ContributionStatus = 'paid' | 'pending' | 'overdue';
export type AnnouncementType = 'general' | 'financial' | 'event' | 'emergency';

export interface Community {
  id: string;
  name: string;
  logo_url?: string;
  favicon_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommunityInvite {
  id: string;
  community_id: string;
  invite_token: string;
  expires_at?: Date;
  used: boolean;
  created_at: Date;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: MemberStatus;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: Date;
  occupation?: string;
  joined_date: Date;
  last_login?: Date;
  profile_image_url?: string;
  community_id?: string;
  is_community_admin?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NonFinancialMember {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth?: Date;
  status: MemberStatus;
  email?: string;
  auth_user_id?: string;
  upgrade_requested?: boolean;
  community_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  profile_image_url?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'member' | 'admin';
  financial_status: 'good_standing' | 'arrears' | 'exempt';
  membership_type: 'full' | 'associate' | 'honorary';
}

export interface Dependent {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
  community_id?: string;
}

export interface PostWithAuthor extends Post {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  user_has_liked?: boolean;
  is_pinned?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  community_id?: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
}

export interface Announcement {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  author_id: string;
  type: 'general' | 'financial' | 'event' | 'emergency';
  is_pinned: boolean;
  expires_at?: string | null;
  community_id?: string;
}

export interface AnnouncementWithAuthor extends Announcement {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
}

export interface Notification {
  id: string;
  member_id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: Date;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: Date;
  end_date?: Date;
  is_virtual: boolean;
  meeting_link?: string;
  max_participants?: number;
  created_at: Date;
  updated_at: Date;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string;
  status: string;
  created_at: Date;
}

export interface Contribution {
  id: string;
  member_id: string;
  amount: number;
  description?: string;
  due_date: Date;
  payment_date?: Date;
  status: ContributionStatus;
  payment_method?: string;
  transaction_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: Date;
  community_id?: string;
}

export interface Database {
  members: Member;
  non_financial_members: NonFinancialMember;
  posts: Post;
  comments: Comment;
  announcements: Announcement;
  notifications: Notification;
  events: Event;
  event_registrations: EventRegistration;
  contributions: Contribution;
  communities: Community;
  community_invites: CommunityInvite;
  likes: Like;
} 