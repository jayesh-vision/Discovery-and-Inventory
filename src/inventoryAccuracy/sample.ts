/* ── Demo data ──────────────────────────────────────────────────────────
   A downloadable blank template and a ready-to-try sample file per entity
   type, mirroring src/dcim/template.ts + src/dcim/sample.ts's "Download
   template" / "Try sample file" pair. The Sites and Fiber Cabling samples
   are anchored on real ids from src/data/locations.ts / facility.ts
   (BGLK-277's hand-written cabling ledger) so "try sample" demonstrates
   real MATCHED/MODIFIED reconciliation, not just NEW rows. The intentional
   defects mirror PRD §13: duplicate ids, missing vendor, an invalid
   management IP, a parent relationship pointing at a site that doesn't
   exist, missing geographic coordinates, and an out-of-range cable core
   number. */
import type { AccuracyEntityType } from './model';
import { SCHEMAS, schemaOf } from './schema';

export function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n') + '\n';
}

export function templateCsvFor(entityType: AccuracyEntityType): string {
  const schema = schemaOf(entityType);
  const headers = schema.fields.map(f => f.col);
  return toCsv(headers, []);
}

const NE_HEADERS = SCHEMAS.find(s => s.entityType === 'networkElement')!.fields.map(f => f.col);
const SITE_HEADERS = SCHEMAS.find(s => s.entityType === 'site')!.fields.map(f => f.col);
const FC_HEADERS = SCHEMAS.find(s => s.entityType === 'fiberCable')!.fields.map(f => f.col);

/* ResourceId, DeviceName, Class, Vendor, Model, ManagementIp, SerialNumber, OperatingSystem, ParentSiteId, StockState */
const NE_DEMO: string[][] = [
  ['NE-SAMPLE-0001', 'BGLK-CORE-RTR-01', 'router', 'Juniper', 'MX960', '10.12.4.1', 'SN-0001', 'Junos 21.4', 'BGLK-277', 'deployed'],
  ['NE-SAMPLE-0002', 'BGLK-AGG-SW-01', 'switch', 'Cisco', 'C9300-48UXM', '10.12.4.2', 'SN-0002', 'IOS-XE 17.6', 'BGLK-277', 'deployed'],
  ['NE-SAMPLE-0003', 'DEL-ACCESS-SW-01', 'switch', 'Cisco', 'EX4300-48P', '10.12.4.3', 'SN-0003', 'IOS-XE 17.3', 'DEL-279', 'instore'],
  ['NE-SAMPLE-0004', 'INDR-EDGE-RTR-01', 'router', '', 'ACX2200', '10.12.4.4', 'SN-0004', 'Junos 20.2', 'INDR-275', 'deployed'],   /* missing vendor */
  ['NE-SAMPLE-0004', 'INDR-EDGE-RTR-01-DUP', 'router', 'Juniper', 'ACX2200', '10.12.4.5', 'SN-0005', 'Junos 20.2', 'INDR-275', 'deployed'], /* duplicate ResourceId */
  ['NE-SAMPLE-0006', 'VJA-DWDM-01', 'dwdm', 'Ciena', 'FSP 3000', '999.12.4.6', 'SN-0006', 'SAOS 10.2', 'VJA-118', 'deployed'],     /* invalid management IP */
  ['NE-SAMPLE-0007', 'GHOST-SITE-RTR-01', 'router', 'Nokia', 'ASR920', '10.12.4.7', 'SN-0007', 'SR OS 21.1', 'XX-NOSITE-999', 'planned'], /* parent site does not exist */
  ['NE-SAMPLE-0008', 'DND-ACCESS-SW-01', 'switch', 'Juniper', 'EX2200-24T', '10.12.4.8', 'SN-0002', 'Junos 18.4', 'DND-ART-98', 'deployed'] /* duplicate serial with row 2 */
];

/* SiteId, SiteName, SiteType, Category, Status, City, State, Address, Latitude, Longitude */
const SITE_DEMO: string[][] = [
  ['BGLK-277', 'KA-BGLK-277', 'POP', 'Central', 'On-air', 'Bagalkot', 'Karnataka', '277, Bagalkot', '16.181', '75.696'],
  ['DEL-279', 'DEL-279-Renamed', 'Cell Site', 'Edge', 'On-air', 'Delhi', 'Delhi', '279, Delhi', '28.644', '77.216'],  /* name changed -> MODIFIED */
  ['VJA-118', 'Vijayawada', 'Macro-O', 'Edge', 'On-air', 'Vijayawada', 'Andhra Pradesh', 'Vijayawada', '16.506', '80.648'], /* unchanged -> MATCHED */
  ['SITE-SAMPLE-NEW-01', 'New Regional POP', 'POP', 'Regional', 'Planned', 'Hubballi', 'Karnataka', 'Hubballi', '15.364', '75.124'], /* NEW */
  ['SITE-SAMPLE-NEW-01', 'New Regional POP (dup)', 'POP', 'Regional', 'Planned', 'Hubballi', 'Karnataka', 'Hubballi', '15.365', '75.125'], /* duplicate SiteId */
  ['SITE-SAMPLE-NEW-02', 'No-Coordinates POP', 'POP', 'Edge', 'Planned', 'Raichur', 'Karnataka', 'Raichur', '', ''], /* missing coordinates */
  ['SITE-SAMPLE-NEW-03', 'Bad-Latitude POP', 'POP', 'Edge', 'Planned', 'Hassan', 'Karnataka', 'Hassan', '154.2', '76.1'] /* latitude out of range */
];

/* CableId, SiteId, CoreNumber, Kind, State, Strand */
const FC_DEMO: string[][] = [
  ['C-01', 'BGLK-277', '3', 'Fibre', 'Active', 'Blue'],   /* matches the real record -> MATCHED */
  ['C-03', 'BGLK-277', '1', 'Fibre', 'Planned', 'Green'], /* state changed from Active -> MODIFIED */
  ['C-SAMPLE-NEW-01', 'BGLK-277', '22', 'Fibre', 'Planned', 'Teal'], /* NEW */
  ['C-SAMPLE-NEW-02', 'BGLK-277', '30', 'Fibre', 'Active', 'Pink'], /* core number out of the 24-core tray */
  ['C-SAMPLE-NEW-02', 'BGLK-277', '19', 'Fibre', 'Active', 'Pink'], /* duplicate CableId */
  ['C-SAMPLE-NEW-03', 'BGLK-277', '17', '', 'Active', 'Grey']       /* missing Kind */
];

export function demoCsvFor(entityType: AccuracyEntityType): string {
  if (entityType === 'networkElement') return toCsv(NE_HEADERS, NE_DEMO);
  if (entityType === 'site') return toCsv(SITE_HEADERS, SITE_DEMO);
  return toCsv(FC_HEADERS, FC_DEMO);
}

const DEMO_FILE_NAME: Record<AccuracyEntityType, string> = {
  networkElement: 'sample-network-elements.csv', site: 'sample-sites.csv', fiberCable: 'sample-fiber-cabling.csv'
};

export function demoFileFor(entityType: AccuracyEntityType): File {
  const csv = demoCsvFor(entityType);
  return new File([csv], DEMO_FILE_NAME[entityType], { type: 'text/csv' });
}

export function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}
