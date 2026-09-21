/* ── Domain device roster ──────────────────────────────────
   Backs the drill-down from Insights' "Trust by domain and region" table:
   click a domain, see the devices behind its open/unverified counts, click
   a device, see its own record. Only the two operationally meaningful
   buckets are enumerated — a device that's already in sync has nothing to
   action, so it is counted (DOMAIN_TRUST_ROWS.inSync) but not listed row by
   row. This mirrors the roster-building already done in ./discovery.ts
   (REGION_DEVICES, ATTENTION): a deterministic seeded generator that must
   reproduce the summary counts exactly, checked at the bottom of this file. */

import { DISCREPANCY_TYPES, DOMAIN_TRUST_ROWS, REGION_DISCREPANCY, type DomainKey } from './discoveryOverview';

export type DeviceStatus = 'Open' | 'Unverified';

export interface DomainDevice {
  id: string;
  name: string;
  ip: string;
  domain: DomainKey;
  region: string;
  status: DeviceStatus;
  issue: string;
  lastScan: string;
}

const PREFIX: Record<DomainKey, string[]> = {
  RAN: ['gNB', 'eNB'],
  Transport: ['ROADM', 'OTN', 'PE-TRK'],
  Core: ['AMF', 'UPF', 'NF'],
  IPMPLS: ['PE', 'P']
};

/* a small deterministic source, so every reload lists the same devices —
   same idiom as discovery.ts's lcg() */
function lcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const SCANS = ['40 sec ago', '2 min ago', '6 min ago', '12 min ago', '19 min ago', '41 min ago', '1h 10m ago', '2h ago', '6h ago'];

export const DOMAIN_DEVICES: DomainDevice[] = [];

DOMAIN_TRUST_ROWS.forEach(row => {
  const rnd = lcg(row.domain.length * 97 + row.inScope);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const prefixes = PREFIX[row.domain];
  const issues = DISCREPANCY_TYPES.filter(d => d.domain === row.domain);
  /* Reconciliation's "Open items by type" names, per type, exactly how many
     of this domain's OPEN devices carry it (discoveryOverview.ts's own
     self-check already proves these counts sum to row.open) — one entry per
     type, repeated to match that type's own count, is what lines this
     roster up with the number a reader just clicked. `i % issues.length`
     cycling (the previous approach) instead gives every type roughly the
     same share regardless of its real count — clicking "Undocumented
     wavelength · 52" landed on a roster with far fewer than 52 matching
     devices, the exact region/i%length bug already fixed above for
     regionsForOpen. */
  const issuesForOpen = issues.length ? issues.flatMap(t => Array(t.count).fill(t.label)) : [];

  /* Insights' "Open discrepancies by region" heatmap names, per cell, how
     many of this domain's OPEN devices sit in that region (REGION_DISCREPANCY)
     — clicking a cell used to just open this whole domain roster regardless
     of which region was clicked, so every cell for a domain landed on the
     same list. One entry per region, repeated to match that cell's own
     count, lines this roster up with the heatmap exactly (their sums
     already have to agree — see discoveryOverview.ts's own self-check). */
  const regionsForOpen = REGION_DISCREPANCY.flatMap(r => Array(r.drift[row.domain]).fill(r.region));

  /* Unverified devices have no equivalent per-region figure anywhere in
     the app, so they're split across regions in proportion to each
     region's own share of this domain's open backlog. That has to be a
     real proportional split (largest-remainder rounding to land on the
     exact total), not `i % regionsForOpen.length` — regionsForOpen lists
     one region's whole block before the next's, so indexing into it that
     way dumped nearly every unverified device into whichever region
     happens to sort first (e.g. Transport's 30 unverified came out
     West 25 / Southeast 5 / Northeast 0 / Midwest 0, though West is only
     25 of Transport's 64 open, 39% — nowhere near 83%). */
  const unverifiedTotal = row.unverified ?? 0;
  const shares = REGION_DISCREPANCY.map(r => {
    const exact = unverifiedTotal * r.drift[row.domain] / (regionsForOpen.length || 1);
    return { region: r.region, n: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  const leftover = unverifiedTotal - shares.reduce((a, s) => a + s.n, 0);
  [...shares].sort((a, b) => b.rem - a.rem).slice(0, leftover).forEach(s => { s.n++; });
  const regionsForUnverified = shares.flatMap(s => Array(s.n).fill(s.region));

  const regionFor = (status: DeviceStatus, i: number) =>
    status === 'Open' ? regionsForOpen[i] : regionsForUnverified[i];

  const mk = (status: DeviceStatus, i: number): DomainDevice => {
    const pre = prefixes[Math.floor(rnd() * prefixes.length)];
    const num = 100 + Math.floor(rnd() * 880);
    let ip = '';
    if (row.domain === 'IPMPLS') {
      ip = `172.31.${30 + Math.floor(rnd() * 70)}.${10 + Math.floor(rnd() * 240)}`;
    } else if (row.domain === 'Transport') {
      ip = `172.31.${160 + Math.floor(rnd() * 35)}.${10 + Math.floor(rnd() * 240)}`;
    } else if (row.domain === 'RAN') {
      ip = pre === 'gNB'
        ? `10.51.${10 + Math.floor(rnd() * 40)}.${10 + Math.floor(rnd() * 240)}`
        : `10.44.${10 + Math.floor(rnd() * 40)}.${10 + Math.floor(rnd() * 240)}`;
    } else {
      ip = `10.10.${10 + Math.floor(rnd() * 30)}.${10 + Math.floor(rnd() * 240)}`;
    }
    return {
      id: `${row.domain}-${status}-${i}`,
      name: `${pre}-${num}`,
      ip,
      domain: row.domain,
      region: regionFor(status, i),
      status,
      issue: status === 'Open' ? (issuesForOpen[i] ?? 'Attribute mismatch') : 'Not yet verified this cycle',
      lastScan: pick(SCANS)
    };
  };

  for (let i = 0; i < row.open; i++) DOMAIN_DEVICES.push(mk('Open', i));
  for (let i = 0; i < (row.unverified ?? 0); i++) DOMAIN_DEVICES.push(mk('Unverified', i));
});

/* `region` is the heatmap-cell drill, `issue` is the "Open items by type"
   row drill — both optional and independent; omitted, this is the same
   whole-domain roster it always was. */
export const domainDevices = (domain: DomainKey, region?: string, issue?: string) =>
  DOMAIN_DEVICES.filter(d => d.domain === domain && (!region || d.region === region) && (!issue || d.issue === issue));

/* roster self-check: every device this page lists must foot to the counts
   the domain's own summary row and Insights quote */
(() => {
  DOMAIN_TRUST_ROWS.forEach(row => {
    const rows = domainDevices(row.domain);
    const open = rows.filter(d => d.status === 'Open').length;
    const unverified = rows.filter(d => d.status === 'Unverified').length;
    if (open !== row.open) throw new Error(`domain devices: ${row.domain} open ${open} ≠ ${row.open}`);
    if (unverified !== (row.unverified ?? 0)) throw new Error(`domain devices: ${row.domain} unverified ${unverified} ≠ ${row.unverified ?? 0}`);
  });
  /* and the region heatmap's own per-cell number must match this roster's
     region-filtered open count exactly — that's the number the cell shows
     and the count this drill has to land on */
  REGION_DISCREPANCY.forEach(r => {
    (Object.keys(r.drift) as DomainKey[]).forEach(d => {
      const count = domainDevices(d, r.region).filter(x => x.status === 'Open').length;
      if (count !== r.drift[d]) throw new Error(`domain devices: ${r.region}/${d} open ${count} ≠ ${r.drift[d]}`);
    });
  });
  /* and "Open items by type"'s own count must match this roster's
     issue-filtered open count exactly — same reason */
  DISCREPANCY_TYPES.forEach(t => {
    const count = domainDevices(t.domain, undefined, t.label).filter(x => x.status === 'Open').length;
    if (count !== t.count) throw new Error(`domain devices: ${t.domain}/${t.label} open ${count} ≠ ${t.count}`);
  });
})();
