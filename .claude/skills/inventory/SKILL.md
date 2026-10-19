---
name: inventory
description: Work on the Inventory module of the NetSingularity OSS app — Location/Site details, Physical/Virtual/Passive Resources, Links, Services, Inactive inventory, Reports, and the Fiberneo cable-view (site equipment) integration. Use for any change touching src/screens/{PhysicalResources,InactiveInventory,SiteDetails,SiteEquipment,SiteTabs}.tsx, src/data/{physical,locations,facility,cableView,ledger,archive}.ts, sites.json, or legacy/{app-res,app-node,app-node2,app-opex,app-period,res-data,geo-data}.js. Covers the NeRow/Location/Facility/ArchiveRow entity shapes, why there is no live stock-state transition code, and the fact that domainDevices.ts (Discovery) is a separate dataset from physical.ts (Inventory) — they are not the same records.
---

# Purpose

Inventory is the system-of-record half of this OSS app: physical/virtual/
passive network resources, the sites that host them, the facility/cabling
ledger backing the Fiberneo cable view, and the archive of decommissioned
equipment. Like Discovery & Reconciliation, **there is no backend** —
`src/data/*.ts` are static, seeded, self-checking sample datasets, not a
database.

# When to Use

Any task touching Location, Site details (Facility/Site equipment tabs),
Physical/Virtual/Passive Resources, Links, Services, Inactive inventory, or
Reports — including grid columns/filters, row actions, the cable-view iframe
payload, stock-state display, or the archive/decommission flow.

# Domain Overview

| Path | Screen | Owner |
|---|---|---|
| `/inventory`, `/inventory/location`, `/inventory/location/site/:id`, `.../capex`, `.../opex`, `/inventory/node/:name` | Home, Location, Site (NE/Capex/Opex tabs), Node view | legacy |
| `/inventory/location/site/:id/details` | Site details · Facility tab | React `SiteDetails.tsx` |
| `/inventory/location/site/:id/equipment` | Site details · Site equipment tab | React `SiteEquipment.tsx` (frames `public/cable-view/`) |
| `/inventory/physical` | Physical Resources | React `PhysicalResources.tsx` |
| `/inventory/resource/:name` | Resource element view | legacy |
| `/inventory/virtual`, `.../lifecycle`, `.../details`, `.../cell-{4g,5g}-details` | Virtual Resources | legacy |
| `/inventory/passive`, `.../{odf,rack,power,splice,cord,duct,fiber}/:id` | Passive Infrastructure | legacy |
| `/inventory/links` | Links | legacy |
| `/inventory/services` | Services | legacy |
| `/inventory/inactive` | Inactive inventory | React `InactiveInventory.tsx` |
| `/inventory/reports` | Reports | legacy |

Only four screens are React today (Physical Resources, Inactive inventory,
Site details' Facility tab, Site equipment tab) — everything else renders
through the legacy bridge (`src/legacy/LegacyView.tsx` + `public/legacy.js`).
Check `src/routes.ts` before assuming a screen is one or the other; porting
status changes as work continues.

# Architecture

`src/routes.ts`'s `SCREENS` registry and the legacy bridge mechanism
(`window.__nsLegacy`/`window.__nsBridge`, built by `scripts/bundle-legacy.mjs`)
are shared infrastructure with Discovery & Reconciliation — see
`[[references/architecture.md]]` for the exact patch list. The
Inventory-specific patched functions to check before editing:
`go()`, the shell-element lookups, and the sidebar/rail-highlight patches —
all generic, not Inventory-specific. No Inventory legacy function (`viewRes`,
`viewNode`, `res-data.js` contents, `app-opex.js`'s draft editor) is itself
targeted by a literal-string patch, so those are safe to restructure
internally as long as their exported names/globals that `__legacyParams()`
reads (`RES_ID`, `NODE_ID`, `CAPEX_ID`, `OPEX_ID`, `SITE_ID`, and the various
detail-id globals) keep their names.

Reuse `DataGrid`/`Drawer`/`Chip`/`Card`/`StatStrip` (`src/components/`) for
any new Inventory list/detail UI — `PhysicalResources.tsx` and
`InactiveInventory.tsx` are the two React precedents to copy the pattern from.

# Inventory Model

Full field shapes in `[[references/domain-model.md]]`. Headline facts:

- **`NeRow`** (`src/data/physical.ts`) — the physical-resource record, one
  array per `NeClass` (`router|switch|server|dwdm|enodeb|gnodeb`), each with
  a `stock: StockState` (`planned|instore|deployed|faulty|decomm`). `PHY`
  (the exported, UI-facing array) is generated from hand-written seeds via a
  seeded LCG so per-class/per-stock counts match `ledger.ts`'s `PHY_MATRIX`
  exactly — checked at import time.
- **`Location`** (`src/data/locations.ts`) — site roster, 10 hand-written
  rows; `locationOf(id)` **silently falls back to `LOCATIONS[0]`** if the id
  isn't found — don't rely on this as an existence check.
- **`Facility`** (`src/data/facility.ts`) — power feeds, backup, racks, port
  classes, equipment, and a 24-core (`CORES = 24`) cabling ledger. One
  hand-written record (`BGLK-277`); every other site's facility is
  deterministically `derive()`d from its `Location.ne` count. Self-checked
  at import (`checkCables` + power/rack sum asserts — throws on a broken
  invariant: every cable has exactly one of `to`/`through`, no reused
  core/port, sums reconcile).
- **`SiteInfo`** (`src/data/cableView.ts`) — the payload shape the Fiberneo
  iframe (`public/cable-view/`) expects; `siteInfoFor(location, facility)`
  builds it, including two synthetic tray-equipment rows
  (`<siteId>-IN-FDMS`/`-OUT-FDMS`). Only used when `SiteEquipment.tsx` has no
  `?token=` (the "live Fiberneo" path fetches from `qa.visionwaves.com`
  instead and ignores this file).
- **`ArchiveRow`** (`src/data/archive.ts`) — the Inactive inventory record,
  seeded per `InactiveTab` (`NeClass | 'l2vpn' | 'l3vpn'`) via the same LCG
  idiom, matching `PHY_MATRIX[cls].decomm` counts. `zombie: true` marks a
  decommissioned record still answering discovery scans — a static seed
  attribute here, not a live computation.

# Identity

Identity is **not uniform** across entities — check which key a screen's
`DataGrid` uses before assuming it generalizes:

| Entity | Identity field | Used as `rowKey` in |
|---|---|---|
| `NeRow` | `name` | `PhysicalResources.tsx` |
| `ArchiveRow` | `sn` | `InactiveInventory.tsx` |
| `Location` | `id` (site code, e.g. `BGLK-277`) | `locationOf(id)` lookup |
| `Facility` | `siteId` (matches `Location.id`) | `facilityOf(siteId, ne)` |

No cross-entity uniqueness is enforced beyond the ledger self-checks (counts
must foot at import); there is no schema/id-format validation anywhere in
this domain.

# State Management — no real lifecycle transition code

`StockState = 'planned'|'instore'|'deployed'|'faulty'|'decomm'`. **No code
path moves a record between stock states.** Filtering by stock only changes
which static rows a grid shows (`phyRows(cls, states)` driven by the `stock`
URL param). The Physical Resources "decommission" stock-preset button
*navigates* to `/inventory/inactive?cls=<cls>` — a separately-seeded dataset
— it does not mutate `PHY`/`PHY_MATRIX` or move a row anywhere.
`InactiveInventory.tsx`'s own comment is explicit: *"Refresh has no server
round-trip to make in this build (no backend)... 'reload' means re-deriving
rows from the archive's current in-memory state."*

**If a task asks for a "decommission this device" or "change stock state"
action that actually persists**: this is new functionality, not a bug fix —
there is no existing service/mutation layer to hook into. Say so explicitly
and confirm scope before building a bespoke one; don't silently wire a fake
mutation that looks real but resets on reload without disclosing that.

# Source of Truth / Discovery↔Inventory boundary

`src/data/domainDevices.ts` (used by Discovery's `DomainDevices.tsx`) is a
**wholly separate, independently-seeded dataset** from `physical.ts`'s
`PHY` — it shares no field, no key, and no generation source. Its own header
comment says it "mirrors the roster-building already done in `./discovery.ts`"
— i.e., it exists purely to back an Insights drill-down, not as a view over
real inventory. **Nothing in this codebase writes from a Discovery/
Reconciliation screen into `physical.ts`'s records**, and nothing reads
`physical.ts` to build Discovery's device rosters. The only "bridge" fields
that exist are static, hand-seeded markers baked into `physical.ts`'s rows
(`s: Source` = `'d'|'p'|'m'|'e'` for Discovered/Planned/Manual/EMS; `st:
RecState` = `'ok'|'drift'|'stale'|'miss'|'none'`) — decorative provenance
tags, not a live sync mechanism.

**Do not implement a feature that assumes editing a Discovery-domain device
updates the matching Inventory `NeRow`, or vice versa**, unless the task
explicitly asks you to build that sync (which does not exist today and would
be a new, cross-cutting feature, not a wiring fix).

# Read vs Write Operations

- **All four React Inventory screens are read-only.** "Refresh" bumps a
  `refreshKey` state to re-derive rows from the same static array — `DataGrid`
  itself documents this as "no real latency behind it in this prototype."
- **The only genuine in-memory write path in Inventory is the legacy
  Capex/Opex line-item editor** (`legacy/app-opex.js` + click delegation in
  `legacy/app-router.js`): `data-oxadd`/`data-oxdel` push/splice a draft's
  `items[]`, `data-oxsave` writes the draft back into the module-level
  `OPEX[OPEX_ID]` object. This is a real array mutation but process-memory
  only — nothing persists across reload (no localStorage here, unlike
  `rules.ts` in the other Skill). Capex has the identical pattern.
- No write path exists for `physical.ts`, `archive.ts`, `locations.ts`, or
  `facility.ts` — treat them as frozen sample data plus derived/self-checked
  computed views, not something a "save" action writes to.

# Testing

Validation commands are shared with Discovery & Reconciliation:
`npm run typecheck`, `npm run build`, `npm run legacy:bundle` (after any
`legacy/*.js` edit), `npm run test` (Playwright e2e against a production
build on :4173). Exact coverage map in `[[references/testing.md]]`.
Headline: Physical Resources and the Site details/equipment flow have solid,
specific assertions (row menu contents, ledger-derived tab counts, the
decommission→archive drill, facility KPIs, the cable-view iframe URL);
Virtual/Passive/Links/Services/Reports have smoke-only coverage (render + no
console errors) — verify any deeper change to those by hand.

| Change type | Recommended check |
|---|---|
| `physical.ts`/`ledger.ts`/`archive.ts` data | typecheck + build; the self-check IIFEs will throw at import if a count invariant breaks — treat that throw as a real bug, not noise |
| `PhysicalResources.tsx`/`InactiveInventory.tsx` UI | `npm run test` — this is the one area with real e2e coverage; also manually check the row-menu-item-count assumption noted in Common Pitfalls |
| `facility.ts`/`cableView.ts` | manually open Site equipment for at least one derived site (not just `BGLK-277`) and confirm the iframe renders |
| Legacy Inventory screens (`app-res.js`, `app-node*.js`, `app-opex.js`) | `npm run legacy:bundle` then manual click-through — most of this area is smoke-tested only |

# MUST Rules

- MUST keep the Telecom Network Estate and Data Center Estate strictly isolated:
  - **Telecom Estate (Default)**: `router`, `switch`, `server`, `dwdm`, `enodeb`, `gnodeb`. Handled by `src/data/{physical,ledger,locations,facility}.ts`.
  - **Data Center Estate (`?solution=Datacenter`)**: `router`, `switch`, `server`, `firewall`, `storage`, `gpu`. Handled by `src/data/dc/` (`manifest.json`, `summary.json`, `datacenters.json`, `devices.json`, `gpu.json`, `links.json`, `services.json`).
- MUST NOT display cellular radio equipment (`gNodeB`, `eNodeB`, `RAN`, `Macro`, `Rooftop`, `Small Cell`, `Cell towers`) or optical transport (`DWDM`) in Data Center mode. Data centers have 0 radio assets.
- MUST use `withSolution(url)` on all internal navigation links within the Inventory module to ensure `solution=Datacenter` and `geo` query parameters are preserved.
- MUST treat `solution=Datacenter` (solution architecture domain) and `geo` (country filter: `us` vs `in` across the 48 data centers) as distinct dimensions:
  - `solution` selects the domain (Datacenter vs Telecom).
  - `geo` selects the regional data center cluster (24 in US, 24 in India).
  - Telecom mode has no country filter (it is single-country national telecom in India).
- MUST persist Datacenter mode using dual storage (`localStorage` + `sessionStorage` via `solution.ts`); mode MUST NOT clear when internal routes omit query parameters or when navigating between views. Only explicit `?solution=all` clears Datacenter mode.
- MUST evaluate Datacenter scope dynamically via `(isDatacenter() || SCOPED)` or helper functions (`isScoped()`, `isDcMode()`, `getRoster()`, `getGeographicHierarchy()`, `getLocStats()`); NEVER freeze scope at module evaluation time with static booleans.
- MUST resolve DC facility codes (e.g., `NJ-DC-012`, `VA-DC-001`) to their corresponding city (`us-new-jersey-secaucus`) in `findCityByFacilityCode` so breadcrumbs and back buttons never fail or fall back to Indian sites.
- MUST use `us-new-jersey-secaucus` (not Indian `delhi-central` or `Mumbai`) as the default fallback in `CityDetails.tsx` when `isDatacenter()` is true.
- MUST use authentic Data Center link tiers on `/inventory/links` in Datacenter mode: `InfiniBand` (400G AI GPU compute fabric), `Ethernet Fabric` (100G/400G Spine-Leaf Clos ISL), `BGP / EVPN` (L3 underlay & overlay routing), `Compute & Storage` (100G RoCE & host access), and `Management (OOB)` (1G/10G IPMI/BMC telemetry).
- MUST treat `domainDevices.ts` and `physical.ts` as separate datasets — never write code that looks up a `DomainDevice` and expects to find a matching `NeRow`, or that "fixes" a discrepancy by editing `physical.ts`.
- MUST use each entity's actual identity field (`name` for `NeRow`, `id` for `DcDevice`, `sn` for `ArchiveRow`, `id` for `Location`/`DcFacility`, `siteId` for `Facility`).
- MUST preserve the self-check invariants in `physical.ts`/`facility.ts`/`archive.ts` and `src/data/dc/` count invariants.
- MUST grep `scripts/bundle-legacy.mjs` before renaming any legacy global read by `__legacyParams()` (`RES_ID`, `NODE_ID`, `CAPEX_ID`, `OPEX_ID`, `SITE_ID`, etc.).

# MUST NOT Rules

- MUST NOT leak cellular radio tabs (`eNodeB`, `gNodeB`) into `PhysicalResources.tsx` when `scoped` (`isDatacenter()`) is active (`DC_TABS` must only contain `router, switch, server, firewall, storage, gpu`).
- MUST NOT render cellular site summary cards (Macro/Rooftop/Small cell) in `CityDetails.tsx` when in Data Center mode; render Data Centers, Racks & Capacity, and Managed Hardware (Fleet) instead.
- MUST NOT display telecom WAN protocols (`OSPF`, `ISIS`, `LSP`) in Data Center mode on `/inventory/links`; data centers do not run telecom carrier LSPs or ISIS transport backbones.
- MUST NOT purge storage mode when a URL merely omits `?solution=Datacenter`; only exit Datacenter mode when explicitly navigating with `?solution=all`.
- MUST NOT export or rely on a static `export const SCOPED = isDatacenter()` evaluated only once at bundle load time; always evaluate dynamically so late-initialized or storage-persisted Datacenter state works correctly.
- MUST NOT render telecom radio vendors (`Ericsson, Nokia, Ciena, Huawei`) on EOL/EOS cards in Data Center mode; use authentic data center compute/fabric vendors (`Nvidia, Dell, Supermicro, Arista, Cisco, Others`).
- MUST NOT implement a "decommission"/"change stock state" action that silently mutates `PHY`/`PHY_MATRIX` in place.
- MUST NOT assume Inventory writes persist across reload.
- MUST NOT treat `locationOf(id)`'s fallback-to-`LOCATIONS[0]` as proof a site id exists.
- MUST NOT invent a real backend/API call for Inventory reads or writes.

# SHOULD Rules

- SHOULD reuse `DataGrid`/`Drawer`/`Chip`/`Card`/`StatStrip` for any new Inventory list/detail UI rather than hand-rolling markup.
- SHOULD verify a `facility.ts`/`cableView.ts` change against a *derived* site (not just the one hand-written `BGLK-277` record).
- SHOULD check `tests/e2e.mjs`'s row-menu-count assertion against the actual current `rowActions` code before trusting it.

# Common Pitfalls

- **Confusing `solution=Datacenter` with the Country filter (`geo=us` vs `geo=in`)** — `solution` is the domain (Datacenter vs Telecom); `geo` is the regional cluster within Datacenter mode. Neocloud has 24 data centers in the US and 24 in India.
- **Accidental fallback to Telecom estate** — If an internal link fails to use `withSolution()`, previously `solution.ts` cleared storage and dropped the user into the Indian telecom network. Now dual storage (`localStorage` + `sessionStorage`) preserves mode until `solution=all` is explicitly passed.
- **Static module boolean freezing** — If `SCOPED` is evaluated once on module load before query params are synced, a static boolean stays `false` permanently. Always use dynamic getter functions like `isDcMode = () => isDatacenter() || SCOPED`.
- **Missing DC facility codes in hierarchy lookups** — If `findCityByFacilityCode` only checks telecom regex (`DEL-DC-01`), lookups for `NJ-DC-012` fail and breadcrumbs drop back to Indian defaults. Always match DC records in `DC_SUM`.
- **Displaying radio tabs in Physical Resources** — `DC_TABS` previously included `enodeb` and `gnodeb`, which showed 0 records because data centers have no radio cells. Always ensure `DC_TABS` is restricted to `['router', 'switch', 'server', 'firewall', 'storage', 'gpu']`.
- **Assuming a "device" in a Discovery screen and a "resource" in Inventory are the same record** — they usually aren't.
- **Assuming a stock-state UI action does something** — every stock-related button today either filters or navigates to a different static dataset; none mutate.

# Decision Rules

- **Changing Data Center records or counts** → `src/data/dc/` (`manifest.json`, `summary.json`, `devices.json`, `gpu.json`, `links.json`, `services.json`).
- **Changing what a Physical Resources row shows in Telecom mode** → `src/data/physical.ts` (`NeRow`, `PHY_SEEDS`, `ledger.ts`).
- **Changing what a Physical Resources row shows in Datacenter mode** → `src/screens/PhysicalResources.tsx` (`dcRow`, `DC_ROLE_BY_TAB`).
- **Changing counts shown anywhere (tabs, KPIs, ledger totals) in Telecom mode** → `ledger.ts`'s `IL`/`EST`/`PHY_MATRIX`.
- **Changing counts in Datacenter mode** → `src/data/dc/manifest.json` (`DC_COUNTS`) and `src/data/dc/summary.json` (`DC_SUM`).

# Data Center Operational Metrics ("Needs action now")

In Data Center mode, the 5 action cards must never be hardcoded to 0 or left blank with disclaimer notes:
1. **Decommission & disposal pipeline**: Reflects rolling server and rack retirement lifecycle (`marked` for decom, `live` ghost presence answering BMC out-of-band discovery, and `confirmed` removed for e-waste salvage).
2. **EOL / EOS exposure**: Tracks hardware approaching vendor end-of-support across the 6 DC vendors (`Nvidia, Dell, Supermicro, Arista, Cisco, Others`) across leaf buckets (`Active, Passive, Logical, Virtual`).
3. **OS / firmware drift**: Tracks active nodes differing from golden firmware baselines, including high-priority CVE counts (e.g., Nvidia GPU driver or Dell iDRAC advisories).
4. **Spares coverage risk**: Evaluates CRU/FRU depot spares against the ≥ 2.0% safe threshold across heavily deployed DC models (`Quantum-2 QM9700`, `PowerEdge XE8545`, `SYS-821GE-TNHR`, `DGX A100`).
5. **Not reconfirmed (Staleness)**: Groups telemetry timeouts across DCIM collectors, hypervisor VM agents, out-of-band BMC/IPMI controllers, and smart rack PDU polling.

# References

- `[[references/architecture.md]]` — the legacy bridge mechanics, dual estates, and globals.
- `[[references/domain-model.md]]` — entity shapes for Telecom (`NeRow`, `Location`, `Facility`, `ArchiveRow`) and Data Center (`DcFacility`, `DcDevice`, `DcRole`, `DcLink`, `DcService`).
- `[[references/testing.md]]` — exact `tests/e2e.mjs` coverage by screen and validation commands.
