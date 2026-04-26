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
  )
`);

export function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "OBD-";
  for (let i = 0; i < 8; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
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
