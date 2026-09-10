import { Link } from 'react-router-dom';
import { useData } from '../lib/useData';
import { fmtDate, money } from '../lib/api';
import { Badge, Progress, STATUS_TONE, Stat, label } from '../components/ui';
import type { Dashboard as DashboardData } from '../lib/types';

export default function Dashboard() {
  const { data, error } = useData<DashboardData>('/dashboard');
  if (error) return <div className="alert danger">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;
  const { hospital: h, phases, alerts } = data;
  const app = phases.application ?? { total: 0, complete: 0, blocked: 0, required_open: 0 };
  const awarded = h.awarded_amount > 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{h.name || 'Set up your hospital'}</h1>
          <p>{h.name ? `${h.facility_type} in ${h.county ? `${h.county} County, ` : ''}${h.state || 'state not set'}` : 'Start on the Profile tab, then work through Readiness, Narrative, and Budget.'}</p>
        </div>
        <div className="actions">
          {!h.name && <Link className="btn primary" to="/profile">Set up profile</Link>}
          <Link className="btn" to="/readiness">Open checklist</Link>
        </div>
      </div>

      {alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}>{a.text}</div>)}

      <div className="grid cols-4" style={{ marginTop: 12 }}>
        <Stat label="Application readiness" value={`${app.total ? Math.round((app.complete / app.total) * 100) : 0}%`} sub={`${app.complete} of ${app.total} items, ${app.required_open} required still open`} />
        <Stat label="Narrative sections" value={`${data.narrative.drafted} / ${data.narrative.total}`} sub={`${data.narrative.final} marked final`} />
        <Stat label="Budget total" value={money(data.budget.total)} sub={awarded ? `Award ${money(h.awarded_amount)}` : h.requested_amount ? `Requesting ${money(h.requested_amount)}` : `${data.budget.lines} lines`} />
        <Stat label={awarded ? 'Award remaining' : 'Funds drawn'} value={money(awarded ? data.funds.remaining : data.funds.drawn)} sub={`Spent ${money(data.funds.spent)}, drawn ${money(data.funds.drawn)}`} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-head"><h2>Phase progress</h2><Link to="/readiness" className="small">Details</Link></div>
          {(['application', 'award', 'reporting'] as const).map((p) => {
            const ph = phases[p] ?? { total: 0, complete: 0, blocked: 0, required_open: 0 };
            return (
              <div key={p} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{label(p)}</strong>
                  <span className="muted small">{ph.complete}/{ph.total}{ph.blocked ? `, ${ph.blocked} blocked` : ''}</span>
                </div>
                <Progress value={ph.complete} max={ph.total} green={ph.total > 0 && ph.complete === ph.total} />
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-head"><h2>Due soon</h2><Link to="/compliance" className="small">Calendar</Link></div>
          {data.overdue.length === 0 && data.upcomingChecklist.length === 0 && data.reports.length === 0 && data.milestones.length === 0 && <p className="muted">Nothing scheduled. Add due dates to checklist items, reports, or milestones.</p>}
          <ul className="list">
            {data.overdue.map((c) => <li key={`o${c.id}`}><span>{c.title}<div className="small muted">Checklist{c.owner ? `, ${c.owner}` : ''}</div></span><Badge tone="red">Overdue {fmtDate(c.due_date)}</Badge></li>)}
            {data.reports.map((r) => <li key={`r${r.id}`}><span>{r.title}<div className="small muted">Report</div></span><Badge tone={r.days !== null && r.days < 0 ? 'red' : r.days !== null && r.days < 14 ? 'amber' : 'gray'}>{fmtDate(r.due_date)}</Badge></li>)}
            {data.milestones.map((m) => <li key={`m${m.id}`}><span>{m.title}<div className="small muted">Milestone</div></span><Badge tone={STATUS_TONE[m.status]}>{m.due_date ? fmtDate(m.due_date) : label(m.status)}</Badge></li>)}
            {data.upcomingChecklist.map((c) => <li key={`u${c.id}`}><span>{c.title}<div className="small muted">Checklist{c.owner ? `, ${c.owner}` : ''}</div></span><Badge tone="gray">{fmtDate(c.due_date)}</Badge></li>)}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head"><h2>Recent activity</h2></div>
        {data.recent.length === 0 ? <p className="muted">No activity yet.</p> : (
          <ul className="list">
            {data.recent.map((a) => <li key={a.id}><span>{label(a.action)} {a.entity.replace(/_/g, ' ')}{a.detail ? `: ${a.detail}` : ''}</span><span className="muted small">{a.created_at}</span></li>)}
          </ul>
        )}
      </div>
    </>
  );
}
