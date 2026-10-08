/* Inventory › Location › Site details · Infrastructure — /inventory/location/site/:id/infrastructure
   The site page's own header and tabs, then the site's physical
   infrastructure inventory (buildings to devices, power, cooling, cabling,
   sensors) as uploaded by a client whose DataCenters sheet names this site
   in LocationId. With no upload yet, it offers the upload, pre-filled with
   this site's Location ID. */
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui';
import { Empty } from '../components/dcim/common';
import { DcView } from '../components/dcim/DcView';
import { SiteHeader, SiteTabs, useSiteLocation } from './SiteTabs';
import { useResolve } from './DataCenterDetail';
import { downloadSiteExample, downloadTemplate, useClientData } from '../dcim/api';
import '../styles/dcim.css';

export default function SiteInfrastructure() {
  const { id = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { l, head } = useSiteLocation(id);
  const hits = useResolve(l.id, sp.get('client'));
  const one = hits.length === 1 ? hits[0] : null;
  const data = useClientData(one?.clientId);

  return (
    <div className="page dcim">
      <SiteHeader l={l} head={head} />
      <SiteTabs l={l} head={head} active="infra" />
      {one && data ? (
        <DcView data={data} dcId={one.dcId} source={{ clientId: one.clientId, clientName: one.clientName }} />
      ) : hits.length > 1 ? (
        <Card>
          <Empty title={`${l.id} has uploads from ${hits.length} clients`}>Choose whose inventory to show.</Empty>
          <div className="pick" style={{ maxWidth: 520, margin: '0 auto' }}>
            {hits.map(h => <button key={`${h.clientId}/${h.dcId}`} type="button" onClick={() => { const n = new URLSearchParams(sp); n.set('client', h.clientId); setSp(n); }}>
              <span>{h.name}<span className="sub"> · {h.dcId}</span></span><span className="sub">{h.clientName}</span></button>)}
          </div>
        </Card>
      ) : (
        <Card>
          <Empty icon="⇪" title={`No infrastructure inventory uploaded for ${l.id}`}
            actions={<>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => nav(`/inventory/dcim/import?location=${encodeURIComponent(l.id)}`)}>Upload inventory</button>
              <button type="button" className="nst-btn nst-btn--sm" onClick={() => downloadSiteExample(l)}>Download example for {l.id}</button>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => downloadTemplate()}>Blank template</button>
            </>}>
            Upload the site's buildings, floors, rooms, racks, devices, cabling, power plant, cooling and sensors from the Excel template or CSV files.
            Put <strong>{l.id}</strong> in the DataCenters sheet's LocationId column and the inventory appears on this tab.
            The example workbook is filled with this site's own {l.ne + (l.ne >= 20 ? 2 : l.ne >= 6 ? 1 : 0)} network elements placed in racks, with power, cooling, cabling and sensors — upload it as is, or edit it first.
          </Empty>
        </Card>
      )}
    </div>
  );
}
