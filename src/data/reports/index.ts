import type { ReportContent, ReportDef } from './model';
import { DISCOVERY_BUILDERS } from './discovery';
import { INVENTORY_BUILDERS } from './inventory';

export * from './model';
export { REPORT_DEFS, reportsFor, reportDefById } from './catalog';

const BUILDERS = { ...DISCOVERY_BUILDERS, ...INVENTORY_BUILDERS };
const cache = new Map<string, ReportContent>();

/* the source data is static in this build, so one computation per report
   serves the landing card, the report page and every export */
export function buildReport(def: ReportDef): ReportContent {
  const hit = cache.get(def.id);
  if (hit) return hit;
  const builder = BUILDERS[def.id];
  if (!builder) throw new Error(`reports: no builder registered for ${def.id}`);
  const content = builder();
  cache.set(def.id, content);
  return content;
}
