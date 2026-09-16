import { useLocation, useNavigate } from 'react-router-dom';
import { SCREENS } from '../routes';

export function screenFor(pathname: string) {
  return SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$').test(pathname));
}

/* concrete param values of the current URL, read off the screen's pattern */
function paramsOf(pattern: string, pathname: string): Record<string, string> {
  const names = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
  if (!names.length) return {};
  const m = pathname.match(new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$'));
  if (!m) return {};
  return Object.fromEntries(names.map((nm, i) => [nm, m[i + 1]]));
}

/* The single navigation for every page: a plain-text breadcrumb built from
   the screen's crumb chain, "Location > Site details > Capex". Every prefix
   that names a real screen (with its params resolvable from the current URL)
   is a link back up; the last segment is plain text. An active drill-down
   ("All locations", "Routers in inventory") appends as one more segment, and
   the screen's own segment then links to its clean path — clicking it is how
   the drill is cleared. No banners, no back buttons: this is the way back.

   A cross-section jump ("Site info" on Physical Resources, "View details" on
   a site's NE table) names its origin in ?from=<crumb>. The ancestors are
   then the origin's chain — the reader came from there, not from this
   screen's nominal parent — and this screen contributes only its leaf. */
export default function Topbar() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const s = screenFor(pathname);
  if (!s) return null;
  const params = paramsOf(s.path, pathname);
  const sp = new URLSearchParams(search);
  const drill = sp.get('drill');
  const from = sp.get('from');

  /* Insights and Reconciliation are the sidebar's own landing pages — nowhere
  shallower to drill back to from here, so there's no real trail to show. */
  if (s.key === 'insights' || s.key === 'reconcile') {
    return null;
  }
  /* Every other sidebar-rail landing page has the same "second page title"
     problem as the four above, just in one of two shapes: a single-segment
     crumb with no " · " parent at all (Location, Services, Inactive
     inventory, Scan jobs, Scan targets), or a " · " parent ("Resources", "Connectivity") that isn't
     itself a real, clickable screen (Virtual/Physical/Passive Resources,
     Links) — routes.ts has no screen whose crumb is exactly "Resources" or
     "Connectivity" for targetFor() to resolve. Either way, undrilled, the
     breadcrumb below would only ever render dead or duplicate text, so
     these stay suppressed the same way Location does — up to the point a
     reader actually drills into something (a KPI card, a donut segment),
     at which point the drill branch further down gives the trail a real
     destination to name. */
  if ((s.key === 'location' || s.key === 'virtual' || s.key === 'physical' || s.key === 'passive'
    || s.key === 'links' || s.key === 'services' || s.key === 'inactive'
    || s.key === 'jobs' || s.key === 'targets') && !drill) {
    return null;
  }

  const targetFor = (prefix: string): string | null => {
    const t = SCREENS.find(x => x.crumb === prefix || x.crumb.toLowerCase() === prefix.toLowerCase());
    if (!t) return null;
    let path = t.path;
    const mergedParams: Record<string, string> = { ...params };
    if (!mergedParams.id && (params.name || sp.get('site') || sp.get('id'))) {
      const siteRef = sp.get('site') || sp.get('id') || (window as any).__nsLegacy?.resolveSite?.(params.name)?.id;
      if (siteRef) mergedParams.id = siteRef;
    }
    for (const [k, v] of Object.entries(mergedParams)) path = path.replace(':' + k, v);
    return path.includes(':') ? null : path;
  };

  /* A jump made while the origin screen was itself mid-drill (Location's
     "All locations" list, say) carries that state as "<crumb>?<query>" —
     see drillTo() in app-router.js. Split it back apart: the crumb still
     resolves the origin screen, the query is spliced onto that screen's own
     segment below so its link returns to the exact list the reader left,
     not the screen's plain default view. */
  const fromQMark = from ? from.indexOf('?') : -1;
  const fromCrumb = fromQMark >= 0 ? from!.slice(0, fromQMark) : from;
  const fromQuery = fromQMark >= 0 ? from!.slice(fromQMark + 1) : '';

  const origin = fromCrumb && fromCrumb.toLowerCase() !== s.crumb.toLowerCase()
    ? SCREENS.find(x => x.crumb === fromCrumb || x.crumb.toLowerCase() === fromCrumb.toLowerCase())
    : undefined;
  const ownParts = s.crumb.split(' · ');
  const chain = origin ? origin.crumb.split(' · ') : ownParts.slice(0, -1);
  const leaf = ownParts[ownParts.length - 1];

  const segs: { label: string; to: string | null }[] = chain.map((label, i) => {
    const base = targetFor(chain.slice(0, i + 1).join(' · '));
    const isOriginLeaf = !!origin && i === chain.length - 1;
    return { label, to: base && isOriginLeaf && fromQuery ? `${base}?${fromQuery}` : base };
  });
  /* A drilled screen with no " · " parent of its own (Location, today) would
     otherwise lose its only ancestor: the drill label below replaces the
     leaf outright, and the chain above is empty, so there'd be nothing left
     to click back to the screen's own base view. Every other drilled screen
     already has a real chain segment ahead of its leaf, so this only ever
     fires for that empty-chain case. */
  if (drill && !chain.length) {
    segs.push({ label: leaf, to: pathname });
  }
  /* A drill label is always the more specific replacement for the screen's
     static leaf ("View" → "Virtual element details · NTSON3435004",
     "Lifecycle operation" → "Lifecycle operation · NTSON3435004") — show one
     final segment, not the generic leaf followed by the specific one. */
  segs.push(drill ? { label: drill, to: null } : { label: leaf, to: null });

  return (
    <nav className="topbar" aria-label="Breadcrumb">
      {segs.map((g, i) => (
        <span key={i} className="topbar-seg">
          {i > 0 && <span className="topbar-crumb-sep">&gt;</span>}
          {g.to
            ? <button className="topbar-crumb-link" onClick={() => nav(g.to as string)}>{g.label}</button>
            : <span className={i === segs.length - 1 ? 'topbar-crumb-current' : 'topbar-crumb-text'}>{g.label}</span>}
        </span>
      ))}
    </nav>
  );
}
