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
  assert.equal(phyRouterDefault.segs.length, 3, 'Should have exactly 3 segments: Physical Resources > Router > Node view');
  assert.equal(phyRouterDefault.segs[0].label, 'Physical Resources');
  assert.equal(phyRouterDefault.segs[1].label, 'Router');
  assert.equal(phyRouterDefault.segs[2].label, 'Node view');
  assert.equal(phyRouterDefault.finalLeafLabel, 'Node view');
  assert.ok(!phyRouterDefault.segs.some(seg => seg.label === 'Inventory insights'), 'Should not contain Inventory insights');

  const phyRouterDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BLR-DC-01&cls=router&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  }, insightsOrigin);
  assert.ok(phyRouterDc, 'phyRouterDc should compute breadcrumbs');
  assert.equal(phyRouterDc.segs.length, 3, 'Should have exactly 3 segments: Physical Resources > Router > Node view');
  assert.equal(phyRouterDc.segs[0].label, 'Physical Resources');
  assert.equal(phyRouterDc.segs[1].label, 'Router');
  assert.equal(phyRouterDc.segs[2].label, 'Node view');
  assert.equal(phyRouterDc.finalLeafLabel, 'Node view');
  assert.ok(!phyRouterDc.segs.some(seg => seg.label === 'Inventory insights'), 'Datacenter router click should not contain Inventory insights');

  const phyResource = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/RTR-BLR-01',
    search: '?ip=10.0.0.1&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  }, insightsOrigin);
  assert.ok(phyResource, 'phyResource should compute breadcrumbs');
  assert.equal(phyResource.segs.length, 5, 'Should have 5 segments: Resource Manager > Inventory > Physical Resources > Router > RTR-BLR-01');
  assert.equal(phyResource.segs[0].label, 'Resource Manager');
  assert.equal(phyResource.segs[1].label, 'Inventory');
  assert.equal(phyResource.segs[2].label, 'Physical Resources');
  assert.equal(phyResource.segs[3].label, 'Router');
  assert.equal(phyResource.segs[4].label, 'RTR-BLR-01');
  assert.equal(phyResource.finalLeafLabel, 'RTR-BLR-01');
  assert.ok(!phyResource.segs.some(seg => seg.label === 'Inventory insights'), 'Resource view should not contain Inventory insights');

  // 2. Virtual Resources -> Lifecycle, View, Cell 4G, Cell 5G
  const vnfLifecycle = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: ''
  }, insightsOrigin);
  assert.ok(vnfLifecycle, 'vnfLifecycle should compute breadcrumbs');
  assert.equal(vnfLifecycle.segs[0].label, 'Resource Manager');
  assert.equal(vnfLifecycle.segs[1].label, 'Inventory');
  assert.equal(vnfLifecycle.segs[2].label, 'Virtual Resources');
  assert.equal(vnfLifecycle.finalLeafLabel, 'Lifecycle operation');
  assert.ok(!vnfLifecycle.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle should not contain Inventory insights');

  const vnfLifecycleDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/lifecycle',
    search: '?solution=Datacenter'
  }, insightsOrigin);
  assert.ok(vnfLifecycleDc, 'vnfLifecycleDc should compute breadcrumbs');
  assert.equal(vnfLifecycleDc.segs[0].label, 'Resource Manager');
  assert.equal(vnfLifecycleDc.segs[1].label, 'Inventory');
  assert.equal(vnfLifecycleDc.segs[2].label, 'Virtual Resources');
  assert.ok(!vnfLifecycleDc.segs.some(seg => seg.label === 'Inventory insights'), 'VNF lifecycle (Datacenter) should not contain Inventory insights');

  const vnfCell4g = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual/cell-4g-details',
    search: ''
  }, insightsOrigin);
  assert.ok(vnfCell4g, 'vnfCell4g should compute breadcrumbs');
  assert.equal(vnfCell4g.segs[0].label, 'Resource Manager');
  assert.equal(vnfCell4g.segs[1].label, 'Inventory');
  assert.equal(vnfCell4g.segs[2].label, 'Virtual Resources');
  assert.equal(vnfCell4g.segs[3].label, 'View');
  assert.equal(vnfCell4g.finalLeafLabel, 'Cell 4G details');
  assert.ok(!vnfCell4g.segs.some(seg => seg.label === 'Inventory insights'), 'Cell 4G should not contain Inventory insights');

  // 3. Passive Inventory -> Fiber Span & Rack
  const passiveFiber = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/fiber/FS-BGLK-277-INDR-275',
    search: ''
  }, insightsOrigin);
  assert.ok(passiveFiber, 'passiveFiber should compute breadcrumbs');
  assert.equal(passiveFiber.segs[0].label, 'Resource Manager');
  assert.equal(passiveFiber.segs[1].label, 'Inventory');
  assert.equal(passiveFiber.segs[2].label, 'Passive inventory');
  assert.equal(passiveFiber.segs[3].label, 'Fiber spans');
  assert.equal(passiveFiber.segs[4].label, 'FS-BGLK-277-INDR-275');
  assert.equal(passiveFiber.finalLeafLabel, 'Overview');
  assert.ok(!passiveFiber.segs.some(seg => seg.label === 'Inventory insights'), 'Passive fiber should not contain Inventory insights');

  const passiveRack = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/rack/BGLK-277-RACK-A',
    search: ''
  }, insightsOrigin);
  assert.ok(passiveRack, 'passiveRack should compute breadcrumbs');
  assert.equal(passiveRack.segs[0].label, 'Resource Manager');
  assert.equal(passiveRack.segs[1].label, 'Inventory');
  assert.equal(passiveRack.segs[2].label, 'Passive inventory');
  assert.equal(passiveRack.segs[3].label, 'Racks');
  assert.equal(passiveRack.segs[4].label, 'BGLK-277-RACK-A');
  assert.equal(passiveRack.finalLeafLabel, 'Overview');
  assert.ok(!passiveRack.segs.some(seg => seg.label === 'Inventory insights'), 'Passive rack should not contain Inventory insights');

  // 4. Location -> Site -> Equipment
  const siteEquip = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/equipment',
    search: ''
  }, insightsOrigin);
  assert.ok(siteEquip, 'siteEquip should compute breadcrumbs');
  assert.equal(siteEquip.segs[0].label, 'Resource Manager');
  assert.equal(siteEquip.segs[1].label, 'Inventory');
  assert.equal(siteEquip.segs[2].label, 'Location');
  assert.equal(siteEquip.segs[3].label, 'Ashburn');
  assert.equal(siteEquip.segs[4].label, 'VA-DC-001');
  assert.equal(siteEquip.finalLeafLabel, 'Site equipment');
  assert.ok(!siteEquip.segs.some(seg => seg.label === 'Inventory insights'), 'Site equipment should not contain Inventory insights');

  // 5. Data Centers (DCIM) -> drill down
  const dcimDrill = Topbar.computeBreadcrumbs({
    pathname: '/inventory/dcim',
    search: '?drill=Racks'
  }, insightsOrigin);
  assert.ok(dcimDrill, 'dcimDrill should compute breadcrumbs');
  assert.equal(dcimDrill.segs[0].label, 'Resource Manager');
  assert.equal(dcimDrill.segs[1].label, 'Inventory');
  assert.equal(dcimDrill.segs[2].label, 'Data centers');
  assert.equal(dcimDrill.finalLeafLabel, 'Racks');
  assert.ok(!dcimDrill.segs.some(seg => seg.label === 'Inventory insights'), 'DCIM should not contain Inventory insights');
  assert.ok(!dcimDrill.segs.some(seg => seg.label === 'Location'), 'DCIM without location origin should not contain Location');

  // 6. Genuinely arriving from Insights KPI jump
  // 6a. Direct Physical Inventory card click (Telecom)
  const fromInsightsDirect = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?from=Inventory%20insights'
  });
  assert.ok(fromInsightsDirect, 'fromInsightsDirect should compute breadcrumbs');
  assert.equal(fromInsightsDirect.segs.length, 2);
  assert.equal(fromInsightsDirect.segs[0].label, 'Insights');
  assert.equal(fromInsightsDirect.segs[0].to, '/inventory/insights');
  assert.equal(fromInsightsDirect.segs[1].label, 'Physical Inventory');
  assert.equal(fromInsightsDirect.finalLeafLabel, 'Physical Inventory');

  // 6b. Direct Physical Inventory card click (Datacenter mode)
  const fromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resources/physical',
    search: '?type=active&from=Inventory%20insights&solution=Datacenter'
  });
  assert.ok(fromInsightsDc, 'fromInsightsDc should compute breadcrumbs');
  assert.equal(fromInsightsDc.segs.length, 2);
  assert.equal(fromInsightsDc.segs[0].label, 'Insights');
  assert.equal(fromInsightsDc.segs[0].to, '/inventory/insights');
  assert.equal(fromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.equal(fromInsightsDc.finalLeafLabel, 'Physical Inventory');

  // 6c. Drill into Routers from Insights
  const fromInsights = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?drill=Routers&from=Inventory%20insights'
  });
  assert.ok(fromInsights, 'fromInsights should compute breadcrumbs');
  assert.equal(fromInsights.segs.length, 3);
  assert.equal(fromInsights.segs[0].label, 'Insights');
  assert.equal(fromInsights.segs[0].to, '/inventory/insights');
  assert.equal(fromInsights.segs[1].label, 'Physical Inventory');
  assert.equal(fromInsights.segs[2].label, 'Routers');
  assert.equal(fromInsights.finalLeafLabel, 'Routers');

  // 7. Inventory across the estate clicks from Location
  // 7a. Active card
  const fromLocActive = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?from=Location'
  });
  assert.ok(fromLocActive, 'fromLocActive should compute breadcrumbs');
  assert.equal(fromLocActive.segs[0].label, 'Resource Manager');
  assert.equal(fromLocActive.segs[1].label, 'Inventory');
  assert.equal(fromLocActive.segs[2].label, 'Location');
  assert.equal(fromLocActive.segs[2].to, '/inventory/location');
  assert.equal(fromLocActive.finalLeafLabel, 'Physical Resources');
  assert.ok(!fromLocActive.segs.some(s => s.label === 'Inventory insights'), 'Should not contain Inventory insights');

  // 7b. Router chip
  const fromLocRouter = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=router&drill=Router&from=Location'
  });
  assert.ok(fromLocRouter, 'fromLocRouter should compute breadcrumbs');
  assert.equal(fromLocRouter.segs[0].label, 'Resource Manager');
  assert.equal(fromLocRouter.segs[1].label, 'Inventory');
  assert.equal(fromLocRouter.segs[2].label, 'Location');
  assert.equal(fromLocRouter.segs[3].label, 'Physical Resources');
  assert.equal(fromLocRouter.finalLeafLabel, 'Router');
  assert.ok(!fromLocRouter.segs.some(s => s.label === 'Inventory insights'), 'Should not contain Inventory insights');

  // 7c. Switch chip (auto tab-derived drill)
  const fromLocSwitch = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=switch&from=Location'
  });
  assert.ok(fromLocSwitch, 'fromLocSwitch should compute breadcrumbs');
  assert.equal(fromLocSwitch.segs[0].label, 'Resource Manager');
  assert.equal(fromLocSwitch.segs[1].label, 'Inventory');
  assert.equal(fromLocSwitch.segs[2].label, 'Location');
  assert.equal(fromLocSwitch.segs[3].label, 'Physical Resources');
  assert.equal(fromLocSwitch.finalLeafLabel, 'Switch');

  // 7d. Logical card
  const fromLocLogical = Topbar.computeBreadcrumbs({
    pathname: '/inventory/virtual',
    search: '?from=Location'
  });
  assert.ok(fromLocLogical, 'fromLocLogical should compute breadcrumbs');
  assert.equal(fromLocLogical.segs[0].label, 'Resource Manager');
  assert.equal(fromLocLogical.segs[1].label, 'Inventory');
  assert.equal(fromLocLogical.segs[2].label, 'Location');
  assert.equal(fromLocLogical.finalLeafLabel, 'Virtual Resources');

  // 7e. LLDP chip
  const fromLocLldp = Topbar.computeBreadcrumbs({
    pathname: '/inventory/links',
    search: '?tab=lldp&drill=LLDP&from=Location'
  });
  assert.ok(fromLocLldp, 'fromLocLldp should compute breadcrumbs');
  assert.equal(fromLocLldp.segs[0].label, 'Resource Manager');
  assert.equal(fromLocLldp.segs[1].label, 'Inventory');
  assert.equal(fromLocLldp.segs[2].label, 'Location');
  assert.equal(fromLocLldp.segs[3].label, 'Links');
  assert.equal(fromLocLldp.finalLeafLabel, 'LLDP');

  // 7f. L3VPN chip
  const fromLocL3vpn = Topbar.computeBreadcrumbs({
    pathname: '/inventory/services',
    search: '?tab=l3vpn&drill=L3VPN&from=Location'
  });
  assert.ok(fromLocL3vpn, 'fromLocL3vpn should compute breadcrumbs');
  assert.equal(fromLocL3vpn.segs[0].label, 'Resource Manager');
  assert.equal(fromLocL3vpn.segs[1].label, 'Inventory');
  assert.equal(fromLocL3vpn.segs[2].label, 'Location');
  assert.equal(fromLocL3vpn.segs[3].label, 'Services');
  assert.equal(fromLocL3vpn.finalLeafLabel, 'L3VPN');

  // 7g. Passive card
  const fromLocPassive = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?from=Location'
  });
  assert.ok(fromLocPassive, 'fromLocPassive should compute breadcrumbs');
  assert.equal(fromLocPassive.segs[0].label, 'Resource Manager');
  assert.equal(fromLocPassive.segs[1].label, 'Inventory');
  assert.equal(fromLocPassive.segs[2].label, 'Location');
  assert.equal(fromLocPassive.finalLeafLabel, 'Passive inventory');

  // 7h. ODF chip
  const fromLocOdf = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=odf&drill=ODF&from=Location'
  });
  assert.ok(fromLocOdf, 'fromLocOdf should compute breadcrumbs');
  assert.equal(fromLocOdf.segs[0].label, 'Resource Manager');
  assert.equal(fromLocOdf.segs[1].label, 'Inventory');
  assert.equal(fromLocOdf.segs[2].label, 'Location');
  assert.equal(fromLocOdf.segs[3].label, 'Passive inventory');
  assert.equal(fromLocOdf.finalLeafLabel, 'ODF');

  // 7i. Racks chip
  const fromLocRacks = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=rack&drill=Racks&from=Location'
  });
  assert.ok(fromLocRacks, 'fromLocRacks should compute breadcrumbs');
  assert.equal(fromLocRacks.segs[0].label, 'Resource Manager');
  assert.equal(fromLocRacks.segs[1].label, 'Inventory');
  assert.equal(fromLocRacks.segs[2].label, 'Location');
  assert.equal(fromLocRacks.segs[3].label, 'Passive inventory');
  assert.equal(fromLocRacks.finalLeafLabel, 'Racks');

  // 7j. Chained: Insights -> Location -> Router
  const chainedRouter = Topbar.computeBreadcrumbs({
    pathname: '/inventory/physical',
    search: '?tab=router&drill=Router&from=Location%3Ffrom%3DInventory%2520insights'
  });
  assert.ok(chainedRouter, 'chainedRouter should compute breadcrumbs');
  assert.equal(chainedRouter.segs[0].label, 'Resource Manager');
  assert.equal(chainedRouter.segs[1].label, 'Inventory');
  assert.equal(chainedRouter.segs[2].label, 'Insights');
  assert.equal(chainedRouter.segs[3].label, 'Location');
  assert.equal(chainedRouter.segs[4].label, 'Physical Resources');
  assert.equal(chainedRouter.finalLeafLabel, 'Router');

  // 8. Site info clicks from Physical Resources and GeoMap
  // 8. Site info clicks from Physical Resources and GeoMap
  // 8a. BGLK-277 click from Physical Resources (Telecom router: Physical Resources > Site info)
  const siteInfoPhy = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277',
    search: '?id=BGLK-277&drill=KA-BGLK-277&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(siteInfoPhy, 'siteInfoPhy should compute breadcrumbs');
  assert.equal(siteInfoPhy.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteInfoPhy.segs[0].label, 'Physical Resources');
  assert.equal(siteInfoPhy.segs[1].label, 'Site info');
  assert.equal(siteInfoPhy.finalLeafLabel, 'Site info');

  // 8a-dc. VA-DC-001 click from Physical Resources (Datacenter switch: Physical Resources > Site info)
  const siteInfoPhyDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001',
    search: '?id=VA-DC-001&drill=Site+info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch&solution=Datacenter'
  });
  assert.ok(siteInfoPhyDc, 'siteInfoPhyDc should compute breadcrumbs');
  assert.equal(siteInfoPhyDc.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteInfoPhyDc.segs[0].label, 'Physical Resources');
  assert.equal(siteInfoPhyDc.segs[1].label, 'Site info');
  assert.equal(siteInfoPhyDc.finalLeafLabel, 'Site info');

  // 8a-dc-details. Site details button click from Physical Resources
  const siteDetailsPhyDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/details',
    search: '?id=VA-DC-001&drill=Site+info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch&solution=Datacenter'
  });
  assert.ok(siteDetailsPhyDc, 'siteDetailsPhyDc should compute breadcrumbs');
  assert.equal(siteDetailsPhyDc.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteDetailsPhyDc.segs[0].label, 'Physical Resources');
  assert.equal(siteDetailsPhyDc.segs[1].label, 'Site info');
  assert.equal(siteDetailsPhyDc.finalLeafLabel, 'Site info');

  // 8a-dc-equip. Site equipment button click from Physical Resources
  const siteEquipPhyDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/equipment',
    search: '?id=VA-DC-001&drill=Site+info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch&solution=Datacenter'
  });
  assert.ok(siteEquipPhyDc, 'siteEquipPhyDc should compute breadcrumbs');
  assert.equal(siteEquipPhyDc.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteEquipPhyDc.segs[0].label, 'Physical Resources');
  assert.equal(siteEquipPhyDc.segs[1].label, 'Site info');
  assert.equal(siteEquipPhyDc.finalLeafLabel, 'Site info');

  // 8a-dc-infra. Infrastructure button click from Physical Resources
  const siteInfraPhyDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/infrastructure',
    search: '?id=VA-DC-001&drill=Site+info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch&solution=Datacenter'
  });
  assert.ok(siteInfraPhyDc, 'siteInfraPhyDc should compute breadcrumbs');
  assert.equal(siteInfraPhyDc.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteInfraPhyDc.segs[0].label, 'Physical Resources');
  assert.equal(siteInfraPhyDc.segs[1].label, 'Site info');
  assert.equal(siteInfraPhyDc.finalLeafLabel, 'Site info');

  // 8b. BGLK-277 click from GeoMap (passes drill=Bagalkot)
  const siteInfoGeo = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277',
    search: '?id=BGLK-277&drill=Bagalkot&from=Insights'
  });
  assert.ok(siteInfoGeo, 'siteInfoGeo should compute breadcrumbs');
  assert.equal(siteInfoGeo.segs[0].label, 'Resource Manager');
  assert.equal(siteInfoGeo.segs[1].label, 'Inventory');
  assert.equal(siteInfoGeo.segs[2].label, 'Location');
  assert.equal(siteInfoGeo.segs[3].label, 'Bagalkot');
  assert.equal(siteInfoGeo.segs[4].label, 'BGLK-277');
  assert.equal(siteInfoGeo.finalLeafLabel, 'Site info');
  assert.equal(siteInfoGeo.segs[siteInfoGeo.segs.length - 1].label, 'Site info');

  // 8c. Site sub-tabs keep context but never allow drill to override tab leaf
  const siteDetailsSub = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277/details',
    search: '?drill=Bagalkot&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(siteDetailsSub, 'siteDetailsSub should compute breadcrumbs');
  assert.equal(siteDetailsSub.segs.length, 2, 'Should have exactly 2 segments: Physical Resources > Site info');
  assert.equal(siteDetailsSub.segs[0].label, 'Physical Resources');
  assert.equal(siteDetailsSub.segs[1].label, 'Site info');
  assert.equal(siteDetailsSub.finalLeafLabel, 'Site info');

  // 8d. Node view click with device title drill
  const nodeWithTitleDrill = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?drill=Router%20%C2%B7%20RTR-BLR-01&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter'
  });
  assert.ok(nodeWithTitleDrill, 'nodeWithTitleDrill should compute breadcrumbs');
  assert.equal(nodeWithTitleDrill.segs.length, 3, 'Should have exactly 3 segments: Physical Resources > Router > Node view');
  assert.equal(nodeWithTitleDrill.segs[0].label, 'Physical Resources');
  assert.equal(nodeWithTitleDrill.segs[1].label, 'Router');
  assert.equal(nodeWithTitleDrill.segs[2].label, 'Node view');
  assert.equal(nodeWithTitleDrill.finalLeafLabel, 'Node view');

  // 8e. Node view click drilled down from Insights in Datacenter mode
  const nodeFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/VA-DC-001-BDR-01',
    search: '?name=VA-DC-001-BDR-01&ip=172.31.40.20&site=VA-DC-001&tab=overview&cls=switch&id=VA-DC-001&solution=Datacenter&drill=Switch%20%C2%B7%20VA-DC-001-BDR-01&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(nodeFromInsightsDc, 'nodeFromInsightsDc should compute breadcrumbs');
  assert.equal(nodeFromInsightsDc.segs.length, 4, 'Should have exactly 4 segments: Insights > Physical Inventory > Switch > Node view');
  assert.equal(nodeFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(nodeFromInsightsDc.segs[0].to, '/inventory/insights');
  assert.equal(nodeFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.ok(nodeFromInsightsDc.segs[1].to.includes('/inventory/resources/physical'));
  assert.equal(nodeFromInsightsDc.segs[2].label, 'Switch');
  assert.ok(nodeFromInsightsDc.segs[2].to.includes('cls=switch'));
  assert.equal(nodeFromInsightsDc.segs[3].label, 'Node view');
  assert.equal(nodeFromInsightsDc.segs[3].to, null);
  assert.equal(nodeFromInsightsDc.finalLeafLabel, 'Node view');

  // 8f. Node view click drilled down from Insights in Telecom mode
  const nodeFromInsightsTelecom = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?name=RTR-BLR-01&ip=10.0.0.1&site=BLR-DC-01&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter%26from%3DInventory%2520insights'
  });
  assert.ok(nodeFromInsightsTelecom, 'nodeFromInsightsTelecom should compute breadcrumbs');
  assert.equal(nodeFromInsightsTelecom.segs.length, 4, 'Should have exactly 4 segments: Insights > Physical Inventory > Router > Node view');
  assert.equal(nodeFromInsightsTelecom.segs[0].label, 'Insights');
  assert.equal(nodeFromInsightsTelecom.segs[0].to, '/inventory/insights');
  assert.equal(nodeFromInsightsTelecom.segs[1].label, 'Physical Inventory');
  assert.ok(nodeFromInsightsTelecom.segs[1].to.includes('/inventory/physical'));
  assert.equal(nodeFromInsightsTelecom.segs[2].label, 'Router');
  assert.ok(nodeFromInsightsTelecom.segs[2].to.includes('cls=router'));
  assert.equal(nodeFromInsightsTelecom.segs[3].label, 'Node view');
  assert.equal(nodeFromInsightsTelecom.segs[3].to, null);
  assert.equal(nodeFromInsightsTelecom.finalLeafLabel, 'Node view');

  // 8g. Site info click drilled down from Insights in Datacenter mode
  const siteFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001',
    search: '?id=VA-DC-001&cls=switch&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(siteFromInsightsDc, 'siteFromInsightsDc should compute breadcrumbs');
  assert.equal(siteFromInsightsDc.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > Site info');
  assert.equal(siteFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(siteFromInsightsDc.segs[0].to, '/inventory/insights');
  assert.equal(siteFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.ok(siteFromInsightsDc.segs[1].to.includes('/inventory/resources/physical'));
  assert.equal(siteFromInsightsDc.segs[2].label, 'Site info');
  assert.equal(siteFromInsightsDc.segs[2].to, null);
  assert.equal(siteFromInsightsDc.finalLeafLabel, 'Site info');

  // 8h. Site info click drilled down from Insights in Telecom mode
  const siteFromInsightsTelecom = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277',
    search: '?id=BGLK-277&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter%26from%3DInventory%2520insights'
  });
  assert.ok(siteFromInsightsTelecom, 'siteFromInsightsTelecom should compute breadcrumbs');
  assert.equal(siteFromInsightsTelecom.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > Site info');
  assert.equal(siteFromInsightsTelecom.segs[0].label, 'Insights');
  assert.equal(siteFromInsightsTelecom.segs[0].to, '/inventory/insights');
  assert.equal(siteFromInsightsTelecom.segs[1].label, 'Physical Inventory');
  assert.ok(siteFromInsightsTelecom.segs[1].to.includes('/inventory/physical'));
  assert.equal(siteFromInsightsTelecom.segs[2].label, 'Site info');
  assert.equal(siteFromInsightsTelecom.segs[2].to, null);
  assert.equal(siteFromInsightsTelecom.finalLeafLabel, 'Site info');

  // 8i. Site equipment sub-route click from Insights in Datacenter mode (3 clean segments, no extra siteId segment)
  const siteEquipFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/equipment',
    search: '?id=VA-DC-001&cls=switch&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(siteEquipFromInsightsDc, 'siteEquipFromInsightsDc should compute breadcrumbs');
  assert.equal(siteEquipFromInsightsDc.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > Site equipment');
  assert.equal(siteEquipFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(siteEquipFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.equal(siteEquipFromInsightsDc.segs[2].label, 'Site equipment');
  assert.equal(siteEquipFromInsightsDc.segs[2].to, null);
  assert.equal(siteEquipFromInsightsDc.finalLeafLabel, 'Site equipment');

  // 8i-2. Site details sub-route click from Insights in Datacenter mode (stays Site info)
  const siteDetailsFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/details',
    search: '?id=VA-DC-001&solution=Datacenter&drill=Site%20info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dserver%26from%3DInventory%2520insights'
  });
  assert.ok(siteDetailsFromInsightsDc, 'siteDetailsFromInsightsDc should compute breadcrumbs');
  assert.equal(siteDetailsFromInsightsDc.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > Site info');
  assert.equal(siteDetailsFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(siteDetailsFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.equal(siteDetailsFromInsightsDc.segs[2].label, 'Site info');
  assert.equal(siteDetailsFromInsightsDc.finalLeafLabel, 'Site info');

  // 8i-3. Site infrastructure sub-route click from Insights in Datacenter mode (stays Site info)
  const siteInfraFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/VA-DC-001/infrastructure',
    search: '?id=VA-DC-001&solution=Datacenter&drill=Site%20info&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dserver%26from%3DInventory%2520insights'
  });
  assert.ok(siteInfraFromInsightsDc, 'siteInfraFromInsightsDc should compute breadcrumbs');
  assert.equal(siteInfraFromInsightsDc.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > Site info');
  assert.equal(siteInfraFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(siteInfraFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.equal(siteInfraFromInsightsDc.segs[2].label, 'Site info');
  assert.equal(siteInfraFromInsightsDc.finalLeafLabel, 'Site info');

  // 8j. View rack click from Insights in Datacenter mode
  const rackFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=rack&dc=VA-DC-001&rack=RACK-A&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(rackFromInsightsDc, 'rackFromInsightsDc should compute breadcrumbs');
  assert.equal(rackFromInsightsDc.segs.length, 3, 'Should have exactly 3 segments: Insights > Physical Inventory > View rack');
  assert.equal(rackFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(rackFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.equal(rackFromInsightsDc.segs[2].label, 'View rack');
  assert.equal(rackFromInsightsDc.segs[2].to, null);
  assert.equal(rackFromInsightsDc.finalLeafLabel, 'View rack');

  // 8k. Direct View details click from Insights in Datacenter mode
  const viewDetailsFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/VA-DC-001-BDR-01',
    search: '?ip=172.31.40.20&cls=switch&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(viewDetailsFromInsightsDc, 'viewDetailsFromInsightsDc should compute breadcrumbs');
  assert.equal(viewDetailsFromInsightsDc.segs.length, 4, 'Should have 4 segments: Insights > Physical Inventory > Switch > VA-DC-001-BDR-01');
  assert.equal(viewDetailsFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(viewDetailsFromInsightsDc.segs[0].to, '/inventory/insights');
  assert.equal(viewDetailsFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.ok(viewDetailsFromInsightsDc.segs[1].to.includes('/inventory/resources/physical'));
  assert.equal(viewDetailsFromInsightsDc.segs[2].label, 'Switch');
  assert.equal(viewDetailsFromInsightsDc.segs[3].label, 'VA-DC-001-BDR-01');
  assert.equal(viewDetailsFromInsightsDc.segs[3].to, null);
  assert.equal(viewDetailsFromInsightsDc.finalLeafLabel, 'VA-DC-001-BDR-01');

  // 8l. Direct View details click from Insights in Telecom mode
  const viewDetailsFromInsightsTelecom = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/RTR-BLR-01',
    search: '?ip=10.0.0.1&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Drouter%26from%3DInventory%2520insights'
  });
  assert.ok(viewDetailsFromInsightsTelecom, 'viewDetailsFromInsightsTelecom should compute breadcrumbs');
  assert.equal(viewDetailsFromInsightsTelecom.segs.length, 4, 'Should have 4 segments: Insights > Physical Inventory > Router > RTR-BLR-01');
  assert.equal(viewDetailsFromInsightsTelecom.segs[0].label, 'Insights');
  assert.equal(viewDetailsFromInsightsTelecom.segs[0].to, '/inventory/insights');
  assert.equal(viewDetailsFromInsightsTelecom.segs[1].label, 'Physical Inventory');
  assert.ok(viewDetailsFromInsightsTelecom.segs[1].to.includes('/inventory/physical'));
  assert.equal(viewDetailsFromInsightsTelecom.segs[2].label, 'Router');
  assert.equal(viewDetailsFromInsightsTelecom.segs[3].label, 'RTR-BLR-01');
  assert.equal(viewDetailsFromInsightsTelecom.segs[3].to, null);
  assert.equal(viewDetailsFromInsightsTelecom.finalLeafLabel, 'RTR-BLR-01');

  // 8m. Node view -> Node resources click from Insights in Datacenter mode
  const nodeResourcesFromInsightsDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/VA-DC-001-BDR-01',
    search: '?name=VA-DC-001-BDR-01&ip=172.31.40.20&site=VA-DC-001&cls=switch&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%20%C2%B7%20Node%20view%3Fcls%3Dswitch%26from%3DInventory%2520insights'
  });
  assert.ok(nodeResourcesFromInsightsDc, 'nodeResourcesFromInsightsDc should compute breadcrumbs');
  assert.equal(nodeResourcesFromInsightsDc.segs.length, 5, 'Should have 5 segments: Insights > Physical Inventory > Switch > Node view > Node resources');
  assert.equal(nodeResourcesFromInsightsDc.segs[0].label, 'Insights');
  assert.equal(nodeResourcesFromInsightsDc.segs[0].to, '/inventory/insights');
  assert.equal(nodeResourcesFromInsightsDc.segs[1].label, 'Physical Inventory');
  assert.ok(nodeResourcesFromInsightsDc.segs[1].to.includes('/inventory/resources/physical'));
  assert.equal(nodeResourcesFromInsightsDc.segs[2].label, 'Switch');
  assert.equal(nodeResourcesFromInsightsDc.segs[3].label, 'Node view');
  assert.ok(nodeResourcesFromInsightsDc.segs[3].to.includes('/inventory/node/VA-DC-001-BDR-01'));
  assert.equal(nodeResourcesFromInsightsDc.segs[4].label, 'Node resources');
  assert.equal(nodeResourcesFromInsightsDc.segs[4].to, null);
  assert.equal(nodeResourcesFromInsightsDc.finalLeafLabel, 'Node resources');

  // 8n. Node view -> Node resources click from Insights in Telecom mode
  const nodeResourcesFromInsightsTelecom = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/RTR-BLR-01',
    search: '?name=RTR-BLR-01&ip=10.0.0.1&site=BLR-DC-01&cls=router&from=Resources%20%C2%B7%20Physical%20Resources%20%C2%B7%20Node%20view%3Fcls%3Drouter%26from%3DInventory%2520insights'
  });
  assert.ok(nodeResourcesFromInsightsTelecom, 'nodeResourcesFromInsightsTelecom should compute breadcrumbs');
  assert.equal(nodeResourcesFromInsightsTelecom.segs.length, 5, 'Should have 5 segments: Insights > Physical Inventory > Router > Node view > Node resources');
  assert.equal(nodeResourcesFromInsightsTelecom.segs[0].label, 'Insights');
  assert.equal(nodeResourcesFromInsightsTelecom.segs[0].to, '/inventory/insights');
  assert.equal(nodeResourcesFromInsightsTelecom.segs[1].label, 'Physical Inventory');
  assert.ok(nodeResourcesFromInsightsTelecom.segs[1].to.includes('/inventory/physical'));
  assert.equal(nodeResourcesFromInsightsTelecom.segs[2].label, 'Router');
  assert.equal(nodeResourcesFromInsightsTelecom.segs[3].label, 'Node view');
  assert.ok(nodeResourcesFromInsightsTelecom.segs[3].to.includes('/inventory/node/RTR-BLR-01'));
  assert.equal(nodeResourcesFromInsightsTelecom.segs[4].label, 'Node resources');
  assert.equal(nodeResourcesFromInsightsTelecom.segs[4].to, null);
  assert.equal(nodeResourcesFromInsightsTelecom.finalLeafLabel, 'Node resources');

  // 8o. View rack click from sidebar Physical Resources (no Insights)
  const rackFromSidebarPhy = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=rack&dc=VA-DC-001&rack=RACK-A&solution=Datacenter&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch'
  });
  assert.ok(rackFromSidebarPhy, 'rackFromSidebarPhy should compute breadcrumbs');
  assert.equal(rackFromSidebarPhy.segs[0].label, 'Resource Manager');
  assert.equal(rackFromSidebarPhy.segs[1].label, 'Inventory');
  assert.equal(rackFromSidebarPhy.segs[2].label, 'Physical Resources');
  assert.equal(rackFromSidebarPhy.segs[3].label, 'Passive inventory');
  assert.equal(rackFromSidebarPhy.segs[4].label, 'View rack');
  assert.equal(rackFromSidebarPhy.finalLeafLabel, 'View rack');

  // 8p. Node view click from Location (Telecom) -> Location > Switch > Node view
  const nodeFromLocationTelecom = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/SW-BLR-01',
    search: '?site=BGLK-277&cls=switch&from=Location'
  });
  assert.ok(nodeFromLocationTelecom, 'nodeFromLocationTelecom should compute breadcrumbs');
  assert.equal(nodeFromLocationTelecom.segs.length, 3, 'Should have exactly 3 segments: Location > Switch > Node view');
  assert.equal(nodeFromLocationTelecom.segs[0].label, 'Location');
  assert.ok(nodeFromLocationTelecom.segs[0].to.includes('/inventory/location'));
  assert.equal(nodeFromLocationTelecom.segs[1].label, 'Switch');
  assert.ok(nodeFromLocationTelecom.segs[1].to.includes('/inventory/location/site/BGLK-277'));
  assert.ok(nodeFromLocationTelecom.segs[1].to.includes('tab=switch'));
  assert.equal(nodeFromLocationTelecom.segs[2].label, 'Node view');
  assert.equal(nodeFromLocationTelecom.segs[2].to, null);
  assert.equal(nodeFromLocationTelecom.finalLeafLabel, 'Node view');

  // 8q. Node view from Location with tab click (e.g. Interfaces tab) -> breadcrumb must NOT add tab!
  const nodeFromLocationIfaces = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/SW-BLR-01',
    search: '?site=BGLK-277&cls=switch&tab=ifaces&from=Location'
  });
  assert.ok(nodeFromLocationIfaces, 'nodeFromLocationIfaces should compute breadcrumbs');
  assert.equal(nodeFromLocationIfaces.segs.length, 3, 'Tab click must NOT add tab level to breadcrumbs');
  assert.equal(nodeFromLocationIfaces.segs[0].label, 'Location');
  assert.equal(nodeFromLocationIfaces.segs[1].label, 'Switch');
  assert.equal(nodeFromLocationIfaces.segs[2].label, 'Node view');
  assert.equal(nodeFromLocationIfaces.finalLeafLabel, 'Node view');

  // 8r. Node view from Location in Datacenter mode
  const nodeFromLocationDc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/VA-DC-001-BDR-01',
    search: '?site=VA-DC-001&cls=switch&solution=Datacenter&from=Location'
  });
  assert.ok(nodeFromLocationDc, 'nodeFromLocationDc should compute breadcrumbs');
  assert.equal(nodeFromLocationDc.segs.length, 3, 'Should have 3 segments: Location > Switch > Node view');
  assert.equal(nodeFromLocationDc.segs[0].label, 'Location');
  assert.ok(nodeFromLocationDc.segs[0].to.includes('solution=Datacenter'));
  assert.equal(nodeFromLocationDc.segs[1].label, 'Switch');
  assert.ok(nodeFromLocationDc.segs[1].to.includes('solution=Datacenter'));
  assert.equal(nodeFromLocationDc.segs[2].label, 'Node view');
  assert.equal(nodeFromLocationDc.finalLeafLabel, 'Node view');

  // 8s. Node view -> Node resources button click from Location
  const nodeResFromLocation = Topbar.computeBreadcrumbs({
    pathname: '/inventory/resource/SW-BLR-01',
    search: '?name=SW-BLR-01&site=BGLK-277&cls=switch&from=Location%20%C2%B7%20Site%20details%20%C2%B7%20Node%20view'
  });
  assert.ok(nodeResFromLocation, 'nodeResFromLocation should compute breadcrumbs');
  assert.equal(nodeResFromLocation.segs.length, 4, 'Should have 4 segments: Location > Switch > Node view > Node resources');
  assert.equal(nodeResFromLocation.segs[0].label, 'Location');
  assert.equal(nodeResFromLocation.segs[1].label, 'Switch');
  assert.equal(nodeResFromLocation.segs[2].label, 'Node view');
  assert.ok(nodeResFromLocation.segs[2].to.includes('/inventory/node/SW-BLR-01'));
  assert.equal(nodeResFromLocation.segs[3].label, 'Node resources');
  assert.equal(nodeResFromLocation.segs[3].to, null);
  assert.equal(nodeResFromLocation.finalLeafLabel, 'Node resources');

  // 8t. Node view from Location with tab=ifaces and omitted cls -> Location > Switch > Node view
  const nodeLocIfacesNoCls = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/SW-BLR-01',
    search: '?site=BGLK-277&tab=ifaces&from=Location'
  });
  assert.ok(nodeLocIfacesNoCls, 'nodeLocIfacesNoCls should compute breadcrumbs');
  assert.equal(nodeLocIfacesNoCls.segs.length, 3, 'Should have exactly 3 segments: Location > Switch > Node view');
  assert.equal(nodeLocIfacesNoCls.segs[0].label, 'Location');
  assert.equal(nodeLocIfacesNoCls.segs[1].label, 'Switch', 'Subtab "ifaces" must not leak as class label');
  assert.equal(nodeLocIfacesNoCls.segs[2].label, 'Node view');
  assert.equal(nodeLocIfacesNoCls.finalLeafLabel, 'Node view');

  // 8u. Node view from Location with tab=protocols and omitted cls -> Location > Router > Node view
  const nodeLocProtocolsNoCls = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/RTR-BLR-01',
    search: '?site=BGLK-277&tab=protocols&from=Location'
  });
  assert.ok(nodeLocProtocolsNoCls, 'nodeLocProtocolsNoCls should compute breadcrumbs');
  assert.equal(nodeLocProtocolsNoCls.segs.length, 3, 'Should have exactly 3 segments: Location > Router > Node view');
  assert.equal(nodeLocProtocolsNoCls.segs[0].label, 'Location');
  assert.equal(nodeLocProtocolsNoCls.segs[1].label, 'Router', 'Subtab "protocols" must not leak as class label');
  assert.equal(nodeLocProtocolsNoCls.segs[2].label, 'Node view');
  assert.equal(nodeLocProtocolsNoCls.finalLeafLabel, 'Node view');

  // 8v. Node view from Physical Resources with tab=hardware and omitted cls -> Physical Resources > Switch > Node view
  const nodePhyHardwareNoCls = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/SW-BLR-01',
    search: '?tab=hardware&from=Resources%20%C2%B7%20Physical%20Resources'
  });
  assert.ok(nodePhyHardwareNoCls, 'nodePhyHardwareNoCls should compute breadcrumbs');
  assert.equal(nodePhyHardwareNoCls.segs.length, 3, 'Should have 3 segments: Physical Resources > Switch > Node view');
  assert.equal(nodePhyHardwareNoCls.segs[0].label, 'Physical Resources');
  assert.equal(nodePhyHardwareNoCls.segs[1].label, 'Switch', 'Subtab "hardware" must not leak as class label');
  assert.equal(nodePhyHardwareNoCls.segs[2].label, 'Node view');
  assert.equal(nodePhyHardwareNoCls.finalLeafLabel, 'Node view');

  // 8w. Node view from Insights with tab=alerts and omitted cls -> Insights > Physical Inventory > Switch > Node view
  const nodeInsightsAlertsNoCls = Topbar.computeBreadcrumbs({
    pathname: '/inventory/node/SW-BLR-01',
    search: '?tab=alerts&from=Resources%20%C2%B7%20Physical%20Resources%3Ffrom%3DInventory%2520insights'
  });
  assert.ok(nodeInsightsAlertsNoCls, 'nodeInsightsAlertsNoCls should compute breadcrumbs');
  assert.equal(nodeInsightsAlertsNoCls.segs.length, 4, 'Should have 4 segments: Insights > Physical Inventory > Switch > Node view');
  assert.equal(nodeInsightsAlertsNoCls.segs[0].label, 'Insights');
  assert.equal(nodeInsightsAlertsNoCls.segs[1].label, 'Physical Inventory');
  assert.equal(nodeInsightsAlertsNoCls.segs[2].label, 'Switch', 'Subtab "alerts" must not leak as class label');
  assert.equal(nodeInsightsAlertsNoCls.segs[3].label, 'Node view');
  assert.equal(nodeInsightsAlertsNoCls.finalLeafLabel, 'Node view');

  // 8x. View rack with explicit drill=View rack
  const rackWithDrill = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive',
    search: '?tab=rack&dc=VA-DC-001&rack=RACK-A&drill=View%20rack&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch'
  });
  assert.ok(rackWithDrill, 'rackWithDrill should compute breadcrumbs');
  assert.equal(rackWithDrill.finalLeafLabel, 'View rack');
  assert.equal(rackWithDrill.segs[rackWithDrill.segs.length - 1].label, 'View rack');

  // 8y. View rack detail screen from Physical Resources
  const rackDetailViewRack = Topbar.computeBreadcrumbs({
    pathname: '/inventory/passive/rack/RACK-A',
    search: '?drill=View%20rack&from=Resources%20%C2%B7%20Physical%20Resources%3Fcls%3Dswitch'
  });
  assert.ok(rackDetailViewRack, 'rackDetailViewRack should compute breadcrumbs');
  assert.equal(rackDetailViewRack.finalLeafLabel, 'View rack');

  // 8z. Normal site browsing from Location (no action drill, no from) -> should remain Network elements
  const normalSiteLoc = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277',
    search: '?id=BGLK-277'
  });
  assert.ok(normalSiteLoc, 'normalSiteLoc should compute breadcrumbs');
  assert.equal(normalSiteLoc.finalLeafLabel, 'Network elements');
  assert.equal(normalSiteLoc.segs[normalSiteLoc.segs.length - 1].label, 'Network elements');

  // 8aa. Explicit drill=Site info on site
  const siteExplicitDrill = Topbar.computeBreadcrumbs({
    pathname: '/inventory/location/site/BGLK-277',
    search: '?id=BGLK-277&drill=Site%20info'
  });
  assert.ok(siteExplicitDrill, 'siteExplicitDrill should compute breadcrumbs');
  assert.equal(siteExplicitDrill.finalLeafLabel, 'Site info');
  assert.equal(siteExplicitDrill.segs[siteExplicitDrill.segs.length - 1].label, 'Site info');

  await closeLoader();
});
