/* ── Geographic Network Hierarchy Data ─────────────────────────────
   3-Tier cascading hierarchy: Region -> State -> City
   Matches Indian telecom network infrastructure hierarchy (Level 1 - 3).
   Also includes City-level Network Elements data for Data Centers, PoP Locations, and Sites.
   ─────────────────────────────────────────────────────────────────── */

export interface CityItem {
  id: string;
  name: string;
  count: number; // network element count
  stateId: string;
  dcCount: number;
  popCount: number;
  siteCount: number;
}

export interface StateItem {
  id: string;
  name: string;
  cityCount: number;
  regionId: string;
  themeColor: string;
  bgColor: string;
  cities: CityItem[];
}

export interface RegionItem {
  id: string;
  name: string;
  stateCount: number;
  cityCount: number;
  themeColor: string;
  bgColor: string;
  iconType: 'north' | 'west' | 'east' | 'south';
  states: StateItem[];
}

export interface NetworkElementRow {
  id: string;
  status: 'Verified' | 'Drifted' | 'Stale' | 'Missing';
  name: string;
  ip: string;
  model: string;
  vendor: 'CISCO' | 'JUNIPER' | 'NOKIA' | 'HUAWEI';
  osVersion: string;
  serialNumber: string;
  region: string;
  portsUsed: number;
  portsTotal: number;
  locationCode: string;
  systemDescription: string;
  category: 'Router' | 'Switch' | 'DWDM' | 'eNodeB' | 'gNodeB';
  facilityType: 'dc' | 'pop' | 'site';
  cityId: string;
}

export interface FacilityItem {
  id: string;
  code: string;
  name: string;
  facilityType: 'dc' | 'pop' | 'site';
  subType: string;
  tierOrClassification: string;
  siteType?: string;
  siteStructure?: string;
  address: string;
  rackOrCapacity: string;
  racksTotal?: number;
  racksUsed?: number;
  powerOrUplink: string;
  deviceCount: number;
  status: 'Verified' | 'Drifted' | 'Stale';
  onAirPct: number;
}

export const TOP_HIERARCHY_METRICS = [
  { id: 'regions', label: 'Regions', count: '4', icon: 'regions', color: '#9333ea', bg: '#f3e8ff' },
  { id: 'states', label: 'States', count: '28', icon: 'states', color: '#2563eb', bg: '#eff6ff' },
  { id: 'cities', label: 'Cities', count: '429', icon: 'cities', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'datacenters', label: 'Data Centers', count: '1,123', icon: 'dc', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'pops', label: 'PoP Locations', count: '5,335', icon: 'pop', color: '#0284c7', bg: '#e0f2fe' },
  { id: 'sites', label: 'Sites', count: '33,181', icon: 'site', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'alarms', label: 'Active Alarms', count: '1,248', icon: 'alarm', color: '#ef4444', bg: '#fef2f2' },
];

export const GEOGRAPHIC_HIERARCHY: RegionItem[] = [
  {
    id: 'north',
    name: 'North Region',
    stateCount: 7,
    cityCount: 107,
    themeColor: '#9333ea',
    bgColor: '#f3e8ff',
    iconType: 'north',
    states: [
      {
        id: 'delhi',
        name: 'Delhi NCR',
        cityCount: 15,
        regionId: 'north',
        themeColor: '#3b82f6',
        bgColor: '#eff6ff',
        cities: [
          { id: 'delhi-central', name: 'Central Delhi', count: 340, stateId: 'delhi', dcCount: 14, popCount: 42, siteCount: 284 },
          { id: 'delhi-south', name: 'South Delhi', count: 310, stateId: 'delhi', dcCount: 10, popCount: 38, siteCount: 262 },
          { id: 'delhi-noida', name: 'Noida', count: 260, stateId: 'delhi', dcCount: 8, popCount: 32, siteCount: 220 },
          { id: 'delhi-gurgaon', name: 'Gurugram', count: 290, stateId: 'delhi', dcCount: 12, popCount: 36, siteCount: 242 },
          { id: 'delhi-north', name: 'North Delhi', count: 180, stateId: 'delhi', dcCount: 6, popCount: 24, siteCount: 150 },
          { id: 'delhi-west', name: 'West Delhi', count: 175, stateId: 'delhi', dcCount: 5, popCount: 22, siteCount: 148 },
          { id: 'delhi-east', name: 'East Delhi', count: 160, stateId: 'delhi', dcCount: 4, popCount: 20, siteCount: 136 },
          { id: 'delhi-faridabad', name: 'Faridabad', count: 140, stateId: 'delhi', dcCount: 3, popCount: 18, siteCount: 119 },
          { id: 'delhi-ghaziabad', name: 'Ghaziabad', count: 130, stateId: 'delhi', dcCount: 3, popCount: 16, siteCount: 111 },
          { id: 'delhi-sonipat', name: 'Sonipat', count: 85, stateId: 'delhi', dcCount: 2, popCount: 10, siteCount: 73 },
          { id: 'delhi-panipat', name: 'Panipat', count: 70, stateId: 'delhi', dcCount: 1, popCount: 8, siteCount: 61 },
          { id: 'delhi-new-delhi', name: 'New Delhi', count: 65, stateId: 'delhi', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'delhi-greater-noida', name: 'Greater Noida', count: 83, stateId: 'delhi', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'delhi-meerut-south', name: 'Meerut South', count: 73, stateId: 'delhi', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'delhi-manesar', name: 'Manesar', count: 90, stateId: 'delhi', dcCount: 2, popCount: 14, siteCount: 60 }
        ]
      },
      {
        id: 'punjab',
        name: 'Punjab',
        cityCount: 16,
        regionId: 'north',
        themeColor: '#0ea5e9',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'pb-ludhiana', name: 'Ludhiana', count: 210, stateId: 'punjab', dcCount: 6, popCount: 26, siteCount: 178 },
          { id: 'pb-amritsar', name: 'Amritsar', count: 180, stateId: 'punjab', dcCount: 5, popCount: 22, siteCount: 153 },
          { id: 'pb-jalandhar', name: 'Jalandhar', count: 160, stateId: 'punjab', dcCount: 4, popCount: 20, siteCount: 136 },
          { id: 'pb-mohali', name: 'Mohali', count: 140, stateId: 'punjab', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'pb-patiala', name: 'Patiala', count: 110, stateId: 'punjab', dcCount: 2, popCount: 14, siteCount: 94 },
          { id: 'pb-bathinda', name: 'Bathinda', count: 95, stateId: 'punjab', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'pb-pathankot', name: 'Pathankot', count: 80, stateId: 'punjab', dcCount: 2, popCount: 10, siteCount: 68 },
          { id: 'pb-hoshiarpur', name: 'Hoshiarpur', count: 75, stateId: 'punjab', dcCount: 1, popCount: 10, siteCount: 64 },
          { id: 'pb-moga', name: 'Moga', count: 65, stateId: 'punjab', dcCount: 1, popCount: 8, siteCount: 56 },
          { id: 'pb-firozpur', name: 'Firozpur', count: 55, stateId: 'punjab', dcCount: 1, popCount: 7, siteCount: 47 },
          { id: 'punjab-batala', name: 'Batala', count: 65, stateId: 'punjab', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'punjab-abohar', name: 'Abohar', count: 83, stateId: 'punjab', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'punjab-malerkotla', name: 'Malerkotla', count: 73, stateId: 'punjab', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'punjab-khanna', name: 'Khanna', count: 90, stateId: 'punjab', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'punjab-muktsar', name: 'Muktsar', count: 82, stateId: 'punjab', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'punjab-barnala', name: 'Barnala', count: 73, stateId: 'punjab', dcCount: 1, popCount: 9, siteCount: 70 }
        ]
      },
      {
        id: 'haryana',
        name: 'Haryana',
        cityCount: 15,
        regionId: 'north',
        themeColor: '#f97316',
        bgColor: '#ffedd5',
        cities: [
          { id: 'hr-karnal', name: 'Karnal', count: 120, stateId: 'haryana', dcCount: 3, popCount: 15, siteCount: 102 },
          { id: 'hr-rohtak', name: 'Rohtak', count: 110, stateId: 'haryana', dcCount: 2, popCount: 14, siteCount: 94 },
          { id: 'hr-hisar', name: 'Hisar', count: 95, stateId: 'haryana', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'hr-ambala', name: 'Ambala', count: 130, stateId: 'haryana', dcCount: 4, popCount: 18, siteCount: 108 },
          { id: 'hr-yamunanagar', name: 'Yamunanagar', count: 90, stateId: 'haryana', dcCount: 2, popCount: 12, siteCount: 76 },
          { id: 'hr-panchkula', name: 'Panchkula', count: 85, stateId: 'haryana', dcCount: 2, popCount: 11, siteCount: 72 },
          { id: 'hr-kurukshetra', name: 'Kurukshetra', count: 75, stateId: 'haryana', dcCount: 1, popCount: 10, siteCount: 64 },
          { id: 'hr-bhiwani', name: 'Bhiwani', count: 65, stateId: 'haryana', dcCount: 1, popCount: 8, siteCount: 56 },
          { id: 'hr-sirsa', name: 'Sirsa', count: 60, stateId: 'haryana', dcCount: 1, popCount: 8, siteCount: 51 },
          { id: 'haryana-bahadurgarh', name: 'Bahadurgarh', count: 65, stateId: 'haryana', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'haryana-jind', name: 'Jind', count: 83, stateId: 'haryana', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'haryana-thanesar', name: 'Thanesar', count: 73, stateId: 'haryana', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'haryana-kaithal', name: 'Kaithal', count: 90, stateId: 'haryana', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'haryana-rewari', name: 'Rewari', count: 82, stateId: 'haryana', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'haryana-palwal', name: 'Palwal', count: 73, stateId: 'haryana', dcCount: 1, popCount: 9, siteCount: 70 }
        ]
      },
      {
        id: 'up-west',
        name: 'Uttar Pradesh (West)',
        cityCount: 16,
        regionId: 'north',
        themeColor: '#f43f5e',
        bgColor: '#ffe4e6',
        cities: [
          { id: 'upw-meerut', name: 'Meerut', count: 190, stateId: 'up-west', dcCount: 5, popCount: 24, siteCount: 161 },
          { id: 'upw-agra', name: 'Agra', count: 180, stateId: 'up-west', dcCount: 4, popCount: 22, siteCount: 154 },
          { id: 'upw-aligarh', name: 'Aligarh', count: 130, stateId: 'up-west', dcCount: 3, popCount: 16, siteCount: 111 },
          { id: 'upw-mathura', name: 'Mathura', count: 125, stateId: 'up-west', dcCount: 3, popCount: 15, siteCount: 107 },
          { id: 'upw-moradabad', name: 'Moradabad', count: 120, stateId: 'up-west', dcCount: 3, popCount: 15, siteCount: 102 },
          { id: 'upw-bareilly', name: 'Bareilly', count: 115, stateId: 'up-west', dcCount: 3, popCount: 14, siteCount: 98 },
          { id: 'upw-saharanpur', name: 'Saharanpur', count: 110, stateId: 'up-west', dcCount: 2, popCount: 14, siteCount: 94 },
          { id: 'upw-muzaffarnagar', name: 'Muzaffarnagar', count: 95, stateId: 'up-west', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'upw-firozabad', name: 'Firozabad', count: 90, stateId: 'up-west', dcCount: 2, popCount: 11, siteCount: 77 },
          { id: 'upw-jhansi', name: 'Jhansi', count: 85, stateId: 'up-west', dcCount: 2, popCount: 11, siteCount: 72 },
          { id: 'upw-rampur', name: 'Rampur', count: 75, stateId: 'up-west', dcCount: 1, popCount: 9, siteCount: 65 },
          { id: 'upw-shahjahanpur', name: 'Shahjahanpur', count: 70, stateId: 'up-west', dcCount: 1, popCount: 8, siteCount: 61 },
          { id: 'up-west-budaun', name: 'Budaun', count: 65, stateId: 'up-west', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'up-west-hapur', name: 'Hapur', count: 83, stateId: 'up-west', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'up-west-sambhal', name: 'Sambhal', count: 73, stateId: 'up-west', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'up-west-etawah', name: 'Etawah', count: 90, stateId: 'up-west', dcCount: 2, popCount: 14, siteCount: 60 }
        ]
      },
      {
        id: 'uttarakhand',
        name: 'Uttarakhand',
        cityCount: 15,
        regionId: 'north',
        themeColor: '#0284c7',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'uk-dehradun', name: 'Dehradun', count: 140, stateId: 'uttarakhand', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'uk-haridwar', name: 'Haridwar', count: 90, stateId: 'uttarakhand', dcCount: 2, popCount: 12, siteCount: 76 },
          { id: 'uk-roorkee', name: 'Roorkee', count: 80, stateId: 'uttarakhand', dcCount: 2, popCount: 10, siteCount: 68 },
          { id: 'uk-haldwani', name: 'Haldwani', count: 75, stateId: 'uttarakhand', dcCount: 1, popCount: 10, siteCount: 64 },
          { id: 'uk-rishikesh', name: 'Rishikesh', count: 65, stateId: 'uttarakhand', dcCount: 1, popCount: 8, siteCount: 56 },
          { id: 'uk-nainital', name: 'Nainital', count: 50, stateId: 'uttarakhand', dcCount: 1, popCount: 6, siteCount: 43 },
          { id: 'uttarakhand-rudrapur', name: 'Rudrapur', count: 65, stateId: 'uttarakhand', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'uttarakhand-kashipur', name: 'Kashipur', count: 83, stateId: 'uttarakhand', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'uttarakhand-pithoragarh', name: 'Pithoragarh', count: 73, stateId: 'uttarakhand', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'uttarakhand-almora', name: 'Almora', count: 90, stateId: 'uttarakhand', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'uttarakhand-kotdwar', name: 'Kotdwar', count: 82, stateId: 'uttarakhand', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'uttarakhand-ramnagar', name: 'Ramnagar', count: 73, stateId: 'uttarakhand', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'uttarakhand-manglaur', name: 'Manglaur', count: 90, stateId: 'uttarakhand', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'uttarakhand-mussoorie', name: 'Mussoorie', count: 107, stateId: 'uttarakhand', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'uttarakhand-tehri', name: 'Tehri', count: 73, stateId: 'uttarakhand', dcCount: 1, popCount: 6, siteCount: 85 }
        ]
      },
      {
        id: 'himachal',
        name: 'Himachal Pradesh',
        cityCount: 15,
        regionId: 'north',
        themeColor: '#059669',
        bgColor: '#d1fae5',
        cities: [
          { id: 'hp-shimla', name: 'Shimla', count: 95, stateId: 'himachal', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'hp-dharamshala', name: 'Dharamshala', count: 65, stateId: 'himachal', dcCount: 1, popCount: 8, siteCount: 56 },
          { id: 'hp-mandi', name: 'Mandi', count: 60, stateId: 'himachal', dcCount: 1, popCount: 8, siteCount: 51 },
          { id: 'hp-solan', name: 'Solan', count: 55, stateId: 'himachal', dcCount: 1, popCount: 7, siteCount: 47 },
          { id: 'hp-kullu', name: 'Kullu', count: 50, stateId: 'himachal', dcCount: 1, popCount: 6, siteCount: 43 },
          { id: 'hp-baddi', name: 'Baddi', count: 45, stateId: 'himachal', dcCount: 1, popCount: 6, siteCount: 38 },
          { id: 'hp-manali', name: 'Manali', count: 40, stateId: 'himachal', dcCount: 1, popCount: 5, siteCount: 34 },
          { id: 'himachal-bilaspur', name: 'Bilaspur', count: 65, stateId: 'himachal', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'himachal-hamirpur', name: 'Hamirpur', count: 83, stateId: 'himachal', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'himachal-nahan', name: 'Nahan', count: 73, stateId: 'himachal', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'himachal-una', name: 'Una', count: 90, stateId: 'himachal', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'himachal-chamba', name: 'Chamba', count: 82, stateId: 'himachal', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'himachal-paonta-sahib', name: 'Paonta Sahib', count: 73, stateId: 'himachal', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'himachal-palampur', name: 'Palampur', count: 90, stateId: 'himachal', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'himachal-sundernagar', name: 'Sundernagar', count: 107, stateId: 'himachal', dcCount: 3, popCount: 13, siteCount: 80 }
        ]
      },
      {
        id: 'jk',
        name: 'Jammu & Kashmir',
        cityCount: 15,
        regionId: 'north',
        themeColor: '#6366f1',
        bgColor: '#e0e7ff',
        cities: [
          { id: 'jk-srinagar', name: 'Srinagar', count: 120, stateId: 'jk', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'jk-jammu', name: 'Jammu', count: 115, stateId: 'jk', dcCount: 3, popCount: 15, siteCount: 97 },
          { id: 'jk-anantnag', name: 'Anantnag', count: 85, stateId: 'jk', dcCount: 2, popCount: 11, siteCount: 72 },
          { id: 'jk-baramulla', name: 'Baramulla', count: 75, stateId: 'jk', dcCount: 1, popCount: 10, siteCount: 64 },
          { id: 'jk-udhampur', name: 'Udhampur', count: 70, stateId: 'jk', dcCount: 1, popCount: 9, siteCount: 60 },
          { id: 'jk-kathua', name: 'Kathua', count: 60, stateId: 'jk', dcCount: 1, popCount: 8, siteCount: 51 },
          { id: 'jk-sopore', name: 'Sopore', count: 55, stateId: 'jk', dcCount: 1, popCount: 7, siteCount: 47 },
          { id: 'jk-rajouri', name: 'Rajouri', count: 50, stateId: 'jk', dcCount: 1, popCount: 6, siteCount: 43 },
          { id: 'jk-poonch', name: 'Poonch', count: 65, stateId: 'jk', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'jk-kupwara', name: 'Kupwara', count: 83, stateId: 'jk', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'jk-pulwama', name: 'Pulwama', count: 73, stateId: 'jk', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'jk-samba', name: 'Samba', count: 90, stateId: 'jk', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'jk-budgam', name: 'Budgam', count: 82, stateId: 'jk', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'jk-ganderbal', name: 'Ganderbal', count: 73, stateId: 'jk', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'jk-bandipora', name: 'Bandipora', count: 90, stateId: 'jk', dcCount: 2, popCount: 11, siteCount: 75 }
        ]
      }
    ]
  },
  {
    id: 'west',
    name: 'West Region',
    stateCount: 7,
    cityCount: 109,
    themeColor: '#2563eb',
    bgColor: '#dbeafe',
    iconType: 'west',
    states: [
      {
        id: 'maharashtra',
        name: 'Maharashtra',
        cityCount: 16,
        regionId: 'west',
        themeColor: '#8b5cf6',
        bgColor: '#ede9fe',
        cities: [
          { id: 'mh-mumbai', name: 'Mumbai', count: 420, stateId: 'maharashtra', dcCount: 18, popCount: 54, siteCount: 348 },
          { id: 'mh-pune', name: 'Pune', count: 310, stateId: 'maharashtra', dcCount: 14, popCount: 42, siteCount: 254 },
          { id: 'mh-nagpur', name: 'Nagpur', count: 280, stateId: 'maharashtra', dcCount: 8, popCount: 36, siteCount: 236 },
          { id: 'mh-nashik', name: 'Nashik', count: 220, stateId: 'maharashtra', dcCount: 6, popCount: 28, siteCount: 186 },
          { id: 'mh-thane', name: 'Thane', count: 180, stateId: 'maharashtra', dcCount: 5, popCount: 24, siteCount: 151 },
          { id: 'mh-aurangabad', name: 'Aurangabad', count: 150, stateId: 'maharashtra', dcCount: 4, popCount: 20, siteCount: 126 },
          { id: 'mh-solapur', name: 'Solapur', count: 120, stateId: 'maharashtra', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'mh-kolhapur', name: 'Kolhapur', count: 110, stateId: 'maharashtra', dcCount: 3, popCount: 14, siteCount: 93 },
          { id: 'mh-amravati', name: 'Amravati', count: 95, stateId: 'maharashtra', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'mh-navi-mumbai', name: 'Navi Mumbai', count: 160, stateId: 'maharashtra', dcCount: 6, popCount: 22, siteCount: 132 },
          { id: 'maharashtra-akola', name: 'Akola', count: 65, stateId: 'maharashtra', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'maharashtra-latur', name: 'Latur', count: 83, stateId: 'maharashtra', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'maharashtra-dhule', name: 'Dhule', count: 73, stateId: 'maharashtra', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'maharashtra-ahmednagar', name: 'Ahmednagar', count: 90, stateId: 'maharashtra', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'maharashtra-chandrapur', name: 'Chandrapur', count: 82, stateId: 'maharashtra', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'maharashtra-parbhani', name: 'Parbhani', count: 73, stateId: 'maharashtra', dcCount: 1, popCount: 9, siteCount: 70 }
        ]
      },
      {
        id: 'gujarat',
        name: 'Gujarat',
        cityCount: 16,
        regionId: 'west',
        themeColor: '#0ea5e9',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'gj-ahmedabad', name: 'Ahmedabad', count: 290, stateId: 'gujarat', dcCount: 10, popCount: 38, siteCount: 242 },
          { id: 'gj-surat', name: 'Surat', count: 240, stateId: 'gujarat', dcCount: 8, popCount: 32, siteCount: 200 },
          { id: 'gj-vadodara', name: 'Vadodara', count: 190, stateId: 'gujarat', dcCount: 6, popCount: 26, siteCount: 158 },
          { id: 'gj-rajkot', name: 'Rajkot', count: 150, stateId: 'gujarat', dcCount: 4, popCount: 20, siteCount: 126 },
          { id: 'gj-gandhinagar', name: 'Gandhinagar', count: 130, stateId: 'gujarat', dcCount: 5, popCount: 18, siteCount: 107 },
          { id: 'gujarat-bhavnagar', name: 'Bhavnagar', count: 65, stateId: 'gujarat', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'gujarat-jamnagar', name: 'Jamnagar', count: 83, stateId: 'gujarat', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'gujarat-junagadh', name: 'Junagadh', count: 73, stateId: 'gujarat', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'gujarat-anand', name: 'Anand', count: 90, stateId: 'gujarat', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'gujarat-navsari', name: 'Navsari', count: 82, stateId: 'gujarat', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'gujarat-morbi', name: 'Morbi', count: 73, stateId: 'gujarat', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'gujarat-nadiad', name: 'Nadiad', count: 90, stateId: 'gujarat', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'gujarat-surendranagar', name: 'Surendranagar', count: 107, stateId: 'gujarat', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'gujarat-bharuch', name: 'Bharuch', count: 73, stateId: 'gujarat', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'gujarat-mehsana', name: 'Mehsana', count: 65, stateId: 'gujarat', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'gujarat-bhuj', name: 'Bhuj', count: 82, stateId: 'gujarat', dcCount: 3, popCount: 10, siteCount: 49 }
        ]
      },
      {
        id: 'rajasthan',
        name: 'Rajasthan',
        cityCount: 16,
        regionId: 'west',
        themeColor: '#f97316',
        bgColor: '#ffedd5',
        cities: [
          { id: 'rj-jaipur', name: 'Jaipur', count: 230, stateId: 'rajasthan', dcCount: 8, popCount: 30, siteCount: 192 },
          { id: 'rj-jodhpur', name: 'Jodhpur', count: 170, stateId: 'rajasthan', dcCount: 5, popCount: 22, siteCount: 143 },
          { id: 'rj-udaipur', name: 'Udaipur', count: 140, stateId: 'rajasthan', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'rj-kota', name: 'Kota', count: 120, stateId: 'rajasthan', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'rajasthan-bikaner', name: 'Bikaner', count: 65, stateId: 'rajasthan', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'rajasthan-ajmer', name: 'Ajmer', count: 83, stateId: 'rajasthan', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'rajasthan-bhilwara', name: 'Bhilwara', count: 73, stateId: 'rajasthan', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'rajasthan-alwar', name: 'Alwar', count: 90, stateId: 'rajasthan', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'rajasthan-bharatpur', name: 'Bharatpur', count: 82, stateId: 'rajasthan', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'rajasthan-sikar', name: 'Sikar', count: 73, stateId: 'rajasthan', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'rajasthan-pali', name: 'Pali', count: 90, stateId: 'rajasthan', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'rajasthan-sri-ganganagar', name: 'Sri Ganganagar', count: 107, stateId: 'rajasthan', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'rajasthan-beawar', name: 'Beawar', count: 73, stateId: 'rajasthan', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'rajasthan-hanumangarh', name: 'Hanumangarh', count: 65, stateId: 'rajasthan', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'rajasthan-dholpur', name: 'Dholpur', count: 82, stateId: 'rajasthan', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'rajasthan-tonk', name: 'Tonk', count: 72, stateId: 'rajasthan', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'goa',
        name: 'Goa',
        cityCount: 15,
        regionId: 'west',
        themeColor: '#f43f5e',
        bgColor: '#ffe4e6',
        cities: [
          { id: 'ga-panaji', name: 'Panaji', count: 85, stateId: 'goa', dcCount: 2, popCount: 12, siteCount: 71 },
          { id: 'ga-margao', name: 'Margao', count: 70, stateId: 'goa', dcCount: 2, popCount: 10, siteCount: 58 },
          { id: 'ga-vasco', name: 'Vasco da Gama', count: 60, stateId: 'goa', dcCount: 1, popCount: 8, siteCount: 51 },
          { id: 'goa-mapusa', name: 'Mapusa', count: 65, stateId: 'goa', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'goa-ponda', name: 'Ponda', count: 83, stateId: 'goa', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'goa-bicholim', name: 'Bicholim', count: 73, stateId: 'goa', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'goa-curchorem', name: 'Curchorem', count: 90, stateId: 'goa', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'goa-cuncolim', name: 'Cuncolim', count: 82, stateId: 'goa', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'goa-valpoi', name: 'Valpoi', count: 73, stateId: 'goa', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'goa-pernem', name: 'Pernem', count: 90, stateId: 'goa', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'goa-canacona', name: 'Canacona', count: 107, stateId: 'goa', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'goa-quepem', name: 'Quepem', count: 73, stateId: 'goa', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'goa-sanguem', name: 'Sanguem', count: 65, stateId: 'goa', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'goa-porvorim', name: 'Porvorim', count: 82, stateId: 'goa', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'goa-calangute', name: 'Calangute', count: 72, stateId: 'goa', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'mp',
        name: 'Madhya Pradesh',
        cityCount: 16,
        regionId: 'west',
        themeColor: '#0284c7',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'mp-bhopal', name: 'Bhopal', count: 190, stateId: 'mp', dcCount: 6, popCount: 26, siteCount: 158 },
          { id: 'mp-indore', name: 'Indore', count: 210, stateId: 'mp', dcCount: 7, popCount: 28, siteCount: 175 },
          { id: 'mp-jabalpur', name: 'Jabalpur', count: 130, stateId: 'mp', dcCount: 3, popCount: 18, siteCount: 109 },
          { id: 'mp-gwalior', name: 'Gwalior', count: 120, stateId: 'mp', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'mp-ujjain', name: 'Ujjain', count: 65, stateId: 'mp', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'mp-sagar', name: 'Sagar', count: 83, stateId: 'mp', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'mp-dewas', name: 'Dewas', count: 73, stateId: 'mp', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'mp-satna', name: 'Satna', count: 90, stateId: 'mp', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'mp-ratlam', name: 'Ratlam', count: 82, stateId: 'mp', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'mp-rewa', name: 'Rewa', count: 73, stateId: 'mp', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'mp-katni', name: 'Katni', count: 90, stateId: 'mp', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'mp-singrauli', name: 'Singrauli', count: 107, stateId: 'mp', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'mp-burhanpur', name: 'Burhanpur', count: 73, stateId: 'mp', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'mp-khandwa', name: 'Khandwa', count: 65, stateId: 'mp', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'mp-morena', name: 'Morena', count: 82, stateId: 'mp', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'mp-bhind', name: 'Bhind', count: 72, stateId: 'mp', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'chhattisgarh',
        name: 'Chhattisgarh',
        cityCount: 15,
        regionId: 'west',
        themeColor: '#059669',
        bgColor: '#d1fae5',
        cities: [
          { id: 'cg-raipur', name: 'Raipur', count: 140, stateId: 'chhattisgarh', dcCount: 4, popCount: 20, siteCount: 116 },
          { id: 'cg-bhilai', name: 'Bhilai', count: 110, stateId: 'chhattisgarh', dcCount: 3, popCount: 15, siteCount: 92 },
          { id: 'cg-bilaspur', name: 'Bilaspur', count: 90, stateId: 'chhattisgarh', dcCount: 2, popCount: 12, siteCount: 76 },
          { id: 'chhattisgarh-korba', name: 'Korba', count: 65, stateId: 'chhattisgarh', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'chhattisgarh-rajnandgaon', name: 'Rajnandgaon', count: 83, stateId: 'chhattisgarh', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'chhattisgarh-jagdalpur', name: 'Jagdalpur', count: 73, stateId: 'chhattisgarh', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'chhattisgarh-raigarh', name: 'Raigarh', count: 90, stateId: 'chhattisgarh', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'chhattisgarh-ambikapur', name: 'Ambikapur', count: 82, stateId: 'chhattisgarh', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'chhattisgarh-durg', name: 'Durg', count: 73, stateId: 'chhattisgarh', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'chhattisgarh-dhamtari', name: 'Dhamtari', count: 90, stateId: 'chhattisgarh', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'chhattisgarh-mahasamund', name: 'Mahasamund', count: 107, stateId: 'chhattisgarh', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'chhattisgarh-chirmiri', name: 'Chirmiri', count: 73, stateId: 'chhattisgarh', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'chhattisgarh-bhatapara', name: 'Bhatapara', count: 65, stateId: 'chhattisgarh', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'chhattisgarh-kanker', name: 'Kanker', count: 82, stateId: 'chhattisgarh', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'chhattisgarh-kawardha', name: 'Kawardha', count: 72, stateId: 'chhattisgarh', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'dnh',
        name: 'Dadra & Nagar Haveli',
        cityCount: 15,
        regionId: 'west',
        themeColor: '#16a34a',
        bgColor: '#dcfce7',
        cities: [
          { id: 'dnh-silvassa', name: 'Silvassa', count: 55, stateId: 'dnh', dcCount: 1, popCount: 8, siteCount: 46 },
          { id: 'dnh-daman', name: 'Daman', count: 48, stateId: 'dnh', dcCount: 1, popCount: 7, siteCount: 40 },
          { id: 'dnh-diu', name: 'Diu', count: 32, stateId: 'dnh', dcCount: 1, popCount: 5, siteCount: 26 },
          { id: 'dnh-dadra', name: 'Dadra', count: 65, stateId: 'dnh', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'dnh-nani-daman', name: 'Nani Daman', count: 83, stateId: 'dnh', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'dnh-moti-daman', name: 'Moti Daman', count: 73, stateId: 'dnh', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'dnh-amli', name: 'Amli', count: 90, stateId: 'dnh', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'dnh-naroli', name: 'Naroli', count: 82, stateId: 'dnh', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'dnh-kachigam', name: 'Kachigam', count: 73, stateId: 'dnh', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'dnh-dunetha', name: 'Dunetha', count: 90, stateId: 'dnh', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'dnh-kilvani', name: 'Kilvani', count: 107, stateId: 'dnh', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'dnh-masat', name: 'Masat', count: 73, stateId: 'dnh', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'dnh-samarvarni', name: 'Samarvarni', count: 65, stateId: 'dnh', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'dnh-rakholi', name: 'Rakholi', count: 82, stateId: 'dnh', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'dnh-vapi-border-zone', name: 'Vapi Border Zone', count: 72, stateId: 'dnh', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      }
    ]
  },
  {
    id: 'east',
    name: 'East Region',
    stateCount: 7,
    cityCount: 107,
    themeColor: '#16a34a',
    bgColor: '#dcfce7',
    iconType: 'east',
    states: [
      {
        id: 'west-bengal',
        name: 'West Bengal',
        cityCount: 16,
        regionId: 'east',
        themeColor: '#16a34a',
        bgColor: '#dcfce7',
        cities: [
          { id: 'wb-kolkata', name: 'Kolkata', count: 350, stateId: 'west-bengal', dcCount: 14, popCount: 46, siteCount: 290 },
          { id: 'wb-howrah', name: 'Howrah', count: 180, stateId: 'west-bengal', dcCount: 5, popCount: 24, siteCount: 151 },
          { id: 'wb-siliguri', name: 'Siliguri', count: 140, stateId: 'west-bengal', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'wb-durgapur', name: 'Durgapur', count: 110, stateId: 'west-bengal', dcCount: 3, popCount: 14, siteCount: 93 },
          { id: 'west-bengal-asansol', name: 'Asansol', count: 65, stateId: 'west-bengal', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'west-bengal-bardhaman', name: 'Bardhaman', count: 83, stateId: 'west-bengal', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'west-bengal-malda', name: 'Malda', count: 73, stateId: 'west-bengal', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'west-bengal-baharampur', name: 'Baharampur', count: 90, stateId: 'west-bengal', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'west-bengal-habra', name: 'Habra', count: 82, stateId: 'west-bengal', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'west-bengal-kharagpur', name: 'Kharagpur', count: 73, stateId: 'west-bengal', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'west-bengal-shantipur', name: 'Shantipur', count: 90, stateId: 'west-bengal', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'west-bengal-dankuni', name: 'Dankuni', count: 107, stateId: 'west-bengal', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'west-bengal-dhulian', name: 'Dhulian', count: 73, stateId: 'west-bengal', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'west-bengal-ranaghat', name: 'Ranaghat', count: 65, stateId: 'west-bengal', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'west-bengal-haldia', name: 'Haldia', count: 82, stateId: 'west-bengal', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'west-bengal-darjeeling', name: 'Darjeeling', count: 72, stateId: 'west-bengal', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'bihar',
        name: 'Bihar',
        cityCount: 16,
        regionId: 'east',
        themeColor: '#0ea5e9',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'br-patna', name: 'Patna', count: 220, stateId: 'bihar', dcCount: 7, popCount: 30, siteCount: 183 },
          { id: 'br-gaya', name: 'Gaya', count: 120, stateId: 'bihar', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'br-muzaffarpur', name: 'Muzaffarpur', count: 110, stateId: 'bihar', dcCount: 3, popCount: 14, siteCount: 93 },
          { id: 'bihar-purnia', name: 'Purnia', count: 65, stateId: 'bihar', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'bihar-darbhanga', name: 'Darbhanga', count: 83, stateId: 'bihar', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'bihar-bihar-sharif', name: 'Bihar Sharif', count: 73, stateId: 'bihar', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'bihar-arrah', name: 'Arrah', count: 90, stateId: 'bihar', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'bihar-begusarai', name: 'Begusarai', count: 82, stateId: 'bihar', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'bihar-katihar', name: 'Katihar', count: 73, stateId: 'bihar', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'bihar-munger', name: 'Munger', count: 90, stateId: 'bihar', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'bihar-chhapra', name: 'Chhapra', count: 107, stateId: 'bihar', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'bihar-danapur', name: 'Danapur', count: 73, stateId: 'bihar', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'bihar-bettiah', name: 'Bettiah', count: 65, stateId: 'bihar', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'bihar-saharsa', name: 'Saharsa', count: 82, stateId: 'bihar', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'bihar-sasaram', name: 'Sasaram', count: 72, stateId: 'bihar', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'bihar-siwan', name: 'Siwan', count: 90, stateId: 'bihar', dcCount: 2, popCount: 14, siteCount: 59 }
        ]
      },
      {
        id: 'odisha',
        name: 'Odisha',
        cityCount: 15,
        regionId: 'east',
        themeColor: '#f59e0b',
        bgColor: '#fef3c7',
        cities: [
          { id: 'od-bhubaneswar', name: 'Bhubaneswar', count: 210, stateId: 'odisha', dcCount: 7, popCount: 28, siteCount: 175 },
          { id: 'od-cuttack', name: 'Cuttack', count: 130, stateId: 'odisha', dcCount: 4, popCount: 18, siteCount: 108 },
          { id: 'od-rourkela', name: 'Rourkela', count: 95, stateId: 'odisha', dcCount: 2, popCount: 12, siteCount: 81 },
          { id: 'odisha-berhampur', name: 'Berhampur', count: 65, stateId: 'odisha', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'odisha-sambalpur', name: 'Sambalpur', count: 83, stateId: 'odisha', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'odisha-puri', name: 'Puri', count: 73, stateId: 'odisha', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'odisha-balasore', name: 'Balasore', count: 90, stateId: 'odisha', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'odisha-bhadrak', name: 'Bhadrak', count: 82, stateId: 'odisha', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'odisha-baripada', name: 'Baripada', count: 73, stateId: 'odisha', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'odisha-jharsuguda', name: 'Jharsuguda', count: 90, stateId: 'odisha', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'odisha-jeypore', name: 'Jeypore', count: 107, stateId: 'odisha', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'odisha-bargarh', name: 'Bargarh', count: 73, stateId: 'odisha', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'odisha-rayagada', name: 'Rayagada', count: 65, stateId: 'odisha', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'odisha-bolangir', name: 'Bolangir', count: 82, stateId: 'odisha', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'odisha-angul', name: 'Angul', count: 72, stateId: 'odisha', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'jharkhand',
        name: 'Jharkhand',
        cityCount: 15,
        regionId: 'east',
        themeColor: '#8b5cf6',
        bgColor: '#ede9fe',
        cities: [
          { id: 'jh-ranchi', name: 'Ranchi', count: 170, stateId: 'jharkhand', dcCount: 5, popCount: 22, siteCount: 143 },
          { id: 'jh-jamshedpur', name: 'Jamshedpur', count: 140, stateId: 'jharkhand', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'jharkhand-bokaro-steel-city', name: 'Bokaro Steel City', count: 65, stateId: 'jharkhand', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'jharkhand-deoghar', name: 'Deoghar', count: 83, stateId: 'jharkhand', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'jharkhand-phusro', name: 'Phusro', count: 73, stateId: 'jharkhand', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'jharkhand-hazaribagh', name: 'Hazaribagh', count: 90, stateId: 'jharkhand', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'jharkhand-giridih', name: 'Giridih', count: 82, stateId: 'jharkhand', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'jharkhand-ramgarh', name: 'Ramgarh', count: 73, stateId: 'jharkhand', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'jharkhand-medininagar', name: 'Medininagar', count: 90, stateId: 'jharkhand', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'jharkhand-chirkunda', name: 'Chirkunda', count: 107, stateId: 'jharkhand', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'jharkhand-chaibasa', name: 'Chaibasa', count: 73, stateId: 'jharkhand', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'jharkhand-gumla', name: 'Gumla', count: 65, stateId: 'jharkhand', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'jharkhand-dumka', name: 'Dumka', count: 82, stateId: 'jharkhand', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'jharkhand-godda', name: 'Godda', count: 72, stateId: 'jharkhand', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'jharkhand-dhanbad', name: 'Dhanbad', count: 90, stateId: 'jharkhand', dcCount: 2, popCount: 14, siteCount: 59 }
        ]
      },
      {
        id: 'assam',
        name: 'Assam',
        cityCount: 15,
        regionId: 'east',
        themeColor: '#059669',
        bgColor: '#d1fae5',
        cities: [
          { id: 'as-guwahati', name: 'Guwahati', count: 190, stateId: 'assam', dcCount: 6, popCount: 26, siteCount: 158 },
          { id: 'as-silchar', name: 'Silchar', count: 85, stateId: 'assam', dcCount: 2, popCount: 10, siteCount: 73 },
          { id: 'assam-dibrugarh', name: 'Dibrugarh', count: 65, stateId: 'assam', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'assam-jorhat', name: 'Jorhat', count: 83, stateId: 'assam', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'assam-nagaon', name: 'Nagaon', count: 73, stateId: 'assam', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'assam-tinsukia', name: 'Tinsukia', count: 90, stateId: 'assam', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'assam-tezpur', name: 'Tezpur', count: 82, stateId: 'assam', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'assam-bongaigaon', name: 'Bongaigaon', count: 73, stateId: 'assam', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'assam-dhubri', name: 'Dhubri', count: 90, stateId: 'assam', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'assam-diphu', name: 'Diphu', count: 107, stateId: 'assam', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'assam-north-lakhimpur', name: 'North Lakhimpur', count: 73, stateId: 'assam', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'assam-karimganj', name: 'Karimganj', count: 65, stateId: 'assam', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'assam-sivasagar', name: 'Sivasagar', count: 82, stateId: 'assam', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'assam-goalpara', name: 'Goalpara', count: 72, stateId: 'assam', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'assam-barpeta', name: 'Barpeta', count: 90, stateId: 'assam', dcCount: 2, popCount: 14, siteCount: 59 }
        ]
      },
      {
        id: 'sikkim',
        name: 'Sikkim',
        cityCount: 15,
        regionId: 'east',
        themeColor: '#10b981',
        bgColor: '#d1fae5',
        cities: [
          { id: 'sk-gangtok', name: 'Gangtok', count: 85, stateId: 'sikkim', dcCount: 2, popCount: 12, siteCount: 71 },
          { id: 'sk-namchi', name: 'Namchi', count: 60, stateId: 'sikkim', dcCount: 1, popCount: 8, siteCount: 51 },
          { id: 'sk-geyzing', name: 'Geyzing', count: 45, stateId: 'sikkim', dcCount: 1, popCount: 6, siteCount: 38 },
          { id: 'sk-mangan', name: 'Mangan', count: 35, stateId: 'sikkim', dcCount: 1, popCount: 4, siteCount: 30 },
          { id: 'sikkim-rangpo', name: 'Rangpo', count: 65, stateId: 'sikkim', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'sikkim-jorethang', name: 'Jorethang', count: 83, stateId: 'sikkim', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'sikkim-singtam', name: 'Singtam', count: 73, stateId: 'sikkim', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'sikkim-ravangla', name: 'Ravangla', count: 90, stateId: 'sikkim', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'sikkim-pakyong', name: 'Pakyong', count: 82, stateId: 'sikkim', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'sikkim-soreng', name: 'Soreng', count: 73, stateId: 'sikkim', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'sikkim-yuksom', name: 'Yuksom', count: 90, stateId: 'sikkim', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'sikkim-lachung', name: 'Lachung', count: 107, stateId: 'sikkim', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'sikkim-chungthang', name: 'Chungthang', count: 73, stateId: 'sikkim', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'sikkim-rhenock', name: 'Rhenock', count: 65, stateId: 'sikkim', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'sikkim-nayabazar', name: 'Nayabazar', count: 82, stateId: 'sikkim', dcCount: 3, popCount: 10, siteCount: 49 }
        ]
      },
      {
        id: 'northeast',
        name: 'North East (Other)',
        cityCount: 15,
        regionId: 'east',
        themeColor: '#6366f1',
        bgColor: '#e0e7ff',
        cities: [
          { id: 'ne-shillong', name: 'Shillong', count: 75, stateId: 'northeast', dcCount: 2, popCount: 10, siteCount: 63 },
          { id: 'ne-imphal', name: 'Imphal', count: 65, stateId: 'northeast', dcCount: 1, popCount: 8, siteCount: 56 },
          { id: 'northeast-aizawl', name: 'Aizawl', count: 65, stateId: 'northeast', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'northeast-kohima', name: 'Kohima', count: 83, stateId: 'northeast', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'northeast-agartala', name: 'Agartala', count: 73, stateId: 'northeast', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'northeast-itanagar', name: 'Itanagar', count: 90, stateId: 'northeast', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'northeast-dimapur', name: 'Dimapur', count: 82, stateId: 'northeast', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'northeast-tura', name: 'Tura', count: 73, stateId: 'northeast', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'northeast-lunglei', name: 'Lunglei', count: 90, stateId: 'northeast', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'northeast-churachandpur', name: 'Churachandpur', count: 107, stateId: 'northeast', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'northeast-mokokchung', name: 'Mokokchung', count: 73, stateId: 'northeast', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'northeast-dharmanagar', name: 'Dharmanagar', count: 65, stateId: 'northeast', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'northeast-pasighat', name: 'Pasighat', count: 82, stateId: 'northeast', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'northeast-naharlagun', name: 'Naharlagun', count: 72, stateId: 'northeast', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'northeast-along', name: 'Along', count: 90, stateId: 'northeast', dcCount: 2, popCount: 14, siteCount: 59 }
        ]
      }
    ]
  },
  {
    id: 'south',
    name: 'South Region',
    stateCount: 7,
    cityCount: 106,
    themeColor: '#f97316',
    bgColor: '#ffedd5',
    iconType: 'south',
    states: [
      {
        id: 'karnataka',
        name: 'Karnataka',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#3b82f6',
        bgColor: '#eff6ff',
        cities: [
          { id: 'ka-bengaluru', name: 'Bengaluru', count: 410, stateId: 'karnataka', dcCount: 16, popCount: 52, siteCount: 342 },
          { id: 'ka-mysuru', name: 'Mysuru', count: 160, stateId: 'karnataka', dcCount: 5, popCount: 22, siteCount: 133 },
          { id: 'ka-mangalore', name: 'Mangaluru', count: 130, stateId: 'karnataka', dcCount: 4, popCount: 18, siteCount: 108 },
          { id: 'ka-hubballi', name: 'Hubballi', count: 110, stateId: 'karnataka', dcCount: 3, popCount: 15, siteCount: 92 },
          { id: 'karnataka-belagavi', name: 'Belagavi', count: 65, stateId: 'karnataka', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'karnataka-kalaburagi', name: 'Kalaburagi', count: 83, stateId: 'karnataka', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'karnataka-davanagere', name: 'Davanagere', count: 73, stateId: 'karnataka', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'karnataka-ballari', name: 'Ballari', count: 90, stateId: 'karnataka', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'karnataka-vijayapura', name: 'Vijayapura', count: 82, stateId: 'karnataka', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'karnataka-shivamogga', name: 'Shivamogga', count: 73, stateId: 'karnataka', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'karnataka-tumakuru', name: 'Tumakuru', count: 90, stateId: 'karnataka', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'karnataka-raichur', name: 'Raichur', count: 107, stateId: 'karnataka', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'karnataka-bidar', name: 'Bidar', count: 73, stateId: 'karnataka', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'karnataka-hosapete', name: 'Hosapete', count: 65, stateId: 'karnataka', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'karnataka-gadag', name: 'Gadag', count: 82, stateId: 'karnataka', dcCount: 3, popCount: 10, siteCount: 49 }
        ]
      },
      {
        id: 'tamilnadu',
        name: 'Tamil Nadu',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#8b5cf6',
        bgColor: '#ede9fe',
        cities: [
          { id: 'tn-chennai', name: 'Chennai', count: 380, stateId: 'tamilnadu', dcCount: 15, popCount: 48, siteCount: 317 },
          { id: 'tn-coimbatore', name: 'Coimbatore', count: 210, stateId: 'tamilnadu', dcCount: 7, popCount: 28, siteCount: 175 },
          { id: 'tn-madurai', name: 'Madurai', count: 140, stateId: 'tamilnadu', dcCount: 4, popCount: 18, siteCount: 118 },
          { id: 'tn-salem', name: 'Salem', count: 110, stateId: 'tamilnadu', dcCount: 3, popCount: 14, siteCount: 93 },
          { id: 'tamilnadu-tiruchirappalli', name: 'Tiruchirappalli', count: 65, stateId: 'tamilnadu', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'tamilnadu-tiruppur', name: 'Tiruppur', count: 83, stateId: 'tamilnadu', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'tamilnadu-erode', name: 'Erode', count: 73, stateId: 'tamilnadu', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'tamilnadu-tirunelveli', name: 'Tirunelveli', count: 90, stateId: 'tamilnadu', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'tamilnadu-vellore', name: 'Vellore', count: 82, stateId: 'tamilnadu', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'tamilnadu-thoothukudi', name: 'Thoothukudi', count: 73, stateId: 'tamilnadu', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'tamilnadu-dindigul', name: 'Dindigul', count: 90, stateId: 'tamilnadu', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'tamilnadu-thanjavur', name: 'Thanjavur', count: 107, stateId: 'tamilnadu', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'tamilnadu-karur', name: 'Karur', count: 73, stateId: 'tamilnadu', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'tamilnadu-sivakasi', name: 'Sivakasi', count: 65, stateId: 'tamilnadu', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'tamilnadu-ooty', name: 'Ooty', count: 82, stateId: 'tamilnadu', dcCount: 3, popCount: 10, siteCount: 49 }
        ]
      },
      {
        id: 'telangana',
        name: 'Telangana',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#0ea5e9',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'tg-hyderabad', name: 'Hyderabad', count: 360, stateId: 'telangana', dcCount: 15, popCount: 46, siteCount: 299 },
          { id: 'tg-warangal', name: 'Warangal', count: 120, stateId: 'telangana', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'tg-nizamabad', name: 'Nizamabad', count: 85, stateId: 'telangana', dcCount: 2, popCount: 10, siteCount: 73 },
          { id: 'telangana-khammam', name: 'Khammam', count: 65, stateId: 'telangana', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'telangana-karimnagar', name: 'Karimnagar', count: 83, stateId: 'telangana', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'telangana-ramagundam', name: 'Ramagundam', count: 73, stateId: 'telangana', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'telangana-mahbubnagar', name: 'Mahbubnagar', count: 90, stateId: 'telangana', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'telangana-nalgonda', name: 'Nalgonda', count: 82, stateId: 'telangana', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'telangana-adilabad', name: 'Adilabad', count: 73, stateId: 'telangana', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'telangana-suryapet', name: 'Suryapet', count: 90, stateId: 'telangana', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'telangana-miryalaguda', name: 'Miryalaguda', count: 107, stateId: 'telangana', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'telangana-siddipet', name: 'Siddipet', count: 73, stateId: 'telangana', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'telangana-jagtial', name: 'Jagtial', count: 65, stateId: 'telangana', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'telangana-nirmal', name: 'Nirmal', count: 82, stateId: 'telangana', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'telangana-kamareddy', name: 'Kamareddy', count: 72, stateId: 'telangana', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'ap',
        name: 'Andhra Pradesh',
        cityCount: 16,
        regionId: 'south',
        themeColor: '#f97316',
        bgColor: '#ffedd5',
        cities: [
          { id: 'ap-visakhapatnam', name: 'Visakhapatnam', count: 220, stateId: 'ap', dcCount: 7, popCount: 30, siteCount: 183 },
          { id: 'ap-vijayawada', name: 'Vijayawada', count: 190, stateId: 'ap', dcCount: 6, popCount: 26, siteCount: 158 },
          { id: 'ap-guntur', name: 'Guntur', count: 120, stateId: 'ap', dcCount: 3, popCount: 16, siteCount: 101 },
          { id: 'ap-nellore', name: 'Nellore', count: 65, stateId: 'ap', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'ap-kurnool', name: 'Kurnool', count: 83, stateId: 'ap', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'ap-kakinada', name: 'Kakinada', count: 73, stateId: 'ap', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'ap-rajamahendravaram', name: 'Rajamahendravaram', count: 90, stateId: 'ap', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'ap-tirupati', name: 'Tirupati', count: 82, stateId: 'ap', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'ap-kadapa', name: 'Kadapa', count: 73, stateId: 'ap', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'ap-anantapur', name: 'Anantapur', count: 90, stateId: 'ap', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'ap-vizianagaram', name: 'Vizianagaram', count: 107, stateId: 'ap', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'ap-eluru', name: 'Eluru', count: 73, stateId: 'ap', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'ap-ongole', name: 'Ongole', count: 65, stateId: 'ap', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'ap-nandyal', name: 'Nandyal', count: 82, stateId: 'ap', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'ap-machilipatnam', name: 'Machilipatnam', count: 72, stateId: 'ap', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'ap-srikakulam', name: 'Srikakulam', count: 90, stateId: 'ap', dcCount: 2, popCount: 14, siteCount: 59 }
        ]
      },
      {
        id: 'kerala',
        name: 'Kerala',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#059669',
        bgColor: '#d1fae5',
        cities: [
          { id: 'kl-kochi', name: 'Kochi', count: 240, stateId: 'kerala', dcCount: 8, popCount: 32, siteCount: 200 },
          { id: 'kl-thiruvananthapuram', name: 'Thiruvananthapuram', count: 190, stateId: 'kerala', dcCount: 6, popCount: 26, siteCount: 158 },
          { id: 'kl-kozhikode', name: 'Kozhikode', count: 130, stateId: 'kerala', dcCount: 4, popCount: 18, siteCount: 108 },
          { id: 'kerala-kollam', name: 'Kollam', count: 65, stateId: 'kerala', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'kerala-thrissur', name: 'Thrissur', count: 83, stateId: 'kerala', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'kerala-kannur', name: 'Kannur', count: 73, stateId: 'kerala', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'kerala-alappuzha', name: 'Alappuzha', count: 90, stateId: 'kerala', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'kerala-kottayam', name: 'Kottayam', count: 82, stateId: 'kerala', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'kerala-palakkad', name: 'Palakkad', count: 73, stateId: 'kerala', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'kerala-manjeri', name: 'Manjeri', count: 90, stateId: 'kerala', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'kerala-thalassery', name: 'Thalassery', count: 107, stateId: 'kerala', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'kerala-ponnani', name: 'Ponnani', count: 73, stateId: 'kerala', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'kerala-vatakara', name: 'Vatakara', count: 65, stateId: 'kerala', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'kerala-kanhangad', name: 'Kanhangad', count: 82, stateId: 'kerala', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'kerala-payyanur', name: 'Payyanur', count: 72, stateId: 'kerala', dcCount: 1, popCount: 12, siteCount: 54 }
        ]
      },
      {
        id: 'puducherry',
        name: 'Puducherry',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#f43f5e',
        bgColor: '#ffe4e6',
        cities: [
          { id: 'py-pondicherry', name: 'Puducherry', count: 70, stateId: 'puducherry', dcCount: 2, popCount: 10, siteCount: 58 },
          { id: 'puducherry-karaikal', name: 'Karaikal', count: 65, stateId: 'puducherry', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'puducherry-mahe', name: 'Mahe', count: 83, stateId: 'puducherry', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'puducherry-yanam', name: 'Yanam', count: 73, stateId: 'puducherry', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'puducherry-ozhukarai', name: 'Ozhukarai', count: 90, stateId: 'puducherry', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'puducherry-villianur', name: 'Villianur', count: 82, stateId: 'puducherry', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'puducherry-ariyankuppam', name: 'Ariyankuppam', count: 73, stateId: 'puducherry', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'puducherry-bahour', name: 'Bahour', count: 90, stateId: 'puducherry', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'puducherry-mannadipet', name: 'Mannadipet', count: 107, stateId: 'puducherry', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'puducherry-nettapakkam', name: 'Nettapakkam', count: 73, stateId: 'puducherry', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'puducherry-kottucherry', name: 'Kottucherry', count: 65, stateId: 'puducherry', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'puducherry-thirunallar', name: 'Thirunallar', count: 82, stateId: 'puducherry', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'puducherry-neravy', name: 'Neravy', count: 72, stateId: 'puducherry', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'puducherry-kirumampakkam', name: 'Kirumampakkam', count: 90, stateId: 'puducherry', dcCount: 2, popCount: 14, siteCount: 59 },
          { id: 'puducherry-lawspet', name: 'Lawspet', count: 82, stateId: 'puducherry', dcCount: 3, popCount: 7, siteCount: 64 }
        ]
      },
      {
        id: 'andaman',
        name: 'Andaman & Nicobar',
        cityCount: 15,
        regionId: 'south',
        themeColor: '#0284c7',
        bgColor: '#e0f2fe',
        cities: [
          { id: 'an-portblair', name: 'Port Blair', count: 40, stateId: 'andaman', dcCount: 1, popCount: 6, siteCount: 33 },
          { id: 'andaman-diglipur', name: 'Diglipur', count: 65, stateId: 'andaman', dcCount: 2, popCount: 8, siteCount: 45 },
          { id: 'andaman-mayabunder', name: 'Mayabunder', count: 83, stateId: 'andaman', dcCount: 3, popCount: 10, siteCount: 50 },
          { id: 'andaman-rangat', name: 'Rangat', count: 73, stateId: 'andaman', dcCount: 1, popCount: 12, siteCount: 55 },
          { id: 'andaman-havelock', name: 'Havelock (Swaraj Dweep)', count: 90, stateId: 'andaman', dcCount: 2, popCount: 14, siteCount: 60 },
          { id: 'andaman-neil-island', name: 'Neil Island (Shaheed Dweep)', count: 82, stateId: 'andaman', dcCount: 3, popCount: 7, siteCount: 65 },
          { id: 'andaman-car-nicobar', name: 'Car Nicobar', count: 73, stateId: 'andaman', dcCount: 1, popCount: 9, siteCount: 70 },
          { id: 'andaman-campbell-bay', name: 'Campbell Bay', count: 90, stateId: 'andaman', dcCount: 2, popCount: 11, siteCount: 75 },
          { id: 'andaman-little-andaman', name: 'Little Andaman', count: 107, stateId: 'andaman', dcCount: 3, popCount: 13, siteCount: 80 },
          { id: 'andaman-baratang', name: 'Baratang', count: 73, stateId: 'andaman', dcCount: 1, popCount: 6, siteCount: 85 },
          { id: 'andaman-wandoor', name: 'Wandoor', count: 65, stateId: 'andaman', dcCount: 2, popCount: 8, siteCount: 44 },
          { id: 'andaman-garacharma', name: 'Garacharma', count: 82, stateId: 'andaman', dcCount: 3, popCount: 10, siteCount: 49 },
          { id: 'andaman-prothrapur', name: 'Prothrapur', count: 72, stateId: 'andaman', dcCount: 1, popCount: 12, siteCount: 54 },
          { id: 'andaman-bambooflat', name: 'Bambooflat', count: 90, stateId: 'andaman', dcCount: 2, popCount: 14, siteCount: 59 },
          { id: 'andaman-ferrargunj', name: 'Ferrargunj', count: 82, stateId: 'andaman', dcCount: 3, popCount: 7, siteCount: 64 }
        ]
      }
    ]
  }
];

// Helper to look up a city item without default fallback
export function findCityById(cityId?: string | null): { city: CityItem; state: StateItem; region: RegionItem; facilityType?: 'dc' | 'pop' | 'site' } | null {
  if (!cityId) return null;
  for (const reg of GEOGRAPHIC_HIERARCHY) {
    for (const st of reg.states) {
      const city = st.cities.find(c => c.id === cityId);
      if (city) {
        return { city, state: st, region: reg };
      }
    }
  }
  return null;
}

// Helper to look up city and facility type from facility code or device name
export function findCityByFacilityCode(code?: string | null): {
  city: CityItem;
  state: StateItem;
  region: RegionItem;
  facilityType: 'dc' | 'pop' | 'site';
} | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  const parts = upper.split('-');
  const pfx = parts[0]; // e.g. 'CEN', 'MUM', 'DEL'
  const mid = parts[1]; // e.g. 'DC', 'POP', 'STE'

  let facilityType: 'dc' | 'pop' | 'site' = 'site';
  if (mid === 'DC') facilityType = 'dc';
  else if (mid === 'POP') facilityType = 'pop';
  else if (mid === 'STE') facilityType = 'site';

  // 1. Check 3-letter prefix matching city name prefix (e.g. CEN -> Central Delhi, MUM -> Mumbai)
  for (const reg of GEOGRAPHIC_HIERARCHY) {
    for (const st of reg.states) {
      for (const ct of st.cities) {
        if (ct.name.slice(0, 3).toUpperCase() === pfx) {
          return { city: ct, state: st, region: reg, facilityType };
        }
      }
    }
  }

  // 2. Check if pfx matches city ID or city name prefix
  for (const reg of GEOGRAPHIC_HIERARCHY) {
    for (const st of reg.states) {
      for (const ct of st.cities) {
        if (ct.id.toUpperCase().startsWith(pfx) || ct.name.toUpperCase().startsWith(pfx)) {
          return { city: ct, state: st, region: reg, facilityType };
        }
      }
    }
  }

  return null;
}

// Helper to look up a city item
export function getCityById(cityId: string): { city: CityItem; state: StateItem; region: RegionItem } | null {
  for (const reg of GEOGRAPHIC_HIERARCHY) {
    for (const st of reg.states) {
      const city = st.cities.find(c => c.id === cityId);
      if (city) {
        return { city, state: st, region: reg };
      }
    }
  }
  // Default fallback if not found directly
  const defRegion = GEOGRAPHIC_HIERARCHY[1]; // West
  const defState = defRegion.states[0]; // Maharashtra
  const defCity = defState.cities[0]; // Mumbai
  return { city: defCity, state: defState, region: defRegion };
}

// Generates high fidelity mock network elements for a city and facility type matching Image 4
export function getNetworkElementsForCity(cityId: string, facilityType: 'dc' | 'pop' | 'site'): NetworkElementRow[] {
  const info = getCityById(cityId);
  const cityCode = info?.city.name.slice(0, 3).toUpperCase() || 'MUM';
  const regionName = info?.region.name.replace(' Region', '') || 'West';

  const baseRows: Omit<NetworkElementRow, 'id' | 'facilityType' | 'cityId'>[] = [
    {
      status: 'Verified',
      name: `${cityCode}-J960-P_R1-T1-NR`,
      ip: '172.31.42.100',
      model: 'MX960',
      vendor: 'JUNIPER',
      osVersion: '21.2R3-S8.5',
      serialNumber: 'JN1236F87AFB',
      region: regionName,
      portsUsed: 22,
      portsTotal: 36,
      locationCode: `${cityCode}-279`,
      systemDescription: 'Juniper Networks, Inc. mx960 internet router',
      category: 'Router'
    },
    {
      status: 'Verified',
      name: `${cityCode}-N540X-PE-T4-NR`,
      ip: '172.31.53.186',
      model: 'NCS-540',
      vendor: 'CISCO',
      osVersion: '7.9.2',
      serialNumber: 'FW488AS342W',
      region: regionName,
      portsUsed: 21,
      portsTotal: 36,
      locationCode: `${cityCode}-118`,
      systemDescription: 'Cisco IOS Software, NCS-540 Software (NCS540)',
      category: 'Router'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-J2.2K-PE-T4-ER`,
      ip: '172.31.61.140',
      model: 'ACX2200',
      vendor: 'JUNIPER',
      osVersion: '21.2R3-S8.5',
      serialNumber: 'PJ0215230255',
      region: regionName,
      portsUsed: 20,
      portsTotal: 36,
      locationCode: `${cityCode}-118`,
      systemDescription: 'Juniper Networks, Inc. acx2200 internet router',
      category: 'Router'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-J960-P-T1-WR`,
      ip: '172.31.31.97',
      model: 'MX960',
      vendor: 'JUNIPER',
      osVersion: '21.4R3-S5.5',
      serialNumber: 'JN1234C25AFA',
      region: regionName,
      portsUsed: 19,
      portsTotal: 36,
      locationCode: `${cityCode}-BGLK-277`,
      systemDescription: 'Juniper Networks, Inc. mx960 internet router',
      category: 'Router'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-CNOC-LAB-J204-PE-T3-NR1`,
      ip: '172.31.86.61',
      model: 'MX204',
      vendor: 'JUNIPER',
      osVersion: '21.4R3-S5.5',
      serialNumber: 'FW488AS342W',
      region: regionName,
      portsUsed: 18,
      portsTotal: 36,
      locationCode: `${cityCode}-BGLK-277`,
      systemDescription: 'Juniper Networks, Inc. mx204 internet router',
      category: 'Router'
    },
    {
      status: 'Stale',
      name: `${cityCode}-920-WIFI-R2`,
      ip: '172.31.70.43',
      model: 'ASR920',
      vendor: 'CISCO',
      osVersion: '17.6.4',
      serialNumber: 'CAT2034U1PP',
      region: regionName,
      portsUsed: 22,
      portsTotal: 36,
      locationCode: `${cityCode}-118`,
      systemDescription: 'Cisco IOS Software, ASR920 Software (ASR920)',
      category: 'Router'
    },
    {
      status: 'Missing',
      name: `${cityCode}-N7750-BNG-R-T1-SR`,
      ip: '172.31.33.130',
      model: '7750',
      vendor: 'NOKIA',
      osVersion: '—',
      serialNumber: 'JS123CC2EAFA',
      region: regionName,
      portsUsed: 21,
      portsTotal: 36,
      locationCode: `${cityCode}-MAS-041`,
      systemDescription: '—',
      category: 'Router'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-ACX2200-PE-T4`,
      ip: '172.31.61.10',
      model: 'ACX2200',
      vendor: 'JUNIPER',
      osVersion: '21.4R3-S5.5',
      serialNumber: 'JUNACX22000DI',
      region: regionName,
      portsUsed: 20,
      portsTotal: 36,
      locationCode: `${cityCode}-KOL-204`,
      systemDescription: 'Juniper Networks, Inc. acx2200 internet router',
      category: 'Router'
    },
    {
      status: 'Verified',
      name: `${cityCode}-LEAF01-N9K`,
      ip: '172.31.10.45',
      model: 'Nexus 93180',
      vendor: 'CISCO',
      osVersion: '10.2(3)',
      serialNumber: 'FOC24194R2L',
      region: regionName,
      portsUsed: 32,
      portsTotal: 48,
      locationCode: `${cityCode}-DC-01`,
      systemDescription: 'Cisco NX-OS 10.2(3) Nexus 93180YC-EX',
      category: 'Switch'
    },
    {
      status: 'Verified',
      name: `${cityCode}-SPINE01-N9K`,
      ip: '172.31.10.46',
      model: 'Nexus 9336C',
      vendor: 'CISCO',
      osVersion: '10.2(3)',
      serialNumber: 'FOC24194R8M',
      region: regionName,
      portsUsed: 28,
      portsTotal: 36,
      locationCode: `${cityCode}-DC-01`,
      systemDescription: 'Cisco NX-OS 10.2(3) Nexus 9336C-FX2',
      category: 'Switch'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-OPT01-1830`,
      ip: '172.31.25.10',
      model: 'PSS-32',
      vendor: 'NOKIA',
      osVersion: '22.1.2',
      serialNumber: 'NK1830PSS32',
      region: regionName,
      portsUsed: 16,
      portsTotal: 32,
      locationCode: `${cityCode}-OPT-01`,
      systemDescription: 'Nokia 1830 Photonic Service Switch',
      category: 'DWDM'
    },
    {
      status: 'Verified',
      name: `${cityCode}-OPT02-1830`,
      ip: '172.31.25.11',
      model: 'PSS-16',
      vendor: 'NOKIA',
      osVersion: '22.1.2',
      serialNumber: 'NK1830PSS16',
      region: regionName,
      portsUsed: 12,
      portsTotal: 16,
      locationCode: `${cityCode}-OPT-02`,
      systemDescription: 'Nokia 1830 Photonic Service Switch',
      category: 'DWDM'
    },
    {
      status: 'Verified',
      name: `${cityCode}-ENB-4G-012`,
      ip: '172.31.90.12',
      model: 'AirScale BBU',
      vendor: 'NOKIA',
      osVersion: 'SBTS21B',
      serialNumber: 'ASIA2049102',
      region: regionName,
      portsUsed: 6,
      portsTotal: 8,
      locationCode: `${cityCode}-SITE-112`,
      systemDescription: 'Nokia AirScale eNodeB LTE Baseband Unit',
      category: 'eNodeB'
    },
    {
      status: 'Drifted',
      name: `${cityCode}-ENB-4G-015`,
      ip: '172.31.90.15',
      model: 'AirScale BBU',
      vendor: 'NOKIA',
      osVersion: 'SBTS21B',
      serialNumber: 'ASIA2049115',
      region: regionName,
      portsUsed: 5,
      portsTotal: 8,
      locationCode: `${cityCode}-SITE-115`,
      systemDescription: 'Nokia AirScale eNodeB LTE Baseband Unit',
      category: 'eNodeB'
    },
    {
      status: 'Verified',
      name: `${cityCode}-GNB-5G-001`,
      ip: '172.31.95.1',
      model: '5G gNodeB vDU',
      vendor: 'CISCO',
      osVersion: '22.4.1',
      serialNumber: 'CSGNB5G001',
      region: regionName,
      portsUsed: 4,
      portsTotal: 8,
      locationCode: `${cityCode}-SITE-501`,
      systemDescription: 'Cisco Virtualized 5G NR Distributed Unit',
      category: 'gNodeB'
    },
    {
      status: 'Verified',
      name: `${cityCode}-GNB-5G-002`,
      ip: '172.31.95.2',
      model: '5G gNodeB vDU',
      vendor: 'CISCO',
      osVersion: '22.4.1',
      serialNumber: 'CSGNB5G002',
      region: regionName,
      portsUsed: 4,
      portsTotal: 8,
      locationCode: `${cityCode}-SITE-502`,
      systemDescription: 'Cisco Virtualized 5G NR Distributed Unit',
      category: 'gNodeB'
    }
  ];

  // Adjust prefixes based on facilityType
  const typePrefix = facilityType === 'dc' ? 'DC' : facilityType === 'pop' ? 'POP' : 'SITE';

  return baseRows.map((r, idx) => ({
    ...r,
    id: `${cityId}-${facilityType}-${idx + 1}`,
    name: r.name.replace('-P_', `-${typePrefix}_`),
    facilityType,
    cityId
  }));
}

// Generates dedicated list of facilities (Data Centers, PoPs, Sites) for a city
export function getFacilitiesForCity(cityId: string, facilityType: 'dc' | 'pop' | 'site'): FacilityItem[] {
  const info = getCityById(cityId);
  const city = info?.city;
  const cityName = city?.name || 'Central Delhi';
  const cityCode = cityName.slice(0, 3).toUpperCase();
  const count = facilityType === 'dc' ? (city?.dcCount || 14) : facilityType === 'pop' ? (city?.popCount || 42) : (city?.siteCount || 284);

  const dcNames = [
    'Central Core Data Center',
    'North Transit Data Center',
    'Cyber Park Regional DC',
    'Telco Cloud Data Center',
    'Metro Aggregation DC',
    'Financial District DC',
    'Industrial Hub Data Center',
    'South Sector Edge DC',
    'East Corridor Transit DC',
    'West Ring Core Facility',
    'Techno Park Modular DC',
    'Gateway Transit Facility',
    'High-Density Cloud DC',
    'Primary Peering Hub DC',
    'Secondary Disaster Recovery DC',
    'Campus Edge Micro DC',
    'Urban Exchange Data Center',
    'Expressway Junction DC'
  ];

  const popNames = [
    'Metro Central PoP Hub',
    'Commercial Exchange PoP',
    'Transit Ring Aggregation PoP',
    'Financial Square PoP',
    'Railway Junction PoP',
    'Highway Gateway PoP',
    'IT Corridor Distribution PoP',
    'Sector Ring Exchange PoP',
    'University Hub PoP',
    'Airport Express Transit PoP',
    'City Center Micro PoP',
    'Industrial Zone Distribution PoP',
    'North Ring Peering PoP',
    'South Corridor Access PoP',
    'Outer Ring Hub PoP'
  ];

  const siteNames = [
    'Market Square Macro Tower',
    'Commerce Tower 5G Rooftop',
    'Metro Station IBS Hub',
    'Avenue Street Small Cell',
    'Residential Heights Rooftop',
    'Tech Zone Lattice Tower',
    'Expressway Monopole',
    'Hospital Complex IBS',
    'Mall Underground Cell',
    'Ring Road Micro Pole',
    'Industrial Estate Tower',
    'Civic Center Rooftop 5G',
    'Stadium High-Density Cell',
    'Railway Siding Tower',
    'Transit Terminal IBS'
  ];

  const items: FacilityItem[] = [];

  for (let i = 1; i <= count; i++) {
    const numStr = String(i).padStart(2, '0');
    if (facilityType === 'dc') {
      const nameTemplate = dcNames[(i - 1) % dcNames.length];
      const isTier4 = i % 3 === 1;
      const isCentral = i <= 2;
      const totalRacks = 24 + ((i * 7) % 36);
      const usedRacks = Math.max(12, Math.round(totalRacks * (0.65 + ((i % 5) * 0.06))));
      const powerMW = (0.8 + ((i * 3) % 25) * 0.1).toFixed(1);
      const devCount = Math.round(usedRacks * 0.5) + 6;
      const status: FacilityItem['status'] = i % 7 === 0 ? 'Drifted' : i % 13 === 0 ? 'Stale' : 'Verified';

      items.push({
        id: `${cityId}-dc-${i}`,
        code: `${cityCode}-DC-${numStr}`,
        name: `${cityName} ${nameTemplate}`,
        facilityType: 'dc',
        subType: isTier4 ? 'Tier 4 Core Facility' : 'Tier 3 Regional Facility',
        tierOrClassification: isCentral ? 'Tier 4 · Central Core' : isTier4 ? 'Tier 4 · Core Hub' : 'Tier 3 · Regional',
        address: `Sector ${((i * 4) % 28) + 1}, Commercial Zone, ${cityName}`,
        rackOrCapacity: `${usedRacks} / ${totalRacks} Racks`,
        racksTotal: totalRacks,
        racksUsed: usedRacks,
        powerOrUplink: `${powerMW} MW Power`,
        deviceCount: devCount,
        status,
        onAirPct: status === 'Verified' ? 98 : status === 'Drifted' ? 84 : 72
      });
    } else if (facilityType === 'pop') {
      const nameTemplate = popNames[(i - 1) % popNames.length];
      const uplink = i % 3 === 0 ? 'Dual 100G Ring' : i % 2 === 0 ? '100G Ring' : '40G Dense Ring';
      const devCount = 8 + ((i * 3) % 12);
      const status: FacilityItem['status'] = i % 6 === 0 ? 'Drifted' : 'Verified';

      items.push({
        id: `${cityId}-pop-${i}`,
        code: `${cityCode}-POP-${numStr}`,
        name: `${cityName} ${nameTemplate}`,
        facilityType: 'pop',
        subType: i % 3 === 1 ? 'Metro Core Hub' : i % 3 === 2 ? 'Transit Aggregation' : 'Distribution PoP',
        tierOrClassification: i % 3 === 1 ? 'Metro Core Hub' : 'Transit Node',
        address: `Ring Road Corridor ${(i % 12) + 1}, ${cityName}`,
        rackOrCapacity: `${6 + (i % 8)} Racks`,
        powerOrUplink: uplink,
        deviceCount: devCount,
        status,
        onAirPct: status === 'Verified' ? 96 : 82
      });
    } else {
      const nameTemplate = siteNames[(i - 1) % siteNames.length];
      const typeKind = i % 4 === 1 ? 'Macro Tower' : i % 4 === 2 ? 'Rooftop 5G' : i % 4 === 3 ? 'Small Cell' : 'IBS In-Building Hub';
      const structKind = i % 4 === 1 ? '40m GBT' : i % 4 === 2 ? '25m RTT' : i % 4 === 3 ? 'Street Pole' : 'In-Building Hub';
      const siteTypeFull = `${typeKind} (${structKind})`;
      const power = i % 2 === 0 ? 'Grid + 25kVA DG' : 'Grid + Li-Ion UPS';
      const devCount = 4 + (i % 6);
      const status: FacilityItem['status'] = i % 9 === 0 ? 'Drifted' : 'Verified';

      items.push({
        id: `${cityId}-site-${i}`,
        code: `${cityCode}-STE-${String(i).padStart(3, '0')}`,
        name: `${cityName} ${nameTemplate} #${i}`,
        facilityType: 'site',
        subType: typeKind,
        tierOrClassification: siteTypeFull,
        siteType: typeKind,
        siteStructure: structKind,
        address: `Area Block ${String.fromCharCode(65 + (i % 8))}-${(i % 30) + 1}, ${cityName}`,
        rackOrCapacity: i % 2 === 0 ? '4 Equipment Bays' : '2 Wall Racks',
        powerOrUplink: power,
        deviceCount: devCount,
        status,
        onAirPct: status === 'Verified' ? 99 : 88
      });
    }
  }

  return items;
}

// Generates high fidelity network elements housed specifically within an individual facility
interface DeviceTemplate {
  nameSuffix: string;
  model: string;
  vendor: 'CISCO' | 'JUNIPER' | 'NOKIA' | 'HUAWEI';
  osVersion: string;
  serialPrefix: string;
  portsUsed: number;
  portsTotal: number;
  locSuffix: string;
  systemDescription: string;
  status: 'Verified' | 'Drifted' | 'Stale' | 'Missing';
}

const DC_ROUTER_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'CR01-NCS5504', model: 'NCS-5504', vendor: 'CISCO', osVersion: '7.10.1', serialPrefix: 'FOC2518', portsUsed: 28, portsTotal: 36, locSuffix: 'RK-A01-U12', systemDescription: 'Cisco IOS-XR 7.10.1 NCS-5504 High-Capacity Core Router', status: 'Verified' },
  { nameSuffix: 'CR02-MX960', model: 'MX960', vendor: 'JUNIPER', osVersion: '21.4R3-S5', serialPrefix: 'JN1239', portsUsed: 32, portsTotal: 36, locSuffix: 'RK-A01-U24', systemDescription: 'Juniper Networks mx960 core internet transit router', status: 'Verified' },
  { nameSuffix: 'CR03-PTX10K', model: 'PTX10008', vendor: 'JUNIPER', osVersion: '22.2R1', serialPrefix: 'JN8831', portsUsed: 48, portsTotal: 64, locSuffix: 'RK-A02-U10', systemDescription: 'Juniper PTX10008 Terabit Packet Transport Router', status: 'Verified' },
  { nameSuffix: 'CR04-8808', model: '8808', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'FOC2610', portsUsed: 54, portsTotal: 64, locSuffix: 'RK-A02-U28', systemDescription: 'Cisco 8808 High-Density Cloud Scale Core Router', status: 'Verified' },
  { nameSuffix: 'PE01-ASR9904', model: 'ASR9904', vendor: 'CISCO', osVersion: '7.9.2', serialPrefix: 'CAT2394', portsUsed: 22, portsTotal: 36, locSuffix: 'RK-A03-U14', systemDescription: 'Cisco ASR9904 Edge Aggregation & MPLS Router', status: 'Drifted' },
  { nameSuffix: 'PE02-7750', model: '7750 SR-12', vendor: 'NOKIA', osVersion: '21.10.R1', serialPrefix: 'NK7750', portsUsed: 30, portsTotal: 36, locSuffix: 'RK-A03-U26', systemDescription: 'Nokia 7750 Service Router Multiservice Edge Peering', status: 'Verified' },
  { nameSuffix: 'PE03-MX10003', model: 'MX10003', vendor: 'JUNIPER', osVersion: '21.4R3', serialPrefix: 'JN9921', portsUsed: 24, portsTotal: 24, locSuffix: 'RK-A04-U16', systemDescription: 'Juniper MX10003 Edge & Universal Metro Router', status: 'Verified' },
  { nameSuffix: 'PE04-ASR9906', model: 'ASR9906', vendor: 'CISCO', osVersion: '7.10.1', serialPrefix: 'CAT2501', portsUsed: 40, portsTotal: 48, locSuffix: 'RK-A04-U30', systemDescription: 'Cisco ASR9906 Edge Aggregation Chassis Router', status: 'Verified' },
  { nameSuffix: 'GW01-NCS55A2', model: 'NCS-55A2', vendor: 'CISCO', osVersion: '7.9.1', serialPrefix: 'FOC2490', portsUsed: 18, portsTotal: 24, locSuffix: 'RK-B01-U10', systemDescription: 'Cisco NCS-55A2 Data Center Border Gateway', status: 'Verified' },
  { nameSuffix: 'GW02-MX480', model: 'MX480', vendor: 'JUNIPER', osVersion: '20.4R3', serialPrefix: 'JN4802', portsUsed: 16, portsTotal: 24, locSuffix: 'RK-B01-U22', systemDescription: 'Juniper MX480 Carrier Routing Gateway', status: 'Verified' },
  { nameSuffix: 'BORDER01-NE8K', model: 'NetEngine 8000', vendor: 'HUAWEI', osVersion: 'V800R021', serialPrefix: 'HW8000', portsUsed: 26, portsTotal: 32, locSuffix: 'RK-B02-U12', systemDescription: 'Huawei NetEngine 8000 High-End Border Router', status: 'Verified' },
  { nameSuffix: 'BORDER02-8201', model: '8201-32FH', vendor: 'CISCO', osVersion: '7.7.1', serialPrefix: 'FOC2589', portsUsed: 28, portsTotal: 32, locSuffix: 'RK-B02-U24', systemDescription: 'Cisco 8201 Fixed Chassis Border Router', status: 'Verified' },
  { nameSuffix: 'INTER-DC-R01', model: 'NCS-5508', vendor: 'CISCO', osVersion: '7.10.1', serialPrefix: 'FOC2510', portsUsed: 56, portsTotal: 72, locSuffix: 'RK-B03-U15', systemDescription: 'Cisco NCS-5508 Inter-DC Core Transport Router', status: 'Verified' },
  { nameSuffix: 'INTER-DC-R02', model: 'PTX10002', vendor: 'JUNIPER', osVersion: '21.3R2', serialPrefix: 'JN1002', portsUsed: 50, portsTotal: 72, locSuffix: 'RK-B03-U32', systemDescription: 'Juniper PTX10002 Inter-DC Backbone Interconnect', status: 'Drifted' },
  { nameSuffix: 'CORE-AGG01', model: 'ASR9910', vendor: 'CISCO', osVersion: '7.8.1', serialPrefix: 'CAT2910', portsUsed: 36, portsTotal: 48, locSuffix: 'RK-B04-U14', systemDescription: 'Cisco ASR9910 Core Aggregation Chassis', status: 'Verified' },
  { nameSuffix: 'CORE-AGG02', model: '7750 SR-7', vendor: 'NOKIA', osVersion: '22.5.R1', serialPrefix: 'NK7707', portsUsed: 34, portsTotal: 48, locSuffix: 'RK-B04-U28', systemDescription: 'Nokia 7750 SR-7 Regional Aggregator', status: 'Stale' }
];

const DC_SWITCH_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'SPINE01-N9336', model: 'Nexus 9336C', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2510', portsUsed: 34, portsTotal: 36, locSuffix: 'RK-C01-U40', systemDescription: 'Cisco NX-OS Nexus 9336C-FX2 Spine Switch', status: 'Verified' },
  { nameSuffix: 'SPINE02-N9336', model: 'Nexus 9336C', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2511', portsUsed: 32, portsTotal: 36, locSuffix: 'RK-C01-U42', systemDescription: 'Cisco NX-OS Nexus 9336C-FX2 Spine Switch', status: 'Verified' },
  { nameSuffix: 'SPINE03-QFX5200', model: 'QFX5200', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JN5200', portsUsed: 30, portsTotal: 32, locSuffix: 'RK-C02-U40', systemDescription: 'Juniper QFX5200 100G Spine Switch', status: 'Verified' },
  { nameSuffix: 'SPINE04-QFX5200', model: 'QFX5200', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JN5201', portsUsed: 31, portsTotal: 32, locSuffix: 'RK-C02-U42', systemDescription: 'Juniper QFX5200 100G Spine Switch', status: 'Verified' },
  { nameSuffix: 'LEAF01-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2520', portsUsed: 44, portsTotal: 48, locSuffix: 'RK-C03-U18', systemDescription: 'Cisco NX-OS Nexus 93180YC-EX Leaf Switch', status: 'Verified' },
  { nameSuffix: 'LEAF02-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2521', portsUsed: 41, portsTotal: 48, locSuffix: 'RK-C03-U20', systemDescription: 'Cisco NX-OS Nexus 93180YC-EX Leaf Switch', status: 'Verified' },
  { nameSuffix: 'LEAF03-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2522', portsUsed: 46, portsTotal: 48, locSuffix: 'RK-C04-U18', systemDescription: 'Cisco NX-OS Nexus 93180YC-EX Leaf Switch', status: 'Verified' },
  { nameSuffix: 'LEAF04-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2523', portsUsed: 42, portsTotal: 48, locSuffix: 'RK-C04-U20', systemDescription: 'Cisco NX-OS Nexus 93180YC-EX Leaf Switch', status: 'Drifted' },
  { nameSuffix: 'LEAF05-QFX5120', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R3', serialPrefix: 'JN5120', portsUsed: 40, portsTotal: 48, locSuffix: 'RK-C05-U18', systemDescription: 'Juniper QFX5120-48Y Leaf Switch', status: 'Verified' },
  { nameSuffix: 'LEAF06-QFX5120', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R3', serialPrefix: 'JN5121', portsUsed: 38, portsTotal: 48, locSuffix: 'RK-C05-U20', systemDescription: 'Juniper QFX5120-48Y Leaf Switch', status: 'Verified' },
  { nameSuffix: 'TOR01-N93240', model: 'Nexus 93240', vendor: 'CISCO', osVersion: '10.2(4)', serialPrefix: 'FOC2401', portsUsed: 45, portsTotal: 48, locSuffix: 'RK-D01-U42', systemDescription: 'Cisco Nexus 93240YC-FX2 Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'TOR02-N93240', model: 'Nexus 93240', vendor: 'CISCO', osVersion: '10.2(4)', serialPrefix: 'FOC2402', portsUsed: 43, portsTotal: 48, locSuffix: 'RK-D02-U42', systemDescription: 'Cisco Nexus 93240YC-FX2 Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'TOR03-CE6800', model: 'CloudEngine 6800', vendor: 'HUAWEI', osVersion: 'V200R020', serialPrefix: 'HW6801', portsUsed: 42, portsTotal: 48, locSuffix: 'RK-D03-U42', systemDescription: 'Huawei CloudEngine 6857 Data Center Switch', status: 'Verified' },
  { nameSuffix: 'TOR04-CE6800', model: 'CloudEngine 6800', vendor: 'HUAWEI', osVersion: 'V200R020', serialPrefix: 'HW6802', portsUsed: 39, portsTotal: 48, locSuffix: 'RK-D04-U42', systemDescription: 'Huawei CloudEngine 6857 Data Center Switch', status: 'Drifted' },
  { nameSuffix: 'TOR05-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2405', portsUsed: 42, portsTotal: 48, locSuffix: 'RK-D05-U42', systemDescription: 'Cisco Nexus 93180 Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'TOR06-N93180', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.3(2)', serialPrefix: 'FOC2406', portsUsed: 40, portsTotal: 48, locSuffix: 'RK-D06-U42', systemDescription: 'Cisco Nexus 93180 Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'TOR07-QFX5120', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R3', serialPrefix: 'JN5127', portsUsed: 45, portsTotal: 48, locSuffix: 'RK-D07-U42', systemDescription: 'Juniper QFX5120-48Y Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'TOR08-QFX5120', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R3', serialPrefix: 'JN5128', portsUsed: 44, portsTotal: 48, locSuffix: 'RK-D08-U42', systemDescription: 'Juniper QFX5120-48Y Top-of-Rack Switch', status: 'Verified' },
  { nameSuffix: 'AGG-SW01-N9508', model: 'Nexus 9508', vendor: 'CISCO', osVersion: '10.2(3)', serialPrefix: 'FOC9501', portsUsed: 88, portsTotal: 96, locSuffix: 'RK-AGG01-U20', systemDescription: 'Cisco Nexus 9508 High-Density Aggregation Chassis', status: 'Verified' },
  { nameSuffix: 'AGG-SW02-N9508', model: 'Nexus 9508', vendor: 'CISCO', osVersion: '10.2(3)', serialPrefix: 'FOC9502', portsUsed: 82, portsTotal: 96, locSuffix: 'RK-AGG02-U20', systemDescription: 'Cisco Nexus 9508 High-Density Aggregation Chassis', status: 'Verified' },
  { nameSuffix: 'SAN-SW01-MDS', model: 'MDS 9710', vendor: 'CISCO', osVersion: '8.4(2)', serialPrefix: 'FOC9711', portsUsed: 42, portsTotal: 48, locSuffix: 'RK-SAN01-U30', systemDescription: 'Cisco MDS 9710 Multilayer Fibre Channel SAN Director', status: 'Verified' },
  { nameSuffix: 'SAN-SW02-MDS', model: 'MDS 9710', vendor: 'CISCO', osVersion: '8.4(2)', serialPrefix: 'FOC9712', portsUsed: 38, portsTotal: 48, locSuffix: 'RK-SAN02-U30', systemDescription: 'Cisco MDS 9710 Multilayer Fibre Channel SAN Director', status: 'Verified' },
  { nameSuffix: 'MGMT-SW01', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC2301', portsUsed: 44, portsTotal: 48, locSuffix: 'RK-M01-U42', systemDescription: 'Cisco Catalyst 9300 Out-of-Band Management Switch', status: 'Verified' },
  { nameSuffix: 'MGMT-SW02', model: 'EX3400', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JN3401', portsUsed: 41, portsTotal: 48, locSuffix: 'RK-M02-U42', systemDescription: 'Juniper EX3400 Out-of-Band Management Switch', status: 'Stale' }
];

const DC_DWDM_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'DWDM01-PSS32', model: 'PSS-32', vendor: 'NOKIA', osVersion: '22.3.1', serialPrefix: 'NK1830', portsUsed: 26, portsTotal: 32, locSuffix: 'RK-OPT01-U10', systemDescription: 'Nokia 1830 Photonic Service Switch Core Optical Transport', status: 'Verified' },
  { nameSuffix: 'DWDM02-PSS32', model: 'PSS-32', vendor: 'NOKIA', osVersion: '22.3.1', serialPrefix: 'NK1831', portsUsed: 28, portsTotal: 32, locSuffix: 'RK-OPT01-U22', systemDescription: 'Nokia 1830 Photonic Service Switch Core Optical Transport', status: 'Verified' },
  { nameSuffix: 'DWDM03-PSS64', model: 'PSS-64', vendor: 'NOKIA', osVersion: '22.4.0', serialPrefix: 'NK1864', portsUsed: 52, portsTotal: 64, locSuffix: 'RK-OPT02-U12', systemDescription: 'Nokia 1830 PSS-64 High Capacity Optical Cross-Connect', status: 'Verified' },
  { nameSuffix: 'DWDM04-PSS64', model: 'PSS-64', vendor: 'NOKIA', osVersion: '22.4.0', serialPrefix: 'NK1865', portsUsed: 48, portsTotal: 64, locSuffix: 'RK-OPT02-U28', systemDescription: 'Nokia 1830 PSS-64 High Capacity Optical Cross-Connect', status: 'Verified' },
  { nameSuffix: 'ROADM01-NCS2K', model: 'NCS-2000', vendor: 'CISCO', osVersion: '11.1.2', serialPrefix: 'FOC2801', portsUsed: 18, portsTotal: 24, locSuffix: 'RK-OPT03-U14', systemDescription: 'Cisco NCS-2000 FlexSpectrum Multi-Degree ROADM', status: 'Verified' },
  { nameSuffix: 'ROADM02-NCS2K', model: 'NCS-2000', vendor: 'CISCO', osVersion: '11.1.2', serialPrefix: 'FOC2802', portsUsed: 20, portsTotal: 24, locSuffix: 'RK-OPT03-U26', systemDescription: 'Cisco NCS-2000 FlexSpectrum Multi-Degree ROADM', status: 'Verified' },
  { nameSuffix: 'ROADM03-OSN9800', model: 'OSN-9800', vendor: 'HUAWEI', osVersion: 'V100R021', serialPrefix: 'HW9801', portsUsed: 38, portsTotal: 48, locSuffix: 'RK-OPT04-U12', systemDescription: 'Huawei OptiX OSN 9800 Optical Switching Platform', status: 'Verified' },
  { nameSuffix: 'ROADM04-OSN9800', model: 'OSN-9800', vendor: 'HUAWEI', osVersion: 'V100R021', serialPrefix: 'HW9802', portsUsed: 34, portsTotal: 48, locSuffix: 'RK-OPT04-U26', systemDescription: 'Huawei OptiX OSN 9800 Optical Switching Platform', status: 'Drifted' },
  { nameSuffix: 'MUX-DEMUX01', model: '1830-PSS', vendor: 'NOKIA', osVersion: '21.8.1', serialPrefix: 'NK1801', portsUsed: 14, portsTotal: 16, locSuffix: 'RK-OPT05-U10', systemDescription: 'Nokia 1830 16-Channel Optical Multiplexer/Demultiplexer', status: 'Verified' },
  { nameSuffix: 'MUX-DEMUX02', model: '1830-PSS', vendor: 'NOKIA', osVersion: '21.8.1', serialPrefix: 'NK1802', portsUsed: 15, portsTotal: 16, locSuffix: 'RK-OPT05-U18', systemDescription: 'Nokia 1830 16-Channel Optical Multiplexer/Demultiplexer', status: 'Verified' },
  { nameSuffix: 'AMP-EDFA01', model: 'NCS-2K-EDFA', vendor: 'CISCO', osVersion: '11.1.0', serialPrefix: 'FOC2805', portsUsed: 8, portsTotal: 8, locSuffix: 'RK-OPT05-U26', systemDescription: 'Cisco NCS-2000 Optical In-Line Raman/EDFA Amplifier', status: 'Verified' },
  { nameSuffix: 'AMP-EDFA02', model: 'NCS-2K-EDFA', vendor: 'CISCO', osVersion: '11.1.0', serialPrefix: 'FOC2806', portsUsed: 7, portsTotal: 8, locSuffix: 'RK-OPT05-U32', systemDescription: 'Cisco NCS-2000 Optical In-Line Raman/EDFA Amplifier', status: 'Verified' },
  { nameSuffix: 'TRANS-100G01', model: 'NCS-1004', vendor: 'CISCO', osVersion: '7.8.1', serialPrefix: 'FOC1001', portsUsed: 12, portsTotal: 16, locSuffix: 'RK-OPT06-U10', systemDescription: 'Cisco NCS-1004 Multi-Haul 100G/400G Transponder', status: 'Verified' },
  { nameSuffix: 'TRANS-100G02', model: 'NCS-1004', vendor: 'CISCO', osVersion: '7.8.1', serialPrefix: 'FOC1002', portsUsed: 14, portsTotal: 16, locSuffix: 'RK-OPT06-U20', systemDescription: 'Cisco NCS-1004 Multi-Haul 100G/400G Transponder', status: 'Verified' },
  { nameSuffix: 'TRANS-400G01', model: '1830-PSI-M', vendor: 'NOKIA', osVersion: '22.1.0', serialPrefix: 'NK4001', portsUsed: 16, portsTotal: 16, locSuffix: 'RK-OPT07-U14', systemDescription: 'Nokia 1830 Photonic Service Interconnect 400G Coherent', status: 'Verified' },
  { nameSuffix: 'TRANS-400G02', model: '1830-PSI-M', vendor: 'NOKIA', osVersion: '22.1.0', serialPrefix: 'NK4002', portsUsed: 15, portsTotal: 16, locSuffix: 'RK-OPT07-U24', systemDescription: 'Nokia 1830 Photonic Service Interconnect 400G Coherent', status: 'Stale' }
];

const POP_ROUTER_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'AGG-R01-NCS540', model: 'NCS-540', vendor: 'CISCO', osVersion: '7.9.2', serialPrefix: 'FOC2419', portsUsed: 22, portsTotal: 28, locSuffix: 'RK-P01-U12', systemDescription: 'Cisco NCS-540 Metro Aggregation Router', status: 'Verified' },
  { nameSuffix: 'AGG-R02-MX204', model: 'MX204', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JNMX20', portsUsed: 18, portsTotal: 24, locSuffix: 'RK-P01-U24', systemDescription: 'Juniper MX204 Metro Transit Router', status: 'Verified' },
  { nameSuffix: 'AGG-R03-NCS540', model: 'NCS-540', vendor: 'CISCO', osVersion: '7.9.2', serialPrefix: 'FOC2420', portsUsed: 24, portsTotal: 28, locSuffix: 'RK-P02-U12', systemDescription: 'Cisco NCS-540 Metro Aggregation Router', status: 'Verified' },
  { nameSuffix: 'AGG-R04-MX204', model: 'MX204', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JNMX21', portsUsed: 20, portsTotal: 24, locSuffix: 'RK-P02-U24', systemDescription: 'Juniper MX204 Metro Transit Router', status: 'Verified' },
  { nameSuffix: 'PEER-R01-7750', model: '7750', vendor: 'NOKIA', osVersion: '21.10.R1', serialPrefix: 'NK7750', portsUsed: 20, portsTotal: 24, locSuffix: 'RK-P03-U14', systemDescription: 'Nokia 7750 Service Router Edge Peering', status: 'Drifted' },
  { nameSuffix: 'PEER-R02-7750', model: '7750', vendor: 'NOKIA', osVersion: '21.10.R1', serialPrefix: 'NK7751', portsUsed: 21, portsTotal: 24, locSuffix: 'RK-P03-U26', systemDescription: 'Nokia 7750 Service Router Edge Peering', status: 'Verified' },
  { nameSuffix: 'EDGE-R01-ASR9001', model: 'ASR-9001', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'CAT9001', portsUsed: 14, portsTotal: 16, locSuffix: 'RK-P04-U16', systemDescription: 'Cisco ASR-9001 Metro Edge Router', status: 'Verified' },
  { nameSuffix: 'EDGE-R02-ASR9001', model: 'ASR-9001', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'CAT9002', portsUsed: 12, portsTotal: 16, locSuffix: 'RK-P04-U28', systemDescription: 'Cisco ASR-9001 Metro Edge Router', status: 'Verified' },
  { nameSuffix: 'BNG-R01-MX480', model: 'MX480', vendor: 'JUNIPER', osVersion: '21.4R1', serialPrefix: 'JN4801', portsUsed: 32, portsTotal: 36, locSuffix: 'RK-P05-U10', systemDescription: 'Juniper MX480 Broadband Network Gateway', status: 'Verified' },
  { nameSuffix: 'BNG-R02-MX480', model: 'MX480', vendor: 'JUNIPER', osVersion: '21.4R1', serialPrefix: 'JN4802', portsUsed: 29, portsTotal: 36, locSuffix: 'RK-P05-U24', systemDescription: 'Juniper MX480 Broadband Network Gateway', status: 'Verified' },
  { nameSuffix: 'TRANSIT-R01', model: 'NCS-55A1', vendor: 'CISCO', osVersion: '7.9.1', serialPrefix: 'FOC5501', portsUsed: 22, portsTotal: 28, locSuffix: 'RK-P06-U14', systemDescription: 'Cisco NCS-55A1 Regional Transit Router', status: 'Verified' },
  { nameSuffix: 'TRANSIT-R02', model: 'NetEngine 8000', vendor: 'HUAWEI', osVersion: 'V800R021', serialPrefix: 'HW8001', portsUsed: 24, portsTotal: 28, locSuffix: 'RK-P06-U26', systemDescription: 'Huawei NetEngine 8000 Regional Peering Gateway', status: 'Verified' },
  { nameSuffix: 'METRO-R01-7210', model: '7210 SAS', vendor: 'NOKIA', osVersion: '21.7.R1', serialPrefix: 'NK7210', portsUsed: 16, portsTotal: 20, locSuffix: 'RK-P07-U16', systemDescription: 'Nokia 7210 Service Access Switch-Router', status: 'Verified' },
  { nameSuffix: 'METRO-R02-7210', model: '7210 SAS', vendor: 'NOKIA', osVersion: '21.7.R1', serialPrefix: 'NK7211', portsUsed: 17, portsTotal: 20, locSuffix: 'RK-P07-U28', systemDescription: 'Nokia 7210 Service Access Switch-Router', status: 'Drifted' },
  { nameSuffix: 'GATEWAY-R01', model: 'ASR9902', vendor: 'CISCO', osVersion: '7.10.1', serialPrefix: 'CAT9902', portsUsed: 18, portsTotal: 24, locSuffix: 'RK-P08-U18', systemDescription: 'Cisco ASR9902 Compact Edge Gateway', status: 'Verified' },
  { nameSuffix: 'GATEWAY-R02', model: 'MX150', vendor: 'JUNIPER', osVersion: '21.3R1', serialPrefix: 'JN1501', portsUsed: 10, portsTotal: 12, locSuffix: 'RK-P08-U28', systemDescription: 'Juniper MX150 Compact Edge Router', status: 'Stale' }
];

const POP_SWITCH_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'DIST-SW01-N9K', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.2(3)', serialPrefix: 'FOC2419', portsUsed: 36, portsTotal: 48, locSuffix: 'RK-P09-U18', systemDescription: 'Cisco Nexus Distribution Switch', status: 'Verified' },
  { nameSuffix: 'DIST-SW02-N9K', model: 'Nexus 93180', vendor: 'CISCO', osVersion: '10.2(3)', serialPrefix: 'FOC2420', portsUsed: 38, portsTotal: 48, locSuffix: 'RK-P09-U28', systemDescription: 'Cisco Nexus Distribution Switch', status: 'Verified' },
  { nameSuffix: 'DIST-SW03-QFX', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JN5123', portsUsed: 40, portsTotal: 48, locSuffix: 'RK-P10-U18', systemDescription: 'Juniper QFX5120 Distribution Switch', status: 'Verified' },
  { nameSuffix: 'DIST-SW04-QFX', model: 'QFX5120', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JN5124', portsUsed: 35, portsTotal: 48, locSuffix: 'RK-P10-U28', systemDescription: 'Juniper QFX5120 Distribution Switch', status: 'Verified' },
  { nameSuffix: 'AGG-SW01-C9500', model: 'Catalyst 9500', vendor: 'CISCO', osVersion: '17.9.3', serialPrefix: 'FOC9501', portsUsed: 38, portsTotal: 48, locSuffix: 'RK-P11-U16', systemDescription: 'Cisco Catalyst 9500 Metro Aggregator', status: 'Verified' },
  { nameSuffix: 'AGG-SW02-C9500', model: 'Catalyst 9500', vendor: 'CISCO', osVersion: '17.9.3', serialPrefix: 'FOC9502', portsUsed: 41, portsTotal: 48, locSuffix: 'RK-P11-U26', systemDescription: 'Cisco Catalyst 9500 Metro Aggregator', status: 'Verified' },
  { nameSuffix: 'AGG-SW03-EX4650', model: 'EX4650', vendor: 'JUNIPER', osVersion: '21.3R2', serialPrefix: 'JN4651', portsUsed: 42, portsTotal: 48, locSuffix: 'RK-P12-U16', systemDescription: 'Juniper EX4650 Aggregation Switch', status: 'Drifted' },
  { nameSuffix: 'AGG-SW04-EX4650', model: 'EX4650', vendor: 'JUNIPER', osVersion: '21.3R2', serialPrefix: 'JN4652', portsUsed: 39, portsTotal: 48, locSuffix: 'RK-P12-U26', systemDescription: 'Juniper EX4650 Aggregation Switch', status: 'Verified' },
  { nameSuffix: 'LAN-SW01-C9300', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC9301', portsUsed: 44, portsTotal: 48, locSuffix: 'RK-P13-U14', systemDescription: 'Cisco Catalyst 9300 Local LAN Switch', status: 'Verified' },
  { nameSuffix: 'LAN-SW02-C9300', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC9302', portsUsed: 40, portsTotal: 48, locSuffix: 'RK-P13-U24', systemDescription: 'Cisco Catalyst 9300 Local LAN Switch', status: 'Verified' },
  { nameSuffix: 'LAN-SW03-CE5800', model: 'CloudEngine 5800', vendor: 'HUAWEI', osVersion: 'V200R019', serialPrefix: 'HW5801', portsUsed: 36, portsTotal: 48, locSuffix: 'RK-P14-U14', systemDescription: 'Huawei CloudEngine 5855 Access Switch', status: 'Verified' },
  { nameSuffix: 'LAN-SW04-CE5800', model: 'CloudEngine 5800', vendor: 'HUAWEI', osVersion: 'V200R019', serialPrefix: 'HW5802', portsUsed: 32, portsTotal: 48, locSuffix: 'RK-P14-U24', systemDescription: 'Huawei CloudEngine 5855 Access Switch', status: 'Verified' },
  { nameSuffix: 'OOB-SW01', model: 'EX2300', vendor: 'JUNIPER', osVersion: '20.4R3', serialPrefix: 'JN2301', portsUsed: 22, portsTotal: 24, locSuffix: 'RK-P15-U42', systemDescription: 'Juniper EX2300 Out-of-Band Switch', status: 'Verified' },
  { nameSuffix: 'OOB-SW02', model: 'Catalyst 2960X', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC2961', portsUsed: 20, portsTotal: 24, locSuffix: 'RK-P15-U44', systemDescription: 'Cisco Catalyst 2960-X Management Switch', status: 'Verified' },
  { nameSuffix: 'PEER-SW01', model: 'Nexus 9336C', vendor: 'CISCO', osVersion: '10.3(1)', serialPrefix: 'FOC9331', portsUsed: 26, portsTotal: 36, locSuffix: 'RK-P16-U20', systemDescription: 'Cisco Nexus 9336C IX Peering Switch', status: 'Verified' },
  { nameSuffix: 'PEER-SW02', model: 'Nexus 9336C', vendor: 'CISCO', osVersion: '10.3(1)', serialPrefix: 'FOC9332', portsUsed: 24, portsTotal: 36, locSuffix: 'RK-P16-U30', systemDescription: 'Cisco Nexus 9336C IX Peering Switch', status: 'Stale' }
];

const POP_DWDM_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'OPT-PSS16-01', model: 'PSS-16', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NK1816', portsUsed: 12, portsTotal: 16, locSuffix: 'RK-POPT01-U12', systemDescription: 'Nokia 1830 Photonic Service Switch Metro Transport', status: 'Verified' },
  { nameSuffix: 'OPT-PSS16-02', model: 'PSS-16', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NK1817', portsUsed: 14, portsTotal: 16, locSuffix: 'RK-POPT01-U24', systemDescription: 'Nokia 1830 Photonic Service Switch Metro Transport', status: 'Verified' },
  { nameSuffix: 'OPT-ROADM01', model: 'NCS-2000', vendor: 'CISCO', osVersion: '11.0.1', serialPrefix: 'FOC2001', portsUsed: 10, portsTotal: 16, locSuffix: 'RK-POPT02-U14', systemDescription: 'Cisco NCS-2000 Metro ROADM Terminal', status: 'Verified' },
  { nameSuffix: 'OPT-ROADM02', model: 'NCS-2000', vendor: 'CISCO', osVersion: '11.0.1', serialPrefix: 'FOC2002', portsUsed: 11, portsTotal: 16, locSuffix: 'RK-POPT02-U26', systemDescription: 'Cisco NCS-2000 Metro ROADM Terminal', status: 'Verified' },
  { nameSuffix: 'METRO-MUX01', model: '1830-PSS', vendor: 'NOKIA', osVersion: '21.9.0', serialPrefix: 'NK1821', portsUsed: 15, portsTotal: 16, locSuffix: 'RK-POPT03-U10', systemDescription: 'Nokia 1830 Metro Multiplexer Unit', status: 'Verified' },
  { nameSuffix: 'METRO-MUX02', model: '1830-PSS', vendor: 'NOKIA', osVersion: '21.9.0', serialPrefix: 'NK1822', portsUsed: 14, portsTotal: 16, locSuffix: 'RK-POPT03-U20', systemDescription: 'Nokia 1830 Metro Multiplexer Unit', status: 'Drifted' },
  { nameSuffix: 'METRO-MUX03', model: 'OSN-1800', vendor: 'HUAWEI', osVersion: 'V100R020', serialPrefix: 'HW1801', portsUsed: 16, portsTotal: 16, locSuffix: 'RK-POPT04-U10', systemDescription: 'Huawei OptiX OSN 1800 Compact WDM', status: 'Verified' },
  { nameSuffix: 'METRO-MUX04', model: 'OSN-1800', vendor: 'HUAWEI', osVersion: 'V100R020', serialPrefix: 'HW1802', portsUsed: 13, portsTotal: 16, locSuffix: 'RK-POPT04-U20', systemDescription: 'Huawei OptiX OSN 1800 Compact WDM', status: 'Verified' },
  { nameSuffix: 'TRANS-10G01', model: '1830-PSS', vendor: 'NOKIA', osVersion: '22.0.1', serialPrefix: 'NK1001', portsUsed: 8, portsTotal: 8, locSuffix: 'RK-POPT05-U12', systemDescription: 'Nokia 1830 10G Multi-Service Transponder', status: 'Verified' },
  { nameSuffix: 'TRANS-10G02', model: '1830-PSS', vendor: 'NOKIA', osVersion: '22.0.1', serialPrefix: 'NK1002', portsUsed: 7, portsTotal: 8, locSuffix: 'RK-POPT05-U20', systemDescription: 'Nokia 1830 10G Multi-Service Transponder', status: 'Verified' },
  { nameSuffix: 'TRANS-100G01', model: 'NCS-1004', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'FOC1011', portsUsed: 8, portsTotal: 8, locSuffix: 'RK-POPT06-U14', systemDescription: 'Cisco NCS-1004 Metro 100G Optical Transponder', status: 'Verified' },
  { nameSuffix: 'TRANS-100G02', model: 'NCS-1004', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'FOC1012', portsUsed: 6, portsTotal: 8, locSuffix: 'RK-POPT06-U24', systemDescription: 'Cisco NCS-1004 Metro 100G Optical Transponder', status: 'Verified' },
  { nameSuffix: 'AMP-METRO01', model: 'NCS-2K-EDFA', vendor: 'CISCO', osVersion: '11.0.0', serialPrefix: 'FOC2011', portsUsed: 4, portsTotal: 4, locSuffix: 'RK-POPT07-U16', systemDescription: 'Cisco NCS Optical Pre-Amplifier', status: 'Verified' },
  { nameSuffix: 'AMP-METRO02', model: 'NCS-2K-EDFA', vendor: 'CISCO', osVersion: '11.0.0', serialPrefix: 'FOC2012', portsUsed: 4, portsTotal: 4, locSuffix: 'RK-POPT07-U24', systemDescription: 'Cisco NCS Optical Booster Amplifier', status: 'Verified' },
  { nameSuffix: 'OPT-TERMINAL01', model: 'PSS-4', vendor: 'NOKIA', osVersion: '21.8.2', serialPrefix: 'NK1804', portsUsed: 4, portsTotal: 4, locSuffix: 'RK-POPT08-U18', systemDescription: 'Nokia 1830 PSS-4 Compact Optical Terminal', status: 'Verified' },
  { nameSuffix: 'OPT-TERMINAL02', model: 'PSS-4', vendor: 'NOKIA', osVersion: '21.8.2', serialPrefix: 'NK1805', portsUsed: 3, portsTotal: 4, locSuffix: 'RK-POPT08-U26', systemDescription: 'Nokia 1830 PSS-4 Compact Optical Terminal', status: 'Stale' }
];

const SITE_GNODEB_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: '5G-gNB01-vDU', model: '5G gNodeB vDU', vendor: 'CISCO', osVersion: '22.4.1', serialPrefix: 'CSGNB5G', portsUsed: 6, portsTotal: 8, locSuffix: 'TOW-BBU-R01', systemDescription: 'Cisco Virtualized 5G NR Distributed Unit', status: 'Verified' },
  { nameSuffix: '5G-gNB02-CU', model: '5G gNodeB CU', vendor: 'CISCO', osVersion: '22.4.1', serialPrefix: 'CSGNB5H', portsUsed: 4, portsTotal: 8, locSuffix: 'TOW-BBU-R01', systemDescription: 'Cisco Virtualized 5G Centralized Unit', status: 'Verified' },
  { nameSuffix: '5G-gNB03-AirScale', model: 'AirScale 5G BBU', vendor: 'NOKIA', osVersion: 'SBTS22R3', serialPrefix: 'NK5GBBU1', portsUsed: 7, portsTotal: 8, locSuffix: 'TOW-BBU-R02', systemDescription: 'Nokia AirScale 5G Sub-6GHz Baseband', status: 'Verified' },
  { nameSuffix: '5G-gNB04-AirScale', model: 'AirScale 5G BBU', vendor: 'NOKIA', osVersion: 'SBTS22R3', serialPrefix: 'NK5GBBU2', portsUsed: 6, portsTotal: 8, locSuffix: 'TOW-BBU-R02', systemDescription: 'Nokia AirScale 5G Sub-6GHz Baseband', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-A1', model: 'AAU5613', vendor: 'HUAWEI', osVersion: 'V100R017', serialPrefix: 'HWAAU51', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-A-TOP', systemDescription: 'Huawei 5G Massive MIMO Active Antenna Unit Sector A', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-A2', model: 'AAU5613', vendor: 'HUAWEI', osVersion: 'V100R017', serialPrefix: 'HWAAU52', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-A-MID', systemDescription: 'Huawei 5G Massive MIMO Active Antenna Unit Sector A', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-B1', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU1', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-B-TOP', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector B', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-B2', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU2', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-B-MID', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector B', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-C1', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU3', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-C-TOP', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector C', status: 'Drifted' },
  { nameSuffix: '5G-AAU-SEC-C2', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU4', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-C-MID', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector C', status: 'Verified' },
  { nameSuffix: '5G-RRU01-n78', model: '5G Radio Unit n78', vendor: 'NOKIA', osVersion: 'SBTS22', serialPrefix: 'NKRU781', portsUsed: 4, portsTotal: 4, locSuffix: 'TOW-RRU-A1', systemDescription: 'Nokia 3.5GHz n78 Remote Radio Unit', status: 'Verified' },
  { nameSuffix: '5G-RRU02-n78', model: '5G Radio Unit n78', vendor: 'NOKIA', osVersion: 'SBTS22', serialPrefix: 'NKRU782', portsUsed: 4, portsTotal: 4, locSuffix: 'TOW-RRU-B1', systemDescription: 'Nokia 3.5GHz n78 Remote Radio Unit', status: 'Verified' },
  { nameSuffix: '5G-RRU03-n28', model: '5G Radio Unit n28', vendor: 'CISCO', osVersion: '22.3', serialPrefix: 'CSRU28', portsUsed: 4, portsTotal: 4, locSuffix: 'TOW-RRU-C1', systemDescription: 'Cisco 700MHz n28 Low-Band Radio Unit', status: 'Verified' },
  { nameSuffix: '5G-MMO-01', model: 'Massive MIMO Controller', vendor: 'CISCO', osVersion: '22.4', serialPrefix: 'CSMMO1', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R01', systemDescription: 'Cisco 5G NR Beamforming Coordinator', status: 'Verified' },
  { nameSuffix: '5G-MMO-02', model: 'Massive MIMO Controller', vendor: 'CISCO', osVersion: '22.4', serialPrefix: 'CSMMO2', portsUsed: 5, portsTotal: 8, locSuffix: 'SHELTER-R01', systemDescription: 'Cisco 5G NR Beamforming Coordinator', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-D1', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU5', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-D-TOP', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector D', status: 'Verified' },
  { nameSuffix: '5G-AAU-SEC-D2', model: 'AirScale AAU', vendor: 'NOKIA', osVersion: '22.2.1', serialPrefix: 'NKAAU6', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-SEC-D-MID', systemDescription: 'Nokia 5G 64T64R Massive MIMO Sector D', status: 'Verified' },
  { nameSuffix: '5G-RRU04-n77', model: '5G Radio Unit n77', vendor: 'NOKIA', osVersion: 'SBTS22', serialPrefix: 'NKRU771', portsUsed: 4, portsTotal: 4, locSuffix: 'TOW-RRU-D1', systemDescription: 'Nokia 3.7GHz n77 Remote Radio Unit', status: 'Verified' },
  { nameSuffix: '5G-RRU05-n258', model: 'mmWave n258 Radio', vendor: 'HUAWEI', osVersion: 'V100', serialPrefix: 'HWRU258', portsUsed: 2, portsTotal: 4, locSuffix: 'TOW-SEC-B-MMW', systemDescription: 'Huawei 26GHz mmWave Micro-Radio', status: 'Verified' },
  { nameSuffix: '5G-BBU05-AirScale', model: 'AirScale 5G BBU', vendor: 'NOKIA', osVersion: 'SBTS22R3', serialPrefix: 'NK5GBBU3', portsUsed: 6, portsTotal: 8, locSuffix: 'TOW-BBU-R03', systemDescription: 'Nokia AirScale 5G Expansion Baseband', status: 'Verified' },
  { nameSuffix: '5G-FR2-MMW', model: 'mmWave Radio', vendor: 'NOKIA', osVersion: '22.1', serialPrefix: 'NKMMW1', portsUsed: 2, portsTotal: 4, locSuffix: 'TOW-SEC-A-MMW', systemDescription: 'Nokia 28GHz mmWave Micro-Radio', status: 'Stale' }
];

const SITE_ENODEB_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: '4G-eNB01-BBU', model: 'AirScale BBU', vendor: 'NOKIA', osVersion: 'SBTS21B', serialPrefix: 'ASIA204', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R02', systemDescription: 'Nokia AirScale eNodeB LTE Baseband Unit', status: 'Verified' },
  { nameSuffix: '4G-eNB02-BBU', model: 'AirScale BBU', vendor: 'NOKIA', osVersion: 'SBTS21B', serialPrefix: 'ASIA205', portsUsed: 5, portsTotal: 8, locSuffix: 'SHELTER-R02', systemDescription: 'Nokia AirScale eNodeB LTE Baseband Unit', status: 'Verified' },
  { nameSuffix: '4G-eNB03-BBU3900', model: 'BBU3900', vendor: 'HUAWEI', osVersion: 'V100R016', serialPrefix: 'HWBBU31', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R03', systemDescription: 'Huawei BBU3900 Multi-Mode Baseband Unit', status: 'Verified' },
  { nameSuffix: '4G-eNB04-BBU3900', model: 'BBU3900', vendor: 'HUAWEI', osVersion: 'V100R016', serialPrefix: 'HWBBU32', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R03', systemDescription: 'Huawei BBU3900 Multi-Mode Baseband Unit', status: 'Verified' },
  { nameSuffix: '4G-RRU-SEC-A1', model: 'RRU3953', vendor: 'HUAWEI', osVersion: 'V100R016', serialPrefix: 'HWRRU11', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-A2', systemDescription: 'Huawei 1800MHz LTE Remote Radio Unit Sector A', status: 'Verified' },
  { nameSuffix: '4G-RRU-SEC-A2', model: 'RRU3953', vendor: 'HUAWEI', osVersion: 'V100R016', serialPrefix: 'HWRRU12', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-A3', systemDescription: 'Huawei 2100MHz LTE Remote Radio Unit Sector A', status: 'Verified' },
  { nameSuffix: '4G-RRU-SEC-B1', model: 'AirScale RRU', vendor: 'NOKIA', osVersion: 'SBTS21', serialPrefix: 'NKRRU21', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-B2', systemDescription: 'Nokia Flexi 1800MHz LTE Radio Sector B', status: 'Verified' },
  { nameSuffix: '4G-RRU-SEC-B2', model: 'AirScale RRU', vendor: 'NOKIA', osVersion: 'SBTS21', serialPrefix: 'NKRRU22', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-B3', systemDescription: 'Nokia Flexi 2100MHz LTE Radio Sector B', status: 'Drifted' },
  { nameSuffix: '4G-RRU-SEC-C1', model: 'AirScale RRU', vendor: 'NOKIA', osVersion: 'SBTS21', serialPrefix: 'NKRRU31', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-C2', systemDescription: 'Nokia Flexi 1800MHz LTE Radio Sector C', status: 'Verified' },
  { nameSuffix: '4G-RRU-SEC-C2', model: 'AirScale RRU', vendor: 'NOKIA', osVersion: 'SBTS21', serialPrefix: 'NKRRU32', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-C3', systemDescription: 'Nokia Flexi 2100MHz LTE Radio Sector C', status: 'Verified' },
  { nameSuffix: '4G-RRH01-850M', model: 'RRH-850', vendor: 'CISCO', osVersion: '16.12', serialPrefix: 'CSRRH81', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-A4', systemDescription: 'Cisco 850MHz Band 5 Remote Radio Head', status: 'Verified' },
  { nameSuffix: '4G-RRH02-850M', model: 'RRH-850', vendor: 'CISCO', osVersion: '16.12', serialPrefix: 'CSRRH82', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-B4', systemDescription: 'Cisco 850MHz Band 5 Remote Radio Head', status: 'Verified' },
  { nameSuffix: '4G-RRH03-850M', model: 'RRH-850', vendor: 'CISCO', osVersion: '16.12', serialPrefix: 'CSRRH83', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-RRU-C4', systemDescription: 'Cisco 850MHz Band 5 Remote Radio Head', status: 'Verified' },
  { nameSuffix: '4G-MIMO-CTRL', model: 'LTE MIMO Unit', vendor: 'NOKIA', osVersion: 'SBTS21B', serialPrefix: 'NKMIMO1', portsUsed: 4, portsTotal: 4, locSuffix: 'SHELTER-R02', systemDescription: 'Nokia 4T4R Carrier Aggregation Module', status: 'Verified' },
  { nameSuffix: '4G-RET-CTRL01', model: 'SmartRET', vendor: 'HUAWEI', osVersion: 'V100', serialPrefix: 'HWRET1', portsUsed: 2, portsTotal: 2, locSuffix: 'TOW-MAST-TOP', systemDescription: 'Remote Electrical Tilt Antenna Controller', status: 'Verified' },
  { nameSuffix: '4G-FEMTO01', model: 'Flexi Zone', vendor: 'NOKIA', osVersion: '20.3', serialPrefix: 'NKFEMTO', portsUsed: 2, portsTotal: 2, locSuffix: 'SHELTER-EXT', systemDescription: 'Nokia Flexi Zone Indoor Small Cell Gateway', status: 'Stale' }
];

const SITE_ROUTER_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'CSR01-ASR920', model: 'ASR920', vendor: 'CISCO', osVersion: '17.6.4', serialPrefix: 'CAT2034', portsUsed: 14, portsTotal: 24, locSuffix: 'SHELTER-R04', systemDescription: 'Cisco ASR920 Primary Cell Site Router', status: 'Verified' },
  { nameSuffix: 'CSR02-ASR920', model: 'ASR920', vendor: 'CISCO', osVersion: '17.6.4', serialPrefix: 'CAT2035', portsUsed: 12, portsTotal: 24, locSuffix: 'SHELTER-R04', systemDescription: 'Cisco ASR920 Redundant Cell Site Router', status: 'Verified' },
  { nameSuffix: 'CSR-BH01-NCS540', model: 'NCS-540', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'FOC5401', portsUsed: 16, portsTotal: 24, locSuffix: 'SHELTER-R04', systemDescription: 'Cisco NCS-540 Front-Haul Cell Site Aggregator', status: 'Verified' },
  { nameSuffix: 'CSR-BH02-NCS540', model: 'NCS-540', vendor: 'CISCO', osVersion: '7.8.2', serialPrefix: 'FOC5402', portsUsed: 15, portsTotal: 24, locSuffix: 'SHELTER-R04', systemDescription: 'Cisco NCS-540 Front-Haul Cell Site Aggregator', status: 'Verified' },
  { nameSuffix: 'CSR-ACX01', model: 'ACX2200', vendor: 'JUNIPER', osVersion: '21.2R2', serialPrefix: 'JNACX21', portsUsed: 14, portsTotal: 16, locSuffix: 'SHELTER-R05', systemDescription: 'Juniper ACX2200 Universal Metro Access Router', status: 'Verified' },
  { nameSuffix: 'CSR-ACX02', model: 'ACX2200', vendor: 'JUNIPER', osVersion: '21.2R2', serialPrefix: 'JNACX22', portsUsed: 13, portsTotal: 16, locSuffix: 'SHELTER-R05', systemDescription: 'Juniper ACX2200 Universal Metro Access Router', status: 'Verified' },
  { nameSuffix: 'IPRAN-R01-ATN', model: 'ATN910', vendor: 'HUAWEI', osVersion: 'V300R006', serialPrefix: 'HWATN1', portsUsed: 12, portsTotal: 16, locSuffix: 'SHELTER-R05', systemDescription: 'Huawei ATN 910 Multi-Service Access Router', status: 'Verified' },
  { nameSuffix: 'IPRAN-R02-ATN', model: 'ATN910', vendor: 'HUAWEI', osVersion: 'V300R006', serialPrefix: 'HWATN2', portsUsed: 10, portsTotal: 16, locSuffix: 'SHELTER-R05', systemDescription: 'Huawei ATN 910 Multi-Service Access Router', status: 'Drifted' },
  { nameSuffix: 'MICROWAVE-R01', model: '7210 SAS-M', vendor: 'NOKIA', osVersion: '21.5.R1', serialPrefix: 'NK7211', portsUsed: 8, portsTotal: 12, locSuffix: 'TOW-MW-BRKT1', systemDescription: 'Nokia 7210 Microwave Packet Transport Node', status: 'Verified' },
  { nameSuffix: 'MICROWAVE-R02', model: '7210 SAS-M', vendor: 'NOKIA', osVersion: '21.5.R1', serialPrefix: 'NK7212', portsUsed: 7, portsTotal: 12, locSuffix: 'TOW-MW-BRKT2', systemDescription: 'Nokia 7210 Microwave Packet Transport Node', status: 'Verified' },
  { nameSuffix: 'FTTS-R01', model: 'ASR901', vendor: 'CISCO', osVersion: '15.6(2)SP', serialPrefix: 'CAT9011', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R06', systemDescription: 'Cisco ASR 901 Fiber-to-the-Site Router', status: 'Verified' },
  { nameSuffix: 'FTTS-R02', model: 'ASR901', vendor: 'CISCO', osVersion: '15.6(2)SP', serialPrefix: 'CAT9012', portsUsed: 5, portsTotal: 8, locSuffix: 'SHELTER-R06', systemDescription: 'Cisco ASR 901 Fiber-to-the-Site Router', status: 'Verified' },
  { nameSuffix: 'SEC-GW01', model: 'SRX345', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JNSRX31', portsUsed: 6, portsTotal: 8, locSuffix: 'SHELTER-R06', systemDescription: 'Juniper SRX345 Site Security IPSec Gateway', status: 'Verified' },
  { nameSuffix: 'SEC-GW02', model: 'SRX345', vendor: 'JUNIPER', osVersion: '21.4R2', serialPrefix: 'JNSRX32', portsUsed: 5, portsTotal: 8, locSuffix: 'SHELTER-R06', systemDescription: 'Juniper SRX345 Site Security IPSec Gateway', status: 'Verified' },
  { nameSuffix: 'CSR-ACC01', model: '7210 SAS-D', vendor: 'NOKIA', osVersion: '21.4.R1', serialPrefix: 'NK7215', portsUsed: 8, portsTotal: 10, locSuffix: 'SHELTER-R07', systemDescription: 'Nokia 7210 Service Access Demarcation', status: 'Verified' },
  { nameSuffix: 'CSR-ACC02', model: '7210 SAS-D', vendor: 'NOKIA', osVersion: '21.4.R1', serialPrefix: 'NK7216', portsUsed: 7, portsTotal: 10, locSuffix: 'SHELTER-R07', systemDescription: 'Nokia 7210 Service Access Demarcation', status: 'Stale' }
];

const SITE_SWITCH_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'ACC-SW01-C9300', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC2402', portsUsed: 18, portsTotal: 24, locSuffix: 'SHELTER-SW01', systemDescription: 'Cisco Catalyst 9300 Site Access Switch', status: 'Verified' },
  { nameSuffix: 'ACC-SW02-C9300', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC2403', portsUsed: 16, portsTotal: 24, locSuffix: 'SHELTER-SW01', systemDescription: 'Cisco Catalyst 9300 Site Access Switch', status: 'Verified' },
  { nameSuffix: 'POE-SW01-C2960', model: 'Catalyst 2960X', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC2965', portsUsed: 22, portsTotal: 24, locSuffix: 'SHELTER-SW02', systemDescription: 'Cisco Catalyst 2960X PoE+ Antenna Feeder Switch', status: 'Verified' },
  { nameSuffix: 'POE-SW02-C2960', model: 'Catalyst 2960X', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC2966', portsUsed: 20, portsTotal: 24, locSuffix: 'SHELTER-SW02', systemDescription: 'Cisco Catalyst 2960X PoE+ Antenna Feeder Switch', status: 'Verified' },
  { nameSuffix: 'TOWER-SW01-EX', model: 'EX2300-C', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JN2305', portsUsed: 10, portsTotal: 12, locSuffix: 'TOW-JUNCT-BOX', systemDescription: 'Juniper EX2300 Compact Masthead Switch', status: 'Verified' },
  { nameSuffix: 'TOWER-SW02-EX', model: 'EX2300-C', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JN2306', portsUsed: 9, portsTotal: 12, locSuffix: 'TOW-JUNCT-BOX', systemDescription: 'Juniper EX2300 Compact Masthead Switch', status: 'Drifted' },
  { nameSuffix: 'SHELTER-SW01', model: 'CloudEngine 5800', vendor: 'HUAWEI', osVersion: 'V200R019', serialPrefix: 'HW5805', portsUsed: 14, portsTotal: 24, locSuffix: 'SHELTER-SW03', systemDescription: 'Huawei CloudEngine Site Aggregation Switch', status: 'Verified' },
  { nameSuffix: 'SHELTER-SW02', model: 'CloudEngine 5800', vendor: 'HUAWEI', osVersion: 'V200R019', serialPrefix: 'HW5806', portsUsed: 12, portsTotal: 24, locSuffix: 'SHELTER-SW03', systemDescription: 'Huawei CloudEngine Site Aggregation Switch', status: 'Verified' },
  { nameSuffix: 'CCTV-SW01', model: 'Catalyst 1000', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC1005', portsUsed: 8, portsTotal: 8, locSuffix: 'SECURITY-CAB', systemDescription: 'Cisco Catalyst 1000 Site Perimeter Surveillance Switch', status: 'Verified' },
  { nameSuffix: 'CCTV-SW02', model: 'Catalyst 1000', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC1006', portsUsed: 7, portsTotal: 8, locSuffix: 'SECURITY-CAB', systemDescription: 'Cisco Catalyst 1000 Site Perimeter Surveillance Switch', status: 'Verified' },
  { nameSuffix: 'ENV-SW01-IE', model: 'IE-4000', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC4001', portsUsed: 6, portsTotal: 8, locSuffix: 'ENV-CAB-01', systemDescription: 'Cisco Industrial Ethernet 4000 Climate Monitoring Switch', status: 'Verified' },
  { nameSuffix: 'ENV-SW02-IE', model: 'IE-4000', vendor: 'CISCO', osVersion: '15.2(7)E', serialPrefix: 'FOC4002', portsUsed: 5, portsTotal: 8, locSuffix: 'ENV-CAB-01', systemDescription: 'Cisco Industrial Ethernet 4000 Climate Monitoring Switch', status: 'Verified' },
  { nameSuffix: 'RECTIFIER-SW01', model: 'EX2300', vendor: 'JUNIPER', osVersion: '20.4R3', serialPrefix: 'JN2311', portsUsed: 6, portsTotal: 8, locSuffix: 'POWER-BAY-A', systemDescription: 'Power System & Rectifier Telemetry Switch', status: 'Verified' },
  { nameSuffix: 'RECTIFIER-SW02', model: 'EX2300', vendor: 'JUNIPER', osVersion: '20.4R3', serialPrefix: 'JN2312', portsUsed: 6, portsTotal: 8, locSuffix: 'POWER-BAY-B', systemDescription: 'Power System & Rectifier Telemetry Switch', status: 'Verified' },
  { nameSuffix: 'BMS-SW01', model: 'Catalyst 2960L', vendor: 'CISCO', osVersion: '15.2(6)E', serialPrefix: 'FOC2968', portsUsed: 7, portsTotal: 8, locSuffix: 'BMS-CAB-01', systemDescription: 'Building Management & Li-Ion Battery Controller Switch', status: 'Verified' },
  { nameSuffix: 'BMS-SW02', model: 'Catalyst 2960L', vendor: 'CISCO', osVersion: '15.2(6)E', serialPrefix: 'FOC2969', portsUsed: 6, portsTotal: 8, locSuffix: 'BMS-CAB-02', systemDescription: 'Building Management & Generator Telemetry Switch', status: 'Stale' }
];

export function getNetworkElementsForFacility(cityId: string, facility: FacilityItem): NetworkElementRow[] {
  const info = getCityById(cityId);
  const regionName = info?.region.name.replace(' Region', '') || 'North';
  const code = facility.code;

  const mapTemplates = (
    templates: DeviceTemplate[],
    category: 'Router' | 'Switch' | 'DWDM' | 'eNodeB' | 'gNodeB',
    ipSubnet: number,
    facilityType: 'dc' | 'pop' | 'site'
  ): NetworkElementRow[] => {
    return templates.map((tmpl, idx) => ({
      id: `${facility.id}-${category.toLowerCase()}-${idx + 1}`,
      status: tmpl.status,
      name: `${code}-${tmpl.nameSuffix}`,
      ip: `172.31.${ipSubnet}.${idx + 1}`,
      model: tmpl.model,
      vendor: tmpl.vendor,
      osVersion: tmpl.osVersion,
      serialNumber: `${tmpl.serialPrefix}${1000 + idx * 17}`,
      region: regionName,
      portsUsed: tmpl.portsUsed,
      portsTotal: tmpl.portsTotal,
      locationCode: `${code}-${tmpl.locSuffix}`,
      systemDescription: tmpl.systemDescription,
      category,
      facilityType,
      cityId
    }));
  };

  if (facility.facilityType === 'dc') {
    return [
      ...mapTemplates(DC_ROUTER_TEMPLATES, 'Router', 10, 'dc'),
      ...mapTemplates(DC_SWITCH_TEMPLATES, 'Switch', 11, 'dc'),
      ...mapTemplates(DC_DWDM_TEMPLATES, 'DWDM', 12, 'dc')
    ];
  }

  if (facility.facilityType === 'pop') {
    return [
      ...mapTemplates(POP_ROUTER_TEMPLATES, 'Router', 20, 'pop'),
      ...mapTemplates(POP_SWITCH_TEMPLATES, 'Switch', 21, 'pop'),
      ...mapTemplates(POP_DWDM_TEMPLATES, 'DWDM', 22, 'pop')
    ];
  }

  // Sites (Cell Towers, Rooftops, IBS)
  return [
    ...mapTemplates(SITE_GNODEB_TEMPLATES, 'gNodeB', 95, 'site'),
    ...mapTemplates(SITE_ENODEB_TEMPLATES, 'eNodeB', 90, 'site'),
    ...mapTemplates(SITE_ROUTER_TEMPLATES, 'Router', 70, 'site'),
    ...mapTemplates(SITE_SWITCH_TEMPLATES, 'Switch', 60, 'site')
  ];
}
