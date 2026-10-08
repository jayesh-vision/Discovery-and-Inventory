/* Inventory › Data centers › Upload — client → file → columns → review → done.
   The parsed file lives in this screen only; nothing reaches the store until
   "Upload" on a review with no errors (store.commit refuses otherwise).
   An upload adds new records and updates changed ones by ID; records that are
   not in the file are kept. ?client= preselects a client, ?location= says
   which Inventory › Location site the upload is for (checked on review). */
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono } from '../components/ui';
import { Empty, Head, fmt } from '../components/dcim/common';
import { commitImport, downloadSample, downloadSheetCsv, downloadTemplate, importHistory, plan, readFiles, sampleFile, saveClient, stage, store, useClients } from '../dcim/api';
import { SHEETS, sheetByEntity } from '../dcim/schema';
import { unmappedRequired, type Issue, type SheetPlan } from '../dcim/parse';
import type { StagedImport } from '../dcim/reconcile';
import { ENTITY_KEYS, type EntityKey, type ImportBatch } from '../dcim/model';
import '../styles/dcim.css';

type Step = 'client' | 'file' | 'columns' | 'review' | 'done';
const STEPS: { k: Step; n: string; s: string }[] = [
  { k: 'client', n: 'Client', s: 'Whose inventory' }, { k: 'file', n: 'File', s: 'Excel or CSV' }, { k: 'columns', n: 'Columns', s: 'Check mapping' },
  { k: 'review', n: 'Review', s: 'Validate changes' }, { k: 'done', n: 'Done', s: 'Uploaded' }
];
const GROUPS: { n: string; d: string; e: EntityKey[] }[] = [
  { n: 'Needed to start', d: 'The physical hierarchy and what is in the racks', e: ['dataCenters', 'buildings', 'floors', 'rooms', 'racks', 'devices'] },
  { n: 'Recommended', d: 'Cabling, power plant, cooling and sensors', e: ['rows', 'ports', 'connections', 'powerEquipment', 'powerConnections', 'coolingEquipment', 'sensors'] },
  { n: 'Optional', d: 'Client details, zones and monitoring references', e: ['clients', 'zones', 'monitoringMappings'] }
];
const MAX_ISSUES = 300;
const size = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export default function DcimImport() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const location = sp.get('location');
  const clients = useClients();
  const [step, setStep] = useState<Step>('client');
  const [clientId, setClientId] = useState<string>(sp.get('client') ?? (clients.length === 1 ? clients[0].id : ''));
  const [creating, setCreating] = useState(!clients.length);
  const [nc, setNc] = useState({ id: '', name: '', industry: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [plans, setPlans] = useState<SheetPlan[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [staged, setStaged] = useState<StagedImport | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const client = clients.find(c => c.id === clientId);
  const at = STEPS.findIndex(s => s.k === step);
  const fileName = files.map(f => f.name).join(', ');

  /* step 1 */
  const chooseClient = async () => {
    setErr(null);
    try {
      if (creating) { const c = await saveClient({ id: nc.id, name: nc.name || nc.id, industry: nc.industry || undefined }); setClientId(c.id); setCreating(false); setNc({ id: '', name: '', industry: '' }); }
      else if (!clientId) throw new Error('Choose a client, or create one.');
      setStep('file');
    } catch (e) { setErr((e as Error).message); }
  };

  /* step 2: reading a file goes straight on to the column check */
  const read = async (list: File[]) => {
    const ok = list.filter(f => /\.(xlsx|csv)$/i.test(f.name));
    if (!ok.length) { setErr('Choose an Excel workbook (.xlsx) or CSV files.'); return; }
    if (ok.length < list.length) setErr(`Skipped ${list.length - ok.length} file(s) that are not .xlsx or .csv.`); else setErr(null);
    setBusy('Reading file…');
    try {
      const raws = await readFiles(ok);
      if (!raws.some(r => r.rows.length)) throw new Error('No data rows were found.');
      const ps = plan(raws);
      setFiles(ok); setPlans(ps);
      setOpen(ps.findIndex(p => p.def === null && p.raw.rows.length > 0 || unmappedRequired(p).length > 0));
      setStep('columns');
    } catch (e) { setErr(`Could not read the file: ${(e as Error).message}`); }
    finally { setBusy(null); }
  };

  /* step 3 */
  const setSheet = (i: number, sheet: string) => setPlans(ps => ps.map((p, j) => {
    if (j !== i) return p;
    const def = SHEETS.find(s => s.sheet === sheet) ?? null;
    const mapping: Record<string, string> = {};
    if (def) for (const h of p.raw.headers) { const f = def.fields.find(x => x.col.toLowerCase() === h.toLowerCase()); if (f) mapping[h] = f.key; }
    return { ...p, def, detectedBy: def ? 'manual' : 'none', mapping: def ? { ...mapping, ...(p.def === def ? p.mapping : {}) } : {} };
  }));
  const setMap = (i: number, header: string, key: string) => setPlans(ps => ps.map((p, j) => j !== i ? p : { ...p, mapping: { ...p.mapping, [header]: key } }));
  const blocked = plans.filter(p => p.def && unmappedRequired(p).length).length;
  const validate = () => {
    setErr(null); setBusy('Validating against the stored inventory…');
    setTimeout(() => {
      try { setStaged(stage(clientId, client?.name, fileName, plans)); setStep('review'); }
      catch (e) { setErr((e as Error).message); }
      finally { setBusy(null); }
    }, 30);
  };

  /* step 4 */
  const confirm = async () => {
    if (!staged?.ok) return;
    setBusy('Uploading…'); setErr(null);
    try { setBatch(await commitImport(staged)); setStep('done'); }
    catch (e) { setErr(`Upload failed — nothing was changed. ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const restart = () => { setFiles([]); setPlans([]); setStaged(null); setBatch(null); setErr(null); setStep('file'); };

  return (
    <div className="page dcim up">
      <Card className="up-head">
        <div className="up-head-row">
          <div>
            <h2 className="up-title">Upload infrastructure inventory</h2>
            <p className="vw-card-description small" style={{ margin: 0 }}>Buildings, floors, rooms, rows, racks, devices, cabling, power plant, cooling and sensors — from one Excel workbook or a set of CSV files.</p>
          </div>
          <div className="row">
            <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => downloadTemplate()}>Download template</button>
            <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => downloadSample()}>Download sample</button>
          </div>
        </div>
        <ol className="stepper" aria-label="Upload steps">
          {STEPS.map((s, i) => (
            <li key={s.k} className={i === at ? 'is-on' : i < at ? 'is-done' : ''} aria-current={i === at ? 'step' : undefined}>
              <span className="step-dot">{i < at ? '✓' : i + 1}</span>
              <span className="step-t"><b>{s.n}</b><small>{s.s}</small></span>
            </li>
          ))}
        </ol>
        {location && <div className="up-note">For Inventory site <strong>{location}</strong>: the DataCenters sheet should carry <Mono>{location}</Mono> in its LocationId column so the inventory shows on that site's Infrastructure tab.</div>}
      </Card>

      {err && <div className="up-alert up-alert--error" role="alert">{err}</div>}
      {busy && <div className="up-alert up-alert--busy" role="status"><span className="spin" aria-hidden />{busy}</div>}

      {step === 'client' && (
        <Card>
          <Head title="Whose inventory is this?" sub="One upload writes one client's inventory. Data centers in the file must belong to this client." />
          <div className="client-grid" role="radiogroup" aria-label="Client">
            {clients.map(c => {
              const dcs = store.data(c.id)?.entities.dataCenters.length ?? 0;
              const last = importHistory(c.id)[0];
              return (
                <button key={c.id} type="button" role="radio" aria-checked={!creating && clientId === c.id} className={`client-card${!creating && clientId === c.id ? ' is-on' : ''}`} onClick={() => { setClientId(c.id); setCreating(false); }}>
                  <span className="client-av" aria-hidden>{c.name.slice(0, 2).toUpperCase()}</span>
                  <span className="client-b"><strong>{c.name}</strong><small><Mono>{c.id}</Mono>{c.industry ? ` · ${c.industry}` : ''}</small>
                    <small>{dcs} data center{dcs === 1 ? '' : 's'}{last ? ` · last upload ${new Date(last.at).toLocaleDateString()}` : ' · nothing uploaded yet'}</small></span>
                </button>
              );
            })}
            <button type="button" role="radio" aria-checked={creating} className={`client-card client-card--new${creating ? ' is-on' : ''}`} onClick={() => setCreating(true)}>
              <span className="client-av" aria-hidden>+</span><span className="client-b"><strong>New client</strong><small>Create a client to upload for</small></span>
            </button>
          </div>
          {creating && (
            <div className="field-row" style={{ marginTop: 16 }}>
              <div className="field"><label className="nst-input-label" htmlFor="nc-id">Client ID *</label>
                <span className="nst-input-shell"><input id="nc-id" className="nst-input" value={nc.id} onChange={e => setNc({ ...nc, id: e.target.value })} placeholder="ACME" /></span></div>
              <div className="field"><label className="nst-input-label" htmlFor="nc-name">Name *</label>
                <span className="nst-input-shell"><input id="nc-name" className="nst-input" value={nc.name} onChange={e => setNc({ ...nc, name: e.target.value })} placeholder="Acme Cloud Services" /></span></div>
              <div className="field"><label className="nst-input-label" htmlFor="nc-ind">Industry</label>
                <span className="nst-input-shell"><input id="nc-ind" className="nst-input" value={nc.industry} onChange={e => setNc({ ...nc, industry: e.target.value })} placeholder="Cloud hosting" /></span></div>
            </div>
          )}
          <div className="up-foot">
            <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav('/inventory/dcim')}>Cancel</button>
            <span className="grow" />
            <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={chooseClient} disabled={creating ? !nc.id.trim() || !nc.name.trim() : !clientId}>Continue</button>
          </div>
        </Card>
      )}

      {step === 'file' && (
        <div className="up-file">
          <Card>
            <Head title={`Upload for ${client?.name ?? clientId}`} sub="Sheets and CSV files are recognised by their name (Racks, Devices …) or by their columns." />
            <div className={`drop${over ? ' is-over' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
              onDrop={e => { e.preventDefault(); setOver(false); read([...e.dataTransfer.files]); }}>
              <span className="drop-ic" aria-hidden>⇪</span>
              <strong>Drag and drop your file here</strong>
              <span className="muted small">One .xlsx workbook, or several .csv files (one per sheet) · nothing is saved until you confirm</span>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" multiple hidden aria-label="Choose files" onChange={e => { read([...(e.target.files ?? [])]); e.target.value = ''; }} />
              <div className="row" style={{ marginTop: 6 }}>
                <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => fileRef.current?.click()} disabled={!!busy}>Browse files</button>
                <button type="button" className="nst-btn nst-btn--sm" onClick={async () => read([await sampleFile()])} disabled={!!busy}>Try the sample workbook</button>
              </div>
            </div>
            <div className="up-foot">
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => setStep('client')}>Back</button>
            </div>
          </Card>
          <Card>
            <Head title="What to include" sub="Download a sheet as CSV, or the full template with field definitions" />
            {GROUPS.map(g => (
              <div key={g.n} className="sheet-group">
                <div className="sheet-group-h"><strong>{g.n}</strong><small>{g.d}</small></div>
                <ul className="sheet-list">
                  {g.e.map(k => { const d = sheetByEntity(k); return (
                    <li key={k}><span>{d.sheet}<small>{d.desc}</small></span>
                      <button type="button" className="link-btn" onClick={() => downloadSheetCsv(d.sheet)} aria-label={`Download ${d.sheet} CSV`}>CSV</button></li>
                  ); })}
                </ul>
              </div>
            ))}
          </Card>
        </div>
      )}

      {step === 'columns' && (
        <Card>
          <Head title="Check the columns" sub={`${files.length} file${files.length === 1 ? '' : 's'} · ${plans.length} sheet${plans.length === 1 ? '' : 's'} · ${fmt(plans.reduce((a, p) => a + p.raw.rows.length, 0))} rows`}
            right={<button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={restart}>Choose another file</button>} />
          <div className="file-chips">{files.map(f => <span key={f.name} className="file-chip">📄 {f.name}<small>{size(f.size)}</small></span>)}</div>
          <table className="plain map-table">
            <thead><tr><th>Sheet in file</th><th>Imports as</th><th className="num">Rows</th><th>Columns</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {plans.map((p, i) => {
                const missing = unmappedRequired(p);
                const mapped = Object.values(p.mapping).filter(Boolean).length;
                const status = !p.def ? (p.raw.rows.length ? <Chip tone="neutral">Ignored</Chip> : <Chip tone="neutral">Empty</Chip>) : missing.length ? <Chip tone="error">{missing.length} required missing</Chip> : <Chip tone="success">Ready</Chip>;
                return [
                  <tr key={`r${i}`} className={open === i ? 'is-open' : ''}>
                    <td><strong>{p.raw.name}</strong></td>
                    <td><span className="nst-select-shell"><select className="nst-input" aria-label={`Import ${p.raw.name} as`} value={p.def?.sheet ?? ''} onChange={e => setSheet(i, e.target.value)}>
                      <option value="">Ignore this sheet</option>{SHEETS.map(s => <option key={s.sheet} value={s.sheet}>{s.sheet}</option>)}
                    </select></span>{p.detectedBy === 'headers' && <small className="muted"> by columns</small>}</td>
                    <td className="num">{fmt(p.raw.rows.length)}</td>
                    <td>{p.def ? `${mapped} of ${p.raw.headers.length} mapped` : '—'}</td>
                    <td>{status}</td>
                    <td>{p.def && <button type="button" className="link-btn" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>{open === i ? 'Hide mapping' : 'Edit mapping'}</button>}</td>
                  </tr>,
                  open === i && p.def ? (
                    <tr key={`m${i}`} className="map-row"><td colSpan={6}>
                      {missing.length > 0 && <p className="issue-error small" style={{ marginTop: 0 }}>Map a column to: {missing.map(f => f.col).join(', ')}</p>}
                      <div className="map-grid">
                        {p.raw.headers.map(h => (
                          <label key={h} className="map-cell">
                            <span><Mono>{h}</Mono><small className="muted">{p.raw.rows[0]?.[h] ? `e.g. ${p.raw.rows[0][h]}` : ''}</small></span>
                            <span className="nst-select-shell"><select className="nst-input" value={p.mapping[h] ?? ''} onChange={e => setMap(i, h, e.target.value)}>
                              <option value="">— ignore —</option>
                              {p.def!.fields.map(f => <option key={f.key} value={f.key}>{f.col}{f.required ? ' *' : ''}{f.unit ? ` (${f.unit})` : ''}</option>)}
                            </select></span>
                          </label>
                        ))}
                      </div>
                    </td></tr>
                  ) : null
                ];
              })}
            </tbody>
          </table>
          <div className="up-foot">
            <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => setStep('file')}>Back</button>
            <span className="grow" />
            {blocked > 0 && <span className="issue-error small">{blocked} sheet{blocked > 1 ? 's' : ''} need a required column mapped</span>}
            <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={validate} disabled={!!busy || !plans.some(p => p.def)}>Validate</button>
          </div>
        </Card>
      )}

      {step === 'review' && staged && <Review staged={staged} client={client?.name ?? clientId} location={location} busy={!!busy}
        onBack={() => setStep('columns')} onRestart={restart} onConfirm={confirm} />}

      {step === 'done' && batch && staged && (
        <Card>
          <div className="done">
            <span className="done-ic" aria-hidden>✓</span>
            <h3>Inventory uploaded for {client?.name ?? clientId}</h3>
            <p className="muted small">Batch <Mono>{batch.id}</Mono> · {fmt(batch.created)} created · {fmt(batch.updated)} updated · {fmt(batch.unchanged)} unchanged · {fmt(batch.keptNotInFile)} kept (not in file){batch.warnings ? ` · ${fmt(batch.warnings)} warnings` : ''}</p>
            <div className="done-dcs">
              {staged.staged.dataCenters.map(dc => (
                <button key={dc.id} type="button" className="client-card" onClick={() => nav(`/inventory/datacenter/${encodeURIComponent(dc.id)}?client=${encodeURIComponent(batch.clientId)}`)}>
                  <span className="client-av" aria-hidden>▦</span>
                  <span className="client-b"><strong>{dc.name}</strong><small><Mono>{dc.id}</Mono>{dc.locationId ? ` · location ${dc.locationId}` : ''}</small><small>Open inventory ›</small></span>
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              {location && <button type="button" className="nst-btn nst-btn--sm" onClick={() => nav(`/inventory/location/site/${encodeURIComponent(location)}/infrastructure`)}>Back to site {location}</button>}
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(`/inventory/dcim?client=${encodeURIComponent(batch.clientId)}`)}>All data centers</button>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={restart}>Upload another file</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Review({ staged, client, location, busy, onBack, onRestart, onConfirm }: {
  staged: StagedImport; client: string; location: string | null; busy: boolean; onBack: () => void; onRestart: () => void; onConfirm: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>(staged.ok ? 'all' : 'error');
  const [q, setQ] = useState('');
  const [openK, setOpenK] = useState<EntityKey | null>(null);
  const tot = staged.totals;
  const issues = useMemo(() => staged.issues.filter(i => (filter === 'all' || i.severity === filter) && (!q || `${i.sheet} ${i.col ?? ''} ${i.id ?? ''} ${i.message}`.toLowerCase().includes(q.toLowerCase()))), [staged, filter, q]);
  const bySheet = useMemo(() => { const m = new Map<string, Issue[]>(); for (const i of issues.slice(0, MAX_ISSUES)) m.set(i.sheet, [...(m.get(i.sheet) ?? []), i]); return [...m.entries()]; }, [issues]);
  const locMissing = !!location && !staged.merged.dataCenters.some(d => d.locationId === location && staged.staged.dataCenters.some(s => s.id === d.id));
  const changed = ENTITY_KEYS.filter(k => { const d = staged.diff[k]; return d.created.length + d.updated.length + d.unchanged.length + d.keptNotInFile.length > 0; });
  const csv = () => {
    const esc = (v: unknown) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const body = ['Severity,Sheet,Row,Column,ID,Message', ...staged.issues.map(i => [i.severity, i.sheet, i.row || '', i.col ?? '', i.id ?? '', i.message].map(esc).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'upload-issues.csv' }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className={`up-banner ${staged.ok ? 'up-banner--ok' : 'up-banner--bad'}`}>
        <span className="up-banner-ic" aria-hidden>{staged.ok ? '✓' : '!'}</span>
        <div>
          <strong>{staged.ok ? `Ready to upload for ${client}` : `${fmt(tot.errors)} error${tot.errors === 1 ? '' : 's'} must be fixed before uploading`}</strong>
          <small>{staged.ok ? `${fmt(tot.created)} new and ${fmt(tot.updated)} updated records will be saved. ${fmt(tot.keptNotInFile)} stored records not in this file are kept.` : 'Fix them in your file and upload it again, or correct the column mapping.'}{tot.warnings ? ` ${fmt(tot.warnings)} warning${tot.warnings === 1 ? '' : 's'} can be accepted.` : ''}</small>
        </div>
      </div>
      {locMissing && <div className="up-alert up-alert--warn">No data center in this file has LocationId <Mono>{location}</Mono>, so it will not appear on that site's Infrastructure tab. Add it to the DataCenters sheet if this inventory belongs to that site.</div>}
      <div className="tiles">
        {([['New', tot.created, 'ok'], ['Updated', tot.updated, 'info'], ['Unchanged', tot.unchanged, ''], ['Kept, not in file', tot.keptNotInFile, ''], ['Errors', tot.errors, tot.errors ? 'bad' : ''], ['Warnings', tot.warnings, tot.warnings ? 'warn' : '']] as const).map(([k, v, tone]) => (
          <div key={k} className={`tile${tone ? ` tile--${tone}` : ''}`}><span className="tile-v">{fmt(v)}</span><span className="tile-k">{k}</span></div>
        ))}
      </div>
      <div className="grid-2">
        <Card>
          <Head title="Changes by sheet" />
          <table className="plain">
            <thead><tr><th>Sheet</th><th className="num">New</th><th className="num">Updated</th><th className="num">Unchanged</th><th className="num">Kept</th></tr></thead>
            <tbody>{changed.map(k => {
              const d = staged.diff[k];
              return [
                <tr key={k}><td>{d.updated.length ? <button type="button" className="link-btn" onClick={() => setOpenK(openK === k ? null : k)} aria-expanded={openK === k}>{sheetByEntity(k).sheet} {openK === k ? '▾' : '▸'}</button> : sheetByEntity(k).sheet}</td>
                  <td className="num">{fmt(d.created.length)}</td><td className="num">{fmt(d.updated.length)}</td><td className="num">{fmt(d.unchanged.length)}</td><td className="num">{fmt(d.keptNotInFile.length)}</td></tr>,
                openK === k ? <tr key={`${k}-x`} className="map-row"><td colSpan={5}>
                  <table className="plain"><thead><tr><th>Record</th><th>Field</th><th>Stored</th><th>In file</th></tr></thead><tbody>
                    {d.updated.flatMap(u => u.changes.map(c => <tr key={`${u.id}${c.key}`}><td><Mono>{u.id}</Mono></td><td>{c.key}</td><td className="muted">{String(c.before ?? '—')}</td><td>{String(c.after ?? '—')}</td></tr>)).slice(0, 200)}
                  </tbody></table></td></tr> : null
              ];
            })}</tbody>
          </table>
        </Card>
        <Card>
          <Head title="Issues" count={staged.issues.length} right={staged.issues.length ? <button type="button" className="nst-btn nst-btn--xs nst-btn--ghost" onClick={csv}>Download CSV</button> : undefined} />
          {staged.issues.length ? <>
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <div className="seg" role="group" aria-label="Filter issues">
                {(['all', 'error', 'warning'] as const).map(f => <button key={f} type="button" className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? `All ${staged.issues.length}` : f === 'error' ? `Errors ${tot.errors}` : `Warnings ${tot.warnings}`}</button>)}
              </div>
              <span className="nst-input-shell" style={{ flex: 1, minWidth: 160 }}><input className="nst-input" placeholder="Search sheet, column, ID, message" value={q} onChange={e => setQ(e.target.value)} aria-label="Search issues" /></span>
            </div>
            <div className="scroll">
              {bySheet.length ? bySheet.map(([sheet, list]) => (
                <div key={sheet} className="issue-group">
                  <div className="issue-group-h"><strong>{sheet}</strong><small>{list.length}</small></div>
                  {list.map((x, i) => (
                    <div key={i} className={`issue issue--${x.severity}`}>
                      <span className="issue-where">{x.row ? `Row ${x.row}` : 'Sheet'}{x.col ? ` · ${x.col}` : ''}</span>
                      <span>{x.id && <Mono>{x.id} </Mono>}{x.message}</span>
                    </div>
                  ))}
                </div>
              )) : <p className="muted small">Nothing matches.</p>}
              {issues.length > MAX_ISSUES && <p className="muted small">Showing {MAX_ISSUES} of {fmt(issues.length)} — download the CSV for all.</p>}
            </div>
          </> : <Empty icon="✓" title="No issues">Every row passed validation.</Empty>}
        </Card>
      </div>
      <Card>
        <div className="up-foot" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={onBack}>Back to columns</button>
          <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={onRestart}>Upload a corrected file</button>
          <span className="grow" />
          <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={onConfirm} disabled={!staged.ok || busy}>
            {busy ? 'Uploading…' : staged.ok ? `Upload ${fmt(tot.created + tot.updated)} change${tot.created + tot.updated === 1 ? '' : 's'}` : 'Fix errors to upload'}
          </button>
        </div>
      </Card>
    </>
  );
}
