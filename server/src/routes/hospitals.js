import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/db.js';
import { createHospital } from '../lib/seed-data.js';
import { str, num, dateStr } from '../lib/crud.js';
import { cacheResults, guessFacilityType, looksLikeCcn, looksLikeNpi, lookupCcn, lookupNpi, searchByName, searchCache } from '../lib/directory.js';

export const HospitalSchema = z.object({
  name: str(200), ccn: str(20), ptan: str(20), npi: str(10), tin: str(12),
  address: str(200), city: str(100), zip: str(10), state: str(2), county: str(100),
  facility_type: z.enum(['CAH', 'REH', 'SCH', 'RRC', 'MDH', 'PPS', 'RHC', 'FQHC', 'OTHER']).default('CAH'),
  licensed_beds: num(), service_area_population: num(),
  contact_name: str(200), contact_title: str(200), contact_email: str(200), contact_phone: str(50),
  fiscal_year_end: str(5), uei: str(20), sam_expiration: dateStr(),
  requested_amount: num(), awarded_amount: num(), award_date: dateStr(), project_start: dateStr(), project_end: dateStr(),
  notes: str(),
}).partial();

const SCOPED_TABLES = ['checklist_item', 'intake_answer', 'narrative_section', 'budget_line', 'milestone', 'report_deadline', 'fund_ledger', 'document', 'activity_log'];

// Normalize identifiers so a search for "01-2345678" still hits a TIN stored as 012345678.
const digits = (s) => String(s || '').replace(/\D/g, '');

export function matchHospitals(db, q) {
  const all = db.prepare('SELECT * FROM hospital ORDER BY name, id').all();
  const term = (q || '').trim();
  if (!term) return all;
  const lower = term.toLowerCase();
  const d = digits(term);
  return all.filter((h) => {
    if (h.name.toLowerCase().includes(lower) || h.city.toLowerCase().includes(lower)) return true;
    if (h.ccn.toLowerCase().includes(lower) || h.ptan.toLowerCase().includes(lower)) return true;
    if (d && (digits(h.npi).includes(d) || digits(h.tin).includes(d) || digits(h.ccn).includes(d) || digits(h.ptan).includes(d))) return true;
    return false;
  });
}

// Resolve the hospital a request is about: x-hospital-id header, ?hospital= query,
// else the first hospital on file. Creates a blank hospital if none exists.
export function hospitalScope(db) {
  return (req, res, next) => {
    const wanted = Number(req.get('x-hospital-id') || req.query.hospital || 0);
    let row = wanted ? db.prepare('SELECT id FROM hospital WHERE id = ?').get(wanted) : null;
    if (!row) row = db.prepare('SELECT id FROM hospital ORDER BY id LIMIT 1').get();
    if (!row) row = { id: createHospital(db).id };
    req.hid = row.id;
    next();
  };
}

export function hospitalsRouter(db) {
  const r = Router();

  r.get('/', (req, res) => res.json(matchHospitals(db, req.query.q)));

  r.post('/', (req, res) => {
    const parsed = HospitalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const row = createHospital(db, parsed.data);
    logActivity(db, 'hospital', row.id, 'create', row.name, row.id);
    res.status(201).json(row);
  });

  r.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM hospital WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  r.patch('/:id', (req, res) => {
    const parsed = HospitalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const keys = Object.keys(parsed.data);
    if (keys.length) {
      const info = db.prepare(`UPDATE hospital SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...keys.map((k) => parsed.data[k]), req.params.id);
      if (!info.changes) return res.status(404).json({ error: 'Not found' });
      logActivity(db, 'hospital', req.params.id, 'update', keys.join(','), Number(req.params.id));
    }
    res.json(db.prepare('SELECT * FROM hospital WHERE id = ?').get(req.params.id));
  });

  r.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM hospital WHERE id = ?').get(id)) return res.status(404).json({ error: 'Not found' });
    const tx = db.transaction(() => {
      for (const t of SCOPED_TABLES) db.prepare(`DELETE FROM ${t} WHERE hospital_id = ?`).run(id);
      db.prepare('DELETE FROM hospital WHERE id = ?').run(id);
    });
    tx();
    res.status(204).end();
  });

  return r;
}

// Search saved hospitals and the public directory by PTAN, NPI, TIN, CCN, or name.
export function directoryRouter(db) {
  const r = Router();
  r.get('/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    const state = String(req.query.state || '').trim();
    if (!q) return res.json({ query: q, hospitals: [], directory: [], remote: null });
    const hospitals = matchHospitals(db, q);
    let directory = searchCache(db, q);
    let remote = null;
    if (req.query.remote !== '0') {
      try {
        let fetched = [];
        if (looksLikeNpi(q)) fetched = await lookupNpi(q);
        else if (looksLikeCcn(q)) fetched = await lookupCcn(q);
        else if (q.length >= 3 && !/^\d+$/.test(q)) fetched = await searchByName(q, state);
        else remote = { ok: true, note: 'Enter a 10 digit NPI, a 6 character CCN or PTAN, or at least 3 letters of a name to search CMS.' };
        if (fetched.length) { cacheResults(db, fetched); directory = searchCache(db, q); }
        if (!remote) remote = { ok: true, found: fetched.length };
      } catch (e) {
        remote = { ok: false, error: e.name === 'AbortError' ? 'CMS lookup timed out' : e.message };
      }
    }
    res.json({
      query: q,
      hospitals,
      directory: directory.map((d) => ({ ...d, facility_type: guessFacilityType(d.facility_kind), ptan: d.ccn })),
      remote,
      note: 'TIN and PTAN are not published by CMS. TIN matches only hospitals saved here; a PTAN search checks the CCN, which is the same number for most hospitals.',
    });
  });
  return r;
}
