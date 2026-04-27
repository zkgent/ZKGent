import crypto from "crypto";
import { verify } from "@noble/ed25519";
import bs58 from "@solana/web3.js";
import { db, generateId } from "../db.js";

const CHALLENGE_TTL_MS = 5 * 60_000;
const SESSION_TTL_MS = 12 * 60 * 60_000;
const MAX_ACTIVE_CHALLENGES_PER_WALLET = 5;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface WalletAuthChallengeRow {
  id: string;
  wallet_address: string;
  nonce: string;
  message: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface WalletSessionRow {
  id: string;
  wallet_address: string;
  session_token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizeWalletAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const wallet = input.trim();
  if (!wallet || !SOLANA_ADDRESS_RE.test(wallet)) return null;
  return wallet;
}

function ensureWalletAuthTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_auth_challenges (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS wallet_sessions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      session_token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_seen_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_auth_challenges_wallet
      ON wallet_auth_challenges(wallet_address, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet
      ON wallet_sessions(wallet_address, created_at DESC);
  `);
}

ensureWalletAuthTables();

export function cleanupExpiredWalletAuthState() {
  const now = nowIso();
  db.prepare("DELETE FROM wallet_auth_challenges WHERE expires_at < ? OR used_at IS NOT NULL").run(
    now,
  );
  db.prepare("DELETE FROM wallet_sessions WHERE expires_at < ? OR revoked_at IS NOT NULL").run(now);
}

export function createWalletChallenge(walletAddress: string) {
  cleanupExpiredWalletAuthState();

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (!normalizedWallet) {
    throw new Error("valid_wallet_address_required");
  }

  const activeCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM wallet_auth_challenges
       WHERE wallet_address = ? AND used_at IS NULL AND expires_at >= ?`,
      )
      .get(normalizedWallet, nowIso()) as { count: number }
  ).count;

  if (activeCount >= MAX_ACTIVE_CHALLENGES_PER_WALLET) {
    throw new Error("too_many_active_challenges");
  }

  const id = generateId("WAC");
  const nonce = crypto.randomBytes(24).toString("hex");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const message = [
    "ZKGENT wallet authentication",
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${createdAt}`,
    `Expires At: ${expiresAt}`,
    "Purpose: Authenticate this wallet for protected ZKGENT actions.",
  ].join("\n");

  db.prepare(
    `INSERT INTO wallet_auth_challenges (id, wallet_address, nonce, message, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, normalizedWallet, nonce, message, createdAt, expiresAt);

  return {
    id,
    wallet_address: normalizedWallet,
    nonce,
    message,
    created_at: createdAt,
    expires_at: expiresAt,
  };
}

export async function verifyWalletChallenge(opts: {
  walletAddress: string;
  challengeId: string;
  signatureBase58: string;
}) {
  cleanupExpiredWalletAuthState();

  const normalizedWallet = normalizeWalletAddress(opts.walletAddress);
  if (!normalizedWallet) throw new Error("valid_wallet_address_required");

  const challenge = db
    .prepare(
      `SELECT * FROM wallet_auth_challenges
       WHERE id = ? AND wallet_address = ? AND used_at IS NULL AND expires_at >= ?`,
    )
    .get(opts.challengeId, normalizedWallet, nowIso()) as WalletAuthChallengeRow | undefined;

  if (!challenge) throw new Error("challenge_not_found_or_expired");

  let publicKeyBytes: Uint8Array;
  let signatureBytes: Uint8Array;
  try {
    publicKeyBytes = bs58.decode(normalizedWallet);
    signatureBytes = bs58.decode(opts.signatureBase58);
  } catch {
    throw new Error("invalid_base58_signature_or_wallet");
  }

  const messageBytes = new TextEncoder().encode(challenge.message);
  const ok = await verify(signatureBytes, messageBytes, publicKeyBytes);
  if (!ok) throw new Error("invalid_signature");

  const usedAt = nowIso();
  db.prepare("UPDATE wallet_auth_challenges SET used_at = ? WHERE id = ?").run(
    usedAt,
    challenge.id,
  );

  const sessionId = generateId("WAS");
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO wallet_sessions
      (id, wallet_address, session_token_hash, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(sessionId, normalizedWallet, tokenHash, usedAt, expiresAt, usedAt);

  return {
    session: {
      id: sessionId,
      wallet_address: normalizedWallet,
      token: rawToken,
      created_at: usedAt,
      expires_at: expiresAt,
    },
  };
}

export function getWalletSession(rawToken: string) {
  cleanupExpiredWalletAuthState();
  const tokenHash = hashToken(rawToken);
  const session = db
    .prepare(
      `SELECT * FROM wallet_sessions
       WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at >= ?`,
    )
    .get(tokenHash, nowIso()) as WalletSessionRow | undefined;
  if (!session) return null;

  db.prepare("UPDATE wallet_sessions SET last_seen_at = ? WHERE id = ?").run(nowIso(), session.id);
  return session;
}

export function revokeWalletSession(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  db.prepare(
    `UPDATE wallet_sessions SET revoked_at = ?, last_seen_at = ?
     WHERE session_token_hash = ? AND revoked_at IS NULL`,
  ).run(nowIso(), nowIso(), tokenHash);
}
