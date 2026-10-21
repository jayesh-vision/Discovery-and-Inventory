import { useMemo, useState } from 'react';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo } from '../solution';
import { dcSumList } from '../data/dc/scope';

interface StaleRecordRow {
  id: string;
  name: string;
  bucket: 'Active' | 'Virtual' | 'Connectivity' | 'Passive';
  subType: string;
  dcId: string;
  lastTelemetrySeen: string;
  collector: string;
  stalenessDays: number;
  rootCause: string;
}

export default function TelemetryStaleness() {
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const [activeTab, setActiveTab] = useState<string>('all');

  // Exactly 234 Stale Records: 198 Active + 20 Virtual + 10 Connectivity + 6 Passive
  const allStaleRows = useMemo<StaleRecordRow[]>(() => {
    const list: StaleRecordRow[] = [];
    const dcIds = dcs.map(d => d.id);

    // 1. Active: 198 records
    for (let i = 0; i < 198; i++) {
      const dcId = dcIds[i % dcIds.length];
      list.push({
        id: `STALE-ACT-${String(i + 1).padStart(4, '0')}`,
        name: `HOST-SVR-${dcId}-${String(i + 1).padStart(3, '0')}`,
        bucket: 'Active',
        subType: i % 2 === 0 ? 'GPU Compute Server' : 'Storage Controller Node',
        dcId,
        lastTelemetrySeen: '34 days ago',
        collector: 'DCIM BMC Telemetry Agent 02',
        stalenessDays: 30 + (i % 25),
        rootCause: 'Collector instance missed 3 poll windows due to network gateway timeout'
      });
    }

    // 2. Virtual: 20 records
    for (let i = 0; i < 20; i++) {
      const dcId = dcIds[i % dcIds.length];
      list.push({
        id: `STALE-VIR-${String(i + 1).padStart(4, '0')}`,
        name: `VM-WORKLOAD-${dcId}-${String(i + 1).padStart(2, '0')}`,
        bucket: 'Virtual',
        subType: 'Kubernetes Worker Pod',
        dcId,
        lastTelemetrySeen: '38 days ago',
        collector: 'OpenShift Kubelet Telemetry Service',
        stalenessDays: 32 + (i % 18),
        rootCause: 'Node drained during hypervisor maintenance; VM state unconfirmed'
      });
    }

    // 3. Connectivity: 10 records
    for (let i = 0; i < 10; i++) {
      const dcId = dcIds[i % dcIds.length];
      list.push({
        id: `STALE-CONN-${String(i + 1).padStart(4, '0')}`,
        name: `FABRIC-LINK-${dcId}-L${i + 1}`,
        bucket: 'Connectivity',
        subType: 'InfiniBand Spine-Leaf Path',
        dcId,
        lastTelemetrySeen: '42 days ago',
        collector: 'LLDP / BGP Fabric Telemetry Probe',
        stalenessDays: 35 + (i % 15),
        rootCause: 'Peer interface admin down; optical telemetry unconfirmed'
      });
    }

    // 4. Passive: 6 records
    for (let i = 0; i < 6; i++) {
      const dcId = dcIds[i % dcIds.length];
      list.push({
        id: `STALE-PAS-${String(i + 1).padStart(4, '0')}`,
        name: `PDU-SMART-SENS-${dcId}-R${i + 1}`,
        bucket: 'Passive',
        subType: 'Intelligent Rack PDU Sensor',
        dcId,
        lastTelemetrySeen: '45 days ago',
        collector: 'Modbus / SNMP Facility Poller',
        stalenessDays: 38 + i,
        rootCause: 'RS-485 serial bus transmission retry limit exceeded'
      });
    }

    return list;
  }, [dcs]);

  const filteredRows = useMemo(() => {
    if (activeTab === 'all') return allStaleRows;
    return allStaleRows.filter(r => r.bucket.toLowerCase() === activeTab.toLowerCase());
  }, [allStaleRows, activeTab]);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Total unconfirmed 30+ d', v: '234', s: 'telemetry polling gap', t: 'amber' },
        { k: 'Active physical nodes', v: '198', s: 'BMC telemetry unrefreshed', t: 'cyan' },
        { k: 'Virtual instances', v: '20', s: 'hypervisor state pending', t: 'purple' },
        { k: 'Fabric connectivity links', v: '10', s: 'LLDP / BGP telemetry drift', t: 'slate' },
        { k: 'Passive rack sensors', v: '6', s: 'smart PDU bus timeout', t: 'emerald' },
        { k: 'Overall estate freshness', v: '93.9%', s: 'verified within 24h SLA', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'all', n: 'All Stale Records', count: 234, title: 'All 234 stale records' },
            { k: 'active', n: 'Active Nodes', count: 198, title: '198 Active nodes' },
            { k: 'virtual', n: 'Virtual Instances', count: 20, title: '20 Virtual workloads' },
            { k: 'connectivity', n: 'Connectivity Fabric', count: 10, title: '10 Fabric links' },
            { k: 'passive', n: 'Passive Sensors', count: 6, title: '6 Passive sensors' }
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k)}
        />

        <DataGrid<StaleRecordRow>
          key={activeTab}
          chipWidth="auto"
          columns={[
            { t: 'Record ID' },
            { t: 'Asset / Endpoint Name' },
            { t: 'Category Bucket' },
            { t: 'Subsystem / Role' },
            { t: 'Data Center' },
            { t: 'Staleness' },
            { t: 'Collector Subsystem' },
            { t: 'Root Cause Diagnostics' }
          ]}
          rows={filteredRows}
          total={filteredRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search asset name, bucket, collector, data center..."
          filters={[
            { n: 'Category Bucket', o: ['Active', 'Virtual', 'Connectivity', 'Passive'] },
            { n: 'Data Center', o: dcs.map(d => d.id) }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.name}</span>,
            <Chip tone={r.bucket === 'Active' ? 'cyan' : r.bucket === 'Virtual' ? 'purple' : r.bucket === 'Connectivity' ? 'neutral' : 'success'}>
              {r.bucket}
            </Chip>,
            <span>{r.subType}</span>,
            <Mono>{r.dcId}</Mono>,
            <span style={{ color: '#D97706', fontWeight: 600, fontFamily: 'monospace' }}>{r.stalenessDays} days ago</span>,
            <span style={{ fontSize: 13 }}>{r.collector}</span>,
            <span style={{ fontSize: 13, color: 'var(--ii-text-body, #374151)' }}>{r.rootCause}</span>
          ]}
        />
      </Card>
    </div>
  );
}
