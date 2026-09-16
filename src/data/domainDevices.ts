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
  const nextIssue = (i: number) => (issues.length ? issues[i % issues.length].label : 'Attribute mismatch');

  /* Insights' "Open discrepancies by region" heatmap names, per cell, how
     many of this domain's OPEN devices sit in that region (REGION_DISCREPANCY)
     — clicking a cell used to just open this whole domain roster regardless
     of which region was clicked, so every cell for a domain landed on the
     same list. One entry per region, repeated to match that cell's own
     count, lines this roster up with the heatmap exactly (their sums
     already have to agree — see discoveryOverview.ts's own self-check).
     Unverified devices have no equivalent per-region figure anywhere in the
     app to match against, so they take the same proportional split as the
     open ones rather than an invented, unverifiable one. */
  const regionsForOpen = REGION_DISCREPANCY.flatMap(r => Array(r.drift[row.domain]).fill(r.region));
  const regionFor = (i: number) => regionsForOpen[i % regionsForOpen.length];

  const mk = (status: DeviceStatus, i: number): DomainDevice => {
    const pre = prefixes[Math.floor(rnd() * prefixes.length)];
    const num = 100 + Math.floor(rnd() * 880);
    return {
      id: `${row.domain}-${status}-${i}`,
      name: `${pre}-${num}`,
      ip: `10.${Math.floor(rnd() * 223) + 1}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}`,
      domain: row.domain,
      region: regionFor(i),
      status,
      issue: status === 'Open' ? nextIssue(i) : 'Not yet verified this cycle',
      lastScan: pick(SCANS)
    };
  };

  for (let i = 0; i < row.open; i++) DOMAIN_DEVICES.push(mk('Open', i));
  for (let i = 0; i < (row.unverified ?? 0); i++) DOMAIN_DEVICES.push(mk('Unverified', i));
});

/* `region` is the heatmap-cell drill: omitted, this is the same
   whole-domain roster it always was. */
export const domainDevices = (domain: DomainKey, region?: string) =>
  DOMAIN_DEVICES.filter(d => d.domain === domain && (!region || d.region === region));

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
})();
