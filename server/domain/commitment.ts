/**
 * ZKGENT Commitment System
 *
 * A commitment is a cryptographic hash of a note's contents.
 * Commitments are public — they prove a note exists without revealing its contents.
 *
 * STATUS:
 *   - Commitment derivation (SHA-256): IMPLEMENTED
 *   - Deterministic input model: IMPLEMENTED
 *   - Commitment persistence and lookup: IMPLEMENTED
 *   - Poseidon hash (ZK circuit compatible): SCAFFOLD
 *   - Merkle tree insertion: IMPLEMENTED (via merkle.ts)
 */

import { db } from "../db.js";
import { domainHash, DOMAIN, Bytes32 } from "./crypto.js";

export interface CommitmentInput {
  value: number;
  asset: string;
  ownerFingerprintHash: string;
  salt: Bytes32;
}

export interface CommitmentRecord {
  id: number;
  commitment: Bytes32;
  note_id: string;
  value_hash: Bytes32;      // H(value || asset) — hides exact value from indexed fields
  owner_hash: Bytes32;
  salt: Bytes32;
  merkle_index: number | null;
  status: "pending" | "inserted" | "finalized";
  created_at: string;
  finalized_at: string | null;
}

/**
 * Derive a commitment from a note's contents.
 *
 * Commitment = H(domain || H(value || asset) || owner_fingerprint || salt)
 *
 * IMPLEMENTED: SHA-256 based (substitute Poseidon for ZK circuit compatibility).
 * The multi-step hashing prevents length-extension attacks and provides
 * domain separation.
 */
export function computeCommitment(input: CommitmentInput): Bytes32 {
  const valueHash = domainHash(
    DOMAIN.COMMITMENT,
    "value",
    String(input.value),
    input.asset
  );
  return domainHash(
    DOMAIN.COMMITMENT,
    valueHash,
    input.ownerFingerprintHash,
    input.salt
  );
}

/**
 * Persist a commitment to the database.
 * IMPLEMENTED.
 */
export function persistCommitment(opts: {
  commitment: Bytes32;
  noteId: string;
  input: CommitmentInput;
}): CommitmentRecord {
  const valueHash = domainHash(
    DOMAIN.COMMITMENT, "value", String(opts.input.value), opts.input.asset
  );
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR IGNORE INTO zk_commitments
      (commitment, note_id, value_hash, owner_hash, salt, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    opts.commitment,
    opts.noteId,
    valueHash,
    opts.input.ownerFingerprintHash,
    opts.input.salt,
    now
  );

  return db.prepare(
    `SELECT * FROM zk_commitments WHERE commitment = ?`
  ).get(opts.commitment) as CommitmentRecord;
}

export function getCommitmentByValue(commitment: Bytes32): CommitmentRecord | null {
  return db.prepare(
    `SELECT * FROM zk_commitments WHERE commitment = ?`
  ).get(commitment) as CommitmentRecord | null;
}

export function markCommitmentInserted(commitment: Bytes32, merkleIndex: number): void {
  db.prepare(`
    UPDATE zk_commitments SET status = 'inserted', merkle_index = ? WHERE commitment = ?
  `).run(merkleIndex, commitment);
}

export function getAllCommitments(limit = 100): CommitmentRecord[] {
  return db.prepare(
    `SELECT * FROM zk_commitments ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as CommitmentRecord[];
}

export interface CommitmentStats {
  total: number;
  pending: number;
  inserted: number;
  finalized: number;
}

export function getCommitmentStats(): CommitmentStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'inserted'  THEN 1 ELSE 0 END), 0) as inserted,
      COALESCE(SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END), 0) as finalized
    FROM zk_commitments
  `).get() as CommitmentStats;
  return row;
}
