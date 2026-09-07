/* The location sample the prototype ships; totals come from the ledger. */
export interface Location { id: string; name: string; type: string; cat: string; st: string; city: string; state: string; addr: string; ne: number; disc: number; lat: number; lon: number }
export const LOCATIONS: Location[] = [
  { id: "BGLK-277", name: "KA-BGLK-277", type: "POP", cat: "Central", st: "On-air", city: "Bagalkot", state: "Karnataka", addr: "277, Bagalkot", ne: 25, disc: 17, lat: 16.181, lon: 75.696 },
  { id: "DEL-279", name: "DEL-279", type: "Cell Site", cat: "Edge", st: "On-air", city: "Delhi", state: "Delhi", addr: "279, Delhi", ne: 14, disc: 14, lat: 28.644, lon: 77.216 },
  { id: "INDR-275", name: "MP-INDR-275", type: "Macro-O", cat: "Edge", st: "On-air", city: "Indore", state: "Madhya Pradesh", addr: "275, Indore", ne: 11, disc: 10, lat: 22.719, lon: 75.857 },
  { id: "INDR-401", name: "MP-RG-411", type: "Micro-CO", cat: "Regional", st: "In progress", city: "Indore", state: "Madhya Pradesh", addr: "Indore", ne: 8, disc: 6, lat: 22.75, lon: 75.9 },
  { id: "BGLK_075", name: "BGLK_075", type: "Micro-CO", cat: "Edge", st: "Planned", city: "Bagalkot", state: "Karnataka", addr: "200 Consilium Pl", ne: 4, disc: 0, lat: 16.203, lon: 75.723 },
  { id: "MT702", name: "MT702", type: "Micro-CO", cat: "Central", st: "Planned", city: "Subdega", state: "Odisha", addr: "Subdega", ne: 6, disc: 0, lat: 21.95, lon: 84.05 },
  { id: "VJA-118", name: "Vijayawada", type: "Macro-O", cat: "Edge", st: "On-air", city: "Vijayawada", state: "Andhra Pradesh", addr: "Vijayawada", ne: 9, disc: 8, lat: 16.506, lon: 80.648 },
  { id: "MP-INDR-510", name: "MP-INDR-397", type: "Macro-O", cat: "Edge", st: "In progress", city: "Indore", state: "Madhya Pradesh", addr: "Scheme 78-Part-ii", ne: 5, disc: 3, lat: 22.681, lon: 75.803 },
  { id: "TL-JSAT-3S", name: "TL-JSAT-3S", type: "Macro-O", cat: "Edge", st: "Failed", city: "Indore", state: "Madhya Pradesh", addr: "Indore AICTSL", ne: 3, disc: 0, lat: 22.702, lon: 75.951 },
  { id: "DND-ART-98", name: "DND-ART-98", type: "Micro-CO", cat: "Edge", st: "On-air", city: "Dindigul", state: "Tamil Nadu", addr: "Govt girls school", ne: 7, disc: 7, lat: 10.365, lon: 77.975 }
];
export const locationOf = (id: string): Location => LOCATIONS.find(l => l.id === id) ?? LOCATIONS[0];
