import { readFileSync, writeFileSync } from 'node:fs';

const HARYANA_CITIES = [
  { city: 'Karnal', lat: 29.6857, lon: 76.9905, dc: 4, pop: 12, sites: 34 },
  { city: 'Rohtak', lat: 28.8955, lon: 76.6066, dc: 3, pop: 11, sites: 30 },
  { city: 'Hisar', lat: 29.1492, lon: 75.7217, dc: 3, pop: 10, sites: 28 },
  { city: 'Ambala', lat: 30.3782, lon: 76.7767, dc: 3, pop: 10, sites: 28 },
  { city: 'Yamunanagar', lat: 30.1290, lon: 77.2674, dc: 2, pop: 8, sites: 24 },
  { city: 'Panchkula', lat: 30.6942, lon: 76.8606, dc: 3, pop: 9, sites: 26 },
  { city: 'Kurukshetra', lat: 29.9695, lon: 76.8783, dc: 2, pop: 6, sites: 20 },
  { city: 'Bahadurgarh', lat: 28.6924, lon: 76.9240, dc: 2, pop: 7, sites: 22 },
  { city: 'Rewari', lat: 28.1838, lon: 76.6186, dc: 2, pop: 6, sites: 20 },
  { city: 'Palwal', lat: 28.1438, lon: 77.3258, dc: 1, pop: 5, sites: 18 },
  { city: 'Bhiwani', lat: 28.7830, lon: 76.1319, dc: 1, pop: 4, sites: 16 },
  { city: 'Sirsa', lat: 29.5330, lon: 75.0298, dc: 1, pop: 4, sites: 16 },
  { city: 'Jind', lat: 29.3140, lon: 76.3140, dc: 1, pop: 4, sites: 15 },
  { city: 'Thanesar', lat: 29.9800, lon: 76.8200, dc: 1, pop: 3, sites: 14 },
  { city: 'Kaithal', lat: 29.8015, lon: 76.3996, dc: 1, pop: 3, sites: 14 }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse Haryana sites to replace with dense distribution across all 15 cities
const nonHaryana = existing.filter(l => l.state !== 'Haryana');

const newHaryanaSites = [];
let seq = 1;

for (const c of HARYANA_CITIES) {
  const isMajor = c.dc >= 3 || c.city === 'Panchkula';
  const sampleCount = isMajor ? 12 : 6;

  for (let i = 0; i < sampleCount; i++) {
    const id = `HR-STE-${String(seq).padStart(3, '0')}`;
    seq++;

    let type = 'Site';
    if (i === 0 && c.dc > 0) type = 'Datacenter';
    else if (i === 1 && c.pop > 0) type = 'PoP';

    const rnd = (seq * 23 + i * 37) % 100;
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

    newHaryanaSites.push({
      st,
      chip,
      name: `${c.city} ${type} #${i + 1}`,
      cat: 'Central',
      ct: 'amber',
      type,
      id,
      addr: `${c.city} Sector Area #${i + 1}`,
      city: c.city,
      state: 'Haryana',
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

const combined = [...nonHaryana, ...newHaryanaSites];
writeFileSync('src/data/allLocations.json', JSON.stringify(combined, null, 2));

console.log(`Generated ${newHaryanaSites.length} new Haryana locations across all 15 cities.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
