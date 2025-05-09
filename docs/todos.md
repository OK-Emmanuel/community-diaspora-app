# Diaspora Community App - Development TODOs

## Phase 1: Project Setup & Authentication
### Project Initialization
- [x] Initialize Next.js project with TypeScript
- [x] Set up Tailwind CSS
- [x] Configure ESLint and Prettier
- [x] Create basic folder structure as per guide
- [x] Set up Git repository

### Supabase Integration
- [x] Create Supabase project
- [x] Set up environment variables
- [x] Initialize Supabase client
- [x] Create database tables:
  - [x] members
  - [x] non_financial_members
  - [x] posts
  - [x] comments
  - [x] announcements
  - [x] notifications
  - [x] events
  - [x] event_registration
  - [x] contributions
  - [x] sessions
- [x] Configure Row Level Security (RLS)

### Authentication System
- [x] Implement sign up functionality
  - [x] Create registration form
  - [x] Add validation
  - [x] Handle member type selection
- [x] Implement login system
  - [x] Create login form
  - [x] Add session management
  - [x] Implement protected routes
- [x] Create auth middleware/HOC
- [x] Implement fallback authentication mechanisms
- [x] Set up debugging tools for authentication
- [x] Fix 401 "No API key found in request" error

## Phase 2: Core Features
### User Management
- [x] Create member profile pages
  - [x] View profile
  - [x] Edit profile
  - [x] Add dependants
- [x] Implement role-based access control
- [x] Create admin panel for member management

### Content Management
- [x] Implement post creation and management
  - [x] Create post form
  - [x] Post listing page
  - [x] Post detail view
- [x] Add commenting system
  - [x] Comment creation
  - [x] Comment threading
  - [x] Comment moderation
- [x] Create announcement system
  - [x] Announcement creation (admin)
  - [x] Announcement display

### Notifications
- [x] Set up notification system
  - [x] Notification creation
  - [x] Notification display
  - [x] Mark as read functionality

## Phase 3: UI/UX Development
### Components
- [x] Create shared components:
  - [x] Navigation bar
  - [x] Footer
  - [x] Sidebar
  - [x] Card components
  - [x] Modal system
  - [x] Form components
  - [x] Button system
  - [x] Loading states
  - [x] Error states

### Pages
- [x] Develop core pages:
  - [x] Landing page
  - [x] Dashboard
  - [x] Feed
  - [x] Profile pages
  - [x] Admin panel
  - [x] Announcements page
  - [x] Notifications page
  - [x] Debug page for testing

## Phase 4: Testing & Optimization
- [ ] Write unit tests
- [ ] Add integration tests
- [x] Perform security audit
  - [x] Fix authentication security issues
  - [ ] Review database permissions
- [ ] Optimize performance
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] API response caching
- [x] Add error boundaries
- [x] Implement logging system
  - [x] Authentication errors
  - [ ] User actions
  - [ ] Performance metrics

## Phase 5: Deployment & Documentation
- [x] Set up CI/CD pipeline
- [x] Configure production environment
- [x] Deploy to Vercel
- [ ] Create user documentation
- [x] Document API endpoints
- [x] Create diagnostic tools
- [x] Create maintenance guide

## Phase 6: Community & Clan Management
- [x] Implement community (clan) creation by admin.
- [x] Allow users to register into a specific community.
- [x] Restrict member groups to only see their own community.
- [x] Make app name, logo, and favicon dynamic based on community.
- [~] Create a template for managing and creating communities.
- [x] Implement invite-only (backdoor) link for community admin setup.
- [x] Allow community admins to share registration links for their clan.
- [~] Display community name prominently after login; show software name as small print.
- [x] On registration, only allow financial membership type; non-financial members are added by financial members.

## Bugs & UX Improvements
- [x] Add a button for members to view a log of their record and those of their dependants.
- [x] Update save button text to "save record" or "save dependant" as appropriate.
- [x] Fix date of birth input error for financial members.

## Priority Order for Development:
1. Project setup and authentication (done)
2. Member management system (done)
3. Core content features (posts, comments)
4. Admin functionality
5. Notifications system
6. UI polish and optimization
7. Testing and deployment

## Notes:
- Follow TypeScript best practices
- Maintain consistent code style
- Regular testing after each feature
- Document all major components
- Keep security as a priority
- Regular backups of Supabase data
- Stick to Tailwind CSS for styling
- Stick to Plan, don't rush or deviate from the plan

## Authentication System Checklist
- [x] Fix 401 "No API key found in request" error
- [x] Implement multiple fallback mechanisms
- [x] Create debugging tools
- [x] Document authentication flow

## Deployment Checklist
- [x] Fix Suspense boundary issues
- [x] Fix dynamic API routes
- [x] Configure environment variables
- [x] Add service role key to Vercel
- [x] Document deployment process

