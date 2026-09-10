import type { ReactNode } from 'react';

export function Badge({ tone, children }: { tone: 'gray' | 'blue' | 'green' | 'amber' | 'red'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  not_started: 'gray', in_progress: 'blue', blocked: 'red', complete: 'green', na: 'gray',
  planned: 'gray', at_risk: 'amber', upcoming: 'gray', submitted: 'blue', accepted: 'green', late: 'red',
  empty: 'gray', draft: 'blue', review: 'amber', final: 'green',
};

export const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function Progress({ value, max, green }: { value: number; max: number; green?: boolean }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`progress${green ? ' green' : ''}`} title={`${pct}%`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label: l, help, children, span2 }: { label: string; help?: string; children: ReactNode; span2?: boolean }) {
  return (
    <label className={`field${span2 ? ' span-2' : ''}`}>
      <span>{l}{help && <span className="help"> {help}</span>}</span>
      {children}
    </label>
  );
}

export function Stat({ label: l, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card stat">
      <div className="label">{l}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const COST_TYPES = ['personnel', 'fringe', 'equipment', 'supplies', 'contractual', 'construction', 'travel', 'training', 'indirect', 'other'];
export const FACILITY_TYPES: [string, string][] = [
  ['CAH', 'Critical Access Hospital'], ['REH', 'Rural Emergency Hospital'], ['SCH', 'Sole Community Hospital'], ['RRC', 'Rural Referral Center'],
  ['MDH', 'Medicare Dependent Hospital'], ['PPS', 'Rural PPS hospital'], ['RHC', 'Rural Health Clinic'], ['FQHC', 'FQHC'], ['OTHER', 'Other rural provider'],
];
