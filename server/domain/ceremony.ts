/**
 * ZKGENT Ceremony state exposure
 *
 * Reads the on-disk ceremony manifest and presents a sanitized view for the
 * API. Performs lightweight integrity checks (file existence + manifest
 * structural sanity). Heavyweight cryptographic verification is done by the
 * `npm run ceremony:verify` CLI, not on every API hit.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CEREMONY_DIR = path.resolve(__dirname, "..", "circuits", "transfer", "ceremony");
const MANIFEST_PATH = path.join(CEREMONY_DIR, "manifest.json");
const BUILD_DIR = path.resolve(__dirname, "..", "circuits", "transfer", "build");
const FINAL_ZKEY = path.join(BUILD_DIR, "transfer_final.zkey");
const VKEY_PATH = path.join(BUILD_DIR, "verification_key.json");

export interface CeremonyContribution {
  index: number;
  name: string;
  handle: string;
  slug: string;
  note: string | null;
  contributed_at: string;
  prev_zkey_hash: string;
  new_zkey_hash: string;
  entropy_bits: number;
  entropy_commitment_sha256: string;
  contribute_ms?: number;
}

export interface CeremonyBeacon {
  source: string;
  rpc: string;
  slot: number;
  blockhash: string;
  block_time: number | null;
  beacon_hex: string;
  iterations: number;
  applied_at: string;
  prev_zkey_hash: string;
  beacon_zkey_hash: string;
  final_zkey_hash: string;
  verification_key_hash: string;
  note?: string;
}

export interface CeremonyState {
  available: boolean;
  reason?: string;
  schema_version?: number;
  circuit_id?: string;
  created_at?: string;
  contributors_count: number;
  contributions: CeremonyContribution[];
  beacon: CeremonyBeacon | null;
  beacon_applied: boolean;
  final_zkey_hash: string | null;
  verification_key_hash: string | null;
  derived_final_zkey_hash: string | null;
  derived_vkey_hash: string | null;
  hashes_consistent: boolean;
  trust_level:
    | "none"
    | "single_party"
    | "single_party_plus_beacon"
    | "multi_party"
    | "multi_party_plus_beacon";
  trust_summary: string;
  last_contribution_at: string | null;
  manifest_path_rel: string;
  fetched_at: string;
}

/** Synchronous SHA-256 of a file. Files are tens of KB → fine. For multi-MB
 *  zkey files we still do this synchronously since it runs only on /system
 *  / /ceremony hits which are cached client-side. */
function sha256File(p: string): string | null {
  try {
    const buf = fs.readFileSync(p);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function classifyTrust(
  contribCount: number,
  beaconApplied: boolean,
): { trust_level: CeremonyState["trust_level"]; trust_summary: string } {
  if (contribCount === 0 && !beaconApplied) {
    return {
      trust_level: "none",
      trust_summary: "No phase-2 contributions recorded.",
    };
  }
  if (contribCount === 1 && !beaconApplied) {
    return {
      trust_level: "single_party",
      trust_summary: "1 contributor only, no public beacon — toxic waste held by single party.",
    };
  }
  if (contribCount === 1 && beaconApplied) {
    return {
      trust_level: "single_party_plus_beacon",
      trust_summary:
        "1 contributor + Solana mainnet beacon. Beacon prevents the contributor from controlling the final randomness, but soundness still relies on either (a) the contributor destroying their secret OR (b) the beacon being honest.",
    };
  }
  if (contribCount >= 2 && !beaconApplied) {
    return {
      trust_level: "multi_party",
      trust_summary: `${contribCount} contributors, no beacon yet. Soundness holds as long as ANY ONE contributor was honest, but the last contributor still has timing knowledge of their own randomness — apply a beacon to finalize.`,
    };
  }
  return {
    trust_level: "multi_party_plus_beacon",
    trust_summary: `${contribCount} contributors + Solana mainnet beacon. Soundness holds as long as ANY ONE contributor or the beacon was honest — this is the standard MPC trust model. (Note: the system records contributor self-attestations; independence is not cryptographically verified.)`,
  };
}

export function getCeremonyState(): CeremonyState {
  const fetched_at = new Date().toISOString();
  const manifest_path_rel = path.relative(process.cwd(), MANIFEST_PATH);

  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      available: false,
      reason: "manifest_missing",
      contributors_count: 0,
      contributions: [],
      beacon: null,
      beacon_applied: false,
      final_zkey_hash: null,
      verification_key_hash: null,
      derived_final_zkey_hash: null,
      derived_vkey_hash: null,
      hashes_consistent: false,
      trust_level: "none",
      trust_summary: "Ceremony manifest not found on disk.",
      last_contribution_at: null,
      manifest_path_rel,
      fetched_at,
    };
  }

  let manifest: any;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err: any) {
    return {
      available: false,
      reason: `manifest_parse_error: ${err.message}`,
      contributors_count: 0,
      contributions: [],
      beacon: null,
      beacon_applied: false,
      final_zkey_hash: null,
      verification_key_hash: null,
      derived_final_zkey_hash: null,
      derived_vkey_hash: null,
      hashes_consistent: false,
      trust_level: "none",
      trust_summary: "Ceremony manifest could not be parsed.",
      last_contribution_at: null,
      manifest_path_rel,
      fetched_at,
    };
  }

  const contributions: CeremonyContribution[] = (manifest.contributions ?? [])
    .map((c: any) => ({
      index: c.index,
      name: c.name,
      handle: c.handle,
      slug: c.slug,
      note: c.note ?? null,
      contributed_at: c.contributed_at,
      prev_zkey_hash: c.prev_zkey_hash,
      new_zkey_hash: c.new_zkey_hash,
      entropy_bits: c.entropy_bits,
      entropy_commitment_sha256: c.entropy_commitment_sha256,
      contribute_ms: c.contribute_ms,
    }))
    .sort((a: CeremonyContribution, b: CeremonyContribution) => a.index - b.index);

  const beacon: CeremonyBeacon | null = manifest.beacon ?? null;
  const beacon_applied = !!beacon;

  const derived_final_zkey_hash = sha256File(FINAL_ZKEY);
  const derived_vkey_hash = sha256File(VKEY_PATH);
  const hashes_consistent =
    derived_final_zkey_hash === manifest.final_zkey_hash &&
    derived_vkey_hash === manifest.verification_key_hash;

  const last_contribution_at =
    contributions.length > 0 ? contributions[contributions.length - 1].contributed_at : null;

  const trust = classifyTrust(contributions.length, beacon_applied);

  return {
    available: true,
    schema_version: manifest.schema_version,
    circuit_id: manifest.circuit_id,
    created_at: manifest.created_at,
    contributors_count: contributions.length,
    contributions,
    beacon,
    beacon_applied,
    final_zkey_hash: manifest.final_zkey_hash ?? null,
    verification_key_hash: manifest.verification_key_hash ?? null,
    derived_final_zkey_hash,
    derived_vkey_hash,
    hashes_consistent,
    last_contribution_at,
    manifest_path_rel,
    fetched_at,
    ...trust,
  };
}

/** Compact summary for embedding in /api/zk/system. */
export function getCeremonySummary() {
  const s = getCeremonyState();
  return {
    available: s.available,
    contributors_count: s.contributors_count,
    beacon_applied: s.beacon_applied,
    trust_level: s.trust_level,
    trust_summary: s.trust_summary,
    final_zkey_hash: s.final_zkey_hash,
    verification_key_hash: s.verification_key_hash,
    hashes_consistent: s.hashes_consistent,
    last_contribution_at: s.last_contribution_at,
  };
}
