-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for better data consistency
CREATE TYPE user_role AS ENUM ('admin', 'financial', 'non_financial');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE contribution_status AS ENUM ('paid', 'pending', 'overdue');
CREATE TYPE announcement_type AS ENUM ('general', 'financial', 'event', 'emergency');

-- Members table (extends Supabase auth.users)
CREATE TABLE members (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'financial',
    status member_status DEFAULT 'pending',
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    occupation VARCHAR(100),
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Non-financial members (dependents)
CREATE TABLE non_financial_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    status member_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Posts table for community feed
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id), -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type announcement_type DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT, -- Optional link to related content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_virtual BOOLEAN DEFAULT false,
    meeting_link TEXT,
    max_participants INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event Registrations
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, member_id)
);

-- Contributions/Dues
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    payment_date DATE,
    status contribution_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_notifications_member_read ON notifications(member_id, is_read);
CREATE INDEX idx_contributions_member_status ON contributions(member_id, status);

-- Set up Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_financial_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Members policies
CREATE POLICY "Members can view active members"
    ON members FOR SELECT
    USING (status != 'suspended');

CREATE POLICY "Members can update own profile"
    ON members FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "New users can create their profile"
    ON members FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Posts policies
CREATE POLICY "Anyone can view posts"
    ON posts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "Authors can update their posts"
    ON posts FOR UPDATE
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their posts"
    ON posts FOR DELETE
    USING (author_id = auth.uid());

-- Comments policies
CREATE POLICY "Anyone can view comments"
    ON comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create comments"
    ON comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "Authors can update their comments"
    ON comments FOR UPDATE
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Announcements policies
CREATE POLICY "Anyone can view announcements"
    ON announcements FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage announcements"
    ON announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (member_id = auth.uid());

CREATE POLICY "Users can insert their own notifications"
    ON notifications FOR INSERT
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (member_id = auth.uid())
    WITH CHECK (member_id = auth.uid());

-- Events policies
CREATE POLICY "Anyone can view events"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage events"
    ON events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Event registrations policies
CREATE POLICY "Users can view their registrations"
    ON event_registrations FOR SELECT
    USING (member_id = auth.uid());

CREATE POLICY "Users can register for events"
    ON event_registrations FOR INSERT
    WITH CHECK (member_id = auth.uid());

-- Contributions policies
CREATE POLICY "Users can view their contributions"
    ON contributions FOR SELECT
    USING (member_id = auth.uid());

CREATE POLICY "Admins can view all contributions"
    ON contributions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add more triggers as needed for other tables

-- Create function to verify if authenticated user owns the record
CREATE OR REPLACE FUNCTION auth.is_jwt_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM members WHERE id = auth.uid());
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$ language plpgsql;

-- Replace existing members insert policy
DROP POLICY IF EXISTS "Members can insert their own profile" ON members;

-- Non-financial members policies
CREATE POLICY "Members can view their own dependents"
    ON non_financial_members FOR SELECT
    USING (member_id = auth.uid());

CREATE POLICY "Admins can view all dependents"
    ON non_financial_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Financial members can add dependents"
    ON non_financial_members FOR INSERT
    WITH CHECK (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    );

CREATE POLICY "Financial members can update their own dependents"
    ON non_financial_members FOR UPDATE
    USING (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    )
    WITH CHECK (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    );

CREATE POLICY "Financial members can delete their dependents"
    ON non_financial_members FOR DELETE
    USING (
        member_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM members
            WHERE id = auth.uid()
            AND role = 'financial'
        )
    ); 