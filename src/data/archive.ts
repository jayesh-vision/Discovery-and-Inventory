import { NE_CLASSES, type NeClass, stockCount } from './ledger';

export interface ArchiveRow {
  name: string; ip: string; model: string; sn: string; oem: string; loc: string;
  why: string; on: string; by: string; wo: string; zombie: boolean;
}

/* The seeds are hand-written. The archive holds the full decommissioned
   population (289/61/34/19/5/4 = 412), so it is expanded deterministically to
   the counts the ledger declares — every page of every class tab has records. */
const DECOMM_SEEDS: Record<NeClass, ArchiveRow[]> = {
  router: [
    { name: 'MAS-J960-P-R2-T1-SR', ip: '172.31.31.140', model: 'MX960', sn: 'JN1231A55AFB', oem: 'JUNIPER', loc: 'MAS-041', why: 'Replaced under CR-8802', on: '14-Jun-2026', by: 'Anjali Verma', wo: 'WO-2026-4412', zombie: false },
    { name: 'DEL-N540X-SPARE', ip: '172.31.35.207', model: 'NCS-540', sn: 'CAT2077U1XX', oem: 'CISCO', loc: 'DEL-279', why: 'End of life', on: '02-May-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4188', zombie: true },
    { name: 'INDR-ASR920-R7', ip: '172.31.38.77', model: 'ASR920', sn: 'CAT2034U7RR', oem: 'CISCO', loc: 'INDR-275', why: 'Faulty, returned to OEM', on: '11-Feb-2026', by: 'Amit Sharma', wo: 'WO-2026-3901', zombie: false },
    { name: 'VZG-7750-BNG-02', ip: '172.31.49.202', model: '7750', sn: 'NSN7750VZG022', oem: 'NOKIA', loc: 'VJA-118', why: 'Capacity migration', on: '08-Jan-2026', by: 'Sai Krishna', wo: 'WO-2026-3644', zombie: true },
    { name: 'CHE-MX204-EDGE-11', ip: '172.31.61.88', model: 'MX204', sn: 'JN1188C21DDA', oem: 'JUNIPER', loc: 'CHE-118', why: 'Site consolidation', on: '22-Nov-2025', by: 'Harish Kumar', wo: 'WO-2025-9120', zombie: false }
  ],
  switch: [
    { name: 'BGLK-EX2200-OLD-03', ip: '172.31.31.44', model: 'EX2200-24T', sn: 'CHR-SN-441122', oem: 'JUNIPER', loc: 'BGLK-277', why: 'Site consolidation', on: '19-Mar-2026', by: 'Harish Kumar', wo: 'WO-2026-4021', zombie: false },
    { name: 'DEL-C9300-ACC-07', ip: '172.31.35.61', model: 'C9300-48UXM', sn: 'CAT2091U4KK', oem: 'CISCO', loc: 'DEL-279', why: 'End of support', on: '05-Feb-2026', by: 'Anjali Verma', wo: 'WO-2026-3877', zombie: false },
    { name: 'MAS-EX4300-DIST-02', ip: '172.31.33.19', model: 'EX4300-48P', sn: 'SW-PRO-CHR-1188', oem: 'JUNIPER', loc: 'MAS-041', why: 'Replaced under CR-8640', on: '12-Dec-2025', by: 'Sai Krishna', wo: 'WO-2025-9366', zombie: false },
    { name: 'INDR-EX2200-ACC-14', ip: '172.31.39.203', model: 'EX2200-24T', sn: 'CHR-SN-338710', oem: 'JUNIPER', loc: 'INDR-275', why: 'Water ingress, written off', on: '30-Aug-2025', by: 'Amit Sharma', wo: 'WO-2025-8455', zombie: false }
  ],
  server: [
    { name: 'BGLK-CDC-SRV-04', ip: '172.31.31.211', model: 'DL380 Gen10', sn: 'HPE380BG0441', oem: 'HPE', loc: 'BGLK-277', why: 'Hardware refresh', on: '28-Apr-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4155', zombie: false },
    { name: 'DEL-CDC-SRV-09', ip: '172.31.35.118', model: 'R740xd', sn: 'DELLR740D9022', oem: 'DELL', loc: 'DEL-279', why: 'Workload migrated to cloud', on: '17-Jan-2026', by: 'Anjali Verma', wo: 'WO-2026-3702', zombie: false },
    { name: 'MAS-CDC-SRV-02', ip: '172.31.33.88', model: 'DL360 Gen9', sn: 'HPE360MA1129', oem: 'HPE', loc: 'MAS-041', why: 'End of support', on: '09-Oct-2025', by: 'Amit Sharma', wo: 'WO-2025-8811', zombie: false },
    { name: 'VJA-CDC-SRV-01', ip: '172.31.53.44', model: 'R640', sn: 'DELLR640V4410', oem: 'DELL', loc: 'VJA-118', why: 'Site consolidation', on: '21-Jul-2025', by: 'Sai Krishna', wo: 'WO-2025-8102', zombie: false }
  ],
  dwdm: [
    { name: 'WR-ADVA-FSP3000-04', ip: '172.31.47.150', model: 'FSP 3000', sn: 'ADV3000WR0417', oem: 'ADVA', loc: 'DEL-279', why: 'Ring re-engineered', on: '06-Mar-2026', by: 'Harish Kumar', wo: 'WO-2026-3988', zombie: false },
    { name: 'BGLK-OADM-100-02', ip: '172.31.31.164', model: 'FSP 3000', sn: 'ADV3000BG1002', oem: 'ADVA', loc: 'BGLK-277', why: 'Capacity migration to C-band', on: '14-Nov-2025', by: 'Gaurav Shukla', wo: 'WO-2025-9044', zombie: false },
    { name: 'CHE-OADM-100-01', ip: '172.31.61.201', model: 'FSP 3000', sn: 'ADV3000CH1001', oem: 'ADVA', loc: 'CHE-118', why: 'End of support', on: '02-Jun-2025', by: 'Amit Sharma', wo: 'WO-2025-7660', zombie: false }
  ],
  enodeb: [
    { name: 'MP-INDR-ENB-118', ip: '172.31.39.118', model: 'BBU 3900', sn: 'ENB3900IN0118', oem: 'NOKIA', loc: 'INDR-275', why: '4G to 5G upgrade', on: '25-May-2026', by: 'Sai Krishna', wo: 'WO-2026-4260', zombie: false },
    { name: 'KA-BGLK-ENB-041', ip: '172.31.31.241', model: 'BBU 3900', sn: 'ENB3900BG0041', oem: 'NOKIA', loc: 'BGLK-277', why: 'Site decommissioned', on: '11-Jan-2026', by: 'Anjali Verma', wo: 'WO-2026-3688', zombie: false },
    { name: 'TN-CHE-ENB-207', ip: '172.31.61.207', model: 'BBU 3900', sn: 'ENB3900CH0207', oem: 'NOKIA', loc: 'CHE-118', why: '4G to 5G upgrade', on: '18-Sep-2025', by: 'Harish Kumar', wo: 'WO-2025-8702', zombie: false }
  ],
  gnodeb: [
    { name: 'BLR-SOUTH-GNB-014', ip: '172.31.41.114', model: 'AirScale', sn: 'GNB5GBL00014', oem: 'NOKIA', loc: 'BGLK-277', why: 'Replaced under CR-9014', on: '02-Jun-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4318', zombie: false },
    { name: 'DEL-CENTRAL-GNB-003', ip: '172.31.35.203', model: 'AirScale', sn: 'GNB5GDL00003', oem: 'NOKIA', loc: 'DEL-279', why: 'Antenna re-siting', on: '19-Feb-2026', by: 'Amit Sharma', wo: 'WO-2026-3844', zombie: false },
    { name: 'MAS-NORTH-GNB-008', ip: '172.31.33.208', model: 'AirScale', sn: 'GNB5GMA00008', oem: 'NOKIA', loc: 'MAS-041', why: 'Site consolidation', on: '07-Dec-2025', by: 'Anjali Verma', wo: 'WO-2025-9288', zombie: false }
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
const DK_ROLE: Record<NeClass, string[]> = { router: ['P','PE','BNG','EDGE','AGG'], switch: ['ACC','DIST','CORE','TOR'],
  server: ['SRV','CDC','APP','DB'], dwdm: ['OADM','ROADM','MUX','ILA'], enodeb: ['ENB'], gnodeb: ['GNB'] };

/* one small deterministic generator so a rebuild never reshuffles the archive */
const lcg = (seed: number) => { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

/* the prototype's "today"; decommission dates are always in the past */
export const TODAY = new Date(2026, 8, 3);

export const parseDmy = (s: string): Date => {
  const [d, m, y] = s.split('-');
  return new Date(Number(y), MONTHS.indexOf(m), Number(d));
};

function expand(cls: NeClass, seeds: ArchiveRow[], total: number): ArchiveRow[] {
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

export const DECOMM: Record<NeClass, ArchiveRow[]> = Object.fromEntries(
  NE_CLASSES.map(k => [k, expand(k, DECOMM_SEEDS[k], stockCount(k, 'decomm'))])
) as Record<NeClass, ArchiveRow[]>;

export const decommRows = (cls: NeClass): ArchiveRow[] => DECOMM[cls];
export const DECOMM_ZOMBIES = NE_CLASSES.flatMap(k => DECOMM[k]).filter(r => r.zombie).length;

export const DECOMM_OLDEST = (() => {
  const dates = NE_CLASSES.flatMap(k => DECOMM[k]).map(r => parseDmy(r.on)).sort((a, b) => a.getTime() - b.getTime());
  const mo = Math.round((TODAY.getTime() - dates[0].getTime()) / 2629800000);
  return `${Math.floor(mo / 12)} y ${mo % 12} mo`;
})();
