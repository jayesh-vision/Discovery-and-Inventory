import { currentGeo, isDatacenter, isDatacenterUser, solution, withoutSolution, type DcGeo } from '../solution';
import { dcSumList, scope } from '../data/dc/scope';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { isReactOwned, legacyPath } from '../routes';
import { exportTable } from '../utils/tableExport';
import NodeDigitalTwinSection from '../components/NodeDigitalTwinSection';

/* ── the prototype renderer, loaded once ────────────────── */
declare global {
  interface Window {
    __nsLegacy?: {
      go: (k: string) => void;
      applyDrillQuery: (view: string, q: string, label?: string | null) => void;
      setDrill: (d: unknown) => void;
      setParams: (k: string, p: Record<string, string>) => void;
      setCollapsed: (on: boolean) => void;
      current: () => string;
      /* site-header data + one-shot section override for the React site tabs */
      siteHead?: (id: string) => unknown;
      setSection?: (s: string) => void;
      /* maps any location tag (sample city codes included) to the roster row */
      resolveSite?: (ref: string) => { id: string; name: string } | null;
      applyGeo?: (geo: string | null) => void;
    };
    __nsBridge?: {
      owns: (k: string) => boolean;
      navigate: (k: string, drill: { label?: string; q?: string } | null, params?: Record<string, string>) => void;
      sync: (k: string, params: Record<string, string>, drill?: { label?: string; q?: string; from?: string } | null) => void;
      exportTable?: (table: HTMLTableElement | null | undefined, kind: 'csv' | 'xlsx', stemName?: string) => Promise<void>;
      exportMatrix?: (headers: string[], rows: string[][], stemName: string, kind?: 'csv' | 'xlsx') => Promise<void>;
      parseExcel?: (buffer: ArrayBuffer) => Promise<string[][]>;
    };
  }
}

let loading: Promise<void> | null = null;
export function loadLegacy(): Promise<void> {
  if (window.__nsLegacy) return Promise.resolve();
  /* the bundle builds its data once, so it learns the mode (src/solution.ts) before it runs */
  const w = window as unknown as { __nsSolution?: string | null; __dcSum?: unknown; __dcScope?: unknown; __dcGeo?: unknown };
  w.__nsSolution = solution();
  const geo = isDatacenter() ? (currentGeo() || (isDatacenterUser() ? 'us' : 'in')) : null;
  w.__dcGeo = geo;
  if (isDatacenter()) {
    w.__dcSum = dcSumList(geo);
    w.__dcScope = scope(geo);
  } else {
    delete w.__dcSum;
    delete w.__dcScope;
  }
  if (!loading) loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    /* a plain '/legacy.js' can serve a browser tab a stale cached copy after
       a rebuild — this script tag is only ever created once per page load,
       so busting the cache here costs nothing and guarantees the tab is
       always running what was just built, not whatever it last fetched */
    s.src = `/legacy.js?t=${Date.now()}`;
    s.onload = () => res();
    s.onerror = () => rej(new Error('legacy.js failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}

/* Renders one prototype screen inside the React shell. The prototype writes
   into #view and reads its drill/filter state from the query string, the same
   names the React screens use, so links work in both directions. */
export default function LegacyView({ legacyKey }: { legacyKey: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const params = useParams();
  const [ready, setReady] = useState(!!window.__nsLegacy);
  const host = useRef<HTMLDivElement>(null);
  /* set when the prototype itself moved the URL; the screen is already drawn */
  const fromLegacy = useRef(false);
  /* set while React Router URL change is actively updating the legacy screen state */
  const isUpdatingFromUrl = useRef(false);
  const [digitalTwinsMount, setDigitalTwinsMount] = useState<HTMLElement | null>(null);
  const [twinTab, setTwinTab] = useState<string>('overview');

  useEffect(() => {
    if (legacyKey !== 'node') {
      setDigitalTwinsMount(null);
      return;
    }
    const updateMount = () => {
      const el = document.getElementById('node-digital-twin-mount-point');
      const curTab = el?.getAttribute('data-twin-tab') || 'overview';
      setDigitalTwinsMount(prev => (prev === el ? prev : el));
      setTwinTab(curTab);
    };
    updateMount();
    const observer = new MutationObserver(() => updateMount());
    if (host.current) {
      observer.observe(host.current, { childList: true, subtree: true, attributes: true });
    }
    return () => observer.disconnect();
  }, [legacyKey, loc.pathname, loc.search, params]);

  /* legacy → React: the prototype's go() hands React-owned screens to us */
  useEffect(() => {
    window.__nsBridge = {
      owns: (k: string) => k !== legacyKey && isReactOwned(k),
      navigate: (k, drill, params) => {
        const target = legacyPath(k, drill, params ?? {});
        /* once the reader is already on this React screen, a bare re-hand-off
           (no new drill) carries no new information — skip it rather than
           push/replace the URL down to its plain path, which would blow away
           whatever tab/filter query the React screen has since set on its own */
        if (!drill && withoutSolution(target) === window.location.pathname) return;
        /* a drill tagged from=Virtual returns via Physical Resources' own
           explicit back-link (not history back), so this hop can replace
           instead of push — otherwise a stray back gesture right after
           arriving lands one hop further than the click that got you here,
           which reads as "clicking a tab went back to Virtual" */
        nav(target, { replace: !!drill?.q?.toLowerCase().includes('from=virtual') });
      },
      /* the prototype re-rendered itself (a tab, a drill, a row action): follow
         it — carrying its active drill into the URL so the breadcrumb (the
         only navigation) always names where the reader actually is */
      sync: (k, params, drill) => {
        if (isUpdatingFromUrl.current) return;
        const target = legacyPath(k, drill ?? null, params);
        const currentUrl = window.location.pathname + window.location.search;
        if (target !== currentUrl) {
          fromLegacy.current = true;
          const isSameScreen = k === legacyKey;
          nav(target, { replace: isSameScreen });
        }
      },
      exportTable: (t, k, n) => exportTable(t, k, n),
      exportMatrix: async (headers: string[], rows: string[][], stemName: string, kind: 'csv' | 'xlsx' = 'xlsx') => {
        if (kind === 'xlsx') {
          const mod = await import('exceljs');
          const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as any;
          const wb = new ExcelJS.Workbook();
          wb.creator = 'NetSingularity OSS';
          const sheetName = (stemName.replace(/^sample-passive-|-template$/gi, '') || 'Template').slice(0, 31);
          const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
          const headerRow = ws.addRow(headers);
          headerRow.height = 24;
          headerRow.eachCell((cell: any) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          });
          rows.forEach(r => ws.addRow(r));
          ws.columns = headers.map((h, i) => {
            let maxL = h.length;
            for (const r of rows) {
              const l = String(r[i] ?? '').length;
              if (l > maxL) maxL = l;
            }
            return { width: Math.min(40, Math.max(14, maxL + 4)) };
          });
          const buf = await wb.xlsx.writeBuffer();
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${stemName}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          const escapeCsv = (v: string) => /[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
          const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\r\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${stemName}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      },
      parseExcel: async (buffer: ArrayBuffer, targetSheet?: string) => {
        const mod = await import('exceljs');
        const Excel = (mod as any).default ?? mod;
        const wb = new Excel.Workbook();
        await wb.xlsx.load(buffer);
        // Find best sheet: targetSheet match, or first sheet with actualRowCount > 1 or rowCount > 1
        let ws = wb.worksheets[0];
        if (targetSheet) {
          const match = wb.worksheets.find((s: any) => s && s.name && s.name.toLowerCase().includes(targetSheet.toLowerCase()));
          if (match && ((match.actualRowCount && match.actualRowCount > 1) || (match.rowCount && match.rowCount > 1))) {
            ws = match;
          }
        }
        if (!ws || (!ws.actualRowCount && !ws.rowCount)) {
          const withData = wb.worksheets.find((s: any) => s && ((s.actualRowCount && s.actualRowCount > 1) || (s.rowCount && s.rowCount > 1)));
          if (withData) ws = withData;
        }
        const rows: string[][] = [];
        if (ws) {
          ws.eachRow({ includeEmpty: true }, (row: any) => {
            const vals: string[] = [];
            const colCount = Math.max(row.cellCount || 0, ws.columnCount || 0, row.actualCellCount || 0);
            for (let c = 1; c <= colCount; c++) {
              const cell = row.getCell(c);
              let val = '';
              const v = cell.value;
              if (v === null || v === undefined) {
                val = '';
              } else if (v instanceof Date) {
                val = v.toISOString().split('T')[0];
              } else if (typeof v === 'object') {
                if (Array.isArray(v.richText)) {
                  val = v.richText.map((rt: any) => rt.text || '').join('');
                } else if ('result' in v && v.result !== undefined && v.result !== null) {
                  val = String(v.result);
                } else if ('text' in v && typeof v.text === 'string') {
                  val = v.text;
                } else if (cell.text && typeof cell.text === 'string') {
                  val = cell.text;
                }
              } else if (cell.text && typeof cell.text === 'string' && cell.text.trim()) {
                val = cell.text;
              } else {
                val = String(v);
              }
              vals.push(val.trim());
            }
            if (vals.some(v => v.length > 0)) {
              rows.push(vals);
            }
          });
        }
        return rows;
      }
    };
  }, [nav, legacyKey]);

  useEffect(() => { loadLegacy().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !window.__nsLegacy) return;
    if (fromLegacy.current) { fromLegacy.current = false; return; }
    const L = window.__nsLegacy;
    const sp = new URLSearchParams(loc.search);
    const label = sp.get('drill');
    const from = sp.get('from') || undefined;
    const back = sp.get('back') ?? 'physical';
    sp.delete('drill'); sp.delete('from'); sp.delete('back');
    /* :name/:id live in the route path, not the query string, so a bare
       loc.search never carries them — applyDrillQuery() then can't find its
       own p.name/p.id and, for a view like 'node' with a label-based
       fallback, derives the wrong identifier from the drill label instead
       (e.g. "Router · X" instead of "X"), silently overwriting the correct
       id setParams() just set from these same route params below. Folding
       them into q keeps the two bridges in agreement. */
    for (const [k, v] of Object.entries(params as Record<string, string>)) {
      if (v && !sp.has(k)) sp.set(k, v);
    }
    const q = sp.toString();

    const combinedParams: Record<string, string> = {
      ...Object.fromEntries(new URLSearchParams(loc.search).entries()),
      ...(params as Record<string, string>)
    };

    const isDcUser = isDatacenterUser();
    const activeGeo: DcGeo | null = isDatacenter() ? (isDcUser ? 'us' : 'in') : null;
    const w = window as any;
    w.__dcGeo = activeGeo;
    if (isDatacenter()) {
      w.__dcSum = dcSumList(activeGeo);
      w.__dcScope = scope(activeGeo);
    }

    isUpdatingFromUrl.current = true;
    try {
      if (isDatacenter()) {
        L.applyGeo?.(activeGeo);
      }
      L.setParams(legacyKey, combinedParams);
      /* always applied, empty query included — a plain URL means the screen's
         clean default state, which is what a breadcrumb click navigates to */
      L.applyDrillQuery(legacyKey, q, label);
      L.setDrill((label || from) ? { view: legacyKey, label: label || '', q, from, back } : null);
      L.go(legacyKey);
    } finally {
      isUpdatingFromUrl.current = false;
    }
  }, [ready, legacyKey, loc.search, params]);

  return (
    <>
      <div id="view" ref={host}>{!ready && <div className="vw-card-description" style={{ padding: "var(--vw-space-2xl)" }}>Loading…</div>}</div>
      {/* the prototype writes the breadcrumb here; the React topbar owns the visible one */}
      <span id="module" hidden /><span id="crumb" hidden />
      {digitalTwinsMount && createPortal(
        <NodeDigitalTwinSection
          key={`${digitalTwinsMount.getAttribute('data-twin-name') || (params.name as string) || 'node'}-${digitalTwinsMount.getAttribute('data-twin-cls') || ''}-${twinTab}`}
          currentNode={digitalTwinsMount.getAttribute('data-twin-name') || digitalTwinsMount.getAttribute('data-node') || (params.name as string) || 'DEL-DWM-010'}
          nodeClass={digitalTwinsMount.getAttribute('data-twin-cls') || digitalTwinsMount.getAttribute('data-cls') || undefined}
          vendor={digitalTwinsMount.getAttribute('data-twin-vendor') || undefined}
          model={digitalTwinsMount.getAttribute('data-twin-model') || undefined}
          ip={digitalTwinsMount.getAttribute('data-twin-ip') || undefined}
          city={digitalTwinsMount.getAttribute('data-twin-city') || undefined}
          activeTab={twinTab}
        />,
        digitalTwinsMount
      )}
    </>
  );
}
