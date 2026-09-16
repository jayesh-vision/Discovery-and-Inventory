# Testing: exact coverage and how to validate changes

## Commands

```bash
npm run typecheck      # tsc -b
npm run build           # tsc -b && vite build
npm run legacy:bundle   # rebuild public/legacy.js — required after ANY legacy/*.js edit
npm run test            # tests/run.mjs: vite build → vite preview :4173 → tests/e2e.mjs (Playwright)
npm run dev              # http://localhost:5173, for manual click-through
```

## Coverage that exists (`tests/e2e.mjs`), by screen

- **`/inventory/physical`** (the most thoroughly tested Inventory screen):
  renders 12 rows on load; toolbar has no inline refresh icon (it's
  menu-only); kebab row menu carries Refresh/Export CSV/Export XLSX; filter
  panel footer button labels (`Advance · Reset to default · Apply filters`);
  no host header/sidebar (embedded-mode assertions); title starts with
  `Resources · Physical Resources`; tab counts read from the ledger
  (`Router 2,148`, `gNodeB 14`); exactly 4 active stock chips (no
  archive/decomm chip); clicking a stock chip updates the URL
  (`stock=planned,instore,faulty`) and both tab counts and grid count follow
  it; switching tabs updates `cls=` and the stock-chip labels.
- **Row menu**: asserts `.kmenu .kmenu-i` count === 5, every item has an
  icon, and explicitly checks **no placeholder items remain** matching
  `/Re-run discovery|Change stock state|Decommission/`. ⚠️ The count-of-5
  assertion doesn't obviously match what the current `rowActions` code
  produces at that point in the flow (Node view / View details / Site info,
  fewer for gNodeB) — worth re-verifying against the live DOM rather than
  trusting it as ground truth; the "no placeholder text" half is solid
  regardless.
- **Decommissioned → archive drill**: clicking a stock preset while on the
  `dwdm` tab navigates to `/inventory/inactive?cls=dwdm`; archive rows are
  read-only (`.ro-lock`); no stock chips or status-pill column in the
  archive; router archive paginates in blocks of 25 with bounded-scroll
  assertions (pinned header, page itself never scrolls, "Showing 25 of 289"
  strip); "Go to active inventory" returns to Physical Resources.
- **Legacy drill-through**: `window.__nsLegacy.drillTo('physical', 'Spares
  in store', 'stock=instore')` lands on `/inventory/physical?stock=instore` —
  the pattern to reuse for scripting any other legacy-origin drill test.
- **Site details / equipment**: `/inventory/location/site/BGLK-277` section
  tabs include Site details/Site equipment; clicking through renders `.kpi3`
  (4 facility KPIs) with power KPI = 14.5 (sum of feeds) and rack KPI = 107
  (sum of racks) for `BGLK-277` specifically; "Network elements" tab returns
  to the legacy NE list; a *different* site (`DEL-279`) is also checked to
  have a facility record (confirms `derive()` works, not just the literal
  record). Site equipment renders a `.cv-frame` iframe at
  `/cable-view/index.html?station_id=BGLK-277&theme=light`; `?token=&
  facility_id=` params are also exercised (the "live Fiberneo" path).
- **Smoke-only**: `/inventory`, `/inventory/location`, `/inventory/virtual`,
  `/inventory/passive`, `/inventory/links`, `/inventory/services`,
  `/inventory/reports`, `/inventory/resource/:name`,
  `/inventory/node/:name`, `/inventory/location/site/:id/capex` — render +
  no console-error checks only, no data assertions.

## Coverage that does NOT exist — verify by hand

- Virtual Resources, Passive Infrastructure, Links, Services, Reports —
  beyond the smoke checks above, no grid-content, filter, or row-action
  assertions exist for any of these.
- The Capex/Opex draft add/remove/save flow — no e2e assertions found.
- Any new write/mutation feature you might add to Inventory — there is no
  existing test harness pattern for a stateful mutation in this domain
  (the Rules localStorage persistence pattern from the other Skill is the
  closest analogue if you need to design one).

## Decision table

| Change type | Recommended validation |
|---|---|
| `physical.ts`/`ledger.ts` data | typecheck + build — self-check IIFEs throw at import if a count invariant breaks; treat that as a real failure |
| `PhysicalResources.tsx` UI/row actions | `npm run test` (real coverage here) + manually recount the row menu against the current `rowActions` code |
| `facility.ts`/`cableView.ts` | manually check Site equipment for `BGLK-277` (hand-written) AND at least one other site (derived) |
| `archive.ts`/`InactiveInventory.tsx` | `npm run test` covers the decommission→archive drill and pagination; manually check any new filter/column |
| Legacy Inventory screens (`app-res.js`, `app-node*.js`, `app-opex.js`, `app-period.js`) | `npm run legacy:bundle` then manual click-through — smoke-tested only |
