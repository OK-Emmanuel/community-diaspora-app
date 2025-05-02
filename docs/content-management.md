# Content Management System

This documentation covers the content management features of the Diaspora Community platform.

## Overview

The content management system includes the following features:

1. Community Feed
2. Posts and Comments
3. Announcements

## Database Schema

The content management system uses the following tables:

### Posts Table
- `id`: UUID (Primary Key)
- `title`: TEXT
- `content`: TEXT
- `author_id`: UUID (Foreign Key to auth.users)
- `image_url`: TEXT (optional)
- `likes_count`: INTEGER
- `comments_count`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Comments Table
- `id`: UUID (Primary Key)
- `post_id`: UUID (Foreign Key to posts)
- `author_id`: UUID (Foreign Key to auth.users)
- `content`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Likes Table
- `id`: UUID (Primary Key)
- `post_id`: UUID (Foreign Key to posts)
- `user_id`: UUID (Foreign Key to auth.users)
- `created_at`: TIMESTAMP
- Unique constraint on (post_id, user_id)

### Announcements Table
- `id`: UUID (Primary Key)
- `title`: TEXT
- `content`: TEXT
- `author_id`: UUID (Foreign Key to auth.users)
- `type`: TEXT (one of: general, financial, event, emergency)
- `is_pinned`: BOOLEAN
- `expires_at`: TIMESTAMP (optional)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Features

### Community Feed

The community feed displays posts from community members. Users can:
- View posts with author information, creation time, and like/comment counts
- Like posts
- Click to see post details and comments
- Create new posts

### Post Detail View

The post detail view shows a single post with all comments. Users can:
- View the complete post
- Like the post
- Add comments
- View all comments on the post

### Announcements

The announcements section displays important community information. Features include:
- Filtering announcements by type (general, financial, event, emergency)
- Pinned announcements appearing at the top
- Automatic filtering of expired announcements
- Admin-only tools for creating, editing, and deleting announcements

## Row Level Security (RLS) Policies

The system implements the following RLS policies to ensure proper access control:

### Posts
- Anyone authenticated can view posts
- Users can create their own posts
- Users can update their own posts
- Users can delete their own posts, admins can delete any post

### Comments
- Anyone authenticated can view comments
- Users can create their own comments
- Users can update their own comments
- Users can delete their own comments, admins can delete any comment

### Likes
- Anyone authenticated can view likes
- Users can create their own likes
- Users can delete their own likes

### Announcements
- Anyone authenticated can view announcements
- Only admins can create announcements
- Only admins can update announcements
- Only admins can delete announcements

## Triggers

The system uses the following database triggers:

1. `update_post_likes_count`: Updates the likes count when a like is added or removed
2. `update_post_comments_count`: Updates the comments count when a comment is added or removed
3. `update_modified_column`: Updates the `updated_at` timestamp when a record is modified

## Future Enhancements

Potential future enhancements to the content management system:

1. Rich text editing for posts and announcements
2. Image upload capability (rather than just URL)
3. Post categories and tags
4. Scheduled announcements
5. Email notifications for important announcements
6. Comment threading (replies to comments)
7. Share posts via social media
8. Post analytics for admins 