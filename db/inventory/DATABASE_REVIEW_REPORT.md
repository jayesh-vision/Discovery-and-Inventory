# Database Schema Quality Review — `inventory_schema.sql` v6

| | |
|---|---|
| **Schema reviewed** | `db/inventory/inventory_schema.sql`, v6 (2026-09-28): 105 tables, 1,517 columns, 303 foreign keys, 192 unique keys, 336 CHECK constraints, 198 generated columns, 350 catalog seed rows + dummy data |
| **Method** | The DDL was loaded into a scratch MySQL 9.5.0 and every table, column, index, foreign key, CHECK constraint and comment was extracted from `information_schema`; findings below cite those objects. Row counts are dummy data only, so uniqueness claims are about what the constraints prevent, not about existing data. |
| **Review framework** | `databasereviewprompt.md` — eight weighted dimensions, severity Critical / Major / Minor, gate = zero Critical **and** score ≥ 7.0 |
| **Style guide** | `mysql_guidelines.md` |
| **Previous revision reviewed** | v5 (2026-09-27); section 6 lists what this revision fixed |
| **Reviewer** | generated audit, 2026-09-28 |

---

## 1. Verdict

**Score 9.4 / 10 — PASS.** Zero Critical findings, zero Major findings, ten Minor findings. The gate rule applied: a schema passes only when it has **no Critical finding and a weighted score of at least 7.0**; the two conditions are independent, and a single Critical finding fails the gate regardless of score. Both conditions are met.

| # | Dimension | Weight | Score | Weighted | Findings |
|---|---|---|---|---|---|
| 1 | Referential integrity | 20% | 9.5 | 1.90 | 1 Minor |
| 2 | Indexing & performance | 18% | 9.5 | 1.71 | 1 Minor |
| 3 | Data type & storage design | 12% | 9.0 | 1.08 | 2 Minor |
| 4 | Naming conventions | 8% | 9.5 | 0.76 | 1 Minor |
| 5 | Constraint completeness | 15% | 9.5 | 1.43 | 2 Minor |
| 6 | Normalization & redundancy control | 12% | 9.0 | 1.08 | 2 Minor |
| 7 | Security & sensitive data | 5% | 10.0 | 0.50 | 0 |
| 8 | Documentation accuracy | 10% | 9.5 | 0.95 | 1 Minor |
| | **Total** | **100%** | | **9.41** | **10 Minor · 0 Major · 0 Critical** |

Weighted math: 0.20×9.5 + 0.18×9.5 + 0.12×9.0 + 0.08×9.5 + 0.15×9.5 + 0.12×9.0 + 0.05×10.0 + 0.10×9.5 = 1.90 + 1.71 + 1.08 + 0.76 + 1.425 + 1.08 + 0.50 + 0.95 = **9.405**.

Finding count check: 1 + 1 + 2 + 1 + 2 + 2 + 0 + 1 = 10 findings listed in section 4, all Minor, matching the table above.

---

## 2. What was extracted

| Object | Count | Observations |
|---|---|---|
| Tables | 105 | all `SNAKE_UPPER_CASE`, singular, InnoDB, utf8mb4; every table has a comment (105 / 105) |
| Columns | 1,517 | every column has a comment (1,517 / 1,517); 179 vocabulary columns list their values in the comment |
| Foreign keys | 303 | 83 tenant keys (`CUSTOMER_ID → TENANT`) on all 83 tenant tables; 220 relationship keys, every one composite on `CUSTOMER_ID` where both sides are tenant tables; 59 `ON DELETE CASCADE`, all on true composition (supertype → subtype, parent → child detail, run → results) |
| Unique keys | 192 | natural keys on every master table; 27 contain a nullable column, each one deliberate (soft-delete flag last, or "unknown identity must not collide") |
| CHECK constraints | 336 | value lists for every vocabulary column, cross-column rules (xor subjects, closed ↔ closed time, held ↔ reason, source ↔ system), ranges (latitude / longitude, percentages, VLAN 1–4094, tilt, azimuth, gNB id length, IPv4/IPv6 validity, MAC and UUID formats), non-negative measures |
| Generated columns | 198 | `LIVE_FLAG` / `ACTIVE_FLAG` for soft-delete-aware unique keys, binary IP forms, `LINK_KEY`, `CELL_KEY`, derived `RESOURCE_TYPE`, `DURATION_MS`, `TRUST_INDEX_PERCENT`, `SUBJECT_KIND` / `SUBJECT_ID` |
| Views / triggers / routines | 0 | by design; the header and every affected comment say the application enforces derived figures, cycle checks and append-only trails |
| FK enforceability | 303 / 303 | `tests/fk_index_check.py`: no foreign key is served by an index with a nullable trailing column (InnoDB skips the check on such rows) |
| Negative tests | 13 / 13 rejected | wrong proxy type, unknown proxy id, removed PORT_KIND, port without device, VLAN range, VRF of another device, bad system type, soft-deleted row with unknown site, wrong target outcome, negative capacity, wrong record source, unknown team |
| Guideline checker | 0 violations | `tests/inventory_guideline_checks.sql` (19 rules: casing, comments, `IS_` booleans, no FLOAT, no ENUM, `_FK` columns have FKs, vocabulary columns have CHECK or FK, PK widths, redundant indexes, detail-table binding) |

---

## 3. What is working well

- **Tenant isolation is structural.** Every relationship between tenant tables is a composite foreign key that includes `CUSTOMER_ID`, with matching `(CUSTOMER_ID, ID)` unique keys as targets. A row cannot reference another tenant's row even if the application forgets a filter.
- **The supertype pattern is enforced, not conventional.** Each subtype carries a constant `RESOURCE_TYPE` bound by `FK (CUSTOMER_ID, RESOURCE_ID_FK, RESOURCE_TYPE) → RESOURCE (CUSTOMER_ID, ID, RESOURCE_TYPE)`, so a `RESOURCE` row of type `SITE` can never be claimed by a `LINK`. The same technique binds device detail tables to their device type (`NETWORK_ELEMENT_TYPE.CODE, DETAIL_TABLE`), cells to node types, and external proxies to the entity types their owning system may hold.
- **State machines live in data.** `NETWORK_ELEMENT_STOCK_TRANSITION` and `RECONCILIATION_RULE_TRANSITION` are FK targets of the movement and event trails, so an illegal lifecycle move is rejected by the database.
- **Foreign keys are actually enforceable.** The InnoDB nullable-trailing-column trap was found in the v4 dump (18 keys) and is closed: exact twin indexes named `IDX_<TABLE>__<COL>_FK` and rotated unique keys, all explained in the header.
- **Secrets never touch the database.** `CREDENTIAL_PROFILE` and `EXTERNAL_SYSTEM` store a `VAULT_REFERENCE`; collector payloads and site-contact phone / e-mail are AES-encrypted with a key reference and an IV; `USER` holds no PII. The naming and the comments make the pattern impossible to miss.
- **Documentation is complete and now truthful.** 100 % of tables and columns are commented, every vocabulary is listed next to its CHECK, and the comments that described triggers and views that do not exist were corrected in this revision.
- **Naming is consistent end to end.** `ID` primary keys, `_ID_FK` surrogate references, `_CODE` natural-key references, `IS_` booleans, `_TIME` / `_DATE` temporal columns, unit suffixes, and `UK_ / FK_ / IDX_ / CK_<TABLE>__<COLS>` constraint names; no CLASS or OBJECT words remain in any identifier.

---

## 4. Findings

All findings are **Minor**. None blocks the gate. Each carries the SQL to apply if the team decides to act on it.

### Dimension 1 — Referential integrity (score 9.5)

**F1 · Minor · Audit stamps are not foreign keys.** `CREATED_TIME / CREATOR / MODIFIED_TIME / LAST_MODIFIER` exist on 83 tables and hold `USER.ID`, but `CREATOR` and `LAST_MODIFIER` have no FK. A typo'd or foreign-tenant id would be stored silently. The header documents this as deliberate (users are never hard-deleted; the Audit module owns history), so it is a recorded trade-off, not an omission. If the team prefers enforcement, the type already matches (`BIGINT UNSIGNED` on both sides):

```sql
-- verify first: rows whose stamp does not resolve to a user of the same tenant
SELECT 'NETWORK_ELEMENT' AS t, n.ID FROM NETWORK_ELEMENT n
 LEFT JOIN USER u ON u.CUSTOMER_ID = n.CUSTOMER_ID AND u.ID = n.CREATOR WHERE u.ID IS NULL;
-- then, per table:
ALTER TABLE NETWORK_ELEMENT
  ADD CONSTRAINT FK_NETWORK_ELEMENT__CREATOR FOREIGN KEY (CUSTOMER_ID, CREATOR) REFERENCES USER (CUSTOMER_ID, ID),
  ADD CONSTRAINT FK_NETWORK_ELEMENT__LAST_MODIFIER FOREIGN KEY (CUSTOMER_ID, LAST_MODIFIER) REFERENCES USER (CUSTOMER_ID, ID);
```
Cost: two indexes per table (166 in total) on columns nobody queries by; this is why the trade-off was taken.

### Dimension 2 — Indexing & performance (score 9.5)

**F2 · Minor · Ten exact-column twin indexes duplicate the prefix of a wider composite.** `IDX_ANTENNA__SITE_ID_FK`, `IDX_ANTENNA__VENDOR_ID_FK`, `IDX_EQUIPMENT_COMPONENT__VENDOR_ID_FK`, `IDX_LINK__A_NETWORK_ELEMENT_ID_FK`, `IDX_LINK__Z_NETWORK_ELEMENT_ID_FK`, `IDX_NETWORK_ELEMENT__VENDOR_ID_FK`, `IDX_NETWORK_ELEMENT_PON_DETAIL__PARENT_OLT_NETWORK_ELEMENT_ID_FK`, `IDX_RECONCILIATION_RUN__RECONCILIATION_JOB_ID_FK`, `IDX_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID_FK`, `IDX_SITE_ISSUE__SITE_ID_FK`. A generic redundancy scan (or `sys.schema_redundant_indexes`) flags them, and they cost write amplification on insert-heavy tables such as `LINK`. They are **required**: the wider index in each case ends in a nullable column, and InnoDB does not enforce a foreign key on a row whose serving index has a NULL in a trailing column. The header explains the rule and the `_FK` suffix marks every such index. Nothing to change; keep the naming so future reviewers do not drop them.

### Dimension 3 — Data type & storage design (score 9.0)

**F3 · Minor · Generic column names are sized per entity.** `CODE` ranges from `VARCHAR(16)` (`DOMAIN`) to `VARCHAR(64)` (`RACK`, `CLOUD_CLUSTER`); `NAME` from 40 to 150; `STATUS` 16 / 24 / 32 depending on the longest value in that table's vocabulary. Concepts that are the same across tables are now identical (`RECORD_SOURCE`, `RECORD_STATE`, `FAILURE_REASON`, `MATCH_RULE`, `MATCH_CONFIDENCE`, `SCHEDULE_STATE`, IP columns `VARCHAR(45)`, MAC `CHAR(17)`, serial `VARCHAR(64)`, external ids `VARCHAR(128)`). The residual variation is by design and documented in the header; a strict shop may prefer one width per name:

```sql
-- example: one width for every CODE column
ALTER TABLE DOMAIN MODIFY CODE VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Domain code (RAN, CORE, TRANSPORT ...)';
```

**F4 · Minor · `STATUS` means seven different lifecycles.** `USER.STATUS` (ACTIVE / DISABLED), `SITE.STATUS` (rollout), `LINK.STATUS` (UP / DOWN plus BGP session states), `REPORT_RUN.STATUS` (run states) and others share a name with unrelated vocabularies. Each has its own CHECK, so integrity is not at risk, but a query writer must read the comment. Renaming to `ACCOUNT_STATUS`, `ROLLOUT_STATUS`, `LINK_STATUS`, `RUN_STATUS` would remove the ambiguity at the cost of a breaking rename across the API.

### Dimension 4 — Naming conventions (score 9.5)

**F5 · Minor · 35 constraint names are abbreviated to fit MySQL's 64-character limit.** For example `FK_NETWORK_ELEMENT_RAN_DETAIL__NE_TYPE_DETAIL_TABLE` and `CK_NE_SECURITY_DETAIL__HIGH_AVAILABILITY_MODE` use `NE_` where the table is `NETWORK_ELEMENT_…`, and some CHECKs drop the `_VALUES` suffix. The rule is deterministic and stated in the header (suffix dropped first, then `NETWORK_ELEMENT → NE`, `RECONCILIATION → RECON`, constraint names only), and the guideline checker knows it. No action; the alternative (shorter table names) would reintroduce the abbreviations the naming pass removed.

### Dimension 5 — Constraint completeness (score 9.5)

**F6 · Minor · Five signed measures carry no range CHECK.** `ANTENNA.GAIN_DBI`, `NETWORK_ELEMENT_MICROWAVE_DETAIL.ANTENNA_GAIN_DBI`, `NETWORK_ELEMENT_WIFI_DETAIL.TRANSMIT_POWER_DBM`, `NETWORK_ELEMENT_HEALTH.NTP_OFFSET_MS` (legitimately negative) and the generated `DOMAIN_TRUST_SNAPSHOT.TRUST_INDEX_PERCENT` (bounded by its inputs through `CK_DOMAIN_TRUST_SNAPSHOT__COUNTS`). Plausibility bounds would still catch typos:

```sql
ALTER TABLE ANTENNA ADD CONSTRAINT CK_ANTENNA__GAIN CHECK (GAIN_DBI IS NULL OR GAIN_DBI BETWEEN -10 AND 60);
ALTER TABLE NETWORK_ELEMENT_WIFI_DETAIL ADD CONSTRAINT CK_NETWORK_ELEMENT_WIFI_DETAIL__TRANSMIT_POWER CHECK (TRANSMIT_POWER_DBM IS NULL OR TRANSMIT_POWER_DBM BETWEEN -30 AND 60);
```

**F7 · Minor · Vocabularies are enforced per table, not by a governing table.** `RECORD_SOURCE` (five tables), `FAILURE_REASON` (three), `MATCH_RULE` (two) and `RECORD_STATE` (six) are identical CHECK lists repeated on every table. They are identical today (verified), but adding a value means editing every copy. The schema already uses the alternative pattern where it matters (`LINK_LAYER`, `SERVICE_TYPE`, `RECONCILIATION_STATE_MAP`); the remaining lists are small and stable, so this is a maintenance note rather than a defect:

```sql
-- if a shared vocabulary is wanted
CREATE TABLE RECORD_SOURCE (CODE VARCHAR(16) NOT NULL PRIMARY KEY COMMENT 'Origin of a discovered or planned row', NAME VARCHAR(64) NOT NULL);
-- then replace CK_<T>__RECORD_SOURCE_VALUES with FOREIGN KEY (RECORD_SOURCE) REFERENCES RECORD_SOURCE (CODE) on each table
```

### Dimension 6 — Normalization & redundancy control (score 9.0)

**F8 · Minor · Type codes are copied into child tables to make composite FKs possible.** `NETWORK_ELEMENT_TYPE` is repeated in the eleven detail tables, `RADIO_CELL.NODE_NETWORK_ELEMENT_TYPE`, `CELL_RADIO_UNIT.RADIO_UNIT_NETWORK_ELEMENT_TYPE`, `NETWORK_ELEMENT_RAN_DETAIL.CONTROLLER_NETWORK_ELEMENT_TYPE`; `RESOURCE_TYPE` is repeated in every subtype and in `RESOURCE_RELATIONSHIP` (from / to); `SYSTEM_TYPE` is copied into `EXTERNAL_RESOURCE`; `OPERATIONAL_AREA.PARENT_AREA_LEVEL` mirrors the parent's level. This is controlled denormalization: each copy is itself bound by a foreign key to the row it copies, so it cannot drift, and it is what lets the database (rather than the application) guarantee "a RAN detail row belongs to a RAN device". It costs a column per table and must be understood by anyone writing inserts. Documented in every affected column comment.

**F9 · Minor · A-end / Z-end columns on `LINK` and `LINK_PROTOCOL_ATTRIBUTE` are a fixed two-slot group.** `A_NETWORK_ELEMENT_ID_FK / A_PORT_ID_FK / A_IP_ADDRESS` and the `Z_` set, plus `INTERFACE_INDEX_A / _Z`. A link has exactly two ends, so the group never grows; a child `LINK_END` table would only add joins. Accepted as is.

### Dimension 7 — Security & sensitive data handling (score 10.0)

No findings. Credential-shaped columns: none store a secret (`VAULT_REFERENCE` only); `SCAN_STEP_PAYLOAD.CONTENT_ENCRYPTED` (`MEDIUMBLOB`) with `CONTENT_ENCRYPTION_IV`, `CONTENT_SHA256`, `ENCRYPTION_KEY_REFERENCE` and `PURGE_AFTER`; `SITE_CONTACT.PHONE_ENCRYPTED / EMAIL_ENCRYPTED` (`VARBINARY`) with IVs and key reference; `USER` carries no contact data. What the DDL cannot show: encryption at rest, column masking, grants and who holds the key references. Those belong to the deployment review.

### Dimension 8 — Documentation accuracy (score 9.5)

**F10 · Minor · Value lists are written twice.** 179 columns list their allowed values in the comment ("Values: …") and again in a CHECK. They match today (the guideline checker verifies that each such column has a CHECK or FK), but a future ALTER of a CHECK without the comment would leave the comment wrong. A generator, or a rule in the checker comparing the two lists, closes the gap:

```sql
-- candidate checker rule: comment values not equal to CHECK values
SELECT c.table_name, c.column_name FROM information_schema.columns c
 JOIN information_schema.check_constraints k ON k.constraint_schema = c.table_schema
  AND k.constraint_name IN (CONCAT('CK_', c.table_name, '__', c.column_name, '_VALUES'), CONCAT('CK_', c.table_name, '__', c.column_name))
 WHERE c.table_schema = DATABASE() AND c.column_comment LIKE '%Values: %'
   AND REPLACE(REPLACE(REPLACE(k.check_clause, '_utf8mb4', ''), '''', ''), ' ', '')
       NOT LIKE CONCAT('%', REPLACE(SUBSTRING_INDEX(c.column_comment, 'Values: ', -1), ', ', ','), '%');
```

---

## 5. Guideline compliance (`mysql_guidelines.md`)

| Guideline | Status | Evidence |
|---|---|---|
| §1 SNAKE_UPPER_CASE, singular, prefixed, consistent | Met | 0 casing violations; all table names singular; child tables prefixed (`NETWORK_ELEMENT_*`, `RECONCILIATION_*`, `RESOURCE_*`, `SCAN_*`, `SITE_*`, `LINK_*`, `RADIO_*`, `PORT_*`, `EXTERNAL_*`, `REPORT_*`); no unclear abbreviations in identifiers, industry acronyms listed in the header |
| §2 PK types | Met | `INT UNSIGNED` on tenant tables, `SMALLINT UNSIGNED` on global catalogs (except `PRODUCT_MODEL`, which can exceed 65k rows), `BIGINT UNSIGNED` on `USER`, `RESOURCE` and its satellites, scan and reconciliation result tables |
| §2 Booleans `TINYINT(1)` | Met | all 60 `IS_*` columns and flags |
| §2 Categories | Deviation, recorded | `VARCHAR` + CHECK instead of `ENUM` (project rule, JPA `@Enumerated(STRING)`); header explains |
| §2 VARCHAR vs TEXT, DECIMAL for money, NOT NULL / DEFAULT / UNIQUE | Met | no TEXT / FLOAT / DOUBLE; `DECIMAL` for `PURCHASE_COST`; defaults on every status; 192 unique keys |
| §3 Indexing | Met | all FK columns indexed; composites lead with `CUSTOMER_ID`; no index on a lone boolean or date; redundancy limited to the ten enforcement twins (F2) |
| §4 Relationships | Met | 303 explicit FKs; cascade only on composition; junction tables unique on their pair; no CSV columns; 3NF with documented controlled denormalization (F8) |
| §5 Documentation | Met | table banners with purpose, related tables and update date; every table and column commented |
| §6 Security | Met | no plaintext secrets; encrypted PII |
| §7 Audit tables | Deviation, recorded | no `*_AUD` tables: change history is owned by the separate Audit module; who / when stamps exist on every mutable table; append-only trails (`NETWORK_ELEMENT_MOVEMENT`, `RECONCILIATION_RULE_EVENT`) are business data and stay |

---

## 6. Diff against the v5 review

The v5 file (2026-09-27) was audited with the same method before this revision. Status of each v5 finding:

| v5 finding | Severity | Status in v6 |
|---|---|---|
| Comments claimed trigger-enforced append-only trails, cycle checks and stock-state enforcement, and referenced views `V_SCAN_RUN_SUMMARY` / `V_SITE_GEO_PATH`, none of which exist in the DDL | Major (documentation) | **Fixed** — 9 comments corrected to "enforced by the application" / "derived by the API"; historical "Successor of …" notes removed |
| `RECORD_SOURCE` vocabulary on `VLAN` / `VRF` (DISCOVERED, MANUAL, IMPORTED) differed from the five-value list on `NETWORK_ELEMENT`, `LINK`, `SERVICE_INSTANCE`, `RESOURCE_RELATIONSHIP` | Major (constraints / normalization) | **Fixed** — aligned |
| `MATCH_RULE` list on `SCAN_RUN_TARGET` lacked `EXTERNAL_ID`, `CELL_IDENTITY` present on `RECONCILIATION_RESULT` | Minor | **Fixed** — aligned |
| `UK_SERVICE_INSTANCE__CUSTOMER_ID_ID_SERVICE_TYPE` was a superset of `UK_SERVICE_INSTANCE__CUSTOMER_ID_ID` and no FK targeted it | Minor (indexing) | **Fixed** — dropped |
| Same column name, different width: `SCHEDULE_STATE` 8 / 16, `OUTCOME` 16 / 24, `STATE` 16 / 24, `CATEGORY` 16 / 24, `KIND` 8 / 16, `PROTECTION_SCHEME` 16 / 24, `PORT_COUNT` tinyint / smallint, `SEQUENCE_NUMBER` tinyint / smallint | Minor (types) | **Fixed** — widest width adopted |
| Same column name for different concepts: `RESOURCE_CLASS.LAYER` vs `LINK.LAYER`, `POWER_FEED.SOURCE` vs provenance `SOURCE`, `REPORT_RUN.FAILURE_REASON` (text) vs failure codes, `RECONCILIATION_RULE_CONDITION.CONNECTOR` vs `PORT.CONNECTOR`, `SCAN_RUN_TARGET.OUTCOME` vs result `OUTCOME`, `CREDENTIAL_PROFILE.PROTOCOL` vs step `PROTOCOL` | Minor (naming) | **Fixed** — renamed to `RESOURCE_LAYER`, `FEED_SOURCE`, `FAILURE_MESSAGE`, `CONDITION_CONNECTOR`, `TARGET_OUTCOME`, `ACCESS_PROTOCOL` |
| 13 decimal measures (capacities, rates, spacing, voltage, latency, margin, radius, MTTR) had no range CHECK | Minor (constraints) | **Fixed** — non-negative CHECKs added; the five signed measures remain as F6 |
| No index for the searches the screens perform on `SCAN_TARGET.HOST_NAME`, `RADIO_CELL.PHYSICAL_CELL_ID`, `SITE.NAME`, `EXTERNAL_RESOURCE.EXTERNAL_ID` | Minor (indexing) | **Fixed** — four composite indexes added |
| `TEAM_MEMBER` duplicated User Management membership; no table referenced it | Minor (ownership) | **Fixed** — table removed; `TEAM` kept as a CDC reference copy |
| `USER` comment claimed "13 FK columns" (v4 count) | Minor (documentation) | **Fixed** — now generated from the DDL (8) |
| Identifiers used CLASS / OBJECT words (`NETWORK_ELEMENT_CLASS`, `RESOURCE_CLASS`, `EXTERNAL_OBJECT_TYPE`, `COMPONENT_CLASS`, `FROM_CLASS`, `POE_CLASS`, `SYS_OBJECT_ID` and 40 more columns) | Style request | **Fixed** — renamed to `_TYPE` / `ENTITY_TYPE` / `SNMP_SYSTEM_OID`; 0 identifiers left |

Nothing from the v5 review is partially fixed or still open. The ten findings above are new observations at Minor severity and are all recorded trade-offs or optional hardening.

---

## 7. How to re-run this review

```sh
mysql -uroot -p -e "CREATE DATABASE inventory_review"
mysql -uroot -p inventory_review < db/inventory/inventory_schema.sql
mysql -uroot -p inventory_review < db/inventory/tests/inventory_guideline_checks.sql      # prints violations (none expected)
MYSQL="mysql -uroot -p" python3 db/inventory/tests/fk_index_check.py inventory_review   # expects "303 FK(s) checked, 0 bypassable"
# negative tests: each line of tests/v6_negative_tests.tsv must be rejected
```
