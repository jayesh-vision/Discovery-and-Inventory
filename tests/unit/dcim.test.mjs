/* DCIM import, hierarchy, placement and reconciliation.
   Run: npm run test:unit */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, closeLoader } from './load.mjs';

let schema, parse, rec, store, sample, tmpl, derive, link, model, findings;
before(async () => {
  schema = await loadModule('/src/dcim/schema.ts');
  parse = await loadModule('/src/dcim/parse.ts');
  rec = await loadModule('/src/dcim/reconcile.ts');
  store = await loadModule('/src/dcim/store.ts');
  sample = await loadModule('/src/dcim/sample.ts');
  tmpl = await loadModule('/src/dcim/template.ts');
  derive = await loadModule('/src/dcim/derive.ts');
  findings = await loadModule('/src/dcim/findings.ts');
  link = await loadModule('/src/dcim/discoveryLink.ts');
  model = await loadModule('/src/dcim/model.ts');
});
after(closeLoader);

const memKV = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
const REFS = { inventory: [{ sn: 'FOC2231X0AB', ip: '10.1.2.3' }], discovered: [{ ip: '10.9.9.9' }] };

/* rows (keyed by column header) → plans, the way an upload produces them */
function plansFrom(rows) {
  const raws = Object.entries(rows).map(([name, list]) => {
    const def = schema.SHEETS.find(s => s.sheet === name);
    const headers = def.fields.map(f => f.col);
    return { name, headers, rows: list.map(r => Object.fromEntries(headers.map(h => [h, r[h] === undefined ? '' : typeof r[h] === 'boolean' ? (r[h] ? 'Y' : 'N') : String(r[h])]))), rowNumbers: list.map((_, i) => i + 2) };
  });
  return parse.planSheets(raws);
}
const stageRows = (rows, clientId = 'ACME', existing) => rec.stageImport({ clientId, fileName: 'test.xlsx', plans: plansFrom(rows), existing });
const clone = o => JSON.parse(JSON.stringify(o));

/* ── schema ── */
test('every sheet starts with its id column and every reference points at a known sheet', () => {
  const entities = new Set(schema.SHEETS.map(s => s.entity));
  for (const s of schema.SHEETS) {
    assert.equal(s.fields[0].type, 'id', s.sheet);
    for (const f of s.fields) if (f.ref) for (const r of [].concat(f.ref)) assert.ok(entities.has(r), `${s.sheet}.${f.col} → ${r}`);
  }
  assert.equal(new Set(schema.SHEETS.map(s => s.sheet)).size, 16);
});

test('auto-mapping tolerates case, spaces, units and aliases', () => {
  const def = schema.sheetByName('Devices');
  const m = schema.autoMapping(def, ['Device ID', 'hostname', 'U Start', 'Serial Number', 'Width (mm)', 'nonsense']);
  assert.deepEqual(m, { 'Device ID': 'id', hostname: 'name', 'U Start': 'uStart', 'Serial Number': 'serial', 'Width (mm)': 'widthMm' });
});

/* ── the acceptance sample ── */
test('the sample workbook round-trips through Excel and imports with no errors', async () => {
  const rows = sample.buildSample('full', REFS);
  const buf = await tmpl.buildWorkbook(rows);
  const raws = await parse.readWorkbook(buf);
  assert.ok(!raws.some(r => r.name === 'README' || r.name === 'Fields'), 'documentation sheets are skipped');
  const plans = parse.planSheets(raws);
  assert.ok(plans.every(p => p.def && p.detectedBy === 'name'));
  const s = rec.stageImport({ clientId: 'ACME', fileName: 'sample.xlsx', plans });
  assert.deepEqual(s.issues.filter(i => i.severity === 'error'), []);
  assert.equal(s.totals.created, Object.values(rows).reduce((a, l) => a + l.length, 0));
  assert.equal(s.merged.buildings.length, 2);
  assert.ok(s.merged.floors.length >= 4 && s.merged.rooms.length >= 8 && s.merged.rows.length >= 8);
  assert.deepEqual([...new Set(s.merged.racks.map(r => `${r.widthMm}x${r.depthMm}x${r.heightU}`))].length >= 4, true, 'racks of different dimensions');
  for (const t of ['SERVER', 'SWITCH', 'STORAGE', 'PATCH_PANEL']) assert.ok(s.merged.devices.some(d => d.type === t), t);
});

test('counts come from records: rooms, PDUs, generators and sensors', () => {
  const rows = sample.buildSample('full', REFS);
  const s = stageRows(rows);
  const scope = derive.dcScope(s.merged, 'ACME-BLR1');
  const c = derive.counts(scope);
  assert.equal(c.rooms, rows.Rooms.length);
  assert.equal(c.pdus, rows.PowerEquipment.filter(p => p.Type === 'PDU' || p.Type === 'RACK_PDU').length);
  assert.notEqual(c.pdus, c.racks * 2, 'single-fed racks make PDU count differ from racks × 2');
  assert.equal(c.power.GENERATOR, 3);
  assert.equal(c.sensors, rows.Sensors.length);
  assert.equal(c.racks, rows.Racks.length);
});

/* ── rack units ── */
test('overlapping devices on one face are rejected; front/rear half-depth devices may share a U', () => {
  const rows = sample.buildSample('mini');
  rows.Devices.push({ DeviceId: 'X1', Name: 'x1', Type: 'SERVER', RackId: 'DH1-A01', UStart: 2, UHeight: 1, Face: 'FRONT', FullDepth: 'Y', Status: 'ACTIVE' });
  let s = stageRows(rows);
  assert.ok(s.issues.some(i => i.code === 'u-overlap' && i.id === 'X1'), 'U2 is inside the 2U server at U1');
  const ok = sample.buildSample('mini');
  ok.Devices.push({ DeviceId: 'P1', Name: 'p1', Type: 'PATCH_PANEL', RackId: 'DH1-A01', UStart: 30, UHeight: 1, Face: 'FRONT', FullDepth: 'N', Status: 'ACTIVE' });
  ok.Devices.push({ DeviceId: 'P2', Name: 'p2', Type: 'PATCH_PANEL', RackId: 'DH1-A01', UStart: 30, UHeight: 1, Face: 'REAR', FullDepth: 'N', Status: 'ACTIVE' });
  s = stageRows(ok);
  assert.ok(!s.issues.some(i => i.code === 'u-overlap'));
  const out = sample.buildSample('mini');
  out.Devices.push({ DeviceId: 'T1', Name: 't1', Type: 'SERVER', RackId: 'DH1-A02', UStart: 41, UHeight: 2, Status: 'ACTIVE' });
  assert.ok(!stageRows(out).issues.some(i => i.id === 'T1'), 'U41–U42 is the top of a 42U rack: it fits');
});

test('U range: a device reaching above the rack top is an error', () => {
  const rows = sample.buildSample('mini');
  rows.Devices.push({ DeviceId: 'T2', Name: 't2', Type: 'SERVER', RackId: 'DH1-A02', UStart: 42, UHeight: 2, Status: 'ACTIVE' });
  const s = stageRows(rows);
  assert.ok(s.issues.some(i => i.code === 'u-range' && i.id === 'T2'));
  assert.equal(s.ok, false);
});

test('rackOccupancy reports used/free U and free runs', () => {
  const s = stageRows(sample.buildSample('mini'));
  const rack = s.merged.racks.find(r => r.id === 'DH1-A01');
  const o = derive.rackOccupancy(rack, s.merged.devices);
  assert.equal(o.usedU, 3);   /* 2U server + 1U ToR (half-depth, front) */
  assert.equal(o.freeU, 39);
  assert.deepEqual(o.freeRuns, [{ from: 3, to: 41 }]);
});

/* ── validation messages ── */
test('missing references, duplicate ids, bad enums and missing required columns are errors', () => {
  const rows = sample.buildSample('mini');
  rows.Racks.push({ RackId: 'R-X', RoomId: 'NO-SUCH-ROOM', Name: 'x', HeightU: 42, Status: 'ACTIVE' });
  rows.Racks.push({ ...rows.Racks[0] });
  rows.Devices.push({ DeviceId: 'D-X', Name: 'dx', Type: 'TOASTER', Status: 'ACTIVE' });
  const s = stageRows(rows);
  const codes = new Set(s.issues.filter(i => i.severity === 'error').map(i => i.code));
  for (const c of ['missing-ref', 'duplicate-id', 'bad-value']) assert.ok(codes.has(c), c);
  const dup = s.issues.find(i => i.code === 'duplicate-id');
  assert.equal(dup.sheet, 'Racks'); assert.ok(dup.row > 2);

  const raw = { name: 'Racks', headers: ['RackId', 'Name'], rows: [{ RackId: 'R1', Name: 'r1' }], rowNumbers: [2] };
  const st = rec.stageImport({ clientId: 'ACME', fileName: 'r.csv', plans: parse.planSheets([raw]) });
  assert.ok(st.issues.some(i => i.code === 'column-missing' && i.col === 'RoomId'));
});

test('broken connections: a port takes one cable, and ends must exist', () => {
  const rows = sample.buildSample('mini');
  rows.Connections.push({ ConnectionId: 'C-DUP', Kind: 'PHYSICAL', APortId: rows.Connections[0].APortId, BPortId: 'DH1-A01-TOR:Ethernet2', Status: 'ACTIVE' });
  rows.Connections.push({ ConnectionId: 'C-GONE', Kind: 'PHYSICAL', APortId: 'nope:1', BPortId: 'DH1-A01-TOR:Ethernet1', Status: 'ACTIVE' });
  const s = stageRows(rows);
  assert.ok(s.issues.some(i => i.code === 'port-reused'));
  assert.ok(s.issues.some(i => i.code === 'missing-ref' && i.id === 'C-GONE'));
});

test('a monitoring mapping that carries a secret is rejected', () => {
  const rows = sample.buildSample('mini');
  rows.MonitoringMappings.push({ MappingId: 'BAD', EntityId: 'DH1-A01-TOR', System: 'SNMP', ExternalId: 'community=public' });
  assert.ok(stageRows(rows).issues.some(i => i.code === 'credential'));
});

test('a power path that loops is rejected', () => {
  const rows = sample.buildSample('mini');
  rows.PowerConnections.push({ PowerConnectionId: 'L1', FromId: 'UPS-A', ToId: 'UPS-B', Side: 'N', Status: 'ACTIVE' });
  rows.PowerConnections.push({ PowerConnectionId: 'L2', FromId: 'UPS-B', ToId: 'UPS-A', Side: 'N', Status: 'ACTIVE' });
  assert.ok(stageRows(rows).issues.some(i => i.code === 'power-loop'));
});

/* ── staging, re-import and the store ── */
test('re-import classifies created / updated / unchanged and never deletes', () => {
  const st = new store.DcimStore(memKV());
  st.upsertClient({ id: 'ACME', name: 'Acme' });
  const rows = sample.buildSample('mini');
  st.commit(stageRows(rows, 'ACME'), 1000);
  const again = stageRows(rows, 'ACME', st.data('ACME'));
  assert.equal(again.totals.created, 0);
  assert.equal(again.totals.updated, 0);
  assert.ok(again.totals.unchanged > 0);

  const edited = clone(rows);
  edited.Racks[0].MaxKw = 15;                  /* update */
  edited.Racks.splice(1, 1);                   /* missing from file → kept */
  edited.Devices = edited.Devices.filter(d => d.RackId !== 'DH1-A02');
  edited.Ports = edited.Ports.filter(p => !p.DeviceId.startsWith('DH1-A02'));
  edited.Connections = edited.Connections.filter(c => !c.APortId.startsWith('DH1-A02'));
  edited.PowerEquipment = edited.PowerEquipment.filter(p => p.RackId !== 'DH1-A02');
  edited.PowerConnections = edited.PowerConnections.filter(p => !String(p.ToId).startsWith('DH1-A02'));
  edited.Racks.push({ RackId: 'DH1-A03', RoomId: 'B1-L1-DH1', RowId: 'DH1-A', Name: 'A03', Position: 3, WidthMm: 800, DepthMm: 1200, HeightU: 47, Status: 'ACTIVE' });
  const s2 = stageRows(edited, 'ACME', st.data('ACME'));
  assert.deepEqual(s2.issues.filter(i => i.severity === 'error'), []);
  assert.deepEqual(s2.diff.racks.created, ['DH1-A03']);
  assert.equal(s2.diff.racks.updated.length, 1);
  assert.deepEqual(s2.diff.racks.updated[0].changes, [{ key: 'maxKw', before: 12, after: 15 }]);
  assert.deepEqual(s2.diff.racks.keptNotInFile, ['DH1-A02']);
  st.commit(s2, 2000);
  const racks = st.data('ACME').entities.racks.map(r => r.id).sort();
  assert.deepEqual(racks, ['DH1-A01', 'DH1-A02', 'DH1-A03']);
  assert.equal(st.batches('ACME').length, 2);
});

test('an import with errors cannot be committed and leaves the store as it was', () => {
  const st = new store.DcimStore(memKV());
  st.upsertClient({ id: 'ACME', name: 'Acme' });
  st.commit(stageRows(sample.buildSample('mini'), 'ACME'), 1);
  const before = JSON.stringify(st.data('ACME'));
  const bad = sample.buildSample('mini');
  bad.Racks[0].RoomId = 'GONE';
  const s = stageRows(bad, 'ACME', st.data('ACME'));
  assert.equal(s.ok, false);
  assert.throws(() => st.commit(s, 2));
  assert.equal(JSON.stringify(st.data('ACME')), before);
});

test('clients are isolated: same ids in two clients, and no cross-client rows', () => {
  const st = new store.DcimStore(memKV());
  st.upsertClient({ id: 'ACME', name: 'Acme' });
  st.upsertClient({ id: 'BETA', name: 'Beta' });
  st.commit(stageRows(sample.buildSample('mini'), 'ACME'), 1);
  const beta = sample.buildSample('mini');
  const mism = stageRows(beta, 'BETA', st.data('BETA'));
  assert.ok(mism.issues.some(i => i.code === 'client-mismatch'), 'DataCenters.ClientId = ACME inside a BETA import');
  assert.ok(mism.issues.some(i => i.code === 'other-client'));
  beta.DataCenters[0].ClientId = '';
  beta.Clients = [];
  const ok = stageRows(beta, 'BETA', st.data('BETA'));
  assert.equal(ok.ok, true);
  st.commit(ok, 2);
  assert.equal(st.data('BETA').entities.racks.length, 2);
  assert.equal(st.data('ACME').entities.racks.length, 2);
  assert.equal(st.data('BETA').entities.dataCenters[0].clientId, 'BETA');
  assert.equal(st.data('ACME').entities.dataCenters[0].clientId, 'ACME');
  assert.throws(() => st.link('BETA', { deviceId: 'nope', target: 'inventory', ref: 'x', matchedOn: 'serial', linkedAt: 0 }));
});


/* ── power and findings ── */
test('rack power is traced from records: A+B, A-only, and up to the generators', () => {
  const s = stageRows(sample.buildSample('full', REFS));
  const e = s.merged;
  const dh1 = derive.rackPower(e, e.racks.find(r => r.id === 'DH1-A01'));
  assert.equal(dh1.redundancy, 'A+B');
  const ids = dh1.paths.find(p => p.side === 'A').chain.map(p => p.id);
  for (const id of ['DH1-A01-RPDU-A', 'PDU-DH1-A', 'UPS-A1', 'SWGR-A', 'ATS-A', 'GEN-1', 'UTIL-A']) assert.ok(ids.includes(id), id);
  assert.equal(derive.rackPower(e, e.racks.find(r => r.id === 'DH3-R01')).redundancy, 'A only');
});


/* ── parsing and linking ── */
test('CSV: quotes, embedded commas, semicolon files and header-based sheet detection', () => {
  const raw = parse.readCsv('RackId,RoomId,Name,HeightU\r\nR1,ROOM1,"Rack, one",42\r\nR2,ROOM1,"say ""hi""",47\r\n', 'export-from-dcim.csv');
  assert.equal(raw.rows[0].Name, 'Rack, one');
  assert.equal(raw.rows[1].Name, 'say "hi"');
  assert.equal(parse.detectSheet(raw).def.sheet, 'Racks');
  assert.equal(parse.detectSheet(raw).by, 'headers');
  const semi = parse.readCsv('DeviceId;Name;Type\nD1;d1;SERVER\n', 'Devices.csv');
  assert.equal(semi.rows[0].Type, 'SERVER');
  assert.equal(parse.detectSheet(semi).by, 'name');
});

test('link candidates match on serial or management IP only — never on name', () => {
  const devices = [
    { id: 'A', name: 'core-1', serial: 'foc 2231-x0ab', mgmtIp: '' },
    { id: 'B', name: 'edge-9', serial: '', mgmtIp: '10.9.9.9/24' },
    { id: 'C', name: 'NDLS-J960', serial: 'ZZZ', mgmtIp: '1.1.1.1' }
  ];
  const inv = [{ name: 'NDLS-J960', sn: 'FOC2231X0AB', ip: '172.16.0.1', model: 'm', oem: 'o', loc: 'l' }];
  const disc = [{ id: 'IP-1', name: 'edge-9', ip: '10.9.9.9', domain: 'IPMPLS', region: 'North' }];
  const c = link.linkCandidates(devices, inv, disc);
  assert.deepEqual(c.map(x => [x.deviceId, x.target, x.matchedOn]), [['A', 'inventory', 'serial'], ['B', 'discovery', 'mgmtIp']]);
  assert.ok(!c.some(x => x.deviceId === 'C'), 'same name, different serial and IP: no candidate');
});

test('template workbook carries README, Fields and all 16 data sheets with headers', async () => {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await tmpl.buildWorkbook(sample.buildSample('mini')));
  const names = wb.worksheets.map(w => w.name);
  assert.deepEqual(names.slice(0, 2), ['README', 'Fields']);
  for (const s of schema.SHEETS) {
    assert.ok(names.includes(s.sheet), s.sheet);
    assert.equal(wb.getWorksheet(s.sheet).getRow(1).getCell(1).value, s.fields[0].col);
  }
  void model;
});


test('findings are read from the records: single-fed racks are reported, consistent records give none of that kind', () => {
  const s = stageRows(sample.buildSample('full', REFS));
  const fs = findings.findings(s.merged, 'ACME-BLR1');
  const single = fs.find(f => f.id === 'single-fed');
  assert.ok(single && single.title.startsWith('10 racks'), 'DH3 racks are A-only');
  assert.ok(fs.every(f => f.kind === 'inventory'));
});

test('download → re-upload round trip: exported rows import as unchanged', async () => {
  const st = new store.DcimStore(memKV());
  st.upsertClient({ id: 'ACME', name: 'Acme' });
  st.commit(stageRows(sample.buildSample('full', REFS), 'ACME'), 1);
  const rows = tmpl.exportRows(st.data('ACME').entities, 'ACME-BLR1');
  const raws = await parse.readWorkbook(await tmpl.buildWorkbook(rows));
  const again = rec.stageImport({ clientId: 'ACME', fileName: 'export.xlsx', plans: parse.planSheets(raws), existing: st.data('ACME') });
  assert.equal(again.totals.errors, 0);
  assert.equal(again.totals.created, 0);
  assert.equal(again.totals.updated, 0, JSON.stringify(Object.entries(again.diff).filter(([, d]) => d.updated.length).map(([k, d]) => [k, d.updated[0]])));
});
