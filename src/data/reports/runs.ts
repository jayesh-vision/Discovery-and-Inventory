/* ── Reports: recent report runs ────────────────────────────
   The generated-report log that the legacy Inventory Reports screen listed
   (legacy/app-data.js REPORTS), kept as history under each module's Reports
   page. Discovery-typed runs belong to Discovery and reconciliation; site
   and cluster runs to Inventory. */

import type { ChipTone } from '../ledger';
import type { ReportModule } from './model';
import { formatReportDate } from './catalog';

export interface ReportRun {
  status: 'Completed' | 'Failed' | 'Pending'; name: string; type: 'Cluster' | 'Discovery' | 'Site';
  generated: 'Scheduled' | 'Automated' | 'Adhoc'; frequency: string; creator: string; createdOn: string; size: string;
  module: ReportModule;
}
export const RUN_STATUS_TONE: Record<ReportRun['status'], ChipTone> = { Completed: 'success', Failed: 'error', Pending: 'warning' };

export const REPORT_RUNS: ReportRun[] = [
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
