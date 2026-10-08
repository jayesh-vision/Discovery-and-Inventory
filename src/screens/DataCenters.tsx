/* Inventory › Data centers — the landing page for uploaded infrastructure
   inventory: pick a client, see its data centers, upload more. Every number
   here is counted from the client's uploaded records. */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Empty } from '../components/dcim/common';
import { downloadSample, downloadTemplate, importHistory, saveClient, useClientData, useClients, store } from '../dcim/api';
import { counts, dcScope } from '../dcim/derive';
import type { DataCenter } from '../dcim/model';
import '../styles/dcim.css';

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function DataCenters() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const clients = useClients();
  const clientId = sp.get('client') && clients.some(c => c.id === sp.get('client')) ? sp.get('client')! : clients[0]?.id ?? null;
  const data = useClientData(clientId);
  const [newId, setNewId] = useState(''); const [newName, setNewName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
  const dl = async (k: 'template' | 'sample') => {
    setBusy(k);
    try { await (k === 'template' ? downloadTemplate() : downloadSample()); } catch (e) { setErr(`Could not build the workbook: ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const toImport = () => nav(`/inventory/dcim/import${clientId ? `?client=${encodeURIComponent(clientId)}` : ''}`);
  const open = (dc: DataCenter) => nav(`/inventory/datacenter/${encodeURIComponent(dc.id)}?client=${encodeURIComponent(dc.clientId)}`);

  return (
    <div className="page dcim">
      <Card>
        <div className="toolbar">
          <div className="field">
            <label className="nst-input-label" htmlFor="dcim-client">Client</label>
            <span className="nst-select-shell">
              <select id="dcim-client" className="nst-input" value={clientId ?? ''} onChange={e => pick(e.target.value)} disabled={!clients.length}>
                {!clients.length && <option value="">No clients yet</option>}
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </select>
            </span>
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
              columns={[{ t: 'Data center' }, { t: 'Estate location' }, { t: 'City' }, { t: 'Buildings', r: true }, { t: 'Floors', r: true }, { t: 'Rooms', r: true },
                { t: 'Racks', r: true }, { t: 'Devices', r: true }, { t: 'Power' }, { t: 'Status' }]}
              rows={rows} total={rows.length} rowKey={r => r.dc.id}
              searchPlaceholder="Data center, city, location"
              rowActions={r => [{ l: 'Open data center', onClick: () => open(r.dc) }]}
              renderRow={r => [
                <><span className="vw-value">{r.dc.name}</span><Sub mono>{r.dc.id}</Sub></>,
                r.dc.locationId ? <Mono>{r.dc.locationId}</Mono> : <span className="muted">—</span>,
                r.dc.city ?? '—',
                fmt(r.c.buildings), fmt(r.c.floors), fmt(r.c.rooms), fmt(r.c.racks), fmt(r.c.devices),
                <span className="small">{r.c.power.GENERATOR} gen · {r.c.power.UPS} UPS · {r.c.pdus} PDU</span>,
                <Chip tone={r.dc.status === 'ACTIVE' ? 'success' : r.dc.status === 'PLANNED' ? 'info' : 'neutral'}>{r.dc.status.toLowerCase()}</Chip>
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
    </div>
  );
}
