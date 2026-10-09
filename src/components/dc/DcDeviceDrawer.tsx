/* One data center device, opened from Physical resources. Inventory facts only:
   what it is, where it sits, how discovery sees it, its hardware modules and,
   for a GPU server, its GPUs and InfiniBand rails. No live readings. */
import { Chip } from '../ui';
import { Drawer } from '../Drawer';
import { KV, human } from '../dcim/common';
import { GPU_STATE, dcShort, loadModules, useLoaded, type DcDevice, type DcFacility, type DcGpuNode, type GpuHealth } from '../../data/dc';
import { RSTATE, type RecState } from '../../data/ledger';
import '../../styles/dcim.css';

export const REC_OF_DISCOVERY: Record<DcDevice['discovery'], RecState> = { verified: 'ok', drifted: 'drift', 'not-discovered': 'none' };
const HEALTH: Record<GpuHealth, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', failed: 'error' };
const ND_REASON: Record<string, string> = { planned: 'Planned, not installed yet', 'no-collector': 'No collector in range', 'collector-unavailable': 'Collector unavailable', 'not-applicable': 'Not applicable' };
export const uRange = (d: Pick<DcDevice, 'u' | 'uSize'>) => `U${d.u}${(d.uSize ?? 1) > 1 ? `–${d.u + (d.uSize ?? 1) - 1}` : ''}`;

export function DcDeviceDrawer({ device, fac, node, onClose, onRack, onSite }: {
  device: DcDevice | null; fac: DcFacility | null; node?: DcGpuNode; onClose: () => void; onRack: () => void; onSite: () => void;
}) {
  const modules = useLoaded(loadModules);
  const mods = device ? modules?.get(device.id) ?? [] : [];
  const [dLabel, dTone] = device ? RSTATE[REC_OF_DISCOVERY[device.discovery]] : ['', 'neutral' as const];
  return (
    <Drawer open={!!device} onClose={onClose} title={device?.name ?? ''} sub={device ? `${device.role} · ${device.vendor} ${device.model} · ${fac ? `${fac.id} · ${fac.city}` : device.dcId}` : undefined}>
      {device && (
        <div className="dcim dcd">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip tone={dTone}>{dLabel}</Chip>
            <Chip tone={device.lifecycle === 'Ready' ? 'success' : 'info'}>{device.lifecycle === 'Ready' ? 'Deployed' : device.lifecycle}</Chip>
            {node && <Chip tone={GPU_STATE[node.state][1]}>{GPU_STATE[node.state][0]}</Chip>}
            {node && node.health !== 'healthy' && <Chip tone={HEALTH[node.health]}>GPU health: {node.health}</Chip>}
          </div>
          <KV items={[
            ['Vendor · model', `${device.vendor} ${device.model}`], ['Operating system', device.os], ['Serial number', <span className="mono">{device.serial}</span>],
            ['Management IP', <span className="mono">{device.ip}</span>], ['MAC address', <span className="mono">{device.mac}</span>],
            ['Rack · position', <>{dcShort(device.rackId, device.dcId)} · {uRange(device)}</>], ['Layer', human(device.layer)],
            ['Collector', device.collector ?? '—'],
            ...(device.ndReason ? [['Not discovered because', ND_REASON[device.ndReason] ?? device.ndReason] as [string, string]] : [])
          ]} />
          {device.drift && device.drift.length > 0 && (
            <section className="dcd-sec"><h4>Differs from the device</h4>
              <table className="plain"><thead><tr><th>Attribute</th><th>On record</th><th>Observed</th></tr></thead>
                <tbody>{device.drift.map(d => <tr key={d.attr}><td>{d.attr}</td><td className="mono">{d.record}</td><td className="mono">{d.observed}</td></tr>)}</tbody></table>
            </section>
          )}
          {node && (
            <section className="dcd-sec"><h4>GPU server</h4>
              <KV items={[
                ['GPU model', node.model], ['Cluster', node.clusterId.replace(`${node.dcId}-`, '').replace('POD', 'AI-POD')], ['Cooling', node.cooling === 'liquid' ? 'Liquid (direct-to-chip)' : 'Air'],
                ['Driver', <span className="mono">{node.driver}</span>], ['Firmware', <span className="mono">{node.firmware}</span>], ['Rated power', `${node.powerKw} kW`],
                ['Running job', node.jobId ? <span className="mono">{node.jobId}</span> : 'None'],
                ...(node.rma ? [['RMA', <span className="mono">{node.rma}</span>] as [string, React.ReactNode]] : []),
                ...(node.note ? [['Note', node.note] as [string, string]] : [])
              ]} />
              <h4 style={{ marginTop: 14 }}>InfiniBand rails · {node.ib.filter(r => r.state === 'up').length} of {node.ib.length} up</h4>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {node.ib.map(r => <Chip key={r.rail} tone={r.state === 'up' ? 'success' : r.state === 'flapping' ? 'warning' : 'error'}>Rail {r.rail}</Chip>)}
              </div>
              <h4 style={{ marginTop: 14 }}>GPUs · {node.gpus.length}</h4>
              <div className="dcd-gpus">
                {node.gpus.map(g => (
                  <div key={g.idx} className={`dcd-gpu${g.health !== 'healthy' ? ` is-${g.health}` : ''}`}>
                    <div className="row" style={{ justifyContent: 'space-between' }}><b>GPU {g.idx}</b><Chip tone={HEALTH[g.health]}>{g.health}</Chip></div>
                    <span className="mono muted small">{g.serial}</span>
                    <span className="small">{g.memGb} GB memory · {g.tdpW} W</span>
                    <span className="small muted">ECC single {g.sbe} · double {g.dbe} · retired pages {g.retiredPages}{g.remapPending ? ' · row remap pending' : ''}</span>
                    {g.xid && <span className="small" style={{ color: 'var(--vw-color-red-600)' }}>XID {g.xid.code}: {g.xid.text}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {mods.length > 0 && (
            <section className="dcd-sec"><h4>Hardware modules · {mods.length}</h4>
              <table className="plain"><thead><tr><th>Slot</th><th>Module</th><th>Serial</th><th>State</th></tr></thead>
                <tbody>{mods.map(m => <tr key={m.slot}><td className="mono">{m.slot}</td><td>{m.name}</td><td className="mono">{m.serial}</td><td><Chip tone={m.state === 'OK' ? 'success' : m.state === 'Fault' ? 'error' : 'neutral'}>{m.state}</Chip></td></tr>)}</tbody></table>
            </section>
          )}
          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <button className="nst-btn nst-btn--sm" onClick={onRack}>View rack</button>
            <button className="nst-btn nst-btn--sm" onClick={onSite}>Site info</button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
