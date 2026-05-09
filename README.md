# PayUp MVP Foundation

Mobile-first PWA scaffold for a lightweight debt workflow app.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase
- Zustand

## Run

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase credentials.

## Architecture Highlights

- `src/app/(app)` route group for authenticated app shell pages
- `src/components/layout` and `src/components/navigation` for mobile-first shell and tabs
- `src/components/domain` for screen-specific feature blocks
- `src/components/ui` for reusable primitives
- `src/lib/supabase` for typed clients and query modules
- `src/stores` for local UX state (Quick Add draft)
- `src/types` for domain and database contracts
- `src/config` for navigation and seed presets
