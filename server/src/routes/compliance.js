import { Router } from 'express';
import { z } from 'zod';
import { crudRouter, str, dateStr } from '../lib/crud.js';
import { DEFAULT_REPORTS } from '../lib/seed-data.js';
import { logActivity } from '../lib/db.js';

const MilestoneSchema = z.object({
  title: z.string().min(1).max(300), description: str(), category_code: str(1), owner: str(200), due_date: dateStr(),
  status: z.enum(['planned', 'in_progress', 'at_risk', 'complete']).default('planned'),
  metric: str(300), target_value: str(100), actual_value: str(100), notes: str(),
});

const ReportSchema = z.object({
  title: z.string().min(1).max(300),
  report_type: z.enum(['progress', 'financial', 'performance', 'audit', 'closeout', 'other']).default('progress'),
  period_start: dateStr(), period_end: dateStr(), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['upcoming', 'in_progress', 'submitted', 'accepted', 'late']).default('upcoming'),
  submitted_at: dateStr(), submitted_by: str(200), evidence_link: str(1000), notes: str(),
});

const LedgerSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  direction: z.enum(['drawdown', 'expenditure']),
  amount: z.coerce.number().positive(),
  category_code: str(1), cost_type: str(20).transform((v) => v || 'other'), description: str(500), vendor: str(200), invoice_ref: str(100),
  milestone_id: z.coerce.number().int().nullable().default(null), doc_link: str(1000),
});

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function complianceRouter(db) {
  const r = Router();
  r.use('/milestones', crudRouter(db, 'milestone', MilestoneSchema, { orderBy: "CASE WHEN due_date = '' THEN 1 ELSE 0 END, due_date, id" }));
  r.use('/reports', crudRouter(db, 'report_deadline', ReportSchema, { orderBy: 'due_date, id' }));
  r.use('/ledger', crudRouter(db, 'fund_ledger', LedgerSchema, { orderBy: 'entry_date DESC, id DESC' }));

  // Seed a default reporting calendar from the project start date (or award date).
  r.post('/reports/generate-defaults', (req, res) => {
    const h = db.prepare('SELECT project_start, award_date FROM hospital WHERE id = ?').get(req.hid);
    const start = req.body?.start || h.project_start || h.award_date;
    if (!start) return res.status(400).json({ error: 'Set a project start or award date on the Profile tab first' });
    const ins = db.prepare('INSERT INTO report_deadline (hospital_id, title, report_type, period_start, period_end, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const created = [];
    const tx = db.transaction(() => {
      for (const [title, type, offset] of DEFAULT_REPORTS) {
        const periodEnd = addDays(start, offset);
        const due = addDays(periodEnd, 30);
        const info = ins.run(req.hid, title, type, addDays(periodEnd, -89), periodEnd, due, 'Default schedule. Replace with the dates in your state agreement.');
        created.push(info.lastInsertRowid);
      }
    });
    tx();
    logActivity(db, 'report_deadline', '', 'generate-defaults', `${created.length} reports from ${start}`, req.hid);
    res.status(201).json(db.prepare('SELECT * FROM report_deadline WHERE hospital_id = ? ORDER BY due_date, id').all(req.hid));
  });

  r.get('/ledger-summary', (req, res) => {
    const rows = db.prepare('SELECT direction, category_code, cost_type, SUM(amount) AS total FROM fund_ledger WHERE hospital_id = ? GROUP BY direction, category_code, cost_type').all(req.hid);
    const hospital = db.prepare('SELECT awarded_amount FROM hospital WHERE id = ?').get(req.hid);
    const drawn = rows.filter((x) => x.direction === 'drawdown').reduce((s, x) => s + x.total, 0);
    const spent = rows.filter((x) => x.direction === 'expenditure').reduce((s, x) => s + x.total, 0);
    const budget = db.prepare('SELECT category_code, SUM(year1+year2+year3+year4+year5) AS total FROM budget_line WHERE hospital_id = ? GROUP BY category_code').all(req.hid);
    const byCategory = {};
    for (const b of budget) byCategory[b.category_code] = { budget: b.total, spent: 0 };
    for (const x of rows.filter((x) => x.direction === 'expenditure')) {
      (byCategory[x.category_code || '?'] ??= { budget: 0, spent: 0 }).spent += x.total;
    }
    res.json({ award: hospital.awarded_amount, drawn, spent, cashOnHand: drawn - spent, remainingAward: hospital.awarded_amount - spent, byCategory });
  });

  return r;
}
