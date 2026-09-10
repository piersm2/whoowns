// Looks hospitals up in public CMS sources and caches what it finds.
//
//  - NPI: the NPPES NPI Registry API (npiregistry.cms.hhs.gov). Public, no key.
//  - CCN: the Care Compare "Hospital General Information" dataset on data.cms.gov
//    (provider-data datastore, dataset xubh-q36u). Public, no key.
//
// Neither source publishes TINs, and PTANs are not published either. For hospitals the
// PTAN is normally the same six digit number as the CCN, so a PTAN lookup is run as a
// CCN lookup. TIN matches only against hospitals already saved in this app.
//
// Field names in the CMS datastore have shifted between releases, so values are read
// through a tolerant picker. Set RHTP_HOSPITAL_DATASET to override the dataset id.

const NPPES = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
const DATASET = process.env.RHTP_HOSPITAL_DATASET || 'xubh-q36u';
const PROVIDER_DATA = `https://data.cms.gov/provider-data/api/1/datastore/query/${DATASET}/0`;
const TIMEOUT_MS = 8000;

export const looksLikeNpi = (q) => /^\d{10}$/.test(q);
export const looksLikeCcn = (q) => /^[0-9A-Z]{6}$/i.test(q);

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const pick = (row, ...names) => {
  for (const n of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === n.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (key && row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
  }
  return '';
};

function normalizeCareCompare(row) {
  return {
    ccn: pick(row, 'facility_id', 'provider_id', 'ccn'),
    npi: '',
    name: pick(row, 'facility_name', 'hospital_name', 'name'),
    address: pick(row, 'address', 'address_line_1'),
    city: pick(row, 'city_town', 'city'),
    state: pick(row, 'state'),
    zip: pick(row, 'zip_code', 'zip'),
    county: pick(row, 'county_parish', 'county_name', 'county'),
    facility_kind: pick(row, 'hospital_type'),
    source: 'care_compare',
  };
}

function normalizeNppes(result) {
  const loc = (result.addresses || []).find((a) => a.address_purpose === 'LOCATION') || (result.addresses || [])[0] || {};
  const tax = (result.taxonomies || []).find((x) => x.primary) || (result.taxonomies || [])[0] || {};
  return {
    ccn: '',
    npi: String(result.number || ''),
    name: result.basic?.organization_name || [result.basic?.first_name, result.basic?.last_name].filter(Boolean).join(' '),
    address: [loc.address_1, loc.address_2].filter(Boolean).join(', '),
    city: loc.city || '',
    state: loc.state || '',
    zip: (loc.postal_code || '').slice(0, 5),
    county: '',
    facility_kind: tax.desc || '',
    source: 'nppes',
  };
}

export async function lookupNpi(npi) {
  const data = await getJson(`${NPPES}&number=${encodeURIComponent(npi)}`);
  return (data.results || []).map(normalizeNppes);
}

export async function lookupCcn(ccn) {
  const url = `${PROVIDER_DATA}?conditions[0][property]=facility_id&conditions[0][operator]==&conditions[0][value]=${encodeURIComponent(ccn.toUpperCase())}&limit=10`;
  const data = await getJson(url);
  return (data.results || []).map(normalizeCareCompare);
}

export async function searchByName(name, state = '') {
  const params = [`conditions[0][property]=facility_name`, `conditions[0][operator]=like`, `conditions[0][value]=${encodeURIComponent(`%${name.toUpperCase()}%`)}`];
  if (state) params.push(`conditions[1][property]=state`, `conditions[1][operator]==`, `conditions[1][value]=${encodeURIComponent(state.toUpperCase())}`);
  const data = await getJson(`${PROVIDER_DATA}?${params.join('&')}&limit=25`);
  return (data.results || []).map(normalizeCareCompare);
}

export function cacheResults(db, rows) {
  const ins = db.prepare(`INSERT INTO directory_cache (ccn, npi, name, address, city, state, zip, county, facility_kind, source)
    VALUES (@ccn, @npi, @name, @address, @city, @state, @zip, @county, @facility_kind, @source)
    ON CONFLICT(source, ccn, npi) DO UPDATE SET name = excluded.name, address = excluded.address, city = excluded.city, state = excluded.state,
      zip = excluded.zip, county = excluded.county, facility_kind = excluded.facility_kind, fetched_at = datetime('now')`);
  const tx = db.transaction((list) => list.forEach((r) => ins.run(r)));
  tx(rows);
}

export function searchCache(db, q) {
  const like = `%${q}%`;
  return db.prepare('SELECT * FROM directory_cache WHERE ccn LIKE ? OR npi LIKE ? OR name LIKE ? ORDER BY name LIMIT 25').all(like, like, like);
}

// Map a Care Compare hospital type onto the profile's facility_type choices.
export function guessFacilityType(kind = '') {
  const k = kind.toLowerCase();
  if (k.includes('critical access')) return 'CAH';
  if (k.includes('rural emergency')) return 'REH';
  if (k.includes('acute care')) return 'PPS';
  if (k.includes('rural health clinic')) return 'RHC';
  if (k.includes('federally qualified')) return 'FQHC';
  return 'OTHER';
}
