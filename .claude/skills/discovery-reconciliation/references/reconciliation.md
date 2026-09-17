# Reconciliation & Rules detail

## Rule Details screen (`src/screens/RuleDetails.tsx`)

Tabs (state-driven `TabBar`, not separate routes — a rule's sub-sections
don't need independent deep links):

1. **Overview** — basic info, description, source/target, origin badge. When
   `status === 'Review'`, also renders the review packet: definition, logic,
   owner, business description, "expected impact", and "previous changes"
   pulled from `approvalHistory` — plus the Approve/Reject/Request-changes
   buttons (only rendered in this state).
2. **Rule Logic** — `conditions[]` rendered read-only as `sourceField →
   operator → targetField` chains joined by AND/OR pills.
3. **Responsibilities** — owner/reviewer/approver/executor/exceptionReviewer,
   each a labeled row.
4. **Lifecycle** — the vertical stage rail (`Lifecycle.tsx` component,
   `.step`/`.step-dot` CSS in `shell.css`), each stage annotated with who/when
   if reached, driven by `RULE_LIFECYCLE` + the rule's `approvalHistory`.
5. **Execution** — `executions: ExecutionRun[]` as a small table.
6. **Exceptions** — `exceptionsForRule(rule.id)` rows, same rendering as
   `ReconciliationExceptions.tsx`; row click routes to
   `/discovery/reconcile/exceptions?ruleId=${rule.id}` (round-trip).
7. **Activity** — `activity: ActivityEvent[]` rendered with `Timeline.tsx`
   (the same dot-and-line visual as Insights' "Reconciliation cycles" card,
   factored out so it isn't copy-pasted a third time).

A "next action" banner sits above all tabs: `Status: {status} · Responsible:
{role} · Next action: {text}`, left-accent bar colored by `STATUS_TONE`. The
`{role}`/`{text}` come from `STATUS_NEXT[status]` — extend that map, don't
hardcode a new banner string, if you add a status.

## `transition(status, action, note?)` — the only status-mutation path

```ts
const transition = (status: RuleStatus, action: ApprovalEvent['action'], note?: string) => {
  rule.approvalHistory.unshift({ at: nowStamp(), by: rule.reviewer, action, note });
  rule.activity.unshift({ at: nowStamp(), by: rule.reviewer, event: `${action}...` });
  rule.status = status; rule.lastUpdated = nowStamp();
  persistRules(); rerender();
};
```
Every call attributes the action to `rule.reviewer` — there is no separate
"acting user" concept in this mock. Wired buttons today:

```
status === 'Review'   → Approve            → transition('Approved', 'Approved')
                       → Reject             → transition('Draft', 'Rejected', 'Sent back to the owner')
                       → Request changes    → transition('Draft', 'Changes requested', 'Reviewer asked for changes')
status === 'Approved' → Activate rule      → transition('Active', 'Activated')
```
No button exists for `Draft → Review`, `Active → Executing`, any `→
Suspended`, or any `→ Retired`. If a task asks for one of these, add a
button following the exact same `transition(...)` call shape next to the
existing conditional blocks — don't build a parallel mutation path.

## Rule Definition (`src/screens/RuleDefinition.tsx`) — create/edit

- Route `rulenew` (`/discovery/reconcile/rules/new`) and `ruleedit`
  (`/discovery/reconcile/rules/:id/edit`), same component.
- Condition builder: `useState<Condition[]>`, one row per condition
  (`sourceField` → `operator` (from `OPERATORS`) → `targetField`), an AND/OR
  connector control between consecutive rows, "Add condition" button, and a
  per-row remove button — modeled on the legacy Capex/Opex add/remove-row
  editor's *interaction pattern* (array of rows, Add/remove buttons, plain
  inputs), not its code.
- Role-assignment section: Owner/Reviewer/Approver/Executor/Exception
  Reviewer, each a `<select>` of `MOCK_USERS`.
- **Create**: `RULES.push(newRule)`, `status: 'Draft'`, `origin: 'Manual'`
  (anything created through this form is Manual, never Auto-generated/
  AI-suggested — those origins only exist in seed data), then
  `persistRules()`, then navigate to Rule Details.
- **Edit**: `Object.assign(editing, {...})` — mutates the existing `Rule`
  object in place (identity preserved, so any other live reference to it
  updates too), appends a `'Rule definition edited'` activity event, then
  `persistRules()`. **Never changes `status`.**

## The hyperlink cross-link map

| From | To |
|---|---|
| Insights "Discovery jobs" row | Scan Jobs, via `PRIMARY_JOB_ID[domain]` + `legacyPath('jobs', {...})` (Insights picks one representative job per domain — a domain's `DISCOVERY_JOB_ROWS` entry is a rollup with no single 1:1 job) |
| Scan Jobs row → "View targets" (kebab) | Scan Targets filtered to that job |
| Scan Targets row → "View transcript" | Target transcript (`targetOf`/`txStepsFor`) |
| `ReconciliationJobs` row | `/discovery/reconcile/rules/${j.ruleIds[0]}` |
| `ReconciliationResults` row | `/discovery/reconcile/rules/${r.ruleId}` |
| `ReconciliationExceptions` drawer button | `/discovery/reconcile/rules/${open.ruleId}` |
| `RuleDetails` Exceptions tab row | `/discovery/reconcile/exceptions?ruleId=${rule.id}` (round-trip, filtered via `urlRuleId` in `ReconciliationExceptions.tsx`) |
| `RuleDetails` Execution tab | same page (Rule→Execution by construction, no navigation) |
| `ReconciliationExceptions` drawer "source/target record" | `/inventory/resource/:name`, resolved via `subjectHost()` parsing the free-text `subject` field — can fail to resolve for a mock element; that's expected |

When adding a new cross-link, follow this table's existing id-based pattern
(`ruleId`, `ruleIds[]`) — never link two mock records by matching on a
human-readable label/name string.

## Product-concept audits already performed (don't re-litigate without new evidence)

A prior pass checked whether each domain's rules/exceptions actually match
that domain's real collector family, since it's easy for a rule's prose to
describe a protocol the domain's collectors don't produce. Fixed examples,
useful as a template for future domain-fit checks:

- `RUL-CORE-002` ("NF profile drift") — was generic router "config
  checksum/baseline" logic; rewritten to compare a live NF's registered
  PLMN/slice (via REST/NRF) against inventory, since Core has no
  checksum/baseline analogue.
- `RUL-IPM-001` ("PE router LDP peer match") — referenced LLDP, a protocol
  only in Transport's collector list; rewritten to match an LDP peer session
  via SNMP MPLS-LDP-MIB, which IP/MPLS's real collectors produce.
- `RUL-TRN-002` ("Undocumented wavelength sweep") — claimed to work without
  the (suspended) TL1 adapter but its conditions still required TL1 fields;
  rewritten to key off Hardware/Service facts Transport's baseline
  (non-TL1) collectors already gather. `RUL-TRN-001`, by contrast, is
  legitimately TL1-dependent and correctly `Suspended` — left unchanged.

The lesson generalizes: before writing or editing a rule's `conditions`,
`source`, or `target`, check that domain's entry in
`[[domain-model.md]]`'s collector table — a rule referencing a protocol
outside that domain's collector list is very likely wrong, not a legitimate
"cross-domain" check.
