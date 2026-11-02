/* ── Upload schema: one field list per entity type ────────────────────────
   The single source for the downloadable template, column auto-mapping,
   type coercion and which real Telecom-estate inventory field a column
   corresponds to. Modeled on src/dcim/schema.ts's SheetDef/FieldDef, but
   scoped to the three Telecom-estate entities that have a real, first-class
   data source today: Network Elements (src/data/physical.ts NeRow), Sites
   (src/data/locations.ts Location), and Fiber Cabling (src/data/facility.ts
   Cable, inside each site's cabling ledger). No Interfaces/Links/ODF/
   Splice-Closure sheet is defined — those have no typed array to validate
   or reconcile against in this codebase, and inventing one would duplicate
   an entity that doesn't exist (see src/data/domainDevices.ts's warning
   against exactly that). */
import type { AccuracyEntityType } from './model';

/* Telecom estate only — never the Datacenter roles (router/switch/server/
   firewall/storage/gpu live in a separate, isolated register). */
export const TELECOM_NE_CLASSES = ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'] as const;
export const TELECOM_STOCK_STATES = ['planned', 'instore', 'deployed', 'faulty', 'decomm'] as const;
export const CABLE_KINDS = ['Fibre', 'Copper'] as const;
export const CABLE_STATES = ['Active', 'Planned', 'Faulty'] as const;

export type FieldType = 'id' | 'string' | 'number' | 'int' | 'enum' | 'ip';

export interface FieldDef {
  /** column header in the template */
  col: string;
  /** key the uploaded row is stored and matched under */
  key: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
  /** other header spellings recognised by auto-mapping */
  aliases?: string[];
  desc: string;
  /** the field on the real record this corresponds to, for documentation only */
  mapsTo: string;
}

export interface EntitySchema {
  entityType: AccuracyEntityType;
  label: string;
  sheet: string;
  desc: string;
  /** field whose value is the record's identity for matching */
  idField: string;
  fields: FieldDef[];
}

export const SCHEMAS: EntitySchema[] = [
  {
    entityType: 'networkElement', label: 'Network Elements', sheet: 'NetworkElements',
    desc: 'Routers, switches, servers, DWDM, eNodeB and gNodeB — the Physical Resources register.',
    idField: 'resourceId',
    fields: [
      { col: 'ResourceId', key: 'resourceId', type: 'id', required: true, aliases: ['ResourceID', 'ElementId'], desc: 'Stable unique identifier for the element', mapsTo: 'NeRow.name' },
      { col: 'DeviceName', key: 'deviceName', type: 'string', required: true, aliases: ['Name'], desc: 'Display name of the device', mapsTo: 'NeRow.name' },
      { col: 'Class', key: 'neClass', type: 'enum', options: TELECOM_NE_CLASSES, required: true, aliases: ['Type', 'DeviceClass'], desc: 'Network element class', mapsTo: 'NE_CLASSES' },
      { col: 'Vendor', key: 'vendor', type: 'string', required: true, aliases: ['OEM', 'Manufacturer'], desc: 'Equipment vendor', mapsTo: 'NeRow.oem' },
      { col: 'Model', key: 'model', type: 'string', required: true, desc: 'Hardware/software model', mapsTo: 'NeRow.model' },
      { col: 'ManagementIp', key: 'managementIp', type: 'ip', aliases: ['MgmtIp', 'IP'], desc: 'Out-of-band or in-band management IPv4/IPv6 address', mapsTo: 'NeRow.ip' },
      { col: 'SerialNumber', key: 'serialNumber', type: 'string', aliases: ['SN', 'Serial'], desc: 'Vendor serial number', mapsTo: 'NeRow.sn' },
      { col: 'OperatingSystem', key: 'operatingSystem', type: 'string', aliases: ['OS'], desc: 'Software/OS version', mapsTo: 'NeRow.os' },
      { col: 'ParentSiteId', key: 'parentSiteId', type: 'string', required: true, aliases: ['LocationId', 'SiteId'], desc: 'Site this element is installed at — must exist in Sites', mapsTo: 'NeRow.loc' },
      { col: 'StockState', key: 'stockState', type: 'enum', options: TELECOM_STOCK_STATES, aliases: ['Status'], desc: 'Lifecycle state', mapsTo: 'NeRow.stock' }
    ]
  },
  {
    entityType: 'site', label: 'Sites & Locations', sheet: 'Sites',
    desc: 'The site/location roster — POPs, cell sites, central offices.',
    idField: 'siteId',
    fields: [
      { col: 'SiteId', key: 'siteId', type: 'id', required: true, aliases: ['LocationId'], desc: 'Stable unique site code', mapsTo: 'Location.id' },
      { col: 'SiteName', key: 'siteName', type: 'string', required: true, aliases: ['Name'], desc: 'Site display name', mapsTo: 'Location.name' },
      { col: 'SiteType', key: 'siteType', type: 'string', aliases: ['Type'], desc: 'POP / Cell Site / Macro-O / Micro-CO …', mapsTo: 'Location.type' },
      { col: 'Category', key: 'category', type: 'string', desc: 'Central / Regional / Edge', mapsTo: 'Location.cat' },
      { col: 'Status', key: 'status', type: 'string', desc: 'On-air / In progress / Planned / Failed', mapsTo: 'Location.st' },
      { col: 'City', key: 'city', type: 'string', required: true, desc: 'City', mapsTo: 'Location.city' },
      { col: 'State', key: 'state', type: 'string', required: true, desc: 'State / region', mapsTo: 'Location.state' },
      { col: 'Address', key: 'address', type: 'string', desc: 'Street address', mapsTo: 'Location.addr' },
      { col: 'Latitude', key: 'latitude', type: 'number', min: -90, max: 90, desc: 'WGS84 latitude', mapsTo: 'Location.lat' },
      { col: 'Longitude', key: 'longitude', type: 'number', min: -180, max: 180, desc: 'WGS84 longitude', mapsTo: 'Location.lon' }
    ]
  },
  {
    entityType: 'fiberCable', label: 'Fiber Cabling', sheet: 'FiberCabling',
    desc: "A site's incoming cable-tray ledger (facility.ts Cable records).",
    idField: 'cableId',
    fields: [
      { col: 'CableId', key: 'cableId', type: 'id', required: true, desc: 'Stable unique cable identifier', mapsTo: 'Cable.id' },
      { col: 'SiteId', key: 'siteId', type: 'string', required: true, aliases: ['LocationId'], desc: 'Site whose cabling ledger this cable belongs to — must exist in Sites', mapsTo: 'Facility.siteId' },
      { col: 'CoreNumber', key: 'coreNumber', type: 'int', required: true, min: 1, max: 24, desc: 'Core of the incoming tray this cable lands on (1–24)', mapsTo: 'Cable.core' },
      { col: 'Kind', key: 'cableKind', type: 'enum', options: CABLE_KINDS, required: true, desc: 'Fibre or Copper', mapsTo: 'Cable.kind' },
      { col: 'State', key: 'cableState', type: 'enum', options: CABLE_STATES, required: true, desc: 'Active / Planned / Faulty', mapsTo: 'Cable.state' },
      { col: 'Strand', key: 'strand', type: 'string', desc: 'Strand colour label', mapsTo: 'Cable.strand' }
    ]
  }
];

export const schemaOf = (t: AccuracyEntityType): EntitySchema => SCHEMAS.find(s => s.entityType === t)!;

export const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function matchField(schema: EntitySchema, header: string): FieldDef | undefined {
  const h = norm(header);
  return schema.fields.find(f => norm(f.col) === h || norm(f.key) === h || (f.aliases ?? []).some(a => norm(a) === h));
}

/** best-effort header → field key mapping, used to pre-fill the wizard's mapping step */
export function autoMapping(schema: EntitySchema, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const f = matchField(schema, h);
    if (f) out[h] = f.key;
  }
  return out;
}

/** which entity (by header overlap) a raw sheet/CSV most likely is */
export function detectEntityType(headers: string[]): AccuracyEntityType | null {
  let best: AccuracyEntityType | null = null, bestScore = 0;
  for (const s of SCHEMAS) {
    const hits = headers.filter(h => matchField(s, h)).length;
    const idHit = headers.some(h => matchField(s, h)?.key === s.idField);
    const score = idHit ? hits / s.fields.length + hits * 0.01 : 0;
    if (score > bestScore) { bestScore = score; best = s.entityType; }
  }
  return bestScore >= 0.25 ? best : null;
}
