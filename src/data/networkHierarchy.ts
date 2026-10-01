/* ── Network Hierarchy & Topology Data Model ─────────────────────────
   Structured hierarchical data supporting the modern Miller columns
   cascading drill-down for the Discovery & Inventory networking estate.

   Hierarchy mapping:
   Datacenters (Hub / Root: 24 DCs)
     └── Circles (9 macro circles: MH, UP, KA, MP, DL, TN, GJ, AP, OTH)
           └── PoP Locations (230 PoPs estate total)
                 └── Network Elements (Core, PE, Aggregation, Leaf, BNG)
                       └── Interfaces (100GE, 10GE, GE, Bundle-Ether LAGs)

   Footing to the real estate totals:
   24 Datacenters · 230 PoP locations · 1,520 Sites · 3,842 Network Elements
   ─────────────────────────────────────────────────────────────────────── */

export interface NetworkInterface {
  id: string;
  name: string;
  adminStatus: 'up (1)' | 'down (2)';
  operStatus: 'up (1)' | 'down (2)';
  speed: string;
  linkId: string;
  peer?: string;
  type: string;
}

export interface NetworkElement {
  id: string;
  name: string;
  role: 'Core Router' | 'PE Router' | 'Aggregation Router' | 'Leaf Switch' | 'BNG Gateway' | 'Optical Transponder';
  model: string;
  vendor: 'CISCO' | 'JUNIPER' | 'NOKIA';
  ip: string;
  status: 'up' | 'warning' | 'alert';
  alerts: number;
  interfaceCount: number;
  interfaces: NetworkInterface[];
}

export interface PopLocation {
  id: string;
  code: string;
  name: string;
  badge: string; // e.g. "12S" (12 sites homed)
  siteCount: number;
  elementCount: number;
  alerts: number;
  elements: NetworkElement[];
}

export interface CircleHierarchy {
  id: string;
  code: string;
  name: string;
  badge: string; // e.g. "32P"
  dcCount: number;
  popCount: number;
  siteCount: number;
  totalCount: number;
  onAirPct: number;
  alerts: number;
  pops: PopLocation[];
}

export interface EstateHierarchy {
  id: string;
  name: string;
  tier: 'All Tiers' | 'Datacenters' | 'PoP Locations' | 'Sites';
  dcCount: number;
  popCount: number;
  siteCount: number;
  totalLocations: number;
  totalElements: number;
  alertLocations: number;
  circles: CircleHierarchy[];
}

export type HierarchyTier = 'datacenters' | 'pops' | 'sites';

export interface HierarchyTierInfo {
  id: HierarchyTier;
  title: string;
  count: number;
  countLabel: string;
  badge: string;
  subtitles: string[];
  icon: 'datacenter' | 'pop' | 'site';
  color: string;
}

export interface TopologyLocation {
  id: string;
  code: string;
  name: string;
  tier: HierarchyTier;
  circleId: string;
  circleCode: string;
  circleName: string;
  badge: string;
  subtitle: string;
  siteCount?: number;
  elementCount: number;
  alerts: number;
  elements: NetworkElement[];
}

/* ── Realistic Interface Generator ──────────────────────────────────── */
function createEquipmentInterfaces(prefix: string, count: number, hasAlert = false): NetworkInterface[] {
  const types = [
    { name: 'HundredGigE0/0/0/', speed: '100 Gbps', type: '100GE' },
    { name: 'HundredGigE0/0/1/', speed: '100 Gbps', type: '100GE' },
    { name: 'TenGigE0/1/0/', speed: '10 Gbps', type: '10GE' },
    { name: 'TenGigE0/1/1/', speed: '10 Gbps', type: '10GE' },
    { name: 'Bundle-Ether', speed: '200 Gbps LAG', type: 'LAG' },
    { name: 'GigabitEthernet0/2/', speed: '1 Gbps', type: 'GE' }
  ];

  return Array.from({ length: count }, (_, i) => {
    const t = types[i % types.length];
    const portNum = Math.floor(i / types.length);
    const ifName = t.name.startsWith('Bundle') ? `${t.name}${i + 1}` : `${t.name}${portNum}`;
    const isDown = hasAlert && (i === 1 || i === 4);

    return {
      id: `${prefix}_${ifName}`,
      name: ifName,
      adminStatus: isDown ? 'down (2)' : 'up (1)',
      operStatus: isDown ? 'down (2)' : 'up (1)',
      speed: t.speed,
      linkId: `LNK-${prefix.slice(0, 3)}-${1000 + i * 14}`,
      peer: i % 2 === 0 ? `CORE-${prefix.slice(0, 3)}-0${(i % 3) + 1}` : undefined,
      type: t.type
    };
  });
}

/* ── Complete Estate Hierarchy Dataset ───────────────────────────────── */
export const ESTATE_HIERARCHY: EstateHierarchy = {
  id: 'datacenters-estate',
  name: 'Datacenters',
  tier: 'All Tiers',
  dcCount: 24,
  popCount: 230,
  siteCount: 1520,
  totalLocations: 1774,
  totalElements: 3842,
  alertLocations: 37,
  circles: [
    {
      id: 'circle-mh',
      code: 'MH',
      name: 'Maharashtra',
      badge: '32P',
      dcCount: 4,
      popCount: 32,
      siteCount: 212,
      totalCount: 248,
      onAirPct: 70,
      alerts: 5,
      pops: [
        {
          id: 'mum-dc1-pop',
          code: 'MUM-DC1',
          name: 'Mumbai Central DC/PoP',
          badge: '18S',
          siteCount: 18,
          elementCount: 6,
          alerts: 1,
          elements: [
            {
              id: 'mum-cr01',
              name: 'MUM-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.14.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('MUM-CR01', 12, false)
            },
            {
              id: 'mum-pe02',
              name: 'MUM-PE02-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.14.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 16,
              interfaces: createEquipmentInterfaces('MUM-PE02', 16, true)
            },
            {
              id: 'mum-agg01',
              name: 'MUM-AGG01-ASR9K',
              role: 'Aggregation Router',
              model: 'Cisco ASR 9010',
              vendor: 'CISCO',
              ip: '10.14.1.10',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('MUM-AGG01', 14, false)
            },
            {
              id: 'mum-bng01',
              name: 'MUM-BNG01-MX480',
              role: 'BNG Gateway',
              model: 'Juniper MX480',
              vendor: 'JUNIPER',
              ip: '10.14.2.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('MUM-BNG01', 10, false)
            },
            {
              id: 'mum-sw01',
              name: 'MUM-SW01-C9300',
              role: 'Leaf Switch',
              model: 'Cisco Catalyst 9300',
              vendor: 'CISCO',
              ip: '10.14.3.5',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('MUM-SW01', 8, false)
            }
          ]
        },
        {
          id: 'bkc-core-pop',
          code: 'BKC-01',
          name: 'BKC Core Hub',
          badge: '16S',
          siteCount: 16,
          elementCount: 5,
          alerts: 0,
          elements: [
            {
              id: 'bkc-cr01',
              name: 'BKC-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.14.16.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('BKC-CR01', 12, false)
            },
            {
              id: 'bkc-pe01',
              name: 'BKC-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.14.16.2',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('BKC-PE01', 14, false)
            },
            {
              id: 'bkc-agg02',
              name: 'BKC-AGG02-ASR9K',
              role: 'Aggregation Router',
              model: 'Cisco ASR 9010',
              vendor: 'CISCO',
              ip: '10.14.17.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('BKC-AGG02', 10, false)
            }
          ]
        },
        {
          id: 'pun-hinj-pop',
          code: 'PUN-01',
          name: 'Pune Hinjewadi PoP',
          badge: '14S',
          siteCount: 14,
          elementCount: 5,
          alerts: 1,
          elements: [
            {
              id: 'pun-pe01',
              name: 'PUN-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.15.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('PUN-PE01', 10, false)
            },
            {
              id: 'pun-agg01',
              name: 'PUN-AGG01-MX204',
              role: 'Aggregation Router',
              model: 'Juniper MX204',
              vendor: 'JUNIPER',
              ip: '10.15.1.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('PUN-AGG01', 8, true)
            }
          ]
        },
        {
          id: 'ngp-cnt-pop',
          code: 'NGP-01',
          name: 'Nagpur Central PoP',
          badge: '10S',
          siteCount: 10,
          elementCount: 4,
          alerts: 0,
          elements: [
            {
              id: 'ngp-pe01',
              name: 'NGP-PE01-ASR903',
              role: 'PE Router',
              model: 'Cisco ASR 903',
              vendor: 'CISCO',
              ip: '10.16.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('NGP-PE01', 8, false)
            }
          ]
        },
        {
          id: 'nsk-reg-pop',
          code: 'NSK-01',
          name: 'Nashik Regional Hub',
          badge: '8S',
          siteCount: 8,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'nsk-pe01',
              name: 'NSK-PE01-ACX1100',
              role: 'PE Router',
              model: 'Juniper ACX1100',
              vendor: 'JUNIPER',
              ip: '10.17.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 6,
              interfaces: createEquipmentInterfaces('NSK-PE01', 6, false)
            }
          ]
        },
        {
          id: 'thn-agg-pop',
          code: 'THN-01',
          name: 'Thane Aggregation PoP',
          badge: '8S',
          siteCount: 8,
          elementCount: 4,
          alerts: 1,
          elements: [
            {
              id: 'thn-agg01',
              name: 'THN-AGG01-NCS540',
              role: 'Aggregation Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.18.0.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('THN-AGG01', 8, true)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-up',
      code: 'UP',
      name: 'Uttar Pradesh',
      badge: '27P',
      dcCount: 3,
      popCount: 27,
      siteCount: 191,
      totalCount: 221,
      onAirPct: 71,
      alerts: 7,
      pops: [
        {
          id: 'lko-core-pop',
          code: 'LKO-01',
          name: 'Lucknow Core PoP',
          badge: '16S',
          siteCount: 16,
          elementCount: 5,
          alerts: 1,
          elements: [
            {
              id: 'lko-cr01',
              name: 'LKO-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.20.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('LKO-CR01', 12, false)
            },
            {
              id: 'lko-pe01',
              name: 'LKO-PE01-MX480',
              role: 'PE Router',
              model: 'Juniper MX480',
              vendor: 'JUNIPER',
              ip: '10.20.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('LKO-PE01', 10, true)
            }
          ]
        },
        {
          id: 'noi-hub-pop',
          code: 'NOI-01',
          name: 'Noida Tech Hub DC/PoP',
          badge: '20S',
          siteCount: 20,
          elementCount: 6,
          alerts: 2,
          elements: [
            {
              id: 'noi-cr01',
              name: 'NOI-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.21.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('NOI-CR01', 14, false)
            },
            {
              id: 'noi-pe01',
              name: 'NOI-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.21.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('NOI-PE01', 12, true)
            }
          ]
        },
        {
          id: 'knp-cnt-pop',
          code: 'KNP-01',
          name: 'Kanpur Central PoP',
          badge: '12S',
          siteCount: 12,
          elementCount: 4,
          alerts: 0,
          elements: [
            {
              id: 'knp-pe01',
              name: 'KNP-PE01-ASR903',
              role: 'PE Router',
              model: 'Cisco ASR 903',
              vendor: 'CISCO',
              ip: '10.22.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('KNP-PE01', 8, false)
            }
          ]
        },
        {
          id: 'vns-her-pop',
          code: 'VNS-01',
          name: 'Varanasi Heritage PoP',
          badge: '10S',
          siteCount: 10,
          elementCount: 4,
          alerts: 1,
          elements: [
            {
              id: 'vns-pe01',
              name: 'VNS-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.23.0.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('VNS-PE01', 8, true)
            }
          ]
        },
        {
          id: 'pry-reg-pop',
          code: 'PRY-01',
          name: 'Prayagraj Regional PoP',
          badge: '8S',
          siteCount: 8,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'pry-pe01',
              name: 'PRY-PE01-ACX1100',
              role: 'PE Router',
              model: 'Juniper ACX1100',
              vendor: 'JUNIPER',
              ip: '10.24.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 6,
              interfaces: createEquipmentInterfaces('PRY-PE01', 6, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-ka',
      code: 'KA',
      name: 'Karnataka',
      badge: '26P',
      dcCount: 3,
      popCount: 26,
      siteCount: 182,
      totalCount: 211,
      onAirPct: 76,
      alerts: 3,
      pops: [
        {
          id: 'blr-wf-pop',
          code: 'BLR-DC1',
          name: 'Bengaluru Whitefield DC/PoP',
          badge: '20S',
          siteCount: 20,
          elementCount: 6,
          alerts: 1,
          elements: [
            {
              id: 'blr-cr01',
              name: 'BLR-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.30.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('BLR-CR01', 14, false)
            },
            {
              id: 'blr-pe01',
              name: 'BLR-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.30.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('BLR-PE01', 12, true)
            }
          ]
        },
        {
          id: 'blr-ec-pop',
          code: 'BLR-EC1',
          name: 'Electronic City Hub',
          badge: '16S',
          siteCount: 16,
          elementCount: 4,
          alerts: 0,
          elements: [
            {
              id: 'blr-agg01',
              name: 'BLR-AGG01-ASR9K',
              role: 'Aggregation Router',
              model: 'Cisco ASR 9010',
              vendor: 'CISCO',
              ip: '10.31.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('BLR-AGG01', 10, false)
            }
          ]
        },
        {
          id: 'mys-pop',
          code: 'MYS-01',
          name: 'Mysuru Regional PoP',
          badge: '8S',
          siteCount: 8,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'mys-pe01',
              name: 'MYS-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.32.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('MYS-PE01', 8, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-mp',
      code: 'MP',
      name: 'Madhya Pradesh',
      badge: '24P',
      dcCount: 2,
      popCount: 24,
      siteCount: 168,
      totalCount: 194,
      onAirPct: 61,
      alerts: 5,
      pops: [
        {
          id: 'bpl-pop',
          code: 'BPL-01',
          name: 'Bhopal Central DC/PoP',
          badge: '14S',
          siteCount: 14,
          elementCount: 4,
          alerts: 1,
          elements: [
            {
              id: 'bpl-pe01',
              name: 'BPL-PE01-MX480',
              role: 'PE Router',
              model: 'Juniper MX480',
              vendor: 'JUNIPER',
              ip: '10.40.0.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('BPL-PE01', 10, true)
            }
          ]
        },
        {
          id: 'idr-pop',
          code: 'IDR-01',
          name: 'Indore Super Corridor PoP',
          badge: '16S',
          siteCount: 16,
          elementCount: 4,
          alerts: 0,
          elements: [
            {
              id: 'idr-pe01',
              name: 'IDR-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.41.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('IDR-PE01', 8, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-dl',
      code: 'DL',
      name: 'Delhi',
      badge: '22P',
      dcCount: 3,
      popCount: 22,
      siteCount: 151,
      totalCount: 176,
      onAirPct: 79,
      alerts: 3,
      pops: [
        {
          id: 'ndls-cp-pop',
          code: 'NDLS-CP1',
          name: 'Connaught Place Core DC/PoP',
          badge: '16S',
          siteCount: 16,
          elementCount: 6,
          alerts: 1,
          elements: [
            {
              id: 'ndls-cr01',
              name: 'NDLS-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.50.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('NDLS-CR01', 14, false)
            },
            {
              id: 'ndls-pe01',
              name: 'NDLS-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.50.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('NDLS-PE01', 12, true)
            },
            {
              id: 'ndls-agg01',
              name: 'NDLS-AGG01-ASR9K',
              role: 'Aggregation Router',
              model: 'Cisco ASR 9010',
              vendor: 'CISCO',
              ip: '10.50.1.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('NDLS-AGG01', 10, false)
            }
          ]
        },
        {
          id: 'okh-pop',
          code: 'OKH-01',
          name: 'Okhla Industrial Hub',
          badge: '12S',
          siteCount: 12,
          elementCount: 4,
          alerts: 0,
          elements: [
            {
              id: 'okh-pe01',
              name: 'OKH-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.51.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('OKH-PE01', 8, false)
            }
          ]
        },
        {
          id: 'dwk-pop',
          code: 'DWK-01',
          name: 'Dwarka Distribution PoP',
          badge: '10S',
          siteCount: 10,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'dwk-pe01',
              name: 'DWK-PE01-MX204',
              role: 'PE Router',
              model: 'Juniper MX204',
              vendor: 'JUNIPER',
              ip: '10.52.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('DWK-PE01', 8, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-tn',
      code: 'TN',
      name: 'Tamil Nadu',
      badge: '19P',
      dcCount: 2,
      popCount: 19,
      siteCount: 133,
      totalCount: 154,
      onAirPct: 73,
      alerts: 4,
      pops: [
        {
          id: 'che-tidel-pop',
          code: 'CHE-DC1',
          name: 'Chennai Tidel Park DC/PoP',
          badge: '16S',
          siteCount: 16,
          elementCount: 5,
          alerts: 1,
          elements: [
            {
              id: 'che-cr01',
              name: 'CHE-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.60.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('CHE-CR01', 12, false)
            },
            {
              id: 'che-pe01',
              name: 'CHE-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.60.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('CHE-PE01', 10, true)
            }
          ]
        },
        {
          id: 'cbe-pop',
          code: 'CBE-01',
          name: 'Coimbatore IT Hub PoP',
          badge: '10S',
          siteCount: 10,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'cbe-pe01',
              name: 'CBE-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.61.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('CBE-PE01', 8, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-gj',
      code: 'GJ',
      name: 'Gujarat',
      badge: '18P',
      dcCount: 2,
      popCount: 18,
      siteCount: 132,
      totalCount: 152,
      onAirPct: 68,
      alerts: 1,
      pops: [
        {
          id: 'gift-dc-pop',
          code: 'GIFT-DC1',
          name: 'GIFT City DC/PoP',
          badge: '18S',
          siteCount: 18,
          elementCount: 5,
          alerts: 0,
          elements: [
            {
              id: 'gift-cr01',
              name: 'GIFT-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.70.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('GIFT-CR01', 12, false)
            },
            {
              id: 'gift-pe01',
              name: 'GIFT-PE01-MX480',
              role: 'PE Router',
              model: 'Juniper MX480',
              vendor: 'JUNIPER',
              ip: '10.70.0.2',
              status: 'up',
              alerts: 0,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('GIFT-PE01', 10, false)
            }
          ]
        },
        {
          id: 'sur-pop',
          code: 'SUR-01',
          name: 'Surat Diamond Hub',
          badge: '10S',
          siteCount: 10,
          elementCount: 3,
          alerts: 1,
          elements: [
            {
              id: 'sur-pe01',
              name: 'SUR-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.71.0.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('SUR-PE01', 8, true)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-ap',
      code: 'AP',
      name: 'Andhra Pradesh',
      badge: '17P',
      dcCount: 2,
      popCount: 17,
      siteCount: 124,
      totalCount: 143,
      onAirPct: 67,
      alerts: 3,
      pops: [
        {
          id: 'vtz-pop',
          code: 'VTZ-01',
          name: 'Visakhapatnam Port DC/PoP',
          badge: '14S',
          siteCount: 14,
          elementCount: 4,
          alerts: 1,
          elements: [
            {
              id: 'vtz-pe01',
              name: 'VTZ-PE01-MX480',
              role: 'PE Router',
              model: 'Juniper MX480',
              vendor: 'JUNIPER',
              ip: '10.80.0.1',
              status: 'alert',
              alerts: 1,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('VTZ-PE01', 10, true)
            }
          ]
        },
        {
          id: 'bza-pop',
          code: 'BZA-01',
          name: 'Vijayawada Core PoP',
          badge: '12S',
          siteCount: 12,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'bza-pe01',
              name: 'BZA-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.81.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('BZA-PE01', 8, false)
            }
          ]
        }
      ]
    },
    {
      id: 'circle-oth',
      code: 'OTH',
      name: 'Other circles',
      badge: '25P',
      dcCount: 3,
      popCount: 25,
      siteCount: 227,
      totalCount: 255,
      onAirPct: 67,
      alerts: 3,
      pops: [
        {
          id: 'ccu-pop',
          code: 'CCU-DC1',
          name: 'Kolkata Salt Lake DC/PoP',
          badge: '16S',
          siteCount: 16,
          elementCount: 5,
          alerts: 1,
          elements: [
            {
              id: 'ccu-cr01',
              name: 'CCU-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.90.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 12,
              interfaces: createEquipmentInterfaces('CCU-CR01', 12, false)
            },
            {
              id: 'ccu-pe01',
              name: 'CCU-PE01-MX960',
              role: 'PE Router',
              model: 'Juniper MX960',
              vendor: 'JUNIPER',
              ip: '10.90.0.2',
              status: 'alert',
              alerts: 1,
              interfaceCount: 10,
              interfaces: createEquipmentInterfaces('CCU-PE01', 10, true)
            }
          ]
        },
        {
          id: 'hyd-pop',
          code: 'HYD-01',
          name: 'Hyderabad Hitec City PoP',
          badge: '18S',
          siteCount: 18,
          elementCount: 5,
          alerts: 0,
          elements: [
            {
              id: 'hyd-cr01',
              name: 'HYD-CR01-NCS55A',
              role: 'Core Router',
              model: 'Cisco NCS 55A2',
              vendor: 'CISCO',
              ip: '10.91.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 14,
              interfaces: createEquipmentInterfaces('HYD-CR01', 14, false)
            }
          ]
        },
        {
          id: 'cok-pop',
          code: 'COK-01',
          name: 'Kochi Infopark Coastal Hub',
          badge: '10S',
          siteCount: 10,
          elementCount: 3,
          alerts: 0,
          elements: [
            {
              id: 'cok-pe01',
              name: 'COK-PE01-NCS540',
              role: 'PE Router',
              model: 'Cisco NCS 540',
              vendor: 'CISCO',
              ip: '10.92.0.1',
              status: 'up',
              alerts: 0,
              interfaceCount: 8,
              interfaces: createEquipmentInterfaces('COK-PE01', 8, false)
            }
          ]
        }
      ]
    }
  ]
};

/* ── Tier Definitions matching Multi-Tier Topology View ──────────────── */
export const HIERARCHY_TIERS: HierarchyTierInfo[] = [
  {
    id: 'datacenters',
    title: 'Data Centers',
    count: 24,
    countLabel: '24 Data Centers',
    badge: '24',
    subtitles: ['24 Data Centers', '230 PoPs · 1,520 Sites'],
    icon: 'datacenter',
    color: '#8b5cf6'
  },
  {
    id: 'pops',
    title: 'PoP Locations',
    count: 6320,
    countLabel: '6,320 PoPs',
    badge: '6,320',
    subtitles: ['6,320 PoPs', '18,450 Sites'],
    icon: 'pop',
    color: '#0284c7'
  },
  {
    id: 'sites',
    title: 'Sites',
    count: 12450,
    countLabel: '12,450 Sites',
    badge: '12,450',
    subtitles: ['12,450 Sites'],
    icon: 'site',
    color: '#10b981'
  }
];

/* ── Dedicated Data Center Locations ─────────────────────────────────── */
export const DATACENTER_LOCATIONS: TopologyLocation[] = [
  {
    id: 'dc-mum-01',
    code: 'MUM-DC-01',
    name: 'Mumbai Central DC-01',
    tier: 'datacenters',
    circleId: 'circle-mh',
    circleCode: 'MH',
    circleName: 'Maharashtra',
    badge: 'Tier-4',
    subtitle: '18 Sites · 6 Elements',
    siteCount: 18,
    elementCount: 6,
    alerts: 1,
    elements: [
      {
        id: 'mum-dc-cr01',
        name: 'MUM-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.14.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('MUM-DC-CR01', 12, false)
      },
      {
        id: 'mum-dc-spine01',
        name: 'MUM-DC-SPINE01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 9336C',
        vendor: 'CISCO',
        ip: '10.14.0.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 16,
        interfaces: createEquipmentInterfaces('MUM-DC-SPINE01', 16, false)
      },
      {
        id: 'mum-dc-leaf01',
        name: 'MUM-DC-LEAF01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 93180',
        vendor: 'CISCO',
        ip: '10.14.0.11',
        status: 'alert',
        alerts: 1,
        interfaceCount: 14,
        interfaces: createEquipmentInterfaces('MUM-DC-LEAF01', 14, true)
      },
      {
        id: 'mum-dc-br01',
        name: 'MUM-DC-BR01-MX960',
        role: 'PE Router',
        model: 'Juniper MX960',
        vendor: 'JUNIPER',
        ip: '10.14.0.2',
        status: 'up',
        alerts: 0,
        interfaceCount: 10,
        interfaces: createEquipmentInterfaces('MUM-DC-BR01', 10, false)
      },
      {
        id: 'mum-dc-opt01',
        name: 'MUM-DC-OPT01-1830',
        role: 'Optical Transponder',
        model: 'Nokia 1830 PSS',
        vendor: 'NOKIA',
        ip: '10.14.0.25',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('MUM-DC-OPT01', 8, false)
      },
      {
        id: 'mum-dc-sec01',
        name: 'MUM-DC-FW01-FG3600',
        role: 'Core Router',
        model: 'Fortinet FortiGate 3600E',
        vendor: 'CISCO',
        ip: '10.14.0.30',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('MUM-DC-FW01', 8, false)
      }
    ]
  },
  {
    id: 'dc-dl-01',
    code: 'DL-DC-01',
    name: 'Delhi National Core DC',
    tier: 'datacenters',
    circleId: 'circle-dl',
    circleCode: 'DL',
    circleName: 'Delhi',
    badge: 'Tier-4',
    subtitle: '22 Sites · 5 Elements',
    siteCount: 22,
    elementCount: 5,
    alerts: 0,
    elements: [
      {
        id: 'dl-dc-cr01',
        name: 'DEL-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.11.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('DEL-DC-CR01', 12, false)
      },
      {
        id: 'dl-dc-spine01',
        name: 'DEL-DC-SPINE01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 9336C',
        vendor: 'CISCO',
        ip: '10.11.0.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 16,
        interfaces: createEquipmentInterfaces('DEL-DC-SPINE01', 16, false)
      },
      {
        id: 'dl-dc-leaf01',
        name: 'DEL-DC-LEAF01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 93180',
        vendor: 'CISCO',
        ip: '10.11.0.11',
        status: 'up',
        alerts: 0,
        interfaceCount: 14,
        interfaces: createEquipmentInterfaces('DEL-DC-LEAF01', 14, false)
      },
      {
        id: 'dl-dc-br01',
        name: 'DEL-DC-BR01-MX960',
        role: 'PE Router',
        model: 'Juniper MX960',
        vendor: 'JUNIPER',
        ip: '10.11.0.2',
        status: 'up',
        alerts: 0,
        interfaceCount: 10,
        interfaces: createEquipmentInterfaces('DEL-DC-BR01', 10, false)
      },
      {
        id: 'dl-dc-opt01',
        name: 'DEL-DC-OPT01-1830',
        role: 'Optical Transponder',
        model: 'Nokia 1830 PSS',
        vendor: 'NOKIA',
        ip: '10.11.0.25',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('DEL-DC-OPT01', 8, false)
      }
    ]
  },
  {
    id: 'dc-blr-01',
    code: 'KA-DC-01',
    name: 'Bengaluru Cloud Tech DC',
    tier: 'datacenters',
    circleId: 'circle-ka',
    circleCode: 'KA',
    circleName: 'Karnataka',
    badge: 'Tier-3+',
    subtitle: '20 Sites · 5 Elements',
    siteCount: 20,
    elementCount: 5,
    alerts: 0,
    elements: [
      {
        id: 'blr-dc-cr01',
        name: 'BLR-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.80.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('BLR-DC-CR01', 12, false)
      },
      {
        id: 'blr-dc-spine01',
        name: 'BLR-DC-SPINE01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 9336C',
        vendor: 'CISCO',
        ip: '10.80.0.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 14,
        interfaces: createEquipmentInterfaces('BLR-DC-SPINE01', 14, false)
      },
      {
        id: 'blr-dc-leaf01',
        name: 'BLR-DC-LEAF01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 93180',
        vendor: 'CISCO',
        ip: '10.80.0.11',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('BLR-DC-LEAF01', 12, false)
      },
      {
        id: 'blr-dc-opt01',
        name: 'BLR-DC-OPT01-1830',
        role: 'Optical Transponder',
        model: 'Nokia 1830 PSS',
        vendor: 'NOKIA',
        ip: '10.80.0.25',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('BLR-DC-OPT01', 8, false)
      }
    ]
  },
  {
    id: 'dc-noi-01',
    code: 'UP-DC-01',
    name: 'Noida Enterprise Tier-4 DC',
    tier: 'datacenters',
    circleId: 'circle-up',
    circleCode: 'UP',
    circleName: 'Uttar Pradesh',
    badge: 'Tier-4',
    subtitle: '19 Sites · 5 Elements',
    siteCount: 19,
    elementCount: 5,
    alerts: 1,
    elements: [
      {
        id: 'noi-dc-cr01',
        name: 'NOI-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.12.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('NOI-DC-CR01', 12, false)
      },
      {
        id: 'noi-dc-spine01',
        name: 'NOI-DC-SPINE01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 9336C',
        vendor: 'CISCO',
        ip: '10.12.0.10',
        status: 'alert',
        alerts: 1,
        interfaceCount: 14,
        interfaces: createEquipmentInterfaces('NOI-DC-SPINE01', 14, true)
      },
      {
        id: 'noi-dc-leaf01',
        name: 'NOI-DC-LEAF01-N9K',
        role: 'Leaf Switch',
        model: 'Cisco Nexus 93180',
        vendor: 'CISCO',
        ip: '10.12.0.11',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('NOI-DC-LEAF01', 12, false)
      }
    ]
  },
  {
    id: 'dc-chn-01',
    code: 'TN-DC-01',
    name: 'Chennai Subsea Landing DC',
    tier: 'datacenters',
    circleId: 'circle-tn',
    circleCode: 'TN',
    circleName: 'Tamil Nadu',
    badge: 'Subsea',
    subtitle: '15 Sites · 4 Elements',
    siteCount: 15,
    elementCount: 4,
    alerts: 0,
    elements: [
      {
        id: 'chn-dc-cr01',
        name: 'CHN-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.44.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('CHN-DC-CR01', 12, false)
      },
      {
        id: 'chn-dc-opt01',
        name: 'CHN-DC-OPT01-DWDM',
        role: 'Optical Transponder',
        model: 'Nokia 1830 PSS',
        vendor: 'NOKIA',
        ip: '10.44.0.25',
        status: 'up',
        alerts: 0,
        interfaceCount: 10,
        interfaces: createEquipmentInterfaces('CHN-DC-OPT01', 10, false)
      }
    ]
  },
  {
    id: 'dc-pun-02',
    code: 'MH-DC-02',
    name: 'Pune Tech Edge DC',
    tier: 'datacenters',
    circleId: 'circle-mh',
    circleCode: 'MH',
    circleName: 'Maharashtra',
    badge: 'Tier-3',
    subtitle: '14 Sites · 4 Elements',
    siteCount: 14,
    elementCount: 4,
    alerts: 0,
    elements: [
      {
        id: 'pun-dc-cr01',
        name: 'PUN-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.14.20.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('PUN-DC-CR01', 12, false)
      }
    ]
  },
  {
    id: 'dc-hyd-01',
    code: 'AP-DC-01',
    name: 'Hyderabad Hitec City DC',
    tier: 'datacenters',
    circleId: 'circle-ap',
    circleCode: 'AP',
    circleName: 'Andhra Pradesh',
    badge: 'Tier-3+',
    subtitle: '14 Sites · 4 Elements',
    siteCount: 14,
    elementCount: 4,
    alerts: 0,
    elements: [
      {
        id: 'hyd-dc-cr01',
        name: 'HYD-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.91.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('HYD-DC-CR01', 12, false)
      }
    ]
  },
  {
    id: 'dc-ahm-01',
    code: 'GJ-DC-01',
    name: 'Ahmedabad Infocity DC',
    tier: 'datacenters',
    circleId: 'circle-gj',
    circleCode: 'GJ',
    circleName: 'Gujarat',
    badge: 'Tier-3',
    subtitle: '12 Sites · 4 Elements',
    siteCount: 12,
    elementCount: 4,
    alerts: 0,
    elements: [
      {
        id: 'ahm-dc-cr01',
        name: 'AHM-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.79.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('AHM-DC-CR01', 12, false)
      }
    ]
  },
  {
    id: 'dc-bpl-01',
    code: 'MP-DC-01',
    name: 'Bhopal Central DC',
    tier: 'datacenters',
    circleId: 'circle-mp',
    circleCode: 'MP',
    circleName: 'Madhya Pradesh',
    badge: 'Tier-3',
    subtitle: '10 Sites · 3 Elements',
    siteCount: 10,
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'bpl-dc-cr01',
        name: 'BPL-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.75.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 10,
        interfaces: createEquipmentInterfaces('BPL-DC-CR01', 10, false)
      }
    ]
  },
  {
    id: 'dc-ccu-01',
    code: 'OTH-DC-01',
    name: 'Kolkata East Core DC',
    tier: 'datacenters',
    circleId: 'circle-oth',
    circleCode: 'OTH',
    circleName: 'Other circles',
    badge: 'Tier-3+',
    subtitle: '10 Sites · 4 Elements',
    siteCount: 10,
    elementCount: 4,
    alerts: 0,
    elements: [
      {
        id: 'ccu-dc-cr01',
        name: 'CCU-DC-CR01-NCS55A',
        role: 'Core Router',
        model: 'Cisco NCS 55A2',
        vendor: 'CISCO',
        ip: '10.33.0.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 12,
        interfaces: createEquipmentInterfaces('CCU-DC-CR01', 12, false)
      }
    ]
  }
];

/* ── Dedicated Sites Locations ───────────────────────────────────────── */
export const SITE_LOCATIONS: TopologyLocation[] = [
  {
    id: 'site-mum-4012',
    code: 'MH-MUM-4012',
    name: 'Site MH-MUM-4012 (Andheri East)',
    tier: 'sites',
    circleId: 'circle-mh',
    circleCode: 'MH',
    circleName: 'Maharashtra',
    badge: '5G Macro',
    subtitle: '3 Elements · 5G Macro Tower',
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'csr-mum-4012',
        name: 'CSR-MUM-4012-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.14.120.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-MUM-4012', 8, false)
      },
      {
        id: 'bbu-mum-4012',
        name: 'BBU-MUM-4012-5G-AIR',
        role: 'Leaf Switch',
        model: 'AirScale BBU 5G',
        vendor: 'NOKIA',
        ip: '10.14.120.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('BBU-MUM-4012', 6, false)
      },
      {
        id: 'mw-mum-4012',
        name: 'MW-MUM-4012-ODU',
        role: 'Optical Transponder',
        model: 'SIAE Microelettronica ALFOplus',
        vendor: 'NOKIA',
        ip: '10.14.120.15',
        status: 'up',
        alerts: 0,
        interfaceCount: 4,
        interfaces: createEquipmentInterfaces('MW-MUM-4012', 4, false)
      }
    ]
  },
  {
    id: 'site-mum-4018',
    code: 'MH-MUM-4018',
    name: 'Site MH-MUM-4018 (BKC Commercial Pole)',
    tier: 'sites',
    circleId: 'circle-mh',
    circleCode: 'MH',
    circleName: 'Maharashtra',
    badge: 'Small Cell',
    subtitle: '2 Elements · 4G/5G Micro',
    elementCount: 2,
    alerts: 0,
    elements: [
      {
        id: 'csr-mum-4018',
        name: 'CSR-MUM-4018-IXR7250',
        role: 'Core Router',
        model: 'Nokia 7250 IXR-e',
        vendor: 'NOKIA',
        ip: '10.14.122.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('CSR-MUM-4018', 6, false)
      },
      {
        id: 'bbu-mum-4018',
        name: 'BBU-MUM-4018-MICRO',
        role: 'Leaf Switch',
        model: 'AirScale SmallCell',
        vendor: 'NOKIA',
        ip: '10.14.122.5',
        status: 'up',
        alerts: 0,
        interfaceCount: 4,
        interfaces: createEquipmentInterfaces('BBU-MUM-4018', 4, false)
      }
    ]
  },
  {
    id: 'site-pun-2104',
    code: 'MH-PUN-2104',
    name: 'Site MH-PUN-2104 (Hinjewadi Ph-2)',
    tier: 'sites',
    circleId: 'circle-mh',
    circleCode: 'MH',
    circleName: 'Maharashtra',
    badge: 'Hub Site',
    subtitle: '3 Elements · Hub Tower',
    elementCount: 3,
    alerts: 1,
    elements: [
      {
        id: 'csr-pun-2104',
        name: 'CSR-PUN-2104-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.14.214.1',
        status: 'alert',
        alerts: 1,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-PUN-2104', 8, true)
      },
      {
        id: 'bbu-pun-2104',
        name: 'BBU-PUN-2104-5G',
        role: 'Leaf Switch',
        model: 'AirScale BBU 5G',
        vendor: 'NOKIA',
        ip: '10.14.214.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('BBU-PUN-2104', 6, false)
      },
      {
        id: 'sw-pun-2104',
        name: 'SW-PUN-2104-C9200',
        role: 'Leaf Switch',
        model: 'Cisco Catalyst 9200',
        vendor: 'CISCO',
        ip: '10.14.214.15',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('SW-PUN-2104', 6, false)
      }
    ]
  },
  {
    id: 'site-dl-1088',
    code: 'DL-NDL-1088',
    name: 'Site DL-NDL-1088 (Connaught Place)',
    tier: 'sites',
    circleId: 'circle-dl',
    circleCode: 'DL',
    circleName: 'Delhi',
    badge: 'Rooftop',
    subtitle: '3 Elements · Prime Rooftop',
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'csr-dl-1088',
        name: 'CSR-DEL-1088-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.11.188.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-DEL-1088', 8, false)
      },
      {
        id: 'bbu-dl-1088',
        name: 'BBU-DEL-1088-5G',
        role: 'Leaf Switch',
        model: 'AirScale BBU 5G',
        vendor: 'NOKIA',
        ip: '10.11.188.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('BBU-DEL-1088', 6, false)
      }
    ]
  },
  {
    id: 'site-blr-3001',
    code: 'KA-BLR-3001',
    name: 'Site KA-BLR-3001 (Indiranagar 5G)',
    tier: 'sites',
    circleId: 'circle-ka',
    circleCode: 'KA',
    circleName: 'Karnataka',
    badge: '5G Macro',
    subtitle: '3 Elements · Urban Macro',
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'csr-blr-3001',
        name: 'CSR-BLR-3001-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.80.101.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-BLR-3001', 8, false)
      },
      {
        id: 'bbu-blr-3001',
        name: 'BBU-BLR-3001-5G',
        role: 'Leaf Switch',
        model: 'AirScale BBU 5G',
        vendor: 'NOKIA',
        ip: '10.80.101.10',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('BBU-BLR-3001', 6, false)
      }
    ]
  },
  {
    id: 'site-noi-6022',
    code: 'UP-NOI-6022',
    name: 'Site UP-NOI-6022 (Sector 62)',
    tier: 'sites',
    circleId: 'circle-up',
    circleCode: 'UP',
    circleName: 'Uttar Pradesh',
    badge: 'Hub Site',
    subtitle: '3 Elements · Hub Tower',
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'csr-noi-6022',
        name: 'CSR-NOI-6022-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.12.122.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-NOI-6022', 8, false)
      }
    ]
  },
  {
    id: 'site-chn-5011',
    code: 'TN-CHN-5011',
    name: 'Site TN-CHN-5011 (OMR IT Expressway)',
    tier: 'sites',
    circleId: 'circle-tn',
    circleCode: 'TN',
    circleName: 'Tamil Nadu',
    badge: '5G Macro',
    subtitle: '3 Elements · IT Corridor',
    elementCount: 3,
    alerts: 0,
    elements: [
      {
        id: 'csr-chn-5011',
        name: 'CSR-CHN-5011-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.44.111.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 8,
        interfaces: createEquipmentInterfaces('CSR-CHN-5011', 8, false)
      }
    ]
  },
  {
    id: 'site-ahm-9025',
    code: 'GJ-AHM-9025',
    name: 'Site GJ-AHM-9025 (SG Highway)',
    tier: 'sites',
    circleId: 'circle-gj',
    circleCode: 'GJ',
    circleName: 'Gujarat',
    badge: 'Macro',
    subtitle: '2 Elements · Macro Tower',
    elementCount: 2,
    alerts: 0,
    elements: [
      {
        id: 'csr-ahm-9025',
        name: 'CSR-AHM-9025-NCS540',
        role: 'Core Router',
        model: 'Cisco NCS 540',
        vendor: 'CISCO',
        ip: '10.79.125.1',
        status: 'up',
        alerts: 0,
        interfaceCount: 6,
        interfaces: createEquipmentInterfaces('CSR-AHM-9025', 6, false)
      }
    ]
  }
];

/* ── Universal Multi-Tier Location Query Helper ──────────────────────── */
export function getTopologyLocations(tier: HierarchyTier, circleFilter = 'all'): TopologyLocation[] {
  let list: TopologyLocation[] = [];

  if (tier === 'datacenters') {
    list = DATACENTER_LOCATIONS;
  } else if (tier === 'pops') {
    // Map from ESTATE_HIERARCHY circles pops
    list = ESTATE_HIERARCHY.circles.flatMap(c =>
      c.pops.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        tier: 'pops' as HierarchyTier,
        circleId: c.id,
        circleCode: c.code,
        circleName: c.name,
        badge: p.badge,
        subtitle: `${p.siteCount} Sites · ${p.elementCount} Elements`,
        siteCount: p.siteCount,
        elementCount: p.elementCount,
        alerts: p.alerts,
        elements: p.elements
      }))
    );
  } else if (tier === 'sites') {
    list = SITE_LOCATIONS;
  }

  if (circleFilter && circleFilter !== 'all') {
    const q = circleFilter.toLowerCase();
    list = list.filter(l =>
      l.circleCode.toLowerCase() === q ||
      l.circleId.toLowerCase() === q
    );
  }

  return list;
}

