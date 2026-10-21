import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Chip, StatStrip } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';

interface SparesItemRow {
  id: string;
  model: string;
  vendor: string;
  category: string;
  deployed: number;
  spares: number;
  ratio: string;
  safeTarget: string;
  status: 'Critical Shortage' | 'Sub-optimal' | 'Healthy';
  depotLocations: string;
  leadTimeWeeks: number;
}

export default function SparesCoverage() {
  const [sp] = useSearchParams();
  const modelFilter = sp.get('model');

  const allModels: SparesItemRow[] = useMemo(() => [
    {
      id: 'SPR-MDL-001',
      model: 'Quantum-2 QM9700',
      vendor: 'NVIDIA Mellanox',
      category: 'NDR InfiniBand Spine Switch',
      deployed: 850,
      spares: 14,
      ratio: '1.6%',
      safeTarget: '≥ 2.0%',
      status: 'Critical Shortage',
      depotLocations: 'Ashburn Depot (VA), Santa Clara (CA)',
      leadTimeWeeks: 12
    },
    {
      id: 'SPR-MDL-002',
      model: 'PowerEdge XE8545 (8×A100)',
      vendor: 'Dell Technologies',
      category: 'High-Density GPU Compute Node',
      deployed: 271,
      spares: 4,
      ratio: '1.5%',
      safeTarget: '≥ 2.0%',
      status: 'Critical Shortage',
      depotLocations: 'Quincy Depot (WA), Chicago (IL)',
      leadTimeWeeks: 16
    },
    {
      id: 'SPR-MDL-003',
      model: 'SYS-821GE-TNHR (8×H100)',
      vendor: 'Supermicro',
      category: 'Liquid-Cooled GPU Cluster Node',
      deployed: 408,
      spares: 7,
      ratio: '1.7%',
      safeTarget: '≥ 2.0%',
      status: 'Critical Shortage',
      depotLocations: 'Dallas Depot (TX), Ashburn Depot (VA)',
      leadTimeWeeks: 14
    },
    {
      id: 'SPR-MDL-004',
      model: 'DGX A100',
      vendor: 'NVIDIA',
      category: 'Universal AI Training Server',
      deployed: 285,
      spares: 5,
      ratio: '1.8%',
      safeTarget: '≥ 2.0%',
      status: 'Critical Shortage',
      depotLocations: 'Santa Clara Depot (CA)',
      leadTimeWeeks: 10
    }
  ], []);

  const displayedRows = useMemo(() => {
    if (!modelFilter) return allModels;
    return allModels.filter(r => r.model.toLowerCase() === modelFilter.toLowerCase());
  }, [allModels, modelFilter]);

  const totalDeployed = displayedRows.reduce((a, b) => a + b.deployed, 0);
  const totalSpares = displayedRows.reduce((a, b) => a + b.spares, 0);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Models at risk', v: String(displayedRows.length), s: 'holding under 2.0% spares', t: 'red' },
        { k: 'Deployed fleet', v: totalDeployed.toLocaleString(), s: 'in-service operational nodes', t: 'slate' },
        { k: 'Depot spares on hand', v: String(totalSpares), s: 'tested FRU inventory in depots', t: 'amber' },
        { k: 'Average coverage ratio', v: '1.65%', s: 'safe threshold target ≥ 2.0%', t: 'red' },
        { k: 'Replenishments on order', v: '24 units', s: 'scheduled depot delivery', t: 'cyan' },
        { k: 'Average vendor lead time', v: '13 wk', s: 'critical component turnaround', t: 'purple' }
      ]} />

      <Card>
        <DataGrid<SparesItemRow>
          chipWidth="auto"
          columns={[
            { t: 'Hardware Model' },
            { t: 'OEM Vendor' },
            { t: 'Component Category' },
            { t: 'In-Service Fleet' },
            { t: 'Depot Spares' },
            { t: 'Coverage Ratio (%)' },
            { t: 'Safe Threshold' },
            { t: 'Depot Status' },
            { t: 'Primary Stock Depots' }
          ]}
          rows={displayedRows}
          total={displayedRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search hardware model, OEM vendor, category..."
          renderRow={r => [
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.model}</span>,
            <span>{r.vendor}</span>,
            <span>{r.category}</span>,
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.deployed.toLocaleString()}</span>,
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}>{r.spares}</span>,
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}>{r.ratio}</span>,
            <span style={{ fontFamily: 'monospace', color: 'var(--ii-text-muted, #6B7280)' }}>{r.safeTarget}</span>,
            <Chip tone="error">{r.status}</Chip>,
            <span style={{ fontSize: 13, color: 'var(--ii-text-muted, #6B7280)' }}>{r.depotLocations}</span>
          ]}
        />
      </Card>
    </div>
  );
}
