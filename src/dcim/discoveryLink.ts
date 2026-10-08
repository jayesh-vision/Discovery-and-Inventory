/* ── Linking imported DCIM devices to existing Discovery & Inventory records ──
   Imported devices stay their own records; this module only PROPOSES links
   to the records Inventory and Discovery already hold:

   • Inventory › Physical Resources (physical.ts NeRow, identity `name`) —
     matched on serial number (NeRow.sn) or management IP (NeRow.ip/ip2)
   • Discovery › domain devices (domainDevices.ts DomainDevice, identity `id`) —
     matched on management IP

   Matches are exact on a normalised value; a name is never enough, and a
   candidate is only stored as a link when the user confirms it (store.link).
   Nothing here writes to physical.ts or domainDevices.ts. */
import type { Device, DiscoveryLink } from './model';

export interface InventoryRef { name: string; sn: string; ip: string; ip2?: string; model: string; oem: string; loc: string }
export interface DiscoveredRef { id: string; name: string; ip: string; domain: string; region: string }

export interface Candidate {
  deviceId: string;
  target: DiscoveryLink['target'];
  ref: string;
  label: string;
  detail: string;
  matchedOn: DiscoveryLink['matchedOn'];
  /** more than one record matched the same value: the user must pick, nothing is preselected */
  ambiguous: boolean;
}

const nSerial = (s?: string) => (s ?? '').trim().toUpperCase().replace(/[\s-]/g, '');
const nIp = (s?: string) => (s ?? '').trim().replace(/\/\d+$/, '');

export function linkCandidates(devices: Device[], inventory: InventoryRef[], discovered: DiscoveredRef[]): Candidate[] {
  const bySerial = new Map<string, InventoryRef[]>();
  const invByIp = new Map<string, InventoryRef[]>();
  for (const r of inventory) {
    const s = nSerial(r.sn); if (s) bySerial.set(s, [...(bySerial.get(s) ?? []), r]);
    for (const ip of [r.ip, r.ip2]) { const i = nIp(ip); if (i) invByIp.set(i, [...(invByIp.get(i) ?? []), r]); }
  }
  const discByIp = new Map<string, DiscoveredRef[]>();
  for (const d of discovered) { const i = nIp(d.ip); if (i) discByIp.set(i, [...(discByIp.get(i) ?? []), d]); }

  const out: Candidate[] = [];
  for (const dev of devices) {
    const s = nSerial(dev.serial), ip = nIp(dev.mgmtIp);
    const inv = s ? bySerial.get(s) ?? [] : [];
    const invIp = !inv.length && ip ? invByIp.get(ip) ?? [] : [];
    const invHits = inv.length ? inv : invIp;
    for (const r of invHits) out.push({
      deviceId: dev.id, target: 'inventory', ref: r.name, label: r.name,
      detail: `${r.oem} ${r.model} · SN ${r.sn} · ${r.ip} · ${r.loc}`,
      matchedOn: inv.length ? 'serial' : 'mgmtIp', ambiguous: invHits.length > 1
    });
    const disc = ip ? discByIp.get(ip) ?? [] : [];
    for (const d of disc) out.push({
      deviceId: dev.id, target: 'discovery', ref: d.id, label: d.name,
      detail: `${d.domain} · ${d.region} · ${d.ip}`, matchedOn: 'mgmtIp', ambiguous: disc.length > 1
    });
  }
  return out;
}
