# Diaspora Community App

A community management web application for diaspora-based organizations.

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd diaspora
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up your Supabase database

#### For fresh installations:
Run the SQL scripts in the following order:
- `src/lib/database.sql` - Creates database tables and RLS policies
- `src/lib/dev-auth-settings.sql` - Disables email confirmation for development (OPTIONAL - for local development only)
- `src/lib/create-admin-safe.sql` - Creates an admin user

#### For existing installations or if you encounter errors:
If you've already run the database setup and encounter duplicate type/table errors, use these safer scripts:
- `src/lib/fix-rls-policies.sql` - Updates RLS policies without recreating tables or types
- `src/lib/dev-auth-settings.sql` - Handles email confirmation settings safely
- `src/lib/create-admin-safe.sql` - Creates admin user only if it doesn't exist

5. Start the development server
```bash
npm run dev
```

Navigate to http://localhost:3000 to see the application.

## Troubleshooting

### Registration Issues
If you encounter registration issues:

1. **Email Confirmation Problems**:
   - Run `src/lib/dev-auth-settings.sql` to disable email confirmation
   - Ensure your Supabase project has SMTP configured correctly for production

2. **401 Unauthorized Errors**:
   - Run `src/lib/fix-rls-policies.sql` to update the Row Level Security policies
   - This allows non-authenticated requests to create member profiles

3. **Email Already Registered**:
   - Log into Supabase dashboard
   - Check Authentication > Users
   - Either delete the user or run SQL to confirm their email:
     ```sql
     UPDATE auth.users
     SET email_confirmed_at = NOW()
     WHERE email = 'user@example.com';
     ```

## Database Schema

The main tables in our database are:
- `members` - User profiles linked to auth.users
- `non_financial_members` - Dependents linked to financial members
- `posts` - Community feed posts
- `comments` - Comments on posts
- `announcements` - Official communications from admins
- `notifications` - User notifications
- `events` - Community events
- `event_registrations` - Event attendance
- `contributions` - Financial dues tracking

## Authentication

We use Supabase Auth for authentication. There are three user roles:
- `admin` - Full access to all features
- `financial` - Can post, comment, and add dependents
- `non_financial` - Limited access (read-only)

### For Development

To disable email confirmation during development:
1. Run the `src/lib/dev-auth-settings.sql` script in your Supabase SQL editor
2. Use the test admin credentials:
   - Email: admin@diaspora.com
   - Password: Admin123!

**IMPORTANT**: Do not use these settings or credentials in production!

## Testing API Endpoints

You can test the API endpoints using the Postman collection in `docs/api-documentation.postman_collection.json`.

## Development Workflow

1. Create a feature branch
2. Implement the feature
3. Test thoroughly
4. Submit a pull request

## Developer
- Olawuni Emmanuel Kayode
okemmanuel.tech

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) 