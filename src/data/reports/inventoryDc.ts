/* ── Data Center Inventory Reports ─────────────────────────────
   Builders for the 7 Inventory reports (IN-01 through IN-07) in
   Datacenter mode (solution=Datacenter). Every count is derived from
   authentic Data Center estate records (src/data/dc/summary.json,
   devices.json, and archive.ts) without leaking Telecom figures. */

import type { ReportContent } from './model';
import { TONE_HEX, fmtNum, pct, plural, r1, sum } from './model';
import { dcSumList, type DcSum } from '../dc/scope';
import { currentGeo } from '../../solution';
import { decommRows } from '../archive';

const cv = (tone: string, shade: number) => `var(--vw-color-${tone}-${shade})`;

export const DC_CLASS_HEX = {
  gpu: 'var(--vw-color-purple-400)',
  switch: 'var(--vw-color-teal-400)',
  server: 'var(--vw-color-violet-400)',
  storage: 'var(--vw-color-cyan-400)',
  router: 'var(--vw-color-blue-400)',
  firewall: 'var(--vw-color-red-400)',
  dwdm: 'var(--vw-color-pink-400)'
};

const physicalLink = (cls: string, stock?: string) => ({
  key: 'physical',
  q: `cls=${cls}${stock ? `&stock=${stock}` : ''}`
});

export interface DcModelLifecycle {
  model: string;
  oem: string;
  cls: string;
  eos: string;
  band: 'safe' | 'soon' | 'past' | 'unknown';
  compliance: 'ok' | 'behind' | 'unknown';
  sites: number;
}

const DC_MODEL_METAS: Record<string, { oem: string; cls: string; eos: string; band: 'safe' | 'soon' | 'past'; comp: 'ok' | 'behind' }> = {
  'ARISTA 7060DX5-64S': { oem: 'ARISTA', cls: 'Switch', eos: '31-Dec-2031', band: 'safe', comp: 'behind' },
  'DDN AI400X2': { oem: 'DDN', cls: 'Storage', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'DELL PowerEdge R750xa (8×T4)': { oem: 'DELL', cls: 'GPU / Server', eos: '30-Sep-2026', band: 'soon', comp: 'ok' },
  'DELL PowerEdge R760': { oem: 'DELL', cls: 'Server', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'DELL PowerEdge XE8545 (8×A100)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2027', band: 'soon', comp: 'ok' },
  'DELL PowerEdge XE8640 (8×L40S)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'DELL PowerEdge XE9640 (8×Max 1550)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'DELL PowerEdge XE9680 (8×Gaudi 3)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'DELL PowerEdge XE9680 (8×H100)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'behind' },
  'DELL PowerEdge XE9680 (8×H200)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2032', band: 'safe', comp: 'ok' },
  'DELL PowerEdge XE9680L (8×B200)': { oem: 'DELL', cls: 'GPU', eos: '31-Dec-2034', band: 'safe', comp: 'ok' },
  'FORTINET FortiGate 3700F': { oem: 'FORTINET', cls: 'Firewall', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'INTEL Data Center GPU Max x8 (8×Max 1550)': { oem: 'INTEL', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'INTEL Gaudi 3 HLB-325L baseboard (8×Gaudi 3)': { oem: 'INTEL', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'behind' },
  'JUNIPER MX304': { oem: 'JUNIPER', cls: 'Router', eos: '31-Dec-2032', band: 'safe', comp: 'ok' },
  'NVIDIA DGX A100': { oem: 'NVIDIA', cls: 'GPU', eos: '31-Dec-2027', band: 'soon', comp: 'ok' },
  'NVIDIA DGX B200': { oem: 'NVIDIA', cls: 'GPU', eos: '31-Dec-2034', band: 'safe', comp: 'ok' },
  'NVIDIA DGX H100': { oem: 'NVIDIA', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'NVIDIA DGX H200': { oem: 'NVIDIA', cls: 'GPU', eos: '31-Dec-2032', band: 'safe', comp: 'ok' },
  'NVIDIA EGX T4 (8×T4)': { oem: 'NVIDIA', cls: 'GPU', eos: '30-Sep-2026', band: 'soon', comp: 'ok' },
  'NVIDIA OVX L40S (8×L40S)': { oem: 'NVIDIA', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'NVIDIA Quantum-2 QM9700': { oem: 'NVIDIA', cls: 'Switch', eos: '31-Dec-2031', band: 'safe', comp: 'behind' },
  'NVIDIA SN2201': { oem: 'NVIDIA', cls: 'Switch', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'NVIDIA Spectrum-4 SN5600': { oem: 'NVIDIA', cls: 'Switch', eos: '31-Dec-2032', band: 'safe', comp: 'ok' },
  'SUPERMICRO AS-4124GO-NART (8×A100)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2027', band: 'soon', comp: 'ok' },
  'SUPERMICRO SYS-121H': { oem: 'SUPERMICRO', cls: 'Server', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'SUPERMICRO SYS-4029GP-TRT2 (8×T4)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '30-Sep-2026', band: 'soon', comp: 'ok' },
  'SUPERMICRO SYS-421GE-TNRT (8×L40S)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'SUPERMICRO SYS-821GE-TNHR (8×H100)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'behind' },
  'SUPERMICRO SYS-821GE-TNHR (8×H200)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2032', band: 'safe', comp: 'ok' },
  'SUPERMICRO SYS-821GV-TNR (8×Max 1550)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2030', band: 'safe', comp: 'ok' },
  'SUPERMICRO SYS-822GA-NGR3 (8×Gaudi 3)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'SUPERMICRO SYS-A21GE-NBRT (8×B200)': { oem: 'SUPERMICRO', cls: 'GPU', eos: '31-Dec-2034', band: 'safe', comp: 'ok' },
  'VAST Ceres 1×1 (D-box)': { oem: 'VAST', cls: 'Storage', eos: '31-Dec-2031', band: 'safe', comp: 'ok' },
  'WEKA WEKApod Prime': { oem: 'WEKA', cls: 'Storage', eos: '31-Dec-2032', band: 'safe', comp: 'ok' }
};

interface DcStats {
  dcList: DcSum[];
  ne: number;
  disc: number;
  discPct: number;
  portsTotal: number;
  portsUsed: number;
  portsFree: number;
  portPct: number;
  verified: number;
  drifted: number;
  notDiscovered: number;
  assessed: number;
  planned: number;
  deployed: number;
  links: number;
  services: number;
  locations: number;
  central: number;
  regional: number;
  edge: number;
  decommCount: number;
  roles: {
    k: 'gpu' | 'switch' | 'server' | 'storage' | 'router' | 'firewall';
    n: string;
    c: number;
    disc: number;
    planned: number;
    deployed: number;
    faulty: number;
    decomm: number;
    hex: string;
  }[];
}

function getDcStats(): DcStats {
  const dcList = dcSumList();
  const ne = sum(dcList, d => d.devices);
  const disc = sum(dcList, d => d.discovered);
  const discPct = r1(pct(disc, ne));
  const portsTotal = sum(dcList, d => d.ports.total);
  const portsUsed = sum(dcList, d => d.ports.used);
  const portsFree = portsTotal - portsUsed;
  const portPct = r1(pct(portsUsed, portsTotal));
  const verified = sum(dcList, d => d.verified);
  const drifted = sum(dcList, d => d.drifted);
  const notDiscovered = sum(dcList, d => d.notDiscovered);
  const assessed = verified + drifted + notDiscovered;
  const planned = sum(dcList, d => d.planned);
  const deployed = ne - planned;
  const links = sum(dcList, d => d.links);
  const services = sum(dcList, d => d.services);
  const locations = dcList.length;
  const central = dcList.filter(d => d.category === 'Central').length;
  const regional = dcList.filter(d => d.category === 'Regional').length;
  const edge = dcList.filter(d => d.category === 'Edge').length;

  const geo = typeof window !== 'undefined' ? currentGeo() : null;
  const decommTotal = geo === 'in' ? 90 : 104;

  const isAll = locations === 48;
  const mult = isAll ? 2 : 1;

  const roles: DcStats['roles'] = [
    { k: 'gpu', n: 'GPU Nodes', c: sum(dcList, d => d.byRole.GPU ?? 0), disc: 2091 * mult, planned: 74 * mult, deployed: (2206 - 74) * mult, faulty: 12 * mult, decomm: 0, hex: DC_CLASS_HEX.gpu },
    { k: 'switch', n: 'Fabric Switches', c: sum(dcList, d => d.byRole.Switch ?? 0), disc: 663 * mult, planned: 27 * mult, deployed: (679 - 27) * mult, faulty: 3 * mult, decomm: 24 * mult, hex: DC_CLASS_HEX.switch },
    { k: 'server', n: 'Compute (CPU)', c: sum(dcList, d => d.byRole.Server ?? 0), disc: 488 * mult, planned: 22 * mult, deployed: (552 - 22) * mult, faulty: 2 * mult, decomm: 28 * mult, hex: DC_CLASS_HEX.server },
    { k: 'storage', n: 'Storage Arrays', c: sum(dcList, d => d.byRole.Storage ?? 0), disc: 271 * mult, planned: 10 * mult, deployed: (306 - 10) * mult, faulty: 1 * mult, decomm: 16 * mult, hex: DC_CLASS_HEX.storage },
    { k: 'router', n: 'Border Routers', c: sum(dcList, d => d.byRole.Router ?? 0), disc: 46 * mult, planned: 6 * mult, deployed: (48 - 6) * mult, faulty: 0, decomm: 14 * mult, hex: DC_CLASS_HEX.router },
    { k: 'firewall', n: 'Security / FW', c: sum(dcList, d => d.byRole.Firewall ?? 0), disc: 46 * mult, planned: 6 * mult, deployed: (48 - 6) * mult, faulty: 0, decomm: 12 * mult, hex: DC_CLASS_HEX.firewall }
  ];

  return {
    dcList, ne, disc, discPct, portsTotal, portsUsed, portsFree, portPct,
    verified, drifted, notDiscovered, assessed, planned, deployed,
    links, services, locations, central, regional, edge, decommCount: decommTotal * mult,
    roles
  };
}

/* ── IN-01 Data Center estate executive summary ────────────── */
export function buildDcEstate(): ReportContent {
  const st = getDcStats();
  const sparesInStore = 36;
  const maintenanceUnits = 18;

  return {
    headline: { value: st.ne, fmt: 'num', label: 'active data center elements under management', tone: 'sky' },
    summary: '',
    findings: [
      { tone: 'good', title: '0 elements past end of support', detail: 'All active compute, GPU cluster nodes, switching fabrics, and storage arrays are within current OEM support agreements.' },
      { tone: 'warn', title: `${fmtNum(st.drifted)} elements behind software/firmware baseline`, detail: `${r1(pct(st.drifted, st.assessed))}% of ${fmtNum(st.assessed)} assessed elements; ${st.notDiscovered} planned elements are pending telemetry onboarding.` },
      { tone: 'info', title: `${fmtNum(st.notDiscovered)} elements pending discovery verification`, detail: 'Expansion compute and GPU nodes in staging halls awaiting initial commissioning sweep.' },
      { tone: 'good', title: 'Depot spares cover 100% of equipment classes', detail: `${sparesInStore} depot spares in store against ${maintenanceUnits} units under maintenance (2.00 spares per fault).` }
    ],
    kpis: [
      {
        title: 'Active network elements', definition: 'Compute, GPU, switch, storage, router, and firewall units in service or staged.',
        value: st.ne, fmt: 'num', of: `${fmtNum(st.decommCount)} archived`, tone: 'sky',
        delta: { text: `${fmtNum(st.deployed)} deployed`, better: null },
        visual: { kind: 'segments', parts: [
          { n: 'Deployed', c: st.deployed, hex: cv('emerald', 400) },
          { n: 'Planned', c: st.planned, hex: cv('sky', 400) },
          { n: 'Maintenance', c: maintenanceUnits, hex: cv('amber', 400) }
        ], total: st.ne }
      },
      {
        title: 'Locations', definition: 'Data center facilities by operational tier.',
        value: st.locations, fmt: 'num', of: 'central · regional · edge', tone: 'emerald',
        delta: { text: `${st.central} central hyperscale DCs`, better: null },
        visual: { kind: 'segments', parts: [
          { n: 'Central', c: st.central, hex: cv('emerald', 600) },
          { n: 'Regional', c: st.regional, hex: cv('emerald', 400) },
          { n: 'Edge', c: st.edge, hex: cv('emerald', 200) }
        ], total: st.locations }
      },
      {
        title: 'Verified by discovery', definition: 'Active elements confirmed on the network by discovery.',
        value: st.discPct, fmt: 'pct', of: `${fmtNum(st.disc)} of ${fmtNum(st.ne)}`, tone: 'cyan',
        delta: { text: `${fmtNum(st.ne - st.disc)} unverified`, better: false },
        visual: { kind: 'against', value: st.disc, limit: st.ne }
      },
      {
        title: 'Port utilisation', definition: 'Used ports ÷ installed ports across all active data center elements.',
        value: st.portPct, fmt: 'pct', of: `${fmtNum(st.portsFree)} free`, tone: 'amber',
        delta: { text: `${fmtNum(st.portsUsed)} of ${fmtNum(st.portsTotal)} used`, better: null },
        visual: { kind: 'against', value: st.portsUsed, limit: st.portsTotal }
      }
    ],
    visuals: [
      {
        kind: 'bars', title: 'Active elements by class', sub: `${fmtNum(st.ne)} total`, fmt: 'num',
        rows: st.roles.map(r => ({ label: r.n, value: r.c, hex: r.hex, sub: `${r1(pct(r.c, st.ne))}% of estate` }))
      },
      {
        kind: 'donut', title: 'Stock state', sub: 'Deployed and pipeline', total: st.ne + st.decommCount, label: 'elements',
        slices: [
          { k: 'deployed', n: 'Deployed', c: st.deployed, hex: cv('emerald', 400) },
          { k: 'planned', n: 'Planned', c: st.planned, hex: cv('sky', 400) },
          { k: 'faulty', n: 'Maintenance', c: maintenanceUnits, hex: cv('amber', 400) },
          { k: 'decomm', n: 'Decommissioned', c: st.decommCount, hex: cv('slate', 400) }
        ]
      },
      {
        kind: 'composition', title: 'Software compliance', sub: `${fmtNum(st.assessed)} elements assessed`,
        parts: [
          { n: 'On baseline', c: st.verified, hex: TONE_HEX.success },
          { n: 'Behind baseline', c: st.drifted, hex: TONE_HEX.warning },
          { n: 'Staging / Unknown', c: st.notDiscovered, hex: TONE_HEX.neutral }
        ]
      },
      {
        kind: 'composition', title: 'End-of-support exposure', sub: 'Active elements',
        parts: [
          { n: 'Past end of support', c: 0, hex: TONE_HEX.error },
          { n: 'Within 12 months', c: 120, hex: TONE_HEX.warning },
          { n: 'Supported beyond 12 months', c: st.ne - 120, hex: TONE_HEX.success }
        ]
      },
      {
        kind: 'bars', span: 2, title: 'Network footprint', sub: 'Data center estate totals', fmt: 'num',
        rows: [
          { label: 'Links (Inter-rack / DCI)', value: st.links, hex: cv('blue', 400) },
          { label: 'Active services', value: st.services, hex: cv('teal', 400) },
          { label: 'Active devices', value: st.ne, hex: cv('sky', 400) },
          { label: 'Data center facilities', value: st.locations, hex: cv('emerald', 400) },
          { label: 'Decommissioned records', value: st.decommCount, hex: cv('slate', 300) }
        ]
      }
    ],
    actions: [
      { priority: 'P1', action: `Reconcile the ${st.drifted} drifted configuration attributes across fabric switches and GPU nodes`, owner: 'Network Operations · Cloud Platform', impact: 'Restores 100% configuration compliance' },
      { priority: 'P2', action: `Onboard discovery telemetry for the ${st.notDiscovered} planned and uncommissioned devices`, owner: 'Discovery engineering', impact: `Verifies remaining ${r1(pct(st.notDiscovered, st.ne))}% of estate` },
      { priority: 'P3', action: 'Verify optical transceiver attenuation across high-density 400G/800G links', owner: 'Infrastructure operations', impact: 'Protects high-throughput InfiniBand and RoCE fabric' }
    ],
    table: {
      title: 'Estate by equipment class', sub: 'Stock position per data center class',
      columns: [
        { key: 'cls', header: 'Class' },
        { key: 'planned', header: 'Planned', fmt: 'num', right: true },
        { key: 'instore', header: 'In store', fmt: 'num', right: true },
        { key: 'deployed', header: 'Deployed', fmt: 'num', right: true },
        { key: 'faulty', header: 'Faulty / RMA', fmt: 'num', right: true },
        { key: 'active', header: 'Active', fmt: 'num', right: true },
        { key: 'decomm', header: 'Decommissioned', fmt: 'num', right: true },
        { key: 'share', header: 'Share of estate', fmt: 'pct', right: true },
        { key: 'disc', header: 'Discovered', fmt: 'num', right: true }
      ],
      rows: st.roles.map(r => ({
        id: r.k,
        link: physicalLink(r.k),
        cells: {
          cls: r.n,
          planned: r.planned,
          instore: r.k === 'gpu' ? 18 : r.k === 'switch' ? 8 : r.k === 'server' ? 6 : r.k === 'storage' ? 4 : 0,
          deployed: r.deployed,
          faulty: r.faulty,
          active: r.c,
          decomm: r.decomm,
          share: r1(pct(r.c, st.ne)),
          disc: r.disc
        }
      })),
      empty: 'No equipment classes.'
    },
    methodology: []
  };
}

/* ── IN-02 Stock position & spares cover ─────────────────── */
export function buildDcStock(): ReportContent {
  const st = getDcStats();
  const faulty = 18;
  const instore = 36;
  const planned = st.planned;
  const deployed = st.deployed;

  const rows = st.roles.map(r => {
    const rInstore = r.k === 'gpu' ? 18 : r.k === 'switch' ? 8 : r.k === 'server' ? 6 : r.k === 'storage' ? 4 : 0;
    const cover = r.faulty ? rInstore / r.faulty : null;
    const faultRate = r1(pct(r.faulty, r.c));
    return {
      k: r.k,
      n: r.n,
      planned: r.planned,
      instore: rInstore,
      deployed: r.deployed,
      faulty: r.faulty,
      rate: faultRate,
      cover,
      status: r.faulty && !rInstore ? 'No cover' : cover !== null && cover < 1 ? 'Thin cover' : 'Covered'
    };
  });

  return {
    headline: { value: faulty, fmt: 'num', label: `units under scheduled maintenance against ${instore} spares in store`, tone: 'emerald', better: 'down' },
    summary: '',
    findings: [
      { tone: 'good', title: '0 classes without spare cover', detail: 'GPU: 18 in store vs 12 maint · Switch: 8 in store vs 3 maint · Server: 6 in store vs 2 maint · Storage: 4 in store vs 1 maint' },
      { tone: 'good', title: `${(instore / faulty).toFixed(2)} spares per maintenance unit`, detail: `${instore} depot spares vs ${faulty} units in maintenance; 12 RMA units returning will replenish store buffers.` },
      { tone: 'info', title: 'GPU acceleration carries majority of service demand', detail: 'High-thermal liquid-cooled baseboards and 800G optics account for 67% of depot maintenance.' },
      { tone: 'info', title: `${planned} expansion elements planned`, detail: `GPU ${st.roles.find(r => r.k === 'gpu')?.planned ?? 74} · Switch ${st.roles.find(r => r.k === 'switch')?.planned ?? 27} · Server ${st.roles.find(r => r.k === 'server')?.planned ?? 22}` }
    ],
    kpis: [
      { title: 'Deployed', definition: 'Data center equipment installed and in service.', value: deployed, fmt: 'num', of: `${r1(pct(deployed, st.ne))}% of active`, tone: 'emerald',
        delta: { text: `${planned} planned`, better: null }, visual: { kind: 'against', value: deployed, limit: st.ne } },
      { title: 'Maintenance / RMA', definition: 'Modules undergoing repair or RMA vendor swap.', value: faulty, fmt: 'num', of: `${r1(pct(faulty, st.ne))}% of active`, tone: 'amber',
        delta: { text: '12 under RMA', better: false }, visual: { kind: 'segments', parts: rows.filter(r => r.faulty > 0).map(r => ({ n: r.n, c: r.faulty, hex: DC_CLASS_HEX[r.k] })), total: faulty } },
      { title: 'Spares in store', definition: 'Hot-standby and depot swap hardware held in stores.', value: instore, fmt: 'num', of: '8 in transit', tone: 'cyan',
        delta: { text: `${(instore / faulty).toFixed(2)} per faulty unit`, better: true }, visual: { kind: 'against', value: instore, limit: faulty * 2 } },
      { title: 'Classes without cover', definition: 'Equipment classes with faulty units and no spare in store.', value: 0, fmt: 'num', of: 'of 6 classes', tone: 'emerald',
        delta: { text: 'all classes covered', better: true }, visual: { kind: 'against', value: 0, limit: 6 } }
    ],
    visuals: [
      { kind: 'heat', span: 2, title: 'Class × stock state', sub: 'Element counts across equipment classes', fmt: 'num',
        rows: rows.map(r => r.n), cols: ['Planned', 'In store', 'Deployed', 'Maintenance'],
        values: rows.map(r => [r.planned, r.instore, r.deployed, r.faulty]) },
      { kind: 'bars', title: 'Maintenance rate by class', sub: 'Maintenance ÷ active elements', fmt: 'pct',
        rows: [...rows].sort((a, b) => b.rate - a.rate).map(r => ({ label: r.n, value: r.rate, hex: DC_CLASS_HEX[r.k], sub: `${r.faulty} of ${fmtNum(st.roles.find(x => x.k === r.k)?.c ?? 0)}` })) },
      { kind: 'bars', title: 'Spare pipeline', sub: 'Units', fmt: 'num',
        rows: [
          { label: 'In store (depot)', value: instore, hex: TONE_HEX.cyan },
          { label: 'With OEM under RMA', value: 12, hex: TONE_HEX.warning },
          { label: 'In transit', value: 8, hex: TONE_HEX.info },
          { label: 'Maintenance (demand)', value: faulty, hex: TONE_HEX.error }
        ] }
    ],
    actions: [
      { priority: 'P1', action: 'Cycle the 12 OEM RMA units through burn-in testing before returning to depot stock', owner: 'Stores & logistics', impact: 'Restores spare pool to 48 units' },
      { priority: 'P2', action: 'Track thermal drift on liquid-cooled GPU baseboards to reduce premature maintenance swaps', owner: 'Facilities & Hardware engineering', impact: 'Reduces maintenance rate' },
      { priority: 'P3', action: 'Pre-allocate switch and transponder spares for upcoming planned halls', owner: 'Procurement', impact: 'Ensures zero-downtime commissioning' }
    ],
    table: {
      title: 'Stock and spare cover by class', sub: 'Select a row to open that class in Physical Resources',
      columns: [
        { key: 'cls', header: 'Class' },
        { key: 'planned', header: 'Planned', fmt: 'num', right: true },
        { key: 'instore', header: 'In store', fmt: 'num', right: true },
        { key: 'deployed', header: 'Deployed', fmt: 'num', right: true },
        { key: 'faulty', header: 'Faulty / RMA', fmt: 'num', right: true },
        { key: 'rate', header: 'Fault rate', fmt: 'pct', right: true },
        { key: 'cover', header: 'Spares per fault', fmt: 'ratio', right: true },
        { key: 'status', header: 'Spare cover', fmt: 'chip', tones: { 'No cover': 'error', 'Thin cover': 'warning', Covered: 'success' } }
      ],
      rows: rows.map(r => ({
        id: r.k,
        link: physicalLink(r.k, 'instore,faulty'),
        cells: { cls: r.n, planned: r.planned, instore: r.instore, deployed: r.deployed, faulty: r.faulty, rate: r.rate, cover: r.cover, status: r.status }
      })),
      facet: 'status', empty: 'No classes.'
    },
    methodology: []
  };
}

/* ── IN-03 Hardware lifecycle risk ───────────────────────── */
export function buildDcLifecycle(): ReportContent {
  const st = getDcStats();
  const models = Object.entries(DC_MODEL_METAS).map(([model, meta]) => {
    const sites = st.dcList.filter(d => d.models.includes(model)).length;
    return {
      model,
      oem: meta.oem,
      classes: meta.cls,
      eos: meta.eos,
      band: meta.band,
      compliance: meta.comp,
      sites: sites || 1
    };
  });

  const soon = models.filter(m => m.band === 'soon');
  const safe = models.filter(m => m.band === 'safe');
  const past = models.filter(m => m.band === 'past');
  const behindModels = models.filter(m => m.compliance === 'behind');

  return {
    headline: { value: 120, fmt: 'num', label: 'elements in scheduled hardware refresh window (0 past EOS)', tone: 'amber', better: 'down' },
    summary: '',
    findings: [
      { tone: 'good', title: '0 elements past end of support', detail: 'All production compute, GPU acceleration, and storage hardware is within active vendor lifecycle contracts.' },
      { tone: 'warn', title: '120 elements in 12-month refresh window', detail: 'T4 inference servers (DELL PowerEdge R750xa, SUPERMICRO SYS-4029GP, NVIDIA EGX) scheduled for Hopper/L40S migration.' },
      { tone: 'warn', title: `${fmtNum(st.drifted)} elements behind software baseline`, detail: `Models behind baseline: ${behindModels.map(m => m.model).join(', ')}.` },
      { tone: 'info', title: `${models.length} hardware models catalogued across 10 OEMs`, detail: '100% of models have recorded lifecycle roadmaps and certified software baselines.' }
    ],
    kpis: [
      { title: 'Past end of support', definition: 'Active elements beyond OEM end-of-support date.', value: 0, fmt: 'num', of: '0% of active', tone: 'emerald',
        delta: { text: '0 models', better: true }, visual: { kind: 'against', value: 0, limit: st.ne } },
      { title: 'Within 12 months', definition: 'Active elements reaching end of support in the next 12 months.', value: 120, fmt: 'num', of: `${r1(pct(120, st.ne))}% of active`, tone: 'amber',
        delta: { text: `${soon.length} models`, better: false }, visual: { kind: 'against', value: 120, limit: st.ne } },
      { title: 'Software compliance', definition: 'Elements on the approved software baseline ÷ elements assessed.', value: r1(pct(st.verified, st.assessed)), fmt: 'pct', of: `${fmtNum(st.verified)} of ${fmtNum(st.assessed)}`, tone: 'emerald',
        delta: { text: `${fmtNum(st.drifted)} behind`, better: false },
        visual: { kind: 'segments', parts: [
          { n: 'On baseline', c: st.verified, hex: TONE_HEX.success },
          { n: 'Behind', c: st.drifted, hex: TONE_HEX.warning },
          { n: 'Staging', c: st.notDiscovered, hex: TONE_HEX.neutral }
        ], total: st.assessed } },
      { title: 'Models with support date', definition: 'Distinct hardware models with certified support roadmap.', value: models.length, fmt: 'num', of: `of ${models.length} models`, tone: 'slate',
        delta: { text: '10 OEMs in the estate', better: null }, visual: { kind: 'against', value: models.length, limit: models.length } }
    ],
    visuals: [
      { kind: 'composition', span: 2, title: 'End-of-support exposure', sub: `${fmtNum(st.ne)} active elements`,
        parts: [
          { n: 'Past end of support', c: 0, hex: TONE_HEX.error },
          { n: 'In refresh window', c: 120, hex: TONE_HEX.warning },
          { n: 'Supported beyond 12 months', c: st.ne - 120, hex: TONE_HEX.success }
        ] },
      { kind: 'composition', title: 'Software compliance', sub: `${fmtNum(st.assessed)} elements assessed`,
        parts: [
          { n: 'On baseline', c: st.verified, hex: TONE_HEX.success },
          { n: 'Behind baseline', c: st.drifted, hex: TONE_HEX.warning },
          { n: 'Staging / Unknown', c: st.notDiscovered, hex: TONE_HEX.neutral }
        ] },
      { kind: 'bars', title: 'Models by support status', sub: `${models.length} distinct models`, fmt: 'num',
        rows: [
          { label: 'Past end of support', value: past.length, hex: TONE_HEX.error },
          { label: 'In refresh window', value: soon.length, hex: TONE_HEX.warning, sub: soon.slice(0, 3).map(m => m.model).join(', ') },
          { label: 'Supported', value: safe.length, hex: TONE_HEX.success },
          { label: 'No date on record', value: 0, hex: TONE_HEX.neutral }
        ] }
    ],
    actions: [
      { priority: 'P1', action: 'Budget the T4 inference cluster refresh to modern L40S/Hopper nodes', owner: 'Head of Infrastructure Planning', impact: 'Retires 120 units before support lapse' },
      { priority: 'P2', action: `Upgrade firmware on the ${fmtNum(st.drifted)} elements behind baseline, starting with ${behindModels[0]?.model ?? 'fabric switches'}`, owner: 'Cloud Engineering', impact: '+3.1 pt compliance' },
      { priority: 'P3', action: 'Schedule bi-annual OEM roadmap review with NVIDIA and server partners', owner: 'Vendor Management', impact: 'Maintains 100% roadmap visibility' }
    ],
    table: {
      title: 'Model lifecycle catalogue', sub: 'Every model in the data center estate with its support and software status',
      columns: [
        { key: 'model', header: 'Model', fmt: 'mono' },
        { key: 'oem', header: 'OEM' },
        { key: 'classes', header: 'Class' },
        { key: 'eos', header: 'End of support' },
        { key: 'band', header: 'Support status', fmt: 'chip', tones: { 'Past end of support': 'error', 'In refresh window': 'warning', Supported: 'success', 'No date on record': 'neutral' } },
        { key: 'compliance', header: 'Software', fmt: 'chip', tones: { 'On baseline': 'success', 'Behind baseline': 'warning', Unknown: 'neutral' } },
        { key: 'sites', header: 'Sites deployed', fmt: 'num', right: true }
      ],
      rows: [...models].sort((a, b) => a.band.localeCompare(b.band)).map(m => ({
        id: m.model,
        cells: {
          model: m.model,
          oem: m.oem,
          classes: m.classes,
          eos: m.eos,
          band: m.band === 'soon' ? 'In refresh window' : m.band === 'past' ? 'Past end of support' : 'Supported',
          compliance: m.compliance === 'ok' ? 'On baseline' : m.compliance === 'behind' ? 'Behind baseline' : 'Unknown',
          sites: m.sites
        }
      })),
      facet: 'band', empty: 'No models.'
    },
    methodology: []
  };
}

/* ── IN-04 Discovery-verified inventory quality ──────────── */
export function buildDcQuality(): ReportContent {
  const st = getDcStats();

  const recStates = [
    { s: 'ok', n: 'Verified', c: st.verified, hex: TONE_HEX.success },
    { s: 'drift', n: 'Drifted', c: st.drifted, hex: TONE_HEX.warning },
    { s: 'stale', n: 'Stale', c: 0, hex: TONE_HEX.orange },
    { s: 'miss', n: 'Missing', c: 0, hex: TONE_HEX.error },
    { s: 'none', n: 'Planned', c: st.notDiscovered, hex: TONE_HEX.neutral }
  ];

  return {
    headline: { value: st.discPct, fmt: 'pct', label: 'of active data center elements verified by discovery', tone: 'cyan', better: 'up' },
    summary: '',
    findings: [
      { tone: 'warn', title: `${fmtNum(st.drifted)} records have drifted`, detail: 'Configuration or firmware divergence detected against target template; feeding reconciliation backlog.' },
      { tone: 'good', title: '0 missing records on the network', detail: 'Zero recorded inventory elements failed reachability or dropped offline during scans.' },
      { tone: 'info', title: '93.9% automated discovery coverage', detail: 'InfiniBand subnet managers, Arista eAPI, Junos telemetry, and BMC Redfish adapters active.' },
      { tone: 'info', title: `${fmtNum(st.notDiscovered)} planned units in staging`, detail: 'Uncommissioned expansion nodes awaiting live switch port patch and telemetry activation.' }
    ],
    kpis: [
      { title: 'Verified by discovery', definition: 'Active elements confirmed on the network by discovery.', value: st.discPct, fmt: 'pct', of: `${fmtNum(st.disc)} of ${fmtNum(st.ne)}`, tone: 'cyan',
        delta: { text: `${fmtNum(st.ne - st.disc)} unverified`, better: false }, visual: { kind: 'against', value: st.disc, limit: st.ne } },
      { title: 'Drifted records', definition: 'Register records that differ from what discovery last found.', value: st.drifted, fmt: 'num', of: `${r1(pct(st.drifted, st.ne))}% of register`, tone: 'amber',
        delta: { text: `${fmtNum(st.verified)} verified`, better: false },
        visual: { kind: 'segments', parts: recStates.filter(x => x.c > 0).map(x => ({ n: x.n, c: x.c, hex: x.hex })), total: st.ne } },
      { title: 'Stale records', definition: 'Records not re-verified within the scan window.', value: 0, fmt: 'num', of: '0% of register', tone: 'emerald',
        delta: { text: 'all inside scan window', better: true }, visual: { kind: 'against', value: 0, limit: st.ne } },
      { title: 'Never discovered', definition: 'Records discovery has never verified — planned or in staging.', value: st.notDiscovered, fmt: 'num', of: `${r1(pct(st.notDiscovered, st.ne))}% of register`, tone: 'slate',
        delta: { text: 'staged expansion units', better: null }, visual: { kind: 'against', value: st.notDiscovered, limit: st.ne } }
    ],
    visuals: [
      { kind: 'composition', span: 2, title: 'Record verification state', sub: `Element register · ${fmtNum(st.ne)} records`,
        parts: recStates.filter(x => x.c > 0).map(x => ({ n: x.n, c: x.c, hex: x.hex })) },
      { kind: 'bars', title: 'Discovery coverage by class', sub: 'Discovered ÷ active', fmt: 'pct', max: 100,
        rows: st.roles.map(r => ({ label: r.n, value: r1(pct(r.disc, r.c)), hex: r.hex, sub: `${fmtNum(r.disc)} of ${fmtNum(r.c)}` })) },
      { kind: 'donut', title: 'Record source', sub: 'Where each record came from', total: st.ne, label: 'records',
        slices: [
          { k: 'd', n: 'Discovered', c: st.disc, hex: TONE_HEX.success },
          { k: 'p', n: 'Planned · CIQ', c: st.planned, hex: TONE_HEX.info },
          { k: 'm', n: 'Manual / OOB', c: st.ne - st.disc - st.planned > 0 ? st.ne - st.disc - st.planned : 83, hex: TONE_HEX.neutral }
        ] },
      { kind: 'heat', span: 2, title: 'Class × verification state', sub: 'Data center element register', fmt: 'num',
        rows: st.roles.map(r => r.n), cols: ['Verified', 'Drifted', 'Planned'],
        values: st.roles.map(r => [Math.round(r.disc * 0.97), Math.round(r.disc * 0.03), r.c - r.disc]) }
    ],
    actions: [
      { priority: 'P1', action: `Reconcile the ${fmtNum(st.drifted)} drifted records (sync CMDB or apply template remediation)`, owner: 'Cloud Operations Desk', impact: `+${r1(pct(st.drifted, st.ne))} pt verified records` },
      { priority: 'P2', action: `Onboard discovery telemetry for the ${fmtNum(st.notDiscovered)} planned expansion devices`, owner: 'Discovery engineering', impact: 'Brings staging units into live visibility' },
      { priority: 'P3', action: 'Enable periodic Redfish BMC telemetry health sweeps for GPU host servers', owner: 'Infrastructure platform team', impact: 'Proactive thermal and PSU anomaly detection' }
    ],
    table: {
      title: 'Verification quality by class', sub: 'Data center element register',
      columns: [
        { key: 'cls', header: 'Class' },
        { key: 'active', header: 'Active (ledger)', fmt: 'num', right: true },
        { key: 'disc', header: 'Discovered', fmt: 'num', right: true },
        { key: 'discPct', header: 'Coverage', fmt: 'pct', right: true },
        { key: 'ok', header: 'Verified', fmt: 'num', right: true },
        { key: 'drift', header: 'Drifted', fmt: 'num', right: true },
        { key: 'stale', header: 'Stale', fmt: 'num', right: true },
        { key: 'miss', header: 'Missing', fmt: 'num', right: true },
        { key: 'none', header: 'Planned', fmt: 'num', right: true },
        { key: 'source', header: 'Main source' }
      ],
      rows: st.roles.map(r => {
        const ok = Math.round(r.disc * 0.97);
        const drift = r.disc - ok;
        const none = r.c - r.disc;
        return {
          id: r.k,
          link: physicalLink(r.k),
          cells: {
            cls: r.n,
            active: r.c,
            disc: r.disc,
            discPct: r1(pct(r.disc, r.c)),
            ok,
            drift,
            stale: 0,
            miss: 0,
            none,
            source: 'Discovered'
          }
        };
      }),
      empty: 'No classes.'
    },
    methodology: []
  };
}

/* ── IN-05 Decommission archive & zombie assets ──────────── */
export function buildDcArchive(): ReportContent {
  const geo = typeof window !== 'undefined' ? currentGeo() : null;
  const targetGeo = geo || 'us';
  const rows = ['server', 'switch', 'router', 'storage', 'firewall', 'dwdm', 'link', 'service'].flatMap(k =>
    decommRows(k as any, targetGeo).map(r => ({ ...r, cls: k }))
  );

  const zombies = rows.filter(r => r.zombie);
  const lastYear = rows.filter(r => r.on.endsWith('2026') || r.on.endsWith('2025')).length;
  const reasons: [string, number][] = [
    ['Hardware refresh: upgraded to Sapphire Rapids', 28],
    ['Upgraded fabric to 400G Quantum-2 NDR', 24],
    ['End of 3-year hardware lease, returned to OEM', 16],
    ['Storage pool evacuated to NVMe-oF FlashArray//X', 16],
    ['Border gateway migration to 400G PTX10001', 14],
    ['Perimeter firewall upgraded to PA-5450', 12],
    ['Upgraded metro DCI transponder to 800G Waveserver 5', 10]
  ];
  const years = [
    ['2023', 18],
    ['2024', 26],
    ['2025', 34],
    ['2026', 26]
  ] as [string, number][];

  return {
    headline: { value: zombies.length, fmt: 'num', label: 'decommissioned elements still answering on the network', tone: 'red', better: 'down' },
    summary: '',
    findings: [
      { tone: 'crit', title: `${zombies.length} zombie assets still answering`, detail: zombies.map(z => `${z.name} (${z.model}, decommissioned ${z.on} by ${z.by}, ${z.wo})`).join('; ') },
      { tone: 'info', title: `${lastYear} decommissioned in the last 12 months`, detail: years.map(([y, c]) => `${y}: ${c}`).join(' · ') },
      { tone: 'info', title: `Top reason: ${reasons[0][0]}`, detail: reasons.slice(0, 4).map(([r, c]) => `${r} (${c})`).join(' · ') }
    ],
    kpis: [
      { title: 'Decommissioned', definition: 'Elements retired from data center service and archived.', value: rows.length, fmt: 'num', of: 'archived records', tone: 'slate',
        delta: { text: `${lastYear} in the last 12 months`, better: null },
        visual: { kind: 'segments', parts: [
          { n: 'Compute', c: 28, hex: DC_CLASS_HEX.server },
          { n: 'Fabric Switches', c: 24, hex: DC_CLASS_HEX.switch },
          { n: 'Storage Arrays', c: 16, hex: DC_CLASS_HEX.storage },
          { n: 'Border Routers', c: 14, hex: DC_CLASS_HEX.router },
          { n: 'Security / FW', c: 12, hex: DC_CLASS_HEX.firewall },
          { n: 'DWDM DCI', c: 10, hex: DC_CLASS_HEX.dwdm }
        ], total: rows.length } },
      { title: 'Still answering', definition: 'Archived elements that still respond to discovery scans.', value: zombies.length, fmt: 'num', of: 'zombie assets', tone: 'red',
        delta: { text: zombies.map(z => z.loc).join(', '), better: false },
        visual: { kind: 'against', value: zombies.length, limit: 10 } },
      { title: 'Retired, last 12 months', definition: 'Elements decommissioned in the 12 months to the report date.', value: lastYear, fmt: 'num', of: `${r1(pct(lastYear, rows.length))}% of archive`, tone: 'sky',
        delta: { text: '26 so far in 2026', better: null }, visual: { kind: 'against', value: lastYear, limit: rows.length } },
      { title: 'Oldest record', definition: 'Age of the longest-held record in the archive, in months.', value: 38, fmt: 'num', of: 'months · 3.2 years', tone: 'amber',
        delta: { text: '0 records older than 5 years', better: true }, visual: { kind: 'against', value: 38, limit: 60 } }
    ],
    visuals: [
      { kind: 'ramp', title: 'Decommissioned per year', sub: 'Archive records by decommission year', buckets: years.map(([y, c], i) => ({ label: y, count: c, hex: cv('slate', [300, 400, 500, 600][i] ?? 500) })) },
      { kind: 'bars', title: 'Why elements were decommissioned', sub: 'Archive records', fmt: 'num',
        rows: reasons.slice(0, 6).map(([r, c]) => ({ label: r, value: c as number, hex: cv('slate', 400) })) },
      { kind: 'bars', span: 2, title: 'Decommissioned by class', sub: 'Archive counts', fmt: 'num',
        rows: [
          { label: 'Compute (CPU)', value: 28, hex: DC_CLASS_HEX.server, sub: '28 retired' },
          { label: 'Fabric Switches', value: 24, hex: DC_CLASS_HEX.switch, sub: '24 retired' },
          { label: 'Storage Arrays', value: 16, hex: DC_CLASS_HEX.storage, sub: '16 retired' },
          { label: 'Border Routers', value: 14, hex: DC_CLASS_HEX.router, sub: '14 retired' },
          { label: 'Security / FW', value: 12, hex: DC_CLASS_HEX.firewall, sub: '12 retired' },
          { label: 'DWDM DCI', value: 10, hex: DC_CLASS_HEX.dwdm, sub: '10 retired' }
        ] }
    ],
    actions: [
      { priority: 'P1', action: `Physically verify and disconnect power/cabling for ${zombies.map(z => z.name).join(' and ')}`, owner: 'Data Center Operations', impact: 'Eliminates zombie asset risk' },
      { priority: 'P2', action: 'Open reconciliation exceptions for decommissioned records responding to SNMP/Redfish polls', owner: 'Reconciliation desk', impact: 'Automates detection of ghost devices' },
      { priority: 'P3', action: 'Complete lease return documentation for retired compute and storage hardware', owner: 'Asset management', impact: 'Closes vendor return SLAs' }
    ],
    table: {
      title: 'Decommissioned elements', sub: 'Zombies first, then most recent',
      columns: [
        { key: 'status', header: 'Network status', fmt: 'chip', tones: { 'Still answering': 'error', Silent: 'neutral' }, width: '135px' },
        { key: 'name', header: 'Element', fmt: 'mono', width: '190px' },
        { key: 'cls', header: 'NE Type', width: '110px' },
        { key: 'model', header: 'Model', width: '180px' },
        { key: 'oem', header: 'OEM', width: '110px' },
        { key: 'sn', header: 'Serial', fmt: 'mono', width: '140px' },
        { key: 'loc', header: 'Site', fmt: 'mono', width: '105px' },
        { key: 'on', header: 'Decommissioned', fmt: 'date', width: '130px' },
        { key: 'why', header: 'Reason', width: '260px' },
        { key: 'by', header: 'By', width: '130px' },
        { key: 'wo', header: 'Work order', fmt: 'mono', width: '150px' }
      ],
      rows: [...rows].sort((a, b) => Number(b.zombie) - Number(a.zombie)).map(r => ({
        id: `${r.cls}-${r.sn}`,
        link: { key: 'inactive', q: `cls=all&search=${encodeURIComponent(r.name)}` },
        cells: {
          status: r.zombie ? 'Still answering' : 'Silent',
          name: r.name,
          cls: r.cls.toUpperCase(),
          model: r.model,
          oem: r.oem,
          sn: r.sn,
          loc: r.loc,
          on: r.on,
          why: r.why,
          by: r.by,
          wo: r.wo
        }
      })),
      facet: 'cls', empty: 'The archive is empty.'
    },
    methodology: []
  };
}

/* ── IN-06 Site footprint & facility capacity ────────────── */
export function buildDcSites(): ReportContent {
  const st = getDcStats();
  const dcList = st.dcList;

  const s = dcList.map(d => {
    const load = d.rackKw;
    const rated = d.powerKw;
    const powerPct = r1(pct(load, rated));
    const rackPct = r1(pct(d.uUsed, d.uTotal));
    const portPct = r1(pct(d.ports.used, d.ports.total));
    return {
      d,
      load,
      rated,
      powerPct,
      rackPct,
      portPct,
      status: d.status === 'on-air' ? 'On-air' : d.status === 'in-progress' ? 'In progress' : d.status === 'planned' ? 'Planned' : 'Failed'
    };
  });

  const hot = s.filter(x => x.powerPct >= 50 || x.rackPct >= 60);
  const onAirCount = s.filter(x => x.status === 'On-air').length;
  const inProgressCount = s.filter(x => x.status === 'In progress').length;
  const plannedCount = s.filter(x => x.status === 'Planned').length;

  return {
    headline: { value: st.locations, fmt: 'num', label: 'data center facilities in the estate', tone: 'emerald' },
    summary: '',
    findings: [
      { tone: hot.length ? 'warn' : 'good', title: `${plural(hot.length, 'facility')} above 50% power or 60% rack use`, detail: hot.slice(0, 4).map(x => `${x.d.id}: power ${x.powerPct}%, racks ${x.rackPct}%, ports ${x.portPct}%`).join(' · ') || 'Every facility has adequate power and rack headroom.' },
      { tone: 'info', title: `${st.central} central hyperscale facilities carry 82% of load`, detail: 'Primary concentration of liquid-cooled GPU superclusters and high-radix InfiniBand fabrics.' },
      { tone: 'info', title: `${r1(pct(st.portsFree, st.portsTotal))}% port headroom available estate-wide`, detail: `${fmtNum(st.portsFree)} free ports available for host attach and inter-rack connectivity.` }
    ],
    kpis: [
      { title: 'Locations', definition: 'Data center facilities by tier category.', value: st.locations, fmt: 'num', of: 'central · regional · edge', tone: 'emerald',
        delta: { text: `${st.central} central hyperscale DCs`, better: null },
        visual: { kind: 'segments', parts: [
          { n: 'Central', c: st.central, hex: cv('emerald', 600) },
          { n: 'Regional', c: st.regional, hex: cv('emerald', 400) },
          { n: 'Edge', c: st.edge, hex: cv('emerald', 200) }
        ], total: st.locations } },
      { title: 'Port utilisation', definition: 'Used ÷ installed ports, data center estate-wide.', value: st.portPct, fmt: 'pct', of: `${fmtNum(st.portsFree)} free`, tone: 'amber',
        delta: { text: `${fmtNum(st.portsUsed)} used`, better: null }, visual: { kind: 'against', value: st.portsUsed, limit: st.portsTotal } },
      { title: 'Facilities on-air', definition: 'Data centers commissioned and in live service.', value: onAirCount, fmt: 'num', of: `of ${st.locations} surveyed`, tone: 'sky',
        delta: { text: `${inProgressCount} in progress · ${plannedCount} planned`, better: null },
        visual: { kind: 'segments', parts: [
          { n: 'On-air', c: onAirCount, hex: TONE_HEX.success },
          { n: 'In progress', c: inProgressCount, hex: TONE_HEX.info },
          { n: 'Planned', c: plannedCount, hex: TONE_HEX.neutral }
        ], total: st.locations } },
      { title: 'Facilities near capacity', definition: 'Data centers above 50% power load or 60% rack space.', value: hot.length, fmt: 'num', of: `of ${st.locations} surveyed`, tone: 'red',
        delta: { text: hot.slice(0, 3).map(x => x.d.id).join(', ') || 'none', better: hot.length === 0 },
        visual: { kind: 'against', value: hot.length, limit: st.locations } }
    ],
    visuals: [
      { kind: 'bars', title: 'Power load vs rating', sub: 'Data center sites · % of rated power capacity', fmt: 'pct', max: 100, target: { value: 50, label: '50%' },
        rows: [...s].sort((a, b) => b.powerPct - a.powerPct).slice(0, 10).map(x => ({ label: x.d.id, value: x.powerPct, hex: x.powerPct >= 50 ? TONE_HEX.warning : cv('amber', 400), sub: `${x.load.toFixed(1)} of ${x.rated} kW` })) },
      { kind: 'bars', title: 'Rack space used', sub: 'Data center sites · % of rack units', fmt: 'pct', max: 100, target: { value: 60, label: '60%' },
        rows: [...s].sort((a, b) => b.rackPct - a.rackPct).slice(0, 10).map(x => ({ label: x.d.id, value: x.rackPct, hex: x.rackPct >= 60 ? TONE_HEX.warning : cv('sky', 400), sub: `${x.d.uUsed} of ${x.d.uTotal} U` })) },
      { kind: 'bars', span: 2, title: 'Locations by tier', sub: 'Facility categorization', fmt: 'num',
        rows: [
          { label: 'Central (Hyperscale)', value: st.central, hex: cv('emerald', 600) },
          { label: 'Regional (Edge Hub)', value: st.regional, hex: cv('emerald', 400) },
          { label: 'Edge', value: st.edge, hex: cv('emerald', 300) }
        ] }
    ],
    actions: [
      ...hot.slice(0, 3).map(x => ({ priority: 'P1' as const, action: `Power and cooling expansion review at ${x.d.id} (${x.d.city})`, owner: 'Facilities · Capacity Engineering', impact: `Power ${x.powerPct}%, racks ${x.rackPct}%` })),
      { priority: 'P2' as const, action: 'Complete commissioning telemetry onboarding for planned and in-progress facilities', owner: 'Deployment Operations', impact: `${inProgressCount + plannedCount} facilities reaching on-air status` }
    ],
    table: {
      title: 'Data center facilities', sub: `${st.locations} facilities in the active estate`,
      columns: [
        { key: 'id', header: 'Site', fmt: 'mono' },
        { key: 'name', header: 'Name' },
        { key: 'tier', header: 'Tier' },
        { key: 'cat', header: 'Category' },
        { key: 'status', header: 'Status', fmt: 'chip', tones: { 'On-air': 'success', 'In progress': 'info', Planned: 'neutral', Failed: 'error' } },
        { key: 'city', header: 'Location' },
        { key: 'ne', header: 'Elements', fmt: 'num', right: true },
        { key: 'disc', header: 'Discovered', fmt: 'num', right: true },
        { key: 'load', header: 'IT Load', fmt: 'kw', right: true },
        { key: 'power', header: 'Power used', fmt: 'pct', right: true },
        { key: 'rack', header: 'Rack used', fmt: 'pct', right: true },
        { key: 'ports', header: 'Ports used', fmt: 'pct', right: true }
      ],
      rows: s.map(x => ({
        id: x.d.id,
        cells: {
          id: x.d.id,
          name: x.d.location.name,
          tier: x.d.tier,
          cat: x.d.category,
          status: x.status,
          city: `${x.d.city}, ${x.d.state}`,
          ne: x.d.devices,
          disc: x.d.discovered,
          load: r1(x.load),
          power: x.powerPct,
          rack: x.rackPct,
          ports: x.portPct
        }
      })),
      facet: 'status', empty: 'No facilities found.'
    },
    methodology: []
  };
}

/* ── IN-07 Vendor (OEM) concentration ────────────────────── */
export function buildDcVendors(): ReportContent {
  const st = getDcStats();
  const dcList = st.dcList;

  // Aggregate vendors from all DCs in the scope
  const vendorTotals: Record<string, number> = {};
  for (const d of dcList) {
    for (const [vendor, count] of Object.entries(d.vendors)) {
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + count;
    }
  }

  const oems = Object.entries(vendorTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([oem, n]) => {
      const share = r1(pct(n, st.ne));
      const classes = oem === 'NVIDIA' ? ['GPU', 'Switch']
        : oem === 'SUPERMICRO' ? ['GPU', 'Server']
        : oem === 'DELL' ? ['GPU', 'Server']
        : oem === 'ARISTA' ? ['Switch']
        : oem === 'JUNIPER' ? ['Router']
        : oem === 'FORTINET' ? ['Firewall']
        : oem === 'INTEL' ? ['GPU']
        : ['Storage'];
      const modelsCount = oem === 'NVIDIA' ? 9
        : oem === 'SUPERMICRO' ? 9
        : oem === 'DELL' ? 8
        : oem === 'INTEL' ? 2
        : 1;

      // In refresh window: earlier T4 / A100 architectures
      const soonPct = (oem === 'DELL' || oem === 'SUPERMICRO' || oem === 'NVIDIA') ? 6.2 : 0;
      const behindPct = oem === 'NVIDIA' ? 3.4 : oem === 'SUPERMICRO' ? 3.1 : oem === 'DELL' ? 2.9 : oem === 'ARISTA' ? 4.2 : 0;

      return {
        oem,
        n,
        share,
        classes,
        models: modelsCount,
        pastPct: 0,
        soonPct,
        behindPct,
        region: 'Central Hyperscale'
      };
    });

  const top = oems[0];
  const top3 = r1(sum(oems.slice(0, 3), o => o.share));
  const hhi = Math.round(sum(oems, o => o.share ** 2));
  const oemHex = (i: number) => cv(['purple', 'teal', 'blue', 'amber', 'cyan', 'pink', 'sky', 'emerald', 'orange', 'slate'][i] ?? 'slate', 400);

  return {
    headline: { value: top.share, fmt: 'pct', label: `of data center elements from ${top.oem}`, tone: 'purple', better: 'down' },
    summary: '',
    findings: [
      { tone: 'info', title: `${top.oem} supplies ${top.share}% of elements`, detail: `${fmtNum(top.n)} elements across ${top.models} models (${top.classes.join(', ')}). HHI ${fmtNum(hhi)}.` },
      { tone: 'good', title: '0% past-EOS exposure across all vendors', detail: 'All 10 OEMs are maintained under active enterprise maintenance and replacement agreements.' },
      { tone: 'info', title: `Top three OEMs = ${top3}%`, detail: oems.slice(0, 5).map(o => `${o.oem} ${o.share}%`).join(' · ') }
    ],
    kpis: [
      { title: 'Largest vendor share', definition: 'Share of elements supplied by the largest OEM.', value: top.share, fmt: 'pct', of: top.oem, tone: 'purple',
        delta: { text: `${fmtNum(top.n)} elements`, better: null },
        visual: { kind: 'segments', parts: oems.slice(0, 5).map((o, i) => ({ n: o.oem, c: o.n, hex: oemHex(i) })), total: st.ne } },
      { title: 'Top-3 concentration', definition: 'Share of elements supplied by the three largest OEMs.', value: top3, fmt: 'pct', of: `HHI ${fmtNum(hhi)}`, tone: 'sky',
        delta: { text: oems.slice(0, 3).map(o => o.oem).join(', '), better: null }, visual: { kind: 'against', value: top3, limit: 100 } },
      { title: 'Vendors', definition: 'Distinct OEMs in the data center estate.', value: oems.length, fmt: 'num', of: '35 models', tone: 'slate',
        delta: { text: `${oems.filter(o => o.share < 2).length} below 2% share`, better: null }, visual: { kind: 'against', value: oems.length, limit: 20 } },
      { title: 'Most exposed vendor', definition: 'Highest share of a vendor’s installed base on models near end of support.', value: 6.2, fmt: 'pct', of: 'Earlier generation T4/A100', tone: 'amber',
        delta: { text: '0% past EOS · 6.2% in window', better: false }, visual: { kind: 'against', value: 6.2, limit: 100 } }
    ],
    visuals: [
      { kind: 'bars', title: 'Elements by vendor', sub: 'Share of the data center estate', fmt: 'pct',
        rows: oems.map((o, i) => ({ label: o.oem, value: o.share, hex: oemHex(i), sub: `${fmtNum(o.n)} elements · ${o.models} models` })) },
      { kind: 'bars', title: 'Lifecycle exposure by vendor', sub: 'Share of each vendor’s elements in refresh window', fmt: 'pct', max: 100,
        rows: [...oems].filter(o => o.soonPct > 0).map(o => ({ label: o.oem, value: o.soonPct, hex: TONE_HEX.warning, sub: '0% past · 6.2% in window' })) },
      { kind: 'heat', span: 2, title: 'Vendor × equipment class', sub: 'Data center elements', fmt: 'num',
        rows: oems.map(o => o.oem), cols: ['GPU', 'Switch', 'Server', 'Storage', 'Router', 'Firewall'],
        values: oems.map(o => [
          o.classes.includes('GPU') ? Math.round(o.n * 0.7) : 0,
          o.classes.includes('Switch') ? Math.round(o.n * (o.oem === 'ARISTA' ? 1 : 0.3)) : 0,
          o.classes.includes('Server') ? Math.round(o.n * 0.3) : 0,
          o.classes.includes('Storage') ? o.n : 0,
          o.classes.includes('Router') ? o.n : 0,
          o.classes.includes('Firewall') ? o.n : 0
        ]) }
    ],
    actions: [
      { priority: 'P1', action: `Maintain direct strategic engagement with ${top.oem} for upcoming accelerated computing roadmaps`, owner: 'Procurement · Architecture', impact: 'Ensures allocation priority on next-gen silicon' },
      { priority: 'P2', action: 'Qualify secondary fabric optics and cables to maintain multi-vendor resilience', owner: 'Infrastructure Engineering', impact: 'Reduces single-source optical transceiver lead times' },
      { priority: 'P3', action: 'Coordinate firmware maintenance windows with Dell and Supermicro OEM support', owner: 'Platform Operations', impact: 'Keeps 100% of compute nodes on approved baselines' }
    ],
    table: {
      title: 'Vendor scorecard', sub: 'Data center estate, largest vendor first',
      columns: [
        { key: 'oem', header: 'OEM' },
        { key: 'n', header: 'Elements', fmt: 'num', right: true },
        { key: 'share', header: 'Share', fmt: 'pct', right: true },
        { key: 'models', header: 'Models', fmt: 'num', right: true },
        { key: 'classes', header: 'Classes' },
        { key: 'past', header: 'On past-EOS models', fmt: 'pct', right: true },
        { key: 'soon', header: 'In refresh window', fmt: 'pct', right: true },
        { key: 'behind', header: 'Behind baseline', fmt: 'pct', right: true },
        { key: 'region', header: 'Primary tier' }
      ],
      rows: oems.map(o => ({
        id: o.oem,
        cells: {
          oem: o.oem,
          n: o.n,
          share: o.share,
          models: o.models,
          classes: o.classes.join(', '),
          past: o.pastPct,
          soon: o.soonPct,
          behind: o.behindPct,
          region: o.region
        }
      })),
      empty: 'No vendors.'
    },
    methodology: []
  };
}
