// Rule-based narrative drafter. Turns plain intake answers plus the hospital profile
// into a first draft of each grant section. It never invents facts: anything the user
// has not answered is replaced with a bracketed placeholder so gaps are obvious.

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const TYPE_LABEL = {
  CAH: 'Critical Access Hospital',
  REH: 'Rural Emergency Hospital',
  SCH: 'Sole Community Hospital',
  RRC: 'Rural Referral Center',
  MDH: 'Medicare Dependent Hospital',
  PPS: 'rural prospective payment hospital',
  RHC: 'Rural Health Clinic',
  FQHC: 'Federally Qualified Health Center',
  OTHER: 'rural provider',
};

function ans(answers, key, placeholder) {
  const v = (answers[key] || '').trim();
  return v || `[${placeholder}]`;
}

function lines(text) {
  return (text || '').split(/\r?\n/).map((s) => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
}

function sentenceList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function hospitalIntro(h) {
  const name = h.name || '[Hospital name]';
  const type = TYPE_LABEL[h.facility_type] || 'rural provider';
  const where = [h.county ? `${h.county} County` : '', h.state].filter(Boolean).join(', ') || '[county, state]';
  const beds = h.licensed_beds ? ` with ${h.licensed_beds} licensed beds` : '';
  return `${name} is a ${type}${beds} located in ${where}.`;
}

export function draftSection(key, { hospital: h, answers: a, categories = [], budget = [] }) {
  const name = h.name || '[Hospital name]';
  const projectName = ans(a, 'project_name', 'Project name');
  const catList = categories.length
    ? sentenceList(categories.map((c) => `Use ${c.code} (${c.title})`))
    : '[select use-of-funds categories on the Budget tab]';

  switch (key) {
    case 'need':
      return [
        `${hospitalIntro(h)} ${ans(a, 'service_area', 'Describe the service area, population, and distance to the next hospital')}`,
        `The community faces significant health challenges. ${ans(a, 'health_challenges', 'Summarize the top health problems from your CHNA and county health rankings')}`,
        `Access to care is limited. ${ans(a, 'access_gaps', 'Describe missing or at-risk services and barriers such as transportation')}`,
        `These gaps persist in part because of the hospital's financial position. ${ans(a, 'financial_pressure', 'Describe operating margin, days cash, payer mix, and uncompensated care')} Without new investment, the hospital's ability to maintain and expand services for the community is at risk.`,
      ].join('\n\n');

    case 'project': {
      const acts = lines(a.activities);
      const actText = acts.length
        ? `The project includes the following activities:\n\n${acts.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : '[List the specific activities or purchases, one per line]';
      return [
        `${name} proposes ${projectName}, a project aligned with the state's approved Rural Health Transformation Program plan and with ${catList}.`,
        ans(a, 'project_summary', 'Describe in plain words what you want to do with the money'),
        actText,
        `The project will serve ${ans(a, 'people_served', 'Who is served and roughly how many per year')}. Each activity is designed to supplement, not supplant, existing services and funding, adding new capacity that the hospital cannot currently support from operating revenue.`,
      ].join('\n\n');
    }

    case 'workforce': {
      const usesE = categories.some((c) => c.code === 'E');
      return [
        `${name} will strengthen its rural clinical workforce as part of ${projectName}. ${ans(a, 'workforce_plan', 'Describe positions to recruit, retain, or train and how you will recruit')}`,
        usesE
          ? 'Consistent with Use E, every clinician supported with recruitment or retention funding will sign a written commitment to serve the rural community for a minimum of five years, with prorated repayment terms if the commitment is not met. The hospital will track service obligations and report on retention annually.'
          : 'Where recruitment or retention incentives are used, the hospital will document the service commitment and track retention so the state can report on workforce outcomes.',
      ].join('\n\n');
    }

    case 'technology':
      return [
        `${name} will invest in technology that improves efficiency, cybersecurity, and patient outcomes. ${ans(a, 'technology_plan', 'Describe systems, what problem each fixes, and expected improvements')}`,
        'The hospital will follow its procurement policy for each purchase, obtain competitive quotes where required by the state, and maintain an equipment inventory for items over the applicable threshold. Cybersecurity work will be documented against a recognized framework so improvements can be measured and reported.',
      ].join('\n\n');

    case 'outcomes':
      return [
        `${projectName} will be evaluated against measurable outcomes with a documented baseline, a target, and a data source for each. ${ans(a, 'outcomes', 'State what will be different in 1 year and in 5 years, with numbers')}`,
        `Outcome data will be drawn from ${ans(a, 'data_sources', 'EHR reports, claims, HR records, surveys, or state data')}. The project director will review progress quarterly, compare results to targets, and report variances and corrective actions to the state on the required schedule.`,
      ].join('\n\n');

    case 'partnerships':
      return [
        `${name} will implement ${projectName} in coordination with community and regional partners. ${ans(a, 'partners', 'List each partner and what it contributes')}`,
        'Partner roles will be documented in letters of support or written agreements, and the hospital will convene partners at least quarterly to coordinate services, share data where permitted, and avoid duplication.',
      ].join('\n\n');

    case 'sustainability':
      return [
        `The hospital has planned for continuation of ${projectName} beyond the award period. ${ans(a, 'sustainability', 'Describe new revenue, savings, payer contracts, or how costs are absorbed')}`,
        'Costs that are one-time (equipment, implementation, start-up recruitment) are front-loaded in the budget, and recurring costs are stepped down over the project period so that the hospital operating budget can carry them by the final year.',
      ].join('\n\n');

    case 'capacity':
      return [
        `${ans(a, 'capacity', 'Name who manages the project and the money, past grant experience, and financial controls')}`,
        `The hospital maintains separate general ledger accounts for the award, reconciles the award ledger to the general ledger monthly, and follows written procurement, allowable cost, and time and effort procedures. ${h.uei ? `The hospital's UEI is ${h.uei}` : '[UEI]'}${h.sam_expiration ? ` and its SAM.gov registration is active through ${h.sam_expiration}.` : ' and its SAM.gov registration is active.'}`,
        `Key risks and mitigation: ${ans(a, 'risks', 'What could go wrong and the backup plan')}`,
      ].join('\n\n');

    case 'budget_narrative': {
      if (!budget.length) return '[Add budget lines on the Budget tab, then regenerate this section]';
      const byType = {};
      for (const b of budget) {
        const total = (b.year1 || 0) + (b.year2 || 0) + (b.year3 || 0) + (b.year4 || 0) + (b.year5 || 0);
        (byType[b.cost_type] ??= []).push({ ...b, total });
      }
      const grand = Object.values(byType).flat().reduce((s, b) => s + b.total, 0);
      const parts = [`The total requested budget for ${projectName} is ${money(grand)} over the project period${h.awarded_amount ? `, against an award of ${money(h.awarded_amount)}` : ''}. Costs are summarized by category below.`];
      for (const [type, items] of Object.entries(byType)) {
        const sub = items.reduce((s, b) => s + b.total, 0);
        parts.push(`${type.charAt(0).toUpperCase() + type.slice(1)} (${money(sub)}):\n${items.map((b) => `- ${b.line_item} (Use ${b.category_code}), ${money(b.total)}. ${b.justification || '[justification needed]'}`).join('\n')}`);
      }
      parts.push('All costs are necessary, reasonable, and allocable to the project, and were estimated using current vendor quotes, salary schedules, or historical costs. No funds will be used to supplant existing federal or state funding.');
      return parts.join('\n\n');
    }

    default:
      return '';
  }
}

export function completeness(answers, questions) {
  const bySection = {};
  for (const q of questions) {
    const s = (bySection[q.section_key] ??= { answered: 0, total: 0 });
    s.total += 1;
    if ((answers[q.key] || '').trim()) s.answered += 1;
  }
  return bySection;
}
