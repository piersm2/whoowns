import { useState } from 'react';
import { api, money } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, COST_TYPES, Field, label } from '../components/ui';
import type { BudgetLine, BudgetSummary, Category } from '../lib/types';

const YEARS = [1, 2, 3, 4, 5] as const;
const blank = { category_code: 'A', cost_type: 'personnel', line_item: '', justification: '', year1: 0, year2: 0, year3: 0, year4: 0, year5: 0 };

export default function Budget() {
  const lines = useData<BudgetLine[]>('/budget');
  const summary = useData<BudgetSummary>('/budget/summary');
  const cats = useData<Category[]>('/reference/categories');
  const [draft, setDraft] = useState<Omit<BudgetLine, 'id' | 'sort_order'>>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const toast = useToast();
  const refresh = () => { lines.reload(); summary.reload(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/budget/${editing}`, draft); else await api.post('/budget', draft);
      setDraft(blank); setEditing(null); toast('Saved'); refresh();
    } catch (ex) { toast((ex as Error).message); }
  };
  const edit = (b: BudgetLine) => { const { id: _i, sort_order: _s, ...rest } = b; setDraft(rest); setEditing(b.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (id: number) => { if (!confirm('Delete this line?')) return; await api.del(`/budget/${id}`); refresh(); };
  const total = (b: Omit<BudgetLine, 'id' | 'sort_order'>) => YEARS.reduce((s, y) => s + Number(b[`year${y}`] || 0), 0);

  if (lines.error || summary.error) return <div className="alert danger">{lines.error || summary.error}</div>;
  if (!lines.data || !summary.data || !cats.data) return <p className="muted">Loading…</p>;
  const s = summary.data;
  const catTitle = (code: string) => cats.data?.find((c) => c.code === code)?.title ?? '';

  return (
    <>
      <div className="page-head">
        <div><h1>Budget worksheet</h1><p>Five year budget by use-of-funds category and cost type. Every line needs a justification; states score budgets on whether costs are reasonable, necessary, and tied to an activity.</p></div>
        <div className="actions"><a className="btn" href="/api/budget/export.csv" download>Export CSV</a></div>
      </div>

      <div className="grid cols-4">
        <div className="card stat"><div className="label">Total request</div><div className="value">{money(s.grand)}</div><div className="sub">{s.lines} lines</div></div>
        {s.basis > 0 && <div className="card stat"><div className="label">{s.grand > s.basis ? 'Over' : 'Under'} award basis</div><div className="value" style={{ color: s.grand > s.basis ? 'var(--danger)' : 'var(--success)' }}>{money(Math.abs(s.basis - s.grand))}</div><div className="sub">Basis {money(s.basis)}</div></div>}
        <div className="card stat"><div className="label">Year 1</div><div className="value">{money(s.byYear[0])}</div><div className="sub">{s.grand ? Math.round((s.byYear[0] / s.grand) * 100) : 0}% of total</div></div>
        <div className="card stat"><div className="label">Missing justification</div><div className="value" style={{ color: s.missingJustification ? 'var(--warn)' : undefined }}>{s.missingJustification}</div><div className="sub">lines without a reason</div></div>
      </div>

      {s.caps.some((c) => c.exceeded) && s.caps.filter((c) => c.exceeded).map((c) => (
        <div key={c.key} className="alert warn" style={{ marginTop: 12 }}>{c.label} is {money(c.amount)}, above the reported {Math.round(c.share * 100)}% cap ({money(c.limit)}). Your state may pass down a tighter limit. Verify against the NOFO and your state agreement.</div>
      ))}

      <form className="card" onSubmit={submit} style={{ marginTop: 14 }}>
        <h2>{editing ? 'Edit line' : 'Add a line'}</h2>
        <div className="form-grid">
          <Field label="Line item" span2><input value={draft.line_item} onChange={(e) => setDraft({ ...draft, line_item: e.target.value })} required placeholder="RN care manager (1.0 FTE)" /></Field>
          <Field label="Use of funds"><select value={draft.category_code} onChange={(e) => setDraft({ ...draft, category_code: e.target.value })}>{cats.data.map((c) => <option key={c.code} value={c.code}>{c.code}. {c.title}</option>)}</select></Field>
          <Field label="Cost type"><select value={draft.cost_type} onChange={(e) => setDraft({ ...draft, cost_type: e.target.value })}>{COST_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
          {YEARS.map((y) => <Field key={y} label={`Year ${y}`}><input type="number" min={0} step="1" value={draft[`year${y}`]} onChange={(e) => setDraft({ ...draft, [`year${y}`]: Number(e.target.value) })} /></Field>)}
          <Field label="Line total"><input value={money(total(draft))} readOnly /></Field>
          <Field label="Justification" help="Why this cost, how you estimated it, and what it delivers" span2><textarea value={draft.justification} onChange={(e) => setDraft({ ...draft, justification: e.target.value })} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn primary">{editing ? 'Save changes' : 'Add line'}</button>
          {editing && <button type="button" className="btn" onClick={() => { setDraft(blank); setEditing(null); }}>Cancel</button>}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Use</th><th>Type</th><th>Line item</th>{YEARS.map((y) => <th key={y} className="num">Y{y}</th>)}<th className="num">Total</th><th></th></tr></thead>
          <tbody>
            {lines.data.length === 0 && <tr><td colSpan={10} className="muted">No budget lines yet.</td></tr>}
            {lines.data.map((b) => (
              <tr key={b.id}>
                <td><Badge tone="blue">{b.category_code}</Badge></td>
                <td>{label(b.cost_type)}</td>
                <td>{b.line_item}{!b.justification.trim() && <div className="placeholder-note">Needs justification</div>}<div className="small muted">{b.justification}</div></td>
                {YEARS.map((y) => <td key={y} className="num">{b[`year${y}`] ? money(b[`year${y}`]) : ''}</td>)}
                <td className="num">{money(total(b))}</td>
                <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm" onClick={() => edit(b)}>Edit</button> <button className="btn sm danger" onClick={() => remove(b.id)}>✕</button></td>
              </tr>
            ))}
            {lines.data.length > 0 && <tr className="total"><td colSpan={3}>Total</td>{s.byYear.map((v, i) => <td key={i} className="num">{money(v)}</td>)}<td className="num">{money(s.grand)}</td><td></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>By use of funds</h3>
          <table><tbody>{Object.entries(s.byCategory).sort().map(([c, v]) => <tr key={c}><td><Badge tone="blue">{c}</Badge> {catTitle(c)}</td><td className="num">{money(v)}</td><td className="num muted">{s.grand ? Math.round((v / s.grand) * 100) : 0}%</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h3>Cap check</h3>
          <table><tbody>{s.caps.map((c) => <tr key={c.key}><td>{c.label}<div className="small muted">Reported cap {Math.round(c.share * 100)}%</div></td><td className="num">{money(c.amount)}</td><td>{s.basis ? <Badge tone={c.exceeded ? 'red' : 'green'}>{c.exceeded ? 'Over' : 'OK'}</Badge> : <Badge tone="gray">Set award</Badge>}</td></tr>)}</tbody></table>
          <p className="muted small" style={{ marginTop: 8 }}>Caps are measured against the award if entered, otherwise the requested amount, otherwise the budget total.</p>
        </div>
      </div>
    </>
  );
}
