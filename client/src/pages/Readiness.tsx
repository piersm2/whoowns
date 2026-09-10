import { useMemo, useState } from 'react';
import { api, fmtDate, today } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, Field, Progress, STATUS_TONE, label } from '../components/ui';
import type { ChecklistItem, ChecklistStatus } from '../lib/types';

const PHASES: [ChecklistItem['phase'], string, string][] = [
  ['application', 'Application', 'What your state will ask for in its sub-award application.'],
  ['award', 'Award setup', 'The week after the award letter arrives.'],
  ['reporting', 'Reporting', 'Ongoing obligations while you spend the money.'],
];
const STATUSES: ChecklistStatus[] = ['not_started', 'in_progress', 'blocked', 'complete', 'na'];

export default function Readiness() {
  const { data, error, reload, setData } = useData<ChecklistItem[]>('/checklist');
  const [phase, setPhase] = useState<ChecklistItem['phase']>('application');
  const [hideDone, setHideDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', category: '', description: '', due_date: '', owner: '' });
  const [expanded, setExpanded] = useState<number | null>(null);
  const toast = useToast();

  const items = useMemo(() => (data ?? []).filter((c) => c.phase === phase), [data, phase]);
  const active = items.filter((c) => c.status !== 'na');
  const done = active.filter((c) => c.status === 'complete').length;
  const grouped = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>();
    for (const c of items) { if (hideDone && (c.status === 'complete' || c.status === 'na')) continue; (m.get(c.category) ?? m.set(c.category, []).get(c.category)!).push(c); }
    return [...m.entries()];
  }, [items, hideDone]);

  const update = async (id: number, patch: Partial<ChecklistItem>) => {
    setData((d) => d && d.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try { await api.patch(`/checklist/${id}`, patch); } catch (e) { toast((e as Error).message); reload(); }
  };
  const remove = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    await api.del(`/checklist/${id}`); toast('Deleted'); reload();
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/checklist', { ...draft, phase, category: draft.category || 'State specific' });
      setDraft({ title: '', category: '', description: '', due_date: '', owner: '' }); setAdding(false); toast('Added'); reload();
    } catch (ex) { toast((ex as Error).message); }
  };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const t = today();

  return (
    <>
      <div className="page-head">
        <div><h1>Readiness checklist</h1><p>Every document and decision a small hospital typically needs, in order. Add your state's own line items as you learn them.</p></div>
        <div className="actions">
          <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide completed</label>
          <button className="btn primary" onClick={() => setAdding((a) => !a)}>Add item</button>
        </div>
      </div>

      <div className="tabs">
        {PHASES.map(([p, l]) => {
          const ph = (data ?? []).filter((c) => c.phase === p && c.status !== 'na');
          return <button key={p} className={phase === p ? 'active' : ''} onClick={() => setPhase(p)}>{l} <span className="muted">{ph.filter((c) => c.status === 'complete').length}/{ph.length}</span></button>;
        })}
      </div>
      <p className="muted small">{PHASES.find((p) => p[0] === phase)?.[2]}</p>
      <div style={{ margin: '8px 0 14px' }}><Progress value={done} max={active.length} green={active.length > 0 && done === active.length} /></div>

      {adding && (
        <form className="card" onSubmit={add}>
          <h3>New {label(phase)} item</h3>
          <div className="form-grid">
            <Field label="Title" span2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="State specific" /></Field>
            <Field label="Owner"><input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} /></Field>
            <Field label="Description" span2><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <div className="actions" style={{ marginTop: 10 }}><button className="btn primary">Save</button><button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}

      <div className="card">
        {grouped.length === 0 && <p className="muted">Nothing to show.</p>}
        {grouped.map(([cat, list]) => (
          <div key={cat}>
            <div className="category-head">{cat}</div>
            {list.map((c) => {
              const overdue = c.due_date && c.due_date < t && !['complete', 'na'].includes(c.status);
              return (
                <div key={c.id}>
                  <div className={`check-row${c.status === 'complete' ? ' done' : ''}`}>
                    <input type="checkbox" style={{ width: 'auto', marginTop: 4 }} checked={c.status === 'complete'} onChange={(e) => update(c.id, { status: e.target.checked ? 'complete' : 'in_progress' })} />
                    <div>
                      <div className="title" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                        {c.title} {c.is_required ? <Badge tone="blue">Required</Badge> : <Badge tone="gray">Optional</Badge>} {overdue && <Badge tone="red">Overdue</Badge>}
                      </div>
                      <div className="desc">{c.description}</div>
                      {expanded === c.id && (
                        <div className="form-grid" style={{ marginTop: 8 }}>
                          <Field label="Evidence link" span2><input className="inline" value={c.evidence_link} onChange={(e) => update(c.id, { evidence_link: e.target.value })} placeholder="Link to the file or portal" /></Field>
                          <Field label="Notes" span2><textarea value={c.notes} onChange={(e) => update(c.id, { notes: e.target.value })} /></Field>
                          <Field label="Category"><input className="inline" value={c.category} onBlur={(e) => update(c.id, { category: e.target.value })} onChange={(e) => setData((d) => d && d.map((x) => (x.id === c.id ? { ...x, category: e.target.value } : x)))} /></Field>
                          <Field label="Required"><select className="inline" value={c.is_required} onChange={(e) => update(c.id, { is_required: Number(e.target.value) })}><option value={1}>Required</option><option value={0}>Optional</option></select></Field>
                        </div>
                      )}
                    </div>
                    <select className="inline" value={c.status} onChange={(e) => update(c.id, { status: e.target.value as ChecklistStatus })} style={{ background: 'transparent' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                    <input className="inline" placeholder="Owner" value={c.owner} onChange={(e) => setData((d) => d && d.map((x) => (x.id === c.id ? { ...x, owner: e.target.value } : x)))} onBlur={(e) => update(c.id, { owner: e.target.value })} />
                    <input className="inline" type="date" value={c.due_date} onChange={(e) => update(c.id, { due_date: e.target.value })} title={c.due_date ? fmtDate(c.due_date) : 'Due date'} />
                    <button className="btn sm danger" title="Delete" onClick={() => remove(c.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>Status colors: {STATUSES.map((s) => <span key={s} style={{ marginRight: 8 }}><Badge tone={STATUS_TONE[s]}>{label(s)}</Badge></span>)}</p>
    </>
  );
}
