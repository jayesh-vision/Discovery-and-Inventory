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

  if (s.key === 'location' && !drill && !from) {
    return null;
  }

  const targetFor = (prefix: string): string | null => {
    const t = SCREENS.find(x => x.crumb === prefix);
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

  const origin = from && from !== s.crumb ? SCREENS.find(x => x.crumb === from) : undefined;
  const ownParts = s.crumb.split(' · ');
  const chain = origin ? origin.crumb.split(' · ') : ownParts.slice(0, -1);
  const leaf = ownParts[ownParts.length - 1];

  const segs: { label: string; to: string | null }[] = chain.map((label, i) => ({
    label, to: targetFor(chain.slice(0, i + 1).join(' · '))
  }));
  segs.push({ label: leaf, to: drill ? targetFor(s.crumb) : null });
  if (drill) segs.push({ label: drill, to: null });

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
