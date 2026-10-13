import { readFileSync, writeFileSync } from 'node:fs';

const tnCityData = [
  { id: 'tn-chennai', name: 'Chennai', dc: 5, pop: 12, site: 34 },
  { id: 'tn-coimbatore', name: 'Coimbatore', dc: 3, pop: 7, site: 22 },
  { id: 'tn-madurai', name: 'Madurai', dc: 2, pop: 6, site: 20 },
  { id: 'tn-salem', name: 'Salem', dc: 2, pop: 5, site: 18 },
  { id: 'tamilnadu-tiruchirappalli', name: 'Tiruchirappalli', dc: 2, pop: 5, site: 18 },
  { id: 'tamilnadu-tiruppur', name: 'Tiruppur', dc: 2, pop: 5, site: 16 },
  { id: 'tamilnadu-erode', name: 'Erode', dc: 1, pop: 4, site: 16 },
  { id: 'tamilnadu-tirunelveli', name: 'Tirunelveli', dc: 2, pop: 4, site: 15 },
  { id: 'tamilnadu-vellore', name: 'Vellore', dc: 2, pop: 4, site: 16 },
  { id: 'tamilnadu-thoothukudi', name: 'Thoothukudi', dc: 1, pop: 4, site: 15 },
  { id: 'tamilnadu-dindigul', name: 'Dindigul', dc: 1, pop: 4, site: 15 },
  { id: 'tamilnadu-thanjavur', name: 'Thanjavur', dc: 1, pop: 4, site: 15 },
  { id: 'tamilnadu-karur', name: 'Karur', dc: 1, pop: 4, site: 14 },
  { id: 'tamilnadu-sivakasi', name: 'Sivakasi', dc: 1, pop: 4, site: 14 },
  { id: 'tamilnadu-ooty', name: 'Ooty', dc: 1, pop: 3, site: 12 },

  { id: 'py-pondicherry', name: 'Puducherry', dc: 2, pop: 5, site: 18 },
  { id: 'puducherry-karaikal', name: 'Karaikal', dc: 1, pop: 4, site: 14 },
  { id: 'puducherry-mahe', name: 'Mahe', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-yanam', name: 'Yanam', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-ozhukarai', name: 'Ozhukarai', dc: 1, pop: 4, site: 14 },
  { id: 'puducherry-villianur', name: 'Villianur', dc: 1, pop: 3, site: 13 },
  { id: 'puducherry-ariyankuppam', name: 'Ariyankuppam', dc: 1, pop: 3, site: 13 },
  { id: 'puducherry-bahour', name: 'Bahour', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-mannadipet', name: 'Mannadipet', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-nettapakkam', name: 'Nettapakkam', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-kottucherry', name: 'Kottucherry', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-thirunallar', name: 'Thirunallar', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-neravy', name: 'Neravy', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-kirumampakkam', name: 'Kirumampakkam', dc: 1, pop: 3, site: 12 },
  { id: 'puducherry-lawspet', name: 'Lawspet', dc: 1, pop: 4, site: 14 },

  { id: 'an-portblair', name: 'Port Blair', dc: 2, pop: 5, site: 18 },
  { id: 'andaman-diglipur', name: 'Diglipur', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-mayabunder', name: 'Mayabunder', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-rangat', name: 'Rangat', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-havelock', name: 'Havelock (Swaraj Dweep)', dc: 1, pop: 4, site: 13 },
  { id: 'andaman-neil-island', name: 'Neil Island (Shaheed Dweep)', dc: 1, pop: 3, site: 11 },
  { id: 'andaman-car-nicobar', name: 'Car Nicobar', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-campbell-bay', name: 'Campbell Bay', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-little-andaman', name: 'Little Andaman', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-baratang', name: 'Baratang', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-wandoor', name: 'Wandoor', dc: 1, pop: 3, site: 12 },
  { id: 'andaman-garacharma', name: 'Garacharma', dc: 1, pop: 4, site: 14 },
  { id: 'andaman-prothrapur', name: 'Prothrapur', dc: 1, pop: 4, site: 14 },
  { id: 'andaman-bambooflat', name: 'Bambooflat', dc: 1, pop: 4, site: 14 },
  { id: 'andaman-ferrargunj', name: 'Ferrargunj', dc: 1, pop: 3, site: 12 }
];

// 1. Update geographicHierarchy.ts
const hierarchyPath = 'src/data/geographicHierarchy.ts';
let code = readFileSync(hierarchyPath, 'utf8');

// Update TOP_HIERARCHY_METRICS
code = code.replace(
  /{ id: 'datacenters', label: 'Data Centers', count: '[^']+'/,
  "{ id: 'datacenters', label: 'Data Centers', count: '826'"
);
code = code.replace(
  /{ id: 'pops', label: 'PoP Locations', count: '[^']+'/,
  "{ id: 'pops', label: 'PoP Locations', count: '2,711'"
);
code = code.replace(
  /{ id: 'sites', label: 'Sites', count: '[^']+'/,
  "{ id: 'sites', label: 'Sites', count: '8,935'"
);

// Update each city in GEOGRAPHIC_HIERARCHY
for (const c of tnCityData) {
  const total = c.dc + c.pop + c.site;
  // Regex to match the city block in GEOGRAPHIC_HIERARCHY
  const regex = new RegExp(
    `("id":\\s*"${c.id}",\\s*"name":\\s*"[^"]+",\\s*)"count":\\s*\\d+,(\\s*"stateId":\\s*"tamilnadu",\\s*)"dcCount":\\s*\\d+,(\\s*)"popCount":\\s*\\d+,(\\s*)"siteCount":\\s*\\d+`,
    'g'
  );
  if (regex.test(code)) {
    code = code.replace(regex, `$1"count": ${total},$2"dcCount": ${c.dc},$3"popCount": ${c.pop},$4"siteCount": ${c.site}`);
  } else {
    console.warn(`Could not match regex for city ${c.id}`);
  }
}

writeFileSync(hierarchyPath, code);
console.log('Updated src/data/geographicHierarchy.ts successfully!');
