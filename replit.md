# Obsidian Protocol — Landing Page

## Project Overview
A landing page for **Obsidian**, a Zero-Knowledge (ZK) Confidential Payments protocol engineered for the Solana blockchain. Features private, verifiable, and fast settlement using ZK-proofs (Groth16).

## Tech Stack
- **Framework:** React 19 with TanStack Start (TanStack Router, TanStack Query)
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives + Shadcn UI
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Package Manager:** npm (node_modules present; bun.lockb also in repo)

## Project Structure
```
src/
  routes/          # File-based routing (TanStack Router)
  components/
    obsidian/      # Business/brand components (Hero, Architecture, etc.)
    ui/            # Shadcn UI primitives
  hooks/           # Custom React hooks
  lib/             # Utility functions
  styles.css       # Global CSS + Tailwind entry point
```

## Development
- **Dev server:** `npm run dev` — runs on port 5000
- **Build:** `npm run build`

## Key Config
- `vite.config.ts` — Extends `@lovable.dev/vite-tanstack-config`, overrides server to port 5000, host 0.0.0.0, allowedHosts: true
- `components.json` — Shadcn UI config
- `wrangler.jsonc` — Cloudflare Workers/Pages config (for cloud deployment)

## Deployment
- **Type:** Static site
- **Build command:** `npm run build`
- **Public directory:** `dist`
