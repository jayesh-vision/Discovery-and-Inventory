/* ── Import schema: one definition per workbook sheet ─────────────────────
   The single source for the downloadable template (columns, units, rules,
   descriptions), the column auto-mapping, type coercion and the generic
   validation checks. Entity-specific checks (U overlap, port reuse, …)
   live in validate.ts. */
import {
  DEVICE_TYPES, OPER_STATUS, POWER_TYPES, ROOM_TYPES, type EntityKey
} from './model';

export type FieldType = 'id' | 'string' | 'number' | 'int' | 'enum' | 'bool' | 'ref' | 'list';

export interface FieldDef {
  /** column header in the template */
  col: string;
  /** property on the canonical record */
  key: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  /** entity a ref / list column points at */
  ref?: EntityKey | EntityKey[];
  unit?: string;
  min?: number;
  max?: number;
  /** value used when the cell is blank */
  dflt?: string | number | boolean;
  /** other header spellings recognised by auto-mapping */
  aliases?: string[];
  desc: string;
}

export interface SheetDef {
  sheet: string;
  entity: EntityKey;
  desc: string;
  fields: FieldDef[];
}

const STATUS: FieldDef = { col: 'Status', key: 'status', type: 'enum', options: OPER_STATUS, dflt: 'ACTIVE', desc: 'Operational status' };

export const SHEETS: SheetDef[] = [
  { sheet: 'Clients', entity: 'clients', desc: 'The client (tenant) that owns this inventory. Optional: the importer uses the client chosen in the wizard.',
    fields: [
      { col: 'ClientId', key: 'id', type: 'id', required: true, desc: 'Stable client identifier' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Client display name' },
      { col: 'Industry', key: 'industry', type: 'string', desc: 'Industry or segment' },
      { col: 'ContactEmail', key: 'contactEmail', type: 'string', desc: 'Operations contact (no credentials)' }
    ] },
  { sheet: 'DataCenters', entity: 'dataCenters', desc: 'Data center sites.',
    fields: [
      { col: 'DataCenterId', key: 'id', type: 'id', required: true, aliases: ['DCId', 'SiteId'], desc: 'Stable site identifier' },
      { col: 'ClientId', key: 'clientId', type: 'string', desc: 'Must equal the client chosen for the import (blank = that client)' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Site name' },
      { col: 'LocationId', key: 'locationId', type: 'string', aliases: ['EstateLocationId'], desc: 'Inventory › Location code this site corresponds to (e.g. KA-DC-008)' },
      { col: 'Address', key: 'address', type: 'string', desc: 'Street address' },
      { col: 'City', key: 'city', type: 'string', desc: 'City' },
      { col: 'Country', key: 'country', type: 'string', desc: 'Country' },
      { col: 'Latitude', key: 'lat', type: 'number', min: -90, max: 90, unit: '°', desc: 'WGS84 latitude' },
      { col: 'Longitude', key: 'lon', type: 'number', min: -180, max: 180, unit: '°', desc: 'WGS84 longitude' },
      { col: 'Tier', key: 'tier', type: 'enum', options: ['I', 'II', 'III', 'IV'], desc: 'Uptime tier as designed or certified' },
      STATUS,
      { col: 'DesignKw', key: 'designKw', type: 'number', min: 0, unit: 'kW', desc: 'Designed IT capacity' },
      { col: 'AvailableKw', key: 'availableKw', type: 'number', min: 0, unit: 'kW', desc: 'IT capacity still available for sale or use' }
    ] },
  { sheet: 'Buildings', entity: 'buildings', desc: 'Buildings on a site.',
    fields: [
      { col: 'BuildingId', key: 'id', type: 'id', required: true, desc: 'Stable building identifier' },
      { col: 'DataCenterId', key: 'dcId', type: 'ref', ref: 'dataCenters', required: true, desc: 'Site the building stands on' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Building name' },
      STATUS,
      { col: 'LengthM', key: 'lengthM', type: 'number', min: 1, max: 1000, unit: 'm', desc: 'Footprint length (x)' },
      { col: 'WidthM', key: 'widthM', type: 'number', min: 1, max: 1000, unit: 'm', desc: 'Footprint width (y)' },
      { col: 'HeightM', key: 'heightM', type: 'number', min: 1, max: 300, unit: 'm', desc: 'Building height' },
      { col: 'X', key: 'x', type: 'number', unit: 'm', desc: 'Position on the site plot' },
      { col: 'Y', key: 'y', type: 'number', unit: 'm', desc: 'Position on the site plot' },
      { col: 'DesignKw', key: 'designKw', type: 'number', min: 0, unit: 'kW', desc: 'Designed IT capacity of the building' }
    ] },
  { sheet: 'Floors', entity: 'floors', desc: 'Floors (levels) of a building.',
    fields: [
      { col: 'FloorId', key: 'id', type: 'id', required: true, desc: 'Stable floor identifier' },
      { col: 'BuildingId', key: 'buildingId', type: 'ref', ref: 'buildings', required: true, desc: 'Building of the floor' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Floor name (Ground, Level 1 …)' },
      { col: 'Level', key: 'level', type: 'int', required: true, min: -10, max: 200, desc: 'Level number; negative for basements' },
      { col: 'ElevationM', key: 'elevationM', type: 'number', unit: 'm', desc: 'Finished floor level above ground' },
      { col: 'LengthM', key: 'lengthM', type: 'number', min: 1, max: 1000, unit: 'm', desc: 'Floor plate length (x)' },
      { col: 'WidthM', key: 'widthM', type: 'number', min: 1, max: 1000, unit: 'm', desc: 'Floor plate width (y)' },
      { col: 'CeilingM', key: 'ceilingM', type: 'number', min: 2, max: 20, unit: 'm', desc: 'Clear height' },
      { col: 'RaisedFloorMm', key: 'raisedFloorMm', type: 'number', min: 0, max: 2000, unit: 'mm', desc: 'Raised floor depth (0 = slab)' },
      { col: 'MaxLoadKgM2', key: 'maxLoadKgM2', type: 'number', min: 0, unit: 'kg/m²', desc: 'Distributed floor load rating' }
    ] },
  { sheet: 'Rooms', entity: 'rooms', desc: 'Rooms and data halls on a floor.',
    fields: [
      { col: 'RoomId', key: 'id', type: 'id', required: true, desc: 'Stable room identifier' },
      { col: 'FloorId', key: 'floorId', type: 'ref', ref: 'floors', required: true, desc: 'Floor of the room' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Room name' },
      { col: 'Type', key: 'type', type: 'enum', options: ROOM_TYPES, required: true, desc: 'Function of the room' },
      { col: 'X', key: 'x', type: 'number', unit: 'm', desc: 'Room corner from the floor origin' },
      { col: 'Y', key: 'y', type: 'number', unit: 'm', desc: 'Room corner from the floor origin' },
      { col: 'LengthM', key: 'lengthM', type: 'number', min: 1, max: 500, unit: 'm', desc: 'Room length (x)' },
      { col: 'WidthM', key: 'widthM', type: 'number', min: 1, max: 500, unit: 'm', desc: 'Room width (y)' },
      { col: 'DesignKw', key: 'designKw', type: 'number', min: 0, unit: 'kW', desc: 'Designed IT load of the room' },
      { col: 'CoolingType', key: 'coolingType', type: 'enum', options: ['AIR', 'LIQUID', 'HYBRID'], desc: 'How IT heat is removed' }
    ] },
  { sheet: 'Zones', entity: 'zones', desc: 'Power, cooling or containment zones inside a room.',
    fields: [
      { col: 'ZoneId', key: 'id', type: 'id', required: true, desc: 'Stable zone identifier' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', required: true, desc: 'Room of the zone' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Zone name' },
      { col: 'Kind', key: 'kind', type: 'enum', options: ['POWER', 'COOLING', 'CONTAINMENT', 'SECURITY'], required: true, desc: 'What the zone groups' }
    ] },
  { sheet: 'Rows', entity: 'rows', desc: 'Rack rows and the aisle their rack fronts open onto.',
    fields: [
      { col: 'RowId', key: 'id', type: 'id', required: true, desc: 'Stable row identifier' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', required: true, desc: 'Room of the row' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Row label (A, B, 01 …)' },
      { col: 'FrontAisle', key: 'frontAisle', type: 'enum', options: ['COLD', 'HOT'], dflt: 'COLD', desc: 'Aisle the rack fronts open onto' },
      { col: 'X', key: 'x', type: 'number', unit: 'm', desc: 'Start of the row from the room origin' },
      { col: 'Y', key: 'y', type: 'number', unit: 'm', desc: 'Start of the row from the room origin' },
      { col: 'Rotation', key: 'rotation', type: 'number', min: 0, max: 359, unit: '°', desc: '0 = fronts face +y' },
      { col: 'Containment', key: 'containment', type: 'enum', options: ['NONE', 'COLD_AISLE', 'HOT_AISLE', 'CHIMNEY'], desc: 'Aisle containment' },
      { col: 'ZoneId', key: 'zoneId', type: 'ref', ref: 'zones', desc: 'Zone the row belongs to' }
    ] },
  { sheet: 'Racks', entity: 'racks', desc: 'Racks and cabinets with their dimensions.',
    fields: [
      { col: 'RackId', key: 'id', type: 'id', required: true, desc: 'Stable rack identifier' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', required: true, desc: 'Room of the rack' },
      { col: 'RowId', key: 'rowId', type: 'ref', ref: 'rows', desc: 'Row of the rack' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Rack label' },
      { col: 'Position', key: 'position', type: 'int', min: 1, max: 200, desc: 'Slot in the row, 1 = first' },
      { col: 'X', key: 'x', type: 'number', unit: 'm', desc: 'Rack centre from the room origin' },
      { col: 'Y', key: 'y', type: 'number', unit: 'm', desc: 'Rack centre from the room origin' },
      { col: 'Rotation', key: 'rotation', type: 'number', min: 0, max: 359, unit: '°', desc: '0 = front faces +y' },
      { col: 'WidthMm', key: 'widthMm', type: 'number', min: 450, max: 1200, dflt: 600, unit: 'mm', desc: 'Cabinet width' },
      { col: 'DepthMm', key: 'depthMm', type: 'number', min: 500, max: 1600, dflt: 1200, unit: 'mm', desc: 'Cabinet depth' },
      { col: 'HeightU', key: 'heightU', type: 'int', min: 1, max: 60, dflt: 42, unit: 'U', desc: 'Usable rack units' },
      { col: 'MaxKw', key: 'maxKw', type: 'number', min: 0, max: 300, unit: 'kW', desc: 'Power budget' },
      { col: 'MaxKg', key: 'maxKg', type: 'number', min: 0, max: 3000, unit: 'kg', desc: 'Static load rating' },
      STATUS
    ] },
  { sheet: 'Devices', entity: 'devices', desc: 'Equipment. Mounted devices need RackId and UStart; UHeight is the number of rack units occupied.',
    fields: [
      { col: 'DeviceId', key: 'id', type: 'id', required: true, desc: 'Stable device identifier (asset tag)' },
      { col: 'Name', key: 'name', type: 'string', required: true, aliases: ['Hostname'], desc: 'Hostname or label' },
      { col: 'Type', key: 'type', type: 'enum', options: DEVICE_TYPES, required: true, desc: 'Equipment class' },
      { col: 'RackId', key: 'rackId', type: 'ref', ref: 'racks', desc: 'Rack the device is mounted in' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', desc: 'Room of a free-standing device (no rack)' },
      { col: 'UStart', key: 'uStart', type: 'int', min: 1, max: 60, unit: 'U', desc: 'Lowest rack unit occupied (1 = bottom)' },
      { col: 'UHeight', key: 'uHeight', type: 'int', min: 0, max: 60, dflt: 1, unit: 'U', desc: 'Rack units occupied (0 = zero-U)' },
      { col: 'Face', key: 'face', type: 'enum', options: ['FRONT', 'REAR'], dflt: 'FRONT', desc: 'Mounting face' },
      { col: 'FullDepth', key: 'fullDepth', type: 'bool', dflt: true, desc: 'Y = blocks the same U on the other face' },
      { col: 'Vendor', key: 'vendor', type: 'string', desc: 'Manufacturer' },
      { col: 'Model', key: 'model', type: 'string', desc: 'Model' },
      { col: 'Serial', key: 'serial', type: 'string', aliases: ['SerialNumber', 'SN'], desc: 'Serial number — used to link to discovered/inventory records' },
      { col: 'MgmtIp', key: 'mgmtIp', type: 'string', aliases: ['ManagementIp', 'IP'], desc: 'Management IP — used to link to discovered records' },
      { col: 'Role', key: 'role', type: 'string', desc: 'Role (spine, leaf, ToR, compute …)' },
      { col: 'WidthMm', key: 'widthMm', type: 'number', min: 0, max: 1200, unit: 'mm', desc: 'Chassis width' },
      { col: 'DepthMm', key: 'depthMm', type: 'number', min: 0, max: 1600, unit: 'mm', desc: 'Chassis depth' },
      { col: 'PowerW', key: 'powerW', type: 'number', min: 0, max: 50000, unit: 'W', desc: 'Nameplate (maximum) power' },
      { col: 'PsuCount', key: 'psuCount', type: 'int', min: 0, max: 16, desc: 'Power supplies' },
      { col: 'WeightKg', key: 'weightKg', type: 'number', min: 0, max: 2000, unit: 'kg', desc: 'Weight' },
      STATUS
    ] },
  { sheet: 'Ports', entity: 'ports', desc: 'Device interfaces and panel positions.',
    fields: [
      { col: 'PortId', key: 'id', type: 'id', required: true, desc: 'Stable port identifier' },
      { col: 'DeviceId', key: 'deviceId', type: 'ref', ref: 'devices', required: true, desc: 'Device of the port' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Interface name (Eth1/1, P01 …)' },
      { col: 'Kind', key: 'kind', type: 'enum', options: ['ETHERNET', 'FIBER', 'INFINIBAND', 'CONSOLE', 'MGMT'], dflt: 'ETHERNET', desc: 'Port kind' },
      { col: 'SpeedGbps', key: 'speedGbps', type: 'number', min: 0, max: 1600, unit: 'Gb/s', desc: 'Line rate' },
      { col: 'Media', key: 'media', type: 'string', desc: 'RJ45, LC, MPO, QSFP-DD …' }
    ] },
  { sheet: 'Connections', entity: 'connections', desc: 'Cables (PHYSICAL) and stated adjacencies (LOGICAL) between ports.',
    fields: [
      { col: 'ConnectionId', key: 'id', type: 'id', required: true, desc: 'Stable connection identifier' },
      { col: 'Kind', key: 'kind', type: 'enum', options: ['PHYSICAL', 'LOGICAL'], dflt: 'PHYSICAL', desc: 'Cable or logical adjacency' },
      { col: 'APortId', key: 'aPortId', type: 'ref', ref: 'ports', required: true, desc: 'A-end port' },
      { col: 'BPortId', key: 'bPortId', type: 'ref', ref: 'ports', required: true, desc: 'B-end port' },
      { col: 'CableId', key: 'cableId', type: 'string', desc: 'Cable label' },
      { col: 'Media', key: 'media', type: 'string', desc: 'Cat6A, OM4, OS2, DAC …' },
      { col: 'LengthM', key: 'lengthM', type: 'number', min: 0, max: 100000, unit: 'm', desc: 'Cable length' },
      { col: 'Role', key: 'role', type: 'enum', options: ['UPLINK', 'DOWNLINK', 'PEER', 'MGMT', 'PATCH'], desc: 'Role of the link' },
      { col: 'RedundancyGroup', key: 'redundancyGroup', type: 'string', desc: 'Connections sharing a group are redundant paths' },
      STATUS
    ] },
  { sheet: 'PowerEquipment', entity: 'powerEquipment', desc: 'Utility feeds, generators, switchgear, UPS, PDUs, rack PDUs and circuits.',
    fields: [
      { col: 'PowerId', key: 'id', type: 'id', required: true, desc: 'Stable identifier' },
      { col: 'DataCenterId', key: 'dcId', type: 'ref', ref: 'dataCenters', required: true, desc: 'Site' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Equipment name' },
      { col: 'Type', key: 'type', type: 'enum', options: POWER_TYPES, required: true, desc: 'Equipment class' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', desc: 'Room it stands in' },
      { col: 'RackId', key: 'rackId', type: 'ref', ref: 'racks', desc: 'Rack it is mounted in (rack PDUs)' },
      { col: 'Side', key: 'side', type: 'enum', options: ['A', 'B', 'N'], dflt: 'N', desc: 'Feed side; N = not sided' },
      { col: 'RatingKw', key: 'ratingKw', type: 'number', min: 0, unit: 'kW', desc: 'Rated real power' },
      { col: 'RatingKva', key: 'ratingKva', type: 'number', min: 0, unit: 'kVA', desc: 'Rated apparent power' },
      { col: 'Voltage', key: 'voltage', type: 'number', min: 0, unit: 'V', desc: 'Nominal voltage' },
      { col: 'AutonomyMin', key: 'autonomyMin', type: 'number', min: 0, unit: 'min', desc: 'Battery autonomy at rated load' },
      { col: 'RedundancyGroup', key: 'redundancyGroup', type: 'string', desc: 'Units sharing a group back each other up (N+1, 2N)' },
      STATUS
    ] },
  { sheet: 'PowerConnections', entity: 'powerConnections', desc: 'Feeds and circuits: what powers what.',
    fields: [
      { col: 'PowerConnectionId', key: 'id', type: 'id', required: true, desc: 'Stable identifier' },
      { col: 'FromId', key: 'fromId', type: 'ref', ref: 'powerEquipment', required: true, desc: 'Upstream power equipment' },
      { col: 'ToId', key: 'toId', type: 'ref', ref: ['powerEquipment', 'racks', 'devices'], required: true, desc: 'Downstream power equipment, rack or device' },
      { col: 'Side', key: 'side', type: 'enum', options: ['A', 'B', 'N'], dflt: 'N', desc: 'Feed side' },
      { col: 'Circuit', key: 'circuit', type: 'string', desc: 'Circuit / breaker label' },
      { col: 'BreakerA', key: 'breakerA', type: 'number', min: 0, unit: 'A', desc: 'Breaker rating' },
      STATUS
    ] },
  { sheet: 'CoolingEquipment', entity: 'coolingEquipment', desc: 'Cooling units and the rows they serve.',
    fields: [
      { col: 'CoolingId', key: 'id', type: 'id', required: true, desc: 'Stable identifier' },
      { col: 'DataCenterId', key: 'dcId', type: 'ref', ref: 'dataCenters', required: true, desc: 'Site' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', desc: 'Room it stands in / serves' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Unit name' },
      { col: 'Type', key: 'type', type: 'enum', options: ['CRAH', 'CRAC', 'IN_ROW', 'RDHX', 'CDU', 'CHILLER', 'DRY_COOLER'], required: true, desc: 'Unit class' },
      { col: 'CapacityKw', key: 'capacityKw', type: 'number', required: true, min: 0, unit: 'kW', desc: 'Net sensible cooling capacity' },
      { col: 'ZoneId', key: 'zoneId', type: 'ref', ref: 'zones', desc: 'Cooling zone' },
      { col: 'ServesRowIds', key: 'servesRowIds', type: 'list', ref: 'rows', desc: 'Rows served, separated by ; (blank = whole room)' },
      { col: 'X', key: 'x', type: 'number', unit: 'm', desc: 'Position from the room origin' },
      { col: 'Y', key: 'y', type: 'number', unit: 'm', desc: 'Position from the room origin' },
      { col: 'RedundancyGroup', key: 'redundancyGroup', type: 'string', desc: 'Units backing each other up' },
      STATUS
    ] },
  { sheet: 'Sensors', entity: 'sensors', desc: 'Environmental sensors and where they are placed.',
    fields: [
      { col: 'SensorId', key: 'id', type: 'id', required: true, desc: 'Stable identifier' },
      { col: 'Name', key: 'name', type: 'string', required: true, desc: 'Sensor label' },
      { col: 'Kind', key: 'kind', type: 'enum', options: ['TEMPERATURE', 'HUMIDITY', 'TEMP_HUMIDITY', 'LEAK', 'SMOKE', 'DOOR', 'POWER_METER', 'AIRFLOW'], required: true, desc: 'What it measures' },
      { col: 'RoomId', key: 'roomId', type: 'ref', ref: 'rooms', required: true, desc: 'Room' },
      { col: 'RowId', key: 'rowId', type: 'ref', ref: 'rows', desc: 'Row, when placed in one' },
      { col: 'RackId', key: 'rackId', type: 'ref', ref: 'racks', desc: 'Rack, when mounted on one' },
      { col: 'DeviceId', key: 'deviceId', type: 'ref', ref: 'devices', desc: 'Device it is associated with' },
      { col: 'Position', key: 'position', type: 'enum', options: ['ROOM', 'INLET', 'OUTLET', 'UNDERFLOOR', 'CEILING'], dflt: 'ROOM', desc: 'Placement' },
      { col: 'LowThreshold', key: 'lowThreshold', type: 'number', desc: 'Alarm below (°C or %RH)' },
      { col: 'HighThreshold', key: 'highThreshold', type: 'number', desc: 'Alarm above (°C or %RH)' },
      STATUS
    ] },
  { sheet: 'MonitoringMappings', entity: 'monitoringMappings', desc: 'How each record is identified in a monitoring system. References only — never credentials.',
    fields: [
      { col: 'MappingId', key: 'id', type: 'id', required: true, desc: 'Stable identifier' },
      { col: 'EntityId', key: 'entityId', type: 'ref', ref: ['devices', 'racks', 'powerEquipment', 'coolingEquipment', 'sensors'], required: true, desc: 'Record being monitored' },
      { col: 'System', key: 'system', type: 'enum', options: ['SNMP', 'BMS', 'EPMS', 'REDFISH', 'DCGM', 'IPMI', 'OTHER'], required: true, desc: 'Monitoring system' },
      { col: 'ExternalId', key: 'externalId', type: 'string', required: true, desc: 'Point name, OID or object id in that system' },
      { col: 'Metric', key: 'metric', type: 'string', desc: 'Metric name' },
      { col: 'PollSeconds', key: 'pollSeconds', type: 'int', min: 1, max: 86400, unit: 's', desc: 'Polling interval' }
    ] }
];

export const sheetByName = (name: string) => {
  const n = norm(name);
  return SHEETS.find(s => norm(s.sheet) === n || norm(s.entity) === n);
};
export const sheetByEntity = (e: EntityKey) => SHEETS.find(s => s.entity === e)!;

/** header normaliser for auto-mapping: case, spaces, punctuation and units ignored */
export function norm(h: string) {
  return h.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
}

/** best field for a source header, or undefined */
export function matchField(def: SheetDef, header: string): FieldDef | undefined {
  const n = norm(header);
  /* "Width (mm)" → also try "widthmm", so a unit in brackets can complete the column name */
  const withUnit = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!n) return undefined;
  const hit = (k: string) => k === n || k === withUnit;
  return def.fields.find(f => hit(norm(f.col)) || hit(norm(f.key)) || f.aliases?.some(a => hit(norm(a))));
}

/** source header → field key, for the columns auto-mapping recognises */
export function autoMapping(def: SheetDef, headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  const taken = new Set<string>();
  for (const h of headers) {
    const f = matchField(def, h);
    if (f && !taken.has(f.key)) { m[h] = f.key; taken.add(f.key); }
  }
  return m;
}
