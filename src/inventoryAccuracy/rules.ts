/* ── Inventory Assurance rules: the configurable rule set ──────────────────
   A seeded default rule set (one per PRD category × entity type), persisted
   to localStorage the same way src/data/rules.ts persists Reconciliation's
   rules — this is the one thing in this feature (besides execution/issue
   history in store.ts) that survives a reload. A rule's condition is never
   arbitrary code: it is one of engine.ts's closed predicate set. */
import type { Rule, RuleCategory, RuleSeverity, RuleStatus } from './model';
import { TELECOM_NE_CLASSES } from './schema';

const KEY = 'ns.inventoryAccuracy.rules.v1';
const NOW = '30-Oct-2026';

function rule(
  id: string, name: string, description: string, entityType: Rule['entityType'], field: string,
  category: RuleCategory, condition: Rule['condition'], severity: RuleSeverity, weight: number, message: string
): Rule {
  return {
    id, name, description, entityType, field, category, condition, severity, weight, message,
    active: true, status: 'Active', owner: 'Data Quality Team', createdBy: 'System', createdDate: NOW, lastUpdated: NOW,
    approvalHistory: [{ at: NOW, by: 'System', action: 'Activated', note: 'Seeded default rule' }],
    activity: [{ at: NOW, by: 'System', event: 'Rule activated' }],
    executions: []
  };
}

export const DEFAULT_RULES: Rule[] = [
  rule('RUL-IA-NE-001', 'Resource ID is mandatory', 'Every network element must have a unique resource ID.', 'networkElement', 'resourceId',
    'mandatory', { operator: 'required' }, 'critical', 25, 'ResourceId is required for every network element.'),
  rule('RUL-IA-NE-002', 'Device name is mandatory', 'Every network element must have a device name.', 'networkElement', 'deviceName',
    'mandatory', { operator: 'required' }, 'high', 10, 'DeviceName is required.'),
  rule('RUL-IA-NE-003', 'Vendor is mandatory', 'Every network element must have a vendor.', 'networkElement', 'vendor',
    'mandatory', { operator: 'required' }, 'high', 15, 'Vendor is required.'),
  rule('RUL-IA-NE-004', 'Model is mandatory', 'Every network element must have a model.', 'networkElement', 'model',
    'mandatory', { operator: 'required' }, 'medium', 10, 'Model is required.'),
  rule('RUL-IA-NE-005', 'Management IP is mandatory', 'Every network element must have a management IP, where applicable.', 'networkElement', 'managementIp',
    'domain', { operator: 'required' }, 'high', 20, 'ManagementIp is required (or is not a valid IPv4/IPv6 address).'),
  rule('RUL-IA-NE-006', 'Resource ID must be unique', 'Resource ID must be unique across the uploaded set.', 'networkElement', 'resourceId',
    'uniqueness', { operator: 'unique' }, 'critical', 20, 'ResourceId is duplicated.'),
  rule('RUL-IA-NE-007', 'Serial number must be unique', 'Serial number must be unique where applicable.', 'networkElement', 'serialNumber',
    'uniqueness', { operator: 'unique' }, 'medium', 10, 'SerialNumber is duplicated.'),
  rule('RUL-IA-NE-008', 'Management IP must not be duplicated', 'Management IP must not be duplicated where uniqueness is required.', 'networkElement', 'managementIp',
    'uniqueness', { operator: 'unique' }, 'medium', 10, 'ManagementIp is duplicated.'),
  rule('RUL-IA-NE-009', 'Parent site must exist', 'Every network element must reference a valid site, where applicable.', 'networkElement', 'parentSiteId',
    'referential', { operator: 'refExists', refEntity: 'site' }, 'critical', 20, 'ParentSiteId does not exist in Sites.'),
  rule('RUL-IA-NE-010', 'Class must be a recognised type', 'A network element must have a valid device class.', 'networkElement', 'neClass',
    'domain', { operator: 'oneOf', options: [...TELECOM_NE_CLASSES] }, 'low', 5, 'Class is not a recognised network element type.'),

  rule('RUL-IA-SITE-001', 'Site ID is mandatory', 'Every site must have a unique site ID.', 'site', 'siteId',
    'mandatory', { operator: 'required' }, 'critical', 25, 'SiteId is required.'),
  rule('RUL-IA-SITE-002', 'Site name is mandatory', 'Every site must have a name.', 'site', 'siteName',
    'mandatory', { operator: 'required' }, 'high', 15, 'SiteName is required.'),
  rule('RUL-IA-SITE-003', 'Site ID must be unique', 'Site ID must be unique across the uploaded set.', 'site', 'siteId',
    'uniqueness', { operator: 'unique' }, 'critical', 20, 'SiteId is duplicated.'),
  rule('RUL-IA-SITE-004', 'Latitude must be valid', 'Latitude must be between -90 and 90.', 'site', 'latitude',
    'geographic', { operator: 'range', min: -90, max: 90 }, 'high', 15, 'Latitude is outside -90..90.'),
  rule('RUL-IA-SITE-005', 'Longitude must be valid', 'Longitude must be between -180 and 180.', 'site', 'longitude',
    'geographic', { operator: 'range', min: -180, max: 180 }, 'high', 15, 'Longitude is outside -180..180.'),
  rule('RUL-IA-SITE-006', 'Site must have coordinates', "A site's location must exist — GIS positioning is mandatory.", 'site', 'latitude',
    'geographic', { operator: 'required' }, 'medium', 10, 'Latitude/Longitude is missing; GIS positioning is required for this site.'),

  rule('RUL-IA-FC-001', 'Cable ID is mandatory', 'Every fiber cable must have a unique cable identifier.', 'fiberCable', 'cableId',
    'mandatory', { operator: 'required' }, 'critical', 25, 'CableId is required.'),
  rule('RUL-IA-FC-002', 'Cable ID must be unique', 'Cable identifier must be unique.', 'fiberCable', 'cableId',
    'uniqueness', { operator: 'unique' }, 'critical', 20, 'CableId is duplicated.'),
  rule('RUL-IA-FC-003', 'Site must exist', 'Every fiber cable must reference a valid site.', 'fiberCable', 'siteId',
    'referential', { operator: 'refExists', refEntity: 'site' }, 'critical', 20, 'SiteId does not exist in Sites.'),
  rule('RUL-IA-FC-004', 'Core number must be valid', "A fiber cable's core number must be greater than zero and within the tray's 24 cores.", 'fiberCable', 'coreNumber',
    'domain', { operator: 'range', min: 1, max: 24 }, 'high', 15, 'CoreNumber must be between 1 and 24.'),
  rule('RUL-IA-FC-005', 'Cable kind is mandatory', 'Every fiber cable must record whether it is Fibre or Copper.', 'fiberCable', 'cableKind',
    'mandatory', { operator: 'required' }, 'medium', 10, 'Kind is required.'),
  rule('RUL-IA-FC-006', 'Cable state is mandatory', 'Every fiber cable must record its state.', 'fiberCable', 'cableState',
    'mandatory', { operator: 'required' }, 'medium', 10, 'State is required.')
];

function readStorage(): Rule[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Rule[]) : null;
  } catch { return null; }
}

let CACHE: Rule[] | null = null;

export function loadRules(): Rule[] {
  if (CACHE) return CACHE;
  CACHE = readStorage() ?? DEFAULT_RULES.map(r => ({ ...r }));
  return CACHE;
}

export function persistRules(rules: Rule[]) {
  CACHE = rules;
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(rules));
  } catch { /* private mode / quota — edits stay in-tab only, same degrade-gracefully contract as src/data/rules.ts */ }
}

export const ruleById = (id: string): Rule | undefined => loadRules().find(r => r.id === id);
export const rulesFor = (entityType: Rule['entityType']): Rule[] => loadRules().filter(r => r.entityType === entityType);
export const activeRulesFor = (entityType: Rule['entityType']): Rule[] => rulesFor(entityType).filter(r => r.active && r.status === 'Active');

export function nextRuleId(entityType: Rule['entityType']): string {
  const prefix = entityType === 'networkElement' ? 'NE' : entityType === 'site' ? 'SITE' : 'FC';
  const existing = loadRules().filter(r => r.id.startsWith(`RUL-IA-${prefix}-`));
  const n = existing.length + 1;
  return `RUL-IA-${prefix}-${String(n).padStart(3, '0')}`;
}

export function saveRule(rule: Rule) {
  const rules = loadRules();
  const next = rules.some(r => r.id === rule.id) ? rules.map(r => r.id === rule.id ? rule : r) : [...rules, rule];
  persistRules(next);
}

export function deleteRule(id: string) {
  persistRules(loadRules().filter(r => r.id !== id));
}

export const RULE_STATUS_NEXT: Record<RuleStatus, { action: string; to: RuleStatus } | null> = {
  Draft: { action: 'Submit for review', to: 'Review' },
  Review: { action: 'Approve', to: 'Approved' },
  Approved: { action: 'Activate', to: 'Active' },
  Active: { action: 'Suspend', to: 'Suspended' },
  Suspended: { action: 'Reactivate', to: 'Active' },
  Retired: null
};

export function transitionRule(id: string, to: RuleStatus, action: string, by: string, note?: string) {
  const rules = loadRules();
  const next = rules.map(r => r.id !== id ? r : {
    ...r,
    status: to,
    active: to === 'Active',
    lastUpdated: NOW,
    approvalHistory: [...r.approvalHistory, { at: NOW, by, action, note }],
    activity: [...r.activity, { at: NOW, by, event: `${action} — status now ${to}` }]
  });
  persistRules(next);
}
