import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/db.js';
import { str, dateStr } from '../lib/crud.js';

const StateSchema = z.object({
  fy2026_award: z.coerce.number().nullable().optional(),
  award_verified: z.coerce.number().int().min(0).max(1).optional(),
  lead_agency: str(200).optional(), program_url: str(500).optional(), contact_email: str(200).optional(),
  provider_application_open: dateStr().optional(), provider_application_due: dateStr().optional(), notes: str().optional(),
});

export function referenceRouter(db) {
  const r = Router();
  r.get('/categories', (req, res) => res.json(db.prepare('SELECT * FROM use_of_funds_category ORDER BY sort_order').all()));
  r.get('/facts', (req, res) => res.json(db.prepare('SELECT * FROM program_fact ORDER BY sort_order').all()));
  r.get('/states', (req, res) => res.json(db.prepare('SELECT * FROM state_allocation ORDER BY state_name').all()));
  r.get('/states/:state', (req, res) => {
    const row = db.prepare('SELECT * FROM state_allocation WHERE state = ?').get(req.params.state.toUpperCase());
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
  r.patch('/states/:state', (req, res) => {
    const parsed = StateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const keys = Object.keys(parsed.data);
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' });
    const st = req.params.state.toUpperCase();
    const info = db.prepare(`UPDATE state_allocation SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE state = ?`).run(...keys.map((k) => parsed.data[k]), st);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    logActivity(db, 'state_allocation', st, 'update', keys.join(','));
    res.json(db.prepare('SELECT * FROM state_allocation WHERE state = ?').get(st));
  });
  return r;
}
