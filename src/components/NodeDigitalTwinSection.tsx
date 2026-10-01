import { useMemo } from 'react';
import NodeDetails from '../../node-view-source/src/components/NodeDetails.jsx';
import { externalElement } from '../../node-view-source/src/data.js';
import '../../node-view-source/src/index.css';
import '../../node-view-source/src/dashboard.css';
import './NodeDigitalTwinSection.css';

interface NodeDigitalTwinSectionProps {
  currentNode?: string;
  nodeClass?: string;
  vendor?: string;
  model?: string;
  ip?: string;
  city?: string;
  activeTab?: string;
}

export default function NodeDigitalTwinSection({
  currentNode = 'DEL-DWM-010',
  nodeClass = 'dwdm',
  vendor,
  model,
  ip,
  city,
  activeTab = 'overview'
}: NodeDigitalTwinSectionProps) {
  const nodeName = currentNode || 'DEL-DWM-010';
  const normCls = (nodeClass || '').toLowerCase().trim();

  const external = useMemo(() => {
    let kind = 'Core router';
    let equipment = 'Core router';
    let domain = 'Transport';
    let tech = 'IP/MPLS';
    let defaultVendor = 'Juniper';
    let defaultModel = 'MX960';
    let defaultIp = '172.31.42.100';

    if (normCls === 'dwdm') {
      kind = 'DWDM node';
      equipment = 'DWDM node';
      domain = 'Fiber';
      tech = 'DWDM';
      defaultVendor = 'Ciena';
      defaultModel = '6500-T12';
      defaultIp = '172.31.193.12';
    } else if (normCls === 'switch') {
      kind = 'Aggregation SW';
      equipment = 'Aggregation SW';
      domain = 'Transport';
      tech = 'Ethernet';
      defaultVendor = 'Ciena';
      defaultModel = 'L3-CORE-48P';
      defaultIp = '172.31.31.201';
    } else if (normCls === 'enodeb') {
      kind = 'eNodeB';
      equipment = 'eNodeB';
      domain = 'RAN';
      tech = 'LTE';
      defaultVendor = 'Ericsson';
      defaultModel = 'Baseband 6630';
      defaultIp = '10.44.22.31';
    } else if (normCls === 'gnodeb') {
      kind = 'gNodeB';
      equipment = 'gNodeB';
      domain = 'RAN';
      tech = '5G';
      defaultVendor = 'Nokia';
      defaultModel = 'AirScale 5G';
      defaultIp = '10.51.22.21';
    } else if (normCls === 'olt' || normCls === 'pon') {
      kind = 'OLT';
      equipment = 'OLT';
      domain = 'Fiber';
      tech = 'GPON';
      defaultVendor = 'Nokia';
      defaultModel = '7360 ISAM';
      defaultIp = '10.20.10.15';
    }

    return externalElement(nodeName, {
      kind,
      equipment,
      domain,
      tech,
      vendor: vendor || defaultVendor,
      model: model || defaultModel,
      ip: ip || defaultIp,
      city: city || 'Delhi'
    });
  }, [nodeName, normCls, vendor, model, ip, city]);

  return (
    <div
      className="node-details-overview-embed"
      onClick={e => e.stopPropagation()}
      style={{ width: '100%', marginBottom: 24 }}
    >
      <NodeDetails
        node={nodeName}
        external={external}
        isEmbedded={true}
        activeTab={activeTab}
        onClose={() => {}}
      />
    </div>
  );
}
