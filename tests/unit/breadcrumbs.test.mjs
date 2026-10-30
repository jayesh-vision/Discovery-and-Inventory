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

  await closeLoader();
});
