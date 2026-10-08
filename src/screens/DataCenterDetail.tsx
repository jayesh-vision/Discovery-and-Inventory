/* Inventory › Location › Data center — /inventory/datacenter/:dcId
   Resolves which records the data center view draws:
   1. a client import whose DataCenterId — or LocationId — is :dcId
      (City details' "Open data center view" passes an estate facility code);
   2. otherwise an empty state that offers the upload, pre-filled with
      :dcId as the LocationId. */
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui';
import { Empty } from '../components/dcim/common';
import { DcView } from '../components/dcim/DcView';
import { store, useClientData, useClients, useStoreVersion } from '../dcim/api';
import { findCityByFacilityCode } from '../data/geographicHierarchy';
import '../styles/dcim.css';

/** imported data centers matching an id or an estate location code */
export function useResolve(dcId: string, clientParam: string | null) {
  useStoreVersion();
  const clients = useClients();
  const hits: { clientId: string; clientName: string; dcId: string; name: string; viaLocation: boolean }[] = [];
  for (const c of clients) {
    if (clientParam && c.id !== clientParam) continue;
    for (const dc of store.data(c.id)?.entities.dataCenters ?? []) {
      if (dc.id === dcId || dc.locationId === dcId) hits.push({ clientId: c.id, clientName: c.name, dcId: dc.id, name: dc.name, viaLocation: dc.id !== dcId });
    }
  }
  return hits;
}

export default function DataCenterDetail() {
  const { dcId = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const hits = useResolve(dcId, sp.get('client'));
  const one = hits.length === 1 ? hits[0] : null;
  const data = useClientData(one?.clientId);
  const estate = findCityByFacilityCode(dcId);

  if (one && data) {
    if (one.viaLocation) {
      const n = new URLSearchParams(sp); n.set('client', one.clientId);
      setTimeout(() => nav(`/inventory/datacenter/${encodeURIComponent(one.dcId)}?${n}`, { replace: true }), 0);
    }
    return (
      <div className="page dcim">
        <DcView data={data} dcId={one.dcId} source={{ clientId: one.clientId, clientName: one.clientName }} />
      </div>
    );
  }
  return (
    <div className="page dcim">
      <Card>
        {hits.length > 1 ? (
          <>
            <Empty title={`${dcId} is imported for ${hits.length} clients`}>Choose whose inventory to open.</Empty>
            <div className="pick" style={{ maxWidth: 520, margin: '0 auto' }}>
              {hits.map(h => <button key={`${h.clientId}/${h.dcId}`} type="button" onClick={() => { const n = new URLSearchParams(sp); n.set('client', h.clientId); setSp(n); }}>
                <span>{h.name}<span className="sub"> · {h.dcId}</span></span><span className="sub">{h.clientName}</span></button>)}
            </div>
          </>
        ) : (
          <Empty title={`No physical inventory imported for ${dcId}`}
            actions={<>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={() => nav(`/inventory/dcim/import?location=${encodeURIComponent(dcId)}${sp.get('client') ? `&client=${encodeURIComponent(sp.get('client')!)}` : ''}`)}>Upload inventory</button>
              <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav('/inventory/dcim')}>All data centers</button>
            </>}>
            {estate ? `${dcId} is an estate facility in ${estate.city.name}, ${estate.state.name}. ` : ''}
            Its buildings, floors, rooms, racks and equipment appear here once a client imports them (put {dcId} in the DataCenters sheet's LocationId column).
          </Empty>
        )}
      </Card>
    </div>
  );
}
