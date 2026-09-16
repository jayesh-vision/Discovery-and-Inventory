import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Drawer } from '../components/Drawer';
import {
  RECONCILE_EXCEPTIONS, EXCEPTION_TONE, SLA_TONE, DISPOSITIONS, DOMAIN_HEX, DOMAIN_LABEL,
  type ReconcileException, type DomainKey
} from '../data/reconciliationOps';
import { ruleById } from '../data/rules';

const DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];
const STATES = ['Rogue', 'Drifted', 'Missing', 'Duplicate', 'Unclaimed', 'No adapter'];

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

export default function ReconciliationExceptions() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const urlState = sp.get('state');
  /* set when this screen is reached from a specific rule's "Exceptions" tab
     (RuleDetails.tsx) — the relationship is real (every exception carries a
     ruleId), so the navigation that names it should actually filter by it,
     not just land here unscoped and lose the context the click had. */
  const urlRuleId = sp.get('ruleId');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (urlState && STATES.includes(urlState)) f.State = urlState;
    return f;
  });
  const [open, setOpen] = useState<ReconcileException | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECONCILE_EXCEPTIONS.filter(e => {
      if (urlRuleId && e.ruleId !== urlRuleId) return false;
      if (q && !(e.subject.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))) return false;
      if (filters.Domain && DOMAIN_LABEL[e.domain] !== filters.Domain) return false;
      if (filters.State && e.state !== filters.State) return false;
      return true;
    });
  }, [query, filters, urlRuleId]);
  const filteredRule = urlRuleId ? ruleById(urlRuleId) : undefined;

  const breached = RECONCILE_EXCEPTIONS.filter(e => e.sla === 'Breached').length;
  const atRisk = RECONCILE_EXCEPTIONS.filter(e => e.sla === 'At risk').length;
  const unassigned = RECONCILE_EXCEPTIONS.filter(e => e.owner === 'Unassigned').length;

  /* the subject names a specific network element by its own host name — the
     same identity a real record would be keyed on, so this is a genuine
     (if occasionally unresolved, since these are mock elements) link to it */
  const subjectHost = (subject: string) => subject.split(' · ')[0].split(' ')[0];

  return (
    <div className="page">
      {urlRuleId && (
        <div className="row vw-items-center" style={{
          gap: '8px', padding: '8px 12px', background: 'var(--vw-color-slate-50)',
          border: '1px solid var(--vw-color-slate-200)', borderRadius: 'var(--vw-radius-sm)'
        }}>
          <span className="vw-card-metric-label-sub">
            Filtered to exceptions raised by <b style={{ color: 'var(--vw-color-gray-800)' }}>{filteredRule?.name ?? urlRuleId}</b> ({rows.length} of {RECONCILE_EXCEPTIONS.length})
          </span>
          <button className="nst-btn nst-btn--xs nst-btn--ghost" onClick={() => nav('/discovery/reconcile/exceptions')}>Clear</button>
        </div>
      )}
      <StatStrip cells={[
        { k: 'Open exceptions', v: String(RECONCILE_EXCEPTIONS.length), s: 'across all domains', t: 'sky' },
        { k: 'SLA breached', v: String(breached), s: 'past the reconciliation SLA window', t: 'red' },
        { k: 'At risk', v: String(atRisk), s: 'approaching the SLA window', t: 'amber' },
        { k: 'Unassigned', v: String(unassigned), s: 'no owner picked up yet', t: 'purple' }
      ]} />

      <Card>
        <DataGrid<ReconcileException>
          columns={[{ t: 'Exception' }, { t: 'State' }, { t: 'Domain' }, { t: 'Subject' }, { t: 'Owner' }, { t: 'Age', r: true }, { t: 'SLA' }, { t: 'Next action' }]}
          rows={rows} total={rows.length} rowKey={e => e.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Exception ID, subject"
          filters={[{ n: 'Domain', o: DOMAINS.map(d => DOMAIN_LABEL[d]) }, { n: 'State', o: STATES }]}
          onSearch={setQuery} onFilterChange={setFilters}
          onRowClick={setOpen}
          renderRow={e => [
            <Mono>{e.id}</Mono>,
            <Chip tone={EXCEPTION_TONE[e.state]}>{resolved[e.id] ? 'Resolved' : e.state}</Chip>,
            <DomainDot domain={e.domain} />,
            <span className="vw-value">{e.subject}</span>,
            e.owner === 'Unassigned' ? <span style={{ color: 'var(--vw-color-gray-400)' }}>Unassigned</span> : e.owner,
            <span className="num">{e.age}d</span>,
            <Chip tone={SLA_TONE[e.sla]}>{e.sla}</Chip>,
            <span className="vw-card-metric-label-sub">{resolved[e.id] ? `Resolved · ${resolved[e.id]}` : e.next}</span>
          ]}
        />
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.id ?? ''}
        sub={open ? `${DOMAIN_LABEL[open.domain]} · ${open.subject}` : undefined}>
        {open && (
          <>
            <Chip tone={EXCEPTION_TONE[open.state]}>{resolved[open.id] ? 'Resolved' : open.state}</Chip>
            <div className="kv" style={{ marginTop: 'var(--vw-space-md)' }}>
              <div><span className="k">Detected</span><span className="v">{open.detected}</span></div>
              <div><span className="k">Owner</span><span className="v">{open.owner}</span></div>
              <div><span className="k">Age</span><span className="v">{open.age} days</span></div>
              <div><span className="k">SLA</span><span className="v"><Chip tone={SLA_TONE[open.sla]}>{open.sla}</Chip></span></div>
              <div><span className="k">Next action</span><span className="v">{resolved[open.id] ? `Resolved · ${resolved[open.id]}` : open.next}</span></div>
            </div>

            <div style={{ marginTop: 'var(--vw-space-lg)' }}>
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <button className="nst-btn nst-btn--sm" onClick={() => nav(`/discovery/reconcile/rules/${open.ruleId}`)}>
                  {ruleById(open.ruleId)?.name ?? open.ruleId}
                </button>
                <button className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(`/inventory/resource/${encodeURIComponent(subjectHost(open.subject))}`)}>
                  View source/target record
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'var(--vw-space-lg)' }}>
              <div className="vw-card-title-sm" style={{ fontSize: '0.8125rem' }}>Disposition</div>
              <div className="stack-s" style={{ marginTop: 'var(--vw-space-sm)' }}>
                {DISPOSITIONS.map(d => (
                  <button key={d.n} className="nst-btn nst-btn--sm nst-btn--ghost" style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                    disabled={!!resolved[open.id]}
                    onClick={() => setResolved(r => ({ ...r, [open.id]: d.n }))}>
                    <div>
                      <div className="vw-value" style={{ fontWeight: 600 }}>{d.n}</div>
                      <div className="vw-card-metric-label-sub" style={{ whiteSpace: 'normal', marginTop: '2px' }}>{d.d}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
