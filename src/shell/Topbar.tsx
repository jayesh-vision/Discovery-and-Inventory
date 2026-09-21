import { useLocation, useNavigate } from 'react-router-dom';
import { SCREENS } from '../routes';
import { reportDefById } from '../data/reports';

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
    || s.key === 'jobs' || s.key === 'targets') && !drill && !from) {
    return null;
  }

  const screenForCrumb = (prefix: string) => {
    const p = prefix.toLowerCase();
    const matches = (x: typeof SCREENS[number]) =>
      x.crumb.toLowerCase() === p ||
      x.key.toLowerCase() === p ||
      x.crumb.split(' · ').pop()?.toLowerCase() === p;
    /* two modules can own a screen with the same crumb (both have "Reports");
       the one in the reader's own module wins */
    return SCREENS.find(x => matches(x) && x.module === s.module) ?? SCREENS.find(matches);
  };

  const targetFor = (prefix: string): string | null => {
    const t = screenForCrumb(prefix);
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

  const ownParts = s.crumb.split(' · ');
  const leaf = ownParts[ownParts.length - 1];

  let segs: { label: string; to: string | null }[] = [];

  /* Unwind nested cross-section jumps (e.g. Insights -> Jobs [RAN] -> Targets in DSC-RAN-BLR -> Transcript) */
  interface OriginHop {
    crumb: string;
    query: string;
    drill: string | null;
    from: string | null;
  }

  const hops: OriginHop[] = [];
  let currFrom: string | null = from;
  while (currFrom && hops.length < 5) {
    const qMark = currFrom.indexOf('?');
    const crumb = qMark >= 0 ? currFrom.slice(0, qMark) : currFrom;
    const query = qMark >= 0 ? currFrom.slice(qMark + 1) : '';
    const queryParams = new URLSearchParams(query);
    const hopDrill = queryParams.get('drill');
    const nextFrom = queryParams.get('from');
    hops.push({ crumb, query, drill: hopDrill, from: nextFrom });
    currFrom = nextFrom;
  }

  if (hops.length > 0) {
    const ancestors = hops.slice().reverse();
    for (const hop of ancestors) {
      const originScreen = screenForCrumb(hop.crumb);
      if (originScreen && originScreen.crumb.toLowerCase() === s.crumb.toLowerCase()) continue;
      const parts = originScreen ? originScreen.crumb.split(' · ') : [hop.crumb];
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const base = targetFor(parts.slice(0, i + 1).join(' · '));
          if (segs.length === 0 || segs[segs.length - 1].label !== parts[i]) {
            segs.push({ label: parts[i], to: base });
          }
        }
      }
      const label = hop.drill || parts[parts.length - 1];
      const base = targetFor(originScreen?.crumb || hop.crumb);
      const to = base ? (hop.query ? `${base}?${hop.query}` : base) : null;
      if (segs.length === 0 || segs[segs.length - 1].label !== label) {
        segs.push({ label, to });
      } else {
        segs[segs.length - 1] = { label, to };
      }
    }
  } else {
    const chain = ownParts.slice(0, -1);
    segs = chain.map((label, i) => {
      const base = targetFor(chain.slice(0, i + 1).join(' · '));
      return { label, to: base };
    });
    if (drill && !chain.length) {
      segs.push({ label: leaf, to: pathname });
    }
  }

  /* When on detail/transcript, display just "Transcript" without duplicating the device
     name already prominent in the page header. */
  let finalLeafLabel = drill || leaf;
  if (s.key === 'target' || (drill && /^Transcript(\s*·\s*.*)?$/i.test(drill))) {
    finalLeafLabel = 'Transcript';
  }
  if (s.key === 'discoveryreport' || s.key === 'inventoryreport') {
    finalLeafLabel = reportDefById(params.id ?? '')?.name ?? finalLeafLabel;
  }
  if (segs.length > 0 && segs[segs.length - 1].label === finalLeafLabel) {
    segs[segs.length - 1] = { label: finalLeafLabel, to: null };
  } else {
    segs.push({ label: finalLeafLabel, to: null });
  }

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
