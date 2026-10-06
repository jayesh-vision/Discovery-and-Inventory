import { readFileSync, writeFileSync } from 'node:fs';
import { GEOGRAPHIC_HIERARCHY } from '../src/data/geographicHierarchy.ts';

// Deep clone
const hierarchy = JSON.parse(JSON.stringify(GEOGRAPHIC_HIERARCHY));

// North
const north = hierarchy.find(r => r.id === 'north');
const punjab = north.states.find(s => s.id === 'punjab');
const himachal = north.states.find(s => s.id === 'himachal');
const up = north.states.find(s => s.id === 'up-west');
const haryana = north.states.find(s => s.id === 'haryana');
const uttarakhand = north.states.find(s => s.id === 'uttarakhand');

const chandigarh = north.states.find(s => s.id === 'chandigarh');
const jk = north.states.find(s => s.id === 'jk');
const ladakh = north.states.find(s => s.id === 'ladakh');
const delhi = north.states.find(s => s.id === 'delhi');

// Merge into Punjab
if (chandigarh) {
  for (const c of chandigarh.cities) {
    c.stateId = 'punjab';
    punjab.cities.push(c);
  }
}
if (jk) {
  for (const c of jk.cities) {
    c.stateId = 'punjab';
    punjab.cities.push(c);
  }
}
punjab.cityCount = punjab.cities.length;

// Merge into Himachal
if (ladakh) {
  for (const c of ladakh.cities) {
    c.stateId = 'himachal';
    himachal.cities.push(c);
  }
}
himachal.cityCount = himachal.cities.length;

// Merge into UP
if (delhi) {
  for (const c of delhi.cities) {
    c.stateId = 'up-west';
    up.cities.push(c);
  }
}
up.name = 'Uttar Pradesh';
up.cityCount = up.cities.length;

north.states = [punjab, haryana, up, uttarakhand, himachal];
north.stateCount = north.states.length;
north.cityCount = north.states.reduce((a, s) => a + s.cities.length, 0);

// West
const west = hierarchy.find(r => r.id === 'west');
const gujarat = west.states.find(s => s.id === 'gujarat');
const dnh = west.states.find(s => s.id === 'dnh');
if (dnh) {
  for (const c of dnh.cities) {
    c.stateId = 'gujarat';
    gujarat.cities.push(c);
  }
}
gujarat.cityCount = gujarat.cities.length;
west.states = west.states.filter(s => s.id !== 'dnh');
west.stateCount = west.states.length;
west.cityCount = west.states.reduce((a, s) => a + s.cities.length, 0);

// East
const east = hierarchy.find(r => r.id === 'east');
east.stateCount = east.states.length;
east.cityCount = east.states.reduce((a, s) => a + s.cities.length, 0);

// South
const south = hierarchy.find(r => r.id === 'south');
const tamilnadu = south.states.find(s => s.id === 'tamilnadu');
const kerala = south.states.find(s => s.id === 'kerala');
const puducherry = south.states.find(s => s.id === 'puducherry');
const andaman = south.states.find(s => s.id === 'andaman');
const lakshadweep = south.states.find(s => s.id === 'lakshadweep');

if (puducherry) {
  for (const c of puducherry.cities) {
    c.stateId = 'tamilnadu';
    tamilnadu.cities.push(c);
  }
}
if (andaman) {
  for (const c of andaman.cities) {
    c.stateId = 'tamilnadu';
    tamilnadu.cities.push(c);
  }
}
tamilnadu.cityCount = tamilnadu.cities.length;

if (lakshadweep) {
  for (const c of lakshadweep.cities) {
    c.stateId = 'kerala';
    kerala.cities.push(c);
  }
}
kerala.cityCount = kerala.cities.length;

south.states = south.states.filter(s => s.id !== 'puducherry' && s.id !== 'andaman' && s.id !== 'lakshadweep');
south.stateCount = south.states.length;
south.cityCount = south.states.reduce((a, s) => a + s.cities.length, 0);

const totalStates = hierarchy.reduce((a, r) => a + r.states.length, 0);
const totalCities = hierarchy.reduce((a, r) => a + r.cityCount, 0);

console.log(`Reorganization complete!`);
console.log(`Regions: ${hierarchy.length}`);
console.log(`States: ${totalStates} (Expected 28)`);
console.log(`Cities: ${totalCities} (Expected 549)`);

// Read original file to keep header & footer intact
const orig = readFileSync('src/data/geographicHierarchy.ts', 'utf8');

// Find start and end of GEOGRAPHIC_HIERARCHY
const startIdx = orig.indexOf('export const GEOGRAPHIC_HIERARCHY: RegionItem[] = [');
const endMarker = '\n// Helper to look up a city item without default fallback';
const endIdx = orig.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  throw new Error('Could not find boundaries in geographicHierarchy.ts');
}

let topPart = orig.substring(0, startIdx);
const bottomPart = orig.substring(endIdx);

// Update TOP_HIERARCHY_METRICS in topPart
topPart = topPart.replace(
  /{ id: 'states', label: '[^']+', count: '[^']+'/,
  "{ id: 'states', label: 'States', count: '28'"
);
topPart = topPart.replace(
  /{ id: 'cities', label: '[^']+', count: '[^']+'/,
  "{ id: 'cities', label: 'Cities', count: '549'"
);

// Serialize hierarchy as clean formatted TS
function serializeHierarchy(h) {
  return 'export const GEOGRAPHIC_HIERARCHY: RegionItem[] = ' + JSON.stringify(h, null, 2) + ';\n';
}

const newContent = topPart + serializeHierarchy(hierarchy) + bottomPart;
writeFileSync('src/data/geographicHierarchy.ts', newContent);
console.log('Successfully written updated src/data/geographicHierarchy.ts!');
