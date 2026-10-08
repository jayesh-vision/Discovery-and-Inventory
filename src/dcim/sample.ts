/* ── Sample client workbook (acceptance scenario) and template examples ───
   Rows are keyed by template column header, exactly as a client would fill
   them in, so the sample goes through the same parser and validation as
   any upload. Deterministic: same output every time.

   'full'  — Acme Cloud Services: one data center (estate location KA-DC-008),
             two buildings, five floors, eleven rooms, rows, 86 racks of four
             sizes, servers / switches / storage / patch panels, port-to-port
             cabling through patch panels, LLDP adjacencies, a utility →
             generator → ATS → switchgear → UPS → PDU → rack-PDU chain on two
             sides (some racks deliberately A-only), cooling and sensors.
             Three data halls exercise the three layout rules: DH1 has rack
             coordinates, DH2 only rows, DH3 neither.
   'mini'  — a coherent handful of rows per sheet for the blank template. */

export type Cell = string | number | boolean;
export type SheetRows = Record<string, Record<string, Cell>[]>;

export interface SampleRefs {
  /** real Physical Resources records whose serial / IP two sample servers reuse, to demonstrate linking */
  inventory?: { sn: string; ip: string }[];
  /** a real discovered device whose IP one sample switch reuses */
  discovered?: { ip: string }[];
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function buildSample(size: 'full' | 'mini' = 'full', refs: SampleRefs = {}): SheetRows {
  const S: SheetRows = {
    Clients: [], DataCenters: [], Buildings: [], Floors: [], Rooms: [], Zones: [], Rows: [], Racks: [], Devices: [], Ports: [],
    Connections: [], PowerEquipment: [], PowerConnections: [], CoolingEquipment: [], Sensors: [], MonitoringMappings: []
  };
  const DC = 'ACME-BLR1';
  S.Clients.push({ ClientId: 'ACME', Name: 'Acme Cloud Services', Industry: 'Cloud hosting', ContactEmail: 'dc-ops@acme.example' });
  S.DataCenters.push({ DataCenterId: DC, ClientId: 'ACME', Name: 'Acme Bengaluru Campus', LocationId: 'KA-DC-008', Address: 'Bengaluru Data Park', City: 'Bengaluru', Country: 'India', Latitude: 14.745, Longitude: 76.165, Tier: 'III', Status: 'ACTIVE', DesignKw: 2400, AvailableKw: 900 });

  let portSeq = 0, connSeq = 0, devSeq = 0, pcSeq = 0, sensSeq = 0;
  const port = (deviceId: string, name: string, kind: string, speed: number, media: string) => {
    const id = `${deviceId}:${name}`; portSeq++;
    S.Ports.push({ PortId: id, DeviceId: deviceId, Name: name, Kind: kind, SpeedGbps: speed, Media: media });
    return id;
  };
  const conn = (a: string, b: string, o: Partial<Record<string, Cell>> = {}) => {
    const id = `CBL-${pad(++connSeq, 4)}`;
    S.Connections.push({ ConnectionId: id, Kind: 'PHYSICAL', APortId: a, BPortId: b, CableId: id, Status: 'ACTIVE', ...o });
    return id;
  };
  const device = (o: Record<string, Cell>) => { devSeq++; S.Devices.push({ Status: 'ACTIVE', Face: 'FRONT', FullDepth: 'Y', ...o }); return o.DeviceId as string; };
  const feed = (from: string, to: string, side: string, o: Partial<Record<string, Cell>> = {}) =>
    S.PowerConnections.push({ PowerConnectionId: `PC-${pad(++pcSeq, 4)}`, FromId: from, ToId: to, Side: side, Status: 'ACTIVE', ...o });
  const pe = (o: Record<string, Cell>) => { S.PowerEquipment.push({ DataCenterId: DC, Status: 'ACTIVE', Side: 'N', ...o }); return o.PowerId as string; };
  const sensor = (o: Record<string, Cell>) => S.Sensors.push({ SensorId: `SEN-${pad(++sensSeq, 3)}`, Status: 'ACTIVE', ...o });

  if (size === 'mini') {
    S.Buildings.push({ BuildingId: 'B1', DataCenterId: DC, Name: 'Building 1', Status: 'ACTIVE', LengthM: 40, WidthM: 30, HeightM: 12 });
    S.Floors.push({ FloorId: 'B1-L1', BuildingId: 'B1', Name: 'Level 1', Level: 1, ElevationM: 4.5, LengthM: 38, WidthM: 28, CeilingM: 4, RaisedFloorMm: 600 });
    S.Rooms.push({ RoomId: 'B1-L1-DH1', FloorId: 'B1-L1', Name: 'Data hall 1', Type: 'DATA_HALL', X: 2, Y: 2, LengthM: 20, WidthM: 14, DesignKw: 400, CoolingType: 'AIR' });
    S.Zones.push({ ZoneId: 'DH1-COOL', RoomId: 'B1-L1-DH1', Name: 'Cooling zone 1', Kind: 'COOLING' });
    S.Rows.push({ RowId: 'DH1-A', RoomId: 'B1-L1-DH1', Name: 'A', FrontAisle: 'COLD', Containment: 'COLD_AISLE', ZoneId: 'DH1-COOL' });
    for (const p of [1, 2]) S.Racks.push({ RackId: `DH1-A0${p}`, RoomId: 'B1-L1-DH1', RowId: 'DH1-A', Name: `A0${p}`, Position: p, WidthMm: 600, DepthMm: 1200, HeightU: 42, MaxKw: 12, MaxKg: 1200, Status: 'ACTIVE' });
    device({ DeviceId: 'DH1-A01-TOR', Name: 'dh1-a01-tor', Type: 'SWITCH', RackId: 'DH1-A01', UStart: 42, UHeight: 1, FullDepth: 'N', Vendor: 'Arista', Model: '7050SX3-48YC8', Serial: 'JPE00000001', MgmtIp: '10.20.1.11', Role: 'ToR', PowerW: 450, PsuCount: 2, WeightKg: 9 });
    device({ DeviceId: 'DH1-A01-S01', Name: 'dh1-a01-srv01', Type: 'SERVER', RackId: 'DH1-A01', UStart: 1, UHeight: 2, Vendor: 'Dell', Model: 'PowerEdge R760', Serial: 'DL00000001', MgmtIp: '10.20.1.21', Role: 'compute', PowerW: 1400, PsuCount: 2, WeightKg: 28 });
    device({ DeviceId: 'DH1-A02-S01', Name: 'dh1-a02-srv01', Type: 'SERVER', RackId: 'DH1-A02', UStart: 1, UHeight: 2, Vendor: 'Dell', Model: 'PowerEdge R760', Serial: 'DL00000002', MgmtIp: '10.20.1.22', Role: 'compute', PowerW: 1400, PsuCount: 2, WeightKg: 28 });
    const t1 = port('DH1-A01-TOR', 'Ethernet1', 'ETHERNET', 25, 'SFP28'), t2 = port('DH1-A01-TOR', 'Ethernet2', 'ETHERNET', 25, 'SFP28');
    conn(port('DH1-A01-S01', 'eth0', 'ETHERNET', 25, 'SFP28'), t1, { Media: 'DAC', LengthM: 2, Role: 'DOWNLINK' });
    conn(port('DH1-A02-S01', 'eth0', 'ETHERNET', 25, 'SFP28'), t2, { Media: 'DAC', LengthM: 3, Role: 'DOWNLINK' });
    pe({ PowerId: 'UPS-A', Name: 'UPS A', Type: 'UPS', RoomId: 'B1-L1-DH1', Side: 'A', RatingKw: 300, RatingKva: 300, AutonomyMin: 10 });
    pe({ PowerId: 'UPS-B', Name: 'UPS B', Type: 'UPS', RoomId: 'B1-L1-DH1', Side: 'B', RatingKw: 300, RatingKva: 300, AutonomyMin: 10 });
    for (const r of ['DH1-A01', 'DH1-A02']) for (const s of ['A', 'B']) {
      const id = pe({ PowerId: `${r}-RPDU-${s}`, Name: `${r} rack PDU ${s}`, Type: 'RACK_PDU', RackId: r, Side: s, RatingKw: 11, Voltage: 230 });
      feed(`UPS-${s}`, id, s, { Circuit: `${r}-${s}`, BreakerA: 32 });
    }
    S.CoolingEquipment.push({ CoolingId: 'DH1-CRAH-1', DataCenterId: DC, RoomId: 'B1-L1-DH1', Name: 'CRAH 1', Type: 'CRAH', CapacityKw: 150, ZoneId: 'DH1-COOL', ServesRowIds: 'DH1-A', Status: 'ACTIVE' });
    sensor({ Name: 'DH1 A01 inlet', Kind: 'TEMP_HUMIDITY', RoomId: 'B1-L1-DH1', RowId: 'DH1-A', RackId: 'DH1-A01', Position: 'INLET', LowThreshold: 18, HighThreshold: 27 });
    sensor({ Name: 'DH1 underfloor leak', Kind: 'LEAK', RoomId: 'B1-L1-DH1', Position: 'UNDERFLOOR' });
    S.MonitoringMappings.push({ MappingId: 'MON-0001', EntityId: 'DH1-A01-TOR', System: 'SNMP', ExternalId: 'sysName.0=dh1-a01-tor', Metric: 'ifOperStatus', PollSeconds: 60 });
    return S;
  }

  /* ── buildings, floors, rooms ── */
  S.Buildings.push(
    { BuildingId: 'B1', DataCenterId: DC, Name: 'Building 1', Status: 'ACTIVE', LengthM: 64, WidthM: 40, HeightM: 16, X: 0, Y: 0, DesignKw: 1800 },
    { BuildingId: 'B2', DataCenterId: DC, Name: 'Building 2', Status: 'ACTIVE', LengthM: 44, WidthM: 30, HeightM: 10, X: 75, Y: 0, DesignKw: 600 }
  );
  S.Floors.push(
    { FloorId: 'B1-L0', BuildingId: 'B1', Name: 'Ground', Level: 0, ElevationM: 0, LengthM: 62, WidthM: 38, CeilingM: 4.5, RaisedFloorMm: 0, MaxLoadKgM2: 2000 },
    { FloorId: 'B1-L1', BuildingId: 'B1', Name: 'Level 1', Level: 1, ElevationM: 5, LengthM: 62, WidthM: 38, CeilingM: 4.2, RaisedFloorMm: 600, MaxLoadKgM2: 1500 },
    { FloorId: 'B1-L2', BuildingId: 'B1', Name: 'Level 2', Level: 2, ElevationM: 10, LengthM: 62, WidthM: 38, CeilingM: 4.2, RaisedFloorMm: 600, MaxLoadKgM2: 1500 },
    { FloorId: 'B2-L0', BuildingId: 'B2', Name: 'Ground', Level: 0, ElevationM: 0, LengthM: 42, WidthM: 28, CeilingM: 4.5, RaisedFloorMm: 450, MaxLoadKgM2: 1500 },
    { FloorId: 'B2-L1', BuildingId: 'B2', Name: 'Level 1', Level: 1, ElevationM: 5, LengthM: 42, WidthM: 28, CeilingM: 4.2, RaisedFloorMm: 600, MaxLoadKgM2: 1500 }
  );
  S.Rooms.push(
    { RoomId: 'B1-L0-ELEC', FloorId: 'B1-L0', Name: 'Electrical room', Type: 'ELECTRICAL', X: 2, Y: 2, LengthM: 16, WidthM: 12 },
    { RoomId: 'B1-L0-UPS', FloorId: 'B1-L0', Name: 'UPS & battery room', Type: 'UPS', X: 20, Y: 2, LengthM: 14, WidthM: 12 },
    { RoomId: 'B1-L0-MMR', FloorId: 'B1-L0', Name: 'Meet-me room', Type: 'MMR', X: 36, Y: 2, LengthM: 10, WidthM: 8, DesignKw: 40, CoolingType: 'AIR' },
    { RoomId: 'B1-L1-DH1', FloorId: 'B1-L1', Name: 'Data hall 1', Type: 'DATA_HALL', X: 2, Y: 2, LengthM: 28, WidthM: 16, DesignKw: 600, CoolingType: 'AIR' },
    { RoomId: 'B1-L1-DH2', FloorId: 'B1-L1', Name: 'Data hall 2', Type: 'DATA_HALL', LengthM: 28, WidthM: 16, DesignKw: 600, CoolingType: 'AIR' },
    { RoomId: 'B1-L2-DH3', FloorId: 'B1-L2', Name: 'Data hall 3', Type: 'DATA_HALL', DesignKw: 300, CoolingType: 'AIR' },
    { RoomId: 'B1-L2-NOC', FloorId: 'B1-L2', Name: 'NOC', Type: 'NOC', LengthM: 10, WidthM: 8 },
    { RoomId: 'B2-L0-NET', FloorId: 'B2-L0', Name: 'Network room', Type: 'NETWORK', X: 2, Y: 2, LengthM: 14, WidthM: 10, DesignKw: 120, CoolingType: 'AIR' },
    { RoomId: 'B2-L0-MECH', FloorId: 'B2-L0', Name: 'Chiller plant', Type: 'MECHANICAL', X: 20, Y: 2, LengthM: 18, WidthM: 12 },
    { RoomId: 'B2-L1-DH4', FloorId: 'B2-L1', Name: 'Storage hall', Type: 'DATA_HALL', X: 2, Y: 2, LengthM: 20, WidthM: 14, DesignKw: 250, CoolingType: 'AIR' }
  );
  S.Zones.push(
    { ZoneId: 'DH1-COOL', RoomId: 'B1-L1-DH1', Name: 'DH1 cooling zone', Kind: 'COOLING' },
    { ZoneId: 'DH1-PWR', RoomId: 'B1-L1-DH1', Name: 'DH1 power zone', Kind: 'POWER' },
    { ZoneId: 'DH2-COOL', RoomId: 'B1-L1-DH2', Name: 'DH2 cooling zone', Kind: 'COOLING' },
    { ZoneId: 'DH4-COOL', RoomId: 'B2-L1-DH4', Name: 'Storage cooling zone', Kind: 'COOLING' }
  );

  /* ── power chain: two utility feeds, N+1 generators, A and B sides ── */
  pe({ PowerId: 'UTIL-A', Name: 'Utility feed A (BESCOM 11 kV)', Type: 'UTILITY', Side: 'A', RatingKw: 2500, RatingKva: 3000, Voltage: 11000 });
  pe({ PowerId: 'UTIL-B', Name: 'Utility feed B (BESCOM 11 kV)', Type: 'UTILITY', Side: 'B', RatingKw: 2500, RatingKva: 3000, Voltage: 11000 });
  for (const g of [1, 2, 3]) pe({ PowerId: `GEN-${g}`, Name: `Generator ${g}`, Type: 'GENERATOR', RoomId: 'B2-L0-MECH', RatingKw: 1600, RatingKva: 2000, Voltage: 415, RedundancyGroup: 'GEN N+1' });
  for (const s of ['A', 'B']) {
    pe({ PowerId: `TX-${s}`, Name: `Transformer ${s}`, Type: 'TRANSFORMER', RoomId: 'B1-L0-ELEC', Side: s, RatingKw: 2400, RatingKva: 2500, Voltage: 415 });
    pe({ PowerId: `ATS-${s}`, Name: `ATS ${s}`, Type: 'ATS', RoomId: 'B1-L0-ELEC', Side: s, RatingKw: 2400, Voltage: 415 });
    pe({ PowerId: `SWGR-${s}`, Name: `LV switchgear ${s}`, Type: 'SWITCHGEAR', RoomId: 'B1-L0-ELEC', Side: s, RatingKw: 2400, Voltage: 415 });
    feed(`UTIL-${s}`, `TX-${s}`, s); feed(`TX-${s}`, `ATS-${s}`, s);
    for (const g of [1, 2, 3]) feed(`GEN-${g}`, `ATS-${s}`, s, { Circuit: `GEN${g}-${s}` });
    feed(`ATS-${s}`, `SWGR-${s}`, s);
    for (const u of [1, 2]) {
      pe({ PowerId: `UPS-${s}${u}`, Name: `UPS ${s}${u}`, Type: 'UPS', RoomId: 'B1-L0-UPS', Side: s, RatingKw: 800, RatingKva: 800, AutonomyMin: 12, RedundancyGroup: `UPS-${s}` });
      feed(`SWGR-${s}`, `UPS-${s}${u}`, s);
      pe({ PowerId: `BAT-${s}${u}`, Name: `Battery string ${s}${u}`, Type: 'BATTERY', RoomId: 'B1-L0-UPS', Side: s, RatingKw: 800, AutonomyMin: 12 });
      feed(`BAT-${s}${u}`, `UPS-${s}${u}`, s);
    }
  }
  const halls: { room: string; pdu: string; kw: number }[] = [
    { room: 'B1-L1-DH1', pdu: 'DH1', kw: 400 }, { room: 'B1-L1-DH2', pdu: 'DH2', kw: 400 }, { room: 'B1-L2-DH3', pdu: 'DH3', kw: 250 },
    { room: 'B2-L0-NET', pdu: 'NET', kw: 120 }, { room: 'B2-L1-DH4', pdu: 'DH4', kw: 250 }, { room: 'B1-L0-MMR', pdu: 'MMR', kw: 60 }
  ];
  for (const h of halls) for (const s of ['A', 'B']) {
    pe({ PowerId: `PDU-${h.pdu}-${s}`, Name: `PDU ${h.pdu}-${s}`, Type: 'PDU', RoomId: h.room, Side: s, RatingKw: h.kw, Voltage: 415 });
    feed(`UPS-${s}1`, `PDU-${h.pdu}-${s}`, s); feed(`UPS-${s}2`, `PDU-${h.pdu}-${s}`, s);
  }

  /* ── racks, devices, cabling ── */
  type RackSpec = { id: string; room: string; row?: string; name: string; pos?: number; x?: number; y?: number; rot?: number; w: number; d: number; u: number; kw: number; kg: number; kind: 'compute' | 'gpu' | 'network' | 'storage' | 'mmr'; pdu: string; aOnly?: boolean };
  const racks: RackSpec[] = [];
  const rowDef = (id: string, room: string, name: string, front: 'COLD' | 'HOT', o: Partial<Record<string, Cell>> = {}) =>
    S.Rows.push({ RowId: id, RoomId: room, Name: name, FrontAisle: front, Containment: 'COLD_AISLE', ...o });

  /* DH1 — exact coordinates (layout priority 1): rows A/B share a cold aisle, C/D another; row D is GPU */
  const dh1Y: Record<string, [number, number]> = { A: [3.0, 0], B: [5.4, 180], C: [7.6, 0], D: [10.0, 180] };
  for (const r of ['A', 'B', 'C', 'D']) {
    rowDef(`DH1-${r}`, 'B1-L1-DH1', r, 'COLD', { ZoneId: 'DH1-COOL' });
    const gpu = r === 'D';
    for (let p = 1; p <= 6; p++) {
      const w = gpu ? 800 : 600;
      racks.push({ id: `DH1-${r}${pad(p)}`, room: 'B1-L1-DH1', row: `DH1-${r}`, name: `${r}${pad(p)}`, pos: p,
        x: +(3 + (p - 0.5) * w / 1000).toFixed(2), y: dh1Y[r][0], rot: dh1Y[r][1], w, d: 1200, u: gpu ? 48 : 42, kw: gpu ? 45 : 12, kg: gpu ? 1600 : 1200, kind: gpu ? 'gpu' : 'compute', pdu: 'DH1' });
    }
  }
  /* DH2 — rows and positions only (priority 2) */
  for (const r of ['A', 'B', 'C', 'D']) {
    rowDef(`DH2-${r}`, 'B1-L1-DH2', r, 'COLD', { ZoneId: 'DH2-COOL' });
    for (let p = 1; p <= 8; p++) racks.push({ id: `DH2-${r}${pad(p)}`, room: 'B1-L1-DH2', row: `DH2-${r}`, name: `${r}${pad(p)}`, pos: p, w: 600, d: 1200, u: 42, kw: 10, kg: 1200, kind: 'compute', pdu: 'DH2' });
  }
  /* DH3 — nothing but the room (priority 3); single-fed (A only) on purpose */
  for (let p = 1; p <= 10; p++) racks.push({ id: `DH3-R${pad(p)}`, room: 'B1-L2-DH3', name: `R${pad(p)}`, w: 600, d: 1070, u: 45, kw: 10, kg: 1000, kind: 'compute', pdu: 'DH3', aOnly: true });
  /* network room — 800 mm network racks, 47U */
  for (const r of ['A', 'B']) {
    rowDef(`NET-${r}`, 'B2-L0-NET', r, 'COLD');
    for (let p = 1; p <= 4; p++) racks.push({ id: `NET-${r}${pad(p)}`, room: 'B2-L0-NET', row: `NET-${r}`, name: `N${r}${pad(p)}`, pos: p, w: 800, d: 1200, u: 47, kw: 8, kg: 1000, kind: 'network', pdu: 'NET' });
  }
  /* storage hall */
  for (const r of ['A', 'B']) {
    rowDef(`DH4-${r}`, 'B2-L1-DH4', r, 'COLD', { ZoneId: 'DH4-COOL' });
    for (let p = 1; p <= 6; p++) racks.push({ id: `DH4-${r}${pad(p)}`, room: 'B2-L1-DH4', row: `DH4-${r}`, name: `S${r}${pad(p)}`, pos: p, w: 600, d: 1100, u: 45, kw: 10, kg: 1300, kind: 'storage', pdu: 'DH4' });
  }
  /* meet-me room — two carrier racks */
  for (let p = 1; p <= 2; p++) racks.push({ id: `MMR-${pad(p)}`, room: 'B1-L0-MMR', name: `MMR${pad(p)}`, w: 600, d: 1000, u: 42, kw: 4, kg: 600, kind: 'mmr', pdu: 'MMR' });

  for (const rk of racks) {
    S.Racks.push({ RackId: rk.id, RoomId: rk.room, ...(rk.row ? { RowId: rk.row } : {}), Name: rk.name, ...(rk.pos ? { Position: rk.pos } : {}),
      ...(rk.x !== undefined ? { X: rk.x, Y: rk.y!, Rotation: rk.rot! } : {}), WidthMm: rk.w, DepthMm: rk.d, HeightU: rk.u, MaxKw: rk.kw, MaxKg: rk.kg, Status: 'ACTIVE' });
    for (const s of rk.aOnly ? ['A'] : ['A', 'B']) {
      const id = pe({ PowerId: `${rk.id}-RPDU-${s}`, Name: `${rk.name} rack PDU ${s}`, Type: 'RACK_PDU', RackId: rk.id, RoomId: rk.room, Side: s, RatingKw: rk.kind === 'gpu' ? 22 : 11, Voltage: 230 });
      feed(`PDU-${rk.pdu}-${s}`, id, s, { Circuit: `${rk.pdu}-${s}-${rk.name}`, BreakerA: rk.kind === 'gpu' ? 63 : 32 });
    }
  }

  /* network core in the network room: 2 spines, 2 border routers, 2 firewalls, patch panels per rack */
  const spine = ['SPINE-1', 'SPINE-2'];
  device({ DeviceId: 'SPINE-1', Name: 'blr1-spine-01', Type: 'SWITCH', RackId: 'NET-A01', UStart: 20, UHeight: 4, Vendor: 'Arista', Model: '7800R3-4', Serial: 'ARS0000101', MgmtIp: refs.discovered?.[0]?.ip ?? '10.20.0.11', Role: 'spine', PowerW: 3800, PsuCount: 4, WeightKg: 90 });
  device({ DeviceId: 'SPINE-2', Name: 'blr1-spine-02', Type: 'SWITCH', RackId: 'NET-B01', UStart: 20, UHeight: 4, Vendor: 'Arista', Model: '7800R3-4', Serial: 'ARS0000102', MgmtIp: '10.20.0.12', Role: 'spine', PowerW: 3800, PsuCount: 4, WeightKg: 90 });
  device({ DeviceId: 'BR-1', Name: 'blr1-border-01', Type: 'ROUTER', RackId: 'NET-A02', UStart: 30, UHeight: 3, Vendor: 'Juniper', Model: 'MX304', Serial: 'JNP0000201', MgmtIp: '10.20.0.21', Role: 'border', PowerW: 2200, PsuCount: 4, WeightKg: 40 });
  device({ DeviceId: 'BR-2', Name: 'blr1-border-02', Type: 'ROUTER', RackId: 'NET-B02', UStart: 30, UHeight: 3, Vendor: 'Juniper', Model: 'MX304', Serial: 'JNP0000202', MgmtIp: '10.20.0.22', Role: 'border', PowerW: 2200, PsuCount: 4, WeightKg: 40 });
  device({ DeviceId: 'FW-1', Name: 'blr1-fw-01', Type: 'FIREWALL', RackId: 'NET-A03', UStart: 20, UHeight: 2, Vendor: 'Palo Alto', Model: 'PA-5440', Serial: 'PAN0000301', MgmtIp: '10.20.0.31', Role: 'firewall', PowerW: 1300, PsuCount: 2, WeightKg: 30 });
  device({ DeviceId: 'FW-2', Name: 'blr1-fw-02', Type: 'FIREWALL', RackId: 'NET-B03', UStart: 20, UHeight: 2, Vendor: 'Palo Alto', Model: 'PA-5440', Serial: 'PAN0000302', MgmtIp: '10.20.0.32', Role: 'firewall', PowerW: 1300, PsuCount: 2, WeightKg: 30 });
  const spinePort = new Map<string, number>(spine.map(s => [s, 0]));
  const nextSpinePort = (s: string) => { const n = spinePort.get(s)! + 1; spinePort.set(s, n); return port(s, `Ethernet${n}/1`, 'FIBER', 100, 'QSFP28'); };
  /* border ↔ spine, firewall ↔ spine: redundant pairs */
  for (const [b, i] of [['BR-1', 1], ['BR-2', 2]] as const) for (const s of spine) {
    const a = port(b, `et-0/0/${spine.indexOf(s)}`, 'FIBER', 100, 'QSFP28'), z = nextSpinePort(s);
    conn(a, z, { Media: 'OS2', LengthM: 12, Role: 'UPLINK', RedundancyGroup: `BR-${i}-UPLINK` });
    S.Connections.push({ ConnectionId: `LLDP-${a}`, Kind: 'LOGICAL', APortId: a, BPortId: z, Role: 'PEER', Status: 'ACTIVE' });
  }
  for (const f of ['FW-1', 'FW-2']) for (const s of spine) conn(port(f, `ethernet1/${spine.indexOf(s) + 1}`, 'FIBER', 100, 'QSFP28'), nextSpinePort(s), { Media: 'OM4', LengthM: 8, Role: 'PEER', RedundancyGroup: `${f}-SPINE` });
  /* carrier hand-off in the MMR to the border routers via ODFs */
  for (const [i, mmr] of ['MMR-01', 'MMR-02'].entries()) {
    const odf = device({ DeviceId: `${mmr}-ODF`, Name: `${mmr.toLowerCase()}-odf`, Type: 'ODF', RackId: mmr, UStart: 40, UHeight: 2, FullDepth: 'N', Vendor: 'CommScope', Model: 'FACT 2U 48F', Role: 'carrier hand-off', PowerW: 0, WeightKg: 6 });
    const carrier = port(odf, 'F01', 'FIBER', 100, 'LC'), toRouter = port(odf, 'F02', 'FIBER', 100, 'LC');
    const br = i === 0 ? 'BR-1' : 'BR-2';
    conn(toRouter, port(br, 'et-0/0/9', 'FIBER', 100, 'QSFP28'), { Media: 'OS2', LengthM: 85, Role: 'UPLINK' });
    void carrier;
  }

  /* per-rack equipment */
  let srvSerial = 0, linked = 0;
  for (const rk of racks) {
    if (rk.kind === 'network' || rk.kind === 'mmr') {
      if (rk.kind === 'network') device({ DeviceId: `${rk.id}-PP`, Name: `${rk.id.toLowerCase()}-pp`, Type: 'PATCH_PANEL', RackId: rk.id, UStart: rk.u - 1, UHeight: 1, FullDepth: 'N', Vendor: 'Panduit', Model: 'FLEX 24-port MPO', Role: 'trunk panel', PowerW: 0, WeightKg: 3 });
      continue;
    }
    const pp = device({ DeviceId: `${rk.id}-PP`, Name: `${rk.id.toLowerCase()}-pp`, Type: 'PATCH_PANEL', RackId: rk.id, UStart: rk.u, UHeight: 1, FullDepth: 'N', Vendor: 'Panduit', Model: 'FLEX 24-port LC', Role: 'uplink panel', PowerW: 0, WeightKg: 3 });
    const tor = device({ DeviceId: `${rk.id}-TOR`, Name: `${rk.id.toLowerCase()}-tor`, Type: 'SWITCH', RackId: rk.id, UStart: rk.u - 1, UHeight: 1, FullDepth: 'N', Vendor: 'Arista', Model: rk.kind === 'gpu' ? '7060DX5-64S' : '7050SX3-48YC8', Serial: `JPE${pad(devSeq, 7)}`, MgmtIp: `10.21.${Math.floor(devSeq / 200)}.${devSeq % 200 + 10}`, Role: 'ToR', PowerW: rk.kind === 'gpu' ? 900 : 450, PsuCount: 2, WeightKg: 10 });
    /* uplinks: ToR → spine-1 direct; ToR → own panel → network-room panel → spine-2 (patched) */
    const up1 = port(tor, 'Ethernet49', 'FIBER', 100, 'QSFP28'), up2 = port(tor, 'Ethernet50', 'FIBER', 100, 'QSFP28');
    const s1 = nextSpinePort('SPINE-1');
    conn(up1, s1, { Media: 'OS2', LengthM: 60, Role: 'UPLINK', RedundancyGroup: `${rk.id}-UP` });
    const ppA = port(pp, 'P01', 'FIBER', 100, 'LC'), ppB = port(pp, 'P02', 'FIBER', 100, 'LC');
    conn(up2, ppA, { Media: 'OM4', LengthM: 1, Role: 'PATCH', RedundancyGroup: `${rk.id}-UP` });
    const netPanel = `NET-B0${(linked++ % 4) + 1}-PP`;
    const npIn = port(netPanel, `T${pad(linked, 3)}`, 'FIBER', 100, 'MPO'), npOut = port(netPanel, `F${pad(linked, 3)}`, 'FIBER', 100, 'LC');
    conn(ppB, npIn, { Media: 'OS2 trunk', LengthM: 70, Role: 'PATCH' });
    conn(npOut, nextSpinePort('SPINE-2'), { Media: 'OM4', LengthM: 3, Role: 'PATCH' });
    void ppB;
    S.Connections.push({ ConnectionId: `LLDP-${up1}`, Kind: 'LOGICAL', APortId: up1, BPortId: s1, Role: 'UPLINK', Status: 'ACTIVE' });
    /* hosts */
    const hosts = rk.kind === 'gpu' ? 4 : rk.kind === 'storage' ? 6 : 8;
    const hu = rk.kind === 'gpu' ? 8 : rk.kind === 'storage' ? 4 : 2;
    for (let h = 0; h < hosts; h++) {
      srvSerial++;
      const real = linked <= 2 && h === 0 && refs.inventory?.[linked - 1];
      const t = rk.kind === 'gpu' ? 'GPU_SERVER' : rk.kind === 'storage' ? 'STORAGE' : 'SERVER';
      const id = device({
        DeviceId: `${rk.id}-H${pad(h + 1)}`, Name: `${rk.id.toLowerCase()}-${t === 'STORAGE' ? 'stg' : t === 'GPU_SERVER' ? 'gpu' : 'srv'}${pad(h + 1)}`, Type: t,
        RackId: rk.id, UStart: 2 + h * hu, UHeight: hu,
        Vendor: t === 'GPU_SERVER' ? 'NVIDIA' : t === 'STORAGE' ? 'NetApp' : 'Dell',
        Model: t === 'GPU_SERVER' ? 'DGX H100' : t === 'STORAGE' ? 'AFF A400' : 'PowerEdge R760',
        Serial: real ? real.sn : `SN${pad(srvSerial, 7)}`, MgmtIp: real ? real.ip : `10.22.${Math.floor(srvSerial / 200)}.${srvSerial % 200 + 10}`,
        Role: t === 'STORAGE' ? 'storage' : t === 'GPU_SERVER' ? 'gpu-compute' : 'compute',
        PowerW: t === 'GPU_SERVER' ? 10200 : t === 'STORAGE' ? 1200 : 1100, PsuCount: t === 'GPU_SERVER' ? 6 : 2, WeightKg: t === 'GPU_SERVER' ? 130 : 30
      });
      const torPort = port(tor, `Ethernet${h + 1}`, 'ETHERNET', rk.kind === 'gpu' ? 400 : 25, rk.kind === 'gpu' ? 'OSFP' : 'SFP28');
      conn(port(id, 'eth0', 'ETHERNET', rk.kind === 'gpu' ? 400 : 25, rk.kind === 'gpu' ? 'OSFP' : 'SFP28'), torPort, { Media: 'DAC', LengthM: 2, Role: 'DOWNLINK' });
      port(id, 'eth1', 'ETHERNET', rk.kind === 'gpu' ? 400 : 25, rk.kind === 'gpu' ? 'OSFP' : 'SFP28');   /* left free on purpose */
      if (h === 0) port(id, 'idrac', 'MGMT', 1, 'RJ45');
    }
  }

  /* ── cooling ── */
  const crah = (room: string, n: number, kw: number, rows: string, zone?: string) => {
    for (let i = 1; i <= n; i++) S.CoolingEquipment.push({ CoolingId: `${room}-CRAH-${i}`, DataCenterId: DC, RoomId: room, Name: `CRAH ${room.split('-').pop()}-${i}`, Type: 'CRAH', CapacityKw: kw, ...(zone ? { ZoneId: zone } : {}), ServesRowIds: rows, RedundancyGroup: `${room} N+1`, Status: 'ACTIVE' });
  };
  crah('B1-L1-DH1', 4, 220, 'DH1-A;DH1-B;DH1-C;DH1-D', 'DH1-COOL');
  crah('B1-L1-DH2', 4, 160, 'DH2-A;DH2-B;DH2-C;DH2-D', 'DH2-COOL');
  crah('B1-L2-DH3', 2, 120, '');
  crah('B2-L1-DH4', 3, 100, 'DH4-A;DH4-B', 'DH4-COOL');
  for (const r of ['A', 'B']) S.CoolingEquipment.push({ CoolingId: `NET-IRC-${r}`, DataCenterId: DC, RoomId: 'B2-L0-NET', Name: `In-row cooler ${r}`, Type: 'IN_ROW', CapacityKw: 60, ServesRowIds: `NET-${r}`, Status: 'ACTIVE' });
  for (const c of [1, 2]) S.CoolingEquipment.push({ CoolingId: `CHILLER-${c}`, DataCenterId: DC, RoomId: 'B2-L0-MECH', Name: `Chiller ${c}`, Type: 'CHILLER', CapacityKw: 1400, RedundancyGroup: 'CHW N+1', Status: 'ACTIVE' });

  /* ── sensors: inlet + outlet at both ends of every row, room ambient, leak and smoke ── */
  for (const row of S.Rows) {
    const inRow = racks.filter(r => r.row === row.RowId);
    for (const rk of [inRow[0], inRow[inRow.length - 1]]) {
      sensor({ Name: `${rk.name} inlet`, Kind: 'TEMP_HUMIDITY', RoomId: rk.room, RowId: row.RowId, RackId: rk.id, Position: 'INLET', LowThreshold: 18, HighThreshold: 27 });
      sensor({ Name: `${rk.name} outlet`, Kind: 'TEMPERATURE', RoomId: rk.room, RowId: row.RowId, RackId: rk.id, Position: 'OUTLET', HighThreshold: 45 });
    }
  }
  for (const room of S.Rooms) {
    sensor({ Name: `${room.Name} ambient`, Kind: 'TEMP_HUMIDITY', RoomId: room.RoomId, Position: 'ROOM', LowThreshold: 18, HighThreshold: room.Type === 'ELECTRICAL' || room.Type === 'UPS' ? 30 : 27 });
    sensor({ Name: `${room.Name} smoke`, Kind: 'SMOKE', RoomId: room.RoomId, Position: 'CEILING' });
    if (room.Type === 'DATA_HALL' || room.Type === 'UPS' || room.Type === 'MECHANICAL') sensor({ Name: `${room.Name} leak`, Kind: 'LEAK', RoomId: room.RoomId, Position: 'UNDERFLOOR' });
  }
  for (const rk of racks.filter(r => r.kind === 'compute' && !r.row)) sensor({ Name: `${rk.name} inlet`, Kind: 'TEMPERATURE', RoomId: rk.room, RackId: rk.id, Position: 'INLET', LowThreshold: 18, HighThreshold: 27 });

  /* ── monitoring references (no credentials) ── */
  let mon = 0;
  const map = (entityId: string, system: string, externalId: string, metric: string, poll: number) =>
    S.MonitoringMappings.push({ MappingId: `MON-${pad(++mon, 4)}`, EntityId: entityId, System: system, ExternalId: externalId, Metric: metric, PollSeconds: poll });
  for (const s of ['A', 'B']) for (const u of [1, 2]) map(`UPS-${s}${u}`, 'EPMS', `EPMS/BLR1/UPS-${s}${u}/kW`, 'output_kw', 30);
  for (const g of [1, 2, 3]) map(`GEN-${g}`, 'BMS', `BMS/BLR1/GEN${g}/FuelLevel`, 'fuel_pct', 300);
  map('SPINE-1', 'SNMP', 'sysName.0=blr1-spine-01', 'ifOperStatus', 60);
  map('SPINE-2', 'SNMP', 'sysName.0=blr1-spine-02', 'ifOperStatus', 60);
  for (const c of S.CoolingEquipment.slice(0, 4)) map(c.CoolingId as string, 'BMS', `BMS/BLR1/${c.CoolingId}/SupplyTemp`, 'supply_c', 60);

  void portSeq;
  return S;
}

/** total rows in a sample, by sheet */
export const sampleCounts = (s: SheetRows) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.length]));
