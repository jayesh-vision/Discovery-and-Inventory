import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

test('Passive inventory import parsing, dialog modal, and template downloads for all tabs', async () => {
  const legacySrc = readFileSync(join(root, 'public', 'legacy.js'), 'utf8');

  // Verify legacy bundle contains the passive import modal and hooks
  assert.ok(legacySrc.includes('data-passive-import-btn'), 'legacy.js should include import button attribute');
  assert.ok(legacySrc.includes('renderPassiveImportModal'), 'legacy.js should include renderPassiveImportModal');
  assert.ok(legacySrc.includes('downloadPassiveTemplate'), 'legacy.js should include downloadPassiveTemplate');
  assert.ok(legacySrc.includes('PASSIVE_TEMPLATES'), 'legacy.js should include PASSIVE_TEMPLATES');
  assert.ok(legacySrc.includes('data-close-passive-modal'), 'legacy.js should include close modal attribute');
  assert.ok(legacySrc.includes('data-submit-passive-upload'), 'legacy.js should include submit upload attribute');
  assert.ok(legacySrc.includes('data-download-template'), 'legacy.js should include download template attribute');
  assert.ok(legacySrc.includes('passive-dropzone'), 'legacy.js should include passive-dropzone');
  assert.ok(legacySrc.includes('File uploaded successfully!'), 'legacy.js should include success banner message');

  // Test CSV parser logic
  const sampleCsv = `\uFEFFStatus,Span,A end,B end,Length,Cores used,Splices,Last OTDR,Attenuation,Ownership
In service,FS-TEST-001,SITE-A ODF-01,SITE-B ODF-02,"42,180 m",24 / 96,14,12-Jun-2026,0.21 dB/km,Own
Degraded,FS-TEST-002,SITE-C ODF-01,SITE-D ODF-01,15000 m,12 / 48,8,04-Mar-2026,0.45 dB/km,Leased`;

  const appResSrc = readFileSync(join(root, 'legacy', 'app-res.js'), 'utf8');
  const startIdx = appResSrc.indexOf('function parsePassiveCsv(');
  const endIdx = appResSrc.indexOf('async function handlePassiveFileUpload(');
  assert.ok(startIdx !== -1 && endIdx !== -1, 'Should find parser functions in app-res.js');

  const helpersCode = appResSrc.slice(startIdx, endIdx);
  const helpers = new Function(`
    ${helpersCode}
    return {
      parsePassiveCsv,
      parsePassiveXmlSpreadsheet,
      mapPassiveImportRows
    };
  `)();

  const parsedCsv = helpers.parsePassiveCsv(sampleCsv);
  assert.equal(parsedCsv.length, 3, 'Should have header + 2 data rows');
  assert.deepEqual(parsedCsv[0], ['Status', 'Span', 'A end', 'B end', 'Length', 'Cores used', 'Splices', 'Last OTDR', 'Attenuation', 'Ownership']);
  assert.equal(parsedCsv[1][4], '42,180 m', 'Quoted comma length preserved');

  // Test fiber tab mapping
  const mappedFiber = helpers.mapPassiveImportRows('fiber', parsedCsv[0], parsedCsv.slice(1));
  assert.equal(mappedFiber.length, 2);
  assert.equal(mappedFiber[0].n, 'FS-TEST-001');
  assert.equal(mappedFiber[0].st, 'In service');
  assert.equal(mappedFiber[0].chip, 'success');
  assert.equal(mappedFiber[0].a, 'SITE-A ODF-01');
  assert.equal(mappedFiber[0].b, 'SITE-B ODF-02');
  assert.equal(mappedFiber[0].len, '42,180 m');
  assert.equal(mappedFiber[0].cores, '24 / 96');
  assert.equal(mappedFiber[0].splices, 14);
  assert.equal(mappedFiber[0].otdr, '12-Jun-2026');
  assert.equal(mappedFiber[0].att, '0.21 dB/km');
  assert.equal(mappedFiber[0].own, 'Own');

  assert.equal(mappedFiber[1].n, 'FS-TEST-002');
  assert.equal(mappedFiber[1].st, 'Degraded');
  assert.equal(mappedFiber[1].chip, 'warning');
  assert.equal(mappedFiber[1].own, 'Leased');

  // Test ODF tab mapping
  const odfHeaders = ['Status', 'ODF', 'Site', 'Type', 'Capacity', 'Used', 'Free', 'Fill', 'Rack position', 'Termination'];
  const odfRows = [
    ['In service', 'ODF-TEST-01', 'DEL-279', 'Rack mount 144F', '144', '96', '48', '67%', 'RACK-03', 'SC/APC']
  ];
  const mappedOdf = helpers.mapPassiveImportRows('odf', odfHeaders, odfRows);
  assert.equal(mappedOdf.length, 1);
  assert.equal(mappedOdf[0].n, 'ODF-TEST-01');
  assert.equal(mappedOdf[0].site, 'DEL-279');
  assert.equal(mappedOdf[0].type, 'Rack mount 144F');
  assert.equal(mappedOdf[0].cap, 144);
  assert.equal(mappedOdf[0].used, 96);
  assert.equal(mappedOdf[0].rack, 'RACK-03');
  assert.equal(mappedOdf[0].term, 'SC/APC');

  // Test Rack tab mapping
  const rackHeaders = ['Status', 'Rack', 'Site', 'Height', 'U used', 'U free', 'Elevation', 'Power', 'Cooling'];
  const rackRows = [
    ['In service', 'RACK-TEST-01', 'DEL-279', '42U', '28', '14', '—', '3.5 / 8.0 kW', 'Front-to-back']
  ];
  const mappedRack = helpers.mapPassiveImportRows('rack', rackHeaders, rackRows);
  assert.equal(mappedRack.length, 1);
  assert.equal(mappedRack[0].n, 'RACK-TEST-01');
  assert.equal(mappedRack[0].site, 'DEL-279');
  assert.equal(mappedRack[0].h, 42);
  assert.equal(mappedRack[0].used, 28);
  assert.equal(mappedRack[0].kw, '3.5 / 8.0 kW');
  assert.equal(mappedRack[0].cool, 'Front-to-back');

  // Test Power tab mapping
  const powerHeaders = ['Status', 'Unit', 'Site', 'Type', 'Rating', 'Autonomy', 'Last tested', 'Vendor'];
  const powerRows = [
    ['In service', 'DG-TEST-01', 'DEL-279', 'DG set', '500 kVA', '8 h', '20-Oct-2026', 'Cummins']
  ];
  const mappedPower = helpers.mapPassiveImportRows('power', powerHeaders, powerRows);
  assert.equal(mappedPower.length, 1);
  assert.equal(mappedPower[0].n, 'DG-TEST-01');
  assert.equal(mappedPower[0].site, 'DEL-279');
  assert.equal(mappedPower[0].type, 'DG set');
  assert.equal(mappedPower[0].rating, '500 kVA');
  assert.equal(mappedPower[0].runtime, '8 h');
  assert.equal(mappedPower[0].tested, '20-Oct-2026');
  assert.equal(mappedPower[0].vendor, 'Cummins');

  // Test Patch cord tab mapping
  const cordHeaders = ['Status', 'Patch cord', 'Site', 'A end', 'B end', 'Connector', 'Length', 'Insertion loss', 'Last surveyed'];
  const cordRows = [
    ['In service', 'PC-TEST-01', 'DEL-279', 'ODF-01 P1', 'SW-01 P24', 'LC-LC duplex', '3 m', '0.12 dB', '14-Sep-2026']
  ];
  const mappedCord = helpers.mapPassiveImportRows('cord', cordHeaders, cordRows);
  assert.equal(mappedCord.length, 1);
  assert.equal(mappedCord[0].n, 'PC-TEST-01');
  assert.equal(mappedCord[0].site, 'DEL-279');
  assert.equal(mappedCord[0].a, 'ODF-01 P1');
  assert.equal(mappedCord[0].b, 'SW-01 P24');
  assert.equal(mappedCord[0].type, 'LC-LC duplex');
  assert.equal(mappedCord[0].len, '3 m');
  assert.equal(mappedCord[0].loss, '0.12 dB');
  assert.equal(mappedCord[0].surveyed, '14-Sep-2026');

  // Test Ducts tab mapping
  const ductHeaders = ['Status', 'Duct', 'A end', 'B end', 'Length', 'Ways used', 'Bore', 'Ownership', 'Last surveyed'];
  const ductRows = [
    ['In service', 'DT-TEST-01', 'DEL-279 MH-01', 'DEL-279 MH-02', '120 m', '3 / 4', '110 mm', 'Own', '18-Aug-2026']
  ];
  const mappedDuct = helpers.mapPassiveImportRows('duct', ductHeaders, ductRows);
  assert.equal(mappedDuct.length, 1);
  assert.equal(mappedDuct[0].n, 'DT-TEST-01');
  assert.equal(mappedDuct[0].a, 'DEL-279 MH-01');
  assert.equal(mappedDuct[0].b, 'DEL-279 MH-02');
  assert.equal(mappedDuct[0].len, '120 m');
  assert.equal(mappedDuct[0].ways, '3 / 4');
  assert.equal(mappedDuct[0].bore, '110 mm');
  assert.equal(mappedDuct[0].own, 'Own');
  assert.equal(mappedDuct[0].surveyed, '18-Aug-2026');

  // Verify modal dialog generator has all required components
  const modalStart = appResSrc.indexOf('function renderPassiveImportModal(');
  const modalEnd = appResSrc.indexOf('function triggerPassiveImport()');
  assert.ok(modalStart !== -1 && modalEnd !== -1, 'renderPassiveImportModal should be defined');

  const modalFnCode = appResSrc.slice(modalStart, modalEnd);
  const renderModal = new Function(`
    function passScoped() { return false; }
    const PASSIVE_DC_ORDER = ['fiber', 'odf', 'rack', 'power', 'splice', 'cord', 'duct'];
    const PASSIVE_TABS = [
      { k: 'fiber', n: 'Fiber spans' },
      { k: 'odf', n: 'ODF' },
      { k: 'rack', n: 'Racks' },
      { k: 'power', n: 'Power plant' },
      { k: 'splice', n: 'Splice closures' },
      { k: 'cord', n: 'Patch cords' },
      { k: 'duct', n: 'Ducts' }
    ];
    const PASSIVE_NEW_TABS = [];
    let PASSIVE_SELECTED_FILE = null;
    function escPassive(s) { return String(s || ''); }
    ${modalFnCode}
    return renderPassiveImportModal;
  `)();

  const modalHtml = renderModal('fiber');
  // 1. Dialogue box container
  assert.ok(modalHtml.includes('job-modal-panel'), 'Modal panel container should exist');
  assert.ok(modalHtml.includes('id="passive-import-scrim"'), 'Modal scrim should exist');
  // 2. Upper right side cross button
  assert.ok(modalHtml.includes('job-modal-close-btn') && modalHtml.includes('data-close-passive-modal="1"'), 'Upper right close button should exist');
  // 3. Simple Download Template button present without theory/explanatory paragraphs
  assert.ok(modalHtml.includes('data-download-template="fiber|xlsx"'), 'Download template button should exist');
  assert.ok(modalHtml.includes('Download Template'), 'Download Template text should be present');
  assert.ok(!modalHtml.includes('Sample Template'), 'Sample template theory box should be removed from modal');
  assert.ok(!modalHtml.includes('formatted columns'), 'No theory text about formatted columns');
  assert.ok(!modalHtml.includes('edit with your data'), 'No theory text about edit with your data');
  // 4. File upload dropzone
  assert.ok(modalHtml.includes('id="passive-dropzone"'), 'File dropzone should exist');
  assert.ok(modalHtml.includes('id="passive-modal-file-input"'), 'File input should exist');
  // 5. Upload & Cancel buttons in footer
  assert.ok(modalHtml.includes('data-submit-passive-upload="1"'), 'Upload button should exist');
  assert.ok(modalHtml.includes('data-close-passive-modal="1"'), 'Cancel button should exist in footer');

  // Verify fuzzy header matching and positional fallback for racks so "No valid rack records found" never happens
  const customRackHeaders = ['Status', 'Rack Name', 'Site / DC', 'Total Height', 'Occupied U', 'Free U'];
  const customRackRows = [
    ['In service', 'RACK-BGLK-099', 'BGLK-277', '48U', '24', '24']
  ];
  const mappedCustom = helpers.mapPassiveImportRows('rack', customRackHeaders, customRackRows);
  assert.equal(mappedCustom.length, 1, 'Should map rack records even with custom Rack Name header');
  assert.equal(mappedCustom[0].n, 'RACK-BGLK-099');
  assert.equal(mappedCustom[0].site, 'BGLK-277');
  assert.equal(mappedCustom[0].h, 48);
  assert.equal(mappedCustom[0].used, 24);

  // Positional fallback when headers are completely different / unmapped
  const unmappedHeaders = ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'];
  const unmappedRows = [
    ['In service', 'RACK-FALLBACK-101', 'DEL-279', '42', '10']
  ];
  const mappedPositional = helpers.mapPassiveImportRows('rack', unmappedHeaders, unmappedRows);
  assert.equal(mappedPositional.length, 1, 'Should map rack record by position');
  assert.equal(mappedPositional[0].n, 'RACK-FALLBACK-101');
  assert.equal(mappedPositional[0].site, 'DEL-279');

  // Verify import button is inside 3-dot menu only, not standalone in header
  assert.ok(legacySrc.includes('kmenu-i" data-passive-import-btn="1"'), 'Import button should be inside 3-dot kebab menu');
  assert.ok(!legacySrc.includes('nst-btn--sm" data-passive-import-btn="1"'), 'Standalone import button should be removed from header');

  // Verify template data covers all tabs
  const templatesMatch = appResSrc.match(/const PASSIVE_TEMPLATES = (\{[\s\S]+?\n\};)/);
  assert.ok(templatesMatch, 'PASSIVE_TEMPLATES should be found');
  const templates = new Function(`return ${templatesMatch[1]}`)();
  const allTabs = ['fiber', 'odf', 'rack', 'power', 'splice', 'cord', 'duct', 'cooling', 'sensors'];
  for (const t of allTabs) {
    assert.ok(templates[t], `Template for ${t} should exist`);
    assert.ok(templates[t].headers.length >= 7, `Template for ${t} should have headers`);
    assert.ok(templates[t].rows.length >= 1, `Template for ${t} should have sample rows`);
  }
});
