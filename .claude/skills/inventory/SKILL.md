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

- MUST treat `domainDevices.ts` and `physical.ts` as separate datasets —
  never write code that looks up a `DomainDevice` and expects to find a
  matching `NeRow`, or that "fixes" a discrepancy by editing `physical.ts`.
- MUST use each entity's actual identity field (`name` for `NeRow`, `sn` for
  `ArchiveRow`, `id` for `Location`, `siteId` for `Facility`) — don't assume
  one key generalizes across entities.
- MUST preserve the self-check invariants in `physical.ts`/`facility.ts`/
  `archive.ts` (count sums, cable port/core uniqueness) when adding or
  editing seed rows — these throw at import, which will break the whole app,
  not just the screen you're changing.
- MUST grep `scripts/bundle-legacy.mjs` before renaming any legacy global
  read by `__legacyParams()` (`RES_ID`, `NODE_ID`, `CAPEX_ID`, `OPEX_ID`,
  `SITE_ID`, etc.) — those names are relied on by the bridge even though no
  Inventory-specific function body is itself patched.

# MUST NOT Rules

- MUST NOT implement a "decommission"/"change stock state" action that
  silently mutates `PHY`/`PHY_MATRIX` in place — no such write path exists
  today; adding one is new scope requiring explicit confirmation, not a
  wiring fix.
- MUST NOT assume Inventory writes persist across reload — even the one real
  mutation path (Capex/Opex drafts) is process-memory only; don't add
  `localStorage` persistence to Inventory data without being asked (that
  would be new, inconsistent with the rest of this domain, which has none).
- MUST NOT treat `locationOf(id)`'s fallback-to-`LOCATIONS[0]` as proof a
  site id exists — it swallows misses silently.
- MUST NOT invent a real backend/API call for Inventory reads or writes —
  matches the same "no backend" constraint as Discovery & Reconciliation.

# SHOULD Rules

- SHOULD reuse `DataGrid`/`Drawer`/`Chip`/`Card`/`StatStrip` for any new
  Inventory list/detail UI rather than hand-rolling markup — `PhysicalResources.tsx`
  is the reference implementation for a filtered, tabbed, row-actioned grid.
- SHOULD verify a `facility.ts`/`cableView.ts` change against a *derived*
  site (not just the one hand-written `BGLK-277` record) since most sites
  exercise the `derive()` path, not the literal one.
- SHOULD check `tests/e2e.mjs`'s row-menu-count assertion against the actual
  current `rowActions` code before trusting it (see Common Pitfalls) — it
  may be stale relative to what `PhysicalResources.tsx` can currently render.

# Common Pitfalls

- **Assuming a "device" in a Discovery screen and a "resource" in Inventory
  are the same record** — they usually aren't (see Source of Truth section).
- **Assuming a stock-state UI action does something** — every stock-related
  button today either filters, or navigates to a different static dataset;
  none of them mutate.
- **Reusing `rowKey` across entities** — `name` works for `NeRow` but is not
  the identity field for `ArchiveRow` (`sn`) or `Location` (`id`).
- **`tests/e2e.mjs` asserts `.kmenu .kmenu-i` count === 5** for the Physical
  Resources row menu at a point in the flow where the current `rowActions`
  code (Node view / View details / Site info, 0 for gNodeB) doesn't obviously
  produce 5 items — treat a failure on this specific assertion as worth
  double-checking against the live DOM before assuming your change broke it.
- **`facility.ts`'s hand-written `BGLK-277` vs. `derive()`d sites** — a fix
  that only accounts for the one literal record will silently not apply to
  every other site.

# Decision Rules

- **Changing what a Physical Resources row shows** → `src/data/physical.ts`
  (`NeRow`, `PHY_SEEDS`, the per-row derived helpers `portsOf`/`complianceOf`/
  `eosOf`/`sysDescrOf`) — keep `PHY_MATRIX` (`ledger.ts`) in sync or the
  self-check throws.
- **Changing counts shown anywhere (tabs, KPIs, ledger totals)** → `ledger.ts`'s
  `IL`/`EST`/`PHY_MATRIX` are the single source every other file derives
  from — per the file's own header comment, "nothing derives a total from an
  array length." Edit the ledger, not a screen's local count.
- **Changing the cable-view payload** → `facility.ts` (the underlying
  ledger) for real changes to what exists; `cableView.ts`'s `siteInfoFor()`
  only reshapes it for Fiberneo — don't duplicate ledger data into the
  reshaping function.
- **Adding a genuine write/mutation feature to Inventory** → there is no
  existing service layer to extend (see Read vs Write Operations); scope it
  as new work, decide together whether it needs to persist across reload,
  and don't retrofit it into a component that currently only reads.
- **A change that seems to require touching both `physical.ts` and
  `domainDevices.ts`** → stop and confirm scope; today they're intentionally
  decoupled, and unifying them is a larger architectural change than most
  single tasks intend.

# References

- `[[references/architecture.md]]` — the legacy bridge mechanics shared with
  Discovery & Reconciliation, and the Inventory-specific globals
  `__legacyParams()` depends on.
- `[[references/domain-model.md]]` — every entity's exact field shape
  (`NeRow`, `Location`, `Facility`/cabling ledger types, `SiteInfo`,
  `ArchiveRow`), plus the ledger/ self-check invariants.
- `[[references/testing.md]]` — exact `tests/e2e.mjs` coverage by screen and
  validation commands.
