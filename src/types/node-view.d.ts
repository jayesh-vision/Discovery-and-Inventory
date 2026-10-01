declare module '*/nodeView.jsx' {
  import type { ReactNode } from 'react';
  export function NodeViewProvider(props: { children: ReactNode }): ReactNode;
  export function useNodeView(): (node: string) => void;
  export function NodeLink(props: { name: string; className?: string; children?: ReactNode; style?: any }): ReactNode;
}

declare module '*/NocDashboard.jsx' {
  import type { ComponentType } from 'react';
  const NocDashboard: ComponentType<{ currentNode?: string }>;
  export default NocDashboard;
}

declare module '*/NodeDetails.jsx' {
  import type { ComponentType } from 'react';
  const NodeDetails: ComponentType<{ node: string; external?: any; onClose?: () => void; isDirectPage?: boolean; isEmbedded?: boolean; activeTab?: string }>;
  export default NodeDetails;
}

declare module '*/pages/NodePage.jsx' {
  import type { ComponentType } from 'react';
  const NodePage: ComponentType<{}>;
  export default NodePage;
}

declare module '*/data.js' {
  export const NOW: number;
  export function nodeDetailFor(name: string, external?: any): any;
  export function elementTopology(name: string): any;
  export function externalElement(ref: string, info?: any): any;
  export function resolveElement(ref: string): string | null;
}

declare module '*/twin.js' {
  export function twinFor(d: any): any;
  export function flavourOf(kind: string): string;
}

declare module '*/components/NodeTwin.jsx' {
  import type { ComponentType } from 'react';
  const NodeTwin: ComponentType<{ t: any; pick?: string | null; onPick?: (id: string) => void }>;
  export default NodeTwin;
}

declare module '*/components/IncidentMap.jsx' {
  import type { ComponentType } from 'react';
  const IncidentMap: ComponentType<{ id: string; topo: any; summary: string }>;
  export default IncidentMap;
}

declare module '*/components/NodeCharts.jsx' {
  import type { ComponentType } from 'react';
  export const Inspector: ComponentType<{ item: any; note?: string | null }>;
  export const TrafficChart: ComponentType<{ series: any }>;
  export const KpiWheel: ComponentType<{ kpis: any }>;
  export const Heatmap: ComponentType<{ series: any }>;
}

declare module '*/components/Icons.jsx' {
  import type { ComponentType } from 'react';
  export const IcRack: ComponentType<{ size?: number }>;
  export const IcConn: ComponentType<{ size?: number }>;
  export const IcPulse: ComponentType<{ size?: number }>;
  export const IcDevice: ComponentType<{ size?: number }>;
  export const IcMap: ComponentType<{ size?: number }>;
}
