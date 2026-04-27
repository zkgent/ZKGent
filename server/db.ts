import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "zkgent.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    work_email TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    use_case TEXT NOT NULL,
    team_size TEXT NOT NULL,
    region TEXT NOT NULL,
    monthly_volume TEXT NOT NULL,
    current_rail TEXT NOT NULL,
    privacy_concern TEXT NOT NULL,
    why_confidential TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'under_review',
    internal_notes TEXT DEFAULT '',
    review_priority TEXT NOT NULL DEFAULT 'normal',
    tags TEXT DEFAULT '',
    contacted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    recipient_address TEXT DEFAULT '',
    amount REAL,
    asset TEXT NOT NULL DEFAULT 'USDC',
    status TEXT NOT NULL DEFAULT 'pending',
    proof_state TEXT NOT NULL DEFAULT 'pending',
    notes TEXT DEFAULT '',
    region TEXT DEFAULT '',
    created_by TEXT DEFAULT 'operator',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    settled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payroll_batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scheduled_date TEXT,
    recipient_count INTEGER DEFAULT 0,
    asset TEXT NOT NULL DEFAULT 'USDC',
    status TEXT NOT NULL DEFAULT 'draft',
    approval_threshold INTEGER DEFAULT 2,
    approvals INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS treasury_routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    policy TEXT DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    allocation_percent REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_moved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Institutional',
    region TEXT DEFAULT '',
    relationship TEXT DEFAULT 'Vendor',
    status TEXT NOT NULL DEFAULT 'not_connected',
    contact_email TEXT DEFAULT '',
    wallet_address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_activity_at TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT DEFAULT '',
    operator TEXT DEFAULT 'operator',
    status TEXT NOT NULL DEFAULT 'info',
    related_entity_type TEXT DEFAULT '',
    related_entity_id TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspace_settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    workspace_name TEXT DEFAULT 'ZKGENT Workspace',
    environment TEXT DEFAULT 'devnet',
    default_payment_rail TEXT DEFAULT 'USDC',
    privacy_mode INTEGER DEFAULT 1,
    hide_amounts INTEGER DEFAULT 1,
    shielded_address INTEGER DEFAULT 0,
    disclosure_policy TEXT DEFAULT 'audit',
    compliance_key_fingerprint TEXT DEFAULT 'OBD:KEY:A4F2...9E1C',
    notifications_transfer_settled INTEGER DEFAULT 1,
    notifications_payroll_approved INTEGER DEFAULT 1,
    notifications_counterparty_kyc INTEGER DEFAULT 0,
    notifications_system_alerts INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO workspace_settings (id, updated_at)
  VALUES ('singleton', datetime('now'));

  -- ZK Domain Tables

  CREATE TABLE IF NOT EXISTS zk_notes (
    id TEXT PRIMARY KEY,
    commitment TEXT NOT NULL UNIQUE,
    owner_fingerprint TEXT NOT NULL,
    value REAL NOT NULL,
    asset TEXT NOT NULL DEFAULT 'USDC',
    salt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unspent',
    nullifier TEXT,
    encrypted_payload TEXT NOT NULL,
    related_transfer_id TEXT,
    merkle_index INTEGER,
    created_at TEXT NOT NULL,
    spent_at TEXT
  );

  CREATE TABLE IF NOT EXISTS zk_commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commitment TEXT NOT NULL UNIQUE,
    note_id TEXT NOT NULL,
    value_hash TEXT NOT NULL,
    owner_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    merkle_index INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    finalized_at TEXT
  );

  CREATE TABLE IF NOT EXISTS zk_nullifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nullifier TEXT NOT NULL UNIQUE,
    commitment TEXT NOT NULL,
    note_id TEXT NOT NULL,
    spent_by_transfer_id TEXT,
    published_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zk_merkle_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL,
    idx INTEGER NOT NULL,
    value TEXT NOT NULL,
    commitment TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zk_proofs (
    id TEXT PRIMARY KEY,
    related_transfer_id TEXT,
    proof_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input_hash TEXT NOT NULL,
    proof_data TEXT,
    public_signals TEXT,
    verification_result INTEGER,
    error_message TEXT,
    prover_backend TEXT NOT NULL DEFAULT 'scaffold',
    circuit_id TEXT NOT NULL DEFAULT 'scaffold',
    created_at TEXT NOT NULL,
    generated_at TEXT,
    verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS zk_settlements (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    note_id TEXT,
    commitment TEXT,
    nullifier TEXT,
    proof_id TEXT,
    merkle_root_at_settlement TEXT,
    on_chain_tx_sig TEXT,
    on_chain_explorer_url TEXT,
    signing_request_id TEXT,
    error_message TEXT,
    queued_at TEXT NOT NULL,
    submitted_on_chain_at TEXT,
    confirmed_at TEXT,
    finalized_at TEXT,
    settled_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zk_onchain_txs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_id TEXT NOT NULL,
    signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    memo_data TEXT NOT NULL,
    explorer_url TEXT,
    submitted_at TEXT NOT NULL,
    confirmed_at TEXT,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS zk_signing_requests (
    id TEXT PRIMARY KEY,
    settlement_id TEXT NOT NULL,
    tx_data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    wallet_address TEXT,
    signature TEXT,
    requested_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    responded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS wallet_users (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    identity_fingerprint TEXT NOT NULL,
    wallet_name TEXT,
    network_preference TEXT NOT NULL DEFAULT 'mainnet-beta',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 1
  );
`);

// ─── Column migrations (safe: runs on every startup) ─────────────────────────
// ALTER TABLE IF NOT SUPPORTED in sqlite — we use try/catch per column.
{
  const alterCols: Array<[string, string, string]> = [
    ["zk_settlements", "submitted_on_chain_at",  "TEXT"],
    ["zk_settlements", "confirmed_at",            "TEXT"],
    ["zk_settlements", "finalized_at",             "TEXT"],
    ["zk_settlements", "on_chain_explorer_url",    "TEXT"],
    ["zk_settlements", "signing_request_id",       "TEXT"],
    ["zk_settlements", "initiated_by_wallet",      "TEXT"],
    ["zk_settlements", "note_created_at",          "TEXT"],
    ["zk_settlements", "proof_generated_at",       "TEXT"],
    ["zk_settlements", "proof_verified_at",        "TEXT"],
  ];
  for (const [tbl, col, type] of alterCols) {
    try { db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`).run(); }
    catch {} // Column already exists — safe to ignore
  }
}

export function generateId(prefix = "OBD"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = `${prefix}-`;
  for (let i = 0; i < 8; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

export function generateRef(prefix = "TXN"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let result = `${prefix}-`;
  for (let i = 0; i < 10; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

export function logActivity(opts: {
  category: string;
  event: string;
  detail?: string;
  operator?: string;
  status?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const id = generateId("EVT");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO activity_events
      (id, category, event, detail, operator, status, related_entity_type, related_entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    opts.category,
    opts.event,
    opts.detail ?? "",
    opts.operator ?? "operator",
    opts.status ?? "info",
    opts.relatedEntityType ?? "",
    opts.relatedEntityId ?? "",
    now
  );
}

export type ApplicationRow = {
  id: string;
  full_name: string;
  work_email: string;
  company: string;
  role: string;
  use_case: string;
  team_size: string;
  region: string;
  monthly_volume: string;
  current_rail: string;
  privacy_concern: string;
  why_confidential: string;
  status: string;
  internal_notes: string;
  review_priority: string;
  tags: string;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const VALID_STATUSES = [
  "under_review",
  "qualified",
  "pilot_candidate",
  "contacted",
  "rejected",
] as const;

export const VALID_PRIORITIES = ["low", "normal", "high"] as const;
