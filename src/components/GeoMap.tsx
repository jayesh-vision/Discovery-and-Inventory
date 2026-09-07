import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import geo from '../data/geo.json';
import sitesJson from '../data/sites.json';
import { Tip } from './charts';

/* ── an interactive estate map ─────────────────────────────
   Two levels. Zoomed out, each state is one cluster bubble; click it (or
   zoom past the threshold) and the cluster breaks into its sites. Sites
   open a detail card with a link into Inventory. Pan by dragging, zoom by
   wheel or the buttons, search a state or a site by name.

   Dissolved state polygons in Web Mercator, drawn inline: tile servers
   are not reachable from every host this app runs on, and outlines are
   all the map needs. */

const GEO = geo as { W: number; H: number; LON0: number; K: number; Y0: number; KY: number; paths: Record<string, string> };
const mpx = (lon: number) => (lon - GEO.LON0) * GEO.K;
const mpy = (lat: number) => (GEO.Y0 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) * GEO.KY;

export interface Site { id: string; name: string; city: string; st: string; c: string; region: string; type: string; x: number; y: number; router: number; switch: number }
const SITES = (sitesJson as { sites: Site[]; bboxes: Record<string, number[]> }).sites;
const BBOX = (sitesJson as { sites: Site[]; bboxes: Record<string, number[]> }).bboxes;

export interface Bubble { st: string; c: string; region: string; lat: number; lon: number; parts: { n: string; c: number; hex: string }[] }

const fmt = (v: number) => v.toLocaleString('en-IN');
const BREAK_AT = 2.2;                 /* zoom at which clusters break into sites */
const MAX_K = 9;

function Ring({ x, y, R, r, parts, label, cls, onClick, onEnter, onMove }: {
  x: number; y: number; R: number; r: number; parts: { c: number; hex: string }[]; label: string; cls?: string;
  onClick?: () => void; onEnter?: (e: React.MouseEvent) => void; onMove?: (e: React.MouseEvent) => void;
}) {
  const tot = parts.reduce((a, p) => a + p.c, 0); let a0 = -Math.PI / 2;
  return (
    <g className={`geo-b ${cls ?? ''}`} onClick={onClick} onMouseEnter={onEnter} onMouseMove={onMove}>
      <circle cx={x} cy={y} r={R + 3} className="geo-halo" />
      {parts.map((p, i) => {
        const span = (p.c / tot) * Math.PI * 2, a1 = a0 + span;
        const P = (rad: number, t: number) => [x + rad * Math.cos(t), y + rad * Math.sin(t)];
        const [x0, y0] = P(R, a0), [x1, y1] = P(R, a1), [x2, y2] = P(r, a1), [x3, y3] = P(r, a0);
        const big = span > Math.PI ? 1 : 0; a0 = a1;
        return <path key={i} d={`M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`} fill={p.hex} />;
      })}
      <circle cx={x} cy={y} r={r} fill="var(--vw-color-white)" />
      <text x={x} y={y + (R > 20 ? 5 : 4)} textAnchor="middle" className={R > 20 ? 'geo-n' : 'geo-n geo-n-s'}>{label}</text>
    </g>
  );
}

export function GeoMap({ bubbles, legend, region }: { bubbles: Bubble[]; legend: { n: string; hex: string }[]; region?: string }) {
  const nav = useNavigate();
  const sites = useMemo(() => region ? SITES.filter(s => s.region === region) : SITES, [region]);
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });       /* translate + scale, in map units */
  const [anim, setAnim] = useState(true);
  const [sel, setSel] = useState<string | null>(null);           /* selected state */
  const [site, setSite] = useState<Site | null>(null);
  const [hov, setHov] = useState<{ kind: 'state' | 'site'; id: string; x: number; y: number } | null>(null);
  const [q, setQ] = useState('');
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const byState = useMemo(() => Object.fromEntries(bubbles.map(b => [b.st, b])), [bubbles]);
  const hexOf = (n: string) => legend.find(l => l.n === n)?.hex ?? 'currentColor';
  const broken = view.k >= BREAK_AT;

  /* ── camera ──────────────────────────────────────────── */
  /* Panning and zoom-to-cursor are otherwise unbounded, so a drag or a wheel
     zoom can carry the whole estate off-canvas and leave the map looking
     blank with nothing to click back to. Keep at least a slice of the
     content on screen at every zoom level. */
  const clamp = (x: number, y: number, k: number) => {
    const sx = GEO.W * 0.4, sy = GEO.H * 0.4;
    return {
      x: Math.min(GEO.W - sx, Math.max(sx - GEO.W * k, x)),
      y: Math.min(GEO.H - sy, Math.max(sy - GEO.H * k, y))
    };
  };
  const fit = useCallback((bb: number[], pad = 0.25, maxK = 6) => {
    const bw = bb[2] - bb[0], bh = bb[3] - bb[1];
    const k = Math.min(maxK, Math.max(1, Math.min(GEO.W / (bw * (1 + pad)), GEO.H / (bh * (1 + pad)))));
    const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    setAnim(true); setView({ k, ...clamp(GEO.W / 2 - cx * k, GEO.H / 2 - cy * k, k) });
  }, []);
  const reset = () => { setAnim(true); setView({ k: 1, x: 0, y: 0 }); setSel(null); setSite(null); };
  const zoomBy = (f: number, px = GEO.W / 2, py = GEO.H / 2) => setView(v => {
    const k = Math.min(MAX_K, Math.max(1, v.k * f)); if (k === v.k) return v;
    /* keep the point under (px,py) fixed */
    const x = px - (px - v.x) * (k / v.k), y = py - (py - v.y) * (k / v.k);
    return { k, ...clamp(x, y, k) };
  });
  const openState = (st: string) => { setSel(st); setSite(null); fit(BBOX[st] ?? [0, 0, GEO.W, GEO.H], 0.35, Math.max(BREAK_AT + 0.3, 3)); };

  /* pointer: drag to pan, wheel to zoom at the cursor */
  const toMap = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current!.getBoundingClientRect(); const s = GEO.W / r.width;
    return { px: (e.clientX - r.left) * s, py: (e.clientY - r.top) * s };
  };
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; setAnim(false); };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const r = wrap.current!.getBoundingClientRect(); const s = GEO.W / r.width;
    const dx = (e.clientX - drag.current.x) * s, dy = (e.clientY - drag.current.y) * s;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    /* read drag.current now, not inside the updater — a pointerup can null it
       out before React gets around to applying this state update, which
       crashed the whole map (and everything below it) mid-gesture */
    const nx = drag.current.vx + dx, ny = drag.current.vy + dy;
    setView(v => ({ ...v, ...clamp(nx, ny, v.k) }));
  };
  const onUp = () => { drag.current = null; };
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const h = (e: WheelEvent) => { e.preventDefault(); const { px, py } = toMap(e); setAnim(false); zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, px, py); };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  /* search: a state name or a site name */
  const go = (term: string) => {
    const t = term.trim().toLowerCase(); if (!t) return;
    const st = bubbles.find(b => b.st.toLowerCase().startsWith(t) || b.c.toLowerCase() === t);
    if (st) { openState(st.st); return; }
    const s = sites.find(x => x.name.toLowerCase().includes(t) || x.city.toLowerCase().startsWith(t) || x.id.toLowerCase() === t);
    if (s) { setSel(s.st); setSite(s); setAnim(true); const k = 6; setView({ k, x: GEO.W / 2 - s.x * k, y: GEO.H / 2 - s.y * k }); }
  };

  /* which sites to draw: only inside the viewport once clusters are broken */
  const visibleSites = useMemo(() => {
    if (!broken) return [];
    const x0 = -view.x / view.k, y0 = -view.y / view.k, x1 = (GEO.W - view.x) / view.k, y1 = (GEO.H - view.y) / view.k;
    return sites.filter(s => s.x > x0 - 40 && s.x < x1 + 40 && s.y > y0 - 40 && s.y < y1 + 40);
  }, [broken, view, sites]);

  const hb = hov?.kind === 'state' ? byState[hov.id] : null;
  const hs = hov?.kind === 'site' ? sites.find(s => s.id === hov.id) : null;
  const selStats = sel ? byState[sel] : null;
  const R = 27 / Math.sqrt(view.k), r = R * 0.78;          /* bubbles shrink a little as you zoom in */
  const sR = 15 / Math.sqrt(view.k), sr = sR * 0.72;

  return (
    <div className={`geo${drag.current ? ' is-drag' : ''}`} ref={wrap} onMouseLeave={() => setHov(null)}>
      <div className="geo-top">
        <div className="geo-crumb">
          <button className={`geo-cr${sel ? '' : ' is-on'}`} onClick={reset}>All India</button>
          {sel && <><span className="geo-cr-sep">›</span><button className="geo-cr is-on" onClick={() => openState(sel)}>{sel}</button></>}
          {site && <><span className="geo-cr-sep">›</span><span className="geo-cr is-on">{site.name}</span></>}
        </div>
        <span className="nst-input-shell geo-search">
          <input className="nst-input" placeholder="State or site…" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') go(q); }} aria-label="Search state or site" />
        </span>
      </div>
      <div className="geo-legend">
        {legend.map(l => <span key={l.n} className="ch-leg"><span className="ch-dot" style={{ background: l.hex }} />{l.n}</span>)}
        <span className="geo-legend-hint">{broken ? 'sites · click one for details' : 'states · click to open'}</span>
      </div>
      <div className="geo-zoom">
        <button className="icon-btn" onClick={() => { setAnim(true); zoomBy(1.4); }} aria-label="Zoom in">+</button>
        <span className="vw-card-description num">{view.k.toFixed(1)}×</span>
        <button className="icon-btn" onClick={() => { setAnim(true); zoomBy(1 / 1.4); }} aria-label="Zoom out">−</button>
        <button className="icon-btn" onClick={reset} aria-label="Reset view" title="Reset view">⌂</button>
      </div>

      <svg viewBox={`0 0 ${GEO.W} ${GEO.H}`} className="geo-svg" role="img" aria-label="Discovered devices by state and site"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <defs>
          <filter id="geo-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity=".28" /></filter>
        </defs>
        <g className={anim ? 'geo-cam is-anim' : 'geo-cam'} transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {Object.entries(GEO.paths).map(([st, d]) => {
            const has = !!byState[st], isSel = sel === st, dim = !!sel && !isSel;
            return (
              <path key={st} d={d} className={`geo-st${has ? ' has' : ''}${isSel ? ' is-sel' : ''}${dim ? ' is-dim' : ''}`}
                strokeWidth={0.9 / view.k}
                onClick={() => { if (drag.current?.moved) return; if (has) openState(st); }}
                onMouseEnter={e => { if (has && !broken) setHov({ kind: 'state', id: st, x: e.clientX, y: e.clientY }); }}
                onMouseMove={e => { if (has && !broken) setHov({ kind: 'state', id: st, x: e.clientX, y: e.clientY }); }}>
                <title>{st}</title>
              </path>
            );
          })}

          {/* clusters */}
          {!broken && bubbles.map(b => (
            <Ring key={b.st} x={mpx(b.lon)} y={mpy(b.lat)} R={R} r={r} parts={b.parts} label={fmt(b.parts.reduce((a, p) => a + p.c, 0))}
              onClick={() => { if (!drag.current?.moved) openState(b.st); }}
              onEnter={e => setHov({ kind: 'state', id: b.st, x: e.clientX, y: e.clientY })} onMove={e => setHov({ kind: 'state', id: b.st, x: e.clientX, y: e.clientY })} />
          ))}

          {/* sites */}
          {visibleSites.map(s => (
            <Ring key={s.id} x={s.x} y={s.y} R={sR} r={sr} cls={`${site?.id === s.id ? 'is-sel' : ''}${sel && s.st !== sel ? ' is-other' : ''}`}
              parts={[{ c: s.router, hex: hexOf('Router') }, { c: s.switch, hex: hexOf('Switch') }]} label={fmt(s.router + s.switch)}
              onClick={() => { if (!drag.current?.moved) { setSel(s.st); setSite(s); } }}
              onEnter={e => setHov({ kind: 'site', id: s.id, x: e.clientX, y: e.clientY })} onMove={e => setHov({ kind: 'site', id: s.id, x: e.clientX, y: e.clientY })} />
          ))}
        </g>
      </svg>

      {hov && hb && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{hb.st} <span className="ch-tip-dim">· {hb.region}</span></div>
          <div className="ch-tip-cols">{hb.parts.map(p => <div key={p.n} className="ch-tip-col"><span><span className="ch-dot" style={{ background: p.hex }} />{p.n}</span><span className="num">{fmt(p.c)}</span></div>)}</div>
          <div className="ch-tip-r ch-tip-dim">{sites.filter(s => s.st === hb.st).length} sites · click to open</div>
        </Tip>
      )}
      {hov && hs && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{hs.name} <span className="ch-tip-dim">· {hs.type}</span></div>
          <div className="ch-tip-cols">
            <div className="ch-tip-col"><span><span className="ch-dot" style={{ background: hexOf('Router') }} />Routers</span><span className="num">{fmt(hs.router)}</span></div>
            <div className="ch-tip-col"><span><span className="ch-dot" style={{ background: hexOf('Switch') }} />Switches</span><span className="num">{fmt(hs.switch)}</span></div>
          </div>
        </Tip>
      )}

      {/* detail card for the selection */}
      {(site || selStats) && (
        <div className="geo-card">
          {site ? <>
            <div className="geo-card-h"><span className="vw-card-title-sm">{site.name}</span><button className="fp-x" onClick={() => setSite(null)} aria-label="Close">×</button></div>
            <div className="vw-card-description">{site.type} · {site.city}, {site.st} · <span className="mono">{site.id}</span></div>
            <div className="geo-card-stats">
              <span><b className="num">{fmt(site.router)}</b> routers</span><span><b className="num">{fmt(site.switch)}</b> switches</span>
              <span><b className="num">{fmt(site.router + site.switch)}</b> identified</span>
            </div>
            <div className="row vw-gap-sm">
              <button className="nst-btn nst-btn--xs nst-btn--filled" onClick={() => nav(`/inventory/location/site/${site.id}`)}>Open site</button>
              <button className="nst-btn nst-btn--xs" onClick={() => nav(`/inventory/physical?loc=${site.id}`)}>Elements at this site</button>
            </div>
          </> : selStats && <>
            <div className="geo-card-h"><span className="vw-card-title-sm">{selStats.st}</span><button className="fp-x" onClick={reset} aria-label="Close">×</button></div>
            <div className="vw-card-description">{selStats.region} region · {sites.filter(s => s.st === sel).length} sites</div>
            <div className="geo-card-stats">
              {selStats.parts.map(p => <span key={p.n}><b className="num">{fmt(p.c)}</b> {p.n.toLowerCase()}</span>)}
              <span><b className="num">{fmt(selStats.parts.reduce((a, p) => a + p.c, 0))}</b> identified</span>
            </div>
            <div className="vw-card-metric-label-sub">Click a site for its details, or drag to pan.</div>
          </>}
        </div>
      )}
    </div>
  );
}
