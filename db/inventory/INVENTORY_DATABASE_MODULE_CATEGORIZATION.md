# INVENTORY DATABASE — MODULE CATEGORIZATION & OWNERSHIP ANALYSIS

> **Status (2026-09-30).** This document analyses the v4 dump (115 tables, original names). Its decisions are now applied: the current schema is `inventory_schema.sql` **v7** with 100 tables limited to the Inventory, Discovery and Reconciliation modules. Tables owned by other modules were removed (User Management: `USER_IDENTITY`, `TEAM_MEMBER`, `TEAM`; Passive Inventory: `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, `POWER_UNIT`, `POWER_UNIT_TEST`, `FLOOR`, `ROOM`, `RACK`, `POWER_FEED`; Open / CoPEX: `CAPEX_*`, `OPEX_*`), and names changed (`NE_*` → `NETWORK_ELEMENT_*`, `RECON_*` → `RECONCILIATION_*`, `*_CLASS` → `*_TYPE`, `EXTERNAL_OBJECT_TYPE` → `EXTERNAL_ENTITY_TYPE`). For the current state read `INVENTORY_DATABASE.md`, `ER_DIAGRAM.md` and `INVENTORY_TABLE_USAGE_AND_MOCK_API.md`.

**Product:** NetSingularity Discovery & Inventory
**Input analysed:** `INVENTORY_SCHEMA.sql` (mysqldump 10.13, MySQL 9.5.0, database `INVENTORY`, dump completed 2026-09-24)
**Companion document:** `DATABASE_UI_MODULE_IDEATION.md` (UI module and mock-API ideation over the same schema)
**Date:** 2026-09-26
**Nature of this document:** analysis and future-state planning only

Evidence levels used throughout:

| Marker | Meaning |
|---|---|
| **[Schema]** | Confirmed by the DDL: table comment, column, constraint or seed row |
| **[Inferred]** | Strongly inferred from names, comments, FK structure or the existing UI |
| **[Validate]** | Needs business or integration validation; the schema does not settle it |

---

## Table of contents

1. Executive Summary
2. Scope and Analysis-Only Disclaimer
3. Organizational Context
4. Current Database Overview
5. Complete Table Inventory
6. Master Table Categorization
7. Inventory-Owned Tables
8. User Management Integration
9. Passive Inventory Integration
10. Open / CoPEX Module Separation
11. JOB / NiFi / Spark Integration
12. Reference and Lookup Tables
13. Technical / Audit Tables
14. Foreign Key Dependency Analysis
15. UI Relevance Analysis
16. Cross-Module Ownership Matrix
17. Tables That Should Remain in Inventory
18. Tables That Should Eventually Move Out
19. Tables That Require External Integration
20. Mock API Planning
21. Current-State Architecture
22. Future-State Architecture
23. Current vs Future Ownership
24. Proposed Module Boundaries
25. Future Removal Preconditions
26. Unknowns / Business Validation Required
27. Recommended Next Steps
28. Final Table-by-Table Decision Matrix

---

## 1. Executive Summary

The Inventory database holds **118 tables**: 115 defined in the dump plus `VENDOR`, `VLAN` and `VRF`, which are referenced by foreign keys but whose DDL is absent from the file. After separating the four external responsibilities named in the brief (User Management, Passive Inventory, Open/CoPEX, NiFi/Spark/integration jobs), the picture is:

| Decision | Tables | What it means |
|---|---|---|
| **KEEP** | 62 | Genuine Inventory ownership: network elements and their eleven class details, hardware, ports, links, services, RAN radio layer, sites and facility layout, resource satellites, reconciliation rules and exceptions, report catalogue, and 24 Inventory-owned reference tables |
| **KEEP — REFERENCE** | 2 | `USER`, `TENANT`: domain owned elsewhere, minimal local row required for foreign keys |
| **TECHNICAL / INTEGRATION** | 20 | Discovery and reconciliation job definitions, executions, results, transcripts, collectors, credential references, report runs, provenance, health, KPI snapshots. Keep for now; treat as integration entities, not Inventory business entities |
| **FUTURE MOVE** | 12 | Passive assets and their type catalog, patch cords, power units and tests (Passive Inventory); the six `CAPEX_*` / `OPEX_*` tables (Open/CoPEX); `USER_IDENTITY` (User Management) |
| **INTEGRATE** | 4 | `EXTERNAL_SYSTEM`, `EXTERNAL_RESOURCE`, `EXTERNAL_OBJECT_TYPE`, `RESOURCE_EXTERNAL_REF`: the cross-system proxy and reference mechanism already built into the schema |
| **VALIDATE** | 18 | `RACK`, `ANTENNA`, `POWER_FEED` (Passive vs Inventory split), `TEAM`, `TEAM_MEMBER` (User Management groups vs Inventory queues), `RESOURCE_ASSET` (commercial data), geography and operational-area hierarchies (shared master data), `VENDOR` / `PRODUCT_MODEL` (shared catalog), `SITE_CONTACT`, `SITE_ISSUE`, `NE_VIRTUAL_INSTANCE`, `VLAN`, `VRF` |

Key findings:

1. **The schema already encodes the Passive boundary.** `RESOURCE_CLASS.INVENTORY_CATEGORY = 'PASSIVE'` is set on exactly five classes: `ANTENNA`, `PASSIVE_ASSET`, `PASSIVE_PORT`, `POWER_UNIT`, `RACK` **[Schema]**. `PASSIVE_ASSET` and `PASSIVE_ASSET_TYPE` carry the comment "fiber plant excluded" and fiber objects are already proxied through `EXTERNAL_RESOURCE` **[Schema]**. The same proxy pattern is the natural target for the rest of Passive Inventory.
2. **The `USER` table is a deliberate reference copy.** Its comment states "No email or other contact PII is stored; IAM owns it" **[Schema]**. Eleven Inventory tables reference it through thirteen FK columns. `USER_IDENTITY` (external identities) is the one table that duplicates User Management's domain.
3. **There is no table named `JOB`.** The job-like families are `SCAN_JOB` (+ scope, target, run, run-target, step result, payload) and `RECON_JOB` (+ job-rule, run, run-rule, result, result-field), plus `REPORT_RUN`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `NE_HEALTH`, `DOMAIN_TRUST_SNAPSHOT`. These are execution and pipeline artefacts and are classified as integration entities. Reconciliation **rules** and **exceptions**, by contrast, are business objects that protect the inventory golden record and remain Inventory-owned, pending a decision on whether Reconciliation becomes a module of its own.
4. **"Open / CoPEX" has no literal table match.** The only financial tables are `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL`, which back the existing Capex / Opex screens under Site details. This analysis treats "CoPEX" as that Capex + Opex family and "Open" as Opex. **[Validate]** the interpretation before acting on section 10.
5. **79 foreign keys cross a proposed ownership boundary** (section 14). Most point *into* Inventory (external modules referencing `SITE`, `RESOURCE`, `USER`, `VENDOR`, `DOMAIN`), which is the easy direction. Eight point *out of* Inventory into Passive or Integration tables (`NETWORK_ELEMENT.RACK_ID_FK`, `NE_POWER_DETAIL.POWER_UNIT_ID_FK`, `CELL_ANTENNA.ANTENNA_ID_FK`, `PORT.PASSIVE_ASSET_ID_FK`, `RECON_EXCEPTION.RECON_RESULT_ID_FK`, `RECON_EXCEPTION.SCAN_TARGET_ID_FK`, `RESOURCE_RELATIONSHIP.EXTERNAL_SYSTEM_ID_FK`, `SCAN_STEP_PAYLOAD → SCAN_STEP_RESULT` internal) and are the ones that decide whether a move is feasible.
6. **Nothing needs to change now.** Every row of the final matrix carries `Action Now = No change`.

---

## 2. Scope and Analysis-Only Disclaimer

This document:

- does **not** modify any code, SQL, schema, migration, API, UI or service;
- does **not** delete, rename or move any table;
- does **not** implement any integration, CDC feed or Mock API;
- records **future-state recommendations** and the preconditions that must hold before any of them is acted on.

Where the schema does not settle ownership, the table is marked `VALIDATE` with `Confidence: Low` or `Medium` and the open question is listed in section 26.

---

## 3. Organizational Context

```
Inventory Module (this database)
       │
       ├── Inventory-owned data ............ network elements, hardware, ports, links, services, RAN,
       │                                     sites & facility layout, resource satellites, recon rules & exceptions,
       │                                     report catalogue, Inventory reference data
       │
       ├── User Management integration ..... USER (CDC reference copy), TENANT; USER_IDENTITY and possibly TEAM belong there
       │
       ├── Passive Inventory integration ... PASSIVE_ASSET(+TYPE), PATCH_CORD, POWER_UNIT(+TEST); RACK, ANTENNA, POWER_FEED to decide
       │
       ├── Open / CoPEX integration ........ CAPEX_* / OPEX_* (6 tables); RESOURCE_ASSET to decide
       │
       └── NiFi / Spark / Job integration .. SCAN_* family, RECON_JOB/RUN/RESULT family, COLLECTOR, CREDENTIAL_PROFILE,
                                             REPORT_RUN, NE_HEALTH, PROVENANCE, EXTERNAL_* registry, DOMAIN_TRUST_SNAPSHOT
```

Assumptions taken from the brief (not from the schema): the modules are deployed independently; User Management feeds Inventory by CDC; Passive Inventory and Open/CoPEX are reached by API (Open/CoPEX mocked for now); NiFi/Spark pipelines execute discovery and reconciliation jobs behind an integration layer.

---

## 4. Current Database Overview

| Item | Value | Evidence |
|---|---|---|
| Tables with DDL | 115 | dump |
| Tables referenced but not defined | 3 (`VENDOR`, `VLAN`, `VRF`) | FK targets |
| Seeded tables | 17 (global catalogs) | `INSERT` statements |
| Views / triggers / routines | none in dump (comments mention `V_SCAN_RUN_SUMMARY` and trigger-enforced append-only tables) | **[Validate]** |
| Tenancy | `TENANT` root; every tenant table carries `CUSTOMER_ID` and composite `(CUSTOMER_ID, ID)` unique keys used as FK targets | **[Schema]** |
| Supertype | `RESOURCE` with 21 `RESOURCE_CLASS` rows; each subtype table has an `ON DELETE CASCADE` FK to it | **[Schema]** |
| Audit columns | `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION` on every mutable table; `CREATOR`/`LAST_MODIFIER` are plain `BIGINT` (no FK to `USER`) | **[Schema]** |
| Soft delete | `IS_DELETED` + generated `LIVE_FLAG` (master data) or `RECORD_STATE` + generated `ACTIVE_FLAG` (discovered data) | **[Schema]** |
| Separate audit tables | none (`*_AUD`, `REVINFO` absent) — auditing belongs to another module | **[Schema]** |
| Encryption | `SCAN_STEP_PAYLOAD.CONTENT_ENC`, `SITE_CONTACT.PHONE_ENC/EMAIL_ENC` (AES, key reference) | **[Schema]** |
| Secrets | never stored; `VAULT_REF` on `CREDENTIAL_PROFILE` and `EXTERNAL_SYSTEM` | **[Schema]** |

### 4.1 External domains currently represented locally [Schema]

| External domain | Local representation today |
|---|---|
| Users | `USER` (reference copy, no PII), `USER_IDENTITY` (external identities), `TEAM`, `TEAM_MEMBER` |
| Passive inventory | `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, `POWER_UNIT`, `POWER_UNIT_TEST`, `RACK`, `ANTENNA`, passive rows of `PORT`; fiber plant already externalised as `EXTERNAL_RESOURCE` |
| Finance (Capex / Opex) | `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL`, and commercial fields in `RESOURCE_ASSET` |
| Jobs / pipelines | `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF`, `RECON_JOB`, `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD`, `REPORT_RUN`, `NE_HEALTH`, `DOMAIN_TRUST_SNAPSHOT`, `RESOURCE_FIELD_PROVENANCE` |
| Other systems | `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REF` |

---

## 5. Complete Table Inventory

All 118 tables, alphabetical. Purpose is the DDL table comment verbatim **[Schema]**. "Referenced by" counts child tables (excluding the universal `CUSTOMER_ID → TENANT`).

| # | Table | Purpose (DDL comment) | PK | Columns | FKs (excl. CUSTOMER_ID→TENANT) | Referenced by |
|---|---|---|---|---|---|---|
| 1 | `ANTENNA` | Installed RF antenna with sector, mounting, azimuth and tilts. | ID | 31 | MOUNT_ASSET_ID_FK→PASSIVE_ASSET, PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RADIO_SECTOR_ID_FK→RADIO_SECTOR, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, VENDOR_ID_FK→VENDOR | 1 |
| 2 | `ATTRIBUTE_DEFINITION` | Typed definition of an extensible attribute for one resource class. | ID | 15 | RESOURCE_CLASS→RESOURCE_CLASS, TECHNOLOGY_ID_FK→TECHNOLOGY, VENDOR_ID_FK→VENDOR | 1 |
| 3 | `CAPEX_LINE` | Capex line item (equipment, civil works, power, fiber, installation, licence). | ID | 16 | CAPEX_PLAN_ID_FK→CAPEX_PLAN, VENDOR_ID_FK→VENDOR | 1 |
| 4 | `CAPEX_LINE_RESOURCE` | Resource funded by a CAPEX line. | ID | 9 | CAPEX_LINE_ID_FK→CAPEX_LINE, RESOURCE_ID_FK→RESOURCE | 0 |
| 5 | `CAPEX_PLAN` | Capital plan of a site for a financial year (AFE, cost centre, approved amount). | ID | 14 | OWNER_ID_FK→USER, SITE_ID_FK→SITE | 1 |
| 6 | `CELL_ANTENNA` | Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells). | ID | 10 | ANTENNA_ID_FK→ANTENNA, RADIO_CELL_ID_FK→RADIO_CELL | 0 |
| 7 | `CELL_RADIO_UNIT` | Radio unit(s) (RRU / RRH / AAU, NE class RADIO_UNIT) that transmit a cell; one RU carries many cells. | ID | 10 | RADIO_CELL_ID_FK→RADIO_CELL, RADIO_UNIT_NE_CLASS→NETWORK_ELEMENT | 0 |
| 8 | `CLOUD_CLUSTER` | Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04). | ID | 14 | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE | 2 |
| 9 | `COLLECTOR` | Collector node that executes scans (clr-blr-02, Collector-West). | ID | 15 | DOMAIN_ID_FK→DOMAIN | 1 |
| 10 | `CREDENTIAL_PROFILE` | Named access profile used by scans (ro-inband-v3). Holds only a vault reference: the secret, SNMPv3 user and keys never enter this database. | ID | 18 | DOMAIN_ID_FK→DOMAIN, OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA | 1 |
| 11 | `DISCOVERY_STEP_DEF` | Collector step of a domain family, in execution order (Transport: device, hardware, lldp, ospf, bgp, service ...). | ID | 7 | — | 1 |
| 12 | `DISCREPANCY_TYPE` | Discrepancy label with its category and domain (Undocumented wavelength, PCI value != record, Topology gap (LLDP) ...). | ID | 5 | — | 1 |
| 13 | `DOMAIN` | Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tree (IP/MPLS under Transport). Seeded; global. | ID | 6 | PARENT_DOMAIN_ID_FK→DOMAIN | 13 |
| 14 | `DOMAIN_TRUST_SNAPSHOT` | Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unverified, open, MTTR, touchless). | ID | 16 | DOMAIN_ID_FK→DOMAIN | 0 |
| 15 | `EQUIPMENT_COMPONENT` | Hardware tree inside a device, including empty slots; parents are FK-bound to the same device. | ID | 25 | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PARENT_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, VENDOR_ID_FK→VENDOR | 1 |
| 16 | `EXTERNAL_OBJECT_TYPE` | Type of externally owned object that may be proxied here. | CODE | 3 | — | 1 |
| 17 | `EXTERNAL_RESOURCE` | Lightweight proxy for an object owned by another system (fiber plant); ids only, no copied attributes. | ID | 16 | SYSTEM_TYPE→EXTERNAL_OBJECT_TYPE, RESOURCE_CLASS→RESOURCE, SYSTEM_TYPE→EXTERNAL_SYSTEM | 0 |
| 18 | `EXTERNAL_SYSTEM` | Every external system this inventory exchanges data with, including discovery sources and the fiber application. | ID | 18 | DOMAIN_ID_FK→DOMAIN, VENDOR_ID_FK→VENDOR | 6 |
| 19 | `FLOOR` | Floor inside a site (facility view). | ID | 10 | SITE_ID_FK→SITE | 1 |
| 20 | `FREQUENCY_BAND` | Radio band per technology with duplex mode and frequency ranges. | ID | 8 | TECHNOLOGY_CODE→TECHNOLOGY | 1 |
| 21 | `IP_SUBNET` | IP prefix per routing context (global or L3VPN), with hierarchy and purpose. | ID | 20 | PARENT_SUBNET_ID_FK→IP_SUBNET, RESOURCE_CLASS→RESOURCE, SERVICE_INSTANCE_ID_FK→SERVICE_INSTANCE, SITE_ID_FK→SITE | 1 |
| 22 | `LINK` | Connection between two devices at one catalogued layer, unique by natural key among active rows. | ID | 30 | A_NE_ID_FK→NETWORK_ELEMENT, A_PORT_ID_FK→PORT, IS_DIRECTED→LINK_LAYER, RESOURCE_CLASS→RESOURCE, Z_NE_ID_FK→NETWORK_ELEMENT, Z_PORT_ID_FK→PORT | 2 |
| 23 | `LINK_LAYER` | Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP interface layers. | ID | 5 | — | 1 |
| 24 | `LINK_MICROWAVE_ATTR` | Hop-level attributes of a microwave link, stored once per hop. | ID | 18 | LAYER→LINK | 0 |
| 25 | `LINK_PROTOCOL_ATTR` | Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / neighbour state, IS-IS level. The grids used to overload the interface columns with these. | ID | 15 | LINK_ID_FK→LINK | 0 |
| 26 | `NETWORK_ELEMENT` | Golden record of a physical or virtual device / network function in any domain. | ID | 40 | DECOMMISSIONED_BY_FK→USER, DOMAIN_ID_FK→DOMAIN, DOMAIN_ID_FK→NE_CLASS_DOMAIN, PARENT_NE_ID_FK→NETWORK_ELEMENT, NE_CLASS→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, RACK_ID_FK→RACK, VENDOR_ID_FK→VENDOR | 22 |
| 27 | `NETWORK_FUNCTION_TYPE` | Core / IMS / CS network-function type catalog. | ID | 6 | DOMAIN_ID_FK→DOMAIN | 1 |
| 28 | `NETWORK_SLICE` | 5G network slice (S-NSSAI) of a PLMN. | ID | 14 | PLMN_ID_FK→PLMN, RESOURCE_CLASS→RESOURCE | 0 |
| 29 | `NE_CLASS` | Device-class catalog: tab, the one detail table of the class, and whether it may be virtual. | ID | 7 | — | 13 |
| 30 | `NE_CLASS_DOMAIN` | Allowed (device class, network domain) pairs; the FK target that keeps every device in a domain its class covers. Seeded; global. | ID | 3 | DOMAIN_ID_FK→DOMAIN, NE_CLASS_CODE→NE_CLASS | 1 |
| 31 | `NE_CORE_DETAIL` | Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT). | ID | 16 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, NF_TYPE_CODE→NETWORK_FUNCTION_TYPE | 0 |
| 32 | `NE_HEALTH` | Latest reachability and time-sync check of a device (ICMP + NTP). Successor of ICMP_INFO and NTP_INFO; history belongs to PM. | ID | 16 | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT | 0 |
| 33 | `NE_IPMPLS_DETAIL` | IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; Transport > IP/MPLS domain). | ID | 28 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 34 | `NE_MICROWAVE_DETAIL` | Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link. | ID | 17 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 35 | `NE_MOVEMENT` | Append-only (trigger-enforced) stock movement / state change of a device (issue, install, RMA, decommission, recover to store) with its work order. | ID | 15 | FROM_SITE_ID_FK→SITE, TO_STATE→NE_STOCK_TRANSITION, NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, TO_SITE_ID_FK→SITE | 0 |
| 36 | `NE_OPTICAL_DETAIL` | DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain). | ID | 20 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 37 | `NE_PON_DETAIL` | PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain). | ID | 19 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, PARENT_OLT_NE_ID_FK→NETWORK_ELEMENT, SERVING_PON_PORT_ID_FK→PORT | 0 |
| 38 | `NE_POWER_DETAIL` | Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility). | ID | 16 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, POWER_UNIT_ID_FK→POWER_UNIT | 0 |
| 39 | `NE_RAN_DETAIL` | RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 with NETWORK_ELEMENT). | ID | 23 | CONTROLLER_NE_CLASS→NETWORK_ELEMENT, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, PRIMARY_PLMN_ID_FK→PLMN | 0 |
| 40 | `NE_SECURITY_DETAIL` | Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains). | ID | 20 | HA_PEER_NE_ID_FK→NETWORK_ELEMENT, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 41 | `NE_SERVER_DETAIL` | Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domains). | ID | 20 | CLOUD_CLUSTER_ID_FK→CLOUD_CLUSTER, DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 42 | `NE_STOCK_TRANSITION` | Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned; decommissioned > in store = recovered to store). | ID | 4 | — | 1 |
| 43 | `NE_SWITCH_DETAIL` | Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport / IP/MPLS / Core domains). | ID | 19 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT | 0 |
| 44 | `NE_VIRTUAL_INSTANCE` | Virtualisation record (VNF / CNF) of a virtual NE, 1:1. | ID | 17 | CLOUD_CLUSTER_ID_FK→CLOUD_CLUSTER, HOST_RESOURCE_CLASS→NETWORK_ELEMENT, NE_RESOURCE_CLASS→NETWORK_ELEMENT | 0 |
| 45 | `NE_WIFI_DETAIL` | WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, access radio). | ID | 28 | DETAIL_TABLE→NE_CLASS, NE_CLASS→NETWORK_ELEMENT, WLAN_CONTROLLER_NE_ID_FK→NETWORK_ELEMENT | 0 |
| 46 | `OPERATIONAL_AREA` | Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > Territory). A child always sits at a lower level than its parent. | ID | 14 | PARENT_AREA_LEVEL→OPERATIONAL_AREA | 3 |
| 47 | `OPEX_LINE` | Recurring cost / contract line (rent, electricity, diesel, backhaul lease, AMC, fiber O&M, security, statutory). Monthly run rate is derived from amount and frequency. | ID | 18 | OPEX_PLAN_ID_FK→OPEX_PLAN | 0 |
| 48 | `OPEX_MONTH_ACTUAL` | Actual spend per month against the budget (the 12-month opex trend). | ID | 10 | OPEX_PLAN_ID_FK→OPEX_PLAN | 0 |
| 49 | `OPEX_PLAN` | Operating budget of a site for a financial year. | ID | 13 | OWNER_ID_FK→USER, SITE_ID_FK→SITE | 2 |
| 50 | `PASSIVE_ASSET` | Passive / site-infrastructure asset of a governed type; fiber plant excluded. | ID | 28 | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, RACK_ID_FK→RACK, IS_RACK_MOUNTABLE→PASSIVE_ASSET_TYPE, VENDOR_ID_FK→VENDOR | 3 |
| 51 | `PASSIVE_ASSET_TYPE` | Passive / site-infrastructure asset type catalog (fiber plant excluded). | ID | 5 | — | 1 |
| 52 | `PATCH_CORD` | Patch cord detail: the two ports a patch-cord asset joins. | ID | 14 | A_PORT_ID_FK→PORT, ASSET_TYPE→PASSIVE_ASSET, Z_PORT_ID_FK→PORT | 0 |
| 53 | `PLMN` | Public land mobile network (MCC + MNC) run or shared by the tenant. | ID | 11 | — | 3 |
| 54 | `PORT` | Device interface or passive-asset port; card, optic, parent and VRF bound to the same device. | ID | 31 | EQUIPMENT_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PARENT_PORT_ID_FK→PORT, PASSIVE_ASSET_ID_FK→PASSIVE_ASSET, RESOURCE_CLASS→RESOURCE, TRANSCEIVER_COMPONENT_ID_FK→EQUIPMENT_COMPONENT, VRF_ID_FK→VRF | 6 |
| 55 | `PORT_IP_ADDRESS` | IP address on an interface and its subnet. | ID | 13 | IP_SUBNET_ID_FK→IP_SUBNET, PORT_ID_FK→PORT | 0 |
| 56 | `PORT_VLAN` | VLAN membership of a port on the same device. | ID | 12 | PORT_ID_FK→PORT, VLAN_ID_FK→VLAN | 0 |
| 57 | `POWER_FEED` | Power feed into a site (facility tab: AC / DC feeds with rating and load). | ID | 14 | SITE_ID_FK→SITE | 0 |
| 58 | `POWER_UNIT` | Power plant at a site: DG set, rectifier / SMPS, battery bank, UPS, solar (facility tab + Passive > Power plant). | ID | 22 | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL, RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, VENDOR_ID_FK→VENDOR | 2 |
| 59 | `POWER_UNIT_TEST` | Load / runtime test of a power unit; "power overdue" = no passing test within the service interval. | ID | 13 | POWER_UNIT_ID_FK→POWER_UNIT, TESTED_BY_FK→USER | 0 |
| 60 | `PRIMARY_GEO_L1` | Level-1 geography (country / state). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | 12 | — | 1 |
| 61 | `PRIMARY_GEO_L2` | Level-2 geography (district / city). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | 13 | PRIMARY_GEO_L1_ID_FK→PRIMARY_GEO_L1 | 1 |
| 62 | `PRIMARY_GEO_L3` | Level-3 geography (locality). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | 13 | PRIMARY_GEO_L2_ID_FK→PRIMARY_GEO_L2 | 1 |
| 63 | `PRIMARY_GEO_L4` | Level-4 geography (cluster / pin area). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). | ID | 14 | PRIMARY_GEO_L3_ID_FK→PRIMARY_GEO_L3 | 1 |
| 64 | `PRODUCT_MODEL` | Vendor product catalog for devices, cards, optics, antennas, passive and power products, with lifecycle dates. | ID | 12 | NE_CLASS→NE_CLASS, VENDOR_ID_FK→VENDOR | 6 |
| 65 | `PRODUCT_MODEL_POLICY` | Per-tenant golden software version of a product model. | ID | 9 | PRODUCT_MODEL_ID_FK→PRODUCT_MODEL | 0 |
| 66 | `RACK` | Equipment rack, outdoor cabinet or shelter rack; always at a site, in a room when indoors. | ID | 16 | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE, ROOM_ID_FK→ROOM | 2 |
| 67 | `RADIO_CELL` | Radio cell of any generation, bound to its node, technology, band and sector. | ID | 29 | BAND_CODE→FREQUENCY_BAND, NODE_NE_CLASS→NETWORK_ELEMENT, RADIO_SECTOR_ID_FK→RADIO_SECTOR, RESOURCE_CLASS→RESOURCE | 3 |
| 68 | `RADIO_CELL_PLMN` | PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary. | ID | 11 | PLMN_ID_FK→PLMN, RADIO_CELL_ID_FK→RADIO_CELL | 0 |
| 69 | `RADIO_SECTOR` | Sector of a radio site grouping antennas and cells of all technologies. | ID | 12 | RESOURCE_CLASS→RESOURCE, SITE_ID_FK→SITE | 2 |
| 70 | `RECON_EXCEPTION` | Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition. One exception may cover many records (bulk). | ID | 30 | ASSIGNEE_ID_FK→USER, DISCREPANCY_TYPE_ID_FK→DISCREPANCY_TYPE, DISPOSITION_BY_FK→USER, DOMAIN_ID_FK→DOMAIN, OWNER_TEAM_ID_FK→TEAM, RECON_RESULT_ID_FK→RECON_RESULT, RECON_RULE_ID_FK→RECON_RULE, RESOURCE_ID_FK→RESOURCE, SCAN_TARGET_ID_FK→SCAN_TARGET | 0 |
| 71 | `RECON_FIELD` | Comparable resource attribute shared by provenance, rules and reconciliation results. | CODE | 4 | RESOURCE_CLASS→RESOURCE_CLASS | 3 |
| 72 | `RECON_JOB` | Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a schedule, running a set of rules. | ID | 17 | DOMAIN_ID_FK→DOMAIN | 2 |
| 73 | `RECON_JOB_RULE` | Rules a reconciliation job runs (many-to-many; was ruleIds[]). | ID | 9 | RECON_JOB_ID_FK→RECON_JOB, RECON_RULE_ID_FK→RECON_RULE | 0 |
| 74 | `RECON_RESULT` | Outcome of one rule on one subject (any resource or a scan target) in one run. | ID | 12 | RECON_RULE_ID_FK→RECON_RULE, RECON_RUN_ID_FK→RECON_RUN, RESOURCE_ID_FK→RESOURCE, SCAN_TARGET_ID_FK→SCAN_TARGET | 2 |
| 75 | `RECON_RESULT_FIELD` | One compared field: inventory value vs network value, evidence source and confidence (attribute drift detail). | ID | 13 | FIELD_CODE→RECON_FIELD, RECON_RESULT_ID_FK→RECON_RESULT | 0 |
| 76 | `RECON_RULE` | Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role. | ID | 25 | APPROVER_ID_FK→USER, DOMAIN_ID_FK→DOMAIN, EXCEPTION_REVIEWER_TEAM_ID_FK→TEAM, EXECUTOR_ID_FK→USER, OWNER_ID_FK→USER, REVIEWER_ID_FK→USER | 6 |
| 77 | `RECON_RULE_CONDITION` | Condition of a rule: source field, operator, target field or literal, joined by AND / OR. | ID | 15 | RECON_RULE_ID_FK→RECON_RULE, SOURCE_FIELD_CODE→RECON_FIELD, TARGET_FIELD_CODE→RECON_FIELD | 0 |
| 78 | `RECON_RULE_EVENT` | Append-only (trigger-enforced) approval / lifecycle trail of a rule; the FK to RECON_RULE_TRANSITION rejects illegal moves. Records the real acting user. | ID | 14 | ACTOR_ID_FK→USER, ACTION→RECON_RULE_TRANSITION, RECON_RULE_ID_FK→RECON_RULE | 0 |
| 79 | `RECON_RULE_TRANSITION` | Allowed rule lifecycle moves and the action that makes them. | ID | 5 | — | 1 |
| 80 | `RECON_RUN` | One execution of a reconciliation job (a reconciliation cycle). Scanned / drifted / auto-resolved figures are derived from results and exceptions. | ID | 12 | RECON_JOB_ID_FK→RECON_JOB, SCAN_RUN_ID_FK→SCAN_RUN | 2 |
| 81 | `RECON_RUN_RULE` | Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duration). | ID | 12 | RECON_RULE_ID_FK→RECON_RULE, RECON_RUN_ID_FK→RECON_RUN | 0 |
| 82 | `RECON_STATE_MAP` | Mapping of reconciliation outcomes to resource, target and exception states. | OUTCOME | 4 | — | 0 |
| 83 | `RELATIONSHIP_RULE` | Allowed relationship triples between resource classes. | ID | 4 | FROM_CLASS→RESOURCE_CLASS, RELATIONSHIP_TYPE→RELATIONSHIP_TYPE, TO_CLASS→RESOURCE_CLASS | 1 |
| 84 | `RELATIONSHIP_TYPE` | Kind of cross-domain resource relationship. | CODE | 6 | — | 1 |
| 85 | `REPORT_DEFINITION` | Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ...). | ID | 18 | — | 1 |
| 86 | `REPORT_RUN` | Generated report (production Reports grid). Successor of GENERATED_REPORTS. | ID | 18 | REPORT_DEFINITION_ID_FK→REPORT_DEFINITION | 0 |
| 87 | `RESOURCE` | Supertype row of every inventory object. | ID | 4 | RESOURCE_CLASS→RESOURCE_CLASS | 25 |
| 88 | `RESOURCE_ASSET` | Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by resource. | ID | 20 | RESOURCE_ID_FK→RESOURCE | 0 |
| 89 | `RESOURCE_ATTRIBUTE` | Value of an extensible attribute on one resource, typed by its definition. | ID | 15 | DATA_TYPE→ATTRIBUTE_DEFINITION, RESOURCE_CLASS→RESOURCE | 0 |
| 90 | `RESOURCE_CLASS` | Class of every RESOURCE row with inventory category and layer. | CODE | 5 | — | 4 |
| 91 | `RESOURCE_EXTERNAL_REF` | Id of an inventory resource in another system; one per system, at most one system of record. | ID | 14 | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, RESOURCE_ID_FK→RESOURCE | 0 |
| 92 | `RESOURCE_FIELD_PROVENANCE` | Per-field provenance of any resource's golden record. | ID | 15 | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, FIELD_CODE→RECON_FIELD, RESOURCE_ID_FK→RESOURCE | 0 |
| 93 | `RESOURCE_RELATIONSHIP` | Typed dependency between two resources that no explicit FK models; FROM depends on TO. | ID | 18 | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, FROM_RESOURCE_CLASS→RESOURCE, TO_RESOURCE_CLASS→RELATIONSHIP_RULE, TO_RESOURCE_CLASS→RESOURCE | 0 |
| 94 | `RESOURCE_TECHNOLOGY` | Technologies a resource supports; replaces single-valued technology columns. | ID | 10 | RESOURCE_ID_FK→RESOURCE, TECHNOLOGY_ID_FK→TECHNOLOGY | 0 |
| 95 | `ROOM` | Room / hall on a floor (equipment room, battery room, MDF). | ID | 11 | FLOOR_ID_FK→FLOOR | 1 |
| 96 | `SCAN_JOB` | Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE). | ID | 23 | COLLECTOR_ID_FK→COLLECTOR, CREDENTIAL_PROFILE_ID_FK→CREDENTIAL_PROFILE, DOMAIN_ID_FK→DOMAIN, EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA | 3 |
| 97 | `SCAN_JOB_SCOPE` | One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF set. | ID | 11 | SCAN_JOB_ID_FK→SCAN_JOB, SITE_ID_FK→SITE | 0 |
| 98 | `SCAN_RUN` | One execution of a scan job. Target counts are derived from SCAN_RUN_TARGET (V_SCAN_RUN_SUMMARY). Successor of DISCOVERY_RUN, whose key was a counter named DISCOVERY_COUNT. | ID | 14 | SCAN_JOB_ID_FK→SCAN_JOB | 2 |
| 99 | `SCAN_RUN_TARGET` | Result of one target in one run: status, outcome, failure reason, identity match (rule + confidence). | ID | 18 | MATCHED_NE_ID_FK→NETWORK_ELEMENT, SCAN_RUN_ID_FK→SCAN_RUN, SCAN_TARGET_ID_FK→SCAN_TARGET | 1 |
| 100 | `SCAN_STEP_PAYLOAD` | Raw request / response of a step, AES-encrypted (device output can carry configuration and customer data). Split out so hot tables stay narrow; purged by retention. | ID | 15 | SCAN_STEP_RESULT_ID_FK→SCAN_STEP_RESULT | 0 |
| 101 | `SCAN_STEP_RESULT` | One collector step for one target in one run (the transcript line): state, timing, bytes, what it wrote. | ID | 16 | DISCOVERY_STEP_DEF_ID_FK→DISCOVERY_STEP_DEF, SCAN_RUN_TARGET_ID_FK→SCAN_RUN_TARGET | 1 |
| 102 | `SCAN_TARGET` | Address a job polls (gateway IP). Identity is the IP, not the hostname (109 targets have none). Carries the latest outcome as a cache. | ID | 21 | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, OBSERVED_VENDOR_ID_FK→VENDOR, SCAN_JOB_ID_FK→SCAN_JOB | 3 |
| 103 | `SERVICE_ENDPOINT` | Termination of a service on a device interface (PE for L3VPN; source and destination for point-to-point services). | ID | 14 | NETWORK_ELEMENT_ID_FK→NETWORK_ELEMENT, PORT_ID_FK→PORT, SERVICE_INSTANCE_ID_FK→SERVICE_INSTANCE | 0 |
| 104 | `SERVICE_INSTANCE` | Network service instance, unique per type and name among active services. | ID | 22 | DOMAIN_ID_FK→DOMAIN, RESOURCE_CLASS→RESOURCE, SERVICE_TYPE→SERVICE_TYPE | 2 |
| 105 | `SERVICE_TYPE` | Network service type catalog. | ID | 4 | DOMAIN_ID_FK→DOMAIN | 1 |
| 106 | `SITE` | A location that hosts equipment (central office, POP, tower, data centre). Geography is held once (lowest level only); lat/long once. | ID | 29 | OPERATIONAL_AREA_ID_FK→OPERATIONAL_AREA, PARENT_SITE_ID_FK→SITE, PRIMARY_GEO_L4_ID_FK→PRIMARY_GEO_L4, RESOURCE_CLASS→RESOURCE, SITE_TYPE_ID_FK→SITE_TYPE | 16 |
| 107 | `SITE_CONTACT` | Site contact person (from NE_DETAIL). Phone and email are personal data: stored AES-encrypted. | ID | 15 | SITE_ID_FK→SITE | 0 |
| 108 | `SITE_ISSUE` | Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, Civil, Regulatory, Supply Chain, Commissioning). | ID | 14 | OWNER_TEAM_ID_FK→TEAM, SITE_ID_FK→SITE | 0 |
| 109 | `SITE_TYPE` | Site type (Central office, Regional hub, Edge, Tower, Data centre ...). | ID | 3 | — | 1 |
| 110 | `TEAM` | Owning team or queue for exceptions and rules (e.g. Architecture, NOC Transport); "Unassigned" is the absence of a team. | ID | 11 | — | 4 |
| 111 | `TEAM_MEMBER` | Membership of a user in a team. | ID | 10 | TEAM_ID_FK→TEAM, USER_ID_FK→USER | 0 |
| 112 | `TECHNOLOGY` | Network / radio access technology with family and generation; the one place generation is recorded. | ID | 6 | — | 3 |
| 113 | `TENANT` | Platform tenant (the operator). Every tenant-owned row references it through CUSTOMER_ID. | ID | 5 | — | 0 |
| 114 | `USER` | The single user table for the platform and every integration. No email or other contact PII is stored; IAM owns it. | ID | 12 | — | 9 |
| 115 | `USER_IDENTITY` | Identity of a USER in one external system; one USER, many identities. | ID | 14 | EXTERNAL_SYSTEM_ID_FK→EXTERNAL_SYSTEM, USER_ID_FK→USER | 0 |
| 116 | `VENDOR` | Vendor catalog (DDL absent from dump; referenced by 13 FKs) | ID (inferred) | ? | — | 10 |
| 117 | `VLAN` | VLAN of a device (DDL absent from dump; referenced by PORT_VLAN) | ID (inferred) | ? | — | 1 |
| 118 | `VRF` | VRF instance of a router (DDL absent from dump; referenced by PORT) | ID (inferred) | ? | — | 1 |

---

## 6. Master Table Categorization

Category key: **A** Must remain in Inventory · **B** User Management integration · **C** Passive Inventory module · **D** Open / CoPEX module · **E** Job / integration / NiFi / Spark · **F** Reference / lookup · **G** Audit / technical / system · **H** Unknown / needs validation.

Counts: A 42 · F 27 · E 20 · H 9 · C 7 · D 6 · G 5 · B 2 = 118.

| Table | Current Purpose | Proposed Owner | Category | Keep in Inventory? | Future Integration? | UI Relevant? | Related Module | Confidence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `ANTENNA` | Installed RF antenna with sector, mounting, azimuth and tilts. | Needs validation (RESOURCE_CLASS ANTENNA is PASSIVE; RAN cells depend on it) | C — Passive | Yes (reference likely) | API | UI Direct | Passive Inventory / Inventory | Medium | Azimuth / tilt are RAN engineering data; ownership split must be decided |
| `ATTRIBUTE_DEFINITION` | Typed definition of an extensible attribute for one resource class. | Inventory | F — Reference | Yes | None | UI Indirect | Inventory | High | Tenant-scoped attribute schema |
| `CAPEX_LINE` | Capex line item (equipment, civil works, power, fiber, installation, licence). | Open / CoPEX Module | D — Open/CoPEX | Keep for now | Mock API → API | UI Direct | Open / CoPEX | Medium | Line items |
| `CAPEX_LINE_RESOURCE` | Resource funded by a CAPEX line. | Open / CoPEX Module (with inventory resource ids) | D — Open/CoPEX | Keep for now | API | UI Indirect | Open / CoPEX | Medium | Cross-boundary link: funded RESOURCE ids become external references |
| `CAPEX_PLAN` | Capital plan of a site for a financial year (AFE, cost centre, approved amount). | Open / CoPEX Module | D — Open/CoPEX | Keep for now | Mock API → API | UI Direct | Open / CoPEX | Medium | Financial planning per site; interpretation of "CoPEX" = CAPEX/OPEX family needs confirmation |
| `CELL_ANTENNA` | Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells) | Inventory | A — Inventory | Yes | Passive (ANTENNA ref) | UI Indirect | Inventory / Passive | Medium | Bridge to ANTENNA; becomes an external-id reference if ANTENNA moves |
| `CELL_RADIO_UNIT` | Radio unit(s) (RRU / RRH / AAU, NE class RADIO_UNIT) that transmit a cell; one RU carries  | Inventory | A — Inventory | Yes | None | UI Indirect | Inventory | High | RU per cell |
| `CLOUD_CLUSTER` | Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04). | Inventory | A — Inventory | Yes | Orchestrator — validate | UI Direct | Inventory | Medium | Hosts virtual NEs; site-bound |
| `COLLECTOR` | Collector node that executes scans (clr-blr-02, Collector-West). | Integration / collector fleet | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Execution node registry (health) |
| `CREDENTIAL_PROFILE` | Named access profile used by scans (ro-inband-v3). Holds only a vault reference: the secre | Integration / vault | E — Job/Integration | Keep for now | Integration (vault ref) | UI Indirect | Integration | Medium | Vault reference only; never a secret |
| `DISCOVERY_STEP_DEF` | Collector step of a domain family, in execution order (Transport: device, hardware, lldp,  | Integration / Discovery service | F — Reference | Keep for now | Seed | UI Indirect | Integration | Medium | Step catalog per domain |
| `DISCREPANCY_TYPE` | Discrepancy label with its category and domain (Undocumented wavelength, PCI value != reco | Inventory / Reconciliation service | F — Reference | Yes | Seed | UI Indirect | Inventory / Integration | Medium | Exception typing |
| `DOMAIN` | Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tre | Shared reference (Inventory-hosted) | F — Reference | Yes | Seed | UI Indirect | Shared | High | Shared by Discovery, Reconciliation, Inventory (per comment) |
| `DOMAIN_TRUST_SNAPSHOT` | Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unveri | Integration / analytics (Spark candidate) | G — Technical | Keep for now | Integration | UI Indirect | Integration | Medium | Daily derived series; classic batch-job output |
| `EQUIPMENT_COMPONENT` | Hardware tree inside a device, including empty slots; parents are FK-bound to the same dev | Inventory | A — Inventory | Yes | Discovery writes hardware tree | UI Direct | Inventory | High | Chassis / slot / card / optic tree |
| `EXTERNAL_OBJECT_TYPE` | Type of externally owned object that may be proxied here. | Integration layer | F — Reference | Yes (reference) | Seed / API | No UI Requirement | Integration | High | Object types of external systems |
| `EXTERNAL_RESOURCE` | Lightweight proxy for an object owned by another system (fiber plant); ids only, no copied | Integration layer | E — Job/Integration | Yes (reference) | API sync | UI Indirect | Passive Inventory / Integration | High | Already the proxy pattern for externally owned passive objects (FIBER_INVENTORY types); the model for the rest of Passive |
| `EXTERNAL_SYSTEM` | Every external system this inventory exchanges data with, including discovery sources and  | Integration layer | E — Job/Integration | Yes (reference) | Integration | UI Indirect | Integration | High | Registry of every external system; 7 referencing tables |
| `FLOOR` | Floor inside a site (facility view). | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | Medium | Facility layout; could be argued Passive — validate |
| `FREQUENCY_BAND` | Radio band per technology with duplex mode and frequency ranges. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Band catalog |
| `IP_SUBNET` | IP prefix per routing context (global or L3VPN), with hierarchy and purpose. | Inventory | A — Inventory | Yes | Discovery | UI Direct | Inventory | Medium | IPAM scope itself needs business validation, ownership does not |
| `LINK` | Connection between two devices at one catalogued layer, unique by natural key among active | Inventory | A — Inventory | Yes | Discovery writes adjacencies | UI Direct | Inventory | High | Links at 45 layers |
| `LINK_LAYER` | Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP  | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Link kinds |
| `LINK_MICROWAVE_ATTR` | Hop-level attributes of a microwave link, stored once per hop. | Inventory | A — Inventory | Yes | None | UI Indirect | Inventory | High | 1:1 with LINK |
| `LINK_PROTOCOL_ATTR` | Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / | Inventory | A — Inventory | Yes | Discovery | UI Indirect | Inventory | High | 1:1 with LINK |
| `NETWORK_ELEMENT` | Golden record of a physical or virtual device / network function in any domain. | Inventory | A — Inventory | Yes | Discovery writes discovered rows | UI Direct | Inventory | High | Golden record; hub of the schema (22 referencing tables) |
| `NETWORK_FUNCTION_TYPE` | Core / IMS / CS network-function type catalog. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Core NF catalog |
| `NETWORK_SLICE` | 5G network slice (S-NSSAI) of a PLMN. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | Medium | 5G slice |
| `NE_CLASS` | Device-class catalog: tab, the one detail table of the class, and whether it may be virtua | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Device-class catalog |
| `NE_CLASS_DOMAIN` | Allowed (device class, network domain) pairs; the FK target that keeps every device in a d | Inventory | F — Reference | Yes | Seed | Backend Only | Inventory | High | Allowed class/domain pairs |
| `NE_CORE_DETAIL` | Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT). | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_HEALTH` | Latest reachability and time-sync check of a device (ICMP + NTP). Successor of ICMP_INFO a | Integration / collector | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Latest ICMP/NTP check; history belongs to PM |
| `NE_IPMPLS_DETAIL` | IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; T | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_MICROWAVE_DETAIL` | Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_MOVEMENT` | Append-only (trigger-enforced) stock movement / state change of a device (issue, install,  | Inventory | G — Technical | Yes | Work-order system — validate | UI Direct | Inventory | High | Append-only stock-movement trail; created by inventory actions |
| `NE_OPTICAL_DETAIL` | DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain). | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_PON_DETAIL` | PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_POWER_DETAIL` | Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility | Inventory | A — Inventory | Yes | Passive (POWER_UNIT ref) | UI Direct | Inventory / Passive | Medium | Monitored power controller is an active NE; its POWER_UNIT_ID_FK crosses into the Passive boundary |
| `NE_RAN_DETAIL` | RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 wi | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_SECURITY_DETAIL` | Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains). | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_SERVER_DETAIL` | Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domain | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail; references CLOUD_CLUSTER |
| `NE_STOCK_TRANSITION` | Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned;  | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Stock state machine |
| `NE_SWITCH_DETAIL` | Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport /  | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `NE_VIRTUAL_INSTANCE` | Virtualisation record (VNF / CNF) of a virtual NE, 1:1. | Inventory | H — Validate | Yes | Orchestrator (state) — validate | UI Direct | Inventory | Medium | VNF/CNF record is inventory; INSTANTIATION_STATE may be owned by an orchestrator |
| `NE_WIFI_DETAIL` | WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, acce | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | 1:1 class detail |
| `OPERATIONAL_AREA` | Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > T | Shared master data — validate | F — Reference | Yes (reference) | CDC / API — validate | UI Indirect | Shared / User Management | Medium | Region > Circle > … hierarchy used for ownership and reporting; often mirrors user scoping in User Management |
| `OPEX_LINE` | Recurring cost / contract line (rent, electricity, diesel, backhaul lease, AMC, fiber O&M, | Open / CoPEX Module | D — Open/CoPEX | Keep for now | Mock API → API | UI Direct | Open / CoPEX | Medium | Contracts / recurring costs |
| `OPEX_MONTH_ACTUAL` | Actual spend per month against the budget (the 12-month opex trend). | Open / CoPEX Module | D — Open/CoPEX | Keep for now | Mock API → API | UI Direct | Open / CoPEX | Medium | Monthly actuals |
| `OPEX_PLAN` | Operating budget of a site for a financial year. | Open / CoPEX Module | D — Open/CoPEX | Keep for now | Mock API → API | UI Direct | Open / CoPEX | Medium | Operating budget per site |
| `PASSIVE_ASSET` | Passive / site-infrastructure asset of a governed type; fiber plant excluded. | Passive Inventory Module | C — Passive | Keep for now | API | UI Direct | Passive Inventory | High | RESOURCE_CLASS PASSIVE_ASSET is INVENTORY_CATEGORY = PASSIVE (schema-confirmed) |
| `PASSIVE_ASSET_TYPE` | Passive / site-infrastructure asset type catalog (fiber plant excluded). | Passive Inventory Module | C — Passive | Keep for now | API (reference) | UI Indirect | Passive Inventory | High | Type catalog of passive assets |
| `PATCH_CORD` | Patch cord detail: the two ports a patch-cord asset joins. | Passive Inventory Module | C — Passive | Keep for now | API | UI Direct | Passive Inventory | High | Detail of a passive asset; joins two PORTs (FK impact) |
| `PLMN` | Public land mobile network (MCC + MNC) run or shared by the tenant. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | Tenant PLMNs |
| `PORT` | Device interface or passive-asset port; card, optic, parent and VRF bound to the same devi | Inventory (NE ports); Passive rows validate | A — Inventory | Yes | Discovery | UI Direct | Inventory / Passive | Medium | Polymorphic: NE ports are inventory; PASSIVE_ASSET_ID_FK rows follow the Passive decision |
| `PORT_IP_ADDRESS` | IP address on an interface and its subnet. | Inventory | A — Inventory | Yes | Discovery | UI Indirect | Inventory | High | IP on interface |
| `PORT_VLAN` | VLAN membership of a port on the same device. | Inventory | A — Inventory | Yes | Discovery | UI Indirect | Inventory | High | VLAN membership |
| `POWER_FEED` | Power feed into a site (facility tab: AC / DC feeds with rating and load). | Needs validation | H — Validate | Yes (for now) | API | UI Direct | Passive Inventory / Inventory | Low | Site AC/DC feed; facility attribute, not a RESOURCE subtype |
| `POWER_UNIT` | Power plant at a site: DG set, rectifier / SMPS, battery bank, UPS, solar (facility tab +  | Passive Inventory Module | C — Passive | Keep for now | API | UI Direct | Passive Inventory | Medium | RESOURCE_CLASS POWER_UNIT is PASSIVE; referenced by NE_POWER_DETAIL |
| `POWER_UNIT_TEST` | Load / runtime test of a power unit; "power overdue" = no passing test within the service  | Passive Inventory Module | C — Passive | Keep for now | API | UI Direct | Passive Inventory | Medium | Follows POWER_UNIT |
| `PRIMARY_GEO_L1` | Level-1 geography (country / state). Names are unique per parent, not globally (the old sc | Shared master data — validate | F — Reference | Yes (reference) | CDC / API — validate | UI Indirect | Shared | Medium | Organisation-wide geography; may be owned by a master-data or User Management scope module |
| `PRIMARY_GEO_L2` | Level-2 geography (district / city). Names are unique per parent, not globally (the old sc | Shared master data — validate | F — Reference | Yes (reference) | CDC / API — validate | UI Indirect | Shared | Medium | As L1 |
| `PRIMARY_GEO_L3` | Level-3 geography (locality). Names are unique per parent, not globally (the old schema co | Shared master data — validate | F — Reference | Yes (reference) | CDC / API — validate | UI Indirect | Shared | Medium | As L1 |
| `PRIMARY_GEO_L4` | Level-4 geography (cluster / pin area). Names are unique per parent, not globally (the old | Shared master data — validate | F — Reference | Yes (reference) | CDC / API — validate | UI Indirect | Shared | Medium | SITE binds here (mandatory FK) |
| `PRODUCT_MODEL` | Vendor product catalog for devices, cards, optics, antennas, passive and power products, w | Shared reference — validate | F — Reference | Yes (reference) | Master-data feed | UI Indirect | Shared | Medium | Global (no CUSTOMER_ID) product catalog incl. passive & power products |
| `PRODUCT_MODEL_POLICY` | Per-tenant golden software version of a product model. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | Tenant golden-OS policy |
| `RACK` | Equipment rack, outdoor cabinet or shelter rack; always at a site, in a room when indoors. | Needs validation (RESOURCE_CLASS says PASSIVE; NE placement depends on it) | C — Passive | Yes (reference likely) | API | UI Direct | Passive Inventory / Inventory | Medium | If Passive owns racks, Inventory keeps a reference row for NETWORK_ELEMENT.RACK_ID_FK / RACK_U_* |
| `RADIO_CELL` | Radio cell of any generation, bound to its node, technology, band and sector. | Inventory | A — Inventory | Yes | EMS discovery | UI Direct | Inventory | High | Cell inventory |
| `RADIO_CELL_PLMN` | PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary. | Inventory | A — Inventory | Yes | None | UI Indirect | Inventory | High | RAN sharing |
| `RADIO_SECTOR` | Sector of a radio site grouping antennas and cells of all technologies. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | Groups antennas and cells |
| `RECON_EXCEPTION` | Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition | Inventory | A — Inventory | Yes | Engine creates / auto-resolves | UI Direct | Inventory | Medium | Human workflow object with SLA and disposition; created by the engine |
| `RECON_FIELD` | Comparable resource attribute shared by provenance, rules and reconciliation results. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Comparable fields |
| `RECON_JOB` | Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a s | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Scheduled comparison job |
| `RECON_JOB_RULE` | Rules a reconciliation job runs (many-to-many; was ruleIds[]). | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Job ↔ rule; crosses into inventory-owned RECON_RULE |
| `RECON_RESULT` | Outcome of one rule on one subject (any resource or a scan target) in one run. | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Per-subject outcome; high volume |
| `RECON_RESULT_FIELD` | One compared field: inventory value vs network value, evidence source and confidence (attr | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Field-level evidence |
| `RECON_RULE` | Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role. | Inventory | A — Inventory | Yes | Reconciliation engine flips EXECUTING | UI Direct | Inventory | Medium | Business-governed rule; rules exist to protect the inventory golden record. Validate if Reconciliation becomes its own module |
| `RECON_RULE_CONDITION` | Condition of a rule: source field, operator, target field or literal, joined by AND / OR. | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | Medium | Rule logic |
| `RECON_RULE_EVENT` | Append-only (trigger-enforced) approval / lifecycle trail of a rule; the FK to RECON_RULE_ | Inventory | G — Technical | Yes | None | UI Direct | Inventory | Medium | Append-only approval trail |
| `RECON_RULE_TRANSITION` | Allowed rule lifecycle moves and the action that makes them. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Rule lifecycle state machine |
| `RECON_RUN` | One execution of a reconciliation job (a reconciliation cycle). Scanned / drifted / auto-r | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Execution history; FK to SCAN_RUN |
| `RECON_RUN_RULE` | Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duratio | Integration / Reconciliation service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Per-rule execution figures |
| `RECON_STATE_MAP` | Mapping of reconciliation outcomes to resource, target and exception states. | Inventory / Reconciliation service | F — Reference | Yes | Seed | Backend Only | Inventory / Integration | Medium | Outcome → state mapping used by both sides |
| `RELATIONSHIP_RULE` | Allowed relationship triples between resource classes. | Inventory | F — Reference | Yes | Seed | Backend Only | Inventory | High | Allowed triples |
| `RELATIONSHIP_TYPE` | Kind of cross-domain resource relationship. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Relationship kinds |
| `REPORT_DEFINITION` | Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ... | Inventory | A — Inventory | Yes | Reporting service runs it | UI Direct | Inventory | Medium | Catalogue owned by the product; runs are integration |
| `REPORT_RUN` | Generated report (production Reports grid). Successor of GENERATED_REPORTS. | Integration / Reporting service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Generated report artefacts |
| `RESOURCE` | Supertype row of every inventory object. | Inventory | A — Inventory | Yes | None | Backend Only | Inventory | High | Supertype of every inventory object; all subtypes cascade from it |
| `RESOURCE_ASSET` | Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by  | Needs validation (Inventory vs Open/CoPEX) | H — Validate | Yes (for now) | API — validate | UI Direct | Open / CoPEX / Inventory | Low | Asset tag, PO, purchase cost, warranty, AMC: commercial data 1:1 with an inventory resource |
| `RESOURCE_ATTRIBUTE` | Value of an extensible attribute on one resource, typed by its definition. | Inventory | A — Inventory | Yes | None | UI Indirect | Inventory | High | Custom attribute values |
| `RESOURCE_CLASS` | Class of every RESOURCE row with inventory category and layer. | Inventory | F — Reference | Yes | Seed | Backend Only | Inventory | High | Subtype registry; INVENTORY_CATEGORY marks PASSIVE rows |
| `RESOURCE_EXTERNAL_REF` | Id of an inventory resource in another system; one per system, at most one system of recor | Integration layer | E — Job/Integration | Yes (reference) | Sync | UI Indirect | Integration | High | Ids of inventory resources in other systems; system-of-record flag |
| `RESOURCE_FIELD_PROVENANCE` | Per-field provenance of any resource's golden record. | Integration layer / Discovery | E — Job/Integration | Yes | Sync | UI Indirect | Integration | Medium | Per-field provenance of the golden record; written by pipelines, read by UI |
| `RESOURCE_RELATIONSHIP` | Typed dependency between two resources that no explicit FK models; FROM depends on TO. | Inventory | A — Inventory | Yes | Discovery writes edges | UI Direct | Inventory | High | Cross-domain dependencies |
| `RESOURCE_TECHNOLOGY` | Technologies a resource supports; replaces single-valued technology columns. | Inventory | A — Inventory | Yes | None | UI Indirect | Inventory | High | Technology tags |
| `ROOM` | Room / hall on a floor (equipment room, battery room, MDF). | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | Medium | Facility layout; could be argued Passive — validate |
| `SCAN_JOB` | Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE). | Integration / Discovery service (NiFi-Spark pipelines) | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Job definition; UI defines it, pipelines execute it |
| `SCAN_JOB_SCOPE` | One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF | Integration / Discovery service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Job parameters (CIDR, seed, site, NF set) |
| `SCAN_RUN` | One execution of a scan job. Target counts are derived from SCAN_RUN_TARGET (V_SCAN_RUN_SU | Integration / Discovery service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Execution history |
| `SCAN_RUN_TARGET` | Result of one target in one run: status, outcome, failure reason, identity match (rule + c | Integration / Discovery service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Per-target outcome; FK MATCHED_NE_ID_FK to NETWORK_ELEMENT |
| `SCAN_STEP_PAYLOAD` | Raw request / response of a step, AES-encrypted (device output can carry configuration and | Integration / Discovery service | G — Technical | Keep for now | Integration | Backend Only | Integration | High | Encrypted raw payload with retention purge |
| `SCAN_STEP_RESULT` | One collector step for one target in one run (the transcript line): state, timing, bytes,  | Integration / Discovery service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | High | Step-level transcript |
| `SCAN_TARGET` | Address a job polls (gateway IP). Identity is the IP, not the hostname (109 targets have n | Integration / Discovery service | E — Job/Integration | Keep for now | Integration | UI Indirect | Integration | Medium | Polled address + cached last outcome; FK to NETWORK_ELEMENT crosses the boundary |
| `SERVICE_ENDPOINT` | Termination of a service on a device interface (PE for L3VPN; source and destination for p | Inventory | A — Inventory | Yes | Discovery | UI Indirect | Inventory | High | Terminations |
| `SERVICE_INSTANCE` | Network service instance, unique per type and name among active services. | Inventory | A — Inventory | Yes | LCM / discovery | UI Direct | Inventory | High | Service inventory |
| `SERVICE_TYPE` | Network service type catalog. | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Service kinds |
| `SITE` | A location that hosts equipment (central office, POP, tower, data centre). Geography is he | Inventory | A — Inventory | Yes | None | UI Direct | Inventory | High | Aggregate root of location; 16 referencing tables |
| `SITE_CONTACT` | Site contact person (from NE_DETAIL). Phone and email are personal data: stored AES-encryp | Inventory | H — Validate | Yes | None | UI Direct | Inventory | Medium | Encrypted PII of external contacts (not users); confirm it is not a User Management concern |
| `SITE_ISSUE` | Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, C | Inventory | H — Validate | Yes | Rollout tool — validate | UI Direct | Inventory | Medium | Rollout blockers may originate in a rollout / project tool |
| `SITE_TYPE` | Site type (Central office, Regional hub, Edge, Tower, Data centre ...). | Inventory | F — Reference | Yes | Seed | UI Indirect | Inventory | High | Site kinds |
| `TEAM` | Owning team or queue for exceptions and rules (e.g. Architecture, NOC Transport); "Unassig | Needs validation (User Management group vs Inventory queue) | H — Validate | Yes (for now) | CDC or local | UI Direct | User Management / Inventory | Medium | Owner queues for exceptions, rules and site issues; if User Management has groups, TEAM becomes a reference copy |
| `TEAM_MEMBER` | Membership of a user in a team. | Needs validation | H — Validate | Yes (for now) | CDC or local | UI Indirect | User Management / Inventory | Medium | Follows the TEAM decision |
| `TECHNOLOGY` | Network / radio access technology with family and generation; the one place generation is  | Shared reference (Inventory-hosted) | F — Reference | Yes | Seed | UI Indirect | Shared | High | Generation catalog |
| `TENANT` | Platform tenant (the operator). Every tenant-owned row references it through CUSTOMER_ID. | Platform / User Management (tenant registry) | G — Technical | Yes (reference) | CDC | No UI Requirement | User Management / Platform | Medium | Root of every CUSTOMER_ID FK; tenant list likely originates in the platform |
| `USER` | The single user table for the platform and every integration. No email or other contact PI | User Management (source); Inventory reference | B — User Mgmt | Yes (reference) | CDC | UI Indirect | User Management | High | Minimal local copy required by 11 FK relationships; no PII by design |
| `USER_IDENTITY` | Identity of a USER in one external system; one USER, many identities. | User Management | B — User Mgmt | No (future) | CDC / API | No UI Requirement | User Management | Medium | External identities of a user are a User Management concern; Inventory needs only USER.ID |
| `VENDOR` | Vendor catalog (DDL absent from dump; referenced by 13 FKs) | Shared reference — validate (Passive and CoPEX also need vendors) | F — Reference | Yes (reference) | Seed / master-data feed | UI Indirect | Shared | Low | DDL absent from dump; 13 referencing tables |
| `VLAN` | VLAN of a device (DDL absent from dump; referenced by PORT_VLAN) | Inventory | H — Validate | Yes | Discovery | UI Indirect | Inventory | Low | DDL absent from dump |
| `VRF` | VRF instance of a router (DDL absent from dump; referenced by PORT) | Inventory | H — Validate | Yes | Discovery | UI Indirect | Inventory | Low | DDL absent from dump |

---

## 7. Inventory-Owned Tables

Tables that represent genuine Inventory ownership (decision `KEEP`), grouped into business domains. Reference tables that Inventory owns are listed in section 12.

### 7.1 Network elements & hardware (21 tables)

```
Table:               NETWORK_ELEMENT
Purpose:             Golden record of a physical or virtual device / network function in any domain [Schema]
Why Inventory owns it: It is the inventory. Every other module refers to devices by this identity.
Relationships:       → RESOURCE (cascade), SITE, RACK, DOMAIN, NE_CLASS_DOMAIN, VENDOR, PRODUCT_MODEL, USER (decommissioned by), self (parent)
Dependent tables:    22 (11 NE_*_DETAIL, NE_VIRTUAL_INSTANCE, NE_HEALTH, NE_MOVEMENT, EQUIPMENT_COMPONENT, PORT, LINK (A/Z),
                     SERVICE_ENDPOINT, RADIO_CELL, CELL_RADIO_UNIT, SCAN_TARGET, SCAN_RUN_TARGET, NE_PON_DETAIL (parent OLT) …)
UI relevance:        UI Direct (Physical Resources, Element, Node view)
API relevance:       Primary aggregate root of the Inventory API
External dependency: Discovery pipelines write discovered rows (RECORD_SOURCE), LAST_SEEN_TIME, RECON_STATE
Future notes:        RACK_ID_FK / RACK_U_START / RACK_U_END cross into the Passive decision on RACK
```

```
Table:               NE_RAN_DETAIL, NE_CORE_DETAIL, NE_IPMPLS_DETAIL, NE_SWITCH_DETAIL, NE_OPTICAL_DETAIL, NE_MICROWAVE_DETAIL,
                     NE_PON_DETAIL, NE_WIFI_DETAIL, NE_SECURITY_DETAIL, NE_SERVER_DETAIL, NE_POWER_DETAIL
Purpose:             Class-specific attributes, 1:1 with NETWORK_ELEMENT, bound by (NE_CLASS, DETAIL_TABLE) [Schema]
Why Inventory owns it: Inseparable from the golden record (ON DELETE CASCADE)
Dependent tables:    none (leaf tables); NE_POWER_DETAIL → POWER_UNIT and NE_SERVER_DETAIL → CLOUD_CLUSTER are outbound
UI relevance:        UI Direct (detail panel per class)
External dependency: NE_POWER_DETAIL.POWER_UNIT_ID_FK crosses into Passive (section 14)
```

```
Table:               EQUIPMENT_COMPONENT, PORT, PORT_IP_ADDRESS, PORT_VLAN
Purpose:             Hardware tree incl. empty slots; device interfaces and passive-asset ports; IPs and VLAN membership [Schema]
Why Inventory owns it: Physical composition of an inventoried device
Dependent tables:    PORT ← LINK (A/Z), PATCH_CORD (A/Z), SERVICE_ENDPOINT, PORT_IP_ADDRESS, PORT_VLAN, NE_PON_DETAIL (serving PON port), self (parent)
UI relevance:        UI Direct (Hardware and Ports tabs)
Future notes:        PORT is polymorphic: rows with PASSIVE_ASSET_ID_FK (RESOURCE_CLASS PASSIVE_PORT) follow the Passive decision
```

```
Table:               NE_MOVEMENT
Purpose:             Append-only stock movement / state change with work order [Schema]
Why Inventory owns it: Stock lifecycle of inventoried devices; FK to NE_STOCK_TRANSITION enforces legal moves
UI relevance:        UI Direct (Movements tab, Inactive inventory)
External dependency: [Validate] installs driven by a work-order system may post movements
```

```
Table:               CLOUD_CLUSTER
Purpose:             Edge cloud / subcloud that hosts virtual network functions [Schema]
Why Inventory owns it: Site-bound hosting resource (RESOURCE_CLASS CLOUD_CLUSTER, category LOGICAL)
Dependent tables:    NE_SERVER_DETAIL, NE_VIRTUAL_INSTANCE
UI relevance:        UI Direct (Virtual Resources)
External dependency: [Validate] orchestrator may be the source of cluster membership
```

`VLAN`, `VRF` (DDL absent) and `NE_VIRTUAL_INSTANCE` (orchestrator state) are Inventory-domain tables marked `VALIDATE`; see section 26.

### 7.2 Connectivity & logical (5 tables)

```
Table:               LINK, LINK_PROTOCOL_ATTR, LINK_MICROWAVE_ATTR
Purpose:             Connection between two devices at one catalogued layer; protocol and microwave hop attributes [Schema]
Why Inventory owns it: Topology of inventoried devices; 45 LINK_LAYER kinds from physical to 3GPP interfaces
Dependent tables:    LINK ← LINK_PROTOCOL_ATTR, LINK_MICROWAVE_ATTR
UI relevance:        UI Direct (Links)
External dependency: Discovery writes adjacency links (LLDP, OSPF, BGP …) with RECORD_SOURCE
```

```
Table:               IP_SUBNET
Purpose:             IP prefix per routing context with hierarchy and purpose [Schema]
Why Inventory owns it: RESOURCE_CLASS IP_SUBNET, category LOGICAL; bound to SERVICE_INSTANCE (L3VPN context) and SITE
Dependent tables:    PORT_IP_ADDRESS, self (parent)
UI relevance:        UI Direct (IPAM scope itself is [Validate])
```

### 7.3 Services (3 tables)

```
Table:               SERVICE_INSTANCE, SERVICE_ENDPOINT, NETWORK_SLICE
Purpose:             Network service instance (RESOURCE_CLASS SERVICE), its terminations, 5G slices of a PLMN [Schema]
Why Inventory owns it: Service inventory over inventoried devices and ports
Dependent tables:    SERVICE_INSTANCE ← SERVICE_ENDPOINT, IP_SUBNET
UI relevance:        UI Direct (Services)
External dependency: LCM external system (EXTERNAL_OBJECT_TYPE LCM_SERVICE) is a provisioning source [Inferred]
```

### 7.4 RAN radio layer (6 tables)

```
Table:               RADIO_SECTOR, RADIO_CELL, RADIO_CELL_PLMN, CELL_RADIO_UNIT, CELL_ANTENNA, PLMN
Purpose:             Sectors, cells of any generation, PLMN broadcast, RU per cell, antenna per cell, tenant PLMNs [Schema]
Why Inventory owns it: RESOURCE_CLASS RADIO_SECTOR / RADIO_CELL are category LOGICAL (not PASSIVE) [Schema]
Dependent tables:    RADIO_CELL ← RADIO_CELL_PLMN, CELL_ANTENNA, CELL_RADIO_UNIT; PLMN ← NE_RAN_DETAIL, NETWORK_SLICE
UI relevance:        UI Direct (Cell 4G/5G screens today; RAN inventory proposed)
External dependency: CELL_ANTENNA.ANTENNA_ID_FK crosses into the Passive decision on ANTENNA
```

### 7.5 Location & facility layout (3 tables)

```
Table:               SITE, FLOOR, ROOM
Purpose:             A location that hosts equipment; floors and rooms inside it [Schema]
Why Inventory owns it: SITE is a RESOURCE subtype (category FACILITY) and the second aggregate root (16 referencing tables)
Dependent tables:    SITE ← NETWORK_ELEMENT, RACK, PASSIVE_ASSET, POWER_UNIT, POWER_FEED, RADIO_SECTOR, ANTENNA, CLOUD_CLUSTER,
                     IP_SUBNET, FLOOR, ROOM, SITE_CONTACT, SITE_ISSUE, CAPEX_PLAN, OPEX_PLAN, SCAN_JOB_SCOPE, NE_MOVEMENT (from/to)
UI relevance:        UI Direct (Location, Site details, Facility)
Future notes:        Passive Inventory, Open/CoPEX and Discovery all reference SITE; SITE must remain the shared location identity.
                     [Validate] FLOOR/ROOM could be argued to be Passive facility data; kept here because RACK→ROOM and they carry no asset attributes
```

### 7.6 Resource satellites (4 tables)

```
Table:               RESOURCE, RESOURCE_ATTRIBUTE, RESOURCE_TECHNOLOGY, RESOURCE_RELATIONSHIP
Purpose:             Supertype row; typed custom attribute values; technology tags; typed cross-domain dependency [Schema]
Why Inventory owns it: They define what "a resource" is; every subtype cascades from RESOURCE
Dependent tables:    RESOURCE ← 25 tables
UI relevance:        RESOURCE Backend Only; the others UI Indirect / Direct (relationships)
External dependency: RESOURCE_RELATIONSHIP.EXTERNAL_SYSTEM_ID_FK records discovered edges
```

### 7.7 Reconciliation governance & workflow (4 tables)

```
Table:               RECON_RULE, RECON_RULE_CONDITION, RECON_RULE_EVENT, RECON_EXCEPTION
Purpose:             Rule with lifecycle roles; its conditions; append-only approval trail; discrepancy needing a human [Schema]
Why Inventory owns it: Rules define what "correct inventory" means; exceptions are the human workflow that repairs the golden
                     record. Both carry business roles (owner, reviewer, approver, team) rather than pipeline state. [Inferred]
Dependent tables:    RECON_RULE ← RECON_RULE_CONDITION, RECON_RULE_EVENT, RECON_JOB_RULE, RECON_RUN_RULE, RECON_RESULT, RECON_EXCEPTION
UI relevance:        UI Direct (Rules, Exceptions)
External dependency: Engine creates exceptions and results, flips ACTIVE↔EXECUTING (RECON_RULE_TRANSITION actor SYSTEM)
Future notes:        [Validate] if Reconciliation is carved out as its own module, these four move with it and Inventory keeps
                     RECON_STATE on resources only
```

### 7.8 Reporting catalogue (1 table)

```
Table:               REPORT_DEFINITION
Purpose:             Report catalogue entry with cadence and distribution [Schema]
Why Inventory owns it: Product-owned catalogue; the generated REPORT_RUN rows are integration output
UI relevance:        UI Direct (Reports)
```

### 7.9 Inventory configuration (2 tables)

`PRODUCT_MODEL_POLICY` (tenant golden OS version per model) and `ATTRIBUTE_DEFINITION` (tenant custom-attribute schema) are Inventory configuration and stay.

---

## 8. User Management Integration

### 8.1 The `USER` table [Schema]

- Columns: `ID BIGINT`, `CUSTOMER_ID`, `USERNAME`, `DISPLAY_NAME`, `USER_TYPE`, `STATUS`, `DISABLED_TIME`, audit columns.
- Comment: *"The single user table for the platform and every integration. No email or other contact PII is stored; IAM owns it."*
- Unique keys: `(CUSTOMER_ID, USERNAME)`, `(CUSTOMER_ID, ID)`.

Interpretation: the table is already designed as a **reference copy**, not as a User Management domain. Its decision is `KEEP — REFERENCE`.

### 8.2 Tables referencing `USER` (11 tables, 13 FK columns) [Schema]

```
USER
 ├── CAPEX_PLAN.OWNER_ID_FK                 (Open/CoPEX candidate)
 ├── OPEX_PLAN.OWNER_ID_FK                  (Open/CoPEX candidate)
 ├── NETWORK_ELEMENT.DECOMMISSIONED_BY_FK   (Inventory)
 ├── NE_MOVEMENT — none (CREATOR is a plain BIGINT, no FK)
 ├── POWER_UNIT_TEST.TESTED_BY_FK           (Passive candidate)
 ├── RECON_EXCEPTION.ASSIGNEE_ID_FK         (Inventory)
 ├── RECON_EXCEPTION.DISPOSITION_BY_FK      (Inventory)
 ├── RECON_RULE.OWNER_ID_FK                 (Inventory)
 ├── RECON_RULE.REVIEWER_ID_FK              (Inventory)
 ├── RECON_RULE.APPROVER_ID_FK              (Inventory)
 ├── RECON_RULE.EXECUTOR_ID_FK              (Inventory)
 ├── RECON_RULE_EVENT.ACTOR_ID_FK           (Inventory)
 ├── TEAM_MEMBER.USER_ID_FK                 (validate)
 └── USER_IDENTITY.USER_ID_FK (CASCADE)     (User Management)
```

All references are `RESTRICT` except `USER_IDENTITY` (cascade). `CREATOR` / `LAST_MODIFIER` on every table are `BIGINT` without FK, so audit attribution already tolerates users that are not present locally **[Schema]**.

### 8.3 User-related tables and their classification

| Table | Belongs to | Decision | Reasoning |
|---|---|---|---|
| `USER` | User Management (source) / Inventory (reference) | KEEP — REFERENCE | Required by 13 FK columns; minimal columns; no PII |
| `USER_IDENTITY` | User Management | FUTURE MOVE | External-system identities (`EXTERNAL_USER_ID`, `IS_AUTH_SOURCE`) are identity federation, not inventory. No Inventory table references it. Inventory needs only `USER.ID` |
| `TEAM` | **[Validate]** | VALIDATE | Owner queue for exceptions, rules, site issues ("Architecture", "NOC Transport"). If User Management provides groups, `TEAM` becomes a CDC reference copy like `USER`; if teams are product-specific work queues, they stay |
| `TEAM_MEMBER` | follows `TEAM` | VALIDATE | Membership of users in teams |
| `TENANT` | Platform / User Management | KEEP — REFERENCE | Root of every `CUSTOMER_ID`; the tenant registry is presumably platform-owned |

### 8.4 CDC scope [Inferred]

Minimum CDC payload into Inventory: `USER(ID, CUSTOMER_ID, USERNAME, DISPLAY_NAME, USER_TYPE, STATUS, DISABLED_TIME)`. Hard deletes upstream must arrive as `STATUS = DISABLED` (the FKs are `RESTRICT`). If `TEAM` is confirmed as a User Management group, add `TEAM(ID, CUSTOMER_ID, CODE, NAME)` and `TEAM_MEMBER`.

### 8.5 Future API needs from User Management

- Resolve a user id to display name and status (pickers, "assigned to" labels) — served locally from the CDC copy.
- Role / permission checks for `allowedActions` on rules and exceptions — an **API / token claim**, not a table.
- Identity lookups (`USER_IDENTITY`) — API only, once the table moves.

---

## 9. Passive Inventory Integration

### 9.1 Evidence in the schema

| Evidence | Detail |
|---|---|
| `RESOURCE_CLASS.INVENTORY_CATEGORY = 'PASSIVE'` **[Schema]** | Exactly five classes: `ANTENNA`, `PASSIVE_ASSET`, `PASSIVE_PORT`, `POWER_UNIT`, `RACK` |
| Comments **[Schema]** | `PASSIVE_ASSET`: "Passive / site-infrastructure asset of a governed type; **fiber plant excluded**". `POWER_UNIT`: "facility tab + **Passive > Power plant**". `PASSIVE_ASSET_TYPE`: "fiber plant excluded" |
| Existing externalisation **[Schema]** | Fiber spans, ducts, splice closures, ODN splitters, strands are `EXTERNAL_OBJECT_TYPE` rows of `SYSTEM_TYPE = FIBER_INVENTORY`, proxied through `EXTERNAL_RESOURCE` ("ids only, no copied attributes") |
| Existing UI | Passive Infrastructure screens: ODF, Racks, Power plant, Patch cords, Splice, Ducts, Fiber spans |

### 9.2 Classification

| Table | Represents | Classification | Reasoning | Inventory needs | Integration | Local data eventually removed? |
|---|---|---|---|---|---|---|
| `PASSIVE_ASSET` | Passive asset | **Belongs to Passive Inventory** (FUTURE MOVE) | Category PASSIVE; governed by `PASSIVE_ASSET_TYPE`; "fiber plant excluded" shows the passive domain was already being split | Site occupancy, rack occupancy, antenna mounts, passive port identities for patching | API (list by site / rack / type; get by id) | Yes, replaced by `EXTERNAL_RESOURCE` proxies or an external id |
| `PASSIVE_ASSET_TYPE` | Passive configuration / reference | Belongs to Passive Inventory (FUTURE MOVE) | Type catalog with `HAS_PORTS`, `IS_RACK_MOUNTABLE` | Type labels for display | API reference | Yes |
| `PATCH_CORD` | Passive relationship | Belongs to Passive Inventory (FUTURE MOVE) | Detail of a `PASSIVE_ASSET` of type PATCH_CORD | Which two ports are joined (physical connectivity) | API | Yes; but see FK impact on `PORT` |
| `POWER_UNIT` | Passive asset (power plant) | Belongs to Passive Inventory (FUTURE MOVE, Medium) | Category PASSIVE; comment names "Passive > Power plant" | Power unit reference for `NE_POWER_DETAIL`, site power summary | API | Likely; keep a reference row while `NE_POWER_DETAIL.POWER_UNIT_ID_FK` exists |
| `POWER_UNIT_TEST` | Passive history / status | Belongs to Passive Inventory (FUTURE MOVE, Medium) | Test log of a power unit | "power overdue" flag only | API | Yes |
| `RACK` | Passive asset / facility | **Needs business validation** | Category PASSIVE, but `NETWORK_ELEMENT.RACK_ID_FK` + `RACK_U_START/END` place inventory devices in it; `RACK → ROOM` ties it to facility layout | Rack identity and U positions for elevation view | API or reference copy | Only if `NETWORK_ELEMENT` switches to an external rack id |
| `ANTENNA` | Passive asset with RAN engineering data | **Needs business validation** | Category PASSIVE, but azimuth / tilts / RET / gain are RAN parameters used by `CELL_ANTENNA` | Antenna identity per cell; azimuth/tilt for RAN views | API or reference copy | Depends on split of physical asset vs radio parameters |
| `POWER_FEED` | Facility status | Needs business validation | Not a `RESOURCE` subtype; AC/DC feed of a site | Site power capacity | API or keep | Undetermined |
| `PORT` (rows with `PASSIVE_ASSET_ID_FK`) | Passive ports (ODF / DDF positions) | Follows `PASSIVE_ASSET` | `RESOURCE_CLASS PASSIVE_PORT`; unique key `(CUSTOMER_ID, PASSIVE_ASSET_ID_FK, NAME)` | Port identities for `PATCH_CORD` and physical `LINK` endpoints **[Validate]** | API | Partially: the NE-port rows stay |
| `EXTERNAL_RESOURCE`, `EXTERNAL_OBJECT_TYPE` | Proxy of externally owned passive objects | **Integration / reference only** (INTEGRATE) | Already the mechanism for fiber plant | Label, type, external id, last sync | API sync | No; this *is* the future pattern |
| `FLOOR`, `ROOM` | Facility layout | Keep in Inventory (Medium) | Carry no asset attributes; `RACK → ROOM` | — | — | No |

### 9.3 What Inventory will need from Passive Inventory

1. Rack identity and free/occupied U positions per site (for device placement and elevation).
2. Passive port identities (ODF/DDF positions) to terminate physical links and patch cords.
3. Antenna identity, azimuth, tilts per sector (for cells).
4. Power unit identity and "test overdue" status per site (for `NE_POWER_DETAIL` and site health).
5. Counts per site for the Location and Passive screens.

Proposed mechanism: extend the existing `EXTERNAL_RESOURCE` / `EXTERNAL_OBJECT_TYPE` proxy pattern with a `SYSTEM_TYPE = PASSIVE_INVENTORY` and object types RACK, ANTENNA, POWER_UNIT, PASSIVE_ASSET, PASSIVE_PORT. **[Inferred; design proposal only]**

---

## 10. Open / CoPEX Module Separation

### 10.1 Interpretation [Validate]

The schema has no table named `OPEN` or `COPEX`. The financial planning family is `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL`, backing the existing Capex and Opex screens under Site details. This analysis reads **"CoPEX" as the Capex + Opex family** and **"Open" as Opex**. If "Open" denotes something else (for example open work items or a different product), section 10 must be revisited.

### 10.2 Tables

| Table | Domain | Current Inventory dependency | Future owner | Required Inventory integration | Potential API | Mock API? | Migration considerations |
|---|---|---|---|---|---|---|---|
| `CAPEX_PLAN` | Capex | `SITE_ID_FK` (site), `OWNER_ID_FK` (user) | Open/CoPEX | Site-level capex summary (approved amount, AFE) | `GET /api/copex/capex/plans?siteId=&fy=` | Yes | Site id and user id become external references in the new module |
| `CAPEX_LINE` | Capex | `CAPEX_PLAN`, `VENDOR_ID_FK` | Open/CoPEX | Line items for the site Capex screen | `GET /api/copex/capex/plans/{id}` (lines embedded) | Yes | Vendor id must resolve to the shared vendor catalog |
| `CAPEX_LINE_RESOURCE` | Capex ↔ Inventory bridge | `RESOURCE_ID_FK` (inventory resource) | Open/CoPEX (holds Inventory resource ids) | "Funded by" on a resource detail | `GET /api/copex/capex/lines?resourceId=` | Yes | Becomes an external-id reference to `RESOURCE.ID` |
| `OPEX_PLAN` | Opex | `SITE_ID_FK`, `OWNER_ID_FK` | Open/CoPEX | Site-level monthly budget | `GET /api/open/opex/plans?siteId=&fy=` | Yes | As `CAPEX_PLAN` |
| `OPEX_LINE` | Opex | `OPEX_PLAN` | Open/CoPEX | Contracts and recurring costs per site | embedded in plan | Yes | `SUPPLIER` is free text (no vendor FK) |
| `OPEX_MONTH_ACTUAL` | Opex | `OPEX_PLAN` | Open/CoPEX | 12-month trend | embedded in plan | Yes | Pure financial data |
| `RESOURCE_ASSET` | Commercial record of a resource | `RESOURCE_ID_FK` (1:1) | **[Validate]** Inventory vs Open/CoPEX | Asset tag, warranty, AMC on resource detail; purchase cost feeds finance | `GET /api/resources/{id}/asset` (Inventory) or `GET /api/copex/assets?resourceId=` | Maybe | Asset tag and warranty are inventory-operational; PO number, purchase cost and currency are financial. A column-level split may be needed |

### 10.3 Shared data between Inventory and Open/CoPEX

| Shared concept | Owner | Exchanged as |
|---|---|---|
| Site identity (`SITE.ID`, `CODE`) | Inventory | Site id in Open/CoPEX records |
| Resource identity (`RESOURCE.ID`) | Inventory | Resource id in `CAPEX_LINE_RESOURCE` |
| Vendor (`VENDOR`) | Shared reference **[Validate]** | Vendor id |
| User (`USER`) | User Management | User id (owner) |
| Financial year, currency | Open/CoPEX | Values in API responses |

### 10.4 Data Inventory needs from Open/CoPEX (for the existing screens)

- Capex plan header and lines per site and financial year.
- Opex plan header, lines and monthly actuals per site and financial year.
- Optional: total spend per resource (from `CAPEX_LINE_RESOURCE`) for the resource detail.

---

## 11. JOB / NiFi / Spark Integration

### 11.1 What "JOB" is in this schema [Schema]

There is no table named `JOB`. Two job families exist:

```
Discovery family                                  Reconciliation family
SCAN_JOB          job definition + schedule       RECON_JOB          job definition + cron
SCAN_JOB_SCOPE    job parameters                  RECON_JOB_RULE     job parameters (rules to run)
SCAN_TARGET       polled addresses + cached state RECON_RUN          execution (cycle)
SCAN_RUN          execution                       RECON_RUN_RULE     per-rule execution figures
SCAN_RUN_TARGET   per-target execution result     RECON_RESULT       per-subject output
SCAN_STEP_RESULT  step log (transcript line)      RECON_RESULT_FIELD field-level evidence
SCAN_STEP_PAYLOAD raw encrypted payload
COLLECTOR         execution node                  Shared / other
CREDENTIAL_PROFILE  access configuration (vault) REPORT_RUN            report generation execution
DISCOVERY_STEP_DEF  step catalog                  NE_HEALTH             latest probe result
                                                  DOMAIN_TRUST_SNAPSHOT daily KPI aggregation
                                                  RESOURCE_FIELD_PROVENANCE per-field evidence written by pipelines
```

Comments confirm the technical nature: `SCAN_RUN` "Target counts are derived from SCAN_RUN_TARGET (V_SCAN_RUN_SUMMARY)"; `SCAN_STEP_PAYLOAD` "Split out so hot tables stay narrow; purged by retention"; `NE_HEALTH` "history belongs to PM"; `RECON_RUN` "Scanned / drifted / auto-resolved figures are derived from results and exceptions" **[Schema]**.

### 11.2 Classification

| Table | Kind | Classification | Notes |
|---|---|---|---|
| `SCAN_JOB`, `SCAN_JOB_SCOPE` | Job configuration / scheduling / parameters | Integration-owned; UI defines | UI writes the definition; a scheduler (NiFi/Spark candidate) executes it |
| `SCAN_TARGET` | Job parameter + cached status | Integration-owned; UI read-only | FK `NETWORK_ELEMENT_ID_FK` links back into Inventory |
| `SCAN_RUN`, `SCAN_RUN_TARGET` | Job execution / history / status | Integration-owned; UI-read-only | `MATCHED_NE_ID_FK` links back into Inventory |
| `SCAN_STEP_RESULT` | Job log | Integration-owned; UI-read-only | Transcript |
| `SCAN_STEP_PAYLOAD` | Job log (raw) | Technical / internal | Encrypted; retention-purged; permissioned read only |
| `COLLECTOR` | Job infrastructure | NiFi/Spark-related / integration | Node registry and health |
| `CREDENTIAL_PROFILE` | Job configuration | Integration reference | Vault reference only |
| `DISCOVERY_STEP_DEF` | Job configuration (reference) | Integration reference (seeded) | Step catalog per domain |
| `RECON_JOB`, `RECON_JOB_RULE` | Job configuration / parameters | Integration-owned; UI defines | Links to Inventory-owned `RECON_RULE` |
| `RECON_RUN`, `RECON_RUN_RULE` | Job execution / history | Integration-owned; UI-read-only | `SCAN_RUN_ID_FK` links the two families |
| `RECON_RESULT`, `RECON_RESULT_FIELD` | Job output | Integration-owned; UI-read-only | High volume (BIGINT keys) |
| `REPORT_RUN` | Job execution (report generation) | Integration-owned; UI-read-only | File artefacts |
| `NE_HEALTH` | Probe result | Integration-owned; UI-read-only | Latest ICMP/NTP |
| `DOMAIN_TRUST_SNAPSHOT` | Batch aggregation | Spark-related / technical | Daily derived series |
| `RESOURCE_FIELD_PROVENANCE` | Pipeline evidence | Integration-owned; UI-read-only | Written by pipelines; read by UI |
| `EXTERNAL_SYSTEM`, `RESOURCE_EXTERNAL_REF`, `EXTERNAL_RESOURCE`, `EXTERNAL_OBJECT_TYPE` | Integration registry / cross-reference | Integration reference | Stay in Inventory as the anchor for every cross-system link |

All of these receive decision `TECHNICAL / INTEGRATION` (or `INTEGRATE` for the four registry tables), `Keep in Inventory = Keep for now`, `Action Now = No change`.

### 11.3 What stays business-owned despite the "recon" prefix [Inferred]

`RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_RULE_EVENT`, `RECON_EXCEPTION` are governed by people (owner / reviewer / approver / team, SLA, disposition). They are classified `KEEP` in Inventory. The engine only *reads* rules and *creates* results and exceptions.

### 11.4 Where NiFi / Spark plausibly sit [Inferred; Validate]

- NiFi: collector orchestration, protocol adapters (SNMP/SSH/NETCONF/TL1), payload landing into `SCAN_STEP_RESULT` / `SCAN_STEP_PAYLOAD`, external-system sync into `EXTERNAL_RESOURCE` / `RESOURCE_EXTERNAL_REF`, CDC landing into `USER`.
- Spark: bulk comparison producing `RECON_RESULT` / `RECON_RESULT_FIELD`, daily `DOMAIN_TRUST_SNAPSHOT`, report generation (`REPORT_RUN`).
- Whether these tables physically stay in the Inventory database or move to an integration store is an infrastructure decision; the FK links back into Inventory (`SCAN_TARGET.NETWORK_ELEMENT_ID_FK`, `SCAN_RUN_TARGET.MATCHED_NE_ID_FK`, `RECON_RESULT.RESOURCE_ID_FK`, `RECON_EXCEPTION.RECON_RESULT_ID_FK / SCAN_TARGET_ID_FK`) would have to become external ids first (section 14).

---

## 12. Reference and Lookup Tables

| Table | Kind | Owner | Global / tenant | Notes |
|---|---|---|---|---|
| `DOMAIN` | Domain taxonomy (9 rows) | Shared reference, Inventory-hosted | Global, seeded | Comment: "shared by Discovery, Reconciliation and Inventory" |
| `NE_CLASS`, `NE_CLASS_DOMAIN` | Device classes (25) and allowed domains | Inventory | Global, seeded | Drive detail tables |
| `RESOURCE_CLASS` | Subtype registry (21) | Inventory | Global, seeded | Marks PASSIVE category |
| `NE_STOCK_TRANSITION` | Stock state machine (14) | Inventory | Global, seeded | |
| `TECHNOLOGY` | Technologies with generation | Shared reference, Inventory-hosted | Global, seeded | |
| `FREQUENCY_BAND` | Bands per technology | Inventory | Global, seeded | |
| `LINK_LAYER` | Link kinds (45) | Inventory | Global, seeded | |
| `SERVICE_TYPE` | Service kinds (12) | Inventory | Global, seeded | |
| `SITE_TYPE` | Site kinds | Inventory | Global, not seeded | |
| `NETWORK_FUNCTION_TYPE` | Core NF catalog | Inventory | Global, seeded | |
| `RELATIONSHIP_TYPE`, `RELATIONSHIP_RULE` | Relationship kinds and allowed triples | Inventory | Global, seeded | |
| `RECON_FIELD` | Comparable fields | Inventory | Global, seeded | Used by rules, provenance, results |
| `RECON_STATE_MAP` | Outcome → state (8) | Inventory / Reconciliation service | Global, seeded | Shared contract between engine and inventory |
| `RECON_RULE_TRANSITION` | Rule lifecycle (12) | Inventory | Global, seeded | |
| `DISCREPANCY_TYPE` | Exception types | Inventory / Reconciliation service | Global, not seeded | |
| `DISCOVERY_STEP_DEF` | Collector steps | Integration | Global, not seeded | Classified E/F |
| `EXTERNAL_OBJECT_TYPE` | External object kinds | Integration | Global, seeded | |
| `PASSIVE_ASSET_TYPE` | Passive asset kinds | Passive Inventory | Global, seeded | Classified C |
| `VENDOR` | Vendors | **[Validate]** shared master data | Global (inferred) | DDL absent; used by Inventory, Passive, Capex, Integration |
| `PRODUCT_MODEL` | Vendor product catalog incl. passive and power products | **[Validate]** shared master data | Global (no `CUSTOMER_ID`) | EoS/EoL dates; `NE_CLASS` binding |
| `PRIMARY_GEO_L1..L4` | Geography | **[Validate]** shared master data | Tenant | Organisation-wide; may originate in a master-data or scoping service |
| `OPERATIONAL_AREA` | Region > Circle > Zone > Division > Territory | **[Validate]** shared master data | Tenant | Used for ownership and reporting; often mirrors user scoping in User Management |
| `ATTRIBUTE_DEFINITION` | Custom attribute schema | Inventory | Tenant | |

External reference data that Inventory currently hosts but may not own: `VENDOR`, `PRODUCT_MODEL`, `PRIMARY_GEO_*`, `OPERATIONAL_AREA`. If another module is the source, these become CDC reference copies exactly like `USER`.

---

## 13. Technical / Audit Tables

| Table | Purpose | Remain local? | Notes |
|---|---|---|---|
| `TENANT` | Tenant registry root | Yes (reference) | Likely platform-owned; CDC copy |
| `RESOURCE` | Supertype row | Yes | Inventory core, technical shape |
| `NE_MOVEMENT` | Append-only stock trail | Yes | Business trail, trigger-enforced per comment |
| `RECON_RULE_EVENT` | Append-only approval trail | Yes | Business trail |
| `SCAN_STEP_PAYLOAD` | Encrypted raw payload | Keep for now | Retention-purged; candidate for an integration/object store |
| `DOMAIN_TRUST_SNAPSHOT` | Daily KPI aggregation | Keep for now | Candidate for an analytics store |
| `NE_HEALTH` | Latest probe result | Keep for now | "history belongs to PM" |

No `*_AUD`, `REVINFO`, log, error or migration tables exist in this schema **[Schema]**; auditing is a separate module's responsibility.


---

## 14. Foreign Key Dependency Analysis

All FK facts below are **[Schema]**. `CUSTOMER_ID → TENANT` (present on every tenant table) is omitted. 79 foreign keys cross a proposed ownership boundary; they fall into two directions.

### 14.1 Direction 1 — external-module tables referencing Inventory (easy direction)

When a table moves out, these FKs disappear with it and become plain ids inside the other module. Inventory loses nothing.

```
SITE  ◀── CAPEX_PLAN.SITE_ID_FK, OPEX_PLAN.SITE_ID_FK              (Open/CoPEX)
      ◀── PASSIVE_ASSET.SITE_ID_FK, RACK.SITE_ID_FK, POWER_UNIT.SITE_ID_FK, ANTENNA.SITE_ID_FK, POWER_FEED.SITE_ID_FK (Passive)
      ◀── SCAN_JOB_SCOPE.SITE_ID_FK                                (Integration)
RESOURCE ◀── CAPEX_LINE_RESOURCE.RESOURCE_ID_FK                     (Open/CoPEX)
         ◀── PASSIVE_ASSET / RACK / POWER_UNIT / ANTENNA .RESOURCE_ID_FK (cascade)   (Passive)
         ◀── RECON_RESULT.RESOURCE_ID_FK, RESOURCE_EXTERNAL_REF, RESOURCE_FIELD_PROVENANCE, EXTERNAL_RESOURCE (Integration)
NETWORK_ELEMENT ◀── SCAN_TARGET.NETWORK_ELEMENT_ID_FK, SCAN_RUN_TARGET.MATCHED_NE_ID_FK, NE_HEALTH (Integration)
ROOM  ◀── RACK.ROOM_ID_FK                                           (Passive)
PORT  ◀── PATCH_CORD.A_PORT_ID_FK, PATCH_CORD.Z_PORT_ID_FK          (Passive)
RADIO_SECTOR ◀── ANTENNA.RADIO_SECTOR_ID_FK                         (Passive)
RECON_RULE ◀── RECON_JOB_RULE, RECON_RUN_RULE, RECON_RESULT .RECON_RULE_ID_FK   (Integration)
RECON_FIELD ◀── RECON_RESULT_FIELD.FIELD_CODE, RESOURCE_FIELD_PROVENANCE.FIELD_CODE (Integration)
REPORT_DEFINITION ◀── REPORT_RUN.REPORT_DEFINITION_ID_FK             (Integration)
DOMAIN ◀── SCAN_JOB, RECON_JOB, COLLECTOR, CREDENTIAL_PROFILE, EXTERNAL_SYSTEM .DOMAIN_ID_FK (Integration)
OPERATIONAL_AREA ◀── SCAN_JOB, CREDENTIAL_PROFILE .OPERATIONAL_AREA_ID_FK (Integration)
VENDOR / PRODUCT_MODEL ◀── PASSIVE_ASSET, POWER_UNIT, ANTENNA, CAPEX_LINE, EXTERNAL_SYSTEM, SCAN_TARGET (all boundaries)
USER  ◀── CAPEX_PLAN.OWNER_ID_FK, OPEX_PLAN.OWNER_ID_FK (Open/CoPEX), POWER_UNIT_TEST.TESTED_BY_FK (Passive)
```

Consequence: `SITE`, `RESOURCE`, `NETWORK_ELEMENT`, `PORT`, `USER`, `VENDOR`, `DOMAIN` and `OPERATIONAL_AREA` are **shared identities**. Their ids must be stable and exposed by API so other modules can hold them as external references.

### 14.2 Direction 2 — Inventory tables referencing tables that would move out (blocking direction)

These decide whether a move is feasible. Each must become an external id (no FK) or a reference row kept locally via sync.

```
RACK (Passive candidate)
 └── NETWORK_ELEMENT.RACK_ID_FK  (+ RACK_U_START, RACK_U_END)         RESTRICT   ← 1 Inventory table
     Why: device placement. Options: keep RACK as a synced reference row (recommended if Passive owns racks), or store
     an external rack id without FK. CDC/API sync sufficient; UI needs rack code + height for elevation.

POWER_UNIT (Passive candidate)
 └── NE_POWER_DETAIL.POWER_UNIT_ID_FK                                  RESTRICT   ← 1 Inventory table
     Why: a monitored power controller (active NE) manages a power unit. Becomes an external id; API lookup for label.

ANTENNA (Passive candidate)
 └── CELL_ANTENNA.ANTENNA_ID_FK                                        RESTRICT   ← 1 Inventory table
     Why: cells radiate through antennas. Becomes an external id; RAN views need azimuth/tilt → API or synced copy.

PASSIVE_ASSET (Passive candidate)
 └── PORT.PASSIVE_ASSET_ID_FK                                          RESTRICT   ← PORT rows of class PASSIVE_PORT
     Why: ODF/DDF positions are ports. Either the passive PORT rows move too (then LINK / PATCH_CORD endpoints on passive
     ports need external ids) or passive ports stay as reference rows. [Validate]

USER (User Management, reference copy stays)
 └── 13 FK columns (section 8.2)                                       RESTRICT   ← 11 tables
     Why: ownership and attribution. FKs can remain against the CDC reference copy; no API lookup needed at read time.

TEAM (Validate)
 └── RECON_EXCEPTION.OWNER_TEAM_ID_FK, RECON_RULE.EXCEPTION_REVIEWER_TEAM_ID_FK, SITE_ISSUE.OWNER_TEAM_ID_FK   RESTRICT
     Why: work queues. If TEAM becomes a User Management group, keep as CDC reference copy (same pattern as USER).

RECON_RESULT / SCAN_TARGET (Integration)
 └── RECON_EXCEPTION.RECON_RESULT_ID_FK, RECON_EXCEPTION.SCAN_TARGET_ID_FK   RESTRICT   ← 1 Inventory table
     Why: an exception points at the evidence that raised it. If results/targets leave the database, these become external
     ids and the UI fetches evidence through the Reconciliation/Discovery API.

EXTERNAL_SYSTEM (Integration registry, stays)
 └── RESOURCE_RELATIONSHIP.EXTERNAL_SYSTEM_ID_FK, USER_IDENTITY, RESOURCE_EXTERNAL_REF, RESOURCE_FIELD_PROVENANCE, SCAN_JOB, EXTERNAL_RESOURCE
     Why: every cross-system link needs the registry. Recommendation: EXTERNAL_SYSTEM stays in Inventory as the anchor.

VLAN / VRF (DDL missing)
 └── PORT_VLAN.VLAN_ID_FK, PORT.VRF_ID_FK                              ← cannot be assessed until DDL is available
```

### 14.3 Cascade paths that matter for ownership [Schema]

- `RESOURCE` → every subtype (cascade). Moving a subtype (e.g. `PASSIVE_ASSET`) out means either deleting its `RESOURCE` rows or converting them to `EXTERNAL_RESOURCE` proxies so relationships, provenance and capex links keep resolving.
- `PASSIVE_ASSET` → `PATCH_CORD` (cascade); `POWER_UNIT` → `POWER_UNIT_TEST` (cascade); `CAPEX_PLAN` → `CAPEX_LINE` → `CAPEX_LINE_RESOURCE` (cascade); `OPEX_PLAN` → `OPEX_LINE`, `OPEX_MONTH_ACTUAL` (cascade). Each family moves as a unit.
- `SCAN_RUN` → `SCAN_RUN_TARGET` → `SCAN_STEP_RESULT` → `SCAN_STEP_PAYLOAD` (cascade); `RECON_RUN` → `RECON_RESULT` → `RECON_RESULT_FIELD` (cascade). Job families move as units; `RECON_RUN.SCAN_RUN_ID_FK` (restrict) ties the two.
- `USER` → `USER_IDENTITY` (cascade): removing `USER_IDENTITY` has no downstream effect.

### 14.4 Is CDC sufficient, or is an API lookup required?

| Referenced domain | Read-time need | CDC copy sufficient? | API needed for |
|---|---|---|---|
| Users | name, status | Yes | permissions / roles |
| Teams (if external) | name | Yes | membership admin |
| Racks | code, height, occupancy | Yes for code/height | occupancy and elevation if Passive owns placement |
| Antennas | code, azimuth, tilts | Partially | full RF parameters |
| Power units | code, overdue flag | Yes | test history |
| Passive assets / ports | label, type | Proxy row (`EXTERNAL_RESOURCE`) | everything else |
| Capex / Opex | none at read time in Inventory tables | n/a | all screen data (mock first) |
| Job results | evidence for exceptions | No | results, fields, transcripts |
| Vendors / models / geo / areas | labels | Yes | catalog admin |

---

## 15. UI Relevance Analysis

Evidence: existing screens in `src/routes.ts` and legacy views, table structure and status/configuration columns.

| Relevance | Tables | Evidence |
|---|---|---|
| **UI Direct** (displayed / managed on screens) | `NETWORK_ELEMENT` + 11 details, `NE_VIRTUAL_INSTANCE`, `NE_MOVEMENT`, `EQUIPMENT_COMPONENT`, `PORT`, `IP_SUBNET`, `LINK`, `SERVICE_INSTANCE`, `NETWORK_SLICE`, `PLMN`, `RADIO_SECTOR`, `RADIO_CELL`, `SITE`, `FLOOR`, `ROOM`, `SITE_CONTACT`, `SITE_ISSUE`, `CLOUD_CLUSTER`, `RESOURCE_RELATIONSHIP`, `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_RULE_EVENT`, `RECON_EXCEPTION`, `REPORT_DEFINITION`, `PRODUCT_MODEL_POLICY`, `TEAM`, `PASSIVE_ASSET`, `PATCH_CORD`, `RACK`, `POWER_UNIT`, `POWER_UNIT_TEST`, `POWER_FEED`, `ANTENNA`, `CAPEX_*`, `OPEX_*`, `RESOURCE_ASSET` | Existing screens (Physical/Virtual/Passive Resources, Links, Services, Location & Facility, Rules, Exceptions, Reports, Capex/Opex) or status/owner columns clearly meant for people |
| **UI Indirect** (needed, but via API/service) | `USER`, `TEAM_MEMBER`, all reference catalogs, geo and areas, `VENDOR`, `PRODUCT_MODEL`, `LINK_*_ATTR`, `SERVICE_ENDPOINT`, `RADIO_CELL_PLMN`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `VLAN`, `VRF`, `RESOURCE_ATTRIBUTE`, `RESOURCE_TECHNOLOGY`, `ATTRIBUTE_DEFINITION`, `EXTERNAL_RESOURCE`, `EXTERNAL_SYSTEM`, `RESOURCE_EXTERNAL_REF`, `RESOURCE_FIELD_PROVENANCE`, `NE_HEALTH`, `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF`, `RECON_JOB`, `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD`, `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT`, `CAPEX_LINE_RESOURCE` | Embedded in a parent DTO, shown as labels/pickers, or read-only integration data shown on Scan/Reconciliation/Insights screens |
| **Backend Only** | `RESOURCE`, `RESOURCE_CLASS`, `NE_CLASS_DOMAIN`, `RELATIONSHIP_RULE`, `RECON_STATE_MAP`, `SCAN_STEP_PAYLOAD` | Structural or validation tables; payload is encrypted |
| **Integration Only** | `EXTERNAL_OBJECT_TYPE`, `USER_IDENTITY` | Exist because of external systems |
| **No UI Requirement** | `TENANT` | Tenant comes from the session |

---

## 16. Cross-Module Ownership Matrix

| Domain | Current Table(s) | Current Location | Future Owner | Inventory Needs Local Data? | Integration | Proposed Approach |
|---|---|---|---|---|---|---|
| Users | `USER`, `USER_IDENTITY` | Inventory DB | User Management | Yes, reference (`USER`) | CDC | Keep minimal `USER`; retire `USER_IDENTITY` once no consumer |
| Teams | `TEAM`, `TEAM_MEMBER` | Inventory DB | **Validate** | Yes (queues) | CDC or local | Decide group vs queue |
| Tenant | `TENANT` | Inventory DB | Platform | Yes, reference | CDC | Keep reference |
| Passive assets | `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, passive `PORT` rows | Inventory DB | Passive Inventory | Proxy / ids only | API (+ proxy sync) | Extend `EXTERNAL_RESOURCE` pattern |
| Power plant | `POWER_UNIT`, `POWER_UNIT_TEST` | Inventory DB | Passive Inventory | Reference row for `NE_POWER_DETAIL` | API | External ownership; keep reference |
| Racks | `RACK` | Inventory DB | **Validate** | Yes (placement) | API / sync | Reference copy if Passive owns |
| Antennas | `ANTENNA` | Inventory DB | **Validate** | Yes (cell binding) | API / sync | Split asset vs RF parameters |
| Site power feeds | `POWER_FEED` | Inventory DB | **Validate** | TBD | API | Undetermined |
| Capex | `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE` | Inventory DB | Open/CoPEX | No (screen data only) | Mock API → API | Mock initially |
| Opex | `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL` | Inventory DB | Open/CoPEX | No | Mock API → API | Mock initially |
| Asset commercial data | `RESOURCE_ASSET` | Inventory DB | **Validate** | Operational fields yes | API | Column-level split candidate |
| Discovery jobs | `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_TARGET`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF` | Inventory DB | Integration / Discovery service | Definitions yes; execution TBD | Integration | Keep for now |
| Discovery execution | `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_RESULT`, `SCAN_STEP_PAYLOAD`, `NE_HEALTH` | Inventory DB | Integration / NiFi | TBD | Integration | Keep for now |
| Reconciliation jobs & output | `RECON_JOB`, `RECON_JOB_RULE`, `RECON_RUN`, `RECON_RUN_RULE`, `RECON_RESULT`, `RECON_RESULT_FIELD` | Inventory DB | Integration / Reconciliation service (Spark) | TBD | Integration | Keep for now |
| Reconciliation governance | `RECON_RULE`, `RECON_RULE_CONDITION`, `RECON_RULE_EVENT`, `RECON_EXCEPTION` | Inventory DB | Inventory (validate if Reconciliation becomes a module) | Yes | — | Keep |
| Reporting | `REPORT_DEFINITION`, `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT` | Inventory DB | Inventory (definition) / Integration (runs, snapshots) | Definition yes | Integration | Keep for now |
| External registry | `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REF`, `RESOURCE_FIELD_PROVENANCE` | Inventory DB | Integration layer (anchored in Inventory) | Yes | Sync | Keep as the integration anchor |
| Shared master data | `VENDOR`, `PRODUCT_MODEL`, `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA` | Inventory DB | **Validate** | Yes, reference | CDC if external | Reference copies if a master-data owner exists |
| Core inventory | everything else (section 7) | Inventory DB | Inventory | Yes | — | Keep |

---

## 17. Tables That Should Remain in Inventory

```
Core Inventory (42)
├── RESOURCE, RESOURCE_ATTRIBUTE, RESOURCE_TECHNOLOGY, RESOURCE_RELATIONSHIP
├── NETWORK_ELEMENT, NE_RAN_DETAIL, NE_CORE_DETAIL, NE_IPMPLS_DETAIL, NE_SWITCH_DETAIL, NE_OPTICAL_DETAIL,
│   NE_MICROWAVE_DETAIL, NE_PON_DETAIL, NE_WIFI_DETAIL, NE_SECURITY_DETAIL, NE_SERVER_DETAIL, NE_POWER_DETAIL
├── NE_MOVEMENT, EQUIPMENT_COMPONENT, PORT, PORT_IP_ADDRESS, PORT_VLAN, IP_SUBNET, CLOUD_CLUSTER
├── LINK, LINK_PROTOCOL_ATTR, LINK_MICROWAVE_ATTR
├── SERVICE_INSTANCE, SERVICE_ENDPOINT, NETWORK_SLICE
├── RADIO_SECTOR, RADIO_CELL, RADIO_CELL_PLMN, CELL_ANTENNA, CELL_RADIO_UNIT, PLMN
├── SITE, FLOOR, ROOM
├── RECON_RULE, RECON_RULE_CONDITION, RECON_RULE_EVENT, RECON_EXCEPTION
├── REPORT_DEFINITION, PRODUCT_MODEL_POLICY
│
Inventory-owned reference (18)
├── DOMAIN, NE_CLASS, NE_CLASS_DOMAIN, RESOURCE_CLASS, NE_STOCK_TRANSITION, TECHNOLOGY, FREQUENCY_BAND, LINK_LAYER,
│   SERVICE_TYPE, SITE_TYPE, NETWORK_FUNCTION_TYPE, RELATIONSHIP_TYPE, RELATIONSHIP_RULE, RECON_FIELD, RECON_STATE_MAP,
│   RECON_RULE_TRANSITION, DISCREPANCY_TYPE, ATTRIBUTE_DEFINITION
│
Required reference copies (2)
└── USER, TENANT
```

Total `KEEP` + `KEEP — REFERENCE`: 64 tables.

## 18. Tables That Should Eventually Move Out

```
User Management
└── USER_IDENTITY ............... identity federation; no Inventory consumer

Passive Inventory
├── PASSIVE_ASSET ............... INVENTORY_CATEGORY = PASSIVE; blocked by PORT.PASSIVE_ASSET_ID_FK until passive ports are resolved
├── PASSIVE_ASSET_TYPE .......... its type catalog
├── PATCH_CORD .................. detail of a passive asset; references two PORTs
├── POWER_UNIT .................. "Passive > Power plant"; referenced by NE_POWER_DETAIL (keep a reference row)
└── POWER_UNIT_TEST ............. history of a power unit

Open / CoPEX (interpretation to confirm)
├── CAPEX_PLAN
├── CAPEX_LINE
├── CAPEX_LINE_RESOURCE ......... keeps Inventory RESOURCE ids as external references
├── OPEX_PLAN
├── OPEX_LINE
└── OPEX_MONTH_ACTUAL
```

Candidates that may join this list after validation: `RACK`, `ANTENNA`, `POWER_FEED` (Passive); `RESOURCE_ASSET` (Open/CoPEX, column split); `TEAM`, `TEAM_MEMBER` (User Management); `VENDOR`, `PRODUCT_MODEL`, `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA` (master data); the job-execution families if an integration store is introduced.

## 19. Tables That Require External Integration

| Table | Integration | Direction | Mechanism |
|---|---|---|---|
| `USER`, `TENANT` | User Management / platform | inbound | CDC |
| `TEAM`, `TEAM_MEMBER` | User Management (if groups) | inbound | CDC **[Validate]** |
| `EXTERNAL_SYSTEM`, `EXTERNAL_OBJECT_TYPE`, `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REF` | All external systems | both | sync + API |
| `RESOURCE_FIELD_PROVENANCE`, `NE_HEALTH` | Discovery pipelines | inbound | pipeline writes |
| `SCAN_*`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEF` | Discovery service / NiFi | both (definitions out, results in) | integration API |
| `RECON_JOB*`, `RECON_RUN*`, `RECON_RESULT*` | Reconciliation service / Spark | both | integration API |
| `REPORT_RUN`, `DOMAIN_TRUST_SNAPSHOT` | Reporting / analytics | inbound | batch |
| Passive candidates (`PASSIVE_ASSET`, `PATCH_CORD`, `POWER_UNIT`, `RACK`, `ANTENNA`, passive `PORT` rows) | Passive Inventory | inbound (proxies) | API + `EXTERNAL_RESOURCE` sync |
| `CAPEX_*`, `OPEX_*`, possibly `RESOURCE_ASSET` | Open/CoPEX | outbound (site/resource ids) and inbound (screen data) | Mock API → API |
| `VENDOR`, `PRODUCT_MODEL`, `PRIMARY_GEO_*`, `OPERATIONAL_AREA` | Master data owner **[Validate]** | inbound | CDC if external |

---

## 20. Mock API Planning

Proposals only. Names are placeholders; contracts are conceptual. Nothing is implemented.

### 20.1 Open / CoPEX (mock first)

| API (proposed) | Purpose | Data source (today) | Request | Response concept | Owning module | Mock initially? | Future real API? | Inventory dependency |
|---|---|---|---|---|---|---|---|---|
| `GET /api/copex/capex/plans?siteId=&fy=` | Capex header for Site details | `CAPEX_PLAN` | site id, financial year | plan header: AFE, cost centre, owner, approved amount, currency | Open/CoPEX | Yes | Yes | site id |
| `GET /api/copex/capex/plans/{id}` | Plan with lines | `CAPEX_PLAN` + `CAPEX_LINE` + `CAPEX_LINE_RESOURCE` | plan id | header + lines [description, category, vendor, PO, qty, unit cost, state, resourceIds] | Open/CoPEX | Yes | Yes | vendor ids, resource ids |
| `GET /api/copex/capex/lines?resourceId=` | "Funded by" on resource detail | `CAPEX_LINE_RESOURCE` | resource id | lines referencing the resource | Open/CoPEX | Yes | Yes | resource id |
| `GET /api/open/opex/plans?siteId=&fy=` | Opex header | `OPEX_PLAN` | site id, FY | header: cost centre, owner, monthly budget, currency | Open/CoPEX | Yes | Yes | site id |
| `GET /api/open/opex/plans/{id}` | Plan with lines and actuals | `OPEX_PLAN` + `OPEX_LINE` + `OPEX_MONTH_ACTUAL` | plan id | header + lines [category, supplier, contract, frequency, amount, state, due, end, escalation] + actuals [month, amount] | Open/CoPEX | Yes | Yes | — |
| `POST/PUT` equivalents | Only if the Inventory UI keeps editing capex/opex | — | — | — | Open/CoPEX | Yes | **[Validate]** | — |

### 20.2 Passive Inventory (mock after contract)

| API (proposed) | Purpose | Data source (today) | Response concept | Mock? | Inventory dependency |
|---|---|---|---|---|---|
| `GET /api/passive/racks?siteId=` | Racks for placement / elevation | `RACK` | id, code, type, role, heightU, roomRef, occupancy | Yes | site id |
| `GET /api/passive/assets?siteId=&type=` | Passive assets per site | `PASSIVE_ASSET` | id, type, code, rack, U range, vendor, model, status | Yes | site id, rack id |
| `GET /api/passive/assets/{id}/ports` | ODF/DDF positions | `PORT` (passive rows) | port ids and names | Yes | for LINK / PATCH_CORD endpoints |
| `GET /api/passive/antennas?siteId=&sectorNo=` | Antennas for cells | `ANTENNA` | id, code, azimuth, tilts, gain, ports | Yes | sector id |
| `GET /api/passive/power-units?siteId=` | Power plant and overdue flag | `POWER_UNIT`, `POWER_UNIT_TEST` | id, kind, rating, status, lastTest, overdue | Yes | for `NE_POWER_DETAIL` |
| `GET /api/passive/patch-cords?portId=` | Patching from a port | `PATCH_CORD` | a/z port ids, cord type, length, loss | Yes | port ids |

### 20.3 User Management (no mock; CDC)

| Need | Mechanism |
|---|---|
| user id → display name / status | local `USER` copy |
| roles for `allowedActions` | token claims / `GET /api/um/users/{id}/roles` (proposal) |
| teams / groups | `GET /api/um/groups` (proposal) **[Validate]** |

### 20.4 Jobs / Integration (contract, then mock)

| API (proposed) | Purpose | Owning service |
|---|---|---|
| `GET /api/discovery/jobs`, `POST …/{id}/actions/run` | job definitions and actions | Discovery service |
| `GET /api/discovery/runs/{id}/targets`, `GET …/targets/{id}/steps` | execution results, transcript | Discovery service |
| `GET /api/recon/runs`, `GET /api/recon/results?…`, `GET /api/recon/results/{id}/fields` | execution outputs | Reconciliation service |
| `GET /api/reports/runs`, `POST /api/reports/definitions/{id}/actions/run` | report runs | Reporting service |
| `GET /api/integrations/systems`, `GET /api/integrations/systems/{id}/resources` | registry and proxies | Integration layer |

---

## 21. Current-State Architecture

```
                          ┌──────────────────────────────────────────────────────────────┐
                          │                     INVENTORY DATABASE (118)                 │
                          │                                                              │
   User Management ─CDC─▶ │ USER, TENANT              (reference copies)                 │
                          │ USER_IDENTITY, TEAM, TEAM_MEMBER   (user-domain tables held  │
                          │                                     locally)                 │
                          │                                                              │
                          │ Core inventory (42) + Inventory reference (18)               │
                          │                                                              │
                          │ Passive: PASSIVE_ASSET(+TYPE), PATCH_CORD, POWER_UNIT(+TEST),│
   Fiber inventory ─sync▶ │          RACK, ANTENNA, POWER_FEED; fiber plant as           │
                          │          EXTERNAL_RESOURCE proxies                           │
                          │                                                              │
                          │ Finance: CAPEX_* (3), OPEX_* (3), RESOURCE_ASSET             │
                          │                                                              │
   Collectors ──writes──▶ │ Jobs: SCAN_* (7), COLLECTOR, CREDENTIAL_PROFILE, STEP_DEF,   │
   (SNMP/SSH/…)           │       RECON_JOB/RUN/RESULT (6), REPORT_RUN, NE_HEALTH,       │
                          │       DOMAIN_TRUST_SNAPSHOT, PROVENANCE                      │
                          │                                                              │
   CMDB / CRM / LCM ─sync▶│ EXTERNAL_SYSTEM, EXTERNAL_OBJECT_TYPE, RESOURCE_EXTERNAL_REF │
                          └──────────────────────────────────────────────────────────────┘
                                                      ▲
                                                      │ direct reads/writes
                                             Inventory UI (React + legacy)
```

Everything lives in one database and the UI (through the future Inventory API) is expected to read all of it.

## 22. Future-State Architecture

```
                         ┌──────────────────────┐
                         │   User Management    │  users, identities, (groups?)
                         └──────────┬───────────┘
                                    │ CDC (USER, TENANT, maybe TEAM)
                                    ▼
                         ┌──────────────────────┐
                         │ Inventory USER /     │
                         │ TENANT reference     │
                         └──────────────────────┘

┌──────────────────────┐                             ┌──────────────────────┐
│ Passive Inventory    │  racks, passive assets,     │ Master data (?)      │  VENDOR, PRODUCT_MODEL,
│ Module               │  ports, antennas, power     │ [Validate]           │  GEO, OPERATIONAL_AREA
└──────────┬───────────┘                             └──────────┬───────────┘
           │ API + EXTERNAL_RESOURCE proxy sync                  │ CDC reference copies
           ▼                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                               INVENTORY MODULE                                 │
│  Core inventory (42) · Inventory reference (18) · reference copies             │
│  Reconciliation governance (RECON_RULE*, RECON_EXCEPTION) · REPORT_DEFINITION  │
│  EXTERNAL_SYSTEM registry + RESOURCE_EXTERNAL_REF + EXTERNAL_RESOURCE proxies  │
│  Inventory API (site / resource / NE identities exposed to every other module) │
└──────────────┬────────────────────────────────────────────────┬────────────────┘
               │ API (site ids, resource ids out;               │ Integration API
               │      capex/opex screen data in)                │ (definitions out; results, health,
               ▼                                                ▼  provenance, snapshots in)
      ┌────────────────┐                               ┌────────────────────────┐
      │ Open / CoPEX   │  CAPEX_*, OPEX_*,             │ Integration Layer      │  SCAN_*, RECON_JOB/RUN/RESULT,
      │ Module         │  (RESOURCE_ASSET commercial?) │                        │  REPORT_RUN, NE_HEALTH, SNAPSHOT
      │ (mock first)   │                               └───────────┬────────────┘
      └────────────────┘                                     ┌─────┴──────┐
                                                             │ NiFi/Spark │ collectors, comparison, aggregation
                                                             └────────────┘
```

## 23. Current vs Future Ownership

| Aspect | Current state | Future state |
|---|---|---|
| Users | `USER` copy + `USER_IDENTITY`, `TEAM`, `TEAM_MEMBER` local | `USER`/`TENANT` CDC copies; `USER_IDENTITY` in User Management; `TEAM` decided |
| Passive | Full passive tables local (fiber already external) | Passive module owns; Inventory holds proxies / reference rows for `RACK`, `POWER_UNIT`, `ANTENNA` as needed |
| Finance | `CAPEX_*`, `OPEX_*` local, screens read them | Open/CoPEX owns; Inventory screens use mock then real API |
| Jobs | Definitions, executions and outputs all local | Definitions via integration API; executions/outputs owned by the integration layer; physical location TBD |
| Reconciliation rules & exceptions | Local | Stay in Inventory (or move with a future Reconciliation module) |
| Cross-system links | `EXTERNAL_*` registry local | Stays; extended to Passive |
| Reference data | All local, seeded | Inventory-owned catalogs stay; shared master data becomes CDC copies if an owner exists |
| CDC used for | nothing explicit in schema | users, tenants, (teams), (vendors/models/geo/areas) |
| APIs used for | nothing explicit in schema | Passive, Open/CoPEX (mock first), Discovery, Reconciliation, Reporting |
| NiFi/Spark | implicit (collectors write SCAN/RECON tables) | explicit integration layer behind the Inventory API |

## 24. Proposed Module Boundaries

```
KEEP
----
Core Inventory tables (42): RESOURCE + satellites, NETWORK_ELEMENT + 11 details, hardware, ports, links,
  services, RAN radio layer, SITE/FLOOR/ROOM, CLOUD_CLUSTER, RECON_RULE*, RECON_EXCEPTION, REPORT_DEFINITION,
  PRODUCT_MODEL_POLICY
Required reference copies: USER, TENANT
Inventory-specific configuration: ATTRIBUTE_DEFINITION, PRODUCT_MODEL_POLICY
Inventory-specific reference (18): DOMAIN, NE_CLASS, NE_CLASS_DOMAIN, RESOURCE_CLASS, NE_STOCK_TRANSITION, TECHNOLOGY,
  FREQUENCY_BAND, LINK_LAYER, SERVICE_TYPE, SITE_TYPE, NETWORK_FUNCTION_TYPE, RELATIONSHIP_TYPE, RELATIONSHIP_RULE,
  RECON_FIELD, RECON_STATE_MAP, RECON_RULE_TRANSITION, DISCREPANCY_TYPE, ATTRIBUTE_DEFINITION
Integration anchor: EXTERNAL_SYSTEM, EXTERNAL_OBJECT_TYPE, EXTERNAL_RESOURCE, RESOURCE_EXTERNAL_REF

INTEGRATE
---------
User Management (CDC: USER, TENANT, TEAM?)
Passive Inventory (API + proxies)
Open / CoPEX (mock API → API)
Discovery service / NiFi (job definitions out, results in)
Reconciliation service / Spark (job definitions out, results in)
Reporting service (runs)
Master data owner for VENDOR / PRODUCT_MODEL / GEO / OPERATIONAL_AREA (if one exists)

EVENTUALLY MOVE OUT
-------------------
USER_IDENTITY
PASSIVE_ASSET, PASSIVE_ASSET_TYPE, PATCH_CORD, POWER_UNIT, POWER_UNIT_TEST
CAPEX_PLAN, CAPEX_LINE, CAPEX_LINE_RESOURCE, OPEX_PLAN, OPEX_LINE, OPEX_MONTH_ACTUAL

KEEP FOR NOW / VALIDATE
-----------------------
SCAN_JOB, SCAN_JOB_SCOPE, SCAN_TARGET, SCAN_RUN, SCAN_RUN_TARGET, SCAN_STEP_RESULT, SCAN_STEP_PAYLOAD,
  COLLECTOR, CREDENTIAL_PROFILE, DISCOVERY_STEP_DEF
RECON_JOB, RECON_JOB_RULE, RECON_RUN, RECON_RUN_RULE, RECON_RESULT, RECON_RESULT_FIELD
REPORT_RUN, NE_HEALTH, DOMAIN_TRUST_SNAPSHOT, RESOURCE_FIELD_PROVENANCE
RACK, ANTENNA, POWER_FEED, RESOURCE_ASSET, TEAM, TEAM_MEMBER, SITE_CONTACT, SITE_ISSUE, NE_VIRTUAL_INSTANCE
VENDOR, PRODUCT_MODEL, PRIMARY_GEO_L1..L4, OPERATIONAL_AREA, VLAN, VRF
```

## 25. Future Removal Preconditions

```
Table: USER_IDENTITY
Current Owner: Inventory          Proposed Owner: User Management
Reason: external identity mapping is identity federation; no Inventory table references it
Inventory Dependencies: none (FK from USER_IDENTITY → USER, EXTERNAL_SYSTEM only)
Required Integration: none for Inventory; User Management API for identity lookups
Foreign-key impact: none inbound
CDC: not required
Data migration: export rows to User Management if it does not already hold them
UI impact: none (no screen uses it)     Backend impact: remove entity + repository
Before Removal: 1. User Management confirms it holds identities  2. No consumer of the table  3. Production validation
Current Action: DO NOT REMOVE          Status: Future-state recommendation only
```

```
Table: PASSIVE_ASSET (with PASSIVE_ASSET_TYPE, PATCH_CORD)
Current Owner: Inventory          Proposed Owner: Passive Inventory Module
Reason: RESOURCE_CLASS category PASSIVE; passive domain already partially externalised (fiber plant)
Inventory Dependencies: PORT.PASSIVE_ASSET_ID_FK (passive ports), ANTENNA.MOUNT_ASSET_ID_FK, RESOURCE supertype rows,
  RESOURCE_RELATIONSHIP / PROVENANCE / EXTERNAL_REF / CAPEX_LINE_RESOURCE rows pointing at passive resources
Required Integration: Passive Inventory API; EXTERNAL_RESOURCE proxies with SYSTEM_TYPE PASSIVE_INVENTORY
Foreign-key impact: PORT passive rows, PATCH_CORD A/Z ports, ANTENNA mount
CDC: optional for labels
Data migration: bulk export; create proxy rows; rewrite relationships to proxy resource ids
UI impact: Passive Infrastructure screens (ODF, Patch cords) become proxy views    Backend impact: entities → API client
Before Removal: 1. Passive API available  2. Proxy sync in place  3. Passive PORT strategy decided  4. Consumers migrated
  5. Relationship / provenance rows re-pointed  6. Production validation
Current Action: DO NOT REMOVE          Status: Future-state recommendation only
```

```
Table: POWER_UNIT (with POWER_UNIT_TEST)
Current Owner: Inventory          Proposed Owner: Passive Inventory Module
Reason: category PASSIVE; comment "Passive > Power plant"
Inventory Dependencies: NE_POWER_DETAIL.POWER_UNIT_ID_FK
Required Integration: Passive API (unit + overdue flag)
Foreign-key impact: NE_POWER_DETAIL → external id or reference row
Before Removal: 1. API available  2. NE_POWER_DETAIL reference strategy agreed  3. Consumers migrated  4. Validation
Current Action: DO NOT REMOVE          Status: Future-state recommendation only
```

```
Table: CAPEX_PLAN, CAPEX_LINE, CAPEX_LINE_RESOURCE, OPEX_PLAN, OPEX_LINE, OPEX_MONTH_ACTUAL
Current Owner: Inventory          Proposed Owner: Open / CoPEX Module
Reason: financial planning domain; "CoPEX" interpretation to confirm
Inventory Dependencies: none inbound (Inventory tables do not reference them)
Required Integration: Mock API now, real Open/CoPEX API later; SITE / RESOURCE / VENDOR / USER ids exposed by Inventory
Foreign-key impact: outbound only (SITE, USER, VENDOR, RESOURCE) — become external ids in the new module
CDC: not required
Data migration: export plans, lines, actuals; preserve site/resource ids
UI impact: Capex / Opex screens switch to the API (mock first)    Backend impact: remove entities once API is live
Before Removal: 1. Interpretation confirmed  2. Open/CoPEX API live  3. Screens migrated off local tables  4. Data migrated
  5. Production validation
Current Action: DO NOT REMOVE          Status: Future-state recommendation only
```

```
Table: RACK / ANTENNA / POWER_FEED / RESOURCE_ASSET / TEAM / TEAM_MEMBER / VENDOR / PRODUCT_MODEL / GEO / OPERATIONAL_AREA
Current Owner: Inventory          Proposed Owner: to be validated
Current Action: DO NOT REMOVE          Status: VALIDATE (section 26)
```

```
Table: SCAN_* / RECON_JOB, RECON_RUN*, RECON_RESULT* / REPORT_RUN / NE_HEALTH / DOMAIN_TRUST_SNAPSHOT / PROVENANCE
Current Owner: Inventory DB (written by pipelines)      Proposed Owner: Integration layer (physical location TBD)
Inventory Dependencies: RECON_EXCEPTION → RECON_RESULT, SCAN_TARGET; RESOURCE_RELATIONSHIP → EXTERNAL_SYSTEM
Before any move: 1. Integration store decided  2. Exception evidence links become external ids  3. Integration API live
Current Action: DO NOT REMOVE / DO NOT MODIFY          Status: KEEP FOR NOW
```

## 26. Unknowns / Business Validation Required

| # | Question | Tables affected | Decides |
|---|---|---|---|
| 1 | Is "Open / CoPEX" the Capex + Opex family in this schema? | `CAPEX_*`, `OPEX_*`, `RESOURCE_ASSET` | Category D scope |
| 2 | Does Passive Inventory own racks (device placement) or only passive assets? | `RACK`, `NETWORK_ELEMENT.RACK_*` | Reference copy vs local |
| 3 | Who owns antennas: Passive (physical asset) or Inventory/RAN (RF parameters)? | `ANTENNA`, `CELL_ANTENNA` | Split or move |
| 4 | Are power feeds Passive facility data or site attributes? | `POWER_FEED` | Move or keep |
| 5 | Do passive ports (ODF/DDF positions) move with passive assets? | `PORT` (passive rows), `PATCH_CORD`, `LINK` endpoints | Physical connectivity model |
| 6 | Does User Management provide groups/teams? | `TEAM`, `TEAM_MEMBER` | CDC copy vs local |
| 7 | Is the tenant registry platform-owned? | `TENANT` | CDC |
| 8 | Is there a master-data owner for vendors, product models, geography, operational areas? | `VENDOR`, `PRODUCT_MODEL`, `PRIMARY_GEO_L1..L4`, `OPERATIONAL_AREA` | Reference copies vs Inventory-owned |
| 9 | Will Reconciliation become its own module? | `RECON_RULE*`, `RECON_EXCEPTION`, `RECON_STATE_MAP`, `DISCREPANCY_TYPE` | Keep vs move |
| 10 | Where do job execution tables physically live once NiFi/Spark own execution? | all E tables | Integration store |
| 11 | Are site contacts (encrypted PII) an Inventory concern? | `SITE_CONTACT` | Keep vs external |
| 12 | Do site issues originate in a rollout tool? | `SITE_ISSUE` | Keep vs integration |
| 13 | Does an orchestrator own VNF instantiation state? | `NE_VIRTUAL_INSTANCE`, `CLOUD_CLUSTER` | Read-only fields |
| 14 | Full DDL for `VENDOR`, `VLAN`, `VRF`; views and triggers mentioned in comments | those tables | Complete the analysis |
| 15 | Is asset commercial data (PO, cost, warranty, AMC) Inventory or Open/CoPEX? | `RESOURCE_ASSET` | Column-level split |

## 27. Recommended Next Steps

1. **Confirm the interpretation of "Open / CoPEX"** and the fifteen questions in section 26 with the business and integration teams; update the matrix.
2. **Obtain the complete dump** (VENDOR, VLAN, VRF DDL; views; triggers) and re-run the table inventory.
3. **Publish the shared-identity contract**: `SITE`, `RESOURCE`, `NETWORK_ELEMENT`, `PORT`, `USER`, `VENDOR`, `DOMAIN`, `OPERATIONAL_AREA` ids are the keys other modules will hold; agree that they are stable.
4. **Define the CDC feed for `USER` / `TENANT`** (columns in section 8.4) and decide `TEAM`.
5. **Design the Passive proxy extension** of `EXTERNAL_RESOURCE` / `EXTERNAL_OBJECT_TYPE` (`SYSTEM_TYPE = PASSIVE_INVENTORY`) as a paper design; decide RACK / ANTENNA / passive PORT strategy.
6. **Draft the Open/CoPEX Mock API contract** (section 20.1) so the Capex / Opex screens can be decoupled first; they have no inbound FKs and are the lowest-risk separation.
7. **Agree the Discovery and Reconciliation integration contracts** (definitions out, results in) before any decision on relocating execution tables.
8. **Keep everything as-is in the database and code** until the preconditions in section 25 are met.

## 28. Final Table-by-Table Decision Matrix

Every table. `Action Now = No change`: **no database or code changes are requested at this stage.**

| Table | Domain | Current Owner | Future Owner | Keep in Inventory | Decision | Integration Required | UI Usage | Confidence | Action Now |
|---|---|---|---|---|---|---|---|---|---|
| `ANTENNA` | RAN / passive | Inventory DB | Needs validation (RESOURCE_CLASS ANTENNA is PASSIVE; RAN cells depend on it) | Yes (reference likely) | **VALIDATE** | API | UI Direct | Medium | No change |
| `ATTRIBUTE_DEFINITION` | Inventory core | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `CAPEX_LINE` | Capex | Inventory DB | Open / CoPEX Module | Keep for now | **FUTURE MOVE** | Mock API → API | UI Direct | Medium | No change |
| `CAPEX_LINE_RESOURCE` | Capex ↔ inventory bridge | Inventory DB | Open / CoPEX Module (with inventory resource ids) | Keep for now | **FUTURE MOVE** | API | UI Indirect | Medium | No change |
| `CAPEX_PLAN` | Capex | Inventory DB | Open / CoPEX Module | Keep for now | **FUTURE MOVE** | Mock API → API | UI Direct | Medium | No change |
| `CELL_ANTENNA` | RAN / Passive boundary | Inventory DB | Inventory | Yes | **KEEP** | Passive (ANTENNA ref) | UI Indirect | Medium | No change |
| `CELL_RADIO_UNIT` | RAN | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `CLOUD_CLUSTER` | IT / cloud | Inventory DB | Inventory | Yes | **KEEP** | Orchestrator — validate | UI Direct | Medium | No change |
| `COLLECTOR` | Job infrastructure | Inventory DB | Integration / collector fleet | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `CREDENTIAL_PROFILE` | Job configuration | Inventory DB | Integration / vault | Keep for now | **TECHNICAL / INTEGRATION** | Integration (vault ref) | UI Indirect | Medium | No change |
| `DISCOVERY_STEP_DEF` | Job configuration (reference) | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Seed | UI Indirect | Medium | No change |
| `DISCREPANCY_TYPE` | Reference | Inventory DB | Inventory / Reconciliation service | Yes | **KEEP** | Seed | UI Indirect | Medium | No change |
| `DOMAIN` | Reference | Inventory DB | Shared reference (Inventory-hosted) | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `DOMAIN_TRUST_SNAPSHOT` | KPI aggregation | Inventory DB | Integration / analytics (Spark candidate) | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `EQUIPMENT_COMPONENT` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | Discovery writes hardware tree | UI Direct | High | No change |
| `EXTERNAL_OBJECT_TYPE` | External proxy | Inventory DB | Integration layer | Yes (reference) | **INTEGRATE** | Seed / API | No UI Requirement | High | No change |
| `EXTERNAL_RESOURCE` | External proxy (fiber plant …) | Inventory DB | Integration layer | Yes (reference) | **INTEGRATE** | API sync | UI Indirect | High | No change |
| `EXTERNAL_SYSTEM` | Integration registry | Inventory DB | Integration layer | Yes (reference) | **INTEGRATE** | Integration | UI Indirect | High | No change |
| `FLOOR` | Location | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | Medium | No change |
| `FREQUENCY_BAND` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `IP_SUBNET` | Logical / IP | Inventory DB | Inventory | Yes | **KEEP** | Discovery | UI Direct | Medium | No change |
| `LINK` | Connectivity | Inventory DB | Inventory | Yes | **KEEP** | Discovery writes adjacencies | UI Direct | High | No change |
| `LINK_LAYER` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `LINK_MICROWAVE_ATTR` | Connectivity | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `LINK_PROTOCOL_ATTR` | Connectivity | Inventory DB | Inventory | Yes | **KEEP** | Discovery | UI Indirect | High | No change |
| `NETWORK_ELEMENT` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | Discovery writes discovered rows | UI Direct | High | No change |
| `NETWORK_FUNCTION_TYPE` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `NETWORK_SLICE` | Services / RAN | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | Medium | No change |
| `NE_CLASS` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `NE_CLASS_DOMAIN` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | Backend Only | High | No change |
| `NE_CORE_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_HEALTH` | Monitoring snapshot | Inventory DB | Integration / collector | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `NE_IPMPLS_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_MICROWAVE_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_MOVEMENT` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | Work-order system — validate | UI Direct | High | No change |
| `NE_OPTICAL_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_PON_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_POWER_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | Passive (POWER_UNIT ref) | UI Direct | Medium | No change |
| `NE_RAN_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_SECURITY_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_SERVER_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_STOCK_TRANSITION` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `NE_SWITCH_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `NE_VIRTUAL_INSTANCE` | Network elements | Inventory DB | Inventory | Yes | **VALIDATE** | Orchestrator (state) — validate | UI Direct | Medium | No change |
| `NE_WIFI_DETAIL` | Network elements | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `OPERATIONAL_AREA` | Organisation reference | Inventory DB | Shared master data — validate | Yes (reference) | **VALIDATE** | CDC / API — validate | UI Indirect | Medium | No change |
| `OPEX_LINE` | Opex | Inventory DB | Open / CoPEX Module | Keep for now | **FUTURE MOVE** | Mock API → API | UI Direct | Medium | No change |
| `OPEX_MONTH_ACTUAL` | Opex | Inventory DB | Open / CoPEX Module | Keep for now | **FUTURE MOVE** | Mock API → API | UI Direct | Medium | No change |
| `OPEX_PLAN` | Opex | Inventory DB | Open / CoPEX Module | Keep for now | **FUTURE MOVE** | Mock API → API | UI Direct | Medium | No change |
| `PASSIVE_ASSET` | Passive inventory | Inventory DB | Passive Inventory Module | Keep for now | **FUTURE MOVE** | API | UI Direct | High | No change |
| `PASSIVE_ASSET_TYPE` | Passive inventory | Inventory DB | Passive Inventory Module | Keep for now | **FUTURE MOVE** | API (reference) | UI Indirect | High | No change |
| `PATCH_CORD` | Passive inventory | Inventory DB | Passive Inventory Module | Keep for now | **FUTURE MOVE** | API | UI Direct | High | No change |
| `PLMN` | RAN | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `PORT` | Network elements / Passive | Inventory DB | Inventory (NE ports); Passive rows validate | Yes | **KEEP** | Discovery | UI Direct | Medium | No change |
| `PORT_IP_ADDRESS` | Logical / IP | Inventory DB | Inventory | Yes | **KEEP** | Discovery | UI Indirect | High | No change |
| `PORT_VLAN` | Logical / IP | Inventory DB | Inventory | Yes | **KEEP** | Discovery | UI Indirect | High | No change |
| `POWER_FEED` | Facility / power | Inventory DB | Needs validation | Yes (for now) | **VALIDATE** | API | UI Direct | Low | No change |
| `POWER_UNIT` | Passive / power plant | Inventory DB | Passive Inventory Module | Keep for now | **FUTURE MOVE** | API | UI Direct | Medium | No change |
| `POWER_UNIT_TEST` | Passive / power plant | Inventory DB | Passive Inventory Module | Keep for now | **FUTURE MOVE** | API | UI Direct | Medium | No change |
| `PRIMARY_GEO_L1` | Geography reference | Inventory DB | Shared master data — validate | Yes (reference) | **VALIDATE** | CDC / API — validate | UI Indirect | Medium | No change |
| `PRIMARY_GEO_L2` | Geography reference | Inventory DB | Shared master data — validate | Yes (reference) | **VALIDATE** | CDC / API — validate | UI Indirect | Medium | No change |
| `PRIMARY_GEO_L3` | Geography reference | Inventory DB | Shared master data — validate | Yes (reference) | **VALIDATE** | CDC / API — validate | UI Indirect | Medium | No change |
| `PRIMARY_GEO_L4` | Geography reference | Inventory DB | Shared master data — validate | Yes (reference) | **VALIDATE** | CDC / API — validate | UI Indirect | Medium | No change |
| `PRODUCT_MODEL` | Reference | Inventory DB | Shared reference — validate | Yes (reference) | **VALIDATE** | Master-data feed | UI Indirect | Medium | No change |
| `PRODUCT_MODEL_POLICY` | Inventory configuration | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `RACK` | Passive / facility | Inventory DB | Needs validation (RESOURCE_CLASS says PASSIVE; NE placement depends on it) | Yes (reference likely) | **VALIDATE** | API | UI Direct | Medium | No change |
| `RADIO_CELL` | RAN | Inventory DB | Inventory | Yes | **KEEP** | EMS discovery | UI Direct | High | No change |
| `RADIO_CELL_PLMN` | RAN | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `RADIO_SECTOR` | RAN | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `RECON_EXCEPTION` | Reconciliation workflow | Inventory DB | Inventory | Yes | **KEEP** | Engine creates / auto-resolves | UI Direct | Medium | No change |
| `RECON_FIELD` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `RECON_JOB` | Reconciliation job | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `RECON_JOB_RULE` | Reconciliation job | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `RECON_RESULT` | Job output | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `RECON_RESULT_FIELD` | Job output | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `RECON_RULE` | Reconciliation governance | Inventory DB | Inventory | Yes | **KEEP** | Reconciliation engine flips EXECUTING | UI Direct | Medium | No change |
| `RECON_RULE_CONDITION` | Reconciliation governance | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | Medium | No change |
| `RECON_RULE_EVENT` | Reconciliation governance | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | Medium | No change |
| `RECON_RULE_TRANSITION` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `RECON_RUN` | Job execution | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `RECON_RUN_RULE` | Job execution | Inventory DB | Integration / Reconciliation service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `RECON_STATE_MAP` | Reference | Inventory DB | Inventory / Reconciliation service | Yes | **KEEP** | Seed | Backend Only | Medium | No change |
| `RELATIONSHIP_RULE` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | Backend Only | High | No change |
| `RELATIONSHIP_TYPE` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `REPORT_DEFINITION` | Reporting | Inventory DB | Inventory | Yes | **KEEP** | Reporting service runs it | UI Direct | Medium | No change |
| `REPORT_RUN` | Report generation | Inventory DB | Integration / Reporting service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `RESOURCE` | Inventory core | Inventory DB | Inventory | Yes | **KEEP** | None | Backend Only | High | No change |
| `RESOURCE_ASSET` | Asset finance / commercial | Inventory DB | Needs validation (Inventory vs Open/CoPEX) | Yes (for now) | **VALIDATE** | API — validate | UI Direct | Low | No change |
| `RESOURCE_ATTRIBUTE` | Inventory core | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `RESOURCE_CLASS` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | Backend Only | High | No change |
| `RESOURCE_EXTERNAL_REF` | Integration cross-reference | Inventory DB | Integration layer | Yes (reference) | **INTEGRATE** | Sync | UI Indirect | High | No change |
| `RESOURCE_FIELD_PROVENANCE` | Integration evidence | Inventory DB | Integration layer / Discovery | Yes | **TECHNICAL / INTEGRATION** | Sync | UI Indirect | Medium | No change |
| `RESOURCE_RELATIONSHIP` | Inventory core | Inventory DB | Inventory | Yes | **KEEP** | Discovery writes edges | UI Direct | High | No change |
| `RESOURCE_TECHNOLOGY` | Inventory core | Inventory DB | Inventory | Yes | **KEEP** | None | UI Indirect | High | No change |
| `ROOM` | Location | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | Medium | No change |
| `SCAN_JOB` | Discovery job | Inventory DB | Integration / Discovery service (NiFi-Spark pipelines) | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `SCAN_JOB_SCOPE` | Discovery job | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `SCAN_RUN` | Job execution | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `SCAN_RUN_TARGET` | Job execution | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `SCAN_STEP_PAYLOAD` | Job execution log (raw) | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | Backend Only | High | No change |
| `SCAN_STEP_RESULT` | Job execution log | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | High | No change |
| `SCAN_TARGET` | Discovery target | Inventory DB | Integration / Discovery service | Keep for now | **TECHNICAL / INTEGRATION** | Integration | UI Indirect | Medium | No change |
| `SERVICE_ENDPOINT` | Services | Inventory DB | Inventory | Yes | **KEEP** | Discovery | UI Indirect | High | No change |
| `SERVICE_INSTANCE` | Services | Inventory DB | Inventory | Yes | **KEEP** | LCM / discovery | UI Direct | High | No change |
| `SERVICE_TYPE` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `SITE` | Location | Inventory DB | Inventory | Yes | **KEEP** | None | UI Direct | High | No change |
| `SITE_CONTACT` | Location | Inventory DB | Inventory | Yes | **VALIDATE** | None | UI Direct | Medium | No change |
| `SITE_ISSUE` | Location | Inventory DB | Inventory | Yes | **VALIDATE** | Rollout tool — validate | UI Direct | Medium | No change |
| `SITE_TYPE` | Reference | Inventory DB | Inventory | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `TEAM` | User / ownership | Inventory DB | Needs validation (User Management group vs Inventory queue) | Yes (for now) | **VALIDATE** | CDC or local | UI Direct | Medium | No change |
| `TEAM_MEMBER` | User / ownership | Inventory DB | Needs validation | Yes (for now) | **VALIDATE** | CDC or local | UI Indirect | Medium | No change |
| `TECHNOLOGY` | Reference | Inventory DB | Shared reference (Inventory-hosted) | Yes | **KEEP** | Seed | UI Indirect | High | No change |
| `TENANT` | Platform | Inventory DB | Platform / User Management (tenant registry) | Yes (reference) | **KEEP — REFERENCE** | CDC | No UI Requirement | Medium | No change |
| `USER` | User | Inventory DB | User Management (source); Inventory reference | Yes (reference) | **KEEP — REFERENCE** | CDC | UI Indirect | High | No change |
| `USER_IDENTITY` | User | Inventory DB | User Management | No (future) | **FUTURE MOVE** | CDC / API | No UI Requirement | Medium | No change |
| `VENDOR` | Reference | Inventory DB | Shared reference — validate (Passive and CoPEX also need vendors) | Yes (reference) | **VALIDATE** | Seed / master-data feed | UI Indirect | Low | No change |
| `VLAN` | Logical / IP | Inventory DB | Inventory | Yes | **VALIDATE** | Discovery | UI Indirect | Low | No change |
| `VRF` | Logical / IP | Inventory DB | Inventory | Yes | **VALIDATE** | Discovery | UI Indirect | Low | No change |
