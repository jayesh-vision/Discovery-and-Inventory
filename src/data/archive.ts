import { NE_CLASSES, INACTIVE_TABS, DC_INACTIVE_TABS, type NeClass, type InactiveTab } from './ledger';
import { MASTER_NE } from './master';
import { currentGeo, isDatacenterUser, type DcGeo } from '../solution';
import { isScoped } from './dc/scope';

export type { InactiveTab };

export interface ArchiveRow {
  name: string; ip: string; model: string; sn: string; oem: string; loc: string;
  why: string; on: string; by: string; wo: string; zombie: boolean;
  cls?: string;
  neType?: string;
}

/* Decommissioned network elements come from the unified device repository
   (masterDevices.json) — the same register Inventory and Discovery are built
   from, so an archived element keeps the hostname, IP, serial and location id it
   had while live. Only the two service tabs (L2VPN / L3VPN) are circuits rather
   than elements; they stay hand-written seeds, expanded deterministically. */
const DECOMM_SEEDS: Record<'l2vpn' | 'l3vpn', ArchiveRow[]> = {
  l2vpn: [
    { name: 'L2VPN-MAS-DEL-E-LINE-01', ip: '172.31.31.240', model: 'E-Line / VPWS', sn: 'VC-L2-990412', oem: 'JUNIPER', loc: 'MAS-041', why: 'Service decommissioned by customer request', on: '14-May-2026', by: 'Anjali Verma', wo: 'WO-2026-9412', zombie: false },
    { name: 'L2VPN-BLR-CHE-VPLS-04', ip: '172.31.41.118', model: 'E-LAN / VPLS', sn: 'VC-L2-884102', oem: 'CISCO', loc: 'BGLK-277', why: 'Migrated to EVPN-VPWS', on: '22-Mar-2026', by: 'Gaurav Shukla', wo: 'WO-2026-8841', zombie: false },
    { name: 'L2VPN-INDR-DEL-PSEUDOWIRE-09', ip: '172.31.38.99', model: 'PW-E1', sn: 'VC-L2-771904', oem: 'NOKIA', loc: 'INDR-275', why: 'Circuit retired', on: '11-Jan-2026', by: 'Amit Sharma', wo: 'WO-2026-7719', zombie: false },
    { name: 'L2VPN-PUN-HYD-EVPN-12', ip: '172.31.52.88', model: 'EVPN-VPWS', sn: 'VC-L2-663201', oem: 'JUNIPER', loc: 'PUN-162', why: 'Capacity migration', on: '04-Dec-2025', by: 'Sai Krishna', wo: 'WO-2025-6632', zombie: false },
    { name: 'L2VPN-HDFC-BLR-CHE-ELINE-07', ip: '172.31.41.219', model: 'E-Line / VPWS', sn: 'VC-L2-112207', oem: 'JUNIPER', loc: 'BGLK-277', why: 'Bank consolidated to MPLS L3VPN', on: '15-Aug-2026', by: 'Priya Nair', wo: 'WO-2026-1122', zombie: false },
    { name: 'L2VPN-ITPARK-HYD-MUM-VPLS-12', ip: '172.31.47.88', model: 'E-LAN / VPLS', sn: 'VC-L2-223412', oem: 'CISCO', loc: 'HYD-093', why: 'IT park decommissioned', on: '28-Jun-2026', by: 'Suresh Pillai', wo: 'WO-2026-2234', zombie: false },
    { name: 'L2VPN-METRO-AHM-SUR-PW-19', ip: '172.31.22.144', model: 'PW-E1', sn: 'VC-L2-334819', oem: 'NOKIA', loc: 'AHM-131', why: 'TDM circuit migrated to packet', on: '10-Apr-2026', by: 'Rohan Mehta', wo: 'WO-2026-3348', zombie: false },
    { name: 'L2VPN-GOV-RAIL-DEL-AGR-EVPN-3', ip: '172.31.35.167', model: 'EVPN-VPWS', sn: 'VC-L2-445603', oem: 'CISCO', loc: 'DEL-279', why: 'Station decommissioned from TEN', on: '05-Mar-2026', by: 'Harish Kumar', wo: 'WO-2026-4456', zombie: false },
    { name: 'L2VPN-PORT-KOL-VIS-ELINE-08', ip: '172.31.67.211', model: 'E-Line / VPWS', sn: 'VC-L2-556308', oem: 'JUNIPER', loc: 'KOL-204', why: 'Port authority switched to dark fiber', on: '19-Dec-2025', by: 'Sai Krishna', wo: 'WO-2025-5563', zombie: false },
    { name: 'L2VPN-MEDIA-MUM-DEL-VPLS-21', ip: '172.31.14.89', model: 'E-LAN / VPLS', sn: 'VC-L2-667821', oem: 'NOKIA', loc: 'MAS-041', why: 'Broadcast network migrated to IP multicast', on: '03-Oct-2025', by: 'Anjali Verma', wo: 'WO-2025-6678', zombie: false }
  ],
  l3vpn: [
    { name: 'L3VPN-ENT-CORP-DEL-01', ip: '172.31.35.101', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-550119', oem: 'CISCO', loc: 'DEL-279', why: 'Contract expired, service terminated', on: '18-Jun-2026', by: 'Harish Kumar', wo: 'WO-2026-5501', zombie: false },
    { name: 'L3VPN-BANK-HQ-MAS-02', ip: '172.31.33.204', model: 'IP-VPN / BGP-MPLS', sn: 'VRF-L3-441028', oem: 'JUNIPER', loc: 'MAS-041', why: 'Site migration', on: '04-Apr-2026', by: 'Sai Krishna', wo: 'WO-2026-4410', zombie: false },
    { name: 'L3VPN-GOVT-SECURE-BGLK-07', ip: '172.31.31.199', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-339104', oem: 'NOKIA', loc: 'BGLK-277', why: 'Upgraded to SD-WAN overlay', on: '29-Nov-2025', by: 'Anjali Verma', wo: 'WO-2025-3391', zombie: false },
    { name: 'L3VPN-RETAIL-CHAIN-KOL-15', ip: '172.31.67.142', model: 'BGP-MPLS L3VPN', sn: 'VRF-L3-228109', oem: 'CISCO', loc: 'KOL-204', why: 'Hardware refresh', on: '15-Aug-2025', by: 'Amit Sharma', wo: 'WO-2025-2281', zombie: false },
    { name: 'L3VPN-BANK-SBI-MUM-09', ip: '172.31.14.201', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-112009', oem: 'JUNIPER', loc: 'MAS-041', why: 'Bank migrated to SD-WAN', on: '12-Jul-2026', by: 'Rohan Mehta', wo: 'WO-2026-1120', zombie: false },
    { name: 'L3VPN-GOVT-RAIL-DEL-03', ip: '172.31.35.118', model: 'IP-VPN / BGP-MPLS', sn: 'VRF-L3-223003', oem: 'CISCO', loc: 'DEL-279', why: 'Indian Railways own MPLS deployed', on: '08-May-2026', by: 'Anjali Verma', wo: 'WO-2026-2230', zombie: false },
    { name: 'L3VPN-RETAIL-DMART-GJ-11', ip: '172.31.22.177', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-334011', oem: 'NOKIA', loc: 'AHM-131', why: 'Retail chain internal WAN deployed', on: '19-Feb-2026', by: 'Suresh Pillai', wo: 'WO-2026-3340', zombie: false },
    { name: 'L3VPN-HOSP-APOLLO-HYD-06', ip: '172.31.47.233', model: 'BGP-MPLS L3VPN', sn: 'VRF-L3-445006', oem: 'CISCO', loc: 'HYD-093', why: 'Hospital chain upgraded to EVPN', on: '30-Sep-2025', by: 'Amit Sharma', wo: 'WO-2025-4450', zombie: false },
    { name: 'L3VPN-EDU-IIT-CHE-04', ip: '172.31.70.155', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-556004', oem: 'JUNIPER', loc: 'CHE-118', why: 'University campus network privatized', on: '14-Nov-2025', by: 'Priya Nair', wo: 'WO-2025-5560', zombie: false },
    { name: 'L3VPN-MFGR-TATA-PUN-07', ip: '172.31.42.198', model: 'IP-VPN / BGP-MPLS', sn: 'VRF-L3-667007', oem: 'NOKIA', loc: 'PUN-162', why: 'Manufacturing plant shut down', on: '22-Jan-2026', by: 'Gaurav Shukla', wo: 'WO-2026-6670', zombie: false }
  ]
};

const DK_SITES = [
  { p: 'DEL',  loc: 'DEL-279'  }, { p: 'MAS',  loc: 'MAS-041'  }, { p: 'BGLK', loc: 'BGLK-277' },
  { p: 'INDR', loc: 'INDR-275' }, { p: 'CHE',  loc: 'CHE-118'  }, { p: 'VZG',  loc: 'VJA-118'  },
  { p: 'PUN',  loc: 'PUN-162'  }, { p: 'HYD',  loc: 'HYD-093'  }, { p: 'KOL',  loc: 'KOL-204'  },
  { p: 'AHM',  loc: 'AHM-131'  }, { p: 'JAI',  loc: 'JAI-058'  }, { p: 'LKO',  loc: 'LKO-217'  }
];
const DK_WHY = ['Replaced under change request', 'End of life', 'End of support', 'Faulty, returned to OEM',
  'Site consolidation', 'Capacity migration', 'Hardware refresh', 'Written off after survey',
  'Lease expired, returned', 'Rationalised in ring re-design'];
const DK_BY = ['Anjali Verma', 'Gaurav Shukla', 'Amit Sharma', 'Sai Krishna', 'Harish Kumar',
  'Ronit Dulani', 'Meera Nair', 'Vikram Rao'];
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DK_ROLE: Record<InactiveTab, string[]> = {
  router: ['P','PE','BNG','EDGE','AGG'], switch: ['ACC','DIST','CORE','TOR'],
  server: ['SRV','CDC','APP','DB'], dwdm: ['OADM','ROADM','MUX','ILA'],
  enodeb: ['ENB'], gnodeb: ['GNB'], firewall: ['FW'], storage: ['STO'], gpu: ['GPU'],
  l2vpn: ['LINE', 'VPLS', 'PW'], l3vpn: ['VRF', 'VPN', 'MPLS'],
  link: ['LNK', 'FBR', 'TRK'], service: ['SVC', 'VPN', 'LINE']
};

/* one small deterministic generator so a rebuild never reshuffles the archive */
const lcg = (seed: number) => { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

/* the prototype's "today"; decommission dates are always in the past */
export const TODAY = new Date(2026, 8, 3);

export const parseDmy = (s: string): Date => {
  const [d, m, y] = s.split('-');
  return new Date(Number(y), MONTHS.indexOf(m), Number(d));
};

function expand(cls: InactiveTab, seeds: ArchiveRow[], total: number): ArchiveRow[] {
  const out = seeds.slice(), r = lcg(cls.length * 7919 + total);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const roles = DK_ROLE[cls];
  while (out.length < total) {
    const i = out.length, base = seeds[i % seeds.length], site = pick(DK_SITES);
    const back = 20 + Math.floor(r() * 2520);
    const d0 = new Date(TODAY); d0.setDate(d0.getDate() - back);
    out.push({
      name: `${site.p}-${base.model.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}-${pick(roles)}-${String(10 + i % 89)}`,
      ip: `172.31.${64 + (i % 96)}.${1 + ((i * 37) % 253)}`,
      model: base.model, oem: base.oem,
      sn: base.sn.replace(/[0-9]{4}$/, String(1000 + ((i * 461) % 8999))) + String.fromCharCode(65 + (i % 26)),
      loc: site.loc,
      why: pick(DK_WHY),
      on: `${String(d0.getDate()).padStart(2, '0')}-${MONTHS[d0.getMonth()]}-${d0.getFullYear()}`,
      by: pick(DK_BY),
      wo: `WO-${d0.getFullYear()}-${1000 + ((i * 313) % 8999)}`,
      zombie: false
    });
  }
  return out.sort((a, b) => parseDmy(b.on).getTime() - parseDmy(a.on).getTime());
}

const fromMaster = (cls: NeClass): ArchiveRow[] => MASTER_NE
  .filter(n => n.cls === cls && n.stock === 'decomm')
  .map(n => ({ name: n.name, ip: n.ip, model: n.model, sn: n.sn, oem: n.oem, loc: n.loc,
    why: n.why ?? '', on: n.on ?? '', by: n.by ?? '', wo: n.wo ?? '', zombie: !!n.zombie }))
  .sort((a, b) => parseDmy(b.on).getTime() - parseDmy(a.on).getTime());

/* Decommissioned records in Datacenter mode */
const DC_SITES_US = [
  'VA-DC-001', 'VA-DC-002', 'VA-DC-003', 'VA-DC-004', 'TX-DC-005', 'TX-DC-006', 'TX-DC-007',
  'CA-DC-008', 'IL-DC-009', 'AZ-DC-010', 'GA-DC-011', 'NJ-DC-012', 'WA-DC-013', 'OR-DC-014',
  'CO-DC-015', 'OH-DC-016', 'OH-DC-017', 'FL-DC-018', 'UT-DC-019', 'CA-DC-020', 'CA-DC-021',
  'TX-DC-022', 'NC-DC-023', 'WA-DC-024'
];

const DC_SITES_IN = [
  'MH-DC-001', 'MH-DC-002', 'MH-DC-003', 'MH-DC-004', 'UP-DC-005', 'UP-DC-006', 'UP-DC-007',
  'KA-DC-008', 'DL-DC-009', 'AP-DC-010', 'HR-DC-011', 'PB-DC-012', 'GJ-DC-013', 'MP-DC-014',
  'RJ-DC-015', 'WB-DC-016', 'WB-DC-017', 'OD-DC-018', 'BR-DC-019', 'KA-DC-020', 'KA-DC-021',
  'TN-DC-022', 'TS-DC-023', 'KL-DC-024'
];

const DC_ENGINEERS_US = [
  'Sarah Jenkins (DCO Lead)',
  'Michael Chang (Infrastructure)',
  'David Miller (Asset Mgr)',
  'Robert Hayes (Site Operations)',
  'Emily Watson (Capacity Planning)',
  'James Anderson (Hardware Eng)',
  'Marcus Vance (Systems Arch)',
  'Brian Cooper (DCO Ops)'
];

const DC_ENGINEERS_IN = [
  'Rahul Sharma (DCO Lead)',
  'Priya Patel (Site Operations)',
  'Anita Desai (Capacity Planning)',
  'Vikram Rao (Infrastructure)',
  'Meera Nair (Asset Mgr)',
  'Anjali Verma (DCO Ops)'
];

const DC_DECOMM_SEEDS: Record<InactiveTab, { model: string; oem: string; prefix: string; why: string }[]> = {
  server: [
    { model: 'ProLiant DL380 Gen10', oem: 'HPE', prefix: 'SRV', why: 'Hardware refresh: upgraded to Sapphire Rapids' },
    { model: 'PowerEdge R740xd', oem: 'DELL', prefix: 'SRV', why: 'End of 3-year hardware lease, returned to OEM' },
    { model: 'UCS C220 M5', oem: 'CISCO', prefix: 'SRV', why: 'Motherboard failure / RMA exchange complete' },
    { model: 'ThinkSystem SR650', oem: 'LENOVO', prefix: 'SRV', why: 'Consolidated into high-density liquid-cooled rack' }
  ],
  gpu: [
    { model: 'DGX-1 (8x V100 32GB)', oem: 'NVIDIA', prefix: 'GPU', why: 'AI cluster refresh: upgraded to H100 SXM5 SuperPOD' },
    { model: 'DGX-2 (16x V100 32GB)', oem: 'NVIDIA', prefix: 'GPU', why: 'Capacity migration to dedicated Hopper cluster' },
    { model: 'HGX A100 80GB', oem: 'SUPERMICRO', prefix: 'GPU', why: 'GPU baseboard fault, replaced under vendor SLA' },
    { model: 'Apollo 6500 Gen10', oem: 'HPE', prefix: 'GPU', why: 'Hardware refresh under capital replacement cycle' }
  ],
  switch: [
    { model: '7050QX-32S', oem: 'ARISTA', prefix: 'SW', why: 'Upgraded fabric to 400G Quantum-2 NDR' },
    { model: 'Nexus 93180YC-EX', oem: 'CISCO', prefix: 'SW', why: 'Spine-Leaf Clos migration to 100G/400G underlay' },
    { model: 'SB7800 100G EDR', oem: 'MELLANOX', prefix: 'SW', why: 'InfiniBand fabric upgrade from EDR 100G to NDR 400G' },
    { model: 'QFX5100-48S', oem: 'JUNIPER', prefix: 'SW', why: 'End of software maintenance / replaced with QFX5120' }
  ],
  router: [
    { model: 'MX480', oem: 'JUNIPER', prefix: 'BDR', why: 'Border gateway migration to 400G PTX10001' },
    { model: 'ASR 9006', oem: 'CISCO', prefix: 'BDR', why: 'Hardware refresh under 5-year capital plan' },
    { model: '7280CR2-60', oem: 'ARISTA', prefix: 'BDR', why: 'Replaced during dual-homed border re-design' },
    { model: '7750 SR-7', oem: 'NOKIA', prefix: 'BDR', why: 'Transferred to decommissioned storage pool' }
  ],
  storage: [
    { model: 'FlashArray//M50', oem: 'PURE STORAGE', prefix: 'STR', why: 'Storage pool evacuated to NVMe-oF FlashArray//X' },
    { model: 'AFF A300', oem: 'NETAPP', prefix: 'STR', why: 'Lease expired, returned to OEM' },
    { model: 'PowerStore 5000T', oem: 'DELL', prefix: 'STR', why: 'Consolidated into high-density storage row' },
    { model: 'Nimble AF5000', oem: 'HPE', prefix: 'STR', why: 'Replaced by NVMe all-flash cluster' }
  ],
  firewall: [
    { model: 'PA-5060', oem: 'PALO ALTO', prefix: 'FW', why: 'Perimeter firewall upgraded to PA-5450' },
    { model: 'FortiGate 3000D', oem: 'FORTINET', prefix: 'FW', why: 'End of security subscription & hardware support' },
    { model: 'Check Point 23800', oem: 'CHECK POINT', prefix: 'FW', why: 'Replaced with 100G next-generation firewall' },
    { model: 'Firepower 4120', oem: 'CISCO', prefix: 'FW', why: 'Decommissioned under data center security audit' }
  ],
  dwdm: [
    { model: 'Waveserver Classic', oem: 'CIENA', prefix: 'DCI', why: 'Upgraded metro DCI transponder to 800G Waveserver 5' },
    { model: 'Groove G30', oem: 'INFINERA', prefix: 'DCI', why: 'DCI ring capacity consolidation' },
    { model: '1830 PSS-32', oem: 'NOKIA', prefix: 'DCI', why: 'Channel retired after dark fiber re-route' },
    { model: 'NCS 1002', oem: 'CISCO', prefix: 'DCI', why: 'Replaced under scheduled DCI link upgrade' }
  ],
  link: [
    { model: 'MPO-12 Trunk Cable', oem: 'CORNING', prefix: 'LNK', why: 'Patch cable retired during spine-leaf upgrade' },
    { model: '100G AOC Cable', oem: 'MELLANOX', prefix: 'LNK', why: 'Faulty optical transceiver / high attenuation' },
    { model: '400G DAC Breakout', oem: 'ARISTA', prefix: 'LNK', why: 'De-cabled during GPU rack relocation' },
    { model: 'LC-LC Single-mode', oem: 'PANDUIT', prefix: 'LNK', why: 'Fiber strand retired on cross-connect re-patch' }
  ],
  service: [
    { model: 'On-demand GPU Cluster (8x V100)', oem: 'NVIDIA', prefix: 'SVC', why: 'Contract term completed, cluster released' },
    { model: 'Dedicated Training Pod (16x V100)', oem: 'NVIDIA', prefix: 'SVC', why: 'Customer migrated to reserved H100 cluster' },
    { model: 'Multi-node Slurm Job', oem: 'RED HAT', prefix: 'SVC', why: 'Job completed, tenant storage evacuated' },
    { model: 'High-Memory Analytics Instance', oem: 'UBUNTU', prefix: 'SVC', why: 'Cloud project completed and decommissioned' }
  ],
  enodeb: [], gnodeb: [], l2vpn: [], l3vpn: []
};

const DC_COUNTS: Record<InactiveTab, number> = {
  server: 0, gpu: 0, switch: 24, router: 14, storage: 16, firewall: 12, dwdm: 10, link: 16, service: 14,
  enodeb: 0, gnodeb: 0, l2vpn: 0, l3vpn: 0
};

const buildDcDecomm = (geo: 'us' | 'in' = 'us'): Record<InactiveTab, ArchiveRow[]> => {
  const res: Record<string, ArchiveRow[]> = { gpu: [], server: [] };
  const isUs = geo === 'us';
  const sites = isUs ? DC_SITES_US : DC_SITES_IN;
  const engineers = isUs ? DC_ENGINEERS_US : DC_ENGINEERS_IN;
  const ipPrefix = isUs ? '10.240' : '10.244';
  const woPrefix = isUs ? 'WO-US' : 'WO-IN';

  for (const tab of DC_INACTIVE_TABS) {
    const k = tab.k;
    const seeds = DC_DECOMM_SEEDS[k] || [];
    const count = DC_COUNTS[k] || 10;
    const list: ArchiveRow[] = [];
    for (let i = 0; i < count; i++) {
      const s = seeds[i % seeds.length];
      const loc = sites[i % sites.length];
      const year = 2023 + (i % 4);
      const mo = MONTHS[(i * 3 + 2) % 12];
      const day = String(1 + ((i * 7) % 27)).padStart(2, '0');
      const isZombie = (k === 'router' && i === 2) || (k === 'switch' && i === 1);
      list.push({
        name: `${loc}-${s.prefix}-OLD-${String(i + 1).padStart(2, '0')}`,
        ip: `${ipPrefix}.${30 + (i % 20)}.${10 + (i % 80)}`,
        model: s.model,
        oem: s.oem,
        sn: `${s.oem.slice(0, 3)}-RET-${String(1000 + i * 47).padStart(4, '0')}`,
        loc: loc,
        why: s.why,
        on: `${day}-${mo}-${year}`,
        by: engineers[i % engineers.length],
        wo: `${woPrefix}-${year}-DC-${1000 + i * 137}`,
        zombie: isZombie
      });
    }
    res[k] = list.sort((a, b) => parseDmy(b.on).getTime() - parseDmy(a.on).getTime());
  }
  return res as Record<InactiveTab, ArchiveRow[]>;
};

export const DC_DECOMM_US: Record<InactiveTab, ArchiveRow[]> = buildDcDecomm('us');
export const DC_DECOMM_IN: Record<InactiveTab, ArchiveRow[]> = buildDcDecomm('in');
export const DC_DECOMM: Record<InactiveTab, ArchiveRow[]> = DC_DECOMM_US;

export const DEFAULT_DECOMM: Record<InactiveTab, ArchiveRow[]> = Object.fromEntries(
  [...new Set<InactiveTab>([...INACTIVE_TABS.map(t => t.k), ...NE_CLASSES])].map(k => {
    return [k, (NE_CLASSES as string[]).includes(k) ? fromMaster(k as NeClass) : expand(k, DECOMM_SEEDS[k as 'l2vpn' | 'l3vpn'], 18)];
  })
) as Record<InactiveTab, ArchiveRow[]>;

/* DECOMM defaults to DEFAULT_DECOMM for strict estate verification */
export const DECOMM: Record<InactiveTab, ArchiveRow[]> = DEFAULT_DECOMM;

export const decommRows = (cls: InactiveTab | 'all', geo?: DcGeo | null): ArchiveRow[] => {
  if (isScoped()) {
    const targetGeo = geo || (typeof window !== 'undefined' ? (currentGeo() || 'us') : null) || (isDatacenterUser() ? 'us' : 'us');
    const store = targetGeo === 'in' ? DC_DECOMM_IN : DC_DECOMM_US;
    if (cls === 'all') {
      const allCls: InactiveTab[] = ['switch', 'router', 'storage', 'firewall', 'dwdm', 'link', 'service'];
      const allRows = allCls.flatMap(k => (store[k] || []).map(r => ({
        ...r,
        cls: k,
        neType: k === 'server' ? 'SERVER' : k === 'switch' ? 'SWITCH' : k === 'router' ? 'ROUTER' : k === 'storage' ? 'STORAGE' : k === 'firewall' ? 'FIREWALL' : k === 'dwdm' ? 'DWDM' : k === 'link' ? 'LINK' : 'SERVICE'
      })));
      return allRows.sort((a, b) => Number(b.zombie) - Number(a.zombie));
    }
    return (store[cls] || (cls === 'gpu' || cls === 'server' ? [] : store.switch) || []).map(r => ({
      ...r,
      cls,
      neType: cls === 'server' ? 'SERVER' : cls === 'switch' ? 'SWITCH' : cls === 'router' ? 'ROUTER' : cls === 'storage' ? 'STORAGE' : cls === 'firewall' ? 'FIREWALL' : cls === 'dwdm' ? 'DWDM' : cls === 'link' ? 'LINK' : 'SERVICE'
    }));
  }
  return DEFAULT_DECOMM[cls as InactiveTab] || DEFAULT_DECOMM.router || [];
};

export const DECOMM_ZOMBIES = NE_CLASSES.flatMap(k => DEFAULT_DECOMM[k]).filter(r => r.zombie).length;

export const DECOMM_OLDEST = (() => {
  const dates = NE_CLASSES.flatMap(k => DEFAULT_DECOMM[k]).map(r => parseDmy(r.on)).sort((a, b) => a.getTime() - b.getTime());
  const mo = Math.round((TODAY.getTime() - dates[0].getTime()) / 2629800000);
  return `${Math.floor(mo / 12)}y ${mo % 12}mo`;
})();
