# Admin User Creation Guide

Since the automated script may not work on all Supabase instances, here's a manual approach:

## Option 1: Create through Supabase Dashboard

1. Log in to your Supabase dashboard
2. Go to Authentication > Users
3. Click "Add User"
4. Enter:
   - Email: `admin@diaspora.com` (or preferred admin email)
   - Password: `Admin123!` (or stronger password)
5. Click "Create User"
6. Go to SQL Editor and run:

```sql
-- Get the user ID of the admin
DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@diaspora.com'; -- Use the email you created
BEGIN
    -- Get admin ID
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
    
    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No user found with email %', admin_email;
    END IF;
    
    -- Add to members table with admin role
    INSERT INTO members (
        id, 
        first_name, 
        last_name, 
        role, 
        status, 
        email
    ) VALUES (
        admin_id, 
        'Super', 
        'Admin', 
        'admin', 
        'active', 
        admin_email
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', status = 'active';
    
    RAISE NOTICE 'Admin user set up with ID: %', admin_id;
END $$;
```

## Option 2: Direct API Call

You can create a user through the Supabase API:

```javascript
// Run this in your browser console after setting your API key
// OR use Postman or a similar tool

// Get your API key from Supabase dashboard > Project Settings > API
const SUPABASE_URL = 'https://zsmappumrdykdvnbvpix.supabase.co';
const SERVICE_KEY = 'YOUR_SERVICE_KEY'; // NOT the anon key, need the service key

// Create the user
fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`
  },
  body: JSON.stringify({
    email: 'admin@diaspora.com',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      first_name: 'Super',
      last_name: 'Admin'
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log('Created user:', data);
  
  // Now add to members table
  fetch(`${SUPABASE_URL}/rest/v1/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id: data.id,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'admin',
      status: 'active',
      email: 'admin@diaspora.com'
    })
  })
  .then(response => {
    console.log('Added to members table:', response.status);
  });
})
.catch(error => console.error('Error:', error));
```

After creating the admin user, you can log in with:
- Email: `admin@diaspora.com` (or whatever you used)
- Password: `Admin123!` (or whatever you set) 