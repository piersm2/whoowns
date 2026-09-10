import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, currentHospitalId, setCurrentHospitalId } from '../lib/api';
import type { Hospital } from '../lib/types';

export const idLine = (h: Pick<Hospital, 'ccn' | 'ptan' | 'npi' | 'tin' | 'state'>) =>
  [h.ptan && `PTAN ${h.ptan}`, h.ccn && h.ccn !== h.ptan && `CCN ${h.ccn}`, h.npi && `NPI ${h.npi}`, h.tin && `TIN ${h.tin}`, h.state].filter(Boolean).join(' · ');

// Switches the whole app to another hospital. Type a PTAN, NPI, TIN, CCN, or part of a name.
export function HospitalSwitcher() {
  const [all, setAll] = useState<Hospital[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { api.get<Hospital[]>('/hospitals').then(setAll).catch(() => setAll([])); }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cur = all.find((h) => String(h.id) === currentHospitalId()) ?? all[0];
  const digits = q.replace(/\D/g, '');
  const lower = q.trim().toLowerCase();
  const hits = !lower ? all : all.filter((h) =>
    h.name.toLowerCase().includes(lower) || h.city.toLowerCase().includes(lower) || h.ccn.toLowerCase().includes(lower) || h.ptan.toLowerCase().includes(lower)
    || (digits && [h.npi, h.tin, h.ccn, h.ptan].some((v) => v.replace(/\D/g, '').includes(digits))));

  const pick = (h: Hospital) => {
    setCurrentHospitalId(h.id);
    setOpen(false);
    window.location.assign('/');
  };

  return (
    <div className="switcher" ref={box}>
      {cur && <span className="current">Working on<strong>{cur.name || 'Unnamed hospital'}</strong></span>}
      <input
        id="hospital-search"
        placeholder={all.length > 1 ? 'Switch by PTAN, NPI, TIN, or name' : 'PTAN, NPI, TIN, or name'}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        aria-label="Find a hospital by PTAN, NPI, TIN, CCN, or name"
      />
      {open && (
        <div className="results">
          {hits.map((h) => (
            <button key={h.id} className={cur?.id === h.id ? 'on' : ''} onClick={() => pick(h)}>
              {h.name || 'Unnamed hospital'}
              <div className="ids">{idLine(h) || 'No identifiers yet'}</div>
            </button>
          ))}
          {hits.length === 0 && <div className="empty">No saved hospital matches "{q}".</div>}
          <Link to="/hospitals" onClick={() => setOpen(false)} style={{ display: 'block', padding: '8px 10px', fontSize: '0.84rem' }}>Add or look up a hospital</Link>
        </div>
      )}
    </div>
  );
}
