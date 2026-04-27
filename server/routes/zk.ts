/**
 * ZKGENT ZK System API Routes
 */

import { Router } from "express";
import { getNoteStats, getAllNotes } from "../domain/note.js";
import { getCommitmentStats, getAllCommitments } from "../domain/commitment.js";
import { getNullifierStats, getAllNullifiers } from "../domain/nullifier.js";
import { getMerkleStats } from "../domain/merkle.js";
import { getProofStats, getAllProofs, getCircuitStatus } from "../domain/proof.js";
import {
  getSettlementStats, getSettlementQueue,
  queueSettlement, executeSettlement, getLatestOnChainTxs,
} from "../domain/settlement.js";
import { checkSolanaStatus, getSolanaConfig } from "../domain/solana.js";
import { ensureOperatorFunded, getOperatorAddress, getLatestTxs } from "../domain/solana_tx.js";
import { getKeySet } from "../domain/keys.js";
import { getDisclosureStatus } from "../domain/disclosure.js";
import { getProverPublicKey } from "../domain/proof.js";
import { logActivity, generateId, db } from "../db.js";

export const zkRouter = Router();

// ─── System metrics ───────────────────────────────────────────────────────────

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

    const keys    = getKeySet();
    const circuit = getCircuitStatus();
    const latestTxs = getLatestTxs(3);
    const operatorAddress = getOperatorAddress();

    res.json({
      notes, commitments, nullifiers, merkle, proofs, settlements,
      solana, disclosure,
      keys: {
        operator_fingerprint:   keys.operator.fingerprint,
        signing_fingerprint:    keys.signing.fingerprint,
        encryption_fingerprint: keys.encryption.fingerprint,
        viewing_fingerprint:    keys.viewing.fingerprint,
        custody_mode:           keys.operator.custody_mode,
      },
      circuit,
      on_chain: {
        operator_address: operatorAddress,
        latest_txs: latestTxs,
      },
      system: {
        version:     "0.2.0-alpha",
        proof_real:  true,
        proof_type:  "ed25519-operator-proof-v1",
        snark_ready: circuit.transfer.available,
        note: "Ed25519 operator proofs are REAL (cryptographic). Full zk-SNARK requires Circom circuit compilation.",
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Notes, Commitments, Nullifiers ──────────────────────────────────────────

zkRouter.get("/notes", (_req, res) => {
  try { res.json({ stats: getNoteStats(), notes: getAllNotes(50) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/commitments", (_req, res) => {
  try { res.json({ stats: getCommitmentStats(), commitments: getAllCommitments(50) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/nullifiers", (_req, res) => {
  try { res.json({ stats: getNullifierStats(), nullifiers: getAllNullifiers(50) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/merkle", (_req, res) => {
  try { res.json(getMerkleStats()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Proofs ───────────────────────────────────────────────────────────────────

zkRouter.get("/proofs", (_req, res) => {
  try { res.json({ stats: getProofStats(), proofs: getAllProofs(50), circuit: getCircuitStatus() }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/circuit", (_req, res) => {
  try { res.json(getCircuitStatus()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Settlement ───────────────────────────────────────────────────────────────

zkRouter.get("/settlement/queue", (_req, res) => {
  try {
    const queue = getSettlementQueue();
    const latestTxs = getLatestOnChainTxs();
    res.json({ stats: getSettlementStats(), queue, latest_on_chain_txs: latestTxs });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.post("/settlement/initiate", async (req, res) => {
  const { transfer_id, value, asset, recipient_fingerprint, memo } = req.body;
  if (!transfer_id || value == null || !recipient_fingerprint) {
    return res.status(400).json({ error: "transfer_id, value, recipient_fingerprint required" });
  }
  try {
    const record = queueSettlement({
      transferId: transfer_id, value, asset: asset ?? "USDC",
      recipientFingerprint: recipient_fingerprint, memo,
    });

    // Execute asynchronously in background
    executeSettlement(record.id, {
      value, asset: asset ?? "USDC",
      recipientFingerprint: recipient_fingerprint, memo,
    }).catch(err => console.error("[settlement]", err));

    res.json({ settlement_id: record.id, status: record.status });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/settlement/:id", (req, res) => {
  try {
    const record = db.prepare(`SELECT * FROM zk_settlements WHERE id = ?`).get(req.params.id);
    if (!record) return res.status(404).json({ error: "not_found" });
    res.json(record);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── On-chain transactions ────────────────────────────────────────────────────

zkRouter.get("/transactions", (_req, res) => {
  try { res.json(getLatestTxs(20)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/solana", async (_req, res) => {
  try {
    const [status, funded] = await Promise.all([
      checkSolanaStatus(),
      ensureOperatorFunded().catch(e => ({ address: getOperatorAddress(), balance: 0, airdropped: false, error: e.message })),
    ]);
    const config = getSolanaConfig();
    res.json({
      status, funded,
      config: { network: config.network, commitment: config.commitment },
      operator_address: getOperatorAddress(),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Wallet signing flow ──────────────────────────────────────────────────────

/**
 * POST /api/zk/signing/request
 * Create a signing request for a browser wallet.
 * The frontend reads this, connects wallet, signs the tx, and calls /respond.
 */
zkRouter.post("/signing/request", async (req, res) => {
  const { settlement_id } = req.body;
  if (!settlement_id) return res.status(400).json({ error: "settlement_id required" });

  const settlement = db.prepare(`SELECT * FROM zk_settlements WHERE id = ?`).get(settlement_id) as any;
  if (!settlement) return res.status(404).json({ error: "settlement_not_found" });

  const id = generateId("SGN");
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Build a simple tx data payload for the wallet to sign
  // (real serialized tx would come from solana_tx.ts buildSettlementMemoTx)
  const txData = Buffer.from(JSON.stringify({
    settlement_id,
    commitment:  settlement.commitment?.slice(0, 16) ?? "pending",
    nullifier:   settlement.nullifier?.slice(0, 16) ?? "pending",
    action:      "confidential_settlement",
    version:     "v1",
    timestamp:   now,
  })).toString("base64");

  db.prepare(`
    INSERT INTO zk_signing_requests
      (id, settlement_id, tx_data, status, requested_at, expires_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(id, settlement_id, txData, now, expires);

  res.json({
    signing_request_id: id,
    tx_data: txData,
    expires_at: expires,
    status: "pending",
  });
});

/**
 * POST /api/zk/signing/respond
 * Wallet responds with signature.
 */
zkRouter.post("/signing/respond", async (req, res) => {
  const { signing_request_id, wallet_address, signature } = req.body;
  if (!signing_request_id || !wallet_address || !signature) {
    return res.status(400).json({ error: "signing_request_id, wallet_address, signature required" });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE zk_signing_requests
      SET status = 'signed', wallet_address = ?, signature = ?, responded_at = ?
    WHERE id = ?
  `).run(wallet_address, signature, now, signing_request_id);

  const req2 = db.prepare(`SELECT * FROM zk_signing_requests WHERE id = ?`).get(signing_request_id) as any;
  if (req2?.settlement_id) {
    db.prepare(`UPDATE zk_settlements SET status = 'signed', signing_request_id = ? WHERE id = ?`)
      .run(signing_request_id, req2.settlement_id);
  }

  logActivity({
    category: "settlement", event: "wallet_signed",
    detail: `Wallet ${wallet_address.slice(0, 8)}… signed settlement ${req2?.settlement_id}`,
    status: "success",
  });

  res.json({ success: true, status: "signed" });
});

zkRouter.get("/signing/:id", (req, res) => {
  try {
    const r = db.prepare(`SELECT * FROM zk_signing_requests WHERE id = ?`).get(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    res.json(r);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Keys / disclosure ────────────────────────────────────────────────────────

zkRouter.get("/keys", (_req, res) => {
  try {
    const ks = getKeySet();
    res.json({
      keys: ks,
      prover_pubkey: getProverPublicKey(),
      note: "Only key fingerprints and public keys are returned. No private key material is ever exposed.",
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.get("/disclosure", (_req, res) => {
  try { res.json(getDisclosureStatus()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});
