/* ── Reconciliation: Jobs, Results, Exceptions ─────────────
   The drillable surfaces the Reconciliation overview's aggregate cards
   never had (see src/screens/Reconcile.tsx) — a real job list, a real
   per-element match-result list, and a real exception queue, each carrying
   the domain taxonomy already used across Insights/Reconciliation/Rules.
   RECONCILE_EXCEPTIONS' shape is adapted from the legacy prototype's
   EXCEPTIONS array (legacy/app-data.js), which already modelled exactly
   this — id/state/subject/owner/age/SLA/next-action — just without a
   domain or a rule back-link. */

import type { ChipTone } from './ledger';
import { DOMAIN_HEX, DOMAIN_LABEL, type DomainKey } from './discoveryOverview';
export { DOMAIN_HEX, DOMAIN_LABEL };
export type { DomainKey };

/* ── Reconciliation jobs ──────────────────────────────────── */
export type ReconcileJobStatus = 'Completed' | 'Completed with errors' | 'Running' | 'Scheduled';
export const JOB_STATUS_TONE: Record<ReconcileJobStatus, ChipTone> = {
  Completed: 'success', 'Completed with errors': 'warning', Running: 'info', Scheduled: 'neutral'
};
export interface ReconcileJob {
  id: string; domain: DomainKey; source: string; target: string; scanType: string;
  status: ReconcileJobStatus; schedule: string; lastRun: string; nextRun: string; duration: string;
  resultSummary: string; ruleIds: string[];
}
export const RECONCILE_JOBS: ReconcileJob[] = [
  { id: 'RCJ-RAN-01', domain: 'RAN', source: 'Network · SNMP v2c/v3', target: 'RAN asset register',
    scanType: 'Identity + attribute match', status: 'Completed', schedule: 'Continuous · 6 min sweep',
    lastRun: '01-Sep-2026 09:05', nextRun: 'sweeping now', duration: '41.2 s',
    resultSummary: '8,412 scanned · 52 drifted · 40 auto-resolved', ruleIds: ['RUL-RAN-001', 'RUL-RAN-003'] },
  { id: 'RCJ-RAN-02', domain: 'RAN', source: 'Network · SNMP v2c/v3', target: 'RAN asset register',
    scanType: 'Attribute comparison', status: 'Scheduled', schedule: 'On demand',
    lastRun: '—', nextRun: 'not yet run', duration: '—',
    resultSummary: 'Awaiting RUL-RAN-002 approval', ruleIds: ['RUL-RAN-002'] },
  { id: 'RCJ-CORE-01', domain: 'Core', source: 'Network · REST (NRF)', target: 'NF registry',
    scanType: 'Identity match', status: 'Completed', schedule: 'Continuous · 2 min sweep',
    lastRun: '01-Sep-2026 09:02', nextRun: 'sweeping now', duration: '8.1 s',
    resultSummary: '340 scanned · 18 drifted · 11 auto-resolved', ruleIds: ['RUL-CORE-001'] },
  { id: 'RCJ-TRN-01', domain: 'Transport', source: 'Network · SNMP + TL1', target: 'Transport asset register',
    scanType: 'Identity match', status: 'Completed with errors', schedule: 'Nightly 01:00 + 12 min delta',
    lastRun: '19-Nov-2025 04:00', nextRun: 'held — rule suspended', duration: '12.4 s',
    resultSummary: '61 scanned · 42 exceptions · TL1 credential rejected', ruleIds: ['RUL-TRN-001'] },
  { id: 'RCJ-TRN-02', domain: 'Transport', source: 'Network · SNMP + TL1', target: 'Transport asset register',
    scanType: 'Existence check', status: 'Scheduled', schedule: 'Nightly 01:00',
    lastRun: '—', nextRun: 'tonight, 01:00', duration: '—',
    resultSummary: 'Awaiting RUL-TRN-002 approval', ruleIds: ['RUL-TRN-002'] },
  { id: 'RCJ-IPM-01', domain: 'IPMPLS', source: 'Network · LLDP/CDP', target: 'Links',
    scanType: 'Relationship match', status: 'Completed', schedule: 'Continuous · 60s delta',
    lastRun: '01-Sep-2026 09:19', nextRun: 'sweeping now', duration: '6.2 s',
    resultSummary: '1,204 scanned · 12 drifted · 9 auto-resolved', ruleIds: ['RUL-IPM-001'] },
  { id: 'RCJ-IPM-02', domain: 'IPMPLS', source: 'Network · SNMP v2c/v3', target: 'Physical Resources',
    scanType: 'Attribute comparison', status: 'Completed', schedule: 'Retired',
    lastRun: '14-Aug-2026 09:00', nextRun: '—', duration: '5.8 s',
    resultSummary: '1,180 scanned · 5 drifted — rule retired', ruleIds: ['RUL-IPM-002'] },
  { id: 'RCJ-RAN-03', domain: 'RAN', source: 'Network · SNMP v2c/v3', target: 'RAN asset register',
    scanType: 'Existence check', status: 'Running', schedule: 'Continuous · 6 min sweep',
    lastRun: '01-Sep-2026 09:05', nextRun: 'running now', duration: '— running',
    resultSummary: 'Sweeping RAN cluster Bengaluru-East', ruleIds: ['RUL-RAN-003'] }
];

/* ── Reconciliation results ───────────────────────────────── */
export type MatchOutcome = 'Matched' | 'Attribute mismatch' | 'Stale' | 'Missing entity' | 'Extra entity';
export const OUTCOME_TONE: Record<MatchOutcome, ChipTone> = {
  Matched: 'success', 'Attribute mismatch': 'warning', Stale: 'orange', 'Missing entity': 'error', 'Extra entity': 'purple'
};
export interface ReconcileResult {
  id: string; element: string; domain: DomainKey; outcome: MatchOutcome;
  mismatchedFields: string[]; verified: string; ruleId: string;
}
export const RECONCILE_RESULTS: ReconcileResult[] = [
  { id: 'RCR-0001', element: 'BLR-GNB-T3800-014', domain: 'RAN', outcome: 'Attribute mismatch',
    mismatchedFields: ['Azimuth', 'Tilt'], verified: '30-Aug-2026 11:00', ruleId: 'RUL-RAN-002' },
  { id: 'RCR-0002', element: 'BLR-GNB-T3800-021', domain: 'RAN', outcome: 'Matched',
    mismatchedFields: [], verified: '01-Sep-2026 09:05', ruleId: 'RUL-RAN-001' },
  { id: 'RCR-0003', element: 'KOL-GNB-NEW-07', domain: 'RAN', outcome: 'Extra entity',
    mismatchedFields: ['Cell ID not on record'], verified: '31-Aug-2026 09:00', ruleId: 'RUL-RAN-003' },
  { id: 'RCR-0004', element: 'BLR-AMF-CORE-02', domain: 'Core', outcome: 'Matched',
    mismatchedFields: [], verified: '01-Sep-2026 09:02', ruleId: 'RUL-CORE-001' },
  { id: 'RCR-0005', element: 'BLR-UPF-CORE-05', domain: 'Core', outcome: 'Attribute mismatch',
    mismatchedFields: ['Config checksum'], verified: '31-Aug-2026 21:00', ruleId: 'RUL-CORE-002' },
  { id: 'RCR-0006', element: 'WR-ADVA-FSP3000-01', domain: 'Transport', outcome: 'Missing entity',
    mismatchedFields: ['No service record for wavelength 1550.12nm'], verified: '19-Nov-2025 04:00', ruleId: 'RUL-TRN-001' },
  { id: 'RCR-0007', element: 'MUM-ROADM-RING-03', domain: 'Transport', outcome: 'Extra entity',
    mismatchedFields: ['Live wavelength, no service record'], verified: '01-Sep-2026 06:00', ruleId: 'RUL-TRN-002' },
  { id: 'RCR-0008', element: 'DEL-PE-CORE-01', domain: 'IPMPLS', outcome: 'Matched',
    mismatchedFields: [], verified: '01-Sep-2026 09:19', ruleId: 'RUL-IPM-001' },
  { id: 'RCR-0009', element: 'DEL-PE-CORE-04', domain: 'IPMPLS', outcome: 'Stale',
    mismatchedFields: ['Not re-verified within SLA window'], verified: '18-Aug-2026 02:00', ruleId: 'RUL-IPM-001' }
];

/* ── Reconciliation exceptions ────────────────────────────── */
export type ExceptionState = 'Rogue' | 'Drifted' | 'Missing' | 'Duplicate' | 'Unclaimed' | 'No adapter';
export const EXCEPTION_TONE: Record<ExceptionState, ChipTone> = {
  Rogue: 'pink', Drifted: 'warning', Missing: 'error', Duplicate: 'error', Unclaimed: 'purple', 'No adapter': 'neutral'
};
export type ExceptionSla = 'On track' | 'At risk' | 'Breached';
export const SLA_TONE: Record<ExceptionSla, ChipTone> = { 'On track': 'success', 'At risk': 'warning', Breached: 'error' };
export const DISPOSITIONS = [
  { n: 'Accept network', d: 'The network is right. The inventory record is updated from the discovered facts and the exception closes.', tone: 'success' as ChipTone },
  { n: 'Accept record', d: 'The inventory is right. The discovered value is quarantined and the asset is flagged for a field check.', tone: 'info' as ChipTone },
  { n: 'Raise workorder', d: 'Neither is right yet. A change is needed on the network; the exception stays open, linked to the workorder.', tone: 'warning' as ChipTone },
  { n: 'Approve exception', d: 'Known and accepted — a lab device, a vendor trial. Requires an expiry date; reopens automatically.', tone: 'purple' as ChipTone }
];
export interface ReconcileException {
  id: string; state: ExceptionState; domain: DomainKey; subject: string;
  detected: string; owner: string; age: number; sla: ExceptionSla; next: string; ruleId: string;
}
export const RECONCILE_EXCEPTIONS: ReconcileException[] = [
  { id: 'RX-5001', state: 'Missing', domain: 'Transport', subject: 'WR-ADVA-FSP3000-01 · wavelength 1550.12nm',
    detected: '19-Nov-2025', owner: 'Priya Iyer', age: 286, sla: 'Breached', next: 'Restore TL1 credential, re-scan the ring', ruleId: 'RUL-TRN-001' },
  { id: 'RX-5002', state: 'Rogue', domain: 'Transport', subject: 'MUM-ROADM-RING-03', detected: '01-Sep-2026',
    owner: 'Priya Iyer', age: 1, sla: 'On track', next: 'Add service record or raise workorder', ruleId: 'RUL-TRN-002' },
  { id: 'RX-5003', state: 'Drifted', domain: 'RAN', subject: 'BLR-GNB-T3800-014 · azimuth/tilt',
    detected: '30-Aug-2026', owner: 'Meera Nair', age: 2, sla: 'On track', next: 'Field-verify antenna heading', ruleId: 'RUL-RAN-002' },
  { id: 'RX-5004', state: 'Rogue', domain: 'RAN', subject: 'KOL-GNB-NEW-07', detected: '31-Aug-2026',
    owner: 'Unassigned', age: 2, sla: 'At risk', next: 'Register cell in RAN asset register', ruleId: 'RUL-RAN-003' },
  { id: 'RX-5005', state: 'Drifted', domain: 'Core', subject: 'BLR-UPF-CORE-05 · config checksum',
    detected: '31-Aug-2026', owner: 'Gaurav Shukla', age: 2, sla: 'On track', next: 'Compare against last approved baseline', ruleId: 'RUL-CORE-002' },
  { id: 'RX-5006', state: 'Unclaimed', domain: 'IPMPLS', subject: 'DEL-PE-CORE-04', detected: '18-Aug-2026',
    owner: 'Unassigned', age: 14, sla: 'Breached', next: 'Re-verify before the next SLA window closes', ruleId: 'RUL-IPM-001' },
  { id: 'RX-5007', state: 'No adapter', domain: 'Transport', subject: 'Adva FSP 3000 · TL1 endpoints',
    detected: '19-Nov-2025', owner: 'Architecture', age: 286, sla: 'Breached', next: 'Restore or replace the TL1 collector', ruleId: 'RUL-TRN-001' }
];

export const exceptionsForRule = (ruleId: string) => RECONCILE_EXCEPTIONS.filter(e => e.ruleId === ruleId);
export const resultsForRule = (ruleId: string) => RECONCILE_RESULTS.filter(r => r.ruleId === ruleId);
export const jobsForRule = (ruleId: string) => RECONCILE_JOBS.filter(j => j.ruleIds.includes(ruleId));
