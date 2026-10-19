# Domain model: exact shapes

## `NeRow` (`src/data/physical.ts`)

```ts
type NeClass = 'router'|'switch'|'server'|'dwdm'|'enodeb'|'gnodeb';
type StockState = 'planned'|'instore'|'deployed'|'faulty'|'decomm';
type ActiveStock = Exclude<StockState, 'decomm'>;
type Source = 'd'|'p'|'m'|'e';        // Discovered/Planned/Manual/EMS — static provenance tag
type RecState = 'ok'|'drift'|'stale'|'miss'|'none';  // static reconciliation-state tag

interface NeRow {
  st: RecState; name: string; ip: string; model: string; os: string; sn: string;
  oem: string; loc: string; s: Source; stock: StockState; v: number | null;
}
```
`PHY_SEEDS` are hand-written rows per class; the exported `PHY` array is
`grow()`-expanded from those seeds via a seeded LCG so per-class/per-stock
counts match `PHY_MATRIX` (`ledger.ts`) exactly — self-checked at import.
`v` is a per-row number (age/verification-like; `null` when not applicable,
e.g. `planned` stock). Derived-not-stored helpers (call these, don't
duplicate the logic): `portsOf(cls, i)`, `complianceOf(model)`,
`eosOf(model)` → `EosBand = 'past'|'soon'|'safe'|'unknown'`,
`regionOf(loc)`, `sysDescrOf(row)` (builds a format-correct fake SNMP
sysDescr banner per OEM).

**`s`/`st` are baked into the seed data by hand** — they are provenance/
reconciliation-state *labels*, not computed from any live Discovery feed.
Don't write code that expects `st` to update when a Discovery scan runs.

## `Location` (`src/data/locations.ts`)

```ts
interface Location {
  id: string; name: string; type: string; cat: string; st: string;
  city: string; state: string; addr: string; ne: number; disc: number;
  lat: number; lon: number;
}
```
10 hand-written rows in `LOCATIONS`. `locationOf(id) = LOCATIONS.find(l =>
l.id === id) ?? LOCATIONS[0]` — **silent fallback**, not an existence check.
File comment: "totals come from the ledger" (i.e. `ne`/`disc` should track
`ledger.ts`, not be treated as independently authoritative).

## Facility / cabling ledger (`src/data/facility.ts`)

```ts
interface Feed { id; kind: 'AC'|'DC'; source; rating; ratingKw; loadKw; status: 'Normal'|'High'|'Alarm' }
interface Backup { kind; unit; rating; autonomy; lastTest; status: 'Normal'|'Degraded'|'Failed' }
interface Rack { id; floor; room; role; u; used; kw; ports; portsUsed }
interface PortClass { n; total; used }
interface Equipment { id; name; kind: 'DWDM'|'OADM'|'Router'|'Switch'; rack; ports: { in: string[]; out: string[] } }
interface Cable {
  id; core: number; from: { site, port };
  to?: { eq, port }; onward?: { port, core }; through?: number;
  strand; kind: 'Fibre'|'Copper'; state: 'Active'|'Planned'|'Faulty';
}
interface Facility { siteId; power; floors; racks; portClasses; equipment; cables }

const CORES = 24;
```
One hand-written record for `BGLK-277`; every other site is
deterministically `derive()`d from its `Location.ne` count —
`facilityOf(siteId, ne)` returns the literal `BGLK` record or calls
`derive()`. Self-checked at import (`checkCables()` + power/rack sum
asserts): every cable has exactly one of `to`/`through` set (never both,
never neither), no core/port is reused, and feed/rack sums reconcile against
the site's summary numbers. **A fix that only updates the `BGLK-277` literal
will not apply to any `derive()`d site** — test against both.

## Cable-view payload (`src/data/cableView.ts`)

```ts
interface Port { /* per-port shape consumed by public/cable-view */ }
interface Conn { id; isDeleted: false; sourceEquipment; sourcePort; targetEquipment; targetPort; strand: { color }; status }
interface EqRow { id; name; code; type; status; noInPorts; noOutPorts; ports: Port[]; equipmentConnectivities: Conn[] }
interface SiteInfo { id; name; code; address; type; technology; totalCores; equipments: EqRow[] }

function siteInfoFor(l: Location, f: Facility): SiteInfo
```
Synthesizes two tray-equipment rows (`<siteId>-IN-FDMS`, `<siteId>-OUT-FDMS`)
plus the facility's real `equipment`, walking `Facility.cables` to build
`equipmentConnectivities`. Only used by `SiteEquipment.tsx` in the non-live
path (no `?token=` in the URL); the live path fetches from
`qa.visionwaves.com` instead and ignores this file entirely.

## `ArchiveRow` (`src/data/archive.ts`)

```ts
type InactiveTab = NeClass | 'l2vpn' | 'l3vpn';
interface ArchiveRow { name; ip; model; sn; oem; loc; why; on; by; wo; zombie: boolean }
```
Seeded per `InactiveTab`, expanded via the same LCG idiom (`expand()`) to
match `PHY_MATRIX[cls].decomm` (or a fixed 18 rows for `l2vpn`/`l3vpn`, which
have no `PHY_MATRIX` entry since they aren't `NeClass` values). `zombie:
true` = "decommissioned yet still answering discovery" — a hand-set seed
flag, not computed from a live scan.

## Ledger (`src/data/ledger.ts`) — the single source of truth for counts

```ts
const IL = { locations, central, regional, edge, ne, discovered, links, services, vnf, inactive, reports };
const EST = { ports: {total,used,free}, compliance: {compliant,behind,unknown}, eol: {past,within12}, spares: {instore,rma,intransit} };
type NeClass = 'router'|'switch'|'server'|'dwdm'|'enodeb'|'gnodeb';
type StockState = 'planned'|'instore'|'deployed'|'faulty'|'decomm';
// PHY_MATRIX: NeClass → { [StockState]: count } cross-tab
```
File's own header comment: *"Every count on every screen comes from here.
Sample rows are samples; nothing derives a total from an array length."*
This is the rule for the whole Inventory domain — if a screen needs a new
total/count, add it to `ledger.ts` and have the screen read it, don't
`.length` a sample array and call it a total.

## `domainDevices.ts` — NOT part of this domain's data model

Belongs to Discovery & Reconciliation (see that Skill's `domain-model.md`).
Listed here only as a boundary reminder: `DomainDevice` shares no field or
key with `NeRow` — never conflate the two when a task mentions "devices."

## Data Center Estate Entities (`src/data/dc/`)

When `?solution=Datacenter` is active (`isDatacenter() === true`):

```ts
type DcGeo = 'in' | 'us';
type DcRole = 'Router' | 'Switch' | 'Server' | 'Firewall' | 'Storage' | 'GPU';

interface DcFacility {
  id: string; locationId: string; name: string; status: 'on-air' | 'in-progress' | 'planned' | 'failed';
  category: 'Central' | 'Regional' | 'Edge'; geo: DcGeo; currency: 'INR' | 'USD';
  city: string; state: string; address: string; lat: number; lng: number; tier: 'Tier II' | 'Tier III' | 'Tier IV';
  racks: DcRack[]; power: DcPower; cooling: DcCooling; compute: DcCompute;
}

interface DcDevice {
  id: string; dcId: string; name: string; role: DcRole; layer: 'core' | 'spine' | 'leaf' | 'access';
  vendor: string; model: string; os: string; serial: string; ip: string; mac: string;
  rackId: string; u: number; lifecycle: 'Ready' | 'Planned' | 'Maintenance' | 'Decommissioning';
  discovery: 'verified' | 'drifted' | 'not-discovered';
}

interface DcLink {
  id: string; p: 'LLDP' | 'OSPF' | 'ISIS' | 'BGP' | 'LSP';
  a: string; ai: string; z: string; zi: string; dc: string; cap: number; role: string; st: string; util: number;
}

interface DcService {
  id: string; type: string; cust: string; dc: string; ne: string; ifc: string;
  bw: number; status: string; sla: number; uptime: number; rev: number; crit: boolean;
}
```

### Key Invariants for Data Center Mode:
- **No Radio Assets**: Data centers contain NO cellular radio cells (`gNodeB`, `eNodeB`, `RAN`) and NO optical transponders (`DWDM`). Role is strictly one of: `Router`, `Switch`, `Server`, `Firewall`, `Storage`, `GPU`.
- **48 Data Centers Across Two Geographies**:
  - `us` (24 DCs, 3,840 racks, USD currency)
  - `in` (24 DCs, 3,838 racks, INR currency)
  - Total = 7,678 devices (4,412 GPU servers, 1,358 switches, 1,104 compute servers, 612 storage arrays, 96 routers, 96 firewalls).
  - 25,057 topology links (23,878 LLDP, 900 BGP EVPN, 187 LSP tunnels, 92 OSPF/ISIS).
  - 1,456 provisioned customer cloud services (765 GPU instances, 317 CPU instances, 272 storage volumes, 102 reserved AI clusters).
- Counts single source of truth: `src/data/dc/manifest.json` (`DC_COUNTS`) and `src/data/dc/summary.json` (`DC_SUM`).
