# INVENTORY v5 — TABLE USAGE, SCREEN MAPPING AND MOCK-API GUIDE

**Database:** `inventory_schema_v5.sql` (revision 2, 2026-09-27), 106 tables, as loaded into `inventory_27sep`
**Frontend:** NetSingularity Discovery & Inventory (React 19, `src/routes.ts`)
**Companion documents:** `DATABASE_UI_MODULE_IDEATION.md` (module and API design), `INVENTORY_DATABASE_MODULE_CATEGORIZATION.md` (ownership analysis over the v4 dump)
**Date:** 2026-09-27

This document answers three questions for every table in the database:

1. What is the table for, in the language of the screens?
2. Which screen (existing route or proposed module) reads or writes it, and who owns the data?
3. When the owning module's integration is not available yet, which mock API is enough for the UI to work?

It also settles the open question on `TEAM` / `TEAM_MEMBER` and the other tables that could arguably belong to another module.

---

## 1. How to read the mock-API column

The UI never talks to the database. Every screen goes through a module service interface with two implementations, `MockXService` (in-memory, seeded from `src/mock`) and `ApiXService` (HTTP). Three situations occur:

| Owner of the table | Real path | Until the real path exists |
|---|---|---|
| **Inventory** | Inventory API (Spring Boot over this database) | `MockXService` of the module; the mock store is seeded from the dummy data in this file |
| **Another module (User Management, Passive Inventory, Open/CoPEX)** | Their API, or a CDC copy landing in a reference table | A mock of *their* contract (`MockTeamService`, `MockPassiveService`, `MockCopexService`); the UI code is identical either way |
| **Integration layer (Discovery, Reconciliation, Reporting engines)** | Integration API exposing read models and actions | A mock that also simulates the engine (a run that completes on a timer, an action that appends an event) |

"Mock API when integration is not available" in the matrix names the exact mock that is sufficient. Reference catalogs are mocked directly from the seed rows in the SQL file, so they need no separate fixture.

---

## 2. Decision: TEAM and TEAM_MEMBER

### 2.1 What the schema says [Schema]

- `TEAM` (code, name) is referenced by three foreign keys: `RECONCILIATION_EXCEPTION.OWNER_TEAM_ID_FK`, `RECONCILIATION_RULE.EXCEPTION_REVIEWER_TEAM_ID_FK`, `SITE_ISSUE.OWNER_TEAM_ID_FK`. Its comment says: *owning team or queue for exceptions and rules; "Unassigned" is the absence of a team*.
- `TEAM_MEMBER` (team, user, role LEAD / MEMBER) is referenced by nothing. Only `TEAM` and `USER` point into it.

### 2.2 What the UI needs [Confirmed from `src/`]

- The Exceptions screen shows an **owner** and an **assignee**; the Rules screens show owner / reviewer / approver / executor / exception-reviewer. Today all of these are people (`MOCK_USERS`). Nothing in the UI lists team members or administers teams.
- The only place membership matters is a picker: when an exception is assigned to a person, the natural default list is "people in the owner team".

### 2.3 Verdict

| Table | Decision | Reason |
|---|---|---|
| `TEAM` | **Keep, as a CDC reference copy owned by User Management** (same pattern as `USER`) | Three FK columns need a local row; an exception queue and an approver group are organisational groups, which is exactly what User Management owns. Inventory never creates teams; it receives them. |
| `TEAM_MEMBER` | **Not required in Inventory. Recommend removing it in the next schema revision** | No Inventory table depends on it, no screen lists it, and membership is a User Management fact. The one UI need (assignee picker) is served by a User Management API call `GET /api/um/groups/{id}/members`, mocked until then. Keeping a local copy would create a second source of truth for membership. |

The same logic decides the other "could be another module" tables:

| Table | Could belong to | Verdict for v5 | Why |
|---|---|---|---|
| `USER` | User Management | Keep as CDC reference copy | 13 FK columns; no PII stored |
| `TENANT` | Platform / User Management | Keep as reference copy | Root of every `CUSTOMER_ID` |
| `OPERATIONAL_AREA`, `GEOGRAPHY_LEVEL1..4` | Master-data or User Management scoping service | Keep, **validate** whether a master-data owner exists; if yes, become CDC copies | `SITE` binds to `GEOGRAPHY_LEVEL4`; the circle filter is used app-wide |
| `VENDOR`, `PRODUCT_MODEL` | Shared catalog / vendor feed | Keep, **validate** | Passive Inventory and Open/CoPEX need the same vendors; a shared catalog owner would make these CDC copies |
| `RESOURCE_ASSET` | Open/CoPEX (purchase cost, PO) | Keep, **validate** column split | Asset tag and warranty are operational; cost and PO are financial |
| `RACK`, `ANTENNA`, `POWER_FEED` | Passive Inventory | Keep, **validate** | Device placement and cell-antenna binding depend on them; proxies would be needed first |
| `SITE_CONTACT` | none (external contacts, not users) | Keep | PII is encrypted; not a User Management concern |
| `SITE_ISSUE` | Rollout / project tool | Keep, **validate** source | Currently UI-raised |
| `NETWORK_ELEMENT_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER` | Orchestrator | Keep, state read-only | Lifecycle actions would call the orchestrator |
| `SCAN_*`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEFINITION` | Discovery service (NiFi / Spark) | Keep for now | UI needs the read models; physical location of the tables is an infrastructure decision |
| `RECONCILIATION_JOB*`, `RECONCILIATION_RUN*`, `RECONCILIATION_RESULT*` | Reconciliation service | Keep for now | as above |
| `RECONCILIATION_RULE*`, `RECONCILIATION_EXCEPTION` | Reconciliation module, if one is carved out | Keep in Inventory | People-governed business objects that protect the golden record |
| `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT` | Reporting service | Keep for now | Read models for Reports and Insights |
| `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REFERENCE` | Integration layer | Keep in Inventory | They are the anchor every cross-module link hangs on |

### 2.4 Change to apply when you are ready (not applied to the loaded database)

```sql
-- TEAM_MEMBER is not required by Inventory; membership is a User Management fact served by API.
DROP TABLE TEAM_MEMBER;
ALTER TABLE TEAM COMMENT = 'Reference copy of a User Management group used as owner queue for exceptions, exception-reviewer team of a rule and owner of a site issue; rows arrive by CDC and are never created here. [v5 rev 3]';
```

If User Management turns out not to model groups at all, `TEAM` stays Inventory-owned as a small admin list and `TEAM_MEMBER` can be reinstated. Nothing else in the schema changes either way.

---

## 3. Screen-by-screen map

Route keys are those in `src/routes.ts`; "new" marks screens proposed in the ideation document. **R** = the screen reads the table, **W** = the screen creates or edits rows, **A** = the screen triggers an action that the owning engine executes.

### 3.1 Discovery & reconciliation

| Screen (route) | Tables | Owner of the data | Integration needed | Enough for now |
|---|---|---|---|---|
| Insights (`insights` + drill-downs `regiondevices`, `discovereddevices`, `domaindevices`, `subdomaindevices`, `discrepancydetails`) | R `DOMAIN_TRUST_SNAPSHOT`, `COLLECTOR`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_TARGET`, `RECONCILIATION_RUN`, `RECONCILIATION_EXCEPTION`, `DISCREPANCY_TYPE`, `NETWORK_ELEMENT` (counts), `OPERATIONAL_AREA`, `DOMAIN` | Integration read models + Inventory counts | Discovery and Reconciliation services for live figures | `MockInsightsService` computing the cards from the other mock stores |
| Scan jobs (`jobs`) | R/W `SCAN_JOB`, `SCAN_JOB_SCOPE`; R `COLLECTOR`, `CREDENTIAL_PROFILE`, `EXTERNAL_SYSTEM`, `OPERATIONAL_AREA`, `SCAN_RUN`; A run / hold / resume | Discovery service | Yes: job contract and action semantics | `MockScanJobService` (run creates a RUNNING run, completes on a timer) |
| Scan targets (`targets`) | R `SCAN_TARGET`, `SCAN_RUN_TARGET`, `NETWORK_ELEMENT` (matched), `VENDOR` | Discovery service | Yes | `MockScanJobService.targets()` |
| Target transcript (`target`) | R `SCAN_STEP_RESULT`, `DISCOVERY_STEP_DEFINITION`, `SCAN_STEP_PAYLOAD` (permissioned) | Discovery service | Yes | `MockScanJobService.steps()`; payload as a stub string |
| Reconciliation overview (`reconcile`) | R `RECONCILIATION_RESULT` (aggregates), `RECONCILIATION_RUN`, `RECONCILIATION_EXCEPTION`, `DOMAIN`, `OPERATIONAL_AREA` | Reconciliation service | Yes for live aggregates | `MockReconciliationService.overview()` |
| Reconciliation jobs (`reconcilejobs`) | R/W `RECONCILIATION_JOB`, `RECONCILIATION_JOB_RULE`; R `RECONCILIATION_RUN`, `SCAN_RUN`; A run | Reconciliation service | Yes | `MockReconciliationService` |
| Reconciliation results (`reconcileresults`) | R `RECONCILIATION_RESULT`, `RECONCILIATION_RESULT_FIELD`, `RECONCILIATION_STATE_MAP`, `RESOURCE` (subject link), `SCAN_TARGET` | Reconciliation service | Yes | `MockReconciliationService.results()` |
| Reconciliation exceptions (`reconcileexceptions`) | R `RECONCILIATION_EXCEPTION`, `DISCREPANCY_TYPE`, `TEAM`, `USER`, `RECONCILIATION_RESULT_FIELD`; A assign / dispose / raise work order | Inventory (workflow) + engine (creation) | Engine creates and auto-resolves; User Management for teams and people | `MockReconciliationService.exceptions()` + `MockTeamService`, `MockUserService` |
| Rules list / definition / details (`rules`, `rulenew`, `ruleedit`, `ruledetails`) | R/W `RECONCILIATION_RULE`, `RECONCILIATION_RULE_CONDITION`; R `RECONCILIATION_RULE_EVENT`, `RECONCILIATION_RULE_TRANSITION`, `RECONCILIATION_FIELD`, `RECONCILIATION_RUN_RULE`, `RECONCILIATION_JOB_RULE`, `USER`, `TEAM`; A submit / approve / reject / request-changes / activate / suspend / resume / retire | Inventory | Engine only for EXECUTING flips; User Management for people and teams | `MockRuleService` deriving allowed actions from the transition seed |
| Discovery reports (`discoveryreports`, `discoveryreport`) | R/W `REPORT_DEFINITION`; R `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT`; A run | Inventory (catalogue) + Reporting service (runs) | Reporting service | `MockReportService` (run → COMPLETED with stub file) |

### 3.2 Inventory

| Screen (route) | Tables | Owner of the data | Integration needed | Enough for now |
|---|---|---|---|---|
| Location list (`location`), Site create | R/W `SITE`; R `SITE_TYPE`, `GEOGRAPHY_LEVEL1..4`, `OPERATIONAL_AREA` | Inventory (+ master data to validate) | None for the screen; CDC if a master-data owner exists | `MockSiteService`, `MockReferenceService` |
| Site details (`site`) | R `SITE`, `SITE_CONTACT`, `SITE_ISSUE`, `TEAM`, `NETWORK_ELEMENT` (counts), `RESOURCE_EXTERNAL_REFERENCE` | Inventory | User Management for teams | `MockSiteService` |
| Facility (`sitedetails`) | R/W `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`; R `NETWORK_ELEMENT` (rack positions), `EXTERNAL_RESOURCE` (power units) | Inventory; Passive Inventory for power units | Passive Inventory API for power-unit detail | `MockSiteService` + `MockPassiveService` (proxies only) |
| Site equipment (`siteequipment`) | R `NETWORK_ELEMENT`, `RACK`, `EQUIPMENT_COMPONENT`, `PORT` | Inventory | none | `MockNetworkElementService` |
| Node view (`node`) | R `NETWORK_ELEMENT`, `EQUIPMENT_COMPONENT`, `PORT`, `LINK`, `RESOURCE_FIELD_PROVENANCE`, `NETWORK_ELEMENT_HEALTH` | Inventory + Discovery (provenance, health) | Discovery writes provenance and health | `MockNetworkElementService` |
| Capex / Opex (`capex`, `opex`) | **no table in this database** | Open/CoPEX module | Yes: Open/CoPEX API | `MockCopexService` (plans, lines, actuals per site and financial year) — see §6 |
| Physical Resources (`physical`) and Element (`resource`) | R/W `NETWORK_ELEMENT` + 11 `NETWORK_ELEMENT_*_DETAIL`, `EQUIPMENT_COMPONENT`, `PORT`, `PORT_IP_ADDRESS`, `PORT_VLAN`; R `NETWORK_ELEMENT_HEALTH`, `NETWORK_ELEMENT_MOVEMENT`, `NETWORK_ELEMENT_STOCK_TRANSITION`, `NETWORK_ELEMENT_CLASS`, `VENDOR`, `PRODUCT_MODEL`, `PRODUCT_MODEL_POLICY`, `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_TECHNOLOGY`, `RESOURCE_RELATIONSHIP`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_EXTERNAL_REFERENCE`; A move / decommission | Inventory (discovery writes discovered rows) | Discovery for health and provenance; Passive for power-unit proxy | `MockNetworkElementService` |
| Virtual Resources (`virtual`, `vnfdetails`, `vnflifecycle`) | R `NETWORK_ELEMENT` (virtual), `NETWORK_ELEMENT_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER`, `NETWORK_ELEMENT_CORE_DETAIL`, `NETWORK_ELEMENT_SERVER_DETAIL`, `NETWORK_FUNCTION_TYPE`; A lifecycle operations | Inventory; orchestrator for lifecycle | Orchestrator API (validate) | `MockVirtualService` (actions flip INSTANTIATION_STATE locally) |
| Cell 4G / 5G details (`cell4gdetails`, `cell5gdetails`) and RAN Inventory (new) | R/W `RADIO_CELL`, `RADIO_SECTOR`, `ANTENNA`; R `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `PLMN`, `NETWORK_SLICE`, `FREQUENCY_BAND`, `TECHNOLOGY`, `NETWORK_ELEMENT_RAN_DETAIL`, `EXTERNAL_RESOURCE` (antenna mount) | Inventory; EMS discovery for parameters | Passive Inventory for mount assets | `MockRanService` |
| Passive Infrastructure (`passive`, `odf`, `power`, `cord`, `splice`, `duct`, `fiber`) | R `EXTERNAL_RESOURCE`, `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE` (proxies); `rack` route → `RACK` | Passive Inventory / fiber app | **Yes**: Passive Inventory API for everything beyond the label | `MockPassiveService` returning proxy lists plus a mocked detail per object type — see §6 |
| Links (`links`) | R/W `LINK`, `LINK_PROTOCOL_ATTRIBUTE`, `LINK_MICROWAVE_ATTRIBUTE`; R `LINK_LAYER`, `NETWORK_ELEMENT`, `PORT` | Inventory (discovery writes adjacencies) | none for the screen | `MockLinkService` |
| Services (`services`) | R/W `SERVICE_INSTANCE`, `SERVICE_ENDPOINT`; R `SERVICE_TYPE`, `NETWORK_SLICE`, `VRF`, `IP_SUBNET` | Inventory | LCM / discovery write discovered services | `MockServiceService` |
| IP & Logical (new) | R/W `IP_SUBNET`, `VLAN`, `VRF`; R `PORT_IP_ADDRESS`, `PORT_VLAN` | Inventory | none | `MockIpamService` |
| Relationships & Impact (new, tab + drawer) | R/W `RESOURCE_RELATIONSHIP`; R `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE`, `RESOURCE`, `RESOURCE_CLASS` | Inventory | none | `MockRelationshipService` |
| Inactive inventory (`inactive`) | R `NETWORK_ELEMENT`, `NETWORK_ELEMENT_MOVEMENT`, `PORT`, `LINK`, `SERVICE_INSTANCE`, `RECONCILIATION_EXCEPTION`; A recover | Inventory | none | Derived from the other mock stores |
| Inventory reports (`reports`, `inventoryreport`) | as Discovery reports | Inventory + Reporting service | Reporting service | `MockReportService` |
| Integrations (new, admin) | R `EXTERNAL_SYSTEM`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REFERENCE`, `EXTERNAL_OBJECT_TYPE` | Integration layer | Yes | `MockIntegrationService` |
| Administration (new) | R `USER`, `TEAM`; R/W `OPERATIONAL_AREA`, `GEOGRAPHY_LEVEL1..4`, `PRODUCT_MODEL_POLICY`, `ATTRIBUTE_DEFINITION`; R `VENDOR`, `PRODUCT_MODEL` | Inventory + User Management + master data | User Management for users and teams | `MockAdminService` |

---

## 4. Which screens need another module, and what is enough meanwhile

| Screen | Module it depends on | What is exchanged | Mock that is enough |
|---|---|---|---|
| Capex, Opex | **Open / CoPEX** | site id and financial year out; plan header, lines, monthly actuals in | `MockCopexService`: `getCapexPlan(siteId, fy)`, `getOpexPlan(siteId, fy)`, optional `getCapexLinesForResource(resourceId)` |
| Passive Infrastructure (ODF, Power plant, Patch cords, Ducts, Fiber spans, Splice), Facility power, Antenna mount, Power controller | **Passive Inventory** (and fiber app) | site id out; proxy list (id, type, label, last sync) always available from `EXTERNAL_RESOURCE`; full attributes and deep link from the module | `MockPassiveService`: `listProxies(siteId, objectType)`, `getAsset(externalId)`, `getRackOccupancy(rackCode)`, `getPowerUnit(externalId)`, `getPatchCords(portId)`; deep link opens the mocked URL |
| Rules (roles), Exceptions (owner team, assignee), Site issues (owner team), Administration | **User Management** | user id → display name / status (CDC copy of `USER`); group id → name (CDC copy of `TEAM`); group members and roles by API | `MockUserService.list()`, `MockTeamService.list()`, `MockTeamService.members(teamId)`, `MockUserService.roles(userId)` — static lists |
| Scan jobs, Scan targets, Target transcript, Insights collector and failure cards | **Discovery service** | job definitions and actions out; runs, target outcomes, steps, health, provenance in | `MockScanJobService` with a simulated scheduler |
| Reconciliation overview, jobs, results; Exceptions creation; Rule EXECUTING flips | **Reconciliation service** | job definitions and run action out; runs, results, fields, exceptions in | `MockReconciliationService` with a simulated run |
| Reports (runs and downloads), Insights trust trend | **Reporting service** | run request out; run status, file, KPI series in | `MockReportService`, `MockInsightsService` |
| Virtual Resources lifecycle operations | **Orchestrator** (validate) | instance id and operation out; instantiation state in | `MockVirtualService` |
| Location filters, Site create geography, circle filters | **Master data** (validate) | geography and operational-area trees in | `MockReferenceService` from the dummy rows |

Screens that need **no** other module (Inventory API mock is enough): Location list, Site details (except team names), Site equipment, Node view (except provenance/health freshness), Physical Resources, Element, Links, Services, IP & Logical, Relationships & Impact, Inactive inventory, RAN Inventory (except antenna mount labels).


---

## 5. Table-by-table matrix (all 106 tables)

Owner values: **Inventory** (written through Inventory API), **Inventory (seeded catalog)** (global reference rows shipped with the schema), **User Management (CDC copy)**, **Shared master data (validate)**, **Integration: Discovery / Reconciliation / Reporting service** (pipelines write, UI reads), **Integration layer (registry)**, **Passive Inventory (proxy only)**.

| # | Table | Used for | Screens / UI usage | Owner | Integration required from | Mock API when integration is not available | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `ANTENNA` | Installed antenna with azimuth, tilts, RET, mount proxy | RAN Inventory: antennas per site; cell detail | Inventory (validate: Passive may own the physical asset) | Passive Inventory for the mount asset (proxy) and possibly the antenna itself | GET /api/sites/{id}/antennas mocked |  |
| 2 | `ATTRIBUTE_DEFINITION` | Tenant custom attribute schema | Admin: Custom attributes; Element detail Attributes tab | Inventory | none | Inventory API mocked (MockXService over src/mock) |  |
| 3 | `CELL_ANTENNA` | Antennas a cell radiates through | Cell detail antennas list | Inventory | none | embedded in cell DTO (mock) |  |
| 4 | `CELL_RADIO_UNIT` | Radio units transmitting a cell | Cell detail radio units list | Inventory | EMS discovery | embedded in cell DTO (mock) |  |
| 5 | `CLOUD_CLUSTER` | Edge cloud / subcloud hosting VNFs | Virtual Resources: cluster column, cluster detail | Inventory | Orchestrator (validate) | GET /api/cloud-clusters mocked |  |
| 6 | `COLLECTOR` | Collector node health | Insights Collector health card; Scan job collector picker | Integration: Discovery service | Collector fleet | GET /api/collectors mocked | Read-only |
| 7 | `CREDENTIAL_PROFILE` | Access profile (vault reference only) | Scan job form credential picker; credential list | Integration: Discovery service | Vault (rotation), Discovery | GET/POST /api/credential-profiles mocked (no secrets) |  |
| 8 | `DISCOVERY_STEP_DEFINITION` | Collector steps per domain in execution order | Target transcript: rows and their order | Inventory (seeded catalog) | Discovery service owns the catalog | Reference API mocked from the seed rows in this file |  |
| 9 | `DISCREPANCY_TYPE` | Exception types by category and domain | Insights Discrepancies drill-down, Exceptions type filter | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file | Not seeded in dump; dummy data adds 6 |
| 10 | `DOMAIN` | Network domain taxonomy (RAN, Core, Transport, IP/MPLS, Optical, Microwave, Fixed access, IT/cloud, Facility) | Every domain filter, tab and colour: Insights, Scan jobs/targets, Reconciliation, Rules, Physical/Virtual Resources, Links, Services | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file | Frontend DomainKey must grow from 4 to 9 codes |
| 11 | `DOMAIN_TRUST_SNAPSHOT` | Daily trust KPIs per domain | Insights trust trend chart; Inventory trust executive report | Integration: Reporting service | Nightly aggregation job | GET /api/insights/trust-trend mocked series | Read-only |
| 12 | `EQUIPMENT_COMPONENT` | Chassis / slot / card / optic tree incl. empty slots | Element detail Hardware tab; Node view | Inventory | Discovery writes hardware tree | GET /api/network-elements/{id}/components mocked |  |
| 13 | `EXTERNAL_OBJECT_TYPE` | Kinds of externally owned objects per system type | Proxy views (Passive, fiber): type labels | Inventory (seeded catalog) | Integration layer | Reference API mocked from the seed rows in this file |  |
| 14 | `EXTERNAL_RESOURCE` | Proxy (ids + label) of an object owned elsewhere: passive assets, power units, fiber spans, CMDB CIs | Passive Infrastructure screens (ODF, Power plant, Ducts, Fiber spans, Splice) as proxy views; antenna mount; power detail | Passive Inventory (proxy only) / fiber app | Passive Inventory API and fiber app for anything beyond the label | GET /api/external-resources?systemType=&objectType= mocked; detail = deep link | The pattern that replaced the removed passive tables |
| 15 | `EXTERNAL_SYSTEM` | Registry of every external system (EMS, Passive Inventory, Finance, IAM, fiber app ...) | Integrations screen; discovery source picker; "also known in" labels | Integration layer (registry) | Integration layer | GET /api/external-systems mocked | Registration CRUD pending validation |
| 16 | `FLOOR` | Floor of a site | Facility tab | Inventory | none | GET /api/sites/{id}/floors mocked |  |
| 17 | `FREQUENCY_BAND` | Bands per technology | RAN Inventory: cell band picker and filter | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 18 | `GEOGRAPHY_LEVEL1` | Country / state | Location filters, Site create geography cascade, Insights region drill-down | Shared master data (validate) | Master-data owner if one exists (CDC) | GET /api/ref/geo?level=1 mocked |  |
| 19 | `GEOGRAPHY_LEVEL2` | District / city | as LEVEL1 | Shared master data (validate) | as LEVEL1 | GET /api/ref/geo?level=2 mocked |  |
| 20 | `GEOGRAPHY_LEVEL3` | Locality | as LEVEL1 | Shared master data (validate) | as LEVEL1 | GET /api/ref/geo?level=3 mocked |  |
| 21 | `GEOGRAPHY_LEVEL4` | Cluster / pin area with morphology; SITE binds here | Site create (mandatory), Location list geo column | Shared master data (validate) | as LEVEL1 | GET /api/ref/geo?level=4 mocked |  |
| 22 | `IP_SUBNET` | IP prefix per routing context | IP & Logical (IPAM) subnet tree | Inventory | Discovery | GET /api/ip-subnets mocked | IPAM scope itself pending validation |
| 23 | `LINK` | Connection between two devices at one layer | Links screen (tabs by layer category), Element Links tab, Node view topology | Inventory | Discovery writes LLDP / OSPF / BGP adjacencies | GET /api/links mocked |  |
| 24 | `LINK_LAYER` | Kinds of link (45) grouped by category | Links screen tabs and layer filter | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 25 | `LINK_MICROWAVE_ATTRIBUTE` | Hop attributes of a microwave link | Link drawer microwave section | Inventory | none | embedded in link DTO (mock) | No dummy rows |
| 26 | `LINK_PROTOCOL_ATTRIBUTE` | BGP / OSPF / IS-IS attributes of a routing adjacency | Link drawer protocol section | Inventory | Discovery | embedded in link DTO (mock) |  |
| 27 | `NETWORK_ELEMENT` | Golden record of every device or network function | Physical Resources, Element, Node view, Virtual Resources, Site equipment, Inactive inventory, Insights counts, Scan target match, Reconciliation subject | Inventory | Discovery writes discovered rows and LAST_SEEN / RECONCILIATION_STATE | GET/POST/PUT /api/network-elements + actions/move mocked | Aggregate root; 22 referencing tables |
| 28 | `NETWORK_ELEMENT_CLASS` | Device classes (25) and which detail table each uses | Physical Resources tabs, Element detail panel selection, Create/Edit NE class picker | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 29 | `NETWORK_ELEMENT_CLASS_DOMAIN` | Allowed (class, domain) pairs | NE create/edit: class picker filtered by domain | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 30 | `NETWORK_ELEMENT_CORE_DETAIL` | Core NF type, redundancy, pool, capacity | Virtual Resources view; Element detail Core panel | Inventory | Discovery | embedded in DTO (mock) |  |
| 31 | `NETWORK_ELEMENT_HEALTH` | Latest reachability and NTP check | Element header health strip; Insights collector/failure cards | Integration: Discovery service | Collector writes it | GET /api/network-elements/{id}/health mocked | Read-only |
| 32 | `NETWORK_ELEMENT_IP_MPLS_DETAIL` | Router role, IGP, MPLS flags, AS number, redundancy | Element detail Router panel | Inventory | Discovery | embedded in DTO (mock) |  |
| 33 | `NETWORK_ELEMENT_MICROWAVE_DETAIL` | Microwave terminal attributes | Element detail Microwave panel | Inventory | Discovery | embedded in DTO (mock) | No dummy rows |
| 34 | `NETWORK_ELEMENT_MOVEMENT` | Append-only stock movement trail with work order | Element detail Movements tab; Inactive inventory history | Inventory | Work-order system may post installs (validate) | POST .../actions/move appends to mock store | Application enforces append-only (no triggers in v5) |
| 35 | `NETWORK_ELEMENT_OPTICAL_DETAIL` | ROADM / OTN attributes, wavelengths, protection | Element detail Optical panel | Inventory | TL1 discovery | embedded in DTO (mock) |  |
| 36 | `NETWORK_ELEMENT_PON_DETAIL` | OLT / ONU / ONT attributes and PON tree | Element detail PON panel; fixed-access tree | Inventory | Discovery | embedded in DTO (mock) | No dummy rows |
| 37 | `NETWORK_ELEMENT_POWER_DETAIL` | Monitored power controller; links to the Passive power-unit proxy | Element detail Power panel; Facility power | Inventory | Passive Inventory for the power unit (proxy) | embedded in DTO (mock); proxy label from EXTERNAL_RESOURCE mock |  |
| 38 | `NETWORK_ELEMENT_RAN_DETAIL` | RAN node attributes (deployment, architecture, node id, PLMN, sync, backhaul) | Element detail: RAN panel for BTS..RADIO_UNIT classes | Inventory | EMS discovery | embedded in network-element DTO (mock) |  |
| 39 | `NETWORK_ELEMENT_SECURITY_DETAIL` | Firewall role, HA peer, capacities | Element detail Security panel | Inventory | Discovery | embedded in DTO (mock) | No dummy rows |
| 40 | `NETWORK_ELEMENT_SERVER_DETAIL` | Compute host capacity, hypervisor, cluster | Virtual Resources hosts; Element detail Server panel | Inventory | Discovery | embedded in DTO (mock) |  |
| 41 | `NETWORK_ELEMENT_STOCK_TRANSITION` | Allowed stock-state moves | Element detail: which Move actions are offered; Inactive inventory recover action | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 42 | `NETWORK_ELEMENT_SWITCH_DETAIL` | Switch role, STP, stacking, PoE | Element detail Switch panel | Inventory | Discovery | embedded in DTO (mock) |  |
| 43 | `NETWORK_ELEMENT_VIRTUAL_INSTANCE` | VNF / CNF instance: UUID, descriptor, cluster, host, instantiation state | Virtual Resources view and lifecycle screen | Inventory | Orchestrator owns INSTANTIATION_STATE and lifecycle actions (validate) | GET /api/virtual-instances/{id} mocked; lifecycle actions mocked as state flips |  |
| 44 | `NETWORK_ELEMENT_WIFI_DETAIL` | Access point / WLAN controller attributes | Element detail Wi-Fi panel | Inventory | Discovery | embedded in DTO (mock) | No dummy rows |
| 45 | `NETWORK_FUNCTION_TYPE` | Core network-function catalog (AMF, SMF, HSS ...) | Virtual Resources: NF type column and filter | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 46 | `NETWORK_SLICE` | 5G slice (S-NSSAI) of a PLMN | Services: Slices tab; RAN cell drawer | Inventory | none | GET /api/network-slices mocked |  |
| 47 | `OPERATIONAL_AREA` | Region > Circle > Zone > Division > Territory ownership hierarchy | The circle / region filter on Location, Scan jobs, Insights region table; credential profile scope | Shared master data (validate) | User Management scoping or master data (validate) | GET /api/ref/operational-areas mocked as a tree |  |
| 48 | `PLMN` | Operator PLMNs (MCC + MNC) | RAN Inventory: PLMN admin; cell drawer | Inventory | none | GET /api/plmns mocked |  |
| 49 | `PORT` | Device interfaces (physical and logical) | Element detail Ports tab; Node view; link and service endpoints | Inventory | Discovery | GET /api/network-elements/{id}/ports mocked | Passive ODF/DDF ports are now proxies in Passive Inventory |
| 50 | `PORT_IP_ADDRESS` | IP on an interface and its subnet | Ports tab; IP & Logical | Inventory | Discovery | embedded in port DTO (mock) |  |
| 51 | `PORT_VLAN` | VLAN membership of a port | Ports tab; VLAN list | Inventory | Discovery | embedded in port DTO (mock) |  |
| 52 | `POWER_FEED` | AC / DC feed of a site with rating and load | Facility tab power panel | Inventory (validate) | Passive Inventory if facility power moves | GET /api/sites/{id}/power-feeds mocked |  |
| 53 | `PRODUCT_MODEL` | Vendor product catalog incl. cards, optics, antennas, power products; EoS/EoL dates | Element detail (model, EoL badge), Hardware tab, Hardware lifecycle risk report, Admin catalog | Shared master data (validate) | Master-data / vendor feed if one exists | GET /api/ref/product-models mocked |  |
| 54 | `PRODUCT_MODEL_POLICY` | Tenant golden OS version per model | Admin: Product models; Insights OS-drift card; rule RUL-IPM-001 target | Inventory | none | Inventory API mocked (MockXService over src/mock) |  |
| 55 | `RACK` | Rack / cabinet; device placement (U positions) | Racks screen, Facility tab rack elevation, Element detail rack field | Inventory (validate: Passive may own racks) | Passive Inventory if it owns racks (then sync a reference copy) | GET /api/racks/{id}/elevation mocked | Kept in v5 pending validation |
| 56 | `RADIO_CELL` | Radio cell of any generation | Cell 4G / 5G detail screens, RAN cell list, Reconciliation subject | Inventory | EMS discovery (cell parameters) | GET /api/radio-cells mocked |  |
| 57 | `RADIO_CELL_PLMN` | PLMNs broadcast by a cell | Cell detail PLMN list | Inventory | EMS discovery | embedded in cell DTO (mock) |  |
| 58 | `RADIO_SECTOR` | Sector of a radio site | RAN Inventory: site radio view | Inventory | none | GET /api/sites/{id}/sectors mocked |  |
| 59 | `RECONCILIATION_EXCEPTION` | Discrepancy needing a human: owner team, assignee, SLA, disposition | Reconciliation Exceptions screen and drawer; Rule details Exceptions tab; Inactive inventory link; Insights open exceptions | Inventory | Reconciliation service creates / auto-resolves; dispositions may update RECONCILIATION_STATE | GET /api/recon-exceptions + actions assign / dispose mocked | Workflow object stays in Inventory |
| 60 | `RECONCILIATION_FIELD` | Comparable fields | Rule definition condition builder pick-lists; Result drawer field labels; Provenance table | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 61 | `RECONCILIATION_JOB` | Reconciliation job definition and cron | Reconciliation Jobs screen, job drawer | Integration: Reconciliation service | Reconciliation service: run action, NEXT_RUN_TIME | GET/POST/PUT /api/recon-jobs + actions/run mocked |  |
| 62 | `RECONCILIATION_JOB_RULE` | Rules a job runs | Job drawer rule chips; Rule details jobs list | Integration: Reconciliation service | Reconciliation service | embedded in recon-job DTO (mock) |  |
| 63 | `RECONCILIATION_RESULT` | Outcome of one rule on one subject | Reconciliation Results screen; Overview outcome tiles | Integration: Reconciliation service | Reconciliation service | GET /api/recon-results mocked | High volume: server paging |
| 64 | `RECONCILIATION_RESULT_FIELD` | Inventory vs network value per field | Result drawer, Exception drawer evidence | Integration: Reconciliation service | Reconciliation service | GET /api/recon-results/{id}/fields mocked |  |
| 65 | `RECONCILIATION_RULE` | Rule with lifecycle roles and status | Rules list, Rule definition, Rule details (all tabs) | Inventory | Reconciliation engine flips ACTIVE/EXECUTING | GET/POST/PUT /api/recon-rules + lifecycle actions mocked using RECONCILIATION_RULE_TRANSITION | Business-governed; stays in Inventory |
| 66 | `RECONCILIATION_RULE_CONDITION` | Condition rows joined by AND / OR | Rule definition condition builder; Rule Logic tab | Inventory | none | embedded in rule DTO (mock) |  |
| 67 | `RECONCILIATION_RULE_EVENT` | Append-only approval / lifecycle trail | Rule details Activity tab and review packet | Inventory | none | created by mocked lifecycle actions | Application enforces append-only |
| 68 | `RECONCILIATION_RULE_TRANSITION` | Rule lifecycle state machine with actor role | Rule details: which lifecycle buttons appear (Submit, Approve, Reject, Request changes, Activate, Suspend, Resume, Retire) | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file | Server should compute allowedActions from it |
| 69 | `RECONCILIATION_RUN` | One reconciliation cycle | Job drawer runs; Insights Reconciliation cycles timeline; Overview | Integration: Reconciliation service | Reconciliation service | GET /api/recon-jobs/{id}/runs mocked |  |
| 70 | `RECONCILIATION_RUN_RULE` | Per-rule figures of a run | Rule details Execution tab | Integration: Reconciliation service | Reconciliation service | GET /api/recon-rules/{id}/executions mocked |  |
| 71 | `RECONCILIATION_STATE_MAP` | Outcome to resource / target / exception state | Labels on Reconciliation Results and Exceptions | Inventory (seeded catalog) | shared contract with Reconciliation service | Reference API mocked from the seed rows in this file |  |
| 72 | `RELATIONSHIP_RULE` | Allowed from/to class per relationship type | Relationship editor validation | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 73 | `RELATIONSHIP_TYPE` | Kinds of dependency between resources | Relationships tab, Impact drawer legend | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 74 | `REPORT_DEFINITION` | Report catalogue entry | Discovery Reports and Inventory Reports landing pages | Inventory | none | GET /api/reports/definitions mocked from src/data/reports |  |
| 75 | `REPORT_RUN` | Generated report file and status | Report view: runs list, download | Integration: Reporting service | Reporting service generates files | POST .../actions/run mocked to a COMPLETED run with a stub file |  |
| 76 | `RESOURCE` | Supertype id of every inventory object | Never shown; carried as resourceId in every DTO for cross-links (relationships, provenance, asset, exceptions) | Inventory | none | Implicit ids in mock stores |  |
| 77 | `RESOURCE_ASSET` | Asset tag, purchase, warranty, maintenance contract of a resource | Element detail Asset tab; Hardware lifecycle report | Inventory | Open/CoPEX may take purchase cost / PO columns (validate) | GET /api/resources/{id}/asset mocked | Pending validation |
| 78 | `RESOURCE_ATTRIBUTE` | Custom attribute values | Element detail Attributes tab | Inventory | none | Inventory API mocked (MockXService over src/mock) |  |
| 79 | `RESOURCE_CLASS` | Registry of resource subtypes with inventory category and layer | Grouping into Physical / Passive / Logical / Service views; relationship editor validation | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file | Marks PASSIVE classes now proxied from Passive Inventory |
| 80 | `RESOURCE_EXTERNAL_REFERENCE` | Id of a resource in another system; system-of-record flag | "Also known in" panel on Element / Site detail; Integrations screen | Integration layer (registry) | Sync from each external system | GET /api/resources/{id}/external-refs mocked | Read-only in UI |
| 81 | `RESOURCE_FIELD_PROVENANCE` | Per-field source and evidence of the golden record | Node view "Identity and provenance" table; Result drawer evidence | Integration: Discovery service | Discovery pipelines write it | GET /api/resources/{id}/provenance mocked | Read-only in UI |
| 82 | `RESOURCE_RELATIONSHIP` | Typed dependency between resources (backhauled by, powered by, carried by ...) | Relationships tab on every resource detail; Impact drawer | Inventory | Discovery writes discovered edges | GET /api/resources/{id}/relationships and /impact mocked |  |
| 83 | `RESOURCE_TECHNOLOGY` | Technology tags per resource | Element detail header chips; RAN filters | Inventory | none | Inventory API mocked (MockXService over src/mock) |  |
| 84 | `ROOM` | Room on a floor | Facility tab; rack placement | Inventory | none | GET /api/sites/{id}/rooms mocked |  |
| 85 | `SCAN_JOB` | Discovery job definition and schedule | Scan jobs screen, job drawer, Insights Discovery jobs card | Integration: Discovery service | Discovery service: run / hold / resume, NEXT_RUN_TIME | GET/POST/PUT /api/scan-jobs + actions mocked (run creates a RUNNING run that completes on a timer) |  |
| 86 | `SCAN_JOB_SCOPE` | CIDR / seed / site / NF set of a job | Job drawer scopes list, job form | Integration: Discovery service | Discovery service | embedded in scan-job DTO (mock) |  |
| 87 | `SCAN_RUN` | One execution of a job | Job drawer last runs; Insights run stats | Integration: Discovery service | Discovery service | GET /api/scan-jobs/{id}/runs mocked |  |
| 88 | `SCAN_RUN_TARGET` | Per-target result of a run with identity match | Run detail targets; Scan targets outcome columns | Integration: Discovery service | Discovery service | GET /api/scan-runs/{id}/targets mocked |  |
| 89 | `SCAN_STEP_PAYLOAD` | Encrypted raw request / response | Transcript "view raw" (permissioned) only | Integration: Discovery service | Collector; server-side decryption | Not mocked (or a fixed stub string) | Never listed |
| 90 | `SCAN_STEP_RESULT` | Step-level transcript line | Target transcript screen | Integration: Discovery service | Collector | GET /api/scan-run-targets/{id}/steps mocked |  |
| 91 | `SCAN_TARGET` | Polled address with cached last outcome | Scan targets screen, Target transcript header, Rogue exception subject | Integration: Discovery service | Discovery service writes outcomes | GET /api/scan-targets mocked |  |
| 92 | `SERVICE_ENDPOINT` | Termination of a service on a device interface | Service drawer endpoints list | Inventory | Discovery | embedded in service DTO (mock) |  |
| 93 | `SERVICE_INSTANCE` | Network service instance | Services screen, Element Services tab | Inventory | LCM / discovery | GET /api/services mocked |  |
| 94 | `SERVICE_TYPE` | Service kinds (12) | Services screen tabs and type filter | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 95 | `SITE` | Location that hosts equipment | Location list, Site details, Site create, Facility, Site equipment, Node view; site filter everywhere | Inventory | none (Capex/Opex and Passive reference SITE.ID) | GET/POST/PUT /api/sites mocked | Shared identity: other modules hold SITE.ID |
| 96 | `SITE_CONTACT` | Site contact people (PII encrypted) | Site details: Contacts panel | Inventory | none (validate: not a User Management concern) | GET /api/sites/{id}/contacts mocked with plain values | API decrypts server side |
| 97 | `SITE_ISSUE` | Rollout blocker / standing risk at a site | Site details: Issues panel; Insights rollout risk | Inventory | Rollout tool may raise issues (validate) | GET/POST /api/sites/{id}/issues mocked |  |
| 98 | `SITE_TYPE` | Site kinds | Location list filter, Site create form | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file | Not seeded in dump; dummy data adds 3 |
| 99 | `TEAM` | Owner queue of an exception, exception-reviewer team of a rule, owner of a site issue | Reconciliation Exceptions (Owner filter, drawer), Rule details (Responsibilities), Site details (Issues) | User Management group (CDC copy) — see §2 | User Management (CDC of groups) | GET /api/teams mocked from a static list | Keep as reference copy (3 FK columns). Never created in this UI |
| 100 | `TEAM_MEMBER` | Which users are in a team | none (only a picker when assigning an exception to a person in the owner team) | User Management | User Management API (group membership) | GET /api/teams/{id}/members mocked; no table needed | Recommend DROP in the next revision — see §2 |
| 101 | `TECHNOLOGY` | Technology catalog with generation | Technology tags on Element detail, RAN cell filters | Inventory (seeded catalog) | none | Reference API mocked from the seed rows in this file |  |
| 102 | `TENANT` | Root of every CUSTOMER_ID; identifies the operator | none (tenant comes from the login token) | User Management (CDC copy) | User Management / platform (CDC) | Static tenant constant in the mock session | Reference copy |
| 103 | `USER` | Names shown for owner / reviewer / approver / assignee / tested-by | Rules (all), Reconciliation Exceptions, Node view movements, Site details issues | User Management (CDC copy) | User Management (CDC for names; API or token for roles) | GET /api/users mocked from MOCK_USERS; roles from a static role map | Keep. 13 FK columns depend on it; no PII stored |
| 104 | `VENDOR` | Vendor catalog | Vendor column and picker on Physical Resources, Element, Antennas, Product model admin | Shared master data (validate) | Master-data owner if one exists (CDC); else Inventory | GET /api/ref/vendors mocked from a static list | DDL restored in v5 |
| 105 | `VLAN` | VLAN configured on a device | IP & Logical: VLANs per switch; switch detail | Inventory | Discovery | GET /api/network-elements/{id}/vlans mocked | DDL restored in v5 |
| 106 | `VRF` | VRF instance on a router, optionally tied to an L3VPN | IP & Logical: VRFs per router; Service detail | Inventory | Discovery | GET /api/network-elements/{id}/vrfs mocked | DDL restored in v5 |

---

## 6. Mock API catalogue

Contracts are proposals; the real APIs of the other modules must be adopted as soon as they are published. Each mock lives in `src/services/<module>/Mock<X>Service.ts` and is seeded from `src/mock/<module>`, which mirrors the dummy data in the SQL file.

### 6.1 Inventory API mocks (own data)

| Service | Key methods | Backing tables |
|---|---|---|
| `MockReferenceService` | `domains()`, `neClasses(domain?)`, `resourceClasses()`, `technologies()`, `frequencyBands(tech)`, `linkLayers()`, `serviceTypes()`, `siteTypes()`, `passiveAssetTypes()` (from `EXTERNAL_OBJECT_TYPE`), `nfTypes()`, `discoverySteps(domain)`, `discrepancyTypes()`, `reconFields(class?)`, `ruleTransitions()`, `stockTransitions()`, `relationshipTypes()`, `relationshipRules()`, `vendors()`, `productModels(vendor?, class?)`, `geo(level, parent?)`, `operationalAreas()` | all seeded catalogs, `VENDOR`, `PRODUCT_MODEL`, `GEOGRAPHY_LEVEL1..4`, `OPERATIONAL_AREA` |
| `MockSiteService` | `list(q)`, `get(id)`, `create`, `update`, `floors/rooms/racks/powerFeeds/contacts/issues(siteId)`, `rackElevation(rackId)` | `SITE`, `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`, `SITE_CONTACT`, `SITE_ISSUE` |
| `MockNetworkElementService` | `list(q)`, `get(id)` (detail union by class), `create`, `update`, `components(id)`, `ports(id)`, `health(id)`, `movements(id)`, `move(id, body)`, `decommission(id, body)`, `asset/attributes/technologies/provenance/externalRefs/relationships(resourceId)` | `NETWORK_ELEMENT` + 11 details, `EQUIPMENT_COMPONENT`, `PORT`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `NETWORK_ELEMENT_HEALTH`, `NETWORK_ELEMENT_MOVEMENT`, `RESOURCE_*` |
| `MockVirtualService` | `list()`, `instance(id)`, `clusters()`, `lifecycle(id, op)` | `NETWORK_ELEMENT_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER` |
| `MockRanService` | `cells(q)`, `cell(id)`, `sectors(siteId)`, `antennas(siteId)`, `plmns()`, `slices()` | `RADIO_CELL`, `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `RADIO_SECTOR`, `ANTENNA`, `PLMN`, `NETWORK_SLICE` |
| `MockLinkService` | `list(q)`, `get(id)`, `create`, `update` | `LINK`, `LINK_PROTOCOL_ATTRIBUTE`, `LINK_MICROWAVE_ATTRIBUTE` |
| `MockServiceService` | `list(q)`, `get(id)` (endpoints embedded) | `SERVICE_INSTANCE`, `SERVICE_ENDPOINT` |
| `MockIpamService` | `subnets(context?)`, `vrfs(neId)`, `vlans(neId)` | `IP_SUBNET`, `VRF`, `VLAN` |
| `MockRelationshipService` | `of(resourceId)`, `impact(resourceId, depth)`, `add`, `remove` | `RESOURCE_RELATIONSHIP` |
| `MockRuleService` | `list(q)`, `get(id)` (conditions, allowedActions), `create`, `update`, `action(id, verb, note)`, `events(id)`, `executions(id)` | `RECONCILIATION_RULE`, `_CONDITION`, `_EVENT`, `_TRANSITION`, `RECONCILIATION_RUN_RULE` |
| `MockReportService` | `definitions(module)`, `run(defId, format)`, `runs(q)`, `file(runId)` | `REPORT_DEFINITION`, `REPORT_RUN` |
| `MockInactiveService` | `list(kind, domain)` | derived from NE / port / link / service mock stores |

### 6.2 Other-module mocks (contract to be replaced by the module's real API)

| Service | Methods that are enough for the current screens | Replaces |
|---|---|---|
| `MockCopexService` (Open / CoPEX) | `capexPlan(siteId, fy)` → header + lines; `opexPlan(siteId, fy)` → header + lines + 12 monthly actuals; `capexLinesForResource(resourceId)` | the removed `CAPEX_*` / `OPEX_*` tables; Capex and Opex screens |
| `MockPassiveService` (Passive Inventory) | `proxies(siteId, objectType)` (from `EXTERNAL_RESOURCE`), `asset(externalId)` → type, code, rack, U range, vendor, model, status, ports; `rackOccupancy(rackCode)`; `powerUnit(externalId)` → kind, rating, last test, overdue; `patchCords(portId)`; `deepLink(externalId)` | the removed `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, `POWER_UNIT`, `POWER_UNIT_TEST`; ODF / Power plant / Patch cords / Ducts / Fiber spans / Splice screens |
| `MockUserService` (User Management) | `list()`, `get(id)`, `roles(id)` | CDC copy of `USER` plus role claims |
| `MockTeamService` (User Management groups) | `list()`, `members(teamId)` | CDC copy of `TEAM`; replaces `TEAM_MEMBER` |

### 6.3 Integration-engine mocks

| Service | Behaviour the mock must simulate | Backing tables |
|---|---|---|
| `MockScanJobService` | `run(jobId)` creates a `SCAN_RUN` in RUNNING, then after a delay writes run targets, step results and flips status; `hold` / `resume` toggle `SCHEDULE_STATE`; targets keep a cached last outcome | `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `COLLECTOR`, `CREDENTIAL_PROFILE` |
| `MockReconciliationService` | `run(jobId)` creates a run, results, result fields and exceptions from the current mock inventory; `assign` / `dispose` update an exception and set `CLOSED_TIME` when resolved | `RECONCILIATION_JOB`, `_JOB_RULE`, `_RUN`, `_RUN_RULE`, `_RESULT`, `_RESULT_FIELD`, `RECONCILIATION_EXCEPTION`, `RECONCILIATION_STATE_MAP` |
| `MockInsightsService` | derives every Insights card from the other mock stores; trust trend from `DOMAIN_TRUST_SNAPSHOT` rows | read models |
| `MockIntegrationService` | `systems()`, `system(id)`, `proxies(systemId)`, `externalRefs(resourceId)` | `EXTERNAL_SYSTEM`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REFERENCE` |

---

## 7. Tables that are no longer in the database and how their screens are served

| Removed in v5 | Screens affected | Served by |
|---|---|---|
| `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD` | Passive Infrastructure: ODF, Patch cords (and Racks list if Passive takes racks later) | `EXTERNAL_RESOURCE` proxies (class `PASSIVE_ASSET` / `PASSIVE_PORT`) + Passive Inventory API, mocked by `MockPassiveService` |
| `POWER_UNIT`, `POWER_UNIT_TEST` | Passive Infrastructure: Power plant; Facility power panel; power controller detail | `EXTERNAL_RESOURCE` proxies (class `POWER_UNIT`) + Passive API |
| `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL` | Capex, Opex under Site details | Open/CoPEX API, mocked by `MockCopexService`; `SITE.ID` and `RESOURCE.ID` are the keys exchanged |
| `USER_IDENTITY` | none | User Management |

Already external before v5 and unchanged: fiber plant (ducts, spans, splices, strands) via `EXTERNAL_RESOURCE` with `SYSTEM_TYPE = FIBER_INVENTORY`.

---

## 8. Summary

- **TEAM stays as a CDC reference copy; TEAM_MEMBER is not required** and should be dropped in the next revision, with membership served by a User Management API (mocked by `MockTeamService.members`).
- Of the 106 tables, 70 are Inventory-owned (51 business tables and 19 seeded catalogs), 21 are integration read models (Discovery 11, Reconciliation 6, Reporting 2, registry 2), 7 are shared master data pending an owner, 3 are User Management copies or leftovers (`USER`, `TEAM`, `TEAM_MEMBER`), 1 is the Passive Inventory proxy table, and 4 are Inventory tables flagged for validation against Passive Inventory or Open/CoPEX (`RACK`, `ANTENNA`, `POWER_FEED`, `RESOURCE_ASSET`).
- Every existing screen can run today on mock services seeded from the dummy data in `inventory_schema_v5.sql`. Only Capex/Opex and the Passive detail screens depend on a module that has no table here, and for both a small mock contract (§6.2) is enough until the module publishes its API.
