import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cv, InfoTip } from '../components/ui';
import { BandChart } from '../components/charts';
import { Drawer } from '../components/Drawer';
import { Delta, DomainTag, Meter, Panel, SectionHeader } from '../components/ops';
import { legacyPath } from '../routes';
import {
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  DOMAIN_HEX, DOMAIN_LABEL, DOMAIN_FULL_LABEL, DOMAIN_ORDER, domainParentLabel, domainRoute,
  type DomainKey, type ReconcileCycleRow
} from '../data/discoveryOverview';
import { QUICK_LINKS, type QuickLink } from '../data/reconcileOverview';

const FROM = 'Reconciliation';

const QUICK_LINK_TARGET: Record<QuickLink['icon'], string> = {
  workbench: '/discovery/reconcile/results', scan: '/discovery/reconcile/jobs', rules: '/discovery/reconcile/rules'
};
const QUICK_LINK_GLYPH: Record<QuickLink['icon'], string> = { workbench: '⊞', scan: '◎', rules: '⚖' };

const DOMAIN_KEYS: DomainKey[] = DOMAIN_ORDER;

const Dom = ({ domain, sm, muted }: { domain: DomainKey; sm?: boolean; muted?: boolean }) =>
  <DomainTag hex={DOMAIN_HEX[domain]} label={DOMAIN_LABEL[domain]} parent={domainParentLabel(domain)} sm={sm} muted={muted} />;

const n = (v: number) => v.toLocaleString('en-IN');

const MATCH_OUTCOME_DEF: Record<string, string> = {
  'Matched': 'The record’s identity, attributes and relationships all agree with the live network — no reconciliation action needed.',
  'Attribute mismatch': 'The record exists and its identity matches, but one or more attribute values differ from what the live network reports.',
  'Extra — no record': 'The live network reports an object that has no corresponding record in inventory.',
  'Relationship drift': 'The record exists but its relationships — neighbours, parent/child links — no longer match what the live network reports.',
  'Missing — no live peer': 'Inventory has a record for this object, but the live network no longer reports it.'
};
const CARD_DEF: Record<string, string> = {
  'Match classes': 'How reconciliation classified every compared record last cycle — matched, or one of the ways a record can disagree with the live network.',
  'By domain': 'Inventory trust broken down by domain — in-scope, in-sync, and the open backlog and repair time each domain is carrying.',
  'Open discrepancies by region': 'Where the open discrepancy backlog is concentrated geographically, one cell per region × domain.',
  'Detected vs auto-resolved, per day': 'New discrepancies found each day, and how many were closed automatically by policy without an engineer.',
  'Age of open discrepancies': 'How long the currently open discrepancies have sat unresolved — the older the bucket, the more attention it likely needs.',
  'Open items by type': 'The open backlog broken down by the specific kind of discrepancy, so the most common failure patterns stand out.',
  'Reconciliation cycles': 'Each domain’s last 3 completed reconciliation runs, trended oldest to newest, plus what’s scheduled to run next.'
};

const AGE_RAMP = [cv('blue', 200), cv('blue', 300), cv('blue', 400), cv('blue', 500), cv('blue', 700)];
const REGION_HEAT_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
const REGION_HEAT_MAX = Math.max(...REGION_DISCREPANCY.flatMap(r => Object.values(r.drift)));
function heatShade(v: number, max: number) {
  const r = v / max;
  return r > 0.9 ? 600 : r > 0.7 ? 500 : r > 0.5 ? 400 : r > 0.3 ? 300 : r > 0.15 ? 200 : r > 0.05 ? 100 : 50;
}

const CYCLE_PCTS = RECONCILE_CYCLE_ROWS.map(c => c.touchlessPct);
const CYCLE_LO = Math.min(...CYCLE_PCTS) - 6, CYCLE_HI = Math.max(...CYCLE_PCTS) + 2;
const cycleBarPx = (pct: number) => Math.round(8 + (pct - CYCLE_LO) / (CYCLE_HI - CYCLE_LO) * 40);

export default function Reconcile() {
  const nav = useNavigate();
  const openDomain = (d: DomainKey, region?: string, issue?: string) => {
    const q = new URLSearchParams();
    if (region) q.set('region', region);
    if (issue) q.set('issue', issue);
    const r = domainRoute(d);
    nav(legacyPath(r.key, { from: FROM, q: q.toString() }, r.params));
  };
  const toDiscrepancies = (params: Record<string, string> = {}) =>
    nav(legacyPath('discrepancydetails', { from: FROM, q: new URLSearchParams(params).toString() }, {}));

  const [cycle, setCycle] = useState<ReconcileCycleRow | null>(null);
  const backlogOlder = BACKLOG_AGE.slice(3).reduce((a, b) => a + b.count, 0);
  const openTotal = DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0);
  const mttrMax = Math.max(...DOMAIN_TRUST_ROWS.map(d => d.mttrHours));
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };

  return (
    <div className="page ix">
      {/* ── match outcome ────────────────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Match outcome" description="How the last reconciliation pass classified every compared record." />
        <Panel title="Match classes" info={CARD_DEF['Match classes']} description={MATCH_TOTAL_NOTE} flush>
          <div className="ix-tiles">
            {MATCH_OUTCOME.slice(0, 5).map((t, i) => {
              const isClickable = i > 0;
              const Tile = isClickable ? 'button' : 'div';
              return (
                <Tile key={t.label} className={`ix-tile${i === 0 ? ' is-hero' : ''}`}
                  {...(isClickable ? { onClick: () => toDiscrepancies({ matchClass: t.label }), title: `View ${t.label.toLowerCase()} discrepancies` } : {})}>
                  <span className="ix-tile-v num">{n(t.value)}</span>
                  <span className="ix-tile-l">{t.label}
                    {MATCH_OUTCOME_DEF[t.label] && <InfoTip text={MATCH_OUTCOME_DEF[t.label]} label={`What ${t.label.toLowerCase()} means`} />}
                  </span>
                  <span className="ix-tile-s">{i === 0 ? 'no action needed' : 'open · click to view'}</span>
                </Tile>
              );
            })}
          </div>
        </Panel>
      </section>

      {/* ── trust by domain and region ───────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Trust by domain and region" description="Which domain and which region is carrying the open backlog — and how long each takes to repair it." />
        <div className="ix-grid is-wide" style={{ ['--cols' as string]: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <Panel title="By domain" info={CARD_DEF['By domain']} description="Trust index drawn on a 90–100% scale · click a domain to see its devices" flush>
            <table className="ix-table">
              <thead><tr>
                <th>Domain</th><th className="t-r">In scope</th><th className="t-r">Unverified</th><th className="t-r">In sync</th>
                <th className="t-r">Trust index</th><th className="t-r">Open</th><th className="t-r">MTTR</th><th className="t-r">Automated</th>
              </tr></thead>
              <tbody>{DOMAIN_TRUST_ROWS.map(d => (
                <tr key={d.domain} className="is-click" tabIndex={0} onClick={() => openDomain(d.domain)} onKeyDown={onKey(() => openDomain(d.domain))}
                  aria-label={`View ${DOMAIN_LABEL[d.domain]} domain devices`}>
                  <td><Dom domain={d.domain} /></td>
                  <td className="t-r num">{n(d.inScope)}</td>
                  <td className="t-r num">{d.unverified ?? <span className="is-dim" title="Not tracked for this domain">–</span>}</td>
                  <td className="t-r num">{n(d.inSync)}</td>
                  <td className="t-r"><Meter pct={d.trustIndexPct} hex={DOMAIN_HEX[d.domain]} min={90} decimals={2} /></td>
                  <td className="t-r num is-strong">{d.open}</td>
                  <td className="t-r num">{d.mttrHours === mttrMax ? <><span className="ix-warn">{d.mttrHours}h</span><span className="ix-mark">outlier</span></> : `${d.mttrHours}h`}</td>
                  <td className="t-r num">{d.touchlessPct}%</td>
                </tr>))}
              </tbody>
              <tfoot><tr>
                <td>All domains</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.inScope}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.unverified}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.inSync}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.trustIndexPct} <span className="is-dim" style={{ fontWeight: 400 }}>· target 99%</span></td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.open}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.mttrHours}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.touchlessPct}</td>
              </tr></tfoot>
            </table>
          </Panel>

          <Panel title="Open discrepancies by region" info={CARD_DEF['Open discrepancies by region']}
            description={<>All domains · <b>{REGION_DISCREPANCY.reduce((a, r) => a + Object.values(r.drift).reduce((x, y) => x + y, 0), 0)}</b> open · click a cell for its devices</>} flush>
            <table className="ix-table">
              <thead><tr>
                <th>Region</th>
                {DOMAIN_KEYS.map(k => <th key={k} className="t-c">{DOMAIN_LABEL[k]}</th>)}
                <th className="t-r">Open</th>
              </tr></thead>
              <tbody>{REGION_DISCREPANCY.map(r => {
                const open = Object.values(r.drift).reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.region}>
                    <td className="is-strong">{r.region}</td>
                    {DOMAIN_KEYS.map(k => {
                      const v = r.drift[k], shade = heatShade(v, REGION_HEAT_MAX);
                      return (
                        <td key={k} style={{ padding: '4px 6px' }}>
                          <button type="button" className="ix-heat num" onClick={() => openDomain(k, r.region)}
                            title={`${r.region} · ${DOMAIN_LABEL[k]} · ${v} open — view ${DOMAIN_LABEL[k]} devices in ${r.region}`}
                            style={{ background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900) }}>{v}</button>
                        </td>
                      );
                    })}
                    <td className="t-r num is-strong">{open}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div className="ix-legend-ramp" style={{ padding: `var(--vw-space-md) var(--vw-space-lg) var(--vw-space-lg)` }}>
              <span>0</span>
              <div>{REGION_HEAT_STEPS.map(s => <span key={s} style={{ background: cv('blue', s) }} />)}</div>
              <span>{REGION_HEAT_MAX}+ open</span>
            </div>
          </Panel>
        </div>
      </section>

      {/* ── backlog ──────────────────────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Backlog" description="Whether the platform is closing discrepancies faster than the network raises them — and how old what’s left has become." />
        <div className="ix-grid" style={{ ['--cols' as string]: 'minmax(0, 1.55fr) minmax(0, 1fr)' }}>
          <Panel title="Detected vs auto-resolved, per day" info={CARD_DEF['Detected vs auto-resolved, per day']} className="ix-chart"
            description={<span className="ix-stats"><span>Last 30 days</span><span>today <b>{BACKLOG_DETECTED[29]}</b> detected</span><span><b>{BACKLOG_AUTORESOLVED[29]}</b> auto-resolved</span><span><b>{BACKLOG_DETECTED[29] - BACKLOG_AUTORESOLVED[29]}</b> to engineers</span><span><b>{(BACKLOG_AUTORESOLVED[29] / BACKLOG_DETECTED[29] * 100).toFixed(0)}%</b> automation</span></span>}
            right={<span className="ix-legend">
              <span><i style={{ background: 'var(--vw-color-blue-500)' }} />Detected</span>
              <span><i style={{ background: 'var(--vw-color-emerald-500)' }} />Auto-resolved</span>
              <span><i className="is-band" />To engineers</span>
            </span>}>
            <BandChart labels={BACKLOG_DAYS} height={236} format={v => n(v)} fluid
              upper={{ n: 'Discrepancies detected', hex: 'var(--vw-color-blue-500)', values: BACKLOG_DETECTED }}
              lower={{ n: 'Auto-resolved by policy', hex: 'var(--vw-color-emerald-500)', values: BACKLOG_AUTORESOLVED }}
              detail={i => {
                const det = BACKLOG_DETECTED[i], auto = BACKLOG_AUTORESOLVED[i], eng = det - auto;
                const rate = det ? (auto / det * 100).toFixed(1) : '0.0';
                return (
                  <>
                    <div className="ch-tip-r"><span className="ch-dot" style={{ background: 'var(--vw-color-blue-500)' }} />Detected<span className="grow" /><span className="num">{det}</span></div>
                    <div className="ch-tip-r"><span className="ch-dot" style={{ background: 'var(--vw-color-emerald-500)' }} />Auto-resolved<span className="grow" /><span className="num">{auto}</span></div>
                    <div className="ch-tip-r">To engineers<span className="grow" /><span className="num">{eng}</span></div>
                    <div className="ch-tip-r ch-tip-t">Automation rate<span className="grow" /><span className="num">{rate}%</span></div>
                  </>
                );
              }} />
          </Panel>

          <Panel title="Age of open discrepancies" info={CARD_DEF['Age of open discrepancies']}
            description={<><b>{openTotal}</b> open · <b>{backlogOlder}</b> older than 7d · oldest 41d · click a band to view its items</>}>
            <div className="ix-age">
              {BACKLOG_AGE.map((b, i) => (
                <div key={b.band} style={{ display: 'contents' }}>
                  {i === 3 && <div className="ix-age-div"><span>Older than 7 days</span></div>}
                  <button type="button" className="ix-age-row" title={`View the ${b.count} items open ${b.bucket}`}
                    onClick={() => toDiscrepancies({ age: b.band })}>
                    <span className="ix-age-l">{b.bucket}</span>
                    <span className="ix-age-t"><span className="ix-age-f" style={{ width: `${(b.count / BACKLOG_AGE[0].count * 100).toFixed(1)}%`, background: AGE_RAMP[i] }} /></span>
                    <span className="ix-age-n num">{b.count}</span>
                    <span className="ix-age-s num">{(b.count / openTotal * 100).toFixed(0)}%</span>
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* ── discrepancy types + cycles ───────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Discrepancy types and reconciliation cycles" description="The specific kinds of drift in the backlog, and how each domain’s recent reconciliation runs have been going." />
        <div className="ix-grid" style={{ ['--cols' as string]: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <Panel title="Open items by type" info={CARD_DEF['Open items by type']} tall
            description={<>All domains · <b>{openTotal}</b> open · ranked by count</>}
            right={<span className="ix-doms">{DOMAIN_KEYS.map(d => <Dom key={d} domain={d} sm muted />)}</span>}>
            <div className="ix-bars" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
              {DISCREPANCY_TYPES.map(r => (
                <button key={r.label} type="button" className="ix-bar" title={`View ${r.label} (${DOMAIN_LABEL[r.domain]})`}
                  onClick={() => toDiscrepancies({ type: r.label })}>
                  <span className="ix-bar-l"><i style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[r.domain], flexShrink: 0 }} /><span>{r.label}</span></span>
                  <span className="ix-bar-c">{r.category}</span>
                  <span className="ix-bar-t"><span className="ix-bar-f" style={{ width: `${(r.count / DISCREPANCY_TYPES[0].count * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} /></span>
                  <span className="ix-bar-n num">{r.count}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Reconciliation cycles" info={CARD_DEF['Reconciliation cycles']} tall
            description="Latest cycle per domain · trend across its last 3 runs · click a run for detail">
            <div className="ix-cycles">
              {DOMAIN_KEYS.map(d => {
                const cycles = RECONCILE_CYCLE_ROWS.filter(c => c.domain === d); // newest → oldest
                const latest = cycles[0];
                const oldestToNewest = [...cycles].reverse();
                const delta = latest.touchlessPct - oldestToNewest[0].touchlessPct;
                const ok = latest.touchlessPct >= 60;
                return (
                  <div key={d} className="ix-cycle">
                    <div>
                      <Dom domain={d} />
                      <span className="ix-secondary">latest {latest.when}</span>
                    </div>
                    <div className="ix-runs" role="group" aria-label={`${DOMAIN_LABEL[d]} — automated share of the last 3 runs`}>
                      {oldestToNewest.map((c, i) => {
                        const isLatest = i === oldestToNewest.length - 1;
                        return (
                          <button key={c.when} type="button" className={`ix-runbar${isLatest ? ' is-cur' : ''}`}
                            onClick={() => setCycle(c)} title={`View ${DOMAIN_LABEL[d]} cycle detail · ${c.when}`}>
                            <span className="ix-runbar-v num">{c.touchlessPct}%</span>
                            <span className="ix-runbar-b" style={{ height: cycleBarPx(c.touchlessPct), background: DOMAIN_HEX[d] }} />
                            <span className="ix-runbar-t">{c.when.slice(0, 5)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="ix-cycle-stats">
                      <span className="ix-stat"><span className="ix-stat-k">Scanned</span><span className="ix-stat-v num">{n(latest.scanned)}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">Drifted</span><span className="ix-stat-v num">{latest.drifted}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">Auto-resolved</span><span className="ix-stat-v num">{latest.autoResolved}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">To queue</span><span className="ix-stat-v num">{latest.queue}</span></span>
                    </div>
                    <div className="ix-cycle-pct">
                      <span className={`ix-cycle-v num ${ok ? 'ix-good' : 'ix-warn'}`}>{latest.touchlessPct}%</span>
                      <span className="ix-cycle-pl">automated{delta !== 0 && <> · <Delta dir={delta > 0 ? 'up' : 'down'} good={delta > 0}>{Math.abs(delta)}pt</Delta></>}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ix-next" style={{ ['--ix-next-hex' as string]: DOMAIN_HEX[RECONCILE_NEXT.domain] }}>
              <span className="mono" style={{ fontSize: '11px' }}>{RECONCILE_NEXT.at}</span>
              <i />
              <span>Next: <b>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> {RECONCILE_NEXT.note} · {RECONCILE_NEXT.unverified} unverified retried · {n(RECONCILE_NEXT.inScope)} in scope · in {RECONCILE_NEXT.eta}</span>
            </div>
          </Panel>
        </div>
      </section>

      {/* ── quick actions ────────────────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Quick actions" description="Direct access to reconciliation workbench, jobs, and rule definitions." />
        <div className="row vw-gap-md" style={{ flexWrap: 'wrap' }}>
          {QUICK_LINKS.map(q => (
            <button key={q.title} className="vw-card-section row vw-items-center is-drill" style={{ gap: '12px', flex: '1 1 220px' }}
              onClick={() => nav(QUICK_LINK_TARGET[q.icon])}>
              <span style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cv('blue', 50), color: cv('blue', 600), fontSize: '1.125rem'
              }}>{QUICK_LINK_GLYPH[q.icon]}</span>
              <span>
                <div className="vw-value" style={{ fontWeight: 600 }}>{q.title}</div>
                <div className="vw-card-metric-label-sub">{q.sub}</div>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Drawer open={!!cycle} onClose={() => setCycle(null)} title={cycle ? `${DOMAIN_LABEL[cycle.domain]} reconciliation cycle` : ''}
        sub={cycle ? DOMAIN_FULL_LABEL[cycle.domain] : undefined}>
        {cycle && (
          <div className="kv">
            <div><span className="k">Domain</span><span className="v"><Dom domain={cycle.domain} /></span></div>
            <div><span className="k">Completed</span><span className="v">{cycle.when}</span></div>
            <div><span className="k">Records scanned</span><span className="v">{n(cycle.scanned)}</span></div>
            <div><span className="k">Drifted</span><span className="v">{cycle.drifted}</span></div>
            <div><span className="k">Auto-resolved</span><span className="v">{cycle.autoResolved}</span></div>
            <div><span className="k">To queue</span><span className="v">{cycle.queue}</span></div>
            <div><span className="k">Automated</span><span className="v">{cycle.touchlessPct}%</span></div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
