# Domain model: exact shapes

## Domain taxonomy (`src/data/discoveryOverview.ts`)

```ts
type DomainKey = 'RAN' | 'Core' | 'Transport' | 'IPMPLS';
DOMAIN_HEX:   RAN → blue-400, Core → violet-400, Transport → teal-400, IPMPLS → pink-400 (CSS var refs)
DOMAIN_LABEL: IPMPLS → 'IP/MPLS', all others → identity
```
Re-exported unchanged by `reconcileOverview.ts`, `reconciliationOps.ts`, and
`rules.ts` — always import `DomainKey`/`DOMAIN_HEX`/`DOMAIN_LABEL` from one of
these, never redefine it locally.

## Collector families (`legacy/app-data.js`)

| Domain | Const | Steps (in order) | Slot count |
|---|---|---|---|
| Transport | `COLLECTORS` | device, hardware, lldp, ospf, bgp, service | 6 |
| RAN | `RAN_COLLECTORS` | device, radio, neighbours, config, service | 5 |
| Core | `CORE_COLLECTORS` | device, registration, interfaces, session, dependencies | 5 |
| IP/MPLS | `IPMPLS_COLLECTORS` | device, interfaces, routing, mpls, bgp, vpn | 6 |

`COLLECTORS_BY_DOMAIN = { Transport, RAN, Core, IPMPLS }`. `CH_LEN_BY_DOMAIN`
gives each domain's slot count; `chForDomain(arr, domain)` truncates a 6-slot
`ch[]` literal to a shorter domain's real length — **relies on `fail` always
leading and `na` always trailing** in every hand-written pattern; don't
write a pattern like `['na','fail',...]` and expect truncation to make sense.

`TRANSCRIPT_BY_DOMAIN` holds per-domain step *text* templates using
`{{ip}}`/`{{host}}`/`{{oem}}`/`{{model}}` placeholders — this is a newer
convention used for RAN/Core/IPMPLS only. **Transport keeps its original
literal-IP-substitution code path**, selected via an `isTransport` branch in
`txStepsFor()` — do not migrate Transport onto the placeholder convention
"for consistency"; it was deliberately left as the untouched reference.

`OBJECTS_BY_DOMAIN`/`OBJECTS_SUB_BY_DOMAIN` — per-domain "objects discovered"
widget content (replaces a one-size-fits-all LLDP/OSPF/BGP/L3VPN list that
used to render for every domain regardless of what it actually discovers).

`TX_FAIL` — a dict of failure-code → `(ip, proto?) => {res, reason, action}`
closures, keyed `unreach|timeout|auth|parse|adapter|dupip`. `timeout`/`auth`/
`parse` branch on `proto.toUpperCase().includes('SNMP')` to preserve
Transport's exact original wording when `proto` is SNMP-flavored or omitted;
pass the domain's real protocol string for any new call site.

## Legacy Job (`legacy/app-data.js`, `JOBS`)

```ts
{ id, domain, site, scope, collector, cred, sched, next, last, dur,
  targets, clean, partial, fail,
  state: 'Completed' | 'Completed with errors' | 'Running' | 'No adapter',
  chip }
```
Invariant (asserted by a self-check IIFE at import): domain sums of `targets`
must equal `DISCOVERY_JOB_ROWS`' per-domain totals (RAN 8450, Core 340,
Transport 2180). Adding/editing a `JOBS` row without keeping this sum correct
will throw at import.

## Legacy Target (`legacy/app-data.js`, `TARGETS`)

```ts
{ ip, host, oem, model, circle, sync, fresh /* hours, drives sync */,
  job /* → JOBS.id */, domain,
  ch: ('ok'|'fail'|'na')[]  /* positional, length = CH_LEN_BY_DOMAIN[domain] */,
  out: 'Exact match'|'Drifted'|'Stale'|'Missing'|'Rogue'|'Unclaimed'|'No adapter',
  chip, reason?, isNew? }
```
`.sync` is computed at load (`t.sync = relativeTimestamp(t.fresh)`), not a
literal — don't hardcode a `.sync` string when adding a row, set `.fresh`
instead. `host` is `'—'` for ~109 unresolved-hostname rows — see `targetOf()`.

## Rule (`src/data/rules.ts`)

```ts
type RuleStatus = 'Draft'|'Review'|'Approved'|'Active'|'Executing'|'Suspended'|'Retired';
type RuleOrigin = 'Manual'|'Auto-generated'|'AI-suggested';
type RulePriority = 'High'|'Medium'|'Low';
type Operator = 'Equals'|'Not equals'|'Contains'|'Greater than'|'Less than'
              | 'Greater than or equal'|'Less than or equal';

interface Condition { id; sourceField; operator: Operator; targetField; connector?: 'AND'|'OR' }
interface ApprovalEvent { at; by; action: 'Submitted for review'|'Approved'|'Rejected'
                          |'Changes requested'|'Activated'|'Suspended'|'Retired'; note? }
interface ActivityEvent { at; by; event }
interface ExecutionRun { at; matched; exceptions; durationMs }

interface Rule {
  id; name; description; domain: DomainKey; source; target; ruleType;
  priority: RulePriority; status: RuleStatus; origin: RuleOrigin;
  owner; reviewer; approver; executor; exceptionReviewer;
  createdBy; createdDate; lastUpdated; lastExecution: string | null;
  conditions: Condition[]; expectedImpact: string;
  approvalHistory: ApprovalEvent[]; activity: ActivityEvent[]; executions: ExecutionRun[];
}
```
`RULE_LIFECYCLE` (ordered array) and `STATUS_TONE: Record<RuleStatus,
ChipTone>` are exported for any UI that needs to render the lifecycle rail or
a status chip — use these, don't hardcode the order/colors elsewhere.
`STATUS_NEXT: Record<RuleStatus, {role, action}>` names which role
(`owner`|`reviewer`|`approver`|`executor`) is responsible for the next action
at each status — this backs the "next action" banner on Rule Details; extend
it if you add a new status rather than hardcoding banner text per-status.
`MOCK_USERS` is the fixed roster used to populate owner/reviewer/approver/
executor/exceptionReviewer selects — add new names here, don't invent one
inline in a screen.

A self-check IIFE asserts every `RuleStatus` has at least one seed `RULES`
row — it validates the *original* array literal, not the live,
possibly-persisted-and-mutated array (it runs before `loadPersistedRules()`
overwrites `RULES`), so it won't catch a later edit that empties a status.

## Reconciliation ops (`src/data/reconciliationOps.ts`)

```ts
type ReconcileJobStatus = 'Completed'|'Completed with errors'|'Running'|'Scheduled';
interface ReconcileJob { id; domain; source; target; scanType; status: ReconcileJobStatus;
  schedule; lastRun; nextRun; duration; resultSummary; ruleIds: string[] }

type MatchOutcome = 'Matched'|'Attribute mismatch'|'Stale'|'Missing entity'|'Extra entity';
interface ReconcileResult { id; element; domain; outcome: MatchOutcome;
  mismatchedFields: string[]; verified; ruleId }

type ExceptionState = 'Rogue'|'Drifted'|'Missing'|'Duplicate'|'Unclaimed'|'No adapter';
type ExceptionSla = 'On track'|'At risk'|'Breached';
const DISPOSITIONS = [ /* 4 fixed mock actions, e.g. Accept network / Accept
  record / Raise workorder / Approve exception — same taxonomy as legacy
  app-data.js's EXCEPTIONS/DISPOSITIONS, extended with domain + ruleId */ ];
interface ReconcileException { id; state: ExceptionState; domain; subject;
  detected; owner; age: number; sla: ExceptionSla; next; ruleId }

exceptionsForRule(ruleId) = RECONCILE_EXCEPTIONS.filter(e => e.ruleId === ruleId)
resultsForRule(ruleId)    = RECONCILE_RESULTS.filter(r => r.ruleId === ruleId)
jobsForRule(ruleId)       = RECONCILE_JOBS.filter(j => j.ruleIds.includes(ruleId))
```

## Discrepancy / trust rows (`src/data/discoveryOverview.ts`)

```ts
type DiscrepancyCategory = 'EXISTENCE'|'ATTRIBUTE'|'RELATIONSHIP'|'FRESHNESS';
type AgeBand = '<1h'|'1-24h'|'1-7d'|'7-30d'|'>30d';
interface DiscrepancyTypeRow { label; category: DiscrepancyCategory; domain: DomainKey; count; ageBand }
interface DomainTrustRow { domain: DomainKey; inScope; unverified: number|null; inSync;
  trustIndexPct; open; mttrHours; touchlessPct }
interface CollectorRow { name; domain: DomainKey; targets; p95; checkin; status: 'Online'|'High latency' }
interface RootCauseFailure { cause; domain: DomainKey; targets; examples: string[]; action; tag: 'AUTH'|'NET'|'FGP' }
interface ReconcileCycleRow { domain: DomainKey; when; scanned; touchlessPct; drifted; autoResolved; queue }
```

## The other (older) taxonomy: `src/data/discovery.ts`

Still live, still imported by `RegionDevices.tsx`/`DiscoveredDevices.tsx`.
No `DomainKey` field anywhere — its own `Region = 'North'|'East'|'West'|'South'`.
Key exports: `REGIONS: RegionRow[]`, `STATE_DEVICES: StateDot[]`,
`VENDORS`, `MODELS`, `ATTENTION: AttentionRow[]`, `REGION_DEVICES:
RegionDevice[]` (generator output), `devicesIn(region)`,
`filterRegionDevices`/`filterIdentified`. Treat this as a parallel dataset,
not a source to unify with `discoveryOverview.ts` unless a task explicitly
asks for that (large, cross-cutting change).

## `domainDevices.ts` — parallel, not a view over Inventory

`DomainDevice = { id, name, ip, domain, region, status: 'Open'|'Unverified',
issue, lastScan }`. Generated independently (seeded off `DOMAIN_TRUST_ROWS`/
`REGION_DISCREPANCY`) purely to back `DomainDevices.tsx`'s drill-down —
**it shares no key or generation source with `src/data/physical.ts`'s
`NeRow`** (see the Inventory Skill). Do not assume editing one affects the
other, and do not assume a "device" here corresponds 1:1 to a Physical
Resources row of the same name.
