import { useState } from 'react';
import { api, fmtDate } from '../lib/api';
import { useData } from '../lib/useData';
import { useToast } from '../components/Toast';
import { Badge, Field, label } from '../components/ui';
import type { Doc } from '../lib/types';

const TYPES = ['award', 'assurance', 'financial', 'chna', 'quote', 'letter', 'report', 'invoice', 'submission', 'policy', 'other'];

export default function Documents() {
  const { data, error, reload } = useData<Doc[]>('/documents');
  const [draft, setDraft] = useState({ title: '', doc_type: 'other', external_link: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(draft).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('file', file);
    setBusy(true);
    try { await api.post('/documents', fd); setDraft({ title: '', doc_type: 'other', external_link: '', notes: '' }); setFile(null); (document.getElementById('file-input') as HTMLInputElement).value = ''; reload(); toast('Saved'); }
    catch (ex) { toast((ex as Error).message); } finally { setBusy(false); }
  };
  const remove = async (id: number) => { if (!confirm('Delete this document?')) return; await api.del(`/documents/${id}`); reload(); };

  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <div><h1>Documents</h1><p>Audit-ready storage for the award letter, assurances, CHNA, quotes, letters of support, submitted reports, and invoices. Upload the file or link to where it lives.</p></div>
      </div>
      <form className="card" onSubmit={add}>
        <div className="form-grid">
          <Field label="Title" span2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
          <Field label="Type"><select value={draft.doc_type} onChange={(e) => setDraft({ ...draft, doc_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
          <Field label="File" help="up to 25 MB"><input id="file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Or external link" span2><input value={draft.external_link} onChange={(e) => setDraft({ ...draft, external_link: e.target.value })} placeholder="https://" /></Field>
          <Field label="Notes" span2><input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 10 }}><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Add document'}</button></div>
      </form>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>File</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={5} className="muted">No documents yet.</td></tr>}
            {data.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.title}</strong>{d.notes && <div className="small muted">{d.notes}</div>}</td>
                <td><Badge tone="gray">{label(d.doc_type)}</Badge></td>
                <td className="small">
                  {d.stored_name && <a href={`/api/documents/${d.id}/file`}>{d.original_name} ({Math.round(d.size_bytes / 1024)} KB)</a>}
                  {d.stored_name && d.external_link && <br />}
                  {d.external_link && <a href={d.external_link} target="_blank" rel="noreferrer">External link</a>}
                </td>
                <td className="small muted">{fmtDate(d.created_at.slice(0, 10))}</td>
                <td><button className="btn sm danger" onClick={() => remove(d.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
