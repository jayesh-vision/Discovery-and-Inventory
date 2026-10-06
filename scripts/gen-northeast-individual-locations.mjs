import { readFileSync, writeFileSync } from 'node:fs';

const NORTHEAST_STATES = [
  {
    state: 'Arunachal Pradesh',
    codePrefix: 'AR',
    cities: [
      { city: 'Itanagar', lat: 27.0844, lon: 93.6053, dc: 4, pop: 12, sites: 34 },
      { city: 'Naharlagun', lat: 27.1070, lon: 93.6934, dc: 3, pop: 10, sites: 28 },
      { city: 'Pasighat', lat: 28.0664, lon: 95.3268, dc: 2, pop: 8, sites: 24 },
      { city: 'Tawang', lat: 27.5861, lon: 91.8594, dc: 2, pop: 7, sites: 22 },
      { city: 'Ziro', lat: 27.5950, lon: 93.8315, dc: 2, pop: 6, sites: 20 },
      { city: 'Along (Aalo)', lat: 28.1697, lon: 94.8038, dc: 1, pop: 5, sites: 18 },
      { city: 'Tezu', lat: 27.9135, lon: 96.1685, dc: 1, pop: 5, sites: 18 },
      { city: 'Roing', lat: 28.1396, lon: 95.8340, dc: 1, pop: 4, sites: 17 },
      { city: 'Bomdila', lat: 27.2645, lon: 92.4234, dc: 1, pop: 4, sites: 17 },
      { city: 'Changlang', lat: 27.1264, lon: 95.7335, dc: 1, pop: 4, sites: 16 },
      { city: 'Khonsa', lat: 26.9892, lon: 95.5085, dc: 1, pop: 4, sites: 15 },
      { city: 'Lemmi', lat: 27.2400, lon: 93.1800, dc: 1, pop: 3, sites: 14 },
      { city: 'Palin', lat: 27.7200, lon: 93.5800, dc: 1, pop: 3, sites: 13 },
      { city: 'Koloriang', lat: 27.9000, lon: 93.3500, dc: 1, pop: 3, sites: 13 },
      { city: 'Hawai', lat: 27.8900, lon: 96.8000, dc: 1, pop: 3, sites: 13 }
    ]
  },
  {
    state: 'Meghalaya',
    codePrefix: 'ML',
    cities: [
      { city: 'Shillong', lat: 25.5788, lon: 91.8933, dc: 5, pop: 14, sites: 36 },
      { city: 'Tura', lat: 25.5141, lon: 90.2033, dc: 3, pop: 10, sites: 28 },
      { city: 'Jowai', lat: 25.4455, lon: 92.2037, dc: 2, pop: 8, sites: 24 },
      { city: 'Byrnihat', lat: 26.0460, lon: 91.8600, dc: 2, pop: 7, sites: 22 },
      { city: 'Nongpoh', lat: 25.9036, lon: 91.8803, dc: 2, pop: 6, sites: 20 },
      { city: 'Williamnagar', lat: 25.5947, lon: 90.6171, dc: 1, pop: 5, sites: 18 },
      { city: 'Cherrapunji', lat: 25.2986, lon: 91.7086, dc: 1, pop: 5, sites: 18 },
      { city: 'Nongstoin', lat: 25.5204, lon: 91.2694, dc: 1, pop: 4, sites: 17 },
      { city: 'Baghmara', lat: 25.1958, lon: 90.6415, dc: 1, pop: 4, sites: 17 },
      { city: 'Resubelpara', lat: 25.9080, lon: 90.5980, dc: 1, pop: 4, sites: 16 },
      { city: 'Mairang', lat: 25.5600, lon: 91.6400, dc: 1, pop: 4, sites: 15 },
      { city: 'Khliehriat', lat: 25.3500, lon: 92.3700, dc: 1, pop: 3, sites: 15 },
      { city: 'Mawkyrwat', lat: 25.3600, lon: 91.4500, dc: 1, pop: 3, sites: 14 },
      { city: 'Ampati', lat: 25.4600, lon: 89.9300, dc: 1, pop: 3, sites: 13 },
      { city: 'Dawki', lat: 25.1850, lon: 92.0190, dc: 1, pop: 3, sites: 13 }
    ]
  },
  {
    state: 'Nagaland',
    codePrefix: 'NL',
    cities: [
      { city: 'Dimapur', lat: 25.9094, lon: 93.7266, dc: 5, pop: 15, sites: 40 },
      { city: 'Kohima', lat: 25.6751, lon: 94.1086, dc: 4, pop: 12, sites: 32 },
      { city: 'Mokokchung', lat: 26.3256, lon: 94.5203, dc: 2, pop: 8, sites: 24 },
      { city: 'Chumukedima', lat: 25.7950, lon: 93.7750, dc: 2, pop: 7, sites: 22 },
      { city: 'Tuensang', lat: 26.2750, lon: 94.8300, dc: 2, pop: 6, sites: 20 },
      { city: 'Wokha', lat: 26.0980, lon: 94.2610, dc: 1, pop: 5, sites: 18 },
      { city: 'Zunheboto', lat: 25.9700, lon: 94.5200, dc: 1, pop: 5, sites: 18 },
      { city: 'Mon', lat: 26.7450, lon: 95.0600, dc: 1, pop: 4, sites: 18 },
      { city: 'Phek', lat: 25.6600, lon: 94.4900, dc: 1, pop: 4, sites: 17 },
      { city: 'Kiphire', lat: 25.8700, lon: 94.7800, dc: 1, pop: 4, sites: 16 },
      { city: 'Longleng', lat: 26.4700, lon: 94.8100, dc: 1, pop: 4, sites: 15 },
      { city: 'Peren', lat: 25.5100, lon: 93.7400, dc: 1, pop: 3, sites: 15 },
      { city: 'Tseminyu', lat: 25.9500, lon: 94.2100, dc: 1, pop: 3, sites: 14 },
      { city: 'Niuland', lat: 25.8600, lon: 93.8900, dc: 1, pop: 3, sites: 13 },
      { city: 'Medziphema', lat: 25.7600, lon: 93.8600, dc: 1, pop: 3, sites: 12 }
    ]
  },
  {
    state: 'Manipur',
    codePrefix: 'MN',
    cities: [
      { city: 'Imphal', lat: 24.8170, lon: 93.9368, dc: 5, pop: 14, sites: 38 },
      { city: 'Churachandpur', lat: 24.3330, lon: 93.6740, dc: 3, pop: 10, sites: 28 },
      { city: 'Thoubal', lat: 24.6340, lon: 93.9980, dc: 2, pop: 8, sites: 24 },
      { city: 'Bishnupur', lat: 24.6300, lon: 93.7600, dc: 2, pop: 7, sites: 22 },
      { city: 'Kakching', lat: 24.4840, lon: 93.9800, dc: 2, pop: 6, sites: 20 },
      { city: 'Ukhrul', lat: 25.1167, lon: 94.3667, dc: 1, pop: 5, sites: 18 },
      { city: 'Senapati', lat: 25.2690, lon: 94.0190, dc: 1, pop: 5, sites: 18 },
      { city: 'Moreh', lat: 24.2460, lon: 94.3050, dc: 1, pop: 5, sites: 18 },
      { city: 'Tamenglong', lat: 24.9840, lon: 93.4940, dc: 1, pop: 4, sites: 17 },
      { city: 'Chandel', lat: 24.3270, lon: 93.9940, dc: 1, pop: 4, sites: 16 },
      { city: 'Jiribam', lat: 24.8020, lon: 93.1230, dc: 1, pop: 4, sites: 16 },
      { city: 'Kangpokpi', lat: 25.1500, lon: 93.9700, dc: 1, pop: 4, sites: 15 },
      { city: 'Noney', lat: 24.8300, lon: 93.6000, dc: 1, pop: 3, sites: 14 },
      { city: 'Pherzawl', lat: 24.2600, lon: 93.1800, dc: 1, pop: 3, sites: 13 },
      { city: 'Kamjong', lat: 24.9700, lon: 94.5100, dc: 1, pop: 3, sites: 13 }
    ]
  },
  {
    state: 'Mizoram',
    codePrefix: 'MZ',
    cities: [
      { city: 'Aizawl', lat: 23.7271, lon: 92.7176, dc: 5, pop: 14, sites: 36 },
      { city: 'Lunglei', lat: 22.8872, lon: 92.7397, dc: 3, pop: 10, sites: 28 },
      { city: 'Champhai', lat: 23.4740, lon: 93.3280, dc: 2, pop: 8, sites: 24 },
      { city: 'Serchhip', lat: 23.3100, lon: 92.8500, dc: 2, pop: 7, sites: 22 },
      { city: 'Kolasib', lat: 24.2250, lon: 92.6780, dc: 2, pop: 6, sites: 20 },
      { city: 'Lawngtlai', lat: 22.5270, lon: 92.8940, dc: 1, pop: 5, sites: 18 },
      { city: 'Saiha', lat: 22.4890, lon: 92.9770, dc: 1, pop: 5, sites: 18 },
      { city: 'Mamit', lat: 23.9290, lon: 92.4910, dc: 1, pop: 4, sites: 17 },
      { city: 'Hnahthial', lat: 22.9660, lon: 92.9300, dc: 1, pop: 4, sites: 17 },
      { city: 'Khawzawl', lat: 23.5350, lon: 93.1850, dc: 1, pop: 4, sites: 16 },
      { city: 'Saitual', lat: 23.9700, lon: 92.9700, dc: 1, pop: 4, sites: 15 },
      { city: 'Vairengte', lat: 24.5000, lon: 92.7600, dc: 1, pop: 3, sites: 15 },
      { city: 'Bairabi', lat: 24.1900, lon: 92.5300, dc: 1, pop: 3, sites: 14 },
      { city: 'North Vanlaiphai', lat: 23.1300, lon: 93.0600, dc: 1, pop: 3, sites: 13 },
      { city: 'Tlabung', lat: 22.9000, lon: 92.5000, dc: 1, pop: 3, sites: 13 }
    ]
  },
  {
    state: 'Tripura',
    codePrefix: 'TR',
    cities: [
      { city: 'Agartala', lat: 23.8315, lon: 91.2868, dc: 5, pop: 14, sites: 36 },
      { city: 'Dharmanagar', lat: 24.3750, lon: 92.1640, dc: 3, pop: 10, sites: 28 },
      { city: 'Udaipur', lat: 23.5340, lon: 91.4880, dc: 2, pop: 8, sites: 25 },
      { city: 'Kailashahar', lat: 24.3290, lon: 92.0070, dc: 2, pop: 7, sites: 22 },
      { city: 'Teliamura', lat: 23.8380, lon: 91.6320, dc: 2, pop: 6, sites: 20 },
      { city: 'Khowai', lat: 24.0620, lon: 91.6040, dc: 1, pop: 5, sites: 18 },
      { city: 'Belonia', lat: 23.2530, lon: 91.4550, dc: 1, pop: 5, sites: 18 },
      { city: 'Melaghar', lat: 23.4900, lon: 91.3300, dc: 1, pop: 5, sites: 17 },
      { city: 'Ambassa', lat: 23.9200, lon: 91.8500, dc: 1, pop: 4, sites: 17 },
      { city: 'Bishalgarh', lat: 23.6800, lon: 91.3100, dc: 1, pop: 4, sites: 16 },
      { city: 'Sabroom', lat: 23.0000, lon: 91.7000, dc: 1, pop: 4, sites: 15 },
      { city: 'Santirbazar', lat: 23.3100, lon: 91.5600, dc: 1, pop: 3, sites: 15 },
      { city: 'Kumarghat', lat: 24.1600, lon: 92.0400, dc: 1, pop: 3, sites: 14 },
      { city: 'Ranirbazar', lat: 23.8300, lon: 91.3700, dc: 1, pop: 3, sites: 14 },
      { city: 'Sonamura', lat: 23.4700, lon: 91.2700, dc: 1, pop: 3, sites: 13 }
    ]
  }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old grouped 'North East (Other)' entries
const filteredExisting = existing.filter(
  l => l.state !== 'North East (Other)' &&
       !NORTHEAST_STATES.some(st => st.state === l.state)
);

const newSites = [];

for (const stateObj of NORTHEAST_STATES) {
  let seq = 1;
  for (const c of stateObj.cities) {
    const isMajor = c.dc >= 3;
    const sampleCount = isMajor ? 12 : 7;

    for (let i = 0; i < sampleCount; i++) {
      const id = `${stateObj.codePrefix}-STE-${String(seq).padStart(3, '0')}`;
      seq++;

      let type = 'Site';
      if (i === 0 && c.dc > 0) type = 'Datacenter';
      else if (i === 1 && c.pop > 0) type = 'POP';

      const rnd = (seq * 37 + i * 43) % 100;
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

console.log(`Generated ${newSites.length} new locations across 6 North Eastern states (90 cities).`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);

for (const stateObj of NORTHEAST_STATES) {
  const count = newSites.filter(s => s.state === stateObj.state).length;
  console.log(`- ${stateObj.state}: ${count} sample pins`);
}
