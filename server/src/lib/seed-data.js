// Reference content seeded on first run. Statutory items come from Section 71401 of
// P.L. 119-21 (adds Section 2118 to the Social Security Act). Items marked verify: true
// are reported program guardrails that should be checked against the CMS NOFO and your
// state's cooperative agreement before you rely on them.

export const USE_OF_FUNDS = [
  ['A', 'Prevention and chronic disease management', 'Promoting evidence-based, measurable interventions to improve prevention and chronic disease management.', 'Diabetes and hypertension programs, remote patient monitoring, community health worker outreach, screening campaigns.'],
  ['B', 'Provider payments', 'Providing payments to health care providers for the provision of health care items or services, as specified by the CMS Administrator.', 'Stabilization payments tied to service delivery. Reported cap: no more than 20 percent of a state award (verify with NOFO).'],
  ['C', 'Consumer-facing technology', 'Promoting consumer-facing, technology-driven solutions for the prevention and management of chronic diseases.', 'Patient portals, mobile health apps, digital care navigation, remote monitoring devices for patients.'],
  ['D', 'Training and technical assistance', 'Providing training and technical assistance for the development and adoption of technology-enabled solutions that improve care delivery in rural hospitals.', 'Telehealth training, EHR optimization support, data analytics capability building.'],
  ['E', 'Workforce recruitment and retention', 'Recruiting and retaining clinical workforce talent to rural areas, with commitments to serve rural communities for a minimum of 5 years.', 'Loan repayment, sign-on and retention bonuses, residency and rotation partnerships, housing support tied to 5-year service commitments.'],
  ['F', 'Health IT and cybersecurity', 'Providing technical assistance, software, and hardware for significant information technology advances designed to improve efficiency, enhance cybersecurity capability development, and improve patient health outcomes.', 'EHR upgrades, interoperability, cybersecurity assessments and controls, network hardware.'],
  ['G', 'Right-sizing service lines', 'Assisting rural communities to right-size their health care delivery systems by identifying needed preventative, ambulatory, pre-hospital, emergency, acute inpatient care, outpatient care, and post-acute care service lines.', 'Service line assessments, conversion planning (for example Rural Emergency Hospital), regional care coordination.'],
  ['H', 'Behavioral health and substance use', 'Supporting access to opioid use disorder treatment services, other substance use disorder treatment services, and mental health services.', 'MAT programs, tele-behavioral health, crisis stabilization, integrated behavioral health in primary care.'],
  ['I', 'Innovative care and payment models', 'Developing projects that support innovative models of care that include value-based care arrangements and alternative payment models, as appropriate.', 'Global budget pilots, ACO participation, care management infrastructure.'],
  ['J', 'Other sustainable access activities', 'Additional uses designed to promote sustainable access to high quality rural health care services, as determined by the CMS Administrator.', 'Capital and facility improvements (reported cap on capital expenditures, verify with NOFO), EMS partnerships, transportation.'],
];

export const PROGRAM_FACTS = [
  ['Program basics', 'Authority', 'Section 71401 of P.L. 119-21 (One Big Beautiful Bill Act, signed July 4, 2025), adding Section 2118 to the Social Security Act.', 'Statute'],
  ['Program basics', 'Total funding', '$50 billion over five federal fiscal years, $10 billion per year, FY2026 through FY2030.', 'Statute'],
  ['Program basics', 'Administered by', 'Centers for Medicare and Medicaid Services (CMS). Only states could apply; providers receive funds through their state.', 'Statute, CMS NOFO'],
  ['Program basics', 'Allocation formula', 'Half of each year is split equally among approved states. The other half is scored on rural population, rural facility share, and the state plan (policy and technical scoring).', 'Statute, CMS NOFO'],
  ['Program basics', 'First-year awards', 'All 50 states were approved on December 29, 2025. First-year awards ranged from about $147 million (New Jersey) to about $281 million (Texas), averaging about $200 million per state.', 'CMS announcement, AHA, KFF'],
  ['Key dates', 'State application deadline', 'November 5, 2025 (one-time state application).', 'CMS NOFO'],
  ['Key dates', 'Awards announced', 'December 29, 2025.', 'CMS'],
  ['Key dates', 'State spending plans due', 'January 30, 2026, with CMS approval expected by late February 2026 before funds could transfer.', 'CMS, MultiState'],
  ['Key dates', 'First funds released', 'The first $10 billion was released to states in summer 2026 for distribution to providers.', 'HFMA'],
  ['Key dates', 'Program end', 'Funds are available through FY2030. Unobligated funds may be redistributed or returned; check your state agreement for deadlines.', 'Statute'],
  ['Guardrails', 'Minimum uses', 'Each state must use funds for at least three of the ten approved uses (A through J).', 'Statute'],
  ['Guardrails', 'Administrative cap', 'No more than 10 percent of a state award may go to administrative expenses. States may pass a share of that cap on to providers; ask your state.', 'Statute'],
  ['Guardrails', 'Provider payment cap (verify)', 'Reported cap of 20 percent of a state award on direct provider payments (use B). Verify against the NOFO.', 'CMS NOFO (reported)'],
  ['Guardrails', 'Capital expenditure cap (verify)', 'Reported cap of 20 percent of a state award on capital expenditures and construction. Verify against the NOFO.', 'CMS NOFO (reported)'],
  ['Guardrails', 'Supplement, not supplant', 'Funds are generally expected to supplement existing federal and state funding rather than replace it. Document how each project adds new capacity.', 'CMS NOFO'],
  ['For hospitals', 'How hospitals get money', 'Hospitals do not apply to CMS. Each state runs its own sub-award or contracting process under its approved plan. Watch your state lead agency and hospital association.', 'HFMA'],
  ['For hospitals', 'What small hospitals struggle with', 'Independent rural hospitals without grant writers reported the state paperwork was more complicated than expected and technical support was thinner than hoped. Associations are adding admin help for year two.', 'HFMA'],
  ['For hospitals', 'Typical state asks', 'Facility profile, community need statement, project description tied to use categories, budget with justification, measurable outcomes, sustainability plan, signed assurances, UEI and SAM registration.', 'Common state sub-award requirements'],
];

export const STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
];

// Only figures confirmed in public reporting are pre-filled. Everything else is left
// blank for the user to enter from the CMS award letter or their state agency.
export const KNOWN_AWARDS = {
  TX: 281_000_000,
  NJ: 147_000_000,
};

export const CHECKLIST = [
  // phase, category, title, description, required
  ['application', 'Registration', 'Confirm UEI and active SAM.gov registration', 'Most states require an active SAM.gov registration and UEI for any sub-award. Renewals take weeks, so check the expiration date now.', 1],
  ['application', 'Registration', 'Register in the state grant portal', 'Create the organizational account in your state lead agency portal and confirm who holds the login.', 1],
  ['application', 'Registration', 'Identify state lead agency and program contact', 'Record the agency, program manager, email, and any office hours or TA sessions the state offers.', 1],
  ['application', 'Governance', 'Board resolution or CEO authorization to apply', 'Some states ask for a signed authorization. Get it on the next board agenda even if not required yet.', 0],
  ['application', 'Governance', 'Designate project director and financial contact', 'Name one accountable owner for the application and one for money. Small teams can be the same person, but write it down.', 1],
  ['application', 'Facility profile', 'Facility profile completed', 'Name, CCN, facility type (CAH, REH, SCH, PPS), beds, county, service area, rural designation source.', 1],
  ['application', 'Facility profile', 'Rural eligibility documentation', 'Evidence of rural status (FORHP eligible ZIP, CAH status, RUCA, or state definition).', 1],
  ['application', 'Facility profile', 'Most recent audited financial statements', 'States often ask for the last one or two years of audited financials to assess capacity and need.', 1],
  ['application', 'Facility profile', 'Most recent Medicare cost report (summary)', 'Have the worksheet S and G summaries ready for the financial need section.', 0],
  ['application', 'Need', 'Community need statement drafted', 'Use the Narrative tab. Pull from your CHNA, county health rankings, and internal volume and payer data.', 1],
  ['application', 'Need', 'Community Health Needs Assessment on file', 'Attach or cite your most recent CHNA. States score alignment between the CHNA and the proposed project.', 1],
  ['application', 'Project', 'Select use-of-funds categories', 'Pick the statutory categories (A through J) the project maps to. States usually require the project to match their approved plan.', 1],
  ['application', 'Project', 'Project description drafted', 'Use the Narrative tab. Describe the activities, who is served, and how it fits the state plan.', 1],
  ['application', 'Project', 'Measurable outcomes and metrics defined', 'Each activity needs a baseline, a target, and a data source you can actually report on.', 1],
  ['application', 'Project', 'Work plan with timeline', 'Quarter-by-quarter milestones for the award period. Copy these into the Compliance tab once awarded.', 1],
  ['application', 'Budget', 'Budget worksheet completed', 'Use the Budget tab. Every line needs a justification and a use category.', 1],
  ['application', 'Budget', 'Budget within state caps', 'Check administrative, provider payment, and capital caps your state passes down. Record the state limits in the Program tab.', 1],
  ['application', 'Budget', 'Vendor quotes for equipment and IT', 'States commonly require quotes for equipment over a threshold. Get two where you can.', 0],
  ['application', 'Partners', 'Letters of support or partnership agreements', 'From EMS, FQHCs, public health, behavioral health providers, or a regional system you will coordinate with.', 0],
  ['application', 'Partners', 'Workforce commitment documentation', 'If using category E, draft the 5-year service commitment language and the repayment terms for recruits.', 0],
  ['application', 'Assurances', 'Signed assurances and certifications', 'Federal and state assurances (non-discrimination, lobbying, debarment, supplement not supplant).', 1],
  ['application', 'Assurances', 'Conflict of interest and indirect cost documentation', 'Provide your negotiated indirect rate or elect the de minimis rate. Include the conflict of interest policy if requested.', 0],
  ['application', 'Submission', 'Internal review of the full packet', 'Have someone who did not write it read the full packet against the state checklist.', 1],
  ['application', 'Submission', 'Submit in the state portal and save confirmation', 'Save the confirmation number and a PDF of what was submitted in the Documents area.', 1],

  ['award', 'Award setup', 'Award letter and sub-award agreement received', 'Store the executed agreement. Record award amount, period, and reporting schedule in the Profile tab.', 1],
  ['award', 'Award setup', 'Reporting schedule entered in the Compliance tab', 'Enter every progress, financial, and performance report due date the agreement lists.', 1],
  ['award', 'Award setup', 'Separate GL accounts or cost center created', 'Track RHTP revenue and expense separately so drawdowns reconcile cleanly.', 1],
  ['award', 'Award setup', 'Written procurement and allowable cost procedures', 'Confirm your procurement policy meets 2 CFR 200 thresholds if the state applies them.', 1],
  ['award', 'Award setup', 'Milestones loaded from the work plan', 'Move the work plan milestones into the Compliance tab with owners and target dates.', 1],
  ['award', 'Award setup', 'Drawdown method and cash management confirmed', 'Reimbursement vs advance, how often you can request, and what backup is required.', 1],

  ['reporting', 'Ongoing', 'Monthly reconciliation of RHTP ledger to GL', 'Reconcile the Fund ledger to your general ledger monthly and keep the reconciliation.', 1],
  ['reporting', 'Ongoing', 'Metric data collection running', 'Confirm each outcome metric has a report or query that produces the number on schedule.', 1],
  ['reporting', 'Ongoing', 'Equipment inventory tagged and listed', 'Federal funds usually require an inventory of equipment over a threshold with location and condition.', 0],
  ['reporting', 'Ongoing', 'Time and effort documentation for funded staff', 'Personnel charged to the award need documented effort supporting the allocation.', 1],
  ['reporting', 'Closeout', 'Single audit threshold check', 'If total federal expenditures exceed the single audit threshold in a fiscal year, plan for the audit.', 1],
  ['reporting', 'Closeout', 'Closeout report and final financial reconciliation', 'Final performance and financial reports, equipment disposition, and record retention plan.', 1],
];

export const INTAKE_QUESTIONS = [
  // key, section, prompt, help, type
  ['service_area', 'need', 'Describe the community and service area you serve.', 'Counties or ZIPs, population, distance to the next hospital, notable demographics (age, poverty, uninsured, Medicaid share).', 'textarea'],
  ['health_challenges', 'need', 'What are the biggest health problems in your service area?', 'Use your CHNA and county health rankings. Chronic disease rates, behavioral health, substance use, maternal care, EMS response times.', 'textarea'],
  ['access_gaps', 'need', 'What services are missing, at risk, or hard to reach?', 'Service lines closed or reduced, specialties with no local access, wait times, transportation barriers.', 'textarea'],
  ['financial_pressure', 'need', 'What financial pressures is the hospital facing?', 'Operating margin, days cash on hand, payer mix, uncompensated care, recent losses. This supports the need case.', 'textarea'],
  ['project_name', 'project', 'Give the project a short name.', 'Example: Rural Chronic Care and Telehealth Expansion.', 'text'],
  ['project_summary', 'project', 'In plain words, what do you want to do with the money?', 'One or two paragraphs. Do not worry about grant language, the drafter will shape it.', 'textarea'],
  ['activities', 'project', 'List the specific activities or purchases.', 'One per line. Example: Hire two care managers. Buy 150 remote monitoring kits. Upgrade EHR to support telehealth.', 'textarea'],
  ['people_served', 'project', 'Who is served and roughly how many people per year?', 'Patients, residents, or providers. Give a number even if it is an estimate.', 'textarea'],
  ['workforce_plan', 'workforce', 'What workforce positions will you recruit, retain, or train?', 'Roles, counts, how you will recruit, and how you will secure a 5-year rural commitment if using category E.', 'textarea'],
  ['technology_plan', 'technology', 'What technology or cybersecurity improvements are included?', 'Systems, vendors if known, what problem each fixes, and how it improves efficiency or outcomes.', 'textarea'],
  ['outcomes', 'outcomes', 'What will be different in 1 year and in 5 years? Give numbers.', 'Example: Reduce ED visits for CHF patients by 20 percent. Recruit 3 providers. Cut 30-day readmissions from 14 to 11 percent.', 'textarea'],
  ['data_sources', 'outcomes', 'Where will the outcome numbers come from?', 'EHR reports, claims, patient surveys, HR records, state data.', 'textarea'],
  ['partners', 'partnerships', 'Who are your partners and what does each one do?', 'EMS, FQHCs, public health, behavioral health, schools, a regional system, the state office of rural health.', 'textarea'],
  ['sustainability', 'sustainability', 'How does this continue after the grant money ends?', 'New revenue, cost savings, payer contracts, ongoing partner support, absorbed into operations.', 'textarea'],
  ['capacity', 'capacity', 'Who will manage the project and the money?', 'Names and roles. Past grant experience. Financial controls and audit history.', 'textarea'],
  ['risks', 'capacity', 'What could go wrong and what is the backup plan?', 'Recruiting delays, vendor timelines, construction, staff turnover.', 'textarea'],
];

export const NARRATIVE_SECTIONS = [
  ['need', 'Statement of Need', 'Describe the community, the health problems, the access gaps, and the financial pressure. Tie every claim to a source (CHNA, county health rankings, your own data).', 750],
  ['project', 'Project Description', 'What you will do, for whom, and which use-of-funds categories it maps to. Be concrete about activities and counts.', 1000],
  ['workforce', 'Workforce Plan', 'Recruitment, retention, training, and the 5-year rural service commitment if category E applies.', 500],
  ['technology', 'Technology and Cybersecurity', 'Systems, what problem each solves, and how efficiency, cybersecurity, or outcomes improve.', 500],
  ['outcomes', 'Outcomes and Evaluation', 'Baseline, targets, timeline, and data sources for each metric.', 600],
  ['partnerships', 'Partnerships and Coordination', 'Who you work with and what each partner contributes.', 400],
  ['sustainability', 'Sustainability Plan', 'How the work continues after the award period.', 400],
  ['capacity', 'Organizational Capacity and Risk', 'Who runs it, financial controls, past performance, and risk mitigation.', 500],
  ['budget_narrative', 'Budget Justification', 'Generated from the Budget tab. Explains each cost category and why it is reasonable and necessary.', 800],
];

export const DEFAULT_REPORTS = [
  ['Quarterly progress report, Q1', 'progress', 90],
  ['Quarterly financial report, Q1', 'financial', 90],
  ['Quarterly progress report, Q2', 'progress', 180],
  ['Quarterly financial report, Q2', 'financial', 180],
  ['Quarterly progress report, Q3', 'progress', 270],
  ['Quarterly financial report, Q3', 'financial', 270],
  ['Annual performance report, Year 1', 'performance', 365],
  ['Annual financial report, Year 1', 'financial', 365],
];

// Checklist and narrative sections are created per hospital so each one tracks its own work.
export function seedHospitalDefaults(db, hospitalId) {
  const hasChecklist = db.prepare('SELECT COUNT(*) AS n FROM checklist_item WHERE hospital_id = ?').get(hospitalId).n;
  if (!hasChecklist) {
    const ins = db.prepare('INSERT INTO checklist_item (hospital_id, phase, category, title, description, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    CHECKLIST.forEach(([phase, cat, title, desc, req], i) => ins.run(hospitalId, phase, cat, title, desc, req, i));
  }
  const insSec = db.prepare('INSERT OR IGNORE INTO narrative_section (hospital_id, key, title, guidance, word_limit, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  NARRATIVE_SECTIONS.forEach(([key, title, guidance, limit], i) => insSec.run(hospitalId, key, title, guidance, limit, i));
}

export function createHospital(db, fields = {}) {
  const keys = Object.keys(fields);
  const info = keys.length
    ? db.prepare(`INSERT INTO hospital (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...keys.map((k) => fields[k]))
    : db.prepare('INSERT INTO hospital DEFAULT VALUES').run();
  seedHospitalDefaults(db, info.lastInsertRowid);
  return db.prepare('SELECT * FROM hospital WHERE id = ?').get(info.lastInsertRowid);
}

export function seed(db) {
  const hasHospital = db.prepare('SELECT COUNT(*) AS n FROM hospital').get().n;
  if (!hasHospital) db.prepare('INSERT INTO hospital (id) VALUES (1)').run();

  const insCat = db.prepare('INSERT OR IGNORE INTO use_of_funds_category (code, title, description, examples, sort_order) VALUES (?, ?, ?, ?, ?)');
  USE_OF_FUNDS.forEach(([code, title, desc, ex], i) => insCat.run(code, title, desc, ex, i));

  const factCount = db.prepare('SELECT COUNT(*) AS n FROM program_fact').get().n;
  if (!factCount) {
    const insFact = db.prepare('INSERT INTO program_fact (section, label, value, source, sort_order) VALUES (?, ?, ?, ?, ?)');
    PROGRAM_FACTS.forEach(([s, l, v, src], i) => insFact.run(s, l, v, src, i));
  }

  const insState = db.prepare('INSERT OR IGNORE INTO state_allocation (state, state_name, fy2026_award, award_verified) VALUES (?, ?, ?, ?)');
  STATES.forEach(([abbr, name]) => insState.run(abbr, name, KNOWN_AWARDS[abbr] ?? null, KNOWN_AWARDS[abbr] ? 1 : 0));

  const insQ = db.prepare('INSERT OR IGNORE INTO intake_question (key, section_key, prompt, help, input_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  INTAKE_QUESTIONS.forEach(([key, sec, prompt, help, type], i) => insQ.run(key, sec, prompt, help, type, i));

  for (const { id } of db.prepare('SELECT id FROM hospital').all()) seedHospitalDefaults(db, id);
}
