import { useLocation } from 'react-router-dom';
import { SCREENS } from '../routes';

export function screenFor(pathname: string) {
  return SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$').test(pathname));
}

export default function Topbar() {
  const { pathname } = useLocation();
  const s = screenFor(pathname);
  return (
    <header className="topbar">
      <span className="topbar-module">{s?.module ?? 'Inventory'}</span>
      <span className="topbar-sep">|</span>
      <span className="topbar-crumb">{s?.crumb ?? ''}</span>
      <span className="grow" />
      <span className="nst-input-shell" style={{ width: '15rem' }}><input className="nst-input" placeholder="Search" aria-label="Search" /></span>
    </header>
  );
}
