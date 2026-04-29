# ZKGent Trusted-Setup Ceremony

The ZKGent transfer circuit (`zkgent-transfer-v1`, ~5,914 R1CS constraints over BN254 with Poseidon) is a Groth16 SNARK. Groth16 needs a **per-circuit Phase-2 trusted setup**. The security guarantee is:

> As long as **any one** participant in the chain (including the public beacon) is honest about destroying their secret randomness, the resulting proving key is sound — i.e. proofs cannot be forged.

You don't need to trust everyone. You need to trust that **at least one** link of the chain is honest. More contributors → stronger.

This document explains how to inspect the current chain, how to verify it from scratch, and how to add your own contribution.

---

## Public chain (live)

- Public page: [`/ceremony`](/ceremony)
- API: `GET /api/zk/ceremony`
- Manifest on disk: [`server/circuits/transfer/ceremony/manifest.json`](server/circuits/transfer/ceremony/manifest.json)
- Per-contribution attestations: `server/circuits/transfer/ceremony/contribution_NNNN.json`
- Per-contribution zkey artifacts: `server/circuits/transfer/ceremony/contribution_NNNN.zkey`
- Beacon attestation: `server/circuits/transfer/ceremony/beacon.json`
- Final artifacts (used in production):
  - `server/circuits/transfer/transfer_final.zkey`
  - `server/circuits/transfer/verification_key.json`

The Phase-1 powers-of-tau (`server/circuits/transfer/pot14_hermez.ptau`) is the multi-party Hermez ceremony (140+ contributors) and is reused unchanged.

---

## Verify the chain from scratch

Run locally:

```bash
npm run ceremony:verify
```

This walks the entire chain end-to-end:

1. Recompute SHA-256 of `transfer_0000.zkey` (the post-`zkey new` artifact) and verify it matches `contributions[0].prev_zkey_hash`.
2. For each contribution `i`:
   - Recompute SHA-256 of `contribution_i.zkey` and verify it matches `contributions[i].new_zkey_hash`.
   - Run `snarkjs zkey verify` against the Phase-1 `.ptau` and the previous zkey.
3. Verify the beacon:
   - SHA-256 of `beacon.zkey` matches `beacon.beacon_zkey_hash` and `beacon.final_zkey_hash`.
   - Re-derive `beacon_hex = SHA256("zkgent-ceremony-beacon-v1" ‖ slot ‖ blockhash)` and verify it matches the recorded value.
   - Run `snarkjs zkey verify` on the beacon zkey.
4. Verify `transfer_final.zkey` (the production artifact) matches the beacon zkey hash.
5. Verify `verification_key.json` SHA-256 matches the recorded value.

The script exits 0 only if **all** checks pass.

---

## Re-derive the beacon yourself

The Solana mainnet finalized blockhash chosen for the current beacon is publicly observable on any Solana RPC. The page at `/ceremony` shows the current `slot` and `blockhash`. Re-derive:

```js
import { createHash } from "crypto";
const SLOT = 416266933;
const BLOCKHASH = "55Ug69eXaZefCVDKkkWq1Cr4ZisB241xFunhZbq5Dyfn";
const beacon = createHash("sha256")
  .update("zkgent-ceremony-beacon-v1")
  .update(String(SLOT))
  .update(BLOCKHASH)
  .digest("hex");
console.log(beacon); // matches manifest.beacon.beacon_hex
```

Cross-check the slot/blockhash by hitting any Solana mainnet RPC:

```bash
curl -s https://api.mainnet-beta.solana.com -X POST -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getBlock","params":[416266933,{"transactionDetails":"none","rewards":false,"maxSupportedTransactionVersion":0}]}'
```

The `blockhash` returned must match `manifest.beacon.blockhash`. The block was finalized once and is immutable — anyone in the world can independently confirm the beacon is honest.

---

## Add your own contribution

Anyone can contribute. Each contribution strictly **increases** the security of the final proving key.

### Prerequisites

- Node 20+, `npm install` from the repo root.
- A clean checkout of the `main` branch with the current chain.
- A few minutes of CPU.

### 1. Run your contribution

```bash
npm run ceremony:contribute -- \
  --name "Your Name" \
  --handle "your-github-handle" \
  --note "Optional one-line context, e.g. organization or motivation"
```

What this does:

1. Reads the current tail of the chain (the most recent zkey).
2. Generates **1024 bits of OS-level entropy** (`crypto.randomBytes(128)`) inside your Node process.
3. Calls `snarkjs zkey contribute` with that entropy → produces `contribution_NNNN.zkey`.
4. Hashes the input and output zkey, hashes a SHA-256 commitment to the entropy (the entropy itself is **never** persisted — it stays in process memory and is destroyed when the script exits).
5. Runs `snarkjs zkey verify` against the previous zkey + Phase-1 ptau.
6. Appends a new entry to `manifest.json` and writes `contribution_NNNN.json`.

> **Toxic waste**: the entropy you generated is the "toxic waste". It exists only in RAM during step 3. When the Node process exits, it is gone. **Do not log it, do not write it to disk, do not screenshot the script output.** The script never prints the entropy itself, only the SHA-256 commitment to it.

### 2. Verify locally

```bash
npm run ceremony:verify
```

Should print all-green and exit 0.

### 3. Open a pull request

Commit and push:

- `server/circuits/transfer/ceremony/manifest.json` (updated)
- `server/circuits/transfer/ceremony/contribution_NNNN.zkey` (your contribution)
- `server/circuits/transfer/ceremony/contribution_NNNN.json` (your attestation)

Open a PR. The maintainers will:

1. Re-run `npm run ceremony:verify` against your branch.
2. Sanity-check the attestation (name/handle look real, note is appropriate).
3. Merge.

### 4. Beacon (maintainers only)

Once enough contributions are collected (target: 5+ from independent parties), a maintainer runs:

```bash
npm run ceremony:beacon
```

This:

1. Fetches the current Solana **mainnet** finalized slot and blockhash.
2. Derives a 32-byte beacon = `SHA256("zkgent-ceremony-beacon-v1" ‖ slot ‖ blockhash)`.
3. Calls `snarkjs zkey beacon` with 10 iterations on the beacon hex.
4. Replaces `transfer_final.zkey` and regenerates `verification_key.json`.
5. Writes `beacon.json` and updates the manifest.

The beacon prevents the **last** contributor from controlling the final randomness, because the last contributor cannot predict a future Solana blockhash.

---

## Threat model in plain English

**What protects you if all current contributors are malicious?**

- The Solana mainnet beacon. A finalized blockhash is decided by Solana validator consensus (3,000+ validators). For an attacker to bias it, they would need to control a supermajority of Solana stake — which is a much larger trust assumption than what they were trying to break in the first place. As long as Solana mainnet itself is honest, the beacon is honest.

**What protects you if the beacon is somehow biased?**

- Any one honest contributor in the chain. Their random secret was destroyed when their `node` process exited; nobody (including the maintainers) can recover it. Without that secret, no one can forge proofs against the final key.

**What if the maintainers swap the production zkey behind your back?**

- The hash of `transfer_final.zkey` is recomputed on **every** call to `/ceremony`, `/api/zk/system`, and `/api/zk/ceremony`. The result is exposed as `hashes_consistent` and `integrity_status`. When it diverges from the manifest, the API explicitly refuses to claim "PRODUCTION ZK ACTIVE" and the public ceremony page renders a red "Integrity check failed" banner. The manifest itself lives in git, so its history is auditable, but a coordinated swap of both manifest and on-disk zkey would not trip the live consistency check — that case is caught by `npm run ceremony:verify`, which additionally runs `snarkjs.zKey.verifyFromInit(transfer_0000.zkey, ptau, transfer_final.zkey)` to cryptographically prove the final zkey is a valid phase-2 extension of the initial setup encoded inside its own bytes. **Audit recommendation: run `npm run ceremony:verify` against any deploy you do not personally control.**

**What's not protected (yet)?**

- The current setup is `single_party_plus_beacon`. That is an honest description and is shown on `/ceremony`. The trust level upgrades to `multi_party_plus_beacon` automatically once a second independent contributor PR is merged.
- D1 trust model: the operator still sees plaintext value and `owner_secret`. That is independent of the ceremony and is being addressed in D2 (client-side proving). See `/trust-model`.

---

## Scripts reference

| Script | Purpose |
|---|---|
| `npm run ceremony:contribute -- --name "..." --handle "..." [--note "..."]` | Add a Phase-2 contribution. |
| `npm run ceremony:beacon` | (Maintainer) apply Solana mainnet beacon, finalize. |
| `npm run ceremony:verify` | Walk the whole chain end-to-end. Exits 0 if intact. |

All three live under `scripts/ceremony/`. All three are pure Node, no external services besides the public Solana RPC for the beacon.

---

## File layout

```
server/circuits/transfer/
├── transfer.circom                # circuit source
├── transfer.r1cs                  # compiled constraints
├── transfer_0000.zkey             # post-zkey-new initial setup (Phase-1 + R1CS)
├── transfer_final.zkey            # PRODUCTION artifact (= beacon zkey)
├── verification_key.json          # PRODUCTION verification key
├── pot14_hermez.ptau              # Phase-1 powers-of-tau (Hermez)
└── ceremony/
    ├── manifest.json              # canonical chain record (source of truth)
    ├── contribution_0001.zkey     # contributor #1's output zkey
    ├── contribution_0001.json     # contributor #1's attestation
    ├── contribution_NNNN.zkey     # ... future contributors
    ├── contribution_NNNN.json
    ├── beacon.zkey                # post-beacon zkey (= transfer_final.zkey)
    ├── beacon.json                # beacon attestation
    └── legacy_backup/             # zkeys from the pre-ceremony era, retained for audit
```
