# ZKGent — Confidential Payments Console

## Project Overview
A marketing landing page plus a full operator-facing confidential payment console for **ZKGent** — a Zero-Knowledge (ZK) confidential payments protocol engineered for Solana. The product experience is a real workspace: Transfers, Payroll, Treasury, Counterparties, Activity, Architecture, and Settings.

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
- **Database:** SQLite via `better-sqlite3` (file: `zkgent.db` at project root)
- **Proxy:** Vite dev server proxies `/api/*` → `localhost:3001`
- **Admin auth:** `x-admin-key` header; key set via `ADMIN_KEY` env var (default: `zkgent-admin-dev`)
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

## Database Schema (SQLite — zkgent.db)
### Operational Tables
- `applications` — Early access applications (legacy)
- `transfers` — Confidential transfers with reference, status, proof state, asset, region
- `payroll_batches` — Payroll batches with recipient count, approval threshold/count, scheduled date
- `treasury_routes` — Treasury routing policies with source/destination pools and allocation
- `counterparties` — KYC-tracked counterparties with type, relationship, status
- `activity_events` — Append-only audit log of all mutations (category, event, detail, operator)
- `workspace_settings` — Singleton settings row (privacy mode, notifications, disclosure policy)

### ZK Domain Tables
- `zk_notes` — Shielded notes (unspent/spent, commitment, owner fingerprint, AES-256-GCM encrypted payload)
- `zk_commitments` — Commitment registry (note commitments, status: pending/inserted/finalized)
- `zk_nullifiers` — Anti-double-spend nullifier registry (unique, enforces single-spend per note)
- `zk_merkle_nodes` — Merkle accumulator leaf nodes (depth 20, supports 1M+ commitments)
- `zk_proofs` — Proof artifacts (status lifecycle: pending→generating→generated→verified/failed)
- `zk_settlements` — Settlement engine records (12-state machine: queued→...→finalized)
- `zk_onchain_txs` — Solana on-chain transaction records (signature, status, explorer_url)
- `zk_signing_requests` — Browser wallet signing requests (tx_data, wallet_address, signature)

## ZK Domain Services (server/domain/)
- `crypto.ts` — Hash primitives (SHA-256), domain separation, HKDF key derivation
- `keys.ts` — Key management: operator/signing/encryption/viewing/nullifier keys from env seed
- `note.ts` — Note model, AES-256-GCM encrypted payload, note lifecycle (create/spend)
- `commitment.ts` — Commitment derivation H(domain||value_hash||owner||salt), persistence
- `nullifier.ts` — Nullifier derivation, uniqueness enforcement, anti-double-spend check
- `merkle.ts` — Binary Merkle accumulator (append-only, SHA-256 hash pairs, incremental root)
- `proof.ts` — REAL Ed25519 proof pipeline (@noble/curves): sign/verify commitment+nullifier+merkle_root
- `settlement.ts` — Full 12-state settlement engine: note→commitment→proof→nullifier→on-chain
- `solana.ts` — Solana RPC config, live devnet health check
- `solana_tx.ts` — REAL @solana/web3.js tx builder: SPL Memo instruction, devnet submission, tx sig
- `disclosure.ts` — Compliance/disclosure model: view keys, selective disclosure, policy types

## Proof System (Phase 2)
- **Backend:** `ed25519-operator-proof-v1` using `@noble/curves/ed25519.js` — REAL
- **Proof:** Signs `SHA-256(circuit_id:commitment:nullifier:merkle_root:...)` with operator Ed25519 key
- **Verification:** Real `ed25519.verify()` — cryptographic, not structural
- **zk-SNARK (Groth16):** PARTIAL — circuit interface ready, needs `.wasm + .zkey` from Circom compiler
- **Activation:** Drop compiled artifacts in `server/circuits/` + set `available: true` in `CIRCUIT_CONFIG`

## Solana On-chain (Phase 2)
- **Library:** `@solana/web3.js` v1.x — REAL
- **Strategy:** SPL Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) for on-chain anchoring
- **Operator keypair:** Derived deterministically from `ZKGENT_OPERATOR_SEED` env var
- **Airdrop:** Auto-requested on devnet if operator balance < 0.05 SOL (rate-limited by devnet)
- **Custom program:** SCAFFOLD — not yet deployed

## Wallet Integration (Phase 2)
- **Frontend:** `WalletProvider` + `WalletButton` + `WalletStatusPanel` using `window.solana` API
- **Compatible with:** Phantom, Backpack, Solflare (any injected Solana wallet)
- **Sign flow:** `POST /api/zk/signing/request` → wallet signs → `POST /api/zk/signing/respond`
- **Heavy adapter packages** (`@solana/wallet-adapter-*`): Not installed (too heavy for env)

## ZK API Routes (/api/zk/*)
- `GET /api/zk/system` — Full system metrics (powers dashboard ZK observability panel)
- `GET /api/zk/notes` — Notes list + stats
- `GET /api/zk/commitments` — Commitment registry + stats
- `GET /api/zk/nullifiers` — Nullifier registry + stats
- `GET /api/zk/merkle` — Merkle tree state (root, leaf count, depth)
- `GET /api/zk/proofs` — Proof artifacts + stats + circuit status
- `GET /api/zk/circuit` — Circuit availability status + prover pubkey
- `GET /api/zk/settlement/queue` — Settlement queue + latest on-chain txs
- `POST /api/zk/settlement/initiate` — Initiate a confidential settlement (async execution)
- `GET /api/zk/settlement/:id` — Individual settlement state
- `GET /api/zk/transactions` — Latest on-chain transactions
- `GET /api/zk/solana` — Live devnet status + operator balance
- `POST /api/zk/signing/request` — Create wallet signing request
- `POST /api/zk/signing/respond` — Submit wallet signature response
- `GET /api/zk/signing/:id` — Get signing request status
- `GET /api/zk/keys` — Key fingerprints + prover pubkey (no secret material ever exposed)
- `GET /api/zk/disclosure` — Compliance disclosure status

## Architecture Notes
- **SPA mode only**: Pure TanStack Router SPA (no SSR). Uses `createRoot`.
- **Vite config**: Proxies `/api/*` → `localhost:3001`
- **Fonts**: Space Grotesk (display) + Inter (body) + JetBrains Mono (mono)
- **routeTree.gen.ts** is auto-generated — do not edit manually
- **Components folder**: `src/components/zkgent/` — landing page components

## Development
- **Frontend dev server:** `npm run dev` → port 5000
- **API server:** `npm run api` → port 3001
- **Build:** `npm run build`

## Deployment
- **Type:** Reserved VM — Express server serves both frontend (built `dist/`) and API
- **Build command:** `npm run build`
- **Run command:** `npm start` (sets NODE_ENV=production, starts Express on port 5000)
