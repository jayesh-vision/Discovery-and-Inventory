/* Generates src/data/sites.json: sites inside each state polygon, with the
   state's router/switch counts distributed across them. Deterministic. */
import { readFileSync, writeFileSync } from 'node:fs';
const geo = JSON.parse(readFileSync('src/data/geo.json', 'utf8'));
const src = readFileSync('src/data/discovery.ts', 'utf8');
const states = [...src.matchAll(/\{ st: '([^']+)',\s*c: '(\w+)',\s*region: '(\w+)',\s*lat: ([\d.]+),\s*lon: ([\d.]+),\s*router: (\d+),\s*switch: (\d+) \}/g)]
  .map(m => ({ st: m[1], c: m[2], region: m[3], lat: +m[4], lon: +m[5], router: +m[6], switch: +m[7] }));

const CITIES = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Noida', 'Gorakhpur'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Bagalkot'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'Delhi': ['Connaught Place', 'Dwarka', 'Rohini', 'Okhla', 'Janakpuri'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Tirupati', 'Nellore'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Durgapur', 'Asansol'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Mohali'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Udhampur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Haldwani']
};
const TYPES = ['POP', 'Cell Site', 'Macro-O', 'Micro-CO', 'Data centre'];

/* geometry: parse a compound path into rings, point-in-polygon, bbox */
const rings = d => d.split('M').filter(Boolean).map(seg => seg.split(/[LZ]/).filter(Boolean).map(p => p.trim().split(' ').map(Number)).filter(p => p.length === 2 && !p.some(isNaN)));
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
  const [xi, yi] = r[i], [xj, yj] = r[j];
  if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; };
const area = r => Math.abs(r.reduce((a, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return a + x * y2 - x2 * y; }, 0)) / 2;
const bbox = rs => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of rs) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
const lcg = seed => { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

const out = [], bboxes = {};
for (const s of states) {
  const d = geo.paths[s.st]; if (!d) throw new Error('no polygon for ' + s.st);
  const rs = rings(d).filter(r => r.length > 3), main = rs.sort((a, b) => area(b) - area(a))[0];
  const bb = bbox(rs); bboxes[s.st] = bb.map(v => +v.toFixed(1));
  const r = lcg(s.st.length * 131 + s.router), cities = CITIES[s.st], n = cities.length;
  /* split counts: weights sum to total, first site gets the lion's share */
  const split = (total, n) => { const w = Array.from({ length: n }, (_, i) => 1 / (i + 1.4) + r() * 0.15); const sw = w.reduce((a, b) => a + b, 0);
    const parts = w.map(x => Math.floor(total * x / sw)); let rem = total - parts.reduce((a, b) => a + b, 0); for (let i = 0; rem > 0; i = (i + 1) % n, rem--) parts[i]++; return parts; };
  const rr = split(s.router, n), ss = split(s.switch, n);
  /* place sites inside the main ring, well apart from each other */
  const pts = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (let t = 0; t < 400; t++) {
      const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]);
      if (!inRing(x, y, main)) continue;
      const dmin = Math.min(...pts.map(p => Math.hypot(p[0] - x, p[1] - y)), 1e9);
      if (!best || dmin > best[2]) best = [x, y, dmin];
      if (dmin > 28) break;
    }
    pts.push(best);
    out.push({ id: `${s.c}-${String(101 + i * 17).padStart(3, '0')}`, name: `${cities[i]} ${['Core', 'POP', 'Agg', 'Edge', 'Access', 'Access'][i]}`, city: cities[i],
      st: s.st, c: s.c, region: s.region, type: TYPES[i % TYPES.length], x: +best[0].toFixed(1), y: +best[1].toFixed(1), router: rr[i], switch: ss[i] });
  }
}
/* self-check */
for (const s of states) {
  const mine = out.filter(o => o.st === s.st);
  const rsum = mine.reduce((a, o) => a + o.router, 0), ssum = mine.reduce((a, o) => a + o.switch, 0);
  if (rsum !== s.router || ssum !== s.switch) throw new Error(`sites ≠ state for ${s.st}: ${rsum}/${s.router} ${ssum}/${s.switch}`);
}
writeFileSync('src/data/sites.json', JSON.stringify({ sites: out, bboxes }));
console.log(out.length, 'sites across', states.length, 'states');
