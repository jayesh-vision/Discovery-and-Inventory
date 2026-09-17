import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SCREENS } from '../routes';
import { reportDefById } from '../data/reports/catalog';

export function screenFor(pathname: string) {
  return SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$').test(pathname));
}

/* No visible header: the host application draws its own above the iframe.
   The document title still names the screen for the host, tabs and history. */
export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const s = screenFor(pathname);
    const report = s && (s.key === 'discoveryreport' || s.key === 'inventoryreport') ? reportDefById(pathname.split('/').pop() ?? '') : undefined;
    document.title = report ? `Reports · ${report.name} · ${s!.module}` : s ? `${s.crumb} · ${s.module}` : 'NetSingularity';
  }, [pathname]);
  return null;
}
