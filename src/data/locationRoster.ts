/* The location roster every location screen reads: the estate's 12,475 locations by default, the
   24 data centers (from src/data/dc) in the data center solution. Same record shape either way. */
import allLocations from './allLocations.json';
import { dcSumList, SCOPED } from './dc/scope';
import { isDatacenter } from '../solution';

export type Loc = (typeof allLocations)[number];

export const getRoster = (): Loc[] =>
  (isDatacenter() || SCOPED) ? (dcSumList().map(d => d.location) as unknown as Loc[]) : (allLocations as unknown as Loc[]);

/**
 * Dynamic ROSTER proxy that always delegates to getRoster() so callers accessing ROSTER
 * get the correct scoped data center locations when solution=datacenter without requiring manual cache invalidation.
 */
export const ROSTER: Loc[] = new Proxy([] as Loc[], {
  get(_target, prop) {
    const list = getRoster();
    const val = (list as any)[prop];
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  }
});
