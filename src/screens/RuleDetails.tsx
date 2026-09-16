import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, TabBar } from '../components/ui';
import { Lifecycle, type LifecycleStage } from '../components/Lifecycle';
import { Timeline } from '../components/Timeline';
import {
  ruleById, RULE_LIFECYCLE, STATUS_TONE, STATUS_NEXT, PRIORITY_TONE, DOMAIN_HEX, DOMAIN_LABEL,
  type RuleStatus
} from '../data/rules';
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
    if (i > stageIndex) return { key: s, label: s };
    const evt = [...rule.approvalHistory].reverse().find(a =>
      (s === 'Review' && a.action === 'Submitted for review') ||
      (s === 'Approved' && a.action === 'Approved') ||
      (s === 'Active' && a.action === 'Activated') ||
      (s === 'Suspended' && a.action === 'Suspended') ||
      (s === 'Retired' && a.action === 'Retired'));
    return { key: s, label: s, reachedAt: evt?.at ?? (s === 'Draft' ? rule.createdDate : undefined), reachedBy: evt?.by ?? (s === 'Draft' ? rule.createdBy : undefined) };
  });

  const next = STATUS_NEXT[rule.status];
  const responsibleName = rule[next.role];

  const transition = (status: RuleStatus, action: 'Approved' | 'Rejected' | 'Changes requested' | 'Activated', note?: string) => {
    rule.approvalHistory.unshift({ at: nowStamp(), by: rule.reviewer, action, note });
    rule.activity.unshift({ at: nowStamp(), by: rule.reviewer, event: `${action}${note ? ' — ' + note : ''}` });
    rule.status = status;
    rule.lastUpdated = nowStamp();
    rerender();
  };

  return (
    <div className="page">
      <Card style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="row vw-justify-between vw-items-start">
          <div className="row vw-items-center" style={{ gap: '10px' }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: DOMAIN_HEX[rule.domain], flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rule.name}</div>
              <div className="vw-card-metric-label-sub mono" style={{ marginTop: '2px' }}>{rule.id} · {DOMAIN_LABEL[rule.domain]} · {rule.ruleType}</div>
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
          background: 'var(--vw-color-slate-50)', borderLeft: `3px solid var(--vw-color-${TONE_HUE[STATUS_TONE[rule.status]]}-400)`,
          borderRadius: 'var(--vw-radius-sm)'
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
              <div className="kv">
                <div><span className="k">Source</span><span className="v">{rule.source}</span></div>
                <div><span className="k">Target</span><span className="v">{rule.target}</span></div>
                <div><span className="k">Rule type</span><span className="v">{rule.ruleType}</span></div>
                <div><span className="k">Origin</span><span className="v">{rule.origin}</span></div>
                <div><span className="k">Created</span><span className="v">{rule.createdBy} · {rule.createdDate}</span></div>
                <div><span className="k">Last updated</span><span className="v">{rule.lastUpdated}</span></div>
              </div>
              {rule.status === 'Review' && (
                <div style={{ marginTop: 'var(--vw-space-md)', padding: 'var(--vw-space-md)', background: 'var(--vw-color-slate-50)', borderRadius: 'var(--vw-radius-md)' }}>
                  <div className="vw-card-title-sm" style={{ fontSize: '0.8125rem' }}>Review packet</div>
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
            <div className="stack-s">
              {rule.conditions.map((c, i) => (
                <div key={c.id} className="row vw-items-center" style={{ gap: '10px', flexWrap: 'wrap' }}>
                  <Chip tone="neutral"><Mono>{c.sourceField || '—'}</Mono></Chip>
                  <span className="vw-card-metric-label-sub">{c.operator}</span>
                  <Chip tone="neutral"><Mono>{c.targetField || '—'}</Mono></Chip>
                  {c.connector && i < rule.conditions.length - 1 && <span className="vw-value" style={{ fontWeight: 700 }}>{c.connector}</span>}
                </div>
              ))}
            </div>
          )}

          {tab === 'responsibilities' && (
            <div className="kv">
              <div><span className="k">Rule owner</span><span className="v">{rule.owner} — creates and maintains the rule</span></div>
              <div><span className="k">Rule reviewer</span><span className="v">{rule.reviewer} — reviews the rule definition and logic</span></div>
              <div><span className="k">Rule approver</span><span className="v">{rule.approver} — approves the rule before activation</span></div>
              <div><span className="k">Rule executor</span><span className="v">{rule.executor} — monitors execution</span></div>
              <div><span className="k">Exception reviewer</span><span className="v">{rule.exceptionReviewer} — reviews exceptions this rule raises</span></div>
            </div>
          )}

          {tab === 'lifecycle' && (
            <Lifecycle stages={stages} currentIndex={stageIndex} />
          )}

          {tab === 'execution' && (
            <div className="tbl-wrap">
              <table className="mtbl">
                <thead><tr><th>Run</th><th style={{ textAlign: 'right' }}>Matched</th><th style={{ textAlign: 'right' }}>Exceptions</th><th style={{ textAlign: 'right' }}>Duration</th></tr></thead>
                <tbody>
                  {rule.executions.length === 0
                    ? <tr><td colSpan={4} className="vw-card-metric-label-sub">No runs yet.</td></tr>
                    : rule.executions.map((e, i) => (
                      <tr key={i}>
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
            <div className="tbl-wrap">
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
            <Timeline entries={rule.activity.map((a, i) => ({
              key: `${a.at}-${i}`, when: a.at, dotHex: DOMAIN_HEX[rule.domain],
              children: <div className="vw-value">{a.event} <span className="vw-card-metric-label-sub">— {a.by}</span></div>
            }))} />
          )}
        </div>
      </Card>
    </div>
  );
}
