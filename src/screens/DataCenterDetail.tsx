/* Inventory › Location › Data center — /inventory/datacenter/:dcId
   Resolves which records the data center view draws:
   1. a client import whose DataCenterId — or LocationId — is :dcId
      (City details' "Open data center view" passes an estate facility code);
   2. otherwise an empty state that offers the upload, pre-filled with
      :dcId as the LocationId. */
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { withSolution } from '../solution';
import { Card } from '../components/ui';
import { Empty } from '../components/dcim/common';
import { DcView } from '../components/dcim/DcView';
import { store, useClientData, useClients, useStoreVersion } from '../dcim/api';
import { findCityByFacilityCode } from '../data/geographicHierarchy';
import '../styles/dcim.css';

/** imported data centers matching an id or an estate location code */
export function useResolve(dcId: string, clientParam: string | null) {
  useStoreVersion();
  const clients = useClients();
  const hits: { clientId: string; clientName: string; dcId: string; name: string; viaLocation: boolean }[] = [];
  for (const c of clients) {
    if (clientParam && c.id !== clientParam) continue;
    for (const dc of store.data(c.id)?.entities.dataCenters ?? []) {
      if (dc.id === dcId || dc.locationId === dcId) hits.push({ clientId: c.id, clientName: c.name, dcId: dc.id, name: dc.name, viaLocation: dc.id !== dcId });
    }
  }
  return hits;
}

import { dcSum } from '../data/dc/scope';
import { Chip, StatStrip } from '../components/ui';

export default function DataCenterDetail() {
  const { dcId = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'passive' | 'issues'>('active');

  const dc = dcSum(dcId);
  const hits = useResolve(dcId, sp.get('client'));
  const one = hits.length === 1 ? hits[0] : null;
  const data = useClientData(one?.clientId);
  const estate = findCityByFacilityCode(dcId);

  if (dc) {
    const passiveCount = dc.racks + dc.feeds + dc.ups + 2 + dc.coolingUnits + dc.sensors + (dc.odf.total > 0 ? 1 : 0) + dc.cores.lit;
    const issueCount = dc.risks.critical + dc.risks.major + dc.risks.minor;
    const healthPct = dc.devices ? Math.round((dc.verified / dc.devices) * 100) : 0;

    const roleBreakdown = [
      { name: 'GPU Servers', count: dc.byRole.GPU || 0, subType: 'gpu_server' },
      { name: 'Fabric Switches', count: dc.byRole.Switch || 0, subType: 'switch' },
      { name: 'Compute Servers', count: dc.byRole.Server || 0, subType: 'server' },
      { name: 'Storage Arrays', count: dc.byRole.Storage || 0, subType: 'storage_array' },
      { name: 'Edge Routers', count: dc.byRole.Router || 0, subType: 'router' },
      { name: 'Security Firewalls', count: dc.byRole.Firewall || 0, subType: 'firewall' }
    ].filter(r => r.count > 0);

    const passiveItems = [
      { name: 'Server & Network Racks', count: dc.racks, detail: `${dc.uUsed} of ${dc.uTotal} U allocated · ${dc.aiRacks} high-density AI racks` },
      { name: 'Utility Power Feeds', count: dc.feeds, detail: `${(dc.powerKw / 1000).toFixed(1)} MW capacity · PUE ${dc.pue}` },
      { name: 'Online UPS Systems', count: dc.ups, detail: 'N+1 redundant battery topology' },
      { name: 'Precision Cooling Units', count: dc.coolingUnits, detail: `${dc.cdu} liquid CDU loops active` },
      { name: 'Environmental Sensors', count: dc.sensors, detail: 'Temperature, humidity & smoke telemetry' },
      { name: 'ODF Fibre Spans', count: dc.odf.total > 0 ? 1 : 0, detail: `${dc.cores.lit} of ${dc.cores.total} optical cores lit` }
    ];

    return (
      <div className="page dcim" style={{ padding: '24px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ii-text-heading, #111827)' }}>
                {dc.id}
              </h1>
              <Chip tone="success">{dc.tier}</Chip>
              <Chip tone="neutral">{dc.category} Facility</Chip>
            </div>
          </div>
        </div>

        <StatStrip cells={[
          { k: 'Active inventory', v: String(dc.devices), s: 'managed devices in facility', t: 'cyan' },
          { k: 'Passive inventory', v: String(passiveCount), s: 'racks, power, cooling & cabling', t: 'emerald' },
          { k: 'Open issues', v: String(issueCount), s: `${dc.risks.critical} crit · ${dc.risks.major} high · ${dc.risks.minor} low`, t: issueCount > 3 ? 'red' : 'amber' },
          { k: 'Installed racks', v: String(dc.racks), s: `${dc.aiRacks} AI density clusters`, t: 'slate' },
          { k: 'Power capacity', v: `${(dc.powerKw / 1000).toFixed(1)} MW`, s: `PUE ${dc.pue}`, t: 'purple' },
          { k: 'Telemetry health', v: `${healthPct}%`, s: `${dc.verified} verified of ${dc.devices}`, t: 'emerald' }
        ]} />

        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--ii-border, #E5E7EB)', margin: '20px 0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              borderBottom: activeTab === 'active' ? '2px solid #1C81EF' : '2px solid transparent',
              color: activeTab === 'active' ? '#1C81EF' : 'var(--ii-text-muted, #6B7280)'
            }}
          >
            Active Devices ({dc.devices})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('passive')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              borderBottom: activeTab === 'passive' ? '2px solid #1C81EF' : '2px solid transparent',
              color: activeTab === 'passive' ? '#1C81EF' : 'var(--ii-text-muted, #6B7280)'
            }}
          >
            Passive Infrastructure ({passiveCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('issues')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              borderBottom: activeTab === 'issues' ? '2px solid #1C81EF' : '2px solid transparent',
              color: activeTab === 'issues' ? '#1C81EF' : 'var(--ii-text-muted, #6B7280)'
            }}
          >
            Open Issues &amp; Defects ({issueCount})
          </button>
        </div>

        {activeTab === 'active' && (
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Active Hardware Inventory by Role</h3>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm nst-btn--filled"
                  onClick={() => nav(withSolution(`/inventory/resources/physical?type=active&dc=${encodeURIComponent(dc.id)}&from=${encodeURIComponent(`Location · ${dc.id}`)}`))}
                >
                  View All {dc.devices} in Physical Grid →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {roleBreakdown.map(r => (
                  <div
                    key={r.name}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: '1px solid var(--ii-border, #E5E7EB)',
                      background: 'var(--ii-surface, #FFFFFF)',
                      cursor: 'pointer'
                    }}
                    onClick={() => nav(withSolution(`/inventory/resources/physical?type=active&subType=${r.subType}&dc=${encodeURIComponent(dc.id)}&from=${encodeURIComponent(`Location · ${dc.id}`)}`))}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#1C81EF' }}>{r.count}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ii-text-muted, #6B7280)' }}>
                      Click to inspect {r.count} {r.name.toLowerCase()} in {dc.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'passive' && (
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passive Infrastructure &amp; Plant Assets</h3>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm nst-btn--filled"
                  onClick={() => nav(withSolution(`/inventory/resources/physical?type=passive&dc=${encodeURIComponent(dc.id)}`))}
                >
                  View Passive Roster ({passiveCount}) →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {passiveItems.map(p => (
                  <div
                    key={p.name}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      border: '1px solid var(--ii-border, #E5E7EB)',
                      background: 'var(--ii-surface, #FFFFFF)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#0F766E' }}>{p.count}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ii-text-muted, #6B7280)' }}>
                      {p.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'issues' && (
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recorded Telemetry Risks &amp; Defects ({issueCount})</h3>
                <button
                  type="button"
                  className="nst-btn nst-btn--sm nst-btn--filled"
                  onClick={() => nav(withSolution(`/inventory/issues?status=open&dc=${encodeURIComponent(dc.id)}`))}
                >
                  View in Issues Module →
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ii-border, #E5E7EB)', color: 'var(--ii-text-muted, #6B7280)' }}>
                    <th style={{ padding: '8px 12px' }}>Severity</th>
                    <th style={{ padding: '8px 12px' }}>Title</th>
                    <th style={{ padding: '8px 12px' }}>Domain</th>
                    <th style={{ padding: '8px 12px' }}>Target Facility</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: dc.risks.critical }).map((_, i) => (
                    <tr key={`crit-${i}`} style={{ borderBottom: '1px solid var(--ii-border, #F3F4F6)' }}>
                      <td style={{ padding: '10px 12px' }}><Chip tone="error">Critical</Chip></td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>SXM GPU Module PCIe Eye-Height Degradation</td>
                      <td style={{ padding: '10px 12px' }}>Compute / Hardware</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{dc.id}</td>
                      <td style={{ padding: '10px 12px' }}><Chip tone="warning">Remediation in progress</Chip></td>
                    </tr>
                  ))}
                  {Array.from({ length: dc.risks.major }).map((_, i) => (
                    <tr key={`maj-${i}`} style={{ borderBottom: '1px solid var(--ii-border, #F3F4F6)' }}>
                      <td style={{ padding: '10px 12px' }}><Chip tone="warning">High</Chip></td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>InfiniBand Rail Flapping / CRC Error Threshold</td>
                      <td style={{ padding: '10px 12px' }}>Fabric Connectivity</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{dc.id}</td>
                      <td style={{ padding: '10px 12px' }}><Chip tone="warning">Under Investigation</Chip></td>
                    </tr>
                  ))}
                  {Array.from({ length: dc.risks.minor }).map((_, i) => (
                    <tr key={`min-${i}`} style={{ borderBottom: '1px solid var(--ii-border, #F3F4F6)' }}>
                      <td style={{ padding: '10px 12px' }}><Chip tone="neutral">Low</Chip></td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>PDU Out-of-Band SNMP Timeout Warning</td>
                      <td style={{ padding: '10px 12px' }}>Passive Power</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{dc.id}</td>
                      <td style={{ padding: '10px 12px' }}><Chip tone="neutral">Queued</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (one && data) {
    if (one.viaLocation) {
      const n = new URLSearchParams(sp); n.set('client', one.clientId);
      setTimeout(() => nav(withSolution(`/inventory/datacenter/${encodeURIComponent(one.dcId)}?${n}`), { replace: true }), 0);
    }
    return (
      <div className="page dcim">
        <DcView data={data} dcId={one.dcId} source={{ clientId: one.clientId, clientName: one.clientName }} />
      </div>
    );
  }
  return (
    <div className="page dcim">
      <Card>
        {hits.length > 1 ? (
          <>
            <Empty title={`${dcId} is imported for ${hits.length} clients`}>Choose whose inventory to open.</Empty>
            <div className="pick" style={{ maxWidth: 520, margin: '0 auto' }}>
              {hits.map(h => <button key={`${h.clientId}/${h.dcId}`} type="button" onClick={() => { const n = new URLSearchParams(sp); n.set('client', h.clientId); setSp(n); }}>
                <span>{h.name}<span className="sub"> · {h.dcId}</span></span><span className="sub">{h.clientName}</span></button>)}
            </div>
          </>
        ) : (
          <Empty title={`No physical inventory imported for ${dcId}`}
            actions={<>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => {
                const fromVal = sp.get('from') || (estate ? 'Location · City details' : 'Location · Data centers');
                nav(withSolution(`/inventory/dcim/import?location=${encodeURIComponent(dcId)}${sp.get('client') ? `&client=${encodeURIComponent(sp.get('client')!)}` : ''}&from=${encodeURIComponent(fromVal)}`));
              }}>Upload inventory</button>
              {(sp.get('location') || estate) && (
                <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(withSolution(`/inventory/location/site/${encodeURIComponent(sp.get('location') || dcId)}/infrastructure`))}>
                  Back to site infrastructure
                </button>
              )}
              {estate && (
                <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(withSolution(`/inventory/location/city/${estate.city.id}?facility=${estate.facilityType}&facilityId=${encodeURIComponent(dcId)}`))}>
                  Back to {estate.city.name}
                </button>
              )}
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(withSolution(sp.get('client') ? `/inventory/dcim?client=${encodeURIComponent(sp.get('client')!)}` : '/inventory/dcim'))}>All data centers</button>
            </>}>
            {estate ? `${dcId} is an estate facility in ${estate.city.name}, ${estate.state.name}. ` : ''}
            Its buildings, floors, rooms, racks and equipment appear here once a client imports them (put {dcId} in the DataCenters sheet's LocationId column).
          </Empty>
        )}
      </Card>
    </div>
  );
}
