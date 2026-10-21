/* ── DCIM store: per-client persistence ───────────────────────────────────
   This app has no backend, so imported client inventory lives in browser
   storage, isolated from the seeded Inventory/Discovery datasets (which it
   never writes to). Each client is its own key, so one client's data can
   never be read through another client's id:

     dcim.v1.index           { clients, batches }
     dcim.v1.client.<id>     ClientData

   Storage is injectable (tests use an in-memory map). A write that fails —
   quota exceeded, storage blocked — throws, and the previous state stays. */
import { emptyEntities, type Client, type ClientData, type ImportBatch, type DiscoveryLink, type DataCenter } from './model';
import { applyStaged, type StagedImport } from './reconcile';
import { dcScope } from './derive';

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const PREFIX = 'dcim.v1.';
const INDEX = PREFIX + 'index';
const clientKey = (id: string) => `${PREFIX}client.${id}`;

interface Index { clients: Client[]; batches: ImportBatch[] }

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } };
}
function browserKV(): KV {
  try {
    const t = '__dcim_probe__';
    window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memoryKV();
  }
}

export class DcimStore {
  private kv: KV;
  private listeners = new Set<() => void>();
  private cache = new Map<string, ClientData>();
  private version = 0;
  /** true when browser storage was unavailable and data lasts only for this tab */
  readonly volatile: boolean;

  constructor(kv?: KV) {
    if (kv) { this.kv = kv; this.volatile = false; }
    else if (typeof window !== 'undefined') { this.kv = browserKV(); this.volatile = this.kv !== window.localStorage; }
    else { this.kv = memoryKV(); this.volatile = true; }
  }

  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  getVersion() { return this.version; }
  private changed() { this.version++; this.listeners.forEach(f => f()); }

  private index(): Index {
    try {
      const raw = this.kv.getItem(INDEX);
      const v = raw ? JSON.parse(raw) as Index : null;
      return { clients: v?.clients ?? [], batches: v?.batches ?? [] };
    } catch { return { clients: [], batches: [] }; }
  }
  private writeIndex(ix: Index) { this.kv.setItem(INDEX, JSON.stringify(ix)); }

  clients(): Client[] { return [...this.index().clients].sort((a, b) => a.name.localeCompare(b.name)); }
  client(id: string): Client | undefined { return this.index().clients.find(c => c.id === id); }
  batches(clientId?: string): ImportBatch[] {
    return this.index().batches.filter(b => !clientId || b.clientId === clientId).sort((a, b) => b.at - a.at);
  }

  /** create or rename a client; ids are case-sensitive and never reused for another client */
  upsertClient(c: Client): Client {
    const id = c.id.trim(), name = c.name.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) throw new Error('Client ID must be 1–64 letters, digits, dot, dash or underscore.');
    if (!name) throw new Error('Client name is required.');
    const ix = this.index();
    const next = { ...ix.clients.find(x => x.id === id), ...c, id, name };
    ix.clients = [...ix.clients.filter(x => x.id !== id), next];
    this.writeIndex(ix);
    this.changed();
    return next;
  }

  deleteClient(id: string) {
    const ix = this.index();
    ix.clients = ix.clients.filter(c => c.id !== id);
    ix.batches = ix.batches.filter(b => b.clientId !== id);
    this.writeIndex(ix);
    this.kv.removeItem(clientKey(id));
    this.cache.delete(id);
    this.changed();
  }

  updateDataCenter(clientId: string, dc: DataCenter) {
    const d = this.data(clientId);
    if (!d) throw new Error(`Unknown client ${clientId}`);
    d.entities.dataCenters = d.entities.dataCenters.map(x => x.id === dc.id ? { ...x, ...dc } : x);
    this.writeData(d);
    this.changed();
  }

  deleteDataCenter(clientId: string, dcId: string) {
    const d = this.data(clientId);
    if (!d) throw new Error(`Unknown client ${clientId}`);
    const scope = dcScope(d.entities, dcId);
    if (!scope) {
      d.entities.dataCenters = d.entities.dataCenters.filter(x => x.id !== dcId);
    } else {
      const bIds = new Set(scope.buildings.map(b => b.id));
      const fIds = new Set(scope.floors.map(f => f.id));
      const rIds = new Set(scope.rooms.map(r => r.id));
      const rowIds = new Set(scope.rows.map(r => r.id));
      const rkIds = new Set(scope.racks.map(r => r.id));
      const devIds = new Set(scope.devices.map(dev => dev.id));
      const pIds = new Set(scope.ports.map(p => p.id));
      const connIds = new Set(scope.connections.map(c => c.id));
      const pwrIds = new Set(scope.power.map(p => p.id));
      const clIds = new Set(scope.cooling.map(c => c.id));
      const sIds = new Set(scope.sensors.map(s => s.id));

      d.entities.dataCenters = d.entities.dataCenters.filter(x => x.id !== dcId);
      d.entities.buildings = d.entities.buildings.filter(x => !bIds.has(x.id));
      d.entities.floors = d.entities.floors.filter(x => !fIds.has(x.id));
      d.entities.rooms = d.entities.rooms.filter(x => !rIds.has(x.id));
      d.entities.rows = d.entities.rows.filter(x => !rowIds.has(x.id));
      d.entities.racks = d.entities.racks.filter(x => !rkIds.has(x.id));
      d.entities.devices = d.entities.devices.filter(x => !devIds.has(x.id));
      d.entities.ports = d.entities.ports.filter(x => !pIds.has(x.id));
      d.entities.connections = d.entities.connections.filter(x => !connIds.has(x.id));
      d.entities.powerEquipment = d.entities.powerEquipment.filter(x => !pwrIds.has(x.id));
      d.entities.coolingEquipment = d.entities.coolingEquipment.filter(x => !clIds.has(x.id));
      d.entities.sensors = d.entities.sensors.filter(x => !sIds.has(x.id));
    }
    this.writeData(d);
    this.changed();
  }

  data(clientId: string): ClientData | undefined {
    if (this.cache.has(clientId)) return this.cache.get(clientId);
    try {
      const raw = this.kv.getItem(clientKey(clientId));
      if (!raw) return undefined;
      const d = JSON.parse(raw) as ClientData;
      d.entities = { ...emptyEntities(), ...d.entities };
      this.cache.set(clientId, d);
      return d;
    } catch { return undefined; }
  }

  private writeData(d: ClientData) {
    this.kv.setItem(clientKey(d.clientId), JSON.stringify(d));
    this.cache.set(d.clientId, d);
  }

  /** commit a validated staged import. Client data is written first, the index second:
      a failure on either leaves the previous inventory readable. */
  commit(s: StagedImport, now = Date.now()): ImportBatch {
    const ix = this.index();
    if (!ix.clients.some(c => c.id === s.clientId)) throw new Error(`Unknown client ${s.clientId}; create it first.`);
    const existing = this.data(s.clientId);
    const batchId = `IMP-${now.toString(36).toUpperCase()}`;
    const { data, batch } = applyStaged(s, existing, batchId, now);
    const fromSheet = s.staged.clients[0];
    this.writeData(data);
    if (fromSheet) ix.clients = ix.clients.map(c => c.id === s.clientId ? { ...c, ...fromSheet } : c);
    ix.batches = [...ix.batches, batch];
    this.writeIndex(ix);
    this.changed();
    return batch;
  }

  link(clientId: string, l: DiscoveryLink) {
    const d = this.data(clientId);
    if (!d) return;
    if (!d.entities.devices.some(x => x.id === l.deviceId)) throw new Error(`Device ${l.deviceId} is not in client ${clientId}.`);
    const links = [...d.links.filter(x => !(x.deviceId === l.deviceId && x.target === l.target)), l];
    this.writeData({ ...d, links });
    this.changed();
  }
  unlink(clientId: string, deviceId: string, target: DiscoveryLink['target']) {
    const d = this.data(clientId);
    if (!d) return;
    this.writeData({ ...d, links: d.links.filter(x => !(x.deviceId === deviceId && x.target === target)) });
    this.changed();
  }
}
