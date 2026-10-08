import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, DomainDot, cv } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  SCAN_JOBS,
  type ScanJob,
  type JobStatus,
  calculateKpis,
  isJobHeld,
  isJobRunning,
  isJobErrors,
  isJobFailed,
  isJobOverdue,
  isJobNeedingAttention,
  persistScanJobs,
  STATUS_CHIP_TONE
} from '../data/scanJobsData';
import {
  DOMAIN_OPTIONS,
  domainFilterMatches
} from '../data/discoveryOverview';
import { CreateScanJobModal } from '../components/discovery/CreateScanJobModal';
import { ScanJobDetailDrawer } from '../components/discovery/ScanJobDetailDrawer';
import { ScheduleJobModal } from '../components/discovery/ScheduleJobModal';
import '../styles/scanJobs.css';

type QuickFilterKey = 'All' | 'attention' | 'errors' | 'failed' | 'held' | 'overdue' | 'running';

export default function ScanJobs() {
  const nav = useNavigate();
  const [jobs, setJobs] = useState<ScanJob[]>(() => [...SCAN_JOBS]);
  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('All');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<ScanJob | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rescheduleJob, setRescheduleJob] = useState<ScanJob | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Sync state & persist
  const updateJobsState = useCallback((updater: (prev: ScanJob[]) => ScanJob[]) => {
    setJobs(prev => {
      const next = updater(prev);
      persistScanJobs(next);
      return next;
    });
  }, []);

  // Filter rows
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(j => {
      // Search
      if (q) {
        const inId = j.id.toLowerCase().includes(q);
        const inScope = j.scope.toLowerCase().includes(q);
        const inCollector = j.collector.toLowerCase().includes(q);
        const inSite = j.site.toLowerCase().includes(q);
        const inCred = j.cred.toLowerCase().includes(q);
        const inName = j.name ? j.name.toLowerCase().includes(q) : false;
        if (!inId && !inScope && !inCollector && !inSite && !inCred && !inName) return false;
      }

      // Domain filter
      if (domainFilter && !domainFilterMatches(j.domain, domainFilter)) {
        return false;
      }

      // Quick filter
      if (quickFilter === 'attention' && !isJobNeedingAttention(j)) return false;
      if (quickFilter === 'errors' && !isJobErrors(j) && !isJobFailed(j)) return false;
      if (quickFilter === 'failed' && !isJobFailed(j)) return false;
      if (quickFilter === 'held' && !isJobHeld(j)) return false;
      if (quickFilter === 'overdue' && !isJobOverdue(j)) return false;
      if (quickFilter === 'running' && !isJobRunning(j)) return false;

      return true;
    });
  }, [jobs, query, quickFilter, domainFilter]);

  // KPI Calculations
  const kpis = useMemo(() => calculateKpis(jobs), [jobs]);

  // Action: Trigger Run Now
  const handleRunNow = useCallback((job: ScanJob) => {
    showToast(`Scan initiated on ${job.collector} for ${job.targets.toLocaleString('en-IN')} targets...`);
    
    // Set to running
    updateJobsState(prev =>
      prev.map(j =>
        j.id === job.id
          ? {
              ...j,
              state: 'Running',
              chip: 'info',
              next: 'sweeping now',
              last: 'Running now',
              dur: '0 m 12 s'
            }
          : j
      )
    );

    // Simulate completion after 3 seconds
    setTimeout(() => {
      const nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const timeStr = new Date().toTimeString().slice(0, 5);
      const fullTimeStr = `${nowStr} ${timeStr}`;

      const failCount = Math.floor(Math.random() * 8);
      const partialCount = Math.floor(Math.random() * 15);
      const cleanCount = job.targets - failCount - partialCount;

      const runId = `RN-${Math.floor(1000 + Math.random() * 9000)}`;

      // Realistic failure scenario diagnostics if any targets failed
      const failScenarios = [
        {
          code: 'ERR-NET-TIMEOUT',
          stage: 'Probe Reachability',
          reason: `${failCount} edge targets timed out on SNMP GET bulk requests. Upstream latency (>4s) or packet drop on ${job.collector} exceeded timeout threshold.`,
          action: 'Verify collector link latency and retry scan sweep or increase probe timeout threshold.'
        },
        {
          code: 'ERR-AUTH-CRED-REJECT',
          stage: 'Credential Authentication',
          reason: `${failCount} access nodes rejected SNMPv3 credentials with USM error usmStatsWrongDigests. Check localized authentication passphrase.`,
          action: 'Verify SHA256/AES128 credentials in vault profile secret/net/snmp/v3-inband.'
        },
        {
          code: 'ERR-ADAPTER-UNSUPPORTED',
          stage: 'Collect & Parse',
          reason: `${failCount} target devices returned unrecognized chassis entity MIB trees during discovery walk.`,
          action: 'Update collector MIB schema or assign vendor-specific adapter profile.'
        }
      ];
      const failureScenario = failCount > 0 ? failScenarios[Math.floor(Math.random() * failScenarios.length)] : null;

      updateJobsState(prev =>
        prev.map(j => {
          if (j.id !== job.id) return j;
          const updatedRuns = [
            {
              runId,
              at: fullTimeStr,
              duration: '3 m 18 s',
              targets: j.targets,
              clean: cleanCount,
              partial: partialCount,
              fail: failCount,
              status: (failCount > 0 ? 'Completed with errors' : 'Completed') as JobStatus,
              failureCode: failureScenario?.code,
              failureReason: failureScenario?.reason
            },
            ...(j.recentRuns || [])
          ];

          return {
            ...j,
            state: (failCount > 0 ? 'Completed with errors' : 'Completed') as JobStatus,
            chip: failCount > 0 ? 'warning' : 'success',
            last: fullTimeStr,
            dur: '3 m 18 s',
            next: j.sched.includes('Every') ? 'in 6 hrs' : 'tomorrow 02:00',
            clean: cleanCount,
            partial: partialCount,
            fail: failCount,
            failureCode: failureScenario ? failureScenario.code : j.failureCode,
            failureStage: failureScenario ? failureScenario.stage : j.failureStage,
            failureReason: failureScenario ? failureScenario.reason : j.failureReason,
            suggestedAction: failureScenario ? failureScenario.action : j.suggestedAction,
            recentRuns: updatedRuns
          };
        })
      );

      showToast(`Scan ${runId} completed: ${cleanCount} clean, ${failCount} failed.`);
    }, 3000);
  }, [showToast, updateJobsState]);

  // Action: Hold / Resume Schedule
  const handleToggleHold = useCallback((job: ScanJob) => {
    const isCurrentlyHeld = isJobHeld(job);
    const nextState = isCurrentlyHeld ? 'Completed' : 'Held';
    const nextChip = isCurrentlyHeld ? 'success' : 'warning';
    const nextNext = isCurrentlyHeld ? 'tomorrow 02:00' : 'held';

    updateJobsState(prev =>
      prev.map(j =>
        j.id === job.id
          ? {
              ...j,
              state: nextState as JobStatus,
              chip: nextChip,
              next: nextNext
            }
          : j
      )
    );

    showToast(isCurrentlyHeld ? `Schedule resumed for ${job.id}` : `Schedule held for ${job.id}`);
  }, [showToast, updateJobsState]);

  // Action: Open Reschedule Modal
  const handleOpenReschedule = useCallback((job: ScanJob) => {
    setRescheduleJob(job);
    setIsScheduleModalOpen(true);
  }, []);

  // Action: Save Rescheduled Cadence
  const handleSaveSchedule = useCallback((jobId: string, newSchedule: string, nextRun: string) => {
    updateJobsState(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              sched: newSchedule,
              next: nextRun
            }
          : j
      )
    );
    showToast(`Schedule updated for ${jobId}: ${newSchedule}`);
  }, [showToast, updateJobsState]);

  // Action: Add New Job
  const handleJobCreated = useCallback((newJob: ScanJob, runImmediately: boolean) => {
    updateJobsState(prev => [newJob, ...prev]);
    showToast(`Discovery scan job ${newJob.id} registered.`);

    if (runImmediately) {
      setTimeout(() => {
        handleRunNow(newJob);
      }, 500);
    }
  }, [updateJobsState, showToast, handleRunNow]);

  // Helper for KPI click drills
  const handleKpiFilterClick = (filter: QuickFilterKey) => {
    setQuickFilter(prev => (prev === filter ? 'All' : filter));
  };

  return (
    <div id="view" className="page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="copy-toast is-in"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999,
            background: 'var(--vw-color-slate-900)',
            color: 'var(--vw-color-white)',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 4 Top KPI Cards (100% selector & style compatible with legacy & tests) ── */}
      <div className="vw-grid vw-grid-cols-4 vw-gap-md">
        {/* Card 1: Total jobs */}
        <div
          className={`vw-card-section vw-card--accent stack-x clickable-kpi${quickFilter === 'All' ? ' is-selected' : ''}`}
          style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)', textAlign: 'left', cursor: 'pointer' }}
          onClick={() => setQuickFilter('All')}
        >
          <div className="vw-card-accent" style={{ background: cv('sky', 400) }} />
          <div className="vw-card-metric-label">Total jobs</div>
          <div className="vw-card-metric-xl num" style={{ color: cv('sky', 700), fontWeight: 500 }}>
            {kpis.total}
          </div>
          <div className="vw-card-metric-label-sub">
            {kpis.live} on a live schedule ({kpis.weekly} weekly) · {kpis.onDemand} on demand · {kpis.held} held
          </div>
        </div>

        {/* Card 2: Next run */}
        <div
          className="vw-card-section vw-card--accent stack-x"
          style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)', textAlign: 'left' }}
        >
          <div className="vw-card-accent" style={{ background: cv('cyan', 400) }} />
          <div className="vw-card-metric-label">Next run</div>
          <div className="vw-card-metric-xl num" style={{ color: cv('cyan', 700), fontWeight: 500 }}>
            {kpis.nextRunTime}
          </div>
          <div className="vw-card-metric-label-sub">
            {kpis.nextRunSub}
          </div>
        </div>

        {/* Card 3: Jobs needing attention */}
        <div
          className={`vw-card-section vw-card--accent stack-x clickable-kpi${quickFilter === 'attention' ? ' is-selected' : ''}`}
          style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)', textAlign: 'left', cursor: 'pointer' }}
          onClick={() => handleKpiFilterClick('attention')}
        >
          <div className="vw-card-accent" style={{ background: cv('amber', 400) }} />
          <div className="vw-card-metric-label">Jobs needing attention</div>
          <div className="vw-card-metric-xl num" style={{ color: cv('amber', 700), fontWeight: 500 }}>
            {kpis.attention}
          </div>
          <div className="vw-card-metric-label-sub">
            {kpis.reasonsStr}
          </div>
        </div>

        {/* Card 4: Collector nodes in use */}
        <div
          className="vw-card-section vw-card--accent stack-x"
          style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)', textAlign: 'left' }}
        >
          <div className="vw-card-accent" style={{ background: cv('purple', 400) }} />
          <div className="vw-card-metric-label">Collector nodes in use</div>
          <div className="vw-card-metric-xl num" style={{ color: cv('purple', 700), fontWeight: 500 }}>
            {kpis.collectorCount}
          </div>
          <div className="vw-card-metric-label-sub">
            {kpis.busiestCollectorStr}
          </div>
        </div>
      </div>

      {/* ── Main Data Card ── */}
      <Card>
        {/* ── Native DataGrid Component with Unified Toolbar ── */}
        <DataGrid<ScanJob>
          chipWidth="auto"
          columns={[
            { t: 'Status', plain: true, w: '14%' },
            { t: 'Domain', w: '16%' },
            { t: 'Job · scope', w: '26%' },
            { t: 'Collector · credential', w: '16%' },
            { t: 'Schedule', w: '14%' },
            { t: 'Last run · duration', w: '14%' }
          ]}
          rows={filteredRows}
          total={jobs.length}
          rowKey={j => j.id}
          resetKey={`${query}|${quickFilter}|${domainFilter}`}
          searchPlaceholder="Job, scope, collector"
          searchValue={query}
          onSearch={setQuery}
          gridActions={[
            {
              id: 'btn-create-scan-job',
              l: 'Create scan job',
              primary: true,
              hint: 'Create and configure a new network discovery scan job',
              onClick: () => setIsCreateModalOpen(true)
            }
          ]}
          rowActions={j => [
            {
              l: 'Run scan now',
              primary: true,
              disabled: j.state === 'Running',
              hint: j.state === 'Running' ? 'Job is currently running' : 'Initiate immediate discovery sweep',
              onClick: () => handleRunNow(j)
            },
            {
              l: 'Schedule / Reschedule',
              onClick: () => handleOpenReschedule(j)
            },
            {
              l: isJobHeld(j) ? 'Resume schedule' : 'Hold schedule',
              onClick: () => handleToggleHold(j)
            },
            {
              l: 'Job details',
              onClick: () => setSelectedJob(j)
            },
            {
              l: 'View scan targets',
              onClick: () => nav(`/discovery/targets?tgt=All&job=${encodeURIComponent(j.id)}`)
            }
          ]}
          filters={[
            { n: 'Domain', o: DOMAIN_OPTIONS },
            { n: 'Status', o: ['Completed', 'Completed with errors', 'Failed', 'Running', 'No adapter', 'Held'] }
          ]}
          onFilterChange={values => {
            if (values.Domain) setDomainFilter(values.Domain);
            else setDomainFilter('');
            if (values.Status) {
              if (values.Status === 'Completed with errors') setQuickFilter('errors');
              else if (values.Status === 'Failed') setQuickFilter('failed');
              else if (values.Status === 'Running') setQuickFilter('running');
              else if (values.Status === 'Held') setQuickFilter('held');
              else setQuickFilter('All');
            }
          }}
          onRowClick={j => setSelectedJob(j)}
          renderRow={j => [
            // Column 1: Status
            <div key="status" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Chip tone={j.chip || STATUS_CHIP_TONE[j.state] || 'neutral'}>
                {j.state === 'Running' ? (
                  <span className="scan-running-indicator">
                    <span className="scan-pulse-dot" />
                    <span>Running</span>
                  </span>
                ) : (
                  j.state
                )}
              </Chip>
            </div>,

            // Column 2: Domain
            <DomainDot key="domain" domain={j.domain} />,

            // Column 3: Job · scope
            <div key="job-scope">
              <span className="vw-value" style={{ fontWeight: 500 }}>{j.id}</span>
              <br />
              <span className="vw-card-metric-label-sub">
                {j.site} · <span className="mono">{j.scope}</span>
              </span>
            </div>,

            // Column 4: Collector · credential
            <div key="collector">
              <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--vw-color-emerald-500)', display: 'inline-block' }} />
                {j.collector}
              </span>
              <br />
              <span className="vw-card-metric-label-sub mono">{j.cred}</span>
            </div>,

            // Column 5: Schedule
            <span key="sched" className="vw-card-metric-label-sub" style={{ color: 'var(--vw-color-slate-700)' }}>
              {j.sched}
            </span>,

            // Column 6: Last run · duration
            <div key="last-run">
              <span className="num">{j.last}</span>
              <br />
              <span className="vw-card-metric-label-sub num">{j.dur}</span>
            </div>
          ]}
        />
      </Card>

      {/* ── Slide-Over Detail Drawer ── */}
      <ScanJobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onRunNow={handleRunNow}
        onToggleHold={handleToggleHold}
        onReschedule={handleOpenReschedule}
      />

      {/* ── Create Scan Job Wizard Modal ── */}
      <CreateScanJobModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        existingJobs={jobs}
        onJobCreated={handleJobCreated}
      />

      {/* ── Schedule / Reschedule Job Modal ── */}
      <ScheduleJobModal
        open={isScheduleModalOpen}
        job={rescheduleJob}
        onClose={() => setIsScheduleModalOpen(false)}
        onSaveSchedule={handleSaveSchedule}
      />
    </div>
  );
}
