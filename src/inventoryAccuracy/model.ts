/* ── Inventory Assurance: shared types ─────────────────────────────────────
   One model shared by the upload wizard, the rule engine, reconciliation,
   scoring and every screen — no screen keeps its own copy of a rule or an
   execution. This app has no backend (see src/dcim/model.ts for the same
   note on the Datacenter side): everything here is computed in the browser
   and persisted to localStorage by store.ts. Scoped to the Telecom estate
   only — it reads src/data/physical.ts, locations.ts and facility.ts,
   never src/data/dc/*. */

export type AccuracyEntityType = 'networkElement' | 'site' | 'fiberCable';
export const ENTITY_TYPES: AccuracyEntityType[] = ['site', 'fiberCable', 'networkElement'];
export const ENTITY_LABEL: Record<AccuracyEntityType, string> = {
  networkElement: 'Network Elements',
  site: 'Sites & Locations',
  fiberCable: 'Fiber Cabling'
};

export type RuleCategory = 'mandatory' | 'uniqueness' | 'referential' | 'domain' | 'geographic';
export const RULE_CATEGORIES: RuleCategory[] = ['mandatory', 'uniqueness', 'referential', 'domain', 'geographic'];
export const RULE_CATEGORY_LABEL: Record<RuleCategory, string> = {
  mandatory: 'Mandatory field', uniqueness: 'Uniqueness', referential: 'Referential integrity',
  domain: 'Domain-specific', geographic: 'Geographic'
};

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';
export const RULE_SEVERITIES: RuleSeverity[] = ['critical', 'high', 'medium', 'low'];

/** A closed set of safe predicates — never eval()/new Function() on a
    user-configured string. A rule's condition is one of these plus the
    arguments it needs. */
export type Operator = 'required' | 'equals' | 'notEquals' | 'unique' | 'range' | 'regex' | 'refExists' | 'oneOf' | 'geoLat' | 'geoLon';

export interface Condition {
  operator: Operator;
  value?: string;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
  /** for 'refExists': which entity type the field must be found in */
  refEntity?: AccuracyEntityType;
}

export type RuleStatus = 'Draft' | 'Review' | 'Approved' | 'Active' | 'Suspended' | 'Retired';
export const RULE_LIFECYCLE: RuleStatus[] = ['Draft', 'Review', 'Approved', 'Active', 'Suspended', 'Retired'];

export interface ApprovalEvent { at: string; by: string; action: string; note?: string }
export interface ActivityEvent { at: string; by: string; event: string }
export interface RuleExecutionRun { at: string; applicable: number; failed: number; passPct: number }

export interface Rule {
  id: string;
  name: string;
  description: string;
  entityType: AccuracyEntityType;
  /** uploaded field key this rule checks (schema.ts FieldDef.key) */
  field: string;
  category: RuleCategory;
  condition: Condition;
  severity: RuleSeverity;
  /** relative importance, 1–100; used by scoring.ts */
  weight: number;
  message: string;
  active: boolean;
  vendor?: string;
  effectiveDate?: string;
  status: RuleStatus;
  owner: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  approvalHistory: ApprovalEvent[];
  activity: ActivityEvent[];
  executions: RuleExecutionRun[];
}

export type ReconciliationOutcome = 'NEW' | 'MATCHED' | 'MODIFIED' | 'MISSING' | 'DUPLICATE' | 'CONFLICT' | 'INVALID';
export const RECONCILIATION_OUTCOMES: ReconciliationOutcome[] = ['NEW', 'MATCHED', 'MODIFIED', 'MISSING', 'DUPLICATE', 'CONFLICT', 'INVALID'];

export interface FieldChange { field: string; existing: string; uploaded: string }

export interface ReconciliationRecord {
  key: string;
  entityType: AccuracyEntityType;
  resourceId: string;
  resourceName: string;
  outcome: ReconciliationOutcome;
  changes: FieldChange[];
  existing?: Record<string, string>;
  uploaded?: Record<string, string>;
  recommendation: string;
  decision?: 'accept' | 'retain' | 'resolved' | 'ignored' | 'approved' | 'rejected';
  decidedAt?: string;
  decidedBy?: string;
}

export type IssueStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Accepted Exception' | 'Rejected';
export const ISSUE_STATUSES: IssueStatus[] = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Accepted Exception', 'Rejected'];

export interface QualityIssue {
  id: string;
  executionId: string;
  entityType: AccuracyEntityType;
  resourceId: string;
  resourceName: string;
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: RuleSeverity;
  description: string;
  existingValue?: string;
  uploadedValue?: string;
  recommendation: string;
  vendor?: string;
  geography?: string;
  assignee?: string;
  status: IssueStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface RuleResult {
  ruleId: string; ruleName: string; category: RuleCategory; severity: RuleSeverity; weight: number;
  applicable: number; failed: number; excluded: number; passPct: number;
}

export type AccuracyClassification = 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';

export interface AccuracyThresholds { excellent: number; good: number; needsImprovement: number }
export const DEFAULT_THRESHOLDS: AccuracyThresholds = { excellent: 95, good: 85, needsImprovement: 70 };

export type ImportMode = 'new' | 'update' | 'upsert';

export interface AccuracyExecution {
  id: string;
  entityType: AccuracyEntityType;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  importMode: ImportMode;
  ruleSetVersion: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  missingAttributeRecords: number;
  relationshipMismatchRecords: number;
  reconciliation: Record<ReconciliationOutcome, number>;
  ruleResults: RuleResult[];
  score: number;
  classification: AccuracyClassification;
  committed: boolean;
  committedAt?: string;
  committedBy?: string;
}
