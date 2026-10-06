import { readFileSync, writeFileSync } from 'node:fs';

const locs = JSON.parse(readFileSync('src/data/allLocations.json', 'utf8'));

const cityCoords = {
  'Chennai': { lat: 13.0827, lon: 80.2707, prefix: 'CHE' },
  'Coimbatore': { lat: 11.0168, lon: 76.9558, prefix: 'CBE' },
  'Madurai': { lat: 9.9252, lon: 78.1198, prefix: 'MDU' },
  'Salem': { lat: 11.6643, lon: 78.1460, prefix: 'SLM' },
  'Tiruchirappalli': { lat: 10.7905, lon: 78.7047, prefix: 'TPJ' },
  'Tiruppur': { lat: 11.1085, lon: 77.3411, prefix: 'TPR' },
  'Erode': { lat: 11.3410, lon: 77.7172, prefix: 'ERD' },
  'Tirunelveli': { lat: 8.7139, lon: 77.7567, prefix: 'TEN' },
  'Vellore': { lat: 12.9165, lon: 79.1325, prefix: 'VLR' },
  'Thoothukudi': { lat: 8.7642, lon: 78.1348, prefix: 'TUT' },
  'Dindigul': { lat: 10.3673, lon: 77.9803, prefix: 'DGL' },
  'Thanjavur': { lat: 10.7870, lon: 79.1378, prefix: 'TNJ' },
  'Karur': { lat: 10.9601, lon: 78.0766, prefix: 'KRR' },
  'Sivakasi': { lat: 9.4533, lon: 77.7979, prefix: 'SVK' },
  'Ooty': { lat: 11.4102, lon: 76.6950, prefix: 'UAM' },

  'Puducherry': { lat: 11.9416, lon: 79.8083, prefix: 'PDY' },
  'Karaikal': { lat: 10.9254, lon: 79.8380, prefix: 'KRK' },
  'Mahe': { lat: 11.7002, lon: 75.5340, prefix: 'MAH' },
  'Yanam': { lat: 16.7330, lon: 82.2175, prefix: 'YNM' },
  'Ozhukarai': { lat: 11.9538, lon: 79.7758, prefix: 'OZH' },
  'Villianur': { lat: 11.9160, lon: 79.7547, prefix: 'VIL' },
  'Ariyankuppam': { lat: 11.8988, lon: 79.8028, prefix: 'AYK' },
  'Bahour': { lat: 11.8028, lon: 79.7431, prefix: 'BAH' },
  'Mannadipet': { lat: 11.9892, lon: 79.6450, prefix: 'MND' },
  'Nettapakkam': { lat: 11.8672, lon: 79.6375, prefix: 'NET' },
  'Kottucherry': { lat: 10.9780, lon: 79.8450, prefix: 'KTC' },
  'Thirunallar': { lat: 10.9300, lon: 79.7900, prefix: 'THN' },
  'Neravy': { lat: 10.8750, lon: 79.8350, prefix: 'NRV' },
  'Kirumampakkam': { lat: 11.8210, lon: 79.7890, prefix: 'KRM' },
  'Lawspet': { lat: 11.9680, lon: 79.8150, prefix: 'LWP' },

  'Port Blair': { lat: 11.6234, lon: 92.7265, prefix: 'IXZ' },
  'Diglipur': { lat: 13.2667, lon: 92.9833, prefix: 'DGP' },
  'Mayabunder': { lat: 12.9167, lon: 92.9333, prefix: 'MYB' },
  'Rangat': { lat: 12.5000, lon: 92.9000, prefix: 'RGT' },
  'Havelock (Swaraj Dweep)': { lat: 12.0000, lon: 93.0000, prefix: 'HVK' },
  'Neil Island (Shaheed Dweep)': { lat: 11.8333, lon: 93.0500, prefix: 'NLS' },
  'Car Nicobar': { lat: 9.1667, lon: 92.8167, prefix: 'CNC' },
  'Campbell Bay': { lat: 7.0000, lon: 93.9333, prefix: 'CPB' },
  'Little Andaman': { lat: 10.7500, lon: 92.5000, prefix: 'LTA' },
  'Baratang': { lat: 12.1333, lon: 92.7500, prefix: 'BRT' },
  'Wandoor': { lat: 11.6000, lon: 92.6167, prefix: 'WDR' },
  'Garacharma': { lat: 11.6167, lon: 92.7167, prefix: 'GCM' },
  'Prothrapur': { lat: 11.6333, lon: 92.7167, prefix: 'PTP' },
  'Bambooflat': { lat: 11.7000, lon: 92.7167, prefix: 'BFL' },
  'Ferrargunj': { lat: 11.7333, lon: 92.6500, prefix: 'FRG' }
};

// Check existing counts
const existingCounts = {};
for (const l of locs) {
  if (l.state === 'Tamil Nadu') {
    existingCounts[l.city] = (existingCounts[l.city] || 0) + 1;
  }
}

const siteTypes = [
  'Central Hub Tower',
  'Sector Micro Cell',
  'Macro Rooftop Site',
  'Highway Gateway Tower',
  'Commercial Complex 5G',
  'Industrial Park Node',
  'Residential Fiber Hub',
  'Transit Aggregation PoP',
  'Railway Station IBS',
  'Tech Park Edge Unit'
];

const statuses = ['On-air', 'On-air', 'On-air', 'In progress', 'Planned'];

let newPins = 0;
for (const [cityName, info] of Object.entries(cityCoords)) {
  const currentCount = existingCounts[cityName] || 0;
  const targetCount = 10; // ensure every city has at least 10 pins in allLocations.json
  const need = Math.max(0, targetCount - currentCount);

  for (let i = 0; i < need; i++) {
    const idx = currentCount + i + 1;
    const type = siteTypes[i % siteTypes.length];
    const status = statuses[i % statuses.length];
    const dLat = (Math.sin(idx * 1.7) * 0.04);
    const dLon = (Math.cos(idx * 2.3) * 0.04);
    const ne = 8 + (idx % 12);
    const disc = status === 'On-air' ? ne : status === 'In progress' ? Math.floor(ne * 0.7) : Math.floor(ne * 0.3);

    locs.push({
      id: `SITE-TN-${info.prefix}-${String(idx).padStart(3, '0')}`,
      name: `${cityName} ${type} #${idx}`,
      st: status,
      state: 'Tamil Nadu',
      city: cityName,
      ne,
      disc,
      lat: Number((info.lat + dLat).toFixed(4)),
      lon: Number((info.lon + dLon).toFixed(4))
    });
    newPins++;
  }
}

writeFileSync('src/data/allLocations.json', JSON.stringify(locs, null, 2));
console.log(`Added ${newPins} new pins for Tamil Nadu cities to allLocations.json! Total pins now: ${locs.length}`);
