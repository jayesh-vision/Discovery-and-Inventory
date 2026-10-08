import { useLocation, useNavigate } from 'react-router-dom';
import { SCREENS, isLanding } from '../routes';
import { getCityById, findCityById, findCityByFacilityCode } from '../data/geographicHierarchy';
import { reportDefById, buildReport } from '../data/reports';
import { ExportMenu } from '../screens/reports/parts';

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

/* Where did the reader come from? Landing pages hide their breadcrumb when
   reached from the sidebar (or by URL), but a card or button elsewhere in the
   app that jumps to one — Reconciliation's Quick actions, a KPI tile — gives
   the reader no way back unless the trail names where they were. Each router
   location (history entry) remembers the screen it was entered from, so
   back/forward/refresh replay the same trail. Navigations that mean "start
   fresh" (sidebar, a breadcrumb link) pass state { reset: true } and clear it;
   changing only the query on the same screen keeps the origin it already had. */
interface Origin { pathname: string; search: string }
const ORIGIN_KEY = 'ns_nav_origins';
const navTrail: { prev: { key: string; pathname: string; search: string } | null; map: Record<string, Origin | null> | null } = { prev: null, map: null };
function originMap(): Record<string, Origin | null> {
  if (!navTrail.map) {
    try { navTrail.map = JSON.parse(sessionStorage.getItem(ORIGIN_KEY) || '{}'); } catch { navTrail.map = {}; }
  }
  return navTrail.map!;
}
function originFor(loc: { key: string; pathname: string; search: string; state: unknown }): Origin | null {
  const map = originMap();
  if (loc.key in map) { navTrail.prev = { key: loc.key, pathname: loc.pathname, search: loc.search }; return map[loc.key]; }
  const p = navTrail.prev;
  let o: Origin | null = null;
  if ((loc.state as { reset?: boolean } | null)?.reset) o = null;
  else if (p && p.pathname !== loc.pathname) o = { pathname: p.pathname, search: p.search };
  else if (p) o = map[p.key] ?? null;
  map[loc.key] = o;
  navTrail.prev = { key: loc.key, pathname: loc.pathname, search: loc.search };
  try { sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(map)); } catch { /* storage unavailable: trail just resets */ }
  return o;
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
  const loc = useLocation();
  const { pathname, search } = loc;
  const nav = useNavigate();
  const origin = originFor(loc);
  const s = screenFor(pathname);
  if (!s) return null;
  const params = paramsOf(s.path, pathname);
  const sp = new URLSearchParams(search);
  let drill = sp.get('drill');
  /* Location's list view (?view=list, optionally narrowed to ?state=) is a drill
     of the map landing that carries no ?drill= label of its own — name it so the
     trail leads back to the map like every other drill does. */
  if (!drill && s.key === 'location' && sp.get('view') === 'list') {
    const st = sp.get('state');
    drill = st ? `Locations in ${st}` : 'All locations';
  }
  /* A landing reached by an in-app jump with no ?from= of its own borrows the
     screen it came from, so the trail (and the way back) shows. Only landings
     do this: detail screens already carry their own from/drill context. */
  let from = sp.get('from');
  if (!from && !drill && origin && !s.root && isLanding(s)) {
    const originScreen = screenFor(origin.pathname);
    if (originScreen && originScreen.key !== s.key) {
      from = originScreen.crumb + (origin.search ? origin.search.replace(/^\?/, '?') : '');
    }
  }

  /* Breadcrumbs only describe a trail, so a landing page (any screen the
     sidebar lists in its own right — see isLanding in routes.ts) has none:
     there is nowhere shallower to go back to, and a crumb would only repeat
     the page title. Module dashboards (`root`) stay clean even when drilled
     into; every other landing shows a trail once the reader actually drills
     (?drill=) or arrives from another section (?from=). Detail, edit and
     sub-route screens are not landings, so they always render the full chain.
     Decided from the matched route and these two params only, so a filter or
     tab change in the query string on a landing never reveals a crumb. */
  if (s.root || (isLanding(s) && !drill && !from)) return null;

  const screenForCrumb = (prefix: string) => {
    const p = prefix.toLowerCase().trim();
    const norm = p.replace(/[\s\-_]+/g, '');
    const matches = (x: typeof SCREENS[number]) =>
      x.crumb.toLowerCase() === p ||
      x.key.toLowerCase() === p ||
      x.key.toLowerCase() === norm ||
      x.crumb.split(' · ').pop()?.toLowerCase() === p ||
      (norm === 'inventoryinsights' && (x.key === 'inventoryinsights' || x.key === 'home')) ||
      (norm === 'inventory' && (x.key === 'inventoryinsights' || x.key === 'home')) ||
      x.path.toLowerCase() === prefix.toLowerCase();
    /* two modules can own a screen with the same crumb (both have "Reports");
       the one in the reader's own module wins */
    return SCREENS.find(x => matches(x) && x.module === s.module) ?? SCREENS.find(matches);
  };

  const targetFor = (prefix: string, hopQuery?: string): string | null => {
    const p = prefix.toLowerCase().trim();
    const norm = p.replace(/[\s\-_]+/g, '');
    if (norm === 'inventoryinsights' || norm === 'inventory' || p === 'inventory insights') {
      return '/inventory/insights';
    }
    const t = screenForCrumb(prefix);
    if (!t) return null;
    let path = t.path;
    const hopSp = hopQuery ? new URLSearchParams(hopQuery) : null;
    const mergedParams: Record<string, string> = { ...params };
    if (!mergedParams.id) {
      const siteRef = hopSp?.get('id') || hopSp?.get('site')
        || sp.get('site') || sp.get('id')
        || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.id
        || (window as any).__nsLegacy?.resolveSite?.(params.name)?.id;
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
      if (originScreen && originScreen.crumb.toLowerCase() === s.crumb.toLowerCase()) {
        const rootTarget = targetFor(s.crumb) || s.path;
        if (!segs.some(g => g.label === leaf)) {
          const parts = s.crumb.split(' · ');
          if (parts.length > 1) {
            for (let i = 0; i < parts.length - 1; i++) {
              const base = targetFor(parts.slice(0, i + 1).join(' · '));
              if (segs.length === 0 || segs[segs.length - 1].label !== parts[i]) {
                segs.push({ label: parts[i], to: base });
              }
            }
          }
          segs.push({ label: leaf, to: rootTarget });
        }
        const hopLabel = hop.drill;
        if (hopLabel && hopLabel !== leaf && hopLabel !== (drill || leaf)) {
          const isSiblingRegion = hopLabel.startsWith('Locations in ') && (drill || '').startsWith('Locations in ');
          if (!isSiblingRegion) {
            const base = targetFor(originScreen.crumb, hop.query);
            let toQuery = '';
            if (hop.query) {
              const qp = new URLSearchParams(hop.query);
              if (originScreen.path.includes(':id')) {
                qp.delete('id');
                qp.delete('site');
              }
              toQuery = qp.toString();
            }
            const to = base ? (toQuery ? `${base}?${toQuery}` : base) : null;
            if (segs.length === 0 || segs[segs.length - 1].label !== hopLabel) {
              segs.push({ label: hopLabel, to });
            }
          }
        }
        continue;
      }
      const parts = originScreen ? originScreen.crumb.split(' · ') : [hop.crumb];
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const base = targetFor(parts.slice(0, i + 1).join(' · '), hop.query);
          let to = base;
          if (base && (parts[i] === 'Physical Resources' || parts.slice(0, i + 1).join(' · ') === 'Resources · Physical Resources') && hop.query) {
            const qp = new URLSearchParams(hop.query);
            const hopCls = qp.get('cls') || qp.get('tab');
            if (hopCls) to = `${base}?cls=${encodeURIComponent(hopCls)}`;
          }
          if (segs.length === 0 || segs[segs.length - 1].label !== parts[i]) {
            segs.push({ label: parts[i], to });
          }
        }
      }
      const isInventoryInsights = originScreen?.key === 'inventoryinsights' || originScreen?.key === 'home' || hop.crumb.toLowerCase().includes('inventory');
      const label = isInventoryInsights ? 'Inventory insights' : (hop.drill || parts[parts.length - 1]);
      const base = isInventoryInsights ? '/inventory/insights' : targetFor(originScreen?.crumb || hop.crumb, hop.query);
      let toQuery = '';
      if (hop.query) {
        const qp = new URLSearchParams(hop.query);
        if (originScreen?.path.includes(':id')) {
          qp.delete('id');
          qp.delete('site');
        }
        toQuery = qp.toString();
      }
      const to = base ? (toQuery ? `${base}?${toQuery}` : base) : null;
      if (segs.length === 0 || segs[segs.length - 1].label !== label) {
        segs.push({ label, to });
      } else {
        segs[segs.length - 1] = { label, to };
      }
    }
    if (drill && leaf && drill !== leaf) {
      if (!segs.some(g => g.label === leaf)) {
        const cleanTo = `${pathname}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
        segs.push({ label: leaf, to: cleanTo });
      }
    }
  } else {
    const chain = ownParts.slice(0, -1);
    segs = chain.map((label, i) => {
      const prefix = chain.slice(0, i + 1).join(' · ');
      const base = targetFor(prefix);
      let to = base;
      if (base && prefix === 'Location · Site details' && sp.get('tab')) {
        to = `${base}?tab=${encodeURIComponent(sp.get('tab')!)}`;
      }
      if (base && (prefix === 'Resources · Physical Resources' || label === 'Physical Resources')) {
        const reqCls = sp.get('cls')
          || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ns_phy_tab') : null)
          || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.cls;
        if (reqCls) {
          to = `${base}?cls=${encodeURIComponent(reqCls)}`;
        }
      }
      return { label, to };
    });
    if (drill && !chain.length) {
      segs.push({ label: leaf, to: pathname });
    }
  }

  /* When on detail/transcript, display just "Transcript" without duplicating the device
     name already prominent in the page header. */
  let finalLeafLabel = drill || leaf;

  if (s.key === 'citydetails' && params.cityId) {
    const cityName = getCityById(params.cityId)?.city.name || 'City';
    const facilityType = sp.get('facility') || 'dc';
    const facilityId = sp.get('facilityId');
    const locTo = from ? `/inventory/location?from=${encodeURIComponent(from)}` : '/inventory/location';
    const originSegs = hops.length > 0 ? segs.filter(x => x.label !== 'Location' && x.label !== cityName) : [];

    segs = [...originSegs, { label: 'Location', to: locTo }];

    if (facilityId) {
      segs.push({
        label: cityName,
        to: `/inventory/location/city/${params.cityId}?facility=${facilityType}${from ? `&from=${encodeURIComponent(from)}` : ''}`
      });
      finalLeafLabel = facilityId;
    } else {
      finalLeafLabel = cityName;
    }
  }

  if (s.key === 'site' && params.id) {
    const siteId = params.id;
    const cityMatch = findCityByFacilityCode(siteId);
    const locTo = from ? `/inventory/location?from=${encodeURIComponent(from)}` : '/inventory/location';
    const originSegs = hops.length > 0 ? segs.filter(x => x.label !== 'Location' && (!cityMatch || x.label !== cityMatch.city.name) && x.label !== siteId) : [];

    if (drill && drill !== siteId) {
      if (cityMatch) {
        segs = [
          ...originSegs,
          { label: 'Location', to: locTo },
          {
            label: cityMatch.city.name,
            to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}${from ? `&from=${encodeURIComponent(from)}` : ''}`
          },
          {
            label: siteId,
            to: `/inventory/location/site/${siteId}${from ? `?from=${encodeURIComponent(from)}` : ''}`
          }
        ];
      } else {
        segs = [
          ...originSegs,
          { label: 'Location', to: locTo },
          { label: siteId, to: `/inventory/location/site/${siteId}${from ? `?from=${encodeURIComponent(from)}` : ''}` }
        ];
      }
      finalLeafLabel = drill;
    } else {
      if (cityMatch) {
        segs = [
          ...originSegs,
          { label: 'Location', to: locTo },
          {
            label: cityMatch.city.name,
            to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}${from ? `&from=${encodeURIComponent(from)}` : ''}`
          }
        ];
        finalLeafLabel = siteId;
      } else {
        segs = [
          ...originSegs,
          { label: 'Location', to: locTo }
        ];
        finalLeafLabel = siteId;
      }
    }
  }

  if ((s.key === 'capex' || s.key === 'opex' || s.key === 'sitedetails' || s.key === 'siteequipment') && params.id) {
    const siteId = params.id;
    const cityMatch = findCityByFacilityCode(siteId);
    const subLabel = s.key === 'capex' ? 'Capex'
      : s.key === 'opex' ? 'Opex'
      : s.key === 'sitedetails' ? 'Facility'
      : 'Site equipment';

    if (cityMatch) {
      segs = [
        { label: 'Location', to: '/inventory/location' },
        {
          label: cityMatch.city.name,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}`
        },
        {
          label: siteId,
          to: `/inventory/location/site/${siteId}`
        }
      ];
    } else {
      segs = [
        { label: 'Location', to: '/inventory/location' },
        {
          label: siteId,
          to: `/inventory/location/site/${siteId}`
        }
      ];
    }
    finalLeafLabel = drill || subLabel;
  }

  const isFromLocation = !from || from.toLowerCase().startsWith('location') || sp.has('cityId') || sp.has('facility');
  if ((s.key === 'node' || (s.key === 'resource' && isFromLocation)) && isFromLocation) {
    const rawSite = sp.get('site') || sp.get('facilityId') || sp.get('id')
      || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.id
      || (window as any).__nsLegacy?.resolveSite?.(params.name)?.id;

    const directCityId = sp.get('cityId');
    const cityMatch = findCityById(directCityId) || findCityByFacilityCode(rawSite || params.name);
    const facilityType = (sp.get('facility') as 'dc' | 'pop' | 'site') || cityMatch?.facilityType || 'dc';
    const siteCode = rawSite || (cityMatch ? `${cityMatch.city.name.slice(0, 3).toUpperCase()}-${facilityType.toUpperCase()}-01` : null);
    const deviceDisplayName = drill || params.name || 'Node view';

    if (cityMatch && siteCode) {
      segs = [
        { label: 'Location', to: '/inventory/location' },
        {
          label: cityMatch.city.name,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${facilityType}`
        },
        {
          label: siteCode,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${facilityType}&facilityId=${encodeURIComponent(siteCode)}`
        }
      ];
      finalLeafLabel = deviceDisplayName;
    } else if (siteCode) {
      const tab = sp.get('tab') || sp.get('cls');
      const siteTo = `/inventory/location/site/${encodeURIComponent(siteCode)}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;
      segs = [
        { label: 'Location', to: '/inventory/location' },
        { label: siteCode, to: siteTo }
      ];
      finalLeafLabel = deviceDisplayName;
    } else {
      segs = [
        { label: 'Location', to: '/inventory/location' }
      ];
      finalLeafLabel = deviceDisplayName;
    }
  }

  if (s.key === 'target' || (drill && /^Transcript(\s*·\s*.*)?$/i.test(drill))) {
    finalLeafLabel = 'Transcript';
  }
  let reportDef = null;
  let reportContent = null;
  if (s.key === 'discoveryreport' || s.key === 'inventoryreport') {
    reportDef = reportDefById(params.id ?? '') ?? null;
    if (reportDef) {
      finalLeafLabel = reportDef.name;
      reportContent = buildReport(reportDef);
    }
  }
  if (segs.length > 0 && segs[segs.length - 1].label === finalLeafLabel) {
    segs[segs.length - 1] = { label: finalLeafLabel, to: null };
  } else {
    segs.push({ label: finalLeafLabel, to: null });
  }

  return (
    <div className="topbar">
      <nav className="topbar-crumbs" aria-label="Breadcrumb">
        {segs.map((g, i) => (
          <span key={i} className="topbar-seg">
            {i > 0 && <span className="topbar-crumb-sep">&gt;</span>}
            {g.to
              ? <button className="topbar-crumb-link" onClick={() => nav(g.to as string, { state: { reset: true } })}>{g.label}</button>
              : <span className={i === segs.length - 1 ? 'topbar-crumb-current' : 'topbar-crumb-text'}>{g.label}</span>}
          </span>
        ))}
      </nav>
      {reportDef && reportContent && (
        <div className="topbar-right">
          <ExportMenu def={reportDef} content={reportContent} withPrint label="Download report" />
        </div>
      )}
    </div>
  );
}
