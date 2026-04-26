# Obsidian Protocol — Confidential Payments Console

## Project Overview
A marketing landing page plus a full operator-facing confidential payment console for **Obsidian** — a Zero-Knowledge (ZK) confidential payments protocol engineered for Solana. The product experience is a real workspace: Transfers, Payroll, Treasury, Counterparties, Activity, Architecture, and Settings.

## Tech Stack
### Frontend
- **Framework:** React 19 (pure SPA via TanStack Router)
- **Routing:** TanStack Router (file-based, client-side only)
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives + Shadcn UI
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Package Manager:** npm

### Backend
- **API:** Express (port 3001) — `npm run api` via `tsx watch server/index.ts`
- **Database:** SQLite via `better-sqlite3` (file: `obsidian.db` at project root)
- **Proxy:** Vite dev server proxies `/api/*` → `localhost:3001`
- **Admin auth:** `x-admin-key` header; key set via `ADMIN_KEY` env var (default: `obsidian-admin-dev`)
- **Application IDs:** Format `OBD-XXXXXXXX` (random alphanumeric)

## Routes

### Public
- `/` — Marketing landing page. Premium ZK finance landing page with hero, problem/solution, use cases, architecture, manifesto, and CTA to open the dashboard.

### Product Console (AppShell with sidebar)
- `/dashboard` — Workspace overview: status bar, quick actions, readiness config, ZK transfer protocol view, recent activity, architecture snapshot
- `/transfers` — Confidential transfer list with filter chips (pending/verified/settled/failed), detail panel, and New Transfer modal
- `/payroll` — Payroll batch management: batch list, stats, create batch flow, recipient import state
- `/treasury` — Treasury routes and allocation view with approval queue
- `/counterparties` — Counterparty directory with KYC status, search, filter, Add Counterparty modal
- `/activity` — Event timeline with category filters (transfer/payroll/treasury/counterparty/settings/system)
- `/architecture` — Protocol layer documentation (Confidential Notes → ZK Engine → Settlement → Policy → Audit)
- `/settings` — Organization settings, privacy defaults, disclosure policy, notifications, connectivity state

### Admin (internal)
- `/admin/applications` — Full admin panel for application management (from previous access program phase). Password-gated via admin key.

### Legacy (preserved for compatibility)
- `/apply` — Early access application form (no longer primary UX)
- `/submitted` — Application confirmation

## App Shell
All product routes use `AppShell` which provides:
- Desktop sidebar (w-52) with grouped navigation: main operations, system, internal/admin
- Top status bar with current module label, Privacy mode indicator, Solana network indicator
- Mobile hamburger with animated slide-out panel

## State Management
- `ApplicationContext` stores form data and application ID, persisted to `localStorage`
- All 7 product modules (Dashboard, Transfers, Payroll, Treasury, Counterparties, Activity, Settings) are fully DB-backed: no hardcoded fake data anywhere
- Frontend uses `src/lib/api.ts` typed API client (namespaced `api.*` methods) to fetch/mutate via `/api/*` routes
- All pages implement: loading skeletons, empty states, error states, and real form submissions that POST to the Express API
- All create/update mutations automatically log to the `activity_events` table via `logActivity()` helper

## Database Schema (SQLite — obsidian.db)
- `applications` — Early access applications (legacy)
- `transfers` — Confidential transfers with reference, status, proof state, asset, region
- `payroll_batches` — Payroll batches with recipient count, approval threshold/count, scheduled date
- `treasury_routes` — Treasury routing policies with source/destination pools and allocation
- `counterparties` — KYC-tracked counterparties with type, relationship, status
- `activity_events` — Append-only audit log of all mutations (category, event, detail, operator)
- `workspace_settings` — Singleton settings row (privacy mode, notifications, disclosure policy)

## Architecture Notes
- **SPA mode only**: Pure TanStack Router SPA (no SSR). Uses `createRoot`.
- **Vite config**: Proxies `/api/*` → `localhost:3001`
- **Fonts**: Space Grotesk (display) + Inter (body) + JetBrains Mono (mono)
- **routeTree.gen.ts** is auto-generated — do not edit manually

## Development
- **Frontend dev server:** `npm run dev` → port 5000
- **API server:** `npm run api` → port 3001
- **Build:** `npm run build`

## Deployment
- **Type:** Static site (frontend) + Express API (backend)
- **Build command:** `npm run build`
- **Public directory:** `dist`
