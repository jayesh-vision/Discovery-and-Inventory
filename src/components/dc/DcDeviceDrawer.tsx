/* One data center device, opened from Physical resources. Inventory facts only:
   what it is, where it sits, how discovery sees it, its hardware modules and,
   for a GPU server, its GPUs and InfiniBand rails. No live readings. */
import { useState } from 'react';
import { Chip } from '../ui';
import { Drawer } from '../Drawer';
import { human } from '../dcim/common';
import { GPU_STATE, dcShort, loadModules, useLoaded, type DcDevice, type DcFacility, type DcGpuNode, type GpuHealth } from '../../data/dc';
import { RSTATE, type RecState } from '../../data/ledger';
import '../../styles/dcim.css';
import '../../styles/dc-inventory.css';

export const REC_OF_DISCOVERY: Record<DcDevice['discovery'], RecState> = { verified: 'ok', drifted: 'drift', 'not-discovered': 'none' };
const HEALTH: Record<GpuHealth, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', failed: 'error' };
const ND_REASON: Record<string, string> = { planned: 'Planned, not installed yet', 'no-collector': 'No collector in range', 'collector-unavailable': 'Collector unavailable', 'not-applicable': 'Not applicable' };
export const uRange = (d: Pick<DcDevice, 'u' | 'uSize'>) => `U${d.u}${(d.uSize ?? 1) > 1 ? `–${d.u + (d.uSize ?? 1) - 1}` : ''}`;

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      className="dcd-copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : label}
      aria-label={label}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function getDeviceRoleIcon(role: string) {
  const r = (role || '').toLowerCase();
  if (r.includes('storage') || r.includes('stg')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    );
  }
  if (r.includes('gpu')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" />
        <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
      </svg>
    );
  }
  if (r.includes('router') || r.includes('rtr')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="6" y1="12" x2="6.01" y2="12" />
        <line x1="10" y1="12" x2="10.01" y2="12" />
        <line x1="14" y1="12" x2="14.01" y2="12" />
        <line x1="18" y1="12" x2="18.01" y2="12" />
      </svg>
    );
  }
  if (r.includes('switch') || r.includes('sw')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <polyline points="15 9 18 12 15 15" />
        <polyline points="9 9 6 12 9 15" />
      </svg>
    );
  }
  if (r.includes('firewall') || r.includes('fw')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  // Compute / Server
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

export function DcDeviceDrawer({ device, fac, node, onClose, onRack, onSite }: {
  device: DcDevice | null; fac: DcFacility | null; node?: DcGpuNode; onClose: () => void; onRack: () => void; onSite: () => void;
}) {
  const modules = useLoaded(loadModules);
  const mods = device ? modules?.get(device.id) ?? [] : [];
  const [dLabel, dTone] = device ? RSTATE[REC_OF_DISCOVERY[device.discovery]] : ['', 'neutral' as const];

  return (
    <Drawer
      open={!!device}
      onClose={onClose}
      title={
        device ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="dcd-head-icon" aria-hidden="true">
              {getDeviceRoleIcon(device.role)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  {device.name}
                </span>
                <CopyButton text={device.name} label="Copy device name" />
              </div>
              <div className="dcd-head-tags">
                <span className="dcd-tag dcd-tag--role">{device.role}</span>
                <span className="dcd-tag dcd-tag--hw">{device.vendor} {device.model}</span>
                <span className="dcd-tag dcd-tag--loc">📍 {fac ? `${fac.id} · ${fac.city}` : device.dcId}</span>
              </div>
            </div>
          </div>
        ) : ''
      }
    >
      {device && (
        <div className="dcim dcd">
          {/* Status & Diagnostics */}
          <div className="dcd-status-bar">
            <span className={`dcd-status-chip dcd-status-chip--${REC_OF_DISCOVERY[device.discovery]}`}>
              <span className={`status-dot status-dot--${dTone}`} />
              {dLabel}
            </span>
            <span className="dcd-status-chip dcd-status-chip--lifecycle">
              <span className="status-dot status-dot--ok" />
              {device.lifecycle === 'Ready' ? 'Deployed' : device.lifecycle}
            </span>
            {node && <Chip tone={GPU_STATE[node.state][1]}>{GPU_STATE[node.state][0]}</Chip>}
            {node && node.health !== 'healthy' && <Chip tone={HEALTH[node.health]}>GPU health: {node.health}</Chip>}
          </div>

          {device.discovery === 'not-discovered' && (
            <div className="dcd-diag-banner">
              <div className="dcd-diag-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="dcd-diag-body">
                <div className="dcd-diag-title">Telemetry & Polling Notice</div>
                <div className="dcd-diag-desc">
                  {ND_REASON[device.ndReason ?? ''] ?? device.ndReason ?? 'Collector unavailable'} · Discovery polling is currently idle for this device.
                </div>
              </div>
            </div>
          )}

          {/* Card 1: Hardware & System */}
          <section className="dcd-panel">
            <div className="dcd-panel-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              <span>Hardware & System Identity</span>
            </div>
            <div className="dcd-panel-body">
              <div className="dcd-field-row">
                <span className="dcd-field-k">Vendor · Model</span>
                <span className="dcd-field-v"><strong>{device.vendor}</strong> {device.model}</span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Operating System</span>
                <span className="dcd-field-v"><span className="dcd-os-badge">{device.os || '—'}</span></span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Serial Number</span>
                <span className="dcd-field-v">
                  <span className="dcd-mono-badge">{device.serial}</span>
                  <CopyButton text={device.serial} label="Copy serial number" />
                </span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Network Layer</span>
                <span className="dcd-field-v"><span className="dcd-layer-badge">{human(device.layer)}</span></span>
              </div>
            </div>
          </section>

          {/* Card 2: Network & Management */}
          <section className="dcd-panel">
            <div className="dcd-panel-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Network & Management Interface</span>
            </div>
            <div className="dcd-panel-body">
              <div className="dcd-field-row">
                <span className="dcd-field-k">Management IP</span>
                <span className="dcd-field-v">
                  <span className="dcd-mono-badge dcd-mono-badge--ip">{device.ip}</span>
                  <CopyButton text={device.ip} label="Copy IP address" />
                </span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">MAC Address</span>
                <span className="dcd-field-v">
                  <span className="dcd-mono-badge">{device.mac}</span>
                  <CopyButton text={device.mac} label="Copy MAC address" />
                </span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Assigned Collector</span>
                <span className="dcd-field-v">{device.collector ?? <span className="muted">—</span>}</span>
              </div>
              {device.ndReason && (
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Not Discovered Reason</span>
                  <span className="dcd-field-v" style={{ color: '#b45309', fontWeight: 600 }}>
                    {ND_REASON[device.ndReason] ?? device.ndReason}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Data Center Placement */}
          <section className="dcd-panel">
            <div className="dcd-panel-head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Data Center & Physical Elevation</span>
            </div>
            <div className="dcd-panel-body">
              <div className="dcd-field-row">
                <span className="dcd-field-k">Facility / Site</span>
                <span className="dcd-field-v">
                  {fac ? (
                    <span><strong>{fac.id}</strong> ({fac.city}{fac.state ? `, ${fac.state}` : ''})</span>
                  ) : (
                    <strong>{device.dcId}</strong>
                  )}
                </span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Rack Enclosure</span>
                <span className="dcd-field-v">
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{dcShort(device.rackId, device.dcId)}</span>
                </span>
              </div>
              <div className="dcd-field-row">
                <span className="dcd-field-k">Rack Unit (U) Height</span>
                <span className="dcd-field-v">
                  <span className="dcd-rack-badge">{uRange(device)} · {device.uSize ?? 1}U Form Factor</span>
                </span>
              </div>
            </div>
          </section>

          {/* Drift Comparison */}
          {device.drift && device.drift.length > 0 && (
            <section className="dcd-panel">
              <div className="dcd-panel-head" style={{ color: '#b45309' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Configuration Drift Detected ({device.drift.length})</span>
              </div>
              <div className="dcd-panel-body" style={{ padding: 0 }}>
                <table className="plain" style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>On Record</th>
                      <th>Observed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {device.drift.map(d => (
                      <tr key={d.attr}>
                        <td><strong>{d.attr}</strong></td>
                        <td className="mono">{d.record}</td>
                        <td className="mono" style={{ color: '#dc2626', fontWeight: 600 }}>{d.observed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* GPU Server Telemetry */}
          {node && (
            <section className="dcd-panel">
              <div className="dcd-panel-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
                <span>GPU Accelerators & Cluster Telemetry</span>
              </div>
              <div className="dcd-panel-body">
                <div className="dcd-field-row">
                  <span className="dcd-field-k">GPU Model</span>
                  <span className="dcd-field-v"><strong>{node.model}</strong></span>
                </div>
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Cluster</span>
                  <span className="dcd-field-v">{node.clusterId.replace(`${node.dcId}-`, '').replace('POD', 'AI-POD')}</span>
                </div>
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Cooling System</span>
                  <span className="dcd-field-v">{node.cooling === 'liquid' ? 'Liquid (direct-to-chip)' : 'Air'}</span>
                </div>
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Driver / Firmware</span>
                  <span className="dcd-field-v">
                    <span className="dcd-mono-badge">{node.driver}</span> / <span className="dcd-mono-badge">{node.firmware}</span>
                  </span>
                </div>
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Rated Power</span>
                  <span className="dcd-field-v">{node.powerKw} kW</span>
                </div>
                <div className="dcd-field-row">
                  <span className="dcd-field-k">Running Job</span>
                  <span className="dcd-field-v">{node.jobId ? <span className="dcd-mono-badge">{node.jobId}</span> : 'None'}</span>
                </div>
                {node.rma && (
                  <div className="dcd-field-row">
                    <span className="dcd-field-k">RMA Notice</span>
                    <span className="dcd-field-v"><span className="dcd-mono-badge" style={{ color: '#dc2626' }}>{node.rma}</span></span>
                  </div>
                )}
                {node.note && (
                  <div className="dcd-field-row">
                    <span className="dcd-field-k">Operator Note</span>
                    <span className="dcd-field-v">{node.note}</span>
                  </div>
                )}
                <div style={{ marginTop: 12, marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.8125rem', color: '#334155' }}>
                    InfiniBand Rails · {node.ib.filter(r => r.state === 'up').length} of {node.ib.length} Up
                  </strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {node.ib.map(r => (
                      <Chip key={r.rail} tone={r.state === 'up' ? 'success' : r.state === 'flapping' ? 'warning' : 'error'}>
                        Rail {r.rail}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: '0.8125rem', color: '#334155' }}>GPUs · {node.gpus.length} Cards</strong>
                  <div className="dcd-gpus" style={{ marginTop: 6 }}>
                    {node.gpus.map(g => (
                      <div key={g.idx} className={`dcd-gpu${g.health !== 'healthy' ? ` is-${g.health}` : ''}`}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <b>GPU {g.idx}</b>
                          <Chip tone={HEALTH[g.health]}>{g.health}</Chip>
                        </div>
                        <span className="mono muted small">{g.serial}</span>
                        <span className="small">{g.memGb} GB memory · {g.tdpW} W</span>
                        <span className="small muted">ECC sbe: {g.sbe} · dbe: {g.dbe} · retired: {g.retiredPages}{g.remapPending ? ' · remap pending' : ''}</span>
                        {g.xid && <span className="small" style={{ color: 'var(--vw-color-red-600)' }}>XID {g.xid.code}: {g.xid.text}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Hardware Modules */}
          {mods.length > 0 && (
            <section className="dcd-panel">
              <div className="dcd-panel-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <span>Hardware Modules ({mods.length})</span>
              </div>
              <div className="dcd-panel-body" style={{ padding: 0 }}>
                <table className="plain" style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Module</th>
                      <th>Serial</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map(m => (
                      <tr key={m.slot}>
                        <td className="mono">{m.slot}</td>
                        <td>{m.name}</td>
                        <td className="mono">{m.serial}</td>
                        <td><Chip tone={m.state === 'OK' ? 'success' : m.state === 'Fault' ? 'error' : 'neutral'}>{m.state}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Footer Action Bar */}
          <div className="dcd-footer-actions">
            <button type="button" className="dcd-btn-primary" onClick={onRack}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="16" y2="14" />
                <line x1="8" y1="18" x2="16" y2="18" />
              </svg>
              <span>View in Rack</span>
            </button>
            <button type="button" className="dcd-btn-secondary" onClick={onSite}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v8h4"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/>
              </svg>
              <span>Site Info</span>
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
