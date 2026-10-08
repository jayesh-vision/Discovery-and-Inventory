/* ── DCIM data access for screens ─────────────────────────────────────────
   The only module DCIM screens import for data. Each function names the
   REST endpoint a backend would serve; today they resolve against the
   browser store (store.ts). Swapping in a backend means replacing these
   bodies and keeping the signatures (same idea as the reference prototype's
   src/api/index.ts). */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { DcimStore } from './store';
import { planSheets, readCsv, readWorkbook, type RawSheet, type SheetPlan } from './parse';
import { stageImport, type StagedImport } from './reconcile';
import { buildSample } from './sample';
import { buildSiteSample, type SiteInfo } from './siteSample';
import { buildWorkbook, exportRows, sheetCsv } from './template';
import { linkCandidates, type DiscoveredRef, type InventoryRef } from './discoveryLink';
import type { Client, ClientData, DiscoveryLink } from './model';
import { PHY } from '../data/physical';
import { DOMAIN_DEVICES } from '../data/domainDevices';
import { NE_CLASSES } from '../data/ledger';

export const store = new DcimStore();

/** re-render on any store change */
export function useStoreVersion() {
  return useSyncExternalStore(cb => store.subscribe(cb), () => store.getVersion(), () => 0);
}
export function useClients(): Client[] { useStoreVersion(); return store.clients(); }
export function useClientData(clientId: string | null | undefined): ClientData | undefined {
  useStoreVersion();
  return clientId ? store.data(clientId) : undefined;
}

/* ---- clients ---- */
export const listClients = async () => store.clients();                                              // GET /dcim/clients
export const saveClient = async (c: Client) => store.upsertClient(c);                                // PUT /dcim/clients/:id
export const importHistory = (clientId?: string) => store.batches(clientId);                          // GET /dcim/imports?client

/* ---- import pipeline ---- */
export async function readFiles(files: File[]): Promise<RawSheet[]> {                                  // (client side) parse before POST
  const out: RawSheet[] = [];
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith('.xlsx')) out.push(...await readWorkbook(await f.arrayBuffer()));
    else if (name.endsWith('.csv')) out.push(readCsv(await f.text(), f.name));
    else throw new Error(`${f.name}: only .xlsx and .csv files can be imported.`);
  }
  return out;
}
export const plan = (raws: RawSheet[]) => planSheets(raws);
export const stage = (clientId: string, clientName: string | undefined, fileName: string, plans: SheetPlan[]): StagedImport => // POST /dcim/clients/:id/imports (dry run)
  stageImport({ clientId, clientName, fileName, plans, existing: store.data(clientId) });
export const commitImport = async (s: StagedImport) => store.commit(s);                               // POST /dcim/clients/:id/imports/:batch/confirm

/* ---- existing Discovery & Inventory records, for linking ---- */
export function inventoryRefs(): InventoryRef[] {
  return NE_CLASSES.flatMap(cls => PHY[cls]).map(r => ({ name: r.name, sn: r.sn, ip: r.ip, ip2: r.ip2, model: r.model, oem: r.oem, loc: r.loc }));
}
export function discoveredRefs(): DiscoveredRef[] {
  return DOMAIN_DEVICES.map(d => ({ id: d.id, name: d.name, ip: d.ip, domain: d.domain, region: d.region }));
}
export function candidatesFor(clientId: string) {                                                    // GET /dcim/clients/:id/link-candidates
  const d = store.data(clientId);
  return d ? linkCandidates(d.entities.devices, inventoryRefs(), discoveredRefs()) : [];
}
export const confirmLink = async (clientId: string, l: DiscoveryLink) => store.link(clientId, l);    // POST /dcim/clients/:id/links
export const removeLink = async (clientId: string, deviceId: string, target: DiscoveryLink['target']) => store.unlink(clientId, deviceId, target); // DELETE …

/* ---- downloads ---- */
const sampleRefs = () => ({
  inventory: NE_CLASSES.flatMap(c => PHY[c]).filter(r => r.sn && r.ip).slice(0, 2).map(r => ({ sn: r.sn, ip: r.ip })),
  discovered: DOMAIN_DEVICES.filter(d => d.ip).slice(0, 1).map(d => ({ ip: d.ip }))
});
function save(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export async function downloadTemplate() { save(await buildWorkbook(buildSample('mini')), 'dcim-import-template.xlsx', XLSX); }
export async function downloadSample() { save(await buildWorkbook(buildSample('full', sampleRefs())), 'dcim-sample-acme.xlsx', XLSX); }
/** the data center's current records in the template format — edit and re-upload to update */
export async function downloadInventory(clientId: string, dcId: string) {
  const d = store.data(clientId); if (!d) return;
  save(await buildWorkbook(exportRows(d.entities, dcId)), `${dcId}-inventory.xlsx`, XLSX);
}
/** an example workbook for one Inventory site: its own network elements in racks, with power, cooling, cabling and sensors */
export async function downloadSiteExample(site: SiteInfo) { save(await buildWorkbook(buildSiteSample(site)), `${site.id}-example-inventory.xlsx`, XLSX); }
export function downloadSheetCsv(sheet: string) { save(sheetCsv(sheet, buildSample('mini')), `${sheet}.csv`, 'text/csv'); }
/** the sample workbook as a File, for "try it with the sample" in the wizard — same path as an upload */
export async function sampleFile(): Promise<File> {
  return new File([await buildWorkbook(buildSample('full', sampleRefs()))], 'dcim-sample-acme.xlsx', { type: XLSX });
}

/** a value that loads once (async helpers in effects) */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data?: T; error?: string; loading: boolean } {
  const [s, setS] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let live = true;
    setS({ loading: true });
    fn().then(data => live && setS({ data, loading: false }), (e: Error) => live && setS({ error: e.message, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}
