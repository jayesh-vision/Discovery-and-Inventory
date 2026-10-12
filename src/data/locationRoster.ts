/* The location roster every location screen reads: the estate's 12,475 locations by default, the
   24 data centers (from src/data/dc) in the data center solution. Same record shape either way. */
import allLocations from './allLocations.json';
import { DC_SUM, SCOPED } from './dc/scope';

export type Loc = (typeof allLocations)[number];
export const ROSTER: Loc[] = SCOPED ? (DC_SUM.map(d => d.location) as unknown as Loc[]) : allLocations;
