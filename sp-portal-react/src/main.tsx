import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './data/dhlMockData';

// Design tokens and global styles (NEW)
import './design/globals.css';

// Paper & ink finish. Only declares --pi-* variables and three utilities, so
// it can load first and affects nothing until a screen opts in by mapping its
// own tokens onto it.
import './styles/paper-ink.css';

// Same cascade order as sp-portal/profile/index.html's <head>. When more
// pages are migrated, per-route CSS ordering will need its own solution —
// a single global order can't stay correct for every page at once.
import './styles/legacy/vendor-admin-view.css';
import './styles/legacy/sidebar-beam.css';
import './styles/legacy/profile.css';
import './styles/legacy/sp-portal.css';
import './styles/legacy/liquid-glass.css';
import './styles/legacy/modern-ui.css';
import './styles/legacy/refinements-v2.css';
import './styles/legacy/refinements-v3-motion.css';
import './styles/legacy/admin-header-standard.css';

import './styles/modal-behavior.css';

// Camada de acabamento: carrega depois de todo o legacy, por isso vence por
// ordem de cascata sem precisar de subir especificidade.
import './design/refinements.css';

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
