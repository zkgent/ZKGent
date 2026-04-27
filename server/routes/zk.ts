/**
 * ZKGENT ZK System API Routes
 *
 * All ZK/confidential payment system endpoints.
 * These routes power the upgraded dashboard and ZK observability.
 */

import { Router } from "express";
import { getNoteStats, getAllNotes } from "../domain/note.js";
import { getCommitmentStats, getAllCommitments } from "../domain/commitment.js";
import { getNullifierStats, getAllNullifiers } from "../domain/nullifier.js";
import { getMerkleStats } from "../domain/merkle.js";
import { getProofStats, getAllProofs } from "../domain/proof.js";
import { getSettlementStats, getSettlementQueue, queueSettlement, executeSettlement } from "../domain/settlement.js";
import { checkSolanaStatus, getSolanaConfig } from "../domain/solana.js";
import { getKeySet } from "../domain/keys.js";
import { getDisclosureStatus } from "../domain/disclosure.js";
import { logActivity } from "../db.js";

export const zkRouter = Router();

/**
 * GET /api/zk/system
 * Full system metrics — powers the dashboard observability panel.
 */
zkRouter.get("/system", async (_req, res) => {
  try {
    const [notes, commitments, nullifiers, merkle, proofs, settlements, solana, disclosure] =
      await Promise.all([
        Promise.resolve(getNoteStats()),
        Promise.resolve(getCommitmentStats()),
        Promise.resolve(getNullifierStats()),
        Promise.resolve(getMerkleStats()),
        Promise.resolve(getProofStats()),
        Promise.resolve(getSettlementStats()),
        checkSolanaStatus(),
        Promise.resolve(getDisclosureStatus()),
      ]);

    const keys = getKeySet();

    res.json({
      notes,
      commitments,
      nullifiers,
      merkle,
      proofs,
      settlements,
      solana,
      disclosure,
      keys: {
        operator_fingerprint:   keys.operator.fingerprint,
        signing_fingerprint:    keys.signing.fingerprint,
        encryption_fingerprint: keys.encryption.fingerprint,
        viewing_fingerprint:    keys.viewing.fingerprint,
        custody_mode:           keys.operator.custody_mode,
      },
      system: {
        version: "0.1.0-alpha",
        zk_ready: false,
        note: "ZK proof generation requires compiled circuits (SCAFFOLD). All other subsystems operational.",
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/notes
 * List notes with stats.
 */
zkRouter.get("/notes", (_req, res) => {
  try {
    const stats = getNoteStats();
    const notes = getAllNotes(50);
    res.json({ stats, notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/commitments
 * List commitments.
 */
zkRouter.get("/commitments", (_req, res) => {
  try {
    const stats = getCommitmentStats();
    const commitments = getAllCommitments(50);
    res.json({ stats, commitments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/nullifiers
 * List nullifiers (anti-double-spend registry).
 */
zkRouter.get("/nullifiers", (_req, res) => {
  try {
    const stats = getNullifierStats();
    const nullifiers = getAllNullifiers(50);
    res.json({ stats, nullifiers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/merkle
 * Merkle tree state.
 */
zkRouter.get("/merkle", (_req, res) => {
  try {
    res.json(getMerkleStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/proofs
 * List proof artifacts.
 */
zkRouter.get("/proofs", (_req, res) => {
  try {
    const stats = getProofStats();
    const proofs = getAllProofs(50);
    res.json({ stats, proofs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/settlement/queue
 * Get settlement queue.
 */
zkRouter.get("/settlement/queue", (_req, res) => {
  try {
    const stats = getSettlementStats();
    const queue = getSettlementQueue();
    res.json({ stats, queue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zk/settlement/initiate
 * Initiate a confidential settlement for a transfer.
 */
zkRouter.post("/settlement/initiate", async (req, res) => {
  const { transfer_id, value, asset, recipient_fingerprint, memo } = req.body;
  if (!transfer_id || value == null || !recipient_fingerprint) {
    return res.status(400).json({ error: "transfer_id, value, recipient_fingerprint required" });
  }

  try {
    const record = queueSettlement({
      transferId: transfer_id,
      value,
      asset: asset ?? "USDC",
      recipientFingerprint: recipient_fingerprint,
      memo,
    });

    // Execute asynchronously
    executeSettlement(record.id, {
      value,
      asset: asset ?? "USDC",
      recipientFingerprint: recipient_fingerprint,
      memo,
    }).catch(err => {
      console.error("[settlement]", err);
    });

    res.json({ settlement_id: record.id, status: record.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/solana
 * Solana network status.
 */
zkRouter.get("/solana", async (_req, res) => {
  try {
    const status = await checkSolanaStatus();
    const config = getSolanaConfig();
    res.json({ status, config: { network: config.network, commitment: config.commitment } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/keys
 * Key set status (fingerprints only, no secret material).
 */
zkRouter.get("/keys", (_req, res) => {
  try {
    const ks = getKeySet();
    res.json({
      keys: ks,
      note: "Only key fingerprints are returned. No private key material is ever exposed via API.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/zk/disclosure
 * Compliance disclosure status.
 */
zkRouter.get("/disclosure", (_req, res) => {
  try {
    res.json(getDisclosureStatus());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
