import { useMemo, useState } from 'react';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo } from '../solution';
import { dcSumList } from '../data/dc/scope';
import { DC_VIRTUAL_RESOURCES } from '../data/dcVirtualResources';

interface UnifiedInventoryRow {
  id: string;
  name: string;
  bucket: 'Active' | 'Passive' | 'Connectivity' | 'Virtual';
  subType: string;
  vendor: string;
  model: string;
  dcId: string;
  status: string;
}

export default function AllInventory() {
  const activeGeo = currentGeo();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'passive' | 'connectivity' | 'virtual'>('all');

  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const counts = useMemo(() => {
    const active = 3839;
    const passive = 1648;
    const connectivity = 12530;
    const virtual = 128;
    const total = active + passive + connectivity + virtual; // 18,145
    return { active, passive, connectivity, virtual, total };
  }, []);

  // Deterministic rows generated to match exact aggregations
  const rows = useMemo<UnifiedInventoryRow[]>(() => {
    const list: UnifiedInventoryRow[] = [];
    const dcIds = dcs.map(d => d.id);

    // 1. Virtual (128)
    DC_VIRTUAL_RESOURCES.forEach((v) => {
      list.push({
        id: v.id,
        name: v.name,
        bucket: 'Virtual',
        subType: v.type,
        vendor: 'VMware / K8s',
        model: v.platform,
        dcId: v.siteId,
        status: v.status
      });
    });

    // 2. Sample Active (up to 3,839)
    const activeRoles: [string, string, string, number][] = [
      ['GPU Server', 'NVIDIA', 'HGX H100 (8x SXM5)', 2206],
      ['Spine Switch', 'NVIDIA', 'Quantum-2 QM9700', 679],
      ['Host Server', 'Dell', 'PowerEdge R760', 552],
      ['Storage Array', 'DDN', 'AI400X2 NVMe', 306],
      ['Edge Router', 'Cisco', '8201-32FH', 48],
      ['Firewall', 'Fortinet', 'FortiGate 4400F', 48]
    ];
    let devIdx = 1;
    for (const [role, vendor, model, count] of activeRoles) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(devIdx - 1) % dcIds.length];
        list.push({
          id: `DEV-${String(devIdx).padStart(5, '0')}`,
          name: `${role.toUpperCase().replace(/\s+/g, '-')}-${String(devIdx).padStart(4, '0')}`,
          bucket: 'Active',
          subType: role,
          vendor,
          model,
          dcId,
          status: i < 145 ? 'Planned' : 'In service'
        });
        devIdx++;
      }
    }

    // 3. Sample Passive (1,648)
    const passiveTypes: [string, string, number][] = [
      ['Server Rack', 'Rittal VX IT 48U', 720],
      ['Power Feed', 'Schneider Electric 400V 63A', 312],
      ['Cooling Unit', 'Vertiv Liebert CRAC 120kW', 240],
      ['Sensor', 'Sensaphone EnviroAlert EA800', 168],
      ['ODF Frame', 'Corning EDGE HD 288F', 48],
      ['Lit Fibre Span', 'MPO-24 Base-12 Trunk Cable', 160]
    ];
    let pasIdx = 1;
    for (const [subType, model, count] of passiveTypes) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(pasIdx - 1) % dcIds.length];
        list.push({
          id: `PAS-${String(pasIdx).padStart(5, '0')}`,
          name: `${subType.toUpperCase().replace(/\s+/g, '-')}-${String(pasIdx).padStart(4, '0')}`,
          bucket: 'Passive',
          subType,
          vendor: model.split(' ')[0],
          model,
          dcId,
          status: 'Operational'
        });
        pasIdx++;
      }
    }

    // 4. Sample Connectivity Links (12,530)
    const connProtos: [string, number][] = [
      ['InfiniBand Fabric', 4846],
      ['Compute & Storage Interconnect', 3609],
      ['Management OOB Network', 2942],
      ['Ethernet Leaf-Spine', 542],
      ['BGP / EVPN DCI Session', 450],
      ['Optical DCI Link', 141]
    ];
    let linkIdx = 1;
    for (const [proto, count] of connProtos) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(linkIdx - 1) % dcIds.length];
        list.push({
          id: `LNK-${String(linkIdx).padStart(6, '0')}`,
          name: `LINK-${proto.split(' ')[0].toUpperCase()}-${String(linkIdx).padStart(5, '0')}`,
          bucket: 'Connectivity',
          subType: proto,
          vendor: 'Optical Fabric',
          model: '100G / 400G SR4',
          dcId,
          status: 'Up / Established'
        });
        linkIdx++;
      }
    }

    return list;
  }, [dcs]);

  const filteredRows = useMemo(() => {
    if (activeTab === 'all') return rows;
    if (activeTab === 'active') return rows.filter(r => r.bucket === 'Active');
    if (activeTab === 'passive') return rows.filter(r => r.bucket === 'Passive');
    if (activeTab === 'connectivity') return rows.filter(r => r.bucket === 'Connectivity');
    if (activeTab === 'virtual') return rows.filter(r => r.bucket === 'Virtual');
    return rows;
  }, [rows, activeTab]);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Total inventory', v: counts.total.toLocaleString(), s: 'exact unified estate records', t: 'cyan' },
        { k: 'Active physical', v: counts.active.toLocaleString(), s: 'compute, switches & storage', t: 'slate' },
        { k: 'Passive plant', v: counts.passive.toLocaleString(), s: 'racks, power & cabling', t: 'emerald' },
        { k: 'Connectivity fabric', v: counts.connectivity.toLocaleString(), s: 'links & optical paths', t: 'purple' },
        { k: 'Virtual workloads', v: String(counts.virtual), s: 'VMs, K8s pods & datastores', t: 'amber' },
        { k: 'Facilities in scope', v: String(dcs.length), s: 'operational data centers', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'all', n: 'All Inventory', count: counts.total, title: 'All 18,145 records' },
            { k: 'active', n: 'Active Physical', count: counts.active, title: 'Active 3,839 records' },
            { k: 'passive', n: 'Passive Plant', count: counts.passive, title: 'Passive 1,648 records' },
            { k: 'connectivity', n: 'Connectivity Fabric', count: counts.connectivity, title: 'Connectivity 12,530 records' },
            { k: 'virtual', n: 'Virtual Resources', count: counts.virtual, title: 'Virtual 128 records' }
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as any)}
        />

        <DataGrid<UnifiedInventoryRow>
          key={activeTab}
          chipWidth="auto"
          columns={[
            { t: 'Record ID' },
            { t: 'Name' },
            { t: 'Inventory Bucket' },
            { t: 'Classification / Type' },
            { t: 'Vendor' },
            { t: 'Model / Specification' },
            { t: 'Data Center' },
            { t: 'Lifecycle Status' }
          ]}
          rows={filteredRows}
          total={filteredRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search by ID, name, vendor, model, data center..."
          filters={[
            { n: 'Inventory Bucket', o: ['Active', 'Passive', 'Connectivity', 'Virtual'] },
            { n: 'Data Center', o: dcs.map(d => d.id) },
            { n: 'Vendor', o: ['NVIDIA', 'Dell', 'Schneider Electric', 'Rittal', 'DDN', 'Cisco', 'Fortinet'] }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.name}</span>,
            <Chip tone={r.bucket === 'Active' ? 'info' : r.bucket === 'Passive' ? 'success' : r.bucket === 'Virtual' ? 'purple' : 'warning'}>
              {r.bucket}
            </Chip>,
            <span>{r.subType}</span>,
            <span>{r.vendor}</span>,
            <Mono>{r.model}</Mono>,
            <Mono>{r.dcId}</Mono>,
            <Chip tone={r.status === 'In service' || r.status === 'Operational' || r.status.includes('Up') || r.status === 'Running' ? 'success' : 'neutral'}>
              {r.status}
            </Chip>
          ]}
        />
      </Card>
    </div>
  );
}
