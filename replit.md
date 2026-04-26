# Obsidian Protocol — Landing Page

## Project Overview
A landing page for **Obsidian**, a Zero-Knowledge (ZK) Confidential Payments protocol engineered for the Solana blockchain. Features private, verifiable, and fast settlement using ZK-proofs (Groth16).

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
  main.tsx           # React client mount entry (createRoot)
  router.tsx         # TanStack Router factory (getRouter)
  routeTree.gen.ts   # Auto-generated route tree
  styles.css         # Global CSS + Tailwind entry
  routes/
    __root.tsx       # Root route (no SSR shell)
    index.tsx        # Home page route
  components/
    obsidian/        # Business/brand components (Hero, Architecture, etc.)
    ui/              # Shadcn UI primitives
  hooks/             # Custom React hooks
  lib/               # Utility functions
```

## Architecture Notes
- **SPA mode only**: TanStack Start (SSR) was replaced with pure TanStack Router SPA mode to avoid React 19 hydration errors caused by Replit's dev environment injecting scripts into the HTML head.
- **No SSR**: Uses `createRoot` instead of `hydrateRoot`. All rendering is client-side.
- **Vite config**: Uses `@tanstack/router-plugin/vite` + `@vitejs/plugin-react` + `@tailwindcss/vite` directly (not `@lovable.dev/vite-tanstack-config`).

## Development
- **Dev server:** `npm run dev` — runs on port 5000
- **Build:** `npm run build`

## Deployment
- **Type:** Static site
- **Build command:** `npm run build`
- **Public directory:** `dist`
