/**
 * ZKGENT Note System
 *
 * A "note" is the fundamental unit of value in the shielded state.
 * Each note represents a discrete, unspent amount owned by a party.
 *
 * STATUS:
 *   - Note model, schema, and serialization: IMPLEMENTED
 *   - Note lifecycle (unspent → spent): IMPLEMENTED
 *   - Encrypted payload structure: IMPLEMENTED (AES-256-GCM scaffold using key derivation)
 *   - Actual recipient-specific ECIES encryption: SCAFFOLD
 *   - Proof of note ownership (ZK circuit): SCAFFOLD
 */

import { db } from "../db.js";
import {
  hash, domainHash, randomSalt, DOMAIN, shortHash, Bytes32
} from "./crypto.js";
import { computeCommitment } from "./commitment.js";
import { deriveNoteEncryptionKey } from "./keys.js";
import crypto from "crypto";

export type NoteStatus = "unspent" | "spent" | "pending_spend";

export interface Note {
  id: string;
  commitment: Bytes32;        // H(value || asset || owner_pubkey_hash || salt)
  owner_fingerprint: string;  // H(owner_pubkey) — no raw pubkey stored
  value: number;              // plaintext for operator; encrypted for others
  asset: string;              // e.g. "USDC"
  salt: Bytes32;              // random, unique per note
  status: NoteStatus;
  nullifier?: Bytes32;        // set when spent
  encrypted_payload: string;  // JSON blob encrypted with note key
  related_transfer_id?: string;
  merkle_index?: number;      // position in the Merkle tree (null if not yet inserted)
  created_at: string;
  spent_at?: string;
}

export interface NotePayload {
  value: number;
  asset: string;
  memo: string;
  sender_fingerprint: string;
  created_at: string;
}

/**
 * Encrypt note payload.
 * IMPLEMENTED: AES-256-GCM with derived key.
 * SCAFFOLD: In production, use ECIES with recipient's X25519 pubkey.
 */
function encryptPayload(payload: NotePayload, noteId: string): string {
  const key = Buffer.from(deriveNoteEncryptionKey(noteId), "hex").slice(0, 32);
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plain = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv:  iv.toString("hex"),
    ct:  enc.toString("hex"),
    tag: tag.toString("hex"),
  });
}

/**
 * Decrypt note payload.
 * IMPLEMENTED: AES-256-GCM decryption.
 */
export function decryptPayload(encrypted: string, noteId: string): NotePayload | null {
  try {
    const { iv, ct, tag } = JSON.parse(encrypted);
    const key = Buffer.from(deriveNoteEncryptionKey(noteId), "hex").slice(0, 32);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(ct, "hex")),
      decipher.final(),
    ]);
    return JSON.parse(dec.toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Create and persist a new note.
 * IMPLEMENTED.
 */
export function createNote(opts: {
  ownerFingerprint: string;
  value: number;
  asset: string;
  memo?: string;
  senderFingerprint?: string;
  relatedTransferId?: string;
}): Note {
  const salt = randomSalt();
  const commitment = computeCommitment({
    value: opts.value,
    asset: opts.asset,
    ownerFingerprintHash: opts.ownerFingerprint,
    salt,
  });
  const id = `NOTE-${shortHash(commitment, 12).toUpperCase()}`;
  const now = new Date().toISOString();

  const payload: NotePayload = {
    value: opts.value,
    asset: opts.asset,
    memo: opts.memo ?? "",
    sender_fingerprint: opts.senderFingerprint ?? "operator",
    created_at: now,
  };

  const encrypted_payload = encryptPayload(payload, id);

  const note: Note = {
    id,
    commitment,
    owner_fingerprint: opts.ownerFingerprint,
    value: opts.value,
    asset: opts.asset,
    salt,
    status: "unspent",
    encrypted_payload,
    related_transfer_id: opts.relatedTransferId,
    created_at: now,
  };

  db.prepare(`
    INSERT INTO zk_notes
      (id, commitment, owner_fingerprint, value, asset, salt, status,
       encrypted_payload, related_transfer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    note.id, note.commitment, note.owner_fingerprint, note.value,
    note.asset, note.salt, note.status, note.encrypted_payload,
    note.related_transfer_id ?? null, note.created_at
  );

  return note;
}

/**
 * Mark a note as spent (after nullifier is published).
 * IMPLEMENTED.
 */
export function markNoteSpent(noteId: string, nullifier: Bytes32): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE zk_notes SET status = 'spent', nullifier = ?, spent_at = ?
    WHERE id = ? AND status = 'unspent'
  `).run(nullifier, now, noteId);
}

export function getNoteById(id: string): Note | null {
  return db.prepare(`SELECT * FROM zk_notes WHERE id = ?`).get(id) as Note | null;
}

export function getUnspentNotes(ownerFingerprint?: string): Note[] {
  if (ownerFingerprint) {
    return db.prepare(
      `SELECT * FROM zk_notes WHERE status = 'unspent' AND owner_fingerprint = ? ORDER BY created_at DESC`
    ).all(ownerFingerprint) as Note[];
  }
  return db.prepare(
    `SELECT * FROM zk_notes WHERE status = 'unspent' ORDER BY created_at DESC`
  ).all() as Note[];
}

export function getAllNotes(limit = 100): Note[] {
  return db.prepare(
    `SELECT * FROM zk_notes ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as Note[];
}

export interface NoteStats {
  total: number;
  unspent: number;
  spent: number;
  pending_spend: number;
  total_shielded_value: number;
}

export function getNoteStats(): NoteStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'unspent' THEN 1 ELSE 0 END), 0) as unspent,
      COALESCE(SUM(CASE WHEN status = 'spent' THEN 1 ELSE 0 END), 0) as spent,
      COALESCE(SUM(CASE WHEN status = 'pending_spend' THEN 1 ELSE 0 END), 0) as pending_spend,
      COALESCE(SUM(CASE WHEN status = 'unspent' THEN value ELSE 0 END), 0) as total_shielded_value
    FROM zk_notes
  `).get() as NoteStats;
  return row;
}
