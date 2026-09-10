# RHTP Navigator

A working tool for a small rural hospital going after Rural Health Transformation Program (RHTP) money through its state. Built for the CFO or office manager who has no grant writer and is doing the paperwork between everything else.

Background: CMS released the first $10 billion of the $50 billion program to states in 2026, and independent rural hospitals reported the state paperwork was more than they expected with less technical help than they hoped for. This app is the missing admin help.

## What it does

| Tab | Purpose |
| --- | --- |
| Dashboard | Readiness percent, narrative progress, budget vs award, funds drawn and spent, overdue items, alerts (SAM expiring, budget over award, late reports) |
| Readiness | 36 pre-loaded checklist items across application, award setup, and reporting phases. Owner, due date, status, evidence link. Add your state's own items. |
| Narrative | 16 plain language intake questions. The drafter turns answers into first drafts of 9 grant sections and brackets every gap. Export the packet as Markdown. |
| Budget | Five year budget by use-of-funds category (A to J) and cost type, with totals, justification checks, and warnings against the reported 10 percent admin, 20 percent capital, and 20 percent provider payment caps. CSV export. |
| Compliance | Reporting calendar (auto-generate a default year one schedule), work plan milestones with metrics, and a fund ledger that reconciles drawdowns against expenditures and budget by category. |
| Documents | Upload files or link to them. Award letter, assurances, CHNA, quotes, invoices, submitted reports. |
| Program | Statute and program facts, the ten use-of-funds categories, and an editable record for your state (award, lead agency, portal, provider deadlines, caps the state passes down). |
| Profile | Facility, PTAN, NPI, TIN, CCN, address, contact, UEI and SAM, request and award amounts, project dates. |
| Hospitals | Track more than one hospital. Filter the list by PTAN, NPI, TIN, CCN, or name, open one to switch every tab to it, and look a hospital up in CMS (NPPES by NPI, Care Compare by CCN) to prefill a new record. |

## Run it in GitHub Codespaces (no install)

1. Open the repository on GitHub and switch to this branch.
2. Click the green **Code** button, then the **Codespaces** tab, then **Create codespace on this branch**.
3. Wait two or three minutes. The container installs dependencies, loads sample data, builds the client, and starts the server.
4. A browser tab opens on port 3001 with the app. If it does not, open the **Ports** panel in the Codespace and click the globe icon next to port 3001.

Data lives in a SQLite file inside the Codespace. It persists as long as the Codespace exists (Codespaces are deleted after 30 days of no use by default).

## Run it on your own machine

Requires Node 20 or newer.

```bash
npm install
npm run seed        # optional, loads a sample hospital
npm run dev         # API on :3001, client on :5173 with hot reload
```

Open http://localhost:5173.

For a single production process that serves the built client:

```bash
npm run build
npm start           # http://localhost:3001
```

## Host it (Render, Railway, Fly, any Docker host)

A Dockerfile is included. The database and uploads live under `/data`, so mount a persistent volume there.

```bash
docker build -t rhtp-navigator .
docker run -p 3001:3001 -v rhtp-data:/data rhtp-navigator
```

## Tests

```bash
npm test
```

Runs the API test suite against an in-memory database.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | 3001 | API and static client port |
| `RHTP_DB_PATH` | `server/data/rhtp.db` | SQLite file location |

## Finding hospitals by PTAN, NPI, or TIN

The sidebar search and the Hospitals page filter saved hospitals by any identifier or name. Digits match with or without dashes, so `81-1234567` and `811234567` both find the same TIN.

The Hospitals page can also search CMS to prefill a new record:

- **NPI** (10 digits) queries the NPPES NPI Registry.
- **CCN** (6 characters) queries the Care Compare hospital dataset on data.cms.gov. For hospitals the PTAN is normally the same number as the CCN, so a PTAN search runs as a CCN search.
- **Name** (3 or more letters) searches Care Compare by facility name.

CMS does not publish TINs or PTANs, so those only match hospitals you have saved. Results are cached in the local database. Set `RHTP_HOSPITAL_DATASET` if CMS changes the Care Compare dataset id (default `xubh-q36u`). The single file version has no network access and takes identifiers by hand.

## Data caveats

Reference content is a starting point, not legal or grant advice.

- Statutory items (use categories A to J, $50 billion over five years, at least three uses, 10 percent admin cap) come from Section 71401 of P.L. 119-21.
- The 20 percent provider payment and 20 percent capital caps are reported from the CMS NOFO and are flagged "verify" in the app. Your state may pass down tighter limits.
- Only the Texas (about $281M) and New Jersey (about $147M) first year awards are pre-filled. Enter the rest from the CMS award announcement.
- Default reporting dates are placeholders. Replace them with the dates in your state agreement.

## Stack

Express and better-sqlite3 on the back end, React and Vite on the front end, npm workspaces, node:test for the API suite. No auth. It is a single hospital tool meant to run on one machine or one private Codespace. Put it behind your own login before exposing it to the internet.

## Shareable single file version

`standalone/rhtp-navigator.html` is the same tool in one HTML file with no server. Data is saved in the browser that opens it, with JSON export and import for backups. It is published as a hosted page for sharing by link; open the file directly in a browser to run it locally. It stores document links rather than uploaded files.
