import { useEffect, useState, useMemo } from 'react';
import type { DomainKey } from '../../data/discoveryOverview';
import {
  type ScanJob,
  type JobStatus,
  COLLECTOR_OPTIONS,
  CREDENTIAL_PROFILES,
  REGIONS_LIST,
  PROTOCOL_CHOICES,
  generateNextJobId,
  estimateCidrHosts
} from '../../data/scanJobsData';
import { DOMAIN_LABEL, DOMAIN_HEX } from '../../data/discoveryOverview';

interface CreateScanJobModalProps {
  open: boolean;
  onClose: () => void;
  existingJobs: ScanJob[];
  onJobCreated: (job: ScanJob, runImmediately: boolean) => void;
}

type StepKey = 1 | 2 | 3 | 4;

export function CreateScanJobModal({
  open,
  onClose,
  existingJobs,
  onJobCreated
}: CreateScanJobModalProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>(1);

  // Form State - unpopulated for creation
  const [domain, setDomain] = useState<DomainKey | ''>('');
  const [jobId, setJobId] = useState('');
  const [jobName, setJobName] = useState('');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Target Scope - unpopulated
  const [targetType, setTargetType] = useState<'CIDR' | 'Seed' | 'Roster' | 'Cell'>('CIDR');
  const [targetInput, setTargetInput] = useState('');
  const [seedIp, setSeedIp] = useState('');
  const [hopDepth, setHopDepth] = useState(3);
  const [exclusions, setExclusions] = useState('');

  // Step 3: Collector & Protocols - single protocol selection
  const [selectedCollector, setSelectedCollector] = useState('');
  const [selectedCred, setSelectedCred] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');

  // Step 4: Schedule & Options - unpopulated
  const [scheduleType, setScheduleType] = useState<'continuous' | 'daily' | 'weekly' | 'ondemand' | ''>('');
  const [sweepHours, setSweepHours] = useState<number | ''>('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [concurrency, setConcurrency] = useState<number | ''>('');
  const [timeoutSec, setTimeoutSec] = useState<number | ''>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Reset form to blank on modal open (do not pre-populate dummy values)
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setDomain('');
      setJobId('');
      setJobName('');
      setRegion('');
      setNotes('');
      setTargetType('CIDR');
      setTargetInput('');
      setSeedIp('');
      setHopDepth(3);
      setExclusions('');
      setSelectedCollector('');
      setSelectedCred('');
      setSelectedProtocol('');
      setScheduleType('');
      setSweepHours('');
      setScheduleTime('');
      setScheduleDay('');
      setConcurrency('');
      setTimeoutSec('');
      setTestStatus('idle');
    }
  }, [open]);

  // Keyboard escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Target count calculation - 0 when empty
  const estimatedTargets = useMemo(() => {
    if (!targetInput.trim() && !seedIp.trim()) return 0;
    if (targetType === 'CIDR') {
      return estimateCidrHosts(targetInput);
    }
    if (targetType === 'Seed') {
      return seedIp.trim() ? Math.round(Math.pow(hopDepth, 2.8) * 8 + 14) : 0;
    }
    if (targetType === 'Cell') {
      return targetInput.trim() ? 420 : 0;
    }
    return targetInput.trim() ? 145 : 0;
  }, [targetType, targetInput, seedIp, hopDepth]);

  // Formulated Schedule string
  const scheduleString = useMemo(() => {
    if (scheduleType === 'continuous') return `Continuous · ${sweepHours || 6} hrs sweep`;
    if (scheduleType === 'daily') return scheduleTime ? `Daily ${scheduleTime}` : 'Daily (time pending)';
    if (scheduleType === 'weekly') return `Weekly ${scheduleDay || 'Sun'} ${scheduleTime || '02:00'}`;
    if (scheduleType === 'ondemand') return 'On demand';
    return 'Not configured';
  }, [scheduleType, sweepHours, scheduleTime, scheduleDay]);

  const handleRunReachabilityTest = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('success');
    }, 700);
  };

  const handleSubmit = (runImmediately: boolean) => {
    const effectiveDomain = (domain || 'IPMPLS') as DomainKey;
    const scopeStr = targetType === 'Seed'
      ? (seedIp.trim() ? `Seed ${seedIp} · depth ${hopDepth}` : 'Seed unconfigured')
      : (targetInput.trim() || '172.31.0.0/16');

    const siteStr = region
      ? `${region} · ${jobName.toLowerCase() || 'network sector'}`
      : (jobName.trim() || 'General sector');

    const newJob: ScanJob = {
      id: jobId.trim() || generateNextJobId(effectiveDomain, existingJobs),
      name: jobName.trim() || `${DOMAIN_LABEL[effectiveDomain]} Discovery Job`,
      domain: effectiveDomain,
      site: siteStr,
      scope: scopeStr,
      targetType,
      collector: selectedCollector || 'clr-blr-01',
      cred: selectedCred || 'ro-inband-v3',
      protocols: selectedProtocol ? [selectedProtocol] : ['SNMP v3 (authPriv)'],
      sched: scheduleType ? scheduleString : 'On demand',
      next: runImmediately ? 'sweeping now' : (scheduleType === 'daily' ? `tomorrow ${scheduleTime || '02:00'}` : scheduleType === 'continuous' ? `in ${sweepHours || 6} hrs` : 'tomorrow 02:00'),
      last: runImmediately ? 'Running right now' : '—',
      dur: '—',
      targets: estimatedTargets || 250,
      clean: runImmediately ? 0 : (estimatedTargets || 250),
      partial: 0,
      fail: 0,
      state: runImmediately ? ('Running' as JobStatus) : ('Completed' as JobStatus),
      chip: runImmediately ? 'info' : 'success',
      concurrency: typeof concurrency === 'number' && concurrency > 0 ? concurrency : 100,
      timeoutSec: typeof timeoutSec === 'number' && timeoutSec > 0 ? timeoutSec : 4,
      retries: 2,
      notes,
      recentRuns: runImmediately ? [] : [
        {
          runId: `RN-${Math.floor(1000 + Math.random() * 9000)}`,
          at: 'Just registered',
          duration: '—',
          targets: estimatedTargets || 250,
          clean: estimatedTargets || 250,
          partial: 0,
          fail: 0,
          status: 'Scheduled'
        }
      ]
    };

    onJobCreated(newJob, runImmediately);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="job-modal-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-job-title">
      <div className="job-modal-panel" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="job-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="job-modal-header-icon">⚡</div>
            <div>
              <h2 id="create-job-title" className="job-modal-title">
                Create Discovery Scan Job
                {domain ? (
                  <span className="domain-badge-active" style={{ fontSize: '0.6875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: DOMAIN_HEX[domain] }} />
                    {DOMAIN_LABEL[domain]} Domain
                  </span>
                ) : null}
              </h2>
              <div className="job-modal-sub">
                Target scope, protocols, collector node and schedule configuration
              </div>
            </div>
          </div>
          <button
            type="button"
            className="job-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="job-modal-stepper">
          {([
            { key: 1 as StepKey, title: 'Domain & Region' },
            { key: 2 as StepKey, title: 'Target Scope' },
            { key: 3 as StepKey, title: 'Collector & Probes' },
            { key: 4 as StepKey, title: 'Schedule & Policy' }
          ] as const).map(step => {
            const isActive = currentStep === step.key;
            const isComplete = currentStep > step.key;
            return (
              <button
                key={step.key}
                type="button"
                className={`job-step-tab${isActive ? ' is-active' : ''}${isComplete ? ' is-complete' : ''}`}
                onClick={() => setCurrentStep(step.key)}
              >
                <span className="job-step-num">{isComplete ? '✓' : step.key}</span>
                <span className="job-step-title">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="job-modal-body">
          {/* STEP 1: DOMAIN & IDENTITY */}
          {currentStep === 1 && (
            <>
              <div>
                <div className="job-form-section-title">
                  <span>Telecom Domain</span>
                </div>
                <div className="domain-cards-grid">
                  {([
                    { key: 'RAN', label: 'RAN Access', icon: '📶' },
                    { key: 'Core', label: '5G Core', icon: '⚡' },
                    { key: 'Transport', label: 'Transport', icon: '🌐' },
                    { key: 'IPMPLS', label: 'IP / MPLS', icon: '🔀' }
                  ] as const).map(d => (
                    <div
                      key={d.key}
                      className={`domain-select-card${domain === d.key ? ' is-selected' : ''}`}
                      onClick={() => setDomain(d.key as DomainKey)}
                    >
                      <div className="domain-select-title-group">
                        <span style={{ fontSize: '1rem' }}>{d.icon}</span>
                        <span>{d.label}</span>
                      </div>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[d.key] }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="job-section-card">
                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label">Job Code / ID</label>
                    <span className="nst-input-shell">
                      <input
                        className="nst-input mono"
                        value={jobId}
                        onChange={e => setJobId(e.target.value)}
                        placeholder="e.g. DSC-RAN-005"
                      />
                    </span>
                  </div>

                  <div className="job-field">
                    <label className="job-field-label">Operational Circle / Region</label>
                    <span className="nst-select-shell">
                      <select
                        className="nst-input"
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                      >
                        <option value="">Select Region / Circle</option>
                        {REGIONS_LIST.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="job-field">
                  <label className="job-field-label">Job Name / Description</label>
                  <span className="nst-input-shell">
                    <input
                      className="nst-input"
                      value={jobName}
                      onChange={e => setJobName(e.target.value)}
                      placeholder="e.g. South Aggregation Ring Scan"
                    />
                  </span>
                </div>

                <div className="job-field">
                  <label className="job-field-label">Operational Notes (Optional)</label>
                  <textarea
                    className="nst-input"
                    style={{ height: '60px', padding: '8px 12px', resize: 'vertical' }}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Scheduled discovery for newly commissioned sites..."
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 2: TARGET SCOPE */}
          {currentStep === 2 && (
            <>
              <div>
                <div className="job-form-section-title">
                  <span>Target Mode</span>
                </div>
                <div className="mode-toggle-group">
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'CIDR' ? ' is-active' : ''}`}
                    onClick={() => setTargetType('CIDR')}
                  >
                    <span>🌐</span>
                    <span>CIDR Subnets</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Seed' ? ' is-active' : ''}`}
                    onClick={() => setTargetType('Seed')}
                  >
                    <span>🔗</span>
                    <span>Seed IP Traversal</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Cell' ? ' is-active' : ''}`}
                    onClick={() => setTargetType('Cell')}
                  >
                    <span>📡</span>
                    <span>Cell Cluster</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Roster' ? ' is-active' : ''}`}
                    onClick={() => setTargetType('Roster')}
                  >
                    <span>⚡</span>
                    <span>NRF Registry</span>
                  </button>
                </div>
              </div>

              <div className="job-section-card">
                {targetType === 'CIDR' && (
                  <div className="job-field">
                    <label className="job-field-label">Target CIDR Subnet(s)</label>
                    <textarea
                      className="nst-input mono"
                      style={{ height: '76px', padding: '10px 12px', resize: 'vertical' }}
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. 172.31.100.0/24 · 172.31.103.255/24"
                    />
                  </div>
                )}

                {targetType === 'Seed' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">Seed Device IP / Loopback</label>
                      <span className="nst-input-shell">
                        <input
                          className="nst-input mono"
                          value={seedIp}
                          onChange={e => setSeedIp(e.target.value)}
                          placeholder="172.31.86.61"
                        />
                      </span>
                    </div>

                    <div className="job-field">
                      <label className="job-field-label">Hop Depth: {hopDepth}</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={hopDepth}
                        onChange={e => setHopDepth(Number(e.target.value))}
                        style={{ marginTop: '10px' }}
                      />
                    </div>
                  </div>
                )}

                {targetType === 'Cell' && (
                  <div className="job-field">
                    <label className="job-field-label">Cell Site / Cluster Identifier</label>
                    <span className="nst-input-shell">
                      <input
                        className="nst-input"
                        value={targetInput}
                        onChange={e => setTargetInput(e.target.value)}
                        placeholder="e.g. gNodeB/eNodeB · Central Sector Ring"
                      />
                    </span>
                  </div>
                )}

                {targetType === 'Roster' && (
                  <div className="job-field">
                    <label className="job-field-label">NRF 5GC Endpoint / Query</label>
                    <span className="nst-input-shell">
                      <input
                        className="nst-input"
                        value={targetInput}
                        onChange={e => setTargetInput(e.target.value)}
                        placeholder="e.g. AMF/UPF/SMF · NRF-registered NFs"
                      />
                    </span>
                  </div>
                )}

                <div className="job-field">
                  <label className="job-field-label">Exclusions & Blacklist IPs</label>
                  <span className="nst-input-shell">
                    <input
                      className="nst-input mono"
                      value={exclusions}
                      onChange={e => setExclusions(e.target.value)}
                      placeholder="e.g. 172.31.100.1, 172.31.100.254"
                    />
                  </span>
                </div>
              </div>

              {/* Scope Target Estimator Box */}
              <div className="scope-preview-box">
                <div className="scope-preview-stat">
                  <span className="scope-preview-num">{estimatedTargets ? estimatedTargets.toLocaleString('en-IN') : '0'}</span>
                  <span className="scope-preview-label">Estimated Scoped Endpoints</span>
                </div>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm"
                  style={{
                    background: testStatus === 'success' ? 'var(--vw-color-emerald-50)' : 'var(--vw-color-white)',
                    color: testStatus === 'success' ? 'var(--vw-color-emerald-700)' : 'var(--vw-color-slate-800)',
                    borderColor: testStatus === 'success' ? 'var(--vw-color-emerald-300)' : 'var(--vw-color-slate-200)',
                    fontWeight: 600
                  }}
                  onClick={handleRunReachabilityTest}
                  disabled={testStatus === 'testing'}
                >
                  {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? '✓ Reachable (2.8ms)' : '⚡ Test Reachability'}
                </button>
              </div>
            </>
          )}

          {/* STEP 3: COLLECTOR & PROTOCOLS */}
          {currentStep === 3 && (
            <>
              <div className="job-section-card">
                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label">Assigned Collector Node</label>
                    <span className="nst-select-shell">
                      <select
                        className="nst-input"
                        value={selectedCollector}
                        onChange={e => setSelectedCollector(e.target.value)}
                      >
                        <option value="">Select Collector Node</option>
                        {COLLECTOR_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.id} — {c.name} ({c.latency})
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>

                  <div className="job-field">
                    <label className="job-field-label">Credential Profile</label>
                    <span className="nst-select-shell">
                      <select
                        className="nst-input"
                        value={selectedCred}
                        onChange={e => setSelectedCred(e.target.value)}
                      >
                        <option value="">Select Credential Profile</option>
                        {CREDENTIAL_PROFILES.map(cr => (
                          <option key={cr.id} value={cr.id}>
                            {cr.id} — {cr.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="job-form-section-title">
                  <span>Discovery Protocol & Adapter</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-400)', fontWeight: 400 }}>
                    {selectedProtocol ? '1 selected' : 'Select one'}
                  </span>
                </div>
                <div className="proto-checklist">
                  {PROTOCOL_CHOICES.map(proto => {
                    const isSelected = selectedProtocol === proto.label;
                    return (
                      <div
                        key={proto.id}
                        className={`proto-check-item${isSelected ? ' is-checked' : ''}`}
                        onClick={() => setSelectedProtocol(proto.label)}
                      >
                        <input
                          type="radio"
                          name="discoveryProtocol"
                          checked={isSelected}
                          onChange={() => setSelectedProtocol(proto.label)}
                          style={{ accentColor: 'var(--vw-color-blue-600)' }}
                        />
                        <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--vw-color-slate-800)' }}>
                          {proto.label}
                        </span>
                        {proto.defaultPort > 0 ? (
                          <span className="proto-port-tag">Port {proto.defaultPort}</span>
                        ) : (
                          <span className="proto-port-tag">L2</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 4: SCHEDULE & POLICY */}
          {currentStep === 4 && (
            <>
              <div>
                <div className="job-form-section-title">
                  <span>Execution Cadence</span>
                </div>
                <div className="schedule-cards-grid">
                  {[
                    { type: 'daily', label: 'Daily Nightly', icon: '🌙' },
                    { type: 'continuous', label: 'Continuous Sweep', icon: '🔄' },
                    { type: 'weekly', label: 'Weekly Maintenance', icon: '📅' },
                    { type: 'ondemand', label: 'On-Demand Only', icon: '⚡' }
                  ].map(s => (
                    <div
                      key={s.type}
                      className={`schedule-select-card${scheduleType === s.type ? ' is-selected' : ''}`}
                      onClick={() => setScheduleType(s.type as any)}
                    >
                      <span style={{ fontSize: '1.05rem' }}>{s.icon}</span>
                      <span className="schedule-card-title">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="job-section-card">
                {scheduleType === 'daily' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">Scheduled Run Time</label>
                      <span className="nst-input-shell">
                        <input
                          type="time"
                          className="nst-input"
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                        />
                      </span>
                    </div>
                    <div className="job-field">
                      <label className="job-field-label">Cadence Summary</label>
                      <div className="nst-input" style={{ background: 'var(--vw-color-slate-50)', color: 'var(--vw-color-slate-700)', display: 'flex', alignItems: 'center' }}>
                        {scheduleTime ? `Daily at ${scheduleTime} IST` : 'Specify run time'}
                      </div>
                    </div>
                  </div>
                )}

                {scheduleType === 'continuous' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">Sweep Frequency</label>
                      <span className="nst-select-shell">
                        <select
                          className="nst-input"
                          value={sweepHours}
                          onChange={e => setSweepHours(e.target.value ? Number(e.target.value) : '')}
                        >
                          <option value="">Select Frequency</option>
                          <option value={2}>Every 2 Hours</option>
                          <option value={4}>Every 4 Hours</option>
                          <option value={6}>Every 6 Hours</option>
                          <option value={12}>Every 12 Hours</option>
                        </select>
                      </span>
                    </div>
                    <div className="job-field">
                      <label className="job-field-label">Cadence Summary</label>
                      <div className="nst-input" style={{ background: 'var(--vw-color-slate-50)', color: 'var(--vw-color-slate-700)', display: 'flex', alignItems: 'center' }}>
                        {sweepHours ? `Continuous sweep every ${sweepHours} hours` : 'Select frequency'}
                      </div>
                    </div>
                  </div>
                )}

                {scheduleType === 'weekly' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">Day of Week</label>
                      <span className="nst-select-shell">
                        <select
                          className="nst-input"
                          value={scheduleDay}
                          onChange={e => setScheduleDay(e.target.value)}
                        >
                          <option value="">Select Day of Week</option>
                          <option value="Sun">Sunday</option>
                          <option value="Sat">Saturday</option>
                          <option value="Fri">Friday</option>
                          <option value="Wed">Wednesday</option>
                        </select>
                      </span>
                    </div>
                    <div className="job-field">
                      <label className="job-field-label">Scheduled Time</label>
                      <span className="nst-input-shell">
                        <input
                          type="time"
                          className="nst-input"
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                        />
                      </span>
                    </div>
                  </div>
                )}

                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label">Concurrency Workers</label>
                    <span className="nst-input-shell">
                      <input
                        type="number"
                        className="nst-input"
                        value={concurrency}
                        onChange={e => setConcurrency(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 100"
                        min="10"
                        max="500"
                      />
                    </span>
                  </div>

                  <div className="job-field">
                    <label className="job-field-label">Timeout (Seconds)</label>
                    <span className="nst-input-shell">
                      <input
                        type="number"
                        className="nst-input"
                        value={timeoutSec}
                        onChange={e => setTimeoutSec(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 4"
                        min="1"
                        max="30"
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Pre-launch Configuration Review Summary */}
              <div className="job-summary-card">
                <div className="job-summary-grid">
                  <div className="job-summary-item">
                    <span className="job-summary-label">Domain</span>
                    <span className="job-summary-val">
                      {domain ? `${DOMAIN_LABEL[domain]}${region ? ` · ${region}` : ''}` : 'Not selected'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Scope</span>
                    <span className="job-summary-val">
                      {targetInput || seedIp ? `${estimatedTargets} hosts (${targetType})` : 'Not configured'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Collector</span>
                    <span className="job-summary-val">
                      {selectedCollector ? `${selectedCollector}${selectedCred ? ` · ${selectedCred}` : ''}` : 'Not assigned'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Schedule</span>
                    <span className="job-summary-val">{scheduleType ? scheduleString : 'Not scheduled'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="job-modal-footer">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="nst-btn nst-btn--sm"
                onClick={() => setCurrentStep((prev) => (prev - 1) as StepKey)}
              >
                ← Back
              </button>
            )}
          </div>

          <div className="job-modal-footer-step-indicator">
            Step {currentStep} of 4
          </div>

          <div className="job-modal-footer-right">
            <button
              type="button"
              className="nst-btn nst-btn--sm"
              onClick={onClose}
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                className="nst-btn nst-btn--sm nst-btn--primary"
                onClick={() => setCurrentStep((prev) => (prev + 1) as StepKey)}
              >
                Continue →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm"
                  style={{
                    background: 'var(--vw-color-blue-50)',
                    color: 'var(--vw-color-blue-700)',
                    borderColor: 'var(--vw-color-blue-200)',
                    fontWeight: 600
                  }}
                  onClick={() => handleSubmit(true)}
                >
                  ⚡ Create & Run Now
                </button>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm nst-btn--primary"
                  onClick={() => handleSubmit(false)}
                >
                  Save Scan Job
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
