/* ── Example inventory for one Inventory › Location site ──────────────────
   Dummy-but-consistent upload rows for a site that has no infrastructure
   uploaded yet, so a user can see the Infrastructure tab filled and use the
   files as a starting point for real data.

   The devices are the site's own network elements exactly as its "Network
   elements" tab lists them — same names, IPs, models and serials, from the
   same rule the legacy prototype uses (legacy/app-data.js siteNE): routers
   ≈ 60 % of the site's NE count, switches the rest, DWDM shelves at larger
   sites. Around them: one building, a ground floor (MDF, power room) and a
   1st floor (equipment room), 42U racks in rows, patch panels and ODFs,
   cabling (router uplinks to the ODF, router ↔ switch links), the power
   chain (utility A/B, DG, ATS, UPS A/B, −48 V rectifier + battery, PDUs,
   A/B rack PDUs), cooling, sensors and monitoring references.
   LocationId = the site id, so the upload lands on that site's tab. */
import type { Cell, SheetRows } from './sample';

export interface SiteInfo { id: string; name: string; city: string; state: string; addr: string; lat?: number; lon?: number; ne: number; disc: number }

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/* the legacy roster rule, verbatim in effect (legacy/app-data.js siteNE) */
export function siteRoster(id: string, ne: number, disc: number) {
  const models = [['MX204', 'JUNIPER', '21.4R3-S5.5'], ['NCS-540', 'CISCO', '7.9.2'], ['ACX2200', 'JUNIPER', '21.2R3-S8.5'], ['ASR920', 'CISCO', '17.6.4']];
  const sw = [['EX2200-24T', 'JUNIPER'], ['C9300-48UXM', 'CISCO'], ['L2-ACCESS-24P', 'CIENA']];
  const nR = Math.max(1, Math.round(ne * 0.6)), nS = Math.max(0, ne - nR);
  const digits = id.replace(/[^0-9]/g, '');
  const routers = Array.from({ length: nR }, (_, i) => {
    const m = models[i % models.length];
    return { name: `${id}-PE-T4-${pad(i + 1)}`, ip: `172.31.${40 + (i % 9)}.${20 + i * 3}`, model: m[0], oem: m[1], sn: `${m[1].slice(0, 2)}${digits.slice(0, 4)}${1000 + i * 7}`, discovered: i < disc };
  });
  const switches = Array.from({ length: nS }, (_, i) => {
    const m = sw[i % sw.length];
    return { name: `${id}-T-CHR-${pad(i + 1)}`, ip: `172.31.${52 + (i % 5)}.${60 + i * 4}`, model: m[0], oem: m[1], sn: `SW-${id}-${4400 + i * 11}`, discovered: nR + i < disc };
  });
  const TYPES = ['OADM', 'ILA', 'GNE'];
  const nD = ne >= 20 ? 2 : ne >= 6 ? 1 : 0;
  const dwdm = Array.from({ length: nD }, (_, i) => ({
    name: `${id}-OADM-${100 + i * 20}`, ip: `172.31.${160 + (i % 38)}.${20 + i * 7}`, model: `FSP 3000 ${TYPES[i % 3]}`, oem: i % 2 ? 'ADVA' : 'JUNIPER',
    sn: `ADV${digits.padStart(3, '0')}${100 + i * 20}`, discovered: false
  }));
  return { routers, switches, dwdm };
}

const POWER_W: Record<string, number> = { MX204: 495, 'NCS-540': 250, ACX2200: 110, ASR920: 130, 'EX2200-24T': 50, 'C9300-48UXM': 420, 'L2-ACCESS-24P': 60 };

export function buildSiteSample(site: SiteInfo, clientId = 'DEMO-TELCO', clientName = 'Demo Telco Operations'): SheetRows {
  const S: SheetRows = {
    Clients: [], DataCenters: [], Buildings: [], Floors: [], Rooms: [], Zones: [], Rows: [], Racks: [], Devices: [], Ports: [],
    Connections: [], PowerEquipment: [], PowerConnections: [], CoolingEquipment: [], Sensors: [], MonitoringMappings: []
  };
  const id = site.id, P = (s: string) => `${id}-${s}`;
  const { routers, switches, dwdm } = siteRoster(id, site.ne, site.disc);
  const PER = 20;                                       /* devices per rack, U2–U21 */
  const rRacks = Math.ceil(routers.length / PER), sRacks = Math.ceil(switches.length / PER);
  const loadKw = (routers.reduce((a, r) => a + POWER_W[r.model], 0) + switches.reduce((a, s) => a + POWER_W[s.model], 0) + dwdm.length * 600) / 1000;
  const design = Math.max(20, Math.ceil(loadKw * 2 / 10) * 10);

  S.Clients.push({ ClientId: clientId, Name: clientName, Industry: 'Telecom', ContactEmail: 'noc@example.com' });
  S.DataCenters.push({ DataCenterId: id, ClientId: clientId, Name: `${site.name} ${site.addr}`.trim(), LocationId: id, Address: site.addr, City: site.city, Country: 'India',
    ...(site.lat !== undefined ? { Latitude: site.lat, Longitude: site.lon! } : {}), Tier: 'III', Status: 'ACTIVE', DesignKw: design, AvailableKw: Math.round(design - loadKw) });
  S.Buildings.push({ BuildingId: P('B1'), DataCenterId: id, Name: 'Main building', Status: 'ACTIVE', LengthM: 32, WidthM: 20, HeightM: 10, DesignKw: design });
  S.Floors.push(
    { FloorId: P('B1-GF'), BuildingId: P('B1'), Name: 'Ground', Level: 0, ElevationM: 0, LengthM: 30, WidthM: 18, CeilingM: 4.2, RaisedFloorMm: 0, MaxLoadKgM2: 1500 },
    { FloorId: P('B1-1F'), BuildingId: P('B1'), Name: '1st floor', Level: 1, ElevationM: 4.5, LengthM: 30, WidthM: 18, CeilingM: 3.8, RaisedFloorMm: 600, MaxLoadKgM2: 1200 }
  );
  const MDF = P('MDF'), PWR = P('PWR'), EQ = P('EQR');
  S.Rooms.push(
    { RoomId: MDF, FloorId: P('B1-GF'), Name: 'MDF', Type: 'MMR', X: 1, Y: 1, LengthM: 8, WidthM: 6, DesignKw: 4, CoolingType: 'AIR' },
    { RoomId: PWR, FloorId: P('B1-GF'), Name: 'Power room', Type: 'ELECTRICAL', X: 11, Y: 1, LengthM: 10, WidthM: 8 },
    { RoomId: EQ, FloorId: P('B1-1F'), Name: 'Equipment room', Type: 'NETWORK', X: 1, Y: 1, LengthM: 20, WidthM: 12, DesignKw: design, CoolingType: 'AIR' }
  );
  S.Zones.push({ ZoneId: P('EQR-COOL'), RoomId: EQ, Name: 'Equipment room cooling zone', Kind: 'COOLING' }, { ZoneId: P('EQR-PWR'), RoomId: EQ, Name: 'Equipment room power zone', Kind: 'POWER' });
  S.Rows.push(
    { RowId: P('EQR-A'), RoomId: EQ, Name: 'A', FrontAisle: 'COLD', Containment: 'COLD_AISLE', ZoneId: P('EQR-COOL') },
    { RowId: P('EQR-B'), RoomId: EQ, Name: 'B', FrontAisle: 'COLD', Containment: 'COLD_AISLE', ZoneId: P('EQR-COOL') },
    { RowId: P('MDF-A'), RoomId: MDF, Name: 'A', FrontAisle: 'COLD', Containment: 'NONE' }
  );

  /* racks: routers (+ DWDM) in row A, switches in row B, ODFs in the MDF */
  type RackDef = { id: string; name: string; room: string; row: string; pos: number; kind: 'router' | 'switch' | 'dwdm' | 'odf' };
  const racks: RackDef[] = [];
  for (let i = 0; i < rRacks; i++) racks.push({ id: P(`RK-A${pad(i + 1)}`), name: `A${pad(i + 1)}`, room: EQ, row: P('EQR-A'), pos: i + 1, kind: 'router' });
  if (dwdm.length) racks.push({ id: P(`RK-A${pad(rRacks + 1)}`), name: `A${pad(rRacks + 1)}`, room: EQ, row: P('EQR-A'), pos: rRacks + 1, kind: 'dwdm' });
  for (let i = 0; i < sRacks; i++) racks.push({ id: P(`RK-B${pad(i + 1)}`), name: `B${pad(i + 1)}`, room: EQ, row: P('EQR-B'), pos: i + 1, kind: 'switch' });
  const odfRacks = Math.max(1, Math.ceil(routers.length / 96));
  for (let i = 0; i < odfRacks; i++) racks.push({ id: P(`RK-M${pad(i + 1)}`), name: `M${pad(i + 1)}`, room: MDF, row: P('MDF-A'), pos: i + 1, kind: 'odf' });
  for (const r of racks) S.Racks.push({ RackId: r.id, RoomId: r.room, RowId: r.row, Name: r.name, Position: r.pos, WidthMm: r.kind === 'odf' ? 800 : 600, DepthMm: r.kind === 'odf' ? 800 : 1000, HeightU: 42,
    MaxKw: r.kind === 'odf' ? 1 : r.kind === 'dwdm' ? 4 : 8, MaxKg: 900, Status: 'ACTIVE' });

  const device = (o: Record<string, Cell>) => { S.Devices.push({ Face: 'FRONT', FullDepth: 'Y', Status: 'ACTIVE', ...o }); return o.DeviceId as string; };
  const port = (dev: string, name: string, kind: string, speed: number, media: string) => { const pid = `${dev}:${name}`; S.Ports.push({ PortId: pid, DeviceId: dev, Name: name, Kind: kind, SpeedGbps: speed, Media: media }); return pid; };
  let cbl = 0;
  const cable = (a: string, b: string, o: Record<string, Cell>) => S.Connections.push({ ConnectionId: P(`CBL-${pad(++cbl, 4)}`), Kind: 'PHYSICAL', APortId: a, BPortId: b, CableId: P(`CBL-${pad(cbl, 4)}`), Status: 'ACTIVE', ...o });

  /* patch panel at U42 in every equipment rack */
  for (const r of racks.filter(x => x.kind !== 'odf')) device({ DeviceId: `${r.id}-PP`, Name: `${r.name}-PP`, Type: 'PATCH_PANEL', RackId: r.id, UStart: 42, UHeight: 1, FullDepth: 'N', Vendor: 'CommScope', Model: '24-port LC panel', Role: 'patching', PowerW: 0 });
  /* ODFs in the MDF: 48-fibre, 4U each, top down */
  const odfs: string[] = [];
  for (let i = 0; i < odfRacks * 4; i++) {
    const r = racks.filter(x => x.kind === 'odf')[Math.floor(i / 4)];
    odfs.push(device({ DeviceId: P(`ODF-${pad(i + 1)}`), Name: `ODF-${pad(i + 1)}`, Type: 'ODF', RackId: r.id, UStart: 37 - (i % 4) * 5, UHeight: 4, FullDepth: 'N', Vendor: 'CommScope', Model: 'FACT 4U 48F', Role: 'carrier hand-off', PowerW: 0 }));
  }

  /* routers */
  routers.forEach((r, i) => {
    const rk = racks.filter(x => x.kind === 'router')[Math.floor(i / PER)];
    device({ DeviceId: r.name, Name: r.name, Type: 'ROUTER', RackId: rk.id, UStart: 2 + (i % PER), UHeight: 1, Vendor: r.oem, Model: r.model, Serial: r.sn, MgmtIp: r.ip, Role: 'PE / aggregation',
      PowerW: POWER_W[r.model], PsuCount: 2, WeightKg: 8, Status: r.discovered ? 'ACTIVE' : 'PLANNED' });
    const up = port(r.name, 'xe-0/0/0', 'FIBER', 10, 'SFP+');
    const odf = odfs[Math.floor(i / 48)];
    cable(up, port(odf, `F${pad((i % 48) + 1)}`, 'FIBER', 10, 'LC'), { Media: 'OS2', LengthM: 25, Role: 'UPLINK' });
    port(r.name, 'xe-0/0/1', 'FIBER', 10, 'SFP+');
    port(r.name, 'ge-0/0/0', 'ETHERNET', 1, 'RJ45');
  });
  /* switches: uplink 1 to a router (redundancy pairs: switch n → router n), uplink 2 left free */
  switches.forEach((s, i) => {
    const rk = racks.filter(x => x.kind === 'switch')[Math.floor(i / PER)];
    device({ DeviceId: s.name, Name: s.name, Type: 'SWITCH', RackId: rk.id, UStart: 2 + (i % PER), UHeight: 1, Vendor: s.oem, Model: s.model, Serial: s.sn, MgmtIp: s.ip, Role: 'access / ToR',
      PowerW: POWER_W[s.model], PsuCount: s.model === 'C9300-48UXM' ? 2 : 1, WeightKg: 6, Status: s.discovered ? 'ACTIVE' : 'PLANNED' });
    const u1 = port(s.name, 'Gi1/0/49', 'FIBER', 10, 'SFP+');
    port(s.name, 'Gi1/0/50', 'FIBER', 10, 'SFP+');
    const r = routers[i % routers.length];
    const rp = `${r.name}:xe-0/0/1`;
    if (i < routers.length) {
      cable(u1, rp, { Media: 'OM4', LengthM: 8, Role: 'UPLINK', RedundancyGroup: `${s.name}-UP` });
      S.Connections.push({ ConnectionId: P(`LLDP-${pad(i + 1, 3)}`), Kind: 'LOGICAL', APortId: u1, BPortId: rp, Role: 'UPLINK', Status: 'ACTIVE' });
    }
  });
  /* DWDM shelves, 6U each */
  dwdm.forEach((d, i) => {
    const rk = racks.find(x => x.kind === 'dwdm')!;
    device({ DeviceId: d.name, Name: d.name, Type: 'OTHER', RackId: rk.id, UStart: 2 + i * 7, UHeight: 6, Vendor: d.oem, Model: d.model, Serial: d.sn, MgmtIp: d.ip, Role: 'DWDM', PowerW: 600, PsuCount: 2, WeightKg: 35, Status: d.discovered ? 'ACTIVE' : 'PLANNED' });
    const line = port(d.name, 'NE-1', 'FIBER', 100, 'LC');
    cable(line, port(odfs[odfs.length - 1], `F${pad(47 - i)}`, 'FIBER', 100, 'LC'), { Media: 'OS2', LengthM: 30, Role: 'UPLINK' });
  });

  /* power chain */
  const pe = (o: Record<string, Cell>) => { S.PowerEquipment.push({ DataCenterId: id, Status: 'ACTIVE', Side: 'N', ...o }); return o.PowerId as string; };
  let pc = 0;
  const feed = (from: string, to: string, side: string, o: Record<string, Cell> = {}) => S.PowerConnections.push({ PowerConnectionId: P(`PC-${pad(++pc, 3)}`), FromId: from, ToId: to, Side: side, Status: 'ACTIVE', ...o });
  const ups = Math.max(20, Math.ceil(loadKw * 1.5 / 10) * 10);
  pe({ PowerId: P('UTIL-A'), Name: 'Utility feed A (PSPCL 11 kV)', Type: 'UTILITY', Side: 'A', RatingKw: design, Voltage: 11000 });
  pe({ PowerId: P('UTIL-B'), Name: 'Utility feed B (PSPCL 11 kV)', Type: 'UTILITY', Side: 'B', RatingKw: design, Voltage: 11000 });
  pe({ PowerId: P('DG-01'), Name: 'DG-01', Type: 'GENERATOR', RoomId: PWR, RatingKw: Math.round(design * 1.25 * 0.8), RatingKva: Math.round(design * 1.25), Voltage: 415 });
  for (const s of ['A', 'B']) {
    pe({ PowerId: P(`ATS-${s}`), Name: `ATS ${s}`, Type: 'ATS', RoomId: PWR, Side: s, RatingKw: design, Voltage: 415 });
    pe({ PowerId: P(`UPS-${s}`), Name: `UPS ${s}`, Type: 'UPS', RoomId: PWR, Side: s, RatingKw: ups, RatingKva: ups, AutonomyMin: 15, RedundancyGroup: 'UPS 2N' });
    pe({ PowerId: P(`PDU-${s}`), Name: `PDU ${s}`, Type: 'PDU', RoomId: EQ, Side: s, RatingKw: ups, Voltage: 415 });
    feed(P(`UTIL-${s}`), P(`ATS-${s}`), s); feed(P('DG-01'), P(`ATS-${s}`), s, { Circuit: `DG-${s}` });
    feed(P(`ATS-${s}`), P(`UPS-${s}`), s); feed(P(`UPS-${s}`), P(`PDU-${s}`), s);
  }
  pe({ PowerId: P('RECT-01'), Name: 'Rectifier RECT-01 (−48 V)', Type: 'RECTIFIER', RoomId: PWR, RatingKw: Math.max(6, Math.ceil(dwdm.length * 1.2 + 4)), Voltage: 48 });
  pe({ PowerId: P('BATT-01'), Name: 'Battery bank BATT-01 (48 V)', Type: 'BATTERY', RoomId: PWR, RatingKw: 6, AutonomyMin: 240 });
  feed(P('ATS-A'), P('RECT-01'), 'A'); feed(P('BATT-01'), P('RECT-01'), 'N');
  for (const r of racks.filter(x => x.kind !== 'odf')) for (const s of ['A', 'B']) {
    const rp = pe({ PowerId: `${r.id}-RPDU-${s}`, Name: `${r.name} rack PDU ${s}`, Type: 'RACK_PDU', RackId: r.id, RoomId: r.room, Side: s, RatingKw: 7.4, Voltage: 230 });
    feed(P(`PDU-${s}`), rp, s, { Circuit: `${s}-${r.name}`, BreakerA: 32 });
  }

  /* cooling */
  const crac = Math.max(10, Math.ceil(loadKw * 1.3 / 5) * 5);
  for (const n of [1, 2]) S.CoolingEquipment.push({ CoolingId: P(`CRAC-${n}`), DataCenterId: id, RoomId: EQ, Name: `CRAC-${n}`, Type: 'CRAC', CapacityKw: crac, ZoneId: P('EQR-COOL'), ServesRowIds: `${P('EQR-A')};${P('EQR-B')}`, RedundancyGroup: 'EQR N+1', Status: 'ACTIVE' });
  S.CoolingEquipment.push({ CoolingId: P('MDF-AC'), DataCenterId: id, RoomId: MDF, Name: 'MDF split AC', Type: 'CRAC', CapacityKw: 7, Status: 'ACTIVE' });
  S.CoolingEquipment.push({ CoolingId: P('PWR-AC'), DataCenterId: id, RoomId: PWR, Name: 'Power room AC', Type: 'CRAC', CapacityKw: 10, Status: 'ACTIVE' });

  /* sensors */
  let sn = 0;
  const sensor = (o: Record<string, Cell>) => S.Sensors.push({ SensorId: P(`SEN-${pad(++sn, 3)}`), Status: 'ACTIVE', ...o });
  for (const [room, name] of [[MDF, 'MDF'], [PWR, 'Power room'], [EQ, 'Equipment room']]) {
    sensor({ Name: `${name} ambient`, Kind: 'TEMP_HUMIDITY', RoomId: room, Position: 'ROOM', LowThreshold: 18, HighThreshold: room === PWR ? 30 : 27 });
    sensor({ Name: `${name} smoke`, Kind: 'SMOKE', RoomId: room, Position: 'CEILING' });
    sensor({ Name: `${name} door`, Kind: 'DOOR', RoomId: room, Position: 'ROOM' });
  }
  sensor({ Name: 'Battery area leak', Kind: 'LEAK', RoomId: PWR, Position: 'UNDERFLOOR' });
  sensor({ Name: 'Equipment room underfloor leak', Kind: 'LEAK', RoomId: EQ, Position: 'UNDERFLOOR' });
  for (const row of [P('EQR-A'), P('EQR-B')]) {
    const inRow = racks.filter(r => r.row === row);
    for (const r of [inRow[0], inRow[inRow.length - 1]]) if (r) sensor({ Name: `${r.name} inlet`, Kind: 'TEMPERATURE', RoomId: EQ, RowId: row, RackId: r.id, Position: 'INLET', LowThreshold: 18, HighThreshold: 27 });
  }

  /* monitoring references — point names only, never credentials */
  let mn = 0;
  const map = (entity: string, system: string, ext: string, metric: string, poll: number) => S.MonitoringMappings.push({ MappingId: P(`MON-${pad(++mn, 3)}`), EntityId: entity, System: system, ExternalId: ext, Metric: metric, PollSeconds: poll });
  map(P('UPS-A'), 'SNMP', `${id}/UPS-A/upsOutputPower`, 'output_kw', 60);
  map(P('UPS-B'), 'SNMP', `${id}/UPS-B/upsOutputPower`, 'output_kw', 60);
  map(P('RECT-01'), 'SNMP', `${id}/RECT-01/dcOutputCurrent`, 'output_a', 60);
  map(P('DG-01'), 'BMS', `BMS/${id}/DG-01/FuelLevel`, 'fuel_pct', 300);
  map(P('CRAC-1'), 'BMS', `BMS/${id}/CRAC-1/SupplyTemp`, 'supply_c', 60);
  map(P('CRAC-2'), 'BMS', `BMS/${id}/CRAC-2/SupplyTemp`, 'supply_c', 60);
  return S;
}
