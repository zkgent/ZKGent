/**
 * ZKGent Ceremony Helper Library
 *
 * Provides:
 *   - Manifest read/write (append-only chain of contributions)
 *   - Hashing helpers (BLAKE2b-256 over zkey files)
 *   - Solana beacon fetch (mainnet finalized block hash for verifiable randomness)
 *   - Schema constants
 *
 * The ceremony chain has the following structure:
 *
 *   transfer_0000.zkey         (initial groth16 setup output, single party)
 *     │
 *     ▼
 *   contribution_0001.zkey     (first community contribution: secret entropy)
 *     │
 *     ▼
 *   contribution_NNNN.zkey     (more contributions, append-only)
 *     │
 *     ▼
 *   transfer_beacon.zkey       (final beacon contribution: PUBLIC entropy from
 *                               Solana mainnet, prevents rigged final randomness)
 *     │
 *     ▼
 *   transfer_final.zkey        (= transfer_beacon.zkey, copied for production use)
 *
 * Soundness: as long as ANY ONE contributor (or the beacon) was honest about
 * destroying their secret, the toxic waste is unrecoverable and proofs cannot
 * be forged.
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CEREMONY_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "server",
  "circuits",
  "transfer",
  "ceremony",
);
export const CIRCUIT_BUILD_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "server",
  "circuits",
  "transfer",
  "build",
);

export const MANIFEST_PATH = path.join(CEREMONY_DIR, "manifest.json");
export const CONTRIBUTIONS_DIR = path.join(CEREMONY_DIR, "contributions");
export const ATTESTATIONS_DIR = path.join(CEREMONY_DIR, "contributions");

export const CIRCUIT_ID = "zkgent-transfer-v1";
export const CIRCUIT_INITIAL_ZKEY = path.join(CIRCUIT_BUILD_DIR, "transfer_0000.zkey");
export const CIRCUIT_FINAL_ZKEY = path.join(CIRCUIT_BUILD_DIR, "transfer_final.zkey");
export const CIRCUIT_VKEY = path.join(CIRCUIT_BUILD_DIR, "verification_key.json");
export const CIRCUIT_R1CS = path.join(CIRCUIT_BUILD_DIR, "transfer.r1cs");
export const CIRCUIT_PTAU = path.resolve(
  __dirname,
  "..",
  "..",
  "server",
  "circuits",
  "transfer",
  "pot14_hermez.ptau",
);

export const MANIFEST_SCHEMA_VERSION = 1;

/** SHA-256 hex digest of a file's contents (streaming, memory-safe). */
export async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/** Bytes -> short fingerprint for display (first 8 + last 8 hex chars). */
export function shortHash(hex) {
  if (!hex || hex.length < 16) return hex || "";
  return `${hex.slice(0, 8)}…${hex.slice(-8)}`;
}

/** Load manifest or return a fresh one (does not write). */
export function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      schema_version: MANIFEST_SCHEMA_VERSION,
      circuit_id: CIRCUIT_ID,
      created_at: new Date().toISOString(),
      contributions: [],
      beacon: null,
      final_zkey_hash: null,
      verification_key_hash: null,
    };
  }
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

/** Atomically write the manifest. */
export function saveManifest(manifest) {
  if (!fs.existsSync(CEREMONY_DIR)) {
    fs.mkdirSync(CEREMONY_DIR, { recursive: true });
  }
  const tmp = MANIFEST_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n");
  fs.renameSync(tmp, MANIFEST_PATH);
}

/**
 * Append a contribution entry to the manifest and persist its detailed
 * attestation JSON in /contributions/. Returns the new entry.
 */
export function appendContribution(manifest, entry) {
  manifest.contributions.push(entry);
  saveManifest(manifest);
  if (!fs.existsSync(ATTESTATIONS_DIR)) {
    fs.mkdirSync(ATTESTATIONS_DIR, { recursive: true });
  }
  const attestPath = path.join(
    ATTESTATIONS_DIR,
    `${String(entry.index).padStart(4, "0")}-${slugify(entry.handle)}.json`,
  );
  fs.writeFileSync(attestPath, JSON.stringify(entry, null, 2) + "\n");
  return entry;
}

/** Set the beacon entry on the manifest and persist. */
export function setBeacon(manifest, beacon) {
  manifest.beacon = beacon;
  saveManifest(manifest);
  const attestPath = path.join(ATTESTATIONS_DIR, "beacon.json");
  if (!fs.existsSync(ATTESTATIONS_DIR)) {
    fs.mkdirSync(ATTESTATIONS_DIR, { recursive: true });
  }
  fs.writeFileSync(attestPath, JSON.stringify(beacon, null, 2) + "\n");
}

/** Make a filesystem-safe slug from a handle. */
export function slugify(s) {
  return (
    (s || "anonymous")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 32) || "anonymous"
  );
}

/**
 * Fetch a finalized Solana mainnet block hash for use as a public verifiable
 * beacon. We use the mainnet RPC; consumers can re-verify by hitting the same
 * endpoint with the recorded slot.
 */
export async function fetchSolanaBeacon() {
  const url = "https://api.mainnet-beta.solana.com";
  const slotResp = await rpc(url, "getSlot", [{ commitment: "finalized" }]);
  const slot = slotResp.result;
  if (typeof slot !== "number") {
    throw new Error(`getSlot returned non-numeric result: ${JSON.stringify(slotResp)}`);
  }
  const blockResp = await rpc(url, "getBlock", [
    slot,
    {
      encoding: "json",
      transactionDetails: "none",
      rewards: false,
      maxSupportedTransactionVersion: 0,
    },
  ]);
  if (!blockResp.result || !blockResp.result.blockhash) {
    throw new Error(`getBlock returned no blockhash: ${JSON.stringify(blockResp)}`);
  }
  const blockhash = blockResp.result.blockhash;
  const blockTime = blockResp.result.blockTime ?? null;
  // 32-byte beacon: SHA-256("zkgent-ceremony-beacon-v1" || slot || blockhash)
  const beaconBytes = createHash("sha256")
    .update("zkgent-ceremony-beacon-v1")
    .update(String(slot))
    .update(blockhash)
    .digest();
  return {
    source: "solana-mainnet-beta",
    rpc: url,
    slot,
    blockhash,
    block_time: blockTime,
    beacon_hex: beaconBytes.toString("hex"),
    note: `Re-derive: SHA256("zkgent-ceremony-beacon-v1" || ${slot} || "${blockhash}")`,
  };
}

async function rpc(url, method, params) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!resp.ok) throw new Error(`RPC ${method} HTTP ${resp.status}`);
  return resp.json();
}

/** Pretty timestamp helper. */
export function nowIso() {
  return new Date().toISOString();
}
