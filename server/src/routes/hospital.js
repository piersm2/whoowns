import { Router } from 'express';
import { logActivity } from '../lib/db.js';
import { HospitalSchema } from './hospitals.js';

export function hospitalRouter(db) {
  const r = Router();
  r.get('/', (req, res) => res.json(db.prepare('SELECT * FROM hospital WHERE id = ?').get(req.hid)));
  r.patch('/', (req, res) => {
    const parsed = HospitalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const keys = Object.keys(parsed.data);
    if (keys.length) {
      db.prepare(`UPDATE hospital SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...keys.map((k) => parsed.data[k]), req.hid);
      logActivity(db, 'hospital', req.hid, 'update', keys.join(','), req.hid);
    }
    res.json(db.prepare('SELECT * FROM hospital WHERE id = ?').get(req.hid));
  });
  return r;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((d - new Date()) / 86400000);
}

export function dashboardRouter(db) {
  const r = Router();
  r.get('/', (req, res) => {
    const hid = req.hid;
    const hospital = db.prepare('SELECT * FROM hospital WHERE id = ?').get(hid);
    const checklist = db.prepare('SELECT id, phase, status, is_required, title, due_date, owner FROM checklist_item WHERE hospital_id = ?').all(hid);
    const phases = {};
    for (const c of checklist) {
      const p = (phases[c.phase] ??= { total: 0, complete: 0, blocked: 0, required_open: 0 });
      if (c.status === 'na') continue;
      p.total += 1;
      if (c.status === 'complete') p.complete += 1;
      if (c.status === 'blocked') p.blocked += 1;
      if (c.is_required && c.status !== 'complete') p.required_open += 1;
    }
    const today = new Date().toISOString().slice(0, 10);
    const overdue = checklist.filter((c) => c.due_date && c.due_date < today && !['complete', 'na'].includes(c.status));
    const upcomingChecklist = checklist.filter((c) => c.due_date && c.due_date >= today && !['complete', 'na'].includes(c.status)).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5);

    const sections = db.prepare('SELECT key, title, status, content, word_limit FROM narrative_section WHERE hospital_id = ? ORDER BY sort_order').all(hid);
    const narrative = { total: sections.length, drafted: sections.filter((s) => s.status !== 'empty').length, final: sections.filter((s) => s.status === 'final').length };

    const budget = db.prepare('SELECT COALESCE(SUM(year1+year2+year3+year4+year5),0) AS total, COUNT(*) AS lines FROM budget_line WHERE hospital_id = ?').get(hid);
    const ledger = db.prepare('SELECT direction, COALESCE(SUM(amount),0) AS total FROM fund_ledger WHERE hospital_id = ? GROUP BY direction').all(hid);
    const drawn = ledger.find((l) => l.direction === 'drawdown')?.total ?? 0;
    const spent = ledger.find((l) => l.direction === 'expenditure')?.total ?? 0;

    const reports = db.prepare("SELECT * FROM report_deadline WHERE hospital_id = ? AND status IN ('upcoming','in_progress','late') ORDER BY due_date").all(hid);
    const milestones = db.prepare("SELECT * FROM milestone WHERE hospital_id = ? AND status != 'complete' ORDER BY due_date").all(hid);
    const lateReports = reports.filter((x) => x.due_date < today);

    const alerts = [];
    if (hospital.sam_expiration) {
      const d = daysUntil(hospital.sam_expiration);
      if (d !== null && d < 60) alerts.push({ level: d < 0 ? 'danger' : 'warn', text: d < 0 ? `SAM.gov registration expired ${-d} days ago` : `SAM.gov registration expires in ${d} days` });
    }
    if (!hospital.uei) alerts.push({ level: 'warn', text: 'No UEI on file. Most state sub-awards require one.' });
    if (overdue.length) alerts.push({ level: 'danger', text: `${overdue.length} checklist item${overdue.length > 1 ? 's are' : ' is'} past due` });
    if (lateReports.length) alerts.push({ level: 'danger', text: `${lateReports.length} report${lateReports.length > 1 ? 's are' : ' is'} past due` });
    if (hospital.awarded_amount && budget.total > hospital.awarded_amount) alerts.push({ level: 'warn', text: `Budget (${Math.round(budget.total).toLocaleString()}) exceeds award (${Math.round(hospital.awarded_amount).toLocaleString()})` });
    if (spent > drawn) alerts.push({ level: 'warn', text: 'Expenditures exceed drawdowns. Request reimbursement or check the ledger.' });
    if (!hospital.state) alerts.push({ level: 'info', text: 'Set your state on the Profile tab to see your state allocation.' });

    res.json({
      hospital,
      phases,
      overdue,
      upcomingChecklist,
      narrative,
      budget: { total: budget.total, lines: budget.lines },
      funds: { drawn, spent, remaining: (hospital.awarded_amount || 0) - spent },
      reports: reports.slice(0, 5).map((x) => ({ ...x, days: daysUntil(x.due_date) })),
      milestones: milestones.slice(0, 5).map((x) => ({ ...x, days: daysUntil(x.due_date) })),
      alerts,
      recent: db.prepare('SELECT * FROM activity_log WHERE hospital_id = ? ORDER BY id DESC LIMIT 10').all(hid),
    });
  });
  return r;
}
