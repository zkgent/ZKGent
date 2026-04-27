/**
 * ZKGENT Cryptographic Primitives
 *
 * STATUS:
 *   - SHA-256 hash abstraction: IMPLEMENTED (Node.js crypto, used for IDs/KDFs)
 *   - Poseidon hash (BN254, ZK-friendly): IMPLEMENTED via poseidon-lite
 *   - Field arithmetic helpers (BN254 scalar field): IMPLEMENTED
 *   - Pedersen commitment: SCAFFOLD (use circomlibjs if needed)
 *
 * The `hash()` family remains SHA-256 for non-circuit utilities (encryption
 * key derivation, ID generation, display fingerprints). The new `poseidonHash*`
 * family replaces SHA-256 inside the ZK hash chain (commitments, nullifiers,
 * Merkle nodes) so future Circom circuits can prove statements over the same
 * data. See commitment.ts, nullifier.ts, merkle.ts.
 */

import crypto from "crypto";
import { poseidon1, poseidon2, poseidon3, poseidon4, poseidon5 } from "poseidon-lite";

export type HexString = string;
export type Bytes32 = HexString;

/** Domain separation tags to prevent cross-context hash collisions */
export const DOMAIN = {
  COMMITMENT: "zkgent:commitment:v1",
  NULLIFIER: "zkgent:nullifier:v1",
  NOTE_HASH: "zkgent:note:v1",
  MERKLE: "zkgent:merkle:v1",
  KEY_DERIVE: "zkgent:key:v1",
} as const;

// ─── BN254 Scalar Field ────────────────────────────────────────────────────────

/**
 * BN254 scalar field prime — used by circomlib Poseidon and Groth16 proofs.
 * All Poseidon inputs are reduced modulo this prime.
 */
export const BN254_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Convert hex (with or without 0x) to a BN254 field element. */
export function hexToField(hex: string): bigint {
  const s = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (s.length === 0) return 0n;
  return BigInt("0x" + s) % BN254_PRIME;
}

/** Convert a field element to a 64-char hex string (big-endian, zero-padded). */
export function fieldToHex(x: bigint): Bytes32 {
  let v = x % BN254_PRIME;
  if (v < 0n) v += BN254_PRIME;
  return v.toString(16).padStart(64, "0");
}

/**
 * Hash an arbitrary string into a BN254 field element via SHA-256.
 * Used to bring strings (asset codes, domain tags) into the field for
 * Poseidon consumption. Bias is negligible for our use.
 */
export function strToField(s: string): bigint {
  const sha = crypto.createHash("sha256").update(s).digest("hex");
  return hexToField(sha);
}

/**
 * Robust string → field converter.
 *   - If the input looks like pure hex (≤ 66 chars including optional 0x),
 *     treat as a 256-bit number and reduce mod p.
 *   - Otherwise, hash via SHA-256 first (so labels like "ZKG:OPERATOR:..."
 *     work without callers needing to pre-hash).
 */
export function toField(s: string): bigint {
  if (typeof s !== "string") return 0n;
  const stripped = s.startsWith("0x") ? s.slice(2) : s;
  if (stripped.length > 0 && stripped.length <= 64 && /^[0-9a-fA-F]+$/.test(stripped)) {
    return hexToField(s);
  }
  return strToField(s);
}

// ─── SHA-256 (non-circuit utilities) ──────────────────────────────────────────

/**
 * SHA-256 hash. Used for:
 *   - Note ID derivation
 *   - Display fingerprints
 *   - HKDF-style key derivation (see deriveKey)
 *   - Operator Ed25519 signing message digest
 * NOT used inside the ZK hash chain anymore — that's Poseidon (see below).
 */
export function hash(...inputs: string[]): Bytes32 {
  const h = crypto.createHash("sha256");
  for (const input of inputs) {
    h.update(input);
    h.update("\x00"); // null separator
  }
  return h.digest("hex");
}

export function domainHash(domain: string, ...inputs: string[]): Bytes32 {
  return hash(domain, ...inputs);
}

export function randomSalt(): Bytes32 {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a random scalar in the BN254 field (for ZK-friendly salts).
 * Returns 64-char hex representing a value in [0, BN254_PRIME).
 */
export function randomFieldSalt(): Bytes32 {
  // Generate 31 bytes (< 248 bits) so result is always < BN254_PRIME without bias.
  const bytes = crypto.randomBytes(31);
  const v = BigInt("0x" + bytes.toString("hex"));
  return fieldToHex(v);
}

export function deriveKey(seed: string, context: string): Bytes32 {
  return crypto.createHmac("sha256", Buffer.from(seed, "hex")).update(context).digest("hex");
}

export function xorHex(a: Bytes32, b: Bytes32): Bytes32 {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return Buffer.from(ba.map((byte, i) => byte ^ bb[i])).toString("hex");
}

export function shortHash(h: Bytes32, len = 8): string {
  return h.slice(0, len);
}

// ─── Poseidon (ZK-friendly hash, BN254) ───────────────────────────────────────

/**
 * Poseidon hash — circuit-compatible with circomlib's Poseidon component.
 * IMPLEMENTED via poseidon-lite (audited by Veridise).
 *
 * Inputs are field elements (BigInt mod BN254_PRIME). Output is a 64-char hex
 * representation of a field element. Use the `*Hex` variants for our pipeline
 * which works in hex.
 */

export function poseidonField1(a: bigint): bigint {
  return poseidon1([a]);
}
export function poseidonField2(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
}
export function poseidonField3(a: bigint, b: bigint, c: bigint): bigint {
  return poseidon3([a, b, c]);
}
export function poseidonField4(a: bigint, b: bigint, c: bigint, d: bigint): bigint {
  return poseidon4([a, b, c, d]);
}
export function poseidonField5(a: bigint, b: bigint, c: bigint, d: bigint, e: bigint): bigint {
  return poseidon5([a, b, c, d, e]);
}

/** Poseidon over hex inputs. Each hex string is interpreted as a field element. */
export function poseidonHashHex(...hexInputs: string[]): Bytes32 {
  const fields = hexInputs.map(hexToField);
  let out: bigint;
  switch (fields.length) {
    case 1:
      out = poseidon1(fields);
      break;
    case 2:
      out = poseidon2(fields);
      break;
    case 3:
      out = poseidon3(fields);
      break;
    case 4:
      out = poseidon4(fields);
      break;
    case 5:
      out = poseidon5(fields);
      break;
    default:
      throw new Error(`poseidonHashHex: unsupported arity ${fields.length} (max 5)`);
  }
  return fieldToHex(out);
}

/**
 * Hash scheme version marker — used by db.ts migration to detect when the
 * cryptographic scheme has changed and old data must be wiped.
 */
export const ZK_HASH_SCHEME = "poseidon-bn254-v1";
