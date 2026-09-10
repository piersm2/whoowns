export interface Hospital {
  id: number; name: string; ccn: string; ptan: string; npi: string; tin: string;
  address: string; city: string; zip: string; state: string; county: string; facility_type: string;
  licensed_beds: number; service_area_population: number;
  contact_name: string; contact_title: string; contact_email: string; contact_phone: string;
  fiscal_year_end: string; uei: string; sam_expiration: string;
  requested_amount: number; awarded_amount: number; award_date: string; project_start: string; project_end: string;
  notes: string; updated_at: string;
}
export interface StateAllocation {
  state: string; state_name: string; fy2026_award: number | null; award_verified: number;
  lead_agency: string; program_url: string; contact_email: string;
  provider_application_open: string; provider_application_due: string; notes: string; updated_at: string;
}
export interface Category { code: string; title: string; description: string; examples: string; sort_order: number }
export interface ProgramFact { id: number; section: string; label: string; value: string; source: string }
export type ChecklistStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete' | 'na';
export interface ChecklistItem {
  id: number; phase: 'application' | 'award' | 'reporting'; category: string; title: string; description: string;
  is_required: number; owner: string; due_date: string; status: ChecklistStatus; evidence_link: string; notes: string; sort_order: number;
}
export interface IntakeQuestion { key: string; section_key: string; prompt: string; help: string; input_type: string; answer: string }
export interface NarrativeSection { key: string; title: string; guidance: string; word_limit: number; content: string; status: 'empty' | 'draft' | 'review' | 'final'; updated_at: string }
export interface BudgetLine {
  id: number; category_code: string; cost_type: string; line_item: string; justification: string;
  year1: number; year2: number; year3: number; year4: number; year5: number; sort_order: number;
}
export interface BudgetSummary {
  grand: number; byYear: number[]; byCategory: Record<string, number>; byCostType: Record<string, number>;
  caps: { key: string; label: string; share: number; amount: number; limit: number; exceeded: boolean }[];
  basis: number; missingJustification: number; lines: number;
}
export interface Milestone {
  id: number; title: string; description: string; category_code: string; owner: string; due_date: string;
  status: 'planned' | 'in_progress' | 'at_risk' | 'complete'; metric: string; target_value: string; actual_value: string; notes: string;
}
export interface ReportDeadline {
  id: number; title: string; report_type: string; period_start: string; period_end: string; due_date: string;
  status: 'upcoming' | 'in_progress' | 'submitted' | 'accepted' | 'late'; submitted_at: string; submitted_by: string; evidence_link: string; notes: string;
}
export interface LedgerEntry {
  id: number; entry_date: string; direction: 'drawdown' | 'expenditure'; amount: number; category_code: string; cost_type: string;
  description: string; vendor: string; invoice_ref: string; milestone_id: number | null; doc_link: string;
}
export interface LedgerSummary { award: number; drawn: number; spent: number; cashOnHand: number; remainingAward: number; byCategory: Record<string, { budget: number; spent: number }> }
export interface Doc {
  id: number; title: string; doc_type: string; original_name: string; stored_name: string; mime_type: string; size_bytes: number;
  external_link: string; related_table: string; related_id: number | null; notes: string; created_at: string;
}
export interface Dashboard {
  hospital: Hospital;
  phases: Record<string, { total: number; complete: number; blocked: number; required_open: number }>;
  overdue: ChecklistItem[]; upcomingChecklist: ChecklistItem[];
  narrative: { total: number; drafted: number; final: number };
  budget: { total: number; lines: number };
  funds: { drawn: number; spent: number; remaining: number };
  reports: (ReportDeadline & { days: number | null })[];
  milestones: (Milestone & { days: number | null })[];
  alerts: { level: 'info' | 'warn' | 'danger'; text: string }[];
  recent: { id: number; entity: string; entity_id: string; action: string; detail: string; created_at: string }[];
}

export interface DirectoryHit {
  id: number; ccn: string; ptan: string; npi: string; name: string; address: string; city: string; state: string; zip: string; county: string;
  facility_kind: string; facility_type: string; source: string; fetched_at: string;
}
export interface DirectorySearch {
  query: string; hospitals: Hospital[]; directory: DirectoryHit[];
  remote: null | { ok: boolean; found?: number; note?: string; error?: string }; note: string;
}
