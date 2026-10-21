/* Inventory › Data centers — the landing page for uploaded infrastructure
   inventory: pick a client, see its data centers, upload more. Every number
   here is counted from the client's uploaded records. */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { withSolution } from '../solution';
import { Card, Chip, Mono, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Empty } from '../components/dcim/common';
import { deleteClient, deleteDataCenter, downloadSample, downloadTemplate, importHistory, saveClient, updateDataCenter, useClientData, useClients, store } from '../dcim/api';
import { counts, dcScope } from '../dcim/derive';
import type { Client, DataCenter, OperStatus } from '../dcim/model';
import '../styles/dcim.css';

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function DataCenters() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const clients = useClients();
  const clientId = sp.get('client') && clients.some(c => c.id === sp.get('client')) ? sp.get('client')! : clients[0]?.id ?? null;
  const currentClient = clients.find(c => c.id === clientId) ?? null;
  const data = useClientData(clientId);
  const [newId, setNewId] = useState(''); const [newName, setNewName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [editingDc, setEditingDc] = useState<DataCenter | null>(null);
  const [deletingDc, setDeletingDc] = useState<{ dc: DataCenter; c: ReturnType<typeof counts> } | null>(null);
  const [editDcForm, setEditDcForm] = useState<{
    name: string;
    locationId: string;
    city: string;
    address: string;
    tier: 'I' | 'II' | 'III' | 'IV' | '';
    status: OperStatus;
  }>({
    name: '',
    locationId: '',
    city: '',
    address: '',
    tier: '',
    status: 'ACTIVE',
  });

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [editClientForm, setEditClientForm] = useState({ name: '', industry: '' });

  const pick = (id: string) => { const n = new URLSearchParams(sp); n.set('client', id); setSp(n, { replace: true }); };
  const rows = useMemo(() => (data?.entities.dataCenters ?? []).map(dc => ({ dc, c: counts(dcScope(data!.entities, dc.id)!) })), [data]);
  const total = rows.reduce((a, r) => ({
    buildings: a.buildings + r.c.buildings, rooms: a.rooms + r.c.rooms, racks: a.racks + r.c.racks, devices: a.devices + r.c.devices,
    uTotal: a.uTotal + r.c.uTotal, uUsed: a.uUsed + r.c.uUsed, physical: a.physical + r.c.physical, pdus: a.pdus + r.c.pdus, sensors: a.sensors + r.c.sensors
  }), { buildings: 0, rooms: 0, racks: 0, devices: 0, uTotal: 0, uUsed: 0, physical: 0, pdus: 0, sensors: 0 });
  const history = clientId ? importHistory(clientId) : [];

  const create = async () => {
    setErr(null);
    try { const c = await saveClient({ id: newId, name: newName }); setNewId(''); setNewName(''); pick(c.id); }
    catch (e) { setErr((e as Error).message); }
  };

  const startEditDc = (dc: DataCenter) => {
    setEditingDc(dc);
    setEditDcForm({
      name: dc.name,
      locationId: dc.locationId || '',
      city: dc.city || '',
      address: dc.address || '',
      tier: dc.tier || '',
      status: dc.status || 'ACTIVE',
    });
  };

  const handleSaveEditDc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDc || !clientId) return;
    try {
      await updateDataCenter(clientId, {
        ...editingDc,
        name: editDcForm.name.trim() || editingDc.name,
        locationId: editDcForm.locationId.trim() || undefined,
        city: editDcForm.city.trim() || undefined,
        address: editDcForm.address.trim() || undefined,
        tier: (editDcForm.tier as any) || undefined,
        status: editDcForm.status,
      });
      setEditingDc(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const handleConfirmDeleteDc = async () => {
    if (!deletingDc || !clientId) return;
    try {
      await deleteDataCenter(clientId, deletingDc.dc.id);
      setDeletingDc(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await saveClient({
        id: editingClient.id,
        name: editClientForm.name.trim() || editingClient.name,
        industry: editClientForm.industry.trim() || undefined,
      });
      setEditingClient(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      await deleteClient(deletingClient.id);
      if (clientId === deletingClient.id) {
        const remaining = clients.filter(c => c.id !== deletingClient.id);
        pick(remaining[0]?.id || '');
      }
      setDeletingClient(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const dl = async (k: 'template' | 'sample') => {
    setBusy(k);
    try { await (k === 'template' ? downloadTemplate() : downloadSample()); } catch (e) { setErr(`Could not build the workbook: ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const toImport = () => nav(withSolution(`/inventory/dcim/import?${clientId ? `client=${encodeURIComponent(clientId)}&` : ''}from=${encodeURIComponent('Location · Data centers')}`));
  const open = (dc: DataCenter) => nav(withSolution(`/inventory/datacenter/${encodeURIComponent(dc.id)}?client=${encodeURIComponent(dc.clientId)}&from=${encodeURIComponent('Location · Data centers')}`));

  return (
    <div className="page dcim">
      <Card>
        <div className="toolbar">
          <div className="field">
            <label className="nst-input-label" htmlFor="dcim-client">Client</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="nst-select-shell">
                <select id="dcim-client" className="nst-input" value={clientId ?? ''} onChange={e => pick(e.target.value)} disabled={!clients.length}>
                  {!clients.length && <option value="">No clients yet</option>}
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                </select>
              </span>
              {currentClient && (
                <div className="client-card-actions">
                  <button
                    type="button"
                    className="client-card-action-btn"
                    title={`Edit ${currentClient.name}`}
                    aria-label={`Edit ${currentClient.name}`}
                    onClick={() => {
                      setEditingClient(currentClient);
                      setEditClientForm({ name: currentClient.name, industry: currentClient.industry || '' });
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="client-card-action-btn client-card-action-btn--danger"
                    title={`Delete ${currentClient.name}`}
                    aria-label={`Delete ${currentClient.name}`}
                    onClick={() => setDeletingClient(currentClient)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <span className="grow" />
          <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => dl('template')} disabled={!!busy}>{busy === 'template' ? 'Building…' : 'Download template'}</button>
          <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => dl('sample')} disabled={!!busy}>{busy === 'sample' ? 'Building…' : 'Download sample workbook'}</button>
          <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={toImport}>Upload inventory</button>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>New client</summary>
          <div className="field-row" style={{ marginTop: 8 }}>
            <div className="field"><label className="nst-input-label" htmlFor="nc-id">Client ID</label>
              <span className="nst-input-shell"><input id="nc-id" className="nst-input" value={newId} onChange={e => setNewId(e.target.value)} placeholder="ACME" /></span></div>
            <div className="field"><label className="nst-input-label" htmlFor="nc-name">Name</label>
              <span className="nst-input-shell"><input id="nc-name" className="nst-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Acme Cloud Services" /></span></div>
            <button type="button" className="nst-btn nst-btn--sm" onClick={create} disabled={!newId.trim() || !newName.trim()}>Create client</button>
          </div>
        </details>
        {err && <p className="issue-error small" role="alert">{err}</p>}
        {store.volatile && <p className="issue-warning small">Browser storage is unavailable; imported data lasts only until this tab closes.</p>}
      </Card>

      {!clients.length || !data ? (
        <Card>
          <Empty title={clients.length ? 'Nothing imported for this client yet' : 'No client infrastructure imported yet'}
            actions={<>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={toImport}>Upload inventory</button>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => dl('template')}>Download template</button>
            </>}>
            Import a client's sites, buildings, floors, rooms, rows, racks, devices, cabling, power and cooling from an Excel workbook or CSV files. The data center views are generated from those records.
          </Empty>
        </Card>
      ) : (
        <>
          <StatStrip cells={[
            { k: 'Data centers', v: fmt(rows.length), s: `${fmt(total.buildings)} buildings · ${fmt(total.rooms)} rooms`, t: 'sky' },
            { k: 'Racks', v: fmt(total.racks), s: `${fmt(total.uUsed)} of ${fmt(total.uTotal)} U used`, t: 'cyan' },
            { k: 'Devices', v: fmt(total.devices), s: 'imported equipment', t: 'emerald' },
            { k: 'Cables', v: fmt(total.physical), s: 'physical connections', t: 'purple' },
            { k: 'PDUs', v: fmt(total.pdus), s: 'floor + rack PDU records', t: 'amber' },
            { k: 'Sensors', v: fmt(total.sensors), s: 'environmental sensor records', t: 'slate' }
          ]} />
          <Card>
            <DataGrid<{ dc: DataCenter; c: ReturnType<typeof counts> }>
              columns={[
                { t: 'Data center' },
                { t: 'Estate location' },
                { t: 'City' },
                { t: 'Buildings', r: true },
                { t: 'Floors', r: true },
                { t: 'Rooms', r: true },
                { t: 'Racks', r: true },
                { t: 'Devices', r: true },
                { t: 'Power' },
                { t: 'Status' },
                { t: 'Actions', r: true },
              ]}
              rows={rows}
              total={rows.length}
              rowKey={r => r.dc.id}
              searchPlaceholder="Data center, city, location"
              rowActions={r => [
                { l: 'Open data center', onClick: () => open(r.dc) },
                { l: 'Edit data center', onClick: () => startEditDc(r.dc) },
                { l: 'Delete data center', onClick: () => setDeletingDc(r) },
              ]}
              renderRow={r => [
                <><span className="vw-value">{r.dc.name}</span><Sub mono>{r.dc.id}</Sub></>,
                r.dc.locationId ? <Mono>{r.dc.locationId}</Mono> : <span className="muted">—</span>,
                r.dc.city ?? '—',
                fmt(r.c.buildings), fmt(r.c.floors), fmt(r.c.rooms), fmt(r.c.racks), fmt(r.c.devices),
                <span className="small">{r.c.power.GENERATOR} gen · {r.c.power.UPS} UPS · {r.c.pdus} PDU</span>,
                <Chip tone={r.dc.status === 'ACTIVE' ? 'success' : r.dc.status === 'PLANNED' ? 'info' : 'neutral'}>{r.dc.status.toLowerCase()}</Chip>,
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="client-card-action-btn"
                    title={`Edit ${r.dc.name}`}
                    aria-label={`Edit ${r.dc.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditDc(r.dc);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="client-card-action-btn client-card-action-btn--danger"
                    title={`Delete ${r.dc.name}`}
                    aria-label={`Delete ${r.dc.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingDc(r);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              ]} />
          </Card>
          <Card>
            <h3 className="vw-card-title" style={{ margin: '0 0 8px' }}>Import history</h3>
            {history.length ? (
              <table className="plain">
                <thead><tr><th>Batch</th><th>File</th><th>When</th><th className="num">Created</th><th className="num">Updated</th><th className="num">Unchanged</th><th className="num">Kept (not in file)</th><th className="num">Warnings</th></tr></thead>
                <tbody>{history.map(b => (
                  <tr key={b.id}><td><Mono>{b.id}</Mono></td><td>{b.fileName}</td><td>{new Date(b.at).toLocaleString()}</td>
                    <td className="num">{fmt(b.created)}</td><td className="num">{fmt(b.updated)}</td><td className="num">{fmt(b.unchanged)}</td><td className="num">{fmt(b.keptNotInFile)}</td><td className="num">{fmt(b.warnings)}</td></tr>
                ))}</tbody>
              </table>
            ) : <p className="muted small">No imports yet.</p>}
          </Card>
        </>
      )}

      {editingDc && (
        <div className="dcim-modal-backdrop" onClick={() => setEditingDc(null)}>
          <div className="dcim-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="dcim-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Edit Data Center</h3>
              <button
                type="button"
                className="dcim-modal-close"
                onClick={() => setEditingDc(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditDc} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="nst-input-label" style={{ marginBottom: 4, display: 'block' }}>
                  Data Center ID (Permanent)
                </label>
                <input
                  type="text"
                  className="nst-input"
                  value={editingDc.id}
                  disabled
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label className="nst-input-label" htmlFor="edit-dc-name" style={{ marginBottom: 4, display: 'block' }}>
                  Data Center Name <span className="req-star">*</span>
                </label>
                <input
                  id="edit-dc-name"
                  type="text"
                  className="nst-input"
                  required
                  value={editDcForm.name}
                  onChange={e => setEditDcForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Equinix Ashburn DC1"
                  autoFocus
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="nst-input-label" htmlFor="edit-dc-loc" style={{ marginBottom: 4, display: 'block' }}>
                    Estate Location ID
                  </label>
                  <input
                    id="edit-dc-loc"
                    type="text"
                    className="nst-input"
                    value={editDcForm.locationId}
                    onChange={e => setEditDcForm(f => ({ ...f, locationId: e.target.value }))}
                    placeholder="e.g. KA-DC-008"
                  />
                </div>
                <div>
                  <label className="nst-input-label" htmlFor="edit-dc-city" style={{ marginBottom: 4, display: 'block' }}>
                    City
                  </label>
                  <input
                    id="edit-dc-city"
                    type="text"
                    className="nst-input"
                    value={editDcForm.city}
                    onChange={e => setEditDcForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Ashburn"
                  />
                </div>
              </div>
              <div>
                <label className="nst-input-label" htmlFor="edit-dc-addr" style={{ marginBottom: 4, display: 'block' }}>
                  Address
                </label>
                <input
                  id="edit-dc-addr"
                  type="text"
                  className="nst-input"
                  value={editDcForm.address}
                  onChange={e => setEditDcForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="nst-input-label" htmlFor="edit-dc-tier" style={{ marginBottom: 4, display: 'block' }}>
                    Tier Rating
                  </label>
                  <select
                    id="edit-dc-tier"
                    className="nst-input"
                    value={editDcForm.tier}
                    onChange={e => setEditDcForm(f => ({ ...f, tier: e.target.value as any }))}
                  >
                    <option value="">None specified</option>
                    <option value="I">Tier I</option>
                    <option value="II">Tier II</option>
                    <option value="III">Tier III</option>
                    <option value="IV">Tier IV</option>
                  </select>
                </div>
                <div>
                  <label className="nst-input-label" htmlFor="edit-dc-status" style={{ marginBottom: 4, display: 'block' }}>
                    Status
                  </label>
                  <select
                    id="edit-dc-status"
                    className="nst-input"
                    value={editDcForm.status}
                    onChange={e => setEditDcForm(f => ({ ...f, status: e.target.value as OperStatus }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNED">Planned</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DECOMMISSIONED">Decommissioned</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="nst-btn nst-btn-secondary"
                  onClick={() => setEditingDc(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nst-btn nst-btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingDc && (
        <div className="dcim-modal-backdrop" onClick={() => setDeletingDc(null)}>
          <div className="dcim-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="dcim-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Delete Data Center
              </h3>
              <button
                type="button"
                className="dcim-modal-close"
                onClick={() => setDeletingDc(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to delete data center <strong>{deletingDc.dc.name}</strong> (<Mono>{deletingDc.dc.id}</Mono>)?
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
                This will cascade-delete the data center and its associated child records:
                <strong> {fmt(deletingDc.c.buildings)}</strong> building{deletingDc.c.buildings === 1 ? '' : 's'},
                <strong> {fmt(deletingDc.c.rooms)}</strong> room{deletingDc.c.rooms === 1 ? '' : 's'},
                <strong> {fmt(deletingDc.c.racks)}</strong> rack{deletingDc.c.racks === 1 ? '' : 's'},
                <strong> {fmt(deletingDc.c.devices)}</strong> device{deletingDc.c.devices === 1 ? '' : 's'}, and all related cabling.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="nst-btn nst-btn-secondary"
                onClick={() => setDeletingDc(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="nst-btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={handleConfirmDeleteDc}
              >
                Delete Data Center
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="dcim-modal-backdrop" onClick={() => setEditingClient(null)}>
          <div className="dcim-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="dcim-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Edit Client</h3>
              <button
                type="button"
                className="dcim-modal-close"
                onClick={() => setEditingClient(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditClient} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="nst-input-label" style={{ marginBottom: 4, display: 'block' }}>
                  Client ID (Permanent)
                </label>
                <input
                  type="text"
                  className="nst-input"
                  value={editingClient.id}
                  disabled
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label className="nst-input-label" htmlFor="edit-client-dc-name" style={{ marginBottom: 4, display: 'block' }}>
                  Client Name <span className="req-star">*</span>
                </label>
                <input
                  id="edit-client-dc-name"
                  type="text"
                  className="nst-input"
                  required
                  value={editClientForm.name}
                  onChange={e => setEditClientForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Telecom"
                  autoFocus
                />
              </div>
              <div>
                <label className="nst-input-label" htmlFor="edit-client-dc-ind" style={{ marginBottom: 4, display: 'block' }}>
                  Industry
                </label>
                <input
                  id="edit-client-dc-ind"
                  type="text"
                  className="nst-input"
                  value={editClientForm.industry}
                  onChange={e => setEditClientForm(f => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Telecom, Enterprise, Cloud"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="nst-btn nst-btn-secondary"
                  onClick={() => setEditingClient(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nst-btn nst-btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingClient && (
        <div className="dcim-modal-backdrop" onClick={() => setDeletingClient(null)}>
          <div className="dcim-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="dcim-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Delete Client
              </h3>
              <button
                type="button"
                className="dcim-modal-close"
                onClick={() => setDeletingClient(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to delete client <strong>{deletingClient.name}</strong> (<Mono>{deletingClient.id}</Mono>)?
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
                This will permanently delete this client, all its associated data centers, and all uploaded inventory records.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="nst-btn nst-btn-secondary"
                onClick={() => setDeletingClient(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="nst-btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={handleConfirmDeleteClient}
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
