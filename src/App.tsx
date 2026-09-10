import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import RouteTitle from './shell/RouteTitle';
import Topbar from './shell/Topbar';
import LegacyView from './legacy/LegacyView';
import { SCREENS } from './routes';

/* The screens are embedded in the host application as iframes, one route per
   menu item; the host owns the header and the left navigation, so this shell
   draws neither — only the document title names the screen.
   The single-file preview build has no server to rewrite deep links, so it
   routes by hash. */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <div className="app is-embedded">
        <main className="grow">
          <RouteTitle />
          <Topbar />
          <Routes>
            <Route path="/" element={<Navigate to="/discovery/insights" replace />} />
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
