import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "obsidian.db");

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
    workspace_name TEXT DEFAULT 'OBSIDIAN Workspace',
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
`);

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
