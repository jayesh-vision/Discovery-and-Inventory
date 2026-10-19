/* ── Reports: recent report runs ────────────────────────────
   The generated-report log that the legacy Inventory Reports screen listed
   (legacy/app-data.js REPORTS), kept as history under each module's Reports
   page. Discovery-typed runs belong to Discovery and reconciliation; site
   and cluster runs to Inventory. */

import type { ChipTone } from '../ledger';
import type { ReportModule } from './model';
import { formatReportDate } from './catalog';
import { isScoped } from '../dc/scope';
import type { DcGeo } from '../dc';

export interface ReportRun {
  status: 'Completed' | 'Failed' | 'Pending'; name: string; type: 'Cluster' | 'Discovery' | 'Site';
  generated: 'Scheduled' | 'Automated' | 'Adhoc'; frequency: string; creator: string; createdOn: string; size: string;
  module: ReportModule;
}
export const RUN_STATUS_TONE: Record<ReportRun['status'], ChipTone> = { Completed: 'success', Failed: 'error', Pending: 'warning' };

export const REPORT_RUNS_IN: ReportRun[] = [
  { status: 'Completed', name: 'RJ-MPLS-ROUTER-CLUSTER-REPORT', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'Harish Kumar', createdOn: '15-Jul-2026', size: '2.4 MB', module: 'inventory' },
  { status: 'Completed', name: 'PUN-HNJW-C3-ENODEB-CLUSTER', type: 'Cluster', generated: 'Scheduled', frequency: 'Daily', creator: 'Anjali Verma', createdOn: '14-Jul-2026', size: '1.1 MB', module: 'inventory' },
  { status: 'Completed', name: 'BGLK-277-ORR-WIFI-CLUSTER', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'Ronit Dulani', createdOn: '14-Jul-2026', size: '860 KB', module: 'inventory' },
  { status: 'Completed', name: 'NETWORK-DISCOVERY-SUMMARY', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '4.2 MB', module: 'discovery' },
  { status: 'Completed', name: 'RECONCILIATION-EXCEPTIONS', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '1.8 MB', module: 'discovery' },
  { status: 'Failed', name: 'LUCKNOW-AREA-005-BBU-HARDWARE', type: 'Site', generated: 'Adhoc', frequency: 'Once', creator: 'Nitin Gupta', createdOn: '14-Jul-2026', size: '—', module: 'inventory' },
  { status: 'Pending', name: 'SURAT-AREA-014-RRU-POWER', type: 'Site', generated: 'Scheduled', frequency: 'Daily', creator: 'Rohan Mehta', createdOn: '14-Jul-2026', size: '—', module: 'inventory' },
  { status: 'Completed', name: 'HYD-093-DWDM-CHANNEL-FILL', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'Meera Nair', createdOn: '29-Aug-2026', size: '1.6 MB', module: 'inventory' },
  { status: 'Completed', name: 'PASSIVE-FIBER-OTDR-SUMMARY', type: 'Site', generated: 'Scheduled', frequency: 'Monthly', creator: 'Vikram Rao', createdOn: '28-Aug-2026', size: '3.1 MB', module: 'inventory' },
  { status: 'Completed', name: 'SPARE-STOCK-AGEING', type: 'Cluster', generated: 'Adhoc', frequency: 'Once', creator: 'Gaurav Shukla', createdOn: '26-Aug-2026', size: '640 KB', module: 'inventory' },
  { status: 'Completed', name: 'COLLECTOR-CREDENTIAL-FAILURES', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '910 KB', module: 'discovery' },
  { status: 'Pending', name: 'KOL-204-RRU-POWER-AUDIT', type: 'Site', generated: 'Scheduled', frequency: 'Weekly', creator: 'Rohan Mehta', createdOn: formatReportDate(new Date()), size: '—', module: 'inventory' }
];

export const REPORT_RUNS_US: ReportRun[] = [
  { status: 'Completed', name: 'ASH-01-SPINE-LEAF-FABRIC-AUDIT', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'Sarah Jenkins', createdOn: '15-Jul-2026', size: '2.4 MB', module: 'inventory' },
  { status: 'Completed', name: 'SJC-02-GPU-H100-SUPERCLUSTER', type: 'Cluster', generated: 'Scheduled', frequency: 'Daily', creator: 'Alex Mercer', createdOn: '14-Jul-2026', size: '1.8 MB', module: 'inventory' },
  { status: 'Completed', name: 'DFW-01-TOR-SWITCH-FIRMWARE', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'Michael Chang', createdOn: '14-Jul-2026', size: '920 KB', module: 'inventory' },
  { status: 'Completed', name: 'NETWORK-DISCOVERY-SUMMARY', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '4.2 MB', module: 'discovery' },
  { status: 'Completed', name: 'RECONCILIATION-EXCEPTIONS', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '1.8 MB', module: 'discovery' },
  { status: 'Failed', name: 'ORD-01-HVAC-CHILLER-POWER-FAIL', type: 'Site', generated: 'Adhoc', frequency: 'Once', creator: 'David Miller', createdOn: '14-Jul-2026', size: '—', module: 'inventory' },
  { status: 'Pending', name: 'SEA-01-BACKUP-GENERATOR-TEST', type: 'Site', generated: 'Scheduled', frequency: 'Daily', creator: 'Emily Watson', createdOn: '14-Jul-2026', size: '—', module: 'inventory' },
  { status: 'Completed', name: 'DEN-01-DWDM-OPTICAL-TRANSPORT', type: 'Cluster', generated: 'Scheduled', frequency: 'Weekly', creator: 'James Wilson', createdOn: '29-Aug-2026', size: '1.6 MB', module: 'inventory' },
  { status: 'Completed', name: 'PHX-01-DARK-FIBER-OTDR-TRACE', type: 'Site', generated: 'Scheduled', frequency: 'Monthly', creator: 'Robert Taylor', createdOn: '28-Aug-2026', size: '3.1 MB', module: 'inventory' },
  { status: 'Completed', name: 'ATL-01-STORAGE-SAN-CAPACITY', type: 'Cluster', generated: 'Adhoc', frequency: 'Once', creator: 'Sarah Jenkins', createdOn: '26-Aug-2026', size: '750 KB', module: 'inventory' },
  { status: 'Completed', name: 'COLLECTOR-CREDENTIAL-FAILURES', type: 'Discovery', generated: 'Automated', frequency: 'Daily', creator: 'scheduler', createdOn: formatReportDate(new Date()), size: '910 KB', module: 'discovery' },
  { status: 'Pending', name: 'NYC-01-PDU-CIRCUIT-POWER-AUDIT', type: 'Site', generated: 'Scheduled', frequency: 'Weekly', creator: 'Alex Mercer', createdOn: formatReportDate(new Date()), size: '—', module: 'inventory' }
];

export const REPORT_RUNS: ReportRun[] = REPORT_RUNS_IN;

export const reportRuns = (geo?: DcGeo | null): ReportRun[] => {
  if (isScoped()) {
    const targetGeo = geo || (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('geo') as DcGeo) : 'us') || 'us';
    return targetGeo === 'in' ? REPORT_RUNS_IN : REPORT_RUNS_US;
  }
  return REPORT_RUNS_IN;
};
