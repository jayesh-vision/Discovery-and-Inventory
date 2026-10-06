import { readFileSync, writeFileSync } from 'node:fs';

const KERALA_CITIES = [
  { city: 'Kochi', lat: 9.9312, lon: 76.2673, dc: 6, pop: 18, sites: 48 },
  { city: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, dc: 5, pop: 15, sites: 42 },
  { city: 'Kozhikode', lat: 11.2588, lon: 75.7804, dc: 3, pop: 11, sites: 30 },
  { city: 'Thrissur', lat: 10.5276, lon: 76.2144, dc: 3, pop: 10, sites: 28 },
  { city: 'Kollam', lat: 8.8932, lon: 76.6141, dc: 2, pop: 8, sites: 24 },
  { city: 'Kannur', lat: 11.8745, lon: 75.3704, dc: 2, pop: 7, sites: 22 },
  { city: 'Alappuzha', lat: 9.4981, lon: 76.3388, dc: 2, pop: 6, sites: 20 },
  { city: 'Kottayam', lat: 9.5916, lon: 76.5222, dc: 2, pop: 6, sites: 20 },
  { city: 'Palakkad', lat: 10.7867, lon: 76.6548, dc: 2, pop: 6, sites: 20 },
  { city: 'Manjeri', lat: 11.1202, lon: 76.1213, dc: 1, pop: 5, sites: 18 },
  { city: 'Thalassery', lat: 11.7490, lon: 75.4890, dc: 1, pop: 5, sites: 18 },
  { city: 'Ponnani', lat: 10.7719, lon: 75.9250, dc: 1, pop: 4, sites: 16 },
  { city: 'Vatakara', lat: 11.6089, lon: 75.5917, dc: 1, pop: 4, sites: 16 },
  { city: 'Kanhangad', lat: 12.3080, lon: 75.0911, dc: 1, pop: 3, sites: 14 },
  { city: 'Payyanur', lat: 12.1009, lon: 75.2014, dc: 1, pop: 3, sites: 14 }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse entries for Kerala
const filteredExisting = existing.filter(l => l.state !== 'Kerala');

const newSites = [];
let seq = 1;

for (const c of KERALA_CITIES) {
  const isMajor = c.city === 'Kochi' || c.city === 'Thiruvananthapuram' || c.city === 'Kozhikode' || c.city === 'Thrissur';
  const sampleCount = isMajor ? 14 : 8;

  for (let i = 0; i < sampleCount; i++) {
    const id = `KL-STE-${String(seq).padStart(3, '0')}`;
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
      state: 'Kerala',
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

console.log(`Generated ${newSites.length} new locations across all 15 Kerala cities.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
