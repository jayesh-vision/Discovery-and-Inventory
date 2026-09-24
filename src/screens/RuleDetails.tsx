import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Chip, cv, Mono, StatStrip, TabBar } from '../components/ui';
import { Lifecycle, type LifecycleStage } from '../components/Lifecycle';
import { Timeline } from '../components/Timeline';
import {
  ruleById, RULE_LIFECYCLE, STATUS_TONE, STATUS_NEXT, PRIORITY_TONE, DOMAIN_HEX, persistRules,
  type RuleStatus
} from '../data/rules';
import { DOMAIN_FULL_LABEL } from '../data/discoveryOverview';
import { exceptionsForRule, EXCEPTION_TONE, SLA_TONE } from '../data/reconciliationOps';
import type { ChipTone } from '../data/ledger';

type TabKey = 'overview' | 'logic' | 'responsibilities' | 'lifecycle' | 'execution' | 'exceptions' | 'activity';

/* the accent-bar hue for the "next action" banner — only the four tones
   STATUS_TONE actually uses need a real mapping; the rest fall back to
   slate so this stays exhaustive without over-fitting statuses that never
   occur */
const TONE_HUE: Record<ChipTone, string> = {
  neutral: 'slate', info: 'sky', success: 'emerald', warning: 'amber', error: 'red',
  purple: 'slate', cyan: 'slate', orange: 'slate', pink: 'slate'
};

const nowStamp = () => {
  const d = new Date();
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} ${d.toTimeString().slice(0, 5)}`;
};

/* Activity is a free-text log ("Run completed — …", "Approved", "Rule
   retired — …") — classifying the verb at the start into a tone/label gives
   each entry a scannable badge instead of every row reading identically.
   A "Run completed — N scanned, M drifted, K auto-resolved" line also gets
   its three numbers pulled out into their own stat pills rather than left
   as one run-on sentence. */
function activityTone(event: string): { tone: ChipTone; label: string } {
  if (/^Run completed/.test(event)) return { tone: 'success', label: 'Run' };
  if (/^Run failed/.test(event)) return { tone: 'error', label: 'Run' };
  if (/^Run started/.test(event)) return { tone: 'info', label: 'Run' };
  if (/activated/i.test(event)) return { tone: 'success', label: 'Lifecycle' };
  if (/^Approved/.test(event) || /^Approved,/.test(event)) return { tone: 'success', label: 'Review' };
  if (/^Rejected/.test(event)) return { tone: 'error', label: 'Review' };
  if (/suspended/i.test(event)) return { tone: 'warning', label: 'Lifecycle' };
  if (/retired/i.test(event)) return { tone: 'neutral', label: 'Lifecycle' };
  if (/^Submitted for review/.test(event)) return { tone: 'info', label: 'Review' };
  if (/^Changes requested/.test(event)) return { tone: 'warning', label: 'Review' };
  if (/^Rule (created|suggested)/.test(event)) return { tone: 'neutral', label: 'Rule' };
  return { tone: 'neutral', label: 'Activity' };
}
const RUN_STATS_RE = /^Run (completed|failed) — ([\d,]+) scanned, ([\d,]+) drifted, ([\d,]+) auto-resolved$/;

export default function RuleDetails() {
  const nav = useNavigate();
  const { id } = useParams();
  const rule = id ? ruleById(id) : undefined;
  const [tab, setTab] = useState<TabKey>('overview');
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);

  if (!rule) {
    return <div className="page"><Card><span className="vw-card-description">Unknown rule.</span></Card></div>;
  }

  const exceptions = exceptionsForRule(rule.id);
  const stageIndex = RULE_LIFECYCLE.indexOf(rule.status);
  const stages: LifecycleStage[] = RULE_LIFECYCLE.map((s, i) => {
    if (i > stageIndex) return { key: s, label: s, note: STATUS_NEXT[s].action };
    const evt = [...rule.approvalHistory].reverse().find(a =>
      (s === 'Review' && a.action === 'Submitted for review') ||
      (s === 'Approved' && a.action === 'Approved') ||
      (s === 'Active' && a.action === 'Activated') ||
      (s === 'Suspended' && a.action === 'Suspended') ||
      (s === 'Retired' && a.action === 'Retired'));
    return {
      key: s, label: s, note: STATUS_NEXT[s].action,
      reachedAt: evt?.at ?? (s === 'Draft' ? rule.createdDate : undefined), reachedBy: evt?.by ?? (s === 'Draft' ? rule.createdBy : undefined)
    };
  });

  const next = STATUS_NEXT[rule.status];
  const responsibleName = rule[next.role];

  const transition = (status: RuleStatus, action: 'Approved' | 'Rejected' | 'Changes requested' | 'Activated', note?: string) => {
    rule.approvalHistory.unshift({ at: nowStamp(), by: rule.reviewer, action, note });
    rule.activity.unshift({ at: nowStamp(), by: rule.reviewer, event: `${action}${note ? ' — ' + note : ''}` });
    rule.status = status;
    rule.lastUpdated = nowStamp();
    persistRules();
    rerender();
  };

  return (
    <div className="page">
      <Card className="rul-hero" style={{ display: 'flex', flexDirection: 'column', borderTop: `3px solid ${DOMAIN_HEX[rule.domain]}` }}>
        <div className="row vw-justify-between vw-items-start">
          <div className="row vw-items-center" style={{ gap: '12px' }}>
            <span style={{
              width: 13, height: 13, borderRadius: '50%', background: DOMAIN_HEX[rule.domain], flexShrink: 0,
              boxShadow: `0 0 0 4px color-mix(in srgb, ${DOMAIN_HEX[rule.domain]} 16%, transparent)`
            }} />
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-.01em' }}>{rule.name}</div>
              <div className="vw-card-metric-label-sub mono" style={{ marginTop: '3px' }}>{rule.id} · {DOMAIN_FULL_LABEL[rule.domain]} · {rule.ruleType}</div>
            </div>
          </div>
          <div className="row" style={{ gap: '8px' }}>
            <Chip tone={PRIORITY_TONE[rule.priority]}>{rule.priority} priority</Chip>
            <Chip tone={STATUS_TONE[rule.status]}>{rule.status}</Chip>
          </div>
        </div>
        <p className="vw-card-description" style={{ marginTop: 'var(--vw-space-sm)' }}>{rule.description}</p>

        <div className="row vw-items-center" style={{
          gap: '10px', marginTop: 'var(--vw-space-md)', padding: 'var(--vw-space-sm) var(--vw-space-md)',
          background: cv(TONE_HUE[STATUS_TONE[rule.status]], 50), borderLeft: `3px solid ${cv(TONE_HUE[STATUS_TONE[rule.status]], 400)}`,
          borderRadius: 'var(--vw-radius-sm)', boxShadow: `0 6px 18px -12px ${cv(TONE_HUE[STATUS_TONE[rule.status]], 300)}`
        }}>
          <span className="vw-value" style={{ fontWeight: 600 }}>Status: {rule.status}</span>
          <span className="vw-card-metric-label-sub">Responsible: {responsibleName} ({next.role})</span>
          <span className="vw-card-metric-label-sub">Next action: {next.action}</span>
        </div>

        {rule.status === 'Review' && (
          <div className="row" style={{ gap: '8px', marginTop: 'var(--vw-space-md)' }}>
            <button className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => transition('Approved', 'Approved')}>Approve</button>
            <button className="nst-btn nst-btn--sm nst-btn--danger-subtle" onClick={() => transition('Draft', 'Rejected', 'Sent back to the owner')}>Reject</button>
            <button className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => transition('Draft', 'Changes requested', 'Reviewer asked for changes')}>Request changes</button>
          </div>
        )}
        {rule.status === 'Approved' && (
          <div className="row" style={{ marginTop: 'var(--vw-space-md)' }}>
            <button className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => transition('Active', 'Activated')}>Activate rule</button>
          </div>
        )}
      </Card>

      <StatStrip cells={[
        { k: 'Owner', v: rule.owner, s: 'creates and maintains the rule', t: 'sky' },
        { k: 'Reviewer', v: rule.reviewer, s: 'reviews the definition and logic', t: 'cyan' },
        { k: 'Approver', v: rule.approver, s: 'approves before activation', t: 'emerald' },
        { k: 'Executor', v: rule.executor, s: 'monitors execution', t: 'purple' }
      ]} />

      <Card>
        <TabBar<TabKey>
          tabs={[
            { k: 'overview', n: 'Overview', count: 0 },
            { k: 'logic', n: 'Rule logic', count: rule.conditions.length },
            { k: 'responsibilities', n: 'Responsibilities', count: 0 },
            { k: 'lifecycle', n: 'Lifecycle', count: 0 },
            { k: 'execution', n: 'Execution', count: rule.executions.length },
            { k: 'exceptions', n: 'Exceptions', count: exceptions.length },
            { k: 'activity', n: 'Activity', count: rule.activity.length }
          ]}
          active={tab} onChange={setTab}
        />

        <div style={{ marginTop: 'var(--vw-space-lg)' }}>
          {tab === 'overview' && (
            <div className="stack-s">
              <div className="row vw-items-center" style={{ gap: 'var(--vw-space-xl)', flexWrap: 'wrap' }}>
                <div>
                  <div className="eyebrow" style={{ color: cv('sky', 600) }}>Source</div>
                  <div className="vw-value" style={{ fontSize: '1rem', marginTop: '4px' }}>{rule.source}</div>
                </div>
                <span style={{ color: cv('gray', 300), fontSize: '1.25rem' }} aria-hidden="true">→</span>
                <div>
                  <div className="eyebrow" style={{ color: cv('violet', 600) }}>Target</div>
                  <div className="vw-value" style={{ fontSize: '1rem', marginTop: '4px' }}>{rule.target}</div>
                </div>
              </div>
              <div className="vw-grid vw-gap-lg" style={{
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 'var(--vw-space-lg)',
                paddingTop: 'var(--vw-space-md)', borderTop: '1px solid var(--vw-color-slate-100)'
              }}>
                {[
                  ['Rule type', rule.ruleType], ['Origin', rule.origin],
                  ['Created', `${rule.createdBy} · ${rule.createdDate}`], ['Last updated', rule.lastUpdated]
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="eyebrow">{k}</div>
                    <div className="vw-value" style={{ fontSize: '0.875rem', marginTop: '4px' }}>{v}</div>
                  </div>
                ))}
              </div>
              {rule.status === 'Review' && (
                <div style={{ marginTop: 'var(--vw-space-md)', padding: 'var(--vw-space-md)', background: 'var(--vw-color-slate-50)', borderRadius: 'var(--vw-radius-md)' }}>
                  <div className="vw-card-title-sm">Review packet</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>Business description</div>
                  <p className="vw-card-description" style={{ marginTop: '2px' }}>{rule.description}</p>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '10px' }}>Expected impact</div>
                  <p className="vw-card-description" style={{ marginTop: '2px' }}>{rule.expectedImpact}</p>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '10px' }}>Previous changes</div>
                  {rule.approvalHistory.length === 0
                    ? <p className="vw-card-description" style={{ marginTop: '2px' }}>None — this is the first submission.</p>
                    : rule.approvalHistory.map((a, i) => (
                      <p key={i} className="vw-card-description" style={{ marginTop: '2px' }}>{a.at} · {a.by} · {a.action}{a.note ? ` — ${a.note}` : ''}</p>
                    ))}
                </div>
              )}
            </div>
          )}

          {tab === 'logic' && (
            <div style={{ padding: 'var(--vw-space-lg)', background: 'var(--vw-color-slate-50)', borderRadius: 'var(--vw-radius-md)' }}>
              {rule.conditions.map((c, i) => (
                <div key={c.id}>
                  <div className="row vw-items-center" style={{ gap: '10px', flexWrap: 'wrap' }}>
                    <Chip tone="neutral"><Mono>{c.sourceField || '—'}</Mono></Chip>
                    <span className="mono" style={{ fontWeight: 600, color: cv('blue', 700) }}>{c.operator}</span>
                    <Chip tone="neutral"><Mono>{c.targetField || '—'}</Mono></Chip>
                  </div>
                  {c.connector && i < rule.conditions.length - 1 && (
                    <div style={{ padding: '8px 0' }}>
                      <span className="mono" style={{
                        fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '.06em',
                        color: cv('violet', 700), background: cv('violet', 100), padding: '2px 10px', borderRadius: '999px'
                      }}>{c.connector}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'responsibilities' && (
            <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))' }}>
              {[
                { role: 'Owner', name: rule.owner, note: 'creates and maintains the rule', tone: 'sky' },
                { role: 'Reviewer', name: rule.reviewer, note: 'reviews the rule definition and logic', tone: 'cyan' },
                { role: 'Approver', name: rule.approver, note: 'approves the rule before activation', tone: 'emerald' },
                { role: 'Executor', name: rule.executor, note: 'monitors execution', tone: 'purple' },
                { role: 'Exception reviewer', name: rule.exceptionReviewer, note: 'reviews exceptions this rule raises', tone: 'amber' }
              ].map(r => (
                <div key={r.role} className="row rul-resp-card" style={{
                  gap: '12px', alignItems: 'flex-start', padding: 'var(--vw-space-md)',
                  border: '1px solid var(--vw-color-slate-100)', borderRadius: 'var(--vw-radius-md)'
                }}>
                  <span className="rul-step-dot" style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: cv(r.tone, 100), color: cv(r.tone, 700), fontSize: '0.75rem', fontWeight: 700
                  }}>
                    {r.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="eyebrow">{r.role}</div>
                    <div className="vw-value" style={{ marginTop: '2px' }}>{r.name}</div>
                    <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{r.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'lifecycle' && (
            <Lifecycle stages={stages} currentIndex={stageIndex} />
          )}

          {tab === 'execution' && (
            <div className="tbl-wrap tbl-wrap--chip-auto">
              <table className="mtbl">
                <thead><tr><th>Status</th><th>Run</th><th style={{ textAlign: 'right' }}>Matched</th><th style={{ textAlign: 'right' }}>Exceptions</th><th style={{ textAlign: 'right' }}>Duration</th></tr></thead>
                <tbody>
                  {rule.executions.length === 0
                    ? <tr><td colSpan={5} className="vw-card-metric-label-sub">No runs yet.</td></tr>
                    : rule.executions.map((e, i) => (
                      <tr key={i}>
                        <td><Chip tone={e.exceptions ? 'warning' : 'success'}>{e.exceptions ? 'Exceptions' : 'Clean'}</Chip></td>
                        <td className="num">{e.at}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{e.matched.toLocaleString('en-IN')}</td>
                        <td className="num" style={{ textAlign: 'right', color: e.exceptions ? 'var(--vw-color-amber-700)' : undefined }}>{e.exceptions}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{(e.durationMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'exceptions' && (
            <div className="tbl-wrap tbl-wrap--chip-auto">
              <table className="mtbl">
                <thead><tr><th>Exception</th><th>State</th><th>Subject</th><th>Owner</th><th>SLA</th><th>Next action</th></tr></thead>
                <tbody>
                  {exceptions.length === 0
                    ? <tr><td colSpan={6} className="vw-card-metric-label-sub">No exceptions raised by this rule.</td></tr>
                    : exceptions.map(e => (
                      <tr key={e.id} className="is-click" onClick={() => nav(`/discovery/reconcile/exceptions?ruleId=${rule.id}`)}>
                        <td className="mono">{e.id}</td>
                        <td><Chip tone={EXCEPTION_TONE[e.state]}>{e.state}</Chip></td>
                        <td className="vw-value">{e.subject}</td>
                        <td>{e.owner}</td>
                        <td><Chip tone={SLA_TONE[e.sla]}>{e.sla}</Chip></td>
                        <td className="vw-card-metric-label-sub">{e.next}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'activity' && (
            <Timeline entries={rule.activity.map((a, i) => {
              const { tone, label } = activityTone(a.event);
              const stats = RUN_STATS_RE.exec(a.event);
              return {
                key: `${a.at}-${i}`, when: a.at, dotHex: cv(TONE_HUE[tone], 500),
                children: (
                  <div>
                    <div className="row vw-items-center" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <Chip tone={tone}>{label}</Chip>
                      {!stats && <span className="vw-value">{a.event}</span>}
                      <span className="vw-card-metric-label-sub">by {a.by}</span>
                    </div>
                    {stats && (
                      <div className="row" style={{ gap: 'var(--vw-space-lg)', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span className="vw-card-metric-label-sub">Scanned <span className="num vw-value" style={{ marginLeft: '4px' }}>{stats[2]}</span></span>
                        <span className="vw-card-metric-label-sub">Drifted <span className="num vw-value" style={{ marginLeft: '4px', color: stats[1] === 'failed' ? undefined : cv('amber', 700) }}>{stats[3]}</span></span>
                        <span className="vw-card-metric-label-sub">Auto-resolved <span className="num vw-value" style={{ marginLeft: '4px', color: cv('emerald', 700) }}>{stats[4]}</span></span>
                      </div>
                    )}
                  </div>
                )
              };
            })} />
          )}
        </div>
      </Card>
    </div>
  );
}
