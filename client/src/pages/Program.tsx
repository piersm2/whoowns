import { useEffect, useState } from 'react';
import { api, fmtDate, money } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, Field } from '../components/ui';
import type { Category, Hospital, ProgramFact, StateAllocation } from '../lib/types';

export default function Program() {
  const [tab, setTab] = useState<'overview' | 'uses' | 'state'>('overview');
  return (
    <>
      <div className="page-head">
        <div><h1>Program reference</h1><p>What the Rural Health Transformation Program is, what money can be used for, and how your state is running it. Facts marked "verify" are reported guardrails to confirm against the CMS NOFO.</p></div>
      </div>
      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview and dates</button>
        <button className={tab === 'uses' ? 'active' : ''} onClick={() => setTab('uses')}>Use of funds (A to J)</button>
        <button className={tab === 'state' ? 'active' : ''} onClick={() => setTab('state')}>Your state</button>
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'uses' && <Uses />}
      {tab === 'state' && <StatePanel />}
    </>
  );
}

function Overview() {
  const { data, error } = useData<ProgramFact[]>('/reference/facts');
  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const sections = [...new Set(data.map((f) => f.section))];
  return (
    <div className="grid cols-2">
      {sections.map((s) => (
        <div className="card" key={s}>
          <h2>{s}</h2>
          {data.filter((f) => f.section === s).map((f) => (
            <div key={f.id} style={{ marginBottom: 12 }}>
              <strong>{f.label}</strong>{/verify/i.test(f.label) && <> <Badge tone="amber">Verify</Badge></>}
              <div>{f.value}</div>
              <div className="small muted">Source: {f.source}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Uses() {
  const { data, error } = useData<Category[]>('/reference/categories');
  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="alert info">States had to pick at least three of these. Your project should map to categories in your state's approved plan. Tag every budget line and milestone with a letter so reports roll up cleanly.</div>
      <div className="grid cols-2">
        {data.map((c) => (
          <div className="card" key={c.code}>
            <h3><Badge tone="blue">{c.code}</Badge> {c.title}</h3>
            <p>{c.description}</p>
            <p className="small muted" style={{ margin: 0 }}><strong>Examples:</strong> {c.examples}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function StatePanel() {
  const hospital = useData<Hospital>('/hospital');
  const states = useData<StateAllocation[]>('/reference/states');
  const [code, setCode] = useState('');
  const [form, setForm] = useState<Partial<StateAllocation>>({});
  const toast = useToast();
  useEffect(() => { if (hospital.data?.state && !code) setCode(hospital.data.state); }, [hospital.data, code]);
  const st = states.data?.find((s) => s.state === code);
  useEffect(() => { if (st) setForm(st); }, [st?.state, st?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    const { state: _s, state_name: _n, updated_at: _u, ...body } = form as StateAllocation;
    try { await api.patch(`/reference/states/${code}`, { ...body, fy2026_award: body.fy2026_award === null || body.fy2026_award === undefined || (body.fy2026_award as unknown) === '' ? null : Number(body.fy2026_award) }); toast('Saved'); states.reload(); }
    catch (ex) { toast((ex as Error).message); }
  };

  if (states.error) return <div className="alert danger">{states.error}</div>;
  if (!states.data) return <p className="muted">Loading…</p>;
  const known = states.data.filter((s) => s.fy2026_award);

  return (
    <>
      <div className="card">
        <div className="form-grid">
          <Field label="State"><select value={code} onChange={(e) => setCode(e.target.value)}><option value="">Select</option>{states.data.map((s) => <option key={s.state} value={s.state}>{s.state_name}</option>)}</select></Field>
        </div>
        {st && (
          <form onSubmit={save} style={{ marginTop: 12 }}>
            <h2>{st.state_name}</h2>
            <div className="form-grid">
              <Field label="FY2026 award" help="From the CMS award announcement"><input type="number" step="1000" value={form.fy2026_award ?? ''} onChange={(e) => setForm({ ...form, fy2026_award: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              <Field label="Verified against CMS"><select value={form.award_verified ?? 0} onChange={(e) => setForm({ ...form, award_verified: Number(e.target.value) })}><option value={0}>Not verified</option><option value={1}>Verified</option></select></Field>
              <Field label="Lead agency"><input value={form.lead_agency ?? ''} onChange={(e) => setForm({ ...form, lead_agency: e.target.value })} placeholder="State Medicaid agency, health department, office of rural health" /></Field>
              <Field label="Program contact email"><input value={form.contact_email ?? ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
              <Field label="Program page" span2><input value={form.program_url ?? ''} onChange={(e) => setForm({ ...form, program_url: e.target.value })} placeholder="https://" /></Field>
              <Field label="Provider application opens"><input type="date" value={form.provider_application_open ?? ''} onChange={(e) => setForm({ ...form, provider_application_open: e.target.value })} /></Field>
              <Field label="Provider application due"><input type="date" value={form.provider_application_due ?? ''} onChange={(e) => setForm({ ...form, provider_application_due: e.target.value })} /></Field>
              <Field label="Notes" help="Caps the state passes down, match requirements, portal quirks, TA sessions" span2><textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn primary">Save state details</button>
              {form.program_url && <a className="btn" href={form.program_url} target="_blank" rel="noreferrer">Open program page</a>}
              {st.provider_application_due && <span className="small muted">Due {fmtDate(st.provider_application_due)}</span>}
            </div>
          </form>
        )}
      </div>
      <div className="card">
        <h3>Awards entered so far</h3>
        <p className="small muted">Only figures confirmed in public reporting were pre-filled (Texas and New Jersey, the high and low). Enter the rest from the CMS award list as you confirm them.</p>
        {known.length === 0 ? <p className="muted">None yet.</p> : (
          <table><tbody>{known.map((s) => <tr key={s.state}><td>{s.state_name}</td><td className="num">{money(s.fy2026_award)}</td><td>{s.award_verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}</td></tr>)}</tbody></table>
        )}
      </div>
    </>
  );
}
