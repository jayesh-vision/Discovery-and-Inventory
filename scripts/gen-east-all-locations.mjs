import { readFileSync, writeFileSync } from 'node:fs';

const EAST_CITIES = {
  'West Bengal': [
    { city: 'Kolkata', lat: 22.5726, lon: 88.3639, dc: 6, pop: 18, sites: 48 },
    { city: 'Howrah', lat: 22.5958, lon: 88.2636, dc: 3, pop: 9, sites: 26 },
    { city: 'Siliguri', lat: 26.7271, lon: 88.3953, dc: 3, pop: 8, sites: 24 },
    { city: 'Durgapur', lat: 23.5204, lon: 87.3119, dc: 2, pop: 7, sites: 21 },
    { city: 'Asansol', lat: 23.6739, lon: 86.9524, dc: 2, pop: 6, sites: 20 },
    { city: 'Bardhaman', lat: 23.2324, lon: 87.8615, dc: 2, pop: 5, sites: 18 },
    { city: 'Malda', lat: 25.0108, lon: 88.1411, dc: 2, pop: 5, sites: 17 },
    { city: 'Baharampur', lat: 24.0988, lon: 88.2678, dc: 1, pop: 4, sites: 16 },
    { city: 'Habra', lat: 22.8447, lon: 88.6534, dc: 1, pop: 4, sites: 15 },
    { city: 'Kharagpur', lat: 22.3460, lon: 87.2320, dc: 2, pop: 5, sites: 18 },
    { city: 'Shantipur', lat: 23.2494, lon: 88.4345, dc: 1, pop: 4, sites: 15 },
    { city: 'Dankuni', lat: 22.6844, lon: 88.2936, dc: 1, pop: 4, sites: 15 },
    { city: 'Dhulian', lat: 24.6853, lon: 87.9463, dc: 1, pop: 3, sites: 14 },
    { city: 'Ranaghat', lat: 23.1804, lon: 88.5800, dc: 1, pop: 4, sites: 15 },
    { city: 'Haldia', lat: 22.0667, lon: 88.0698, dc: 2, pop: 5, sites: 17 },
    { city: 'Darjeeling', lat: 27.0410, lon: 88.2663, dc: 1, pop: 4, sites: 16 }
  ],
  'Bihar': [
    { city: 'Patna', lat: 25.5941, lon: 85.1376, dc: 5, pop: 15, sites: 42 },
    { city: 'Gaya', lat: 24.7914, lon: 85.0002, dc: 2, pop: 7, sites: 22 },
    { city: 'Muzaffarpur', lat: 26.1226, lon: 85.3906, dc: 2, pop: 7, sites: 22 },
    { city: 'Purnia', lat: 25.7771, lon: 87.4753, dc: 2, pop: 5, sites: 18 },
    { city: 'Darbhanga', lat: 26.1542, lon: 85.8918, dc: 2, pop: 5, sites: 18 },
    { city: 'Bihar Sharif', lat: 25.1982, lon: 85.5149, dc: 1, pop: 4, sites: 16 },
    { city: 'Arrah', lat: 25.5560, lon: 84.6603, dc: 1, pop: 4, sites: 16 },
    { city: 'Begusarai', lat: 25.4182, lon: 86.1272, dc: 2, pop: 5, sites: 17 },
    { city: 'Katihar', lat: 25.5541, lon: 87.5724, dc: 1, pop: 4, sites: 16 },
    { city: 'Munger', lat: 25.3757, lon: 86.4744, dc: 1, pop: 4, sites: 15 },
    { city: 'Chhapra', lat: 25.7796, lon: 84.7499, dc: 1, pop: 4, sites: 15 },
    { city: 'Danapur', lat: 25.6333, lon: 85.0333, dc: 1, pop: 5, sites: 17 },
    { city: 'Bettiah', lat: 26.8024, lon: 84.5029, dc: 1, pop: 3, sites: 14 },
    { city: 'Saharsa', lat: 25.8835, lon: 86.6006, dc: 1, pop: 3, sites: 14 },
    { city: 'Sasaram', lat: 24.9525, lon: 84.0315, dc: 1, pop: 3, sites: 14 },
    { city: 'Siwan', lat: 26.2207, lon: 84.3567, dc: 1, pop: 3, sites: 14 }
  ],
  'Odisha': [
    { city: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, dc: 5, pop: 14, sites: 40 },
    { city: 'Cuttack', lat: 20.4625, lon: 85.8830, dc: 3, pop: 8, sites: 25 },
    { city: 'Rourkela', lat: 22.2604, lon: 84.8536, dc: 2, pop: 7, sites: 22 },
    { city: 'Berhampur', lat: 19.3150, lon: 84.7941, dc: 2, pop: 6, sites: 20 },
    { city: 'Sambalpur', lat: 21.4669, lon: 83.9812, dc: 2, pop: 6, sites: 19 },
    { city: 'Puri', lat: 19.8135, lon: 85.8312, dc: 2, pop: 5, sites: 18 },
    { city: 'Balasore', lat: 21.4934, lon: 86.9135, dc: 1, pop: 4, sites: 16 },
    { city: 'Bhadrak', lat: 21.0544, lon: 86.4955, dc: 1, pop: 4, sites: 15 },
    { city: 'Baripada', lat: 21.9346, lon: 86.7303, dc: 1, pop: 3, sites: 14 },
    { city: 'Jharsuguda', lat: 21.8554, lon: 84.0062, dc: 2, pop: 5, sites: 17 },
    { city: 'Jeypore', lat: 18.8576, lon: 82.5684, dc: 1, pop: 3, sites: 14 },
    { city: 'Bargarh', lat: 21.3333, lon: 83.6167, dc: 1, pop: 3, sites: 14 },
    { city: 'Rayagada', lat: 19.1667, lon: 83.4167, dc: 1, pop: 3, sites: 14 },
    { city: 'Bolangir', lat: 20.7107, lon: 83.4862, dc: 1, pop: 3, sites: 14 },
    { city: 'Angul', lat: 20.8398, lon: 85.1012, dc: 2, pop: 4, sites: 16 }
  ],
  'Jharkhand': [
    { city: 'Ranchi', lat: 23.3441, lon: 85.3096, dc: 5, pop: 14, sites: 38 },
    { city: 'Jamshedpur', lat: 22.8046, lon: 86.2029, dc: 4, pop: 12, sites: 34 },
    { city: 'Bokaro Steel City', lat: 23.6693, lon: 86.1511, dc: 2, pop: 7, sites: 22 },
    { city: 'Deoghar', lat: 24.4826, lon: 86.7013, dc: 2, pop: 5, sites: 18 },
    { city: 'Phusro', lat: 23.7719, lon: 85.9928, dc: 1, pop: 3, sites: 14 },
    { city: 'Hazaribagh', lat: 23.9937, lon: 85.3637, dc: 1, pop: 4, sites: 16 },
    { city: 'Giridih', lat: 24.1860, lon: 86.3056, dc: 1, pop: 4, sites: 15 },
    { city: 'Ramgarh', lat: 23.6334, lon: 85.5147, dc: 1, pop: 4, sites: 15 },
    { city: 'Medininagar', lat: 24.0416, lon: 84.0722, dc: 1, pop: 3, sites: 14 },
    { city: 'Chirkunda', lat: 23.7483, lon: 86.8122, dc: 1, pop: 3, sites: 14 },
    { city: 'Chaibasa', lat: 22.5539, lon: 85.8118, dc: 1, pop: 3, sites: 14 },
    { city: 'Gumla', lat: 23.0427, lon: 84.5414, dc: 1, pop: 3, sites: 14 },
    { city: 'Dumka', lat: 24.2697, lon: 87.2472, dc: 1, pop: 4, sites: 15 },
    { city: 'Godda', lat: 24.8267, lon: 87.2144, dc: 1, pop: 3, sites: 14 },
    { city: 'Dhanbad', lat: 23.7957, lon: 86.4304, dc: 3, pop: 8, sites: 26 }
  ],
  'Assam': [
    { city: 'Guwahati', lat: 26.1445, lon: 91.7362, dc: 5, pop: 15, sites: 40 },
    { city: 'Silchar', lat: 24.8333, lon: 92.7789, dc: 2, pop: 7, sites: 22 },
    { city: 'Dibrugarh', lat: 27.4728, lon: 94.9120, dc: 2, pop: 7, sites: 22 },
    { city: 'Jorhat', lat: 26.7509, lon: 94.2037, dc: 2, pop: 6, sites: 20 },
    { city: 'Nagaon', lat: 26.3464, lon: 92.6840, dc: 2, pop: 5, sites: 18 },
    { city: 'Tinsukia', lat: 27.4922, lon: 95.3468, dc: 2, pop: 5, sites: 18 },
    { city: 'Tezpur', lat: 26.6528, lon: 92.7926, dc: 2, pop: 5, sites: 17 },
    { city: 'Bongaigaon', lat: 26.4789, lon: 90.5595, dc: 1, pop: 4, sites: 16 },
    { city: 'Dhubri', lat: 26.0207, lon: 89.9740, dc: 1, pop: 4, sites: 15 },
    { city: 'Diphu', lat: 25.8456, lon: 93.4303, dc: 1, pop: 3, sites: 14 },
    { city: 'North Lakhimpur', lat: 27.2346, lon: 94.1037, dc: 1, pop: 4, sites: 15 },
    { city: 'Karimganj', lat: 24.8697, lon: 92.3592, dc: 1, pop: 3, sites: 14 },
    { city: 'Sivasagar', lat: 26.9826, lon: 94.6425, dc: 2, pop: 4, sites: 16 },
    { city: 'Goalpara', lat: 26.1774, lon: 90.6253, dc: 1, pop: 3, sites: 14 },
    { city: 'Barpeta', lat: 26.3211, lon: 91.0042, dc: 1, pop: 3, sites: 14 }
  ],
  'Sikkim': [
    { city: 'Gangtok', lat: 27.3389, lon: 88.6065, dc: 3, pop: 8, sites: 24 },
    { city: 'Namchi', lat: 27.1667, lon: 88.3500, dc: 2, pop: 5, sites: 17 },
    { city: 'Geyzing', lat: 27.2889, lon: 88.2500, dc: 1, pop: 4, sites: 15 },
    { city: 'Mangan', lat: 27.5089, lon: 88.5283, dc: 1, pop: 3, sites: 14 },
    { city: 'Rangpo', lat: 27.1764, lon: 88.5303, dc: 2, pop: 5, sites: 18 },
    { city: 'Jorethang', lat: 27.1264, lon: 88.3147, dc: 1, pop: 4, sites: 16 },
    { city: 'Singtam', lat: 27.2356, lon: 88.4975, dc: 1, pop: 4, sites: 16 },
    { city: 'Ravangla', lat: 27.3061, lon: 88.3639, dc: 1, pop: 3, sites: 14 },
    { city: 'Pakyong', lat: 27.2403, lon: 88.5889, dc: 2, pop: 5, sites: 17 },
    { city: 'Soreng', lat: 27.1667, lon: 88.2000, dc: 1, pop: 3, sites: 14 },
    { city: 'Yuksom', lat: 27.3711, lon: 88.2217, dc: 1, pop: 3, sites: 13 },
    { city: 'Lachung', lat: 27.6891, lon: 88.7430, dc: 1, pop: 3, sites: 13 },
    { city: 'Chungthang', lat: 27.6039, lon: 88.6472, dc: 1, pop: 3, sites: 13 },
    { city: 'Rhenock', lat: 27.1833, lon: 88.6333, dc: 1, pop: 3, sites: 13 },
    { city: 'Nayabazar', lat: 27.1333, lon: 88.2833, dc: 1, pop: 3, sites: 13 }
  ],
  'North East (Other)': [
    { city: 'Shillong', lat: 25.5788, lon: 91.8933, dc: 3, pop: 9, sites: 28 },
    { city: 'Imphal', lat: 24.8170, lon: 93.9368, dc: 2, pop: 7, sites: 22 },
    { city: 'Aizawl', lat: 23.7271, lon: 92.7176, dc: 2, pop: 7, sites: 22 },
    { city: 'Kohima', lat: 25.6701, lon: 94.1077, dc: 2, pop: 6, sites: 20 },
    { city: 'Agartala', lat: 23.8315, lon: 91.2868, dc: 2, pop: 7, sites: 22 },
    { city: 'Itanagar', lat: 27.0844, lon: 93.6053, dc: 2, pop: 6, sites: 20 },
    { city: 'Dimapur', lat: 25.9095, lon: 93.7266, dc: 3, pop: 9, sites: 28 },
    { city: 'Tura', lat: 25.5144, lon: 90.2035, dc: 1, pop: 4, sites: 16 },
    { city: 'Lunglei', lat: 22.8876, lon: 92.7420, dc: 1, pop: 4, sites: 15 },
    { city: 'Churachandpur', lat: 24.3333, lon: 93.6667, dc: 1, pop: 4, sites: 15 },
    { city: 'Mokokchung', lat: 26.3262, lon: 94.5204, dc: 1, pop: 4, sites: 15 },
    { city: 'Dharmanagar', lat: 24.3739, lon: 92.1642, dc: 1, pop: 4, sites: 15 },
    { city: 'Pasighat', lat: 28.0667, lon: 95.3333, dc: 1, pop: 4, sites: 15 },
    { city: 'Naharlagun', lat: 27.1067, lon: 93.6936, dc: 1, pop: 4, sites: 16 },
    { city: 'Along', lat: 28.1694, lon: 94.8014, dc: 1, pop: 3, sites: 14 }
  ]
};

const STATE_CODE = {
  'West Bengal': 'WB',
  'Bihar': 'BR',
  'Odisha': 'OR',
  'Jharkhand': 'JH',
  'Assam': 'AS',
  'Sikkim': 'SK',
  'North East (Other)': 'NE'
};

const existing = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

// Filter out old East region sites to replace with complete dense distribution
const nonEast = existing.filter(l => !EAST_CITIES[l.state]);

const newSites = [];

for (const [stateName, cities] of Object.entries(EAST_CITIES)) {
  const code = STATE_CODE[stateName];
  let seq = 1;

  for (const c of cities) {
    const isMajor = c.dc >= 3 || c.city === 'Dimapur';
    const sampleCount = isMajor ? 12 : 5;

    for (let i = 0; i < sampleCount; i++) {
      const id = `${code}-STE-${String(seq).padStart(3, '0')}`;
      seq++;

      let type = 'Site';
      if (i === 0 && c.dc > 0) type = 'Datacenter';
      else if (i === 1 && c.pop > 0) type = 'PoP';

      const rnd = (seq * 17 + i * 29) % 100;
      let st = 'On-air';
      let chip = 'success';
      if (rnd > 97) {
        st = 'Failed';
        chip = 'danger';
      } else if (rnd > 88) {
        st = 'Planned';
        chip = 'info';
      } else if (rnd > 73) {
        st = 'In progress';
        chip = 'warning';
      }

      const dLat = (((i * 7) % 11) - 5) * 0.008;
      const dLon = (((i * 13) % 11) - 5) * 0.008;

      const neCount = type === 'Datacenter' ? 140 : type === 'PoP' ? 68 : 24;
      const discCount = st === 'On-air' ? neCount : Math.round(neCount * 0.7);

      newSites.push({
        st,
        chip,
        name: `${c.city} ${type} #${i + 1}`,
        cat: 'Central',
        ct: 'amber',
        type,
        id,
        addr: `${c.city} Sector ${i + 1} Station Area`,
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

const combined = [...nonEast, ...newSites];
writeFileSync('src/data/allLocations.json', JSON.stringify(combined, null, 2));

console.log(`Generated ${newSites.length} new East region sites across all cities.`);
console.log(`Total estate locations in allLocations.json: ${combined.length}`);
