-- Simplest admin creation script - manual approach
-- This script creates an admin user directly in the database

DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@diaspora.com';
    admin_password TEXT := 'Admin123!';
    admin_exists BOOLEAN;
    created_at TIMESTAMPTZ := NOW();
BEGIN
    -- See if admin already exists
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = admin_email
    ) INTO admin_exists;
    
    -- If admin already exists, get their ID
    IF admin_exists THEN
        RAISE NOTICE 'Admin user already exists with email %', admin_email;
        SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
    ELSE
        -- Try inserting manually
        BEGIN
            -- Generate UUID for user
            admin_id := gen_random_uuid();
            
            -- Alternative 1: Direct insert approach
            BEGIN
                -- Try direct insertion
                INSERT INTO auth.users (
                    id,
                    email,
                    encrypted_password,
                    email_confirmed_at,
                    role,
                    raw_app_meta_data,
                    raw_user_meta_data,
                    created_at,
                    updated_at,
                    confirmation_token
                ) VALUES (
                    admin_id,
                    admin_email,
                    crypt(admin_password, gen_salt('bf')), -- Bcrypt hash
                    NOW(), -- Email confirmed
                    'authenticated',
                    '{"provider":"email","providers":["email"]}',
                    '{"role":"admin","first_name":"Super","last_name":"Admin"}',
                    created_at,
                    created_at,
                    encode(gen_random_bytes(20), 'hex')
                );
                
                RAISE NOTICE 'Created admin user with manual insertion, ID: %', admin_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not directly insert admin user: %', SQLERRM;
                
                -- If that fails, we need an alternative approach
                -- You might need to create the user through the Supabase dashboard manually
                RAISE NOTICE 'Please create admin user manually through Supabase dashboard:';
                RAISE NOTICE 'Email: %', admin_email;
                RAISE NOTICE 'Password: %', admin_password;
                RAISE NOTICE 'Then run this script again to link the user to the members table';
                
                -- Check if the user was created manually
                SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
                
                IF admin_id IS NULL THEN
                    RAISE NOTICE 'No admin user found. Please create one manually and run this script again.';
                    RETURN; -- Exit without error
                ELSE
                    RAISE NOTICE 'Found manually created admin user with ID: %', admin_id;
                END IF;
            END;
        END;
    END IF;
    
    -- Now check if admin exists in members table
    SELECT EXISTS (
        SELECT 1 FROM members WHERE id = admin_id
    ) INTO admin_exists;
    
    -- Insert into members table if not already there
    IF NOT admin_exists AND admin_id IS NOT NULL THEN
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
        );
        
        RAISE NOTICE 'Admin user created in members table with ID: %', admin_id;
    ELSIF admin_id IS NOT NULL THEN
        -- Ensure the role is set to admin
        UPDATE members
        SET role = 'admin', status = 'active'
        WHERE id = admin_id;
        
        RAISE NOTICE 'Admin user already exists in members table, ensured role is admin';
    END IF;
    
    -- If admin_id is still null, we couldn't create the admin
    IF admin_id IS NULL THEN
        RAISE NOTICE 'Could not create or find admin user. Please create manually via Supabase dashboard.';
    ELSE
        RAISE NOTICE 'Admin setup complete for user with ID: %', admin_id;
    END IF;
END $$; 