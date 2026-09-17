# Architecture detail: the legacy bridge (Inventory side)

This mechanism is shared with Discovery & Reconciliation — see that Skill's
own `architecture.md` for the full `bundle-legacy.mjs` patch list and the
`LegacyView.tsx` navigation cycle. This file covers only what's specific to
Inventory.

## Registry entries

`src/routes.ts`'s `SCREENS` array, `module: 'Inventory'` rows:

```
home, location, site, capex, opex, node          → legacy: true
sitedetails, siteequipment                        → component (React)
physical                                          → component (React)
resource                                          → legacy: true
virtual, vnflifecycle, vnfdetails,
  cell4gdetails, cell5gdetails                    → legacy: true
passive, odf, rack, power, splice, cord, duct,
  fiber                                           → legacy: true
links                                             → legacy: true
services                                          → legacy: true
inactive                                          → component (React)
reports                                           → legacy: true
```

This matches README.md's "Status of the port" table exactly — check both
sources agree before assuming a screen's ownership; the table is maintained
by hand and could drift from `routes.ts` as ports land.

## Per-screen id globals `__legacyParams()` depends on

`bundle-legacy.mjs`'s injected `__legacyParams(k)` helper (used by the
post-render `sync()` call) maps each legacy view key to the global(s) that
screen's id/name lives in:

```
site      → { id: SITE_ID }
capex     → { id: CAPEX_ID }
opex      → { id: OPEX_ID }
resource  → { name: RES_ID }
node      → { name: NODE_ID }
vnfdetails → { name: VNF_DETAIL_ID }
cell4gdetails → { cell: CELL_4G_NAME }
cell5gdetails → { cell: CELL_5G_NAME }
sitedetails / siteequipment → { id: SITE_ID }
odf/rack/power/splice/cord/duct/fiber → { id: <ODF_ID|RACK_ID|...> }
```

These names appear as a literal object inside the bundler's injected code —
renaming one of these globals in `legacy/*.js` without also updating
`bundle-legacy.mjs`'s `__legacyParams()` body will silently break deep-linking
for that screen (the URL just won't carry the id) rather than throwing a
build error, since this particular block isn't itself a `patch()` match
target — it's appended fresh. Grep for the global's name across both
`legacy/*.js` and `scripts/bundle-legacy.mjs` before renaming.

## `window.__nsLegacy` surface used by Inventory's React screens

`SiteDetails.tsx`/`SiteEquipment.tsx` call `window.__nsLegacy.siteHead(id)`
to render the same site header the legacy `viewSite()` draws, and
`window.__nsLegacy.setSection(s)` (one-shot) to tell the legacy Site screen
which section tab to land on when the reader navigates back into it (e.g.
from a React tab into the legacy "Network elements" tab). `resolveSite(ref)`
maps any location tag (including sample city codes) to the real roster row —
used when a deep link needs to resolve a location reference into a concrete
site id.

## Shared UI components (reuse, don't reinvent)

Same components as the Discovery & Reconciliation Skill documents:
`DataGrid` (`src/components/grid/DataGrid.tsx`), `Drawer`
(`src/components/Drawer.tsx`), `Chip`/`Card`/`StatStrip`/`TabBar`
(`src/components/ui.tsx`). `PhysicalResources.tsx` is the fullest example of
a class-tabbed, stock-filtered, row-actioned `DataGrid` in the app — copy its
shape for any new Inventory list screen rather than inventing a new grid
pattern.
