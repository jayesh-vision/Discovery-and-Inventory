import { useState, useEffect } from 'react';
import type { ScanJob } from '../../data/scanJobsData';
import { DomainDot, Chip } from '../ui';
import '../../styles/scanJobs.css';

interface ScheduleJobModalProps {
  open: boolean;
  job: ScanJob | null;
  onClose: () => void;
  onSaveSchedule: (jobId: string, newSchedule: string, nextRun: string) => void;
}

type CadenceOption = 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom' | 'ondemand';

export function ScheduleJobModal({
  open,
  job,
  onClose,
  onSaveSchedule
}: ScheduleJobModalProps) {
  const [cadence, setCadence] = useState<CadenceOption>('daily');
  const [timeOfDay, setTimeOfDay] = useState('02:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Sun']);
  const [intervalHours, setIntervalHours] = useState('6');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [cronExpr, setCronExpr] = useState('0 2 * * 0');
  const [windowHours, setWindowHours] = useState('4');
  const [concurrency, setConcurrency] = useState('16');

  // Prepopulate from job's current schedule when opening
  useEffect(() => {
    if (!job) return;
    const s = job.sched.toLowerCase();
    if (s.includes('daily')) {
      setCadence('daily');
      const timeMatch = job.sched.match(/\d{2}:\d{2}/);
      if (timeMatch) setTimeOfDay(timeMatch[0]);
    } else if (s.includes('every sun') || s.includes('sun') || s.includes('weekly')) {
      setCadence('weekly');
      const timeMatch = job.sched.match(/\d{2}:\d{2}/);
      if (timeMatch) setTimeOfDay(timeMatch[0]);
    } else if (s.includes('every') && s.includes('hr')) {
      setCadence('interval');
      const hrMatch = job.sched.match(/\d+/);
      if (hrMatch) setIntervalHours(hrMatch[0]);
    } else if (s.includes('demand')) {
      setCadence('ondemand');
    } else {
      setCadence('daily');
    }
    if (job.concurrency) {
      setConcurrency(String(job.concurrency));
    }
  }, [job]);

  if (!open || !job) return null;

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter(d => d !== day)
          : prev
        : [...prev, day]
    );
  };

  // Compute calculated schedule string
  const computeScheduleString = (): { sched: string; next: string } => {
    switch (cadence) {
      case 'daily':
        return {
          sched: `Daily at ${timeOfDay}`,
          next: `tomorrow ${timeOfDay}`
        };
      case 'weekly':
        return {
          sched: `Weekly (${selectedDays.join(', ')}) at ${timeOfDay}`,
          next: `next ${selectedDays[0]} ${timeOfDay}`
        };
      case 'interval':
        return {
          sched: `Every ${intervalHours} hrs`,
          next: `in ${intervalHours} hrs`
        };
      case 'monthly':
        return {
          sched: `Monthly on day ${dayOfMonth} at ${timeOfDay}`,
          next: `next month day ${dayOfMonth}`
        };
      case 'custom':
        return {
          sched: `Cron: ${cronExpr}`,
          next: 'as scheduled'
        };
      case 'ondemand':
        return {
          sched: 'On demand (manual)',
          next: 'manual run only'
        };
      default:
        return {
          sched: `Daily at ${timeOfDay}`,
          next: `tomorrow ${timeOfDay}`
        };
    }
  };

  const { sched: computedSched, next: computedNext } = computeScheduleString();

  const handleSave = () => {
    onSaveSchedule(job.id, computedSched, computedNext);
    onClose();
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="job-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="job-modal-panel"
        style={{ width: 'min(640px, 95vw)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="job-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="job-modal-header-icon"
              style={{
                background: 'linear-gradient(135deg, var(--vw-color-purple-500) 0%, var(--vw-color-purple-600) 100%)',
                boxShadow: '0 4px 10px rgba(168, 85, 247, 0.25)'
              }}
            >
              ⏱
            </div>
            <div>
              <h2 className="job-modal-title">
                Schedule & Reschedule Job
                <span className="mono" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--vw-color-purple-600)' }}>
                  {job.id}
                </span>
              </h2>
              <div className="job-modal-sub">
                Modify sweep cadence, execution window and concurrency parameters
              </div>
            </div>
          </div>
          <button type="button" className="job-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="job-modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Current Job Context */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--vw-color-slate-50)',
              borderRadius: '8px',
              border: '1px solid var(--vw-color-slate-200)',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{job.name || job.id}</span>
                <DomainDot domain={job.domain} />
              </div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
                {job.site} · <span className="mono">{job.scope}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="vw-card-metric-label-sub">Current schedule</div>
              <div className="mono" style={{ fontWeight: 500, fontSize: '0.8125rem', color: 'var(--vw-color-slate-800)' }}>
                {job.sched}
              </div>
            </div>
          </div>

          {/* Cadence Selection */}
          <div className="job-form-group">
            <label className="job-form-label">
              Frequency & Cadence <span className="job-required">*</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {[
                { k: 'daily', l: 'Daily', d: 'Runs once each day' },
                { k: 'weekly', l: 'Weekly', d: 'Runs on specified days' },
                { k: 'interval', l: 'Periodic Interval', d: 'Runs every X hours' },
                { k: 'monthly', l: 'Monthly', d: 'Runs on fixed calendar day' },
                { k: 'custom', l: 'Custom Cron', d: 'Cron syntax specification' },
                { k: 'ondemand', l: 'On Demand', d: 'Manual triggering only' }
              ].map(opt => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setCadence(opt.k as CadenceOption)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: cadence === opt.k ? '2px solid var(--vw-color-purple-500)' : '1px solid var(--vw-color-slate-200)',
                    background: cadence === opt.k ? 'var(--vw-color-purple-50)' : '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 120ms'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: cadence === opt.k ? 'var(--vw-color-purple-700)' : 'var(--vw-color-slate-800)' }}>
                    {opt.l}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500)', marginTop: '2px' }}>
                    {opt.d}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Cadence Settings */}
          {cadence === 'daily' && (
            <div className="job-form-group" style={{ marginTop: '16px' }}>
              <label className="job-form-label">Run Time (UTC / Local)</label>
              <input
                type="time"
                className="job-form-input"
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value)}
                style={{ width: '160px' }}
              />
            </div>
          )}

          {cadence === 'weekly' && (
            <div className="job-form-group" style={{ marginTop: '16px' }}>
              <label className="job-form-label">Execution Days & Time</label>
              <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
                {DAYS.map(day => {
                  const sel = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: sel ? '1px solid var(--vw-color-purple-500)' : '1px solid var(--vw-color-slate-200)',
                        background: sel ? 'var(--vw-color-purple-500)' : '#fff',
                        color: sel ? '#fff' : 'var(--vw-color-slate-700)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <input
                type="time"
                className="job-form-input"
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value)}
                style={{ width: '160px', marginTop: '6px' }}
              />
            </div>
          )}

          {cadence === 'interval' && (
            <div className="job-form-group" style={{ marginTop: '16px' }}>
              <label className="job-form-label">Sweep Interval</label>
              <select
                className="job-form-select"
                value={intervalHours}
                onChange={e => setIntervalHours(e.target.value)}
                style={{ width: '220px' }}
              >
                <option value="1">Every 1 hour</option>
                <option value="2">Every 2 hours</option>
                <option value="4">Every 4 hours</option>
                <option value="6">Every 6 hours</option>
                <option value="12">Every 12 hours</option>
                <option value="24">Every 24 hours</option>
              </select>
            </div>
          )}

          {cadence === 'monthly' && (
            <div className="job-form-group" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <div>
                <label className="job-form-label">Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="job-form-input"
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(e.target.value)}
                  style={{ width: '120px' }}
                />
              </div>
              <div>
                <label className="job-form-label">Execution Time</label>
                <input
                  type="time"
                  className="job-form-input"
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value)}
                  style={{ width: '160px' }}
                />
              </div>
            </div>
          )}

          {cadence === 'custom' && (
            <div className="job-form-group" style={{ marginTop: '16px' }}>
              <label className="job-form-label">Standard Cron Expression (min hr dom mon dow)</label>
              <input
                type="text"
                className="job-form-input mono"
                value={cronExpr}
                onChange={e => setCronExpr(e.target.value)}
                placeholder="0 2 * * 0"
              />
              <span className="job-form-hint">Example: 0 2 * * 0 = Every Sunday at 02:00 AM</span>
            </div>
          )}

          {/* Operational Parameters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--vw-color-slate-100)'
            }}
          >
            <div>
              <label className="job-form-label">Max Scan Window (Hours)</label>
              <select
                className="job-form-select"
                value={windowHours}
                onChange={e => setWindowHours(e.target.value)}
              >
                <option value="2">2 hours max</option>
                <option value="4">4 hours max (recommended)</option>
                <option value="8">8 hours max</option>
                <option value="12">12 hours max</option>
              </select>
              <span className="job-form-hint">Abort long-running tasks after window expiry</span>
            </div>

            <div>
              <label className="job-form-label">Probe Concurrency Threads</label>
              <select
                className="job-form-select"
                value={concurrency}
                onChange={e => setConcurrency(e.target.value)}
              >
                <option value="4">4 threads (light footprint)</option>
                <option value="8">8 threads</option>
                <option value="16">16 threads (balanced)</option>
                <option value="32">32 threads (high speed)</option>
              </select>
              <span className="job-form-hint">Simultaneous SNMP / NETCONF connection sessions</span>
            </div>
          </div>

          {/* New Schedule Preview Banner */}
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--vw-color-purple-700)', fontWeight: 600 }}>
                Effective New Schedule
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--vw-color-slate-900)', marginTop: '2px' }}>
                {computedSched}
              </div>
            </div>
            <div>
              <Chip tone="purple">Next: {computedNext}</Chip>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="job-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '16px 24px',
            borderTop: '1px solid var(--vw-color-slate-100)',
            background: 'var(--vw-color-slate-50)'
          }}
        >
          <button type="button" className="nst-btn nst-btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="nst-btn nst-btn--sm nst-btn--filled"
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, var(--vw-color-purple-600) 0%, var(--vw-color-blue-600) 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 600
            }}
          >
            Save & apply schedule
          </button>
        </div>
      </div>
    </div>
  );
}
