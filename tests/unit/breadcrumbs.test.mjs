import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, closeLoader } from './load.mjs';

test('Breadcrumb trail verification for site tabs and origins', async (t) => {
  const routes = await loadModule('/src/routes.ts');
  const Topbar = await loadModule('/src/shell/Topbar.tsx');
  const geo = await loadModule('/src/data/geographicHierarchy.ts');

  // Verify findCityByFacilityCode resolves VA-DC-001 to Ashburn
  const cityMatch = geo.findCityByFacilityCode('VA-DC-001');
  assert.ok(cityMatch, 'cityMatch should find Ashburn for VA-DC-001');
  assert.equal(cityMatch.city.name, 'Ashburn');

  // Verify route matching for all site tabs
  const siteTabs = [
    { key: 'site', path: '/inventory/location/site/VA-DC-001', expectedSubLabel: null },
    { key: 'capex', path: '/inventory/location/site/VA-DC-001/capex', expectedSubLabel: 'Capex' },
    { key: 'opex', path: '/inventory/location/site/VA-DC-001/opex', expectedSubLabel: 'Opex' },
    { key: 'sitedetails', path: '/inventory/location/site/VA-DC-001/details', expectedSubLabel: 'Site details' },
    { key: 'siteequipment', path: '/inventory/location/site/VA-DC-001/equipment', expectedSubLabel: 'Site equipment' },
    { key: 'siteinfra', path: '/inventory/location/site/VA-DC-001/infrastructure', expectedSubLabel: 'Infrastructure' }
  ];

  for (const tab of siteTabs) {
    const s = Topbar.screenFor(tab.path);
    assert.ok(s, `screenFor should find screen for ${tab.path}`);
    assert.equal(s.key, tab.key, `Screen key for ${tab.path} should be ${tab.key}`);
  }

  // Verify route matching for passive inventory element routes
  const passiveRoutes = [
    { key: 'fiber', path: '/inventory/passive/fiber/FS-BGLK-277-INDR-275' },
    { key: 'odf', path: '/inventory/passive/odf/BGLK-277-ODF-01' },
    { key: 'rack', path: '/inventory/passive/rack/BGLK-277-RACK-A' },
    { key: 'power', path: '/inventory/passive/power/BGLK-277-DG-01' },
    { key: 'splice', path: '/inventory/passive/splice/SC-BGLK-277-011' },
    { key: 'cord', path: '/inventory/passive/cord/PC-BGLK-277-101' },
    { key: 'duct', path: '/inventory/passive/duct/DT-BGLK-277-CHE-118' }
  ];

  for (const r of passiveRoutes) {
    const s = Topbar.screenFor(r.path);
    assert.ok(s, `screenFor should find screen for ${r.path}`);
    assert.equal(s.key, r.key, `Screen key for ${r.path} should be ${r.key}`);
  }

  // 1. Physical Resources -> Router click (Telecom/Default and Datacenter)
  const insightsOrigin = { pathname: '/inventory/insights', search: '' };

  // Verify clean landings with insights origin
  const passiveLanding = Topbar.computeBreadcrumbs({ pathname: '/inventory/passive', search: '' }, insightsOrigin);
  assert.equal(passiveLanding, null, 'Passive landing should be clean and return null');

  const physicalLanding = Topbar.computeBreadcrumbs({ pathname: '/inventory/physical', search: '' }, insightsOrigin);
  assert.ok(physicalLanding && physicalLanding.isLandingClean, 'Physical landing should be clean');

  const virtualLanding = Topbar.computeBreadcrumbs({ pathname: '/inventory/virtual', search: '' }, insightsOrigin);
  assert.equal(virtualLanding, null, 'Virtual landing should be clean and return null');

  const phyRouterDefault = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BLR-DC-01&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  }, insightsOrigin);
  assert.ok(phyRouterDefault, 'phyRouterDefault should compute breadcrumbs');
  assert.equal(phyRouterDefault.segs[0].label, 'Physical Resources');
  assert.ok(!phyRouterDefault.segs.some(seg => seg.label === 'Inventory insights'), 'Should not contain Inventory insights');

  const phyRouterDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BLR-DC-01&cls=router&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  }, insightsOrigin);
  assert.ok(phyRouterDc, 'phyRouterDc should compute breadcrumbs');
  assert.equal(phyRouterDc.segs[0].label, 'Physical Resources');
  assert.ok(!phyRouterDc.segs.some(seg => seg.label === 'Inventory insights'), 'Datacenter router click should not contain Inventory insights');

  const phyResource = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/RTR-BLR-01',
    search: '?ip=10.0.0.1&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  }, insightsOrigin);
  assert.ok(phyResource, 'phyResource should compute breadcrumbs');
  assert.equal(phyResource.segs[0].label, 'Physical Resources');
  assert.ok(!phyResource.segs.some(seg => seg.label === 'Inventory insights'), 'Resource view should not contain Inventory insights');

  // 2. Virtual Resources -> Lifecycle, View, Cell 4G, Cell 5G
  const vnfLifecycle = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: ''
  }, insightsOrigin);
  assert.ok(vnfLifecycle, 'vnfLifecycle should compute breadcrumbs');
  assert.equal(vnfLifecycle.segs[0].label, 'Virtual Resources');
  assert.equal(vnfLifecycle.finalLeafLabel, 'Lifecycle operation');
  assert.ok(!vnfLifecycle.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle should not contain Inventory insights');

  const vnfLifecycleDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: '?solution=Datacenter'
  }, insightsOrigin);
  assert.ok(vnfLifecycleDc, 'vnfLifecycleDc should compute breadcrumbs');
  assert.equal(vnfLifecycleDc.segs[0].label, 'Virtual Resources');
  assert.ok(!vnfLifecycleDc.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle (Datacenter) should not contain Inventory insights');

  const vnfCell4g = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/cell-4g-details',
    search: ''
  }, insightsOrigin);
  assert.ok(vnfCell4g, 'vnfCell4g should compute breadcrumbs');
  assert.equal(vnfCell4g.segs[0].label, 'Virtual Resources');
  assert.equal(vnfCell4g.segs[1].label, 'View');
  assert.equal(vnfCell4g.finalLeafLabel, 'Cell 4G details');
  assert.ok(!vnfCell4g.segs.some(seg => seg.label === 'Inventory insights'), 'Cell 4G should not contain Inventory insights');

  // 3. Passive Inventory -> Fiber Span & Rack
  const passiveFiber = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/fiber/FS-BGLK-277-INDR-275',
    search: ''
  }, insightsOrigin);
  assert.ok(passiveFiber, 'passiveFiber should compute breadcrumbs');
  assert.equal(passiveFiber.segs[0].label, 'Passive inventory');
  assert.equal(passiveFiber.segs[1].label, 'Fiber spans');
  assert.equal(passiveFiber.finalLeafLabel, 'FS-BGLK-277-INDR-275');
  assert.ok(!passiveFiber.segs.some(seg => seg.label === 'Inventory insights'), 'Passive fiber should not contain Inventory insights');

  const passiveRack = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/rack/BGLK-277-RACK-A',
    search: ''
  }, insightsOrigin);
  assert.ok(passiveRack, 'passiveRack should compute breadcrumbs');
  assert.equal(passiveRack.segs[0].label, 'Passive inventory');
  assert.equal(passiveRack.segs[1].label, 'Racks');
  assert.equal(passiveRack.finalLeafLabel, 'BGLK-277-RACK-A');
  assert.ok(!passiveRack.segs.some(seg => seg.label === 'Inventory insights'), 'Passive rack should not contain Inventory insights');

  // 4. Location -> Site -> Equipment
  const siteEquip = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/equipment',
    search: ''
  }, insightsOrigin);
  assert.ok(siteEquip, 'siteEquip should compute breadcrumbs');
  assert.equal(siteEquip.segs[0].label, 'Location');
  assert.equal(siteEquip.segs[1].label, 'Ashburn');
  assert.equal(siteEquip.segs[2].label, 'VA-DC-001');
  assert.equal(siteEquip.finalLeafLabel, 'Site equipment');
  assert.ok(!siteEquip.segs.some(seg => seg.label === 'Inventory insights'), 'Site equipment should not contain Inventory insights');

  // 5. Data Centers (DCIM) -> drill down
  const dcimDrill = Topbar.computeBreadcrumbs({
    pathname: '/inventory/dcim',
    search: '?drill=Racks'
  }, insightsOrigin);
  assert.ok(dcimDrill, 'dcimDrill should compute breadcrumbs');
  assert.equal(dcimDrill.segs[0].label, 'Data centers');
  assert.equal(dcimDrill.finalLeafLabel, 'Racks');
  assert.ok(!dcimDrill.segs.some(seg => seg.label === 'Inventory insights'), 'DCIM should not contain Inventory insights');
  assert.ok(!dcimDrill.segs.some(seg => seg.label === 'Location'), 'DCIM without location origin should not contain Location');

  // 6. Genuinely arriving from Insights KPI jump
  const fromInsights = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?drill=Routers&from=Inventory%20insights'
  });
  assert.ok(fromInsights, 'fromInsights should compute breadcrumbs');
  assert.equal(fromInsights.segs[0].label, 'Inventory insights');
  assert.equal(fromInsights.finalLeafLabel, 'Routers');

  // 7. Inventory across the estate clicks from Location
  // 7a. Active card
  const fromLocActive = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?from=Location'
  });
  assert.ok(fromLocActive, 'fromLocActive should compute breadcrumbs');
  assert.equal(fromLocActive.segs[0].label, 'Location');
  assert.equal(fromLocActive.segs[0].to, '/inventory/location');
  assert.equal(fromLocActive.segs[1].label, 'Physical Resources');
  assert.equal(fromLocActive.finalLeafLabel, 'Physical Resources');
  assert.ok(!fromLocActive.segs.some(s => s.label === 'Inventory insights'), 'Should not contain Inventory insights');

  // 7b. Router chip
  const fromLocRouter = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=router&drill=Router&from=Location'
  });
  assert.ok(fromLocRouter, 'fromLocRouter should compute breadcrumbs');
  assert.equal(fromLocRouter.segs[0].label, 'Location');
  assert.equal(fromLocRouter.segs[1].label, 'Physical Resources');
  assert.equal(fromLocRouter.segs[2].label, 'Router');
  assert.equal(fromLocRouter.finalLeafLabel, 'Router');
  assert.ok(!fromLocRouter.segs.some(s => s.label === 'Inventory insights'), 'Should not contain Inventory insights');

  // 7c. Switch chip (auto tab-derived drill)
  const fromLocSwitch = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=switch&from=Location'
  });
  assert.ok(fromLocSwitch, 'fromLocSwitch should compute breadcrumbs');
  assert.equal(fromLocSwitch.segs[0].label, 'Location');
  assert.equal(fromLocSwitch.segs[1].label, 'Physical Resources');
  assert.equal(fromLocSwitch.segs[2].label, 'Switch');
  assert.equal(fromLocSwitch.finalLeafLabel, 'Switch');

  // 7d. Logical card
  const fromLocLogical = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual',
    search: '?from=Location'
  });
  assert.ok(fromLocLogical, 'fromLocLogical should compute breadcrumbs');
  assert.equal(fromLocLogical.segs[0].label, 'Location');
  assert.equal(fromLocLogical.segs[1].label, 'Virtual Resources');
  assert.equal(fromLocLogical.finalLeafLabel, 'Virtual Resources');

  // 7e. LLDP chip
  const fromLocLldp = Topbar.computeBreadcrumbs({
    pathname: '/inventory/links',
    search: '?tab=lldp&drill=LLDP&from=Location'
  });
  assert.ok(fromLocLldp, 'fromLocLldp should compute breadcrumbs');
  assert.equal(fromLocLldp.segs[0].label, 'Location');
  assert.equal(fromLocLldp.segs[1].label, 'Links');
  assert.equal(fromLocLldp.segs[2].label, 'LLDP');
  assert.equal(fromLocLldp.finalLeafLabel, 'LLDP');

  // 7f. L3VPN chip
  const fromLocL3vpn = Topbar.computeBreadcrumbs({
    pathname: '/inventory/services',
    search: '?tab=l3vpn&drill=L3VPN&from=Location'
  });
  assert.ok(fromLocL3vpn, 'fromLocL3vpn should compute breadcrumbs');
  assert.equal(fromLocL3vpn.segs[0].label, 'Location');
  assert.equal(fromLocL3vpn.segs[1].label, 'Services');
  assert.equal(fromLocL3vpn.segs[2].label, 'L3VPN');
  assert.equal(fromLocL3vpn.finalLeafLabel, 'L3VPN');

  // 7g. Passive card
  const fromLocPassive = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?from=Location'
  });
  assert.ok(fromLocPassive, 'fromLocPassive should compute breadcrumbs');
  assert.equal(fromLocPassive.segs[0].label, 'Location');
  assert.equal(fromLocPassive.segs[1].label, 'Passive inventory');
  assert.equal(fromLocPassive.finalLeafLabel, 'Passive inventory');

  // 7h. ODF chip
  const fromLocOdf = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=odf&drill=ODF&from=Location'
  });
  assert.ok(fromLocOdf, 'fromLocOdf should compute breadcrumbs');
  assert.equal(fromLocOdf.segs[0].label, 'Location');
  assert.equal(fromLocOdf.segs[1].label, 'Passive inventory');
  assert.equal(fromLocOdf.segs[2].label, 'ODF');
  assert.equal(fromLocOdf.finalLeafLabel, 'ODF');

  // 7i. Racks chip
  const fromLocRacks = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=rack&drill=Racks&from=Location'
  });
  assert.ok(fromLocRacks, 'fromLocRacks should compute breadcrumbs');
  assert.equal(fromLocRacks.segs[0].label, 'Location');
  assert.equal(fromLocRacks.segs[1].label, 'Passive inventory');
  assert.equal(fromLocRacks.segs[2].label, 'Racks');
  assert.equal(fromLocRacks.finalLeafLabel, 'Racks');

  // 7j. Chained: Insights -> Location -> Router
  const chainedRouter = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=router&drill=Router&from=Location%3Ffrom%3DInventory%2520insights'
  });
  assert.ok(chainedRouter, 'chainedRouter should compute breadcrumbs');
  assert.equal(chainedRouter.segs[0].label, 'Inventory insights');
  assert.equal(chainedRouter.segs[1].label, 'Location');
  assert.equal(chainedRouter.segs[2].label, 'Physical Resources');
  assert.equal(chainedRouter.segs[3].label, 'Router');

  await closeLoader();
});
