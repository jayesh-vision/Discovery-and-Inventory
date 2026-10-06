import { readFileSync, writeFileSync } from 'node:fs';
import { GEOGRAPHIC_HIERARCHY } from '../src/data/geographicHierarchy.ts';

const STATE_ID_TO_CIRCLE = {
  punjab: 'PB',
  haryana: 'HR',
  'up-west': 'UP',
  uttarakhand: 'UK',
  himachal: 'HP',
  maharashtra: 'MH',
  gujarat: 'GJ',
  rajasthan: 'RJ',
  goa: 'GA',
  mp: 'MP',
  chhattisgarh: 'CG',
  'west-bengal': 'WB',
  bihar: 'BR',
  odisha: 'OR',
  jharkhand: 'JH',
  assam: 'AS',
  sikkim: 'SK',
  arunachal: 'AR',
  meghalaya: 'ML',
  nagaland: 'NL',
  manipur: 'MN',
  mizoram: 'MZ',
  tripura: 'TR',
  karnataka: 'KA',
  tamilnadu: 'TN',
  telangana: 'TS',
  ap: 'AP',
  kerala: 'KL'
};

const CIRCLE_TARGETS = {
  PB: { onAirPct: 75, failed: 16 },
  TN: { onAirPct: 74, failed: 12 },
  HP: { onAirPct: 76, failed: 7 },
  UP: { onAirPct: 75, failed: 11 },
  KL: { onAirPct: 76, failed: 6 },
  RJ: { onAirPct: 75, failed: 6 },
  MP: { onAirPct: 74, failed: 6 },
  HR: { onAirPct: 74, failed: 6 },
  WB: { onAirPct: 74, failed: 5 },
  CG: { onAirPct: 73, failed: 5 },
  UK: { onAirPct: 75, failed: 4 },
  NL: { onAirPct: 74, failed: 5 },
  MN: { onAirPct: 73, failed: 5 },
  BR: { onAirPct: 71, failed: 6 },
  TR: { onAirPct: 75, failed: 4 },
  ML: { onAirPct: 75, failed: 4 },
  MZ: { onAirPct: 74, failed: 4 },
  JH: { onAirPct: 75, failed: 4 },
  GA: { onAirPct: 75, failed: 4 },
  AR: { onAirPct: 75, failed: 4 },
  OR: { onAirPct: 72, failed: 4 },
  AS: { onAirPct: 69, failed: 5 },
  MH: { onAirPct: 70, failed: 6 },
  SK: { onAirPct: 78, failed: 2 },
  KA: { onAirPct: 76, failed: 4 },
  GJ: { onAirPct: 69, failed: 1 },
  AP: { onAirPct: 67, failed: 1 },
  TS: { onAirPct: 84, failed: 1 }
};

// Known coordinates for major cities
const KNOWN_COORDS = {
  aligarh: { lat: 27.8974, lon: 78.0880 },
  mathura: { lat: 27.4924, lon: 77.6737 },
  moradabad: { lat: 28.8350, lon: 78.7747 },
  bareilly: { lat: 28.3670, lon: 79.4304 },
  saharanpur: { lat: 29.9671, lon: 77.5510 },
  muzaffarnagar: { lat: 29.4727, lon: 77.7085 },
  firozabad: { lat: 27.1593, lon: 78.3957 },
  jhansi: { lat: 25.4484, lon: 78.5685 },
  rampur: { lat: 28.8154, lon: 79.0256 },
  shahjahanpur: { lat: 27.8805, lon: 79.9120 },
  hapur: { lat: 28.7306, lon: 77.7759 },
  etawah: { lat: 26.7769, lon: 79.0305 },
  bulandshahr: { lat: 28.4069, lon: 77.8498 },
  sambhal: { lat: 28.5839, lon: 78.5714 },
  amroha: { lat: 28.9044, lon: 78.4678 },
  fatehpur: { lat: 25.9262, lon: 80.8130 },
  ayodhya: { lat: 26.7922, lon: 82.1998 },
  budaun: { lat: 28.0378, lon: 79.1232 },
  pilibhit: { lat: 28.6310, lon: 79.8043 },
  mainpuri: { lat: 27.2285, lon: 79.0256 },
  shamli: { lat: 29.4497, lon: 77.3075 },
  barabanki: { lat: 26.9272, lon: 81.1834 },
  sultanpur: { lat: 26.2648, lon: 82.0727 }
};

// Fallback centroids by circle code
const CIRCLE_CENTROIDS = {
  PB: { lat: 31.1471, lon: 75.3412 },
  TN: { lat: 11.1271, lon: 78.6569 },
  HP: { lat: 31.9045, lon: 77.2678 },
  UP: { lat: 26.8467, lon: 80.9462 },
  KL: { lat: 10.8505, lon: 76.2711 },
  RJ: { lat: 27.0238, lon: 74.2179 },
  MP: { lat: 23.4733, lon: 77.9479 },
  HR: { lat: 29.0588, lon: 76.0856 },
  WB: { lat: 22.9868, lon: 87.8550 },
  CG: { lat: 21.2787, lon: 81.8661 },
  UK: { lat: 30.0668, lon: 79.0193 },
  NL: { lat: 26.1584, lon: 94.5624 },
  MN: { lat: 24.6637, lon: 93.9063 },
  BR: { lat: 25.0961, lon: 85.3131 },
  TR: { lat: 23.9408, lon: 91.9882 },
  ML: { lat: 25.4670, lon: 91.3662 },
  MZ: { lat: 23.1645, lon: 92.9376 },
  JH: { lat: 23.6102, lon: 85.2799 },
  GA: { lat: 15.2993, lon: 74.1240 },
  AR: { lat: 28.2180, lon: 94.7278 },
  OR: { lat: 20.9517, lon: 85.0985 },
  AS: { lat: 26.2006, lon: 92.9376 },
  MH: { lat: 19.7515, lon: 75.7139 },
  SK: { lat: 27.5330, lon: 88.5122 },
  KA: { lat: 15.3173, lon: 75.7139 },
  GJ: { lat: 22.2587, lon: 71.1924 },
  AP: { lat: 15.9129, lon: 79.7400 },
  TS: { lat: 17.1232, lon: 79.2088 }
};

// Existing locations map for coord lookup
let existingCoords = new Map();
try {
  const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));
  existing.forEach(l => {
    if (l.city && l.lat && l.lon) {
      existingCoords.set(l.city.toLowerCase(), { lat: l.lat, lon: l.lon });
    }
  });
} catch {
  // ignore
}

// Blockers pool
const BLOCKERS = [
  { cat: 'Fiber Connectivity', reason: 'Backhaul connectivity unavailable' },
  { cat: 'Power', reason: 'Commercial power connection unavailable' },
  { cat: 'Lease / Property', reason: 'Landlord denied site access' },
  { cat: 'Civil / Infrastructure', reason: 'Tower foundation construction delayed' },
  { cat: 'Regulatory', reason: 'Municipal approval pending' },
  { cat: 'Supply Chain', reason: 'Equipment delivery delayed' },
  { cat: 'Commissioning', reason: 'Site acceptance testing incomplete' }
];

const SITE_SUBTYPES = ['Macro-O', 'Micro-CO', 'Cell Site'];

// Deterministic Pseudo-Random
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

console.log('Generating 12,475 locations from GEOGRAPHIC_HIERARCHY...');

const allLocations = [];
const circleAllocations = {};

// Prepare counters and allocations
for (const [code, t] of Object.entries(CIRCLE_TARGETS)) {
  circleAllocations[code] = {
    failedLeft: t.failed,
    seq: 1
  };
}

// Global target counts
let dcLeft = { onAir: 718, inProg: 73, plan: 35, fail: 3 };
let popLeft = { onAir: 2120, inProg: 385, plan: 175, fail: 31 };
let siteLeft = { onAir: 6375, inProg: 1390, plan: 1060, fail: 110 };

// 1. Iterate each Region -> State -> City
for (const region of GEOGRAPHIC_HIERARCHY) {
  for (const state of region.states) {
    const circleCode = STATE_ID_TO_CIRCLE[state.id];
    const alloc = circleAllocations[circleCode];
    const centroid = CIRCLE_CENTROIDS[circleCode] || { lat: 20.0, lon: 77.0 };

    for (const city of state.cities) {
      // Find base coordinates
      const cityKey = city.name.toLowerCase();
      let baseLat, baseLon;
      if (existingCoords.has(cityKey)) {
        baseLat = existingCoords.get(cityKey).lat;
        baseLon = existingCoords.get(cityKey).lon;
      } else if (KNOWN_COORDS[cityKey]) {
        baseLat = KNOWN_COORDS[cityKey].lat;
        baseLon = KNOWN_COORDS[cityKey].lon;
      } else {
        // Deterministic offset from state centroid
        const hash = [...city.name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
        baseLat = +(centroid.lat + (((hash % 17) - 8) * 0.08)).toFixed(4);
        baseLon = +(centroid.lon + (((hash % 23) - 11) * 0.08)).toFixed(4);
      }

      // Generate Datacenters
      for (let i = 0; i < (city.dcCount || 0); i++) {
        const id = `${circleCode}-DC-${String(alloc.seq++).padStart(3, '0')}`;
        let st = 'On-air', chip = 'success';
        if (alloc.failedLeft > 0 && dcLeft.fail > 0 && (i === 0 && alloc.seq % 12 === 0)) {
          st = 'Failed'; chip = 'error';
          alloc.failedLeft--; dcLeft.fail--;
        } else if (dcLeft.inProg > 0 && (rnd() < 0.12 || dcLeft.onAir === 0)) {
          st = 'In progress'; chip = 'warning';
          dcLeft.inProg--;
        } else if (dcLeft.plan > 0 && (rnd() < 0.06 || dcLeft.onAir === 0)) {
          st = 'Planned'; chip = 'info';
          dcLeft.plan--;
        } else if (dcLeft.onAir > 0) {
          st = 'On-air'; chip = 'success';
          dcLeft.onAir--;
        }

        const ne = 40 + Math.floor(rnd() * 140);
        const disc = st === 'On-air' ? ne : st === 'In progress' ? Math.round(ne * 0.6) : 0;
        const dLat = (((i * 7 + alloc.seq) % 11) - 5) * 0.005;
        const dLon = (((i * 13 + alloc.seq) % 11) - 5) * 0.005;

        allLocations.push({
          st, chip, name: id, cat: 'Central', ct: 'amber', type: 'Datacenter', id,
          addr: `${city.name} Data Park`, city: city.name, state: state.name,
          ne, disc, stage: null, issue: null, risk: null,
          lat: +(baseLat + dLat).toFixed(4), lon: +(baseLon + dLon).toFixed(4)
        });
      }

      // Generate PoP locations
      for (let i = 0; i < (city.popCount || 0); i++) {
        const id = `${circleCode}-POP-${String(alloc.seq++).padStart(3, '0')}`;
        let st = 'On-air', chip = 'success';
        if (alloc.failedLeft > 0 && popLeft.fail > 0 && (i === 0 && alloc.seq % 7 === 0)) {
          st = 'Failed'; chip = 'error';
          alloc.failedLeft--; popLeft.fail--;
        } else if (popLeft.inProg > 0 && (rnd() < 0.17 || popLeft.onAir === 0)) {
          st = 'In progress'; chip = 'warning';
          popLeft.inProg--;
        } else if (popLeft.plan > 0 && (rnd() < 0.08 || popLeft.onAir === 0)) {
          st = 'Planned'; chip = 'info';
          popLeft.plan--;
        } else if (popLeft.onAir > 0) {
          st = 'On-air'; chip = 'success';
          popLeft.onAir--;
        }

        const ne = 12 + Math.floor(rnd() * 20);
        const disc = st === 'On-air' ? ne : st === 'In progress' ? Math.round(ne * 0.6) : 0;
        const dLat = (((i * 5 + alloc.seq) % 13) - 6) * 0.006;
        const dLon = (((i * 11 + alloc.seq) % 13) - 6) * 0.006;

        allLocations.push({
          st, chip, name: id, cat: 'Regional', ct: 'sky', type: 'POP', id,
          addr: `${city.name} PoP`, city: city.name, state: state.name,
          ne, disc, stage: null, issue: null, risk: null,
          lat: +(baseLat + dLat).toFixed(4), lon: +(baseLon + dLon).toFixed(4)
        });
      }

      // Generate Sites
      for (let i = 0; i < (city.siteCount || 0); i++) {
        const siteType = SITE_SUBTYPES[i % 3];
        const abbr = siteType === 'Macro-O' ? 'MAC' : siteType === 'Micro-CO' ? 'MIC' : 'CEL';
        const id = `${circleCode}-${abbr}-${String(alloc.seq++).padStart(3, '0')}`;

        let st = 'On-air', chip = 'success';
        let issue = null, risk = null, stage = 'Commissioned';

        if (alloc.failedLeft > 0 && siteLeft.fail > 0 && (alloc.seq % 5 === 0 || siteLeft.onAir === 0)) {
          st = 'Failed'; chip = 'error'; stage = 'Blocked';
          issue = BLOCKERS[(alloc.seq + i) % BLOCKERS.length];
          alloc.failedLeft--; siteLeft.fail--;
        } else if (siteLeft.inProg > 0 && (rnd() < 0.18 || siteLeft.onAir === 0)) {
          st = 'In progress'; chip = 'warning'; stage = 'Under Deployment';
          if (rnd() < 0.3) issue = BLOCKERS[(alloc.seq + i) % BLOCKERS.length];
          siteLeft.inProg--;
        } else if (siteLeft.plan > 0 && (rnd() < 0.14 || siteLeft.onAir === 0)) {
          st = 'Planned'; chip = 'info'; stage = 'Planned';
          siteLeft.plan--;
        } else if (siteLeft.onAir > 0) {
          st = 'On-air'; chip = 'success'; stage = 'Commissioned';
          if (rnd() < 0.05) risk = 'High utilization requiring capacity expansion';
          siteLeft.onAir--;
        }

        const ne = 3 + Math.floor(rnd() * 12);
        const disc = st === 'On-air' ? ne : st === 'In progress' ? Math.round(ne * 0.5) : 0;
        const dLat = (((i * 9 + alloc.seq) % 21) - 10) * 0.007;
        const dLon = (((i * 17 + alloc.seq) % 21) - 10) * 0.007;

        allLocations.push({
          st, chip, name: id, cat: 'Edge', ct: 'emerald', type: siteType, id,
          addr: `${city.name} ${siteType} Site`, city: city.name, state: state.name,
          ne, disc, stage, issue, risk,
          lat: +(baseLat + dLat).toFixed(4), lon: +(baseLon + dLon).toFixed(4)
        });
      }
    }
  }
}

console.log('Total locations generated:', allLocations.length);

// Balance remaining fail/inProg/plan if any left over due to rounding
const dcRows = allLocations.filter(l => l.type === 'Datacenter');
const popRows = allLocations.filter(l => l.type === 'POP');
const siteRows = allLocations.filter(l => l.cat === 'Edge');

console.log('Tier breakdown:');
console.log('Datacenters:', dcRows.length);
console.log('PoPs:', popRows.length);
console.log('Sites:', siteRows.length);

const statusStats = {
  'On-air': allLocations.filter(l => l.st === 'On-air').length,
  'In progress': allLocations.filter(l => l.st === 'In progress').length,
  'Planned': allLocations.filter(l => l.st === 'Planned').length,
  'Failed': allLocations.filter(l => l.st === 'Failed').length
};
console.log('Status stats:', statusStats);

writeFileSync('src/data/allLocations.json', JSON.stringify(allLocations, null, 2), 'utf8');
console.log('Successfully written to src/data/allLocations.json');
