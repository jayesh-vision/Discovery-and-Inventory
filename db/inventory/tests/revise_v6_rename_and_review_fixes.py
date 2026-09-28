"""Stage 3: v5 (tables + data) -> v6 inventory_schema.sql
 - no CLASS / OBJECT words in identifiers
 - review fixes: vocabularies aligned, widths aligned, redundant UK dropped, TEAM_MEMBER dropped, measure CHECKs,
   search indexes, stale comments removed, header rewritten
Usage: python3 revise_v6.py <stage3_v5.sql> <out.sql>
"""
import re, sys
src, out = sys.argv[1], sys.argv[2]
txt = open(src).read()

def block(name):
    m = re.search(r'CREATE TABLE `%s` \(.*?\n\) ENGINE=[^\n]*;' % name, txt, re.S)
    assert m, name
    return m
def edit_block(name, fn):
    global txt
    m = block(name); new = fn(m.group(0)); assert new != m.group(0), name
    txt = txt[:m.start()] + new + txt[m.end():]
def drop_line(ddl, *pats):
    out = [ln for ln in ddl.split('\n') if not any(p in ln for p in pats)]
    return re.sub(r',\n\) ENGINE', '\n) ENGINE', '\n'.join(out))
def add_lines(ddl, lines):            # insert before the closing ") ENGINE"
    return re.sub(r'\n\) ENGINE', ',\n' + '\n'.join(lines) + '\n) ENGINE', ddl, count=1)

# ---------------------------------------------------------------- 1. targeted edits before the global renames
# TEAM_MEMBER: not required by Inventory (membership is a User Management fact)
m = block('TEAM_MEMBER'); s = txt.rfind('-- ----', 0, m.start()); s = txt.rfind('-- ----', 0, s - 1)
txt = txt[:s] + txt[m.end() + 1:]
txt = re.sub(r'INSERT INTO TEAM_MEMBER .*?;\n', '', txt, flags=re.S)
txt = txt.replace("COMMENT='Owning team or queue for exceptions and rules (e.g. Architecture, NOC Transport); \"Unassigned\" is the absence of a team. Kept pending validation: becomes a CDC reference copy if User Management provides groups. [v5, 2026-09-26]'",
                  "COMMENT='Reference copy of a User Management group used as owner queue of an exception, exception-reviewer team of a rule and owner of a site issue; rows arrive by CDC and are never created here. \"Unassigned\" is the absence of a team. [v6, 2026-09-28]'")
txt = re.sub(r', TEAM_MEMBER\b', '', txt)   # banner 'Related tables' lists

# RESOURCE_CLASS.LAYER -> RESOURCE_LAYER (same name as LINK.LAYER, different concept)
edit_block('RESOURCE_CLASS', lambda d: d.replace('`LAYER` varchar(8)', '`RESOURCE_LAYER` varchar(8)').replace('CK_RESOURCE_CLASS__LAYER_VALUES` CHECK ((`LAYER`', 'CK_RESOURCE_CLASS__RESOURCE_LAYER_VALUES` CHECK ((`RESOURCE_LAYER`'))
# POWER_FEED.SOURCE -> FEED_SOURCE (free text; SOURCE elsewhere is a code)
edit_block('POWER_FEED', lambda d: d.replace('`SOURCE` varchar(100)', '`FEED_SOURCE` varchar(100)'))
txt = txt.replace('INSERT INTO POWER_FEED (CUSTOMER_ID, SITE_ID_FK, CODE, KIND, SOURCE,', 'INSERT INTO POWER_FEED (CUSTOMER_ID, SITE_ID_FK, CODE, KIND, FEED_SOURCE,')
# REPORT_RUN.FAILURE_REASON -> FAILURE_MESSAGE (free text; FAILURE_REASON elsewhere is a code)
edit_block('REPORT_RUN', lambda d: d.replace('`FAILURE_REASON` varchar(255)', '`FAILURE_MESSAGE` varchar(255)').replace("(`STATUS` = _utf8mb4'FAILED') = (`FAILURE_REASON` is not null)", "(`STATUS` = _utf8mb4'FAILED') = (`FAILURE_MESSAGE` is not null)"))
txt = re.sub(r'(INSERT INTO REPORT_RUN \([^)]*)FAILURE_REASON', r'\1FAILURE_MESSAGE', txt)
# RECONCILIATION_RULE_CONDITION.CONNECTOR -> CONDITION_CONNECTOR (PORT.CONNECTOR is a physical connector)
edit_block('RECONCILIATION_RULE_CONDITION', lambda d: d.replace('`CONNECTOR` varchar(8)', '`CONDITION_CONNECTOR` varchar(8)').replace('CK_RECONCILIATION_RULE_CONDITION__CONNECTOR_VALUES` CHECK ((`CONNECTOR`', 'CK_RECONCILIATION_RULE_CONDITION__CONDITION_CONNECTOR_VALUES` CHECK ((`CONDITION_CONNECTOR`').replace("(`SEQUENCE_NUMBER` = 1) = (`CONNECTOR` is null)", "(`SEQUENCE_NUMBER` = 1) = (`CONDITION_CONNECTOR` is null)"))
txt = txt.replace('RECONCILIATION_RULE_ID_FK, SEQUENCE_NUMBER, CONNECTOR, SOURCE_FIELD_CODE', 'RECONCILIATION_RULE_ID_FK, SEQUENCE_NUMBER, CONDITION_CONNECTOR, SOURCE_FIELD_CODE')
# widths / types aligned for shared column names
edit_block('SCAN_JOB', lambda d: d.replace('`SCHEDULE_STATE` varchar(8)', '`SCHEDULE_STATE` varchar(16)'))
edit_block('SCAN_RUN_TARGET', lambda d: d.replace('`OUTCOME` varchar(16)', '`OUTCOME` varchar(24)')
           .replace("_utf8mb4'SYSNAME_AREA',_utf8mb4'MANAGEMENT_IP')))", "_utf8mb4'SYSNAME_AREA',_utf8mb4'MANAGEMENT_IP',_utf8mb4'EXTERNAL_ID',_utf8mb4'CELL_IDENTITY')))")
           .replace("Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP'", "Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP, EXTERNAL_ID, CELL_IDENTITY'"))
edit_block('RECONCILIATION_EXCEPTION', lambda d: d.replace('`STATE` varchar(16)', '`STATE` varchar(24)'))
edit_block('ANTENNA', lambda d: d.replace('`PORT_COUNT` tinyint unsigned', '`PORT_COUNT` smallint unsigned'))
edit_block('DISCOVERY_STEP_DEFINITION', lambda d: d.replace('`SEQUENCE_NUMBER` tinyint unsigned', '`SEQUENCE_NUMBER` smallint unsigned'))
edit_block('POWER_FEED', lambda d: d.replace('`KIND` varchar(8)', '`KIND` varchar(16)'))
edit_block('DISCREPANCY_TYPE', lambda d: d.replace('`CATEGORY` varchar(16)', '`CATEGORY` varchar(24)'))
edit_block('SITE', lambda d: d.replace('`CATEGORY` varchar(16)', '`CATEGORY` varchar(24)'))
edit_block('LINK_MICROWAVE_ATTRIBUTE', lambda d: d.replace('`PROTECTION_SCHEME` varchar(16)', '`PROTECTION_SCHEME` varchar(24)'))
# RECORD_SOURCE vocabulary aligned on VLAN / VRF
for t in ('VLAN', 'VRF'):
    edit_block(t, lambda d: d.replace("Values: DISCOVERED, MANUAL, IMPORTED'", "Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC'")
               .replace("(`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'MANUAL',_utf8mb4'IMPORTED'))", "(`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))"))
# redundant unique key (superset of UK_SERVICE_INSTANCE__CUSTOMER_ID_ID, referenced by no FK)
edit_block('SERVICE_INSTANCE', lambda d: drop_line(d, 'UK_SERVICE_INSTANCE__CUSTOMER_ID_ID_SERVICE_TYPE'))
# measure columns: non-negative CHECKs (signed by nature and left unchecked: dBm, dBi, NTP offset, tilts, lat/long)
NONNEG = {
 'DOMAIN_TRUST_SNAPSHOT': ['MTTR_HOURS'],
 'LINK_MICROWAVE_ATTRIBUTE': ['FADE_MARGIN_DB'],
 'NETWORK_ELEMENT_CORE_DETAIL': ['THROUGHPUT_CAPACITY_GBPS'],
 'NETWORK_ELEMENT_HEALTH': ['LATENCY_AVERAGE_MS'],
 'NETWORK_ELEMENT_IP_MPLS_DETAIL': ['BACKPLANE_CAPACITY_GBPS'],
 'NETWORK_ELEMENT_OPTICAL_DETAIL': ['CHANNEL_SPACING_GHZ', 'LINE_RATE_GBPS', 'MAX_CAPACITY_GBPS'],
 'NETWORK_ELEMENT_POWER_DETAIL': ['NOMINAL_DC_VOLTAGE', 'RATED_CAPACITY_KW'],
 'NETWORK_ELEMENT_SECURITY_DETAIL': ['THROUGHPUT_CAPACITY_GBPS'],
 'NETWORK_ELEMENT_SWITCH_DETAIL': ['UPLINK_CAPACITY_GBPS'],
 'NETWORK_ELEMENT_WIFI_DETAIL': ['COVERAGE_RADIUS_M'],
}
for t, cols in NONNEG.items():
    def ckname(t, c):
        n = 'CK_%s__%s_NON_NEGATIVE' % (t, c)
        return n if len(n) <= 64 else n.replace('NETWORK_ELEMENT_', 'NE_', 1)
    edit_block(t, lambda d, cols=cols, t=t: add_lines(d, ['  CONSTRAINT `%s` CHECK (((`%s` is null) or (`%s` >= 0)))%s' % (ckname(t, c), c, c, ',' if i < len(cols) - 1 else '') for i, c in enumerate(cols)]))
# search indexes the screens need (composite with the tenant key first)
IDX = {
 'SCAN_TARGET': [('HOST_NAME', '(`CUSTOMER_ID`,`HOST_NAME`)')],
 'RADIO_CELL': [('PHYSICAL_CELL_ID', '(`CUSTOMER_ID`,`PHYSICAL_CELL_ID`)')],
 'SITE': [('NAME', '(`CUSTOMER_ID`,`NAME`)')],
 'EXTERNAL_RESOURCE': [('EXTERNAL_ID', '(`CUSTOMER_ID`,`EXTERNAL_ID`)')],
}
def add_idx(d, t, items):
    lines = ['  KEY `IDX_%s__%s` %s,' % (t, n, c) for n, c in items]
    i = d.index('  CONSTRAINT `')          # keys go before the constraints
    return d[:i] + '\n'.join(lines) + '\n' + d[i:]
for t, items in IDX.items():
    edit_block(t, lambda d, t=t, items=items: add_idx(d, t, items))

# stale comments: triggers and views do not exist; historical table names removed
REPL = [
 ("Append-only (trigger-enforced) stock movement", "Append-only stock movement (the application never updates or deletes rows)"),
 ("Append-only (trigger-enforced) approval / lifecycle trail of a rule; the FK to RECONCILIATION_RULE_TRANSITION rejects illegal moves.", "Append-only approval / lifecycle trail of a rule (the application never updates or deletes rows); the FK to RECONCILIATION_RULE_TRANSITION rejects illegal moves."),
 ("Target counts are derived from SCAN_RUN_TARGET (V_SCAN_RUN_SUMMARY). Successor of DISCOVERY_RUN, whose key was a counter named DISCOVERY_COUNT.", "Target counts are derived from SCAN_RUN_TARGET by the API."),
 ("lowest administrative area; L1-L3 are derived through the chain (V_SITE_GEO_PATH)", "lowest administrative area; levels 1-3 are derived through the chain by the API"),
 ("cycles blocked by trigger", "cycles rejected by the application"),
 ("moves limited to NETWORK_ELEMENT_STOCK_TRANSITION by trigger.", "moves limited to NETWORK_ELEMENT_STOCK_TRANSITION by the application."),
 ("1 when the relationship may not form a cycle (checked by trigger)", "1 when the relationship may not form a cycle (checked by the application)"),
 ("Successor of ICMP_INFO and NTP_INFO; history belongs to PM.", "History belongs to performance management."),
 ("Successor of GENERATED_REPORTS.", ""),
 ("(facility view)", "(facility tab)"),
]
for a, b in REPL:
    assert a in txt, a
    txt = txt.replace(a, b)
comments = re.findall(r"COMMENT[= ]'((?:[^']|'')*)'", txt)
stale = [c for c in comments if re.search(r"by trigger|trigger-enforced|\bV_[A-Z_]+|Successor of|\bDISCOVERY_RUN\b|ICMP_INFO|GENERATED_REPORTS|\bNE_DETAIL\b", c)]
assert not stale, stale[:3]

# ---------------------------------------------------------------- 2. global renames: no CLASS / OBJECT in identifiers
RENAMES = [
 (r'NETWORK_ELEMENT_CLASS', 'NETWORK_ELEMENT_TYPE'),
 (r'RESOURCE_CLASS', 'RESOURCE_TYPE'),
 (r'EXTERNAL_OBJECT_TYPE', 'EXTERNAL_ENTITY_TYPE'),
 (r'(?<![A-Z_])OBJECT_TYPE', 'ENTITY_TYPE'),
 (r'COMPONENT_CLASS', 'COMPONENT_TYPE'),
 (r'\bFROM_CLASS\b', 'FROM_RESOURCE_TYPE'),
 (r'\bTO_CLASS\b', 'TO_RESOURCE_TYPE'),
 (r'POE_CLASS', 'POE_LEVEL'),
 (r'DERIVED_SYS_OBJECT_ID', 'DERIVED_SNMP_OID'),
 (r'SYS_OBJECT_ID', 'SNMP_SYSTEM_OID'),
 (r'CLASSES`', 'TYPES`'),                       # CK_..._VIRTUAL_INSTANCE__CLASSES
 (r'NODE_CLASS`', 'NODE_TYPE`'),                # CK_RADIO_CELL__NODE_CLASS
]
for p, r in RENAMES:
    txt = re.sub(p, r, txt)
# constraint / index names that still carry the old words (abbreviated forms)
SPECIAL = {'UK_ATTRIBUTE_DEFINITION__ID_CLASS_TYPE': 'UK_ATTRIBUTE_DEFINITION__ID_RESOURCE_TYPE_DATA_TYPE',
           'CK_CELL_RADIO_UNIT__CLASS': 'CK_CELL_RADIO_UNIT__RADIO_UNIT_TYPE',
           'IDX_NETWORK_ELEMENT__VENDOR_MODEL_CLASS': 'IDX_NETWORK_ELEMENT__VENDOR_MODEL_TYPE'}
for a, b in SPECIAL.items():
    assert '`%s`' % a in txt, a
    txt = txt.replace('`%s`' % a, '`%s`' % b)
def fix_ident(m):
    i = m.group(1)
    if 'CLASS' in i or 'OBJECT' in i:
        i = i.replace('OBJECT_TYPE', 'ENTITY_TYPE').replace('OBJECT', 'ENTITY').replace('CLASS', 'TYPE')
    return '`%s`' % i
txt = re.sub(r'`(\w+)`', fix_ident, txt)
bad = sorted({i for i in re.findall(r'`(\w+)`', txt) if 'CLASS' in i or 'OBJECT' in i})
assert not bad, bad
bad = [i for i in re.findall(r'`(\w+)`', txt) if len(i) > 64]
assert not bad, bad
# prose in comments: "class" -> "type" where it names the renamed concepts
txt = txt.replace('Device-class catalog', 'Device-type catalog').replace('Class of every RESOURCE row', 'Type of every RESOURCE row').replace('Allowed (device class, network domain) pairs', 'Allowed (device type, network domain) pairs')
txt = re.sub(r"(?i)\bresource class(es)?\b", lambda m: 'resource type' + (m.group(1) or ''), txt)
txt = re.sub(r"(?i)\bdevice class(es)?\b", lambda m: 'device type' + (m.group(1) or ''), txt)
txt = txt.replace('Type of externally owned object that may be proxied here.', 'Type of externally owned entity (fiber span, passive asset, CMDB item ...) that may be proxied here.')

# SCAN_RUN_TARGET.OUTCOME is the target-outcome vocabulary (RECONCILIATION_STATE_MAP.TARGET_OUTCOME), not the result outcome
edit_block('SCAN_RUN_TARGET', lambda d: d.replace('`OUTCOME` varchar(24)', '`TARGET_OUTCOME` varchar(24)').replace('CK_SCAN_RUN_TARGET__OUTCOME_VALUES` CHECK ((`OUTCOME`', 'CK_SCAN_RUN_TARGET__TARGET_OUTCOME_VALUES` CHECK ((`TARGET_OUTCOME`'))
txt = txt.replace('SCAN_RUN_ID_FK, SCAN_TARGET_ID_FK, STATUS, OUTCOME, FAILURE_REASON', 'SCAN_RUN_ID_FK, SCAN_TARGET_ID_FK, STATUS, TARGET_OUTCOME, FAILURE_REASON')
# CREDENTIAL_PROFILE.PROTOCOL is the access protocol of a credential, not a collector step protocol
edit_block('CREDENTIAL_PROFILE', lambda d: d.replace('`PROTOCOL` varchar(16)', '`ACCESS_PROTOCOL` varchar(16)').replace('CK_CREDENTIAL_PROFILE__PROTOCOL_VALUES` CHECK ((`PROTOCOL`', 'CK_CREDENTIAL_PROFILE__ACCESS_PROTOCOL_VALUES` CHECK ((`ACCESS_PROTOCOL`'))
txt = txt.replace('INSERT INTO CREDENTIAL_PROFILE (ID, CUSTOMER_ID, CODE, PROTOCOL,', 'INSERT INTO CREDENTIAL_PROFILE (ID, CUSTOMER_ID, CODE, ACCESS_PROTOCOL,')
# comment prose: the concept is now called "type"
def fix_comment(m):
    c = m.group(2)
    c = re.sub(r'\bNE class\b', 'NE type', c)
    c = re.sub(r'\bclasses\b', 'types', c); c = re.sub(r'\bClasses\b', 'Types', c)
    c = re.sub(r'\bclass\b', 'type', c); c = re.sub(r'\bClass\b', 'Type', c)
    return m.group(1) + c + "'"
txt = re.sub(r"(COMMENT[= ]')((?:[^']|'')*)'", fix_comment, txt)
assert not re.search(r"COMMENT[= ]'(?:[^']|'')*\bclass(?:es)?\b", txt, re.I)

# ---------------------------------------------------------------- 3. header
HEAD_START = txt.index('-- ===='); HEAD_END = txt.index('SET NAMES utf8mb4;')
n_tables = len(re.findall(r'CREATE TABLE `', txt))
user_fk = len(re.findall(r'REFERENCES `USER` \(', txt))
HEADER = """-- =====================================================================================================================
-- INVENTORY schema v6  (2026-09-28)  -  MySQL 8.0.16+ / 9.x, InnoDB, utf8mb4
-- ---------------------------------------------------------------------------------------------------------------------
-- Contents: %d tables, foreign keys, CHECK / UNIQUE constraints, catalog seed data and a small dummy data set.
--           No views, triggers, procedures or events: derived figures, cycle checks and append-only trails are
--           enforced by the application / API layer.
-- Lineage: v4 mysqldump (2026-09-24) -> v5 (ownership split, naming pass, 2026-09-26/27) -> v6 (this file).
-- Reference documents: db/inventory/INVENTORY_DATABASE_MODULE_CATEGORIZATION.md, DATABASE_UI_MODULE_IDEATION.md,
--   INVENTORY_V5_TABLE_USAGE_AND_MOCK_API.md, DATABASE_REVIEW_REPORT.md (audit of this file).
--
-- v6 changes
--   NAMING: no CLASS / OBJECT words in identifiers.
--     NETWORK_ELEMENT_CLASS -> NETWORK_ELEMENT_TYPE (table, *_CLASS columns -> *_TYPE, NETWORK_ELEMENT_CLASS_DOMAIN -> NETWORK_ELEMENT_TYPE_DOMAIN)
--     RESOURCE_CLASS -> RESOURCE_TYPE (table and every RESOURCE_CLASS / FROM_ / TO_ / HOST_ column); RESOURCE_TYPE.LAYER -> RESOURCE_LAYER
--     EXTERNAL_OBJECT_TYPE -> EXTERNAL_ENTITY_TYPE, EXTERNAL_RESOURCE.OBJECT_TYPE -> ENTITY_TYPE
--     EQUIPMENT_COMPONENT.COMPONENT_CLASS -> COMPONENT_TYPE; RELATIONSHIP_RULE.FROM_CLASS / TO_CLASS -> FROM_RESOURCE_TYPE / TO_RESOURCE_TYPE
--     NETWORK_ELEMENT_WIFI_DETAIL.POE_CLASS -> POE_LEVEL; PRODUCT_MODEL.SYS_OBJECT_ID -> SNMP_SYSTEM_OID (VENDOR prefix column likewise)
--     Shared names that meant different things were separated: POWER_FEED.SOURCE -> FEED_SOURCE, REPORT_RUN.FAILURE_REASON ->
--     FAILURE_MESSAGE, RECONCILIATION_RULE_CONDITION.CONNECTOR -> CONDITION_CONNECTOR, SCAN_RUN_TARGET.OUTCOME -> TARGET_OUTCOME,
--     CREDENTIAL_PROFILE.PROTOCOL -> ACCESS_PROTOCOL.
--   OWNERSHIP: TEAM_MEMBER removed (membership is a User Management fact served by API); TEAM kept as a CDC reference copy.
--   REVIEW FIXES: RECORD_SOURCE vocabulary aligned on VLAN / VRF; MATCH_RULE vocabulary aligned on SCAN_RUN_TARGET; widths of
--     SCHEDULE_STATE, OUTCOME, STATE, CATEGORY, KIND, PROTECTION_SCHEME, PORT_COUNT and SEQUENCE_NUMBER aligned across tables;
--     redundant UK_SERVICE_INSTANCE__CUSTOMER_ID_ID_SERVICE_TYPE dropped; non-negative CHECKs on capacity / rate / voltage /
--     latency / margin measures (dBm, dBi, NTP offset, tilts, latitude / longitude are signed by nature and unchecked;
--     TRUST_INDEX_PERCENT is generated from the bounded IN_SYNC / IN_SCOPE counts); search indexes on target host name, cell PCI, site name and external id; comments that described triggers or views
--     that are not part of this schema were corrected.
--
-- Conventions
--   Naming (mysql_guidelines.md s1): SNAKE_UPPER_CASE, singular table names, child tables prefixed with the parent name.
--     PK = ID. Surrogate foreign keys end in _ID_FK; natural-key foreign keys end in _CODE or carry the referenced name
--     (LAYER, SYSTEM_TYPE, ENTITY_TYPE, RELATIONSHIP_TYPE, FROM_STATE ...). Booleans IS_<X>. Times <X>_TIME (DATETIME(3),
--     UTC), dates <X>_DATE, counts <X>_COUNT, units as suffix (_MHZ _GHZ _DBM _DBI _DEG _M _KM _KW _W _GB _MBPS _GBPS _MS
--     _PERCENT). Constraints UK_<TABLE>__<COLS>, FK_<TABLE>__<COL>, IDX_<TABLE>__<COLS>, CK_<TABLE>__<RULE>; when a name
--     would exceed 64 characters the _VALUES suffix is dropped first, then NETWORK_ELEMENT / RECONCILIATION are abbreviated
--     to NE / RECON inside the constraint name only.
--   Tenancy: CUSTOMER_ID (TENANT.ID) on every tenant table; FKs between tenant tables are composite (CUSTOMER_ID, ...)
--     so a row can never reference another tenant's row. Global catalogs carry no CUSTOMER_ID.
--   Categories: VARCHAR + CHECK (CK_<TABLE>__<COL>_VALUES) instead of ENUM (project rule: maps to JPA @Enumerated(STRING),
--     new values are a constraint change, not a table rebuild). STATUS / STATE / CATEGORY / KIND are per-entity vocabularies
--     sized to their own value list; vocabularies that are shared (RECORD_SOURCE, RECORD_STATE, FAILURE_REASON, MATCH_RULE,
--     MATCH_CONFIDENCE, OUTCOME) are identical wherever they appear.
--   Soft delete: IS_DELETED + generated LIVE_FLAG (master data) or RECORD_STATE + generated ACTIVE_FLAG (discovered data);
--     LIVE_FLAG / ACTIVE_FLAG are the last column of the natural unique key so deleted rows do not block re-use of a code.
--     Other nullable columns inside unique keys are deliberate: NULL means "not identified" and must not collide
--     (SCAN_TARGET external id vs IP, RADIO_CELL cell key, RESOURCE_ASSET asset tag, PORT transceiver, PRODUCT_MODEL OID).
--   Audit: CREATED_TIME / CREATOR / MODIFIED_TIME / LAST_MODIFIER / ROW_VERSION on every mutable table (Spring Data
--     auditing + optimistic locking). CREATOR / LAST_MODIFIER hold USER.ID as an application stamp without a foreign key:
--     users are never hard-deleted and row history is owned by the separate Audit module (no *_AUD tables here).
--   Foreign-key indexes: InnoDB enforces a foreign key through the first index whose leading columns are the FK columns and
--     skips the check when a later column of that index is NULL. Where the natural composite index has a nullable trailing
--     column, an exact-column twin index named IDX_<TABLE>__<COL>_FK is defined first; it is required for enforcement, not
--     redundant. Composite unique keys never place a foreign-key column in front of a nullable column for the same reason.
--   Security: no passwords or secrets; CREDENTIAL_PROFILE / EXTERNAL_SYSTEM hold a VAULT_REFERENCE only. Raw collector
--     payloads (SCAN_STEP_PAYLOAD) and site-contact phone / e-mail are AES-encrypted with a key reference; USER holds no PII.
--     Encryption at rest, masking and access control are outside this DDL.
--   Ownership: USER, TENANT and TEAM are CDC reference copies from User Management / platform. SCAN_*, COLLECTOR,
--     CREDENTIAL_PROFILE, DISCOVERY_STEP_DEFINITION, RECONCILIATION_JOB / RUN / RESULT families, REPORT_RUN, NETWORK_ELEMENT_HEALTH,
--     RESOURCE_FIELD_PROVENANCE and DOMAIN_TRUST_SNAPSHOT are written by integration pipelines and read by the UI. Passive
--     Inventory and Open / CoPEX data are not stored here; EXTERNAL_RESOURCE proxies (SYSTEM_TYPE PASSIVE_INVENTORY /
--     FIBER_INVENTORY) carry ids and a label cache only.
--
-- Usage:  mysql -u<user> -p <database> < inventory_schema.sql
--         Tables are emitted alphabetically; FOREIGN_KEY_CHECKS is off while tables are created, on for the data.
-- =====================================================================================================================
""" % n_tables
txt = txt[:HEAD_START] + HEADER + txt[HEAD_END:]
txt = txt.replace('-- end of inventory_schema_v5.sql', '-- end of inventory_schema.sql')
txt = re.sub(r'\[v5, 2026-09-2[67]\]', '[v6, 2026-09-28]', txt)
txt = txt.replace('-- Updated: 2026-09-27', '-- Updated: 2026-09-28')
txt = txt.replace("Reference copy of User Management users, kept only because 13 FK columns need it", "Reference copy of User Management users, kept only because %d FK relationships need it" % user_fk)
txt = re.sub(r'^-- Related tables: (.*)TEAM_MEMBER,? ?', lambda m: '-- Related tables: ' + m.group(1).rstrip(', '), txt, flags=re.M)
left = [l for l in txt.splitlines() if 'TEAM_MEMBER' in l and not l.startswith('--   OWNERSHIP')]
assert not left, left[:3]
open(out, 'w').write(txt)
print('tables', n_tables, 'USER fk refs', user_fk)
