/* ── Reconciliation rules ──────────────────────────────────
   Mock data for Reconciliation → Rules: the rule roster, its lifecycle,
   who's responsible for each stage, and the matching-condition shape the
   Rule Definition builder edits. No backend — everything here is static,
   in-memory sample data, the same idiom as ./discoveryOverview.ts and
   ./reconcileOverview.ts (DomainKey/DOMAIN_HEX/DOMAIN_LABEL are reused from
   there so a domain reads the same colour on every screen). */

import type { ChipTone } from './ledger';
import { DOMAIN_HEX, DOMAIN_LABEL, type DomainKey } from './discoveryOverview';
export { DOMAIN_HEX, DOMAIN_LABEL };
export type { DomainKey };

export type RuleStatus = 'Draft' | 'Review' | 'Approved' | 'Active' | 'Executing' | 'Suspended' | 'Retired';
export const RULE_LIFECYCLE: RuleStatus[] = ['Draft', 'Review', 'Approved', 'Active', 'Executing', 'Suspended', 'Retired'];
export const STATUS_TONE: Record<RuleStatus, ChipTone> = {
  Draft: 'neutral', Review: 'info', Approved: 'success', Active: 'success',
  Executing: 'info', Suspended: 'warning', Retired: 'neutral'
};
/* who owns the very next step out of this status, and what that step is —
   the same "who does what next" shape as legacy's EXCEPTIONS.owner/.next */
export const STATUS_NEXT: Record<RuleStatus, { role: keyof Pick<Rule, 'owner' | 'reviewer' | 'approver' | 'executor'>; action: string }> = {
  Draft: { role: 'owner', action: 'Finish the definition and submit for review' },
  Review: { role: 'reviewer', action: 'Review the rule logic and either approve, reject or request changes' },
  Approved: { role: 'approver', action: 'Activate the rule to start scheduled execution' },
  Active: { role: 'executor', action: 'Nothing pending — the rule is scheduled and will start on its own' },
  Executing: { role: 'executor', action: 'Monitor the current run and triage any exceptions it raises' },
  Suspended: { role: 'owner', action: 'Resolve the reason it was suspended, then resubmit for approval' },
  Retired: { role: 'owner', action: 'None — this rule no longer runs' }
};

export type RuleOrigin = 'Manual' | 'Auto-generated' | 'AI-suggested';
export type RulePriority = 'High' | 'Medium' | 'Low';
export const PRIORITY_TONE: Record<RulePriority, ChipTone> = { High: 'error', Medium: 'warning', Low: 'neutral' };

export const OPERATORS = ['Equals', 'Not equals', 'Contains', 'Greater than', 'Less than', 'Greater than or equal', 'Less than or equal'] as const;
export type Operator = typeof OPERATORS[number];

export interface Condition { id: string; sourceField: string; operator: Operator; targetField: string; connector?: 'AND' | 'OR' }

export interface ApprovalEvent { at: string; by: string; action: 'Submitted for review' | 'Approved' | 'Rejected' | 'Changes requested' | 'Activated' | 'Suspended' | 'Retired'; note?: string }
export interface ActivityEvent { at: string; by: string; event: string }
export interface ExecutionRun { at: string; matched: number; exceptions: number; durationMs: number }

export interface Rule {
  id: string; name: string; description: string; domain: DomainKey;
  source: string; target: string; ruleType: string; priority: RulePriority;
  status: RuleStatus; origin: RuleOrigin;
  owner: string; reviewer: string; approver: string; executor: string; exceptionReviewer: string;
  createdBy: string; createdDate: string; lastUpdated: string; lastExecution: string | null;
  conditions: Condition[];
  expectedImpact: string;
  approvalHistory: ApprovalEvent[];
  activity: ActivityEvent[];
  executions: ExecutionRun[];
}

/* mock people — the naming style already used for owners/approvers
   elsewhere in this app's sample data (legacy EXCEPTIONS.owner) */
export const MOCK_USERS = [
  'Harish Kumar', 'Anjali Verma', 'Rohan Mehta', 'Meera Nair', 'Vikram Rao',
  'Gaurav Shukla', 'Priya Iyer', 'Sanjay Bhatt'
] as const;

const cond = (id: string, sourceField: string, operator: Operator, targetField: string, connector?: 'AND' | 'OR'): Condition =>
  ({ id, sourceField, operator, targetField, connector });

export const RULES: Rule[] = [
  {
    id: 'RUL-RAN-001', name: 'gNodeB identity match', domain: 'RAN',
    description: 'Matches a discovered gNodeB to its RAN asset-register record by cell identity and PCI.',
    source: 'Network · SNMP v2c/v3', target: 'Inventory · RAN asset register', ruleType: 'Identity match',
    priority: 'High', status: 'Active', origin: 'Manual',
    owner: 'Harish Kumar', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Meera Nair', exceptionReviewer: 'Priya Iyer',
    createdBy: 'Harish Kumar', createdDate: '02-Jul-2026', lastUpdated: '01-Sep-2026 09:05', lastExecution: '01-Sep-2026 09:05',
    conditions: [cond('c1', 'Cell ID', 'Equals', 'Cell ID', 'AND'), cond('c2', 'PCI', 'Equals', 'PCI')],
    expectedImpact: 'Keeps the RAN asset register in sync with what the network actually reports for cell identity — the register is what capacity and licence counts are drawn from.',
    approvalHistory: [
      { at: '03-Jul-2026 10:00', by: 'Anjali Verma', action: 'Approved', note: 'Logic checked against the RAN naming convention.' },
      { at: '02-Jul-2026 16:40', by: 'Harish Kumar', action: 'Submitted for review' }
    ],
    activity: [
      { at: '01-Sep-2026 09:05', by: 'scheduler', event: 'Run completed — 8,412 scanned, 52 drifted, 40 auto-resolved' },
      { at: '31-Aug-2026 09:00', by: 'scheduler', event: 'Run completed — 8,398 scanned, 47 drifted, 39 auto-resolved' },
      { at: '04-Jul-2026 08:00', by: 'Rohan Mehta', event: 'Rule activated' }
    ],
    executions: [
      { at: '01-Sep-2026 09:05', matched: 8360, exceptions: 52, durationMs: 41200 },
      { at: '31-Aug-2026 09:00', matched: 8351, exceptions: 47, durationMs: 40650 }
    ]
  },
  {
    id: 'RUL-RAN-002', name: 'Antenna parameter drift', domain: 'RAN',
    description: 'Flags a live antenna azimuth/tilt reading that differs from the planned engineering record beyond tolerance.',
    source: 'Network · SNMP v2c/v3', target: 'Inventory · RAN asset register', ruleType: 'Attribute comparison',
    priority: 'Medium', status: 'Review', origin: 'AI-suggested',
    owner: 'Meera Nair', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Meera Nair', exceptionReviewer: 'Priya Iyer',
    createdBy: 'Meera Nair', createdDate: '28-Aug-2026', lastUpdated: '30-Aug-2026 11:20', lastExecution: null,
    conditions: [cond('c1', 'Azimuth', 'Greater than', 'Azimuth tolerance', 'OR'), cond('c2', 'Tilt', 'Greater than', 'Tilt tolerance')],
    expectedImpact: 'Would have caught the 8 antenna-drift discrepancies currently sitting in "Open items by type" as attribute mismatches instead of manual field reports.',
    approvalHistory: [{ at: '30-Aug-2026 11:20', by: 'Meera Nair', action: 'Submitted for review' }],
    activity: [{ at: '30-Aug-2026 11:20', by: 'Meera Nair', event: 'Submitted for review' }],
    executions: []
  },
  {
    id: 'RUL-CORE-001', name: '5GC NF registration match', domain: 'Core',
    description: 'Matches an NRF-registered network function to its inventory record by NF instance ID.',
    source: 'Network · REST (NRF)', target: 'Inventory · NF registry', ruleType: 'Identity match',
    priority: 'High', status: 'Active', origin: 'Manual',
    owner: 'Vikram Rao', reviewer: 'Sanjay Bhatt', approver: 'Rohan Mehta', executor: 'Vikram Rao', exceptionReviewer: 'Gaurav Shukla',
    createdBy: 'Vikram Rao', createdDate: '14-Jun-2026', lastUpdated: '01-Sep-2026 09:02', lastExecution: '01-Sep-2026 09:02',
    conditions: [cond('c1', 'NF Instance ID', 'Equals', 'NF Instance ID')],
    expectedImpact: 'The only rule keeping the core NF registry authoritative — every AMF/UPF instance the network reports is reconciled against it continuously.',
    approvalHistory: [{ at: '15-Jun-2026 09:00', by: 'Sanjay Bhatt', action: 'Approved' }, { at: '14-Jun-2026 17:00', by: 'Vikram Rao', action: 'Submitted for review' }],
    activity: [{ at: '01-Sep-2026 09:02', by: 'scheduler', event: 'Run completed — 340 scanned, 18 drifted, 11 auto-resolved' }],
    executions: [{ at: '01-Sep-2026 09:02', matched: 322, exceptions: 18, durationMs: 8100 }]
  },
  {
    id: 'RUL-CORE-002', name: 'Core config drift', domain: 'Core',
    description: 'Compares a live NF configuration checksum to the last approved baseline.',
    source: 'Network · NETCONF', target: 'Inventory · NF registry', ruleType: 'Attribute comparison',
    priority: 'Medium', status: 'Draft', origin: 'Manual',
    owner: 'Gaurav Shukla', reviewer: 'Sanjay Bhatt', approver: 'Rohan Mehta', executor: 'Vikram Rao', exceptionReviewer: 'Gaurav Shukla',
    createdBy: 'Gaurav Shukla', createdDate: '05-Sep-2026', lastUpdated: '05-Sep-2026', lastExecution: null,
    conditions: [cond('c1', 'Config checksum', 'Not equals', 'Baseline checksum')],
    expectedImpact: 'Would close the 4 open "Core config drift" items currently tracked manually.',
    approvalHistory: [],
    activity: [{ at: '05-Sep-2026', by: 'Gaurav Shukla', event: 'Rule created' }],
    executions: []
  },
  {
    id: 'RUL-TRN-001', name: 'ROADM wavelength match', domain: 'Transport',
    description: 'Matches a provisioned wavelength on a live ROADM to its service record.',
    source: 'Network · SNMP + TL1', target: 'Inventory · Transport asset register', ruleType: 'Identity match',
    priority: 'High', status: 'Suspended', origin: 'Manual',
    owner: 'Priya Iyer', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Priya Iyer', exceptionReviewer: 'Harish Kumar',
    createdBy: 'Priya Iyer', createdDate: '10-May-2026', lastUpdated: '19-Nov-2025 04:00', lastExecution: '19-Nov-2025 04:00',
    conditions: [cond('c1', 'Wavelength (nm)', 'Equals', 'Wavelength (nm)', 'AND'), cond('c2', 'ROADM port', 'Equals', 'ROADM port')],
    expectedImpact: 'Directly responsible for the 42-wavelength "no service record" exposure — suspended since the TL1 adapter credential lapsed.',
    approvalHistory: [
      { at: '19-Nov-2025 04:05', by: 'Priya Iyer', action: 'Suspended', note: 'TL1 credential expired; adapter can no longer reach the ring.' },
      { at: '11-May-2026', by: 'Rohan Mehta', action: 'Approved' }
    ],
    activity: [{ at: '19-Nov-2025 04:00', by: 'scheduler', event: 'Run failed — TL1 credential rejected, rule suspended' }],
    executions: [{ at: '19-Nov-2025 04:00', matched: 61, exceptions: 42, durationMs: 12400 }]
  },
  {
    id: 'RUL-TRN-002', name: 'Undocumented wavelength sweep', domain: 'Transport',
    description: 'Flags a live, in-service wavelength with no matching service record at all.',
    source: 'Network · SNMP + TL1', target: 'Inventory · Transport asset register', ruleType: 'Existence check',
    priority: 'High', status: 'Review', origin: 'AI-suggested',
    owner: 'Priya Iyer', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Priya Iyer', exceptionReviewer: 'Harish Kumar',
    createdBy: 'Priya Iyer', createdDate: '01-Sep-2026', lastUpdated: '02-Sep-2026 10:00', lastExecution: null,
    conditions: [cond('c1', 'Wavelength (nm)', 'Not equals', 'null')],
    expectedImpact: 'Suggested by the platform after the RUL-TRN-001 suspension left wavelength drift undetected for 10+ months — closes the same gap without needing the TL1 adapter.',
    approvalHistory: [{ at: '02-Sep-2026 10:00', by: 'Priya Iyer', action: 'Submitted for review' }],
    activity: [{ at: '01-Sep-2026', by: 'AI suggestion engine', event: 'Rule suggested from repeated Transport exception pattern' }, { at: '02-Sep-2026 10:00', by: 'Priya Iyer', event: 'Submitted for review' }],
    executions: []
  },
  {
    id: 'RUL-IPM-001', name: 'PE router LLDP topology match', domain: 'IPMPLS',
    description: 'Matches a discovered LLDP adjacency between two PE routers to the planned link record.',
    source: 'Network · LLDP/CDP', target: 'Inventory · Links', ruleType: 'Relationship match',
    priority: 'Medium', status: 'Active', origin: 'Manual',
    owner: 'Rohan Mehta', reviewer: 'Sanjay Bhatt', approver: 'Rohan Mehta', executor: 'Sanjay Bhatt', exceptionReviewer: 'Anjali Verma',
    createdBy: 'Rohan Mehta', createdDate: '20-Mar-2026', lastUpdated: '01-Sep-2026 09:19', lastExecution: '01-Sep-2026 09:19',
    conditions: [cond('c1', 'Local port', 'Equals', 'Planned A-end port', 'AND'), cond('c2', 'Remote port', 'Equals', 'Planned Z-end port')],
    expectedImpact: 'Backbone rule for connectivity accuracy — every topology gap on Links traces back to this rule not yet matching a link.',
    approvalHistory: [{ at: '21-Mar-2026', by: 'Sanjay Bhatt', action: 'Approved' }],
    activity: [{ at: '01-Sep-2026 09:19', by: 'scheduler', event: 'Run completed — 1,204 scanned, 12 drifted, 9 auto-resolved' }],
    executions: [{ at: '01-Sep-2026 09:19', matched: 1193, exceptions: 12, durationMs: 6200 }]
  },
  {
    id: 'RUL-IPM-002', name: 'Interface admin/oper state', domain: 'IPMPLS',
    description: 'Compares an interface’s live admin/operational state to the state recorded in inventory.',
    source: 'Network · SNMP v2c/v3', target: 'Inventory · Physical Resources', ruleType: 'Attribute comparison',
    priority: 'Low', status: 'Retired', origin: 'Auto-generated',
    owner: 'Sanjay Bhatt', reviewer: 'Rohan Mehta', approver: 'Rohan Mehta', executor: 'Sanjay Bhatt', exceptionReviewer: 'Anjali Verma',
    createdBy: 'scheduler', createdDate: '11-Jan-2026', lastUpdated: '15-Aug-2026', lastExecution: '14-Aug-2026 09:00',
    conditions: [cond('c1', 'Admin state', 'Not equals', 'Recorded admin state')],
    expectedImpact: 'Retired in favour of RUL-IPM-001, which already covers interface state as part of the link match.',
    approvalHistory: [{ at: '15-Aug-2026', by: 'Rohan Mehta', action: 'Retired', note: 'Superseded by RUL-IPM-001.' }],
    activity: [{ at: '15-Aug-2026', by: 'Rohan Mehta', event: 'Rule retired — superseded by RUL-IPM-001' }],
    executions: [{ at: '14-Aug-2026 09:00', matched: 1180, exceptions: 5, durationMs: 5800 }]
  },
  {
    id: 'RUL-RAN-003', name: 'New / unregistered cell', domain: 'RAN',
    description: 'Flags a cell answering on the network with no matching entry anywhere in the RAN asset register.',
    source: 'Network · SNMP v2c/v3', target: 'Inventory · RAN asset register', ruleType: 'Existence check',
    priority: 'High', status: 'Executing', origin: 'Manual',
    owner: 'Harish Kumar', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Meera Nair', exceptionReviewer: 'Priya Iyer',
    createdBy: 'Harish Kumar', createdDate: '18-Apr-2026', lastUpdated: '01-Sep-2026 09:05', lastExecution: '01-Sep-2026 09:05',
    conditions: [cond('c1', 'Cell ID', 'Equals', 'null')],
    expectedImpact: 'Currently mid-run — catches unregistered cells before they accrue licence exposure.',
    approvalHistory: [{ at: '19-Apr-2026', by: 'Anjali Verma', action: 'Approved' }],
    activity: [{ at: '01-Sep-2026 09:05', by: 'scheduler', event: 'Run started — sweeping RAN cluster Bengaluru-East' }],
    executions: [{ at: '31-Aug-2026 09:00', matched: 8398, exceptions: 14, durationMs: 39900 }]
  },
  {
    id: 'RUL-TRN-003', name: 'Decommissioned record cleanup', domain: 'Transport',
    description: 'Flags a Transport inventory record marked decommissioned that is still answering live on the network.',
    source: 'Network · SNMP + TL1', target: 'Inventory · Transport asset register', ruleType: 'Existence check',
    priority: 'Low', status: 'Approved', origin: 'Manual',
    owner: 'Priya Iyer', reviewer: 'Anjali Verma', approver: 'Rohan Mehta', executor: 'Priya Iyer', exceptionReviewer: 'Harish Kumar',
    createdBy: 'Priya Iyer', createdDate: '22-Aug-2026', lastUpdated: '29-Aug-2026 14:00', lastExecution: null,
    conditions: [cond('c1', 'Inventory status', 'Equals', 'Decommissioned', 'AND'), cond('c2', 'Network reachability', 'Equals', 'Reachable')],
    expectedImpact: 'Closes the 12 "decommissioned record on file" open items by catching devices that were retired on paper but never powered down.',
    approvalHistory: [{ at: '29-Aug-2026 14:00', by: 'Rohan Mehta', action: 'Approved', note: 'Ready to activate — awaiting the next maintenance window.' }],
    activity: [{ at: '29-Aug-2026 14:00', by: 'Rohan Mehta', event: 'Approved, pending activation' }],
    executions: []
  }
];

export const ruleById = (id: string) => RULES.find(r => r.id === id);
export const rulesByStatus = (status: RuleStatus) => RULES.filter(r => r.status === status);

/* ledger self-check: every status this page can filter to must actually
   have at least one rule, so a status filter never opens on an empty grid
   with nothing to demonstrate */
(() => {
  RULE_LIFECYCLE.forEach(s => {
    if (!RULES.some(r => r.status === s)) throw new Error(`rules: no sample rule carries status "${s}"`);
  });
})();
