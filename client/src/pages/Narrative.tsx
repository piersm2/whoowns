import { useEffect, useMemo, useRef, useState } from 'react';
import { api, words } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, Progress, STATUS_TONE, label } from '../components/ui';
import type { IntakeQuestion, NarrativeSection } from '../lib/types';

type QData = { questions: IntakeQuestion[]; completeness: Record<string, { answered: number; total: number }> };

export default function Narrative() {
  const [tab, setTab] = useState<'intake' | 'sections'>('intake');
  return (
    <>
      <div className="page-head">
        <div><h1>Narrative drafter</h1><p>Answer plain questions about your hospital and project. The drafter turns them into first drafts of each grant section, with brackets wherever you still owe an answer.</p></div>
        <div className="actions"><a className="btn" href="/api/narrative/export.md" download>Export packet (.md)</a></div>
      </div>
      <div className="tabs">
        <button className={tab === 'intake' ? 'active' : ''} onClick={() => setTab('intake')}>1. Intake questions</button>
        <button className={tab === 'sections' ? 'active' : ''} onClick={() => setTab('sections')}>2. Draft sections</button>
      </div>
      {tab === 'intake' ? <Intake onDone={() => setTab('sections')} /> : <Sections />}
    </>
  );
}

function Intake({ onDone }: { onDone: () => void }) {
  const { data, error, reload } = useData<QData>('/narrative/questions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, number>>({});
  const toast = useToast();
  useEffect(() => { if (data) setAnswers(Object.fromEntries(data.questions.map((q) => [q.key, q.answer]))); }, [data]);

  const save = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      api.put(`/narrative/answers/${key}`, { answer: value }).catch((e) => toast(e.message));
    }, 600);
  };

  const groups = useMemo(() => {
    const m = new Map<string, IntakeQuestion[]>();
    for (const q of data?.questions ?? []) (m.get(q.section_key) ?? m.set(q.section_key, []).get(q.section_key)!).push(q);
    return [...m.entries()];
  }, [data]);

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const answered = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head"><strong>{answered} of {data.questions.length} answered</strong><span className="muted small">Answers save automatically</span></div>
        <Progress value={answered} max={data.questions.length} green={answered === data.questions.length} />
      </div>
      {groups.map(([section, qs]) => (
        <div className="card" key={section}>
          <h2>{label(section)}</h2>
          {qs.map((q) => (
            <label className="field" key={q.key} style={{ marginBottom: 14 }}>
              <span style={{ color: 'var(--text)', fontSize: '0.95rem' }}>{q.prompt}</span>
              <span className="help">{q.help}</span>
              {q.input_type === 'text'
                ? <input value={answers[q.key] ?? ''} onChange={(e) => save(q.key, e.target.value)} />
                : <textarea value={answers[q.key] ?? ''} onChange={(e) => save(q.key, e.target.value)} />}
            </label>
          ))}
        </div>
      ))}
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="btn primary" onClick={() => { reload(); onDone(); }}>Continue to draft sections</button>
      </div>
    </>
  );
}

function Sections() {
  const { data, error, reload, setData } = useData<NarrativeSection[]>('/narrative/sections');
  const [active, setActive] = useState<string>('need');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const section = data?.find((s) => s.key === active);
  useEffect(() => { if (section) { setContent(section.content); setDirty(false); } }, [section?.key, section?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (extra: Partial<NarrativeSection> = {}) => {
    if (!section) return;
    setBusy(true);
    try {
      const updated = await api.patch<NarrativeSection>(`/narrative/sections/${section.key}`, { content, ...extra });
      setData((d) => d && d.map((s) => (s.key === updated.key ? updated : s)));
      setDirty(false); toast('Saved');
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const generate = async () => {
    if (!section) return;
    if (section.content.trim() && !confirm('Replace the current text with a fresh draft?')) return;
    setBusy(true);
    try {
      const r = await api.post<{ draft: string; placeholders: number }>(`/narrative/sections/${section.key}/draft?apply=1`);
      toast(r.placeholders ? `Draft generated with ${r.placeholders} placeholder${r.placeholders > 1 ? 's' : ''} to fill` : 'Draft generated');
      reload();
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const generateAll = async () => {
    if (!data) return;
    if (!confirm('Generate drafts for every section that is still empty?')) return;
    setBusy(true);
    for (const s of data.filter((x) => !x.content.trim())) await api.post(`/narrative/sections/${s.key}/draft?apply=1`);
    setBusy(false); toast('Drafts generated'); reload();
  };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data || !section) return <p className="muted">Loading…</p>;
  const wc = words(content);
  const placeholders = (content.match(/\[[^\]]+\]/g) || []).length;

  return (
    <div className="split">
      <div className="card section-list">
        {data.map((s) => (
          <button key={s.key} className={s.key === active ? 'active' : ''} onClick={() => { if (dirty && !confirm('Discard unsaved changes?')) return; setActive(s.key); }}>
            <span>{s.title}</span><Badge tone={STATUS_TONE[s.status]}>{label(s.status)}</Badge>
          </button>
        ))}
        <div style={{ marginTop: 10 }}><button className="btn sm" onClick={generateAll} disabled={busy} style={{ width: '100%' }}>Generate all empty sections</button></div>
      </div>
      <div className="card editor">
        <div className="card-head">
          <div><h2>{section.title}</h2><p className="muted small" style={{ margin: 0 }}>{section.guidance}</p></div>
          <div className="actions">
            <button className="btn" onClick={generate} disabled={busy}>{section.content ? 'Regenerate draft' : 'Generate draft'}</button>
            <button className="btn primary" onClick={() => save()} disabled={busy || !dirty}>Save</button>
          </div>
        </div>
        <textarea value={content} onChange={(e) => { setContent(e.target.value); setDirty(true); }} placeholder="Generate a draft from your intake answers, or write here directly." />
        <div className="card-head" style={{ marginTop: 8 }}>
          <span className={`small ${wc > section.word_limit ? 'placeholder-note' : 'muted'}`}>{wc} / {section.word_limit} words{placeholders ? ` · ${placeholders} placeholder${placeholders > 1 ? 's' : ''} in brackets` : ''}</span>
          <div className="actions">
            <label className="small muted">Status</label>
            <select className="inline" value={section.status} onChange={(e) => save({ status: e.target.value as NarrativeSection['status'] })}>
              {['empty', 'draft', 'review', 'final'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <label className="small muted">Limit</label>
            <input className="inline" type="number" style={{ width: 90 }} value={section.word_limit} onChange={(e) => save({ word_limit: Number(e.target.value) })} />
          </div>
        </div>
      </div>
    </div>
  );
}
