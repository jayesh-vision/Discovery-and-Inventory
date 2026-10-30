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
  const phyRouterDefault = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BLR-DC-01&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(phyRouterDefault, 'phyRouterDefault should compute breadcrumbs');
  assert.equal(phyRouterDefault.segs[0].label, 'Physical Resources');
  assert.ok(!phyRouterDefault.segs.some(seg => seg.label === 'Inventory insights'), 'Should not contain Inventory insights');

  const phyRouterDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BLR-DC-01&cls=router&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(phyRouterDc, 'phyRouterDc should compute breadcrumbs');
  assert.equal(phyRouterDc.segs[0].label, 'Physical Resources');
  assert.ok(!phyRouterDc.segs.some(seg => seg.label === 'Inventory insights'), 'Datacenter router click should not contain Inventory insights');

  const phyResource = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/RTR-BLR-01',
    search: '?ip=10.0.0.1&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(phyResource, 'phyResource should compute breadcrumbs');
  assert.equal(phyResource.segs[0].label, 'Physical Resources');
  assert.ok(!phyResource.segs.some(seg => seg.label === 'Inventory insights'), 'Resource view should not contain Inventory insights');

  // 2. Virtual Resources -> Lifecycle, View, Cell 4G, Cell 5G
  const vnfLifecycle = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: ''
  });
  assert.ok(vnfLifecycle, 'vnfLifecycle should compute breadcrumbs');
  assert.equal(vnfLifecycle.segs[0].label, 'Virtual Resources');
  assert.equal(vnfLifecycle.finalLeafLabel, 'Lifecycle operation');
  assert.ok(!vnfLifecycle.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle should not contain Inventory insights');

  const vnfLifecycleDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: '?solution=Datacenter'
  });
  assert.ok(vnfLifecycleDc, 'vnfLifecycleDc should compute breadcrumbs');
  assert.equal(vnfLifecycleDc.segs[0].label, 'Virtual Resources');
  assert.ok(!vnfLifecycleDc.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle (Datacenter) should not contain Inventory insights');

  const vnfCell4g = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/cell-4g-details',
    search: ''
  });
  assert.ok(vnfCell4g, 'vnfCell4g should compute breadcrumbs');
  assert.equal(vnfCell4g.segs[0].label, 'Virtual Resources');
  assert.equal(vnfCell4g.segs[1].label, 'View');
  assert.equal(vnfCell4g.finalLeafLabel, 'Cell 4G details');
  assert.ok(!vnfCell4g.segs.some(seg => seg.label === 'Inventory insights'), 'Cell 4G should not contain Inventory insights');

  // 3. Passive Inventory -> Fiber Span
  const passiveFiber = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/fiber/FS-BGLK-277-INDR-275',
    search: ''
  });
  assert.ok(passiveFiber, 'passiveFiber should compute breadcrumbs');
  assert.equal(passiveFiber.segs[0].label, 'Passive inventory');
  assert.equal(passiveFiber.segs[1].label, 'Fiber spans');
  assert.equal(passiveFiber.finalLeafLabel, 'FS-BGLK-277-INDR-275');
  assert.ok(!passiveFiber.segs.some(seg => seg.label === 'Inventory insights'), 'Passive fiber should not contain Inventory insights');

  // 4. Location -> Site -> Equipment
  const siteEquip = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/equipment',
    search: ''
  });
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
  });
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

  await closeLoader();
});
