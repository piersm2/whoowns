import { Router } from 'express';
import { z } from 'zod';
import { crudRouter, str, num } from '../lib/crud.js';

const BudgetSchema = z.object({
  category_code: z.string().regex(/^[A-J]$/).default('J'),
  cost_type: z.enum(['personnel', 'fringe', 'equipment', 'supplies', 'contractual', 'construction', 'travel', 'training', 'indirect', 'other']).default('other'),
  line_item: z.string().min(1).max(300),
  justification: str(),
  year1: num(), year2: num(), year3: num(), year4: num(), year5: num(),
  sort_order: z.coerce.number().int().default(999),
});

// Reported guardrails, expressed as a share of the hospital's award. States may pass
// down tighter limits, so these are warnings, not hard stops.
const CAPS = [
  { key: 'admin', label: 'Administrative (indirect) costs', share: 0.10, test: (b) => b.cost_type === 'indirect' },
  { key: 'capital', label: 'Capital and construction', share: 0.20, test: (b) => b.cost_type === 'construction' },
  { key: 'provider_payments', label: 'Provider payments (Use B)', share: 0.20, test: (b) => b.category_code === 'B' },
];

export function budgetRouter(db) {
  const r = Router();
  r.get('/summary', (req, res) => {
    const lines = db.prepare('SELECT * FROM budget_line WHERE hospital_id = ? ORDER BY sort_order, id').all(req.hid);
    const hospital = db.prepare('SELECT awarded_amount, requested_amount FROM hospital WHERE id = ?').get(req.hid);
    const total = (b) => b.year1 + b.year2 + b.year3 + b.year4 + b.year5;
    const grand = lines.reduce((s, b) => s + total(b), 0);
    const byYear = [1, 2, 3, 4, 5].map((y) => lines.reduce((s, b) => s + b[`year${y}`], 0));
    const group = (field) => {
      const out = {};
      for (const b of lines) out[b[field]] = (out[b[field]] || 0) + total(b);
      return out;
    };
    const basis = hospital.awarded_amount || hospital.requested_amount || grand;
    const caps = CAPS.map((c) => {
      const amount = lines.filter(c.test).reduce((s, b) => s + total(b), 0);
      return { ...c, amount, limit: basis * c.share, exceeded: basis > 0 && amount > basis * c.share };
    });
    const missingJustification = lines.filter((b) => !b.justification.trim()).length;
    res.json({ grand, byYear, byCategory: group('category_code'), byCostType: group('cost_type'), caps, basis, missingJustification, lines: lines.length });
  });
  r.get('/export.csv', (req, res) => {
    const lines = db.prepare('SELECT * FROM budget_line WHERE hospital_id = ? ORDER BY sort_order, id').all(req.hid);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Use', 'Cost type', 'Line item', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Total', 'Justification'];
    const rows = lines.map((b) => [b.category_code, b.cost_type, b.line_item, b.year1, b.year2, b.year3, b.year4, b.year5, b.year1 + b.year2 + b.year3 + b.year4 + b.year5, b.justification].map(esc).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rhtp-budget.csv"');
    res.send([header.map(esc).join(','), ...rows].join('\n'));
  });
  r.use('/', crudRouter(db, 'budget_line', BudgetSchema, { orderBy: 'sort_order, id' }));
  return r;
}
