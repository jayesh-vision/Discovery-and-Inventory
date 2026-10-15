/* ── Data Center Virtual Resources Inventory Dataset & Types ─────────────────────────
   Standard Data Center Virtualization infrastructure entities supporting:
   • VMware vSphere / ESXi
   • OpenStack / KVM
   • Nutanix AHV
   • Container Clusters (Kubernetes / Red Hat OpenShift)
─────────────────────────────────────────────────────────────────────────── */

import extraVirtualResources from './extraVirtualResources.json';

export type VirtualResourceType = 'Virtual Machine' | 'K8s Pod' | 'Datastore' | 'Virtual Network';
export type VirtualStatus = 'Running' | 'Stopped' | 'Suspended' | 'Pending' | 'Warning' | 'Error' | 'Degraded';
export type PlatformType = 'VMware vSphere 8.0' | 'OpenStack Yoga / KVM' | 'Nutanix AHV' | 'Red Hat OpenShift 4.14';
export type EnvironmentType = 'Production' | 'Staging' | 'Development';

export interface VirtualResourceItem {
  id: string;
  name: string;
  type: VirtualResourceType;
  typeCode: 'VM' | 'K8s Pod' | 'Datastore' | 'vSwitch';
  status: VirtualStatus;
  statusLabel: string;
  siteId: string;
  siteName: string;
  zone: string;
  cluster: string;
  host: string;
  specs: {
    vcpu?: number;
    ramGb?: number;
    storageTb?: number;
    storageGb?: number;
    bandwidth?: string;
    display: string;
  };
  ip: string;
  vlanOrNetwork: string;
  platform: PlatformType;
  env: EnvironmentType;
  guestOs?: string;
  uptime?: string;
  provisionedDate: string;
  cpuUtilPct?: number;
  ramUtilPct?: number;
  diskIoIops?: number;
  details?: {
    uuid: string;
    vdisksCount?: number;
    vnicsCount?: number;
    macAddress?: string;
    powerState?: 'Powered On' | 'Powered Off' | 'Suspended';
    storagePool?: string;
    backupPolicy?: string;
    tags: string[];
  };
}

export interface VirtualSummaryMetrics {
  vms: {
    total: number;
    running: number;
    stopped: number;
    suspended: number;
    error: number;
    totalVcpu: number;
    totalRamTb: number;
    healthPct: number;
  };
  k8s: {
    totalPods: number;
    running: number;
    pending: number;
    crashLoop: number;
    workerNodes: number;
    namespaces: number;
    clusters: number;
  };
  storage: {
    allocatedTb: number;
    usedTb: number;
    usedPct: number;
    degradedPools: number;
    offlinePools: number;
    datastoresCount: number;
    vdisksCount: number;
  };
  network: {
    vswitches: number;
    portGroups: number;
    disconnectedVnics: number;
    floatingIpsUsed: number;
    floatingIpsTotal: number;
    overlaysCount: number;
  };
}

export function computeVirtualSummaryStats(items: VirtualResourceItem[]): VirtualSummaryMetrics {
  const vms = items.filter(i => i.type === 'Virtual Machine');
  const k8s = items.filter(i => i.type === 'K8s Pod');
  const storage = items.filter(i => i.type === 'Datastore');
  const network = items.filter(i => i.type === 'Virtual Network');

  const vmRunning = vms.filter(i => i.status === 'Running').length;
  const vmStopped = vms.filter(i => i.status === 'Stopped').length;
  const vmSuspended = vms.filter(i => i.status === 'Suspended').length;
  const vmError = vms.filter(i => i.status === 'Error' || i.status === 'Degraded').length;
  const totalVcpu = vms.reduce((acc, i) => acc + (i.specs.vcpu || 16), 0);
  const totalRamGb = vms.reduce((acc, i) => acc + (i.specs.ramGb || 64), 0);

  const k8sRunning = k8s.filter(i => i.status === 'Running').length;
  const k8sPending = k8s.filter(i => i.status === 'Pending').length;
  const k8sCrash = k8s.filter(i => i.status === 'Error' || i.status === 'Degraded').length;
  const k8sNodes = new Set(k8s.map(i => i.host)).size || 18;
  const k8sClusters = new Set(k8s.map(i => i.cluster)).size || 6;

  const storageUsedTb = storage.reduce((acc, i) => acc + (i.specs.storageTb || 40), 0);
  const storageAllocTb = Math.round(storageUsedTb * 1.45);
  const storageDegraded = storage.filter(i => i.status === 'Warning' || i.status === 'Degraded').length;
  const storageOffline = storage.filter(i => i.status === 'Stopped' || i.status === 'Error').length;
  const vdisksCount = storage.reduce((acc, i) => acc + (i.details?.vdisksCount || 80), 0);

  const netOverlays = network.filter(i => i.specs.bandwidth?.includes('Overlay') || i.vlanOrNetwork?.includes('VXLAN') || i.vlanOrNetwork?.includes('Geneve')).length || Math.max(4, Math.floor(network.length / 2));
  const netDisconnected = network.filter(i => i.status === 'Warning' || i.status === 'Error' || i.status === 'Degraded').length;
  const portGroups = network.reduce((acc, i) => acc + (i.details?.vnicsCount || 10), 0) * 4;

  return {
    vms: {
      total: vms.length,
      running: vmRunning,
      stopped: vmStopped,
      suspended: vmSuspended,
      error: vmError,
      totalVcpu,
      totalRamTb: +(totalRamGb / 1024).toFixed(1),
      healthPct: vms.length > 0 ? Math.round((vmRunning / vms.length) * 100) : 100
    },
    k8s: {
      totalPods: k8s.length,
      running: k8sRunning,
      pending: k8sPending,
      crashLoop: k8sCrash,
      workerNodes: k8sNodes,
      namespaces: k8s.length * 2,
      clusters: k8sClusters
    },
    storage: {
      allocatedTb: storageAllocTb,
      usedTb: storageUsedTb,
      usedPct: storageAllocTb > 0 ? Math.round((storageUsedTb / storageAllocTb) * 100) : 0,
      degradedPools: storageDegraded,
      offlinePools: storageOffline,
      datastoresCount: storage.length,
      vdisksCount
    },
    network: {
      vswitches: network.length,
      portGroups,
      disconnectedVnics: netDisconnected,
      floatingIpsUsed: network.length * 6,
      floatingIpsTotal: network.length * 8,
      overlaysCount: netOverlays
    }
  };
}

export const DC_VIRTUAL_RESOURCES: VirtualResourceItem[] = extraVirtualResources as unknown as VirtualResourceItem[];

export const VIRTUAL_SUMMARY_STATS: VirtualSummaryMetrics = computeVirtualSummaryStats(DC_VIRTUAL_RESOURCES);

export const VIRTUAL_DC_SITES = [
  { id: 'all', label: 'All US DC Sites' },
  { id: 'VA-DC-001', label: 'VA-DC-001 · Loudoun Tech Center (Ashburn, VA)' },
  { id: 'VA-DC-002', label: 'VA-DC-002 · Beaumeade Circle (Ashburn, VA)' },
  { id: 'VA-DC-003', label: 'VA-DC-003 · White Oak Tech Park (Richmond, VA)' },
  { id: 'VA-DC-004', label: 'VA-DC-004 · Dulles Tech Park (Sterling, VA)' },
  { id: 'TX-DC-005', label: 'TX-DC-005 · Infomart Dallas (Dallas, TX)' },
  { id: 'TX-DC-006', label: 'TX-DC-006 · Westover Hills (San Antonio, TX)' },
  { id: 'TX-DC-007', label: 'TX-DC-007 · MetCenter Park (Austin, TX)' },
  { id: 'CA-DC-008', label: 'CA-DC-008 · Great America Pkwy (Santa Clara, CA)' },
  { id: 'IL-DC-009', label: 'IL-DC-009 · Franklin Street Exchange (Chicago, IL)' },
  { id: 'AZ-DC-010', label: 'AZ-DC-010 · Chandler Tech Corridor (Phoenix, AZ)' },
  { id: 'GA-DC-011', label: 'GA-DC-011 · Alpharetta DC Park (Atlanta, GA)' },
  { id: 'NJ-DC-012', label: 'NJ-DC-012 · Meadowlands Parkway (Secaucus, NJ)' },
  { id: 'WA-DC-013', label: 'WA-DC-013 · Quincy Industrial Park (Quincy, WA)' },
  { id: 'OR-DC-014', label: 'OR-DC-014 · Hillsboro Tech Campus (Hillsboro, OR)' },
  { id: 'CO-DC-015', label: 'CO-DC-015 · Centennial Tech Park (Denver, CO)' },
  { id: 'OH-DC-016', label: 'OH-DC-016 · New Albany Business Park (Columbus, OH)' },
  { id: 'OH-DC-017', label: 'OH-DC-017 · Dublin Tech Center (Columbus, OH)' },
  { id: 'FL-DC-018', label: 'FL-DC-018 · NAP of the Americas (Miami, FL)' },
  { id: 'UT-DC-019', label: 'UT-DC-019 · West Jordan Campus (Salt Lake City, UT)' },
  { id: 'CA-DC-020', label: 'CA-DC-020 · One Wilshire (Los Angeles, CA)' },
  { id: 'CA-DC-021', label: 'CA-DC-021 · North First Street (San Jose, CA)' },
  { id: 'TX-DC-022', label: 'TX-DC-022 · Westway Park (Houston, TX)' },
  { id: 'NC-DC-023', label: 'NC-DC-023 · Univ Research Park (Charlotte, NC)' },
  { id: 'WA-DC-024', label: 'WA-DC-024 · Tukwila Data Campus (Seattle, WA)' }
];

export const VIRTUAL_PLATFORMS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Hypervisors / Platforms' },
  { id: 'VMware vSphere 8.0', label: 'VMware ESXi / vSphere 8.0' },
  { id: 'OpenStack Yoga / KVM', label: 'OpenStack Yoga / KVM' },
  { id: 'Nutanix AHV', label: 'Nutanix AHV' },
  { id: 'Red Hat OpenShift 4.14', label: 'Red Hat OpenShift 4.14 (K8s)' }
];

export const VIRTUAL_ENVIRONMENTS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Environments' },
  { id: 'Production', label: 'Production (Prod)' },
  { id: 'Staging', label: 'Staging' },
  { id: 'Development', label: 'Development (Dev)' }
];

export const VIRTUAL_STATUSES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Lifecycle States' },
  { id: 'Running', label: 'Running / Active' },
  { id: 'Stopped', label: 'Stopped / Powered Off' },
  { id: 'Suspended', label: 'Suspended' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Warning', label: 'Warning / Attention' },
  { id: 'Error', label: 'Error / Failed' },
  { id: 'Degraded', label: 'Degraded' }
];
