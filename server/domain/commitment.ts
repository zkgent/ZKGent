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
import {
  Bytes32,
  poseidonHashHex,
  hexToField,
  strToField,
  fieldToHex,
  poseidonField4,
  poseidonField2,
} from "./crypto.js";

const SAFE_VALUE_MAX = Number.MAX_SAFE_INTEGER; // 2^53 - 1, well below BN254 prime

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
 * Commitment = Poseidon4(value, asset_field, owner_field, salt_field)
 *
 * IMPLEMENTED: Poseidon over BN254 — circuit-compatible. The asset code is
 * mapped to a field element via SHA-256-then-mod-p so circuits can take it
 * as a public input.
 *
 * Value is bounded by JS Number (< 2^53) so it fits trivially in the field.
 */
export function computeCommitment(input: CommitmentInput): Bytes32 {
  // Explicit value hygiene: must be a non-negative safe integer.
  if (
    typeof input.value !== "number" ||
    !Number.isFinite(input.value) ||
    input.value < 0 ||
    !Number.isSafeInteger(Math.floor(input.value)) ||
    Math.floor(input.value) > SAFE_VALUE_MAX
  ) {
    throw new Error(`computeCommitment: invalid value ${String(input.value)} (must be non-negative safe integer)`);
  }
  const valueField = BigInt(Math.floor(input.value));
  // Asset and owner are arbitrary strings/labels — always hash to field via strToField.
  // This guarantees a single canonical encoding regardless of whether the caller passes
  // a hex hash, a label like "ZKG:OPERATOR:…", or any other identifier.
  const assetField = strToField(input.asset);
  const ownerField = strToField(input.ownerFingerprintHash);
  // Salt MUST be a 64-char hex field element produced by randomFieldSalt().
  const saltField  = hexToField(input.salt);
  return fieldToHex(
    poseidonField4(valueField, assetField, ownerField, saltField)
  );
}

/**
 * Derive value_hash for indexed storage.
 * Poseidon2(value, asset_field).
 */
export function computeValueHash(value: number, asset: string): Bytes32 {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.floor(value)) ||
    Math.floor(value) > SAFE_VALUE_MAX
  ) {
    throw new Error(`computeValueHash: invalid value ${String(value)} (must be non-negative safe integer)`);
  }
  return fieldToHex(poseidonField2(BigInt(Math.floor(value)), strToField(asset)));
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
  const valueHash = computeValueHash(opts.input.value, opts.input.asset);
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
