**Diaspora Community App - Technical Development Guide (Backend-First with Supabase + Next.js)**

Prepared by: Techifice (Emma)
Date: April 11, 2025
Phase: MVP - Phase 1 (Membership & Engagement)

---

### ⚙️ Project Stack
- **Frontend:** Next.js (TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Database:** PostgreSQL (managed by Supabase)
- **ORM:** Supabase JS Client
- **Deployment:** Vercel (Next.js), Supabase Hosting

---

### 🧱 Folder Structure (Next.js)
```bash
/src
├── pages
│   ├── index.tsx            # Login
│   ├── register.tsx         # Registration
│   ├── dashboard.tsx        # Dashboard (role-based)
│   ├── feed.tsx             # Posts + Comments
│   ├── announcements.tsx
│   ├── notifications.tsx
│   ├── admin-panel.tsx
│   └── profile
│       ├── view.tsx
│       ├── edit.tsx
│       └── add-dependant.tsx
│
├── lib                      # Supabase config and helpers
├── components               # UI components (Navbar, Cards, etc)
├── types                    # Shared TypeScript types
├── prisma/                  # DB schema
├── styles/                  # global CSS/Tailwind
├── utils                    # Role check, API helpers
```

---

### 🔐 Step 1: Supabase Setup
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project (name: diaspora-community)
3. Set up Supabase auth (email + password)
4. Add your database tables using SQL or Supabase Table Editor
5. Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```
6. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

---

### 🧠 Step 2: Auth & Role Logic
- Use Supabase Auth for login/register
- Extend user profile using a `members` table:
```sql
create table members (
  id uuid primary key references auth.users(id),
  role varchar default 'financial',
  first_name varchar,
  last_name varchar,
  status varchar default 'active',
  created_at timestamp default now()
);
```
- Add table for `non_financial_members` (linked to parent `members.id`)

Use Supabase Row Level Security (RLS) to restrict access by role.

---

### 🧰 Step 3: Core APIs (via Supabase client)
No need for custom API routes for now — use client SDK:
```ts
import { supabase } from '../lib/supabaseClient';

// Register
await supabase.auth.signUp({ email, password });

// Login
await supabase.auth.signInWithPassword({ email, password });

// Fetch member info
const { data } = await supabase.from('members').select('*').eq('id', user.id);
```

---

### 🧪 Step 4: Database Tables (Initial)
- `members`
- `non_financial_members`
- `posts`
- `comments`
- `announcements`
- `notifications`

More tables (loans, ledger, etc.) in future phases.

---

### 🎯 Step 5: Backend Milestones
| Week | Focus                               | Outcome                             |
|------|-------------------------------------|--------------------------------------|
| 1    | Auth, Members Table, Profiles       | Register/login, profile load         |
| 2    | Feed, Comments, Announcements       | Post/comment/announce working       |
| 3    | Admin Panel + Notifications         | Role check, filters, admin view      |

---

### 🛡️ Step 6: Protecting Routes
Use Supabase session in `useEffect()` to redirect unauthorized users:
```ts
useEffect(() => {
  const session = supabase.auth.getSession();
  if (!session) router.push('/login');
}, []);
```
Create reusable `withAuth` HOC to wrap protected pages.

---

### 5. Pages & Components to Build

Core Pages:

register.tsx: form with user type (financial / non-financial)

dashboard.tsx: dynamic dashboard based on role

feed.tsx: posts, comments

profile/view.tsx: user info

profile/edit.tsx: editable fields

profile/add-dependant.tsx: sub-form

announcements.tsx: admin-only posts

notifications.tsx: all roles

admin-panel.tsx: view/manage members

Shared Components:

Navbar, Footer, Sidebar, Card, Modal, NotificationItem, etc.
Any other relevant pages and compnent to the project


### Prisma Models (simplified) - subjective and flexible to change as need arises
model Member {
  id            Int     @id @default(autoincrement())
  email         String  @unique
  password      String
  role          String
  status        String
  firstName     String
  lastName      String
  dependants    NonFinancialMember[]
  posts         Post[]
  comments      Comment[]
  notifications Notification[]
}

model NonFinancialMember {
  id         Int    @id @default(autoincrement())
  memberId   Int
  firstName String
  lastName  String
  relationship String
  member    Member @relation(fields: [memberId], references: [id])
}


### Basic DBML - Expand to match requirements and project status:
Table members {
  id int [pk, increment]
  first_name varchar
  last_name varchar
  email varchar [unique]
  password varchar
  role varchar // 'admin', 'financial', 'non-financial'
  status varchar // 'active', 'inactive'
  created_at timestamp
  updated_at timestamp
}

Table non_financial_members {
  id int [pk, increment]
  member_id int [ref: > members.id] // parent member
  first_name varchar
  last_name varchar
  relationship varchar // spouse, child
  status varchar // 'active', 'inactive'
  created_at timestamp
  updated_at timestamp
}

Table posts {
  id int [pk, increment]
  author_id int [ref: > members.id]
  title varchar
  content text
  created_at timestamp
  updated_at timestamp
}

Table comments {
  id int [pk, increment]
  post_id int [ref: > posts.id]
  author_id int [ref: > members.id]
  content text
  created_at timestamp
}

Table announcements {
  id int [pk, increment]
  title varchar
  content text
  created_by int [ref: > members.id]
  created_at timestamp
  audience varchar // 'all', 'financial-only'
}

Table notifications {
  id int [pk, increment]
  member_id int [ref: > members.id]
  message varchar
  is_read boolean
  created_at timestamp
}

Table sessions {
  id int [pk, increment]
  member_id int [ref: > members.id]
  token varchar
  expires_at timestamp
  created_at timestamp
}

// Note: Additional tables like contributions, loans, ledger, etc., will be added in later phases.




### ✅ Development Tips
- Code **step-by-step**, test after each feature
- Use `console.log()` to inspect `supabase.auth.getUser()`
- Save common queries to `/lib/supabaseQueries.ts`
- Create demo seed data in Supabase Table Editor for testing

---

Let’s start with Step 1 and build forward — co-creating with precision
