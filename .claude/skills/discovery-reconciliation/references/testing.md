# Testing: exact coverage and how to validate changes

## Commands

```bash
npm run typecheck     # tsc -b — run after any .ts/.tsx change
npm run build          # tsc -b && vite build — final check before calling a change done
npm run legacy:bundle  # rebuild public/legacy.js — required after ANY legacy/*.js edit
npm run test           # tests/run.mjs: vite build → vite preview :4173 → tests/e2e.mjs (Playwright)
npm run dev             # http://localhost:5173, for manual click-through / ad-hoc Playwright scripts
```

`tests/e2e.mjs` runs against a production build on :4173, not the dev
server — a change that only shows up in `npm run dev` (e.g. a forgotten
`legacy:bundle`) can still fail `npm run test`.

## Coverage that exists (`tests/e2e.mjs`), by screen

- **`/discovery/jobs`** — the most thorough block in the file: per-row
  `clean + partial + fail === targets` invariant checked against real `JOBS`
  rows, filter-by-filter row-count assertions, "no status renders in two
  colours" check, toolbar chip derivation, confirms the grid uses a
  toolbar/grid-bar (not a `.page-bar`).
- **`/discovery/targets`** — asserts the quick-filter-in-grid-bar layout
  (`data-tgt-filter` segmented control count === 4, no separate `.page-bar`),
  no loose "Run now" button outside the row menu, row-menu action sanity.
- **`/discovery/reconcile`** — a single smoke assertion (`text length > 200`)
  against what renders at that path. This assertion predates the React port
  of `Reconcile.tsx` (the `reconcile` key in `routes.ts` is `component`-owned
  today) — treat it as a stale smoke check, not a spec for the current page.
- **Generic smoke loop** — hits `/discovery/jobs`, `/discovery/targets`,
  `/discovery/reconcile` (among many other paths) checking for zero
  console/page errors.
- **Insights** — several selectors (`.kpi2-row`, `.ins2-donut-l`,
  `.ins2-6-6 .mtbl`, `.ins2-states`) do not match current `Insights.tsx`
  markup (`vw-card-section`, `mtbl`, etc.) — this block is very likely stale
  from before the React port. Do not treat a failure here as proof your
  change broke Insights; check the live DOM/markup first.

## Coverage that does NOT exist — verify these by hand

- Reconciliation Overview (`Reconcile.tsx`)'s actual data cards (only a smoke
  check exists, and it may be against dead legacy markup).
- Reconciliation Jobs, Results, Exceptions screens — zero assertions.
- Every Rules screen (List, Definition/create, Definition/edit, Details,
  every tab, every lifecycle transition button) — zero assertions.
- The full hyperlink cross-link map (see `[[reconciliation.md]]`) — no
  automated check that any of these links resolve to a populated destination.

For changes in these areas, verify manually: `npm run dev`, click through the
actual flow, and/or write a throwaway Playwright script using
`page.evaluate(() => window.__nsLegacy.drillTo(...))` for legacy-side
navigation and plain `page.click()`/`page.goto()` for React screens. Delete
the throwaway script when done — there is no fixture/factory convention in
this repo to extend it into.

## Decision table

| Change type | Recommended validation |
|---|---|
| `rules.ts` data or lifecycle logic | typecheck + build, then manually walk: Rules List → the rule's Details (all 7 tabs) → any cross-linked Results/Exceptions/Insights row |
| `legacy/app-{views,data,router,grid}.js` (jobs/targets) | `npm run legacy:bundle` then `npm run test` — this is the one area with real e2e coverage |
| New domain-specific transcript/collector content | manual: open the target transcript for a target in that domain, confirm step count and protocol names match `[[domain-model.md]]`'s table |
| New Reconciliation/Rules screen or route | add to `routes.ts`, typecheck + build, then manual click-through (no e2e safety net yet) |
| Cross-link between two records (ids) | manually click the link both directions; confirm the destination is non-empty, not just non-erroring |
