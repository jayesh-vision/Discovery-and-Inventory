import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, cv, DomainDot, InfoTip } from '../components/ui';
import { RampBars, MultiLineChart } from '../components/charts';
import { Drawer } from '../components/Drawer';
import { legacyPath } from '../routes';
import {
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  DOMAIN_HEX, DOMAIN_LABEL, DOMAIN_FULL_LABEL, DOMAIN_ORDER, domainRoute, type DomainKey, type ReconcileCycleRow
} from '../data/discoveryOverview';
import { QUICK_LINKS, type QuickLink } from '../data/reconcileOverview';

/* Domain devices and Discrepancy details are owned by Insights (their
   crumb is hardcoded "Insights · …", since that's normally the only
   place they're reached from) — reached from here instead, that crumb
   would still say "Insights", so the breadcrumb's own back-link would
   silently take a reader to the wrong screen instead of back to this
   page. legacyPath's `from` names this page's own crumb explicitly, the
   same origin-override every other cross-section jump in this app uses
   (see PhysicalResources.tsx's FROM constant) — Topbar reads it and
   shows the reader's real origin instead of the destination's default. */
const FROM = 'Reconciliation';

/* This page used to carry its own, differently-shaped dashboard (coverage
   table, a donut, a muted region-heat table, a cycle-activity list) built
   against reconcileOverview.ts's older data. It duplicated — with
   different numbers in places — what Insights' own "RECONCILIATION"
   module already covers more completely. Replaced with that same
   section's content (ported, not imported, so nothing here can change
   Insights' own behaviour) so the dedicated Reconciliation page and
   Insights' reconciliation module agree, instead of showing two
   different pictures of the same backlog. Quick Links (the one part of
   the old page with no equivalent on Insights) stays as-is. */

const QUICK_LINK_TARGET: Record<QuickLink['icon'], string> = {
  workbench: '/discovery/reconcile/results', scan: '/discovery/reconcile/jobs', rules: '/discovery/reconcile/rules'
};
const QUICK_LINK_GLYPH: Record<QuickLink['icon'], string> = { workbench: '⊞', scan: '◎', rules: '⚖' };

/* the domain tree's own order — IP/MPLS directly after Transport */
const DOMAIN_KEYS: DomainKey[] = DOMAIN_ORDER;

const MATCH_OUTCOME_CATEGORY: Partial<Record<string, string>> = {
  'Attribute mismatch': 'ATTRIBUTE',
  'Extra — no record': 'EXISTENCE',
  'Relationship drift': 'RELATIONSHIP',
  'Missing — no live peer': 'EXISTENCE'
};
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
  'Reconciliation cycles': 'The last few completed reconciliation runs for each domain, newest first, and what’s scheduled to run next.'
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--vw-color-gray-900)' }}>{children}</div>;
}

function PctBar({ pct, hex }: { pct: number; hex: string }) {
  return (
    <span className="num row vw-items-center" style={{ gap: '8px', justifyContent: 'flex-end' }}>
      {pct % 1 === 0 ? pct : pct.toFixed(2)}%
      <span className="hbar-track" style={{ width: '3.5rem', height: '6px' }}>
        <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${pct}%`, background: hex }} />
      </span>
    </span>
  );
}

const AGE_RAMP = [cv('blue', 200), cv('blue', 300), cv('blue', 400), cv('blue', 500), cv('blue', 700)];
const REGION_HEAT_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
const REGION_HEAT_MAX = Math.max(...REGION_DISCREPANCY.flatMap(r => Object.values(r.drift)));
function heatShade(v: number, max: number) {
  const r = v / max;
  return r > 0.9 ? 600 : r > 0.7 ? 500 : r > 0.5 ? 400 : r > 0.3 ? 300 : r > 0.15 ? 200 : r > 0.05 ? 100 : 50;
}
function HeatPill({ v, region, domain, onOpen, max = REGION_HEAT_MAX }: {
  v: number; region: string; domain: DomainKey; onOpen: (d: DomainKey, region?: string) => void; max?: number;
}) {
  const shade = heatShade(v, max);
  return (
    <td style={{ padding: '4px' }}>
      <button className="num is-drill" title={`${region} · ${DOMAIN_LABEL[domain]} · ${v} open — view ${DOMAIN_LABEL[domain]} devices in ${region}`}
        onClick={() => onOpen(domain, region)}
        style={{
          display: 'block', width: '100%', padding: '13px 8px', borderRadius: '10px', textAlign: 'center', fontSize: '1rem', border: 0,
          background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900), fontWeight: 600, cursor: 'pointer'
        }}>{v}</button>
    </td>
  );
}

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

  return (
    <div className="page">
      <SectionTitle>Match outcome</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Match classes<InfoTip text={CARD_DEF['Match classes']} label="What match classes shows" /></span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{MATCH_TOTAL_NOTE}</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1px',
          background: 'var(--vw-color-slate-200)',
          borderTop: '1px solid var(--vw-color-slate-200)', marginTop: 'var(--vw-space-md)'
        }}>
          {MATCH_OUTCOME.slice(0, 5).map((t, i) => {
            const category = MATCH_OUTCOME_CATEGORY[t.label];
            const Tile = category ? 'button' : 'div';
            return (
              <Tile key={t.label} className={category ? 'is-drill' : undefined}
                style={{ background: i === 0 ? 'var(--vw-color-slate-50)' : 'var(--vw-color-white)', padding: '12px 18px', textAlign: 'left', display: 'block', width: '100%', border: 0 }}
                {...(category ? { onClick: () => toDiscrepancies({ category }), title: `View ${t.label.toLowerCase()} discrepancies` } : {})}>
                <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{t.value.toLocaleString('en-IN')}</div>
                <div className="vw-value" style={{ marginTop: '3px', fontWeight: 600 }}>
                  {t.label}
                  {MATCH_OUTCOME_DEF[t.label] && <InfoTip text={MATCH_OUTCOME_DEF[t.label]} label={`What ${t.label.toLowerCase()} means`} />}
                </div>
              </Tile>
            );
          })}
        </div>
      </Card>

      <SectionTitle>Trust by domain and region</SectionTitle>
      <div className="rc-grid rc-grid--trust">
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">By domain<InfoTip text={CARD_DEF['By domain']} label="What this table shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Trust index scale 90–100%</div>
          <div className="scroll-x"><table className="mtbl">
            <thead><tr><th>Domain</th><th style={{ textAlign: 'right' }}>In scope</th><th style={{ textAlign: 'right' }}>Unverified</th><th style={{ textAlign: 'right' }}>In sync</th><th style={{ textAlign: 'right' }}>Trust index</th><th style={{ textAlign: 'right' }}>Open</th><th style={{ textAlign: 'right' }}>MTTR</th><th style={{ textAlign: 'right' }}>Automated</th></tr></thead>
            <tbody>{DOMAIN_TRUST_ROWS.map(d => (
              <tr key={d.domain} className="is-click" tabIndex={0} onClick={() => openDomain(d.domain)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDomain(d.domain); } }}
                aria-label={`View ${DOMAIN_LABEL[d.domain]} domain devices`}>
                <td><DomainDot domain={d.domain} /></td>
                <td className="num" style={{ textAlign: 'right' }}>{d.inScope.toLocaleString('en-IN')}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.unverified ?? '–'}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.inSync.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}><PctBar pct={d.trustIndexPct} hex={DOMAIN_HEX[d.domain]} /></td>
                <td className="num" style={{ textAlign: 'right', color: cv('red', 600), fontWeight: 600 }}>{d.open}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.mttrHours}h</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.touchlessPct}%</td>
              </tr>))}
            </tbody>
            <tfoot><tr>
              <td className="vw-value" style={{ fontWeight: 600 }}>All domains</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.inScope}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.unverified}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.inSync}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.trustIndexPct} <span className="vw-card-metric-label-sub">target 99%</span></td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: cv('red', 600) }}>{DOMAIN_TRUST_TOTAL.open}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.mttrHours}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.touchlessPct}</td>
            </tr></tfoot>
          </table></div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Open discrepancies by region<InfoTip text={CARD_DEF['Open discrepancies by region']} label="What this heatmap shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>All domains · {REGION_DISCREPANCY.reduce((a, r) => a + Object.values(r.drift).reduce((x, y) => x + y, 0), 0)} open</div>
          {/* the heat table scrolls inside its card below ~900px instead of widening the page */}
          <div className="scroll-x"><table className="mtbl" style={{ marginTop: 'var(--vw-space-sm)' }}>
            <thead>
              <tr>
                <th className="eyebrow">Region</th>
                {DOMAIN_KEYS.map(k => <th key={k} className="eyebrow" style={{ textAlign: 'center' }}>{DOMAIN_LABEL[k]}</th>)}
                <th className="eyebrow" style={{ textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>{REGION_DISCREPANCY.map(r => {
              const open = Object.values(r.drift).reduce((a, b) => a + b, 0);
              return (
                <tr key={r.region}>
                  <td className="vw-value" style={{ fontWeight: 600 }}>{r.region}</td>
                  {DOMAIN_KEYS.map(k => <HeatPill key={k} v={r.drift[k]} region={r.region} domain={k} onOpen={openDomain} />)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{open}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <div className="row vw-items-center" style={{ gap: '8px', marginTop: 'auto', paddingTop: 'var(--vw-space-md)' }}>
            <span className="vw-card-metric-label-sub">0</span>
            <div className="row" style={{ gap: '3px' }}>
              {REGION_HEAT_STEPS.map(s => <span key={s} style={{ width: '20px', height: '14px', borderRadius: '3px', background: cv('blue', s), flexShrink: 0 }} />)}
            </div>
            <span className="vw-card-metric-label-sub">{REGION_HEAT_MAX}+ open</span>
          </div>
        </Card>
      </div>

      <SectionTitle>Backlog</SectionTitle>
      <div className="rc-grid rc-grid--backlog">
        <Card>
          <span className="vw-card-title-sm">Detected vs auto-resolved, per day<InfoTip text={CARD_DEF['Detected vs auto-resolved, per day']} label="What this chart shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last 30 days</div>
          <MultiLineChart labels={BACKLOG_DAYS} height={230} format={v => v.toLocaleString('en-IN')}
            series={[
              { n: 'Discrepancies detected', hex: 'var(--vw-color-blue-500)', values: BACKLOG_DETECTED },
              { n: 'Auto-resolved by policy', hex: 'var(--vw-color-emerald-500)', values: BACKLOG_AUTORESOLVED }
            ]}
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
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Age of open discrepancies<InfoTip text={CARD_DEF['Age of open discrepancies']} label="What this chart shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
            {BACKLOG_AGE.reduce((a, b) => a + b.count, 0)} open · {backlogOlder} older than 7d · oldest 41d
          </div>
          <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <RampBars height={230}
              buckets={BACKLOG_AGE.map((b, i) => ({ label: b.bucket, count: b.count, hex: AGE_RAMP[i], hint: 'Click to view these items' }))}
              onBucketClick={i => toDiscrepancies({ age: BACKLOG_AGE[i].band })} />
          </div>
        </Card>
      </div>

      <SectionTitle>Discrepancy types and reconciliation cycles</SectionTitle>
      <div className="rc-grid rc-grid--types">
        <Card className="rc-tall" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Open items by type<InfoTip text={CARD_DEF['Open items by type']} label="What this list shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>All domains · {DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0)} open</div>
          <div className="row" style={{ gap: 'var(--vw-space-lg)', margin: 'var(--vw-space-sm) 0', flexWrap: 'wrap', flexShrink: 0 }}>
            {DOMAIN_KEYS.map(d => (
              <span key={d} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d] }} />{DOMAIN_LABEL[d]}
              </span>
            ))}
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {DISCREPANCY_TYPES.map(r => (
              <button key={r.label} className="row vw-items-center is-drill" style={{ gap: 'var(--vw-space-sm)', padding: '6px 0', width: '100%', textAlign: 'left', border: 0, background: 'none' }}
                title={`View the ${r.count} ${DOMAIN_LABEL[r.domain]} devices with ${r.label.toLowerCase()}`}
                onClick={() => openDomain(r.domain, undefined, r.label)}>
                <span className="row vw-items-center" style={{ gap: '7px', width: '13.5rem', flexShrink: 0, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[r.domain], flexShrink: 0 }} />
                  <span className="vw-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                </span>
                <span className="vw-card-metric-label-sub" style={{ width: '6rem', flexShrink: 0 }}>{r.category}</span>
                <span className="hbar-track grow" style={{ height: '0.75rem' }}>
                  <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${(r.count / DISCREPANCY_TYPES[0].count * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} />
                </span>
                <span className="num" style={{ width: '2.5rem', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{r.count}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="rc-tall" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Reconciliation cycles<InfoTip text={CARD_DEF['Reconciliation cycles']} label="What this timeline shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last 3 cycles per domain, newest first</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {RECONCILE_CYCLE_ROWS.map((c, i) => (
              <div key={`${c.domain}-${c.when}`} className="is-click" tabIndex={0} onClick={() => setCycle(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCycle(c); } }}
                aria-label={`View ${DOMAIN_LABEL[c.domain]} cycle details`}
                style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr auto', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0' }}>
                <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>{c.when}</span>
                <span style={{ position: 'relative', alignSelf: 'stretch' }}>
                  <span style={{ position: 'absolute', left: 6, top: 4, width: 9, height: 9, borderRadius: '50%', background: DOMAIN_HEX[c.domain], boxShadow: '0 0 0 3px var(--vw-color-white)' }} />
                  {i < RECONCILE_CYCLE_ROWS.length - 1 && <span style={{ position: 'absolute', left: 10, top: 16, bottom: -22, width: 1, background: 'var(--vw-color-slate-200)' }} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vw-value"><b style={{ color: cv('gray', 800) }}>{DOMAIN_FULL_LABEL[c.domain]}</b> cycle complete · {c.scanned.toLocaleString('en-IN')} records scanned</div>
                  <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <Chip tone="neutral">{c.drifted} drifted</Chip>
                    <Chip tone="neutral">{c.autoResolved} auto-resolved</Chip>
                    <Chip tone="neutral">{c.queue} to queue</Chip>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700, color: cv(c.touchlessPct >= 60 ? 'emerald' : 'amber', 700), lineHeight: 1.1 }}>{c.touchlessPct}%</div>
                  <div className="vw-card-metric-label-sub">automated</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0', borderTop: '1px dashed var(--vw-color-slate-200)', flexShrink: 0 }}>
            <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>{RECONCILE_NEXT.at}</span>
            <span style={{ position: 'relative', alignSelf: 'stretch' }}>
              <span style={{
                position: 'absolute', left: 6, top: 4, width: 9, height: 9, borderRadius: '50%',
                background: 'var(--vw-color-white)', border: `2px solid ${DOMAIN_HEX[RECONCILE_NEXT.domain]}`, boxSizing: 'border-box'
              }} />
            </span>
            <div className="vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>
              Next: <b style={{ color: 'var(--vw-color-gray-800)' }}>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> {RECONCILE_NEXT.note}
              · {RECONCILE_NEXT.unverified} unverified retried · {RECONCILE_NEXT.inScope.toLocaleString('en-IN')} in scope · in {RECONCILE_NEXT.eta}
            </div>
          </div>
        </Card>
      </div>

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

      <Drawer open={!!cycle} onClose={() => setCycle(null)} title={cycle ? `${DOMAIN_LABEL[cycle.domain]} reconciliation cycle` : ''}
        sub={cycle ? DOMAIN_FULL_LABEL[cycle.domain] : undefined}>
        {cycle && (
          <div className="kv">
            <div><span className="k">Domain</span><span className="v"><DomainDot domain={cycle.domain} /></span></div>
            <div><span className="k">Completed</span><span className="v">{cycle.when}</span></div>
            <div><span className="k">Records scanned</span><span className="v">{cycle.scanned.toLocaleString('en-IN')}</span></div>
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
