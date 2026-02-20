# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRM application (Pipedrive-like) for an insurance broker, managing Organizations, People, Deals, Activities, and Reports. Built with the Lovable platform. UI and code comments are in Brazilian Portuguese.

## Commands

```bash
npm run dev          # Dev server on :8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
```

Test files go in `src/**/*.{test,spec}.{ts,tsx}` or `src/**/__tests__/*.{ts,tsx}`. Testing uses Vitest + Testing Library with jsdom.

## Tech Stack

- **React 18** + TypeScript + Vite (SWC)
- **Supabase** for database (PostgreSQL), auth, and RLS
- **TanStack React Query** for server state (2min staleTime, retry 1, no refetch on focus)
- **React Router 6** for routing (lazy-loaded pages with `React.lazy` + `Suspense`)
- **shadcn-ui** (Radix UI + Tailwind CSS) for components
- **React Hook Form + Zod** for forms/validation
- **TipTap** for rich text editing
- **@hello-pangea/dnd** for drag-and-drop (deal kanban)

## Architecture

### Provider hierarchy (src/App.tsx)
QueryClientProvider → ThemeProvider → AuthProvider → TooltipProvider → BrowserRouter → Suspense

All pages are lazy-loaded. Each protected route is wrapped in `<ProtectedPage>` which combines `<ProtectedRoute>` + `<ErrorBoundary>`.

### Routing
All routes except `/auth` are protected via `useAuth()`. Pages live in `src/pages/`. URL patterns: `/organizations`, `/organizations/:id`, `/people/:id`, `/deals/:id`, etc.

### Auth & Roles
`src/contexts/AuthContext.tsx` provides auth state via `useAuth()` hook. Two roles: `admin` and `corretor`. Role checked via `isAdmin` boolean. Destructive actions (delete) on detail pages are restricted to admin only.

### Service Layer (`src/services/`)
Centralized services to avoid duplicating Supabase queries:
- `noteService.ts` — CRUD for notes across all entities (organization/person/deal)
- `historyService.ts` — Fetch/add history entries across all entities
- `profileService.ts` — Batch fetch user profiles by IDs (resolves names in notes/history)
- `filterBuilder.ts` — Shared filter logic for building Supabase queries (search, date range, tags, nullable fields, city-based org filters)
- `supabaseErrors.ts` — Translates Supabase errors into user-friendly Portuguese messages

### Environment Config (`src/config/env.ts`)
Validates required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) at startup. Imported before Supabase client initialization.

### Data Layer
Supabase client from `src/integrations/supabase/client.ts`. Database types auto-generated in `src/integrations/supabase/types.ts`.

Pattern for queries:
```ts
supabase.from('table').select('*').eq('column', value).is('deleted_at', null)
```

For notes/history/profiles, prefer using service functions instead of direct Supabase calls:
```ts
import { fetchNotes, createNote } from '@/services/noteService';
import { fetchHistory } from '@/services/historyService';
import { getErrorMessage } from '@/services/supabaseErrors';
```

For filtered list pages, use the filter builder:
```ts
import { applyPeopleFilters } from '@/services/filterBuilder';
```

### Component Organization
- `src/components/ui/` — shadcn-ui primitives (do not edit manually; use shadcn CLI)
- `src/components/layout/` — AppLayout, AppSidebar, GlobalSearch, ProtectedRoute
- `src/components/shared/` — Reusable cross-feature components (ErrorBoundary, DeleteConfirmDialog, etc.)
- `src/components/{feature}/` — Feature-specific components
- `src/components/{feature}/detail/` — Sub-components for detail pages
- `src/hooks/` — Custom hooks for data fetching with React Query
- `src/services/` — Centralized business logic and Supabase query helpers

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig and vite).

### Styling
Tailwind CSS with custom theme extensions in `tailwind.config.ts`. Dark mode is default (class-based via next-themes, storage key: `crm-jacometo-theme`). Dialogs use responsive widths: `max-w-[95vw] md:max-w-2xl`.

### Database Migrations
SQL migrations in `supabase/migrations/`. Soft delete uses nullable `deleted_at` column — all SELECT queries must include `.is('deleted_at', null)` filter at the application level (not RLS).

### Error Handling
- All mutations should use `getErrorMessage()` from `@/services/supabaseErrors` for user-facing error toasts
- All pages are wrapped in `<ErrorBoundary>` via the `<ProtectedPage>` wrapper in App.tsx
- Detail page queries use `.limit(50)` for related records (activities, deals, history)

## TypeScript Config

Loose type checking: `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` are all `false`; `strictNullChecks` is `false`. Plan to enable strict mode incrementally.
