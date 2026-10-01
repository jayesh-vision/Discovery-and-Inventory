// ============================================================
//  Fault Management (Network Alerts) — NOC mock data.
//  Domain focus: alert triage & noise reduction, not SLA.
// ============================================================

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// --- The reference clock -------------------------------------------------
// One fixed instant that every timestamp, age and axis label in this module is
// measured from. Fixed rather than Date.now() so the estate is deterministic —
// and shared rather than repeated, so an alert's age, the hour its bar sits in
// and the label under that bar can never disagree.
export const NOW = Date.UTC(2026, 7, 20, 9, 0, 0)   // 20 Aug 2026, 09:00
const pad2 = n => String(n).padStart(2, '0')
const pad = (n, w) => String(n).padStart(w, '0')
const hourAt = minsBack => new Date(NOW - minsBack * 60000).getUTCHours()

/* A clock that walks backwards from the reference instant, so timestamps
   order correctly and never move between reloads. Four renderings of the same
   instant, because the source systems report it four ways. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const at = minsAgo => new Date(NOW - minsAgo * 60000)
function stamp(minsAgo, { seconds = true } = {}) {
  const d = at(minsAgo)
  const t = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
  const date = `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`
  return seconds ? `${date} ${t}:${pad2(d.getUTCSeconds())}` : `${date} ${t}`
}
const shortStamp = minsAgo => {
  const d = at(minsAgo)
  return `${pad2(d.getUTCDate())}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
}
/* The same instant, offset by a number of seconds — an event feed whose rows
   all land on :00 reads as generated, because it is. */
const stampSec = (minsAgo, secsBack = 0) => {
  const d = new Date(NOW - minsAgo * 60000 - secsBack * 1000)
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()} `
    + `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
}
/* A clock time, carrying the day when it is not today's. Bare HH:MM across a
   24-hour window makes 19:17 look later than 05:09 when it is thirteen hours
   earlier. */
const hhmm = minsAgo => {
  const d = at(minsAgo)
  const t = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
  const today = new Date(NOW)
  return d.getUTCDate() === today.getUTCDate() ? t : `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${t}`
}
/* The stamp the UI shows as "when this view was compiled". */
export const AS_OF = shortStamp(0)

export const domains = ['RAN', 'Transport', 'Fiber', 'Baremetal', 'Core', 'Security', 'Application']

/* Who actually builds each layer. A vendor is not a free choice per element:
   nobody buys a radio access network from an optical line-system vendor, and
   a vendor list that offers all nine everywhere is a cross-product, not an
   estate. Every element, and so every alert, catalogue entry and rule seeded
   off one, draws its vendor from its own domain's list. */
export const VENDORS_BY_DOMAIN = {
  RAN: ['Nokia', 'Samsung', 'Qucell', 'Huawei', 'Ericsson'],
  Transport: ['Cisco', 'Nokia', 'ADVA', 'Juniper', 'Tejas', 'DZS', 'OKI'],
  Core: ['Cisco', 'Ericsson', 'Nokia', 'Samsung', 'Allot', 'Mavenir'],
  Fiber: ['ACME'],
  Baremetal: ['Quanta', 'HP'],
  Security: ['Cisco', 'Juniper'],
  Application: ['Nokia', 'Mavenir', 'Allot'],
}
export const vendors = [...new Set(Object.values(VENDORS_BY_DOMAIN).flat())].sort()
/* The vendors worth offering once a domain is chosen. "All" keeps the whole
   list, so a reader who has not picked a domain still sees everything. */
export const vendorsFor = domain =>
  ['All', ...(domain && domain !== 'All' ? (VENDORS_BY_DOMAIN[domain] || []) : vendors)]
export const technologies = ['COMMON', 'LTE', 'DWDM', '5G', 'OADM', 'PON']

// --- 24h alert trend by severity ---
// Slot 23 is the hour we are in; slot 0 is 23 hours back. The labels are the
// real clock hours those slots fall on, not a fixed 00:00→23:00 ruler: a
// trend that ends "now" but is labelled 23:00 is telling the reader the wrong
// time for every bar on it.
export const trendLabels = Array.from({ length: 24 }, (_, i) => `${pad2(hourAt((23 - i) * 60))}:00`)
// --- Domain heatmap windows (alerts by domain × 3h window) ---
export const heatWindows = Array.from({ length: 8 }, (_, wi) => {
  const from = hourAt((23 - wi * 3) * 60)
  return `${pad2(from)}–${pad2((from + 3) % 24)}`
})
// --- Geography ---
// Sites carry the counts; the regional rollup below is derived from them, so
// the map and the region cards can never drift apart. Coordinates are the
// city centroids in decimal degrees.
export const geoSites = [
  // North
  { city: 'Delhi',       region: 'North', lat: 28.61, lng: 77.21, ne: 210, crit: 9,  major: 5, minor: 7, warn: 4 },
  { city: 'Jaipur',      region: 'North', lat: 26.91, lng: 75.79, ne: 155, crit: 6,  major: 3, minor: 6, warn: 3 },
  { city: 'Chandigarh',  region: 'North', lat: 30.73, lng: 76.78, ne: 120, crit: 4,  major: 2, minor: 4, warn: 2 },
  { city: 'Lucknow',     region: 'North', lat: 26.85, lng: 80.95, ne: 105, crit: 3,  major: 2, minor: 3, warn: 2 },
  // South
  { city: 'Bengaluru',   region: 'South', lat: 12.97, lng: 77.59, ne: 170, crit: 11, major: 6, minor: 6, warn: 4 },
  { city: 'Chennai',     region: 'South', lat: 13.08, lng: 80.27, ne: 130, crit: 7,  major: 4, minor: 5, warn: 3 },
  { city: 'Hyderabad',   region: 'South', lat: 17.39, lng: 78.49, ne: 110, crit: 6,  major: 4, minor: 4, warn: 3 },
  { city: 'Kochi',       region: 'South', lat: 9.93,  lng: 76.27, ne: 70, crit: 3,  major: 2, minor: 2, warn: 2 },
  // West
  { city: 'Mumbai',      region: 'West',  lat: 19.08, lng: 72.88, ne: 140, crit: 6,  major: 4, minor: 4, warn: 4 },
  { city: 'Ahmedabad',   region: 'West',  lat: 23.02, lng: 72.57, ne: 90, crit: 4,  major: 2, minor: 3, warn: 2 },
  { city: 'Pune',        region: 'West',  lat: 18.52, lng: 73.86, ne: 75, crit: 2,  major: 2, minor: 2, warn: 2 },
  // East
  { city: 'Kolkata',     region: 'East',  lat: 22.57, lng: 88.36, ne: 80, crit: 4,  major: 2, minor: 4, warn: 2 },
  { city: 'Bhubaneswar', region: 'East',  lat: 20.30, lng: 85.82, ne: 50, crit: 2,  major: 2, minor: 3, warn: 2 },
  { city: 'Guwahati',    region: 'East',  lat: 26.14, lng: 91.74, ne: 40,  crit: 2,  major: 1, minor: 2, warn: 1 },
]

export const siteAlerts = s => s.crit + s.major + s.minor + s.warn

// Individual network elements behind each site. One record per alert, so a
// city's bubble count and the pins revealed when you zoom into it are the same
// number. Positions are a deterministic scatter around the city centre — close
// enough to read as a metro footprint, stable across reloads.
const NE_KINDS = [
  { kind: 'eNodeB',        prefix: 'ENB', domain: 'RAN' },
  { kind: 'gNodeB',        prefix: 'GNB', domain: 'RAN' },
  { kind: 'Core router',   prefix: 'CRT', domain: 'Transport' },
  { kind: 'Aggregation SW', prefix: 'AGG', domain: 'Transport' },
  { kind: 'OLT',           prefix: 'OLT', domain: 'Fiber' },
  { kind: 'DWDM node',     prefix: 'DWM', domain: 'Fiber' },
  { kind: 'UPF',           prefix: 'UPF', domain: 'Core' },
  { kind: 'Firewall',      prefix: 'FWL', domain: 'Security' },
]

const NE_CONDITIONS = {
  Critical: ['Loss of Signal', 'Node Down', 'Card Failure', 'Power Supply Fault'],
  Major:    ['Link Down', 'High Temperature', 'BGP Peer Down', 'Optical Power Low'],
  Minor:    ['OSPF Nbr State Change', 'CPU Utilisation High', 'Packet Discard Rate', 'Clock Drift'],
  Warning:  ['SNMP Trap OSPFNbrState', 'Config Drift Detected', 'Licence Expiring', 'Backup Overdue'],
}

/* Small deterministic PRNG so the scatter is identical on every load. */
function seeded(seed) {
  let h = 2166136261
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return ((h >>> 0) % 10000) / 10000 }
}

// Every element the site runs, not only the ones raising something. A fleet
// where 100% of elements are alerting has nothing to compare against, so the
// clean majority has to exist in the data for health to mean anything.
export const networkElements = geoSites.flatMap(site => {
  const rand = seeded(site.city)
  const code = site.city.slice(0, 3).toUpperCase()
  const alerting = [
    ...Array(site.crit).fill('Critical'),
    ...Array(site.major).fill('Major'),
    ...Array(site.minor).fill('Minor'),
    ...Array(site.warn).fill('Warning'),
  ]
  const wanted = [...alerting, ...Array(Math.max(0, site.ne - alerting.length)).fill(null)]
  return wanted.map((sev, i) => {
    const kind = NE_KINDS[Math.floor(rand() * NE_KINDS.length)]
    const conds = NE_CONDITIONS[sev] || []
    return {
      id: `${code}-${kind.prefix}-${String(i + 1).padStart(3, '0')}`,
      name: `${code}-${kind.prefix}-${String(i + 1).padStart(3, '0')}`,
      city: site.city,
      region: site.region,
      kind: kind.kind,
      domain: kind.domain,
      vendor: (VENDORS_BY_DOMAIN[kind.domain] || vendors)[
        Math.floor(rand() * (VENDORS_BY_DOMAIN[kind.domain] || vendors).length)],
      sev: sev || 'Clear',
      alerting: Boolean(sev),
      condition: sev ? conds[Math.floor(rand() * conds.length)] : null,
      // ±0.22° ≈ a 25 km metro spread
      lat: +(site.lat + (rand() - 0.5) * 0.44).toFixed(4),
      lng: +(site.lng + (rand() - 0.5) * 0.44).toFixed(4),
    }
  })
})

// --- Regions ---
// Declared here for import order; the counts are filled in at the foot of the
// file, once the alert population exists. Rolling up the site's element mix
// instead would miss any alert that does not come from a generated element,
// and the map would disagree with the list.
export const regions = ['North', 'South', 'East', 'West'].map(name => ({
  name, sites: geoSites.filter(s => s.region === name),
  ne: geoSites.filter(s => s.region === name).reduce((a, s) => a + s.ne, 0),
  alerts: 0, crit: 0, major: 0, minor: 0, warn: 0,
}))

// --- Alerts (the firehose) ---
// One record carries everything the live table shows: identity, the equipment
// it came from, timing, correlation and geography. Aging is stored as a string
// because it is what the source system reports, not something recomputed here.
let _a = 0
// A real EMS de-dupes a flapping condition into one row and counts the
// re-fires behind it — it does not let that counter run into the millions.
// Clamped here, once, so every source (authored, generated, historical) is
// held to the same ceiling rather than trusting each one to stay under it.
const A = o => ({ id: 'a' + (++_a), ...o, occ: Math.min(o.occ ?? 1, 10) })

const authoredAlerts = [
  A({
    status: 'Open', code: '678661', name: 'Loss of Signal',
    equip: 'Pollachi', equipType: 'ILA', equipId: '10.0.42.105',
    location: '10.0.42.105_SC-1-4-NE',
    domain: 'Transport', vendor: 'ADVA', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: 'INC-Pollachi-7088',
    start: '23-Apr-2026 17:04:00', close: '-', lastOcc: '24-Apr-2026 18:25:51',
    occ: 1, aging: '3 Months 27 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'Indicates that the receiver has stopped detecting the input signal.',
    cause: 'The receiver has detected a loss of the input signal.',
    region: 'South', state: 'Karnataka', city: 'Banglore Urban', rf: 'Banglore',
    ems: 'FSP_NM', group: 'External', link: '001369-4',
  }),
  A({
    status: 'Open', code: '7462', name: 'Node Down',
    equip: 'AWY-J2.2K-WIFI-T4-SR', equipType: 'Router', equipId: '172.31.39.122',
    location: '172.31.39.122_T4-SR',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: 'INC-AWY-J2.2K-WIFI-T4-SR',
    start: '24-Mar-2026 16:43:16', close: '-', lastOcc: '25-Mar-2026 02:05:21',
    occ: 1, aging: '4 Months 26 Days', service: 'No',
    corr: 'Non Correlation',
    desc: 'Router has gone down and is not reachable.',
    cause: 'Node Down',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'JUNOS_SPACE', group: 'Network', link: '-',
  }),
  A({
    status: 'Open', code: '1470', name: 'Link Down',
    equip: 'TPJ-J2.2K-WIFI1-T4-SR', equipType: 'Router', equipId: '172.31.39.7',
    location: '172.31.39.7_xe-0/3/0_512',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Deterioration', incident: 'INC-TPJ-J2.2K-WIFI1-T4-SR',
    start: '24-Mar-2026 17:16:16', close: '-', lastOcc: '25-Mar-2026 01:00:19',
    occ: 1, aging: '4 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'A linkDown trap signifies that the SNMP entity has detected a failed link.',
    cause: 'definition of interface-related traps.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'JUNOS_SPACE', group: 'Network', link: 'OSPF:252209602838',
  }),
  A({
    status: 'Open', code: '1009', name: 'Ospf Nbr State Change',
    equip: 'ELECOT-TNDRC-TPJ-J2.2K-WIFI1', equipType: 'Router', equipId: '172.31.49.141',
    location: 'ospfRouterId=172.31.49.141,ospfNbrIpAddr=172.31.49.142',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Notification', incident: 'INC-TPJ-J2.2K-WIFI1-T4-SR',
    start: '24-Mar-2026 17:15:16', close: '-', lastOcc: '25-Mar-2026 00:48:17',
    occ: 1, aging: '4 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'A ospfNbrStateChange trap signifies that there has been a change in the state of a neighbour relationship.',
    cause: 'The originator of the trap. The new state.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'JUNOS_SPACE', group: 'Network', link: 'OSPF:252209602838',
  }),
  A({
    status: 'Open', code: '100184842', name: 'SNMP Trap OSPFNbrState',
    equip: 'SRR-BNG-J480-PE-T1-SR', equipType: 'Router', equipId: '172.31.31.148',
    location: 'ospfRouterId=172.31.31.148,ospfNbrIpAddr=172.31.31.149',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Warning', cls: 'Notification', incident: 'INC-Pollachi-7088',
    start: '24-Sep-2025 01:02:00', close: '-', lastOcc: '25-Mar-2026 00:41:19',
    occ: 1, aging: '10 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'ospfNbrState',
    cause: 'OSPF Down',
    region: 'South', state: 'Kerala', city: 'Thrissur', rf: 'Thrissur',
    ems: 'JUNOS_SPACE', group: 'Network', link: '001369',
  }),
  A({
    status: 'Open', code: '678661', name: 'Loss of Signal',
    equip: 'Dindigul', equipType: 'OADM', equipId: '10.0.30.103',
    location: '10.0.30.103_SC-1-9-NE',
    domain: 'Transport', vendor: 'ADVA', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: 'INC-Pollachi-7088',
    start: '24-Sep-2025 01:07:00', close: '-', lastOcc: '24-Mar-2026 23:35:19',
    occ: 1, aging: '10 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'Indicates that the receiver has stopped detecting the input signal.',
    cause: 'The receiver has detected a loss of the input signal.',
    region: 'South', state: 'Karnataka', city: 'Banglore Urban', rf: 'Banglore',
    ems: 'FSP_NM', group: 'External', link: '001369-1',
  }),
  A({
    status: 'Open', code: '1009', name: 'Ospf Nbr State Change',
    equip: 'TPJ-J2.2K-WIFI1-T4-SR', equipType: 'Router', equipId: '172.31.39.7',
    location: 'ospfRouterId=172.31.39.7,ospfNbrIpAddr=172.31.39.8',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Notification', incident: 'INC-TPJ-J2.2K-WIFI-T4',
    start: '24-Mar-2026 17:16:16', close: '-', lastOcc: '24-Mar-2026 23:33:19',
    occ: 1, aging: '4 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'A ospfNbrStateChange trap signifies that there has been a change in the state of a neighbour relationship.',
    cause: 'The originator of the trap. The new state.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'JUNOS_SPACE', group: 'Network', link: 'OSPF:252209602838',
  }),
  A({
    status: 'Open', code: '678661', name: 'Loss of Signal',
    equip: 'Palghat', equipType: 'ILA', equipId: '10.0.42.115',
    location: '10.0.42.115_SC-2-4-NW',
    domain: 'Transport', vendor: 'ADVA', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: 'INC-Pollachi-7088',
    start: '24-Sep-2025 00:44:00', close: '-', lastOcc: '24-Mar-2026 23:13:19',
    occ: 1, aging: '10 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'Indicates that the receiver has stopped detecting the input signal.',
    cause: 'The receiver has detected a loss of the input signal.',
    region: 'South', state: 'Karnataka', city: 'Banglore Urban', rf: 'Banglore',
    ems: 'FSP_NM', group: 'External', link: '001369-4',
  }),
  A({
    status: 'Open', code: '100184842', name: 'SNMP Trap OSPFNbrState',
    equip: 'DG-ACX7024-T4-SR', equipType: 'Router', equipId: '172.31.49.82',
    location: 'ospfRouterId=172.31.49.82,ospfNbrIpAddr=172.31.49.83',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: 'INC-Pollachi-7088',
    start: '24-Sep-2025 00:53:00', close: '-', lastOcc: '24-Mar-2026 22:09:19',
    occ: 1, aging: '10 Months 26 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'ospfNbrState',
    cause: 'OSPF Down',
    region: 'South', state: 'Tamil Nadu', city: 'Begambur', rf: 'Begambur',
    ems: 'JUNOS_SPACE', group: 'Network', link: '001369',
  }),
  A({
    status: 'Closed', code: '7390', name: 'ISIS Adjacency Change Down',
    equip: 'ERS-C8201-T1-R2-P', equipType: 'Router', equipId: 'fc00:1000:8::1',
    location: 'applicationSpecifAlarmID=fc00:1000:8::1',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Cleared', cls: 'Outage', incident: '-',
    start: '20-Mar-2026 11:38:42', close: '20-Mar-2026 12:06:42', lastOcc: '24-Mar-2026 20:25:18',
    occ: 8, aging: '0 Hours 28 Mins', service: 'Yes',
    corr: '-',
    desc: 'Device: fc00:1000:8::1: Adjacency to 1720.3110.4001 down.',
    cause: 'Neighbor router went down, link failure, or ISIS misconfiguration.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'CROSSWORK', group: 'Network', link: '-',
  }),
  A({
    status: 'Open', code: '1338', name: 'Mpls L3 Vpn Vrf Down',
    equip: 'ABKP-J204-PE-T3-ER', equipType: 'Router', equipId: '172.31.33.146',
    location: 'mplsL3VpnIfConfRowStatus.mplsL3VpnIfConfTable',
    domain: 'Transport', vendor: 'Juniper', tech: 'COMMON',
    sev: 'Critical', cls: 'Notification', incident: 'INC-SBI-98240',
    start: '24-Mar-2026 15:02:33', close: '-', lastOcc: '24-Mar-2026 20:25:18',
    occ: 1, aging: '4 Months 26 Days', service: 'No',
    corr: 'Explore the algorithm and correlate',
    desc: 'This notification is generated when a. One interface leaves the VRF.',
    cause: 'NA',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'JUNOS_SPACE', group: 'Network', link: 'BGP:2721,L3:56424',
  }),
  A({
    status: 'Reopen', code: '7390', name: 'ISIS Adjacency Change Down',
    equip: 'TPJ-C8201-T1-R1-P', equipType: 'Router', equipId: 'fc00:1000:33::1',
    location: 'applicationSpecifAlarmID=fc00:1000:33::1',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Major', cls: 'Outage', incident: 'INC-1/L1/000022-6807',
    start: '20-Mar-2026 11:38:42', close: '20-Mar-2026 12:01:18', lastOcc: '24-Mar-2026 20:25:18',
    occ: 1756982, aging: '4 Months 30 Days', service: 'Yes',
    corr: 'Explore the algorithm and correlate',
    desc: 'Device: fc00:1000:33::1: Adjacency to 1720.3110.4002 down.',
    cause: 'Neighbor router went down, link failure, or ISIS misconfiguration.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'CROSSWORK', group: 'Network', link: '-',
  }),
  A({
    status: 'Reopen', code: '7385', name: 'Link Down',
    equip: 'ERS-C8201-T1-R2-P', equipType: 'Router', equipId: 'fc00:1000:8::1',
    location: 'fc00:1000:8::1_Bundle-Ether1_71',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: '-',
    start: '20-Mar-2026 11:38:43', close: '20-Mar-2026 12:05:03', lastOcc: '24-Mar-2026 20:25:18',
    occ: 19, aging: '4 Months 30 Days', service: 'Yes',
    corr: '-',
    desc: "Port 'Bundle-Ether1' (Description: '### Link connectivity ###') is down.",
    cause: 'Physical link failure, interface misconfiguration or admin shutdown.',
    region: 'East', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'CROSSWORK', group: 'Network', link: '-',
  }),
  A({
    status: 'Open', code: '7390', name: 'ISIS Adjacency Change Down',
    equip: 'ADI-C8201-T1-R3-P', equipType: 'Router', equipId: 'fc00:1000:3a::1',
    location: 'applicationSpecifAlarmID=fc00:1000:3a::1',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Major', cls: 'Outage', incident: 'INC-ADI-C8201-T1-R3-P',
    start: '19-Mar-2026 11:30:31', close: '-', lastOcc: '24-Mar-2026 20:25:15',
    occ: 2205825, aging: '5 Months 0 Days', service: 'Yes',
    corr: 'Link correlation',
    desc: 'Device: fc00:1000:3a::1: Adjacency to 1720.3110.4003 down.',
    cause: 'Neighbor router went down, link failure, or ISIS misconfiguration.',
    region: 'EAST', state: 'Bihar', city: 'Patna', rf: 'Patna',
    ems: 'CROSSWORK', group: 'Network', link: 'ISIS:000276',
  }),
  A({
    status: 'Closed', code: 'ciscoConfigManEvent', name: 'Cisco Config Man Event',
    equip: 'Hubli', equipType: 'Router', equipId: '172.31.28.14',
    location: 'ccmHistoryEventCommandSource',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Info', cls: 'Notification', incident: '-',
    start: '24-Jan-2025 17:57:00', close: '24-Jan-2025 18:02:11', lastOcc: '24-Jan-2025 18:02:11',
    occ: 1, aging: '0 Hours 5 Mins', service: 'No',
    corr: '-',
    desc: 'A configuration change was made on the device.',
    cause: 'NA',
    region: 'South', state: 'Karnataka', city: 'Hubli', rf: 'Hubli',
    ems: 'EPNM', group: 'Network', link: '-',
  }),
  A({
    status: 'Closed', code: 'UPDOWN', name: 'UPDOWN',
    equip: 'Dindigul', equipType: 'Router', equipId: '172.31.28.51',
    location: '172.31.28.51_Gi0/0/1',
    domain: 'Transport', vendor: 'Cisco', tech: 'COMMON',
    sev: 'Critical', cls: 'Outage', incident: '-',
    start: '24-Jan-2025 18:14:00', close: '24-Jan-2025 18:31:40', lastOcc: '24-Jan-2025 18:31:40',
    occ: 1, aging: '0 Hours 17 Mins', service: 'Yes',
    corr: 'Link correlation',
    desc: 'Interface changed state to down.',
    cause: 'Physical link failure or admin shutdown.',
    region: 'South', state: 'Tamil Nadu', city: 'Dindigul', rf: 'Dindigul',
    ems: 'EPNM', group: 'Network', link: '-',
  }),
]

// --- The rest of the population ------------------------------------------
// The authored records above are archetypes. The live estate is every network
// element that is currently raising something, turned into an alert record of
// the same shape — so the map, the region rail and the alert list are three
// views of one dataset rather than three numbers that can drift apart.

/* The archetype rows were written against sites this estate does not run.
   Re-homing them onto mapped cities keeps their characteristics — including
   the long-lived flapping links that carry most of the occurrence volume —
   while letting the map, the region rail and the alert list agree. */
const REHOME = {
  'Banglore Urban': 'Bengaluru', Patna: 'Kolkata', Thrissur: 'Kochi',
  Begambur: 'Chennai', Hubli: 'Bengaluru', Dindigul: 'Chennai',
  Pollachi: 'Kochi', Palghat: 'Kochi', VIRUYHACHALAM: 'Chennai',
}

const CITY_STATE = {
  Delhi: 'Delhi', Jaipur: 'Rajasthan', Chandigarh: 'Punjab', Lucknow: 'Uttar Pradesh',
  Bengaluru: 'Karnataka', Chennai: 'Tamil Nadu', Hyderabad: 'Telangana', Kochi: 'Kerala',
  Mumbai: 'Maharashtra', Ahmedabad: 'Gujarat', Pune: 'Maharashtra',
  Kolkata: 'West Bengal', Bhubaneswar: 'Odisha', Guwahati: 'Assam',
}

/* What each condition means to the operator, keyed by the condition itself so
   a generated record explains itself the way an authored one does. */
const COND_META = {
  'Loss of Signal':        { code: '678661', cls: 'Outage',        svc: true,  desc: 'Indicates that the receiver has stopped detecting the input signal.', cause: 'The receiver has detected a loss of the input signal.' },
  'Node Down':             { code: '7462',   cls: 'Outage',        svc: true,  desc: 'Node has gone down and is not reachable.', cause: 'Node Down' },
  'Card Failure':          { code: '4412',   cls: 'Outage',        svc: true,  desc: 'A line card has failed and stopped forwarding.', cause: 'Hardware fault on the card.' },
  'Power Supply Fault':    { code: '3390',   cls: 'Outage',        svc: true,  desc: 'A power supply unit has failed or lost input feed.', cause: 'PSU failure or loss of mains feed.' },
  'Link Down':             { code: '1470',   cls: 'Outage',        svc: true,  desc: 'Interface changed state to down.', cause: 'Physical link failure or admin shutdown.' },
  'High Temperature':      { code: '2201',   cls: 'Deterioration', svc: false, desc: 'Chassis temperature has crossed its alarm threshold.', cause: 'Cooling failure or blocked airflow.' },
  'BGP Peer Down':         { code: '5510',   cls: 'Outage',        svc: true,  desc: 'A BGP session has dropped and routes have been withdrawn.', cause: 'Peer unreachable, or session reset by the far end.' },
  'Optical Power Low':     { code: '6621',   cls: 'Deterioration', svc: true,  desc: 'Received optical power has fallen below its threshold.', cause: 'Fibre attenuation, a dirty connector or a failing transceiver.' },
  'OSPF Nbr State Change': { code: '1188',   cls: 'Notification',  svc: false, desc: 'An OSPF neighbour changed state.', cause: 'Confirm the neighbour is reachable and that area, timers and authentication match.' },
  'CPU Utilisation High':  { code: '2270',   cls: 'Deterioration', svc: false, desc: 'Sustained CPU utilisation above the configured threshold.', cause: 'Control-plane load, a process leak or a traffic surge.' },
  'Packet Discard Rate':   { code: '2284',   cls: 'Deterioration', svc: false, desc: 'Interface discard rate has crossed its threshold.', cause: 'Congestion or a buffer shortfall on the interface.' },
  'Clock Drift':           { code: '3312',   cls: 'Notification',  svc: false, desc: 'Synchronisation source has drifted beyond tolerance.', cause: 'Loss of a primary sync reference.' },
  'SNMP Trap OSPFNbrState':{ code: '100184', cls: 'Notification',  svc: false, desc: 'An OSPF neighbour state trap was received.', cause: 'Neighbour flap on the adjacency.' },
  'Config Drift Detected': { code: '9021',   cls: 'Normal',        svc: false, desc: 'Running configuration no longer matches the approved baseline.', cause: 'An out-of-process change on the device.' },
  'Licence Expiring':      { code: '9034',   cls: 'Normal',        svc: false, desc: 'A feature licence is approaching its expiry date.', cause: 'Licence term ending.' },
  'Backup Overdue':        { code: '9040',   cls: 'Normal',        svc: false, desc: 'No successful configuration backup within the required window.', cause: 'Backup job failed or was not scheduled.' },
}

/* The manager each vendor's kit reports through. Without an entry a vendor
   falls through to Cisco's EPNM, which reads as a Cisco estate wearing other
   badges — so every vendor the domains carry names its own. */
const EMS_BY_VENDOR = {
  ADVA: 'FSP_NM', Juniper: 'JUNOS_SPACE', Cisco: 'EPNM', Nokia: 'NSP',
  Ericsson: 'ENM', Samsung: 'SAM_EMS', Huawei: 'U2000',
  Tejas: 'TEJ_NMS', DZS: 'DZS_CLOUD', OKI: 'OKI_NMS', ACME: 'ACME_OSS',
  Allot: 'ALLOT_NX', Mavenir: 'MAV_OAM', Qucell: 'QC_EMS',
  Quanta: 'QCT_MGR', HP: 'HPE_ONEVIEW',
}
const KIND_TYPE = {
  eNodeB: 'eNodeB', gNodeB: 'gNodeB', 'Core router': 'Router', 'Aggregation SW': 'Switch',
  OLT: 'OLT', 'DWDM node': 'ILA', UPF: 'UPF', Firewall: 'Firewall',
}

/* Alarm location names the sub-part of the equipment the alarm actually fired
   on — an interface, a PON port, a cell — not the equipment itself (that's
   already the Equipment name/type columns) and not raw MIB varbind text.
   Deterministic per equipment so the same box always reports the same port. */
const IFACE_PREFIX = {
  Router: 'GigabitEthernet0/0/', Switch: 'TenGigE0/0/', Firewall: 'Zone-',
  eNodeB: 'Cell/', gNodeB: 'Cell/', OLT: 'PON0/', ILA: 'Optical-Amp-', OADM: 'Optical-Line-',
  UPF: 'N4-Interface-',
}
function locationOf(equipType, seedKey) {
  const h = [...String(seedKey)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17)
  return `${IFACE_PREFIX[equipType] || 'Port-'}${h % 48}`
}
const TECH_BY_DOMAIN = { RAN: 'LTE', Transport: 'COMMON', Fiber: 'DWDM', Core: '5G', Security: 'COMMON' }
/* A domain is not a technology: a gNodeB is 5G though it sits in RAN beside
   the eNodeBs, and an OLT is PON though it sits in Fiber beside the DWDM
   line systems. The kind wins where it is more specific than the domain. */
const TECH_BY_KIND = { gNodeB: '5G', eNodeB: 'LTE', OLT: 'PON', 'DWDM node': 'DWDM' }
const techOf = ne => TECH_BY_KIND[ne.kind] || TECH_BY_DOMAIN[ne.domain] || 'COMMON'

/* Minutes, as a readable age — the source system reports a string, so this is
   the one place the two representations are kept together. */
function ageParts(mins) {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  if (d >= 30) { const mo = Math.floor(d / 30); return `${mo} Month${mo > 1 ? 's' : ''} ${d % 30} Days` }
  if (d > 0) return `${d} Day${d > 1 ? 's' : ''} ${h} Hours`
  return `${h} Hours ${m} Mins`
}

/* A short duration read to the second, the way an operator reads one that is
   still under an hour or two — a zero-value unit is dropped rather than
   printed as "0 min", so a sub-minute alarm doesn't carry a false "0 min". */
function durLabel(totalSecs) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  // Past a day the seconds are noise, and "128 hr" is not how anyone reads an
  // alert that has been open since Tuesday.
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rest = h % 24
    return rest ? `${d} day${d === 1 ? '' : 's'} ${rest} hr` : `${d} day${d === 1 ? '' : 's'}`
  }
  // Seconds matter on a fresh alarm and nowhere else: "4 hr 56 min 0 sec" is
  // three readings where two will do.
  if (h > 0) return `${h} hr ${String(m).padStart(2, '0')} min`
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`
}

/* Event start, event close and Aging were three columns saying the same
   thing — when it opened, when (if) it closed, and how long that is. One
   still-counting for an open alert, already-settled for a closed one. */
export function durationOf(a) {
  if (a.status !== 'Closed') return { primary: a.aging, sub: `since ${a.start}` }
  return { primary: `${a.start} → ${a.close}`, sub: 'Closed' }
}

/* Minutes allowed before an alert is past its resolution clock, by severity —
   the operator's target, not a knob used to place the alert on the clock.
   Age comes from when the alert arrived; whether it has breached then falls
   out of the two, which is the only order that makes a breach mean anything. */
export const SEV_SLA = { Critical: 240, Major: 480, Minor: 1440, Warning: 4320, Info: 10080 }

/* A closed, dropped or logged population is browsed by "when", not "is it
   bad right now" — the severity/quick-signal chips the live list uses don't
   apply. `cap` is minutes; `null` means no ceiling at all. Shared by every
   feed that carries a "how long ago" number (Historical, Rejected, Events),
   so all three offer and read the same ranges. */
export const TIME_RANGES = [
  { key: 'all', label: 'All time', cap: null },
  { key: '1h', label: 'Last 1 hour', cap: 60 },
  { key: '24h', label: 'Last 24 hours', cap: 1440 },
  { key: '7d', label: 'Last 7 days', cap: 10080 },
  { key: '30d', label: 'Last 30 days', cap: 43200 },
]
export const inTimeRange = (minsAgo, key) => {
  const r = TIME_RANGES.find(t => t.key === key)
  return !r?.cap || minsAgo <= r.cap
}

/* An explicit "since" cutoff — a date (and, optionally, a time) picked
   against the reference clock, turned into the same "minutes ago" a row's
   own age is measured in, so the two are directly comparable. No date picked
   means no cutoff at all. */
export const cutoffMinsAgo = (dateStr, timeStr) => {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number)
  const ts = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  return (NOW - ts) / 60000
}

/* What Historical, Rejected and Events open scoped to, rather than "All" and
   an empty date — the domain the day's storm actually ran on, from a few
   hours before it. A reader landing on any of the three sees the interesting
   slice immediately rather than an unscoped firehose they have to narrow by
   hand first. */
export const DEFAULT_SINCE = { domain: 'Transport', vendor: 'Juniper', date: '2026-08-20', time: '06:00' }
/* Historical opens on the whole estate: the same date cutoff, but every
   domain and vendor. Scoped to one pair it opened on 8 rows of a population
   several hundred deep, which reads as an empty archive rather than a
   filtered one — and an archive is the one view whose first question is
   "what happened", not "what happened to Transport". */
export const DEFAULT_SINCE_HISTORICAL = { ...DEFAULT_SINCE, domain: 'All', vendor: 'All' }
/* Rejected draws from its own, separately-seeded population — spread evenly
   across the last two days rather than concentrated near "now" the way the
   storm data is.
   
   It opens on the date alone, unscoped by domain and vendor. Scoping it the
   way Historical and Events are scoped left 2 rows of 157 on screen: only
   four rejected traps in the whole feed are Transport/Juniper, and a landing
   view that shows 1% of what it holds reads as a broken table rather than as
   a filtered one. The day's cutoff still narrows it — 86 of 157 — and the
   controls are right there to narrow it further. */
export const DEFAULT_SINCE_REJECTED = { domain: 'All', vendor: 'All', date: '2026-08-19', time: '09:00' }

/* A stable per-city number, so an incident id is the same on every load. */
const seedOfCity = c => [...c].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

/* How many correlated alerts one incident holds before the next one opens.
   Every correlated alert at a site used to join a single incident per impact
   class, which produced records carrying ten alerts across nine elements —
   a blast radius nobody can read in one look. Real correlation windows close;
   this is that window, expressed as a size. */
const MAX_PER_INCIDENT = 6
const incidentFill = {}

const incidentIdFor = (city, cls) => {
  const c3 = city.slice(0, 3).toUpperCase()
  const k3 = cls.slice(0, 3).toUpperCase()
  const key = `${c3}-${k3}`
  const nth = (incidentFill[key] = (incidentFill[key] || 0) + 1)
  const part = Math.floor((nth - 1) / MAX_PER_INCIDENT)
  return `INC-${c3}-${k3}-${1400 + (seedOfCity(city) % 600) + part}`
}

const generatedAlerts = networkElements.filter(n => n.alerting).map((ne, i) => {
  const rnd = mulberry32(0x5f3a + i * 977)
  const meta = COND_META[ne.condition] || COND_META['Link Down']
  /* How long the thing has been open. Most alerts on a live floor are minutes
     old, but there is always a tail: some have run for hours, and a handful
     nobody has closed for days. The population used to stop at 70 minutes,
     which read fine on the alert list but made every SLA reading on the
     dashboard structurally zero — the fastest resolution target is four
     hours, so nothing could ever pass one. One draw picks both the band and
     the position inside it, so the rest of the row is generated from the same
     sequence it always was. */
  const r = rnd()
  const into = (lo, hi) => (r - lo) / (hi - lo)
  const ageSecs =
    r < 0.55 ? 20 + Math.round(into(0, 0.55) * 4180)            // 20 sec – 70 min
    : r < 0.82 ? 4200 + Math.round(into(0.55, 0.82) * 17400)    // 70 min – 6 hr
    : r < 0.94 ? 21600 + Math.round(into(0.82, 0.94) * 64800)   // 6 – 24 hr
    : 86400 + Math.round(into(0.94, 1) * 777600)                // 1 – 10 days
  const ageMins = Math.floor(ageSecs / 60)
  const occ = 1 + Math.floor(rnd() * (ne.sev === 'Critical' ? 6 : 3))
  const correlated = rnd() > 0.55
  // An alert that has fired more than once last fired after it was raised.
  // Leaving these as '-' left three of the live table's columns empty on all
  // but the authored rows — a table that reads as unpopulated rather than live.
  const lastMins = occ > 1 ? Math.round(ageMins * rnd() * 0.6) : ageMins
  return A({
    status: 'Open', code: meta.code, name: ne.condition,
    equip: ne.name, equipType: KIND_TYPE[ne.kind] || 'Router',
    equipId: `10.${20 + (i % 60)}.${i % 250}.${(i * 7) % 250}`,
    location: locationOf(KIND_TYPE[ne.kind] || 'Router', ne.name),
    domain: ne.domain, vendor: ne.vendor, tech: techOf(ne),
    sev: ne.sev, cls: meta.cls,
    // Correlated alerts join the incident already open for that site and
    // classification rather than opening one each — an incident that holds a
    // single alert is a row with a different name, not a correlation. Once
    // that incident is full the next one opens, so a busy site reads as
    // several incidents of a size an operator can hold in their head.
    incident: correlated ? incidentIdFor(ne.city, meta.cls) : '-',
    start: shortStamp(ageMins), close: '-', lastOcc: shortStamp(lastMins),
    occ, ageMins, aging: durLabel(ageSecs),
    service: meta.svc ? 'Yes' : 'No',
    corr: correlated ? 'Link correlation' : 'Non Correlation',
    desc: meta.desc, cause: meta.cause,
    region: ne.region, state: CITY_STATE[ne.city] || '-', city: ne.city, rf: ne.city,
    ems: EMS_BY_VENDOR[ne.vendor] || 'EPNM', group: meta.svc ? 'Network' : 'External',
    link: correlated ? String(100000 + (i * 37) % 900000) : '-',
    ne: ne.name,
  })
})

const rehomed = authoredAlerts.map((a, i) => {
  const city = REHOME[a.city] || a.city
  const site = geoSites.find(g => g.city === city)
  if (!site) return a
  // Re-home the equipment too. Left on its original name the alert would have
  // no element on the map and no row in the estate, so following it from the
  // dashboard — these are the elements behind most of the occurrence volume —
  // would dead-end.
  const pool = networkElements.filter(n => n.city === city && n.alerting)
  const host = pool.length ? pool[(i * 7) % pool.length] : null
  // The archetypes were written with a start date and an age that were typed
  // independently — some of them months old. Re-deriving the timestamps from
  // a short, deterministic age keeps the "Event start time" column and the
  // "Aging" column beside it agreeing, and keeps every open archetype in the
  // same few-minutes-to-just-over-an-hour range the generated population is.
  // Hashed off the row rather than randomised, so the same archetype always
  // reads the same age, and off the original (months-old) reading rather than
  // a fixed seed, so the fourteen archetypes don't all land on the same age.
  const band = (ageMinsOf(a) + i * 977) % 100
  const ageSecs =
    band < 55 ? 20 + (ageMinsOf(a) + i * 977) % 4180
    : band < 82 ? 4200 + (ageMinsOf(a) * 7 + i * 331) % 17400
    : band < 94 ? 21600 + (ageMinsOf(a) * 13 + i * 577) % 64800
    : 86400 + (ageMinsOf(a) * 17 + i * 911) % 777600
  const age = Math.floor(ageSecs / 60)
  // An alert that is not closed has no close time. Two archetypes were
  // written as Reopen while still carrying the timestamp of the closure they
  // were reopened from — which, once the start is re-derived from the age,
  // reads as an alert that closed three days before it opened. The previous
  // closure is history; the current record is open.
  const stamps = a.status === 'Closed' ? {}
    : { start: shortStamp(age), lastOcc: shortStamp(Math.round(age * 0.4)), close: '-', aging: durLabel(ageSecs), ageMins: age }
  // Identity travels with the equipment. Left on the archetype, the incident
  // id still named a city the estate does not run and the equipment id still
  // belonged to the original node — so a row that looked re-homed was only
  // half re-homed, and the two fields a reader checks first were the two that
  // gave it away.
  const correlated = a.corr && a.corr !== 'Non Correlation' && a.corr !== '-'
  /* The archetypes carried the source system's own placeholders in the
     correlation column — "-" where nothing was recorded, and one row of
     "Explore the algorithm and correlate", which is an instruction rather
     than a correlation type. Both read as a half-filled field in the grid,
     and "-" was being counted as correlated because it is not the literal
     string "Non Correlation". A row either correlates or it does not. */
  const corr = correlated ? 'Link correlation' : 'Non Correlation'
  const idx = networkElements.indexOf(host)
  const equipType = host ? (KIND_TYPE[host.kind] || a.equipType) : a.equipType
  return {
    ...a, city, region: site.region, rf: city, state: CITY_STATE[city] || a.state, corr,
    ...stamps,
    // Recomputed for every row, hosted or not — the archetypes' own location
    // text is raw MIB varbind names (ospfRouterId=…, mplsL3VpnIfConfRowStatus…),
    // which read as broken data rather than "the interface the alarm is on".
    location: locationOf(equipType, host ? host.name : a.equip),
    ...(host ? {
      equip: host.name, equipType,
      domain: host.domain, vendor: host.vendor,
      tech: techOf(host),
      ems: EMS_BY_VENDOR[host.vendor] || a.ems,
      equipId: `10.${20 + (idx % 60)}.${idx % 250}.${(idx * 7) % 250}`,
      // Counted into the same correlation windows the generated population
      // fills, or a re-homed archetype lands on top of an incident that is
      // already full and the record grows past the size it is capped at.
      incident: correlated && a.status !== 'Closed' ? incidentIdFor(city, a.cls) : '-',
      ne: host.name,
    } : {}),
  }
})
export const alerts = [...rehomed, ...generatedAlerts]

// --- Alert detail -------------------------------------------------------
// The drawer's panels are derived from the alert record rather than stored
// separately, so opening any row shows that row's own values.

/* The element's own position, so the drawer's coordinates are the pin the map
   drops rather than a city centroid — and, crucially, resolve at all: keyed by
   city name they went stale the moment the archetypes were re-homed, and every
   alert in the estate showed a dash for latitude and longitude. */
const elementByName = {}
networkElements.forEach(n => { elementByName[n.name] = n })
const siteByCity = {}
geoSites.forEach(g => { siteByCity[g.city] = g })

function coordsOf(a) {
  const el = elementByName[a.ne || a.equip]
  if (el) return [el.lat.toFixed(6), el.lng.toFixed(6)]
  const site = siteByCity[a.city]
  return site ? [site.lat.toFixed(6), site.lng.toFixed(6)] : ['-', '-']
}

/* The EMS reports its own severity, and it does not always agree with the
   severity correlation settled on — that disagreement is a real thing
   operators reconcile. Most rows match; the loud ones are where an EMS most
   often under-reports, so those are the ones allowed to differ. */
const EMS_DOWNGRADE = { Critical: 'Major', Major: 'Minor' }
const emsSeverityOf = (sev, key = '') => {
  if (!EMS_DOWNGRADE[sev]) return sev
  // Deterministic per row: the same alert always reports the same EMS view.
  const h = [...String(key)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
  return h % 4 === 0 ? EMS_DOWNGRADE[sev] : sev
}

/* Initials make a readable short identifier: Loss of Signal → LOS. */
const identifier = name => name.split(/[\s-]+/).filter(w => /^[A-Za-z]/.test(w))
  .map(w => w[0].toUpperCase()).join('').slice(0, 6)

const SUGGESTIONS = {
  'Loss of Signal': 'Verify that the incoming cable is the correct cable and that the transmit and receive ports are connected to their proper respective portions of the cable (i.e. that the fibers are not swapped between transmit and receive).',
  'Node Down': 'Check device reachability, power and uplink state before raising a field task.',
  'Link Down': 'Check the physical port, optics and patch, then confirm the interface is not administratively shut.',
  'Ospf Nbr State Change': 'Confirm the neighbour is reachable and that area, timers and authentication match on both ends.',
  'SNMP Trap OSPFNbrState': 'Confirm the neighbour is reachable and that area, timers and authentication match on both ends.',
  'ISIS Adjacency Change Down': 'Check the adjacency on both routers, then verify the underlying link and ISIS level configuration.',
  'Mpls L3 Vpn Vrf Down': 'Confirm the VRF interfaces are up and that the route target import/export still matches.',
}

/* How long a past occurrence stayed open, in the units the source reports. */
const spanText = mins => mins >= 60
  ? `${Math.floor(mins / 60)} Hour${Math.floor(mins / 60) > 1 ? 's' : ''} ${mins % 60} Minute${mins % 60 === 1 ? '' : 's'}`
  : `${mins} Minute${mins === 1 ? '' : 's'}`

function priorOccurrences(a) {
  const seed = [...String(a.id || a.equip)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11)
  const rnd = mulberry32(seed)
  const n = 2 + Math.floor(rnd() * 2)
  let cursor = ageMinsOf(a) + 120
  return Array.from({ length: n }, (_, k) => {
    cursor += 240 + Math.floor(rnd() * 8000)
    const dur = 3 + Math.floor(rnd() * 420)
    return {
      status: 'Closed', code: a.code, ident: identifier(a.name), name: a.name,
      domain: a.domain, vendor: a.vendor, cls: a.cls, sev: a.sev,
      // Its own EMS reading, not the parent alert's — a re-fire from the same
      // EMS does not necessarily report the same severity twice.
      ems: emsSeverityOf(a.sev, (a.id || a.equip) + k),
      occ: 1 + Math.floor(rnd() * 4),
      start: stamp(cursor), end: stamp(cursor - dur), lastOcc: stamp(cursor),
      duration: spanText(dur),
      location: a.location, equipId: a.equipId, desc: a.desc, equipType: a.equipType,
    }
  })
}

export function alertDetailFor(a) {
  const [lat, lng] = coordsOf(a)
  const closed = a.status === 'Closed'
  return {
    basic: {
      'Alert code': a.code,
      'Alert identifier': identifier(a.name),
      'Alert name': a.name,
      'Status': a.status,
      'Alert impact': a.cls,
      'Event time': a.start,
      'Event close time': a.close,
      'First reception time': a.start,
      'Last reception time': a.lastOcc,
      'Severity': a.sev,
      'EMS severity': emsSeverityOf(a.sev, a.id + a.equip),
      'Service affected': a.service,
      'Closed by': closed ? 'trial.user' : '-',
    },
    node: {
      'Equipment name': a.equip,
      'Management IP': a.equipId,
      'Equipment type': a.equipType,
      'Domain': a.domain,
      'Vendor': a.vendor,
      'Technology': a.tech,
    },
    geo: {
      'Region': a.region,
      'State': a.state,
      'City': a.city,
      'RF cluster': a.rf,
      'Latitude': lat,
      'Longitude': lng,
    },
    incident: { 'Incident ID': a.incident, 'Alert group': a.group, 'Correlation type': a.corr, 'Link ID': a.link },
    other: {
      'Acknowledged by': a.acked ? 'trial.user' : '-',
      'Acknowledged time': a.acked ? a.lastOcc : '-',
      'Impact': a.service === 'Yes' ? 'Loss of connectivity for all downstream network elements' : 'No service impact recorded',
      'Probable cause': a.cause,
      'Alert description': a.desc,
      'EMS name': a.ems,
      'Alarm location': a.location,
      'Occurrence count': a.occ.toLocaleString(),
      'Aging': a.aging,
      'Suggestion': SUGGESTIONS[a.name] || 'Review the originating node and the correlated alerts before dispatching a field task.',
      'Additional info': `${a.equipId}\nLINK_ID=${a.link}`,
    },
    // Prior closed occurrences of this same alert on this same equipment,
    // walked back from the reference clock. Seeded off the alert itself so
    // every row shows its own history rather than one shared pair of dates.
    history: priorOccurrences(a),
    trap: {
      severity: a.sev.toLowerCase(),
      corr: 'primary',
      neIpAddress: a.equipId,
      acknowledged: a.acked ? 'True' : 'False',
      update: 'False',
      description: a.name,
      corrRef: '0',
      elementName: a.equip.toUpperCase(),
      security: 'False',
      disposition: 'arm',
      TrapParsingTime: a.lastOcc,
      impairment: a.service === 'Yes' ? 'serviceAffecting' : 'nonServiceAffecting',
      entityAlias: a.location.split('_').slice(-1)[0],
      name: a.name,
      disabled: 'False',
      id: a.code,
      senderIPAddress: a.equipId,
      entity: a.location.split('_').slice(-1)[0],
      direction: 'receiveDirectionOnly',
    },
  }
}


// --- Intelligence: noise reduction funnel ---
// --- Intelligence: predictive alerts ---

// --- Intelligence: smart clusters ---


// --- Configurations: alert catalogue (CRUD) ---


// --- Configurations: parent-child correlations (CRUD) ---

// --- Configurations: blocked NE (CRUD) ---

// --- Events ---

// --- Connectivity status ---

// ============================================================
//  NEW (Netcool-inspired) — Events + Maintenance
// ============================================================

// OMNIbus-style live event grid: dedup with tally/count, ack, X733 fields

// --- Event feed ---------------------------------------------------------
// The raw northbound feed, before de-duplication. One row per event as the
// EMS delivered it, which is why processing time and event time are separate
// columns: the gap between them is the collector's own latency.



// Maintenance / suppression windows (CRUD)

// --- Intelligence: overview, incidents, fleet, AI ranking ---------------
/* intelOverview is derived at the foot of this file, from the population. */


/* Nodes under management per vendor, with how much of the alert load each carries. */
const authored_vendorFleet = [
  { vendor: 'Juniper', nodes: 1361, alerts: 24400 },
  { vendor: 'Cisco', nodes: 498, alerts: 12100 },
  { vendor: 'Samsung', nodes: 20, alerts: 2900 },
  { vendor: 'Nokia', nodes: 312, alerts: 1700 },
  { vendor: 'Maverick', nodes: 20, alerts: 900 },
]





// --- Everything the dashboard states, derived from the population ---------
// Asserting these separately is how a dashboard ends up claiming 231 active
// alerts over a list holding sixteen. Counting the population instead means
// the headline and the list cannot disagree.

const countBy = (rows, key) => rows.reduce((m, r) => (m[key(r)] = (m[key(r)] || 0) + 1, m), {})

const SEV_COLOR = { Critical: 'var(--red)', Major: 'var(--amber)', Minor: 'var(--blue)', Warning: 'var(--purple)', Info: 'var(--slate)' }
const CLS_COLOR = { Outage: 'var(--red)', Deterioration: 'var(--amber)', Notification: 'var(--blue)', Normal: 'var(--green)' }
// "Normal" reads as a non-answer next to Outage/Deterioration/Notification —
// it doesn't say what it means. The underlying `alerts[].cls` value stays
// `Normal` (used throughout generation/filtering below); only the label
// shown to a reader changes, via `.value` carrying the real cls for filters
// that need to match rows against it.
const CLS_LABEL = { Normal: 'No service impact' }

export const activeAlerts = alerts.filter(a => a.status !== 'Closed')

const sevCount = countBy(activeAlerts, a => a.sev)
export const severities = ['Critical', 'Major', 'Minor', 'Warning', 'Info']
  .map(sev => ({ sev, count: sevCount[sev] || 0, color: SEV_COLOR[sev] }))
  .filter(s => s.count > 0)

const clsCount = countBy(activeAlerts, a => a.cls)
export const classifications = ['Outage', 'Deterioration', 'Notification', 'Normal']
  .map(value => ({ name: CLS_LABEL[value] || value, value, count: clsCount[value] || 0, color: CLS_COLOR[value] }))
  .filter(c => c.count > 0)

/* Minutes for a generated record; the authored ones carry a source string, so
   their age is read back out of it. */
export function ageMinsOf(a) {
  if (a.ageMins != null) return a.ageMins
  const mo = /(\d+)\s*Month/.exec(a.aging), d = /(\d+)\s*Day/.exec(a.aging)
  const y = /(\d+)\s*Year/.exec(a.aging), h = /(\d+)\s*Hour/.exec(a.aging)
  return (y ? +y[1] * 525600 : 0) + (mo ? +mo[1] * 43200 : 0) + (d ? +d[1] * 1440 : 0) + (h ? +h[1] * 60 : 0)
}

const AGE_BUCKETS = [
  ['0–1h', 60], ['1–6h', 360], ['6–24h', 1440], ['1–7d', 10080], ['7d+', Infinity],
]
export const aging = AGE_BUCKETS.map(([bucket, cap], i) => {
  const floor = i === 0 ? 0 : AGE_BUCKETS[i - 1][1]
  return { bucket, count: activeAlerts.filter(a => { const m = ageMinsOf(a); return m >= floor && m < cap }).length }
})

const incidentIds = new Set(activeAlerts.map(a => a.incident).filter(x => x && x !== '-'))

export const posture = {
  active: activeAlerts.length,
  actionable: activeAlerts.filter(a => a.service === 'Yes' || a.sev === 'Critical' || a.sev === 'Major').length,
  incidents: incidentIds.size,
  // Alerts raised in the last hour, counted rather than divided out of a total.
  rate: activeAlerts.filter(a => ageMinsOf(a) < 60).length,
  deduped: activeAlerts.reduce((n, a) => n + a.occ, 0),
  correlated: activeAlerts.filter(a => a.corr !== 'Non Correlation').length,
}


// --- The operations queue -------------------------------------------------
// One ranked list answering "what do I work next", built from the same active
// alerts the dashboard counts. Rank is impact × urgency: impact is how loud
// the alert is and whether it is service-affecting, lifted by how much of the
// site sits behind it; urgency is how much of its resolution clock is gone.

const SEV_WEIGHT = { Critical: 100, Major: 75, Minor: 45, Warning: 25, Info: 10 }
export const OWNERS = ['Harshita Sharma', 'Raj Patidar', 'Akshay Gujar', 'Meera Nair']
export const ME = OWNERS[0]

const siteSize = {}
geoSites.forEach(g => { siteSize[g.city] = g.ne })
const maxSite = Math.max(...Object.values(siteSize), 1)

export function faultWorklist() {
  return activeAlerts.map((a, i) => {
    const rnd = mulberry32(0x9e37 + i * 2654)
    const ageMins = ageMinsOf(a)
    const allowed = SEV_SLA[a.sev] || 720
    const slaMins = allowed - ageMins

    const reachW = (siteSize[a.city] || 12) / maxSite
    const impact = Math.min(100, Math.round(
      (SEV_WEIGHT[a.sev] || 30) * (a.service === 'Yes' ? 1.25 : 1) * (0.72 + reachW * 0.28)))
    const urgency = Math.min(100, Math.round(
      Math.min(1, ageMins / allowed) * 70 + (slaMins < 0 ? 30 : 0)))
    const priority = Math.round(impact * 0.6 + urgency * 0.4)

    // A live queue is never uniformly new: the loudest alerts have mostly been
    // picked up, the quiet tail is where work sits unowned or parked.
    const worked = priority >= 80 ? 0.66 : priority >= 60 ? 0.44 : 0.24
    const idle = priority >= 80 ? 0.06 : priority >= 60 ? 0.18 : 0.30
    const roll = rnd()
    let owner = OWNERS[Math.floor(rnd() * OWNERS.length)]
    let wfState = 'New', acked = false, deferred = false
    if (roll < worked * 0.30) { wfState = 'In progress'; acked = true }
    else if (roll < worked * 0.65) { wfState = 'Acknowledged'; acked = true }
    else if (roll < worked) { wfState = 'Assigned' }
    else if (roll > 1 - idle) { owner = 'Unassigned' }
    else if (priority < 60 && rnd() < 0.18) { deferred = true; wfState = 'Assigned' }

    // How long an acknowledged item waited before someone picked it up. A
    // loud item is picked up faster, and nothing can be acknowledged before
    // it was raised — which is what makes a mean of these a real MTTA rather
    // than a number typed into the dashboard.
    const ackMins = acked
      ? Math.max(1, Math.min(ageMins, Math.round((priority >= 80 ? 4 : priority >= 60 ? 12 : 30) * (0.4 + rnd() * 1.6))))
      : null

    return {
      id: `FMW-${20001 + i}`, alertId: a.id,
      alert: a.name, code: a.code, ne: a.equip, neType: a.equipType,
      domain: a.domain, vendor: a.vendor, sev: a.sev, cls: a.cls,
      city: a.city, region: a.region, incident: a.incident,
      correlated: a.corr !== 'Non Correlation',
      service: a.service === 'Yes', occ: a.occ,
      ageMins, allowed, slaMins, impact, urgency, priority,
      owner, wfState, acked, ackMins, deferred,
    }
  }).sort((a, b) => b.priority - a.priority)
}

/** Which bucket an item falls into — the clock first, then priority. */
export function bucketOf(it) {
  if (it.deferred) return 'Deferred'
  if (it.slaMins < 0 || it.priority >= 85) return 'Do now'
  if (it.priority >= 65) return 'Today'
  return 'Backlog'
}

/* A clock reading, at whatever scale keeps it readable. An alert three months
   past its window reads as "117d 8h over", not as 2807 hours. */
export const slaLabel = mins => {
  const m = Math.abs(mins)
  const text = m >= 2880
    ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
    : `${Math.floor(m / 60)}h ${m % 60}m`
  return mins < 0 ? `${text} over` : `${text} left`
}

/** Findings for the assist strip, read off the queue itself. */
export function faultInsights(items) {
  const open = items.filter(i => !i.deferred)
  const byNode = {}
  items.forEach(i => { byNode[i.ne] = (byNode[i.ne] || 0) + 1 })
  const shared = Object.entries(byNode).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])[0]
  const byCity = {}
  open.forEach(i => { byCity[i.city] = (byCity[i.city] || 0) + 1 })
  const hotCity = Object.entries(byCity).sort((a, b) => b[1] - a[1])[0]

  // Figures with a label and a way in, not sentences about the figures. Each
  // one carries the filter that reproduces it, so a reading and the rows
  // behind it are one click apart.
  return [
    { label: 'Open items', value: open.length, note: `${items.length - open.length} deferred` },
    { label: 'Past resolution clock', value: open.filter(i => i.slaMins < 0).length,
      note: 'breaching now', tone: 'red' },
    { label: 'Service-affecting', value: open.filter(i => i.service).length,
      note: 'service impact recorded', tone: 'red' },
    { label: 'Correlated to an incident', value: open.filter(i => i.correlated).length,
      note: `of ${open.length} open` },
    { label: 'Unassigned', value: open.filter(i => i.owner === 'Unassigned').length,
      note: 'no owner yet', tone: 'amber' },
    shared
      ? { label: 'Busiest element', value: shared[1], note: `${shared[0]} — clears together`, q: shared[0] }
      : { label: 'Busiest element', value: 1, note: 'no element raising more than one' },
    hotCity
      ? { label: 'Densest site', value: hotCity[1], note: hotCity[0], q: hotCity[0] }
      : { label: 'Densest site', value: 0, note: 'nothing open' },
    { label: 'Median priority', value: (() => {
      const p = open.map(i => i.priority).sort((a, b) => a - b)
      return p.length ? p[Math.floor(p.length / 2)] : 0
    })(), note: 'impact x urgency, 0-100' },
  ]
}
// Acknowledgement and ownership live on the queue, so the dashboard's action
// summary counts the queue rather than asserting its own figures.
const _wl = faultWorklist()
export const actionSummary = {
  unacknowledged: _wl.filter(i => !i.acked).length,
  unassigned: _wl.filter(i => i.owner === 'Unassigned').length,
  acknowledged: _wl.filter(i => i.acked).length,
  affectedNodes: new Set(activeAlerts.map(a => a.equip)).size,
}


// --- Dashboard panels, all read off the population ------------------------
// Everything below used to be a literal. Derived, the noisiest node on the
// dashboard is a node you can find in the alert list, and the heatmap's
// busiest cell is a domain and a window you can filter to.

const SEV_RANK = { Critical: 4, Major: 3, Minor: 2, Warning: 1, Info: 0 }
const worstOf = list => list.reduce((w, a) => (SEV_RANK[a.sev] > SEV_RANK[w] ? a.sev : w), 'Info')

/* Which alert names fire most, counted by occurrence rather than by row —
   one alert re-firing forty times is the noise the operator actually sees. */
export const topAlertTypes = Object.entries(
  activeAlerts.reduce((m, a) => (m[a.name] = (m[a.name] || 0) + a.occ, m), {}))
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count).slice(0, 6)

export const topOffenders = Object.values(
  activeAlerts.reduce((m, a) => {
    const e = m[a.equip] || (m[a.equip] = { node: a.equip, count: 0, rows: [] })
    e.count += a.occ; e.rows.push(a)
    return m
  }, {}))
  .map(e => {
    const sev = worstOf(e.rows)
    const loudest = e.rows.slice().sort((x, y) => y.occ - x.occ)[0]
    return { node: e.node, count: e.count, sev, alertName: loudest.name, alerts: e.rows.length, city: loudest.city }
  })
  .sort((a, b) => b.count - a.count || SEV_RANK[b.sev] - SEV_RANK[a.sev]).slice(0, 6)

/* Incidents inherit the priority of the worst alert correlated into them. */
const incidentGroups = activeAlerts.filter(a => a.incident && a.incident !== '-')
  .reduce((m, a) => ((m[a.incident] = m[a.incident] || []).push(a), m), {})

export const incidents = Object.entries(incidentGroups).map(([id, rows]) => ({
  id, alerts: rows.length, sev: worstOf(rows),
  node: rows[0].equip, city: rows[0].city, region: rows[0].region,
  domain: rows[0].domain,
  name: rows.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)[0].name,
  service: rows.some(r => r.service === 'Yes'),
})).sort((a, b) => b.alerts - a.alerts || SEV_RANK[b.sev] - SEV_RANK[a.sev])

/* Within an incident, one alert is the root the rest are symptoms of — the
   same choice the blast-radius panel makes. Marking the role on the row itself means the
   alert list shows the correlation rather than only an incident id beside it. */
Object.values(incidentGroups).forEach(group => {
  if (group.length === 1) { group[0].role = 'Standalone'; return }
  const root = group.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)[0]
  group.forEach(r => { r.role = r === root ? 'Root' : 'Symptom' })
})

const PRIORITY_OF = { Critical: 'Emergency', Major: 'Critical', Minor: 'Major', Warning: 'Minor', Info: 'Minor' }
/* An incident inherits its priority from the worst alert correlated into it.
   Exported so a chart and its drill-down agree on which incidents a bar
   counted rather than each deciding for itself. */
export const priorityOfIncident = i => PRIORITY_OF[i.sev] || 'Major'

/* Which of the eight three-hour heat windows an alert landed in, by the same
   arithmetic the heatmap itself uses. Returns null for anything older than
   the 24-hour window the map covers. */
export function heatWindowOf(a) {
  const h = hoursAgo(a)
  if (h >= 24) return null
  return heatWindows[Math.floor((23 - h) / 3)]
}
export const incidentPriority = ['Emergency', 'Critical', 'Major', 'Minor'].map(name => ({
  name, count: incidents.filter(i => PRIORITY_OF[i.sev] === name).length,
})).filter(p => p.count > 0)

/* An alert's age places it on the 24-hour clock: an alert 90 minutes old was
   raised in the window an hour and a half back. Anything older than a day
   sits outside the trend, which is what makes the trend a trend. Used by
   buildDashboard's own trend/storm computation, below. */
const hoursAgo = a => Math.floor(ageMinsOf(a) / 60)

export const heatDomains = [...new Set(activeAlerts.map(a => a.domain))]
export const heatmap = heatDomains.map(d =>
  heatWindows.map((w, wi) => activeAlerts.filter(a => {
    if (a.domain !== d) return false
    const h = hoursAgo(a)
    return h < 24 && Math.floor((23 - h) / 3) === wi
  }).length))

/* Which vendor fleet is carrying the load, and how much of it is critical. */
export const vendorPosture = Object.values(
  activeAlerts.reduce((m, a) => {
    const e = m[a.vendor] || (m[a.vendor] = { vendor: a.vendor, alerts: 0, crit: 0, nodes: new Set() })
    e.alerts++; if (a.sev === 'Critical') e.crit++
    e.nodes.add(a.equip)
    return m
  }, {}))
  .map(v => ({ vendor: v.vendor, alerts: v.alerts, crit: v.crit, nodes: v.nodes.size,
    fleet: networkElements.filter(n => n.vendor === v.vendor).length,
    critPct: Math.round((v.crit / v.alerts) * 100) }))
  .sort((a, b) => b.alerts - a.alerts)

/* Raw occurrences collapse into alerts, alerts correlate into incidents.
 *
 * Every stage is measured over the same last 24 hours. `occ` is a lifetime
 * counter — the two flapping links in this estate have been re-firing for five
 * months — so summing it raw put a five-month total next to a live count and
 * read as a day's ingest. Each alert's share of the window is taken at the
 * rate it has actually been firing, capped at its own total. */
export function occurrencesIn24h(a) {
  const age = ageMinsOf(a)
  if (age <= 1440) return a.occ
  return Math.max(1, Math.round((a.occ * 1440) / age))
}
const raisedIn24h = a => ageMinsOf(a) < 1440
/* An incident opens when its oldest alert arrived. */
const incidentOpenedIn24h = g => Math.max(...g.map(ageMinsOf)) < 1440

/* Every stage of the funnel has to describe the same population, or the
   arrows between them are comparing different things. The occurrences are
   the ones the open alerts received in the window; the alerts are the ones
   that received them; the correlated set is the subset of those; and the
   incidents are the ones that subset sits in. Counting occurrences across
   every open alert but alerts only across those first raised in the window —
   which is what this did — put 26,929 occurrences above 177 alerts when
   those occurrences came from 214. */
const withOcc24 = a => occurrencesIn24h(a) > 0
const rawOcc = activeAlerts.reduce((n, a) => n + occurrencesIn24h(a), 0)
const folded = activeAlerts.filter(withOcc24)
const foldedCorrelated = folded.filter(a => a.corr !== 'Non Correlation')
const foldedIncidents = new Set(
  foldedCorrelated.map(a => a.incident).filter(i => i && i !== '-')).size

export const noiseFunnel = [
  { stage: 'Raw occurrences', value: rawOcc, color: 'var(--grayColor400)' },
  { stage: 'Deduplicated alerts', value: folded.length, color: 'var(--vw-color-blue-300)' },
  { stage: 'Correlated', value: foldedCorrelated.length, color: 'var(--vw-color-indigo-300)' },
  { stage: 'Open incidents', value: foldedIncidents, color: 'var(--red)' },
]
/* How many raw occurrences stand behind one incident, over the same
   population the funnel walks. */
export const suppressionRatio = Math.round(rawOcc / Math.max(1, foldedIncidents))
export const rawOccurrences = rawOcc
export const incidentsFromOccurrences = foldedIncidents


export const serviceAffecting = activeAlerts.filter(a => a.service === 'Yes').length


// --- Storm detection ------------------------------------------------------
// An alert storm is not "a tall bar" — it is a window that breaks from the
// baseline the rest of the day set. The mean and deviation are taken over the
// quiet hours only, so one loud hour cannot raise the bar it is judged by.

export function detectStorm(counts) {
  // The newest hour is excluded: it always holds the freshest alerts by
  // construction, so judging it against the day's baseline would report a
  // storm every hour of every day.
  const judged = counts.slice(0, -1)
  const sorted = judged.slice().sort((a, b) => a - b)
  const quiet = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.7)))
  const mean = quiet.reduce((a, b) => a + b, 0) / quiet.length
  const sd = Math.sqrt(quiet.reduce((a, b) => a + (b - mean) ** 2, 0) / quiet.length) || 1
  // Two deviations out AND well clear of the baseline. Three times the mean
  // was strict enough that only a spike which flattened the rest of the chart
  // could clear it; two deviations still keeps ordinary hours out.
  const threshold = Math.max(mean + sd * 2, mean * 1.8)
  const flagged = judged.map((v, i) => ({ i, v })).filter(h => h.v > threshold)

  // Adjacent flagged hours are one storm, not several.
  const grouped = []
  flagged.forEach(h => {
    const last = grouped[grouped.length - 1]
    if (last && h.i === last.to + 1) { last.to = h.i; last.peak = Math.max(last.peak, h.v); last.total += h.v }
    else grouped.push({ from: h.i, to: h.i, peak: h.v, total: h.v })
  })
  // A storm has to be more than one hour that grazed the line. On a quiet
  // network the threshold is low enough that a single ordinary hour clears
  // it — and a shaded band with nothing behind it costs more credibility than
  // the missed detection would. Requiring the window to carry three
  // threshold-hours means it either sustained, or was tall enough on its own.
  // A window earns the banner by sustaining — two hours over the line, or one
  // hour far enough over on its own to be worth as much.
  const windows = grouped.filter(w => w.total >= threshold * 2)
  return {
    mean: +mean.toFixed(1), threshold: +threshold.toFixed(1), windows,
    // The banner speaks about the biggest one, not whichever came first.
    worst: windows.slice().sort((a, b) => b.total - a.total)[0] || null,
  }
}

/* A tie decided by object insertion order is decided by nothing. When two
   conditions are level in a window, the more severe one is the one worth
   naming; alphabetical order settles the rest so the pick never moves. */
const CONDITION_RANK = { Outage: 3, Deterioration: 2, Notification: 1, Normal: 0 }
const topCondition = (counts, rows) => {
  const clsOf = name => (rows.find(r => r.name === name) || {}).cls
  return Object.entries(counts).sort((a, b) =>
    b[1] - a[1]
    || (CONDITION_RANK[clsOf(b[0])] || 0) - (CONDITION_RANK[clsOf(a[0])] || 0)
    || a[0].localeCompare(b[0]))[0]
}

// --- Domain health --------------------------------------------------------
// A ring per domain: how much of its estate is clean, what it is carrying and
// which way the last six hours moved.

export const domainHealth = heatDomains.map(d => {
  const rows = activeAlerts.filter(a => a.domain === d)
  const nodes = new Set(networkElements.filter(n => n.domain === d).map(n => n.name))
  const hit = new Set(rows.map(a => a.equip))
  const crit = rows.filter(a => a.sev === 'Critical').length
  const clean = Math.max(0, nodes.size - hit.size)
  const health = nodes.size ? Math.round((clean / nodes.size) * 100) : 100
  // The last six hourly slots, for the shape of the recent trend.
  const spark = Array.from({ length: 12 }, (_, k) => rows.filter(a => {
    const h = hoursAgo(a); return h < 24 && 23 - h === 12 + k
  }).length)
  const recent = spark.slice(6).reduce((a, b) => a + b, 0)
  const prior = spark.slice(0, 6).reduce((a, b) => a + b, 0)
  return {
    domain: d, alerts: rows.length, crit, nodes: nodes.size, hit: hit.size, clean, health, spark,
    trend: recent - prior,
    service: rows.filter(a => a.service === 'Yes').length,
  }
}).sort((a, b) => a.health - b.health)

// --- Correlation fan ------------------------------------------------------
// The incident carrying the most correlated alerts, laid out as root cause →
// the symptoms it raised → the elements those sit on. The same read the blast
// view gives, on the dashboard where the operator starts.

/* The list and the groups are parameters so the dashboard can hand in its
   filtered set: a blast radius drawn from the whole estate while the headline
   above it reads a filtered count is the panel visibly ignoring the filter. */
export function correlationFan(incidentId, list = incidents, groups = incidentGroups) {
  const inc = (incidentId ? list.find(i => i.id === incidentId) : null) || list[0]
  if (!inc) return null
  const rows = groups[inc.id] || []
  const root = rows.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)[0]
  // Not capped: the fan groups these by alarm type for display, so a large
  // incident condenses to a handful of rows on its own rather than needing
  // to be truncated before it gets there.
  const symptoms = rows.filter(r => r !== root)
    .sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev])
  const nodes = [...new Set(rows.map(r => r.equip))]
  return {
    incident: inc, root, symptoms, nodes,
    alerts: rows.length, occurrences: rows.reduce((n, r) => n + r.occ, 0),
    service: inc.service,
  }
}


// --- Where the noise comes from ------------------------------------------
// A 77,712:1 collapse is not evenly spread. A handful of flapping elements
// generate almost all of the raw volume, and naming them turns the funnel
// from a claim into something the operator can act on.

export const noiseSources = (() => {
  const byNode = Object.values(activeAlerts.reduce((m, a) => {
    const e = m[a.equip] || (m[a.equip] = { node: a.equip, occ: 0, alerts: 0, city: a.city, domain: a.domain, vendor: a.vendor, name: a.name, sev: a.sev })
    e.occ += a.occ; e.alerts++
    if (a.occ > (e.topOcc || 0)) { e.topOcc = a.occ; e.name = a.name; e.sev = a.sev }
    return m
  }, {})).sort((a, b) => b.occ - a.occ)

  // Take elements until they account for almost all of the volume rather than
  // a fixed top-N: padding the list with elements contributing 0.0% would say
  // the opposite of what the panel is for.
  const top = []
  let cum = 0
  for (const e of byNode) {
    if (cum / rawOcc >= 0.96 || top.length >= 4) break
    top.push(e); cum += e.occ
  }
  return {
    top: top.map(e => ({ ...e, share: +((e.occ / rawOcc) * 100).toFixed(1) })),
    topShare: +((cum / rawOcc) * 100).toFixed((cum / rawOcc) > 0.99 ? 2 : 1),
    tail: byNode.length - top.length,
    tailOcc: byNode.slice(top.length).reduce((n, e) => n + e.occ, 0),
  }
})()

/* Occurrence counts span single digits to millions in the same list. */
export const compactCount = v => v >= 1e6 ? `${(v / 1e6).toFixed(2)}M`
  : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v)

/* How the correlated alerts were grouped, so the funnel's middle step is
   explained rather than asserted. */
export const correlationBreakdown = (() => {
  const grouped = Object.values(incidentGroups)
  const sizes = grouped.map(g => g.length)
  return {
    incidents: grouped.length,
    largest: Math.max(...sizes, 0),
    multi: sizes.filter(n => n > 1).length,
    single: sizes.filter(n => n === 1).length,
    avg: +(sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length)).toFixed(1),
    uncorrelated: activeAlerts.filter(a => a.corr === 'Non Correlation').length,
  }
})()


// =========================================================================
//  Production volumes
//  The hand-authored rows above are archetypes — enough to show a shape, not
//  enough to behave like a live system. Each list below extends its seed to
//  an estate-sized population, generated from the same elements and alerts
//  the rest of the module counts, so a row here resolves to a node the alert
//  list also knows about.
// =========================================================================

const alertingElements = networkElements.filter(n => n.alerting)
const CONDITIONS = Object.keys(COND_META)
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)]

// --- Event feed ----------------------------------------------------------
// Events are what the EMS emitted; alerts are what survived deduplication.
// Every generated alert therefore has one or more events behind it.
const generatedEvents = activeAlerts.flatMap((a, i) => {
  const rnd = mulberry32(0x2b17 + i * 613)
  const n = 1 + Math.floor(rnd() * 4)
  const started = Math.min(ageMinsOf(a), 1439)
  return Array.from({ length: n }, (_, k) => {
    // An event cannot arrive after the alert it raised. The first sits at the
    // moment the alert was raised; re-fires walk forward from there towards
    // now. Reversing these put every event a few minutes *after* its own
    // alert, and stacked the newest hundred on one identical minute.
    const at = k === 0
      ? started
      : Math.max(1, Math.round(started * (1 - (k / n) * (0.3 + rnd() * 0.6))))
    // Seconds of jitter, so a feed of hundreds does not read as one batch job.
    const sec = Math.round(rnd() * 59)
    const lag = 20 + Math.round(rnd() * 100)      // the collector's own latency
    return {
      domain: a.domain, vendor: a.vendor, tech: a.tech,
      code: a.code, name: a.name, equip: a.equip,
      // Keyed off the alert, not the event index: an EMS that reports one
      // severity for an alert reports the same one for every event behind it.
      ems: emsSeverityOf(a.sev, a.id),
      atMins: at, atSecs: at * 60 + sec,
      // The collector receives an event after it happened, never before: the
      // gap between these two columns is its own latency, and it only runs
      // one way.
      processed: stampSec(at, sec - lag), time: stampSec(at, sec),
      cause: a.cause, equipType: a.equipType,
      region: a.region, state: a.state, city: a.city,
      ip: a.equipId, location: `${a.equipId}_${a.equipType.slice(0, 3).toUpperCase()}-${pad(k + 1, 2)}`,
    }
  })
})
/* Authored seeds are deliberately excluded from every observation feed below.
   They name sites, nodes and EMS hosts this estate does not run, and they are
   stamped a year and a half before the reference clock — so they sorted to the
   top of the feed and were the first thing a reader saw. A row in an
   observation feed has to resolve to an element the alert list also knows. */
export const eventFeed = generatedEvents.slice().sort((a, b) => a.atSecs - b.atSecs)
export const eventDomains = [...new Set(eventFeed.map(e => e.domain))]
export const eventVendors = [...new Set(eventFeed.map(e => e.vendor))]

export const EVENT_TOTAL = eventFeed.length

// --- Alert catalogue -----------------------------------------------------
// One row per condition the estate can raise, per vendor that raises it.
const catalogueRows = []
CONDITIONS.forEach((cond, ci) => {
  const meta = COND_META[cond]
  const seen = new Set()
  alertingElements.filter(n => n.condition === cond).forEach(n => {
    const key = `${n.vendor}|${n.domain}`
    if (seen.has(key)) return
    seen.add(key)
    const rnd = mulberry32(0x7ab3 + ci * 97 + seen.size)
    const sev = n.sev
    catalogueRows.push({
      code: meta.code, name: cond,
      status: rnd() > 0.12 ? 'Activated' : 'Deactivated',
      identifier: cond.replace(/[^A-Za-z]/g, '').slice(0, 18),
      type: meta.cls === 'Normal' ? 'Software' : 'Network',
      group: n.domain === 'RAN' ? 'NA' : 'PM_BASE0',
      ems: EMS_BY_VENDOR[n.vendor] || 'EPNM',
      domain: n.domain, vendor: n.vendor,
      tech: techOf(n),
      cls: meta.cls, sev, prio: sev, desc: meta.desc,
    })
  })
})
export const catalogue = catalogueRows
export const CATALOGUE_TOTAL = catalogue.length

const CREATORS = ['Sandeep Neema', 'Rakshit Manwatkar', 'Ankit Jaglap', 'Harshita Sharma', 'Meera Nair']
/* A child condition is one the parent tends to precede on the same element. */
const CHAIN = [
  ['Node Down', ['Link Down', 'BGP Peer Down', 'OSPF Nbr State Change', 'Packet Discard Rate']],
  ['Power Supply Fault', ['Node Down', 'Card Failure', 'High Temperature']],
  ['Card Failure', ['Link Down', 'Optical Power Low', 'Packet Discard Rate']],
  ['Loss of Signal', ['Optical Power Low', 'Link Down', 'Clock Drift']],
  ['Link Down', ['OSPF Nbr State Change', 'BGP Peer Down', 'SNMP Trap OSPFNbrState']],
  ['High Temperature', ['CPU Utilisation High', 'Card Failure']],
  ['Optical Power Low', ['Loss of Signal', 'Packet Discard Rate']],
]

// --- Blocked elements ----------------------------------------------------
// Flood protection blocks whatever crosses its occurrence threshold, so the
// noisiest elements are exactly the ones listed here.
const generatedBlocked = alertingElements
  .map((ne, i) => ({ ne, rnd: mulberry32(0x6e21 + i * 149), i }))
  .filter(({ rnd }) => rnd() > 0.76)
  .slice(0, 48)
  .map(({ ne, rnd, i }) => ({
    status: rnd() > 0.35 ? 'Blocked' : 'Unblocked',
    domain: ne.domain, vendor: ne.vendor,
    equipmentId: `10.${20 + (i % 60)}.${i % 250}.${(i * 7) % 250}`,
    threshold: 900 + Math.floor(rnd() * 14000),
    blockedBy: rnd() > 0.5 ? 'Prometheus' : 'Flood guard',
    blockedAt: shortStamp(10 + Math.floor(rnd() * 4000)),
  }))
export const blockedNE = generatedBlocked

// --- EMS connectivity ----------------------------------------------------
const MONITORS = ['Alarm', 'Heartbeat', 'Inventory', 'Performance']
const generatedConnectivity = vendors.flatMap((vendor, vi) =>
  ['North', 'South', 'East', 'West'].map((region, ri) => {
    const rnd = mulberry32(0x5150 + vi * 37 + ri)
    const up = rnd() > 0.18
    return {
      status: up ? 'Connected' : 'Disconnected',
      host: `10.${60 + vi}.${10 + ri}.${20 + Math.floor(rnd() * 200)}`,
      domain: pick(rnd, ['Transport', 'RAN', 'Fiber', 'Core', 'Security']),
      vendor, ems: EMS_BY_VENDOR[vendor] || 'EPNM',
      monitor: pick(rnd, MONITORS),
      ageing: ((y, mo) => `${y} Year${y > 1 ? 's' : ''} ${mo} Month${mo === 1 ? '' : 's'}`)(
        1 + Math.floor(rnd() * 3), Math.floor(rnd() * 12)),
      last: shortStamp(up ? Math.floor(rnd() * 20) : 60 + Math.floor(rnd() * 5000)),
      region,
    }
  }))
export const connectivity = generatedConnectivity

// --- Maintenance windows -------------------------------------------------
const MAINT_REASONS = [
  'Planned line card replacement', 'Software upgrade window', 'Fibre splice repair',
  'Firmware patch', 'Power feed changeover', 'Antenna alignment', 'Optical amplifier swap',
  'Controller failover test', 'Cable re-termination', 'Licence renewal',
]
const MAINT_STATUS = ['Scheduled', 'Active', 'Completed']
/* Live work first, then what is booked, then what is done. */
const MAINT_RANK = { Active: 0, Scheduled: 1, Completed: 2 }
/* A window can only be scoped to a domain the estate actually runs — Baremetal
   and Application carry no elements, so scheduling work on them says nothing. */
const estateDomains = [...new Set(networkElements.map(n => n.domain))]
const generatedMaint = geoSites.flatMap((site, si) =>
  Array.from({ length: 2 + (si % 2) }, (_, k) => {
    const rnd = mulberry32(0x8f70 + si * 83 + k)
    const group = rnd() > 0.55
    const el = alertingElements.filter(n => n.city === site.city)
    const status = pick(rnd, MAINT_STATUS)
    const startAgo = status === 'Completed' ? 400 + Math.floor(rnd() * 3000)
      : status === 'Active' ? Math.floor(rnd() * 120) : -(60 + Math.floor(rnd() * 2800))
    return {
      startAgo,
      scope: group ? `${pick(rnd, estateDomains)} · ${site.city} metro` : (el[k % Math.max(1, el.length)]?.name || `${site.city.slice(0, 3).toUpperCase()}-CRT-001`),
      type: group ? 'Group' : 'Node',
      reason: pick(rnd, MAINT_REASONS),
      start: shortStamp(startAgo), end: shortStamp(startAgo - (120 + Math.floor(rnd() * 300))),
      status, by: pick(rnd, [...CREATORS, 'Field Ops']),
      suppressed: status === 'Scheduled' ? 0 : Math.floor(rnd() * 1500),
      city: site.city, region: site.region,
    }
  }))
export const maintenanceWindows = generatedMaint
  .slice().sort((a, b) => MAINT_RANK[a.status] - MAINT_RANK[b.status] || a.startAgo - b.startAgo)

// --- Intelligence --------------------------------------------------------
const generatedPredictive = CHAIN.flatMap(([parent, children], pi) =>
  children.flatMap((child, ci) => {
    /* Two candidates spread across the matching elements rather than the
       first two. The element list is ordered by city, so slice(0, 2) put
       every prediction this module makes in one region — an artifact of the
       ordering, not something the model was saying. */
    const matching = alertingElements.filter(n => n.condition === parent)
    const cands = matching.length <= 2 ? matching
      : [matching[Math.floor(matching.length * 0.2)], matching[Math.floor(matching.length * 0.7)]]
    return cands.map((ne, ni) => {
      const rnd = mulberry32(0x9c40 + pi * 71 + ci * 17 + ni)
      const hrs = 2 + Math.floor(rnd() * 40)
      const peers = alertingElements.filter(n => n.city === ne.city).length
      return {
        domain: ne.domain, vendor: ne.vendor,
        predCode: (COND_META[parent] || {}).code || '0000', pred: parent,
        predictedCode: (COND_META[child] || {}).code || '0000', predicted: child,
        sev: ne.sev, node: ne.name,
        nodes: Math.max(2, Math.min(peers, 2 + Math.floor(rnd() * 5))),
        entities: Math.max(2, Math.min(peers, 2 + Math.floor(rnd() * 5))),
        predIn: `${hrs} hr ${Math.floor(rnd() * 59)} min`,
        reason: `${rnd() > 0.5 ? 'Validated' : 'Partial correlation'}: ${parent} on this element has preceded ${child} on ${1 + Math.floor(rnd() * 6)} prior occasions.`,
      }
    })
  }))
/* Only the generated rows: the authored seeds name elements this estate does
   not contain, so following one from the dashboard would find nothing. */
export const predictive = generatedPredictive

/* A cluster is an incident big enough to have a story: several alerts on one
   site, named by the worst of them. */
export function buildClusters(incs, groups) {
  return incs.filter(i => i.alerts > 1).slice(0, 30).map((inc, i) => {
  const rows = groups[inc.id] || []
  const root = rows.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)[0]
  return {
    id: `CLU-${pad(100 + i, 3)}`,
    name: `${inc.name} — ${inc.node}`,
    domain: inc.domain, sev: inc.sev,
    desc: `${root.cause} ${rows.length} correlated alerts across ${new Set(rows.map(r => r.equip)).size} elements in ${inc.city}. ${inc.service ? 'Service-affecting.' : 'No service impact recorded.'}`,
    incident: inc.id, root: root.name,
    affected: [...new Set(rows.map(r => r.equip))].slice(0, 4),
    alerts: rows.length, city: inc.city, service: inc.service,
  }
  })
}

export function buildPrioritised(queue) {
  return queue.slice(0, 40).map(it => ({
    code: it.code, name: it.alert, domain: it.domain, vendor: it.vendor,
    prio: it.sev === 'Critical' ? 'Emergency' : it.sev === 'Major' ? 'Critical' : 'Major',
    entity: it.ne, entityId: it.ne, city: it.city,
    reason: `Priority ${it.priority} — ${it.sev.toLowerCase()} on ${it.ne} in ${it.city}${it.service ? ', service-affecting' : ''}, ${it.slaMins < 0 ? 'past its resolution clock' : 'inside its clock'}.`,
  }))
}

const CHANGE_KINDS = ['Config push', 'Firmware upgrade', 'Licence change', 'Topology change', 'Policy update']
const generatedChanges = incidents.filter(i => i.alerts > 1).slice(0, 20).map((inc, i) => {
  const rnd = mulberry32(0xb3c4 + i * 41)
  const kind = pick(rnd, CHANGE_KINDS)
  const when = shortStamp(30 + Math.floor(rnd() * 1400))
  const confidence = 55 + Math.floor(rnd() * 45)
  return {
    change: `${kind} on ${inc.node}`,
    id: `CHG-${pad(4100 + i, 4)}`,
    sev: inc.sev, domain: inc.domain, node: inc.node, city: inc.city,
    at: when, incident: inc.id, alerts: inc.alerts, confidence,
    by: pick(rnd, CREATORS),
    summary: `${inc.alerts} alerts grouped into ${inc.id} on ${inc.node} in ${inc.city}, starting shortly after a ${kind.toLowerCase()} at ${when}.`,
    insight: `The change window and the first alert are within minutes of each other, and no comparable element saw the same surge — a ${confidence}% match on timing and scope.`,
    action: confidence > 80
      ? `Roll the ${kind.toLowerCase()} back on ${inc.node} and confirm the incident clears before re-applying.`
      : `Compare ${inc.node} against a peer that did not take the change before rolling anything back.`,
  }
})
export const changeCorrelation = generatedChanges


// --- Alert history -------------------------------------------------------
// What the shift already closed. Resolved alerts carry the same shape as open
// ones plus how long they took and who cleared them, so the history tab is
// the live table with a different filter rather than a second schema.

const RESOLUTIONS = [
  'Cleared by the element after the underlying fault was fixed',
  'Field task completed — optic replaced and link restored',
  'Configuration rolled back to the approved baseline',
  'Cleared automatically once the peer came back up',
  'Power feed restored by site engineer',
  'Card reseated; no further occurrences',
  'Suppressed under an approved maintenance window',
  'Duplicate of a correlated incident, closed against the parent',
]
const CLOSERS = [...OWNERS, 'Field Ops', 'Auto-clear']

const baseHistoryAlerts = alertingElements.flatMap((ne, i) => {
  const rnd = mulberry32(0xc0de + i * 397)
  // Each element clears a steady stream over the past fortnight. The volume
  // is set to the rate the estate actually raises alerts — a closed population
  // a fifth the size of the arrival rate would say the backlog is collapsing
  // when the queue plainly is not.
  const n = 9 + Math.floor(rnd() * 13)
  return Array.from({ length: n }, (_, k) => {
    const cond = CONDITIONS[Math.floor(rnd() * CONDITIONS.length)]
    const meta = COND_META[cond]
    const sev = pick(rnd, ['Critical', 'Major', 'Minor', 'Warning'])
    const closedAgo = 60 + Math.floor(rnd() * 20000)          // up to ~2 weeks
    const durationMins = 1 + Math.floor(rnd() * 30)            // cleared within 30 minutes
    const startedAgo = closedAgo + durationMins
    const occ = 1 + Math.floor(rnd() * 10)
    return A({
      status: 'Closed', code: meta.code, name: cond,
      equip: ne.name, equipType: KIND_TYPE[ne.kind] || 'Router',
      equipId: `10.${20 + (i % 60)}.${i % 250}.${(i * 7) % 250}`,
      location: locationOf(KIND_TYPE[ne.kind] || 'Router', ne.name),
      domain: ne.domain, vendor: ne.vendor, tech: techOf(ne),
      sev, cls: meta.cls,
      incident: rnd() > 0.6 ? `INC-${ne.city.slice(0, 3).toUpperCase()}-${meta.cls.slice(0, 3).toUpperCase()}-${1400 + (seedOfCity(ne.city) % 600)}` : '-',
      start: shortStamp(startedAgo), close: shortStamp(closedAgo), lastOcc: shortStamp(closedAgo),
      occ, ageMins: startedAgo, aging: ageParts(durationMins),
      closedAgo, durationMins, duration: ageParts(durationMins),
      closedBy: pick(rnd, CLOSERS),
      resolution: pick(rnd, RESOLUTIONS),
      service: meta.svc ? 'Yes' : 'No',
      corr: rnd() > 0.5 ? 'Link correlation' : 'Non Correlation',
      desc: meta.desc, cause: meta.cause,
      region: ne.region, state: CITY_STATE[ne.city] || '-', city: ne.city, rf: ne.city,
      ems: EMS_BY_VENDOR[ne.vendor] || 'EPNM', group: meta.svc ? 'Network' : 'External',
      link: '-', ne: ne.name,
    })
  })
})

/* The 24-hour trend chart and the storm detector read arrivals off this same
   closed population (via `closedAgo`/`ageMins`) rather than off the open
   alerts — those are deliberately kept to their first hour open for the
   alert list's own Duration column, which left the trend chart nothing to
   draw for the other 23 hours. Two more generators restore a day's shape
   without touching how long an alert stays open: an ordinary trickle spread
   across the full 24 hours, and one deliberate storm concentrated in a
   single hour, so the detector has something real to find.
   Every row here closes in a few minutes, the way a duplicate-detected or
   auto-cleared trap actually does. */
const dayFillAlerts = alertingElements.flatMap((ne, i) => {
  const rnd = mulberry32(0xda11 + i * 251)
  const n = 3 + Math.floor(rnd() * 6)   // a real baseline, not a flatline the storm dwarfs
  return Array.from({ length: n }, (_, k) => {
    const cond = CONDITIONS[Math.floor(rnd() * CONDITIONS.length)]
    const meta = COND_META[cond]
    const closedAgo = Math.floor(rnd() * 1440)         // somewhere in the last 24h
    const durationMins = 1 + Math.floor(rnd() * 3)      // closes in a few minutes
    const startedAgo = closedAgo + durationMins
    return A({
      status: 'Closed', code: meta.code, name: cond,
      equip: ne.name, equipType: KIND_TYPE[ne.kind] || 'Router',
      equipId: `10.${30 + (i % 60)}.${(i * 3 + k) % 250}.${(i * 11 + k) % 250}`,
      location: locationOf(KIND_TYPE[ne.kind] || 'Router', ne.name),
      domain: ne.domain, vendor: ne.vendor, tech: techOf(ne),
      sev: pick(rnd, ['Critical', 'Major', 'Minor', 'Warning']), cls: meta.cls,
      incident: '-',
      start: shortStamp(startedAgo), close: shortStamp(closedAgo), lastOcc: shortStamp(closedAgo),
      occ: 1 + Math.floor(rnd() * 3), ageMins: startedAgo, aging: ageParts(durationMins),
      closedAgo, durationMins, duration: ageParts(durationMins),
      closedBy: pick(rnd, CLOSERS), resolution: pick(rnd, RESOLUTIONS),
      service: meta.svc ? 'Yes' : 'No', corr: 'Non Correlation',
      desc: meta.desc, cause: meta.cause,
      region: ne.region, state: CITY_STATE[ne.city] || '-', city: ne.city, rf: ne.city,
      ems: EMS_BY_VENDOR[ne.vendor] || 'EPNM', group: meta.svc ? 'Network' : 'External',
      link: '-', ne: ne.name,
    })
  })
})

/* What a fibre break upstream actually raises, in the order it cascades —
   the same signature the old arrival model used, now driving the trend
   chart's storm instead of an open alert's own age. */
const STORM_CONDITIONS = [
  'Loss of Signal', 'Optical Power Low', 'Link Down', 'Node Down',
  'BGP Peer Down', 'OSPF Nbr State Change', 'SNMP Trap OSPFNbrState',
]
const stormAlerts = alertingElements
  .filter(ne => ne.domain === 'Transport')
  .flatMap((ne, i) => {
    const rnd = mulberry32(0xb057 + i * 271)
    const n = 2 + Math.floor(rnd() * 3)   // a rise the rest of the day can be read against
    return Array.from({ length: n }, (_, k) => {
      const cond = pick(rnd, STORM_CONDITIONS)
      const meta = COND_META[cond]
      /* Spread over three consecutive hours rather than piled into one. A
         cascade that has to be eleven times the baseline to register drew a
         single spike so tall that the other twenty-three hours flattened
         into a hairline along the axis — the chart could only be read for
         the one hour nobody needed a chart to notice. Sustained and about
         twice the baseline is both what a fibre break actually looks like
         and a shape the rest of the day survives.

         The arrival is what is concentrated; the clearance is not. A shift
         does not close two hundred alarms in the hour they land, and having
         them close in that hour drove the Cleared line to nearly three times
         its own baseline — a second spike, taller than the first, that said
         nothing the arrival spike had not. These are raised in the window and
         worked off over the hours after it. */
      const startedAgo = 640 + (k % 3) * 60 + Math.floor(rnd() * 55)
      /* Each alert is handed a clearance hour rather than a random duration:
         a uniform duration still bunches the closures into the few hours
         after the burst, which is the second spike this spreading exists to
         remove. Eight buckets, chosen off the row, spread the same closures
         thinly enough that the Cleared line stays inside its own baseline's
         neighbourhood — and none of them reach back past "now", so nothing
         clamps into the last hour. */
      const worked = ((k * 3 + i) % 10) * 60 + 20 + Math.floor(rnd() * 40)
      const durationMins = worked
      const closedAgo = startedAgo - worked
      return A({
        status: 'Closed', code: meta.code, name: cond,
        equip: ne.name, equipType: KIND_TYPE[ne.kind] || 'Router',
        equipId: `10.${40 + (i % 60)}.${(i * 5 + k) % 250}.${(i * 13 + k) % 250}`,
        location: locationOf(KIND_TYPE[ne.kind] || 'Router', ne.name),
        domain: ne.domain, vendor: ne.vendor, tech: techOf(ne),
        sev: pick(rnd, ['Critical', 'Critical', 'Major', 'Warning']), cls: meta.cls,
        incident: '-',
        start: shortStamp(startedAgo), close: shortStamp(closedAgo), lastOcc: shortStamp(closedAgo),
        occ: 1 + Math.floor(rnd() * 3), ageMins: startedAgo, aging: ageParts(durationMins),
        closedAgo, durationMins, duration: ageParts(durationMins),
        closedBy: pick(rnd, CLOSERS), resolution: pick(rnd, RESOLUTIONS),
        service: meta.svc ? 'Yes' : 'No', corr: 'Link correlation',
        desc: meta.desc, cause: meta.cause,
        region: ne.region, state: CITY_STATE[ne.city] || '-', city: ne.city, rf: ne.city,
        ems: EMS_BY_VENDOR[ne.vendor] || 'EPNM', group: meta.svc ? 'Network' : 'External',
        link: '-', ne: ne.name,
      })
    })
  })

/* The bulk fortnight-long trickle, the day-shaped fill and the one deliberate
   storm are all "what the shift already closed" — one population, so
   `closedHere` in buildDashboard (and the trend/storm chart that reads it)
   sees the full shape without needing its own separate source. */
const historyAlerts = [...baseHistoryAlerts, ...dayFillAlerts, ...stormAlerts]

/* The history is appended after the derived summaries above have already been
   taken from activeAlerts, so nothing on the dashboard moves. */
const closedAlerts = [...alerts.filter(a => a.status === 'Closed'), ...historyAlerts]
export const allAlerts = [...alerts, ...historyAlerts]

/* What the closed population says about how the shift performs. */
export const historyStats = (() => {
  const withDur = historyAlerts
  const mins = withDur.map(a => a.durationMins).sort((a, b) => a - b)
  const mid = mins[Math.floor(mins.length / 2)] || 0
  return {
    closed: closedAlerts.length,
    medianMins: mid,
    median: ageParts(mid),
    autoCleared: withDur.filter(a => a.closedBy === 'Auto-clear').length,
    slowest: withDur.slice().sort((a, b) => b.durationMins - a.durationMins)[0],
  }
})()

// --- Security flow records ----------------------------------------------
// Raised on the routers and firewalls carrying the traffic, not on the radio
// estate, so the elements named here are ones that would actually see a flow.

const SEC_CATEGORY = [
  { name: 'Port scan', sev: 'Major', action: 'Blocked' },
  { name: 'Brute force attempt', sev: 'Critical', action: 'Blocked' },
  { name: 'Policy violation', sev: 'Minor', action: 'Logged' },
  { name: 'Unusual egress volume', sev: 'Major', action: 'Rate-limited' },
  { name: 'Denied by ACL', sev: 'Minor', action: 'Blocked' },
  { name: 'Malformed packet', sev: 'Warning', action: 'Dropped' },
  { name: 'Session flood', sev: 'Critical', action: 'Rate-limited' },
]
const NAT_POOLS = ['RAILWIRE-POOL', 'ALERT-POOL', 'ENTERPRISE-POOL', 'BROADBAND-POOL', 'MPLS-POOL']

const SEC_ELEMENTS = alertingElements.filter(e =>
  ['Core router', 'Aggregation SW', 'Firewall'].includes(e.kind))

export const securityAlerts = SEC_ELEMENTS.flatMap((ne, i) => {
  const rnd = mulberry32(0xd1ce + i * 733)
  const n = 1 + Math.floor(rnd() * 3)
  return Array.from({ length: n }, () => {
    const cat = pick(rnd, SEC_CATEGORY)
    const minsAgo = 5 + Math.floor(rnd() * 2600)
    return {
      time: shortStamp(minsAgo),
      node: ne.name, city: ne.city, region: ne.region, domain: ne.domain, vendor: ne.vendor,
      pool: pick(rnd, NAT_POOLS),
      srcIp: `100.${64 + Math.floor(rnd() * 60)}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}`,
      srcPort: String(1024 + Math.floor(rnd() * 64000)),
      dstIp: `${100 + Math.floor(rnd() * 120)}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}`,
      dstPort: pick(rnd, ['22', '23', '80', '443', '3389', '8080', '161']),
      protocol: pick(rnd, ['TCP', 'UDP', 'ICMP']),
      category: cat.name, sev: cat.sev, action: cat.action,
      sessions: 1 + Math.floor(rnd() * 4000),
    }
  })
})

export const securityStats = {
  total: securityAlerts.length,
  blocked: securityAlerts.filter(a => a.action === 'Blocked').length,
  critical: securityAlerts.filter(a => a.sev === 'Critical').length,
  sources: new Set(securityAlerts.map(a => a.srcIp)).size,
  nodes: new Set(securityAlerts.map(a => a.node)).size,
}

// --- Rejected alerts -----------------------------------------------------
// What the ingestion pipeline dropped, and why. Every reason here is one the
// pipeline can actually raise, so the list doubles as a data-quality report.

const REJECT_REASONS = [
  'Network element under maintenance',
  'Severity not found in trap',
  'Clear time not found in trap',
  'Network element not found in trap',
  'Alert code not present in the catalogue',
  'Duplicate within the de-duplication window',
  'Source EMS not registered',
  'Malformed varbind in trap payload',
  'Element blocked by flood protection',
]

export const rejectedAlerts = alertingElements.flatMap((ne, i) => {
  const rnd = mulberry32(0xe2f0 + i * 419)
  if (rnd() > 0.55) return []
  const n = 1 + Math.floor(rnd() * 2)
  return Array.from({ length: n }, () => {
    const cond = CONDITIONS[Math.floor(rnd() * CONDITIONS.length)]
    const meta = COND_META[cond]
    const reason = pick(rnd, REJECT_REASONS)
    const mins = 5 + Math.floor(rnd() * 3000)
    return {
      time: shortStamp(mins), mins,
      equip: ne.name, equipType: KIND_TYPE[ne.kind] || 'Router',
      code: meta.code, name: cond,
      ems: rnd() > 0.4 ? pick(rnd, ['Warning', 'Minor', 'Info']) : 'NA',
      rca: reason,
      tech: techOf(ne),
      domain: ne.domain, vendor: ne.vendor, city: ne.city,
      /* A trap dropped for a catalogue gap or a mapping gap could be admitted
         by fixing the catalogue. One dropped as a duplicate, or because the
         element was under maintenance, was dropped correctly. */
      recoverable: reason !== 'Duplicate within the de-duplication window'
        && reason !== 'Network element under maintenance',
    }
  })
})

export const rejectStats = {
  total: rejectedAlerts.length,
  recoverable: rejectedAlerts.filter(r => r.recoverable).length,
  byReason: REJECT_REASONS.map(reason => ({
    reason, count: rejectedAlerts.filter(r => r.rca === reason).length,
  })).filter(r => r.count > 0).sort((a, b) => b.count - a.count),
}

// =========================================================================
//  THE DASHBOARD, REBUILT FOR ANY SUBSET OF THE ESTATE
//
//  Every panel on the Insights and Intelligence pages is a derivation over
//  one population. Passing that population in rather than reading a global
//  is what lets a domain or vendor filter narrow the whole page at once: the
//  tiles, the trend, the funnel, the queue and the incident set are all
//  counted off the same rows, so they cannot disagree with each other.
// =========================================================================

export function buildDashboard(rows, opts = {}) {
  const { domain = 'All', vendor = 'All' } = opts
  const total = rows.length
  /* The closed population, narrowed the same way, so the clearance figures
     describe the same slice of the estate as everything above them. */
  const closedHere = historyAlerts.filter(a =>
    (domain === 'All' || a.domain === domain) && (vendor === 'All' || a.vendor === vendor))

  const bySev = countBy(rows, a => a.sev)
  const byCls = countBy(rows, a => a.cls)

  /* One severity's arrival profile across the last 24 hours — read off the
     closed population (via `ageMins`, when each one started), not the open
     one. An open alert's own age is deliberately kept to its first hour for
     the alert list's Duration column, which would leave the other 23 hours
     of this chart with nothing to draw. */
  const trendFor = sev => {
    const out = Array(24).fill(0)
    closedHere.filter(a => a.sev === sev).forEach(a => {
      const h = hoursAgo(a)
      if (h < 24) out[23 - h] += 1
    })
    return out
  }
  const trend = {
    Critical: trendFor('Critical'), Major: trendFor('Major'),
    Minor: trendFor('Minor'), Warning: trendFor('Warning'),
  }
  const perHour = trendLabels.map((_, i) =>
    trend.Critical[i] + trend.Major[i] + trend.Minor[i] + trend.Warning[i])
  const storm = { counts: perHour, ...detectStorm(perHour) }

  const cleared = Array(24).fill(0)
  closedHere.forEach(a => { const h = Math.floor(a.closedAgo / 60); if (h < 24) cleared[23 - h] += 1 })

  const raisedDay = rows.filter(a => ageMinsOf(a) < 1440).length
  const closedDay = closedHere.filter(a => a.closedAgo < 1440).length
  const durs = closedHere.map(a => a.durationMins)

  /* What the busiest window was actually made of. A burst that carries the
     same mix as the rest of the day is a volume spike, not an event. */
  const profile = (() => {
    const w = storm.worst
    if (!w) return null
    const inWindow = closedHere.filter(a => {
      const h = hoursAgo(a)
      if (h >= 24) return false
      const slot = 23 - h
      return slot >= w.from && slot <= w.to
    })
    const byName = countBy(inWindow, a => a.name)
    const byDomain = countBy(inWindow, a => a.domain)
    const topAlert = topCondition(byName, inWindow)
    const topDomain = Object.entries(byDomain)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    return {
      from: trendLabels[w.from], to: trendLabels[Math.min(w.to + 1, trendLabels.length - 1)],
      peak: w.peak, count: inWindow.length,
      topAlert: topAlert ? topAlert[0] : '\u2014', topAlertCount: topAlert ? topAlert[1] : 0,
      topDomain: topDomain ? topDomain[0] : '\u2014', topDomainCount: topDomain ? topDomain[1] : 0,
      critical: inWindow.filter(a => a.sev === 'Critical').length,
    }
  })()

  /* Incidents are the alerts' own correlation ids, grouped. Nothing is
     authored here, so an incident can only ever name alerts this page holds. */
  const groups = rows.filter(a => a.incident && a.incident !== '-')
    .reduce((m, a) => ((m[a.incident] = m[a.incident] || []).push(a), m), {})
  const incs = Object.entries(groups).map(([id, list]) => ({
    id, alerts: list.length, sev: worstOf(list),
    node: list[0].equip, city: list[0].city, region: list[0].region, domain: list[0].domain,
    name: list.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)[0].name,
    service: list.some(a => a.service === 'Yes'),
  })).sort((a, b) => b.alerts - a.alerts || SEV_RANK[b.sev] - SEV_RANK[a.sev])

  const occ = rows.reduce((n, a) => n + occurrencesIn24h(a), 0)
  /* The alerts those occurrences actually folded into, and what became of
     them — the same population at every stage of the funnel. */
  const foldedRows = rows.filter(a => occurrencesIn24h(a) > 0)
  const foldedCorr = foldedRows.filter(a => a.corr !== 'Non Correlation')
  const foldedIncs = new Set(
    foldedCorr.map(a => a.incident).filter(i => i && i !== '-')).size
  const rows24 = rows.filter(a => ageMinsOf(a) < 1440)
  const incs24 = Object.values(groups).filter(g => Math.max(...g.map(ageMinsOf)) < 1440).length
  const domainsHere = [...new Set(rows.map(a => a.domain))]

  /* Occurrences per element, which is what "noise" actually means here — a
     handful of elements re-raising the same condition thousands of times. */
  const byNode = list => Object.values(list.reduce((m, a) => {
    const e = m[a.equip] || (m[a.equip] = { node: a.equip, count: 0, rows: [] })
    e.count += occurrencesIn24h(a)
    e.rows.push(a)
    return m
  }, {}))
  const offenders = byNode(rows).map(n => {
    const worst = n.rows.slice().sort((a, b) => b.occ - a.occ)[0]
    return {
      node: n.node, count: n.count, sev: worstOf(n.rows),
      alertName: worst.name, alerts: n.rows.length, city: worst.city,
    }
  }).sort((a, b) => b.count - a.count || SEV_RANK[b.sev] - SEV_RANK[a.sev]).slice(0, 9)

  const byNodeOcc = byNode(rows).sort((a, b) => b.count - a.count)
  /* The shortest list of elements that accounts for almost all the volume —
     stop at 96% or four elements, whichever comes first. */
  const src = []
  let cum = 0
  for (const n of byNodeOcc) {
    if (cum / (occ || 1) >= 0.96 || src.length >= 4) break
    const worst = n.rows.slice().sort((a, b) => b.occ - a.occ)[0]
    src.push({
      node: n.node, occ: n.count, alerts: n.rows.length, city: worst.city,
      domain: worst.domain, vendor: worst.vendor, name: worst.name, sev: worstOf(n.rows),
      share: +((n.count / (occ || 1)) * 100).toFixed(1),
    })
    cum += n.count
  }

  /* The worklist rows for exactly these alerts, so the queue figures narrow
     with the page rather than describing the whole estate. */
  const ids = new Set(rows.map(a => a.id))
  const wl = _wl.filter(i => ids.has(i.alertId))
  const open = wl.filter(i => !i.deferred)
  const wlAcked = wl.filter(i => i.acked && i.ackMins != null)

  return {
    rows,
    total,
    severities: ['Critical', 'Major', 'Minor', 'Warning', 'Info']
      .map(sev => ({ sev, count: bySev[sev] || 0, color: SEV_COLOR[sev] })).filter(s => s.count > 0),
    classifications: ['Outage', 'Deterioration', 'Notification', 'Normal']
      .map(value => ({ name: CLS_LABEL[value] || value, value, count: byCls[value] || 0, color: CLS_COLOR[value] })).filter(c => c.count > 0),
    aging: AGE_BUCKETS.map(([bucket, cap], i) => {
      const lo = i === 0 ? 0 : AGE_BUCKETS[i - 1][1]
      return { bucket, count: rows.filter(a => { const m = ageMinsOf(a); return m >= lo && m < cap }).length }
    }),
    serviceAffecting: rows.filter(a => a.service === 'Yes').length,
    correlated: rows.filter(a => a.corr !== 'Non Correlation').length,
    /* Deferred items are excluded — something parked deliberately is not
       breaching. */
    breachBySeverity: ['Critical', 'Major', 'Minor', 'Warning'].map(sev => {
      const own = open.filter(i => i.sev === sev)
      const late = own.filter(i => i.slaMins < 0)
      return {
        sev, late: late.length, total: own.length,
        pct: own.length ? Math.round((late.length / own.length) * 100) : 0,
        color: SEV_COLOR[sev],
      }
    }).filter(b => b.total > 0),
    oldest: (() => {
      const o = rows.slice().sort((a, b) => ageMinsOf(b) - ageMinsOf(a))[0]
      if (!o) return null
      const mins = ageMinsOf(o)
      return {
        name: o.name, equip: o.equip, city: o.city, sev: o.sev, aging: o.aging,
        over: mins - (SEV_SLA[o.sev] || 720),
      }
    })(),
    alertTrend: trend,
    storm,
    stormProfile: profile,
    incidentGroups: groups,
    cleared,
    ops: {
      raisedDay, closedDay,
      /* The rows behind the two day counts, so a tile can show its working. */
      raisedRows: rows.filter(a => ageMinsOf(a) < 1440),
      closedRows: closedHere.filter(a => a.closedAgo < 1440),
      /* What was cleared in the last day, by severity, against the day before
         it — so "resolved" carries a direction rather than a bare count. The
         comparison is the same population shifted one day back, not a
         different one. */
      resolvedBySeverity: (() => {
        const day = closedHere.filter(a => a.closedAgo < 1440)
        const prev = closedHere.filter(a => a.closedAgo >= 1440 && a.closedAgo < 2880)
        const line = (label, pick) => {
          const now = day.filter(pick).length
          const was = prev.filter(pick).length
          return { sev: label, count: now, prev: was,
            delta: was ? Math.round(((now - was) / was) * 1000) / 10 : null }
        }
        return [
          line('Total', () => true),
          ...['Critical', 'Major', 'Minor'].map(sev => line(sev, a => a.sev === sev)),
        ]
      })(),
      clearanceRate: Math.round((closedDay / Math.max(1, raisedDay)) * 100),
      mttr: Math.round(durs.reduce((a, b) => a + b, 0) / Math.max(1, durs.length)),
      mttrText: ageParts(Math.round(durs.reduce((a, b) => a + b, 0) / Math.max(1, durs.length))),
      mtta: Math.round(wlAcked.reduce((n, i) => n + i.ackMins, 0) / Math.max(1, wlAcked.length)),
      mttaText: ageParts(Math.round(wlAcked.reduce((n, i) => n + i.ackMins, 0) / Math.max(1, wlAcked.length))),
    },
    incidents: incs,
    incidentPriority: ['Emergency', 'Critical', 'Major', 'Minor'].map(name => ({
      name, count: incs.filter(i => PRIORITY_OF[i.sev] === name).length,
    })).filter(x => x.count > 0),
    // The intelligence panels are the same derivations over the same rows, so
    // a filtered page cannot show nine incidents in one panel and fifteen in
    // the tile above it.
    activeIncidents: incs.map(i => ({
      domain: i.domain, vendor: (groups[i.id] || [])[0]?.vendor || '-',
      prio: PRIORITY_OF[i.sev] || 'Major',
      id: i.id, name: i.name, alerts: i.alerts, city: i.city, sev: i.sev,
    })),
    clusters: buildClusters(incs, groups),
    topAlertTypes: Object.entries(rows.reduce((m, a) => (m[a.name] = (m[a.name] || 0) + a.occ, m), {}))
      .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    topOffenders: offenders,
    heatDomains: domainsHere,
    /* Same reason the trend chart reads the closed population: an open
       alert's own age is held to its first hour now, which would otherwise
       dump every domain's whole count into the single most-recent window. */
    heatmap: domainsHere.map(d => heatWindows.map((w, wi) => closedHere.filter(a => {
      if (a.domain !== d) return false
      const h = hoursAgo(a)
      return h < 24 && Math.floor((23 - h) / 3) === wi
    }).length)),
    domainHealth: domainsHere.map(d => {
      const own = rows.filter(a => a.domain === d)
      const estateNodes = new Set(networkElements.filter(n => n.domain === d).map(n => n.name))
      const hit = new Set(own.map(a => a.equip))
      // The ring's own numbers (alerts/crit/nodes hit) are still the current
      // open state; only the twelve-hour sparkline needs a population with
      // real spread across those hours, so it alone reads off closedHere.
      const closedOwn = closedHere.filter(a => a.domain === d)
      const spark = Array.from({ length: 12 }, (_, k) => closedOwn.filter(a => {
        const h = hoursAgo(a); return h < 24 && 23 - h === 12 + k
      }).length)
      return {
        domain: d, alerts: own.length, crit: own.filter(a => a.sev === 'Critical').length,
        nodes: estateNodes.size, hit: hit.size, clean: Math.max(0, estateNodes.size - hit.size),
        health: estateNodes.size ? Math.round(((estateNodes.size - hit.size) / estateNodes.size) * 100) : 100,
        spark, trend: spark.slice(6).reduce((a, b) => a + b, 0) - spark.slice(0, 6).reduce((a, b) => a + b, 0),
        service: own.filter(a => a.service === 'Yes').length,
      }
    }).sort((a, b) => a.health - b.health),
    vendorPosture: Object.values(rows.reduce((m, a) => {
      const e = m[a.vendor] || (m[a.vendor] = { vendor: a.vendor, alerts: 0, crit: 0, nodes: new Set() })
      e.alerts++; if (a.sev === 'Critical') e.crit++
      e.nodes.add(a.equip)
      return m
    }, {})).map(v => ({ vendor: v.vendor, alerts: v.alerts, crit: v.crit, nodes: v.nodes.size,
      fleet: networkElements.filter(n => n.vendor === v.vendor).length,
      critPct: Math.round((v.crit / v.alerts) * 100) })).sort((a, b) => b.alerts - a.alerts),
    /* One population, walked stage by stage — see the note on the estate-wide
       funnel above. */
    noiseFunnel: [
      { stage: 'Raw occurrences', value: occ, color: 'var(--grayColor400)' },
      { stage: 'Deduplicated alerts', value: foldedRows.length, color: 'var(--vw-color-blue-300)' },
      { stage: 'Correlated', value: foldedCorr.length, color: 'var(--vw-color-indigo-300)' },
      { stage: 'Open incidents', value: foldedIncs, color: 'var(--red)' },
    ],
    rawOccurrences: occ,
    incidentsOpened24h: incs24,
    incidentsFromOccurrences: foldedIncs,
    suppressionRatio: Math.round(occ / Math.max(1, foldedIncs)),
    noiseSources: {
      top: src, topShare: +((cum / (occ || 1)) * 100).toFixed((cum / (occ || 1)) > 0.99 ? 2 : 1),
      tail: byNodeOcc.length - src.length,
      tailOcc: byNodeOcc.slice(src.length).reduce((n, e) => n + e.count, 0),
    },
    correlationBreakdown: (() => {
      const sizes = Object.values(groups).map(g => g.length)
      return {
        incidents: sizes.length, largest: Math.max(...sizes, 0),
        multi: sizes.filter(n => n > 1).length, single: sizes.filter(n => n === 1).length,
        avg: +(sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length)).toFixed(1),
        uncorrelated: rows.filter(a => a.corr === 'Non Correlation').length,
      }
    })(),
    prioritised: buildPrioritised(wl),
    actions: buildActionQueue(wl, src, occ),
    /* Counted over the queue rather than the whole worklist, so these agree
       with the queue figures beside them. Deferred items are excluded there
       — something parked deliberately is not waiting on anyone — and a page
       that says "201 in the queue" beside an action summary adding to 214 is
       asking the reader to reconcile two populations it never named. */
    actionSummary: {
      unacknowledged: open.filter(i => !i.acked).length,
      unassigned: open.filter(i => i.owner === 'Unassigned').length,
      acknowledged: open.filter(i => i.acked).length,
      affectedNodes: new Set(rows.map(a => a.equip)).size,
    },
    queue: {
      doNow: wl.filter(i => bucketOf(i) === 'Do now').length,
      today: wl.filter(i => bucketOf(i) === 'Today').length,
      breaching: open.filter(i => i.slaMins < 0).length,
      unassigned: wl.filter(i => i.owner === 'Unassigned').length,
      open: open.length,
      top: open.slice(0, 3),
      /* The whole prioritised list, not just its head: a tile that says "99
         past their clock" has to be able to show which 99. */
      all: open,
    },
    regions: regions.map(r => {
      const own = rows.filter(a => a.region === r.name)
      return { ...r, alerts: own.length }
    }),
    locations: geoSites.map(site => {
      const own = rows.filter(a => a.city === site.city)
      const byName = countBy(own, r => r.name)
      const topName = Object.entries(byName).sort((a, b) => b[1] - a[1])[0]
      const nodes = [...new Set(own.map(r => r.equip))]
      const worst = own.slice().sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev])[0]
      return {
        location: site.city, region: site.region, state: CITY_STATE[site.city] || '-',
        sev: worst ? worst.sev : 'Minor',
        alertName: topName ? `${(COND_META[topName[0]] || {}).code || ''} - ${topName[0]}` : '—',
        critical: own.filter(r => r.sev === 'Critical').length,
        nodes: nodes.length, alerts: own.length, estate: site.ne,
        service: own.filter(r => r.service === 'Yes').length,
        top: nodes.slice(0, 3), more: Math.max(0, nodes.length - 3),
      }
    }).filter(l => l.alerts > 0).sort((a, b) => b.alerts - a.alerts),
  }
}

/* The domains and vendors the filter can offer — only ones with alerts. */
export const filterDomains = ['All', ...new Set(activeAlerts.map(a => a.domain))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))
export const filterVendors = ['All', ...new Set(activeAlerts.map(a => a.vendor))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))


// =========================================================================
//  The action queue and the correlation rules
//  These were the last things in the module still typed in by hand. Both are
//  now counted off the same population as everything else, so an action names
//  an element the alert list holds and a rule reports how many of the open
//  incidents it actually made. The per-population equivalents that the pages
//  read live on buildDashboard, so a filtered page gets a filtered version of
//  each rather than the estate-wide one under a filtered heading.
// =========================================================================

/* The remediations worth doing next, read off the queue and the noise
   sources rather than written out. Each one names an element the alert list
   holds, and says what clearing it would actually close. */
const REMEDIATION = {
  'Loss of Signal': 'Check the span end to end — connector, patch and transceiver — and confirm transmit and receive are not swapped on',
  'Node Down': 'Confirm power, reachability and uplink state on',
  'Card Failure': 'Raise a field task to replace the failed line card in',
  'Power Supply Fault': 'Confirm the mains feed and replace the failed PSU in',
  'Link Down': 'Inspect the physical port, optics and patch, then confirm the interface is not administratively shut on',
  'High Temperature': 'Check cooling and airflow on',
  'BGP Peer Down': 'Review the peering session and reset it once the far end is confirmed reachable on',
  'Optical Power Low': 'Clean the connectors and measure the span budget on',
  'OSPF Nbr State Change': 'Confirm area, timers and authentication match on both ends of',
  'CPU Utilisation High': 'Profile the control plane load on',
  'Packet Discard Rate': 'Review queueing and buffer allocation on',
  'Clock Drift': 'Restore the primary synchronisation reference for',
  'SNMP Trap OSPFNbrState': 'Confirm the neighbour is reachable from',
  'Config Drift Detected': 'Reconcile the running configuration against the approved baseline on',
  'Licence Expiring': 'Renew the expiring feature licence on',
  'Backup Overdue': 'Re-run the configuration backup job for',
  'ISIS Adjacency Change Down': 'Check the adjacency on both ends and verify the underlying link and ISIS level on',
  'Mpls L3 Vpn Vrf Down': 'Confirm the VRF interfaces are up and the route targets still match on',
  'Ospf Nbr State Change': 'Confirm area, timers and authentication match on both ends of',
  'Cisco Config Man Event': 'Review the out-of-process configuration change made on',
  UPDOWN: 'Inspect the interface that changed state on',
}

export function buildActionQueue(queue, sources, occTotal) {
  // Candidates are the head of the queue plus the loudest elements — the two
  // things a shift can act on that pay back most.
  const seen = new Set()
  const rows = []
  const consider = (item, why) => {
    if (rows.length >= 6 || seen.has(item.ne)) return
    seen.add(item.ne)
    const onNode = queue.filter(i => i.ne === item.ne)
    const occ = onNode.reduce((n, i) => n + i.occ, 0)
    rows.push({
      prio: `P${rows.length + 1}`,
      node: item.ne, city: item.city, domain: item.domain, vendor: item.vendor,
      sev: item.sev, alert: item.alert, incident: item.incident,
      alerts: onNode.length, occ,
      action: `${REMEDIATION[item.alert] || 'Investigate the reported condition on'} ${item.ne}.`,
      note: why,
      itemId: item.id, alertId: item.alertId,
    })
  }
  // Whatever is generating the most occurrences comes first: those are the
  // elements the funnel names as the source of nearly all the volume.
  sources.forEach(n => {
    const occ = n.occ ?? n.count
    const item = queue.find(i => i.ne === n.node)
    const share = occTotal ? +((occ / occTotal) * 100).toFixed(1) : n.share
    if (item) consider(item, `${compactCount(occ)} occurrences — ${share}% of everything in view.`)
  })
  // Then the top of the prioritised queue.
  queue.filter(i => !i.deferred).forEach(item => {
    const onNode = queue.filter(i => i.ne === item.ne)
    consider(item, onNode.length > 1
      ? `Priority ${item.priority} in ${item.city} — clears ${onNode.length} open alerts on one element.`
      : `Priority ${item.priority} in ${item.city}${item.service ? ', service-affecting' : ''} — ${item.slaMins < 0 ? 'already past its resolution clock' : slaLabel(item.slaMins)}.`)
  })
  return rows
}

/* The correlation rules the pipeline runs, each reporting what it actually
   matched in the current population. A rule with a description and no count
   is a claim; a rule with a count is a control the operator can judge. */
export const correlationRules = (() => {
  const groups = Object.values(incidentGroups)
  const bySite = {}
  activeAlerts.forEach(a => { if (a.corr !== 'Non Correlation') bySite[a.city] = (bySite[a.city] || 0) + 1 })
  const byElement = {}
  activeAlerts.forEach(a => { byElement[a.equip] = (byElement[a.equip] || 0) + 1 })
  const parents = new Set(CHAIN.map(([p]) => p))
  const feeds = connectivity.length

  return [
    { key: 'corrLink', name: 'Link correlation', enabled: true,
      desc: 'Groups alerts that share a link identifier into one incident, so a single span failure raises one incident rather than one per endpoint.',
      matched: activeAlerts.filter(a => a.corr === 'Link correlation').length, unit: 'alerts grouped' },
    { key: 'corrNeCount', name: 'NE count', enabled: true,
      desc: 'Flags a widespread outage when the number of distinct elements alerting on one site crosses its threshold.',
      matched: Object.values(bySite).filter(n => n >= 5).length, unit: 'sites over threshold' },
    { key: 'corrParentChild', name: 'Parent-Child', enabled: true,
      desc: 'Suppresses a child alert when its parent condition is already open on the same element.',
      matched: activeAlerts.filter(a => parents.has(a.name)).length, unit: 'parent conditions open' },
    { key: 'corrSelf', name: 'Self correlation', enabled: false,
      desc: 'Folds repeated alerts from a single element into one incident. Disabled — with it off, each condition on an element stays its own row.',
      matched: Object.values(byElement).filter(n => n > 1).length, unit: 'elements raising more than one' },
    { key: 'corrTopology', name: 'Topology', enabled: true,
      desc: 'Correlates along the network graph so a fault upstream absorbs the symptoms it caused downstream.',
      matched: groups.filter(g => new Set(g.map(r => r.equip)).size > 1).length, unit: 'multi-element incidents' },
    { key: 'corrIntermittent', name: 'Intermittent', enabled: true,
      desc: 'Detects flapping — an element re-raising the same condition repeatedly inside the window — and holds it out of the incident stream.',
      matched: activeAlerts.filter(a => a.occ >= 3).length, unit: 'flapping alerts held' },
    { key: 'corrNone', name: 'Non correlation', enabled: false,
      desc: 'Raises an incident per alert for named elements regardless of grouping. Disabled — these alerts stay uncorrelated in the queue.',
      matched: activeAlerts.filter(a => a.corr === 'Non Correlation').length, unit: 'alerts left uncorrelated' },
    { key: 'corrHeartbeat', name: 'Heartbeat correlation', enabled: true,
      desc: 'Watches EMS connectivity and raises one incident for a lost feed instead of an alert storm from everything behind it.',
      matched: connectivity.filter(c => c.status === 'Disconnected').length, unit: `of ${feeds} feeds down` },
  ]
})()

/* Vendor fleets: how many elements each vendor has under management, and how
   much of the current load it is carrying. Alerting nodes are a subset of the
   fleet, so the two are counted from different populations. */
export const vendorFleet = vendorPosture.map(v => ({
  ...v,
  fleet: networkElements.filter(n => n.vendor === v.vendor).length,
  alertingNodes: v.nodes,
}))


// =========================================================================
//  Correlation rule sets
//  Each rule on the Correlation screen is a kind of rule, not a single rule:
//  behind "NE count" sit the individual thresholds an operator configured,
//  each scoped to a domain, a vendor, an equipment type and a geography.
//  This generates that population, one set per rule type, drawn from the same
//  estate as everything else — so a rule names an equipment type the fleet
//  actually runs and a vendor that actually supplies it.
// =========================================================================

export const CORRELATION_GEOGRAPHY = ['Region', 'State', 'City', 'Data center']
export const CORRELATION_CLASSES = ['Outage', 'Deterioration', 'Normal', 'Notification']
export const equipmentTypes = [...new Set(Object.values(KIND_TYPE))].sort()
export const CORRELATION_STATUS = ['Enabled', 'Disabled']

/* Every rule carries who made it and who touched it last. */
function stampFields(rnd) {
  const madeAgo = 4000 + Math.floor(rnd() * 500000)
  const touchedAgo = Math.floor(rnd() * madeAgo)
  return {
    creator: pick(rnd, CREATORS), createdOn: shortStamp(madeAgo),
    modifier: pick(rnd, CREATORS), modifiedOn: shortStamp(touchedAgo),
  }
}

/* The scope every rule shares: which slice of the estate it watches. The
   element is picked off the rule's own seed as well as its index, or every
   set would open on the same domain, vendor and equipment type. */
function scopeFields(rnd, i, seed) {
  const el = alertingElements[(seed + i * 17) % alertingElements.length]
  return {
    status: rnd() > 0.18 ? 'Enabled' : 'Disabled',
    domain: el.domain,
    vendor: el.vendor,
    equipType: KIND_TYPE[el.kind] || 'Router',
  }
}

/* A condition the estate can actually raise, with its catalogue code. */
function conditionOf(rnd) {
  const name = pick(rnd, Object.keys(COND_META))
  return { alertName: name, alertCode: COND_META[name].code, classification: COND_META[name].cls }
}

/* The alerts a saved rule names, drawn from the catalogue entries its own
   domain and vendor actually carry — a Nokia RAN rule has no business
   listing ADVA transport traps. Deterministic, so a rule shows the same
   alerts on every render and in every build. */
function catalogueFor(scope, rnd, count) {
  const pool = catalogue.filter(c => c.domain === scope.domain && c.vendor === scope.vendor)
  const from = pool.length ? pool : catalogue
  /* Walk the pool once on an odd stride rather than drawing until enough
     unique entries appear: a pool whose entries repeat a code would never
     satisfy a "draw N distinct" loop, and the module would hang on import. */
  const out = []
  const stride = 1 + 2 * Math.floor(rnd() * 3)
  const start = Math.floor(rnd() * from.length)
  for (let step = 0; step < from.length && out.length < count; step++) {
    const c = from[(start + step * stride) % from.length]
    if (!out.some(x => x.code === c.code && x.identifier === c.identifier)) out.push(c)
  }
  return out.map(c => ({
    code: c.code, name: c.name, identifier: c.identifier,
    domain: c.domain, vendor: c.vendor,
  }))
}

const ruleSet = (seed, count, build) =>
  Array.from({ length: count }, (_, i) => {
    const rnd = mulberry32(seed + i * 101)
    const scope = scopeFields(rnd, i, seed)
    return { ...scope, ...build(rnd, i, scope), ...stampFields(rnd) }
  })

export const correlationRuleSets = {
  /* Groups alerts sharing a link identifier. Scoped by link type and by how
     long a span may flap before the rule stops folding it. */
  corrLink: ruleSet(0x1a01, 6, (rnd, i, scope) => ({
    name: `${pick(rnd, ['Metro', 'Core', 'Access', 'Backhaul'])} span correlation ${i + 1}`,
    linkType: pick(rnd, ['OSPF', 'ISIS', 'BGP', 'Bundle-Ether', 'L3VPN']),
    classification: pick(rnd, CORRELATION_CLASSES),
    windowMins: pick(rnd, [5, 10, 15, 30, 60]),
    linkedAlerts: catalogueFor(scope, rnd, 2 + Math.floor(rnd() * 3))
      .map((c, n) => ({ ...c, priority: n + 1, tag: pick(rnd, ['Root', 'Symptom', 'Suppress', '']) })),
  })),

  /* A widespread-outage threshold: how many distinct elements must alert
     inside one geography before the rule raises an incident, per severity. */
  corrNeCount: ruleSet(0x2b02, 6, (rnd, i) => ({
    name: `${pick(rnd, ['DWDM region', 'RAN cell', 'Core node', 'Access ring'])} density correlation ${i + 1}`,
    classification: pick(rnd, CORRELATION_CLASSES),
    geography: pick(rnd, CORRELATION_GEOGRAPHY),
    availableNE: 3 + Math.floor(rnd() * 40),
    neEmergency: 10 + Math.floor(rnd() * 20),
    neCritical: 20 + Math.floor(rnd() * 30),
    neMajor: 30 + Math.floor(rnd() * 40),
    neMinor: 50 + Math.floor(rnd() * 120),
  })),

  /* One condition suppressed while its parent is open on the same element. */
  corrParentChild: ruleSet(0x3c03, 8, (rnd, i, scope) => {
    const [parent, children] = CHAIN[i % CHAIN.length]
    const child = children[Math.floor(rnd() * children.length)]
    /* The rule names one parent condition and the children it suppresses,
       as catalogue entries rather than as bare strings. */
    const asAlert = cond => ({
      code: (COND_META[cond] || {}).code || '0000',
      name: cond,
      identifier: cond.replace(/[^A-Za-z]/g, '').slice(0, 18),
      domain: scope.domain, vendor: scope.vendor,
    })
    return {
      name: `${child} under ${parent}`,
      primary: parent,
      alertName: child,
      alertCode: (COND_META[child] || {}).code || '0000',
      identifier: child.replace(/[^A-Za-z]/g, '').slice(0, 16),
      classification: (COND_META[child] || {}).cls || 'Outage',
      primaryAlert: asAlert(parent),
      childAlerts: children.slice(0, 3).map(asAlert),
    }
  }),

  /* Repeated alerts from a single element folded into one incident. */
  corrSelf: ruleSet(0x4d04, 5, (rnd, i) => ({
    name: `Repeat suppression ${i + 1}`,
    ...conditionOf(rnd),
    occurrenceCount: 3 + Math.floor(rnd() * 20),
    monitorPeriod: pick(rnd, [10, 15, 30, 60, 120]),
  })),

  /* Correlation along the network graph, to a depth in hops. */
  corrTopology: ruleSet(0x5e05, 5, (rnd, i, scope) => ({
    name: `${pick(rnd, ['Upstream', 'Downstream', 'Ring', 'Spur'])} topology correlation ${i + 1}`,
    classification: pick(rnd, CORRELATION_CLASSES),
    geography: pick(rnd, CORRELATION_GEOGRAPHY),
    depth: 1 + Math.floor(rnd() * 4),
    /* The transfer control stores "code·identifier"; the view resolves each
       back to the catalogue entry it names. */
    alertIds: catalogueFor(scope, rnd, 2 + Math.floor(rnd() * 3)).map(c => c.code + '·' + c.identifier),
  })),

  /* Flapping: an element re-raising the same condition inside a window. */
  corrIntermittent: ruleSet(0x6f06, 6, (rnd, i) => ({
    name: `${pick(rnd, ['FEC recurring degradation', 'DMP threshold exceeded', 'Cell down occurrence', 'Power flap', 'Optic flap'])} correlation ${i + 1}`,
    ...conditionOf(rnd),
    serviceAffected: rnd() > 0.4 ? 'Yes' : 'No',
    occurrenceCount: 3 + Math.floor(rnd() * 45),
    monitorPeriod: pick(rnd, [12, 16, 35, 60, 120]),
  })),

  /* Named elements that always raise their own incident. */
  corrNone: ruleSet(0x7a07, 5, (rnd, i) => ({
    name: `Always raise — ${pick(rnd, ['edge routers', 'firewalls', 'core UPF', 'DWDM line', 'aggregation'])} ${i + 1}`,
    ...conditionOf(rnd),
    scope: pick(rnd, CORRELATION_GEOGRAPHY),
  })),

  /* EMS feed loss, raised once instead of as a storm from everything behind it. */
  corrHeartbeat: ruleSet(0x8b08, 5, (rnd, i) => {
    const feed = connectivity[(i * 7) % connectivity.length]
    return {
      name: `${feed.ems} heartbeat ${i + 1}`,
      ems: feed.ems,
      monitor: feed.monitor,
      missedBeats: 2 + Math.floor(rnd() * 6),
      monitorPeriod: pick(rnd, [5, 10, 15, 30]),
    }
  }),
}

// =========================================================================
//  NODE DETAIL — one network element, in full
//
//  The alert list names an element on every row; this is what sits behind
//  that name. Everything a reader can check against another page is read off
//  the estate rather than written here: the alerts are the node's own rows
//  from the same population the list pages, the incidents are the ones those
//  rows correlate into, and the geography, vendor and EMS come from the
//  element record.
//
//  What a live EMS would return and this estate does not carry — a shelf
//  layout, a pluggable's serial, a channel's pre-FEC error rate — is
//  generated from the element's name, so it is stable across reloads and the
//  same node always reads the same way. It is anchored rather than free: the
//  modules and channels that come back flagged are the ones the node's open
//  alerts are actually about, so the hardware view and the alert view cannot
//  disagree.
// =========================================================================

const neByName = new Map(networkElements.map(n => [n.name, n]))
/* Whether a name is an element on this estate — the test for whether naming
   it anywhere can open its node view. */
export const isNetworkElement = name => neByName.has(name)
/* Other screens and other applications name an element by its management IP
   rather than its name — a blocked-NE rule does, and so does a performance
   counter. The IP an element's own alerts carry resolves back to it. */
let ipIndex = null
export const elementForIp = ip => {
  if (!ipIndex) {
    ipIndex = new Map()
    allAlerts.forEach(a => { if (a.equipId && neByName.has(a.equip) && !ipIndex.has(a.equipId)) ipIndex.set(a.equipId, a.equip) })
  }
  return ipIndex.get(ip) || null
}
/* A name or an IP, as another screen or application might hand it over. */
export const resolveElement = ref => {
  if (!ref) return null
  const s = String(ref).trim()
  if (neByName.has(s)) return s
  if (neByName.has(s.toUpperCase())) return s.toUpperCase()
  return elementForIp(s)
}

/* Four kinds of node, four kinds of thing to show. An OLT is not a line
   system: it has PON ports and the homes behind them, not degrees and
   amplifiers. An amplifier tab on a
   base station would be invention; a channel plan on a firewall likewise. */
const NODE_CLASS = {
  'DWDM node': 'optical', 'OLT': 'pon',
  'Core router': 'packet', 'Aggregation SW': 'packet', 'Firewall': 'packet', 'UPF': 'packet',
  'gNodeB': 'radio', 'eNodeB': 'radio',
}

/* Real part numbers for the vendors this estate actually carries. Without an
   entry the detail dialog falls back to "<vendor> <kind>", which reads as a
   placeholder rather than as kit — so every vendor in VENDORS_BY_DOMAIN has
   one, and the vendors no domain runs any more have been dropped. */
const NODE_MODEL = {
  optical: {
    ADVA: 'FSP 3000R7', Huawei: 'OptiX OSN 9800', Cisco: 'NCS 2006',
    Juniper: 'TCX1000', Nokia: '1830 PSS-16', Ericsson: 'Optical 1662', Samsung: 'OTN-4400',
    Tejas: 'TJ1600-8', DZS: 'MX-960e', OKI: 'OP-8500', ACME: 'AX-7200',
    Allot: 'NX-4400', Mavenir: 'MV-OTN', Qucell: 'QC-1600', Quanta: 'QCT-OPT', HP: 'HPE-OPT',
  },
  packet: {
    ADVA: 'XG210', Huawei: 'NE40E-X8', Cisco: 'ASR 9906',
    Juniper: 'MX960', Nokia: '7750 SR-14s', Ericsson: 'Router 6675', Samsung: 'CN-8000',
    Tejas: 'TJ1400P', DZS: 'Chronos-3000', OKI: 'OP-9400', ACME: 'AX-9100',
    Allot: 'NetXplorer 9', Mavenir: 'MV-UPF 4', Qucell: 'QC-9200',
    Quanta: 'QuantaMesh T7', HP: 'ProLiant DL380',
  },
  pon: {
    ADVA: 'FSP 150-XG118', Huawei: 'MA5800-X17', Cisco: 'NCS 540 PON', Juniper: 'ACX7100 PON',
    Nokia: '7360 ISAM FX-16', Ericsson: 'EDA 1500', Samsung: 'SPN-3200', Tejas: 'TJ1400 OLT',
    DZS: 'MXK-F1419', OKI: 'OP-OLT16', ACME: 'AX-OLT16', Allot: 'NX-PON', Mavenir: 'MV-OLT',
    Qucell: 'QC-OLT8', Quanta: 'QCT-OLT', HP: 'HPE-OLT',
  },
  radio: {
    ADVA: 'RU-3400', Huawei: 'BBU5900', Cisco: 'ASR 5700',
    Juniper: 'RAN-C4', Nokia: 'AirScale ASIA', Ericsson: 'Baseband 6630', Samsung: 'vRAN 3.0',
    Tejas: 'TJ-RU200', DZS: 'DZ-RU400', OKI: 'OP-RU100', ACME: 'AX-RU600',
    Allot: 'NX-RAN', Mavenir: 'OpenBeam 5G', Qucell: 'QC-RU5000',
    Quanta: 'QCT-RU', HP: 'HPE-RU',
  },
}

/* Within the packet class a firewall, a UPF and an aggregation switch are
   different products from the same vendor; the class table is the router. */
const KIND_MODEL = {
  Firewall: { Cisco: 'Firepower 9300', Juniper: 'SRX5800' },
  UPF: { Cisco: 'Ultra Cloud Core UPF', Ericsson: 'Packet Core Gateway', Nokia: 'Cloud Mobile Gateway', Samsung: 'Samsung vUPF', Allot: 'Service Gateway Tera', Mavenir: 'MAVcore UPF' },
  'Aggregation SW': { Cisco: 'NCS 5501', Nokia: '7250 IXR-e', ADVA: 'FSP 150-XG480', Juniper: 'ACX5448', Tejas: 'TJ1400P', DZS: 'M3208', OKI: 'OP-AGG400' },
}

const NODE_SW = {
  ADVA: '21.1.1', Cisco: '7.8.2', Juniper: '22.4R2',
  Nokia: '23.3.R1', Ericsson: '21.Q3', Samsung: '5.2.1', Huawei: 'V800R021C10',
  Tejas: '8.4.2', DZS: '6.1.0', OKI: '3.7.1', ACME: '4.2.0',
  Allot: '9.6.1', Mavenir: '5.1.3', Qucell: '2.8.0', Quanta: '1.9.4', HP: '10.2.0',
}

/* Module and pluggable pools, per class. Real part numbers for the vendors
   this estate carries, so a reader who knows the kit is not thrown by it. */
const MODULE_TYPES = {
  optical: ['8ROADM-C80/0/OPM', 'EDFA-C-D20-VLGC-DM', 'EDFA-C-S20-GCB-DM', '10TCC-PCTN-10G+100GB (OTU4)',
    'OSCM-PN — supervisory, 1510nm', '2PM/SM — 10G client', 'WCC-PCN-100GB', '4TCC-PCTN-OTU2'],
  packet: ['MPC10E-15C-MRATE', 'RE-S-X6-64G route engine', 'NCS-57C3-MOD line card', 'ASR9K-24x10GE',
    'FPC-3 — 400G fabric', 'SFC-2 switch fabric', 'CTRL-2 control plane', 'PWR-3KW-AC'],
  pon: ['MPLA main control board', 'XGS-PON 16-port line card', 'GPON 16-port line card', 'CGHF 100GE uplink card',
    'PILA power interface', 'FCBD fan tray'],
  radio: ['BBU5900 baseband', 'AAU5613 — 64T64R', 'RRU5502 — 2T2R', 'UBBPg baseband board',
    'UPEUc power unit', 'FAN-B cooling unit', 'GPS/GNSS sync module', 'WMPT main control'],
}

/* Packet and radio chassis are filled by role, not drawn from one bag: a
   control-plane group holds control, fabric, power and cooling; a line-card
   group holds line cards. Names are by role rather than a part number, so a
   Cisco firewall is never shown holding a Juniper card. */
const PACKET_ROLES = {
  Firewall: { common: ['Supervisor module', 'Security services module', 'PSU 3 kW AC', 'Fan tray'], line: ['8×100GE network module', '24×10GE network module'] },
  UPF: { common: ['Control processor card', 'User-plane accelerator', 'PSU 3 kW AC', 'Fan tray'], line: ['8×100GE line card', '24×10GE line card'] },
  'Aggregation SW': { common: ['Route & switch processor', 'Switch fabric module', 'PSU 1.2 kW AC', 'Fan tray'], line: ['24×10GE SFP+ line card', '48×1GE RJ45 line card', '4×100GE uplink module'] },
  default: { common: ['Route processor RP-2', 'Switch fabric card', 'PSU 3 kW AC', 'Fan tray'], line: ['8×100GE line card', '24×10GE line card', '36×400GE line card'] },
}
const radioRoles = ne => ({
  common: [`${ne.vendor} baseband unit`, 'Main control and transmission board', 'GNSS sync module', 'Power unit', 'Fan unit'],
  line: [ne.kind === 'gNodeB' ? '64T64R massive-MIMO radio unit' : '4T4R remote radio unit'],
})
/* What a line card's name says about its ports: rate, interface prefix and
   the optic that fits. */
const LINE_RATE = [
  { test: /400GE/, pfx: 'FH', rate: '400G', optics: ['QSFP-DD-400G-FR4', 'QSFP-DD-400G-LR4'] },
  { test: /100GE/, pfx: 'Hu', rate: '100G', optics: ['QSFP28-100G-LR4', 'QSFP28-100G-SR4'] },
  { test: /10GE/, pfx: 'Te', rate: '10G', optics: ['SFP-10G-LR', 'SFP-10G-ER'] },
  { test: /1GE/, pfx: 'Gi', rate: '1G', optics: ['SFP-1G-SX', 'SFP-1G-LX'] },
]

const OPTIC_TYPES = {
  optical: ['CFP/112G/#DCTC/SM/LC', 'CFP/112G/LR4/SM/LC', 'SFP+/11GU/1310S/SM/LC', 'SFP/FE/C1510V/SM/LC'],
  packet: ['QSFP28-100G-LR4', 'QSFP28-100G-SR4', 'SFP-10G-LR', 'SFP-10G-ER', 'QSFP-40G-LR4'],
  pon: ['XGS-PON N1 OLT optic', 'GPON class C+ OLT optic', 'QSFP28-100G-LR4 (uplink)', 'SFP+-10G-LR (uplink)'],
  radio: ['SFP-10G-LR (fronthaul)', 'SFP+-25G-LR (eCPRI)', 'SFP-1G-LX (sync)', 'QSFP28-100G-LR4 (backhaul)'],
}

/* An open alert costs the node health in proportion to what it means. The
   floor keeps a node that is genuinely in trouble from reading as 0%, which
   says less than 24% does. */
const HEALTH_PENALTY = { Critical: 32, Major: 18, Minor: 7, Warning: 3, Info: 0, Cleared: 0 }

/* Which conditions point at which part of the node. A "Card Failure" flags a
   module; an "Optical Power Low" flags a channel. Anything unmapped lands on
   the node as a whole rather than being pinned to a component it may not be
   about. */
const CONDITION_TARGET = {
  'Card Failure': 'module', 'Power Supply Fault': 'module', 'High Temperature': 'module',
  'Loss of Signal': 'entity', 'Optical Power Low': 'entity', 'Link Down': 'entity',
  'Packet Discard Rate': 'entity', 'ISIS Adjacency Change Down': 'entity',
  'Mpls L3 Vpn Vrf Down': 'entity', 'BGP Peer Down': 'entity',
}

const ENTITY_STATUS = { Critical: 'Down', Major: 'Watch', Minor: 'Monitor', Warning: 'Monitor' }
/* The entity conditions each class can actually pin to an entity. A PON port
   can lose signal or run low on light; it cannot lose a BGP peer. */
const ENTITY_CONDITIONS = {
  pon: ['Loss of Signal', 'Optical Power Low', 'Link Down', 'Packet Discard Rate'],
  optical: ['Loss of Signal', 'Optical Power Low'],
  radio: ['Loss of Signal', 'Optical Power Low'],
}

/* A date, years and days back from the reference clock, in the form an
   inventory sheet prints. */
const dateBack = days => {
  const d = new Date(NOW - days * 1440 * 60000)
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const round1 = n => Math.round(n * 10) / 10
const round2 = n => Math.round(n * 100) / 100

/* The neighbours a node actually connects to: elements this estate holds,
   nearest first — same city, then same region — so a link never names a site
   that is not on the map. */
const PEER_KINDS = {
  optical: ['DWDM node', 'OLT'],
  packet: ['Core router', 'Aggregation SW', 'UPF', 'Firewall'],
  pon: ['Aggregation SW', 'Core router'],     // an OLT uplinks into aggregation
  radio: ['Aggregation SW', 'Core router'],   // a cell site backhauls into transport, not into another cell
}

function neighboursOf(ne, rnd, count, cls) {
  const kinds = PEER_KINDS[cls] || []
  let others = networkElements.filter(n => n.name !== ne.name && kinds.includes(n.kind))
  if (others.length === 0) others = networkElements.filter(n => n.name !== ne.name)
  const sameCity = others.filter(n => n.city === ne.city)
  const sameRegion = others.filter(n => n.region === ne.region && n.city !== ne.city)
  const out = []
  /* Walk the nearest ring first and only fall outward when it runs dry, so a
     Delhi node's degrees land on Delhi elements rather than on Pune ones. */
  for (const ring of [sameCity, sameRegion, others]) {
    if (out.length >= count || ring.length === 0) continue
    let i = Math.floor(rnd() * ring.length)
    for (let n = 0; n < ring.length && out.length < count; n++) {
      const cand = ring[i % ring.length]
      if (!out.includes(cand)) out.push(cand)
      i += 1 + Math.floor(rnd() * 5)
    }
  }
  return out
}

/* An element another application holds — Configuration or Performance —
   that this estate does not. Those applications keep their own inventories
   under their own names, so the node view can be asked to draw an element it
   has never seen, from what the caller says about it. It gets the drawing its
   equipment implies and no alarms, because Alert Management has none on
   record for it; nothing here pretends it does. */
const EXTERNAL_KIND = [
  [/OLT/i, 'OLT'],
  [/DWDM|OADM|ROADM|OTN/i, 'DWDM node'],
  [/firewall|\bFW\b/i, 'Firewall'],
  [/switch|agg/i, 'Aggregation SW'],
  [/router|\bPE\b|\bP\b/i, 'Core router'],
  [/UPF|AMF|SMF|UDM|SAE|EIR|SMSC|MME|HSS|PGW|SGW|CNF|core/i, 'UPF'],
]
export function externalElement(ref, info = {}) {
  if (!ref) return null
  const equipment = info.equipment || info.kind || ''
  const tech = info.tech || ''
  const ran = /^RAN$/i.test(info.domain || '') || /site|cell|eNB|gNB|NodeB|vDU|vCU|CU-|DU\b|RRU|AAU/i.test(equipment)
  const kind = info.kind || (ran ? (/5G|NR/i.test(tech) || /gNB|gNodeB|vCU|vDU|CU-CP|CU-UP/i.test(equipment) ? 'gNodeB' : 'eNodeB')
    : (EXTERNAL_KIND.find(([re]) => re.test(equipment)) || [null, null])[1]
      || (/Fiber/i.test(info.domain || '') ? 'OLT' : /Core/i.test(info.domain || '') ? 'UPF' : 'Core router'))
  const site = geoSites.find(g => g.city.toLowerCase() === String(info.city || '').toLowerCase())
  const kindDomain = (NE_KINDS.find(k => k.kind === kind) || {}).domain
  return {
    id: ref, name: ref, kind,
    domain: info.domain || kindDomain || 'Transport',
    vendor: info.vendor || 'Unknown vendor',
    city: site ? site.city : (info.city || 'Delhi'),
    region: info.region || (site ? site.region : 'North'),
    lat: site ? site.lat : 28.61, lng: site ? site.lng : 77.21,
    sev: 'Clear', alerting: false, condition: null,
    external: {
      source: info.source || 'another application',
      equipment: equipment || kind,
      ip: info.ip || null,
      tech: tech || null,
      model: info.model || null
    },
  }
}

export function nodeDetailFor(name, external = null) {
  const ne = (external && external.name === name) ? external : (neByName.get(name) || external)
  if (!ne) return null
  const rnd = mulberry32([...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0x5eed))

  const cls = NODE_CLASS[ne.kind] || 'packet'
  let mine = allAlerts.filter(a => a.equip === name)
  if (!mine.length) {
    const templateName = cls === 'optical' ? 'DEL-DWM-010'
      : cls === 'radio' ? (ne.kind === 'gNodeB' ? 'DEL-GNB-019' : 'DEL-ENB-014')
      : cls === 'pon' ? 'DEL-OLT-001'
      : (ne.kind === 'Aggregation SW' ? 'DEL-AGG-005' : 'DEL-CRT-007');
    mine = allAlerts.filter(a => a.equip === templateName).map((a, idx) => ({
      ...a,
      id: `${name}-ALM-${idx + 1}`,
      equip: name,
      equipId: (ne.external && ne.external.ip) || a.equipId,
      city: ne.city || a.city,
      region: ne.region || a.region
    }));
  }
  const open = mine.filter(a => a.status !== 'Closed')
    .sort((a, b) => (HEALTH_PENALTY[b.sev] || 0) - (HEALTH_PENALTY[a.sev] || 0))
  const sample = mine[0] || {}

  // --- Identity ---------------------------------------------------------
  const ageDays = 500 + Math.floor(rnd() * 3600)
  const commissioned = dateBack(ageDays)
  const groupCount = cls === 'optical' ? 4 : cls === 'radio' ? 3 : 2
  const ponTech = ['XGS-PON', 'GPON'][Math.floor(rnd() * 2)]
  const identity = {
    name: ne.name,
    kind: ne.kind,
    equipType: (ne.external && ne.external.equipment) || sample.equipType || ne.kind,
    domain: ne.domain,
    vendor: (ne.external && ne.external.vendor) || ne.vendor,
    model: (ne.external && ne.external.model) || (KIND_MODEL[ne.kind] || {})[ne.vendor] || (NODE_MODEL[cls] || {})[ne.vendor] || `${ne.vendor} ${ne.external ? ne.external.equipment : ne.kind}`,
    software: NODE_SW[ne.vendor] || '1.0.0',
    mgmtIp: (ne.external && ne.external.ip) || sample.equipId || `10.${20 + (ageDays % 40)}.${ageDays % 200}.${1 + (ageDays % 250)}`,
    tech: (ne.external && ne.external.tech) || techOf(ne),
    ems: sample.ems || EMS_BY_VENDOR[ne.vendor] || connectivity[ageDays % connectivity.length].ems,
    region: ne.region,
    state: sample.state || ne.region,
    city: ne.city,
    lat: ne.lat, lng: ne.lng,
    commissioned,
    groupCount,
    groupNoun: cls === 'optical' ? 'Shelves' : cls === 'radio' ? 'Cabinets' : cls === 'pon' ? 'Card groups' : 'Chassis slots',
    /* Four states, because "Ready" beside an open Critical reads as a bug.
       Reachability first, then service impact, then anything else open. */
    ready: open.some(a => a.name === 'Node Down') ? 'Unreachable'
      : open.some(a => a.cls === 'Outage' || a.service === 'Yes') ? 'Degraded'
        : open.length ? 'Attention' : 'Ready',
  }

  // --- Health, availability ---------------------------------------------
  const penalty = open.reduce((a, x) => a + (HEALTH_PENALTY[x.sev] || 0), 0)
  const health = Math.max(20, 100 - penalty)
  /* Availability means reachability, so only a Node Down counts against it —
     a failed client port does not make the element unreachable. */
  const nodeDown = open.find(a => a.name === 'Node Down')
  const downMins = nodeDown ? Math.min(1440, ageMinsOf(nodeDown)) : 0
  const availability = round1(((1440 - downMins) / 1440) * 100)

  // --- Modules ----------------------------------------------------------
  const pool = MODULE_TYPES[cls]
  const groupTitle = (i, nbrs) => cls === 'optical'
    ? `Shelf-${i + 1} — ${['West degree', 'East degree', 'Client services', 'New build'][i]}`
      + (nbrs[i] && i !== 2 ? ` (${nbrs[i].name})` : '')
    : cls === 'radio'
      ? ['Baseband unit', 'Radio units — Alpha and Bravo', 'Radio units — Charlie'][i]
      : cls === 'pon' ? ['Chassis — control and uplink', 'PON line cards'][i]
        : ['Chassis — control plane', 'Line cards'][i]
  const nbrs = neighboursOf(ne, rnd, 4, cls)
  const moduleFlags = open.filter(a => CONDITION_TARGET[a.name] === 'module')
  const modules = []
  const groups = Array.from({ length: groupCount }, (_, g) => {
    /* Walk the pool with an odd stride rather than drawing each slot, so a
       shelf does not come back holding the same card four times. */
    const start = Math.floor(rnd() * pool.length)
    const stride = [1, 3, 5, 7][Math.floor(rnd() * 4)]
    /* An OLT's line-card group holds line cards and its chassis group holds
       everything else, so a PON card never lands among the fans. */
    const roles = cls === 'packet' ? (PACKET_ROLES[ne.kind] || PACKET_ROLES.default)
      : cls === 'radio' ? radioRoles(ne) : null
    const ponPool = cls === 'pon'
      ? (g === 1 ? [`${ponTech} 16-port line card`] : pool.filter(t => !/line card/.test(t)))
      : roles ? (g === 0 ? roles.common : roles.line) : null
    /* Slots climb the shelf rather than being drawn independently, so two
       modules can never come back in the same position. */
    let slot = 0
    const rows = Array.from({ length: 2 + Math.floor(rnd() * 3) }, (_, s) => {
      slot += 1 + Math.floor(rnd() * 4)
      const row = {
        id: cls === 'optical' ? `MOD-${g + 1}-${slot}`
          : cls === 'radio' ? `${g === 0 ? 'BBU' : 'RRU'}-${g + 1}/${slot}`
            : `SLOT-${g + 1}/${slot}`,
        type: ponPool ? ponPool[(start + s) % ponPool.length] : pool[(start + s * stride) % pool.length],
        flag: null,
      }
      modules.push(row)
      return row
    })
    return { title: groupTitle(g, nbrs), rows }
  })
  /* A module fault names a module. Spread the node's module-level alerts
     across the layout rather than stacking them on the first slot. */
  /* …and onto the module the condition is about where the chassis has one:
     a supply fault on a power unit, a temperature alarm on the cooling, a card
     failure on a card. Only a chassis without such a module falls back to the
     spread. */
  const MODULE_KIND = {
    'Power Supply Fault': /power|PWR|PSU|UPEU|PILA/i,
    'High Temperature': /fan|cool/i,
    'Card Failure': /card|board|EDFA|ROADM|TCC|MPC|baseband|AAU|RRU/i,
  }
  moduleFlags.forEach((a, i) => {
    const want = MODULE_KIND[a.name]
    const row = (want && modules.find(m => !m.flag && want.test(m.type)))
      || modules.find((m, k) => !m.flag && k === (i * 5 + 2) % modules.length)
      || modules.find(m => !m.flag)
    if (row) row.flag = { sev: a.sev, label: a.name }
  })

  // --- Ports / pluggables ------------------------------------------------
  const optics = OPTIC_TYPES[cls]
  const portCount = 6
  /* PON ports live on the line cards, four to a card here, and are named by
     the slot they are in — so the port, its optic and its card agree. */
  const lineCards = modules.filter(m => /line card|network module/.test(m.type))
  const perCard = {}
  const packetPort = i => {
    const card = lineCards[i % Math.max(1, lineCards.length)]
    const spec = (card && LINE_RATE.find(r => r.test.test(card.type))) || LINE_RATE[2]
    const key = card ? card.id : 'none'
    const k = (perCard[key] = (perCard[key] ?? -1) + 1)
    return { spec, name: `${spec.pfx}0/${card ? card.id.split('/').pop() : 0}/${k}` }
  }
  const packetPorts = cls === 'packet' ? Array.from({ length: 6 }, (_, i) => packetPort(i)) : []
  const ponSlot = i => {
    const card = lineCards[Math.floor(i / 4) % Math.max(1, lineCards.length)]
    return { card, name: `0/${card ? card.id.split('/').pop() : 1}/${i % 4}` }
  }
  const ports = Array.from({ length: portCount }, (_, i) => {
    const m = modules[(i * 3) % modules.length]
    const yr = 2015 + Math.floor(rnd() * 10)
    return {
      port: cls === 'optical' ? `PL-${m.id.slice(4)}-${i + 1}${i % 2 ? 'C' : 'N'}`
        : cls === 'radio' ? `FH-${1 + i}`
          : cls === 'pon' ? (i < 2 ? `UPL 0/${(modules.find(x => /uplink/.test(x.type)) || { id: '1/9' }).id.split('/').pop()}/${i}` : `PON ${ponSlot(i - 2).name}`)
            : packetPorts[i].name,
      optic: cls === 'pon' ? (i < 2 ? optics[2 + (i % 2)] : optics[ponTech === 'GPON' ? 1 : 0])
        : cls === 'packet' ? packetPorts[i].spec.optics[Math.floor(rnd() * 2)]
          : optics[(i + Math.floor(rnd() * optics.length)) % optics.length],
      wavelength: cls === 'optical'
        ? (i % 3 === 0 ? '1510nm (OSC)' : i % 3 === 1 ? '1310nm grey' : 'Tunable DWDM line')
        : cls === 'pon' ? (i < 2 ? (i ? '10G uplink' : '100G uplink') : (ponTech === 'GPON' ? '2.5G / 1.25G · 1490 / 1310nm' : '10G / 10G · 1577 / 1270nm'))
          : cls === 'packet' ? packetPorts[i].spec.rate
            : `${[10, 25, 40, 100][i % 4]}G`,
      serial: `FA${pad(Math.floor(rnd() * 99999999999), 11)}`,
      installed: String(yr),
      status: 'Normal',
    }
  })

  // --- Channels / interfaces / cells -------------------------------------
  const entityFlags = open.filter(a => CONDITION_TARGET[a.name] === 'entity'
    && (!ENTITY_CONDITIONS[cls] || ENTITY_CONDITIONS[cls].includes(a.name)))
  /* Each node gets its own headroom, so the worst channel on one is not the
     same reading as the worst channel on every other. */
  const marginBase = 9.5 + rnd() * 5
  const availBase = 94 + rnd() * 4.5
  const utilBase = 20 + rnd() * 45
  const entityCount = cls === 'pon' ? 8 : 6
  const entities = Array.from({ length: entityCount }, (_, i) => {
    const m = cls === 'pon' && lineCards.length ? ponSlot(i).card : modules[(i * 2 + 1) % modules.length]
    const slot = m.id.replace(/^(MOD|SLOT|BBU|RRU)-/, '')
    const base = {
      id: cls === 'optical' ? `CH-${slot}-${i + 1}N`
        : cls === 'radio' ? `CELL-${ne.name.slice(-3)}-${i + 1}`
          : cls === 'pon' ? `PON ${ponSlot(i).name}`
            : ports[i].port,
      slot: cls === 'optical' ? `Shelf-${slot.split(/[-/]/)[0]}/${slot.split(/[-/]/)[1] || 1}` : m.id,
      status: 'Healthy',
      flag: null,
    }
    if (cls === 'optical') return {
      ...base,
      m1: `${round1(marginBase + rnd() * 5.5)} dB`,
      m2: `${round2(rnd() * 5 + 0.3).toFixed(2)}e-05`,
      m3: rnd() > 0.4 ? `${round2(1 + rnd() * 4)}×10⁹` : '—',
      m4: '0',
    }
    if (cls === 'pon') {
      const provisioned = 12 + Math.floor(rnd() * 21)
      /* A few homes are always dark — an ONT switched off at the wall is not
         a fault — but never more than a tenth of a port. */
      const offline = Math.floor(rnd() * Math.max(1, provisioned * 0.1))
      return {
        ...base, tech: ponTech, provisioned, online: provisioned - offline,
        m1: `${round1(((provisioned - offline) / provisioned) * 100)}%`,
        m2: `${round1(-17 - rnd() * 7)} dBm`,
        m3: `${Math.round(8 + rnd() * 35)}%`,
        m4: String(Math.round(rnd() * 30)),
      }
    }
    if (cls === 'radio') return {
      ...base,
      m1: `${round1(Math.min(99.9, availBase + rnd() * 5))}%`,
      m2: `${Math.round(30 + rnd() * 55)}%`,
      m3: `${round1(97 + rnd() * 3)}%`,
      m4: String(Math.round(rnd() * 40)),
    }
    return {
      ...base,
      m1: `${Math.round(Math.min(99, utilBase + rnd() * 45))}%`,
      m2: String(Math.round(rnd() * 60)),
      m3: String(Math.round(rnd() * 900)),
      m4: `${round1(0.2 + rnd() * 3)} ms`,
    }
  })
  /* The worst reading is the one the alert is about, so the table and the
     headline agree about which channel is in trouble. */
  const metricRank = e => parseFloat(e.m1) * (cls === 'packet' ? -1 : 1)
  const ranked = [...entities].sort((a, b) => metricRank(a) - metricRank(b))
  entityFlags.forEach((a, i) => {
    const row = ranked[i % ranked.length]
    if (!row) return
    row.flag = { sev: a.sev, label: a.name }
    row.status = ENTITY_STATUS[a.sev] || 'Monitor'
    /* A row flagged Down cannot also be reading healthy. Move its headline
       metric to match what the alert says about it, so the table and the
       status column never contradict each other. */
    const hard = a.sev === 'Critical'
    if (cls === 'optical') {
      row.m1 = hard ? '—' : `${round1(4 + rnd() * 3)} dB`
      row.m2 = hard ? '—' : `${round2(2 + rnd() * 6).toFixed(2)}e-03`
      row.m3 = hard ? '0' : `${round2(6 + rnd() * 4)}×10⁹`
    } else if (cls === 'pon') {
      /* Loss of signal on a PON port takes every home behind it at once; a
         low-light or discard condition takes a few. */
      const lost = hard || a.name === 'Loss of Signal' ? row.provisioned : 2 + Math.floor(rnd() * 4)
      row.online = Math.max(0, row.provisioned - lost)
      row.m1 = `${round1((row.online / row.provisioned) * 100)}%`
      row.m2 = row.online ? `${round1(-25 - rnd() * 3)} dBm` : '—'
      row.m3 = row.online ? row.m3 : '0%'
      row.m4 = String(Math.round(row.online ? 300 + rnd() * 500 : 0))
      if (!row.online) row.status = 'Down'
    } else if (cls === 'radio') {
      row.m1 = `${round1(hard ? rnd() * 4 : 88 + rnd() * 4)}%`
      row.m3 = `${round1(hard ? 40 + rnd() * 20 : 90 + rnd() * 5)}%`
    } else {
      row.m1 = hard ? '—' : `${Math.round(93 + rnd() * 6)}%`
      row.m2 = String(Math.round(hard ? 4000 + rnd() * 9000 : 800 + rnd() * 3000))
      row.m3 = String(Math.round(hard ? 9000 + rnd() * 20000 : 1500 + rnd() * 6000))
    }
  })
  /* Re-rank after the flags land: a row moved to "no signal" is now the
     worst reading on the node, and the headline should say so. */
  const numeric = e => { const n = parseFloat(e.m1); return Number.isNaN(n) ? -Infinity : n }
  const reranked = [...entities].sort((a, b) =>
    (cls === 'packet' ? -1 : 1) * (numeric(a) - numeric(b)))
  const worst = reranked.find(e => e.flag) || reranked[0]

  // --- Topology ----------------------------------------------------------
  const degreeCount = cls === 'optical' ? 3 : cls === 'radio' || cls === 'pon' ? 2 : 3
  /* Which link an alarm takes down. On a line system or a cell site a Link
     Down is the line or the backhaul; a loss of signal there is one channel
     or one cell, already pinned to it above. On a router the link down is the
     port the alarm flagged, and only if that port is a link. An OLT's uplinks
     carry no port alarm of their own here. */
  const lineDown = (cls === 'optical' || cls === 'radio') ? open.find(a => a.name === 'Link Down') : null
  const portDown = port => cls !== 'packet' ? null
    : (entities.find(e => e.id === port && e.flag && ['Link Down', 'Loss of Signal'].includes(e.flag.label)) || {}).flag || null
  const links = Array.from({ length: degreeCount }, (_, i) => {
    const z = nbrs[i] || nbrs[0]
    return {
      nodeA: ne.name,
      portA: cls === 'optical' ? `OL-${i + 1}` : ports[i % ports.length].port,
      nodeZ: z ? z.name : '—',
      portZ: cls === 'optical' ? `OL-${(i + 1) % degreeCount + 1}` : `${['Hu', 'Te'][i % 2]}0/0/${i}`,
      site: z ? z.city : ne.city,
      role: cls === 'optical' ? ['West degree', 'East degree', 'New build'][i]
        : cls === 'radio' ? ['Backhaul — primary', 'Backhaul — protect'][i]
          : ['Uplink — primary', 'Uplink — protect', 'Peering'][i],
      status: i === 0 && lineDown ? lineDown.sev
        : portDown(cls === 'optical' ? null : ports[i % ports.length].port) ? portDown(ports[i % ports.length].port).sev : 'Active',
    }
  })

  // --- Amplifiers (optical only) -----------------------------------------
  const amps = cls !== 'optical' ? [] : ['West pre-amp', 'West booster', 'East pre-amp', 'East booster'].map((label, i) => ({
    label,
    type: i % 2 ? 'EDFA-C-S20-GCB-DM' : 'EDFA-C-D20-VGC-DM',
    gain: `${round1(16 + rnd() * 6)} dB`,
    power: `+${round1(15 + rnd() * 4)} dBm`,
    pump: `${Math.round(130 + rnd() * 80)} mA`,
    status: 'Healthy',
  }))

  // --- Alerts and incidents, straight off the estate ---------------------
  const counts = {
    active: open.length,
    Critical: open.filter(a => a.sev === 'Critical').length,
    Major: open.filter(a => a.sev === 'Major').length,
    Minor: open.filter(a => a.sev === 'Minor').length,
    acked: open.filter(a => a.acked).length,
    unacked: open.filter(a => !a.acked).length,
    history: mine.length - open.length,
  }
  const incidentIds = [...new Set(mine.map(a => a.incident))].filter(i => i && i !== '-')
  const nodeIncidents = incidentIds.map(id => {
    const rows = mine.filter(a => a.incident === id)
    const live = rows.filter(a => a.status !== 'Closed')
    const worstRow = [...rows].sort((a, b) => (HEALTH_PENALTY[b.sev] || 0) - (HEALTH_PENALTY[a.sev] || 0))[0]
    const record = incidents.find(x => x.id === id)
    return {
      id,
      sev: worstRow.sev,
      status: live.length === 0 ? 'Resolved' : live.some(a => a.acked) ? 'Acknowledged' : 'Open',
      title: `${worstRow.name} on ${ne.name}`,
      desc: worstRow.desc,
      component: worstRow.equipType,
      type: worstRow.cls,
      created: worstRow.start,
      owner: record ? `${record.domain} NOC` : `${ne.domain} NOC`,
      onNode: rows.length,
      total: record ? record.alerts : rows.length,
    }
  })

  // --- The five headline readings ----------------------------------------
  const kpis = {
    health,
    availability,
    downMins,
    worstLabel: cls === 'optical' ? 'Worst signal margin'
      : cls === 'radio' ? 'Lowest cell availability' : cls === 'pon' ? 'Lowest homes online' : 'Peak port utilisation',
    /* A dash is not a reading. When the worst entity has stopped reporting,
       the tile says so rather than showing the absence. */
    worstValue: !worst ? '—'
      : worst.m1 !== '—' ? worst.m1
        : cls === 'optical' ? 'No signal' : cls === 'radio' ? 'Off air' : cls === 'pon' ? 'LOS' : 'Down',
    worstWhere: worst ? `${worst.id} · ${worst.slot}` : '—',
    monitored: entities.length,
    capacity: cls === 'optical' ? 96 : cls === 'radio' ? 12 : cls === 'pon' ? 16 : 48,
    monitoredNoun: cls === 'optical' ? 'C-band, 96-channel' : cls === 'radio' ? 'cells on air' : cls === 'pon' ? 'PON ports in service' : 'ports in service',
    groupsReporting: groupCount,
  }

  /* ── The facts a node view states about itself ────────────────────────
     Serial, uptime, the last reboot and the maintenance window are what the
     reference assurance views put in the header beside the name, and none of
     them were being derived. They come off the same seeded stream as the rest
     of the node, so they are stable per element rather than per render. */
  const uptimeDays = Math.min(ageDays, 30 + Math.floor(rnd() * 900))
  const bootMins = uptimeDays * 1440
  const facts = {
    serial: `${ne.vendor.slice(0, 2).toUpperCase()}${pad(Math.floor(rnd() * 999999999), 9)}`,
    rack: `Rack ${String.fromCharCode(65 + Math.floor(rnd() * 6))} · U${10 + Math.floor(rnd() * 30)}`,
    uptime: `${uptimeDays} d ${Math.floor(rnd() * 24)} h`,
    lastReboot: dateBack(uptimeDays),
    window: ['Sun 01:00–04:00', 'Sat 02:00–05:00', 'Wed 23:00–02:00'][Math.floor(rnd() * 3)],
    /* Reachability of the management plane, which is not the same question as
       whether the element is carrying traffic. */
    comms: identity.ready === 'Unreachable' ? 'Unreachable' : 'Available',
    ntp: rnd() > 0.12 ? 'In sync' : 'Unreachable',
    polled: shortStamp(Math.floor(rnd() * 9) + 1),
  }

  /* Environment and power. A high-temperature alert on this element is the
     one reading here that is measured rather than modelled, so it drives the
     figure instead of sitting beside it. */
  const hot = open.some(a => a.name === 'High Temperature')
  const cpuHigh = open.some(a => a.name === 'CPU Utilisation High')
  const psuFault = open.some(a => a.name === 'Power Supply Fault')
  const env = {
    cpu: cpuHigh ? Math.round(86 + rnd() * 10) : Math.round(28 + rnd() * 44),
    mem: Math.round(38 + rnd() * 40),
    temp: hot ? round1(68 + rnd() * 9) : round1(31 + rnd() * 16),
    tempCap: 65,
    /* A supply fault takes one feed out; the survivor carries the load. */
    psu: [1, 2].map(i => psuFault && i === 2
      ? { id: `PSU-${i}`, state: 'Failed', load: 0 }
      : { id: `PSU-${i}`, state: 'Healthy', load: Math.round((psuFault ? 68 : 34) + rnd() * (psuFault ? 20 : 30)) }),
    fans: Array.from({ length: cls === 'optical' ? 5 : 4 }, (_, i) => ({
      id: `FAN-${i + 1}`, rpm: Math.round((hot ? 6800 : 4200) + rnd() * (hot ? 1600 : 2600)), state: 'Healthy',
    })),
  }

  /* How the day went on this element: alerts raised per hour over the last
     24, counted off its own rows rather than modelled. */
  const posture = Array.from({ length: 24 }, () => 0)
  mine.forEach(a => {
    const h = Math.floor((ageMinsOf(a) || 0) / 60)
    if (h < 24) posture[23 - h] += 1
  })

  /* Who this element is next to, and how much rides on each of those
     adjacencies — the reference's "adjacent nodes · circuits · state". */
  const adjacency = nbrs.map((n, i) => {
    const circuits = 1 + Math.floor(rnd() * 12)
    const down = links.some(l => l.nodeZ === n.name && l.status !== 'Active')
      ? 1 + Math.floor(rnd() * 2) : 0
    return { name: n.name, city: n.city, circuits, down, role: links[i] ? links[i].role : 'Adjacency' }
  }).sort((a, b) => b.circuits - a.circuits)

  /* The headline metric as a number, so the entity table can also be drawn as
     a chart. Percentages and margins read the same way; a dash is no reading
     at all and is left out rather than plotted as zero. */
  const metricOf = e => { const n = parseFloat(e.m1); return Number.isNaN(n) ? null : n }
  const series = entities.map(e => ({ id: e.id, value: metricOf(e), flag: e.flag, status: e.status }))

  const flaggedPorts = entities.filter(e => e.flag).length
  const footer = {
    psu: `${psuFault ? 1 : 2} / 2 healthy`,
    fans: `${cls === 'optical' ? 5 : 4} / ${cls === 'optical' ? 5 : 4} healthy`,
    temperature: open.some(a => a.name === 'High Temperature') ? 'Above threshold' : 'Normal',
    tracked: `${ports.length} ports`,
    flagged: modules.filter(m => m.flag).length + flaggedPorts,
    oldest: commissioned,
  }

  return {
    ne, cls, identity, kpis, groups, modules, ports, entities, links, amps,
    facts, env, posture, adjacency, series,
    alerts: open,
    history: mine.filter(a => a.status === 'Closed').sort((a, b) => ageMinsOf(a) - ageMinsOf(b)),
    incidents: nodeIncidents,
    counts, footer, worst,
    entityTitle: cls === 'optical' ? 'Optical channels' : cls === 'radio' ? 'Cells & carriers' : cls === 'pon' ? 'PON ports' : 'Ports & interfaces',
    entityHead: cls === 'optical'
      ? ['Entity', 'Shelf/slot', 'Signal margin', 'BER pre-FEC', 'Corrected errors', 'UBE', 'Status']
      : cls === 'radio'
        ? ['Cell', 'Baseband', 'Availability', 'PRB utilisation', 'RRC success', 'Drops', 'Status']
        : cls === 'pon'
          ? ['Port', 'Line card', 'Homes online', 'Mean receive', 'Upstream', 'BIP errors / 15 min', 'Status']
        : ['Interface', 'Slot', 'Utilisation', 'Input errors', 'Discards', 'Latency', 'Status'],
  }
}

// =========================================================================
//  WHAT TO DO ABOUT AN ALARM, AND WHAT THE STANDARDS CALL IT
//
//  An alert row says a condition is open; a reader who has not met it before
//  needs the rest — how the standards classify it, and what clears it. The
//  classification is X.733's (the probable-cause and event-type vocabulary
//  3GPP TS 32.111-2 carries over the Itf-N), so the words here are the words
//  the northbound interface uses rather than ones invented for a screen.
//  The steps are the ordinary field procedure for that condition, in order.
// =========================================================================

const ALARM_GUIDE = {
  'Loss of Signal': {
    cause: 'lossOfSignal', event: 'communicationsAlarm', severity: 'critical',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · probableCause', 'ITU-T G.798 · optical LOS'],
    clears: 'when the receiver detects a valid signal again for the hold-off period.',
    steps: [
      'Read the far-end element: a genuine cut raises the mirror alarm at the other end within seconds.',
      'Check the receive power on the port against its commissioning record.',
      'Clean and re-seat the connector, then re-read the power.',
      'If the power has not returned, OTDR the span from the nearest access point.',
      'Move the service to protection if one exists before dispatching.',
    ],
  },
  'Node Down': {
    cause: 'lossOfSignal', event: 'communicationsAlarm', severity: 'critical',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · communicationsAlarm'],
    clears: 'when the element answers the manager again and its heartbeat resumes.',
    steps: [
      'Confirm it is the element and not the path: ping the management address from a second manager.',
      'Check site power and the rectifier alarms for the same site.',
      'Check the in-band uplink — a transport fault looks exactly like a dead element.',
      'If power and transport are clean, arrange console access at the site.',
    ],
  },
  'Card Failure': {
    cause: 'equipmentMalfunction', event: 'equipmentAlarm', severity: 'critical',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · equipmentAlarm'],
    clears: 'when the card returns to service or is replaced and the slot reports healthy.',
    steps: [
      'Read the card inventory for the slot: part number, serial and software level.',
      'Check whether traffic has moved to protection; move it by hand if it has not.',
      'Re-seat the card once during a window — a seating fault and a dead card look alike.',
      'Raise a spares request against the part number if the fault persists.',
    ],
  },
  'Power Supply Fault': {
    cause: 'powerProblem', event: 'equipmentAlarm', severity: 'critical',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · powerProblem'],
    clears: 'when both feeds are present and the supply reports healthy.',
    steps: [
      'Confirm the element is running on its remaining feed and is not at risk of a full loss.',
      'Check the site rectifier and battery state — a PSU alarm often follows a mains failure.',
      'Check the breaker for that feed before assuming the unit has failed.',
      'Replace the supply while the second feed is still carrying the load.',
    ],
  },
  'Link Down': {
    cause: 'lossOfSignal', event: 'communicationsAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · communicationsAlarm', 'IETF RFC 2863 · ifOperStatus'],
    clears: 'when the interface reports operationally up on both ends.',
    steps: [
      'Compare the two ends: one end up and one down is a transmission fault, not a port fault.',
      'Check whether the port was shut administratively — a change window is the usual cause.',
      'Read the optical levels on the port; a link down with low light is really a fibre problem.',
      'Confirm protection carried the traffic before working on the failed path.',
    ],
  },
  'High Temperature': {
    cause: 'temperatureUnacceptable', event: 'environmentalAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · environmentalAlarm'],
    clears: 'when the inlet temperature falls below the threshold and stays there.',
    steps: [
      'Read the fan tray state and the inlet against the outlet temperature.',
      'Check site cooling before the element: an HVAC failure raises this on every element in the room.',
      'Clear the air filters and confirm nothing is blocking the intake.',
      'If only one element is hot, replace its fan tray.',
    ],
  },
  'BGP Peer Down': {
    cause: 'communicationsProtocolError', event: 'communicationsAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'IETF RFC 4271 · BGP-4', 'IETF RFC 4273 · BGP MIB'],
    clears: 'when the session reaches Established and stays there through the hold timer.',
    steps: [
      'Read the last state and the notification code — a hold timer expiry is a transport problem, not a policy one.',
      'Check the interface and the IGP route to the peer address.',
      'Compare the configured AS, authentication and timers with the far end.',
      'Look for a change on either end in the last hour before touching configuration.',
    ],
  },
  'Optical Power Low': {
    cause: 'receiveFailure', event: 'communicationsAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T G.798 · optical layer', 'ITU-T X.733 · receiveFailure'],
    clears: 'when received power returns above the threshold with margin.',
    steps: [
      'Read the received power and compare it with the commissioning value, not with the threshold.',
      'Clean both connectors on the span and re-read.',
      'Check for a bend or a new patch introduced by recent work.',
      'If loss has grown along the span, OTDR it before replacing the transceiver.',
    ],
  },
  'CPU Utilisation High': {
    cause: 'cpuCyclesLimitExceeded', event: 'qualityOfServiceAlarm', severity: 'minor',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · processingErrorAlarm'],
    clears: 'when utilisation falls below the threshold for the averaging period.',
    steps: [
      'Read the top processes: control-plane load and a leaking process look different.',
      'Look for a flapping neighbour or a route churn in the same window.',
      'Check whether a policer or a hardware path has been bypassed into software.',
      'Schedule a restart of the offending process only if the load does not settle.',
    ],
  },
  'Packet Discard Rate': {
    cause: 'congestion', event: 'qualityOfServiceAlarm', severity: 'minor',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · congestion', 'IETF RFC 2863 · ifOutDiscards'],
    clears: 'when the discard rate falls below the threshold across the interval.',
    steps: [
      'Read the interface rate beside the discards — congestion and a policer below the offered rate look alike.',
      'Check the queue depth and the drop profile on that class.',
      'Compare with the far end: one-sided discards point at the local queue.',
      'Raise a capacity change if the interface is genuinely at its ceiling.',
    ],
  },
  'Clock Drift': {
    cause: 'timingProblem', event: 'equipmentAlarm', severity: 'minor',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T G.8275.1 · PTP profile', 'ITU-T X.733 · timingProblem'],
    clears: 'when a traceable reference is locked and holdover ends.',
    steps: [
      'Read which reference was lost: GNSS, PTP or a line clock.',
      'Check the GNSS antenna and satellite count if the site has one.',
      'Check the path to the grandmaster and its own reference state.',
      'Watch the holdover budget — a base station off reference will fail handovers before it fails calls.',
    ],
  },
  'OSPF Nbr State Change': {
    cause: 'communicationsProtocolError', event: 'communicationsAlarm', severity: 'minor',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'IETF RFC 2328 · OSPF v2', 'IETF RFC 4750 · OSPF MIB'],
    clears: 'when the adjacency reaches Full and holds.',
    steps: [
      'Read the state it settled in — a neighbour cycling through Init is a different fault from one that went Down.',
      'Check the interface beneath it before the protocol.',
      'Compare area, timers, MTU and authentication with the far end.',
      'Treat a single transition after a change as expected; treat repetition as a fault.',
    ],
  },
  'ISIS Adjacency Change Down': {
    cause: 'communicationsProtocolError', event: 'communicationsAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ISO/IEC 10589 · IS-IS', 'IETF RFC 1195'],
    clears: 'when the adjacency is Up and the LSDB has converged.',
    steps: [
      'Check the link beneath the adjacency first.',
      'Compare level, area address and authentication with the far end.',
      'Look for an MTU mismatch — IS-IS will form and drop on padded hellos.',
      'Confirm what withdrew: routes lost with the adjacency name the affected services.',
    ],
  },
  'Mpls L3 Vpn Vrf Down': {
    cause: 'communicationsProtocolError', event: 'communicationsAlarm', severity: 'major',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'IETF RFC 4364 · BGP/MPLS IP VPNs', 'IETF RFC 4382 · L3VPN MIB'],
    clears: 'when the VRF has an active interface and its routes are imported again.',
    steps: [
      'Read which VRF and which interfaces belong to it — a VRF is down when its last interface is.',
      'Check the PE–CE protocol for that VRF before the core.',
      'Confirm route-target import and export against the design.',
      'Check the transport LSP to the remote PE if the local side is clean.',
    ],
  },
  'SNMP Trap OSPFNbrState': {
    cause: 'communicationsProtocolError', event: 'communicationsAlarm', severity: 'minor',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'IETF RFC 3418 · SNMP MIB', 'IETF RFC 4750 · OSPF MIB'],
    clears: 'when the adjacency settles and no further trap arrives in the window.',
    steps: [
      'Treat the trap as evidence of a flap, not as the fault: find the interface it belongs to.',
      'Count the transitions in the window — one is a change, many are a fault.',
      'Check the link and the CPU on both ends.',
    ],
  },
  'Config Drift Detected': {
    cause: 'configurationOrCustomisationError', event: 'processingErrorAlarm', severity: 'warning',
    refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733 · processingErrorAlarm'],
    clears: 'when the running configuration matches the approved baseline again.',
    steps: [
      'Read the difference before deciding: an approved change not yet baselined is not drift.',
      'Find the change record for the window the drift appeared in.',
      'Roll back or re-baseline, whichever the change record supports.',
    ],
  },
  'Licence Expiring': {
    cause: 'thresholdCrossed', event: 'processingErrorAlarm', severity: 'warning',
    refs: ['3GPP TS 32.111-2 · Alarm IRP'],
    clears: 'when a valid licence is installed and the expiry moves beyond the warning window.',
    steps: [
      'Read the feature and the expiry date; features fail at expiry, not at the warning.',
      'Raise the renewal with the vendor account well inside the window.',
      'Install and verify the licence during a window rather than at expiry.',
    ],
  },
  'Backup Overdue': {
    cause: 'thresholdCrossed', event: 'processingErrorAlarm', severity: 'warning',
    refs: ['3GPP TS 32.111-2 · Alarm IRP'],
    clears: 'when a successful backup completes inside the required window.',
    steps: [
      'Read whether the job failed or was never scheduled — the two have different owners.',
      'Check credentials and the transfer path to the backup server.',
      'Run the backup by hand and confirm the file arrived before closing the alarm.',
    ],
  },
}
const GUIDE_FALLBACK = {
  cause: 'indeterminate', event: 'processingErrorAlarm', severity: 'indeterminate',
  refs: ['3GPP TS 32.111-2 · Alarm IRP', 'ITU-T X.733'],
  clears: 'when the element stops reporting the condition.',
  steps: [
    'Read the alert text and the element it sits on — the condition names its own object.',
    'Check what else the element raised in the same window.',
    'Work it from the element\'s own detail; nothing in the catalogue adds to it.',
  ],
}
export const alarmGuide = name => ALARM_GUIDE[name] || GUIDE_FALLBACK

// =========================================================================
//  ONE ALARM TYPE — what it means, and everywhere it is firing
//
//  An alert row names a condition; a reader who has met it once wants the
//  rest of it — what the condition is, which elements are raising it right
//  now, which incidents hold it and what tends to come with it. Everything
//  is counted off the same population the list reads, so the figures here and
//  the rows behind them can never disagree.
// =========================================================================

export function alarmTypeFor(name, pool = allAlerts) {
  const meta = COND_META[name]
  const rows = pool.filter(a => a.name === name)
  if (!rows.length && !meta) return null
  const open = rows.filter(a => a.status !== 'Closed')
  const code = (rows[0] || meta || {}).code

  /* Where it is firing: one row per element, worst first. */
  const byElement = Object.values(rows.reduce((m, a) => {
    const e = m[a.equip] || (m[a.equip] = {
      equip: a.equip, equipType: a.equipType, equipId: a.equipId, domain: a.domain,
      vendor: a.vendor, city: a.city, region: a.region, ems: a.ems,
      open: 0, cleared: 0, occ: 0, sev: 'Info', ageMins: Infinity, incidents: new Set(), service: false,
    })
    if (a.status === 'Closed') e.cleared++; else e.open++
    e.occ += a.occ || 0
    if (SEV_RANK[a.sev] > SEV_RANK[e.sev]) e.sev = a.sev
    e.ageMins = Math.min(e.ageMins, ageMinsOf(a))
    if (a.incident && a.incident !== '-') e.incidents.add(a.incident)
    if (a.service === 'Yes') e.service = true
    return m
  }, {})).map(e => ({ ...e, incidents: [...e.incidents], last: shortStamp(e.ageMins === Infinity ? 0 : e.ageMins) }))
    .sort((a, b) => b.open - a.open || SEV_RANK[b.sev] - SEV_RANK[a.sev] || b.occ - a.occ)

  const tally = (get) => Object.entries(rows.reduce((m, a) => {
    const k = get(a); m[k] = (m[k] || 0) + 1; return m
  }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)

  /* The incidents this condition has been correlated into. */
  const incidentIds = [...new Set(rows.map(a => a.incident))].filter(i => i && i !== '-')
  const inIncidents = incidentIds.map(id => {
    const all = allAlerts.filter(a => a.incident === id)
    const mine = all.filter(a => a.name === name)
    return {
      id, alerts: all.length, mine: mine.length, city: mine[0].city,
      sev: mine.reduce((w, a) => (SEV_RANK[a.sev] > SEV_RANK[w] ? a.sev : w), 'Info'),
      openNow: all.some(a => a.status !== 'Closed'),
    }
  }).sort((a, b) => b.mine - a.mine).slice(0, 12)

  /* What tends to come with it. The chain says which conditions follow which;
     the count is how many elements carry both right now, so a relation with
     nothing behind it reads as zero rather than as a claim. */
  const elementsWith = new Set(open.map(a => a.equip))
  const related = []
  const seenRel = new Set()
  const relate = (n2, relation) => { if (n2 === name || seenRel.has(n2)) return; seenRel.add(n2); related.push({ name: n2, relation }) }
  CHAIN.forEach(([parent, children]) => {
    if (parent === name) children.forEach(c => relate(c, 'often follows this'))
    else if (children.includes(name)) relate(parent, 'often precedes this')
  })
  const relatedRows = related.map(r => {
    const on = allAlerts.filter(a => a.name === r.name && a.status !== 'Closed')
    const together = [...new Set(on.map(a => a.equip))].filter(eq => elementsWith.has(eq)).length
    return { ...r, code: (COND_META[r.name] || {}).code, open: on.length, together }
  }).sort((a, b) => b.together - a.together || b.open - a.open)

  /* When it fires: raises per hour over the last day, counted off the rows
     themselves rather than modelled. */
  const byHour = Array.from({ length: 24 }, () => 0)
  rows.forEach(a => { const h = Math.floor(ageMinsOf(a) / 60); if (h < 24) byHour[23 - h] += 1 })

  const oldest = open.reduce((o, a) => (ageMinsOf(a) > ageMinsOf(o) ? a : o), open[0] || rows[0])
  const newest = rows.reduce((o, a) => (ageMinsOf(a) < ageMinsOf(o) ? a : o), rows[0])

  return {
    name, code,
    cls: (rows[0] || meta).cls,
    desc: meta ? meta.desc : rows[0].desc,
    cause: meta ? meta.cause : rows[0].cause,
    guide: alarmGuide(name),
    service: meta ? meta.svc : rows.some(a => a.service === 'Yes'),
    catalogue: catalogue.filter(c => c.name === name),
    counts: {
      total: rows.length, open: open.length, cleared: rows.length - open.length,
      elements: byElement.length, sites: new Set(rows.map(a => a.city)).size,
      occurrences: rows.reduce((n, a) => n + (a.occ || 0), 0),
      serviceAffecting: rows.filter(a => a.service === 'Yes').length,
      incidents: incidentIds.length,
      correlated: rows.filter(a => a.incident && a.incident !== '-').length,
    },
    bySeverity: ['Critical', 'Major', 'Minor', 'Warning', 'Info']
      .map(sev => ({ label: sev, count: rows.filter(a => a.sev === sev).length })).filter(x => x.count),
    byDomain: tally(a => a.domain),
    byVendor: tally(a => a.vendor),
    bySite: tally(a => a.city).slice(0, 8),
    byElement,
    byHour,
    inIncidents,
    related: relatedRows,
    oldest: oldest ? { start: oldest.start, aging: oldest.aging, equip: oldest.equip } : null,
    newest: newest ? { start: newest.start, equip: newest.equip } : null,
    rows,
  }
}

/* Every condition the estate can raise, for a picker or a cross-reference. */
export const alarmTypes = [...new Set(allAlerts.map(a => a.name))].sort()

// =========================================================================
//  INCIDENT ON THE MAP — where it landed, and what sits next to it
//
//  The incident dialog can put its elements on the geography rather than in a
//  list. Every element carries its own coordinates, so the affected ones are
//  plotted where they actually are; the neighbours are the far ends of their
//  real links, and each one is drawn with whatever it is carrying itself —
//  a neighbour already alarming is not the same as a quiet one.
// =========================================================================

const worstSevOf = list => list.reduce((w, a) => (SEV_RANK[a.sev] > SEV_RANK[w] ? a.sev : w), 'Info')

/* The open alerts an element carries in its own right, whether or not this
   incident named it. */
const openOn = name => allAlerts.filter(a => a.equip === name && a.status !== 'Closed')

/* One element on the map: itself, whatever it is carrying, and the far ends
   of its own links — the same shape the incident map draws, so both views
   share a component. */
export function elementTopology(name) {
  const ne = neByName.get(name)
  if (!ne) return { nodes: [], links: [], affected: [], neighbours: [], neighboursAlerting: 0, sites: [] }
  const own = openOn(name)
  return incidentTopology(own.length ? own : [{ equip: name, sev: 'Info', service: 'No' }])
}

export function incidentTopology(rows = []) {
  const nodes = new Map()
  const links = []
  const add = (ne, role, extra = {}) => {
    const had = nodes.get(ne.name)
    if (had) { if (role === 'affected') Object.assign(had, { role: 'affected' }, extra); return had }
    const own = openOn(ne.name)
    const node = {
      name: ne.name, lat: ne.lat, lng: ne.lng, city: ne.city, region: ne.region,
      kind: ne.kind, domain: ne.domain, vendor: ne.vendor, role,
      openAlerts: own.length, sev: own.length ? worstSevOf(own) : null, ...extra,
    }
    nodes.set(ne.name, node)
    return node
  }

  /* The elements this incident names, with what it put on each of them. */
  const affected = [...new Set(rows.map(r => r.equip))]
    .map(name => ({ name, ne: neByName.get(name), on: rows.filter(r => r.equip === name) }))
    .filter(x => x.ne)
  affected.forEach(({ ne, on }) => add(ne, 'affected', {
    incidentAlerts: on.length,
    incidentSev: worstSevOf(on),
    service: on.some(a => a.service === 'Yes'),
  }))

  /* …and what each of them is wired to. A link the element's own topology
     reports as not active is drawn as the broken one it is. */
  affected.forEach(({ name, ne }) => {
    const detail = nodeDetailFor(name)
    if (!detail) return
    detail.links.forEach(l => {
      const z = neByName.get(l.nodeZ)
      if (!z || z.name === name) return
      add(z, 'neighbour')
      if (!links.some(x => (x.a === name && x.b === z.name) || (x.a === z.name && x.b === name))) {
        links.push({ a: name, b: z.name, role: l.role, port: l.portA, down: l.status !== 'Active' })
      }
    })
  })

  const list = [...nodes.values()]
  return {
    nodes: list,
    links,
    affected: list.filter(n => n.role === 'affected'),
    neighbours: list.filter(n => n.role === 'neighbour'),
    /* A neighbour already carrying something of its own is the one worth
       looking at next, so the map says how many there are. */
    neighboursAlerting: list.filter(n => n.role === 'neighbour' && n.sev).length,
    sites: [...new Set(list.map(n => n.city))],
  }
}

// =========================================================================
//  REGION TOPOLOGY — the elements of one region and what joins them
//
//  A node-link view rather than a map. A map answers "where", which the
//  geography panels already do; this answers "what is next to what", which
//  is the question an operator asks when one element is alerting and they
//  need to know what sits behind it.
//
//  Both the sample and the layout are deterministic. The sample walks the
//  region at a fixed stride so the same region always returns the same
//  elements, and the layout is a spring-electrical relaxation seeded from
//  the region name — no Math.random anywhere, so the graph does not
//  rearrange itself between reloads.
// =========================================================================

const TOPO_MAX = 90

/* One spring-electrical relaxation. Linked nodes pull together, every pair
   pushes apart, and the step size cools over the run so the layout settles
   instead of oscillating. */
function relax(nodes, links, seed) {
  const rnd = mulberry32(seed)
  const n = nodes.length
  const pos = nodes.map((_, i) => {
    // A seeded spiral rather than a ring: a ring starts every node the same
    // distance out, and the first few iterations spend themselves undoing it.
    const a = i * 2.399963 + rnd() * 0.4
    const r = 40 + Math.sqrt(i / n) * 300
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 }
  })
  const deg = nodes.map(() => 0)
  links.forEach(l => { deg[l.s]++; deg[l.t]++ })

  const ITER = 220
  for (let step = 0; step < ITER; step++) {
    const cool = 1 - step / ITER
    for (let i = 0; i < n; i++) { pos[i].vx *= 0.72; pos[i].vy *= 0.72 }
    // Repulsion, every pair.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y
        let d2 = dx * dx + dy * dy
        if (d2 < 0.01) { dx = (i - j) * 0.1 + 0.1; dy = 0.1; d2 = dx * dx + dy * dy }
        const f = 2600 / d2
        const d = Math.sqrt(d2)
        const ux = (dx / d) * f, uy = (dy / d) * f
        pos[i].vx += ux; pos[i].vy += uy
        pos[j].vx -= ux; pos[j].vy -= uy
      }
    }
    // Attraction along links, softened by degree so a hub does not collapse
    // its whole neighbourhood onto itself.
    for (const l of links) {
      const a = pos[l.s], b = pos[l.t]
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = (d - 70) * 0.08 / Math.max(1, Math.min(deg[l.s], deg[l.t]) * 0.35)
      const ux = (dx / d) * f, uy = (dy / d) * f
      a.vx += ux; a.vy += uy
      b.vx -= ux; b.vy -= uy
    }
    // A weak pull to the middle, so components do not drift apart for ever.
    for (let i = 0; i < n; i++) { pos[i].vx -= pos[i].x * 0.004; pos[i].vy -= pos[i].y * 0.004 }
    for (let i = 0; i < n; i++) { pos[i].x += pos[i].vx * cool; pos[i].y += pos[i].vy * cool }
  }
  return pos
}

/* Turn a settled layout so its widest direction runs left-to-right. The
   relaxation has no preferred orientation, so without this a region can come
   back as a tall stripe down the middle of a wide frame. */
function rotateToPrincipalAxis(pos) {
  const n = pos.length
  const mx = pos.reduce((a, p) => a + p.x, 0) / n
  const my = pos.reduce((a, p) => a + p.y, 0) / n
  let sxx = 0, syy = 0, sxy = 0
  for (const p of pos) {
    const dx = p.x - mx, dy = p.y - my
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const c = Math.cos(-theta), s = Math.sin(-theta)
  for (const p of pos) {
    const dx = p.x - mx, dy = p.y - my
    p.x = dx * c - dy * s
    p.y = dx * s + dy * c
  }
}

const topoCache = new Map()

export function regionTopology(region) {
  if (topoCache.has(region)) return topoCache.get(region)

  const all = networkElements.filter(e => e.region === region)
  const predictedOn = new Set(predictive.map(p => p.node))

  /* The elements worth drawing go in first — everything with a prediction
     against it, then a share of what is alerting — so the two filters always
     have something behind them. The rest is a fixed stride across the region
     rather than the first ninety, which would return one city's worth of
     elements and call it the region. */
  const picked = []
  const take = e => { if (picked.length < TOPO_MAX && !picked.includes(e)) picked.push(e) }
  all.filter(e => predictedOn.has(e.name)).forEach(take)
  all.filter(e => e.alerting).slice(0, 18).forEach(take)
  const stride = Math.max(1, Math.floor(all.length / TOPO_MAX))
  for (let i = 0; i < all.length && picked.length < TOPO_MAX; i += stride) take(all[i])
  for (let i = 0; i < all.length && picked.length < TOPO_MAX; i++) take(all[i])

  const index = new Map(picked.map((e, i) => [e.name, i]))
  const openBy = new Map()
  activeAlerts.forEach(a => { if (!openBy.has(a.equip)) openBy.set(a.equip, []) ; openBy.get(a.equip).push(a) })

  const rnd = mulberry32([...region].reduce((a, c) => (a * 131 + c.charCodeAt(0)) | 0, 0x4a17))
  const seen = new Set()
  const links = []
  picked.forEach((e, i) => {
    const cls = NODE_CLASS[e.kind] || 'packet'
    /* Join to peers already in the sample — a link to an element the graph
       does not draw is a line to nowhere. */
    const peers = neighboursOf(e, rnd, 40, cls).filter(p => index.has(p.name))
    const want = 1 + Math.floor(rnd() * 2)
    peers.slice(0, want).forEach(p => {
      const j = index.get(p.name)
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (i !== j && !seen.has(key)) { seen.add(key); links.push({ s: i, t: j }) }
    })
  })

  const pos = relax(picked, links, [...region].reduce((a, c) => (a * 37 + c.charCodeAt(0)) | 0, 0x1234))
  rotateToPrincipalAxis(pos)
  const xs = pos.map(p => p.x), ys = pos.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  /* Inset by the node radius plus its ring, or the elements that land on the
     extremes come back sliced in half by the edge of the frame. */
  const PAD = 22
  const W = 900 - PAD * 2, H = 560 - PAD * 2
  const sx = W / Math.max(1, maxX - minX), sy = H / Math.max(1, maxY - minY)
  const s = Math.min(sx, sy)

  const nodes = picked.map((e, i) => {
    const open = openBy.get(e.name) || []
    return {
      name: e.name, vendor: e.vendor, domain: e.domain, kind: e.kind, city: e.city,
      x: Math.round(((pos[i].x - minX) * s + PAD + (W - (maxX - minX) * s) / 2) * 10) / 10,
      y: Math.round(((pos[i].y - minY) * s + PAD + (H - (maxY - minY) * s) / 2) * 10) / 10,
      actual: open.length > 0,
      sev: open.length ? [...open].sort((a, b) => (HEALTH_PENALTY[b.sev] || 0) - (HEALTH_PENALTY[a.sev] || 0))[0].sev : null,
      predicted: predictedOn.has(e.name),
    }
  })

  const vendorCounts = [...new Set(nodes.map(n => n.vendor))]
    .map(v => ({ vendor: v, count: nodes.filter(n => n.vendor === v).length }))
    .sort((a, b) => b.count - a.count || a.vendor.localeCompare(b.vendor))

  const out = {
    region, nodes, links,
    vendors: vendorCounts,
    total: all.length,
    actual: nodes.filter(n => n.actual).length,
    predicted: nodes.filter(n => n.predicted).length,
  }
  topoCache.set(region, out)
  return out
}

export const topologyRegions = regions.map(r => r.name)


// --- Tickets: the work an incident actually spawns -------------------------
/**
 * An incident is a statement about the network; a ticket is the work someone
 * owes against it. One incident rarely closes through a single ticket — a
 * fibre cut that takes a node down opens a NOC record, a dispatch to the site
 * it sits on, and a vendor case if a card has to be replaced, and each of
 * those runs its own lifecycle, at its own pace, in front of a different
 * team.
 *
 * None of it is asserted. Which tickets exist comes from the work the
 * incident's own alarms imply; their priority from the severity actually
 * raised; their clocks from the same SLA table the worklist reads; and how
 * far each has run from whether the alerts it covers are still open. An
 * incident whose alerts have all cleared cannot show a dispatch still en
 * route.
 */

/* What fixes this condition decides who is sent, and so which ticket it
   lands on: hands at the site, a session on the element, a replacement part,
   or a change raised against the configuration. */
const WORK_OF = {
  'Node Down': 'field', 'Power Supply Fault': 'field', 'High Temperature': 'field',
  'Loss of Signal': 'field', 'Optical Power Low': 'field',
  'Card Failure': 'vendor',
  'Config Drift Detected': 'change', 'Licence Expiring': 'change', 'Backup Overdue': 'change',
}
const workOf = name => WORK_OF[name] || 'remote'

const TICKET_KINDS = {
  incident: {
    label: 'Incident record', short: 'Incident', team: 'NOC · Service Assurance', tone: 'red',
    stages: ['Logged', 'Triaged', 'In progress', 'Pending verification', 'Resolved', 'Closed'],
    factor: 1,
  },
  field: {
    label: 'Field dispatch', short: 'Dispatch', team: 'Field Operations', tone: 'amber',
    stages: ['Raised', 'Dispatched', 'Engineer en route', 'On site', 'Work complete', 'Closed'],
    factor: 1.6,
  },
  vendor: {
    label: 'Vendor case', short: 'Vendor', team: 'Vendor Management', tone: 'purple',
    stages: ['Logged with vendor', 'Vendor triage', 'RMA issued', 'Part on site', 'Replaced', 'Closed'],
    factor: 3,
  },
  change: {
    label: 'Change request', short: 'Change', team: 'Change Management', tone: 'blue',
    stages: ['Drafted', 'Submitted', 'CAB approved', 'Scheduled', 'Implemented', 'Closed'],
    factor: 2,
  },
}

const PRIORITY_OF_SEV = { Critical: 'P1', Major: 'P2', Minor: 'P3', Warning: 'P4', Info: 'P4' }
/* Respond, then resolve. The resolution clock is the severity SLA the
   worklist already grades alerts against, so a ticket and the alert under it
   can never disagree about when the estate is late. */
const RESPOND_TARGET = { P1: 15, P2: 30, P3: 60, P4: 240 }
const RESOLVE_TARGET = { P1: SEV_SLA.Critical, P2: SEV_SLA.Major, P3: SEV_SLA.Minor, P4: SEV_SLA.Warning }

const FIELD_ENGINEERS = ['Imran Qureshi', 'Devendra Rathore', 'Anil Kumbhar', 'Sujith Menon', 'Pawan Bisht']
const VENDOR_ANALYSTS = ['L2 Support Desk', 'TAC Engineer', 'Regional SE']
const hashOf = s => [...String(s)].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381)

/* A part number that matches the thing that failed, rather than a random
   string that happens to look like one. */
const PART_OF = {
  'Optical Line Terminal': 'OLT-GPON-16', Router: 'RTR-LC-100G-4P', Switch: 'SW-SFP28-25G',
  'Transponder': 'DWDM-TXP-200G', 'Base Station': 'RRU-3500-4T4R', Firewall: 'FW-PSU-800W',
  Server: 'SRV-PSU-1600W', 'Optical Amplifier': 'EDFA-C-20DB', 'ROADM': 'ROADM-WSS-20',
}

/* The rows a ticket covers decide everything about it, so the builder takes
   them and nothing else. `order` only spaces the child tickets out behind the
   incident record — the NOC logs first, the field is raised after it. */
function buildTicket({ kind, incidentId, seq, rows, order, scope }) {
  const def = TICKET_KINDS[kind]
  /* The id is positional rather than hashed: a hash over the incident id
     collides, and two tickets sharing a number is not a demo detail. */
  const id = `TT-${100001 + (INCIDENT_INDEX.get(incidentId) ?? 0) * 50 + seq}`
  const rnd = mulberry32(hashOf(id))
  const worst = rows.reduce((w, a) => (SEV_RANK[a.sev] > SEV_RANK[w] ? a.sev : w), 'Info')
  const priority = PRIORITY_OF_SEV[worst] || 'P4'
  const respond = RESPOND_TARGET[priority]
  const resolve = RESOLVE_TARGET[priority]

  const closedRows = rows.filter(a => a.status === 'Closed')
  const allClosed = closedRows.length === rows.length
  /* Whatever the work was, it finished no earlier than the last alert on it
     cleared — that clearance is the evidence the fix worked. */
  const clearedAgo = allClosed
    ? Math.min(...closedRows.map(a => a.closedAgo ?? 0))
    : null

  /* A ticket is opened after the alarm it answers and before the work that
     closed it, so both bounds are honoured rather than only the first: a
     dispatch raised behind the incident record still cannot be raised after
     the fault it was raised for had already cleared. */
  const oldest = rows.reduce((o, a) => (ageMinsOf(a) > ageMinsOf(o) ? a : o), rows[0])
  const detect = 2 + Math.floor(rnd() * (priority === 'P1' ? 5 : 20))
  const raised = ageMinsOf(oldest)
  const floorAgo = clearedAgo == null ? 1 : clearedAgo + 1
  const createdAgo = Math.min(raised,
    Math.max(floorAgo, raised - detect - order * (6 + Math.floor(rnd() * 26))))
  const elapsed = createdAgo

  const last = def.stages.length - 1
  let stageIdx
  if (allClosed) stageIdx = clearedAgo > 60 ? last : last - 1
  else {
    const progress = Math.min(0.99, elapsed / (resolve * def.factor))
    /* Resolved and Closed are claims about the fault being gone. While an
       alert is still open the ticket cannot be further on than the stage
       before them. */
    stageIdx = Math.min(last - 2, Math.floor(progress * (last - 1)))
  }
  const state = def.stages[stageIdx]
  const closed = stageIdx === last

  /* Every stage the ticket has actually reached, stamped. The walk is
     monotonic by construction: each step takes a share of the time between
     the one before it and either the clearance or now. */
  const endAgo = allClosed ? Math.min(clearedAgo, Math.max(0, createdAgo - 1)) : 0
  const walk = Math.max(1, createdAgo - endAgo)
  const steps = [{ state: def.stages[0], ago: createdAgo }]
  let cursor = createdAgo
  for (let k = 1; k <= stageIdx; k++) {
    /* Stages are spread across the time the ticket has actually had, with
       the first move pulled towards the response target — a ticket picked up
       inside its SLA is picked up early, not a fifth of the way through. */
    const even = createdAgo - (walk * k) / stageIdx
    const jitter = (rnd() - 0.5) * (walk / (stageIdx + 2))
    const want = k === 1
      ? createdAgo - Math.min(respond * (0.4 + rnd() * 1.2), walk / stageIdx)
      : even + jitter
    cursor = Math.round(Math.min(cursor - 1, Math.max(endAgo, want)))
    steps.push({ state: def.stages[k], ago: cursor })
  }
  const respondedIn = steps.length > 1 ? createdAgo - steps[1].ago : null
  const updatedAgo = steps[steps.length - 1].ago
  const inState = updatedAgo

  const site = rows[0].city
  const elements = [...new Set(rows.map(a => a.equip))]
  const vendor = rows[0].vendor
  const engineer = FIELD_ENGINEERS[Math.floor(rnd() * FIELD_ENGINEERS.length)]
  const owner = kind === 'field' ? engineer : OWNERS[Math.floor(rnd() * OWNERS.length)]

  const title = kind === 'incident'
    ? `${rows[0].name} on ${elements[0]}${elements.length > 1 ? ` +${elements.length - 1} more` : ''}`
    : kind === 'field' ? `Site attendance — ${site} (${elements.length} element${elements.length === 1 ? '' : 's'})`
      : kind === 'vendor' ? `${vendor} hardware replacement — ${elements[0]}`
        : `Restore approved configuration — ${elements[0]}`

  /* What each stage meant when it happened, in the words the team that owns
     the ticket would have written. */
  const NOTE = {
    incident: {
      Logged: `Correlated alerts on ${elements.length} element${elements.length === 1 ? '' : 's'} raised as one incident.`,
      Triaged: `Severity confirmed ${worst}; ${priority} clock started against a ${Math.round(resolve / 60)}h resolution target.`,
      'In progress': `${owner} working the root condition — ${rows[0].name}.`,
      'Pending verification': 'Fix applied; waiting for the alarms to clear from the element.',
      Resolved: 'All correlated alerts cleared at source.',
      Closed: 'Closed after the clearance held through the verification window.',
    },
    field: {
      Raised: `Dispatch requested for ${site}; site access and permit checked.`,
      Dispatched: `Assigned to ${engineer}; nearest stores hold the spare.`,
      'Engineer en route': 'Travelling to site with the spare and an optical meter.',
      'On site': 'On site, fault located and work started.',
      'Work complete': 'Work finished and readings taken; handed back to the NOC.',
      Closed: 'Job card signed off and materials booked out.',
    },
    vendor: {
      'Logged with vendor': `Case opened with ${vendor} under the 24x7 4-hour response contract.`,
      'Vendor triage': `${VENDOR_ANALYSTS[Math.floor(rnd() * VENDOR_ANALYSTS.length)]} reviewed the logs pulled off the element.`,
      'RMA issued': 'Replacement authorised; part released from the regional depot.',
      'Part on site': 'Part received at site and checked against the serial on record.',
      Replaced: 'Faulty unit swapped; failed unit packed for return.',
      Closed: 'Return received by the vendor and the case closed.',
    },
    change: {
      Drafted: `Change raised to return ${elements[0]} to the approved baseline.`,
      Submitted: 'Submitted with backout plan and impact assessment.',
      'CAB approved': 'Approved for the next standard maintenance window.',
      Scheduled: 'Scheduled; the affected service has been notified.',
      Implemented: 'Applied and verified against the golden configuration.',
      Closed: 'Post-implementation review complete.',
    },
  }[kind]

  const actorFor = s => (kind === 'field' && steps.indexOf(s) > 0 ? engineer
    : kind === 'vendor' && s.state !== 'Logged with vendor' ? `${vendor} TAC`
      : owner)

  const history = steps.map(s => ({
    state: s.state, ago: s.ago, at: shortStamp(s.ago),
    by: actorFor(s), note: NOTE[s.state] || '',
  })).reverse()

  const refs = { incident: incidentId }
  if (kind === 'field') {
    refs.dispatch = `FD-${pad(1000 + (hashOf(id) % 8999), 4)}`
    refs.engineer = engineer
    refs.access = rows[0].domain === 'Fiber' ? 'Right-of-way permit on file' : 'Site key held by the landlord'
  }
  if (kind === 'vendor') {
    refs.case = `${vendor.slice(0, 3).toUpperCase()}-${pad(100000 + (hashOf(id) % 899999), 6)}`
    refs.rma = `RMA-${pad(20000 + (hashOf(id + 'r') % 79999), 5)}`
    refs.part = PART_OF[rows[0].equipType] || 'FRU-GENERIC-01'
    refs.contract = '24x7, 4-hour response'
  }
  if (kind === 'change') {
    refs.change = `CHG-${pad(30000 + (hashOf(id) % 69999), 5)}`
    refs.window = shortStamp(-(60 + Math.floor(rnd() * 600)))
    refs.risk = priority === 'P1' ? 'Medium — service already degraded' : 'Low — no traffic impact expected'
    refs.backout = 'Restore the previous running configuration from the last good backup.'
  }
  if (kind === 'incident') {
    refs.bridge = `Bridge ${4000 + (hashOf(incidentId) % 900)}`
    refs.customer = rows.some(a => a.service === 'Yes') ? 'Customer notification sent' : 'No customer notification required'
  }

  return {
    id, kind, kindLabel: def.label, kindShort: def.short, tone: def.tone,
    incident: incidentId, title, scope,
    team: def.team, owner, priority, sev: worst,
    stages: def.stages, state, stageIdx, closed, open: !closed,
    createdAgo, created: shortStamp(createdAgo), age: ageParts(createdAgo),
    updatedAgo, updated: shortStamp(updatedAgo), inState: ageParts(inState),
    dueAgo: createdAgo - resolve, due: shortStamp(createdAgo - resolve),
    respondTarget: respond, resolveTarget: resolve,
    respondedIn, respondMet: respondedIn != null && respondedIn <= respond,
    /* Time left on the resolution clock, or how far past it the ticket ran. */
    slaMins: closed ? (createdAgo - (clearedAgo ?? 0)) - resolve : resolve - createdAgo,
    breached: closed ? (createdAgo - (clearedAgo ?? 0)) > resolve : createdAgo > resolve,
    /* Under an hour, "0 Hours 7 Mins" is the arithmetic showing through —
       a ticket that ran seven minutes ran seven minutes. */
    resolvedIn: allClosed ? (mins => (mins < 60 ? `${mins} min${mins === 1 ? '' : 's'}` : ageParts(mins)))(
      Math.max(1, createdAgo - (clearedAgo ?? 0))) : null,
    site, elements, vendor, domain: rows[0].domain, equipType: rows[0].equipType,
    ems: rows[0].ems, alerts: rows, alertCount: rows.length,
    openAlerts: rows.filter(a => a.status !== 'Closed').length,
    service: rows.some(a => a.service === 'Yes'),
    resolution: allClosed ? (rows.find(a => a.resolution) || {}).resolution || RESOLUTIONS[hashOf(id) % RESOLUTIONS.length] : null,
    history, refs,
  }
}

/* Ticket numbers are handed out by the incident's position in a fixed list,
   so the same incident carries the same numbers whatever order the app
   happens to open them in. */
const INCIDENT_INDEX = new Map(Object.keys(incidentGroups).sort().map((id, i) => [id, i]))

const ticketCache = new Map()

/* Every ticket an incident is being worked through. The incident record is
   always first — it is the one the others hang off — and the children follow
   in the order the work would have been raised. */
export function ticketsForIncident(id, rows) {
  if (ticketCache.has(id)) return ticketCache.get(id)
  const all = (rows && rows.length ? rows : allAlerts.filter(a => a.incident === id))
  if (!all.length) return []

  const out = [buildTicket({ kind: 'incident', incidentId: id, seq: 0, rows: all, order: 0, scope: 'The whole incident' })]

  /* Hands at a site are dispatched per site; a replacement part is raised
     per element, because that is the unit that gets swapped; a change is
     raised once against the configuration that drifted. */
  const byWork = { field: {}, vendor: {}, change: {} }
  all.forEach(a => {
    const w = workOf(a.name)
    if (w === 'remote') return
    const key = w === 'field' ? a.city : w === 'vendor' ? a.equip : a.equip
    ;(byWork[w][key] = byWork[w][key] || []).push(a)
  })

  let seq = 1
  Object.entries(byWork.field).forEach(([city, rs], i) => {
    out.push(buildTicket({ kind: 'field', incidentId: id, seq: seq++, rows: rs, order: 1 + i, scope: `Site work at ${city}` }))
  })
  Object.entries(byWork.vendor).forEach(([eq, rs], i) => {
    out.push(buildTicket({ kind: 'vendor', incidentId: id, seq: seq++, rows: rs, order: 2 + i, scope: `Hardware on ${eq}` }))
  })
  Object.entries(byWork.change).forEach(([eq, rs], i) => {
    out.push(buildTicket({ kind: 'change', incidentId: id, seq: seq++, rows: rs, order: 1 + i, scope: `Configuration on ${eq}` }))
  })

  ticketCache.set(id, out)
  return out
}

/* One ticket by its own id, for the ticket view opened directly rather than
   through the incident it belongs to. */
export function ticketById(tid) {
  for (const [id] of Object.entries(incidentGroups)) {
    const hit = ticketsForIncident(id).find(t => t.id === tid)
    if (hit) return hit
  }
  return null
}

/* What the incident's ticket set says as one line: how much work is still
   owed, and whether any of it is late. */
export function ticketSummary(id, rows) {
  const ts = ticketsForIncident(id, rows)
  return {
    total: ts.length,
    open: ts.filter(t => t.open).length,
    breached: ts.filter(t => t.breached && t.open).length,
    teams: [...new Set(ts.map(t => t.team))].length,
    tickets: ts,
  }
}


// --- What an incident is worth to someone who does not read alarms --------
/**
 * The executive read of one incident: how hard it is hitting, how late it is
 * against the promise made for that severity, and how far through being
 * fixed it is.
 *
 * It is the same impact × urgency model the worklist grades individual
 * alerts with — severity weight, a service-affecting multiplier, and the
 * reach across the estate, against the age of the thing versus its severity
 * SLA — applied to the incident as a whole rather than to one alert, so a
 * board-level number and a queue position can never tell different stories.
 */
export function incidentImpact(rows = []) {
  if (!rows.length) return null
  const worst = rows.reduce((w, a) => ((SEV_WEIGHT[a.sev] || 0) > (SEV_WEIGHT[w] || 0) ? a.sev : w), 'Info')
  const service = rows.some(a => a.service === 'Yes')
  const elements = new Set(rows.map(a => a.equip)).size
  const sites = [...new Set(rows.map(a => a.city))]
  const ageMins = Math.max(...rows.map(ageMinsOf))
  const allowed = SEV_SLA[worst] || 720

  /* Reach counts both how many elements are involved and how large the sites
     they sit in are: ten elements in Delhi is a different event from ten in
     a small POP. */
  const siteW = sites.reduce((n, c) => n + (siteSize[c] || 12), 0) / (maxSite * Math.max(1, sites.length))
  const reachW = Math.min(1, (elements / 25) * 0.6 + siteW * 0.4)
  /* Normalised so that 100 is reserved for the worst case the model can
     describe — critical, service-affecting, right across the estate —
     rather than reached by any critical alert with a customer behind it. */
  const impact = Math.min(100, Math.round(
    ((SEV_WEIGHT[worst] || 30) * (service ? 1.15 : 1) * (0.72 + reachW * 0.28)) / 1.15))
  /* Urgency is how far into the promise it is, and then how far past it: an
     incident an hour over its target is not the same as one four times over,
     and a flat "breached" flag said they were. */
  const over = Math.max(0, ageMins - allowed)
  const urgency = Math.min(100, Math.round(
    Math.min(1, ageMins / allowed) * 65 + Math.min(1, over / (allowed * 3)) * 35))
  const score = Math.round(impact * 0.6 + urgency * 0.4)

  const openRows = rows.filter(a => a.status !== 'Closed')
  const cleared = rows.length - openRows.length
  return {
    worst, service, elements, sites: sites.length, ageMins, allowed,
    impact, urgency, score,
    band: score >= 80 ? 'Severe' : score >= 60 ? 'High' : score >= 40 ? 'Moderate' : 'Low',
    breached: ageMins > allowed, overBy: ageMins - allowed,
    /* How far through it is, by the only measure the estate can verify: the
       alerts that have actually cleared. */
    cleared, clearedPct: Math.round((cleared / rows.length) * 100),
    open: openRows.length,
    /* The share of the estate sitting inside this incident. */
    fleetPct: Math.round((elements / networkElements.length) * 1000) / 10,
    serviceAlerts: rows.filter(a => a.service === 'Yes').length,
    domains: [...new Set(rows.map(a => a.domain))],
    vendors: [...new Set(rows.map(a => a.vendor))],
  }
}
