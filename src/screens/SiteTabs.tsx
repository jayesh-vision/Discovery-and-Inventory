import { useNavigate } from 'react-router-dom';
import type { Location } from '../data/locations';

/* The site screen's section tabs. The first three sections still render in the
   prototype; the last two are React. Every tab is a route so the row is the
   same wherever it is drawn. */
export function SiteHeader({ l }: { l: Location }) {
  const nav = useNavigate();
  return (
    <div className="page-bar" style={{ justifyContent: 'flex-start' }}>
      <div className="stack-x">
        <span className="vw-card-title">{l.name}</span>
        <span className="vw-card-description">{l.type} · {l.id} · {l.city}, {l.state}</span>
      </div>
      <span className="grow" />
      <button className="nst-btn nst-btn--sm" onClick={() => nav('/inventory/reports')}>Download report</button>
      <button className="nst-btn nst-btn--filled nst-btn--sm" onClick={() => nav(`/inventory/location/site/${l.id}/details`)}>Edit site</button>
    </div>
  );
}

export function SiteTabs({ l, active }: { l: Location; active?: 'details' | 'equipment' }) {
  const nav = useNavigate();
  const base = `/inventory/location/site/${l.id}`;
  return (
    <div className="section-tabs">
      <button className="stab" onClick={() => nav(base)}>Network elements</button>
      <button className="stab" onClick={() => nav(base + '/capex')}>Capex</button>
      <button className="stab" onClick={() => nav(base + '/opex')}>Opex</button>
      <button className={`stab${active === 'details' ? ' is-on' : ''}`} onClick={() => nav(base + '/details')}>Site details</button>
      <button className={`stab${active === 'equipment' ? ' is-on' : ''}`} onClick={() => nav(base + '/equipment')}>Site equipment</button>
    </div>
  );
}
