import { useState, useEffect, useMemo, type ReactElement } from 'react';
import type { ScanJob } from '../../data/scanJobsData';
import { DomainDot } from '../ui';
import {
  validateAndParseCron,
  CRON_PRESETS,
  CRON_FIELD_GUIDES
} from '../../utils/cronHelper';
import '../../styles/scanJobs.css';

interface ScheduleJobModalProps {
  open: boolean;
  job: ScanJob | null;
  onClose: () => void;
  onSaveSchedule: (jobId: string, newSchedule: string, nextRun: string) => void;
}

type CadenceOption = 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom' | 'ondemand';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Clean SVG Icons for Cadences and Statuses
const ICONS: Record<string, ReactElement> = {
  daily: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  weekly: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  interval: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
    </svg>
  ),
  monthly: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  ),
  custom: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  ondemand: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  chevronDown: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  copy: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
};

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
  const [copiedExpr, setCopiedExpr] = useState(false);

  // Prepopulate from job's current schedule when opening
  useEffect(() => {
    if (!job) return;
    const s = job.sched.toLowerCase();
    if (s.startsWith('cron:')) {
      setCadence('custom');
      const expr = job.sched.replace(/^cron:\s*/i, '').trim();
      if (expr) setCronExpr(expr);
    } else if (s.includes('daily')) {
      setCadence('daily');
      const timeMatch = job.sched.match(/\d{2}:\d{2}/);
      if (timeMatch) setTimeOfDay(timeMatch[0]);
    } else if (s.includes('weekly') || s.includes('sun') || s.includes('mon') || s.includes('sat')) {
      setCadence('weekly');
      const timeMatch = job.sched.match(/\d{2}:\d{2}/);
      if (timeMatch) setTimeOfDay(timeMatch[0]);
      const daysMatch = job.sched.match(/\(([^)]+)\)/);
      if (daysMatch) {
        const found = daysMatch[1].split(/[\s,]+/).filter(d => DAYS.includes(d));
        if (found.length > 0) setSelectedDays(found);
      }
    } else if (s.includes('every') && s.includes('hr')) {
      setCadence('interval');
      const hrMatch = job.sched.match(/\d+/);
      if (hrMatch) setIntervalHours(hrMatch[0]);
    } else if (s.includes('monthly')) {
      setCadence('monthly');
      const dayMatch = job.sched.match(/day\s+(\d+)/i);
      if (dayMatch) setDayOfMonth(dayMatch[1]);
      const timeMatch = job.sched.match(/\d{2}:\d{2}/);
      if (timeMatch) setTimeOfDay(timeMatch[0]);
    } else if (s.includes('demand') || s.includes('manual')) {
      setCadence('ondemand');
    } else {
      setCadence('daily');
    }
    if (job.concurrency) {
      setConcurrency(String(job.concurrency));
    }
  }, [job]);

  // Real-time Cron Validation & Parsing
  const cronValidation = useMemo(() => {
    return validateAndParseCron(cronExpr);
  }, [cronExpr]);

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

  const selectDayPreset = (mode: 'all' | 'weekdays' | 'weekends') => {
    if (mode === 'all') setSelectedDays([...DAYS]);
    else if (mode === 'weekdays') setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    else if (mode === 'weekends') setSelectedDays(['Sat', 'Sun']);
  };

  // Compute calculated schedule string and human description
  const computed = (() => {
    switch (cadence) {
      case 'daily':
        return {
          sched: `Daily at ${timeOfDay}`,
          next: `tomorrow at ${timeOfDay} UTC`,
          humanTitle: `Runs daily at ${timeOfDay} (UTC)`,
          isValid: true,
          error: null
        };
      case 'weekly':
        return {
          sched: `Weekly (${selectedDays.join(', ')}) at ${timeOfDay}`,
          next: `next ${selectedDays[0]} at ${timeOfDay} UTC`,
          humanTitle: `Runs weekly on ${selectedDays.join(', ')} at ${timeOfDay} (UTC)`,
          isValid: true,
          error: null
        };
      case 'interval': {
        const h = Number(intervalHours) || 6;
        const runsPerDay = Math.round(24 / h);
        return {
          sched: `Every ${intervalHours} hrs`,
          next: `in ${intervalHours} hrs`,
          humanTitle: `Runs every ${intervalHours} hours (${runsPerDay} sweeps per 24 hours)`,
          isValid: true,
          error: null
        };
      }
      case 'monthly':
        return {
          sched: `Monthly on day ${dayOfMonth} at ${timeOfDay}`,
          next: `day ${dayOfMonth} of next month at ${timeOfDay} UTC`,
          humanTitle: `Runs monthly on day ${dayOfMonth} at ${timeOfDay} (UTC)`,
          isValid: true,
          error: null
        };
      case 'custom':
        return {
          sched: `Cron: ${cronExpr.trim()}`,
          next: cronValidation.isValid ? cronValidation.nextRunEstimate : 'Invalid schedule',
          humanTitle: cronValidation.isValid ? cronValidation.humanDescription : 'Cannot parse cron expression',
          isValid: cronValidation.isValid,
          error: cronValidation.error
        };
      case 'ondemand':
        return {
          sched: 'On demand (manual)',
          next: 'manual run only',
          humanTitle: 'Triggered manually via Run Now — no automated recurring background sweep',
          isValid: true,
          error: null
        };
      default:
        return {
          sched: `Daily at ${timeOfDay}`,
          next: `tomorrow ${timeOfDay}`,
          humanTitle: `Runs daily at ${timeOfDay}`,
          isValid: true,
          error: null
        };
    }
  })();

  const handleSave = () => {
    if (!computed.isValid) return;
    onSaveSchedule(job.id, computed.sched, computed.next);
    onClose();
  };

  const handleCopyExpr = () => {
    const textToCopy = cadence === 'custom' ? cronExpr : computed.sched;
    navigator.clipboard?.writeText?.(textToCopy);
    setCopiedExpr(true);
    setTimeout(() => setCopiedExpr(false), 1800);
  };

  const CADENCE_OPTIONS: Array<{ k: CadenceOption; l: string; d: string; iconKey: string }> = [
    { k: 'daily', l: 'Daily', d: 'Runs once each day at designated hour', iconKey: 'daily' },
    { k: 'weekly', l: 'Weekly', d: 'Runs on specified days of the week', iconKey: 'weekly' },
    { k: 'interval', l: 'Periodic Interval', d: 'Runs every X hours continuously', iconKey: 'interval' },
    { k: 'monthly', l: 'Monthly', d: 'Runs on fixed calendar day each month', iconKey: 'monthly' },
    { k: 'custom', l: 'Custom Cron', d: 'Standard 5-part cron syntax specification', iconKey: 'custom' },
    { k: 'ondemand', l: 'On Demand', d: 'Manual triggering only (no automatic sweep)', iconKey: 'ondemand' }
  ];

  return (
    <div className="job-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="job-modal-panel sched-modal-panel"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with compact metadata strip */}
        <div className="sched-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div
                className="job-modal-header-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '9px',
                  background: 'var(--vw-color-blue-50, #eff6ff)',
                  color: 'var(--vw-color-blue-600, #2563eb)',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {ICONS.clock}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 className="job-modal-title" style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    Schedule & Reschedule Job
                  </h2>
                  <span className="sched-header-badge mono">
                    {job.id}
                  </span>
                  <DomainDot domain={job.domain} />
                </div>
                <div className="sched-header-meta">
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--vw-color-slate-600)', background: 'var(--vw-color-slate-100)', padding: '2px 8px', borderRadius: '5px' }}>
                    {job.site}
                  </span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-600)', background: 'var(--vw-color-slate-100)', padding: '2px 8px', borderRadius: '5px' }}>
                    {job.scope}
                  </span>
                  <span>•</span>
                  <span>Collector: <strong style={{ fontWeight: 600, color: 'var(--vw-color-slate-700)' }}>{job.collector}</strong></span>
                  <span>•</span>
                  <span>Current Schedule: <strong className="mono" style={{ fontWeight: 600, color: 'var(--vw-color-slate-700)' }}>{job.sched}</strong></span>
                </div>
              </div>
            </div>
            <button type="button" className="job-modal-close-btn" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body: Cadence Options & Parameters */}
        <div className="sched-body">
          {/* Cadence Selection Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="job-form-label" style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--vw-color-slate-800, #1e293b)' }}>
                Frequency & Cadence <span className="job-field-required">*</span>
              </label>
              <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500, #64748b)' }}>
                Select sweep trigger mode
              </span>
            </div>

            <div className="sched-cadence-grid">
              {CADENCE_OPTIONS.map(opt => {
                const isActive = cadence === opt.k;
                return (
                  <button
                    key={opt.k}
                    type="button"
                    className={`sched-cadence-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setCadence(opt.k)}
                  >
                    <div className="sched-cadence-top">
                      <div className="sched-cadence-icon">
                        {ICONS[opt.iconKey]}
                      </div>
                      {isActive && (
                        <div className="sched-cadence-check">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="sched-cadence-title">{opt.l}</div>
                    <div className="sched-cadence-desc">{opt.d}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-Panel: Daily Cadence */}
          {cadence === 'daily' && (
            <div className="sched-config-panel">
              <div className="sched-config-title">
                <span>Daily Execution Time</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500)' }}>UTC / Node Local Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="time"
                  className="job-form-input"
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value)}
                  style={{
                    width: '130px',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '7px',
                    border: '1px solid var(--vw-color-slate-300)',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 600,
                    fontSize: '0.8125rem'
                  }}
                />
                <div className="sched-quick-chips">
                  {[
                    { label: '00:00 Midnight', val: '00:00' },
                    { label: '02:00 Maintenance', val: '02:00' },
                    { label: '04:00 Pre-dawn', val: '04:00' },
                    { label: '06:00 Morning', val: '06:00' }
                  ].map(chip => (
                    <button
                      key={chip.val}
                      type="button"
                      className={`sched-quick-chip ${timeOfDay === chip.val ? 'is-active' : ''}`}
                      onClick={() => setTimeOfDay(chip.val)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Panel: Weekly Cadence */}
          {cadence === 'weekly' && (
            <div className="sched-config-panel">
              <div className="sched-config-title">
                <span>Execution Days & Time</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    className="sched-quick-chip"
                    onClick={() => selectDayPreset('weekdays')}
                  >
                    Mon–Fri
                  </button>
                  <button
                    type="button"
                    className="sched-quick-chip"
                    onClick={() => selectDayPreset('weekends')}
                  >
                    Weekends
                  </button>
                  <button
                    type="button"
                    className="sched-quick-chip"
                    onClick={() => selectDayPreset('all')}
                  >
                    All Days
                  </button>
                </div>
              </div>

              {/* Day Pills */}
              <div className="sched-day-pills">
                {DAYS.map(day => {
                  const sel = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`sched-day-pill ${sel ? 'is-active' : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Time Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="time"
                  className="job-form-input"
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value)}
                  style={{
                    width: '130px',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '7px',
                    border: '1px solid var(--vw-color-slate-300)',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 600,
                    fontSize: '0.8125rem'
                  }}
                />
                <div className="sched-quick-chips">
                  {[
                    { label: '00:00 Midnight', val: '00:00' },
                    { label: '02:00 Maintenance', val: '02:00' },
                    { label: '06:00 Morning', val: '06:00' }
                  ].map(chip => (
                    <button
                      key={chip.val}
                      type="button"
                      className={`sched-quick-chip ${timeOfDay === chip.val ? 'is-active' : ''}`}
                      onClick={() => setTimeOfDay(chip.val)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Panel: Interval Cadence */}
          {cadence === 'interval' && (
            <div className="sched-config-panel">
              <div className="sched-config-title">
                <span>Periodic Sweep Frequency</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-blue-700, #1d4ed8)', fontWeight: 600 }}>
                  {Math.round(24 / (Number(intervalHours) || 6))} sweeps per day
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { hours: '1', label: 'Every 1 hr', sub: '24 runs/day' },
                  { hours: '2', label: 'Every 2 hrs', sub: '12 runs/day' },
                  { hours: '4', label: 'Every 4 hrs', sub: '6 runs/day' },
                  { hours: '6', label: 'Every 6 hrs', sub: '4 runs/day' },
                  { hours: '12', label: 'Every 12 hrs', sub: '2 runs/day' },
                  { hours: '24', label: 'Every 24 hrs', sub: '1 run/day' }
                ].map(item => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setIntervalHours(item.hours)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: intervalHours === item.hours ? '1.5px solid var(--vw-color-blue-300, #93c5fd)' : '1px solid var(--vw-color-slate-200)',
                      background: intervalHours === item.hours ? 'var(--vw-color-blue-50, #eff6ff)' : '#ffffff',
                      color: intervalHours === item.hours ? 'var(--vw-color-blue-700, #1d4ed8)' : 'var(--vw-color-slate-700)',
                      boxShadow: intervalHours === item.hours ? '0 1px 3px rgba(59, 130, 246, 0.1)' : 'none',
                      cursor: 'pointer',
                      fontWeight: intervalHours === item.hours ? 700 : 500,
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <span>{item.label}</span>
                    <span style={{ fontSize: '0.625rem', color: 'var(--vw-color-slate-500)' }}>{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Panel: Monthly Cadence */}
          {cadence === 'monthly' && (
            <div className="sched-config-panel">
              <div className="sched-config-title">
                <span>Monthly Calendar Day & Execution Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--vw-color-slate-600)' }}>
                    Day:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="job-form-input"
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(e.target.value)}
                    style={{
                      width: '64px',
                      height: '34px',
                      textAlign: 'center',
                      borderRadius: '7px',
                      border: '1px solid var(--vw-color-slate-300)',
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.8125rem'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-500)' }}>
                    of month
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--vw-color-slate-600)' }}>
                    Time:
                  </label>
                  <input
                    type="time"
                    className="job-form-input"
                    value={timeOfDay}
                    onChange={e => setTimeOfDay(e.target.value)}
                    style={{
                      width: '130px',
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '7px',
                      border: '1px solid var(--vw-color-slate-300)',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 600,
                      fontSize: '0.8125rem'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sub-Panel: Custom Cron (Advanced Builder) */}
          {cadence === 'custom' && (
            <div className="sched-config-panel" style={{ background: '#fafafc' }}>
              <div className="sched-config-title">
                <span>Standard Cron Expression Specification</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500)' }}>
                  5 Space-separated fields (minute, hour, dom, mon, dow)
                </span>
              </div>

              {/* Quick Pick Presets */}
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--vw-color-slate-600)', marginBottom: '5px' }}>
                  Quick Preset Templates:
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {CRON_PRESETS.map(preset => {
                    const isSelected = cronExpr.trim() === preset.expression;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`sched-quick-chip ${isSelected ? 'is-active' : ''}`}
                        onClick={() => setCronExpr(preset.expression)}
                        title={`${preset.description} (${preset.expression})`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monospace Cron Input */}
              <div className="sched-cron-input-container">
                <input
                  type="text"
                  className={`sched-cron-input ${!cronValidation.isValid ? 'is-error' : ''}`}
                  value={cronExpr}
                  onChange={e => setCronExpr(e.target.value)}
                  placeholder="0 2 * * 0"
                  spellCheck={false}
                  autoComplete="off"
                />
                {cronExpr && (
                  <button
                    type="button"
                    className="sched-cron-clear-btn"
                    onClick={() => setCronExpr('')}
                    title="Clear cron expression"
                    aria-label="Clear cron expression"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 5-Field Visual Token Cards */}
              <div className="sched-cron-slots-grid">
                {CRON_FIELD_GUIDES.map(guide => {
                  const token = cronValidation.fields ? cronValidation.fields[guide.index] : '—';
                  const isErrorField = !cronValidation.isValid && cronValidation.errorField === guide.index;
                  const isActive = cronValidation.isValid;
                  return (
                    <div
                      key={guide.index}
                      className={`sched-cron-slot-card ${isActive ? 'is-active' : ''} ${isErrorField ? 'is-error' : ''}`}
                    >
                      <div className="sched-cron-slot-header">{guide.label}</div>
                      <div className="sched-cron-slot-val" title={token}>{token}</div>
                      <div className="sched-cron-slot-range">{guide.range}</div>
                    </div>
                  );
                })}
              </div>

              {/* Error Callout if Invalid */}
              {!cronValidation.isValid && (
                <div className="sched-error-banner">
                  <span style={{ color: 'var(--vw-color-red-600)', flexShrink: 0, marginTop: '1px' }}>
                    {ICONS.alert}
                  </span>
                  <div>
                    <strong style={{ fontWeight: 700 }}>Syntax Error: </strong>
                    <span>{cronValidation.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Panel: On Demand */}
          {cadence === 'ondemand' && (
            <div className="sched-config-panel" style={{ background: '#f8fafc', borderStyle: 'dashed' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: 'var(--vw-color-blue-600, #2563eb)', flexShrink: 0 }}>
                  {ICONS.ondemand}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--vw-color-slate-800)' }}>
                    Manual Triggering Only
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-500)', marginTop: '2px', lineHeight: 1.35 }}>
                    This scan job will not be queued on any recurring background sweep. It will execute only when an operator clicks the <strong>Run Now</strong> action or an upstream orchestrator triggers its webhook.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Parameters: Scan Window & Concurrency */}
          <div className="sched-params-grid">
            <div className="sched-param-box">
              <label className="sched-param-label">
                <span>Max Execution Window</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500)', fontWeight: 500 }}>
                  Timeout guard
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="sched-custom-select"
                  value={windowHours}
                  onChange={e => setWindowHours(e.target.value)}
                >
                  <option value="2">2 hours max (Fast failover)</option>
                  <option value="4">4 hours max (Balanced — Recommended)</option>
                  <option value="8">8 hours max (Deep sweep)</option>
                  <option value="12">12 hours max (Extended window)</option>
                  <option value="24">24 hours max (Unrestricted)</option>
                </select>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                  {ICONS.chevronDown}
                </span>
              </div>
              <span className="sched-param-hint">
                In-flight probe sessions exceeding this window will be gracefully terminated.
              </span>
            </div>

            <div className="sched-param-box">
              <label className="sched-param-label">
                <span>Probe Concurrency Threads</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-500)', fontWeight: 500 }}>
                  Parallel sessions
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="sched-custom-select"
                  value={concurrency}
                  onChange={e => setConcurrency(e.target.value)}
                >
                  <option value="4">4 threads (Minimal footprint / Lab)</option>
                  <option value="8">8 threads (Conservative / Branch routers)</option>
                  <option value="16">16 threads (Balanced — Recommended)</option>
                  <option value="32">32 threads (High speed / DC fabric)</option>
                  <option value="64">64 threads (Turbo / Core optical)</option>
                </select>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                  {ICONS.chevronDown}
                </span>
              </div>
              <span className="sched-param-hint">
                Simultaneous SNMP / NETCONF connection sessions dispatched to target CIDRs.
              </span>
            </div>
          </div>
        </div>

        {/* ── DOCKED EFFECTIVE NEW SCHEDULE PREVIEW (Pinned directly above the footer!) ── */}
        <div className={`sched-docked-preview ${computed.isValid ? 'is-valid' : 'is-invalid'}`}>
          <div className="sched-docked-header">
            <div className="sched-docked-tag">
              Effective New Schedule
            </div>
            {computed.isValid ? (
              <span className="sched-status-pill is-ready">
                {ICONS.check} Ready to apply · {CADENCE_OPTIONS.find(c => c.k === cadence)?.l}
              </span>
            ) : (
              <span className="sched-status-pill is-error">
                {ICONS.alert} Invalid Expression
              </span>
            )}
          </div>

          <div className="sched-docked-title">
            <span>{computed.humanTitle}</span>
            <div style={{ fontSize: '0.71875rem', color: 'var(--vw-color-slate-600)', fontWeight: 500, background: '#ffffff', border: '1px solid #dbeafe', padding: '2.5px 8px', borderRadius: '5px' }}>
              ⏱ {windowHours}h window · ⚡ {concurrency} threads
            </div>
          </div>

          {!computed.isValid && computed.error && (
            <div style={{ fontSize: '0.75rem', color: 'var(--vw-color-red-700)', marginTop: '3px', lineHeight: 1.35 }}>
              {computed.error}
            </div>
          )}

          <div className="sched-docked-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                className="sched-preview-expr-pill"
                title="Click to copy schedule expression"
                onClick={handleCopyExpr}
                style={{ cursor: 'pointer' }}
              >
                <span>{computed.sched}</span>
                <span style={{ color: 'var(--vw-color-blue-600, #2563eb)', marginLeft: '4px' }}>
                  {copiedExpr ? '✓ Copied' : ICONS.copy}
                </span>
              </div>

              <div className="sched-preview-next-pill">
                <span>📅 Next Run:</span>
                <strong style={{ fontWeight: 600, color: 'var(--vw-color-slate-900)' }}>
                  {computed.next}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.6875rem', color: 'var(--vw-color-slate-400)' }}>
              Collector: {job.collector}
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="sched-footer">
          <div style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-500)' }}>
            {!computed.isValid ? (
              <span style={{ color: 'var(--vw-color-red-600)', fontWeight: 600 }}>
                ⚠ Fix syntax errors before saving schedule
              </span>
            ) : (
              <span>Schedule will take effect upon confirmation.</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="nst-btn nst-btn--sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sched-submit-btn"
              onClick={handleSave}
              disabled={!computed.isValid}
              title={!computed.isValid ? 'Please resolve syntax errors before saving' : 'Apply new schedule'}
            >
              <span>Save & apply schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
