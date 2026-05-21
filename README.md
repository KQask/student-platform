# Student Platform — MVP

A student-facing academic planning and networking app combining LinkedIn-style profiles,
Canvas-style course tracking, and ASSIST.org-driven transfer planning. MVP target: Foothill
College students transferring to UC for CS, Biology, and Economics majors.

## Stack

- **Frontend:** Next.js 15 (App Router) + React + TailwindCSS
- **Backend:** Next.js API routes (REST)
- **DB:** PostgreSQL (local via Docker)
- **ORM:** Prisma
- **Auth:** Auth.js (NextAuth v5) — credentials + optional Google OAuth
- **HTML parsing:** cheerio (for Foothill schedule scraper)

## Setup

Prerequisites: Node 20+, Docker, npm.

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env: at minimum, replace NEXTAUTH_SECRET with `openssl rand -base64 32`

# 4. Generate Prisma client + run migrations
npx prisma migrate dev --name init

# 5. Seed the database (schools, majors, sample courses, demo user, ASSIST agreements)
npm run seed

# 6. Start the dev server
npm run dev
```

Demo credentials after seeding:

```
Email:    demo@student.local
Password: demo1234
```

## Architecture

```
src/
├── app/                Next.js App Router
│   ├── (auth)/         Sign-in, sign-up
│   ├── (app)/          Authenticated app shell (sidebar layout)
│   └── api/            REST endpoints — thin wrappers over services/
├── components/         UI primitives + app components
├── lib/                db (Prisma singleton), auth (NextAuth config), cache, utils
├── services/           Backend domain logic — single source of truth for app behavior
│   ├── profileService.ts
│   ├── plannerService.ts
│   ├── requirementsService.ts      Matches plan courses against ASSIST requirements
│   ├── recommendationService.ts    Transfer readiness score + next-class suggestions
│   └── integrations/
│       ├── assist/                 ASSIST.org client + parser + cache + seed fallback
│       └── foothill/               Foothill schedule/catalog scraper + seed fallback
└── types/
```

### Integration services

Both `assistService` and `foothillScheduleService` follow the same shape so additional
schools can be added with minimal code:

```
client.ts    Raw HTTP fetcher (retry, backoff, timeout)
parser.ts    Raw response → normalized internal types
cache.ts     DB-backed cache with TTL
service.ts   Public API — orchestrates client + parser + cache + seed fallback
seed/        JSON snapshots used when network is unavailable or in CI
types.ts     Exported normalized types
```

Live fetches are gated behind `ASSIST_LIVE_FETCH` and `FOOTHILL_LIVE_FETCH` env vars
so the app works fully offline using seed data.

### Adding a new college

To add De Anza or another FHDA-system college:

1. Add a `School` row (seed or admin tool) with the appropriate `code` and `type`.
2. If it uses the same Banner-style schedule UI, reuse the parser at
   `src/services/integrations/foothill/parser.ts` and add a thin service that points
   `client.ts` at a different base URL via env var.
3. If it uses ASSIST.org, no new integration code is needed — pass the institution ID
   to `assistService.getMajorArticulation(...)`.

### Extension points (look for these markers)

- `// FUTURE:` — heuristics that should be replaced with smarter models.
- `// TODO:` — known gaps or edge cases (especially in ASSIST parser).
- `// STUB:` — page or feature that is intentionally thin in MVP.

## Pages

| Route                  | Status   | Notes                                                            |
|------------------------|----------|------------------------------------------------------------------|
| `/dashboard`           | Deep     | Readiness score, missing reqs, next-class suggestions            |
| `/profile/[userId]`    | Deep     | Public/private profile                                           |
| `/planner`             | Deep     | Term-by-term course plan                                         |
| `/requirements`        | Deep     | ASSIST-driven IGETC + major prep breakdown                       |
| `/courses`             | Deep     | Foothill catalog + sections (real data + seed fallback)          |
| `/feed`                | Thin     | Posts, comments, likes                                           |
| `/network`             | Thin     | Search profiles, connection requests                             |
| `/clubs`               | Thin     | Club directory, join                                             |
| `/messages`            | Thin     | 1:1 DM threads (poll-based)                                      |
| `/settings`            | Thin     | Account, privacy                                                 |

## API surface (REST under `/api`)

Designed to be mobile-app ready. All routes return JSON, accept JSON bodies, and require
a Next-Auth session cookie except `/api/auth/*` and read-only public profile lookups.

## Production deployment (not configured in MVP)

Recommended path: Vercel (Next.js) + Neon or Supabase (Postgres). Migrations run via
`prisma migrate deploy` in CI. Seeds should NOT run in production.

## Status / non-goals

See `/Users/manavramanan/.claude/plans/build-an-mvp-web-effervescent-stream.md` for the
full MVP scope decision and explicit non-goals.
