# Discovery & Inventory

The **Discovery & Reconciliation** and **Inventory** modules of the NetSingularity
OSS platform, on the NST / Vision Waves design system.

Vite · React 19 · TypeScript · react-router 7. No UI library: every element is a
`.vw-*` / `.nst-*` class from the design system bundle in `src/styles/`.

## Embedding

The host application owns the header and the left navigation; this app renders
neither (only `document.title` names the screen). Each screen is one URL, so a
host menu item is an iframe pointing at it:

| menu item | iframe src |
| --- | --- |
| Insights | `/discovery/insights` |
| Scan jobs · Scan targets · Reconciliation | `/discovery/jobs` · `/discovery/targets` · `/discovery/reconcile` |
| Location | `/inventory/location` |
| Physical · Virtual · Passive | `/inventory/physical` · `/inventory/virtual` · `/inventory/passive` |
| Links · Services · Reports | `/inventory/links` · `/inventory/services` · `/inventory/reports` |
| Inactive inventory | `/inventory/inactive` |

Drill-downs stay inside the iframe and the breadcrumb links back to the list
screen. Filters are query parameters (`?cls=switch&stock=instore`), so a host
menu can deep-link a filtered view.

### Site equipment (cable view)

`/inventory/location/site/<id>/equipment` hosts the Fiberneo cable view
(`public/cable-view/`, unmodified) in its own frame. With no query the tab
builds a `siteInfo` payload from the site's cabling ledger
(`src/data/facility.ts` → `src/data/cableView.ts`) and injects it into the
frame the way Fiberneo does. Append `?token=<jwt>&facility_id=<id>` to hand
those through instead; the frame then fetches the live facility from
`qa.visionwaves.com` and the header badge reads *Live · Fiberneo*.

```bash
./app.sh run       # installs on first run, then http://localhost:5173
./app.sh test      # production build + end-to-end checks
./app.sh push "message"
./app.sh deploy    # Vercel production (logs in the first time)
./app.sh ship "message"   # test → push → deploy
```

Or the underlying npm scripts:

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run build:single   # dist/app.html — one file, hash routing, opens from disk or an artifact
npm test           # builds, serves, runs the end-to-end harness
```

## Deploy

Vercel detects Vite. `vercel.json` adds the SPA rewrite so deep links such as
`/inventory/physical?cls=switch` resolve on reload, and long-cache headers for
hashed assets. Nothing else to configure.

## Status of the port

This codebase started as a single-file clickable prototype. It is being ported
screen by screen; the shell, routing, data layer and grid system are React, and
each screen is either a React component or, until it is ported, rendered by the
prototype's own renderer through a bridge.

| screen | state |
| --- | --- |
| Insights | React — `src/screens/Insights.tsx` |
| Physical Resources | React — `src/screens/PhysicalResources.tsx` |
| Inactive inventory | React — `src/screens/InactiveInventory.tsx` |
| Site details · Facility tab | React — `src/screens/SiteDetails.tsx` (the other site tabs are legacy) |
| Site details · Site equipment tab | React — `src/screens/SiteEquipment.tsx`, framing `public/cable-view/` |
| Scan jobs, Scan targets, Reconciliation | legacy bridge |
| Location, Site details (NE / Capex / Opex tabs), Node view | legacy bridge |
| Virtual Resources, Passive Infrastructure, Links, Services, Reports, Element | legacy bridge |

`src/routes.ts` is the single registry: sidebar, breadcrumb, routes and the
bridge all read it. A screen with a `component` is React; one marked `legacy`
renders through `src/legacy/LegacyView.tsx`.

### How the bridge works

`scripts/bundle-legacy.mjs` concatenates `legacy/*.js` — the prototype's
renderer, unchanged — into `public/legacy.js`, applying a handful of patches so
the prototype no longer owns the shell:

- it looks up `#view` when it renders rather than at load, since React mounts it;
- its `go(view)` hands React-owned screens to the router instead of rendering;
- after it re-renders itself in place (a tab, a drill, a row action) it tells
  React, so the URL follows the screen;
- it never touches the sidebar highlight.

Navigation works in both directions: a drill from a legacy screen into a React
one carries its filter as query parameters; a row action on a React screen that
opens a legacy detail lands on a deep link the bridge resolves. The filter names
in the URL (`cls`, `stock`, `ne`, `tab`, `drill`) are the prototype's own, so the
two sides agree without a translation table.

### Porting a screen

1. Extract its data into a typed module under `src/data/` (see `ledger.ts`,
   `physical.ts`, `archive.ts`). Totals come from the ledger; rows are samples.
2. Write the component under `src/screens/` on `DataGrid`, `StatStrip`,
   `TabBar`, `Chip` from `src/components/`. Screen state lives in the URL via
   `useSearchParams`, so drills and reloads land on the same view.
3. In `src/routes.ts`, give the entry a `component` and remove `legacy`.
4. Delete its `view…` function from `legacy/app-views.js` (or `app-res.js`,
   `app-node2.js`) and re-run `npm run legacy:bundle`.
5. Add its assertions to `tests/e2e.mjs`.

Suggested order — each step retires the most shared prototype code:
Links and Services (same grid shape as Physical) → Virtual Resources and
Reports → Passive Infrastructure → Scan jobs and Scan targets → Reconciliation
→ Location list and Site details → Insights → Element, Node view, Capex, Opex.

## Layout

```
src/
  main.tsx, App.tsx        shell: routes (no header, no menu — the host draws them)
  routes.ts                screen registry
  shell/RouteTitle.tsx     document title per route (the host app draws the header and menu)
  components/ui.tsx        Chip, Card, StatStrip, TabBar, DrillBar
  components/grid/         DataGrid, toolbar, filter panel, row menu, Pager, icons
  data/                    typed ledgers and sample rows, self-checked at import
  screens/                 ported screens
  legacy/LegacyView.tsx    the bridge
  styles/                  ds-bundle.css (NST design system) · grid.css (every list) · shell.css (screen layout)
legacy/                    the prototype renderer, one file per module
scripts/bundle-legacy.mjs  builds public/legacy.js from legacy/
tests/e2e.mjs              end-to-end harness: ledgers, both bridge directions, every screen
```

## The grid

Every list in the application is one grid. There are two renderers for now —
`src/components/grid/DataGrid.tsx` for React screens and the prototype's
`gridBar()` / `table()` / `filterPanel()` in `legacy/app-grid.js` +
`app-helpers.js` for screens not yet ported — but they emit the same markup
and `src/styles/grid.css` is the only place that markup is styled. The
contract (toolbar → filter panel → menus → table) is written at the top of
`grid.css`; the end-to-end suite renders one grid of each kind and fails if
their skeletons diverge.

Rules that follow from this:

- A grid change is a change to `grid.css` and, if the markup moves, to both
  renderers in the same commit. Never a per-screen override.
- `grid.css` uses NST tokens (`--vw-*`) and NST primitives (`.nst-table`,
  `.nst-btn`, `.nst-input`, `.vw-chip`) only. The NST bundle has no grid
  composite of its own — no toolbar, filter panel, action menu or bounded
  scroll box — which is why this file exists.
- Porting a legacy list screen means giving it a React screen that uses
  `DataGrid`; when the last one is ported, `app-grid.js` goes.

## Conventions

- Only `.vw-*` and `.nst-*` classes. No literal hex, no Tailwind, Bootstrap or
  MUI, no invented class names. Poppins only.
- Every number on screen belongs to a ledger in `src/data/`. `ledger.ts` throws
  at import if the class × stock cross-tab stops closing.
- Row-action menus lead with an icon inferred from the verb (`icons.tsx`); do
  not hand-pick icons per call site.
- The first column of a grid headed *Status*, *State*, *Outcome*, *Result* or
  *Stock state* renders as a full-width state pill; the grid does this from the
  column header, not per screen.
