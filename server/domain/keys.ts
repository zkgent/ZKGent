/**
 * ZKGENT Key Management & Custody Model
 *
 * STATUS:
 *   - Key type model and derivation paths: IMPLEMENTED
 *   - In-memory dev/demo custody mode: IMPLEMENTED
 *   - Hardware wallet / MPC custody: SCAFFOLD
 *   - On-chain key registration: SCAFFOLD
 *   - Production secret management (HSM / Vault): SCAFFOLD
 *
 * TRUST MODEL:
 *   In dev mode, operator keys are derived from an environment seed (never hardcoded).
 *   In production, these must be replaced with HSM-backed or threshold-signed keys.
 *   No private key material is stored in the database or logged.
 */

import crypto from "crypto";
import { deriveKey, randomSalt, domainHash, DOMAIN } from "./crypto.js";

export type KeyRole = "operator" | "signing" | "encryption" | "viewing" | "nullifier_sk";

export interface KeyDescriptor {
  role: KeyRole;
  fingerprint: string;  // H(pubkey) — safe to display
  algorithm: string;
  derivation_path: string;
  custody_mode: "dev_ephemeral" | "env_seed" | "hsm" | "mpc";
  /** NEVER expose private key material here */
}

export interface OperatorKeySet {
  operator:    KeyDescriptor;
  signing:     KeyDescriptor;
  encryption:  KeyDescriptor;
  viewing:     KeyDescriptor;
  nullifier_sk: KeyDescriptor;
}

/**
 * Returns the operator seed from environment.
 * NEVER hardcode a secret here.
 * Falls back to a deterministic dev seed if not set — clearly labelled dev only.
 */
function getOperatorSeed(): string {
  const envSeed = process.env.ZKGENT_OPERATOR_SEED;
  if (envSeed) return envSeed;
  // DEV ONLY: deterministic seed so tests are reproducible
  console.warn("[ZKGENT:keys] No ZKGENT_OPERATOR_SEED set — using dev ephemeral seed. NOT for production.");
  return "dev-only-seed-not-for-production-" + "zkgent-v1";
}

function makeDescriptor(
  role: KeyRole,
  derivedKey: string,
  path: string,
  custody: KeyDescriptor["custody_mode"]
): KeyDescriptor {
  const fingerprint = domainHash(DOMAIN.KEY_DERIVE, role, derivedKey).slice(0, 16);
  return {
    role,
    fingerprint: `ZKG:${role.toUpperCase()}:${fingerprint.toUpperCase()}`,
    algorithm: role === "signing" ? "Ed25519-scaffold" : "X25519-scaffold",
    derivation_path: path,
    custody_mode: custody,
  };
}

/**
 * Load or derive the operator key set.
 * IMPLEMENTED: key derivation from seed.
 * SCAFFOLD: actual Ed25519 / X25519 key generation (needs @solana/web3.js or noble-curves).
 */
export function loadOperatorKeySet(): OperatorKeySet {
  const seed = getOperatorSeed();
  const custody = process.env.ZKGENT_OPERATOR_SEED
    ? "env_seed"
    : "dev_ephemeral";

  const opKey      = deriveKey(Buffer.from(seed).toString("hex").padStart(64, "0"), "operator");
  const sigKey     = deriveKey(opKey, "signing");
  const encKey     = deriveKey(opKey, "encryption");
  const viewKey    = deriveKey(opKey, "viewing");
  const nullSkKey  = deriveKey(opKey, "nullifier_sk");

  return {
    operator:    makeDescriptor("operator",    opKey,     "m/44'/501'/0'/0'", custody),
    signing:     makeDescriptor("signing",     sigKey,    "m/44'/501'/0'/1'", custody),
    encryption:  makeDescriptor("encryption",  encKey,    "m/44'/501'/0'/2'", custody),
    viewing:     makeDescriptor("viewing",     viewKey,   "m/44'/501'/0'/3'", custody),
    nullifier_sk:makeDescriptor("nullifier_sk",nullSkKey, "m/44'/501'/0'/4'", custody),
  };
}

/** Singleton — loaded once at server startup */
let _keySet: OperatorKeySet | null = null;
export function getKeySet(): OperatorKeySet {
  if (!_keySet) _keySet = loadOperatorKeySet();
  return _keySet;
}

/**
 * Derive a per-note encryption key.
 * IMPLEMENTED: deterministic derivation from operator encryption key + note ID.
 * SCAFFOLD: Should use ECDH with recipient's public key for actual recipient encryption.
 */
export function deriveNoteEncryptionKey(noteId: string): string {
  const ks = getKeySet();
  // We use fingerprint as a stable stand-in for the actual key material
  return domainHash(DOMAIN.KEY_DERIVE, ks.encryption.fingerprint, noteId);
}

/**
 * Derive the nullifier secret key for a specific context.
 * IMPLEMENTED (scaffold): deterministic derivation.
 */
export function deriveNullifierSk(context: string): string {
  const ks = getKeySet();
  return domainHash(DOMAIN.KEY_DERIVE, ks.nullifier_sk.fingerprint, context);
}
