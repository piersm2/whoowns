import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/db.js';
import { str, num, dateStr } from '../lib/crud.js';

const HospitalSchema = z.object({
  name: str(200), ccn: str(20), state: str(2), county: str(100),
  facility_type: z.enum(['CAH', 'REH', 'SCH', 'RRC', 'MDH', 'PPS', 'RHC', 'FQHC', 'OTHER']).default('CAH'),
  licensed_beds: num(), service_area_population: num(),
  contact_name: str(200), contact_title: str(200), contact_email: str(200), contact_phone: str(50),
  fiscal_year_end: str(5), uei: str(20), sam_expiration: dateStr(),
  requested_amount: num(), awarded_amount: num(), award_date: dateStr(), project_start: dateStr(), project_end: dateStr(),
  notes: str(),
}).partial();

export function hospitalRouter(db) {
  const r = Router();
  r.get('/', (req, res) => res.json(db.prepare('SELECT * FROM hospital WHERE id = 1').get()));
  r.patch('/', (req, res) => {
    const parsed = HospitalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const keys = Object.keys(parsed.data);
    if (keys.length) {
      db.prepare(`UPDATE hospital SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = 1`).run(...keys.map((k) => parsed.data[k]));
      logActivity(db, 'hospital', 1, 'update', keys.join(','));
    }
    res.json(db.prepare('SELECT * FROM hospital WHERE id = 1').get());
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
    const hospital = db.prepare('SELECT * FROM hospital WHERE id = 1').get();
    const checklist = db.prepare('SELECT phase, status, is_required, title, due_date, owner FROM checklist_item').all();
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

    const sections = db.prepare('SELECT key, title, status, content, word_limit FROM narrative_section ORDER BY sort_order').all();
    const narrative = { total: sections.length, drafted: sections.filter((s) => s.status !== 'empty').length, final: sections.filter((s) => s.status === 'final').length };

    const budget = db.prepare('SELECT COALESCE(SUM(year1+year2+year3+year4+year5),0) AS total, COUNT(*) AS lines FROM budget_line').get();
    const ledger = db.prepare("SELECT direction, COALESCE(SUM(amount),0) AS total FROM fund_ledger GROUP BY direction").all();
    const drawn = ledger.find((l) => l.direction === 'drawdown')?.total ?? 0;
    const spent = ledger.find((l) => l.direction === 'expenditure')?.total ?? 0;

    const reports = db.prepare("SELECT * FROM report_deadline WHERE status IN ('upcoming','in_progress','late') ORDER BY due_date").all();
    const milestones = db.prepare("SELECT * FROM milestone WHERE status != 'complete' ORDER BY due_date").all();
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
      recent: db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT 10').all(),
    });
  });
  return r;
}
