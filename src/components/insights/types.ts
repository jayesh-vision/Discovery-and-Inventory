import type { MouseEvent } from 'react';

/* The chart tooltip the Inventory Insights screen owns. Cards that sit inside
   that screen receive these three callbacks instead of owning tooltip state. */
export interface TipPayload {
  title: string;
  badge?: string | number;
  badgeColor?: string;
  dotColor?: string;
  rows?: Array<{ label: string; value: string }>;
  note?: string;
}

export interface TipHandlers {
  showTip: (payload: TipPayload, e: MouseEvent) => void;
  moveTip: (e: MouseEvent) => void;
  hideTip: () => void;
}
