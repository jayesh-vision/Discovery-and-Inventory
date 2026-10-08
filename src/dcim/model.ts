/* ── DCIM canonical physical-infrastructure model ─────────────────────────
   One record shape per entity, shared by the import template, the parser,
   validation, the store and every screen — no screen keeps its own copy of
   a rack or a device. Every record carries a stable `id` chosen by the
   client (the import's natural key) and references its parent by id:

     Client → DataCenter → Building → Floor → Room → (Zone) → Row → Rack → U → Device

   Zone and Row are optional levels: a rack may sit in a room with no row,
   a device may stand on the floor of a room with no rack (a UPS cabinet).
   Physical coordinates are optional too; when they are missing the layout
   engine places things itself and says so (see layout.ts).

   Units: lengths of buildings, floors, rooms and positions are metres;
   rack and equipment dimensions are millimetres; power is kW (equipment
   nameplate in W); temperature °C; humidity %RH. Room/rack x,y are
   relative to the parent's origin (floor for rooms, room for racks and
   rows), rotation in degrees clockwise, 0 = rack front faces +y. */

export type EntityKey =
  | 'clients' | 'dataCenters' | 'buildings' | 'floors' | 'rooms' | 'zones' | 'rows' | 'racks'
  | 'devices' | 'ports' | 'connections' | 'powerEquipment' | 'powerConnections'
  | 'coolingEquipment' | 'sensors' | 'monitoringMappings';

export const ENTITY_KEYS: EntityKey[] = [
  'clients', 'dataCenters', 'buildings', 'floors', 'rooms', 'zones', 'rows', 'racks',
  'devices', 'ports', 'connections', 'powerEquipment', 'powerConnections',
  'coolingEquipment', 'sensors', 'monitoringMappings'
];

export type OperStatus = 'PLANNED' | 'ACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
export const OPER_STATUS: OperStatus[] = ['PLANNED', 'ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'];

export interface Client { id: string; name: string; industry?: string; contactEmail?: string }

export interface DataCenter {
  id: string; clientId: string; name: string;
  /** estate location code in Inventory › Location (e.g. KA-DC-008), when the site is one of ours */
  locationId?: string;
  address?: string; city?: string; country?: string; lat?: number; lon?: number;
  tier?: 'I' | 'II' | 'III' | 'IV'; status: OperStatus;
  designKw?: number; availableKw?: number;
}

export interface Building {
  id: string; dcId: string; name: string; status: OperStatus;
  lengthM?: number; widthM?: number; heightM?: number;
  /** position of the building on the site plot, metres */
  x?: number; y?: number;
  designKw?: number;
}

export interface Floor {
  id: string; buildingId: string; name: string; level: number;
  elevationM?: number; lengthM?: number; widthM?: number; ceilingM?: number; raisedFloorMm?: number; maxLoadKgM2?: number;
}

export type RoomType = 'DATA_HALL' | 'NETWORK' | 'MMR' | 'ELECTRICAL' | 'UPS' | 'BATTERY' | 'MECHANICAL' | 'STAGING' | 'NOC' | 'OTHER';
export const ROOM_TYPES: RoomType[] = ['DATA_HALL', 'NETWORK', 'MMR', 'ELECTRICAL', 'UPS', 'BATTERY', 'MECHANICAL', 'STAGING', 'NOC', 'OTHER'];
export const WHITE_SPACE: RoomType[] = ['DATA_HALL', 'NETWORK', 'MMR'];

export interface Room {
  id: string; floorId: string; name: string; type: RoomType;
  x?: number; y?: number; lengthM?: number; widthM?: number;
  designKw?: number; coolingType?: 'AIR' | 'LIQUID' | 'HYBRID';
}

export type ZoneKind = 'POWER' | 'COOLING' | 'CONTAINMENT' | 'SECURITY';
export interface Zone { id: string; roomId: string; name: string; kind: ZoneKind }

export type AisleSide = 'COLD' | 'HOT';
export interface Row {
  id: string; roomId: string; name: string;
  /** which aisle the rack fronts open onto */
  frontAisle: AisleSide;
  x?: number; y?: number; rotation?: number;
  containment?: 'NONE' | 'COLD_AISLE' | 'HOT_AISLE' | 'CHIMNEY';
  zoneId?: string;
}

export interface Rack {
  id: string; roomId: string; rowId?: string; name: string;
  /** 1-based slot in its row, left to right looking at the fronts */
  position?: number;
  x?: number; y?: number; rotation?: number;
  widthMm: number; depthMm: number; heightU: number;
  maxKw?: number; maxKg?: number; status: OperStatus;
}

export type DeviceType = 'SERVER' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'STORAGE' | 'GPU_SERVER' | 'PATCH_PANEL' | 'ODF' | 'KVM' | 'OTHER';
export const DEVICE_TYPES: DeviceType[] = ['SERVER', 'SWITCH', 'ROUTER', 'FIREWALL', 'STORAGE', 'GPU_SERVER', 'PATCH_PANEL', 'ODF', 'KVM', 'OTHER'];
export const PASSIVE_DEVICE: DeviceType[] = ['PATCH_PANEL', 'ODF'];
export type Face = 'FRONT' | 'REAR';

export interface Device {
  id: string; name: string; type: DeviceType;
  rackId?: string; roomId?: string;
  /** lowest rack unit occupied (1 = bottom) */
  uStart?: number; uHeight: number; face: Face;
  /** a full-depth chassis blocks the same U on the other face too */
  fullDepth: boolean;
  vendor?: string; model?: string; serial?: string; mgmtIp?: string; role?: string;
  widthMm?: number; depthMm?: number; powerW?: number; psuCount?: number; weightKg?: number;
  status: OperStatus;
}

export type PortKind = 'ETHERNET' | 'FIBER' | 'INFINIBAND' | 'CONSOLE' | 'MGMT';
export interface Port { id: string; deviceId: string; name: string; kind: PortKind; speedGbps?: number; media?: string }

/** PHYSICAL = a cable between two ports (possibly via patch panels, as separate segments);
    LOGICAL = an adjacency the client states (LLDP / routing / LAG), never inferred */
export type ConnectionKind = 'PHYSICAL' | 'LOGICAL';
export interface Connection {
  id: string; kind: ConnectionKind; aPortId: string; bPortId: string;
  cableId?: string; media?: string; lengthM?: number;
  role?: 'UPLINK' | 'DOWNLINK' | 'PEER' | 'MGMT' | 'PATCH';
  redundancyGroup?: string; status: OperStatus;
}

export type PowerType = 'UTILITY' | 'TRANSFORMER' | 'GENERATOR' | 'SWITCHGEAR' | 'ATS' | 'UPS' | 'RECTIFIER' | 'BATTERY' | 'PDU' | 'RPP' | 'RACK_PDU' | 'CIRCUIT';
export const POWER_TYPES: PowerType[] = ['UTILITY', 'TRANSFORMER', 'GENERATOR', 'SWITCHGEAR', 'ATS', 'UPS', 'RECTIFIER', 'BATTERY', 'PDU', 'RPP', 'RACK_PDU', 'CIRCUIT'];
export type FeedSide = 'A' | 'B' | 'N';
export interface PowerEquipment {
  id: string; dcId: string; name: string; type: PowerType;
  roomId?: string; rackId?: string;
  side: FeedSide; ratingKw?: number; ratingKva?: number; voltage?: number;
  /** for BATTERY / UPS: minutes of autonomy at rated load */
  autonomyMin?: number; redundancyGroup?: string; status: OperStatus;
}
/** from = upstream power equipment; to = power equipment, rack or device */
export interface PowerConnection {
  id: string; fromId: string; toId: string; side: FeedSide;
  circuit?: string; breakerA?: number; status: OperStatus;
}

export type CoolingType = 'CRAH' | 'CRAC' | 'IN_ROW' | 'RDHX' | 'CDU' | 'CHILLER' | 'DRY_COOLER';
export interface CoolingEquipment {
  id: string; dcId: string; roomId?: string; name: string; type: CoolingType;
  capacityKw: number; zoneId?: string;
  /** rows this unit cools; empty = the whole room */
  servesRowIds: string[];
  x?: number; y?: number; redundancyGroup?: string; status: OperStatus;
}

export type SensorKind = 'TEMPERATURE' | 'HUMIDITY' | 'TEMP_HUMIDITY' | 'LEAK' | 'SMOKE' | 'DOOR' | 'POWER_METER' | 'AIRFLOW';
export type SensorPosition = 'ROOM' | 'INLET' | 'OUTLET' | 'UNDERFLOOR' | 'CEILING';
export interface Sensor {
  id: string; name: string; kind: SensorKind; roomId: string;
  rowId?: string; rackId?: string; deviceId?: string; position: SensorPosition;
  lowThreshold?: number; highThreshold?: number; status: OperStatus;
}

export type MonitoringSystem = 'SNMP' | 'BMS' | 'EPMS' | 'REDFISH' | 'DCGM' | 'IPMI' | 'OTHER';
export interface MonitoringMapping {
  id: string; entityId: string; system: MonitoringSystem; externalId: string; metric?: string; pollSeconds?: number;
}

export interface Entities {
  clients: Client[]; dataCenters: DataCenter[]; buildings: Building[]; floors: Floor[]; rooms: Room[];
  zones: Zone[]; rows: Row[]; racks: Rack[]; devices: Device[]; ports: Port[]; connections: Connection[];
  powerEquipment: PowerEquipment[]; powerConnections: PowerConnection[]; coolingEquipment: CoolingEquipment[];
  sensors: Sensor[]; monitoringMappings: MonitoringMapping[];
}
export type AnyRecord = Entities[EntityKey][number];

export const emptyEntities = (): Entities => ({
  clients: [], dataCenters: [], buildings: [], floors: [], rooms: [], zones: [], rows: [], racks: [],
  devices: [], ports: [], connections: [], powerEquipment: [], powerConnections: [], coolingEquipment: [],
  sensors: [], monitoringMappings: []
});

/** A confirmed association between an imported device and an existing
    Discovery & Inventory record. Created only by an explicit user action
    on a candidate that matched on serial number or management IP. */
export interface DiscoveryLink {
  deviceId: string;
  target: 'inventory' | 'discovery';
  /** NeRow.name (inventory) or DomainDevice.id (discovery) */
  ref: string;
  matchedOn: 'serial' | 'mgmtIp';
  linkedAt: number;
}

/** Everything one client owns. Clients never share a dataset. */
export interface ClientData {
  clientId: string;
  entities: Entities;
  links: DiscoveryLink[];
  /** id of the import batch that last wrote each record (provenance) */
  lastBatch: Record<string, string>;
  updatedAt: number;
}

export interface ImportBatch {
  id: string; clientId: string; fileName: string; at: number;
  created: number; updated: number; unchanged: number; keptNotInFile: number;
  warnings: number;
}
