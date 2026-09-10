import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { isReactOwned, legacyPath } from '../routes';

/* ── the prototype renderer, loaded once ────────────────── */
declare global {
  interface Window {
    __nsLegacy?: {
      go: (k: string) => void;
      applyDrillQuery: (view: string, q: string) => void;
      setDrill: (d: unknown) => void;
      setParams: (k: string, p: Record<string, string>) => void;
      setCollapsed: (on: boolean) => void;
      current: () => string;
      /* site-header data + one-shot section override for the React site tabs */
      siteHead?: (id: string) => unknown;
      setSection?: (s: string) => void;
      /* maps any location tag (sample city codes included) to the roster row */
      resolveSite?: (ref: string) => { id: string; name: string } | null;
    };
    __nsBridge?: {
      owns: (k: string) => boolean;
      navigate: (k: string, drill: { label?: string; q?: string } | null, params?: Record<string, string>) => void;
      sync: (k: string, params: Record<string, string>, drill?: { label?: string; q?: string; from?: string } | null) => void;
    };
  }
}

let loading: Promise<void> | null = null;
export function loadLegacy(): Promise<void> {
  if (window.__nsLegacy) return Promise.resolve();
  if (!loading) loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = '/legacy.js';
    s.onload = () => res();
    s.onerror = () => rej(new Error('legacy.js failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}

/* Renders one prototype screen inside the React shell. The prototype writes
   into #view and reads its drill/filter state from the query string, the same
   names the React screens use, so links work in both directions. */
export default function LegacyView({ legacyKey }: { legacyKey: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const params = useParams();
  const [ready, setReady] = useState(!!window.__nsLegacy);
  const host = useRef<HTMLDivElement>(null);
  /* set when the prototype itself moved the URL; the screen is already drawn */
  const fromLegacy = useRef(false);

  /* legacy → React: the prototype's go() hands React-owned screens to us */
  useEffect(() => {
    window.__nsBridge = {
      owns: isReactOwned,
      navigate: (k, drill, params) => {
        const target = legacyPath(k, drill, params ?? {});
        /* once the reader is already on this React screen, a bare re-hand-off
           (no new drill) carries no new information — skip it rather than
           push/replace the URL down to its plain path, which would blow away
           whatever tab/filter query the React screen has since set on its own */
        if (!drill && target === window.location.pathname) return;
        /* a drill tagged from=Virtual returns via Physical Resources' own
           explicit back-link (not history back), so this hop can replace
           instead of push — otherwise a stray back gesture right after
           arriving lands one hop further than the click that got you here,
           which reads as "clicking a tab went back to Virtual" */
        nav(target, { replace: !!drill?.q?.toLowerCase().includes('from=virtual') });
      },
      /* the prototype re-rendered itself (a tab, a drill, a row action): follow
         it — carrying its active drill into the URL so the breadcrumb (the
         only navigation) always names where the reader actually is */
      sync: (k, params, drill) => {
        const target = legacyPath(k, drill ?? null, params);
        if (target !== window.location.pathname + window.location.search) { fromLegacy.current = true; nav(target); }
      }
    };
  }, [nav]);

  useEffect(() => { loadLegacy().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !window.__nsLegacy) return;
    if (fromLegacy.current) { fromLegacy.current = false; return; }
    const L = window.__nsLegacy;
    const sp = new URLSearchParams(loc.search);
    const label = sp.get('drill');
    const from = sp.get('from') ?? 'Inventory';
    const back = sp.get('back') ?? 'physical';
    sp.delete('drill'); sp.delete('from'); sp.delete('back');
    const q = sp.toString();
    L.setParams(legacyKey, params as Record<string, string>);
    /* always applied, empty query included — a plain URL means the screen's
       clean default state, which is what a breadcrumb click navigates to */
    L.applyDrillQuery(legacyKey, q);
    L.setDrill(label ? { view: legacyKey, label, q, from, back } : null);
    L.go(legacyKey);
  }, [ready, legacyKey, loc.search, params]);

  return (
    <>
      <div id="view" ref={host}>{!ready && <div className="vw-card-description" style={{ padding: "var(--vw-space-2xl)" }}>Loading…</div>}</div>
      {/* the prototype writes the breadcrumb here; the React topbar owns the visible one */}
      <span id="module" hidden /><span id="crumb" hidden />
    </>
  );
}
