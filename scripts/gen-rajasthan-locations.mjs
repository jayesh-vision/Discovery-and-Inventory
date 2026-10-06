import { readFileSync, writeFileSync } from 'node:fs';

const RAJASTHAN_CITIES = [
  { city: 'Jaipur', lat: 26.9124, lon: 75.7873, dc: 6, pop: 18, sites: 52 },
  { city: 'Jodhpur', lat: 26.2389, lon: 73.0243, dc: 4, pop: 14, sites: 40 },
  { city: 'Kota', lat: 25.2138, lon: 75.8648, dc: 3, pop: 11, sites: 30 },
  { city: 'Udaipur', lat: 24.5854, lon: 73.7125, dc: 3, pop: 11, sites: 30 },
  { city: 'Bikaner', lat: 28.0229, lon: 73.3119, dc: 2, pop: 8, sites: 24 },
  { city: 'Ajmer', lat: 26.4499, lon: 74.6399, dc: 2, pop: 8, sites: 24 },
  { city: 'Bhilwara', lat: 25.3407, lon: 74.6313, dc: 2, pop: 7, sites: 22 },
  { city: 'Alwar', lat: 27.5530, lon: 76.6346, dc: 2, pop: 7, sites: 22 },
  { city: 'Bharatpur', lat: 27.2152, lon: 77.5030, dc: 1, pop: 5, sites: 18 },
  { city: 'Sikar', lat: 27.6094, lon: 75.1399, dc: 1, pop: 5, sites: 18 },
  { city: 'Pali', lat: 25.7711, lon: 73.3234, dc: 1, pop: 4, sites: 16 },
  { city: 'Sri Ganganagar', lat: 29.9094, lon: 73.8799, dc: 1, pop: 4, sites: 16 },
  { city: 'Beawar', lat: 26.1013, lon: 74.3213, dc: 1, pop: 3, sites: 14 },
  { city: 'Hanumangarh', lat: 29.5813, lon: 74.3164, dc: 1, pop: 3, sites: 14 },
  { city: 'Dholpur', lat: 26.7025, lon: 77.8934, dc: 1, pop: 3, sites: 14 },
  { city: 'Tonk', lat: 26.1664, lon: 75.7885, dc: 1, pop: 3, sites: 14 }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse Rajasthan entries
const filteredExisting = existing.filter(l => l.state !== 'Rajasthan');

const newSites = [];
let seq = 1;

for (const c of RAJASTHAN_CITIES) {
  const isMajor = c.city === 'Jaipur' || c.city === 'Jodhpur' || c.city === 'Kota' || c.city === 'Udaipur';
  const sampleCount = isMajor ? 14 : 8;

  for (let i = 0; i < sampleCount; i++) {
    const id = `RJ-STE-${String(seq).padStart(3, '0')}`;
    seq++;

    let type = 'Site';
    if (i === 0 && c.dc > 0) type = 'Datacenter';
    else if (i === 1 && c.pop > 0) type = 'POP';

    const rnd = (seq * 31 + i * 47) % 100;
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

    const dLat = (((i * 7) % 11) - 5) * 0.008;
    const dLon = (((i * 13) % 11) - 5) * 0.008;

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
      state: 'Rajasthan',
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

const combined = [...filteredExisting, ...newSites];
writeFileSync('src/data/allLocations.json', JSON.stringify(combined, null, 2));

console.log(`Generated ${newSites.length} new locations across all 16 Rajasthan cities.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
