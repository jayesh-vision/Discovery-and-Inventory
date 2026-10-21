import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { currentGeo, withSolution } from '../solution';
import { dcSumList } from '../data/dc/scope';

interface FirmwareDriftRow {
  id: string;
  name: string;
  vendor: 'Nvidia' | 'Supermicro' | 'Dell' | 'DDN' | 'Others';
  model: string;
  dcId: string;
  observedOs: string;
  approvedOs: string;
  cveAdvisory?: string;
  remediationStatus: 'Scheduled in next maintenance' | 'Hotfix pending approval' | 'Vendor patch available';
}

export default function FirmwareCompliance() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const activeGeo = currentGeo();
  const dcs = useMemo(() => dcSumList(activeGeo), [activeGeo]);

  const cveParam = sp.get('cve') === 'true';
  const [selectedVendor, setSelectedVendor] = useState<string>(cveParam ? 'cve' : 'all');

  // Exactly 111 off-baseline devices
  const allDriftRows = useMemo<FirmwareDriftRow[]>(() => {
    const list: FirmwareDriftRow[] = [];
    const dcIds = dcs.map(d => d.id);

    const vendorBreakdown: [FirmwareDriftRow['vendor'], string, number, string, string][] = [
      ['Nvidia', 'DGX H100 SXM5', 41, 'DGX OS 6.0.4 (Legacy)', 'DGX OS 6.2.1'],
      ['Supermicro', 'SYS-821GE-TNHR', 30, 'AMI BIOS 1.4b', 'AMI BIOS 1.8a'],
      ['Dell', 'PowerEdge R760', 27, 'iDRAC9 6.10.30.00', 'iDRAC9 7.00.00.00'],
      ['DDN', 'AI400X2 Lustre Controller', 3, 'EXAScaler 6.1.2', 'EXAScaler 6.3.0'],
      ['Others', 'FortiGate 4400F', 10, 'FortiOS 7.2.4', 'FortiOS 7.4.2']
    ]; // 41 + 30 + 27 + 3 + 10 = 111

    let idx = 1;
    let cveAssigned = 0;
    for (const [vendor, model, count, observedOs, approvedOs] of vendorBreakdown) {
      for (let i = 0; i < count; i++) {
        const dcId = dcIds[(idx - 1) % dcIds.length];
        // Exactly 18 carry CVE advisories
        const hasCve = cveAssigned < 18;
        if (hasCve) cveAssigned++;

        list.push({
          id: `DRIFT-${String(idx).padStart(4, '0')}`,
          name: `${vendor.toUpperCase()}-${dcId}-${String(i + 1).padStart(3, '0')}`,
          vendor,
          model,
          dcId,
          observedOs,
          approvedOs,
          cveAdvisory: hasCve ? (idx % 2 === 0 ? 'CVE-2024-21626 (Privilege Escalation)' : 'CVE-2023-44487 (HTTP/2 Rapid Reset)') : undefined,
          remediationStatus: hasCve ? 'Hotfix pending approval' : (i % 2 === 0 ? 'Scheduled in next maintenance' : 'Vendor patch available')
        });
        idx++;
      }
    }
    return list;
  }, [dcs]);

  const displayedRows = useMemo(() => {
    if (cveParam || selectedVendor === 'cve') {
      return allDriftRows.filter(r => !!r.cveAdvisory);
    }
    if (selectedVendor === 'all') return allDriftRows;
    return allDriftRows.filter(r => r.vendor.toLowerCase() === selectedVendor.toLowerCase());
  }, [allDriftRows, selectedVendor, cveParam]);

  return (
    <div className="page">

      <StatStrip cells={[
        { k: 'Off-baseline devices', v: '111', s: 'differ from golden image', t: 'amber' },
        { k: 'Published CVE exposure', v: '18', s: 'high-priority security advisories', t: 'red' },
        { k: 'Compliant on baseline', v: '3,728', s: 'verified active fleet', t: 'emerald' },
        { k: 'Fleet compliance ratio', v: '97.1%', s: 'target ≥ 95.0%', t: 'emerald' },
        { k: 'Top drift vendor', v: 'Nvidia (41)', s: 'GPU driver & OS release', t: 'cyan' },
        { k: 'No version recorded', v: '0', s: 'full telemetry coverage', t: 'slate' }
      ]} />

      <Card>
        <TabBar
          tabs={[
            { k: 'all', n: 'All Drifted Devices', count: 111, title: 'All 111 drifted devices' },
            { k: 'cve', n: 'Published CVEs', count: 18, title: '18 nodes with CVE advisories' },
            { k: 'nvidia', n: 'Nvidia', count: 41, title: '41 Nvidia systems' },
            { k: 'supermicro', n: 'Supermicro', count: 30, title: '30 Supermicro systems' },
            { k: 'dell', n: 'Dell', count: 27, title: '27 Dell systems' },
            { k: 'ddn', n: 'DDN', count: 3, title: '3 DDN controllers' },
            { k: 'others', n: 'Others', count: 10, title: '10 other fabric switches & firewalls' }
          ]}
          active={selectedVendor}
          onChange={(k) => {
            setSelectedVendor(k);
            if (k === 'cve') {
              nav(withSolution('/inventory/compliance/firmware?drift=true&cve=true'));
            } else {
              nav(withSolution('/inventory/compliance/firmware?drift=true'));
            }
          }}
        />

        <DataGrid<FirmwareDriftRow>
          key={selectedVendor}
          chipWidth="auto"
          columns={[
            { t: 'Device ID' },
            { t: 'Hostname / System' },
            { t: 'Vendor' },
            { t: 'Hardware Model' },
            { t: 'Data Center' },
            { t: 'Observed OS / Firmware' },
            { t: 'Golden Baseline' },
            { t: 'Security Advisory' },
            { t: 'Remediation Action' }
          ]}
          rows={displayedRows}
          total={displayedRows.length}
          rowKey={r => r.id}
          searchPlaceholder="Search hostname, model, observed version, CVE, data center..."
          filters={[
            { n: 'Vendor', o: ['Nvidia', 'Supermicro', 'Dell', 'DDN', 'Others'] },
            { n: 'Data Center', o: dcs.map(d => d.id) }
          ]}
          renderRow={r => [
            <Mono>{r.id}</Mono>,
            <span style={{ fontWeight: 600, color: 'var(--ii-text-heading, #111827)' }}>{r.name}</span>,
            <span>{r.vendor}</span>,
            <Mono>{r.model}</Mono>,
            <Mono>{r.dcId}</Mono>,
            <span style={{ color: '#DC2626', fontWeight: 500, fontFamily: 'monospace' }}>{r.observedOs}</span>,
            <span style={{ color: '#16A34A', fontWeight: 500, fontFamily: 'monospace' }}>{r.approvedOs}</span>,
            r.cveAdvisory ? <Chip tone="error">{r.cveAdvisory}</Chip> : <span style={{ color: 'var(--ii-text-muted, #9CA3AF)' }}>None</span>,
            <span style={{ fontSize: 13 }}>{r.remediationStatus}</span>
          ]}
        />
      </Card>
    </div>
  );
}
