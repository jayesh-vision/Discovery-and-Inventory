import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RouteTitle from './shell/RouteTitle';
import Topbar from './shell/Topbar';
import LegacyView from './legacy/LegacyView';
import { SCREENS } from './routes';
import { bootSolution, isInventoryPath, solution, syncSolution, withSolution, withoutSolution } from './solution';
import NodePage from '../node-view-source/src/pages/NodePage.jsx';
import { NodeViewProvider } from '../node-view-source/src/nodeView.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* ?solution=Datacenter on an Inventory URL: remember it and keep it on every Inventory URL the
   reader moves through (links, redirects and back/forward drop the query string), so the whole
   module stays in that solution until ?solution=all. See src/solution.ts. */
function SolutionScope() {
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    syncSolution(loc.pathname, loc.search);
    const url = loc.pathname + loc.search + loc.hash;
    /* ?solution=all was the way out: it has done its job, so take it off the URL */
    const left = new URLSearchParams(loc.search).get('solution') === 'all' && isInventoryPath(loc.pathname);
    const want = left ? withoutSolution(url) : withSolution(url);
    /* the legacy bundle and other once-built data follow the mode the page started in, so a
       change of mode in place is a clean reload on the corrected URL */
    if (solution() !== bootSolution) { window.location.replace(want); return; }
    if (want !== url) nav(want, { replace: true, state: loc.state });
  }, [loc.pathname, loc.search, loc.hash, loc.state, nav]);
  return null;
}

/* The screens are embedded in the host application as iframes, one route per
   menu item; the host owns the header and the left navigation, so this shell
   draws neither — only the document title names the screen.
   The single-file preview build has no server to rewrite deep links, so it
   routes by hash. */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

/* a redirect that keeps ?solution= (Navigate drops the query string) */
function SolutionRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  syncSolution('/inventory', search);
  return <Navigate to={withSolution(to)} replace />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <SolutionScope />
      <div className="app is-embedded">
        <main className="grow">
          <RouteTitle />
          <Topbar />
          <Routes>
            <Route path="/" element={<Navigate to="/discovery/insights" replace />} />
            <Route
              path="/node/:ref"
              element={
                <NodeViewProvider>
                  <NodePage />
                </NodeViewProvider>
              }
            />
            <Route path="/inventory" element={<SolutionRedirect to="/inventory/insights" />} />
            {SCREENS.map(s => (
              <Route key={s.key} path={s.path}
                element={s.component ? <s.component /> : <LegacyView legacyKey={s.key} />} />
            ))}
            <Route path="*" element={<Navigate to="/discovery/insights" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
