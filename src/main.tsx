import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/ds-bundle.css';
import './styles/shell.css';
import './styles/grid.css';   /* every list, both renderers — see the contract at its top */
import './styles/insights.css';   /* the Insights dashboard's own layer, scoped under .ix */
import { preloadScope } from './data/dc/scope';

/* In the data center solution the full records load first, and only then is the app's code evaluated,
   so any data module can build its data center version synchronously at import time
   (src/data/dc/scope.ts). The default Inventory has nothing to wait for. */
void preloadScope().then(() => import('./App')).then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
