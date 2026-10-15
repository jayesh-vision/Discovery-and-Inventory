import fs from 'fs';
import path from 'path';

const projectRoot = '/Users/ent-0441/Documents/inventory_ideation/Discovery-and-Inventory';
const dcs = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/data/dc/datacenters.json'), 'utf8')).filter(d => d.geo === 'us');
const summary = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/data/dc/summary.json'), 'utf8')).datacenters.filter(d => d.geo === 'us');
const devs = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/data/dc/devices.json'), 'utf8'));

// State to abbreviation map
const stateAbbr = {
  'Virginia': 'VA', 'Texas': 'TX', 'California': 'CA', 'Illinois': 'IL',
  'Arizona': 'AZ', 'Georgia': 'GA', 'New Jersey': 'NJ', 'Washington': 'WA',
  'Oregon': 'OR', 'Colorado': 'CO', 'Ohio': 'OH', 'Florida': 'FL',
  'Utah': 'UT', 'North Carolina': 'NC'
};

// Region to Zone map
function getZone(state, idx) {
  if (['Virginia', 'New Jersey'].includes(state)) {
    return ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d'][idx % 4];
  }
  if (['Ohio', 'North Carolina'].includes(state)) {
    return ['us-east-2a', 'us-east-2b'][idx % 2];
  }
  if (['Texas', 'Illinois', 'Georgia', 'Florida'].includes(state)) {
    return ['us-central-1a', 'us-central-1b', 'us-south-1a', 'us-southeast-1a'][idx % 4];
  }
  return ['us-west-1a', 'us-west-1b', 'us-west-2a', 'us-west-2b'][idx % 4];
}

// Build DC device cache
const dcDeviceCache = {};
dcs.forEach(dc => {
  const sum = summary.find(s => s.id === dc.id);
  const dcDevs = devs.filter(d => d.dcId === dc.id);
  const servers = dcDevs.filter(d => d.role === 'Server');
  const storage = dcDevs.filter(d => d.role === 'Storage');
  const switches = dcDevs.filter(d => d.role === 'Switch');

  const baseIp = (servers[0] || dcDevs[0])?.ip || '172.24.40.10';
  const ipParts = baseIp.split('.');
  const subnetBase = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;

  dcDeviceCache[dc.id] = {
    dc,
    sum,
    abbr: stateAbbr[dc.state] || 'US',
    siteName: `${sum.address} (${dc.city}, ${stateAbbr[dc.state] || dc.state})`,
    servers,
    storage,
    switches,
    subnetBase
  };
});

const dcIds = dcs.map(d => d.id); // 24 US DCs

// 56 VMs
const vmDefs = [
  // Core Database VMs (16)
  { name: 'us-prod-db-postgres-01', os: 'RHEL 9.2 (64-bit)', vcpu: 32, ramGb: 128, storageGb: 2000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-301 (DB-Tier)' },
  { name: 'us-prod-db-postgres-02', os: 'RHEL 9.2 (64-bit)', vcpu: 32, ramGb: 128, storageGb: 2000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running (Standby)', vlan: 'VLAN-301 (DB-Tier)' },
  { name: 'us-prod-db-mysql-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 1200, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-302 (MySQL-Pool)' },
  { name: 'us-prod-db-mysql-02', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 1200, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-302 (MySQL-Pool)' },
  { name: 'us-prod-db-oracle-01', os: 'Oracle Linux 8.8', vcpu: 48, ramGb: 256, storageGb: 4000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-303 (Oracle-RAC)' },
  { name: 'us-prod-db-oracle-02', os: 'Oracle Linux 8.8', vcpu: 48, ramGb: 256, storageGb: 4000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-303 (Oracle-RAC)' },
  { name: 'us-prod-db-redis-cluster-01', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 300, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-304 (Cache-Tier)' },
  { name: 'us-prod-db-redis-cluster-02', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 300, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-304 (Cache-Tier)' },
  { name: 'us-prod-db-redis-cluster-03', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 300, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-304 (Cache-Tier)' },
  { name: 'us-prod-db-mongo-primary', os: 'RHEL 9.0', vcpu: 24, ramGb: 96, storageGb: 1500, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-305 (NoSQL-Tier)' },
  { name: 'us-prod-db-mongo-secondary', os: 'RHEL 9.0', vcpu: 24, ramGb: 96, storageGb: 1500, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-305 (NoSQL-Tier)' },
  { name: 'us-prod-db-cassandra-01', os: 'RHEL 9.2', vcpu: 16, ramGb: 64, storageGb: 2000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-306 (Cassandra-Net)' },
  { name: 'us-prod-db-cassandra-02', os: 'RHEL 9.2', vcpu: 16, ramGb: 64, storageGb: 2000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-306 (Cassandra-Net)' },
  { name: 'us-prod-db-clickhouse-01', os: 'Ubuntu 22.04 LTS', vcpu: 32, ramGb: 128, storageGb: 3500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-307 (Analytics-Net)' },
  { name: 'us-prod-db-clickhouse-02', os: 'Ubuntu 22.04 LTS', vcpu: 32, ramGb: 128, storageGb: 3500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-307 (Analytics-Net)' },
  { name: 'us-stg-db-postgres-01', os: 'RHEL 9.2', vcpu: 16, ramGb: 64, storageGb: 800, plat: 'VMware vSphere 8.0', env: 'Staging', st: 'Running', stLbl: 'Running', vlan: 'VLAN-310 (Staging-DB)' },

  // API & Application Gateways (14)
  { name: 'us-prod-api-edge-gw-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 32, storageGb: 250, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-110 (DMZ-Public)' },
  { name: 'us-prod-api-edge-gw-02', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 32, storageGb: 250, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-110 (DMZ-Public)' },
  { name: 'us-prod-api-kong-01', os: 'Alpine Linux 3.19', vcpu: 8, ramGb: 16, storageGb: 120, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-120 (API-GW)' },
  { name: 'us-prod-api-kong-02', os: 'Alpine Linux 3.19', vcpu: 8, ramGb: 16, storageGb: 120, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-120 (API-GW)' },
  { name: 'us-prod-app-billing-srv-01', os: 'RHEL 9.1', vcpu: 16, ramGb: 64, storageGb: 400, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-130 (App-Tier)' },
  { name: 'us-prod-app-billing-srv-02', os: 'RHEL 9.1', vcpu: 16, ramGb: 64, storageGb: 400, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-130 (App-Tier)' },
  { name: 'us-prod-app-orders-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 500, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-130 (App-Tier)' },
  { name: 'us-prod-app-orders-02', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 500, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-130 (App-Tier)' },
  { name: 'us-prod-app-auth-iam-01', os: 'RHEL 9.2', vcpu: 8, ramGb: 32, storageGb: 200, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-140 (Security-Net)' },
  { name: 'us-prod-app-auth-iam-02', os: 'RHEL 9.2', vcpu: 8, ramGb: 32, storageGb: 200, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-140 (Security-Net)' },
  { name: 'us-prod-app-search-elastic-01', os: 'Debian 12', vcpu: 24, ramGb: 96, storageGb: 1800, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-150 (Elastic-Cluster)' },
  { name: 'us-prod-app-search-elastic-02', os: 'Debian 12', vcpu: 24, ramGb: 96, storageGb: 1800, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-150 (Elastic-Cluster)' },
  { name: 'us-prod-msg-kafka-01', os: 'RHEL 9.1', vcpu: 16, ramGb: 64, storageGb: 2500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-160 (Streaming-Net)' },
  { name: 'us-prod-msg-kafka-02', os: 'RHEL 9.1', vcpu: 16, ramGb: 64, storageGb: 2500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-160 (Streaming-Net)' },

  // AI Inference & ML Pipelines (10)
  { name: 'us-prod-ai-infer-vllm-01', os: 'Ubuntu 22.04 LTS (NVIDIA Grid)', vcpu: 32, ramGb: 128, storageGb: 1000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-401 (AI-Inference)' },
  { name: 'us-prod-ai-infer-vllm-02', os: 'Ubuntu 22.04 LTS (NVIDIA Grid)', vcpu: 32, ramGb: 128, storageGb: 1000, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-401 (AI-Inference)' },
  { name: 'us-prod-ai-triton-srv-01', os: 'Ubuntu 22.04 LTS', vcpu: 24, ramGb: 96, storageGb: 800, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-402 (Model-Serving)' },
  { name: 'us-prod-ai-triton-srv-02', os: 'Ubuntu 22.04 LTS', vcpu: 24, ramGb: 96, storageGb: 800, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-402 (Model-Serving)' },
  { name: 'us-prod-ai-vector-qdrant-01', os: 'Debian 12', vcpu: 16, ramGb: 64, storageGb: 1200, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-403 (Vector-DB)' },
  { name: 'us-prod-ai-vector-qdrant-02', os: 'Debian 12', vcpu: 16, ramGb: 64, storageGb: 1200, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-403 (Vector-DB)' },
  { name: 'us-stg-ai-model-eval-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 500, plat: 'OpenStack Yoga / KVM', env: 'Staging', st: 'Running', stLbl: 'Running', vlan: 'VLAN-410 (AI-Staging)' },
  { name: 'us-dev-ai-notebook-gpu-01', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 400, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Running', stLbl: 'Running', vlan: 'VLAN-420 (Dev-Net)' },
  { name: 'us-dev-ai-notebook-gpu-02', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 400, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Stopped', stLbl: 'Stopped', vlan: 'VLAN-420 (Dev-Net)' },
  { name: 'us-dev-ai-sandbox-01', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 300, plat: 'VMware vSphere 8.0', env: 'Development', st: 'Suspended', stLbl: 'Suspended', vlan: 'VLAN-420 (Dev-Net)' },

  // Infra, Observability, Telemetry & Secondary (16)
  { name: 'us-prod-mon-prometheus-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 1500, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-201 (Mgmt-OOB)' },
  { name: 'us-prod-mon-prometheus-02', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 64, storageGb: 1500, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-201 (Mgmt-OOB)' },
  { name: 'us-prod-mon-grafana-01', os: 'Alpine Linux 3.19', vcpu: 4, ramGb: 16, storageGb: 100, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-201 (Mgmt-OOB)' },
  { name: 'us-prod-sec-vault-01', os: 'RHEL 9.2 (Hardened)', vcpu: 8, ramGb: 32, storageGb: 200, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-210 (Secrets-Net)' },
  { name: 'us-prod-sec-vault-02', os: 'RHEL 9.2 (Hardened)', vcpu: 8, ramGb: 32, storageGb: 200, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-210 (Secrets-Net)' },
  { name: 'us-prod-dns-ad-dc-01', os: 'Windows Server 2022', vcpu: 8, ramGb: 32, storageGb: 250, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-220 (AD-Core)' },
  { name: 'us-prod-dns-ad-dc-02', os: 'Windows Server 2022', vcpu: 8, ramGb: 32, storageGb: 250, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-220 (AD-Core)' },
  { name: 'us-prod-git-runner-01', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 48, storageGb: 500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-230 (CI-CD)' },
  { name: 'us-prod-git-runner-02', os: 'Ubuntu 22.04 LTS', vcpu: 16, ramGb: 48, storageGb: 500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Running', vlan: 'VLAN-230 (CI-CD)' },
  { name: 'us-stg-app-ingress-01', os: 'Alpine Linux 3.19', vcpu: 8, ramGb: 16, storageGb: 150, plat: 'VMware vSphere 8.0', env: 'Staging', st: 'Running', stLbl: 'Running', vlan: 'VLAN-240 (Staging-DMZ)' },
  { name: 'us-stg-app-ingress-02', os: 'Alpine Linux 3.19', vcpu: 8, ramGb: 16, storageGb: 150, plat: 'VMware vSphere 8.0', env: 'Staging', st: 'Stopped', stLbl: 'Stopped', vlan: 'VLAN-240 (Staging-DMZ)' },
  { name: 'us-stg-batch-worker-01', os: 'Ubuntu 22.04 LTS', vcpu: 8, ramGb: 32, storageGb: 200, plat: 'OpenStack Yoga / KVM', env: 'Staging', st: 'Stopped', stLbl: 'Stopped', vlan: 'VLAN-245 (Batch-Staging)' },
  { name: 'us-dev-bastion-ssh-01', os: 'RHEL 9.1', vcpu: 4, ramGb: 8, storageGb: 80, plat: 'Nutanix AHV', env: 'Development', st: 'Running', stLbl: 'Running', vlan: 'VLAN-250 (Bastion-Net)' },
  { name: 'us-dev-app-test-01', os: 'Ubuntu 22.04 LTS', vcpu: 4, ramGb: 16, storageGb: 120, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Suspended', stLbl: 'Suspended', vlan: 'VLAN-255 (Dev-App)' },
  { name: 'us-dev-app-test-02', os: 'Ubuntu 22.04 LTS', vcpu: 4, ramGb: 16, storageGb: 120, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Error', stLbl: 'Disk I/O Error', vlan: 'VLAN-255 (Dev-App)' },
  { name: 'us-dev-db-mysql-sandbox', os: 'Ubuntu 22.04 LTS', vcpu: 4, ramGb: 16, storageGb: 150, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Stopped', stLbl: 'Stopped', vlan: 'VLAN-255 (Dev-App)' }
];

console.log('Total VM definitions:', vmDefs.length); // 56

// 34 K8s Pods / Nodes
const k8sDefs = [
  { name: 'ingress-nginx-controller-7f4b8c9d-8x1v0', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-501 (ingress-system)' },
  { name: 'ingress-nginx-controller-7f4b8c9d-9q2w1', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-501 (ingress-system)' },
  { name: 'istio-ingressgateway-69d854df-4t6y7', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-502 (istio-system)' },
  { name: 'istio-ingressgateway-69d854df-8u9i0', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-502 (istio-system)' },
  { name: 'coredns-66b9cd94-5p7r9', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay Geneve-601 (kube-system)' },
  { name: 'coredns-66b9cd94-8t2m4', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay Geneve-601 (kube-system)' },
  { name: 'cilium-operator-58cf7b4f-2w4x6', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay Geneve-601 (kube-system)' },
  { name: 'calico-node-daemonset-1m3p5', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay Geneve-601 (calico-system)' },
  { name: 'calico-node-daemonset-2n4q6', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay Geneve-601 (calico-system)' },
  { name: 'vault-agent-injector-6f8d7b-9k1l2', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-503 (vault-system)' },
  { name: 'argo-cd-server-79d8b76-4j5k6', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-504 (argocd)' },
  { name: 'argo-workflow-controller-88d4c-1m2n3', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-504 (argocd)' },
  { name: 'cert-manager-cainjector-7d6f5-3b4c5', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-505 (cert-manager)' },
  { name: 'cert-manager-webhook-54b9d-6e7f8', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-505 (cert-manager)' },
  { name: 'k8s-node-worker-us-01', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Master/Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-02', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-03', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-04', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-05', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-06', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-07', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'k8s-node-worker-us-08', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Ready (Worker)', vlan: 'Underlay Node-CIDR 10.100.0.0/16' },
  { name: 'microservices-checkout-api-4b8c-1', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 2/2)', vlan: 'Overlay VXLAN-510 (commerce-prod)' },
  { name: 'microservices-checkout-api-4b8c-2', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 2/2)', vlan: 'Overlay VXLAN-510 (commerce-prod)' },
  { name: 'microservices-payment-gw-89f4-1', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 2/2)', vlan: 'Overlay VXLAN-510 (commerce-prod)' },
  { name: 'microservices-inventory-sync-3a1c-1', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-510 (commerce-prod)' },
  { name: 'triton-inference-gpu-pod-01', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (GPU-Allocated)', vlan: 'Overlay VXLAN-520 (ml-inference)' },
  { name: 'triton-inference-gpu-pod-02', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (GPU-Allocated)', vlan: 'Overlay VXLAN-520 (ml-inference)' },
  { name: 'ray-worker-node-ml-01', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-521 (ray-cluster)' },
  { name: 'ray-worker-node-ml-02', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Running (Ready 1/1)', vlan: 'Overlay VXLAN-521 (ray-cluster)' },
  { name: 'batch-analytics-spark-executor-01', plat: 'Red Hat OpenShift 4.14', env: 'Staging', st: 'Pending', stLbl: 'Pending (VolumeMount)', vlan: 'Overlay VXLAN-530 (analytics-stg)' },
  { name: 'batch-analytics-spark-executor-02', plat: 'Red Hat OpenShift 4.14', env: 'Staging', st: 'Pending', stLbl: 'Pending (ResourceQuota)', vlan: 'Overlay VXLAN-530 (analytics-stg)' },
  { name: 'data-pipeline-kafka-consumer-01', plat: 'Red Hat OpenShift 4.14', env: 'Staging', st: 'Pending', stLbl: 'Pending (ContainerCreating)', vlan: 'Overlay VXLAN-530 (analytics-stg)' },
  { name: 'telemetry-fluentbit-forwarder-error', plat: 'Red Hat OpenShift 4.14', env: 'Development', st: 'Error', stLbl: 'CrashLoopBackOff', vlan: 'Overlay VXLAN-540 (logging-dev)' }
];
console.log('Total K8s definitions:', k8sDefs.length); // 34

// 20 Datastores
const storageDefs = [
  { name: 'us-vsan-nvme-datastore-01', tb: 120, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'SAN Fabric A (32Gb FC)', pool: 'vSAN NVMe Tier-1', vdisks: 240 },
  { name: 'us-vsan-nvme-datastore-02', tb: 120, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'SAN Fabric B (32Gb FC)', pool: 'vSAN NVMe Tier-1', vdisks: 235 },
  { name: 'us-pure-flasharray-nvme-01', tb: 180, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'NVMe-oF / RoCEv2 (100Gb)', pool: 'FlashArray//X90 Gen2', vdisks: 380 },
  { name: 'us-pure-flasharray-nvme-02', tb: 180, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'NVMe-oF / RoCEv2 (100Gb)', pool: 'FlashArray//X90 Gen2', vdisks: 375 },
  { name: 'us-ceph-rbd-fast-pool-01', tb: 250, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Storage Mesh (40GbE)', pool: 'Ceph Enterprise BlueStore', vdisks: 520 },
  { name: 'us-ceph-rbd-fast-pool-02', tb: 250, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Storage Mesh (40GbE)', pool: 'Ceph Enterprise BlueStore', vdisks: 510 },
  { name: 'us-ceph-rbd-archive-01', tb: 500, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Backup Net (25GbE)', pool: 'Ceph EC 8+4 Pool', vdisks: 180 },
  { name: 'us-nutanix-ds-gold-01', tb: 150, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Nutanix Backplane (25GbE)', pool: 'AOS Acropolis SP-01', vdisks: 310 },
  { name: 'us-nutanix-ds-gold-02', tb: 150, plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Nutanix Backplane (25GbE)', pool: 'AOS Acropolis SP-01', vdisks: 295 },
  { name: 'us-weka-fs-ai-gpudirect-01', tb: 300, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'InfiniBand NDR 400G', pool: 'WEKApod Prime Matrix', vdisks: 160 },
  { name: 'us-weka-fs-ai-gpudirect-02', tb: 300, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'InfiniBand NDR 400G', pool: 'WEKApod Prime Matrix', vdisks: 155 },
  { name: 'us-netapp-ontap-nfs-01', tb: 200, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'NFS over 25GbE', pool: 'AFF A800 NVMe Fabric', vdisks: 420 },
  { name: 'us-netapp-ontap-nfs-02', tb: 200, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: 'NFS over 25GbE', pool: 'AFF A800 NVMe Fabric', vdisks: 410 },
  { name: 'us-vast-data-ceres-nvme-01', tb: 350, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: '100GbE Storage Network', pool: 'VAST Universal Storage', vdisks: 280 },
  { name: 'us-vast-data-ceres-nvme-02', tb: 350, plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Healthy / Active', vlan: '100GbE Storage Network', pool: 'VAST Universal Storage', vdisks: 275 },
  { name: 'us-stg-vsan-nvme-01', tb: 80, plat: 'VMware vSphere 8.0', env: 'Staging', st: 'Running', stLbl: 'Healthy / Active', vlan: 'vSAN Staging Fabric', pool: 'vSAN NVMe Staging', vdisks: 110 },
  { name: 'us-stg-ceph-pool-01', tb: 100, plat: 'OpenStack Yoga / KVM', env: 'Staging', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Staging Mesh', pool: 'Ceph Staging BlueStore', vdisks: 120 },
  { name: 'us-dev-ceph-pool-01', tb: 80, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Running', stLbl: 'Healthy / Active', vlan: 'Dev Storage Net', pool: 'Ceph Dev Cluster', vdisks: 90 },
  { name: 'us-vsan-degraded-rebuild-01', tb: 120, plat: 'VMware vSphere 8.0', env: 'Production', st: 'Warning', stLbl: 'Degraded / Rebuilding', vlan: 'vSAN Rebuild Mesh', pool: 'vSAN Cluster Beta', vdisks: 140 },
  { name: 'us-dev-backup-archive-offline', tb: 150, plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Stopped', stLbl: 'Offline (Scheduled Maint)', vlan: 'Archive Net', pool: 'Nearline Disk Pool', vdisks: 0 }
];
console.log('Total Storage definitions:', storageDefs.length); // 20

// 18 Virtual Networks
const netDefs = [
  { name: 'us-dvs-core-fabric-01', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 100-399 (Trunked)', bw: '2× 100Gbps Uplinks', pgs: 48, vnics: 280 },
  { name: 'us-dvs-core-fabric-02', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 100-399 (Trunked)', bw: '2× 100Gbps Uplinks', pgs: 48, vnics: 275 },
  { name: 'us-dvs-dmz-public-01', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 110 (DMZ)', bw: '2× 25Gbps Uplinks', pgs: 16, vnics: 64 },
  { name: 'us-dvs-dmz-public-02', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 110 (DMZ)', bw: '2× 25Gbps Uplinks', pgs: 16, vnics: 60 },
  { name: 'us-neutron-vxlan-overlay-01', plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Overlay VXLAN Mesh (VNI 10000+)', bw: '100Gbps RoCEv2 Core', pgs: 32, vnics: 190 },
  { name: 'us-neutron-vxlan-overlay-02', plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Overlay VXLAN Mesh (VNI 10000+)', bw: '100Gbps RoCEv2 Core', pgs: 32, vnics: 185 },
  { name: 'us-neutron-geneve-sdn-01', plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Overlay Geneve Tunnel Mesh', bw: '100Gbps Spine-Leaf', pgs: 24, vnics: 140 },
  { name: 'us-neutron-geneve-sdn-02', plat: 'OpenStack Yoga / KVM', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Overlay Geneve Tunnel Mesh', bw: '100Gbps Spine-Leaf', pgs: 24, vnics: 135 },
  { name: 'us-openshift-ovn-k8s-cni-01', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'OVN-Kubernetes Pod CNI Mesh', bw: '2× 100GbE SDN Fabric', pgs: 40, vnics: 220 },
  { name: 'us-openshift-ovn-k8s-cni-02', plat: 'Red Hat OpenShift 4.14', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'OVN-Kubernetes Pod CNI Mesh', bw: '2× 100GbE SDN Fabric', pgs: 40, vnics: 215 },
  { name: 'us-nutanix-flow-vpc-01', plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Nutanix Flow Virtual Networking', bw: '2× 25GbE Bonded', pgs: 20, vnics: 110 },
  { name: 'us-nutanix-flow-vpc-02', plat: 'Nutanix AHV', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'Nutanix Flow Virtual Networking', bw: '2× 25GbE Bonded', pgs: 20, vnics: 105 },
  { name: 'us-nsx-t-overlay-tier0-gw-01', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'NSX-T Geneve Tier-0 Gateway', bw: '4× 100Gbps BGP Uplinks', pgs: 16, vnics: 95 },
  { name: 'us-nsx-t-overlay-tier0-gw-02', plat: 'VMware vSphere 8.0', env: 'Production', st: 'Running', stLbl: 'Active / Connected', vlan: 'NSX-T Geneve Tier-0 Gateway', bw: '4× 100Gbps BGP Uplinks', pgs: 16, vnics: 90 },
  { name: 'us-stg-dvs-fabric-01', plat: 'VMware vSphere 8.0', env: 'Staging', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 400-450 (Staging)', bw: '2× 25Gbps Uplinks', pgs: 12, vnics: 50 },
  { name: 'us-stg-neutron-tenant-01', plat: 'OpenStack Yoga / KVM', env: 'Staging', st: 'Running', stLbl: 'Active / Connected', vlan: 'Overlay VXLAN (Staging Tenants)', bw: '2× 25Gbps Mesh', pgs: 12, vnics: 45 },
  { name: 'us-dev-vswitch-isolated-01', plat: 'OpenStack Yoga / KVM', env: 'Development', st: 'Running', stLbl: 'Active / Connected', vlan: 'VLAN 500 (Dev-Isolated)', bw: '10Gbps Uplink', pgs: 8, vnics: 25 },
  { name: 'us-dev-vswitch-failover-warn', plat: 'VMware vSphere 8.0', env: 'Development', st: 'Warning', stLbl: 'Warning (Secondary Uplink Down)', vlan: 'VLAN 510 (Dev-Lab)', bw: '1× 10Gbps (Degraded)', pgs: 8, vnics: 20 }
];
console.log('Total Network definitions:', netDefs.length); // 18

console.log('Total sum check:', vmDefs.length + k8sDefs.length + storageDefs.length + netDefs.length); // 128!

// Build all 128 items
const allItems = [];

// 1. Process 56 VMs
vmDefs.forEach((vm, idx) => {
  const dcId = dcIds[idx % dcIds.length];
  const info = dcDeviceCache[dcId];
  const server = info.servers[idx % info.servers.length] || { id: `${dcId}-CPU-0001`, model: 'PowerEdge R760' };
  const hostNum = 40 + (idx * 3) % 200;
  const ip = `${info.subnetBase}.${hostNum}`;
  const zone = getZone(info.dc.state, idx);

  let clusterName = `${dcId}-VMware-Cluster-01`;
  if (vm.plat.includes('OpenStack')) clusterName = `${dcId}-OpenStack-Compute-01`;
  else if (vm.plat.includes('Nutanix')) clusterName = `${dcId}-Nutanix-AOS-Block`;

  allItems.push({
    id: `vm-${vm.name.replace(/^us-/, '')}`,
    name: vm.name,
    type: 'Virtual Machine',
    typeCode: 'VM',
    status: vm.st,
    statusLabel: vm.stLbl,
    siteId: dcId,
    siteName: info.siteName,
    zone,
    cluster: clusterName,
    host: server.id,
    specs: {
      vcpu: vm.vcpu,
      ramGb: vm.ramGb,
      storageGb: vm.storageGb,
      display: `${vm.vcpu} vCPU | ${vm.ramGb} GB RAM`
    },
    ip,
    vlanOrNetwork: vm.vlan,
    platform: vm.plat,
    env: vm.env,
    guestOs: vm.os,
    uptime: vm.st === 'Running' ? `${30 + (idx * 7) % 300} days, ${(idx * 3) % 24}h` : '0h (Stopped)',
    provisionedDate: `2025-${String((idx % 12) + 1).padStart(2, '0')}-${String(((idx * 5) % 26) + 1).padStart(2, '0')}`,
    cpuUtilPct: vm.st === 'Running' ? 25 + ((idx * 11) % 65) : 0,
    ramUtilPct: vm.st === 'Running' ? 35 + ((idx * 9) % 55) : 0,
    diskIoIops: vm.st === 'Running' ? 1200 + ((idx * 350) % 9500) : 0,
    details: {
      uuid: `4231${(1000 + idx).toString(16)}-8fa4-1011-8930-${dcId.toLowerCase().replace(/[^a-z0-9]/g, '')}${idx}`,
      vdisksCount: Math.max(1, Math.round(vm.storageGb / 500)),
      vnicsCount: 2,
      macAddress: `00:50:56:${(10 + (idx % 80)).toString(16)}:${(10 + ((idx * 3) % 80)).toString(16)}:${(20 + ((idx * 7) % 80)).toString(16)}`,
      powerState: vm.st === 'Running' ? 'Powered On' : vm.st === 'Suspended' ? 'Suspended' : 'Powered Off',
      storagePool: `${dcId.toLowerCase()}-nvme-pool-${(idx % 4) + 1}`,
      backupPolicy: idx % 3 === 0 ? 'Gold 4h RPO' : idx % 3 === 1 ? 'Silver 12h RPO' : 'Bronze 24h RPO',
      tags: [vm.os.split(' ')[0], vm.env, dcId, server.model.split(' ')[0]]
    }
  });
});

// 2. Process 34 K8s Pods / Nodes
k8sDefs.forEach((k8s, idx) => {
  const dcId = dcIds[(idx + 3) % dcIds.length];
  const info = dcDeviceCache[dcId];
  const isGpu = k8s.name.includes('gpu') || k8s.name.includes('triton') || k8s.name.includes('ray');
  let hostDevice;
  if (isGpu) {
    const dcGpus = devs.filter(d => d.dcId === dcId && d.role === 'GPU');
    hostDevice = dcGpus[idx % (dcGpus.length || 1)] || info.servers[0];
  } else {
    hostDevice = info.servers[(idx + 2) % info.servers.length] || { id: `${dcId}-CPU-0002`, model: 'PowerEdge R760' };
  }
  const hostNum = 80 + (idx * 4) % 170;
  const ip = `${info.subnetBase}.${hostNum}`;
  const zone = getZone(info.dc.state, idx + 1);
  const clusterName = isGpu ? `${dcId}-OpenShift-AI-Cluster` : `${dcId}-OpenShift-Core-Cluster`;

  const vcpu = isGpu ? 8 : k8s.name.includes('worker') ? 16 : 2;
  const ramGb = isGpu ? 32 : k8s.name.includes('worker') ? 64 : 4;

  allItems.push({
    id: `pod-${k8s.name.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36)}`,
    name: k8s.name,
    type: 'K8s Pod',
    typeCode: 'K8s Pod',
    status: k8s.st,
    statusLabel: k8s.stLbl,
    siteId: dcId,
    siteName: info.siteName,
    zone,
    cluster: clusterName,
    host: hostDevice.id,
    specs: {
      vcpu,
      ramGb,
      display: `${vcpu} vCPU · ${ramGb} GB RAM`
    },
    ip,
    vlanOrNetwork: k8s.vlan,
    platform: k8s.plat,
    env: k8s.env,
    uptime: k8s.st === 'Running' ? `${10 + (idx * 5) % 180} days, ${(idx * 7) % 24}h` : '0h (Pending/Restarting)',
    provisionedDate: `2025-${String((idx % 12) + 1).padStart(2, '0')}-${String(((idx * 7) % 26) + 1).padStart(2, '0')}`,
    cpuUtilPct: k8s.st === 'Running' ? 20 + ((idx * 8) % 70) : 0,
    ramUtilPct: k8s.st === 'Running' ? 30 + ((idx * 11) % 60) : 0,
    diskIoIops: k8s.st === 'Running' ? 400 + ((idx * 120) % 3500) : 0,
    details: {
      uuid: `k8s-${(2000 + idx).toString(16)}-${dcId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
      vdisksCount: 1,
      vnicsCount: 1,
      macAddress: `02:42:ac:${(11 + (idx % 80)).toString(16)}:${(10 + ((idx * 4) % 80)).toString(16)}:${(15 + ((idx * 6) % 80)).toString(16)}`,
      powerState: k8s.st === 'Running' ? 'Powered On' : 'Powered Off',
      tags: ['Kubernetes', 'OpenShift', dcId, k8s.env, isGpu ? 'GPU-Accelerated' : 'Microservice']
    }
  });
});

// 3. Process 20 Datastores
storageDefs.forEach((stg, idx) => {
  const dcId = dcIds[(idx + 7) % dcIds.length];
  const info = dcDeviceCache[dcId];
  const stgDevice = info.storage[idx % info.storage.length] || { id: `${dcId}-STG-001`, model: 'Ceres 1×1 (D-box)' };
  const hostNum = 120 + (idx * 5) % 130;
  const ip = `${info.subnetBase}.${hostNum}`;
  const zone = getZone(info.dc.state, idx + 2);
  const clusterName = `${dcId}-SAN-Storage-Fabric`;

  allItems.push({
    id: `ds-${stg.name.replace(/^us-/, '')}`,
    name: stg.name,
    type: 'Datastore',
    typeCode: 'Datastore',
    status: stg.st,
    statusLabel: stg.stLbl,
    siteId: dcId,
    siteName: info.siteName,
    zone,
    cluster: clusterName,
    host: stgDevice.id,
    specs: {
      storageTb: stg.tb,
      display: `${stg.tb} TB Usable · ${stg.vdisks} vDisks`
    },
    ip,
    vlanOrNetwork: stg.vlan,
    platform: stg.plat,
    env: stg.env,
    uptime: stg.st === 'Running' ? `${100 + (idx * 12) % 400} days` : '0h (Maintenance)',
    provisionedDate: `2025-${String((idx % 12) + 1).padStart(2, '0')}-${String(((idx * 3) % 26) + 1).padStart(2, '0')}`,
    cpuUtilPct: stg.st === 'Running' ? 15 + ((idx * 6) % 40) : 0,
    ramUtilPct: stg.st === 'Running' ? 40 + ((idx * 7) % 50) : 0,
    diskIoIops: stg.st === 'Running' ? 12000 + ((idx * 1400) % 65000) : 0,
    details: {
      uuid: `ds-${(3000 + idx).toString(16)}-${dcId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
      vdisksCount: stg.vdisks,
      vnicsCount: 4,
      storagePool: stg.pool,
      backupPolicy: 'SnapMirror 15m RPO',
      tags: ['Storage', stg.plat.split(' ')[0], dcId, stgDevice.model.split(' ')[0]]
    }
  });
});

// 4. Process 18 Virtual Networks
netDefs.forEach((net, idx) => {
  const dcId = dcIds[(idx + 11) % dcIds.length];
  const info = dcDeviceCache[dcId];
  const switchDevice = info.switches[idx % info.switches.length] || { id: `${dcId}-IB-SPINE-01`, model: 'Quantum-2 QM9700' };
  const hostNum = 1 + (idx * 2) % 30;
  const ip = `${info.subnetBase}.${hostNum}`;
  const zone = getZone(info.dc.state, idx + 3);
  const clusterName = `${dcId}-SDN-Network-Core`;

  allItems.push({
    id: `net-${net.name.replace(/^us-/, '')}`,
    name: net.name,
    type: 'Virtual Network',
    typeCode: 'vSwitch',
    status: net.st,
    statusLabel: net.stLbl,
    siteId: dcId,
    siteName: info.siteName,
    zone,
    cluster: clusterName,
    host: switchDevice.id,
    specs: {
      bandwidth: net.bw,
      display: `${net.bw} · ${net.pgs} Port Groups`
    },
    ip,
    vlanOrNetwork: net.vlan,
    platform: net.plat,
    env: net.env,
    uptime: `${120 + (idx * 15) % 500} days`,
    provisionedDate: `2025-${String((idx % 12) + 1).padStart(2, '0')}-${String(((idx * 4) % 26) + 1).padStart(2, '0')}`,
    cpuUtilPct: 18 + ((idx * 5) % 55),
    ramUtilPct: 32 + ((idx * 6) % 45),
    details: {
      uuid: `net-${(4000 + idx).toString(16)}-${dcId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
      vnicsCount: net.vnics,
      tags: ['SDN', 'Overlay', dcId, switchDevice.model.split(' ')[0]]
    }
  });
});

console.log('Successfully created items count:', allItems.length);
const countsByType = {};
allItems.forEach(i => countsByType[i.type] = (countsByType[i.type] || 0) + 1);
console.log('Counts by type:', countsByType);

const dcsRepresented = new Set(allItems.map(i => i.siteId));
console.log('Distinct US DCs represented:', dcsRepresented.size);
console.log('Sample item:', JSON.stringify(allItems[0], null, 2));

// Write to scratch/generated_128_us_resources.json
fs.writeFileSync(path.join(projectRoot, 'scratch/generated_128_us_resources.json'), JSON.stringify(allItems, null, 2));
console.log('Saved to scratch/generated_128_us_resources.json');
