-- Communities table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    logo_url TEXT,
    favicon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community invite links
CREATE TABLE community_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    invite_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to members table
ALTER TABLE members
    ADD COLUMN community_id UUID REFERENCES communities(id),
    ADD COLUMN is_community_admin BOOLEAN DEFAULT false;

-- Add column to non_financial_members table
ALTER TABLE non_financial_members
    ADD COLUMN community_id UUID REFERENCES communities(id);

-- Indexes for new columns
CREATE INDEX idx_members_community_id ON members(community_id);
CREATE INDEX idx_non_financial_members_community_id ON non_financial_members(community_id);
CREATE INDEX idx_communities_name ON communities(name);
