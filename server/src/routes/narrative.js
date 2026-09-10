import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/db.js';
import { draftSection, completeness } from '../lib/drafting.js';

const SectionSchema = z.object({
  content: z.string().max(50000).optional(),
  status: z.enum(['empty', 'draft', 'review', 'final']).optional(),
  word_limit: z.coerce.number().int().min(50).max(10000).optional(),
});

function context(db, hid) {
  const hospital = db.prepare('SELECT * FROM hospital WHERE id = ?').get(hid);
  const answers = Object.fromEntries(db.prepare('SELECT key, answer FROM intake_answer WHERE hospital_id = ?').all(hid).map((a) => [a.key, a.answer]));
  const budget = db.prepare('SELECT * FROM budget_line WHERE hospital_id = ? ORDER BY sort_order, id').all(hid);
  const usedCodes = [...new Set(budget.map((b) => b.category_code))];
  const categories = usedCodes.length
    ? db.prepare(`SELECT code, title FROM use_of_funds_category WHERE code IN (${usedCodes.map(() => '?').join(',')}) ORDER BY sort_order`).all(...usedCodes)
    : [];
  return { hospital, answers, budget, categories };
}

export function narrativeRouter(db) {
  const r = Router();

  r.get('/questions', (req, res) => {
    const questions = db.prepare('SELECT * FROM intake_question ORDER BY sort_order').all();
    const answers = Object.fromEntries(db.prepare('SELECT key, answer FROM intake_answer WHERE hospital_id = ?').all(req.hid).map((a) => [a.key, a.answer]));
    res.json({ questions: questions.map((q) => ({ ...q, answer: answers[q.key] ?? '' })), completeness: completeness(answers, questions) });
  });

  r.put('/answers/:key', (req, res) => {
    const q = db.prepare('SELECT key FROM intake_question WHERE key = ?').get(req.params.key);
    if (!q) return res.status(404).json({ error: 'Unknown question' });
    const parsed = z.object({ answer: z.string().max(20000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    db.prepare("INSERT INTO intake_answer (hospital_id, key, answer) VALUES (?, ?, ?) ON CONFLICT(hospital_id, key) DO UPDATE SET answer = excluded.answer, updated_at = datetime('now')").run(req.hid, req.params.key, parsed.data.answer);
    res.json({ key: req.params.key, answer: parsed.data.answer });
  });

  r.get('/sections', (req, res) => res.json(db.prepare('SELECT * FROM narrative_section WHERE hospital_id = ? ORDER BY sort_order').all(req.hid)));

  r.patch('/sections/:key', (req, res) => {
    const parsed = SectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const data = { ...parsed.data };
    if (data.content !== undefined && data.status === undefined) {
      const current = db.prepare('SELECT status FROM narrative_section WHERE hospital_id = ? AND key = ?').get(req.hid, req.params.key);
      if (current && current.status === 'empty' && data.content.trim()) data.status = 'draft';
      if (!data.content.trim()) data.status = 'empty';
    }
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' });
    const info = db.prepare(`UPDATE narrative_section SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE hospital_id = ? AND key = ?`).run(...keys.map((k) => data[k]), req.hid, req.params.key);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    logActivity(db, 'narrative_section', req.params.key, 'update', keys.join(','), req.hid);
    res.json(db.prepare('SELECT * FROM narrative_section WHERE hospital_id = ? AND key = ?').get(req.hid, req.params.key));
  });

  // Generate a draft. Does not overwrite unless ?apply=1 is passed.
  r.post('/sections/:key/draft', (req, res) => {
    const section = db.prepare('SELECT * FROM narrative_section WHERE hospital_id = ? AND key = ?').get(req.hid, req.params.key);
    if (!section) return res.status(404).json({ error: 'Not found' });
    const draft = draftSection(section.key, context(db, req.hid));
    if (req.query.apply === '1') {
      db.prepare("UPDATE narrative_section SET content = ?, status = 'draft', updated_at = datetime('now') WHERE hospital_id = ? AND key = ?").run(draft, req.hid, section.key);
      logActivity(db, 'narrative_section', section.key, 'draft', 'generated', req.hid);
    }
    res.json({ key: section.key, draft, placeholders: (draft.match(/\[[^\]]+\]/g) || []).length });
  });

  r.get('/export.md', (req, res) => {
    const { hospital, categories } = context(db, req.hid);
    const sections = db.prepare('SELECT * FROM narrative_section WHERE hospital_id = ? ORDER BY sort_order').all(req.hid);
    const out = [`# ${hospital.name || 'Hospital'} Rural Health Transformation Program Application`, '',
      `Facility: ${hospital.name} (${hospital.facility_type}) CCN ${hospital.ccn || 'n/a'}, ${hospital.county} County, ${hospital.state}`,
      `Contact: ${hospital.contact_name} ${hospital.contact_title} ${hospital.contact_email} ${hospital.contact_phone}`.trim(),
      `Requested: $${Math.round(hospital.requested_amount).toLocaleString()}`,
      `Use-of-funds categories: ${categories.map((c) => `${c.code} ${c.title}`).join('; ') || 'none selected'}`, ''];
    for (const s of sections) out.push(`## ${s.title}`, '', s.content || '_Not drafted_', '');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rhtp-application.md"');
    res.send(out.join('\n'));
  });

  return r;
}
