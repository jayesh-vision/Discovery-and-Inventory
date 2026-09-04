import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActionIcon, IcFilter, IcKebab, IcNext, IcPrev, IcRefresh, IcSearch, IcX } from './icons';

/* ── types ──────────────────────────────────────────────── */
export interface Column { t: string; r?: boolean }
export interface Action { l: string; onClick?: () => void; danger?: boolean; primary?: boolean }
export interface FilterField { n: string; o?: string[]; h?: string }

export interface DataGridProps<Row> {
  columns: Column[];
  rows: Row[];
  /** total in the population; the grid shows `rows.length` of it */
  total: number;
  /** when paginated, the toolbar shows the total only and the pager shows the range */
  paginated?: boolean;
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

function FilterPanel({ fields, onClose }: { fields: FilterField[]; onClose: () => void }) {
  const [fi, setFi] = useState(0);
  const f = fields[Math.min(fi, fields.length - 1)];
  return (
    <div className="fpanel" role="dialog" aria-label="Filters">
      <div className="fpanel-head">
        <span className="vw-card-title-sm">Filters</span>
        <button className="fp-x" onClick={onClose} aria-label="Close"><IcX /></button>
      </div>
      <div className="fpanel-body">
        <div className="fpanel-nav">
          {fields.map((x, i) => (
            <button key={x.n} className={`fp-f${i === fi ? ' is-on' : ''}`} onClick={() => setFi(i)}>{x.n}</button>
          ))}
        </div>
        <div className="fpanel-ctl">
          <span className="fp-label">{f.n}</span>
          {f.o
            ? <span className="nst-select-shell"><select className="nst-input fp-sel" defaultValue="">
                <option value="" />
                {f.o.map(o => <option key={o}>{o}</option>)}
              </select></span>
            : <span className="nst-input-shell"><input className="nst-input" placeholder="Contains…" /></span>}
          {f.h && <span className="fp-hint">{f.h}</span>}
        </div>
      </div>
      <div className="fpanel-foot">
        <button className="nst-btn nst-btn--sm">Advance</button>
        <span className="grow" />
        <button className="nst-btn nst-btn--sm" onClick={onClose}>Reset to default</button>
        <button className="nst-btn nst-btn--sm nst-btn--filled" onClick={onClose}>Apply filters</button>
      </div>
    </div>
  );
}

const STD_ACTIONS = ['Export as CSV', 'Export as XLSX', 'Choose columns', 'Save this view', 'Print'];

function MenuItem({ a, onDone }: { a: Action; onDone: () => void }) {
  return (
    <button className={`kmenu-i${a.danger ? ' is-danger' : ''}${a.primary ? ' is-primary' : ''}`}
      onClick={() => { a.onClick?.(); onDone(); }}>
      <ActionIcon label={a.l} /><span>{a.l}</span>
    </button>
  );
}

function Toolbar({ showing, total, paginated, placeholder, filters, extra, gridActions, onRefresh, onSearch }: {
  showing: number; total: number; paginated?: boolean; placeholder: string; filters?: FilterField[];
  extra?: ReactNode; gridActions?: Action[]; onRefresh?: () => void; onSearch?: (q: string) => void;
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
      <span className="vw-card-description grid-count">
        {paginated ? <><span className="num">{n(total)}</span> records</> : <>Showing {n(showing)} of {n(total)}</>}
      </span>
      <span className="nst-input-shell grid-search">
        <span className="gs-ic"><IcSearch /></span>
        <input className="nst-input" placeholder={placeholder} aria-label="Search" onChange={e => onSearch?.(e.target.value)} />
      </span>
      {extra}
      <span className="grow" />
      <div className="grid-tools">
        <button className="icon-btn" onClick={onRefresh} aria-label="Refresh"><IcRefresh /></button>
        <div ref={filterRef} style={{ display: 'contents' }}>
          <button className={`icon-btn${filter ? ' is-on' : ''}`} onClick={() => { setFilter(v => !v); setMenu(false); }}
            aria-label="Filters" aria-expanded={filter}><IcFilter /></button>
          {filter && <FilterPanel fields={filters?.length ? filters : [{ n: 'Status', o: ['On-air', 'Planned'] }]} onClose={closeFilter} />}
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
              {STD_ACTIONS.map(l => <MenuItem key={l} a={{ l }} onDone={closeMenu} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── row action menu ───────────────────────────────────── */
function RowMenu({ actions, open, onToggle, onClose }: { actions: Action[]; open: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useOutsideClose(open, onClose);
  return (
    <td className="kb-td">
      <div ref={ref} style={{ display: 'contents' }}>
        <button className={`kb${open ? ' is-on' : ''}`} onClick={onToggle} aria-label="Row actions" aria-haspopup="menu" aria-expanded={open}>
          <IcKebab />
        </button>
        {open && (
          <div className="kmenu" role="menu">
            {actions.map(a => <MenuItem key={a.l} a={a} onDone={onClose} />)}
          </div>
        )}
      </div>
    </td>
  );
}

/* ── the grid ───────────────────────────────────────────── */
export function DataGrid<Row>(p: DataGridProps<Row>) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const span = p.columns.length + (p.rowActions ? 1 : 0);
  return (
    <>
      <Toolbar showing={p.rows.length} total={p.total} paginated={p.paginated} placeholder={p.searchPlaceholder}
        filters={p.filters} extra={p.extra} gridActions={p.gridActions} onRefresh={p.onRefresh} onSearch={p.onSearch} />
      <div className="tbl-wrap">
        <table className="nst-table">
          <thead>
            <tr>
              {p.columns.map(c => <th key={c.t} className={c.r ? 't-right' : undefined}>{c.t}</th>)}
              {p.rowActions && <th className="kb-th" />}
            </tr>
          </thead>
          <tbody>
            {p.rows.length ? p.rows.map((row, ri) => {
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
      </div>
    </>
  );
}

/* ── pagination ─────────────────────────────────────────── */
export const PAGE_SIZES = [20, 50, 100];

export function usePager(total: number, initialSize = 20) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const last = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(page, last);
  const slice = <T,>(rows: T[]) => rows.slice((cur - 1) * size, cur * size);
  return { page: cur, size, last, setPage, setSize: (s: number) => { setSize(s); setPage(1); }, slice };
}

function pageWindow(cur: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  let a = Math.max(2, cur - 1), b = Math.min(last - 1, cur + 1);
  if (cur <= 3) { a = 2; b = 4; }
  if (cur >= last - 2) { a = last - 3; b = last - 1; }
  if (a > 2) out.push('…');
  for (let i = a; i <= b; i++) out.push(i);
  if (b < last - 1) out.push('…');
  out.push(last);
  return out;
}

export function Pager({ total, page, size, last, note, onPage, onSize }: {
  total: number; page: number; size: number; last: number; note?: string;
  onPage: (p: number) => void; onSize: (s: number) => void;
}) {
  const n = (v: number) => v.toLocaleString('en-IN');
  const from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
  return (
    <div className="pgr">
      <span className="vw-card-description pgr-note">
        {total ? <>Showing <span className="num">{n(from)}–{n(to)}</span> of <span className="num">{n(total)}</span>{note ? ' ' + note : ''}</> : 'No records'}
      </span>
      <span className="grow" />
      <span className="pgr-size">
        <span className="vw-card-description">Rows</span>
        <select className="nst-input pgr-sel" value={size} onChange={e => onSize(Number(e.target.value))} aria-label="Rows per page">
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </span>
      <span className="pgr-nav">
        <button className="pgr-b" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><IcPrev /></button>
        {pageWindow(page, last).map((v, i) => v === '…'
          ? <span key={'gap' + i} className="pgr-gap">…</span>
          : <button key={v} className={`pgr-b pgr-num${v === page ? ' is-on' : ''}`} aria-current={v === page ? 'page' : undefined}
              onClick={() => onPage(v)}>{v}</button>)}
        <button className="pgr-b" disabled={page === last} onClick={() => onPage(page + 1)} aria-label="Next page"><IcNext /></button>
      </span>
    </div>
  );
}
