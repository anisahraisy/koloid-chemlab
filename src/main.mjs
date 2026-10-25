/**
 * @file main.mjs
 * Application bootstrap, Router configuration, and Service Worker registration.
 */

import { Router } from './core/router.mjs';
import { store } from './core/store.mjs';
import { createMatrixExplorerView } from './views/matrix-explorer.mjs';
import { createBrownianTyndallView } from './views/brownian-tyndall-lab.mjs';
import { createDLVOCoagulationView } from './views/dlvo-coagulation-lab.mjs';
import { createSurfaceAdsorptionView } from './views/surface-adsorption-lab.mjs';
import { createNanocarriersView } from './views/nanocarriers-lab.mjs';
import { createCaseDiagnosticsView } from './views/case-diagnostics.mjs';

// Route Definitions
const routes = {
  '#/matrix': createMatrixExplorerView,
  '#/optics-brownian': createBrownianTyndallView,
  '#/dlvo': createDLVOCoagulationView,
  '#/surface': createSurfaceAdsorptionView,
  '#/nanocarriers': createNanocarriersView,
  '#/cases': createCaseDiagnosticsView
};

function updateScoreHeader() {
  const el = document.getElementById('masthead-score-value');
  if (el) {
    const total = store.get('totalScore') || 0;
    el.textContent = `${total} / 600 Poin`;
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Setup Router
  const router = new Router(routes, 'main-content');
  router.init();

  // Listen to Score Updates
  updateScoreHeader();
  store.on('cases_updated', () => updateScoreHeader());

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration skipped or failed:', err);
        });
    });
  }
});
