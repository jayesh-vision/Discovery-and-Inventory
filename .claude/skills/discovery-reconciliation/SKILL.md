---
name: discovery-reconciliation
description: Work on the Discovery & Reconciliation module of the NetSingularity OSS app — Insights, Scan Jobs/Targets, Reconciliation Overview/Jobs/Results/Exceptions, and the Rules engine (list, definition, details, lifecycle). Use for any change touching src/screens/{Insights,Reconcile,ReconciliationJobs,ReconciliationResults,ReconciliationExceptions,RulesList,RuleDefinition,RuleDetails,DomainDevices,RegionDevices,DiscoveredDevices,DiscrepancyDetails}.tsx, src/data/{discoveryOverview,discovery,reconcileOverview,reconciliationOps,rules,domainDevices}.ts, or legacy/{app-views,app-data,app-router,app-grid}.js for jobs/targets/reconcile. Covers the RAN/Core/Transport/IP-MPLS domain taxonomy, the Rule lifecycle state machine, and how discrepancies/exceptions cross-link back to the rule that raised them.
---

# Purpose

Discovery & Reconciliation is the front half of this OSS app: it scans network
elements (Discovery), compares what was found against expectation (Rules),
and surfaces the gaps (Reconciliation results/exceptions). There is **no
backend** — every screen renders static/seeded mock arrays. Rule edits are the
one exception: they persist to `localStorage` so a demo survives a reload.

# When to Use

Any task touching: Insights KPIs/cards, Scan Jobs/Scan Targets grids or the
target transcript, the Reconciliation Overview/Jobs/Results/Exceptions
screens, or anything under Reconciliation → Rules (list, create/edit,
details, approve/reject, lifecycle). Also use this Skill when a task asks you
to add a new telecom domain, change what a rule's conditions compare, or wire
a new cross-link between a job/result/exception and a rule.

# Domain Overview

One taxonomy, a **tree**, defined once in `src/data/discoveryOverview.ts`
and re-exported by every other data file so labels/colors never drift:

```text
RAN
Core
Transport
  └── IP/MPLS        ← a sub-domain of Transport, NOT a fourth sibling
```

```ts
type DomainKey = 'RAN' | 'Core' | 'Transport' | 'IPMPLS';   // leaf keys, stable (URLs, localStorage)
DOMAIN_PARENT = { IPMPLS: 'Transport' };                     // the hierarchy lives here
DOMAIN_ORDER  = ['RAN', 'Core', 'Transport', 'IPMPLS'];      // child directly after parent — use this, never a local array
DOMAIN_LABEL:      IPMPLS → 'IP/MPLS' (short: legends, column headers)
DOMAIN_FULL_LABEL: IPMPLS → 'Transport · IP/MPLS' (tables, drawers, exports)
DOMAIN_HEX:   RAN blue · Core violet · Transport teal · IPMPLS pink.
domainMatches(row, filter) / domainFilterMatches(row, value): Transport ⊇ IP/MPLS
DOMAIN_OPTIONS: the <select> list, sub-domain indented ('   └ IP/MPLS'); parseDomainKey() accepts key/label/full/slug
domainRoute(d): 'domaindevices' or 'subdomaindevices' (/domain/transport/ipmpls)
```

Rendering: `DomainDot` (`src/components/ui.tsx`) everywhere outside Insights,
`DomainTag parent=` (`ops.tsx`) inside it; legacy uses `domainDot()` /
`DOMAIN_FILTER_OPTIONS` / `domainFilterMatch()` (`legacy/app-helpers.js`).
A Domain filter set to Transport must keep IP/MPLS rows — `DataGrid` and the
legacy `gridApply` both enforce this; never compare `DOMAIN_LABEL[x] !== value`.

**Before touching domain-specific content** (a rule's conditions, a
transcript step, a discrepancy type), read `[[references/domain-model.md]]`'s
collector-family table — every domain has *different* protocols and a
*different* collector count (5 or 6), and content copied from Transport onto
another domain is very likely wrong (this has happened before and been
fixed — see Common Pitfalls).

⚠️ **Two coexisting, non-unified taxonomies feed Insights' own drill-downs**:
`RegionDevices.tsx`/`DiscoveredDevices.tsx` read the *older* `src/data/discovery.ts`
(regions: North/East/West/South, no `DomainKey`), while `DomainDevices.tsx`/
`DiscrepancyDetails.tsx` read `discoveryOverview.ts` + `domainDevices.ts`
(the RAN/Core/Transport/IPMPLS taxonomy). Check which file a screen already
imports before adding a field — don't assume "domain" exists on `discovery.ts`
rows, and don't assume `discoveryOverview.ts` has a `region` field shaped like
`discovery.ts`'s. This split is a known, pre-existing inconsistency — not
something to silently "fix" as a side effect of an unrelated task.

# Architecture

`src/routes.ts`'s `SCREENS` array is the single registry for sidebar,
breadcrumb, and routing. A screen with `component:` is React; one marked
`legacy: true` renders through `src/legacy/LegacyView.tsx`, which loads
`public/legacy.js` (built by `npm run legacy:bundle` from `legacy/*.js`) into
`#view` and bridges navigation both ways via `window.__nsLegacy`/`window.__nsBridge`.

| Screen | Owner |
|---|---|
| Insights | React — `Insights.tsx` |
| Scan jobs, Scan targets, Target transcript | legacy — `legacy/app-views.js` `viewJobs()`/`viewTargets()`/`viewTarget()` |
| Reconciliation Overview/Jobs/Results/Exceptions | React |
| Rules (list/new/edit/details) | React |

**Before editing any `legacy/*.js` function**, grep `scripts/bundle-legacy.mjs`
for that function name or a literal string inside it. The bundler does exact
`find → replace` patches (e.g. on `go()`, `viewEl/crumbEl/modEl`, the
`viewTargets()` quick-filter template, the post-render hook) and **throws at
build time** if the matched text is gone. Full list in
`[[references/architecture.md]]`. Confirmed safe today: `viewJobs()` and
`viewTargets()`'s row/column bodies (not their exact patched substrings),
`targetOf()`, `chainOf()`, `txStepsFor()`, `TX_FAIL`.

Reuse, don't reinvent: `DataGrid` (search/filter/sort/`onRowClick`,
`src/components/grid/DataGrid.tsx`) backs every list screen in this domain;
`Drawer` (`src/components/Drawer.tsx`) is the row-detail pattern; `Chip`/
`ChipTone`/`Card`/`StatStrip`/`TabBar` (`src/components/ui.tsx`) are the only
visual vocabulary — there is no second design system to add.

# Discovery Flow

```
JOBS row (legacy/app-data.js)  →  TARGETS row (t.job === j.id)
      →  ch[] per-collector pass/fail, truncated to the domain's
         collector count via chForDomain(arr, domain)
      →  viewTargets() row click → drillTo() → applyDrillQuery('target', …)
      →  targetOf(TARGET_ID) → txStepsFor(rec) → per-domain transcript
```

Collector families are domain-specific and defined in `legacy/app-data.js`:
`COLLECTORS` (Transport, 6 steps: device/hardware/lldp/ospf/bgp/service —
the reference implementation, kept byte-for-byte stable), `RAN_COLLECTORS`
(5: device/radio/neighbours/config/service), `CORE_COLLECTORS` (5:
device/registration/interfaces/session/dependencies), `IPMPLS_COLLECTORS`
(6: device/interfaces/routing/mpls/bgp/vpn), all keyed by
`COLLECTORS_BY_DOMAIN`. `TRANSCRIPT_BY_DOMAIN`/`OBJECTS_BY_DOMAIN` mirror the
same per-domain split for the transcript step text and the "objects
discovered" widget.

# Reconciliation Flow

```
Rule.conditions[]  (what "match" means for this domain)
      →  RECONCILE_JOBS.ruleIds[]     (which rules a scan job runs)
      →  RECONCILE_RESULTS.ruleId     (per-element outcome: Matched /
                                        Attribute mismatch / Stale /
                                        Missing entity / Extra entity)
      →  RECONCILE_EXCEPTIONS.ruleId  (the subset needing human action)
      →  Rule.executions[]            ({at, matched, exceptions, durationMs})
```

Cross-reference helpers (all in `src/data/reconciliationOps.ts` /
`src/data/rules.ts` — never re-derive this by string-matching):
`ruleById(id)`, `exceptionsForRule(ruleId)`, `resultsForRule(ruleId)`,
`jobsForRule(ruleId)`. UI hyperlink web: `ReconciliationJobs`/`Results` row →
`/discovery/reconcile/rules/${ruleId}`; `RuleDetails`' Exceptions tab row →
`/discovery/reconcile/exceptions?ruleId=${rule.id}` (round-trips back,
filtered via `urlRuleId` in `ReconciliationExceptions.tsx`).

# Rule Lifecycle & State Transitions

```ts
RULE_LIFECYCLE = ['Draft','Review','Approved','Active','Executing','Suspended','Retired']
```

All mutation lives in `RuleDetails.tsx`'s `transition(status, action, note?)`,
which appends to `approvalHistory`/`activity`, sets `rule.status`, and calls
`persistRules()`. **Only these transitions have a UI trigger today**:

| From | Button | To |
|---|---|---|
| Review | Approve | Approved |
| Review | Reject | Draft |
| Review | Request changes | Draft |
| Approved | Activate rule | Active |

`Draft → Review`, `Active → Executing`, anything `→ Suspended`, and anything
`→ Retired` have **no button anywhere** — those states exist only in seed
data. Do not build a feature that assumes a rule can be suspended/retired
from the UI unless you are also adding that transition; check
`[[references/reconciliation.md]]` before changing this logic.
`RuleDefinition.tsx`'s edit path never changes `status` — it only logs a
`'Rule definition edited'` activity event.

# Identity and Matching

- `targetOf(id)` (`legacy/app-views.js`): **`TARGETS.find(t => t.ip === id) ||
  TARGETS.find(t => t.host === id)`** — IP is checked first because ~109
  targets share the placeholder host `'—'`; a host-only lookup collapses them
  all onto whichever row happens to come first. This was a real, shipped bug
  — never revert to host-first matching.
- `ruleById`, `exceptionsForRule`, `resultsForRule`, `jobsForRule` — exact-id
  `.find()`/`.filter()`, no fuzzy matching.
- `chForDomain(arr, domain) = arr.slice(0, CH_LEN_BY_DOMAIN[domain])` relies
  on the invariant "`fail` always leads, `na` always trails" in every
  hand-authored `ch[]` pattern — breaking that ordering breaks the truncation.
- `ReconciliationExceptions.tsx`'s `subjectHost()` parses the exception's
  free-text `subject` string to link to `/inventory/resource/:name` — it can
  fail to resolve for a mock element; this is acknowledged in-code as
  expected, not a bug to "fix" by inventing a real identity field.

# Persistence ("no backend")

Only `RULES` persists, via `localStorage` key `ns.reconciliation.rules.v1`
(`loadPersistedRules()`/`persistRules()` in `src/data/rules.ts`, wrapped in
try/catch so private-mode/quota failure degrades to in-tab-only edits).
Everything else — jobs, results, exceptions, discrepancy counts — is a plain
module-level array with no persistence; edits made through component
`useState` vanish on reload. **Do not add a new persistence mechanism** for a
new mock dataset unless asked; matching the existing in-memory-array pattern
is what "no backend" means here.

# Testing

`npm run test` (`tests/run.mjs`) builds, serves on :4173, and runs
`tests/e2e.mjs` (Playwright). See `[[references/testing.md]]` for the exact
coverage map. Headline facts:
- Scan Jobs has real assertions (per-row `clean+partial+fail === targets`
  invariant, filter-by-filter row counts). Scan Targets has quick-filter
  assertions. **The Reconciliation Overview/Jobs/Results/Exceptions and every
  Rules screen have zero e2e coverage today** — verify those by hand
  (Playwright `page.evaluate` / manual click-through) after any change.
- Several Insights selectors in `tests/e2e.mjs` (`.kpi2-row`, `.ins2-donut-l`)
  don't match the current `Insights.tsx` markup — likely stale from before
  the React port. Don't treat a failure there as proof your change broke
  something; verify against the live DOM first.

Validation commands: `npm run typecheck` (`tsc -b`), `npm run build`,
`npm run legacy:bundle` (required after any `legacy/*.js` edit — the dev
server does not auto-rebuild `public/legacy.js`), `npm run test`.

| Change type | Recommended check |
|---|---|
| Rule data/logic (`rules.ts`) | typecheck + build + manually exercise the rule's detail page and every screen that cross-links to it (Results, Exceptions, Insights discrepancy list) |
| Legacy jobs/targets (`legacy/app-*.js`) | `npm run legacy:bundle` first, then `npm run test` (the only e2e coverage for this area) |
| New domain-specific content | cross-check against `[[references/domain-model.md]]`'s collector table — don't reuse another domain's protocol/field names |
| New screen/route | add to `SCREENS` in `routes.ts`, confirm breadcrumb `crumb` chains correctly, confirm sidebar entry if user-reachable |

# MUST Rules

- MUST grep `scripts/bundle-legacy.mjs` before renaming/restructuring any
  `legacy/*.js` function or literal string block; a patch mismatch throws at
  build time.
- MUST run `npm run legacy:bundle` after any `legacy/*.js` edit — `public/legacy.js`
  is a build artifact, not hand-edited.
- MUST keep Transport's collector flow (`COLLECTORS`, its transcript, its 6
  steps) byte-for-byte as-is when working on any other domain — it is the
  reference implementation other domains were built to *not* copy verbatim.
- MUST use each domain's real collector family/protocol when writing a rule's
  `source`/`target`/`conditions` — e.g. RAN via NETCONF/SNMP, IP/MPLS via
  MPLS-LDP-MIB, Core via REST(NRF) — never Transport's LLDP/OSPF/BGP for a
  non-Transport rule.
- MUST call `persistRules()` after any `RULES` mutation (create, edit, status
  transition) — omitting it makes the change vanish on reload while looking
  correct in the same session.
- MUST look up cross-references via the existing helpers (`ruleById`,
  `exceptionsForRule`, `resultsForRule`, `jobsForRule`, `targetOf`) rather than
  writing a new `.find()`/`.filter()` inline — they encode the real identity
  rules (e.g. IP-before-host).

# MUST NOT Rules

- MUST NOT copy Transport's transcript/collector list onto RAN, Core, or
  IP/MPLS "to keep it simple" — this was tried, reported as a bug by the
  product owner, and reverted; each domain must use its own
  `*_COLLECTORS`/`TRANSCRIPT_BY_DOMAIN` entry.
- MUST NOT look a target up by `host` alone — the placeholder `'—'` is
  shared by ~109 rows; always IP-first (`targetOf`'s existing order).
- MUST NOT add a UI button that transitions a rule through a status pair not
  listed in the Rule Lifecycle table above without being asked — most of the
  lifecycle intentionally has no UI trigger yet.
- MUST NOT invent a backend call, API client, or server round-trip for this
  domain — every existing "Refresh"/"Save" is a local re-derive or in-memory
  mutation; that is the intended architecture, not a gap to fill.
- MUST NOT assume `discovery.ts` and `discoveryOverview.ts` are the same
  taxonomy or interchangeable — they coexist on the same Insights page for
  different drill-downs.

# SHOULD Rules

- SHOULD re-use `DataGrid`/`Drawer`/`Chip`/`Card`/`StatStrip`/`TabBar` for any
  new list or detail UI in this domain rather than hand-rolling markup.
- SHOULD verify new/changed screens by hand (dev server + click-through or a
  one-off Playwright script) when the change touches Reconciliation or Rules,
  since `tests/e2e.mjs` doesn't cover them.
- SHOULD keep a rule's `description`/`expectedImpact` text consistent with
  its actual `conditions[]` — a past audit found rules whose prose referenced
  a protocol (LLDP, "config checksum") that the domain's real collectors
  don't produce; fixed by rewriting the rule to match the domain, not by
  adding a new collector.

# Common Pitfalls

- **Domain-blind content on a domain-organized page**: `ADAPTER_ROWS` and
  `ROOT_CAUSE_FAILURES` (`discoveryOverview.ts`) carry domain fields —
  don't add a new row without one, and don't render them without a domain
  tag/dot when every sibling card on Insights has one. (`COLLECTOR_ROWS` is
  still defined there but no longer rendered on Insights — the Collector
  health card was removed in favour of showing Failures by root cause
  beside Discovery adapters.)
- **`ch[]` length mismatches**: a hand-written `TARGETS` row for a 5-collector
  domain (RAN/Core) needs a 5-element `ch[]`, not 6 — use `chForDomain()`
  rather than hardcoding length.
- **Duplicate React keys** from array rows that share a natural key (e.g.
  `RECONCILE_CYCLE_ROWS` has multiple rows per domain) — key by a compound
  string (`${domain}-${when}`), not `domain` alone.
- **`.map()` assuming exactly one row per group** — `CYCLE_ACTIVITY` broke
  this way when `RECONCILE_CYCLE_ROWS` grew from 1 to 3 rows/domain; use
  `.find()` with the array's newest-first ordering instead.

# Decision Rules

- **Changing what a rule detects** → edit `Condition[]`/`source`/`target` in
  `src/data/rules.ts`, grounded in that domain's real collector family
  (`[[references/domain-model.md]]`). Never edit `reconciliationOps.ts`'s
  mock outcomes to "fix" a rule — the rule is upstream of the outcome.
  Never edit `Reconcile.tsx`'s cards directly to "improve" data.
- **Adding a new discrepancy/exception example** → add to
  `DISCREPANCY_TYPES` (discoveryOverview.ts) and/or `RECONCILE_EXCEPTIONS`
  (reconciliationOps.ts), with a real `ruleId` back-reference — don't leave
  it unlinked.
- **Adding a whole new telecom domain (or sub-domain)** → add to `DomainKey`,
  `DOMAIN_HEX`, `DOMAIN_LABEL`, `DOMAIN_ORDER` (child right after its parent)
  and, for a sub-domain, `DOMAIN_PARENT` (discoveryOverview.ts) — the
  import-time tree check and `tests/unit/domain-hierarchy.test.mjs` fail
  otherwise; mirror it in `legacy/app-helpers.js` `DOMAIN_META`; then its own `*_COLLECTORS` +
  `TRANSCRIPT_BY_DOMAIN`/`OBJECTS_BY_DOMAIN` entries (legacy/app-data.js) —
  this is a large, cross-cutting change; scope it explicitly before starting.
- **Changing Insights layout/cards** → check first whether the card reads
  `discovery.ts` or `discoveryOverview.ts`/`domainDevices.ts` (see the two-
  taxonomies warning above) before adding a field to either.
- **A new lifecycle transition for Rules** → add it to `RuleDetails.tsx`'s
  conditional button block next to the existing ones, following the same
  `transition(status, action, note?)` call shape; update the lifecycle table
  in this file's Rule Lifecycle section for future readers.

# References

- `[[references/architecture.md]]` — legacy bridge mechanics, the full
  `bundle-legacy.mjs` patch list, routes.ts registry shape.
- `[[references/domain-model.md]]` — every entity's exact field shape (Job,
  Target, Rule, Condition, ReconcileJob/Result/Exception, DiscrepancyTypeRow).
- `[[references/reconciliation.md]]` — Rule lifecycle detail, condition
  builder, approval/activity log shape, the full hyperlink cross-link map.
- `[[references/testing.md]]` — exact `tests/e2e.mjs` coverage by screen and
  validation commands.
