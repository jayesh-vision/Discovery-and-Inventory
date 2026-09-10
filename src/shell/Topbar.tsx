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
   the drill is cleared. No banners, no back buttons: this is the way back. */
export default function Topbar() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const s = screenFor(pathname);
  if (!s) return null;
  const params = paramsOf(s.path, pathname);
  const drill = new URLSearchParams(search).get('drill');
  const parts = s.crumb.split(' · ');

  const targetFor = (prefix: string): string | null => {
    const t = SCREENS.find(x => x.crumb === prefix);
    if (!t) return null;
    let path = t.path;
    for (const [k, v] of Object.entries(params)) path = path.replace(':' + k, v);
    return path.includes(':') ? null : path;
  };

  const segs: { label: string; to: string | null }[] = parts.map((label, i) => {
    const isLast = i === parts.length - 1;
    const linkable = !isLast || !!drill;
    return { label, to: linkable ? targetFor(parts.slice(0, i + 1).join(' · ')) : null };
  });
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
