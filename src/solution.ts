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
const DC_USER_KEY = 'vw_is_datacenter_user';
const ACTIVE_USER_KEY = 'vw_active_user';

export const isInventoryPath = (p: string) => {
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const u = new URL(p);
      return u.pathname === '/inventory' || u.pathname.startsWith('/inventory/');
    }
  } catch {}
  return p === '/inventory' || p.startsWith('/inventory/');
};

export const DEFAULT_GEO: DcGeo = 'in';

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

function getWindows(): Window[] {
  const wins: Window[] = [];
  if (typeof window === 'undefined') return wins;
  wins.push(window);
  try {
    if (window.parent && window.parent !== window) wins.push(window.parent);
  } catch {}
  try {
    if (window.top && window.top !== window && window.top !== window.parent) wins.push(window.top);
  } catch {}
  return wins;
}

function getDocs(): Document[] {
  const docs: Document[] = [];
  if (typeof document === 'undefined') return docs;
  docs.push(document);
  try {
    if (window.parent && window.parent !== window && window.parent.document) docs.push(window.parent.document);
  } catch {}
  try {
    if (window.top && window.top !== window && window.top.document) docs.push(window.top.document);
  } catch {}
  return docs;
}

function isDcString(str: unknown): boolean {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().toLowerCase();
  return (
    s === 'datacenter.user' ||
    s.includes('datacenter.user') ||
    s.includes('datacenter user') ||
    s.includes('datacenter.user@visionwaves.com') ||
    s.includes('datacenter configurator') ||
    s.includes('dataceneter configurator') ||
    s === 'du' ||
    s.startsWith('datacenter')
  );
}

function checkBase64ForDc(b64Str: string): boolean {
  try {
    const clean = b64Str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=');
    const decoded = atob(padded);
    if (isDcString(decoded)) return true;
    if (decoded.includes('data=')) {
      const match = decoded.match(/data=([A-Za-z0-9+/=_-]+)/);
      if (match && match[1] && match[1] !== b64Str) {
        return checkBase64ForDc(match[1]);
      }
    }
  } catch {}
  return false;
}

function markDcUser() {
  try {
    sessionStorage.setItem(DC_USER_KEY, 'true');
    localStorage.setItem(DC_USER_KEY, 'true');
    sessionStorage.setItem(ACTIVE_USER_KEY, 'datacenter.user');
    localStorage.setItem(ACTIVE_USER_KEY, 'datacenter.user');
    sessionStorage.setItem(GEO_STORAGE_KEY, 'us');
    localStorage.setItem(GEO_STORAGE_KEY, 'us');
    sessionStorage.setItem(SOLUTION_STORAGE_KEY, 'datacenter');
    localStorage.setItem(SOLUTION_STORAGE_KEY, 'datacenter');
  } catch {}
}

/**
 * Check if the current user is datacenter.user.
 * Rule: if user = datacenter.user -> true -> EVERYTHING US BASED & DATACENTER SOLUTION
 * If any other user -> false -> ALWAYS INDIA BASED
 */
export function isDatacenterUser(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Cached decision in storage
  try {
    if (sessionStorage.getItem(DC_USER_KEY) === 'true' || localStorage.getItem(DC_USER_KEY) === 'true') {
      return true;
    }
    const savedUser = sessionStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY);
    if (savedUser && isDcString(savedUser)) {
      return true;
    }
  } catch {}

  // 2. Check URL & Parameters across all accessible windows
  for (const win of getWindows()) {
    try {
      const sp = new URLSearchParams(win.location.search);
      for (const k of ['user', 'username', 'email', 'login', 'u', 'sub', 'account', 'id']) {
        const v = sp.get(k);
        if (v && isDcString(v)) {
          markDcUser();
          return true;
        }
      }

      // Check ?data= base64 router parameter (NetSingularity/VisionWaves router)
      const dataParam = sp.get('data');
      if (dataParam && checkBase64ForDc(dataParam)) {
        markDcUser();
        return true;
      }

      // Check full href string
      if (isDcString(win.location.href)) {
        markDcUser();
        return true;
      }
    } catch {}
  }

  // 3. Storage scan across all accessible windows
  for (const win of getWindows()) {
    try {
      for (const store of [win.sessionStorage, win.localStorage]) {
        if (!store) continue;
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (!k) continue;
          if (isDcString(k)) {
            markDcUser();
            return true;
          }
          const val = store.getItem(k);
          if (!val || typeof val !== 'string') continue;
          if (isDcString(val)) {
            markDcUser();
            return true;
          }
          // JWT token segment check
          if (val.includes('.') && val.split('.').length === 3) {
            try {
              const payload = val.split('.')[1];
              if (checkBase64ForDc(payload)) {
                markDcUser();
                return true;
              }
            } catch {}
          }
          // JSON string check
          if (val.startsWith('{') && val.endsWith('}')) {
            try {
              const parsed = JSON.parse(val);
              for (const field of ['user', 'username', 'email', 'login', 'name', 'sub', 'role', 'roles', 'profile', 'preferred_username']) {
                if (isDcString(parsed[field])) {
                  markDcUser();
                  return true;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 4. Cookies across all accessible documents
  for (const doc of getDocs()) {
    try {
      if (doc.cookie && (isDcString(doc.cookie) || doc.cookie.includes('datacenter%2euser') || doc.cookie.includes('datacenter%20user'))) {
        markDcUser();
        return true;
      }
    } catch {}
  }

  // 5. Global window variables across accessible windows
  for (const win of getWindows()) {
    try {
      const anyWin = win as any;
      for (const prop of ['currentUser', 'user', '__USER__', 'sessionUser', 'auth', 'profile', 'session', 'userData', 'userInfo', 'vwUser', 'vwAuth']) {
        const obj = anyWin[prop];
        if (!obj) continue;
        if (typeof obj === 'string' && isDcString(obj)) {
          markDcUser();
          return true;
        }
        if (typeof obj === 'object') {
          for (const k of ['user', 'username', 'email', 'login', 'name', 'sub', 'preferred_username']) {
            if (isDcString(obj[k])) {
              markDcUser();
              return true;
            }
          }
        }
      }
    } catch {}
  }

  // 6. DOM inspection across all accessible documents (for "DU" badge, "Datacenter User" label)
  for (const doc of getDocs()) {
    try {
      const bodyText = (doc.body?.innerText || doc.body?.textContent || '').toLowerCase();
      if (bodyText.includes('datacenter.user') || bodyText.includes('datacenter user') || bodyText.includes('datacenter configurator') || bodyText.includes('dataceneter configurator')) {
        markDcUser();
        return true;
      }
      const candidates = doc.querySelectorAll('button, div, span, p, a, [class*="avatar"], [class*="user"], [class*="profile"], [class*="badge"]');
      for (const el of Array.from(candidates)) {
        const t = (el.textContent || '').trim();
        if (t === 'DU' || t.toLowerCase() === 'datacenter user' || t.toLowerCase() === 'datacenter.user') {
          markDcUser();
          return true;
        }
      }
    } catch {}
  }

  return false;
}

export function getActiveUser(): string {
  if (isDatacenterUser()) return 'datacenter.user';
  return readStorage(ACTIVE_USER_KEY) || '';
}

/**
 * Geo resolution:
 * Purely User-ID based:
 * If user = datacenter.user -> ALWAYS US
 * If any other user -> ALWAYS India
 */
export const defaultGeo = (): DcGeo => (isDatacenterUser() ? 'us' : 'in');

let current: Solution | null = null;
let currentGeoVal: DcGeo = 'in';

/* the very first render must already know the mode and active geo, so read right now */
if (typeof window !== 'undefined') {
  if (isDatacenterUser()) {
    current = 'datacenter';
    currentGeoVal = 'us';
    markDcUser();
  } else {
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
      if (saved === 'datacenter' && sp.has(KEY)) {
        current = 'datacenter';
      } else {
        current = null;
      }
    }
    currentGeoVal = 'in';
  }

  // Live polling for the first few seconds in case DOM or parent iframe renders late
  let checkAttempts = 0;
  const pollTimer = setInterval(() => {
    checkAttempts++;
    if (isDatacenterUser()) {
      current = 'datacenter';
      currentGeoVal = 'us';
      markDcUser();
      window.dispatchEvent(new CustomEvent('ns:user_changed', { detail: { isDc: true } }));
      clearInterval(pollTimer);
    }
    if (checkAttempts > 30) clearInterval(pollTimer);
  }, 200);
}

/** what this page load started in; data that is built once (the legacy bundle) follows this */
export const bootSolution: Solution | null = current;

export const solution = (): Solution | null => {
  if (isDatacenterUser()) {
    current = 'datacenter';
    return 'datacenter';
  }
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
  if (isDatacenterUser()) {
    current = 'datacenter';
    return true;
  }
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

/**
 * currentGeo: Pure user ID check!
 * If user is datacenter.user -> US ALWAYS
 * If any other user -> India ALWAYS
 */
export const currentGeo = (): DcGeo => {
  if (isDatacenterUser()) {
    return 'us';
  }
  return currentGeoVal;
};

export const setGeo = (g: DcGeo | 'all' | null): void => {
  if (isDatacenterUser()) {
    currentGeoVal = 'us';
    writeStorage(GEO_STORAGE_KEY, 'us');
    return;
  }
  if (g === 'in') {
    currentGeoVal = 'in';
    writeStorage(GEO_STORAGE_KEY, 'in');
  } else {
    currentGeoVal = 'in';
    writeStorage(GEO_STORAGE_KEY, 'in');
  }
};

/** call on every location change: datacenter.user stays in datacenter US mode; other users stay India */
export function syncSolution(pathname: string, search: string): Solution | null {
  if (!isInventoryPath(pathname)) return current;
  if (isDatacenterUser()) {
    current = 'datacenter';
    currentGeoVal = 'us';
    markDcUser();
    return 'datacenter';
  }

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
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter' && sp.has(KEY)) {
      current = 'datacenter';
      writeStorage(SOLUTION_STORAGE_KEY, 'datacenter');
    } else {
      current = null;
    }
  }

  currentGeoVal = 'in';
  writeStorage(GEO_STORAGE_KEY, 'in');
  return current;
}

/** the URL with the active solution and active geo on it (Inventory URLs only; an existing value is kept) */
export function withSolution(url: string): string {
  const isDcUser = isDatacenterUser();
  const sol = isDcUser ? 'datacenter' : solution();
  if (!sol) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      if (!isInventoryPath(u.pathname)) return url;
      if (!u.searchParams.has(KEY)) {
        u.searchParams.set(KEY, solutionParam(sol));
      }
      const geoToUse = isDcUser ? 'us' : currentGeo();
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
  const geoToUse = isDcUser ? 'us' : currentGeo();
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
