import assert from 'node:assert';
import { loadModule, closeLoader } from './unit/load.mjs';

const { getDcInsightsData } = await loadModule('/src/data/inventoryInsightsDynamic.ts');
const { dcSumList } = await loadModule('/src/data/dc/scope.ts');

console.log('--- Testing Data Center Insights Mathematical Reconciliation & Drill-down Routing ---');

const dcData = getDcInsightsData('us');
const r = '30d';

// 1. Top Metric Cards vs. "What Exists" Breakdown
const total = dcData.TOTAL[r];
console.log(`Checking Total Inventory Records (Card 1): ${total.totalDisplay} == 16,497 (Physical 3,839 + Connectivity & Virtual 12,658)`);
assert.strictEqual(total.totalDisplay, '16,497', 'Total records must display 16,497 matching Card 2 + Card 3');

const bShare = dcData.BUCKET[r].rows;
const activeCount = parseInt(bShare.find(b => b[0] === 'Active')[1].replace(/,/g, ''), 10);
const passiveCount = parseInt(bShare.find(b => b[0] === 'Passive')[1].replace(/,/g, ''), 10);
const connectivityCount = parseInt(bShare.find(b => b[0] === 'Connectivity')[1].replace(/,/g, ''), 10);
const virtualCount = parseInt(bShare.find(b => b[0] === 'Virtual')[1].replace(/,/g, ''), 10);

console.log(`Active: ${activeCount}, Passive: ${passiveCount}, Connectivity: ${connectivityCount}, Virtual: ${virtualCount}`);
assert.strictEqual(activeCount, 3839, 'Active count must be 3,839');
assert.strictEqual(passiveCount, 1648, 'Passive count must be 1,648');
assert.strictEqual(connectivityCount, 12530, 'Connectivity count must be 12,530');
assert.strictEqual(virtualCount, 128, 'Virtual count must be 128');
assert.strictEqual(activeCount + passiveCount + connectivityCount + virtualCount, 18145, 'Sum of buckets must equal 18,145');

// Lifecycle breakdown
const pData = dcData.PARENTS[r];
const inService = parseInt(pData[0].children[0].count.replace(/,/g, ''), 10);
const planned = parseInt(pData[0].children[1].count.replace(/,/g, ''), 10);
console.log(`In Service: ${inService}, Planned: ${planned}, Total Active: ${inService + planned}`);
assert.strictEqual(inService, 3694, 'In service must be 3,694');
assert.strictEqual(planned, 145, 'Planned must be 145');
assert.strictEqual(inService + planned, 3839, 'In Service + Planned must equal 3,839');

// 2. Cross-Section Contradictions
// Active card EOL / EOS exposed
const activePanel = dcData.PANELS[r].find(p => p.title.includes('Active'));
const eolFact = activePanel.facts.find(f => f.name.includes('EOL / EOS exposed'));
console.log(`Active Card 'EOL / EOS exposed' fact: ${eolFact.value} == 348`);
assert.strictEqual(eolFact.value, '348', 'Active card EOL fact must reflect 348');

// Firmware drift
const driftFact = activePanel.facts.find(f => f.name.includes('Off approved OS baseline'));
console.log(`Active Card 'Off approved OS baseline' fact: ${driftFact.value} == 111`);
assert.strictEqual(driftFact.value, '111', 'Off baseline must reflect 111');

const drift = dcData.DRIFT[r];
const driftVendorSum = drift.rows.reduce((sum, row) => sum + row[1], 0);
console.log(`Drift vendors sum: ${driftVendorSum} == 111, Total: ${drift.total}, CVE: ${drift.cve}`);
assert.strictEqual(driftVendorSum, 111, 'Drift vendors must sum to 111');
assert.strictEqual(drift.total, '111', 'Drift total must be 111');
assert.strictEqual(drift.cve, '18', 'Drift CVE must be 18');
// Check DDN formatting
assert.ok(drift.rows.some(row => row[0] === 'DDN'), 'Vendor DDN must be uppercase DDN');

// Decommission pipeline
const decom = dcData.DECOM[r];
console.log(`Decommission: Marked=${decom.marked}, Live=${decom.live}, Confirmed=${decom.confirmed}`);
assert.strictEqual(decom.marked, 48, 'Decom marked must be 48');
assert.strictEqual(decom.live, 8, 'Decom live (pending removal) must be 8');
assert.strictEqual(decom.confirmed, 40, 'Decom confirmed must be 40');
assert.strictEqual(decom.live + decom.confirmed, decom.marked, 'Live (8) + Confirmed (40) must equal Marked (48)');

const decomBuckets = dcData.DECOM_BUCKET[r];
const decomBucketSum = decomBuckets.reduce((sum, b) => sum + b[1], 0);
console.log(`Decom by bucket sum: ${decomBucketSum} == 48`);
assert.strictEqual(decomBucketSum, 48, 'Decom buckets must sum to 48');

// Unconfirmed / Stale Telemetry
const stale = dcData.NOT_RECONF[r];
console.log(`Stale records: Total=${stale.count}, Stale30=${stale.stale30}`);
assert.strictEqual(stale.count, '234', 'Stale total must be 234');
const staleSum = stale.items.reduce((sum, item) => sum + parseInt(item.count, 10), 0);
console.log(`Stale items sum: ${staleSum} == 234`);
assert.strictEqual(staleSum, 234, 'Stale items must sum to 234');

// Open Issues
const issues = dcData.ISSUES[r];
console.log(`Open Issues: Total=${issues.count}, Crit=${issues.crit}, High=${issues.high}, Med=${issues.med}, Low=${issues.low}`);
assert.strictEqual(issues.count, '34', 'Open issues must be 34');
assert.strictEqual(issues.crit, 4, 'Critical issues must be 4');
assert.strictEqual(issues.high, 10, 'High issues must be 10');
assert.strictEqual(issues.med, 0, 'Med issues must be 0');
assert.strictEqual(issues.low, 20, 'Low issues must be 20');

// Detailed panels subtypes
const roleItems = activePanel.items;
const gpuCount = parseInt(roleItems.find(i => i.name.toLowerCase().includes('gpu')).count.replace(/,/g, ''), 10);
const switchCount = parseInt(roleItems.find(i => i.name.toLowerCase().includes('switch')).count.replace(/,/g, ''), 10);
const serverCount = parseInt(roleItems.find(i => i.name.toLowerCase().includes('server') && !i.name.toLowerCase().includes('gpu')).count.replace(/,/g, ''), 10);
const storageCount = parseInt(roleItems.find(i => i.name.toLowerCase().includes('storage')).count.replace(/,/g, ''), 10);
console.log(`Subtypes: GPU=${gpuCount}, Switches=${switchCount}, Servers=${serverCount}, Storage=${storageCount}`);
assert.strictEqual(gpuCount, 2206, 'GPU servers must be 2,206');
assert.strictEqual(switchCount, 679, 'Switches must be 679');
assert.strictEqual(serverCount, 552, 'Servers must be 552');
assert.strictEqual(storageCount, 306, 'Storage arrays must be 306');

// Sites checks (VA-DC-001 and WA-DC-013)
const dcs = dcSumList('us');
const vaDc = dcs.find(d => d.id === 'VA-DC-001');
const waDc = dcs.find(d => d.id === 'WA-DC-013');

const pasCalc = d => d.racks + d.feeds + d.ups + 2 + d.coolingUnits + d.sensors + (d.odf.total > 0 ? 1 : 0) + d.cores.lit;

console.log(`VA-DC-001: Active=${vaDc.devices}, Passive=${pasCalc(vaDc)}, Issues=${vaDc.risks.critical + vaDc.risks.major + vaDc.risks.minor}`);
assert.strictEqual(vaDc.devices, 269, 'VA-DC-001 must have 269 Active');
assert.strictEqual(pasCalc(vaDc), 90, 'VA-DC-001 must have 90 Passive');
assert.strictEqual(vaDc.risks.critical + vaDc.risks.major + vaDc.risks.minor, 6, 'VA-DC-001 must have 6 Issues');

console.log(`WA-DC-013: Active=${waDc.devices}, Passive=${pasCalc(waDc)}, Issues=${waDc.risks.critical + waDc.risks.major + waDc.risks.minor}`);
assert.strictEqual(waDc.devices, 72, 'WA-DC-013 must have 72 Active');
assert.strictEqual(pasCalc(waDc), 44, 'WA-DC-013 must have 44 Passive');
assert.strictEqual(waDc.risks.critical + waDc.risks.major + waDc.risks.minor, 2, 'WA-DC-013 must have 2 Issues');

console.log('\nAll 19 checks and mathematical equations foot perfectly! 100% SUCCESS.');
await closeLoader();
