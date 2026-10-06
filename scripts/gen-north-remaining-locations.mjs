import { readFileSync, writeFileSync } from 'node:fs';

const STATES_DATA = {
  'Uttarakhand': [
    { city: 'Dehradun', lat: 30.3165, lon: 78.0322, dc: 4, pop: 12, sites: 34 },
    { city: 'Haridwar', lat: 29.9457, lon: 78.1642, dc: 3, pop: 10, sites: 28 },
    { city: 'Roorkee', lat: 29.8543, lon: 77.8880, dc: 2, pop: 8, sites: 24 },
    { city: 'Haldwani', lat: 29.2183, lon: 79.5130, dc: 3, pop: 9, sites: 26 },
    { city: 'Rishikesh', lat: 30.0869, lon: 78.2676, dc: 2, pop: 7, sites: 22 },
    { city: 'Rudrapur', lat: 28.9800, lon: 79.4000, dc: 2, pop: 7, sites: 22 },
    { city: 'Kashipur', lat: 29.2100, lon: 78.9500, dc: 2, pop: 6, sites: 20 },
    { city: 'Nainital', lat: 29.3919, lon: 79.4542, dc: 1, pop: 5, sites: 18 },
    { city: 'Kotdwar', lat: 29.7465, lon: 78.5284, dc: 1, pop: 4, sites: 16 },
    { city: 'Ramnagar', lat: 29.3948, lon: 79.1278, dc: 1, pop: 4, sites: 16 },
    { city: 'Manglaur', lat: 29.7900, lon: 77.8700, dc: 1, pop: 4, sites: 15 },
    { city: 'Mussoorie', lat: 30.4598, lon: 78.0644, dc: 1, pop: 4, sites: 15 },
    { city: 'Pithoragarh', lat: 29.5829, lon: 80.2182, dc: 1, pop: 3, sites: 14 },
    { city: 'Almora', lat: 29.5971, lon: 79.6591, dc: 1, pop: 3, sites: 14 },
    { city: 'Tehri', lat: 30.3800, lon: 78.4800, dc: 1, pop: 3, sites: 14 }
  ],
  'Himachal Pradesh': [
    { city: 'Shimla', lat: 31.1048, lon: 77.1734, dc: 4, pop: 12, sites: 34 },
    { city: 'Baddi', lat: 30.9578, lon: 76.7914, dc: 3, pop: 11, sites: 30 },
    { city: 'Dharamshala', lat: 32.2190, lon: 76.3234, dc: 3, pop: 10, sites: 28 },
    { city: 'Solan', lat: 30.9045, lon: 77.0967, dc: 2, pop: 8, sites: 24 },
    { city: 'Mandi', lat: 31.7087, lon: 76.9320, dc: 2, pop: 8, sites: 24 },
    { city: 'Kullu', lat: 31.9579, lon: 77.1095, dc: 2, pop: 7, sites: 22 },
    { city: 'Manali', lat: 32.2432, lon: 77.1892, dc: 2, pop: 7, sites: 20 },
    { city: 'Paonta Sahib', lat: 30.4439, lon: 77.6253, dc: 2, pop: 6, sites: 18 },
    { city: 'Una', lat: 31.4685, lon: 76.2708, dc: 1, pop: 5, sites: 17 },
    { city: 'Hamirpur', lat: 31.6862, lon: 76.5213, dc: 1, pop: 4, sites: 16 },
    { city: 'Bilaspur', lat: 31.3326, lon: 76.7583, dc: 1, pop: 4, sites: 16 },
    { city: 'Nahan', lat: 30.5599, lon: 77.2955, dc: 1, pop: 4, sites: 15 },
    { city: 'Palampur', lat: 32.1109, lon: 76.5363, dc: 1, pop: 4, sites: 15 },
    { city: 'Sundernagar', lat: 31.5333, lon: 76.8833, dc: 1, pop: 3, sites: 14 },
    { city: 'Chamba', lat: 32.5534, lon: 76.1258, dc: 1, pop: 3, sites: 14 }
  ],
  'Jammu & Kashmir': [
    { city: 'Srinagar', lat: 34.0837, lon: 74.7973, dc: 4, pop: 12, sites: 34 },
    { city: 'Jammu', lat: 32.7266, lon: 74.8570, dc: 4, pop: 12, sites: 34 },
    { city: 'Anantnag', lat: 33.7311, lon: 75.1522, dc: 2, pop: 8, sites: 24 },
    { city: 'Baramulla', lat: 34.2023, lon: 74.3470, dc: 2, pop: 8, sites: 24 },
    { city: 'Udhampur', lat: 32.9250, lon: 75.1417, dc: 2, pop: 7, sites: 22 },
    { city: 'Kathua', lat: 32.3716, lon: 75.5186, dc: 2, pop: 7, sites: 22 },
    { city: 'Sopore', lat: 34.2986, lon: 74.4697, dc: 2, pop: 6, sites: 20 },
    { city: 'Rajouri', lat: 33.3719, lon: 74.3090, dc: 1, pop: 5, sites: 18 },
    { city: 'Poonch', lat: 33.7667, lon: 74.1000, dc: 1, pop: 5, sites: 18 },
    { city: 'Pulwama', lat: 33.8739, lon: 74.8967, dc: 1, pop: 5, sites: 17 },
    { city: 'Samba', lat: 32.5600, lon: 75.1200, dc: 1, pop: 4, sites: 16 },
    { city: 'Kupwara', lat: 34.5262, lon: 74.2546, dc: 1, pop: 4, sites: 16 },
    { city: 'Budgam', lat: 34.0200, lon: 74.7200, dc: 1, pop: 4, sites: 15 },
    { city: 'Ganderbal', lat: 34.2200, lon: 74.7800, dc: 1, pop: 4, sites: 15 },
    { city: 'Bandipora', lat: 34.4200, lon: 74.6400, dc: 1, pop: 3, sites: 14 }
  ]
};

const STATE_CODES = {
  'Uttarakhand': 'UK',
  'Himachal Pradesh': 'HP',
  'Jammu & Kashmir': 'JK'
};

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse sites for UK, HP, JK
const filteredExisting = existing.filter(l => !STATES_DATA[l.state]);

const newSites = [];

for (const [stateName, cities] of Object.entries(STATES_DATA)) {
  const code = STATE_CODES[stateName];
  let seq = 1;

  for (const c of cities) {
    const isMajor = c.dc >= 3 || c.city === 'Srinagar' || c.city === 'Jammu' || c.city === 'Shimla' || c.city === 'Dehradun';
    const sampleCount = isMajor ? 12 : 6;

    for (let i = 0; i < sampleCount; i++) {
      const id = `${code}-STE-${String(seq).padStart(3, '0')}`;
      seq++;

      let type = 'Site';
      if (i === 0 && c.dc > 0) type = 'Datacenter';
      else if (i === 1 && c.pop > 0) type = 'PoP';

      const rnd = (seq * 29 + i * 43) % 100;
      let st = 'On-air';
      let chip = 'success';
      if (rnd > 97) {
        st = 'Failed';
        chip = 'danger';
      } else if (rnd > 86) {
        st = 'Planned';
        chip = 'info';
      } else if (rnd > 72) {
        st = 'In progress';
        chip = 'warning';
      }

      const dLat = (((i * 7) % 11) - 5) * 0.007;
      const dLon = (((i * 13) % 11) - 5) * 0.007;

      const neCount = type === 'Datacenter' ? 140 : type === 'PoP' ? 68 : 25;
      const discCount = st === 'On-air' ? neCount : Math.round(neCount * 0.7);

      newSites.push({
        st,
        chip,
        name: `${c.city} ${type} #${i + 1}`,
        cat: 'Central',
        ct: 'amber',
        type,
        id,
        addr: `${c.city} Main Road Area #${i + 1}`,
        city: c.city,
        state: stateName,
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

console.log(`Generated ${newSites.length} new locations across UK, HP, JK.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
