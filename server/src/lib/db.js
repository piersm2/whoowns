import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS hospital (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  ccn TEXT NOT NULL DEFAULT '',
  ptan TEXT NOT NULL DEFAULT '',
  npi TEXT NOT NULL DEFAULT '',
  tin TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL REFERENCES intake_question(key),
  answer TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hospital_id, key)
);

CREATE TABLE IF NOT EXISTS narrative_section (
  hospital_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  guidance TEXT NOT NULL DEFAULT '',
  word_limit INTEGER NOT NULL DEFAULT 500,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty','draft','review','final')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hospital_id, key)
);

CREATE TABLE IF NOT EXISTS budget_line (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  hospital_id INTEGER NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS directory_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ccn TEXT NOT NULL DEFAULT '',
  npi TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  facility_kind TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, ccn, npi)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL DEFAULT 1,
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
  migrate(db);
  db.exec(SCHEMA);
  seed(db);
  return db;
}

// Databases created before multi-hospital support had a single hospital row (id = 1) and
// no hospital_id column on the per-hospital tables. Rebuild those tables in place, keeping
// every row attached to hospital 1.
function migrate(db) {
  const sqlOf = (t) => db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(t)?.sql || '';
  const hasCol = (t, c) => db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('${t}') WHERE name = ?`).get(c).n > 0;
  const tables = ['hospital', 'checklist_item', 'intake_answer', 'narrative_section', 'budget_line', 'milestone', 'report_deadline', 'fund_ledger', 'document', 'activity_log'];
  const stale = tables.filter((t) => sqlOf(t) && (t === 'hospital' ? /CHECK \(id = 1\)/.test(sqlOf(t)) : !hasCol(t, 'hospital_id')));
  if (!stale.length) return;
  const tx = db.transaction(() => {
    db.pragma('foreign_keys = OFF');
    for (const t of stale) db.exec(`ALTER TABLE ${t} RENAME TO ${t}__old`);
    db.exec(SCHEMA);
    for (const t of stale) {
      const cols = db.prepare(`SELECT name FROM pragma_table_info('${t}__old')`).all().map((c) => c.name).filter((c) => hasCol(t, c));
      db.exec(`INSERT INTO ${t} (${cols.join(', ')}) SELECT ${cols.join(', ')} FROM ${t}__old`);
      db.exec(`DROP TABLE ${t}__old`);
    }
    db.pragma('foreign_keys = ON');
  });
  tx();
}

export function logActivity(db, entity, entityId, action, detail = '', hospitalId = 1) {
  db.prepare('INSERT INTO activity_log (hospital_id, entity, entity_id, action, detail) VALUES (?, ?, ?, ?, ?)')
    .run(hospitalId, entity, String(entityId ?? ''), action, detail);
}
