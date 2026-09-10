import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/lib/db.js';
import { createApp } from '../src/app.js';

let server, base, tmp;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rhtp-test-'));
  const db = openDatabase(':memory:');
  const app = createApp(db, { uploadDir: path.join(tmp, 'uploads') });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const json = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

test('health and seeded reference data', async () => {
  assert.equal((await json('GET', '/health')).body.ok, true);
  const cats = (await json('GET', '/reference/categories')).body;
  assert.equal(cats.length, 10);
  assert.equal(cats[0].code, 'A');
  const states = (await json('GET', '/reference/states')).body;
  assert.equal(states.length, 50);
  assert.equal(states.find((s) => s.state === 'TX').fy2026_award, 281000000);
  assert.equal(states.find((s) => s.state === 'MN').fy2026_award, null);
});

test('hospital profile update validates', async () => {
  const ok = await json('PATCH', '/hospital', { name: 'Test CAH', state: 'MN', facility_type: 'CAH', awarded_amount: 1000000, sam_expiration: '2027-01-01' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.name, 'Test CAH');
  const bad = await json('PATCH', '/hospital', { facility_type: 'BOGUS' });
  assert.equal(bad.status, 400);
  const badDate = await json('PATCH', '/hospital', { sam_expiration: '01/01/2027' });
  assert.equal(badDate.status, 400);
});

test('checklist seeded and editable', async () => {
  const items = (await json('GET', '/checklist?phase=application')).body;
  assert.ok(items.length > 10);
  const updated = await json('PATCH', `/checklist/${items[0].id}`, { status: 'complete', owner: 'Jane' });
  assert.equal(updated.body.status, 'complete');
  const created = await json('POST', '/checklist', { title: 'State specific form 12', phase: 'application', due_date: '2026-10-01' });
  assert.equal(created.status, 201);
  const invalid = await json('POST', '/checklist', { title: 'x', status: 'done' });
  assert.equal(invalid.status, 400);
  const del = await fetch(`${base}/checklist/${created.body.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);
});

test('narrative drafting uses answers and flags placeholders', async () => {
  await json('PUT', '/narrative/answers/service_area', { answer: 'We serve 12,000 people in Pine County.' });
  const q = (await json('GET', '/narrative/questions')).body;
  assert.equal(q.questions.find((x) => x.key === 'service_area').answer, 'We serve 12,000 people in Pine County.');
  assert.equal(q.completeness.need.answered, 1);
  const draft = await json('POST', '/narrative/sections/need/draft?apply=1');
  assert.ok(draft.body.draft.includes('Pine County'));
  assert.ok(draft.body.draft.includes('Test CAH'));
  assert.ok(draft.body.placeholders >= 3);
  const sections = (await json('GET', '/narrative/sections')).body;
  assert.equal(sections.find((s) => s.key === 'need').status, 'draft');
  const unknown = await json('PUT', '/narrative/answers/nope', { answer: 'x' });
  assert.equal(unknown.status, 404);
  const md = await fetch(`${base}/narrative/export.md`);
  assert.equal(md.status, 200);
  assert.ok((await md.text()).includes('# Test CAH'));
});

test('budget summary computes totals and cap warnings', async () => {
  await json('POST', '/budget', { category_code: 'B', cost_type: 'other', line_item: 'Provider stabilization', year1: 300000 });
  await json('POST', '/budget', { category_code: 'A', cost_type: 'personnel', line_item: 'Care manager', year1: 80000, year2: 82000, justification: 'One RN' });
  const s = (await json('GET', '/budget/summary')).body;
  assert.equal(s.grand, 462000);
  assert.deepEqual(s.byYear, [380000, 82000, 0, 0, 0]);
  assert.equal(s.byCategory.B, 300000);
  const cap = s.caps.find((c) => c.key === 'provider_payments');
  assert.equal(cap.exceeded, true); // 300k of a 1M award is over 20 percent
  assert.equal(s.missingJustification, 1);
  const bad = await json('POST', '/budget', { category_code: 'Z', line_item: 'x' });
  assert.equal(bad.status, 400);
  const csv = await fetch(`${base}/budget/export.csv`);
  assert.ok((await csv.text()).includes('Provider stabilization'));
});

test('compliance calendar, ledger, and dashboard', async () => {
  const none = await json('POST', '/compliance/reports/generate-defaults', {});
  assert.equal(none.status, 400);
  await json('PATCH', '/hospital', { project_start: '2026-10-01' });
  const gen = await json('POST', '/compliance/reports/generate-defaults', {});
  assert.equal(gen.status, 201);
  assert.equal(gen.body.length, 8);
  assert.equal(gen.body[0].due_date, '2027-01-29');
  const m = await json('POST', '/compliance/milestones', { title: 'Hire care managers', due_date: '2026-12-31', metric: 'FTE hired', target_value: '2' });
  assert.equal(m.status, 201);
  await json('POST', '/compliance/ledger', { entry_date: '2026-10-15', direction: 'drawdown', amount: 250000 });
  await json('POST', '/compliance/ledger', { entry_date: '2026-11-01', direction: 'expenditure', amount: 40000, category_code: 'A', cost_type: 'personnel', milestone_id: m.body.id });
  const sum = (await json('GET', '/compliance/ledger-summary')).body;
  assert.equal(sum.cashOnHand, 210000);
  assert.equal(sum.byCategory.A.spent, 40000);
  const negative = await json('POST', '/compliance/ledger', { entry_date: '2026-11-01', direction: 'expenditure', amount: -5 });
  assert.equal(negative.status, 400);
  const dash = (await json('GET', '/dashboard')).body;
  assert.equal(dash.funds.drawn, 250000);
  assert.ok(dash.phases.application.total > 0);
  assert.ok(dash.reports.length > 0);
});

test('documents accept links and reject empty', async () => {
  const link = await json('POST', '/documents', { title: 'CHNA 2024', doc_type: 'chna', external_link: 'https://example.org/chna.pdf' });
  assert.equal(link.status, 201);
  const form = new FormData();
  form.append('title', 'Award letter');
  form.append('doc_type', 'award');
  form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'award.txt');
  const up = await fetch(`${base}/documents`, { method: 'POST', body: form });
  assert.equal(up.status, 201);
  const doc = await up.json();
  const dl = await fetch(`${base}/documents/${doc.id}/file`);
  assert.equal(await dl.text(), 'hello');
  const empty = await json('POST', '/documents', { title: 'Nothing attached' });
  assert.equal(empty.status, 400);
  const del = await fetch(`${base}/documents/${doc.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);
});
