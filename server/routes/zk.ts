/**
 * ZKGENT ZK System API Routes
 */

import { Router } from "express";
import { requireApprovedWallet } from "./access.js";
import { getNoteStats, getAllNotes } from "../domain/note.js";
import { getCommitmentStats, getAllCommitments } from "../domain/commitment.js";
import { getNullifierStats, getAllNullifiers } from "../domain/nullifier.js";
import { getMerkleStats } from "../domain/merkle.js";
import {
  getProofStats, getAllProofs, getCircuitStatus, getProofById,
  isTransferCircuitReady, TRANSFER_CIRCUIT_INFO,
} from "../domain/proof.js";
import { verifySpend } from "../domain/transfer_circuit.js";
import { proveAndVerifyPreimage, getGroth16Status } from "../domain/groth16.js";
import {
  getSettlementStats, getSettlementQueue,
  queueSettlement, executeSettlement, getLatestOnChainTxs,
} from "../domain/settlement.js";
import { checkSolanaStatus, getSolanaConfig } from "../domain/solana.js";
import { ensureOperatorFunded, getOperatorAddress, getLatestTxs } from "../domain/solana_tx.js";
import { getKeySet } from "../domain/keys.js";
import { getDisclosureStatus } from "../domain/disclosure.js";
import { getProverPublicKey } from "../domain/proof.js";
import { getCeremonyState, getCeremonySummary } from "../domain/ceremony.js";
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

    const keys     = getKeySet();
    const circuit  = getCircuitStatus();
    const groth16Status = getGroth16Status();
    const latestTxs = getLatestTxs(3);
    const operatorAddress = getOperatorAddress();
    const ceremony = getCeremonySummary();

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
      groth16: groth16Status,
      ceremony,
      hash_chain: {
        scheme: "poseidon-bn254-v1",
        curve:  "BN254 (alt_bn128)",
        note:   "Commitments, nullifiers and Merkle nodes use Poseidon (ZK-friendly).",
      },
      on_chain: {
        operator_address: operatorAddress,
        latest_txs: latestTxs,
      },
      system: {
        version:     "0.4.0-alpha-D1",
        proof_real:  true,
        // Active proof type for new settlements: real Groth16 spend proof
        // when artifacts are on disk; falls back to the legacy Ed25519
        // operator-authorization proof otherwise.
        proof_type:  isTransferCircuitReady()
          ? "groth16-zkgent-transfer-v1"
          : "ed25519-operator-proof-v1",
        snark_ready:    isTransferCircuitReady(),
        snark_circuit:  isTransferCircuitReady() ? TRANSFER_CIRCUIT_INFO : null,
        // Toy demo pipeline (preimage circuit) — independent of production transfer.
        snark_demo_ready: groth16Status.available,
        snark_demo_circuit: groth16Status.circuit_id,
        note: !isTransferCircuitReady()
          ? "Ed25519 operator proofs verify settlements. Production Groth16 transfer circuit artifacts not present."
          : !ceremony.hashes_consistent
            ? `INTEGRITY DEGRADED: on-disk transfer_final.zkey / verification_key.json do NOT match the recorded ceremony manifest hashes. Refusing to claim production status. Re-run npm run ceremony:verify to investigate.`
            : `PRODUCTION ZK ACTIVE: Groth16 spend proofs (5,914 R1CS constraints over BN254 / Poseidon) generated server-side via snarkjs and verified before on-chain submit. Phase-1 ptau: multi-party Hermez ceremony (140+ contributors). Phase-2: ${ceremony.contributors_count} contributor(s)${ceremony.beacon_applied ? " + Solana mainnet beacon" : ""} (trust=${ceremony.trust_level}) — see /api/zk/ceremony for the full chain.`,
        integrity_status: ceremony.hashes_consistent ? "ok" : "degraded",
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ceremony (Phase-2 trusted setup chain) ──────────────────────────────────

zkRouter.get("/ceremony", (_req, res) => {
  try {
    const state = getCeremonyState();
    res.json(state);
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

/**
 * Independent re-verification endpoint.
 * Anyone with the proof_data + verification key can re-verify a Groth16
 * spend proof from scratch — no DB state is consulted beyond fetching
 * the proof artifact. Useful for auditors and the UI.
 */
zkRouter.get("/proofs/:id/verify", async (req, res) => {
  try {
    const proof = getProofById(req.params.id);
    if (!proof)              return res.status(404).json({ error: "proof_not_found" });
    if (!proof.proof_data)   return res.status(400).json({ error: "proof_has_no_data" });

    let payload: any;
    try { payload = JSON.parse(proof.proof_data); }
    catch { return res.status(400).json({ error: "proof_data_not_json" }); }

    if (payload?._type !== "groth16-zkgent-transfer-v1") {
      return res.json({
        proof_id: proof.id,
        proof_type_in_db: proof.proof_type,
        proof_backend: proof.prover_backend,
        verifiable_here: false,
        reason: "this_endpoint_only_verifies_groth16_transfer_proofs",
      });
    }

    const result = await verifySpend(payload);
    res.json({
      proof_id:       proof.id,
      circuit_id:     proof.circuit_id,
      circuit_version: (proof as any).circuit_version,
      backend:        proof.prover_backend,
      valid:          result.valid,
      verify_ms:      result.verify_ms,
      reason:         result.reason,
      public_signals: payload.publicSignals,
      verifier_note:  "Re-verified live via snarkjs.groth16.verify against the deployed verification key. No trust in this server's stored verification_result.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

zkRouter.get("/circuit", (_req, res) => {
  try { res.json(getCircuitStatus()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Real Groth16 (toy preimage circuit) ──────────────────────────────────────

zkRouter.get("/groth16/status", (_req, res) => {
  try { res.json(getGroth16Status()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * Demo: prove (and verify) knowledge of a Poseidon preimage.
 *   GET /api/zk/groth16/demo                — random preimage
 *   GET /api/zk/groth16/demo?preimage=42    — specific preimage (hex or decimal-as-hex)
 *
 * Uses the real Circom circuit + snarkjs Groth16. Returns timing and the
 * verification result.
 */
// Admin-gated: proving is CPU-expensive (~600ms per call), so we don't expose
// it as an unauthenticated endpoint (DoS vector).
const ADMIN_KEY = process.env.ADMIN_KEY || "zkgent-admin-dev";
zkRouter.get("/groth16/demo", async (req, res) => {
  const key =
    (req.headers["x-admin-key"] as string) ||
    (typeof req.query.key === "string" ? req.query.key : undefined);
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
      hint: "Provide x-admin-key header or ?key= query param. This endpoint runs a real Groth16 prove (~600ms CPU) and is rate-limited to admins.",
    });
  }
  try {
    const preimageInput = typeof req.query.preimage === "string"
      ? req.query.preimage
      : undefined;
    const result = await proveAndVerifyPreimage(preimageInput);
    if (result.ok) {
      logActivity({
        category: "zk",
        event: "groth16_proof_verified",
        detail: `Preimage circuit proof verified in ${result.prove_ms}ms (verify ${result.verify_ms}ms)`,
        operator: "system",
        status: "success",
        relatedEntityType: "groth16_proof",
        relatedEntityId: result.expected_hash.slice(0, 16),
      });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Settlement ───────────────────────────────────────────────────────────────

zkRouter.get("/settlement/queue", (_req, res) => {
  try {
    const queue = getSettlementQueue();
    const latestTxs = getLatestOnChainTxs();
    res.json({ stats: getSettlementStats(), queue, latest_on_chain_txs: latestTxs });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

zkRouter.post("/settlement/initiate", requireApprovedWallet, async (req, res) => {
  const { transfer_id, value, asset, recipient_fingerprint, memo } = req.body;
  // Use the wallet validated by requireApprovedWallet — never re-read from
  // body, otherwise a caller could authorize one wallet and act on another.
  const initiated_by_wallet = (req as any).walletAddress as string;
  if (!transfer_id || value == null || !recipient_fingerprint) {
    return res.status(400).json({ error: "transfer_id, value, recipient_fingerprint required" });
  }
  try {
    const record = queueSettlement({
      transferId: transfer_id, value, asset: asset ?? "USDC",
      recipientFingerprint: recipient_fingerprint, memo,
    });

    // Link settlement to wallet if provided
    if (initiated_by_wallet) {
      db.prepare(`UPDATE zk_settlements SET initiated_by_wallet = ? WHERE id = ?`)
        .run(initiated_by_wallet, record.id);
    }

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

// ─── Transaction preparation (real signTransaction flow) ──────────────────────

/**
 * POST /api/zk/tx/prepare
 *
 * Build a real, serialized Solana Transaction for wallet signing.
 * Frontend receives base64-encoded serialized bytes, passes to
 * wallet.signTransaction(Transaction.from(Buffer.from(base64, 'base64'))),
 * submits to chain, then calls POST /api/zk/tx/confirm with the tx signature.
 *
 * Body: { settlement_id, wallet_address }
 */
zkRouter.post("/tx/prepare", requireApprovedWallet, async (req, res) => {
  const { settlement_id } = req.body;
  // Always use the middleware-validated wallet — body field is ignored.
  const wallet_address = (req as any).walletAddress as string;
  if (!settlement_id || typeof settlement_id !== "string") {
    return res.status(400).json({ error: "settlement_id required" });
  }

  const settlement = db.prepare(`SELECT * FROM zk_settlements WHERE id = ?`).get(settlement_id) as any;
  if (!settlement) return res.status(404).json({ error: "settlement_not_found" });

  try {
    const { buildSettlementMemoTx } = await import("../domain/solana_tx.js");
    const { getSolanaConfig, getTxExplorerUrl } = await import("../domain/solana.js");

    const config = getSolanaConfig();
    const memo = {
      settlement_id:    settlement.id,
      commitment_short: (settlement.commitment ?? "pending").slice(0, 12),
      nullifier_short:  (settlement.nullifier  ?? "pending").slice(0, 12),
      proof_id:         settlement.proof_id    ?? "pending",
      version:          "v1",
    };

    const tx = await buildSettlementMemoTx(memo);
    // Serialize without requiring all signatures (wallet will add their sig)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const serializedBase64 = Buffer.from(serialized).toString("base64");

    const requestId = generateId("TXR");
    const now     = new Date().toISOString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO zk_signing_requests
        (id, settlement_id, tx_data, status, wallet_address, requested_at, expires_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `).run(requestId, settlement_id, serializedBase64, wallet_address, now, expires);

    db.prepare(`UPDATE zk_settlements SET status = 'signing_requested', signing_request_id = ?, initiated_by_wallet = COALESCE(initiated_by_wallet, ?) WHERE id = ?`)
      .run(requestId, wallet_address, settlement_id);

    logActivity({
      category: "settlement", event: "tx_prepared",
      detail: `Tx prepared for wallet ${wallet_address.slice(0, 8)}… settlement ${settlement_id}`,
      status: "info",
    });

    res.json({
      request_id:         requestId,
      serialized_tx:      serializedBase64,
      network:            config.network,
      is_mainnet:         config.is_mainnet,
      memo_text:          `zkgent:v1:${settlement_id}:${memo.commitment_short}:${memo.nullifier_short}`,
      expires_at:         expires,
      status:             "ready_to_sign",
      note:               "Deserialize with Transaction.from(Buffer.from(serialized_tx, 'base64')), then signTransaction + sendRawTransaction.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zk/tx/confirm
 *
 * Called by frontend after wallet signed and submitted the transaction to Solana.
 * Records the on-chain signature and updates settlement state.
 *
 * Body: { request_id, tx_signature, wallet_address, network }
 */
zkRouter.post("/tx/confirm", async (req, res) => {
  const { request_id, tx_signature, wallet_address, network } = req.body;
  if (!request_id || typeof request_id !== "string") {
    return res.status(400).json({ error: "request_id required" });
  }
  if (!tx_signature || typeof tx_signature !== "string") {
    return res.status(400).json({ error: "tx_signature required (Solana base58 signature)" });
  }
  if (!wallet_address || typeof wallet_address !== "string") {
    return res.status(400).json({ error: "wallet_address required" });
  }

  const signing_request = db.prepare(
    `SELECT * FROM zk_signing_requests WHERE id = ?`
  ).get(request_id) as any;
  if (!signing_request) return res.status(404).json({ error: "signing_request_not_found" });

  const { getTxExplorerUrl } = await import("../domain/solana.js");
  const net = (network ?? "mainnet-beta") as any;
  const explorerUrl = getTxExplorerUrl(tx_signature, net);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE zk_signing_requests
    SET status = 'signed', wallet_address = ?, signature = ?, responded_at = ?
    WHERE id = ?
  `).run(wallet_address, tx_signature, now, request_id);

  if (signing_request.settlement_id) {
    db.prepare(`
      UPDATE zk_settlements SET
        status = 'submitted_on_chain',
        on_chain_tx_sig = ?,
        on_chain_explorer_url = ?,
        submitted_on_chain_at = ?,
        initiated_by_wallet = COALESCE(initiated_by_wallet, ?)
      WHERE id = ?
    `).run(tx_signature, explorerUrl, now, wallet_address, signing_request.settlement_id);

    const { recordOnChainTx } = await import("../domain/solana_tx.js");
    recordOnChainTx({
      settlementId: signing_request.settlement_id,
      signature:    tx_signature,
      status:       "submitted",
      memoData:     signing_request.settlement_id,
      explorerUrl,
    });
  }

  logActivity({
    category: "settlement", event: "wallet_signed_and_submitted",
    detail:   `Wallet ${wallet_address.slice(0, 8)}… submitted tx ${tx_signature.slice(0, 16)}… on ${net}`,
    status:   "success",
  });

  res.json({
    success:      true,
    tx_signature,
    explorer_url: explorerUrl,
    status:       "submitted_on_chain",
  });
});

/**
 * GET /api/zk/tx/:requestId
 * Get status of a tx prepare request.
 */
zkRouter.get("/tx/:requestId", (req, res) => {
  try {
    const r = db.prepare(`SELECT id, settlement_id, status, wallet_address, requested_at, expires_at, responded_at FROM zk_signing_requests WHERE id = ?`).get(req.params.requestId);
    if (!r) return res.status(404).json({ error: "not_found" });
    res.json(r);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Legacy signing (debug/message authorization) ────────────────────────────
// signMessage flow kept for debugging. Not the primary settlement path.

zkRouter.post("/signing/request", async (req, res) => {
  return res.status(410).json({
    error: "deprecated",
    note:  "Use POST /api/zk/tx/prepare for real signTransaction flow.",
  });
});

zkRouter.post("/signing/respond", async (req, res) => {
  return res.status(410).json({
    error: "deprecated",
    note:  "Use POST /api/zk/tx/confirm after wallet signs and submits.",
  });
});

zkRouter.get("/signing/:id", (req, res) => {
  try {
    const r = db.prepare(`SELECT id, settlement_id, status, wallet_address, requested_at, expires_at, responded_at FROM zk_signing_requests WHERE id = ?`).get(req.params.id);
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
