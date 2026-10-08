/* ── Inventory findings: what in this data center's records deserves a look ──
   Facts read off the uploaded records themselves — placement conflicts,
   devices with no U, racks fed on one side or not at all, nameplate above
   budget, halls without cooling or sensors. No telemetry is involved.
   Each item carries where it is (floor › room › rack). */
import type { Entities } from './model';
import { dcScope, rackOccupancy, rackPower, type DcScope } from './derive';

export type FindingSeverity = 'critical' | 'major' | 'minor';
export interface Finding {
  id: string; severity: FindingSeverity; kind: 'inventory';
  title: string; detail?: string;
  floorId?: string; roomId?: string; rackId?: string; deviceId?: string;
}

const SEV: Record<FindingSeverity, number> = { critical: 0, major: 1, minor: 2 };

export function findings(e: Entities, dcId: string): Finding[] {
  const s = dcScope(e, dcId);
  if (!s) return [];
  const out: Finding[] = [];
  const at = (rackId?: string, roomId?: string) => {
    const rk = rackId ? s.racks.find(r => r.id === rackId) : undefined;
    const room = s.rooms.find(r => r.id === (roomId ?? rk?.roomId));
    return { rackId: rk?.id, roomId: room?.id, floorId: room?.floorId };
  };

  for (const rk of s.racks) {
    const o = rackOccupancy(rk, s.devices);
    for (const p of o.problems) out.push({ id: `pl-${p.deviceId}`, severity: 'major', kind: 'inventory', title: p.code === 'u-overlap' ? 'Rack-unit overlap' : 'Device above rack top', detail: p.message, deviceId: p.deviceId, ...at(rk.id) });
    if (o.unplaced.length) out.push({ id: `un-${rk.id}`, severity: 'minor', kind: 'inventory', title: `${o.unplaced.length} device${o.unplaced.length > 1 ? 's' : ''} without a U position`, detail: o.unplaced.slice(0, 3).map(d => d.name).join(', ') + (o.unplaced.length > 3 ? '…' : ''), ...at(rk.id) });
    if (rk.maxKw && o.nameplateKw > rk.maxKw) out.push({ id: `bud-${rk.id}`, severity: 'major', kind: 'inventory', title: 'Nameplate power above rack budget', detail: `${o.nameplateKw.toFixed(1)} kW of ${rk.maxKw} kW`, ...at(rk.id) });
  }
  if (s.power.length) {
    /* racks that hold powered equipment; ODF / patch-panel-only racks need no feed */
    const fed = s.racks.map(r => ({ r, p: rackPower(e, r) })).filter(x => s.devices.some(d => d.rackId === x.r.id && d.type !== 'PATCH_PANEL' && d.type !== 'ODF'));
    const one = fed.filter(x => x.p.redundancy === 'A only' || x.p.redundancy === 'B only' || x.p.redundancy === 'single feed');
    const none = fed.filter(x => x.p.redundancy === 'no feed recorded');
    if (one.length) out.push({ id: 'single-fed', severity: 'major', kind: 'inventory', title: `${one.length} rack${one.length > 1 ? 's' : ''} on a single power feed`, detail: one.slice(0, 4).map(x => x.r.name).join(', ') + (one.length > 4 ? '…' : ''), ...at(one[0].r.id) });
    if (none.length && none.length < fed.length) out.push({ id: 'no-feed', severity: 'minor', kind: 'inventory', title: `${none.length} rack${none.length > 1 ? 's' : ''} with no feed recorded`, detail: none.slice(0, 4).map(x => x.r.name).join(', ') + (none.length > 4 ? '…' : ''), ...at(none[0].r.id) });
  }
  for (const room of s.rooms.filter(r => r.type === 'DATA_HALL' || r.type === 'NETWORK')) {
    const racks = s.racks.filter(r => r.roomId === room.id);
    if (!racks.length) continue;
    if (s.cooling.length && !s.cooling.some(c => c.roomId === room.id)) out.push({ id: `cool-${room.id}`, severity: 'major', kind: 'inventory', title: 'No cooling unit recorded', detail: room.name, ...at(undefined, room.id) });
    if (s.sensors.length && !s.sensors.some(x => x.roomId === room.id)) out.push({ id: `sens-${room.id}`, severity: 'minor', kind: 'inventory', title: 'No environmental sensor recorded', detail: room.name, ...at(undefined, room.id) });
  }

  return out.sort((a, b) => SEV[a.severity] - SEV[b.severity] || a.title.localeCompare(b.title));
}

export const worst = (f: Finding[]): FindingSeverity | null => f.length ? f.reduce<FindingSeverity>((w, x) => SEV[x.severity] < SEV[w] ? x.severity : w, 'minor') : null;

/** "Level 1 › Data hall 1 › Rack A01" */
export function pathOf(s: DcScope, f: Pick<Finding, 'floorId' | 'roomId' | 'rackId'>) {
  return [s.floors.find(x => x.id === f.floorId)?.name, s.rooms.find(x => x.id === f.roomId)?.name, f.rackId ? `Rack ${s.racks.find(x => x.id === f.rackId)?.name}` : undefined].filter(Boolean).join(' › ');
}
