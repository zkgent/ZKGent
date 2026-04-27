/**
 * ZKGENT Cryptographic Primitives
 *
 * STATUS:
 *   - SHA-256 hash abstraction: IMPLEMENTED (Node.js crypto)
 *   - Poseidon hash (ZK-friendly): SCAFFOLD — requires circomlib/snarkjs or bellman
 *   - BN254/BLS12-381 field arithmetic: SCAFFOLD
 *   - Pedersen commitment: SCAFFOLD
 *
 * The hash abstraction layer is designed so the underlying implementation
 * can be swapped for a ZK-native hash (Poseidon, MiMC) without changing
 * the interface.
 */

import crypto from "crypto";

export type HexString = string;
export type Bytes32 = HexString;

/** Domain separation tags to prevent cross-context hash collisions */
export const DOMAIN = {
  COMMITMENT: "zkgent:commitment:v1",
  NULLIFIER:  "zkgent:nullifier:v1",
  NOTE_HASH:  "zkgent:note:v1",
  MERKLE:     "zkgent:merkle:v1",
  KEY_DERIVE: "zkgent:key:v1",
} as const;

/**
 * Primary hash function.
 * IMPLEMENTED: SHA-256 (collision-resistant, production-grade for non-ZK use)
 * SCAFFOLD: Replace with Poseidon2 for actual zk-SNARK circuit compatibility
 */
export function hash(...inputs: string[]): Bytes32 {
  const h = crypto.createHash("sha256");
  for (const input of inputs) {
    h.update(input);
    h.update("\x00"); // null separator
  }
  return h.digest("hex");
}

/**
 * Domain-separated hash — prevents cross-system collision.
 * IMPLEMENTED.
 */
export function domainHash(domain: string, ...inputs: string[]): Bytes32 {
  return hash(domain, ...inputs);
}

/**
 * Cryptographically secure random 32-byte salt.
 * IMPLEMENTED.
 */
export function randomSalt(): Bytes32 {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Derive a deterministic key from a seed using HKDF-like construction.
 * IMPLEMENTED: HKDF with SHA-256.
 * SCAFFOLD: In production, use proper BIP-32 / SLIP-10 for Solana key derivation.
 */
export function deriveKey(seed: string, context: string): Bytes32 {
  return crypto
    .createHmac("sha256", Buffer.from(seed, "hex"))
    .update(context)
    .digest("hex");
}

/**
 * XOR two hex strings (same length).
 * Used in some encryption schemes.
 * IMPLEMENTED.
 */
export function xorHex(a: Bytes32, b: Bytes32): Bytes32 {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return Buffer.from(ba.map((byte, i) => byte ^ bb[i])).toString("hex");
}

/**
 * Truncate a hex hash to N characters for display.
 * IMPLEMENTED.
 */
export function shortHash(h: Bytes32, len = 8): string {
  return h.slice(0, len);
}
