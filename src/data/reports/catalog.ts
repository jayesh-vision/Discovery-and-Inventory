/* ── Reports: catalogue ─────────────────────────────────────
   What each report is for, who reads it and when it runs. No numbers live
   here — every figure is computed by the report's builder from the ledger
   and the self-checked overview data. Dates follow the prototype's own
   calendar (reconciliation data is stamped 01-Sep-2026; archive.ts' TODAY
   is 03-Sep-2026). */

import type { ReportDef, ReportModule } from './model';

export const REPORT_DEFS: ReportDef[] = [
  /* ── Discovery and reconciliation ── */
  {
    id: 'DR-01', module: 'discovery', featured: true,
    name: 'Inventory trust executive report',
    question: 'Can we trust the inventory, are we on course for the 99% target, and what closes the gap fastest?',
    audience: 'Leadership', cadence: 'Weekly', schedule: 'Mondays 07:00 IST',
    distribution: 'CTO office · Head of Network Operations · Head of OSS',
    state: 'Current', lastRun: '01-Sep-2026 07:00', snapshot: 'TRUST-2026-W36'
  },
  {
    id: 'DR-02', module: 'discovery',
    name: 'Discrepancy backlog & ageing',
    question: 'What is in the open discrepancy backlog, where is it concentrated, and what is getting old?',
    audience: 'Operations', cadence: 'Daily', schedule: 'Daily 07:00 IST',
    distribution: 'Reconciliation desk · Domain operations leads',
    state: 'Current', lastRun: '01-Sep-2026 07:00', snapshot: 'BKLG-2026-09-01'
  },
  {
    id: 'DR-03', module: 'discovery',
    name: 'Exception SLA & ownership',
    question: 'Which exceptions have breached or are about to breach SLA, who owns them, and what unblocks them?',
    audience: 'Operations', cadence: 'Daily', schedule: 'Daily 07:30 IST',
    distribution: 'Exception reviewers · Domain owners',
    state: 'Current', lastRun: '01-Sep-2026 07:30', snapshot: 'EXC-2026-09-01'
  },
  {
    id: 'DR-04', module: 'discovery',
    name: 'Discovery coverage & collector health',
    question: 'How much of the estate does discovery reach, and which collectors, adapters or credentials are holding it back?',
    audience: 'Engineering', cadence: 'Daily', schedule: 'Daily 06:00 IST',
    distribution: 'Discovery engineering · OSS platform team',
    state: 'Current', lastRun: '01-Sep-2026 06:00', snapshot: 'DISC-2026-09-01'
  },
  {
    id: 'DR-05', module: 'discovery',
    name: 'Reconciliation automation & cycle performance',
    question: 'How much reconciliation now closes without an engineer, per domain and per cycle, and where is automation lagging?',
    audience: 'Operations', cadence: 'Weekly', schedule: 'Mondays 07:00 IST',
    distribution: 'Head of Network Operations · Automation engineering',
    state: 'Stale', lastRun: '25-Aug-2026 07:00', snapshot: 'AUTO-2026-W35',
    note: 'Cycle data has moved on since this run; the figures describe the snapshot above until the next scheduled run.'
  },
  {
    id: 'DR-06', module: 'discovery',
    name: 'Rule governance & effectiveness',
    question: 'Which reconciliation rules are live, which are waiting on a decision, and how well do the live ones perform?',
    audience: 'Governance', cadence: 'Weekly', schedule: 'Fridays 16:00 IST',
    distribution: 'Rule approvers · Network governance board',
    state: 'Current', lastRun: '29-Aug-2026 16:00', snapshot: 'RULE-2026-W35'
  },
  {
    id: 'DR-07', module: 'discovery',
    name: 'Cost of drift & risk register',
    question: 'What is inventory drift costing, what risk does it carry, and who is accountable for closing it?',
    audience: 'Finance', cadence: 'Monthly', schedule: '1st of month 08:00 IST',
    distribution: 'CFO office · Revenue assurance · Network governance',
    state: 'Current', lastRun: '01-Sep-2026 08:00', snapshot: 'COST-2026-09'
  },

  /* ── Inventory ── */
  {
    id: 'IN-01', module: 'inventory', featured: true,
    name: 'Inventory estate executive summary',
    question: 'What does the network estate consist of, how much of it is verified, and where is the lifecycle risk?',
    audience: 'Leadership', cadence: 'Monthly', schedule: '1st of month 07:00 IST',
    distribution: 'CTO office · Head of Network Planning · CFO office',
    state: 'Current', lastRun: '01-Sep-2026 07:00', snapshot: 'EST-2026-09'
  },
  {
    id: 'IN-02', module: 'inventory',
    name: 'Stock position & spares cover',
    question: 'What is deployed, in store, planned or faulty — and which equipment classes have no spare cover?',
    audience: 'Planning', cadence: 'Weekly', schedule: 'Mondays 06:00 IST',
    distribution: 'Network planning · Stores & logistics · Field operations',
    state: 'Current', lastRun: '01-Sep-2026 06:00', snapshot: 'STK-2026-W36'
  },
  {
    id: 'IN-03', module: 'inventory',
    name: 'Hardware lifecycle risk: end of support & software compliance',
    question: 'How much of the estate is past or near end of support, or behind the software baseline — and on which models?',
    audience: 'Engineering', cadence: 'Monthly', schedule: '1st of month 07:30 IST',
    distribution: 'Network engineering · Security · Vendor management',
    state: 'Current', lastRun: '01-Sep-2026 07:30', snapshot: 'LCR-2026-09'
  },
  {
    id: 'IN-04', module: 'inventory',
    name: 'Discovery-verified inventory quality',
    question: 'How much of the element register is verified by discovery, and which records have drifted, gone stale or never been checked?',
    audience: 'Governance', cadence: 'Weekly', schedule: 'Mondays 06:30 IST',
    distribution: 'Data governance · Reconciliation desk',
    state: 'Current', lastRun: '01-Sep-2026 06:30', snapshot: 'DQ-2026-W36'
  },
  {
    id: 'IN-05', module: 'inventory',
    name: 'Decommission archive & zombie assets',
    question: 'What has been decommissioned, why and by whom — and is anything still answering on the network?',
    audience: 'Operations', cadence: 'Monthly', schedule: '1st of month 08:00 IST',
    distribution: 'Field operations · Security operations · Asset management',
    state: 'Running', lastRun: '03-Sep-2026 08:00', snapshot: 'ARC-2026-09',
    note: 'A new run is in progress; showing the last completed snapshot.'
  },
  {
    id: 'IN-06', module: 'inventory',
    name: 'Site footprint & facility capacity',
    question: 'Where is the estate deployed, what state are the sites in, and how much power, rack and port capacity is left?',
    audience: 'Planning', cadence: 'Monthly', schedule: '1st of month 09:00 IST',
    distribution: 'Network planning · Facilities · Field operations',
    state: 'Current', lastRun: '01-Sep-2026 09:00', snapshot: 'SITE-2026-09'
  },
  {
    id: 'IN-07', module: 'inventory',
    name: 'Vendor (OEM) concentration',
    question: 'How dependent is the estate on each vendor, and which vendors carry the most lifecycle and compliance exposure?',
    audience: 'Finance', cadence: 'Monthly', schedule: '1st of month 09:30 IST',
    distribution: 'Procurement · Vendor management · CFO office',
    state: 'Failed', lastRun: '01-Sep-2026 09:30', snapshot: 'OEM-2026-08',
    note: 'The 01-Sep run failed while reading the EMS vendor feed. Figures below are from the last successful run (August); a retry is queued.'
  }
];

export const reportsFor = (m: ReportModule) => REPORT_DEFS.filter(r => r.module === m);
export const reportDefById = (id: string) => REPORT_DEFS.find(r => r.id === id);
