/**
 * ZKGENT Wallet Identity Model
 *
 * Each Solana wallet that connects gets a persistent identity record.
 * Identity is wallet-address-based — no web2 auth.
 *
 * STATUS: IMPLEMENTED
 */

import crypto from "crypto";
import { db, generateId } from "../db.js";

export interface WalletUser {
  id: string;                   // "WID-XXXXXXXX"
  wallet_address: string;       // base58 Solana address
  identity_fingerprint: string; // short derived ID for display
  wallet_name: string | null;   // "Phantom", "Backpack", etc.
  network_preference: string;   // "devnet" | "mainnet-beta"
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
}

export interface WalletActivity {
  settlements: Array<{
    id: string;
    status: string;
    commitment: string | null;
    on_chain_tx_sig: string | null;
    on_chain_explorer_url: string | null;
    queued_at: string;
    finalized_at: string | null;
  }>;
  signing_requests: Array<{
    id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
  }>;
  onchain_txs: Array<{
    signature: string;
    status: string;
    explorer_url: string | null;
    submitted_at: string;
  }>;
}

/**
 * Derive a short fingerprint from a wallet address.
 * Safe to display publicly.
 */
export function deriveIdentityFingerprint(walletAddress: string): string {
  const hash = crypto
    .createHmac("sha256", "zkgent:identity:fingerprint:v1")
    .update(walletAddress)
    .digest("hex");
  return `ZKG:${hash.slice(0, 4).toUpperCase()}:${hash.slice(4, 8).toUpperCase()}`;
}

/**
 * Upsert a wallet identity record.
 * On first connect: creates record.
 * On reconnect: updates last_seen_at, session_count, wallet_name if changed.
 */
export function upsertWalletUser(opts: {
  wallet_address: string;
  wallet_name?: string;
  network_preference?: string;
}): WalletUser {
  const now = new Date().toISOString();
  const existing = db.prepare(
    `SELECT * FROM wallet_users WHERE wallet_address = ?`
  ).get(opts.wallet_address) as WalletUser | null;

  if (existing) {
    db.prepare(`
      UPDATE wallet_users
      SET last_seen_at = ?,
          session_count = session_count + 1,
          wallet_name = COALESCE(?, wallet_name),
          network_preference = COALESCE(?, network_preference)
      WHERE wallet_address = ?
    `).run(now, opts.wallet_name ?? null, opts.network_preference ?? null, opts.wallet_address);

    return db.prepare(
      `SELECT * FROM wallet_users WHERE wallet_address = ?`
    ).get(opts.wallet_address) as WalletUser;
  }

  const id          = generateId("WID");
  const fingerprint = deriveIdentityFingerprint(opts.wallet_address);

  db.prepare(`
    INSERT INTO wallet_users
      (id, wallet_address, identity_fingerprint, wallet_name, network_preference,
       first_seen_at, last_seen_at, session_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    opts.wallet_address,
    fingerprint,
    opts.wallet_name ?? null,
    opts.network_preference ?? "devnet",
    now,
    now
  );

  return db.prepare(
    `SELECT * FROM wallet_users WHERE wallet_address = ?`
  ).get(opts.wallet_address) as WalletUser;
}

export function getWalletUser(walletAddress: string): WalletUser | null {
  return db.prepare(
    `SELECT * FROM wallet_users WHERE wallet_address = ?`
  ).get(walletAddress) as WalletUser | null;
}

export function getWalletActivity(walletAddress: string): WalletActivity {
  const settlements = db.prepare(`
    SELECT id, status, commitment, on_chain_tx_sig, on_chain_explorer_url,
           queued_at, finalized_at
    FROM zk_settlements
    WHERE initiated_by_wallet = ?
    ORDER BY queued_at DESC LIMIT 20
  `).all(walletAddress) as WalletActivity["settlements"];

  const signing_requests = db.prepare(`
    SELECT id, status, requested_at, responded_at
    FROM zk_signing_requests
    WHERE wallet_address = ?
    ORDER BY requested_at DESC LIMIT 10
  `).all(walletAddress) as WalletActivity["signing_requests"];

  const onchain_txs = db.prepare(`
    SELECT ot.signature, ot.status, ot.explorer_url, ot.submitted_at
    FROM zk_onchain_txs ot
    JOIN zk_settlements s ON s.id = ot.settlement_id
    WHERE s.initiated_by_wallet = ?
    ORDER BY ot.submitted_at DESC LIMIT 10
  `).all(walletAddress) as WalletActivity["onchain_txs"];

  return { settlements, signing_requests, onchain_txs };
}

export function getAllWalletUsers(limit = 50): WalletUser[] {
  return db.prepare(
    `SELECT * FROM wallet_users ORDER BY last_seen_at DESC LIMIT ?`
  ).all(limit) as WalletUser[];
}
