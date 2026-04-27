/**
 * ZKGENT Proof Pipeline
 *
 * PROOF STACK DECISION:
 *   We implement Ed25519 operator authorization proofs using @noble/ed25519.
 *
 *   WHY NOT GROTH16/PLONK (Circom/snarkjs):
 *   Real zk-SNARKs require pre-compiled circuit artifacts (.wasm + .zkey) from
 *   the Circom compiler toolchain (Rust-based, requires offline compilation).
 *   These cannot be generated at runtime without the compiler binary.
 *
 *   WHAT IS IMPLEMENTED (REAL):
 *   - Ed25519 signing of H(commitment || nullifier || merkle_root || circuit_id)
 *   - Real elliptic curve cryptography (Ed25519 / Curve25519)
 *   - Real verification via ed25519.verify() — cryptographic, not structural
 *   - Proof artifact: 64-byte Ed25519 signature + 32-byte public key
 *   - Full proof lifecycle tracked in zk_proofs table
 *
 *   WHAT IS SCAFFOLD (PARTIAL):
 *   - zk-SNARK / Groth16 circuit: requires compiled .wasm + .zkey from Circom
 *   - Poseidon hash (ZK-native): requires circuit compilation
 *   - Range proof / membership proof circuit: requires circuit compilation
 *
 *   NEXT STEP FOR FULL ZK:
 *   1. Run: circom circuit/commitment.circom --r1cs --wasm --sym
 *   2. Run: snarkjs groth16 setup circuit.r1cs pot14_final.ptau circuit.zkey
 *   3. Export vkey: snarkjs zkey export verificationkey circuit.zkey vkey.json
 *   4. Drop artifacts in server/circuits/ and update CIRCUIT_CONFIG below
 */

import { ed25519 } from "@noble/curves/ed25519.js";
import { db } from "../db.js";
import { domainHash, randomSalt, DOMAIN, Bytes32, shortHash } from "./crypto.js";
import crypto from "crypto";

export type ProofStatus =
  | "pending"
  | "input_ready"
  | "generating"
  | "generated"
  | "verifying"
  | "verified"
  | "failed";

export type ProofType = "transfer" | "payroll_batch" | "nullifier_reveal" | "balance_proof";

export interface ProofInput {
  commitment: Bytes32;
  nullifier: Bytes32;
  merkle_root: Bytes32 | null;
  value_hash: Bytes32;
  recipient_hash: Bytes32;
  salt: Bytes32;
  proof_type: ProofType;
}

export interface ProofArtifact {
  id: string;
  related_transfer_id: string | null;
  proof_type: ProofType;
  status: ProofStatus;
  input_hash: Bytes32;
  proof_data: string | null;
  public_signals: string | null;
  verification_result: number | null;
  error_message: string | null;
  created_at: string;
  generated_at: string | null;
  verified_at: string | null;
  prover_backend: string;
  circuit_id: string;
}

export interface ProofStats {
  total: number;
  pending: number;
  generating: number;
  generated: number;
  verified: number;
  failed: number;
  avg_generation_ms: number | null;
}

// ─── Circuit / Artifact Config ───────────────────────────────────────────────

/**
 * Circuit configuration.
 * When Circom artifacts are compiled and placed in server/circuits/,
 * update the paths here and set available: true.
 *
 * STATUS: SCAFFOLD — circuit files not yet compiled.
 * BACKEND: Ed25519 operator proof is used in the interim.
 */
export const CIRCUIT_CONFIG = {
  transfer: {
    id:        "zkgent-transfer-v1",
    available: false,   // set true when .wasm + .zkey are in place
    wasm:      "server/circuits/transfer/circuit.wasm",
    zkey:      "server/circuits/transfer/circuit.zkey",
    vkey:      "server/circuits/transfer/vkey.json",
    note:      "Requires Circom compilation. Use: npm run circuits:build",
  },
  membership: {
    id:        "zkgent-membership-v1",
    available: false,
    wasm:      "server/circuits/membership/circuit.wasm",
    zkey:      "server/circuits/membership/circuit.zkey",
    vkey:      "server/circuits/membership/vkey.json",
    note:      "Merkle membership proof. Requires Circom compilation.",
  },
} as const;

export type CircuitName = keyof typeof CIRCUIT_CONFIG;

// ─── Operator Signing Key ─────────────────────────────────────────────────────

/**
 * Derive the operator Ed25519 private key from the operator seed.
 * Returns the 32-byte private key as Uint8Array.
 *
 * IMPLEMENTED: Real Ed25519 key derivation.
 * The private key is NEVER stored or logged — derived on demand only.
 */
export function getProverPrivateKey(): Uint8Array {
  const seed = process.env.ZKGENT_OPERATOR_SEED ?? "dev-only-seed-not-for-production-zkgent-v1";
  const keyMaterial = crypto
    .createHmac("sha256", "zkgent:proof:signing_key:v1")
    .update(seed)
    .digest();
  return keyMaterial; // 32 bytes → valid Ed25519 private key
}

/**
 * Get the operator Ed25519 public key (hex).
 * Safe to store and display.
 * IMPLEMENTED.
 */
export function getProverPublicKey(): string {
  return Buffer.from(ed25519.getPublicKey(getProverPrivateKey())).toString("hex");
}

// ─── Proof Input Builder ──────────────────────────────────────────────────────

/**
 * Build proof inputs for a confidential transfer.
 * IMPLEMENTED: correct input structure for Ed25519 proof and future SNARK.
 */
export function buildProofInput(opts: {
  commitment: Bytes32;
  nullifier: Bytes32;
  merkleRoot: Bytes32 | null;
  value: number;
  asset: string;
  recipientFingerprint: string;
  salt: Bytes32;
  proofType: ProofType;
}): ProofInput {
  const valueHash = domainHash(DOMAIN.COMMITMENT, "value", String(opts.value), opts.asset);
  return {
    commitment:     opts.commitment,
    nullifier:      opts.nullifier,
    merkle_root:    opts.merkleRoot,
    value_hash:     valueHash,
    recipient_hash: domainHash(DOMAIN.COMMITMENT, "recipient", opts.recipientFingerprint),
    salt:           opts.salt,
    proof_type:     opts.proofType,
  };
}

/**
 * Normalize the witness message: deterministic encoding of proof inputs.
 * IMPLEMENTED.
 */
function buildWitnessMessage(input: ProofInput, circuitId: string): Uint8Array {
  const parts = [
    circuitId,
    input.commitment,
    input.nullifier,
    input.merkle_root ?? "null",
    input.value_hash,
    input.recipient_hash,
    input.salt,
    input.proof_type,
  ].join(":");
  return Buffer.from(
    crypto.createHash("sha256").update(parts).digest()
  );
}

// ─── Proof Record Management ──────────────────────────────────────────────────

export function createProofRecord(opts: {
  relatedTransferId?: string;
  proofType: ProofType;
  input: ProofInput;
}): ProofArtifact {
  const id = `PROOF-${shortHash(randomSalt(), 10).toUpperCase()}`;
  const inputHash = domainHash(
    DOMAIN.COMMITMENT,
    opts.input.commitment,
    opts.input.nullifier,
    opts.input.salt
  );
  const now = new Date().toISOString();
  const circuitConf = CIRCUIT_CONFIG[opts.proofType as CircuitName] ?? CIRCUIT_CONFIG.transfer;

  db.prepare(`
    INSERT INTO zk_proofs
      (id, related_transfer_id, proof_type, status, input_hash,
       prover_backend, circuit_id, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(
    id,
    opts.relatedTransferId ?? null,
    opts.proofType,
    inputHash,
    "ed25519-operator-proof-v1",
    circuitConf.id,
    now
  );

  return db.prepare(`SELECT * FROM zk_proofs WHERE id = ?`).get(id) as ProofArtifact;
}

// ─── Real Prover (Ed25519) ────────────────────────────────────────────────────

/**
 * Generate a real Ed25519 operator authorization proof.
 *
 * IMPLEMENTED: Real elliptic curve signing (Ed25519 / Curve25519).
 * The proof proves: "the ZKGENT operator authorized this commitment-nullifier pair"
 *
 * Proof structure:
 *   - message = SHA-256(circuit_id:commitment:nullifier:merkle_root:...)
 *   - signature = Ed25519.sign(message, operator_private_key)   [64 bytes]
 *   - public_key = Ed25519.getPublicKey(operator_private_key)   [32 bytes]
 *
 * NOT a zk-SNARK: the operator's public key is revealed (not zero-knowledge
 * in the traditional sense). Full ZK requires compiled Circom circuit.
 */
export async function runProver(proofId: string, input: ProofInput): Promise<{
  success: boolean;
  proofData?: string;
  publicSignals?: string;
  error?: string;
}> {
  const start = Date.now();
  db.prepare(`UPDATE zk_proofs SET status = 'generating' WHERE id = ?`).run(proofId);

  try {
    const privKey = getProverPrivateKey();
    const pubKey  = ed25519.getPublicKey(privKey);

    const circuitId = db.prepare(
      `SELECT circuit_id FROM zk_proofs WHERE id = ?`
    ).get(proofId) as { circuit_id: string } | null;
    const cid = circuitId?.circuit_id ?? CIRCUIT_CONFIG.transfer.id;

    const message   = buildWitnessMessage(input, cid);
    const signature = ed25519.sign(message, privKey);
    const elapsed   = Date.now() - start;

    const proofData = JSON.stringify({
      _type:        "ed25519-operator-proof",
      _version:     "v1",
      _note:        "Ed25519 operator authorization proof. Full zk-SNARK requires Circom circuit compilation.",
      signature:    Buffer.from(signature).toString("hex"),
      public_key:   Buffer.from(pubKey).toString("hex"),
      circuit_id:   cid,
      message_hash: Buffer.from(message).toString("hex"),
      elapsed_ms:   elapsed,
    });

    const publicSignals = JSON.stringify([
      input.commitment,
      input.nullifier,
      input.merkle_root ?? "null",
      Buffer.from(pubKey).toString("hex"),
    ]);

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE zk_proofs SET
        status = 'generated',
        proof_data = ?,
        public_signals = ?,
        generated_at = ?
      WHERE id = ?
    `).run(proofData, publicSignals, now, proofId);

    return { success: true, proofData, publicSignals };
  } catch (err: any) {
    db.prepare(`
      UPDATE zk_proofs SET status = 'failed', error_message = ? WHERE id = ?
    `).run(err.message, proofId);
    return { success: false, error: err.message };
  }
}

// ─── Real Verifier (Ed25519) ──────────────────────────────────────────────────

/**
 * Verify an Ed25519 operator authorization proof.
 *
 * IMPLEMENTED: Real cryptographic verification via ed25519.verify().
 * This is NOT a structural check — it verifies the elliptic curve signature.
 */
export async function runVerifier(proofId: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const proof = db.prepare(
    `SELECT * FROM zk_proofs WHERE id = ?`
  ).get(proofId) as ProofArtifact | null;

  if (!proof)         return { valid: false, reason: "proof_not_found" };
  if (!proof.proof_data) return { valid: false, reason: "no_proof_data" };

  db.prepare(`UPDATE zk_proofs SET status = 'verifying' WHERE id = ?`).run(proofId);

  try {
    const parsed = JSON.parse(proof.proof_data);

    if (parsed._type !== "ed25519-operator-proof") {
      db.prepare(`UPDATE zk_proofs SET status = 'failed', verification_result = 0 WHERE id = ?`).run(proofId);
      return { valid: false, reason: "unknown_proof_type" };
    }

    const signature  = Buffer.from(parsed.signature, "hex");
    const publicKey  = Buffer.from(parsed.public_key, "hex");
    const message    = Buffer.from(parsed.message_hash, "hex");

    // Real Ed25519 verification — cryptographic, not structural
    const isValid = ed25519.verify(signature, message, publicKey);

    // Cross-check: the public key must match the operator's current public key
    const expectedPubKey = getProverPublicKey();
    const pubKeyMatch = parsed.public_key === expectedPubKey;

    const result = isValid && pubKeyMatch;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE zk_proofs SET
        status = ?,
        verification_result = ?,
        verified_at = ?
      WHERE id = ?
    `).run(result ? "verified" : "failed", result ? 1 : 0, now, proofId);

    return {
      valid: result,
      reason: result
        ? "ed25519_signature_valid"
        : !isValid
          ? "ed25519_signature_invalid"
          : "public_key_mismatch",
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE zk_proofs SET status = 'failed', error_message = ?, verification_result = 0 WHERE id = ?
    `).run(err.message, proofId);
    return { valid: false, reason: err.message };
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getProofById(id: string): ProofArtifact | null {
  return db.prepare(`SELECT * FROM zk_proofs WHERE id = ?`).get(id) as ProofArtifact | null;
}

export function getAllProofs(limit = 50): ProofArtifact[] {
  return db.prepare(
    `SELECT * FROM zk_proofs ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as ProofArtifact[];
}

export function getProofStats(): ProofStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'generating' THEN 1 ELSE 0 END), 0) as generating,
      COALESCE(SUM(CASE WHEN status = 'generated'  THEN 1 ELSE 0 END), 0) as generated,
      COALESCE(SUM(CASE WHEN status = 'verified'   THEN 1 ELSE 0 END), 0) as verified,
      COALESCE(SUM(CASE WHEN status = 'failed'     THEN 1 ELSE 0 END), 0) as failed
    FROM zk_proofs
  `).get() as Omit<ProofStats, "avg_generation_ms">;
  return { ...row, avg_generation_ms: null };
}

export function getCircuitStatus() {
  return {
    transfer:   { ...CIRCUIT_CONFIG.transfer,   available: CIRCUIT_CONFIG.transfer.available },
    membership: { ...CIRCUIT_CONFIG.membership, available: CIRCUIT_CONFIG.membership.available },
    prover_backend: "ed25519-operator-proof-v1",
    prover_pubkey:  getProverPublicKey(),
    note: "Ed25519 operator proof is active. zk-SNARK activation: drop compiled .wasm+.zkey into server/circuits/ and set available:true in CIRCUIT_CONFIG.",
  };
}
