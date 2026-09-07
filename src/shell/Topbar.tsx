import { useLocation, useNavigate } from 'react-router-dom';
import { SCREENS } from '../routes';

export function screenFor(pathname: string) {
  return SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$').test(pathname));
}

/* A breadcrumb only. The host application supplies the menu and the global
   search; inside a detail screen the crumb is how a user gets back. */
export default function Topbar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const s = screenFor(pathname);
  const parent = s?.rail ? SCREENS.find(x => x.key === s.rail) : null;
  const parts = (s?.crumb ?? '').split(' · ');
  return (
    <header className="topbar">
      <span className="topbar-module">{s?.module ?? 'Inventory'}</span>
      <span className="topbar-sep">|</span>
      <span className="topbar-crumb">
        {parent && parts.length > 1
          ? <>{parts.slice(0, -1).map((p, i) => <span key={i}><button className="crumb-link" onClick={() => nav(parent.path)}>{p}</button><span className="topbar-sep"> · </span></span>)}{parts[parts.length - 1]}</>
          : s?.crumb ?? ''}
      </span>
    </header>
  );
}
