/* ── Site facility: power, space, ports, cabling ───────────
   One hand-written record for BGLK-277; every other site derives a
   consistent record from its NE count so no site lands on an empty tab.
   Sums are asserted at the bottom. */

export interface Feed { id: string; kind: 'AC' | 'DC'; source: string; rating: string; ratingKw: number; loadKw: number; status: 'Normal' | 'High' | 'Alarm' }
export interface Backup { kind: string; unit: string; rating: string; autonomy: string; lastTest: string; status: 'Normal' | 'Degraded' | 'Failed' }
export interface Rack { id: string; floor: string; room: string; role: string; u: number; used: number; kw: number; ports: number; portsUsed: number }
export interface PortClass { n: string; total: number; used: number }
export interface Equipment { id: string; name: string; kind: 'DWDM' | 'OADM' | 'Router' | 'Switch'; rack: string; ports: { in: string[]; out: string[] } }
/* A cable lands on one core of the site's incoming tray (IN-FDMS Port-<core>).
   It is patched either into an equipment IN port (`to`), optionally handed on
   from an equipment OUT port to a core of the outgoing tray (`onward`), or
   spliced straight through to the outgoing tray (`through`, no equipment). */
export interface Cable {
  id: string; core: number; from: { site: string; port: string };
  to?: { eq: string; port: string }; onward?: { port: string; core: number }; through?: number;
  strand: string; kind: 'Fibre' | 'Copper'; state: 'Active' | 'Planned' | 'Faulty';
}
export const CORES = 24;
export interface Facility {
  siteId: string;
  power: { supply: string; capacityKw: number; feeds: Feed[]; peak24Kw: number; load24: number[]; byUse: { n: string; kw: number }[]; backups: Backup[]; pue: number };
  floors: { n: string; rooms: string[] }[];
  racks: Rack[];
  portClasses: PortClass[];
  equipment: Equipment[];
  cables: Cable[];
}

const ports = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

const BGLK: Facility = {
  siteId: 'BGLK-277',
  power: {
    supply: 'AC mains 415 V 3-phase · DC −48 V plant',
    capacityKw: 24,
    feeds: [
      { id: 'AC-1', kind: 'AC', source: 'Utility feed A', rating: '63 A · 415 V', ratingKw: 12, loadKw: 6.4, status: 'Normal' },
      { id: 'AC-2', kind: 'AC', source: 'Utility feed B', rating: '32 A · 415 V', ratingKw: 6, loadKw: 4.9, status: 'High' },
      { id: 'DC-1', kind: 'DC', source: 'Rectifier RECT-01', rating: '48 V · 600 A', ratingKw: 6, loadKw: 3.2, status: 'Normal' }
    ],
    peak24Kw: 15.9,
    /* hourly load, 00:00 → now; the last reading is the live figure */
    load24: [13.1, 12.9, 12.8, 12.7, 12.8, 13.0, 13.4, 13.9, 14.6, 15.2, 15.6, 15.9, 15.7, 15.4, 15.1, 14.9, 14.8, 14.7, 14.6, 14.6, 14.5, 14.4, 14.4, 14.5],
    byUse: [{ n: 'Network equipment', kw: 9.6 }, { n: 'Cooling', kw: 3.7 }, { n: 'Lighting & other', kw: 1.2 }],
    backups: [
      { kind: 'DG set', unit: 'BGLK-277-DG-01', rating: '250 kVA', autonomy: '18 h @ 60 %', lastTest: '12-Aug-2026', status: 'Normal' },
      { kind: 'Battery bank', unit: 'BGLK-277-BATT-01', rating: '48 V · 800 Ah', autonomy: '2.4 h (was 4.0 h)', lastTest: '19-Jul-2026', status: 'Degraded' },
      { kind: 'Rectifier', unit: 'BGLK-277-RECT-01', rating: '48 V · 600 A', autonomy: '—', lastTest: '12-Aug-2026', status: 'Normal' }
    ],
    pue: 1.46
  },
  floors: [{ n: 'Ground', rooms: ['MDF', 'Power room'] }, { n: '1st floor', rooms: ['Equipment room A', 'Equipment room B'] }],
  racks: [
    { id: 'RACK-A', floor: '1st floor', room: 'Equipment room A', role: 'Core', u: 45, used: 31, kw: 4.2, ports: 336, portsUsed: 214 },
    { id: 'RACK-B', floor: '1st floor', room: 'Equipment room A', role: 'Aggregation', u: 45, used: 18, kw: 2.1, ports: 192, portsUsed: 88 },
    { id: 'RACK-C', floor: '1st floor', room: 'Equipment room B', role: 'Access', u: 42, used: 26, kw: 2.4, ports: 240, portsUsed: 131 },
    { id: 'RACK-D', floor: 'Ground', room: 'MDF', role: 'ODF / patching', u: 42, used: 12, kw: 0.3, ports: 288, portsUsed: 196 },
    { id: 'RACK-E', floor: 'Ground', room: 'Power room', role: 'Power', u: 42, used: 20, kw: 0.6, ports: 0, portsUsed: 0 }
  ],
  portClasses: [
    { n: '1G copper', total: 384, used: 212 }, { n: '10G SFP+', total: 288, used: 197 },
    { n: '100G QSFP', total: 96, used: 41 }, { n: 'Optical (ODF)', total: 288, used: 179 }
  ],
  equipment: [
    { id: 'EQ-DWDM', name: 'WR-ADVA-FSP3000-01', kind: 'DWDM', rack: 'RACK-A', ports: { in: ['P1-21851', 'P2-21852'], out: ['P1-21853', 'P2-21854'] } },
    { id: 'EQ-OADM', name: 'BGLK-OADM-100-01', kind: 'OADM', rack: 'RACK-A', ports: { in: ports('Port-', 4), out: ['Port-5', 'Port-6', 'Port-7', 'Port-8'] } },
    { id: 'EQ-RTR', name: 'NDLS-J960-P_R1-T1-NR', kind: 'Router', rack: 'RACK-A', ports: { in: ['xe-0/1/2', 'xe-0/3/1', 'et-0/0/12'], out: ['ge-0/0/1', 'ge-0/0/3', 'xe-0/2/0'] } },
    { id: 'EQ-SW', name: 'KA-BGLK-277-T-CHR-01', kind: 'Switch', rack: 'RACK-C', ports: { in: ports('Gi0/0/', 6), out: ['Gi0/0/7', 'Gi0/0/8', 'Gi0/0/9', 'Gi0/0/10', 'Gi0/0/11', 'Gi0/0/12'] } }
  ],
  /* 24-core incoming tray; 12 cores lit: 8 via equipment, 2 through, 2 planned */
  cables: [
    { id: 'C-01', core: 3,  from: { site: 'INDR-275 ODF-02', port: 'Port-3' },  to: { eq: 'EQ-DWDM', port: 'P1-21851' }, onward: { port: 'P1-21853', core: 1 },  strand: 'Blue',   kind: 'Fibre', state: 'Active' },
    { id: 'C-02', core: 10, from: { site: 'VJA-118 ODF-01', port: 'Port-9' },   to: { eq: 'EQ-DWDM', port: 'P2-21852' }, onward: { port: 'P2-21854', core: 9 },  strand: 'Orange', kind: 'Fibre', state: 'Active' },
    { id: 'C-03', core: 1,  from: { site: 'INDR-275 ODF-02', port: 'Port-1' },  to: { eq: 'EQ-OADM', port: 'Port-1' },   onward: { port: 'Port-5', core: 2 },    strand: 'Green',  kind: 'Fibre', state: 'Active' },
    { id: 'C-04', core: 2,  from: { site: 'INDR-275 ODF-02', port: 'Port-2' },  to: { eq: 'EQ-OADM', port: 'Port-2' },   onward: { port: 'Port-6', core: 4 },    strand: 'Brown',  kind: 'Fibre', state: 'Active' },
    { id: 'C-05', core: 5,  from: { site: 'DEL-279 ODF-03', port: 'Port-5' },   to: { eq: 'EQ-OADM', port: 'Port-3' },   strand: 'Slate',  kind: 'Fibre', state: 'Planned' },
    { id: 'C-06', core: 16, from: { site: 'MAS-041 ODF-01', port: 'Port-16' },  to: { eq: 'EQ-RTR', port: 'xe-0/1/2' },  onward: { port: 'ge-0/0/1', core: 5 },  strand: 'Yellow', kind: 'Fibre', state: 'Active' },
    { id: 'C-07', core: 18, from: { site: 'MAS-041 ODF-01', port: 'Port-18' },  to: { eq: 'EQ-RTR', port: 'xe-0/3/1' },  strand: 'Red',    kind: 'Fibre', state: 'Faulty' },
    { id: 'C-08', core: 12, from: { site: 'VJA-118 ODF-01', port: 'Port-12' },  to: { eq: 'EQ-RTR', port: 'et-0/0/12' }, onward: { port: 'ge-0/0/3', core: 7 },  strand: 'Violet', kind: 'Fibre', state: 'Active' },
    { id: 'C-09', core: 20, from: { site: 'BGLK-277 MDF', port: 'Port-8' },     to: { eq: 'EQ-SW', port: 'Gi0/0/1' },    onward: { port: 'Gi0/0/7', core: 20 }, strand: 'Aqua',   kind: 'Copper', state: 'Active' },
    { id: 'C-10', core: 21, from: { site: 'BGLK-277 MDF', port: 'Port-11' },    to: { eq: 'EQ-SW', port: 'Gi0/0/5' },    strand: 'Rose',   kind: 'Copper', state: 'Active' },
    { id: 'C-11', core: 8,  from: { site: 'INDR-275 ODF-02', port: 'Port-8' },  through: 8,  strand: 'Black',  kind: 'Fibre', state: 'Active' },
    { id: 'C-12', core: 11, from: { site: 'INDR-275 ODF-02', port: 'Port-11' }, through: 11, strand: 'White',  kind: 'Fibre', state: 'Active' }
  ]
};

/* a consistent record for any other site, scaled from its NE count */
function derive(siteId: string, ne: number): Facility {
  const s = Math.max(1, Math.round(ne / 5));
  const racks: Rack[] = Array.from({ length: Math.min(4, 1 + s) }, (_, i) => {
    const u = i % 2 ? 42 : 45, used = Math.min(u - 4, 10 + (ne * 3 + i * 7) % (u - 12));
    return { id: `RACK-${'ABCD'[i]}`, floor: i < 2 ? '1st floor' : 'Ground', room: i < 2 ? 'Equipment room' : 'MDF', role: ['Core', 'Aggregation', 'Access', 'ODF / patching'][i],
      u, used, kw: +(0.6 + used * 0.11).toFixed(1), ports: 48 * (2 + i), portsUsed: Math.round(48 * (2 + i) * (0.45 + (ne % 7) * 0.05)) };
  });
  const load = racks.reduce((a, r) => a + r.kw, 0);
  const cap = Math.ceil(load * 1.8 / 2) * 2;
  const acKw = +(load * 0.7).toFixed(1), dcKw = +(load - acKw).toFixed(1);
  return {
    siteId,
    power: { supply: 'AC mains 415 V 3-phase · DC −48 V plant', capacityKw: cap,
      feeds: [{ id: 'AC-1', kind: 'AC', source: 'Utility feed A', rating: '32 A · 415 V', ratingKw: +(cap * 0.7).toFixed(1), loadKw: acKw, status: acKw / (cap * 0.7) > 0.8 ? 'High' : 'Normal' },
              { id: 'DC-1', kind: 'DC', source: 'Rectifier RECT-01', rating: '48 V · 400 A', ratingKw: +(cap * 0.3).toFixed(1), loadKw: dcKw, status: 'Normal' }],
      peak24Kw: +(load * 1.12).toFixed(1),
      load24: Array.from({ length: 24 }, (_, h) => h === 23 ? +load.toFixed(1) : +Math.min(load * 1.12, load * (0.9 + 0.22 * Math.max(0, Math.sin((h - 5) / 24 * Math.PI)))).toFixed(1)),
      byUse: [{ n: 'Network equipment', kw: +(load * 0.66).toFixed(1) }, { n: 'Cooling', kw: +(load * 0.26).toFixed(1) }, { n: 'Lighting & other', kw: +(load - load * 0.66 - load * 0.26).toFixed(1) }],
      backups: [{ kind: 'DG set', unit: `${siteId}-DG-01`, rating: '125 kVA', autonomy: '12 h @ 60 %', lastTest: '02-Aug-2026', status: 'Normal' },
                { kind: 'Battery bank', unit: `${siteId}-BATT-01`, rating: '48 V · 400 Ah', autonomy: '3.1 h', lastTest: '02-Aug-2026', status: 'Normal' }],
      pue: 1.52 },
    floors: [{ n: 'Ground', rooms: ['MDF'] }, { n: '1st floor', rooms: ['Equipment room'] }],
    racks,
    portClasses: [{ n: '1G copper', total: 96 * racks.length, used: racks.reduce((a, r) => a + Math.round(r.portsUsed * 0.5), 0) },
                  { n: '10G SFP+', total: 48 * racks.length, used: racks.reduce((a, r) => a + Math.round(r.portsUsed * 0.35), 0) },
                  { n: 'Optical (ODF)', total: 96, used: Math.round(96 * 0.55) }],
    equipment: [{ id: 'EQ-RTR', name: `${siteId}-PE-01`, kind: 'Router', rack: 'RACK-A', ports: { in: ['xe-0/1/2', 'xe-0/3/1'], out: ['ge-0/0/1', 'ge-0/0/2'] } },
                { id: 'EQ-SW', name: `${siteId}-ACC-01`, kind: 'Switch', rack: 'RACK-B', ports: { in: ports('Gi0/0/', 4), out: ['Gi0/0/5', 'Gi0/0/6', 'Gi0/0/7', 'Gi0/0/8'] } }],
    cables: [{ id: 'C-01', core: 4, from: { site: 'BGLK-277 ODF-01', port: 'Port-4' }, to: { eq: 'EQ-RTR', port: 'xe-0/1/2' }, onward: { port: 'ge-0/0/1', core: 1 }, strand: 'Blue', kind: 'Fibre', state: 'Active' },
             { id: 'C-02', core: 7, from: { site: 'DEL-279 ODF-03', port: 'Port-7' }, to: { eq: 'EQ-RTR', port: 'xe-0/3/1' }, strand: 'Orange', kind: 'Fibre', state: 'Active' },
             { id: 'C-03', core: 2, from: { site: `${siteId} MDF`, port: 'Port-2' }, to: { eq: 'EQ-SW', port: 'Gi0/0/1' }, onward: { port: 'Gi0/0/5', core: 2 }, strand: 'Green', kind: 'Copper', state: 'Active' },
             { id: 'C-04', core: 6, from: { site: `${siteId} MDF`, port: 'Port-6' }, to: { eq: 'EQ-SW', port: 'Gi0/0/4' }, strand: 'Brown', kind: 'Copper', state: 'Planned' },
             { id: 'C-05', core: 9, from: { site: 'BGLK-277 ODF-01', port: 'Port-9' }, through: 9, strand: 'Slate', kind: 'Fibre', state: 'Active' }]
  };
}

export const facilityOf = (siteId: string, ne: number): Facility => siteId === 'BGLK-277' ? BGLK : derive(siteId, ne);

/* derived views */
export const totalLoad = (f: Facility) => f.power.feeds.reduce((a, x) => a + x.loadKw, 0);
export const uTotals = (f: Facility) => f.racks.reduce((a, r) => ({ u: a.u + r.u, used: a.used + r.used }), { u: 0, used: 0 });
export const portTotals = (f: Facility) => f.portClasses.reduce((a, p) => ({ total: a.total + p.total, used: a.used + p.used }), { total: 0, used: 0 });

/* self-check on the hand-written record */
(() => {
  const byUse = BGLK.power.byUse.reduce((a, x) => a + x.kw, 0), feeds = totalLoad(BGLK);
  if (Math.abs(byUse - feeds) > 0.05) throw new Error(`facility: use ${byUse} ≠ feeds ${feeds}`);
  if (feeds > BGLK.power.capacityKw) throw new Error('facility: load exceeds capacity');
  for (const r of BGLK.racks) if (r.used > r.u || r.portsUsed > r.ports) throw new Error('facility: rack over capacity ' + r.id);
  checkCables(BGLK);
})();

/* every cable lands on a distinct core; equipment ports exist and have the right direction */
export function checkCables(f: Facility) {
  const cores = new Set<number>(), outs = new Set<number>(), used = new Set<string>();
  for (const c of f.cables) {
    if (c.core < 1 || c.core > CORES || cores.has(c.core)) throw new Error('facility: bad or reused core ' + c.id);
    cores.add(c.core);
    if (!!c.to === !!c.through) throw new Error('facility: cable needs exactly one of to/through ' + c.id);
    if (c.through) { if (outs.has(c.through)) throw new Error('facility: reused out core ' + c.id); outs.add(c.through); continue; }
    const e = f.equipment.find(x => x.id === c.to!.eq);
    if (!e || !e.ports.in.includes(c.to!.port) || used.has(e.id + c.to!.port)) throw new Error('facility: cable to unknown or reused IN port ' + c.id);
    used.add(e.id + c.to!.port);
    if (c.onward) {
      if (!e.ports.out.includes(c.onward.port) || used.has(e.id + c.onward.port)) throw new Error('facility: onward from unknown or reused OUT port ' + c.id);
      used.add(e.id + c.onward.port);
      if (outs.has(c.onward.core)) throw new Error('facility: reused out core ' + c.id); outs.add(c.onward.core);
    }
  }
}
checkCables(derive('X-1', 12));
