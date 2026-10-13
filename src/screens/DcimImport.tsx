/* Inventory › Data centers › Upload — client → file → columns → review → done.
   The parsed file lives in this screen only; nothing reaches the store until
   "Upload" on a review with no errors (store.commit refuses otherwise).
   An upload adds new records and updates changed ones by ID; records that are
   not in the file are kept. ?client= preselects a client, ?location= says
   which Inventory › Location site the upload is for (checked on review). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono } from '../components/ui';
import { Head, fmt } from '../components/dcim/common';
import { commitImport, downloadSample, downloadSheetCsv, downloadTemplate, importHistory, plan, readFiles, sampleFile, saveClient, stage, store, useClients } from '../dcim/api';
import { SHEETS, sheetByEntity } from '../dcim/schema';
import { unmappedRequired, type Issue, type SheetPlan } from '../dcim/parse';
import type { StagedImport } from '../dcim/reconcile';
import { ENTITY_KEYS, type EntityKey, type ImportBatch } from '../dcim/model';
import { findCityByFacilityCode } from '../data/geographicHierarchy';
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

function getEntityIcon(key: EntityKey) {
  switch (key) {
    case 'dataCenters':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
          <line x1="6" y1="6" x2="6.01" y2="6"/>
          <line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
      );
    case 'buildings':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v8h4"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/>
        </svg>
      );
    case 'floors':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      );
    case 'rooms':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      );
    case 'racks':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="4" y1="7" x2="20" y2="7"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
      );
    case 'devices':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2"/>
          <rect x="2" y="14" width="20" height="8" rx="2"/>
          <line x1="6" y1="6" x2="6.01" y2="6"/>
          <line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
      );
    case 'rows':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="6" x2="3" y2="6"/>
          <line x1="21" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="18" x2="3" y2="18"/>
        </svg>
      );
    case 'ports':
    case 'connections':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <line x1="3" y1="12" x2="9" y2="12"/>
          <line x1="15" y1="12" x2="21" y2="12"/>
        </svg>
      );
    case 'powerEquipment':
    case 'powerConnections':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      );
    case 'coolingEquipment':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20"/>
          <path d="m4.93 4.93 14.14 14.14"/>
          <path d="M2 12h20"/>
          <path d="m19.07 4.93-14.14 14.14"/>
        </svg>
      );
    case 'sensors':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      );
  }
}

export default function DcimImport() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const location = sp.get('location');
  const from = sp.get('from');
  const clients = useClients();
  const urlStep = (sp.get('step') as Step) || 'client';
  const [step, setStep] = useState<Step>(
    ['client', 'file', 'columns', 'review', 'done'].includes(urlStep) ? urlStep : 'client'
  );
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
  const [specTab, setSpecTab] = useState<'all' | 'needed' | 'recommended' | 'optional'>('all');
  const [specSearch, setSpecSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const client = clients.find(c => c.id === clientId);
  const at = STEPS.findIndex(s => s.k === step);
  const fileName = files.map(f => f.name).join(', ');

  const filteredGroups = useMemo(() => {
    return GROUPS.map(g => {
      let matchesTab = true;
      if (specTab === 'needed' && g.n !== 'Needed to start') matchesTab = false;
      if (specTab === 'recommended' && g.n !== 'Recommended') matchesTab = false;
      if (specTab === 'optional' && g.n !== 'Optional') matchesTab = false;
      if (!matchesTab) return null;

      const q = specSearch.trim().toLowerCase();
      const filteredEntities = g.e.filter(k => {
        if (!q) return true;
        const d = sheetByEntity(k);
        return d.sheet.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
      });

      if (!filteredEntities.length) return null;
      return {
        ...g,
        e: filteredEntities
      };
    }).filter(Boolean) as typeof GROUPS;
  }, [specTab, specSearch]);

  // Navigate to step and push into browser history so browser back/forward (← / →) works step-by-step
  const goTo = (next: Step, replace = false) => {
    setStep(next);
    const n = new URLSearchParams(sp);
    if (next === 'client') {
      n.delete('step');
    } else {
      n.set('step', next);
    }
    setSp(n, { replace });
  };

  // Keep internal step synchronized when the user presses browser Back (←) or Forward (→)
  useEffect(() => {
    if (urlStep && ['client', 'file', 'columns', 'review', 'done'].includes(urlStep)) {
      setStep(urlStep);
    }
  }, [urlStep]);

  // If user opens or refreshes on review/columns without staged/planned data in memory, gracefully step back
  useEffect(() => {
    if (step === 'review' && !staged) {
      if (plans.length > 0) goTo('columns', true);
      else if (files.length > 0) goTo('file', true);
      else goTo('client', true);
    } else if (step === 'columns' && !plans.length) {
      if (files.length > 0) goTo('file', true);
      else goTo('client', true);
    }
  }, [step, staged, plans.length, files.length]);

  const goBackOne = () => {
    if (step === 'done') {
      goTo('review');
    } else if (step === 'review') {
      goTo('columns');
    } else if (step === 'columns') {
      goTo('file');
    } else if (step === 'file') {
      goTo('client');
    } else if (step === 'client') {
      if (from?.toLowerCase().includes('infrastructure') && location) {
        nav(`/inventory/location/site/${encodeURIComponent(location)}/infrastructure`);
      } else if (from?.toLowerCase().includes('passive')) {
        nav('/inventory/passive');
      } else if (from?.toLowerCase().includes('city') && location) {
        const cityMatch = findCityByFacilityCode(location);
        if (cityMatch) {
          nav(`/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}&facilityId=${encodeURIComponent(location)}`);
        } else {
          nav('/inventory/location');
        }
      } else if (from?.toLowerCase().includes('site') && location) {
        nav(`/inventory/location/site/${encodeURIComponent(location)}`);
      } else if (location) {
        nav(`/inventory/location/site/${encodeURIComponent(location)}/infrastructure`);
      } else {
        nav(clientId ? `/inventory/dcim?client=${encodeURIComponent(clientId)}` : '/inventory/dcim');
      }
    }
  };

  /* step 1 */
  const chooseClient = async () => {
    setErr(null);
    try {
      if (creating) { const c = await saveClient({ id: nc.id, name: nc.name || nc.id, industry: nc.industry || undefined }); setClientId(c.id); setCreating(false); setNc({ id: '', name: '', industry: '' }); }
      else if (!clientId) throw new Error('Choose a client, or create one.');
      goTo('file');
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
      goTo('columns');
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
      try {
        const stagedResult = stage(clientId, client?.name, fileName, plans);
        setStaged(stagedResult);
        goTo('review');
      }
      catch (e) { setErr((e as Error).message); }
      finally { setBusy(null); }
    }, 30);
  };

  /* step 4 */
  const confirm = async () => {
    if (!staged?.ok) return;
    setBusy('Uploading…'); setErr(null);
    try {
      const b = await commitImport(staged);
      setBatch(b);
      goTo('done');
    }
    catch (e) { setErr(`Upload failed — nothing was changed. ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const restart = () => { setFiles([]); setPlans([]); setStaged(null); setBatch(null); setErr(null); goTo('file'); };

  return (
    <div className="page dcim up">
      <Card className="up-head">
        <div className="up-head-row">
          <div className="up-head-left">
            <div className="up-title-block">
              <div className="up-badge-row">
                <span className="up-tag-badge">
                  <span className="up-tag-dot" aria-hidden="true" />
                  Bulk Ingestion
                </span>
              </div>
              <h2 className="up-title">Upload infrastructure inventory</h2>
              <p className="up-subtitle">Buildings, floors, rooms, rows, racks, devices, cabling, power plant, cooling and sensors — from one Excel workbook or a set of CSV files.</p>
            </div>
          </div>
          <div className="up-head-actions">
            <button type="button" className="up-action-btn" onClick={() => downloadTemplate()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download template</span>
            </button>
            <button type="button" className="up-action-btn" onClick={() => downloadSample()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Download sample</span>
            </button>
          </div>
        </div>

        <div className="up-stepper-wrap">
          <ol className="stepper" aria-label="Upload steps">
            {STEPS.map((s, i) => (
              <li
                key={s.k}
                className={`${i === at ? 'is-on' : i < at ? 'is-done' : ''}${i < at ? ' is-clickable' : ''}`}
                aria-current={i === at ? 'step' : undefined}
                role={i < at ? 'button' : undefined}
                tabIndex={i < at ? 0 : undefined}
                onClick={() => {
                  if (i < at) goTo(s.k);
                }}
                onKeyDown={e => {
                  if (i < at && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    goTo(s.k);
                  }
                }}
                title={i < at ? `Go back to ${s.n}` : undefined}
              >
                <span className="step-dot">
                  {i < at ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="step-t">
                  <b>{s.n}</b>
                  <small>{s.s}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {location && (
          <div className="up-note">
            <div className="up-note-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div className="up-note-text">
              For Inventory site <strong className="up-note-site-badge">{location}</strong>: the DataCenters sheet should carry <Mono>{location}</Mono> in its LocationId column so the inventory appears on that site's Infrastructure tab.
            </div>
          </div>
        )}
      </Card>

      {err && (
        <div className="up-alert up-alert--error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{err}</span>
        </div>
      )}
      {busy && (
        <div className="up-alert up-alert--busy" role="status">
          <span className="spin" aria-hidden />
          <span>{busy}</span>
        </div>
      )}

      {step === 'client' && (
        <Card className="up-card">
          <div className="up-card-header">
            <div className="up-section-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Step 1 · Tenant Selection</span>
            </div>
            <h3 className="up-card-title">Whose inventory is this?</h3>
            <p className="up-card-desc">One upload writes one client's inventory. Data centers in the file must belong to this client.</p>
          </div>

          <div className="client-grid" role="radiogroup" aria-label="Client">
            {clients.map(c => {
              const dcs = store.data(c.id)?.entities.dataCenters.length ?? 0;
              const last = importHistory(c.id)[0];
              const isSelected = !creating && clientId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`client-card${isSelected ? ' is-on' : ''}`}
                  onClick={() => { setClientId(c.id); setCreating(false); }}
                >
                  <div className="client-card-top">
                    <span className="client-av" aria-hidden>{c.name.slice(0, 2).toUpperCase()}</span>
                    {isSelected && (
                      <span className="client-selected-badge">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Selected
                      </span>
                    )}
                  </div>
                  <span className="client-b">
                    <strong className="client-name">{c.name}</strong>
                    <span className="client-meta-line">
                      <span className="client-id-mono"><Mono>{c.id}</Mono></span>
                      {c.industry ? <span className="client-ind-badge">{c.industry}</span> : null}
                    </span>
                    <span className="client-stats">
                      <span className={`client-stat-dot${dcs > 0 ? ' is-active' : ''}`} aria-hidden="true" />
                      <span>{dcs} data center{dcs === 1 ? '' : 's'}{last ? ` · last upload ${new Date(last.at).toLocaleDateString()}` : ' · nothing uploaded yet'}</span>
                    </span>
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              role="radio"
              aria-checked={creating}
              className={`client-card client-card--new${creating ? ' is-on' : ''}`}
              onClick={() => setCreating(true)}
            >
              <div className="client-card-top">
                <span className="client-av client-av--new" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
                {creating && (
                  <span className="client-selected-badge client-selected-badge--new">
                    Active
                  </span>
                )}
              </div>
              <span className="client-b">
                <strong className="client-name">New client</strong>
                <span className="client-subtitle">Create a client to upload for</span>
              </span>
            </button>
          </div>

          {creating && (
            <div className="new-client-box">
              <div className="new-client-box-head">
                <div className="new-client-box-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>New Client Information</span>
                </div>
                <span className="new-client-box-hint">Enter tenant details to initialize inventory records</span>
              </div>

              <div className="new-client-fields">
                <div className="new-client-field">
                  <label className="nst-input-label" htmlFor="nc-id">
                    <span>Client ID <span className="req-star">*</span></span>
                    <span className="label-tip">Uppercase code</span>
                  </label>
                  <div className="nst-input-shell input-shell--enhanced">
                    <input
                      id="nc-id"
                      className="nst-input nst-input--mono"
                      value={nc.id}
                      onChange={e => setNc({ ...nc, id: e.target.value })}
                      placeholder="e.g. ACME"
                      autoFocus
                    />
                  </div>
                  <span className="field-hint-text">Must match ClientId in the DataCenters sheet.</span>
                </div>

                <div className="new-client-field">
                  <label className="nst-input-label" htmlFor="nc-name">
                    <span>Client / Company Name <span className="req-star">*</span></span>
                    <span className="label-tip">Display label</span>
                  </label>
                  <div className="nst-input-shell input-shell--enhanced">
                    <input
                      id="nc-name"
                      className="nst-input"
                      value={nc.name}
                      onChange={e => setNc({ ...nc, name: e.target.value })}
                      placeholder="e.g. Acme Cloud Services"
                    />
                  </div>
                  <span className="field-hint-text">Official organization or project title.</span>
                </div>

                <div className="new-client-field">
                  <label className="nst-input-label" htmlFor="nc-ind">
                    <span>Industry / Sector</span>
                    <span className="label-tip label-tip--optional">Optional</span>
                  </label>
                  <div className="nst-input-shell input-shell--enhanced">
                    <input
                      id="nc-ind"
                      className="nst-input"
                      value={nc.industry}
                      onChange={e => setNc({ ...nc, industry: e.target.value })}
                      placeholder="e.g. Cloud hosting, Telecom"
                    />
                  </div>
                  <span className="field-hint-text">Business domain or sector classification.</span>
                </div>
              </div>
            </div>
          )}

          <div className="up-foot">
            <button type="button" className="up-btn-cancel" onClick={goBackOne}>
              Cancel
            </button>
            <span className="grow" />
            <button
              type="button"
              className="up-btn-continue"
              onClick={chooseClient}
              disabled={creating ? !nc.id.trim() || !nc.name.trim() : !clientId}
            >
              <span>Continue to File Upload</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </Card>
      )}

      {step === 'file' && (
        <div className="up-file">
          <Card className="up-card up-file-card">
            <div className="up-card-header">
              <div className="up-section-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Step 2 · Source Selection</span>
              </div>
              <h3 className="up-card-title">Upload for {client?.name ?? clientId}</h3>
              <p className="up-card-desc">Sheets and CSV files are recognized automatically by layer names or column headers.</p>
            </div>

            <div
              className={`drop${over ? ' is-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={e => { e.preventDefault(); setOver(false); read([...e.dataTransfer.files]); }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload inventory file drop zone"
            >
              <div className="drop-ic-wrap" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>

              <strong className="drop-title">Drag and drop your file here</strong>

              <div className="drop-formats">
                <span className="format-badge format-badge--xlsx">
                  <span className="format-dot format-dot--xlsx" aria-hidden="true" />
                  .XLSX Workbook
                </span>
                <span className="format-badge format-badge--csv">
                  <span className="format-dot format-dot--csv" aria-hidden="true" />
                  .CSV Files
                </span>
              </div>

              <span className="drop-sub">One Excel workbook or multiple CSV files (one per layer) · Nothing is committed until you confirm</span>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                multiple
                hidden
                aria-label="Choose files"
                onChange={e => { read([...(e.target.files ?? [])]); e.target.value = ''; }}
              />

              <div className="drop-actions-row" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="up-btn-browse"
                  onClick={() => fileRef.current?.click()}
                  disabled={!!busy}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>Browse files</span>
                </button>

                <button
                  type="button"
                  className="up-btn-sample"
                  onClick={async () => read([await sampleFile()])}
                  disabled={!!busy}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Try sample workbook</span>
                </button>
              </div>
            </div>

            {/* Ingestion capabilities highlights to balance height & instill confidence */}
            <div className="upload-features-grid">
              <div className="upload-feature-item">
                <div className="feature-icon-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Smart Auto-Mapping</strong>
                  <span>Detects 40+ column aliases & layer names automatically</span>
                </div>
              </div>

              <div className="upload-feature-item">
                <div className="feature-icon-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Staging Safety Gate</strong>
                  <span>Validates in-memory; review every row before commit</span>
                </div>
              </div>

              <div className="upload-feature-item">
                <div className="feature-icon-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="6.01" y2="6"/>
                    <line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </div>
                <div className="feature-text">
                  <strong>Full DCIM Topology</strong>
                  <span>Ingests sites, racks, cabling, and power equipment</span>
                </div>
              </div>
            </div>

            <div className="up-foot">
              <div className="up-step-indicator-pill">
                <span>Step 2 of 5</span>
                <span className="dot-sep">·</span>
                <span className="client-tag">{client?.name ?? clientId}</span>
              </div>
            </div>
          </Card>

          <Card className="up-card up-spec-card">
            <div className="up-card-header">
              <div className="up-section-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>Data Specifications</span>
              </div>
              <h3 className="up-card-title">What to include</h3>
              <p className="up-card-desc">Download individual sheet templates as CSV, or use the full workbook from header.</p>
            </div>

            {/* Search and category filter pills */}
            <div className="spec-filter-bar">
              <div className="spec-search-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spec-search-icon" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="spec-search-input"
                  placeholder="Filter sheets (e.g. racks, ports, power)..."
                  value={specSearch}
                  onChange={e => setSpecSearch(e.target.value)}
                  aria-label="Filter sheets"
                />
                {specSearch && (
                  <button
                    type="button"
                    className="spec-search-clear"
                    onClick={() => setSpecSearch('')}
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="spec-filter-pills" role="tablist" aria-label="Sheet categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={specTab === 'all'}
                  className={`spec-pill${specTab === 'all' ? ' is-active' : ''}`}
                  onClick={() => setSpecTab('all')}
                >
                  All (16)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={specTab === 'needed'}
                  className={`spec-pill${specTab === 'needed' ? ' is-active' : ''}`}
                  onClick={() => setSpecTab('needed')}
                >
                  Needed to start (6)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={specTab === 'recommended'}
                  className={`spec-pill${specTab === 'recommended' ? ' is-active' : ''}`}
                  onClick={() => setSpecTab('recommended')}
                >
                  Recommended (7)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={specTab === 'optional'}
                  className={`spec-pill${specTab === 'optional' ? ' is-active' : ''}`}
                  onClick={() => setSpecTab('optional')}
                >
                  Optional (3)
                </button>
              </div>
            </div>

            <div className="sheet-groups-wrap">
              {filteredGroups.length === 0 ? (
                <div className="spec-empty-state">
                  <div className="spec-empty-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <p className="spec-empty-text">No sheets matching &ldquo;{specSearch}&rdquo;</p>
                  <button
                    type="button"
                    className="spec-empty-reset-btn"
                    onClick={() => { setSpecSearch(''); setSpecTab('all'); }}
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                filteredGroups.map(g => (
                  <div key={g.n} className="sheet-group">
                    <div className="sheet-group-h">
                      <div className="sheet-group-title-row">
                        <span className="sheet-group-badge">{g.n}</span>
                        <span className="sheet-group-count">{g.e.length} sheet{g.e.length === 1 ? '' : 's'}</span>
                      </div>
                      <small className="sheet-group-sub">{g.d}</small>
                    </div>
                    <ul className="sheet-list">
                      {g.e.map(k => {
                        const d = sheetByEntity(k);
                        return (
                          <li key={k} className="sheet-list-item">
                            <div className="sheet-icon-wrap" aria-hidden="true">
                              {getEntityIcon(k)}
                            </div>
                            <div className="sheet-info">
                              <div className="sheet-name-row">
                                <span className="sheet-name">{d.sheet}</span>
                                <span className="sheet-fields-badge">
                                  {d.fields.length} columns
                                </span>
                              </div>
                              <small className="sheet-desc">{d.desc}</small>
                            </div>
                            <button
                              type="button"
                              className="sheet-csv-btn"
                              onClick={() => downloadSheetCsv(d.sheet)}
                              aria-label={`Download ${d.sheet} CSV`}
                              title={`Download ${d.sheet} sample CSV`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              <span>CSV</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
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
            <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => goTo('file')}>Back</button>
            <span className="grow" />
            {blocked > 0 && <span className="issue-error small">{blocked} sheet{blocked > 1 ? 's' : ''} need a required column mapped</span>}
            <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={validate} disabled={!!busy || !plans.some(p => p.def)}>Validate</button>
          </div>
        </Card>
      )}

      {step === 'review' && staged && <Review staged={staged} client={client?.name ?? clientId} location={location} busy={!!busy}
        onRestart={restart} onConfirm={confirm} />}

      {step === 'done' && batch && staged && (
        <Card>
          <div className="done">
            <span className="done-ic" aria-hidden>✓</span>
            <h3>Inventory uploaded for {client?.name ?? clientId}</h3>
            <p className="muted small">Batch <Mono>{batch.id}</Mono> · {fmt(batch.created)} created · {fmt(batch.updated)} updated · {fmt(batch.unchanged)} unchanged · {fmt(batch.keptNotInFile)} kept (not in file){batch.warnings ? ` · ${fmt(batch.warnings)} warnings` : ''}</p>
            <div className="done-dcs">
              {staged.staged.dataCenters.map(dc => {
                const fromQuery = `&from=${encodeURIComponent(from ? `${from} · Import` : 'Import')}`;
                const locQuery = location || dc.locationId ? `&location=${encodeURIComponent(location || dc.locationId!)}` : '';
                return (
                  <button key={dc.id} type="button" className="client-card" onClick={() => nav(`/inventory/Datacenter/${encodeURIComponent(dc.id)}?client=${encodeURIComponent(batch.clientId)}${fromQuery}${locQuery}`)}>
                    <span className="client-av" aria-hidden>▦</span>
                    <span className="client-b"><strong>{dc.name}</strong><small><Mono>{dc.id}</Mono>{dc.locationId ? ` · location ${dc.locationId}` : ''}</small><small>Open inventory ›</small></span>
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => goTo('review')}>Back to review</button>
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

function Review({ staged, client, location, busy, onRestart, onConfirm }: {
  staged: StagedImport; client: string; location: string | null; busy: boolean; onRestart: () => void; onConfirm: () => void;
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
    <div className="review-view-container">
      {/* 1. Validation Status Banner */}
      <div className={`review-status-banner ${staged.ok ? 'review-status-banner--ok' : 'review-status-banner--error'}`}>
        <div className="review-banner-icon-wrap" aria-hidden="true">
          {staged.ok ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>

        <div className="review-banner-content">
          <div className="review-banner-title-row">
            <span className={`review-banner-badge ${staged.ok ? 'badge--ok' : 'badge--error'}`}>
              <span className="badge-dot" aria-hidden="true" />
              {staged.ok ? 'Validation Passed' : 'Ingestion Blocked'}
            </span>
            <strong className="review-banner-title">
              {staged.ok
                ? `Ready to ingest inventory for ${client}`
                : `${fmt(tot.errors)} validation error${tot.errors === 1 ? '' : 's'} must be resolved before uploading`}
            </strong>
          </div>
          <p className="review-banner-desc">
            {staged.ok
              ? `${fmt(tot.created)} new and ${fmt(tot.updated)} updated records will be saved. ${fmt(tot.keptNotInFile)} stored records not in this file are preserved.`
              : 'Fix them in your file and upload it again, or correct the column mapping.'}
            {tot.warnings > 0 && ` (${fmt(tot.warnings)} warning${tot.warnings === 1 ? '' : 's'} can be accepted).`}
          </p>
        </div>

        <div className="review-banner-actions">
          <button type="button" className="review-btn-secondary" onClick={onRestart}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload corrected file</span>
          </button>
        </div>
      </div>

      {/* 2. Target Location Advisory Banner */}
      {locMissing && (
        <div className="review-location-notice">
          <div className="notice-icon-wrap" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="notice-text">
            <strong>Location Alignment Advisory:</strong>
            <span>
              No data center site in this file has LocationId <Mono>{location}</Mono>. As a result, this uploaded inventory will not appear on site <strong>{location}</strong>'s Infrastructure tab. If this inventory belongs to that site, specify <Mono>{location}</Mono> in the LocationId column of the DataCenters sheet.
            </span>
          </div>
        </div>
      )}

      {/* 3. Executive KPI Metric Cards */}
      <div className="review-kpi-grid">
        <div className="review-kpi-card review-kpi-card--new">
          <div className="kpi-card-header">
            <span className="kpi-label">New Records</span>
            <div className="kpi-icon-badge kpi-badge--emerald">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value">{fmt(tot.created)}</div>
          <span className="kpi-tag kpi-tag--emerald">To be created</span>
        </div>

        <div className="review-kpi-card review-kpi-card--updated">
          <div className="kpi-card-header">
            <span className="kpi-label">Updated Records</span>
            <div className="kpi-icon-badge kpi-badge--blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value">{fmt(tot.updated)}</div>
          <span className="kpi-tag kpi-tag--blue">Fields will modify</span>
        </div>

        <div className="review-kpi-card review-kpi-card--unchanged">
          <div className="kpi-card-header">
            <span className="kpi-label">Unchanged</span>
            <div className="kpi-icon-badge kpi-badge--slate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value">{fmt(tot.unchanged)}</div>
          <span className="kpi-tag kpi-tag--slate">Identical records</span>
        </div>

        <div className="review-kpi-card review-kpi-card--kept">
          <div className="kpi-card-header">
            <span className="kpi-label">Kept (Not in File)</span>
            <div className="kpi-icon-badge kpi-badge--slate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value">{fmt(tot.keptNotInFile)}</div>
          <span className="kpi-tag kpi-tag--slate">Existing retained</span>
        </div>

        <div className={`review-kpi-card review-kpi-card--errors ${tot.errors > 0 ? 'is-alerting' : ''}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Validation Errors</span>
            <div className={`kpi-icon-badge ${tot.errors > 0 ? 'kpi-badge--rose' : 'kpi-badge--emerald'}`}>
              {tot.errors > 0 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
          <div className={`kpi-value ${tot.errors > 0 ? 'value--rose' : ''}`}>{fmt(tot.errors)}</div>
          <span className={`kpi-tag ${tot.errors > 0 ? 'kpi-tag--rose' : 'kpi-tag--emerald'}`}>
            {tot.errors > 0 ? 'Blocking upload' : 'Zero errors'}
          </span>
        </div>

        <div className={`review-kpi-card review-kpi-card--warnings ${tot.warnings > 0 ? 'is-warning' : ''}`}>
          <div className="kpi-card-header">
            <span className="kpi-label">Warnings</span>
            <div className={`kpi-icon-badge ${tot.warnings > 0 ? 'kpi-badge--amber' : 'kpi-badge--slate'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div className={`kpi-value ${tot.warnings > 0 ? 'value--amber' : ''}`}>{fmt(tot.warnings)}</div>
          <span className={`kpi-tag ${tot.warnings > 0 ? 'kpi-tag--amber' : 'kpi-tag--slate'}`}>
            {tot.warnings > 0 ? 'Advisory only' : 'Zero warnings'}
          </span>
        </div>
      </div>

      {/* 4. Main Two-Column Breakdown Grid */}
      <div className="review-main-grid">
        {/* Left Column: Changes by sheet */}
        <Card className="review-section-card review-diff-card">
          <div className="review-card-head">
            <div className="review-head-info">
              <div className="up-section-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Entity Breakdown</span>
              </div>
              <h3 className="review-card-title">Changes by sheet</h3>
              <p className="review-card-sub">Overview of records staged across each topology layer.</p>
            </div>
            <span className="sheet-affected-chip">{changed.length} sheets affected</span>
          </div>

          <div className="review-table-container">
            <table className="review-diff-table">
              <thead>
                <tr>
                  <th>Sheet</th>
                  <th className="num">New</th>
                  <th className="num">Updated</th>
                  <th className="num">Unchanged</th>
                  <th className="num">Kept</th>
                </tr>
              </thead>
              <tbody>
                {changed.map(k => {
                  const d = staged.diff[k];
                  const sheetDef = sheetByEntity(k);
                  const isExpanded = openK === k;
                  return [
                    <tr key={k} className="review-sheet-row">
                      <td className="sheet-name-cell">
                        <div className="sheet-cell-inner">
                          <span className="sheet-cell-icon" aria-hidden="true">
                            {getEntityIcon(k)}
                          </span>
                          {d.updated.length > 0 ? (
                            <button
                              type="button"
                              className="sheet-diff-toggle-btn"
                              onClick={() => setOpenK(isExpanded ? null : k)}
                              aria-expanded={isExpanded}
                            >
                              <span>{sheetDef.sheet}</span>
                              <span className="toggle-indicator">{isExpanded ? '▴' : '▾'}</span>
                            </button>
                          ) : (
                            <span className="sheet-title-text">{sheetDef.sheet}</span>
                          )}
                        </div>
                      </td>
                      <td className="num">
                        {d.created.length > 0 ? (
                          <span className="diff-count-pill diff-count-pill--new">+{fmt(d.created.length)}</span>
                        ) : (
                          <span className="diff-count-zero">0</span>
                        )}
                      </td>
                      <td className="num">
                        {d.updated.length > 0 ? (
                          <span className="diff-count-pill diff-count-pill--updated">{fmt(d.updated.length)}</span>
                        ) : (
                          <span className="diff-count-zero">0</span>
                        )}
                      </td>
                      <td className="num">
                        {d.unchanged.length > 0 ? (
                          <span className="diff-count-pill diff-count-pill--unchanged">{fmt(d.unchanged.length)}</span>
                        ) : (
                          <span className="diff-count-zero">0</span>
                        )}
                      </td>
                      <td className="num">
                        {d.keptNotInFile.length > 0 ? (
                          <span className="diff-count-pill diff-count-pill--kept">{fmt(d.keptNotInFile.length)}</span>
                        ) : (
                          <span className="diff-count-zero">0</span>
                        )}
                      </td>
                    </tr>,
                    isExpanded ? (
                      <tr key={`${k}-x`} className="review-diff-expand-row">
                        <td colSpan={5}>
                          <div className="diff-expand-inner">
                            <div className="diff-expand-header">
                              <strong>Modified fields in {sheetDef.sheet} ({d.updated.length} records)</strong>
                              <small>Comparing staged spreadsheet against stored database records</small>
                            </div>
                            <table className="diff-sub-table">
                              <thead>
                                <tr>
                                  <th>Record ID</th>
                                  <th>Field</th>
                                  <th>Stored Value</th>
                                  <th>Staged Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.updated.flatMap(u =>
                                  u.changes.map(c => (
                                    <tr key={`${u.id}-${c.key}`}>
                                      <td><Mono>{u.id}</Mono></td>
                                      <td><span className="diff-field-name">{c.key}</span></td>
                                      <td><span className="diff-val-before">{String(c.before ?? '—')}</span></td>
                                      <td><span className="diff-val-after">{String(c.after ?? '—')}</span></td>
                                    </tr>
                                  ))
                                ).slice(0, 200)}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null
                  ];
                })}
              </tbody>
              <tfoot>
                <tr className="review-table-totals-row">
                  <td><strong>Total Staged</strong></td>
                  <td className="num"><strong>+{fmt(tot.created)}</strong></td>
                  <td className="num"><strong>{fmt(tot.updated)}</strong></td>
                  <td className="num"><strong>{fmt(tot.unchanged)}</strong></td>
                  <td className="num"><strong>{fmt(tot.keptNotInFile)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Right Column: Validation Issues */}
        <Card className="review-section-card review-issues-card">
          <div className="review-card-head">
            <div className="review-head-info">
              <div className="up-section-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Validation Inspection</span>
              </div>
              <h3 className="review-card-title">Issues & Warnings</h3>
              <p className="review-card-sub">
                {staged.issues.length === 0
                  ? 'All rows and relationships passed verification.'
                  : `${fmt(tot.errors)} error${tot.errors === 1 ? '' : 's'} · ${fmt(tot.warnings)} warning${tot.warnings === 1 ? '' : 's'}`}
              </p>
            </div>
            {staged.issues.length > 0 && (
              <button
                type="button"
                className="review-csv-btn"
                onClick={csv}
                title="Download issues as CSV"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download CSV</span>
              </button>
            )}
          </div>

          {staged.issues.length > 0 ? (
            <>
              <div className="review-issues-toolbar">
                <div className="review-filter-tabs" role="group" aria-label="Filter issues">
                  <button
                    type="button"
                    className={`filter-tab${filter === 'all' ? ' is-active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All <span className="tab-count-pill">{staged.issues.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`filter-tab filter-tab--error${filter === 'error' ? ' is-active' : ''}`}
                    onClick={() => setFilter('error')}
                  >
                    Errors <span className="tab-count-pill tab-count-pill--error">{tot.errors}</span>
                  </button>
                  <button
                    type="button"
                    className={`filter-tab filter-tab--warning${filter === 'warning' ? ' is-active' : ''}`}
                    onClick={() => setFilter('warning')}
                  >
                    Warnings <span className="tab-count-pill tab-count-pill--warning">{tot.warnings}</span>
                  </button>
                </div>

                <div className="review-issue-search-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    className="review-issue-search-input"
                    placeholder="Search by sheet, column, ID or error message..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    aria-label="Search issues"
                  />
                  {q && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setQ('')}
                      aria-label="Clear issue search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="review-issues-scroll">
                {bySheet.length ? (
                  bySheet.map(([sheet, list]) => (
                    <div key={sheet} className="review-issue-group">
                      <div className="review-issue-group-header">
                        <div className="group-title-row">
                          <span className="group-sheet-badge">{sheet}</span>
                          <span className="group-sheet-count">{list.length} issue{list.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="issue-cards-list">
                        {list.map((x, i) => (
                          <div key={i} className={`review-issue-item review-issue-item--${x.severity}`}>
                            <div className="issue-item-severity-badge">
                              {x.severity === 'error' ? 'ERROR' : 'WARNING'}
                            </div>
                            <div className="issue-item-body">
                              <div className="issue-location-row">
                                <span className="issue-loc-chip">
                                  {x.row ? `Row ${x.row}` : 'Sheet level'}
                                </span>
                                {x.col && <span className="issue-col-chip">Column: {x.col}</span>}
                                {x.id && <span className="issue-id-chip"><Mono>{x.id}</Mono></span>}
                              </div>
                              <p className="issue-message-text">{x.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="issues-empty-filter">
                    <p className="empty-filter-title">No issues matching &ldquo;{q}&rdquo;</p>
                    <button type="button" className="empty-filter-btn" onClick={() => { setQ(''); setFilter('all'); }}>
                      Reset filters
                    </button>
                  </div>
                )}
                {issues.length > MAX_ISSUES && (
                  <div className="issues-overflow-note">
                    Showing top {MAX_ISSUES} of {fmt(issues.length)} issues. Download the CSV above to view all.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="review-zero-issues">
              <div className="zero-issues-icon-wrap" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h4>All Checks Passed</h4>
              <p>Every row in your workbook complies with schema rules and relational foreign keys.</p>
            </div>
          )}
        </Card>
      </div>

      {/* 5. Sticky / Docked Executive Footer */}
      <div className="review-action-dock">
        <div className="dock-left-actions">
          <button type="button" className="review-dock-btn" onClick={onRestart}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload a corrected file</span>
          </button>
        </div>

        <div className="dock-status-summary">
          {!staged.ok ? (
            <span className="dock-status-tag dock-status-tag--error">
              <span className="status-dot status-dot--error" />
              {fmt(tot.errors)} error{tot.errors === 1 ? '' : 's'} must be resolved before ingestion
            </span>
          ) : (
            <span className="dock-status-tag dock-status-tag--ok">
              <span className="status-dot status-dot--ok" />
              {fmt(tot.created + tot.updated)} records verified and ready to commit
            </span>
          )}
        </div>

        <div className="dock-right-actions">
          <button
            type="button"
            className="review-commit-btn"
            onClick={onConfirm}
            disabled={!staged.ok || busy}
          >
            {busy ? (
              <span>Ingesting into DCIM…</span>
            ) : staged.ok ? (
              <>
                <span>Commit {fmt(tot.created + tot.updated)} Changes</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Fix Errors to Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
