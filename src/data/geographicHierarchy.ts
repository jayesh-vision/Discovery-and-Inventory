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
  status: 'Verified' | 'Drifted' | 'Stale' | 'Missing' | 'Not discovered';
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
  { id: 'datacenters', label: 'Data Centers', count: '206', icon: 'dc', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'pops', label: 'PoP Locations', count: '600', icon: 'pop', color: '#0284c7', bg: '#e0f2fe' },
  { id: 'sites', label: 'Sites', count: '1,594', icon: 'site', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'alarms', label: 'Active Alarms', count: '1,712', icon: 'alarm', color: '#ef4444', bg: '#fef2f2' },
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
          { id: 'delhi-central', name: 'Central Delhi', count: 37, stateId: 'delhi', dcCount: 4, popCount: 9, siteCount: 24 },
          { id: 'delhi-south', name: 'South Delhi', count: 34, stateId: 'delhi', dcCount: 3, popCount: 8, siteCount: 23 },
          { id: 'delhi-noida', name: 'Noida', count: 28, stateId: 'delhi', dcCount: 2, popCount: 7, siteCount: 19 },
          { id: 'delhi-gurgaon', name: 'Gurugram', count: 31, stateId: 'delhi', dcCount: 3, popCount: 7, siteCount: 21 },
          { id: 'delhi-north', name: 'North Delhi', count: 20, stateId: 'delhi', dcCount: 2, popCount: 5, siteCount: 13 },
          { id: 'delhi-west', name: 'West Delhi', count: 19, stateId: 'delhi', dcCount: 1, popCount: 5, siteCount: 13 },
          { id: 'delhi-east', name: 'East Delhi', count: 17, stateId: 'delhi', dcCount: 1, popCount: 4, siteCount: 12 },
          { id: 'delhi-faridabad', name: 'Faridabad', count: 15, stateId: 'delhi', dcCount: 1, popCount: 4, siteCount: 10 },
          { id: 'delhi-ghaziabad', name: 'Ghaziabad', count: 14, stateId: 'delhi', dcCount: 1, popCount: 3, siteCount: 10 },
          { id: 'delhi-sonipat', name: 'Sonipat', count: 9, stateId: 'delhi', dcCount: 1, popCount: 2, siteCount: 6 },
          { id: 'delhi-panipat', name: 'Panipat', count: 7, stateId: 'delhi', dcCount: 0, popCount: 2, siteCount: 5 },
          { id: 'delhi-new-delhi', name: 'New Delhi', count: 7, stateId: 'delhi', dcCount: 1, popCount: 2, siteCount: 4 },
          { id: 'delhi-greater-noida', name: 'Greater Noida', count: 7, stateId: 'delhi', dcCount: 1, popCount: 2, siteCount: 4 },
          { id: 'delhi-meerut-south', name: 'Meerut South', count: 7, stateId: 'delhi', dcCount: 0, popCount: 2, siteCount: 5 },
          { id: 'delhi-manesar', name: 'Manesar', count: 9, stateId: 'delhi', dcCount: 1, popCount: 3, siteCount: 5 }
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
          { id: 'pb-ludhiana', name: 'Ludhiana', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'pb-amritsar', name: 'Amritsar', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'pb-jalandhar', name: 'Jalandhar', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'pb-mohali', name: 'Mohali', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'pb-patiala', name: 'Patiala', count: 1, stateId: 'punjab', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'pb-bathinda', name: 'Bathinda', count: 1, stateId: 'punjab', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'pb-pathankot', name: 'Pathankot', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'pb-hoshiarpur', name: 'Hoshiarpur', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'pb-moga', name: 'Moga', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'pb-firozpur', name: 'Firozpur', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'punjab-batala', name: 'Batala', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'punjab-abohar', name: 'Abohar', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'punjab-malerkotla', name: 'Malerkotla', count: 1, stateId: 'punjab', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'punjab-khanna', name: 'Khanna', count: 1, stateId: 'punjab', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'punjab-muktsar', name: 'Muktsar', count: 1, stateId: 'punjab', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'punjab-barnala', name: 'Barnala', count: 1, stateId: 'punjab', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'hr-karnal', name: 'Karnal', count: 1, stateId: 'haryana', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'hr-rohtak', name: 'Rohtak', count: 1, stateId: 'haryana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'hr-hisar', name: 'Hisar', count: 1, stateId: 'haryana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'hr-ambala', name: 'Ambala', count: 1, stateId: 'haryana', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'hr-yamunanagar', name: 'Yamunanagar', count: 1, stateId: 'haryana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'hr-panchkula', name: 'Panchkula', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hr-kurukshetra', name: 'Kurukshetra', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hr-bhiwani', name: 'Bhiwani', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hr-sirsa', name: 'Sirsa', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'haryana-bahadurgarh', name: 'Bahadurgarh', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'haryana-jind', name: 'Jind', count: 1, stateId: 'haryana', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'haryana-thanesar', name: 'Thanesar', count: 1, stateId: 'haryana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'haryana-kaithal', name: 'Kaithal', count: 1, stateId: 'haryana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'haryana-rewari', name: 'Rewari', count: 1, stateId: 'haryana', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'haryana-palwal', name: 'Palwal', count: 1, stateId: 'haryana', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'upw-meerut', name: 'Meerut', count: 34, stateId: 'up-west', dcCount: 3, popCount: 8, siteCount: 23 },
          { id: 'upw-agra', name: 'Agra', count: 32, stateId: 'up-west', dcCount: 3, popCount: 7, siteCount: 22 },
          { id: 'upw-aligarh', name: 'Aligarh', count: 23, stateId: 'up-west', dcCount: 2, popCount: 5, siteCount: 16 },
          { id: 'upw-mathura', name: 'Mathura', count: 22, stateId: 'up-west', dcCount: 2, popCount: 5, siteCount: 15 },
          { id: 'upw-moradabad', name: 'Moradabad', count: 21, stateId: 'up-west', dcCount: 2, popCount: 5, siteCount: 14 },
          { id: 'upw-bareilly', name: 'Bareilly', count: 21, stateId: 'up-west', dcCount: 2, popCount: 5, siteCount: 14 },
          { id: 'upw-saharanpur', name: 'Saharanpur', count: 19, stateId: 'up-west', dcCount: 1, popCount: 5, siteCount: 13 },
          { id: 'upw-muzaffarnagar', name: 'Muzaffarnagar', count: 16, stateId: 'up-west', dcCount: 1, popCount: 4, siteCount: 11 },
          { id: 'upw-firozabad', name: 'Firozabad', count: 16, stateId: 'up-west', dcCount: 1, popCount: 4, siteCount: 11 },
          { id: 'upw-jhansi', name: 'Jhansi', count: 15, stateId: 'up-west', dcCount: 1, popCount: 4, siteCount: 10 },
          { id: 'upw-rampur', name: 'Rampur', count: 13, stateId: 'up-west', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'upw-shahjahanpur', name: 'Shahjahanpur', count: 13, stateId: 'up-west', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'up-west-budaun', name: 'Budaun', count: 9, stateId: 'up-west', dcCount: 1, popCount: 2, siteCount: 6 },
          { id: 'up-west-hapur', name: 'Hapur', count: 12, stateId: 'up-west', dcCount: 2, popCount: 3, siteCount: 7 },
          { id: 'up-west-sambhal', name: 'Sambhal', count: 13, stateId: 'up-west', dcCount: 1, popCount: 4, siteCount: 8 },
          { id: 'up-west-etawah', name: 'Etawah', count: 14, stateId: 'up-west', dcCount: 1, popCount: 5, siteCount: 8 }
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
          { id: 'uk-dehradun', name: 'Dehradun', count: 1, stateId: 'uttarakhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'uk-haridwar', name: 'Haridwar', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uk-roorkee', name: 'Roorkee', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uk-haldwani', name: 'Haldwani', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uk-rishikesh', name: 'Rishikesh', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uk-nainital', name: 'Nainital', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uttarakhand-rudrapur', name: 'Rudrapur', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uttarakhand-kashipur', name: 'Kashipur', count: 1, stateId: 'uttarakhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'uttarakhand-pithoragarh', name: 'Pithoragarh', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uttarakhand-almora', name: 'Almora', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'uttarakhand-kotdwar', name: 'Kotdwar', count: 1, stateId: 'uttarakhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'uttarakhand-ramnagar', name: 'Ramnagar', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uttarakhand-manglaur', name: 'Manglaur', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'uttarakhand-mussoorie', name: 'Mussoorie', count: 1, stateId: 'uttarakhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'uttarakhand-tehri', name: 'Tehri', count: 1, stateId: 'uttarakhand', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'hp-shimla', name: 'Shimla', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-dharamshala', name: 'Dharamshala', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-mandi', name: 'Mandi', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-solan', name: 'Solan', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-kullu', name: 'Kullu', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-baddi', name: 'Baddi', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'hp-manali', name: 'Manali', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'himachal-bilaspur', name: 'Bilaspur', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'himachal-hamirpur', name: 'Hamirpur', count: 1, stateId: 'himachal', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'himachal-nahan', name: 'Nahan', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'himachal-una', name: 'Una', count: 1, stateId: 'himachal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'himachal-chamba', name: 'Chamba', count: 1, stateId: 'himachal', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'himachal-paonta-sahib', name: 'Paonta Sahib', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'himachal-palampur', name: 'Palampur', count: 1, stateId: 'himachal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'himachal-sundernagar', name: 'Sundernagar', count: 1, stateId: 'himachal', dcCount: 0, popCount: 1, siteCount: 0 }
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
          { id: 'jk-srinagar', name: 'Srinagar', count: 1, stateId: 'jk', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'jk-jammu', name: 'Jammu', count: 1, stateId: 'jk', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'jk-anantnag', name: 'Anantnag', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-baramulla', name: 'Baramulla', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-udhampur', name: 'Udhampur', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-kathua', name: 'Kathua', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-sopore', name: 'Sopore', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-rajouri', name: 'Rajouri', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-poonch', name: 'Poonch', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-kupwara', name: 'Kupwara', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-pulwama', name: 'Pulwama', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-samba', name: 'Samba', count: 1, stateId: 'jk', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'jk-budgam', name: 'Budgam', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-ganderbal', name: 'Ganderbal', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jk-bandipora', name: 'Bandipora', count: 1, stateId: 'jk', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'mh-mumbai', name: 'Mumbai', count: 57, stateId: 'maharashtra', dcCount: 6, popCount: 14, siteCount: 37 },
          { id: 'mh-pune', name: 'Pune', count: 43, stateId: 'maharashtra', dcCount: 5, popCount: 11, siteCount: 27 },
          { id: 'mh-nagpur', name: 'Nagpur', count: 38, stateId: 'maharashtra', dcCount: 3, popCount: 10, siteCount: 25 },
          { id: 'mh-nashik', name: 'Nashik', count: 29, stateId: 'maharashtra', dcCount: 2, popCount: 7, siteCount: 20 },
          { id: 'mh-thane', name: 'Thane', count: 24, stateId: 'maharashtra', dcCount: 2, popCount: 6, siteCount: 16 },
          { id: 'mh-aurangabad', name: 'Aurangabad', count: 20, stateId: 'maharashtra', dcCount: 1, popCount: 5, siteCount: 14 },
          { id: 'mh-solapur', name: 'Solapur', count: 16, stateId: 'maharashtra', dcCount: 1, popCount: 4, siteCount: 11 },
          { id: 'mh-kolhapur', name: 'Kolhapur', count: 15, stateId: 'maharashtra', dcCount: 1, popCount: 4, siteCount: 10 },
          { id: 'mh-amravati', name: 'Amravati', count: 13, stateId: 'maharashtra', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'mh-navi-mumbai', name: 'Navi Mumbai', count: 22, stateId: 'maharashtra', dcCount: 2, popCount: 6, siteCount: 14 },
          { id: 'maharashtra-akola', name: 'Akola', count: 8, stateId: 'maharashtra', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'maharashtra-latur', name: 'Latur', count: 9, stateId: 'maharashtra', dcCount: 1, popCount: 3, siteCount: 5 },
          { id: 'maharashtra-dhule', name: 'Dhule', count: 9, stateId: 'maharashtra', dcCount: 0, popCount: 3, siteCount: 6 },
          { id: 'maharashtra-ahmednagar', name: 'Ahmednagar', count: 11, stateId: 'maharashtra', dcCount: 1, popCount: 4, siteCount: 6 },
          { id: 'maharashtra-chandrapur', name: 'Chandrapur', count: 10, stateId: 'maharashtra', dcCount: 1, popCount: 2, siteCount: 7 },
          { id: 'maharashtra-parbhani', name: 'Parbhani', count: 10, stateId: 'maharashtra', dcCount: 0, popCount: 2, siteCount: 8 }
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
          { id: 'gj-ahmedabad', name: 'Ahmedabad', count: 39, stateId: 'gujarat', dcCount: 4, popCount: 9, siteCount: 26 },
          { id: 'gj-surat', name: 'Surat', count: 32, stateId: 'gujarat', dcCount: 3, popCount: 8, siteCount: 21 },
          { id: 'gj-vadodara', name: 'Vadodara', count: 25, stateId: 'gujarat', dcCount: 2, popCount: 6, siteCount: 17 },
          { id: 'gj-rajkot', name: 'Rajkot', count: 20, stateId: 'gujarat', dcCount: 1, popCount: 5, siteCount: 14 },
          { id: 'gj-gandhinagar', name: 'Gandhinagar', count: 17, stateId: 'gujarat', dcCount: 2, popCount: 4, siteCount: 11 },
          { id: 'gujarat-bhavnagar', name: 'Bhavnagar', count: 8, stateId: 'gujarat', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'gujarat-jamnagar', name: 'Jamnagar', count: 9, stateId: 'gujarat', dcCount: 1, popCount: 3, siteCount: 5 },
          { id: 'gujarat-junagadh', name: 'Junagadh', count: 9, stateId: 'gujarat', dcCount: 0, popCount: 3, siteCount: 6 },
          { id: 'gujarat-anand', name: 'Anand', count: 10, stateId: 'gujarat', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'gujarat-navsari', name: 'Navsari', count: 10, stateId: 'gujarat', dcCount: 1, popCount: 2, siteCount: 7 },
          { id: 'gujarat-morbi', name: 'Morbi', count: 10, stateId: 'gujarat', dcCount: 0, popCount: 2, siteCount: 8 },
          { id: 'gujarat-nadiad', name: 'Nadiad', count: 12, stateId: 'gujarat', dcCount: 1, popCount: 3, siteCount: 8 },
          { id: 'gujarat-surendranagar', name: 'Surendranagar', count: 13, stateId: 'gujarat', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'gujarat-bharuch', name: 'Bharuch', count: 11, stateId: 'gujarat', dcCount: 0, popCount: 2, siteCount: 9 },
          { id: 'gujarat-mehsana', name: 'Mehsana', count: 8, stateId: 'gujarat', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'gujarat-bhuj', name: 'Bhuj', count: 9, stateId: 'gujarat', dcCount: 1, popCount: 3, siteCount: 5 }
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
          { id: 'rj-jaipur', name: 'Jaipur', count: 1, stateId: 'rajasthan', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'rj-jodhpur', name: 'Jodhpur', count: 1, stateId: 'rajasthan', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'rj-udaipur', name: 'Udaipur', count: 1, stateId: 'rajasthan', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'rj-kota', name: 'Kota', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'rajasthan-bikaner', name: 'Bikaner', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-ajmer', name: 'Ajmer', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-bhilwara', name: 'Bhilwara', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-alwar', name: 'Alwar', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'rajasthan-bharatpur', name: 'Bharatpur', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-sikar', name: 'Sikar', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-pali', name: 'Pali', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-sri-ganganagar', name: 'Sri Ganganagar', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'rajasthan-beawar', name: 'Beawar', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-hanumangarh', name: 'Hanumangarh', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-dholpur', name: 'Dholpur', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'rajasthan-tonk', name: 'Tonk', count: 1, stateId: 'rajasthan', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'ga-panaji', name: 'Panaji', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'ga-margao', name: 'Margao', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'ga-vasco', name: 'Vasco da Gama', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-mapusa', name: 'Mapusa', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-ponda', name: 'Ponda', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-bicholim', name: 'Bicholim', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-curchorem', name: 'Curchorem', count: 1, stateId: 'goa', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'goa-cuncolim', name: 'Cuncolim', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-valpoi', name: 'Valpoi', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-pernem', name: 'Pernem', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-canacona', name: 'Canacona', count: 1, stateId: 'goa', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'goa-quepem', name: 'Quepem', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-sanguem', name: 'Sanguem', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-porvorim', name: 'Porvorim', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'goa-calangute', name: 'Calangute', count: 1, stateId: 'goa', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'mp-bhopal', name: 'Bhopal', count: 28, stateId: 'mp', dcCount: 3, popCount: 7, siteCount: 18 },
          { id: 'mp-indore', name: 'Indore', count: 30, stateId: 'mp', dcCount: 3, popCount: 7, siteCount: 20 },
          { id: 'mp-jabalpur', name: 'Jabalpur', count: 19, stateId: 'mp', dcCount: 1, popCount: 5, siteCount: 13 },
          { id: 'mp-gwalior', name: 'Gwalior', count: 17, stateId: 'mp', dcCount: 1, popCount: 4, siteCount: 12 },
          { id: 'mp-ujjain', name: 'Ujjain', count: 8, stateId: 'mp', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'mp-sagar', name: 'Sagar', count: 10, stateId: 'mp', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'mp-dewas', name: 'Dewas', count: 10, stateId: 'mp', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'mp-satna', name: 'Satna', count: 12, stateId: 'mp', dcCount: 1, popCount: 4, siteCount: 7 },
          { id: 'mp-ratlam', name: 'Ratlam', count: 11, stateId: 'mp', dcCount: 1, popCount: 2, siteCount: 8 },
          { id: 'mp-rewa', name: 'Rewa', count: 11, stateId: 'mp', dcCount: 1, popCount: 2, siteCount: 8 },
          { id: 'mp-katni', name: 'Katni', count: 13, stateId: 'mp', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'mp-singrauli', name: 'Singrauli', count: 13, stateId: 'mp', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'mp-burhanpur', name: 'Burhanpur', count: 12, stateId: 'mp', dcCount: 0, popCount: 2, siteCount: 10 },
          { id: 'mp-khandwa', name: 'Khandwa', count: 8, stateId: 'mp', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'mp-morena', name: 'Morena', count: 10, stateId: 'mp', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'mp-bhind', name: 'Bhind', count: 9, stateId: 'mp', dcCount: 0, popCount: 3, siteCount: 6 }
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
          { id: 'cg-raipur', name: 'Raipur', count: 1, stateId: 'chhattisgarh', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'cg-bhilai', name: 'Bhilai', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'cg-bilaspur', name: 'Bilaspur', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-korba', name: 'Korba', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-rajnandgaon', name: 'Rajnandgaon', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-jagdalpur', name: 'Jagdalpur', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-raigarh', name: 'Raigarh', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'chhattisgarh-ambikapur', name: 'Ambikapur', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-durg', name: 'Durg', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-dhamtari', name: 'Dhamtari', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-mahasamund', name: 'Mahasamund', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'chhattisgarh-chirmiri', name: 'Chirmiri', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-bhatapara', name: 'Bhatapara', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-kanker', name: 'Kanker', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'chhattisgarh-kawardha', name: 'Kawardha', count: 1, stateId: 'chhattisgarh', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'dnh-silvassa', name: 'Silvassa', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-daman', name: 'Daman', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-diu', name: 'Diu', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-dadra', name: 'Dadra', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-nani-daman', name: 'Nani Daman', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-moti-daman', name: 'Moti Daman', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-amli', name: 'Amli', count: 1, stateId: 'dnh', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'dnh-naroli', name: 'Naroli', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-kachigam', name: 'Kachigam', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-dunetha', name: 'Dunetha', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-kilvani', name: 'Kilvani', count: 1, stateId: 'dnh', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'dnh-masat', name: 'Masat', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-samarvarni', name: 'Samarvarni', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-rakholi', name: 'Rakholi', count: 1, stateId: 'dnh', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'dnh-vapi-border-zone', name: 'Vapi Border Zone', count: 1, stateId: 'dnh', dcCount: 0, popCount: 1, siteCount: 0 }
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
          { id: 'wb-kolkata', name: 'Kolkata', count: 1, stateId: 'west-bengal', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'wb-howrah', name: 'Howrah', count: 1, stateId: 'west-bengal', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'wb-siliguri', name: 'Siliguri', count: 1, stateId: 'west-bengal', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'wb-durgapur', name: 'Durgapur', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-asansol', name: 'Asansol', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-bardhaman', name: 'Bardhaman', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-malda', name: 'Malda', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-baharampur', name: 'Baharampur', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-habra', name: 'Habra', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-kharagpur', name: 'Kharagpur', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-shantipur', name: 'Shantipur', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-dankuni', name: 'Dankuni', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-dhulian', name: 'Dhulian', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-ranaghat', name: 'Ranaghat', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'west-bengal-haldia', name: 'Haldia', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'west-bengal-darjeeling', name: 'Darjeeling', count: 1, stateId: 'west-bengal', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'br-patna', name: 'Patna', count: 1, stateId: 'bihar', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'br-gaya', name: 'Gaya', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'br-muzaffarpur', name: 'Muzaffarpur', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'bihar-purnia', name: 'Purnia', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-darbhanga', name: 'Darbhanga', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-bihar-sharif', name: 'Bihar Sharif', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-arrah', name: 'Arrah', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'bihar-begusarai', name: 'Begusarai', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-katihar', name: 'Katihar', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-munger', name: 'Munger', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-chhapra', name: 'Chhapra', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'bihar-danapur', name: 'Danapur', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-bettiah', name: 'Bettiah', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-saharsa', name: 'Saharsa', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'bihar-sasaram', name: 'Sasaram', count: 1, stateId: 'bihar', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'bihar-siwan', name: 'Siwan', count: 1, stateId: 'bihar', dcCount: 0, popCount: 1, siteCount: 0 }
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
          { id: 'od-bhubaneswar', name: 'Bhubaneswar', count: 1, stateId: 'odisha', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'od-cuttack', name: 'Cuttack', count: 1, stateId: 'odisha', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'od-rourkela', name: 'Rourkela', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-berhampur', name: 'Berhampur', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-sambalpur', name: 'Sambalpur', count: 1, stateId: 'odisha', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'odisha-puri', name: 'Puri', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-balasore', name: 'Balasore', count: 1, stateId: 'odisha', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'odisha-bhadrak', name: 'Bhadrak', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-baripada', name: 'Baripada', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-jharsuguda', name: 'Jharsuguda', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-jeypore', name: 'Jeypore', count: 1, stateId: 'odisha', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'odisha-bargarh', name: 'Bargarh', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-rayagada', name: 'Rayagada', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-bolangir', name: 'Bolangir', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'odisha-angul', name: 'Angul', count: 1, stateId: 'odisha', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'jh-ranchi', name: 'Ranchi', count: 1, stateId: 'jharkhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'jh-jamshedpur', name: 'Jamshedpur', count: 1, stateId: 'jharkhand', dcCount: 1, popCount: 0, siteCount: 0 },
          { id: 'jharkhand-bokaro-steel-city', name: 'Bokaro Steel City', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-deoghar', name: 'Deoghar', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'jharkhand-phusro', name: 'Phusro', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-hazaribagh', name: 'Hazaribagh', count: 2, stateId: 'jharkhand', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'jharkhand-giridih', name: 'Giridih', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-ramgarh', name: 'Ramgarh', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-medininagar', name: 'Medininagar', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-chirkunda', name: 'Chirkunda', count: 2, stateId: 'jharkhand', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'jharkhand-chaibasa', name: 'Chaibasa', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-gumla', name: 'Gumla', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-dumka', name: 'Dumka', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'jharkhand-godda', name: 'Godda', count: 1, stateId: 'jharkhand', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'jharkhand-dhanbad', name: 'Dhanbad', count: 2, stateId: 'jharkhand', dcCount: 0, popCount: 1, siteCount: 1 }
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
          { id: 'as-guwahati', name: 'Guwahati', count: 2, stateId: 'assam', dcCount: 1, popCount: 1, siteCount: 0 },
          { id: 'as-silchar', name: 'Silchar', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-dibrugarh', name: 'Dibrugarh', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-jorhat', name: 'Jorhat', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-nagaon', name: 'Nagaon', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-tinsukia', name: 'Tinsukia', count: 2, stateId: 'assam', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'assam-tezpur', name: 'Tezpur', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-bongaigaon', name: 'Bongaigaon', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-dhubri', name: 'Dhubri', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-diphu', name: 'Diphu', count: 2, stateId: 'assam', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'assam-north-lakhimpur', name: 'North Lakhimpur', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-karimganj', name: 'Karimganj', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-sivasagar', name: 'Sivasagar', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-goalpara', name: 'Goalpara', count: 1, stateId: 'assam', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'assam-barpeta', name: 'Barpeta', count: 2, stateId: 'assam', dcCount: 0, popCount: 1, siteCount: 1 }
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
          { id: 'sk-gangtok', name: 'Gangtok', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sk-namchi', name: 'Namchi', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sk-geyzing', name: 'Geyzing', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'sk-mangan', name: 'Mangan', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'sikkim-rangpo', name: 'Rangpo', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'sikkim-jorethang', name: 'Jorethang', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-singtam', name: 'Singtam', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-ravangla', name: 'Ravangla', count: 2, stateId: 'sikkim', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'sikkim-pakyong', name: 'Pakyong', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-soreng', name: 'Soreng', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-yuksom', name: 'Yuksom', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-lachung', name: 'Lachung', count: 2, stateId: 'sikkim', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'sikkim-chungthang', name: 'Chungthang', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-rhenock', name: 'Rhenock', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'sikkim-nayabazar', name: 'Nayabazar', count: 1, stateId: 'sikkim', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'ne-shillong', name: 'Shillong', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'ne-imphal', name: 'Imphal', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-aizawl', name: 'Aizawl', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-kohima', name: 'Kohima', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-agartala', name: 'Agartala', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-itanagar', name: 'Itanagar', count: 2, stateId: 'northeast', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'northeast-dimapur', name: 'Dimapur', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-tura', name: 'Tura', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-lunglei', name: 'Lunglei', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-churachandpur', name: 'Churachandpur', count: 2, stateId: 'northeast', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'northeast-mokokchung', name: 'Mokokchung', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-dharmanagar', name: 'Dharmanagar', count: 1, stateId: 'northeast', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'northeast-pasighat', name: 'Pasighat', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-naharlagun', name: 'Naharlagun', count: 1, stateId: 'northeast', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'northeast-along', name: 'Along', count: 2, stateId: 'northeast', dcCount: 0, popCount: 1, siteCount: 1 }
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
          { id: 'ka-bengaluru', name: 'Bengaluru', count: 76, stateId: 'karnataka', dcCount: 8, popCount: 18, siteCount: 50 },
          { id: 'ka-mysuru', name: 'Mysuru', count: 30, stateId: 'karnataka', dcCount: 3, popCount: 8, siteCount: 19 },
          { id: 'ka-mangalore', name: 'Mangaluru', count: 24, stateId: 'karnataka', dcCount: 2, popCount: 6, siteCount: 16 },
          { id: 'ka-hubballi', name: 'Hubballi', count: 21, stateId: 'karnataka', dcCount: 2, popCount: 5, siteCount: 14 },
          { id: 'karnataka-belagavi', name: 'Belagavi', count: 11, stateId: 'karnataka', dcCount: 1, popCount: 3, siteCount: 7 },
          { id: 'karnataka-kalaburagi', name: 'Kalaburagi', count: 13, stateId: 'karnataka', dcCount: 2, popCount: 4, siteCount: 7 },
          { id: 'karnataka-davanagere', name: 'Davanagere', count: 12, stateId: 'karnataka', dcCount: 0, popCount: 4, siteCount: 8 },
          { id: 'karnataka-ballari', name: 'Ballari', count: 15, stateId: 'karnataka', dcCount: 1, popCount: 5, siteCount: 9 },
          { id: 'karnataka-vijayapura', name: 'Vijayapura', count: 14, stateId: 'karnataka', dcCount: 2, popCount: 2, siteCount: 10 },
          { id: 'karnataka-shivamogga', name: 'Shivamogga', count: 13, stateId: 'karnataka', dcCount: 0, popCount: 3, siteCount: 10 },
          { id: 'karnataka-tumakuru', name: 'Tumakuru', count: 16, stateId: 'karnataka', dcCount: 1, popCount: 4, siteCount: 11 },
          { id: 'karnataka-raichur', name: 'Raichur', count: 19, stateId: 'karnataka', dcCount: 2, popCount: 5, siteCount: 12 },
          { id: 'karnataka-bidar', name: 'Bidar', count: 14, stateId: 'karnataka', dcCount: 0, popCount: 2, siteCount: 12 },
          { id: 'karnataka-hosapete', name: 'Hosapete', count: 10, stateId: 'karnataka', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'karnataka-gadag', name: 'Gadag', count: 11, stateId: 'karnataka', dcCount: 1, popCount: 3, siteCount: 7 }
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
          { id: 'tn-chennai', name: 'Chennai', count: 51, stateId: 'tamilnadu', dcCount: 5, popCount: 12, siteCount: 34 },
          { id: 'tn-coimbatore', name: 'Coimbatore', count: 29, stateId: 'tamilnadu', dcCount: 3, popCount: 7, siteCount: 19 },
          { id: 'tn-madurai', name: 'Madurai', count: 19, stateId: 'tamilnadu', dcCount: 1, popCount: 5, siteCount: 13 },
          { id: 'tn-salem', name: 'Salem', count: 15, stateId: 'tamilnadu', dcCount: 1, popCount: 4, siteCount: 10 },
          { id: 'tamilnadu-tiruchirappalli', name: 'Tiruchirappalli', count: 8, stateId: 'tamilnadu', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'tamilnadu-tiruppur', name: 'Tiruppur', count: 9, stateId: 'tamilnadu', dcCount: 1, popCount: 3, siteCount: 5 },
          { id: 'tamilnadu-erode', name: 'Erode', count: 9, stateId: 'tamilnadu', dcCount: 0, popCount: 3, siteCount: 6 },
          { id: 'tamilnadu-tirunelveli', name: 'Tirunelveli', count: 11, stateId: 'tamilnadu', dcCount: 1, popCount: 4, siteCount: 6 },
          { id: 'tamilnadu-vellore', name: 'Vellore', count: 10, stateId: 'tamilnadu', dcCount: 1, popCount: 2, siteCount: 7 },
          { id: 'tamilnadu-thoothukudi', name: 'Thoothukudi', count: 9, stateId: 'tamilnadu', dcCount: 0, popCount: 2, siteCount: 7 },
          { id: 'tamilnadu-dindigul', name: 'Dindigul', count: 12, stateId: 'tamilnadu', dcCount: 1, popCount: 3, siteCount: 8 },
          { id: 'tamilnadu-thanjavur', name: 'Thanjavur', count: 13, stateId: 'tamilnadu', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'tamilnadu-karur', name: 'Karur', count: 10, stateId: 'tamilnadu', dcCount: 0, popCount: 1, siteCount: 9 },
          { id: 'tamilnadu-sivakasi', name: 'Sivakasi', count: 8, stateId: 'tamilnadu', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'tamilnadu-ooty', name: 'Ooty', count: 8, stateId: 'tamilnadu', dcCount: 1, popCount: 2, siteCount: 5 }
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
          { id: 'tg-hyderabad', name: 'Hyderabad', count: 2, stateId: 'telangana', dcCount: 1, popCount: 1, siteCount: 0 },
          { id: 'tg-warangal', name: 'Warangal', count: 2, stateId: 'telangana', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'tg-nizamabad', name: 'Nizamabad', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-khammam', name: 'Khammam', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-karimnagar', name: 'Karimnagar', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-ramagundam', name: 'Ramagundam', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-mahbubnagar', name: 'Mahbubnagar', count: 2, stateId: 'telangana', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'telangana-nalgonda', name: 'Nalgonda', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-adilabad', name: 'Adilabad', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-suryapet', name: 'Suryapet', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-miryalaguda', name: 'Miryalaguda', count: 2, stateId: 'telangana', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'telangana-siddipet', name: 'Siddipet', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-jagtial', name: 'Jagtial', count: 1, stateId: 'telangana', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'telangana-nirmal', name: 'Nirmal', count: 1, stateId: 'telangana', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'telangana-kamareddy', name: 'Kamareddy', count: 1, stateId: 'telangana', dcCount: 0, popCount: 1, siteCount: 0 }
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
          { id: 'ap-visakhapatnam', name: 'Visakhapatnam', count: 30, stateId: 'ap', dcCount: 3, popCount: 7, siteCount: 20 },
          { id: 'ap-vijayawada', name: 'Vijayawada', count: 25, stateId: 'ap', dcCount: 2, popCount: 6, siteCount: 17 },
          { id: 'ap-guntur', name: 'Guntur', count: 16, stateId: 'ap', dcCount: 1, popCount: 4, siteCount: 11 },
          { id: 'ap-nellore', name: 'Nellore', count: 8, stateId: 'ap', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'ap-kurnool', name: 'Kurnool', count: 9, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 5 },
          { id: 'ap-kakinada', name: 'Kakinada', count: 10, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'ap-rajamahendravaram', name: 'Rajamahendravaram', count: 10, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 6 },
          { id: 'ap-tirupati', name: 'Tirupati', count: 10, stateId: 'ap', dcCount: 1, popCount: 2, siteCount: 7 },
          { id: 'ap-kadapa', name: 'Kadapa', count: 9, stateId: 'ap', dcCount: 0, popCount: 2, siteCount: 7 },
          { id: 'ap-anantapur', name: 'Anantapur', count: 12, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 8 },
          { id: 'ap-vizianagaram', name: 'Vizianagaram', count: 13, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 9 },
          { id: 'ap-eluru', name: 'Eluru', count: 11, stateId: 'ap', dcCount: 0, popCount: 2, siteCount: 9 },
          { id: 'ap-ongole', name: 'Ongole', count: 8, stateId: 'ap', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'ap-nandyal', name: 'Nandyal', count: 8, stateId: 'ap', dcCount: 1, popCount: 2, siteCount: 5 },
          { id: 'ap-machilipatnam', name: 'Machilipatnam', count: 9, stateId: 'ap', dcCount: 0, popCount: 3, siteCount: 6 },
          { id: 'ap-srikakulam', name: 'Srikakulam', count: 10, stateId: 'ap', dcCount: 1, popCount: 3, siteCount: 6 }
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
          { id: 'kl-kochi', name: 'Kochi', count: 2, stateId: 'kerala', dcCount: 1, popCount: 1, siteCount: 0 },
          { id: 'kl-thiruvananthapuram', name: 'Thiruvananthapuram', count: 2, stateId: 'kerala', dcCount: 1, popCount: 1, siteCount: 0 },
          { id: 'kl-kozhikode', name: 'Kozhikode', count: 2, stateId: 'kerala', dcCount: 1, popCount: 1, siteCount: 0 },
          { id: 'kerala-kollam', name: 'Kollam', count: 1, stateId: 'kerala', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'kerala-thrissur', name: 'Thrissur', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-kannur', name: 'Kannur', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-alappuzha', name: 'Alappuzha', count: 2, stateId: 'kerala', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'kerala-kottayam', name: 'Kottayam', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-palakkad', name: 'Palakkad', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-manjeri', name: 'Manjeri', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-thalassery', name: 'Thalassery', count: 2, stateId: 'kerala', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'kerala-ponnani', name: 'Ponnani', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-vatakara', name: 'Vatakara', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-kanhangad', name: 'Kanhangad', count: 1, stateId: 'kerala', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'kerala-payyanur', name: 'Payyanur', count: 1, stateId: 'kerala', dcCount: 0, popCount: 1, siteCount: 0 }
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
          { id: 'py-pondicherry', name: 'Puducherry', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-karaikal', name: 'Karaikal', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-mahe', name: 'Mahe', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-yanam', name: 'Yanam', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-ozhukarai', name: 'Ozhukarai', count: 2, stateId: 'puducherry', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'puducherry-villianur', name: 'Villianur', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-ariyankuppam', name: 'Ariyankuppam', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-bahour', name: 'Bahour', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-mannadipet', name: 'Mannadipet', count: 2, stateId: 'puducherry', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'puducherry-nettapakkam', name: 'Nettapakkam', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-kottucherry', name: 'Kottucherry', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-thirunallar', name: 'Thirunallar', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-neravy', name: 'Neravy', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'puducherry-kirumampakkam', name: 'Kirumampakkam', count: 2, stateId: 'puducherry', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'puducherry-lawspet', name: 'Lawspet', count: 1, stateId: 'puducherry', dcCount: 0, popCount: 0, siteCount: 1 }
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
          { id: 'an-portblair', name: 'Port Blair', count: 1, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'andaman-diglipur', name: 'Diglipur', count: 1, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'andaman-mayabunder', name: 'Mayabunder', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-rangat', name: 'Rangat', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-havelock', name: 'Havelock (Swaraj Dweep)', count: 2, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'andaman-neil-island', name: 'Neil Island (Shaheed Dweep)', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-car-nicobar', name: 'Car Nicobar', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-campbell-bay', name: 'Campbell Bay', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-little-andaman', name: 'Little Andaman', count: 2, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'andaman-baratang', name: 'Baratang', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-wandoor', name: 'Wandoor', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 },
          { id: 'andaman-garacharma', name: 'Garacharma', count: 1, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'andaman-prothrapur', name: 'Prothrapur', count: 1, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 0 },
          { id: 'andaman-bambooflat', name: 'Bambooflat', count: 2, stateId: 'andaman', dcCount: 0, popCount: 1, siteCount: 1 },
          { id: 'andaman-ferrargunj', name: 'Ferrargunj', count: 1, stateId: 'andaman', dcCount: 0, popCount: 0, siteCount: 1 }
        ]
      }
    ]
  }
];

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
  const count = facilityType === 'dc' ? (city?.dcCount ?? 14) : facilityType === 'pop' ? (city?.popCount ?? 42) : (city?.siteCount ?? 284);

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
      const devCount = facilityDeviceCount(`${cityId}-dc-${i}`, 'dc');
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
      const devCount = facilityDeviceCount(`${cityId}-pop-${i}`, 'pop');
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
      const devCount = facilityDeviceCount(`${cityId}-site-${i}`, 'site');
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
  status: 'Verified' | 'Drifted' | 'Stale' | 'Missing' | 'Not discovered';
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
  { nameSuffix: 'MGMT-SW01', model: 'Catalyst 9300', vendor: 'CISCO', osVersion: '17.9.2', serialPrefix: 'FOC2301', portsUsed: 44, portsTotal: 48, locSuffix: 'RK-M01-U42', systemDescription: 'Cisco Catalyst 9300 Out-of-Band Management Switch', status: 'Verified' },
  { nameSuffix: 'MGMT-SW02', model: 'EX3400', vendor: 'JUNIPER', osVersion: '21.2R3', serialPrefix: 'JN3401', portsUsed: 41, portsTotal: 48, locSuffix: 'RK-M02-U42', systemDescription: 'Juniper EX3400 Out-of-Band Management Switch', status: 'Stale' }
];

const DC_DWDM_TEMPLATES: DeviceTemplate[] = [
  { nameSuffix: 'DWDM-OADM01', model: 'OADM', vendor: 'JUNIPER', osVersion: '21.5.1', serialPrefix: 'JNOADM', portsUsed: 14, portsTotal: 16, locSuffix: 'OT-1 · slot 3', systemDescription: '16-channel Optical Add-Drop Multiplexer, core transport', status: 'Verified' },
  { nameSuffix: 'DWDM-ILA01', model: 'ILA', vendor: 'CISCO', osVersion: '11.1.2', serialPrefix: 'FOCILA', portsUsed: 6, portsTotal: 8, locSuffix: 'OT-2 · slot 5', systemDescription: 'In-Line Optical Amplifier, long-haul span', status: 'Not discovered' },
  { nameSuffix: 'DWDM-ROADM01', model: 'ROADM', vendor: 'CISCO', osVersion: '11.0.1', serialPrefix: 'FOCROA', portsUsed: 18, portsTotal: 24, locSuffix: 'OT-1 · slot 7', systemDescription: 'Multi-degree reconfigurable optical add-drop mux', status: 'Verified' },
  { nameSuffix: 'DWDM-REGEN01', model: 'Regen', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NKREGN', portsUsed: 10, portsTotal: 16, locSuffix: 'OT-3 · slot 2', systemDescription: 'Optical regenerator 3R, inter-city lambda', status: 'Not discovered' },
  { nameSuffix: 'DWDM-TRANS01', model: 'Transponder', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NKTRNS', portsUsed: 15, portsTotal: 16, locSuffix: 'OT-3 · slot 4', systemDescription: '100G/400G coherent transponder', status: 'Verified' },
  { nameSuffix: 'DWDM-MUX01', model: 'Mux/Demux', vendor: 'HUAWEI', osVersion: 'V100R020', serialPrefix: 'HWMUXD', portsUsed: 15, portsTotal: 16, locSuffix: 'OT-4 · slot 1', systemDescription: '40-channel optical multiplexer/demultiplexer', status: 'Verified' }
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
  { nameSuffix: 'OPT-ROADM01', model: 'ROADM', vendor: 'CISCO', osVersion: '11.0.1', serialPrefix: 'FOCRPO', portsUsed: 10, portsTotal: 16, locSuffix: 'OT-1 · slot 2', systemDescription: 'Metro ROADM terminal, ring aggregation', status: 'Verified' },
  { nameSuffix: 'OPT-OADM01', model: 'OADM', vendor: 'JUNIPER', osVersion: '21.5.1', serialPrefix: 'JNOADP', portsUsed: 8, portsTotal: 16, locSuffix: 'OT-1 · slot 5', systemDescription: 'Metro Optical Add-Drop Multiplexer', status: 'Not discovered' },
  { nameSuffix: 'OPT-TRANS01', model: 'Transponder', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NKTRNP', portsUsed: 8, portsTotal: 8, locSuffix: 'OT-2 · slot 3', systemDescription: '10G/100G metro transponder', status: 'Verified' },
  { nameSuffix: 'OPT-ILA01', model: 'ILA', vendor: 'CISCO', osVersion: '11.0.0', serialPrefix: 'FOCILP', portsUsed: 4, portsTotal: 4, locSuffix: 'OT-2 · slot 6', systemDescription: 'In-Line Amplifier, metro fiber span', status: 'Not discovered' },
  { nameSuffix: 'OPT-MUX01', model: 'Mux/Demux', vendor: 'HUAWEI', osVersion: 'V100R020', serialPrefix: 'HWMUXP', portsUsed: 14, portsTotal: 16, locSuffix: 'OT-3 · slot 1', systemDescription: 'Metro optical multiplexer unit', status: 'Verified' },
  { nameSuffix: 'OPT-REGEN01', model: 'Regen', vendor: 'NOKIA', osVersion: '22.1.2', serialPrefix: 'NKREGP', portsUsed: 7, portsTotal: 8, locSuffix: 'OT-3 · slot 6', systemDescription: 'Optical regenerator, ring protection', status: 'Not discovered' }
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

/* Device mix of one facility, derived from its id so every render of the same
   facility lists the same estate. A DC carries 4-8 switches per router, a PoP
   2-4 core routers' worth of aggregation, a site a small router/switch stack
   plus its radios; DWDM is far scarcer than routers. */
const facilitySeed = (facilityId: string) => facilityId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

interface FacilityMix { routers: number; switches: number; dwdm: number; gnodeb: number; enodeb: number }

function facilityMix(facilityId: string, facilityType: 'dc' | 'pop' | 'site'): FacilityMix {
  const seed = facilitySeed(facilityId);
  if (facilityType === 'dc') {
    const routers = 8 + (seed % 9);
    return { routers, switches: routers * 4 + (seed % 5) * 2, dwdm: 2 + (seed % 3), gnodeb: 0, enodeb: 0 };
  }
  if (facilityType === 'pop') {
    const routers = 4 + (seed % 5);
    return { routers, switches: routers * 4 + (seed % 3) * 2, dwdm: 2 + (seed % 2), gnodeb: 0, enodeb: 0 };
  }
  let gnodeb = seed % 3 !== 0 ? 4 + (seed % 5) : 0;
  let enodeb = seed % 2 === 0 ? 4 + (seed % 5) : 0;
  if (!gnodeb && !enodeb) enodeb = 4 + (seed % 5);
  return { routers: 2 + (seed % 3), switches: 2 + (seed % 3), dwdm: 0, gnodeb, enodeb };
}

export const facilityDeviceCount = (facilityId: string, facilityType: 'dc' | 'pop' | 'site') => {
  const m = facilityMix(facilityId, facilityType);
  return m.routers + m.switches + m.dwdm + m.gnodeb + m.enodeb;
};

/* a template list is only 16 long; a DC wants up to 72 switches, so past the
   catalogue it cycles through the same models under a running unit number */
function expandTemplates(templates: DeviceTemplate[], n: number): DeviceTemplate[] {
  return Array.from({ length: n }, (_, i) => {
    const t = templates[i % templates.length];
    if (i < templates.length) return t;
    const round = Math.floor(i / templates.length) + 1;
    return {
      ...t,
      nameSuffix: `${t.nameSuffix}-U${round}`,
      portsUsed: Math.max(1, t.portsUsed - (round % 3)),
      status: i % 9 === 4 ? 'Drifted' : 'Verified'
    };
  });
}

export function getNetworkElementsForFacility(cityId: string, facility: FacilityItem): NetworkElementRow[] {
  const info = getCityById(cityId);
  const regionName = info?.region.name.replace(' Region', '') || 'North';
  const code = facility.code;
  const seed = facilitySeed(facility.id);
  const mix = facilityMix(facility.id, facility.facilityType);

  const mapTemplates = (
    templates: DeviceTemplate[],
    category: 'Router' | 'Switch' | 'DWDM' | 'eNodeB' | 'gNodeB',
    ipSubnet: number,
    facilityType: 'dc' | 'pop' | 'site'
  ): NetworkElementRow[] => {
    return templates.map((tmpl, idx) => ({
      id: `${facility.id}-${category.toLowerCase()}-${idx + 1}`,
      /* DWDM keeps its own two-state ledger; everything else may be missing from the network */
      status: category !== 'DWDM' && (idx + seed) % 31 === 0 ? 'Missing' : tmpl.status,
      name: `${code}-${tmpl.nameSuffix}`,
      ip: `172.31.${ipSubnet + (seed % 50)}.${idx + 1}`,
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
      ...mapTemplates(expandTemplates(DC_ROUTER_TEMPLATES, mix.routers), 'Router', 10, 'dc'),
      ...mapTemplates(expandTemplates(DC_SWITCH_TEMPLATES, mix.switches), 'Switch', 14, 'dc'),
      ...mapTemplates(DC_DWDM_TEMPLATES.slice(0, mix.dwdm), 'DWDM', 12, 'dc')
    ];
  }

  if (facility.facilityType === 'pop') {
    return [
      ...mapTemplates(expandTemplates(POP_ROUTER_TEMPLATES, mix.routers), 'Router', 20, 'pop'),
      ...mapTemplates(expandTemplates(POP_SWITCH_TEMPLATES, mix.switches), 'Switch', 24, 'pop'),
      ...mapTemplates(POP_DWDM_TEMPLATES.slice(0, mix.dwdm), 'DWDM', 22, 'pop')
    ];
  }

  // Sites (Cell Towers, Rooftops, IBS)
  return [
    ...mapTemplates(expandTemplates(SITE_GNODEB_TEMPLATES, mix.gnodeb), 'gNodeB', 95, 'site'),
    ...mapTemplates(expandTemplates(SITE_ENODEB_TEMPLATES, mix.enodeb), 'eNodeB', 90, 'site'),
    ...mapTemplates(expandTemplates(SITE_ROUTER_TEMPLATES, mix.routers), 'Router', 130, 'site'),
    ...mapTemplates(expandTemplates(SITE_SWITCH_TEMPLATES, mix.switches), 'Switch', 140, 'site')
  ];
}
