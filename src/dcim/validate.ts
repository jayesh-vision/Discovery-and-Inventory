/* ── Validation of a staged import against the client's merged inventory ──
   Runs on the MERGED view (existing records overlaid with the staged ones)
   so a staged rack may reference a room that is already in the store, and
   a staged device is checked for U overlap against devices already mounted.
   Errors block the import; warnings are shown and accepted on confirm. */
import type { Device, Entities, EntityKey, Rack } from './model';
import { SHEETS, sheetByEntity } from './schema';
import type { Issue, Severity } from './parse';

export interface Located { sheet: string; row: number }

export function indexIds(e: Entities): Record<EntityKey, Map<string, unknown>> {
  const out = {} as Record<EntityKey, Map<string, unknown>>;
  for (const k of Object.keys(e) as EntityKey[]) out[k] = new Map((e[k] as { id: string }[]).map(r => [r.id, r]));
  return out;
}

/** occupied (face, U) cells of a mounted device */
export function occupiedUnits(d: Pick<Device, 'uStart' | 'uHeight' | 'face' | 'fullDepth'>): string[] {
  if (!d.uStart || d.uHeight <= 0) return [];
  const faces = d.fullDepth ? ['FRONT', 'REAR'] : [d.face];
  const out: string[] = [];
  for (let u = d.uStart; u < d.uStart + d.uHeight; u++) for (const f of faces) out.push(`${f}:${u}`);
  return out;
}

/** U-placement problems inside one rack: out of range and overlaps (pure, reused by the rack view) */
export function rackPlacementProblems(rack: Rack, devices: Device[]): { deviceId: string; code: 'u-range' | 'u-overlap'; other?: string; message: string }[] {
  const out: { deviceId: string; code: 'u-range' | 'u-overlap'; other?: string; message: string }[] = [];
  const owner = new Map<string, string>();
  const sorted = [...devices].sort((a, b) => (a.uStart ?? 0) - (b.uStart ?? 0) || a.id.localeCompare(b.id));
  for (const d of sorted) {
    if (!d.uStart) continue;
    const top = d.uStart + Math.max(d.uHeight, 1) - 1;
    if (top > rack.heightU) {
      out.push({ deviceId: d.id, code: 'u-range', message: `${d.name} occupies U${d.uStart}–U${top}, above ${rack.name}'s ${rack.heightU}U.` });
      continue;
    }
    for (const cell of occupiedUnits(d)) {
      const o = owner.get(cell);
      if (o && o !== d.id) {
        out.push({ deviceId: d.id, code: 'u-overlap', other: o, message: `${d.name} overlaps ${o} at U${cell.split(':')[1]} (${cell.split(':')[0].toLowerCase()}) in ${rack.name}.` });
        break;
      }
      owner.set(cell, d.id);
    }
  }
  return out;
}

export function validate(merged: Entities, opts: {
  clientId: string;
  /** ids written by this import, per entity — only their issues and issues they cause are reported */
  staged: Record<EntityKey, Set<string>>;
  origin: Map<string, Located>;
}): Issue[] {
  const issues: Issue[] = [];
  const idx = indexIds(merged);
  const { staged, origin } = opts;
  const isStaged = (k: EntityKey, id: string) => staged[k]?.has(id) ?? false;
  const at = (k: EntityKey, id: string): Located => origin.get(`${k}:${id}`) ?? { sheet: sheetByEntity(k).sheet, row: 0 };
  const push = (severity: Severity, code: string, k: EntityKey, id: string, message: string, col?: string) => {
    const l = at(k, id);
    issues.push({ severity, code, sheet: l.sheet, row: l.row, col, id, message: l.row ? message : `${message} (existing record)` });
  };

  /* 1 · references */
  for (const def of SHEETS) {
    for (const rec of merged[def.entity] as unknown as Record<string, unknown>[]) {
      const id = rec.id as string;
      if (!isStaged(def.entity, id)) continue;
      for (const f of def.fields) {
        if (f.type !== 'ref' && f.type !== 'list') continue;
        const targets = Array.isArray(f.ref) ? f.ref : [f.ref!];
        const vals = f.type === 'list' ? (rec[f.key] as string[] | undefined) ?? [] : rec[f.key] ? [rec[f.key] as string] : [];
        for (const v of vals) {
          const hits = targets.filter(t => idx[t].has(v));
          if (!hits.length) push('error', 'missing-ref', def.entity, id, `${f.col} "${v}" does not exist in ${targets.map(t => sheetByEntity(t).sheet).join(' or ')}.`, f.col);
          else if (hits.length > 1) push('warning', 'ambiguous-ref', def.entity, id, `${f.col} "${v}" matches a record in ${hits.map(t => sheetByEntity(t).sheet).join(' and ')}; the first is used.`, f.col);
        }
      }
    }
  }

  /* 2 · client ownership */
  for (const dc of merged.dataCenters) {
    if (isStaged('dataCenters', dc.id) && dc.clientId && dc.clientId !== opts.clientId) {
      push('error', 'client-mismatch', 'dataCenters', dc.id, `ClientId ${dc.clientId} differs from the client being imported (${opts.clientId}). One import writes one client's inventory.`, 'ClientId');
    }
  }

  /* 3 · hierarchy consistency */
  const rooms = idx.rooms, rows = idx.rows, racks = idx.racks;
  const floors = idx.floors, buildings = idx.buildings;
  for (const rk of merged.racks) {
    if (!isStaged('racks', rk.id) || !rk.rowId) continue;
    const row = rows.get(rk.rowId) as { roomId: string; name: string } | undefined;
    if (row && row.roomId !== rk.roomId) push('error', 'row-room-mismatch', 'racks', rk.id, `Rack is in room ${rk.roomId} but row ${rk.rowId} is in room ${row.roomId}.`, 'RowId');
  }
  const slot = new Map<string, string>();
  for (const rk of merged.racks) {
    if (!rk.rowId || !rk.position) continue;
    const k = `${rk.rowId}#${rk.position}`;
    const o = slot.get(k);
    if (o && (isStaged('racks', rk.id) || isStaged('racks', o))) push('error', 'row-position-taken', 'racks', rk.id, `Position ${rk.position} in row ${rk.rowId} is already taken by ${o}.`, 'Position');
    else slot.set(k, rk.id);
  }
  for (const s of merged.sensors) {
    if (!isStaged('sensors', s.id)) continue;
    const rk = s.rackId ? racks.get(s.rackId) as Rack | undefined : undefined;
    if (rk && rk.roomId !== s.roomId) push('warning', 'sensor-room-mismatch', 'sensors', s.id, `Sensor is in room ${s.roomId} but rack ${rk.id} is in room ${rk.roomId}.`, 'RackId');
  }
  const levels = new Map<string, string>();
  for (const f of merged.floors) {
    const k = `${f.buildingId}#${f.level}`;
    if (levels.has(k) && isStaged('floors', f.id)) push('warning', 'duplicate-level', 'floors', f.id, `Level ${f.level} is used by ${levels.get(k)} too.`, 'Level');
    levels.set(k, f.id);
  }

  /* 4 · devices: placement, U range and overlap */
  const byRack = new Map<string, Device[]>();
  for (const d of merged.devices) {
    if (d.rackId) { const l = byRack.get(d.rackId) ?? []; l.push(d); byRack.set(d.rackId, l); }
    if (!isStaged('devices', d.id)) continue;
    if (!d.rackId && !d.roomId) push('warning', 'unplaced', 'devices', d.id, `${d.name} has neither RackId nor RoomId; it is listed as unplaced.`);
    if (d.uStart && !d.rackId) push('error', 'u-without-rack', 'devices', d.id, `UStart is set but RackId is empty.`, 'UStart');
    if (d.rackId && !d.uStart && d.uHeight > 0) push('warning', 'no-u', 'devices', d.id, `${d.name} is in rack ${d.rackId} without UStart; shown beside the elevation as unplaced.`, 'UStart');
  }
  for (const [rackId, devs] of byRack) {
    const rk = racks.get(rackId) as Rack | undefined;
    if (!rk) continue;
    for (const p of rackPlacementProblems(rk, devs)) {
      if (!isStaged('devices', p.deviceId) && !(p.other && isStaged('devices', p.other)) && !isStaged('racks', rackId)) continue;
      push('error', p.code, 'devices', p.deviceId, p.message, 'UStart');
    }
    const kw = devs.reduce((a, d) => a + (d.powerW ?? 0), 0) / 1000;
    if (rk.maxKw && kw > rk.maxKw && (isStaged('racks', rackId) || devs.some(d => isStaged('devices', d.id))))
      push('warning', 'over-budget', 'racks', rackId, `Nameplate power of mounted devices is ${kw.toFixed(1)} kW, above the ${rk.maxKw} kW budget.`, 'MaxKw');
    const kg = devs.reduce((a, d) => a + (d.weightKg ?? 0), 0);
    if (rk.maxKg && kg > rk.maxKg && isStaged('racks', rackId)) push('warning', 'over-weight', 'racks', rackId, `Mounted devices weigh ${kg} kg, above the ${rk.maxKg} kg rating.`, 'MaxKg');
  }

  /* 5 · dimensions and bounds */
  for (const r of merged.rooms) {
    if (!isStaged('rooms', r.id)) continue;
    const f = floors.get(r.floorId) as { lengthM?: number; widthM?: number } | undefined;
    if (f?.lengthM && f.widthM && r.x !== undefined && r.y !== undefined && r.lengthM && r.widthM &&
      (r.x < -0.01 || r.y < -0.01 || r.x + r.lengthM > f.lengthM + 0.01 || r.y + r.widthM > f.widthM + 0.01))
      push('warning', 'outside-parent', 'rooms', r.id, `Room extends beyond its floor plate (${f.lengthM} × ${f.widthM} m).`, 'X');
    if ((r.x === undefined) !== (r.y === undefined)) push('warning', 'half-coordinate', 'rooms', r.id, 'Give both X and Y, or neither.', 'X');
  }
  for (const f of merged.floors) {
    if (!isStaged('floors', f.id)) continue;
    const b = buildings.get(f.buildingId) as { lengthM?: number; widthM?: number } | undefined;
    if (b?.lengthM && f.lengthM && f.lengthM > b.lengthM + 0.01) push('warning', 'outside-parent', 'floors', f.id, `Floor length ${f.lengthM} m exceeds the building's ${b.lengthM} m.`, 'LengthM');
    if (b?.widthM && f.widthM && f.widthM > b.widthM + 0.01) push('warning', 'outside-parent', 'floors', f.id, `Floor width ${f.widthM} m exceeds the building's ${b.widthM} m.`, 'WidthM');
  }
  const placedByRoom = new Map<string, Rack[]>();
  for (const rk of merged.racks) {
    if (rk.x === undefined || rk.y === undefined) continue;
    const l = placedByRoom.get(rk.roomId) ?? []; l.push(rk); placedByRoom.set(rk.roomId, l);
    if (!isStaged('racks', rk.id)) continue;
    const room = rooms.get(rk.roomId) as { lengthM?: number; widthM?: number } | undefined;
    if (room?.lengthM && room.widthM && (rk.x < 0 || rk.y < 0 || rk.x > room.lengthM || rk.y > room.widthM))
      push('warning', 'outside-parent', 'racks', rk.id, `Rack centre (${rk.x}, ${rk.y}) lies outside its room (${room.lengthM} × ${room.widthM} m).`, 'X');
  }
  for (const list of placedByRoom.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!isStaged('racks', a.id) && !isStaged('racks', b.id)) continue;
      const ext = (r: Rack) => {
        const rot = ((r.rotation ?? 0) % 180 + 180) % 180;
        const w = r.widthMm / 1000, d = r.depthMm / 1000;
        return rot === 90 ? [d, w] : [w, d];
      };
      const [aw, ad] = ext(a), [bw, bd] = ext(b);
      if (Math.abs(a.x! - b.x!) < (aw + bw) / 2 - 0.005 && Math.abs(a.y! - b.y!) < (ad + bd) / 2 - 0.005)
        push('warning', 'rack-overlap', 'racks', isStaged('racks', b.id) ? b.id : a.id, `Racks ${a.id} and ${b.id} overlap on the floor.`, 'X');
    }
  }

  /* 6 · connectivity */
  const ports = idx.ports;
  const used = new Map<string, string>();
  for (const c of merged.connections) {
    const st = isStaged('connections', c.id);
    if (c.aPortId === c.bPortId) { if (st) push('error', 'self-connection', 'connections', c.id, 'A and B are the same port.', 'BPortId'); continue; }
    if (c.kind !== 'PHYSICAL' || c.status === 'DECOMMISSIONED') continue;
    for (const p of [c.aPortId, c.bPortId]) {
      const o = used.get(p);
      if (o && (st || isStaged('connections', o))) push('error', 'port-reused', 'connections', c.id, `Port ${p} already carries cable ${o}; a port takes one cable.`, p === c.aPortId ? 'APortId' : 'BPortId');
      else used.set(p, c.id);
    }
    if (!st) continue;
    const a = ports.get(c.aPortId) as { speedGbps?: number; deviceId: string } | undefined;
    const b = ports.get(c.bPortId) as { speedGbps?: number; deviceId: string } | undefined;
    if (a?.speedGbps && b?.speedGbps && a.speedGbps !== b.speedGbps) push('warning', 'speed-mismatch', 'connections', c.id, `Port speeds differ (${a.speedGbps} vs ${b.speedGbps} Gb/s).`);
    if (a && b && a.deviceId === b.deviceId) push('warning', 'same-device', 'connections', c.id, 'Both ends are on the same device.');
  }

  /* 7 · power */
  const pe = idx.powerEquipment;
  const next = new Map<string, string[]>();
  for (const pc of merged.powerConnections) {
    if (pc.fromId === pc.toId) { if (isStaged('powerConnections', pc.id)) push('error', 'self-feed', 'powerConnections', pc.id, 'Equipment cannot feed itself.', 'ToId'); continue; }
    if (pe.has(pc.toId)) { const l = next.get(pc.fromId) ?? []; l.push(pc.toId); next.set(pc.fromId, l); }
  }
  const state = new Map<string, 1 | 2>();
  const cyc = new Set<string>();
  const dfs = (n: string, path: string[]) => {
    state.set(n, 1);
    for (const m of next.get(n) ?? []) {
      if (state.get(m) === 1) path.concat(n).slice(path.concat(n).indexOf(m)).forEach(x => cyc.add(x));
      else if (!state.get(m)) dfs(m, path.concat(n));
    }
    state.set(n, 2);
  };
  for (const n of next.keys()) if (!state.get(n)) dfs(n, []);
  for (const pc of merged.powerConnections) {
    if (isStaged('powerConnections', pc.id) && cyc.has(pc.fromId) && cyc.has(pc.toId)) push('error', 'power-loop', 'powerConnections', pc.id, `Power path loops back on itself through ${pc.fromId} → ${pc.toId}.`);
  }
  for (const pc of merged.powerConnections) {
    if (!isStaged('powerConnections', pc.id)) continue;
    const src = pe.get(pc.fromId) as { side: string; type: string } | undefined;
    if (src && src.side !== 'N' && pc.side !== 'N' && src.side !== pc.side) push('warning', 'side-mismatch', 'powerConnections', pc.id, `Feed side ${pc.side} differs from ${pc.fromId}'s side ${src.side}.`, 'Side');
  }

  /* 8 · monitoring mappings carry references only */
  const SECRET = /(pass(word)?|secret|token|community|apikey|api_key|private[_-]?key)\s*[=:]/i;
  for (const m of merged.monitoringMappings) {
    if (isStaged('monitoringMappings', m.id) && (SECRET.test(m.externalId) || SECRET.test(m.metric ?? '')))
      push('error', 'credential', 'monitoringMappings', m.id, 'Looks like a credential. Store a vault reference, never the secret itself.', 'ExternalId');
  }

  return issues;
}
