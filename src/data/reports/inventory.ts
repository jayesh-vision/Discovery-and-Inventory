/* ── Inventory reports ──────────────────────────────────────
   Estate totals come only from the ledger (IL, EST, PHY_MATRIX, STOCK_ST,
   PHY_TABS) — "nothing derives a total from an array length". Row-level
   detail comes from the element register (PHY), the archive (DECOMM), the
   location roster and the facility ledger, and is labelled as such: the
   register's per-model lifecycle and port figures are a catalogue view and
   are never summed into an estate total that would contradict EST. */

import {
  EST, IL, NE_CLASSES, PHY_MATRIX, PHY_TABS, RSTATE, SRC, STOCK_ST, classMeta, stockTotal,
  type NeClass, type RecState, type Source
} from '../ledger';
import { PHY, complianceOf, eosOf, regionOf } from '../physical';
import { DECOMM, DECOMM_OLDEST, DECOMM_ZOMBIES, TODAY, parseDmy } from '../archive';
import { LOCATIONS } from '../locations';
import { facilityOf, portTotals, totalLoad, uTotals } from '../facility';
import { type ReportBuilder, TONE_HEX, countBy, fmtNum, pct, plural, r1, sum } from './model';

const cv = (tone: string, shade: number) => `var(--vw-color-${tone}-${shade})`;

const CLASS_HEX: Record<NeClass, string> = {
  router: 'var(--vw-color-blue-400)', switch: 'var(--vw-color-teal-400)', server: 'var(--vw-color-violet-400)',
  dwdm: 'var(--vw-color-pink-400)', enodeb: 'var(--vw-color-amber-400)', gnodeb: 'var(--vw-color-orange-400)'
};
const name = (k: NeClass) => classMeta(k).n;
const activeOf = (k: NeClass) => classMeta(k).c;
const register = NE_CLASSES.flatMap(k => PHY[k].map(r => ({ ...r, cls: k })));
const physicalLink = (k: NeClass, stock?: string) => ({ key: 'physical', q: `cls=${k}${stock ? `&stock=${stock}` : ''}` });

/* ── IN-01 Inventory estate executive summary ────────────── */
const estate: ReportBuilder = () => {
  const discPct = r1(pct(IL.discovered, IL.ne));
  const portPct = r1(pct(EST.ports.used, EST.ports.total));
  const assessed = EST.compliance.compliant + EST.compliance.behind + EST.compliance.unknown;
  const deployed = STOCK_ST.find(s => s.k === 'deployed')!.c;
  const faulty = STOCK_ST.find(s => s.k === 'faulty')!.c;
  const routerShare = Math.round(pct(activeOf('router'), IL.ne));

  return {
    headline: { value: IL.ne, fmt: 'num', label: 'active network elements under management', tone: 'sky' },
    summary: `The estate holds ${fmtNum(IL.ne)} active network elements across ${fmtNum(IL.locations)} locations (${IL.central} central, ${IL.regional} regional, ${fmtNum(IL.edge)} edge), connected by ${fmtNum(IL.links)} links and carrying ${fmtNum(IL.services)} services and ${IL.vnf} virtual network functions. Routers are ${routerShare}% of the estate. ${fmtNum(deployed)} elements are deployed, ${faulty} faulty or with the OEM, and ${fmtNum(IL.inactive)} decommissioned records are archived. ${fmtNum(IL.discovered)} elements (${discPct}%) are verified by discovery. Lifecycle risk is material: ${EST.eol.past} elements are past end of support, ${EST.eol.within12} more reach it within 12 months, and ${EST.compliance.behind} are behind the software baseline. Ports are ${portPct}% utilised.`,
    findings: [
      { tone: 'crit', title: `${EST.eol.past} elements past end of support`, detail: `A further ${EST.eol.within12} reach end of support within 12 months — ${r1(pct(EST.eol.past + EST.eol.within12, IL.ne))}% of the active estate needs a refresh plan.` },
      { tone: 'warn', title: `${fmtNum(EST.compliance.behind)} elements behind the software baseline`, detail: `${r1(pct(EST.compliance.behind, assessed))}% of ${fmtNum(assessed)} assessed; ${EST.compliance.unknown} could not be assessed.` },
      { tone: 'info', title: `${fmtNum(IL.ne - IL.discovered)} elements are not verified by discovery`, detail: 'Servers, DWDM and RAN nodes are recorded manually or from EMS feeds and have no discovery adapter.' },
      { tone: faulty > EST.spares.instore ? 'warn' : 'good', title: `${faulty} faulty against ${EST.spares.instore} spares in store`, detail: `${EST.spares.rma} with the OEM under RMA and ${EST.spares.intransit} in transit. See Stock position & spares cover.` }
    ],
    kpis: [
      { title: 'Active network elements', definition: 'Planned, in-store, deployed and faulty elements — everything not decommissioned.', value: IL.ne, fmt: 'num', of: `${fmtNum(IL.inactive)} archived`, tone: 'sky',
        delta: { text: `${fmtNum(deployed)} deployed`, better: null },
        visual: { kind: 'segments', parts: STOCK_ST.filter(s => s.k !== 'decomm').map(s => ({ n: s.n, c: s.c, hex: cv(s.tone, 400) })), total: IL.ne } },
      { title: 'Locations', definition: 'Sites in the location roster, by tier.', value: IL.locations, fmt: 'num', of: 'central · regional · edge', tone: 'emerald',
        delta: { text: `${fmtNum(IL.edge)} edge sites`, better: null },
        visual: { kind: 'segments', parts: [{ n: 'Central', c: IL.central, hex: cv('emerald', 600) }, { n: 'Regional', c: IL.regional, hex: cv('emerald', 400) }, { n: 'Edge', c: IL.edge, hex: cv('emerald', 200) }], total: IL.locations } },
      { title: 'Verified by discovery', definition: 'Active elements whose record discovery has confirmed on the network.', value: discPct, fmt: 'pct', of: `${fmtNum(IL.discovered)} of ${fmtNum(IL.ne)}`, tone: 'cyan',
        delta: { text: `${fmtNum(IL.ne - IL.discovered)} not verified`, better: false },
        visual: { kind: 'against', value: IL.discovered, limit: IL.ne } },
      { title: 'Port utilisation', definition: 'Used ports ÷ installed ports across all active elements.', value: portPct, fmt: 'pct', of: `${fmtNum(EST.ports.free)} free`, tone: 'amber',
        delta: { text: `${fmtNum(EST.ports.used)} of ${fmtNum(EST.ports.total)} used`, better: null },
        visual: { kind: 'against', value: EST.ports.used, limit: EST.ports.total } }
    ],
    visuals: [
      { kind: 'bars', title: 'Active elements by class', sub: `${fmtNum(IL.ne)} total`, fmt: 'num',
        rows: PHY_TABS.map(t => ({ label: t.n, value: t.c, hex: CLASS_HEX[t.k], sub: `${r1(pct(t.c, IL.ne))}% of estate` })) },
      { kind: 'donut', title: 'Stock state', sub: 'Active and archived', total: sum(STOCK_ST, s => s.c), label: 'elements',
        slices: STOCK_ST.map(s => ({ k: s.k, n: s.n, c: s.c, hex: cv(s.tone, 400) })) },
      { kind: 'composition', title: 'Software compliance', sub: `${fmtNum(assessed)} elements assessed`,
        parts: [{ n: 'On baseline', c: EST.compliance.compliant, hex: TONE_HEX.success }, { n: 'Behind baseline', c: EST.compliance.behind, hex: TONE_HEX.warning }, { n: 'Unknown', c: EST.compliance.unknown, hex: TONE_HEX.neutral }] },
      { kind: 'composition', title: 'End-of-support exposure', sub: 'Active elements',
        parts: [{ n: 'Past end of support', c: EST.eol.past, hex: TONE_HEX.error }, { n: 'Within 12 months', c: EST.eol.within12, hex: TONE_HEX.warning }, { n: 'Supported beyond 12 months', c: IL.ne - EST.eol.past - EST.eol.within12, hex: TONE_HEX.success }] },
      { kind: 'bars', span: 2, title: 'Network footprint', sub: 'Ledger totals', fmt: 'num',
        rows: [
          { label: 'Links', value: IL.links, hex: cv('blue', 400) }, { label: 'Services', value: IL.services, hex: cv('teal', 400) },
          { label: 'Active network elements', value: IL.ne, hex: cv('sky', 400) }, { label: 'Locations', value: IL.locations, hex: cv('emerald', 400) },
          { label: 'Decommissioned records', value: IL.inactive, hex: cv('slate', 300) }, { label: 'Virtual network functions', value: IL.vnf, hex: cv('violet', 400) }
        ] }
    ],
    actions: [
      { priority: 'P1', action: `Fund a replacement plan for the ${EST.eol.past} elements past end of support`, owner: 'Head of Network Planning', impact: 'Removes unsupported hardware from the live estate' },
      { priority: 'P2', action: `Run a software upgrade campaign for the ${fmtNum(EST.compliance.behind)} elements behind baseline`, owner: 'Network engineering', impact: `+${r1(pct(EST.compliance.behind, assessed))} pt compliance` },
      { priority: 'P2', action: `Order spares to cover the ${faulty - EST.spares.instore} faulty elements not covered by stock`, owner: 'Stores & logistics', impact: 'Restores spare cover for field swaps' },
      { priority: 'P3', action: 'Add discovery adapters for server, DWDM and RAN classes', owner: 'Discovery engineering', impact: `Verifies up to ${fmtNum(IL.ne - IL.discovered)} more elements` }
    ],
    table: {
      title: 'Estate by equipment class', sub: 'Stock position per class; select a row to open Physical Resources',
      columns: [
        { key: 'cls', header: 'Class' }, { key: 'planned', header: 'Planned', fmt: 'num', right: true }, { key: 'instore', header: 'In store', fmt: 'num', right: true },
        { key: 'deployed', header: 'Deployed', fmt: 'num', right: true }, { key: 'faulty', header: 'Faulty / RMA', fmt: 'num', right: true },
        { key: 'active', header: 'Active', fmt: 'num', right: true }, { key: 'decomm', header: 'Decommissioned', fmt: 'num', right: true },
        { key: 'share', header: 'Share of estate', fmt: 'pct', right: true }, { key: 'disc', header: 'Discovered', fmt: 'num', right: true }
      ],
      rows: NE_CLASSES.map(k => ({
        id: k, link: physicalLink(k),
        cells: { cls: name(k), planned: PHY_MATRIX[k].planned, instore: PHY_MATRIX[k].instore, deployed: PHY_MATRIX[k].deployed, faulty: PHY_MATRIX[k].faulty, active: activeOf(k), decomm: PHY_MATRIX[k].decomm, share: r1(pct(activeOf(k), IL.ne)), disc: classMeta(k).disc }
      })),
      empty: 'No equipment classes.'
    },
    methodology: [
      { term: 'Source of totals', definition: 'Every total in this report is read from the inventory ledger, the same figures every Inventory screen shows.' },
      { term: 'Active element', definition: 'Any element in the planned, in-store, deployed or faulty stock state.' },
      { term: 'Verified by discovery', definition: 'The element’s record was confirmed on the live network by the most recent discovery cycle.' },
      { term: 'End of support', definition: 'The OEM’s published end-of-support date for the element’s model.' }
    ]
  };
};

/* ── IN-02 Stock position & spares cover ─────────────────── */
const stock: ReportBuilder = () => {
  const faulty = stockTotal('faulty'), instore = stockTotal('instore'), planned = stockTotal('planned'), deployed = stockTotal('deployed');
  const rows = NE_CLASSES.map(k => {
    const m = PHY_MATRIX[k], active = activeOf(k);
    const cover = m.faulty ? m.instore / m.faulty : null;
    return { k, m, active, faultRate: r1(pct(m.faulty, active)), cover, status: m.faulty && !m.instore ? 'No cover' : cover !== null && cover < 1 ? 'Thin cover' : 'Covered' };
  });
  const noCover = rows.filter(r => r.status === 'No cover');
  const worstRate = [...rows].sort((a, b) => b.faultRate - a.faultRate)[0];

  return {
    headline: { value: faulty, fmt: 'num', label: `faulty or with the OEM against ${instore} spares in store`, tone: 'amber', better: 'down' },
    summary: `${fmtNum(deployed)} elements are deployed, ${planned} are planned, ${instore} are in store and ${faulty} are faulty or with the OEM. Spare cover is thin: ${instore} spares in store against ${faulty} faulty elements (${(instore / faulty).toFixed(2)} spares per fault), with ${EST.spares.rma} units under RMA and ${EST.spares.intransit} in transit. ${noCover.map(r => name(r.k)).join(' and ')} ${noCover.length === 1 ? 'has' : 'have'} faulty units and no spare at all. The highest fault rate is ${name(worstRate.k)} at ${worstRate.faultRate}% of its active population.`,
    findings: [
      { tone: 'crit', title: `${noCover.length} classes with a fault and no spare`, detail: noCover.map(r => `${name(r.k)}: ${r.m.faulty} faulty, 0 in store`).join(' · ') },
      { tone: 'warn', title: `${(instore / faulty).toFixed(2)} spares per faulty element`, detail: `${instore} in store vs ${faulty} faulty; ${EST.spares.rma} out under RMA will partially restore cover when they return.` },
      { tone: 'info', title: `${name(worstRate.k)} fails most often (${worstRate.faultRate}%)`, detail: rows.map(r => `${name(r.k)} ${r.faultRate}%`).join(' · ') },
      { tone: 'info', title: `${planned} elements planned`, detail: `${rows.filter(r => r.m.planned).map(r => `${name(r.k)} ${r.m.planned}`).join(' · ')}` }
    ],
    kpis: [
      { title: 'Deployed', definition: 'Elements installed and in service.', value: deployed, fmt: 'num', of: `${r1(pct(deployed, IL.ne))}% of active`, tone: 'emerald',
        delta: { text: `${planned} planned`, better: null } },
      { title: 'Faulty / RMA', definition: 'Elements reported faulty or returned to the OEM.', value: faulty, fmt: 'num', of: `${r1(pct(faulty, IL.ne))}% of active`, tone: 'amber',
        delta: { text: `${EST.spares.rma} under RMA`, better: false },
        visual: { kind: 'segments', parts: rows.filter(r => r.m.faulty).map(r => ({ n: name(r.k), c: r.m.faulty, hex: CLASS_HEX[r.k] })), total: faulty } },
      { title: 'Spares in store', definition: 'Serviceable spare elements held in stores.', value: instore, fmt: 'num', of: `${EST.spares.intransit} in transit`, tone: 'cyan',
        delta: { text: `${(instore / faulty).toFixed(2)} per faulty element`, better: false },
        visual: { kind: 'against', value: instore, limit: faulty } },
      { title: 'Classes without cover', definition: 'Equipment classes with faulty units and no spare in store.', value: noCover.length, fmt: 'num', of: `of ${NE_CLASSES.length} classes`, tone: 'red',
        delta: { text: noCover.map(r => name(r.k)).join(', '), better: false } }
    ],
    visuals: [
      { kind: 'heat', span: 2, title: 'Class × stock state', sub: 'Element counts; darker holds more', fmt: 'num',
        rows: NE_CLASSES.map(name), cols: STOCK_ST.map(s => s.n), values: NE_CLASSES.map(k => STOCK_ST.map(s => PHY_MATRIX[k][s.k])) },
      { kind: 'bars', title: 'Fault rate by class', sub: 'Faulty ÷ active elements', fmt: 'pct',
        rows: [...rows].sort((a, b) => b.faultRate - a.faultRate).map(r => ({ label: name(r.k), value: r.faultRate, hex: CLASS_HEX[r.k], sub: `${r.m.faulty} of ${fmtNum(r.active)}` })) },
      { kind: 'bars', title: 'Spare pipeline', sub: 'Units', fmt: 'num',
        rows: [
          { label: 'In store', value: EST.spares.instore, hex: TONE_HEX.cyan },
          { label: 'With OEM under RMA', value: EST.spares.rma, hex: TONE_HEX.warning },
          { label: 'In transit', value: EST.spares.intransit, hex: TONE_HEX.info },
          { label: 'Faulty (demand)', value: faulty, hex: TONE_HEX.error }
        ] }
    ],
    actions: [
      { priority: 'P1', action: `Order at least one spare for ${noCover.map(r => name(r.k)).join(' and ')}`, owner: 'Stores & logistics', impact: 'No class left without a swap unit' },
      { priority: 'P1', action: `Chase the ${EST.spares.rma} RMA returns and the ${EST.spares.intransit} in transit`, owner: 'Vendor management', impact: `Up to ${EST.spares.rma + EST.spares.intransit} units back into stores` },
      { priority: 'P2', action: `Root-cause the ${name(worstRate.k)} fault rate (${worstRate.faultRate}%) with the OEM`, owner: 'Network engineering', impact: 'Reduces future spares demand' }
    ],
    table: {
      title: 'Stock and spare cover by class', sub: 'Select a row to open that class in Physical Resources',
      columns: [
        { key: 'cls', header: 'Class' }, { key: 'planned', header: 'Planned', fmt: 'num', right: true }, { key: 'instore', header: 'In store', fmt: 'num', right: true },
        { key: 'deployed', header: 'Deployed', fmt: 'num', right: true }, { key: 'faulty', header: 'Faulty / RMA', fmt: 'num', right: true },
        { key: 'rate', header: 'Fault rate', fmt: 'pct', right: true }, { key: 'cover', header: 'Spares per fault', fmt: 'ratio', right: true },
        { key: 'status', header: 'Spare cover', fmt: 'chip', tones: { 'No cover': 'error', 'Thin cover': 'warning', Covered: 'success' } }
      ],
      rows: rows.map(r => ({ id: r.k, link: physicalLink(r.k, 'instore,faulty'), cells: { cls: name(r.k), planned: r.m.planned, instore: r.m.instore, deployed: r.m.deployed, faulty: r.m.faulty, rate: r.faultRate, cover: r.cover, status: r.status } })),
      facet: 'status', empty: 'No classes.'
    },
    methodology: [
      { term: 'Fault rate', definition: 'Faulty / RMA elements ÷ active elements of that class.' },
      { term: 'Spares per fault', definition: 'In-store spares ÷ faulty elements. Below 1.00 not every fault can be swapped from stock.' },
      { term: 'Spare cover', definition: 'No cover: faulty units and zero spares. Thin cover: fewer spares than faults. Covered: at least one spare per fault.' }
    ]
  };
};

/* ── IN-03 Hardware lifecycle risk ───────────────────────── */
const lifecycle: ReportBuilder = () => {
  const models = countBy(register, r => r.model).map(([model]) => {
    const rs = register.filter(r => r.model === model);
    const [eos, band] = eosOf(model);
    return { model, oem: rs[0].oem, classes: [...new Set(rs.map(r => name(r.cls)))].join(', '), eos, band, compliance: complianceOf(model), sites: new Set(rs.map(r => r.loc)).size };
  });
  const byBand = (b: string) => models.filter(m => m.band === b);
  const byDate = (a: { eos: string }, b: { eos: string }) => parseDmy(a.eos).getTime() - parseDmy(b.eos).getTime();
  const past = byBand('past').sort(byDate), soon = byBand('soon').sort(byDate);
  const assessed = EST.compliance.compliant + EST.compliance.behind + EST.compliance.unknown;
  const exposed = EST.eol.past + EST.eol.within12;
  const behindModels = models.filter(m => m.compliance === 'behind');
  const unknownModels = models.filter(m => m.band === 'unknown');

  return {
    headline: { value: exposed, fmt: 'num', label: 'elements past or within 12 months of end of support', tone: 'red', better: 'down' },
    summary: `${EST.eol.past} active elements are past end of support and ${EST.eol.within12} more reach it within 12 months — ${fmtNum(exposed)} elements, ${r1(pct(exposed, IL.ne))}% of the estate. The models already past end of support are ${past.map(m => `${m.model} (${m.oem}, ${m.eos})`).join(' and ')}; ${soon.map(m => `${m.model} (${m.eos})`).join(' and ')} are next in the refresh window. Software compliance is ${r1(pct(EST.compliance.compliant, assessed))}%: ${fmtNum(EST.compliance.behind)} elements run behind the baseline, concentrated on ${behindModels.map(m => m.model).join(', ')}, and ${EST.compliance.unknown} could not be assessed because ${unknownModels.length} of ${models.length} models have no support date or baseline on record.`,
    findings: [
      { tone: 'crit', title: `${EST.eol.past} elements past end of support`, detail: `On ${past.map(m => `${m.model} (EOS ${m.eos})`).join(' and ')}. Unsupported hardware receives no security fixes or vendor support.` },
      { tone: 'warn', title: `${EST.eol.within12} more within 12 months`, detail: `The next models to reach end of support are ${soon.map(m => `${m.model} (${m.eos})`).join(', then ')}.` },
      { tone: 'warn', title: `${fmtNum(EST.compliance.behind)} elements behind software baseline`, detail: `Models behind baseline: ${behindModels.map(m => m.model).join(', ')}.` },
      { tone: 'info', title: `${unknownModels.length} models have no end-of-support date`, detail: `${unknownModels.slice(0, 6).map(m => m.model).join(', ')}${unknownModels.length > 6 ? '…' : ''} — their lifecycle risk cannot be measured until dates are recorded.` }
    ],
    kpis: [
      { title: 'Past end of support', definition: 'Active elements whose model is beyond the OEM end-of-support date.', value: EST.eol.past, fmt: 'num', of: `${r1(pct(EST.eol.past, IL.ne))}% of active`, tone: 'red',
        delta: { text: `${past.length} models`, better: false } },
      { title: 'Within 12 months', definition: 'Active elements reaching end of support in the next 12 months.', value: EST.eol.within12, fmt: 'num', of: `${r1(pct(EST.eol.within12, IL.ne))}% of active`, tone: 'amber',
        delta: { text: `${soon.length} models`, better: false } },
      { title: 'Software compliance', definition: 'Elements on the approved software baseline ÷ elements assessed.', value: r1(pct(EST.compliance.compliant, assessed)), fmt: 'pct', of: `${fmtNum(EST.compliance.compliant)} of ${fmtNum(assessed)}`, tone: 'emerald',
        delta: { text: `${fmtNum(EST.compliance.behind)} behind`, better: false },
        visual: { kind: 'segments', parts: [{ n: 'On baseline', c: EST.compliance.compliant, hex: TONE_HEX.success }, { n: 'Behind', c: EST.compliance.behind, hex: TONE_HEX.warning }, { n: 'Unknown', c: EST.compliance.unknown, hex: TONE_HEX.neutral }], total: assessed } },
      { title: 'Models without a support date', definition: 'Distinct models with no end-of-support date on record.', value: unknownModels.length, fmt: 'num', of: `of ${models.length} models`, tone: 'slate',
        delta: { text: `${new Set(models.map(m => m.oem)).size} OEMs in the estate`, better: null } }
    ],
    visuals: [
      { kind: 'composition', span: 2, title: 'End-of-support exposure', sub: `${fmtNum(IL.ne)} active elements`,
        parts: [{ n: 'Past end of support', c: EST.eol.past, hex: TONE_HEX.error }, { n: 'Within 12 months', c: EST.eol.within12, hex: TONE_HEX.warning }, { n: 'Supported beyond 12 months', c: IL.ne - exposed, hex: TONE_HEX.success }] },
      { kind: 'composition', title: 'Software compliance', sub: `${fmtNum(assessed)} elements assessed`,
        parts: [{ n: 'On baseline', c: EST.compliance.compliant, hex: TONE_HEX.success }, { n: 'Behind baseline', c: EST.compliance.behind, hex: TONE_HEX.warning }, { n: 'Unknown', c: EST.compliance.unknown, hex: TONE_HEX.neutral }] },
      { kind: 'bars', title: 'Models by support status', sub: `${models.length} distinct models`, fmt: 'num',
        rows: [
          { label: 'Past end of support', value: past.length, hex: TONE_HEX.error, sub: past.map(m => m.model).join(', ') },
          { label: 'In refresh window', value: soon.length, hex: TONE_HEX.warning, sub: soon.map(m => m.model).join(', ') },
          { label: 'Supported', value: byBand('safe').length, hex: TONE_HEX.success },
          { label: 'No date on record', value: unknownModels.length, hex: TONE_HEX.neutral }
        ] }
    ],
    actions: [
      { priority: 'P1', action: `Replace or extend support for ${past.map(m => m.model).join(' and ')}`, owner: 'Network planning · Vendor management', impact: `${EST.eol.past} elements back under support` },
      { priority: 'P2', action: `Budget the ${soon.map(m => m.model).join(' and ')} refresh in the next planning cycle`, owner: 'Head of Network Planning', impact: `${EST.eol.within12} elements before support lapses` },
      { priority: 'P2', action: `Upgrade the ${fmtNum(EST.compliance.behind)} elements behind baseline, starting with ${behindModels[0]?.model ?? 'the largest model'}`, owner: 'Network engineering', impact: `+${r1(pct(EST.compliance.behind, assessed))} pt compliance` },
      { priority: 'P3', action: `Record end-of-support dates for the ${unknownModels.length} models missing them`, owner: 'Asset management', impact: 'Every model assessable for lifecycle risk' }
    ],
    table: {
      title: 'Model lifecycle catalogue', sub: 'Every model in the estate with its support and software status',
      columns: [
        { key: 'model', header: 'Model', fmt: 'mono' }, { key: 'oem', header: 'OEM' }, { key: 'classes', header: 'Class' },
        { key: 'eos', header: 'End of support' },
        { key: 'band', header: 'Support status', fmt: 'chip', tones: { 'Past end of support': 'error', 'In refresh window': 'warning', Supported: 'success', 'No date on record': 'neutral' } },
        { key: 'compliance', header: 'Software', fmt: 'chip', tones: { 'On baseline': 'success', 'Behind baseline': 'warning', Unknown: 'neutral' } },
        { key: 'sites', header: 'Sites deployed', fmt: 'num', right: true }
      ],
      rows: [...models].sort((a, b) => ['past', 'soon', 'unknown', 'safe'].indexOf(a.band) - ['past', 'soon', 'unknown', 'safe'].indexOf(b.band)).map(m => ({
        id: m.model,
        cells: {
          model: m.model, oem: m.oem, classes: m.classes, eos: m.eos,
          band: m.band === 'past' ? 'Past end of support' : m.band === 'soon' ? 'In refresh window' : m.band === 'safe' ? 'Supported' : 'No date on record',
          compliance: m.compliance === 'ok' ? 'On baseline' : m.compliance === 'behind' ? 'Behind baseline' : 'Unknown', sites: m.sites
        }
      })),
      facet: 'band', empty: 'No models.'
    },
    methodology: [
      { term: 'Estate totals', definition: 'Past end of support, within 12 months and compliance totals come from the inventory ledger.' },
      { term: 'Model catalogue', definition: 'Support status and software baseline per model come from the OEM lifecycle catalogue applied to every model in the element register.' },
      { term: 'Refresh window', definition: 'The model’s end-of-support date falls inside the current planning horizon.' }
    ]
  };
};

/* ── IN-04 Discovery-verified inventory quality ──────────── */
const quality: ReportBuilder = () => {
  const recStates: RecState[] = ['ok', 'drift', 'stale', 'miss', 'none'];
  const stateHex: Record<RecState, string> = { ok: TONE_HEX.success, drift: TONE_HEX.warning, stale: TONE_HEX.orange, miss: TONE_HEX.error, none: TONE_HEX.neutral };
  const srcHex: Record<Source, string> = { d: TONE_HEX.success, p: TONE_HEX.info, m: TONE_HEX.neutral, e: TONE_HEX.purple };
  const byState = recStates.map(s => ({ s, n: register.filter(r => r.st === s).length }));
  const n = (s: RecState) => byState.find(x => x.s === s)!.n;
  const undiscoveredClasses = PHY_TABS.filter(t => t.disc === 0);
  const discPct = r1(pct(IL.discovered, IL.ne));

  return {
    headline: { value: discPct, fmt: 'pct', label: 'of active elements verified by discovery', tone: 'cyan', better: 'up' },
    summary: `${fmtNum(IL.discovered)} of ${fmtNum(IL.ne)} active elements (${discPct}%) are verified by discovery. ${undiscoveredClasses.map(t => t.n).join(', ')} have no discovery adapter at all (${fmtNum(sum(undiscoveredClasses, t => t.c))} elements recorded manually or from EMS feeds). Within the element register, ${fmtNum(n('ok'))} records are verified, ${fmtNum(n('drift'))} have drifted from the network, ${fmtNum(n('stale'))} are stale, ${n('miss')} ${n('miss') === 1 ? 'is' : 'are'} missing from the network and ${fmtNum(n('none'))} have never been discovered.`,
    findings: [
      { tone: 'warn', title: `${fmtNum(n('drift'))} records have drifted`, detail: 'The record exists and discovery reached the element, but a value no longer matches — these feed the reconciliation backlog.' },
      { tone: 'warn', title: `${fmtNum(n('stale'))} records are stale`, detail: 'Not re-verified within the expected scan window; their data may be out of date.' },
      { tone: 'crit', title: `${n('miss')} ${n('miss') === 1 ? 'record' : 'records'} missing from the network`, detail: register.filter(r => r.st === 'miss').slice(0, 3).map(r => `${r.name} (${r.model}, ${r.loc})`).join('; ') },
      { tone: 'info', title: `${undiscoveredClasses.length} classes with no discovery`, detail: undiscoveredClasses.map(t => `${t.n} ${t.c}`).join(' · ') }
    ],
    kpis: [
      { title: 'Verified by discovery', definition: 'Active elements confirmed on the network by discovery.', value: discPct, fmt: 'pct', of: `${fmtNum(IL.discovered)} of ${fmtNum(IL.ne)}`, tone: 'cyan',
        delta: { text: `${fmtNum(IL.ne - IL.discovered)} unverified`, better: false }, visual: { kind: 'against', value: IL.discovered, limit: IL.ne } },
      { title: 'Drifted records', definition: 'Register records that differ from what discovery last found.', value: n('drift'), fmt: 'num', of: `${r1(pct(n('drift'), register.length))}% of register`, tone: 'amber',
        delta: { text: `${fmtNum(n('ok'))} verified`, better: false },
        visual: { kind: 'segments', parts: byState.map(x => ({ n: RSTATE[x.s][0], c: x.n, hex: stateHex[x.s] })), total: register.length } },
      { title: 'Stale records', definition: 'Records not re-verified within the scan window.', value: n('stale'), fmt: 'num', of: `${r1(pct(n('stale'), register.length))}% of register`, tone: 'orange',
        delta: { text: 're-verification overdue', better: false } },
      { title: 'Never discovered', definition: 'Records discovery has never verified — planned, manual or EMS-only.', value: n('none'), fmt: 'num', of: `${r1(pct(n('none'), register.length))}% of register`, tone: 'slate',
        delta: { text: `${undiscoveredClasses.length} classes without an adapter`, better: null } }
    ],
    visuals: [
      { kind: 'composition', span: 2, title: 'Record verification state', sub: `Element register · ${fmtNum(register.length)} records`,
        parts: byState.map(x => ({ n: RSTATE[x.s][0], c: x.n, hex: stateHex[x.s] })) },
      { kind: 'bars', title: 'Discovery coverage by class', sub: 'Discovered ÷ active', fmt: 'pct', max: 100,
        rows: PHY_TABS.map(t => ({ label: t.n, value: r1(pct(t.disc, t.c)), hex: CLASS_HEX[t.k], sub: `${fmtNum(t.disc)} of ${fmtNum(t.c)}` })) },
      { kind: 'donut', title: 'Record source', sub: 'Where each record came from', total: register.length, label: 'records',
        slices: (Object.keys(SRC) as Source[]).map(s => ({ k: s, n: SRC[s][0], c: register.filter(r => r.s === s).length, hex: srcHex[s] })) },
      { kind: 'heat', span: 2, title: 'Class × verification state', sub: 'Element register records', fmt: 'num',
        rows: NE_CLASSES.map(name), cols: recStates.map(s => RSTATE[s][0]), values: NE_CLASSES.map(k => recStates.map(s => PHY[k].filter(r => r.st === s).length)) }
    ],
    actions: [
      { priority: 'P1', action: `Reconcile the ${fmtNum(n('drift'))} drifted records (accept network or raise a work order)`, owner: 'Reconciliation desk', impact: `+${r1(pct(n('drift'), register.length))} pt verified records` },
      { priority: 'P2', action: `Re-scan the ${fmtNum(n('stale'))} stale records`, owner: 'Discovery engineering', impact: 'Brings their data inside the scan window' },
      { priority: 'P2', action: `Build discovery adapters for ${undiscoveredClasses.map(t => t.n).join(', ')}`, owner: 'OSS platform team', impact: `${fmtNum(sum(undiscoveredClasses, t => t.c))} elements become verifiable` },
      { priority: 'P3', action: `Field-check the ${n('miss')} missing ${n('miss') === 1 ? 'element' : 'elements'}`, owner: 'Field operations', impact: 'Confirms decommission or restores the record' }
    ],
    table: {
      title: 'Verification quality by class', sub: 'Element register; select a row to open the class',
      columns: [
        { key: 'cls', header: 'Class' }, { key: 'active', header: 'Active (ledger)', fmt: 'num', right: true }, { key: 'disc', header: 'Discovered', fmt: 'num', right: true },
        { key: 'discPct', header: 'Coverage', fmt: 'pct', right: true },
        ...recStates.map(s => ({ key: s, header: RSTATE[s][0], fmt: 'num' as const, right: true })),
        { key: 'source', header: 'Main source' }
      ],
      rows: NE_CLASSES.map(k => ({
        id: k, link: physicalLink(k),
        cells: {
          cls: name(k), active: activeOf(k), disc: classMeta(k).disc, discPct: r1(pct(classMeta(k).disc, activeOf(k))),
          ...Object.fromEntries(recStates.map(s => [s, PHY[k].filter(r => r.st === s).length])),
          source: SRC[countBy(PHY[k], r => r.s)[0][0] as Source][0]
        }
      })),
      empty: 'No classes.'
    },
    methodology: [
      { term: 'Verified', definition: 'Discovery found the element and every compared attribute matched the record.' },
      { term: 'Drifted / Stale / Missing', definition: 'Drifted: reached but a value differs. Stale: not re-verified within the scan window. Missing: the record exists but discovery no longer finds the element.' },
      { term: 'Record source', definition: `${Object.values(SRC).map(s => s[0]).join(', ')}.` },
      { term: 'Populations', definition: 'Headline coverage uses the ledger’s verified count; class coverage uses each class’s discovered count; verification states are read from the element register.' }
    ]
  };
};

/* ── IN-05 Decommission archive & zombie assets ──────────── */
const archive: ReportBuilder = () => {
  const rows = NE_CLASSES.flatMap(k => DECOMM[k].map(r => ({ ...r, cls: k })));
  const zombies = rows.filter(r => r.zombie);
  const lastYear = rows.filter(r => TODAY.getTime() - parseDmy(r.on).getTime() <= 365 * 86400000).length;
  const reasonOf = (why: string) => /^Replaced under/.test(why) ? 'Replaced under change request' : /written off/i.test(why) ? 'Written off' : /Capacity migration/.test(why) ? 'Capacity migration' : why;
  const reasons = countBy(rows, r => reasonOf(r.why));
  const years = countBy(rows, r => r.on.slice(-4)).sort((a, b) => a[0].localeCompare(b[0]));
  const oldestMonths = Math.round((TODAY.getTime() - Math.min(...rows.map(r => parseDmy(r.on).getTime()))) / 2629800000);

  return {
    headline: { value: zombies.length, fmt: 'num', label: 'decommissioned elements still answering on the network', tone: 'red', better: 'down' },
    summary: `${fmtNum(IL.inactive)} elements are decommissioned and archived; ${lastYear} of them were retired in the last 12 months, and the oldest record is ${DECOMM_OLDEST} old. The main reasons are ${reasons.slice(0, 3).map(([r, c]) => `${r.toLowerCase()} (${c})`).join(', ')}. ${zombies.length} archived ${zombies.length === 1 ? 'element is' : 'elements are'} still answering discovery scans — ${zombies.map(z => `${z.name} at ${z.loc}`).join(' and ')} — which means the hardware is powered and reachable despite being recorded as removed: a security and licensing exposure until confirmed.`,
    findings: [
      { tone: 'crit', title: `${zombies.length} zombie ${zombies.length === 1 ? 'asset' : 'assets'} still answering`, detail: zombies.map(z => `${z.name} (${z.model}, decommissioned ${z.on} by ${z.by}, ${z.wo})`).join('; ') },
      { tone: 'info', title: `${lastYear} decommissioned in the last 12 months`, detail: years.map(([y, c]) => `${y}: ${c}`).join(' · ') },
      { tone: 'info', title: `Top reason: ${reasons[0][0]}`, detail: reasons.slice(0, 5).map(([r, c]) => `${r} ${c}`).join(' · ') }
    ],
    kpis: [
      { title: 'Decommissioned', definition: 'Elements retired from service and moved to the archive.', value: IL.inactive, fmt: 'num', of: 'archived records', tone: 'slate',
        delta: { text: `${lastYear} in the last 12 months`, better: null },
        visual: { kind: 'segments', parts: NE_CLASSES.map(k => ({ n: name(k), c: PHY_MATRIX[k].decomm, hex: CLASS_HEX[k] })), total: IL.inactive } },
      { title: 'Still answering', definition: 'Archived elements that still respond to discovery scans.', value: DECOMM_ZOMBIES, fmt: 'num', of: 'zombie assets', tone: 'red',
        delta: { text: zombies.map(z => z.loc).join(', '), better: false } },
      { title: 'Retired, last 12 months', definition: 'Elements decommissioned in the 12 months to the report date.', value: lastYear, fmt: 'num', of: `${r1(pct(lastYear, rows.length))}% of archive`, tone: 'sky',
        delta: { text: `${years[years.length - 1][1]} so far in ${years[years.length - 1][0]}`, better: null } },
      { title: 'Oldest record', definition: 'Age of the longest-held record in the archive, in months.', value: oldestMonths, fmt: 'num', of: `months · ${DECOMM_OLDEST}`, tone: 'amber',
        delta: { text: `${rows.filter(r => TODAY.getTime() - parseDmy(r.on).getTime() > 5 * 365 * 86400000).length} records older than 5 years`, better: null } }
    ],
    visuals: [
      { kind: 'ramp', title: 'Decommissioned per year', sub: 'Archive records by decommission year', buckets: years.map(([y, c], i) => ({ label: y, count: c, hex: cv('slate', [200, 300, 300, 400, 400, 500, 500, 600][i] ?? 500) })) },
      { kind: 'bars', title: 'Why elements were decommissioned', sub: 'Archive records', fmt: 'num',
        rows: reasons.slice(0, 9).map(([r, c]) => ({ label: r, value: c, hex: cv('slate', 400) })) },
      { kind: 'bars', span: 2, title: 'Decommissioned by class', sub: 'Ledger counts', fmt: 'num',
        rows: NE_CLASSES.map(k => ({ label: name(k), value: PHY_MATRIX[k].decomm, hex: CLASS_HEX[k], sub: `${r1(pct(PHY_MATRIX[k].decomm, PHY_MATRIX[k].decomm + activeOf(k)))}% of all ${name(k)} records` })) }
    ],
    actions: [
      { priority: 'P1', action: `Physically verify and power down ${zombies.map(z => z.name).join(' and ')}`, owner: 'Field operations · Security operations', impact: 'Closes the zombie exposure' },
      { priority: 'P2', action: 'Open reconciliation exceptions for archived elements that answer scans', owner: 'Reconciliation desk', impact: 'Future zombies surface automatically' },
      { priority: 'P3', action: `Review retention for archive records older than 5 years (oldest ${DECOMM_OLDEST})`, owner: 'Asset management', impact: 'Keeps the archive auditable' }
    ],
    table: {
      title: 'Decommissioned elements', sub: 'Zombies first, then most recent',
      columns: [
        { key: 'status', header: 'Network status', fmt: 'chip', tones: { 'Still answering': 'error', Silent: 'neutral' } },
        { key: 'name', header: 'Element', fmt: 'mono' }, { key: 'cls', header: 'Class' }, { key: 'model', header: 'Model' }, { key: 'oem', header: 'OEM' },
        { key: 'sn', header: 'Serial', fmt: 'mono' }, { key: 'loc', header: 'Site', fmt: 'mono' }, { key: 'on', header: 'Decommissioned', fmt: 'date' },
        { key: 'why', header: 'Reason', width: '200px' }, { key: 'by', header: 'By' }, { key: 'wo', header: 'Work order', fmt: 'mono' }
      ],
      rows: [...rows].sort((a, b) => Number(b.zombie) - Number(a.zombie) || parseDmy(b.on).getTime() - parseDmy(a.on).getTime()).map(r => ({
        id: `${r.cls}-${r.sn}`,
        cells: { status: r.zombie ? 'Still answering' : 'Silent', name: r.name, cls: name(r.cls), model: r.model, oem: r.oem, sn: r.sn, loc: r.loc, on: r.on, why: r.why, by: r.by, wo: r.wo }
      })),
      facet: 'cls', empty: 'The archive is empty.'
    },
    methodology: [
      { term: 'Decommissioned', definition: 'Stock state set to decommissioned and moved to the inactive inventory archive.' },
      { term: 'Zombie asset', definition: 'An archived element that still responds to discovery scans.' },
      { term: 'Reason grouping', definition: 'Change-request-specific reasons are grouped as "Replaced under change request"; write-offs are grouped as "Written off".' }
    ]
  };
};

/* ── IN-06 Site footprint & facility capacity ────────────── */
const sites: ReportBuilder = () => {
  const s = LOCATIONS.map(l => {
    const f = facilityOf(l.id, l.ne);
    const load = totalLoad(f), rated = sum(f.power.feeds, x => x.ratingKw), u = uTotals(f), p = portTotals(f);
    return { l, f, load, rated, powerPct: r1(pct(load, rated)), rackPct: r1(pct(u.used, u.u)), portPct: r1(pct(p.used, p.total)), u, p };
  });
  const status = countBy(LOCATIONS, l => l.st);
  const hot = s.filter(x => x.powerPct >= 75 || x.rackPct >= 75);
  const sampleNe = sum(LOCATIONS, l => l.ne), sampleDisc = sum(LOCATIONS, l => l.disc);
  const portPct = r1(pct(EST.ports.used, EST.ports.total));
  const statusTone: Record<string, string> = { 'On-air': TONE_HEX.success, 'In progress': TONE_HEX.info, Planned: TONE_HEX.neutral, Failed: TONE_HEX.error };

  return {
    headline: { value: IL.locations, fmt: 'num', label: 'locations in the estate', tone: 'emerald' },
    summary: `The estate spans ${fmtNum(IL.locations)} locations: ${IL.central} central offices, ${IL.regional} regional sites and ${fmtNum(IL.edge)} edge sites. Estate-wide port utilisation is ${portPct}% (${fmtNum(EST.ports.free)} ports free). Across the ${LOCATIONS.length} surveyed sites with a facility record, ${status.map(([st, c]) => `${c} ${st.toLowerCase()}`).join(', ')}; ${sampleDisc} of ${sampleNe} network elements are discovered. ${hot.length === 1 ? 'One of those sites runs' : `${hot.length} of those sites run`} above 75% of rated power or rack space — ${hot.map(x => `${x.l.id} (power ${x.powerPct}%, racks ${x.rackPct}%)`).join('; ') || 'none'} — and should be checked before new equipment is planned there.`,
    findings: [
      { tone: hot.length ? 'warn' : 'good', title: `${plural(hot.length, 'surveyed site')} above 75% power or rack use`, detail: hot.map(x => `${x.l.id}: power ${x.powerPct}%, racks ${x.rackPct}%, ports ${x.portPct}%`).join(' · ') || 'Every surveyed site has headroom.' },
      { tone: status.some(([st]) => st === 'Failed') ? 'crit' : 'info', title: `${status.find(([st]) => st === 'Failed')?.[1] ?? 0} site build failed`, detail: LOCATIONS.filter(l => l.st === 'Failed').map(l => `${l.name} (${l.city}) — ${l.ne} elements recorded, ${l.disc} discovered`).join('; ') || 'No failed builds.' },
      { tone: 'info', title: `${r1(pct(IL.edge, IL.locations))}% of locations are edge sites`, detail: `${fmtNum(IL.edge)} edge · ${IL.regional} regional · ${IL.central} central.` }
    ],
    kpis: [
      { title: 'Locations', definition: 'Sites in the location roster.', value: IL.locations, fmt: 'num', of: 'central · regional · edge', tone: 'emerald',
        delta: { text: `${IL.central} central offices`, better: null },
        visual: { kind: 'segments', parts: [{ n: 'Central', c: IL.central, hex: cv('emerald', 600) }, { n: 'Regional', c: IL.regional, hex: cv('emerald', 400) }, { n: 'Edge', c: IL.edge, hex: cv('emerald', 200) }], total: IL.locations } },
      { title: 'Port utilisation', definition: 'Used ÷ installed ports, estate-wide.', value: portPct, fmt: 'pct', of: `${fmtNum(EST.ports.free)} free`, tone: 'amber',
        delta: { text: `${fmtNum(EST.ports.used)} used`, better: null }, visual: { kind: 'against', value: EST.ports.used, limit: EST.ports.total } },
      { title: 'Surveyed sites on-air', definition: 'Sites with a facility record that are live.', value: status.find(([st]) => st === 'On-air')?.[1] ?? 0, fmt: 'num', of: `of ${LOCATIONS.length} surveyed`, tone: 'sky',
        delta: { text: status.map(([st, c]) => `${c} ${st.toLowerCase()}`).join(' · '), better: null },
        visual: { kind: 'segments', parts: status.map(([st, c]) => ({ n: st, c, hex: statusTone[st] ?? TONE_HEX.neutral })), total: LOCATIONS.length } },
      { title: 'Sites near capacity', definition: 'Surveyed sites above 75% of rated power or rack space.', value: hot.length, fmt: 'num', of: `of ${LOCATIONS.length} surveyed`, tone: 'red',
        delta: { text: hot.map(x => x.l.id).join(', ') || 'none', better: hot.length === 0 } }
    ],
    visuals: [
      { kind: 'bars', title: 'Power load vs rating', sub: 'Surveyed sites · % of rated feed capacity', fmt: 'pct', max: 100, target: { value: 75, label: '75%' },
        rows: [...s].sort((a, b) => b.powerPct - a.powerPct).map(x => ({ label: x.l.id, value: x.powerPct, hex: x.powerPct >= 75 ? TONE_HEX.error : cv('amber', 400), sub: `${x.load.toFixed(1)} of ${x.rated} kW` })) },
      { kind: 'bars', title: 'Rack space used', sub: 'Surveyed sites · % of rack units', fmt: 'pct', max: 100, target: { value: 75, label: '75%' },
        rows: [...s].sort((a, b) => b.rackPct - a.rackPct).map(x => ({ label: x.l.id, value: x.rackPct, hex: x.rackPct >= 75 ? TONE_HEX.error : cv('sky', 400), sub: `${x.u.used} of ${x.u.u} U` })) },
      { kind: 'bars', span: 2, title: 'Locations by tier', sub: 'Location roster', fmt: 'num',
        rows: [{ label: 'Edge', value: IL.edge, hex: cv('emerald', 300) }, { label: 'Regional', value: IL.regional, hex: cv('emerald', 400) }, { label: 'Central', value: IL.central, hex: cv('emerald', 600) }] }
    ],
    actions: [
      ...hot.map(x => ({ priority: 'P1' as const, action: `Capacity survey at ${x.l.id} (${x.l.city}) before new installs`, owner: 'Facilities · Network planning', impact: `Power ${x.powerPct}%, racks ${x.rackPct}%` })),
      ...LOCATIONS.filter(l => l.st === 'Failed').map(l => ({ priority: 'P2' as const, action: `Re-plan the failed build at ${l.name}`, owner: 'Network deployment', impact: `${l.ne} recorded elements, ${l.disc} discovered` })),
      { priority: 'P3', action: 'Extend facility surveys beyond the sampled sites to all central and regional locations', owner: 'Facilities', impact: `${IL.central + IL.regional} sites with measured headroom` }
    ],
    table: {
      title: 'Surveyed sites', sub: `${LOCATIONS.length} sites with a facility record`,
      columns: [
        { key: 'id', header: 'Site', fmt: 'mono' }, { key: 'name', header: 'Name' }, { key: 'type', header: 'Type' }, { key: 'tier', header: 'Tier' },
        { key: 'status', header: 'Status', fmt: 'chip', tones: { 'On-air': 'success', 'In progress': 'info', Planned: 'neutral', Failed: 'error' } },
        { key: 'city', header: 'City' }, { key: 'ne', header: 'Elements', fmt: 'num', right: true }, { key: 'disc', header: 'Discovered', fmt: 'num', right: true },
        { key: 'load', header: 'Power load', fmt: 'kw', right: true }, { key: 'power', header: 'Power used', fmt: 'pct', right: true },
        { key: 'rack', header: 'Rack used', fmt: 'pct', right: true }, { key: 'ports', header: 'Ports used', fmt: 'pct', right: true }
      ],
      rows: s.map(x => ({
        id: x.l.id,
        cells: { id: x.l.id, name: x.l.name, type: x.l.type, tier: x.l.cat, status: x.l.st, city: `${x.l.city}, ${x.l.state}`, ne: x.l.ne, disc: x.l.disc, load: r1(x.load), power: x.powerPct, rack: x.rackPct, ports: x.portPct }
      })),
      facet: 'status', empty: 'No surveyed sites.'
    },
    methodology: [
      { term: 'Estate totals', definition: 'Location tiers and estate port figures come from the inventory ledger.' },
      { term: 'Surveyed sites', definition: 'Sites with a facility record (power feeds, racks, port classes). Site-level figures describe those sites only.' },
      { term: 'Power used', definition: 'Sum of feed load ÷ sum of feed rating at the site.' },
      { term: 'Near capacity', definition: 'Power or rack use at or above 75%.' }
    ]
  };
};

/* ── IN-07 Vendor (OEM) concentration ────────────────────── */
const vendors: ReportBuilder = () => {
  const oems = countBy(register, r => r.oem).map(([oem, n]) => {
    const rs = register.filter(r => r.oem === oem);
    return {
      oem, n, share: r1(pct(n, register.length)),
      classes: [...new Set(rs.map(r => name(r.cls)))], models: new Set(rs.map(r => r.model)).size,
      pastPct: r1(pct(rs.filter(r => eosOf(r.model)[1] === 'past').length, n)), soonPct: r1(pct(rs.filter(r => eosOf(r.model)[1] === 'soon').length, n)),
      behindPct: r1(pct(rs.filter(r => complianceOf(r.model) === 'behind').length, n)),
      pastModels: [...new Set(rs.filter(r => eosOf(r.model)[1] === 'past').map(r => r.model))],
      regions: countBy(rs, r => regionOf(r.loc))
    };
  });
  const top = oems[0];
  const top3 = r1(sum(oems.slice(0, 3), o => o.share));
  const hhi = Math.round(sum(oems, o => o.share ** 2));
  const exposure = (o: typeof oems[number]) => r1(o.pastPct + o.soonPct);
  const riskiest = [...oems].sort((a, b) => exposure(b) - exposure(a))[0];
  const oemHex = (i: number) => cv(['blue', 'teal', 'violet', 'amber', 'pink', 'sky', 'emerald', 'orange', 'slate'][i] ?? 'slate', 400);

  return {
    headline: { value: top.share, fmt: 'pct', label: `of network elements from ${top.oem}`, tone: 'purple', better: 'down' },
    summary: `The element register spans ${oems.length} OEMs. ${top.oem} alone supplies ${top.share}% of elements (${fmtNum(top.n)}), and the top three — ${oems.slice(0, 3).map(o => o.oem).join(', ')} — supply ${top3}% (HHI ${fmtNum(hhi)}, ${hhi > 2500 ? 'highly' : hhi > 1500 ? 'moderately' : 'not'} concentrated). Lifecycle exposure is uneven: ${exposure(riskiest)}% of ${riskiest.oem}'s installed base is on models past or near end of support${riskiest.pastModels.length ? ` (${riskiest.pastModels.join(', ')} already past)` : ''}, and ${top.oem === riskiest.oem ? `as the largest supplier that gives ${top.oem} the most at stake in the next refresh negotiation` : `${top.oem}, the largest supplier, is at ${exposure(top)}%`}.`,
    findings: [
      { tone: top.share > 40 ? 'warn' : 'info', title: `${top.oem} supplies ${top.share}% of elements`, detail: `${fmtNum(top.n)} elements across ${top.models} models (${top.classes.join(', ')}). HHI ${fmtNum(hhi)}.` },
      { tone: 'crit', title: `${riskiest.oem}: highest lifecycle exposure (${exposure(riskiest)}%)`, detail: `${riskiest.pastPct}% of its elements are on models past end of support and ${riskiest.soonPct}% in the refresh window.` },
      { tone: 'info', title: `Top three OEMs = ${top3}%`, detail: oems.slice(0, 5).map(o => `${o.oem} ${o.share}%`).join(' · ') }
    ],
    kpis: [
      { title: 'Largest vendor share', definition: 'Share of register elements supplied by the largest OEM.', value: top.share, fmt: 'pct', of: top.oem, tone: 'purple',
        delta: { text: `${fmtNum(top.n)} elements`, better: null },
        visual: { kind: 'segments', parts: oems.slice(0, 5).map((o, i) => ({ n: o.oem, c: o.n, hex: oemHex(i) })), total: register.length } },
      { title: 'Top-3 concentration', definition: 'Share of elements supplied by the three largest OEMs.', value: top3, fmt: 'pct', of: `HHI ${fmtNum(hhi)}`, tone: 'sky',
        delta: { text: oems.slice(0, 3).map(o => o.oem).join(', '), better: null } },
      { title: 'Vendors', definition: 'Distinct OEMs in the element register.', value: oems.length, fmt: 'num', of: `${new Set(register.map(r => r.model)).size} models`, tone: 'slate',
        delta: { text: `${oems.filter(o => o.share < 2).length} below 2% share`, better: null } },
      { title: 'Most exposed vendor', definition: 'Highest share of a vendor’s installed base on models past or near end of support.', value: exposure(riskiest), fmt: 'pct', of: riskiest.oem, tone: 'red',
        delta: { text: `${riskiest.pastPct}% past · ${riskiest.soonPct}% in window`, better: false } }
    ],
    visuals: [
      { kind: 'bars', title: 'Elements by vendor', sub: 'Share of the element register', fmt: 'pct',
        rows: oems.map((o, i) => ({ label: o.oem, value: o.share, hex: oemHex(i), sub: `${fmtNum(o.n)} elements · ${o.models} models` })) },
      { kind: 'bars', title: 'Lifecycle exposure by vendor', sub: 'Share of each vendor’s elements past or near end of support', fmt: 'pct', max: 100,
        rows: [...oems].filter(o => exposure(o) > 0).sort((a, b) => exposure(b) - exposure(a)).map(o => ({ label: o.oem, value: exposure(o), hex: TONE_HEX.error, sub: `${o.pastPct}% past · ${o.soonPct}% in window` })) },
      { kind: 'heat', span: 2, title: 'Vendor × equipment class', sub: 'Register elements', fmt: 'num',
        rows: oems.map(o => o.oem), cols: NE_CLASSES.map(name), values: oems.map(o => NE_CLASSES.map(k => PHY[k].filter(r => r.oem === o.oem).length)) }
    ],
    actions: [
      { priority: 'P1', action: `Use ${top.oem}'s ${top.share}% share and ${exposure(top)}% lifecycle exposure as leverage in the next refresh negotiation`, owner: 'Procurement', impact: 'Better refresh terms on the largest installed base' },
      { priority: 'P2', action: `Qualify a second source for the classes where ${top.oem} dominates (${top.classes.join(', ')})`, owner: 'Network engineering · Procurement', impact: 'Reduces single-vendor dependency' },
      { priority: 'P3', action: `Agree a lifecycle roadmap with ${riskiest.oem}`, owner: 'Vendor management', impact: `${exposure(riskiest)}% of its installed base past or near end of support` }
    ],
    table: {
      title: 'Vendor scorecard', sub: 'Element register, largest vendor first',
      columns: [
        { key: 'oem', header: 'OEM' }, { key: 'n', header: 'Elements', fmt: 'num', right: true }, { key: 'share', header: 'Share', fmt: 'pct', right: true },
        { key: 'models', header: 'Models', fmt: 'num', right: true }, { key: 'classes', header: 'Classes' },
        { key: 'past', header: 'On past-EOS models', fmt: 'pct', right: true }, { key: 'soon', header: 'In refresh window', fmt: 'pct', right: true },
        { key: 'behind', header: 'Behind baseline', fmt: 'pct', right: true }, { key: 'region', header: 'Largest region' }
      ],
      rows: oems.map(o => ({ id: o.oem, cells: { oem: o.oem, n: o.n, share: o.share, models: o.models, classes: o.classes.join(', '), past: o.pastPct, soon: o.soonPct, behind: o.behindPct, region: `${o.regions[0][0]} (${o.regions[0][1]})` } })),
      empty: 'No vendors.'
    },
    methodology: [
      { term: 'Population', definition: `The element register (${fmtNum(register.length)} active elements, matching the ledger total).` },
      { term: 'HHI', definition: 'Herfindahl–Hirschman index: sum of squared % shares. Above 2,500 is highly concentrated; 1,500–2,500 moderately.' },
      { term: 'Lifecycle exposure', definition: 'Share of a vendor’s register elements on models past end of support or inside the refresh window. Shown as a share of each vendor’s own base; estate totals are in the Hardware lifecycle risk report.' }
    ]
  };
};

export const INVENTORY_BUILDERS: Record<string, ReportBuilder> = {
  'IN-01': estate, 'IN-02': stock, 'IN-03': lifecycle, 'IN-04': quality, 'IN-05': archive, 'IN-06': sites, 'IN-07': vendors
};

