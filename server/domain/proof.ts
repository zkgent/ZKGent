/**
 * ZKGENT Proof Pipeline
 *
 * The proof pipeline manages the lifecycle of zero-knowledge proofs
 * for confidential transfers.
 *
 * STATUS:
 *   - Proof artifact model and DB persistence: IMPLEMENTED
 *   - Proof input/witness preparation: IMPLEMENTED (scaffold inputs)
 *   - Prover abstraction (interface): IMPLEMENTED
 *   - Actual ZK proof generation (Groth16/PLONK via snarkjs): SCAFFOLD
 *   - Verifier abstraction (interface): IMPLEMENTED
 *   - Actual on-chain verification: SCAFFOLD
 *   - Proof status lifecycle: IMPLEMENTED
 *
 * When a real ZK library (snarkjs, bellman, arkworks) is integrated,
 * only the prover/verifier implementation functions need to change —
 * the pipeline interface and persistence layer remain the same.
 */

import { db } from "../db.js";
import { domainHash, randomSalt, DOMAIN, Bytes32, shortHash } from "./crypto.js";

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
  input_hash: Bytes32;    // H(inputs) — proof of input set without exposing values
  proof_data: string | null;   // JSON: { pi_a, pi_b, pi_c } when generated
  public_signals: string | null;  // JSON array of public inputs
  verification_result: number | null;  // 1=valid, 0=invalid, null=not verified
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

/**
 * Build proof inputs for a confidential transfer.
 * IMPLEMENTED: input structure is correct for a Groth16/PLONK circuit.
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
 * Create a proof record in the database (status: pending).
 * IMPLEMENTED.
 */
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
    "snarkjs-groth16-scaffold",
    `zkgent-${opts.proofType}-v1`,
    now
  );

  return db.prepare(`SELECT * FROM zk_proofs WHERE id = ?`).get(id) as ProofArtifact;
}

/**
 * Prover abstraction.
 *
 * SCAFFOLD: This function logs what a real prover would do.
 * Replace with: await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)
 *
 * When a real circuit is available, this function is the only one that needs
 * to change. The rest of the pipeline (status management, persistence) remains.
 */
export async function runProver(proofId: string, input: ProofInput): Promise<{
  success: boolean;
  proofData?: string;
  publicSignals?: string;
  error?: string;
}> {
  const now = new Date().toISOString();

  // Mark as generating
  db.prepare(
    `UPDATE zk_proofs SET status = 'generating' WHERE id = ?`
  ).run(proofId);

  // SCAFFOLD: Simulate proof generation delay (1-3s in real system)
  // In production: const { proof, publicSignals } = await snarkjs.groth16.fullProve(...)
  await new Promise(r => setTimeout(r, 200));

  const scaffoldProof = {
    _scaffold: true,
    _note: "Real Groth16/PLONK proof requires compiled circuit (.wasm + .zkey). SCAFFOLD only.",
    pi_a: [domainHash(DOMAIN.COMMITMENT, "pi_a", input.commitment), "1"],
    pi_b: [[domainHash(DOMAIN.COMMITMENT, "pi_b_0", input.commitment), domainHash(DOMAIN.COMMITMENT, "pi_b_1", input.commitment)], ["1", "0"]],
    pi_c: [domainHash(DOMAIN.COMMITMENT, "pi_c", input.commitment), "1"],
    protocol: "groth16",
    curve: "bn128",
  };

  const publicSignals = [
    input.commitment,
    input.nullifier,
    input.merkle_root ?? DOMAIN.MERKLE,
  ];

  db.prepare(`
    UPDATE zk_proofs SET
      status = 'generated',
      proof_data = ?,
      public_signals = ?,
      generated_at = ?
    WHERE id = ?
  `).run(
    JSON.stringify(scaffoldProof),
    JSON.stringify(publicSignals),
    now,
    proofId
  );

  return {
    success: true,
    proofData: JSON.stringify(scaffoldProof),
    publicSignals: JSON.stringify(publicSignals),
  };
}

/**
 * Verifier abstraction.
 *
 * SCAFFOLD: Structural verification only (checks proof has expected fields).
 * Replace with: await snarkjs.groth16.verify(vKey, publicSignals, proof)
 */
export async function runVerifier(proofId: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const proof = db.prepare(
    `SELECT * FROM zk_proofs WHERE id = ?`
  ).get(proofId) as ProofArtifact | null;

  if (!proof) return { valid: false, reason: "proof_not_found" };
  if (!proof.proof_data) return { valid: false, reason: "no_proof_data" };

  db.prepare(`UPDATE zk_proofs SET status = 'verifying' WHERE id = ?`).run(proofId);
  await new Promise(r => setTimeout(r, 100));

  // SCAFFOLD: Structural check only
  const parsedProof = JSON.parse(proof.proof_data);
  const isStructurallyValid = !!(parsedProof.pi_a && parsedProof.pi_b && parsedProof.pi_c);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE zk_proofs SET
      status = ?,
      verification_result = ?,
      verified_at = ?
    WHERE id = ?
  `).run(
    isStructurallyValid ? "verified" : "failed",
    isStructurallyValid ? 1 : 0,
    now,
    proofId
  );

  return {
    valid: isStructurallyValid,
    reason: isStructurallyValid
      ? "structural_check_passed_scaffold"
      : "structural_check_failed",
  };
}

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
