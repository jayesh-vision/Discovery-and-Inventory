import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Drawer } from '../components/Drawer';
import { DOMAIN_HEX, DOMAIN_LABEL, DOMAIN_TRUST_ROWS, type DomainKey } from '../data/discoveryOverview';
import { domainDevices, type DomainDevice } from '../data/domainDevices';

const URL_TO_DOMAIN: Record<string, DomainKey> = { ran: 'RAN', transport: 'Transport', core: 'Core', ipmpls: 'IPMPLS' };
export const domainToUrl = (d: DomainKey) => d.toLowerCase();

export default function DomainDevices() {
  const { domain: urlDomain } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const domain = urlDomain ? URL_TO_DOMAIN[urlDomain.toLowerCase()] : undefined;
  const row = domain ? DOMAIN_TRUST_ROWS.find(d => d.domain === domain) : undefined;
  /* set only when this screen was reached by clicking one cell of Insights'
     "Open discrepancies by region" heatmap — otherwise every region cell
     for a domain landed on the exact same undifferentiated roster, which
     read as "wrong data" no matter which cell was actually clicked */
  const region = searchParams.get('region');
  const clearRegion = () => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('region'); return n; });

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<DomainDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [justScanned, setJustScanned] = useState(false);

  const base = useMemo(() => (domain ? domainDevices(domain, region ?? undefined) : []), [domain, region]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.issue.toLowerCase().includes(q))) return false;
      if (filters.Status && d.status !== filters.Status) return false;
      return true;
    });
  }, [base, query, filters]);

  const openDevice = (d: DomainDevice) => {
    setOpen(d); setShowRaw(false); setScanNote(null); setJustScanned(false);
  };
  const closeDevice = () => setOpen(null);
  const rerun = () => {
    if (!open) return;
    setScanning(true); setScanNote(null);
    setTimeout(() => {
      setScanning(false); setJustScanned(true);
      setScanNote(open.status === 'Open' ? 'Scan complete — discrepancy still present.' : 'Scan complete — still awaiting first verification.');
    }, 1000);
  };

  if (!domain || !row) {
    return (
      <div className="page">
        <Card><span className="vw-card-description">Unknown domain.</span></Card>
      </div>
    );
  }

  const hex = DOMAIN_HEX[domain];

  return (
    <div className="page">
      <div className="row vw-items-center" style={{ gap: '10px', marginBottom: 'var(--vw-space-sm)' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: hex, flexShrink: 0 }} />
        <span style={{ fontSize: '1.375rem', fontWeight: 600 }}>{DOMAIN_LABEL[domain]} devices{region ? ` · ${region}` : ''}</span>
        {region && <button className="nst-btn nst-btn--xs nst-btn--ghost" onClick={clearRegion}>Clear region · show all</button>}
      </div>

      <StatStrip cells={[
        { k: 'In scope', v: row.inScope.toLocaleString('en-IN'), s: 'assets tracked in this domain', t: 'sky' },
        { k: 'Open', v: String(row.open), s: 'discrepancies to action', t: 'red' },
        { k: 'Unverified', v: row.unverified !== null ? String(row.unverified) : '—', s: 'not yet scanned this cycle', t: 'amber' },
        { k: 'Trust index', v: `${row.trustIndexPct}%`, s: `MTTR ${row.mttrHours}h · ${row.touchlessPct}% automated`, t: 'emerald' }
      ]} />
      {region && (
        <p className="vw-card-metric-label-sub" style={{ margin: '4px 0 0' }}>
          The figures above are {DOMAIN_LABEL[domain]}-wide; the list below is filtered to {region} only.
        </p>
      )}

      <Card>
        <DataGrid<DomainDevice>
          columns={[{ t: 'Device' }, { t: 'Status' }, { t: 'Issue' }, { t: 'Last scan' }]}
          rows={rows} total={rows.length} rowKey={d => d.id}
          resetKey={`${domain}|${region}|${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Device, IP, issue"
          filters={[{ n: 'Status', o: ['Open', 'Unverified'] }]}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters}
          onRowClick={openDevice}
          renderRow={d => [
            <><span className="vw-value">{d.name}</span><Sub mono>{d.ip}</Sub></>,
            <Chip tone={d.status === 'Open' ? 'error' : 'warning'}>{d.status}</Chip>,
            d.issue,
            <span className="num">{d.lastScan}</span>
          ]}
        />
        <div className="vw-card-footer-divider">
          <span className="vw-card-description">
            {base.filter(d => d.status === 'Open').length} open · {base.filter(d => d.status === 'Unverified').length} unverified
            {region ? ` in ${region}` : ''} are listed here; the rest are in sync with nothing to action.
          </span>
        </div>
      </Card>

      <Drawer open={!!open} onClose={closeDevice} title={open?.name ?? ''}
        sub={open ? `${DOMAIN_LABEL[open.domain]} · ${open.region} · ${open.ip}` : undefined}>
        {open && (
          <>
            <Chip tone={open.status === 'Open' ? 'error' : 'warning'}>{open.status}</Chip>
            <div className="kv" style={{ marginTop: 'var(--vw-space-md)' }}>
              <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[open.domain]}</span></div>
              <div><span className="k">Region</span><span className="v">{open.region}</span></div>
              <div><span className="k">Address</span><span className="v"><Mono>{open.ip}</Mono></span></div>
              <div><span className="k">Last scan</span><span className="v">{justScanned ? 'Just now' : open.lastScan}</span></div>
              <div><span className="k">Issue</span><span className="v">{open.issue}</span></div>
            </div>

            <div className="row" style={{ gap: '8px', marginTop: 'var(--vw-space-lg)', flexWrap: 'wrap' }}>
              <button className="nst-btn nst-btn--sm" disabled={scanning} onClick={rerun}>
                {scanning ? 'Scanning…' : 'Re-run discovery scan'}
              </button>
              <button className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => setShowRaw(v => !v)}>
                {showRaw ? 'Hide raw record' : 'View raw record'}
              </button>
            </div>
            {scanNote && <p className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>{scanNote}</p>}
            {showRaw && (
              <div className="vw-tx-json-box" style={{ marginTop: 'var(--vw-space-md)' }}>
                <pre className="vw-tx-json-code"><code>{JSON.stringify(open, null, 2)}</code></pre>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
