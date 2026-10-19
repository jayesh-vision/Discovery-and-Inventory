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

/**
 * Detect the current active / logged-in user from all possible sources:
 * URL parameters, parent iframe URL, localStorage, sessionStorage, JWT tokens, cookies, globals, DOM.
 */
export function getActiveUser(): string {
  if (typeof window === 'undefined') return '';

  // 1. Direct URL search parameters (?user=..., ?username=..., ?email=..., ?login=..., ?u=...)
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const k of ['user', 'username', 'email', 'login', 'u']) {
      const v = sp.get(k);
      if (v) return v.trim().toLowerCase();
    }

    // Check ?data= base64 payload (used by NetSingularity/VisionWaves router)
    const dataParam = sp.get('data');
    if (dataParam) {
      try {
        const b64 = dataParam.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
        const decoded = atob(padded);
        if (decoded.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
        const parsed = JSON.parse(decoded);
        const u = parsed.user || parsed.username || parsed.email || parsed.login || parsed.sub || parsed.name || parsed.account;
        if (u && typeof u === 'string') return u.trim().toLowerCase();
      } catch {}
    }
  } catch {}

  // 2. Parent window (if embedded in an iframe inside VisionWaves / NetSingularity portal)
  try {
    if (window.parent && window.parent !== window) {
      const pSp = new URLSearchParams(window.parent.location.search);
      for (const k of ['user', 'username', 'email', 'login', 'u']) {
        const v = pSp.get(k);
        if (v) return v.trim().toLowerCase();
      }
      const pData = pSp.get('data');
      if (pData) {
        try {
          const b64 = pData.replace(/-/g, '+').replace(/_/g, '/');
          const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
          const decoded = atob(padded);
          if (decoded.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
          const parsed = JSON.parse(decoded);
          const u = parsed.user || parsed.username || parsed.email || parsed.login || parsed.sub || parsed.name || parsed.account;
          if (u && typeof u === 'string') return u.trim().toLowerCase();
        } catch {}
      }
    }
  } catch {}

  // 3. Storage (sessionStorage and localStorage)
  const userKeys = [
    'user', 'username', 'email', 'login', 'currentUser', 'current_user',
    'authUser', 'auth_user', 'auth', 'profile', 'session', 'account',
    'userInfo', 'user_info', 'vw_user', 'vw_auth', 'vw_username', 'active_user'
  ];

  for (const store of [sessionStorage, localStorage]) {
    try {
      for (const k of userKeys) {
        const val = store.getItem(k);
        if (!val) continue;
        if (typeof val === 'string') {
          if (val.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
          if (val.startsWith('{') && val.endsWith('}')) {
            try {
              const obj = JSON.parse(val);
              const u = obj.username || obj.user || obj.email || obj.login || obj.name || obj.sub || obj.id || obj.preferred_username;
              if (u && typeof u === 'string') return u.trim().toLowerCase();
            } catch {}
          } else if (val.length < 100 && !val.includes(';')) {
            return val.trim().toLowerCase();
          }
        }
      }

      // Check JWT tokens in storage (Keycloak / OAuth / custom JWTs)
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;
        const val = store.getItem(k);
        if (val && typeof val === 'string') {
          if (val.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
          if (val.split('.').length === 3) {
            try {
              const payload = val.split('.')[1];
              const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
              const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
              const decoded = atob(padded);
              if (decoded.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
              const parsed = JSON.parse(decoded);
              const u = parsed.preferred_username || parsed.username || parsed.user || parsed.email || parsed.sub || parsed.name;
              if (u && typeof u === 'string') return u.trim().toLowerCase();
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 4. Cookies
  try {
    if (document.cookie) {
      if (document.cookie.toLowerCase().includes('datacenter.user')) return 'datacenter.user';
      const match = document.cookie.match(/(?:user|username|email|login|currentUser)=([^;]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toLowerCase();
      }
    }
  } catch {}

  // 5. Global window objects
  try {
    const win = window as any;
    const globalUser = win.currentUser || win.user || win.__USER__ || win.sessionUser;
    if (globalUser) {
      if (typeof globalUser === 'string') return globalUser.trim().toLowerCase();
      if (typeof globalUser === 'object') {
        const gu = globalUser.username || globalUser.user || globalUser.email || globalUser.name || globalUser.preferred_username;
        if (gu && typeof gu === 'string') return gu.trim().toLowerCase();
      }
    }
    if (window.parent && window.parent !== window) {
      const pWin = window.parent as any;
      const pGlobalUser = pWin.currentUser || pWin.user || pWin.__USER__ || pWin.sessionUser;
      if (pGlobalUser) {
        if (typeof pGlobalUser === 'string') return pGlobalUser.trim().toLowerCase();
        if (typeof pGlobalUser === 'object') {
          const gu = pGlobalUser.username || pGlobalUser.user || pGlobalUser.email || pGlobalUser.name;
          if (gu && typeof gu === 'string') return gu.trim().toLowerCase();
        }
      }
    }
  } catch {}

  // 6. DOM inspection for avatar initials or user labels (e.g. "DU" for Datacenter User, "VK" for another user)
  try {
    const docs = [document];
    if (window.parent && window.parent !== window) {
      try { docs.push(window.parent.document); } catch {}
    }
    for (const doc of docs) {
      const elements = doc.querySelectorAll('*');
      for (const el of Array.from(elements)) {
        if (el.children.length === 0) {
          const text = el.textContent?.trim() || '';
          if (text.toLowerCase() === 'datacenter.user') return 'datacenter.user';
          if (text === 'DU' && (el.className?.toLowerCase().includes('avatar') || el.parentElement?.className?.toLowerCase().includes('avatar') || (el.tagName === 'SPAN' && el.parentElement?.tagName === 'DIV'))) {
            return 'datacenter.user';
          }
        }
      }
    }
  } catch {}

  return '';
}

/**
 * Check if the current user is datacenter.user.
 * Rule: if user = datacenter.user -> true
 * If any other user -> false
 */
export function isDatacenterUser(): boolean {
  const u = getActiveUser();
  if (u) {
    return u === 'datacenter.user' || u.includes('datacenter.user') || u.startsWith('datacenter');
  }
  // Check direct URL param ?user=datacenter.user or ?username=datacenter.user
  if (typeof window !== 'undefined') {
    try {
      const sp = new URLSearchParams(window.location.search);
      const userParam = (sp.get('user') || sp.get('username') || '').toLowerCase();
      if (userParam === 'datacenter.user' || userParam.includes('datacenter')) return true;
      if (userParam && userParam !== 'datacenter.user') return false;
    } catch {}
  }
  return false;
}

export const defaultGeo = (): DcGeo => (isDatacenterUser() ? 'us' : 'in');

let current: Solution | null = null;
let currentGeoVal: DcGeo = 'in';

/* the very first render must already know the mode and active geo, so read the URL and storage right now */
if (typeof window !== 'undefined') {
  const sp = new URLSearchParams(window.location.search);
  const u = getActiveUser();
  const isDcUser = isDatacenterUser();

  // Detect user switch: if user changed from datacenter.user to another user, clear stale storage
  const lastUser = readStorage('vw_last_logged_user');
  if (u && lastUser && u !== lastUser) {
    clearStorage(GEO_STORAGE_KEY);
    if (!isDcUser) {
      clearStorage(SOLUTION_STORAGE_KEY);
    }
  }
  if (u) {
    writeStorage('vw_last_logged_user', u);
  }

  const v = sp.get(KEY);
  if (isLeave(v)) {
    current = null;
    clearStorage(SOLUTION_STORAGE_KEY);
    clearStorage(GEO_STORAGE_KEY);
  } else if (parse(v)) {
    current = parse(v)!;
    writeStorage(SOLUTION_STORAGE_KEY, current);
  } else if (isDcUser) {
    // datacenter.user is automatically in datacenter solution
    current = 'datacenter';
    writeStorage(SOLUTION_STORAGE_KEY, 'datacenter');
  } else {
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter' && sp.has(KEY)) {
      current = 'datacenter';
    } else {
      current = null;
    }
  }

  // Geo resolution:
  // "make a check that if the user = datacenter.user then make everything us based and if any other user it will point to the india always"
  if (!isDcUser) {
    // ANY OTHER USER: ALWAYS POINT TO INDIA!
    currentGeoVal = 'in';
    writeStorage(GEO_STORAGE_KEY, 'in');
  } else {
    // datacenter.user: DEFAULT TO US!
    const g = (sp.get(GEO_KEY) || sp.get(COUNTRY_KEY) || '').toLowerCase();
    if (g === 'us' || g === 'in') {
      currentGeoVal = g as DcGeo;
      writeStorage(GEO_STORAGE_KEY, g);
    } else {
      const saved = readStorage(GEO_STORAGE_KEY);
      if (saved === 'us' || saved === 'in') {
        currentGeoVal = saved as DcGeo;
      } else {
        currentGeoVal = 'us';
        writeStorage(GEO_STORAGE_KEY, 'us');
      }
    }
  }
}
/** what this page load started in; data that is built once (the legacy bundle) follows this */
export const bootSolution: Solution | null = current;

export const solution = (): Solution | null => {
  if (current) return current;
  if (isDatacenterUser()) {
    current = 'datacenter';
    return current;
  }
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
  if (isDatacenterUser()) {
    current = 'datacenter';
    return true;
  }
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
  const isDcUser = isDatacenterUser();
  if (!isDcUser) {
    // Any other user ALWAYS points to India!
    return 'in';
  }
  // datacenter.user defaults to US:
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const g = (sp.get(GEO_KEY) || sp.get(COUNTRY_KEY) || '').toLowerCase();
    if (g === 'in' || g === 'us') return g as DcGeo;
    const saved = readStorage(GEO_STORAGE_KEY);
    if (saved === 'in' || saved === 'us') {
      currentGeoVal = saved as DcGeo;
      return currentGeoVal;
    }
  }
  if (currentGeoVal === 'in' || currentGeoVal === 'us') return currentGeoVal;
  return 'us';
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
  const isDcUser = isDatacenterUser();
  const v = sp.get(KEY);

  if (isLeave(v)) {
    current = null;
    clearStorage(SOLUTION_STORAGE_KEY);
    clearStorage(GEO_STORAGE_KEY);
  } else if (parse(v)) {
    current = parse(v)!;
    writeStorage(SOLUTION_STORAGE_KEY, current);
  } else if (isDcUser) {
    current = 'datacenter';
    writeStorage(SOLUTION_STORAGE_KEY, 'datacenter');
  } else {
    const saved = readStorage(SOLUTION_STORAGE_KEY);
    if (saved === 'datacenter' && sp.has(KEY)) {
      current = 'datacenter';
      writeStorage(SOLUTION_STORAGE_KEY, 'datacenter');
    } else {
      current = null;
    }
  }

  if (!isDcUser) {
    // ANY OTHER USER: ALWAYS POINT TO INDIA!
    currentGeoVal = 'in';
    writeStorage(GEO_STORAGE_KEY, 'in');
  } else {
    // datacenter.user:
    const g = (sp.get(GEO_KEY) || sp.get(COUNTRY_KEY) || '').toLowerCase();
    if (g === 'us' || g === 'in') {
      currentGeoVal = g as DcGeo;
      writeStorage(GEO_STORAGE_KEY, g);
    } else {
      const saved = readStorage(GEO_STORAGE_KEY);
      if (saved === 'us' || saved === 'in') {
        currentGeoVal = saved as DcGeo;
      } else {
        currentGeoVal = 'us';
        writeStorage(GEO_STORAGE_KEY, 'us');
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
