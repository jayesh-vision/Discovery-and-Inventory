import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/ds-bundle.css';
import './styles/shell.css';
import './styles/grid.css';   /* every list, both renderers — see the contract at its top */
import './styles/insights.css';   /* the Insights dashboard's own layer, scoped under .ix */
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
