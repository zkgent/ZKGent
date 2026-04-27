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

## Proof System (Phase D1 — REAL Groth16 zk-SNARK)
- **Active backend:** `groth16-snarkjs` for `transfer` proofs. Auto-selected by `createProofRecord` when `isTransferCircuitReady()` (artifacts exist on disk). Falls back to legacy Ed25519 backend otherwise.
- **Circuit:** `server/circuits/transfer/transfer.circom` (~5,914 R1CS over BN254). Statement: "I know `(value, salt, owner_secret, leaf_index, merkle_path)` such that `Poseidon4(value, asset_hash, Poseidon(owner_secret), salt)` is at `leaf_index` of a Merkle tree with root `merkle_root`, and `nullifier == Poseidon(owner_secret, leaf_index)`, with `value < 2^64`." Public signals: `[merkle_root, nullifier, value_commitment=Poseidon(value,salt), asset_hash]`.
- **Trusted setup:** Phase-1 = `powersOfTau28_hez_final_14.ptau` (Hermez/iden3, multi-party, 140+ contributors). Phase-2 = single-party "zkgent-dev" contribution. **Devnet trust model only — DO NOT use for production funds.**
- **Performance:** prove ~1.2s, verify ~25ms (server-side, in-process snarkjs).
- **Settlement integration:** `executeSettlement` (server/domain/settlement.ts) for the Groth16 path: `createZkNote` (per-note `owner_secret`, encrypted into payload) → `appendLeaf` → snapshot leaves → `computeZkMerkleRoot(snapshot)` → `attachSpendWitness` (in-memory only) → `runProver` (Groth16) → `runVerifier` → invariant check (proof's public `merkle_root` and `nullifier` must equal settlement's stored values) → `publishNullifier` → on-chain submit. **The leaves snapshot is captured immediately after our `appendLeaf` and passed all the way through to the prover, so concurrent settlements cannot drift each other's witness/root.**
- **Independent re-verification:** `GET /api/zk/proofs/:id/verify` runs `snarkjs.groth16.verify(vkey, publicSignals, proof)` from scratch — no DB state trusted beyond fetching the proof artifact. Auditors with `verification_key.json` can repeat the check.
- **Note encryption (security fix):** `encrypted_payload` (which contains `owner_secret` for ZK notes) is encrypted with a key derived from `ZKGENT_OPERATOR_SEED` (a non-public env secret) — NOT from `keys.encryption.fingerprint` which is exposed by `/api/zk/system`. Old notes remain readable via a v1 fallback in `decryptPayload`.
- **What is NOT done yet:** D2 (client-side proving — operator still sees plaintext), D3 (on-chain Solana verifier program — devnet still uses Memo anchoring), multi-party phase-2 ceremony.
- **Legacy Ed25519 backend:** still wired, used for `proofType !== "transfer"` and as a fallback if circuit artifacts are missing.

## Solana On-chain (Phase 3)
- **Library:** `@solana/web3.js` v1.x — REAL (server + browser via vite-plugin-node-polyfills)
- **Node polyfills:** `vite-plugin-node-polyfills` enables @solana/web3.js in browser bundle
- **Strategy:** SPL Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) for on-chain anchoring
- **Operator keypair:** Derived deterministically from `ZKGENT_OPERATOR_SEED` env var
- **Airdrop:** Strictly devnet/testnet only — mainnet requires pre-funded operator account
- **Custom program:** NOT deployed — clearly acknowledged in UI (not hidden or scaffold-labeled)
- **Mainnet-first:** `SOLANA_NETWORK=mainnet-beta` for production; `is_mainnet` flag exposed on API

## Wallet Identity (Phase 3)
- **Model:** Wallet-address-based identity — no web2 auth, no email/password
- **Storage:** `wallet_users` table — wallet_address (PK), identity_fingerprint (ZKG:XXXX:YYYY), session_count
- **On connect:** `POST /api/identity/resolve` creates or upserts identity automatically
- **Per-user data:** settlements, signing requests, on-chain txs linked via `initiated_by_wallet` column
- **Dashboard:** Wallet Identity panel shows fingerprint, session count, per-user activity totals
- **API routes:** `POST /api/identity/resolve`, `GET /api/identity/:address`, `GET /api/identity`

## On-Chain Anchoring on Solana Devnet (Phase 6)
- **Network:** `SOLANA_NETWORK=devnet` (env var, shared). Real RPC: `https://api.devnet.solana.com`.
- **Operator wallet:** Persistent via `ZKGENT_OPERATOR_SEED` env (32-byte hex). Address derived deterministically through HMAC-SHA256 → Ed25519 keypair. `custody_mode: env_seed`. Stable across restarts so the funded address does not get rotated away.
- **On-chain program:** Uses **SPL Memo program** (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) — audited, deployed on all clusters. We anchor `commitment | nullifier | merkle_root | settlement_id` as a memo string per settlement. We deliberately did NOT deploy a custom Solana program (would require Rust BPF compile + multi-week audit + ongoing upgrade authority risk).
- **Mainnet was deferred:** User declined the unaudited-mainnet path (no funding + accepted security recommendation). To re-enable mainnet later, set `SOLANA_NETWORK=mainnet-beta`, fund the operator address with real SOL, and the same code path runs unchanged.
- **End-to-end verified:** Settlement `STL-6NE34H56` finalized with real Poseidon commitment / nullifier / Merkle root + real devnet tx signature `3JHtMDmL1Zs2pgVrK1i3y14cE3wqEQTe7JGG7mtBufzLALxVuHow14YhxmTd4HkrbZ21Q6QEXXiRZNPN44rPzk99` (explorer URL recorded in DB).
- **Funding flow:** Auto-airdrop tries first; if devnet faucet rate-limits (429), the user funds manually via `https://faucet.solana.com` (one-time). Operator address printed in `/api/zk/system → on_chain.operator_address`.

## ZK-Friendly Hash Chain + Real Groth16 (Phase 5)
- **Hash scheme:** Migrated `zk_commitments`, `zk_nullifiers`, `zk_merkle_nodes` from SHA-256 to **Poseidon over BN254** (`poseidon-lite`, audited). `crypto.ts` now exports `poseidonHashHex`, `poseidonField{1..5}`, `hexToField`, `fieldToHex`, `strToField`, `BN254_PRIME`. SHA-256 retained for ID generation, KDFs, AES key derivation, Ed25519 signing message — anything outside the circuit.
- **Encoding rules (canonical, no ambiguity):**
  - `commitment = Poseidon4(value, strToField(asset), strToField(owner), hexToField(salt))`
  - `nullifier = Poseidon2(hexToField(commitment), hexToField(nk))`
  - `merkleHashPair = Poseidon2(hexToField(left), hexToField(right))`
  - Arbitrary strings (asset codes, fingerprint labels) ALWAYS go through `strToField` (SHA-256→field). Hex field elements (commitments, salts, derived secrets) go through `hexToField` directly. Single canonical encoding per field, no auto-detection.
- **Value hygiene:** `computeCommitment` and `computeValueHash` reject non-numbers, non-finite, negative, or non-safe-integer values explicitly.
- **Migration:** `zk_meta(key, value)` table records `hash_scheme=poseidon-bn254-v1`. On startup, db.ts wipes `zk_signing_requests/onchain_txs/settlements/proofs/nullifiers/commitments/merkle_nodes/notes` (dependents first) **inside a single SQLite transaction** along with the marker write — either fully migrated or nothing changes. One-shot, idempotent.
- **Real Groth16 toolchain:** circom 2.1.9 binary at `.tools/circom`, `circomlib`, `snarkjs` installed. Toy preimage circuit at `server/circuits/preimage/preimage.circom` — proves "I know x such that Poseidon(x) = h" (213 non-linear constraints). Compiled artifacts: `preimage_js/preimage.wasm`, `preimage_final.zkey`, `verification_key.json`, `pot12_final.ptau` (4.7MB Powers of Tau, single-party local ceremony **NOT FOR PRODUCTION**).
- **Server module:** `server/domain/groth16.ts` exports `proveAndVerifyPreimage()` and `getGroth16Status()`. Uses snarkjs `groth16.fullProve` (~600ms) + `groth16.verify` (~15ms).
- **API endpoints:**
  - `GET /api/zk/groth16/status` — pipeline readiness (public).
  - `GET /api/zk/groth16/demo?preimage=2a` — **admin-gated** (requires `x-admin-key` header or `?key=`). Proving is CPU-expensive so unauthenticated access would be a DoS vector. Logs activity event `groth16_proof_verified`.
- **`/api/zk/system` flags:**
  - `system.snark_ready: false` — production transfer/membership circuits do NOT exist yet.
  - `system.snark_demo_ready: true` + `system.snark_demo_circuit: "preimage-knowledge-v1"` — only the toy demo pipeline is wired.
  - `hash_chain.scheme: "poseidon-bn254-v1"`, `system.version: "0.3.0-alpha"`.
- **CIRCUIT_CONFIG:** `preimage` entry `available: true`. `transfer` and `membership` remain `false` — production circuits not yet built (require multi-party trusted setup).
- **Honesty in UI:** Groth16 status object explicitly labels `setup.powers_of_tau` and `setup.phase2` as `"single-party local ceremony (NOT FOR PRODUCTION)"`. `system.note` warns this is a toy circuit only.
- **Still scaffold:** Production transfer circuit (membership + nullifier derivation + balance check), multi-party trusted setup ceremony, on-chain Groth16 verifier program (Solana), X25519 viewing keys, HSM custody.

## Per-Wallet Dashboard Scoping (Phase 4)
- **All dashboard views are wallet-scoped** — switching wallets shows different data
- **Ownership columns:** `transfers.initiated_by_wallet`, `payroll_batches.created_by_wallet`, `treasury_routes.created_by_wallet`, `counterparties.created_by_wallet`, `activity_events.wallet_address` (auto-migrated via ALTER)
- **List endpoints** (`GET /api/{transfers,payroll,treasury,counterparties,activity}`): require `?wallet=` — return `[]` when missing (no global fallback)
- **Dashboard stats** (`GET /api/dashboard?wallet=`): all aggregates (transfers, payroll, treasury, counterparties, recentActivity) filtered by wallet; returns zeros + `walletScoped:false` when wallet missing
- **Create endpoints:** accept `walletAddress` (or `createdByWallet` for counterparties) in POST body, store in ownership column, pass to `logActivity({walletAddress})`
- **Frontend pattern:** every page calls `useWallet()`, scopes API requests to `wallet?.address`, reloads via `useEffect([wallet?.address])`, shows "Connect a wallet" empty state, disables create buttons when no wallet
- **Known limitations** (out of scope, future signature-auth work):
  - GET `/:id` and PATCH `/:id` do not enforce per-row ownership
  - Wallet identity in query/body is client-asserted (no signed proof binding caller to wallet)

## signTransaction Flow (Phase 3)
- **Real flow:** Backend builds serialized Solana Transaction → wallet.signTransaction() → submit → confirm
- **Prepare:** `POST /api/zk/tx/prepare` → `{ request_id, serialized_tx (base64), network, explorer_url }`
- **Frontend:** Lazy-imports @solana/web3.js; uses `Transaction.from(Buffer.from(base64,'base64'))`, `wallet.signTransaction(tx)`, `connection.sendRawTransaction(rawTx)`
- **Confirm:** `POST /api/zk/tx/confirm` → records real tx signature + explorer URL in DB
- **Legacy endpoints:** `POST /api/zk/signing/*` → 410 Gone (deprecated)

## Wallet Integration (Phase 3)
- **Frontend:** `WalletProvider` + `WalletButton` + `WalletStatusPanel` using `window.solana` API
- **Compatible with:** Phantom, Backpack, Solflare (any injected Solana wallet)
- **Identity resolve:** Automatic on connect via `POST /api/identity/resolve`
- **signAndSubmitTx(settlementId):** Full signTransaction + sendRawTransaction + confirm flow in WalletContext
- **Heavy adapter packages** (`@solana/wallet-adapter-*`): Not installed — using `window.solana` directly

## Phase 7 — Dashboard UI Surfacing (Cryptographic Stack)
The dashboard now exposes Phase A+B+C status to operators:
- **Cryptographic Stack banner** at top of `/dashboard` shows:
  - **Hash chain**: scheme + curve from `zk.hash_chain` (poseidon-bn254-v1, BN254)
  - **Groth16 toolchain**: circuit_id + constraint count + READY badge from `zk.groth16` (preimage-knowledge-v1, 213 constraints, single-party setup disclosed)
  - **Production transfer SNARK**: status from `zk.system.snark_ready` (currently `not built`, with disclosure that it needs membership + balance circuit + multi-party setup)
- **"Run Groth16 Demo" button** (admin-gated): prompts for ADMIN_KEY, stored in `sessionStorage` (cleared on tab close — narrower XSS window than localStorage). Only persists key after successful verified call. On 401/unauthorized, clears stored key and reprompts. Calls `GET /api/zk/groth16/demo`. Displays prove_ms + verify_ms + verified result.
- **Operator balance pill** in On-chain Transactions header: from `zk.solana.funded.balance`, color-coded green/red at 0.05 SOL threshold.
- **Devnet Explorer link** for operator address: shown only when `zk.solana.network === "devnet"` (devnet-only per requirement).
- New types in `src/lib/api.ts`: `ZkHashChainInfo`, `ZkGroth16Status`, `ZkGroth16DemoResult`, `ZkSolanaResponse`. Extended `ZkSystemInfo.system` with `snark_demo_ready`, `snark_demo_circuit`, `snark_circuit`. New `api.zk.groth16.{status, demo}` client methods.

## ZK API Routes (/api/zk/*)
- `GET /api/zk/system` — Full system metrics (powers dashboard ZK observability panel + Cryptographic Stack banner)
- `GET /api/zk/groth16/status` — Public: Groth16 toolchain availability + setup metadata
- `GET /api/zk/groth16/demo` — Admin-gated (`x-admin-key` header): runs real Groth16 prove+verify on toy preimage circuit (~600ms CPU)
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

## Early-Access Gating (Sprint A)
- **Gating model**: Product surface (`/dashboard`, `/transfers`, `/payroll`, `/treasury`, `/counterparties`, `/activity`) requires an **approved early-access application** with a **linked Solana wallet**.
- **Approval statuses**: `qualified`, `pilot_candidate`, `contacted` (defined as `ACCESS_GRANTING_STATUSES` in `server/db.ts`). When admin moves an application into any of these for the first time, `approved_at` is auto-stamped.
- **Application columns added**: `wallet_address` (UNIQUE per app, nullable), `approved_at` (nullable ISO timestamp).
- **Backend access router** (`server/routes/access.ts`):
  - `GET /api/access/check?wallet=…` — returns `{ hasAccess, reason, application }`
  - `POST /api/access/link-wallet` `{ applicationId, walletAddress }` — one-time wallet linkage with collision protection
  - `requireApprovedWallet` middleware — reads wallet from `x-wallet-address` header OR `wallet_address`/`initiated_by_wallet` body field; gates `POST /api/zk/settlement/initiate` and `POST /api/zk/tx/prepare`.
- **Frontend**:
  - `src/hooks/useAccess.ts` — polls `/api/access/check` for connected wallet
  - `src/components/app/AccessGate.tsx` — wraps gated routes, handles not-connected / no-app / pending / rejected / link-wallet flows
  - `src/components/app/TrustBanner.tsx` — always-visible yellow devnet/D1 banner with link to `/trust-model`
  - `src/routes/trust-model.tsx` — public roadmap page (D1 shipped / D2 in progress / D3 planned)
  - `apply.tsx` captures connected wallet at submit, `submitted.tsx` shows wallet linking UI, `admin/applications.tsx` shows wallet column + approved_at.

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
