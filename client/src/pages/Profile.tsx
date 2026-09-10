import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { FACILITY_TYPES, Field } from '../components/ui';
import type { Hospital, StateAllocation } from '../lib/types';

export default function Profile() {
  const { data, error, reload } = useData<Hospital>('/hospital');
  const { data: states } = useData<StateAllocation[]>('/reference/states');
  const [form, setForm] = useState<Partial<Hospital>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => { if (data) setForm(data); }, [data]);

  const set = (k: keyof Hospital) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    const { id: _id, updated_at: _u, ...body } = form as Hospital;
    try { await api.patch('/hospital', body); toast('Profile saved'); reload(); }
    catch (ex) { setErr((ex as Error).message); }
    finally { setSaving(false); }
  };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const num = (k: keyof Hospital) => ({ type: 'number', value: form[k] ?? 0, onChange: set(k), min: 0 } as const);
  const txt = (k: keyof Hospital, type = 'text') => ({ type, value: (form[k] as string) ?? '', onChange: set(k) });

  return (
    <form onSubmit={save}>
      <div className="page-head">
        <div><h1>Hospital profile</h1><p>Facility, contacts, registrations, and award details. Everything else in the app reads from here.</p></div>
        <div className="actions"><button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
      </div>
      {err && <div className="alert danger">{err}</div>}

      <div className="card">
        <h2>Facility</h2>
        <div className="form-grid">
          <Field label="Hospital name" span2><input {...txt('name')} required /></Field>
          <Field label="CCN" help="Medicare provider number"><input {...txt('ccn')} /></Field>
          <Field label="Facility type"><select value={form.facility_type ?? 'CAH'} onChange={set('facility_type')}>{FACILITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="State"><select value={form.state ?? ''} onChange={set('state')}><option value="">Select</option>{states?.map((s) => <option key={s.state} value={s.state}>{s.state_name}</option>)}</select></Field>
          <Field label="County"><input {...txt('county')} /></Field>
          <Field label="Licensed beds"><input {...num('licensed_beds')} /></Field>
          <Field label="Service area population"><input {...num('service_area_population')} /></Field>
          <Field label="Fiscal year end" help="MM-DD"><input {...txt('fiscal_year_end')} placeholder="06-30" /></Field>
        </div>
      </div>

      <div className="card">
        <h2>Primary contact</h2>
        <div className="form-grid">
          <Field label="Name"><input {...txt('contact_name')} /></Field>
          <Field label="Title"><input {...txt('contact_title')} /></Field>
          <Field label="Email"><input {...txt('contact_email', 'email')} /></Field>
          <Field label="Phone"><input {...txt('contact_phone')} /></Field>
        </div>
      </div>

      <div className="card">
        <h2>Registrations</h2>
        <div className="form-grid">
          <Field label="UEI" help="Unique Entity ID from SAM.gov"><input {...txt('uei')} /></Field>
          <Field label="SAM.gov registration expires"><input {...txt('sam_expiration', 'date')} /></Field>
        </div>
      </div>

      <div className="card">
        <h2>Funding request and award</h2>
        <div className="form-grid">
          <Field label="Amount requested"><input {...num('requested_amount')} step="1000" /></Field>
          <Field label="Amount awarded" help="Leave 0 until you have an award letter"><input {...num('awarded_amount')} step="1000" /></Field>
          <Field label="Award date"><input {...txt('award_date', 'date')} /></Field>
          <Field label="Project start"><input {...txt('project_start', 'date')} /></Field>
          <Field label="Project end"><input {...txt('project_end', 'date')} /></Field>
          <Field label="Notes" span2><textarea value={form.notes ?? ''} onChange={set('notes')} /></Field>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 14 }}><button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  );
}
