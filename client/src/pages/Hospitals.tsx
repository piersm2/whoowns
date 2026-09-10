import { useState } from 'react';
import { api, currentHospitalId, setCurrentHospitalId } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, FACILITY_TYPES, Field } from '../components/ui';
import type { DirectoryHit, DirectorySearch, Hospital, StateAllocation } from '../lib/types';

const blank = { name: '', ccn: '', ptan: '', npi: '', tin: '', address: '', city: '', zip: '', state: '', county: '', facility_type: 'CAH' };

export default function Hospitals() {
  const { data, error, reload } = useData<Hospital[]>('/hospitals');
  const { data: states } = useData<StateAllocation[]>('/reference/states');
  const [q, setQ] = useState('');
  const [lookup, setLookup] = useState<DirectorySearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(blank);
  const toast = useToast();
  const cur = currentHospitalId();

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) { setLookup(null); return; }
    setBusy(true);
    try { setLookup(await api.get<DirectorySearch>(`/directory/search?q=${encodeURIComponent(q.trim())}`)); }
    catch (ex) { toast((ex as Error).message); } finally { setBusy(false); }
  };
  const useHit = (h: DirectoryHit) => {
    setDraft({ ...draft, name: h.name, ccn: h.ccn || draft.ccn, ptan: h.ccn || draft.ptan, npi: h.npi || draft.npi, address: h.address, city: h.city, zip: h.zip, state: h.state, county: h.county, facility_type: h.facility_type || 'OTHER' });
    toast('Prefilled from CMS. Add the TIN and anything CMS does not publish.');
    document.getElementById('nh_name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const h = await api.post<Hospital>('/hospitals', draft);
      setDraft(blank); toast(`Added ${h.name}`); reload();
    } catch (ex) { toast((ex as Error).message); }
  };
  const open = (h: Hospital) => { setCurrentHospitalId(h.id); window.location.assign('/'); };
  const remove = async (h: Hospital) => {
    if (!confirm(`Delete ${h.name || 'this hospital'} and everything tracked for it? This cannot be undone.`)) return;
    await api.del(`/hospitals/${h.id}`);
    if (String(h.id) === cur) setCurrentHospitalId('');
    toast('Deleted'); reload();
  };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const digits = q.replace(/\D/g, '');
  const lower = q.trim().toLowerCase();
  const saved = !lower ? data : data.filter((h) =>
    h.name.toLowerCase().includes(lower) || h.ccn.toLowerCase().includes(lower) || h.ptan.toLowerCase().includes(lower)
    || (digits && [h.npi, h.tin, h.ccn, h.ptan].some((v) => v.replace(/\D/g, '').includes(digits))));

  return (
    <>
      <div className="page-head">
        <div><h1>Hospitals</h1><p>Every hospital tracked here, with its PTAN, NPI, TIN, and CCN. Type any of them to filter, or look one up in CMS to add it.</p></div>
      </div>

      <form className="card" onSubmit={search}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
          <Field label="PTAN, NPI, TIN, CCN, or name" help="Filters saved hospitals as you type. Search CMS for a 10 digit NPI, a 6 character CCN or PTAN, or a name.">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="1234567893 or 011234 or Sample Valley" />
          </Field>
          <button className="btn primary" disabled={busy}>{busy ? 'Searching…' : 'Search CMS'}</button>
        </div>
        {lookup && (
          <div style={{ marginTop: 12 }}>
            {lookup.remote && !lookup.remote.ok && <div className="alert warn">CMS lookup failed: {lookup.remote.error}. Saved hospitals below still match.</div>}
            {lookup.remote?.note && <div className="alert info">{lookup.remote.note}</div>}
            {lookup.directory.length > 0 && (
              <>
                <h3>From CMS</h3>
                {lookup.directory.map((h) => (
                  <div className="hit" key={h.id}>
                    <div><strong>{h.name}</strong><div className="ids-inline">{[h.ccn && `CCN ${h.ccn}`, h.npi && `NPI ${h.npi}`, h.facility_kind, [h.city, h.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div></div>
                    <button className="btn sm" onClick={() => useHit(h)} type="button">Use</button>
                  </div>
                ))}
              </>
            )}
            {lookup.remote?.ok && lookup.directory.length === 0 && <p className="muted small">Nothing in CMS matched "{lookup.query}".</p>}
            <p className="muted small" style={{ marginTop: 8 }}>{lookup.note}</p>
          </div>
        )}
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Hospital</th><th>PTAN</th><th>CCN</th><th>NPI</th><th>TIN</th><th>State</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {saved.length === 0 && <tr><td colSpan={8} className="muted">{data.length ? `No saved hospital matches "${q}".` : 'No hospitals yet. Add one below.'}</td></tr>}
            {saved.map((h) => (
              <tr key={h.id}>
                <td><strong>{h.name || 'Unnamed hospital'}</strong> {String(h.id) === cur && <Badge tone="blue">Open</Badge>}<div className="small muted">{[h.city, h.county && `${h.county} County`].filter(Boolean).join(', ')}</div></td>
                <td className="ids-inline">{h.ptan}</td><td className="ids-inline">{h.ccn}</td><td className="ids-inline">{h.npi}</td><td className="ids-inline">{h.tin}</td>
                <td>{h.state}</td><td>{h.facility_type}</td>
                <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm" onClick={() => open(h)}>Open</button> <button className="btn sm danger" onClick={() => remove(h)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card" onSubmit={create}>
        <h2>Add a hospital</h2>
        <p className="muted small">Use a CMS result above to prefill, or type it in. TIN and PTAN are not published by CMS.</p>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <Field label="Hospital name" span2><input id="nh_name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
          <Field label="PTAN" help="Usually the same 6 digits as the CCN"><input value={draft.ptan} onChange={(e) => setDraft({ ...draft, ptan: e.target.value })} /></Field>
          <Field label="CCN"><input value={draft.ccn} onChange={(e) => setDraft({ ...draft, ccn: e.target.value })} /></Field>
          <Field label="NPI" help="10 digits"><input value={draft.npi} onChange={(e) => setDraft({ ...draft, npi: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
          <Field label="TIN" help="EIN, 9 digits"><input value={draft.tin} onChange={(e) => setDraft({ ...draft, tin: e.target.value })} placeholder="12-3456789" /></Field>
          <Field label="Facility type"><select value={draft.facility_type} onChange={(e) => setDraft({ ...draft, facility_type: e.target.value })}>{FACILITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="State"><select value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}><option value="">Select</option>{states?.map((s) => <option key={s.state} value={s.state}>{s.state_name}</option>)}</select></Field>
          <Field label="Address"><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
          <Field label="City"><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
          <Field label="ZIP"><input value={draft.zip} onChange={(e) => setDraft({ ...draft, zip: e.target.value })} /></Field>
          <Field label="County"><input value={draft.county} onChange={(e) => setDraft({ ...draft, county: e.target.value })} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 10 }}><button className="btn primary">Add hospital</button></div>
      </form>
      <p className="muted small">Switching hospitals changes every tab: checklist, narrative, budget, compliance, and documents.</p>
    </>
  );
}
