import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import LegacyView from '../legacy/LegacyView';
import {
  DC_VIRTUAL_RESOURCES,
  VIRTUAL_SUMMARY_STATS,
  VIRTUAL_PLATFORMS,
  VIRTUAL_STATUSES,
  type VirtualResourceItem,
  type VirtualStatus
} from '../data/dcVirtualResources';
import '../styles/virtual-resources.css';
import '../styles/topology.css';

const VIRTUAL_TYPES = [
  { id: 'all', label: 'All Resource Types' },
  { id: 'Virtual Machine', label: 'Virtual Machine (VM)' },
  { id: 'K8s Pod', label: 'Kubernetes Pod / Node' },
  { id: 'Datastore', label: 'Virtual Storage & Datastore' },
  { id: 'Virtual Network', label: 'Virtual Network & Switch' }
];

/* Row action menu: exactly like CityDetails.tsx ElementRowMenu — fixed position, only View details */
function VirtualRowMenu({
  open,
  onToggle,
  onClose,
  onOpenDetails
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  onOpenDetails: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current, m = menuRef.current;
      if (!b || !m) return;
      const r = b.getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth, gap = 4;
      const below = r.bottom + gap + h <= window.innerHeight;
      m.style.top = `${below ? r.bottom + gap : Math.max(gap, r.top - gap - h)}px`;
      m.style.left = `${Math.max(gap, Math.min(r.right - w, window.innerWidth - w - gap))}px`;
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <td
      className="kb-td"
      onClick={e => e.stopPropagation()}
      style={{ width: '44px', minWidth: '44px', textAlign: 'center', position: 'relative' }}
    >
      <button
        ref={btnRef}
        type="button"
        className={`kb${open ? ' is-on' : ''}`}
        onClick={onToggle}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="kmenu kmenu--fixed"
          role="menu"
          style={{ zIndex: 9999, minWidth: '150px', padding: '4px' }}
        >
          <button
            type="button"
            className="kmenu-i"
            onClick={e => {
              e.stopPropagation();
              onClose();
              onOpenDetails();
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: '#2563eb' }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>View details</span>
          </button>
        </div>
      )}
    </td>
  );
}

function VirtualResourcesDatacenter() {
  // ── Filters & Controls State (ONLY table columns) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [selectedHost, setSelectedHost] = useState('');
  const [selectedIp, setSelectedIp] = useState('');

  // Filter Popover state (matching CityDetails.tsx column filters)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'type' | 'status' | 'platform' | 'cluster' | 'host' | 'ip'>('type');

  // ── Table State (No pagination, all data rendered with scroll) ──
  const [sortField, setSortField] = useState<keyof VirtualResourceItem>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ── Modals & Drawers ──
  const [activeDrawerItem, setActiveDrawerItem] = useState<VirtualResourceItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'hardware' | 'metrics' | 'activity'>('overview');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Column Visibility State ──
  const visibleColumns = {
    status: true,
    name: true,
    type: true,
    cluster: true,
    host: true,
    specs: true,
    ip: true,
    platform: true,
    actions: true
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3800);
  };

  // Distinct cluster options from dataset
  const clusterOptions = useMemo(() => {
    const set = new Set<string>();
    DC_VIRTUAL_RESOURCES.forEach(i => {
      if (i.cluster) set.add(i.cluster);
    });
    return Array.from(set).sort();
  }, []);

  // ── Filtered Dataset Calculation (Filtering purely by table columns) ──
  const filteredItems = useMemo(() => {
    return DC_VIRTUAL_RESOURCES.filter(item => {
      // Type filter (Column: Type)
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      // Status filter (Column: Status)
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      // Platform filter (Column: Platform)
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
        return false;
      }
      // Cluster filter (Column: Cluster / Zone)
      if (selectedCluster !== 'all' && item.cluster !== selectedCluster) {
        return false;
      }
      // Host filter (Column: Physical Host)
      if (selectedHost.trim()) {
        const qh = selectedHost.toLowerCase().trim();
        if (!item.host.toLowerCase().includes(qh)) return false;
      }
      // IP filter (Column: IP / Network)
      if (selectedIp.trim()) {
        const qip = selectedIp.toLowerCase().trim();
        if (!item.ip.toLowerCase().includes(qip) && !item.vlanOrNetwork.toLowerCase().includes(qip)) return false;
      }
      // Free text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesHost = item.host.toLowerCase().includes(q);
        const matchesCluster = item.cluster.toLowerCase().includes(q);
        const matchesIp = item.ip.toLowerCase().includes(q);
        const matchesSpecs = item.specs.display.toLowerCase().includes(q);
        const matchesPool = item.details?.storagePool?.toLowerCase().includes(q);
        if (!matchesName && !matchesHost && !matchesCluster && !matchesIp && !matchesSpecs && !matchesPool) {
          return false;
        }
      }
      return true;
    });
  }, [selectedType, selectedStatus, selectedPlatform, selectedCluster, selectedHost, selectedIp, searchQuery]);

  // ── Sorting ──
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: string | number = a[sortField] as string | number;
      let valB: string | number = b[sortField] as string | number;

      if (sortField === 'specs') {
        valA = a.specs.vcpu || a.specs.storageTb || 0;
        valB = b.specs.vcpu || b.specs.storageTb || 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSort = (field: keyof VirtualResourceItem) => {
    if (sortField === field) {
      setSortOrder(v => (v === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ── Simulated Refresh ──
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Virtual inventory re-synchronized with VMware, OpenStack & K8s fabrics.');
    }, 600);
  };

  // Draft filter states for the popover (applied on "Apply filters")
  const [draftType, setDraftType] = useState('all');
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftPlatform, setDraftPlatform] = useState('all');
  const [draftCluster, setDraftCluster] = useState('all');
  const [draftHost, setDraftHost] = useState('');
  const [draftIp, setDraftIp] = useState('');

  // Keep draft in sync when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      setDraftType(selectedType);
      setDraftStatus(selectedStatus);
      setDraftPlatform(selectedPlatform);
      setDraftCluster(selectedCluster);
      setDraftHost(selectedHost);
      setDraftIp(selectedIp);
    }
  }, [isFilterModalOpen, selectedType, selectedStatus, selectedPlatform, selectedCluster, selectedHost, selectedIp]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedType !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedPlatform !== 'all') count++;
    if (selectedCluster !== 'all') count++;
    if (selectedHost.trim() !== '') count++;
    if (selectedIp.trim() !== '') count++;
    return count;
  }, [selectedType, selectedStatus, selectedPlatform, selectedCluster, selectedHost, selectedIp]);

  // Proper status chip with live color indicator dot and high-contrast pill styling
  const renderStatusBadge = (status: VirtualStatus, label: string) => {
    switch (status) {
      case 'Running':
        return (
          <span className="vr-status-chip is-running" title={label}>
            <span className="vr-chip-dot dot-green" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="vr-status-chip is-pending" title={label}>
            <span className="vr-chip-dot dot-blue" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      case 'Warning':
      case 'Degraded':
        return (
          <span className="vr-status-chip is-warning" title={label}>
            <span className="vr-chip-dot dot-amber" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      case 'Suspended':
        return (
          <span className="vr-status-chip is-suspended" title={label}>
            <span className="vr-chip-dot dot-purple" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      case 'Stopped':
        return (
          <span className="vr-status-chip is-stopped" title={label}>
            <span className="vr-chip-dot dot-slate" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      case 'Error':
        return (
          <span className="vr-status-chip is-error" title={label}>
            <span className="vr-chip-dot dot-red" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
      default:
        return (
          <span className="vr-status-chip is-stopped" title={label}>
            <span className="vr-chip-dot dot-slate" />
            <span className="vr-status-text">{label}</span>
          </span>
        );
    }
  };

  const getPlatformColor = (platform: string) => {
    if (platform.includes('VMware')) return '#2563eb';
    if (platform.includes('OpenStack')) return '#d97706';
    if (platform.includes('Nutanix')) return '#059669';
    return '#dc2626';
  };

  // ── Reset Filters ──
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedPlatform('all');
    setSelectedCluster('all');
    setSelectedHost('');
    setSelectedIp('');
    setDraftType('all');
    setDraftStatus('all');
    setDraftPlatform('all');
    setDraftCluster('all');
    setDraftHost('');
    setDraftIp('');
  };

  return (
    <div className="vr-container" id="view">
      {/* ── 1. Top Summary Metric Cards (Interactive, Modern & Clean) ── */}
      <section className="vr-metrics-grid" aria-label="Virtual Resources Summary Metrics">
        {/* Card 1: Virtual Machines (VMs) */}
        <div
          className={`vr-metric-card vr-card-vm${selectedType === 'Virtual Machine' ? ' is-active' : ''}`}
          onClick={() => {
            const next = selectedType === 'Virtual Machine' ? 'all' : 'Virtual Machine';
            setSelectedType(next);
            setDraftType(next);
          }}
          title={selectedType === 'Virtual Machine' ? 'Click to show all resources' : 'Click to filter by Virtual Machines'}
        >
          <div className="vr-card-accent-bar" />

          <div className="vr-card-header">
            <div className="vr-card-title-group">
              <div className="vr-card-icon icon-blue">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <span className="vr-card-title">Virtual Machines (VMs)</span>
            </div>
            {selectedType === 'Virtual Machine' ? (
              <span className="vr-card-badge is-active-badge">
                <span className="vr-badge-check">✓</span> Active view
              </span>
            ) : (
              <span className="vr-card-badge">
                <span className="vr-live-pulse-dot" />
                {VIRTUAL_SUMMARY_STATS.vms.healthPct}% Healthy
              </span>
            )}
          </div>

          <div className="vr-metric-display-row">
            <div className="vr-metric-num-wrap">
              <span className="vr-metric-big-num vr-mono">{VIRTUAL_SUMMARY_STATS.vms.total.toLocaleString()}</span>
              <span className="vr-metric-unit">instances</span>
            </div>
            <div className="vr-card-sub-stat">
              {VIRTUAL_SUMMARY_STATS.vms.running} on-line · {VIRTUAL_SUMMARY_STATS.vms.stopped + VIRTUAL_SUMMARY_STATS.vms.suspended} off/idle
            </div>
          </div>

          <div className="vr-segmented-track" title={`Active: ${VIRTUAL_SUMMARY_STATS.vms.running} | Off: ${VIRTUAL_SUMMARY_STATS.vms.stopped} | Suspended: ${VIRTUAL_SUMMARY_STATS.vms.suspended} | Error: ${VIRTUAL_SUMMARY_STATS.vms.error}`}>
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.vms.running / (VIRTUAL_SUMMARY_STATS.vms.total || 1)) * 100}%`, background: '#10b981' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.vms.stopped / (VIRTUAL_SUMMARY_STATS.vms.total || 1)) * 100}%`, background: '#94a3b8' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.vms.suspended / (VIRTUAL_SUMMARY_STATS.vms.total || 1)) * 100}%`, background: '#f59e0b' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.vms.error / (VIRTUAL_SUMMARY_STATS.vms.total || 1)) * 100}%`, background: '#ef4444' }} />
          </div>

          <div className="vr-card-chips-row">
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-green" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.vms.running.toLocaleString()}</span> active
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-slate" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.vms.stopped}</span> off
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-amber" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.vms.suspended}</span> suspended
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-red" />
              <span className="vr-chip-val vr-mono" style={{ color: '#dc2626' }}>{VIRTUAL_SUMMARY_STATS.vms.error}</span> error
            </span>
          </div>

          <div className="vr-card-footer">
            <div className="vr-footer-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
              <span>
                Allocated: <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.vms.totalVcpu.toLocaleString()} vCPU</strong> · <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.vms.totalRamTb} TB RAM</strong>
              </span>
            </div>
            <span className="vr-footer-badge">vSphere / KVM</span>
          </div>
        </div>

        {/* Card 2: Container Clusters (K8s) */}
        <div
          className={`vr-metric-card vr-card-k8s${selectedType === 'K8s Pod' ? ' is-active' : ''}`}
          onClick={() => {
            const next = selectedType === 'K8s Pod' ? 'all' : 'K8s Pod';
            setSelectedType(next);
            setDraftType(next);
          }}
          title={selectedType === 'K8s Pod' ? 'Click to show all resources' : 'Click to filter by Kubernetes Pods & Nodes'}
        >
          <div className="vr-card-accent-bar" />

          <div className="vr-card-header">
            <div className="vr-card-title-group">
              <div className="vr-card-icon icon-purple">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="vr-card-title">Container Clusters (K8s)</span>
            </div>
            {selectedType === 'K8s Pod' ? (
              <span className="vr-card-badge is-active-badge">
                <span className="vr-badge-check">✓</span> Active view
              </span>
            ) : (
              <span className="vr-card-badge">
                <span className="vr-live-pulse-dot dot-purple" />
                {VIRTUAL_SUMMARY_STATS.k8s.clusters} Clusters
              </span>
            )}
          </div>

          <div className="vr-metric-display-row">
            <div className="vr-metric-num-wrap">
              <span className="vr-metric-big-num vr-mono">{VIRTUAL_SUMMARY_STATS.k8s.totalPods.toLocaleString()}</span>
              <span className="vr-metric-unit">pods & nodes</span>
            </div>
            <div className="vr-card-sub-stat">
              {VIRTUAL_SUMMARY_STATS.k8s.running} running · {VIRTUAL_SUMMARY_STATS.k8s.pending} pending
            </div>
          </div>

          <div className="vr-segmented-track" title={`Running: ${VIRTUAL_SUMMARY_STATS.k8s.running} | Pending: ${VIRTUAL_SUMMARY_STATS.k8s.pending} | CrashLoop: ${VIRTUAL_SUMMARY_STATS.k8s.crashLoop}`}>
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.k8s.running / (VIRTUAL_SUMMARY_STATS.k8s.totalPods || 1)) * 100}%`, background: '#10b981' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.k8s.pending / (VIRTUAL_SUMMARY_STATS.k8s.totalPods || 1)) * 100}%`, background: '#3b82f6' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.k8s.crashLoop / (VIRTUAL_SUMMARY_STATS.k8s.totalPods || 1)) * 100}%`, background: '#ef4444' }} />
          </div>

          <div className="vr-card-chips-row">
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-green" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.k8s.running.toLocaleString()}</span> running
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-blue" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.k8s.pending}</span> pending
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-red" />
              <span className="vr-chip-val vr-mono" style={{ color: '#dc2626' }}>{VIRTUAL_SUMMARY_STATS.k8s.crashLoop}</span> crashloop
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-slate" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.k8s.workerNodes}</span> nodes
            </span>
          </div>

          <div className="vr-card-footer">
            <div className="vr-footer-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                Fleet: <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.k8s.workerNodes} Nodes</strong> · <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.k8s.namespaces} Namespaces</strong>
              </span>
            </div>
            <span className="vr-footer-badge">OpenShift 4.14</span>
          </div>
        </div>

        {/* Card 3: Storage & Datastores */}
        <div
          className={`vr-metric-card vr-card-storage${selectedType === 'Datastore' ? ' is-active' : ''}`}
          onClick={() => {
            const next = selectedType === 'Datastore' ? 'all' : 'Datastore';
            setSelectedType(next);
            setDraftType(next);
          }}
          title={selectedType === 'Datastore' ? 'Click to show all resources' : 'Click to filter by Storage & Datastores'}
        >
          <div className="vr-card-accent-bar" />

          <div className="vr-card-header">
            <div className="vr-card-title-group">
              <div className="vr-card-icon icon-emerald">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <span className="vr-card-title">Storage & Datastores</span>
            </div>
            {selectedType === 'Datastore' ? (
              <span className="vr-card-badge is-active-badge">
                <span className="vr-badge-check">✓</span> Active view
              </span>
            ) : (
              <span className="vr-card-badge">
                <span className="vr-live-pulse-dot dot-emerald" />
                {VIRTUAL_SUMMARY_STATS.storage.usedPct}% Used
              </span>
            )}
          </div>

          <div className="vr-metric-display-row">
            <div className="vr-metric-num-wrap">
              <span className="vr-metric-big-num vr-mono">{VIRTUAL_SUMMARY_STATS.storage.datastoresCount}</span>
              <span className="vr-metric-unit">datastores</span>
            </div>
            <div className="vr-card-sub-stat">
              {VIRTUAL_SUMMARY_STATS.storage.usedTb.toLocaleString()} TB used · {(VIRTUAL_SUMMARY_STATS.storage.allocatedTb - VIRTUAL_SUMMARY_STATS.storage.usedTb).toLocaleString()} TB free
            </div>
          </div>

          <div className="vr-segmented-track" title={`Used: ${VIRTUAL_SUMMARY_STATS.storage.usedTb} TB | Allocated: ${VIRTUAL_SUMMARY_STATS.storage.allocatedTb} TB`}>
            <div className="vr-track-seg" style={{ width: `${VIRTUAL_SUMMARY_STATS.storage.usedPct}%`, background: '#059669' }} />
            <div className="vr-track-seg" style={{ width: `${100 - VIRTUAL_SUMMARY_STATS.storage.usedPct}%`, background: '#cbd5e1' }} />
          </div>

          <div className="vr-card-chips-row">
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-green" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.storage.usedTb.toLocaleString()} TB</span> used
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-slate" />
              <span className="vr-chip-val vr-mono">{(VIRTUAL_SUMMARY_STATS.storage.allocatedTb - VIRTUAL_SUMMARY_STATS.storage.usedTb).toLocaleString()} TB</span> free
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-amber" />
              <span className="vr-chip-val vr-mono" style={{ color: '#d97706' }}>{VIRTUAL_SUMMARY_STATS.storage.degradedPools}</span> degraded
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-slate" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.storage.offlinePools}</span> offline
            </span>
          </div>

          <div className="vr-card-footer">
            <div className="vr-footer-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>
                Pools: <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.storage.datastoresCount} Datastores</strong> · <strong style={{ color: '#1e293b' }}>{VIRTUAL_SUMMARY_STATS.storage.vdisksCount.toLocaleString()} vDisks</strong>
              </span>
            </div>
            <span className="vr-footer-badge">NVMe / vSAN</span>
          </div>
        </div>

        {/* Card 4: Virtual Network Entities */}
        <div
          className={`vr-metric-card vr-card-network${selectedType === 'Virtual Network' ? ' is-active' : ''}`}
          onClick={() => {
            const next = selectedType === 'Virtual Network' ? 'all' : 'Virtual Network';
            setSelectedType(next);
            setDraftType(next);
          }}
          title={selectedType === 'Virtual Network' ? 'Click to show all resources' : 'Click to filter by Virtual Networks'}
        >
          <div className="vr-card-accent-bar" />

          <div className="vr-card-header">
            <div className="vr-card-title-group">
              <div className="vr-card-icon icon-orange">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="16" y="16" width="6" height="6" rx="1" />
                  <rect x="2" y="16" width="6" height="6" rx="1" />
                  <rect x="9" y="2" width="6" height="6" rx="1" />
                  <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
                  <path d="M12 12V8" />
                </svg>
              </div>
              <span className="vr-card-title">Virtual Network Entities</span>
            </div>
            {selectedType === 'Virtual Network' ? (
              <span className="vr-card-badge is-active-badge">
                <span className="vr-badge-check">✓</span> Active view
              </span>
            ) : (
              <span className="vr-card-badge">
                <span className="vr-live-pulse-dot dot-orange" />
                {VIRTUAL_SUMMARY_STATS.network.overlaysCount} Overlays
              </span>
            )}
          </div>

          <div className="vr-metric-display-row">
            <div className="vr-metric-num-wrap">
              <span className="vr-metric-big-num vr-mono">{VIRTUAL_SUMMARY_STATS.network.vswitches}</span>
              <span className="vr-metric-unit">networks</span>
            </div>
            <div className="vr-card-sub-stat">
              {VIRTUAL_SUMMARY_STATS.network.portGroups} port groups · {VIRTUAL_SUMMARY_STATS.network.overlaysCount} overlays
            </div>
          </div>

          <div className="vr-segmented-track" title={`Ports: ${VIRTUAL_SUMMARY_STATS.network.portGroups} | Floating IPs: ${VIRTUAL_SUMMARY_STATS.network.floatingIpsUsed} | Disconnected: ${VIRTUAL_SUMMARY_STATS.network.disconnectedVnics}`}>
            <div className="vr-track-seg" style={{ width: `${((VIRTUAL_SUMMARY_STATS.network.vswitches - VIRTUAL_SUMMARY_STATS.network.disconnectedVnics) / (VIRTUAL_SUMMARY_STATS.network.vswitches || 1)) * 100}%`, background: '#ea580c' }} />
            <div className="vr-track-seg" style={{ width: `${(VIRTUAL_SUMMARY_STATS.network.disconnectedVnics / (VIRTUAL_SUMMARY_STATS.network.vswitches || 1)) * 100}%`, background: '#f59e0b' }} />
          </div>

          <div className="vr-card-chips-row">
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-orange" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.network.portGroups}</span> ports
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-blue" />
              <span className="vr-chip-val vr-mono">{VIRTUAL_SUMMARY_STATS.network.floatingIpsUsed}/{VIRTUAL_SUMMARY_STATS.network.floatingIpsTotal}</span> float IPs
            </span>
            <span className="vr-chip-item">
              <span className="vr-chip-dot dot-amber" />
              <span className="vr-chip-val vr-mono" style={{ color: '#d97706' }}>{VIRTUAL_SUMMARY_STATS.network.disconnectedVnics}</span> degraded
            </span>
          </div>

          <div className="vr-card-footer">
            <div className="vr-footer-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              <span>
                Fabric: <strong style={{ color: '#1e293b' }}>VXLAN & Geneve</strong> · <strong style={{ color: '#1e293b' }}>NSX-T & OVS</strong>
              </span>
            </div>
            <span className="vr-footer-badge">SDN Mesh</span>
          </div>
        </div>
      </section>

      {/* ── 2. Main Content Card: Matching CityDetails.tsx Canonical Pattern ── */}
      <section
        className="vw-card-section city-table-card tbl-wrap"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
        aria-label="Virtual Resources Inventory"
      >
        {/* Search & Action Toolbar (Exact CityDetails.tsx .net-table-toolbar) */}
        <div className="net-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span className="net-showing-count">
              Showing all {sortedItems.length} virtual resources{sortedItems.length !== DC_VIRTUAL_RESOURCES.length ? ` (filtered from ${DC_VIRTUAL_RESOURCES.length})` : ''}
            </span>

            {/* Search Input Box */}
            <div className="net-search-input-box">
              <span className="net-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Name, IP, host, cluster, pool..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="net-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="net-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="net-toolbar-actions">

            {/* Two-Column Filter Modal Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`net-tool-btn${activeFilterCount > 0 ? ' is-active' : ''}`}
                title="Open column filters"
                onClick={() => setIsFilterModalOpen(v => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="net-filter-badge-counter">{activeFilterCount}</span>
                )}
              </button>

              {/* Two-Column Filter Modal (ONLY table columns) */}
              {isFilterModalOpen && (
                <>
                  <div
                    className="column-filter-backdrop"
                    onClick={() => setIsFilterModalOpen(false)}
                  />
                  <div className="column-filter-popover" role="dialog" aria-label="Filters">
                    {/* Header */}
                    <div className="column-filter-header">
                      <span className="column-filter-title">Filters (By Columns)</span>
                      <button
                        type="button"
                        className="column-filter-close-btn"
                        onClick={() => setIsFilterModalOpen(false)}
                        aria-label="Close filters"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Two-Column Body */}
                    <div className="column-filter-body">
                      {/* Left Panel: Column Tabs */}
                      <div className="column-filter-tabs">
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'type' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('type')}
                        >
                          <span>Resource Type</span>
                          {draftType !== 'all' && <span className="tab-active-dot" />}
                        </button>
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'status' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('status')}
                        >
                          <span>Status</span>
                          {draftStatus !== 'all' && <span className="tab-active-dot" />}
                        </button>
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'platform' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('platform')}
                        >
                          <span>Platform</span>
                          {draftPlatform !== 'all' && <span className="tab-active-dot" />}
                        </button>
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'cluster' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('cluster')}
                        >
                          <span>Cluster / Zone</span>
                          {draftCluster !== 'all' && <span className="tab-active-dot" />}
                        </button>
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'host' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('host')}
                        >
                          <span>Physical Host</span>
                          {draftHost.trim() !== '' && <span className="tab-active-dot" />}
                        </button>
                        <button
                          type="button"
                          className={`column-filter-tab-btn${activeFilterTab === 'ip' ? ' is-active' : ''}`}
                          onClick={() => setActiveFilterTab('ip')}
                        >
                          <span>IP / Network</span>
                          {draftIp.trim() !== '' && <span className="tab-active-dot" />}
                        </button>
                      </div>

                      {/* Right Panel: Controls for Selected Column Tab */}
                      <div className="column-filter-pane">
                        {activeFilterTab === 'type' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">Resource Type (Column)</label>
                            <select
                              className="column-filter-select"
                              value={draftType}
                              onChange={e => setDraftType(e.target.value)}
                            >
                              {VIRTUAL_TYPES.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeFilterTab === 'status' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">Status (Column)</label>
                            <select
                              className="column-filter-select"
                              value={draftStatus}
                              onChange={e => setDraftStatus(e.target.value)}
                            >
                              {VIRTUAL_STATUSES.map(st => (
                                <option key={st.id} value={st.id}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeFilterTab === 'platform' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">Platform (Column)</label>
                            <select
                              className="column-filter-select"
                              value={draftPlatform}
                              onChange={e => setDraftPlatform(e.target.value)}
                            >
                              {VIRTUAL_PLATFORMS.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeFilterTab === 'cluster' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">Cluster / Zone (Column)</label>
                            <select
                              className="column-filter-select"
                              value={draftCluster}
                              onChange={e => setDraftCluster(e.target.value)}
                            >
                              <option value="all">All Clusters & Zones</option>
                              {clusterOptions.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeFilterTab === 'host' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">Physical Host (Column)</label>
                            <input
                              type="text"
                              className="column-filter-input"
                              placeholder="e.g. VA-DC-001-CPU-0001, TX-DC-005..."
                              value={draftHost}
                              onChange={e => setDraftHost(e.target.value)}
                            />
                          </div>
                        )}

                        {activeFilterTab === 'ip' && (
                          <div className="filter-field-group">
                            <label className="column-filter-field-label">IP / Network (Column)</label>
                            <input
                              type="text"
                              className="column-filter-input"
                              placeholder="e.g. 172.24, VLAN-301, VXLAN..."
                              value={draftIp}
                              onChange={e => setDraftIp(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="column-filter-footer">
                      {(draftType !== 'all' || draftStatus !== 'all' || draftPlatform !== 'all' || draftCluster !== 'all' || draftHost.trim() !== '' || draftIp.trim() !== '' || activeFilterCount > 0) && (
                        <button
                          type="button"
                          className="column-filter-reset-btn"
                          onClick={() => {
                            setDraftType('all');
                            setDraftStatus('all');
                            setDraftPlatform('all');
                            setDraftCluster('all');
                            setDraftHost('');
                            setDraftIp('');
                            setSelectedType('all');
                            setSelectedStatus('all');
                            setSelectedPlatform('all');
                            setSelectedCluster('all');
                            setSelectedHost('');
                            setSelectedIp('');
                          }}
                        >
                          Reset filters
                        </button>
                      )}
                      <button
                        type="button"
                        className="column-filter-apply-btn"
                        onClick={() => {
                          setSelectedType(draftType);
                          setSelectedStatus(draftStatus);
                          setSelectedPlatform(draftPlatform);
                          setSelectedCluster(draftCluster);
                          setSelectedHost(draftHost);
                          setSelectedIp(draftIp);
                          setIsFilterModalOpen(false);
                        }}
                      >
                        Apply filters
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Refresh Sync Button */}
            <button
              type="button"
              className="net-tool-btn"
              title="Sync & refresh inventory"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: isRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}
              >
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <div className="vr-active-filters-bar">
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500, marginRight: '2px' }}>
              Filtered by:
            </span>
            {selectedType !== 'all' && (
              <span className="vr-filter-chip">
                <span>Type: <strong>{selectedType}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('all');
                    setDraftType('all');
                  }}
                  title="Remove type filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="vr-filter-chip">
                <span>Status: <strong>{selectedStatus}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('all');
                    setDraftStatus('all');
                  }}
                  title="Remove status filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedPlatform !== 'all' && (
              <span className="vr-filter-chip">
                <span>Platform: <strong>{selectedPlatform}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform('all');
                    setDraftPlatform('all');
                  }}
                  title="Remove platform filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCluster !== 'all' && (
              <span className="vr-filter-chip">
                <span>Cluster: <strong>{selectedCluster}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCluster('all');
                    setDraftCluster('all');
                  }}
                  title="Remove cluster filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedHost.trim() !== '' && (
              <span className="vr-filter-chip">
                <span>Host: <strong>{selectedHost}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHost('');
                    setDraftHost('');
                  }}
                  title="Remove host filter"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedIp.trim() !== '' && (
              <span className="vr-filter-chip">
                <span>IP / Net: <strong>{selectedIp}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIp('');
                    setDraftIp('');
                  }}
                  title="Remove IP filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              className="vr-filter-clear-all"
              onClick={handleResetFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table Container (Scrollable table with sticky header, no pagination) */}
        <div className="net-table-container vr-table-scroll">
          <table className="net-elements-table" id="view">
            <thead>
              <tr>

                {visibleColumns.status && (
                  <th style={{ width: '135px', minWidth: '120px' }} className="is-sortable" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.name && (
                  <th style={{ width: '240px', minWidth: '220px' }} className="is-sortable" onClick={() => handleSort('name')}>
                    Entity Name / Details {sortField === 'name' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.type && (
                  <th style={{ width: '120px', minWidth: '110px' }} className="is-sortable" onClick={() => handleSort('type')}>
                    Type {sortField === 'type' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.cluster && (
                  <th style={{ width: '160px', minWidth: '150px' }} className="is-sortable" onClick={() => handleSort('cluster')}>
                    Cluster / Zone {sortField === 'cluster' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.host && (
                  <th style={{ width: '140px', minWidth: '130px' }} className="is-sortable" onClick={() => handleSort('host')}>
                    Physical Host {sortField === 'host' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.specs && (
                  <th style={{ width: '150px', minWidth: '135px' }} className="is-sortable" onClick={() => handleSort('specs')}>
                    Spec Allocation {sortField === 'specs' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.ip && (
                  <th style={{ width: '160px', minWidth: '150px' }}>IP / Network</th>
                )}

                {visibleColumns.platform && (
                  <th style={{ width: '150px', minWidth: '140px' }} className="is-sortable" onClick={() => handleSort('platform')}>
                    Platform {sortField === 'platform' && <span style={{ marginLeft: 3, fontSize: '9px', color: '#2563eb' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )}

                {visibleColumns.actions && (
                  <th style={{ width: '44px', minWidth: '44px', textAlign: 'center' }} className="kb-th"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div className="vr-empty-state">
                      <div className="vr-empty-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <div className="vr-empty-title">No virtual resources match the column filters</div>
                      <div className="vr-empty-desc">
                        Try adjusting your search query, clearing specific column filters or resetting all active filters.
                      </div>
                      <button
                        type="button"
                        className="column-filter-reset-btn"
                        onClick={handleResetFilters}
                        style={{ marginTop: 10 }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedItems.map(item => {
                  return (
                    <tr
                      key={item.id}
                      className="net-table-row is-clickable"
                      onClick={() => {
                        setActiveDrawerItem(item);
                        setDrawerTab('overview');
                      }}
                      title={`Click to view details for ${item.name}`}
                    >

                      {/* Status Badge (Matching CityDetails .net-status-badge) */}
                      {visibleColumns.status && (
                        <td>
                          {renderStatusBadge(item.status, item.statusLabel)}
                        </td>
                      )}

                      {/* Name / Primary IP Secondary (Matching CityDetails .net-name-cell) */}
                      {visibleColumns.name && (
                        <td>
                          <div className="net-name-cell">
                            <span className="net-name-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: '#94a3b8', display: 'inline-flex' }}>
                                {item.typeCode === 'VM' && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="2" width="20" height="8" rx="2" />
                                    <rect x="2" y="14" width="20" height="8" rx="2" />
                                    <line x1="6" y1="6" x2="6.01" y2="6" />
                                    <line x1="6" y1="18" x2="6.01" y2="18" />
                                  </svg>
                                )}
                                {item.typeCode === 'K8s Pod' && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                  </svg>
                                )}
                                {item.typeCode === 'Datastore' && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                  </svg>
                                )}
                                {item.typeCode === 'vSwitch' && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="16" y="16" width="6" height="6" rx="1" />
                                    <rect x="2" y="16" width="6" height="6" rx="1" />
                                    <rect x="9" y="2" width="6" height="6" rx="1" />
                                    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
                                    <path d="M12 12V8" />
                                  </svg>
                                )}
                              </span>
                              {item.name}
                            </span>
                            <span className="net-ip-secondary">
                              {item.guestOs ? `${item.guestOs} · ` : ''}{item.siteName} ({item.siteId})
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Resource Type */}
                      {visibleColumns.type && (
                        <td>
                          <span className="vr-type-pill">
                            {item.typeCode}
                          </span>
                        </td>
                      )}

                      {/* Cluster / Zone (Matching CityDetails .net-model-cell) */}
                      {visibleColumns.cluster && (
                        <td>
                          <div className="net-model-cell">
                            <span className="vr-cell-title">{item.cluster}</span>
                            <span className="vr-cell-subtitle">{item.zone}</span>
                          </div>
                        </td>
                      )}

                      {/* Physical Host */}
                      {visibleColumns.host && (
                        <td>
                          <span className="vr-cell-mono">{item.host}</span>
                        </td>
                      )}

                      {/* Spec Allocation */}
                      {visibleColumns.specs && (
                        <td>
                          <span className="vr-cell-mono">
                            {item.specs.display}
                          </span>
                        </td>
                      )}

                      {/* Primary IP / Network */}
                      {visibleColumns.ip && (
                        <td>
                          <div className="net-name-cell">
                            <span className="vr-cell-mono" style={{ color: '#334155' }}>{item.ip}</span>
                            <span className="vr-cell-subtitle">{item.vlanOrNetwork}</span>
                          </div>
                        </td>
                      )}

                      {/* Platform / Hypervisor */}
                      {visibleColumns.platform && (
                        <td>
                          <div className="net-model-cell">
                            <span className="vr-cell-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: getPlatformColor(item.platform)
                                }}
                              />
                              {item.platform}
                            </span>
                            <span className="vr-cell-subtitle">{item.env}</span>
                          </div>
                        </td>
                      )}

                      {/* Actions: Kebab menu with ONLY "View details" */}
                      {visibleColumns.actions && (
                        <VirtualRowMenu
                          open={activeMenuId === item.id}
                          onToggle={e => {
                            e.stopPropagation();
                            setActiveMenuId(prev => (prev === item.id ? null : item.id));
                          }}
                          onClose={() => setActiveMenuId(null)}
                          onOpenDetails={() => {
                            setActiveDrawerItem(item);
                            setDrawerTab('overview');
                          }}
                        />
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. Entity Details Slide-Over Drawer ── */}
      {activeDrawerItem && (
        <div className="vr-drawer-overlay" onClick={() => setActiveDrawerItem(null)}>
          <div className="vr-drawer" onClick={e => e.stopPropagation()}>
            <div className="vr-drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className={`vr-type-badge ${
                      activeDrawerItem.typeCode === 'VM'
                        ? 'vm'
                        : activeDrawerItem.typeCode === 'K8s Pod'
                        ? 'pod'
                        : activeDrawerItem.typeCode === 'Datastore'
                        ? 'ds'
                        : 'net'
                    }`}
                  >
                    {activeDrawerItem.typeCode}
                  </span>
                  <strong style={{ fontSize: 16, color: '#0f172a' }}>{activeDrawerItem.name}</strong>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  {activeDrawerItem.platform} · {activeDrawerItem.siteName} ({activeDrawerItem.siteId})
                </div>
              </div>
              <button type="button" className="vr-drawer-close" onClick={() => setActiveDrawerItem(null)} aria-label="Close drawer">
                ✕
              </button>
            </div>

            {/* Drawer Tabs */}
            <div style={{ padding: '0 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="vr-drawer-tabs" style={{ margin: 0, border: 'none' }}>
                <button
                  type="button"
                  className={`vr-drawer-tab ${drawerTab === 'overview' ? 'is-active' : ''}`}
                  onClick={() => setDrawerTab('overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`vr-drawer-tab ${drawerTab === 'hardware' ? 'is-active' : ''}`}
                  onClick={() => setDrawerTab('hardware')}
                >
                  Specs & Allocation
                </button>
                <button
                  type="button"
                  className={`vr-drawer-tab ${drawerTab === 'metrics' ? 'is-active' : ''}`}
                  onClick={() => setDrawerTab('metrics')}
                >
                  Telemetry
                </button>
                <button
                  type="button"
                  className={`vr-drawer-tab ${drawerTab === 'activity' ? 'is-active' : ''}`}
                  onClick={() => setDrawerTab('activity')}
                >
                  Audit History
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="vr-drawer-body">
              {drawerTab === 'overview' && (
                <>
                  <div className="vr-spec-grid">
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Lifecycle Status</div>
                      <div className="vr-spec-value">
                        {renderStatusBadge(activeDrawerItem.status, activeDrawerItem.statusLabel)}
                      </div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Environment</div>
                      <div className="vr-spec-value">{activeDrawerItem.env}</div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Physical Host</div>
                      <div className="vr-spec-value vr-mono" style={{ fontSize: 12 }}>
                        {activeDrawerItem.host}
                      </div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Cluster / Compute Pool</div>
                      <div className="vr-spec-value">{activeDrawerItem.cluster}</div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Primary IP Address</div>
                      <div className="vr-spec-value vr-mono">{activeDrawerItem.ip}</div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Port Group / VLAN</div>
                      <div className="vr-spec-value">{activeDrawerItem.vlanOrNetwork}</div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">System Uptime</div>
                      <div className="vr-spec-value">{activeDrawerItem.uptime || 'Unknown'}</div>
                    </div>
                    <div className="vr-spec-item">
                      <div className="vr-spec-label">Provisioned Date</div>
                      <div className="vr-spec-value">{activeDrawerItem.provisionedDate}</div>
                    </div>
                  </div>

                  {activeDrawerItem.details && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                      <strong style={{ fontSize: 12.5, color: '#0f172a' }}>Infrastructure Identity & UUID</strong>
                      <div
                        className="vr-mono"
                        style={{
                          fontSize: 11,
                          color: '#475569',
                          background: '#f8fafc',
                          padding: '6px 8px',
                          borderRadius: 4,
                          marginTop: 6,
                          wordBreak: 'break-all'
                        }}
                      >
                        {activeDrawerItem.details.uuid}
                      </div>

                      {activeDrawerItem.details.storagePool && (
                        <div style={{ marginTop: 10, fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>Underlying Storage Pool: </span>
                          <strong style={{ color: '#1e293b' }}>{activeDrawerItem.details.storagePool}</strong>
                        </div>
                      )}

                      {activeDrawerItem.details.backupPolicy && (
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>Data Protection / Backup Policy: </span>
                          <strong style={{ color: '#1e293b' }}>{activeDrawerItem.details.backupPolicy}</strong>
                        </div>
                      )}

                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Applied Metadata Tags:</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {activeDrawerItem.details.tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 500,
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '2px 8px',
                                borderRadius: 4
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'hardware' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                      Compute & Sizing Configuration
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Allocated Virtual Cores</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                          {activeDrawerItem.specs.vcpu || '—'} vCPUs
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Allocated Memory</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                          {activeDrawerItem.specs.ramGb ? `${activeDrawerItem.specs.ramGb} GB RAM` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                      Virtual Storage & Disks Attached
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      {activeDrawerItem.details?.vdisksCount || 1} Virtual Disks attached across VMware/OpenStack datastores.
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Hard Disk 1 (SCSI 0:0)</span>
                        <span className="vr-mono">Provisioned</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Policy: Thin provisioned · Bus: VMware Paravirtual SCSI
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                      Virtual Network Adapters (vNICs)
                    </div>
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Network adapter 1 (VMXNET3)</span>
                        <span style={{ color: '#059669' }}>Connected</span>
                      </div>
                      <div className="vr-mono" style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                        MAC: {activeDrawerItem.details?.macAddress || '00:50:56:xx:xx:xx'} · {activeDrawerItem.vlanOrNetwork}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'metrics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>CPU Utilization</span>
                      <strong>{activeDrawerItem.cpuUtilPct || 0}%</strong>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${activeDrawerItem.cpuUtilPct || 0}%`,
                          height: '100%',
                          background: (activeDrawerItem.cpuUtilPct || 0) > 85 ? '#ef4444' : '#2563eb'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>Memory (RAM) Commitment</span>
                      <strong>{activeDrawerItem.ramUtilPct || 0}%</strong>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${activeDrawerItem.ramUtilPct || 0}%`,
                          height: '100%',
                          background: (activeDrawerItem.ramUtilPct || 0) > 85 ? '#f59e0b' : '#059669'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                      Storage IOPS Activity
                    </div>
                    <div className="vr-mono" style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                      {(activeDrawerItem.diskIoIops || 0).toLocaleString()} IOPS
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Average latency: 0.8ms · IO block size: 8KB
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      action: 'Live Migration / vMotion',
                      desc: `Migrated dynamically to ${activeDrawerItem.host} in ${activeDrawerItem.siteName} (${activeDrawerItem.siteId})`,
                      when: '2 days ago',
                      who: 'DRS Cluster Engine'
                    },
                    {
                      action: 'Snapshot Created',
                      desc: 'Pre-maintenance automated snapshot taken (backup-snap-v8)',
                      when: '1 week ago',
                      who: 'Veeam Backup Agent'
                    },
                    {
                      action: 'Reconfiguration',
                      desc: `Memory adjusted to ${activeDrawerItem.specs.ramGb || 32} GB`,
                      when: '3 weeks ago',
                      who: 'secops-admin'
                    },
                    {
                      action: 'Virtual Entity Provisioned',
                      desc: `Provisioned from Golden Image template on ${activeDrawerItem.platform}`,
                      when: activeDrawerItem.provisionedDate,
                      who: 'Terraform Cloud / Automation'
                    }
                  ].map((act, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        borderLeft: '3px solid #2563eb',
                        background: '#f8fafc',
                        borderRadius: '0 6px 6px 0',
                        fontSize: 12
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{act.action}</div>
                      <div style={{ color: '#475569', marginTop: 2 }}>{act.desc}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        {act.who} · {act.when}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Toast Feedback Notification ── */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 2000,
            animation: 'vrFadeIn 0.15s ease'
          }}
        >
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function VirtualResources() {
  const [searchParams] = useSearchParams();
  const solParam = searchParams.get('solution')?.toLowerCase();
  const isDc = solParam === 'datacenter';

  if (!isDc) {
    return <LegacyView legacyKey="virtual" />;
  }

  return <VirtualResourcesDatacenter />;
}
