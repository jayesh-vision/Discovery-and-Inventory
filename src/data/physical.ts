import { ACTIVE_STATES, type ActiveStock, type NeClass, type RecState, type Source, type StockState } from './ledger';

export interface NeRow {
  st: RecState; name: string; ip: string; model: string; os: string; sn: string; oem: string;
  loc: string; s: Source; stock: StockState; v: number | null;
}

/* Hand-written seeds. The sample is grown to twelve rows per class below,
   spread across the active stock states, so no class tab or stock chip ever
   lands on a two-row list. Counts come from PHY_MATRIX, never from here. */
export const PHY_SEEDS: Record<NeClass, NeRow[]> = {
  router: [
    { st: 'ok', name: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.33.100', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB', oem: 'JUNIPER', loc: 'DEL-279', s: 'd', stock: 'deployed', v: 3 },
    { st: 'ok', name: 'VZG-N540X-PE-T4-NR', ip: '172.31.53.186', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W', oem: 'CISCO', loc: 'VJA-118', s: 'd', stock: 'deployed', v: 10 },
    { st: 'drift', name: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', model: 'ACX2200', os: '21.2R3-S8.5', sn: 'PJ0215230255', oem: 'JUNIPER', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'ET-J960-P-T1-WR', ip: '172.31.31.97', model: 'MX960', os: '21.4R3-S5.5', sn: 'JN1234C25AFA', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'stale', name: 'CHE-920-WIFI-R2', ip: '172.31.38.43', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PP', oem: 'CISCO', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 720 },
    { st: 'miss', name: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', model: '7750', os: '—', sn: 'JS123CC2EAFA', oem: 'NOKIA', loc: 'MAS-041', s: 'd', stock: 'faulty', v: 6264 },
    { st: 'none', name: 'ERS-N7750-SR7-T2-SR', ip: '192.168.1.14', model: '7750 SR-7', os: 'TiMOS-C-22.10.R1', sn: 'NSN7750ERS14A7X1', oem: 'NOKIA', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'none', name: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', model: 'EX4300-48P', os: '3.2.0.4', sn: 'QCT3048NDD11A01', oem: 'JUNIPER', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'ok', name: 'WKR-J7024-PE-T4-WR', ip: '172.31.62.11', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050', oem: 'JUNIPER', loc: 'WKR-204', s: 'd', stock: 'deployed', v: 5 }
  ],
  switch: [
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-01', ip: '172.31.31.201', model: 'L3-CORE-48P', os: '8.2.1', sn: 'HPE-SW-CH-2026-001', oem: 'CIENA', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-04', ip: '172.31.31.202', model: 'EX2200-24T', os: '15.1R7', sn: 'CHR-SN-808090', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'drift', name: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'stale', name: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', model: 'EX4300-48P', os: '20.4R3', sn: 'SW-PRO-CHR-4545', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 7104 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-09', ip: '172.31.31.205', model: 'C9400-LC-48T', os: '17.9.4', sn: 'CHRSW-909090', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 }
  ],
  server: [
    { st: 'none', name: 'BGLK-CDC-SRV-01', ip: '172.31.70.11', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XYZ', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'BGLK-CDC-SRV-02', ip: '172.31.70.12', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XZA', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'DEL-EDC-SRV-07', ip: '172.31.71.07', model: 'PowerEdge R760', os: 'RHEL 9.2', sn: 'DPE7601144', oem: 'DELL', loc: 'DEL-279', s: 'm', stock: 'deployed', v: null }
  ],
  dwdm: [
    { st: 'none', name: 'WR-ADVA-FSP3000-01', ip: '172.31.47.144', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8841', oem: 'ADVA', loc: 'MUM-011', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'WR-ADVA-FSP3000-02', ip: '172.31.47.145', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8842', oem: 'ADVA', loc: 'PUN-014', s: 'm', stock: 'deployed', v: null }
  ],
  enodeb: [
    { st: 'none', name: 'PUN-HNJW-C3-ENB-014', ip: '10.44.18.14', model: 'AirScale', os: '21B', sn: 'NOK-ENB-014', oem: 'NOKIA', loc: 'PUN-014', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'INDR-AREA-001-ENB-07', ip: '10.44.19.7', model: 'AirScale', os: '21B', sn: 'NOK-ENB-007', oem: 'NOKIA', loc: 'INDR-275', s: 'e', stock: 'deployed', v: null }
  ],
  gnodeb: [
    { st: 'none', name: 'BLR-SOUTH-GNB-021', ip: '10.51.22.21', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-021', oem: 'NOKIA', loc: 'BGLK-277', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'DEL-CENTRAL-GNB-009', ip: '10.51.23.9', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-009', oem: 'NOKIA', loc: 'DEL-279', s: 'e', stock: 'deployed', v: null }
  ]
};

const PAD_LOC = ['BGLK-277','DEL-279','INDR-275','VJA-118','CHE-118','MAS-041','PUN-162','HYD-093','KOL-204','AHM-131'];
const PAD_ST: RecState[] = ['ok','ok','drift','ok','stale','ok','drift','ok','none','ok'];
const PAD_STK: ActiveStock[] = ['deployed','deployed','deployed','instore','deployed','planned','deployed','faulty','planned','deployed'];

function grow(cls: NeClass, seeds: NeRow[], target = 12): NeRow[] {
  const out = seeds.slice();
  for (let i = 0; out.length < target; i++) {
    const base = seeds[i % seeds.length], k = out.length;
    const stock = PAD_STK[k % PAD_STK.length], planned = stock === 'planned';
    out.push({ ...base,
      st: planned ? 'none' : PAD_ST[k % PAD_ST.length],
      name: `${PAD_LOC[k % PAD_LOC.length].split('-')[0]}-${base.model.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase()}-${['P','PE','AGG','ACC','ER'][k % 5]}-${String(20 + k)}`,
      ip: planned ? `192.168.${20 + k % 9}.${11 + k}` : `172.31.${64 + (k * 5) % 60}.${12 + (k * 23) % 240}`,
      sn: base.sn.replace(/[0-9]{3}$/, String(200 + k * 7)) + String.fromCharCode(65 + k % 26),
      loc: PAD_LOC[k % PAD_LOC.length],
      stock,
      v: planned ? null : [3, 6, 11, 640][k % 4] });
  }
  void cls;
  return out;
}

export const PHY: Record<NeClass, NeRow[]> = Object.fromEntries(
  (Object.keys(PHY_SEEDS) as NeClass[]).map(k => [k, grow(k, PHY_SEEDS[k])])
) as Record<NeClass, NeRow[]>;

export const phyRows = (cls: NeClass, states: ReadonlySet<StockState>): NeRow[] =>
  PHY[cls].filter(r => states.has(r.stock));

export const isActive = (s: string): s is ActiveStock => (ACTIVE_STATES as string[]).includes(s);

/* per-row derived attributes the prototype computes rather than stores */
export const portsOf = (cls: NeClass, i: number): [number, number] =>
  cls === 'router' ? [36, 22 - (i % 5)] : cls === 'switch' ? [48, 30 + (i % 9)] : [0, 0];

const COMPLIANCE: Record<string, 'ok' | 'behind' | 'unknown'> = {
  'MX960': 'behind', 'NCS-540': 'ok', 'ACX2200': 'ok', 'MX204': 'behind',
  'ASR920': 'behind', '7750': 'unknown', '7750 SR-7': 'unknown', 'EX4300-48P': 'ok',
  'ACX7024': 'ok', 'C9300-48UXM': 'ok', 'EX2200-24T': 'behind', 'L3-CORE-48P': 'ok',
  'C9400-LC-48T': 'ok', 'L2-ACCESS-24P': 'ok'
};
export const complianceOf = (model: string) => COMPLIANCE[model] ?? 'unknown';

export type EosBand = 'past' | 'soon' | 'safe' | 'unknown';
const EOS: Record<string, [string, EosBand]> = {
  'MX960': ['30-Jun-2025', 'past'], 'MX204': ['31-Dec-2027', 'soon'], 'ASR920': ['30-Sep-2026', 'soon'],
  'EX2200-24T': ['31-Mar-2024', 'past'], 'EX4300-48P': ['31-Dec-2029', 'safe'], 'NCS-540': ['31-Dec-2030', 'safe'],
  'ACX2200': ['30-Jun-2030', 'safe'], 'ACX7024': ['31-Dec-2032', 'safe'], '7750': ['—', 'unknown'],
  '7750 SR-7': ['—', 'unknown'], 'C9300-48UXM': ['31-Oct-2029', 'safe'], 'C9400-LC-48T': ['30-Apr-2030', 'safe'],
  'L3-CORE-48P': ['31-Dec-2028', 'safe'], 'L2-ACCESS-24P': ['31-Dec-2028', 'safe']
};
export const eosOf = (model: string): [string, EosBand] => EOS[model] ?? ['—', 'unknown'];
