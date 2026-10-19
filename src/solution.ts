/* ── Solution scope: /inventory/...?solution=Datacenter ───────────────────────
   Two modes, both always available:
     • /inventory/...                        → the default Inventory (previous data)
     • /inventory/...?solution=Datacenter    → only the data center solution's data

   The URL you OPEN decides the mode, every time: a typed URL, a bookmark, a reload or the host
   (re)opening the iframe starts in whatever that URL says. Once a page is open, moving around
   Inventory by clicks (links, tabs, redirects, Back) keeps the mode, so the parameter stays on
   those URLs and you never fall back to default by accident.

   • Held in memory for the life of the page only. Nothing is stored, so a plain URL opened later
     is the default Inventory, never the data center solution.
   • `?solution=all` leaves the data center solution in place and removes the parameter.
   • Only Inventory (/inventory…) uses it. Discovery URLs never get it and never clear it.
   • The value is not case-sensitive (`Datacenter`, `datacenter`); URLs the app writes use `Datacenter`.
   • Any other value is ignored. */
export const SOLUTIONS = ['datacenter'] as const;
export type Solution = (typeof SOLUTIONS)[number];
const KEY = 'solution';
export const LEAVE = 'all';

/** the value as written in a URL */
export const solutionParam = (s: Solution): string => ({ datacenter: 'Datacenter' } as const)[s];
const parse = (v: string | null): Solution | null => { const l = v?.toLowerCase() ?? ''; return (SOLUTIONS as readonly string[]).includes(l) ? (l as Solution) : null; };
/** true when a URL's value is the way out (`all`, any case) */
export const isLeave = (v: string | null): boolean => v?.toLowerCase() === LEAVE;

export type DcGeo = 'in' | 'us';
const GEO_KEY = 'geo';
const COUNTRY_KEY = 'country';
const GEO_STORAGE_KEY = 'dc_active_geo';
const SOLUTION_STORAGE_KEY = 'dc_solution_mode';

export const isInventoryPath = (p: string) => {
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const u = new URL(p);
      return u.pathname === '/inventory' || u.pathname.startsWith('/inventory/');
    }
  } catch {}
  return p === '/inventory' || p.startsWith('/inventory/');
};

export const DEFAULT_GEO: DcGeo = 'us';

const readStorage = (k: string): string | null => {
  try {
    return sessionStorage.getItem(k) || localStorage.getItem(k);
  } catch {
    return null;
  }
};

const writeStorage = (k: string, v: string) => {
  try { sessionStorage.setItem(k, v); } catch {}
  try { localStorage.setItem(k, v); } catch {}
};

const clearStorage = (k: string) => {
  try { sessionStorage.removeItem(k); } catch {}
  try { localStorage.removeItem(k); } catch {}
};

let current: Solution | null = null;
let currentGeoVal: DcGeo = DEFAULT_GEO;

/* the very first render must already know the mode and active geo, so read the URL and storage right now */
if (typeof window !== 'undefined') {
  const sp = new URLSearchParams(window.location.search);
  const v = sp.get(KEY);
  if (isLeave(v)) {
    current = null;
    clearStorage(SOLUTION_STORAGE_KEY);
    clearStorage(GEO_STORAGE_KEY);
  } else if (parse(v)) {
    current = parse(v)!;
    writeStorage(SOLUTION_STORAGE_KEY, current);
  } else {
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter') {
      current = 'datacenter';
    } else {
      current = null;
    }
  }

  if (current === 'datacenter') {
    const g = (sp.get(GEO_KEY) || sp.get(COUNTRY_KEY) || '').toLowerCase();
    if (g === 'us' || g === 'in') {
      currentGeoVal = g as DcGeo;
      writeStorage(GEO_STORAGE_KEY, g);
    } else {
      const saved = readStorage(GEO_STORAGE_KEY);
      if (saved === 'us' || saved === 'in') {
        currentGeoVal = saved as DcGeo;
      } else {
        currentGeoVal = DEFAULT_GEO;
        writeStorage(GEO_STORAGE_KEY, DEFAULT_GEO);
      }
    }
  }
}
/** what this page load started in; data that is built once (the legacy bundle) follows this */
export const bootSolution: Solution | null = current;

export const solution = (): Solution | null => {
  if (current) return current;
  if (typeof window !== 'undefined') {
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter') {
      current = 'datacenter';
      return current;
    }
  }
  return current;
};

/** true when Inventory shows only the data center solution's data */
export const isDatacenter = (): boolean => {
  if (current === 'datacenter') return true;
  if (typeof window !== 'undefined') {
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter') {
      current = 'datacenter';
      return true;
    }
  }
  return false;
};

export const currentGeo = (): DcGeo | null => {
  if (!isDatacenter()) return null;
  if (currentGeoVal === 'in' || currentGeoVal === 'us') return currentGeoVal;
  if (typeof window !== 'undefined') {
    const saved = readStorage(GEO_STORAGE_KEY);
    if (saved === 'in' || saved === 'us') {
      currentGeoVal = saved as DcGeo;
      return currentGeoVal;
    }
  }
  return DEFAULT_GEO;
};

export const setGeo = (g: DcGeo | 'all' | null): void => {
  if (g === 'in') {
    currentGeoVal = 'in';
    writeStorage(GEO_STORAGE_KEY, 'in');
  } else {
    currentGeoVal = 'us';
    writeStorage(GEO_STORAGE_KEY, 'us');
  }
};

/** call on every location change: the parameters set it (`all` clears it); Discovery leaves it alone */
export function syncSolution(pathname: string, search: string): Solution | null {
  if (!isInventoryPath(pathname)) return current;
  const sp = new URLSearchParams(search);
  const v = sp.get(KEY);
  if (isLeave(v)) {
    current = null;
    clearStorage(SOLUTION_STORAGE_KEY);
    clearStorage(GEO_STORAGE_KEY);
  } else if (parse(v)) {
    current = parse(v)!;
    writeStorage(SOLUTION_STORAGE_KEY, current);
  } else {
    // If we are already in datacenter mode or have it saved in storage, KEEP IT!
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (current === 'datacenter' || saved === 'datacenter') {
      current = 'datacenter';
      writeStorage(SOLUTION_STORAGE_KEY, 'datacenter');
    } else {
      current = null;
    }
  }

  if (current === 'datacenter') {
    const g = (sp.get(GEO_KEY) || sp.get(COUNTRY_KEY) || '').toLowerCase();
    if (g === 'us' || g === 'in') {
      currentGeoVal = g as DcGeo;
      writeStorage(GEO_STORAGE_KEY, g);
    } else {
      const saved = readStorage(GEO_STORAGE_KEY);
      if (saved === 'us' || saved === 'in') {
        currentGeoVal = saved as DcGeo;
      } else {
        currentGeoVal = DEFAULT_GEO;
        writeStorage(GEO_STORAGE_KEY, DEFAULT_GEO);
      }
    }
  }
  return current;
}

/** the URL with the active solution and active geo on it (Inventory URLs only; an existing value is kept) */
export function withSolution(url: string): string {
  const sol = solution();
  if (!sol) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      if (!isInventoryPath(u.pathname)) return url;
      if (!u.searchParams.has(KEY)) {
        u.searchParams.set(KEY, solutionParam(sol));
      }
      const geoToUse = currentGeo();
      if (geoToUse && !u.searchParams.has(GEO_KEY) && !u.searchParams.has(COUNTRY_KEY)) {
        u.searchParams.set(GEO_KEY, geoToUse);
      }
      return u.toString();
    } catch {
      return url;
    }
  }
  const [pathAndQuery, hash = ''] = url.split('#');
  const [path, q = ''] = pathAndQuery.split('?');
  if (!isInventoryPath(path)) return url;
  const sp = new URLSearchParams(q);
  if (!sp.has(KEY)) {
    sp.set(KEY, solutionParam(sol));
  }
  const geoToUse = currentGeo();
  if (geoToUse && !sp.has(GEO_KEY) && !sp.has(COUNTRY_KEY)) {
    sp.set(GEO_KEY, geoToUse);
  }
  const qs = sp.toString();
  return `${path}${qs ? '?' + qs : ''}${hash ? '#' + hash : ''}`;
}

/** the URL without the solution/geo parameters, to compare a link with the page's own path */
export function withoutSolution(url: string): string {
  const [pathAndQuery, hash = ''] = url.split('#');
  const [path, q = ''] = pathAndQuery.split('?');
  const sp = new URLSearchParams(q);
  sp.delete(KEY);
  sp.delete(GEO_KEY);
  sp.delete(COUNTRY_KEY);
  const rest = sp.toString();
  return `${path}${rest ? '?' + rest : ''}${hash ? '#' + hash : ''}`;
}
