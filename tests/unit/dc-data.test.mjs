/* Data center inventory (src/data/dc, copied from Datacenter-Ideation): the copy is
   internally consistent, and the location roster and the manifest agree with it.
   `npm run dc:check` is what proves it matches Datacenter-Ideation itself. The default roster is
   checked here too: the data center copy must never change it.
   Run: node --test tests/unit/dc-data.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data');
const read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const F = read('dc/datacenters.json'), D = read('dc/devices.json'), M = read('dc/modules.json'), G = read('dc/gpu.json'), man = read('dc/manifest.json');
const roster = read('allLocations.json');
const racks = new Map(F.flatMap(f => f.racks.map(r => [r.id, r])));
const count = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});

test('manifest counts equal the records', () => {
  const c = man.counts;
  assert.equal(c.datacenters, F.length);
  assert.equal(c.racks, racks.size);
  assert.equal(c.devices, D.length);
  assert.deepEqual(c.devicesByRole, count(D, d => d.role));
  assert.equal(c.ups, F.reduce((a, f) => a + f.power.ups.length, 0));
  assert.equal(c.coolingUnits, F.reduce((a, f) => a + f.cooling.units.length, 0));
  assert.equal(c.sensors, F.reduce((a, f) => a + f.cooling.sensors.length, 0));
  assert.equal(c.gpuServers, G.nodes.length);
  assert.equal(c.gpus, G.nodes.reduce((a, n) => a + n.gpus.length, 0));
  assert.deepEqual(man.datacenterIds, F.map(f => f.id));
});

test('ids are unique and every device sits in a real rack of its own data center', () => {
  assert.equal(new Set(D.map(d => d.id)).size, D.length);
  for (const d of D) {
    const r = racks.get(d.rackId);
    assert.ok(r, `${d.id}: rack ${d.rackId} does not exist`);
    assert.equal(r.dcId, d.dcId, `${d.id}: rack belongs to ${r.dcId}`);
  }
});

test('racks: devices fit, never overlap, and add up to the rack\'s used U', () => {
  const by = new Map();
  for (const d of D) (by.get(d.rackId) ?? by.set(d.rackId, []).get(d.rackId)).push(d);
  for (const [id, ds] of by) {
    const r = racks.get(id), taken = new Set();
    for (const d of ds) for (let u = d.u; u < d.u + (d.uSize ?? 1); u++) {
      assert.ok(u >= 1 && u <= r.heightU, `${d.id} U${u} outside ${id}`);
      assert.ok(!taken.has(u), `${d.id} overlaps another device at U${u} in ${id}`);
      taken.add(u);
    }
    assert.equal(taken.size, r.usedU, `${id}: devices take ${taken.size} U, record says ${r.usedU}`);
  }
});

test('GPU servers: each is a GPU device with 8 GPUs, in a real cluster', () => {
  const gpuDev = new Set(D.filter(d => d.role === 'GPU').map(d => d.id));
  const clusters = new Map(G.clusters.map(c => [c.id, c]));
  for (const n of G.nodes) {
    assert.ok(gpuDev.has(n.neId), `${n.neId} is not a GPU device`);
    assert.equal(n.gpus.length, 8);
    assert.ok(clusters.has(n.clusterId), `${n.neId}: cluster ${n.clusterId}`);
    assert.equal(clusters.get(n.clusterId).dcId, n.dcId);
  }
  for (const c of G.clusters) for (const id of c.nodes) assert.ok(G.nodes.some(n => n.neId === id), `${c.id} lists unknown node ${id}`);
});

test('modules belong to real devices; no readings leaked into the copy', () => {
  const ids = new Set(D.map(d => d.id));
  for (const m of M) assert.ok(ids.has(m.id));
  const g = G.nodes[0].gpus[0];
  for (const k of ['util', 'tempC', 'powerW', 'smActive', 'hbmC']) assert.ok(!(k in g), `GPU telemetry field ${k} must not be copied`);
  assert.ok(!('series' in G.nodes[0]) && !('load24h' in F[0].power) && !('icmp' in D[0]));
});

test('the default location roster is untouched by the data center copy', () => {
  assert.equal(roster.length, 12475);
  assert.equal(roster.filter(l => l.type === 'Datacenter').length, 829);
  assert.equal(roster.filter(l => l.type === 'POP').length, 2711);
  assert.equal(roster.filter(l => l.type !== 'Datacenter' && l.type !== 'POP').length, 8935);
  /* the sync never writes the roster: its five shared ids keep this app's own city and device counts */
  const ka = roster.find(l => l.id === 'KA-DC-008');
  assert.equal(ka.city, 'Bengaluru');
  assert.equal(ka.ne, 103);
});

test('the data center solution\'s data centers are the reference\'s own 24', () => {
  assert.equal(F.length, 24);
  assert.deepEqual(man.datacenterIds, F.map(f => f.id));
  for (const f of F) assert.ok(D.some(d => d.dcId === f.id), `${f.id} has no devices`);
});
