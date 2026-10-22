import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import { Drawer } from '../components/Drawer';
import { currentGeo, withSolution } from '../solution';
import { dcSumList } from '../data/dc/scope';

export type IssueRole = 'GPU' | 'Switch' | 'Storage' | 'Server' | 'Router' | 'Cooling' | 'Power' | 'Passive';

export const ROLE_BADGE_MAP: Record<IssueRole, { bg: string; color: string; border: string }> = {
  GPU: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  Switch: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
  Router: { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
  Storage: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  Server: { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  Cooling: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  Power: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Passive: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' }
};

export function getRoleBadge(role: IssueRole) {
  return ROLE_BADGE_MAP[role] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
}

export interface IssueRecord {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'low';
  domain: string;
  asset: string;              // Real inventory element name (e.g. 'VA-DC-001-GPU-001')
  assetRole: IssueRole;       // Inventory classification
  model: string;              // Hardware model
  vendor: string;             // Hardware vendor
  rack: string;               // Physical placement (e.g. 'Rack A01 · U06-10')
  rackId: string;             // Normalized rack ID (e.g. 'RACK-A')
  serial: string;             // Asset serial number
  dcId: string;               // Data center location
  ageDays: number;
  status: 'Open' | 'In Progress' | 'Awaiting Vendor';
  impactDetail: string;       // Technical impact on inventory / infrastructure
  rootCause: string;          // Root cause telemetry observation
  correlatedService: string;  // Impacted workloads / clusters
  workorderId: string;        // Remediation work order
}

export default function InventoryIssues() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const severityParam = sp.get('severity')?.toLowerCase();
  const dcParam = sp.get('dc');

  const [activeTab, setActiveTab] = useState<string>(severityParam || 'all');
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);

  const allIssues = useMemo<IssueRecord[]>(() => {
    const list: IssueRecord[] = [];

    // Exactly 4 Critical Issues (Availability & Hardware Failure Risk)
    const criticals: Omit<IssueRecord, 'severity' | 'status'>[] = [
      {
        id: 'ISS-CRIT-001',
        title: 'SXM GPU Module PCIe Eye-Height Degradation',
        domain: 'Compute Hardware',
        asset: 'VA-DC-001-GPU-001',
        assetRole: 'GPU',
        model: 'HGX H100 8-GPU',
        vendor: 'Supermicro / NVIDIA',
        rack: 'Rack A01 · U06-10',
        rackId: 'RACK-A',
        serial: 'NVHGX-VA001-01',
        dcId: 'VA-DC-001',
        ageDays: 2.1,
        impactDetail: 'PCIe Gen5 eye-height jitter degrades NVLink fabric; 8x H100 SXM5 GPUs throttled by 18%. Risk of node fencing in AI training cluster.',
        rootCause: 'Mezzanine socket 3 high-speed trace signal margin below 20%. Hardware vendor field engineer replacement scheduled.',
        correlatedService: 'AI Training Cluster "Llama-3-Cluster-02" (Worker Node #14)',
        workorderId: 'WO-2026-9041'
      },
      {
        id: 'ISS-CRIT-002',
        title: 'Dual PSU Redundancy Loss on Spine Fabric Switch',
        domain: 'Power / Fabric',
        asset: 'VA-DC-001-IB-SPINE-01',
        assetRole: 'Switch',
        model: 'Quantum-2 QM9700',
        vendor: 'NVIDIA',
        rack: 'Rack A01 · U40-41',
        rackId: 'RACK-A',
        serial: 'Q2-SPINE-VA01',
        dcId: 'VA-DC-001',
        ageDays: 3.4,
        impactDetail: 'PSU 2 lost AC feed; running on single power supply. N+0 state: any AC glitch will drop spine connectivity for 32 downstream GPU leaf switches.',
        rootCause: 'PDU breaker feed B-14 trip or internal PSU rectifier failure. PDU telemetry shows 0A draw on circuit B.',
        correlatedService: 'Spine Fabric Plane 1 (Ashburn DC East)',
        workorderId: 'WO-2026-8812'
      },
      {
        id: 'ISS-CRIT-003',
        title: 'Datastore LUN Path Disconnect / All Paths Down',
        domain: 'Storage SAN',
        asset: 'CA-DC-020-STG-001',
        assetRole: 'Storage',
        model: 'Ceres AI400X2 NVMe-oF',
        vendor: 'VAST Data',
        rack: 'Rack B02 · U12-16',
        rackId: 'RACK-B',
        serial: 'VAST-STG-CA20-01',
        dcId: 'CA-DC-020',
        ageDays: 1.8,
        impactDetail: 'Secondary Fibre Channel / RoCE datastore path unmapped. Controller failover active; storage latency doubled under peak checkpoint writes.',
        rootCause: 'HBA port failure on target storage controller node 2. Storage array operating in degraded multipath mode.',
        correlatedService: 'High-Throughput Checkpoint Datastore Pool A',
        workorderId: 'WO-2026-9104'
      },
      {
        id: 'ISS-CRIT-004',
        title: 'Liquid Cooling CDU Secondary Loop Flow Degradation',
        domain: 'Cooling Plant',
        asset: 'TX-DC-022-CRAH-11',
        assetRole: 'Cooling',
        model: 'EcoStruxure CDU-300',
        vendor: 'Schneider Electric',
        rack: 'Zone G · Row 3 CDU',
        rackId: 'RACK-A',
        serial: 'SCH-CDU-TX22',
        dcId: 'TX-DC-022',
        ageDays: 4.2,
        impactDetail: 'Coolant flow dropped to 38 L/min (nominal >60 L/min). Cold plate delta-T approaching 14°C threshold on 16 dense GPU racks.',
        rootCause: 'Secondary loop inline strainer pressure differential > 0.8 bar. Particulate accumulation requiring flushing and filter replacement.',
        correlatedService: 'Liquid Cooling Loop 2 (High-Density GPU Hall B)',
        workorderId: 'WO-2026-8790'
      }
    ];
    criticals.forEach(c => list.push({ ...c, severity: 'critical', status: 'In Progress' }));

    // Exactly 10 High Issues (Redundancy, Firmware/OS Drift, Link Integrity)
    const highs: Omit<IssueRecord, 'severity' | 'status'>[] = [
      {
        id: 'ISS-HIGH-001',
        title: 'InfiniBand Rail Flapping / CRC Error Rate Exceeded',
        domain: 'Fabric Connectivity',
        asset: 'VA-DC-001-IB-SPINE-02',
        assetRole: 'Switch',
        model: 'Quantum-2 QM9700 NDR',
        vendor: 'NVIDIA',
        rack: 'Rack A02 · U40',
        rackId: 'RACK-A',
        serial: 'Q2-SPINE-VA02',
        dcId: 'VA-DC-001',
        ageDays: 3.1,
        impactDetail: 'Port 14 flapping under load; FCS error rate > 1e-5 on QSFP-NDR optic. Multi-rail AI training jobs dropping packets on Rail 2.',
        rootCause: 'Optical transceiver Rx power degraded to -8.9 dBm (dirty MPO-12 bulkhead or optic laser aging).',
        correlatedService: 'InfiniBand NDR Fabric Rail 2',
        workorderId: 'WO-2026-8921'
      },
      {
        id: 'ISS-HIGH-002',
        title: 'Golden OS Image Version Drift (Kernel CVE-2024-21626)',
        domain: 'OS Compliance',
        asset: 'VA-DC-001-CPU-0001',
        assetRole: 'Server',
        model: 'PowerEdge R760',
        vendor: 'Dell Technologies',
        rack: 'Rack A01 · U14',
        rackId: 'RACK-A',
        serial: 'DELL-R760-VA01',
        dcId: 'VA-DC-001',
        ageDays: 5.6,
        impactDetail: 'Host running kernel 5.15.0-89 instead of baseline 5.15.0-107. Security policy violation and runtime container escape vulnerability.',
        rootCause: 'Node was manually rebooted during patch wave and skipped Ansible compliance pipeline.',
        correlatedService: 'Kubernetes Infrastructure Control Plane',
        workorderId: 'WO-2026-8650'
      },
      {
        id: 'ISS-HIGH-003',
        title: 'NVLink Mesh Inter-GPU Retransmit Surge',
        domain: 'Compute Hardware',
        asset: 'VA-DC-001-GPU-002',
        assetRole: 'GPU',
        model: 'HGX H100 8-GPU',
        vendor: 'NVIDIA',
        rack: 'Rack A02 · U06-10',
        rackId: 'RACK-A',
        serial: 'NVHGX-VA001-02',
        dcId: 'VA-DC-001',
        ageDays: 2.8,
        impactDetail: 'NVLink interconnect retransmit count > 2.4%; GPU-to-GPU memory copy bandwidth degraded from 900 GB/s to 738 GB/s.',
        rootCause: 'High-speed bridge cable connector seating loose on NVSwitch tray port 3.',
        correlatedService: 'Distributed LLM Pre-training Node Pool',
        workorderId: 'WO-2026-9011'
      },
      {
        id: 'ISS-HIGH-004',
        title: 'BGP EVPN Route Target Mismatch on DCI Tunnel',
        domain: 'Routing / Fabric',
        asset: 'WA-DC-013-BDR-01',
        assetRole: 'Router',
        model: 'MX304',
        vendor: 'Juniper Networks',
        rack: 'Rack A01 · U02',
        rackId: 'RACK-A',
        serial: 'JNPR-MX304-WA13',
        dcId: 'WA-DC-013',
        ageDays: 4.0,
        impactDetail: 'Inter-DC VXLAN tunnel failing route import for VRF 24186:10251. Cross-region tenant replication traffic blackholed.',
        rootCause: 'BGP community string 65000:10251 missing in router route-target export policy after recent maintenance commit.',
        correlatedService: 'Inter-DC WAN Overlay (Ashburn ↔ Seattle)',
        workorderId: 'WO-2026-8805'
      },
      {
        id: 'ISS-HIGH-005',
        title: 'Online UPS Battery Impedance Threshold Exceeded',
        domain: 'Power Plant',
        asset: 'WA-DC-013-UPS-1',
        assetRole: 'Power',
        model: 'Galaxy VX 1250kVA',
        vendor: 'Schneider Electric',
        rack: 'Electrical Room A · UPS-1',
        rackId: 'RACK-A',
        serial: 'SCH-UPS-WA13-01',
        dcId: 'WA-DC-013',
        ageDays: 6.2,
        impactDetail: 'String 3 battery cell #14 internal impedance reached 48 mOhm. Autonomy runtime reduced by 22% under full facility load.',
        rootCause: 'VRLA battery jar chemical degradation. Cell replacement required to restore full 15-minute runtime SLA.',
        correlatedService: 'Facility Critical Power Bus A',
        workorderId: 'WO-2026-8510'
      },
      {
        id: 'ISS-HIGH-006',
        title: 'Kubernetes Worker Node Pod Eviction Loop',
        domain: 'Virtual Workload',
        asset: 'IL-DC-009-CPU-0001',
        assetRole: 'Server',
        model: 'PowerEdge R760',
        vendor: 'Dell Technologies',
        rack: 'Rack A01 · U18',
        rackId: 'RACK-A',
        serial: 'DELL-R760-IL09-01',
        dcId: 'IL-DC-009',
        ageDays: 3.0,
        impactDetail: 'Memory pressure threshold breached (92% used). Kubelet evicting daemonset and inference pods in cascading loop.',
        rootCause: 'Telemetry exporter daemon memory leak consuming 48 GB swapless memory.',
        correlatedService: 'Inference Serving Microservice Mesh',
        workorderId: 'WO-2026-8940'
      },
      {
        id: 'ISS-HIGH-007',
        title: 'Storage Metadata Node Sync Latency > 15ms',
        domain: 'Storage SAN',
        asset: 'IL-DC-009-STG-001',
        assetRole: 'Storage',
        model: 'Ceres AI400X2',
        vendor: 'VAST Data',
        rack: 'Rack A01 · U24-28',
        rackId: 'RACK-A',
        serial: 'VAST-STG-IL09-01',
        dcId: 'IL-DC-009',
        ageDays: 4.5,
        impactDetail: 'Metadata consensus cluster latency spike. I/O queue depths rising on all connected training pods.',
        rootCause: 'NVMe write endurance exceeded on metadata SSD slot 3; write amplification factor elevated.',
        correlatedService: 'Shared Flash Global Namespace',
        workorderId: 'WO-2026-8715'
      },
      {
        id: 'ISS-HIGH-008',
        title: 'CRAH Supply Air Temperature Sensor Float',
        domain: 'Cooling Plant',
        asset: 'CA-DC-020-CRAH-11',
        assetRole: 'Cooling',
        model: 'CyberAir 3 DX',
        vendor: 'Stulz',
        rack: 'Hall B · CRAH-11',
        rackId: 'RACK-A',
        serial: 'STZ-CA20-01',
        dcId: 'CA-DC-020',
        ageDays: 5.1,
        impactDetail: 'Supply air sensor floating +4.2°C higher than thermocouple ground truth. CRAH fan running at 100% duty unnecessarily.',
        rootCause: 'Thermistor calibration drift inside supply plenum air stream.',
        correlatedService: 'Hall B Cold Aisle Air Distribution',
        workorderId: 'WO-2026-8680'
      },
      {
        id: 'ISS-HIGH-009',
        title: 'BMC Firmware Out-of-Date / Advisory Bulletin',
        domain: 'Firmware Compliance',
        asset: 'TX-DC-022-CPU-0001',
        assetRole: 'Server',
        model: 'PowerEdge R760',
        vendor: 'Dell Technologies',
        rack: 'Rack A01 · U16',
        rackId: 'RACK-A',
        serial: 'DELL-R760-TX22',
        dcId: 'TX-DC-022',
        ageDays: 7.0,
        impactDetail: 'iDRAC firmware build 6.10.30 carries advisory for IPMI out-of-band crash during heavy SNMP polling.',
        rootCause: 'Server missed scheduled firmware maintenance cycle due to customer lock.',
        correlatedService: 'DCIM Out-of-Band Telemetry Roster',
        workorderId: 'WO-2026-8422'
      },
      {
        id: 'ISS-HIGH-010',
        title: 'Fibre Patch Cord Insertion Loss > 1.8dB',
        domain: 'Passive Cabling',
        asset: 'WA-DC-024-IB-SPINE-01',
        assetRole: 'Switch',
        model: 'Quantum-2 QM9700',
        vendor: 'NVIDIA',
        rack: 'Rack A01 · U40',
        rackId: 'RACK-A',
        serial: 'Q2-SPINE-WA24',
        dcId: 'WA-DC-024',
        ageDays: 2.4,
        impactDetail: 'Optical trunk cable insertion loss 1.95 dB (budget max 1.5 dB). Forward error correction (FEC) frame loss detected.',
        rootCause: 'Micro-bend on MPO-12 trunk cable inside overhead yellow fiber raceway.',
        correlatedService: 'Inter-Rack Backbone Optical Trunk',
        workorderId: 'WO-2026-9080'
      }
    ];
    highs.forEach(h => list.push({ ...h, severity: 'high', status: 'Open' }));

    // Exactly 20 Low Issues (Configuration, Minor Drift, Maintenance Notices)
    const lowTemplates = [
      { t: 'PDU Out-of-Band SNMP Poll Latency Spike', r: 'Power' as IssueRole, dom: 'DCIM Telemetry', m: 'ePDU G3 Managed', v: 'Eaton' },
      { t: 'Non-standard Chassis Asset Tagging in Hall B', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'PowerEdge R760', v: 'Dell' },
      { t: 'Redundant NTP Stratum Offset Drift > 5ms', r: 'Router' as IssueRole, dom: 'Configuration Governance', m: 'MX304', v: 'Juniper' },
      { t: 'Cable Tray Fill Ratio Approaching 80%', r: 'Passive' as IssueRole, dom: 'DCIM Telemetry', m: 'Overhead Fiber Raceway', v: 'Panduit' },
      { t: 'Minor OS Build Revision Mismatch on OOB Switch', r: 'Switch' as IssueRole, dom: 'Configuration Governance', m: 'Catalyst 9300', v: 'Cisco' },
      { t: 'Environmental Smoke Detector Self-Test Warning', r: 'Cooling' as IssueRole, dom: 'DCIM Telemetry', m: 'VESDA LaserFocus', v: 'Xtralis' },
      { t: 'Virtual Switch Uplink VLAN Pruning Advisory', r: 'Switch' as IssueRole, dom: 'Configuration Governance', m: 'Nexus 9336C', v: 'Cisco' },
      { t: 'Spares Depot Replenishment Lead Time Alert', r: 'Storage' as IssueRole, dom: 'DCIM Telemetry', m: 'Ceres NVMe Spare Kit', v: 'VAST Data' },
      { t: 'Rack Rear Door Heat Exchanger Flow Nominal', r: 'Cooling' as IssueRole, dom: 'DCIM Telemetry', m: 'RDHx Water Door', v: 'Motivair' },
      { t: 'DNS PTR Record Missing on IPMI Interface', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'PowerEdge R760', v: 'Dell' },
      { t: 'LLDP Chassis Description Truncation Warning', r: 'Switch' as IssueRole, dom: 'Configuration Governance', m: 'Quantum-2 QM9700', v: 'NVIDIA' },
      { t: 'Secondary Power Meter Modbus CRC Retries', r: 'Power' as IssueRole, dom: 'DCIM Telemetry', m: 'PowerLogic PM8000', v: 'Schneider' },
      { t: 'Optical Module Temperature Drift Notice', r: 'Switch' as IssueRole, dom: 'DCIM Telemetry', m: '400G-DR4 QSFP-DD', v: 'Innolight' },
      { t: 'Server BIOS Boot Order Deviation Notice', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'PowerEdge R760', v: 'Dell' },
      { t: 'Console Terminal Server Port Stale Session', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'IOLAN SCS48', v: 'Perle' },
      { t: 'Kubernetes Ingress Controller SSL Expiry (60d)', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'PowerEdge R760', v: 'Dell' },
      { t: 'Backup Agent Catalog Compaction Scheduled', r: 'Storage' as IssueRole, dom: 'DCIM Telemetry', m: 'Ceres AI400X2', v: 'VAST Data' },
      { t: 'ODF Patch Cord Labeling Protocol Discrepancy', r: 'Passive' as IssueRole, dom: 'Configuration Governance', m: 'High-Density ODF 96F', v: 'CommScope' },
      { t: 'Airflow Containment Brush Strip Wear Notice', r: 'Cooling' as IssueRole, dom: 'DCIM Telemetry', m: 'Cold Aisle Containment', v: 'Subzero' },
      { t: 'Decommission Work Order Documentation Incomplete', r: 'Server' as IssueRole, dom: 'Configuration Governance', m: 'PowerEdge R740', v: 'Dell' }
    ];

    lowTemplates.forEach((lt, i) => {
      const dcObj = dcs[i % dcs.length];
      const dcId = dcObj ? dcObj.id : 'VA-DC-001';
      const rolePrefix = lt.r === 'GPU' ? 'GPU' : lt.r === 'Switch' ? 'IB-LEAF' : lt.r === 'Storage' ? 'STG' : lt.r === 'Server' ? 'CPU' : lt.r === 'Router' ? 'BDR' : lt.r === 'Cooling' ? 'CRAH' : 'PDU';
      const assetNum = String((i % 4) + 1).padStart(3, '0');
      const rackNum = ['A01', 'A02', 'B01', 'B02'][i % 4];
      const uNum = String(12 + (i * 2));

      list.push({
        id: `ISS-LOW-${String(i + 1).padStart(3, '0')}`,
        title: lt.t,
        severity: 'low',
        domain: lt.dom,
        asset: `${dcId}-${rolePrefix}-${assetNum}`,
        assetRole: lt.r,
        model: lt.m,
        vendor: lt.v,
        rack: `Rack ${rackNum} · U${uNum}`,
        rackId: `RACK-${rackNum[0]}`,
        serial: `${lt.v.slice(0, 3).toUpperCase()}-${dcId.split('-')[0]}-${String(8800 + i)}`,
        dcId,
        ageDays: Number((1.5 + (i * 0.4)).toFixed(1)),
        status: 'Open',
        impactDetail: `Minor telemetry alert on ${lt.m}. Operating within safe margins; scheduled for periodic audit cleanup.`,
        rootCause: `Routine baseline deviation logged by automated DCIM collector. No active service degradation.`,
        correlatedService: `Facility Infrastructure Support Bus (${dcId})`,
        workorderId: `WO-2026-${String(9200 + i)}`
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

  const openAssetInPhysical = (issue: IssueRecord) => {
    const roleTab = issue.assetRole === 'GPU' ? 'gpu'
      : issue.assetRole === 'Switch' ? 'switch'
      : issue.assetRole === 'Storage' ? 'storage'
      : issue.assetRole === 'Server' ? 'server'
      : issue.assetRole === 'Router' ? 'router'
      : 'all';
    nav(withSolution(`/inventory/physical?solution=Datacenter&tab=${encodeURIComponent(roleTab)}&drill=${encodeURIComponent(issue.asset)}`));
  };

  const openSiteDetails = (dcId: string) => {
    nav(withSolution(`/inventory/location/site/${encodeURIComponent(dcId)}/details?from=Inventory%20issues`));
  };

  const openRackLayout = (issue: IssueRecord) => {
    nav(withSolution(`/inventory/passive?tab=rack&dc=${encodeURIComponent(issue.dcId)}&rack=${encodeURIComponent(issue.rackId)}`));
  };

  const issueActions = (r: IssueRecord): Action[] => [
    {
      l: 'View Correlation & Details',
      primary: true,
      onClick: () => setSelectedIssue(r)
    },
    {
      l: 'View Asset in Physical Inventory',
      onClick: () => openAssetInPhysical(r)
    },
    {
      l: `View Site Details (${r.dcId})`,
      onClick: () => openSiteDetails(r.dcId)
    },
    {
      l: `View Rack Layout (${r.rack.split(' · ')[0]})`,
      onClick: () => openRackLayout(r)
    }
  ];

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
            { t: 'Issue ID', w: '8.5rem' },
            { t: 'Severity', w: '6.5rem' },
            { t: 'Defect Summary', w: '22rem' },
            { t: 'Correlated Inventory Asset', w: '16rem' },
            { t: 'Hardware Model & Spec', w: '16rem' },
            { t: 'Location / Rack', w: '12rem' },
            { t: 'Subsystem Domain', w: '11rem' },
            { t: 'Age', r: true, w: '5.5rem' },
            { t: 'Status', plain: true, w: '7.5rem' }
          ]}
          rows={filteredRows}
          total={filteredRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search defect title, asset name, model, rack, domain, data center..."
          filters={[
            { n: 'Severity', o: ['critical', 'high', 'low'] },
            { n: 'Asset Role', o: ['GPU', 'Switch', 'Storage', 'Server', 'Router', 'Cooling', 'Power'] },
            { n: 'Data Center', o: dcs.map(d => d.id) },
            { n: 'Status', o: ['Open', 'In Progress', 'Awaiting Vendor'] }
          ]}
          rowActions={issueActions}
          onRowClick={(r) => setSelectedIssue(r)}
          renderRow={r => {
            const badge = getRoleBadge(r.assetRole);
            return [
              <Mono>{r.id}</Mono>,
              <Chip tone={r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : 'neutral'}>
                {r.severity.toUpperCase()}
              </Chip>,
              <div style={{ maxWidth: '21rem', minWidth: '16rem' }}>
                <div style={{
                  fontWeight: 600,
                  color: 'var(--ii-text-heading, #0f172a)',
                  whiteSpace: 'normal',
                  lineHeight: 1.35,
                  wordBreak: 'break-word'
                }}>
                  {r.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
                  WO: {r.workorderId}
                </div>
              </div>,
              <div style={{ minWidth: '14rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    flexShrink: 0,
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`
                  }}>
                    {r.assetRole}
                  </span>
                  <span className="mono" style={{ fontWeight: 600, color: '#0f172a' }}>{r.asset}</span>
                </div>
              </div>,
              <div style={{ minWidth: '14rem' }}>
                <div style={{ fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap' }}>{r.model}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {r.vendor} · <span className="mono">{r.serial}</span>
                </div>
              </div>,
              <div style={{ minWidth: '10rem' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{r.dcId}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {r.rack}
                </div>
              </div>,
              <span style={{ whiteSpace: 'nowrap', color: '#334155' }}>{r.domain}</span>,
              <span style={{ fontFamily: 'monospace', color: '#475569', whiteSpace: 'nowrap' }}>{r.ageDays}d</span>,
              <Chip tone={r.status === 'In Progress' ? 'info' : 'neutral'}>{r.status}</Chip>
            ];
          }}
        />
      </Card>

      {/* ── Inventory Correlation Inspection Drawer ── */}
      <Drawer
        open={Boolean(selectedIssue)}
        title={
          selectedIssue ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono">{selectedIssue.id}</span>
              <Chip tone={selectedIssue.severity === 'critical' ? 'error' : selectedIssue.severity === 'high' ? 'warning' : 'neutral'}>
                {selectedIssue.severity.toUpperCase()}
              </Chip>
              <Chip tone={selectedIssue.status === 'In Progress' ? 'info' : 'neutral'}>
                {selectedIssue.status}
              </Chip>
            </div>
          ) : ''
        }
        sub={selectedIssue?.title}
        onClose={() => setSelectedIssue(null)}
      >
        {selectedIssue && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>

            {/* Section 1: Correlated Inventory Element Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
                Correlated Inventory Element
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: getRoleBadge(selectedIssue.assetRole).bg,
                  color: getRoleBadge(selectedIssue.assetRole).color,
                  border: `1px solid ${getRoleBadge(selectedIssue.assetRole).border}`
                }}>
                  {selectedIssue.assetRole}
                </span>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  {selectedIssue.asset}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Hardware Model:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedIssue.vendor} {selectedIssue.model}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Serial Number:</span>
                  <div style={{ fontFamily: 'monospace', color: '#1e293b' }}>{selectedIssue.serial}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Data Center Site:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedIssue.dcId}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Physical Rack Placement:</span>
                  <div style={{ fontFamily: 'monospace', color: '#1e293b' }}>{selectedIssue.rack}</div>
                </div>
              </div>
            </div>

            {/* Section 2: Defect Diagnostic & Inventory Impact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Inventory Impact & Telemetry
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Observed Defect & Impact</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  {selectedIssue.impactDetail}
                </p>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Root Cause Hypothesis</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  {selectedIssue.rootCause}
                </p>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed' }}>Dependent Workloads / Fabric</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  {selectedIssue.correlatedService}
                </p>
              </div>
            </div>

            {/* Section 3: Remediation Context */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Remediation Workorder:</span>
                <span className="mono" style={{ fontWeight: 600, color: '#0f172a' }}>{selectedIssue.workorderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ color: '#64748b' }}>Defect Age:</span>
                <span className="mono">{selectedIssue.ageDays} days in remediation</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ color: '#64748b' }}>Domain Subsystem:</span>
                <span>{selectedIssue.domain}</span>
              </div>
            </div>

            {/* Section 4: Direct Navigation into Inventory */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Inventory Actions
              </div>
              <button
                type="button"
                className="nst-btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => openAssetInPhysical(selectedIssue)}
              >
                View Asset in Physical Inventory
              </button>
              <button
                type="button"
                className="nst-btn nst-btn--ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => openSiteDetails(selectedIssue.dcId)}
              >
                View Site Details ({selectedIssue.dcId})
              </button>
              <button
                type="button"
                className="nst-btn nst-btn--ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => openRackLayout(selectedIssue)}
              >
                View Rack Layout ({selectedIssue.rack.split(' · ')[0]})
              </button>
            </div>

          </div>
        )}
      </Drawer>
    </div>
  );
}
