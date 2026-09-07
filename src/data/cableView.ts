import type { Location } from './locations';
import { CORES, type Cable, type Equipment, type Facility } from './facility';

/* The Fiberneo cable view reads one `siteInfo` facility payload: equipment
   rows carrying their ports and `equipmentConnectivities`. This builds that
   payload from the facility ledger so the Site equipment tab draws the same
   cables the ledger declares — the host app will hand over a real payload of
   the same shape. */

interface Port { id: string; code: string; portType: 'IN' | 'OUT'; portNumber: number }
interface EqRef { id: string; name: string; code: string; type: string }
interface Conn {
  id: string; isDeleted: false;
  sourceEquipment: EqRef; sourcePort: Port; targetEquipment: EqRef; targetPort: Port;
  strand: { color: string }; status: string;
}
interface EqRow extends EqRef { status: string; noInPorts: number; noOutPorts: number; ports: Port[]; equipmentConnectivities: Conn[] }
export interface SiteInfo {
  id: string; name: string; code: string; address: string; type: string; technology: string; totalCores: number;
  equipments: EqRow[];
}

const KIND_TYPE: Record<Equipment['kind'], string> = { DWDM: 'DWDM', OADM: 'OADM', Router: 'Router', Switch: 'Switch' };

export function siteInfoFor(l: Location, f: Facility): SiteInfo {
  const port = (eq: string, code: string, portType: 'IN' | 'OUT', n: number): Port => ({ id: `${eq}:${code}`, code, portType, portNumber: n });
  const tray = (id: string, name: string, dir: 'IN' | 'OUT'): EqRow => ({
    id, name, code: name, type: name, status: 'Active', noInPorts: dir === 'IN' ? CORES : 0, noOutPorts: dir === 'OUT' ? CORES : 0,
    ports: Array.from({ length: CORES }, (_, i) => port(id, `Port-${i + 1}`, dir, i + 1)), equipmentConnectivities: []
  });
  /* the incoming tray's cores leave it (OUT) towards equipment; the outgoing tray's cores arrive (IN) */
  const inTray = tray(`${l.id}-IN-FDMS`, 'IN-FDMS', 'OUT');
  const outTray = tray(`${l.id}-OUT-FDMS`, 'OUT-FDMS', 'IN');
  const rows: EqRow[] = f.equipment.map(e => ({
    id: e.id, name: e.name, code: e.id, type: KIND_TYPE[e.kind], status: 'Active',
    noInPorts: e.ports.in.length, noOutPorts: e.ports.out.length,
    ports: [...e.ports.in.map((c, i) => port(e.id, c, 'IN', i + 1)), ...e.ports.out.map((c, i) => port(e.id, c, 'OUT', i + 1))],
    equipmentConnectivities: []
  }));
  const ref = (r: EqRow): EqRef => ({ id: r.id, name: r.name, code: r.code, type: r.type });
  const findPort = (r: EqRow, code: string) => { const p = r.ports.find(x => x.code === code); if (!p) throw new Error(`cable view: ${r.id} has no port ${code}`); return p; };
  let n = 0;
  const link = (on: EqRow, src: EqRow, sp: Port, tgt: EqRow, tp: Port, c: Cable) =>
    on.equipmentConnectivities.push({ id: `${c.id}-${++n}`, isDeleted: false, sourceEquipment: ref(src), sourcePort: sp, targetEquipment: ref(tgt), targetPort: tp, strand: { color: c.strand }, status: c.state });

  for (const c of f.cables) {
    const core = findPort(inTray, `Port-${c.core}`);
    if (c.through) { link(inTray, inTray, core, outTray, findPort(outTray, `Port-${c.through}`), c); continue; }
    const eq = rows.find(r => r.id === c.to!.eq)!;
    link(inTray, inTray, core, eq, findPort(eq, c.to!.port), c);
    if (c.onward) {
      link(eq, eq, findPort(eq, c.to!.port), eq, findPort(eq, c.onward.port), c);
      link(eq, eq, findPort(eq, c.onward.port), outTray, findPort(outTray, `Port-${c.onward.core}`), c);
    }
  }
  return {
    id: l.id, name: l.name, code: l.id, address: `${l.city}, ${l.state}`, type: l.type, technology: 'G.652D Single Mode', totalCores: CORES,
    equipments: [inTray, ...rows, outTray]
  };
}
