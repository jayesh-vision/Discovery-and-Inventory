# Inventory, Discovery & Reconciliation — database reference (schema v7)

| | |
|---|---|
| **Schema file** | `db/inventory/inventory_schema.sql` (v7, 2026-09-30), MySQL 8.0.16+ / 9.x, InnoDB, utf8mb4 |
| **Scope** | Only the tables owned, or strictly needed, by the three modules of this application: **Inventory**, **Discovery** and **Reconciliation** |
| **Size** | 100 tables · 1455 columns · 289 foreign keys · 179 unique keys · 326 CHECK constraints · no views, triggers or routines |
| **Companions** | `ER_DIAGRAM.md` (diagrams) · `INVENTORY_TABLE_USAGE_AND_MOCK_API.md` (screen to table map, mock APIs) · `DATABASE_REVIEW_REPORT.md` (quality audit) |

This file is generated from the DDL by `tests/gen_data_dictionary.py`; regenerate it after any schema change instead of editing it by hand.

## 1. What is in the database and what is not

| Module | Tables | What it holds |
|---|---|---|
| **Inventory** | 58 | Golden record of the network: resources, sites, network elements and their type-specific details, hardware, ports, IP / VLAN / VRF, radio cells, links, services, relationships, and the proxies / references to objects owned by other systems |
| **Discovery** | 10 | Collectors, credential profiles (vault references only), the step catalog, scan jobs with scopes and targets, runs, per-target results, step transcript and encrypted payloads |
| **Reconciliation** | 14 | Rules with conditions and lifecycle trail, jobs, runs, results with field-level evidence, exceptions, and the catalogs that drive them |
| **Reporting and KPIs** | 3 | Report catalogue and generated runs for both report screens, and the daily trust snapshot behind Insights |
| **Shared reference** | 15 | Catalogs every module reads (domains, technologies, bands, vendors, product models, geography, operational areas, PLMNs) and the two reference copies foreign keys need (USER, TENANT) |

### Not stored here (owned by another module)

| Data | Owner | How this database refers to it | Removed tables |
|---|---|---|---|
| Teams / groups and their members, roles | User Management | Group **code** in `RECONCILIATION_EXCEPTION.OWNER_TEAM_REFERENCE`, `RECONCILIATION_RULE.EXCEPTION_REVIEWER_TEAM_REFERENCE`, `SITE_ISSUE.OWNER_TEAM_REFERENCE` (no foreign key); names and members by API | `TEAM` (v7), `TEAM_MEMBER` (v6), `USER_IDENTITY` (v5) |
| Site facility: floors, rooms, racks, power feeds | Passive Inventory | `NETWORK_ELEMENT.RACK_EXTERNAL_RESOURCE_ID_FK` → `EXTERNAL_RESOURCE` proxy of type `RACK`; the rack units stay on the device; everything else by API | `FLOOR`, `ROOM`, `RACK`, `POWER_FEED` (v7) |
| Passive assets, passive ports, patch cords, power units and their tests | Passive Inventory | `EXTERNAL_RESOURCE` proxies (`PASSIVE_ASSET`, `PASSIVE_PORT`, `POWER_UNIT`); `ANTENNA.MOUNT_EXTERNAL_RESOURCE_ID_FK`, `NETWORK_ELEMENT_POWER_DETAIL.POWER_UNIT_EXTERNAL_RESOURCE_ID_FK` | `PASSIVE_ASSET`, `PASSIVE_ASSET_TYPE`, `PATCH_CORD`, `POWER_UNIT`, `POWER_UNIT_TEST` (v5) |
| Fiber plant: ducts, cables, spans, strands, splice closures | Fiber application | `EXTERNAL_RESOURCE` proxies with `SYSTEM_TYPE = FIBER_INVENTORY` | never stored |
| Capex and Opex plans, lines, actuals | Open / CoPEX | `SITE.ID` and `RESOURCE.ID` are the keys exchanged; nothing stored | `CAPEX_PLAN`, `CAPEX_LINE`, `CAPEX_LINE_RESOURCE`, `OPEX_PLAN`, `OPEX_LINE`, `OPEX_MONTH_ACTUAL` (v5) |
| Alarms, performance history, configuration | FM / PM / config systems | not referenced | never stored |

### Kept although another module is the source

| Table | Why it stays |
|---|---|
| `USER` | Eight foreign keys (decommissioned by, exception assignee and disposer, the four rule roles, rule-event actor) need a local row. Filled by CDC from User Management; never created here; no PII. |
| `TENANT` | Root of `CUSTOMER_ID`: every tenant table has a foreign key to it, which is what keeps tenants apart. One row per operator, filled from the platform. |
| `ANTENNA` | The mount (tower, pole) is a Passive Inventory proxy, but azimuth, tilts and RET are radio parameters that EMS discovery reports and reconciliation compares. |
| `RESOURCE_ASSET` | Asset tag, warranty and maintenance contract are shown on the Element screen. If Open / CoPEX takes purchase cost and PO number, drop only those columns. |
| `GEOGRAPHY_LEVEL1..4`, `OPERATIONAL_AREA`, `VENDOR`, `PRODUCT_MODEL` | No other module owns them today; a site cannot be created and a device cannot be identified without them. |

## 2. Conventions

- **Names**: SNAKE_UPPER_CASE, singular, child tables prefixed by the parent. Primary key `ID`. `_ID_FK` = surrogate foreign key; `_CODE` or the referenced name = natural-key foreign key; `_REFERENCE` = identifier of something in another system (no foreign key). `IS_` booleans, `_TIME` UTC datetime, `_DATE`, unit suffixes (`_MHZ`, `_DBM`, `_KW`, `_MS`, `_PERCENT`).
- **Tenancy**: `CUSTOMER_ID` on every tenant table; foreign keys between tenant tables are composite `(CUSTOMER_ID, …)`. Global catalogs have no `CUSTOMER_ID`.
- **Resource supertype**: every inventory object has a `RESOURCE` row; the subtype carries `RESOURCE_ID_FK` + a constant or derived `RESOURCE_TYPE`, bound by a composite foreign key.
- **Categories**: `VARCHAR` + `CHECK` (values listed in the column comment), not `ENUM`.
- **Soft delete**: `IS_DELETED` + generated `LIVE_FLAG` on master data, `RECORD_STATE` + generated `ACTIVE_FLAG` on discovered data; the flag is the last column of the natural unique key.
- **Audit columns** on every mutable table: `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`. They are listed once here and omitted from the column tables below.
- **Generated columns** are marked *(generated)*; never write them.

## 3. Table list

| # | Table | Module | Group | Columns | FKs out | Referenced by | Purpose |
|---|---|---|---|---|---|---|---|
| 1 | [`ANTENNA`](#antenna) | Inventory | RAN radio layer | 31 | 7 | 1 | Installed RF antenna with sector, mounting, azimuth and tilts |
| 2 | [`CELL_ANTENNA`](#cell_antenna) | Inventory | RAN radio layer | 10 | 3 | 0 | Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells) |
| 3 | [`CELL_RADIO_UNIT`](#cell_radio_unit) | Inventory | RAN radio layer | 10 | 3 | 0 | Radio unit(s) (RRU / RRH / AAU, NE type RADIO_UNIT) that transmit a cell; one RU carries many cells |
| 4 | [`NETWORK_SLICE`](#network_slice) | Inventory | RAN radio layer | 14 | 3 | 0 | 5G network slice (S-NSSAI) of a PLMN |
| 5 | [`RADIO_CELL`](#radio_cell) | Inventory | RAN radio layer | 29 | 5 | 3 | Radio cell of any generation, bound to its node, technology, band and sector |
| 6 | [`RADIO_CELL_PLMN`](#radio_cell_plmn) | Inventory | RAN radio layer | 11 | 3 | 0 | PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary |
| 7 | [`RADIO_SECTOR`](#radio_sector) | Inventory | RAN radio layer | 12 | 3 | 2 | Sector of a radio site grouping antennas and cells of all technologies |
| 8 | [`CLOUD_CLUSTER`](#cloud_cluster) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 14 | 3 | 2 | Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04) |
| 9 | [`EQUIPMENT_COMPONENT`](#equipment_component) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 25 | 6 | 1 | Hardware tree inside a device, including empty slots; parents are FK-bound to the same device |
| 10 | [`IP_SUBNET`](#ip_subnet) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 20 | 5 | 1 | IP prefix per routing context (global or L3VPN), with hierarchy and purpose |
| 11 | [`NETWORK_ELEMENT_HEALTH`](#network_element_health) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 16 | 2 | 0 | Latest reachability and time-sync check of a device (ICMP + NTP) |
| 12 | [`NETWORK_ELEMENT_MOVEMENT`](#network_element_movement) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 15 | 5 | 0 | Append-only stock movement (the application never updates or deletes rows) / state change of a device (issue, install, RMA, decommission, recover to store) with its work order |
| 13 | [`NETWORK_ELEMENT_STOCK_TRANSITION`](#network_element_stock_transition) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 4 | 0 | 1 | Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned; decommissioned > in store = recovered to store) |
| 14 | [`NETWORK_ELEMENT_VIRTUAL_INSTANCE`](#network_element_virtual_instance) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 17 | 4 | 0 | Virtualisation record (VNF / CNF) of a virtual NE, 1:1 |
| 15 | [`PORT`](#port) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 30 | 7 | 5 | Device interface; card, optic, parent and VRF bound to the same device |
| 16 | [`PORT_IP_ADDRESS`](#port_ip_address) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 13 | 3 | 0 | IP address on an interface and its subnet |
| 17 | [`PORT_VLAN`](#port_vlan) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 12 | 3 | 0 | VLAN membership of a port on the same device |
| 18 | [`VLAN`](#vlan) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 15 | 3 | 1 | VLAN configured on a device (RESOURCE_TYPE VLAN) |
| 19 | [`VRF`](#vrf) | Inventory | Network element lifecycle, hardware, ports and virtualisation | 16 | 4 | 1 | VRF instance on a router (RESOURCE_TYPE VRF); PORT.VRF_ID_FK binds interfaces to it |
| 20 | [`EXTERNAL_ENTITY_TYPE`](#external_entity_type) | Inventory | External systems and proxies | 3 | 0 | 1 | Type of externally owned entity (fiber span, passive asset, CMDB item ...) that may be proxied here |
| 21 | [`EXTERNAL_RESOURCE`](#external_resource) | Inventory | External systems and proxies | 16 | 4 | 3 | Lightweight proxy for an object owned by another system (fiber plant, Passive Inventory, CMDB, CRM); ids and a label cache only, no copied attributes |
| 22 | [`EXTERNAL_SYSTEM`](#external_system) | Inventory | External systems and proxies | 18 | 3 | 5 | Every external system this inventory exchanges data with, including discovery sources and the fiber application |
| 23 | [`LINK`](#link) | Inventory | Connectivity and services | 30 | 7 | 2 | Connection between two devices at one catalogued layer, unique by natural key among active rows |
| 24 | [`LINK_LAYER`](#link_layer) | Inventory | Connectivity and services | 5 | 0 | 1 | Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP interface layers |
| 25 | [`LINK_MICROWAVE_ATTRIBUTE`](#link_microwave_attribute) | Inventory | Connectivity and services | 18 | 2 | 0 | Hop-level attributes of a microwave link, stored once per hop |
| 26 | [`LINK_PROTOCOL_ATTRIBUTE`](#link_protocol_attribute) | Inventory | Connectivity and services | 15 | 2 | 0 | Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / neighbour state, IS-IS level |
| 27 | [`SERVICE_ENDPOINT`](#service_endpoint) | Inventory | Connectivity and services | 14 | 4 | 0 | Termination of a service on a device interface (PE for L3VPN; source and destination for point-to-point services) |
| 28 | [`SERVICE_INSTANCE`](#service_instance) | Inventory | Connectivity and services | 22 | 4 | 3 | Network service instance, unique per type and name among active services |
| 29 | [`SERVICE_TYPE`](#service_type) | Inventory | Connectivity and services | 4 | 1 | 1 | Network service type catalog |
| 30 | [`NETWORK_ELEMENT`](#network_element) | Inventory | Network element and its type-specific detail tables | 40 | 10 | 24 | Golden record of a physical or virtual device / network function in any domain |
| 31 | [`NETWORK_ELEMENT_CORE_DETAIL`](#network_element_core_detail) | Inventory | Network element and its type-specific detail tables | 16 | 4 | 0 | Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT) |
| 32 | [`NETWORK_ELEMENT_IP_MPLS_DETAIL`](#network_element_ip_mpls_detail) | Inventory | Network element and its type-specific detail tables | 28 | 3 | 0 | IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; Transport > IP/MPLS domain) |
| 33 | [`NETWORK_ELEMENT_MICROWAVE_DETAIL`](#network_element_microwave_detail) | Inventory | Network element and its type-specific detail tables | 17 | 3 | 0 | Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link |
| 34 | [`NETWORK_ELEMENT_OPTICAL_DETAIL`](#network_element_optical_detail) | Inventory | Network element and its type-specific detail tables | 20 | 3 | 0 | DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain) |
| 35 | [`NETWORK_ELEMENT_PON_DETAIL`](#network_element_pon_detail) | Inventory | Network element and its type-specific detail tables | 19 | 5 | 0 | PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain) |
| 36 | [`NETWORK_ELEMENT_POWER_DETAIL`](#network_element_power_detail) | Inventory | Network element and its type-specific detail tables | 16 | 4 | 0 | Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility) |
| 37 | [`NETWORK_ELEMENT_RAN_DETAIL`](#network_element_ran_detail) | Inventory | Network element and its type-specific detail tables | 23 | 5 | 0 | RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 with NETWORK_ELEMENT) |
| 38 | [`NETWORK_ELEMENT_SECURITY_DETAIL`](#network_element_security_detail) | Inventory | Network element and its type-specific detail tables | 20 | 4 | 0 | Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains) |
| 39 | [`NETWORK_ELEMENT_SERVER_DETAIL`](#network_element_server_detail) | Inventory | Network element and its type-specific detail tables | 20 | 4 | 0 | Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domains) |
| 40 | [`NETWORK_ELEMENT_SWITCH_DETAIL`](#network_element_switch_detail) | Inventory | Network element and its type-specific detail tables | 19 | 3 | 0 | Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport / IP/MPLS / Core domains) |
| 41 | [`NETWORK_ELEMENT_TYPE`](#network_element_type) | Inventory | Network element and its type-specific detail tables | 7 | 0 | 13 | Device-type catalog: tab, the one detail table of the type, and whether it may be virtual |
| 42 | [`NETWORK_ELEMENT_TYPE_DOMAIN`](#network_element_type_domain) | Inventory | Network element and its type-specific detail tables | 3 | 2 | 1 | Allowed (device type, network domain) pairs; the FK target that keeps every device in a domain its type covers |
| 43 | [`NETWORK_ELEMENT_WIFI_DETAIL`](#network_element_wifi_detail) | Inventory | Network element and its type-specific detail tables | 28 | 4 | 0 | WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, access radio) |
| 44 | [`NETWORK_FUNCTION_TYPE`](#network_function_type) | Inventory | Network element and its type-specific detail tables | 6 | 1 | 1 | Core / IMS / CS network-function type catalog |
| 45 | [`RELATIONSHIP_RULE`](#relationship_rule) | Inventory | Resource supertype and its satellites | 4 | 3 | 1 | Allowed relationship triples between resource types |
| 46 | [`RELATIONSHIP_TYPE`](#relationship_type) | Inventory | Resource supertype and its satellites | 6 | 0 | 1 | Kind of cross-domain resource relationship |
| 47 | [`RESOURCE`](#resource) | Inventory | Resource supertype and its satellites | 4 | 2 | 23 | Supertype row of every inventory object |
| 48 | [`RESOURCE_ASSET`](#resource_asset) | Inventory | Resource supertype and its satellites | 20 | 2 | 0 | Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by resource |
| 49 | [`RESOURCE_ATTRIBUTE`](#resource_attribute) | Inventory | Resource supertype and its satellites | 15 | 3 | 0 | Value of an extensible attribute on one resource, typed by its definition |
| 50 | [`RESOURCE_EXTERNAL_REFERENCE`](#resource_external_reference) | Inventory | Resource supertype and its satellites | 14 | 3 | 0 | Id of an inventory resource in another system; one per system, at most one system of record |
| 51 | [`RESOURCE_FIELD_PROVENANCE`](#resource_field_provenance) | Inventory | Resource supertype and its satellites | 15 | 4 | 0 | Per-field provenance of any resource's golden record |
| 52 | [`RESOURCE_RELATIONSHIP`](#resource_relationship) | Inventory | Resource supertype and its satellites | 18 | 5 | 0 | Typed dependency between two resources that no explicit FK models; FROM depends on TO |
| 53 | [`RESOURCE_TECHNOLOGY`](#resource_technology) | Inventory | Resource supertype and its satellites | 10 | 3 | 0 | Technologies a resource supports; replaces single-valued technology columns |
| 54 | [`RESOURCE_TYPE`](#resource_type) | Inventory | Resource supertype and its satellites | 5 | 0 | 4 | Type of every RESOURCE row with inventory category and layer |
| 55 | [`SITE`](#site) | Inventory | Location | 29 | 6 | 9 | A location that hosts equipment (central office, POP, tower, data centre) |
| 56 | [`SITE_CONTACT`](#site_contact) | Inventory | Location | 15 | 2 | 0 | Site contact person |
| 57 | [`SITE_ISSUE`](#site_issue) | Inventory | Location | 14 | 2 | 0 | Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, Civil, Regulatory, Supply Chain, Commissioning) |
| 58 | [`SITE_TYPE`](#site_type) | Inventory | Location | 3 | 0 | 1 | Site type (Central office, Regional hub, Edge, Tower, Data centre ...) |
| 59 | [`COLLECTOR`](#collector) | Discovery | Discovery execution | 15 | 2 | 1 | Collector node that executes scans (clr-blr-02, Collector-West) |
| 60 | [`CREDENTIAL_PROFILE`](#credential_profile) | Discovery | Discovery execution | 18 | 3 | 1 | Named access profile used by scans (ro-inband-v3) |
| 61 | [`DISCOVERY_STEP_DEFINITION`](#discovery_step_definition) | Discovery | Discovery execution | 7 | 1 | 1 | Collector step of a domain family, in execution order (Transport: device, hardware, lldp, ospf, bgp, service ...) |
| 62 | [`SCAN_JOB`](#scan_job) | Discovery | Discovery execution | 23 | 6 | 3 | Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE) |
| 63 | [`SCAN_JOB_SCOPE`](#scan_job_scope) | Discovery | Discovery execution | 11 | 3 | 0 | One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF set |
| 64 | [`SCAN_RUN`](#scan_run) | Discovery | Discovery execution | 14 | 2 | 2 | One execution of a scan job |
| 65 | [`SCAN_RUN_TARGET`](#scan_run_target) | Discovery | Discovery execution | 18 | 4 | 1 | Result of one target in one run: status, outcome, failure reason, identity match (rule + confidence) |
| 66 | [`SCAN_STEP_PAYLOAD`](#scan_step_payload) | Discovery | Discovery execution | 15 | 2 | 0 | Raw request / response of a step, AES-encrypted (device output can carry configuration and customer data) |
| 67 | [`SCAN_STEP_RESULT`](#scan_step_result) | Discovery | Discovery execution | 16 | 3 | 1 | One collector step for one target in one run (the transcript line): state, timing, bytes, what it wrote |
| 68 | [`SCAN_TARGET`](#scan_target) | Discovery | Discovery execution | 21 | 4 | 3 | Address a job polls (gateway IP) |
| 69 | [`DISCREPANCY_TYPE`](#discrepancy_type) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 5 | 1 | 1 | Discrepancy label with its category and domain (Undocumented wavelength, PCI value != record, Topology gap (LLDP) ...) |
| 70 | [`RECONCILIATION_EXCEPTION`](#reconciliation_exception) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 30 | 9 | 0 | Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition |
| 71 | [`RECONCILIATION_FIELD`](#reconciliation_field) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 4 | 1 | 3 | Comparable resource attribute shared by provenance, rules and reconciliation results |
| 72 | [`RECONCILIATION_JOB`](#reconciliation_job) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 17 | 2 | 2 | Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a schedule, running a set of rules |
| 73 | [`RECONCILIATION_JOB_RULE`](#reconciliation_job_rule) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 9 | 3 | 0 | Rules a reconciliation job runs (many-to-many; was ruleIds[]) |
| 74 | [`RECONCILIATION_RESULT`](#reconciliation_result) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 12 | 5 | 2 | Outcome of one rule on one subject (any resource or a scan target) in one run |
| 75 | [`RECONCILIATION_RESULT_FIELD`](#reconciliation_result_field) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 13 | 3 | 0 | One compared field: inventory value vs network value, evidence source and confidence (attribute drift detail) |
| 76 | [`RECONCILIATION_RULE`](#reconciliation_rule) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 25 | 6 | 6 | Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role |
| 77 | [`RECONCILIATION_RULE_CONDITION`](#reconciliation_rule_condition) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 15 | 4 | 0 | Condition of a rule: source field, operator, target field or literal, joined by AND / OR |
| 78 | [`RECONCILIATION_RULE_EVENT`](#reconciliation_rule_event) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 14 | 4 | 0 | Append-only approval / lifecycle trail of a rule (the application never updates or deletes rows); the FK to RECONCILIATION_RULE_TRANSITION rejects illegal moves |
| 79 | [`RECONCILIATION_RULE_TRANSITION`](#reconciliation_rule_transition) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 5 | 0 | 1 | Allowed rule lifecycle moves and the action that makes them |
| 80 | [`RECONCILIATION_RUN`](#reconciliation_run) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 12 | 3 | 2 | One execution of a reconciliation job (a reconciliation cycle) |
| 81 | [`RECONCILIATION_RUN_RULE`](#reconciliation_run_rule) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 12 | 3 | 0 | Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duration) |
| 82 | [`RECONCILIATION_STATE_MAP`](#reconciliation_state_map) | Reconciliation | Reconciliation rules, jobs, results and exceptions | 4 | 0 | 0 | Mapping of reconciliation outcomes to resource, target and exception states |
| 83 | [`DOMAIN_TRUST_SNAPSHOT`](#domain_trust_snapshot) | Reporting and KPIs | Reporting and KPIs | 16 | 2 | 0 | Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unverified, open, MTTR, touchless) |
| 84 | [`REPORT_DEFINITION`](#report_definition) | Reporting and KPIs | Reporting and KPIs | 18 | 1 | 1 | Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ...) |
| 85 | [`REPORT_RUN`](#report_run) | Reporting and KPIs | Reporting and KPIs | 18 | 2 | 0 | Generated report (production Reports grid) |
| 86 | [`ATTRIBUTE_DEFINITION`](#attribute_definition) | Shared reference | Platform, tenancy and shared catalogs | 15 | 4 | 1 | Typed definition of an extensible attribute for one resource type |
| 87 | [`DOMAIN`](#domain) | Shared reference | Platform, tenancy and shared catalogs | 6 | 1 | 15 | Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tree (IP/MPLS under Transport) |
| 88 | [`FREQUENCY_BAND`](#frequency_band) | Shared reference | Platform, tenancy and shared catalogs | 8 | 1 | 1 | Radio band per technology with duplex mode and frequency ranges |
| 89 | [`PRODUCT_MODEL`](#product_model) | Shared reference | Platform, tenancy and shared catalogs | 12 | 2 | 4 | Vendor product catalog for devices, cards, optics, antennas, passive and power products, with lifecycle dates |
| 90 | [`PRODUCT_MODEL_POLICY`](#product_model_policy) | Shared reference | Platform, tenancy and shared catalogs | 9 | 2 | 0 | Per-tenant golden software version of a product model |
| 91 | [`TECHNOLOGY`](#technology) | Shared reference | Platform, tenancy and shared catalogs | 6 | 0 | 3 | Network / radio access technology with family and generation; the one place generation is recorded |
| 92 | [`TENANT`](#tenant) | Shared reference | Platform, tenancy and shared catalogs | 5 | 0 | 78 | Platform tenant (the operator) |
| 93 | [`USER`](#user) | Shared reference | Platform, tenancy and shared catalogs | 12 | 1 | 4 | Reference copy of User Management users, kept only because 8 FK relationships need it; rows arrive by CDC (never created here) |
| 94 | [`VENDOR`](#vendor) | Shared reference | Platform, tenancy and shared catalogs | 5 | 0 | 7 | Equipment vendor / OEM (shared catalog; DDL restored from v3 because it was missing from the v4 dump) |
| 95 | [`GEOGRAPHY_LEVEL1`](#geography_level1) | Shared reference | Geography and organisation | 12 | 1 | 1 | Level-1 geography (country / state) |
| 96 | [`GEOGRAPHY_LEVEL2`](#geography_level2) | Shared reference | Geography and organisation | 13 | 2 | 1 | Level-2 geography (district / city) |
| 97 | [`GEOGRAPHY_LEVEL3`](#geography_level3) | Shared reference | Geography and organisation | 13 | 2 | 1 | Level-3 geography (locality) |
| 98 | [`GEOGRAPHY_LEVEL4`](#geography_level4) | Shared reference | Geography and organisation | 14 | 2 | 1 | Level-4 geography (cluster / pin area) |
| 99 | [`OPERATIONAL_AREA`](#operational_area) | Shared reference | Geography and organisation | 14 | 2 | 3 | Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > Territory) |
| 100 | [`PLMN`](#plmn) | Shared reference | Geography and organisation | 11 | 1 | 3 | Public land mobile network (MCC + MNC) run or shared by the tenant |

## 4. Table reference

---

## Inventory

### ANTENNA

Installed RF antenna with sector, mounting, azimuth and tilts. Kept in Inventory pending validation (RF parameters used by cells); mount asset proxied from Passive Inventory.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `CODE`, `SITE_ID_FK`, `LIVE_FLAG`)
- **References**: `MOUNT_EXTERNAL_RESOURCE_ID_FK` → `EXTERNAL_RESOURCE`; `VENDOR_ID_FK, PRODUCT_MODEL_ID_FK` → `PRODUCT_MODEL`; `SITE_ID_FK, RADIO_SECTOR_ID_FK` → `RADIO_SECTOR`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SITE_ID_FK` → `SITE`; `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `CELL_ANTENNA`
- **Constraints**: 8 CHECK, 8 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'ANTENNA' | Constant ANTENNA: FK-bound to RESOURCE so the supertype row is of this type |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID: where the antenna is installed |
| `RADIO_SECTOR_ID_FK` **FK** | int unsigned | yes | NULL | FK RADIO_SECTOR.ID at the same site (FK-enforced) |
| `MOUNT_EXTERNAL_RESOURCE_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_RESOURCE.ID: proxy of the tower / mast / pole it is mounted on; the asset itself is owned by Passive Inventory |
| `CODE` | varchar(40) | no |  | Antenna id at the site (ANT-1A) |
| `ANTENNA_TYPE` | varchar(16) | no | 'PANEL' | Kind of antenna. Values: PANEL, OMNI, AAS_INTEGRATED, SMALL_CELL, DAS_NODE, GNSS |
| `VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID |
| `PRODUCT_MODEL_ID_FK` **FK** | int unsigned | yes | NULL | FK PRODUCT_MODEL.ID (category ANTENNA); FK-bound to VENDOR_ID_FK |
| `SERIAL_NUMBER` | varchar(64) | yes | NULL | Serial number |
| `HEIGHT_M` | decimal(6,2) | yes | NULL | Height above ground, metres |
| `AZIMUTH_DEG` | smallint unsigned | yes | NULL | Azimuth, degrees from true north (0-359) |
| `MECHANICAL_TILT_DEG` | decimal(4,1) | yes | NULL | Mechanical tilt, degrees |
| `ELECTRICAL_TILT_DEG` | decimal(4,1) | yes | NULL | Current electrical tilt, degrees |
| `MIN_ELECTRICAL_TILT_DEG` | decimal(4,1) | yes | NULL | Lowest electrical tilt supported, degrees |
| `MAX_ELECTRICAL_TILT_DEG` | decimal(4,1) | yes | NULL | Highest electrical tilt supported, degrees |
| `REMOTE_ELECTRICAL_TILT_CAPABLE` | tinyint(1) | no | '0' | 1 when the antenna has remote electrical tilt |
| `GAIN_DBI` | decimal(5,2) | yes | NULL | Gain, dBi |
| `HORIZONTAL_BEAM_WIDTH_DEG` | decimal(5,2) | yes | NULL | Horizontal beam width, degrees |
| `VERTICAL_BEAM_WIDTH_DEG` | decimal(5,2) | yes | NULL | Vertical beam width, degrees |
| `PORT_COUNT` | smallint unsigned | yes | NULL | Number of RF ports |
| `STATUS` | varchar(16) | no | 'IN_SERVICE' | Status. Values: PLANNED, IN_SERVICE, FAULTY, RETIRED |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### CELL_ANTENNA

Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells).

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`, `ANTENNA_ID_FK`)
- **References**: `ANTENNA_ID_FK` → `ANTENNA`; `RADIO_CELL_ID_FK` → `RADIO_CELL` (cascade)
- **Constraints**: 0 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RADIO_CELL_ID_FK` **FK** | int unsigned | no |  | FK RADIO_CELL.ID |
| `ANTENNA_ID_FK` **FK** | int unsigned | no |  | FK ANTENNA.ID |
| `ANTENNA_PORTS` | varchar(32) | yes | NULL | RF ports of the antenna used by the cell (R1-R4) |

### CELL_RADIO_UNIT

Radio unit(s) (RRU / RRH / AAU, NE type RADIO_UNIT) that transmit a cell; one RU carries many cells.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`, `RADIO_UNIT_NETWORK_ELEMENT_ID_FK`)
- **References**: `RADIO_CELL_ID_FK` → `RADIO_CELL` (cascade); `RADIO_UNIT_NETWORK_ELEMENT_ID_FK, RADIO_UNIT_NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT`
- **Constraints**: 1 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RADIO_CELL_ID_FK` **FK** | int unsigned | no |  | FK RADIO_CELL.ID |
| `RADIO_UNIT_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID of type RADIO_UNIT |
| `RADIO_UNIT_NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no | 'RADIO_UNIT' | Constant RADIO_UNIT: FK-binds the NE to that type |

### NETWORK_SLICE

5G network slice (S-NSSAI) of a PLMN.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `PLMN_ID_FK`, `SST`, `SD`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`)
- **References**: `PLMN_ID_FK` → `PLMN`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade)
- **Constraints**: 3 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'NETWORK_SLICE' | Constant NETWORK_SLICE: FK-bound to RESOURCE so the supertype row is of this type |
| `PLMN_ID_FK` **FK** | int unsigned | no |  | FK PLMN.ID |
| `SST` | tinyint unsigned | no |  | Slice / service type (1 eMBB, 2 URLLC, 3 MIoT, 4 V2X, 128-255 operator-defined) |
| `SD` | char(6) | no | 'FFFFFF' | Slice differentiator, 6 hex digits; FFFFFF = no SD (3GPP TS 23.003) |
| `NAME` | varchar(100) | no |  | Slice name |
| `STATUS` | varchar(16) | no | 'PLANNED' | Status. Values: PLANNED, ACTIVE, SUSPENDED, RETIRED |

### RADIO_CELL

Radio cell of any generation, bound to its node, technology, band and sector.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `CELL_NAME`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `TECHNOLOGY_CODE`, `CELL_KEY`)
- **References**: `TECHNOLOGY_CODE, BAND_CODE` → `FREQUENCY_BAND`; `NETWORK_ELEMENT_ID_FK, NODE_NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT`; `RADIO_SECTOR_ID_FK` → `RADIO_SECTOR`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade)
- **Referenced by**: `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `RADIO_CELL_PLMN`
- **Constraints**: 11 CHECK, 8 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'RADIO_CELL' | Constant RADIO_CELL: FK-bound to RESOURCE so the supertype row is of this type |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: owning RAN node (BTS, NodeB, eNodeB, gNodeB or gNB-DU) |
| `NODE_NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of the node NETWORK_ELEMENT_TYPE, FK-bound; must be BTS, NODEB, ENODEB, GNODEB or GNB_DU |
| `RADIO_SECTOR_ID_FK` **FK** | int unsigned | yes | NULL | FK RADIO_SECTOR.ID the cell radiates in |
| `TECHNOLOGY_CODE` **FK** | varchar(20) | no |  | Radio technology (GSM, UMTS, LTE, NB_IOT, NR); FK-bound with BAND_CODE to FREQUENCY_BAND |
| `BAND_CODE` **FK** | varchar(16) | no |  | Band of that technology (GSM900, B1, B3, n78); FREQUENCY_BAND (TECHNOLOGY_CODE, CODE) |
| `CELL_NAME` | varchar(100) | no |  | Cell name |
| `LOCAL_CELL_ID` | int unsigned | yes | NULL | Cell id within the node (LCID / cell index) |
| `CELL_IDENTITY` | bigint unsigned | yes | NULL | CI (2G / 3G, 16 bit), ECI (28 bit) or NCI (36 bit); NULL while planned |
| `LAC_TAC` | int unsigned | yes | NULL | LAC (2G / 3G, 16 bit) or TAC (4G 16 bit / 5G 24 bit) |
| `CELL_KEY` | varchar(40) | yes |  | *(generated)* Derived identity: LAC:CI for 2G / 3G, ECI / NCI otherwise; unique per technology |
| `PHYSICAL_CELL_ID` | smallint unsigned | yes | NULL | BSIC (GSM 0-63), PSC (UMTS 0-511), PCI (LTE 0-503, NR 0-1007) |
| `ARFCN_DOWNLINK` | int unsigned | yes | NULL | Downlink ARFCN / UARFCN / EARFCN / NR-ARFCN |
| `ARFCN_UPLINK` | int unsigned | yes | NULL | Uplink channel number (FDD) |
| `BANDWIDTH_MHZ` | decimal(5,1) | yes | NULL | Channel bandwidth, MHz (0.2 GSM, 5 UMTS, up to 400 NR) |
| `ROOT_SEQUENCE_INDEX` | smallint unsigned | yes | NULL | PRACH root sequence index (LTE 0-837, NR 0-1023) |
| `MAX_TRANSMIT_POWER_DBM` | decimal(5,2) | yes | NULL | Maximum transmit power, dBm |
| `MIMO_MODE` | varchar(16) | yes | NULL | MIMO configuration (2T2R, 4T4R, 32T32R, 64T64R) |
| `CELL_STATUS` | varchar(16) | no | 'PLANNED' | Cell status. Values: PLANNED, ON_AIR, LOCKED, OFF_AIR |
| `PLANNED_ON_AIR_DATE` | date | yes | NULL | Planned on-air date (was RADIO_BAND.TENTATIVE_ON_AIR_DATE) |
| `ON_AIR_TIME` | datetime(3) | yes | NULL | Actual on-air time (UTC) |

### RADIO_CELL_PLMN

PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`, `PLMN_ID_FK`); (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`, `PRIMARY_FLAG`)
- **References**: `PLMN_ID_FK` → `PLMN`; `RADIO_CELL_ID_FK` → `RADIO_CELL` (cascade)
- **Constraints**: 0 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RADIO_CELL_ID_FK` **FK** | int unsigned | no |  | FK RADIO_CELL.ID |
| `PLMN_ID_FK` **FK** | int unsigned | no |  | FK PLMN.ID |
| `IS_PRIMARY` | tinyint(1) | no | '0' | 1 for the primary PLMN of the cell |
| `PRIMARY_FLAG` | tinyint(1) | yes |  | *(generated)* Derived: keeps one primary PLMN per cell |

### RADIO_SECTOR

Sector of a radio site grouping antennas and cells of all technologies.

- **Module / group**: Inventory · RAN radio layer
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SITE_ID_FK`, `SECTOR_NUMBER`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`)
- **References**: `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SITE_ID_FK` → `SITE`
- **Referenced by**: `ANTENNA`, `RADIO_CELL`
- **Constraints**: 2 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'RADIO_SECTOR' | Constant RADIO_SECTOR: FK-bound to RESOURCE so the supertype row is of this type |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID: site where the sector radiates (coverage site) |
| `SECTOR_NUMBER` | tinyint unsigned | no |  | Sector number at the site (1-24) |
| `NAME` | varchar(64) | yes | NULL | Sector label (Alpha, S1, North) |

### CLOUD_CLUSTER

Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04).

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SITE_ID_FK` → `SITE`
- **Referenced by**: `NETWORK_ELEMENT_SERVER_DETAIL`, `NETWORK_ELEMENT_VIRTUAL_INSTANCE`
- **Constraints**: 2 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'CLOUD_CLUSTER' | Constant CLOUD_CLUSTER: FK-bound to RESOURCE so the supertype row is of this type |
| `CODE` | varchar(64) | no |  | Subcloud code |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID: hosting data centre / site |
| `PLATFORM` | varchar(16) | no | 'KUBERNETES' | Virtualisation platform. Values: KUBERNETES, OPENSTACK, VMWARE, OTHER |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### EQUIPMENT_COMPONENT

Hardware tree inside a device, including empty slots; parents are FK-bound to the same device.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NAME`, `ACTIVE_FLAG`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_ID_FK, PARENT_COMPONENT_ID_FK` → `EQUIPMENT_COMPONENT`; `VENDOR_ID_FK, PRODUCT_MODEL_ID_FK` → `PRODUCT_MODEL`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `PORT`
- **Constraints**: 7 CHECK, 9 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'EQUIPMENT_COMPONENT' | Constant EQUIPMENT_COMPONENT: FK-bound to RESOURCE so the supertype row is of this type |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID |
| `PARENT_COMPONENT_ID_FK` **FK** | int unsigned | yes | NULL | FK EQUIPMENT_COMPONENT.ID: containing component of the same device; NULL for the chassis |
| `COMPONENT_TYPE` | varchar(24) | no |  | Component type. Values: CHASSIS, SHELF, SLOT, SUBSLOT, ROUTING_ENGINE, CONTROL_CARD, LINE_CARD, BASEBAND_CARD, PIC, MODULE, TRANSCEIVER, PSU, FAN, OTHER |
| `NAME` | varchar(100) | no |  | Name as reported (FPC 0, PIC 0/0, PEM 1, Slot 3); unique per device among active rows |
| `SLOT_POSITION` | varchar(32) | yes | NULL | Slot / position (0/0, OT-1 slot 4) |
| `VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID of the component (optics are often third-party) |
| `PRODUCT_MODEL_ID_FK` **FK** | int unsigned | yes | NULL | FK PRODUCT_MODEL.ID once PART_NUMBER is matched to the catalog; FK-bound to VENDOR_ID_FK |
| `PART_NUMBER` | varchar(64) | yes | NULL | Part number exactly as reported (MPC7E-10G, SFP+-10G-LR); kept even when unmatched |
| `SERIAL_NUMBER` | varchar(64) | yes | NULL | Serial number |
| `HARDWARE_REVISION` | varchar(16) | yes | NULL | Hardware revision |
| `MANUFACTURE_DATE` | date | yes | NULL | Manufacture date |
| `STATUS` | varchar(16) | no | 'UNKNOWN' | Component status (EMPTY only for SLOT / SUBSLOT). Values: ONLINE, DEGRADING, FAILED, EMPTY, UNKNOWN |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = no longer reported (Inactive inventory > Hardware). Values: ACTIVE, INACTIVE |
| `INACTIVE_TIME` | datetime(3) | yes | NULL | When it went inactive (UTC) |
| `LAST_SEEN_TIME` | datetime(3) | yes | NULL | Last discovery that reported it (UTC) |
| `ACTIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows |

### IP_SUBNET

IP prefix per routing context (global or L3VPN), with hierarchy and purpose.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `ROUTING_CONTEXT_KEY`, `NETWORK_ADDRESS_BINARY`, `PREFIX_LENGTH`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`)
- **References**: `PARENT_SUBNET_ID_FK` → `IP_SUBNET`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SERVICE_INSTANCE_ID_FK` → `SERVICE_INSTANCE`; `SITE_ID_FK` → `SITE`
- **Referenced by**: `PORT_IP_ADDRESS`
- **Constraints**: 6 CHECK, 6 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'IP_SUBNET' | Constant IP_SUBNET: FK-bound to RESOURCE so the supertype row is of this type |
| `NETWORK_ADDRESS` | varchar(45) | no |  | Network address, IPv4 or IPv6 text form (10.20.0.0) |
| `PREFIX_LENGTH` | tinyint unsigned | no |  | Prefix length (0-32 IPv4, 0-128 IPv6) |
| `NETWORK_ADDRESS_BINARY` | varbinary(16) | no |  | *(generated)* Derived canonical binary address |
| `ADDRESS_FAMILY` | varchar(4) | no |  | *(generated)* Derived: IPV4 or IPV6 |
| `SERVICE_INSTANCE_ID_FK` **FK** | int unsigned | yes | NULL | FK SERVICE_INSTANCE.ID: L3VPN routing context; NULL = global routing table |
| `ROUTING_CONTEXT_KEY` | int unsigned | no |  | *(generated)* Derived: 0 for global, else the L3VPN id (keeps prefixes unique per context) |
| `PARENT_SUBNET_ID_FK` **FK** | int unsigned | yes | NULL | FK IP_SUBNET.ID: enclosing prefix in the plan; cycles rejected by the application |
| `SITE_ID_FK` **FK** | int unsigned | yes | NULL | FK SITE.ID when the prefix is site-scoped |
| `PURPOSE` | varchar(16) | no | 'INFRASTRUCTURE' | Use of the prefix. Values: INFRASTRUCTURE, P2P, LOOPBACK, MANAGEMENT, CUSTOMER, RAN_TRANSPORT, CORE_SIGNALLING, USER_PLANE, POOL |
| `STATUS` | varchar(16) | no | 'ALLOCATED' | Plan state. Values: PLANNED, ALLOCATED, RESERVED, DEPRECATED |
| `DESCRIPTION` | varchar(255) | yes | NULL | Description |

### NETWORK_ELEMENT_HEALTH

Latest reachability and time-sync check of a device (ICMP + NTP). History belongs to performance management.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation · Written by Discovery collectors
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 5 CHECK, 1 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID |
| `REACHABILITY` | varchar(16) | no | 'UNKNOWN' | ICMP reachability. Values: REACHABLE, UNREACHABLE, DEGRADED, UNKNOWN |
| `PACKET_LOSS_PERCENT` | decimal(5,2) | yes | NULL | Packet loss % |
| `LATENCY_AVERAGE_MS` | decimal(8,2) | yes | NULL | Average round trip, ms |
| `AVAILABILITY_24H_PERCENT` | decimal(5,2) | yes | NULL | Availability over the last 24 h, % |
| `NTP_STATUS` | varchar(16) | no | 'UNKNOWN' | NTP synchronisation. Values: SYNCED, UNSYNCED, UNKNOWN |
| `NTP_OFFSET_MS` | decimal(10,3) | yes | NULL | Clock offset from NTP, ms |
| `NTP_STRATUM` | tinyint unsigned | yes | NULL | NTP stratum |
| `CHECKED_TIME` | datetime(3) | no |  | When checked (UTC) |

### NETWORK_ELEMENT_MOVEMENT

Append-only stock movement (the application never updates or deletes rows) / state change of a device (issue, install, RMA, decommission, recover to store) with its work order.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **References**: `FROM_SITE_ID_FK` → `SITE`; `FROM_STATE, TO_STATE` → `NETWORK_ELEMENT_STOCK_TRANSITION`; `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `TO_SITE_ID_FK` → `SITE`
- **Constraints**: 0 CHECK, 5 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID |
| `FROM_STATE` **FK** | varchar(24) | no |  | Stock state before. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED |
| `TO_STATE` **FK** | varchar(24) | no |  | Stock state after. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED |
| `FROM_SITE_ID_FK` **FK** | int unsigned | yes | NULL | FK SITE.ID: where it came from (warehouse or site) |
| `TO_SITE_ID_FK` **FK** | int unsigned | yes | NULL | FK SITE.ID: where it went |
| `MOVED_TIME` | datetime(3) | no |  | When (UTC) |
| `WORK_ORDER_REFERENCE` | varchar(40) | yes | NULL | Work order reference |
| `REMARKS` | varchar(500) | yes | NULL | Remarks |

### NETWORK_ELEMENT_STOCK_TRANSITION

Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned; decommissioned > in store = recovered to store).

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`FROM_STATE`, `TO_STATE`)
- **Referenced by**: `NETWORK_ELEMENT_MOVEMENT`
- **Constraints**: 3 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `FROM_STATE` | varchar(24) | no |  | State the move starts from. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED |
| `TO_STATE` | varchar(24) | no |  | State the move ends in. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED |
| `MOVEMENT_TYPE` | varchar(16) | no |  | Movement that performs the transition. Values: RECEIVE, ISSUE, DISPATCH, INSTALL, DE_INSTALL, RMA_OUT, RMA_IN, DECOMMISSION, RECOVER, SCRAP |

### NETWORK_ELEMENT_VIRTUAL_INSTANCE

Virtualisation record (VNF / CNF) of a virtual NE, 1:1.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_RESOURCE_TYPE`); (`CUSTOMER_ID`, `INSTANCE_UUID`)
- **References**: `CLOUD_CLUSTER_ID_FK` → `CLOUD_CLUSTER`; `HOST_NETWORK_ELEMENT_ID_FK, HOST_RESOURCE_TYPE` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_RESOURCE_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 5 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the virtual NE (1:1) |
| `NETWORK_ELEMENT_RESOURCE_TYPE` **FK** | varchar(24) | no | 'VIRTUAL_NE' | Constant VIRTUAL_NE: FK-binds this row to a virtual NE only |
| `VIRTUALIZATION_TYPE` | varchar(8) | no |  | VM-based or container-based. Values: VNF, CNF |
| `INSTANCE_UUID` | char(36) | yes | NULL | Orchestrator instance UUID |
| `DESCRIPTOR_ID` | varchar(64) | yes | NULL | VNFD / CNF package id |
| `DESCRIPTOR_VERSION` | varchar(32) | yes | NULL | Descriptor / package version |
| `CLOUD_CLUSTER_ID_FK` **FK** | int unsigned | yes | NULL | FK CLOUD_CLUSTER.ID: hosting cluster / subcloud |
| `HOST_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: physical server pinned as host (VNF on a known host) |
| `HOST_RESOURCE_TYPE` **FK** | varchar(24) | no | 'PHYSICAL_NE' | Constant PHYSICAL_NE: the host must be a physical NE |
| `INSTANTIATION_STATE` | varchar(16) | no | 'NOT_INSTANTIATED' | Lifecycle as reported by the orchestrator. Values: NOT_INSTANTIATED, INSTANTIATED, TERMINATED |

### PORT

Device interface; card, optic, parent and VRF bound to the same device. Passive-asset ports moved to Passive Inventory (proxied by EXTERNAL_RESOURCE).

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NAME`); (`CUSTOMER_ID`, `TRANSCEIVER_COMPONENT_ID_FK`)
- **References**: `NETWORK_ELEMENT_ID_FK, EQUIPMENT_COMPONENT_ID_FK` → `EQUIPMENT_COMPONENT`; `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_ID_FK, PARENT_PORT_ID_FK` → `PORT`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `NETWORK_ELEMENT_ID_FK, TRANSCEIVER_COMPONENT_ID_FK` → `EQUIPMENT_COMPONENT`; `NETWORK_ELEMENT_ID_FK, VRF_ID_FK` → `VRF`
- **Referenced by**: `LINK`, `NETWORK_ELEMENT_PON_DETAIL`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `SERVICE_ENDPOINT`
- **Constraints**: 10 CHECK, 11 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no |  | *(generated)* Derived resource type (RESOURCE_TYPE.CODE); FK-bound to RESOURCE so the supertype row agrees |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device the port belongs to (passive ODF / DDF ports live in Passive Inventory and are proxied by EXTERNAL_RESOURCE) |
| `EQUIPMENT_COMPONENT_ID_FK` **FK** | int unsigned | yes | NULL | FK EQUIPMENT_COMPONENT.ID: card / PIC the port is on (same device) |
| `TRANSCEIVER_COMPONENT_ID_FK` **FK** | int unsigned | yes | NULL | FK EQUIPMENT_COMPONENT.ID: pluggable optic seated in the port (same device) |
| `PARENT_PORT_ID_FK` **FK** | int unsigned | yes | NULL | FK PORT.ID: parent physical port or bundle of the same device (sub-interface, LAG member) |
| `VRF_ID_FK` **FK** | int unsigned | yes | NULL | FK VRF.ID: VRF the interface is bound to (same device); NULL = global table |
| `NAME` | varchar(64) | no |  | Interface name (xe-0/0/3, Gi0/0/4, Port-3) |
| `PORT_KIND` | varchar(24) | no |  | Physical or logical port; fixes the resource type. Values: PHYSICAL, SUB_INTERFACE, BUNDLE, LOOPBACK, TUNNEL, MANAGEMENT |
| `MEDIA` | varchar(16) | yes | NULL | Media type. Values: ETHERNET, OPTICAL, SFP, SERIAL, COAXIAL, CPRI, POWER |
| `CONNECTOR` | varchar(16) | yes | NULL | Connector type. Values: RJ45, LC, SC, FC, E2000, MPO, N_TYPE, DIN_4_3 |
| `DIRECTION` | varchar(24) | no | 'BIDIRECTIONAL' | Port direction. Values: IN, OUT, BIDIRECTIONAL |
| `SPEED_MBPS` | int unsigned | yes | NULL | Speed in Mbps (10G = 10000) |
| `MTU` | smallint unsigned | yes | NULL | MTU bytes |
| `INTERFACE_INDEX` | int unsigned | yes | NULL | SNMP ifIndex |
| `MAC_ADDRESS` | char(17) | yes | NULL | Interface MAC, aa:bb:cc:dd:ee:ff |
| `DESCRIPTION` | varchar(255) | yes | NULL | Interface description |
| `ADMIN_STATUS` | varchar(8) | yes | NULL | Admin status. Values: UP, DOWN |
| `OPERATIONAL_STATUS` | varchar(16) | no | 'UNKNOWN' | Operational status. Values: UP, DOWN, UNKNOWN |
| `USAGE_STATE` | varchar(16) | no | 'FREE' | Capacity state; drives port total / used / free. Values: FREE, OCCUPIED, RESERVED, FAULTY, BLOCKED |
| `LAST_CHANGE_TIME` | datetime(3) | yes | NULL | Last oper-status change (UTC) |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = no longer reported (Inactive inventory > Interface). Values: ACTIVE, INACTIVE |
| `INACTIVE_TIME` | datetime(3) | yes | NULL | When it went inactive (UTC) |

### PORT_IP_ADDRESS

IP address on an interface and its subnet.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `PORT_ID_FK`, `IP_ADDRESS_BINARY`)
- **References**: `IP_SUBNET_ID_FK` → `IP_SUBNET`; `PORT_ID_FK` → `PORT` (cascade)
- **Constraints**: 2 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `PORT_ID_FK` **FK** | int unsigned | no |  | FK PORT.ID |
| `IP_ADDRESS` | varchar(45) | no |  | Address, IPv4 or IPv6 text form as reported |
| `IP_ADDRESS_BINARY` | varbinary(16) | no |  | *(generated)* Derived canonical binary address (2001:DB8::1 and 2001:db8::1 are the same) |
| `PREFIX_LENGTH` | tinyint unsigned | no |  | Prefix length (/30) |
| `IP_SUBNET_ID_FK` **FK** | int unsigned | yes | NULL | FK IP_SUBNET.ID: prefix the address falls in, when the plan has it |
| `IS_PRIMARY` | tinyint(1) | no | '1' | 1 for the primary address |

### PORT_VLAN

VLAN membership of a port on the same device.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `PORT_ID_FK`, `VLAN_ID_FK`)
- **References**: `NETWORK_ELEMENT_ID_FK, PORT_ID_FK` → `PORT` (cascade); `NETWORK_ELEMENT_ID_FK, VLAN_ID_FK` → `VLAN` (cascade)
- **Constraints**: 2 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: device of both the port and the VLAN |
| `PORT_ID_FK` **FK** | int unsigned | no |  | FK PORT.ID (same device) |
| `VLAN_ID_FK` **FK** | int unsigned | no |  | FK VLAN.ID (same device) |
| `MODE` | varchar(16) | no |  | Access or trunk membership. Values: ACCESS, TRUNK |
| `STP_STATE` | varchar(16) | yes | NULL | Spanning-tree state. Values: FORWARDING, BLOCKING, LEARNING, DISABLED |

### VLAN

VLAN configured on a device (RESOURCE_TYPE VLAN). DDL restored from v3 and aligned with the RESOURCE supertype because it was missing from the v4 dump.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `VLAN_NUMBER`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade)
- **Referenced by**: `PORT_VLAN`
- **Constraints**: 5 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'VLAN' | Constant VLAN: FK-bound to RESOURCE so the supertype row is of this type |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the switch / router the VLAN is configured on |
| `VLAN_NUMBER` | smallint unsigned | no |  | VLAN id (1-4094) |
| `NAME` | varchar(64) | yes | NULL | VLAN name |
| `VLAN_TYPE` | varchar(16) | yes | NULL | VLAN type. Values: DATA, SERVER, WIRELESS, VOICE, GUEST, MANAGEMENT |
| `STATUS` | varchar(16) | no | 'ACTIVE' | VLAN status. Values: ACTIVE, SUSPENDED |
| `RECORD_SOURCE` | varchar(16) | no | 'DISCOVERED' | Origin of the row. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |

### VRF

VRF instance on a router (RESOURCE_TYPE VRF); PORT.VRF_ID_FK binds interfaces to it. New DDL: the table was referenced but missing from the v4 dump.

- **Module / group**: Inventory · Network element lifecycle, hardware, ports and virtualisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NAME`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SERVICE_INSTANCE_ID_FK` → `SERVICE_INSTANCE`
- **Referenced by**: `PORT`
- **Constraints**: 3 CHECK, 5 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'VRF' | Constant VRF: FK-bound to RESOURCE so the supertype row is of this type |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the router the VRF is configured on |
| `NAME` | varchar(64) | no |  | VRF name as configured (CUST-ACME-L3) |
| `ROUTE_DISTINGUISHER` | varchar(32) | yes | NULL | RD (64512:100) |
| `SERVICE_INSTANCE_ID_FK` **FK** | int unsigned | yes | NULL | FK SERVICE_INSTANCE.ID: L3VPN the VRF belongs to, when known |
| `DESCRIPTION` | varchar(255) | yes | NULL | VRF description |
| `STATUS` | varchar(16) | no | 'ACTIVE' | Status. Values: ACTIVE, SUSPENDED |
| `RECORD_SOURCE` | varchar(16) | no | 'DISCOVERED' | Origin of the row. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |

### EXTERNAL_ENTITY_TYPE

Type of externally owned entity (fiber span, passive asset, CMDB item ...) that may be proxied here.

- **Module / group**: Inventory · External systems and proxies
- **Primary key**: `CODE`
- **Unique**: (`CODE`, `SYSTEM_TYPE`)
- **Referenced by**: `EXTERNAL_RESOURCE`
- **Constraints**: 0 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `CODE` **PK** | varchar(24) | no |  | Object type code |
| `SYSTEM_TYPE` | varchar(24) | no |  | EXTERNAL_SYSTEM.SYSTEM_TYPE that owns objects of this type (FIBER_INVENTORY ...) |
| `NAME` | varchar(64) | no |  | Display name |

### EXTERNAL_RESOURCE

Lightweight proxy for an object owned by another system (fiber plant, Passive Inventory, CMDB, CRM); ids and a label cache only, no copied attributes.

- **Module / group**: Inventory · External systems and proxies · Proxy rows synced from the owning system (Passive Inventory, fiber application ...)
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`, `ENTITY_TYPE`, `EXTERNAL_ID`)
- **References**: `ENTITY_TYPE, SYSTEM_TYPE` → `EXTERNAL_ENTITY_TYPE`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `EXTERNAL_SYSTEM_ID_FK, SYSTEM_TYPE` → `EXTERNAL_SYSTEM`
- **Referenced by**: `ANTENNA`, `NETWORK_ELEMENT`, `NETWORK_ELEMENT_POWER_DETAIL`
- **Constraints**: 2 CHECK, 6 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'EXTERNAL_RESOURCE' | Type of the proxied object, FK-bound to RESOURCE. EXTERNAL_RESOURCE for fiber plant / CMDB / CRM objects; PASSIVE_ASSET, PASSIVE_PORT, POWER_UNIT or RACK for objects owned by Passive Inventory (RESOURCE_TYPE.SUBTYPE_TABLE = EXTERNAL_RESOURCE) |
| `EXTERNAL_SYSTEM_ID_FK` **FK** | int unsigned | no |  | FK EXTERNAL_SYSTEM.ID: owner of the object (fiber application, Passive Inventory, CMDB ...) |
| `SYSTEM_TYPE` **FK** | varchar(24) | no |  | Copy of EXTERNAL_SYSTEM.SYSTEM_TYPE, FK-bound so the object type fits the system |
| `ENTITY_TYPE` **FK** | varchar(24) | no |  | FK EXTERNAL_ENTITY_TYPE.CODE (FIBER_CABLE, FIBER_SPAN, FIBER_STRAND, FIBER_CIRCUIT, DUCT ...) |
| `EXTERNAL_ID` | varchar(128) | no |  | Immutable id of the object in the owning system |
| `DISPLAY_LABEL` | varchar(150) | yes | NULL | Label cache for lists only (CKT-10021 / Span BLR-DEL-07); the owning system stays authoritative |
| `LAST_SYNC_TIME` | datetime(3) | yes | NULL | Last time the id was confirmed to exist in the owning system (UTC) |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = no longer exists in the owning system. Values: ACTIVE, INACTIVE |

### EXTERNAL_SYSTEM

Every external system this inventory exchanges data with, including discovery sources and the fiber application. System types added for Passive Inventory and Open / CoPEX (FINANCE).

- **Module / group**: Inventory · External systems and proxies
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`; `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `EXTERNAL_RESOURCE`, `RESOURCE_EXTERNAL_REFERENCE`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_RELATIONSHIP`, `SCAN_JOB`
- **Constraints**: 2 CHECK, 5 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(40) | no |  | System code (NSP-SOUTH, U2020-RAN, SNOW-CMDB, FIBERNEO) |
| `NAME` | varchar(100) | no |  | Display name |
| `SYSTEM_TYPE` | varchar(24) | no |  | Role of the system. Values: EMS, NMS, SDN_CONTROLLER, OSS_INVENTORY, CMDB, ERP, IAM, ITSM, ORCHESTRATOR, LCM, CRM, PLANNING, PM, FM, FIBER_INVENTORY, PASSIVE_INVENTORY, FINANCE, OTHER. IAM = User Management module (USER arrives by CDC); PASSIVE_INVENTORY = Passive Inventory module; FINANCE = Open / CoPEX module |
| `VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID: product vendor (Nokia NSP, Huawei U2020); NULL for in-house systems |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | yes | NULL | FK DOMAIN.ID: network domain the system manages; NULL = several / not network |
| `BASE_URL` | varchar(255) | yes | NULL | API base URL / deep-link root used by the UI |
| `VAULT_REFERENCE` | varchar(200) | yes | NULL | Vault path of the integration credential; never the secret |
| `IS_DISCOVERY_SOURCE` | tinyint(1) | no | '0' | 1 when scan jobs may use this system as their source (API-based discovery) |
| `STATUS` | varchar(16) | no | 'ACTIVE' | Integration state. Values: ACTIVE, SUSPENDED, RETIRED |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### LINK

Connection between two devices at one catalogued layer, unique by natural key among active rows.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `LINK_KEY`, `ACTIVE_FLAG`)
- **References**: `A_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `A_NETWORK_ELEMENT_ID_FK, A_PORT_ID_FK` → `PORT`; `LAYER, IS_DIRECTED` → `LINK_LAYER`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `Z_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `Z_NETWORK_ELEMENT_ID_FK, Z_PORT_ID_FK` → `PORT`
- **Referenced by**: `LINK_MICROWAVE_ATTRIBUTE`, `LINK_PROTOCOL_ATTRIBUTE`
- **Constraints**: 10 CHECK, 11 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'LINK' | Constant LINK: FK-bound to RESOURCE so the supertype row is of this type |
| `LAYER` **FK** | varchar(16) | no |  | LINK_LAYER.CODE: layer / protocol / interface of the link |
| `IS_DIRECTED` **FK** | tinyint(1) | no | '0' | Copy of LINK_LAYER.IS_DIRECTED, FK-bound; decides how LINK_KEY orders the ends |
| `LINK_NAME` | varchar(200) | yes | NULL | Link name / hop code |
| `CIRCUIT_ID` | varchar(64) | yes | NULL | Business circuit id; the carrying fiber circuit itself is an EXTERNAL_RESOURCE |
| `A_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: A-end device |
| `A_PORT_ID_FK` **FK** | int unsigned | yes | NULL | FK PORT.ID: A-end interface; must be a port of A_NETWORK_ELEMENT_ID_FK |
| `A_IP_ADDRESS` | varchar(45) | yes | NULL | A-end address used by the protocol |
| `Z_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: Z-end device; NULL when the neighbour is not in inventory |
| `Z_PORT_ID_FK` **FK** | int unsigned | yes | NULL | FK PORT.ID: Z-end interface; must be a port of Z_NETWORK_ELEMENT_ID_FK |
| `Z_IP_ADDRESS` | varchar(45) | yes | NULL | Z-end address used by the protocol |
| `Z_REMOTE_NAME` | varchar(253) | yes | NULL | Neighbour name as reported, when the Z device is not in inventory |
| `LINK_KEY` | varchar(400) | no |  | *(generated)* Derived natural key: layer + ends (ordered for directed layers, unordered otherwise) |
| `STATUS` | varchar(16) | no | 'UNKNOWN' | Link state (BGP uses established / idle / active / connect). Values: UP, DOWN, ESTABLISHED, IDLE, ACTIVE, CONNECT, UNKNOWN |
| `DOWN_REASON` | varchar(255) | yes | NULL | Reason when down |
| `CAPACITY_MBPS` | int unsigned | yes | NULL | Provisioned capacity, Mbps |
| `RECORD_SOURCE` | varchar(16) | no | 'DISCOVERED' | How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |
| `FIRST_SEEN_TIME` | datetime(3) | yes | NULL | First discovery (UTC) |
| `LAST_SEEN_TIME` | datetime(3) | yes | NULL | Last discovery that confirmed it (UTC) |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = no longer seen (Inactive inventory > LLDP / OSPF / BGP). Values: ACTIVE, INACTIVE |
| `INACTIVE_TIME` | datetime(3) | yes | NULL | When it went inactive (UTC) |
| `ACTIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows |

### LINK_LAYER

Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP interface layers.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CODE`); (`CODE`, `IS_DIRECTED`)
- **Referenced by**: `LINK`
- **Constraints**: 1 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `CODE` | varchar(16) | no |  | Layer code (PHYSICAL, LLDP, OSPF, ISIS, BGP, RSVP_TE_LSP, MICROWAVE_HOP, S1_U, NG_C, F1_C ...) |
| `NAME` | varchar(64) | no |  | Display name |
| `CATEGORY` | varchar(24) | no |  | Layer family. Values: PHYSICAL, L2_ADJACENCY, ROUTING_ADJACENCY, TUNNEL, OPTICAL, MICROWAVE, FRONTHAUL, RAN_INTERFACE, CORE_INTERFACE |
| `IS_DIRECTED` | tinyint(1) | no | '0' | 1 when A->Z and Z->A are different links (LSP, SR policy); 0 when the pair is unordered (cable, adjacency, interface) |

### LINK_MICROWAVE_ATTRIBUTE

Hop-level attributes of a microwave link, stored once per hop.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `LINK_ID_FK`, `LAYER`)
- **References**: `LINK_ID_FK, LAYER` → `LINK` (cascade)
- **Constraints**: 6 CHECK, 1 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `LINK_ID_FK` **FK** | int unsigned | no |  | FK LINK.ID |
| `LAYER` **FK** | varchar(16) | no | 'MICROWAVE_HOP' | Constant MICROWAVE_HOP: FK-binds the row to a microwave link |
| `FREQUENCY_BAND_GHZ` | decimal(6,2) | yes | NULL | Band, GHz (7, 13, 18, 23, 80) |
| `CHANNEL_BANDWIDTH_MHZ` | decimal(7,2) | yes | NULL | Channel bandwidth, MHz |
| `POLARIZATION` | varchar(8) | yes | NULL | Polarisation. Values: H, V, DUAL |
| `MAX_MODULATION` | varchar(16) | yes | NULL | Highest adaptive modulation (4096QAM) |
| `DISTANCE_KM` | decimal(8,3) | yes | NULL | Hop length, km |
| `IS_LICENSED` | tinyint(1) | no | '1' | 1 when the frequency is licensed |
| `LICENSE_NUMBER` | varchar(64) | yes | NULL | WPC / regulator licence number |
| `PROTECTION_SCHEME` | varchar(24) | yes | NULL | Protection. Values: NONE, 1_PLUS_0, 1_PLUS_1_HSB, 1_PLUS_1_SD, 1_PLUS_1_FD, 2_PLUS_0 |
| `FADE_MARGIN_DB` | decimal(5,2) | yes | NULL | Designed fade margin, dB |

### LINK_PROTOCOL_ATTRIBUTE

Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / neighbour state, IS-IS level. The grids used to overload the interface columns with these.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `LINK_ID_FK`)
- **References**: `LINK_ID_FK` → `LINK` (cascade)
- **Constraints**: 2 CHECK, 1 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `LINK_ID_FK` **FK** | int unsigned | no |  | FK LINK.ID |
| `LOCAL_AS_NUMBER` | int unsigned | yes | NULL | BGP local AS |
| `REMOTE_AS_NUMBER` | int unsigned | yes | NULL | BGP remote AS |
| `OSPF_AREA` | varchar(15) | yes | NULL | OSPF area (0.0.0.0) |
| `NEIGHBOR_STATE` | varchar(32) | yes | NULL | Protocol neighbour state as reported (full(8), established(6)) |
| `ISIS_LEVEL` | varchar(8) | yes | NULL | IS-IS level. Values: L1, L2, L1L2 |
| `INTERFACE_INDEX_A` | int unsigned | yes | NULL | A-end ifIndex reported by the protocol MIB |
| `INTERFACE_INDEX_Z` | int unsigned | yes | NULL | Z-end ifIndex reported by the protocol MIB |

### SERVICE_ENDPOINT

Termination of a service on a device interface (PE for L3VPN; source and destination for point-to-point services).

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `ENDPOINT_ROLE`, `SERVICE_INSTANCE_ID_FK`, `NETWORK_ELEMENT_ID_FK`, `PORT_ID_FK`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_ID_FK, PORT_ID_FK` → `PORT`; `SERVICE_INSTANCE_ID_FK` → `SERVICE_INSTANCE` (cascade)
- **Constraints**: 4 CHECK, 5 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SERVICE_INSTANCE_ID_FK` **FK** | int unsigned | no |  | FK SERVICE_INSTANCE.ID |
| `ENDPOINT_ROLE` | varchar(16) | no |  | Role of the termination. Values: PE, CE, UNI, NNI, SOURCE, DESTINATION |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID |
| `PORT_ID_FK` **FK** | int unsigned | yes | NULL | FK PORT.ID: interface / sub-interface (FortyGigE0/0/0/28.100); must belong to the endpoint device |
| `IP_ADDRESS` | varchar(45) | yes | NULL | Service address on the termination |
| `ADMIN_STATUS` | varchar(8) | yes | NULL | Admin status at this end. Values: UP, DOWN |
| `OPERATIONAL_STATUS` | varchar(16) | no | 'UNKNOWN' | Oper status at this end. Values: UP, DOWN, UNKNOWN |

### SERVICE_INSTANCE

Network service instance, unique per type and name among active services.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `SERVICE_TYPE`, `NAME`, `ACTIVE_FLAG`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SERVICE_TYPE` → `SERVICE_TYPE`
- **Referenced by**: `IP_SUBNET`, `SERVICE_ENDPOINT`, `VRF`
- **Constraints**: 7 CHECK, 7 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'SERVICE' | Constant SERVICE: FK-bound to RESOURCE so the supertype row is of this type |
| `SERVICE_TYPE` **FK** | varchar(20) | no |  | SERVICE_TYPE.CODE |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain |
| `NAME` | varchar(150) | no |  | Service name; unique per type among active services |
| `STATUS` | varchar(16) | no | 'UNKNOWN' | Operational status. Values: UP, DOWN, DEGRADED, UNKNOWN |
| `REFERENCE_KIND` | varchar(24) | yes | NULL | What REFERENCE_VALUE holds. Values: ERP_NUMBER, BEARER_ID, INTERFACE_ID, WAVELENGTH_NM, CIRCUIT_ID, APN_ID, SESSION_ID, VC_ID |
| `REFERENCE_VALUE` | varchar(64) | yes | NULL | Business reference (ERP 1097, VC id, wavelength ...) |
| `CUSTOMER_REFERENCE` | varchar(100) | yes | NULL | Customer account reference (owned by CRM) |
| `BANDWIDTH_MBPS` | int unsigned | yes | NULL | Contracted bandwidth, Mbps |
| `RECORD_SOURCE` | varchar(16) | no | 'DISCOVERED' | How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |
| `LAST_SEEN_TIME` | datetime(3) | yes | NULL | Last discovery that confirmed it (UTC) |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = retired. Values: ACTIVE, INACTIVE |
| `INACTIVE_TIME` | datetime(3) | yes | NULL | When it went inactive (UTC) |
| `ACTIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows |

### SERVICE_TYPE

Network service type catalog.

- **Module / group**: Inventory · Connectivity and services
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `SERVICE_INSTANCE`
- **Constraints**: 0 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `CODE` | varchar(20) | no |  | Service type code |
| `NAME` | varchar(64) | no |  | Display name |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: domain the service type belongs to |

### NETWORK_ELEMENT

Golden record of a physical or virtual device / network function in any domain.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `NETWORK_ELEMENT_NAME`, `LIVE_FLAG`)
- **References**: `DECOMMISSIONED_BY_FK` → `USER`; `DOMAIN_ID_FK` → `DOMAIN`; `NETWORK_ELEMENT_TYPE, DOMAIN_ID_FK` → `NETWORK_ELEMENT_TYPE_DOMAIN`; `PARENT_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `VENDOR_ID_FK, PRODUCT_MODEL_ID_FK, NETWORK_ELEMENT_TYPE` → `PRODUCT_MODEL`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SITE_ID_FK` → `SITE`; `RACK_EXTERNAL_RESOURCE_ID_FK` → `EXTERNAL_RESOURCE`; `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `CELL_RADIO_UNIT`, `EQUIPMENT_COMPONENT`, `LINK`, `NETWORK_ELEMENT_CORE_DETAIL`, `NETWORK_ELEMENT_HEALTH`, `NETWORK_ELEMENT_IP_MPLS_DETAIL`, `NETWORK_ELEMENT_MICROWAVE_DETAIL`, `NETWORK_ELEMENT_MOVEMENT`, `NETWORK_ELEMENT_OPTICAL_DETAIL`, `NETWORK_ELEMENT_PON_DETAIL`, `NETWORK_ELEMENT_POWER_DETAIL`, `NETWORK_ELEMENT_RAN_DETAIL`, `NETWORK_ELEMENT_SECURITY_DETAIL`, `NETWORK_ELEMENT_SERVER_DETAIL`, `NETWORK_ELEMENT_SWITCH_DETAIL`, `NETWORK_ELEMENT_VIRTUAL_INSTANCE`, `NETWORK_ELEMENT_WIFI_DETAIL`, `PORT`, `RADIO_CELL`, `SCAN_RUN_TARGET`, `SCAN_TARGET`, `SERVICE_ENDPOINT`, `VLAN`, `VRF`
- **Constraints**: 13 CHECK, 18 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no |  | *(generated)* Derived resource type (RESOURCE_TYPE.CODE); FK-bound to RESOURCE so the supertype row agrees |
| `IS_VIRTUAL` | tinyint(1) | no | '0' | 1 for a VNF / CNF instance (details in NETWORK_ELEMENT_VIRTUAL_INSTANCE); fixed at creation |
| `NETWORK_ELEMENT_NAME` | varchar(253) | no |  | Device name / sysName (unique per tenant among live records; 253 = DNS name limit, same as SCAN_TARGET.HOST_NAME) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Device type (NETWORK_ELEMENT_TYPE.CODE); FK-checked with DOMAIN_ID_FK against NETWORK_ELEMENT_TYPE_DOMAIN and with the product model |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, IP/MPLS, Optical, Microwave ...) |
| `VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID: known from sysObjectID before the model is identified |
| `PRODUCT_MODEL_ID_FK` **FK** | int unsigned | yes | NULL | FK PRODUCT_MODEL.ID; FK-bound to VENDOR_ID_FK and NETWORK_ELEMENT_TYPE so vendor, model and type agree |
| `SERIAL_NUMBER` | varchar(64) | yes | NULL | Chassis serial. Not unique on purpose: duplicate serials are real and are raised as DUPLICATE discrepancies |
| `MANAGEMENT_IP` | varchar(45) | yes | NULL | Management address (IPv4 or IPv6 text form, as entered) |
| `MANAGEMENT_IP_BINARY` | varbinary(16) | yes |  | *(generated)* Derived: canonical binary address, for lookups and identity matching |
| `MAC_ADDRESS` | char(17) | yes | NULL | Chassis / base MAC, aa:bb:cc:dd:ee:ff |
| `OS_VERSION` | varchar(64) | yes | NULL | Running OS / software version; compared with PRODUCT_MODEL_POLICY for compliance |
| `SOFTWARE_BUILD_NUMBER` | varchar(50) | yes | NULL | Software build number |
| `CONFIG_TEMPLATE` | varchar(64) | yes | NULL | Zero-touch template applied (e.g. 24A-NE-ZTP - 1.0) |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID: where the device is (a warehouse site while in store; the hosting site when virtual) |
| `RACK_EXTERNAL_RESOURCE_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_RESOURCE.ID: proxy (RESOURCE_TYPE RACK) of the rack / cabinet the device is mounted in; the rack itself is owned by Passive Inventory |
| `RACK_UNIT_START` | tinyint unsigned | yes | NULL | Lowest rack unit occupied |
| `RACK_UNIT_END` | tinyint unsigned | yes | NULL | Highest rack unit occupied |
| `PARENT_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: containing device (shelf in a node, RU under a BBU, DU under a CU); cycles rejected by the application |
| `STOCK_STATE` | varchar(24) | no | 'PLANNED' | Asset lifecycle; moves limited to NETWORK_ELEMENT_STOCK_TRANSITION by the application. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED |
| `OPERATIONAL_STATUS` | varchar(16) | no | 'UNKNOWN' | Operational status. Values: READY, PLANNED, UP, DOWN, DEGRADED, UNKNOWN |
| `ADMIN_STATE` | varchar(24) | yes | NULL | Administrative state. Values: UNLOCKED, LOCKED, SHUTTING_DOWN |
| `RECORD_SOURCE` | varchar(16) | no |  | How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |
| `RECONCILIATION_STATE` | varchar(24) | no | 'NOT_DISCOVERED' | Latest reconciliation verdict (cache written by the reconciliation job; mapped in RECONCILIATION_STATE_MAP). Values: VERIFIED, DRIFTED, STALE, MISSING, DUPLICATE, NOT_DISCOVERED |
| `LAST_VERIFIED_TIME` | datetime(3) | yes | NULL | Last time discovery confirmed the record; NULL = never verified |
| `LAST_SEEN_TIME` | datetime(3) | yes | NULL | Last time any collector saw the device answer (zombie check after decommission) |
| `DECOMMISSIONED_TIME` | datetime(3) | yes | NULL | When the device was decommissioned (UTC) |
| `DECOMMISSION_REASON` | varchar(32) | yes | NULL | Why it was decommissioned. Values: CHANGE_REQUEST_REPLACEMENT, END_OF_LIFE, END_OF_SUPPORT, FAULTY_RETURNED, SITE_CONSOLIDATION, CAPACITY_MIGRATION, HARDWARE_REFRESH, WRITTEN_OFF, LEASE_EXPIRED, RING_REDESIGN, TECHNOLOGY_UPGRADE, OTHER |
| `DECOMMISSIONED_BY_FK` **FK** | bigint unsigned | yes | NULL | FK USER.ID: who authorised the decommission |
| `WORK_ORDER_REFERENCE` | varchar(40) | yes | NULL | Work order behind the last stock change (WO-2291) |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### NETWORK_ELEMENT_CORE_DETAIL

Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade); `NETWORK_FUNCTION_TYPE_CODE` → `NETWORK_FUNCTION_TYPE`
- **Constraints**: 4 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_CORE_DETAIL' | Constant NETWORK_ELEMENT_CORE_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `NETWORK_FUNCTION_TYPE_CODE` **FK** | varchar(16) | no |  | FK NETWORK_FUNCTION_TYPE.CODE (AMF, SMF, UPF, MME, P_CSCF ...); its segment (EPC / 5GC / IMS) comes from the catalog |
| `REDUNDANCY_ROLE` | varchar(16) | no | 'NONE' | Role within a redundant pool. Values: ACTIVE, STANDBY, LOAD_SHARED, NONE |
| `POOL_CODE` | varchar(50) | yes | NULL | Pool / set identifier (AMF set, MME pool) |
| `POOL_NAME` | varchar(100) | yes | NULL | Pool / set name |
| `MAX_SESSION_CAPACITY` | int unsigned | yes | NULL | Licensed subscriber / session capacity |
| `THROUGHPUT_CAPACITY_GBPS` | decimal(10,2) | yes | NULL | Rated throughput capacity, Gbps |

### NETWORK_ELEMENT_IP_MPLS_DETAIL

IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; Transport > IP/MPLS domain).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 9 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_IP_MPLS_DETAIL' | Constant NETWORK_ELEMENT_IP_MPLS_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `ROUTER_ROLE` | varchar(16) | no |  | Role in the IP/MPLS network. Values: PE, P, CE, RR, ASBR, AGGREGATION, ACCESS |
| `ROUTER_ID` | varchar(15) | yes | NULL | IGP / BGP router-id (IPv4 dotted) |
| `LOOPBACK_IP` | varchar(45) | yes | NULL | Loopback address (IPv4 or IPv6 text form) |
| `AS_NUMBER` | int unsigned | yes | NULL | Autonomous system number (2- or 4-byte) |
| `IGP_PROTOCOL` | varchar(8) | no | 'NONE' | Interior gateway protocol. Values: OSPF, ISIS, NONE |
| `MPLS_ENABLED` | tinyint(1) | no | '0' | 1 when MPLS forwarding is enabled |
| `LDP_ENABLED` | tinyint(1) | no | '0' | 1 when LDP label distribution is enabled |
| `RSVP_TE_ENABLED` | tinyint(1) | no | '0' | 1 when RSVP-TE is enabled |
| `SEGMENT_ROUTING_ENABLED` | tinyint(1) | no | '0' | 1 when segment routing (SR-MPLS / SRv6) is enabled |
| `BGP_ENABLED` | tinyint(1) | no | '0' | 1 when BGP runs on the node |
| `LABEL_RANGE_START` | int unsigned | yes | NULL | Start of the local MPLS label range (0-1048575) |
| `LABEL_RANGE_END` | int unsigned | yes | NULL | End of the local MPLS label range |
| `VRF_COUNT` | smallint unsigned | yes | NULL | VRFs configured, as reported at discovery (the instances are SERVICE_INSTANCE rows) |
| `QOS_PROFILE` | varchar(50) | yes | NULL | QoS policy applied on the node |
| `CORE_MTU` | smallint unsigned | yes | NULL | MTU on core-facing interfaces, bytes |
| `REDUNDANCY_ROLE` | varchar(16) | no | 'NONE' | Role within a redundant pair. Values: ACTIVE, STANDBY, LOAD_SHARED, NONE |
| `CHASSIS_REDUNDANCY` | varchar(16) | no | 'NONE' | Control-plane redundancy of the chassis. Values: NONE, DUAL_RE, DUAL_RE_ISSU |
| `BACKPLANE_CAPACITY_GBPS` | decimal(10,2) | yes | NULL | Backplane switching capacity, Gbps |

### NETWORK_ELEMENT_MICROWAVE_DETAIL

Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 2 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_MICROWAVE_DETAIL' | Constant NETWORK_ELEMENT_MICROWAVE_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `OUTDOOR_UNIT_MODEL` | varchar(100) | yes | NULL | Outdoor unit model |
| `INDOOR_UNIT_MODEL` | varchar(100) | yes | NULL | Indoor unit model |
| `ANTENNA_DIAMETER_M` | decimal(4,2) | yes | NULL | Dish diameter, metres |
| `ANTENNA_GAIN_DBI` | decimal(5,2) | yes | NULL | Antenna gain, dBi |
| `TRANSMIT_POWER_DBM` | decimal(5,2) | yes | NULL | Configured transmit power, dBm |
| `ATPC_ENABLED` | tinyint(1) | no | '0' | 1 when automatic transmit power control is on |
| `XPIC_ENABLED` | tinyint(1) | no | '0' | 1 when cross-polarisation interference cancellation is on |

### NETWORK_ELEMENT_OPTICAL_DETAIL

DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 9 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_OPTICAL_DETAIL' | Constant NETWORK_ELEMENT_OPTICAL_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `TRANSPORT_ROLE` | varchar(24) | no |  | Role in the optical layer. Values: ROADM, OTN_SWITCH, DWDM_TERMINAL, MUXPONDER, TRANSPONDER, OPTICAL_AMPLIFIER |
| `OPTICAL_BAND` | varchar(16) | yes | NULL | Optical band in use. Values: C_BAND, L_BAND, O_BAND, S_BAND, C_AND_L_BAND |
| `ROADM_DEGREES` | tinyint unsigned | yes | NULL | Degrees of a ROADM node |
| `WAVELENGTH_CAPACITY` | smallint unsigned | yes | NULL | Wavelength channels the node supports |
| `WAVELENGTHS_IN_USE` | smallint unsigned | yes | NULL | Channels in use as reported by the EMS at last discovery (the services are SERVICE_INSTANCE WAVELENGTH rows) |
| `CHANNEL_SPACING_GHZ` | decimal(6,2) | yes | NULL | ITU grid spacing, GHz (50, 100, flex) |
| `LINE_RATE_GBPS` | decimal(10,2) | yes | NULL | Per-wavelength line rate, Gbps |
| `MAX_CAPACITY_GBPS` | decimal(10,2) | yes | NULL | Aggregate capacity of the node, Gbps |
| `AMPLIFIER_TYPE` | varchar(8) | no | 'NONE' | Amplification technology. Values: EDFA, RAMAN, HYBRID, NONE |
| `PROTECTION_SCHEME` | varchar(24) | no | 'NONE' | Optical-layer protection. Values: NONE, 1_PLUS_1, N_PLUS_1, RING, MESH_RESTORATION |

### NETWORK_ELEMENT_PON_DETAIL

PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade); `PARENT_OLT_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `PARENT_OLT_NETWORK_ELEMENT_ID_FK, SERVING_PON_PORT_ID_FK` → `PORT`
- **Constraints**: 4 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_PON_DETAIL' | Constant NETWORK_ELEMENT_PON_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `PON_TECHNOLOGY` | varchar(16) | no |  | PON generation. Values: GPON, EPON, XGPON, XGSPON, NGPON2, GFAST |
| `PARENT_OLT_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: the OLT serving this ONU / ONT; NULL on an OLT |
| `SERVING_PON_PORT_ID_FK` **FK** | int unsigned | yes | NULL | FK PORT.ID: the OLT PON port serving this ONU / ONT; must belong to PARENT_OLT_NETWORK_ELEMENT_ID_FK |
| `ONU_ID` | smallint unsigned | yes | NULL | ONU id on the PON (0-255) |
| `SPLIT_RATIO` | smallint unsigned | yes | NULL | 1:N split of the serving PON branch (32, 64, 128) |
| `PON_PORT_COUNT` | smallint unsigned | yes | NULL | PON ports on an OLT |
| `MAX_ONU_PER_PORT` | smallint unsigned | yes | NULL | ONUs supported per PON port on an OLT |
| `SUBSCRIBER_REFERENCE` | varchar(64) | yes | NULL | Subscriber / account reference in CRM or LCM (cross-module, not FK-enforced) |
| `SERVICE_PROFILE` | varchar(64) | yes | NULL | Service / bandwidth profile provisioned on the ONT |

### NETWORK_ELEMENT_POWER_DETAIL

Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility). Power unit proxied from Passive Inventory.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade); `POWER_UNIT_EXTERNAL_RESOURCE_ID_FK` → `EXTERNAL_RESOURCE`
- **Constraints**: 5 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_POWER_DETAIL' | Constant NETWORK_ELEMENT_POWER_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `POWER_NODE_TYPE` | varchar(24) | no |  | Kind of controller. Values: RECTIFIER_SYSTEM, SMART_PDU, UPS_CONTROLLER, SOLAR_CONTROLLER, GENSET_CONTROLLER, FUEL_SENSOR_UNIT, BATTERY_MONITOR |
| `POWER_UNIT_EXTERNAL_RESOURCE_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_RESOURCE.ID: proxy of the power plant unit this controller manages; the unit is owned by Passive Inventory |
| `MONITORING_PROTOCOL` | varchar(16) | yes | NULL | Protocol the controller is polled with. Values: SNMP, MODBUS, REST, PROPRIETARY |
| `NOMINAL_DC_VOLTAGE` | decimal(5,1) | yes | NULL | Nominal DC bus voltage (48.0) |
| `RATED_CAPACITY_KW` | decimal(7,2) | yes | NULL | Rated output capacity, kW |
| `DESIGN_BACKUP_MINUTES` | smallint unsigned | yes | NULL | Designed battery autonomy at full load, minutes |

### NETWORK_ELEMENT_RAN_DETAIL

RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 with NETWORK_ELEMENT).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `CONTROLLER_NETWORK_ELEMENT_ID_FK, CONTROLLER_NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade); `PRIMARY_PLMN_ID_FK` → `PLMN`
- **Constraints**: 8 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_RAN_DETAIL' | Constant NETWORK_ELEMENT_RAN_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `DEPLOYMENT_TYPE` | varchar(16) | no | 'MACRO' | Deployment of the node. Values: MACRO, SMALL_CELL, INDOOR, DAS, REPEATER |
| `ARCHITECTURE` | varchar(16) | yes | NULL | Deployment architecture. Values: INTEGRATED, SPLIT_CU_DU, CLOUD_RAN, OPEN_RAN |
| `NODE_ID` | int unsigned | yes | NULL | BTS / NodeB id, eNB id (20 bit) or gNB id (22-32 bit) within the PLMN |
| `GNB_ID_LENGTH` | tinyint unsigned | yes | NULL | gNB id bit length (22-32); only for GNODEB / GNB_CU / GNB_DU |
| `PRIMARY_PLMN_ID_FK` **FK** | int unsigned | yes | NULL | FK PLMN.ID: primary serving PLMN (shared PLMNs per cell are RADIO_CELL_PLMN) |
| `CONTROLLER_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: controlling node (BSC for a BTS, RNC for a NodeB, gNB-CU for a gNB-DU) |
| `CONTROLLER_NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | yes | NULL | Copy of the controller NETWORK_ELEMENT_TYPE, FK-bound; must be BSC, RNC or GNB_CU |
| `CORE_POOL` | varchar(64) | yes | NULL | MME / AMF pool the node is homed to |
| `SYNC_SOURCE` | varchar(16) | yes | NULL | Timing source. Values: GPS, PTP, SYNC_E, NTP, NONE |
| `BACKHAUL_TYPE` | varchar(16) | yes | NULL | Backhaul medium. Values: FIBER, MICROWAVE, IP_MPLS_VPN, LEASED_LINE, SATELLITE |
| `MAX_CELLS` | smallint unsigned | yes | NULL | Licensed cell capacity of the node |
| `EMS_LIVE_DATE` | date | yes | NULL | Date the node went live in the EMS |
| `PLATFORM_ON_AIR_DATE` | date | yes | NULL | Date the platform (BBU / site) went on air |

### NETWORK_ELEMENT_SECURITY_DETAIL

Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 6 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_SECURITY_DETAIL' | Constant NETWORK_ELEMENT_SECURITY_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `SECURITY_ROLE` | varchar(16) | no |  | Security function. Values: FIREWALL, IDS, IPS, DDOS_SCRUBBER, VPN_CONCENTRATOR, WAF, NAC |
| `DEPLOYMENT_MODE` | varchar(16) | no | 'INLINE' | How the appliance sits in the traffic path. Values: INLINE, TAP, ROUTED, TRANSPARENT |
| `THROUGHPUT_CAPACITY_GBPS` | decimal(10,2) | yes | NULL | Rated inspection / forwarding throughput, Gbps |
| `MAX_CONCURRENT_SESSIONS` | int unsigned | yes | NULL | Rated concurrent session capacity |
| `POLICY_RULE_COUNT` | int unsigned | yes | NULL | Active policy rules, as reported at discovery |
| `ZONE_COUNT` | smallint unsigned | yes | NULL | Security zones configured |
| `HIGH_AVAILABILITY_MODE` | varchar(16) | no | 'STANDALONE' | Clustering mode. Values: STANDALONE, ACTIVE_PASSIVE, ACTIVE_ACTIVE |
| `HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: the paired appliance when HIGH_AVAILABILITY_MODE is not STANDALONE |
| `SIGNATURE_VERSION` | varchar(50) | yes | NULL | Loaded IPS / anti-malware signature version |
| `LAST_SIGNATURE_UPDATE_TIME` | datetime(3) | yes | NULL | When the signature database was last updated (UTC) |

### NETWORK_ELEMENT_SERVER_DETAIL

Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domains).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `CLOUD_CLUSTER_ID_FK` → `CLOUD_CLUSTER`; `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 4 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_SERVER_DETAIL' | Constant NETWORK_ELEMENT_SERVER_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `SERVER_ROLE` | varchar(16) | no |  | Role of the host. Values: COMPUTE, STORAGE, CONTROLLER, MANAGEMENT, BARE_METAL |
| `HYPERVISOR` | varchar(16) | no | 'NONE' | Virtualisation platform on the host. Values: KVM, VMWARE, HYPERV, KUBERNETES, NONE |
| `CLOUD_CLUSTER_ID_FK` **FK** | int unsigned | yes | NULL | FK CLOUD_CLUSTER.ID: cluster the host is a member of |
| `CPU_SOCKETS` | tinyint unsigned | yes | NULL | Populated CPU sockets |
| `CPU_CORES` | smallint unsigned | yes | NULL | Physical CPU cores in total |
| `MEMORY_GB` | smallint unsigned | yes | NULL | Installed memory, GB |
| `STORAGE_GB` | int unsigned | yes | NULL | Local storage, GB |
| `GPU_COUNT` | tinyint unsigned | yes | NULL | Installed accelerators |
| `OS_TYPE` | varchar(32) | yes | NULL | Operating system family (the version is NETWORK_ELEMENT.OS_VERSION) |
| `BMC_IP` | varchar(45) | yes | NULL | Out-of-band management (BMC / iDRAC / iLO) address |

### NETWORK_ELEMENT_SWITCH_DETAIL

Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport / IP/MPLS / Core domains).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade)
- **Constraints**: 8 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_SWITCH_DETAIL' | Constant NETWORK_ELEMENT_SWITCH_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `SWITCH_ROLE` | varchar(16) | no |  | Role in the switched network. Values: ACCESS, DISTRIBUTION, CORE, TOP_OF_RACK, AGGREGATION |
| `SWITCH_LAYER` | varchar(8) | no | 'L2' | Forwarding layer. Values: L2, L3 |
| `STP_MODE` | varchar(8) | yes | NULL | Spanning-tree flavour. Values: STP, RSTP, MSTP, PVST, NONE |
| `STACK_ROLE` | varchar(16) | no | 'STANDALONE' | Stacking role. Values: STANDALONE, MASTER, MEMBER |
| `STACK_ID` | varchar(32) | yes | NULL | Stack / virtual-chassis identifier when stacked |
| `STACK_MEMBER_COUNT` | tinyint unsigned | yes | NULL | Members in the stack (on the master) |
| `MANAGEMENT_VLAN_ID` | smallint unsigned | yes | NULL | Management VLAN id (1-4094) |
| `POE_BUDGET_W` | smallint unsigned | yes | NULL | Total PoE budget, watts |
| `UPLINK_CAPACITY_GBPS` | decimal(8,2) | yes | NULL | Aggregate uplink capacity, Gbps |

### NETWORK_ELEMENT_TYPE

Device-type catalog: tab, the one detail table of the type, and whether it may be virtual.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CODE`); (`SORT_ORDER`); (`CODE`, `DETAIL_TABLE`)
- **Referenced by**: `NETWORK_ELEMENT_CORE_DETAIL`, `NETWORK_ELEMENT_IP_MPLS_DETAIL`, `NETWORK_ELEMENT_MICROWAVE_DETAIL`, `NETWORK_ELEMENT_OPTICAL_DETAIL`, `NETWORK_ELEMENT_PON_DETAIL`, `NETWORK_ELEMENT_POWER_DETAIL`, `NETWORK_ELEMENT_RAN_DETAIL`, `NETWORK_ELEMENT_SECURITY_DETAIL`, `NETWORK_ELEMENT_SERVER_DETAIL`, `NETWORK_ELEMENT_SWITCH_DETAIL`, `NETWORK_ELEMENT_TYPE_DOMAIN`, `NETWORK_ELEMENT_WIFI_DETAIL`, `PRODUCT_MODEL`
- **Constraints**: 1 CHECK, 3 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `CODE` | varchar(24) | no |  | Type code, the value NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE carries |
| `NAME` | varchar(50) | no |  | Display name |
| `DETAIL_TABLE` | varchar(32) | yes | NULL | The one NETWORK_ELEMENT_*_DETAIL table for this type; NULL = none. Values: NETWORK_ELEMENT_RAN_DETAIL,NETWORK_ELEMENT_CORE_DETAIL,NETWORK_ELEMENT_IP_MPLS_DETAIL,NETWORK_ELEMENT_SWITCH_DETAIL,NETWORK_ELEMENT_SERVER_DETAIL,NETWORK_ELEMENT_OPTICAL_DETAIL,NETWORK_ELEMENT_MICROWAVE_DETAIL,NETWORK_ELEMENT_PON_DETAIL,NETWORK_ELEMENT_WIFI_DETAIL,NETWORK_ELEMENT_SECURITY_DETAIL,NETWORK_ELEMENT_POWER_DETAIL |
| `CAN_BE_VIRTUAL` | tinyint(1) | no | '0' | 1 when devices of this type may be virtual (VNF / CNF), e.g. CORE_NF, GNB_CU, GNB_DU, ROUTER |
| `SORT_ORDER` | tinyint unsigned | no |  | Display order of the types |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 1 when selectable for new records |

### NETWORK_ELEMENT_TYPE_DOMAIN

Allowed (device type, network domain) pairs; the FK target that keeps every device in a domain its type covers. Seeded; global.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`NETWORK_ELEMENT_TYPE_CODE`, `DOMAIN_ID_FK`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`; `NETWORK_ELEMENT_TYPE_CODE` → `NETWORK_ELEMENT_TYPE`
- **Referenced by**: `NETWORK_ELEMENT`
- **Constraints**: 0 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `NETWORK_ELEMENT_TYPE_CODE` **FK** | varchar(24) | no |  | FK NETWORK_ELEMENT_TYPE.CODE |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: a domain this type may be filed under (a child domain such as IP/MPLS is listed explicitly) |

### NETWORK_ELEMENT_WIFI_DETAIL

WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, access radio).

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`)
- **References**: `NETWORK_ELEMENT_TYPE, DETAIL_TABLE` → `NETWORK_ELEMENT_TYPE`; `NETWORK_ELEMENT_ID_FK, NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT` (cascade); `WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`
- **Constraints**: 12 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | no |  | FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1) |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | no |  | Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE) |
| `DETAIL_TABLE` **FK** | varchar(32) | no | 'NETWORK_ELEMENT_WIFI_DETAIL' | Constant NETWORK_ELEMENT_WIFI_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted |
| `WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID: the WLAN controller managing this AP; NULL on a controller or an autonomous AP |
| `ACCESS_POINT_GROUP` | varchar(64) | yes | NULL | AP group / site tag on the controller |
| `ACCESS_POINT_MODE` | varchar(16) | no | 'LOCAL' | Operating mode of an AP. Values: LOCAL, FLEXCONNECT, MESH, MONITOR, SNIFFER |
| `MESH_ROLE` | varchar(8) | no | 'NONE' | Role in a mesh. Values: ROOT, MESH_AP, NONE |
| `PRIMARY_SSID` | varchar(32) | yes | NULL | Primary SSID broadcast (802.11 limit 32 bytes) |
| `SSID_VLAN_ID` | smallint unsigned | yes | NULL | VLAN id mapped to the primary SSID (1-4094) |
| `WIFI_STANDARD` | varchar(16) | yes | NULL | Highest standard supported. Values: 802_11N, 802_11AC, 802_11AX, 802_11BE |
| `RADIO_BANDS` | varchar(16) | yes | NULL | Radio bands in use. Values: 2_4GHZ, 5GHZ, 6GHZ, DUAL_BAND, TRI_BAND |
| `CHANNEL` | tinyint unsigned | yes | NULL | Configured channel number (6 GHz channels go up to 233) |
| `CHANNEL_WIDTH_MHZ` | smallint unsigned | yes | NULL | Channel width, MHz (20, 40, 80, 160, 320) |
| `TRANSMIT_POWER_DBM` | decimal(5,2) | yes | NULL | Configured transmit power, dBm |
| `SECURITY_MODE` | varchar(24) | no | 'WPA2_ENTERPRISE' | Wireless security. Values: OPEN, WEP, WPA2_PSK, WPA2_ENTERPRISE, WPA3_PSK, WPA3_ENTERPRISE |
| `AUTHENTICATION_TYPE` | varchar(16) | no | 'RADIUS' | Client authentication. Values: RADIUS, PSK, 802_1X, MAC_FILTER, NONE |
| `POE_LEVEL` | tinyint unsigned | yes | NULL | IEEE 802.3 PoE type supplied (0-8) |
| `MAX_CLIENTS` | smallint unsigned | yes | NULL | Client association limit |
| `COVERAGE_RADIUS_M` | decimal(6,2) | yes | NULL | Designed coverage radius, metres |
| `MOUNTING_TYPE` | varchar(8) | yes | NULL | Mounting. Values: CEILING, WALL, POLE, DESK |
| `DEPLOYMENT_TYPE` | varchar(16) | no | 'ENTERPRISE' | Deployment context. Values: INDOOR, OUTDOOR, PUBLIC_HOTSPOT, ENTERPRISE |

### NETWORK_FUNCTION_TYPE

Core / IMS / CS network-function type catalog.

- **Module / group**: Inventory · Network element and its type-specific detail tables
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `NETWORK_ELEMENT_CORE_DETAIL`
- **Constraints**: 1 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `CODE` | varchar(16) | no |  | NF code (AMF, UPF, P_CSCF, SEPP ...) |
| `NAME` | varchar(80) | no |  | Display name (Access and Mobility Management Function) |
| `CORE_SEGMENT` | varchar(24) | no |  | Segment the NF belongs to. Values: EPC, 5GC, IMS, CS_CORE, COMMON |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (Core) |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 1 when selectable for new records |

### RELATIONSHIP_RULE

Allowed relationship triples between resource types.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **Unique**: (`RELATIONSHIP_TYPE`, `FROM_RESOURCE_TYPE`, `TO_RESOURCE_TYPE`)
- **References**: `FROM_RESOURCE_TYPE` → `RESOURCE_TYPE`; `RELATIONSHIP_TYPE` → `RELATIONSHIP_TYPE`; `TO_RESOURCE_TYPE` → `RESOURCE_TYPE`
- **Referenced by**: `RESOURCE_RELATIONSHIP`
- **Constraints**: 0 CHECK, 3 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `RELATIONSHIP_TYPE` **FK** | varchar(24) | no |  | FK RELATIONSHIP_TYPE.CODE |
| `FROM_RESOURCE_TYPE` **FK** | varchar(24) | no |  | FK RESOURCE_TYPE.CODE: type of the dependent (FROM) resource |
| `TO_RESOURCE_TYPE` **FK** | varchar(24) | no |  | FK RESOURCE_TYPE.CODE: type of the resource depended on (TO) |

### RELATIONSHIP_TYPE

Kind of cross-domain resource relationship.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `CODE`
- **Referenced by**: `RELATIONSHIP_RULE`
- **Constraints**: 0 CHECK, 0 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `CODE` **PK** | varchar(24) | no |  | Relationship code |
| `NAME` | varchar(64) | no |  | Forward wording (is carried by) |
| `INVERSE_NAME` | varchar(64) | no |  | Inverse wording (carries) |
| `IS_IMPACTING` | tinyint(1) | no | '1' | 1 when a fault on the TO resource impacts the FROM resource (impact analysis follows it) |
| `IS_ACYCLIC` | tinyint(1) | no | '1' | 1 when the relationship may not form a cycle (checked by the application) |
| `IS_ORDERED` | tinyint(1) | no | '0' | 1 when SEQUENCE_NUMBER orders several TO resources (a path of hops) |

### RESOURCE

Supertype row of every inventory object.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **References**: `RESOURCE_TYPE` → `RESOURCE_TYPE`
- **Referenced by**: `ANTENNA`, `CLOUD_CLUSTER`, `EQUIPMENT_COMPONENT`, `EXTERNAL_RESOURCE`, `IP_SUBNET`, `LINK`, `NETWORK_ELEMENT`, `NETWORK_SLICE`, `PORT`, `RADIO_CELL`, `RADIO_SECTOR`, `RECONCILIATION_EXCEPTION`, `RECONCILIATION_RESULT`, `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_EXTERNAL_REFERENCE`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_RELATIONSHIP`, `RESOURCE_TECHNOLOGY`, `SERVICE_INSTANCE`, `SITE`, `VLAN`, `VRF`
- **Constraints**: 0 CHECK, 3 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK (BIGINT: aggregates ports, components and every other type) |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_TYPE` **FK** | varchar(24) | no |  | FK RESOURCE_TYPE.CODE; never changes after insert |

### RESOURCE_ASSET

Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by resource. Kept in Inventory pending validation: PO / cost columns may move to the Open / CoPEX module.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`); (`CUSTOMER_ID`, `ASSET_TAG`)
- **References**: `RESOURCE_ID_FK` → `RESOURCE` (cascade)
- **Constraints**: 4 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: device, passive asset, power unit, antenna, rack ... |
| `ASSET_TAG` | varchar(40) | yes | NULL | Asset tag / barcode |
| `PURCHASE_ORDER_NUMBER` | varchar(40) | yes | NULL | Purchase order |
| `PROJECT_NUMBER` | varchar(40) | yes | NULL | Project |
| `PURCHASE_DATE` | date | yes | NULL | Purchase date |
| `PURCHASE_COST` | decimal(14,2) | yes | NULL | Purchase cost |
| `CURRENCY_CODE` | char(3) | yes | NULL | ISO 4217 currency of PURCHASE_COST |
| `OWNERSHIP` | varchar(24) | no | 'OWNED' | Ownership model. Values: OWNED, LEASED, RENTED, IRU, VENDOR_MANAGED, CUSTOMER_PROVIDED |
| `WARRANTY_START_DATE` | date | yes | NULL | Warranty start |
| `WARRANTY_END_DATE` | date | yes | NULL | Warranty end |
| `MAINTENANCE_CONTRACT_VENDOR` | varchar(100) | yes | NULL | Annual maintenance / service contractor (was also POWER_UNIT.CONTRACTOR) |
| `MAINTENANCE_CONTRACT_END_DATE` | date | yes | NULL | AMC end |
| `LICENSE_EXPIRY_DATE` | date | yes | NULL | Software licence expiry |

### RESOURCE_ATTRIBUTE

Value of an extensible attribute on one resource, typed by its definition.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `ATTRIBUTE_DEFINITION_ID_FK`)
- **References**: `ATTRIBUTE_DEFINITION_ID_FK, RESOURCE_TYPE, DATA_TYPE` → `ATTRIBUTE_DEFINITION`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade)
- **Constraints**: 2 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID |
| `RESOURCE_TYPE` **FK** | varchar(24) | no |  | Copy of the resource type, FK-bound to both RESOURCE and the definition |
| `ATTRIBUTE_DEFINITION_ID_FK` **FK** | int unsigned | no |  | FK ATTRIBUTE_DEFINITION.ID |
| `DATA_TYPE` **FK** | varchar(8) | no |  | Copy of the definition data type, FK-bound |
| `VALUE_STRING` | varchar(255) | yes | NULL | Value when DATA_TYPE = STRING |
| `VALUE_NUMBER` | decimal(20,6) | yes | NULL | Value when DATA_TYPE = NUMBER |
| `VALUE_BOOLEAN` | tinyint(1) | yes | NULL | Value when DATA_TYPE = BOOLEAN |
| `VALUE_DATE` | date | yes | NULL | Value when DATA_TYPE = DATE |

### RESOURCE_EXTERNAL_REFERENCE

Id of an inventory resource in another system; one per system, at most one system of record.

- **Module / group**: Inventory · Resource supertype and its satellites · Written by integration sync
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `EXTERNAL_SYSTEM_ID_FK`); (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`, `EXTERNAL_ID`); (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `SYSTEM_OF_RECORD_FLAG`)
- **References**: `EXTERNAL_SYSTEM_ID_FK` → `EXTERNAL_SYSTEM`; `RESOURCE_ID_FK` → `RESOURCE` (cascade)
- **Constraints**: 1 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID |
| `EXTERNAL_SYSTEM_ID_FK` **FK** | int unsigned | no |  | FK EXTERNAL_SYSTEM.ID |
| `EXTERNAL_ID` | varchar(128) | no |  | Id of the resource in that system |
| `IS_SYSTEM_OF_RECORD` | tinyint(1) | no | '0' | 1 when that system is authoritative for this resource (at most one) |
| `SYSTEM_OF_RECORD_FLAG` | tinyint(1) | yes |  | *(generated)* Derived: keeps the system of record unique per resource |
| `SYNC_STATUS` | varchar(16) | no | 'IN_SYNC' | Last sync outcome. Values: IN_SYNC, PENDING, FAILED, NOT_FOUND |
| `LAST_SYNC_TIME` | datetime(3) | yes | NULL | Last sync (UTC) |

### RESOURCE_FIELD_PROVENANCE

Per-field provenance of any resource's golden record.

- **Module / group**: Inventory · Resource supertype and its satellites · Written by Discovery pipelines
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `FIELD_CODE`)
- **References**: `EXTERNAL_SYSTEM_ID_FK` → `EXTERNAL_SYSTEM`; `FIELD_CODE` → `RECONCILIATION_FIELD`; `RESOURCE_ID_FK` → `RESOURCE` (cascade)
- **Constraints**: 2 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID |
| `FIELD_CODE` **FK** | varchar(40) | no |  | FK RECONCILIATION_FIELD.CODE |
| `FIELD_VALUE` | varchar(255) | yes | NULL | Value that source supplied |
| `SOURCE` | varchar(32) | no |  | Kind of source. Values: SCOPE, DERIVED_SNMP_OID, DEVICE_COLLECTOR, HARDWARE_COLLECTOR, LINK_COLLECTOR, SERVICE_COLLECTOR, EXTERNAL_SYSTEM, MANUAL, WORK_ORDER, PLANNED_CIQ |
| `EXTERNAL_SYSTEM_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_SYSTEM.ID when SOURCE = EXTERNAL_SYSTEM (which EMS / CMDB / ERP) |
| `SOURCE_REFERENCE` | varchar(64) | yes | NULL | Work order / run reference behind the value |
| `OBSERVED_TIME` | datetime(3) | no |  | When the source supplied it (UTC) |
| `IS_CONFIRMED` | tinyint(1) | no | '1' | 0 when the source disagrees with the golden value |

### RESOURCE_RELATIONSHIP

Typed dependency between two resources that no explicit FK models; FROM depends on TO.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `FROM_RESOURCE_ID_FK`, `RELATIONSHIP_TYPE`, `TO_RESOURCE_ID_FK`, `SEQUENCE_NUMBER`, `ACTIVE_FLAG`)
- **References**: `EXTERNAL_SYSTEM_ID_FK` → `EXTERNAL_SYSTEM`; `FROM_RESOURCE_ID_FK, FROM_RESOURCE_TYPE` → `RESOURCE` (cascade); `RELATIONSHIP_TYPE, FROM_RESOURCE_TYPE, TO_RESOURCE_TYPE` → `RELATIONSHIP_RULE`; `TO_RESOURCE_ID_FK, TO_RESOURCE_TYPE` → `RESOURCE` (cascade)
- **Constraints**: 5 CHECK, 6 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RELATIONSHIP_TYPE` **FK** | varchar(24) | no |  | RELATIONSHIP_TYPE.CODE; FK-checked with both types against RELATIONSHIP_RULE |
| `FROM_RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: the dependent resource |
| `FROM_RESOURCE_TYPE` **FK** | varchar(24) | no |  | Copy of the FROM resource type, FK-bound to RESOURCE |
| `TO_RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: the resource depended on |
| `TO_RESOURCE_TYPE` **FK** | varchar(24) | no |  | Copy of the TO resource type, FK-bound to RESOURCE |
| `SEQUENCE_NUMBER` | smallint unsigned | no | '0' | Hop order for ordered types (a path); 0 when unordered |
| `RECORD_SOURCE` | varchar(16) | no |  | How the row entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC |
| `EXTERNAL_SYSTEM_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_SYSTEM.ID that supplied it (EXTERNAL_SYNC / EMS) |
| `RECORD_STATE` | varchar(16) | no | 'ACTIVE' | INACTIVE = no longer true. Values: ACTIVE, INACTIVE |
| `INACTIVE_TIME` | datetime(3) | yes | NULL | When it went inactive (UTC) |
| `ACTIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows |

### RESOURCE_TECHNOLOGY

Technologies a resource supports; replaces single-valued technology columns.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `TECHNOLOGY_ID_FK`)
- **References**: `RESOURCE_ID_FK` → `RESOURCE` (cascade); `TECHNOLOGY_ID_FK` → `TECHNOLOGY`
- **Constraints**: 1 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID |
| `TECHNOLOGY_ID_FK` **FK** | smallint unsigned | no |  | FK TECHNOLOGY.ID |
| `NR_MODE` | varchar(4) | yes | NULL | For NR only: non-standalone or standalone. Values: NSA, SA |

### RESOURCE_TYPE

Type of every RESOURCE row with inventory category and layer.

- **Module / group**: Inventory · Resource supertype and its satellites
- **Primary key**: `CODE`
- **Referenced by**: `ATTRIBUTE_DEFINITION`, `RECONCILIATION_FIELD`, `RELATIONSHIP_RULE`, `RESOURCE`
- **Constraints**: 2 CHECK, 0 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `CODE` **PK** | varchar(24) | no |  | Type code (SITE, PHYSICAL_NE, VIRTUAL_NE, PORT, LINK, RADIO_CELL, EXTERNAL_RESOURCE ...) |
| `NAME` | varchar(50) | no |  | Display name |
| `INVENTORY_CATEGORY` | varchar(16) | no |  | Inventory view the type belongs to. Values: FACILITY, ACTIVE, PASSIVE, LOGICAL, CONNECTIVITY, SERVICE, EXTERNAL |
| `RESOURCE_LAYER` | varchar(8) | no |  | Resource layer for physical -> logical -> service analysis. Values: PHYSICAL, LOGICAL, SERVICE, EXTERNAL |
| `SUBTYPE_TABLE` | varchar(32) | no |  | Table holding the type rows (SITE, NETWORK_ELEMENT, PORT ...) |

### SITE

A location that hosts equipment (central office, POP, tower, data centre). Geography is held once (lowest level only); lat/long once.

- **Module / group**: Inventory · Location
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`); (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `OPERATIONAL_AREA_ID_FK` → `OPERATIONAL_AREA`; `PARENT_SITE_ID_FK` → `SITE`; `GEOGRAPHY_LEVEL4_ID_FK` → `GEOGRAPHY_LEVEL4`; `RESOURCE_ID_FK, RESOURCE_TYPE` → `RESOURCE` (cascade); `SITE_TYPE_ID_FK` → `SITE_TYPE`
- **Referenced by**: `ANTENNA`, `CLOUD_CLUSTER`, `IP_SUBNET`, `NETWORK_ELEMENT`, `NETWORK_ELEMENT_MOVEMENT`, `RADIO_SECTOR`, `SCAN_JOB_SCOPE`, `SITE_CONTACT`, `SITE_ISSUE`
- **Constraints**: 6 CHECK, 9 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(32) | no |  | Site / location id shown in the UI (BGLK-277, DEL-279) |
| `NAME` | varchar(150) | no |  | Site name |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | no |  | FK RESOURCE.ID: this row's supertype row (identity for relationships, external refs, attributes, reconciliation) |
| `RESOURCE_TYPE` **FK** | varchar(24) | no | 'SITE' | Constant SITE: FK-bound to RESOURCE so the supertype row is of this type |
| `SITE_TYPE_ID_FK` **FK** | smallint unsigned | no |  | FK SITE_TYPE.ID |
| `CATEGORY` | varchar(24) | no |  | Network tier of the site (Central / Regional / Edge). Values: CENTRAL, REGIONAL, EDGE, ACCESS |
| `STATUS` | varchar(24) | no | 'PLANNED' | Site lifecycle status. Values: PLANNED, IN_PROGRESS, ON_AIR, FAILED, DECOMMISSIONED |
| `PARENT_SITE_ID_FK` **FK** | int unsigned | yes | NULL | FK SITE.ID: parent site (a POP inside a central office); NULL at the top |
| `GEOGRAPHY_LEVEL4_ID_FK` **FK** | int unsigned | no |  | FK GEOGRAPHY_LEVEL4.ID: lowest administrative area; levels 1-3 are derived through the chain by the API |
| `OPERATIONAL_AREA_ID_FK` **FK** | int unsigned | yes | NULL | FK OPERATIONAL_AREA.ID: lowest operational area that owns the site |
| `ADDRESS` | varchar(255) | yes | NULL | Street address |
| `POSTAL_CODE` | varchar(10) | yes | NULL | PIN / postal code |
| `LATITUDE` | decimal(9,6) | yes | NULL | Site latitude (WGS84) |
| `LONGITUDE` | decimal(9,6) | yes | NULL | Site longitude (WGS84) |
| `ENVIRONMENT` | varchar(8) | yes | NULL | Where the equipment sits (cell type is NETWORK_ELEMENT_RAN_DETAIL.DEPLOYMENT_TYPE, morphology is GEOGRAPHY_LEVEL4). Values: INDOOR, OUTDOOR, MIXED |
| `ROLLOUT_STAGE` | varchar(24) | yes | NULL | Rollout stage while the site is being built. Values: COMMISSIONED, UNDER_DEPLOYMENT, ATP_PENDING, INTEGRATION_PENDING, BLOCKED |
| `LANDLORD` | varchar(150) | yes | NULL | Landlord / property owner |
| `LEASE_END_DATE` | date | yes | NULL | Lease expiry; "lease expires within 30 days" risk is derived |
| `WORK_ORDER_REFERENCE` | varchar(40) | yes | NULL | Work order that created / last changed the site (external reference) |
| `ON_AIR_DATE` | date | yes | NULL | Date the site went on air |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### SITE_CONTACT

Site contact person. Phone and email are personal data: stored AES-encrypted.

- **Module / group**: Inventory · Location
- **Primary key**: `ID`
- **References**: `SITE_ID_FK` → `SITE` (cascade)
- **Constraints**: 3 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID |
| `CONTACT_ROLE` | varchar(24) | no |  | Role of the contact at the site. Values: SITE_OWNER, LANDLORD, FIELD_ENGINEER, SECURITY, OTHER |
| `CONTACT_NAME` | varchar(150) | no |  | Contact name |
| `PHONE_ENCRYPTED` | varbinary(256) | yes | NULL | AES-256-CBC(phone E.164) with PHONE_ENCRYPTION_IV |
| `PHONE_ENCRYPTION_IV` | varbinary(16) | yes | NULL | Per-row initialisation vector of PHONE_ENCRYPTED |
| `EMAIL_ENCRYPTED` | varbinary(512) | yes | NULL | AES-256-CBC(email) with EMAIL_ENCRYPTION_IV |
| `EMAIL_ENCRYPTION_IV` | varbinary(16) | yes | NULL | Per-row initialisation vector of EMAIL_ENCRYPTED |
| `ENCRYPTION_KEY_REFERENCE` | varchar(64) | yes | NULL | Vault key id used for PHONE_ENCRYPTED / EMAIL_ENCRYPTED |

### SITE_ISSUE

Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, Civil, Regulatory, Supply Chain, Commissioning).

- **Module / group**: Inventory · Location
- **Primary key**: `ID`
- **References**: `SITE_ID_FK` → `SITE` (cascade)
- **Constraints**: 3 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SITE_ID_FK` **FK** | int unsigned | no |  | FK SITE.ID |
| `ISSUE_KIND` | varchar(16) | no |  | BLOCKER stops rollout; RISK is a standing flag. Values: BLOCKER, RISK |
| `CATEGORY` | varchar(24) | no |  | Issue category. Values: LEASE_PROPERTY, POWER, FIBER_CONNECTIVITY, CIVIL_INFRASTRUCTURE, REGULATORY, SUPPLY_CHAIN, COMMISSIONING, CAPACITY |
| `REASON` | varchar(150) | no |  | Reason (Lease agreement expired, ATP pending ...) |
| `RAISED_TIME` | datetime(3) | no |  | When raised (UTC) |
| `RESOLVED_TIME` | datetime(3) | yes | NULL | When resolved (UTC); NULL = open |
| `OWNER_TEAM_REFERENCE` | varchar(64) | yes | NULL | Code of the User Management group that owns the resolution (reference without a foreign key) |

### SITE_TYPE

Site type (Central office, Regional hub, Edge, Tower, Data centre ...).

- **Module / group**: Inventory · Location
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **Referenced by**: `SITE`
- **Constraints**: 0 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `CODE` | varchar(32) | no |  | Site type code |
| `NAME` | varchar(100) | no |  | Display name |

---

## Discovery

### COLLECTOR

Collector node that executes scans (clr-blr-02, Collector-West).

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `SCAN_JOB`
- **Constraints**: 1 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(40) | no |  | Collector name |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | yes | NULL | FK DOMAIN.ID: domain it serves; NULL = any |
| `HOST_ADDRESS` | varchar(45) | yes | NULL | Collector address |
| `STATUS` | varchar(16) | no | 'OFFLINE' | Health, from check-ins. Values: ONLINE, HIGH_LATENCY, OFFLINE |
| `P95_RESPONSE_MS` | int unsigned | yes | NULL | p95 target response time, ms |
| `LAST_CHECKIN_TIME` | datetime(3) | yes | NULL | Last heartbeat (UTC) |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### CREDENTIAL_PROFILE

Named access profile used by scans (ro-inband-v3). Holds only a vault reference: the secret, SNMPv3 user and keys never enter this database.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`; `OPERATIONAL_AREA_ID_FK` → `OPERATIONAL_AREA`
- **Referenced by**: `SCAN_JOB`
- **Constraints**: 4 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(40) | no |  | Profile name |
| `ACCESS_PROTOCOL` | varchar(16) | no |  | Protocol the profile authenticates. Values: SNMP_V2C, SNMP_V3, NETCONF, SSH_CLI, TL1, REST |
| `ACCESS_MODE` | varchar(16) | no | 'READ_ONLY' | Access level. Values: READ_ONLY, READ_WRITE |
| `NETWORK_PATH` | varchar(16) | no | 'IN_BAND' | Management path. Values: IN_BAND, OUT_OF_BAND |
| `VAULT_REFERENCE` | varchar(200) | no |  | Vault path / id of the secret material (same pattern as the old SNMP_CREDENTIAL_REFERENCE) |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | yes | NULL | FK DOMAIN.ID: domain the profile is bound to; NULL = any |
| `OPERATIONAL_AREA_ID_FK` **FK** | int unsigned | yes | NULL | FK OPERATIONAL_AREA.ID: circle the profile is bound to; NULL = any |
| `EXPIRES_DATE` | date | yes | NULL | Credential expiry; expired profiles are the AUTH failure root cause |
| `STATUS` | varchar(16) | no | 'HEALTHY' | Profile health. Values: HEALTHY, WARNING, EXPIRED |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### DISCOVERY_STEP_DEFINITION

Collector step of a domain family, in execution order (Transport: device, hardware, lldp, ospf, bgp, service ...). FK to DOMAIN added (missing in v4).

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`DOMAIN_ID_FK`, `CODE`); (`DOMAIN_ID_FK`, `SEQUENCE_NUMBER`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `SCAN_STEP_RESULT`
- **Constraints**: 1 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `CODE` | varchar(32) | no |  | Step key (device, hardware, lldp, radio, registration ...) |
| `NAME` | varchar(64) | no |  | Display name |
| `SEQUENCE_NUMBER` | smallint unsigned | no |  | Order in the chain; a failed step skips the later dependent steps |
| `PROTOCOL` | varchar(16) | no |  | Protocol used. Values: ICMP, SNMP_V2C, SNMP_V3, NETCONF, CLI, LLDP_CDP, TL1, REST, X2_XN_ANR |
| `WRITES` | varchar(255) | no |  | What the step writes to inventory (NE identity, hardware, adjacencies, services) |

### SCAN_JOB

Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE).

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `COLLECTOR_ID_FK` → `COLLECTOR`; `CREDENTIAL_PROFILE_ID_FK` → `CREDENTIAL_PROFILE`; `DOMAIN_ID_FK` → `DOMAIN`; `EXTERNAL_SYSTEM_ID_FK` → `EXTERNAL_SYSTEM`; `OPERATIONAL_AREA_ID_FK` → `OPERATIONAL_AREA`
- **Referenced by**: `SCAN_JOB_SCOPE`, `SCAN_RUN`, `SCAN_TARGET`
- **Constraints**: 6 CHECK, 8 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(40) | no |  | Job id |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `SOURCE_KIND` | varchar(16) | no | 'COLLECTOR' | How the network is read. Values: COLLECTOR, EXTERNAL_SYSTEM |
| `COLLECTOR_ID_FK` **FK** | int unsigned | yes | NULL | FK COLLECTOR.ID when SOURCE_KIND = COLLECTOR |
| `CREDENTIAL_PROFILE_ID_FK` **FK** | int unsigned | yes | NULL | FK CREDENTIAL_PROFILE.ID when SOURCE_KIND = COLLECTOR |
| `EXTERNAL_SYSTEM_ID_FK` **FK** | int unsigned | yes | NULL | FK EXTERNAL_SYSTEM.ID (EMS / NMS / controller API) when SOURCE_KIND = EXTERNAL_SYSTEM |
| `OPERATIONAL_AREA_ID_FK` **FK** | int unsigned | yes | NULL | FK OPERATIONAL_AREA.ID: area the job covers |
| `SCHEDULE_KIND` | varchar(16) | no |  | Schedule type. Values: CONTINUOUS, INTERVAL, DAILY, WEEKLY, CRON, ON_DEMAND |
| `INTERVAL_MINUTES` | int unsigned | yes | NULL | Sweep / interval period for CONTINUOUS and INTERVAL |
| `CRON_EXPRESSION` | varchar(64) | yes | NULL | Cron for DAILY / WEEKLY / CRON (0 2 * * 0 = Weekly Sun 02:00) |
| `SCHEDULE_STATE` | varchar(16) | no | 'LIVE' | HELD keeps the cadence but does not run until released. Values: LIVE, HELD |
| `HELD_REASON` | varchar(200) | yes | NULL | Why the job is held |
| `NEXT_RUN_TIME` | datetime(3) | yes | NULL | Next scheduled run (UTC); overdue is derived from cadence + grace |
| `MAX_CRAWL_DEPTH` | tinyint unsigned | yes | NULL | Topology crawl depth for SEED scopes |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### SCAN_JOB_SCOPE

One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF set.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SCAN_JOB_ID_FK`, `SCOPE_KIND`, `SCOPE_VALUE`)
- **References**: `SCAN_JOB_ID_FK` → `SCAN_JOB` (cascade); `SITE_ID_FK` → `SITE`
- **Constraints**: 2 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_JOB_ID_FK` **FK** | int unsigned | no |  | FK SCAN_JOB.ID |
| `SCOPE_KIND` | varchar(16) | no |  | Scope kind. Values: CIDR, SEED, SITE, NF_SET |
| `SCOPE_VALUE` | varchar(100) | no |  | 172.31.31.0/24, 192.168.10.235, BLR-EAST, AMF/UPF |
| `SITE_ID_FK` **FK** | int unsigned | yes | NULL | FK SITE.ID when SCOPE_KIND = SITE |

### SCAN_RUN

One execution of a scan job. Target counts are derived from SCAN_RUN_TARGET by the API.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SCAN_JOB_ID_FK`, `RUN_NUMBER`)
- **References**: `SCAN_JOB_ID_FK` → `SCAN_JOB`
- **Referenced by**: `RECONCILIATION_RUN`, `SCAN_RUN_TARGET`
- **Constraints**: 3 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_JOB_ID_FK` **FK** | int unsigned | no |  | FK SCAN_JOB.ID |
| `RUN_NUMBER` | int unsigned | no |  | Run number within the job (4412) |
| `TRIGGER_SOURCE` | varchar(16) | no | 'SCHEDULER' | What started the run. Values: SCHEDULER, MANUAL, API, RETRY |
| `STATUS` | varchar(32) | no | 'RUNNING' | Run state. Values: RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED, NO_ADAPTER |
| `STARTED_TIME` | datetime(3) | no |  | Start (UTC) |
| `ENDED_TIME` | datetime(3) | yes | NULL | End (UTC); a cycle must close within the 6 h cycle SLA |
| `DURATION_MS` | int unsigned | yes |  | *(generated)* Derived; never typed (INT: a run is bounded by the 6 h cycle SLA, far below the 49-day INT limit) |

### SCAN_RUN_TARGET

Result of one target in one run: status, outcome, failure reason, identity match (rule + confidence).

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SCAN_RUN_ID_FK`, `SCAN_TARGET_ID_FK`)
- **References**: `MATCHED_NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `SCAN_RUN_ID_FK` → `SCAN_RUN` (cascade); `SCAN_TARGET_ID_FK` → `SCAN_TARGET`
- **Referenced by**: `SCAN_STEP_RESULT`
- **Constraints**: 8 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_RUN_ID_FK` **FK** | int unsigned | no |  | FK SCAN_RUN.ID |
| `SCAN_TARGET_ID_FK` **FK** | int unsigned | no |  | FK SCAN_TARGET.ID |
| `STATUS` | varchar(16) | no |  | Derived from the step chain. Values: SUCCESS, PARTIAL, FAILED |
| `TARGET_OUTCOME` | varchar(24) | no |  | Reconciliation-facing outcome. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER |
| `FAILURE_REASON` | varchar(24) | yes | NULL | Why it failed; drives the pipeline funnel and root-cause groups. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP |
| `FAILURE_STAGE` | varchar(16) | yes | NULL | Pipeline stage where it dropped. Values: SCOPE, REACHABILITY, CREDENTIAL, COLLECT, PARSE, IDENTITY, STORE |
| `MATCHED_NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID the run matched |
| `MATCH_RULE` | varchar(24) | yes | NULL | Identity rule that matched, in priority order. Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP, EXTERNAL_ID, CELL_IDENTITY |
| `MATCH_CONFIDENCE` | varchar(16) | yes | NULL | Confidence of the match. Values: EXACT, STRONG, WEAK |
| `DURATION_MS` | int unsigned | yes | NULL | Time spent on the target, ms |
| `NOTE` | varchar(255) | yes | NULL | Run note (OS version 21.2R3-S8.4 -> S8.5, accepted network) |

### SCAN_STEP_PAYLOAD

Raw request / response of a step, AES-encrypted (device output can carry configuration and customer data). Split out so hot tables stay narrow; purged by retention.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SCAN_STEP_RESULT_ID_FK`, `KIND`)
- **References**: `SCAN_STEP_RESULT_ID_FK` → `SCAN_STEP_RESULT` (cascade)
- **Constraints**: 1 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_STEP_RESULT_ID_FK` **FK** | bigint unsigned | no |  | FK SCAN_STEP_RESULT.ID |
| `KIND` | varchar(16) | no |  | Which capture. Values: REQUEST, RESPONSE |
| `CONTENT_ENCRYPTED` | mediumblob | no |  | AES-256-CBC(text) with CONTENT_ENCRYPTION_IV; secrets and community strings redacted before encryption |
| `CONTENT_ENCRYPTION_IV` | varbinary(16) | no |  | Per-row initialisation vector |
| `CONTENT_BYTES` | int unsigned | no |  | Plaintext byte length |
| `CONTENT_SHA256` | binary(32) | no |  | SHA-256 of the plaintext |
| `ENCRYPTION_KEY_REFERENCE` | varchar(64) | no |  | Vault key id |
| `PURGE_AFTER` | datetime(3) | no |  | Retention deadline |

### SCAN_STEP_RESULT

One collector step for one target in one run (the transcript line): state, timing, bytes, what it wrote.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SCAN_RUN_TARGET_ID_FK`, `DISCOVERY_STEP_DEFINITION_ID_FK`)
- **References**: `DISCOVERY_STEP_DEFINITION_ID_FK` → `DISCOVERY_STEP_DEFINITION`; `SCAN_RUN_TARGET_ID_FK` → `SCAN_RUN_TARGET` (cascade)
- **Referenced by**: `SCAN_STEP_PAYLOAD`
- **Constraints**: 3 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_RUN_TARGET_ID_FK` **FK** | bigint unsigned | no |  | FK SCAN_RUN_TARGET.ID |
| `DISCOVERY_STEP_DEFINITION_ID_FK` **FK** | smallint unsigned | no |  | FK DISCOVERY_STEP_DEFINITION.ID |
| `STATE` | varchar(24) | no |  | Step state. Values: PASSED, FAILED, SKIPPED, NOT_APPLICABLE, WAITING, RUNNING |
| `STARTED_TIME` | datetime(3) | yes | NULL | Start (UTC) |
| `DURATION_MS` | int unsigned | yes | NULL | Duration, ms |
| `RESPONSE_BYTES` | int unsigned | yes | NULL | Bytes received |
| `WROTE_SUMMARY` | varchar(255) | yes | NULL | What went into inventory (serial JN1236F87AFB, 51 hardware components) |
| `FAILURE_REASON` | varchar(24) | yes | NULL | Why the step failed. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP |
| `SUGGESTED_ACTION` | varchar(255) | yes | NULL | Next action (Retry at 8000 ms) |

### SCAN_TARGET

Address a job polls (gateway IP). Identity is the IP, not the hostname (109 targets have none). Carries the latest outcome as a cache.

- **Module / group**: Discovery · Discovery execution
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `IP_ADDRESS_BINARY`, `SCAN_JOB_ID_FK`); (`CUSTOMER_ID`, `EXTERNAL_TARGET_ID`, `SCAN_JOB_ID_FK`)
- **References**: `NETWORK_ELEMENT_ID_FK` → `NETWORK_ELEMENT`; `OBSERVED_VENDOR_ID_FK` → `VENDOR`; `SCAN_JOB_ID_FK` → `SCAN_JOB`
- **Referenced by**: `RECONCILIATION_EXCEPTION`, `RECONCILIATION_RESULT`, `SCAN_RUN_TARGET`
- **Constraints**: 4 CHECK, 8 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SCAN_JOB_ID_FK` **FK** | int unsigned | no |  | FK SCAN_JOB.ID |
| `IP_ADDRESS` | varchar(45) | yes | NULL | Target address (collector sources) |
| `IP_ADDRESS_BINARY` | varbinary(16) | yes |  | *(generated)* Derived canonical binary address; target uniqueness uses it |
| `EXTERNAL_TARGET_ID` | varchar(128) | yes | NULL | Object id in the source system (EMS / NMS NE id) for API sources |
| `HOST_NAME` | varchar(253) | yes | NULL | sysName as last reported; NULL when unresolved |
| `NETWORK_ELEMENT_ID_FK` **FK** | int unsigned | yes | NULL | FK NETWORK_ELEMENT.ID matched by the identity rules; NULL = no record (rogue / unclaimed) |
| `OBSERVED_VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID as reported by the device |
| `OBSERVED_MODEL` | varchar(64) | yes | NULL | Model as reported (raw sysDescr string) |
| `IS_ACTIVE` | tinyint(1) | no | '1' | Discovery flag: 0 = excluded from polling |
| `FIRST_SEEN_TIME` | datetime(3) | yes | NULL | First answer (UTC); "new this cycle" is derived |
| `LAST_SYNC_TIME` | datetime(3) | yes | NULL | Last completed run on this target (UTC); freshness buckets are derived |
| `LAST_OUTCOME` | varchar(16) | yes | NULL | Outcome of the latest run. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER |
| `LAST_FAILURE_REASON` | varchar(24) | yes | NULL | Failure of the latest run, if any. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP |
| `CONSECUTIVE_FAILED_RUNS` | smallint unsigned | no | '0' | Runs in a row without an answer; 3 = missing |

---

## Reconciliation

### DISCREPANCY_TYPE

Discrepancy label with its category and domain (Undocumented wavelength, PCI value != record, Topology gap (LLDP) ...). FK to DOMAIN added (missing in v4).

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `RECONCILIATION_EXCEPTION`
- **Constraints**: 1 CHECK, 2 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `CODE` | varchar(40) | no |  | Type code |
| `LABEL` | varchar(100) | no |  | Display label |
| `CATEGORY` | varchar(24) | no |  | Discrepancy category. Values: EXISTENCE, ATTRIBUTE, RELATIONSHIP, FRESHNESS |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |

### RECONCILIATION_EXCEPTION

Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition. One exception may cover many records (bulk).

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`)
- **References**: `ASSIGNEE_ID_FK` → `USER`; `DISCREPANCY_TYPE_ID_FK` → `DISCREPANCY_TYPE`; `DISPOSITION_BY_FK` → `USER`; `DOMAIN_ID_FK` → `DOMAIN`; `RECONCILIATION_RESULT_ID_FK` → `RECONCILIATION_RESULT`; `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE`; `RESOURCE_ID_FK` → `RESOURCE`; `SCAN_TARGET_ID_FK` → `SCAN_TARGET`
- **Constraints**: 9 CHECK, 12 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(20) | no |  | Exception id |
| `STATE` | varchar(24) | no |  | What is wrong. Values: ROGUE, DRIFTED, MISSING, DUPLICATE, UNCLAIMED, NO_ADAPTER, ZOMBIE |
| `DISCREPANCY_TYPE_ID_FK` **FK** | smallint unsigned | no |  | FK DISCREPANCY_TYPE.ID |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | yes | NULL | FK RECONCILIATION_RULE.ID that raised it |
| `RECONCILIATION_RESULT_ID_FK` **FK** | bigint unsigned | yes | NULL | FK RECONCILIATION_RESULT.ID it came from |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | yes | NULL | FK RESOURCE.ID: the inventory subject (any type) |
| `SCAN_TARGET_ID_FK` **FK** | int unsigned | yes | NULL | FK SCAN_TARGET.ID subject, when network-only (rogue) |
| `SUBJECT_DETAIL` | varchar(200) | yes | NULL | Detail within the subject (wavelength 1550.12nm; OEM name) |
| `AFFECTED_RECORD_COUNT` | int unsigned | no | '1' | Records covered (bulk exception: 118 records) |
| `DETECTED_TIME` | datetime(3) | no |  | Detected (UTC); age and age band are derived |
| `SLA_DUE_TIME` | datetime(3) | no |  | SLA deadline (UTC); On track / At risk (final quarter) / Breached is derived |
| `OWNER_TEAM_REFERENCE` | varchar(64) | yes | NULL | Code of the User Management group (queue) that owns the exception; groups live in User Management, so this is a reference without a foreign key. NULL = Unassigned |
| `ASSIGNEE_ID_FK` **FK** | bigint unsigned | yes | NULL | FK USER.ID: individual assignee |
| `STATUS` | varchar(24) | no | 'OPEN' | Workflow status. Values: OPEN, IN_PROGRESS, RESOLVED, ACCEPTED_EXCEPTION |
| `DISPOSITION` | varchar(24) | yes | NULL | Chosen disposition. Values: ACCEPT_NETWORK, ACCEPT_RECORD, RAISE_WORKORDER, APPROVE_EXCEPTION |
| `DISPOSITION_BY_FK` **FK** | bigint unsigned | yes | NULL | FK USER.ID: who decided; a system user for auto-resolution |
| `DISPOSITION_TIME` | datetime(3) | yes | NULL | When decided (UTC) |
| `DISPOSITION_NOTE` | varchar(500) | yes | NULL | Reason / note |
| `IS_AUTO_RESOLVED` | tinyint(1) | no | '0' | 1 when closed by policy without an engineer (touchless) |
| `EXCEPTION_EXPIRES_DATE` | date | yes | NULL | Expiry of an approved exception; it reopens automatically after |
| `WORK_ORDER_REFERENCE` | varchar(40) | yes | NULL | Work order raised (RAISE_WORKORDER) |
| `CLOSED_TIME` | datetime(3) | yes | NULL | Closed (UTC); MTTR = closed - detected |

### RECONCILIATION_FIELD

Comparable resource attribute shared by provenance, rules and reconciliation results.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `CODE`
- **References**: `RESOURCE_TYPE` → `RESOURCE_TYPE`
- **Referenced by**: `RECONCILIATION_RESULT_FIELD`, `RECONCILIATION_RULE_CONDITION`, `RESOURCE_FIELD_PROVENANCE`
- **Constraints**: 1 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `CODE` **PK** | varchar(40) | no |  | Field code |
| `RESOURCE_TYPE` **FK** | varchar(24) | yes | NULL | FK RESOURCE_TYPE.CODE the field belongs to; NULL = any type |
| `LABEL` | varchar(64) | no |  | Display label (OS version, Azimuth) |
| `DATA_TYPE` | varchar(8) | no | 'STRING' | Value type. Values: STRING, NUMBER, BOOLEAN, DATE |

### RECONCILIATION_JOB

Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a schedule, running a set of rules.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `RECONCILIATION_JOB_RULE`, `RECONCILIATION_RUN`
- **Constraints**: 2 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(20) | no |  | Job id |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `SOURCE_DESCRIPTION` | varchar(150) | no |  | Source (Network Â· SNMP v2c/v3) |
| `TARGET_DESCRIPTION` | varchar(150) | no |  | Target (RAN asset register) |
| `SCAN_TYPE` | varchar(24) | no |  | Comparison type. Values: IDENTITY_ATTRIBUTE, ATTRIBUTE, IDENTITY, EXISTENCE, RELATIONSHIP |
| `CRON_EXPRESSION` | varchar(64) | yes | NULL | Schedule; NULL = on demand |
| `SCHEDULE_STATE` | varchar(16) | no | 'LIVE' | HELD while a rule is suspended. Values: LIVE, HELD, RETIRED |
| `NEXT_RUN_TIME` | datetime(3) | yes | NULL | Next run (UTC) |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### RECONCILIATION_JOB_RULE

Rules a reconciliation job runs (many-to-many; was ruleIds[]).

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RECONCILIATION_JOB_ID_FK`, `RECONCILIATION_RULE_ID_FK`)
- **References**: `RECONCILIATION_JOB_ID_FK` → `RECONCILIATION_JOB` (cascade); `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE`
- **Constraints**: 0 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_JOB_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_JOB.ID |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RULE.ID |

### RECONCILIATION_RESULT

Outcome of one rule on one subject (any resource or a scan target) in one run.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SUBJECT_KIND`, `RECONCILIATION_RUN_ID_FK`, `RECONCILIATION_RULE_ID_FK`, `SUBJECT_ID`)
- **References**: `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE`; `RECONCILIATION_RUN_ID_FK` → `RECONCILIATION_RUN` (cascade); `RESOURCE_ID_FK` → `RESOURCE`; `SCAN_TARGET_ID_FK` → `SCAN_TARGET`
- **Referenced by**: `RECONCILIATION_EXCEPTION`, `RECONCILIATION_RESULT_FIELD`
- **Constraints**: 4 CHECK, 7 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_RUN_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RUN.ID |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RULE.ID |
| `RESOURCE_ID_FK` **FK** | bigint unsigned | yes | NULL | FK RESOURCE.ID: the inventory subject |
| `SCAN_TARGET_ID_FK` **FK** | int unsigned | yes | NULL | FK SCAN_TARGET.ID: network-only subject with no record (extra entity) |
| `SUBJECT_KIND` | varchar(12) | no |  | *(generated)* Derived: RESOURCE or SCAN_TARGET |
| `SUBJECT_ID` | bigint unsigned | yes |  | *(generated)* Derived subject id; with SUBJECT_KIND makes the result unique per run and rule |
| `OUTCOME` | varchar(24) | no |  | Outcome type; mapped to states in RECONCILIATION_STATE_MAP. Values: MATCHED, ATTRIBUTE_MISMATCH, EXTRA_NO_RECORD, RELATIONSHIP_DRIFT, MISSING_NO_LIVE_PEER, UNRESOLVED_MATCH, STALE, NOT_COMPARABLE |
| `MATCH_RULE` | varchar(24) | yes | NULL | Identity rule used. Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP, EXTERNAL_ID, CELL_IDENTITY |
| `MATCH_CONFIDENCE` | varchar(16) | yes | NULL | Match confidence. Values: EXACT, STRONG, WEAK |
| `VERIFIED_TIME` | datetime(3) | no |  | When compared (UTC) |

### RECONCILIATION_RESULT_FIELD

One compared field: inventory value vs network value, evidence source and confidence (attribute drift detail).

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RECONCILIATION_RESULT_ID_FK`, `FIELD_CODE`)
- **References**: `FIELD_CODE` → `RECONCILIATION_FIELD`; `RECONCILIATION_RESULT_ID_FK` → `RECONCILIATION_RESULT` (cascade)
- **Constraints**: 0 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_RESULT_ID_FK` **FK** | bigint unsigned | no |  | FK RECONCILIATION_RESULT.ID |
| `FIELD_CODE` **FK** | varchar(40) | no |  | FK RECONCILIATION_FIELD.CODE (OS_VERSION, AZIMUTH_DEG ...) |
| `INVENTORY_VALUE` | varchar(255) | yes | NULL | Value in the record |
| `NETWORK_VALUE` | varchar(255) | yes | NULL | Value discovered |
| `EVIDENCE_SOURCE` | varchar(100) | yes | NULL | Evidence (sysObjectID .2636, chassis inventory, LLDP neighbour set) |
| `IS_MATCH` | tinyint(1) | no |  | 1 when the two values agree |

### RECONCILIATION_RULE

Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **References**: `APPROVER_ID_FK` → `USER`; `DOMAIN_ID_FK` → `DOMAIN`; `EXECUTOR_ID_FK` → `USER`; `OWNER_ID_FK` → `USER`; `REVIEWER_ID_FK` → `USER`
- **Referenced by**: `RECONCILIATION_EXCEPTION`, `RECONCILIATION_JOB_RULE`, `RECONCILIATION_RESULT`, `RECONCILIATION_RULE_CONDITION`, `RECONCILIATION_RULE_EVENT`, `RECONCILIATION_RUN_RULE`
- **Constraints**: 4 CHECK, 8 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(20) | no |  | Rule id RUL-<RAN\|COR\|TRA\|IPM>-NNN |
| `NAME` | varchar(150) | no |  | Rule name |
| `DESCRIPTION` | varchar(1000) | no |  | What the rule checks |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `SOURCE_DESCRIPTION` | varchar(150) | no |  | Source side (Network Â· SNMP v2c + NETCONF) |
| `TARGET_DESCRIPTION` | varchar(150) | no |  | Target side (Inventory Â· RAN asset register) |
| `RULE_TYPE` | varchar(16) | no |  | What kind of comparison. Values: IDENTITY, ATTRIBUTE, EXISTENCE, RELATIONSHIP, FRESHNESS |
| `PRIORITY` | varchar(16) | no | 'MEDIUM' | Priority. Values: HIGH, MEDIUM, LOW |
| `STATUS` | varchar(16) | no | 'DRAFT' | Lifecycle status; allowed moves in RECONCILIATION_RULE_TRANSITION; runs only when ACTIVE or EXECUTING. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED |
| `ORIGIN` | varchar(24) | no |  | How the rule was created. Values: MANUAL, AUTO_GENERATED, AI_SUGGESTED |
| `OWNER_ID_FK` **FK** | bigint unsigned | no |  | FK USER.ID: owner |
| `REVIEWER_ID_FK` **FK** | bigint unsigned | no |  | FK USER.ID: reviewer |
| `APPROVER_ID_FK` **FK** | bigint unsigned | no |  | FK USER.ID: approver |
| `EXECUTOR_ID_FK` **FK** | bigint unsigned | no |  | FK USER.ID: executor |
| `EXCEPTION_REVIEWER_TEAM_REFERENCE` | varchar(64) | yes | NULL | Code of the User Management group that reviews the exceptions the rule raises (reference without a foreign key) |
| `EXPECTED_IMPACT` | varchar(500) | yes | NULL | Expected impact statement for review |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### RECONCILIATION_RULE_CONDITION

Condition of a rule: source field, operator, target field or literal, joined by AND / OR.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`, `SEQUENCE_NUMBER`)
- **References**: `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE` (cascade); `SOURCE_FIELD_CODE` → `RECONCILIATION_FIELD`; `TARGET_FIELD_CODE` → `RECONCILIATION_FIELD`
- **Constraints**: 5 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RULE.ID |
| `SEQUENCE_NUMBER` | smallint unsigned | no |  | Order |
| `CONDITION_CONNECTOR` | varchar(8) | yes | NULL | Join with the previous condition; NULL on the first. Values: AND, OR |
| `SOURCE_FIELD_CODE` **FK** | varchar(40) | no |  | FK RECONCILIATION_FIELD.CODE: field tested |
| `OPERATOR` | varchar(24) | no |  | Operator. Values: EQUALS, NOT_EQUALS, CONTAINS, GREATER_THAN, LESS_THAN, GREATER_OR_EQUAL, LESS_OR_EQUAL |
| `TARGET_KIND` | varchar(16) | no |  | Whether the comparison is against a field or a literal. Values: FIELD, LITERAL |
| `TARGET_FIELD_CODE` **FK** | varchar(40) | yes | NULL | FK RECONCILIATION_FIELD.CODE when TARGET_KIND = FIELD |
| `TARGET_LITERAL` | varchar(150) | yes | NULL | Literal when TARGET_KIND = LITERAL (Decommissioned, true, null) |

### RECONCILIATION_RULE_EVENT

Append-only approval / lifecycle trail of a rule (the application never updates or deletes rows); the FK to RECONCILIATION_RULE_TRANSITION rejects illegal moves. Records the real acting user.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **References**: `ACTOR_ID_FK` → `USER`; `FROM_STATUS, TO_STATUS, ACTION` → `RECONCILIATION_RULE_TRANSITION`; `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE`
- **Constraints**: 1 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RULE.ID |
| `FROM_STATUS` **FK** | varchar(16) | no |  | Status before. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED |
| `TO_STATUS` **FK** | varchar(16) | no |  | Status after. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED |
| `ACTION` **FK** | varchar(24) | no |  | Action taken. Values: SUBMIT_FOR_REVIEW, APPROVE, REJECT, REQUEST_CHANGES, ACTIVATE, START_EXECUTION, FINISH_EXECUTION, SUSPEND, RESUME, RETIRE |
| `ACTOR_ID_FK` **FK** | bigint unsigned | no |  | FK USER.ID: who acted (not always the reviewer) |
| `EVENT_TIME` | datetime(3) | no |  | When (UTC) |
| `NOTE` | varchar(500) | yes | NULL | Note (Sent back to the owner; TL1 credential expired) |

### RECONCILIATION_RULE_TRANSITION

Allowed rule lifecycle moves and the action that makes them.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`FROM_STATUS`, `TO_STATUS`, `ACTION`)
- **Referenced by**: `RECONCILIATION_RULE_EVENT`
- **Constraints**: 4 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `FROM_STATUS` | varchar(16) | no |  | Status before. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED |
| `TO_STATUS` | varchar(16) | no |  | Status after. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED |
| `ACTION` | varchar(24) | no |  | Action that performs the move. Values: SUBMIT_FOR_REVIEW, APPROVE, REJECT, REQUEST_CHANGES, ACTIVATE, START_EXECUTION, FINISH_EXECUTION, SUSPEND, RESUME, RETIRE |
| `ACTOR_ROLE` | varchar(16) | no |  | Role responsible for the action (next-action banner). Values: OWNER, REVIEWER, APPROVER, EXECUTOR, SYSTEM |

### RECONCILIATION_RUN

One execution of a reconciliation job (a reconciliation cycle). Scanned / drifted / auto-resolved figures are derived from results and exceptions.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **References**: `RECONCILIATION_JOB_ID_FK` → `RECONCILIATION_JOB`; `SCAN_RUN_ID_FK` → `SCAN_RUN`
- **Referenced by**: `RECONCILIATION_RESULT`, `RECONCILIATION_RUN_RULE`
- **Constraints**: 2 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_JOB_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_JOB.ID |
| `SCAN_RUN_ID_FK` **FK** | int unsigned | yes | NULL | FK SCAN_RUN.ID: discovery run whose facts were compared |
| `STATUS` | varchar(32) | no | 'SCHEDULED' | Run state. Values: SCHEDULED, RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED |
| `STARTED_TIME` | datetime(3) | yes | NULL | Start (UTC) |
| `ENDED_TIME` | datetime(3) | yes | NULL | End (UTC) |

### RECONCILIATION_RUN_RULE

Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duration).

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RECONCILIATION_RUN_ID_FK`, `RECONCILIATION_RULE_ID_FK`)
- **References**: `RECONCILIATION_RULE_ID_FK` → `RECONCILIATION_RULE`; `RECONCILIATION_RUN_ID_FK` → `RECONCILIATION_RUN` (cascade)
- **Constraints**: 0 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RECONCILIATION_RUN_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RUN.ID |
| `RECONCILIATION_RULE_ID_FK` **FK** | int unsigned | no |  | FK RECONCILIATION_RULE.ID |
| `MATCHED_COUNT` | int unsigned | no |  | Elements that matched |
| `EXCEPTION_COUNT` | int unsigned | no |  | Exceptions raised |
| `DURATION_MS` | int unsigned | no |  | Rule duration, ms |

### RECONCILIATION_STATE_MAP

Mapping of reconciliation outcomes to resource, target and exception states.

- **Module / group**: Reconciliation · Reconciliation rules, jobs, results and exceptions
- **Primary key**: `OUTCOME`
- **Constraints**: 4 CHECK, 0 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `OUTCOME` **PK** | varchar(24) | no |  | RECONCILIATION_RESULT.OUTCOME value |
| `RECONCILIATION_STATE` | varchar(24) | no |  | Resulting NETWORK_ELEMENT.RECONCILIATION_STATE. Values: VERIFIED, DRIFTED, STALE, MISSING, DUPLICATE, NOT_DISCOVERED |
| `TARGET_OUTCOME` | varchar(16) | yes | NULL | Resulting SCAN_TARGET.LAST_OUTCOME, when the subject is a target. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER |
| `EXCEPTION_STATE` | varchar(16) | yes | NULL | RECONCILIATION_EXCEPTION.STATE raised; NULL = no exception. Values: ROGUE, DRIFTED, MISSING, DUPLICATE, UNCLAIMED, NO_ADAPTER, ZOMBIE |

---

## Reporting and KPIs

### DOMAIN_TRUST_SNAPSHOT

Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unverified, open, MTTR, touchless).

- **Module / group**: Reporting and KPIs · Reporting and KPIs · Written by the nightly aggregation job
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `SNAPSHOT_DATE`, `DOMAIN_ID_FK`)
- **References**: `DOMAIN_ID_FK` → `DOMAIN`
- **Constraints**: 2 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `SNAPSHOT_DATE` | date | no |  | Snapshot day |
| `DOMAIN_ID_FK` **FK** | smallint unsigned | no |  | FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory |
| `IN_SCOPE` | int unsigned | no |  | Records in scope |
| `IN_SYNC` | int unsigned | no |  | Records whose identity, attributes and relationships agree |
| `UNVERIFIED` | int unsigned | yes | NULL | Never verified |
| `OPEN_EXCEPTIONS` | int unsigned | no |  | Open exceptions |
| `MTTR_HOURS` | decimal(8,2) | yes | NULL | Mean time to resolve, hours |
| `TOUCHLESS_PERCENT` | decimal(5,2) | yes | NULL | Share closed without an engineer, % |
| `TRUST_INDEX_PERCENT` | decimal(5,2) | yes |  | *(generated)* Derived: in sync / in scope |

### REPORT_DEFINITION

Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ...).

- **Module / group**: Reporting and KPIs · Reporting and KPIs
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `CODE`, `LIVE_FLAG`)
- **Referenced by**: `REPORT_RUN`
- **Constraints**: 4 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `CODE` | varchar(20) | no |  | Report id |
| `MODULE` | varchar(16) | no |  | Owning module. Values: DISCOVERY, INVENTORY |
| `NAME` | varchar(150) | no |  | Report name |
| `QUESTION` | varchar(500) | no |  | The question it answers |
| `AUDIENCE` | varchar(16) | no |  | Primary audience. Values: LEADERSHIP, OPERATIONS, ENGINEERING, FINANCE, PLANNING, GOVERNANCE |
| `CADENCE` | varchar(16) | no |  | Cadence. Values: DAILY, WEEKLY, MONTHLY, ON_DEMAND |
| `CRON_EXPRESSION` | varchar(64) | yes | NULL | Schedule (Mondays 07:00 IST); NULL = on demand |
| `DISTRIBUTION` | varchar(255) | yes | NULL | Distribution list / channel |
| `IS_FEATURED` | tinyint(1) | no | '0' | Featured on the landing page |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### REPORT_RUN

Generated report (production Reports grid).

- **Module / group**: Reporting and KPIs · Reporting and KPIs · Written by the reporting engine
- **Primary key**: `ID`
- **References**: `REPORT_DEFINITION_ID_FK` → `REPORT_DEFINITION`
- **Constraints**: 5 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `REPORT_DEFINITION_ID_FK` **FK** | int unsigned | yes | NULL | FK REPORT_DEFINITION.ID; NULL for ad-hoc exports |
| `NAME` | varchar(150) | no |  | Report name as generated (NETWORK-DISCOVERY-SUMMARY) |
| `REPORT_TYPE` | varchar(16) | no |  | Report type. Values: CLUSTER, SITE, DISCOVERY, INVENTORY, CAPEX, COMPLIANCE |
| `GENERATED_TYPE` | varchar(16) | no |  | How it was triggered. Values: SCHEDULED, AUTOMATED, ADHOC |
| `FORMAT` | varchar(8) | no |  | File format. Values: PDF, XLSX, CSV, DOCX, HTML, JSON |
| `STATUS` | varchar(16) | no | 'PENDING' | Generation status. Values: PENDING, RUNNING, COMPLETED, FAILED |
| `SNAPSHOT_REFERENCE` | varchar(40) | yes | NULL | Data snapshot the report read (TRUST-2026-W36) |
| `FILE_REFERENCE` | varchar(255) | yes | NULL | Object-store key of the file |
| `FILE_SIZE_BYTES` | int unsigned | yes | NULL | File size, bytes (a generated report never approaches 4 GB) |
| `FAILURE_MESSAGE` | varchar(255) | yes | NULL | Why it failed |
| `COMPLETED_TIME` | datetime(3) | yes | NULL | Finished (UTC) |

---

## Shared reference

### ATTRIBUTE_DEFINITION

Typed definition of an extensible attribute for one resource type.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `RESOURCE_TYPE`, `CODE`); (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`, `DATA_TYPE`)
- **References**: `RESOURCE_TYPE` → `RESOURCE_TYPE`; `TECHNOLOGY_ID_FK` → `TECHNOLOGY`; `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `RESOURCE_ATTRIBUTE`
- **Constraints**: 2 CHECK, 5 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `RESOURCE_TYPE` **FK** | varchar(24) | no |  | FK RESOURCE_TYPE.CODE the attribute applies to |
| `CODE` | varchar(64) | no |  | Attribute code (prachConfigurationIndex, ssbPeriodicity, powerSource) |
| `LABEL` | varchar(100) | no |  | Display label |
| `DATA_TYPE` | varchar(8) | no |  | Value type; decides which RESOURCE_ATTRIBUTE value column is used. Values: STRING, NUMBER, BOOLEAN, DATE |
| `UNIT` | varchar(16) | yes | NULL | Unit of a NUMBER value (dBm, ms, MHz) |
| `VENDOR_ID_FK` **FK** | smallint unsigned | yes | NULL | FK VENDOR.ID when vendor-specific; NULL = vendor-neutral |
| `TECHNOLOGY_ID_FK` **FK** | smallint unsigned | yes | NULL | FK TECHNOLOGY.ID when technology-specific; NULL = any |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 1 when new values may be recorded |

### DOMAIN

Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tree (IP/MPLS under Transport). Seeded; global.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`CODE`); (`SORT_ORDER`)
- **References**: `PARENT_DOMAIN_ID_FK` → `DOMAIN`
- **Referenced by**: `COLLECTOR`, `CREDENTIAL_PROFILE`, `DISCOVERY_STEP_DEFINITION`, `DISCREPANCY_TYPE`, `DOMAIN_TRUST_SNAPSHOT`, `EXTERNAL_SYSTEM`, `NETWORK_ELEMENT`, `NETWORK_ELEMENT_TYPE_DOMAIN`, `NETWORK_FUNCTION_TYPE`, `RECONCILIATION_EXCEPTION`, `RECONCILIATION_JOB`, `RECONCILIATION_RULE`, `SCAN_JOB`, `SERVICE_INSTANCE`, `SERVICE_TYPE`
- **Constraints**: 0 CHECK, 3 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (metadata table) |
| `CODE` | varchar(16) | no |  | Stable domain code (RAN, CORE, TRANSPORT, IP_MPLS); the value the application enum carries |
| `NAME` | varchar(50) | no |  | Display name (IP/MPLS) |
| `PARENT_DOMAIN_ID_FK` **FK** | smallint unsigned | yes | NULL | FK DOMAIN.ID: parent domain (IP_MPLS -> TRANSPORT); NULL for a top-level domain. One level deep by application rule |
| `SORT_ORDER` | tinyint unsigned | no |  | Display order; a child directly follows its parent (RAN, Core, Transport, IP/MPLS) |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 1 when selectable for new records |

### FREQUENCY_BAND

Radio band per technology with duplex mode and frequency ranges.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`TECHNOLOGY_CODE`, `CODE`)
- **References**: `TECHNOLOGY_CODE` → `TECHNOLOGY`
- **Referenced by**: `RADIO_CELL`
- **Constraints**: 2 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `TECHNOLOGY_CODE` **FK** | varchar(20) | no |  | FK TECHNOLOGY.CODE (GSM, UMTS, LTE, NR, NB_IOT) |
| `CODE` | varchar(16) | no |  | Band code as named by 3GPP / the operator (GSM900, B1, B3, B40, n78, n258) |
| `DUPLEX_MODE` | varchar(8) | no |  | Duplexing. Values: FDD, TDD, SDL, SUL |
| `DOWNLINK_LOW_MHZ` | decimal(9,3) | no |  | Downlink (or TDD) range start, MHz |
| `DOWNLINK_HIGH_MHZ` | decimal(9,3) | no |  | Downlink (or TDD) range end, MHz |
| `UPLINK_LOW_MHZ` | decimal(9,3) | yes | NULL | Uplink range start, MHz (FDD / SUL); NULL for TDD / SDL |
| `UPLINK_HIGH_MHZ` | decimal(9,3) | yes | NULL | Uplink range end, MHz |

### PRODUCT_MODEL

Vendor product catalog for devices, cards, optics, antennas, passive and power products, with lifecycle dates.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`VENDOR_ID_FK`, `MODEL`); (`VENDOR_ID_FK`, `ID`); (`VENDOR_ID_FK`, `ID`, `NETWORK_ELEMENT_TYPE`); (`SNMP_SYSTEM_OID`)
- **References**: `NETWORK_ELEMENT_TYPE` → `NETWORK_ELEMENT_TYPE`; `VENDOR_ID_FK` → `VENDOR`
- **Referenced by**: `ANTENNA`, `EQUIPMENT_COMPONENT`, `NETWORK_ELEMENT`, `PRODUCT_MODEL_POLICY`
- **Constraints**: 3 CHECK, 5 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK (catalog; INT: part numbers of cards and optics run to tens of thousands) |
| `VENDOR_ID_FK` **FK** | smallint unsigned | no |  | FK VENDOR.ID |
| `MODEL` | varchar(64) | no |  | Model / part number (MX204, AAU5613, SFP-10G-LR, AQU4518R11) |
| `PRODUCT_CATEGORY` | varchar(24) | no |  | What the product is. Values: NETWORK_ELEMENT, CHASSIS, CARD, MODULE, TRANSCEIVER, ANTENNA, PASSIVE, POWER, OTHER |
| `NETWORK_ELEMENT_TYPE` **FK** | varchar(24) | yes | NULL | FK NETWORK_ELEMENT_TYPE.CODE: device type, only for NETWORK_ELEMENT products |
| `DESCRIPTION` | varchar(255) | yes | NULL | Vendor description |
| `SNMP_SYSTEM_OID` | varchar(128) | yes | NULL | SNMP sysObjectID that identifies this model during discovery |
| `PORT_COUNT` | smallint unsigned | yes | NULL | Front-panel port count of the base unit |
| `RACK_UNITS` | tinyint unsigned | yes | NULL | Height in rack units |
| `POWER_DRAW_W` | int unsigned | yes | NULL | Typical power draw in watts |
| `END_OF_SALE_DATE` | date | yes | NULL | Vendor End-of-Sale date |
| `END_OF_LIFE_DATE` | date | yes | NULL | Vendor End-of-Life / end-of-support date; the EoL band is derived |

### PRODUCT_MODEL_POLICY

Per-tenant golden software version of a product model.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `PRODUCT_MODEL_ID_FK`)
- **References**: `PRODUCT_MODEL_ID_FK` → `PRODUCT_MODEL`
- **Constraints**: 0 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `PRODUCT_MODEL_ID_FK` **FK** | int unsigned | no |  | FK PRODUCT_MODEL.ID |
| `RECOMMENDED_OS_VERSION` | varchar(64) | no |  | Golden OS version; devices on another version are BEHIND for compliance |

### TECHNOLOGY

Network / radio access technology with family and generation; the one place generation is recorded.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **Referenced by**: `ATTRIBUTE_DEFINITION`, `FREQUENCY_BAND`, `RESOURCE_TECHNOLOGY`
- **Constraints**: 3 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (catalog) |
| `CODE` | varchar(20) | no |  | Technology code (GSM, UMTS, LTE, NR, NB_IOT, MPLS, SR_MPLS, OTN, DWDM, XGSPON ...) |
| `NAME` | varchar(50) | no |  | Display name |
| `FAMILY` | varchar(24) | no |  | Technology family. Values: RADIO_ACCESS, CORE, PACKET_TRANSPORT, OPTICAL_TRANSPORT, MICROWAVE, FIXED_ACCESS, WIRELESS_LAN, CLOUD |
| `GENERATION` | varchar(4) | yes | NULL | Mobile generation for radio / core technologies. Values: 2G, 3G, 4G, 5G; NULL otherwise |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 1 when available for new records |

### TENANT

Platform tenant (the operator). Every tenant-owned row references it through CUSTOMER_ID. Reference copy of the platform tenant registry (CDC).

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs · Reference copy (platform, CDC)
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **Referenced by**: `ANTENNA`, `ATTRIBUTE_DEFINITION`, `CELL_ANTENNA`, `CELL_RADIO_UNIT`, `CLOUD_CLUSTER`, `COLLECTOR`, `CREDENTIAL_PROFILE`, `DOMAIN_TRUST_SNAPSHOT`, `EQUIPMENT_COMPONENT`, `EXTERNAL_RESOURCE`, `EXTERNAL_SYSTEM`, `GEOGRAPHY_LEVEL1`, `GEOGRAPHY_LEVEL2`, `GEOGRAPHY_LEVEL3`, `GEOGRAPHY_LEVEL4`, `IP_SUBNET`, `LINK`, `LINK_MICROWAVE_ATTRIBUTE`, `LINK_PROTOCOL_ATTRIBUTE`, `NETWORK_ELEMENT`, `NETWORK_ELEMENT_CORE_DETAIL`, `NETWORK_ELEMENT_HEALTH`, `NETWORK_ELEMENT_IP_MPLS_DETAIL`, `NETWORK_ELEMENT_MICROWAVE_DETAIL`, `NETWORK_ELEMENT_MOVEMENT`, `NETWORK_ELEMENT_OPTICAL_DETAIL`, `NETWORK_ELEMENT_PON_DETAIL`, `NETWORK_ELEMENT_POWER_DETAIL`, `NETWORK_ELEMENT_RAN_DETAIL`, `NETWORK_ELEMENT_SECURITY_DETAIL`, `NETWORK_ELEMENT_SERVER_DETAIL`, `NETWORK_ELEMENT_SWITCH_DETAIL`, `NETWORK_ELEMENT_VIRTUAL_INSTANCE`, `NETWORK_ELEMENT_WIFI_DETAIL`, `NETWORK_SLICE`, `OPERATIONAL_AREA`, `PLMN`, `PORT`, `PORT_IP_ADDRESS`, `PORT_VLAN`, `PRODUCT_MODEL_POLICY`, `RADIO_CELL`, `RADIO_CELL_PLMN`, `RADIO_SECTOR`, `RECONCILIATION_EXCEPTION`, `RECONCILIATION_JOB`, `RECONCILIATION_JOB_RULE`, `RECONCILIATION_RESULT`, `RECONCILIATION_RESULT_FIELD`, `RECONCILIATION_RULE`, `RECONCILIATION_RULE_CONDITION`, `RECONCILIATION_RULE_EVENT`, `RECONCILIATION_RUN`, `RECONCILIATION_RUN_RULE`, `REPORT_DEFINITION`, `REPORT_RUN`, `RESOURCE`, `RESOURCE_ASSET`, `RESOURCE_ATTRIBUTE`, `RESOURCE_EXTERNAL_REFERENCE`, `RESOURCE_FIELD_PROVENANCE`, `RESOURCE_RELATIONSHIP`, `RESOURCE_TECHNOLOGY`, `SCAN_JOB`, `SCAN_JOB_SCOPE`, `SCAN_RUN`, `SCAN_RUN_TARGET`, `SCAN_STEP_PAYLOAD`, `SCAN_STEP_RESULT`, `SCAN_TARGET`, `SERVICE_ENDPOINT`, `SERVICE_INSTANCE`, `SITE`, `SITE_CONTACT`, `SITE_ISSUE`, `USER`, `VLAN`, `VRF`
- **Constraints**: 0 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Platform tenant id: the value every table stores in CUSTOMER_ID |
| `CODE` | varchar(32) | no |  | Stable tenant code |
| `NAME` | varchar(128) | no |  | Tenant display name |

### USER

Reference copy of User Management users, kept only because 8 FK relationships need it; rows arrive by CDC (never created here). No email or other contact PII is stored. External identities stay in User Management.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs · Reference copy (User Management, CDC)
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `USERNAME`)
- **Referenced by**: `NETWORK_ELEMENT`, `RECONCILIATION_EXCEPTION`, `RECONCILIATION_RULE`, `RECONCILIATION_RULE_EVENT`
- **Constraints**: 3 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | bigint unsigned | no |  | Surrogate PK; the value every CREATOR / LAST_MODIFIER / *_BY_FK stores |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `USERNAME` | varchar(128) | no |  | Platform login name (canonical, as held by User Management) |
| `DISPLAY_NAME` | varchar(128) | no |  | Name shown in the UI |
| `USER_TYPE` | varchar(16) | no | 'HUMAN' | Kind of principal. Values: HUMAN, SERVICE |
| `STATUS` | varchar(16) | no | 'ACTIVE' | Account state; users are disabled, never hard-deleted. Values: ACTIVE, DISABLED |
| `DISABLED_TIME` | datetime(3) | yes | NULL | When disabled (UTC) |

### VENDOR

Equipment vendor / OEM (shared catalog; DDL restored from v3 because it was missing from the v4 dump). Ownership pending validation: may become a CDC copy of a master-data module.

- **Module / group**: Shared reference · Platform, tenancy and shared catalogs
- **Primary key**: `ID`
- **Unique**: (`CODE`)
- **Referenced by**: `ANTENNA`, `ATTRIBUTE_DEFINITION`, `EQUIPMENT_COMPONENT`, `EXTERNAL_SYSTEM`, `NETWORK_ELEMENT`, `PRODUCT_MODEL`, `SCAN_TARGET`
- **Constraints**: 0 CHECK, 1 indexes

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | smallint unsigned | no |  | Surrogate PK (global catalog, no CUSTOMER_ID) |
| `CODE` | varchar(32) | no |  | Vendor code (CISCO, JUNIPER, NOKIA, HUAWEI, ERICSSON ...) |
| `NAME` | varchar(100) | no |  | Vendor display name |
| `SNMP_SYSTEM_OID_PREFIX` | varchar(64) | yes | NULL | SNMP enterprise OID prefix used to identify the vendor from sysObjectID (1.3.6.1.4.1.2636) |
| `IS_ACTIVE` | tinyint(1) | no | '1' | 0 hides the vendor from pickers |

### GEOGRAPHY_LEVEL1

Level-1 geography (country / state). Names are unique per parent, not globally (the old schema could not hold two districts with the same name).

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `GEOGRAPHY_CODE`); (`CUSTOMER_ID`, `GEOGRAPHY_NAME`)
- **Referenced by**: `GEOGRAPHY_LEVEL2`
- **Constraints**: 1 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `GEOGRAPHY_CODE` | varchar(64) | no |  | Area code |
| `GEOGRAPHY_NAME` | varchar(200) | no |  | Area name |
| `PRETTY_NAME` | varchar(150) | yes | NULL | Display name |
| `LATITUDE` | decimal(9,6) | yes | NULL | Centroid latitude (WGS84) |
| `LONGITUDE` | decimal(9,6) | yes | NULL | Centroid longitude (WGS84) |

### GEOGRAPHY_LEVEL2

Level-2 geography (district / city). Names are unique per parent, not globally (the old schema could not hold two districts with the same name).

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `GEOGRAPHY_CODE`); (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL1_ID_FK`, `GEOGRAPHY_NAME`)
- **References**: `GEOGRAPHY_LEVEL1_ID_FK` → `GEOGRAPHY_LEVEL1`
- **Referenced by**: `GEOGRAPHY_LEVEL3`
- **Constraints**: 1 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `GEOGRAPHY_LEVEL1_ID_FK` **FK** | int unsigned | no |  | FK GEOGRAPHY_LEVEL1.ID: the parent area |
| `GEOGRAPHY_CODE` | varchar(64) | no |  | Area code |
| `GEOGRAPHY_NAME` | varchar(200) | no |  | Area name |
| `PRETTY_NAME` | varchar(150) | yes | NULL | Display name |
| `LATITUDE` | decimal(9,6) | yes | NULL | Centroid latitude (WGS84) |
| `LONGITUDE` | decimal(9,6) | yes | NULL | Centroid longitude (WGS84) |

### GEOGRAPHY_LEVEL3

Level-3 geography (locality). Names are unique per parent, not globally (the old schema could not hold two districts with the same name).

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `GEOGRAPHY_CODE`); (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL2_ID_FK`, `GEOGRAPHY_NAME`)
- **References**: `GEOGRAPHY_LEVEL2_ID_FK` → `GEOGRAPHY_LEVEL2`
- **Referenced by**: `GEOGRAPHY_LEVEL4`
- **Constraints**: 1 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `GEOGRAPHY_LEVEL2_ID_FK` **FK** | int unsigned | no |  | FK GEOGRAPHY_LEVEL2.ID: the parent area |
| `GEOGRAPHY_CODE` | varchar(64) | no |  | Area code |
| `GEOGRAPHY_NAME` | varchar(200) | no |  | Area name |
| `PRETTY_NAME` | varchar(150) | yes | NULL | Display name |
| `LATITUDE` | decimal(9,6) | yes | NULL | Centroid latitude (WGS84) |
| `LONGITUDE` | decimal(9,6) | yes | NULL | Centroid longitude (WGS84) |

### GEOGRAPHY_LEVEL4

Level-4 geography (cluster / pin area). Names are unique per parent, not globally (the old schema could not hold two districts with the same name).

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `GEOGRAPHY_CODE`); (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL3_ID_FK`, `GEOGRAPHY_NAME`)
- **References**: `GEOGRAPHY_LEVEL3_ID_FK` → `GEOGRAPHY_LEVEL3`
- **Referenced by**: `SITE`
- **Constraints**: 2 CHECK, 3 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `GEOGRAPHY_LEVEL3_ID_FK` **FK** | int unsigned | no |  | FK GEOGRAPHY_LEVEL3.ID: the parent area |
| `GEOGRAPHY_CODE` | varchar(64) | no |  | Area code |
| `GEOGRAPHY_NAME` | varchar(200) | no |  | Area name |
| `PRETTY_NAME` | varchar(150) | yes | NULL | Display name |
| `LATITUDE` | decimal(9,6) | yes | NULL | Centroid latitude (WGS84) |
| `LONGITUDE` | decimal(9,6) | yes | NULL | Centroid longitude (WGS84) |
| `MORPHOLOGY` | varchar(16) | yes | NULL | Morphology type. Values: DENSE_URBAN, URBAN, SUBURBAN, RURAL |

### OPERATIONAL_AREA

Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > Territory). A child always sits at a lower level than its parent.

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `AREA_LEVEL`, `CODE`, `LIVE_FLAG`)
- **References**: `PARENT_AREA_ID_FK, PARENT_AREA_LEVEL` → `OPERATIONAL_AREA`
- **Referenced by**: `CREDENTIAL_PROFILE`, `SCAN_JOB`, `SITE`
- **Constraints**: 2 CHECK, 4 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `PARENT_AREA_ID_FK` **FK** | int unsigned | yes | NULL | FK OPERATIONAL_AREA.ID: parent area; NULL for a top-level area |
| `PARENT_AREA_LEVEL` **FK** | varchar(16) | yes | NULL | Copy of the parent AREA_LEVEL, FK-bound; must rank above AREA_LEVEL (so the tree cannot loop) |
| `AREA_LEVEL` | varchar(16) | no |  | Level in the operator hierarchy. Values: REGION, CIRCLE, ZONE, DIVISION, TERRITORY |
| `CODE` | varchar(32) | no |  | Area code (e.g. KA for the Karnataka circle) |
| `NAME` | varchar(100) | no |  | Area name |
| `IS_DELETED` | tinyint(1) | no | '0' | Soft-delete flag (0 = active, 1 = deleted) |
| `LIVE_FLAG` | tinyint(1) | yes |  | *(generated)* 1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows |

### PLMN

Public land mobile network (MCC + MNC) run or shared by the tenant.

- **Module / group**: Shared reference · Geography and organisation
- **Primary key**: `ID`
- **Unique**: (`CUSTOMER_ID`, `MCC`, `MNC`)
- **Referenced by**: `NETWORK_ELEMENT_RAN_DETAIL`, `NETWORK_SLICE`, `RADIO_CELL_PLMN`
- **Constraints**: 1 CHECK, 2 indexes; audit columns present

| Column | Type | Null | Default | Description |
|---|---|---|---|---|
| `ID` **PK** | int unsigned | no |  | Surrogate PK |
| `CUSTOMER_ID` **FK** | int unsigned | no |  | Platform tenant (TENANT.ID); every FK between tenant tables includes it |
| `MCC` | char(3) | no |  | Mobile country code (404, 405 for India) |
| `MNC` | varchar(3) | no |  | Mobile network code, 2 or 3 digits |
| `NAME` | varchar(100) | no |  | Operator / PLMN name |
| `IS_HOME` | tinyint(1) | no | '1' | 1 for the tenant's own PLMN, 0 for a sharing partner |
