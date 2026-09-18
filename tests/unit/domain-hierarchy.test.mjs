/* Domain hierarchy: Transport └ IP/MPLS
   Run: npm run test:unit */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, closeLoader, loadLegacyHelpers } from './load.mjs';

let D, ops, rules, recon, legacy;
before(async () => {
  D = await loadModule('/src/data/discoveryOverview.ts');
  ops = await loadModule('/src/data/reconciliationOps.ts');
  rules = await loadModule('/src/data/rules.ts');
  recon = await loadModule('/src/data/reconcileOverview.ts');
  legacy = loadLegacyHelpers();
});
after(closeLoader);

/* ── the tree itself ─────────────────────────────────────── */
test('IP/MPLS is a child of Transport, and the only sub-domain', () => {
  assert.equal(D.DOMAIN_PARENT.IPMPLS, 'Transport');
  assert.deepEqual(Object.keys(D.DOMAIN_PARENT), ['IPMPLS']);
  assert.deepEqual(D.TOP_DOMAINS, ['RAN', 'Core', 'Transport']);
  assert.deepEqual(D.domainChildren('Transport'), ['IPMPLS']);
  assert.deepEqual(D.domainChildren('RAN'), []);
});

test('DOMAIN_ORDER lists every domain once, child directly after its parent', () => {
  assert.deepEqual(D.DOMAIN_ORDER, ['RAN', 'Core', 'Transport', 'IPMPLS']);
  assert.equal(D.DOMAIN_ORDER.indexOf('IPMPLS'), D.DOMAIN_ORDER.indexOf('Transport') + 1);
  assert.deepEqual([...D.DOMAIN_ORDER].sort(), Object.keys(D.DOMAIN_LABEL).sort());
});

test('paths, depth and labels follow the tree', () => {
  assert.deepEqual(D.domainPath('IPMPLS'), ['Transport', 'IPMPLS']);
  assert.deepEqual(D.domainPath('Transport'), ['Transport']);
  assert.equal(D.domainDepth('IPMPLS'), 1);
  assert.equal(D.domainDepth('Core'), 0);
  assert.equal(D.DOMAIN_LABEL.IPMPLS, 'IP/MPLS');
  assert.equal(D.DOMAIN_FULL_LABEL.IPMPLS, 'Transport · IP/MPLS');
  assert.equal(D.DOMAIN_FULL_LABEL.Transport, 'Transport');
  assert.equal(D.domainParentLabel('IPMPLS'), 'Transport');
  assert.equal(D.domainParentLabel('Transport'), undefined);
});

test('domainMatches: a parent filter includes its children, never the reverse', () => {
  assert.equal(D.domainMatches('IPMPLS', 'Transport'), true);
  assert.equal(D.domainMatches('IPMPLS', 'IPMPLS'), true);
  assert.equal(D.domainMatches('Transport', 'Transport'), true);
  assert.equal(D.domainMatches('Transport', 'IPMPLS'), false);
  assert.equal(D.domainMatches('IPMPLS', 'RAN'), false);
  assert.equal(D.domainMatches('RAN', 'Transport'), false);
});

/* ── the one filter predicate every screen uses ──────────── */
test('parseDomainKey resolves every spelling a domain arrives as', () => {
  for (const v of ['IPMPLS', 'ipmpls', 'IP/MPLS', 'ip/mpls', 'Transport · IP/MPLS', '   └ IP/MPLS', '   └ IP/MPLS']) {
    assert.equal(D.parseDomainKey(v), 'IPMPLS', `parse ${JSON.stringify(v)}`);
  }
  assert.equal(D.parseDomainKey('transport'), 'Transport');
  assert.equal(D.parseDomainKey('Core'), 'Core');
});

test('parseDomainKey rejects null, empty, unknown and partial values', () => {
  for (const v of [null, undefined, '', '   ', 'MPLS', 'IP', 'Transport/IPMPLS', 'Optical', 42, {}]) {
    assert.equal(D.parseDomainKey(v), undefined, `reject ${JSON.stringify(v)}`);
  }
});

test('domainFilterMatches: no filter passes everything, Transport ⊇ IP/MPLS, siblings excluded', () => {
  assert.equal(D.domainFilterMatches('IPMPLS', ''), true);
  assert.equal(D.domainFilterMatches('IPMPLS', undefined), true);
  assert.equal(D.domainFilterMatches('IPMPLS', null), true);
  assert.equal(D.domainFilterMatches('IPMPLS', 'Transport'), true);
  assert.equal(D.domainFilterMatches('IPMPLS', 'IP/MPLS'), true);
  assert.equal(D.domainFilterMatches('IPMPLS', 'transport · ip/mpls'), true);
  assert.equal(D.domainFilterMatches('Transport', 'IP/MPLS'), false);
  assert.equal(D.domainFilterMatches('Transport', 'Transport'), true);
  assert.equal(D.domainFilterMatches('RAN', 'Transport'), false);
  assert.equal(D.domainFilterMatches('Core', 'IP/MPLS'), false);
});

test('domainFilterMatches: an unknown filter value or an untagged row matches nothing', () => {
  assert.equal(D.domainFilterMatches('IPMPLS', 'Optical'), false);
  assert.equal(D.domainFilterMatches(undefined, 'Transport'), false);
  assert.equal(D.domainFilterMatches('MPLS', 'Transport'), false);
});

test('DOMAIN_OPTIONS renders the tree with the sub-domain indented and a clean value', () => {
  assert.deepEqual(D.DOMAIN_OPTIONS.map(o => o.v), ['RAN', 'Core', 'Transport', 'IP/MPLS']);
  const ip = D.DOMAIN_OPTIONS.find(o => o.key === 'IPMPLS');
  assert.equal(ip.depth, 1);
  assert.match(ip.l, /^\s+└ IP\/MPLS$/);
  assert.equal(D.DOMAIN_OPTIONS.find(o => o.key === 'Transport').l, 'Transport');
});

/* ── routing ─────────────────────────────────────────────── */
test('a sub-domain nests under its parent in the URL', () => {
  assert.deepEqual(D.domainSlugs('IPMPLS'), ['transport', 'ipmpls']);
  assert.deepEqual(D.domainSlugs('RAN'), ['ran']);
  assert.deepEqual(D.domainRoute('IPMPLS'), { key: 'subdomaindevices', params: { domain: 'transport', sub: 'ipmpls' } });
  assert.deepEqual(D.domainRoute('Transport'), { key: 'domaindevices', params: { domain: 'transport' } });
});

/* ── Discovery data ──────────────────────────────────────── */
test('Discovery: every per-domain table carries IP/MPLS under Transport, in tree order', () => {
  for (const [name, rows] of [['DISCOVERY_JOB_ROWS', D.DISCOVERY_JOB_ROWS], ['DOMAIN_TRUST_ROWS', D.DOMAIN_TRUST_ROWS]]) {
    assert.deepEqual(rows.map(r => r.domain), D.DOMAIN_ORDER, name);
  }
  assert.deepEqual(D.OBJECTS_DAILY_SERIES.map(s => s.domain), D.DOMAIN_ORDER);
  assert.ok(D.OBJECTS_DAILY_VALUES.every(day => day.length === D.DOMAIN_ORDER.length));
});

test('Discovery: a Transport filter keeps IP/MPLS records, an IP/MPLS filter keeps only them', () => {
  const sets = { DISCOVERY_JOB_ROWS: D.DISCOVERY_JOB_ROWS, DISCREPANCY_TYPES: D.DISCREPANCY_TYPES, RECONCILE_CYCLE_ROWS: D.RECONCILE_CYCLE_ROWS, ROOT_CAUSE_FAILURES: D.ROOT_CAUSE_FAILURES };
  for (const [name, rows] of Object.entries(sets)) {
    for (const r of rows) assert.ok(D.isDomainKey(r.domain), `${name}: ${r.domain} is a known domain`);
    const transport = rows.filter(r => D.domainFilterMatches(r.domain, 'Transport'));
    const ipmpls = rows.filter(r => D.domainFilterMatches(r.domain, 'IP/MPLS'));
    assert.ok(ipmpls.every(r => r.domain === 'IPMPLS'), `${name}: IP/MPLS filter is exact`);
    assert.ok(ipmpls.every(r => transport.includes(r)), `${name}: IP/MPLS rows are inside the Transport filter`);
    assert.ok(transport.every(r => r.domain === 'Transport' || r.domain === 'IPMPLS'), `${name}: Transport filter has no other domain`);
  }
  assert.ok(D.DISCOVERY_JOB_ROWS.some(r => r.domain === 'IPMPLS'), 'a discovery job exists for IP/MPLS');
  assert.ok(D.DISCREPANCY_TYPES.some(r => r.domain === 'IPMPLS'), 'discrepancy types exist for IP/MPLS');
  assert.ok(D.ADAPTER_ROWS.some(a => a.domains.includes('IPMPLS')), 'a discovery adapter covers IP/MPLS');
});

test('Discovery: the per-domain invariants still foot (open backlog, regions, age bands)', () => {
  const open = D.DOMAIN_TRUST_ROWS.reduce((a, r) => a + r.open, 0);
  assert.equal(open, 147);
  for (const d of D.DOMAIN_ORDER) {
    const byType = D.DISCREPANCY_TYPES.filter(t => t.domain === d).reduce((a, t) => a + t.count, 0);
    const byRegion = D.REGION_DISCREPANCY.reduce((a, r) => a + r.drift[d], 0);
    const want = D.DOMAIN_TRUST_ROWS.find(r => r.domain === d).open;
    assert.equal(byType, want, `${d} types`);
    assert.equal(byRegion, want, `${d} regions`);
  }
});

/* ── Reconciliation data ─────────────────────────────────── */
test('Reconciliation: jobs, results, exceptions and rules all classify IP/MPLS under Transport', () => {
  const sets = { RECONCILE_JOBS: ops.RECONCILE_JOBS, RECONCILE_RESULTS: ops.RECONCILE_RESULTS, RECONCILE_EXCEPTIONS: ops.RECONCILE_EXCEPTIONS, RULES: rules.RULES };
  for (const [name, rows] of Object.entries(sets)) {
    for (const r of rows) assert.ok(D.isDomainKey(r.domain), `${name} ${r.id}: ${r.domain} is a known domain`);
    assert.ok(rows.some(r => r.domain === 'IPMPLS'), `${name} has IP/MPLS records`);
    const transport = rows.filter(r => D.domainFilterMatches(r.domain, 'Transport'));
    assert.ok(transport.some(r => r.domain === 'IPMPLS'), `${name}: Transport filter includes IP/MPLS`);
    assert.ok(transport.every(r => ['Transport', 'IPMPLS'].includes(r.domain)), `${name}: Transport filter excludes RAN/Core`);
    assert.ok(rows.filter(r => D.domainFilterMatches(r.domain, 'IP/MPLS')).every(r => r.domain === 'IPMPLS'), `${name}: IP/MPLS filter is exact`);
    assert.ok(rows.filter(r => D.domainFilterMatches(r.domain, 'RAN')).every(r => r.domain === 'RAN'), `${name}: RAN filter untouched`);
  }
});

test('Reconciliation overview derives its per-domain tables in tree order', () => {
  assert.deepEqual(recon.DOMAIN_COVERAGE.map(c => c.domain), D.DOMAIN_ORDER);
  assert.deepEqual(recon.REGION_DOMAINS, D.DOMAIN_ORDER);
  for (const r of recon.REGION_HEALTH) assert.deepEqual(Object.keys(r.drift).sort(), [...D.DOMAIN_ORDER].sort());
});

test('Rules: the persisted rule format (domain key strings) needs no migration', () => {
  const stored = JSON.parse(JSON.stringify(rules.RULES));
  for (const r of stored) assert.equal(D.parseDomainKey(r.domain), r.domain, `${r.id} round-trips`);
  const ipm = stored.filter(r => r.domain === 'IPMPLS');
  assert.ok(ipm.length >= 1);
  assert.ok(ipm.every(r => D.domainMatches(r.domain, 'Transport')));
});

/* ── existing Transport behaviour ────────────────────────── */
test('Transport itself is unchanged: its own rows, figures and label', () => {
  const t = D.DOMAIN_TRUST_ROWS.find(r => r.domain === 'Transport');
  assert.equal(t.inScope, 2180);
  assert.equal(t.open, 64);
  assert.equal(D.DOMAIN_LABEL.Transport, 'Transport');
  assert.equal(D.DOMAIN_FULL_LABEL.Transport, 'Transport');
  assert.equal(D.RECONCILE_NEXT.domain, 'Transport');
  assert.ok(ops.RECONCILE_JOBS.some(j => j.domain === 'Transport'));
  assert.ok(rules.RULES.some(r => r.domain === 'Transport'));
});

/* ── legacy prototype (Scan jobs / Scan targets) ─────────── */
test('legacy helpers mirror the same tree', () => {
  assert.equal(legacy.DOMAIN_META.IPMPLS.parent, 'Transport');
  assert.deepEqual(legacy.DOMAIN_ORDER, D.DOMAIN_ORDER);
  assert.deepEqual(legacy.DOMAIN_FILTER_OPTIONS.map(o => (typeof o === 'string' ? o : o.v)), ['RAN', 'Core', 'Transport', 'IP/MPLS']);
  assert.match(legacy.DOMAIN_FILTER_OPTIONS[3].l, /└ IP\/MPLS$/);
  assert.equal(legacy.domainFilterMatch('IPMPLS', 'Transport'), true);
  assert.equal(legacy.domainFilterMatch('IPMPLS', 'ip/mpls'), true);
  assert.equal(legacy.domainFilterMatch('Transport', 'IP/MPLS'), false);
  assert.equal(legacy.domainFilterMatch('RAN', 'Transport'), false);
  assert.equal(legacy.domainFilterMatch('Nope', 'Transport'), false);
  assert.match(legacy.domainDot('IPMPLS'), /Transport · <\/span>IP\/MPLS/);
  assert.doesNotMatch(legacy.domainDot('Transport'), /·/);
});
