# Inventory + Discovery & Reconciliation schema review (v1 → v2 → v3)

Reviewed: `inventory_schema.sql` v1 (2026-09-21, 123 tables, 7 views) against `mysql_guidelines.md`, the Ideation functional context (the `/discovery/*` and `/inventory/*` screens in this repository, including the Transport › IP/MPLS domain hierarchy delivered this week) and the review brief of 2026-09-23.
Result: `inventory_schema.sql` v3 (99 tables, 9 views), `inventory_seed.sql` v3 and an updated test suite under `tests/`. Sections 1–10 are the v1 → v2 review; section 11 is the v3 addendum that adds the `NE_CLASS` catalog and the eleven class-specific `NE_*_DETAIL` tables under NETWORK_ELEMENT, covering every domain. Everything in this document is reflected in the SQL; nothing in the SQL is unexplained here.

## Verdict

v1 is a sound, deliberately engineered schema: one tenant dimension, composite tenant FKs, soft delete through `LIVE_FLAG`, caches and derived figures clearly labelled, every FK provably enforceable. The review therefore changes **how** the same business model is expressed, not **what** it models. No business table and no business column was removed. The changes are:

| # | Decision | Effect on v2 |
|---|---|---|
| D1 | Auditing belongs to the platform Audit module | `REVINFO`, 36 `*_AUD` tables and `AUDIT_EVENT` removed (38 tables). `CREATED_TIME` / `MODIFIED_TIME` / `CREATOR` / `LAST_MODIFIER` / `ROW_VERSION` / `IS_DELETED` stay: they are application metadata, not audit history. |
| D2 | Domain is a hierarchical, shared taxonomy, not a flat vocabulary | New global `DOMAIN` table (`CODE`, `NAME`, `PARENT_DOMAIN_ID_FK`, `SORT_ORDER`), seeded RAN, Core, Transport, IP/MPLS ⊂ Transport. The `DOMAIN ENUM(...)` column repeated in 12 tables becomes `DOMAIN_ID_FK SMALLINT UNSIGNED` with an FK. New `V_DOMAIN_TREE` view for hierarchy-aware filters. |
| D3 | No MySQL `ENUM` | 153 `ENUM` columns become `VARCHAR(n)` + `CHECK (col IN (...))`; the allowed values are listed in every column comment. Same rejection of bad values (tested), maps 1:1 to `@Enumerated(EnumType.STRING)`, extensible with `DROP CHECK` / `ADD CHECK`, no ENUM ordering / numeric-coercion quirks. |
| D4 | Smallest safe key width | Master and entity tables `INT UNSIGNED`; only the five per-run result tables that grow by millions of rows a day stay `BIGINT UNSIGNED`; metadata stays `SMALLINT UNSIGNED`; platform replicas keep the platform width. Every FK column follows its referenced key (verified by the server). |
| D5 | `CREATOR` / `LAST_MODIFIER` are informational stamps | The columns stay (JPA auditing fills them, the UI shows "created by / last updated"); the 150 FKs and 150 indexes that only existed to enforce them are dropped. Change history is the Audit module's job. |
| D6 | Keep the composite tenant-FK convention | `(CUSTOMER_ID, X_ID_FK) → (CUSTOMER_ID, ID)` stays, as in `lcm_schema.sql`; it is what makes cross-tenant references impossible at the database level (two negative tests prove it). |
| D7 | Keep the five "twin" FK indexes | `SITE_ISSUE`, `LINK` (A and Z), `SERVICE_ENDPOINT`, `RECON_RUN` each have an exact FK index beside a wider composite. They look redundant but the wider index carries a nullable column, and InnoDB will not enforce an FK through such an index (defect reproduced by the previous review; `tests/fk_index_check.py` guards it). |
| D8 | Three numeric columns re-sized | `RADIO_BAND.FREQUENCY_MHZ` SMALLINT → INT (mmWave bands reach 71 000 MHz), `REPORT_RUN.FILE_SIZE_BYTES` BIGINT → INT, `SCAN_RUN.DURATION_MS` BIGINT → INT. |

### Verification (scratch MySQL 9.5.0, target syntax 8.0.16+)

| Check | Result |
|---|---|
| `inventory_schema.sql` v2 executes from scratch | 86 tables, 8 views created |
| Foreign-key type compatibility (`information_schema` join of FK column type vs referenced column type) | 0 mismatches across 240 FKs |
| Every FK served by an index InnoDB enforces (`tests/fk_index_check.py`) | 240 checked, 0 bypassable |
| Index count on the server equals the DDL | 363 = 363 (MySQL created no hidden FK indexes) |
| Guideline checks (`tests/inventory_guideline_checks.sql`, 17 rules incl. 3 new v2 rules: no ENUM, every vocabulary guarded, BIGINT PK only on the allowed list) | 0 violations |
| Seed applied twice (idempotent) | ok |
| Smoke test (end-to-end happy path across both modules) | pass |
| Negative tests (`tests/inventory_negative_tests.tsv`) | 47 of 47 rejected, 0 wrongly accepted (43 carried over from v1, 2 audit tests removed, 4 added for DOMAIN and vocabulary CHECKs) |

### v1 → v2 in numbers

| | v1 | v2 |
|---|---|---|
| Tables | 123 (86 business + 37 audit) | 86 (85 business + `DOMAIN`); v3: 99 (+ `NE_CLASS`, `NE_CLASS_DOMAIN`, 11 `NE_*_DETAIL`) |
| Views | 7 | 8 (+ `V_DOMAIN_TREE`); v3: 9 (+ `V_NE_DETAIL_COVERAGE`) |
| Indexes (PK + UK + KEY) | 578 (499 on business tables) | 363; v3: 403 |
| Foreign keys | 415 (377 on business tables) | 240; v3: 275 |
| CHECK constraints | 118 (81 on business tables) | 229 (81 carried over + 148 vocabulary); v3: 297 |
| MySQL `ENUM` columns | 165 on business tables | 0 |
| BIGINT primary keys | 87 business tables | 6 (`USER` + 5 per-run result tables) |

---

## 1. Overall schema assessment (Step 1: schema understanding)

**Main domain entities**

- Location: `SITE` (successor of NE_LOCATION) with facility detail `FLOOR` › `ROOM` › `RACK`, `POWER_FEED`, `POWER_UNIT` › `POWER_UNIT_TEST`, and site attributes / contacts / issues.
- Physical resources: `NETWORK_ELEMENT` (the device golden record) › `EQUIPMENT_COMPONENT` (hardware tree) › `PORT` (interfaces, also owned by passive assets) › `PORT_IP_ADDRESS`, `VLAN` / `PORT_VLAN`; commercial and health satellites `NE_ASSET`, `NE_HEALTH`, `NE_EXTERNAL_REF`, `NE_FIELD_PROVENANCE`; the stock ledger `NE_MOVEMENT` governed by `NE_STOCK_TRANSITION`.
- Radio and cloud: `RADIO_BAND`, `RADIO_CELL` (+ `RADIO_CELL_PARAMETER`), `CLOUD_CLUSTER`, `VIRTUAL_NETWORK_FUNCTION` (+ `VNF_LIFECYCLE_STEP`).
- Passive plant: `PASSIVE_ASSET` supertype with 1:1 subtypes `FIBER_SPAN` (› `FIBER_CORE` › `OTDR_TEST`, `SPLICE`), `ODF`, `SPLICE_CLOSURE`, `PATCH_CORD`, `DUCT`.
- Connectivity and services: `LINK` (all layers) + `LINK_PROTOCOL_ATTR`; `SERVICE_INSTANCE` › `SERVICE_ENDPOINT`, `SERVICE_ROUTE_TARGET`.
- Discovery: `COLLECTOR`, `CREDENTIAL_PROFILE`, `SCAN_JOB` › `SCAN_JOB_SCOPE`, `SCAN_TARGET`; execution `SCAN_RUN` › `SCAN_RUN_TARGET` › `SCAN_STEP_RESULT` › `SCAN_STEP_PAYLOAD`, steps defined by `DISCOVERY_STEP_DEF`.
- Reconciliation: `RECON_RULE` (+ conditions, lifecycle events governed by `RECON_RULE_TRANSITION`) run by `RECON_JOB` › `RECON_RUN` › `RECON_RUN_RULE` / `RECON_RESULT` › `RECON_RESULT_FIELD`; human work in `RECON_EXCEPTION` typed by `DISCREPANCY_TYPE`.
- Finance and reporting: `CAPEX_PLAN` › `CAPEX_LINE` › `CAPEX_LINE_ELEMENT`; `OPEX_PLAN` › `OPEX_LINE`, `OPEX_MONTH_ACTUAL`; `REPORT_DEFINITION` › `REPORT_RUN`; `DOMAIN_TRUST_SNAPSHOT`.

**Supporting entities**: platform replicas `TENANT`, `USER`, `TEAM`; global metadata `VENDOR`, `SITE_TYPE`, `TECHNOLOGY`, `DEVICE_MODEL`, `DOMAIN` (new), the two transition tables, `DISCOVERY_STEP_DEF`, `DISCREPANCY_TYPE`; geography `PRIMARY_GEO_L1..L4` (platform names) and the operator hierarchy `OPERATIONAL_AREA`.

**Relationships and structure**: every tenant-owned row carries `CUSTOMER_ID` and every FK between tenant tables is the composite `(CUSTOMER_ID, X_ID_FK)`, so a row can never reference another tenant's row. Global metadata is referenced by plain single-column FKs. Soft delete is `IS_DELETED` + generated `LIVE_FLAG` so unique keys ignore deleted rows. Endpoint ports are FK-checked against their device through `PORT (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, ID)`. Caches (`NETWORK_ELEMENT.RECON_STATE`, `SCAN_TARGET.LAST_*`) and derived figures (views, generated columns) are labelled as such. No circular dependency exists (verified by the recursive guideline query; the only self-references are the legitimate parent pointers).

**What was wrong or over-built in v1** (all fixed in v2):

1. Audit infrastructure inside the domain schema (37 audit tables + `AUDIT_EVENT`, 74 audit indexes) although a separate Audit module owns auditing.
2. `DOMAIN` modelled as a flat `ENUM` in 12 places, which cannot express the Transport › IP/MPLS hierarchy the application now uses; extending it would mean 12 `ALTER TABLE`s.
3. 165 MySQL `ENUM` columns on business tables (awkward for JPA schema validation, sorted by ordinal, silently coerce numeric strings, non-portable).
4. `BIGINT UNSIGNED` on every entity PK regardless of volume, and therefore on every FK column (4 extra bytes in every row and every index entry, for 81 tables that will never approach 4.29 billion rows).
5. 300 FK constraints and indexes whose only purpose was to enforce `CREATOR` / `LAST_MODIFIER`, columns that no query filters on.
6. `RADIO_BAND.FREQUENCY_MHZ SMALLINT UNSIGNED` overflows at 65 535 MHz (5G n263 is 57–71 GHz); `REPORT_RUN.FILE_SIZE_BYTES` and `SCAN_RUN.DURATION_MS` were BIGINT for values that cannot exceed INT.
7. One low-value index (`IDX_REPORT_RUN__REPORT_TYPE`: low cardinality on a small table already served by `IDX_REPORT_RUN__STATUS_CREATED_TIME`).
8. Encoding artefacts (`Â·`) in the comments of `RECON_RULE` and `RECON_JOB`; `Related Tables` headers listing `USER` on tables that only carried the creator stamps.

### Needs clarification

These are the points where two readings would produce different DDL. v2 takes the conservative reading (preserve v1 behaviour) and marks them here; none blocks adoption.

| # | Question | v2 assumption | If the answer differs |
|---|---|---|---|
| NC1 | Do the collectors **upsert** discovered `LINK`, `EQUIPMENT_COMPONENT` and `SERVICE_INSTANCE` rows by a natural identity, or delete-and-reinsert per run? These three tables have `FIRST_SEEN_TIME` / `LAST_SEEN_TIME` / `RECORD_STATE` (upsert semantics) but no database unique key to upsert on (`PORT` has one: `(CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, NAME)`). | Upsert, identity resolved in the application (a link is layer + endpoints + addresses; two BGP sessions on one port pair are two links, so a plain UK would be wrong). PK `INT UNSIGNED`. | If rows are re-inserted every run, `LINK`, `EQUIPMENT_COMPONENT` and `SERVICE_INSTANCE` must become `BIGINT UNSIGNED` (1 M devices × 10 links × 4 runs/day burns 4.29 billion ids in about 100 days). Better: agree the identity and add the unique key. |
| NC2 | Does the payload purge job run per tenant or platform-wide? | Per tenant; `IDX_SCAN_STEP_PAYLOAD__PURGE_AFTER (CUSTOMER_ID, PURGE_AFTER)` kept. | A platform-wide `DELETE ... WHERE PURGE_AFTER < NOW()` needs `(PURGE_AFTER)` leading (an exception to the "no date-led index" rule, justified by the retention job). |
| NC3 | `CAPEX_PLAN.CURRENCY_CODE` / `OPEX_PLAN.CURRENCY_CODE` default `'INR'` in a multi-tenant platform. | Default kept (v1 behaviour). | Move the default to tenant configuration and make the column plain `NOT NULL`. |
| NC4 | `VNF_LIFECYCLE_STEP` (Day 0 / Grow / Events / GPL with request / response JSON) overlaps LCM's order lifecycle. | Kept: the Inventory VNF screen renders it. | If LCM is the system of record, drop the table and reference LCM by `NETWORK_SERVICE_REF`. |
| NC5 | `CREDENTIAL_PROFILE.STATUS` (HEALTHY / WARNING / EXPIRED) is largely derivable from `EXPIRES_DATE`. | Kept as a cache (it can also reflect authentication failures). | If it is purely date-derived, replace with a generated column or a view. |
| NC6 | `RADIO_CELL.TECHNOLOGY_GEN` ('4G' / '5G') duplicates the concept in the `TECHNOLOGY` table. | Kept as a two-value vocabulary because the PCI range CHECK depends on it. | Could become `TECHNOLOGY_ID_FK`; the CHECK would then need a trigger or move to the application. |
| NC7 | Passive subtype rows (`ODF`, `DUCT`, ...) are not bound to a `PASSIVE_ASSET` of the matching `ASSET_TYPE` (carried over from the previous review, N-05). | Application rule. | Add a generated `ASSET_TYPE` column in each subtype and a composite FK `(CUSTOMER_ID, ASSET_TYPE, PASSIVE_ASSET_ID_FK)`. |
| NC8 | `SITE.CITY` next to the four-level geography chain. | Kept: it is the postal-address city (`ADDRESS`, `CITY`, `POSTAL_CODE`), which can differ from the administrative district. | If it must always equal the L2 name, drop it and use `V_SITE_GEO_PATH`. |

---

## 2. Table-by-table review (Step 2)

All 86 tables were reviewed. "PK" and "creator" shorthand: *PK → INT* means the surrogate key and every FK to it go from BIGINT UNSIGNED to INT UNSIGNED (D4); *creator FK/idx dropped* is D5. Vocabulary columns listed per table are the ENUM → VARCHAR + CHECK conversions (D3).

### A. Platform replicas

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| TENANT | Platform tenant; target of every `CUSTOMER_ID` | None. | None (comment/version stamp only). | Platform-owned key, `INT UNSIGNED` already right. |
| USER | Identity-only replica of platform USER (no PII) | None. `BIGINT` is the platform key width. | Keep BIGINT. | Every user reference in this schema must match `USER.ID` exactly. |
| TEAM | Owning team / queue for exceptions and rules | PK BIGINT for tens of rows per tenant; creator FKs and indexes. | PK → INT; creator FK/idx dropped. | Volume is trivial; INT keeps every referencing column (exceptions, rules, site issues) 4 bytes narrower. |

### B. Metadata (global, seeded)

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| VENDOR | Equipment vendor / OEM | None. | None. | Correct SMALLINT catalog. |
| SITE_TYPE | Site type catalog | None. | None. | As above. |
| TECHNOLOGY | Radio / network technology code | None. | None. | As above. |
| DEVICE_MODEL | Hardware model with lifecycle dates | `NE_CLASS` ENUM. | `NE_CLASS` → VARCHAR(16) + CHECK. | D3. |
| **DOMAIN** (new) | Network-domain taxonomy: RAN, Core, Transport, IP/MPLS ⊂ Transport | v1 had the domain as a flat ENUM in 12 tables; the application now treats IP/MPLS as a child of Transport (`DOMAIN_PARENT`, `DOMAIN_ORDER`, `domainMatches` in `src/data/discoveryOverview.ts`). | Add `DOMAIN (ID SMALLINT, CODE, NAME, PARENT_DOMAIN_ID_FK, SORT_ORDER, IS_ACTIVE)`, seeded; all 12 domain columns become `DOMAIN_ID_FK`; add `V_DOMAIN_TREE`. | A tree needs a parent pointer; a Transport filter must include IP/MPLS rows (`WHERE DOMAIN_ID_FK IN (SELECT ID FROM DOMAIN WHERE ID = ? OR PARENT_DOMAIN_ID_FK = ?)` or join `V_DOMAIN_TREE.ROOT_DOMAIN_ID`). Adding a domain becomes a seed row, not 12 `ALTER TABLE`s. Application mapping: `DomainKey 'IPMPLS'` ↔ `DOMAIN.CODE 'IP_MPLS'`. |

### C. Geography and operational areas

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| PRIMARY_GEO_L1 | Country / state | PK BIGINT; creator FKs. `PRETTY_NAME` VARCHAR(150) vs `GEO_NAME` VARCHAR(200) is inconsistent but harmless. | PK → INT; creator FK/idx dropped. Four near-identical level tables kept. | Platform names (`PRIMARY_GEO_L1..L4`) are a cross-module contract; collapsing them into one level table would break LCM's replicas (previous decision D-I2). |
| PRIMARY_GEO_L2 | District / city | As L1. | As L1. | As L1. |
| PRIMARY_GEO_L3 | Locality | As L1. | As L1. | As L1. |
| PRIMARY_GEO_L4 | Cluster / PIN area | As L1; `MORPHOLOGY` ENUM. | As L1; `MORPHOLOGY` → VARCHAR(16) + CHECK. | D3, D4, D5. |
| OPERATIONAL_AREA | Region › circle › zone › division › territory | PK BIGINT; `AREA_LEVEL` ENUM; parent-level ordering is not enforceable by the database. | PK → INT; `AREA_LEVEL` → VARCHAR(16) + CHECK. | Level order stays an application rule (a CHECK cannot see the parent row). |

### D. Location: sites and facility

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| SITE | Location hosting equipment | PK BIGINT; `CATEGORY`, `STATUS`, `COVERAGE_TYPE`, `ROLLOUT_STAGE` ENUM; `CITY` duplicates geography (NC8); `LANDLORD` (organisation) overlaps `SITE_CONTACT` role LANDLORD (person). | PK → INT; 4 vocabularies → VARCHAR + CHECK; `CITY` and `LANDLORD` kept. `IDX_SITE__STATUS_CATEGORY` kept (site grid filters). | Postal city and property owner are legitimate attributes distinct from the geography chain and from a contact person. |
| SITE_ATTRIBUTE | Long-tail site attributes (EAV) | `DATA_TYPE` ENUM. | PK → INT; `DATA_TYPE` → VARCHAR(16) + CHECK. | EAV is the right shape for attributes without a column; UK `(CUSTOMER_ID, SITE_ID_FK, NAME)` also serves the FK. |
| SITE_CONTACT | Site contact person (encrypted phone / email) | `CONTACT_ROLE` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | PII already AES-encrypted with key reference and a CHECK tying the two (guideline §6). |
| SITE_ISSUE | Rollout blocker / risk | `ISSUE_KIND`, `CATEGORY` ENUM. `IDX_SITE_ISSUE__SITE_ID` looks redundant with `IDX_SITE_ISSUE__SITE_ID_RESOLVED_TIME`. | PK → INT; vocabularies → VARCHAR + CHECK; **both** indexes kept. | `RESOLVED_TIME` is nullable, so the wider index cannot serve the FK (D7). |
| FLOOR | Floor inside a site | PK BIGINT. | PK → INT. | D4. |
| ROOM | Room on a floor | `ROOM_TYPE` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | D3, D4. |
| RACK | Equipment rack | `ROLE` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | Used units / power / ports are derived from mounted equipment, correctly not stored. |
| POWER_FEED | AC / DC feed into a site | `KIND`, `STATUS` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| POWER_UNIT | DG / rectifier / battery / UPS / solar | `KIND`, `STATUS` ENUM; `CONTRACTOR` is free text. | PK → INT; vocabularies → VARCHAR + CHECK; `CONTRACTOR` kept as text. | A maintenance contractor is not an OEM; forcing it into `VENDOR` would pollute the vendor catalog. |
| POWER_UNIT_TEST | Load / runtime test | `RESULT` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK; `TESTED_BY_FK` FK to USER kept. | "Who ran the test" is a business fact shown on the facility tab, unlike the creator stamp. |

### E. Physical resources

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| NETWORK_ELEMENT | Device golden record | PK BIGINT; `DOMAIN` ENUM; `NE_CLASS`, `STOCK_STATE`, `OPER_STATUS`, `ADMIN_STATE`, `RECORD_SOURCE`, `RECON_STATE`, `DECOMMISSION_REASON` ENUM; `MANAGEMENT_IP` as text. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + `IDX_NETWORK_ELEMENT__DOMAIN_ID`; 7 vocabularies → VARCHAR + CHECK; IP kept as VARCHAR(45) with the IS_IPV4/IS_IPV6 CHECK. | Text IPs are readable and CHECK-validated; a generated `INET6_ATON` column can be added later if CIDR-range queries appear. `RECON_STATE` / `LAST_VERIFIED_TIME` are documented caches written by the reconciliation job (kept, they back the grids). |
| NE_STOCK_TRANSITION | Allowed stock-state moves | `FROM_STATE`, `TO_STATE`, `MOVEMENT_TYPE` ENUM. | 3 vocabularies → VARCHAR(16) + CHECK. | FK target for `NE_MOVEMENT`; VARCHAR keeps the FK valid (identical type and length on both sides). |
| NE_MOVEMENT | Append-only stock ledger | PK BIGINT; `FROM_STATE`, `TO_STATE` ENUM. | PK → INT; the two columns follow the transition table's VARCHAR(16) **without** a CHECK. | The FK to `NE_STOCK_TRANSITION` already restricts the vocabulary; a CHECK would be redundant. A device makes a handful of moves in its life, so INT is ample. This is a business ledger, not audit. |
| NE_EXTERNAL_REF | Ids in FM / PM / CM / CMDB / ERP | `EXTERNAL_SYSTEM` ENUM. | PK → INT; vocabulary → VARCHAR(16) + CHECK. | D3, D4. |
| NE_ASSET | Commercial record (1:1) | `OWNERSHIP` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. 1:1 split kept. | Keeps the hot device table narrow; commercial data has different owners and access. |
| NE_FIELD_PROVENANCE | Which source last set each field | `FIELD_NAME`, `SOURCE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | Provenance is shown on the node view (Identity and provenance block); it is business data, not audit history. |
| NE_HEALTH | Latest ICMP / NTP check (1:1) | `REACHABILITY`, `NTP_STATUS` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | History belongs to PM; a latest-snapshot row is the right shape. |
| EQUIPMENT_COMPONENT | Hardware tree | PK BIGINT; `COMPONENT_CLASS`, `STATUS`, `RECORD_STATE` ENUM; no natural key (NC1). | PK → INT; vocabularies → VARCHAR + CHECK. | INT is safe only with upsert semantics (see NC1). |
| PORT | Physical / logical / passive interface | PK BIGINT; `PORT_KIND`, `MEDIA`, `CONNECTOR`, `DIRECTION`, `ADMIN_STATUS`, `OPER_STATUS`, `USAGE_STATE`, `RECORD_STATE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. `UK_PORT__NETWORK_ELEMENT_ID_ID` and `IDX_PORT__USAGE_STATE` kept. | The (NE, ID) unique key is what lets `LINK` and `SERVICE_ENDPOINT` prove a port belongs to the device. The usage-state index is a covering index for the tenant-wide port capacity KPI. |
| PORT_IP_ADDRESS | IP on an interface | PK BIGINT. | PK → INT. | IP index kept: identity matching by interface address. |
| VLAN | VLAN on a device | `VLAN_TYPE`, `STATUS` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| PORT_VLAN | Port membership + STP state | `MODE`, `STP_STATE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |

### F. Radio access and cloud

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| RADIO_BAND | Band / carrier on a radio element | `FREQUENCY_MHZ SMALLINT UNSIGNED` caps at 65 535 MHz; `STATUS` ENUM; UK includes nullable `CARRIER` (only partially unique). | PK → INT; `FREQUENCY_MHZ` → INT UNSIGNED; vocabulary → VARCHAR + CHECK. `IDX_RADIO_BAND__NETWORK_ELEMENT_ID` kept. | 5G n263 (57–71 GHz) and any future band above 65 GHz would not fit. The NE index is required because the UK carries the nullable `CARRIER` (D7). |
| CLOUD_CLUSTER | Edge cloud / subcloud | `PLATFORM` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | D3, D4. |
| VIRTUAL_NETWORK_FUNCTION | vDU / CU / vEPC ... | `DOMAIN` ENUM; `NF_TYPE`, `STATUS`, `RECORD_SOURCE` ENUM; `UUID CHAR(36)`. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK; `UUID` kept CHAR(36). | CHAR(36) maps directly to `java.util.UUID` / String; BINARY(16) would save 20 bytes per row at the cost of readability in every query. |
| VNF_LIFECYCLE_STEP | Day 0 / Grow / Events / GPL steps | `STAGE`, `STATUS` ENUM; overlap with LCM (NC4). | PK → INT; vocabularies → VARCHAR + CHECK. | JSON request / response columns are appropriate for orchestrator payloads (no secrets, per comment). |
| RADIO_CELL | 4G / 5G cell | `TECHNOLOGY_GEN`, `CELL_STATUS` ENUM; `CELL_IDENTITY BIGINT` (correct: NCI is 36 bits). | PK → INT; vocabularies → VARCHAR + CHECK; `CELL_IDENTITY` stays BIGINT. | The only non-key BIGINT that is genuinely required. |
| RADIO_CELL_PARAMETER | Vendor long-tail cell parameters (EAV) | PK BIGINT. | PK → INT. | D4. |

### G. Passive plant

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| PASSIVE_ASSET | Common record of passive items | `ASSET_TYPE`, `STATUS`, `OWNERSHIP` ENUM; subtype typing (NC7). | PK → INT; vocabularies → VARCHAR + CHECK. | `STATUS` is a union vocabulary across types (documented per type in the comment); acceptable for a supertype. |
| FIBER_SPAN | Cable span between ODFs (1:1) | `CABLE_TYPE`, `INSTALL_METHOD`, `BUILD_PHASE`, `BUILD_STAGE` ENUM; A/B ODF FKs point at `PASSIVE_ASSET` of any type (NC7). | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| FIBER_CORE | One strand: colour, status, termination | `STRAND_COLOUR`, `STATUS`, `SERVICE_USE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | The A/Z port unique keys are correct: a port terminates at most one core. |
| OTDR_TEST | OTDR measurement | `DIRECTION`, `RESULT` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| ODF | Optical distribution frame (1:1) | `FRAME_TYPE`, `TERMINATION`, `ENVIRONMENT` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| SPLICE_CLOSURE | Closure on a span (1:1) | `CLOSURE_TYPE`, `HOUSING`, `INGRESS_RATING` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| SPLICE | Fusion splice joining two cores | PK BIGINT. | PK → INT. | D4. |
| PATCH_CORD | Cord between two ports (1:1) | `CORD_TYPE` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | A port can carry both a core (behind) and a patch cord (in front): the two unique keys do not conflict. |
| DUCT | Duct between two sites (1:1) | `INSTALL_METHOD` ENUM; `WAYS_USED` is a stored counter. | PK → INT; vocabulary → VARCHAR + CHECK; counter kept. | There is no sub-duct occupancy table to derive it from. |

### H. Links

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| LINK | Adjacency at any layer | PK BIGINT; `LAYER`, `STATUS`, `RECORD_SOURCE`, `RECORD_STATE` ENUM; `IDX_LINK__A_NE_ID` / `__Z_NE_ID` look redundant with the (NE, PORT) indexes; no identity key (NC1). | PK → INT; vocabularies → VARCHAR + CHECK; all four NE/port indexes kept. | The port columns are nullable, so only the exact indexes can serve the device FKs (D7). |
| LINK_PROTOCOL_ATTR | BGP / OSPF / IS-IS attributes (1:1) | `ISIS_LEVEL` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | 4-byte ASNs correctly INT UNSIGNED with a CHECK. |

### I. Services

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| SERVICE_INSTANCE | Service as seen in the network | `DOMAIN` ENUM; `SERVICE_TYPE`, `STATUS`, `REFERENCE_KIND`, `RECORD_SOURCE`, `RECORD_STATE` ENUM; no natural key (NC1). | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK. | `LCM_SERVICE_REF` stays an unenforced cross-module reference (previous decision D-I3). |
| SERVICE_ENDPOINT | Termination on a device interface | `ENDPOINT_ROLE`, `ADMIN_STATUS`, `OPER_STATUS` ENUM; `IDX_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID` looks redundant. | PK → INT; vocabularies → VARCHAR + CHECK; both NE indexes kept. | `PORT_ID_FK` is nullable (D7). |
| SERVICE_ROUTE_TARGET | One RT per row | `DIRECTION` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | D3, D4. |

### J. Site finance

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| CAPEX_PLAN | Capital plan per site and FY | Currency default 'INR' (NC3). | PK → INT. | D4. |
| CAPEX_LINE | Capex line item | `CATEGORY`, `STATE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| CAPEX_LINE_ELEMENT | Devices funded by a line | PK BIGINT. | PK → INT. | D4. |
| OPEX_PLAN | Operating budget per site and FY | Currency default (NC3). | PK → INT. | D4. |
| OPEX_LINE | Recurring cost line | `CATEGORY`, `FREQUENCY`, `STATE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| OPEX_MONTH_ACTUAL | Actual spend per month | PK BIGINT. | PK → INT. | D4. |

### K. Discovery

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| DISCOVERY_STEP_DEF | Collector steps per domain | `DOMAIN` ENUM; `PROTOCOL` ENUM. | `DOMAIN` → `DOMAIN_ID_FK` + FK (served by `UK_DISCOVERY_STEP_DEF__DOMAIN_ID_CODE`); vocabulary → VARCHAR + CHECK. | Step chains differ per domain (Transport and IP/MPLS each have their own six) and the seed already carries them. |
| COLLECTOR | Collector node | `DOMAIN` ENUM (nullable); `STATUS` ENUM. | PK → INT; `DOMAIN` → nullable `DOMAIN_ID_FK` + FK + index; vocabulary → VARCHAR + CHECK. | D2, D3, D4. |
| CREDENTIAL_PROFILE | Vault reference for scans | `DOMAIN` ENUM (nullable); `PROTOCOL`, `ACCESS_MODE`, `NETWORK_PATH`, `STATUS` ENUM; `STATUS` partly derivable (NC5). | PK → INT; `DOMAIN` → nullable `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK. | No secret material in the database (guideline §6) is already right. |
| SCAN_JOB | Discovery job | `DOMAIN` ENUM; `SCHEDULE_KIND`, `SCHEDULE_STATE` ENUM. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK. | The schedule / held CHECKs are preserved unchanged. |
| SCAN_JOB_SCOPE | CIDR / seed / site / NF-set entry | `SCOPE_KIND` ENUM. | PK → INT; vocabulary → VARCHAR + CHECK. | D3, D4. |
| SCAN_TARGET | Address a job polls (+ latest-outcome cache) | `LAST_OUTCOME`, `LAST_FAILURE_REASON` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK; `IDX_SCAN_TARGET__LAST_OUTCOME` kept. | The Scan Targets grid's outcome filter and the pipeline funnel count by outcome. |
| SCAN_RUN | One execution of a job | `TRIGGER_SOURCE`, `STATUS` ENUM; `DURATION_MS BIGINT` generated. | PK → INT; vocabularies → VARCHAR + CHECK; `DURATION_MS` → INT UNSIGNED. | A run is bounded by the 6 h cycle SLA; INT holds 49 days. |
| SCAN_RUN_TARGET | One target in one run | `STATUS`, `OUTCOME`, `FAILURE_REASON`, `FAILURE_STAGE`, `MATCH_RULE`, `MATCH_CONFIDENCE` ENUM. | **PK stays BIGINT**; vocabularies → VARCHAR + CHECK. | Grows by targets × runs (50 k targets on a 15-minute continuous sweep is 4.8 M rows/day; INT would be exhausted in about 2.5 years even with purging, because ids are not reused). |
| SCAN_STEP_RESULT | One collector step per target per run | `STATE`, `FAILURE_REASON` ENUM. | **PK stays BIGINT**; vocabularies → VARCHAR + CHECK. | Six times `SCAN_RUN_TARGET`. |
| SCAN_STEP_PAYLOAD | Encrypted raw request / response | `KIND` ENUM; purge index scope (NC2). | **PK stays BIGINT**; vocabulary → VARCHAR + CHECK. | Two rows per step result. |

### L. Reconciliation

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| RECON_RULE | Rule with lifecycle owners | `DOMAIN` ENUM; `RULE_TYPE`, `PRIORITY`, `STATUS`, `ORIGIN` ENUM; `Â·` mojibake in comments. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK; comments fixed. Owner / reviewer / approver / executor FKs and indexes kept. | Those four are business roles that back the "my queue" views, unlike the creator stamp. `CODE` (`RUL-<RAN|COR|TRA|IPM>-NNN`) matches the application's `newId` prefixes. |
| RECON_RULE_CONDITION | Condition rows joined by AND / OR | `CONNECTOR`, `OPERATOR`, `TARGET_KIND` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | Mirrors the application's `Condition { sourceField, operator, targetField, connector }`. |
| RECON_RULE_TRANSITION | Allowed lifecycle moves | `FROM_STATUS`, `TO_STATUS`, `ACTION`, `ACTOR_ROLE` ENUM. | vocabularies → VARCHAR + CHECK. | FK target for `RECON_RULE_EVENT`. |
| RECON_RULE_EVENT | Approval / lifecycle trail of a rule | PK BIGINT; `FROM_STATUS`, `TO_STATUS`, `ACTION` ENUM. | PK → INT; the three columns follow the transition table's VARCHAR **without** a CHECK (the FK enforces them). | This is the workflow history the Rule Details Lifecycle / Activity tabs render: business, not audit. |
| RECON_JOB | Reconciliation job | `DOMAIN` ENUM; `SCAN_TYPE`, `SCHEDULE_STATE` ENUM; mojibake. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK; comments fixed. | D2, D3, D4. |
| RECON_JOB_RULE | Job ↔ rule (M:N) | PK BIGINT. | PK → INT. | D4. |
| RECON_RUN | One reconciliation cycle | `STATUS` ENUM; `IDX_RECON_RUN__RECON_JOB_ID` looks redundant. | PK → INT; vocabulary → VARCHAR + CHECK; both job indexes kept. | `STARTED_TIME` is nullable (D7). |
| RECON_RUN_RULE | One rule inside a run | PK BIGINT. | PK → INT. | D4. |
| RECON_RESULT | One element under one rule in one run | `SUBJECT_CLASS`, `OUTCOME`, `MATCH_RULE`, `MATCH_CONFIDENCE` ENUM. | **PK stays BIGINT**; vocabularies → VARCHAR + CHECK; six optional subject FKs + the one-subject CHECK kept. | Elements × rules × runs per day; the polymorphic-by-nullable-FK pattern is the enforceable alternative to a free-text subject. |
| RECON_RESULT_FIELD | Compared field values | PK BIGINT. | **PK stays BIGINT**. | Several rows per result. |
| DISCREPANCY_TYPE | Discrepancy labels | `DOMAIN` ENUM; `CATEGORY` ENUM. | `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabulary → VARCHAR + CHECK. | D2, D3. |
| RECON_EXCEPTION | Discrepancy needing a human | `DOMAIN` ENUM; `STATE`, `STATUS`, `DISPOSITION` ENUM. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK + index; vocabularies → VARCHAR + CHECK; all disposition / SLA CHECKs kept. | Exceptions are human-scale (INT). `DOMAIN` is stored although derivable because bulk exceptions may have no subject row. |

### M. Reports and metrics

| Table | Purpose | Issues found | Recommended changes | Reason |
|---|---|---|---|---|
| REPORT_DEFINITION | Report catalogue | `MODULE`, `AUDIENCE`, `CADENCE` ENUM. | PK → INT; vocabularies → VARCHAR + CHECK. | D3, D4. |
| REPORT_RUN | Generated report | `REPORT_TYPE`, `GENERATED_TYPE`, `FORMAT`, `STATUS` ENUM; `FILE_SIZE_BYTES BIGINT`; low-value `IDX_REPORT_RUN__REPORT_TYPE`. | PK → INT; vocabularies → VARCHAR + CHECK; `FILE_SIZE_BYTES` → INT UNSIGNED; index dropped. | Six report types on a table of thousands of rows: the optimizer would not choose it; the grid lists by status and time, which `IDX_REPORT_RUN__STATUS_CREATED_TIME` serves. |
| DOMAIN_TRUST_SNAPSHOT | Daily trust figures per domain | `DOMAIN` ENUM. | PK → INT; `DOMAIN` → `DOMAIN_ID_FK` + FK; UK renamed `UK_DOMAIN_TRUST_SNAPSHOT__SNAPSHOT_DATE_DOMAIN_ID`; index added. | Four rows per tenant per day. |
| ~~AUDIT_EVENT~~ | User-action log | Audit infrastructure. | Removed (Step 4). | D1. |

### Structural diff per table (generated from the two DDL files)

| # | Table | Section | PK v1 → v2 | Indexes v1 → v2 | FKs v1 → v2 | CHECKs v1 → v2 | Structural change |
|---|---|---|---|---|---|---|---|
| 1 | TENANT | A. PLATFORM REPLICAS | INT UNSIGNED → INT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 0 | none (comments and version stamp only) |
| 2 | USER | A. PLATFORM REPLICAS | BIGINT UNSIGNED → BIGINT UNSIGNED | 3 → 3 | 1 → 1 | 0 → 0 | none (comments and version stamp only) |
| 3 | TEAM | A. PLATFORM REPLICAS | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 3 → 1 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_TEAM__LAST_MODIFIER, IDX_TEAM__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 4 | VENDOR | B. METADATA | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 0 | none (comments and version stamp only) |
| 5 | SITE_TYPE | B. METADATA | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 0 | none (comments and version stamp only) |
| 6 | TECHNOLOGY | B. METADATA | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 0 | none (comments and version stamp only) |
| 7 | DEVICE_MODEL | B. METADATA | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 1 → 1 | 1 → 2 | 1 ENUM column → VARCHAR + CHECK (NE_CLASS) |
| 8 | PRIMARY_GEO_L1 | C. GEOGRAPHY AND OPERATIONAL AREAS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 3 → 1 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PRIMARY_GEO_L1__LAST_MODIFIER, IDX_PRIMARY_GEO_L1__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 9 | PRIMARY_GEO_L2 | C. GEOGRAPHY AND OPERATIONAL AREAS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PRIMARY_GEO_L2__LAST_MODIFIER, IDX_PRIMARY_GEO_L2__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 10 | PRIMARY_GEO_L3 | C. GEOGRAPHY AND OPERATIONAL AREAS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PRIMARY_GEO_L3__LAST_MODIFIER, IDX_PRIMARY_GEO_L3__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 11 | PRIMARY_GEO_L4 | C. GEOGRAPHY AND OPERATIONAL AREAS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PRIMARY_GEO_L4__LAST_MODIFIER, IDX_PRIMARY_GEO_L4__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (MORPHOLOGY) |
| 12 | OPERATIONAL_AREA | C. GEOGRAPHY AND OPERATIONAL AREAS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_OPERATIONAL_AREA__LAST_MODIFIER, IDX_OPERATIONAL_AREA__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (AREA_LEVEL) |
| 13 | SITE | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 10 → 8 | 7 → 5 | 1 → 5 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SITE__LAST_MODIFIER, IDX_SITE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 4 ENUM columns → VARCHAR + CHECK (CATEGORY, STATUS, COVERAGE_TYPE, ROLLOUT_STAGE) |
| 14 | SITE_ATTRIBUTE | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SITE_ATTRIBUTE__LAST_MODIFIER, IDX_SITE_ATTRIBUTE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (DATA_TYPE) |
| 15 | SITE_CONTACT | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SITE_CONTACT__LAST_MODIFIER, IDX_SITE_CONTACT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (CONTACT_ROLE) |
| 16 | SITE_ISSUE | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 5 → 3 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SITE_ISSUE__LAST_MODIFIER, IDX_SITE_ISSUE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (ISSUE_KIND, CATEGORY) |
| 17 | FLOOR | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_FLOOR__LAST_MODIFIER, IDX_FLOOR__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 18 | ROOM | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_ROOM__LAST_MODIFIER, IDX_ROOM__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (ROOM_TYPE) |
| 19 | RACK | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RACK__LAST_MODIFIER, IDX_RACK__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (ROLE) |
| 20 | POWER_FEED | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_POWER_FEED__LAST_MODIFIER, IDX_POWER_FEED__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (KIND, STATUS) |
| 21 | POWER_UNIT | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 5 → 3 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_POWER_UNIT__LAST_MODIFIER, IDX_POWER_UNIT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (KIND, STATUS) |
| 22 | POWER_UNIT_TEST | D. LOCATION: sites and facility | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_POWER_UNIT_TEST__LAST_MODIFIER, IDX_POWER_UNIT_TEST__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (RESULT) |
| 23 | NETWORK_ELEMENT | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 15 → 14 | 9 → 8 | 4 → 11 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NETWORK_ELEMENT__LAST_MODIFIER, IDX_NETWORK_ELEMENT__CREATOR; index added: IDX_NETWORK_ELEMENT__DOMAIN_ID; index renamed for DOMAIN_ID_FK: IDX_NETWORK_ELEMENT__DOMAIN_ID_RECON_STATE; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 8 ENUM columns → VARCHAR + CHECK (NE_CLASS, DOMAIN, STOCK_STATE, OPER_STATUS, ADMIN_STATE, RECORD_SOURCE, RECON_STATE, DECOMMISSION_REASON); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 24 | NE_STOCK_TRANSITION | E. PHYSICAL RESOURCES | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 3 | 3 ENUM columns → VARCHAR + CHECK (FROM_STATE, TO_STATE, MOVEMENT_TYPE) |
| 25 | NE_MOVEMENT | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 8 → 6 | 7 → 5 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NE_MOVEMENT__LAST_MODIFIER, IDX_NE_MOVEMENT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (FROM_STATE, TO_STATE) |
| 26 | NE_EXTERNAL_REF | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NE_EXTERNAL_REF__LAST_MODIFIER, IDX_NE_EXTERNAL_REF__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (EXTERNAL_SYSTEM) |
| 27 | NE_ASSET | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 2 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NE_ASSET__LAST_MODIFIER, IDX_NE_ASSET__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (OWNERSHIP) |
| 28 | NE_FIELD_PROVENANCE | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NE_FIELD_PROVENANCE__LAST_MODIFIER, IDX_NE_FIELD_PROVENANCE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (FIELD_NAME, SOURCE) |
| 29 | NE_HEALTH | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 2 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_NE_HEALTH__LAST_MODIFIER, IDX_NE_HEALTH__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (REACHABILITY, NTP_STATUS) |
| 30 | EQUIPMENT_COMPONENT | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 5 → 3 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_EQUIPMENT_COMPONENT__LAST_MODIFIER, IDX_EQUIPMENT_COMPONENT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (COMPONENT_CLASS, STATUS, RECORD_STATE) |
| 31 | PORT | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 10 → 8 | 7 → 5 | 3 → 11 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PORT__LAST_MODIFIER, IDX_PORT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 8 ENUM columns → VARCHAR + CHECK (PORT_KIND, MEDIA, CONNECTOR, DIRECTION, ADMIN_STATUS, OPER_STATUS, USAGE_STATE, RECORD_STATE) |
| 32 | PORT_IP_ADDRESS | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 2 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PORT_IP_ADDRESS__LAST_MODIFIER, IDX_PORT_IP_ADDRESS__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 33 | VLAN | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_VLAN__LAST_MODIFIER, IDX_VLAN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (VLAN_TYPE, STATUS) |
| 34 | PORT_VLAN | E. PHYSICAL RESOURCES | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 0 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PORT_VLAN__LAST_MODIFIER, IDX_PORT_VLAN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (MODE, STP_STATE) |
| 35 | RADIO_BAND | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RADIO_BAND__LAST_MODIFIER, IDX_RADIO_BAND__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (STATUS); FREQUENCY_MHZ SMALLINT UNSIGNED → INT UNSIGNED |
| 36 | CLOUD_CLUSTER | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_CLOUD_CLUSTER__LAST_MODIFIER, IDX_CLOUD_CLUSTER__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (PLATFORM) |
| 37 | VIRTUAL_NETWORK_FUNCTION | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 12 → 11 | 8 → 7 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_VIRTUAL_NETWORK_FUNCTION__LAST_MODIFIER, IDX_VIRTUAL_NETWORK_FUNCTION__CREATOR; index added: IDX_VIRTUAL_NETWORK_FUNCTION__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 4 ENUM columns → VARCHAR + CHECK (NF_TYPE, DOMAIN, STATUS, RECORD_SOURCE); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 38 | VNF_LIFECYCLE_STEP | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_VNF_LIFECYCLE_STEP__LAST_MODIFIER, IDX_VNF_LIFECYCLE_STEP__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (STAGE, STATUS) |
| 39 | RADIO_CELL | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 10 → 8 | 8 → 6 | 4 → 6 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RADIO_CELL__LAST_MODIFIER, IDX_RADIO_CELL__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (TECHNOLOGY_GEN, CELL_STATUS) |
| 40 | RADIO_CELL_PARAMETER | F. RADIO ACCESS | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RADIO_CELL_PARAMETER__LAST_MODIFIER, IDX_RADIO_CELL_PARAMETER__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 41 | PASSIVE_ASSET | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 8 → 6 | 6 → 4 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PASSIVE_ASSET__LAST_MODIFIER, IDX_PASSIVE_ASSET__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (ASSET_TYPE, STATUS, OWNERSHIP) |
| 42 | FIBER_SPAN | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 6 → 4 | 2 → 6 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_FIBER_SPAN__LAST_MODIFIER, IDX_FIBER_SPAN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 4 ENUM columns → VARCHAR + CHECK (CABLE_TYPE, INSTALL_METHOD, BUILD_PHASE, BUILD_STAGE) |
| 43 | FIBER_CORE | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 6 → 4 | 2 → 5 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_FIBER_CORE__LAST_MODIFIER, IDX_FIBER_CORE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (STRAND_COLOUR, STATUS, SERVICE_USE) |
| 44 | OTDR_TEST | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_OTDR_TEST__LAST_MODIFIER, IDX_OTDR_TEST__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (DIRECTION, RESULT) |
| 45 | ODF | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_ODF__LAST_MODIFIER, IDX_ODF__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (FRAME_TYPE, TERMINATION, ENVIRONMENT) |
| 46 | SPLICE_CLOSURE | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 5 → 3 | 0 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SPLICE_CLOSURE__LAST_MODIFIER, IDX_SPLICE_CLOSURE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (CLOSURE_TYPE, HOUSING, INGRESS_RATING) |
| 47 | SPLICE | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 6 → 4 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SPLICE__LAST_MODIFIER, IDX_SPLICE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 48 | PATCH_CORD | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 6 → 4 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_PATCH_CORD__LAST_MODIFIER, IDX_PATCH_CORD__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (CORD_TYPE) |
| 49 | DUCT | G. PASSIVE PLANT | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 6 → 4 | 2 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_DUCT__LAST_MODIFIER, IDX_DUCT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (INSTALL_METHOD) |
| 50 | LINK | H. LINKS | BIGINT UNSIGNED → INT UNSIGNED | 10 → 8 | 7 → 5 | 5 → 9 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_LINK__LAST_MODIFIER, IDX_LINK__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 4 ENUM columns → VARCHAR + CHECK (LAYER, STATUS, RECORD_SOURCE, RECORD_STATE) |
| 51 | LINK_PROTOCOL_ATTR | H. LINKS | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_LINK_PROTOCOL_ATTR__LAST_MODIFIER, IDX_LINK_PROTOCOL_ATTR__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (ISIS_LEVEL) |
| 52 | SERVICE_INSTANCE | I. SERVICES | BIGINT UNSIGNED → INT UNSIGNED | 7 → 6 | 3 → 2 | 3 → 8 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SERVICE_INSTANCE__LAST_MODIFIER, IDX_SERVICE_INSTANCE__CREATOR; index added: IDX_SERVICE_INSTANCE__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 6 ENUM columns → VARCHAR + CHECK (SERVICE_TYPE, DOMAIN, STATUS, REFERENCE_KIND, RECORD_SOURCE, RECORD_STATE); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 53 | SERVICE_ENDPOINT | I. SERVICES | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 6 → 4 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SERVICE_ENDPOINT__LAST_MODIFIER, IDX_SERVICE_ENDPOINT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (ENDPOINT_ROLE, ADMIN_STATUS, OPER_STATUS) |
| 54 | SERVICE_ROUTE_TARGET | I. SERVICES | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SERVICE_ROUTE_TARGET__LAST_MODIFIER, IDX_SERVICE_ROUTE_TARGET__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (DIRECTION) |
| 55 | CAPEX_PLAN | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 5 → 3 | 2 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_CAPEX_PLAN__LAST_MODIFIER, IDX_CAPEX_PLAN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 56 | CAPEX_LINE | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 5 → 3 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_CAPEX_LINE__LAST_MODIFIER, IDX_CAPEX_LINE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (CATEGORY, STATE) |
| 57 | CAPEX_LINE_ELEMENT | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_CAPEX_LINE_ELEMENT__LAST_MODIFIER, IDX_CAPEX_LINE_ELEMENT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 58 | OPEX_PLAN | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 5 → 3 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_OPEX_PLAN__LAST_MODIFIER, IDX_OPEX_PLAN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 59 | OPEX_LINE | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 4 → 2 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_OPEX_LINE__LAST_MODIFIER, IDX_OPEX_LINE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (CATEGORY, FREQUENCY, STATE) |
| 60 | OPEX_MONTH_ACTUAL | J. SITE FINANCE | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_OPEX_MONTH_ACTUAL__LAST_MODIFIER, IDX_OPEX_MONTH_ACTUAL__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 61 | DISCOVERY_STEP_DEF | K. DISCOVERY | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 3 → 3 | 0 → 1 | 0 → 1 | index renamed for DOMAIN_ID_FK: UK_DISCOVERY_STEP_DEF__DOMAIN_ID_CODE, UK_DISCOVERY_STEP_DEF__DOMAIN_ID_SEQUENCE_NO; FK added: DOMAIN_ID; 2 ENUM columns → VARCHAR + CHECK (DOMAIN, PROTOCOL); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 62 | COLLECTOR | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 5 → 4 | 3 → 2 | 0 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_COLLECTOR__LAST_MODIFIER, IDX_COLLECTOR__CREATOR; index added: IDX_COLLECTOR__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 2 ENUM columns → VARCHAR + CHECK (DOMAIN, STATUS); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 63 | CREDENTIAL_PROFILE | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 6 → 5 | 4 → 3 | 0 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_CREDENTIAL_PROFILE__LAST_MODIFIER, IDX_CREDENTIAL_PROFILE__CREATOR; index added: IDX_CREDENTIAL_PROFILE__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 5 ENUM columns → VARCHAR + CHECK (PROTOCOL, ACCESS_MODE, NETWORK_PATH, DOMAIN, STATUS); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 64 | SCAN_JOB | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 9 → 8 | 6 → 5 | 2 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SCAN_JOB__LAST_MODIFIER, IDX_SCAN_JOB__CREATOR; index added: IDX_SCAN_JOB__DOMAIN_ID; index renamed for DOMAIN_ID_FK: IDX_SCAN_JOB__DOMAIN_ID_SCHEDULE_STATE; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 3 ENUM columns → VARCHAR + CHECK (DOMAIN, SCHEDULE_KIND, SCHEDULE_STATE); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 65 | SCAN_JOB_SCOPE | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SCAN_JOB_SCOPE__LAST_MODIFIER, IDX_SCAN_JOB_SCOPE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (SCOPE_KIND) |
| 66 | SCAN_TARGET | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 9 → 7 | 6 → 4 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SCAN_TARGET__LAST_MODIFIER, IDX_SCAN_TARGET__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (LAST_OUTCOME, LAST_FAILURE_REASON) |
| 67 | SCAN_RUN | K. DISCOVERY | BIGINT UNSIGNED → INT UNSIGNED | 6 → 4 | 4 → 2 | 1 → 3 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_SCAN_RUN__LAST_MODIFIER, IDX_SCAN_RUN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (TRIGGER_SOURCE, STATUS); DURATION_MS BIGINT UNSIGNED → INT UNSIGNED |
| 68 | SCAN_RUN_TARGET | K. DISCOVERY | BIGINT UNSIGNED → BIGINT UNSIGNED | 7 → 5 | 6 → 4 | 2 → 8 | index dropped: IDX_SCAN_RUN_TARGET__LAST_MODIFIER, IDX_SCAN_RUN_TARGET__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 6 ENUM columns → VARCHAR + CHECK (STATUS, OUTCOME, FAILURE_REASON, FAILURE_STAGE, MATCH_RULE, MATCH_CONFIDENCE) |
| 69 | SCAN_STEP_RESULT | K. DISCOVERY | BIGINT UNSIGNED → BIGINT UNSIGNED | 6 → 4 | 5 → 3 | 1 → 3 | index dropped: IDX_SCAN_STEP_RESULT__LAST_MODIFIER, IDX_SCAN_STEP_RESULT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 2 ENUM columns → VARCHAR + CHECK (STATE, FAILURE_REASON) |
| 70 | SCAN_STEP_PAYLOAD | K. DISCOVERY | BIGINT UNSIGNED → BIGINT UNSIGNED | 5 → 3 | 4 → 2 | 0 → 1 | index dropped: IDX_SCAN_STEP_PAYLOAD__LAST_MODIFIER, IDX_SCAN_STEP_PAYLOAD__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (KIND) |
| 71 | RECON_RULE | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 11 → 10 | 8 → 7 | 0 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_RULE__LAST_MODIFIER, IDX_RECON_RULE__CREATOR; index added: IDX_RECON_RULE__DOMAIN_ID; index renamed for DOMAIN_ID_FK: IDX_RECON_RULE__DOMAIN_ID_STATUS; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 5 ENUM columns → VARCHAR + CHECK (DOMAIN, RULE_TYPE, PRIORITY, STATUS, ORIGIN); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 72 | RECON_RULE_CONDITION | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 4 → 2 | 4 → 2 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_RULE_CONDITION__LAST_MODIFIER, IDX_RECON_RULE_CONDITION__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (CONNECTOR, OPERATOR, TARGET_KIND) |
| 73 | RECON_RULE_TRANSITION | L. RECONCILIATION | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 2 | 0 → 0 | 0 → 4 | 4 ENUM columns → VARCHAR + CHECK (FROM_STATUS, TO_STATUS, ACTION, ACTOR_ROLE) |
| 74 | RECON_RULE_EVENT | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 6 → 4 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_RULE_EVENT__LAST_MODIFIER, IDX_RECON_RULE_EVENT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (FROM_STATUS, TO_STATUS, ACTION) |
| 75 | RECON_JOB | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 5 → 4 | 3 → 2 | 0 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_JOB__LAST_MODIFIER, IDX_RECON_JOB__CREATOR; index added: IDX_RECON_JOB__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 3 ENUM columns → VARCHAR + CHECK (DOMAIN, SCAN_TYPE, SCHEDULE_STATE); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 76 | RECON_JOB_RULE | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_JOB_RULE__LAST_MODIFIER, IDX_RECON_JOB_RULE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 77 | RECON_RUN | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 7 → 5 | 5 → 3 | 1 → 2 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_RUN__LAST_MODIFIER, IDX_RECON_RUN__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 1 ENUM column → VARCHAR + CHECK (STATUS) |
| 78 | RECON_RUN_RULE | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 5 → 3 | 0 → 0 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_RUN_RULE__LAST_MODIFIER, IDX_RECON_RUN_RULE__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 79 | RECON_RESULT | L. RECONCILIATION | BIGINT UNSIGNED → BIGINT UNSIGNED | 13 → 11 | 11 → 9 | 1 → 5 | index dropped: IDX_RECON_RESULT__LAST_MODIFIER, IDX_RECON_RESULT__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 4 ENUM columns → VARCHAR + CHECK (SUBJECT_CLASS, OUTCOME, MATCH_RULE, MATCH_CONFIDENCE) |
| 80 | RECON_RESULT_FIELD | L. RECONCILIATION | BIGINT UNSIGNED → BIGINT UNSIGNED | 4 → 2 | 4 → 2 | 0 → 0 | index dropped: IDX_RECON_RESULT_FIELD__LAST_MODIFIER, IDX_RECON_RESULT_FIELD__CREATOR; FK dropped: CREATOR, LAST_MODIFIER |
| 81 | DISCREPANCY_TYPE | L. RECONCILIATION | SMALLINT UNSIGNED → SMALLINT UNSIGNED | 2 → 3 | 0 → 1 | 0 → 1 | index added: IDX_DISCREPANCY_TYPE__DOMAIN_ID; FK added: DOMAIN_ID; 2 ENUM columns → VARCHAR + CHECK (CATEGORY, DOMAIN); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 82 | RECON_EXCEPTION | L. RECONCILIATION | BIGINT UNSIGNED → INT UNSIGNED | 16 → 15 | 13 → 12 | 6 → 9 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_RECON_EXCEPTION__LAST_MODIFIER, IDX_RECON_EXCEPTION__CREATOR; index added: IDX_RECON_EXCEPTION__DOMAIN_ID; index renamed for DOMAIN_ID_FK: IDX_RECON_EXCEPTION__DOMAIN_ID_STATE; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 4 ENUM columns → VARCHAR + CHECK (STATE, DOMAIN, STATUS, DISPOSITION); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 83 | REPORT_DEFINITION | M. REPORTS AND METRICS | BIGINT UNSIGNED → INT UNSIGNED | 5 → 3 | 3 → 1 | 1 → 4 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_REPORT_DEFINITION__LAST_MODIFIER, IDX_REPORT_DEFINITION__CREATOR; FK dropped: CREATOR, LAST_MODIFIER; 3 ENUM columns → VARCHAR + CHECK (MODULE, AUDIENCE, CADENCE) |
| 84 | REPORT_RUN | M. REPORTS AND METRICS | BIGINT UNSIGNED → INT UNSIGNED | 7 → 4 | 4 → 2 | 1 → 5 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: IDX_REPORT_RUN__LAST_MODIFIER, IDX_REPORT_RUN__CREATOR, IDX_REPORT_RUN__REPORT_TYPE; FK dropped: CREATOR, LAST_MODIFIER; 4 ENUM columns → VARCHAR + CHECK (REPORT_TYPE, GENERATED_TYPE, FORMAT, STATUS); FILE_SIZE_BYTES BIGINT UNSIGNED → INT UNSIGNED |
| 85 | DOMAIN_TRUST_SNAPSHOT | M. REPORTS AND METRICS | BIGINT UNSIGNED → INT UNSIGNED | 4 → 3 | 3 → 2 | 1 → 1 | PK BIGINT UNSIGNED → INT UNSIGNED; index dropped: UK_DOMAIN_TRUST_SNAPSHOT__SNAPSHOT_DATE_DOMAIN, IDX_DOMAIN_TRUST_SNAPSHOT__LAST_MODIFIER, IDX_DOMAIN_TRUST_SNAPSHOT__CREATOR; index added: UK_DOMAIN_TRUST_SNAPSHOT__SNAPSHOT_DATE_DOMAIN_ID, IDX_DOMAIN_TRUST_SNAPSHOT__DOMAIN_ID; FK dropped: CREATOR, LAST_MODIFIER; FK added: DOMAIN_ID; 1 ENUM column → VARCHAR + CHECK (DOMAIN); DOMAIN → DOMAIN_ID_FK (FK DOMAIN) |
| 86 | DOMAIN | B. METADATA | — → SMALLINT UNSIGNED | — → 4 | — → 1 | — → 0 | NEW: domain taxonomy lookup (replaces the DOMAIN ENUM in 12 tables) |

---

## 3. Column-by-column review (Step 3)

Every column of every table was checked against the 14 questions in the brief. The rules that decided most columns:

- **Names**: consistent already (`SNAKE_UPPER_CASE`, `_FK` suffix on enforced references, `*_TIME` for DATETIME(3), `IS_*` for booleans, `*_PCT`, `*_MS`, `*_KM`). Only one rename: `DOMAIN` → `DOMAIN_ID_FK` (it is now an FK).
- **Types**: DATETIME(3) UTC for instants, DATE for calendar facts, DECIMAL for money and measures, TINYINT(1) booleans, VARCHAR sized to the data (`VARCHAR(45)` IPs, `CHAR(17)` MAC, `CHAR(3)` currency, `VARCHAR(253)` hostnames, `VARCHAR(64)` serials / versions / circuit ids). All kept.
- **Vocabularies**: `VARCHAR(n)` where n is the smallest of 8 / 16 / 24 / 32 that leaves at least 4 characters of headroom above the longest value (9 columns at 8, 98 at 16, 35 at 24, 5 at 32 across the converted columns), guarded by `CK_<TABLE>__<COLUMN>_VALUES` or by an FK to the transition table.
- **Nullability**: NULL is used only where "unknown / not applicable" is a real state (e.g. `Z_NE_ID_FK` for a neighbour not in inventory, `RESOLVED_TIME` while open, `RACK_ID_FK` for unmounted devices), and every such NULL is tied to a state by a CHECK where v1 already did so. No nullable column was found that should be NOT NULL, and no default was added merely to remove a NULL.
- **Defaults**: state columns default to their initial state (`PLANNED`, `UNKNOWN`, `OPEN`, `DRAFT`, `NOT_STARTED`, `FREE`, `ACTIVE`); counters default to 0; timestamps to `CURRENT_TIMESTAMP(3)`. Kept.

### Columns reviewed and deliberately kept (the non-obvious ones)

| Table.Column | Type | Why it stays as is |
|---|---|---|
| NETWORK_ELEMENT.MANAGEMENT_IP, PORT_IP_ADDRESS.IP_ADDRESS, SCAN_TARGET.IP_ADDRESS, LINK.A_IP_ADDRESS / Z_IP_ADDRESS | VARCHAR(45) + IS_IPV4/IS_IPV6 CHECK | Readable, validated, JPA-friendly; add a generated `INET6_ATON` column only when CIDR-range queries are needed. |
| NETWORK_ELEMENT.SERIAL_NUMBER | VARCHAR(64), indexed, **not** unique | Duplicate serials are real and are raised as DUPLICATE discrepancies (smoke test `duplicate_serial_allowed`). |
| NETWORK_ELEMENT.RECON_STATE, LAST_VERIFIED_TIME; SCAN_TARGET.LAST_OUTCOME, LAST_FAILURE_REASON, LAST_SYNC_TIME, CONSECUTIVE_FAILED_RUNS | caches | Documented caches written by the jobs so the grids need no join to the run tables; consistency query in the previous review (N-03). |
| NETWORK_ELEMENT.CONFIG_TEMPLATE | VARCHAR(64) | The ZTP template applied is an inventory attribute; config backups themselves are out of scope (D-I4). |
| RADIO_CELL.CELL_IDENTITY | BIGINT UNSIGNED | 5G NCI is 36 bits: the one non-key BIGINT the model needs. |
| RADIO_CELL.EARFCN_DL / UL, TAC | INT UNSIGNED | NR-ARFCN up to 3 279 165 and 24-bit 5G TAC exceed SMALLINT. |
| RADIO_CELL.PCI, RSI, SECTOR, AZIMUTH_DEG | SMALLINT / TINYINT UNSIGNED | Bounded by 3GPP ranges; PCI CHECK depends on `TECHNOLOGY_GEN`. |
| LINK_PROTOCOL_ATTR.LOCAL_ASN / REMOTE_ASN | INT UNSIGNED + CHECK | 4-byte ASNs. |
| PORT.SPEED_MBPS, LINK.CAPACITY_MBPS, SERVICE_INSTANCE.BANDWIDTH_MBPS | INT UNSIGNED | 4 Tbit/s ceiling is sufficient; SMALLINT would cap at 65 Gbit/s. |
| PORT.MTU, VLAN.VLAN_NUMBER | SMALLINT UNSIGNED | 65 535 / 1–4094 with CHECK. |
| DEVICE_MODEL.POWER_DRAW_W | SMALLINT UNSIGNED | Largest chassis draw ~20 kW < 65 535 W. |
| SCAN_RUN.RUN_NO, RECON_RUN_RULE.MATCHED_COUNT / EXCEPTION_COUNT, RECON_EXCEPTION.AFFECTED_RECORD_COUNT | INT UNSIGNED | Counters that can exceed 65 535 (runs of a continuous job; bulk exceptions over tens of thousands of records). |
| SCAN_TARGET.CONSECUTIVE_FAILED_RUNS | SMALLINT UNSIGNED | Reset on success; 3 already means "missing". |
| SCAN_STEP_RESULT.RESPONSE_BYTES, SCAN_STEP_PAYLOAD.CONTENT_BYTES | INT UNSIGNED | 4 GB ceiling for a single device response. |
| *.SEQUENCE_NO | SMALLINT / TINYINT UNSIGNED | Order within a parent (conditions, steps). |
| *.ROW_VERSION | INT UNSIGNED | JPA `@Version` optimistic lock: application concurrency control, not audit. |
| *.IS_DELETED + LIVE_FLAG | TINYINT(1) + generated | Soft delete is a business lifecycle (a retired collector or rule stays referenced); `LIVE_FLAG` lets unique keys ignore deleted rows. |
| SITE_CONTACT.PHONE_ENC / EMAIL_ENC / ENCRYPTION_KEY_REF | VARBINARY + key ref | PII encrypted at rest with a CHECK binding data to key reference. |
| CREDENTIAL_PROFILE.VAULT_REF | VARCHAR(200) | The only credential-shaped column, and it is a reference, not a secret. |
| VIRTUAL_NETWORK_FUNCTION.UUID | CHAR(36) | Maps to `java.util.UUID`; readable in every query. |
| CAPEX_PLAN.FINANCIAL_YEAR | CHAR(7) + regex CHECK | `2026-27`. |
| SITE.LATITUDE / LONGITUDE (and geo levels) | DECIMAL(9,6) + range CHECK | ~11 cm precision; both-or-neither enforced. |

### Every column that changed (generated from the two DDL files)

| Table | Column | v1 type | v2 type | Nullable | Change | Reason |
|---|---|---|---|---|---|---|
| TEAM | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| TEAM | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| TEAM | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DEVICE_MODEL | NE_CLASS | ENUM('ROUTER','SWITCH','SERVER','DWDM','ENODEB','GNODEB','OLT','ONT','FIREWALL','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PRIMARY_GEO_L1 | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PRIMARY_GEO_L1 | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L1 | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L2 | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PRIMARY_GEO_L2 | PRIMARY_GEO_L1_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PRIMARY_GEO_L2 | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L2 | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L3 | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PRIMARY_GEO_L3 | PRIMARY_GEO_L2_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PRIMARY_GEO_L3 | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L3 | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L4 | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PRIMARY_GEO_L4 | PRIMARY_GEO_L3_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PRIMARY_GEO_L4 | MORPHOLOGY | ENUM('DENSE_URBAN','URBAN','SUBURBAN','RURAL') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PRIMARY_GEO_L4 | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PRIMARY_GEO_L4 | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPERATIONAL_AREA | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| OPERATIONAL_AREA | PARENT_AREA_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| OPERATIONAL_AREA | AREA_LEVEL | ENUM('REGION','CIRCLE','ZONE','DIVISION','TERRITORY') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OPERATIONAL_AREA | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPERATIONAL_AREA | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SITE | CATEGORY | ENUM('CENTRAL','REGIONAL','EDGE','ACCESS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE | STATUS | ENUM('PLANNED','IN_PROGRESS','ON_AIR','FAILED','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE | PARENT_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE | PRIMARY_GEO_L4_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE | OPERATIONAL_AREA_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE | COVERAGE_TYPE | ENUM('OUTDOOR','INDOOR','MACRO_CELL','MICRO_CELL','RURAL','URBAN','HIGHWAY') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE | ROLLOUT_STAGE | ENUM('COMMISSIONED','UNDER_DEPLOYMENT','ATP_PENDING','INTEGRATION_PENDING','BLOCKED') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_ATTRIBUTE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SITE_ATTRIBUTE | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE_ATTRIBUTE | DATA_TYPE | ENUM('STRING','NUMBER','BOOLEAN','DATE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE_ATTRIBUTE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_ATTRIBUTE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_CONTACT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SITE_CONTACT | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE_CONTACT | CONTACT_ROLE | ENUM('SITE_OWNER','LANDLORD','FIELD_ENGINEER','SECURITY','OTHER') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE_CONTACT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_CONTACT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_ISSUE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SITE_ISSUE | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE_ISSUE | ISSUE_KIND | ENUM('BLOCKER','RISK') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE_ISSUE | CATEGORY | ENUM('LEASE_PROPERTY','POWER','FIBER_CONNECTIVITY','CIVIL_INFRASTRUCTURE','REGULATORY','SUPPLY_CHAIN','COMMISSIONING','CAPACITY') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SITE_ISSUE | OWNER_TEAM_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SITE_ISSUE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SITE_ISSUE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FLOOR | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| FLOOR | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FLOOR | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FLOOR | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| ROOM | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| ROOM | FLOOR_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| ROOM | ROOM_TYPE | ENUM('EQUIPMENT','BATTERY','MDF','POWER','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| ROOM | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| ROOM | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RACK | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RACK | ROOM_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RACK | ROLE | ENUM('ACTIVE','PASSIVE','MIXED','POWER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RACK | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RACK | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_FEED | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| POWER_FEED | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| POWER_FEED | KIND | ENUM('AC','DC') | VARCHAR(8) | NOT NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| POWER_FEED | STATUS | ENUM('NORMAL','HIGH','ALARM') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| POWER_FEED | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_FEED | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_UNIT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| POWER_UNIT | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| POWER_UNIT | KIND | ENUM('DG_SET','RECTIFIER','SMPS','BATTERY','UPS','SOLAR') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| POWER_UNIT | STATUS | ENUM('IN_SERVICE','DEGRADED','FAILED','PLANNED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| POWER_UNIT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_UNIT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_UNIT_TEST | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| POWER_UNIT_TEST | POWER_UNIT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| POWER_UNIT_TEST | RESULT | ENUM('PASS','MARGINAL','FAIL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| POWER_UNIT_TEST | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| POWER_UNIT_TEST | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NETWORK_ELEMENT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NETWORK_ELEMENT | NE_CLASS | ENUM('ROUTER','SWITCH','SERVER','DWDM','ENODEB','GNODEB','OLT','ONT','FIREWALL','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| NETWORK_ELEMENT | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NETWORK_ELEMENT | RACK_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NETWORK_ELEMENT | PARENT_NE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NETWORK_ELEMENT | STOCK_STATE | ENUM('PLANNED','IN_STORE','IN_TRANSIT','DEPLOYED','FAULTY_RMA','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | OPER_STATUS | ENUM('READY','PLANNED','UP','DOWN','DEGRADED','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | ADMIN_STATE | ENUM('UNLOCKED','LOCKED','SHUTTING_DOWN') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | RECORD_SOURCE | ENUM('DISCOVERED','PLANNED_CIQ','MANUAL','EMS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | RECON_STATE | ENUM('VERIFIED','DRIFTED','STALE','MISSING','DUPLICATE','NOT_DISCOVERED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | DECOMMISSION_REASON | ENUM('CHANGE_REQUEST_REPLACEMENT','END_OF_LIFE','END_OF_SUPPORT','FAULTY_RETURNED','SITE_CONSOLIDATION','CAPACITY_MIGRATION','HARDWARE_REFRESH','WRITTEN_OFF','LEASE_EXPIRED','RING_REDESIGN','TECHNOLOGY_UPGRADE','OTHER') | VARCHAR(32) | NULL | ENUM → VARCHAR(32) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NETWORK_ELEMENT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NETWORK_ELEMENT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_STOCK_TRANSITION | FROM_STATE | ENUM('PLANNED','IN_STORE','IN_TRANSIT','DEPLOYED','FAULTY_RMA','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_STOCK_TRANSITION | TO_STATE | ENUM('PLANNED','IN_STORE','IN_TRANSIT','DEPLOYED','FAULTY_RMA','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_STOCK_TRANSITION | MOVEMENT_TYPE | ENUM('RECEIVE','ISSUE','DISPATCH','INSTALL','DE_INSTALL','RMA_OUT','RMA_IN','DECOMMISSION','RECOVER','SCRAP') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_MOVEMENT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NE_MOVEMENT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_MOVEMENT | FROM_STATE | ENUM('PLANNED','IN_STORE','IN_TRANSIT','DEPLOYED','FAULTY_RMA','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_MOVEMENT | TO_STATE | ENUM('PLANNED','IN_STORE','IN_TRANSIT','DEPLOYED','FAULTY_RMA','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_MOVEMENT | FROM_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_MOVEMENT | TO_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_MOVEMENT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_MOVEMENT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_EXTERNAL_REF | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NE_EXTERNAL_REF | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_EXTERNAL_REF | EXTERNAL_SYSTEM | ENUM('FM_EMS','PM_EMS','CM_EMS','CMDB','ERP','USM','NMS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_EXTERNAL_REF | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_EXTERNAL_REF | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_ASSET | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NE_ASSET | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_ASSET | OWNERSHIP | ENUM('OWNED','LEASED','RENTED','IRU','VENDOR_MANAGED','CUSTOMER_PROVIDED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_ASSET | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_ASSET | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_FIELD_PROVENANCE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NE_FIELD_PROVENANCE | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_FIELD_PROVENANCE | FIELD_NAME | ENUM('MANAGEMENT_IP','VENDOR','MODEL','OS_VERSION','SERIAL_NUMBER','MAC_ADDRESS','UPTIME','ADJACENCIES','SERVICES','SITE','STOCK_STATE','WARRANTY') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_FIELD_PROVENANCE | SOURCE | ENUM('SCOPE','DERIVED_SYS_OBJECT_ID','DEVICE_COLLECTOR','HARDWARE_COLLECTOR','LINK_COLLECTOR','SERVICE_COLLECTOR','MANUAL','WORK_ORDER','PLANNED_CIQ','EMS','ERP') | VARCHAR(32) | NOT NULL | ENUM → VARCHAR(32) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_FIELD_PROVENANCE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_FIELD_PROVENANCE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_HEALTH | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| NE_HEALTH | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| NE_HEALTH | REACHABILITY | ENUM('REACHABLE','UNREACHABLE','DEGRADED','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_HEALTH | NTP_STATUS | ENUM('SYNCED','UNSYNCED','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| NE_HEALTH | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| NE_HEALTH | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| EQUIPMENT_COMPONENT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| EQUIPMENT_COMPONENT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| EQUIPMENT_COMPONENT | PARENT_COMPONENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| EQUIPMENT_COMPONENT | COMPONENT_CLASS | ENUM('CHASSIS','ROUTING_ENGINE','LINE_CARD','PIC','MODULE','TRANSCEIVER','PSU','FAN','SHELF','OTHER') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| EQUIPMENT_COMPONENT | STATUS | ENUM('ONLINE','DEGRADING','FAILED','EMPTY','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| EQUIPMENT_COMPONENT | RECORD_STATE | ENUM('ACTIVE','INACTIVE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| EQUIPMENT_COMPONENT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| EQUIPMENT_COMPONENT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PORT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT | EQUIPMENT_COMPONENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT | PARENT_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT | PORT_KIND | ENUM('PHYSICAL','SUB_INTERFACE','BUNDLE','LOOPBACK','TUNNEL','MANAGEMENT','PASSIVE') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | MEDIA | ENUM('ETHERNET','OPTICAL','SFP','SERIAL','COAXIAL','POWER','FIBER') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | CONNECTOR | ENUM('RJ45','LC','SC','FC','E2000','MPO') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | DIRECTION | ENUM('IN','OUT','BIDIRECTIONAL') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | ADMIN_STATUS | ENUM('UP','DOWN') | VARCHAR(8) | NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | OPER_STATUS | ENUM('UP','DOWN','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | USAGE_STATE | ENUM('FREE','OCCUPIED','RESERVED','FAULTY','BLOCKED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | RECORD_STATE | ENUM('ACTIVE','INACTIVE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT_IP_ADDRESS | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PORT_IP_ADDRESS | PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT_IP_ADDRESS | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT_IP_ADDRESS | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VLAN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| VLAN | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| VLAN | VLAN_TYPE | ENUM('DATA','SERVER','WIRELESS','VOICE','GUEST','MANAGEMENT') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VLAN | STATUS | ENUM('ACTIVE','SUSPENDED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VLAN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VLAN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT_VLAN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PORT_VLAN | PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT_VLAN | VLAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PORT_VLAN | MODE | ENUM('ACCESS','TRUNK') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT_VLAN | STP_STATE | ENUM('FORWARDING','BLOCKING','LEARNING','DISABLED') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PORT_VLAN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PORT_VLAN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_BAND | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RADIO_BAND | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_BAND | FREQUENCY_MHZ | SMALLINT UNSIGNED | INT UNSIGNED | NOT NULL | SMALLINT UNSIGNED → INT UNSIGNED | Band centre frequency in MHz (INT: mmWave bands such as n263 reach 71 000 MHz, beyond SMALLINT) |
| RADIO_BAND | STATUS | ENUM('PLANNED','INTEGRATING','ON_AIR','LOCKED','DECOMMISSIONED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RADIO_BAND | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_BAND | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CLOUD_CLUSTER | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| CLOUD_CLUSTER | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CLOUD_CLUSTER | PLATFORM | ENUM('KUBERNETES','OPENSTACK','VMWARE','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CLOUD_CLUSTER | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CLOUD_CLUSTER | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VIRTUAL_NETWORK_FUNCTION | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| VIRTUAL_NETWORK_FUNCTION | NF_TYPE | ENUM('VDU','CU_CP','CU_UP','VEPC','VDNS','VAAA','FIREWALL','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VIRTUAL_NETWORK_FUNCTION | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| VIRTUAL_NETWORK_FUNCTION | CLOUD_CLUSTER_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| VIRTUAL_NETWORK_FUNCTION | HOST_NE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| VIRTUAL_NETWORK_FUNCTION | HOST_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| VIRTUAL_NETWORK_FUNCTION | STATUS | ENUM('PLANNED','IN_PROGRESS','READY','FAILED','TERMINATED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VIRTUAL_NETWORK_FUNCTION | RECORD_SOURCE | ENUM('DISCOVERED','PLANNED_CIQ','MANUAL','EMS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VIRTUAL_NETWORK_FUNCTION | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VIRTUAL_NETWORK_FUNCTION | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VNF_LIFECYCLE_STEP | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| VNF_LIFECYCLE_STEP | VIRTUAL_NETWORK_FUNCTION_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| VNF_LIFECYCLE_STEP | STAGE | ENUM('DAY0','GROW','EVENTS','GPL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VNF_LIFECYCLE_STEP | STATUS | ENUM('NOT_STARTED','PENDING','IN_PROGRESS','COMPLETED','FAILED','SKIPPED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| VNF_LIFECYCLE_STEP | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| VNF_LIFECYCLE_STEP | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_CELL | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RADIO_CELL | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_CELL | DU_VNF_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_CELL | RADIO_BAND_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_CELL | COVERAGE_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_CELL | TECHNOLOGY_GEN | ENUM('4G','5G') | VARCHAR(8) | NOT NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RADIO_CELL | CELL_STATUS | ENUM('PLANNED','ON_AIR','LOCKED','OFF_AIR') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RADIO_CELL | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_CELL | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_CELL_PARAMETER | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RADIO_CELL_PARAMETER | RADIO_CELL_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RADIO_CELL_PARAMETER | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RADIO_CELL_PARAMETER | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PASSIVE_ASSET | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PASSIVE_ASSET | ASSET_TYPE | ENUM('FIBER_SPAN','ODF','SPLICE_CLOSURE','PATCH_CORD','DUCT','PATCH_PANEL') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PASSIVE_ASSET | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PASSIVE_ASSET | RACK_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PASSIVE_ASSET | STATUS | ENUM('PLANNED','IN_SERVICE','DEGRADED','CUT','FAULTY','BLOCKED','FULL','SPARE','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PASSIVE_ASSET | OWNERSHIP | ENUM('OWNED','LEASED','IRU') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PASSIVE_ASSET | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PASSIVE_ASSET | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FIBER_SPAN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| FIBER_SPAN | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_SPAN | A_ODF_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_SPAN | B_ODF_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_SPAN | CABLE_TYPE | ENUM('G652D','G654E','G657A1','OTHER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_SPAN | INSTALL_METHOD | ENUM('BURIED','AERIAL_ADSS','UNDERGROUND_DUCT') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_SPAN | BUILD_PHASE | ENUM('PLAN','BUILD','LIVE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_SPAN | BUILD_STAGE | ENUM('SURVEY','PERMIT','CIVIL','SPLICING','OTDR_ATP','TURN_UP') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_SPAN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FIBER_SPAN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FIBER_CORE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| FIBER_CORE | FIBER_SPAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_CORE | STRAND_COLOUR | ENUM('BLUE','ORANGE','GREEN','BROWN','SLATE','WHITE','RED','BLACK','YELLOW','VIOLET','ROSE','AQUA') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_CORE | STATUS | ENUM('LIVE','RESERVED','FAULTY','SPARE','PLANNED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_CORE | A_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_CORE | Z_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| FIBER_CORE | SERVICE_USE | ENUM('RAN_BACKHAUL','X2_XN','S1_NG_C','OAM','TRANSPORT_OAM','OTHER') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| FIBER_CORE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| FIBER_CORE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OTDR_TEST | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| OTDR_TEST | FIBER_CORE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| OTDR_TEST | DIRECTION | ENUM('A_TO_B','B_TO_A') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OTDR_TEST | RESULT | ENUM('PASS','MARGINAL','FAIL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OTDR_TEST | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OTDR_TEST | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| ODF | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| ODF | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| ODF | FRAME_TYPE | ENUM('RACK_MOUNT','WALL_MOUNT') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| ODF | TERMINATION | ENUM('SC_APC','SC_UPC','LC_UPC','LC_APC') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| ODF | ENVIRONMENT | ENUM('INDOOR_AC','INDOOR','OUTDOOR') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| ODF | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| ODF | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SPLICE_CLOSURE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SPLICE_CLOSURE | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SPLICE_CLOSURE | FIBER_SPAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SPLICE_CLOSURE | CLOSURE_TYPE | ENUM('DOME','INLINE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SPLICE_CLOSURE | HOUSING | ENUM('AERIAL','MANHOLE','BURIED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SPLICE_CLOSURE | INGRESS_RATING | ENUM('IP67','IP68') | VARCHAR(8) | NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SPLICE_CLOSURE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SPLICE_CLOSURE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SPLICE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SPLICE | SPLICE_CLOSURE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SPLICE | IN_CORE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SPLICE | OUT_CORE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SPLICE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SPLICE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PATCH_CORD | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| PATCH_CORD | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PATCH_CORD | A_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PATCH_CORD | B_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| PATCH_CORD | CORD_TYPE | ENUM('LC_LC_DUPLEX','SC_LC_DUPLEX','SC_SC_DUPLEX','RJ45') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| PATCH_CORD | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| PATCH_CORD | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DUCT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| DUCT | PASSIVE_ASSET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| DUCT | A_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| DUCT | B_SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| DUCT | INSTALL_METHOD | ENUM('OPEN_CUT_TRENCH','HDD','MOLE_THRUST_BORE') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| DUCT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DUCT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| LINK | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| LINK | LAYER | ENUM('PHYSICAL','LLDP','OSPF','ISIS','BGP','LOGICAL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| LINK | A_NE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| LINK | A_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| LINK | Z_NE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| LINK | Z_PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| LINK | STATUS | ENUM('UP','DOWN','ESTABLISHED','IDLE','ACTIVE','CONNECT','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| LINK | RECORD_SOURCE | ENUM('DISCOVERED','PLANNED_CIQ','MANUAL','EMS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| LINK | RECORD_STATE | ENUM('ACTIVE','INACTIVE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| LINK | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| LINK | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| LINK_PROTOCOL_ATTR | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| LINK_PROTOCOL_ATTR | LINK_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| LINK_PROTOCOL_ATTR | ISIS_LEVEL | ENUM('L1','L2','L1L2') | VARCHAR(8) | NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| LINK_PROTOCOL_ATTR | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| LINK_PROTOCOL_ATTR | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_INSTANCE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SERVICE_INSTANCE | SERVICE_TYPE | ENUM('L3VPN','L2VPN','WAVELENGTH','OTN','TRUNK','S1_NG','X2_XN','APN','N_INTERFACE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_INSTANCE | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| SERVICE_INSTANCE | STATUS | ENUM('UP','DOWN','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_INSTANCE | REFERENCE_KIND | ENUM('ERP_NUMBER','BEARER_ID','INTERFACE_ID','WAVELENGTH_NM','CIRCUIT_ID','APN_ID','SESSION_ID','VC_ID') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_INSTANCE | RECORD_SOURCE | ENUM('DISCOVERED','PLANNED_CIQ','MANUAL','EMS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_INSTANCE | RECORD_STATE | ENUM('ACTIVE','INACTIVE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_INSTANCE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_INSTANCE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_ENDPOINT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SERVICE_ENDPOINT | SERVICE_INSTANCE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SERVICE_ENDPOINT | ENDPOINT_ROLE | ENUM('PE','SOURCE','DESTINATION') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_ENDPOINT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SERVICE_ENDPOINT | PORT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SERVICE_ENDPOINT | ADMIN_STATUS | ENUM('UP','DOWN') | VARCHAR(8) | NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_ENDPOINT | OPER_STATUS | ENUM('UP','DOWN','UNKNOWN') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_ENDPOINT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_ENDPOINT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_ROUTE_TARGET | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SERVICE_ROUTE_TARGET | SERVICE_INSTANCE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SERVICE_ROUTE_TARGET | DIRECTION | ENUM('IMPORT','EXPORT','BOTH') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SERVICE_ROUTE_TARGET | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SERVICE_ROUTE_TARGET | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_PLAN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| CAPEX_PLAN | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CAPEX_PLAN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_PLAN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_LINE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| CAPEX_LINE | CAPEX_PLAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CAPEX_LINE | CATEGORY | ENUM('EQUIPMENT','CIVIL','POWER_COOLING','FIBER_TRANSPORT','INSTALLATION','SOFTWARE_LICENCE') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CAPEX_LINE | STATE | ENUM('PLANNED','PO_RAISED','INVOICED','PAID') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CAPEX_LINE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_LINE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_LINE_ELEMENT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| CAPEX_LINE_ELEMENT | CAPEX_LINE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CAPEX_LINE_ELEMENT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CAPEX_LINE_ELEMENT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CAPEX_LINE_ELEMENT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_PLAN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| OPEX_PLAN | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| OPEX_PLAN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_PLAN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_LINE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| OPEX_LINE | OPEX_PLAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| OPEX_LINE | CATEGORY | ENUM('SITE_RENTAL','ELECTRICITY','DIESEL_DG','BACKHAUL_LEASE','AMC_MAINTENANCE','FIBER_OM','SECURITY_HOUSEKEEPING','STATUTORY') | VARCHAR(32) | NOT NULL | ENUM → VARCHAR(32) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OPEX_LINE | FREQUENCY | ENUM('MONTHLY','QUARTERLY','ANNUAL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OPEX_LINE | STATE | ENUM('ACCRUED','DUE','OVERDUE','PAID') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| OPEX_LINE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_LINE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_MONTH_ACTUAL | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| OPEX_MONTH_ACTUAL | OPEX_PLAN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| OPEX_MONTH_ACTUAL | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| OPEX_MONTH_ACTUAL | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DISCOVERY_STEP_DEF | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| DISCOVERY_STEP_DEF | PROTOCOL | ENUM('ICMP','SNMP_V2C','SNMP_V3','NETCONF','CLI','LLDP_CDP','TL1','REST','X2_XN_ANR') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| COLLECTOR | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| COLLECTOR | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| COLLECTOR | STATUS | ENUM('ONLINE','HIGH_LATENCY','OFFLINE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| COLLECTOR | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| COLLECTOR | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CREDENTIAL_PROFILE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| CREDENTIAL_PROFILE | PROTOCOL | ENUM('SNMP_V2C','SNMP_V3','NETCONF','SSH_CLI','TL1','REST') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CREDENTIAL_PROFILE | ACCESS_MODE | ENUM('READ_ONLY','READ_WRITE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CREDENTIAL_PROFILE | NETWORK_PATH | ENUM('IN_BAND','OUT_OF_BAND') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CREDENTIAL_PROFILE | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| CREDENTIAL_PROFILE | OPERATIONAL_AREA_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| CREDENTIAL_PROFILE | STATUS | ENUM('HEALTHY','WARNING','EXPIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| CREDENTIAL_PROFILE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| CREDENTIAL_PROFILE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_JOB | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SCAN_JOB | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| SCAN_JOB | COLLECTOR_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_JOB | CREDENTIAL_PROFILE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_JOB | OPERATIONAL_AREA_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_JOB | SCHEDULE_KIND | ENUM('CONTINUOUS','INTERVAL','DAILY','WEEKLY','CRON','ON_DEMAND') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_JOB | SCHEDULE_STATE | ENUM('LIVE','HELD') | VARCHAR(8) | NOT NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_JOB | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_JOB | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_JOB_SCOPE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SCAN_JOB_SCOPE | SCAN_JOB_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_JOB_SCOPE | SCOPE_KIND | ENUM('CIDR','SEED','SITE','NF_SET') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_JOB_SCOPE | SITE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_JOB_SCOPE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_JOB_SCOPE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_TARGET | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SCAN_TARGET | SCAN_JOB_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_TARGET | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_TARGET | LAST_OUTCOME | ENUM('EXACT_MATCH','DRIFTED','STALE','MISSING','ROGUE','UNCLAIMED','NO_ADAPTER') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_TARGET | LAST_FAILURE_REASON | ENUM('HOST_UNREACHABLE','SNMP_TIMEOUT','AUTH_FAILED','PARSE_ERROR','NO_ADAPTER','DUPLICATE_IP') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_TARGET | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_TARGET | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_RUN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| SCAN_RUN | SCAN_JOB_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_RUN | TRIGGER_SOURCE | ENUM('SCHEDULER','MANUAL','API','RETRY') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN | STATUS | ENUM('RUNNING','COMPLETED','COMPLETED_WITH_ERRORS','FAILED','NO_ADAPTER') | VARCHAR(32) | NOT NULL | ENUM → VARCHAR(32) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN | DURATION_MS | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Derived; never typed (INT: a run is bounded by the 6 h cycle SLA, far below the 49-day INT limit) |
| SCAN_RUN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_RUN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_RUN_TARGET | SCAN_RUN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_RUN_TARGET | SCAN_TARGET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_RUN_TARGET | STATUS | ENUM('SUCCESS','PARTIAL','FAILED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | OUTCOME | ENUM('EXACT_MATCH','DRIFTED','STALE','MISSING','ROGUE','UNCLAIMED','NO_ADAPTER') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | FAILURE_REASON | ENUM('HOST_UNREACHABLE','SNMP_TIMEOUT','AUTH_FAILED','PARSE_ERROR','NO_ADAPTER','DUPLICATE_IP') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | FAILURE_STAGE | ENUM('SCOPE','REACHABILITY','CREDENTIAL','COLLECT','PARSE','IDENTITY','STORE') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | MATCHED_NE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| SCAN_RUN_TARGET | MATCH_RULE | ENUM('CHASSIS_SERIAL','CHASSIS_MAC','SYSNAME_AREA','MANAGEMENT_IP') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | MATCH_CONFIDENCE | ENUM('EXACT','STRONG','WEAK') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_RUN_TARGET | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_RUN_TARGET | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_STEP_RESULT | STATE | ENUM('PASSED','FAILED','SKIPPED','NOT_APPLICABLE','WAITING','RUNNING') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_STEP_RESULT | FAILURE_REASON | ENUM('HOST_UNREACHABLE','SNMP_TIMEOUT','AUTH_FAILED','PARSE_ERROR','NO_ADAPTER','DUPLICATE_IP') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_STEP_RESULT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_STEP_RESULT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_STEP_PAYLOAD | KIND | ENUM('REQUEST','RESPONSE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| SCAN_STEP_PAYLOAD | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| SCAN_STEP_PAYLOAD | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_RULE | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| RECON_RULE | RULE_TYPE | ENUM('IDENTITY','ATTRIBUTE','EXISTENCE','RELATIONSHIP','FRESHNESS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE | PRIORITY | ENUM('HIGH','MEDIUM','LOW') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE | STATUS | ENUM('DRAFT','REVIEW','APPROVED','ACTIVE','EXECUTING','SUSPENDED','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE | ORIGIN | ENUM('MANUAL','AUTO_GENERATED','AI_SUGGESTED') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE | EXCEPTION_REVIEWER_TEAM_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RULE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE_CONDITION | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_RULE_CONDITION | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RULE_CONDITION | CONNECTOR | ENUM('AND','OR') | VARCHAR(8) | NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_CONDITION | OPERATOR | ENUM('EQUALS','NOT_EQUALS','CONTAINS','GREATER_THAN','LESS_THAN','GREATER_OR_EQUAL','LESS_OR_EQUAL') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_CONDITION | TARGET_KIND | ENUM('FIELD','LITERAL') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_CONDITION | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE_CONDITION | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE_TRANSITION | FROM_STATUS | ENUM('DRAFT','REVIEW','APPROVED','ACTIVE','EXECUTING','SUSPENDED','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_TRANSITION | TO_STATUS | ENUM('DRAFT','REVIEW','APPROVED','ACTIVE','EXECUTING','SUSPENDED','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_TRANSITION | ACTION | ENUM('SUBMIT_FOR_REVIEW','APPROVE','REJECT','REQUEST_CHANGES','ACTIVATE','START_EXECUTION','FINISH_EXECUTION','SUSPEND','RESUME','RETIRE') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_TRANSITION | ACTOR_ROLE | ENUM('OWNER','REVIEWER','APPROVER','EXECUTOR','SYSTEM') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_EVENT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_RULE_EVENT | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RULE_EVENT | FROM_STATUS | ENUM('DRAFT','REVIEW','APPROVED','ACTIVE','EXECUTING','SUSPENDED','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_EVENT | TO_STATUS | ENUM('DRAFT','REVIEW','APPROVED','ACTIVE','EXECUTING','SUSPENDED','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_EVENT | ACTION | ENUM('SUBMIT_FOR_REVIEW','APPROVE','REJECT','REQUEST_CHANGES','ACTIVATE','START_EXECUTION','FINISH_EXECUTION','SUSPEND','RESUME','RETIRE') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RULE_EVENT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RULE_EVENT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_JOB | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_JOB | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| RECON_JOB | SCAN_TYPE | ENUM('IDENTITY_ATTRIBUTE','ATTRIBUTE','IDENTITY','EXISTENCE','RELATIONSHIP') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_JOB | SCHEDULE_STATE | ENUM('LIVE','HELD','RETIRED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_JOB | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_JOB | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_JOB_RULE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_JOB_RULE | RECON_JOB_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_JOB_RULE | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_JOB_RULE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_JOB_RULE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RUN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_RUN | RECON_JOB_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RUN | SCAN_RUN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RUN | STATUS | ENUM('SCHEDULED','RUNNING','COMPLETED','COMPLETED_WITH_ERRORS','FAILED') | VARCHAR(32) | NOT NULL | ENUM → VARCHAR(32) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RUN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RUN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RUN_RULE | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_RUN_RULE | RECON_RUN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RUN_RULE | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RUN_RULE | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RUN_RULE | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RESULT | RECON_RUN_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | SUBJECT_CLASS | ENUM('NETWORK_ELEMENT','LINK','SERVICE','RADIO_CELL','VNF','SCAN_TARGET') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RESULT | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | LINK_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | SERVICE_INSTANCE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | RADIO_CELL_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | VIRTUAL_NETWORK_FUNCTION_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | SCAN_TARGET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_RESULT | OUTCOME | ENUM('MATCHED','ATTRIBUTE_MISMATCH','EXTRA_NO_RECORD','RELATIONSHIP_DRIFT','MISSING_NO_LIVE_PEER','UNRESOLVED_MATCH','STALE','NOT_COMPARABLE') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RESULT | MATCH_RULE | ENUM('CHASSIS_SERIAL','CHASSIS_MAC','SYSNAME_AREA','MANAGEMENT_IP') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RESULT | MATCH_CONFIDENCE | ENUM('EXACT','STRONG','WEAK') | VARCHAR(16) | NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_RESULT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RESULT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RESULT_FIELD | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_RESULT_FIELD | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DISCREPANCY_TYPE | CATEGORY | ENUM('EXISTENCE','ATTRIBUTE','RELATIONSHIP','FRESHNESS') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| DISCREPANCY_TYPE | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| RECON_EXCEPTION | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| RECON_EXCEPTION | STATE | ENUM('ROGUE','DRIFTED','MISSING','DUPLICATE','UNCLAIMED','NO_ADAPTER','ZOMBIE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_EXCEPTION | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| RECON_EXCEPTION | RECON_RULE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | NETWORK_ELEMENT_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | LINK_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | SERVICE_INSTANCE_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | SCAN_TARGET_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | OWNER_TEAM_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| RECON_EXCEPTION | STATUS | ENUM('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_EXCEPTION') | VARCHAR(24) | NOT NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_EXCEPTION | DISPOSITION | ENUM('ACCEPT_NETWORK','ACCEPT_RECORD','RAISE_WORKORDER','APPROVE_EXCEPTION') | VARCHAR(24) | NULL | ENUM → VARCHAR(24) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| RECON_EXCEPTION | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| RECON_EXCEPTION | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| REPORT_DEFINITION | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| REPORT_DEFINITION | MODULE | ENUM('DISCOVERY','INVENTORY') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_DEFINITION | AUDIENCE | ENUM('LEADERSHIP','OPERATIONS','ENGINEERING','FINANCE','PLANNING','GOVERNANCE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_DEFINITION | CADENCE | ENUM('DAILY','WEEKLY','MONTHLY','ON_DEMAND') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_DEFINITION | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| REPORT_DEFINITION | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| REPORT_RUN | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| REPORT_RUN | REPORT_DEFINITION_ID_FK | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | Follows the referenced primary key width (FK type compatibility) |
| REPORT_RUN | REPORT_TYPE | ENUM('CLUSTER','SITE','DISCOVERY','INVENTORY','CAPEX','COMPLIANCE') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_RUN | GENERATED_TYPE | ENUM('SCHEDULED','AUTOMATED','ADHOC') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_RUN | FORMAT | ENUM('PDF','XLSX','CSV','DOCX','HTML','JSON') | VARCHAR(8) | NOT NULL | ENUM → VARCHAR(8) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_RUN | STATUS | ENUM('PENDING','RUNNING','COMPLETED','FAILED') | VARCHAR(16) | NOT NULL | ENUM → VARCHAR(16) + CHECK IN-list | Maps to @Enumerated(STRING); extend with DROP/ADD CHECK, no MySQL ENUM ordering/coercion quirks; same rejection of bad values (tested) |
| REPORT_RUN | FILE_SIZE_BYTES | BIGINT UNSIGNED | INT UNSIGNED | NULL | BIGINT UNSIGNED → INT UNSIGNED | File size, bytes (a generated report never approaches 4 GB) |
| REPORT_RUN | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| REPORT_RUN | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DOMAIN_TRUST_SNAPSHOT | ID | BIGINT UNSIGNED | INT UNSIGNED | NOT NULL | BIGINT UNSIGNED → INT UNSIGNED | Master/entity table: 4.29 billion ids platform-wide is beyond any realistic lifetime volume |
| DOMAIN_TRUST_SNAPSHOT | DOMAIN_ID_FK | ENUM('RAN','CORE','TRANSPORT','IP_MPLS') | SMALLINT UNSIGNED | NOT NULL | renamed DOMAIN → DOMAIN_ID_FK, ENUM → SMALLINT UNSIGNED FK | Domain is a shared, hierarchical taxonomy (IP/MPLS under Transport); a lookup row carries the parent, an ENUM cannot |
| DOMAIN_TRUST_SNAPSHOT | CREATOR | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DOMAIN_TRUST_SNAPSHOT | LAST_MODIFIER | BIGINT UNSIGNED | BIGINT UNSIGNED | NOT NULL | FK + index dropped; column kept | Application metadata stamp written by JPA auditing; change history belongs to the Audit module, so no referential enforcement or index is needed |
| DOMAIN | ID | — | SMALLINT UNSIGNED | NOT NULL | new | Surrogate PK (metadata table) |
| DOMAIN | CODE | — | VARCHAR(16) | NOT NULL | new | Stable domain code (RAN, CORE, TRANSPORT, IP_MPLS); the value the application enum carries |
| DOMAIN | NAME | — | VARCHAR(50) | NOT NULL | new | Display name (IP/MPLS) |
| DOMAIN | PARENT_DOMAIN_ID_FK | — | SMALLINT UNSIGNED | NULL | new | FK DOMAIN.ID: parent domain (IP_MPLS -> TRANSPORT); NULL for a top-level domain. One level deep by application rule |
| DOMAIN | SORT_ORDER | — | TINYINT UNSIGNED | NOT NULL | new | Display order; a child directly follows its parent (RAN, Core, Transport, IP/MPLS) |
| DOMAIN | IS_ACTIVE | — | TINYINT(1) | NOT NULL | new | 1 when selectable for new records |

---

## 4. AUD table identification and removal plan (Step 4)

**Removed (38 tables).** Their only purpose is change history / audit, which the platform Audit module owns:

- `AUDIT_EVENT`
- `REVINFO`
- `PRIMARY_GEO_L4_AUD`
- `SITE_AUD`
- `SITE_CONTACT_AUD`
- `SITE_ISSUE_AUD`
- `RACK_AUD`
- `POWER_FEED_AUD`
- `POWER_UNIT_AUD`
- `NETWORK_ELEMENT_AUD`
- `NE_ASSET_AUD`
- `EQUIPMENT_COMPONENT_AUD`
- `PORT_AUD`
- `RADIO_BAND_AUD`
- `VIRTUAL_NETWORK_FUNCTION_AUD`
- `RADIO_CELL_AUD`
- `PASSIVE_ASSET_AUD`
- `FIBER_SPAN_AUD`
- `FIBER_CORE_AUD`
- `ODF_AUD`
- `SPLICE_CLOSURE_AUD`
- `PATCH_CORD_AUD`
- `DUCT_AUD`
- `LINK_AUD`
- `SERVICE_INSTANCE_AUD`
- `CAPEX_PLAN_AUD`
- `CAPEX_LINE_AUD`
- `OPEX_PLAN_AUD`
- `OPEX_LINE_AUD`
- `COLLECTOR_AUD`
- `CREDENTIAL_PROFILE_AUD`
- `SCAN_JOB_AUD`
- `SCAN_TARGET_AUD`
- `RECON_RULE_AUD`
- `RECON_RULE_CONDITION_AUD`
- `RECON_JOB_AUD`
- `RECON_EXCEPTION_AUD`
- `REPORT_DEFINITION_AUD`

- `REVINFO` is the Envers revision header (who and when per transaction); every `*_AUD` table is a column-for-column Envers snapshot of its base table with `REV` / `REVTYPE`; `AUDIT_EVENT` is an append-only user-action log (approve, disposition, decommission, export) with a polymorphic `ENTITY_ID`. None is read by any screen; all are written only by Envers / an audit interceptor.
- Also removed with them: 74 audit indexes, 37 `FK_*_AUD__REV` constraints, the `CK_*_AUD__REVTYPE` checks, and the two smoke-test statements / two negative tests that exercised them.
- The application side: remove `@Audited` from the JPA entities (or point Envers at the Audit module's schema) and stop writing `AUDIT_EVENT`; the Audit module's own tables receive those events instead.

**Kept, because they are business ledgers, not audit tables** (their names or shapes could suggest otherwise):

| Table | Why it is business data |
|---|---|
| NE_MOVEMENT | The stock ledger (issue / install / RMA / decommission) shown on the device's movement tab and validated against `NE_STOCK_TRANSITION`; it drives "in store" vs "deployed" figures. |
| RECON_RULE_EVENT | The rule's approval and lifecycle trail rendered on Rule Details (Lifecycle and Activity tabs); the FK to `RECON_RULE_TRANSITION` is what rejects illegal moves. |
| NE_FIELD_PROVENANCE | Which source last set each golden-record field: shown in the Identity and provenance block and used by reconciliation. |
| POWER_UNIT_TEST, OTDR_TEST | Maintenance / acceptance measurements ("power overdue", loss budget). |
| SCAN_RUN / SCAN_RUN_TARGET / SCAN_STEP_RESULT / SCAN_STEP_PAYLOAD, RECON_RUN / RECON_RESULT | Execution results of the two modules' jobs, the transcript the screens display. |
| DOMAIN_TRUST_SNAPSHOT | Daily KPI snapshot for trend charts. |
| VNF_LIFECYCLE_STEP | Orchestration step outcomes shown on the VNF screen (NC4). |

---

## 5. Audit-column review (Step 5)

| Column | Classification | Decision |
|---|---|---|
| CREATED_TIME | Business / application metadata: "created" is displayed, sorted on, and drives freshness buckets and MTTR. | Keep, `NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`. |
| MODIFIED_TIME | Business / application metadata: "last updated" in every grid and drawer. | Keep, `ON UPDATE CURRENT_TIMESTAMP(3)`. |
| CREATOR | Application metadata: "created by" is shown (e.g. `Rule.createdBy`); filled by JPA auditing from the security context. | Keep the column; **drop the FK and index** (D5). The Audit module keeps the authoritative who-changed-what; the USER replica may be pruned by IAM sync without breaking rows. |
| LAST_MODIFIER | Application metadata, same source. | Keep the column; drop the FK and index. |
| ROW_VERSION | Optimistic locking (`@Version`), not audit. | Keep. |
| IS_DELETED / LIVE_FLAG | Business soft-delete lifecycle. | Keep. |
| REV, REVTYPE, REVTSTMP, CHANGED_BY (REVINFO / *_AUD) | Audit infrastructure. | Removed with their tables. |
| AUDIT_EVENT.OCCURRED_TIME / ACTOR_ID_FK / ACTION / ENTITY_CLASS / ENTITY_ID / SUMMARY / DETAIL | Audit infrastructure. | Removed with the table. |

No business table carries an audit-only column beyond the creator / modifier stamps, so no further column removal was needed. Business "who" columns that name a real actor in a workflow (`TESTED_BY_FK`, `OWNER_ID_FK`, `REVIEWER_ID_FK`, `APPROVER_ID_FK`, `EXECUTOR_ID_FK`, `ACTOR_ID_FK`, `ASSIGNEE_ID_FK`, `DISPOSITION_BY_FK`, `DECOMMISSIONED_BY_FK`) keep their FK to `USER` and their index: they answer "my queue" and "who authorised this" questions in the UI.

---

## 6. PK / FK and relationship review (Step 6)

**Existing valid relationships** (kept unchanged): all 240 v2 FKs are v1 relationships minus the creator stamps plus the DOMAIN references. Highlights that were checked and confirmed correct:

- Composite tenant FKs `(CUSTOMER_ID, X_ID_FK) → (CUSTOMER_ID, ID)` on every tenant-to-tenant reference (negative tests "Tenant 2 exception pointing at tenant 1 device" and "Tenant 1 device on tenant 2 site" are rejected).
- Port ownership proofs: `LINK.A_PORT_ID_FK` / `Z_PORT_ID_FK` and `SERVICE_ENDPOINT.PORT_ID_FK` reference `PORT (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, ID)` (negative test "Link endpoint port that belongs to a different device").
- Transition tables as FK targets: `NE_MOVEMENT (FROM_STATE, TO_STATE)` and `RECON_RULE_EVENT (FROM_STATUS, TO_STATUS, ACTION)`; illegal moves are rejected by the FK, not by application code.
- Self references with NULL roots: `SITE.PARENT_SITE_ID_FK`, `OPERATIONAL_AREA.PARENT_AREA_ID_FK`, `NETWORK_ELEMENT.PARENT_NE_ID_FK`, `EQUIPMENT_COMPONENT.PARENT_COMPONENT_ID_FK`, `PORT.PARENT_PORT_ID_FK`, and now `DOMAIN.PARENT_DOMAIN_ID_FK`.
- Cascade policy: `ON DELETE CASCADE` only from a parent to rows that have no meaning without it (attributes, contacts, issues, floors, IP addresses, VLAN memberships, conditions, results, payloads, plan lines); everything else restricts. Unchanged.

**Relationships modified**

| Change | Tables |
|---|---|
| FK column width follows the referenced key (BIGINT → INT) | every FK to a table whose PK became INT (see Step 7) |
| `DOMAIN` ENUM → `DOMAIN_ID_FK` with FK to `DOMAIN(ID)` | NETWORK_ELEMENT, VIRTUAL_NETWORK_FUNCTION, SERVICE_INSTANCE, DISCOVERY_STEP_DEF, COLLECTOR (nullable), CREDENTIAL_PROFILE (nullable), SCAN_JOB, RECON_RULE, RECON_JOB, DISCREPANCY_TYPE, RECON_EXCEPTION, DOMAIN_TRUST_SNAPSHOT |
| FK dropped (columns kept) | `CREATOR` and `LAST_MODIFIER` on 75 tables (150 FKs) |
| FK removed with its table | `AUDIT_EVENT` (2), `*_AUD → REVINFO` (36) |

**Missing relationships** (documented, not added): NC1 (identity unique keys for `LINK`, `EQUIPMENT_COMPONENT`, `SERVICE_INSTANCE`), NC7 (passive subtype typing), and by design the cross-module references `SERVICE_INSTANCE.LCM_SERVICE_REF`, `VIRTUAL_NETWORK_FUNCTION.NETWORK_SERVICE_REF`, `*.WORK_ORDER_REF` (LCM / work-order systems live in other schemas; a sync check query exists in the previous review, N-01).

**Circular dependencies**: none (the recursive walk in `inventory_guideline_checks.sql` returns no path; self-references are allowed).

**FK type mismatches**: none; verified on the server by joining `information_schema.key_column_usage` to both columns' `column_type` (0 rows) and by MySQL itself refusing to create a mismatched FK.

---

## 7. Data-type review: SMALLINT / INT / BIGINT (Step 7)

**Primary keys** (and therefore every FK column that references them):

| Width | Tables | Reason |
|---|---|---|
| SMALLINT UNSIGNED (65 535) | VENDOR, SITE_TYPE, TECHNOLOGY, DEVICE_MODEL, DOMAIN, NE_STOCK_TRANSITION, DISCOVERY_STEP_DEF, RECON_RULE_TRANSITION, DISCREPANCY_TYPE | Global, seeded catalogs with fixed ids: tens to low thousands of rows. |
| INT UNSIGNED (4.29 billion) | TENANT (platform) and 71 tenant master / entity / ledger tables | Even a platform of 1 M devices with 100 ports and 50 components each stays two orders of magnitude below the limit, provided discovered rows are upserted (NC1). Saves 4 bytes per row and per index entry against v1's BIGINT everywhere. |
| BIGINT UNSIGNED | USER (platform key); SCAN_RUN_TARGET, SCAN_STEP_RESULT, SCAN_STEP_PAYLOAD, RECON_RESULT, RECON_RESULT_FIELD | The only tables whose row count is targets × runs (or elements × rules × runs) per day. AUTO_INCREMENT ids are never reused, so retention purging does not help; 50 k targets on a 15-minute sweep would exhaust INT in ~2.5 years on `SCAN_RUN_TARGET` and in months on the step tables. |

**Other numeric columns**: reviewed individually; the decisions are in the "Columns reviewed and deliberately kept" table (Step 3) and the three re-sizings (D8). Ordering / priority / level values are text vocabularies with CHECKs (`PRIORITY HIGH/MEDIUM/LOW`, `AREA_LEVEL`, `RULE_TYPE`), not numeric codes, because the application enum is the source of truth and the values are self-describing in queries and exports.

**FK compatibility rule applied**: an FK column has exactly the referenced column's type (`INT UNSIGNED` ↔ `INT UNSIGNED`, `SMALLINT UNSIGNED` ↔ `SMALLINT UNSIGNED`, `BIGINT UNSIGNED` ↔ `USER.ID`, `VARCHAR(16)` ↔ transition-table `VARCHAR(16)`), differing only in nullability.

---

## 8. Index review (Step 8)

**Good and kept** (with the access pattern they serve):

- Every `UK_*__CUSTOMER_ID_ID` unique key: the target of the composite tenant FKs.
- Business unique keys (`NE_NAME`, `SITE.CODE`, `PORT (NE, NAME)`, `SCAN_TARGET (JOB, IP)`, `SCAN_RUN (JOB, RUN_NO)`, `RECON_RULE.CODE`, `RECON_EXCEPTION.CODE`, ...), all with `LIVE_FLAG` where the table soft-deletes.
- Grid / KPI indexes led by `CUSTOMER_ID`: `NETWORK_ELEMENT (NE_CLASS, STOCK_STATE)` (physical matrix), `(DOMAIN_ID_FK, RECON_STATE)` (trust by domain), `(SITE_ID_FK, NE_CLASS)` (site equipment), `MANAGEMENT_IP` and `SERIAL_NUMBER` (identity matching, duplicates), `SITE (STATUS, CATEGORY)`, `SCAN_TARGET (IP_ADDRESS)` (duplicate-IP detection across jobs) and `(LAST_OUTCOME)` (outcome filter / funnel), `SCAN_RUN (STARTED_TIME)`, `RECON_EXCEPTION (STATUS, SLA_DUE_TIME)` and `(DOMAIN_ID_FK, STATE)`, `RECON_RESULT (OUTCOME, VERIFIED_TIME)`, `REPORT_RUN (STATUS, CREATED_TIME)`, `SCAN_STEP_PAYLOAD (PURGE_AFTER)`, `LINK (CIRCUIT_ID)`, `SERVICE_INSTANCE (SERVICE_TYPE, STATUS)` and `(REFERENCE_VALUE)`, `PORT (USAGE_STATE)` (capacity KPI).
- One exact index per FK, including the five "twins" beside a wider composite whose trailing column is nullable (D7): `IDX_SITE_ISSUE__SITE_ID`, `IDX_LINK__A_NE_ID`, `IDX_LINK__Z_NE_ID`, `IDX_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID`, `IDX_RECON_RUN__RECON_JOB_ID`. `sys.schema_redundant_indexes` reports exactly these five, and the guideline check whitelists exactly this case.

**Added (15)**: `IDX_<T>__DOMAIN_ID (DOMAIN_ID_FK)` on the 11 tables whose domain column had no leading index (NETWORK_ELEMENT, VIRTUAL_NETWORK_FUNCTION, SERVICE_INSTANCE, COLLECTOR, CREDENTIAL_PROFILE, SCAN_JOB, RECON_RULE, RECON_JOB, DISCREPANCY_TYPE, RECON_EXCEPTION, DOMAIN_TRUST_SNAPSHOT) to serve the new FK (guideline §3 / §4: every FK indexed); `DISCOVERY_STEP_DEF`'s existing unique key already leads with it. Plus `DOMAIN`'s own `UK_DOMAIN__CODE`, `UK_DOMAIN__SORT_ORDER`, `IDX_DOMAIN__PARENT_DOMAIN_ID`.

**Removed (151 + 74 audit)**: `IDX_<T>__CREATOR` and `IDX_<T>__LAST_MODIFIER` on 75 tables (150; they existed only to satisfy FKs that no query joins through), `IDX_REPORT_RUN__REPORT_TYPE` (low cardinality, small table, already served), and the 74 `PRIMARY` / `IDX_*_AUD__REV` indexes of the removed audit tables.

**Duplicate / overlapping**: none remain (server check: 5 redundant-looking indexes, all the whitelisted FK twins).

**Composite-index ordering**: every tenant index leads with `CUSTOMER_ID` (all queries are tenant-scoped), then the equality column, then the range / time column (`STATUS, SLA_DUE_TIME`; `OUTCOME, VERIFIED_TIME`; `SITE_ID_FK, RESOLVED_TIME`). Correct as is.

---

## 9. Final recommended schema (Step 9)

```
inventory (utf8mb4_0900_ai_ci, InnoDB, MySQL 8.0.16+)
A  Platform replicas .......... TENANT, USER, TEAM
B  Metadata (global) .......... VENDOR, SITE_TYPE, TECHNOLOGY, DOMAIN*, NE_CLASS**, NE_CLASS_DOMAIN**, DEVICE_MODEL
C  Geography .................. PRIMARY_GEO_L1..L4, OPERATIONAL_AREA
D  Location & facility ........ SITE, SITE_ATTRIBUTE, SITE_CONTACT, SITE_ISSUE, FLOOR, ROOM, RACK,
                                POWER_FEED, POWER_UNIT, POWER_UNIT_TEST
E  Physical resources ......... NETWORK_ELEMENT, NE_STOCK_TRANSITION, NE_MOVEMENT, NE_EXTERNAL_REF, NE_ASSET,
                                NE_FIELD_PROVENANCE, NE_HEALTH, EQUIPMENT_COMPONENT, PORT, PORT_IP_ADDRESS, VLAN, PORT_VLAN
E2 NE detail (1:1, by class)** NE_RAN_DETAIL, NE_CORE_DETAIL, NE_IPMPLS_DETAIL, NE_SWITCH_DETAIL, NE_SERVER_DETAIL, NE_OPTICAL_DETAIL,
                                NE_MICROWAVE_DETAIL, NE_FIBER_ACCESS_DETAIL, NE_WIFI_DETAIL, NE_SECURITY_DETAIL, NE_POWER_DETAIL
F  Radio & cloud .............. RADIO_BAND, CLOUD_CLUSTER, VIRTUAL_NETWORK_FUNCTION, VNF_LIFECYCLE_STEP,
                                RADIO_CELL, RADIO_CELL_PARAMETER
G  Passive plant .............. PASSIVE_ASSET, FIBER_SPAN, FIBER_CORE, OTDR_TEST, ODF, SPLICE_CLOSURE, SPLICE,
                                PATCH_CORD, DUCT
H  Links ...................... LINK, LINK_PROTOCOL_ATTR
I  Services ................... SERVICE_INSTANCE, SERVICE_ENDPOINT, SERVICE_ROUTE_TARGET
J  Site finance ............... CAPEX_PLAN, CAPEX_LINE, CAPEX_LINE_ELEMENT, OPEX_PLAN, OPEX_LINE, OPEX_MONTH_ACTUAL
K  Discovery .................. DISCOVERY_STEP_DEF, COLLECTOR, CREDENTIAL_PROFILE, SCAN_JOB, SCAN_JOB_SCOPE, SCAN_TARGET,
                                SCAN_RUN, SCAN_RUN_TARGET†, SCAN_STEP_RESULT†, SCAN_STEP_PAYLOAD†
L  Reconciliation ............. RECON_RULE, RECON_RULE_CONDITION, RECON_RULE_TRANSITION, RECON_RULE_EVENT, RECON_JOB,
                                RECON_JOB_RULE, RECON_RUN, RECON_RUN_RULE, RECON_RESULT†, RECON_RESULT_FIELD†,
                                DISCREPANCY_TYPE, RECON_EXCEPTION
M  Reports & metrics .......... REPORT_DEFINITION, REPORT_RUN, DOMAIN_TRUST_SNAPSHOT
Views ........................ V_SITE_GEO_PATH, V_PHYSICAL_MATRIX, V_NE_LIFECYCLE_RISK, V_ZOMBIE_ELEMENT, V_PORT_CAPACITY,
                                V_SCAN_RUN_SUMMARY, V_EXCEPTION_SLA (now with DOMAIN_CODE), V_DOMAIN_TREE*, V_NE_DETAIL_COVERAGE**
   * new in v2    ** new in v3    † BIGINT primary key
```

v3: 99 tables, 9 views, 403 indexes, 275 foreign keys, 297 CHECK constraints, 0 ENUM columns, 0 audit tables.

**Application impact of adopting v2** (Java / Spring Boot):

- Entities: `@Enumerated(EnumType.STRING)` on every vocabulary field (Hibernate 6 generates the same `VARCHAR + CHECK` shape, so `ddl-auto=validate` passes); `Long` → `Integer` for the ids that became INT; a `Domain` entity replaces the domain enum, with the frontend mapping `IPMPLS ↔ IP_MPLS` and the hierarchy exposed by `PARENT_DOMAIN_ID_FK` / `V_DOMAIN_TREE`.
- Auditing: keep `@CreatedBy / @CreatedDate / @LastModifiedBy / @LastModifiedDate` on the base entity; remove `@Audited` / Envers and the `AUDIT_EVENT` writer, which move to the Audit module.
- Queries filtering by Transport must include IP/MPLS (`DOMAIN_ID_FK IN (…parent or child…)`), exactly as the frontend's `domainMatches` does today.

---

## 10. Files (Step 10)

| File | What it is |
|---|---|
| `db/inventory/inventory_schema.sql` | **The reviewed, finalized DDL, v3** (99 tables, 9 views, FKs by `ALTER TABLE`, per-table header blocks). |
| `db/inventory/inventory_seed.sql` | v3 metadata seed: the four `DOMAIN` rows (IP_MPLS with parent TRANSPORT), 18 `NE_CLASS` rows with their detail table, 31 `NE_CLASS_DOMAIN` pairs, domains by id in `DISCOVERY_STEP_DEF` and `DISCREPANCY_TYPE`; idempotent. |
| `db/inventory/tests/inventory_guideline_checks.sql` | Guideline checks, 19 rules (v2 adds: no ENUM, every vocabulary column guarded by CHECK or FK, BIGINT PK only on the allowed list; v3 adds: `NE_CLASS.DETAIL_TABLE` names an existing table, every `NE_*_DETAIL` is class-bound); zero rows = compliant. |
| `db/inventory/tests/fk_index_check.py` | Proves every FK is served by an index InnoDB enforces (unchanged). |
| `db/inventory/tests/inventory_smoke_test.sql` | Happy path across both modules, rewritten for `DOMAIN_ID_FK`; audit statements removed; v3 adds detail rows and the coverage view. |
| `db/inventory/tests/inventory_negative_tests.tsv` | 57 replayed defects and rule violations (2 audit tests removed, 4 added in v2, 10 added in v3). |
| `db/inventory/tests/run_tests.sh` | Rebuilds `inventory` on a scratch server and runs everything: `MYSQL="mysql -uroot -h127.0.0.1 -P3399" sh run_tests.sh`. |
| `db/inventory/inventory_schema_review.md` | This document. |

Requires MySQL 8.0.19+ for the seed's `INSERT ... AS n ON DUPLICATE KEY UPDATE` syntax (the DDL itself needs 8.0.16+ for enforced CHECKs). Validated on 9.5.0.

---

## 11. v3 addendum: NETWORK_ELEMENT class-specific detail tables (2026-09-23)

**Request.** Give NETWORK_ELEMENT every class-specific mapping table it can have (the old RAN_DETAIL / NE_WIFI_DETAIL family) and make sure every domain, RAN, Core, Transport and Transport › IP/MPLS, is covered.

**Source.** The LCM cleanup schema (`lcm_cleanup_database.sql`) already carried this family: `RAN_DETAIL`, `NE_BAND_DETAIL`, `ROUTER_DETAILS`, `NE_IPMPLS_DETAIL`, `NE_OPTICAL_TRANSPORT_DETAIL`, `NE_MICROWAVE_DETAIL`, `NE_FIBER_ACCESS_DETAIL`, `NE_WIFI_DETAIL`, `NE_SECURITY_DETAIL`, `NE_CORE_NODE_DETAIL`, `NE_POWER_INFRA_DETAIL`. v3 rebuilds it on the v2 conventions instead of inventing attributes. The `discovery_reconciliation_domain_matrix.xlsx` workbook confirms the same families as reconciliation domains (RAN, fiber / outside plant, access / PON, WiFi, IP/MPLS core & transport, optical / DWDM, NFV / cloud).

### 11.1 Design

| Piece | What it is | Why |
|---|---|---|
| `NE_CLASS` (new, global metadata) | Catalog of device classes: `CODE`, `NAME`, `DETAIL_TABLE` (the 1:1 table that carries the class), `SORT_ORDER`, `IS_ACTIVE`. Seeded with 18 classes. | Replaces the `NE_CLASS` CHECK vocabulary on `NETWORK_ELEMENT` and `DEVICE_MODEL` with an extensible catalog that also says *where* a class's attributes live. `NETWORK_ELEMENT.NE_CLASS` keeps the readable code (FK to `NE_CLASS.CODE`), so existing indexes, views and the frontend's class keys are untouched. |
| `NE_CLASS_DOMAIN` (new, global metadata) | Allowed (class, domain) pairs, 31 seeded rows. `NETWORK_ELEMENT` carries an FK on `(NE_CLASS, DOMAIN_ID_FK)` to it. | This is what "every domain covered" means at the database level: a device cannot be filed under a domain its class does not belong to (an eNodeB in IP/MPLS is rejected, negative test `CLASS eNodeB filed in the IP/MPLS domain`), and every domain has classes. |
| Eleven `NE_*_DETAIL` tables (new, tenant-owned, 1:1 with `NETWORK_ELEMENT`) | Each carries the attributes of one class family. Every detail row copies `NE_CLASS` and is FK-bound to its device's `(CUSTOMER_ID, ID, NE_CLASS)`, with a CHECK restricting the copy to the classes the table serves. | Class, detail and domain can never disagree: a WiFi detail cannot hang off a router (FK), a detail row cannot lie about its device's class (CHECK), and one device has at most one row per detail table (unique key). `ON DELETE CASCADE` from the device, like the other satellites. |
| `RADIO_CELL` + 7 columns | `MIMO_MODE`, `ANTENNA_GAIN_DBI`, `H_BEAM_WIDTH_DEG`, `V_BEAM_WIDTH_DEG`, `MIN_ELECTRICAL_TILT_DEG`, `MAX_ELECTRICAL_TILT_DEG`, `RET_CAPABLE` (+ CHECK min ≤ max). | The old `RAN_DETAIL` was cell-level; these were its structured antenna columns that v2 had left to the EAV table. |
| `V_NE_DETAIL_COVERAGE` (new view) | Every live device with the detail table its class requires, `HAS_DETAIL`, `MISSING_DETAIL`. | A data-quality query for "which devices have no detail yet" (the smoke test shows it working). |
| `NETWORK_ELEMENT` | `NE_CLASS` widened to VARCHAR(24); new `UK (CUSTOMER_ID, ID, NE_CLASS)` (the detail FK target) and `KEY (NE_CLASS, DOMAIN_ID_FK)` (the class-domain FK); the values CHECK dropped in favour of the FK. | MySQL requires the referenced columns of an FK to be an exact unique key, so the three-column key sits beside `UK (CUSTOMER_ID, ID)`; the guideline check now recognises an index that is an FK target as required. |
| `DEVICE_MODEL` | `NE_CLASS` widened to VARCHAR(24), FK to `NE_CLASS.CODE`, index added, CHECK dropped. | Same catalog for models and devices. |

### 11.2 Domain coverage matrix

| Domain | Classes (NE_CLASS_DOMAIN) | Detail table(s) | Also |
|---|---|---|---|
| RAN | ENODEB, GNODEB, RADIO_UNIT, WIFI_AP, WLAN_CONTROLLER, SWITCH, SERVER, POWER_CONTROLLER, OTHER | `NE_RAN_DETAIL`, `NE_WIFI_DETAIL` | `RADIO_BAND`, `RADIO_CELL`, `RADIO_CELL_PARAMETER`, `VIRTUAL_NETWORK_FUNCTION` (vDU / CU) |
| Core | CORE_NF, SERVER, FIREWALL, SECURITY_APPLIANCE, ROUTER, SWITCH, POWER_CONTROLLER, OTHER | `NE_CORE_DETAIL`, `NE_SERVER_DETAIL`, `NE_SECURITY_DETAIL` | `VIRTUAL_NETWORK_FUNCTION`, `CLOUD_CLUSTER`, `VNF_LIFECYCLE_STEP` |
| Transport | DWDM, MICROWAVE, OLT, ONU, ONT, ROUTER, SWITCH, POWER_CONTROLLER, OTHER | `NE_OPTICAL_DETAIL`, `NE_MICROWAVE_DETAIL`, `NE_FIBER_ACCESS_DETAIL` | `LINK` (PHYSICAL / LLDP), passive plant, `SERVICE_INSTANCE` (WAVELENGTH / OTN) |
| Transport › IP/MPLS | ROUTER, SWITCH, FIREWALL, SECURITY_APPLIANCE, OTHER | `NE_IPMPLS_DETAIL`, `NE_SWITCH_DETAIL` | `LINK` (OSPF / ISIS / BGP), `LINK_PROTOCOL_ATTR`, `VLAN`, `SERVICE_INSTANCE` (L3VPN / L2VPN) |
| Any (site facility) | POWER_CONTROLLER | `NE_POWER_DETAIL` | `POWER_UNIT`, `POWER_FEED` |

### 11.3 The detail tables, column by column

Every table has the common head (`ID INT UNSIGNED`, `CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NE_CLASS`) and tail (`CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`); only the class-specific columns are listed. Vocabulary columns are VARCHAR + CHECK as everywhere in v2. Columns of the old tables that were **not** carried over, and why: `OPERATIONAL_STATUS` / `ADMIN_STATE` / `IS_DELETED` (already on `NETWORK_ELEMENT`); `CREATOR_ID_FK` / `LAST_MODIFIER_ID_FK` (platform stamps); measured counters (`CURRENT_SESSION_COUNT`, `CURRENT_ASSOCIATED_CLIENTS`, `RX_LEVEL_DBM`, `OPTICAL_TX/RX_POWER_DBM`, `OSNR_DB`, `SPAN_LOSS_DB`, `UPTIME_SECONDS`, voltages / currents / fuel / temperature / door and smoke alarms: PM and FM data, previous decision D-I4); values derivable from other tables (`NUMBER_OF_LINE_CARDS` from `EQUIPMENT_COMPONENT`, `CURRENT_ONU_COUNT` from the ONT rows, `ONU_SERIAL_NUMBER` = `NETWORK_ELEMENT.SERIAL_NUMBER`, `FIBER_CONNECTOR_TYPE` = `PORT.CONNECTOR`, `LAST_OTDR_TEST_DATE` from `OTDR_TEST`, `DATA_CENTER` = `SITE`, `ROUTER_DETAILS` procurement columns = `NE_ASSET`, `PON_ROLE` = `NE_CLASS`).

| Table | Classes | Columns |
|---|---|---|
| NE_RAN_DETAIL | ENODEB, GNODEB, RADIO_UNIT | `RAN_ROLE` (MACRO, SMALL_CELL, INDOOR, BBU, RADIO_UNIT, DU, CU); `RAN_GENERATION` (2G, 3G, 4G, 5G_NSA, 5G_SA); `ARCHITECTURE` (INTEGRATED, SPLIT_CU_DU, CLOUD_RAN, OPEN_RAN); `NODE_ID` INT (eNB / gNB id); `GNB_ID_LENGTH` TINYINT 22–32; `MCC` CHAR(3), `MNC` VARCHAR(3) (regex CHECKs); `CORE_POOL`; `SYNC_SOURCE` (GPS, PTP, SYNC_E, NTP, NONE); `BACKHAUL_TYPE` (FIBER, MICROWAVE, IP_MPLS_VPN, LEASED_LINE, SATELLITE); `MAX_CELLS` SMALLINT; `RET_CAPABLE`; `EMS_LIVE_DATE`, `PLATFORM_ON_AIR_DATE` (from the old RAN_DETAIL). |
| NE_CORE_DETAIL | CORE_NF | `NF_FUNCTION` (AMF … CHF, 20 values); `CORE_SEGMENT` (PACKET_CORE_4G, PACKET_CORE_5G, IMS, CIRCUIT_SWITCHED, CONVERGED); `VIRTUALIZATION_TYPE` (PHYSICAL, VNF, CNF) with CHECK that a non-physical node points at its `VIRTUAL_NETWORK_FUNCTION_ID_FK`; `CLOUD_CLUSTER_ID_FK`; `REDUNDANCY_ROLE`; `POOL_CODE`, `POOL_NAME`; `MAX_SESSION_CAPACITY` INT; `THROUGHPUT_CAPACITY_GBPS`; `SLICE_ID`. |
| NE_IPMPLS_DETAIL | ROUTER, SWITCH | `ROUTER_ROLE` (PE, P, CE, RR, ASBR, AGGREGATION, ACCESS); `ROUTER_ID` (IPv4 CHECK); `LOOPBACK_IP` (IPv4/IPv6 CHECK); `AS_NUMBER` INT 1–4294967294; `IGP_PROTOCOL` (OSPF, ISIS, NONE); `MPLS_ENABLED`, `LDP_ENABLED`, `RSVP_TE_ENABLED`, `SEGMENT_ROUTING_ENABLED`, `BGP_ENABLED`; `LABEL_RANGE_START/END` (≤ 1 048 575, start ≤ end); `VRF_COUNT`; `QOS_PROFILE`; `CORE_MTU`; `REDUNDANCY_ROLE`; `CHASSIS_REDUNDANCY` (NONE, DUAL_RE, DUAL_RE_ISSU); `BACKPLANE_CAPACITY_GBPS`. |
| NE_SWITCH_DETAIL | SWITCH | `SWITCH_ROLE` (ACCESS, DISTRIBUTION, CORE, TOP_OF_RACK, AGGREGATION); `SWITCH_LAYER` (L2, L3); `STP_MODE` (STP, RSTP, MSTP, PVST, NONE); `STACK_ROLE` (STANDALONE, MASTER, MEMBER) with `STACK_ID`, `STACK_MEMBER_COUNT` and a CHECK tying id to role; `MANAGEMENT_VLAN_ID` 1–4094; `POE_BUDGET_W`; `UPLINK_CAPACITY_GBPS`. |
| NE_SERVER_DETAIL | SERVER | `SERVER_ROLE` (COMPUTE, STORAGE, CONTROLLER, MANAGEMENT, BARE_METAL); `HYPERVISOR` (KVM, VMWARE, HYPERV, KUBERNETES, NONE); `CLOUD_CLUSTER_ID_FK`; `CPU_SOCKETS`, `CPU_CORES`, `MEMORY_GB`, `STORAGE_GB`, `GPU_COUNT`; `OS_TYPE`; `BMC_IP` (IP CHECK). |
| NE_OPTICAL_DETAIL | DWDM | `TRANSPORT_ROLE` (ROADM, OTN_SWITCH, DWDM_TERMINAL, MUXPONDER, TRANSPONDER, OPTICAL_AMPLIFIER); `OPTICAL_BAND`; `ROADM_DEGREES`; `WAVELENGTH_CAPACITY`, `WAVELENGTHS_IN_USE` (≤ capacity); `CHANNEL_SPACING_GHZ`; `LINE_RATE_GBPS`; `MAX_CAPACITY_GBPS`; `AMPLIFIER_TYPE` (EDFA, RAMAN, HYBRID, NONE); `PROTECTION_SCHEME` (NONE, 1_PLUS_1, N_PLUS_1, RING, MESH_RESTORATION). |
| NE_MICROWAVE_DETAIL | MICROWAVE | `HOP_CODE`; `FAR_END_NE_ID_FK` (self-reference, ≠ own device); `FREQUENCY_BAND` (L6GHZ … E_BAND, V_BAND, OTHER); `POLARIZATION`; `MODULATION_SCHEME` (QPSK … 4096QAM); `CHANNEL_BANDWIDTH_MHZ`; `CAPACITY_MBPS`; `ANTENNA_DIAMETER_M`, `ANTENNA_GAIN_DBI`, `TX_POWER_DBM`, `FADE_MARGIN_DB`, `LINK_DISTANCE_KM`; `ATPC_ENABLED`, `XPIC_ENABLED`; `IS_LICENSED` + `LICENSE_NUMBER` (CHECK); `ODU_MODEL`, `IDU_MODEL`; `PROTECTION_SCHEME` (NONE, 1_PLUS_0, 1_PLUS_1_HSB/FD/SD, 2_PLUS_0, N_PLUS_1, RING). |
| NE_FIBER_ACCESS_DETAIL | OLT, ONU, ONT | `PON_TECHNOLOGY` (GPON, EPON, XGPON, XGSPON, NGPON2, GFAST); `PARENT_OLT_NE_ID_FK` (NULL exactly when the device is an OLT, CHECK); `SERVING_PON_PORT_ID_FK` FK-checked to be a port **of that OLT** (`PORT (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, ID)`); `ONU_ID` ≤ 255; `SPLIT_RATIO`; `PON_PORT_COUNT`, `MAX_ONU_PER_PORT`; `SUBSCRIBER_REF` (CRM / LCM, unenforced); `SERVICE_PROFILE`; `LINK_DISTANCE_KM`. |
| NE_WIFI_DETAIL | WIFI_AP, WLAN_CONTROLLER | `WLAN_CONTROLLER_NE_ID_FK` (self-reference, NULL on a controller by CHECK); `AP_GROUP`; `AP_MODE` (LOCAL, FLEXCONNECT, MESH, MONITOR, SNIFFER); `MESH_ROLE`; `PRIMARY_SSID` VARCHAR(32); `SSID_VLAN_ID` 1–4094; `WIFI_STANDARD` (802_11N/AC/AX/BE); `RADIO_BANDS` (2_4GHZ, 5GHZ, 6GHZ, DUAL_BAND, TRI_BAND); `CHANNEL` TINYINT; `CHANNEL_WIDTH_MHZ` ∈ {20, 40, 80, 160, 320}; `TX_POWER_DBM`; `SECURITY_MODE`; `AUTHENTICATION_TYPE`; `POE_CLASS` 0–8; `MAX_CLIENTS`; `COVERAGE_RADIUS_M`; `MOUNTING_TYPE`; `DEPLOYMENT_TYPE`. |
| NE_SECURITY_DETAIL | FIREWALL, SECURITY_APPLIANCE | `SECURITY_ROLE` (FIREWALL, IDS, IPS, DDOS_SCRUBBER, VPN_CONCENTRATOR, WAF, NAC); `DEPLOYMENT_MODE` (INLINE, TAP, ROUTED, TRANSPARENT); `THROUGHPUT_CAPACITY_GBPS`; `MAX_CONCURRENT_SESSIONS`; `POLICY_RULE_COUNT`; `ZONE_COUNT`; `HA_MODE` (STANDALONE, ACTIVE_PASSIVE, ACTIVE_ACTIVE) with `HA_PEER_NE_ID_FK` required exactly when not standalone; `SIGNATURE_VERSION`, `LAST_SIGNATURE_UPDATE_TIME`. |
| NE_POWER_DETAIL | POWER_CONTROLLER | `POWER_NODE_TYPE` (RECTIFIER_SYSTEM, SMART_PDU, UPS_CONTROLLER, SOLAR_CONTROLLER, GENSET_CONTROLLER, FUEL_SENSOR_UNIT, BATTERY_MONITOR); `POWER_UNIT_ID_FK` (the plant unit it controls); `MONITORING_PROTOCOL` (SNMP, MODBUS, REST, PROPRIETARY); `NOMINAL_DC_VOLTAGE`; `RATED_CAPACITY_KW`; `DESIGN_BACKUP_MINUTES`. |

Keys per detail table: PK; `UK (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, NE_CLASS)`, which is both the 1:1 guarantee and the index serving the class-bound device FK; plus one `(CUSTOMER_ID, x_FK)` index per additional FK (self-references, cluster, power unit, PON port). Detail tables are never referenced, so they carry no `UK (CUSTOMER_ID, ID)`.

### 11.4 Verification (v3)

| Check | Result |
|---|---|
| DDL executes from scratch on MySQL 9.5 | 99 tables, 9 views |
| FK type compatibility | 0 mismatches across 275 FKs |
| `fk_index_check.py` | 275 checked, 0 bypassable |
| Server index count = DDL | 403 = 403 |
| Guideline checks (19 rules; v3 adds: every `NE_CLASS.DETAIL_TABLE` names an existing table, every `NE_*_DETAIL` table is class-bound to its device) | 0 violations |
| Seed twice, smoke test (adds a router's IP/MPLS detail, an eNodeB's RAN detail, reads `V_NE_DETAIL_COVERAGE`) | pass |
| Negative tests | 57 of 57 rejected (10 new: class not in catalog, eNodeB in IP/MPLS, WiFi detail on a router, detail lying about its class, second detail per device, bad router-id, inverted label range, gNB id length, cross-tenant detail, physical core node with a VNF) |

### 11.5 Needs clarification (v3)

| # | Question | v3 assumption |
|---|---|---|
| NC9 | Which domain do WiFi and PON access equipment belong to? The DOMAIN tree has no Access domain. | WiFi AP / WLAN controller under **RAN** (access radio); OLT / ONU / ONT under **Transport** (fiber access). Both are one seed row each in `NE_CLASS_DOMAIN`; if you prefer sub-domains, add `RAN › WiFi` and `Transport › Fiber access` rows to `DOMAIN` (the tree supports it) and re-point the pairs. The frontend would need the new keys. |
| NC10 | `NE_CLASS` now has 18 classes; the frontend's `NeClass` has 6 (router, switch, server, dwdm, enodeb, gnodeb). | The extra classes are database-valid today and simply have no Physical Resources tab yet. `NE_CLASS.SORT_ORDER` / `IS_ACTIVE` let the UI hide them until tabs exist. |
| NC11 | FIREWALL kept as a class next to the new SECURITY_APPLIANCE (IDS / IPS / DDoS / VPN / WAF / NAC). | Both map to `NE_SECURITY_DETAIL`; merge them if one tab is enough. |
| NC12 | Should a ROUTER be allowed in the Core domain (core / peering routers)? | Allowed (ROUTER → CORE, TRANSPORT, IP_MPLS). Remove the pair if core routers are always filed under IP/MPLS. |
