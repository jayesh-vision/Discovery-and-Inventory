# DATABASE → UI MODULE IDEATION

**Product:** NetSingularity Discovery & Inventory
**Input:** `INVENTORY_SCHEMA.sql` (mysqldump 10.13, MySQL 9.5.0, database `INVENTORY`, v4, dump completed 2026-09-24)
**Frontend under analysis:** React 19 + TypeScript + react-router 7 app in this repository (`src/`), with a legacy vanilla-JS bridge (`legacy/*.js` → `public/legacy.js`) for the screens not yet ported
**Author:** generated 2026-09-25 from the supplied DDL and the current frontend source
**Status legend used throughout:** **[Confirmed]** = stated by the DDL / seed rows / existing UI · **[Inferred]** = derived from names, comments and FK structure · **[Needs validation]** = business or integration decision that the schema does not settle

---

## Table of contents

1. Executive summary
2. Database overview
3. Complete table inventory
4. Table categorization
5. Cluster / relationship analysis
6. Proposed UI modules
7. Module proposal table
8. UI → API → DB architecture
9. API contract proposals
10. Mock API strategy
11. Mock data requirements
12. CRUD / action matrix
13. Integration boundaries map
14. Unclassified / ambiguous tables
15. Frontend folder structure
16. API structure (backend view)
17. Mock → real API migration plan
18. Phase 1 modules (mock-ready)
19. Phase 2 modules (need integration contract)
20. Phase 3 modules (need business validation)
21. Implementation sequence
22. Dependencies
23. Risks
24. Questions for the business team
25. Questions for the integration team
26. Final architecture summary
27. Appendix A: seeded reference data
28. Appendix B: verification of coverage

---

## 1. Executive summary

The v4 schema is a **multi-tenant, resource-centric inventory model**. Every physical, logical, passive, service and external object is a row of the `RESOURCE` supertype, specialised by 21 `RESOURCE_CLASS` subtypes (`NETWORK_ELEMENT`, `PORT`, `LINK`, `SITE`, `RACK`, `PASSIVE_ASSET`, `RADIO_CELL`, `SERVICE_INSTANCE`, `IP_SUBNET`, `EXTERNAL_RESOURCE` …). Around that core sit three operational engines that the UI already exposes as screens: **Discovery** (`SCAN_*`, `COLLECTOR`, `CREDENTIAL_PROFILE`), **Reconciliation** (`RECON_*`, `DISCREPANCY_TYPE`, `TEAM`) and **Reporting** (`REPORT_*`, `DOMAIN_TRUST_SNAPSHOT`), plus **Finance** (`CAPEX_*`, `OPEX_*`) and a **catalog layer** of 28 seeded / global lookup tables.

Key findings:

- **118 tables** are in scope: 115 `CREATE TABLE` statements in the dump plus 3 tables (`VENDOR`, `VLAN`, `VRF`) that are referenced by foreign keys but whose DDL is absent from the file. No views, triggers or stored routines are in the dump even though table comments describe trigger-enforced append-only tables and a `V_SCAN_RUN_SUMMARY` view. **[Needs validation]**
- **Nothing in the schema calls for one UI module per table.** The FK graph collapses naturally into **18 modules**, 14 of which already exist as screens in the app (Insights, Scan Jobs, Scan Targets, Reconciliation Overview/Jobs/Results/Exceptions, Rules, Location & Facility, Physical Resources, Virtual Resources, Passive Infrastructure, Links, Services, Inactive Inventory, Reports, Capex/Opex). Four are new: **RAN Inventory**, **IP & Logical (IPAM)**, **Relationships & Impact**, **External Systems & Integration**, plus a thin **Administration & Catalogs** module.
- **21 tables are integration-service-owned** (the two job engines, collector results, report runs, provenance, external refs, identity sync). The UI must consume them only through APIs that expose *state and actions* (run, hold, dispose, approve), never row-level writes.
- **The UI already has the right shape** for the mock strategy: every screen reads from typed arrays in `src/data/*.ts`. The change is to move that data behind per-module service interfaces (`XService` → `MockXService` / `ApiXService`) so the mock and real implementations share one contract.
- **Taxonomy drift is the biggest frontend gap.** The DB has 9 domains (`RAN, CORE, TRANSPORT, IP_MPLS, OPTICAL, MICROWAVE, FIXED_ACCESS, IT_CLOUD, FACILITY`) and 25 NE classes; the frontend has 4 domain keys and 6 NE classes. Closing that gap is a Phase 1 prerequisite for every inventory module.
- **Three data-model facts change existing screens:** fiber plant (ducts, spans, splices) is no longer stored here but proxied via `EXTERNAL_RESOURCE`; `DEVICE_MODEL` became the global `PRODUCT_MODEL` catalog; and stock moves, rule lifecycle changes and dispositions are **actions** (append-only event rows), not edits.

Recommended path: Phase 1 ports the existing screens onto module service interfaces with mock data aligned to the v4 shapes (10 modules); Phase 2 wires the integration-owned modules once the Discovery/Reconciliation service contracts are agreed (5 modules); Phase 3 delivers the new inventory modules after business validation of scope (5 modules).

---

## 2. Database overview

### 2.1 Facts from the dump [Confirmed]

| Item | Value |
|---|---|
| Server / dump | MySQL 9.5.0, mysqldump 10.13, database `INVENTORY` |
| Tables with DDL | 115 |
| Tables referenced but not defined | 3 (`VENDOR`, `VLAN`, `VRF`) |
| Tables with seed `INSERT`s | 17 (all reference/catalog tables, see Appendix A) |
| Views / triggers / routines in dump | 0 |
| Character set | utf8mb4, `utf8mb4_bin` on code/status columns |
| Tenancy | `TENANT` root; every tenant-owned table has `CUSTOMER_ID` + FK to `TENANT` and composite `(CUSTOMER_ID, ID)` unique keys used as FK targets |
| Audit columns | `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION` on every mutable table (Spring Data auditing + optimistic locking) |
| Soft delete | `IS_DELETED` + generated `LIVE_FLAG` (master data) or `RECORD_STATE` + generated `ACTIVE_FLAG` (discovered data) feeding partial unique keys |
| Enumerations | `VARCHAR` + `CHECK` constraints (`CK_<TABLE>__<COL>_VALUES`), no MySQL `ENUM` |
| Generated columns | `LIVE_FLAG`, `ACTIVE_FLAG`, `*_BIN` (IP/network binary forms), `LINK_KEY`, `CELL_KEY`, `RESOURCE_CLASS` on NE and PORT, `ORIGIN` on rule, `DURATION_MS`, `TRUST_INDEX_PCT`, `SUBJECT_KIND`/`SUBJECT_ID` on result |

### 2.2 Structural spine [Confirmed]

```
TENANT ─┬─ USER ─ USER_IDENTITY / TEAM_MEMBER ─ TEAM
        │
        ├─ geography: PRIMARY_GEO_L1 → L2 → L3 → L4 ; OPERATIONAL_AREA (self tree)
        │
        ├─ RESOURCE (supertype, RESOURCE_CLASS) ──────────────────────────────┐
        │     ├─ SITE ─ FLOOR ─ ROOM ─ RACK ; POWER_FEED ; POWER_UNIT ─ TEST  │ satellites on any resource:
        │     ├─ NETWORK_ELEMENT ─ NE_*_DETAIL (11) ; NE_VIRTUAL_INSTANCE     │  RESOURCE_ASSET
        │     │     ├─ EQUIPMENT_COMPONENT (tree) ─ PORT ─ PORT_IP_ADDRESS    │  RESOURCE_ATTRIBUTE
        │     │     ├─ NE_HEALTH ; NE_MOVEMENT ; VLAN ; VRF ; PORT_VLAN       │  RESOURCE_EXTERNAL_REF
        │     │     └─ RADIO_CELL ─ CELL_ANTENNA / CELL_RADIO_UNIT / PLMN     │  RESOURCE_FIELD_PROVENANCE
        │     ├─ RADIO_SECTOR ─ ANTENNA                                       │  RESOURCE_RELATIONSHIP
        │     ├─ PASSIVE_ASSET ─ PATCH_CORD ; PORT                            │  RESOURCE_TECHNOLOGY
        │     ├─ LINK ─ LINK_PROTOCOL_ATTR / LINK_MICROWAVE_ATTR              │
        │     ├─ SERVICE_INSTANCE ─ SERVICE_ENDPOINT ; NETWORK_SLICE ; IP_SUBNET ; CLOUD_CLUSTER
        │     └─ EXTERNAL_RESOURCE (proxy of fiber-plant / CMDB / CRM objects)
        │
        ├─ discovery: COLLECTOR, CREDENTIAL_PROFILE, SCAN_JOB ─ SCOPE ─ SCAN_TARGET
        │             SCAN_RUN ─ SCAN_RUN_TARGET ─ SCAN_STEP_RESULT ─ SCAN_STEP_PAYLOAD
        │
        ├─ reconciliation: RECON_RULE ─ CONDITION / EVENT ; RECON_JOB ─ JOB_RULE
        │                  RECON_RUN ─ RUN_RULE / RECON_RESULT ─ RESULT_FIELD ; RECON_EXCEPTION
        │
        ├─ finance: CAPEX_PLAN ─ CAPEX_LINE ─ CAPEX_LINE_RESOURCE ; OPEX_PLAN ─ OPEX_LINE / OPEX_MONTH_ACTUAL
        │
        └─ reporting: REPORT_DEFINITION ─ REPORT_RUN ; DOMAIN_TRUST_SNAPSHOT

global catalogs (no CUSTOMER_ID): DOMAIN, NE_CLASS, NE_CLASS_DOMAIN, RESOURCE_CLASS, TECHNOLOGY, FREQUENCY_BAND,
LINK_LAYER, SERVICE_TYPE, SITE_TYPE, PASSIVE_ASSET_TYPE, NETWORK_FUNCTION_TYPE, DISCOVERY_STEP_DEF, DISCREPANCY_TYPE,
RECON_FIELD, RECON_STATE_MAP, RECON_RULE_TRANSITION, NE_STOCK_TRANSITION, RELATIONSHIP_TYPE, RELATIONSHIP_RULE,
EXTERNAL_OBJECT_TYPE, PRODUCT_MODEL, VENDOR
```

### 2.3 Hub tables (by number of referencing tables) [Confirmed]

| Hub | Referencing tables | Meaning for the UI |
|---|---|---|
| `RESOURCE` | 25 | Every subtype DTO must carry `resourceId` + `resourceClass` so cross-module links (relationships, provenance, asset, capex) resolve |
| `NETWORK_ELEMENT` | 22 | The Physical Resources / Node view is the natural aggregate root of the inventory UI |
| `SITE` | 16 | Location & Facility is the second aggregate root; almost every physical object is site-scoped |
| `DOMAIN` | 13 | Domain filter is a first-class dimension on every list |
| `VENDOR` / `PRODUCT_MODEL` | 13 / 6 | Vendor/model pickers must come from a shared reference API |
| `USER` / `TEAM` | 11 / 4 | Ownership, assignee and approval roles across Rules, Exceptions, Finance, Site issues |
| `EXTERNAL_SYSTEM` | 7 | Integration boundary marker: anything referencing it is (partly) owned elsewhere |

### 2.4 Conventions the UI must honour [Confirmed]

- **Optimistic locking**: every `PUT` must send back `rowVersion`; a 409 means "someone else saved first".
- **Soft delete**: lists show only `LIVE_FLAG = 1` / `ACTIVE_FLAG = 1` rows unless the user opens *Inactive inventory*.
- **Generated keys are read-only**: `LINK_KEY`, `CELL_KEY`, `MANAGEMENT_IP_BIN`, `ORIGIN`, `RESOURCE_CLASS` on NE/PORT are never sent by the client.
- **Composite class binding**: detail rows are bound to `(NETWORK_ELEMENT_ID, NE_CLASS)`; changing an NE's class is not an edit but a re-create (the DB will reject a mismatched detail row). **[Inferred]** the API should not allow `neClass` changes on `PUT`.
- **Append-only tables**: `NE_MOVEMENT`, `RECON_RULE_EVENT` (comments say trigger-enforced). The UI performs *actions* that create these rows; it never edits or deletes them.
- **Encrypted payloads**: `SCAN_STEP_PAYLOAD.CONTENT_ENC`, `SITE_CONTACT.PHONE_ENC/EMAIL_ENC` are decrypted server side only; the UI receives plain values (or a "restricted" marker) from the API.
- **Secrets never stored**: `CREDENTIAL_PROFILE.VAULT_REF` / `EXTERNAL_SYSTEM.VAULT_REF` are references; the UI displays the reference, never a secret.

---

## 3. Complete table inventory

All 118 tables, alphabetical. "Cat" is the category from section 4 (A UI-facing, B integration-owned, C core business domain, D reference/lookup, E audit/technical). "Ownership" says who is allowed to write the table. FKs omit the universal `CUSTOMER_ID → TENANT`. Module codes (M1–M18) are defined in section 6. Purposes are the table comments from the DDL, verbatim [Confirmed]; module / ownership / mock columns are [Inferred] unless a note says otherwise.

| # | Table | Purpose | PK | Important columns | FKs (child→parent) | Parent / children | Domain | Ownership | Cat | UI relevance | Suggested module | API requirement | Mock API | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ANTENNA` | Installed RF antenna with sector, mounting, azimuth and tilts. | ID | SITE_ID_FK, RADIO_SECTOR_ID_FK, MOUNT_ASSET_ID_FK, CODE, ANTENNA_TYPE, VENDOR_ID_FK, PRODUCT_MODEL_ID_FK … | MOUNT_ASSET_ID_FK→PASSIVE_ASSET, PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RADIO_SECTOR_ID_FK→RADIO_SECTOR, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, VENDOR_ID_FK→VENDOR | parent: PASSIVE_ASSET, PRODUCT_MODEL, RADIO_SECTOR, RESOURCE (cascade), SITE, VENDOR; children: CELL_ANTENNA | RAN | Core | C | High | M8 RAN Inventory | GET /sites/{id}/antennas, GET/PUT /antennas/{id} | Per sector | Azimuth, tilts, RET |
| 2 | `ATTRIBUTE_DEFINITION` | Typed definition of an extensible attribute for one resource class. | ID | CODE, LABEL, DATA_TYPE, UNIT, VENDOR_ID_FK, TECHNOLOGY_ID_FK, IS_ACTIVE | RESOURCE_CLASS→RESOURCE_CLASS, TECHNOLOGY_ID_FK→TECHNOLOGY, VENDOR_ID_FK→VENDOR | parent: RESOURCE_CLASS, TECHNOLOGY, VENDOR; children: RESOURCE_ATTRIBUTE | Cross | Reference | D | Low | M18 Administration & Catalogs | GET/POST /attribute-definitions | Few definitions | Tenant-scoped custom attribute schema |
| 3 | `CAPEX_LINE` | Capex line item (equipment, civil works, power, fiber, installation, licence). | ID | CAPEX_PLAN_ID_FK, DESCRIPTION, CATEGORY, VENDOR_ID_FK, PO_NUMBER, QUANTITY, UNIT_COST … | CAPEX_PLAN_ID_FK→CAPEX_PLAN, VENDOR_ID_FK→VENDOR | parent: CAPEX_PLAN (cascade), VENDOR; children: CAPEX_LINE_RESOURCE | Facility | Core | C | High | M15 Finance (Capex/Opex) | embedded in capex-plan DTO (lines[]) | Per plan | Existing add/remove line editor |
| 4 | `CAPEX_LINE_RESOURCE` | Resource funded by a CAPEX line. | ID | CAPEX_LINE_ID_FK | CAPEX_LINE_ID_FK→CAPEX_LINE, RESOURCE_ID_FK→RESOURCE | parent: CAPEX_LINE (cascade), RESOURCE | Facility | Core | C | Low | M15 Finance (Capex/Opex) | embedded in capex line (resourceIds[]) | Optional | Links funded resources |
| 5 | `CAPEX_PLAN` | Capital plan of a site for a financial year (AFE, cost centre, approved amount). | ID | SITE_ID_FK, FINANCIAL_YEAR, AFE_NUMBER, COST_CENTRE, OWNER_ID_FK, APPROVED_AMOUNT, CURRENCY_CODE | OWNER_ID_FK→USER, SITE_ID_FK→SITE | parent: USER, SITE; children: CAPEX_LINE | Facility | Core | C | High | M15 Finance (Capex/Opex) | GET /sites/{id}/capex, POST/PUT | Per site/FY | Existing Capex screen |
| 6 | `CELL_ANTENNA` | Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells). | ID | RADIO_CELL_ID_FK, ANTENNA_ID_FK, ANTENNA_PORTS | ANTENNA_ID_FK→ANTENNA, RADIO_CELL_ID_FK→RADIO_CELL | parent: ANTENNA, RADIO_CELL (cascade) | RAN | Core | C | Medium | M8 RAN Inventory | embedded in cell DTO | Per cell | Many-to-many |
| 7 | `CELL_RADIO_UNIT` | Radio unit(s) (RRU / RRH / AAU, NE class RADIO_UNIT) that transmit a cell; one RU carries many cells. | ID | RADIO_CELL_ID_FK, RADIO_UNIT_NE_ID_FK, RADIO_UNIT_NE_CLASS | RADIO_CELL_ID_FK→RADIO_CELL, RADIO_UNIT_NE_CLASS→NETWORK_ELEMENT | parent: RADIO_CELL (cascade), NETWORK_ELEMENT | RAN | Core | C | Medium | M8 RAN Inventory | embedded in cell DTO | Per cell | RU that transmits the cell |
| 8 | `CLOUD_CLUSTER` | Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04). | ID | CODE, SITE_ID_FK, PLATFORM | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE | parent: RESOURCE (cascade), SITE; children: NE_SERVER_DETAIL, NE_VIRTUAL_INSTANCE | IT/Cloud | Core | C | High | M7 Virtual Resources | GET/POST/PUT /cloud-clusters | Few clusters | Hosts VNF/CNF; site-bound |
| 9 | `COLLECTOR` | Collector node that executes scans (clr-blr-02, Collector-West). | ID | CODE, DOMAIN_ID_FK, HOST_ADDRESS, STATUS, P95_RESPONSE_MS, LAST_CHECKIN_TIME | DOMAIN_ID_FK→DOMAIN | parent: DOMAIN; children: SCAN_JOB | Cross | Integration | B | High | M2 Scan Jobs & Targets / M1 Insights | GET /collectors, GET /collectors/{id} | 4 collectors | Health card on Insights |
| 10 | `CREDENTIAL_PROFILE` | Named access profile used by scans (ro-inband-v3). Holds only a vault reference: the secret, SNMPv3 user and keys never enter this database. | ID | CODE, PROTOCOL, ACCESS_MODE, NETWORK_PATH, VAULT_REF, DOMAIN_ID_FK, OPERATIONAL_AREA_ID_FK … | DOMAIN_ID_FK→DOMAIN, OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA | parent: DOMAIN, OPERATIONAL_AREA; children: SCAN_JOB | Cross | Integration | B | Medium | M2 Scan Jobs & Targets | GET /credential-profiles (no secrets), POST/PUT (vault ref only) | Few profiles | Secret never returned |
| 11 | `DISCOVERY_STEP_DEF` | Collector step of a domain family, in execution order (Transport: device, hardware, lldp, ospf, bgp, service ...). | ID | DOMAIN_ID_FK, CODE, NAME, SEQUENCE_NO, PROTOCOL, WRITES | — | root; children: SCAN_STEP_RESULT | Cross | Reference | D | Medium | M2 Scan Jobs & Targets | GET /ref/discovery-steps?domain= | Seeded per domain | Column order of the target transcript |
| 12 | `DISCREPANCY_TYPE` | Discrepancy label with its category and domain (Undocumented wavelength, PCI value != record, Topology gap (LLDP) ...). | ID | CODE, LABEL, CATEGORY, DOMAIN_ID_FK | — | root; children: RECON_EXCEPTION | Cross | Reference | D | High | M3 Reconciliation Operations | GET /ref/discrepancy-types | Seeded per domain | Labels of the Discrepancies drill-down and exception type filter |
| 13 | `DOMAIN` | Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tree (IP/MPLS under Transport). Seeded; global. | ID | CODE, NAME, PARENT_DOMAIN_ID_FK, SORT_ORDER, IS_ACTIVE | PARENT_DOMAIN_ID_FK→DOMAIN | parent: self (PARENT_DOMAIN_ID_FK); children: COLLECTOR, CREDENTIAL_PROFILE, DOMAIN_TRUST_SNAPSHOT, EXTERNAL_SYSTEM, NETWORK_ELEMENT, NETWORK_FUNCTION_TYPE (+7) | Cross | Reference | D | High | Shared: Reference API (all modules) | GET /ref/domains (tree) | 9 seeded rows | Seeded: RAN, CORE, TRANSPORT, IP_MPLS, OPTICAL, MICROWAVE, FIXED_ACCESS, IT_CLOUD, FACILITY. Frontend today has 4 keys |
| 14 | `DOMAIN_TRUST_SNAPSHOT` | Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unverified, open, MTTR, touchless). | ID | SNAPSHOT_DATE, DOMAIN_ID_FK, IN_SCOPE, IN_SYNC, UNVERIFIED, OPEN_EXCEPTIONS, MTTR_HOURS … | DOMAIN_ID_FK→DOMAIN | parent: DOMAIN | Cross | Integration | E | High | M1 Discovery Insights / M16 Reports | GET /insights/trust-trend?domain=&days= | 30-day series per domain | Derived daily; UI read-only |
| 15 | `EQUIPMENT_COMPONENT` | Hardware tree inside a device, including empty slots; parents are FK-bound to the same device. | ID | NETWORK_ELEMENT_ID_FK, PARENT_COMPONENT_ID_FK, COMPONENT_CLASS, NAME, SLOT_POSITION, VENDOR_ID_FK, PRODUCT_MODEL_ID_FK … | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PARENT_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, VENDOR_ID_FK→VENDOR | parent: NETWORK_ELEMENT, self (PARENT_COMPONENT_ID_FK), PRODUCT_MODEL, RESOURCE (cascade), VENDOR; children: PORT | Cross | Core | C | High | M6 Network Elements (Hardware tab) | GET /network-elements/{id}/components (tree) | Per NE | Chassis/slot/card/optic tree incl. empty slots |
| 16 | `EXTERNAL_OBJECT_TYPE` | Type of externally owned object that may be proxied here. | CODE | CODE, SYSTEM_TYPE, NAME | — | root; children: EXTERNAL_RESOURCE | Cross | Reference | D | Low | M17 External Systems & Integration | GET /ref/external-object-types | Seeded | Fiber-plant object kinds (span, duct, splice …) |
| 17 | `EXTERNAL_RESOURCE` | Lightweight proxy for an object owned by another system (fiber plant); ids only, no copied attributes. | ID | EXTERNAL_SYSTEM_ID_FK, SYSTEM_TYPE, OBJECT_TYPE, EXTERNAL_ID, DISPLAY_LABEL, LAST_SYNC_TIME, RECORD_STATE | SYSTEM_TYPE→EXTERNAL_OBJECT_TYPE, RESOURCE_CLASS→RESOURCE, SYSTEM_TYPE→EXTERNAL_SYSTEM | parent: EXTERNAL_OBJECT_TYPE, RESOURCE (cascade), EXTERNAL_SYSTEM | Passive (fiber) | Integration | B | Medium | M9 Passive (fiber tabs) / M17 | GET /external-resources?system=&type= | Fiber spans/ducts/splices as proxies | Existing Ducts / Fiber spans / Splice screens must become proxy views |
| 18 | `EXTERNAL_SYSTEM` | Every external system this inventory exchanges data with, including discovery sources and the fiber application. | ID | CODE, NAME, SYSTEM_TYPE, VENDOR_ID_FK, DOMAIN_ID_FK, BASE_URL, VAULT_REF … | DOMAIN_ID_FK→DOMAIN, VENDOR_ID_FK→VENDOR | parent: DOMAIN, VENDOR; children: EXTERNAL_RESOURCE, RESOURCE_EXTERNAL_REF, RESOURCE_FIELD_PROVENANCE, RESOURCE_RELATIONSHIP, SCAN_JOB, USER_IDENTITY | Cross | Integration | B | High | M17 External Systems & Integration | GET /external-systems, GET /external-systems/{id} (config CRUD needs validation) | 5-8 systems | Discovery sources + fiber app + IAM |
| 19 | `FLOOR` | Floor inside a site (facility view). | ID | SITE_ID_FK, NAME, LEVEL_NO | SITE_ID_FK→SITE | parent: SITE (cascade); children: ROOM | Facility | Core | C | Medium | M5 Location & Facility | GET /sites/{id}/floors (+CRUD) | Per site | Facility tab |
| 20 | `FREQUENCY_BAND` | Radio band per technology with duplex mode and frequency ranges. | ID | TECHNOLOGY_CODE, CODE, DUPLEX_MODE, DL_LOW_MHZ, DL_HIGH_MHZ, UL_LOW_MHZ, UL_HIGH_MHZ | TECHNOLOGY_CODE→TECHNOLOGY | parent: TECHNOLOGY; children: RADIO_CELL | RAN | Reference | D | Medium | M8 RAN Inventory | GET /ref/frequency-bands?technology= | Seeded | Band picker for cells |
| 21 | `IP_SUBNET` | IP prefix per routing context (global or L3VPN), with hierarchy and purpose. | ID | NETWORK_ADDRESS, PREFIX_LENGTH, ADDRESS_FAMILY, SERVICE_INSTANCE_ID_FK, ROUTING_CONTEXT_KEY, PARENT_SUBNET_ID_FK, SITE_ID_FK … | PARENT_SUBNET_ID_FK→IP_SUBNET, RESOURCE_CLASS→RESOURCE, SERVICE_INSTANCE_ID_FK→SERVICE_INSTANCE, SITE_ID_FK→SITE | parent: self (PARENT_SUBNET_ID_FK), RESOURCE (cascade), SERVICE_INSTANCE, SITE; children: PORT_IP_ADDRESS | IP/MPLS | Core | C | Medium | M11 IP & Logical (IPAM) | GET /ip-subnets?context=&site= (tree), GET/POST/PUT | Subnet tree | Routing context = global or L3VPN service |
| 22 | `LINK` | Connection between two devices at one catalogued layer, unique by natural key among active rows. | ID | LAYER, IS_DIRECTED, LINK_NAME, CIRCUIT_ID, A_NE_ID_FK, A_PORT_ID_FK, A_IP_ADDRESS … | A_NE_ID_FK→NETWORK_ELEMENT, A_PORT_ID_FK→PORT, IS_DIRECTED→LINK_LAYER, RESOURCE_CLASS→RESOURCE, Z_NE_ID_FK→NETWORK_ELEMENT, Z_PORT_ID_FK→PORT | parent: NETWORK_ELEMENT, PORT, LINK_LAYER, RESOURCE (cascade); children: LINK_MICROWAVE_ATTR, LINK_PROTOCOL_ATTR | Cross | Core | C | High | M10 Connectivity (Links) | GET /links?layer=&domain=&ne= (paged), GET/POST/PUT /links/{id} | ~150 links across layers | Existing Links screen; one row per (A,Z,layer) |
| 23 | `LINK_LAYER` | Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP interface layers. | ID | CODE, NAME, CATEGORY, IS_DIRECTED | — | root; children: LINK | Cross | Reference | D | High | M10 Connectivity | GET /ref/link-layers | 45 seeded rows | CATEGORY groups the Links tabs (Physical, L2, Routing, Tunnel, Optical, Microwave, Fronthaul, RAN interface) |
| 24 | `LINK_MICROWAVE_ATTR` | Hop-level attributes of a microwave link, stored once per hop. | ID | LINK_ID_FK, LAYER, FREQUENCY_BAND_GHZ, CHANNEL_BANDWIDTH_MHZ, POLARIZATION, MAX_MODULATION, DISTANCE_KM … | LAYER→LINK | parent: LINK (cascade) | Microwave | Core | C | Medium | M10 Connectivity | embedded in link DTO | Per MW hop | Frequency, modulation, licence |
| 25 | `LINK_PROTOCOL_ATTR` | Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / neighbour state, IS-IS level. The grids used to overload the interface columns with these. | ID | LINK_ID_FK, LOCAL_ASN, REMOTE_ASN, OSPF_AREA, NEIGHBOR_STATE, ISIS_LEVEL, IF_INDEX_A … | LINK_ID_FK→LINK | parent: LINK (cascade) | IP/MPLS | Core | C | Medium | M10 Connectivity | embedded in link DTO | Per routing link | BGP ASN, OSPF area, IS-IS level |
| 26 | `NETWORK_ELEMENT` | Golden record of a physical or virtual device / network function in any domain. | ID | IS_VIRTUAL, NE_NAME, NE_CLASS, DOMAIN_ID_FK, VENDOR_ID_FK, PRODUCT_MODEL_ID_FK, SERIAL_NUMBER … | DECOMMISSIONED_BY_FK→USER, DOMAIN_ID_FK→DOMAIN, DOMAIN_ID_FK→NE_CLASS_DOMAIN, PARENT_NE_ID_FK→NETWORK_ELEMENT, NE_CLASS→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, RACK_ID_FK→RACK, VENDOR_ID_FK→VENDOR | parent: USER, DOMAIN, NE_CLASS_DOMAIN, self (PARENT_NE_ID_FK), PRODUCT_MODEL, RESOURCE (cascade), SITE, RACK, VENDOR; children: CELL_RADIO_UNIT, EQUIPMENT_COMPONENT, LINK, NE_CORE_DETAIL, NE_HEALTH, NE_IPMPLS_DETAIL (+16) | Cross | Core | C | High | M6 Network Elements (Physical Resources) | GET /network-elements (paged, filter by domain/class/site/state), GET/PUT /network-elements/{id}, POST | ~200 NEs across 9 domains | Golden record; hub of the schema (24 referencing tables) |
| 27 | `NETWORK_FUNCTION_TYPE` | Core / IMS / CS network-function type catalog. | ID | CODE, NAME, CORE_SEGMENT, DOMAIN_ID_FK, IS_ACTIVE | DOMAIN_ID_FK→DOMAIN | parent: DOMAIN; children: NE_CORE_DETAIL | Core | Reference | D | Medium | M7 Virtual Resources | GET /ref/nf-types | Seeded | AMF, SMF, UPF, HSS, IMS … with CORE_SEGMENT |
| 28 | `NETWORK_SLICE` | 5G network slice (S-NSSAI) of a PLMN. | ID | PLMN_ID_FK, SST, SD, NAME, STATUS | PLMN_ID_FK→PLMN, RESOURCE_CLASS→RESOURCE | parent: PLMN, RESOURCE (cascade) | Core/RAN | Core | C | Medium | M12 Services (5G slices) | GET/POST /network-slices | Few slices | S-NSSAI per PLMN |
| 29 | `NE_CLASS` | Device-class catalog: tab, the one detail table of the class, and whether it may be virtual. | ID | CODE, NAME, CAN_BE_VIRTUAL, SORT_ORDER, IS_ACTIVE | — | root; children: NE_CLASS_DOMAIN, NE_CORE_DETAIL, NE_IPMPLS_DETAIL, NE_MICROWAVE_DETAIL, NE_OPTICAL_DETAIL, NE_PON_DETAIL (+7) | Cross | Reference | D | High | Shared: Reference API | GET /ref/ne-classes | 25 seeded rows | Drives tabs on Physical Resources; DETAIL_TABLE selects the detail panel |
| 30 | `NE_CLASS_DOMAIN` | Allowed (device class, network domain) pairs; the FK target that keeps every device in a domain its class covers. Seeded; global. | ID | NE_CLASS_CODE, DOMAIN_ID_FK | DOMAIN_ID_FK→DOMAIN, NE_CLASS_CODE→NE_CLASS | parent: DOMAIN, NE_CLASS; children: NETWORK_ELEMENT | Cross | Reference | D | Medium | Shared: Reference API | GET /ref/ne-classes?domain= | Seeded pairs | Filters class picker by domain in NE create/edit |
| 31 | `NE_CORE_DETAIL` | Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, NF_TYPE_CODE, REDUNDANCY_ROLE, POOL_CODE, POOL_NAME, MAX_SESSION_CAPACITY … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, NF_TYPE_CODE→NETWORK_FUNCTION_TYPE | parent: NE_CLASS, NETWORK_ELEMENT (cascade), NETWORK_FUNCTION_TYPE | Core | Core | C | High | M6 / M7 Virtual Resources | embedded detail | Per CORE_NF | NF type, redundancy, pool |
| 32 | `NE_HEALTH` | Latest reachability and time-sync check of a device (ICMP + NTP). Successor of ICMP_INFO and NTP_INFO; history belongs to PM. | ID | NETWORK_ELEMENT_ID_FK, REACHABILITY, PACKET_LOSS_PCT, LATENCY_AVG_MS, AVAILABILITY_24H_PCT, NTP_STATUS, NTP_OFFSET_MS … | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT | parent: NETWORK_ELEMENT (cascade) | Cross | Integration | B | High | M6 Network Elements (health strip) / M1 Insights | GET /network-elements/{id}/health | Per NE | Written by collector; UI read-only |
| 33 | `NE_IPMPLS_DETAIL` | IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; Transport > IP/MPLS domain). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, ROUTER_ROLE, ROUTER_ID, LOOPBACK_IP, AS_NUMBER, IGP_PROTOCOL … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: NE_CLASS, NETWORK_ELEMENT (cascade) | IP/MPLS | Core | C | High | M6 Network Elements (Router tab) | embedded detail | Per router | Router role, IGP, MPLS flags |
| 34 | `NE_MICROWAVE_DETAIL` | Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link. | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, ODU_MODEL, IDU_MODEL, ANTENNA_DIAMETER_M, ANTENNA_GAIN_DBI, TX_POWER_DBM … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: NE_CLASS, NETWORK_ELEMENT (cascade) | Microwave | Core | C | High | M6 Network Elements | embedded detail | Per MW terminal | Hop attrs live on LINK_MICROWAVE_ATTR |
| 35 | `NE_MOVEMENT` | Append-only (trigger-enforced) stock movement / state change of a device (issue, install, RMA, decommission, recover to store) with its work order. | ID | NETWORK_ELEMENT_ID_FK, FROM_STATE, TO_STATE, FROM_SITE_ID_FK, TO_SITE_ID_FK, MOVED_TIME, WORK_ORDER_REF … | FROM_SITE_ID_FK→SITE, TO_STATE→NE_STOCK_TRANSITION, NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, TO_SITE_ID_FK→SITE | parent: SITE, NE_STOCK_TRANSITION, NETWORK_ELEMENT | Cross | Core | C | High | M6 Network Elements / M14 Inactive Inventory | GET /network-elements/{id}/movements, POST /network-elements/{id}/move | Per NE history | Append-only (trigger); every stock move is a POST of an action, not an edit |
| 36 | `NE_OPTICAL_DETAIL` | DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, TRANSPORT_ROLE, OPTICAL_BAND, ROADM_DEGREES, WAVELENGTH_CAPACITY, WAVELENGTHS_IN_USE … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: NE_CLASS, NETWORK_ELEMENT (cascade) | Optical | Core | C | High | M6 Network Elements | embedded detail | Per optical node | ROADM degrees, wavelengths |
| 37 | `NE_PON_DETAIL` | PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, PON_TECHNOLOGY, PARENT_OLT_NE_ID_FK, SERVING_PON_PORT_ID_FK, ONU_ID, SPLIT_RATIO … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, PARENT_OLT_NE_ID_FK→NETWORK_ELEMENT, SERVING_PON_PORT_ID_FK→PORT | parent: NE_CLASS, NETWORK_ELEMENT (cascade), NETWORK_ELEMENT, PORT | Fixed access | Core | C | High | M6 Network Elements | embedded detail | Per OLT/ONU/ONT | PON tree via PARENT_OLT_NE_ID_FK |
| 38 | `NE_POWER_DETAIL` | Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, POWER_NODE_TYPE, POWER_UNIT_ID_FK, MONITORING_PROTOCOL, NOMINAL_DC_VOLTAGE, RATED_CAPACITY_KW … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, POWER_UNIT_ID_FK→POWER_UNIT | parent: NE_CLASS, NETWORK_ELEMENT (cascade), POWER_UNIT | Facility | Core | C | Medium | M6 Network Elements | embedded detail | Per power controller | Monitored power node linked to POWER_UNIT |
| 39 | `NE_RAN_DETAIL` | RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 with NETWORK_ELEMENT). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, DEPLOYMENT_TYPE, ARCHITECTURE, NODE_ID, GNB_ID_LENGTH, PRIMARY_PLMN_ID_FK … | CONTROLLER_NE_CLASS→NETWORK_ELEMENT, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, PRIMARY_PLMN_ID_FK→PLMN | parent: NETWORK_ELEMENT, NE_CLASS, NETWORK_ELEMENT (cascade), PLMN | RAN | Core | C | High | M6 Network Elements (RAN tab) | embedded in GET /network-elements/{id} as detail | Per RAN NE | 1:1; classes BTS…RADIO_UNIT |
| 40 | `NE_SECURITY_DETAIL` | Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, SECURITY_ROLE, DEPLOYMENT_MODE, THROUGHPUT_CAPACITY_GBPS, MAX_CONCURRENT_SESSIONS, POLICY_RULE_COUNT … | HA_PEER_NE_ID_FK→NETWORK_ELEMENT, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: NETWORK_ELEMENT, NE_CLASS, NETWORK_ELEMENT (cascade) | Core/IP | Core | C | High | M6 Network Elements | embedded detail | Per firewall | HA peer |
| 41 | `NE_SERVER_DETAIL` | Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domains). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, SERVER_ROLE, HYPERVISOR, CLOUD_CLUSTER_ID_FK, CPU_SOCKETS, CPU_CORES … | CLOUD_CLUSTER_ID_FK→CLOUD_CLUSTER, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: CLOUD_CLUSTER, NE_CLASS, NETWORK_ELEMENT (cascade) | IT/Cloud | Core | C | High | M6 / M7 Virtual Resources | embedded detail | Per server | Host capacity; cloud cluster |
| 42 | `NE_STOCK_TRANSITION` | Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned; decommissioned > in store = recovered to store). | ID | FROM_STATE, TO_STATE, MOVEMENT_TYPE | — | root; children: NE_MOVEMENT | Cross | Reference | D | Medium | M6 Network Elements | GET /ref/stock-transitions | 14 seeded rows | Drives the allowed "move" actions on an NE |
| 43 | `NE_SWITCH_DETAIL` | Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport / IP/MPLS / Core domains). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, SWITCH_ROLE, SWITCH_LAYER, STP_MODE, STACK_ROLE, STACK_ID … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | parent: NE_CLASS, NETWORK_ELEMENT (cascade) | Transport/IP | Core | C | High | M6 Network Elements | embedded detail | Per switch | STP, stacking |
| 44 | `NE_VIRTUAL_INSTANCE` | Virtualisation record (VNF / CNF) of a virtual NE, 1:1. | ID | NETWORK_ELEMENT_ID_FK, NE_RESOURCE_CLASS, VIRTUALIZATION_TYPE, INSTANCE_UUID, DESCRIPTOR_ID, DESCRIPTOR_VERSION, CLOUD_CLUSTER_ID_FK … | CLOUD_CLUSTER_ID_FK→CLOUD_CLUSTER, HOST_RESOURCE_CLASS→NETWORK_ELEMENT, NE_RESOURCE_CLASS→NETWORK_ELEMENT | parent: CLOUD_CLUSTER, NETWORK_ELEMENT, NETWORK_ELEMENT (cascade) | Core/IT | Core | C | High | M7 Virtual Resources | GET /virtual-instances, embedded in NE detail | Per virtual NE | VNF/CNF instance, host NE, cluster; existing Virtual screens + VNF lifecycle |
| 45 | `NE_WIFI_DETAIL` | WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, access radio). | ID | NETWORK_ELEMENT_ID_FK, NE_CLASS, WLAN_CONTROLLER_NE_ID_FK, AP_GROUP, AP_MODE, MESH_ROLE, PRIMARY_SSID … | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, WLAN_CONTROLLER_NE_ID_FK→NETWORK_ELEMENT | parent: NE_CLASS, NETWORK_ELEMENT (cascade), NETWORK_ELEMENT | RAN (Wi-Fi) | Core | C | High | M6 Network Elements | embedded detail | Per AP/WLC | Existing WIFI_DETAILS concept |
| 46 | `OPERATIONAL_AREA` | Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > Territory). A child always sits at a lower level than its parent. | ID | PARENT_AREA_ID_FK, PARENT_AREA_LEVEL, AREA_LEVEL, CODE, NAME | PARENT_AREA_LEVEL→OPERATIONAL_AREA | parent: self (PARENT_AREA_LEVEL); children: CREDENTIAL_PROFILE, SCAN_JOB, SITE | Cross | Reference | D | High | M5 Location & Facility | GET /ref/operational-areas (tree) | Region > Circle tree | Region/Circle/Zone/Division/Territory; the "circle" filter used app-wide |
| 47 | `OPEX_LINE` | Recurring cost / contract line (rent, electricity, diesel, backhaul lease, AMC, fiber O&M, security, statutory). Monthly run rate is derived from amount and frequency. | ID | OPEX_PLAN_ID_FK, DESCRIPTION, CATEGORY, SUPPLIER, CONTRACT_REF, FREQUENCY, AMOUNT … | OPEX_PLAN_ID_FK→OPEX_PLAN | parent: OPEX_PLAN (cascade) | Facility | Core | C | High | M15 Finance (Capex/Opex) | embedded in opex-plan DTO (lines[]) | Per plan | Monthly run rate derived |
| 48 | `OPEX_MONTH_ACTUAL` | Actual spend per month against the budget (the 12-month opex trend). | ID | OPEX_PLAN_ID_FK, MONTH_START, ACTUAL_AMOUNT | OPEX_PLAN_ID_FK→OPEX_PLAN | parent: OPEX_PLAN (cascade) | Facility | Core | C | Medium | M15 Finance (Capex/Opex) | embedded in opex-plan DTO (actuals[]) | 12 months | Opex trend |
| 49 | `OPEX_PLAN` | Operating budget of a site for a financial year. | ID | SITE_ID_FK, FINANCIAL_YEAR, COST_CENTRE, OWNER_ID_FK, MONTHLY_BUDGET, CURRENCY_CODE | OWNER_ID_FK→USER, SITE_ID_FK→SITE | parent: USER, SITE; children: OPEX_LINE, OPEX_MONTH_ACTUAL | Facility | Core | C | High | M15 Finance (Capex/Opex) | GET /sites/{id}/opex, POST/PUT | Per site/FY | Existing Opex screen |
| 50 | `PASSIVE_ASSET` | Passive / site-infrastructure asset of a governed type; fiber plant excluded. | ID | ASSET_TYPE, HAS_PORTS, IS_RACK_MOUNTABLE, CODE, SITE_ID_FK, RACK_ID_FK, RACK_U_START … | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, RACK_ID_FK→RACK, IS_RACK_MOUNTABLE→PASSIVE_ASSET_TYPE, VENDOR_ID_FK→VENDOR | parent: PRODUCT_MODEL, RESOURCE (cascade), SITE, RACK, PASSIVE_ASSET_TYPE, VENDOR; children: ANTENNA, PATCH_CORD, PORT | Passive | Core | C | High | M9 Passive Infrastructure | GET /passive-assets?type=&site= (paged), GET/POST/PUT /passive-assets/{id} | Per type (ODF, splice, cabinet …) | Existing Passive screens; fiber plant is NOT here (see EXTERNAL_RESOURCE) |
| 51 | `PASSIVE_ASSET_TYPE` | Passive / site-infrastructure asset type catalog (fiber plant excluded). | ID | CODE, NAME, HAS_PORTS, IS_RACK_MOUNTABLE | — | root; children: PASSIVE_ASSET | Passive | Reference | D | High | M9 Passive Infrastructure | GET /ref/passive-asset-types | Seeded | HAS_PORTS / IS_RACK_MOUNTABLE drive which panels a passive asset shows |
| 52 | `PATCH_CORD` | Patch cord detail: the two ports a patch-cord asset joins. | ID | PASSIVE_ASSET_ID_FK, ASSET_TYPE, A_PORT_ID_FK, Z_PORT_ID_FK, CORD_TYPE, LENGTH_M, LOSS_DB | A_PORT_ID_FK→PORT, ASSET_TYPE→PASSIVE_ASSET, Z_PORT_ID_FK→PORT | parent: PORT, PASSIVE_ASSET (cascade) | Passive | Core | C | Medium | M9 Passive Infrastructure | embedded in passive-asset DTO for type PATCH_CORD | Per cord | Existing Patch cords screen |
| 53 | `PLMN` | Public land mobile network (MCC + MNC) run or shared by the tenant. | ID | MCC, MNC, NAME, IS_HOME | — | root; children: NETWORK_SLICE, NE_RAN_DETAIL, RADIO_CELL_PLMN | RAN | Core | C | Medium | M8 RAN Inventory | GET/POST /plmns | 2-3 rows | MCC+MNC; IS_HOME |
| 54 | `PORT` | Device interface or passive-asset port; card, optic, parent and VRF bound to the same device. | ID | NETWORK_ELEMENT_ID_FK, PASSIVE_ASSET_ID_FK, EQUIPMENT_COMPONENT_ID_FK, TRANSCEIVER_COMPONENT_ID_FK, PARENT_PORT_ID_FK, VRF_ID_FK, NAME … | EQUIPMENT_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PARENT_PORT_ID_FK→PORT, PASSIVE_ASSET_ID_FK→PASSIVE_ASSET, RESOURCE_CLASS→RESOURCE, TRANSCEIVER_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, VRF_ID_FK→VRF | parent: EQUIPMENT_COMPONENT, NETWORK_ELEMENT, self (PARENT_PORT_ID_FK), PASSIVE_ASSET, RESOURCE (cascade), VRF; children: LINK, NE_PON_DETAIL, PATCH_CORD, PORT_IP_ADDRESS, PORT_VLAN, SERVICE_ENDPOINT | Cross | Core | C | High | M6 Network Elements (Ports tab) / M9 | GET /network-elements/{id}/ports, GET /passive-assets/{id}/ports, GET /ports/{id} | Per NE / asset | Both device interfaces and passive ports |
| 55 | `PORT_IP_ADDRESS` | IP address on an interface and its subnet. | ID | PORT_ID_FK, IP_ADDRESS, PREFIX_LENGTH, IP_SUBNET_ID_FK, IS_PRIMARY | IP_SUBNET_ID_FK→IP_SUBNET, PORT_ID_FK→PORT | parent: IP_SUBNET, PORT (cascade) | IP/MPLS | Core | C | Medium | M11 IP & Logical / M6 Ports tab | GET /ports/{id}/ip-addresses | Per port | Links port to IP_SUBNET |
| 56 | `PORT_VLAN` | VLAN membership of a port on the same device. | ID | NETWORK_ELEMENT_ID_FK, PORT_ID_FK, VLAN_ID_FK, MODE, STP_STATE | PORT_ID_FK→PORT, VLAN_ID_FK→VLAN | parent: PORT (cascade), VLAN (cascade) | Transport/IP | Core | C | Medium | M11 IP & Logical / M6 Ports tab | GET /ports/{id}/vlans | Per port | Access/trunk membership |
| 57 | `POWER_FEED` | Power feed into a site (facility tab: AC / DC feeds with rating and load). | ID | SITE_ID_FK, CODE, KIND, SOURCE, RATING_KW, LOAD_KW, STATUS | SITE_ID_FK→SITE | parent: SITE (cascade) | Facility | Core | C | Medium | M5 Location & Facility | GET /sites/{id}/power-feeds (+CRUD) | Per site | Facility tab AC/DC feeds |
| 58 | `POWER_UNIT` | Power plant at a site: DG set, rectifier / SMPS, battery bank, UPS, solar (facility tab + Passive > Power plant). | ID | SITE_ID_FK, CODE, KIND, VENDOR_ID_FK, PRODUCT_MODEL_ID_FK, SERIAL_NUMBER, RATING … | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, VENDOR_ID_FK→VENDOR | parent: PRODUCT_MODEL, RESOURCE (cascade), SITE, VENDOR; children: NE_POWER_DETAIL, POWER_UNIT_TEST | Facility | Core | C | High | M9 Passive Infrastructure / M5 | GET /sites/{id}/power-units, GET /power-units/{id} (+CRUD) | Per site | Existing Power plant screen |
| 59 | `POWER_UNIT_TEST` | Load / runtime test of a power unit; "power overdue" = no passing test within the service interval. | ID | POWER_UNIT_ID_FK, TESTED_DATE, RESULT, LOAD_PCT, DURATION_MINUTES, TESTED_BY_FK | POWER_UNIT_ID_FK→POWER_UNIT, TESTED_BY_FK→USER | parent: POWER_UNIT (cascade), USER | Facility | Core | C | Medium | M9 Passive Infrastructure | GET/POST /power-units/{id}/tests | Per unit | "Power overdue" derived: no PASS within SERVICE_INTERVAL_DAYS |
| 60 | `PRIMARY_GEO_L1` | Level-1 geography (country / state). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | GEO_CODE, GEO_NAME, PRETTY_NAME, LATITUDE, LONGITUDE | — | root; children: PRIMARY_GEO_L2 | Cross | Reference | D | Medium | M5 Location & Facility | GET /ref/geo?level=1 | Geo tree | Country / state |
| 61 | `PRIMARY_GEO_L2` | Level-2 geography (district / city). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | PRIMARY_GEO_L1_ID_FK, GEO_CODE, GEO_NAME, PRETTY_NAME, LATITUDE, LONGITUDE | PRIMARY_GEO_L1_ID_FK→PRIMARY_GEO_L1 | parent: PRIMARY_GEO_L1; children: PRIMARY_GEO_L3 | Cross | Reference | D | Medium | M5 Location & Facility | GET /ref/geo?level=2&parent= | Geo tree | District / city |
| 62 | `PRIMARY_GEO_L3` | Level-3 geography (locality). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | PRIMARY_GEO_L2_ID_FK, GEO_CODE, GEO_NAME, PRETTY_NAME, LATITUDE, LONGITUDE | PRIMARY_GEO_L2_ID_FK→PRIMARY_GEO_L2 | parent: PRIMARY_GEO_L2; children: PRIMARY_GEO_L4 | Cross | Reference | D | Medium | M5 Location & Facility | GET /ref/geo?level=3&parent= | Geo tree | Locality |
| 63 | `PRIMARY_GEO_L4` | Level-4 geography (cluster / pin area). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | PRIMARY_GEO_L3_ID_FK, GEO_CODE, GEO_NAME, PRETTY_NAME, LATITUDE, LONGITUDE, MORPHOLOGY | PRIMARY_GEO_L3_ID_FK→PRIMARY_GEO_L3 | parent: PRIMARY_GEO_L3; children: SITE | Cross | Reference | D | Medium | M5 Location & Facility | GET /ref/geo?level=4&parent= | Geo tree | Cluster / pin area; SITE binds here; MORPHOLOGY (urban/rural) |
| 64 | `PRODUCT_MODEL` | Vendor product catalog for devices, cards, optics, antennas, passive and power products, with lifecycle dates. | ID | VENDOR_ID_FK, MODEL, PRODUCT_CATEGORY, NE_CLASS, DESCRIPTION, SYS_OBJECT_ID, PORT_COUNT … | NE_CLASS→NE_CLASS, VENDOR_ID_FK→VENDOR | parent: NE_CLASS, VENDOR; children: ANTENNA, EQUIPMENT_COMPONENT, NETWORK_ELEMENT, PASSIVE_ASSET, POWER_UNIT, PRODUCT_MODEL_POLICY | Cross | Reference | D | High | M18 Administration & Catalogs | GET /ref/product-models?vendor=&neClass= | Vendor/model list | Global (no CUSTOMER_ID). EoS/EoL dates feed Hardware lifecycle risk report |
| 65 | `PRODUCT_MODEL_POLICY` | Per-tenant golden software version of a product model. | ID | PRODUCT_MODEL_ID_FK, RECOMMENDED_OS_VERSION | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL | parent: PRODUCT_MODEL | Cross | Core | C | Medium | M18 Administration & Catalogs | GET/PUT /product-models/{id}/policy | Recommended OS per model | Golden software version; drives "OS drift" insight |
| 66 | `RACK` | Equipment rack, outdoor cabinet or shelter rack; always at a site, in a room when indoors. | ID | SITE_ID_FK, ROOM_ID_FK, CODE, RACK_TYPE, ROLE, HEIGHT_U, POWER_BUDGET_KW | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, ROOM_ID_FK→ROOM | parent: RESOURCE (cascade), SITE, ROOM; children: NETWORK_ELEMENT, PASSIVE_ASSET | Facility | Core | C | High | M5 Location & Facility / M9 Passive | GET /sites/{id}/racks, GET /racks/{id} (+CRUD) | Per site | Existing Racks screen under Passive; rack elevation from NE.RACK_U_START/END |
| 67 | `RADIO_CELL` | Radio cell of any generation, bound to its node, technology, band and sector. | ID | NETWORK_ELEMENT_ID_FK, NODE_NE_CLASS, RADIO_SECTOR_ID_FK, TECHNOLOGY_CODE, BAND_CODE, CELL_NAME, LOCAL_CELL_ID … | BAND_CODE→FREQUENCY_BAND, NODE_NE_CLASS→NETWORK_ELEMENT, RADIO_SECTOR_ID_FK→RADIO_SECTOR, RESOURCE_CLASS→RESOURCE | parent: FREQUENCY_BAND, NETWORK_ELEMENT, RADIO_SECTOR, RESOURCE (cascade); children: CELL_ANTENNA, CELL_RADIO_UNIT, RADIO_CELL_PLMN | RAN | Core | C | High | M8 RAN Inventory | GET /radio-cells (paged), GET/PUT /radio-cells/{id}, GET /network-elements/{id}/cells | ~3 cells per sector | Existing Cell 4G/5G detail screens map here |
| 68 | `RADIO_CELL_PLMN` | PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary. | ID | RADIO_CELL_ID_FK, PLMN_ID_FK, IS_PRIMARY, PRIMARY_FLAG | PLMN_ID_FK→PLMN, RADIO_CELL_ID_FK→RADIO_CELL | parent: PLMN, RADIO_CELL (cascade) | RAN | Core | C | Medium | M8 RAN Inventory | embedded in cell DTO | Per cell | RAN sharing |
| 69 | `RADIO_SECTOR` | Sector of a radio site grouping antennas and cells of all technologies. | ID | SITE_ID_FK, SECTOR_NO, NAME | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE | parent: RESOURCE (cascade), SITE; children: ANTENNA, RADIO_CELL | RAN | Core | C | High | M8 RAN Inventory | GET /sites/{id}/sectors (+CRUD) | Per RAN site | Groups antennas and cells |
| 70 | `RECON_EXCEPTION` | Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition. One exception may cover many records (bulk). | ID | CODE, STATE, DISCREPANCY_TYPE_ID_FK, DOMAIN_ID_FK, RECON_RULE_ID_FK, RECON_RESULT_ID_FK, SCAN_TARGET_ID_FK … | ASSIGNEE_ID_FK→USER, DISCREPANCY_TYPE_ID_FK→DISCREPANCY_TYPE, DISPOSITION_BY_FK→USER, DOMAIN_ID_FK→DOMAIN, OWNER_TEAM_ID_FK→TEAM, RECON_RESULT_ID_FK→RECON_RESULT, RECON_RULE_ID_FK→RECON_RULE, RESOURCE_ID_FK→RESOURCE, SCAN_TARGET_ID_FK→SCAN_TARGET | parent: USER, DISCREPANCY_TYPE, DOMAIN, TEAM, RECON_RESULT, RECON_RULE, RESOURCE, SCAN_TARGET | Cross | Core | C | High | M3 Reconciliation Operations (Exceptions) | GET /recon-exceptions (paged), GET /recon-exceptions/{id}, POST /recon-exceptions/{id}/actions/{assign \| dispose \| raise-workorder} | ~25 exceptions | Existing Exceptions screen; SLA; dispositions |
| 71 | `RECON_FIELD` | Comparable resource attribute shared by provenance, rules and reconciliation results. | CODE | CODE, LABEL, DATA_TYPE | RESOURCE_CLASS→RESOURCE_CLASS | parent: RESOURCE_CLASS; children: RECON_RESULT_FIELD, RECON_RULE_CONDITION, RESOURCE_FIELD_PROVENANCE | Cross | Reference | D | High | M4 Reconciliation Rules | GET /ref/recon-fields?resourceClass= | Seeded | Field pick-lists of the rule condition builder and provenance panel |
| 72 | `RECON_JOB` | Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a schedule, running a set of rules. | ID | CODE, DOMAIN_ID_FK, SOURCE_DESC, TARGET_DESC, SCAN_TYPE, CRON_EXPRESSION, SCHEDULE_STATE … | DOMAIN_ID_FK→DOMAIN | parent: DOMAIN; children: RECON_JOB_RULE, RECON_RUN | Cross | Integration | B | High | M3 Reconciliation Operations | GET /recon-jobs, GET/POST/PUT /recon-jobs/{id}, POST /recon-jobs/{id}/actions/run | ~8 jobs | Existing Reconciliation Jobs screen |
| 73 | `RECON_JOB_RULE` | Rules a reconciliation job runs (many-to-many; was ruleIds[]). | ID | RECON_JOB_ID_FK, RECON_RULE_ID_FK | RECON_JOB_ID_FK→RECON_JOB, RECON_RULE_ID_FK→RECON_RULE | parent: RECON_JOB (cascade), RECON_RULE | Cross | Integration | B | Medium | M3 Reconciliation Operations | embedded in recon-job DTO (ruleIds[]) | Per job | Job -> Rule link |
| 74 | `RECON_RESULT` | Outcome of one rule on one subject (any resource or a scan target) in one run. | ID | RECON_RUN_ID_FK, RECON_RULE_ID_FK, SCAN_TARGET_ID_FK, SUBJECT_KIND, SUBJECT_ID, OUTCOME, MATCH_RULE … | RECON_RULE_ID_FK→RECON_RULE, RECON_RUN_ID_FK→RECON_RUN, RESOURCE_ID_FK→RESOURCE, SCAN_TARGET_ID_FK→SCAN_TARGET | parent: RECON_RULE, RECON_RUN (cascade), RESOURCE, SCAN_TARGET; children: RECON_EXCEPTION, RECON_RESULT_FIELD | Cross | Integration | B | High | M3 Reconciliation Operations | GET /recon-results?run=&rule=&outcome= (paged) | Per run | Existing Reconciliation Results screen |
| 75 | `RECON_RESULT_FIELD` | One compared field: inventory value vs network value, evidence source and confidence (attribute drift detail). | ID | RECON_RESULT_ID_FK, FIELD_CODE, INVENTORY_VALUE, NETWORK_VALUE, EVIDENCE_SOURCE, IS_MATCH | FIELD_CODE→RECON_FIELD, RECON_RESULT_ID_FK→RECON_RESULT | parent: RECON_FIELD, RECON_RESULT (cascade) | Cross | Integration | B | High | M3 Reconciliation Operations (result drawer) | GET /recon-results/{id}/fields | Per result | Inventory vs network value |
| 76 | `RECON_RULE` | Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role. | ID | CODE, NAME, DESCRIPTION, DOMAIN_ID_FK, SOURCE_DESC, TARGET_DESC, RULE_TYPE … | APPROVER_ID_FK→USER, DOMAIN_ID_FK→DOMAIN, EXCEPTION_REVIEWER_TEAM_ID_FK→TEAM, EXECUTOR_ID_FK→USER, OWNER_ID_FK→USER, REVIEWER_ID_FK→USER | parent: USER, DOMAIN, TEAM; children: RECON_EXCEPTION, RECON_JOB_RULE, RECON_RESULT, RECON_RULE_CONDITION, RECON_RULE_EVENT, RECON_RUN_RULE | Cross | Core | C | High | M4 Reconciliation Rules | GET /recon-rules (paged), GET/POST/PUT /recon-rules/{id}, POST /recon-rules/{id}/actions/{submit \| approve \| reject \| request-changes \| activate \| suspend \| resume \| retire} | 14 rules | Existing Rules list / definition / details |
| 77 | `RECON_RULE_CONDITION` | Condition of a rule: source field, operator, target field or literal, joined by AND / OR. | ID | RECON_RULE_ID_FK, SEQUENCE_NO, CONNECTOR, SOURCE_FIELD_CODE, OPERATOR, TARGET_KIND, TARGET_FIELD_CODE … | RECON_RULE_ID_FK→RECON_RULE, SOURCE_FIELD_CODE→RECON_FIELD, TARGET_FIELD_CODE→RECON_FIELD | parent: RECON_RULE (cascade), RECON_FIELD | Cross | Core | C | High | M4 Reconciliation Rules | embedded in rule DTO (conditions[]) | Per rule | Condition builder rows |
| 78 | `RECON_RULE_EVENT` | Append-only (trigger-enforced) approval / lifecycle trail of a rule; the FK to RECON_RULE_TRANSITION rejects illegal moves. Records the real acting user. | ID | RECON_RULE_ID_FK, FROM_STATUS, TO_STATUS, ACTION, ACTOR_ID_FK, EVENT_TIME, NOTE | ACTOR_ID_FK→USER, ACTION→RECON_RULE_TRANSITION, RECON_RULE_ID_FK→RECON_RULE | parent: USER, RECON_RULE_TRANSITION, RECON_RULE | Cross | Core | E | High | M4 Reconciliation Rules (Activity tab) | GET /recon-rules/{id}/events (read-only; created by actions) | Per rule | Append-only approval trail |
| 79 | `RECON_RULE_TRANSITION` | Allowed rule lifecycle moves and the action that makes them. | ID | FROM_STATUS, TO_STATUS, ACTION, ACTOR_ROLE | — | root; children: RECON_RULE_EVENT | Cross | Reference | D | High | M4 Reconciliation Rules | GET /ref/rule-transitions | 12 seeded rows | Drives which lifecycle buttons are visible per status and role |
| 80 | `RECON_RUN` | One execution of a reconciliation job (a reconciliation cycle). Scanned / drifted / auto-resolved figures are derived from results and exceptions. | ID | RECON_JOB_ID_FK, SCAN_RUN_ID_FK, STATUS, STARTED_TIME, ENDED_TIME | RECON_JOB_ID_FK→RECON_JOB, SCAN_RUN_ID_FK→SCAN_RUN | parent: RECON_JOB, SCAN_RUN; children: RECON_RESULT, RECON_RUN_RULE | Cross | Integration | B | High | M3 Reconciliation Operations | GET /recon-jobs/{id}/runs, GET /recon-runs/{id} | Last runs per job | Reconciliation cycles timeline on Insights |
| 81 | `RECON_RUN_RULE` | Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duration). | ID | RECON_RUN_ID_FK, RECON_RULE_ID_FK, MATCHED_COUNT, EXCEPTION_COUNT, DURATION_MS | RECON_RULE_ID_FK→RECON_RULE, RECON_RUN_ID_FK→RECON_RUN | parent: RECON_RULE, RECON_RUN (cascade) | Cross | Integration | B | High | M4 Reconciliation Rules (Execution tab) | GET /recon-rules/{id}/executions | Per rule | matched / exceptions / duration |
| 82 | `RECON_STATE_MAP` | Mapping of reconciliation outcomes to resource, target and exception states. | OUTCOME | OUTCOME, RECON_STATE, TARGET_OUTCOME, EXCEPTION_STATE | — | root | Cross | Reference | D | Low | M3 Reconciliation Operations | GET /ref/recon-state-map | 8 seeded rows | Outcome -> resource/target/exception state; UI shows the mapped labels |
| 83 | `RELATIONSHIP_RULE` | Allowed relationship triples between resource classes. | ID | RELATIONSHIP_TYPE, FROM_CLASS, TO_CLASS | FROM_CLASS→RESOURCE_CLASS, RELATIONSHIP_TYPE→RELATIONSHIP_TYPE, TO_CLASS→RESOURCE_CLASS | parent: RESOURCE_CLASS, RELATIONSHIP_TYPE; children: RESOURCE_RELATIONSHIP | Cross | Reference | D | Low | M13 Relationships & Impact | GET /ref/relationship-rules | Seeded | Validates from/to class pairs in the relationship editor |
| 84 | `RELATIONSHIP_TYPE` | Kind of cross-domain resource relationship. | CODE | CODE, NAME, INVERSE_NAME, IS_IMPACTING, IS_ACYCLIC, IS_ORDERED | — | root; children: RELATIONSHIP_RULE | Cross | Reference | D | Medium | M13 Relationships & Impact | GET /ref/relationship-types | Seeded | IS_IMPACTING drives impact analysis |
| 85 | `REPORT_DEFINITION` | Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ...). | ID | CODE, MODULE, NAME, QUESTION, AUDIENCE, CADENCE, CRON_EXPRESSION … | — | root; children: REPORT_RUN | Cross | Core | C | High | M16 Reports | GET /reports/definitions, GET/POST/PUT | Existing report catalogue | Existing Reports screens (Discovery + Inventory) |
| 86 | `REPORT_RUN` | Generated report (production Reports grid). Successor of GENERATED_REPORTS. | ID | REPORT_DEFINITION_ID_FK, NAME, REPORT_TYPE, GENERATED_TYPE, FORMAT, STATUS, SNAPSHOT_REF … | REPORT_DEFINITION_ID_FK→REPORT_DEFINITION | parent: REPORT_DEFINITION | Cross | Integration | B | High | M16 Reports | GET /reports/runs, POST /reports/definitions/{id}/actions/run, GET /reports/runs/{id}/file | Recent runs | Generated by the reporting service |
| 87 | `RESOURCE` | Supertype row of every inventory object. | ID |  | RESOURCE_CLASS→RESOURCE_CLASS | parent: RESOURCE_CLASS; children: ANTENNA, CAPEX_LINE_RESOURCE, CLOUD_CLUSTER, EQUIPMENT_COMPONENT, EXTERNAL_RESOURCE, IP_SUBNET (+19) | Cross | Core | E | Low | M13 Relationships & Impact (shared) | Not exposed directly; resourceId appears in every subtype DTO | Implicit ids | Supertype row; UI only needs resourceId + resourceClass for cross-links |
| 88 | `RESOURCE_ASSET` | Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by resource. | ID | ASSET_TAG, PO_NUMBER, PROJECT_NUMBER, PURCHASE_DATE, PURCHASE_COST, CURRENCY_CODE, OWNERSHIP … | RESOURCE_ID_FK→RESOURCE | parent: RESOURCE (cascade) | Cross | Core | C | Medium | M15 Finance (Capex/Opex) + resource detail tab | GET/PUT /resources/{id}/asset | Per resource | Asset tag, PO, warranty, AMC |
| 89 | `RESOURCE_ATTRIBUTE` | Value of an extensible attribute on one resource, typed by its definition. | ID | ATTRIBUTE_DEFINITION_ID_FK, DATA_TYPE, VALUE_STRING, VALUE_NUMBER, VALUE_BOOLEAN, VALUE_DATE | DATA_TYPE→ATTRIBUTE_DEFINITION, RESOURCE_CLASS→RESOURCE | parent: ATTRIBUTE_DEFINITION, RESOURCE (cascade) | Cross | Core | C | Low | M6 Network Elements (detail tab) | GET/PUT /resources/{id}/attributes | Few rows | Typed custom attributes |
| 90 | `RESOURCE_CLASS` | Class of every RESOURCE row with inventory category and layer. | CODE | CODE, NAME, INVENTORY_CATEGORY, LAYER, SUBTYPE_TABLE | — | root; children: ATTRIBUTE_DEFINITION, RECON_FIELD, RELATIONSHIP_RULE, RESOURCE | Cross | Reference | D | Medium | Shared: Reference API | GET /ref/resource-classes | 21 seeded rows | INVENTORY_CATEGORY + LAYER drive the Physical/Passive/Logical grouping |
| 91 | `RESOURCE_EXTERNAL_REF` | Id of an inventory resource in another system; one per system, at most one system of record. | ID | EXTERNAL_SYSTEM_ID_FK, EXTERNAL_ID, IS_SYSTEM_OF_RECORD, SOR_FLAG, SYNC_STATUS, LAST_SYNC_TIME | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, RESOURCE_ID_FK→RESOURCE | parent: EXTERNAL_SYSTEM, RESOURCE (cascade) | Cross | Integration | B | Medium | M17 External Systems & Integration | GET /resources/{id}/external-refs | Per resource | System-of-record flag; sync status |
| 92 | `RESOURCE_FIELD_PROVENANCE` | Per-field provenance of any resource's golden record. | ID | FIELD_CODE, FIELD_VALUE, SOURCE, EXTERNAL_SYSTEM_ID_FK, SOURCE_REF, OBSERVED_TIME, IS_CONFIRMED | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, FIELD_CODE→RECON_FIELD, RESOURCE_ID_FK→RESOURCE | parent: EXTERNAL_SYSTEM, RECON_FIELD, RESOURCE (cascade) | Cross | Integration | B | High | M6 Network Elements (Identity & provenance table) | GET /resources/{id}/provenance | Per resource field | Existing Node view "Identity and provenance" table maps here |
| 93 | `RESOURCE_RELATIONSHIP` | Typed dependency between two resources that no explicit FK models; FROM depends on TO. | ID | RELATIONSHIP_TYPE, FROM_RESOURCE_ID_FK, FROM_RESOURCE_CLASS, TO_RESOURCE_ID_FK, TO_RESOURCE_CLASS, SEQUENCE_NO, RECORD_SOURCE … | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, FROM_RESOURCE_CLASS→RESOURCE, TO_RESOURCE_CLASS→RELATIONSHIP_RULE, TO_RESOURCE_CLASS→RESOURCE | parent: EXTERNAL_SYSTEM, RESOURCE (cascade), RELATIONSHIP_RULE | Cross | Core | C | Medium | M13 Relationships & Impact | GET /resources/{id}/relationships, POST/DELETE | Graph of a few dozen edges | Impact analysis, "depends on" chains |
| 94 | `RESOURCE_TECHNOLOGY` | Technologies a resource supports; replaces single-valued technology columns. | ID | TECHNOLOGY_ID_FK, NR_MODE | RESOURCE_ID_FK→RESOURCE, TECHNOLOGY_ID_FK→TECHNOLOGY | parent: RESOURCE (cascade), TECHNOLOGY | Cross | Core | C | Medium | M6 Network Elements | GET/PUT /resources/{id}/technologies | Per resource | Multi-valued technology tags (2G/3G/4G/5G, NR_MODE) |
| 95 | `ROOM` | Room / hall on a floor (equipment room, battery room, MDF). | ID | SITE_ID_FK, FLOOR_ID_FK, NAME, ROOM_TYPE | FLOOR_ID_FK→FLOOR | parent: FLOOR (cascade); children: RACK | Facility | Core | C | Medium | M5 Location & Facility | GET /sites/{id}/rooms (+CRUD) | Per site | Facility tab |
| 96 | `SCAN_JOB` | Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE). | ID | CODE, DOMAIN_ID_FK, SOURCE_KIND, COLLECTOR_ID_FK, CREDENTIAL_PROFILE_ID_FK, EXTERNAL_SYSTEM_ID_FK, OPERATIONAL_AREA_ID_FK … | COLLECTOR_ID_FK→COLLECTOR, CREDENTIAL_PROFILE_ID_FK→CREDENTIAL_PROFILE, DOMAIN_ID_FK→DOMAIN, EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA | parent: COLLECTOR, CREDENTIAL_PROFILE, DOMAIN, EXTERNAL_SYSTEM, OPERATIONAL_AREA; children: SCAN_JOB_SCOPE, SCAN_RUN, SCAN_TARGET | Cross | Integration | B | High | M2 Scan Jobs & Targets | GET /scan-jobs (paged), GET /scan-jobs/{id}, POST, PUT, POST /scan-jobs/{id}/actions/{run \| hold \| resume} | 12-16 jobs across domains | JOB-like integration entity |
| 97 | `SCAN_JOB_SCOPE` | One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF set. | ID | SCAN_JOB_ID_FK, SCOPE_KIND, SCOPE_VALUE, SITE_ID_FK | SCAN_JOB_ID_FK→SCAN_JOB, SITE_ID_FK→SITE | parent: SCAN_JOB (cascade), SITE | Cross | Integration | B | Medium | M2 Scan Jobs & Targets | embedded in scan-job DTO (scopes[]) | Per job | CIDR / seed / site / NF set |
| 98 | `SCAN_RUN` | One execution of a scan job. Target counts are derived from SCAN_RUN_TARGET (V_SCAN_RUN_SUMMARY). Successor of DISCOVERY_RUN, whose key was a counter named DISCOVERY_COUNT. | ID | SCAN_JOB_ID_FK, RUN_NO, TRIGGER_SOURCE, STATUS, STARTED_TIME, ENDED_TIME, DURATION_MS | SCAN_JOB_ID_FK→SCAN_JOB | parent: SCAN_JOB; children: RECON_RUN, SCAN_RUN_TARGET | Cross | Integration | B | High | M2 Scan Jobs & Targets | GET /scan-jobs/{id}/runs, GET /scan-runs/{id} | Last 5 runs per job | Written by collector |
| 99 | `SCAN_RUN_TARGET` | Result of one target in one run: status, outcome, failure reason, identity match (rule + confidence). | ID | SCAN_RUN_ID_FK, SCAN_TARGET_ID_FK, STATUS, OUTCOME, FAILURE_REASON, FAILURE_STAGE, MATCHED_NE_ID_FK … | MATCHED_NE_ID_FK→NETWORK_ELEMENT, SCAN_RUN_ID_FK→SCAN_RUN, SCAN_TARGET_ID_FK→SCAN_TARGET | parent: NETWORK_ELEMENT, SCAN_RUN (cascade), SCAN_TARGET; children: SCAN_STEP_RESULT | Cross | Integration | B | High | M2 Scan Jobs & Targets | GET /scan-runs/{id}/targets | Per run | Outcome, failure reason, identity match |
| 100 | `SCAN_STEP_PAYLOAD` | Raw request / response of a step, AES-encrypted (device output can carry configuration and customer data). Split out so hot tables stay narrow; purged by retention. | ID | SCAN_STEP_RESULT_ID_FK, KIND, CONTENT_ENC, CONTENT_IV, CONTENT_BYTES, CONTENT_SHA256, ENCRYPTION_KEY_REF … | SCAN_STEP_RESULT_ID_FK→SCAN_STEP_RESULT | parent: SCAN_STEP_RESULT (cascade) | Cross | Integration | E | Low | M2 (transcript "view raw" only if permitted) | GET /scan-step-results/{id}/payload (permissioned, decrypted server side) | Not mocked (or a stub string) | Encrypted blob; retention purge; never listed |
| 101 | `SCAN_STEP_RESULT` | One collector step for one target in one run (the transcript line): state, timing, bytes, what it wrote. | ID | SCAN_RUN_TARGET_ID_FK, DISCOVERY_STEP_DEF_ID_FK, STATE, STARTED_TIME, DURATION_MS, RESPONSE_BYTES, WROTE_SUMMARY … | DISCOVERY_STEP_DEF_ID_FK→DISCOVERY_STEP_DEF, SCAN_RUN_TARGET_ID_FK→SCAN_RUN_TARGET | parent: DISCOVERY_STEP_DEF, SCAN_RUN_TARGET (cascade); children: SCAN_STEP_PAYLOAD | Cross | Integration | B | High | M2 Scan Jobs & Targets (Target transcript) | GET /scan-run-targets/{id}/steps | Per target transcript | Existing Target transcript screen |
| 102 | `SCAN_TARGET` | Address a job polls (gateway IP). Identity is the IP, not the hostname (109 targets have none). Carries the latest outcome as a cache. | ID | SCAN_JOB_ID_FK, IP_ADDRESS, EXTERNAL_TARGET_ID, HOST_NAME, NETWORK_ELEMENT_ID_FK, OBSERVED_VENDOR_ID_FK, OBSERVED_MODEL … | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, OBSERVED_VENDOR_ID_FK→VENDOR, SCAN_JOB_ID_FK→SCAN_JOB | parent: NETWORK_ELEMENT, VENDOR, SCAN_JOB; children: RECON_EXCEPTION, RECON_RESULT, SCAN_RUN_TARGET | Cross | Integration | B | High | M2 Scan Jobs & Targets | GET /scan-targets (paged), GET /scan-targets/{id} | ~30 targets | Existing Scan targets screen; latest outcome cached |
| 103 | `SERVICE_ENDPOINT` | Termination of a service on a device interface (PE for L3VPN; source and destination for point-to-point services). | ID | SERVICE_INSTANCE_ID_FK, ENDPOINT_ROLE, NETWORK_ELEMENT_ID_FK, PORT_ID_FK, IP_ADDRESS, ADMIN_STATUS, OPER_STATUS | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PORT_ID_FK→PORT, SERVICE_INSTANCE_ID_FK→SERVICE_INSTANCE | parent: NETWORK_ELEMENT, PORT, SERVICE_INSTANCE (cascade) | Cross | Core | C | High | M12 Services | embedded in service DTO (endpoints[]) | Per service | PE / A-Z endpoints |
| 104 | `SERVICE_INSTANCE` | Network service instance, unique per type and name among active services. | ID | SERVICE_TYPE, DOMAIN_ID_FK, NAME, STATUS, REFERENCE_KIND, REFERENCE_VALUE, CUSTOMER_REF … | DOMAIN_ID_FK→DOMAIN, RESOURCE_CLASS→RESOURCE, SERVICE_TYPE→SERVICE_TYPE | parent: DOMAIN, RESOURCE (cascade), SERVICE_TYPE; children: IP_SUBNET, SERVICE_ENDPOINT | Cross | Core | C | High | M12 Services | GET /services?type=&domain= (paged), GET/POST/PUT /services/{id} | ~40 services | Existing Services screen |
| 105 | `SERVICE_TYPE` | Network service type catalog. | ID | CODE, NAME, DOMAIN_ID_FK | DOMAIN_ID_FK→DOMAIN | parent: DOMAIN; children: SERVICE_INSTANCE | Cross | Reference | D | Medium | M12 Services | GET /ref/service-types | 12 seeded rows | Each type is bound to a domain |
| 106 | `SITE` | A location that hosts equipment (central office, POP, tower, data centre). Geography is held once (lowest level only); lat/long once. | ID | CODE, NAME, SITE_TYPE_ID_FK, CATEGORY, STATUS, PARENT_SITE_ID_FK, PRIMARY_GEO_L4_ID_FK … | OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA, PARENT_SITE_ID_FK→SITE, PRIMARY_GEO_L4_ID_FK→PRIMARY_GEO_L4, RESOURCE_CLASS→RESOURCE, SITE_TYPE_ID_FK→SITE_TYPE | parent: OPERATIONAL_AREA, self (PARENT_SITE_ID_FK), PRIMARY_GEO_L4, RESOURCE (cascade), SITE_TYPE; children: ANTENNA, CAPEX_PLAN, CLOUD_CLUSTER, FLOOR, IP_SUBNET, NETWORK_ELEMENT (+10) | Facility | Core | C | High | M5 Location & Facility | GET/POST/PUT /sites, GET /sites/{id} | ~60 sites | Existing Location list + Site details |
| 107 | `SITE_CONTACT` | Site contact person (from NE_DETAIL). Phone and email are personal data: stored AES-encrypted. | ID | SITE_ID_FK, CONTACT_ROLE, CONTACT_NAME, PHONE_ENC, PHONE_IV, EMAIL_ENC, EMAIL_IV … | SITE_ID_FK→SITE | parent: SITE (cascade) | Facility | Core | C | Medium | M5 Location & Facility | GET/POST/PUT /sites/{id}/contacts | Per site | PII encrypted at rest; API returns decrypted only with permission |
| 108 | `SITE_ISSUE` | Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, Civil, Regulatory, Supply Chain, Commissioning). | ID | SITE_ID_FK, ISSUE_KIND, CATEGORY, REASON, RAISED_TIME, RESOLVED_TIME, OWNER_TEAM_ID_FK | OWNER_TEAM_ID_FK→TEAM, SITE_ID_FK→SITE | parent: TEAM, SITE (cascade) | Facility | Core | C | High | M5 Location & Facility | GET/POST/PUT /sites/{id}/issues | Per site | Rollout blockers / risks on Site details |
| 109 | `SITE_TYPE` | Site type (Central office, Regional hub, Edge, Tower, Data centre ...). | ID | CODE, NAME | — | root; children: SITE | Facility | Reference | D | Medium | M5 Location & Facility | GET /ref/site-types | Small list | Not seeded in dump; values must be confirmed |
| 110 | `TEAM` | Owning team or queue for exceptions and rules (e.g. Architecture, NOC Transport); "Unassigned" is the absence of a team. | ID | CODE, NAME | — | root; children: RECON_EXCEPTION, RECON_RULE, SITE_ISSUE, TEAM_MEMBER | Cross | Core | C | Medium | M18 Administration & Catalogs | GET/POST/PUT /teams | Team list | Owner queue for exceptions, rules, site issues |
| 111 | `TEAM_MEMBER` | Membership of a user in a team. | ID | TEAM_ID_FK, USER_ID_FK, TEAM_ROLE | TEAM_ID_FK→TEAM, USER_ID_FK→USER | parent: TEAM (cascade), USER | Cross | Core | C | Low | M18 Administration & Catalogs | GET /teams/{id}/members, POST/DELETE | Membership list | Needs validation: is team admin done here or in IAM? |
| 112 | `TECHNOLOGY` | Network / radio access technology with family and generation; the one place generation is recorded. | ID | CODE, NAME, FAMILY, GENERATION, IS_ACTIVE | — | root; children: ATTRIBUTE_DEFINITION, FREQUENCY_BAND, RESOURCE_TECHNOLOGY | Cross | Reference | D | Medium | Shared: Reference API | GET /ref/technologies | Seeded | GSM/UMTS/LTE/NR/… with generation |
| 113 | `TENANT` | Platform tenant (the operator). Every tenant-owned row references it through CUSTOMER_ID. | ID | CODE, NAME | — | root | Cross | Core | E | Low | M18 Administration & Catalogs | Implicit (tenant from session); no CRUD | Single tenant constant | Confirmed: every tenant row carries CUSTOMER_ID; UI never selects a tenant |
| 114 | `USER` | The single user table for the platform and every integration. No email or other contact PII is stored; IAM owns it. | ID | USERNAME, DISPLAY_NAME, USER_TYPE, STATUS, DISABLED_TIME | — | root; children: CAPEX_PLAN, NETWORK_ELEMENT, OPEX_PLAN, POWER_UNIT_TEST, RECON_EXCEPTION, RECON_RULE (+3) | Cross | Core | E | Medium | M18 Administration & Catalogs | GET /users (picker), GET /users/{id} | MOCK_USERS list | No PII (IAM owns it). Used by Rules roles, exception assignee, capex/opex owner |
| 115 | `USER_IDENTITY` | Identity of a USER in one external system; one USER, many identities. | ID | USER_ID_FK, EXTERNAL_SYSTEM_ID_FK, EXTERNAL_USER_ID, EXTERNAL_USERNAME, IS_AUTH_SOURCE, AUTH_SOURCE_FLAG, LAST_SYNC_TIME | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, USER_ID_FK→USER | parent: EXTERNAL_SYSTEM, USER (cascade) | Cross | Integration | B | Low | M17 External Systems & Integration | GET /users/{id}/identities (read-only) | Optional | IAM / SSO sync owns writes |
| 116 | `VENDOR` | (DDL not in dump) | ID | inferred | — | children: ANTENNA, ATTRIBUTE_DEFINITION, CAPEX_LINE, EQUIPMENT_COMPONENT, EXTERNAL_SYSTEM, NETWORK_ELEMENT, PASSIVE_ASSET, POWER_UNIT, PRODUCT_MODEL, SCAN_TARGET | Cross | Reference | D | High | Shared: Reference API | GET /ref/vendors | Vendor list | DDL absent from the dump; referenced by 13 FKs. Columns inferred: ID SMALLINT, CODE, NAME |
| 117 | `VLAN` | (DDL not in dump) | ID | inferred | CUSTOMER_ID→TENANT | children: PORT_VLAN | Transport/IP | Core | C | Medium | M11 IP & Logical | GET /network-elements/{id}/vlans | Per NE | DDL absent from the dump; referenced by PORT_VLAN (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, ID). Columns inferred: VLAN_ID, NAME |
| 118 | `VRF` | (DDL not in dump) | ID | inferred | CUSTOMER_ID→TENANT | children: PORT | IP/MPLS | Core | C | Medium | M11 IP & Logical | GET /network-elements/{id}/vrfs | Per router | DDL absent from the dump; referenced by PORT (CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, ID). Columns inferred: NAME, ROUTE_DISTINGUISHER |

---

## 4. Table categorization

A table can serve more than one purpose; the primary category is the one that decides **who writes it**. Counts: C 63 · D 28 · B 21 · E 6 = 118.

### A. UI-facing tables (directly edited through screens)

These are the category-C tables whose full lifecycle (create, edit, retire) happens in this product's UI. They are listed under C below and marked "UI CRUD" in the matrix of section 12. The principal ones: `SITE`, `SITE_CONTACT`, `SITE_ISSUE`, `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`, `POWER_UNIT`, `POWER_UNIT_TEST`, `NETWORK_ELEMENT` (+ 11 `NE_*_DETAIL`), `NE_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER`, `EQUIPMENT_COMPONENT`, `PORT`, `PASSIVE_ASSET`, `PATCH_CORD`, `RADIO_SECTOR`, `RADIO_CELL`, `ANTENNA`, `PLMN`, `NETWORK_SLICE`, `LINK` (+ attrs), `IP_SUBNET`, `VLAN`, `VRF`, `SERVICE_INSTANCE`, `SERVICE_ENDPOINT`, `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_RELATIONSHIP`, `RESOURCE_TECHNOLOGY`, `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_EXCEPTION` (actions only), `CAPEX_*`, `OPEX_*`, `REPORT_DEFINITION`, `TEAM`, `TEAM_MEMBER`, `PRODUCT_MODEL_POLICY`, `ATTRIBUTE_DEFINITION`.

**Important nuance [Inferred]:** many of these rows are *also* written by discovery (`RECORD_SOURCE = DISCOVERED`). The UI edits the golden record; the API must preserve `RECORD_SOURCE` and update `RESOURCE_FIELD_PROVENANCE` for the fields a user overrides. Whether a manual edit of a discovered field is allowed at all is a **[Needs validation]** business rule.

### B. Integration-service-owned tables (JOB-like and result tables) — 21

| Table | Engine | UI may |
|---|---|---|
| `SCAN_JOB`, `SCAN_JOB_SCOPE` | Discovery scheduler | Create / edit definition; trigger `run`, `hold`, `resume` actions |
| `SCAN_TARGET` | Discovery | Read; enable / disable a target |
| `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD` | Collector | Read only (transcript, payload behind permission) |
| `COLLECTOR` | Collector fleet | Read health; register / retire **[Needs validation]** |
| `CREDENTIAL_PROFILE` | Discovery + vault | Create / edit reference (no secret) |
| `RECON_JOB`, `RECON_JOB_RULE` | Reconciliation scheduler | Create / edit definition; trigger `run` |
| `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD` | Reconciliation engine | Read only |
| `REPORT_RUN` | Reporting service | Trigger `run`, download file, read status |
| `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_EXTERNAL_REF` | Discovery / sync | Read; manual confirm of a field **[Needs validation]** |
| `NE_HEALTH` | Collector (ICMP/NTP) | Read only |
| `EXTERNAL_SYSTEM`, `EXTERNAL_RESOURCE` | Integration layer | Read; system registration CRUD **[Needs validation]** |
| `USER_IDENTITY` | IAM sync | Read only |
| `DOMAIN_TRUST_SNAPSHOT` | Nightly aggregation | Read only |

### C. Core business domain tables — 63

Grouped by aggregate: Location & facility (10), Network elements & hardware (21 incl. details, components, ports, movement, VLAN/VRF), RAN (7), Passive (2), Connectivity (3), Logical/IP (1), Services (2), Resource satellites (5), Reconciliation business objects (4: `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_EXCEPTION`, `TEAM`+`TEAM_MEMBER`), Finance (6), Reporting (1), Catalog policy (2: `PRODUCT_MODEL_POLICY`, `PLMN`). See section 3 for the per-table assignment.

### D. Reference / lookup tables — 28

Global (no `CUSTOMER_ID`, seeded): `DOMAIN`, `NE_CLASS`, `NE_CLASS_DOMAIN`, `RESOURCE_CLASS`, `TECHNOLOGY`, `FREQUENCY_BAND`, `LINK_LAYER`, `SERVICE_TYPE`, `SITE_TYPE`, `PASSIVE_ASSET_TYPE`, `NETWORK_FUNCTION_TYPE`, `DISCOVERY_STEP_DEF`, `DISCREPANCY_TYPE`, `RECON_FIELD`, `RECON_STATE_MAP`, `RECON_RULE_TRANSITION`, `NE_STOCK_TRANSITION`, `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE`, `EXTERNAL_OBJECT_TYPE`, `PRODUCT_MODEL`, `VENDOR`.
Tenant-scoped reference data (maintained by an admin, read by everyone): `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA`, `ATTRIBUTE_DEFINITION`.

All of these are served by one **Reference API** (`GET /api/ref/...`), cached client-side for the session.

### E. Audit / technical tables — 6

`TENANT` (implicit from session), `RESOURCE` (supertype, never listed on its own), `SCAN_STEP_PAYLOAD` (encrypted blob, retention-purged), `RECON_RULE_EVENT` (append-only trail, surfaced as the rule Activity tab), `DOMAIN_TRUST_SNAPSHOT` (derived series), and the append-only `NE_MOVEMENT` is kept in C because users create it through the "Move" action.

**Note:** the separate Audit module's tables (`*_AUD`, `REVINFO`) are not in this schema at all [Confirmed]; nothing in the UI should expect row history from this database.

---

## 5. Cluster / relationship analysis

Sixteen clusters emerge from FK adjacency. Each cluster is a candidate module boundary; section 6 merges some of them.

| # | Cluster | Tables | Root entity | Cross-cluster FKs (what the UI must link to) |
|---|---|---|---|---|
| 1 | Platform & tenancy | `TENANT`, `USER`, `USER_IDENTITY`, `TEAM`, `TEAM_MEMBER` | `USER` | referenced by rules, exceptions, capex/opex, site issues, power tests |
| 2 | Global catalogs | 22 seeded tables (section 4 D) | — | referenced by every cluster |
| 3 | Geography & organisation | `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA`, `PLMN` | `OPERATIONAL_AREA` | `SITE`, `SCAN_JOB`, `CREDENTIAL_PROFILE` |
| 4 | Resource supertype & satellites | `RESOURCE`, `RESOURCE_CLASS`, `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_EXTERNAL_REF`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_RELATIONSHIP`, `RESOURCE_TECHNOLOGY`, `ATTRIBUTE_DEFINITION` | `RESOURCE` | every subtype cluster (5–12) |
| 5 | Location & facility | `SITE`, `SITE_TYPE`, `SITE_CONTACT`, `SITE_ISSUE`, `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`, `POWER_UNIT`, `POWER_UNIT_TEST` | `SITE` | NE (rack position), passive, sectors, capex/opex, scan scope |
| 6 | Network elements & hardware | `NETWORK_ELEMENT`, 11 `NE_*_DETAIL`, `NE_VIRTUAL_INSTANCE`, `NE_HEALTH`, `NE_MOVEMENT`, `NE_STOCK_TRANSITION`, `EQUIPMENT_COMPONENT`, `PORT`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `VLAN`, `VRF`, `CLOUD_CLUSTER` | `NETWORK_ELEMENT` | links, services, cells, scan targets, recon results |
| 7 | RAN radio layer | `RADIO_SECTOR`, `RADIO_CELL`, `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `ANTENNA`, `NETWORK_SLICE`, `FREQUENCY_BAND` | `RADIO_CELL` | NE (node, RU, controller), site, passive mount, PLMN |
| 8 | Passive infrastructure | `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD` (+ ports on passive assets) | `PASSIVE_ASSET` | site, rack, port, antenna mount, product model |
| 9 | Connectivity | `LINK`, `LINK_LAYER`, `LINK_PROTOCOL_ATTR`, `LINK_MICROWAVE_ATTR` | `LINK` | NE A/Z, PORT A/Z |
| 10 | Logical / IP | `IP_SUBNET`, `VRF`, `VLAN`, `PORT_IP_ADDRESS`, `PORT_VLAN` | `IP_SUBNET` | service (L3VPN context), site, port |
| 11 | Services | `SERVICE_INSTANCE`, `SERVICE_ENDPOINT`, `SERVICE_TYPE`, `NETWORK_SLICE` | `SERVICE_INSTANCE` | NE, port, IP subnet, PLMN |
| 12 | External systems | `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE` | `EXTERNAL_SYSTEM` | resource external refs, provenance, scan jobs, relationships, user identity |
| 13 | Discovery execution | `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF`, `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD` | `SCAN_JOB` | NE (matched), domain, operational area, external system |
| 14 | Reconciliation | `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_RULE_EVENT`, `RECON_RULE_TRANSITION`, `RECON_FIELD`, `RECON_JOB`, `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD`, `RECON_EXCEPTION`, `RECON_STATE_MAP`, `DISCREPANCY_TYPE` | `RECON_RULE` / `RECON_EXCEPTION` | scan run, scan target, resource, user, team |
| 15 | Finance | `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL` | `CAPEX_PLAN` / `OPEX_PLAN` | site, user (owner), vendor, resource |
| 16 | Reporting & KPIs | `REPORT_DEFINITION`, `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT` | `REPORT_DEFINITION` | domain |

### 5.1 Cascade paths that matter for UI actions [Confirmed]

- Deleting a `RESOURCE` cascades to its subtype row (`NETWORK_ELEMENT`, `SITE`, `LINK` …) and every satellite. The API should **never** hard-delete a resource from a UI action; use soft delete (`IS_DELETED`) or `RECORD_STATE = INACTIVE`.
- Deleting a `SITE` cascades to `FLOOR` → `ROOM`, `POWER_FEED`, `SITE_CONTACT`, `SITE_ISSUE` but **not** to `RACK`, `NETWORK_ELEMENT`, `PASSIVE_ASSET` (restrict). A site with equipment cannot be removed; the UI should show why.
- Deleting a `SCAN_RUN` cascades through targets → steps → payloads (retention purge path). `RECON_RUN` cascades to results and result fields.
- Deleting a `RECON_RULE` cascades conditions only; `RECON_RULE_EVENT` and `RECON_EXCEPTION` restrict. Rules are retired, not deleted.
- `PORT` deletion cascades `PORT_IP_ADDRESS`, `PORT_VLAN`; `PATCH_CORD` and `LINK` restrict.

### 5.2 Many-to-many and polymorphic patterns [Confirmed]

| Pattern | Tables | UI consequence |
|---|---|---|
| Job ↔ Rule | `RECON_JOB_RULE` | Rule chips on Job drawer; job list on Rule details |
| Cell ↔ Antenna, Cell ↔ Radio unit, Cell ↔ PLMN | `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `RADIO_CELL_PLMN` | Cell detail shows three sub-lists |
| Resource ↔ Technology | `RESOURCE_TECHNOLOGY` | Multi-select tag editor |
| Resource ↔ Resource (typed) | `RESOURCE_RELATIONSHIP` + `RELATIONSHIP_RULE` | Graph / impact view; rule table validates the editor |
| Resource ↔ External system | `RESOURCE_EXTERNAL_REF` | "Also known in …" panel |
| Polymorphic subject | `RECON_RESULT.RESOURCE_ID_FK` xor `SCAN_TARGET_ID_FK` (generated `SUBJECT_KIND`) | Result rows link either to an inventory resource or to a scan target |
| Polymorphic port owner | `PORT.NETWORK_ELEMENT_ID_FK` xor `PASSIVE_ASSET_ID_FK` | One port DTO, two parent kinds |


---

## 6. Proposed UI modules

Eighteen modules. "Existing screens" refers to the current `src/routes.ts` keys. Complexity is S/M/L/XL for frontend effort including mock service and typed contracts.

### M1 · Discovery Insights

- **Purpose:** executive and operational dashboard for discovery and reconciliation health per domain.
- **Tables:** `DOMAIN_TRUST_SNAPSHOT` (trend), `COLLECTOR` (health), aggregates over `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_TARGET`, `RECON_RUN`, `RECON_EXCEPTION`, `DISCREPANCY_TYPE`, `NETWORK_ELEMENT` (counts by domain / region / class / recon state).
- **Primary entity:** none (read models).
- **Screens:** Insights (existing `insights`), Devices by region (`regiondevices`), Discovered devices (`discovereddevices`), Domain devices (`domaindevices`, `subdomaindevices`), Discrepancies (`discrepancydetails`).
- **Navigation:** Discovery & reconciliation › Insights.
- **APIs:** `GET /api/insights/summary`, `GET /api/insights/trust-trend`, `GET /api/insights/domains`, `GET /api/insights/regions`, `GET /api/insights/collectors`, `GET /api/insights/failures`, `GET /api/insights/discrepancies`, `GET /api/insights/recon-cycles`.
- **Mock API needs:** the existing `src/data/discoveryOverview.ts` arrays re-keyed to the 9 DB domains.
- **Integration dependency:** all figures are derived from integration-owned tables; the read model is computed server side.
- **Future real API:** aggregation endpoints on the inventory service (SQL views or a query service).
- **Dependencies:** Reference API (domains, operational areas).
- **Complexity:** M (screen exists; contract + taxonomy work).

### M2 · Scan Jobs & Targets (Discovery execution)

- **Purpose:** define discovery jobs, watch runs, inspect target outcomes and per-step transcripts.
- **Tables:** `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD` (permissioned), `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF`.
- **Primary entity:** `SCAN_JOB`.
- **Screens:** Scan jobs (`jobs`, legacy), Scan targets (`targets`, legacy), Target transcript (`target`, legacy); new: Job detail drawer with scopes and last runs, Collector & credential profile panels.
- **Navigation:** Discovery & reconciliation › Scan jobs · Scan targets.
- **APIs:** `GET/POST/PUT /api/scan-jobs`, `POST /api/scan-jobs/{id}/actions/{run|hold|resume}`, `GET /api/scan-jobs/{id}/runs`, `GET /api/scan-runs/{id}/targets`, `GET /api/scan-targets`, `GET /api/scan-run-targets/{id}/steps`, `GET /api/collectors`, `GET/POST/PUT /api/credential-profiles`.
- **Mock API needs:** jobs across all 9 domains, targets with the six failure reasons, one full transcript per domain family (steps from `DISCOVERY_STEP_DEF`).
- **Integration dependency:** scheduler and collector own runs; the UI's writes are limited to job definitions and actions.
- **Future real API:** Discovery service.
- **Dependencies:** Reference API, M5 (site scope picker), M18 (operational areas).
- **Complexity:** L (legacy screens to port + action semantics).

### M3 · Reconciliation Operations

- **Purpose:** overview, jobs, run results and exception workflow of reconciliation.
- **Tables:** `RECON_JOB`, `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD`, `RECON_EXCEPTION`, `RECON_STATE_MAP`, `DISCREPANCY_TYPE`, `TEAM`.
- **Primary entity:** `RECON_EXCEPTION` (workflow) and `RECON_JOB` (definition).
- **Screens:** Overview (`reconcile`), Jobs (`reconcilejobs`), Results (`reconcileresults`), Exceptions (`reconcileexceptions`) — all existing React screens.
- **Navigation:** Discovery & reconciliation › Reconciliation › Overview · Jobs · Results · Exceptions.
- **APIs:** `GET /api/recon/overview`, `GET/POST/PUT /api/recon-jobs`, `POST /api/recon-jobs/{id}/actions/run`, `GET /api/recon-jobs/{id}/runs`, `GET /api/recon-results`, `GET /api/recon-results/{id}/fields`, `GET /api/recon-exceptions`, `GET /api/recon-exceptions/{id}`, `POST /api/recon-exceptions/{id}/actions/{assign|dispose|raise-workorder|reopen}`.
- **Mock API needs:** the existing `src/data/reconciliationOps.ts` extended with result fields, SLA times, team ownership and `RECON_STATE_MAP` outcomes.
- **Integration dependency:** engine owns runs/results; exceptions are business objects but are *created* by the engine.
- **Future real API:** Reconciliation service.
- **Dependencies:** M4 (rule links), M6 (subject resource links), M18 (teams, users).
- **Complexity:** L.

### M4 · Reconciliation Rules

- **Purpose:** define, review, approve and operate reconciliation rules with a governed lifecycle.
- **Tables:** `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_RULE_EVENT`, `RECON_RULE_TRANSITION`, `RECON_FIELD`, `RECON_RUN_RULE` (execution history), `RECON_JOB_RULE` (jobs using the rule).
- **Primary entity:** `RECON_RULE`.
- **Screens:** Rules list (`rules`), Rule definition (`rulenew`, `ruleedit`), Rule details with Overview / Logic / Responsibilities / Lifecycle / Execution / Exceptions / Activity tabs (`ruledetails`) — existing.
- **Navigation:** Discovery & reconciliation › Reconciliation › Rules.
- **APIs:** `GET /api/recon-rules`, `GET/POST/PUT /api/recon-rules/{id}`, `POST /api/recon-rules/{id}/actions/{submit|approve|reject|request-changes|activate|suspend|resume|retire}`, `GET /api/recon-rules/{id}/events`, `GET /api/recon-rules/{id}/executions`, `GET /api/ref/recon-fields`, `GET /api/ref/rule-transitions`.
- **Mock API needs:** `src/data/rules.ts` mapped to DB statuses (`DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED`), transitions from the seeded `RECON_RULE_TRANSITION`, fields from `RECON_FIELD`.
- **Integration dependency:** only `EXECUTING`/`ACTIVE` flips (`START_EXECUTION`, `FINISH_EXECUTION`, actor `SYSTEM`) come from the engine.
- **Future real API:** Reconciliation service (rules sub-resource).
- **Dependencies:** M18 (users for roles, teams for exception reviewer).
- **Complexity:** M (screens exist; the transition table replaces hard-coded buttons).

### M5 · Location & Facility

- **Purpose:** sites, geography, facility layout, power, contacts and rollout issues.
- **Tables:** `SITE`, `SITE_TYPE`, `SITE_CONTACT`, `SITE_ISSUE`, `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`, `POWER_UNIT`, `POWER_UNIT_TEST`, `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA`, and the NE rack placement columns (`RACK_ID_FK`, `RACK_U_START/END`).
- **Primary entity:** `SITE`.
- **Screens:** Location list (`location`, legacy), Site details (`site`), Facility (`sitedetails`), Site equipment (`siteequipment`), Node view (`node`), Location create (`LocationCreate.tsx`).
- **Navigation:** Inventory › Location.
- **APIs:** `GET /api/sites` (paged, geo/area filters), `GET/POST/PUT /api/sites/{id}`, `/sites/{id}/{floors|rooms|racks|power-feeds|power-units|contacts|issues|equipment|sectors}`, `GET /api/racks/{id}/elevation`, `GET /api/ref/geo`, `GET /api/ref/operational-areas`, `GET /api/ref/site-types`.
- **Mock API needs:** `src/data/sites.json`, `locations.ts`, `facility.ts` reshaped: geography as L1–L4 ids, operational area ids, power units with tests.
- **Integration dependency:** none for master data; `SITE_ISSUE` may be fed by a rollout tool **[Needs validation]**.
- **Future real API:** Inventory service.
- **Dependencies:** Reference API.
- **Complexity:** L (five screens, one legacy).

### M6 · Network Elements (Physical Resources)

- **Purpose:** golden record of every device: identity, class-specific detail, hardware tree, ports, health, stock movement, provenance.
- **Tables:** `NETWORK_ELEMENT`, `NE_RAN_DETAIL`, `NE_CORE_DETAIL`, `NE_IPMPLS_DETAIL`, `NE_SWITCH_DETAIL`, `NE_OPTICAL_DETAIL`, `NE_MICROWAVE_DETAIL`, `NE_PON_DETAIL`, `NE_WIFI_DETAIL`, `NE_SECURITY_DETAIL`, `NE_SERVER_DETAIL`, `NE_POWER_DETAIL`, `EQUIPMENT_COMPONENT`, `PORT`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `NE_HEALTH`, `NE_MOVEMENT`, `NE_STOCK_TRANSITION`, `NE_CLASS`, `NE_CLASS_DOMAIN`, `PRODUCT_MODEL`, `PRODUCT_MODEL_POLICY`, `VENDOR`; shared satellites `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_TECHNOLOGY`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_EXTERNAL_REF`.
- **Primary entity:** `NETWORK_ELEMENT`.
- **Screens:** Physical Resources (`physical`, tabs per NE class), Element (`resource`), Node view (`node`); new tabs on Element: Detail (class-specific), Hardware, Ports, Health, Movements, Asset, Provenance, Relationships.
- **Navigation:** Inventory › Resources › Physical Resources.
- **APIs:** `GET /api/network-elements` (paged; filters domain, neClass, site, vendor, stockState, reconState, operationalArea), `GET/POST/PUT /api/network-elements/{id}`, `/components`, `/ports`, `/health`, `/movements`, `POST /network-elements/{id}/actions/move`, `POST .../actions/decommission`, `GET /api/resources/{id}/{asset|attributes|technologies|provenance|external-refs|relationships}`.
- **Mock API needs:** ~200 NEs spread over 25 classes and 9 domains, each with its detail object, 3–10 components, 4–48 ports; movement history; health.
- **Integration dependency:** discovery writes `RECORD_SOURCE = DISCOVERED` rows and provenance; UI edits must respect provenance rules **[Needs validation]**.
- **Future real API:** Inventory service.
- **Dependencies:** M5 (site/rack), Reference API, M18 (vendor/model).
- **Complexity:** XL.

### M7 · Virtual Resources

- **Purpose:** VNF/CNF instances, their hosts and clusters, core network functions.
- **Tables:** `NE_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER`, `NETWORK_ELEMENT` (`IS_VIRTUAL = 1`, `RESOURCE_CLASS = VIRTUAL_NE`), `NE_CORE_DETAIL`, `NE_SERVER_DETAIL` (hosts), `NETWORK_FUNCTION_TYPE`.
- **Primary entity:** `NETWORK_ELEMENT` (virtual) + `NE_VIRTUAL_INSTANCE`.
- **Screens:** Virtual Resources (`virtual`, legacy), Lifecycle operations (`vnflifecycle`, legacy), View (`vnfdetails`, legacy). The Cell 4G/5G detail screens currently under Virtual move to M8.
- **Navigation:** Inventory › Resources › Virtual Resources.
- **APIs:** `GET /api/network-elements?virtual=true`, `GET /api/virtual-instances/{id}`, `GET/POST/PUT /api/cloud-clusters`, `GET /api/cloud-clusters/{id}/hosts`, `GET /api/cloud-clusters/{id}/instances`.
- **Mock API needs:** 3 clusters, ~15 virtual NEs (AMF, SMF, UPF, IMS, vBBU) with instance UUIDs, hosts.
- **Integration dependency:** instantiation state (`INSTANTIATION_STATE`) is owned by an orchestrator **[Needs validation]**; the "Lifecycle operations" screen would be action calls to it.
- **Future real API:** Inventory service (read) + orchestrator adapter (actions).
- **Dependencies:** M6.
- **Complexity:** M.

### M8 · RAN Inventory (new)

- **Purpose:** sectors, cells, antennas, radio units, PLMNs and slices of a radio site.
- **Tables:** `RADIO_SECTOR`, `RADIO_CELL`, `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `ANTENNA`, `PLMN`, `NETWORK_SLICE`, `FREQUENCY_BAND`, `TECHNOLOGY`, plus `NE_RAN_DETAIL` (node) from M6.
- **Primary entity:** `RADIO_CELL`.
- **Screens:** Cells list (new), Cell details (port of `cell4gdetails` / `cell5gdetails`), Site radio view (sectors → antennas → cells, new tab on Site details), Antenna details (new drawer), PLMN & slices (small admin list).
- **Navigation:** Inventory › Resources › RAN Inventory (proposed new sidebar entry).
- **APIs:** `GET /api/radio-cells` (filters technology, band, node, site, status), `GET/PUT /api/radio-cells/{id}`, `GET /api/sites/{id}/sectors`, `GET /api/sites/{id}/antennas`, `GET/PUT /api/antennas/{id}`, `GET /api/network-elements/{id}/cells`, `GET/POST /api/plmns`, `GET/POST /api/network-slices`, `GET /api/ref/frequency-bands`.
- **Mock API needs:** 10 RAN sites × 3 sectors, 2G–5G cells per sector, antennas with azimuth/tilt, 2 PLMNs, 3 slices.
- **Integration dependency:** cell parameters are discovered from the EMS; manual edits **[Needs validation]**.
- **Future real API:** Inventory service.
- **Dependencies:** M5, M6, Reference API.
- **Complexity:** L.

### M9 · Passive Infrastructure

- **Purpose:** towers, shelters, ODF/DDF, patch panels, cords, power plant and the fiber-plant proxies.
- **Tables:** `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, `PORT` (passive ports), `RACK`, `POWER_UNIT`, `POWER_UNIT_TEST`, `EXTERNAL_RESOURCE` (fiber spans, ducts, splice closures proxied from the fiber system), `EXTERNAL_OBJECT_TYPE`.
- **Primary entity:** `PASSIVE_ASSET`.
- **Screens:** Passive Infrastructure (`passive`, legacy), ODF (`odf`), Racks (`rack`), Power plant (`power`), Patch cords (`cord`); Splice (`splice`), Ducts (`duct`), Fiber spans (`fiber`) become **proxy views** over `EXTERNAL_RESOURCE` with a deep link to the fiber application.
- **Navigation:** Inventory › Resources › Passive Infrastructure.
- **APIs:** `GET /api/passive-assets` (filters type, site, rack), `GET/POST/PUT /api/passive-assets/{id}`, `GET /api/passive-assets/{id}/ports`, `GET /api/racks/{id}`, `GET /api/power-units/{id}`, `POST /api/power-units/{id}/tests`, `GET /api/external-resources?systemType=FIBER_INVENTORY&objectType=`, `GET /api/ref/passive-asset-types`.
- **Mock API needs:** assets of every seeded type with ports where `HAS_PORTS = 1`; 20 fiber proxies with display labels only.
- **Integration dependency:** fiber plant is read-only, synced from the external system.
- **Future real API:** Inventory service + fiber adapter.
- **Dependencies:** M5, M17.
- **Complexity:** L (seven legacy screens; three change meaning).

### M10 · Connectivity (Links)

- **Purpose:** links at every layer between devices and ports.
- **Tables:** `LINK`, `LINK_LAYER`, `LINK_PROTOCOL_ATTR`, `LINK_MICROWAVE_ATTR`.
- **Primary entity:** `LINK`.
- **Screens:** Links (`links`, legacy) with tabs by `LINK_LAYER.CATEGORY`; link drawer with A/Z, attrs, status, source, first/last seen.
- **Navigation:** Inventory › Connectivity › Links.
- **APIs:** `GET /api/links` (filters layer, category, domain, ne, status, recordState), `GET/POST/PUT /api/links/{id}`, `GET /api/network-elements/{id}/links`, `GET /api/ref/link-layers`.
- **Mock API needs:** ~150 links spanning the 8 categories; microwave and BGP/OSPF attrs where relevant.
- **Integration dependency:** most links are discovered (LLDP/OSPF/BGP); manual links are planned/physical.
- **Future real API:** Inventory service.
- **Dependencies:** M6.
- **Complexity:** M.

### M11 · IP & Logical (IPAM) (new)

- **Purpose:** subnets by routing context, VRFs, VLANs and interface addresses.
- **Tables:** `IP_SUBNET`, `VRF`, `VLAN`, `PORT_IP_ADDRESS`, `PORT_VLAN`.
- **Primary entity:** `IP_SUBNET`.
- **Screens:** Subnet tree (new), VRF list per router (new), VLAN list per switch (new); IP addresses appear on M6's Ports tab.
- **Navigation:** Inventory › Connectivity › IP & Logical (proposed).
- **APIs:** `GET /api/ip-subnets` (tree by context), `GET/POST/PUT /api/ip-subnets/{id}`, `GET /api/ip-subnets/{id}/addresses`, `GET /api/network-elements/{id}/vrfs`, `GET /api/network-elements/{id}/vlans`.
- **Mock API needs:** 40 subnets in global + 3 L3VPN contexts, VRFs on PE routers, VLANs on switches.
- **Integration dependency:** discovered from routers; `VLAN`/`VRF` DDL missing from the dump.
- **Future real API:** Inventory service.
- **Dependencies:** M6, M12 (L3VPN context).
- **Complexity:** M. **[Needs validation]** whether IPAM is in scope for this product.

### M12 · Services

- **Purpose:** network service instances and their endpoints.
- **Tables:** `SERVICE_INSTANCE`, `SERVICE_ENDPOINT`, `SERVICE_TYPE`, `NETWORK_SLICE`, `IP_SUBNET` (L3VPN context).
- **Primary entity:** `SERVICE_INSTANCE`.
- **Screens:** Services (`services`, legacy) with tabs per type; service drawer with endpoints and status.
- **Navigation:** Inventory › Services.
- **APIs:** `GET /api/services` (filters type, domain, status, ne), `GET/POST/PUT /api/services/{id}`, `GET /api/network-elements/{id}/services`, `GET /api/ref/service-types`.
- **Mock API needs:** ~40 services over 12 seeded types with 2–6 endpoints each.
- **Integration dependency:** L2/L3 VPNs are discovered; the LCM external system (`EXTERNAL_OBJECT_TYPE.LCM_SERVICE`) is the provisioning source **[Inferred]**.
- **Future real API:** Inventory service.
- **Dependencies:** M6.
- **Complexity:** M.

### M13 · Relationships & Impact (new)

- **Purpose:** typed dependencies between resources across domains (backhauled by, powered by, rides over, redundant with) and impact analysis.
- **Tables:** `RESOURCE_RELATIONSHIP`, `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE`, `RESOURCE`, `RESOURCE_CLASS`.
- **Primary entity:** `RESOURCE_RELATIONSHIP`.
- **Screens:** Relationships tab on every resource detail (M5/M6/M8/M9/M10/M12), Impact view (new: "what depends on this") reachable from any resource.
- **Navigation:** no top-level entry; a tab and a drawer.
- **APIs:** `GET /api/resources/{id}/relationships?direction=`, `POST/DELETE /api/resources/{id}/relationships`, `GET /api/resources/{id}/impact?depth=`, `GET /api/ref/relationship-types`, `GET /api/ref/relationship-rules`.
- **Mock API needs:** ~60 edges connecting cells → RU → BBU → switch → router → optical link → power unit.
- **Integration dependency:** discovered edges carry `EXTERNAL_SYSTEM_ID_FK`.
- **Future real API:** Inventory service (graph query).
- **Dependencies:** M6, M10.
- **Complexity:** M.

### M14 · Inactive Inventory

- **Purpose:** everything that is decommissioned, inactive, faulty or soft-deleted, with the movement history that got it there.
- **Tables:** `NETWORK_ELEMENT` (`STOCK_STATE`, `RECORD_STATE`, `IS_DELETED`), `NE_MOVEMENT`, `PORT`, `LINK`, `SERVICE_INSTANCE`, `EQUIPMENT_COMPONENT`, `RESOURCE_RELATIONSHIP` (`RECORD_STATE = INACTIVE`).
- **Primary entity:** cross-cutting query.
- **Screens:** Inactive inventory (`inactive`, existing React).
- **Navigation:** Inventory › Inactive inventory.
- **APIs:** `GET /api/inactive?kind=&domain=&since=` (union read model), `POST /api/network-elements/{id}/actions/move` (recover to store), link to exception.
- **Mock API needs:** derived from M6/M10/M12 mock stores by state filter.
- **Integration dependency:** none.
- **Future real API:** Inventory service query endpoint.
- **Dependencies:** M6, M10, M12.
- **Complexity:** S.

### M15 · Finance (Capex / Opex)

- **Purpose:** site capital plans and operating budgets with actuals.
- **Tables:** `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL`, `RESOURCE_ASSET` (purchase cost), `VENDOR`, `USER` (owner).
- **Primary entity:** `CAPEX_PLAN` / `OPEX_PLAN`.
- **Screens:** Capex (`capex`, legacy), Opex (`opex`, legacy) under Site details.
- **Navigation:** Inventory › Location › Site details › Capex · Opex.
- **APIs:** `GET /api/sites/{id}/capex?fy=`, `POST/PUT /api/capex-plans/{id}` (lines embedded), `GET /api/sites/{id}/opex?fy=`, `POST/PUT /api/opex-plans/{id}` (lines + actuals embedded).
- **Mock API needs:** one plan per site per FY with 5–8 lines; 12 monthly actuals.
- **Integration dependency:** none in schema (ERP feed **[Needs validation]**).
- **Future real API:** Inventory service (finance sub-domain).
- **Dependencies:** M5, M18.
- **Complexity:** M.

### M16 · Reports

- **Purpose:** report catalogue, scheduling, generated report runs and trust trend.
- **Tables:** `REPORT_DEFINITION`, `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT`.
- **Primary entity:** `REPORT_DEFINITION`.
- **Screens:** Discovery reports (`discoveryreports`, `discoveryreport`), Inventory reports (`reports`, `inventoryreport`) — existing React.
- **Navigation:** Discovery & reconciliation › Reports; Inventory › Reports.
- **APIs:** `GET /api/reports/definitions?module=`, `GET/POST/PUT /api/reports/definitions/{id}`, `POST /api/reports/definitions/{id}/actions/run`, `GET /api/reports/runs`, `GET /api/reports/runs/{id}`, `GET /api/reports/runs/{id}/file`.
- **Mock API needs:** the existing `src/data/reports/*` catalog re-keyed to `CODE`/`MODULE`; runs with status and file refs.
- **Integration dependency:** the reporting service produces runs and files.
- **Future real API:** Reporting service.
- **Dependencies:** M1 (trend data).
- **Complexity:** S.

### M17 · External Systems & Integration (new)

- **Purpose:** registry of external systems, sync health, proxied objects and cross-references.
- **Tables:** `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REF`, `USER_IDENTITY`.
- **Primary entity:** `EXTERNAL_SYSTEM`.
- **Screens:** External systems list with status and last sync (new), System detail with proxied object counts (new), "Also known in" panel on resource details.
- **Navigation:** Administration › Integrations (proposed).
- **APIs:** `GET /api/external-systems`, `GET /api/external-systems/{id}`, `GET /api/external-systems/{id}/resources`, `GET /api/resources/{id}/external-refs`; registration `POST/PUT` **[Needs validation]**.
- **Mock API needs:** 6 systems (EMS-RAN, NMS-Transport, Fiber inventory, CMDB, CRM, IAM) with statuses.
- **Integration dependency:** entirely integration-owned.
- **Future real API:** Integration service.
- **Dependencies:** none.
- **Complexity:** S.

### M18 · Administration & Catalogs

- **Purpose:** users, teams, tenant-scoped reference data, vendor/model catalog policy, custom attributes.
- **Tables:** `USER`, `TEAM`, `TEAM_MEMBER`, `OPERATIONAL_AREA`, `PRIMARY_GEO_L1..L4`, `PRODUCT_MODEL`, `PRODUCT_MODEL_POLICY`, `VENDOR`, `ATTRIBUTE_DEFINITION`, `PLMN`; read access to all global catalogs.
- **Primary entity:** none (several small lists).
- **Screens:** Teams & members (new, small), Operational areas tree (new), Product models & golden OS policy (new), Custom attributes (new). Users are read-only (IAM owns them).
- **Navigation:** Administration (proposed).
- **APIs:** `GET /api/users`, `GET/POST/PUT /api/teams`, `GET/POST/PUT /api/operational-areas`, `GET /api/ref/product-models`, `PUT /api/product-models/{id}/policy`, `GET/POST/PUT /api/attribute-definitions`, and the whole `GET /api/ref/*` family.
- **Mock API needs:** the reference seeds from the dump (Appendix A) plus a user/team list.
- **Integration dependency:** users and identities come from IAM.
- **Future real API:** Inventory service (admin) + IAM adapter.
- **Dependencies:** none.
- **Complexity:** M. Phase 3.

### Shared · Reference API

Not a module but a cross-cutting client (`src/services/reference`) that loads and caches every global catalog on app start (`DOMAIN`, `NE_CLASS`, `NE_CLASS_DOMAIN`, `RESOURCE_CLASS`, `TECHNOLOGY`, `FREQUENCY_BAND`, `LINK_LAYER`, `SERVICE_TYPE`, `SITE_TYPE`, `PASSIVE_ASSET_TYPE`, `NETWORK_FUNCTION_TYPE`, `DISCOVERY_STEP_DEF`, `DISCREPANCY_TYPE`, `RECON_FIELD`, `RECON_STATE_MAP`, `RECON_RULE_TRANSITION`, `NE_STOCK_TRANSITION`, `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE`, `EXTERNAL_OBJECT_TYPE`, `PRODUCT_MODEL`, `VENDOR`). `TENANT` is never fetched: the tenant comes from the session token. All modules depend on it.

---

## 7. Module proposal table

| Module | Primary DB tables | Supporting tables | UI screens | Mock API needed? | Real API dependency | Integration dependency | Phase | Complexity |
|---|---|---|---|---|---|---|---|---|
| M1 Discovery Insights | `DOMAIN_TRUST_SNAPSHOT`, `COLLECTOR` | `SCAN_*`, `RECON_*`, `DISCREPANCY_TYPE`, `NETWORK_ELEMENT` aggregates | Insights + 5 drill-downs (existing) | Yes | Insights read model | Discovery, Reconciliation engines | 1 (mock) / 2 (real) | M |
| M2 Scan Jobs & Targets | `SCAN_JOB`, `SCAN_TARGET`, `SCAN_RUN` | `SCAN_JOB_SCOPE`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF` | Scan jobs, Scan targets, Target transcript (legacy → React) | Yes | Discovery service | Scheduler + collectors | 2 | L |
| M3 Reconciliation Operations | `RECON_JOB`, `RECON_EXCEPTION`, `RECON_RESULT` | `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT_FIELD`, `RECON_STATE_MAP`, `DISCREPANCY_TYPE`, `TEAM` | Overview, Jobs, Results, Exceptions (existing) | Yes | Reconciliation service | Reconciliation engine | 2 | L |
| M4 Reconciliation Rules | `RECON_RULE`, `RECON_RULE_CONDITION` | `RECON_RULE_EVENT`, `RECON_RULE_TRANSITION`, `RECON_FIELD`, `RECON_RUN_RULE` | Rules list, definition, details (existing) | Yes | Reconciliation service | Engine sets EXECUTING | 1 | M |
| M5 Location & Facility | `SITE`, `RACK`, `POWER_UNIT` | `SITE_TYPE`, `SITE_CONTACT`, `SITE_ISSUE`, `FLOOR`, `ROOM`, `POWER_FEED`, `POWER_UNIT_TEST`, `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA` | Location, Site details, Facility, Site equipment, Node view, Create (mixed) | Yes | Inventory service | None | 1 | L |
| M6 Network Elements | `NETWORK_ELEMENT`, `PORT`, `EQUIPMENT_COMPONENT` | 11 `NE_*_DETAIL`, `NE_HEALTH`, `NE_MOVEMENT`, `NE_STOCK_TRANSITION`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `NE_CLASS`, `NE_CLASS_DOMAIN`, `PRODUCT_MODEL(+POLICY)`, `VENDOR`, resource satellites | Physical Resources, Element, Node view (existing) | Yes | Inventory service | Discovery writes discovered rows | 1 | XL |
| M7 Virtual Resources | `NE_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER` | `NETWORK_ELEMENT` (virtual), `NE_CORE_DETAIL`, `NE_SERVER_DETAIL`, `NETWORK_FUNCTION_TYPE` | Virtual, Lifecycle ops, View (legacy → React) | Yes | Inventory service | Orchestrator for lifecycle actions | 1 (read) / 3 (actions) | M |
| M8 RAN Inventory | `RADIO_CELL`, `RADIO_SECTOR`, `ANTENNA` | `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `PLMN`, `NETWORK_SLICE`, `FREQUENCY_BAND`, `TECHNOLOGY` | Cells, Cell details (port of 4G/5G), Site radio view, Antennas (new) | Yes | Inventory service | EMS discovery | 3 | L |
| M9 Passive Infrastructure | `PASSIVE_ASSET`, `PATCH_CORD` | `PASSIVE_ASSET_TYPE`, `PORT`, `RACK`, `POWER_UNIT(+TEST)`, `EXTERNAL_RESOURCE`, `EXTERNAL_OBJECT_TYPE` | Passive + 7 element screens (legacy → React) | Yes | Inventory service + fiber adapter | Fiber inventory system | 1 (assets) / 2 (fiber proxies) | L |
| M10 Connectivity | `LINK` | `LINK_LAYER`, `LINK_PROTOCOL_ATTR`, `LINK_MICROWAVE_ATTR` | Links (legacy → React) | Yes | Inventory service | Discovery writes adjacency links | 1 | M |
| M11 IP & Logical | `IP_SUBNET` | `VRF`, `VLAN`, `PORT_IP_ADDRESS`, `PORT_VLAN` | Subnets, VRFs, VLANs (new) | Yes | Inventory service | Discovery | 3 | M |
| M12 Services | `SERVICE_INSTANCE`, `SERVICE_ENDPOINT` | `SERVICE_TYPE`, `NETWORK_SLICE`, `IP_SUBNET` | Services (legacy → React) | Yes | Inventory service | LCM / discovery | 1 | M |
| M13 Relationships & Impact | `RESOURCE_RELATIONSHIP` | `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE`, `RESOURCE`, `RESOURCE_CLASS` | Relationships tab, Impact drawer (new) | Yes | Inventory service | Discovery-sourced edges | 3 | M |
| M14 Inactive Inventory | union query | `NE_MOVEMENT` | Inactive inventory (existing) | Yes (derived) | Inventory service | None | 1 | S |
| M15 Finance | `CAPEX_PLAN`, `OPEX_PLAN` | `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL`, `RESOURCE_ASSET` | Capex, Opex (legacy → React) | Yes | Inventory service | ERP (unknown) | 1 | M |
| M16 Reports | `REPORT_DEFINITION`, `REPORT_RUN` | `DOMAIN_TRUST_SNAPSHOT` | Reports landing + view ×2 (existing) | Yes | Reporting service | Report generator | 1 (catalog) / 2 (runs) | S |
| M17 External Systems | `EXTERNAL_SYSTEM` | `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REF`, `USER_IDENTITY` | Integrations list/detail (new) | Yes | Integration service | All external systems | 2 | S |
| M18 Administration & Catalogs | `TEAM`, `OPERATIONAL_AREA`, `PRODUCT_MODEL_POLICY` | `USER`, `TEAM_MEMBER`, `PRIMARY_GEO_*`, `PRODUCT_MODEL`, `VENDOR`, `ATTRIBUTE_DEFINITION`, `PLMN`, all global catalogs | Admin lists (new) | Yes | Inventory service + IAM | IAM | 3 | M |
| Shared Reference API | 22 global catalogs | — | none (client cache) | Yes | Inventory service | None | 1 | S |


---

## 8. UI → API → DB architecture

```
┌────────────────────────────── Browser (React 19, react-router 7) ──────────────────────────────┐
│  screens/*            ──uses──▶  modules/<m>/hooks (useXxxList, useXxx, useXxxAction)          │
│  components (DataGrid, Drawer, Card, Chip, Lifecycle, Timeline)                                │
│                                    │                                                            │
│                       services/<m>/XService  (interface = API contract, DTOs in types.ts)      │
│                            ┌───────┴────────┐                                                   │
│                    MockXService         ApiXService  (fetch → /api/…, JSON DTOs)               │
│                    (in-memory store,    (never talks to DB; never builds SQL)                   │
│                     seeded from mock/)                                                          │
└───────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                │ HTTPS, JSON, bearer token (tenant from token)
┌───────────────────────────────────────────────▼────────────────────────────────────────────────┐
│  API gateway / BFF (routing, auth, tenant injection, response shaping)                          │
├──────────────────┬───────────────────────┬──────────────────────┬──────────────────────────────┤
│ Inventory service│ Discovery service     │ Reconciliation svc   │ Reporting / Integration svcs │
│ (Spring Boot)    │ (scheduler+collectors)│ (engine + rules)     │ (report gen, sync adapters)  │
│ owns C + D tables│ owns SCAN_*,COLLECTOR,│ owns RECON_RUN/RESULT│ owns REPORT_RUN, EXTERNAL_*, │
│ + read models    │ CREDENTIAL_PROFILE,   │ writes RECON_EXCEPTION│ RESOURCE_EXTERNAL_REF,      │
│                  │ NE_HEALTH, PROVENANCE │ flips rule EXECUTING │ USER_IDENTITY, TRUST_SNAPSHOT│
└──────────────────┴───────────────────────┴──────────────────────┴──────────────────────────────┘
                                                │ JPA / JDBC (composite tenant keys, ROW_VERSION)
                                       ┌────────▼────────┐
                                       │  MySQL INVENTORY │  (118 tables)
                                       └─────────────────┘
```

Rules of the architecture:

1. **The UI never sees table names.** DTOs use camelCase business names (`neName`, `neClass`, `stockState`); ids are opaque numbers/strings; `resourceId` is included for cross-links.
2. **Integration-owned tables are exposed as resources plus actions.** `POST /scan-jobs/{id}/actions/run` rather than `PUT status=RUNNING`.
3. **Every mutable DTO carries `rowVersion`.** `PUT` with a stale version → `409 Conflict` with the current DTO in the body.
4. **Reference data is one endpoint family** (`/api/ref/*`), cacheable with `ETag`.
5. **Pagination, sort and filter are uniform**: `?page=0&size=50&sort=neName,asc&domain=RAN&q=text` → `{ items, page, size, total }`.
6. **Errors are uniform**: `{ code, message, field?, details? }` with HTTP 400/403/404/409/422.

---

## 9. API contract proposals

Contracts are written per module. Only the shapes that drive UI decisions are spelled out; list endpoints share the `Page<T>` envelope.

```ts
// common
interface Page<T> { items: T[]; page: number; size: number; total: number }
interface Ref { id: number; code: string; name: string }            // any catalog row
interface Audit { createdTime: string; creator: number; modifiedTime: string; lastModifier: number; rowVersion: number }
interface ApiError { code: string; message: string; field?: string; details?: Record<string, unknown> }
```

### 9.1 Reference API (`/api/ref`)

```
GET /api/ref/domains                → DomainNode[]   { id, code, name, parentId, sortOrder, children[] }
GET /api/ref/ne-classes?domain=RAN  → NeClass[]      { id, code, name, detailTable, canBeVirtual, sortOrder, domains: string[] }
GET /api/ref/resource-classes       → { code, name, inventoryCategory, layer, subtypeTable }[]
GET /api/ref/vendors                → Ref[]
GET /api/ref/product-models?vendorId=&neClass=&category= → ProductModel[]
GET /api/ref/technologies | frequency-bands?technology= | link-layers | service-types | site-types
    | passive-asset-types | nf-types | discovery-steps?domain= | discrepancy-types?domain=
    | recon-fields?resourceClass= | rule-transitions | stock-transitions | recon-state-map
    | relationship-types | relationship-rules | external-object-types
GET /api/ref/geo?level=1..4&parentId=   → GeoNode[]
GET /api/ref/operational-areas          → AreaNode[] (tree: REGION > CIRCLE > ZONE > DIVISION > TERRITORY)
```

### 9.2 M6 Network Elements

```
GET  /api/network-elements?domain=&neClass=&siteId=&vendorId=&stockState=&reconState=&areaId=&virtual=&q=&page=&size=&sort=
GET  /api/network-elements/{id}
POST /api/network-elements                  (NetworkElementCreate)
PUT  /api/network-elements/{id}             (NetworkElementUpdate, rowVersion required)
GET  /api/network-elements/{id}/components  → ComponentNode[] (tree)
GET  /api/network-elements/{id}/ports?kind=&page=
GET  /api/network-elements/{id}/health
GET  /api/network-elements/{id}/movements
POST /api/network-elements/{id}/actions/move        { toState, toSiteId?, workOrderRef?, remarks? }
POST /api/network-elements/{id}/actions/decommission{ reason, workOrderRef? }
GET  /api/network-elements/{id}/links | /cells | /services | /vrfs | /vlans
GET  /api/resources/{resourceId}/asset | attributes | technologies | provenance | external-refs | relationships
```

```json
// GET /api/network-elements/1042
{
  "id": 1042, "resourceId": 908812, "resourceClass": "PHYSICAL_NE", "isVirtual": false,
  "neName": "BLR-AGG-R07", "neClass": "ROUTER", "domain": "IP_MPLS",
  "vendor": { "id": 3, "code": "CISCO", "name": "Cisco" },
  "productModel": { "id": 77, "model": "ASR-9906", "endOfLifeDate": "2029-03-31" },
  "serialNumber": "FOX2233A1B", "managementIp": "10.20.7.1", "macAddress": null,
  "osVersion": "7.9.2", "swBuildNumber": null, "configTemplate": "AGG-STD-v3",
  "site": { "id": 277, "code": "KA-BGLK-277", "name": "Bengaluru Koramangala" },
  "rack": { "id": 5120, "code": "R-04" }, "rackUStart": 12, "rackUEnd": 21,
  "parentNeId": null,
  "stockState": "DEPLOYED", "operStatus": "UP", "adminState": "IN_SERVICE",
  "recordSource": "DISCOVERED", "reconState": "VERIFIED",
  "lastVerifiedTime": "2026-09-24T02:10:11.000Z", "lastSeenTime": "2026-09-25T01:58:03.000Z",
  "decommissionedTime": null, "decommissionReason": null, "workOrderRef": null,
  "detail": {
    "detailTable": "NE_IPMPLS_DETAIL",
    "routerRole": "PE", "routerId": "10.255.0.7", "loopbackIp": "10.255.0.7", "asNumber": 64512,
    "igpProtocol": "ISIS", "mplsEnabled": true, "ldpEnabled": true, "rsvpTeEnabled": false,
    "segmentRoutingEnabled": true, "bgpEnabled": true, "labelRangeStart": 16000, "labelRangeEnd": 23999,
    "vrfCount": 14, "qosProfile": "QOS-AGG-01", "coreMtu": 9216,
    "redundancyRole": "PRIMARY", "chassisRedundancy": "DUAL_RSP", "backplaneCapacityGbps": 3200
  },
  "technologies": [{ "code": "IP" }, { "code": "SR_MPLS" }],
  "health": { "reachability": "REACHABLE", "latencyAvgMs": 2.4, "ntpStatus": "SYNCED", "checkedTime": "2026-09-25T01:58:03.000Z" },
  "counts": { "components": 18, "ports": 96, "links": 12, "services": 9, "openExceptions": 1 },
  "createdTime": "2025-11-02T09:00:00.000Z", "creator": 12, "modifiedTime": "2026-09-24T02:10:11.000Z", "lastModifier": 1, "rowVersion": 41
}
```

`detail` is a discriminated union keyed by `detailTable` (11 variants, one per `NE_*_DETAIL`). `NE_CLASS.CODE = OTHER` has `detail: null` [Confirmed by seed].

```json
// POST /api/network-elements/1042/actions/move
{ "toState": "IN_STORE", "toSiteId": 12, "workOrderRef": "WO-88121", "remarks": "Swapped for RMA unit" }
// 200 → { "movement": { "id": 771, "fromState": "DEPLOYED", "toState": "IN_STORE", "movementType": "DE_INSTALL", "movedTime": "..." },
//          "networkElement": { ...updated NE with stockState IN_STORE... } }
// 422 → { "code": "ILLEGAL_TRANSITION", "message": "DEPLOYED → PLANNED is not an allowed stock move" }
```

### 9.3 M5 Location & Facility

```
GET /api/sites?geoL1=&geoL2=&areaId=&siteTypeId=&category=&status=&q=&page=
GET /api/sites/{id}      → Site { id, resourceId, code, name, siteType, category, status, parentSiteId,
                                 geo: { l1, l2, l3, l4 }, operationalArea, address, postalCode, latitude, longitude,
                                 environment, rolloutStage, landlord, leaseEndDate, workOrderRef, onAirDate, ...Audit }
POST/PUT /api/sites
GET /api/sites/{id}/floors | rooms | racks | power-feeds | power-units | contacts | issues | equipment | sectors | antennas | capex | opex
GET /api/racks/{id}/elevation   → { heightU, slots: [{ uStart, uEnd, kind: "NE"|"PASSIVE", id, name }] }
POST /api/power-units/{id}/tests { testedDate, result, loadPct, durationMinutes }
```

### 9.4 M2 Scan Jobs & Targets (integration contract)

```
GET  /api/scan-jobs?domain=&scheduleState=&collectorId=&page=
GET  /api/scan-jobs/{id}       → ScanJob (below)
POST /api/scan-jobs            (definition only)
PUT  /api/scan-jobs/{id}
POST /api/scan-jobs/{id}/actions/run | hold { reason } | resume
GET  /api/scan-jobs/{id}/runs?page=        → Page<ScanRun>
GET  /api/scan-runs/{id}                   → ScanRun + summary { targets, ok, partial, failed }
GET  /api/scan-runs/{id}/targets?outcome=  → Page<ScanRunTarget>
GET  /api/scan-targets?jobId=&outcome=&q=  → Page<ScanTarget>
GET  /api/scan-run-targets/{id}/steps      → ScanStepResult[]
GET  /api/scan-step-results/{id}/payload?kind=REQUEST|RESPONSE   (403 unless permitted; decrypted server side)
GET  /api/collectors ; GET /api/credential-profiles ; POST/PUT /api/credential-profiles (vaultRef only)
```

```json
// GET /api/scan-jobs/17
{
  "id": 17, "code": "DSC-SOUTH-CORE", "domain": "CORE", "sourceKind": "COLLECTOR",
  "collector": { "id": 2, "code": "clr-blr-02", "status": "HEALTHY" },
  "credentialProfile": { "id": 4, "code": "ro-inband-v3", "protocol": "SNMPV3" },
  "externalSystem": null, "operationalArea": { "id": 31, "code": "KA", "name": "Karnataka" },
  "schedule": { "kind": "CRON", "cron": "0 */6 * * *", "intervalMinutes": null, "state": "ACTIVE", "heldReason": null, "nextRunTime": "2026-09-25T06:00:00.000Z" },
  "maxCrawlDepth": 2,
  "scopes": [ { "kind": "CIDR", "value": "10.20.0.0/22" }, { "kind": "SITE", "value": "KA-BGLK-277", "siteId": 277 } ],
  "lastRun": { "id": 9110, "runNo": 212, "status": "COMPLETED_WITH_ERRORS", "startedTime": "2026-09-25T00:00:02.000Z", "endedTime": "2026-09-25T00:07:40.000Z", "durationMs": 458000, "targets": 48, "ok": 44, "partial": 3, "failed": 1 },
  "rowVersion": 9
}
```

```json
// GET /api/scan-run-targets/551/steps   (Target transcript)
[
  { "step": { "code": "device", "name": "Device identity", "sequenceNo": 1, "protocol": "SNMP" }, "state": "OK", "startedTime": "…", "durationMs": 310, "responseBytes": 2048, "wroteSummary": "NE identity, OS version", "failureReason": null, "suggestedAction": null },
  { "step": { "code": "lldp", "name": "LLDP neighbours", "sequenceNo": 4, "protocol": "SNMP" }, "state": "FAILED", "startedTime": "…", "durationMs": 5000, "responseBytes": 0, "wroteSummary": null, "failureReason": "TIMEOUT", "suggestedAction": "Check SNMP ACL on the management VRF" }
]
```

### 9.5 M3 / M4 Reconciliation

```
GET  /api/recon-rules?domain=&status=&ownerId=&q=&page=
GET  /api/recon-rules/{id}   → ReconRule
POST /api/recon-rules ; PUT /api/recon-rules/{id}   (conditions embedded, full replace)
POST /api/recon-rules/{id}/actions/{submit|approve|reject|request-changes|activate|suspend|resume|retire} { note? }
GET  /api/recon-rules/{id}/events      → RuleEvent[] (append-only)
GET  /api/recon-rules/{id}/executions  → RunRule[]
GET  /api/recon-jobs ; POST/PUT ; POST /api/recon-jobs/{id}/actions/run ; GET /api/recon-jobs/{id}/runs
GET  /api/recon-results?runId=&ruleId=&outcome=&subjectKind=&page=
GET  /api/recon-results/{id}/fields
GET  /api/recon-exceptions?state=&domain=&typeId=&teamId=&assigneeId=&slaStatus=&ruleId=&page=
GET  /api/recon-exceptions/{id}
POST /api/recon-exceptions/{id}/actions/assign { teamId?, assigneeId? }
POST /api/recon-exceptions/{id}/actions/dispose { disposition: "ACCEPT_NETWORK"|"ACCEPT_RECORD"|"RAISE_WORKORDER"|"APPROVE_EXCEPTION", note, workOrderRef?, expiresDate? }
```

```json
// GET /api/recon-rules/31
{
  "id": 31, "code": "RUL-RAN-001", "name": "gNodeB PCI matches planning record",
  "description": "Compares physical cell id discovered from the EMS against the planned value.",
  "domain": "RAN", "sourceDesc": "EMS (RAN)", "targetDesc": "Inventory golden record",
  "ruleType": "ATTRIBUTE", "priority": "HIGH", "status": "REVIEW", "origin": "MANUAL",
  "roles": { "owner": { "id": 12, "displayName": "Harish Kumar" }, "reviewer": { "id": 14, "displayName": "Anjali Verma" },
             "approver": { "id": 9, "displayName": "R. Iyer" }, "executor": { "id": 1, "displayName": "system" },
             "exceptionReviewerTeam": { "id": 3, "code": "NOC-RAN" } },
  "expectedImpact": "~120 cells/run",
  "conditions": [
    { "sequenceNo": 1, "connector": null,  "sourceField": "PHYSICAL_CELL_ID", "operator": "EQUALS", "targetKind": "FIELD", "targetField": "PHYSICAL_CELL_ID", "targetLiteral": null },
    { "sequenceNo": 2, "connector": "AND", "sourceField": "CELL_STATUS", "operator": "EQUALS", "targetKind": "LITERAL", "targetField": null, "targetLiteral": "ON_AIR" }
  ],
  "allowedActions": ["approve", "reject", "request-changes"],   // derived from RECON_RULE_TRANSITION × caller role
  "lastExecution": { "runId": 8101, "matchedCount": 118, "exceptionCount": 2, "durationMs": 1810, "time": "2026-09-24T03:00:00.000Z" },
  "rowVersion": 6
}
```

`allowedActions` is the important contract decision: the server computes it from `RECON_RULE_TRANSITION` and the caller's role, so the UI renders buttons without duplicating the transition table. [Inferred; recommended]

```json
// GET /api/recon-exceptions/5001
{
  "id": 5001, "code": "RX-5001", "state": "DRIFTED", "status": "OPEN",
  "discrepancyType": { "id": 7, "code": "PCI_MISMATCH", "label": "PCI value != record", "category": "ATTRIBUTE" },
  "domain": "RAN", "rule": { "id": 31, "code": "RUL-RAN-001" }, "result": { "id": 900112 },
  "subject": { "kind": "RESOURCE", "resourceId": 908812, "resourceClass": "RADIO_CELL", "label": "BLR-277-S1-N78", "route": "/inventory/cells/4410" },
  "subjectDetail": "PCI 213 vs 231", "affectedRecordCount": 1,
  "detectedTime": "2026-09-24T03:01:00.000Z", "slaDueTime": "2026-09-26T03:01:00.000Z", "slaStatus": "AT_RISK",
  "ownerTeam": { "id": 3, "code": "NOC-RAN" }, "assignee": { "id": 21, "displayName": "Priya S." },
  "disposition": null, "isAutoResolved": false, "exceptionExpiresDate": null, "workOrderRef": null, "closedTime": null,
  "fields": [ { "fieldCode": "PHYSICAL_CELL_ID", "label": "PCI", "inventoryValue": "231", "networkValue": "213", "evidenceSource": "EMS-RAN export 2026-09-24", "isMatch": false } ],
  "allowedDispositions": ["ACCEPT_NETWORK", "ACCEPT_RECORD", "RAISE_WORKORDER", "APPROVE_EXCEPTION"],
  "rowVersion": 2
}
```

### 9.6 M8 RAN

```json
// GET /api/radio-cells/4410
{
  "id": 4410, "resourceId": 908812, "cellName": "BLR-277-S1-N78",
  "node": { "id": 2210, "neName": "BLR-277-GNB", "neClass": "GNODEB" },
  "sector": { "id": 3301, "sectorNo": 1, "name": "Alpha" },
  "technology": "NR", "band": "N78", "localCellId": 1, "cellIdentity": 5560321, "lacTac": 40021, "cellKey": "5560321",
  "physicalCellId": 213, "arfcnDl": 636666, "arfcnUl": null, "bandwidthMhz": 100, "rootSequenceIndex": 204,
  "maxTxPowerDbm": 43, "mimoMode": "4T4R", "cellStatus": "ON_AIR", "plannedOnAirDate": "2026-03-01", "onAirTime": "2026-03-04T10:00:00.000Z",
  "plmns": [ { "id": 1, "mcc": "404", "mnc": "45", "isPrimary": true } ],
  "antennas": [ { "id": 7701, "code": "ANT-S1-A", "antennaPorts": "1-4", "azimuthDeg": 30, "electricalTiltDeg": 4 } ],
  "radioUnits": [ { "neId": 2244, "neName": "BLR-277-RU-S1", "neClass": "RADIO_UNIT" } ],
  "rowVersion": 3
}
```

### 9.7 M10 Links · M12 Services · M13 Relationships (shapes only)

```ts
interface Link { id; resourceId; layer: string; category: string; isDirected: boolean; linkName?; circuitId?;
  a: { neId; neName; portId?; portName?; ip? }; z: { neId?; neName?; portId?; portName?; ip?; remoteName? };
  status; downReason?; capacityMbps?; recordSource; recordState; firstSeenTime?; lastSeenTime?;
  protocolAttr?: { localAsn?; remoteAsn?; ospfArea?; neighborState?; isisLevel? };
  microwaveAttr?: { frequencyBandGhz?; channelBandwidthMhz?; polarization?; maxModulation?; distanceKm?; isLicensed; licenseNumber?; protectionScheme?; fadeMarginDb? };
  rowVersion }
interface ServiceInstance { id; resourceId; serviceType; domain; name; status; referenceKind?; referenceValue?; customerRef?; bandwidthMbps?;
  recordSource; recordState; endpoints: { id; role; neId; neName; portId?; portName?; ipAddress?; adminStatus?; operStatus }[]; rowVersion }
interface Relationship { id; type; fromResource: ResourceRef; toResource: ResourceRef; sequenceNo; recordSource; recordState; externalSystemId? }
interface ResourceRef { resourceId; resourceClass; id; label; route }   // route = frontend path to the subtype screen
```

### 9.8 M16 Reports

```
GET  /api/reports/definitions?module=DISCOVERY|INVENTORY&featured=
POST /api/reports/definitions/{id}/actions/run { format: "PDF"|"XLSX"|"CSV", parameters? }  → 202 { runId }
GET  /api/reports/runs?definitionId=&status=&page=
GET  /api/reports/runs/{id}          → { id, name, reportType, generatedType, format, status, snapshotRef, fileSizeBytes, failureReason, completedTime }
GET  /api/reports/runs/{id}/file     → binary (signed URL alternative)
```

---

## 10. Mock API strategy

### 10.1 Principle

One interface per module; two implementations; the screen never knows which it got. The mock implementation must honour the same pagination, filtering, validation errors, `rowVersion` conflicts and action semantics as the real one, so that switching to `ApiXService` changes nothing above the service layer.

```ts
// src/services/scanJobs/ScanJobService.ts
export interface ScanJobService {
  list(q: ScanJobQuery): Promise<Page<ScanJobSummary>>;
  get(id: number): Promise<ScanJob>;
  create(body: ScanJobCreate): Promise<ScanJob>;
  update(id: number, body: ScanJobUpdate): Promise<ScanJob>;        // rejects with ApiError{code:'CONFLICT'} on stale rowVersion
  run(id: number): Promise<ScanRun>;
  hold(id: number, reason: string): Promise<ScanJob>;
  resume(id: number): Promise<ScanJob>;
  runs(id: number, q: PageQuery): Promise<Page<ScanRun>>;
  runTargets(runId: number, q: RunTargetQuery): Promise<Page<ScanRunTarget>>;
  steps(runTargetId: number): Promise<ScanStepResult[]>;
}

// src/services/scanJobs/MockScanJobService.ts
export class MockScanJobService implements ScanJobService { constructor(private store = createScanJobStore(seed)) { … } }

// src/services/scanJobs/ApiScanJobService.ts
export class ApiScanJobService implements ScanJobService { constructor(private http: HttpClient) { … } }

// src/services/index.ts
export const services = createServices(import.meta.env.VITE_API_MODE === 'api' ? apiFactory : mockFactory);
```

### 10.2 Mock implementation rules

1. **In-memory store per module**, seeded from `src/mock/<module>/*.ts` (the current `src/data/*.ts` files, reshaped to DTOs). Mutations update the store so a create shows up in the next list call.
2. **Same query semantics**: the mock applies `q`, filters, sort and paging in TypeScript so DataGrid behaves the same.
3. **Same errors**: stale `rowVersion` → `CONFLICT`; illegal lifecycle move → `ILLEGAL_TRANSITION`; unknown id → `NOT_FOUND`; validation → `VALIDATION` with `field`.
4. **Same action semantics**: `run()` creates a `ScanRun` in status `RUNNING`, then a timer flips it to a terminal status and generates run-target rows; `approve()` appends a `RuleEvent` and moves the status using the seeded transition table.
5. **Latency**: optional `VITE_MOCK_LATENCY_MS` to exercise loading states.
6. **Determinism**: seeds are static; generated ids continue from `max(id)+1`; no `Math.random()` in seeds (only in optional latency).
7. **Ids are numbers** as in the DB; codes (`RUL-RAN-001`, `RX-5001`, `DSC-SOUTH-CORE`) are display fields. Existing screens that route by human code (`/inventory/resource/:name`, `/discovery/targets/:host`) keep working through a lookup in the mock; the real API needs `GET …?code=` variants or a route migration to ids **[Needs validation]**.

### 10.3 Contract fixtures

Every DTO type lives in `src/services/<module>/types.ts` and is the single source for both implementations. Golden JSON fixtures in `tests/fixtures/<module>/*.json` are validated against those types by `tsc` (typed imports) and used by unit tests for both mock and, later, contract tests against the real API.

---

## 11. Mock data requirements

| Module | Entities | Minimum volume | Must-have variety | Source today |
|---|---|---|---|---|
| Reference | all 22 catalogs | as seeded in the dump | exact seed rows (Appendix A) | `inventory_seed.sql` (v3) + dump inserts (v4) |
| M1 | trust snapshots, summary counts | 30 days × 9 domains | trend up/down per domain | `discoveryOverview.ts` |
| M2 | scan jobs / scopes / targets / runs / run-targets / steps | 16 jobs, 60 targets, 5 runs each, 1 transcript per domain family | every `SCHEDULE_STATE`, every failure reason & stage, `SOURCE_KIND` collector vs external system | `legacy/app-data.js` JOBS/TARGETS |
| M3 | recon jobs / runs / results / fields / exceptions | 8 jobs, 3 runs each, 200 results, 25 exceptions | all 8 `RECON_STATE_MAP` outcomes, SLA on track / at risk / breached, bulk exception (`AFFECTED_RECORD_COUNT > 1`), auto-resolved | `reconciliationOps.ts`, `reconcileOverview.ts` |
| M4 | rules / conditions / events / executions | 14 rules | every status incl. `EXECUTING` and `RETIRED`, AND/OR chains, literal targets, all three origins | `rules.ts` |
| M5 | sites, geo L1–L4, areas, floors, rooms, racks, feeds, power units, tests, contacts, issues | 60 sites, full geo tree for 2 states, 5-level area tree | every `SITE_TYPE`, indoor/outdoor, overdue power test, open issue per category | `sites.json`, `locations.ts`, `facility.ts` |
| M6 | NEs + details, components, ports, health, movements | 200 NEs (25 classes × 9 domains), 3 000 ports | every stock state, every recon state, virtual + physical, PON tree, HA pair, stack | `physical.ts`, `domainDevices.ts`, `ledger.ts` |
| M7 | clusters, virtual NEs, instances | 3 clusters, 15 VNF/CNF | VM and container, host mapping | legacy virtual data |
| M8 | sectors, cells, antennas, PLMNs, slices | 10 sites × 3 sectors, 2G–5G cells | RAN sharing (2 PLMNs), multi-band antenna, RU shared by cells | legacy cell 4G/5G data |
| M9 | passive assets, patch cords, passive ports, fiber proxies | 100 assets over all seeded types, 20 proxies | `HAS_PORTS` and rack-mountable variants | legacy passive data |
| M10 | links + attrs | 150 links | all 8 layer categories, directed tunnels, down link with reason | legacy links data |
| M11 | subnets, VRFs, VLANs, port IPs | 40 subnets, 10 VRFs, 30 VLANs | IPv4 + IPv6, nested subnets, L3VPN context | none (new) |
| M12 | services + endpoints, slices | 40 services | all 12 seeded types | legacy services data |
| M13 | relationships | 60 edges | every relationship type, one 5-hop chain | none (new) |
| M14 | derived | — | at least one row per inactive tab | `archive.ts` |
| M15 | capex/opex plans, lines, actuals | 1 plan per site per FY | every category, 12 actuals | legacy capex/opex data |
| M16 | definitions, runs | existing catalog | every status incl. FAILED | `data/reports/*` |
| M17 | systems, proxies, refs, identities | 6 systems | discovery source vs non-source, unhealthy sync | none (new) |
| M18 | users, teams, members, models, policies, attribute defs | 20 users, 5 teams, 40 models | `USER_TYPE` human vs service, EoL model | `MOCK_USERS` in `rules.ts` |

---

## 12. CRUD / action matrix

Legend: **C**reate **R**ead **U**pdate **D**elete (soft) · **A** = action endpoint · **–** = not allowed from UI · ⓘ = integration writes it.

| Entity (table) | C | R | U | D | Actions from UI | Written by integration |
|---|---|---|---|---|---|---|
| Site, Floor, Room, Rack, Power feed, Contact, Issue | C | R | U | D | issue resolve | – |
| Power unit / Power unit test | C | R | U | D | record test (A) | – |
| Network element (+ detail) | C | R | U | – | move (A), decommission (A), recover (A) | ⓘ discovered rows, LAST_SEEN, RECON_STATE |
| Equipment component | C (manual) | R | U | – | – | ⓘ hardware tree |
| Port / Port IP / Port VLAN | C (manual) | R | U | – | – | ⓘ |
| NE health | – | R | – | – | – | ⓘ |
| NE movement | – | R | – | – | created by move (A) | ⓘ (install via work order) **[Needs validation]** |
| Virtual instance / Cloud cluster | C | R | U | – | lifecycle ops (A) → orchestrator **[Needs validation]** | ⓘ instantiation state |
| Radio sector / Cell / Antenna / PLMN / Slice | C | R | U | D | – | ⓘ cell parameters |
| Passive asset / Patch cord | C | R | U | D | – | – |
| External resource (fiber) | – | R | – | – | open in fiber app (link) | ⓘ |
| Link (+ attrs) | C (planned/physical) | R | U | D | – | ⓘ adjacency links |
| IP subnet / VRF / VLAN | C | R | U | D | – | ⓘ |
| Service instance / endpoint | C | R | U | D | – | ⓘ |
| Resource asset / attribute / technology | C | R | U | D | – | – |
| Resource relationship | C | R | – | D | impact query | ⓘ |
| Resource provenance / external ref | – | R | – | – | confirm field **[Needs validation]** | ⓘ |
| Scan job / scope | C | R | U | D | run, hold, resume (A) | ⓘ NEXT_RUN_TIME |
| Scan target | – | R | U (IS_ACTIVE) | – | – | ⓘ |
| Scan run / run target / step result / payload | – | R | – | – | view payload (permissioned) | ⓘ |
| Collector | – | R | – | – | – **[Needs validation: register?]** | ⓘ |
| Credential profile | C | R | U | D | rotate (vault) **[Needs validation]** | – |
| Recon job / job rule | C | R | U | D | run (A) | ⓘ |
| Recon run / run rule / result / result field | – | R | – | – | – | ⓘ |
| Recon exception | – | R | – | – | assign, dispose, raise work order, reopen (A) | ⓘ created / auto-resolved |
| Recon rule / condition | C | R | U (DRAFT only **[Inferred]**) | – | submit, approve, reject, request-changes, activate, suspend, resume, retire (A) | ⓘ start/finish execution |
| Recon rule event | – | R | – | – | created by actions | ⓘ |
| Capex / Opex plans, lines, actuals | C | R | U | D | – | – |
| Report definition | C | R | U | D | run (A) | – |
| Report run | – | R | – | – | download | ⓘ |
| Team / member | C | R | U | D | – | – |
| User / identity | – | R | – | – | – | ⓘ IAM |
| Operational area / geo | C | R | U | D | – | – |
| Product model | – | R | – | – | – | ⓘ catalog feed **[Needs validation]** |
| Product model policy | C | R | U | D | – | – |
| Attribute definition | C | R | U | D | – | – |
| External system | – | R | – | – | – **[Needs validation: registration CRUD]** | ⓘ |
| Global catalogs (DOMAIN, NE_CLASS, …) | – | R | – | – | – | seeded by release |

---

## 13. Integration boundaries map

```
                    ┌──────────────── UI (this repo) ────────────────┐
                    │  reads everything through /api                │
                    │  writes: master data (C tables) + actions     │
                    └───────┬───────────────┬───────────────┬───────┘
                            │               │               │
      ┌─────────────────────▼───┐   ┌───────▼────────┐   ┌──▼────────────────────┐
      │ Inventory service       │   │ Discovery svc  │   │ Reconciliation svc     │
      │ SITE…, NETWORK_ELEMENT… │   │ SCAN_JOB…      │   │ RECON_RULE…, RECON_JOB │
      │ LINK…, SERVICE…, RADIO… │◀──│ writes NE/PORT/│   │ RECON_RUN/RESULT       │
      │ PASSIVE…, CAPEX/OPEX    │   │ LINK/CELL with │──▶│ RECON_EXCEPTION (create│
      │ RESOURCE_* satellites   │   │ RECORD_SOURCE= │   │  + auto-resolve)       │
      │ REPORT_DEFINITION       │   │ DISCOVERED,    │   │ flips RULE EXECUTING   │
      │ TEAM, OPERATIONAL_AREA  │   │ PROVENANCE,    │   │ sets NE.RECON_STATE    │
      └─────────┬───────────────┘   │ NE_HEALTH      │   └────────────────────────┘
                │                   └───────┬────────┘
                │                           │ collectors (SNMP/SSH/NETCONF/TL1) ─▶ network
      ┌─────────▼───────────────┐   ┌───────▼────────────────────────────────────┐
      │ Reporting service       │   │ Integration / sync layer                    │
      │ REPORT_RUN, files,      │   │ EXTERNAL_SYSTEM registry                    │
      │ DOMAIN_TRUST_SNAPSHOT   │   │ EXTERNAL_RESOURCE  ◀── Fiber inventory app  │
      └─────────────────────────┘   │ RESOURCE_EXTERNAL_REF ◀── CMDB / CRM / LCM │
                                    │ USER, USER_IDENTITY ◀── IAM                 │
                                    │ PRODUCT_MODEL ◀── vendor catalog feed (?)   │
                                    └─────────────────────────────────────────────┘
```

Boundary rules the UI must respect:

| Boundary | UI may call | UI must not |
|---|---|---|
| Discovery | job CRUD, run/hold/resume, read runs/targets/steps | set run status, edit targets' outcomes, read raw payload without permission |
| Reconciliation | rule CRUD + lifecycle actions, job CRUD + run, exception actions | create results, create exceptions, edit `RECON_STATE` on resources |
| Reporting | run a definition, download | write `REPORT_RUN` rows |
| Fiber inventory | list proxies, deep-link | edit any fiber object attribute (none are stored here) |
| IAM | list users for pickers | create users, edit identities |
| Vault | store `vaultRef` | read or display any secret |

---

## 14. Unclassified / ambiguous tables

| Table | Ambiguity | Working assumption | Status |
|---|---|---|---|
| `VENDOR`, `VLAN`, `VRF` | DDL absent from the dump; only their FK targets are known | Columns inferred from FK targets and v3: `VENDOR(ID, CODE, NAME)`, `VLAN(ID, CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, VLAN_ID, NAME)`, `VRF(ID, CUSTOMER_ID, NETWORK_ELEMENT_ID_FK, NAME, ROUTE_DISTINGUISHER)` | **Needs validation** (request full dump) |
| `EXTERNAL_RESOURCE` | Whether the UI may show *anything* beyond `DISPLAY_LABEL` for fiber objects | Proxy view: label, type, external id, last sync, deep link | Needs validation |
| `SITE_ISSUE` | Who raises issues: UI users or a rollout system | UI CRUD | Needs validation |
| `COLLECTOR` | Registration is manual (UI) or automatic (agent enrolment) | Read-only in UI | Needs validation |
| `CREDENTIAL_PROFILE` | Whether creation happens here or in the vault UI | UI creates the reference only | Needs validation |
| `NE_MOVEMENT` | Installs might be posted by work-order integration rather than users | UI action for manual moves; integration for WO-driven | Needs validation |
| `RESOURCE_FIELD_PROVENANCE.IS_CONFIRMED` | Whether a user can "confirm" a discovered value | Read-only in Phase 1 | Needs validation |
| `NE_VIRTUAL_INSTANCE.INSTANTIATION_STATE` | Orchestrator ownership; lifecycle ops on the Virtual screen | Read-only state; actions deferred | Needs validation |
| `PRODUCT_MODEL` (global, no tenant) | Who maintains the catalog | Read-only in UI, tenant policy editable | Needs validation |
| `TEAM_MEMBER` | Team admin in this product or in IAM | This product | Needs validation |
| `DOMAIN_TRUST_SNAPSHOT.UNVERIFIED` | Nullable; unclear when it is absent | Show "—" when null | Inferred |
| `RECON_RESULT.MATCH_RULE` vs `RECON_RULE` | `MATCH_RULE` is a free-text identity-match label, not the FK | Display as text | Confirmed by column types |
| `SCAN_TARGET` code-based routing (`/discovery/targets/:host`) | Targets have no guaranteed hostname (comment: identity is IP) | Route by id, show host/IP | Confirmed by comment |
| Views mentioned in comments (`V_SCAN_RUN_SUMMARY`) and triggers (append-only) | Not present in dump | Assume they exist in the deployed DB; API must implement the derived figures either way | Needs validation |


---

## 15. Frontend folder structure

Adapted to the existing app (React 19, Vite, `src/screens`, `src/components`, `src/data`, `src/shell`, `src/routes.ts`, legacy bridge). The change is additive: `src/services` and `src/mock` are new; `src/data` shrinks as each module moves its seeds into `src/mock`.

```
src/
  app/                      # unchanged: App.tsx, LegacyView.tsx
  shell/                    # unchanged: Sidebar, Topbar, sideIcons, RouteTitle
  routes.ts                 # unchanged shape; new keys for M8, M11, M13, M17, M18
  components/               # unchanged shared UI (DataGrid, Drawer, ui.tsx, Lifecycle, Timeline, charts, GeoMap)
  services/
    core/
      http.ts               # fetch wrapper: base URL, bearer token, JSON, ApiError mapping, ETag cache for /ref
      types.ts              # Page<T>, Ref, Audit, ApiError, PageQuery
      registry.ts           # createServices(factory) + React context + useServices()
      mockStore.ts          # generic in-memory store: list/filter/sort/page, rowVersion checks, id sequence
    reference/              # ReferenceService, MockReferenceService, ApiReferenceService, types.ts
    insights/               # M1
    scanJobs/               # M2 (jobs, targets, runs, transcripts, collectors, credential profiles)
    reconciliation/         # M3 (jobs, runs, results, exceptions)
    rules/                  # M4
    sites/                  # M5 (sites, facility, geo, areas)
    networkElements/        # M6 (+ detail union types, components, ports, health, movements, resource satellites)
    virtual/                # M7
    ran/                    # M8
    passive/                # M9
    links/                  # M10
    ipam/                   # M11
    services/               # M12 (service instances)
    relationships/          # M13
    inactive/               # M14
    finance/                # M15
    reports/                # M16
    integrations/           # M17
    admin/                  # M18
    index.ts                # export const services = createServices(mode === 'api' ? apiFactory : mockFactory)
  mock/
    reference/              # seeds transcribed from the dump INSERTs (domains, ne-classes, link-layers, …)
    scanJobs/  reconciliation/  rules/  sites/  networkElements/  ran/  passive/  links/  ipam/
    services/  relationships/  finance/  reports/  integrations/  admin/
    scenarios/              # optional named scenario overlays (e.g. "all collectors down")
  modules/                  # thin hooks per module; screens stay in src/screens
    scanJobs/hooks.ts       # useScanJobs(query), useScanJob(id), useScanJobActions()
    …
  screens/                  # existing screens, progressively switched from src/data imports to hooks
  data/                     # legacy seeds; deleted module by module once moved into src/mock
legacy/                     # unchanged until each legacy screen is ported; legacy views may read through window.__services
tests/
  unit/                     # existing node --test suites + services/<module>.test.mjs (mock semantics)
  contract/                 # fixture JSON per endpoint, validated against types
  e2e.mjs                   # existing Playwright suite
```

Environment flags (Vite): `VITE_API_MODE=mock|api` (default `mock`), `VITE_API_BASE=/api`, `VITE_MOCK_LATENCY_MS=0`.

### 15.1 Taxonomy alignment (Phase 1 prerequisite)

- `src/data/discoveryOverview.ts` `DomainKey` grows from 4 to 9 codes matching `DOMAIN.CODE`; `DOMAIN_PARENT` gains `OPTICAL → TRANSPORT`, `MICROWAVE → TRANSPORT`. `DOMAIN_LABEL`/`DOMAIN_HEX` gain the five new entries. `tests/unit/domain-hierarchy.test.mjs` is updated accordingly.
- `src/data/ledger.ts` `NeClass` moves from 6 lowercase keys to the 25 `NE_CLASS.CODE` values; `PHY_TABS` becomes data-driven from the reference service (`NE_CLASS.SORT_ORDER`), grouped by `NE_CLASS_DOMAIN`.
- Stock states map 1:1: `planned→PLANNED, instore→IN_STORE, deployed→DEPLOYED, faulty→FAULTY_RMA, decomm→DECOMMISSIONED`.
- Recon states: `ok→VERIFIED, drift→DRIFTED, stale→STALE, miss→MISSING, none→NOT_DISCOVERED` (from `RECON_STATE_MAP`).
- Rule statuses already match the DB (`Draft…Retired`) apart from casing.

---

## 16. API structure (backend view)

Suggested resource layout for the Spring Boot inventory service and the two engines; all paths under `/api`, tenant from the token, JSON, `ETag` on reference resources.

```
/api/ref/…                                  reference catalogs (GET only)
/api/sites, /api/sites/{id}/…               M5 (+ capex/opex sub-resources for M15)
/api/racks/{id}, /api/power-units/{id}      M5/M9 shared
/api/network-elements, …/{id}/…             M6 (detail union, components, ports, health, movements, actions)
/api/resources/{resourceId}/…               satellites shared by all subtypes (asset, attributes, technologies,
                                            provenance, external-refs, relationships, impact)
/api/cloud-clusters, /api/virtual-instances M7
/api/radio-cells, /api/antennas, /api/plmns, /api/network-slices     M8
/api/passive-assets, /api/external-resources                         M9
/api/links                                  M10
/api/ip-subnets                             M11
/api/services                               M12
/api/inactive                               M14 (read model)
/api/capex-plans, /api/opex-plans           M15
/api/reports/definitions, /api/reports/runs M16
/api/external-systems                       M17
/api/users, /api/teams, /api/operational-areas, /api/attribute-definitions, /api/product-models/{id}/policy   M18
/api/insights/…                             M1 (read models)
/api/scan-jobs, /api/scan-runs, /api/scan-targets, /api/scan-run-targets, /api/collectors, /api/credential-profiles   M2 (Discovery svc)
/api/recon-jobs, /api/recon-runs, /api/recon-results, /api/recon-exceptions, /api/recon-rules                        M3/M4 (Reconciliation svc)
```

Conventions: list = `GET` with query params, detail = `GET /{id}`, create = `POST`, update = `PUT /{id}` (full DTO with `rowVersion`), soft delete = `DELETE /{id}` (sets `IS_DELETED` / `RECORD_STATE`), state changes = `POST /{id}/actions/{verb}`. Long-running actions return `202` with a run id.

---

## 17. Mock → real API migration plan

| Step | What changes | What stays |
|---|---|---|
| 1. Contract freeze per module | `types.ts` reviewed with the backend team; fixtures agreed | screens, hooks |
| 2. `ApiXService` implemented | fetch calls mapped 1:1 to interface methods; error mapping to `ApiError` | mock service, screens |
| 3. Contract tests | fixtures replayed against a dev backend (`tests/contract`) | — |
| 4. Feature flag | `VITE_API_MODE=api` per environment; optional per-module override `VITE_API_MODULES=rules,sites` for gradual cut-over | mock stays available for demos and e2e |
| 5. Route migration | code-based routes (`/inventory/resource/:name`, `/discovery/targets/:host`) get id-based equivalents; old paths redirect via a lookup call | — |
| 6. Remove seeds | `src/mock/<module>` kept for tests only; `src/data` entries deleted | — |

Non-negotiables during migration: the mock must keep passing the same unit tests as the API adapter (shared test suite parameterised by implementation), and every screen must survive `rowVersion` conflicts and 4xx errors surfaced by the real API.

---

## 18. Phase 1 — modules ready for mock implementation

Master data and screens that already exist, with no dependency on engine contracts.

| Module | Reason it is Phase 1 |
|---|---|
| Shared Reference API | All seeds exist in the dump; unblocks everything else |
| M5 Location & Facility | Pure master data; screens exist |
| M6 Network Elements | Core of the product; detail tables fully specified; screens exist |
| M7 Virtual Resources (read) | Subset of M6 |
| M9 Passive Infrastructure (assets) | Master data; fiber proxies deferred to Phase 2 |
| M10 Connectivity | Simple aggregate; screen exists |
| M12 Services | Simple aggregate; screen exists |
| M14 Inactive Inventory | Derived from M6/M10/M12 |
| M15 Finance | Self-contained; screens exist |
| M16 Reports (catalog) | Definitions only; runs in Phase 2 |
| M4 Reconciliation Rules | Business-owned lifecycle fully specified by `RECON_RULE_TRANSITION`; screens exist |
| M1 Insights (mock read model) | Screen exists; mock figures derived from other mocks |

## 19. Phase 2 — modules needing integration contracts

| Module | Contract needed from |
|---|---|
| M2 Scan Jobs & Targets | Discovery service: job definition schema, action semantics, run/target/step DTOs, payload permission model |
| M3 Reconciliation Operations | Reconciliation service: run/result DTOs, exception creation and auto-resolve, disposition side effects (`RECON_STATE_MAP`) |
| M16 Reports (runs) | Reporting service: run trigger, status polling, file delivery |
| M17 External Systems | Integration layer: registry read model, sync status, proxy listing |
| M9 fiber proxies | Fiber inventory adapter: object types, deep-link URL pattern |
| M1 Insights (real) | Aggregation endpoints |

## 20. Phase 3 — modules needing business validation

| Module | Open decision |
|---|---|
| M8 RAN Inventory | Scope of manual editing of discovered cell/antenna data; whether sectors/antennas are managed here or in the planning tool |
| M11 IP & Logical | Whether IPAM is in product scope; missing `VLAN`/`VRF` DDL |
| M13 Relationships & Impact | Which relationship types users may create manually; impact depth and presentation |
| M18 Administration & Catalogs | Ownership of teams, product catalog, operational areas vs IAM/ERP |
| M7 lifecycle actions | Orchestrator integration for VNF operations |

---

## 21. Implementation sequence

1. **Foundation (week 1–2):** `services/core`, `services/reference` + mock seeds from the dump, `createServices`, env flag, taxonomy alignment (9 domains, 25 classes), unit test harness parameterised by implementation.
2. **M5 Sites → M6 Network Elements (week 2–6):** types, mock stores, hooks; switch existing screens (`PhysicalResources`, `SiteDetails`, `SiteEquipment`, `node`, `resource`) to hooks; add detail-union panel and Hardware/Ports/Movements/Provenance tabs; port `location` legacy list.
3. **M10 Links, M12 Services, M14 Inactive, M15 Finance (week 6–9):** port legacy screens to React on top of services.
4. **M4 Rules, M1 Insights, M16 Reports catalog (week 9–11):** move existing React data to services; derive rule buttons from transitions.
5. **M7 Virtual, M9 Passive assets (week 11–13):** port legacy screens.
6. **Phase 2 (after contracts):** M2, M3, M16 runs, M17, M9 fiber proxies; `ApiXService` for Phase 1 modules in parallel as backend endpoints land.
7. **Phase 3 (after validation):** M8, M11, M13, M18, M7 actions.

## 22. Dependencies

```
Reference API ──▶ every module
M5 Sites ──▶ M6 NE ──▶ M7 Virtual, M10 Links, M12 Services, M14 Inactive, M13 Relationships, M11 IPAM
M5 Sites ──▶ M9 Passive, M15 Finance, M8 RAN
M6 NE + M8 RAN ──▶ M3 Reconciliation (subject links)
M4 Rules ──▶ M3 Reconciliation (rule links)      M18 users/teams ──▶ M4, M3, M15, M5 issues
M2 Scan ──▶ M3 (scan run → recon run), M1 Insights
M17 External systems ──▶ M9 fiber proxies, provenance panels, M2 (external discovery sources)
M1 Insights ◀── M2, M3, M6 (aggregates)          M16 Reports ◀── M1 (trend)
```

External dependencies: Discovery service contract (M2, M1), Reconciliation service contract (M3, M4 execution flips), Reporting service (M16), Fiber inventory adapter (M9), IAM (M18), Vault (M2 credential profiles).

## 23. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Taxonomy drift (4 vs 9 domains, 6 vs 25 classes) | Every list/filter/tab | Do it first; drive tabs from the reference service, not constants |
| Missing DDL for `VENDOR`, `VLAN`, `VRF` | M6 pickers, M11 | Request the full dump; keep DTOs minimal until confirmed |
| Fiber plant moved out of the DB | Three existing screens (ducts, spans, splices) lose their data model | Re-frame as proxy views early; agree deep-link contract |
| Code-based routes vs numeric ids | Deep links break on real API | Add `?code=` lookups; migrate routes with redirects |
| Actions vs edits | Screens that currently "edit status" (rules, stock, exceptions) must become action calls | Mock enforces transitions from seeded tables so mistakes surface now |
| Integration-owned tables treated as editable in mocks | False expectations in demos | Mock services expose read-only methods only for B tables |
| Composite tenant keys in the API | Backend must never accept a foreign `customerId` | Tenant from token only; DTOs omit `customerId` |
| Encrypted payloads / PII | Accidental exposure in transcript or contact panels | Separate permissioned endpoints; UI shows "restricted" state |
| Volume (`PORT`, `SCAN_STEP_RESULT`, `RECON_RESULT` are the big tables) | Slow grids | Server paging mandatory; mocks page too, so UIs never assume full arrays |
| Legacy bridge screens | Two rendering paths during migration | Port screen by screen; legacy reads through the same service registry via `window` bridge where needed |

## 24. Questions for the business team

1. May users edit fields that discovery populated (`RECORD_SOURCE = DISCOVERED`)? If yes, does a manual edit set provenance `SOURCE = MANUAL` and win over the next discovery?
2. Which stock moves are manual (UI) and which come from work orders? Is `WORK_ORDER_REF` mandatory for installs and decommissions?
3. Who may approve rules and dispose of exceptions: fixed roles per rule (as modelled) or team membership?
4. Are RAN sectors, antennas and cells maintained here or in a planning tool that this product only mirrors?
5. Is IPAM (subnets, VRFs, VLANs) in scope for this product's UI?
6. Fiber plant is external: what should the Ducts / Fiber spans / Splice screens show, and where do they link?
7. Do capex/opex figures come from an ERP, or are they entered here?
8. Which reports are self-service (run on demand) and which are scheduled only?
9. Is the "Unassigned" team really the absence of a team (NULL) in the UI, and does SLA start at detection time?
10. Should the 9-domain taxonomy be shown fully in navigation, or grouped as today (RAN, Core, Transport with sub-domains)?

## 25. Questions for the integration team

1. Confirm the missing DDL for `VENDOR`, `VLAN`, `VRF` and whether views (`V_SCAN_RUN_SUMMARY` etc.) and append-only triggers exist in the deployed database.
2. Discovery service: what is the job definition contract (scopes, schedule, held reason), and are `run/hold/resume` synchronous or `202 + polling`?
3. Payload access: which role may read decrypted `SCAN_STEP_PAYLOAD`, and is it served inline or as a time-limited download?
4. Reconciliation service: are exceptions created only by the engine, and what does each disposition do to `NETWORK_ELEMENT.RECON_STATE` (per `RECON_STATE_MAP`)?
5. Who flips rules to `EXECUTING` and back, and how does the UI learn about it (polling interval, SSE, websocket)?
6. Collector registration and health: pushed by agents, or configured through this UI?
7. Credential profiles: is the vault reference created here, or does the vault UI push it?
8. External systems: is the registry maintained by configuration or through an admin UI here?
9. Product model catalog: maintained per release, per tenant import, or from a vendor feed?
10. IAM: is `USER.DISPLAY_NAME` synced, and does the token carry `CUSTOMER_ID` and role claims needed for `allowedActions`?
11. Are numeric ids stable across environments, or should the UI route by `CODE` for jobs, rules, exceptions and sites?

---

## 26. Final architecture summary

- **18 UI modules** over **118 tables**; no module maps to a single table, and no table is reachable from the UI except through a module's service interface.
- **Three aggregate roots** carry most of the UI: `SITE` (M5), `NETWORK_ELEMENT` (M6) and `RECON_RULE`/`RECON_EXCEPTION` (M3/M4). Everything else hangs off them by FK.
- **Ownership is explicit**: 63 core tables are written by the inventory service on behalf of users; 21 are written by integration engines and exposed to the UI as read models plus actions; 28 reference tables are seeded and read-only; 6 are technical.
- **One contract, two implementations**: every module has `XService` (interface + DTO types), `MockXService` (in-memory, same semantics incl. errors and lifecycle rules) and `ApiXService` (HTTP). Switching is an environment flag, per module if needed.
- **Existing screens are preserved**: 14 modules correspond to screens already in `src/routes.ts`; the work is to re-source them through services and align taxonomy, not to redesign them.
- **New modules are few and justified by the schema**: RAN Inventory (8 tables with no screen today), IP & Logical (5), Relationships & Impact (4), External Systems (5), Administration & Catalogs (small lists).
- **Phasing**: Phase 1 = 12 mock-ready modules; Phase 2 = 6 modules waiting on integration contracts; Phase 3 = 5 modules waiting on business validation.

---

## 27. Appendix A — seeded reference data in the dump [Confirmed]

| Table | Rows | Values (abridged) |
|---|---|---|
| `DOMAIN` | 9 | RAN, CORE, TRANSPORT, IP_MPLS (⊂ TRANSPORT), OPTICAL (⊂ TRANSPORT), MICROWAVE (⊂ TRANSPORT), FIXED_ACCESS, IT_CLOUD, FACILITY |
| `NE_CLASS` | 25 | ROUTER, SWITCH, FIREWALL, SECURITY_APPLIANCE, SERVER, OPTICAL, MICROWAVE, OLT, ONU, ONT, WIFI_AP, WLAN_CONTROLLER, BTS, BSC, NODEB, RNC, ENODEB, GNODEB, GNB_CU, GNB_DU, BBU, RADIO_UNIT, CORE_NF, POWER_CONTROLLER, OTHER — each with its `DETAIL_TABLE` and `CAN_BE_VIRTUAL` |
| `NE_CLASS_DOMAIN` | seeded | allowed (class, domain) pairs |
| `RESOURCE_CLASS` | 21 | ANTENNA, CLOUD_CLUSTER, EQUIPMENT_COMPONENT, EXTERNAL_RESOURCE, IP_SUBNET, LINK, LOGICAL_INTERFACE, NETWORK_SLICE, PASSIVE_ASSET, PASSIVE_PORT, PHYSICAL_NE, PORT, POWER_UNIT, RACK, RADIO_CELL, RADIO_SECTOR, SERVICE, SITE, VIRTUAL_NE, VLAN, VRF |
| `LINK_LAYER` | 45 | PHYSICAL; LLDP, CDP, LAG; OSPF, ISIS, BGP, LDP; RSVP_TE_LSP, SR_POLICY, PSEUDOWIRE, VXLAN, GRE; OCH, OTN_ODU, OMS; MICROWAVE_HOP; CPRI, ECPRI; ABIS, IUB, IUR, S1_MME, S1_U, X2, NG_C, NG_U, XN, F1_C, F1_U, E1 … (categories PHYSICAL, L2_ADJACENCY, ROUTING_ADJACENCY, TUNNEL, OPTICAL, MICROWAVE, FRONTHAUL, RAN_INTERFACE) |
| `TECHNOLOGY` | seeded | GSM, UMTS, LTE, LTE_M, NB_IOT, NR (RADIO_ACCESS); CS_CORE, EPC, 5GC, IMS (CORE); ETHERNET, IP, MPLS, SR_MPLS, SRV6 (PACKET_TRANSPORT); SDH, OTN, DWDM, MICROWAVE … |
| `FREQUENCY_BAND` | seeded | per technology with duplex mode and DL/UL ranges |
| `SERVICE_TYPE` | 12 | L3VPN, L2VPN_VPWS, L2VPN_VPLS, EVPN, INTERNET_ACCESS (IP_MPLS); MOBILE_BACKHAUL, ETHERNET_CIRCUIT (TRANSPORT); WAVELENGTH, OTN_CIRCUIT (OPTICAL); MICROWAVE_CIRCUIT; APN_DNN, VOICE (CORE) |
| `PASSIVE_ASSET_TYPE` | seeded | TOWER, MAST, POLE, SHELTER, OUTDOOR_CABINET, ODF, DDF, PATCH_PANEL, PATCH_CORD, CABLE_TRAY, FEEDER_CABLE, JUMPER_CABLE, RF_COMBINER, RF_SPLITTER, TMA, DIPLEXER, GPS_ANTENNA, EARTHING, AIR_CONDITIONER … |
| `NETWORK_FUNCTION_TYPE` | seeded | MSC, HLR, SGSN, GGSN (CS_CORE); MME, SGW, PGW, HSS, PCRF (EPC); AMF … (5GC); IMS functions |
| `NE_STOCK_TRANSITION` | 14 | PLANNED→IN_STORE (RECEIVE), →IN_TRANSIT (DISPATCH), →DEPLOYED (INSTALL); IN_STORE→IN_TRANSIT (ISSUE), →DEPLOYED (INSTALL), →DECOMMISSIONED (SCRAP); IN_TRANSIT→IN_STORE, →DEPLOYED; DEPLOYED→IN_STORE (DE_INSTALL), →FAULTY_RMA (RMA_OUT), →DECOMMISSIONED; FAULTY_RMA→IN_STORE (RMA_IN), →DECOMMISSIONED (SCRAP); DECOMMISSIONED→IN_STORE (RECOVER) |
| `RECON_RULE_TRANSITION` | 12 | DRAFT→REVIEW (SUBMIT_FOR_REVIEW, OWNER); REVIEW→APPROVED (APPROVE, APPROVER); REVIEW→DRAFT (REJECT, APPROVER / REQUEST_CHANGES, REVIEWER); APPROVED→ACTIVE (ACTIVATE, OWNER); ACTIVE↔EXECUTING (SYSTEM); ACTIVE↔SUSPENDED (OWNER); ACTIVE/SUSPENDED/DRAFT→RETIRED (RETIRE, OWNER) |
| `RECON_STATE_MAP` | 8 | MATCHED→VERIFIED/EXACT_MATCH; ATTRIBUTE_MISMATCH→DRIFTED; RELATIONSHIP_DRIFT→DRIFTED; STALE→STALE; MISSING_NO_LIVE_PEER→MISSING; EXTRA_NO_RECORD→NOT_DISCOVERED/ROGUE; UNRESOLVED_MATCH→DUPLICATE/UNCLAIMED; NOT_COMPARABLE→NOT_DISCOVERED/NO_ADAPTER |
| `RECON_FIELD` | seeded | ANTENNA_HEIGHT_M, AZIMUTH_DEG, ELECTRICAL_TILT_DEG, MECHANICAL_TILT_DEG (ANTENNA); ARFCN_DL, CELL_IDENTITY, LAC_TAC, PHYSICAL_CELL_ID (RADIO_CELL); INSTANCE_UUID (VIRTUAL_NE); LINK_NEIGHBOR (LINK); MAC_ADDRESS, MANAGEMENT_IP, NE_NAME (PHYSICAL_NE); OPER_STATUS (any) … |
| `RELATIONSHIP_TYPE` | 8 | BACKHAULED_BY, CARRIED_BY (ordered), DEPENDS_ON, POWERED_BY, REDUNDANT_WITH (non-impacting, cyclic), RIDES_OVER (ordered), SERVED_BY, TERMINATES_ON |
| `RELATIONSHIP_RULE` | seeded | allowed (type, from class, to class) triples |
| `EXTERNAL_OBJECT_TYPE` | seeded | CI (CMDB); CUSTOMER_ORDER (CRM); DUCT, FIBER_CABLE, FIBER_CIRCUIT, FIBER_SPAN, FIBER_STRAND, ODN_SPLITTER, SPLICE_CLOSURE … (FIBER_INVENTORY); LCM_SERVICE (LCM) |

Not seeded in the dump (values must be confirmed): `SITE_TYPE`, `DISCREPANCY_TYPE`, `DISCOVERY_STEP_DEF`, `VENDOR`, `PRODUCT_MODEL`.

## 28. Appendix B — coverage verification

- Section 3 lists **118** rows: the 115 `CREATE TABLE` statements in the dump plus `VENDOR`, `VLAN`, `VRF`.
- Every row has a category (A–E), an ownership, a suggested module and a mock/API note.
- Every module in section 6 names its tables; the union of those table lists covers all 118 (reference tables are covered by "Shared: Reference API" and M18).
- Category totals: C 63 + D 28 + B 21 + E 6 = 118.
- The generator that produced section 3 from the DDL (`gen_inventory.py`) and the parsed table JSON (`v4_tables.json`) are session artefacts; the DDL digest can be regenerated from the dump at any time.
