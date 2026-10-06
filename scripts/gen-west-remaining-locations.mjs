import { readFileSync, writeFileSync } from 'node:fs';

const STATES_DATA = {
  'Goa': [
    { city: 'Panaji', lat: 15.4909, lon: 73.8278, dc: 4, pop: 12, sites: 34 },
    { city: 'Margao', lat: 15.2736, lon: 73.9580, dc: 3, pop: 10, sites: 28 },
    { city: 'Vasco da Gama', lat: 15.3982, lon: 73.8113, dc: 2, pop: 8, sites: 24 },
    { city: 'Mapusa', lat: 15.5937, lon: 73.8142, dc: 2, pop: 7, sites: 22 },
    { city: 'Ponda', lat: 15.4026, lon: 74.0086, dc: 2, pop: 6, sites: 20 },
    { city: 'Porvorim', lat: 15.5350, lon: 73.8290, dc: 1, pop: 5, sites: 18 },
    { city: 'Calangute', lat: 15.5439, lon: 73.7554, dc: 1, pop: 5, sites: 18 },
    { city: 'Bicholim', lat: 15.5954, lon: 73.9525, dc: 1, pop: 4, sites: 16 },
    { city: 'Curchorem', lat: 15.2588, lon: 74.1102, dc: 1, pop: 4, sites: 16 },
    { city: 'Cuncolim', lat: 15.1764, lon: 73.9922, dc: 1, pop: 4, sites: 15 },
    { city: 'Canacona', lat: 15.0069, lon: 74.0450, dc: 1, pop: 4, sites: 15 },
    { city: 'Valpoi', lat: 15.5292, lon: 74.1336, dc: 1, pop: 3, sites: 14 },
    { city: 'Pernem', lat: 15.7172, lon: 73.7972, dc: 1, pop: 3, sites: 14 },
    { city: 'Quepem', lat: 15.2167, lon: 74.0667, dc: 1, pop: 3, sites: 14 },
    { city: 'Sanguem', lat: 15.2300, lon: 74.1500, dc: 1, pop: 3, sites: 14 }
  ],
  'Chhattisgarh': [
    { city: 'Raipur', lat: 21.2514, lon: 81.6296, dc: 5, pop: 15, sites: 42 },
    { city: 'Bhilai', lat: 21.1938, lon: 81.3509, dc: 3, pop: 10, sites: 30 },
    { city: 'Durg', lat: 21.1904, lon: 81.2849, dc: 3, pop: 10, sites: 30 },
    { city: 'Bilaspur', lat: 22.0797, lon: 82.1409, dc: 3, pop: 9, sites: 26 },
    { city: 'Korba', lat: 22.3595, lon: 82.7501, dc: 2, pop: 7, sites: 22 },
    { city: 'Raigarh', lat: 21.8974, lon: 83.3950, dc: 2, pop: 6, sites: 20 },
    { city: 'Rajnandgaon', lat: 21.0974, lon: 81.0336, dc: 1, pop: 5, sites: 18 },
    { city: 'Jagdalpur', lat: 19.0732, lon: 82.0295, dc: 1, pop: 5, sites: 18 },
    { city: 'Ambikapur', lat: 23.1189, lon: 83.1979, dc: 1, pop: 4, sites: 16 },
    { city: 'Dhamtari', lat: 20.7071, lon: 81.5497, dc: 1, pop: 4, sites: 16 },
    { city: 'Mahasamund', lat: 21.1091, lon: 82.0967, dc: 1, pop: 4, sites: 15 },
    { city: 'Bhatapara', lat: 21.7333, lon: 81.9333, dc: 1, pop: 4, sites: 15 },
    { city: 'Chirmiri', lat: 23.1833, lon: 82.3500, dc: 1, pop: 3, sites: 14 },
    { city: 'Kanker', lat: 20.2717, lon: 81.4922, dc: 1, pop: 3, sites: 14 },
    { city: 'Kawardha', lat: 22.0167, lon: 81.2500, dc: 1, pop: 3, sites: 14 }
  ],
  'Madhya Pradesh': [
    { city: 'Indore', lat: 22.7196, lon: 75.8577, dc: 6, pop: 18, sites: 48 },
    { city: 'Bhopal', lat: 23.2599, lon: 77.4126, dc: 5, pop: 16, sites: 42 },
    { city: 'Jabalpur', lat: 23.1815, lon: 79.9864, dc: 3, pop: 11, sites: 30 },
    { city: 'Gwalior', lat: 26.2183, lon: 78.1828, dc: 3, pop: 10, sites: 28 },
    { city: 'Ujjain', lat: 23.1765, lon: 75.7885, dc: 2, pop: 8, sites: 24 },
    { city: 'Sagar', lat: 23.8388, lon: 78.7378, dc: 2, pop: 7, sites: 22 },
    { city: 'Dewas', lat: 22.9676, lon: 76.0534, dc: 2, pop: 7, sites: 22 },
    { city: 'Satna', lat: 24.5804, lon: 80.8322, dc: 2, pop: 6, sites: 20 },
    { city: 'Ratlam', lat: 23.3315, lon: 75.0367, dc: 1, pop: 5, sites: 18 },
    { city: 'Rewa', lat: 24.5362, lon: 81.3037, dc: 1, pop: 5, sites: 18 },
    { city: 'Katni', lat: 23.8343, lon: 80.3957, dc: 1, pop: 4, sites: 16 },
    { city: 'Singrauli', lat: 24.1997, lon: 82.6645, dc: 1, pop: 4, sites: 16 },
    { city: 'Burhanpur', lat: 21.3144, lon: 76.2294, dc: 1, pop: 4, sites: 15 },
    { city: 'Khandwa', lat: 21.8314, lon: 76.3498, dc: 1, pop: 3, sites: 14 },
    { city: 'Morena', lat: 26.4947, lon: 77.9940, dc: 1, pop: 3, sites: 14 },
    { city: 'Bhind', lat: 26.5644, lon: 78.7884, dc: 1, pop: 3, sites: 14 }
  ]
};

const STATE_CODES = {
  'Goa': 'GA',
  'Chhattisgarh': 'CG',
  'Madhya Pradesh': 'MP'
};

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse entries for Goa, Chhattisgarh, and Madhya Pradesh
const filteredExisting = existing.filter(l => !STATES_DATA[l.state]);

const newSites = [];

for (const [stateName, cities] of Object.entries(STATES_DATA)) {
  const code = STATE_CODES[stateName];
  let seq = 1;

  for (const c of cities) {
    const isMajor = c.city === 'Indore' || c.city === 'Bhopal' || c.city === 'Raipur' || c.city === 'Panaji' || c.city === 'Bhilai' || c.city === 'Margao';
    const sampleCount = isMajor ? 12 : 7;

    for (let i = 0; i < sampleCount; i++) {
      const id = `${code}-STE-${String(seq).padStart(3, '0')}`;
      seq++;

      let type = 'Site';
      if (i === 0 && c.dc > 0) type = 'Datacenter';
      else if (i === 1 && c.pop > 0) type = 'POP';

      const rnd = (seq * 29 + i * 43) % 100;
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

console.log(`Generated ${newSites.length} new locations across Goa, Chhattisgarh, and Madhya Pradesh.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
