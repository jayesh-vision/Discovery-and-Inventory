import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo, withSolution } from '../solution';
import { dcSumList } from '../data/dc/scope';

interface LifecycleAssetRow {
  id: string;
  name: string;
  model: string;
  vendor: string;
  bucket: 'Active' | 'Passive' | 'Logical' | 'Virtual';
  dcId: string;
  lifecycleStatus: string;
  riskType: string;
  retirementDate: string;
  actionRequired: string;
}

export default function InventoryLifecycle() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const statusParam = sp.get('status');
  const riskParam = sp.get('lifecycle_risk');
  const bucketParam = sp.get('bucket')?.toLowerCase();

  // 1. Exactly 8 Decom Pending Removal records
  const pendingRemovalRows = useMemo<LifecycleAssetRow[]>(() => {
    const dcIds = dcs.map(d => d.id);
    const list: LifecycleAssetRow[] = [];
    const models = [
      ['DGX A100 (8x SXM4)', 'NVIDIA'],
      ['PowerEdge R740xd', 'Dell'],
      ['SYS-4029GP-TRT', 'Supermicro'],
      ['Quantum QM8700', 'Mellanox'],
      ['PowerEdge R7525', 'Dell'],
      ['DGX A100 (8x SXM4)', 'NVIDIA'],
      ['AI300 NVMe Array', 'DDN'],
      ['FortiGate 3600E', 'Fortinet']
    ];
    models.forEach(([model, vendor], i) => {
      const dcId = dcIds[i % dcIds.length];
      list.push({
        id: `DECOM-PEND-${String(i + 1).padStart(3, '0')}`,
        name: `RETIRED-NODE-${dcId}-${String(i + 10).padStart(3, '0')}`,
        model,
        vendor,
        bucket: 'Active',
        dcId,
        lifecycleStatus: 'Pending Removal / BMC Live',
        riskType: 'Ghost Presence / Telemetry Active',
        retirementDate: '2026-09-15',
        actionRequired: 'Work order dispatched: un-rack & sanitize drives'
      });
    });
    return list;
  }, [dcs]);

  // 1b. Exactly 40 Confirmed Removed records (Phase 3: drive sanitization complete & awaiting e-waste disposal)
  const confirmedRemovedRows = useMemo<LifecycleAssetRow[]>(() => {
    const dcIds = dcs.map(d => d.id);
    const list: LifecycleAssetRow[] = [];
    const models: [string, string, number][] = [
      ['DGX-1 (8x V100 32GB)', 'NVIDIA', 8],
      ['PowerEdge R740xd', 'Dell', 10],
      ['ProLiant DL380 Gen10', 'HPE', 8],
      ['Quantum QM8700 200G', 'Mellanox', 6],
      ['FlashArray//M50', 'Pure Storage', 4],
      ['FortiGate 3000D', 'Fortinet', 4]
    ]; // 8 + 10 + 8 + 6 + 4 + 4 = 40
    let idx = 1;
    for (const [model, vendor, count] of models) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(idx - 1) % dcIds.length];
        list.push({
          id: `DECOM-SAN-${String(idx).padStart(3, '0')}`,
          name: `RETIRED-SRV-${dcId}-${String(idx + 20).padStart(3, '0')}`,
          model,
          vendor,
          bucket: 'Active',
          dcId,
          lifecycleStatus: 'Confirmed Removed / Sanitized',
          riskType: 'Certified E-Waste / Salvage Disposition',
          retirementDate: '2026-08-20',
          actionRequired: 'NIST 800-88 crypto-wipe certified; awaiting metal salvage'
        });
        idx++;
      }
    }
    return list;
  }, [dcs]);

  const decommissionPipelineRows = useMemo<LifecycleAssetRow[]>(() => {
    return [...pendingRemovalRows, ...confirmedRemovedRows];
  }, [pendingRemovalRows, confirmedRemovedRows]);

  // 2. Exactly 348 Active EOL/EOS records
  const eolActiveRows = useMemo<LifecycleAssetRow[]>(() => {
    const dcIds = dcs.map(d => d.id);
    const list: LifecycleAssetRow[] = [];
    const vendorPlatforms: [string, string, number][] = [
      ['NVIDIA', 'DGX A100 Tensor Core', 132],
      ['Dell', 'PowerEdge XE8545 (8xA100)', 90],
      ['Supermicro', 'SYS-420GP-TNBR', 70],
      ['Mellanox', 'Quantum QM8700 200G', 28],
      ['DDN', 'AI300 NVMe High-Perf', 18],
      ['Fortinet', 'FortiGate 3600E DC Core', 10]
    ]; // 132 + 90 + 70 + 28 + 18 + 10 = 348
    let idx = 1;
    for (const [vendor, model, count] of vendorPlatforms) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(idx - 1) % dcIds.length];
        list.push({
          id: `EOL-ACT-${String(idx).padStart(4, '0')}`,
          name: `SRV-${dcId}-${model.split(' ')[0]}-${String(idx).padStart(3, '0')}`,
          model,
          vendor,
          bucket: 'Active',
          dcId,
          lifecycleStatus: 'In Service / End of Support Approaching',
          riskType: 'EOL / EOS Milestone Reached',
          retirementDate: '2026-12-31',
          actionRequired: 'Hardware refresh planned for H2'
        });
        idx++;
      }
    }
    return list;
  }, [dcs]);

  const activeMode = useMemo(() => {
    if (statusParam === 'decommission_pending_removal') return 'pending_removal';
    if (statusParam === 'confirmed_removed') return 'confirmed_removed';
    if (statusParam === 'decommissioned' || statusParam === 'decommission_pipeline') return 'decommission_pipeline';
    if (riskParam === 'eol_eos' && bucketParam === 'active') return 'eol_active';
    return statusParam ? 'decommission_pipeline' : 'decommission_pipeline';
  }, [statusParam, riskParam, bucketParam]);

  const displayedRows = useMemo(() => {
    if (activeMode === 'pending_removal') return pendingRemovalRows;
    if (activeMode === 'confirmed_removed') return confirmedRemovedRows;
    if (activeMode === 'decommission_pipeline') return decommissionPipelineRows;
    if (activeMode === 'eol_active') return eolActiveRows;
    return decommissionPipelineRows;
  }, [activeMode, pendingRemovalRows, confirmedRemovedRows, decommissionPipelineRows, eolActiveRows]);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Marked decommissioned', v: '48', s: 'total decommission pipeline', t: 'slate' },
        { k: 'Pending removal (BMC live)', v: '8', s: 'phase 2: awaiting un-racking', t: 'amber' },
        { k: 'Confirmed removed', v: '40', s: 'phase 3: retired & sanitized', t: 'emerald' },
        { k: 'Active EOL exposure', v: '348', s: 'vendor support expiration', t: 'red' },
        { k: 'Total EOL portfolio', v: '456', s: 'active, passive, logical & virtual', t: 'purple' },
        { k: 'Refresh lead time', v: '14 wk', s: 'vendor OEM delivery window', t: 'cyan' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'decommission_pipeline', n: 'Decommission Pipeline', count: 48, title: '48 total retired assets in disposal & e-waste pipeline' },
            { k: 'pending_removal', n: 'Pending Removal (BMC Live)', count: 8, title: '8 nodes awaiting physical extraction' },
            { k: 'confirmed_removed', n: 'Confirmed Removed (Sanitized)', count: 40, title: '40 nodes with verified drive sanitization' },
            { k: 'eol_active', n: 'Active EOL Exposure', count: 348, title: '348 active nodes with EOL exposure' }
          ]}
          active={activeMode}
          onChange={(k) => {
            if (k === 'pending_removal') {
              nav(withSolution('/inventory/lifecycle?status=decommission_pending_removal'));
            } else if (k === 'confirmed_removed') {
              nav(withSolution('/inventory/lifecycle?status=confirmed_removed'));
            } else if (k === 'decommission_pipeline') {
              nav(withSolution('/inventory/lifecycle?status=decommissioned'));
            } else {
              nav(withSolution('/inventory/lifecycle?lifecycle_risk=eol_eos&bucket=active'));
            }
          }}
        />

        <DataGrid<LifecycleAssetRow>
          key={activeMode}
          columns={[
            { t: 'Asset ID' },
            { t: 'Hostname / Asset Name' },
            { t: 'Hardware Model' },
            { t: 'Vendor' },
            { t: 'Data Center' },
            { t: 'Lifecycle Phase' },
            { t: 'Risk Type' },
            { t: 'Milestone / Action' }
          ]}
          rows={displayedRows}
          total={displayedRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search asset name, hardware model, vendor, data center..."
          filters={[
            { n: 'Vendor', o: ['NVIDIA', 'Dell', 'Supermicro', 'Mellanox', 'DDN', 'Fortinet'] },
            { n: 'Data Center', o: dcs.map(d => d.id) }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.name}</span>,
            <Mono>{r.model}</Mono>,
            <span>{r.vendor}</span>,
            <Mono>{r.dcId}</Mono>,
            <Chip tone={r.lifecycleStatus.includes('Pending') ? 'warning' : 'neutral'}>
              {r.lifecycleStatus}
            </Chip>,
            <span style={{ color: r.riskType.includes('Ghost') ? '#B45309' : '#DC2626', fontWeight: 500 }}>
              {r.riskType}
            </span>,
            <span style={{ fontSize: 13, color: 'var(--ii-text-body, #374151)' }}>{r.actionRequired}</span>
          ]}
        />
      </Card>
    </div>
  );
}
