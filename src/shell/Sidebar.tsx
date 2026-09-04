import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { SCREENS, screenByKey } from '../routes';
import { CHEV, SIDE_CHEVRON, SIDE_GRID, SIDE_ICONS } from './sideIcons';

const Svg = ({ html }: { html: string }) => <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;

type Item = { key: string; label: string } | { group: string; label: string; children: { key: string; label: string }[] };
const RAIL: { section: string; items: Item[] }[] = [
  { section: 'Discovery and reconciliation', items: [
    { key: 'insights', label: 'Insights' }, { key: 'jobs', label: 'Scan jobs' },
    { key: 'targets', label: 'Scan targets' }, { key: 'reconcile', label: 'Reconciliation' } ] },
  { section: 'Inventory', items: [
    { key: 'location', label: 'Location' },
    { group: 'res', label: 'Resources', children: [
      { key: 'virtual', label: 'Virtual Resources' }, { key: 'physical', label: 'Physical Resources' }, { key: 'passive', label: 'Passive Infrastructure' } ] },
    { group: 'con', label: 'Connectivity', children: [ { key: 'links', label: 'Links' } ] },
    { key: 'services', label: 'Services' }, { key: 'inactive', label: 'Inactive inventory' }, { key: 'reports', label: 'Reports' } ] }
];

/* which rail item lights up for the current URL, including detail screens */
export function activeRailKey(pathname: string): string | null {
  const s = SCREENS.filter(x => !x.path.includes(':')).find(x => x.path === pathname)
    ?? SCREENS.filter(x => x.path.includes(':')).find(x => {
      const re = new RegExp('^' + x.path.replace(/:[^/]+/g, '[^/]+') + '$');
      return re.test(pathname);
    });
  return s ? (s.rail ?? s.key) : null;
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const active = activeRailKey(pathname);
  const [open, setOpen] = useState<Record<string, boolean>>({ res: true, con: true });
  useEffect(() => {
    /* a child that is active keeps its group open */
    for (const sec of RAIL) for (const it of sec.items)
      if ('group' in it && it.children.some(c => c.key === active)) setOpen(o => ({ ...o, [it.group]: true }));
  }, [active]);

  const item = (key: string, label: string, child = false) => {
    const s = screenByKey(key)!;
    return (
      <NavLink key={key} to={s.path} data-label={label}
        className={`side-item${child ? ' is-child' : ''}${active === key ? ' is-active' : ''}`}>
        <Svg html={SIDE_ICONS[key]} /><span className="grow">{label}</span>
      </NavLink>
    );
  };

  return (
    <nav className="side" aria-label="Modules">
      <div className="side-top">
        <button className="side-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!collapsed} title={collapsed ? 'Expand menu' : 'Collapse menu'}><Svg html={SIDE_GRID} /></button>
        <button className="side-home" onClick={() => nav('/inventory')}>Home</button>
        <span className="grow" />
        <span onClick={onToggle} style={{ display: 'contents', cursor: 'pointer' }}><Svg html={SIDE_CHEVRON} /></span>
      </div>
      <div className="side-nav">
        {RAIL.map(sec => (
          <div key={sec.section} style={{ display: 'contents' }}>
            <div className="side-section">{sec.section}</div>
            {sec.items.map(it => 'group' in it ? (
              <div key={it.group} style={{ display: 'contents' }}>
                <button className={`side-item${open[it.group] ? '' : ' is-closed'}`} data-label={it.label}
                  onClick={() => setOpen(o => ({ ...o, [it.group]: !o[it.group] }))} aria-expanded={!!open[it.group]}>
                  <Svg html={SIDE_ICONS['group:' + it.group]} /><span className="grow">{it.label}</span><Svg html={CHEV} />
                </button>
                {open[it.group] && it.children.map(c => item(c.key, c.label, true))}
              </div>
            ) : item(it.key, it.label))}
          </div>
        ))}
      </div>
    </nav>
  );
}
