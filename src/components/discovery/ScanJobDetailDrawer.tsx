import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScanJob } from '../../data/scanJobsData';
import { DomainDot, Chip } from '../ui';
import { STATUS_CHIP_TONE, getJobFailureDetails } from '../../data/scanJobsData';

interface ScanJobDetailDrawerProps {
  job: ScanJob | null;
  onClose: () => void;
  onRunNow: (job: ScanJob) => void;
  onToggleHold: (job: ScanJob) => void;
  onReschedule?: (job: ScanJob) => void;
}

export function ScanJobDetailDrawer({
  job,
  onClose,
  onRunNow,
  onToggleHold,
  onReschedule
}: ScanJobDetailDrawerProps) {
  const nav = useNavigate();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!job) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [job, onClose]);

  if (!job) return null;

  const failureDetails = (job.state === 'Failed' || job.state === 'Completed with errors' || job.state === 'No adapter')
    ? getJobFailureDetails(job)
    : null;
  const cleanPct = job.targets > 0 ? ((job.clean / job.targets) * 100).toFixed(1) : '100';
  const partialPct = job.targets > 0 ? ((job.partial / job.targets) * 100).toFixed(1) : '0';
  const failPct = job.targets > 0 ? ((job.fail / job.targets) * 100).toFixed(1) : '0';

  const isHeld = job.next === 'held' || job.state === 'Held';

  return (
    <>
      <div className="ov-scrim" onClick={onClose} />
      <aside
        className="ov-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Job details for ${job.id}`}
        style={{ width: 'min(32rem, 95vw)' }}
      >
        {/* Drawer Header */}
        <div className="ov-drawer-head">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="vw-card-title-sm mono" style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
                {job.id}
              </span>
              <Chip tone={job.chip || STATUS_CHIP_TONE[job.state] || 'neutral'}>
                {job.state}
              </Chip>
            </div>
            <div className="vw-card-metric-label-sub">
              {job.site}
            </div>
          </div>
          <button
            ref={closeBtn}
            className="nst-btn nst-btn--xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Drawer Body */}
        <div className="ov-drawer-body">
          {/* Quick Action Ribbon */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--vw-space-lg)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="nst-btn nst-btn--xs nst-btn--primary"
              onClick={() => onRunNow(job)}
              disabled={job.state === 'Running'}
            >
              {job.state === 'Running' ? '⟳ Running...' : '▶ Run scan now'}
            </button>
            {onReschedule && (
              <button
                type="button"
                className="nst-btn nst-btn--xs"
                onClick={() => onReschedule(job)}
              >
                ⏱ Reschedule
              </button>
            )}
            <button
              type="button"
              className="nst-btn nst-btn--xs"
              onClick={() => onToggleHold(job)}
            >
              {isHeld ? '▶ Resume schedule' : '⏸ Hold schedule'}
            </button>
            <button
              type="button"
              className="nst-btn nst-btn--xs"
              onClick={() => {
                onClose();
                nav(`/discovery/targets?tgt=All&job=${encodeURIComponent(job.id)}`);
              }}
            >
              View targets ({job.targets})
            </button>
          </div>

          {/* Diagnostic Failure Alert Box when Job has failures or errors */}
          {failureDetails && (
            <div className={`job-failure-alert-box ${job.state === 'Failed' ? 'is-fatal' : 'is-warning'}`}>
              <div className="job-failure-alert-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="job-failure-icon">{job.state === 'Failed' ? '🚨' : '⚠️'}</span>
                  <div>
                    <div className="job-failure-title">
                      {job.state === 'Failed' ? 'Scan Job Failure Analysis' : 'Scan Job Error Diagnostics'}
                    </div>
                    <div className="job-failure-subtitle">
                      Detailed root cause & remediation instructions
                    </div>
                  </div>
                </div>
                {failureDetails.code && (
                  <span className="job-failure-code-badge mono">
                    {failureDetails.code}
                  </span>
                )}
              </div>

              {/* Full Reason (Pura Reason) */}
              <div className="job-failure-reason-body">
                <div className="job-failure-label">Failure Root Cause & Diagnostic Summary:</div>
                <div className="job-failure-text-full">
                  {failureDetails.reason}
                </div>
              </div>

              {/* Failure Metadata Grid */}
              <div className="job-failure-meta-grid">
                <div className="job-failure-meta-item">
                  <span className="meta-k">Execution Phase</span>
                  <span className="meta-v">{failureDetails.stage}</span>
                </div>
                <div className="job-failure-meta-item">
                  <span className="meta-k">Affected Targets</span>
                  <span className="meta-v">
                    <strong style={{ color: job.state === 'Failed' ? 'var(--vw-color-red-600)' : 'var(--vw-color-amber-700)' }}>
                      {job.fail}
                    </strong> of {job.targets} ({failureDetails.failPercentage}%)
                  </span>
                </div>
                <div className="job-failure-meta-item">
                  <span className="meta-k">Collector Node</span>
                  <span className="meta-v mono">{job.collector}</span>
                </div>
                <div className="job-failure-meta-item">
                  <span className="meta-k">Credential Profile</span>
                  <span className="meta-v mono">{job.cred}</span>
                </div>
              </div>

              {/* Actionable Remediation Guidance */}
              {failureDetails.suggestedAction && (
                <div className="job-failure-remediation">
                  <div className="remediation-title">
                    💡 Recommended Remediation:
                  </div>
                  <div className="remediation-desc">
                    {failureDetails.suggestedAction}
                  </div>
                </div>
              )}

              {/* Direct Action Buttons */}
              <div className="job-failure-actions">
                {job.fail > 0 && (
                  <button
                    type="button"
                    className="nst-btn nst-btn--xs nst-btn--error"
                    style={{ fontWeight: 600 }}
                    onClick={() => {
                      onClose();
                      nav(`/discovery/targets?tgt=Failed&job=${encodeURIComponent(job.id)}`);
                    }}
                  >
                    🔍 View failed targets ({job.fail})
                  </button>
                )}
                <button
                  type="button"
                  className="nst-btn nst-btn--xs"
                  onClick={() => onRunNow(job)}
                  disabled={job.state === 'Running'}
                >
                  ⚡ Rescan sweep now
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Overview */}
          <div className="job-drawer-section">
            <div className="job-drawer-title">Job Configuration</div>
            <div className="kv">
              <div>
                <span className="k">Domain</span>
                <span className="v"><DomainDot domain={job.domain} /></span>
              </div>
              <div>
                <span className="k">Target Scope</span>
                <span className="v mono" style={{ maxWidth: '240px', wordBreak: 'break-all' }}>{job.scope}</span>
              </div>
              <div>
                <span className="k">Collector Node</span>
                <span className="v mono">{job.collector}</span>
              </div>
              <div>
                <span className="k">Credential Profile</span>
                <span className="v mono">{job.cred}</span>
              </div>
              <div>
                <span className="k">Schedule Cadence</span>
                <span className="v">{job.sched}</span>
              </div>
              <div>
                <span className="k">Next Run</span>
                <span className="v">{job.next}</span>
              </div>
              <div>
                <span className="k">Last Run Duration</span>
                <span className="v">{job.last} · {job.dur}</span>
              </div>
              {job.concurrency && (
                <div>
                  <span className="k">Probe Concurrency</span>
                  <span className="v">{job.concurrency} threads</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Target Breakdown */}
          <div className="job-drawer-section">
            <div className="job-drawer-title">Discovery Target Health</div>
            <div style={{ background: 'var(--vw-color-slate-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--vw-color-slate-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600 }}>Total Targets: {job.targets.toLocaleString('en-IN')}</span>
                <span style={{ color: 'var(--vw-color-emerald-700)', fontWeight: 600 }}>{cleanPct}% Clean</span>
              </div>

              {/* Progress Bar */}
              <div className="target-breakdown-bar" style={{ height: '8px' }}>
                <div className="target-bar-clean" style={{ width: `${cleanPct}%` }} title={`Clean: ${job.clean}`} />
                <div className="target-bar-partial" style={{ width: `${partialPct}%` }} title={`Partial: ${job.partial}`} />
                <div className="target-bar-fail" style={{ width: `${failPct}%` }} title={`Failed: ${job.fail}`} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--vw-color-emerald-700)', fontWeight: 600 }}>{job.clean}</span> Clean
                </div>
                <div>
                  <span style={{ color: 'var(--vw-color-amber-700)', fontWeight: 600 }}>{job.partial}</span> Partial
                </div>
                <div>
                  <span style={{ color: 'var(--vw-color-red-700)', fontWeight: 600 }}>{job.fail}</span> Failed
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Recent Execution History */}
          <div className="job-drawer-section">
            <div className="job-drawer-title">Recent Run Executions</div>
            {job.recentRuns && job.recentRuns.length > 0 ? (
              <div style={{ border: '1px solid var(--vw-color-slate-200)', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="job-run-history-table">
                  <thead>
                    <tr>
                      <th>Run ID</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Targets</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.recentRuns.map(run => {
                      const runHasFailure = run.status === 'Failed' || run.status === 'Completed with errors' || run.fail > 0 || !!run.failureReason;
                      const runReason = run.failureReason || (runHasFailure ? job.failureReason : undefined);
                      const runCode = run.failureCode || (runHasFailure ? job.failureCode : undefined);

                      return (
                        <tr key={run.runId}>
                          <td className="mono" style={{ fontWeight: 500 }}>{run.runId}</td>
                          <td>{run.at}</td>
                          <td className="mono">{run.duration}</td>
                          <td>
                            <span title={`Clean: ${run.clean}, Partial: ${run.partial}, Fail: ${run.fail}`}>
                              {run.targets}
                              {run.fail > 0 && (
                                <span style={{ color: 'var(--vw-color-red-600)', fontSize: '0.6875rem', fontWeight: 600, marginLeft: '4px' }}>
                                  ({run.fail} fail)
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <Chip tone={STATUS_CHIP_TONE[run.status] || 'neutral'}>
                                {run.status}
                              </Chip>
                              {runReason && (
                                <span
                                  className="job-run-failure-msg"
                                  style={{
                                    fontSize: '0.6875rem',
                                    color: run.status === 'Failed' ? 'var(--vw-color-red-700)' : 'var(--vw-color-amber-800)',
                                    lineHeight: 1.25,
                                    maxWidth: '180px',
                                    wordBreak: 'break-word',
                                    marginTop: '2px'
                                  }}
                                  title={`${runCode ? `[${runCode}] ` : ''}${runReason}`}
                                >
                                  {runCode && <strong className="mono" style={{ fontSize: '0.625rem' }}>[{runCode}] </strong>}
                                  {runReason}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-400)', padding: '12px', background: 'var(--vw-color-slate-50)', borderRadius: '6px' }}>
                No prior runs recorded. Click "Run scan now" to initiate initial sweep.
              </div>
            )}
          </div>

          {/* Section 4: Operational Notes */}
          {job.notes && (
            <div className="job-drawer-section">
              <div className="job-drawer-title">Operational Notes</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--vw-color-slate-600)', background: 'var(--vw-color-amber-50)', border: '1px solid var(--vw-color-amber-200)', padding: '10px', borderRadius: '6px' }}>
                {job.notes}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
