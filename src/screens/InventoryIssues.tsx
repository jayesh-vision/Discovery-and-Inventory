import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo } from '../solution';
import { dcSumList } from '../data/dc/scope';

interface IssueRecord {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'low';
  domain: string;
  asset: string;
  dcId: string;
  ageDays: number;
  status: 'Open' | 'In Progress' | 'Awaiting Vendor';
}

export default function InventoryIssues() {
  const [sp] = useSearchParams();
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const severityParam = sp.get('severity')?.toLowerCase();
  const dcParam = sp.get('dc');

  const [activeTab, setActiveTab] = useState<string>(severityParam || 'all');

  const allIssues = useMemo<IssueRecord[]>(() => {
    const list: IssueRecord[] = [];

    // Exactly 4 Critical Issues
    const criticals = [
      { id: 'ISS-CRIT-001', title: 'SXM GPU Module PCIe Eye-Height Degradation', domain: 'Compute Hardware', asset: 'GPU-NODE-VA-001', dcId: 'VA-DC-001', ageDays: 2.1 },
      { id: 'ISS-CRIT-002', title: 'Dual PSU Redundancy Loss on Spine Fabric Switch', domain: 'Power / Fabric', asset: 'SPINE-SW-VA-003', dcId: 'VA-DC-001', ageDays: 3.4 },
      { id: 'ISS-CRIT-003', title: 'Datastore LUN Path Disconnect / All Paths Down', domain: 'Storage SAN', asset: 'LUN-AI400X2-POOL-A', dcId: 'CA-DC-020', ageDays: 1.8 },
      { id: 'ISS-CRIT-004', title: 'Liquid Cooling CDU Secondary Loop Flow Degradation', domain: 'Cooling Plant', asset: 'CDU-UNIT-TX-04', dcId: 'TX-DC-022', ageDays: 4.2 }
    ];
    criticals.forEach(c => list.push({ ...c, severity: 'critical', status: 'In Progress' }));

    // Exactly 10 High Issues
    const highs = [
      { id: 'ISS-HIGH-001', title: 'InfiniBand Rail Flapping / CRC Error Rate Exceeded', domain: 'Fabric Connectivity', asset: 'IB-LINK-VA-9901', dcId: 'VA-DC-001', ageDays: 3.1 },
      { id: 'ISS-HIGH-002', title: 'Golden OS Image Version Drift (Kernel CVE-2024-21626)', domain: 'OS Compliance', asset: 'HOST-SVR-VA-044', dcId: 'VA-DC-001', ageDays: 5.6 },
      { id: 'ISS-HIGH-003', title: 'NVLink Mesh Inter-GPU Retransmit Surge', domain: 'Compute Hardware', asset: 'HGX-NODE-VA-012', dcId: 'VA-DC-001', ageDays: 2.8 },
      { id: 'ISS-HIGH-004', title: 'BGP EVPN Route Target Mismatch on DCI Tunnel', domain: 'Routing / Fabric', asset: 'DCI-TUNNEL-WA-01', dcId: 'WA-DC-013', ageDays: 4.0 },
      { id: 'ISS-HIGH-005', title: 'Online UPS Battery Impedance Threshold Exceeded', domain: 'Power Plant', asset: 'UPS-BANK-WA-02', dcId: 'WA-DC-013', ageDays: 6.2 },
      { id: 'ISS-HIGH-006', title: 'Kubernetes Worker Node Pod Eviction Loop', domain: 'Virtual Workload', asset: 'K8S-POD-IL-08', dcId: 'IL-DC-009', ageDays: 3.0 },
      { id: 'ISS-HIGH-007', title: 'Storage Metadata Node Sync Latency > 15ms', domain: 'Storage SAN', asset: 'AI400X2-CTRL-IL', dcId: 'IL-DC-009', ageDays: 4.5 },
      { id: 'ISS-HIGH-008', title: 'CRAH Supply Air Temperature Sensor Float', domain: 'Cooling Plant', asset: 'CRAC-SENS-CA-01', dcId: 'CA-DC-020', ageDays: 5.1 },
      { id: 'ISS-HIGH-009', title: 'BMC Firmware Out-of-Date / Advisory Bulletin', domain: 'Firmware Compliance', asset: 'SRV-DELL-TX-104', dcId: 'TX-DC-022', ageDays: 7.0 },
      { id: 'ISS-HIGH-010', title: 'Fibre Patch Cord Insertion Loss > 1.8dB', domain: 'Passive Cabling', asset: 'ODF-SPAN-WA-04', dcId: 'WA-DC-024', ageDays: 2.4 }
    ];
    highs.forEach(h => list.push({ ...h, severity: 'high', status: 'Open' }));

    // Exactly 20 Low Issues
    const lowTitles = [
      'PDU Out-of-Band SNMP Poll Latency Spike',
      'Non-standard Chassis Asset Tagging in Hall B',
      'Redundant NTP Stratum Offset Drift > 5ms',
      'Cable Tray Fill Ratio Approaching 80%',
      'Minor OS Build Revision Mismatch on OOB Switch',
      'Environmental Smoke Detector Self-Test Warning',
      'Virtual Switch Uplink VLAN Pruning Advisory',
      'Spares Depot Replenishment Lead Time Alert',
      'Rack Rear Door Heat Exchanger Flow Nominal',
      'DNS PTR Record Missing on IPMI Interface',
      'LLDP Chassis Description Truncation Warning',
      'Secondary Power Meter Modbus CRC Retries',
      'Optical Module Temperature Drift Notice',
      'Server BIOS Boot Order Deviation Notice',
      'Console Terminal Server Port Stale Session',
      'Kubernetes Ingress Controller SSL Expiry (60d)',
      'Backup Agent Catalog Compaction Scheduled',
      'ODF Patch Cord Labeling Protocol Discrepancy',
      'Airflow Containment Brush Strip Wear Notice',
      'Decommission Work Order Documentation Incomplete'
    ];
    lowTitles.forEach((t, i) => {
      const dcId = dcs[i % dcs.length].id;
      list.push({
        id: `ISS-LOW-${String(i + 1).padStart(3, '0')}`,
        title: t,
        severity: 'low',
        domain: i % 2 === 0 ? 'DCIM Telemetry' : 'Configuration Governance',
        asset: `ASSET-DC-${String(i + 101)}`,
        dcId,
        ageDays: Number((1.5 + (i * 0.4)).toFixed(1)),
        status: 'Open'
      });
    });

    return list;
  }, [dcs]);

  const filteredRows = useMemo(() => {
    let r = allIssues;
    if (dcParam) r = r.filter(x => x.dcId === dcParam);
    if (activeTab === 'critical') return r.filter(x => x.severity === 'critical');
    if (activeTab === 'high') return r.filter(x => x.severity === 'high');
    if (activeTab === 'low') return r.filter(x => x.severity === 'low');
    return r;
  }, [allIssues, activeTab, dcParam]);

  const critCount = allIssues.filter(x => x.severity === 'critical').length; // 4
  const highCount = allIssues.filter(x => x.severity === 'high').length;     // 10
  const lowCount = allIssues.filter(x => x.severity === 'low').length;       // 20
  const totalCount = allIssues.length;                                       // 34

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Open issues', v: String(totalCount), s: 'active remediation backlog', t: 'amber' },
        { k: 'Critical severity', v: String(critCount), s: 'availability / hardware risk', t: 'red' },
        { k: 'High severity', v: String(highCount), s: 'redundancy / CVE impact', t: 'amber' },
        { k: 'Low severity', v: String(lowCount), s: 'minor configuration drift', t: 'slate' },
        { k: 'Median age', v: '3.5 d', s: 'average resolution cycle', t: 'cyan' },
        { k: 'Resolved this period', v: '18', s: 'completed work orders', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'all', n: 'All Open Issues', count: totalCount, title: 'All 34 issues' },
            { k: 'critical', n: 'Critical Severity', count: critCount, title: '4 Critical issues' },
            { k: 'high', n: 'High Severity', count: highCount, title: '10 High issues' },
            { k: 'low', n: 'Low Severity', count: lowCount, title: '20 Low issues' }
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k)}
        />

        <DataGrid<IssueRecord>
          key={activeTab}
          chipWidth="auto"
          columns={[
            { t: 'Issue ID' },
            { t: 'Severity' },
            { t: 'Defect Summary' },
            { t: 'Domain / Subsystem' },
            { t: 'Affected Asset' },
            { t: 'Data Center' },
            { t: 'Age' },
            { t: 'Status' }
          ]}
          rows={filteredRows}
          total={filteredRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search defect title, asset name, domain, data center..."
          filters={[
            { n: 'Severity', o: ['critical', 'high', 'low'] },
            { n: 'Data Center', o: dcs.map(d => d.id) }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <Chip tone={r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : 'neutral'}>
              {r.severity.toUpperCase()}
            </Chip>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.title}</span>,
            <span>{r.domain}</span>,
            <Mono>{r.asset}</Mono>,
            <Mono>{r.dcId}</Mono>,
            <span style={{ fontFamily: 'monospace' }}>{r.ageDays}d</span>,
            <Chip tone={r.status === 'In Progress' ? 'info' : 'neutral'}>{r.status}</Chip>
          ]}
        />
      </Card>
    </div>
  );
}
