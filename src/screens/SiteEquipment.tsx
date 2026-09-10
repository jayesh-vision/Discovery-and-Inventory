import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Chip } from '../components/ui';
import { facilityOf } from '../data/facility';
import { siteInfoFor } from '../data/cableView';
import { SiteHeader, SiteTabs, useSiteLocation } from './SiteTabs';

/* The Site equipment tab hosts the Fiberneo cable view unmodified in its own
   frame. The view expects its host to hand it a `siteInfo` facility payload;
   here that payload is built from the facility ledger and injected the way
   Fiberneo does (`window.siteInfo` on the frame — the view polls for it).
   With `?token=…&facility_id=…` on this route the values are passed through
   instead and the frame fetches from Fiberneo itself. */
const CABLE_VIEW = '/cable-view/index.html';

export default function SiteEquipment() {
  const { id = 'BGLK-277' } = useParams();
  const [sp] = useSearchParams();
  const { l, head } = useSiteLocation(id);
  const token = sp.get('token') ?? '';
  const facility = sp.get('facility_id') ?? '';
  const live = token.length > 0;

  const src = useMemo(() => {
    const q = new URLSearchParams({ station_id: l.id, theme: 'light' });
    if (live) { q.set('token', token); if (facility) q.set('facility_id', facility); }
    return `${CABLE_VIEW}?${q}`;
  }, [l.id, live, token, facility]);

  const payload = useMemo(() => live ? null : siteInfoFor(l, facilityOf(l.id, l.ne)), [l, live]);
  const onLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    if (!payload) return;
    const w = e.currentTarget.contentWindow as (Window & { siteInfo?: unknown }) | null;
    if (w) w.siteInfo = payload;
  }, [payload]);

  const hash = import.meta.env.VITE_ROUTER === 'hash';
  const lit = payload ? payload.equipments[0].equipmentConnectivities.length : 0;

  return (
    <div className="page">
      <SiteHeader l={l} head={head} />
      <SiteTabs l={l} head={head} active="equipment" />
      <div className="cv-bar">
        <span className="vw-card-title">Cable view</span>
        <span className="vw-card-description">
          {live ? `Equipment, ports and splices at ${l.id}, fetched from Fiberneo`
                : `${lit} of ${payload!.totalCores} incoming cores patched across ${payload!.equipments.length - 2} equipment, from the site's cabling ledger`}
        </span>
        <span className="grow" />
        <Chip tone={live ? 'success' : 'info'}>{live ? 'Live · Fiberneo' : 'Ledger data'}</Chip>
      </div>
      {hash ? (
        <div className="cv-fallback vw-card">
          <span className="vw-card-title">Cable view runs in the deployed app</span>
          <span className="vw-card-description">
            This single-file preview cannot embed a second application. Open the same route on the deployed build
            (<span className="mono">/inventory/location/site/{l.id}/equipment</span>) to see the cable view.
          </span>
        </div>
      ) : (
        <iframe className="cv-frame" src={src} title="Cable view" data-testid="cable-view" onLoad={onLoad} />
      )}
    </div>
  );
}
