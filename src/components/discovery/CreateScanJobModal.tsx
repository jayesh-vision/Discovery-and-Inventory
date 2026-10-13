import { useEffect, useState, useMemo, type ReactElement } from 'react';
import type { DomainKey } from '../../data/discoveryOverview';
import {
  type ScanJob,
  type JobStatus,
  COLLECTOR_OPTIONS,
  CREDENTIAL_PROFILES,
  REGIONS_LIST,
  VENDOR_OPTIONS,
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

/* Lucide-style 24px stroke icons, inlined so the modal needs no icon package. */
type IconName = 'radar' | 'ran' | 'core' | 'transport' | 'ipmpls' | 'check' | 'x' | 'chevron' | 'arrow' | 'info' | 'sparkles' | 'alert';
const ICONS: Record<IconName, ReactElement> = {
  radar: <><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" /><path d="M12 18h.01" /><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" /><circle cx="12" cy="12" r="2" /><path d="m13.41 10.59 5.66-5.66" /></>,
  ran: <><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" /><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" /><circle cx="12" cy="9" r="2" /><path d="M16.2 4.8c2 2 2.26 5.11.8 7.47" /><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1" /><path d="M9.5 18h5" /><path d="m8 22 4-11 4 11" /></>,
  core: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" /></>,
  transport: <><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></>,
  ipmpls: <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  sparkles: <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
};

const Icon = ({ name, size = 16 }: { name: IconName; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const JOB_ID_PREFIX = 'DSC-';
const NOTES_MAX = 280;

const STEPS: { key: StepKey; title: string; hint: string }[] = [
  { key: 1, title: 'Domain & Region', hint: 'Where to scan' },
  { key: 2, title: 'Target Scope', hint: 'What to scan' },
  { key: 3, title: 'Collector & Probes', hint: 'How to reach it' },
  { key: 4, title: 'Schedule & Policy', hint: 'When and limits' }
];

const DOMAIN_TILES: { key: DomainKey; label: string; hint: string; icon: IconName }[] = [
  { key: 'RAN', label: 'RAN Access', hint: 'eNodeB / gNodeB', icon: 'ran' },
  { key: 'Core', label: '5G Core', hint: 'AMF / UPF / SMF', icon: 'core' },
  { key: 'Transport', label: 'Transport', hint: 'DWDM / OTN', icon: 'transport' },
  { key: 'IPMPLS', label: 'IP / MPLS', hint: 'BGP / MPLS routers', icon: 'ipmpls' }
];

// Helper: validate IPv4 string
function isValidIpv4(ip: string): boolean {
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

// Helper: validate CIDR string
function isValidCidr(cidr: string): boolean {
  const trimmed = cidr.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) return false;
  const [ip, maskStr] = parts;
  if (!isValidIpv4(ip)) return false;
  if (!/^\d{1,2}$/.test(maskStr)) return false;
  const mask = Number(maskStr);
  return mask >= 8 && mask <= 32;
}

export function CreateScanJobModal({
  open,
  onClose,
  existingJobs,
  onJobCreated
}: CreateScanJobModalProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>(1);

  // Form State - Step 1: Domain & Identity
  const [domain, setDomain] = useState<DomainKey | ''>('');
  const [vendor, setVendor] = useState<string>('');
  const [jobId, setJobId] = useState('');
  const [jobName, setJobName] = useState('');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Target Scope
  const [targetType, setTargetType] = useState<'CIDR' | 'Seed' | 'Roster' | 'Cell'>('CIDR');
  const [targetInput, setTargetInput] = useState('');
  const [seedIp, setSeedIp] = useState('');
  const [hopDepth, setHopDepth] = useState(3);
  const [exclusions, setExclusions] = useState('');

  // Step 3: Collector & Protocols
  const [selectedCollector, setSelectedCollector] = useState('');
  const [selectedCred, setSelectedCred] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');

  // Step 4: Schedule & Options
  const [scheduleType, setScheduleType] = useState<'continuous' | 'daily' | 'weekly' | 'ondemand' | ''>('');
  const [sweepHours, setSweepHours] = useState<number | ''>('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');
  const [concurrency, setConcurrency] = useState<number | ''>('');
  const [timeoutSec, setTimeoutSec] = useState<number | ''>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Form Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form to blank on modal open
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setDomain('');
      setVendor('');
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
      setTestMessage('');
      setErrors({});
    }
  }, [open]);

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

  const idSuffix = jobId.trim().replace(/^DSC-/i, '').toUpperCase();
  const idTaken = !!idSuffix && existingJobs.some(j => j.id.toUpperCase() === `${JOB_ID_PREFIX}${idSuffix}`);

  const suggestId = () => {
    if (!domain) return;
    setJobId(generateNextJobId(domain, existingJobs).slice(JOB_ID_PREFIX.length));
    clearError('jobId');
  };

  // Helper to clear a field's error when user modifies it
  const clearError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Step 1 Validator
  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!domain) {
      errs.domain = 'Please select a Telecom Domain.';
    }
    if (!vendor.trim()) {
      errs.vendor = 'Please select an Equipment Vendor / OEM.';
    }
    if (!region) {
      errs.region = 'Please select an Operational Circle / Region.';
    }
    if (!jobName.trim()) {
      errs.jobName = 'Please enter a Job Name / Description.';
    } else if (jobName.trim().length < 3) {
      errs.jobName = 'Job Name must be at least 3 characters.';
    }
    if (idSuffix) {
      const fullId = `${JOB_ID_PREFIX}${idSuffix}`;
      if (existingJobs.some(j => j.id.toUpperCase() === fullId)) {
        errs.jobId = `${fullId} already exists — choose another.`;
      } else if (!/^[A-Za-z0-9_-]{2,30}$/.test(idSuffix)) {
        errs.jobId = 'Job Code may only contain letters, numbers, and hyphens (2–30 chars).';
      }
    }
    return errs;
  };

  // Step 2 Validator
  const validateStep2 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (targetType === 'CIDR') {
      const trimmed = targetInput.trim();
      if (!trimmed) {
        errs.targetInput = 'Target CIDR Subnet is required (e.g. 172.31.100.0/24).';
      } else {
        const subnets = trimmed.split(/[\s,·\n]+/).filter(Boolean);
        if (subnets.length === 0) {
          errs.targetInput = 'Please enter at least one valid CIDR subnet.';
        } else {
          const invalid = subnets.filter(s => !isValidCidr(s));
          if (invalid.length > 0) {
            errs.targetInput = `Invalid CIDR format: "${invalid[0]}". Must be like 172.31.100.0/24 (mask /8 to /32).`;
          }
        }
      }
    } else if (targetType === 'Seed') {
      const trimmed = seedIp.trim();
      if (!trimmed) {
        errs.seedIp = 'Seed Device IP / Loopback is required.';
      } else if (!isValidIpv4(trimmed)) {
        errs.seedIp = `Invalid IPv4 address: "${trimmed}". Use format like 172.31.86.61.`;
      }
    } else if (targetType === 'Cell') {
      const trimmed = targetInput.trim();
      if (!trimmed) {
        errs.targetInput = 'Cell Site / Cluster Identifier is required.';
      } else if (trimmed.length < 3) {
        errs.targetInput = 'Cluster Identifier must be at least 3 characters.';
      }
    } else if (targetType === 'Roster') {
      const trimmed = targetInput.trim();
      if (!trimmed) {
        errs.targetInput = 'NRF 5GC Endpoint / Query is required.';
      } else if (trimmed.length < 3) {
        errs.targetInput = 'NRF Query must be at least 3 characters.';
      }
    }

    if (exclusions.trim()) {
      const tokens = exclusions.trim().split(/[\s,·\n]+/).filter(Boolean);
      const invalid = tokens.filter(t => !isValidIpv4(t) && !isValidCidr(t));
      if (invalid.length > 0) {
        errs.exclusions = `Invalid exclusion address: "${invalid[0]}". Must be a valid IP or CIDR subnet.`;
      }
    }
    return errs;
  };

  // Step 3 Validator
  const validateStep3 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!selectedCollector) {
      errs.selectedCollector = 'Please assign a Collector Node for this scan job.';
    }
    if (!selectedCred) {
      errs.selectedCred = 'Please select a Credential Profile for authentication.';
    }
    if (!selectedProtocol) {
      errs.selectedProtocol = 'Please select a Discovery Protocol & Adapter.';
    }
    return errs;
  };

  // Step 4 Validator
  const validateStep4 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!scheduleType) {
      errs.scheduleType = 'Please select an Execution Cadence.';
    } else if (scheduleType === 'daily') {
      if (!scheduleTime) {
        errs.scheduleTime = 'Please specify daily scheduled run time (e.g. 02:00).';
      }
    } else if (scheduleType === 'continuous') {
      if (!sweepHours || Number(sweepHours) <= 0) {
        errs.sweepHours = 'Please select a sweep frequency.';
      }
    } else if (scheduleType === 'weekly') {
      if (!scheduleDay) {
        errs.scheduleDay = 'Please select the day of week.';
      }
      if (!scheduleTime) {
        errs.scheduleTime = 'Please specify weekly scheduled run time.';
      }
    }

    if (concurrency !== '' && (Number(concurrency) < 10 || Number(concurrency) > 500)) {
      errs.concurrency = 'Concurrency workers must be between 10 and 500.';
    }
    if (timeoutSec !== '' && (Number(timeoutSec) < 1 || Number(timeoutSec) > 60)) {
      errs.timeoutSec = 'Timeout must be between 1 and 60 seconds.';
    }
    return errs;
  };

  // Reachability Probe Simulator
  const handleRunReachabilityTest = () => {
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setTestStatus('testing');
    setTestMessage('Probing ICMP/SNMP socket on target scope...');
    setTimeout(() => {
      const probeTarget = targetType === 'Seed' ? seedIp.trim() : targetInput.trim().split(/[\s,·\n]+/)[0];
      setTestStatus('success');
      setTestMessage(`✓ Reachable (${probeTarget} responded in 2.8ms via ICMP/SNMP)`);
    }, 700);
  };

  // Continue to Next Step Handler
  const handleContinue = () => {
    if (currentStep === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const errs = validateStep2();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const errs = validateStep3();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setCurrentStep(4);
    }
  };

  // Stepper Header Tab Click
  const handleStepClick = (targetStep: StepKey) => {
    if (targetStep === currentStep) return;
    if (targetStep < currentStep) {
      setErrors({});
      setCurrentStep(targetStep);
      return;
    }
    // Moving forward: enforce validation of all previous steps
    if (targetStep >= 2) {
      const errs1 = validateStep1();
      if (Object.keys(errs1).length > 0) {
        setCurrentStep(1);
        setErrors(errs1);
        return;
      }
    }
    if (targetStep >= 3) {
      const errs2 = validateStep2();
      if (Object.keys(errs2).length > 0) {
        setCurrentStep(2);
        setErrors(errs2);
        return;
      }
    }
    if (targetStep >= 4) {
      const errs3 = validateStep3();
      if (Object.keys(errs3).length > 0) {
        setCurrentStep(3);
        setErrors(errs3);
        return;
      }
    }
    setErrors({});
    setCurrentStep(targetStep);
  };

  // Keyboard shortcut
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (currentStep < 4) {
          handleContinue();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  // Final Form Submit Handler
  const handleSubmit = (runImmediately: boolean) => {
    const errs1 = validateStep1();
    if (Object.keys(errs1).length > 0) {
      setCurrentStep(1);
      setErrors(errs1);
      return;
    }

    const errs2 = validateStep2();
    if (Object.keys(errs2).length > 0) {
      setCurrentStep(2);
      setErrors(errs2);
      return;
    }

    const errs3 = validateStep3();
    if (Object.keys(errs3).length > 0) {
      setCurrentStep(3);
      setErrors(errs3);
      return;
    }

    const errs4 = validateStep4();
    if (Object.keys(errs4).length > 0) {
      setCurrentStep(4);
      setErrors(errs4);
      return;
    }

    const effectiveDomain = domain as DomainKey;
    const scopeStr = targetType === 'Seed'
      ? `Seed ${seedIp.trim()} · depth ${hopDepth}`
      : targetInput.trim();

    const siteStr = `${region} · ${jobName.trim()}`;

    const newJob: ScanJob = {
      id: idSuffix ? `${JOB_ID_PREFIX}${idSuffix}` : generateNextJobId(effectiveDomain, existingJobs),
      name: jobName.trim(),
      domain: effectiveDomain,
      vendor: vendor.trim() || 'Multi-Vendor',
      site: siteStr,
      scope: scopeStr,
      targetType,
      collector: selectedCollector,
      cred: selectedCred,
      protocols: selectedProtocol ? [selectedProtocol] : ['SNMP v3 (authPriv)'],
      sched: scheduleString,
      next: runImmediately ? 'sweeping now' : (scheduleType === 'daily' ? `tomorrow ${scheduleTime || '02:00'}` : scheduleType === 'continuous' ? `in ${sweepHours || 6} hrs` : scheduleType === 'weekly' ? `${scheduleDay} ${scheduleTime}` : 'On demand'),
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
          <div className="job-modal-header-main">
            <div className="job-modal-header-icon"><Icon name="radar" size={20} /></div>
            <div>
              <h2 id="create-job-title" className="job-modal-title">
                Create Discovery Scan Job
                {domain ? (
                  <span className="domain-badge-active">
                    <span className="domain-badge-dot" style={{ background: DOMAIN_HEX[domain] }} />
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
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Stepper Timeline */}
        <nav className="job-modal-stepper" aria-label="Job setup steps">
          <ol className="job-timeline">
            {STEPS.map((step, i) => {
              const isActive = currentStep === step.key;
              const isComplete = currentStep > step.key;
              return (
                <li key={step.key} className={`job-tl-item${isActive ? ' is-active' : ''}${isComplete ? ' is-complete' : ''}`}>
                  {i > 0 && <span className="job-tl-line" aria-hidden="true" />}
                  <button
                    type="button"
                    className="job-step-tab"
                    onClick={() => handleStepClick(step.key)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Step ${step.key}: ${step.title}${isComplete ? ' (done)' : ''}`}
                  >
                    <span className="job-step-num">{isComplete ? <Icon name="check" size={13} /> : step.key}</span>
                    <span className="job-step-text">
                      <span className="job-step-title">{step.title}</span>
                      <span className="job-step-hint">{step.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Modal Body */}
        <div className="job-modal-body">
          {/* STEP 1: DOMAIN & REGION */}
          {currentStep === 1 && (
            <>
              <div>
                <div className="job-form-section-title" id="domain-group-label">
                  <span>Telecom Domain <span className="job-field-required">*</span></span>
                </div>
                <div
                  className="domain-cards-grid"
                  role="radiogroup"
                  aria-labelledby="domain-group-label"
                >
                  {DOMAIN_TILES.map(d => {
                    const selected = domain === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`domain-select-card${selected ? ' is-selected' : ''}`}
                        style={{ ['--dc' as string]: DOMAIN_HEX[d.key] }}
                        onClick={() => {
                          setDomain(d.key);
                          clearError('domain');
                        }}
                      >
                        <span className="domain-tile-top">
                          <span className="domain-tile-icon"><Icon name={d.icon} size={20} /></span>
                          <span className="domain-tile-radio" aria-hidden="true">
                            {selected && <Icon name="check" size={12} />}
                          </span>
                        </span>
                        <span className="domain-tile-title">{d.label}</span>
                        <span className="domain-tile-hint">{d.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.domain && (
                  <div className="job-field-error-msg">
                    <Icon name="alert" size={13} />
                    <span>{errors.domain}</span>
                  </div>
                )}
              </div>

              <div className="job-section-card">
                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label" htmlFor="job-id-input">
                      Job Code / ID
                      <button
                        type="button"
                        className="job-suggest-btn"
                        onClick={suggestId}
                        disabled={!domain}
                        title={domain ? 'Fill in the next free ID for this domain' : 'Pick a domain first'}
                      >
                        <Icon name="sparkles" size={12} /> Suggest
                      </button>
                    </label>
                    <span className="job-id-shell">
                      <span className="job-id-prefix">{JOB_ID_PREFIX}</span>
                      <input
                        id="job-id-input"
                        className="job-id-input"
                        value={jobId.replace(/^DSC-/i, '')}
                        onChange={e => {
                          setJobId(e.target.value.toUpperCase());
                          clearError('jobId');
                        }}
                        placeholder="RAN-005"
                        aria-describedby="job-id-help"
                        aria-invalid={!!errors.jobId || idTaken}
                        spellCheck={false}
                      />
                    </span>
                    {(errors.jobId || idTaken) && (
                      <span id="job-id-help" className="job-field-error-msg">
                        <Icon name="alert" size={13} /> {errors.jobId || `${JOB_ID_PREFIX}${idSuffix} already exists — choose another`}
                      </span>
                    )}
                  </div>

                  <div className="job-field">
                    <label className="job-field-label" htmlFor="job-region-select">
                      Operational Circle / Region <span className="job-field-required">*</span>
                    </label>
                    <span className="job-select-shell">
                      <select
                        id="job-region-select"
                        className="job-select"
                        value={region}
                        onChange={e => {
                          setRegion(e.target.value);
                          clearError('region');
                        }}
                      >
                        <option value="">Select Region / Circle</option>
                        {REGIONS_LIST.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <span className="job-select-chevron"><Icon name="chevron" size={16} /></span>
                    </span>
                    {errors.region && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.region}</span>
                    )}
                  </div>
                </div>

                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label" htmlFor="job-vendor-select">
                      Equipment Vendor / OEM <span className="job-field-required">*</span>
                    </label>
                    <span className="job-select-shell">
                      <select
                        id="job-vendor-select"
                        className="job-select"
                        value={vendor}
                        onChange={e => {
                          setVendor(e.target.value);
                          clearError('vendor');
                        }}
                      >
                        <option value="">Select Vendor / OEM</option>
                        {VENDOR_OPTIONS.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      <span className="job-select-chevron"><Icon name="chevron" size={16} /></span>
                    </span>
                    {errors.vendor && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.vendor}</span>
                    )}
                  </div>

                  <div className="job-field">
                    <label className="job-field-label" htmlFor="job-name-input">
                      Job Name / Description <span className="job-field-required">*</span>
                    </label>
                    <span className="nst-input-shell">
                      <input
                        id="job-name-input"
                        className="nst-input"
                        value={jobName}
                        onChange={e => {
                          setJobName(e.target.value);
                          clearError('jobName');
                        }}
                        placeholder="e.g. South Aggregation Ring Scan"
                      />
                    </span>
                    {errors.jobName && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.jobName}</span>
                    )}
                  </div>
                </div>

                <div className="job-field">
                  <label className="job-field-label" htmlFor="job-notes-input">
                    Operational Notes <span className="job-optional">Optional</span>
                    <span className={`job-char-count${notes.length >= NOTES_MAX ? ' is-max' : ''}`}>{notes.length} / {NOTES_MAX}</span>
                  </label>
                  <textarea
                    id="job-notes-input"
                    className="job-textarea"
                    value={notes}
                    maxLength={NOTES_MAX}
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
                    onClick={() => {
                      setTargetType('CIDR');
                      setTestStatus('idle');
                      setTestMessage('');
                      clearError('targetInput');
                      clearError('seedIp');
                    }}
                  >
                    <span>🌐</span>
                    <span>CIDR Subnets</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Seed' ? ' is-active' : ''}`}
                    onClick={() => {
                      setTargetType('Seed');
                      setTestStatus('idle');
                      setTestMessage('');
                      clearError('targetInput');
                      clearError('seedIp');
                    }}
                  >
                    <span>🔗</span>
                    <span>Seed IP Traversal</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Cell' ? ' is-active' : ''}`}
                    onClick={() => {
                      setTargetType('Cell');
                      setTestStatus('idle');
                      setTestMessage('');
                      clearError('targetInput');
                      clearError('seedIp');
                    }}
                  >
                    <span>📡</span>
                    <span>Cell Cluster</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${targetType === 'Roster' ? ' is-active' : ''}`}
                    onClick={() => {
                      setTargetType('Roster');
                      setTestStatus('idle');
                      setTestMessage('');
                      clearError('targetInput');
                      clearError('seedIp');
                    }}
                  >
                    <span>⚡</span>
                    <span>NRF Registry</span>
                  </button>
                </div>
              </div>

              <div className="job-section-card">
                {targetType === 'CIDR' && (
                  <div className="job-field">
                    <label className="job-field-label">
                      Target CIDR Subnet(s) <span className="job-field-required">*</span>
                    </label>
                    <textarea
                      className="nst-input mono"
                      style={{ height: '76px', padding: '10px 12px', resize: 'vertical' }}
                      value={targetInput}
                      onChange={e => {
                        setTargetInput(e.target.value);
                        setTestStatus('idle');
                        setTestMessage('');
                        clearError('targetInput');
                      }}
                      placeholder="e.g. 172.31.100.0/24, 172.31.103.0/24"
                    />
                    {errors.targetInput && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.targetInput}</span>
                    )}
                  </div>
                )}

                {targetType === 'Seed' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">
                        Seed Device IP / Loopback <span className="job-field-required">*</span>
                      </label>
                      <span className="nst-input-shell">
                        <input
                          className="nst-input mono"
                          value={seedIp}
                          onChange={e => {
                            setSeedIp(e.target.value);
                            setTestStatus('idle');
                            setTestMessage('');
                            clearError('seedIp');
                          }}
                          placeholder="172.31.86.61"
                        />
                      </span>
                      {errors.seedIp && (
                        <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.seedIp}</span>
                      )}
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
                    <label className="job-field-label">
                      Cell Site / Cluster Identifier <span className="job-field-required">*</span>
                    </label>
                    <span className="nst-input-shell">
                      <input
                        className="nst-input"
                        value={targetInput}
                        onChange={e => {
                          setTargetInput(e.target.value);
                          setTestStatus('idle');
                          setTestMessage('');
                          clearError('targetInput');
                        }}
                        placeholder="e.g. gNodeB/eNodeB · Central Sector Ring"
                      />
                    </span>
                    {errors.targetInput && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.targetInput}</span>
                    )}
                  </div>
                )}

                {targetType === 'Roster' && (
                  <div className="job-field">
                    <label className="job-field-label">
                      NRF 5GC Endpoint / Query <span className="job-field-required">*</span>
                    </label>
                    <span className="nst-input-shell">
                      <input
                        className="nst-input"
                        value={targetInput}
                        onChange={e => {
                          setTargetInput(e.target.value);
                          setTestStatus('idle');
                          setTestMessage('');
                          clearError('targetInput');
                        }}
                        placeholder="e.g. AMF/UPF/SMF · NRF-registered NFs"
                      />
                    </span>
                    {errors.targetInput && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.targetInput}</span>
                    )}
                  </div>
                )}

                <div className="job-field">
                  <label className="job-field-label">
                    Exclusions & Blacklist IPs <span className="job-optional">Optional</span>
                  </label>
                  <span className="nst-input-shell">
                    <input
                      className="nst-input mono"
                      value={exclusions}
                      onChange={e => {
                        setExclusions(e.target.value);
                        clearError('exclusions');
                      }}
                      placeholder="e.g. 172.31.100.1, 172.31.100.254"
                    />
                  </span>
                  {errors.exclusions && (
                    <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.exclusions}</span>
                  )}
                </div>
              </div>

              {/* Scope Target Estimator Box */}
              <div className="scope-preview-box">
                <div className="scope-preview-stat">
                  <span className="scope-preview-num">{estimatedTargets ? estimatedTargets.toLocaleString('en-IN') : '0'}</span>
                  <span className="scope-preview-label">Estimated Scoped Endpoints</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
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
                    disabled={testStatus === 'testing' || (!targetInput.trim() && !seedIp.trim())}
                    title={(!targetInput.trim() && !seedIp.trim()) ? 'Enter target IP or CIDR first' : 'Test ICMP/SNMP socket reachability'}
                  >
                    {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? '✓ Reachable (2.8ms)' : '⚡ Test Reachability'}
                  </button>
                  {testMessage && (
                    <span style={{ fontSize: '0.6875rem', color: testStatus === 'success' ? 'var(--vw-color-emerald-700)' : 'var(--vw-color-slate-500)', fontWeight: 500 }}>
                      {testMessage}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* STEP 3: COLLECTOR & PROTOCOLS */}
          {currentStep === 3 && (
            <>
              <div className="job-section-card">
                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label">
                      Assigned Collector Node <span className="job-field-required">*</span>
                    </label>
                    <span className="nst-select-shell">
                      <select
                        className="nst-input"
                        value={selectedCollector}
                        onChange={e => {
                          setSelectedCollector(e.target.value);
                          clearError('selectedCollector');
                        }}
                      >
                        <option value="">Select Collector Node</option>
                        {COLLECTOR_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.id} — {c.name} ({c.latency})
                          </option>
                        ))}
                      </select>
                    </span>
                    {errors.selectedCollector && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.selectedCollector}</span>
                    )}
                  </div>

                  <div className="job-field">
                    <label className="job-field-label">
                      Credential Profile <span className="job-field-required">*</span>
                    </label>
                    <span className="nst-select-shell">
                      <select
                        className="nst-input"
                        value={selectedCred}
                        onChange={e => {
                          setSelectedCred(e.target.value);
                          clearError('selectedCred');
                        }}
                      >
                        <option value="">Select Credential Profile</option>
                        {CREDENTIAL_PROFILES.map(cr => (
                          <option key={cr.id} value={cr.id}>
                            {cr.id} — {cr.name}
                          </option>
                        ))}
                      </select>
                    </span>
                    {errors.selectedCred && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.selectedCred}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="job-form-section-title">
                  <span>Discovery Protocol & Adapter <span className="job-field-required">*</span></span>
                  <span style={{ fontSize: '0.75rem', color: errors.selectedProtocol ? 'var(--vw-color-red-600)' : 'var(--vw-color-slate-400)', fontWeight: 400 }}>
                    {selectedProtocol ? '1 selected' : 'Select one protocol'}
                  </span>
                </div>
                <div className="proto-checklist">
                  {PROTOCOL_CHOICES.map(proto => {
                    const isSelected = selectedProtocol === proto.label;
                    return (
                      <div
                        key={proto.id}
                        className={`proto-check-item${isSelected ? ' is-checked' : ''}`}
                        onClick={() => {
                          setSelectedProtocol(proto.label);
                          clearError('selectedProtocol');
                        }}
                      >
                        <input
                          type="radio"
                          name="discoveryProtocol"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedProtocol(proto.label);
                            clearError('selectedProtocol');
                          }}
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
                {errors.selectedProtocol && (
                  <div className="job-field-error-msg">
                    <Icon name="alert" size={13} />
                    <span>{errors.selectedProtocol}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 4: SCHEDULE & POLICY */}
          {currentStep === 4 && (
            <>
              <div>
                <div className="job-form-section-title">
                  <span>Execution Cadence <span className="job-field-required">*</span></span>
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
                      onClick={() => {
                        setScheduleType(s.type as any);
                        clearError('scheduleType');
                      }}
                    >
                      <span style={{ fontSize: '1.05rem' }}>{s.icon}</span>
                      <span className="schedule-card-title">{s.label}</span>
                    </div>
                  ))}
                </div>
                {errors.scheduleType && (
                  <div className="job-field-error-msg">
                    <Icon name="alert" size={13} />
                    <span>{errors.scheduleType}</span>
                  </div>
                )}
              </div>

              <div className="job-section-card">
                {scheduleType === 'daily' && (
                  <div className="job-form-row-2">
                    <div className="job-field">
                      <label className="job-field-label">
                        Scheduled Run Time <span className="job-field-required">*</span>
                      </label>
                      <span className="nst-input-shell">
                        <input
                          type="time"
                          className="nst-input"
                          value={scheduleTime}
                          onChange={e => {
                            setScheduleTime(e.target.value);
                            clearError('scheduleTime');
                          }}
                        />
                      </span>
                      {errors.scheduleTime && (
                        <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.scheduleTime}</span>
                      )}
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
                      <label className="job-field-label">
                        Sweep Frequency <span className="job-field-required">*</span>
                      </label>
                      <span className="nst-select-shell">
                        <select
                          className="nst-input"
                          value={sweepHours}
                          onChange={e => {
                            setSweepHours(e.target.value ? Number(e.target.value) : '');
                            clearError('sweepHours');
                          }}
                        >
                          <option value="">Select Frequency</option>
                          <option value={2}>Every 2 Hours</option>
                          <option value={4}>Every 4 Hours</option>
                          <option value={6}>Every 6 Hours</option>
                          <option value={12}>Every 12 Hours</option>
                        </select>
                      </span>
                      {errors.sweepHours && (
                        <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.sweepHours}</span>
                      )}
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
                      <label className="job-field-label">
                        Day of Week <span className="job-field-required">*</span>
                      </label>
                      <span className="nst-select-shell">
                        <select
                          className="nst-input"
                          value={scheduleDay}
                          onChange={e => {
                            setScheduleDay(e.target.value);
                            clearError('scheduleDay');
                          }}
                        >
                          <option value="">Select Day of Week</option>
                          <option value="Sun">Sunday</option>
                          <option value="Sat">Saturday</option>
                          <option value="Fri">Friday</option>
                          <option value="Wed">Wednesday</option>
                        </select>
                      </span>
                      {errors.scheduleDay && (
                        <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.scheduleDay}</span>
                      )}
                    </div>
                    <div className="job-field">
                      <label className="job-field-label">
                        Scheduled Time <span className="job-field-required">*</span>
                      </label>
                      <span className="nst-input-shell">
                        <input
                          type="time"
                          className="nst-input"
                          value={scheduleTime}
                          onChange={e => {
                            setScheduleTime(e.target.value);
                            clearError('scheduleTime');
                          }}
                        />
                      </span>
                      {errors.scheduleTime && (
                        <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.scheduleTime}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="job-form-row-2">
                  <div className="job-field">
                    <label className="job-field-label">Concurrency Workers (10–500)</label>
                    <span className="nst-input-shell">
                      <input
                        type="number"
                        className="nst-input"
                        value={concurrency}
                        onChange={e => {
                          setConcurrency(e.target.value ? Number(e.target.value) : '');
                          clearError('concurrency');
                        }}
                        placeholder="100 (default)"
                        min="10"
                        max="500"
                      />
                    </span>
                    {errors.concurrency && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.concurrency}</span>
                    )}
                  </div>

                  <div className="job-field">
                    <label className="job-field-label">Timeout Seconds (1–60)</label>
                    <span className="nst-input-shell">
                      <input
                        type="number"
                        className="nst-input"
                        value={timeoutSec}
                        onChange={e => {
                          setTimeoutSec(e.target.value ? Number(e.target.value) : '');
                          clearError('timeoutSec');
                        }}
                        placeholder="4 (default)"
                        min="1"
                        max="60"
                      />
                    </span>
                    {errors.timeoutSec && (
                      <span className="job-field-error-msg"><Icon name="alert" size={13} /> {errors.timeoutSec}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pre-launch Configuration Review Summary */}
              <div className="job-summary-card">
                <div className="job-summary-grid">
                  <div className="job-summary-item">
                    <span className="job-summary-label">Domain & Vendor</span>
                    <span className="job-summary-val">
                      {domain ? `${DOMAIN_LABEL[domain]}${vendor ? ` · ${vendor}` : ''}` : 'Not selected'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Scope & Circle</span>
                    <span className="job-summary-val">
                      {targetInput || seedIp ? `${estimatedTargets.toLocaleString('en-IN')} hosts (${targetType})${region ? ` · ${region}` : ''}` : 'Not configured'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Collector & Protocol</span>
                    <span className="job-summary-val">
                      {selectedCollector ? `${selectedCollector}${selectedProtocol ? ` · ${selectedProtocol}` : ''}` : 'Not assigned'}
                    </span>
                  </div>
                  <div className="job-summary-item">
                    <span className="job-summary-label">Schedule Cadence</span>
                    <span className="job-summary-val">{scheduleType ? scheduleString : 'Not scheduled'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="job-modal-footer">
          <div className="job-modal-footer-left">
            {currentStep > 1 && (
              <button
                type="button"
                className="nst-btn nst-btn--sm"
                onClick={() => {
                  setErrors({});
                  setCurrentStep((prev) => (prev - 1) as StepKey);
                }}
              >
                ← Back
              </button>
            )}
            <div className="job-modal-footer-step-indicator">
              Step {currentStep} of 4
              <span className="job-footer-dots" aria-hidden="true">
                {STEPS.map(st => <i key={st.key} className={st.key <= currentStep ? 'is-on' : ''} />)}
              </span>
            </div>
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
                className="nst-btn nst-btn--sm nst-btn--primary job-continue-btn"
                onClick={handleContinue}
              >
                Continue <Icon name="arrow" size={14} />
                <kbd className="job-kbd" aria-hidden="true">⌘ ↵</kbd>
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
                  Create & Run Now
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
