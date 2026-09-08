import type { ComponentType } from 'react';
import PhysicalResources from './screens/PhysicalResources';
import InactiveInventory from './screens/InactiveInventory';
import Insights from './screens/Insights';
import RegionDevices from './screens/RegionDevices';
import DiscoveredDevices from './screens/DiscoveredDevices';
import SiteDetails from './screens/SiteDetails';
import SiteEquipment from './screens/SiteEquipment';

/* One registry for the sidebar, the breadcrumb, the router and the legacy
   bridge. `legacy` names the prototype view a screen still renders through;
   porting a screen means giving it a `component` and deleting that key. */
export interface Screen {
  key: string;                 /* the prototype's view key; stable across the port */
  path: string;
  module: 'Discovery and reconciliation' | 'Inventory';
  crumb: string;
  rail?: string;               /* which sidebar item lights up, when not `key` */
  component?: ComponentType;
  legacy?: boolean;
}

export const SCREENS: Screen[] = [
  { key: 'insights',  path: '/discovery/insights',  module: 'Discovery and reconciliation', crumb: 'Insights',       component: Insights },
  { key: 'insightsdevices', path: '/discovery/insights/devices', module: 'Discovery and reconciliation',
    crumb: 'Insights · Devices', rail: 'insights', component: RegionDevices },
  { key: 'regiondevices', path: '/discovery/insights/region/:region', module: 'Discovery and reconciliation',
    crumb: 'Insights · Devices by region', rail: 'insights', component: RegionDevices },
  { key: 'discovereddevices', path: '/discovery/insights/discovered', module: 'Discovery and reconciliation',
    crumb: 'Insights · Discovered devices', rail: 'insights', component: DiscoveredDevices },
  { key: 'jobs',      path: '/discovery/jobs',      module: 'Discovery and reconciliation', crumb: 'Scan jobs',      legacy: true },
  { key: 'targets',   path: '/discovery/targets',   module: 'Discovery and reconciliation', crumb: 'Scan targets',   legacy: true },
  { key: 'target',    path: '/discovery/targets/:host', module: 'Discovery and reconciliation', crumb: 'Scan targets · Target', rail: 'targets', legacy: true },
  { key: 'reconcile', path: '/discovery/reconcile', module: 'Discovery and reconciliation', crumb: 'Reconciliation', legacy: true },

  { key: 'home',      path: '/inventory',           module: 'Inventory', crumb: 'Home', legacy: true },
  { key: 'location',  path: '/inventory/location',  module: 'Inventory', crumb: 'Location', legacy: true },
  { key: 'site',      path: '/inventory/location/site/:id',       module: 'Inventory', crumb: 'Location · Site details', rail: 'location', legacy: true },
  { key: 'capex',     path: '/inventory/location/site/:id/capex', module: 'Inventory', crumb: 'Location · Site details · Capex', rail: 'location', legacy: true },
  { key: 'opex',      path: '/inventory/location/site/:id/opex',  module: 'Inventory', crumb: 'Location · Site details · Opex', rail: 'location', legacy: true },
  { key: 'sitedetails', path: '/inventory/location/site/:id/details', module: 'Inventory', crumb: 'Location · Site details · Facility', rail: 'location', component: SiteDetails },
  { key: 'siteequipment', path: '/inventory/location/site/:id/equipment', module: 'Inventory', crumb: 'Location · Site details · Site equipment', rail: 'location', component: SiteEquipment },
  { key: 'node',      path: '/inventory/node/:name',              module: 'Inventory', crumb: 'Location · Site details · Node view', rail: 'location', legacy: true },
  { key: 'virtual',   path: '/inventory/virtual',   module: 'Inventory', crumb: 'Resources · Virtual Resources', legacy: true },
  { key: 'vnflifecycle', path: '/inventory/virtual/lifecycle', module: 'Inventory', crumb: 'Resources · Virtual Resources · Lifecycle operation', rail: 'virtual', legacy: true },
  { key: 'physical',  path: '/inventory/physical',  module: 'Inventory', crumb: 'Resources · Physical Resources', component: PhysicalResources },
  { key: 'resource',  path: '/inventory/resource/:name', module: 'Inventory', crumb: 'Resources · Physical Resources · Element', rail: 'physical', legacy: true },
  { key: 'passive',   path: '/inventory/passive',   module: 'Inventory', crumb: 'Resources · Passive Infrastructure', legacy: true },
  { key: 'links',     path: '/inventory/links',     module: 'Inventory', crumb: 'Connectivity · Links', legacy: true },
  { key: 'services',  path: '/inventory/services',  module: 'Inventory', crumb: 'Services', legacy: true },
  { key: 'inactive',  path: '/inventory/inactive',  module: 'Inventory', crumb: 'Inactive inventory', component: InactiveInventory },
  { key: 'reports',   path: '/inventory/reports',   module: 'Inventory', crumb: 'Reports', legacy: true }
];

export const screenByKey = (k: string) => SCREENS.find(s => s.key === k);
export const isReactOwned = (k: string) => !!screenByKey(k)?.component;

/* legacy drill queries → React search params. The prototype passes `q` as a
   query string ('cls=router', 'stock=instore'); React screens read the same
   names from the URL, so the mapping is the identity plus the drill label. */
export function legacyPath(key: string, drill?: { label?: string; q?: string } | null, params: Record<string, string> = {}): string {
  const s = screenByKey(key);
  if (!s) return '/discovery/insights';
  let path = s.path;
  for (const [k, v] of Object.entries(params)) path = path.replace(':' + k, encodeURIComponent(v));
  const sp = new URLSearchParams(drill?.q ?? '');
  if (drill?.label) sp.set('drill', drill.label);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
