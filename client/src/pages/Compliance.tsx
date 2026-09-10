import { useState } from 'react';
import { api, daysUntil, fmtDate, money, today } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, COST_TYPES, Field, STATUS_TONE, Stat, label } from '../components/ui';
import type { Category, LedgerEntry, LedgerSummary, Milestone, ReportDeadline } from '../lib/types';

export default function Compliance() {
  const [tab, setTab] = useState<'reports' | 'milestones' | 'ledger'>('reports');
  return (
    <>
      <div className="page-head">
        <div><h1>Post-award compliance</h1><p>Reporting calendar, work plan milestones, and a fund ledger that reconciles drawdowns against spending. Keep this current and the reports write themselves.</p></div>
      </div>
      <div className="tabs">
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Reporting calendar</button>
        <button className={tab === 'milestones' ? 'active' : ''} onClick={() => setTab('milestones')}>Milestones</button>
        <button className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>Fund ledger</button>
      </div>
      {tab === 'reports' && <Reports />}
      {tab === 'milestones' && <Milestones />}
      {tab === 'ledger' && <Ledger />}
    </>
  );
}

const REPORT_TYPES = ['progress', 'financial', 'performance', 'audit', 'closeout', 'other'];
const REPORT_STATUS: ReportDeadline['status'][] = ['upcoming', 'in_progress', 'submitted', 'accepted', 'late'];

function Reports() {
  const { data, error, reload, setData } = useData<ReportDeadline[]>('/compliance/reports');
  const [draft, setDraft] = useState({ title: '', report_type: 'progress', period_start: '', period_end: '', due_date: '', notes: '' });
  const [show, setShow] = useState(false);
  const toast = useToast();
  const t = today();

  const update = async (id: number, patch: Partial<ReportDeadline>) => {
    setData((d) => d && d.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try { await api.patch(`/compliance/reports/${id}`, patch); } catch (e) { toast((e as Error).message); reload(); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/compliance/reports', draft); setDraft({ title: '', report_type: 'progress', period_start: '', period_end: '', due_date: '', notes: '' }); setShow(false); reload(); toast('Added'); }
    catch (ex) { toast((ex as Error).message); }
  };
  const generate = async () => {
    try { await api.post('/compliance/reports/generate-defaults', {}); reload(); toast('Default schedule added'); }
    catch (ex) { toast((ex as Error).message); }
  };
  const remove = async (id: number) => { if (!confirm('Delete this report?')) return; await api.del(`/compliance/reports/${id}`); reload(); };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="actions" style={{ marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setShow((s) => !s)}>Add report</button>
        <button className="btn" onClick={generate} title="Quarterly and annual reports for year one, based on your project start date">Generate default year 1 schedule</button>
      </div>
      {show && (
        <form className="card" onSubmit={add}>
          <div className="form-grid">
            <Field label="Title" span2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Type"><select value={draft.report_type} onChange={(e) => setDraft({ ...draft, report_type: e.target.value })}>{REPORT_TYPES.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} required /></Field>
            <Field label="Period start"><input type="date" value={draft.period_start} onChange={(e) => setDraft({ ...draft, period_start: e.target.value })} /></Field>
            <Field label="Period end"><input type="date" value={draft.period_end} onChange={(e) => setDraft({ ...draft, period_end: e.target.value })} /></Field>
            <Field label="Notes" span2><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
          <div className="actions" style={{ marginTop: 10 }}><button className="btn primary">Save</button><button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button></div>
        </form>
      )}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Report</th><th>Period</th><th>Due</th><th>Status</th><th>Submitted</th><th>Evidence</th><th></th></tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={7} className="muted">No reports yet. Generate the default schedule or add the dates from your state agreement.</td></tr>}
            {data.map((r) => {
              const d = daysUntil(r.due_date);
              const open = !['submitted', 'accepted'].includes(r.status);
              return (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong><div className="small muted">{label(r.report_type)}{r.notes ? ` · ${r.notes}` : ''}</div></td>
                  <td className="small">{r.period_start && fmtDate(r.period_start)}{r.period_end && ` to ${fmtDate(r.period_end)}`}</td>
                  <td>{fmtDate(r.due_date)}{open && d !== null && <div className="small"><Badge tone={d < 0 ? 'red' : d < 14 ? 'amber' : 'gray'}>{d < 0 ? `${-d} days late` : `${d} days`}</Badge></div>}</td>
                  <td><select className="inline" value={r.status} onChange={(e) => update(r.id, { status: e.target.value as ReportDeadline['status'], ...(e.target.value === 'submitted' && !r.submitted_at ? { submitted_at: t } : {}) })}>{REPORT_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></td>
                  <td><input className="inline" type="date" value={r.submitted_at} onChange={(e) => update(r.id, { submitted_at: e.target.value })} /><input className="inline" placeholder="By" value={r.submitted_by} onChange={(e) => setData((dd) => dd && dd.map((x) => (x.id === r.id ? { ...x, submitted_by: e.target.value } : x)))} onBlur={(e) => update(r.id, { submitted_by: e.target.value })} style={{ marginTop: 4 }} /></td>
                  <td><input className="inline" placeholder="Link" value={r.evidence_link} onChange={(e) => setData((dd) => dd && dd.map((x) => (x.id === r.id ? { ...x, evidence_link: e.target.value } : x)))} onBlur={(e) => update(r.id, { evidence_link: e.target.value })} /></td>
                  <td><button className="btn sm danger" onClick={() => remove(r.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Status: {REPORT_STATUS.map((s) => <span key={s} style={{ marginRight: 8 }}><Badge tone={STATUS_TONE[s]}>{label(s)}</Badge></span>)}</p>
    </>
  );
}

const MS_STATUS: Milestone['status'][] = ['planned', 'in_progress', 'at_risk', 'complete'];

function Milestones() {
  const { data, error, reload, setData } = useData<Milestone[]>('/compliance/milestones');
  const cats = useData<Category[]>('/reference/categories');
  const [draft, setDraft] = useState({ title: '', description: '', category_code: '', owner: '', due_date: '', metric: '', target_value: '' });
  const [show, setShow] = useState(false);
  const toast = useToast();

  const update = async (id: number, patch: Partial<Milestone>) => {
    setData((d) => d && d.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try { await api.patch(`/compliance/milestones/${id}`, patch); } catch (e) { toast((e as Error).message); reload(); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/compliance/milestones', draft); setDraft({ title: '', description: '', category_code: '', owner: '', due_date: '', metric: '', target_value: '' }); setShow(false); reload(); toast('Added'); }
    catch (ex) { toast((ex as Error).message); }
  };
  const remove = async (id: number) => { if (!confirm('Delete this milestone?')) return; await api.del(`/compliance/milestones/${id}`); reload(); };
  const local = (id: number, patch: Partial<Milestone>) => setData((d) => d && d.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="actions" style={{ marginBottom: 12 }}><button className="btn primary" onClick={() => setShow((s) => !s)}>Add milestone</button></div>
      {show && (
        <form className="card" onSubmit={add}>
          <div className="form-grid">
            <Field label="Milestone" span2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required placeholder="Two care managers hired and onboarded" /></Field>
            <Field label="Use of funds"><select value={draft.category_code} onChange={(e) => setDraft({ ...draft, category_code: e.target.value })}><option value="">None</option>{cats.data?.map((c) => <option key={c.code} value={c.code}>{c.code}. {c.title}</option>)}</select></Field>
            <Field label="Owner"><input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></Field>
            <Field label="Target date"><input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} /></Field>
            <Field label="Metric" help="What you will report"><input value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} placeholder="FTEs hired" /></Field>
            <Field label="Target value"><input value={draft.target_value} onChange={(e) => setDraft({ ...draft, target_value: e.target.value })} placeholder="2" /></Field>
            <Field label="Description" span2><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <div className="actions" style={{ marginTop: 10 }}><button className="btn primary">Save</button><button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button></div>
        </form>
      )}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Milestone</th><th>Use</th><th>Owner</th><th>Target date</th><th>Status</th><th>Metric</th><th className="num">Target</th><th className="num">Actual</th><th></th></tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={9} className="muted">No milestones yet. Copy them from your work plan.</td></tr>}
            {data.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><div className="small muted">{m.description}</div></td>
                <td>{m.category_code && <Badge tone="blue">{m.category_code}</Badge>}</td>
                <td><input className="inline" value={m.owner} onChange={(e) => local(m.id, { owner: e.target.value })} onBlur={(e) => update(m.id, { owner: e.target.value })} /></td>
                <td><input className="inline" type="date" value={m.due_date} onChange={(e) => update(m.id, { due_date: e.target.value })} /></td>
                <td><select className="inline" value={m.status} onChange={(e) => update(m.id, { status: e.target.value as Milestone['status'] })}>{MS_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></td>
                <td className="small">{m.metric}</td>
                <td className="num">{m.target_value}</td>
                <td className="num"><input className="inline" style={{ width: 80 }} value={m.actual_value} onChange={(e) => local(m.id, { actual_value: e.target.value })} onBlur={(e) => update(m.id, { actual_value: e.target.value })} /></td>
                <td><button className="btn sm danger" onClick={() => remove(m.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Ledger() {
  const entries = useData<LedgerEntry[]>('/compliance/ledger');
  const summary = useData<LedgerSummary>('/compliance/ledger-summary');
  const cats = useData<Category[]>('/reference/categories');
  const milestones = useData<Milestone[]>('/compliance/milestones');
  const [draft, setDraft] = useState({ entry_date: today(), direction: 'expenditure', amount: '', category_code: '', cost_type: 'other', description: '', vendor: '', invoice_ref: '', milestone_id: '', doc_link: '' });
  const toast = useToast();
  const refresh = () => { entries.reload(); summary.reload(); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/compliance/ledger', { ...draft, amount: Number(draft.amount), milestone_id: draft.milestone_id ? Number(draft.milestone_id) : null });
      setDraft({ ...draft, amount: '', description: '', vendor: '', invoice_ref: '', doc_link: '' }); refresh(); toast('Recorded');
    } catch (ex) { toast((ex as Error).message); }
  };
  const remove = async (id: number) => { if (!confirm('Delete this entry?')) return; await api.del(`/compliance/ledger/${id}`); refresh(); };

  if (entries.error || summary.error) return <div className="alert danger">{entries.error || summary.error}</div>;
  if (!entries.data || !summary.data) return <p className="muted">Loading…</p>;
  const s = summary.data;

  return (
    <>
      <div className="grid cols-4">
        <Stat label="Award" value={money(s.award)} />
        <Stat label="Drawn down" value={money(s.drawn)} sub={s.award ? `${Math.round((s.drawn / s.award) * 100)}% of award` : undefined} />
        <Stat label="Spent" value={money(s.spent)} sub={s.award ? `${Math.round((s.spent / s.award) * 100)}% of award` : undefined} />
        <Stat label="Cash on hand" value={money(s.cashOnHand)} sub={s.cashOnHand < 0 ? 'Spending ahead of drawdowns' : 'Drawn minus spent'} />
      </div>
      {s.cashOnHand < 0 && <div className="alert warn" style={{ marginTop: 12 }}>Expenditures exceed drawdowns by {money(-s.cashOnHand)}. Submit a reimbursement request or check for missing drawdown entries.</div>}

      <form className="card" onSubmit={add} style={{ marginTop: 14 }}>
        <h2>Record an entry</h2>
        <div className="form-grid">
          <Field label="Date"><input type="date" value={draft.entry_date} onChange={(e) => setDraft({ ...draft, entry_date: e.target.value })} required /></Field>
          <Field label="Type"><select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value })}><option value="expenditure">Expenditure</option><option value="drawdown">Drawdown (funds received)</option></select></Field>
          <Field label="Amount"><input type="number" min={0.01} step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} required /></Field>
          {draft.direction === 'expenditure' && (<>
            <Field label="Use of funds"><select value={draft.category_code} onChange={(e) => setDraft({ ...draft, category_code: e.target.value })}><option value="">None</option>{cats.data?.map((c) => <option key={c.code} value={c.code}>{c.code}. {c.title}</option>)}</select></Field>
            <Field label="Cost type"><select value={draft.cost_type} onChange={(e) => setDraft({ ...draft, cost_type: e.target.value })}>{COST_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
            <Field label="Vendor"><input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} /></Field>
            <Field label="Invoice or check number"><input value={draft.invoice_ref} onChange={(e) => setDraft({ ...draft, invoice_ref: e.target.value })} /></Field>
            <Field label="Milestone"><select value={draft.milestone_id} onChange={(e) => setDraft({ ...draft, milestone_id: e.target.value })}><option value="">None</option>{milestones.data?.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
          </>)}
          <Field label="Description" span2><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Backup document link" span2><input value={draft.doc_link} onChange={(e) => setDraft({ ...draft, doc_link: e.target.value })} placeholder="Invoice, payroll register, or receipt" /></Field>
        </div>
        <div className="actions" style={{ marginTop: 10 }}><button className="btn primary">Record</button></div>
      </form>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div className="card table-wrap">
          <h3>Budget vs actual by use of funds</h3>
          <table>
            <thead><tr><th>Use</th><th className="num">Budget</th><th className="num">Spent</th><th className="num">Remaining</th></tr></thead>
            <tbody>
              {Object.entries(s.byCategory).sort().map(([c, v]) => <tr key={c}><td><Badge tone="blue">{c}</Badge> {cats.data?.find((x) => x.code === c)?.title ?? ''}</td><td className="num">{money(v.budget)}</td><td className="num">{money(v.spent)}</td><td className="num" style={{ color: v.budget - v.spent < 0 ? 'var(--danger)' : undefined }}>{money(v.budget - v.spent)}</td></tr>)}
              {Object.keys(s.byCategory).length === 0 && <tr><td colSpan={4} className="muted">Add budget lines and expenditures to compare.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Monthly close checklist</h3>
          <ul style={{ paddingLeft: 18, margin: 0 }} className="small">
            <li>Every expenditure has an invoice or payroll backup linked</li>
            <li>Ledger total matches the RHTP cost center in the general ledger</li>
            <li>Drawdown requests match expenditures since the last request</li>
            <li>Personnel charges have time and effort documentation</li>
            <li>Equipment over the threshold is tagged in the inventory</li>
          </ul>
        </div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Use</th><th>Vendor</th><th>Ref</th><th className="num">Amount</th><th></th></tr></thead>
          <tbody>
            {entries.data.length === 0 && <tr><td colSpan={8} className="muted">No ledger entries yet.</td></tr>}
            {entries.data.map((x) => (
              <tr key={x.id}>
                <td>{fmtDate(x.entry_date)}</td>
                <td><Badge tone={x.direction === 'drawdown' ? 'green' : 'gray'}>{label(x.direction)}</Badge></td>
                <td>{x.description}{x.doc_link && <div className="small"><a href={x.doc_link} target="_blank" rel="noreferrer">Backup</a></div>}</td>
                <td>{x.category_code && <Badge tone="blue">{x.category_code}</Badge>}</td>
                <td className="small">{x.vendor}</td>
                <td className="small">{x.invoice_ref}</td>
                <td className="num" style={{ color: x.direction === 'drawdown' ? 'var(--success)' : undefined }}>{x.direction === 'drawdown' ? '+' : '−'}{money(x.amount, 2)}</td>
                <td><button className="btn sm danger" onClick={() => remove(x.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
