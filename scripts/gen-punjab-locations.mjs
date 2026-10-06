import { readFileSync, writeFileSync } from 'node:fs';

const PUNJAB_CITIES = [
  { city: 'Ludhiana', lat: 30.9010, lon: 75.8573, dc: 6, pop: 18, sites: 48 },
  { city: 'Amritsar', lat: 31.6340, lon: 74.8723, dc: 4, pop: 14, sites: 36 },
  { city: 'Jalandhar', lat: 31.3260, lon: 75.5762, dc: 3, pop: 11, sites: 30 },
  { city: 'Mohali', lat: 30.7046, lon: 76.7179, dc: 4, pop: 12, sites: 32 },
  { city: 'Patiala', lat: 30.3398, lon: 76.3869, dc: 2, pop: 7, sites: 22 },
  { city: 'Bathinda', lat: 30.2110, lon: 74.9455, dc: 2, pop: 7, sites: 22 },
  { city: 'Pathankot', lat: 32.2686, lon: 75.6522, dc: 2, pop: 6, sites: 20 },
  { city: 'Hoshiarpur', lat: 31.5273, lon: 75.9149, dc: 1, pop: 4, sites: 16 },
  { city: 'Moga', lat: 30.8230, lon: 75.1734, dc: 1, pop: 4, sites: 15 },
  { city: 'Firozpur', lat: 30.9237, lon: 74.6136, dc: 1, pop: 4, sites: 15 },
  { city: 'Batala', lat: 31.8186, lon: 75.2028, dc: 1, pop: 4, sites: 15 },
  { city: 'Abohar', lat: 30.1453, lon: 74.1994, dc: 1, pop: 3, sites: 14 },
  { city: 'Malerkotla', lat: 30.5256, lon: 75.8901, dc: 1, pop: 3, sites: 14 },
  { city: 'Khanna', lat: 30.7071, lon: 76.2166, dc: 1, pop: 3, sites: 14 },
  { city: 'Muktsar', lat: 30.4744, lon: 74.5165, dc: 1, pop: 3, sites: 14 },
  { city: 'Barnala', lat: 30.3819, lon: 75.5467, dc: 1, pop: 3, sites: 14 }
];

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old sparse Punjab sites to replace with dense distribution across all 16 cities
const nonPunjab = existing.filter(l => l.state !== 'Punjab');

const newPunjabSites = [];
let seq = 1;

for (const c of PUNJAB_CITIES) {
  const isMajor = c.dc >= 3 || c.city === 'Mohali';
  const sampleCount = isMajor ? 12 : 6;

  for (let i = 0; i < sampleCount; i++) {
    const id = `PB-STE-${String(seq).padStart(3, '0')}`;
    seq++;

    let type = 'Site';
    if (i === 0 && c.dc > 0) type = 'Datacenter';
    else if (i === 1 && c.pop > 0) type = 'PoP';

    const rnd = (seq * 19 + i * 31) % 100;
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

    const neCount = type === 'Datacenter' ? 142 : type === 'PoP' ? 68 : 26;
    const discCount = st === 'On-air' ? neCount : Math.round(neCount * 0.7);

    newPunjabSites.push({
      st,
      chip,
      name: `${c.city} ${type} #${i + 1}`,
      cat: 'Central',
      ct: 'amber',
      type,
      id,
      addr: `${c.city} GT Road Area #${i + 1}`,
      city: c.city,
      state: 'Punjab',
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

const combined = [...nonPunjab, ...newPunjabSites];
writeFileSync('src/data/allLocations.json', JSON.stringify(combined, null, 2));

console.log(`Generated ${newPunjabSites.length} new Punjab locations across all 16 cities.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
