/* ── Derived views over one client's inventory ────────────────────────────
   Every count and relationship a screen shows comes from here, computed
   from the records themselves: rooms are the Room records (no room is
   added for drawing), PDUs are the PowerEquipment records of type PDU /
   RACK_PDU (never racks × 2), sensors are Sensor records (a rack showing a
   temperature reading is not a sensor), generators are every GENERATOR
   record. The same functions feed the summary strip, the grids, the floor
   plan, the rack view and the monitoring overlays, so they cannot disagree. */
import {
  PASSIVE_DEVICE, WHITE_SPACE, type Building, type Connection, type CoolingEquipment, type DataCenter, type Device,
  type Entities, type Floor, type FeedSide, type Port, type PowerEquipment, type PowerType, type Rack, type Room, type Row, type Sensor
} from './model';
import { rackPlacementProblems } from './validate';

export interface DcScope {
  dc: DataCenter;
  buildings: Building[]; floors: Floor[]; rooms: Room[]; rows: Row[]; racks: Rack[];
  devices: Device[]; ports: Port[]; connections: Connection[];
  power: PowerEquipment[]; cooling: CoolingEquipment[]; sensors: Sensor[];
}

const byLevel = (a: Floor, b: Floor) => a.level - b.level || a.name.localeCompare(b.name);
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, undefined, { numeric: true });

/** every record that belongs to one data center */
export function dcScope(e: Entities, dcId: string): DcScope | null {
  const dc = e.dataCenters.find(d => d.id === dcId);
  if (!dc) return null;
  const buildings = e.buildings.filter(b => b.dcId === dcId).sort(byName);
  const bIds = new Set(buildings.map(b => b.id));
  const floors = e.floors.filter(f => bIds.has(f.buildingId)).sort(byLevel);
  const fIds = new Set(floors.map(f => f.id));
  const rooms = e.rooms.filter(r => fIds.has(r.floorId)).sort(byName);
  const rIds = new Set(rooms.map(r => r.id));
  const rows = e.rows.filter(r => rIds.has(r.roomId)).sort(byName);
  const racks = e.racks.filter(r => rIds.has(r.roomId)).sort(byName);
  const rkIds = new Set(racks.map(r => r.id));
  const devices = e.devices.filter(d => (d.rackId && rkIds.has(d.rackId)) || (!d.rackId && d.roomId && rIds.has(d.roomId))).sort(byName);
  const dIds = new Set(devices.map(d => d.id));
  const ports = e.ports.filter(p => dIds.has(p.deviceId));
  const pIds = new Set(ports.map(p => p.id));
  const connections = e.connections.filter(c => pIds.has(c.aPortId) || pIds.has(c.bPortId));
  const power = e.powerEquipment.filter(p => p.dcId === dcId);
  const cooling = e.coolingEquipment.filter(c => c.dcId === dcId);
  const sensors = e.sensors.filter(s => rIds.has(s.roomId));
  return { dc, buildings, floors, rooms, rows, racks, devices, ports, connections, power, cooling, sensors };
}

export const floorsOf = (s: DcScope, buildingId: string) => s.floors.filter(f => f.buildingId === buildingId);
export const roomsOf = (s: DcScope, floorId: string) => s.rooms.filter(r => r.floorId === floorId);
export const racksOf = (s: DcScope, roomId: string) => s.racks.filter(r => r.roomId === roomId);
export const rowsOf = (s: DcScope, roomId: string) => s.rows.filter(r => r.roomId === roomId);
export const devicesIn = (s: DcScope, rackId: string) => s.devices.filter(d => d.rackId === rackId);
export const buildingOfFloor = (s: DcScope, floorId: string) => s.buildings.find(b => b.id === s.floors.find(f => f.id === floorId)?.buildingId);

export interface Counts {
  buildings: number; floors: number; rooms: number; whiteSpaceRooms: number; rows: number; racks: number;
  devices: number; activeDevices: number; mounted: number; unplaced: number;
  uTotal: number; uUsed: number;
  ports: number; physical: number; logical: number;
  power: Record<PowerType, number>; pdus: number; cooling: number; coolingKw: number; sensors: number;
  nameplateKw: number; designKw: number;
}

export function counts(s: Pick<DcScope, 'buildings' | 'floors' | 'rooms' | 'rows' | 'racks' | 'devices' | 'ports' | 'connections' | 'power' | 'cooling' | 'sensors'> & { dc?: DataCenter }): Counts {
  const power = Object.fromEntries(['UTILITY', 'TRANSFORMER', 'GENERATOR', 'SWITCHGEAR', 'ATS', 'UPS', 'RECTIFIER', 'BATTERY', 'PDU', 'RPP', 'RACK_PDU', 'CIRCUIT'].map(t => [t, 0])) as Record<PowerType, number>;
  for (const p of s.power) power[p.type]++;
  const rackIds = new Set(s.racks.map(r => r.id));
  const mounted = s.devices.filter(d => d.rackId && rackIds.has(d.rackId) && d.uStart);
  return {
    buildings: s.buildings.length, floors: s.floors.length, rooms: s.rooms.length,
    whiteSpaceRooms: s.rooms.filter(r => WHITE_SPACE.includes(r.type)).length,
    rows: s.rows.length, racks: s.racks.length,
    devices: s.devices.length, activeDevices: s.devices.filter(d => d.status === 'ACTIVE').length,
    mounted: mounted.length, unplaced: s.devices.length - mounted.length,
    uTotal: s.racks.reduce((a, r) => a + r.heightU, 0),
    uUsed: mounted.reduce((a, d) => a + Math.max(0, d.uHeight), 0),
    ports: s.ports.length,
    physical: s.connections.filter(c => c.kind === 'PHYSICAL').length,
    logical: s.connections.filter(c => c.kind === 'LOGICAL').length,
    power, pdus: power.PDU + power.RACK_PDU,
    cooling: s.cooling.length, coolingKw: s.cooling.reduce((a, c) => a + c.capacityKw, 0),
    sensors: s.sensors.length,
    nameplateKw: s.devices.reduce((a, d) => a + (d.powerW ?? 0), 0) / 1000,
    designKw: s.dc?.designKw ?? 0
  };
}

/* ---------- rack occupancy ---------- */

export interface RackOccupancy {
  rack: Rack;
  placed: Device[];
  /** in the rack but without a U position */
  unplaced: Device[];
  usedU: number; freeU: number;
  /** front-face free U runs, for "where does this fit" */
  freeRuns: { from: number; to: number }[];
  problems: ReturnType<typeof rackPlacementProblems>;
  nameplateKw: number;
}

export function rackOccupancy(rack: Rack, devices: Device[]): RackOccupancy {
  const inRack = devices.filter(d => d.rackId === rack.id);
  const placed = inRack.filter(d => d.uStart).sort((a, b) => b.uStart! - a.uStart!);
  const unplaced = inRack.filter(d => !d.uStart);
  const front = new Array(rack.heightU + 1).fill(false);
  for (const d of placed) for (let u = d.uStart!; u < d.uStart! + d.uHeight && u <= rack.heightU; u++) if (d.face === 'FRONT' || d.fullDepth) front[u] = true;
  const usedU = front.filter(Boolean).length;
  const freeRuns: { from: number; to: number }[] = [];
  for (let u = 1; u <= rack.heightU; u++) {
    if (front[u]) continue;
    const from = u; while (u + 1 <= rack.heightU && !front[u + 1]) u++;
    freeRuns.push({ from, to: u });
  }
  return {
    rack, placed, unplaced, usedU, freeU: rack.heightU - usedU, freeRuns,
    problems: rackPlacementProblems(rack, inRack),
    nameplateKw: inRack.reduce((a, d) => a + (d.powerW ?? 0), 0) / 1000
  };
}

/* ---------- power paths ---------- */

export interface PowerPath { side: FeedSide; chain: PowerEquipment[] }

/** upstream equipment of a node, nearest first; branches (an ATS fed by utility and generator) are all listed */
export function upstream(e: Entities, id: string, seen = new Set<string>()): PowerEquipment[] {
  const out: PowerEquipment[] = [];
  for (const pc of e.powerConnections.filter(c => c.toId === id && c.status !== 'DECOMMISSIONED')) {
    if (seen.has(pc.fromId)) continue;
    seen.add(pc.fromId);
    const p = e.powerEquipment.find(x => x.id === pc.fromId);
    if (!p) continue;
    out.push(p, ...upstream(e, p.id, seen));
  }
  return out;
}

export type Redundancy = 'A+B' | 'A only' | 'B only' | 'single feed' | 'no feed recorded';
export interface RackPower {
  rackPdus: PowerEquipment[];
  paths: PowerPath[];
  redundancy: Redundancy;
}

/** how a rack is fed: its rack PDUs (PowerEquipment.rackId) and direct feeds, traced upstream */
export function rackPower(e: Entities, rack: Rack): RackPower {
  const rackPdus = e.powerEquipment.filter(p => p.rackId === rack.id && p.type === 'RACK_PDU').sort(byName);
  const paths: PowerPath[] = [];
  for (const pdu of rackPdus) paths.push({ side: pdu.side, chain: [pdu, ...upstream(e, pdu.id)] });
  for (const pc of e.powerConnections.filter(c => c.toId === rack.id)) {
    const src = e.powerEquipment.find(x => x.id === pc.fromId);
    if (src) paths.push({ side: pc.side !== 'N' ? pc.side : src.side, chain: [src, ...upstream(e, src.id)] });
  }
  const sides = new Set(paths.map(p => p.side));
  const redundancy: Redundancy = !paths.length ? 'no feed recorded'
    : sides.has('A') && sides.has('B') ? 'A+B' : sides.has('A') ? 'A only' : sides.has('B') ? 'B only' : 'single feed';
  return { rackPdus, paths, redundancy };
}

/** downstream racks and devices of a power node (for "what does this UPS feed") */
export function downstream(e: Entities, id: string, seen = new Set<string>()): { racks: Set<string>; devices: Set<string>; equipment: Set<string> } {
  const out = { racks: new Set<string>(), devices: new Set<string>(), equipment: new Set<string>() };
  for (const pc of e.powerConnections.filter(c => c.fromId === id && c.status !== 'DECOMMISSIONED')) {
    if (seen.has(pc.toId)) continue;
    seen.add(pc.toId);
    if (e.racks.some(r => r.id === pc.toId)) out.racks.add(pc.toId);
    else if (e.devices.some(d => d.id === pc.toId)) out.devices.add(pc.toId);
    else if (e.powerEquipment.some(p => p.id === pc.toId)) {
      out.equipment.add(pc.toId);
      const p = e.powerEquipment.find(x => x.id === pc.toId)!;
      if (p.rackId) out.racks.add(p.rackId);
      const sub = downstream(e, pc.toId, seen);
      sub.racks.forEach(x => out.racks.add(x)); sub.devices.forEach(x => out.devices.add(x)); sub.equipment.forEach(x => out.equipment.add(x));
    }
  }
  return out;
}

/** groups of power equipment that back each other up, with their combined rating */
export function redundancyGroups(power: PowerEquipment[]) {
  const g = new Map<string, PowerEquipment[]>();
  for (const p of power) if (p.redundancyGroup) { const l = g.get(p.redundancyGroup) ?? []; l.push(p); g.set(p.redundancyGroup, l); }
  return [...g.entries()].map(([name, units]) => ({ name, units, ratingKw: units.reduce((a, u) => a + (u.ratingKw ?? 0), 0) }));
}

/* ---------- connectivity ---------- */

export interface PortLink { port: Port; connection: Connection; far: Port; farDevice?: Device }

export function deviceLinks(s: Pick<DcScope, 'ports' | 'connections' | 'devices'>, allPorts: Port[], allDevices: Device[], deviceId: string): PortLink[] {
  const mine = s.ports.filter(p => p.deviceId === deviceId);
  const out: PortLink[] = [];
  for (const port of mine) for (const c of s.connections.filter(x => x.aPortId === port.id || x.bPortId === port.id)) {
    const farId = c.aPortId === port.id ? c.bPortId : c.aPortId;
    const far = allPorts.find(p => p.id === farId);
    if (far) out.push({ port, connection: c, far, farDevice: allDevices.find(d => d.id === far.deviceId) });
  }
  return out;
}

/** ports with no cable on them */
export const freePorts = (s: Pick<DcScope, 'ports' | 'connections'>) => {
  const used = new Set(s.connections.filter(c => c.kind === 'PHYSICAL').flatMap(c => [c.aPortId, c.bPortId]));
  return s.ports.filter(p => !used.has(p.id));
};

/** device-level graph from PHYSICAL cables, collapsing patch panels into pass-throughs
    is NOT done: physical topology keeps every panel; logical topology uses only LOGICAL rows */
export function deviceGraph(s: Pick<DcScope, 'ports' | 'connections' | 'devices'>, kind: 'PHYSICAL' | 'LOGICAL') {
  const portDev = new Map(s.ports.map(p => [p.id, p.deviceId]));
  const edges = new Map<string, { a: string; b: string; connections: Connection[] }>();
  for (const c of s.connections.filter(x => x.kind === kind)) {
    const a = portDev.get(c.aPortId), b = portDev.get(c.bPortId);
    if (!a || !b) continue;
    const k = [a, b].sort().join('|');
    const e = edges.get(k) ?? { a: [a, b].sort()[0], b: [a, b].sort()[1], connections: [] };
    e.connections.push(c); edges.set(k, e);
  }
  const ids = new Set([...edges.values()].flatMap(e => [e.a, e.b]));
  return { nodes: s.devices.filter(d => ids.has(d.id)), edges: [...edges.values()] };
}

export const isPassive = (d: Device) => PASSIVE_DEVICE.includes(d.type);
