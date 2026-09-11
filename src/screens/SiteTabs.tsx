import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Chip, StatStrip } from '../components/ui';
import type { ChipTone, ColorTone } from '../data/ledger';
import { locationOf, type Location } from '../data/locations';
import { loadLegacy } from '../legacy/LegacyView';

/* The site screen's header and section tabs. The first four sections render in
   the prototype, the last two are React — but the header (chips, stat strip,
   tab counts) is one thing: the prototype computes it and hands it over as
   data, so both worlds draw the same numbers. */
export interface SiteHead {
  id: string; name: string; type: string; city: string; state: string;
  addr: string; lat: number; lon: number; ne: number; disc: number;
  sub: string; coords: string;
  chips: { t: string; tone: ChipTone; strong?: boolean }[];
  meta: [string, string][];
  cells: { k: string; v: string; s: string; t: ColorTone; section?: string;
    drill?: { v: string; l: string; q: string } }[];
  tabs: { attn: number; ne: string; capex: string; opex: string };
}

const headOf = (id: string): SiteHead | null =>
  (window.__nsLegacy?.siteHead?.(id) as SiteHead | undefined) ?? null;

/* Tab hops stay inside the same site, so the drill label and ?from= origin
   the reader arrived with ride along — the breadcrumb keeps naming the path
   that actually got them here (e.g. Resources > Physical Resources > …). */
function useKeepContext() {
  const { search } = useLocation();
  return (path: string) => {
    const sp = new URLSearchParams(search);
    const out = new URLSearchParams();
    const d = sp.get('drill'), f = sp.get('from');
    if (d) out.set('drill', d);
    if (f) out.set('from', f);
    const qs = out.toString();
    return qs ? `${path}?${qs}` : path;
  };
}

export function useSiteHead(id: string): SiteHead | null {
  const [head, setHead] = useState<SiteHead | null>(() => headOf(id));
  useEffect(() => {
    const h = headOf(id);
    if (h) { setHead(h); return; }
    let on = true;
    loadLegacy().then(() => { if (on) setHead(headOf(id)); }).catch(() => {});
    return () => { on = false; };
  }, [id]);
  return head;
}

/* The React sample list only covers a handful of sites; the prototype's full
   roster is the source of truth, so its record wins once the bundle is up. */
export function useSiteLocation(id: string): { l: Location; head: SiteHead | null } {
  const head = useSiteHead(id);
  const l = useMemo<Location>(() => {
    const base = locationOf(id);
    return head ? { ...base, id: head.id, name: head.name, type: head.type, city: head.city,
      state: head.state, addr: head.addr, lat: head.lat, lon: head.lon, ne: head.ne, disc: head.disc } : base;
  }, [id, head]);
  return { l, head };
}

export function SiteHeader({ l, head }: { l: Location; head: SiteHead | null }) {
  return (
    <>
      <div className="page-head">
        <div className="stack-x" style={{ maxWidth: '70ch' }}>
          <h1 className="vw-page-title" style={{ margin: 0 }}>{l.name}</h1>
          <p className="vw-page-description" style={{ margin: 0 }}>{head?.sub ?? `${l.type} · ${l.id} · ${l.city}, ${l.state}`}</p>
        </div>
      </div>
      {head && (
        <>
          <Card style={{ padding: 'var(--vw-space-md) var(--vw-space-lg)' }}>
            <div className="chip-row">
              {head.chips.map(c => <Chip key={c.t} tone={c.tone} strong={c.strong}>{c.t}</Chip>)}
            </div>
            <div className="site-meta">
              {head.meta.map(([k, v]) => (
                <div key={k} className="meta-cell"><span className="vw-label">{k}</span><span className="vw-value">{v}</span></div>
              ))}
            </div>
          </Card>
          <StatStrip cells={head.cells.map(c => ({ k: c.k, v: c.v, s: c.s, t: c.t }))} />
        </>
      )}
    </>
  );
}

export function SiteTabs({ l, head, active }: { l: Location; head: SiteHead | null; active?: 'details' | 'equipment' }) {
  const nav = useNavigate();
  const keep = useKeepContext();
  const base = `/inventory/location/site/${l.id}`;
  const toNe = () => { window.__nsLegacy?.setSection?.('ne'); nav(keep(base)); };
  return (
    <div className="section-tabs">
      <button className="stab" onClick={() => nav(keep(base))}>
        Attention{head && <> <span className="tab-n num">{head.tabs.attn}</span></>}</button>
      <button className="stab" onClick={toNe}>
        Network elements{head && <> <span className="tab-n num">{head.tabs.ne}</span></>}</button>
      <button className="stab" onClick={() => nav(keep(base + '/capex'))}>
        Capex{head && <> <span className="tab-n num">{head.tabs.capex}</span></>}</button>
      <button className="stab" onClick={() => nav(keep(base + '/opex'))}>
        Opex{head && <> <span className="tab-n num">{head.tabs.opex}</span></>}</button>
      <button className={`stab${active === 'details' ? ' is-on' : ''}`} onClick={() => nav(keep(base + '/details'))}>Site details</button>
      <button className={`stab${active === 'equipment' ? ' is-on' : ''}`} onClick={() => nav(keep(base + '/equipment'))}>Site equipment</button>
    </div>
  );
}
