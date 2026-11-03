import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SCREENS, isLanding } from '../routes';
import { getCityById, findCityByFacilityCode } from '../data/geographicHierarchy';
import { reportDefById, buildReport } from '../data/reports';
import { ExportMenu } from '../screens/reports/parts';
import { store } from '../dcim/api';
import { isDatacenter } from '../solution';
import GeoDropdown from '../components/ui/GeoDropdown';
import Breadcrumb, { type BreadcrumbItem } from '../components/ui/Breadcrumb';

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
  const isReset = Boolean((loc.state as { reset?: boolean } | null)?.reset);
  if (isReset) {
    delete map[loc.key];
    navTrail.prev = null;
    try { sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(map)); } catch {}
    return null;
  }
  if (loc.key in map) { navTrail.prev = { key: loc.key, pathname: loc.pathname, search: loc.search }; return map[loc.key]; }
  const p = navTrail.prev;
  let o: Origin | null = null;
  if (p && p.pathname !== loc.pathname) o = { pathname: p.pathname, search: p.search };
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
export interface BreadcrumbsResult {
  isLandingClean: boolean;
  segs: BreadcrumbItem[];
  rawSegs?: BreadcrumbItem[];
  finalLeafLabel: string;
  reportDef: any;
  reportContent: any;
}

export interface ComputeBreadcrumbsOptions {
  activeSubTab?: string;
  legacy?: boolean;
}

export function computeBreadcrumbs(
  loc: { pathname: string; search: string },
  origin: Origin | null = null,
  options?: ComputeBreadcrumbsOptions
): BreadcrumbsResult | null {
  const { pathname, search } = loc;
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
  /* Detail screens reached by an in-app jump with no ?from= of their own can borrow
     the screen they came from. Landing screens never borrow an origin: they stay clean. */
  let from = sp.get('from');
  const isSiteScreen = s.key === 'site' || s.key === 'capex' || s.key === 'opex' || s.key === 'sitedetails' || s.key === 'siteequipment' || s.key === 'siteinfra';
  const isPassiveDetail = ['fiber', 'odf', 'rack', 'power', 'splice', 'cord', 'duct'].includes(s.key);
  const isSiteOrNode = isSiteScreen || s.key === 'node' || s.key === 'resource' || isPassiveDetail;
  if (!from && origin && !s.root && !isLanding(s) && (s.key === 'dcim' || isSiteOrNode)) {
    const originSp = new URLSearchParams(origin.search);
    const originFrom = originSp.get('from');
    if (originFrom && isSiteOrNode) {
      from = originFrom;
    } else if (!drill) {
      const originScreen = screenFor(origin.pathname);
      if (originScreen && originScreen.module === s.module && originScreen.key !== s.key && originScreen.key !== 'inventoryinsights' && originScreen.key !== 'home') {
        if (originScreen.key === 'passive') {
          from = 'Passive inventory' + (origin.search ? origin.search.replace(/^\?/, '?') : '');
        } else {
          from = originScreen.crumb + (origin.search ? origin.search.replace(/^\?/, '?') : '');
        }
      }
    }
  }

  const isFromNode = (from ? from.toLowerCase().includes('node') : false) || (drill ? drill.toLowerCase().includes('node resources') : false);

  const PHY_TAB_NAMES: Record<string, string> = {
    router: 'Router',
    switch: 'Switch',
    server: 'Server',
    dwdm: 'DWDM',
    enodeb: 'eNodeB',
    gnodeb: 'gNodeB',
    gpu: 'GPU Servers',
    storage: 'Storage Arrays',
    firewall: 'Firewalls',
    all: 'All Active'
  };

  const isValidPhyClass = (cls: string | null | undefined): boolean => {
    if (!cls) return false;
    const k = cls.trim().toLowerCase();
    return k !== 'all' && Boolean(PHY_TAB_NAMES[k]);
  };

  const inferDeviceClass = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const n = name.trim().toUpperCase();
    if (n.startsWith('SW-') || n.includes('-SW-') || n.includes('-TOR-') || n.includes('-SPINE-') || n.includes('-LEAF-')) return 'switch';
    if (n.startsWith('RTR-') || n.includes('-RTR-') || n.includes('-CR-') || n.includes('-ER-') || n.includes('-PE-')) return 'router';
    if (n.startsWith('SRV-') || n.includes('-SRV-') || n.includes('-HOST-') || n.includes('-COMPUTE-')) return 'server';
    if (n.startsWith('DWDM-') || n.includes('-DWDM-') || n.startsWith('OPT-') || n.includes('-OPT-')) return 'dwdm';
    if (n.startsWith('ENB-') || n.includes('-ENB-') || n.startsWith('ENODEB-') || n.includes('-ENODEB-')) return 'enodeb';
    if (n.startsWith('GNB-') || n.includes('-GNB-') || n.startsWith('GNODEB-') || n.includes('-GNODEB-')) return 'gnodeb';
    if (n.startsWith('GPU-') || n.includes('-GPU-')) return 'gpu';
    if (n.startsWith('STR-') || n.includes('-STR-') || n.startsWith('SAN-') || n.includes('-SAN-') || n.startsWith('NAS-') || n.includes('-NAS-')) return 'storage';
    if (n.startsWith('FW-') || n.includes('-FW-') || n.startsWith('FIREWALL-') || n.includes('-FIREWALL-')) return 'firewall';
    return null;
  };
  const LINK_TAB_NAMES: Record<string, string> = {
    lldp: 'LLDP',
    ospf: 'OSPF',
    bgp: 'BGP',
    isis: 'ISIS',
    ib: 'InfiniBand',
    eth: 'Ethernet Fabric',
    access: 'Compute & Storage',
    oob: 'Management (OOB)'
  };
  const SVC_TAB_NAMES: Record<string, string> = {
    l3vpn: 'L3VPN',
    l2vpn: 'L2VPN',
    gpu: 'On-demand GPUs',
    cpu: 'CPU instances',
    storage: 'Storage volume',
    reserved: 'Reserved cluster'
  };

  if (!drill && from) {
    if (s.key === 'physical' || s.key === 'resourcesphysical') {
      const phyTab = sp.get('cls') || sp.get('tab') || sp.get('subType');
      if (phyTab && PHY_TAB_NAMES[phyTab]) {
        drill = PHY_TAB_NAMES[phyTab];
      }
    } else if (s.key === 'links') {
      const linkTab = sp.get('tab');
      if (linkTab && LINK_TAB_NAMES[linkTab]) {
        drill = LINK_TAB_NAMES[linkTab];
      }
    } else if (s.key === 'services') {
      const svcTab = sp.get('tab');
      if (svcTab && SVC_TAB_NAMES[svcTab]) {
        drill = SVC_TAB_NAMES[svcTab];
      }
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
  const isLandingClean = Boolean(s.root || (isLanding(s) && !drill && !from));
  // On clean landing pages, Topbar hides breadcrumbs.
  // Location, Links, Physical Resources and Data centers render Topbar so breadcrumbs and GeoDropdown are available.
  if (isLandingClean && s.key !== 'location' && s.key !== 'links' && s.key !== 'physical' && s.key !== 'resourcesphysical' && s.key !== 'dcim') return null;

  const screenForCrumb = (prefix: string) => {
    const p = prefix.toLowerCase().trim();
    const norm = p.replace(/[\s\-_]+/g, '');
    const matches = (x: typeof SCREENS[number]) =>
      x.crumb.toLowerCase() === p ||
      x.key.toLowerCase() === p ||
      x.key.toLowerCase() === norm ||
      x.crumb.split(' · ').pop()?.toLowerCase() === p ||
      (norm === 'inventoryinsights' && (x.key === 'inventoryinsights' || x.key === 'home')) ||
      (norm === 'passiveinventory' && x.key === 'passive') ||
      (p === 'passive inventory' && x.key === 'passive') ||
      x.path.toLowerCase() === prefix.toLowerCase();
    /* two modules can own a screen with the same crumb (both have "Reports");
       the one in the reader's own module wins */
    return SCREENS.find(x => matches(x) && x.module === s.module) ?? SCREENS.find(matches);
  };

  const targetFor = (prefix: string, hopQuery?: string): string | null => {
    const p = prefix.toLowerCase().trim();
    const norm = p.replace(/[\s\-_]+/g, '');
    if (s.module === 'Inventory' && (norm === 'inventoryinsights' || p === 'inventory insights')) {
      return '/inventory/insights';
    }
    if (s.module === 'Inventory' && (norm === 'passiveinventory' || p === 'passive inventory' || norm === 'passiveinfrastructure' || p === 'passive infrastructure' || p === 'passive')) {
      const hopSp = hopQuery ? new URLSearchParams(hopQuery) : null;
      const tab = hopSp?.get('tab');
      return tab ? `/inventory/passive?tab=${encodeURIComponent(tab)}` : '/inventory/passive';
    }
    if (s.module === 'Discovery and reconciliation' && (norm === 'insights' || p === 'discovery insights' || norm === 'discoveryinsights')) {
      return '/discovery/insights';
    }
    const t = screenForCrumb(prefix);
    if (!t) return null;
    let path = t.path;
    const hopSp = hopQuery ? new URLSearchParams(hopQuery) : null;
    if (t.key === 'dcim') {
      const c = hopSp?.get('client') || sp.get('client');
      return c ? `${path}?client=${encodeURIComponent(c)}` : path;
    }
    const mergedParams: Record<string, string> = { ...params };
    if (hopSp) {
      for (const [k, v] of hopSp.entries()) {
        if (!mergedParams[k]) mergedParams[k] = v;
      }
    }
    for (const [k, v] of sp.entries()) {
      if (!mergedParams[k]) mergedParams[k] = v;
    }
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
      if (s.module === 'Discovery and reconciliation') {
        const cLower = hop.crumb.toLowerCase();
        if (
          cLower.includes('inventory') ||
          originScreen?.module === 'Inventory' ||
          originScreen?.key === 'inventoryinsights' ||
          originScreen?.key === 'home'
        ) {
          continue;
        }
      }
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
      const isGroupingLabel = (lbl: string) => lbl === 'Resources' || lbl === 'Connectivity';
      const parts = (originScreen ? originScreen.crumb.split(' · ') : [hop.crumb]).filter(p => !isGroupingLabel(p));
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
      const isInventoryInsights = s.module === 'Inventory' && (
        originScreen?.key === 'inventoryinsights' ||
        originScreen?.key === 'home' ||
        hop.crumb.toLowerCase().trim() === 'inventory insights' ||
        hop.crumb.toLowerCase().trim() === 'insights' ||
        hop.crumb.toLowerCase().trim() === 'home'
      );
      const isDiscoveryInsights = s.module === 'Discovery and reconciliation' && (originScreen?.key === 'insights' || hop.crumb.toLowerCase() === 'insights');
      const label = isInventoryInsights
        ? 'Insights'
        : isDiscoveryInsights
          ? (hop.drill || 'Insights')
          : (hop.drill || parts[parts.length - 1]);
      const base = isInventoryInsights
        ? '/inventory/insights'
        : isDiscoveryInsights
          ? '/discovery/insights'
          : targetFor(originScreen?.crumb || hop.crumb, hop.query);
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
    const isGroupingLabel = (lbl: string) => lbl === 'Resources' || lbl === 'Connectivity';
    const chain = ownParts.slice(0, -1).filter(p => !isGroupingLabel(p));
    segs = chain.map(label => {
      const displayLabel = label === 'Passive Infrastructure' ? 'Passive inventory' : label;
      const prefix = ownParts.slice(0, ownParts.indexOf(label) + 1).join(' · ');
      const base = targetFor(prefix);
      let to = base;
      if (base && prefix === 'Location · Site details' && sp.get('tab')) {
        to = `${base}?tab=${encodeURIComponent(sp.get('tab')!)}`;
      }
      if (base && (prefix === 'Resources · Physical Resources' || label === 'Physical Resources')) {
        const isDc = isDatacenter();
        const reqCls = isDc
          ? sp.get('cls')
          : (sp.get('cls')
            || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ns_phy_tab') : null)
            || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.cls);
        if (reqCls) {
          to = `${base}?cls=${encodeURIComponent(reqCls)}`;
        }
      }
      return { label: displayLabel, to };
    });
    if (drill && !chain.length) {
      segs.push({ label: leaf, to: pathname });
    }
  }

  /* When on detail/transcript, display just "Transcript" without duplicating the device
     name already prominent in the page header. */
  let finalLeafLabel = drill || leaf;

  const fromClean = (from || '').toLowerCase().trim();
  const hasInventoryInsightsHop = hops.some(h => {
    const c = h.crumb.toLowerCase().trim();
    return c === 'inventory insights' || c.startsWith('inventory insights');
  });
  const isFromInventoryInsights = s.module === 'Inventory' && (
    fromClean === 'inventory insights' ||
    fromClean.startsWith('inventory insights') ||
    hasInventoryInsightsHop
  );

  const isFromInsights = s.module === 'Inventory' && !!(
    isFromInventoryInsights ||
    (from && (
      fromClean === 'insights' ||
      fromClean.startsWith('insights?') ||
      fromClean.startsWith('insights ·') ||
      fromClean === 'home'
    )) ||
    (hops.length > 0 && (
      hops[hops.length - 1].crumb.toLowerCase().trim() === 'insights' ||
      hops[hops.length - 1].crumb.toLowerCase().trim() === 'home'
    ))
  );

  const INSIGHTS_SECTION_LABELS: Record<string, string> = {
    physical: 'Physical Inventory',
    resourcesphysical: 'Physical Inventory',
    passive: 'Passive Inventory',
    resourcespassive: 'Passive Inventory',
    links: 'Connectivity',
    connectivitylinks: 'Connectivity',
    virtual: 'Virtual Resources',
    resourcesvirtual: 'Virtual Resources',
    location: 'Location',
    issues: 'Open Issues',
    lifecycle: 'Lifecycle',
    compliance: 'Compliance',
    services: 'Customer Services'
  };

  const isDirectInsightsDrill = isFromInventoryInsights && !!INSIGHTS_SECTION_LABELS[s.key] && hops.length <= 1;

  if (isDirectInsightsDrill) {
    const insightsTo = '/inventory/insights';
    const sectionLabel = INSIGHTS_SECTION_LABELS[s.key];
    const cleanTo = `${pathname}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
    segs = [{ label: 'Insights', to: insightsTo }];
    if (drill && drill !== sectionLabel) {
      segs.push({ label: sectionLabel, to: cleanTo });
      finalLeafLabel = drill;
    } else {
      finalLeafLabel = sectionLabel;
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.removeItem('ns_dc_from_insights'); } catch {}
  }

  if (s.key === 'citydetails' && params.cityId) {
    const cityName = getCityById(params.cityId)?.city.name || 'City';
    const facilityType = sp.get('facility') || 'dc';
    const facilityId = sp.get('facilityId');
    const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
    const locTo = isDc ? '/inventory/location?solution=Datacenter' : '/inventory/location';

    if (isFromInventoryInsights) {
      const insightsTo = '/inventory/insights';
      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Location', to: locTo }
      ];
      if (facilityId) {
        segs.push({
          label: cityName,
          to: `/inventory/location/city/${params.cityId}?facility=${facilityType}${isDc ? '&solution=Datacenter' : ''}`
        });
        finalLeafLabel = facilityId;
      } else {
        finalLeafLabel = cityName;
      }
    } else {
      segs = [{ label: 'Location', to: locTo }];
      if (facilityId) {
        segs.push({
          label: cityName,
          to: `/inventory/location/city/${params.cityId}?facility=${facilityType}`
        });
        finalLeafLabel = facilityId;
      } else {
        finalLeafLabel = cityName;
      }
    }
  }

  const isFromPhysical = !!from && (from.toLowerCase().startsWith('resources') || from.toLowerCase().includes('physical'));
  const isFromLocation = !isFromPhysical;

  const isSiteSubRoute = s.key === 'capex' || s.key === 'opex' || s.key === 'sitedetails' || s.key === 'siteequipment' || s.key === 'siteinfra';
  if ((s.key === 'site' || isSiteSubRoute) && params.id) {
    const siteId = params.id;
    const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
    const cityMatch = findCityByFacilityCode(siteId);
    const locTo = isDc ? '/inventory/location?solution=Datacenter' : '/inventory/location';
    const cityTo = cityMatch
      ? `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}${isDc ? '&solution=Datacenter' : ''}`
      : null;
    const siteSp = new URLSearchParams();
    if (isDc) siteSp.set('solution', 'Datacenter');
    if (from) siteSp.set('from', from);
    const siteTo = `/inventory/location/site/${encodeURIComponent(siteId)}${siteSp.toString() ? `?${siteSp.toString()}` : ''}`;

    const subLabel = s.key === 'capex' ? 'Capex'
      : s.key === 'opex' ? 'Opex'
      : s.key === 'sitedetails' ? 'Site details'
      : s.key === 'siteinfra' ? 'Infrastructure'
      : s.key === 'siteequipment' ? 'Site equipment'
      : null;

    const isSiteInfo = !isSiteSubRoute && (
      drill?.toLowerCase() === 'site info' ||
      drill?.toLowerCase() === 'siteinfo' ||
      (isFromPhysical && s.key === 'site') ||
      (fromClean === 'insights' && s.key === 'site') ||
      (isFromInventoryInsights && s.key === 'site')
    );

    if (isFromInventoryInsights && isFromPhysical) {
      const insightsTo = '/inventory/insights';
      const phyBasePath = isDc ? '/inventory/resources/physical' : '/inventory/physical';
      const phySpInsights = new URLSearchParams();
      if (isDc) {
        phySpInsights.set('type', 'active');
        phySpInsights.set('solution', 'Datacenter');
      }
      phySpInsights.set('from', 'Inventory insights');
      const fromSp = from ? new URLSearchParams(from.includes('?') ? from.split('?')[1] : '') : null;
      const reqCls = sp.get('cls') || fromSp?.get('cls');
      const geo = sp.get('geo') || fromSp?.get('geo');
      if (reqCls) phySpInsights.set('cls', reqCls);
      if (geo) phySpInsights.set('geo', geo);
      const phyInsightsTo = `${phyBasePath}?${phySpInsights.toString()}`;

      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Physical Inventory', to: phyInsightsTo }
      ];
      finalLeafLabel = isSiteInfo || drill?.toLowerCase() === 'site info' ? 'Site info' : (isSiteSubRoute && subLabel ? subLabel : siteId);
    } else if (isFromInventoryInsights) {
      const insightsTo = '/inventory/insights';
      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Location', to: locTo }
      ];
      if (isSiteSubRoute && subLabel) {
        finalLeafLabel = subLabel;
      } else {
        finalLeafLabel = isSiteInfo ? 'Site info' : siteId;
      }
    } else if (isFromPhysical) {
      const phyBasePath = isDc ? '/inventory/resources/physical' : '/inventory/physical';
      const phySp = new URLSearchParams();
      if (isDc) {
        phySp.set('type', 'active');
        phySp.set('solution', 'Datacenter');
      }
      const fromSp = from ? new URLSearchParams(from.includes('?') ? from.split('?')[1] : '') : null;
      const rawCls = (isValidPhyClass(sp.get('cls')) ? sp.get('cls') : null)
        || (isValidPhyClass(fromSp?.get('cls')) ? fromSp?.get('cls') : null)
        || (isValidPhyClass(sp.get('tab')) ? sp.get('tab') : null)
        || (isValidPhyClass(fromSp?.get('tab')) ? fromSp?.get('tab') : null);
      const reqCls = rawCls ? rawCls.toLowerCase() : null;
      const geo = sp.get('geo') || fromSp?.get('geo');
      if (reqCls) phySp.set('cls', reqCls);
      if (geo) phySp.set('geo', geo);
      const phyTo = `${phyBasePath}?${phySp.toString()}`;

      segs = [
        { label: 'Physical Resources', to: phyTo }
      ];

      finalLeafLabel = 'Site info';
    } else if (fromClean.includes('passive')) {
      const passiveTo = isDc ? '/inventory/resources/physical?type=passive&solution=Datacenter' : '/inventory/passive';
      segs = [
        { label: 'Passive inventory', to: passiveTo }
      ];
      if (isSiteSubRoute && subLabel) {
        finalLeafLabel = subLabel;
      } else {
        finalLeafLabel = isSiteInfo ? 'Site info' : siteId;
      }
    } else if (fromClean.includes('virtual')) {
      segs = [
        { label: 'Virtual Resources', to: '/inventory/virtual' }
      ];
      if (isSiteSubRoute && subLabel) {
        finalLeafLabel = subLabel;
      } else {
        finalLeafLabel = isSiteInfo ? 'Site info' : siteId;
      }
    } else if (fromClean.includes('link') || fromClean.includes('connectivity')) {
      segs = [
        { label: 'Links', to: '/inventory/links' }
      ];
      if (isSiteSubRoute && subLabel) {
        finalLeafLabel = subLabel;
      } else {
        finalLeafLabel = isSiteInfo ? 'Site info' : siteId;
      }
    } else if (fromClean.includes('service')) {
      segs = [
        { label: 'Services', to: '/inventory/services' }
      ];
      if (isSiteSubRoute && subLabel) {
        finalLeafLabel = subLabel;
      } else {
        finalLeafLabel = isSiteInfo ? 'Site info' : siteId;
      }
    } else {
      segs = [{ label: 'Location', to: locTo }];
      if (cityMatch && cityTo) {
        segs.push({ label: cityMatch.city.name, to: cityTo });
      }
      segs.push({ label: siteId, to: siteTo });

      if (isSiteSubRoute) {
        finalLeafLabel = subLabel || 'Site equipment';
      } else if (isSiteInfo) {
        finalLeafLabel = 'Site info';
      } else {
        /* s.key === 'site' */
        const activeSection = sp.get('section') || sp.get('tab');
        finalLeafLabel = (activeSection === 'attention') ? 'Attention' : 'Network elements';
      }
    }
  }

  if (isFromPhysical && (s.key === 'node' || s.key === 'resource')) {
    const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
    const fromSp = from ? new URLSearchParams(from.includes('?') ? from.split('?')[1] : '') : null;
    const rawCls = (isValidPhyClass(sp.get('cls')) ? sp.get('cls') : null)
      || (isValidPhyClass(fromSp?.get('cls')) ? fromSp?.get('cls') : null)
      || (isValidPhyClass(sp.get('tab')) ? sp.get('tab') : null)
      || (isValidPhyClass(fromSp?.get('tab')) ? fromSp?.get('tab') : null)
      || (isDc ? null : (typeof sessionStorage !== 'undefined' && isValidPhyClass(sessionStorage.getItem('ns_phy_tab')) ? sessionStorage.getItem('ns_phy_tab') : null))
      || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.cls
      || inferDeviceClass(params.name)
      || (isDc ? 'switch' : 'router');
    const reqCls = rawCls.toLowerCase();
    const clsLabel = PHY_TAB_NAMES[reqCls] || reqCls.charAt(0).toUpperCase() + reqCls.slice(1);

    const geo = sp.get('geo') || fromSp?.get('geo');
    const phySp = new URLSearchParams();
    if (reqCls) phySp.set('cls', reqCls);
    if (geo) phySp.set('geo', geo);
    if (isDc) phySp.set('solution', 'Datacenter');
    const phyTo = isDc ? `/inventory/resources/physical?${phySp.toString()}` : `/inventory/physical?${phySp.toString()}`;

    const phyBasePath = isDc ? '/inventory/resources/physical' : '/inventory/physical';
    const phyBaseSp = new URLSearchParams();
    if (isDc) {
      phyBaseSp.set('type', 'active');
      phyBaseSp.set('solution', 'Datacenter');
    }
    const phyBaseTo = phyBaseSp.toString() ? `${phyBasePath}?${phyBaseSp.toString()}` : phyBasePath;

    const rawNodeName = params.name || '';
    const safeNodeName = (!rawNodeName || rawNodeName.startsWith(':')) ? 'Device' : rawNodeName;

    const nodeParams = new URLSearchParams();
    if (rawNodeName) nodeParams.set('name', rawNodeName);
    if (sp.get('site')) nodeParams.set('site', sp.get('site')!);
    if (reqCls) nodeParams.set('cls', reqCls);
    if (sp.get('ip')) nodeParams.set('ip', sp.get('ip')!);
    if (geo) nodeParams.set('geo', geo);
    if (isDc) nodeParams.set('solution', 'Datacenter');
    if (isFromInventoryInsights) {
      phySp.set('from', 'Inventory insights');
    }
    nodeParams.set('from', `Resources · Physical Resources?${phySp.toString()}`);
    const nodeTo = `/inventory/node/${encodeURIComponent(rawNodeName)}?${nodeParams.toString()}`;

    const isFromNode = (from ? from.toLowerCase().includes('node') : false) || (drill ? drill.toLowerCase().includes('node resources') : false);
    const isInsightsNodeDrill = isFromInventoryInsights && (s.key === 'node' || s.key === 'resource');

    if (isInsightsNodeDrill) {
      const insightsTo = '/inventory/insights';
      const phySpInsights = new URLSearchParams();
      if (isDc) {
        phySpInsights.set('type', 'active');
        phySpInsights.set('solution', 'Datacenter');
      }
      phySpInsights.set('from', 'Inventory insights');
      if (geo) phySpInsights.set('geo', geo);
      const phyInsightsTo = `${phyBasePath}?${phySpInsights.toString()}`;

      const phyClassSp = new URLSearchParams(phySpInsights);
      if (reqCls) phyClassSp.set('cls', reqCls);
      const phyClassTo = `${phyBasePath}?${phyClassSp.toString()}`;

      if (s.key === 'node') {
        segs = [
          { label: 'Insights', to: insightsTo },
          { label: 'Physical Inventory', to: phyInsightsTo },
          { label: clsLabel, to: phyClassTo }
        ];
        finalLeafLabel = 'Node view';
      } else if (s.key === 'resource' && isFromNode) {
        segs = [
          { label: 'Insights', to: insightsTo },
          { label: 'Physical Inventory', to: phyInsightsTo },
          { label: clsLabel, to: phyClassTo },
          { label: 'Node view', to: nodeTo }
        ];
        finalLeafLabel = 'Node resources';
      } else {
        /* s.key === 'resource' && !isFromNode */
        segs = [
          { label: 'Insights', to: insightsTo },
          { label: 'Physical Inventory', to: phyInsightsTo },
          { label: clsLabel, to: phyClassTo }
        ];
        finalLeafLabel = safeNodeName;
      }
    } else {
      if (s.key === 'node') {
        segs = [
          { label: 'Physical Resources', to: phyBaseTo },
          { label: clsLabel, to: phyTo }
        ];
        finalLeafLabel = 'Node view';
      } else if (s.key === 'resource' && isFromNode) {
        segs = [
          { label: 'Physical Resources', to: phyBaseTo },
          { label: clsLabel, to: phyTo },
          { label: 'Node view', to: nodeTo }
        ];
        finalLeafLabel = 'Node resources';
      } else {
        /* s.key === 'resource' && !isFromNode */
        segs = [
          { label: 'Physical Resources', to: phyBaseTo },
          { label: clsLabel, to: phyTo }
        ];
        finalLeafLabel = safeNodeName;
      }
    }
  }

  if ((s.key === 'node' || (s.key === 'resource' && isFromLocation)) && isFromLocation) {
    const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
    const locTo = isDc ? '/inventory/location?solution=Datacenter' : '/inventory/location';
    const rootLabel = isFromInsights ? 'Inventory insights' : 'Location';
    const rootTo = isFromInsights ? '/inventory/insights' : (from ? `/inventory/location?from=${encodeURIComponent(from)}${isDc ? '&solution=Datacenter' : ''}` : locTo);

    const fromSp = from ? new URLSearchParams(from.includes('?') ? from.split('?')[1] : '') : null;
    const rawCls = (isValidPhyClass(sp.get('cls')) ? sp.get('cls') : null)
      || (isValidPhyClass(fromSp?.get('cls')) ? fromSp?.get('cls') : null)
      || (isValidPhyClass(sp.get('tab')) ? sp.get('tab') : null)
      || (isValidPhyClass(fromSp?.get('tab')) ? fromSp?.get('tab') : null)
      || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.cls
      || inferDeviceClass(params.name)
      || 'switch';
    const reqCls = rawCls.toLowerCase();
    const clsLabel = PHY_TAB_NAMES[reqCls] || reqCls.charAt(0).toUpperCase() + reqCls.slice(1);

    const rawSite = sp.get('site') || sp.get('facilityId') || sp.get('id')
      || (window as any).__nsLegacy?.siteForNode?.(params.name, sp.get('ip'))?.id
      || (window as any).__nsLegacy?.resolveSite?.(params.name)?.id;

    const siteCode = rawSite || null;
    const siteSp = new URLSearchParams();
    if (isDc) siteSp.set('solution', 'Datacenter');
    siteSp.set('tab', reqCls);
    if (from) siteSp.set('from', from);
    const siteTo = siteCode ? `/inventory/location/site/${encodeURIComponent(siteCode)}?${siteSp.toString()}` : locTo;

    const rawNodeName = params.name || '';
    const safeNodeName = (!rawNodeName || rawNodeName.startsWith(':')) ? 'Device' : rawNodeName;

    const nodeParams = new URLSearchParams();
    if (rawNodeName) nodeParams.set('name', rawNodeName);
    if (siteCode) nodeParams.set('site', siteCode);
    if (reqCls) nodeParams.set('cls', reqCls);
    if (sp.get('ip')) nodeParams.set('ip', sp.get('ip')!);
    if (isDc) nodeParams.set('solution', 'Datacenter');
    nodeParams.set('from', 'Location · Site details · Node view');
    const nodeTo = `/inventory/node/${encodeURIComponent(rawNodeName)}?${nodeParams.toString()}`;

    const isFromNode = (from ? from.toLowerCase().includes('node') : false) || (drill ? drill.toLowerCase().includes('node resources') : false);

    if (s.key === 'node') {
      segs = [
        { label: rootLabel, to: rootTo },
        { label: clsLabel, to: siteTo }
      ];
      finalLeafLabel = 'Node view';
    } else if (s.key === 'resource' && isFromNode) {
      segs = [
        { label: rootLabel, to: rootTo },
        { label: clsLabel, to: siteTo },
        { label: 'Node view', to: nodeTo }
      ];
      finalLeafLabel = 'Node resources';
    } else {
      /* s.key === 'resource' && !isFromNode */
      segs = [
        { label: rootLabel, to: rootTo },
        { label: clsLabel, to: siteTo }
      ];
      finalLeafLabel = safeNodeName;
    }
  }

  if (s.key === 'dcim') {
    const clientParam = sp.get('client');
    const dcimTo = `/inventory/dcim${clientParam ? `?client=${encodeURIComponent(clientParam)}` : ''}`;

    if (drill && drill !== 'Data centers') {
      segs = [{ label: 'Data centers', to: dcimTo }];
      finalLeafLabel = drill;
    } else {
      segs = [];
      finalLeafLabel = 'Data centers';
    }
  }

  if (s.key === 'dcimimport') {
    const locParam = sp.get('location');
    const clientParam = sp.get('client');
    const stepParam = sp.get('step');
    const locTo = '/inventory/location';
    const dcimTo = `/inventory/dcim${clientParam ? `?client=${encodeURIComponent(clientParam)}` : ''}`;

    const isFromPassive = from?.toLowerCase().includes('passive');
    const isFromInfra = !isFromPassive && from?.toLowerCase().includes('infrastructure');
    const isFromCity = !isFromPassive && !isFromInfra && (from?.toLowerCase().includes('city') || sp.has('cityId'));
    const isFromLocationSite = !isFromPassive && !isFromInfra && !isFromCity && !!locParam && from?.toLowerCase().includes('site');

    if (isFromInfra) {
      const siteId = locParam;
      segs = [{
        label: 'Infrastructure',
        to: siteId ? `/inventory/location/site/${encodeURIComponent(siteId)}/infrastructure` : locTo
      }];
    } else if (isFromPassive) {
      segs = [
        { label: 'Passive Infrastructure', to: '/inventory/passive' }
      ];
    } else if (isFromCity) {
      const siteId = locParam;
      const cityMatch = siteId ? findCityByFacilityCode(siteId) : null;
      segs = [{ label: 'Location', to: locTo }];
      if (cityMatch && siteId) {
        segs.push({
          label: cityMatch.city.name,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}`
        });
        segs.push({
          label: siteId,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}&facilityId=${encodeURIComponent(siteId)}`
        });
      }
    } else if (isFromLocationSite) {
      const siteId = locParam!;
      const cityMatch = findCityByFacilityCode(siteId);
      segs = [{ label: 'Location', to: locTo }];
      if (cityMatch) {
        segs.push({
          label: cityMatch.city.name,
          to: `/inventory/location/city/${cityMatch.city.id}?facility=${cityMatch.facilityType}`
        });
      }
      segs.push({
        label: siteId,
        to: `/inventory/location/site/${encodeURIComponent(siteId)}`
      });
    } else {
      const originSegs = hops.length > 0
        ? segs.filter(x => x.label !== 'Location' && x.label !== 'Data centers' && x.label !== 'Import')
        : [];
      segs = [
        ...originSegs,
        { label: 'Location', to: locTo },
        { label: 'Data centers', to: dcimTo }
      ];
    }

    // Base target for returning to the initial import screen
    const baseImportQuery = new URLSearchParams();
    if (locParam) baseImportQuery.set('location', locParam);
    if (from) baseImportQuery.set('from', from);
    if (clientParam) baseImportQuery.set('client', clientParam);
    const baseImportTo = `/inventory/dcim/import${baseImportQuery.toString() ? `?${baseImportQuery.toString()}` : ''}`;

    const stepTarget = (st: string) => {
      const q = new URLSearchParams(baseImportQuery);
      q.set('step', st);
      return `/inventory/dcim/import?${q.toString()}`;
    };

    if (stepParam === 'file') {
      segs.push({ label: 'Import', to: baseImportTo });
      finalLeafLabel = drill || 'File';
    } else if (stepParam === 'columns') {
      segs.push({ label: 'Import', to: baseImportTo });
      segs.push({ label: 'File', to: stepTarget('file') });
      finalLeafLabel = drill || 'Columns';
    } else if (stepParam === 'review') {
      segs.push({ label: 'Import', to: baseImportTo });
      segs.push({ label: 'Columns', to: stepTarget('columns') });
      finalLeafLabel = drill || 'Review';
    } else if (stepParam === 'done') {
      segs.push({ label: 'Import', to: baseImportTo });
      segs.push({ label: 'Review', to: stepTarget('review') });
      finalLeafLabel = drill || 'Done';
    } else {
      finalLeafLabel = drill || 'Import';
    }
  }

  if (s.key === 'datacenter' && params.dcId) {
    const dcId = params.dcId;
    const clientParam = sp.get('client');
    let dcName = dcId;
    let matchedLocationId: string | null = null;
    let foundClientId = clientParam;

    const clients = store.clients();
    for (const c of clients) {
      if (clientParam && c.id !== clientParam) continue;
      for (const dc of store.data(c.id)?.entities.dataCenters ?? []) {
        if (dc.id === dcId || dc.locationId === dcId) {
          dcName = dc.name || dc.id;
          matchedLocationId = dc.locationId || null;
          foundClientId = c.id;
          break;
        }
      }
      if (matchedLocationId) break;
    }

    const cityMatch = findCityByFacilityCode(matchedLocationId || dcId);
    const locTo = '/inventory/location';
    const dcimTo = `/inventory/dcim${foundClientId ? `?client=${encodeURIComponent(foundClientId)}` : ''}`;
    const dcSelfTo = `/inventory/datacenter/${encodeURIComponent(dcId)}${search}`;

    const isFromPassive = from?.toLowerCase().includes('passive');
    const isFromInfra = !isFromPassive && from?.toLowerCase().includes('infrastructure');
    const isFromCity = !isFromPassive && !isFromInfra && (from?.toLowerCase().includes('city') || sp.has('cityId') || (!from && !clientParam && !!cityMatch));

    if (isFromInfra) {
      const siteId = sp.get('location') || matchedLocationId || (cityMatch ? dcId : null);
      segs = [{
        label: 'Infrastructure',
        to: siteId ? `/inventory/location/site/${encodeURIComponent(siteId)}/infrastructure` : locTo
      }];
      if (from?.toLowerCase().includes('import')) {
        const impQ = new URLSearchParams();
        if (siteId) impQ.set('location', siteId);
        impQ.set('from', 'Infrastructure');
        if (foundClientId) impQ.set('client', foundClientId);
        segs.push({
          label: 'Import',
          to: `/inventory/dcim/import?${impQ.toString()}`
        });
      }
      if (drill && drill !== dcName) {
        segs.push({ label: dcName, to: dcSelfTo });
        finalLeafLabel = drill;
      } else {
        finalLeafLabel = dcName;
      }
    } else if (isFromPassive) {
      segs = [
        { label: 'Passive Infrastructure', to: '/inventory/passive' }
      ];
      if (from?.toLowerCase().includes('import')) {
        segs.push({ label: 'Import', to: '/inventory/dcim/import?from=Passive' });
      }
      if (drill && drill !== dcName) {
        segs.push({ label: dcName, to: dcSelfTo });
        finalLeafLabel = drill;
      } else {
        finalLeafLabel = dcName;
      }
    } else if (isFromCity && cityMatch) {
      const cityId = sp.get('cityId') || cityMatch.city.id;
      const cityTo = `/inventory/location/city/${cityId}?facility=${cityMatch.facilityType}&facilityId=${encodeURIComponent(matchedLocationId || dcId)}`;
      segs = [
        { label: 'Location', to: locTo },
        { label: cityMatch.city.name, to: cityTo }
      ];
      if (matchedLocationId && matchedLocationId !== dcName) {
        segs.push({
          label: matchedLocationId,
          to: `/inventory/location/site/${encodeURIComponent(matchedLocationId)}`
        });
      }
      if (drill && drill !== dcName) {
        segs.push({ label: dcName, to: dcSelfTo });
        finalLeafLabel = drill;
      } else {
        finalLeafLabel = dcName;
      }
    } else {
      if (drill && drill !== dcName) {
        segs = [
          { label: 'Data centers', to: dcimTo },
          { label: dcName, to: dcSelfTo }
        ];
        finalLeafLabel = drill;
      } else {
        segs = [
          { label: 'Data centers', to: dcimTo }
        ];
        finalLeafLabel = dcName;
      }
    }
  }

  const PASSIVE_CATEGORIES: Record<string, { tab: string; label: string }> = {
    fiber: { tab: 'fiber', label: 'Fiber spans' },
    odf: { tab: 'odf', label: 'ODF' },
    rack: { tab: 'rack', label: 'Racks' },
    power: { tab: 'power', label: 'Power plant' },
    splice: { tab: 'splice', label: 'Splice closures' },
    cord: { tab: 'cord', label: 'Patch cords' },
    duct: { tab: 'duct', label: 'Ducts' }
  };

  if (s.key === 'passive') {
    const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
    const isViewRack = drill?.toLowerCase() === 'view rack' || drill?.toLowerCase() === 'view in rack' || (isFromPhysical && (sp.get('tab') === 'rack' || !!sp.get('rack')));

    if (isFromInventoryInsights && isFromPhysical) {
      const insightsTo = '/inventory/insights';
      const phyBasePath = isDc ? '/inventory/resources/physical' : '/inventory/physical';
      const phySpInsights = new URLSearchParams();
      if (isDc) {
        phySpInsights.set('type', 'active');
        phySpInsights.set('solution', 'Datacenter');
      }
      phySpInsights.set('from', 'Inventory insights');
      const fromSp = from ? new URLSearchParams(from.includes('?') ? from.split('?')[1] : '') : null;
      const reqCls = sp.get('cls') || fromSp?.get('cls');
      const geo = sp.get('geo') || fromSp?.get('geo');
      if (reqCls) phySpInsights.set('cls', reqCls);
      if (geo) phySpInsights.set('geo', geo);
      const phyInsightsTo = `${phyBasePath}?${phySpInsights.toString()}`;

      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Physical Inventory', to: phyInsightsTo }
      ];
      finalLeafLabel = isViewRack ? 'View rack' : (sp.get('rack') ? `Rack ${sp.get('rack')}` : 'Racks');
    } else {
      const originSegs = hops.length > 0
        ? segs.filter(x => x.label !== 'Passive inventory' && x.label !== 'Passive Infrastructure' && x.label !== drill)
        : [];
      const passiveTo = from ? `/inventory/passive?from=${encodeURIComponent(from)}` : '/inventory/passive';
      const activeTab = sp.get('tab');
      const tabCat = activeTab && PASSIVE_CATEGORIES[activeTab] ? PASSIVE_CATEGORIES[activeTab].label : null;
      const rackLabel = sp.get('rack') ? `Rack ${sp.get('rack')}` : null;
      const effectiveDrill = (isViewRack ? 'View rack' : null) || drill || rackLabel || (from && tabCat ? tabCat : null);

      if (effectiveDrill) {
        segs = [
          ...originSegs,
          { label: 'Passive inventory', to: passiveTo }
        ];
        finalLeafLabel = effectiveDrill;
      } else if (from) {
        segs = originSegs;
        finalLeafLabel = 'Passive inventory';
      } else {
        segs = [];
        finalLeafLabel = 'Passive inventory';
      }
    }
  }

  if (s.key in PASSIVE_CATEGORIES) {
    const cat = PASSIVE_CATEGORIES[s.key];
    const isViewRack = drill?.toLowerCase() === 'view rack' || drill?.toLowerCase() === 'view in rack' || (isFromPhysical && s.key === 'rack');
    const fromSp = from && from.includes('?') ? new URLSearchParams(from.split('?')[1]) : null;
    const activeTab = sp.get('tab') || fromSp?.get('tab') || cat.tab;
    const catLabel = cat.label;
    const rawId = params.id || params.name || '';
    const safeId = (!rawId || rawId.startsWith(':')) ? 'Element' : rawId;
    const elemTo = s.path.replace(':id', encodeURIComponent(rawId));

    if (isFromInventoryInsights && isFromPhysical) {
      const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
      const insightsTo = '/inventory/insights';
      const phyBasePath = isDc ? '/inventory/resources/physical' : '/inventory/physical';
      const phySpInsights = new URLSearchParams();
      if (isDc) {
        phySpInsights.set('type', 'active');
        phySpInsights.set('solution', 'Datacenter');
      }
      phySpInsights.set('from', 'Inventory insights');
      const reqCls = sp.get('cls') || fromSp?.get('cls');
      const geo = sp.get('geo') || fromSp?.get('geo');
      if (reqCls) phySpInsights.set('cls', reqCls);
      if (geo) phySpInsights.set('geo', geo);
      const phyInsightsTo = `${phyBasePath}?${phySpInsights.toString()}`;

      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Physical Inventory', to: phyInsightsTo }
      ];
      finalLeafLabel = (s.key === 'rack' && isViewRack) ? 'View rack' : safeId;
    } else if (isFromInventoryInsights) {
      const isDc = sp.get('solution')?.toLowerCase() === 'datacenter' || isDatacenter();
      const insightsTo = '/inventory/insights';
      const passiveTo = isDc
        ? '/inventory/resources/physical?type=passive&solution=Datacenter&from=Inventory+insights'
        : '/inventory/passive?from=Inventory+insights';
      segs = [
        { label: 'Insights', to: insightsTo },
        { label: 'Passive Inventory', to: passiveTo }
      ];
      finalLeafLabel = (s.key === 'rack' && isViewRack) ? 'View rack' : safeId;
    } else {
      const isFromPassive = !from
        || from.toLowerCase().includes('passive')
        || (origin && origin.pathname.startsWith('/inventory/passive'))
        || (!from.toLowerCase().includes('location') && !from.toLowerCase().includes('site') && !from.toLowerCase().includes('city'));

      if (isFromPassive) {
        segs = [
          { label: 'Passive inventory', to: '/inventory/passive' },
          { label: catLabel, to: `/inventory/passive?tab=${encodeURIComponent(activeTab)}` },
          { label: safeId, to: elemTo }
        ];
        finalLeafLabel = (s.key === 'rack' && isViewRack) ? 'View rack' : (drill || 'Overview');
      } else {
        const originSegs = hops.length > 0 ? segs.filter(x => x.label !== 'Element' && x.label !== catLabel) : [];
        segs = [
          ...originSegs,
          { label: 'Passive inventory', to: '/inventory/passive' },
          { label: catLabel, to: `/inventory/passive?tab=${encodeURIComponent(activeTab)}` },
          { label: safeId, to: elemTo }
        ];
        finalLeafLabel = (s.key === 'rack' && isViewRack) ? 'View rack' : (drill || 'Overview');
      }
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

  const rawSegs = [...segs];

  const appDomain = 'Resource Manager';
  const appDomainTo = s.module === 'Discovery and reconciliation'
    ? '/discovery/insights'
    : '/inventory/insights';

  const primaryModule = s.module === 'Discovery and reconciliation'
    ? 'Discovery & Reconciliation'
    : 'Inventory';
  const primaryModuleTo = s.module === 'Discovery and reconciliation'
    ? '/discovery/insights'
    : '/inventory/insights';

  const isPhysicalFlow = isFromPhysical && (s.key === 'site' || isSiteSubRoute);
  const isNodeViewFlow = s.key === 'node' || (s.key === 'resource' && isFromNode);
  const isInsightsDrill = isDirectInsightsDrill
    || (isFromInventoryInsights && isFromPhysical && (s.key === 'node' || s.key === 'resource' || s.key === 'site' || isSiteSubRoute || s.key === 'passive'))
    || (isFromInventoryInsights && (s.key === 'node' || s.key === 'resource' || s.key === 'site'))
    || isNodeViewFlow
    || isPhysicalFlow;
  const isInsightsFlow = isInsightsDrill;

  const standardizedSegs: BreadcrumbItem[] = [];
  if (!isInsightsFlow) {
    standardizedSegs.push({ label: appDomain, to: appDomainTo });
    standardizedSegs.push({ label: primaryModule, to: primaryModuleTo });
  }

  for (const seg of segs) {
    if (!isInsightsFlow) {
      if (seg.label === appDomain || seg.label === primaryModule) continue;
      if (hops.length <= 1 && (seg.label === 'Inventory insights' || seg.label === 'Insights')) continue;
    }
    standardizedSegs.push(seg);
  }

  const finalSegs = options?.legacy ? rawSegs : standardizedSegs;

  return {
    isLandingClean,
    segs: finalSegs,
    rawSegs,
    finalLeafLabel,
    reportDef,
    reportContent
  };
}

export default function Topbar() {
  const loc = useLocation();
  const origin = originFor(loc);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);

  useEffect(() => {
    const handleSubTabChange = (e: any) => {
      if (e.detail?.tab) {
        setActiveSubTab(e.detail.tab);
      }
    };
    window.addEventListener('ns:active-subtab-change', handleSubTabChange);
    return () => {
      window.removeEventListener('ns:active-subtab-change', handleSubTabChange);
    };
  }, []);

  useEffect(() => {
    setActiveSubTab(null);
  }, [loc.pathname]);

  const data = computeBreadcrumbs(loc, origin, { activeSubTab: activeSubTab || undefined });
  if (!data) return null;
  const { isLandingClean, segs, reportDef, reportContent } = data;

  return (
    <div className="topbar">
      {!isLandingClean && <Breadcrumb items={segs} />}
      <div className="topbar-right" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        {isDatacenter() && <GeoDropdown />}
        {reportDef && reportContent && (
          <ExportMenu def={reportDef} content={reportContent} withPrint label="Download report" />
        )}
      </div>
    </div>
  );
}
