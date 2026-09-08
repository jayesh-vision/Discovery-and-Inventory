import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ActionIcon, IcFilter, IcKebab, IcRefresh, IcSearch, IcX } from './icons';

/* ── types ──────────────────────────────────────────────── */
export interface Column { t: string; r?: boolean }
export interface Action { l: string; onClick?: () => void; danger?: boolean; primary?: boolean }
export interface FilterField { n: string; o?: string[]; h?: string }

export interface DataGridProps<Row> {
  columns: Column[];
  rows: Row[];
  /** total in the population; the grid shows `rows.length` of it */
  total: number;
  renderRow: (row: Row, i: number) => ReactNode[];
  rowKey: (row: Row, i: number) => string;
  rowActions?: (row: Row, i: number) => Action[];
  /** screen-level actions: shown at the top of the toolbar's own menu */
  gridActions?: Action[];
  searchPlaceholder: string;
  filters?: FilterField[];
  /** chips or controls rendered after the search box */
  extra?: ReactNode;
  emptyText?: string;
  onRefresh?: () => void;
  onSearch?: (q: string) => void;
  /** makes the search box controlled — pass the same state onSearch writes to,
      so a Refresh (or anything else) that resets it also clears the box */
  searchValue?: string;
  /** field name → chosen value (or "Contains…" text); called on Apply, and with {} on Reset */
  onFilterChange?: (values: Record<string, string>) => void;
}

const STATUS_COL = /^(status|state)$/i;

/* ── toolbar ────────────────────────────────────────────── */
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, close]);
  return ref;
}

function FilterPanel({ fields, onClose, onApply, onReset }: {
  fields: FilterField[]; onClose: () => void; onApply: (values: Record<string, string>) => void; onReset: () => void;
}) {
  const [fi, setFi] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const f = fields[Math.min(fi, fields.length - 1)];
  const setField = (v: string) => setValues(prev => ({ ...prev, [f.n]: v }));
  return (
    <div className="fpanel" role="dialog" aria-label="Filters">
      <div className="fpanel-head">
        <span className="vw-card-title-sm">Filters</span>
        <button className="fp-x" onClick={onClose} aria-label="Close"><IcX /></button>
      </div>
      <div className="fpanel-body">
        <div className="fpanel-nav">
          {fields.map((x, i) => (
            <button key={x.n} className={`fp-f${i === fi ? ' is-on' : ''}${values[x.n] ? ' has-value' : ''}`} onClick={() => setFi(i)}>{x.n}</button>
          ))}
        </div>
        <div className="fpanel-ctl">
          <span className="fp-label">{f.n}</span>
          {f.o
            ? <span className="nst-select-shell"><select className="nst-input fp-sel" value={values[f.n] ?? ''} onChange={e => setField(e.target.value)}>
                <option value="" />
                {f.o.map(o => <option key={o}>{o}</option>)}
              </select></span>
            : <span className="nst-input-shell"><input className="nst-input" placeholder="Contains…" value={values[f.n] ?? ''} onChange={e => setField(e.target.value)} /></span>}
          {f.h && <span className="fp-hint">{f.h}</span>}
        </div>
      </div>
      <div className="fpanel-foot">
        <span className="grow" />
        <button className="nst-btn nst-btn--sm" onClick={() => { setValues({}); onReset(); onClose(); }}>Reset to default</button>
        <button className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => { onApply(values); onClose(); }}>Apply filters</button>
      </div>
    </div>
  );
}

/* Reads the grid's own rendered table — search and filters already applied —
   and turns exactly what's on screen into a real file, mirroring the
   prototype's exportNearestTable so both sides export the same thing. */
function exportTable(wrap: HTMLDivElement | null, kind: 'csv' | 'xlsx') {
  const table = wrap?.querySelector('table');
  if (!table) { alert('Nothing to export — this grid has no rows yet.'); return; }
  const cell = (td: Element) => `"${(td.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`;
  const lines = [...table.querySelectorAll('tr')].map(tr =>
    [...tr.children].filter(c => !c.classList.contains('kb-th') && !c.classList.contains('kb-td')).map(cell).join(','));
  const name = location.pathname.split('/').filter(Boolean).pop() || 'export';
  const ext = kind === 'xlsx' ? 'xls' : 'csv';
  const blob = new Blob([lines.join('\r\n')], { type: kind === 'xlsx' ? 'application/vnd.ms-excel' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}-export.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stdActions(wrap: HTMLDivElement | null): Action[] {
  return [
    { l: 'Export as CSV', onClick: () => exportTable(wrap, 'csv') },
    { l: 'Export as XLSX', onClick: () => exportTable(wrap, 'xlsx') },
    { l: 'Print', onClick: () => window.print() }
  ];
}

function MenuItem({ a, onDone }: { a: Action; onDone: () => void }) {
  return (
    <button className={`kmenu-i${a.danger ? ' is-danger' : ''}${a.primary ? ' is-primary' : ''}`}
      onClick={() => { a.onClick?.(); onDone(); }}>
      <ActionIcon label={a.l} /><span>{a.l}</span>
    </button>
  );
}

function Toolbar({ showing, total, placeholder, filters, extra, gridActions, onRefresh, onSearch, searchValue, onFilterChange, wrap }: {
  showing: number; total: number; placeholder: string; filters?: FilterField[];
  extra?: ReactNode; gridActions?: Action[]; onRefresh?: () => void; onSearch?: (q: string) => void;
  searchValue?: string; onFilterChange?: (values: Record<string, string>) => void; wrap: React.RefObject<HTMLDivElement | null>;
}) {
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState(false);
  const closeMenu = () => setMenu(false);
  const closeFilter = () => setFilter(false);
  const menuRef = useOutsideClose(menu, closeMenu);
  const filterRef = useOutsideClose(filter, closeFilter);
  const n = (v: number) => v.toLocaleString('en-IN');
  return (
    <div className="grid-bar">
      <span className="vw-card-description grid-count">Showing {n(showing)} of {n(total)}</span>
      <span className="nst-input-shell grid-search">
        <span className="gs-ic"><IcSearch /></span>
        <input className="nst-input" placeholder={placeholder} aria-label="Search" {...(searchValue !== undefined ? { value: searchValue } : {})}
          onChange={e => onSearch?.(e.target.value)} />
      </span>
      {extra}
      <span className="grow" />
      <div className="grid-tools">
        <button className="icon-btn" onClick={onRefresh} aria-label="Refresh"><IcRefresh /></button>
        <div ref={filterRef} style={{ display: 'contents' }}>
          <button className={`icon-btn${filter ? ' is-on' : ''}`} onClick={() => { setFilter(v => !v); setMenu(false); }}
            aria-label="Filters" aria-expanded={filter}><IcFilter /></button>
          {filter && <FilterPanel fields={filters?.length ? filters : [{ n: 'Status', o: ['On-air', 'Planned'] }]} onClose={closeFilter}
            onApply={values => onFilterChange?.(values)} onReset={() => onFilterChange?.({})} />}
        </div>
        <div ref={menuRef} style={{ display: 'contents' }}>
          <button className={`icon-btn${menu ? ' is-on' : ''}`} onClick={() => { setMenu(v => !v); setFilter(false); }}
            aria-label="More actions" aria-expanded={menu}><IcKebab /></button>
          {menu && (
            <div className="kmenu kmenu-r">
              {gridActions?.length ? <>
                {gridActions.map(a => <MenuItem key={a.l} a={a} onDone={closeMenu} />)}
                <div className="kmenu-sep" />
              </> : null}
              {stdActions(wrap.current).map(a => <MenuItem key={a.l} a={a} onDone={closeMenu} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── row action menu ───────────────────────────────────── */
/* The grid scrolls inside a bounded box, which would clip a menu anchored to its
   row. It is placed against the button's position on screen instead, and follows
   it while anything scrolls. */
function useMenuPosition(open: boolean, btn: React.RefObject<HTMLButtonElement | null>, menu: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btn.current, m = menu.current;
      if (!b || !m) return;
      const r = b.getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth, gap = 4;
      const below = r.bottom + gap + h <= window.innerHeight;
      m.style.top = `${below ? r.bottom + gap : Math.max(gap, r.top - gap - h)}px`;
      m.style.left = `${Math.max(gap, Math.min(r.right - w, window.innerWidth - w - gap))}px`;
    };
    place();
    /* capture, so the grid's own scroll counts and not just the page's */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open, btn, menu]);
}

function RowMenu({ actions, open, onToggle, onClose }: { actions: Action[]; open: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useOutsideClose(open, onClose);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useMenuPosition(open, btn, menu);
  /* a row with nothing to offer gets no menu button rather than an empty one */
  if (!actions.length) return <td className="kb-td" />;
  return (
    <td className="kb-td">
      <div ref={ref} style={{ display: 'contents' }}>
        <button ref={btn} className={`kb${open ? ' is-on' : ''}`} onClick={onToggle} aria-label="Row actions" aria-haspopup="menu" aria-expanded={open}>
          <IcKebab />
        </button>
        {open && (
          <div ref={menu} className="kmenu kmenu--fixed" role="menu">
            {actions.map(a => <MenuItem key={a.l} a={a} onDone={onClose} />)}
          </div>
        )}
      </div>
    </td>
  );
}

/* ── infinite scroll ────────────────────────────────────────
   A grid paints its first PAGE_STEP rows and reveals the next PAGE_STEP
   each time the reader reaches the end of what is on screen, so a 289-row
   result set costs 25 rows of DOM until someone actually scrolls it. */
export const PAGE_STEP = 25;

export const GRID_GAP = 72;   /* card padding and footer below the grid */
export const GRID_MIN = 320;  /* never squeezed below ~6 rows */

/* A grid is as tall as its page of 25 rows, and never taller than the room left
   on screen below where it starts — so a screen whose grid is the content fills
   the window, while a grid sitting under KPI cards takes the space it has.
   Measured rather than hard-coded, because a row carrying a second line is half
   again as tall as a plain one. */
export function gridHeight(wrap: HTMLElement): string {
  const row = wrap.querySelector('tbody tr') as HTMLElement | null;
  const head = wrap.querySelector('thead') as HTMLElement | null;
  if (!row) return 'none';
  const page = (head?.offsetHeight ?? 0) + row.offsetHeight * PAGE_STEP;
  let avail = window.innerHeight - Math.max(0, wrap.getBoundingClientRect().top) - GRID_GAP;
  /* the grid starts below the fold (a dashboard): give it a screenful, which is
     what it will have once the reader scrolls down to it */
  if (avail < GRID_MIN) avail = window.innerHeight - GRID_GAP;
  return `${Math.min(page, Math.max(GRID_MIN, avail))}px`;
}

function useInfinite<Row>(rows: Row[]) {
  const [count, setCount] = useState(PAGE_STEP);
  const sentinel = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  /* a new result set (a search, a filter, a tab) starts at the top again */
  useEffect(() => {
    setCount(PAGE_STEP);
    if (wrap.current) wrap.current.scrollTop = 0;
  }, [rows]);
  const more = count < rows.length;
  const loadMore = () => setCount(c => Math.min(c + PAGE_STEP, rows.length));

  /* the bounded height, kept in step with the rows and the window */
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const size = () => el.style.setProperty('--grid-h', gridHeight(el));
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, [rows, count]);

  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el) return;
    if (typeof IntersectionObserver === 'undefined') { setCount(rows.length); return; }
    /* the grid is its own scroller, so it is the root; re-created on every count
       change, so the next block reveals itself when 25 more rows still do not fill it */
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) setCount(c => Math.min(c + PAGE_STEP, rows.length)); },
      { root: wrap.current, rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, count, rows.length]);
  return { visible: rows.slice(0, count), count, more, next: Math.min(PAGE_STEP, rows.length - count), sentinel, wrap, loadMore };
}

/* ── the grid ───────────────────────────────────────────── */
export function DataGrid<Row>(p: DataGridProps<Row>) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const span = p.columns.length + (p.rowActions ? 1 : 0);
  const { visible, count, more, next, sentinel, wrap, loadMore } = useInfinite(p.rows);
  const n = (v: number) => v.toLocaleString('en-IN');
  return (
    <>
      {/* the toolbar counts what is on screen, so the page size is visible without scrolling */}
      <Toolbar showing={Math.min(count, p.rows.length)} total={p.total} placeholder={p.searchPlaceholder}
        filters={p.filters} extra={p.extra} gridActions={p.gridActions} onRefresh={p.onRefresh} onSearch={p.onSearch}
        searchValue={p.searchValue} onFilterChange={p.onFilterChange} wrap={wrap} />
      <div className="tbl-wrap" ref={wrap}>
        <table className="nst-table">
          <thead>
            <tr>
              {p.columns.map(c => <th key={c.t} className={c.r ? 't-right' : undefined}>{c.t}</th>)}
              {p.rowActions && <th className="kb-th" />}
            </tr>
          </thead>
          <tbody>
            {visible.length ? visible.map((row, ri) => {
              const key = p.rowKey(row, ri);
              const cells = p.renderRow(row, ri);
              return (
                <tr key={key}>
                  {cells.map((c, i) => {
                    const cls = [p.columns[i]?.r ? 't-right num' : '', i === 0 && STATUS_COL.test(p.columns[0].t) ? 'st-td' : '']
                      .filter(Boolean).join(' ');
                    return <td key={i} className={cls || undefined}>{c}</td>;
                  })}
                  {p.rowActions && (
                    <RowMenu actions={p.rowActions(row, ri)} open={openRow === key}
                      onToggle={() => setOpenRow(v => v === key ? null : key)} onClose={() => setOpenRow(null)} />
                  )}
                </tr>
              );
            }) : (
              <tr><td colSpan={span} className="tbl-empty">{p.emptyText ?? 'No records match the current filter.'}</td></tr>
            )}
          </tbody>
        </table>
        {/* both the observer's sentinel and a plain button, so the next block
            arrives on scroll and can also be asked for */}
        {more && (
          <button type="button" ref={sentinel} className="tbl-more" onClick={loadMore}>
            Load the next {n(next)}{' '}
            <span className="tbl-more-of">· {n(count)} of {n(p.rows.length)} loaded</span>
          </button>
        )}
      </div>
    </>
  );
}
