import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Chip, DomainDot, Mono, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Drawer } from '../components/Drawer';
import {
  DOMAIN_HEX, DOMAIN_LABEL, DOMAIN_FULL_LABEL, DOMAIN_PARENT, DOMAIN_TRUST_ROWS, domainSlugs, parseDomainKey, type DomainKey
} from '../data/discoveryOverview';
import { domainDevices, type DomainDevice } from '../data/domainDevices';

/* URL form of a domain, parents first: 'transport/ipmpls' (see domainSlugs) */
export const domainToUrl = (d: DomainKey) => domainSlugs(d).join('/');

/* /domain/:domain[/:sub] → the domain it names, or undefined.
   A sub-domain must sit under its own parent (/transport/ipmpls); the
   flat pre-hierarchy /ipmpls still resolves so old links keep working —
   the screen then rewrites the URL to the nested form. */
function domainFromUrl(domain?: string, sub?: string): DomainKey | undefined {
  const top = parseDomainKey(domain);
  if (!top) return undefined;
  if (!sub) return top;
  const child = parseDomainKey(sub);
  return child && DOMAIN_PARENT[child] === top ? child : undefined;
}

export default function DomainDevices() {
  const { domain: urlDomain, sub: urlSub } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const domain = domainFromUrl(urlDomain, urlSub);
  const row = domain ? DOMAIN_TRUST_ROWS.find(d => d.domain === domain) : undefined;
  /* a sub-domain reached through the flat legacy slug (/domain/ipmpls) is
     moved to its nested address (/domain/transport/ipmpls) — one canonical
     URL per domain, and the breadcrumb/rail logic keys off the nested one */
  useEffect(() => {
    if (!domain || urlSub || !DOMAIN_PARENT[domain]) return;
    nav({ pathname: `/discovery/insights/domain/${domainToUrl(domain)}`, search: searchParams.toString() ? `?${searchParams}` : '' }, { replace: true });
  }, [domain, urlSub, nav, searchParams]);
  /* set only when this screen was reached by clicking one cell of Insights'
     "Open discrepancies by region" heatmap — otherwise every region cell
     for a domain landed on the exact same undifferentiated roster, which
     read as "wrong data" no matter which cell was actually clicked */
  const region = searchParams.get('region');
  const clearRegion = () => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('region'); return n; });
  /* set when reached by clicking one row of Reconciliation's "Open items by
     type" list — same idea as region above: without this filter every type
     row landed on the same undifferentiated domain roster no matter which
     type was clicked */
  const issue = searchParams.get('issue');
  const clearIssue = () => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('issue'); return n; });
  const scopeLabel = [region, issue].filter(Boolean).join(' · ');

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<DomainDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [justScanned, setJustScanned] = useState(false);

  useEffect(() => {
    setQuery('');
    setFilters({});
  }, [domain, region, issue]);

  const base = useMemo(() => (domain ? domainDevices(domain, region ?? undefined, issue ?? undefined) : []), [domain, region, issue]);
  /* base is already region-filtered when a region is active, so counting
     it directly is what makes the Open/Unverified stat cards agree with
     the list below instead of quoting the domain-wide row.open/
     row.unverified regardless of which region is showing */
  const openCount = base.filter(d => d.status === 'Open').length;
  const unverifiedCount = base.filter(d => d.status === 'Unverified').length;
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
  const parent = DOMAIN_PARENT[domain];

  return (
    <div className="page">
      <div className="row vw-items-center" style={{ gap: '10px', marginBottom: 'var(--vw-space-sm)', flexWrap: 'wrap' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: hex, flexShrink: 0 }} />
        <span style={{ fontSize: '1.375rem', fontWeight: 600 }}>
          {/* a sub-domain's title names its parent first: "Transport · IP/MPLS devices" */}
          {parent && <span className="dom-parent">{DOMAIN_LABEL[parent]} · </span>}{DOMAIN_LABEL[domain]} devices{scopeLabel ? ` · ${scopeLabel}` : ''}
        </span>
        {region && <button className="nst-btn nst-btn--xs nst-btn--ghost" onClick={clearRegion}>Clear region</button>}
        {issue && <button className="nst-btn nst-btn--xs nst-btn--ghost" onClick={clearIssue}>Clear type</button>}
        {(region || issue) && <button className="nst-btn nst-btn--xs nst-btn--ghost" onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('region'); n.delete('issue'); return n; })}>Show all</button>}
      </div>

      <StatStrip cells={[
        { k: 'In scope', v: row.inScope.toLocaleString('en-IN'), s: parent ? `assets tracked in this ${DOMAIN_LABEL[parent]} sub-domain` : 'assets tracked in this domain', t: 'sky' },
        { k: 'Open', v: String(openCount), s: scopeLabel ? `discrepancies to action in ${scopeLabel}` : 'discrepancies to action', t: 'red' },
        { k: 'Unverified', v: row.unverified !== null ? String(unverifiedCount) : '—', s: scopeLabel ? `not yet scanned this cycle in ${scopeLabel}` : 'not yet scanned this cycle', t: 'amber' },
        { k: 'Trust index', v: `${row.trustIndexPct}%`, s: `MTTR ${row.mttrHours}h · ${row.touchlessPct}% automated`, t: 'emerald' }
      ]} />
      {scopeLabel && (
        <p className="vw-card-metric-label-sub" style={{ margin: '4px 0 0' }}>
          In scope and Trust index are {DOMAIN_LABEL[domain]}-wide (no per-{region && issue ? 'region/type' : region ? 'region' : 'type'} figure exists for either); Open and Unverified above match the {scopeLabel} list exactly.
        </p>
      )}

      <Card>
        <DataGrid<DomainDevice> chipWidth="auto"
          columns={[{ t: 'Device' }, { t: 'Status' }, { t: 'Issue' }, { t: 'Last scan' }]}
          rows={rows} total={rows.length} rowKey={d => d.id}
          resetKey={`${domain}|${region}|${issue}|${query}|${JSON.stringify(filters)}`}
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
            {scopeLabel ? ` in ${scopeLabel}` : ''} are listed here; the rest are in sync with nothing to action.
          </span>
        </div>
      </Card>

      <Drawer open={!!open} onClose={closeDevice} title={open?.name ?? ''}
        sub={open ? `${DOMAIN_FULL_LABEL[open.domain]} · ${open.region} · ${open.ip}` : undefined}>
        {open && (
          <>
            <Chip tone={open.status === 'Open' ? 'error' : 'warning'}>{open.status}</Chip>
            <div className="kv" style={{ marginTop: 'var(--vw-space-md)' }}>
              <div><span className="k">Domain</span><span className="v"><DomainDot domain={open.domain} /></span></div>
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
