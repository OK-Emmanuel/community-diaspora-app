export type UserRole = 'admin' | 'financial' | 'non_financial';
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type ContributionStatus = 'paid' | 'pending' | 'overdue';
export type AnnouncementType = 'general' | 'financial' | 'event' | 'emergency';

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
  created_at: Date;
  updated_at: Date;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  is_pinned: boolean;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
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
} 