import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './shell/Sidebar';
import Topbar from './shell/Topbar';
import LegacyView from './legacy/LegacyView';
import { SCREENS } from './routes';

function useCollapsed() {
  const [collapsed, set] = useState(() => { try { return localStorage.getItem('nst-side') === '1'; } catch { return false; } });
  useEffect(() => {
    try { localStorage.setItem('nst-side', collapsed ? '1' : '0'); } catch { /* private mode */ }
    window.__nsLegacy?.setCollapsed(collapsed);
  }, [collapsed]);
  return [collapsed, () => set(v => !v)] as const;
}

export default function App() {
  const [collapsed, toggle] = useCollapsed();
  return (
    <BrowserRouter>
      <div className={`app${collapsed ? ' is-collapsed' : ''}`}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main className="grow">
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
    </BrowserRouter>
  );
}
