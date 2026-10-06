import { readFileSync, writeFileSync } from 'node:fs';

const NEW_UTS = [
  {
    state: 'Ladakh',
    codePrefix: 'LA',
    cities: [
      { city: 'Leh', lat: 34.1526, lon: 77.5771, dc: 3, pop: 8, sites: 24 },
      { city: 'Kargil', lat: 34.5539, lon: 76.1349, dc: 2, pop: 6, sites: 20 },
      { city: 'Diskit (Nubra)', lat: 34.5422, lon: 77.5614, dc: 1, pop: 4, sites: 16 },
      { city: 'Padum (Zanskar)', lat: 33.4650, lon: 76.8833, dc: 1, pop: 4, sites: 15 },
      { city: 'Dras', lat: 34.4294, lon: 75.7628, dc: 1, pop: 4, sites: 15 },
      { city: 'Nyoma', lat: 33.1970, lon: 78.6500, dc: 1, pop: 3, sites: 14 },
      { city: 'Khalatse', lat: 34.3167, lon: 76.8833, dc: 1, pop: 3, sites: 14 },
      { city: 'Sankoo', lat: 34.2833, lon: 75.9500, dc: 1, pop: 3, sites: 14 },
      { city: 'Hunder', lat: 34.5800, lon: 77.4700, dc: 1, pop: 3, sites: 14 },
      { city: 'Turtuk', lat: 34.8464, lon: 76.8286, dc: 1, pop: 3, sites: 14 },
      { city: 'Chushul', lat: 33.5900, lon: 78.6500, dc: 1, pop: 3, sites: 14 },
      { city: 'Tangste', lat: 34.0300, lon: 78.1700, dc: 1, pop: 3, sites: 13 },
      { city: 'Shey', lat: 34.0700, lon: 77.6300, dc: 1, pop: 3, sites: 13 },
      { city: 'Thiksey', lat: 34.0583, lon: 77.6667, dc: 1, pop: 3, sites: 13 },
      { city: 'Upshi', lat: 33.8300, lon: 77.8100, dc: 1, pop: 3, sites: 13 }
    ]
  },
  {
    state: 'Chandigarh',
    codePrefix: 'CH',
    cities: [
      { city: 'Sector 17 (City Centre)', lat: 30.7410, lon: 76.7820, dc: 4, pop: 12, sites: 32 },
      { city: 'IT Park Chandigarh', lat: 30.7250, lon: 76.8400, dc: 3, pop: 10, sites: 28 },
      { city: 'Industrial Area Phase 1', lat: 30.7080, lon: 76.8040, dc: 2, pop: 8, sites: 24 },
      { city: 'Sector 35', lat: 30.7240, lon: 76.7680, dc: 2, pop: 7, sites: 22 },
      { city: 'Sector 22', lat: 30.7360, lon: 76.7730, dc: 2, pop: 6, sites: 20 },
      { city: 'Sector 43 (ISBT)', lat: 30.7180, lon: 76.7480, dc: 1, pop: 5, sites: 18 },
      { city: 'Sector 34', lat: 30.7230, lon: 76.7790, dc: 1, pop: 5, sites: 18 },
      { city: 'Industrial Area Phase 2', lat: 30.6970, lon: 76.8010, dc: 1, pop: 5, sites: 18 },
      { city: 'Manimajra', lat: 30.7220, lon: 76.8480, dc: 1, pop: 4, sites: 16 },
      { city: 'Sector 8', lat: 30.7430, lon: 76.7970, dc: 1, pop: 4, sites: 16 },
      { city: 'Sector 26', lat: 30.7300, lon: 76.8110, dc: 1, pop: 4, sites: 16 },
      { city: 'Sector 9', lat: 30.7490, lon: 76.7900, dc: 1, pop: 3, sites: 14 },
      { city: 'Dhanas', lat: 30.7680, lon: 76.7450, dc: 1, pop: 3, sites: 14 },
      { city: 'Maloya', lat: 30.7290, lon: 76.7210, dc: 1, pop: 3, sites: 14 },
      { city: 'Hallomajra', lat: 30.6980, lon: 76.7920, dc: 1, pop: 3, sites: 14 }
    ]
  },
  {
    state: 'Lakshadweep',
    codePrefix: 'LD',
    cities: [
      { city: 'Kavaratti', lat: 10.5667, lon: 72.6417, dc: 0, pop: 2, sites: 4 },
      { city: 'Agatti', lat: 10.8533, lon: 72.1948, dc: 0, pop: 1, sites: 3 },
      { city: 'Amini', lat: 11.1228, lon: 72.7303, dc: 0, pop: 1, sites: 2 },
      { city: 'Andrott', lat: 10.8167, lon: 73.6667, dc: 0, pop: 1, sites: 2 },
      { city: 'Kadmat', lat: 11.2333, lon: 72.7833, dc: 0, pop: 1, sites: 2 },
      { city: 'Kalpeni', lat: 10.0833, lon: 73.6500, dc: 0, pop: 1, sites: 2 },
      { city: 'Minicoy', lat: 8.2833, lon: 73.0500, dc: 0, pop: 1, sites: 2 },
      { city: 'Kiltan', lat: 11.4833, lon: 73.0000, dc: 0, pop: 0, sites: 1 },
      { city: 'Chetlat', lat: 11.6833, lon: 72.7000, dc: 0, pop: 0, sites: 1 },
      { city: 'Bitra', lat: 11.6000, lon: 72.1833, dc: 0, pop: 0, sites: 1 },
      { city: 'Bangaram', lat: 10.9333, lon: 72.2833, dc: 0, pop: 0, sites: 1 },
      { city: 'Suheli Par', lat: 10.0833, lon: 72.2833, dc: 0, pop: 0, sites: 1 },
      { city: 'Cheriyam', lat: 10.1333, lon: 73.6833, dc: 0, pop: 0, sites: 1 },
      { city: 'Tinakara', lat: 10.9333, lon: 72.3167, dc: 0, pop: 0, sites: 1 },
      { city: 'Pitti', lat: 10.8333, lon: 72.6333, dc: 0, pop: 0, sites: 1 }
    ]
  }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out existing if any
const filteredExisting = existing.filter(
  l => !NEW_UTS.some(st => st.state === l.state)
);

const newSites = [];

for (const stateObj of NEW_UTS) {
  let seq = 1;
  const isIsland = stateObj.state === 'Lakshadweep';

  for (const c of stateObj.cities) {
    const sampleCount = isIsland ? (c.pop > 0 ? 3 : 1) : (c.dc >= 2 ? 10 : 6);

    for (let i = 0; i < sampleCount; i++) {
      const id = `${stateObj.codePrefix}-STE-${String(seq).padStart(3, '0')}`;
      seq++;

      let type = 'Site';
      if (i === 0 && c.dc > 0) type = 'Datacenter';
      else if (i === 1 && c.pop > 0) type = 'POP';

      const rnd = (seq * 41 + i * 47) % 100;
      let st = 'On-air';
      let chip = 'success';
      if (rnd > 97) {
        st = 'Failed';
        chip = 'danger';
      } else if (rnd > 86) {
        st = 'Planned';
        chip = 'info';
      } else if (rnd > 73) {
        st = 'In progress';
        chip = 'warning';
      }

      const dLat = (((i * 7) % 11) - 5) * 0.007;
      const dLon = (((i * 13) % 11) - 5) * 0.007;

      const neCount = type === 'Datacenter' ? 142 : type === 'POP' ? 68 : 26;
      const discCount = st === 'On-air' ? neCount : Math.round(neCount * 0.75);

      newSites.push({
        st,
        chip,
        name: `${c.city} ${type} #${i + 1}`,
        cat: 'Central',
        ct: 'amber',
        type,
        id,
        addr: `${c.city} Telecom Sector Area #${i + 1}`,
        city: c.city,
        state: stateObj.state,
        ne: neCount,
        disc: discCount,
        stage: null,
        issue: null,
        risk: null,
        lat: +(c.lat + dLat).toFixed(4),
        lon: +(c.lon + dLon).toFixed(4)
      });
    }
  }
}

const combined = [...filteredExisting, ...newSites];
writeFileSync('src/data/allLocations.json', JSON.stringify(combined, null, 2));

console.log(`Generated ${newSites.length} new locations across Ladakh, Chandigarh, and Lakshadweep.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);

for (const stateObj of NEW_UTS) {
  const count = newSites.filter(s => s.state === stateObj.state).length;
  console.log(`- ${stateObj.state}: ${count} sample pins`);
}
