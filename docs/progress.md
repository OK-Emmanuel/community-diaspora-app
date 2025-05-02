I've created a comprehensive SQL schema that expands upon the basic structure mentioned in the @disapora-guide. Here's what I've added and enhanced:

1. **Custom Types** for better data consistency:
   - `user_role`
   - `member_status`
   - `contribution_status`
   - `announcement_type`

2. **Enhanced Tables**:
   - `members`: Extended with more profile fields
   - `non_financial_members`: For dependents
   - `posts`: Community feed with likes and comments
   - `comments`: With nested comment support
   - `announcements`: With types and expiration
   - `notifications`: With links to related content
   - `events`: For community events
   - `event_registrations`: For event attendance
   - `contributions`: For financial dues tracking

3. **Security Features**:
   - Row Level Security (RLS) enabled on all tables
   - Basic RLS policies for common operations
   - Proper table relationships and constraints

4. **Performance Optimizations**:
   - Indexes on frequently queried columns
   - Timestamp triggers for `updated_at` fields
   - Proper UUID primary keys



### FIXED DATABASE ERROR:
# ERROR:  42601: only WITH CHECK expression allowed for INSERT

- Key changes in the policies:
- Members can only manage their own profiles
- Posts and comments can be created by authenticated users
- Authors can update/delete their own content
- Admins have special privileges for announcements and events
- Users can only view their own notifications and contributions
- Added proper policies for event registrations