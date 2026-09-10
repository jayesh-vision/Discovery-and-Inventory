import { useLocation, useNavigate } from 'react-router-dom';
import { SCREENS } from '../routes';

export function screenFor(pathname: string) {
  return SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$').test(pathname));
}

/* A breadcrumb only — "Parent › Current". The host application normally
   supplies the menu and the global search; standalone (no host wrapping
   this shell) this is the only way back up from a detail screen, so it
   always renders rather than waiting on a host that may not be there.
   Collapses to the immediate parent's own crumb plus this screen's last
   segment — "Location › Capex", not the full "Location · Site details ·
   Capex" chain — so it reads the same two-level way at every depth. */
export default function Topbar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const s = screenFor(pathname);
  if (!s) return null;
  const parent = s.rail ? SCREENS.find(x => x.key === s.rail) : null;
  const parts = s.crumb.split(' · ');
  const current = parts[parts.length - 1];
  return (
    <div className="topbar">
      {parent
        ? <>
            <button className="topbar-crumb-link" onClick={() => nav(parent.path)}>{parent.crumb}</button>
            <span className="topbar-crumb-sep">›</span>
            <span className="topbar-crumb-current">{current}</span>
          </>
        : <span className="topbar-crumb-current">{s.crumb}</span>}
    </div>
  );
}
