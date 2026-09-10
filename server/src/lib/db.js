import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS hospital (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  ccn TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  facility_type TEXT NOT NULL DEFAULT 'CAH',
  licensed_beds INTEGER NOT NULL DEFAULT 0,
  service_area_population INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_title TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  fiscal_year_end TEXT NOT NULL DEFAULT '06-30',
  uei TEXT NOT NULL DEFAULT '',
  sam_expiration TEXT NOT NULL DEFAULT '',
  requested_amount REAL NOT NULL DEFAULT 0,
  awarded_amount REAL NOT NULL DEFAULT 0,
  award_date TEXT NOT NULL DEFAULT '',
  project_start TEXT NOT NULL DEFAULT '',
  project_end TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS state_allocation (
  state TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  fy2026_award REAL,
  award_verified INTEGER NOT NULL DEFAULT 0,
  lead_agency TEXT NOT NULL DEFAULT '',
  program_url TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  provider_application_open TEXT NOT NULL DEFAULT '',
  provider_application_due TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS use_of_funds_category (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  examples TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS program_fact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase TEXT NOT NULL CHECK (phase IN ('application','award','reporting')),
  category TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_required INTEGER NOT NULL DEFAULT 1,
  owner TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','blocked','complete','na')),
  evidence_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intake_question (
  key TEXT PRIMARY KEY,
  section_key TEXT NOT NULL,
  prompt TEXT NOT NULL,
  help TEXT NOT NULL DEFAULT '',
  input_type TEXT NOT NULL DEFAULT 'textarea',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS intake_answer (
  key TEXT PRIMARY KEY REFERENCES intake_question(key),
  answer TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS narrative_section (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  guidance TEXT NOT NULL DEFAULT '',
  word_limit INTEGER NOT NULL DEFAULT 500,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty','draft','review','final')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budget_line (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_code TEXT NOT NULL DEFAULT 'J',
  cost_type TEXT NOT NULL DEFAULT 'other' CHECK (cost_type IN ('personnel','fringe','equipment','supplies','contractual','construction','travel','training','indirect','other')),
  line_item TEXT NOT NULL,
  justification TEXT NOT NULL DEFAULT '',
  year1 REAL NOT NULL DEFAULT 0,
  year2 REAL NOT NULL DEFAULT 0,
  year3 REAL NOT NULL DEFAULT 0,
  year4 REAL NOT NULL DEFAULT 0,
  year5 REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestone (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_code TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','at_risk','complete')),
  metric TEXT NOT NULL DEFAULT '',
  target_value TEXT NOT NULL DEFAULT '',
  actual_value TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_deadline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'progress' CHECK (report_type IN ('progress','financial','performance','audit','closeout','other')),
  period_start TEXT NOT NULL DEFAULT '',
  period_end TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','submitted','accepted','late')),
  submitted_at TEXT NOT NULL DEFAULT '',
  submitted_by TEXT NOT NULL DEFAULT '',
  evidence_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('drawdown','expenditure')),
  amount REAL NOT NULL,
  category_code TEXT NOT NULL DEFAULT '',
  cost_type TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  vendor TEXT NOT NULL DEFAULT '',
  invoice_ref TEXT NOT NULL DEFAULT '',
  milestone_id INTEGER,
  doc_link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  original_name TEXT NOT NULL DEFAULT '',
  stored_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  external_link TEXT NOT NULL DEFAULT '',
  related_table TEXT NOT NULL DEFAULT '',
  related_id INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDatabase(file) {
  const target = file ?? process.env.RHTP_DB_PATH ?? path.join(__dirname, '..', '..', 'data', 'rhtp.db');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

export function logActivity(db, entity, entityId, action, detail = '') {
  db.prepare('INSERT INTO activity_log (entity, entity_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(entity, String(entityId ?? ''), action, detail);
}
