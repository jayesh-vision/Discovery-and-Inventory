# Architecture detail: the legacy bridge

## Routing registry

`src/routes.ts` exports `SCREENS: Screen[]`, one entry per URL:

```ts
interface Screen {
  key: string;        // the prototype's view key; stable across the port
  path: string;
  module: 'Discovery and reconciliation' | 'Inventory';
  crumb: string;       // breadcrumb text, ' · '-joined segments
  rail?: string;        // which sidebar item lights up, when not `key`
  component?: ComponentType;   // set → React-owned
  legacy?: boolean;             // set → rendered through LegacyView
}
```

`screenByKey(k)`, `isReactOwned(k)`, and `legacyPath(key, drill?, params?)`
(builds a URL with merged params + `drill=`/`from=` query params for
cross-section-jump navigation) are the only exported helpers — use
`legacyPath()` rather than hand-building a query string when navigating to a
legacy screen with a drill context.

Discovery & Reconciliation's current `SCREENS` entries:

| key | path | owner |
|---|---|---|
| insights | /discovery/insights | React `Insights.tsx` |
| insightsdevices, regiondevices, discovereddevices, domaindevices, discrepancydetails | /discovery/insights/... | React drill-down screens |
| jobs | /discovery/jobs | legacy `viewJobs()` |
| targets | /discovery/targets | legacy `viewTargets()` |
| target | /discovery/targets/:host | legacy `viewTarget()` |
| reconcile | /discovery/reconcile | React `Reconcile.tsx` |
| reconcilejobs / reconcileresults / reconcileexceptions | /discovery/reconcile/{jobs,results,exceptions} | React |
| rules / rulenew / ruleedit / ruledetails | /discovery/reconcile/rules/... | React |

## The bridge, end to end

`src/legacy/LegacyView.tsx` is the one component that renders every
`legacy: true` screen. On mount it lazy-loads `public/legacy.js` (cache-busted
with `?t=${Date.now()}`), then wires two objects onto `window`:

- **`window.__nsBridge`** (React → legacy direction it exposes to the
  prototype): `owns(k)` = `isReactOwned(k)`; `navigate(k, drill, params)`
  builds the target path via `legacyPath()` and calls React Router's `nav()`;
  `sync(k, params, drill)` is called by the patched legacy code after every
  in-place re-render so the URL follows whatever the prototype just drew
  (a tab click, a drill, a row action) — the visible breadcrumb is React's
  Topbar reading the URL, not anything the legacy code prints.
- **`window.__nsLegacy`** (the prototype's own surface, appended by
  `bundle-legacy.mjs`): `go(k)`, `drillTo`, `applyDrillQuery`, `VIEWS`,
  `current()`, `siteHead`, `setSection`, `resolveSite`, `setDrill(d)`,
  `setParams(k, p)`, `setCollapsed`.

`LegacyView`'s effect reads the current URL's query string, splits out
`drill`/`from`/`back` (consumed by the breadcrumb-origin mechanism), calls
`L.setParams(legacyKey, combinedParams)` then `L.applyDrillQuery(legacyKey, q)`
then `L.setDrill(...)` then `L.go(legacyKey)` — in that order, every time the
URL changes. This is also the pattern to follow if you need to script legacy
navigation for testing: `page.evaluate(() => window.__nsLegacy.drillTo(view,
label, q))` bypasses click-target flakiness and exercises the real function.

## `bundle-legacy.mjs` patch list (exhaustive, as of this audit)

Build order: `geo-data.js, app-helpers.js, app-data.js, app-period.js,
app-grid.js, res-data.js, app-views.js, app-res.js, app-opex.js, app-node.js,
app-node2.js, app-router.js`. Each `patch(from, to, label)` call does an exact
string or regex `find → replace` against the concatenated source and
**throws `'legacy patch failed: ' + label`** if `from` isn't found — this is
the mechanism, not a suggestion; a build failure here means a targeted string
moved or was reworded.

1. `viewEl/crumbEl/modEl` const declaration → lazy `_el(id)` lookups (React
   mounts `#view` after the prototype's module first runs).
2. `function go(k) { const v = VIEWS[k] || VIEWS.insights;` → injects a
   bridge hand-off branch before the original body, for React-owned `k`.
3. `const appEl = document.querySelector('.app');` → tolerate a missing node.
4. Sidebar-toggle/`setCollapsed` click listeners → stripped (React owns
   collapse); `setCollapsed` itself gets a null-guard on its DOM lookup.
5. The `.side-item` rail-highlight `forEach` block → stripped entirely
   (`void active;` — React's sidebar owns the active-item highlight).
6. `viewTargets()`'s exact quick-filter template (the `pageBar(...)` +
   `data-tgt-filter` segmented control + inline `Run now` button) → replaced
   with a plain `drillBar()` + `gridBar(...)` call with no quick filter and no
   inline button — the current UI intentionally has no top-of-grid quick
   filter or "Run now" button on Scan Targets; it lives in the row/kebab menu.
7. `if (/re-?run|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;`
   → widened to also match `run now` (icon-inference regex used elsewhere).
8. The post-render hook (end of the function that calls `lazyGrids()` /
   `layoutStockChips()`) → appended with a call to
   `window.__nsBridge.sync(CURRENT, __legacyParams(CURRENT), ...)` and a new
   `__legacyParams(k)` helper mapping each legacy view key to its id/name
   param (`SITE_ID`, `TARGET_ID`, `RES_ID`, etc.).
9. `\ngo('insights');\s*$` (the prototype's own boot call) → removed; React
   mounts and calls `go()` itself.

**Practical rule**: before touching `go`, `viewEl`/`crumbEl`/`modEl`, `appEl`,
`setCollapsed`, `CURRENT`/`DRILL`/`DRILL_PENDING`, any of the per-screen id
globals (`SITE_ID`, `TARGET_ID`, `CAPEX_ID`, `OPEX_ID`, `RES_ID`, `NODE_ID`,
...), or `viewTargets()`'s toolbar template, `grep scripts/bundle-legacy.mjs`
for the literal text first. Everything else in `legacy/*.js` (row rendering,
column definitions, filter logic, `viewTarget()`'s transcript building) is
unpatched and safe to restructure freely, as long as the resulting file still
contains whatever the patches above search for.

## Shared UI components (reuse, don't reinvent)

- `DataGrid<Row>` (`src/components/grid/DataGrid.tsx`) — the only list
  component in this domain's React screens. Props of note: `rowKey`,
  `rowActions`/`gridActions` (both `Action[]` = `{l, onClick?, danger?,
  primary?}`), `filters: FilterField[]`, `onRowClick` (falls back to the
  first `rowActions` entry's destination if omitted), `resetKey` (controls
  when pagination resets — not tied to `rows` identity alone, since Refresh
  re-derives `rows` without resetting the reader's page/search/filter state).
- `Drawer` (`src/components/Drawer.tsx`) — right-edge slide-in detail panel;
  the `DomainDevices.tsx` list→drawer flow and `ReconciliationExceptions.tsx`
  are the two precedents to copy.
- `Chip`/`ChipTone`, `Card`, `StatStrip`, `TabBar`, `InfoTip`, `DrillBar`
  (`src/components/ui.tsx`) — `DrillBar` renders the "from X · label" strip
  used when a screen was reached via a cross-section drill.
- `Lifecycle.tsx`/`Timeline.tsx` (`src/components/`) — the vertical
  stage-rail (rule lifecycle) and dot-and-line activity log used by
  `RuleDetails.tsx`; both were factored out specifically so this visual
  pattern isn't copy-pasted a third time — reuse them for any new
  lifecycle/activity UI rather than writing new CSS.
