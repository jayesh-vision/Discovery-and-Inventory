/* ── Solution scope: /inventory/...?solution=datacenter ───────────────────────
   Two modes, both always available:
     • /inventory/...                        → the default Inventory (previous data)
     • /inventory/...?solution=datacenter    → only the data center solution's data

   The URL you OPEN decides the mode, every time: a typed URL, a bookmark, a reload or the host
   (re)opening the iframe starts in whatever that URL says. Once a page is open, moving around
   Inventory by clicks (links, tabs, redirects, Back) keeps the mode, so the parameter stays on
   those URLs and you never fall back to default by accident.

   • Held in memory for the life of the page only. Nothing is stored, so a plain URL opened later
     is the default Inventory, never the data center solution.
   • `?solution=all` leaves the data center solution in place and removes the parameter.
   • Only Inventory (/inventory…) uses it. Discovery URLs never get it and never clear it.
   • Any other value is ignored. */
export const SOLUTIONS = ['datacenter'] as const;
export type Solution = (typeof SOLUTIONS)[number];
const KEY = 'solution';
export const LEAVE = 'all';

const isSolution = (v: string | null): v is Solution => !!v && (SOLUTIONS as readonly string[]).includes(v);
export const isInventoryPath = (p: string) => p === '/inventory' || p.startsWith('/inventory/');

let current: Solution | null = null;

/* the very first render must already know the mode, so read the URL we were opened on right now,
   not in an effect that runs after it */
if (typeof window !== 'undefined' && isInventoryPath(window.location.pathname)) {
  const v = new URLSearchParams(window.location.search).get(KEY);
  if (isSolution(v)) current = v;
}
/** what this page load started in; data that is built once (the legacy bundle) follows this */
export const bootSolution: Solution | null = current;

export const solution = (): Solution | null => current;
/** true when Inventory shows only the data center solution's data */
export const isDatacenter = (): boolean => current === 'datacenter';

/** call on every location change: the parameter sets it (`all` clears it); Discovery leaves it alone */
export function syncSolution(pathname: string, search: string): Solution | null {
  if (!isInventoryPath(pathname)) return current;
  const v = new URLSearchParams(search).get(KEY);
  if (isSolution(v)) current = v;
  else if (v === LEAVE) current = null;
  return current;
}

/** the URL with the active solution on it (Inventory URLs only; an existing value is kept) */
export function withSolution(url: string): string {
  if (!current) return url;
  const [pathAndQuery, hash = ''] = url.split('#');
  const [path, q = ''] = pathAndQuery.split('?');
  if (!isInventoryPath(path)) return url;
  const sp = new URLSearchParams(q);
  if (sp.has(KEY)) return url;   // an explicit value (including `all`) is never overwritten
  sp.set(KEY, current);
  return `${path}?${sp.toString()}${hash ? '#' + hash : ''}`;
}

/** the URL without the solution parameter, to compare a link with the page's own path */
export function withoutSolution(url: string): string {
  const [path, q = ''] = url.split('?');
  const sp = new URLSearchParams(q); sp.delete(KEY);
  const rest = sp.toString();
  return rest ? `${path}?${rest}` : path;
}
