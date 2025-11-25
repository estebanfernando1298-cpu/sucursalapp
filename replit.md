# Sucursal Virtual Personas

## Overview

This is a banking virtual branch application built with React and Express that implements a two-factor authentication system using dynamic codes. Users log in with username/password, receive a 6-digit code, and must verify it to access the dashboard. The system is designed to integrate with Telegram for code delivery (currently in development).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Radix UI primitives with shadcn/ui component system for consistent design patterns

**Styling**: Tailwind CSS with custom theme configuration supporting dark mode (primary theme is dark-inspired based on the CSS variables)

**Routing**: wouter for client-side routing with three main pages:
- `/` - Login page
- `/dynamic-key` - OTP verification page  
- `/dashboard` - Protected dashboard area

**State Management**: 
- TanStack Query (React Query) for server state management
- LocalStorage for simple client-side authentication state (userId, codeId, username, isAuthenticated)

**Form Handling**: React Hook Form with Zod validation through @hookform/resolvers

**Design Decision**: The application uses a custom dark theme with a banking/financial aesthetic. Components follow the shadcn/ui pattern allowing easy customization while maintaining accessibility.

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**Database Access**: Drizzle ORM connected to PostgreSQL via Neon serverless driver

**Development vs Production**:
- Development mode uses Vite middleware for HMR
- Production mode serves pre-built static assets from dist/public
- Separate entry points (index-dev.ts and index-prod.ts) handle environment-specific setup

**Authentication Flow**:
1. User submits username/password to `/api/login`
2. Server validates credentials against database
3. Server generates random 6-digit code with 5-minute expiration
4. Code is stored in database linked to user
5. Client receives userId and codeId
6. User enters code on `/dynamic-key` page
7. Server verifies code via `/api/verify-code` endpoint
8. Upon success, user gains access to dashboard

**Design Decision**: The authentication uses a simple two-step verification without JWT tokens or sessions. This is a basic implementation that stores authentication state client-side. For production, this would need enhancement with proper session management (note: connect-pg-simple is included in dependencies suggesting session middleware was planned).

### Database Schema

**Technology**: PostgreSQL accessed through Drizzle ORM

**Tables**:

1. `users` - Stores user credentials
   - id (UUID, auto-generated)
   - username (unique text)
   - password (plain text - **security issue for production**)
   - createdAt (timestamp)

2. `loginAttempts` - Audit log of authentication attempts
   - id (UUID)
   - username (text)
   - success (boolean)
   - timestamp (auto-generated)
   - telegramChatId (text, nullable - for future integration)

3. `dynamicCodes` - Temporary verification codes
   - id (UUID)
   - userId (foreign key to users)
   - code (text, 6 digits)
   - expiresAt (timestamp)
   - used (boolean, default false)
   - createdAt (timestamp)

**Design Decision**: The schema supports a complete audit trail of login attempts and code generation. The inclusion of `telegramChatId` in login_attempts indicates planned integration with Telegram for code delivery, though this is not yet implemented in the routes.

**Security Consideration**: Passwords are stored in plain text, which is a critical security vulnerability. Production systems should use bcrypt or similar hashing.

### External Dependencies

**Required Services**:
- **PostgreSQL Database**: Accessed via DATABASE_URL environment variable through Neon serverless connection
- **Telegram Bot** (planned, not yet implemented): TELEGRAM_BOT_TOKEN environment variable is documented but bot integration is incomplete

**Key Third-Party Libraries**:
- `@neondatabase/serverless` - PostgreSQL connection pooling
- `drizzle-orm` - Type-safe database ORM
- `@radix-ui/*` - Headless UI component primitives
- `@tanstack/react-query` - Server state management
- `zod` - Schema validation
- `wouter` - Lightweight routing
- `tailwindcss` - Utility-first CSS framework
- `vite` - Build tool and dev server

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Code mapping
- `@replit/vite-plugin-dev-banner` - Development banner
- Custom `metaImagesPlugin` - Updates OpenGraph meta tags with Replit deployment URLs

**Design Decision**: The application is optimized for deployment on Replit with specific plugins for the development experience. The Telegram integration is documented but not implemented, suggesting it's a planned feature for sending verification codes to users.