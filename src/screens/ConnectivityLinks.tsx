import { useMemo, useState } from 'react';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo } from '../solution';
import { dcSumList } from '../data/dc/scope';

interface FabricLinkRow {
  id: string;
  name: string;
  protocol: 'InfiniBand' | 'Compute & Storage' | 'Management (OOB)' | 'Ethernet Fabric' | 'BGP / EVPN' | 'Optical DCI';
  aEnd: string;
  aPort: string;
  zEnd: string;
  zPort: string;
  capacity: string;
  dcId: string;
  utilPct: string;
  status: 'Up / Established' | 'Degraded' | 'Reserved';
}

export default function ConnectivityLinks() {
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);
  const [activeProto, setActiveProto] = useState<string>('all');

  const counts = useMemo(() => ({
    all: 12530,
    infiniband: 4846,
    computeStorage: 3609,
    oob: 2942,
    ethernet: 542,
    bgp: 450,
    dci: 141
  }), []);

  const rows = useMemo<FabricLinkRow[]>(() => {
    const list: FabricLinkRow[] = [];
    const dcIds = dcs.map(d => d.id);
    const protos: [FabricLinkRow['protocol'], number, string][] = [
      ['InfiniBand', 4846, '400 Gbps NDR'],
      ['Compute & Storage', 3609, '200 Gbps HDR / RoCEv2'],
      ['Management (OOB)', 2942, '10 Gbps 10GBASE-T'],
      ['Ethernet Fabric', 542, '100 Gbps CWDM4'],
      ['BGP / EVPN', 450, '400 Gbps ZR+'],
      ['Optical DCI', 141, '800 Gbps Coherent']
    ];

    let linkIdx = 1;
    for (const [protocol, count, capacity] of protos) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(linkIdx - 1) % dcIds.length];
        const rackNum = ((linkIdx % 24) + 1).toString().padStart(2, '0');
        list.push({
          id: `LNK-${String(linkIdx).padStart(6, '0')}`,
          name: `IB-${dcId}-RACK${rackNum}-L${linkIdx % 8}`,
          protocol,
          aEnd: `SPINE-${dcId}-${(linkIdx % 4) + 1}`,
          aPort: `Port ${(linkIdx % 32) + 1}`,
          zEnd: `LEAF-${dcId}-RACK${rackNum}`,
          zPort: `Uplink ${(linkIdx % 2) + 1}`,
          capacity,
          dcId,
          utilPct: `${Math.round(45 + (linkIdx % 45))}%`,
          status: linkIdx % 95 === 0 ? 'Degraded' : 'Up / Established'
        });
        linkIdx++;
      }
    }
    return list;
  }, [dcs]);

  const filteredRows = useMemo(() => {
    if (activeProto === 'all') return rows;
    if (activeProto === 'ib') return rows.filter(r => r.protocol === 'InfiniBand');
    if (activeProto === 'storage') return rows.filter(r => r.protocol === 'Compute & Storage');
    if (activeProto === 'oob') return rows.filter(r => r.protocol === 'Management (OOB)');
    if (activeProto === 'eth') return rows.filter(r => r.protocol === 'Ethernet Fabric');
    if (activeProto === 'bgp') return rows.filter(r => r.protocol === 'BGP / EVPN' || r.protocol === 'Optical DCI');
    return rows;
  }, [rows, activeProto]);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Total fabric links', v: counts.all.toLocaleString(), s: 'inter-device connections', t: 'purple' },
        { k: 'InfiniBand cluster', v: counts.infiniband.toLocaleString(), s: 'NDR 400G spine-leaf', t: 'cyan' },
        { k: 'Storage interconnect', v: counts.computeStorage.toLocaleString(), s: 'NVMe-oF / RoCEv2 mesh', t: 'slate' },
        { k: 'Out-of-band management', v: counts.oob.toLocaleString(), s: 'BMC / IPMI subnet links', t: 'emerald' },
        { k: 'Ethernet fabric', v: counts.ethernet.toLocaleString(), s: 'leaf-to-spine optics', t: 'amber' },
        { k: 'BGP / DCI tunnels', v: String(counts.bgp + counts.dci), s: 'inter-data center paths', t: 'purple' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'all', n: 'All Fabric Links', count: counts.all, title: 'All 12,530 links' },
            { k: 'ib', n: 'InfiniBand', count: counts.infiniband, title: '4,846 InfiniBand links' },
            { k: 'storage', n: 'Compute & Storage', count: counts.computeStorage, title: '3,609 storage links' },
            { k: 'oob', n: 'Management (OOB)', count: counts.oob, title: '2,942 management links' },
            { k: 'eth', n: 'Ethernet Fabric', count: counts.ethernet, title: '542 Ethernet links' },
            { k: 'bgp', n: 'BGP & DCI', count: counts.bgp + counts.dci, title: '591 DCI tunnels' }
          ]}
          active={activeProto}
          onChange={(k) => setActiveProto(k)}
        />

        <DataGrid<FabricLinkRow>
          key={activeProto}
          chipWidth="auto"
          columns={[
            { t: 'Link ID' },
            { t: 'Link Name' },
            { t: 'Protocol Layer' },
            { t: 'A-End Endpoint' },
            { t: 'Z-End Endpoint' },
            { t: 'Capacity / Standard' },
            { t: 'Data Center' },
            { t: 'Traffic Util.' },
            { t: 'Status' }
          ]}
          rows={filteredRows}
          total={filteredRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search link ID, endpoint device, port, protocol, data center..."
          filters={[
            { n: 'Protocol', o: ['InfiniBand', 'Compute & Storage', 'Management (OOB)', 'Ethernet Fabric', 'BGP / EVPN'] },
            { n: 'Data Center', o: dcs.map(d => d.id) }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.name}</span>,
            <Chip tone={r.protocol === 'InfiniBand' ? 'cyan' : r.protocol === 'Compute & Storage' ? 'neutral' : 'purple'}>
              {r.protocol}
            </Chip>,
            <span><Mono>{r.aEnd}</Mono> ({r.aPort})</span>,
            <span><Mono>{r.zEnd}</Mono> ({r.zPort})</span>,
            <Mono>{r.capacity}</Mono>,
            <Mono>{r.dcId}</Mono>,
            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.utilPct}</span>,
            <Chip tone={r.status.startsWith('Up') ? 'success' : 'warning'}>{r.status}</Chip>
          ]}
        />
      </Card>
    </div>
  );
}
