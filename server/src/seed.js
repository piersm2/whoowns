// Loads a sample hospital so the app has something to look at. Safe to run repeatedly.
import { openDatabase } from './lib/db.js';

const db = openDatabase();
db.prepare(`UPDATE hospital SET name = ?, ccn = ?, state = ?, county = ?, facility_type = ?, licensed_beds = ?, service_area_population = ?,
  contact_name = ?, contact_title = ?, contact_email = ?, uei = ?, sam_expiration = ?, requested_amount = ?, notes = ? WHERE id = 1`)
  .run('Sample Valley Community Hospital', '123456', 'AL', 'Sample', 'CAH', 25, 18500,
    'Jane Doe', 'CFO', 'cfo@example.org', 'ABC123DEF456', '2027-03-15', 2400000, 'Sample data. Replace with your hospital on the Profile tab.');
const answers = {
  service_area: 'We serve Sample County and the northern half of Neighbor County, about 18,500 residents. The next hospital is 47 miles away. Median age is 46 and 22 percent of residents live below the poverty line. Medicaid and self pay make up 38 percent of our volume.',
  health_challenges: 'Our 2024 CHNA ranks diabetes, heart failure, and substance use as the top three. The county diabetes rate is 15.8 percent against a state rate of 12.9. There is no psychiatrist within 60 miles.',
  access_gaps: 'We closed OB in 2022. There is no local cardiology or endocrinology. Average ED wait for a behavioral health bed is 31 hours. One EMS unit covers the whole county.',
  financial_pressure: 'Operating margin was negative 4.1 percent in FY2025. Days cash on hand is 38. Uncompensated care rose 19 percent year over year.',
  project_name: 'Sample Valley Chronic Care and Tele-Behavioral Health Initiative',
  project_summary: 'We want to hire two RN care managers to run a chronic care program for diabetes and heart failure patients, start tele-psychiatry in the ED and clinic, and upgrade our EHR so both can be documented and measured.',
  activities: 'Hire two RN care managers\nDeploy 150 remote patient monitoring kits\nContract for tele-psychiatry coverage 7 days a week\nUpgrade EHR telehealth and remote monitoring modules\nCybersecurity assessment and remediation',
  people_served: 'About 600 chronic disease patients per year in the care program and roughly 400 behavioral health encounters per year through tele-psychiatry.',
};
const up = db.prepare("INSERT INTO intake_answer (key, answer) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET answer = excluded.answer, updated_at = datetime('now')");
for (const [k, v] of Object.entries(answers)) up.run(k, v);
if (!db.prepare('SELECT COUNT(*) AS n FROM budget_line').get().n) {
  const ins = db.prepare('INSERT INTO budget_line (category_code, cost_type, line_item, justification, year1, year2, year3, year4, year5, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('A', 'personnel', 'RN care managers (2.0 FTE)', 'Two RN care managers at $82,000 each plus 3 percent annual increase run the chronic care program.', 164000, 168920, 174000, 179000, 184000, 1);
  ins.run('A', 'fringe', 'Fringe on care managers at 28 percent', 'Hospital standard fringe rate.', 45920, 47298, 48720, 50120, 51520, 2);
  ins.run('C', 'equipment', 'Remote patient monitoring kits (150)', 'Vendor quote $1,100 per kit including 1 year of connectivity.', 165000, 0, 0, 0, 0, 3);
  ins.run('H', 'contractual', 'Tele-psychiatry coverage contract', 'Quoted at $18,000 per month for 7-day coverage.', 216000, 216000, 216000, 216000, 216000, 4);
  ins.run('F', 'contractual', 'EHR telehealth and RPM module upgrade', 'Vendor statement of work.', 140000, 24000, 24000, 24000, 24000, 5);
  ins.run('F', 'contractual', 'Cybersecurity assessment and remediation', 'Third party assessment plus MFA and endpoint protection rollout.', 95000, 20000, 20000, 20000, 20000, 6);
}
console.log('Sample data loaded.');
