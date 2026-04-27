/**
 * ZKGENT Nullifier System
 *
 * A nullifier is a unique tag derived from a note's commitment and the spender's
 * secret key. Publishing a nullifier reveals that a note was spent without
 * revealing WHICH note was spent.
 *
 * Anti-double-spend: Each commitment can only produce one nullifier.
 * If a nullifier is already in the registry, the spend is rejected.
 *
 * STATUS:
 *   - Nullifier derivation: IMPLEMENTED
 *   - Uniqueness enforcement (DB-level + application-level): IMPLEMENTED
 *   - Anti-double-spend check: IMPLEMENTED
 *   - ZK proof of nullifier validity (circuit): SCAFFOLD
 */

import { db } from "../db.js";
import { Bytes32, fieldToHex, hexToField, poseidonField2 } from "./crypto.js";
import { deriveNullifierSk } from "./keys.js";

export interface NullifierRecord {
  id: number;
  nullifier: Bytes32;
  commitment: Bytes32;
  note_id: string;
  spent_by_transfer_id: string | null;
  published_at: string;
}

/**
 * Derive a nullifier.
 *
 * Nullifier = Poseidon2(commitment_field, nullifier_sk_field)
 *
 * The nullifier secret key is derived from the operator seed per-commitment
 * so it cannot be linked across notes without knowledge of the root secret.
 *
 * IMPLEMENTED: Poseidon over BN254 — circuit-compatible.
 */
export function computeNullifier(commitment: Bytes32): Bytes32 {
  // commitment is always a 64-char hex field element (output of computeCommitment).
  // nk is a SHA-256 hex string from deriveNullifierSk — also valid hex.
  // Both are interpreted strictly as hex field elements.
  const nk = deriveNullifierSk(commitment);
  return fieldToHex(poseidonField2(hexToField(commitment), hexToField(nk)));
}

/**
 * Check if a nullifier has already been published (anti-double-spend).
 * IMPLEMENTED.
 */
export function isNullifierSpent(nullifier: Bytes32): boolean {
  const row = db.prepare(
    `SELECT 1 FROM zk_nullifiers WHERE nullifier = ?`
  ).get(nullifier);
  return row !== undefined;
}

/**
 * Publish a nullifier — marks the corresponding note as spent.
 * Returns false if already spent (double-spend attempt).
 * IMPLEMENTED.
 */
export function publishNullifier(opts: {
  nullifier: Bytes32;
  commitment: Bytes32;
  noteId: string;
  spentByTransferId?: string;
}): { success: boolean; reason?: string } {
  if (isNullifierSpent(opts.nullifier)) {
    return { success: false, reason: "double_spend_detected" };
  }

  const now = new Date().toISOString();
  try {
    db.prepare(`
      INSERT INTO zk_nullifiers
        (nullifier, commitment, note_id, spent_by_transfer_id, published_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      opts.nullifier,
      opts.commitment,
      opts.noteId,
      opts.spentByTransferId ?? null,
      now
    );
    return { success: true };
  } catch (err: any) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { success: false, reason: "double_spend_detected" };
    }
    throw err;
  }
}

export function getNullifierByCommitment(commitment: Bytes32): NullifierRecord | null {
  return db.prepare(
    `SELECT * FROM zk_nullifiers WHERE commitment = ?`
  ).get(commitment) as NullifierRecord | null;
}

export function getAllNullifiers(limit = 100): NullifierRecord[] {
  return db.prepare(
    `SELECT * FROM zk_nullifiers ORDER BY published_at DESC LIMIT ?`
  ).all(limit) as NullifierRecord[];
}

export interface NullifierStats {
  total: number;
}

export function getNullifierStats(): NullifierStats {
  const row = db.prepare(`SELECT COUNT(*) as total FROM zk_nullifiers`).get() as { total: number };
  return { total: row.total };
}
