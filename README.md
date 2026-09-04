# Discovery & Inventory

The **Discovery & Reconciliation** and **Inventory** modules of the NetSingularity
OSS platform, on the NST / Vision Waves design system.

Vite · React 19 · TypeScript · react-router 7. No UI library: every element is a
`.vw-*` / `.nst-*` class from the design system bundle in `src/styles/`.

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
| Physical Resources | React — `src/screens/PhysicalResources.tsx` |
| Inactive inventory | React — `src/screens/InactiveInventory.tsx` |
| Insights, Scan jobs, Scan targets, Reconciliation | legacy bridge |
| Location, Site details, Capex, Opex, Node view | legacy bridge |
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
  main.tsx, App.tsx        shell: sidebar, topbar, routes
  routes.ts                screen registry
  shell/                   Sidebar, Topbar
  components/ui.tsx        Chip, Card, StatStrip, TabBar, DrillBar
  components/grid/         DataGrid, toolbar, filter panel, row menu, Pager, icons
  data/                    typed ledgers and sample rows, self-checked at import
  screens/                 ported screens
  legacy/LegacyView.tsx    the bridge
  styles/                  ds-bundle.css (design system), shell.css (layout)
legacy/                    the prototype renderer, one file per module
scripts/bundle-legacy.mjs  builds public/legacy.js from legacy/
tests/e2e.mjs              end-to-end harness: ledgers, both bridge directions, every screen
```

## Conventions

- Only `.vw-*` and `.nst-*` classes. No literal hex, no Tailwind, Bootstrap or
  MUI, no invented class names. Poppins only.
- Every number on screen belongs to a ledger in `src/data/`. `ledger.ts` throws
  at import if the class × stock cross-tab stops closing.
- Row-action menus lead with an icon inferred from the verb (`icons.tsx`); do
  not hand-pick icons per call site.
- The first column of a grid headed *Status* or *State* renders as a full-width
  state pill; the grid does this from the column header, not per screen.
