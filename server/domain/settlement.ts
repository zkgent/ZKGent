/**
 * ZKGENT Settlement Engine
 *
 * The settlement engine manages the full lifecycle of a confidential transfer:
 * note creation → commitment → proof generation → nullifier publish → on-chain settlement
 *
 * STATUS:
 *   - Intent lifecycle model: IMPLEMENTED
 *   - State machine transitions: IMPLEMENTED
 *   - Settlement queue (DB-backed): IMPLEMENTED
 *   - Proof validation workflow: IMPLEMENTED (calls proof.ts)
 *   - On-chain Solana execution: SCAFFOLD
 *   - Rollback / error recovery: SCAFFOLD
 */

import { db } from "../db.js";
import { logActivity } from "../db.js";
import { generateId } from "../db.js";
import { createNote, markNoteSpent } from "./note.js";
import { persistCommitment } from "./commitment.js";
import { computeNullifier, publishNullifier } from "./nullifier.js";
import { appendLeaf, getMerkleRoot } from "./merkle.js";
import { buildProofInput, createProofRecord, runProver, runVerifier } from "./proof.js";
import { getKeySet } from "./keys.js";
import type { Bytes32 } from "./crypto.js";

export type SettlementStatus =
  | "queued"
  | "note_created"
  | "commitment_inserted"
  | "proof_requested"
  | "proof_generating"
  | "proof_verified"
  | "nullifier_published"
  | "sending_to_chain"    // SCAFFOLD
  | "settled"
  | "failed"
  | "rolled_back";

export interface SettlementRecord {
  id: string;
  transfer_id: string;
  status: SettlementStatus;
  note_id: string | null;
  commitment: Bytes32 | null;
  nullifier: Bytes32 | null;
  proof_id: string | null;
  merkle_root_at_settlement: Bytes32 | null;
  on_chain_tx_sig: string | null;     // SCAFFOLD: Solana tx signature
  error_message: string | null;
  queued_at: string;
  settled_at: string | null;
  updated_at: string;
}

function updateSettlement(id: string, patch: Partial<SettlementRecord>): void {
  const now = new Date().toISOString();
  const sets = Object.keys(patch).map(k => `${k} = ?`).join(", ");
  const vals = Object.values(patch);
  db.prepare(
    `UPDATE zk_settlements SET ${sets}, updated_at = ? WHERE id = ?`
  ).run(...vals, now, id);
}

/**
 * Create a new settlement intent and add it to the queue.
 * IMPLEMENTED.
 */
export function queueSettlement(opts: {
  transferId: string;
  value: number;
  asset: string;
  recipientFingerprint: string;
  memo?: string;
}): SettlementRecord {
  const id = generateId("STL");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO zk_settlements
      (id, transfer_id, status, queued_at, updated_at)
    VALUES (?, ?, 'queued', ?, ?)
  `).run(id, opts.transferId, now, now);

  logActivity({
    category: "settlement",
    event: "settlement_queued",
    detail: `Transfer ${opts.transferId} queued for confidential settlement`,
    status: "info",
    relatedEntityType: "transfer",
    relatedEntityId: opts.transferId,
  });

  return db.prepare(`SELECT * FROM zk_settlements WHERE id = ?`).get(id) as SettlementRecord;
}

/**
 * Execute a settlement through all state transitions.
 *
 * State machine:
 *   queued → note_created → commitment_inserted → proof_requested
 *   → proof_verified → nullifier_published → settled
 *
 * IMPLEMENTED: Full state machine (except on-chain execution which is SCAFFOLD).
 */
export async function executeSettlement(settlementId: string, opts: {
  value: number;
  asset: string;
  recipientFingerprint: string;
  memo?: string;
}): Promise<{ success: boolean; error?: string; record?: SettlementRecord }> {
  const record = db.prepare(
    `SELECT * FROM zk_settlements WHERE id = ?`
  ).get(settlementId) as SettlementRecord | null;

  if (!record) return { success: false, error: "settlement_not_found" };
  if (record.status === "settled") return { success: true, record };

  const ks = getKeySet();

  try {
    // Step 1: Create note
    updateSettlement(settlementId, { status: "note_created" });
    const note = createNote({
      ownerFingerprint: ks.operator.fingerprint,
      value: opts.value,
      asset: opts.asset,
      memo: opts.memo,
      senderFingerprint: ks.signing.fingerprint,
      relatedTransferId: record.transfer_id,
    });
    updateSettlement(settlementId, { note_id: note.id });

    // Step 2: Persist commitment & insert into Merkle tree
    updateSettlement(settlementId, { status: "commitment_inserted" });
    const commitmentRec = persistCommitment({
      commitment: note.commitment,
      noteId: note.id,
      input: {
        value: opts.value,
        asset: opts.asset,
        ownerFingerprintHash: ks.operator.fingerprint,
        salt: note.salt,
      },
    });
    const merkleIndex = appendLeaf(note.commitment);
    const merkleRoot  = getMerkleRoot();
    updateSettlement(settlementId, { commitment: note.commitment });

    // Step 3: Build proof inputs and create proof record
    updateSettlement(settlementId, { status: "proof_requested" });
    const nullifier = computeNullifier(note.commitment);
    const proofInput = buildProofInput({
      commitment:          note.commitment,
      nullifier,
      merkleRoot,
      value:               opts.value,
      asset:               opts.asset,
      recipientFingerprint: opts.recipientFingerprint,
      salt:                note.salt,
      proofType:           "transfer",
    });
    const proofRec = createProofRecord({
      relatedTransferId: record.transfer_id,
      proofType: "transfer",
      input: proofInput,
    });
    updateSettlement(settlementId, {
      proof_id: proofRec.id,
      status: "proof_generating",
    });

    // Step 4: Generate and verify proof
    await runProver(proofRec.id, proofInput);
    const verifyResult = await runVerifier(proofRec.id);
    if (!verifyResult.valid) {
      updateSettlement(settlementId, {
        status: "failed",
        error_message: `Proof verification failed: ${verifyResult.reason}`,
      });
      return { success: false, error: verifyResult.reason };
    }
    updateSettlement(settlementId, { status: "proof_verified" });

    // Step 5: Publish nullifier (anti-double-spend)
    const nullifierResult = publishNullifier({
      nullifier,
      commitment: note.commitment,
      noteId: note.id,
      spentByTransferId: record.transfer_id,
    });
    if (!nullifierResult.success) {
      updateSettlement(settlementId, {
        status: "failed",
        error_message: `Nullifier rejection: ${nullifierResult.reason}`,
      });
      return { success: false, error: nullifierResult.reason };
    }
    markNoteSpent(note.id, nullifier);
    updateSettlement(settlementId, {
      nullifier,
      status: "nullifier_published",
      merkle_root_at_settlement: merkleRoot,
    });

    // Step 6: On-chain execution — SCAFFOLD
    // In production: call Solana program via solana.ts
    // const txSig = await sendSettlementTransaction({ ... })
    updateSettlement(settlementId, {
      status: "settled",
      on_chain_tx_sig: `SCAFFOLD-TX-${Date.now()}`,
      settled_at: new Date().toISOString(),
    });

    logActivity({
      category: "settlement",
      event: "settlement_completed",
      detail: `Settlement ${settlementId} completed (on-chain execution: scaffold)`,
      status: "success",
      relatedEntityType: "settlement",
      relatedEntityId: settlementId,
    });

    const final = db.prepare(
      `SELECT * FROM zk_settlements WHERE id = ?`
    ).get(settlementId) as SettlementRecord;
    return { success: true, record: final };

  } catch (err: any) {
    updateSettlement(settlementId, {
      status: "failed",
      error_message: err.message ?? "unknown error",
    });
    logActivity({
      category: "settlement",
      event: "settlement_failed",
      detail: err.message,
      status: "error",
      relatedEntityType: "settlement",
      relatedEntityId: settlementId,
    });
    return { success: false, error: err.message };
  }
}

export function getSettlementQueue(status?: SettlementStatus): SettlementRecord[] {
  if (status) {
    return db.prepare(
      `SELECT * FROM zk_settlements WHERE status = ? ORDER BY queued_at ASC`
    ).all(status) as SettlementRecord[];
  }
  return db.prepare(
    `SELECT * FROM zk_settlements ORDER BY queued_at DESC LIMIT 50`
  ).all() as SettlementRecord[];
}

export interface SettlementStats {
  total: number;
  queued: number;
  in_progress: number;
  settled: number;
  failed: number;
}

export function getSettlementStats(): SettlementStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END), 0) as queued,
      COALESCE(SUM(CASE WHEN status IN ('note_created','commitment_inserted','proof_requested','proof_generating','proof_verified','nullifier_published','sending_to_chain') THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END), 0) as settled,
      COALESCE(SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END), 0) as failed
    FROM zk_settlements
  `).get() as SettlementStats;
  return row;
}
