# Obsidian Protocol — Landing Page + Access App

## Project Overview
A landing page and early access app for **Obsidian**, a Zero-Knowledge (ZK) Confidential Payments protocol engineered for the Solana blockchain. Features private, verifiable, and fast settlement using ZK-proofs (Groth16).

## Tech Stack
- **Framework:** React 19 (pure SPA via TanStack Router)
- **Routing:** TanStack Router (file-based, client-side only)
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives + Shadcn UI
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Package Manager:** npm

## Project Structure
```
index.html           # SPA HTML entry point
src/
  main.tsx           # React client mount entry (createRoot, wrapped in ApplicationProvider)
  router.tsx         # TanStack Router factory (getRouter)
  routeTree.gen.ts   # Auto-generated route tree
  styles.css         # Global CSS + Tailwind entry
  context/
    ApplicationContext.tsx  # Form state, localStorage persistence
  routes/
    __root.tsx       # Root route (no SSR shell)
    index.tsx        # Home/landing page route (/)
    apply.tsx        # 4-step early access application (/apply)
    submitted.tsx    # Confirmation screen (/submitted)
    dashboard.tsx    # Access dashboard preview (/dashboard)
  components/
    obsidian/        # Brand components (Hero, Architecture, etc.)
    app/             # App shell: AppShell, sidebar, top bar
    ui/              # Shadcn UI primitives
  hooks/             # Custom React hooks
  lib/               # Utility functions
```

## Routes
- `/` — Marketing landing page (untouched)
- `/apply` — 4-step multi-step application form (Identity → Use Case → Payment Profile → Review)
- `/submitted` — Confirmation screen with next-steps timeline
- `/dashboard` — Access overview dashboard preview

## App Shell
The new app routes (`/apply`, `/submitted`, `/dashboard`) use `AppShell` which provides:
- Desktop sidebar (w-56) with nav links + back-to-landing link
- Mobile hamburger menu with animated slide-out panel
- Top status bar

## State Management
`ApplicationContext` stores form data and submission status, persisted to `localStorage` under key `obsidian_application`.

## Architecture Notes
- **SPA mode only**: TanStack Start (SSR) was replaced with pure TanStack Router SPA mode to avoid React 19 hydration errors caused by Replit's dev environment injecting scripts into the HTML head.
- **No SSR**: Uses `createRoot` instead of `hydrateRoot`. All rendering is client-side.
- **Vite config**: Uses `@tanstack/router-plugin/vite` + `@vitejs/plugin-react` + `@tailwindcss/vite` directly.
- **Fonts**: Space Grotesk (display headings) + Inter (body) + JetBrains Mono (mono)

## Development
- **Dev server:** `npm run dev` — runs on port 5000
- **Build:** `npm run build`

## Deployment
- **Type:** Static site
- **Build command:** `npm run build`
- **Public directory:** `dist`
