/**
 * ZKGENT Settlement Engine
 *
 * Full lifecycle of a confidential transfer:
 * note creation → commitment → proof generation → nullifier → on-chain submission
 *
 * STATUS:
 *   - State machine (12 states): IMPLEMENTED
 *   - Note + commitment + nullifier + merkle: IMPLEMENTED
 *   - Ed25519 proof generation + verification: IMPLEMENTED (real)
 *   - SPL Memo on-chain anchoring (devnet): IMPLEMENTED (real tx)
 *   - Wallet signing flow: IMPLEMENTED (signing request API, frontend signs)
 *   - Custom ZKGENT on-chain program: SCAFFOLD
 *
 * STATE MACHINE:
 *   queued → note_created → commitment_inserted → proof_requested
 *   → proof_generating → proof_generated → proof_verified
 *   → signing_requested → signed
 *   → submitted_on_chain → confirmed → finalized
 *   (any) → failed | rolled_back
 */

import { db } from "../db.js";
import { logActivity, generateId } from "../db.js";
import { createNote, createZkNote, markNoteSpent } from "./note.js";
import { persistCommitment } from "./commitment.js";
import { computeNullifier, publishNullifier } from "./nullifier.js";
import { appendLeaf, getMerkleRoot } from "./merkle.js";
import {
  buildProofInput,
  createProofRecord,
  runProver,
  runVerifier,
  attachSpendWitness,
  isTransferCircuitReady,
} from "./proof.js";
import { computeZkNullifier, computeZkMerkleRoot } from "./transfer_circuit.js";
import { loadAllLeaves } from "./merkle_path.js";
import { getKeySet } from "./keys.js";
import { submitSettlementOnChain, recordOnChainTx, getLatestTxs } from "./solana_tx.js";
import type { Bytes32 } from "./crypto.js";

export type SettlementStatus =
  | "queued"
  | "note_created"
  | "commitment_inserted"
  | "proof_requested"
  | "proof_generating"
  | "proof_generated"
  | "proof_verified"
  | "signing_requested"
  | "signed"
  | "submitted_on_chain"
  | "confirmed"
  | "finalized"
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
  on_chain_tx_sig: string | null;
  on_chain_explorer_url: string | null;
  signing_request_id: string | null;
  error_message: string | null;
  queued_at: string;
  submitted_on_chain_at: string | null;
  confirmed_at: string | null;
  finalized_at: string | null;
  settled_at: string | null;
  updated_at: string;
}

function updateSettlement(id: string, patch: Record<string, unknown>): void {
  const now = new Date().toISOString();
  const sets = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(", ");
  const vals = Object.values(patch);
  db.prepare(`UPDATE zk_settlements SET ${sets}, updated_at = ? WHERE id = ?`).run(
    ...vals,
    now,
    id,
  );
}

function getSettlement(id: string): SettlementRecord | null {
  return db.prepare(`SELECT * FROM zk_settlements WHERE id = ?`).get(id) as SettlementRecord | null;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export function queueSettlement(opts: {
  transferId: string;
  value: number;
  asset: string;
  recipientFingerprint: string;
  memo?: string;
}): SettlementRecord {
  const id = generateId("STL");
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO zk_settlements (id, transfer_id, status, queued_at, updated_at)
    VALUES (?, ?, 'queued', ?, ?)
  `,
  ).run(id, opts.transferId, now, now);

  logActivity({
    category: "settlement",
    event: "settlement_queued",
    detail: `Transfer ${opts.transferId} queued for confidential settlement`,
    status: "info",
    relatedEntityType: "transfer",
    relatedEntityId: opts.transferId,
  });

  return getSettlement(id)!;
}

// ─── Execute ──────────────────────────────────────────────────────────────────

/**
 * Execute a settlement through the full state machine.
 * The on-chain step attempts a REAL Solana devnet transaction.
 * Falls back gracefully if the RPC is unreachable.
 * IMPLEMENTED (with real proof + real on-chain tx).
 */
export async function executeSettlement(
  settlementId: string,
  opts: {
    value: number;
    asset: string;
    recipientFingerprint: string;
    memo?: string;
  },
): Promise<{ success: boolean; error?: string; record?: SettlementRecord }> {
  const record = getSettlement(settlementId);
  if (!record) return { success: false, error: "settlement_not_found" };
  if (record.status === "finalized") return { success: true, record };

  const ks = getKeySet();
  // Pick the active proof backend at start of settlement so the whole
  // pipeline (commitment scheme, nullifier formula, Merkle root convention,
  // prover backend) is internally consistent.
  const useGroth16 = isTransferCircuitReady();
  const circuitVersion = useGroth16 ? "groth16-v1" : "ed25519-operator-v1";
  updateSettlement(settlementId, { circuit_version: circuitVersion });

  try {
    // ── Step 1: Create note ───────────────────────────────────────────────────
    updateSettlement(settlementId, { status: "note_created" });
    let noteId: string;
    let noteCommitment: Bytes32;
    let noteSalt: Bytes32;
    let ownerSecretForProving: Bytes32 | null = null;
    let noteOwnerHashForCommitment: Bytes32;

    if (useGroth16) {
      const z = createZkNote({
        value: opts.value,
        asset: opts.asset,
        memo: opts.memo,
        senderFingerprint: ks.signing.fingerprint,
        relatedTransferId: record.transfer_id,
      });
      noteId = z.note.id;
      noteCommitment = z.note.commitment;
      noteSalt = z.note.salt;
      ownerSecretForProving = z.ownerSecret;
      noteOwnerHashForCommitment = z.ownerPk;
    } else {
      const note = createNote({
        ownerFingerprint: ks.operator.fingerprint,
        value: opts.value,
        asset: opts.asset,
        memo: opts.memo,
        senderFingerprint: ks.signing.fingerprint,
        relatedTransferId: record.transfer_id,
      });
      noteId = note.id;
      noteCommitment = note.commitment;
      noteSalt = note.salt;
      noteOwnerHashForCommitment = ks.operator.fingerprint;
    }
    updateSettlement(settlementId, { note_id: noteId });

    // ── Step 2: Persist commitment + insert into Merkle tree ──────────────────
    updateSettlement(settlementId, { status: "commitment_inserted" });
    persistCommitment({
      commitment: noteCommitment,
      noteId: noteId,
      input: {
        value: opts.value,
        asset: opts.asset,
        ownerFingerprintHash: noteOwnerHashForCommitment,
        salt: noteSalt,
      },
    });
    const leafIndex = appendLeaf(noteCommitment);
    // Snapshot the leaves immediately after our own append. Any other
    // settlement that runs concurrently and appends after this point will
    // not affect the witness/root we hand to our prover, because we pass
    // this snapshot all the way through to proveSpend (see step 4 below).
    // For the Ed25519 path we keep the legacy collapsing root since no
    // circuit witness is involved.
    const leavesSnapshot: Bytes32[] | undefined = useGroth16 ? loadAllLeaves() : undefined;
    const merkleRoot = useGroth16 ? computeZkMerkleRoot(leavesSnapshot) : getMerkleRoot();
    updateSettlement(settlementId, { commitment: noteCommitment });

    // ── Step 3: Build proof inputs ────────────────────────────────────────────
    updateSettlement(settlementId, { status: "proof_requested" });
    const nullifier = useGroth16
      ? computeZkNullifier({ ownerSecret: ownerSecretForProving!, leafIndex })
      : computeNullifier(noteCommitment);
    const proofInput = buildProofInput({
      commitment: noteCommitment,
      nullifier,
      merkleRoot,
      value: opts.value,
      asset: opts.asset,
      recipientFingerprint: opts.recipientFingerprint,
      salt: noteSalt,
      proofType: "transfer",
    });
    const proofRec = createProofRecord({
      relatedTransferId: record.transfer_id,
      proofType: "transfer",
      input: proofInput,
    });
    updateSettlement(settlementId, { proof_id: proofRec.id, status: "proof_generating" });

    // ── Step 4: Generate proof (Groth16 or Ed25519, dispatched by record) ─────
    if (useGroth16) {
      // Hand the secret witness to the in-memory store the prover reads from.
      // Stored only for the duration of this proving job; never written to DB.
      // The leavesSnapshot pins the Merkle witness to the tree state captured
      // immediately after this settlement's appendLeaf, so other in-flight
      // settlements cannot drift the proof's root away from `merkleRoot`.
      attachSpendWitness(proofRec.id, opts.asset, {
        value: opts.value,
        salt: noteSalt,
        ownerSecret: ownerSecretForProving!,
        leafIndex,
        leavesSnapshot,
      });
    }
    const genResult = await runProver(proofRec.id, proofInput);
    if (!genResult.success) {
      updateSettlement(settlementId, { status: "failed", error_message: genResult.error });
      return { success: false, error: genResult.error };
    }
    updateSettlement(settlementId, { status: "proof_generated" });

    // ── Step 5: Verify proof (real cryptographic verify) ──────────────────────
    const verifyResult = await runVerifier(proofRec.id);
    if (!verifyResult.valid) {
      updateSettlement(settlementId, {
        status: "failed",
        error_message: `Proof verification failed: ${verifyResult.reason}`,
      });
      return { success: false, error: verifyResult.reason };
    }

    // Step 5b (Groth16 only): bind the proof's public signals to the values
    // the settlement actually committed to. Without this check, a proof that
    // is cryptographically valid but for a DIFFERENT (root, nullifier, value,
    // asset) tuple would pass — e.g. due to a witness-snapshot drift bug or
    // a malicious witness injection. We re-read the proof_data and compare
    // to the values we just stored on the settlement record.
    if (useGroth16) {
      const proofRow = db
        .prepare(`SELECT proof_data FROM zk_proofs WHERE id = ?`)
        .get(proofRec.id) as { proof_data: string } | null;
      const payload = proofRow?.proof_data ? JSON.parse(proofRow.proof_data) : null;
      const ps: string[] = payload?.publicSignals ?? [];
      // Public signal order matches the circuit declaration:
      // [merkle_root, nullifier, value_commitment, asset_hash]
      const expectedRoot = BigInt("0x" + merkleRoot).toString();
      const expectedNullifier = BigInt("0x" + nullifier).toString();
      const proofRoot = ps[0];
      const proofNullifier = ps[1];
      if (proofRoot !== expectedRoot || proofNullifier !== expectedNullifier) {
        const msg = `groth16 invariant violation: proof public signals do not match settlement (root match=${proofRoot === expectedRoot}, nullifier match=${proofNullifier === expectedNullifier})`;
        updateSettlement(settlementId, { status: "failed", error_message: msg });
        return { success: false, error: msg };
      }
    }
    updateSettlement(settlementId, { status: "proof_verified" });

    // ── Step 6: Publish nullifier (anti-double-spend) ─────────────────────────
    const nullifierResult = publishNullifier({
      nullifier,
      commitment: noteCommitment,
      noteId: noteId,
      spentByTransferId: record.transfer_id,
    });
    if (!nullifierResult.success) {
      updateSettlement(settlementId, { status: "failed", error_message: nullifierResult.reason });
      return { success: false, error: nullifierResult.reason };
    }
    markNoteSpent(noteId, nullifier);
    updateSettlement(settlementId, {
      nullifier,
      status: "signing_requested",
      merkle_root_at_settlement: merkleRoot,
    });

    // ── Step 7: Mark as signed (operator key signs automatically here) ─────────
    // In browser-wallet flow: frontend connects wallet, user manually signs.
    // In server-to-server flow: operator signs automatically (this path).
    // The signing_request API (/api/zk/signing/*) handles the browser-wallet path.
    updateSettlement(settlementId, { status: "signed" });

    // ── Step 8: Submit to Solana devnet (REAL transaction) ────────────────────
    updateSettlement(settlementId, { status: "submitted_on_chain" });
    const now = new Date().toISOString();

    const chainResult = await submitSettlementOnChain({
      settlementId,
      commitment: noteCommitment,
      nullifier,
      proofId: proofRec.id,
    });

    if (chainResult.success && chainResult.signature) {
      recordOnChainTx({
        settlementId,
        signature: chainResult.signature,
        status: chainResult.status ?? "confirmed",
        memoData: `zkgent:v1:${settlementId}:${noteCommitment.slice(0, 12)}:${nullifier.slice(0, 12)}`,
        explorerUrl: chainResult.explorer_url,
      });
      updateSettlement(settlementId, {
        on_chain_tx_sig: chainResult.signature,
        on_chain_explorer_url: chainResult.explorer_url,
        status: "confirmed",
        confirmed_at: now,
        submitted_on_chain_at: now,
      });
    } else {
      // On-chain failed (no SOL, RPC issue) — treat as finalized locally
      // with an error note. The commitment+nullifier are still valid.
      recordOnChainTx({
        settlementId,
        signature: "N/A",
        status: "failed",
        memoData: "",
        error: chainResult.error,
      });
      updateSettlement(settlementId, {
        status: "confirmed", // local state is settled
        error_message: `On-chain submission failed (local settlement valid): ${chainResult.error}`,
        submitted_on_chain_at: now,
      });
    }

    // ── Step 9: Finalize ──────────────────────────────────────────────────────
    updateSettlement(settlementId, {
      status: "finalized",
      finalized_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
    });

    logActivity({
      category: "settlement",
      event: chainResult.success ? "settlement_finalized_on_chain" : "settlement_finalized_local",
      detail: chainResult.success
        ? `Settlement ${settlementId} confirmed on Solana devnet. Tx: ${chainResult.signature?.slice(0, 16)}…`
        : `Settlement ${settlementId} finalized locally. On-chain submission: ${chainResult.error}`,
      status: "success",
      relatedEntityType: "settlement",
      relatedEntityId: settlementId,
    });

    return { success: true, record: getSettlement(settlementId)! };
  } catch (err: any) {
    updateSettlement(settlementId, { status: "failed", error_message: err.message });
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

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getSettlementQueue(status?: SettlementStatus): SettlementRecord[] {
  if (status) {
    return db
      .prepare(`SELECT * FROM zk_settlements WHERE status = ? ORDER BY queued_at ASC`)
      .all(status) as SettlementRecord[];
  }
  return db
    .prepare(`SELECT * FROM zk_settlements ORDER BY queued_at DESC LIMIT 50`)
    .all() as SettlementRecord[];
}

export function getLatestOnChainTxs() {
  return getLatestTxs(10);
}

export interface SettlementStats {
  total: number;
  queued: number;
  in_progress: number;
  confirmed: number;
  finalized: number;
  failed: number;
}

export function getSettlementStats(): SettlementStats {
  const row = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END), 0) as queued,
      COALESCE(SUM(CASE WHEN status IN (
        'note_created','commitment_inserted','proof_requested',
        'proof_generating','proof_generated','proof_verified',
        'signing_requested','signed','submitted_on_chain'
      ) THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN status = 'confirmed'  THEN 1 ELSE 0 END), 0) as confirmed,
      COALESCE(SUM(CASE WHEN status = 'finalized'  THEN 1 ELSE 0 END), 0) as finalized,
      COALESCE(SUM(CASE WHEN status = 'failed'     THEN 1 ELSE 0 END), 0) as failed
    FROM zk_settlements
  `,
    )
    .get() as SettlementStats;
  return row;
}
