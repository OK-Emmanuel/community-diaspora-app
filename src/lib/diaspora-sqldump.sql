/*
 Navicat Premium Data Transfer

 Source Server         : Diaspora-Community
 Source Server Type    : PostgreSQL
 Source Server Version : 150008 (150008)
 Source Host           : aws-0-us-east-2.pooler.supabase.com:5432
 Source Catalog        : postgres
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 150008 (150008)
 File Encoding         : 65001

 Date: 10/05/2025 02:24:19
*/


-- ----------------------------
-- Type structure for announcement_type
-- ----------------------------
DROP TYPE IF EXISTS "public"."announcement_type";
CREATE TYPE "public"."announcement_type" AS ENUM (
  'general',
  'financial',
  'event',
  'emergency'
);
ALTER TYPE "public"."announcement_type" OWNER TO "postgres";

-- ----------------------------
-- Type structure for contribution_status
-- ----------------------------
DROP TYPE IF EXISTS "public"."contribution_status";
CREATE TYPE "public"."contribution_status" AS ENUM (
  'paid',
  'pending',
  'overdue'
);
ALTER TYPE "public"."contribution_status" OWNER TO "postgres";

-- ----------------------------
-- Type structure for member_status
-- ----------------------------
DROP TYPE IF EXISTS "public"."member_status";
CREATE TYPE "public"."member_status" AS ENUM (
  'active',
  'inactive',
  'suspended',
  'pending'
);
ALTER TYPE "public"."member_status" OWNER TO "postgres";

-- ----------------------------
-- Type structure for user_role
-- ----------------------------
DROP TYPE IF EXISTS "public"."user_role";
CREATE TYPE "public"."user_role" AS ENUM (
  'superadmin',
  'admin',
  'financial',
  'non_financial'
);
ALTER TYPE "public"."user_role" OWNER TO "postgres";

-- ----------------------------
-- Table structure for announcements
-- ----------------------------
DROP TABLE IF EXISTS "public"."announcements";
CREATE TABLE "public"."announcements" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "author_id" uuid,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" "public"."announcement_type" DEFAULT 'general'::announcement_type,
  "is_pinned" bool DEFAULT false,
  "expires_at" timestamptz(6),
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "community_id" uuid
)
;

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS "public"."comments";
CREATE TABLE "public"."comments" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "post_id" uuid,
  "author_id" uuid,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "parent_comment_id" uuid,
  "likes_count" int4 DEFAULT 0,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "community_id" uuid
)
;

-- ----------------------------
-- Table structure for communities
-- ----------------------------
DROP TABLE IF EXISTS "public"."communities";
CREATE TABLE "public"."communities" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(150) COLLATE "pg_catalog"."default" NOT NULL,
  "logo_url" text COLLATE "pg_catalog"."default",
  "favicon_url" text COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for community_invites
-- ----------------------------
DROP TABLE IF EXISTS "public"."community_invites";
CREATE TABLE "public"."community_invites" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "community_id" uuid,
  "invite_token" text COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6),
  "used" bool DEFAULT false,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for contributions
-- ----------------------------
DROP TABLE IF EXISTS "public"."contributions";
CREATE TABLE "public"."contributions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "member_id" uuid,
  "amount" numeric(10,2) NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "due_date" date NOT NULL,
  "payment_date" date,
  "status" "public"."contribution_status" DEFAULT 'pending'::contribution_status,
  "payment_method" varchar(50) COLLATE "pg_catalog"."default",
  "transaction_reference" varchar(100) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for event_registrations
-- ----------------------------
DROP TABLE IF EXISTS "public"."event_registrations";
CREATE TABLE "public"."event_registrations" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "event_id" uuid,
  "member_id" uuid,
  "status" varchar(50) COLLATE "pg_catalog"."default" DEFAULT 'registered'::character varying,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for events
-- ----------------------------
DROP TABLE IF EXISTS "public"."events";
CREATE TABLE "public"."events" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "creator_id" uuid,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "start_date" timestamptz(6) NOT NULL,
  "end_date" timestamptz(6),
  "is_virtual" bool DEFAULT false,
  "meeting_link" text COLLATE "pg_catalog"."default",
  "max_participants" int4,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for likes
-- ----------------------------
DROP TABLE IF EXISTS "public"."likes";
CREATE TABLE "public"."likes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "community_id" uuid
)
;

-- ----------------------------
-- Table structure for members
-- ----------------------------
DROP TABLE IF EXISTS "public"."members";
CREATE TABLE "public"."members" (
  "id" uuid NOT NULL,
  "first_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "last_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "role" "public"."user_role" DEFAULT 'financial'::user_role,
  "status" "public"."member_status" DEFAULT 'pending'::member_status,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "phone" varchar(20) COLLATE "pg_catalog"."default",
  "address" text COLLATE "pg_catalog"."default",
  "date_of_birth" date,
  "occupation" varchar(100) COLLATE "pg_catalog"."default",
  "joined_date" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "last_login" timestamptz(6),
  "profile_image_url" text COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "community_id" uuid,
  "is_community_admin" bool DEFAULT false
)
;

-- ----------------------------
-- Table structure for non_financial_members
-- ----------------------------
DROP TABLE IF EXISTS "public"."non_financial_members";
CREATE TABLE "public"."non_financial_members" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "member_id" uuid,
  "first_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "last_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "relationship" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "date_of_birth" date,
  "status" "public"."member_status" DEFAULT 'active'::member_status,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "email" varchar(255) COLLATE "pg_catalog"."default",
  "auth_user_id" uuid,
  "upgrade_requested" bool DEFAULT false,
  "community_id" uuid
)
;

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS "public"."notifications";
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "member_id" uuid,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "is_read" bool DEFAULT false,
  "link" text COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Table structure for posts
-- ----------------------------
DROP TABLE IF EXISTS "public"."posts";
CREATE TABLE "public"."posts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "author_id" uuid,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "image_url" text COLLATE "pg_catalog"."default",
  "likes_count" int4 DEFAULT 0,
  "comments_count" int4 DEFAULT 0,
  "is_pinned" bool DEFAULT false,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "community_id" uuid
)
;

-- ----------------------------
-- Function structure for enforce_community_match
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."enforce_community_match"();
CREATE OR REPLACE FUNCTION "public"."enforce_community_match"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
  author_community UUID;
BEGIN
  SELECT community_id INTO author_community
  FROM members
  WHERE id = NEW.author_id;

  IF NEW.community_id IS DISTINCT FROM author_community THEN
    RAISE EXCEPTION 'Post community_id (%) must match author''s community_id (%)',
      NEW.community_id, author_community;
  END IF;

  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for ensure_member_exists
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."ensure_member_exists"("user_id" uuid, "user_email" text, "user_first_name" text, "user_last_name" text, "user_role" text);
CREATE OR REPLACE FUNCTION "public"."ensure_member_exists"("user_id" uuid, "user_email" text, "user_first_name" text='User'::text, "user_last_name" text=''::text, "user_role" text='financial'::text)
  RETURNS "public"."members" AS $BODY$
DECLARE
  member_record members;
BEGIN
  -- Try to find existing record
  SELECT * INTO member_record FROM members WHERE id = user_id;
  
  -- If not found, create one
  IF member_record IS NULL THEN
    INSERT INTO members (
      id, 
      email, 
      first_name, 
      last_name, 
      role, 
      status
    ) VALUES (
      user_id,
      user_email,
      user_first_name,
      user_last_name,
      user_role,
      'active'
    )
    RETURNING * INTO member_record;
  END IF;
  
  RETURN member_record;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;

-- ----------------------------
-- Function structure for generate_community_invite
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."generate_community_invite"("community_id_param" uuid, "user_id_param" uuid);
CREATE OR REPLACE FUNCTION "public"."generate_community_invite"("community_id_param" uuid, "user_id_param" uuid)
  RETURNS "pg_catalog"."jsonb" AS $BODY$
DECLARE
  invite_token TEXT;
  invite_id UUID;
  result JSONB;
BEGIN
  -- Generate a unique invite token (UUID v4)
  invite_token := gen_random_uuid()::TEXT;
  
  -- Insert the invite into the community_invites table
  INSERT INTO community_invites (
    community_id,
    invite_token,
    expires_at,
    used
  ) VALUES (
    community_id_param,
    invite_token,
    NOW() + INTERVAL '7 days', -- Expires in 7 days
    false
  ) RETURNING id INTO invite_id;
  
  -- Create the result JSON
  result := jsonb_build_object(
    'invite_token', invite_token,
    'invite_id', invite_id,
    'community_id', community_id_param,
    'expires_at', (NOW() + INTERVAL '7 days')
  );
  
  RETURN result;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;

-- ----------------------------
-- Function structure for get_member_by_id
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."get_member_by_id"("member_id" uuid);
CREATE OR REPLACE FUNCTION "public"."get_member_by_id"("member_id" uuid)
  RETURNS SETOF "public"."members" AS $BODY$
  SELECT * FROM members WHERE id = member_id;
$BODY$
  LANGUAGE sql VOLATILE SECURITY DEFINER
  COST 100
  ROWS 1000;

-- ----------------------------
-- Function structure for set_announcement_community_id_from_author
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."set_announcement_community_id_from_author"();
CREATE OR REPLACE FUNCTION "public"."set_announcement_community_id_from_author"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  -- Only set community_id if it's not provided and the author is an admin with a community_id
  IF NEW.community_id IS NULL AND NEW.author_id IS NOT NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.author_id AND (m.role = 'admin'::user_role OR m.role = 'superadmin'::user_role);
    -- If a superadmin creates an announcement without specifying community_id,
    -- it might remain NULL (global) or take their community_id if they have one.
    -- Application logic should be clear: 'global' means community_id IS NULL.
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for set_comment_community_id_from_post
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."set_comment_community_id_from_post"();
CREATE OR REPLACE FUNCTION "public"."set_comment_community_id_from_post"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT p.community_id INTO NEW.community_id
    FROM public.posts p
    WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for set_dependent_community_id_from_parent
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."set_dependent_community_id_from_parent"();
CREATE OR REPLACE FUNCTION "public"."set_dependent_community_id_from_parent"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for set_like_community_id_from_post
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."set_like_community_id_from_post"();
CREATE OR REPLACE FUNCTION "public"."set_like_community_id_from_post"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT p.community_id INTO NEW.community_id
    FROM public.posts p
    WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for set_post_community_id_from_author
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."set_post_community_id_from_author"();
CREATE OR REPLACE FUNCTION "public"."set_post_community_id_from_author"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF NEW.community_id IS NULL THEN
    SELECT community_id INTO NEW.community_id
    FROM public.members
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for update_modified_column
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_modified_column"();
CREATE OR REPLACE FUNCTION "public"."update_modified_column"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for update_post_comments_count
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_post_comments_count"();
CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for update_post_likes_count
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_post_likes_count"();
CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for update_updated_at_column
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_updated_at_column"();
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Indexes structure for table announcements
-- ----------------------------
CREATE INDEX "announcements_author_id_idx" ON "public"."announcements" USING btree (
  "author_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "announcements_is_pinned_idx" ON "public"."announcements" USING btree (
  "is_pinned" "pg_catalog"."bool_ops" ASC NULLS LAST
);
CREATE INDEX "announcements_type_idx" ON "public"."announcements" USING btree (
  "type" "pg_catalog"."enum_ops" ASC NULLS LAST
);
CREATE INDEX "idx_announcements_community_id" ON "public"."announcements" USING btree (
  "community_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_announcements_type" ON "public"."announcements" USING btree (
  "type" "pg_catalog"."enum_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table announcements
-- ----------------------------
CREATE TRIGGER "auto_set_announcement_community_id" BEFORE INSERT ON "public"."announcements"
FOR EACH ROW
WHEN ((new.author_id IS NOT NULL))
EXECUTE PROCEDURE "public"."set_announcement_community_id_from_author"();
CREATE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_modified_column"();

-- ----------------------------
-- Primary Key structure for table announcements
-- ----------------------------
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table comments
-- ----------------------------
CREATE INDEX "comments_author_id_idx" ON "public"."comments" USING btree (
  "author_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "comments_post_id_idx" ON "public"."comments" USING btree (
  "post_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_comments_community_id" ON "public"."comments" USING btree (
  "community_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table comments
-- ----------------------------
CREATE TRIGGER "auto_set_comment_community_id" BEFORE INSERT ON "public"."comments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_comment_community_id_from_post"();
CREATE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_modified_column"();
CREATE TRIGGER "update_post_comments_count_trigger" AFTER INSERT OR DELETE ON "public"."comments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_post_comments_count"();

-- ----------------------------
-- Primary Key structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table communities
-- ----------------------------
CREATE INDEX "idx_communities_name" ON "public"."communities" USING btree (
  "name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table communities
-- ----------------------------
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_name_key" UNIQUE ("name");

-- ----------------------------
-- Primary Key structure for table communities
-- ----------------------------
ALTER TABLE "public"."communities" ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table community_invites
-- ----------------------------
ALTER TABLE "public"."community_invites" ADD CONSTRAINT "community_invites_invite_token_key" UNIQUE ("invite_token");

-- ----------------------------
-- Primary Key structure for table community_invites
-- ----------------------------
ALTER TABLE "public"."community_invites" ADD CONSTRAINT "community_invites_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table contributions
-- ----------------------------
CREATE INDEX "idx_contributions_member_status" ON "public"."contributions" USING btree (
  "member_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "status" "pg_catalog"."enum_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table contributions
-- ----------------------------
ALTER TABLE "public"."contributions" ADD CONSTRAINT "contributions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table event_registrations
-- ----------------------------
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_member_id_key" UNIQUE ("event_id", "member_id");

-- ----------------------------
-- Primary Key structure for table event_registrations
-- ----------------------------
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table events
-- ----------------------------
ALTER TABLE "public"."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table likes
-- ----------------------------
CREATE INDEX "idx_likes_community_id" ON "public"."likes" USING btree (
  "community_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "likes_post_id_idx" ON "public"."likes" USING btree (
  "post_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "likes_user_id_idx" ON "public"."likes" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table likes
-- ----------------------------
CREATE TRIGGER "auto_set_like_community_id" BEFORE INSERT ON "public"."likes"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_like_community_id_from_post"();
CREATE TRIGGER "update_post_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_post_likes_count"();

-- ----------------------------
-- Uniques structure for table likes
-- ----------------------------
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");

-- ----------------------------
-- Primary Key structure for table likes
-- ----------------------------
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table members
-- ----------------------------
CREATE INDEX "idx_members_community_id" ON "public"."members" USING btree (
  "community_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_members_role" ON "public"."members" USING btree (
  "role" "pg_catalog"."enum_ops" ASC NULLS LAST
);
CREATE INDEX "idx_members_status" ON "public"."members" USING btree (
  "status" "pg_catalog"."enum_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table members
-- ----------------------------
CREATE TRIGGER "update_members_updated_at" BEFORE UPDATE ON "public"."members"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_updated_at_column"();

-- ----------------------------
-- Uniques structure for table members
-- ----------------------------
ALTER TABLE "public"."members" ADD CONSTRAINT "members_email_key" UNIQUE ("email");

-- ----------------------------
-- Primary Key structure for table members
-- ----------------------------
ALTER TABLE "public"."members" ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table non_financial_members
-- ----------------------------
CREATE INDEX "idx_non_financial_members_community_id" ON "public"."non_financial_members" USING btree (
  "community_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table non_financial_members
-- ----------------------------
CREATE TRIGGER "auto_set_dependent_community_id" BEFORE INSERT OR UPDATE OF "member_id" ON "public"."non_financial_members"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_dependent_community_id_from_parent"();

-- ----------------------------
-- Uniques structure for table non_financial_members
-- ----------------------------
ALTER TABLE "public"."non_financial_members" ADD CONSTRAINT "non_financial_members_email_key" UNIQUE ("email");
ALTER TABLE "public"."non_financial_members" ADD CONSTRAINT "non_financial_members_auth_user_id_key" UNIQUE ("auth_user_id");

-- ----------------------------
-- Primary Key structure for table non_financial_members
-- ----------------------------
ALTER TABLE "public"."non_financial_members" ADD CONSTRAINT "non_financial_members_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table notifications
-- ----------------------------
CREATE INDEX "idx_notifications_member_read" ON "public"."notifications" USING btree (
  "member_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "is_read" "pg_catalog"."bool_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table posts
-- ----------------------------
CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING btree (
  "created_at" "pg_catalog"."timestamptz_ops" DESC NULLS FIRST
);
CREATE INDEX "posts_author_id_idx" ON "public"."posts" USING btree (
  "author_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table posts
-- ----------------------------
CREATE TRIGGER "auto_set_post_community_id" BEFORE INSERT ON "public"."posts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_post_community_id_from_author"();
CREATE TRIGGER "enforce_community_match_trigger" BEFORE INSERT OR UPDATE ON "public"."posts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."enforce_community_match"();
CREATE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_modified_column"();

-- ----------------------------
-- Primary Key structure for table posts
-- ----------------------------
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table announcements
-- ----------------------------
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table community_invites
-- ----------------------------
ALTER TABLE "public"."community_invites" ADD CONSTRAINT "community_invites_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table contributions
-- ----------------------------
ALTER TABLE "public"."contributions" ADD CONSTRAINT "contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table event_registrations
-- ----------------------------
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table events
-- ----------------------------
ALTER TABLE "public"."events" ADD CONSTRAINT "events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table likes
-- ----------------------------
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table members
-- ----------------------------
ALTER TABLE "public"."members" ADD CONSTRAINT "members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."members" ADD CONSTRAINT "members_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table non_financial_members
-- ----------------------------
ALTER TABLE "public"."non_financial_members" ADD CONSTRAINT "non_financial_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."non_financial_members" ADD CONSTRAINT "non_financial_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table posts
-- ----------------------------
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
